//! LSP Server Implementation
//!
//! Implements the Language Server Protocol for log file analysis.

use crate::pattern_engine::{Detection, Pattern, PatternEngine, Severity};
use crate::tagscout::{SyncMode, SyncService, SyncServiceConfig};

use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_lsp::jsonrpc::Result;
use tower_lsp::lsp_types::*;
use tower_lsp::{Client, LanguageServer};

/// Main LSP server structure
#[derive(Clone)]
pub struct LogScoutServer {
    client: Client,
    pattern_engine: Arc<RwLock<Option<PatternEngine>>>,
    tagscout_service: Arc<RwLock<Option<SyncService>>>,
    documents: Arc<DashMap<Url, String>>,
}

impl LogScoutServer {
    /// Create a new LSP server instance
    pub fn new(client: Client) -> Self {
        // Start with default patterns
        let pattern_engine = Self::load_default_patterns();

        if pattern_engine.is_some() {
            tracing::info!("Pattern engine initialized with default patterns");
        } else {
            tracing::warn!("Pattern engine not initialized - using empty pattern set");
        }

        Self {
            client,
            pattern_engine: Arc::new(RwLock::new(pattern_engine)),
            tagscout_service: Arc::new(RwLock::new(None)),
            documents: Arc::new(DashMap::new()),
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
            let engine = PatternEngine::new(patterns, 0.7, 10)
                .map_err(|e| format!("Failed to create pattern engine: {}", e))?;

            *self.pattern_engine.write().await = Some(engine);
            tracing::info!("Pattern engine updated with TagScout patterns");
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
                let engine = PatternEngine::new(patterns, 0.7, 10)
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

    /// Load default pattern set
    fn load_default_patterns() -> Option<PatternEngine> {
        // Create some default patterns for common log issues
        let default_patterns = vec![
            Pattern {
                id: "error".to_string(),
                name: "Error Message".to_string(),
                description: "Detects ERROR level log messages".to_string(),
                pattern: r"(?i)\bERROR\b".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Error,
                category: "error".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
            Pattern {
                id: "warning".to_string(),
                name: "Warning Message".to_string(),
                description: "Detects WARNING level log messages".to_string(),
                pattern: r"(?i)\bWARN(ING)?\b".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Warning,
                category: "warning".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
            Pattern {
                id: "fatal".to_string(),
                name: "Fatal Error".to_string(),
                description: "Detects FATAL level log messages".to_string(),
                pattern: r"(?i)\bFATAL\b".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Error,
                category: "fatal".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
            Pattern {
                id: "exception".to_string(),
                name: "Exception".to_string(),
                description: "Detects exception traces".to_string(),
                pattern: r"(?i)(exception|stack\s+trace|traceback)".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Error,
                category: "exception".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
            Pattern {
                id: "timeout".to_string(),
                name: "Timeout".to_string(),
                description: "Detects timeout errors".to_string(),
                pattern: r"(?i)\btimeout\b".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Warning,
                category: "timeout".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
            Pattern {
                id: "connection_failed".to_string(),
                name: "Connection Failed".to_string(),
                description: "Detects connection failures".to_string(),
                pattern: r"(?i)connection\s+(failed|refused|reset)".to_string(),
                mode: crate::pattern_engine::PatternMode::SingleLine,
                severity: Severity::Error,
                category: "network".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
        ];

        match PatternEngine::new(default_patterns, 0.7, 5) {
            Ok(engine) => Some(engine),
            Err(e) => {
                tracing::error!("Failed to create pattern engine: {}", e);
                None
            }
        }
    }

    /// Analyze document and publish diagnostics
    async fn analyze_and_publish(&self, uri: &Url, text: &str) {
        tracing::debug!("Analyzing document: {}", uri);

        let diagnostics = {
            let engine_guard = self.pattern_engine.read().await;
            if let Some(engine) = engine_guard.as_ref() {
                // Process each line and collect detections
                let mut all_detections = Vec::new();
                for (line_num, line) in text.lines().enumerate() {
                    let detections = engine.process_line(line, line_num);
                    all_detections.extend(detections);
                }

                tracing::info!("Found {} detections", all_detections.len());

                // Convert detections to LSP diagnostics
                all_detections
                    .into_iter()
                    .map(|detection| self.detection_to_diagnostic(&detection))
                    .collect()
            } else {
                tracing::warn!("No pattern engine available");
                vec![]
            }
        };

        // Publish diagnostics to client
        self.client
            .publish_diagnostics(uri.clone(), diagnostics, None)
            .await;
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
            message: format!(
                "{}: {}",
                detection.pattern.name, detection.pattern.description
            ),
            related_information: None,
            tags: None,
            data: None,
        }
    }
}

#[tower_lsp::async_trait]
impl LanguageServer for LogScoutServer {
    async fn initialize(&self, _params: InitializeParams) -> Result<InitializeResult> {
        tracing::info!("Client initializing LSP server");

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
                        work_done_progress_options: Default::default(),
                    },
                )),
                code_action_provider: Some(CodeActionProviderCapability::Simple(true)),
                execute_command_provider: Some(ExecuteCommandOptions {
                    commands: vec![
                        "logScout.analyze".to_string(),
                        "logScout.showTimeline".to_string(),
                        "logScout.exportResults".to_string(),
                        "logScout.refreshPatterns".to_string(),
                        "logScout.getPatterns".to_string(),
                    ],
                    work_done_progress_options: Default::default(),
                }),
                hover_provider: Some(HoverProviderCapability::Simple(true)),
                document_symbol_provider: Some(OneOf::Left(true)),
                ..Default::default()
            },
            server_info: Some(ServerInfo {
                name: "Log Scout Analyzer".to_string(),
                version: Some(env!("CARGO_PKG_VERSION").to_string()),
            }),
        })
    }

    async fn initialized(&self, _params: InitializedParams) {
        tracing::info!("LSP server initialized successfully");
        self.client
            .log_message(MessageType::INFO, "Log Scout Analyzer ready!")
            .await;

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
                                "TagScout initialization failed: {}. Using default patterns.",
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
                // Provide hover information about the line
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

        match params.command.as_str() {
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
                        self.client
                            .show_message(
                                MessageType::INFO,
                                &format!("Refreshed {} patterns", count),
                            )
                            .await;
                    }
                    Err(e) => {
                        self.client
                            .show_message(
                                MessageType::ERROR,
                                &format!("Failed to refresh patterns: {}", e),
                            )
                            .await;
                    }
                }
                Ok(None)
            }
            "logScout.getPatterns" => {
                tracing::info!("TagScout UI requesting patterns from LSP");

                let engine_guard = self.pattern_engine.read().await;
                if let Some(engine) = engine_guard.as_ref() {
                    let patterns = engine.get_patterns();
                    tracing::info!("Returning {} patterns to TagScout UI", patterns.len());

                    // Convert patterns to JSON for the UI
                    let pattern_data: Vec<serde_json::Value> = patterns
                        .iter()
                        .map(|compiled| {
                            let p = &compiled.pattern;
                            serde_json::json!({
                                "id": p.id,
                                "name": p.name,
                                "description": p.description,
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
                            })
                        })
                        .collect();

                    Ok(Some(serde_json::json!({
                        "patterns": pattern_data,
                        "count": pattern_data.len(),
                        "source": "tagscout_mongodb"
                    })))
                } else {
                    tracing::warn!("No pattern engine available");
                    Ok(Some(serde_json::json!({
                        "patterns": [],
                        "count": 0,
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
}
