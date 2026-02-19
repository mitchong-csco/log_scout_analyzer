# LSP Server Integration: Bundle System Implementation Guide

**Status**: Ready for Implementation  
**Date**: February 17, 2026  

---

## Overview

This guide shows how to integrate the Bundle system (already created in Phase 1) into the existing LSP Server to enable custom/createBundle, custom/addLogToBundle, etc.

---

## Step 1: Update server.rs - Add Bundle Manager Field

```rust
// At top of server.rs
use crate::bundle::{BundleManager, BundleAnalyzer};

// Modify LogScoutServer struct
#[derive(Clone)]
pub struct LogScoutServer {
    client: Client,
    pattern_engine: Arc<RwLock<Option<PatternEngine>>>,
    tagscout_service: Arc<RwLock<Option<SyncService>>>,
    documents: Arc<DashMap<Url, String>>,
    workspace_path: Arc<RwLock<Option<String>>>,
    bundle_manager: Arc<RwLock<Option<BundleManager>>>,  // NEW
}

impl LogScoutServer {
    /// Create a new LSP server instance
    pub fn new(client: Client) -> Self {
        let pattern_engine = Self::load_default_patterns();

        if pattern_engine.is_some() {
            tracing::info!("Pattern engine initialized with default patterns");
        } else {
            tracing::info!("Pattern engine will be initialized after TagScout patterns load");
        }

        Self {
            client,
            pattern_engine: Arc::new(RwLock::new(pattern_engine)),
            tagscout_service: Arc::new(RwLock::new(None)),
            documents: Arc::new(DashMap::new()),
            workspace_path: Arc::new(RwLock::new(None)),
            bundle_manager: Arc::new(RwLock::new(None)),  // NEW
        }
    }

    /// Initialize bundle manager
    async fn initialize_bundle_manager(&self, workspace_path: Option<String>) -> std::result::Result<(), String> {
        if let Some(path) = workspace_path {
            let manager = BundleManager::new(std::path::Path::new(&path))
                .map_err(|e| format!("Failed to initialize bundle manager: {}", e))?;
            *self.bundle_manager.write().await = Some(manager);
            tracing::info!("Bundle manager initialized");
            Ok(())
        } else {
            tracing::warn!("Workspace path not available, skipping bundle manager");
            Ok(())
        }
    }
}
```

---

## Step 2: Update on_initialize - Initialize Bundles

In the `LanguageServer::initialize()` implementation:

```rust
#[tower_lsp::async_trait]
impl LanguageServer for LogScoutServer {
    async fn initialize(&self, params: InitializeParams) -> Result<InitializeResult> {
        tracing::info!("Initializing LSP server");

        // Store workspace path
        if let Some(root_uri) = &params.root_uri {
            let path = root_uri.to_file_path()
                .unwrap_or_else(|_| std::path::PathBuf::from(root_uri.path()))
                .to_string_lossy()
                .to_string();
            
            *self.workspace_path.write().await = Some(path.clone());

            // Initialize bundle manager with workspace path
            if let Err(e) = self.initialize_bundle_manager(Some(path)).await {
                tracing::warn!("Bundle manager initialization warning: {}", e);
            }
        }

        // ... rest of initialization ...
    }
}
```

---

## Step 3: Add execute() Method for Custom Requests

Add this to the LogScoutServer implementation in server.rs:

```rust
/// Handle custom LSP requests
async fn execute(&self, method: String, params: serde_json::Value) -> Result<serde_json::Value> {
    tracing::info!("Executing custom method: {}", method);
    
    match method.as_str() {
        "custom/createBundle" => self.handle_create_bundle(params).await,
        "custom/addLogToBundle" => self.handle_add_log_to_bundle(params).await,
        "custom/getBundle" => self.handle_get_bundle(params).await,
        "custom/listBundles" => self.handle_list_bundles(params).await,
        "custom/analyzeBundle" => self.handle_analyze_bundle(params).await,
        "custom/deleteBundle" => self.handle_delete_bundle(params).await,
        _ => Err(jsonrpc::Error::method_not_found()),
    }
}

// Handler implementations
async fn handle_create_bundle(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let name = params.get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'name'"))?
        .to_string();

    let description = params.get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let metadata = if let Some(meta) = params.get("metadata") {
        serde_json::from_value(meta).ok()
    } else {
        None
    };

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    match manager.create_bundle(name, description, metadata) {
        Ok(bundle_id) => {
            Ok(serde_json::json!({
                "bundle_id": bundle_id,
                "created_at": chrono::Utc::now().to_rfc3339()
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create bundle: {}", e);
            Err(jsonrpc::Error::internal_error())
        }
    }
}

async fn handle_add_log_to_bundle(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let bundle_id = params.get("bundle_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'bundle_id'"))?
        .to_string();

    let log_uri = params.get("log_uri")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'log_uri'"))?
        .to_string();

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    match manager.add_log_to_bundle(&bundle_id, &log_uri, None, None) {
        Ok(bundle_log) => {
            Ok(serde_json::json!({
                "bundle_id": bundle_id,
                "log_uri": log_uri,
                "service": format!("{}", bundle_log.service),
                "log_type": format!("{}", bundle_log.log_type),
                "size_bytes": bundle_log.size_bytes,
                "line_count": bundle_log.line_count
            }))
        }
        Err(e) => {
            tracing::error!("Failed to add log: {}", e);
            Err(jsonrpc::Error::internal_error())
        }
    }
}

async fn handle_get_bundle(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let bundle_id = params.get("bundle_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'bundle_id'"))?
        .to_string();

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    match manager.get_bundle(&bundle_id) {
        Ok(bundle) => Ok(serde_json::to_value(bundle)
            .unwrap_or(serde_json::json!({"error": "Serialization failed"}))),
        Err(e) => {
            tracing::warn!("Bundle not found: {}", e);
            Err(jsonrpc::Error::invalid_params(format!("Bundle not found: {}", bundle_id)))
        }
    }
}

async fn handle_list_bundles(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let filter_case_id = params.get("filter")
        .and_then(|f| f.get("case_id"))
        .and_then(|v| v.as_str());

    let filter_tag = params.get("filter")
        .and_then(|f| f.get("tag"))
        .and_then(|v| v.as_str());

    let filter_owner = params.get("filter")
        .and_then(|f| f.get("owner"))
        .and_then(|v| v.as_str());

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    match manager.list_bundles(filter_case_id, filter_tag, filter_owner) {
        Ok(bundles) => Ok(serde_json::json!({
            "bundles": bundles
        })),
        Err(e) => {
            tracing::error!("Failed to list bundles: {}", e);
            Err(jsonrpc::Error::internal_error())
        }
    }
}

async fn handle_analyze_bundle(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let bundle_id = params.get("bundle_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'bundle_id'"))?
        .to_string();

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    let bundle = manager.get_bundle(&bundle_id)
        .map_err(|e| jsonrpc::Error::internal_error())?;

    let pattern_engine = self.pattern_engine.read().await;
    let engine = pattern_engine.as_ref()
        .ok_or_else(|| jsonrpc::Error::invalid_request())?;

    match BundleAnalyzer::analyze_bundle(&bundle, engine) {
        Ok(analysis) => {
            Ok(serde_json::json!({
                "bundle_id": bundle_id,
                "analysis": analysis,
                "success": true
            }))
        }
        Err(e) => {
            tracing::error!("Failed to analyze bundle: {}", e);
            Err(jsonrpc::Error::internal_error())
        }
    }
}

async fn handle_delete_bundle(&self, params: serde_json::Value) -> Result<serde_json::Value> {
    let bundle_id = params.get("bundle_id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| jsonrpc::Error::invalid_params("Missing 'bundle_id'"))?
        .to_string();

    let manager = self.bundle_manager
        .read()
        .await
        .as_ref()
        .ok_or_else(|| jsonrpc::Error::internal_error())?
        .clone();

    match manager.delete_bundle(&bundle_id) {
        Ok(_) => {
            Ok(serde_json::json!({
                "success": true,
                "deleted_at": chrono::Utc::now().to_rfc3339()
            }))
        }
        Err(e) => {
            tracing::error!("Failed to delete bundle: {}", e);
            Err(jsonrpc::Error::internal_error())
        }
    }
}
```

---

## Step 4: Register Custom Request Handler in LanguageServer Trait

Add the `execute()` method call in the appropriate message handler:

```rust
#[tower_lsp::async_trait]
impl LanguageServer for LogScoutServer {
    // ... existing methods ...

    async fn execute_command(&self, params: ExecuteCommandParams) -> Result<Option<serde_json::Value>> {
        tracing::info!("Executing command: {}", params.command);
        
        self.execute(params.command, serde_json::json!(params.arguments))
            .await
            .map(Some)
            .or_else(|e| {
                tracing::error!("Command execution failed: {:?}", e);
                Err(e)
            })
    }

    // ... rest of implementation ...
}
```

---

## Step 5: Update Initialization Capabilities

Add bundle capabilities to server initialization response:

```rust
async fn initialize(&self, params: InitializeParams) -> Result<InitializeResult> {
    // ... existing initialization code ...

    Ok(InitializeResult {
        capabilities: ServerCapabilities {
            // ... existing capabilities ...
            execute_command_provider: Some(ExecuteCommandOptions {
                commands: vec![
                    "custom/createBundle".to_string(),
                    "custom/addLogToBundle".to_string(),
                    "custom/getBundle".to_string(),
                    "custom/listBundles".to_string(),
                    "custom/analyzeBundle".to_string(),
                    "custom/deleteBundle".to_string(),
                ],
                work_done_progress_options: Default::default(),
            }),
            ..Default::default()
        },
        server_info: Some(ServerInfo {
            name: "Log Scout LSP Server".to_string(),
            version: Some("0.1.10".to_string()),
        }),
    })
}
```

---

## Step 6: Make BundleManager Cloneable

Update bundle/manager.rs to add Clone derive if using in Arc<RwLock>:

```rust
#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
}
```

---

## Integration Testing

### Test 1: Bundle Creation
```rust
#[tokio::test]
async fn test_create_bundle_via_lsp() {
    let server = LogScoutServer::new(create_test_client());
    
    // Setup workspace
    server.workspace_path.write().await.replace("/tmp/test".to_string());
    server.initialize_bundle_manager(Some("/tmp/test".to_string())).await.unwrap();
    
    // Create bundle
    let result = server.handle_create_bundle(serde_json::json!({
        "name": "Test Bundle"
    })).await.unwrap();
    
    assert!(result.get("bundle_id").is_some());
}
```

### Test 2: End-to-End Flow
```javascript
// From VS Code extension
async function testBundleWorkflow() {
    // Create bundle
    const createResp = await lspClient.sendRequest('custom/createBundle', {
        name: 'Test Investigation',
        metadata: { case_id: 'TEST-001' }
    });
    const bundleId = createResp.bundle_id;
    
    // Add logs
    await lspClient.sendRequest('custom/addLogToBundle', {
        bundle_id: bundleId,
        log_uri: 'file:///path/to/jabber.log'
    });
    
    // Get bundle
    const bundleResp = await lspClient.sendRequest('custom/getBundle', {
        bundle_id: bundleId
    });
    assert(bundleResp.bundle.logs.length === 1);
    
    // Analyze
    const analysisResp = await lspClient.sendRequest('custom/analyzeBundle', {
        bundle_id: bundleId
    });
    assert(analysisResp.analysis);
    
    // Delete
    await lspClient.sendRequest('custom/deleteBundle', {
        bundle_id: bundleId
    });
}
```

---

## Next Steps

1. Add bundle handlers to server.rs
2. Test bundle creation/add/analyze flows
3. Build VS Code extension UI for bundles
4. Add cross-file result visualization
5. Implement Phase 2 features (timestamp correlation, service filtering)

