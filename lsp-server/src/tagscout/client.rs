//! TagScout MongoDB Client
//!
//! Provides connectivity to the TagScout MongoDB database for fetching
//! curated log annotation patterns.

use mongodb::{
    bson::{doc, Document},
    options::ClientOptions,
    Client, Collection,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;
use tokio_stream::StreamExt;

/// TagScout client errors
#[derive(Error, Debug)]
pub enum TagScoutError {
    #[error("MongoDB connection error: {0}")]
    ConnectionError(#[from] mongodb::error::Error),

    #[error("Authentication failed: {0}")]
    AuthenticationError(String),

    #[error("Database not found: {0}")]
    DatabaseNotFound(String),

    #[error("Collection not found: {0}")]
    CollectionNotFound(String),

    #[error("Query error: {0}")]
    QueryError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Raw annotation document from TagScout MongoDB
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagScoutAnnotation {
    #[serde(rename = "_id")]
    pub id: bson::oid::ObjectId,

    /// Raw example log line
    #[serde(default)]
    pub raw_data: String,

    /// Regular expression patterns (array - may have multiple variations)
    pub regexes: Vec<String>,

    /// Severity level (Info, Warning, Error, etc.)
    #[serde(default = "default_severity")]
    pub severity: String,

    /// Category tags (array)
    #[serde(default)]
    pub category: Vec<String>,

    /// Display template with parameter placeholders
    #[serde(default)]
    pub template: String,

    /// Production-ready flag
    #[serde(default)]
    pub production: bool,

    /// Whether this is a content annotation
    #[serde(default)]
    pub content: bool,

    /// Documentation notes
    #[serde(default)]
    pub documentation: String,

    /// Internal notes
    #[serde(default)]
    pub internal_notes: String,

    /// Multiline pattern flag
    #[serde(default)]
    pub multiline: Option<bool>,

    /// Whether this is an external annotation
    #[serde(default)]
    pub external: bool,

    /// BORG integration flag
    #[serde(default)]
    pub borg: bool,

    /// Parameter extraction regexes
    #[serde(default)]
    pub parameters: Vec<TagScoutParameter>,
}

/// Parameter definition for field extraction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagScoutParameter {
    /// Parameter name (matches template placeholder)
    pub name: String,

    /// Regex pattern to extract this parameter
    pub regex: String,

    /// Enum type (usually "None")
    #[serde(default)]
    pub r#enum: String,
}

fn default_severity() -> String {
    "info".to_string()
}

/// TagScout client configuration
#[derive(Debug, Clone)]
pub struct TagScoutConfig {
    /// MongoDB connection string
    pub connection_string: String,

    /// Database name
    pub database: String,

    /// Collection name
    pub collection: String,

    /// Connection timeout in seconds
    pub connection_timeout: u64,

    /// Server selection timeout in seconds
    pub server_selection_timeout: u64,

    /// Enable connection pooling
    pub enable_pooling: bool,

    /// Maximum pool size
    pub max_pool_size: u32,

    /// Minimum pool size
    pub min_pool_size: u32,
}

impl Default for TagScoutConfig {
    fn default() -> Self {
        // Get MongoDB connection from environment or use BDB production default
        let connection_string = std::env::var("TAGSCOUT_MONGODB_URI")
            .unwrap_or_else(|_| "mongodb://TagScoutLibrary_ro:4d6e2f2a60b17c87c2574fa3c1d39a18093a04d4@bdb-int-prod-mongos-1.cisco.com:27017,bdb-int-prod-mongos-2.cisco.com:27017/task_TagScoutLibrary?tls=true".to_string());
        
        let database = std::env::var("TAGSCOUT_DATABASE")
            .unwrap_or_else(|_| "task_TagScoutLibrary".to_string());
        
        Self {
            connection_string,
            database,
            collection: "jabber_prt_annotations".to_string(),
            connection_timeout: 10,
            server_selection_timeout: 10,
            enable_pooling: true,
            max_pool_size: 10,
            min_pool_size: 1,
        }
    }
}

/// TagScout MongoDB client
pub struct TagScoutClient {
    client: Client,
    collection: Collection<TagScoutAnnotation>,
    config: TagScoutConfig,
}

impl TagScoutClient {
    /// Create a new TagScout client with default configuration
    pub async fn new() -> Result<Self, TagScoutError> {
        Self::with_config(TagScoutConfig::default()).await
    }

    /// Create a new TagScout client with custom configuration
    pub async fn with_config(config: TagScoutConfig) -> Result<Self, TagScoutError> {
        // Parse connection string
        let mut client_options = ClientOptions::parse(&config.connection_string).await?;

        // Configure timeouts
        client_options.connect_timeout = Some(Duration::from_secs(config.connection_timeout));
        client_options.server_selection_timeout =
            Some(Duration::from_secs(config.server_selection_timeout));

        // Configure connection pool
        if config.enable_pooling {
            client_options.max_pool_size = Some(config.max_pool_size);
            client_options.min_pool_size = Some(config.min_pool_size);
        }

        // Set application name for tracking
        client_options.app_name = Some("LogScout-LSP-Server".to_string());

        // Create client
        let client = Client::with_options(client_options)?;

        // Get database and collection
        let database = client.database(&config.database);
        let collection = database.collection::<TagScoutAnnotation>(&config.collection);

        Ok(Self {
            client,
            collection,
            config,
        })
    }

    /// Test the connection to MongoDB
    pub async fn test_connection(&self) -> Result<(), TagScoutError> {
        self.client
            .database("admin")
            .run_command(doc! { "ping": 1 }, None)
            .await
            .map_err(|e| TagScoutError::ConnectionError(e))?;

        tracing::info!("Successfully connected to TagScout MongoDB");
        Ok(())
    }

    /// Fetch all production annotations
    pub async fn fetch_all_annotations(&self) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        self.fetch_annotations_filtered(doc! { "production": true })
            .await
    }

    /// Fetch annotations with a custom filter
    pub async fn fetch_annotations_filtered(
        &self,
        filter: Document,
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        let mut cursor = self.collection.find(filter, None).await?;

        let mut annotations = Vec::new();
        while let Some(result) = cursor.next().await {
            match result {
                Ok(annotation) => annotations.push(annotation),
                Err(e) => {
                    tracing::warn!("Failed to deserialize annotation: {}", e);
                    continue;
                }
            }
        }

        tracing::info!("Fetched {} annotations from TagScout", annotations.len());
        Ok(annotations)
    }

    /// Fetch annotations by product
    pub async fn fetch_by_product(
        &self,
        product: &str,
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        self.fetch_annotations_filtered(doc! {
            "product": product,
            "active": true
        })
        .await
    }

    /// Fetch annotations by severity
    pub async fn fetch_by_severity(
        &self,
        severity: &str,
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        self.fetch_annotations_filtered(doc! {
            "severity": severity,
            "active": true
        })
        .await
    }

    /// Fetch annotations by category
    pub async fn fetch_by_category(
        &self,
        category: &str,
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        self.fetch_annotations_filtered(doc! {
            "category": category,
            "active": true
        })
        .await
    }

    /// Fetch annotations by multiple tags
    pub async fn fetch_by_tags(
        &self,
        tags: &[String],
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        self.fetch_annotations_filtered(doc! {
            "tags": { "$in": tags },
            "active": true
        })
        .await
    }

    /// Fetch recently updated annotations
    pub async fn fetch_recent_updates(
        &self,
        since: chrono::DateTime<chrono::Utc>,
    ) -> Result<Vec<TagScoutAnnotation>, TagScoutError> {
        let bson_date = bson::DateTime::from_millis(since.timestamp_millis());

        self.fetch_annotations_filtered(doc! {
            "lastUpdated": { "$gte": bson_date },
            "active": true
        })
        .await
    }

    /// Get count of annotations matching filter
    pub async fn count_annotations(&self, filter: Document) -> Result<u64, TagScoutError> {
        self.collection
            .count_documents(filter, None)
            .await
            .map_err(|e| TagScoutError::QueryError(e.to_string()))
    }

    /// Get list of unique products
    pub async fn get_products(&self) -> Result<Vec<String>, TagScoutError> {
        let distinct_results = self
            .collection
            .distinct("product", doc! { "active": true }, None)
            .await?;

        let products: Vec<String> = distinct_results
            .iter()
            .filter_map(|b| b.as_str().map(|s| s.to_string()))
            .collect();

        Ok(products)
    }

    /// Get list of unique categories
    pub async fn get_categories(&self) -> Result<Vec<String>, TagScoutError> {
        let distinct_results = self
            .collection
            .distinct("category", doc! { "active": true }, None)
            .await?;

        let categories: Vec<String> = distinct_results
            .iter()
            .filter_map(|b| b.as_str().map(|s| s.to_string()))
            .collect();

        Ok(categories)
    }

    /// Get statistics about the annotation library
    pub async fn get_statistics(&self) -> Result<LibraryStatistics, TagScoutError> {
        let total = self.count_annotations(doc! {}).await?;
        let active = self.count_annotations(doc! { "active": true }).await?;
        let products = self.get_products().await?;
        let categories = self.get_categories().await?;

        Ok(LibraryStatistics {
            total_annotations: total,
            active_annotations: active,
            unique_products: products.len(),
            unique_categories: categories.len(),
            products,
            categories,
        })
    }

    /// Close the client connection
    pub async fn close(&self) {
        // MongoDB Rust driver handles connection cleanup automatically
        tracing::info!("TagScout client closed");
    }
}

/// Library statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryStatistics {
    pub total_annotations: u64,
    pub active_annotations: u64,
    pub unique_products: usize,
    pub unique_categories: usize,
    pub products: Vec<String>,
    pub categories: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = TagScoutConfig::default();
        assert_eq!(config.database, "task_TagScoutLibrary");
        assert_eq!(config.collection, "annotations");
        assert_eq!(config.connection_timeout, 10);
    }

    #[tokio::test]
    #[ignore] // Only run when MongoDB is available
    async fn test_connection() {
        let client = TagScoutClient::new().await;
        match client {
            Ok(client) => {
                let result = client.test_connection().await;
                assert!(result.is_ok());
            }
            Err(e) => {
                eprintln!("Connection test skipped: {}", e);
            }
        }
    }

    #[tokio::test]
    #[ignore] // Only run when MongoDB is available
    async fn test_fetch_annotations() {
        let client = TagScoutClient::new().await;
        match client {
            Ok(client) => {
                let result = client.fetch_all_annotations().await;
                match result {
                    Ok(annotations) => {
                        println!("Fetched {} annotations", annotations.len());
                        assert!(!annotations.is_empty());
                    }
                    Err(e) => eprintln!("Fetch test skipped: {}", e),
                }
            }
            Err(e) => {
                eprintln!("Connection test skipped: {}", e);
            }
        }
    }
}
