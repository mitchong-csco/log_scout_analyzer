//! MongoDB client wrapper
//!
//! Provides high-level MongoDB operations for bundle storage with RBAC support.

use crate::bundle::{Bundle, BundleError};
use crate::mongodb::{ConfigError, MongoConfig};
use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, FindOptions},
    Client, Collection,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// MongoDB client wrapper for bundle operations
pub struct MongoClient {
    client: Client,
    database_name: String,
}

impl MongoClient {
    /// Create a new MongoDB client
    ///
    /// # Arguments
    /// * `config` - MongoDB configuration
    ///
    /// # Example
    /// ```no_run
    /// use lsp_server::mongodb::{MongoClient, MongoConfig};
    /// use std::path::Path;
    ///
    /// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
    /// let config = MongoConfig::load(Path::new("mongodb_connection.yaml"))?;
    /// let client = MongoClient::new(&config).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn new(config: &MongoConfig) -> Result<Self, MongoError> {
        let connection_string = config.connection_string();

        tracing::debug!("Connecting to MongoDB cluster...");

        // Parse connection string
        let mut client_options = ClientOptions::parse(&connection_string)
            .await
            .map_err(|e| MongoError::ConnectionError(e.to_string()))?;

        // Set application name
        client_options.app_name = Some("log-scout-analyzer".to_string());

        // Set timeouts
        client_options.connect_timeout = Some(Duration::from_secs(10));
        client_options.server_selection_timeout = Some(Duration::from_secs(10));

        // Create client
        let client = Client::with_options(client_options)
            .map_err(|e| MongoError::ConnectionError(e.to_string()))?;

        // Verify connection
        client
            .database(&config.database)
            .run_command(doc! {"ping": 1}, None)
            .await
            .map_err(|e| MongoError::ConnectionError(format!("Ping failed: {}", e)))?;

        tracing::info!(
            "✅ Connected to MongoDB: {} (database: {})",
            config.server_addresses().join(", "),
            config.database
        );

        Ok(Self {
            client,
            database_name: config.database.clone(),
        })
    }

    /// Get bundles collection
    fn bundles_collection(&self) -> Collection<BundleDocument> {
        self.client
            .database(&self.database_name)
            .collection("bundles")
    }

    /// Create a new bundle in MongoDB
    ///
    /// # Arguments
    /// * `bundle` - Bundle to create
    pub async fn create_bundle(&self, bundle: &Bundle) -> Result<(), MongoError> {
        let doc = BundleDocument::from_bundle(bundle);

        self.bundles_collection()
            .insert_one(doc, None)
            .await
            .map_err(|e| MongoError::WriteError(e.to_string()))?;

        tracing::debug!("Created bundle in MongoDB: {}", bundle.id);

        Ok(())
    }

    /// Get a bundle by ID
    ///
    /// # Arguments
    /// * `bundle_id` - Bundle ID to retrieve
    pub async fn get_bundle(&self, bundle_id: &str) -> Result<Option<Bundle>, MongoError> {
        let filter = doc! {"_id": bundle_id};

        let result = self
            .bundles_collection()
            .find_one(filter, None)
            .await
            .map_err(|e| MongoError::ReadError(e.to_string()))?;

        Ok(result.map(|doc| doc.to_bundle()))
    }

    /// List all bundles (with optional filter)
    ///
    /// # Arguments
    /// * `name_filter` - Optional name substring filter
    pub async fn list_bundles(
        &self,
        name_filter: Option<&str>,
    ) -> Result<Vec<Bundle>, MongoError> {
        let filter = if let Some(name) = name_filter {
            doc! {"name": {"$regex": name, "$options": "i"}}
        } else {
            doc! {}
        };

        let options = FindOptions::builder()
            .sort(doc! {"created_at": -1}) // Newest first
            .build();

        let mut cursor = self
            .bundles_collection()
            .find(filter, options)
            .await
            .map_err(|e| MongoError::ReadError(e.to_string()))?;

        let mut bundles = Vec::new();
        use futures::stream::StreamExt;

        while let Some(result) = cursor.next().await {
            match result {
                Ok(doc) => bundles.push(doc.to_bundle()),
                Err(e) => {
                    tracing::warn!("Failed to read bundle from cursor: {}", e);
                }
            }
        }

        Ok(bundles)
    }

    /// Update a bundle
    ///
    /// # Arguments
    /// * `bundle` - Bundle with updated data
    pub async fn update_bundle(&self, bundle: &Bundle) -> Result<(), MongoError> {
        let filter = doc! {"_id": &bundle.id};
        let doc = BundleDocument::from_bundle(bundle);

        let update = doc! {
            "$set": mongodb::bson::to_document(&doc)
                .map_err(|e| MongoError::SerializationError(e.to_string()))?
        };

        self.bundles_collection()
            .update_one(filter, update, None)
            .await
            .map_err(|e| MongoError::WriteError(e.to_string()))?;

        tracing::debug!("Updated bundle in MongoDB: {}", bundle.id);

        Ok(())
    }

    /// Delete a bundle
    ///
    /// # Arguments
    /// * `bundle_id` - Bundle ID to delete
    pub async fn delete_bundle(&self, bundle_id: &str) -> Result<(), MongoError> {
        let filter = doc! {"_id": bundle_id};

        self.bundles_collection()
            .delete_one(filter, None)
            .await
            .map_err(|e| MongoError::WriteError(e.to_string()))?;

        tracing::info!("Deleted bundle from MongoDB: {}", bundle_id);

        Ok(())
    }

    /// Check if MongoDB is accessible
    pub async fn health_check(&self) -> Result<(), MongoError> {
        self.client
            .database(&self.database_name)
            .run_command(doc! {"ping": 1}, None)
            .await
            .map_err(|e| MongoError::ConnectionError(format!("Health check failed: {}", e)))?;

        Ok(())
    }
}

/// MongoDB document representation of a Bundle
#[derive(Debug, Serialize, Deserialize)]
struct BundleDocument {
    #[serde(rename = "_id")]
    id: String,
    name: String,
    description: Option<String>,
    logs: Vec<mongodb::bson::Document>,
    metadata: mongodb::bson::Document,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    analysis: Option<mongodb::bson::Document>,
}

impl BundleDocument {
    fn from_bundle(bundle: &Bundle) -> Self {
        Self {
            id: bundle.id.clone(),
            name: bundle.name.clone(),
            description: bundle.description.clone(),
            logs: bundle
                .logs
                .iter()
                .map(|log| mongodb::bson::to_document(log).unwrap_or_default())
                .collect(),
            metadata: mongodb::bson::to_document(&bundle.metadata).unwrap_or_default(),
            created_at: bundle.created_at,
            updated_at: bundle.updated_at,
            analysis: bundle
                .analysis
                .as_ref()
                .and_then(|a| mongodb::bson::to_document(a).ok()),
        }
    }

    fn to_bundle(self) -> Bundle {
        Bundle {
            id: self.id,
            name: self.name,
            description: self.description,
            logs: self
                .logs
                .iter()
                .filter_map(|doc| mongodb::bson::from_document(doc.clone()).ok())
                .collect(),
            metadata: mongodb::bson::from_document(self.metadata).unwrap_or_default(),
            created_at: self.created_at,
            updated_at: self.updated_at,
            analysis: self
                .analysis
                .and_then(|doc| mongodb::bson::from_document(doc).ok()),
        }
    }
}

/// MongoDB operation errors
#[derive(Debug, thiserror::Error)]
pub enum MongoError {
    #[error("MongoDB connection error: {0}")]
    ConnectionError(String),

    #[error("MongoDB read error: {0}")]
    ReadError(String),

    #[error("MongoDB write error: {0}")]
    WriteError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Configuration error: {0}")]
    ConfigError(#[from] ConfigError),
}

impl From<MongoError> for BundleError {
    fn from(err: MongoError) -> Self {
        BundleError::Invalid(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bundle_document_conversion() {
        let bundle = Bundle::new("test_id".to_string(), "Test Bundle".to_string());

        let doc = BundleDocument::from_bundle(&bundle);
        assert_eq!(doc.id, "test_id");
        assert_eq!(doc.name, "Test Bundle");

        let bundle2 = doc.to_bundle();
        assert_eq!(bundle2.id, bundle.id);
        assert_eq!(bundle2.name, bundle.name);
    }

    // Note: Integration tests with actual MongoDB would go in tests/ directory
}
