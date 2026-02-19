//! Log bundling system for multi-service investigation analysis
//!
//! Provides functionality to group logs from multiple services (Jabber, CUCM, CUP, etc.)
//! into logical bundles for investigation and analysis.

pub mod models;
pub mod manager;
pub mod analyzer;
pub mod service_detector;

pub use manager::BundleManager;
pub use models::*;
pub use analyzer::BundleAnalyzer;
pub use service_detector::ServiceDetector;
