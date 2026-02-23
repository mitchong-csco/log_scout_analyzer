# Migration Plan - REVISED (Pragmatic Approach)

**Date:** February 19, 2026  
**Status:** IN PROGRESS  
**Issue Found:** New crates don't compile yet - need different approach

---

## 🔍 What We Discovered

### Problem
During Phase 0 preparation, we found:
- ❌ `crates/lsp-server` has 25+ compilation errors
- ❌ Missing dependencies (futures, dateparser, etc.)
- ❌ API mismatches (methods don't exist)
- ❌ Type mismatches in bundle manager
- ✅ Legacy `lsp-server/` compiles fine

### Root Cause
The new crates were **designed but not fully implemented**. They're architectural blueprints, not working code yet.

---

## 🎯 Revised Strategy: Hybrid Approach

Instead of migrating to broken crates, we'll **enhance the legacy server** with features from the crate designs.

### Option A: Implement Bundle Import in Legacy Server (RECOMMENDED)
**Time:** 1-2 days  
**Risk:** Low  
**Reward:** Bundle import works immediately

### Option B: Fix Crates Then Migrate
**Time:** 3-5 days  
**Risk:** Medium  
**Reward:** Full architecture migration

### Decision: Choose Option A (Pragmatic)

---

## 📋 Option A: Enhanced Legacy Server Implementation

### Phase 1: Add Archive Extraction (3 hours)

**File:** `lsp-server/Cargo.toml`
```toml
[dependencies]
# Add archive support
zip = "0.6"
tar = "0.4"
flate2 = "1.0"
```

**File:** `lsp-server/src/bundle/archive_extractor.rs` (NEW)
```rust
//! Archive extraction utilities

use anyhow::Result;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use zip::ZipArchive;

pub struct ArchiveExtractor;

impl ArchiveExtractor {
    pub fn extract_zip(archive_path: &Path, dest: &Path) -> Result<Vec<PathBuf>> {
        let file = File::open(archive_path)?;
        let mut archive = ZipArchive::new(file)?;
        let mut extracted = Vec::new();
        
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = dest.join(file.name());
            
            if file.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)?;
                }
                let mut outfile = File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
                extracted.push(outpath);
            }
        }
        
        Ok(extracted)
    }
    
    pub fn detect_case_id(filename: &str) -> Option<String> {
        // Extract case ID from QCSONE filename: 700440257_qcsone_download_selected.zip
        if let Some(first_part) = filename.split('_').next() {
            if first_part.chars().all(|c| c.is_numeric()) && first_part.len() >= 9 {
                return Some(first_part.to_string());
            }
        }
        None
    }
}
```

**File:** `lsp-server/src/bundle/mod.rs` - Add module
```rust
pub mod archive_extractor;
pub use archive_extractor::ArchiveExtractor;
```

---

### Phase 2: Implement Import Logic in Manager (4 hours)

**File:** `lsp-server/src/bundle/manager.rs`

Add method:
```rust
pub fn import_log_package(
    &mut self,
    package_path: &Path,
    bundle_name: Option<String>,
    case_id: Option<String>,
) -> Result<ImportResult, BundleError> {
    use crate::bundle::ArchiveExtractor;
    
    // Create temp extraction directory
    let temp_dir = std::env::temp_dir().join(format!("log-scout-import-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&temp_dir)?;
    
    // Extract archive
    tracing::info!("Extracting archive: {:?}", package_path);
    let extracted_files = ArchiveExtractor::extract_zip(package_path, &temp_dir)
        .map_err(|e| BundleError::Io(e.into()))?;
    
    // Detect case ID from filename if not provided
    let detected_case_id = case_id.or_else(|| {
        package_path
            .file_name()
            .and_then(|n| n.to_str())
            .and_then(|s| ArchiveExtractor::detect_case_id(s))
    });
    
    // Create bundle
    let bundle_name = bundle_name.unwrap_or_else(|| {
        format!("Import {}", detected_case_id.as_deref().unwrap_or("Unknown"))
    });
    
    let bundle_id = self.create_bundle(
        bundle_name.clone(),
        Some(format!("Imported from {:?}", package_path)),
        detected_case_id.clone(),
    )?;
    
    // Add all log files to bundle
    let mut success_count = 0;
    let mut failed_files = Vec::new();
    
    for file_path in &extracted_files {
        // Only add files that look like logs
        if let Some(ext) = file_path.extension() {
            if ext == "log" || ext == "txt" || ext == "out" {
                match self.add_log_to_bundle(&bundle_id, file_path.to_str().unwrap(), None, None) {
                    Ok(_) => success_count += 1,
                    Err(e) => {
                        tracing::warn!("Failed to add {:?}: {}", file_path, e);
                        failed_files.push(file_path.clone());
                    }
                }
            }
        }
    }
    
    // Clean up temp directory
    let _ = std::fs::remove_dir_all(&temp_dir);
    
    Ok(ImportResult {
        bundle_id,
        bundle_name,
        case_id: detected_case_id,
        total_files: extracted_files.len(),
        success_count,
        failed_files,
    })
}

pub struct ImportResult {
    pub bundle_id: String,
    pub bundle_name: String,
    pub case_id: Option<String>,
    pub total_files: usize,
    pub success_count: usize,
    pub failed_files: Vec<PathBuf>,
}
```

---

### Phase 3: Wire Up to LSP Server (2 hours)

**File:** `lsp-server/src/server.rs`

Update the `handle_bundle_request` we already added:

```rust
"scout/bundle/importPackage" => {
    #[derive(Deserialize)]
    struct ImportPackageParams {
        #[serde(rename = "packagePath")]
        package_path: String,
        #[serde(rename = "bundleName")]
        bundle_name: Option<String>,
        #[serde(rename = "caseId")]
        case_id: Option<String>,
    }

    let params: ImportPackageParams = serde_json::from_value(params).map_err(|e| {
        tracing::error!("Failed to parse import params: {}", e);
        JsonRpcError::invalid_params("Invalid parameters".to_string())
    })?;

    tracing::info!("Importing package: {}", params.package_path);

    // Need mutable access to bundle manager
    drop(manager_opt);
    let mut manager_guard = self.bundle_manager.write().await;
    let manager_mut = manager_guard.as_mut().ok_or_else(|| {
        tracing::error!("Bundle manager not initialized");
        JsonRpcError::method_not_found()
    })?;

    // Import the package (NOW THIS METHOD EXISTS!)
    let result = manager_mut
        .import_log_package(
            std::path::Path::new(&params.package_path),
            params.bundle_name,
            params.case_id,
        )
        .map_err(|e| {
            tracing::error!("Import failed: {}", e);
            JsonRpcError::internal_error()
        })?;

    // Build response
    let response = serde_json::json!({
        "bundleId": result.bundle_id,
        "bundleName": result.bundle_name,
        "caseId": result.case_id,
        "importedCount": result.success_count,
        "totalFiles": result.total_files,
    });

    tracing::info!("Package imported successfully: {} files", result.success_count);
    Ok(response)
}
```

Also need to initialize bundle_manager in the server:

```rust
async fn initialized(&self, _params: InitializedParams) {
    tracing::info!("LSP server initialized successfully");
    
    // Initialize bundle manager
    if let Err(e) = self.initialize_bundle_manager().await {
        tracing::error!("Failed to initialize bundle manager: {}", e);
    }
    
    self.client
        .log_message(MessageType::INFO, "Log Scout Analyzer ready!")
        .await;
    
    // ... existing TagScout initialization
}
```

---

### Phase 4: Update VSCode Extension (1 hour)

**File:** `vscode-extension/src/bundleTreeProvider.ts`

Change from custom request to execute_command:

```typescript
async importPackage(packagePath: string): Promise<any> {
  const client = getLSPClient();
  if (!client) {
    throw new Error("LSP client not available");
  }

  // Use workspace/executeCommand
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

But WAIT - we still need to route execute_command to handle_bundle_request!

**File:** `lsp-server/src/server.rs` - Update execute_command:

```rust
async fn execute_command(
    &self,
    params: ExecuteCommandParams,
) -> Result<Option<serde_json::Value>> {
    tracing::info!("Executing command: {}", params.command);

    match params.command.as_str() {
        // Route bundle commands to handler
        cmd if cmd.starts_with("logScout.bundle.") => {
            let method = cmd.replace("logScout.bundle.", "scout/bundle/");
            let args = params.arguments.get(0).cloned().unwrap_or(serde_json::json!({}));
            
            match self.handle_bundle_request(&method, args).await {
                Ok(response) => Ok(Some(response)),
                Err(e) => {
                    self.client.show_message(MessageType::ERROR, &format!("Error: {:?}", e)).await;
                    Err(e)
                }
            }
        }
        
        // Existing commands
        "logScout.analyze" => { /* ... */ }
        "logScout.refreshPatterns" => { /* ... */ }
        // ... rest of existing commands
        
        _ => {
            tracing::warn!("Unknown command: {}", params.command);
            Ok(None)
        }
    }
}
```

---

## 🧪 Testing Plan

### Step 1: Test Compilation
```bash
cd lsp-server
cargo check
```

### Step 2: Test Archive Extraction
```rust
#[test]
fn test_archive_extraction() {
    let test_zip = Path::new("test.zip");
    let dest = Path::new("./test-extract");
    let result = ArchiveExtractor::extract_zip(test_zip, dest);
    assert!(result.is_ok());
}
```

### Step 3: Test Bundle Import
1. Build: `cargo build --release`
2. Deploy binary to extension
3. Open VSCode
4. Right-click `.zip` file
5. Select "Import Log Package"
6. Verify: Bundle created with logs

---

## ✅ Success Criteria

- [ ] Archive extraction works
- [ ] Case ID detection works
- [ ] Bundle creation from archive works
- [ ] Logs added to bundle correctly
- [ ] Service detection works (existing code)
- [ ] UI shows success message
- [ ] Bundle appears in tree view

---

## 📊 Time Estimate

- Phase 1: Archive extraction (3 hours)
- Phase 2: Import logic (4 hours)
- Phase 3: LSP wiring (2 hours)
- Phase 4: Extension update (1 hour)
- Testing: (2 hours)

**Total: ~12 hours (1.5 days)**

Much faster than full crates migration!

---

## 🔄 Rollback

Same as before:
```bash
cd vscode-extension/bin
cp log-scout-lsp-server-win-legacy-backup.exe log-scout-lsp-server-win.exe
```

---

## 📝 Implementation Order

1. ✅ Phase 0: Backups (DONE)
2. ⏭️ Phase 1: Add archive extraction
3. ⏭️ Phase 2: Implement import_log_package
4. ⏭️ Phase 3: Wire up LSP routing
5. ⏭️ Phase 4: Update extension
6. ⏭️ Testing & deployment

---

## 💡 Why This Is Better

✅ Works with existing, stable code
✅ No need to fix broken crates
✅ Faster implementation (12 vs 16 hours)
✅ Lower risk (building on working code)
✅ Same end result (bundle import works)
✅ Can still migrate to crates later when they're ready

---

## 🚀 Next Step

Begin Phase 1: Add archive extraction to legacy server.

**Status:** Ready to implement pragmatic solution!