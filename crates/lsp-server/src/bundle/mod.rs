//! Bundle management system for log investigation
//!
//! This module provides functionality for creating and managing bundles of log files
//! from different services, with automatic service detection and pattern analysis.

pub mod analyzer;
pub mod archive_extractor;
pub mod extraction_policy;
pub mod manager;
pub mod models;
pub mod service_detector;
pub mod timeframe_analyzer;

pub use analyzer::{BundleAnalyzer, BundleStats};
pub use archive_extractor::{ArchiveExtractor, ArchiveFormat};
pub use extraction_policy::{ExtractionDecision, ExtractionPolicy, ExtractionStats};
pub use manager::{BundleManager, CaseSummary, ImportResult, ImportSummary, ImportedLog};
pub use models::{
    AnalysisStatistics, Bundle, BundleAnalysisResult, BundleLog, BundleMetadata, Case, CaseStatus,
    Detection, DetectionSeverity, LogType, ServiceType, Severity,
};
pub use service_detector::ServiceDetector;
pub use timeframe_analyzer::{
    BundleGroup, LogTimeframe, TimeframeAnalyzer, TimeframeBundleAnalyzer,
};

use std::io;
use thiserror::Error;

/// Errors that can occur in bundle operations
#[derive(Error, Debug)]
pub enum BundleError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Bundle not found: {0}")]
    NotFound(String),

    #[error("Invalid bundle: {0}")]
    Invalid(String),

    #[error("Service detection failed: {0}")]
    DetectionFailed(String),
}

pub type Result<T> = std::result::Result<T, BundleError>;
