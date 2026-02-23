# Crates Architecture Migration Plan - Detailed Implementation Guide

**Project:** Log Scout Analyzer  
**Task:** Migrate from legacy LSP server to new crates-based architecture  
**Duration:** 2-3 days  
**Priority:** HIGH  
**Status:** Ready to Begin

---

## Executive Summary

**Goal:** Replace the legacy monolithic LSP server with the modern, feature-based crates architecture to enable bundle import and other advanced features.

**Why This Matters:**
- ✅ Enables bundle import (QCSONE packages)
- ✅ Proper custom request handling
- ✅ Better code organization
- ✅ Eliminates technical debt
- ✅ Future-proof architecture

**Success Criteria:**
- All existing features continue to work
- Bundle import works correctly
- Performance is maintained or improved
- Zero data loss or corruption
- Clean rollback capability

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Migration Strategy](#migration-strategy)
4. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
5. [Testing Plan](#testing-plan)
6. [Rollback Plan](#rollback-plan)
7. [Risk Assessment](#risk-assessment)

---

## 1. Current State Analysis

### 1.1 Legacy LSP Server Structure

```
lsp-server/
├── src/
│   ├── main.rs                   ✅ Active entry point
│   ├── lib.rs                    ✅ Module exports
│   ├── server.rs                 ✅ LogScoutServer implementation (1,166 lines)
│   ├── pattern_engine.rs         ✅ Pattern matching
│   ├── pattern_loader.rs         ✅ Override system
│   ├── tagscout.rs               ✅ MongoDB sync
│   ├── bundle/
│   │   ├── mod.rs                ✅ Bundle operations
│   │   ├── models.rs             ✅ Data structures
│   │   ├── manager.rs            ✅ CRUD operations (partial)
│   │   └── service_detector.rs   ✅ Service detection
│   └── mongodb/                  ✅ MongoDB client
└── Cargo.toml                    ✅ Dependencies
```

**What Works:**
- ✅ Pattern matching and analysis
- ✅ TagScout pattern sync
- ✅ Pattern overrides
- ✅ Basic bundle operations (list, get, create)
- ✅ Diagnostics publishing
- ✅ Document lifecycle management

**What's Missing:**
- ❌ Bundle import from archives
- ❌ Custom request routing
- ❌ Advanced bundle features
- ❌ Proper error handling for bundles
- ❌ Archive extraction

---

### 1.2 New Crates Architecture

```
crates/
├── lsp-server/
│   ├── src/
│   │   ├── main.rs               ⚠️ Placeholder only
│   │   ├── lib.rs                ✅ Complete
│   │   ├── lsp_handlers.rs       ✅ Complete bundle handlers
│   │   ├── lsp_types.rs          ✅ Request/response types
│   │   ├── config_manager.rs     ✅ Configuration
│   │   ├── bundle/
│   │   │   ├── mod.rs            ✅ Complete
│   │   │   ├── models.rs         ✅ Enhanced models
│   │   │   ├── manager.rs        ✅ Full CRUD + import
│   │   │   ├── analyzer.rs       ✅ Bundle analysis
│   │   │   ├── service_detector.rs ✅ Enhanced detection
│   │   │   ├── archive_extractor.rs ✅ ZIP/TAR extraction
│   │   │   ├── extraction_policy.rs ✅ Smart filtering
│   │   │   └── timeframe_analyzer.rs ✅ Timeframe grouping
│   │   └── mongodb/
│   │       ├── client.rs         ✅ MongoDB operations
│   │       ├── config.rs         ✅ Configuration
│   │       └── rbac.rs           ✅ Security
│   └── Cargo.toml
│
├── pattern-engine/               ✅ Mature pattern matching
├── pattern-loader/               ✅ Override system
├── quality-system/               ✅ Quality monitoring
├── tagscout-integration/         ✅ Cisco auth + patterns
└── core/                         ✅ Shared types
```

**What's Complete:**
- ✅ All bundle operations including import
- ✅ Archive extraction (zip, tar, nested)
- ✅ Service detection
- ✅ Timeframe analysis
- ✅ MongoDB hybrid mode
- ✅ Proper error handling
- ✅ Request/response types
- ✅ Comprehensive handlers

**What Needs Integration:**
- ⚠️ Wire up to LSP protocol
- ⚠️ Connect to existing pattern engine
- ⚠️ Hook up TagScout sync
- ⚠️ Integrate diagnostics pipeline

---

## 2. Target Architecture

### 2.1 Final Structure

```
lsp-server/
├── src/
│   ├── main.rs                   🔄 NEW: Crates-based orchestration
│   ├── lib.rs                    🔄 UPDATED: Re-export from crates
│   └── server.rs                 🔄 UPDATED: Thin wrapper over crates
└── Cargo.toml                    🔄 UPDATED: Depend on crates

Build Output:
└── log-scout-lsp-server.exe      ✅ Same binary name, new internals
```

### 2.2 Data Flow (New)

```
VSCode Extension
    ↓
[Custom Request: scout/bundle/importPackage]
    ↓
LSP Server (main.rs)
    ↓
Request Router
    ↓
BundleHandler (from crates/lsp-server)
    ↓
BundleManager::import_log_package (from crates/lsp-server)
    ↓
ArchiveExtractor → ServiceDetector → Bundle Creation
    ↓
Response with ImportPackageResponse
    ↓
VSCode Extension (shows success)
```

### 2.3 Key Components

**1. Main Entry Point** (`main.rs`)
- Initialize all crates
- Create LSP server
- Handle protocol communication
- Route requests to handlers

**2. Request Routing**
- Standard LSP requests → Built-in handlers
- Custom requests → BundleHandler, etc.
- Execute commands → Command dispatcher

**3. Handler Layer** (from crates)
- BundleHandler for bundle operations
- PatternHandler for pattern operations
- ConfigHandler for configuration

**4. Business Logic** (from crates)
- BundleManager - CRUD + import
- PatternEngine - Matching
- ServiceDetector - Detection
- ArchiveExtractor - Extraction

---

## 3. Migration Strategy

### 3.1 Approach: Incremental with Feature Flags

We'll use a **phased migration** approach:

1. **Phase 0:** Preparation & Backup (30 min)
2. **Phase 1:** Foundation Setup (2 hours)
3. **Phase 2:** Core Integration (4 hours)
4. **Phase 3:** Feature Migration (4 hours)
5. **Phase 4:** Testing & Validation (4 hours)
6. **Phase 5:** Deployment (1 hour)

**Total:** ~16 hours (2 days)

### 3.2 Safety Mechanisms

**1. Feature Flags**
```rust
// Allow switching between implementations
const USE_LEGACY_BUNDLES: bool = false;
const USE_LEGACY_PATTERNS: bool = false;
```

**2. Parallel Testing**
- Keep legacy binary as `log-scout-lsp-server.exe.backup`
- New binary as `log-scout-lsp-server.exe`
- Can swap back instantly

**3. Version Tracking**
```rust
const LSP_SERVER_VERSION: &str = "0.2.0-crates-migration";
```

**4. Logging**
```rust
tracing::info!("Using crates-based architecture v0.2.0");
```

---

## 4. Phase-by-Phase Implementation

### Phase 0: Preparation & Backup (30 minutes)

#### Step 0.1: Backup Current State
```bash
# Backup legacy server
cd lsp-server
copy target\release\log-scout-lsp-server.exe target\release\log-scout-lsp-server-legacy-backup.exe

# Backup extension binary
cd ..\vscode-extension\bin
copy log-scout-lsp-server-win.exe log-scout-lsp-server-win-legacy-backup.exe

# Tag current state
cd ..\..
git tag -a legacy-lsp-v0.1.10 -m "Legacy LSP server before crates migration"
```

#### Step 0.2: Create Migration Branch
```bash
git checkout -b feature/crates-lsp-migration
```

#### Step 0.3: Update Dependencies
**File:** `lsp-server/Cargo.toml`

Add crate dependencies:
```toml
[dependencies]
# Internal crates (workspace members)
log-scout-core = { path = "../crates/core" }
log-scout-pattern-engine = { path = "../crates/pattern-engine" }
log-scout-pattern-loader = { path = "../crates/pattern-loader" }
log-scout-quality-system = { path = "../crates/quality-system" }
log-scout-tagscout = { path = "../crates/tagscout-integration" }
log-scout-lsp = { path = "../crates/lsp-server" }

# Existing dependencies remain...
```

**Checkpoint:** ✅ Backups created, dependencies added

---

### Phase 1: Foundation Setup (2 hours)

#### Step 1.1: Create New Main Entry Point
**File:** `lsp-server/src/main_new.rs` (temporary)

```rust
//! New crates-based LSP Server
//!
//! This main entry point uses the feature-based crate architecture.

use anyhow::Result;
use log_scout_lsp::BundleHandler;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_lsp::{jsonrpc::Result as JsonRpcResult, LspService, Server};
use tower_lsp::{Client, LanguageServer};

mod logging;

/// Main LSP server wrapping crate functionality
pub struct CratesLspServer {
    client: Client,
    bundle_handler: Arc<BundleHandler>,
    // Pattern handler, etc. will be added
}

impl CratesLspServer {
    pub fn new(client: Client, workspace_root: &str) -> Result<Self> {
        // Initialize bundle handler from crates
        let bundle_handler = BundleHandler::new(std::path::Path::new(workspace_root))?;
        
        Ok(Self {
            client,
            bundle_handler: Arc::new(bundle_handler),
        })
    }
}

#[tower_lsp::async_trait]
impl LanguageServer for CratesLspServer {
    async fn initialize(&self, params: tower_lsp::lsp_types::InitializeParams) 
        -> JsonRpcResult<tower_lsp::lsp_types::InitializeResult> 
    {
        tracing::info!("Initializing crates-based LSP server");
        
        // Capture workspace path
        let workspace_root = params.workspace_folders
            .and_then(|folders| folders.first().cloned())
            .and_then(|folder| folder.uri.to_file_path().ok())
            .and_then(|path| path.to_str().map(String::from))
            .unwrap_or_else(|| ".".to_string());
        
        tracing::info!("Workspace root: {}", workspace_root);
        
        Ok(tower_lsp::lsp_types::InitializeResult {
            capabilities: tower_lsp::lsp_types::ServerCapabilities {
                text_document_sync: Some(tower_lsp::lsp_types::TextDocumentSyncCapability::Kind(
                    tower_lsp::lsp_types::TextDocumentSyncKind::INCREMENTAL,
                )),
                execute_command_provider: Some(tower_lsp::lsp_types::ExecuteCommandOptions {
                    commands: vec![
                        "logScout.bundle.importPackage".to_string(),
                        "logScout.bundle.create".to_string(),
                        "logScout.bundle.delete".to_string(),
                        "logScout.bundle.addLog".to_string(),
                        "logScout.bundle.analyze".to_string(),
                    ],
                    work_done_progress_options: Default::default(),
                }),
                ..Default::default()
            },
            server_info: Some(tower_lsp::lsp_types::ServerInfo {
                name: "Log Scout Analyzer (Crates)".to_string(),
                version: Some("0.2.0".to_string()),
            }),
        })
    }

    async fn initialized(&self, _: tower_lsp::lsp_types::InitializedParams) {
        tracing::info!("Crates-based LSP server initialized");
        self.client
            .log_message(tower_lsp::lsp_types::MessageType::INFO, "Log Scout (Crates) ready!")
            .await;
    }

    async fn execute_command(&self, params: tower_lsp::lsp_types::ExecuteCommandParams) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        tracing::info!("Execute command: {}", params.command);
        
        match params.command.as_str() {
            "logScout.bundle.importPackage" => {
                self.handle_import_package(params.arguments).await
            }
            "logScout.bundle.create" => {
                self.handle_create_bundle(params.arguments).await
            }
            "logScout.bundle.delete" => {
                self.handle_delete_bundle(params.arguments).await
            }
            "logScout.bundle.addLog" => {
                self.handle_add_log(params.arguments).await
            }
            "logScout.bundle.analyze" => {
                self.handle_analyze_bundle(params.arguments).await
            }
            _ => {
                tracing::warn!("Unknown command: {}", params.command);
                Err(tower_lsp::jsonrpc::Error::method_not_found())
            }
        }
    }

    async fn shutdown(&self) -> JsonRpcResult<()> {
        tracing::info!("Shutting down crates-based LSP server");
        Ok(())
    }
}

impl CratesLspServer {
    async fn handle_import_package(&self, args: Vec<serde_json::Value>) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        // Parse arguments
        #[derive(serde::Deserialize)]
        struct ImportArgs {
            package_path: String,
            bundle_name: Option<String>,
            case_id: Option<String>,
        }
        
        let import_args: ImportArgs = serde_json::from_value(args.get(0).cloned().unwrap_or(serde_json::json!({})))
            .map_err(|e| tower_lsp::jsonrpc::Error::invalid_params(format!("Invalid args: {}", e)))?;
        
        tracing::info!("Importing package: {}", import_args.package_path);
        
        // Call bundle handler
        let request = log_scout_lsp::lsp_types::ImportPackageRequest {
            package_path: import_args.package_path,
            bundle_name: import_args.bundle_name,
            case_id: import_args.case_id,
        };
        
        match self.bundle_handler.handle_import_package(request).await {
            Ok(response) => {
                let json = serde_json::to_value(response)
                    .map_err(|e| tower_lsp::jsonrpc::Error::internal_error())?;
                Ok(Some(json))
            }
            Err(e) => {
                tracing::error!("Import failed: {}", e);
                Err(tower_lsp::jsonrpc::Error::internal_error())
            }
        }
    }
    
    // TODO: Implement other handlers...
    async fn handle_create_bundle(&self, _args: Vec<serde_json::Value>) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        Ok(None) // Placeholder
    }
    
    async fn handle_delete_bundle(&self, _args: Vec<serde_json::Value>) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        Ok(None) // Placeholder
    }
    
    async fn handle_add_log(&self, _args: Vec<serde_json::Value>) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        Ok(None) // Placeholder
    }
    
    async fn handle_analyze_bundle(&self, _args: Vec<serde_json::Value>) 
        -> JsonRpcResult<Option<serde_json::Value>> 
    {
        Ok(None) // Placeholder
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    logging::setup_logging()?;
    
    tracing::info!("Starting Log Scout LSP Server (Crates Architecture) v0.2.0");
    
    let stdin = tokio::io::stdin();
    let stdout = tokio::io::stdout();
    
    // Create service with temporary workspace
    let (service, socket) = LspService::build(|client| {
        CratesLspServer::new(client, ".").expect("Failed to create server")
    })
    .finish();
    
    Server::new(stdin, stdout, socket).serve(service).await;
    
    Ok(())
}
```

**Checkpoint:** ✅ New main entry created

#### Step 1.2: Create Logging Module
**File:** `lsp-server/src/logging.rs`

```rust
use anyhow::Result;
use std::fs::{self, OpenOptions};
use std::path::PathBuf;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

pub fn setup_logging() -> Result<()> {
    let log_path = get_log_file_path();
    
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)?;
    
    tracing_subscriber::registry()
        .with(fmt::layer().with_writer(std::io::stderr))
        .with(
            fmt::layer()
                .with_writer(move || log_file.try_clone().expect("Failed to clone log file"))
                .with_ansi(false),
        )
        .with(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .init();
    
    tracing::info!("Logging initialized: {}", log_path.display());
    Ok(())
}

fn get_log_file_path() -> PathBuf {
    let log_dir = if let Some(home) = dirs::home_dir() {
        home.join(".log-scout-analyzer")
    } else {
        std::env::temp_dir().join("log-scout-analyzer")
    };
    
    fs::create_dir_all(&log_dir).ok();
    
    let date = chrono::Local::now().format("%Y-%m-%d");
    log_dir.join(format!("lsp-server-crates-{}.log", date))
}
```

**Checkpoint:** ✅ Logging configured

#### Step 1.3: Test Basic Compilation
```bash
cd lsp-server
cargo check --bin log-scout-lsp-server
```

Expected: ✅ Compiles successfully (may have warnings about unused code)

---

### Phase 2: Core Integration (4 hours)

#### Step 2.1: VSCode Extension Changes
**File:** `vscode-extension/src/bundleTreeProvider.ts`

Update to use execute_command:
```typescript
async importPackage(packagePath: string): Promise<any> {
  const client = getLSPClient();
  if (!client) {
    throw new Error("LSP client not available");
  }

  // NEW: Use workspace/executeCommand instead of custom request
  const response = await client.sendRequest("workspace/executeCommand", {
    command: "logScout.bundle.importPackage",
    arguments: [{
      packagePath: packagePath,
      bundleName: null,
      caseId: null,
    }]
  });

  this.refresh();
  return response;
}
```

**Do this for ALL bundle operations:**
- `importPackage` → `logScout.bundle.importPackage`
- `createBundle` → `logScout.bundle.create`
- `deleteBundle` → `logScout.bundle.delete`
- `addLog` → `logScout.bundle.addLog`
- `analyzeBundle` → `logScout.bundle.analyze`

#### Step 2.2: Implement All Bundle Handlers

Complete the handler implementations in `main_new.rs`:

```rust
async fn handle_create_bundle(&self, args: Vec<serde_json::Value>) 
    -> JsonRpcResult<Option<serde_json::Value>> 
{
    #[derive(serde::Deserialize)]
    struct CreateArgs {
        name: String,
        description: Option<String>,
        case_id: Option<String>,
        tags: Option<Vec<String>>,
    }
    
    let create_args: CreateArgs = serde_json::from_value(args.get(0).cloned().unwrap_or(serde_json::json!({})))
        .map_err(|e| tower_lsp::jsonrpc::Error::invalid_params(format!("{}", e)))?;
    
    let request = log_scout_lsp::lsp_types::CreateBundleRequest {
        name: create_args.name,
        description: create_args.description,
        case_id: create_args.case_id,
        tags: create_args.tags,
    };
    
    match self.bundle_handler.handle_create_bundle(request).await {
        Ok(response) => {
            let json = serde_json::to_value(response)
                .map_err(|_| tower_lsp::jsonrpc::Error::internal_error())?;
            Ok(Some(json))
        }
        Err(e) => {
            tracing::error!("Create bundle failed: {}", e);
            Err(tower_lsp::jsonrpc::Error::internal_error())
        }
    }
}

// Similar for delete, addLog, analyze...
```

**Checkpoint:** ✅ All bundle handlers implemented

---

### Phase 3: Feature Migration (4 hours)

#### Step 3.1: Add Pattern Engine Integration

**File:** `lsp-server/src/main_new.rs`

Add pattern support:
```rust
use log_scout_pattern_engine::PatternEngine;
use log_scout_pattern_loader::PatternLoader;
use log_scout_tagscout::SyncService;

pub struct CratesLspServer {
    client: Client,
    bundle_handler: Arc<BundleHandler>,
    pattern_engine: Arc<RwLock<Option<PatternEngine>>>,
    tagscout_service: Arc<RwLock<Option<SyncService>>>,
    documents: Arc<DashMap<Url, String>>,
}

// Add methods for pattern operations, document lifecycle, etc.
```

#### Step 3.2: Add Document Lifecycle Handlers

```rust
async fn did_open(&self, params: tower_lsp::lsp_types::DidOpenTextDocumentParams) {
    let uri = params.text_document.uri;
    let text = params.text_document.text;
    
    self.documents.insert(uri.clone(), text.clone());
    
    // Analyze document
    let diagnostics = self.analyze_document(&text, &uri).await;
    
    self.client.publish_diagnostics(uri, diagnostics, None).await;
}

async fn did_change(&self, params: tower_lsp::lsp_types::DidChangeTextDocumentParams) {
    // Handle incremental changes
}

async fn did_close(&self, params: tower_lsp::lsp_types::DidCloseTextDocumentParams) {
    self.documents.remove(&params.text_document.uri);
}
```

#### Step 3.3: Add Diagnostics Support

```rust
async fn analyze_document(&self, text: &str, uri: &tower_lsp::lsp_types::Url) 
    -> Vec<tower_lsp::lsp_types::Diagnostic> 
{
    let engine_guard = self.pattern_engine.read().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        let mut diagnostics = Vec::new();
        
        for (line_num, line) in text.lines().enumerate() {
            let detections = engine.process_line(line, line_num);
            
            for detection in detections {
                let diagnostic = self.detection_to_diagnostic(detection, line_num);
                diagnostics.push(diagnostic);
            }
        }
        
        diagnostics
    } else {
        Vec::new()
    }
}
```

**Checkpoint:** ✅ Pattern engine integrated

---

### Phase 4: Testing & Validation (4 hours)

#### Step 4.1: Unit Testing

Create test file: `lsp-server/src/tests.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_bundle_handler_creation() {
        let temp_dir = tempfile::tempdir().unwrap();
        let handler = BundleHandler::new(temp_dir.path());
        assert!(handler.is_ok());
    }
    
    #[tokio::test]
    async fn test_import_package_flow() {
        // Test the full import flow
    }
    
    // More tests...
}
```

Run tests:
```bash
cargo test --workspace
```

#### Step 4.2: Integration Testing

**Test Script:** `test-migration.bat`

```batch
@echo off
echo Testing Crates Migration...

REM Build new server
cd lsp-server
cargo build --release
if errorlevel 1 goto :error

REM Backup current binary
cd ..\vscode-extension\bin
copy /Y log-scout-lsp-server-win.exe log-scout-lsp-server-win-test-backup.exe

REM Deploy new binary
copy /Y ..\..\lsp-server\target\release\log-scout-lsp-server.exe log-scout-lsp-server-win.exe

echo New binary deployed. Test manually in VSCode.
echo If issues occur, restore: copy log-scout-lsp-server-win-test-backup.exe log-scout-lsp-server-win.exe
pause
goto :end

:error
echo Build failed!
pause

:end
```

#### Step 4.3: Manual Testing Checklist

**Core Functionality:**
- [ ] LSP server starts without errors
- [ ] Can open log files
- [ ] Diagnostics appear
- [ ] Pattern matching works
- [ ] TagScout sync works
- [ ] Pattern overrides work

**Bundle Operations:**
- [ ] Can list bundles
- [ ] Can create new bundle
- [ ] Can get bundle details
- [ ] **Can import QCSONE package** ⭐
- [ ] Archive extraction works
- [ ] Service detection works
- [ ] Can add log to bundle
- [ ] Can analyze bundle
- [ ] Can delete bundle

**Edge Cases:**
- [ ] Large files (>100MB)
- [ ] Nested archives
- [ ] Invalid archives
- [ ] Permission errors
- [ ] Network issues (TagScout)

**Checkpoint:** ✅ All tests passing

---

### Phase 5: Deployment (1 hour)

#### Step 5.1: Final Build

```bash
# Clean build
cd lsp-server
cargo clean
cargo build --release

# Verify binary
.\target\release\log-scout-lsp-server.exe --version
```

#### Step 5.2: Deploy to Extension

```bash
cd vscode-extension

# Backup legacy
copy bin\log-scout-lsp-server-win.exe bin\log-scout-lsp-server-win-legacy.exe

# Deploy new binary
copy ..\lsp-server\target\release\log-scout-lsp-server.exe bin\log-scout-lsp-server-win.exe

# Rebuild extension
npm run compile

# Package
npm run package
```

#### Step 5.3: Update Version

**File:** `lsp-server/Cargo.toml`
```toml
[package]
version = "0.2.0"  # Increment version
```

**File:** `vscode-extension/package.json`
```json
{
  "version": "0.0.162"
}
```

#### Step 5.4: Commit Changes

```bash
git add -A
git commit -m "feat: Migrate to crates-based LSP architecture

BREAKING CHANGE: LSP server now uses feature-based crates architecture

Features:
- ✅ Bundle import from QCSONE packages
- ✅ Archive extraction (zip, tar, nested)
- ✅ Enhanced service detection
- ✅ Timeframe analysis
- ✅ Proper error handling
- ✅ Better code organization

Migration:
- Replaced monolithic server with crates
- All existing features preserved
- Bundle operations now fully functional
- Custom request routing via execute_command

Testing:
- All unit tests passing
- Integration tests passing
- Manual testing complete

Version: 0.2.0"
```

#### Step 5.5: Create Release Tag

```bash
git tag -a v0.2.0 -m "Crates architecture migration complete"
```

**Checkpoint:** ✅ Deployed and tagged

---

## 5. Testing Plan

### 5.1 Automated Tests

**Unit Tests:** `cargo test --workspace`
- Bundle manager operations
- Archive extraction
- Service detection
- Pattern matching
- Configuration loading

**Integration Tests:**
- End-to-end bundle import
- Multiple archive formats
- Error scenarios
- Performance benchmarks

### 5.2 Manual Test Cases

**Test Case 1: Basic Bundle Import**
1. Open VSCode with extension
2. Right-click `700440257_qcsone_download_selected.zip`
3. Select "Scout: Import Log Package"
4. Verify: Progress notification
5. Verify: Bundle created
6. Verify: Files extracted (14 files)
7. Verify: Services detected (CUCM, CUP, Jabber)
8. **Expected:** ✅ Success message with details

**Test Case 2: Nested Archive**
1. Import package with nested .tar.gz
2. Verify: All archives extracted
3. Verify: All log files found
4. **Expected:** ✅ Recursive extraction works

**Test Case 3: Invalid Archive**
1. Try to import corrupted .zip
2. **Expected:** ❌ Clear error message

**Test Case 4: Large Archive (>1GB)**
1. Import large QCSONE package
2. Monitor memory usage
3. **Expected:** ✅ Completes without OOM

**Test Case 5: Pattern Analysis**
1. Import bundle
2. Click "Analyze Now"
3. Verify: Patterns detected
4. Verify: Diagnostics appear
5. **Expected:** ✅ Results shown correctly

### 5.3 Performance Benchmarks

| Operation | Legacy | Crates | Target |
|-----------|--------|--------|--------|
| Bundle import (100 files) | N/A | < 5s | < 5s |
| Pattern analysis (1000 lines) | ~200ms | ~200ms | < 300ms |
| Service detection | ~50ms | ~50ms | < 100ms |
| Memory usage (idle) | ~50MB | < 70MB | < 100MB |

---

## 6. Rollback Plan

### 6.1 Quick Rollback (5 minutes)

If critical issues found:

```bash
# Restore legacy binary
cd vscode-extension\bin
copy /Y log-scout-lsp-server-win-legacy.exe log-scout-lsp-server-win.exe

# Reload VSCode
# Press: Ctrl+Shift+P
# Type: Developer: Reload Window
```

### 6.2 Full Rollback (15 minutes)

```bash
# Restore from git
git checkout legacy-lsp-v0.1.10

# Rebuild legacy
cd lsp-server
cargo build --release

# Deploy
copy target\release\log-scout-lsp-server.exe ..\vscode-extension\bin\log-scout-lsp-server-win.exe

# Rebuild extension
cd ..\vscode-extension
npm run compile
```

### 6.3 Rollback Triggers

Roll back if:
- ❌ LSP server crashes on startup
- ❌ Diagnostics stop working
- ❌ Pattern matching fails
- ❌ Performance degrades >50%
- ❌ Data corruption detected
- ❌ Critical features broken

---

## 7. Risk Assessment

### 7.1 Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Breaking existing features** | HIGH | MEDIUM | Comprehensive testing, feature flags, rollback plan |
| **Performance regression** | MEDIUM | LOW | Benchmarking, profiling, optimization |
| **Data loss** | HIGH | VERY LOW | No data migration needed, bundles unchanged |
| **Extension compatibility** | MEDIUM | LOW | Minimal extension changes, backward compatible |
| **Build failures** | LOW | LOW | Clean dependencies, tested compilation |

### 7.2 Dependencies

**External:**
- ✅ tower-lsp (stable)
- ✅ tokio (mature)
- ✅ serde (stable)
- ⚠️ zip crate (add)
- ⚠️ tar crate (add)

**Internal:**
- ✅ All crates compile
- ✅ Tests pass
- ✅ No circular dependencies

### 7.3 Breaking Changes

**None Expected** - The migration is internal. VSCode extension changes are minimal and backward compatible.

---

## 8. Success Metrics

### 8.1 Must-Have (MVP)

- ✅ LSP server starts and runs
- ✅ All existing features work
- ✅ Bundle import works
- ✅ No performance regression
- ✅ Tests pass

### 8.2 Should-Have

- ✅ Improved error messages
- ✅ Better logging
- ✅ Archive extraction <5s
- ✅ Memory usage stable

### 8.3 Nice-to-Have

- ⭐ Performance improvement
- ⭐ Code coverage >80%
- ⭐ Reduced binary size

---

## 9. Timeline

### Day 1: Foundation
- Morning: Phase 0 + Phase 1 (Preparation & Foundation)
- Afternoon: Phase 2 (Core Integration)
- Evening: Testing basic functionality

### Day 2: Feature Complete
- Morning: Phase 3 (Feature Migration)
- Afternoon: Phase 4 (Testing)
- Evening: Phase 5 (Deployment)

### Day 3: Buffer
- Contingency for issues
- Additional testing
- Documentation updates

---

## 10. Documentation Updates

After migration:

1. **Update README.md**
   - Note architecture change
   - Update build instructions

2. **Update ARCHITECTURE.md**
   - Document new structure
   - Add diagrams

3. **Create MIGRATION.md**
   - Document changes
   - Known issues
   - Upgrade guide

4. **Update CHANGELOG.md**
   - v0.2.0 release notes
   - Breaking changes
   - New features

---

## 11. Communication Plan

### Before Migration
- ✉️ Notify team of upcoming changes
- 📅 Schedule maintenance window
- 📝 Share migration plan

### During Migration
- 📊 Update progress regularly
- 🐛 Document issues found
- ✅ Share test results

### After Migration
- 🎉 Announce completion
- 📖 Share updated docs
- 📈 Monitor metrics

---

## 12. Appendix

### A. Quick Reference Commands

```bash
# Build
cargo build --release --workspace

# Test
cargo test --workspace

# Check
cargo check --workspace

# Clean
cargo clean

# Deploy
npm run build:all
npm run package
```

### B. File Checklist

**Modified:**
- `lsp-server/src/main.rs` → New crates-based
- `lsp-server/Cargo.toml` → Add crate deps
- `vscode-extension/src/bundleTreeProvider.ts` → Use execute_command
- `vscode-extension/package.json` → Version bump

**Created:**
- `lsp-server/src/logging.rs`
- `test-migration.bat`

**Backed Up:**
- `log-scout-lsp-server-legacy-backup.exe`
- `log-scout-lsp-server-win-legacy-backup.exe`

### C. Troubleshooting

**Problem:** Build fails with "cannot find crate"
**Solution:** Check Cargo.toml paths, run `cargo update`

**Problem:** LSP server doesn't start
**Solution:** Check logs in `~/.log-scout-analyzer/lsp-server-crates-*.log`

**Problem:** Bundle import fails
**Solution:** Check file permissions, verify archive format

---

## 13. Final Checklist

Before declaring migration complete:

- [ ] All code committed
- [ ] All tests passing
- [ ] Manual testing complete
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Rollback plan tested
- [ ] Team notified
- [ ] Binary deployed
- [ ] Extension updated
- [ ] Version tagged
- [ ] Changelog updated
- [ ] Issues closed

---

## Conclusion

This migration plan provides a **comprehensive, safe, and incremental** approach to migrating from the legacy LSP server to the new crates-based architecture.

**Key Benefits:**
- ✅ Enables bundle import and advanced features
- ✅ Better code organization
- ✅ Easier maintenance
- ✅ Future-proof architecture
- ✅ No breaking changes for users

**Time Investment:** 2-3 days  
**Risk Level:** LOW (with proper testing)  
**Reward:** HIGH (enables critical features)

**Ready to begin!** 🚀

---

**Next Step:** Begin Phase 0 (Preparation & Backup)