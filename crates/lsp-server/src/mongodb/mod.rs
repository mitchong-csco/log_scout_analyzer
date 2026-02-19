//! MongoDB integration module
//!
//! Provides MongoDB connectivity for bundle storage and team collaboration.
//!
//! **Features**:
//! - YAML-based configuration
//! - Replica set support
//! - Automatic connection pooling
//! - RBAC (Role-Based Access Control) ready
//!
//! **Usage**:
//! ```no_run
//! use lsp_server::mongodb::{MongoConfig, MongoClient};
//! use std::path::Path;
//!
//! # async fn example() -> Result<(), Box<dyn std::error::Error>> {
//! // Load configuration
//! let config = MongoConfig::load(Path::new("mongodb_connection.yaml"))?;
//!
//! // Create client
//! let client = MongoClient::new(&config).await?;
//!
//! // Use client for bundle operations
//! // (integrated with BundleManager in hybrid mode)
//! # Ok(())
//! # }
//! ```

pub mod client;
pub mod config;
pub mod rbac;

pub use client::{MongoClient, MongoError};
pub use config::{ConfigError, MongoConfig, MongoCredentials, MongoServer};
pub use rbac::{Action, BundleACL, Role, User};
