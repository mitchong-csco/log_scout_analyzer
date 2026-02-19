//! Bundle management - CRUD operations and storage
//!
//! Manages creation, loading, saving, and querying of bundles

use super::models::*;
use super::service_detector::ServiceDetector;
use chrono::Utc;
use serde_json;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
}

#[derive(Debug)]
pub enum BundleError {
    IoError(std::io::Error),
    SerializationError(serde_json::Error),
    BundleNotFound(String),
    InvalidBundle(String),
}

impl From<std::io::Error> for BundleError {
    fn from(err: std::io::Error) -> Self {
        BundleError::IoError(err)
    }
}

impl From<serde_json::Error> for BundleError {
    fn from(err: serde_json::Error) -> Self {
        BundleError::SerializationError(err)
    }
}

impl std::fmt::Display for BundleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BundleError::IoError(e) => write!(f, "IO error: {}", e),
            BundleError::SerializationError(e) => write!(f, "Serialization error: {}", e),
            BundleError::BundleNotFound(id) => write!(f, "Bundle not found: {}", id),
            BundleError::InvalidBundle(msg) => write!(f, "Invalid bundle: {}", msg),
        }
    }
}

impl BundleManager {
    /// Create a new bundle manager
    ///
    /// # Arguments
    /// * `workspace_root` - Root directory of the workspace
    pub fn new(workspace_root: &Path) -> Result<Self, BundleError> {
        let bundles_dir = workspace_root.join(".log-scout").join("bundles");

        // Create directory structure if it doesn't exist
        fs::create_dir_all(&bundles_dir)?;

        let index_path = bundles_dir.join("index.json");

        // Initialize index file if it doesn't exist
        if !index_path.exists() {
            let empty_index = serde_json::json!({
                "bundles": [],
                "last_updated": Utc::now().to_rfc3339()
            });
            fs::write(&index_path, serde_json::to_string_pretty(&empty_index)?)?;
        }

        tracing::info!("Bundle manager initialized at: {:?}", bundles_dir);

        Ok(Self {
            bundles_dir,
            index_path,
        })
    }

    /// Create a new bundle
    pub fn create_bundle(
        &self,
        name: String,
        description: Option<String>,
        metadata: Option<BundleMetadata>,
    ) -> Result<String, BundleError> {
        let id = format!(
            "bundle_{}",
            Uuid::new_v4()
                .to_string()
                .split('-')
                .next()
                .unwrap_or("unknown")
        );

        let mut bundle = Bundle::new(id.clone(), name);
        bundle.description = description;
        if let Some(meta) = metadata {
            bundle.metadata = meta;
        }

        // Create bundle directory
        let bundle_dir = self.bundles_dir.join(&id);
        fs::create_dir_all(&bundle_dir)?;
        fs::create_dir_all(bundle_dir.join("logs"))?;

        // Save bundle metadata
        self.save_bundle(&bundle)?;

        // Update index
        self.update_index(&bundle)?;

        tracing::info!("Created bundle: {}", id);
        Ok(id)
    }

    /// Add a log to a bundle
    pub fn add_log_to_bundle(
        &self,
        bundle_id: &str,
        log_uri: &str,
        service: Option<ServiceType>,
        log_type: Option<LogType>,
    ) -> Result<BundleLog, BundleError> {
        let mut bundle = self.load_bundle(bundle_id)?;

        // Try to read file to get stats
        let path = Path::new(log_uri);
        let metadata = fs::metadata(path)?;
        let size_bytes = metadata.len() as u64;

        // Read file to detect service if not provided
        let content = fs::read_to_string(path).ok();
        let detected_service = service.unwrap_or_else(|| {
            ServiceDetector::detect(
                path.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .as_ref(),
                content.as_deref(),
            )
        });

        let detected_log_type = log_type.unwrap_or_else(|| {
            if let Some(content) = &content {
                ServiceDetector::detect_log_type(content)
            } else {
                LogType::Debug
            }
        });

        let timestamp_format = if let Some(content) = &content {
            ServiceDetector::detect_timestamp_format(content)
        } else {
            None
        };

        // Count lines
        let line_count = if let Some(content) = &content {
            content.lines().count()
        } else {
            0
        };

        let bundle_log = BundleLog {
            uri: log_uri.to_string(),
            service: detected_service,
            log_type: detected_log_type,
            added_at: Utc::now(),
            size_bytes,
            line_count,
            timestamp_format,
        };

        bundle.add_log(bundle_log.clone());
        self.save_bundle(&bundle)?;
        self.update_index(&bundle)?;

        tracing::info!("Added log to bundle {}: {}", bundle_id, log_uri);
        Ok(bundle_log)
    }

    /// Get a bundle by ID
    pub fn get_bundle(&self, bundle_id: &str) -> Result<Bundle, BundleError> {
        self.load_bundle(bundle_id)
    }

    /// List all bundles (optionally filtered)
    pub fn list_bundles(
        &self,
        filter_case_id: Option<&str>,
        filter_tag: Option<&str>,
        filter_owner: Option<&str>,
    ) -> Result<Vec<BundleInfo>, BundleError> {
        let index_content = fs::read_to_string(&self.index_path)?;
        let index: serde_json::Value = serde_json::from_str(&index_content)?;

        let bundles = index["bundles"]
            .as_array()
            .ok_or(BundleError::InvalidBundle(
                "Invalid index structure".to_string(),
            ))?;

        let mut results = Vec::new();

        for bundle_entry in bundles {
            let id = bundle_entry["id"]
                .as_str()
                .ok_or(BundleError::InvalidBundle("Missing bundle id".to_string()))?;

            // Load full bundle to apply filters
            if let Ok(bundle) = self.load_bundle(id) {
                let mut include = true;

                if let Some(case_id) = filter_case_id {
                    if bundle
                        .metadata
                        .case_id
                        .as_ref()
                        .map_or(true, |c| c != case_id)
                    {
                        include = false;
                    }
                }

                if let Some(tag) = filter_tag {
                    if !bundle.metadata.tags.contains(&tag.to_string()) {
                        include = false;
                    }
                }

                if let Some(owner) = filter_owner {
                    if bundle.metadata.owner.as_ref().map_or(true, |o| o != owner) {
                        include = false;
                    }
                }

                if include {
                    results.push(bundle.to_info());
                }
            }
        }

        Ok(results)
    }

    /// Delete a bundle
    pub fn delete_bundle(&self, bundle_id: &str) -> Result<(), BundleError> {
        let bundle_dir = self.bundles_dir.join(bundle_id);

        if !bundle_dir.exists() {
            return Err(BundleError::BundleNotFound(bundle_id.to_string()));
        }

        fs::remove_dir_all(&bundle_dir)?;

        // Update index
        let index_content = fs::read_to_string(&self.index_path)?;
        let mut index: serde_json::Value = serde_json::from_str(&index_content)?;

        if let Some(bundles) = index["bundles"].as_array_mut() {
            bundles.retain(|b| b["id"].as_str() != Some(bundle_id));
        }

        index["last_updated"] = serde_json::Value::String(Utc::now().to_rfc3339());
        fs::write(&self.index_path, serde_json::to_string_pretty(&index)?)?;

        tracing::info!("Deleted bundle: {}", bundle_id);
        Ok(())
    }

    // --- Private helper methods ---

    fn load_bundle(&self, bundle_id: &str) -> Result<Bundle, BundleError> {
        let bundle_path = self.bundles_dir.join(bundle_id).join("bundle.json");

        if !bundle_path.exists() {
            return Err(BundleError::BundleNotFound(bundle_id.to_string()));
        }

        let content = fs::read_to_string(&bundle_path)?;
        let bundle: Bundle = serde_json::from_str(&content)?;

        Ok(bundle)
    }

    fn save_bundle(&self, bundle: &Bundle) -> Result<(), BundleError> {
        let bundle_path = self.bundles_dir.join(&bundle.id).join("bundle.json");
        let content = serde_json::to_string_pretty(bundle)?;
        fs::write(&bundle_path, content)?;

        Ok(())
    }

    fn update_index(&self, bundle: &Bundle) -> Result<(), BundleError> {
        let index_content = fs::read_to_string(&self.index_path)?;
        let mut index: serde_json::Value = serde_json::from_str(&index_content)?;

        // Remove old entry if exists
        if let Some(bundles) = index["bundles"].as_array_mut() {
            bundles.retain(|b| b["id"].as_str() != Some(&bundle.id));
        }

        // Add new entry
        let entry = serde_json::to_value(bundle.to_info())?;
        index["bundles"]
            .as_array_mut()
            .ok_or(BundleError::InvalidBundle(
                "Invalid index structure".to_string(),
            ))?
            .push(entry);

        index["last_updated"] = serde_json::Value::String(Utc::now().to_rfc3339());

        fs::write(&self.index_path, serde_json::to_string_pretty(&index)?)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_bundle_creation() {
        let temp_dir = TempDir::new().unwrap();
        let manager = BundleManager::new(temp_dir.path()).unwrap();

        let bundle_id = manager
            .create_bundle("Test Bundle".to_string(), None, None)
            .unwrap();

        assert!(bundle_id.starts_with("bundle_"));

        let bundle = manager.get_bundle(&bundle_id).unwrap();
        assert_eq!(bundle.name, "Test Bundle");
        assert!(bundle.logs.is_empty());
    }

    #[test]
    fn test_list_bundles() {
        let temp_dir = TempDir::new().unwrap();
        let manager = BundleManager::new(temp_dir.path()).unwrap();

        let _id1 = manager
            .create_bundle("Bundle 1".to_string(), None, None)
            .unwrap();
        let _id2 = manager
            .create_bundle("Bundle 2".to_string(), None, None)
            .unwrap();

        let bundles = manager.list_bundles(None, None, None).unwrap();
        assert_eq!(bundles.len(), 2);
    }
}
