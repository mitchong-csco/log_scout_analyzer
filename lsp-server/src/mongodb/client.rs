//! MongoDB client wrapper for bundle operations
//!
//! Provides async CRUD operations on bundles with connection pooling

use super::config::MongoConfig;
use crate::bundle::models::{Bundle, BundleInfo};
use mongodb::{Client, Database, Collection};
use mongodb::options::ClientOptions;
use bson::doc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MongoError {
    #[error("MongoDB error: {0}")]
    MongoDbError(#[from] mongodb::error::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] bson::ser::Error),

    #[error("Deserialization error: {0}")]
    DeserializationError(#[from] bson::de::Error),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Bundle not found: {0}")]
    BundleNotFound(String),
}

pub struct MongoClient {
    db: Database,
}

impl MongoClient {
    /// Create new MongoDB client with connection pooling
    pub async fn new(config: &MongoConfig) -> Result<Self, MongoError> {
        let conn_str = config.connection_string_rw();

        tracing::info!("Connecting to MongoDB cluster...");

        let mut client_options = ClientOptions::parse(&conn_str)
            .await
            .map_err(|e| MongoError::ConnectionFailed(e.to_string()))?;

        // Configure connection pool
        client_options.max_pool_size = Some(50);
        client_options.min_pool_size = Some(10);

        let client = Client::with_options(client_options)
            .map_err(|e| MongoError::ConnectionFailed(e.to_string()))?;

        let db = client.database(&config.database);

        // Test connection
        db.list_collection_names(None).await?;

        tracing::info!("MongoDB connection established successfully");

        Ok(Self { db })
    }

    /// Get bundles collection
    fn bundles_collection(&self) -> Collection<Bundle> {
        self.db.collection::<Bundle>("bundles")
    }

    /// Create a bundle in MongoDB
    pub async fn create_bundle(&self, bundle: &Bundle) -> Result<(), MongoError> {
        let collection = self.bundles_collection();
        collection.insert_one(bundle, None).await?;

        tracing::info!("Created bundle in MongoDB: {}", bundle.id);
        Ok(())
    }

    /// Get bundle by ID
    pub async fn get_bundle(&self, id: &str) -> Result<Bundle, MongoError> {
        let collection = self.bundles_collection();

        let bundle = collection
            .find_one(doc! { "id": id }, None)
            .await?
            .ok_or_else(|| MongoError::BundleNotFound(id.to_string()))?;

        tracing::debug!("Retrieved bundle from MongoDB: {}", id);
        Ok(bundle)
    }

    /// Update bundle
    pub async fn update_bundle(&self, bundle: &Bundle) -> Result<(), MongoError> {
        let collection = self.bundles_collection();

        collection
            .replace_one(doc! { "id": &bundle.id }, bundle, None)
            .await?;

        tracing::info!("Updated bundle in MongoDB: {}", bundle.id);
        Ok(())
    }

    /// List bundles with optional filters
    pub async fn list_bundles(
        &self,
        filter_case_id: Option<&str>,
        filter_tag: Option<&str>,
        filter_owner: Option<&str>,
    ) -> Result<Vec<BundleInfo>, MongoError> {
        let collection = self.bundles_collection();

        let mut filter = doc! {};

        if let Some(case_id) = filter_case_id {
            filter.insert("metadata.case_id", case_id);
        }

        if let Some(tag) = filter_tag {
            filter.insert("metadata.tags", tag);
        }

        if let Some(owner) = filter_owner {
            filter.insert("metadata.owner", owner);
        }

        let mut cursor = collection.find(filter, None).await?;

        let mut bundles = Vec::new();
        use futures::stream::StreamExt;
        while let Some(result) = cursor.next().await {
            let bundle = result?;
            bundles.push(bundle.to_info());
        }

        tracing::debug!("Listed {} bundles from MongoDB", bundles.len());
        Ok(bundles)
    }

    /// Delete bundle
    pub async fn delete_bundle(&self, id: &str) -> Result<(), MongoError> {
        let collection = self.bundles_collection();

        collection.delete_one(doc! { "id": id }, None).await?;

        tracing::info!("Deleted bundle from MongoDB: {}", id);
        Ok(())
    }

    /// Health check - verify MongoDB connection is alive
    pub async fn health_check(&self) -> Result<bool, MongoError> {
        self.db.list_collection_names(None).await?;
        Ok(true)
    }
}
