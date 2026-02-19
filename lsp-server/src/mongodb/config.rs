//! MongoDB configuration loader
//!
//! Loads and parses mongodb_connection.yaml from project root

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    ParseError(#[from] serde_json::Error),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// MongoDB server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoServer {
    pub host: String,
    pub port: u16,
    #[serde(rename = "isIPv6")]
    pub is_ipv6: bool,
}

/// MongoDB credentials
#[derive(Debug, Clone)]
pub struct MongoCredentials {
    pub username: String,
    pub password: String,
}

/// Complete MongoDB configuration
#[derive(Debug, Clone)]
pub struct MongoConfig {
    pub database: String,
    pub servers: Vec<MongoServer>,
    pub rw_credentials: MongoCredentials,
    pub ro_credentials: MongoCredentials,
}

impl MongoConfig {
    /// Load configuration from mongodb_connection.yaml in project root
    pub fn load(config_path: &Path) -> Result<Self, ConfigError> {
        tracing::info!("Loading MongoDB config from: {:?}", config_path);

        let content = fs::read_to_string(config_path)?;
        let raw: serde_json::Value = serde_json::from_str(&content)?;

        let database = raw["database"]
            .as_str()
            .ok_or_else(|| ConfigError::InvalidConfig("Missing database field".to_string()))?
            .to_string();

        let servers: Vec<MongoServer> = serde_json::from_value(raw["mongoServers"].clone())?;

        let rw_credentials = MongoCredentials {
            username: raw["username"]
                .as_str()
                .ok_or_else(|| ConfigError::InvalidConfig("Missing username".to_string()))?
                .to_string(),
            password: raw["password"]
                .as_str()
                .ok_or_else(|| ConfigError::InvalidConfig("Missing password".to_string()))?
                .to_string(),
        };

        let ro_credentials = MongoCredentials {
            username: raw["ro_username"]
                .as_str()
                .ok_or_else(|| ConfigError::InvalidConfig("Missing ro_username".to_string()))?
                .to_string(),
            password: raw["ro_password"]
                .as_str()
                .ok_or_else(|| ConfigError::InvalidConfig("Missing ro_password".to_string()))?
                .to_string(),
        };

        Ok(Self {
            database,
            servers,
            rw_credentials,
            ro_credentials,
        })
    }

    /// Build MongoDB connection string for read-write operations
    pub fn connection_string_rw(&self) -> String {
        self.build_connection_string(&self.rw_credentials)
    }

    /// Build MongoDB connection string for read-only operations
    pub fn connection_string_ro(&self) -> String {
        self.build_connection_string(&self.ro_credentials)
    }

    fn build_connection_string(&self, credentials: &MongoCredentials) -> String {
        let hosts = self
            .servers
            .iter()
            .map(|s| format!("{}:{}", s.host, s.port))
            .collect::<Vec<_>>()
            .join(",");

        format!(
            "mongodb://{}:{}@{}/{}?replicaSet=rs0",
            credentials.username, credentials.password, hosts, self.database
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_string_format() {
        let config = MongoConfig {
            database: "test_db".to_string(),
            servers: vec![
                MongoServer {
                    host: "host1".to_string(),
                    port: 27017,
                    is_ipv6: false,
                },
                MongoServer {
                    host: "host2".to_string(),
                    port: 27017,
                    is_ipv6: false,
                },
            ],
            rw_credentials: MongoCredentials {
                username: "user".to_string(),
                password: "pass".to_string(),
            },
            ro_credentials: MongoCredentials {
                username: "ro_user".to_string(),
                password: "ro_pass".to_string(),
            },
        };

        let conn_str = config.connection_string_rw();
        assert!(conn_str.contains("mongodb://"));
        assert!(conn_str.contains("user:pass@"));
        assert!(conn_str.contains("host1:27017,host2:27017"));
        assert!(conn_str.contains("/test_db"));
    }
}
