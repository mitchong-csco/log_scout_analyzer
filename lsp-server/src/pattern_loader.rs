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

    // Pattern Marking Fields (Phase 1.6)
    #[serde(rename = "markingStatus")]
    pub marking_status: Option<String>, // "draft" | "pending-review" | "approved" | "applied"
    #[serde(rename = "markedBy")]
    pub marked_by: Option<String>, // Username or email
    #[serde(rename = "markedAt")]
    pub marked_at: Option<String>, // ISO 8601 timestamp
    #[serde(rename = "reviewedBy")]
    pub reviewed_by: Option<Vec<ReviewComment>>,
    #[serde(rename = "priority")]
    pub priority: Option<String>, // "low" | "medium" | "high" | "critical"
    #[serde(rename = "category")]
    pub category: Option<String>, // "regex" | "extractor" | "severity" | "missing-pattern"
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

/// Review comment on a pattern override (Phase 1.6)
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ReviewComment {
    pub author: String,
    pub timestamp: String, // ISO 8601
    pub comment: String,
    pub status: String, // "approved" | "changes-requested" | "questioned"
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

// ===== Pattern Marking Support (Phase 1.6) =====

/// Marking status for patterns under review
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarkingStatus {
    Draft,         // Created but not yet marked for review
    PendingReview, // Waiting for team review
    Approved,      // Approved by reviewer
    Applied,       // Override is in use and working
}

impl MarkingStatus {
    /// Parse a string into MarkingStatus
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(Self::Draft),
            "pending-review" => Ok(Self::PendingReview),
            "approved" => Ok(Self::Approved),
            "applied" => Ok(Self::Applied),
            _ => Err(format!("Invalid marking status: {}", s)),
        }
    }

    /// Get string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::PendingReview => "pending-review",
            Self::Approved => "approved",
            Self::Applied => "applied",
        }
    }
}

/// Priority level for pattern overrides
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

impl Priority {
    /// Parse a string into Priority
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "low" => Ok(Self::Low),
            "medium" => Ok(Self::Medium),
            "high" => Ok(Self::High),
            "critical" => Ok(Self::Critical),
            _ => Err(format!("Invalid priority: {}", s)),
        }
    }

    /// Get string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

/// Category of pattern issue
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IssueCategory {
    Regex,
    Extractor,
    Severity,
    MissingPattern,
}

impl IssueCategory {
    /// Parse a string into IssueCategory
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "regex" => Ok(Self::Regex),
            "extractor" => Ok(Self::Extractor),
            "severity" => Ok(Self::Severity),
            "missing-pattern" => Ok(Self::MissingPattern),
            _ => Err(format!("Invalid category: {}", s)),
        }
    }

    /// Get string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Regex => "regex",
            Self::Extractor => "extractor",
            Self::Severity => "severity",
            Self::MissingPattern => "missing-pattern",
        }
    }
}

/// Validate marking fields in a PatternOverride
pub fn validate_marking(override_data: &PatternOverride) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();

    // Validate marking_status if present
    if let Some(status) = &override_data.marking_status {
        if MarkingStatus::from_str(status).is_err() {
            errors.push(format!("Invalid marking status: {}", status));
        }
    }

    // Validate priority if present
    if let Some(priority) = &override_data.priority {
        if Priority::from_str(priority).is_err() {
            errors.push(format!("Invalid priority: {}", priority));
        }
    }

    // Validate category if present
    if let Some(category) = &override_data.category {
        if IssueCategory::from_str(category).is_err() {
            errors.push(format!("Invalid category: {}", category));
        }
    }

    // Validate marked_at timestamp if present
    if let Some(marked_at) = &override_data.marked_at {
        if chrono::DateTime::parse_from_rfc3339(marked_at).is_err() {
            errors.push(format!(
                "Invalid ISO 8601 timestamp in marked_at: {}",
                marked_at
            ));
        }
    }

    // Validate review timestamps if present
    if let Some(comments) = &override_data.reviewed_by {
        for (idx, comment) in comments.iter().enumerate() {
            if chrono::DateTime::parse_from_rfc3339(&comment.timestamp).is_err() {
                errors.push(format!(
                    "Invalid ISO 8601 timestamp in reviewed_by[{}]: {}",
                    idx, comment.timestamp
                ));
            }
            if !["approved", "changes-requested", "questioned"]
                .contains(&comment.status.to_lowercase().as_str())
            {
                errors.push(format!(
                    "Invalid review status in reviewed_by[{}]: {}",
                    idx, comment.status
                ));
            }
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}

// Helper methods for PatternOverride marking
impl PatternOverride {
    /// Get the marking status
    pub fn marking_status(&self) -> MarkingStatus {
        self.marking_status
            .as_ref()
            .and_then(|s| MarkingStatus::from_str(s).ok())
            .unwrap_or(MarkingStatus::Draft)
    }

    /// Check if override is approved or applied
    pub fn is_approved(&self) -> bool {
        matches!(
            self.marking_status(),
            MarkingStatus::Approved | MarkingStatus::Applied
        )
    }

    /// Check if override is pending review
    pub fn is_pending_review(&self) -> bool {
        self.marking_status() == MarkingStatus::PendingReview
    }

    /// Get the priority level
    pub fn get_priority(&self) -> Option<Priority> {
        self.priority
            .as_ref()
            .and_then(|p| Priority::from_str(p).ok())
    }

    /// Get the issue category
    pub fn get_category(&self) -> Option<IssueCategory> {
        self.category
            .as_ref()
            .and_then(|c| IssueCategory::from_str(c).ok())
    }

    /// Mark the override with a new status
    pub fn mark_as(&mut self, status: MarkingStatus, marked_by: &str) {
        self.marking_status = Some(status.as_str().to_string());
        self.marked_by = Some(marked_by.to_string());
        self.marked_at = Some(chrono::Utc::now().to_rfc3339());
    }

    /// Add a review comment
    pub fn add_review_comment(
        &mut self,
        author: &str,
        comment: &str,
        status: &str,
    ) -> Result<(), String> {
        // Validate status
        if !["approved", "changes-requested", "questioned"].contains(&status) {
            return Err(format!("Invalid review status: {}", status));
        }

        if self.reviewed_by.is_none() {
            self.reviewed_by = Some(Vec::new());
        }

        if let Some(ref mut comments) = self.reviewed_by {
            comments.push(ReviewComment {
                author: author.to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                comment: comment.to_string(),
                status: status.to_string(),
            });
            tracing::debug!(
                "Added review comment to override '{}' by {}",
                self.id,
                author
            );
            Ok(())
        } else {
            Err("Could not add review comment".to_string())
        }
    }

    /// Get count of approved review comments
    pub fn approved_count(&self) -> usize {
        self.reviewed_by
            .as_ref()
            .map(|comments| {
                comments
                    .iter()
                    .filter(|c| c.status.to_lowercase() == "approved")
                    .count()
            })
            .unwrap_or(0)
    }

    /// Check if all reviewers approved
    pub fn all_approved(&self) -> bool {
        if let Some(comments) = &self.reviewed_by {
            if comments.is_empty() {
                return false;
            }
            comments
                .iter()
                .all(|c| c.status.to_lowercase() == "approved")
        } else {
            false
        }
    }
}

/// Query helpers for finding patterns by marking status
pub struct MarkingQueries;

impl MarkingQueries {
    /// Get all patterns pending review
    pub fn get_pending_review(
        overrides: &HashMap<String, PatternOverride>,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| o.is_pending_review())
            .collect()
    }

    /// Get all approved patterns
    pub fn get_approved(overrides: &HashMap<String, PatternOverride>) -> Vec<&PatternOverride> {
        overrides.values().filter(|o| o.is_approved()).collect()
    }

    /// Get patterns by priority
    pub fn get_by_priority(
        overrides: &HashMap<String, PatternOverride>,
        priority: Priority,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| o.get_priority() == Some(priority))
            .collect()
    }

    /// Get patterns by category
    pub fn get_by_category(
        overrides: &HashMap<String, PatternOverride>,
        category: IssueCategory,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| o.get_category() == Some(category))
            .collect()
    }

    /// Get patterns by status
    pub fn get_by_status(
        overrides: &HashMap<String, PatternOverride>,
        status: MarkingStatus,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| o.marking_status() == status)
            .collect()
    }
}

/// Apply pattern overrides to a list of canonical patterns
/// Returns a new list of patterns with overrides applied
pub fn apply_overrides(
    canonical_patterns: Vec<Pattern>,
    workspace_path: Option<&str>,
) -> Result<Vec<Pattern>, Box<dyn std::error::Error>> {
    // Load override file
    let override_file = load_overrides(workspace_path)?;

    // If no overrides exist, return canonical patterns as-is
    if override_file.overrides.is_empty() && override_file.custom.is_empty() {
        tracing::info!("No pattern overrides found, using canonical patterns");
        return Ok(canonical_patterns);
    }

    tracing::info!(
        "Applying {} overrides and {} custom patterns",
        override_file.overrides.len(),
        override_file.custom.len()
    );

    let mut result_patterns = Vec::new();

    // Process canonical patterns with overrides
    for canonical in canonical_patterns {
        // Check if there's an override for this pattern
        // Try matching by source_id first, then by pattern id
        let override_opt = override_file.overrides.values().find(|o| {
            o.source_id.as_ref() == Some(&canonical.id)
                || o.id == format!("override-{}", canonical.id)
        });

        if let Some(override_data) = override_opt {
            // Check if override should be applied based on marking status
            // Only apply overrides that are approved or applied
            if !override_data.is_approved() {
                tracing::debug!(
                    "Skipping override for pattern '{}': marking status is {:?}",
                    canonical.id,
                    override_data.marking_status()
                );
                result_patterns.push(canonical);
                continue;
            }

            // Validate marking fields
            if let Err(errors) = validate_marking(override_data) {
                tracing::warn!(
                    "Pattern override '{}' has validation errors: {:?}",
                    override_data.id,
                    errors
                );
                // Still apply the override, just log the warnings
            }

            // Apply override
            match merge_pattern(&canonical, override_data) {
                Ok(merged) => {
                    tracing::info!(
                        "Applied override to pattern '{}' (status: {}): {}",
                        canonical.id,
                        override_data.marking_status().as_str(),
                        override_data
                            .reason
                            .as_deref()
                            .unwrap_or("no reason provided")
                    );
                    result_patterns.push(merged);
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to apply override to pattern '{}': {}",
                        canonical.id,
                        e
                    );
                    // Use canonical pattern as fallback
                    result_patterns.push(canonical);
                }
            }
        } else {
            // No override, use canonical pattern
            result_patterns.push(canonical);
        }
    }

    // TODO: Add custom patterns from override_file.custom
    // This requires converting PatternOverride to Pattern, which will be
    // implemented in a future task when we support creating patterns from scratch

    tracing::info!(
        "Pattern override application complete: {} patterns after overrides",
        result_patterns.len()
    );

    Ok(result_patterns)
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

    #[test]
    fn test_apply_overrides_no_overrides() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};

        let canonical = vec![Pattern {
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
        }];

        // No override file exists, should return canonical patterns
        let result = apply_overrides(canonical.clone(), Some("/nonexistent/path")).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "test-pattern");
        assert_eq!(result[0].pattern, "test.*pattern");
    }

    #[test]
    fn test_apply_overrides_with_matching_override() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};
        use std::fs;
        use std::path::PathBuf;
        use tempfile::TempDir;

        // Create a temporary directory for test
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Create .log-scout directory
        let mut log_scout_dir = PathBuf::from(workspace_path);
        log_scout_dir.push(".log-scout");
        fs::create_dir_all(&log_scout_dir).unwrap();

        // Create override file
        let mut override_file_path = log_scout_dir.clone();
        override_file_path.push("pattern-overrides.json");

        let override_json = r#"{
            "version": "1.0",
            "overrides": {
                "override-test-pattern": {
                    "id": "override-test-pattern",
                    "sourceType": "mongodb",
                    "sourceId": "test-pattern",
                    "reason": "Increase severity for testing",
                    "enabled": true,
                    "overrides": {
                        "severity": "error"
                    }
                }
            },
            "custom": {}
        }"#;

        fs::write(&override_file_path, override_json).unwrap();

        let canonical = vec![Pattern {
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
        }];

        let result = apply_overrides(canonical, Some(workspace_path)).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].id, "test-pattern");
        assert_eq!(result[0].severity, Severity::Error); // Overridden
        assert_eq!(result[0].pattern, "test.*pattern"); // Unchanged
    }

    #[test]
    fn test_apply_overrides_multiple_patterns() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};
        use std::fs;
        use std::path::PathBuf;
        use tempfile::TempDir;

        // Create a temporary directory for test
        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        // Create .log-scout directory
        let mut log_scout_dir = PathBuf::from(workspace_path);
        log_scout_dir.push(".log-scout");
        fs::create_dir_all(&log_scout_dir).unwrap();

        // Create override file with multiple overrides
        let mut override_file_path = log_scout_dir.clone();
        override_file_path.push("pattern-overrides.json");

        let override_json = r#"{
            "version": "1.0",
            "overrides": {
                "override-pattern1": {
                    "id": "override-pattern1",
                    "sourceType": "mongodb",
                    "sourceId": "pattern1",
                    "reason": "Disable pattern1",
                    "enabled": false,
                    "overrides": {}
                },
                "override-pattern2": {
                    "id": "override-pattern2",
                    "sourceType": "mongodb",
                    "sourceId": "pattern2",
                    "reason": "Change regex",
                    "enabled": true,
                    "overrides": {
                        "regex": "new.*regex"
                    }
                }
            },
            "custom": {}
        }"#;

        fs::write(&override_file_path, override_json).unwrap();

        let canonical = vec![
            Pattern {
                id: "pattern1".to_string(),
                name: "Pattern 1".to_string(),
                annotation: "Annotation 1".to_string(),
                pattern: "old.*pattern1".to_string(),
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
            },
            Pattern {
                id: "pattern2".to_string(),
                name: "Pattern 2".to_string(),
                annotation: "Annotation 2".to_string(),
                pattern: "old.*pattern2".to_string(),
                mode: PatternMode::SingleLine,
                severity: Severity::Info,
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
            },
            Pattern {
                id: "pattern3".to_string(),
                name: "Pattern 3".to_string(),
                annotation: "Annotation 3".to_string(),
                pattern: "unchanged.*pattern".to_string(),
                mode: PatternMode::SingleLine,
                severity: Severity::Hint,
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
            },
        ];

        let result = apply_overrides(canonical, Some(workspace_path)).unwrap();
        assert_eq!(result.len(), 3);

        // Pattern 1 should be disabled
        assert_eq!(result[0].id, "pattern1");
        assert_eq!(result[0].enabled, false);

        // Pattern 2 should have new regex
        assert_eq!(result[1].id, "pattern2");
        assert_eq!(result[1].pattern, "new.*regex");
        assert_eq!(result[1].enabled, true);

        // Pattern 3 should be unchanged
        assert_eq!(result[2].id, "pattern3");
        assert_eq!(result[2].pattern, "unchanged.*pattern");
        assert_eq!(result[2].enabled, true);
    }

    // ===== Pattern Marking Tests (Phase 1.6) =====

    #[test]
    fn test_marking_status_parsing() {
        assert_eq!(
            MarkingStatus::from_str("draft").unwrap(),
            MarkingStatus::Draft
        );
        assert_eq!(
            MarkingStatus::from_str("pending-review").unwrap(),
            MarkingStatus::PendingReview
        );
        assert_eq!(
            MarkingStatus::from_str("approved").unwrap(),
            MarkingStatus::Approved
        );
        assert_eq!(
            MarkingStatus::from_str("applied").unwrap(),
            MarkingStatus::Applied
        );
        assert!(MarkingStatus::from_str("invalid").is_err());
    }

    #[test]
    fn test_priority_parsing() {
        assert_eq!(Priority::from_str("low").unwrap(), Priority::Low);
        assert_eq!(Priority::from_str("medium").unwrap(), Priority::Medium);
        assert_eq!(Priority::from_str("high").unwrap(), Priority::High);
        assert_eq!(Priority::from_str("critical").unwrap(), Priority::Critical);
        assert!(Priority::from_str("invalid").is_err());
    }

    #[test]
    fn test_category_parsing() {
        assert_eq!(
            IssueCategory::from_str("regex").unwrap(),
            IssueCategory::Regex
        );
        assert_eq!(
            IssueCategory::from_str("extractor").unwrap(),
            IssueCategory::Extractor
        );
        assert_eq!(
            IssueCategory::from_str("severity").unwrap(),
            IssueCategory::Severity
        );
        assert_eq!(
            IssueCategory::from_str("missing-pattern").unwrap(),
            IssueCategory::MissingPattern
        );
        assert!(IssueCategory::from_str("invalid").is_err());
    }

    #[test]
    fn test_pattern_override_marking_methods() {
        let mut override_data = PatternOverride {
            id: "test-override".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: Some("Test Pattern".to_string()),
            notes: None,
            reason: None,
            enabled: Some(true),
            overrides: OverrideValues {
                regex: None,
                severity: None,
                parameter_extractors: None,
                condition_triggers: None,
            },
            marking_status: None,
            marked_by: None,
            marked_at: None,
            reviewed_by: None,
            priority: None,
            category: None,
        };

        // Default should be Draft
        assert_eq!(override_data.marking_status(), MarkingStatus::Draft);
        assert!(!override_data.is_approved());
        assert!(!override_data.is_pending_review());

        // Mark as pending-review
        override_data.mark_as(MarkingStatus::PendingReview, "john@example.com");
        assert_eq!(override_data.marking_status(), MarkingStatus::PendingReview);
        assert!(override_data.is_pending_review());
        assert!(!override_data.is_approved());
        assert_eq!(
            override_data.marked_by.as_ref().unwrap(),
            "john@example.com"
        );
        assert!(override_data.marked_at.is_some());

        // Mark as approved
        override_data.mark_as(MarkingStatus::Approved, "jane@example.com");
        assert_eq!(override_data.marking_status(), MarkingStatus::Approved);
        assert!(override_data.is_approved());
        assert!(!override_data.is_pending_review());
    }

    #[test]
    fn test_review_comments() {
        let mut override_data = PatternOverride {
            id: "test-override".to_string(),
            source_type: "mongodb".to_string(),
            source_id: Some("test-pattern".to_string()),
            name: Some("Test Pattern".to_string()),
            notes: None,
            reason: None,
            enabled: Some(true),
            overrides: OverrideValues {
                regex: None,
                severity: None,
                parameter_extractors: None,
                condition_triggers: None,
            },
            marking_status: None,
            marked_by: None,
            marked_at: None,
            reviewed_by: None,
            priority: None,
            category: None,
        };

        // Add review comments
        assert!(override_data
            .add_review_comment("john@example.com", "Looks good!", "approved")
            .is_ok());
        assert!(override_data
            .add_review_comment(
                "jane@example.com",
                "Please fix the regex",
                "changes-requested"
            )
            .is_ok());

        assert_eq!(override_data.approved_count(), 1);
        assert!(!override_data.all_approved());

        // Invalid status should error
        assert!(override_data
            .add_review_comment("bob@example.com", "Comment", "invalid-status")
            .is_err());
    }

    #[test]
    fn test_validate_marking() {
        let valid = PatternOverride {
            id: "test".to_string(),
            source_type: "mongodb".to_string(),
            source_id: None,
            name: None,
            notes: None,
            reason: None,
            enabled: None,
            overrides: OverrideValues {
                regex: None,
                severity: None,
                parameter_extractors: None,
                condition_triggers: None,
            },
            marking_status: Some("approved".to_string()),
            marked_by: Some("john@example.com".to_string()),
            marked_at: Some("2026-02-16T10:00:00Z".to_string()),
            reviewed_by: Some(vec![ReviewComment {
                author: "jane@example.com".to_string(),
                timestamp: "2026-02-16T10:30:00Z".to_string(),
                comment: "Approved".to_string(),
                status: "approved".to_string(),
            }]),
            priority: Some("high".to_string()),
            category: Some("extractor".to_string()),
        };

        assert!(validate_marking(&valid).is_ok());

        let invalid_status = PatternOverride {
            marking_status: Some("invalid-status".to_string()),
            ..valid.clone()
        };
        assert!(validate_marking(&invalid_status).is_err());

        let invalid_timestamp = PatternOverride {
            marked_at: Some("not-a-date".to_string()),
            ..valid.clone()
        };
        assert!(validate_marking(&invalid_timestamp).is_err());
    }

    #[test]
    fn test_marking_queries() {
        let mut overrides = HashMap::new();

        // Create test overrides with different statuses
        for i in 0..3 {
            let mut override_data = PatternOverride {
                id: format!("override-{}", i),
                source_type: "mongodb".to_string(),
                source_id: Some(format!("pattern-{}", i)),
                name: Some(format!("Pattern {}", i)),
                notes: None,
                reason: None,
                enabled: Some(true),
                overrides: OverrideValues {
                    regex: None,
                    severity: None,
                    parameter_extractors: None,
                    condition_triggers: None,
                },
                marking_status: None,
                marked_by: None,
                marked_at: None,
                reviewed_by: None,
                priority: None,
                category: None,
            };

            match i {
                0 => override_data.mark_as(MarkingStatus::PendingReview, "user1"),
                1 => override_data.mark_as(MarkingStatus::Approved, "user1"),
                2 => override_data.mark_as(MarkingStatus::Applied, "user1"),
                _ => {}
            }

            overrides.insert(format!("override-{}", i), override_data);
        }

        // Test queries
        let pending = MarkingQueries::get_pending_review(&overrides);
        assert_eq!(pending.len(), 1);

        let approved = MarkingQueries::get_approved(&overrides);
        assert_eq!(approved.len(), 2); // Both Approved and Applied count as approved

        let by_status = MarkingQueries::get_by_status(&overrides, MarkingStatus::Applied);
        assert_eq!(by_status.len(), 1);
    }

    #[test]
    fn test_apply_overrides_respects_marking_status() {
        use crate::pattern_engine::{Pattern, PatternMode, Severity};
        use std::fs;
        use std::path::PathBuf;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let workspace_path = temp_dir.path().to_str().unwrap();

        let mut log_scout_dir = PathBuf::from(workspace_path);
        log_scout_dir.push(".log-scout");
        fs::create_dir_all(&log_scout_dir).unwrap();

        let mut override_file_path = log_scout_dir.clone();
        override_file_path.push("pattern-overrides.json");

        let override_json = r#"{
            "version": "1.0",
            "overrides": {
                "override-pattern-draft": {
                    "id": "override-pattern-draft",
                    "sourceType": "mongodb",
                    "sourceId": "pattern-draft",
                    "reason": "Draft override",
                    "enabled": true,
                    "markingStatus": "draft",
                    "overrides": {
                        "severity": "error"
                    }
                },
                "override-pattern-approved": {
                    "id": "override-pattern-approved",
                    "sourceType": "mongodb",
                    "sourceId": "pattern-approved",
                    "reason": "Approved override",
                    "enabled": true,
                    "markingStatus": "approved",
                    "overrides": {
                        "severity": "error"
                    }
                }
            },
            "custom": {}
        }"#;

        fs::write(&override_file_path, override_json).unwrap();

        let canonical = vec![
            Pattern {
                id: "pattern-draft".to_string(),
                name: "Draft Pattern".to_string(),
                annotation: "Draft".to_string(),
                pattern: "draft.*pattern".to_string(),
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
            },
            Pattern {
                id: "pattern-approved".to_string(),
                name: "Approved Pattern".to_string(),
                annotation: "Approved".to_string(),
                pattern: "approved.*pattern".to_string(),
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
            },
        ];

        let result = apply_overrides(canonical.clone(), Some(workspace_path)).unwrap();
        assert_eq!(result.len(), 2);

        // Draft override should NOT be applied (severity should remain Warning)
        assert_eq!(result[0].id, "pattern-draft");
        assert_eq!(result[0].severity, Severity::Warning);

        // Approved override SHOULD be applied (severity should be changed to Error)
        assert_eq!(result[1].id, "pattern-approved");
        assert_eq!(result[1].severity, Severity::Error);
    }
}
