//! Bundle manager - filesystem-based CRUD operations
//!
//! Provides persistent storage and management of log bundles using the filesystem.
//! Bundles are stored in `.log-scout/bundles/` with JSON metadata.
//!
//! **Hybrid Mode Support (Phase 3)**:
//! When MongoDB client is provided, the manager operates in hybrid mode:
//! - Tries MongoDB first for better performance and team collaboration
//! - Falls back to filesystem if MongoDB is unavailable
//! - Ensures backward compatibility with Phase 1 (filesystem-only)

use crate::bundle::{
    Bundle, BundleError, BundleLog, BundleMetadata, Case, CaseStatus, Result, ServiceDetector,
    ServiceType, TimeframeBundleAnalyzer,
};
use crate::mongodb::{MongoClient, MongoConfig};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// Manager for bundle operations with filesystem persistence
///
/// **Backward Compatible Design**:
/// - Phase 1: `mongo_client = None` → filesystem only
/// - Phase 3: `mongo_client = Some(...)` → hybrid mode with fallback
pub struct BundleManager {
    /// Root directory for bundles (.log-scout/bundles/)
    bundles_dir: PathBuf,

    /// Path to the bundle index file
    index_path: PathBuf,

    /// Service detector for auto-detection
    detector: ServiceDetector,

    /// Optional MongoDB client for Phase 3 hybrid mode
    /// When None: operates in filesystem-only mode (backward compatible)
    /// When Some: tries MongoDB first, falls back to filesystem
    mongo_client: Option<Arc<MongoClient>>,
}

impl BundleManager {
    /// Create a new bundle manager
    ///
    /// # Arguments
    /// * `workspace_root` - Root directory of the workspace
    ///
    /// # Example
    /// ```no_run
    /// use lsp_server::bundle::BundleManager;
    /// use std::path::Path;
    ///
    /// let manager = BundleManager::new(Path::new(".")).unwrap();
    /// ```
    pub fn new(workspace_root: &Path) -> Result<Self> {
        let bundles_dir = workspace_root.join(".log-scout").join("bundles");

        // Create directory structure if it doesn't exist
        fs::create_dir_all(&bundles_dir)?;

        let index_path = bundles_dir.join("index.json");

        // Create empty index if it doesn't exist
        if !index_path.exists() {
            let empty_index = BundleIndex {
                bundles: Vec::new(),
                last_updated: Utc::now(),
            };
            Self::save_index_file(&index_path, &empty_index)?;
        }

        tracing::info!("Bundle manager initialized at: {:?}", bundles_dir);

        Ok(Self {
            bundles_dir,
            index_path,
            detector: ServiceDetector::new(),
            mongo_client: None, // Default to None (filesystem-only mode)
        })
    }

    /// Create a new bundle manager with MongoDB support (Phase 3 - Hybrid Mode)
    ///
    /// This constructor enables hybrid mode where bundles are:
    /// 1. Saved to MongoDB first (if available)
    /// 2. Also backed up to filesystem
    /// 3. Automatically falls back to filesystem-only if MongoDB fails
    ///
    /// **Backward Compatibility**: If MongoDB connection fails, operates in filesystem-only mode
    /// just like Phase 1, ensuring the system always works.
    ///
    /// # Arguments
    /// * `workspace_root` - Root directory of the workspace
    /// * `mongo_config` - MongoDB configuration (will be implemented in Phase 3)
    ///
    /// # Example (Phase 3)
    /// ```no_run,ignore
    /// use lsp_server::bundle::BundleManager;
    /// use std::path::Path;
    ///
    /// // This will be enabled in Phase 3
    /// // let config = MongoConfig::load("mongodb_connection.yaml").unwrap();
    /// // let manager = BundleManager::new_with_mongodb(Path::new("."), &config).await.unwrap();
    /// ```
    #[allow(dead_code)]
    pub async fn new_with_mongodb(
        workspace_root: &Path,
        mongo_config: &MongoConfig,
    ) -> Result<Self> {
        let bundles_dir = workspace_root.join(".log-scout").join("bundles");
        fs::create_dir_all(&bundles_dir)?;

        let index_path = bundles_dir.join("index.json");

        // Create empty index if it doesn't exist
        if !index_path.exists() {
            let empty_index = BundleIndex {
                bundles: Vec::new(),
                last_updated: Utc::now(),
            };
            Self::save_index_file(&index_path, &empty_index)?;
        }

        // Try to connect to MongoDB
        let mongo_client = match MongoClient::new(mongo_config).await {
            Ok(client) => {
                tracing::info!("✅ MongoDB connected - hybrid mode active");
                Some(Arc::new(client))
            }
            Err(e) => {
                tracing::warn!("⚠️ MongoDB connection failed, using filesystem only: {}", e);
                None
            }
        };

        let mode = if mongo_client.is_some() {
            "hybrid mode (MongoDB + filesystem)"
        } else {
            "filesystem-only mode"
        };

        tracing::info!(
            "Bundle manager initialized at: {:?} ({})",
            bundles_dir,
            mode
        );

        Ok(Self {
            bundles_dir,
            index_path,
            detector: ServiceDetector::new(),
            mongo_client,
        })
    }

    /// Create a new bundle
    ///
    /// # Arguments
    /// * `name` - User-friendly name for the bundle
    /// * `description` - Optional description
    /// * `metadata` - Optional metadata
    ///
    /// # Returns
    /// Bundle ID on success
    pub fn create_bundle(
        &self,
        name: String,
        description: Option<String>,
        metadata: Option<BundleMetadata>,
    ) -> Result<String> {
        // Generate unique ID
        let id = format!("bundle_{}", uuid::Uuid::new_v4().simple());

        // Create bundle struct
        let mut bundle = Bundle::new(id.clone(), name);
        bundle.description = description;
        if let Some(meta) = metadata {
            bundle.metadata = meta;
        }

        // Hybrid mode: Try MongoDB first
        if let Some(client) = &self.mongo_client {
            match tokio::runtime::Handle::try_current() {
                Ok(handle) => {
                    match handle.block_on(client.create_bundle(&bundle)) {
                        Ok(_) => {
                            tracing::debug!("✅ Bundle saved to MongoDB: {}", id);
                            // Also backup to filesystem
                            let _ = self.save_bundle_filesystem(&bundle);
                        }
                        Err(e) => {
                            tracing::warn!("⚠️ MongoDB save failed, using filesystem: {}", e);
                        }
                    }
                }
                Err(_) => {
                    tracing::warn!("⚠️ No tokio runtime, using filesystem only");
                }
            }
        }

        // Always ensure filesystem copy exists
        let bundle_dir = self.bundles_dir.join(&id);
        fs::create_dir_all(&bundle_dir)?;
        self.save_bundle_filesystem(&bundle)?;
        self.add_to_index(&id, &bundle.name)?;

        tracing::info!("Created bundle: {} ({})", bundle.name, id);

        Ok(id)
    }

    /// Add a log file to a bundle
    ///
    /// # Arguments
    /// * `bundle_id` - ID of the bundle
    /// * `log_path` - Path to the log file
    ///
    /// # Returns
    /// The detected service type
    pub fn add_log_to_bundle(&self, bundle_id: &str, log_path: &Path) -> Result<BundleLog> {
        self.add_log_to_bundle_with_context(bundle_id, log_path, None)
    }

    /// Add a log file to a bundle with archive context
    ///
    /// # Arguments
    /// * `bundle_id` - ID of the bundle
    /// * `log_path` - Path to the log file
    /// * `archive_context` - Optional archive filename for enhanced service detection
    ///
    /// # Returns
    /// The detected service type
    pub fn add_log_to_bundle_with_context(
        &self,
        bundle_id: &str,
        log_path: &Path,
        archive_context: Option<&str>,
    ) -> Result<BundleLog> {
        // Load existing bundle
        let mut bundle = self.get_bundle(bundle_id)?;

        // Check if file exists
        if !log_path.exists() {
            return Err(BundleError::Invalid(format!(
                "Log file does not exist: {}",
                log_path.display()
            )));
        }

        // Get file metadata
        let metadata = fs::metadata(log_path)?;
        let size_bytes = metadata.len();

        // Read first lines for service detection
        let content_lines = Self::read_first_lines(log_path, 50)?;
        let line_count = Self::count_lines(log_path)?;

        // Detect service type with archive context hint
        let path_str = log_path.to_string_lossy().to_string();
        let mut service = self.detector.detect(&path_str, Some(&content_lines))?;

        // If service is still unknown, try archive name hint
        if service == ServiceType::Unknown && archive_context.is_some() {
            if let Some(archive_service) = self.detector.from_archive_name(archive_context.unwrap())
            {
                tracing::info!(
                    "Using archive name hint '{}' to detect service: {}",
                    archive_context.unwrap(),
                    archive_service
                );
                service = archive_service;
            }
        }

        // Create BundleLog entry
        let mut log = BundleLog::new(
            path_str.clone(),
            service.clone(),
            crate::bundle::LogType::Trace, // Default, could be enhanced
        );
        log.size_bytes = size_bytes;
        log.line_count = line_count;

        // Add to bundle
        bundle.add_log(log.clone());

        // Save updated bundle (hybrid mode aware)
        self.update_bundle(&bundle.id, |b| {
            *b = bundle.clone();
        })?;

        tracing::info!(
            "Added log to bundle {}: {} ({} lines, {} detected)",
            bundle_id,
            log_path.display(),
            line_count,
            service
        );

        Ok(log)
    }

    /// Get a bundle by ID
    ///
    /// # Arguments
    /// * `id` - Bundle ID
    ///
    /// # Returns
    /// Bundle struct
    pub fn get_bundle(&self, id: &str) -> Result<Bundle> {
        // Hybrid mode: Try MongoDB first
        if let Some(client) = &self.mongo_client {
            if let Ok(handle) = tokio::runtime::Handle::try_current() {
                if let Ok(Some(bundle)) = handle.block_on(client.get_bundle(id)) {
                    tracing::debug!("✅ Bundle retrieved from MongoDB: {}", id);
                    return Ok(bundle);
                }
                tracing::debug!("Bundle not in MongoDB, trying filesystem");
            }
        }

        // Fallback to filesystem
        let bundle_path = self.bundles_dir.join(id).join("bundle.json");

        if !bundle_path.exists() {
            return Err(BundleError::NotFound(format!("Bundle not found: {}", id)));
        }

        let content = fs::read_to_string(&bundle_path)?;
        let bundle: Bundle = serde_json::from_str(&content)?;

        Ok(bundle)
    }

    /// List all bundles
    ///
    /// # Arguments
    /// * `filter` - Optional name filter (substring match)
    ///
    /// # Returns
    /// Vector of bundles matching the filter
    pub fn list_bundles(&self, filter: Option<&str>) -> Result<Vec<Bundle>> {
        let index = self.load_index()?;
        let mut bundles = Vec::new();

        for entry in index.bundles {
            // Apply filter if provided
            if let Some(filter_str) = filter {
                if !entry
                    .name
                    .to_lowercase()
                    .contains(&filter_str.to_lowercase())
                {
                    continue;
                }
            }

            // Load full bundle
            match self.get_bundle(&entry.id) {
                Ok(bundle) => bundles.push(bundle),
                Err(e) => {
                    tracing::warn!("Failed to load bundle {}: {}", entry.id, e);
                    continue;
                }
            }
        }

        // Sort by created_at (newest first)
        bundles.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        Ok(bundles)
    }

    /// Delete a bundle
    ///
    /// # Arguments
    /// * `id` - Bundle ID to delete
    pub fn delete_bundle(&self, id: &str) -> Result<()> {
        // Hybrid mode: Delete from MongoDB
        if let Some(client) = &self.mongo_client {
            if let Ok(handle) = tokio::runtime::Handle::try_current() {
                if let Err(e) = handle.block_on(client.delete_bundle(id)) {
                    tracing::warn!("⚠️ MongoDB delete failed: {}", e);
                } else {
                    tracing::debug!("✅ Bundle deleted from MongoDB: {}", id);
                }
            }
        }

        // Always delete from filesystem
        let bundle_dir = self.bundles_dir.join(id);

        if !bundle_dir.exists() {
            return Err(BundleError::NotFound(format!("Bundle not found: {}", id)));
        }

        fs::remove_dir_all(&bundle_dir)?;
        self.remove_from_index(id)?;

        tracing::info!("Deleted bundle: {}", id);

        Ok(())
    }

    // ============================================================================
    // Case Management Methods
    // ============================================================================

    /// Get all bundles grouped by case
    pub fn list_bundles_by_case(&self) -> Result<HashMap<Option<String>, Vec<Bundle>>> {
        let bundles = self.list_bundles(None)?;
        let mut cases: HashMap<Option<String>, Vec<Bundle>> = HashMap::new();

        for bundle in bundles {
            let case_id = bundle.metadata.case_id.clone();
            cases.entry(case_id).or_insert_with(Vec::new).push(bundle);
        }

        Ok(cases)
    }

    /// Get all bundles for a specific case
    pub fn get_bundles_for_case(&self, case_id: &str) -> Result<Vec<Bundle>> {
        let bundles = self.list_bundles(None)?;
        let case_bundles: Vec<Bundle> = bundles
            .into_iter()
            .filter(|b| {
                b.metadata
                    .case_id
                    .as_ref()
                    .map(|id| id == case_id)
                    .unwrap_or(false)
            })
            .collect();

        Ok(case_bundles)
    }

    /// Create a new bundle for an existing case
    pub fn create_bundle_for_case(
        &self,
        case_id: String,
        bundle_name: String,
        bundle_type: Option<String>,
    ) -> Result<String> {
        // Create metadata with case info
        let mut metadata = BundleMetadata::default();
        metadata.case_id = Some(case_id.clone());
        metadata.bundle_type = bundle_type;

        // Create bundle with metadata
        let bundle_id = self.create_bundle(bundle_name, None, Some(metadata))?;

        tracing::info!("Created bundle {} for case {}", bundle_id, case_id);

        Ok(bundle_id)
    }

    /// Get case summary with bundle counts
    pub fn get_case_summary(&self, case_id: &str) -> Result<CaseSummary> {
        let bundles = self.get_bundles_for_case(case_id)?;

        let total_logs: usize = bundles.iter().map(|b| b.log_count()).sum();
        let total_size: u64 = bundles.iter().map(|b| b.total_size()).sum();

        // Collect unique services
        let mut services = std::collections::HashSet::new();
        for bundle in &bundles {
            for log in &bundle.logs {
                services.insert(log.service.to_string());
            }
        }

        // Find earliest created_at and latest updated_at
        let created_at = bundles
            .iter()
            .map(|b| b.created_at)
            .min()
            .unwrap_or_else(Utc::now);
        let updated_at = bundles
            .iter()
            .map(|b| b.updated_at)
            .max()
            .unwrap_or_else(Utc::now);

        Ok(CaseSummary {
            case_id: case_id.to_string(),
            bundle_count: bundles.len(),
            total_logs,
            total_size,
            services: HashMap::new(), // TODO: collect services from bundles
            created_at: Some(created_at),
            updated_at: Some(updated_at),
        })
    }

    /// List all cases
    pub fn list_cases(&self) -> Result<Vec<String>> {
        let bundles = self.list_bundles(None)?;

        let mut cases = std::collections::HashSet::new();
        for bundle in bundles {
            if let Some(case_id) = bundle.metadata.case_id {
                cases.insert(case_id);
            }
        }

        Ok(cases.into_iter().collect())
    }

    /// Suggest timeframe-based bundle groupings
    ///
    /// Analyzes logs across bundles to suggest creating new bundles
    /// grouped by overlapping timeframes (useful for multi-system investigations)
    pub fn suggest_timeframe_bundles(
        &self,
        case_id: Option<&str>,
    ) -> Result<Vec<TimeframeBundleSuggestion>> {
        let bundles = if let Some(case_id) = case_id {
            self.get_bundles_for_case(case_id)?
        } else {
            self.list_bundles(None)?
        };

        // Collect all log paths
        let mut log_paths = Vec::new();
        for bundle in &bundles {
            for log in &bundle.logs {
                log_paths.push(std::path::PathBuf::from(&log.uri));
            }
        }

        // Analyze timeframes
        let analyzer = TimeframeBundleAnalyzer::new();
        let path_refs: Vec<&Path> = log_paths.iter().map(|p| p.as_path()).collect();
        let groups = analyzer.suggest_bundles(&path_refs);

        // Convert to suggestions
        let mut suggestions = Vec::new();
        for group in groups {
            let start_str = group
                .start_time
                .map(|t| t.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            let end_str = group
                .end_time
                .map(|t| t.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_else(|| "Unknown".to_string());

            let reason = format!(
                "Found {} logs with overlapping timeframes ({} to {})",
                group.logs.len(),
                start_str,
                end_str
            );

            suggestions.push(TimeframeBundleSuggestion {
                suggested_name: format!("Timeframe: {}", start_str),
                timeframe: group,
                case_id: case_id.map(|s| s.to_string()),
                reason,
            });
        }

        Ok(suggestions)
    }

    /// Create bundles based on timeframe suggestions
    pub fn create_timeframe_bundles(
        &self,
        suggestions: Vec<TimeframeBundleSuggestion>,
    ) -> Result<Vec<String>> {
        let mut created_bundle_ids = Vec::new();

        for suggestion in suggestions {
            // Create bundle
            let bundle_id = if let Some(case_id) = suggestion.case_id {
                self.create_bundle_for_case(
                    case_id,
                    suggestion.suggested_name,
                    Some("Timeframe Group".to_string()),
                )?
            } else {
                self.create_bundle(suggestion.suggested_name, None, None)?
            };

            created_bundle_ids.push(bundle_id);
        }

        Ok(created_bundle_ids)
    }

    /// Check if a log should be added to an existing bundle based on timeframe
    ///
    /// Returns warning message if timeframes don't overlap
    pub fn check_timeframe_compatibility(
        &self,
        bundle_id: &str,
        log_path: &Path,
    ) -> Result<TimeframeCompatibility> {
        let bundle = self.get_bundle(bundle_id)?;

        // Get existing log timeframes in bundle
        let analyzer = crate::bundle::TimeframeAnalyzer::new();
        let mut existing_timeframes = Vec::new();

        for log in &bundle.logs {
            let log_path_buf = PathBuf::from(&log.uri);
            if log_path_buf.exists() {
                if let Ok(tf) = analyzer.analyze_log(&log_path_buf) {
                    existing_timeframes.push(tf);
                }
            }
        }

        // Analyze new log
        let new_timeframe = analyzer.analyze_log(log_path)?;

        // Check compatibility
        if existing_timeframes.is_empty() {
            return Ok(TimeframeCompatibility::Compatible {
                message: "First log in bundle".to_string(),
            });
        }

        // Check overlap with existing logs
        let mut has_overlap = false;
        let mut min_gap: Option<chrono::Duration> = None;

        for existing in &existing_timeframes {
            if existing.overlaps_with(&new_timeframe) {
                has_overlap = true;
                break;
            }

            if let Some(gap) = existing.gap_to(&new_timeframe) {
                min_gap = Some(match min_gap {
                    Some(current) => current.min(gap),
                    None => gap,
                });
            }
        }

        if has_overlap {
            Ok(TimeframeCompatibility::Compatible {
                message: "Log timeframe overlaps with existing logs".to_string(),
            })
        } else if let Some(gap) = min_gap {
            let gap_hours = gap.num_hours();

            if gap_hours > 24 {
                Ok(TimeframeCompatibility::Warning {
                    message: format!(
                        "Log timeframe is {} hours apart from existing logs. Consider creating a separate bundle.",
                        gap_hours
                    ),
                    gap_hours,
                })
            } else {
                Ok(TimeframeCompatibility::Compatible {
                    message: format!("Log is {} hours apart but reasonably close", gap_hours),
                })
            }
        } else {
            Ok(TimeframeCompatibility::Unknown {
                message: "Unable to determine timeframe overlap".to_string(),
            })
        }
    }

    // Helper methods
    /// Save bundle to filesystem
    fn save_bundle_filesystem(&self, bundle: &Bundle) -> Result<()> {
        let bundle_dir = self.bundles_dir.join(&bundle.id);
        let bundle_path = bundle_dir.join("bundle.json");

        // Serialize to JSON
        let json = serde_json::to_string_pretty(bundle)?;

        // Atomic write: write to temp file, then rename
        let temp_path = bundle_path.with_extension("json.tmp");
        fs::write(&temp_path, json)?;
        fs::rename(&temp_path, &bundle_path)?;

        Ok(())
    }

    /// Load bundle index
    fn load_index(&self) -> Result<BundleIndex> {
        let content = fs::read_to_string(&self.index_path)?;
        let index: BundleIndex = serde_json::from_str(&content)?;
        Ok(index)
    }

    /// Save bundle index
    fn save_index(&self, index: &BundleIndex) -> Result<()> {
        Self::save_index_file(&self.index_path, index)
    }

    /// Save index to file (static for initialization)
    fn save_index_file(path: &Path, index: &BundleIndex) -> Result<()> {
        let json = serde_json::to_string_pretty(index)?;

        // Atomic write
        let temp_path = path.with_extension("json.tmp");
        fs::write(&temp_path, json)?;
        fs::rename(&temp_path, path)?;

        Ok(())
    }

    /// Add bundle to index
    fn add_to_index(&self, id: &str, name: &str) -> Result<()> {
        let mut index = self.load_index()?;

        // Check if already exists
        if !index.bundles.iter().any(|e| e.id == id) {
            index.bundles.push(BundleIndexEntry {
                id: id.to_string(),
                name: name.to_string(),
                created_at: Utc::now(),
            });
            index.last_updated = Utc::now();
            self.save_index(&index)?;
        }

        Ok(())
    }

    /// Remove bundle from index
    fn remove_from_index(&self, id: &str) -> Result<()> {
        let mut index = self.load_index()?;

        index.bundles.retain(|e| e.id != id);
        index.last_updated = Utc::now();

        self.save_index(&index)?;

        Ok(())
    }

    /// Read first N lines from a file
    fn read_first_lines(path: &Path, count: usize) -> Result<Vec<String>> {
        let content = fs::read_to_string(path)?;
        let lines: Vec<String> = content.lines().take(count).map(|s| s.to_string()).collect();
        Ok(lines)
    }

    /// Count total lines in a file
    fn count_lines(path: &Path) -> Result<usize> {
        let content = fs::read_to_string(path)?;
        Ok(content.lines().count())
    }

    /// Update a bundle with a closure
    pub fn update_bundle<F>(&self, bundle_id: &str, f: F) -> Result<()>
    where
        F: FnOnce(&mut Bundle),
    {
        let mut bundle = self.get_bundle(bundle_id)?;
        f(&mut bundle);
        bundle.updated_at = Utc::now();
        self.save_bundle_filesystem(&bundle)?;
        Ok(())
    }

    /// Save a bundle (public version that wraps filesystem save)
    pub fn save_bundle(&self, bundle: &Bundle) -> Result<()> {
        self.save_bundle_filesystem(bundle)
    }

    /// Get the directory path for a bundle
    pub fn get_bundle_dir(&self, bundle_id: &str) -> PathBuf {
        self.bundles_dir.join(bundle_id)
    }

    /// Parse case number from QCSONE filename
    pub fn parse_case_number(filename: &str) -> Option<String> {
        // QCSONE format: 700440257_qcsone_download_selected.zip
        if filename.contains("_qcsone_") {
            let parts: Vec<&str> = filename.split('_').collect();
            if let Some(first) = parts.first() {
                // Check if it's numeric
                if first.chars().all(|c| c.is_numeric()) {
                    return Some(first.to_string());
                }
            }
        }
        None
    }

    /// Import a log package (ZIP/TAR) into a bundle
    pub fn import_log_package(
        &self,
        package_path: &Path,
        bundle_name: Option<String>,
        case_id: Option<String>,
    ) -> Result<ImportResult> {
        use crate::bundle::ArchiveExtractor;
        use uuid::Uuid;

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
        let extracted_files = ArchiveExtractor::extract(package_path, &temp_dir)?;

        tracing::info!("Extracted {} files from archive", extracted_files.len());

        // Filter to only log files

        let log_files: Vec<PathBuf> = extracted_files
            .iter()
            .filter(|p| {
                if let Some(ext) = p.extension() {
                    matches!(
                        ext.to_str(),
                        Some("log") | Some("txt") | Some("out") | Some("err")
                    )
                } else {
                    false
                }
            })
            .cloned()
            .collect();
        tracing::info!("Found {} log files", log_files.len());

        // Detect case ID from filename if not provided
        let detected_case_id = case_id.or_else(|| {
            package_path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(|s| Self::parse_case_number(s))
        });

        // Generate bundle name if not provided
        let final_bundle_name = bundle_name.unwrap_or_else(|| {
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
            metadata.tags.push("source:QCSONE".to_string());
        }

        // Create the bundle
        let bundle_id = self.create_bundle(final_bundle_name.clone(), None, Some(metadata))?;

        tracing::info!("Created bundle {} for import", bundle_id);

        // Add all log files to bundle
        let mut imported_logs = Vec::new();
        let mut failed_files = Vec::new();

        for file_path in &log_files {
            let filename = file_path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown");

            match self.add_log_to_bundle_with_context(&bundle_id, file_path, None) {
                Ok(_) => {
                    // Get file info
                    if let Ok(metadata) = fs::metadata(file_path) {
                        let size_bytes = metadata.len();
                        let line_count = Self::count_lines(file_path).unwrap_or(0);

                        imported_logs.push(ImportedLog {
                            filename: filename.to_string(),
                            service: ServiceType::Unknown, // Will be detected by add_log_to_bundle_with_context
                            size_bytes,
                            line_count,
                        });
                    }
                    tracing::debug!("Added log file: {:?}", file_path);
                }
                Err(e) => {
                    tracing::warn!("Failed to add {:?}: {}", file_path, e);
                    failed_files.push(filename.to_string());
                }
            }
        }

        let success_count = imported_logs.len();

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
            bundle_id: bundle_id.clone(),
            bundle_name: final_bundle_name,
            case_id: detected_case_id.clone(),
            summary: ImportSummary {
                total_files: extracted_files.len(),
                success_count,
                imported_logs,
                failed_files,
                case_id: detected_case_id,
            },
        })
    }

    /// Import a log package with progress callbacks
    pub fn import_log_package_with_progress<F>(
        &self,
        package_path: &Path,
        bundle_name: Option<String>,
        case_id: Option<String>,
        progress: F,
    ) -> Result<ImportResult>
    where
        F: Fn(&str, u32) + Send + Sync,
    {
        use crate::bundle::ArchiveExtractor;
        use uuid::Uuid;

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

        let extracted_files = ArchiveExtractor::extract(package_path, &temp_dir)?;

        tracing::info!("Extracted {} files from archive", extracted_files.len());
        progress(&format!("Extracted {} files", extracted_files.len()), 40);

        // Stage 3: Filter log files (40-50%)
        progress("Filtering log files...", 45);

        let log_files: Vec<PathBuf> = extracted_files
            .iter()
            .filter(|p| {
                if let Some(ext) = p.extension() {
                    matches!(
                        ext.to_str(),
                        Some("log") | Some("txt") | Some("out") | Some("err")
                    )
                } else {
                    false
                }
            })
            .cloned()
            .collect();
        tracing::info!("Found {} log files", log_files.len());

        progress(&format!("Found {} log files", log_files.len()), 50);

        // Stage 4: Detect metadata (50-55%)
        progress("Detecting case ID...", 51);

        let detected_case_id = case_id.or_else(|| {
            package_path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(|s| Self::parse_case_number(s))
        });

        progress("Creating bundle...", 52);

        let final_bundle_name = bundle_name.unwrap_or_else(|| {
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
            metadata.tags.push("source:QCSONE".to_string());
        }

        let bundle_id = self.create_bundle(final_bundle_name.clone(), None, Some(metadata))?;

        tracing::info!("Created bundle {} for import", bundle_id);
        progress(&format!("Bundle created: {}", bundle_id), 55);

        // Stage 5: Add log files (55-95%)
        let mut imported_logs = Vec::new();
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

            match self.add_log_to_bundle_with_context(&bundle_id, file_path, None) {
                Ok(_) => {
                    if let Ok(metadata) = fs::metadata(file_path) {
                        let size_bytes = metadata.len();
                        let line_count = Self::count_lines(file_path).unwrap_or(0);

                        imported_logs.push(ImportedLog {
                            filename: filename.to_string(),
                            service: ServiceType::Unknown,
                            size_bytes,
                            line_count,
                        });
                    }
                    tracing::debug!("Added log file: {:?}", file_path);
                }
                Err(e) => {
                    tracing::warn!("Failed to add {:?}: {}", file_path, e);
                    failed_files.push(filename.to_string());
                }
            }
        }

        let success_count = imported_logs.len();

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
            bundle_id: bundle_id.clone(),
            bundle_name: final_bundle_name,
            case_id: detected_case_id.clone(),
            summary: ImportSummary {
                total_files: extracted_files.len(),
                success_count,
                imported_logs,
                failed_files,
                case_id: detected_case_id,
            },
        })
    }
}

/// Bundle index for fast lookups
#[derive(Debug, Clone, Serialize, Deserialize)]
struct BundleIndex {
    bundles: Vec<BundleIndexEntry>,
    last_updated: chrono::DateTime<Utc>,
}

/// Single entry in the bundle index
#[derive(Debug, Clone, Serialize, Deserialize)]
struct BundleIndexEntry {
    id: String,
    name: String,
    created_at: chrono::DateTime<Utc>,
}

/// Result of importing a log package
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    /// Created bundle ID
    pub bundle_id: String,

    /// Bundle name
    pub bundle_name: String,

    /// Detected or provided case ID
    pub case_id: Option<String>,

    /// Import summary
    pub summary: ImportSummary,
}

/// Summary of import operation
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ImportSummary {
    /// Total files in archive
    pub total_files: usize,

    /// Successfully imported logs
    pub success_count: usize,

    /// List of imported logs with details
    pub imported_logs: Vec<ImportedLog>,

    /// Files that failed to import
    pub failed_files: Vec<String>,

    /// Detected or provided case ID
    pub case_id: Option<String>,
}

impl ImportSummary {
    /// Get breakdown by service
    pub fn by_service(&self) -> std::collections::HashMap<String, usize> {
        let mut counts = std::collections::HashMap::new();
        for log in &self.imported_logs {
            *counts.entry(log.service.to_string()).or_insert(0) += 1;
        }
        counts
    }
}

/// Details of an imported log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportedLog {
    pub filename: String,
    pub service: crate::bundle::ServiceType,
    pub size_bytes: u64,
    pub line_count: usize,
}

/// Summary information about a case and its bundles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaseSummary {
    pub case_id: String,
    pub bundle_count: usize,
    pub total_logs: usize,
    pub total_size: u64,
    pub services: HashMap<ServiceType, usize>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// Suggested bundle based on timeframe analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeframeBundleSuggestion {
    /// Suggested bundle name
    pub suggested_name: String,

    /// Timeframe group information
    pub timeframe: crate::bundle::BundleGroup,

    /// Optional case ID to associate with
    pub case_id: Option<String>,

    /// Reason for this grouping
    pub reason: String,
}

/// Result of timeframe compatibility check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TimeframeCompatibility {
    /// Logs are compatible (overlapping timeframes)
    Compatible { message: String },

    /// Logs don't overlap but might be related
    Warning { message: String, gap_hours: i64 },

    /// Unable to determine (no timestamps found)
    Unknown { message: String },
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_manager() -> (BundleManager, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let manager = BundleManager::new(temp_dir.path()).unwrap();
        (manager, temp_dir)
    }

    #[test]
    fn test_create_bundle() {
        let (manager, _temp) = setup_test_manager();

        let bundle_id = manager
            .create_bundle("Test Bundle".to_string(), None, None)
            .unwrap();

        assert!(bundle_id.starts_with("bundle_"));

        // Verify bundle exists
        let bundle = manager.get_bundle(&bundle_id).unwrap();
        assert_eq!(bundle.name, "Test Bundle");
        assert_eq!(bundle.log_count(), 0);
    }

    #[test]
    fn test_get_nonexistent_bundle() {
        let (manager, _temp) = setup_test_manager();

        let result = manager.get_bundle("nonexistent");
        assert!(result.is_err());

        match result {
            Err(BundleError::NotFound(_)) => {}
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_list_bundles() {
        let (manager, _temp) = setup_test_manager();

        // Create multiple bundles
        manager
            .create_bundle("Bundle 1".to_string(), None, None)
            .unwrap();
        manager
            .create_bundle("Bundle 2".to_string(), None, None)
            .unwrap();
        manager
            .create_bundle("Test Bundle".to_string(), None, None)
            .unwrap();

        // List all
        let all_bundles = manager.list_bundles(None).unwrap();
        assert_eq!(all_bundles.len(), 3);

        // List with filter
        let filtered = manager.list_bundles(Some("Test")).unwrap();
        assert_eq!(filtered.len(), 1);
        assert_eq!(filtered[0].name, "Test Bundle");
    }

    #[test]
    fn test_delete_bundle() {
        let (manager, _temp) = setup_test_manager();

        let bundle_id = manager
            .create_bundle("To Delete".to_string(), None, None)
            .unwrap();

        // Verify exists
        assert!(manager.get_bundle(&bundle_id).is_ok());

        // Delete
        manager.delete_bundle(&bundle_id).unwrap();

        // Verify deleted
        assert!(manager.get_bundle(&bundle_id).is_err());
    }

    #[test]
    fn test_update_bundle() {
        let (manager, _temp) = setup_test_manager();

        let bundle_id = manager
            .create_bundle("Original Name".to_string(), None, None)
            .unwrap();

        // Update
        manager
            .update_bundle(&bundle_id, |bundle| {
                bundle.name = "Updated Name".to_string();
                bundle.description = Some("New description".to_string());
            })
            .unwrap();

        // Verify update
        let bundle = manager.get_bundle(&bundle_id).unwrap();
        assert_eq!(bundle.name, "Updated Name");
        assert_eq!(bundle.description, Some("New description".to_string()));
    }

    #[test]
    fn test_add_log_to_bundle() {
        let (manager, temp) = setup_test_manager();

        // Create bundle
        let bundle_id = manager
            .create_bundle("Log Bundle".to_string(), None, None)
            .unwrap();

        // Create a test log file
        let log_path = temp.path().join("test.log");
        fs::write(&log_path, "Line 1\nLine 2\nLine 3\n").unwrap();

        // Add log
        let log = manager.add_log_to_bundle(&bundle_id, &log_path).unwrap();

        assert_eq!(log.line_count, 3);
        assert!(log.size_bytes > 0);

        // Verify bundle was updated
        let bundle = manager.get_bundle(&bundle_id).unwrap();
        assert_eq!(bundle.log_count(), 1);
    }

    #[test]
    fn test_add_nonexistent_log() {
        let (manager, temp) = setup_test_manager();

        let bundle_id = manager
            .create_bundle("Test".to_string(), None, None)
            .unwrap();

        let nonexistent = temp.path().join("doesnt_exist.log");
        let result = manager.add_log_to_bundle(&bundle_id, &nonexistent);

        assert!(result.is_err());
    }

    #[test]
    fn test_bundle_directory_structure() {
        let (manager, temp) = setup_test_manager();

        let bundle_id = manager
            .create_bundle("Test".to_string(), None, None)
            .unwrap();

        // Check directory exists
        let bundle_dir = manager.get_bundle_dir(&bundle_id);
        assert!(bundle_dir.exists());
        assert!(bundle_dir.join("bundle.json").exists());

        // Check index exists
        let index_path = temp
            .path()
            .join(".log-scout")
            .join("bundles")
            .join("index.json");
        assert!(index_path.exists());
    }

    #[test]
    fn test_parse_case_number_qcsone() {
        // QCSONE format
        assert_eq!(
            BundleManager::parse_case_number("700440257_qcsone_download_selected.zip"),
            Some("700440257".to_string())
        );

        // Not QCSONE
        assert_eq!(BundleManager::parse_case_number("random_file.zip"), None);

        // QCSONE but non-numeric
        assert_eq!(
            BundleManager::parse_case_number("ABC123_qcsone_download_selected.zip"),
            None
        );
    }

    #[test]
    fn test_import_log_package_case_detection() {
        let (manager, temp) = setup_test_manager();

        // Create a test ZIP with sample logs
        use std::io::Write;
        use zip::write::FileOptions;
        use zip::ZipWriter;

        let zip_path = temp.path().join("700440257_qcsone_download_selected.zip");
        let zip_file = File::create(&zip_path).unwrap();
        let mut zip = ZipWriter::new(zip_file);

        // Add sample log files
        zip.start_file("jabber.log", FileOptions::default())
            .unwrap();
        zip.write_all(b"Sample jabber log content\n").unwrap();

        zip.start_file("cucm.log", FileOptions::default()).unwrap();
        zip.write_all(b"Sample CUCM log content\n").unwrap();

        zip.finish().unwrap();

        // Import the package
        let result = manager.import_log_package(&zip_path, None, None).unwrap();

        // Verify case number was detected
        assert_eq!(result.case_id, Some("700440257".to_string()));
        assert_eq!(result.bundle_name, "Case 700440257");

        // Verify logs were imported
        assert_eq!(result.summary.total_files, 2);
        assert_eq!(result.summary.success_count, 2);

        // Verify bundle exists
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();
        assert_eq!(bundle.metadata.case_id, Some("700440257".to_string()));
        assert!(bundle.metadata.tags.contains(&"source:QCSONE".to_string()));
    }
}
