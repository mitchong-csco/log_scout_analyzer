/// Pattern Quality Monitor - Runtime Issue Detection
///
/// Monitors patterns during LSP processing and automatically marks them
/// for improvement when quality issues are detected.
use crate::pattern_loader::{
    IssueCategory, MarkingStatus, OverrideFile, PatternOverride, Priority,
};
use chrono::Utc;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Track quality issues found during pattern matching
#[derive(Debug, Clone)]
pub struct PatternQualityIssue {
    pub pattern_id: String,
    pub issue_type: QualityIssueType,
    pub severity: QualitySeverity,
    pub message: String,
    pub timestamp: String,
    pub log_line_sample: Option<String>,
    pub occurrence_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QualityIssueType {
    FailedExtraction,   // Parameter placeholder not substituted
    NoMatch,            // Pattern didn't match when expected
    LowConfidence,      // Multiple possible extractions
    PerformanceSlow,    // Regex took too long
    ConflictingMatches, // Multiple patterns matched same text
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum QualitySeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl QualitySeverity {
    pub fn to_priority(&self) -> Priority {
        match self {
            Self::Low => Priority::Low,
            Self::Medium => Priority::Medium,
            Self::High => Priority::High,
            Self::Critical => Priority::Critical,
        }
    }
}

/// Runtime quality monitor for LSP processing
pub struct RuntimeQualityMonitor {
    issues: Arc<RwLock<HashMap<String, Vec<PatternQualityIssue>>>>,
}

impl RuntimeQualityMonitor {
    pub fn new() -> Self {
        Self {
            issues: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Record a quality issue found during pattern processing
    pub fn record_issue(
        &self,
        pattern_id: String,
        issue_type: QualityIssueType,
        severity: QualitySeverity,
        message: String,
        log_line: Option<String>,
    ) {
        let issue = PatternQualityIssue {
            pattern_id: pattern_id.clone(),
            issue_type,
            severity,
            message,
            timestamp: Utc::now().to_rfc3339(),
            log_line_sample: log_line,
            occurrence_count: 1,
        };

        let mut issues = self.issues.write().unwrap();
        issues
            .entry(pattern_id)
            .or_insert_with(Vec::new)
            .push(issue);

        tracing::debug!("Recorded quality issue: {:?}", issue_type);
    }

    /// Record failed parameter extraction
    pub fn record_extraction_failure(
        &self,
        pattern_id: String,
        param_name: String,
        log_line: String,
    ) {
        self.record_issue(
            pattern_id,
            QualityIssueType::FailedExtraction,
            QualitySeverity::High,
            format!("Failed to extract parameter '{}'", param_name),
            Some(log_line),
        );
    }

    /// Record pattern that didn't match
    pub fn record_no_match(&self, pattern_id: String, log_line: String) {
        self.record_issue(
            pattern_id,
            QualityIssueType::NoMatch,
            QualitySeverity::Medium,
            "Pattern failed to match".to_string(),
            Some(log_line),
        );
    }

    /// Record low confidence extraction (multiple possible values)
    pub fn record_low_confidence(
        &self,
        pattern_id: String,
        param_name: String,
        candidates: Vec<String>,
    ) {
        self.record_issue(
            pattern_id,
            QualityIssueType::LowConfidence,
            QualitySeverity::Medium,
            format!(
                "Ambiguous extraction for '{}': {} possible values",
                param_name,
                candidates.len()
            ),
            None,
        );
    }

    /// Record slow pattern execution
    pub fn record_slow_pattern(&self, pattern_id: String, duration_ms: f64) {
        self.record_issue(
            pattern_id,
            QualityIssueType::PerformanceSlow,
            QualitySeverity::Low,
            format!("Pattern execution took {:.2}ms", duration_ms),
            None,
        );
    }

    /// Get all recorded issues
    pub fn get_all_issues(&self) -> HashMap<String, Vec<PatternQualityIssue>> {
        self.issues.read().unwrap().clone()
    }

    /// Get issues for a specific pattern
    pub fn get_pattern_issues(&self, pattern_id: &str) -> Option<Vec<PatternQualityIssue>> {
        self.issues.read().unwrap().get(pattern_id).cloned()
    }

    /// Clear all recorded issues
    pub fn clear(&self) {
        self.issues.write().unwrap().clear();
    }

    /// Aggregate issues and return summary
    pub fn get_summary(&self) -> HashMap<String, (usize, QualitySeverity)> {
        let issues = self.issues.read().unwrap();
        let mut summary = HashMap::new();

        for (pattern_id, pattern_issues) in issues.iter() {
            let count = pattern_issues.len();
            let max_severity = pattern_issues
                .iter()
                .map(|i| i.severity)
                .max()
                .unwrap_or(QualitySeverity::Low);

            summary.insert(pattern_id.clone(), (count, max_severity));
        }

        summary
    }
}

/// Convert runtime quality issues to pattern markings
pub fn mark_patterns_from_runtime_issues(
    monitor: &RuntimeQualityMonitor,
    mut overrides: HashMap<String, PatternOverride>,
) -> (HashMap<String, PatternOverride>, usize) {
    let issues = monitor.get_all_issues();
    let mut marked_count = 0;

    for (pattern_id, pattern_issues) in issues {
        // Skip if no issues
        if pattern_issues.is_empty() {
            continue;
        }

        // Find max severity
        let max_severity = pattern_issues
            .iter()
            .map(|i| i.severity)
            .max()
            .unwrap_or(QualitySeverity::Low);

        // Create override entry if needed
        let override_key = format!("override-{}", pattern_id);
        if !overrides.contains_key(&override_key) {
            overrides.insert(
                override_key.clone(),
                PatternOverride {
                    id: override_key.clone(),
                    source_type: "mongodb".to_string(),
                    source_id: Some(pattern_id.clone()),
                    name: None,
                    notes: None,
                    reason: None,
                    enabled: Some(true),
                    overrides: crate::pattern_loader::OverrideValues {
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
                },
            );
        }

        let override_data = overrides.get_mut(&override_key).unwrap();

        // Mark for review if not already marked
        if override_data.marking_status.is_none() {
            override_data.mark_as(MarkingStatus::PendingReview, "lsp-runtime-monitor");
            override_data.priority = Some(max_severity.to_priority().as_str().to_string());

            // Determine category from issue types
            let category = if pattern_issues
                .iter()
                .any(|i| i.issue_type == QualityIssueType::FailedExtraction)
            {
                IssueCategory::Extractor
            } else if pattern_issues
                .iter()
                .any(|i| i.issue_type == QualityIssueType::NoMatch)
            {
                IssueCategory::Regex
            } else {
                IssueCategory::MissingPattern
            };

            override_data.category = Some(category.as_str().to_string());

            // Build detailed notes
            let notes = pattern_issues
                .iter()
                .map(|issue| {
                    format!(
                        "- {} ({})",
                        issue.message,
                        match issue.severity {
                            QualitySeverity::Critical => "CRITICAL",
                            QualitySeverity::High => "HIGH",
                            QualitySeverity::Medium => "MEDIUM",
                            QualitySeverity::Low => "LOW",
                        }
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");

            override_data.notes = Some(notes);

            marked_count += 1;

            tracing::info!(
                "Marked pattern '{}' for review: {} issues found",
                pattern_id,
                pattern_issues.len()
            );
        }
    }

    (overrides, marked_count)
}

/// Export runtime issues to override file
pub fn export_runtime_issues(
    monitor: &RuntimeQualityMonitor,
    mut overrides: HashMap<String, PatternOverride>,
    output_path: &str,
) -> Result<usize, Box<dyn std::error::Error>> {
    // Mark patterns based on runtime issues
    let (marked_overrides, marked_count) = mark_patterns_from_runtime_issues(monitor, overrides);

    // Create override file
    let override_file = crate::pattern_tester::create_override_file_from_patterns(marked_overrides);

    // Export to JSON
    crate::pattern_tester::export_overrides_to_file(&override_file, output_path)?;

    tracing::info!(
        "Exported {} patterns with runtime issues to {}",
        marked_count,
        output_path
    );

    Ok(marked_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_monitor_creation() {
        let monitor = RuntimeQualityMonitor::new();
        assert!(monitor.get_all_issues().is_empty());
    }

    #[test]
    fn test_record_extraction_failure() {
        let monitor = RuntimeQualityMonitor::new();
        monitor.record_extraction_failure(
            "pattern-123".to_string(),
            "CODE".to_string(),
            "ERROR: Failed".to_string(),
        );

        let issues = monitor.get_all_issues();
        assert_eq!(issues.len(), 1);
        assert!(issues.contains_key("pattern-123"));
    }

    #[test]
    fn test_record_multiple_issues() {
        let monitor = RuntimeQualityMonitor::new();
        monitor.record_extraction_failure(
            "pattern-1".to_string(),
            "CODE".to_string(),
            "log1".to_string(),
        );
        monitor.record_no_match("pattern-2".to_string(), "log2".to_string());
        monitor.record_low_confidence(
            "pattern-1".to_string(),
            "ID".to_string(),
            vec!["a".to_string(), "b".to_string()],
        );

        let issues = monitor.get_all_issues();
        assert_eq!(issues.len(), 2); // 2 unique patterns
        assert_eq!(issues["pattern-1"].len(), 2); // 2 issues for pattern-1
    }

    #[test]
    fn test_get_summary() {
        let monitor = RuntimeQualityMonitor::new();
        monitor.record_extraction_failure(
            "pattern-1".to_string(),
            "CODE".to_string(),
            "log".to_string(),
        );
        monitor.record_extraction_failure(
            "pattern-1".to_string(),
            "MSG".to_string(),
            "log".to_string(),
        );

        let summary = monitor.get_summary();
        assert_eq!(summary["pattern-1"].0, 2); // 2 issues
        assert_eq!(summary["pattern-1"].1, QualitySeverity::High); // High severity
    }

    #[test]
    fn test_mark_patterns_from_runtime_issues() {
        let monitor = RuntimeQualityMonitor::new();
        monitor.record_extraction_failure(
            "pattern-123".to_string(),
            "CODE".to_string(),
            "log".to_string(),
        );

        let mut overrides = HashMap::new();
        let (marked, count) = mark_patterns_from_runtime_issues(&monitor, overrides);

        assert_eq!(count, 1);
        assert!(marked.contains_key("override-pattern-123"));

        let override_data = &marked["override-pattern-123"];
        assert_eq!(
            override_data.marking_status.as_ref().unwrap(),
            "pending-review"
        );
        assert_eq!(override_data.priority.as_ref().unwrap(), "high");
    }

    #[test]
    fn test_quality_severity_to_priority() {
        assert_eq!(QualitySeverity::Low.to_priority(), Priority::Low);
        assert_eq!(QualitySeverity::Medium.to_priority(), Priority::Medium);
        assert_eq!(QualitySeverity::High.to_priority(), Priority::High);
        assert_eq!(QualitySeverity::Critical.to_priority(), Priority::Critical);
    }

    #[test]
    fn test_clear_issues() {
        let monitor = RuntimeQualityMonitor::new();
        monitor.record_extraction_failure(
            "pattern-1".to_string(),
            "CODE".to_string(),
            "log".to_string(),
        );

        assert!(!monitor.get_all_issues().is_empty());
        monitor.clear();
        assert!(monitor.get_all_issues().is_empty());
    }
}
