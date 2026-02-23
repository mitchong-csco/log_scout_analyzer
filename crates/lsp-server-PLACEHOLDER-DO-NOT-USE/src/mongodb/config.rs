//! MongoDB configuration module
//!
//! Loads MongoDB connection settings from YAML configuration file.
//! Supports the cluster configuration with authentication and replica sets.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use thiserror::Error;

/// MongoDB configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoConfig {
    /// List of MongoDB servers
    pub servers: Vec<MongoServer>,

    /// Database name
    pub database: String,

    /// Authentication credentials
    pub credentials: MongoCredentials,

    /// Replica set name (optional)
    #[serde(rename = "replicaSet")]
    pub replica_set: Option<String>,

    /// Authentication source database
    #[serde(rename = "authSource", default = "default_auth_source")]
    pub auth_source: String,

    /// Enable SSL/TLS
    #[serde(default)]
    pub ssl: bool,
}

fn default_auth_source() -> String {
    "admin".to_string()
}

/// MongoDB server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoServer {
    /// Host address
    pub host: String,

    /// Port number
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_port() -> u16 {
    27017
}

/// MongoDB authentication credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MongoCredentials {
    /// Username
    pub username: String,

    /// Password
    pub password: String,
}

impl MongoConfig {
    /// Load configuration from YAML file
    ///
    /// # Arguments
    /// * `path` - Path to the YAML configuration file
    ///
    /// # Example
    /// ```no_run
    /// use lsp_server::mongodb::MongoConfig;
    /// use std::path::Path;
    ///
    /// let config = MongoConfig::load(Path::new("mongodb_connection.yaml")).unwrap();
    /// ```
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        if !path.exists() {
            return Err(ConfigError::FileNotFound(path.display().to_string()));
        }

        let content =
            fs::read_to_string(path).map_err(|e| ConfigError::ReadError(e.to_string()))?;

        let config: MongoConfig =
            serde_yaml::from_str(&content).map_err(|e| ConfigError::ParseError(e.to_string()))?;

        config.validate()?;

        tracing::info!("MongoDB configuration loaded from: {:?}", path);
        tracing::debug!(
            "Database: {}, Servers: {}",
            config.database,
            config.servers.len()
        );

        Ok(config)
    }

    /// Validate the configuration
    fn validate(&self) -> Result<(), ConfigError> {
        if self.servers.is_empty() {
            return Err(ConfigError::ValidationError(
                "At least one server must be specified".to_string(),
            ));
        }

        if self.database.is_empty() {
            return Err(ConfigError::ValidationError(
                "Database name cannot be empty".to_string(),
            ));
        }

        if self.credentials.username.is_empty() {
            return Err(ConfigError::ValidationError(
                "Username cannot be empty".to_string(),
            ));
        }

        if self.credentials.password.is_empty() {
            return Err(ConfigError::ValidationError(
                "Password cannot be empty".to_string(),
            ));
        }

        Ok(())
    }

    /// Generate MongoDB connection string
    ///
    /// Returns a connection string in the format:
    /// `mongodb://username:password@host1:port1,host2:port2/database?options`
    pub fn connection_string(&self) -> String {
        let servers = self
            .servers
            .iter()
            .map(|s| format!("{}:{}", s.host, s.port))
            .collect::<Vec<_>>()
            .join(",");

        let mut uri = format!(
            "mongodb://{}:{}@{}/{}",
            urlencoding::encode(&self.credentials.username),
            urlencoding::encode(&self.credentials.password),
            servers,
            self.database
        );

        // Add query parameters
        let mut params = vec![];

        if let Some(ref rs) = self.replica_set {
            params.push(format!("replicaSet={}", rs));
        }

        if !self.auth_source.is_empty() && self.auth_source != "admin" {
            params.push(format!("authSource={}", self.auth_source));
        }

        if self.ssl {
            params.push("ssl=true".to_string());
        }

        if !params.is_empty() {
            uri.push('?');
            uri.push_str(&params.join("&"));
        }

        uri
    }

    /// Get server addresses as a vector
    pub fn server_addresses(&self) -> Vec<String> {
        self.servers
            .iter()
            .map(|s| format!("{}:{}", s.host, s.port))
            .collect()
    }
}

/// Configuration errors
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Configuration file not found: {0}")]
    FileNotFound(String),

    #[error("Failed to read configuration file: {0}")]
    ReadError(String),

    #[error("Failed to parse YAML configuration: {0}")]
    ParseError(String),

    #[error("Configuration validation failed: {0}")]
    ValidationError(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_test_config() -> String {
        r#"
servers:
  - host: 10.118.12.173
    port: 27017
  - host: 10.118.10.197
    port: 27017
  - host: 10.118.11.131
    port: 27017

database: task_log_scout_analyzer

credentials:
  username: log_scout_analyzer
  password: test_password

replicaSet: rs0
authSource: admin
ssl: true
"#
        .to_string()
    }

    #[test]
    fn test_load_valid_config() {
        let mut temp_file = NamedTempFile::new().unwrap();
        write!(temp_file, "{}", create_test_config()).unwrap();

        let config = MongoConfig::load(temp_file.path()).unwrap();

        assert_eq!(config.servers.len(), 3);
        assert_eq!(config.database, "task_log_scout_analyzer");
        assert_eq!(config.credentials.username, "log_scout_analyzer");
        assert_eq!(config.replica_set, Some("rs0".to_string()));
        assert!(config.ssl);
    }

    #[test]
    fn test_load_nonexistent_file() {
        let result = MongoConfig::load(Path::new("nonexistent.yaml"));
        assert!(matches!(result, Err(ConfigError::FileNotFound(_))));
    }

    #[test]
    fn test_connection_string() {
        let config = MongoConfig {
            servers: vec![
                MongoServer {
                    host: "host1".to_string(),
                    port: 27017,
                },
                MongoServer {
                    host: "host2".to_string(),
                    port: 27018,
                },
            ],
            database: "testdb".to_string(),
            credentials: MongoCredentials {
                username: "user".to_string(),
                password: "pass".to_string(),
            },
            replica_set: Some("rs0".to_string()),
            auth_source: "admin".to_string(),
            ssl: true,
        };

        let conn_str = config.connection_string();
        assert!(conn_str.contains("mongodb://"));
        assert!(conn_str.contains("user:pass@"));
        assert!(conn_str.contains("host1:27017,host2:27018"));
        assert!(conn_str.contains("/testdb"));
        assert!(conn_str.contains("replicaSet=rs0"));
        assert!(conn_str.contains("ssl=true"));
    }

    #[test]
    fn test_validation_empty_servers() {
        let config = MongoConfig {
            servers: vec![],
            database: "db".to_string(),
            credentials: MongoCredentials {
                username: "user".to_string(),
                password: "pass".to_string(),
            },
            replica_set: None,
            auth_source: "admin".to_string(),
            ssl: false,
        };

        assert!(config.validate().is_err());
    }

    #[test]
    fn test_validation_empty_database() {
        let config = MongoConfig {
            servers: vec![MongoServer {
                host: "localhost".to_string(),
                port: 27017,
            }],
            database: "".to_string(),
            credentials: MongoCredentials {
                username: "user".to_string(),
                password: "pass".to_string(),
            },
            replica_set: None,
            auth_source: "admin".to_string(),
            ssl: false,
        };

        assert!(config.validate().is_err());
    }

    #[test]
    fn test_server_addresses() {
        let config = MongoConfig {
            servers: vec![
                MongoServer {
                    host: "host1".to_string(),
                    port: 27017,
                },
                MongoServer {
                    host: "host2".to_string(),
                    port: 27018,
                },
            ],
            database: "db".to_string(),
            credentials: MongoCredentials {
                username: "user".to_string(),
                password: "pass".to_string(),
            },
            replica_set: None,
            auth_source: "admin".to_string(),
            ssl: false,
        };

        let addresses = config.server_addresses();
        assert_eq!(addresses.len(), 2);
        assert_eq!(addresses[0], "host1:27017");
        assert_eq!(addresses[1], "host2:27018");
    }

    #[test]
    fn test_default_values() {
        let yaml = r#"
servers:
  - host: localhost
database: testdb
credentials:
  username: user
  password: pass
"#;

        let config: MongoConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(config.servers[0].port, 27017); // default port
        assert_eq!(config.auth_source, "admin"); // default auth source
        assert!(!config.ssl); // default ssl
    }
}
