//! LSP Server - Log Scout Analyzer
//!
//! This crate provides the Language Server Protocol implementation for the Log Scout Analyzer,
//! integrating pattern matching, bundle management, and log analysis features.

pub mod bundle;
pub mod config_manager;
pub mod lsp_handlers;
pub mod lsp_types;
pub mod mongodb;

// Re-export key types
pub use bundle::{
    Bundle, BundleAnalyzer, BundleError, BundleLog, BundleManager, LogType, ServiceDetector,
    ServiceType,
};
pub use config_manager::{ConfigManager, UserConfig};
pub use lsp_handlers::BundleHandler;
pub use mongodb::{MongoClient, MongoConfig};
