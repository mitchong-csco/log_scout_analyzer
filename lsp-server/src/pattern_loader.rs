use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

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
}
