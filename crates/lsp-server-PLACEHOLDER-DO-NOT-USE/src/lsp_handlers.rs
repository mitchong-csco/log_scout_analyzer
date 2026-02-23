//! LSP handler implementation for bundle operations
//!
//! Implements the actual bundle management via LSP custom requests

use crate::bundle::{BundleAnalyzer, BundleManager, BundleMetadata};
use crate::lsp_types::*;
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Bundle operations handler
pub struct BundleHandler {
    manager: Arc<Mutex<BundleManager>>,
    analyzer: BundleAnalyzer,
}

impl BundleHandler {
    /// Create a new bundle handler
    ///
    /// # Arguments
    /// * `workspace_root` - Root directory of the workspace
    pub fn new(workspace_root: &Path) -> Result<Self, String> {
        let manager = BundleManager::new(workspace_root)
            .map_err(|e| format!("Failed to create bundle manager: {}", e))?;

        Ok(Self {
            manager: Arc::new(Mutex::new(manager)),
            analyzer: BundleAnalyzer::new(),
        })
    }

    /// Handle create bundle request
    pub async fn handle_create_bundle(
        &self,
        params: CreateBundleRequest,
    ) -> Result<CreateBundleResponse, String> {
        let manager = self.manager.lock().await;

        // Build metadata
        let mut metadata = BundleMetadata::default();
        if let Some(case_id) = params.case_id {
            metadata.case_id = Some(case_id);
        }
        if let Some(tags) = params.tags {
            metadata.tags = tags;
        }

        // Create bundle
        let bundle_id = manager
            .create_bundle(params.name.clone(), params.description, Some(metadata))
            .map_err(|e| format!("Failed to create bundle: {}", e))?;

        // Get the created bundle for response
        let bundle = manager
            .get_bundle(&bundle_id)
            .map_err(|e| format!("Failed to retrieve bundle: {}", e))?;

        Ok(CreateBundleResponse {
            bundle_id,
            name: bundle.name,
            created_at: bundle.created_at.to_rfc3339(),
        })
    }

    /// Handle add log request
    pub async fn handle_add_log(
        &self,
        params: AddLogRequest,
    ) -> Result<AddLogResponse, String> {
        let manager = self.manager.lock().await;

        let log_path = Path::new(&params.file_path);

        let bundle_log = manager
            .add_log_to_bundle(&params.bundle_id, log_path)
            .map_err(|e| format!("Failed to add log: {}", e))?;

        // Calculate confidence (using service detector internally)
        let confidence = 0.95; // Placeholder - would come from detector

        Ok(AddLogResponse {
            service: bundle_log.service.to_string(),
            size_bytes: bundle_log.size_bytes,
            line_count: bundle_log.line_count,
            confidence,
        })
    }

    /// Handle list bundles request
    pub async fn handle_list_bundles(
        &self,
        params: ListBundlesRequest,
    ) -> Result<ListBundlesResponse, String> {
        let manager = self.manager.lock().await;

        let bundles = manager
            .list_bundles(params.filter.as_deref())
            .map_err(|e| format!("Failed to list bundles: {}", e))?;

        let summaries = bundles
            .iter()
            .map(|bundle| BundleSummary {
                id: bundle.id.clone(),
                name: bundle.name.clone(),
                description: bundle.description.clone(),
                log_count: bundle.log_count(),
                total_size: bundle.total_size(),
                created_at: bundle.created_at.to_rfc3339(),
                updated_at: bundle.updated_at.to_rfc3339(),
            })
            .collect();

        Ok(ListBundlesResponse { bundles: summaries })
    }

    /// Handle analyze bundle request
    pub async fn handle_analyze_bundle(
        &self,
        params: AnalyzeBundleRequest,
    ) -> Result<AnalyzeBundleResponse, String> {
        let manager = self.manager.lock().await;

        // Get bundle
        let bundle = manager
            .get_bundle(&params.bundle_id)
            .map_err(|e| format!("Failed to get bundle: {}", e))?;

        // Run analysis
        let result = self
            .analyzer
            .analyze_bundle(&bundle)
            .map_err(|e| format!("Failed to analyze bundle: {}", e))?;

        // Extract services
        let services: Vec<String> = result.by_service.keys().cloned().collect();

        Ok(AnalyzeBundleResponse {
            bundle_id: result.bundle_id,
            total_detections: result.statistics.total_detections,
            by_severity: SeverityCounts {
                error: result.statistics.error_count,
                warning: result.statistics.warning_count,
                info: result.statistics.info_count,
            },
            services,
            duration_ms: result.duration_ms,
        })
    }

    /// Handle delete bundle request
    pub async fn handle_delete_bundle(
        &self,
        params: DeleteBundleRequest,
    ) -> Result<DeleteBundleResponse, String> {
        let manager = self.manager.lock().await;

        manager
            .delete_bundle(&params.bundle_id)
            .map_err(|e| format!("Failed to delete bundle: {}", e))?;

        Ok(DeleteBundleResponse {
            success: true,
            bundle_id: params.bundle_id,
        })
    }

    /// Handle get bundle request
    pub async fn handle_get_bundle(
        &self,
        params: GetBundleRequest,
    ) -> Result<GetBundleResponse, String> {
        let manager = self.manager.lock().await;

        let bundle = manager
            .get_bundle(&params.bundle_id)
            .map_err(|e| format!("Failed to get bundle: {}", e))?;

        let logs = bundle
            .logs
            .iter()
            .map(|log| LogInfo {
                uri: log.uri.clone(),
                service: log.service.to_string(),
                size_bytes: log.size_bytes,
                line_count: log.line_count,
                added_at: log.added_at.to_rfc3339(),
            })
            .collect();

        Ok(GetBundleResponse {
            id: bundle.id,
            name: bundle.name,
            description: bundle.description,
            logs,
            created_at: bundle.created_at.to_rfc3339(),
            updated_at: bundle.updated_at.to_rfc3339(),
        })
    }

    /// Handle import log package request (QCSONE smart import)
    ///
    /// Automatically extracts archive and detects case number from filename
    pub async fn handle_import_package(
        &self,
        params: ImportPackageRequest,
    ) -> Result<ImportPackageResponse, String> {
        let manager = self.manager.lock().await;

        let package_path = Path::new(&params.package_path);

        let result = manager
            .import_log_package(
                package_path,
                params.bundle_name,
                params.case_id,
            )
            .map_err(|e| format!("Failed to import package: {}", e))?;

        let by_service = result.summary.by_service();

        Ok(ImportPackageResponse {
            bundle_id: result.bundle_id,
            bundle_name: result.bundle_name,
            case_id: result.case_id,
            total_files: result.summary.total_files,
            imported_count: result.summary.success_count,
            failed_count: result.summary.failed_files.len(),
            services_detected: by_service.keys().cloned().collect(),
            service_counts: by_service,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    async fn setup_handler() -> (BundleHandler, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let handler = BundleHandler::new(temp_dir.path()).unwrap();
        (handler, temp_dir)
    }

    #[tokio::test]
    async fn test_create_bundle() {
        let (handler, _temp) = setup_handler().await;

        let request = CreateBundleRequest {
            name: "Test Bundle".to_string(),
            description: Some("Test".to_string()),
            case_id: Some("INC-123".to_string()),
            tags: Some(vec!["test".to_string()]),
        };

        let response = handler.handle_create_bundle(request).await.unwrap();

        assert!(response.bundle_id.starts_with("bundle_"));
        assert_eq!(response.name, "Test Bundle");
    }

    #[tokio::test]
    async fn test_list_empty_bundles() {
        let (handler, _temp) = setup_handler().await;

        let request = ListBundlesRequest { filter: None };
        let response = handler.handle_list_bundles(request).await.unwrap();

        assert_eq!(response.bundles.len(), 0);
    }

    #[tokio::test]
    async fn test_list_bundles_with_filter() {
        let (handler, _temp) = setup_handler().await;

        // Create bundles
        handler
            .handle_create_bundle(CreateBundleRequest {
                name: "Test Bundle 1".to_string(),
                description: None,
                case_id: None,
                tags: None,
            })
            .await
            .unwrap();

        handler
            .handle_create_bundle(CreateBundleRequest {
                name: "Other Bundle".to_string(),
                description: None,
                case_id: None,
                tags: None,
            })
            .await
            .unwrap();

        // List with filter
        let response = handler
            .handle_list_bundles(ListBundlesRequest {
                filter: Some("Test".to_string()),
            })
            .await
            .unwrap();

        assert_eq!(response.bundles.len(), 1);
        assert_eq!(response.bundles[0].name, "Test Bundle 1");
    }

    #[tokio::test]
    async fn test_delete_bundle() {
        let (handler, _temp) = setup_handler().await;

        // Create bundle
        let create_response = handler
            .handle_create_bundle(CreateBundleRequest {
                name: "To Delete".to_string(),
                description: None,
                case_id: None,
                tags: None,
            })
            .await
            .unwrap();

        // Delete it
        let delete_response = handler
            .handle_delete_bundle(DeleteBundleRequest {
                bundle_id: create_response.bundle_id.clone(),
            })
            .await
            .unwrap();

        assert!(delete_response.success);
    }

    #[tokio::test]
    async fn test_get_bundle() {
        let (handler, _temp) = setup_handler().await;

        // Create bundle
        let create_response = handler
            .handle_create_bundle(CreateBundleRequest {
                name: "Get Test".to_string(),
                description: Some("Description".to_string()),
                case_id: None,
                tags: None,
            })
            .await
            .unwrap();

        // Get it
        let get_response = handler
            .handle_get_bundle(GetBundleRequest {
                bundle_id: create_response.bundle_id,
            })
            .await
            .unwrap();

        assert_eq!(get_response.name, "Get Test");
        assert_eq!(get_response.description, Some("Description".to_string()));
        assert_eq!(get_response.logs.len(), 0);
    }

    #[tokio::test]
    async fn test_analyze_empty_bundle() {
        let (handler, _temp) = setup_handler().await;

        // Create bundle
        let create_response = handler
            .handle_create_bundle(CreateBundleRequest {
                name: "Empty".to_string(),
                description: None,
                case_id: None,
                tags: None,
            })
            .await
            .unwrap();

        // Analyze it
        let analyze_response = handler
            .handle_analyze_bundle(AnalyzeBundleRequest {
                bundle_id: create_response.bundle_id,
            })
            .await
            .unwrap();

        assert_eq!(analyze_response.total_detections, 0);
        assert!(analyze_response.duration_ms >= 0);
    }
}
