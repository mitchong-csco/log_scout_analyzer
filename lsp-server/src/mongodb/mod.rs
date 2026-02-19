//! MongoDB Integration Module
//!
//! Provides MongoDB client, configuration, and RBAC for bundle persistence

pub mod config;
pub mod client;
pub mod rbac;

pub use config::{MongoConfig, MongoCredentials, MongoServer, ConfigError};
pub use client::{MongoClient, MongoError};
pub use rbac::{Role, Permission, TeamMember, RbacManager};

use thiserror::Error;

/// MongoDB integration errors
#[derive(Error, Debug)]
pub enum IntegrationError {
    #[error("MongoDB client error: {0}")]
    ClientError(#[from] MongoError),

    #[error("Configuration error: {0}")]
    ConfigError(#[from] ConfigError),

    #[error("RBAC error: {0}")]
    RbacError(String),

    #[error("Connection error: {0}")]
    ConnectionError(String),
}
