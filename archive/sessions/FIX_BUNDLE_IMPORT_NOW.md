# Fix Bundle Import - Immediate Action Required

**Issue**: QCSONE package import doesn't work  
**Root Cause**: Missing LSP handler for `scout/bundle/importPackage`  
**Estimated Fix Time**: 30 minutes  
**Priority**: HIGH

---

## The Problem

When you try to import a QCSONE package (.zip file):
1. ✅ VSCode extension shows the command
2. ✅ UI sends request to LSP server: `scout/bundle/importPackage`
3. ❌ **LSP server doesn't have a handler for this command**
4. ❌ Request falls into "unknown command" case
5. ❌ Nothing happens, user sees no error

---

## The Solution

**File to Edit**: `lsp-server/src/server.rs`  
**Function**: `handle_bundle_request()` (around line 558)  
**Action**: Add new case for `scout/bundle/importPackage`

---

## Step-by-Step Fix

### Step 1: Open the File
```
lsp-server/src/server.rs
```

### Step 2: Find the Function
Search for: `async fn handle_bundle_request`

You'll see:
```rust
match method {
    "scout/bundle/list" => { /* ... */ }
    "scout/bundle/get" => { /* ... */ }
    "scout/bundle/create" => { /* ... */ }
    _ => {
        tracing::warn!("Unknown bundle request: {}", method);
        Err(JsonRpcError::method_not_found())
    }
}
```

### Step 3: Add This Case BEFORE the `_` Case

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

    let params: ImportPackageParams = serde_json::from_value(params)
        .map_err(|e| {
            tracing::error!("Failed to parse import params: {}", e);
            JsonRpcError::invalid_params("Invalid parameters".to_string())
        })?;

    tracing::info!("Importing package: {}", params.package_path);

    // Need mutable access to bundle manager
    drop(manager_opt);
    let mut manager_guard = self.bundle_manager.write().await;
    let manager_mut = manager_guard
        .as_mut()
        .ok_or_else(|| {
            tracing::error!("Bundle manager not initialized");
            JsonRpcError::method_not_found()
        })?;

    // Import the package
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
        "importedCount": result.summary.success_count,
        "totalFiles": result.summary.total_files,
        "serviceCounts": result.summary.by_service(),
    });

    tracing::info!("Package imported successfully: {} files", result.summary.success_count);
    Ok(response)
}
```

### Step 4: Build the LSP Server

```bash
cd lsp-server
cargo build --release
```

### Step 5: Copy Binary to Extension

```bash
# Windows
copy lsp-server\target\release\log-scout-lsp-server.exe vscode-extension\bin\log-scout-lsp-server-win.exe

# Or use the build script
.\build-lsp.bat
```

### Step 6: Reload VSCode

1. Press `Ctrl+Shift+P`
2. Type: "Developer: Reload Window"
3. Press Enter

### Step 7: Test It!

1. Right-click a `.zip` file in Explorer
2. Select "Scout: Import Log Package (QCSONE)"
3. Watch for progress notification
4. Verify bundle appears in Bundle tree view

---

## What This Does

The new handler:
1. ✅ Parses the package path from request
2. ✅ Extracts the archive (including nested archives)
3. ✅ Detects services (Jabber, CUCM, CUP, etc.)
4. ✅ Analyzes timeframes
5. ✅ Detects case number from filename
6. ✅ Creates bundle with all logs
7. ✅ Returns summary to UI

---

## Additional Fixes (Optional)

While you're at it, you can add these other missing handlers:

### Fix 1: Add Log to Bundle

```rust
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

    drop(manager_opt);
    let mut manager_guard = self.bundle_manager.write().await;
    let manager_mut = manager_guard
        .as_mut()
        .ok_or_else(|| JsonRpcError::method_not_found())?;

    let log = manager_mut
        .add_log_to_bundle(&params.bundle_id, std::path::Path::new(&params.file_path))
        .map_err(|_| JsonRpcError::internal_error())?;

    Ok(serde_json::json!({
        "service": format!("{:?}", log.service),
        "sizeBytes": log.size_bytes,
        "lineCount": log.line_count,
    }))
}
```

### Fix 2: Delete Bundle

```rust
"scout/bundle/delete" => {
    #[derive(Deserialize)]
    struct DeleteParams {
        #[serde(rename = "bundleId")]
        bundle_id: String,
    }

    let params: DeleteParams = serde_json::from_value(params)
        .map_err(|_| JsonRpcError::invalid_params("Invalid parameters".to_string()))?;

    drop(manager_opt);
    let mut manager_guard = self.bundle_manager.write().await;
    let manager_mut = manager_guard
        .as_mut()
        .ok_or_else(|| JsonRpcError::method_not_found())?;

    manager_mut
        .delete_bundle(&params.bundle_id)
        .map_err(|_| JsonRpcError::internal_error())?;

    Ok(serde_json::json!({
        "success": true,
        "bundleId": params.bundle_id,
    }))
}
```

---

## Verification Checklist

After making the fix:

- [ ] Code compiles without errors
- [ ] Binary copied to extension folder
- [ ] VSCode reloaded
- [ ] Import command visible in context menu
- [ ] Can import a .zip file
- [ ] Progress notification appears
- [ ] Bundle created successfully
- [ ] Files extracted and detected
- [ ] Services identified correctly
- [ ] Bundle appears in tree view
- [ ] Can analyze the bundle
- [ ] Results appear correctly

---

## Troubleshooting

### Build Errors

**Error**: `import_log_package not found`
- **Fix**: Make sure `bundle.rs` has this method
- **Check**: `lsp-server/src/bundle.rs` should have `impl BundleManager { pub fn import_log_package(...) }`

### Import Fails Silently

**Check LSP logs**:
```
%USERPROFILE%\.log-scout-analyzer\lsp-server-2026-02-19.log
```

Look for:
- "Unknown bundle request: scout/bundle/importPackage" → Handler not added
- "Import failed: ..." → Shows actual error
- "Package imported successfully" → It worked!

### Binary Not Updated

**Verify binary timestamp**:
```bash
dir vscode-extension\bin\log-scout-lsp-server-win.exe
```

Should match recent build time. If not, copy manually.

---

## Quick Build & Deploy Script

Create `fix-and-deploy.bat`:

```batch
@echo off
echo Building LSP server...
cd lsp-server
cargo build --release
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo Copying binary...
copy /Y target\release\log-scout-lsp-server.exe ..\vscode-extension\bin\log-scout-lsp-server-win.exe

echo Done! Reload VSCode window now.
pause
```

Run: `fix-and-deploy.bat`

---

## Expected Behavior After Fix

### Before Fix:
```
User: Right-click .zip → Import Log Package
System: ...nothing happens...
User: 😕
```

### After Fix:
```
User: Right-click .zip → Import Log Package
System: ⏳ "Importing 700440257_qcsone_download_selected.zip..."
System: 📦 "Extracting archive (including nested archives)..."
System: ✅ "Bundle Created Successfully!"
        📋 Case: 700440257
        📦 Imported: 14/14 files
        🔍 Services Detected:
           • CUCM: 8 log(s)
           • CUP: 4 log(s)
           • Jabber: 2 log(s)
User: 😊 [Clicks "Analyze Now"]
```

---

## Success Criteria

✅ Bundle import works  
✅ Archives are extracted  
✅ Services are detected  
✅ Case number identified  
✅ Logs appear in bundle  
✅ Can analyze bundle  
✅ Results display correctly  

---

## Next Steps After This Fix

1. **Test thoroughly** with various QCSONE packages
2. **Add remaining handlers** (addLog, delete, analyze)
3. **Consider migration** to crates architecture
4. **Update documentation** with new capabilities
5. **Add error handling** improvements
6. **Write integration tests**

---

## Need Help?

Check these files:
- `WORKSPACE_REVIEW_2026_02_19.md` - Full project audit
- `PROJECT_STATUS_REVIEW.md` - Detailed status
- `QCSONE_IMPORT_COMPLETE.md` - Import feature design
- `lsp-server/src/bundle.rs` - Bundle implementation

---

**GO FIX IT NOW!** 🚀

The code is waiting, the implementation exists in the crates, you just need to wire it up!

**Time to fix**: 30 minutes  
**Impact**: HIGH - Enables core feature  
**Difficulty**: EASY - Copy and paste with minor adjustments