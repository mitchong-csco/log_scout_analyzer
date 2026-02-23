# Bundle Import Stages and Async UI Architecture

## Overview

This document describes the stages of importing an archive file into a bundle and explains how we can optimize the UI experience by making it async.

## Current Architecture: Synchronous Flow

Currently, the bundle import follows a **synchronous request-response pattern**:

```
User Action → Extension Request → LSP Processing → LSP Response → UI Update
                                    (blocks here)
```

### Problem
- User waits for entire import to complete before seeing any feedback
- Large archives (500MB+) can take minutes to extract and process
- UI appears frozen during extraction
- No progress indication

---

## Proposed Architecture: Async with Progress

```
User Action → Immediate UI Update → Background LSP Processing → Progressive UI Updates
              (optimistic UI)         (with progress events)      (status updates)
```

### Benefits
1. **Immediate Feedback**: UI shows "Importing..." state instantly
2. **Progress Updates**: Real-time progress notifications
3. **Cancellable**: User can cancel long-running imports
4. **Non-blocking**: User can continue working

---

## Detailed Import Stages

### Stage 1: **User Initiation** (Extension)
**Duration**: Instant  
**Location**: `vscode-extension/src/bundleDataProvider.ts`

```typescript
// User clicks "Import Archive" or drops file
async importPackageToBundle(packagePath: string) {
    // Immediately show importing state
    const tempBundleId = `temp_${Date.now()}`;
    this.addOptimisticBundle(tempBundleId, packagePath);
    
    // Send async request to LSP
    const result = await this.sendImportRequest(packagePath);
    
    // Update with real data
    this.updateBundleWithResult(tempBundleId, result);
}
```

**Actions**:
- Validate file path exists
- Show optimistic UI entry: "Importing: filename.zip"
- Start progress notification
- Send request to LSP

---

### Stage 2: **LSP Request Reception** (LSP Server)
**Duration**: < 1ms  
**Location**: `lsp-server/src/server.rs` → `handle_bundle_request()`

```rust
"scout/bundle/importPackage" => {
    // Parse parameters
    let params: ImportPackageParams = serde_json::from_value(params)?;
    
    // Send initial progress notification
    client.send_progress("Preparing import...", 0);
    
    // Start async processing
    let result = manager_mut.import_log_package(
        Path::new(&params.package_path),
        params.bundle_name,
        params.case_id,
    )?;
}
```

**Actions**:
- Parse request parameters
- Validate file exists and is readable
- Send initial progress: 0%
- Call bundle manager

---

### Stage 3: **Archive Extraction** (Bundle Manager)
**Duration**: 5s - 5min (depends on size)  
**Location**: `lsp-server/src/bundle/archive_extractor.rs`

```rust
// Extract archive
let extracted_files = ArchiveExtractor::extract_archive(package_path, &temp_dir)
    .map_err(|e| BundleError::ArchiveError(...))?;

// Progress updates during extraction:
// - 0-40%: Extracting ZIP/TAR
// - 40-50%: Finding nested archives
// - 50-60%: Extracting nested archives
```

**Sub-stages**:
1. **Create temp directory** (1%)
   ```rust
   let temp_dir = std::env::temp_dir().join(format!("log-scout-import-{}", uuid));
   fs::create_dir_all(&temp_dir)?;
   ```

2. **Detect archive format** (2%)
   ```rust
   let extension = archive_path.extension()
       .and_then(|e| e.to_str())
       .unwrap_or("");
   ```

3. **Extract primary archive** (3-30%)
   ```rust
   match extension.to_lowercase().as_str() {
       "zip" => Self::extract_zip(archive_path, dest)?,
       "tar" | "tgz" | "gz" => Self::extract_tar(archive_path, dest)?,
       _ => return Err(...),
   }
   ```
   - For large files: send progress updates every 50 files extracted
   - Progress: `(files_extracted / total_files) * 30`

4. **Detect nested archives** (31-40%)
   ```rust
   for file in &extracted {
       if matches!(ext, "zip" | "tar" | "tgz" | "gz") {
           // Found nested archive
           let nested_files = Self::extract_archive(file, nested_dest)?;
       }
   }
   ```

5. **Filter log files** (41-50%)
   ```rust
   let log_files = ArchiveExtractor::filter_log_files(&extracted_files);
   // Progress: 50%
   ```

**Output**: Vector of extracted file paths

---

### Stage 4: **Bundle Creation** (Bundle Manager)
**Duration**: 100ms  
**Location**: `lsp-server/src/bundle/manager.rs`

```rust
// Detect case ID from filename
let detected_case_id = case_id.or_else(|| {
    package_path
        .file_name()
        .and_then(|n| n.to_str())
        .and_then(|s| ArchiveExtractor::detect_case_id(s))
});

// Generate bundle name
let bundle_name = bundle_name.unwrap_or_else(|| {
    if let Some(case_id) = &detected_case_id {
        format!("Case {}", case_id)
    } else {
        format!("Import {}", package_path.file_stem()...)
    }
});

// Create bundle metadata
let mut metadata = BundleMetadata::default();
metadata.case_id = detected_case_id.clone();
metadata.tags.push("imported".to_string());

// Create the bundle
let bundle_id = self.create_bundle(bundle_name, None, Some(metadata))?;
// Progress: 55%
```

**Actions**:
- Detect case ID from filename (e.g., "700440257_qcsone_download.zip" → "700440257")
- Generate bundle name
- Create bundle metadata
- Persist bundle to disk

**Output**: Bundle ID (e.g., "bundle_abc123")

---

### Stage 5: **Log File Processing** (Bundle Manager)
**Duration**: 1s - 2min (depends on count)  
**Location**: `lsp-server/src/bundle/manager.rs` → `add_log_to_bundle()`

```rust
let mut success_count = 0;
let mut failed_files = Vec::new();

for (index, file_path) in log_files.iter().enumerate() {
    // Progress: 55-95%
    let progress = 55 + ((index as f32 / log_files.len() as f32) * 40.0) as u32;
    client.send_progress(&format!("Adding log {}/{}", index+1, log_files.len()), progress);
    
    match self.add_log_to_bundle(&bundle_id, file_path.to_str()?, None, None) {
        Ok(_) => success_count += 1,
        Err(e) => failed_files.push(file_path.clone()),
    }
}
```

**For each log file**:
1. **Read file metadata** (size, modified date)
2. **Detect service type** (Jabber, Webex, System, etc.)
3. **Copy file to bundle directory**
4. **Create log entry in bundle manifest**
5. **Update progress**

**Output**: 
- success_count: Number of files successfully added
- failed_files: List of files that failed to add

---

### Stage 6: **Analysis & Indexing** (Optional)
**Duration**: 5s - 5min  
**Location**: `lsp-server/src/bundle/analyzer.rs`

```rust
// Analyze bundle for patterns (optional - can be async)
let analysis = BundleAnalyzer::analyze_bundle(&bundle)?;
// Progress: 95-100%
```

**Actions**:
- Scan files for known patterns
- Build timeline of events
- Generate statistics
- Create searchable index

**Note**: This can be done asynchronously AFTER the bundle is visible in UI

---

### Stage 7: **Cleanup** (Bundle Manager)
**Duration**: 100ms  
**Location**: `lsp-server/src/bundle/manager.rs`

```rust
// Clean up temp directory
if let Err(e) = fs::remove_dir_all(&temp_dir) {
    tracing::warn!("Failed to clean up temp directory: {}", e);
}
// Progress: 100%
```

**Actions**:
- Delete temporary extraction directory
- Clean up any intermediate files

---

### Stage 8: **Response & UI Update** (Extension)
**Duration**: Instant  
**Location**: Extension receives LSP response

```typescript
// Response received from LSP
{
    bundleId: "bundle_abc123",
    bundleName: "Case 700440257",
    caseId: "700440257",
    importedCount: 47,
    totalFiles: 52,
    failedFiles: 0
}

// Update UI
this.updateBundleStatus(bundleId, 'complete');
this.refreshTree();
vscode.window.showInformationMessage(
    `Imported ${result.importedCount} log files to ${result.bundleName}`
);
```

**Actions**:
- Remove optimistic UI entry
- Add real bundle to tree
- Show success notification
- Open bundle in explorer

---

## Optimized Async Flow

### Answer to Your Questions

#### 1. **Does LSP need to respond before UI updates?**

**NO!** We can use an **optimistic UI pattern**:

```typescript
// IMMEDIATE: Add placeholder to UI
const tempBundle = {
    id: `temp_${Date.now()}`,
    name: `Importing ${filename}...`,
    status: 'importing',
    progress: 0
};
bundleDataProvider.addBundle(tempBundle);

// ASYNC: Send request to LSP
const promise = sendImportRequest(path);

// PROGRESSIVE: Listen for progress events
lspClient.onProgress((progress) => {
    bundleDataProvider.updateProgress(tempBundle.id, progress);
});

// FINAL: Update with real data when complete
const result = await promise;
bundleDataProvider.replaceBundle(tempBundle.id, result);
```

#### 2. **Can we create bundle in UI first?**

**YES!** Recommended pattern:

```
┌─────────────────────────────────────────────────┐
│ Extension (UI Thread)                           │
├─────────────────────────────────────────────────┤
│ 1. User drops file                              │
│ 2. IMMEDIATE: Show in tree with spinner        │
│    ├─ 📦 Importing archive.zip...              │
│    └─ ⏳ 0% Extracting...                      │
│ 3. Send async request to LSP                   │
│ 4. Listen for progress notifications           │
│ 5. Update progress bar in tree                 │
│ 6. Replace with real bundle when done          │
└─────────────────────────────────────────────────┘
                    │
                    ▼ (async, non-blocking)
┌─────────────────────────────────────────────────┐
│ LSP Server (Background)                         │
├─────────────────────────────────────────────────┤
│ 1. Receive request                              │
│ 2. Send progress: 0% "Starting..."             │
│ 3. Extract archive → progress: 40%             │
│ 4. Filter logs → progress: 50%                 │
│ 5. Create bundle → progress: 55%               │
│ 6. Add files → progress: 55-95%                │
│ 7. Analyze → progress: 95-100%                 │
│ 8. Send final response with bundle ID          │
└─────────────────────────────────────────────────┘
```

---

## Implementation: Progress Notifications

### LSP Server (Rust)

```rust
// In server.rs
impl LogScoutServer {
    async fn send_import_progress(&self, token: &str, message: &str, percentage: u32) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(WorkDoneProgress::Report(
                WorkDoneProgressReport {
                    message: Some(message.to_string()),
                    percentage: Some(percentage),
                    cancellable: Some(true),
                }
            ))
        };
        self.client.send_notification::<Progress>(params).await;
    }
}

// In bundle import
pub async fn import_log_package_async(
    &mut self,
    package_path: &Path,
    progress_token: String,
    client: &Client,
) -> Result<ImportResult> {
    // Stage 1: Extraction (0-40%)
    client.send_import_progress(&progress_token, "Extracting archive...", 5).await;
    let extracted = extract_archive(package_path)?;
    client.send_import_progress(&progress_token, "Filtering log files...", 40).await;
    
    // Stage 2: Filtering (40-50%)
    let log_files = filter_log_files(&extracted);
    client.send_import_progress(&progress_token, "Creating bundle...", 50).await;
    
    // Stage 3: Bundle creation (50-55%)
    let bundle_id = create_bundle(...)?;
    client.send_import_progress(&progress_token, "Adding log files...", 55).await;
    
    // Stage 4: Add files (55-95%)
    for (i, file) in log_files.iter().enumerate() {
        let progress = 55 + ((i as f32 / log_files.len() as f32) * 40.0) as u32;
        client.send_import_progress(
            &progress_token,
            &format!("Adding file {}/{}", i+1, log_files.len()),
            progress
        ).await;
        add_log_to_bundle(&bundle_id, file)?;
    }
    
    // Stage 5: Finalizing (95-100%)
    client.send_import_progress(&progress_token, "Finalizing...", 95).await;
    cleanup_temp_dir()?;
    client.send_import_progress(&progress_token, "Complete!", 100).await;
    
    Ok(result)
}
```

### Extension (TypeScript)

```typescript
export class BundleDataProvider {
    private importingBundles = new Map<string, ImportProgress>();
    
    async importArchive(archivePath: string): Promise<void> {
        const progressToken = `import_${Date.now()}`;
        const filename = path.basename(archivePath);
        
        // Create optimistic UI entry
        const tempBundle: BundleItem = {
            id: progressToken,
            name: `Importing ${filename}`,
            status: 'importing',
            progress: 0,
            children: []
        };
        
        this.addOptimisticBundle(tempBundle);
        
        // Listen for progress notifications
        this.lspClient.onProgress((params) => {
            if (params.token === progressToken) {
                this.updateImportProgress(progressToken, params.value);
            }
        });
        
        try {
            // Send async request
            const result = await this.lspClient.sendRequest(
                'scout/bundle/importPackage',
                {
                    packagePath: archivePath,
                    progressToken: progressToken
                }
            );
            
            // Replace optimistic entry with real bundle
            this.removeOptimisticBundle(progressToken);
            this.addBundle(result);
            
            vscode.window.showInformationMessage(
                `Successfully imported ${result.importedCount} log files`
            );
            
        } catch (error) {
            // Remove optimistic entry on error
            this.removeOptimisticBundle(progressToken);
            vscode.window.showErrorMessage(`Import failed: ${error}`);
        }
    }
    
    private updateImportProgress(token: string, progress: WorkDoneProgress) {
        const bundle = this.importingBundles.get(token);
        if (bundle) {
            bundle.progress = progress.percentage || 0;
            bundle.message = progress.message || '';
            this._onDidChangeTreeData.fire(bundle);
        }
    }
}
```

---

## Performance Estimates

### Small Archive (< 10MB, < 50 files)
- **Stage 1-2**: < 100ms (instant UI response)
- **Stage 3**: 1-3 seconds (extraction)
- **Stage 4**: < 100ms (bundle creation)
- **Stage 5**: 2-5 seconds (file processing)
- **Total**: ~3-8 seconds

### Medium Archive (10-100MB, 50-200 files)
- **Stage 1-2**: < 100ms
- **Stage 3**: 5-15 seconds
- **Stage 4**: < 100ms
- **Stage 5**: 10-30 seconds
- **Total**: ~15-45 seconds

### Large Archive (100MB-1GB, 200-1000 files)
- **Stage 1-2**: < 100ms
- **Stage 3**: 30-120 seconds
- **Stage 4**: < 100ms
- **Stage 5**: 30-180 seconds
- **Total**: ~1-5 minutes

### QCSONE Package (typically 200-500MB)
- **Stage 1-2**: < 100ms
- **Stage 3**: 45-90 seconds (nested archives)
- **Stage 4**: < 100ms
- **Stage 5**: 60-120 seconds
- **Total**: ~2-4 minutes

---

## Cancellation Support

Users should be able to cancel long-running imports:

```typescript
// Extension
const cancellationToken = new vscode.CancellationTokenSource();

const importPromise = this.lspClient.sendRequest(
    'scout/bundle/importPackage',
    { packagePath, progressToken },
    cancellationToken.token
);

// User clicks "Cancel" button
cancellationToken.cancel();
```

```rust
// LSP Server
if cancellation_token.is_cancelled() {
    cleanup_partial_import()?;
    return Err(BundleError::Cancelled);
}
```

---

## Summary

### Current Behavior
❌ Blocks UI during entire import  
❌ No progress feedback  
❌ Can't cancel  
❌ Appears frozen  

### Optimized Behavior
✅ Immediate UI feedback  
✅ Real-time progress updates  
✅ Cancellable operations  
✅ User can continue working  
✅ Better error handling  

### Key Insight
**The LSP does NOT need to respond before updating the UI.** Use optimistic UI patterns with progress notifications for the best user experience!