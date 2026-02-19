//! Log bundling system for multi-service investigation analysis
//!
//! Provides functionality to group logs from multiple services (Jabber, CUCM, CUP, etc.)
//! into logical bundles for investigation and analysis.

pub mod analyzer;
pub mod archive_extractor;
pub mod manager;
pub mod models;
pub mod service_detector;

pub use analyzer::BundleAnalyzer;
pub use archive_extractor::{ArchiveExtractor, ExtractionSummary};
pub use manager::BundleManager;
pub use models::*;
pub use service_detector::ServiceDetector;
