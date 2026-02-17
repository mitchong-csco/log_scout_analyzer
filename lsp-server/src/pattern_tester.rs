/// Pattern Testing & Marking Module
///
/// Allows running tests against patterns and automatically marking those
/// that fail or have issues for review.
use crate::pattern_engine::Pattern;
use crate::pattern_loader::{
    validate_marking, IssueCategory, MarkingStatus, PatternOverride, Priority,
};
use std::collections::HashMap;

/// Test result for a single pattern
#[derive(Debug, Clone)]
pub struct PatternTestResult {
    pub pattern_id: String,
    pub pattern_name: String,
    pub passed: bool,
    pub failed_cases: Vec<TestCase>,
    pub total_cases: usize,
    pub passed_count: usize,
    pub error_message: Option<String>,
}

/// Individual test case
#[derive(Debug, Clone)]
pub struct TestCase {
    pub input: String,
    pub expected_match: bool,
    pub actual_match: bool,
    pub extracted_params: HashMap<String, String>,
    pub expected_params: HashMap<String, String>,
}

/// Pattern quality issue found during testing
#[derive(Debug, Clone)]
pub struct QualityIssue {
    pub issue_type: IssueType,
    pub severity: IssueSeverity,
    pub description: String,
    pub suggestion: Option<String>,
    pub affected_cases: usize,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum IssueType {
    FailedExtraction, // Parameter not extracted
    IncorrectMatch,   // Pattern didn't match expected logs
    PerformanceIssue, // Pattern too slow
    LowConfidence,    // Multiple conflicting matches
    MissingEdgeCases, // Edge cases not handled
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub enum IssueSeverity {
    Low,
    Medium,
    High,
    Critical,
}

/// Pattern Tester - runs tests and identifies issues
pub struct PatternTester {
    patterns: Vec<Pattern>,
}

impl PatternTester {
    pub fn new(patterns: Vec<Pattern>) -> Self {
        Self { patterns }
    }

    /// Test a pattern against test cases
    pub fn test_pattern(&self, pattern_id: &str, test_cases: Vec<TestCase>) -> PatternTestResult {
        let pattern = self.patterns.iter().find(|p| p.id == pattern_id);

        if let None = pattern {
            return PatternTestResult {
                pattern_id: pattern_id.to_string(),
                pattern_name: "Unknown".to_string(),
                passed: false,
                failed_cases: vec![],
                total_cases: test_cases.len(),
                passed_count: 0,
                error_message: Some("Pattern not found".to_string()),
            };
        }

        let pattern = pattern.unwrap();
        let mut failed_cases = Vec::new();
        let mut passed_count = 0;

        for test_case in &test_cases {
            // Test if pattern matches
            let regex = match regex::Regex::new(&pattern.pattern) {
                Ok(r) => r,
                Err(e) => {
                    return PatternTestResult {
                        pattern_id: pattern_id.to_string(),
                        pattern_name: pattern.name.clone(),
                        passed: false,
                        failed_cases: vec![],
                        total_cases: test_cases.len(),
                        passed_count: 0,
                        error_message: Some(format!("Invalid regex: {}", e)),
                    };
                }
            };

            let actual_match = regex.is_match(&test_case.input);

            if actual_match == test_case.expected_match {
                // Check parameter extraction
                let mut extraction_failed = false;

                if actual_match {
                    for (param_name, _) in &test_case.expected_params {
                        if !test_case.extracted_params.contains_key(param_name) {
                            extraction_failed = true;
                            break;
                        }
                    }
                }

                if !extraction_failed {
                    passed_count += 1;
                    continue;
                }
            }

            failed_cases.push(test_case.clone());
        }

        let passed = failed_cases.is_empty();

        PatternTestResult {
            pattern_id: pattern_id.to_string(),
            pattern_name: pattern.name.clone(),
            passed,
            failed_cases,
            total_cases: test_cases.len(),
            passed_count,
            error_message: None,
        }
    }

    /// Analyze test results to identify quality issues
    pub fn analyze_results(
        &self,
        results: &[PatternTestResult],
    ) -> HashMap<String, Vec<QualityIssue>> {
        let mut issues_by_pattern = HashMap::new();

        for result in results {
            let mut issues = Vec::new();

            if result.error_message.is_some() {
                issues.push(QualityIssue {
                    issue_type: IssueType::IncorrectMatch,
                    severity: IssueSeverity::Critical,
                    description: result.error_message.as_ref().unwrap().clone(),
                    suggestion: Some("Fix regex syntax or review pattern definition".to_string()),
                    affected_cases: result.total_cases,
                });
            } else if !result.passed {
                let failure_rate =
                    (result.failed_cases.len() as f64 / result.total_cases as f64) * 100.0;

                let (severity, issue_type) = if failure_rate > 50.0 {
                    (IssueSeverity::Critical, IssueType::IncorrectMatch)
                } else if failure_rate > 25.0 {
                    (IssueSeverity::High, IssueType::IncorrectMatch)
                } else {
                    (IssueSeverity::Medium, IssueType::MissingEdgeCases)
                };

                // Check for extraction failures
                let extraction_failures = result
                    .failed_cases
                    .iter()
                    .filter(|tc| tc.actual_match && !tc.expected_params.is_empty())
                    .count();

                if extraction_failures > 0 {
                    issues.push(QualityIssue {
                        issue_type: IssueType::FailedExtraction,
                        severity: IssueSeverity::High,
                        description: format!(
                            "{} parameter extraction failures out of {} cases",
                            extraction_failures, result.total_cases
                        ),
                        suggestion: Some("Review parameter extractor regex patterns".to_string()),
                        affected_cases: extraction_failures,
                    });
                }

                issues.push(QualityIssue {
                    issue_type,
                    severity,
                    description: format!(
                        "Pattern failed {} out of {} test cases ({:.1}%)",
                        result.failed_cases.len(),
                        result.total_cases,
                        failure_rate
                    ),
                    suggestion: Some("Review and update pattern regex or conditions".to_string()),
                    affected_cases: result.failed_cases.len(),
                });
            }

            if !issues.is_empty() {
                issues_by_pattern.insert(result.pattern_id.clone(), issues);
            }
        }

        issues_by_pattern
    }
}

/// Helper to convert test results to pattern markings
pub fn mark_patterns_from_test_results(
    test_results: &[PatternTestResult],
    overrides: &mut HashMap<String, PatternOverride>,
    tester: &PatternTester,
    marker_name: &str,
) -> HashMap<String, Vec<QualityIssue>> {
    let issues = tester.analyze_results(test_results);

    for (pattern_id, pattern_issues) in &issues {
        // Find or create override for this pattern
        let override_key = format!("override-{}", pattern_id);

        if !overrides.contains_key(&override_key) {
            // Create new override for failed pattern
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

        // Determine priority based on issue severity
        let priority = pattern_issues
            .iter()
            .map(|issue| match issue.severity {
                IssueSeverity::Critical => Priority::Critical,
                IssueSeverity::High => Priority::High,
                IssueSeverity::Medium => Priority::Medium,
                IssueSeverity::Low => Priority::Low,
            })
            .max_by_key(|p| match p {
                Priority::Critical => 4,
                Priority::High => 3,
                Priority::Medium => 2,
                Priority::Low => 1,
            })
            .unwrap_or(Priority::Medium);

        // Determine category based on issue type
        let category = if pattern_issues
            .iter()
            .any(|i| i.issue_type == IssueType::FailedExtraction)
        {
            IssueCategory::Extractor
        } else if pattern_issues
            .iter()
            .any(|i| i.issue_type == IssueType::IncorrectMatch)
        {
            IssueCategory::Regex
        } else {
            IssueCategory::MissingPattern
        };

        // Mark for review
        override_data.mark_as(MarkingStatus::PendingReview, marker_name);
        override_data.priority = Some(priority.as_str().to_string());
        override_data.category = Some(category.as_str().to_string());

        // Add detailed notes about issues
        let notes = pattern_issues
            .iter()
            .map(|issue| {
                format!(
                    "- {} ({})",
                    issue.description,
                    match issue.severity {
                        IssueSeverity::Critical => "CRITICAL",
                        IssueSeverity::High => "HIGH",
                        IssueSeverity::Medium => "MEDIUM",
                        IssueSeverity::Low => "LOW",
                    }
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        override_data.notes = Some(notes);

        // Validate marking
        if let Err(errors) = validate_marking(override_data) {
            tracing::warn!(
                "Marking validation errors for pattern '{}': {:?}",
                pattern_id,
                errors
            );
        } else {
            tracing::info!(
                "Marked pattern '{}' for review: Priority={:?}, Category={:?}",
                pattern_id,
                priority,
                category
            );
        }
    }

    issues
}

/// Export marked patterns to a JSON override file
pub fn export_overrides_to_file(
    overrides: &crate::pattern_loader::OverrideFile,
    output_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Create parent directory if needed
    if let Some(parent) = std::path::Path::new(output_path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }

    // Serialize to pretty JSON
    let json = serde_json::to_string_pretty(overrides)?;

    // Write to file
    std::fs::write(output_path, json)?;

    tracing::info!(
        "Exported {} overrides and {} custom patterns to {}",
        overrides.overrides.len(),
        overrides.custom.len(),
        output_path
    );

    Ok(())
}

/// Helper function to create override file from marked patterns
pub fn create_override_file_from_patterns(
    overrides: HashMap<String, PatternOverride>,
) -> crate::pattern_loader::OverrideFile {
    crate::pattern_loader::OverrideFile {
        version: "1.0".to_string(),
        last_sync: Some(chrono::Utc::now().to_rfc3339()),
        overrides,
        custom: HashMap::new(),
    }
}

/// Complete workflow: Test patterns and export marked ones to JSON
pub fn test_and_export(
    tester: &PatternTester,
    test_results: &[PatternTestResult],
    output_path: &str,
    marker_name: &str,
) -> Result<HashMap<String, Vec<QualityIssue>>, Box<dyn std::error::Error>> {
    // Create mutable overrides map
    let mut overrides = HashMap::new();

    // Mark patterns based on test results
    let issues = mark_patterns_from_test_results(test_results, &mut overrides, tester, marker_name);

    // Convert to override file
    let override_file = create_override_file_from_patterns(overrides);

    // Export to JSON
    export_overrides_to_file(&override_file, output_path)?;

    Ok(issues)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pattern_engine::{Pattern, PatternMode, Severity};

    fn create_test_pattern(id: &str, regex: &str) -> Pattern {
        Pattern {
            id: id.to_string(),
            name: format!("Test Pattern {}", id),
            annotation: "Test".to_string(),
            pattern: regex.to_string(),
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
        }
    }

    #[test]
    fn test_pattern_tester_creates_instance() {
        let patterns = vec![create_test_pattern("p1", "test.*pattern")];
        let tester = PatternTester::new(patterns);
        assert_eq!(tester.patterns.len(), 1);
    }

    #[test]
    fn test_pattern_test_basic_match() {
        let patterns = vec![create_test_pattern("p1", r"ERROR.*")];
        let tester = PatternTester::new(patterns);

        let test_cases = vec![TestCase {
            input: "ERROR: Something went wrong".to_string(),
            expected_match: true,
            actual_match: false,
            extracted_params: HashMap::new(),
            expected_params: HashMap::new(),
        }];

        let result = tester.test_pattern("p1", test_cases);
        assert_eq!(result.pattern_id, "p1");
        assert_eq!(result.total_cases, 1);
    }

    #[test]
    fn test_pattern_test_not_found() {
        let patterns = vec![];
        let tester = PatternTester::new(patterns);

        let test_cases = vec![];
        let result = tester.test_pattern("nonexistent", test_cases);
        assert!(!result.passed);
        assert_eq!(result.error_message.unwrap(), "Pattern not found");
    }

    #[test]
    fn test_quality_issue_detection() {
        let patterns = vec![create_test_pattern("p1", r"ERROR.*")];
        let tester = PatternTester::new(patterns);

        let results = vec![PatternTestResult {
            pattern_id: "p1".to_string(),
            pattern_name: "Test".to_string(),
            passed: false,
            failed_cases: vec![TestCase {
                input: "ERROR: test".to_string(),
                expected_match: true,
                actual_match: false,
                extracted_params: HashMap::new(),
                expected_params: HashMap::new(),
            }],
            total_cases: 1,
            passed_count: 0,
            error_message: None,
        }];

        let issues = tester.analyze_results(&results);
        assert!(issues.contains_key("p1"));
        assert!(!issues["p1"].is_empty());
    }

    #[test]
    fn test_mark_patterns_from_results() {
        let patterns = vec![create_test_pattern("p1", r"ERROR.*")];
        let tester = PatternTester::new(patterns);

        let results = vec![PatternTestResult {
            pattern_id: "p1".to_string(),
            pattern_name: "Test".to_string(),
            passed: false,
            failed_cases: vec![TestCase {
                input: "ERROR: test".to_string(),
                expected_match: true,
                actual_match: false,
                extracted_params: HashMap::new(),
                expected_params: HashMap::new(),
            }],
            total_cases: 1,
            passed_count: 0,
            error_message: None,
        }];

        let mut overrides = HashMap::new();
        let issues =
            mark_patterns_from_test_results(&results, &mut overrides, &tester, "test_runner");

        assert!(!overrides.is_empty());
        assert!(overrides.values().next().unwrap().is_pending_review());
        assert!(!issues.is_empty());
    }

    #[test]
    fn test_create_override_file() {
        let mut overrides = HashMap::new();
        overrides.insert(
            "override-test".to_string(),
            PatternOverride {
                id: "override-test".to_string(),
                source_type: "mongodb".to_string(),
                source_id: Some("test-pattern".to_string()),
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
                marking_status: Some("pending-review".to_string()),
                marked_by: Some("test_user".to_string()),
                marked_at: Some(chrono::Utc::now().to_rfc3339()),
                reviewed_by: None,
                priority: Some("high".to_string()),
                category: Some("extractor".to_string()),
            },
        );

        let override_file = create_override_file_from_patterns(overrides);
        assert_eq!(override_file.version, "1.0");
        assert_eq!(override_file.overrides.len(), 1);
        assert!(override_file.last_sync.is_some());
    }

    #[test]
    fn test_export_overrides_to_file() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir
            .path()
            .join("pattern-overrides.json")
            .to_string_lossy()
            .to_string();

        let mut overrides = HashMap::new();
        overrides.insert(
            "override-test".to_string(),
            PatternOverride {
                id: "override-test".to_string(),
                source_type: "mongodb".to_string(),
                source_id: Some("test-pattern".to_string()),
                name: Some("Test Pattern".to_string()),
                notes: Some("Test notes".to_string()),
                reason: None,
                enabled: Some(true),
                overrides: crate::pattern_loader::OverrideValues {
                    regex: None,
                    severity: None,
                    parameter_extractors: None,
                    condition_triggers: None,
                },
                marking_status: Some("pending-review".to_string()),
                marked_by: Some("test_user".to_string()),
                marked_at: Some(chrono::Utc::now().to_rfc3339()),
                reviewed_by: None,
                priority: Some("high".to_string()),
                category: Some("extractor".to_string()),
            },
        );

        let override_file = create_override_file_from_patterns(overrides);
        let result = export_overrides_to_file(&override_file, &output_path);

        assert!(result.is_ok());
        assert!(std::path::Path::new(&output_path).exists());

        // Verify JSON is valid
        let json_content = std::fs::read_to_string(&output_path).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json_content).unwrap();
        assert!(parsed["overrides"].is_object());
        assert_eq!(parsed["version"].as_str().unwrap(), "1.0");
    }

    #[test]
    fn test_test_and_export_complete_workflow() {
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let output_path = temp_dir
            .path()
            .join("pattern-overrides.json")
            .to_string_lossy()
            .to_string();

        let patterns = vec![create_test_pattern("p1", r"ERROR.*")];
        let tester = PatternTester::new(patterns);

        let results = vec![PatternTestResult {
            pattern_id: "p1".to_string(),
            pattern_name: "Test".to_string(),
            passed: false,
            failed_cases: vec![TestCase {
                input: "ERROR: test".to_string(),
                expected_match: true,
                actual_match: false,
                extracted_params: HashMap::new(),
                expected_params: HashMap::new(),
            }],
            total_cases: 1,
            passed_count: 0,
            error_message: None,
        }];

        let result = test_and_export(&tester, &results, &output_path, "test_runner");

        assert!(result.is_ok());
        assert!(std::path::Path::new(&output_path).exists());

        // Verify the exported JSON
        let json_content = std::fs::read_to_string(&output_path).unwrap();
        let override_file: crate::pattern_loader::OverrideFile =
            serde_json::from_str(&json_content).unwrap();
        assert!(!override_file.overrides.is_empty());
    }
}
