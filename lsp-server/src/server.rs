//! LSP Server Implementation
//!
//! Implements the Language Server Protocol for log file analysis.

const LSP_VERSION: &str = env!("CARGO_PKG_VERSION");

use crate::bundle::BundleManager;
use crate::notifications::NotificationManager;
use crate::pattern_engine::{Detection, PatternEngine, Severity};
use crate::pattern_loader;
use crate::tagscout::{SyncMode, SyncService, SyncServiceConfig};

use dashmap::DashMap;
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_lsp::jsonrpc::{Error as JsonRpcError, Result};
use tower_lsp::lsp_types::notification::Progress;
use tower_lsp::lsp_types::*;
use tower_lsp::lsp_types::{
    NumberOrString, ProgressParams, ProgressParamsValue, WorkDoneProgress, WorkDoneProgressBegin,
    WorkDoneProgressEnd, WorkDoneProgressReport,
};
use tower_lsp::{Client, LanguageServer};

/// Main LSP server structure
#[derive(Clone)]
pub struct LogScoutServer {
    client: Client,
    notifier: NotificationManager,
    pattern_engine: Arc<RwLock<Option<PatternEngine>>>,
    tagscout_service: Arc<RwLock<Option<SyncService>>>,
    documents: Arc<DashMap<Url, String>>,
    workspace_path: Arc<RwLock<Option<String>>>,
    bundle_manager: Arc<RwLock<Option<BundleManager>>>,
}

impl LogScoutServer {
    /// Create a new LSP server instance
    pub fn new(client: Client) -> Self {
        // Initialize notification manager
        let notifier = NotificationManager::new(client.clone());

        // No default patterns - rely entirely on TagScout
        let pattern_engine = Self::load_default_patterns();

        if pattern_engine.is_some() {
            tracing::info!("Pattern engine initialized with default patterns");
        } else {
            tracing::info!("Pattern engine will be initialized after TagScout patterns load");
        }

        Self {
            client,
            notifier,
            pattern_engine: Arc::new(RwLock::new(pattern_engine)),
            tagscout_service: Arc::new(RwLock::new(None)),
            documents: Arc::new(DashMap::new()),
            workspace_path: Arc::new(RwLock::new(None)),
            bundle_manager: Arc::new(RwLock::new(None)),
        }
    }

    /// Initialize TagScout integration
    pub async fn initialize_tagscout(&self) -> std::result::Result<(), String> {
        tracing::info!("Initializing TagScout integration");

        // Configure sync service with cache-first mode for offline support
        let mut config = SyncServiceConfig::default();
        config.sync_mode = SyncMode::CacheFirst; // Try cache first, fallback to MongoDB
        config.cache_ttl_seconds = 3600; // 1 hour cache
        config.auto_refresh_interval = Some(300); // Auto-refresh every 5 minutes

        let mut service = SyncService::new(config)
            .await
            .map_err(|e| format!("Failed to initialize TagScout: {}", e))?;

        // Perform initial sync (from cache or MongoDB)
        let result = service
            .initialize()
            .await
            .map_err(|e| format!("TagScout sync failed: {}", e))?;

        tracing::info!(
            "TagScout initialized: {} patterns loaded {} (age: {}ms)",
            result.patterns_fetched,
            if result.from_cache {
                "from cache"
            } else {
                "from MongoDB"
            },
            result.duration_ms
        );

        // Load patterns into engine
        let patterns = service
            .get_patterns()
            .await
            .map_err(|e| format!("Failed to get patterns: {}", e))?;

        if !patterns.is_empty() {
            // Apply pattern overrides
            let workspace_path_opt = self.workspace_path.read().await.clone();
            let patterns_with_overrides =
                pattern_loader::apply_overrides(patterns, workspace_path_opt.as_deref())
                    .map_err(|e| format!("Failed to apply pattern overrides: {}", e))?;

            let engine = PatternEngine::new(patterns_with_overrides, 0.7, 10)
                .map_err(|e| format!("Failed to create pattern engine: {}", e))?;

            *self.pattern_engine.write().await = Some(engine);
            tracing::info!("Pattern engine updated with TagScout patterns and overrides");
        }

        // Store service
        *self.tagscout_service.write().await = Some(service);
        tracing::info!("TagScout service stored successfully");

        Ok(())
    }

    /// Refresh patterns from TagScout
    pub async fn refresh_tagscout_patterns(&self) -> std::result::Result<usize, String> {
        // Clone the Arc to avoid holding the lock across await
        let service_opt = {
            let guard = self.tagscout_service.read().await;
            guard.as_ref().map(|_| ())
        };

        if service_opt.is_some() {
            let guard = self.tagscout_service.read().await;
            let service = guard.as_ref().unwrap();

            let result = service
                .sync()
                .await
                .map_err(|e| format!("Sync failed: {}", e))?;

            tracing::info!(
                "Refreshed {} patterns from TagScout",
                result.patterns_fetched
            );

            // Update pattern engine
            let patterns = service
                .get_patterns()
                .await
                .map_err(|e| format!("Failed to get patterns: {}", e))?;

            let count = patterns.len();
            if !patterns.is_empty() {
                // Apply pattern overrides
                let workspace_path_opt = self.workspace_path.read().await.clone();
                let patterns_with_overrides =
                    pattern_loader::apply_overrides(patterns, workspace_path_opt.as_deref())
                        .map_err(|e| format!("Failed to apply pattern overrides: {}", e))?;

                let engine = PatternEngine::new(patterns_with_overrides, 0.7, 10)
                    .map_err(|e| format!("Failed to update engine: {}", e))?;
                *self.pattern_engine.write().await = Some(engine);
                Ok(count)
            } else {
                Ok(0)
            }
        } else {
            Err("TagScout service not initialized".to_string())
        }
    }

    /// Load default pattern set (fallback when TagScout unavailable)
    fn load_default_patterns() -> Option<PatternEngine> {
        // No default patterns - rely entirely on TagScout for meaningful categorization
        // Return None to ensure no pattern engine is initialized until TagScout loads
        None
    }

    /// Send progress notification to client
    async fn _send_progress(&self, token: &str, message: &str, percentage: u32) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(WorkDoneProgress::Report(
                WorkDoneProgressReport {
                    cancellable: Some(true),
                    message: Some(message.to_string()),
                    percentage: Some(percentage),
                },
            )),
        };

        self.client.send_notification::<Progress>(params).await;
    }

    /// Begin progress notification
    async fn begin_progress(&self, token: &str, title: &str) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(WorkDoneProgress::Begin(WorkDoneProgressBegin {
                title: title.to_string(),
                cancellable: Some(true),
                message: Some("Starting...".to_string()),
                percentage: Some(0),
            })),
        };

        self.client.send_notification::<Progress>(params).await;
    }

    /// End progress notification
    async fn end_progress(&self, token: &str, message: &str) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(WorkDoneProgress::End(WorkDoneProgressEnd {
                message: Some(message.to_string()),
            })),
        };

        self.client.send_notification::<Progress>(params).await;
    }

    /// Re-analyze all open documents and publish diagnostics
    async fn reanalyze_all_documents(&self) -> usize {
        let mut re_analyzed = 0;
        let document_urls: Vec<Url> = self
            .documents
            .iter()
            .map(|entry| entry.key().clone())
            .collect();

        for url in document_urls {
            if let Some(content) = self.documents.get(&url) {
                let text = content.value().clone();
                let total_lines = text.lines().count();

                tracing::debug!("Re-analyzing document: {}", url);

                // Analyze the document
                let diagnostics = self.analyze_text(&text, url.as_str(), total_lines).await;

                // Publish diagnostics
                self.client
                    .publish_diagnostics(url.clone(), diagnostics, None)
                    .await;

                re_analyzed += 1;
            }
        }

        tracing::info!("Re-analyzed {} documents", re_analyzed);
        re_analyzed
    }

    /// Analyze text and return diagnostics (shared by push and pull)
    async fn analyze_text(&self, text: &str, _uri: &str, total_lines: usize) -> Vec<Diagnostic> {
        let engine_guard = self.pattern_engine.read().await;
        if let Some(engine) = engine_guard.as_ref() {
            let mut all_detections = Vec::new();
            let mut processed = 0;

            // STAGE 1: Pattern Matching - Analyze each line
            for (line_num, line) in text.lines().enumerate() {
                let detections = engine.process_line(line, line_num);
                all_detections.extend(detections);
                processed += 1;

                // Report progress every 1000 lines
                if processed % 1000 == 0 {
                    let percentage = (processed as f64 / total_lines as f64 * 100.0) as u32;
                    self.client
                        .log_message(
                            MessageType::LOG,
                            &format!(
                                "Analyzing: {}% ({}/{} lines)",
                                percentage, processed, total_lines
                            ),
                        )
                        .await;
                }
            }

            tracing::info!(
                "Found {} detections (before deduplication)",
                all_detections.len()
            );

            // TODO: STAGE 2: Signature Detection - Group patterns in same category
            // let signatures = signature_engine.detect(&all_detections);

            // TODO: STAGE 3: Process Correlation - Identify functional flows
            // let processes = process_engine.correlate(&signatures);

            // TODO: STAGE 4: Scenario Analysis - Cross-category event correlation
            // let scenarios = scenario_engine.analyze(&processes);

            // STAGE 5: Deduplication - Remove overlapping pattern matches
            all_detections = Self::deduplicate_detections(all_detections);

            tracing::info!(
                "Found {} unique detections (after deduplication)",
                all_detections.len()
            );

            // TODO: STAGE 6: Remediation - Generate action plans for deduplicated issues
            // let remediations = remediation_engine.recommend(&all_detections, &signatures, &scenarios);

            // STAGE 7: Diagnostic Creation - Convert to LSP diagnostics
            all_detections
                .into_iter()
                .map(|detection| self.detection_to_diagnostic(&detection))
                .collect()
        } else {
            tracing::warn!("No pattern engine available");
            vec![]
        }
    }

    /// Deduplicate detections that overlap on the same line
    ///
    /// When multiple patterns match the same location (line + column range),
    /// keep only the one with the highest severity. This handles cases where
    /// TagScout has multiple patterns with the same regex but different templates
    /// (e.g., HTTP success vs error patterns that both match any HTTP response).
    ///
    /// Future stages (signatures, scenarios) will see ALL matches before deduplication,
    /// so they have full context for analysis.
    fn deduplicate_detections(
        detections: Vec<crate::pattern_engine::Detection>,
    ) -> Vec<crate::pattern_engine::Detection> {
        use std::collections::HashMap;

        // Group detections by line and column range
        let mut grouped: HashMap<(usize, (usize, usize)), Vec<crate::pattern_engine::Detection>> =
            HashMap::new();

        for detection in detections {
            let key = (detection.line_number, detection.column_range);
            grouped.entry(key).or_insert_with(Vec::new).push(detection);
        }

        // For each group, keep only the highest severity
        let mut deduplicated = Vec::new();
        for (_, mut group) in grouped {
            if group.len() == 1 {
                deduplicated.push(group.pop().unwrap());
            } else {
                // Sort by severity (Error > Warning > Info > Hint)
                group.sort_by_key(|d| match d.final_severity {
                    crate::pattern_engine::Severity::Error => 0,
                    crate::pattern_engine::Severity::Warning => 1,
                    crate::pattern_engine::Severity::Info => 2,
                    crate::pattern_engine::Severity::Hint => 3,
                });

                // Keep the highest severity (first after sorting)
                if let Some(highest) = group.into_iter().next() {
                    deduplicated.push(highest);
                }
            }
        }

        // Sort by line number to maintain document order
        deduplicated.sort_by_key(|d| d.line_number);

        deduplicated
    }

    /// Analyze document and publish diagnostics (push mode)
    async fn analyze_and_publish(&self, uri: &Url, text: &str) {
        tracing::debug!("Analyzing document (push): {}", uri);

        // Send status notification
        self.client
            .log_message(MessageType::INFO, &format!("🔍 Analyzing {}", uri.path()))
            .await;

        let total_lines = text.lines().count();
        let diagnostics = self.analyze_text(text, uri.as_str(), total_lines).await;

        // Publish diagnostics to client
        let count = diagnostics.len();
        self.client
            .publish_diagnostics(uri.clone(), diagnostics, None)
            .await;

        // Notify analysis complete
        let file_name = uri.path().split('/').last().unwrap_or("file");
        self.notifier
            .notify_analysis_complete(file_name, count)
            .await;
    }

    /// Replace template placeholders like {{ fieldName }} with actual values from field_values
    /// Handles all spacing variations: {{CODE}}, {{ CODE }}, {{ CODE}}, {{CODE }}
    fn substitute_template(
        template: &str,
        field_values: &std::collections::HashMap<String, String>,
    ) -> String {
        use regex::Regex;

        tracing::info!("=== SUBSTITUTE_TEMPLATE ===");
        tracing::info!("  Input template: '{}'", template);
        tracing::info!("  Field values: {:?}", field_values);

        let mut result = template.to_string();

        // Replace each placeholder with the actual value
        for (field_name, field_value) in field_values {
            // Create regex to match {{optional_spaces field_name optional_spaces}}
            // This handles: {{CODE}}, {{ CODE }}, {{ CODE}}, {{CODE }}, etc.
            let pattern_str = format!(r"\{{\{{\s*{}\s*\}}\}}", regex::escape(field_name));
            if let Ok(re) = Regex::new(&pattern_str) {
                let before = result.clone();
                result = re.replace_all(&result, field_value.as_str()).to_string();
                if before != result {
                    tracing::info!("  Replaced {{{{ {} }}}} with '{}'", field_name, field_value);
                }
            }
        }

        // Keep unsubstituted placeholders as-is (shows {{ FIELD }} instead of [...])
        // This makes it clear which fields weren't extracted

        tracing::info!("  Output result: '{}'", result);
        tracing::info!("=== END SUBSTITUTE_TEMPLATE ===");

        result
    }

    /// Convert a Detection to an LSP Diagnostic
    fn detection_to_diagnostic(&self, detection: &Detection) -> Diagnostic {
        let severity = match detection.pattern.severity {
            Severity::Error => DiagnosticSeverity::ERROR,
            Severity::Warning => DiagnosticSeverity::WARNING,
            Severity::Info => DiagnosticSeverity::INFORMATION,
            Severity::Hint => DiagnosticSeverity::HINT,
        };

        let (start_col, end_col) = detection.column_range;

        // Substitute template placeholders in category
        let category =
            Self::substitute_template(&detection.pattern.category, &detection.field_values);

        // Get raw template from pattern (the message template from TagScout)
        let template = if detection.pattern.annotation.is_empty() {
            "(missing)".to_string()
        } else {
            detection.pattern.annotation.clone()
        };

        tracing::info!("=== COMPUTING MERGED_TEMPLATE ===");
        tracing::info!("  Pattern name: {}", detection.pattern.name);
        tracing::info!("  Template: '{}'", template);
        tracing::info!("  Field values count: {}", detection.field_values.len());

        // Create merged template - template with substituted values
        let merged_template = if template == "(missing)" {
            tracing::error!(
                "  Template is MISSING for pattern '{}' - this pattern requires an annotation",
                detection.pattern.id
            );
            template.clone() // Diagnostic message will be "(missing)"
        } else {
            // Substitute field values into template
            let substituted = Self::substitute_template(&template, &detection.field_values);
            tracing::info!(
                "  Successfully computed merged_template from template: '{}'",
                substituted
            );
            substituted
        };

        tracing::info!("  Final merged_template: '{}'", merged_template);
        tracing::info!("=== END COMPUTING MERGED_TEMPLATE ===");

        // Build diagnostic data with complete information
        let mut data_map = serde_json::Map::new();

        // Include ALL original TagScout annotation fields if available
        if let Some(ref tagscout_metadata) = detection.pattern.tagscout_metadata {
            if let serde_json::Value::Object(metadata_map) = tagscout_metadata {
                // Copy all original TagScout fields
                for (key, value) in metadata_map {
                    data_map.insert(key.clone(), value.clone());
                }
            }
        }

        // Build extracted_parameters as list of key-value pairs
        let extracted_params: Vec<serde_json::Value> = detection
            .field_values
            .iter()
            .map(|(name, value)| {
                let mut param = serde_json::Map::new();
                param.insert("name".to_string(), serde_json::Value::String(name.clone()));
                param.insert(
                    "value".to_string(),
                    serde_json::Value::String(value.clone()),
                );
                serde_json::Value::Object(param)
            })
            .collect();

        // Add/override with detection-specific fields using TagScout naming conventions
        tracing::info!("=== BUILDING DIAGNOSTIC DATA ===");
        tracing::info!("  template: '{}'", template);
        tracing::info!("  merged_template: '{}'", merged_template);
        tracing::info!("  log_line (matched): '{}'", detection.matched_text);

        // Core fields: template and merged result
        data_map.insert(
            "template".to_string(),
            serde_json::Value::String(template.clone()),
        );
        data_map.insert(
            "merged_template".to_string(),
            serde_json::Value::String(merged_template.clone()),
        );

        // Source information
        data_map.insert(
            "log_line".to_string(),
            serde_json::Value::String(detection.context.first().cloned().unwrap_or_default()),
        );

        // Extracted parameters as list of {name, value} objects
        data_map.insert(
            "extracted_parameters".to_string(),
            serde_json::Value::Array(extracted_params),
        );

        // Pattern metadata
        data_map.insert(
            "pattern_id".to_string(),
            serde_json::Value::String(detection.pattern.id.clone()),
        );
        data_map.insert(
            "pattern_name".to_string(),
            serde_json::Value::String(detection.pattern.name.clone()),
        );
        data_map.insert(
            "category".to_string(),
            serde_json::Value::String(category.clone()),
        );

        // Debugging information
        data_map.insert(
            "matched_text".to_string(),
            serde_json::Value::String(detection.matched_text.clone()),
        );
        data_map.insert(
            "pattern_regex".to_string(),
            serde_json::Value::String(detection.pattern.pattern.clone()),
        );

        // Include timestamp if present
        if let Some(ref timestamp) = detection.timestamp {
            data_map.insert(
                "timestamp".to_string(),
                serde_json::Value::String(timestamp.clone()),
            );
        }

        // Include log level if present
        if let Some(ref log_level) = detection.log_level {
            data_map.insert(
                "log_level".to_string(),
                serde_json::Value::String(format!("{:?}", log_level)),
            );
        }

        tracing::info!("  Data map has {} keys", data_map.len());
        tracing::info!("=== END BUILDING DIAGNOSTIC DATA ===");

        Diagnostic {
            range: Range {
                start: Position {
                    line: detection.line_number as u32,
                    character: start_col as u32,
                },
                end: Position {
                    line: detection.line_number as u32,
                    character: end_col as u32,
                },
            },
            severity: Some(severity),
            code: Some(NumberOrString::String(detection.pattern.id.clone())),
            code_description: None,
            source: Some("log-scout".to_string()),
            message: merged_template, // Main message is the merged template (substituted values)
            related_information: None,
            tags: None,
            data: Some(serde_json::Value::Object(data_map)),
        }
    }

    /// Initialize bundle manager
    async fn initialize_bundle_manager(
        &self,
        workspace_path: &str,
    ) -> std::result::Result<(), String> {
        tracing::info!("Initializing bundle manager at: {}", workspace_path);

        let manager = BundleManager::new(std::path::Path::new(workspace_path))
            .map_err(|e| format!("Failed to create bundle manager: {}", e))?;

        *self.bundle_manager.write().await = Some(manager);
        tracing::info!("Bundle manager initialized successfully");

        Ok(())
    }

    /// Handle custom bundle requests
    async fn handle_bundle_request(&self, method: &str, params: Value) -> Result<Value> {
        let manager_opt = self.bundle_manager.read().await;
        let manager = manager_opt
            .as_ref()
            .ok_or_else(|| JsonRpcError::method_not_found())?;

        match method {
            "scout/bundle/list" => {
                tracing::info!("Handling scout/bundle/list request");
                let bundles = manager
                    .list_bundles(None, None, None)
                    .map_err(|_e| JsonRpcError::internal_error())?;

                let response = serde_json::json!({
                    "bundles": bundles.iter().map(|b| {
                        serde_json::json!({
                            "id": b.id,
                            "name": b.name,
                            "logCount": b.log_count,
                            "createdAt": b.created_at,
                            "updatedAt": b.updated_at,
                            "caseId": b.case_id,
                            "owner": b.owner,
                            "tags": b.tags,
                            "analysisStatus": b.analysis_status,
                        })
                    }).collect::<Vec<_>>()
                });

                tracing::info!("Returning {} bundles", bundles.len());
                Ok(response)
            }

            "scout/bundle/get" => {
                #[derive(Deserialize)]
                struct GetBundleParams {
                    #[serde(rename = "bundleId")]
                    bundle_id: String,
                }

                let params: GetBundleParams = serde_json::from_value(params)
                    .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

                tracing::info!(
                    "Handling scout/bundle/get request for: {}",
                    params.bundle_id
                );

                let bundle = manager
                    .get_bundle(&params.bundle_id)
                    .map_err(|_| JsonRpcError::method_not_found())?;

                let response = serde_json::json!({
                    "id": bundle.id,
                    "name": bundle.name,
                    "description": bundle.description,
                    "logs": bundle.logs.iter().map(|log| {
                        serde_json::json!({
                            "uri": log.uri,
                            "service": format!("{:?}", log.service),
                            "logType": format!("{:?}", log.log_type),
                            "sizeBytes": log.size_bytes,
                            "lineCount": log.line_count,
                            "addedAt": log.added_at,
                        })
                    }).collect::<Vec<_>>(),
                    "createdAt": bundle.created_at,
                    "updatedAt": bundle.updated_at,
                });

                Ok(response)
            }

            "scout/bundle/create" => {
                #[derive(Deserialize)]
                struct CreateBundleParams {
                    name: String,
                    description: Option<String>,
                }

                let params: CreateBundleParams = serde_json::from_value(params)
                    .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

                tracing::info!("Creating bundle: {}", params.name);

                // Need mutable access
                drop(manager_opt);
                let mut manager_guard = self.bundle_manager.write().await;
                let manager_mut = manager_guard
                    .as_mut()
                    .ok_or_else(|| JsonRpcError::method_not_found())?;

                let bundle_id = manager_mut
                    .create_bundle(params.name, params.description, None)
                    .map_err(|_| JsonRpcError::internal_error())?;

                let response = serde_json::json!({
                    "bundleId": bundle_id
                });

                Ok(response)
            }

            "scout/bundle/importPackage" => {
                #[derive(Deserialize)]
                struct ImportPackageParams {
                    #[serde(rename = "packagePath")]
                    package_path: String,
                    #[serde(rename = "bundleName")]
                    bundle_name: Option<String>,
                    #[serde(rename = "caseId")]
                    case_id: Option<String>,
                    #[serde(rename = "progressToken")]
                    progress_token: Option<String>,
                }

                let params: ImportPackageParams = serde_json::from_value(params).map_err(|e| {
                    tracing::error!("Failed to parse import params: {}", e);
                    JsonRpcError::invalid_params("Invalid parameters".to_string())
                })?;

                // Generate progress token if not provided
                let progress_token = params
                    .progress_token
                    .unwrap_or_else(|| format!("import_{}", uuid::Uuid::new_v4()));

                tracing::info!(
                    "Importing package: {} (token: {})",
                    params.package_path,
                    progress_token
                );

                // Begin progress
                self.begin_progress(&progress_token, "Importing Archive")
                    .await;

                // Need mutable access to bundle manager
                drop(manager_opt);
                let mut manager_guard = self.bundle_manager.write().await;
                let manager_mut = manager_guard.as_mut().ok_or_else(|| {
                    tracing::error!("Bundle manager not initialized");
                    JsonRpcError::method_not_found()
                })?;

                // Create progress callback
                let client = Arc::new(self.client.clone());
                let token = progress_token.clone();
                let progress_callback: Box<dyn Fn(&str, u32) + Send + Sync> =
                    Box::new(move |message: &str, percentage: u32| {
                        let client = Arc::clone(&client);
                        let token = token.clone();
                        let message = message.to_string();

                        tokio::spawn(async move {
                            let params = ProgressParams {
                                token: NumberOrString::String(token),
                                value: ProgressParamsValue::WorkDone(WorkDoneProgress::Report(
                                    WorkDoneProgressReport {
                                        cancellable: Some(true),
                                        message: Some(message),
                                        percentage: Some(percentage),
                                    },
                                )),
                            };
                            client.send_notification::<Progress>(params).await;
                        });
                    });

                // Import the package with progress
                let result = manager_mut
                    .import_log_package_with_progress(
                        std::path::Path::new(&params.package_path),
                        params.bundle_name,
                        params.case_id,
                        progress_callback,
                    )
                    .map_err(|e| {
                        tracing::error!("Import failed: {}", e);
                        JsonRpcError::internal_error()
                    })?;

                // End progress
                self.end_progress(
                    &progress_token,
                    &format!("Imported {} files", result.success_count),
                )
                .await;

                // Build response
                let response = serde_json::json!({
                    "bundleId": result.bundle_id,
                    "bundleName": result.bundle_name,
                    "caseId": result.case_id,
                    "importedCount": result.success_count,
                    "totalFiles": result.total_files,
                    "failedFiles": result.failed_files.len(),
                });

                tracing::info!(
                    "Package imported successfully: {} files",
                    result.success_count
                );
                Ok(response)
            }

            "scout/bundle/addLog" => {
                #[derive(Deserialize)]
                struct AddLogParams {
                    #[serde(rename = "bundleId")]
                    bundle_id: String,
                    #[serde(rename = "filePath")]
                    file_path: String,
                }

                let params: AddLogParams = serde_json::from_value(params)
                    .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

                tracing::info!(
                    "Adding log to bundle {}: {}",
                    params.bundle_id,
                    params.file_path
                );

                drop(manager_opt);
                let mut manager_guard = self.bundle_manager.write().await;
                let manager_mut = manager_guard
                    .as_mut()
                    .ok_or_else(|| JsonRpcError::method_not_found())?;

                // BundleManager::add_log_to_bundle signature: (bundle_id, log_uri, service, log_type)
                let log = manager_mut
                    .add_log_to_bundle(&params.bundle_id, &params.file_path, None, None)
                    .map_err(|e| {
                        tracing::error!("Failed to add log: {}", e);
                        JsonRpcError::internal_error()
                    })?;

                let response = serde_json::json!({
                    "service": format!("{:?}", log.service),
                    "logType": format!("{:?}", log.log_type),
                    "sizeBytes": log.size_bytes,
                    "lineCount": log.line_count,
                });

                Ok(response)
            }

            "scout/bundle/delete" => {
                #[derive(Deserialize)]
                struct DeleteParams {
                    #[serde(rename = "bundleId")]
                    bundle_id: String,
                }

                let params: DeleteParams = serde_json::from_value(params)
                    .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

                tracing::info!("Deleting bundle: {}", params.bundle_id);

                drop(manager_opt);
                let mut manager_guard = self.bundle_manager.write().await;
                let manager_mut = manager_guard
                    .as_mut()
                    .ok_or_else(|| JsonRpcError::method_not_found())?;

                manager_mut.delete_bundle(&params.bundle_id).map_err(|e| {
                    tracing::error!("Failed to delete bundle: {}", e);
                    JsonRpcError::internal_error()
                })?;

                let response = serde_json::json!({
                    "success": true,
                    "bundleId": params.bundle_id,
                });

                Ok(response)
            }

            "scout/bundle/analyze" => {
                #[derive(Deserialize)]
                struct AnalyzeParams {
                    #[serde(rename = "bundleId")]
                    bundle_id: String,
                }

                let params: AnalyzeParams = serde_json::from_value(params)
                    .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

                tracing::info!("Analyzing bundle: {}", params.bundle_id);

                let bundle = manager.get_bundle(&params.bundle_id).map_err(|e| {
                    tracing::error!("Failed to get bundle: {}", e);
                    JsonRpcError::method_not_found()
                })?;

                // Analyze each log file in the bundle
                let mut total_detections = 0;
                let mut error_count = 0;
                let mut warning_count = 0;
                let mut info_count = 0;

                let engine_guard = self.pattern_engine.read().await;
                if let Some(engine) = engine_guard.as_ref() {
                    for log in &bundle.logs {
                        // Read log file and analyze
                        if let Ok(content) = tokio::fs::read_to_string(&log.uri).await {
                            // Process each line
                            for (line_num, line) in content.lines().enumerate() {
                                let detections = engine.process_line(line, line_num);
                                total_detections += detections.len();

                                for detection in detections {
                                    match detection.pattern.severity {
                                        Severity::Error => error_count += 1,
                                        Severity::Warning => warning_count += 1,
                                        Severity::Info => info_count += 1,
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                }

                let response = serde_json::json!({
                    "bundleId": params.bundle_id,
                    "totalDetections": total_detections,
                    "errorCount": error_count,
                    "warningCount": warning_count,
                    "infoCount": info_count,
                    "logCount": bundle.logs.len(),
                });

                tracing::info!("Analysis complete: {} detections", total_detections);
                Ok(response)
            }

            _ => {
                tracing::warn!("Unknown bundle request: {}", method);
                Err(JsonRpcError::method_not_found())
            }
        }
    }
}

#[tower_lsp::async_trait]
impl LanguageServer for LogScoutServer {
    async fn initialize(&self, params: InitializeParams) -> Result<InitializeResult> {
        tracing::info!("Client initializing LSP server");

        // Capture workspace path for pattern overrides
        if let Some(workspace_folders) = params.workspace_folders {
            if let Some(folder) = workspace_folders.first() {
                let path = folder.uri.to_file_path().ok();
                if let Some(path_str) = path.as_ref().and_then(|p| p.to_str()) {
                    *self.workspace_path.write().await = Some(path_str.to_string());
                    tracing::info!("Workspace path set to: {}", path_str);
                }
            }
        } else if let Some(root_uri) = params.root_uri {
            if let Ok(path) = root_uri.to_file_path() {
                if let Some(path_str) = path.to_str() {
                    *self.workspace_path.write().await = Some(path_str.to_string());
                    tracing::info!("Workspace path set from root_uri: {}", path_str);
                }
            }
        }

        Ok(InitializeResult {
            capabilities: ServerCapabilities {
                text_document_sync: Some(TextDocumentSyncCapability::Kind(
                    TextDocumentSyncKind::INCREMENTAL,
                )),
                diagnostic_provider: Some(DiagnosticServerCapabilities::Options(
                    DiagnosticOptions {
                        identifier: Some("log-scout".to_string()),
                        inter_file_dependencies: false,
                        workspace_diagnostics: false,
                        work_done_progress_options: WorkDoneProgressOptions {
                            work_done_progress: Some(true),
                        },
                    },
                )),
                code_action_provider: Some(CodeActionProviderCapability::Simple(true)),
                execute_command_provider: Some(ExecuteCommandOptions {
                    commands: vec![
                        "logScout.analyze".to_string(),
                        "logScout.showTimeline".to_string(),
                        "logScout.exportResults".to_string(),
                        "logScout.refreshPatterns".to_string(),
                        "logScout.reloadPatterns".to_string(),
                        "logScout.getPatterns".to_string(),
                    ],
                    work_done_progress_options: WorkDoneProgressOptions {
                        work_done_progress: Some(true),
                    },
                }),
                hover_provider: Some(HoverProviderCapability::Simple(true)),
                document_symbol_provider: Some(OneOf::Left(true)),
                completion_provider: Some(CompletionOptions {
                    trigger_characters: Some(vec!["[".to_string(), " ".to_string()]),
                    resolve_provider: Some(false),
                    ..Default::default()
                }),
                ..Default::default()
            },
            server_info: Some(ServerInfo {
                name: "Log Scout Analyzer".to_string(),
                version: Some(LSP_VERSION.to_string()),
            }),
        })
    }

    async fn initialized(&self, _params: InitializedParams) {
        tracing::info!("LSP server initialized successfully");
        self.client
            .log_message(MessageType::INFO, "Log Scout Analyzer ready!")
            .await;

        // Initialize bundle manager if workspace path is available
        let workspace_path_opt = self.workspace_path.read().await.clone();
        if let Some(workspace_path) = workspace_path_opt {
            if let Err(e) = self.initialize_bundle_manager(&workspace_path).await {
                tracing::error!("Failed to initialize bundle manager: {}", e);
                self.client
                    .log_message(
                        MessageType::WARNING,
                        &format!("Bundle manager initialization failed: {}", e),
                    )
                    .await;
            } else {
                tracing::info!("Bundle manager initialized successfully");
            }
        } else {
            tracing::warn!("No workspace path available, bundle manager not initialized");
        }

        // Initialize TagScout in background
        let client_clone = self.client.clone();
        let server_clone = self.clone();
        tokio::spawn(async move {
            match server_clone.initialize_tagscout().await {
                Ok(_) => {
                    client_clone
                        .log_message(MessageType::INFO, "TagScout patterns loaded successfully")
                        .await;
                }
                Err(e) => {
                    client_clone
                        .log_message(
                            MessageType::WARNING,
                            &format!(
                                "TagScout initialization failed: {}. No patterns available.",
                                e
                            ),
                        )
                        .await;
                }
            }
        });
    }

    async fn shutdown(&self) -> Result<()> {
        tracing::info!("LSP server shutting down");
        Ok(())
    }

    async fn did_open(&self, params: DidOpenTextDocumentParams) {
        let uri = params.text_document.uri;
        let text = params.text_document.text;

        tracing::info!("Document opened: {}", uri);

        // Store document
        self.documents.insert(uri.clone(), text.clone());

        // Analyze and publish diagnostics
        self.analyze_and_publish(&uri, &text).await;
    }

    async fn did_change(&self, params: DidChangeTextDocumentParams) {
        let uri = params.text_document.uri;

        tracing::debug!("Document changed: {}", uri);

        // Apply incremental changes
        if let Some(mut doc_entry) = self.documents.get_mut(&uri) {
            for change in params.content_changes {
                // For simplicity, just replace the whole document
                // In production, you'd handle incremental edits properly
                *doc_entry = change.text;
            }

            let text = doc_entry.clone();
            drop(doc_entry);

            // Re-analyze
            self.analyze_and_publish(&uri, &text).await;
        }
    }

    async fn did_save(&self, params: DidSaveTextDocumentParams) {
        tracing::info!("Document saved: {}", params.text_document.uri);

        // Re-analyze on save if text is provided
        if let Some(text) = params.text {
            self.documents
                .insert(params.text_document.uri.clone(), text.clone());
            self.analyze_and_publish(&params.text_document.uri, &text)
                .await;
        }
    }

    async fn did_close(&self, params: DidCloseTextDocumentParams) {
        let uri = params.text_document.uri;
        tracing::info!("Document closed: {}", uri);

        // Remove from cache
        self.documents.remove(&uri);

        // Clear diagnostics
        self.client.publish_diagnostics(uri, vec![], None).await;
    }

    async fn hover(&self, params: HoverParams) -> Result<Option<Hover>> {
        let uri = &params.text_document_position_params.text_document.uri;
        let position = params.text_document_position_params.position;

        if let Some(doc) = self.documents.get(uri) {
            let lines: Vec<&str> = doc.lines().collect();
            if let Some(line) = lines.get(position.line as usize) {
                let contents = HoverContents::Markup(MarkupContent {
                    kind: MarkupKind::Markdown,
                    value: format!(
                        "**Log Line Analysis**\n\nLine {}: `{}`\n\nLength: {} characters",
                        position.line + 1,
                        line,
                        line.len()
                    ),
                });

                return Ok(Some(Hover {
                    contents,
                    range: Some(Range {
                        start: Position {
                            line: position.line,
                            character: 0,
                        },
                        end: Position {
                            line: position.line,
                            character: line.len() as u32,
                        },
                    }),
                }));
            }
        }

        Ok(None)
    }

    async fn code_action(&self, params: CodeActionParams) -> Result<Option<CodeActionResponse>> {
        let uri = &params.text_document.uri;

        let mut actions = vec![];

        // "Export results" action
        actions.push(CodeActionOrCommand::CodeAction(CodeAction {
            title: "Export analysis results".to_string(),
            kind: Some(CodeActionKind::REFACTOR),
            diagnostics: Some(params.context.diagnostics.clone()),
            edit: None,
            command: Some(Command {
                title: "Export Results".to_string(),
                command: "logScout.exportResults".to_string(),
                arguments: Some(vec![serde_json::to_value(uri).unwrap()]),
            }),
            is_preferred: Some(false),
            disabled: None,
            data: None,
        }));

        // "Show timeline" action
        actions.push(CodeActionOrCommand::CodeAction(CodeAction {
            title: "Show timeline visualization".to_string(),
            kind: Some(CodeActionKind::EMPTY),
            diagnostics: None,
            edit: None,
            command: Some(Command {
                title: "Show Timeline".to_string(),
                command: "logScout.showTimeline".to_string(),
                arguments: Some(vec![serde_json::to_value(uri).unwrap()]),
            }),
            is_preferred: Some(false),
            disabled: None,
            data: None,
        }));

        Ok(Some(actions))
    }

    async fn execute_command(
        &self,
        params: ExecuteCommandParams,
    ) -> Result<Option<serde_json::Value>> {
        tracing::info!("Executing command: {}", params.command);

        let cmd = params.command.as_str();

        // Route bundle commands to handler
        // Support both formats: "logScout.bundle.X" and "scout/bundle/X"
        if cmd.starts_with("logScout.bundle.") || cmd.starts_with("scout/bundle/") {
            let method = if cmd.starts_with("logScout.bundle.") {
                cmd.replace("logScout.bundle.", "scout/bundle/")
            } else {
                cmd.to_string()
            };

            let args = params
                .arguments
                .get(0)
                .cloned()
                .unwrap_or(serde_json::json!({}));

            return match self.handle_bundle_request(&method, args).await {
                Ok(response) => Ok(Some(response)),
                Err(e) => {
                    self.notifier
                        .notify_error(format!("Bundle operation failed: {:?}", e))
                        .await;
                    Err(e)
                }
            };
        }

        match cmd {
            "logScout.analyze" => {
                self.client
                    .log_message(MessageType::INFO, "Running full analysis...")
                    .await;
                Ok(None)
            }
            "logScout.showTimeline" => {
                self.client
                    .show_message(MessageType::INFO, "Opening timeline visualization...")
                    .await;
                Ok(None)
            }
            "logScout.exportResults" => {
                self.client
                    .show_message(MessageType::INFO, "Exporting analysis results...")
                    .await;
                Ok(None)
            }
            "logScout.refreshPatterns" => {
                self.client
                    .log_message(MessageType::INFO, "Refreshing patterns from TagScout...")
                    .await;

                match self.refresh_tagscout_patterns().await {
                    Ok(count) => {
                        self.notifier.notify_patterns_refreshed(count).await;
                    }
                    Err(e) => {
                        self.notifier
                            .notify_error(format!("Failed to refresh patterns: {}", e))
                            .await;
                    }
                }
                Ok(None)
            }
            "logScout.reloadPatterns" => {
                self.client
                    .log_message(MessageType::INFO, "Reloading patterns with overrides...")
                    .await;

                // Refresh patterns from TagScout
                let pattern_count = match self.refresh_tagscout_patterns().await {
                    Ok(count) => count,
                    Err(e) => {
                        self.client
                            .show_message(
                                MessageType::ERROR,
                                &format!("Failed to reload patterns: {}", e),
                            )
                            .await;
                        return Ok(None);
                    }
                };

                // Re-analyze all open documents
                let re_analyzed = self.reanalyze_all_documents().await;

                self.client
                    .show_message(
                        MessageType::INFO,
                        &format!(
                            "Reloaded {} patterns and re-analyzed {} documents",
                            pattern_count, re_analyzed
                        ),
                    )
                    .await;

                Ok(Some(serde_json::json!({
                    "patternsLoaded": pattern_count,
                    "documentsAnalyzed": re_analyzed
                })))
            }
            "logScout.getPatterns" => {
                tracing::info!("TagScout UI requesting patterns from LSP");

                let engine_guard = self.pattern_engine.read().await;
                if let Some(engine) = engine_guard.as_ref() {
                    let patterns = engine.get_patterns();
                    tracing::info!("Returning {} patterns to TagScout UI", patterns.len());

                    // Determine source based on pattern count and content
                    let source = if patterns.len() <= 6 {
                        "fallback_defaults"
                    } else {
                        "tagscout_mongodb"
                    };

                    // Convert patterns to JSON for the UI
                    let pattern_data: Vec<serde_json::Value> = patterns
                        .iter()
                        .map(|compiled| {
                            let p = &compiled.pattern;
                            serde_json::json!({
                                "id": p.id,
                                "name": p.name,
                                "description": p.annotation,
                                "pattern": p.pattern,
                                "severity": match p.severity {
                                    Severity::Error => "error",
                                    Severity::Warning => "warning",
                                    Severity::Info => "info",
                                    Severity::Hint => "hint",
                                },
                                "category": p.category,
                                "service": p.service,
                                "tags": p.tags,
                                "action": p.action,
                                "captureFields": p.capture_fields,
                                "parameterExtractors": p.parameter_extractors.iter().map(|pe| {
                                    serde_json::json!({
                                        "name": pe.name,
                                        "regex": pe.regex
                                    })
                                }).collect::<Vec<_>>(),
                            })
                        })
                        .collect();

                    Ok(Some(serde_json::json!({
                        "patterns": pattern_data,
                        "count": pattern_data.len(),
                        "source": source
                    })))
                } else {
                    tracing::warn!("No pattern engine available");
                    Ok(Some(serde_json::json!({
                        "patterns": [],
                        "count": 0,
                        "source": "none",
                        "error": "Pattern engine not initialized"
                    })))
                }
            }
            _ => {
                tracing::warn!("Unknown command: {}", params.command);
                Ok(None)
            }
        }
    }

    async fn document_symbol(
        &self,
        params: DocumentSymbolParams,
    ) -> Result<Option<DocumentSymbolResponse>> {
        let uri = &params.text_document.uri;

        if let Some(doc) = self.documents.get(uri) {
            let mut symbols = vec![];

            // Extract timeline events as symbols
            for (line_num, line) in doc.lines().enumerate() {
                // Simple heuristic: lines with timestamps or specific keywords
                if line.contains("ERROR")
                    || line.contains("WARNING")
                    || line.contains("INFO")
                    || line.contains("FATAL")
                {
                    #[allow(deprecated)]
                    let symbol = DocumentSymbol {
                        name: line.chars().take(50).collect::<String>(),
                        detail: Some(format!("Line {}", line_num + 1)),
                        kind: SymbolKind::EVENT,
                        tags: None,
                        deprecated: None,
                        range: Range {
                            start: Position {
                                line: line_num as u32,
                                character: 0,
                            },
                            end: Position {
                                line: line_num as u32,
                                character: line.len() as u32,
                            },
                        },
                        selection_range: Range {
                            start: Position {
                                line: line_num as u32,
                                character: 0,
                            },
                            end: Position {
                                line: line_num as u32,
                                character: line.len() as u32,
                            },
                        },
                        children: None,
                    };
                    symbols.push(symbol);
                }
            }

            return Ok(Some(DocumentSymbolResponse::Nested(symbols)));
        }

        Ok(None)
    }

    async fn completion(&self, params: CompletionParams) -> Result<Option<CompletionResponse>> {
        let uri = params.text_document_position.text_document.uri;

        tracing::debug!("Completion requested for {}", uri);

        // Get the document text
        let doc_text = match self.documents.get(&uri) {
            Some(text) => text.clone(),
            None => {
                tracing::warn!("Document not found for completion: {}", uri);
                return Ok(None);
            }
        };

        let position = params.text_document_position.position;

        // Convert position to byte offset
        let mut current_line = 0u32;
        let mut offset = 0usize;

        for line in doc_text.lines() {
            if current_line == position.line {
                offset += position.character as usize;
                break;
            }
            offset += line.len() + 1; // +1 for newline
            current_line += 1;
        }

        // Get text up to cursor
        let text_before_cursor = &doc_text[..offset.min(doc_text.len())];

        // Check if we're in a severity context (e.g., after "[" or in a log level)
        let in_severity_context = text_before_cursor.ends_with('[')
            || text_before_cursor.ends_with("level=")
            || text_before_cursor.ends_with("severity=");

        let mut completions = Vec::new();

        if in_severity_context {
            // Provide severity level completions
            completions.push(CompletionItem {
                label: "ERROR".to_string(),
                kind: Some(CompletionItemKind::KEYWORD),
                detail: Some("Error severity level".to_string()),
                documentation: Some(Documentation::String(
                    "Critical errors that require immediate attention".to_string(),
                )),
                insert_text: Some("ERROR]".to_string()),
                ..Default::default()
            });

            completions.push(CompletionItem {
                label: "WARN".to_string(),
                kind: Some(CompletionItemKind::KEYWORD),
                detail: Some("Warning severity level".to_string()),
                documentation: Some(Documentation::String(
                    "Warning conditions that should be reviewed".to_string(),
                )),
                insert_text: Some("WARN]".to_string()),
                ..Default::default()
            });

            completions.push(CompletionItem {
                label: "INFO".to_string(),
                kind: Some(CompletionItemKind::KEYWORD),
                detail: Some("Info severity level".to_string()),
                documentation: Some(Documentation::String("Informational messages".to_string())),
                insert_text: Some("INFO]".to_string()),
                ..Default::default()
            });

            completions.push(CompletionItem {
                label: "DEBUG".to_string(),
                kind: Some(CompletionItemKind::KEYWORD),
                detail: Some("Debug severity level".to_string()),
                documentation: Some(Documentation::String(
                    "Detailed debugging information".to_string(),
                )),
                insert_text: Some("DEBUG]".to_string()),
                ..Default::default()
            });

            completions.push(CompletionItem {
                label: "TRACE".to_string(),
                kind: Some(CompletionItemKind::KEYWORD),
                detail: Some("Trace severity level".to_string()),
                documentation: Some(Documentation::String(
                    "Very detailed tracing information".to_string(),
                )),
                insert_text: Some("TRACE]".to_string()),
                ..Default::default()
            });
        }

        // Get pattern suggestions from the pattern engine
        if let Some(engine) = self.pattern_engine.read().await.as_ref() {
            let patterns = engine.get_patterns();

            for compiled_pattern in patterns.iter().take(10) {
                let pattern = &compiled_pattern.pattern;
                completions.push(CompletionItem {
                    label: pattern.name.clone(),
                    kind: Some(CompletionItemKind::TEXT),
                    detail: Some(format!(
                        "Pattern: {} | Severity: {:?}",
                        pattern.category, pattern.severity
                    )),
                    documentation: Some(Documentation::String(pattern.annotation.clone())),
                    insert_text: Some(pattern.name.clone()),
                    ..Default::default()
                });
            }
        }

        if completions.is_empty() {
            Ok(None)
        } else {
            Ok(Some(CompletionResponse::Array(completions)))
        }
    }

    async fn diagnostic(
        &self,
        params: DocumentDiagnosticParams,
    ) -> Result<DocumentDiagnosticReportResult> {
        let uri = params.text_document.uri.clone();

        tracing::info!("Pull diagnostic request for: {}", uri);

        // Get document and analyze if we have it
        if let Some(doc) = self.documents.get(&uri) {
            let text = doc.clone();
            drop(doc);

            // Send status notification
            self.client
                .log_message(
                    MessageType::INFO,
                    &format!("🔍 Pull diagnostic request: {}", uri.path()),
                )
                .await;

            // Analyze the document
            let total_lines = text.lines().count();
            let diagnostics = self.analyze_text(&text, uri.as_str(), total_lines).await;

            tracing::info!(
                "Returning {} diagnostics for pull request",
                diagnostics.len()
            );

            self.client
                .log_message(
                    MessageType::INFO,
                    &format!(
                        "✅ Pull diagnostic complete: {} issues found",
                        diagnostics.len()
                    ),
                )
                .await;

            return Ok(DocumentDiagnosticReportResult::Report(
                DocumentDiagnosticReport::Full(RelatedFullDocumentDiagnosticReport {
                    related_documents: None,
                    full_document_diagnostic_report: FullDocumentDiagnosticReport {
                        result_id: None,
                        items: diagnostics,
                    },
                }),
            ));
        }

        // No document found, return empty diagnostics
        tracing::info!("No document found for pull request: {}", uri);
        Ok(DocumentDiagnosticReportResult::Report(
            DocumentDiagnosticReport::Full(RelatedFullDocumentDiagnosticReport {
                related_documents: None,
                full_document_diagnostic_report: FullDocumentDiagnosticReport {
                    result_id: None,
                    items: vec![],
                },
            }),
        ))
    }
}
