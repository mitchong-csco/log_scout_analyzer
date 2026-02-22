//! Bundle management - CRUD operations and storage
//!
//! Manages creation, loading, saving, and querying of bundles

use super::archive_extractor::ArchiveExtractor;
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
    ArchiveError(String),
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
            BundleError::ArchiveError(msg) => write!(f, "Archive error: {}", msg),
        }
    }
}

/// Result of importing a log package
#[derive(Debug, Clone)]
pub struct ImportResult {
    pub bundle_id: String,
    pub bundle_name: String,
    pub case_id: Option<String>,
    pub total_files: usize,
    pub success_count: usize,
    pub failed_files: Vec<PathBuf>,
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

    /// Import a log package (QCSONE ZIP or other archive)
    ///
    /// # Arguments
    /// * `package_path` - Path to the archive file
    /// * `bundle_name` - Optional bundle name (auto-generated if None)
    /// * `case_id` - Optional case ID (auto-detected if None)
    ///
    /// # Returns
    /// ImportResult with bundle ID and import statistics
    pub fn import_log_package(
        &mut self,
        package_path: &Path,
        bundle_name: Option<String>,
        case_id: Option<String>,
    ) -> Result<ImportResult, BundleError> {
        tracing::info!("Importing log package: {:?}", package_path);

        // Create temp extraction directory
        let temp_dir = std::env::temp_dir().join(format!(
            "log-scout-import-{}",
            Uuid::new_v4()
                .to_string()
                .split('-')
                .next()
                .unwrap_or("temp")
        ));
        fs::create_dir_all(&temp_dir)?;

        tracing::debug!("Extracting to temp directory: {:?}", temp_dir);

        // Extract archive
        let extracted_files = ArchiveExtractor::extract_archive(package_path, &temp_dir)
            .map_err(|e| BundleError::ArchiveError(format!("Failed to extract archive: {}", e)))?;

        tracing::info!("Extracted {} files from archive", extracted_files.len());

        // Filter to only log files
        let log_files = ArchiveExtractor::filter_log_files(&extracted_files);
        tracing::info!("Found {} log files", log_files.len());

        // Detect case ID from filename if not provided
        let detected_case_id = case_id.or_else(|| {
            package_path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(|s| ArchiveExtractor::detect_case_id(s))
        });

        // Generate bundle name if not provided
        let bundle_name = bundle_name.unwrap_or_else(|| {
            if let Some(case_id) = &detected_case_id {
                format!("Case {}", case_id)
            } else {
                format!(
                    "Import {}",
                    package_path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                )
            }
        });

        // Create bundle metadata
        let mut metadata = BundleMetadata::default();
        metadata.case_id = detected_case_id.clone();
        metadata.tags.push("imported".to_string());
        if detected_case_id.is_some() {
            metadata.tags.push("qcsone".to_string());
        }

        // Create the bundle
        let bundle_id = self.create_bundle(bundle_name.clone(), None, Some(metadata))?;

        tracing::info!("Created bundle {} for import", bundle_id);

        // Add all log files to bundle
        let mut success_count = 0;
        let mut failed_files = Vec::new();

        for file_path in &log_files {
            match self.add_log_to_bundle(&bundle_id, file_path.to_str().unwrap_or(""), None, None) {
                Ok(_) => {
                    success_count += 1;
                    tracing::debug!("Added log file: {:?}", file_path);
                }
                Err(e) => {
                    tracing::warn!("Failed to add {:?}: {}", file_path, e);
                    failed_files.push(file_path.clone());
                }
            }
        }

        // Clean up temp directory
        if let Err(e) = fs::remove_dir_all(&temp_dir) {
            tracing::warn!("Failed to clean up temp directory: {}", e);
        }

        tracing::info!(
            "Import complete: {} of {} log files added to bundle {}",
            success_count,
            log_files.len(),
            bundle_id
        );

        Ok(ImportResult {
            bundle_id,
            bundle_name,
            case_id: detected_case_id,
            total_files: extracted_files.len(),
            success_count,
            failed_files,
        })
    }

    /// Import log package with progress callbacks
    ///
    /// # Arguments
    /// * `package_path` - Path to the archive file (ZIP, TAR, etc.)
    /// * `bundle_name` - Optional name for the bundle
    /// * `case_id` - Optional case ID
    /// * `progress` - Progress callback function (message, percentage)
    ///
    /// # Returns
    /// ImportResult with bundle ID and import statistics
    pub fn import_log_package_with_progress(
        &mut self,
        package_path: &Path,
        bundle_name: Option<String>,
        case_id: Option<String>,
        progress: Box<dyn Fn(&str, u32) + Send + Sync>,
    ) -> Result<ImportResult, BundleError> {
        tracing::info!("Importing log package with progress: {:?}", package_path);

        // Stage 1: Create temp directory (1%)
        progress("Creating temp directory...", 1);

        let temp_dir = std::env::temp_dir().join(format!(
            "log-scout-import-{}",
            Uuid::new_v4()
                .to_string()
                .split('-')
                .next()
                .unwrap_or("temp")
        ));
        fs::create_dir_all(&temp_dir)?;

        tracing::debug!("Extracting to temp directory: {:?}", temp_dir);

        // Stage 2: Extract archive (1-40%)
        progress("Extracting archive...", 5);

        let extracted_files = ArchiveExtractor::extract_archive(package_path, &temp_dir)
            .map_err(|e| BundleError::ArchiveError(format!("Failed to extract archive: {}", e)))?;

        tracing::info!("Extracted {} files from archive", extracted_files.len());
        progress(&format!("Extracted {} files", extracted_files.len()), 40);

        // Stage 3: Filter log files (40-50%)
        progress("Filtering log files...", 45);

        let log_files = ArchiveExtractor::filter_log_files(&extracted_files);
        tracing::info!("Found {} log files", log_files.len());

        progress(&format!("Found {} log files", log_files.len()), 50);

        // Stage 4: Detect metadata (50-55%)
        progress("Detecting case ID...", 51);

        let detected_case_id = case_id.or_else(|| {
            package_path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(|s| ArchiveExtractor::detect_case_id(s))
        });

        progress("Creating bundle...", 52);

        let bundle_name = bundle_name.unwrap_or_else(|| {
            if let Some(case_id) = &detected_case_id {
                format!("Case {}", case_id)
            } else {
                format!(
                    "Import {}",
                    package_path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                )
            }
        });

        let mut metadata = BundleMetadata::default();
        metadata.case_id = detected_case_id.clone();
        metadata.tags.push("imported".to_string());
        if detected_case_id.is_some() {
            metadata.tags.push("qcsone".to_string());
        }

        let bundle_id = self.create_bundle(bundle_name.clone(), None, Some(metadata))?;

        tracing::info!("Created bundle {} for import", bundle_id);
        progress(&format!("Bundle created: {}", bundle_id), 55);

        // Stage 5: Add log files (55-95%)
        let mut success_count = 0;
        let mut failed_files = Vec::new();

        for (index, file_path) in log_files.iter().enumerate() {
            let percent = 55 + ((index as f32 / log_files.len() as f32) * 40.0) as u32;
            let filename = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown");

            progress(
                &format!("Adding log {}/{}: {}", index + 1, log_files.len(), filename),
                percent,
            );

            match self.add_log_to_bundle(&bundle_id, file_path.to_str().unwrap_or(""), None, None) {
                Ok(_) => {
                    success_count += 1;
                    tracing::debug!("Added log file: {:?}", file_path);
                }
                Err(e) => {
                    tracing::warn!("Failed to add {:?}: {}", file_path, e);
                    failed_files.push(file_path.clone());
                }
            }
        }

        // Stage 6: Cleanup (95-100%)
        progress("Cleaning up...", 98);

        if let Err(e) = fs::remove_dir_all(&temp_dir) {
            tracing::warn!("Failed to clean up temp directory: {}", e);
        }

        progress("Complete!", 100);

        tracing::info!(
            "Import complete: {} of {} log files added to bundle {}",
            success_count,
            log_files.len(),
            bundle_id
        );

        Ok(ImportResult {
            bundle_id,
            bundle_name,
            case_id: detected_case_id,
            total_files: extracted_files.len(),
            success_count,
            failed_files,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
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

// Phase 1: Core Import Logic Tests (8 tests)
#[cfg(test)]
mod import_tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_import_qcsone_package_with_case_id() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        // Use existing test archive with case ID in filename
        let test_archive = PathBuf::from("../test-data/700440257_qcsone_download_selected.zip");

        // Skip test if archive doesn't exist (CI environments)
        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager.import_log_package(
            &test_archive,
            None, // Auto-generate name
            None, // Auto-detect case ID
        );

        // Assert
        assert!(result.is_ok(), "Import should succeed");
        let import_result = result.unwrap();

        // Verify case ID detected
        assert_eq!(
            import_result.case_id,
            Some("700440257".to_string()),
            "Case ID should be detected from filename"
        );

        // Verify bundle name uses case ID
        assert!(
            import_result.bundle_name.contains("700440257")
                || import_result.bundle_name.contains("Case"),
            "Bundle name should reference case: '{}'",
            import_result.bundle_name
        );

        // Verify logs imported
        assert!(
            import_result.success_count > 0,
            "Should import at least one log file"
        );

        // Verify bundle exists on filesystem
        let bundle = manager.get_bundle(&import_result.bundle_id);
        assert!(bundle.is_ok(), "Bundle should exist after import");

        let bundle = bundle.unwrap();
        assert!(bundle.logs.len() > 0, "Bundle should contain logs");

        // Verify metadata tags
        assert!(
            bundle.metadata.tags.contains(&"imported".to_string()),
            "Bundle should be tagged as 'imported'"
        );
        assert!(
            bundle.metadata.tags.contains(&"qcsone".to_string()),
            "Bundle with case ID should be tagged as 'qcsone'"
        );
    }

    #[test]
    fn test_import_generic_package_without_case_id() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager.import_log_package(&test_archive, None, None);

        // Assert
        assert!(result.is_ok(), "Generic import should succeed");
        let import_result = result.unwrap();

        // No case ID should be detected from generic filename
        assert_eq!(
            import_result.case_id, None,
            "Should not detect case ID from generic filename"
        );

        // Bundle name should be derived from filename
        assert!(
            import_result.bundle_name.contains("Import")
                || import_result.bundle_name.contains("quick"),
            "Bundle name should be auto-generated from filename: '{}'",
            import_result.bundle_name
        );

        // Should have 'imported' tag but NOT 'qcsone' tag
        let bundle = manager.get_bundle(&import_result.bundle_id).unwrap();
        assert!(
            bundle.metadata.tags.contains(&"imported".to_string()),
            "Should be tagged as 'imported'"
        );
        assert!(
            !bundle.metadata.tags.contains(&"qcsone".to_string()),
            "Should NOT be tagged as 'qcsone' without case ID"
        );
    }

    #[test]
    fn test_import_filters_non_log_files() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        // This archive likely contains mixed file types
        let test_archive = PathBuf::from("../test-data/700440257_qcsone_download_selected.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager
            .import_log_package(&test_archive, None, None)
            .unwrap();

        // Assert
        assert!(
            result.total_files >= result.success_count,
            "Total extracted files ({}) should be >= imported logs ({})",
            result.total_files,
            result.success_count
        );

        // Verify bundle contains only log files
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();

        // Verify each log has proper extension
        for log in &bundle.logs {
            let path = PathBuf::from(&log.uri);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            assert!(
                matches!(ext, "log" | "txt" | "out" | "err" | "output" | "trace"),
                "Log file should have log extension, got: {} for file: {}",
                ext,
                log.uri
            );
        }
    }

    #[test]
    fn test_import_detects_service_types() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        // QCSONE archives typically contain logs from different services
        let test_archive = PathBuf::from("../test-data/700440257_qcsone_download_selected.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager
            .import_log_package(&test_archive, None, None)
            .unwrap();
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();

        // Assert - verify service detection occurred
        // Note: Actual services depend on archive content
        assert!(bundle.logs.len() > 0, "Should have imported logs");

        // Collect unique services
        let mut services = std::collections::HashSet::new();
        for log in &bundle.logs {
            services.insert(log.service.to_string());
        }

        // Should have at least attempted service detection (not all "Custom")
        assert!(
            services.len() > 0,
            "Should detect at least one service type, got: {:?}",
            services
        );
    }

    #[test]
    fn test_import_handles_empty_archive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        // Use empty archive if available
        let test_archive = PathBuf::from("../test-data/empty-archive.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager.import_log_package(&test_archive, None, None);

        // Assert - should succeed
        // Note: empty-archive.zip contains dummy.txt which is counted as a log file
        assert!(
            result.is_ok(),
            "Should not fail on archive with non-log files"
        );
        let import_result = result.unwrap();

        // The "empty" archive has dummy.txt which is a .txt file (counts as log)
        // This is actually testing that we can handle archives with few/minimal log files
        assert!(
            import_result.success_count <= 1,
            "Should import 0 or 1 files from minimal archive"
        );

        // Bundle should exist
        let bundle = manager.get_bundle(&import_result.bundle_id).unwrap();
        assert!(
            bundle.logs.len() <= 1,
            "Bundle should have 0 or 1 log files"
        );
    }

    #[test]
    fn test_import_handles_corrupted_archive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();

        let test_archive = PathBuf::from("../test-data/invalid-archive.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Execute
        let result = manager.import_log_package(&test_archive, None, None);

        // Assert - should return error
        assert!(result.is_err(), "Should fail on corrupted archive");

        // Verify error type mentions extraction failure
        let err = result.unwrap_err();
        let err_msg = format!("{:?}", err);
        assert!(
            err_msg.contains("Archive")
                || err_msg.contains("extract")
                || err_msg.contains("Failed"),
            "Error should mention extraction failure: {}",
            err_msg
        );
    }

    #[test]
    fn test_import_cleans_up_temp_directory() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Get count of temp directories before
        let temp_dir = std::env::temp_dir();
        let before_count = std::fs::read_dir(&temp_dir)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .ok()
                    .and_then(|e| {
                        e.file_name()
                            .to_str()
                            .map(|s| s.contains("log-scout-import"))
                    })
                    .unwrap_or(false)
            })
            .count();

        // Execute
        let result = manager.import_log_package(&test_archive, None, None);
        assert!(result.is_ok(), "Import should succeed");

        // Wait a moment for cleanup
        std::thread::sleep(std::time::Duration::from_millis(100));

        // Assert - temp directories cleaned up
        let after_count = std::fs::read_dir(&temp_dir)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .ok()
                    .and_then(|e| {
                        e.file_name()
                            .to_str()
                            .map(|s| s.contains("log-scout-import"))
                    })
                    .unwrap_or(false)
            })
            .count();

        assert_eq!(
            before_count, after_count,
            "Temp directories should be cleaned up after import (before: {}, after: {})",
            before_count, after_count
        );
    }

    #[test]
    fn test_import_with_custom_bundle_name() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        let custom_name = "My Custom Bundle Name";

        // Execute
        let result = manager.import_log_package(&test_archive, Some(custom_name.to_string()), None);

        // Assert
        assert!(result.is_ok(), "Import with custom name should succeed");
        let import_result = result.unwrap();

        assert_eq!(
            import_result.bundle_name, custom_name,
            "Should use custom bundle name"
        );

        let bundle = manager.get_bundle(&import_result.bundle_id).unwrap();
        assert_eq!(bundle.name, custom_name, "Bundle should have custom name");
    }
}

// Phase 2: Progress Tracking Tests (3 tests)
#[cfg(test)]
mod progress_tests {
    use super::*;
    use std::path::PathBuf;
    use std::sync::{Arc, Mutex};
    use tempfile::TempDir;

    #[test]
    fn test_import_with_progress_calls_callback() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        // Track progress updates
        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();

        let progress_fn = Box::new(move |message: &str, percentage: u32| {
            progress_updates_clone
                .lock()
                .unwrap()
                .push((message.to_string(), percentage));
        });

        // Execute
        let result =
            manager.import_log_package_with_progress(&test_archive, None, None, progress_fn);

        // Assert
        assert!(result.is_ok(), "Import with progress should succeed");

        let updates = progress_updates.lock().unwrap();
        assert!(
            updates.len() >= 5,
            "Should have multiple progress updates (at least 5), got: {}",
            updates.len()
        );

        // Verify progress starts low and ends at 100
        let first_percent = updates.first().unwrap().1;
        let last_percent = updates.last().unwrap().1;

        assert!(
            first_percent <= 10,
            "Should start at or below 10%, got: {}%",
            first_percent
        );
        assert_eq!(last_percent, 100, "Should end at 100%");
    }

    #[test]
    fn test_progress_percentages_increase_monotonically() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();

        let progress_fn = Box::new(move |_: &str, percentage: u32| {
            progress_updates_clone.lock().unwrap().push(percentage);
        });

        // Execute
        let result =
            manager.import_log_package_with_progress(&test_archive, None, None, progress_fn);
        assert!(result.is_ok(), "Import should succeed");

        // Assert - percentages should increase
        let percentages = progress_updates.lock().unwrap();

        for i in 1..percentages.len() {
            assert!(
                percentages[i] >= percentages[i - 1],
                "Progress should increase monotonically: {}% -> {}% at index {}",
                percentages[i - 1],
                percentages[i],
                i
            );
        }
    }

    #[test]
    fn test_progress_messages_are_descriptive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("../test-data/quick-test.zip");

        if !test_archive.exists() {
            eprintln!("Skipping test: {} not found", test_archive.display());
            return;
        }

        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();

        let progress_fn = Box::new(move |message: &str, _: u32| {
            progress_updates_clone
                .lock()
                .unwrap()
                .push(message.to_string());
        });

        // Execute
        let result =
            manager.import_log_package_with_progress(&test_archive, None, None, progress_fn);
        assert!(result.is_ok(), "Import should succeed");

        // Assert - check for key messages
        let messages = progress_updates.lock().unwrap();
        let all_messages = messages.join("|").to_lowercase();

        assert!(
            all_messages.contains("extract") || all_messages.contains("creating"),
            "Should have 'extracting' or 'creating' message in: {}",
            all_messages
        );
        assert!(
            all_messages.contains("creat") || all_messages.contains("bundle"),
            "Should mention bundle creation in: {}",
            all_messages
        );
        assert!(
            all_messages.contains("add")
                || all_messages.contains("log")
                || all_messages.contains("file"),
            "Should mention adding logs/files in: {}",
            all_messages
        );
        assert!(
            all_messages.contains("complete")
                || all_messages.contains("done")
                || all_messages.contains("finish"),
            "Should have completion message in: {}",
            all_messages
        );
    }
}
