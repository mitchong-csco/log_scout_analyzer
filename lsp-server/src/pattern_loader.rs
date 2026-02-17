use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::pattern_engine::{
    ConditionOperator, ParameterExtractor, Pattern, Severity, SeverityTrigger,
};

/// Pattern override from JSON file
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PatternOverride {
    pub id: String,
    #[serde(rename = "sourceType")]
    pub source_type: String,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    pub name: Option<String>,
    pub notes: Option<String>,
    pub reason: Option<String>,
    pub enabled: Option<bool>,
    pub overrides: OverrideValues,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OverrideValues {
    pub regex: Option<String>,
    pub severity: Option<String>,
    #[serde(rename = "parameterExtractors")]
    pub parameter_extractors: Option<HashMap<String, ExtractorOverride>>,
    #[serde(rename = "conditionTriggers")]
    pub condition_triggers: Option<Vec<ConditionTrigger>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExtractorOverride {
    pub original: Option<String>,
    #[serde(rename = "override")]
    pub override_value: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConditionTrigger {
    pub field: String,
    pub operator: String,
    pub value: String,
    pub severity: String,
    pub description: Option<String>,
}

/// Override file structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OverrideFile {
    pub version: String,
    #[serde(rename = "lastSync")]
    pub last_sync: Option<String>,
    pub overrides: HashMap<String, PatternOverride>,
    pub custom: HashMap<String, PatternOverride>,
}

/// Get the path to the override file
fn get_override_file_path(
    workspace_path: Option<&str>,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Some(workspace) = workspace_path {
        let mut path = PathBuf::from(workspace);
        path.push(".log-scout");
        path.push("pattern-overrides.json");
        Ok(path)
    } else {
        let home = dirs::home_dir().ok_or("Could not determine home directory")?;
        let mut path = home;
        path.push(".log-scout-analyzer");
        path.push("pattern-overrides.json");
        Ok(path)
    }
}

/// Load pattern overrides from file
pub fn load_overrides(
    workspace_path: Option<&str>,
) -> Result<OverrideFile, Box<dyn std::error::Error>> {
    let override_path = get_override_file_path(workspace_path)?;

    if !override_path.exists() {
        tracing::info!("No pattern override file found at {:?}", override_path);
        return Ok(OverrideFile {
            version: "1.0".to_string(),
            last_sync: None,
            overrides: HashMap::new(),
            custom: HashMap::new(),
        });
    }

    let content = fs::read_to_string(&override_path)?;
    let override_file: OverrideFile = serde_json::from_str(&content)?;

    tracing::info!(
        "Loaded {} pattern overrides and {} custom patterns from {:?}",
        override_file.overrides.len(),
        override_file.custom.len(),
        override_path
    );

    Ok(override_file)
}

/// Merge pattern overrides into a canonical pattern
/// Returns a new Pattern with overrides applied
pub fn merge_pattern(
    canonical_pattern: &Pattern,
    override_data: &PatternOverride,
) -> Result<Pattern, Box<dyn std::error::Error>> {
    // Start with a clone of the canonical pattern
    let mut merged = canonical_pattern.clone();

    // Check if override is disabled - if so, disable the pattern
    if let Some(false) = override_data.enabled {
        merged.enabled = false;
        tracing::debug!("Pattern '{}' disabled by override", canonical_pattern.id);
        return Ok(merged);
    }

    // Apply name override if present
    if let Some(ref name) = override_data.name {
        tracing::debug!(
            "Overriding pattern '{}' name: '{}' -> '{}'",
            canonical_pattern.id,
            merged.name,
            name
        );
        merged.name = name.clone();
    }

    // Apply regex override if present
    if let Some(ref regex) = override_data.overrides.regex {
        tracing::debug!("Overriding pattern '{}' regex", canonical_pattern.id);
        merged.pattern = regex.clone();
    }

    // Apply severity override if present
    if let Some(ref severity_str) = override_data.overrides.severity {
        let severity = parse_severity(severity_str)?;
        tracing::debug!(
            "Overriding pattern '{}' severity: {:?} -> {:?}",
            canonical_pattern.id,
            merged.severity,
            severity
        );
        merged.severity = severity;
    }

    // Apply parameter extractor overrides
    if let Some(ref extractor_overrides) = override_data.overrides.parameter_extractors {
        for (param_name, extractor_override) in extractor_overrides {
            // Find the existing parameter extractor
            if let Some(existing) = merged
                .parameter_extractors
                .iter_mut()
                .find(|e| e.name == *param_name)
            {
                tracing::debug!(
                    "Overriding parameter extractor '{}' in pattern '{}': '{}' -> '{}'",
                    param_name,
                    canonical_pattern.id,
                    existing.regex,
                    extractor_override.override_value
                );
                existing.regex = extractor_override.override_value.clone();
            } else {
                // Add new parameter extractor if it doesn't exist
                tracing::debug!(
                    "Adding new parameter extractor '{}' to pattern '{}': '{}'",
                    param_name,
                    canonical_pattern.id,
                    extractor_override.override_value
                );
                merged.parameter_extractors.push(ParameterExtractor {
                    name: param_name.clone(),
                    regex: extractor_override.override_value.clone(),
                });
            }
        }
    }

    // Apply condition triggers override
    if let Some(ref condition_triggers) = override_data.overrides.condition_triggers {
        // Replace existing condition triggers with override triggers
        merged.condition_triggers.clear();

        for trigger in condition_triggers {
            let severity = parse_severity(&trigger.severity)?;

            tracing::debug!(
                "Adding condition trigger to pattern '{}': {} {} {} -> {:?}",
                canonical_pattern.id,
                trigger.field,
                trigger.operator,
                trigger.value,
                severity
            );

            // Parse operator string to ConditionOperator enum
            let operator = parse_operator(&trigger.operator)?;

            merged.condition_triggers.push(SeverityTrigger {
                field: trigger.field.clone(),
                operator,
                value: trigger.value.clone(),
                severity,
                description: trigger.description.clone(),
            });
        }
    }

    tracing::info!(
        "Successfully merged overrides into pattern '{}' (reason: {})",
        canonical_pattern.id,
        override_data.reason.as_deref().unwrap_or("none provided")
    );

    Ok(merged)
}

/// Parse a severity string into a Severity enum
fn parse_severity(severity_str: &str) -> Result<Severity, Box<dyn std::error::Error>> {
    match severity_str.to_lowercase().as_str() {
        "critical" | "error" => Ok(Severity::Error),
        "warning" | "warn" => Ok(Severity::Warning),
        "info" => Ok(Severity::Info),
        "hint" | "debug" => Ok(Severity::Hint),
        _ => Err(format!("Invalid severity: {}", severity_str).into()),
    }
}

/// Parse an operator string into a ConditionOperator enum
fn parse_operator(operator_str: &str) -> Result<ConditionOperator, Box<dyn std::error::Error>> {
    match operator_str.to_lowercase().as_str() {
        "equals" | "eq" | "==" => Ok(ConditionOperator::Equals),
        "contains" => Ok(ConditionOperator::Contains),
        "regex" | "matches" => Ok(ConditionOperator::Regex),
        "greaterthan" | "gt" | ">" => Ok(ConditionOperator::GreaterThan),
        "lessthan" | "lt" | "<" => Ok(ConditionOperator::LessThan),
        _ => Err(format!("Invalid operator: {}", operator_str).into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_overrides_missing_file() {
        let result = load_overrides(Some("/nonexistent/path"));
        assert!(result.is_ok());
        let file = result.unwrap();
        assert_eq!(file.overrides.len(), 0);
        assert_eq!(file.version, "1.0");
    }

    #[test]
    fn test_parse_override_json() {
        let json = r#"{
            "version": "1.0",
            "overrides": {
                "override-test": {
                    "id": "override-test",
                    "sourceType": "mongodb",
                    "enabled": true,
                    "overrides": {
                        "regex": "test.*pattern"
                    }
                }
            },
            "custom": {}
        }"#;

        let parsed: OverrideFile = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.overrides.len(), 1);
        assert_eq!(parsed.version, "1.0");
        assert!(parsed.overrides.contains_key("override-test"));
    }

    #[test]
    fn test_parse_full_override_json() {
        let json = r#"{
            "version": "1.0",
            "lastSync": "2024-01-15T10:30:00Z",
            "overrides": {
                "override-test-pattern": {
                    "id": "override-test-pattern",
                    "sourceType": "mongodb",
                    "sourceId": "test-pattern",
                    "name": "Test HTTP Pattern",
                    "notes": "Testing override system",
                    "reason": "Fix CODE extractor",
                    "enabled": true,
                    "overrides": {
                        "regex": "HTTP.*error",
                        "severity": "error",
                        "parameterExtractors": {
                            "CODE": {
                                "original": "([45]\\d{2})",
                                "override": "(\\d{3})",
                                "reason": "Match all HTTP codes including 2xx"
                            }
                        }
                    }
                }
            },
            "custom": {}
        }"#;

        let parsed: OverrideFile = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.overrides.len(), 1);
        assert_eq!(parsed.last_sync, Some("2024-01-15T10:30:00Z".to_string()));

        let override_data = parsed.overrides.get("override-test-pattern").unwrap();
        assert_eq!(override_data.name, Some("Test HTTP Pattern".to_string()));
        assert_eq!(override_data.enabled, Some(true));
        assert_eq!(
            override_data.overrides.regex,
            Some("HTTP.*error".to_string())
        );
        assert_eq!(override_data.overrides.severity, Some("error".to_string()));

        let extractors = override_data
            .overrides
            .parameter_extractors
            .as_ref()
            .unwrap();
        assert!(extractors.contains_key("CODE"));
        let code_extractor = extractors.get("CODE").unwrap();
        assert_eq!(code_extractor.override_value, "(\\d{3})");
        assert_eq!(
            code_extractor.reason,
            Some("Match all HTTP codes including 2xx".to_string())
        );
    }

    #[test]
    fn test_merge_pattern_regex_override() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};

        let canonical = Pattern {
            id: "test-pattern".to_string(),
            name: "Test Pattern".to_string(),
            annotation: "Test annotation".to_string(),
            pattern: "original.*regex".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        };

        let override_data = PatternOverride {
            id: "override-test-pattern".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: None,
            notes: None,
            reason: Some("Testing merge".to_string()),
            enabled: Some(true),
            overrides: OverrideValues {
                regex: Some("new.*regex".to_string()),
                severity: None,
                parameter_extractors: None,
                condition_triggers: None,
            },
        };

        let merged = merge_pattern(&canonical, &override_data).unwrap();
        assert_eq!(merged.pattern, "new.*regex");
        assert_eq!(merged.name, "Test Pattern"); // Should remain unchanged
        assert_eq!(merged.severity, Severity::Warning); // Should remain unchanged
    }

    #[test]
    fn test_merge_pattern_severity_override() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};

        let canonical = Pattern {
            id: "test-pattern".to_string(),
            name: "Test Pattern".to_string(),
            annotation: "Test annotation".to_string(),
            pattern: "test.*pattern".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        };

        let override_data = PatternOverride {
            id: "override-test-pattern".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: None,
            notes: None,
            reason: Some("Increase severity".to_string()),
            enabled: Some(true),
            overrides: OverrideValues {
                regex: None,
                severity: Some("critical".to_string()),
                parameter_extractors: None,
                condition_triggers: None,
            },
        };

        let merged = merge_pattern(&canonical, &override_data).unwrap();
        assert_eq!(merged.severity, Severity::Error); // Critical maps to Error
        assert_eq!(merged.pattern, "test.*pattern"); // Should remain unchanged
    }

    #[test]
    fn test_merge_pattern_disable() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};

        let canonical = Pattern {
            id: "test-pattern".to_string(),
            name: "Test Pattern".to_string(),
            annotation: "Test annotation".to_string(),
            pattern: "test.*pattern".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        };

        let override_data = PatternOverride {
            id: "override-test-pattern".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: None,
            notes: None,
            reason: Some("Pattern not needed".to_string()),
            enabled: Some(false),
            overrides: OverrideValues {
                regex: None,
                severity: None,
                parameter_extractors: None,
                condition_triggers: None,
            },
        };

        let merged = merge_pattern(&canonical, &override_data).unwrap();
        assert_eq!(merged.enabled, false);
    }

    #[test]
    fn test_merge_pattern_parameter_extractor_override() {
        use crate::pattern_engine::{ParameterExtractor, Pattern, PatternMode, Severity};

        let canonical = Pattern {
            id: "test-pattern".to_string(),
            name: "Test Pattern".to_string(),
            annotation: "Test annotation".to_string(),
            pattern: "HTTP.*{{ CODE }}".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![ParameterExtractor {
                name: "CODE".to_string(),
                regex: "([45]\\d{2})".to_string(),
            }],
            tagscout_metadata: None,
        };

        let mut extractor_overrides = HashMap::new();
        extractor_overrides.insert(
            "CODE".to_string(),
            ExtractorOverride {
                original: Some("([45]\\d{2})".to_string()),
                override_value: "(\\d{3})".to_string(),
                reason: Some("Match all HTTP codes".to_string()),
            },
        );

        let override_data = PatternOverride {
            id: "override-test-pattern".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: None,
            notes: None,
            reason: Some("Fix CODE extractor".to_string()),
            enabled: Some(true),
            overrides: OverrideValues {
                regex: None,
                severity: None,
                parameter_extractors: Some(extractor_overrides),
                condition_triggers: None,
            },
        };

        let merged = merge_pattern(&canonical, &override_data).unwrap();
        assert_eq!(merged.parameter_extractors.len(), 1);
        assert_eq!(merged.parameter_extractors[0].name, "CODE");
        assert_eq!(merged.parameter_extractors[0].regex, "(\\d{3})");
    }

    #[test]
    fn test_parse_severity() {
        assert!(matches!(
            parse_severity("critical").unwrap(),
            Severity::Error
        ));
        assert!(matches!(parse_severity("error").unwrap(), Severity::Error));
        assert!(matches!(
            parse_severity("warning").unwrap(),
            Severity::Warning
        ));
        assert!(matches!(parse_severity("info").unwrap(), Severity::Info));
        assert!(matches!(parse_severity("debug").unwrap(), Severity::Hint));
        assert!(matches!(parse_severity("hint").unwrap(), Severity::Hint));

        // Test case insensitivity
        assert!(matches!(
            parse_severity("CRITICAL").unwrap(),
            Severity::Error
        ));
        assert!(matches!(
            parse_severity("Warning").unwrap(),
            Severity::Warning
        ));

        // Test invalid severity
        assert!(parse_severity("invalid").is_err());
    }

    #[test]
    fn test_parse_operator() {
        assert!(matches!(
            parse_operator("equals").unwrap(),
            ConditionOperator::Equals
        ));
        assert!(matches!(
            parse_operator("eq").unwrap(),
            ConditionOperator::Equals
        ));
        assert!(matches!(
            parse_operator("contains").unwrap(),
            ConditionOperator::Contains
        ));
        assert!(matches!(
            parse_operator("regex").unwrap(),
            ConditionOperator::Regex
        ));
        assert!(matches!(
            parse_operator("greaterthan").unwrap(),
            ConditionOperator::GreaterThan
        ));
        assert!(matches!(
            parse_operator("gt").unwrap(),
            ConditionOperator::GreaterThan
        ));

        // Test invalid operator
        assert!(parse_operator("invalid").is_err());
    }
}
