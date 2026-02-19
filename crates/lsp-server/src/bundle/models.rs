//! Bundle data models for log investigation management
//!
//! This module provides the core data structures for creating, managing,
//! and analyzing bundles of log files from different services.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// A bundle represents a collection of log files for an investigation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bundle {
    /// Unique identifier (e.g., "bundle_abc123")
    pub id: String,

    /// User-friendly name (e.g., "INC-12345: Presence Failure")
    pub name: String,

    /// Optional description of the investigation
    pub description: Option<String>,

    /// List of log files in this bundle
    pub logs: Vec<BundleLog>,

    /// Metadata about the investigation
    pub metadata: BundleMetadata,

    /// When the bundle was created
    pub created_at: DateTime<Utc>,

    /// When the bundle was last modified
    pub updated_at: DateTime<Utc>,

    /// Analysis results (populated after analysis)
    pub analysis: Option<BundleAnalysisResult>,
}

impl Bundle {
    /// Create a new bundle with the given ID and name
    pub fn new(id: String, name: String) -> Self {
        let now = Utc::now();
        Self {
            id,
            name,
            description: None,
            logs: Vec::new(),
            metadata: BundleMetadata::default(),
            created_at: now,
            updated_at: now,
            analysis: None,
        }
    }

    /// Add a log file to the bundle
    pub fn add_log(&mut self, log: BundleLog) {
        self.logs.push(log);
        self.updated_at = Utc::now();
    }

    /// Get total size of all logs in bytes
    pub fn total_size(&self) -> u64 {
        self.logs.iter().map(|log| log.size_bytes).sum()
    }

    /// Get total line count across all logs
    pub fn total_lines(&self) -> usize {
        self.logs.iter().map(|log| log.line_count).sum()
    }

    /// Get number of logs in bundle
    pub fn log_count(&self) -> usize {
        self.logs.len()
    }
}

/// A single log file within a bundle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleLog {
    /// File path or URI
    pub uri: String,

    /// Detected service type
    pub service: ServiceType,

    /// Type of log file
    pub log_type: LogType,

    /// When this log was added to the bundle
    pub added_at: DateTime<Utc>,

    /// File size in bytes
    pub size_bytes: u64,

    /// Number of lines in the log
    pub line_count: usize,

    /// Detected timestamp format (if any)
    pub timestamp_format: Option<String>,
}

impl BundleLog {
    /// Create a new bundle log entry
    pub fn new(uri: String, service: ServiceType, log_type: LogType) -> Self {
        Self {
            uri,
            service,
            log_type,
            added_at: Utc::now(),
            size_bytes: 0,
            line_count: 0,
            timestamp_format: None,
        }
    }
}

/// Type of service the log is from
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ServiceType {
    /// Cisco Jabber client
    Jabber,

    /// Cisco Unified Communications Manager
    CUCM,

    /// Cisco Unified Presence (CUP)
    CUP,

    /// Cisco Unity (voicemail)
    Unity,

    /// SIP protocol traces
    SIP,

    /// Network-level logs
    Network,

    /// Custom/unknown service
    Custom(String),
}

impl fmt::Display for ServiceType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ServiceType::Jabber => write!(f, "Jabber"),
            ServiceType::CUCM => write!(f, "CUCM"),
            ServiceType::CUP => write!(f, "CUP"),
            ServiceType::Unity => write!(f, "Unity"),
            ServiceType::SIP => write!(f, "SIP"),
            ServiceType::Network => write!(f, "Network"),
            ServiceType::Custom(name) => write!(f, "Custom({})", name),
        }
    }
}

/// Type of log file
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum LogType {
    /// Trace-level logs
    Trace,

    /// Debug logs
    Debug,

    /// Error logs
    Error,

    /// Warning logs
    Warning,

    /// Audit logs
    Audit,

    /// Call Detail Records
    CDR,

    /// Activity logs
    Activity,

    /// Other/unknown type
    Other(String),
}

impl fmt::Display for LogType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LogType::Trace => write!(f, "Trace"),
            LogType::Debug => write!(f, "Debug"),
            LogType::Error => write!(f, "Error"),
            LogType::Warning => write!(f, "Warning"),
            LogType::Audit => write!(f, "Audit"),
            LogType::CDR => write!(f, "CDR"),
            LogType::Activity => write!(f, "Activity"),
            LogType::Other(name) => write!(f, "Other({})", name),
        }
    }
}

/// Metadata about the investigation
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BundleMetadata {
    /// Case or incident ID (e.g., "700440257", "INC-12345")
    /// Multiple bundles can share the same case_id for multi-bundle investigations
    pub case_id: Option<String>,

    /// Bundle type within the case (e.g., "Initial Diagnostics", "Follow-up Traces", "Network Capture")
    pub bundle_type: Option<String>,

    /// Severity level
    pub severity: Option<Severity>,

    /// Tags for categorization
    pub tags: Vec<String>,

    /// Owner/creator username
    pub owner: Option<String>,

    /// Team members with access
    pub team_members: Vec<String>,

    /// Custom key-value pairs
    pub custom_fields: HashMap<String, String>,
}

/// Severity level for the investigation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

impl fmt::Display for Severity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Severity::Critical => write!(f, "Critical"),
            Severity::High => write!(f, "High"),
            Severity::Medium => write!(f, "Medium"),
            Severity::Low => write!(f, "Low"),
        }
    }
}

/// A case groups multiple bundles for the same customer issue
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Case {
    /// Case ID (e.g., "700440257", "INC-12345")
    pub case_id: String,

    /// List of bundle IDs associated with this case
    pub bundle_ids: Vec<String>,

    /// Case description
    pub description: Option<String>,

    /// Customer name
    pub customer: Option<String>,

    /// Case severity
    pub severity: Option<Severity>,

    /// Case status
    pub status: CaseStatus,

    /// When the case was created
    pub created_at: DateTime<Utc>,

    /// When the case was last updated
    pub updated_at: DateTime<Utc>,

    /// Custom metadata
    pub metadata: HashMap<String, String>,
}

impl Case {
    /// Create a new case
    pub fn new(case_id: String) -> Self {
        let now = Utc::now();
        Self {
            case_id,
            bundle_ids: Vec::new(),
            description: None,
            customer: None,
            severity: None,
            status: CaseStatus::Open,
            created_at: now,
            updated_at: now,
            metadata: HashMap::new(),
        }
    }

    /// Add a bundle to this case
    pub fn add_bundle(&mut self, bundle_id: String) {
        if !self.bundle_ids.contains(&bundle_id) {
            self.bundle_ids.push(bundle_id);
            self.updated_at = Utc::now();
        }
    }

    /// Remove a bundle from this case
    pub fn remove_bundle(&mut self, bundle_id: &str) {
        self.bundle_ids.retain(|id| id != bundle_id);
        self.updated_at = Utc::now();
    }

    /// Get bundle count
    pub fn bundle_count(&self) -> usize {
        self.bundle_ids.len()
    }
}

/// Case status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CaseStatus {
    Open,
    InProgress,
    Resolved,
    Closed,
}

impl fmt::Display for CaseStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CaseStatus::Open => write!(f, "Open"),
            CaseStatus::InProgress => write!(f, "In Progress"),
            CaseStatus::Resolved => write!(f, "Resolved"),
            CaseStatus::Closed => write!(f, "Closed"),
        }
    }
}

/// A single pattern match detection in a log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    /// Bundle ID this detection is from
    pub bundle_id: String,

    /// Log file URI
    pub log_uri: String,

    /// Service type
    pub service: ServiceType,

    /// Pattern ID that matched
    pub pattern_id: String,

    /// Pattern name
    pub pattern_name: String,

    /// Line number (1-indexed)
    pub line_number: usize,

    /// Matched text
    pub matched_text: String,

    /// Full log line
    pub log_line: String,

    /// Detection severity
    pub severity: DetectionSeverity,

    /// When this was detected
    pub detected_at: DateTime<Utc>,

    /// Extracted fields from the pattern
    pub extracted_fields: HashMap<String, String>,
}

/// Severity of a detection
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DetectionSeverity {
    Error,
    Warning,
    Info,
}

impl fmt::Display for DetectionSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DetectionSeverity::Error => write!(f, "Error"),
            DetectionSeverity::Warning => write!(f, "Warning"),
            DetectionSeverity::Info => write!(f, "Info"),
        }
    }
}

/// Results from analyzing a bundle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleAnalysisResult {
    /// Bundle ID
    pub bundle_id: String,

    /// All detections found
    pub detections: Vec<Detection>,

    /// Detections grouped by service
    pub by_service: HashMap<String, Vec<Detection>>,

    /// Detections grouped by pattern
    pub by_pattern: HashMap<String, Vec<Detection>>,

    /// Summary statistics
    pub statistics: AnalysisStatistics,

    /// When the analysis was performed
    pub analyzed_at: DateTime<Utc>,

    /// How long the analysis took (in milliseconds)
    pub duration_ms: u64,
}

impl BundleAnalysisResult {
    /// Create a new analysis result
    pub fn new(bundle_id: String, detections: Vec<Detection>, duration_ms: u64) -> Self {
        let mut by_service: HashMap<String, Vec<Detection>> = HashMap::new();
        let mut by_pattern: HashMap<String, Vec<Detection>> = HashMap::new();

        let mut error_count = 0;
        let mut warning_count = 0;
        let mut info_count = 0;

        for detection in &detections {
            // Group by service
            by_service
                .entry(detection.service.to_string())
                .or_insert_with(Vec::new)
                .push(detection.clone());

            // Group by pattern
            by_pattern
                .entry(detection.pattern_id.clone())
                .or_insert_with(Vec::new)
                .push(detection.clone());

            // Count by severity
            match detection.severity {
                DetectionSeverity::Error => error_count += 1,
                DetectionSeverity::Warning => warning_count += 1,
                DetectionSeverity::Info => info_count += 1,
            }
        }

        let statistics = AnalysisStatistics {
            total_detections: detections.len(),
            error_count,
            warning_count,
            info_count,
            services_analyzed: by_service.len(),
            patterns_matched: by_pattern.len(),
        };

        Self {
            bundle_id,
            detections,
            by_service,
            by_pattern,
            statistics,
            analyzed_at: Utc::now(),
            duration_ms,
        }
    }
}

/// Statistics from bundle analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisStatistics {
    /// Total number of detections
    pub total_detections: usize,

    /// Number of error-level detections
    pub error_count: usize,

    /// Number of warning-level detections
    pub warning_count: usize,

    /// Number of info-level detections
    pub info_count: usize,

    /// Number of services analyzed
    pub services_analyzed: usize,

    /// Number of unique patterns that matched
    pub patterns_matched: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bundle_creation() {
        let bundle = Bundle::new("bundle_test123".to_string(), "Test Bundle".to_string());

        assert_eq!(bundle.id, "bundle_test123");
        assert_eq!(bundle.name, "Test Bundle");
        assert_eq!(bundle.log_count(), 0);
        assert_eq!(bundle.total_size(), 0);
        assert_eq!(bundle.total_lines(), 0);
    }

    #[test]
    fn test_add_log() {
        let mut bundle = Bundle::new("bundle_test".to_string(), "Test".to_string());

        let mut log = BundleLog::new(
            "/path/to/jabber.log".to_string(),
            ServiceType::Jabber,
            LogType::Trace,
        );
        log.size_bytes = 1024;
        log.line_count = 100;

        bundle.add_log(log);

        assert_eq!(bundle.log_count(), 1);
        assert_eq!(bundle.total_size(), 1024);
        assert_eq!(bundle.total_lines(), 100);
    }

    #[test]
    fn test_service_type_display() {
        assert_eq!(ServiceType::Jabber.to_string(), "Jabber");
        assert_eq!(ServiceType::CUCM.to_string(), "CUCM");
        assert_eq!(
            ServiceType::Custom("MyService".to_string()).to_string(),
            "Custom(MyService)"
        );
    }

    #[test]
    fn test_analysis_result() {
        let detections = vec![
            Detection {
                bundle_id: "test".to_string(),
                log_uri: "test.log".to_string(),
                service: ServiceType::Jabber,
                pattern_id: "p1".to_string(),
                pattern_name: "Error Pattern".to_string(),
                line_number: 1,
                matched_text: "error".to_string(),
                log_line: "line".to_string(),
                severity: DetectionSeverity::Error,
                detected_at: Utc::now(),
                extracted_fields: HashMap::new(),
            },
            Detection {
                bundle_id: "test".to_string(),
                log_uri: "test.log".to_string(),
                service: ServiceType::Jabber,
                pattern_id: "p2".to_string(),
                pattern_name: "Warning Pattern".to_string(),
                line_number: 2,
                matched_text: "warning".to_string(),
                log_line: "line".to_string(),
                severity: DetectionSeverity::Warning,
                detected_at: Utc::now(),
                extracted_fields: HashMap::new(),
            },
        ];

        let result = BundleAnalysisResult::new("test".to_string(), detections, 100);

        assert_eq!(result.statistics.total_detections, 2);
        assert_eq!(result.statistics.error_count, 1);
        assert_eq!(result.statistics.warning_count, 1);
        assert_eq!(result.statistics.info_count, 0);
        assert_eq!(result.duration_ms, 100);
    }
}
