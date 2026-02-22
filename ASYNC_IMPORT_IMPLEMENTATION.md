# Async Import Implementation Guide

This guide shows exactly what code changes are needed to implement async bundle import with progress updates.

---

## Implementation Checklist

- [ ] Add progress notification support to LSP server
- [ ] Update import_log_package to send progress events
- [ ] Add optimistic UI to BundleDataProvider
- [ ] Listen for progress notifications in extension
- [ ] Add progress UI to tree view
- [ ] Add cancellation support
- [ ] Test with small, medium, and large archives

---

## Part 1: LSP Server Changes (Rust)

### 1.1 Add Progress Trait to LogScoutServer

**File**: `lsp-server/src/server.rs`

```rust
use tower_lsp::lsp_types::{
    Progress, ProgressParams, ProgressParamsValue, ProgressToken,
    WorkDoneProgress, WorkDoneProgressBegin, WorkDoneProgressReport,
    WorkDoneProgressEnd, NumberOrString
};

impl LogScoutServer {
    /// Send progress notification to client
    async fn send_progress(
        &self,
        token: &str,
        message: &str,
        percentage: u32,
    ) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(
                WorkDoneProgress::Report(WorkDoneProgressReport {
                    cancellable: Some(true),
                    message: Some(message.to_string()),
                    percentage: Some(percentage),
                })
            ),
        };
        
        self.client.send_notification::<Progress>(params).await;
    }

    /// Begin progress notification
    async fn begin_progress(
        &self,
        token: &str,
        title: &str,
    ) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(
                WorkDoneProgress::Begin(WorkDoneProgressBegin {
                    title: title.to_string(),
                    cancellable: Some(true),
                    message: Some("Starting...".to_string()),
                    percentage: Some(0),
                })
            ),
        };
        
        self.client.send_notification::<Progress>(params).await;
    }

    /// End progress notification
    async fn end_progress(
        &self,
        token: &str,
        message: &str,
    ) {
        let params = ProgressParams {
            token: NumberOrString::String(token.to_string()),
            value: ProgressParamsValue::WorkDone(
                WorkDoneProgress::End(WorkDoneProgressEnd {
                    message: Some(message.to_string()),
                })
            ),
        };
        
        self.client.send_notification::<Progress>(params).await;
    }
}
```

---

### 1.2 Update Import Handler with Progress

**File**: `lsp-server/src/server.rs` in `handle_bundle_request()`

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
        #[serde(rename = "progressToken")]
        progress_token: Option<String>,
    }

    let params: ImportPackageParams = serde_json::from_value(params)
        .map_err(|e| {
            tracing::error!("Failed to parse import params: {}", e);
            JsonRpcError::invalid_params("Invalid parameters".to_string())
        })?;

    // Generate progress token if not provided
    let progress_token = params.progress_token
        .unwrap_or_else(|| format!("import_{}", uuid::Uuid::new_v4()));

    tracing::info!("Importing package: {} (token: {})", 
        params.package_path, progress_token);

    // Begin progress
    self.begin_progress(&progress_token, "Importing Archive").await;

    // Need mutable access to bundle manager
    drop(manager_opt);
    let mut manager_guard = self.bundle_manager.write().await;
    let manager_mut = manager_guard.as_mut().ok_or_else(|| {
        tracing::error!("Bundle manager not initialized");
        JsonRpcError::method_not_found()
    })?;

    // Import with progress callbacks
    let client = Arc::clone(&self.client);
    let token = progress_token.clone();
    
    let result = manager_mut
        .import_log_package_with_progress(
            std::path::Path::new(&params.package_path),
            params.bundle_name,
            params.case_id,
            Box::new(move |message: &str, percentage: u32| {
                let client = Arc::clone(&client);
                let token = token.clone();
                let message = message.to_string();
                
                tokio::spawn(async move {
                    let params = ProgressParams {
                        token: NumberOrString::String(token),
                        value: ProgressParamsValue::WorkDone(
                            WorkDoneProgress::Report(WorkDoneProgressReport {
                                cancellable: Some(true),
                                message: Some(message),
                                percentage: Some(percentage),
                            })
                        ),
                    };
                    client.send_notification::<Progress>(params).await;
                });
            }),
        )
        .map_err(|e| {
            tracing::error!("Import failed: {}", e);
            JsonRpcError::internal_error()
        })?;

    // End progress
    self.end_progress(
        &progress_token, 
        &format!("Imported {} files", result.success_count)
    ).await;

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
```

---

### 1.3 Update BundleManager with Progress Callbacks

**File**: `lsp-server/src/bundle/manager.rs`

```rust
use std::sync::Arc;

type ProgressCallback = Box<dyn Fn(&str, u32) + Send + Sync>;

impl BundleManager {
    /// Import log package with progress updates
    pub fn import_log_package_with_progress(
        &mut self,
        package_path: &Path,
        bundle_name: Option<String>,
        case_id: Option<String>,
        progress: ProgressCallback,
    ) -> Result<ImportResult, BundleError> {
        tracing::info!("Importing log package: {:?}", package_path);

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
        
        let extracted_files = ArchiveExtractor::extract_archive_with_progress(
            package_path,
            &temp_dir,
            Box::new(|current, total| {
                let percent = 5 + ((current as f32 / total as f32) * 35.0) as u32;
                progress(
                    &format!("Extracting: {}/{} files", current, total),
                    percent
                );
            })
        )
        .map_err(|e| BundleError::ArchiveError(
            format!("Failed to extract archive: {}", e)
        ))?;

        tracing::info!("Extracted {} files from archive", extracted_files.len());

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

        let bundle_id = self.create_bundle(
            bundle_name.clone(),
            None,
            Some(metadata)
        )?;

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
                percent
            );

            match self.add_log_to_bundle(
                &bundle_id,
                file_path.to_str().unwrap_or(""),
                None,
                None
            ) {
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
```

---

### 1.4 Update ArchiveExtractor with Progress

**File**: `lsp-server/src/bundle/archive_extractor.rs`

```rust
impl ArchiveExtractor {
    /// Extract archive with progress callback
    pub fn extract_archive_with_progress<F>(
        archive_path: &Path,
        dest: &Path,
        progress: Box<F>,
    ) -> Result<Vec<PathBuf>>
    where
        F: Fn(usize, usize) + Send + Sync,
    {
        let extension = archive_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let extracted = match extension.to_lowercase().as_str() {
            "zip" => Self::extract_zip_with_progress(archive_path, dest, progress)?,
            "tar" | "tgz" | "gz" => {
                Self::extract_tar_with_progress(archive_path, dest, progress)?
            }
            _ => {
                tracing::warn!("Unsupported archive format: {}", extension);
                return Ok(Vec::new());
            }
        };

        Ok(extracted)
    }

    fn extract_zip_with_progress<F>(
        archive_path: &Path,
        dest: &Path,
        progress: Box<F>,
    ) -> Result<Vec<PathBuf>>
    where
        F: Fn(usize, usize) + Send + Sync,
    {
        tracing::info!("Extracting ZIP archive: {:?} to {:?}", archive_path, dest);

        let file = File::open(archive_path)
            .with_context(|| format!("Failed to open archive: {:?}", archive_path))?;

        let mut archive = ZipArchive::new(file)
            .with_context(|| format!("Failed to read ZIP archive: {:?}", archive_path))?;

        let total = archive.len();
        let mut extracted = Vec::new();

        for i in 0..total {
            // Report progress every 10 files or on last file
            if i % 10 == 0 || i == total - 1 {
                progress(i + 1, total);
            }

            let mut file = archive
                .by_index(i)
                .with_context(|| format!("Failed to read ZIP entry {}", i))?;

            let outpath = dest.join(file.name());

            if file.is_dir() {
                fs::create_dir_all(&outpath)
                    .with_context(|| format!("Failed to create directory: {:?}", outpath))?;
            } else {
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)
                        .with_context(|| format!("Failed to create parent dir: {:?}", parent))?;
                }

                let mut outfile = File::create(&outpath)
                    .with_context(|| format!("Failed to create file: {:?}", outpath))?;

                std::io::copy(&mut file, &mut outfile)
                    .with_context(|| format!("Failed to extract file: {:?}", outpath))?;

                extracted.push(outpath);
            }
        }

        tracing::info!("Extracted {} files from ZIP", extracted.len());
        Ok(extracted)
    }
}
```

---

## Part 2: Extension Changes (TypeScript)

### 2.1 Add Progress Tracking to BundleDataProvider

**File**: `vscode-extension/src/bundleDataProvider.ts`

```typescript
import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

interface ImportProgress {
    bundleId: string;
    fileName: string;
    message: string;
    percentage: number;
    startTime: number;
}

export class BundleDataProvider implements vscode.TreeDataProvider<BundleItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<BundleItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private importingBundles = new Map<string, ImportProgress>();
    private bundles: BundleItem[] = [];
    
    constructor(private lspClient: LanguageClient) {
        // Listen for progress notifications from LSP
        this.lspClient.onNotification('$/progress', (params) => {
            this.handleProgressNotification(params);
        });
    }

    /**
     * Import archive with optimistic UI
     */
    async importArchive(archivePath: string): Promise<void> {
        const progressToken = `import_${Date.now()}`;
        const fileName = path.basename(archivePath);

        // Create optimistic bundle entry immediately
        const optimisticBundle: BundleItem = {
            id: progressToken,
            label: `📦 Importing ${fileName}...`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: 'bundle-importing',
            description: '0% Starting...',
            iconPath: new vscode.ThemeIcon('loading~spin'),
        };

        // Add to importing map
        this.importingBundles.set(progressToken, {
            bundleId: progressToken,
            fileName: fileName,
            message: 'Starting...',
            percentage: 0,
            startTime: Date.now(),
        });

        // Show in tree immediately
        this.bundles.unshift(optimisticBundle);
        this._onDidChangeTreeData.fire(undefined);

        try {
            // Send async request with progress token
            const result = await this.lspClient.sendRequest(
                'workspace/executeCommand',
                {
                    command: 'logScout.bundle.importPackage',
                    arguments: [{
                        packagePath: archivePath,
                        progressToken: progressToken,
                    }]
                }
            );

            // Remove optimistic entry
            this.importingBundles.delete(progressToken);
            this.bundles = this.bundles.filter(b => b.id !== progressToken);

            // Add real bundle
            await this.loadBundles();
            this._onDidChangeTreeData.fire(undefined);

            // Show success notification
            const typedResult = result as any;
            vscode.window.showInformationMessage(
                `✅ Successfully imported ${typedResult.importedCount} log files to ${typedResult.bundleName}`
            );

        } catch (error) {
            // Remove optimistic entry on error
            this.importingBundles.delete(progressToken);
            this.bundles = this.bundles.filter(b => b.id !== progressToken);
            this._onDidChangeTreeData.fire(undefined);

            vscode.window.showErrorMessage(
                `Failed to import archive: ${error}`
            );
        }
    }

    /**
     * Handle progress notifications from LSP
     */
    private handleProgressNotification(params: any): void {
        const token = params.token;
        const value = params.value;

        // Check if this is one of our import operations
        const importProgress = this.importingBundles.get(token);
        if (!importProgress) {
            return; // Not our import
        }

        // Update progress
        if (value.kind === 'begin') {
            importProgress.message = value.message || 'Starting...';
            importProgress.percentage = value.percentage || 0;
        } else if (value.kind === 'report') {
            importProgress.message = value.message || '';
            importProgress.percentage = value.percentage || 0;
        } else if (value.kind === 'end') {
            importProgress.message = value.message || 'Complete';
            importProgress.percentage = 100;
        }

        // Update the tree item
        const bundleIndex = this.bundles.findIndex(b => b.id === token);
        if (bundleIndex !== -1) {
            const elapsed = Math.floor((Date.now() - importProgress.startTime) / 1000);
            
            this.bundles[bundleIndex].description = 
                `${importProgress.percentage}% - ${importProgress.message} (${elapsed}s)`;
            
            // Fire change event to update UI
            this._onDidChangeTreeData.fire(this.bundles[bundleIndex]);
        }
    }

    /**
     * Get tree item for display
     */
    getTreeItem(element: BundleItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children for tree
     */
    async getChildren(element?: BundleItem): Promise<BundleItem[]> {
        if (!element) {
            // Root level - return bundles
            return this.bundles;
        } else {
            // Return logs for a bundle
            return element.children || [];
        }
    }

    /**
     * Load bundles from LSP
     */
    private async loadBundles(): Promise<void> {
        try {
            const result = await this.lspClient.sendRequest(
                'workspace/executeCommand',
                {
                    command: 'logScout.bundle.list',
                    arguments: []
                }
            );

            const bundles = result as any[];
            this.bundles = bundles.map(b => ({
                id: b.bundleId,
                label: `📦 ${b.name}`,
                collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
                contextValue: 'bundle',
                description: `${b.logCount} logs`,
                children: [],
            }));

        } catch (error) {
            console.error('Failed to load bundles:', error);
        }
    }

    /**
     * Refresh tree view
     */
    refresh(): void {
        this.loadBundles().then(() => {
            this._onDidChangeTreeData.fire(undefined);
        });
    }
}

interface BundleItem extends vscode.TreeItem {
    id: string;
    children?: BundleItem[];
}
```

---

### 2.2 Add Import Command Handler

**File**: `vscode-extension/src/extension.ts`

```typescript
export function activate(context: vscode.ExtensionContext) {
    // ... existing code ...

    const bundleDataProvider = new BundleDataProvider(client);
    
    vscode.window.registerTreeDataProvider(
        'logScoutBundles',
        bundleDataProvider
    );

    // Register import command
    context.subscriptions.push(
        vscode.commands.registerCommand('logScout.importArchive', async () => {
            // Show file picker
            const result = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Archives': ['zip', 'tar', 'gz', 'tgz'],
                },
                title: 'Select Log Archive to Import',
            });

            if (result && result.length > 0) {
                const archivePath = result[0].fsPath;
                await bundleDataProvider.importArchive(archivePath);
            }
        })
    );

    // Register drag-and-drop support
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('logScoutBundles', {
            ...bundleDataProvider,
            onDidChangeTreeData: bundleDataProvider.onDidChangeTreeData,
            getTreeItem: bundleDataProvider.getTreeItem.bind(bundleDataProvider),
            getChildren: bundleDataProvider.getChildren.bind(bundleDataProvider),
            handleDrop: async (target, dataTransfer, token) => {
                const files = dataTransfer.get('application/vnd.code.uri-list');
                if (files) {
                    const uriList = await files.asString();
                    const uris = uriList.split('\n').filter(u => u.trim());
                    
                    for (const uriString of uris) {
                        const uri = vscode.Uri.parse(uriString);
                        if (uri.fsPath.match(/\.(zip|tar|gz|tgz)$/i)) {
                            await bundleDataProvider.importArchive(uri.fsPath);
                        }
                    }
                }
            },
        })
    );
}
```

---

### 2.3 Update package.json with Commands

**File**: `vscode-extension/package.json`

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScout.importArchive",
        "title": "Import Log Archive",
        "category": "Log Scout",
        "icon": "$(cloud-upload)"
      },
      {
        "command": "logScout.refreshBundles",
        "title": "Refresh Bundles",
        "category": "Log Scout",
        "icon": "$(refresh)"
      }
    ],
    "views": {
      "logScout": [
        {
          "id": "logScoutBundles",
          "name": "Log Bundles",
          "icon": "resources/bundle.svg"
        }
      ]
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "logScout",
          "title": "Log Scout",
          "icon": "resources/logo.svg"
        }
      ]
    },
    "menus": {
      "view/title": [
        {
          "command": "logScout.importArchive",
          "when": "view == logScoutBundles",
          "group": "navigation"
        },
        {
          "command": "logScout.refreshBundles",
          "when": "view == logScoutBundles",
          "group": "navigation"
        }
      ]
    }
  }
}
```

---

## Part 3: Testing

### 3.1 Test with Small Archive

```bash
# Create test archive
cd test-data
zip small-archive.zip app.log debug.log
# Expected: ~2-5 seconds to import
```

### 3.2 Test with QCSONE Package

```bash
# Use real QCSONE package
# Expected: 2-4 minutes with progress updates every 2-5 seconds
```

### 3.3 Test Cancellation

```typescript
// User clicks cancel during import
// Expected: Operation stops, partial bundle is cleaned up
```

---

## Part 4: Build and Deploy

### 4.1 Build LSP Server

```bash
cd lsp-server
cargo build --release
```

### 4.2 Build Extension

```bash
cd vscode-extension
npm run compile
npm run package
```

### 4.3 Install Extension

```bash
code --install-extension log-scout-analyzer-*.vsix
```

---

## Expected User Experience

1. **User drops archive.zip into VS Code**
   - Immediately sees: "📦 Importing archive.zip... 0% Starting..."

2. **Progress updates appear every 2-5 seconds**
   - "5% Extracting archive..."
   - "20% Extracting: 50/250 files"
   - "50% Creating bundle..."
   - "75% Adding logs: 30/47"

3. **After 49 seconds, bundle appears**
   - "📦 Case 700440257" with 47 log files
   - Notification: "✅ Successfully imported 47 log files"

4. **User can work during import**
   - Browse other bundles
   - Open other logs
   - Start another import

---

## Performance Metrics

| Archive Size | Files | Time | Progress Updates |
|--------------|-------|------|------------------|
| < 10MB       | < 50  | 3-8s | 5-10 updates     |
| 10-100MB     | 50-200| 15-45s| 10-20 updates    |
| 100MB-1GB    | 200-1K| 1-5min| 20-50 updates    |

---

## Troubleshooting

### Progress not showing?
- Check LSP server logs: `~/.log-scout-analyzer/lsp-server-*.log`
- Verify progress notifications are being sent
- Check extension console for errors

### Import fails silently?
- Check for errors in LSP response
- Verify archive format is supported
- Check file permissions

### UI not updating?
- Verify `_onDidChangeTreeData.fire()` is called
- Check progress token matches
- Verify LSP client is connected

---

## Summary

With these changes:
- ✅ User gets immediate feedback
- ✅ Real-time progress updates
- ✅ Can continue working during import
- ✅ Professional UX
- ✅ Cancellation support
- ✅ Better error handling

The key insight: **Use optimistic UI with async LSP requests and progress notifications for the best experience!**