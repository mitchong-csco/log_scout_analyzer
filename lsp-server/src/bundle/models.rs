//! Data models for log bundles and analysis results

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Represents a logical grouping of logs for investigation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bundle {
    /// Unique identifier (UUID format)
    pub id: String,

    /// User-friendly name
    pub name: String,

    /// Optional description
    pub description: Option<String>,

    /// Logs in this bundle
    pub logs: Vec<BundleLog>,

    /// Metadata about the investigation
    pub metadata: BundleMetadata,

    /// When bundle was created
    pub created_at: DateTime<Utc>,

    /// When bundle was last modified
    pub updated_at: DateTime<Utc>,

    /// Analysis results (stored after analysis)
    pub analysis: Option<BundleAnalysisResult>,
}

/// A single log file in a bundle with service metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleLog {
    /// File path (URI or local path)
    pub uri: String,

    /// Detected or specified service type
    pub service: ServiceType,

    /// Log type (trace, debug, error, audit)
    pub log_type: LogType,

    /// When added to bundle
    pub added_at: DateTime<Utc>,

    /// File size in bytes
    pub size_bytes: u64,

    /// Line count (cached for quick display)
    pub line_count: usize,

    /// Timestamp format in this log (detected or specified)
    pub timestamp_format: Option<String>,
}

/// Service types supported for log analysis
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum ServiceType {
    /// Cisco Jabber client
    Jabber,
    /// Cisco Unified Communications Manager
    CUCM,
    /// Cisco Unified Presence
    CUP,
    /// Cisco Unified Voicemail
    Unity,
    /// SIP protocol traces
    SIP,
    /// Network traces
    Network,
    /// Custom/unknown service
    Custom(String),
}

impl std::fmt::Display for ServiceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServiceType::Jabber => write!(f, "Jabber"),
            ServiceType::CUCM => write!(f, "CUCM"),
            ServiceType::CUP => write!(f, "CUP"),
            ServiceType::Unity => write!(f, "Unity"),
            ServiceType::SIP => write!(f, "SIP"),
            ServiceType::Network => write!(f, "Network"),
            ServiceType::Custom(s) => write!(f, "{}", s),
        }
    }
}

/// Log types for categorization
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum LogType {
    Trace,
    Debug,
    Error,
    Warning,
    Audit,
    CDR,
    Activity,
    Other(String),
}

impl std::fmt::Display for LogType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogType::Trace => write!(f, "Trace"),
            LogType::Debug => write!(f, "Debug"),
            LogType::Error => write!(f, "Error"),
            LogType::Warning => write!(f, "Warning"),
            LogType::Audit => write!(f, "Audit"),
            LogType::CDR => write!(f, "CDR"),
            LogType::Activity => write!(f, "Activity"),
            LogType::Other(s) => write!(f, "{}", s),
        }
    }
}

/// Metadata associated with a bundle
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BundleMetadata {
    /// Case/Incident ID
    pub case_id: Option<String>,

    /// URL to case management system (e.g., QCSOne)
    pub case_url: Option<String>,

    /// Severity level
    pub severity: Option<String>,

    /// Tags for searching
    pub tags: Vec<String>,

    /// Who is investigating
    pub owner: Option<String>,

    /// Custom fields for extensibility
    pub custom: HashMap<String, String>,
}

/// Complete analysis result for a bundle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleAnalysisResult {
    /// When analysis was run
    pub analyzed_at: DateTime<Utc>,

    /// All detections from all logs
    pub detections: Vec<Detection>,

    /// Detections grouped by service
    pub by_service: HashMap<ServiceType, Vec<Detection>>,

    /// Detections grouped by pattern
    pub by_pattern: HashMap<String, Vec<Detection>>,

    /// Summary statistics
    pub summary: AnalysisSummary,
}

/// A single pattern match/detection in a log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    /// Which log this came from
    pub log_uri: String,

    /// Pattern that matched
    pub pattern_id: String,

    /// Pattern display name
    pub pattern_name: String,

    /// Line number in log file (1-based)
    pub line_number: usize,

    /// Text that was matched
    pub matched_text: String,

    /// Severity of this detection
    pub severity: DetectionSeverity,

    /// Service that produced this log
    pub service: ServiceType,
}

/// Severity levels for detections
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "UPPERCASE")]
pub enum DetectionSeverity {
    #[serde(rename = "ERROR")]
    Error,
    #[serde(rename = "WARNING")]
    Warning,
    #[serde(rename = "INFO")]
    Info,
    #[serde(rename = "HINT")]
    Hint,
}

impl std::fmt::Display for DetectionSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DetectionSeverity::Error => write!(f, "Error"),
            DetectionSeverity::Warning => write!(f, "Warning"),
            DetectionSeverity::Info => write!(f, "Info"),
            DetectionSeverity::Hint => write!(f, "Hint"),
        }
    }
}

/// Summary statistics for a bundle analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub total_logs: usize,
    pub total_lines: usize,
    pub total_detections: usize,
    pub error_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    pub by_service: HashMap<ServiceType, u32>,
    pub analysis_duration_ms: u64,
}

/// Lightweight bundle info for listing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleInfo {
    pub id: String,
    pub name: String,
    pub owner: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub log_count: usize,
    pub case_id: Option<String>,
    pub tags: Vec<String>,
    pub analysis_status: String, // "not_analyzed" | "completed" | "in_progress"
}

impl Bundle {
    /// Create a new bundle
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

    /// Add a log to the bundle
    pub fn add_log(&mut self, log: BundleLog) {
        self.logs.push(log);
        self.updated_at = Utc::now();
    }

    /// Get bundle info for listing
    pub fn to_info(&self) -> BundleInfo {
        let analysis_status = if self.analysis.is_some() {
            "completed".to_string()
        } else {
            "not_analyzed".to_string()
        };

        BundleInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            owner: self.metadata.owner.clone(),
            created_at: self.created_at,
            updated_at: self.updated_at,
            log_count: self.logs.len(),
            case_id: self.metadata.case_id.clone(),
            tags: self.metadata.tags.clone(),
            analysis_status,
        }
    }

    /// Get total lines across all logs
    pub fn total_lines(&self) -> usize {
        self.logs.iter().map(|l| l.line_count).sum()
    }
}

impl BundleAnalysisResult {
    /// Create a new analysis result with detections
    pub fn new(detections: Vec<Detection>) -> Self {
        let now = Utc::now();

        // Group by service
        let mut by_service: HashMap<ServiceType, Vec<Detection>> = HashMap::new();
        for detection in &detections {
            by_service
                .entry(detection.service.clone())
                .or_insert_with(Vec::new)
                .push(detection.clone());
        }

        // Group by pattern
        let mut by_pattern: HashMap<String, Vec<Detection>> = HashMap::new();
        for detection in &detections {
            by_pattern
                .entry(detection.pattern_id.clone())
                .or_insert_with(Vec::new)
                .push(detection.clone());
        }

        // Build summary
        let total_detections = detections.len();
        let error_count = detections
            .iter()
            .filter(|d| d.severity == DetectionSeverity::Error)
            .count();
        let warning_count = detections
            .iter()
            .filter(|d| d.severity == DetectionSeverity::Warning)
            .count();
        let info_count = detections
            .iter()
            .filter(|d| d.severity == DetectionSeverity::Info)
            .count();

        let summary = AnalysisSummary {
            total_logs: 0, // Set by caller
            total_lines: 0,
            total_detections,
            error_count,
            warning_count,
            info_count,
            by_service: by_service
                .iter()
                .map(|(service, dets)| (service.clone(), dets.len() as u32))
                .collect(),
            analysis_duration_ms: 0,
        };

        Self {
            analyzed_at: now,
            detections,
            by_service,
            by_pattern,
            summary,
        }
    }
}
