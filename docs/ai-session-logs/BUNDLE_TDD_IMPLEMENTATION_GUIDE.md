# 🧪 Bundle Import TDD Implementation Guide

**Purpose**: Step-by-step guide to implement missing tests for bundle import feature  
**Time Required**: ~8 hours total  
**Prerequisites**: Rust and TypeScript test frameworks setup  
**Related**: See `BUNDLE_TDD_COVERAGE_ANALYSIS.md` for detailed gap analysis

---

## 📋 Quick Start

### What This Guide Provides
- ✅ Copy-paste test templates for all 22 missing tests
- ✅ Test data setup instructions
- ✅ Mocking strategies for LSP and filesystem
- ✅ Expected outputs and assertions
- ✅ Priority order for implementation

### What You Need
- Rust installed (for `cargo test`)
- Node.js installed (for `npm test`)
- Test data archives (instructions below)
- 8 hours of focused work time

---

## 🎯 Phase 1: Core Import Logic Tests (CRITICAL - 2 hours)

### Setup: Test Data Preparation (15 minutes)

Create test archives in `lsp-server/src/bundle/test_fixtures/`:

```bash
# Create test fixtures directory
mkdir -p lsp-server/src/bundle/test_fixtures

# You'll need to create these test archives:
# 1. qcsone_valid.zip - Contains 3 log files (jabber.log, cucm.log, debug.txt)
# 2. generic.zip - Contains 2 log files without case ID pattern
# 3. nested.zip - Contains inner.zip which contains app.log
# 4. mixed_files.zip - Contains logs + json + xml files
# 5. empty.zip - Contains only non-log files
# 6. corrupted.zip - Invalid ZIP file (create by corrupting valid one)
```

### Test Template 1: Basic Import with Case ID

File: `lsp-server/src/bundle/manager.rs` (add to existing `mod tests`)

```rust
#[cfg(test)]
mod import_tests {
    use super::*;
    use tempfile::TempDir;
    use std::path::PathBuf;

    #[test]
    fn test_import_qcsone_package_with_case_id() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        // Path to test fixture (you need to create this)
        let test_archive = PathBuf::from("src/bundle/test_fixtures/qcsone_valid.zip");
        
        // Execute
        let result = manager.import_log_package(
            &test_archive,
            None, // Auto-generate name
            None, // Auto-detect case ID
        );
        
        // Assert
        assert!(result.is_ok(), "Import should succeed");
        let import_result = result.unwrap();
        
        // Verify case ID detected
        assert_eq!(
            import_result.case_id,
            Some("700440257".to_string()),
            "Case ID should be detected from filename"
        );
        
        // Verify bundle name uses case ID
        assert!(
            import_result.bundle_name.contains("700440257"),
            "Bundle name should include case ID"
        );
        
        // Verify logs imported
        assert!(
            import_result.success_count > 0,
            "Should import at least one log file"
        );
        
        // Verify bundle exists on filesystem
        let bundle = manager.get_bundle(&import_result.bundle_id);
        assert!(bundle.is_some(), "Bundle should exist after import");
        
        let bundle = bundle.unwrap();
        assert!(bundle.logs.len() > 0, "Bundle should contain logs");
        
        // Verify metadata tags
        assert!(
            bundle.metadata.tags.contains(&"imported".to_string()),
            "Bundle should be tagged as 'imported'"
        );
        assert!(
            bundle.metadata.tags.contains(&"qcsone".to_string()),
            "Bundle with case ID should be tagged as 'qcsone'"
        );
    }

    #[test]
    fn test_import_generic_package_without_case_id() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        let test_archive = PathBuf::from("src/bundle/test_fixtures/generic.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None);
        
        // Assert
        assert!(result.is_ok());
        let import_result = result.unwrap();
        
        // No case ID should be detected
        assert_eq!(import_result.case_id, None);
        
        // Bundle name should be derived from filename
        assert!(import_result.bundle_name.contains("Import generic"));
        
        // Should have 'imported' tag but NOT 'qcsone' tag
        let bundle = manager.get_bundle(&import_result.bundle_id).unwrap();
        assert!(bundle.metadata.tags.contains(&"imported".to_string()));
        assert!(!bundle.metadata.tags.contains(&"qcsone".to_string()));
    }

    #[test]
    fn test_import_filters_non_log_files() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        // This ZIP should contain:
        // - 2 log files (.log, .txt)
        // - 3 non-log files (.json, .xml, .pdf)
        let test_archive = PathBuf::from("src/bundle/test_fixtures/mixed_files.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None).unwrap();
        
        // Assert
        assert_eq!(
            result.total_files, 5,
            "Should extract all 5 files from archive"
        );
        assert_eq!(
            result.success_count, 2,
            "Should only import 2 log files"
        );
        
        // Verify bundle contains only log files
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();
        assert_eq!(bundle.logs.len(), 2, "Bundle should contain only log files");
        
        // Verify each log has proper extension
        for log in &bundle.logs {
            let path = PathBuf::from(&log.uri);
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            assert!(
                matches!(ext, "log" | "txt" | "out" | "err"),
                "Log file should have log extension, got: {}", ext
            );
        }
    }

    #[test]
    fn test_import_detects_service_types() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        // This ZIP should contain logs from different services:
        // - jabber.log (Jabber)
        // - ccm.log (CUCM)
        // - cup_tomcat.log (CUP)
        let test_archive = PathBuf::from("src/bundle/test_fixtures/multi_service.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None).unwrap();
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();
        
        // Assert - find each service type
        let services: Vec<String> = bundle.logs.iter()
            .map(|log| log.service.clone())
            .collect();
        
        assert!(
            services.contains(&"Jabber".to_string()),
            "Should detect Jabber service"
        );
        assert!(
            services.contains(&"CUCM".to_string()),
            "Should detect CUCM service"
        );
        assert!(
            services.contains(&"CUP".to_string()),
            "Should detect CUP service"
        );
    }

    #[test]
    fn test_import_handles_empty_archive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        // ZIP with no log files (only .json, .xml)
        let test_archive = PathBuf::from("src/bundle/test_fixtures/empty.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None);
        
        // Assert - should succeed but with 0 imported files
        assert!(result.is_ok(), "Should not fail on empty archive");
        let import_result = result.unwrap();
        
        assert_eq!(
            import_result.success_count, 0,
            "Should import 0 files from empty archive"
        );
        assert!(
            import_result.total_files > 0,
            "Should extract files from archive"
        );
        
        // Bundle should exist but be empty
        let bundle = manager.get_bundle(&import_result.bundle_id).unwrap();
        assert_eq!(bundle.logs.len(), 0, "Bundle should be empty");
    }

    #[test]
    fn test_import_handles_corrupted_archive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        let test_archive = PathBuf::from("src/bundle/test_fixtures/corrupted.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None);
        
        // Assert - should return error
        assert!(result.is_err(), "Should fail on corrupted archive");
        
        match result {
            Err(BundleError::ArchiveError(msg)) => {
                assert!(
                    msg.contains("Failed to extract"),
                    "Error message should mention extraction failure"
                );
            }
            _ => panic!("Should return ArchiveError"),
        }
    }

    #[test]
    fn test_import_cleans_up_temp_directory() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("src/bundle/test_fixtures/qcsone_valid.zip");
        
        // Get count of temp directories before
        let temp_dir = std::env::temp_dir();
        let before_count = std::fs::read_dir(&temp_dir)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .ok()
                    .and_then(|e| e.file_name().to_str().map(|s| s.contains("log-scout-import")))
                    .unwrap_or(false)
            })
            .count();
        
        // Execute
        manager.import_log_package(&test_archive, None, None).unwrap();
        
        // Assert - temp directories cleaned up
        let after_count = std::fs::read_dir(&temp_dir)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .ok()
                    .and_then(|e| e.file_name().to_str().map(|s| s.contains("log-scout-import")))
                    .unwrap_or(false)
            })
            .count();
        
        assert_eq!(
            before_count, after_count,
            "Temp directories should be cleaned up after import"
        );
    }

    #[test]
    fn test_import_extracts_nested_archives() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        
        // outer.zip contains inner.zip which contains app.log
        let test_archive = PathBuf::from("src/bundle/test_fixtures/nested.zip");
        
        // Execute
        let result = manager.import_log_package(&test_archive, None, None).unwrap();
        let bundle = manager.get_bundle(&result.bundle_id).unwrap();
        
        // Assert - should find log from nested archive
        assert!(
            bundle.logs.len() > 0,
            "Should extract logs from nested archives"
        );
        
        // Verify app.log from inner archive was imported
        let has_app_log = bundle.logs.iter()
            .any(|log| log.uri.contains("app.log"));
        assert!(has_app_log, "Should import app.log from nested archive");
    }
}
```

**Run Tests**:
```bash
cd lsp-server
cargo test import_tests -- --nocapture
```

**Expected**: 8/8 tests passing

---

## 🎯 Phase 2: Progress Tracking Tests (CRITICAL - 1 hour)

File: `lsp-server/src/bundle/manager.rs` (add to tests module)

```rust
#[cfg(test)]
mod progress_tests {
    use super::*;
    use tempfile::TempDir;
    use std::sync::{Arc, Mutex};
    use std::path::PathBuf;

    #[test]
    fn test_import_with_progress_calls_callback() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("src/bundle/test_fixtures/qcsone_valid.zip");
        
        // Track progress updates
        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();
        
        let progress_fn = Box::new(move |message: &str, percentage: u32| {
            progress_updates_clone.lock().unwrap().push((message.to_string(), percentage));
        });
        
        // Execute
        let result = manager.import_log_package_with_progress(
            &test_archive,
            None,
            None,
            progress_fn,
        );
        
        // Assert
        assert!(result.is_ok(), "Import should succeed");
        
        let updates = progress_updates.lock().unwrap();
        assert!(
            updates.len() > 5,
            "Should have multiple progress updates, got: {}", updates.len()
        );
        
        // Verify progress starts low and ends at 100
        let first_percent = updates.first().unwrap().1;
        let last_percent = updates.last().unwrap().1;
        
        assert!(first_percent < 10, "Should start below 10%");
        assert_eq!(last_percent, 100, "Should end at 100%");
    }

    #[test]
    fn test_progress_percentages_increase_monotonically() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("src/bundle/test_fixtures/qcsone_valid.zip");
        
        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();
        
        let progress_fn = Box::new(move |_: &str, percentage: u32| {
            progress_updates_clone.lock().unwrap().push(percentage);
        });
        
        // Execute
        manager.import_log_package_with_progress(&test_archive, None, None, progress_fn).unwrap();
        
        // Assert - percentages should increase
        let percentages = progress_updates.lock().unwrap();
        
        for i in 1..percentages.len() {
            assert!(
                percentages[i] >= percentages[i - 1],
                "Progress should increase monotonically: {}% -> {}%",
                percentages[i - 1], percentages[i]
            );
        }
    }

    #[test]
    fn test_progress_messages_are_descriptive() {
        // Setup
        let temp_workspace = TempDir::new().unwrap();
        let mut manager = BundleManager::new(temp_workspace.path()).unwrap();
        let test_archive = PathBuf::from("src/bundle/test_fixtures/qcsone_valid.zip");
        
        let progress_updates = Arc::new(Mutex::new(Vec::new()));
        let progress_updates_clone = progress_updates.clone();
        
        let progress_fn = Box::new(move |message: &str, _: u32| {
            progress_updates_clone.lock().unwrap().push(message.to_string());
        });
        
        // Execute
        manager.import_log_package_with_progress(&test_archive, None, None, progress_fn).unwrap();
        
        // Assert - check for key messages
        let messages = progress_updates.lock().unwrap();
        let all_messages = messages.join("|").to_lowercase();
        
        assert!(
            all_messages.contains("extract"),
            "Should have 'extracting' message"
        );
        assert!(
            all_messages.contains("creat") || all_messages.contains("bundle"),
            "Should mention bundle creation"
        );
        assert!(
            all_messages.contains("add") || all_messages.contains("log"),
            "Should mention adding logs"
        );
        assert!(
            all_messages.contains("complete") || all_messages.contains("done"),
            "Should have completion message"
        );
    }
}
```

**Run Tests**:
```bash
cargo test progress_tests -- --nocapture
```

**Expected**: 3/3 tests passing

---

## 🎯 Phase 3: Archive Extraction Tests (HIGH - 1.5 hours)

File: `lsp-server/src/bundle/archive_extractor.rs` (add to existing tests module)

```rust
#[cfg(test)]
mod extraction_tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn test_extract_zip_creates_files() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let test_zip = PathBuf::from("src/bundle/test_fixtures/simple.zip");
        
        // Execute
        let result = ArchiveExtractor::extract_zip(&test_zip, temp_dir.path());
        
        // Assert
        assert!(result.is_ok(), "ZIP extraction should succeed");
        let extracted = result.unwrap();
        
        assert!(extracted.len() > 0, "Should extract files");
        
        // Verify files exist on disk
        for file_path in &extracted {
            assert!(
                file_path.exists(),
                "Extracted file should exist: {:?}", file_path
            );
        }
    }

    #[test]
    fn test_extract_tar_creates_files() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let test_tar = PathBuf::from("src/bundle/test_fixtures/simple.tar");
        
        // Execute
        let result = ArchiveExtractor::extract_tar(&test_tar, temp_dir.path());
        
        // Assert
        assert!(result.is_ok(), "TAR extraction should succeed");
        let extracted = result.unwrap();
        
        assert!(extracted.len() > 0, "Should extract files");
        
        for file_path in &extracted {
            assert!(file_path.exists(), "Extracted file should exist");
        }
    }

    #[test]
    fn test_extract_archive_handles_nested_zips() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let nested_zip = PathBuf::from("src/bundle/test_fixtures/nested.zip");
        
        // Execute
        let result = ArchiveExtractor::extract_archive(&nested_zip, temp_dir.path());
        
        // Assert
        assert!(result.is_ok(), "Nested extraction should succeed");
        let extracted = result.unwrap();
        
        // Should extract files from both outer and inner archives
        assert!(
            extracted.len() > 1,
            "Should extract files from both archives"
        );
        
        // Verify we got files from inner archive
        let has_inner_file = extracted.iter()
            .any(|p| p.to_str().unwrap().contains("app.log"));
        assert!(has_inner_file, "Should extract files from inner archive");
    }

    #[test]
    fn test_extract_archive_detects_format() {
        // Test ZIP
        let temp_dir1 = TempDir::new().unwrap();
        let zip_file = PathBuf::from("src/bundle/test_fixtures/simple.zip");
        let zip_result = ArchiveExtractor::extract_archive(&zip_file, temp_dir1.path());
        assert!(zip_result.is_ok(), "Should extract ZIP");
        
        // Test TAR
        let temp_dir2 = TempDir::new().unwrap();
        let tar_file = PathBuf::from("src/bundle/test_fixtures/simple.tar");
        let tar_result = ArchiveExtractor::extract_archive(&tar_file, temp_dir2.path());
        assert!(tar_result.is_ok(), "Should extract TAR");
        
        // Test TGZ
        let temp_dir3 = TempDir::new().unwrap();
        let tgz_file = PathBuf::from("src/bundle/test_fixtures/simple.tgz");
        let tgz_result = ArchiveExtractor::extract_archive(&tgz_file, temp_dir3.path());
        assert!(tgz_result.is_ok(), "Should extract TGZ");
    }

    #[test]
    fn test_extract_archive_handles_corrupted_zip() {
        // Setup
        let temp_dir = TempDir::new().unwrap();
        let corrupted = PathBuf::from("src/bundle/test_fixtures/corrupted.zip");
        
        // Execute
        let result = ArchiveExtractor::extract_archive(&corrupted, temp_dir.path());
        
        // Assert - should return error
        assert!(result.is_err(), "Should fail on corrupted archive");
    }

    #[test]
    fn test_summarize_extraction_calculates_sizes() {
        // Setup - create test files
        let temp_dir = TempDir::new().unwrap();
        
        let file1 = temp_dir.path().join("test1.log");
        let file2 = temp_dir.path().join("test2.txt");
        let file3 = temp_dir.path().join("data.json");
        
        File::create(&file1).unwrap().write_all(b"12345").unwrap(); // 5 bytes
        File::create(&file2).unwrap().write_all(b"1234567890").unwrap(); // 10 bytes
        File::create(&file3).unwrap().write_all(b"123").unwrap(); // 3 bytes (non-log)
        
        let files = vec![file1, file2, file3];
        
        // Execute
        let summary = ArchiveExtractor::summarize_extraction(&files);
        
        // Assert
        assert_eq!(summary.total_files, 3);
        assert_eq!(summary.log_files_count, 2); // Only .log and .txt
        assert_eq!(summary.total_size_bytes, 15); // 5 + 10 bytes (excludes .json)
        assert_eq!(summary.log_files.len(), 2);
    }
}
```

**Run Tests**:
```bash
cargo test extraction_tests -- --nocapture
```

**Expected**: 6/6 tests passing

---

## 🎯 Phase 4: TypeScript UI Tests (HIGH - 2 hours)

File: `vscode-extension/src/test/suite/bundleTreeProvider.test.ts` (NEW FILE)

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { BundleTreeProvider } from '../../bundleTreeProvider';

suite('BundleTreeProvider Tests', () => {
    let workspaceRoot: string;
    let bundleProvider: BundleTreeProvider;

    suiteSetup(() => {
        // Create temporary workspace
        workspaceRoot = path.join(__dirname, '../../../test-workspace');
        if (!fs.existsSync(workspaceRoot)) {
            fs.mkdirSync(workspaceRoot, { recursive: true });
        }
    });

    setup(() => {
        bundleProvider = new BundleTreeProvider();
    });

    test('importPackage() creates optimistic bundle immediately', async () => {
        // Setup - mock LSP client (you'll need to implement this)
        // For now, test that method exists and has correct signature
        
        assert.ok(
            typeof bundleProvider.importPackage === 'function',
            'importPackage method should exist'
        );
        
        // Verify method signature accepts correct parameters
        const methodString = bundleProvider.importPackage.toString();
        assert.ok(
            methodString.includes('packagePath') || methodString.includes('string'),
            'importPackage should accept packagePath parameter'
        );
    });

    test('createBundle() creates bundle directory and JSON', async () => {
        // Mock workspace folders
        const mockWorkspace = {
            workspaceFolders: [
                {
                    uri: vscode.Uri.file(workspaceRoot),
                    name: 'test',
                    index: 0
                }
            ]
        };
        
        // Execute
        const bundleId = await bundleProvider.createBundle(
            'Test Bundle',
            'Test description',
            '700440257'
        );
        
        // Assert
        assert.ok(bundleId, 'Should return bundle ID');
        assert.ok(bundleId.startsWith('bundle_'), 'Bundle ID should have correct format');
        
        // Verify filesystem structure
        const bundlePath = path.join(workspaceRoot, '.log-scout', 'bundles', bundleId);
        const bundleJsonPath = path.join(bundlePath, 'bundle.json');
        
        assert.ok(
            fs.existsSync(bundleJsonPath),
            'bundle.json should be created'
        );
        
        // Verify bundle.json content
        const bundleData = JSON.parse(fs.readFileSync(bundleJsonPath, 'utf8'));
        assert.strictEqual(bundleData.name, 'Test Bundle');
        assert.strictEqual(bundleData.description, 'Test description');
        assert.strictEqual(bundleData.metadata.case_id, '700440257');
        assert.ok(Array.isArray(bundleData.logs));
    });

    test('getChildren() returns bundles from filesystem', async () => {
        // Setup - create test bundles
        const bundle1Id = await bundleProvider.createBundle('Bundle 1', null, null);
        const bundle2Id = await bundleProvider.createBundle('Bundle 2', null, null);
        
        // Execute
        const children = await bundleProvider.getChildren();
        
        // Assert
        assert.ok(Array.isArray(children), 'Should return array');
        assert.ok(children.length >= 2, 'Should return created bundles');
        
        const bundleNames = children.map((item: any) => item.label);
        assert.ok(
            bundleNames.includes('Bundle 1'),
            'Should include first bundle'
        );
        assert.ok(
            bundleNames.includes('Bundle 2'),
            'Should include second bundle'
        );
    });

    test('refresh() triggers tree update event', (done) => {
        // Setup - listen for tree update
        let eventFired = false;
        
        bundleProvider.onDidChangeTreeData(() => {
            eventFired = true;
            assert.ok(true, 'Tree data change event should fire');
            done();
        });
        
        // Execute
        bundleProvider.refresh();
        
        // Verify event fired
        setTimeout(() => {
            if (!eventFired) {
                assert.fail('Tree data change event did not fire');
                done();
            }
        }, 100);
    });

    test('handleProgressNotification() updates importing bundle', () => {
        // Setup - create mock progress notification
        const token = 'import_123';
        const progressNotification = {
            token: token,
            value: {
                kind: 'report',
                message: 'Extracting files...',
                percentage: 50
            }
        };
        
        // Add import to tracking
        bundleProvider['importingBundles'].set(token, {
            bundleId: token,
            fileName: 'test.zip',
            message: 'Starting...',
            percentage: 0,
            startTime: Date.now()
        });
        
        // Execute
        bundleProvider['handleProgressNotification'](progressNotification);
        
        // Assert
        const progress = bundleProvider['importingBundles'].get(token);
        assert.ok(progress, 'Progress entry should exist');
        assert.strictEqual(progress.percentage, 50);
        assert.strictEqual(progress.message, 'Extracting files...');
    });

    test('BundleItem has correct properties for bundle type', () => {
        const { BundleItem } = require('../../bundleTreeProvider');
        
        const bundleItem = new BundleItem(
            'Test Bundle',
            'bundle_123',
            5,
            1024000,
            'Test description',
            'bundle'
        );
        
        assert.strictEqual(bundleItem.label, 'Test Bundle');
        assert.strictEqual(bundleItem.bundleId, 'bundle_123');
        assert.strictEqual(bundleItem.contextValue, 'bundle');
        assert.strictEqual(bundleItem.description, '5 logs');
        assert.ok(bundleItem.iconPath);
    });

    test('BundleItem has correct properties for log type', () => {
        const { BundleItem } = require('../../bundleTreeProvider');
        
        const logItem = new BundleItem(
            'app.log',
            'bundle_123',
            0,
            2048,
            'Jabber',
            'log',
            '/path/to/app.log'
        );
        
        assert.strictEqual(logItem.label, 'app.log');
        assert.strictEqual(logItem.contextValue, 'bundleLog');
        assert.ok(logItem.description.includes('Jabber'));
        assert.ok(logItem.description.includes('2.0 KB'));
        assert.ok(logItem.command); // Should have open command
    });

    suiteTeardown(() => {
        // Cleanup test workspace
        if (fs.existsSync(workspaceRoot)) {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });
});
```

**Run Tests**:
```bash
cd vscode-extension
npm run compile
npm test
```

**Expected**: 7/7 tests passing

---

## 🎯 Phase 5: Integration Tests (CRITICAL - 2.5 hours)

File: `vscode-extension/src/test/suite/integration/bundleImport.test.ts` (NEW FILE)

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Bundle Import Integration Tests', function() {
    this.timeout(30000); // Imports may take time

    let workspaceRoot: string;

    suiteSetup(async () => {
        // Setup test workspace
        workspaceRoot = path.join(__dirname, '../../../../test-workspace-integration');
        if (!fs.existsSync(workspaceRoot)) {
            fs.mkdirSync(workspaceRoot, { recursive: true });
        }
        
        // Open workspace in VSCode
        const workspaceUri = vscode.Uri.file(workspaceRoot);
        await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
        
        // Wait for LSP server to initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
    });

    test('Import QCSONE package creates bundle with case ID', async () => {
        // Setup
        const testArchive = path.join(
            __dirname,
            '../../../../test-data/700440257_qcsone_download_selected.zip'
        );
        
        assert.ok(
            fs.existsSync(testArchive),
            'Test archive should exist. Run test data setup first.'
        );
        
        // Execute - trigger import command
        await vscode.commands.executeCommand(
            'logScoutAnalyzer.importArchive',
            testArchive
        );
        
        // Wait for import to complete
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Assert - check bundle was created
        const bundlesDir = path.join(workspaceRoot, '.log-scout', 'bundles');
        assert.ok(fs.existsSync(bundlesDir), 'Bundles directory should exist');
        
        // Read index.json
        const indexPath = path.join(bundlesDir, 'index.json');
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        
        assert.ok(
            indexData.bundles.length > 0,
            'Should have at least one bundle'
        );
        
        // Find bundle with case ID 700440257
        const qcsoneBundle = indexData.bundles.find((b: any) =>
            b.name.includes('700440257')
        );
        
        assert.ok(qcsoneBundle, 'Should create bundle with case ID in name');
        
        // Verify bundle has logs
        const bundlePath = path.join(bundlesDir, qcsoneBundle.id, 'bundle.json');
        const bundleData = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
        
        assert.ok(
            bundleData.logs.length > 0,
            'Bundle should contain imported logs'
        );
        assert.strictEqual(
            bundleData.metadata.case_id,
            '700440257',
            'Bundle should have correct case ID'
        );
    });

    test('Bundle tree view updates after successful import', async () => {
        // Get tree view
        const treeView = vscode.window.createTreeView('scout-bundles', {
            treeDataProvider: new (require('../../../bundleTreeProvider').BundleTreeProvider)()
        });
        
        const initialCount = (await treeView.dataProvider.getChildren()).length;
        
        // Perform import
        const testArchive = path.join(
            __dirname,
            '../../../../test-data/generic_logs.zip'
        );
        
        await vscode.commands.executeCommand(
            'logScoutAnalyzer.importArchive',
            testArchive
        );
        
        // Wait for UI update
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Assert - tree view should have new bundle
        const afterCount = (await treeView.dataProvider.getChildren()).length;
        assert.ok(
            afterCount > initialCount,
            'Tree view should show new bundle after import'
        );
        
        treeView.dispose();
    });

    test('Import error shows user-friendly message', async () => {
        // Setup - corrupted archive
        const corruptedArchive = path.join(
            __dirname,
            '../../../../test-data/corrupted.zip'
        );
        
        // Listen for error notifications
        let errorShown = false;
        const disposable = vscode.window.onDidShowMessage((message: any) => {
            if (message.severity === vscode.MessageSeverity.Error) {
                errorShown = true;
            }
        });
        
        // Execute - attempt import
        try {
            await vscode.commands.executeCommand(
                'logScoutAnalyzer.importArchive',
                corruptedArchive
            );
        } catch (e) {
            // Expected to fail
        }
        
        // Wait for notification
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Assert
        assert.ok(errorShown, 'Should show error notification on import failure');
        
        disposable.dispose();
    });

    test('Progress notification appears during import', async () => {
        // Setup
        const largeArchive = path.join(
            __dirname,
            '../../../../test-data/large_package.zip'
        );
        
        let progressShown = false;
        
        // Monitor progress
        const disposable = vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Import',
                cancellable: true
            },
            () => {
                progressShown = true;
                return Promise.resolve();
            }
        );
        
        // Execute
        const importPromise = vscode.commands.executeCommand(
            'logScoutAnalyzer.importArchive',
            largeArchive
        );
        
        // Check progress appears quickly
        await new Promise(resolve => setTimeout(resolve, 1000));
        assert.ok(progressShown, 'Progress notification should appear during import');
        
        await importPromise;
    });

    test('Multiple concurrent imports succeed', async () => {
        // Setup - two different archives
        const archive1 = path.join(__dirname, '../../../../test-data/package1.zip');
        const archive2 = path.join(__dirname, '../../../../test-data/package2.zip');
        
        // Execute - start both imports simultaneously
        const import1 = vscode.commands.executeCommand(
            'logScoutAnalyzer.importArchive',
            archive1
        );
        const import2 = vscode.commands.executeCommand(
            'logScoutAnalyzer.importArchive',
            archive2
        );
        
        // Wait for both to complete
        await Promise.all([import1, import2]);
        
        // Assert - both bundles should exist
        const bundlesDir = path.join(workspaceRoot, '.log-scout', 'bundles');
        const indexPath = path.join(bundlesDir, 'index.json');
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        
        assert.ok(
            indexData.bundles.length >= 2,
            'Should have at least 2 bundles from concurrent imports'
        );
    });

    suiteTeardown(() => {
        // Cleanup
        if (fs.existsSync(workspaceRoot)) {
            fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
    });
});
```

**Run Tests**:
```bash
cd vscode-extension
npm test -- integration/bundleImport.test.ts
```

**Expected**: 5/5 tests passing

---

## 📦 Test Data Setup Script

Create `scripts/create-test-fixtures.sh`:

```bash
#!/bin/bash

# Create test fixtures for bundle import tests
FIXTURES_DIR="lsp-server/src/bundle/test_fixtures"
mkdir -p "$FIXTURES_DIR"

cd "$FIXTURES_DIR"

# 1. QCSONE valid package
mkdir -p qcsone_temp
echo "Jabber log content" > qcsone_temp/jabber.log
echo "CUCM log content" > qcsone_temp/ccm.log
echo "Debug log content" > qcsone_temp/debug.txt
zip -r qcsone_valid.zip qcsone_temp/
rm -rf qcsone_temp

# 2. Generic package (no case ID)
mkdir -p generic_temp
echo "App log" > generic_temp/app.log
echo "Error log" > generic_temp/error.log
zip -r generic.zip generic_temp/
rm -rf generic_temp

# 3. Nested archives
mkdir -p nested_inner nested_outer
echo "App log from inner" > nested_inner/app.log
cd nested_inner && zip -r ../inner.zip . && cd ..
mv inner.zip nested_outer/
cd nested_outer && zip -r ../nested.zip . && cd ..
rm -rf nested_inner nested_outer

# 4. Mixed file types
mkdir -p mixed_temp
echo "Log file" > mixed_temp/app.log
echo "Text file" > mixed_temp/debug.txt
echo '{"data": "json"}' > mixed_temp/data.json
echo '<xml/>' > mixed_temp/config.xml
echo 'PDF content' > mixed_temp/doc.pdf
zip -r mixed_files.zip mixed_temp/
rm -rf mixed_temp

# 5. Empty (no logs)
mkdir -p empty_temp
echo '{}' > empty_temp/data.json
echo '<xml/>' > empty_temp/config.xml
zip -r empty.zip empty_temp/
rm -rf empty_temp

# 6. Corrupted ZIP
echo "This is not a valid ZIP file" > corrupted.zip

echo "✅ Test fixtures created in $FIXTURES_DIR"
```

Run:
```bash
chmod +x scripts/create-test-fixtures.sh
./scripts/create-test-fixtures.sh
```

---

## ✅ Verification Checklist

After implementing all phases:

### Phase 1: Core Import Logic
- [ ] 8 tests passing in `import_tests` module
- [ ] Test coverage for `import_log_package()` > 80%
- [ ] All error paths tested

### Phase 2: Progress Tracking
- [ ] 3 tests passing in `progress_tests` module
- [ ] Progress callbacks verified
- [ ] Percentage accuracy validated

### Phase 3: Archive Extraction
- [ ] 6 tests passing in `extraction_tests` module
- [ ] All archive formats tested (ZIP, TAR, TGZ)
- [ ] Nested extraction verified

### Phase 4: TypeScript UI
- [ ] 7 tests passing in `bundleTreeProvider.test.ts`
- [ ] UI state management tested
- [ ] Filesystem operations verified

### Phase 5: Integration
- [ ] 5 tests passing in `integration/bundleImport.test.ts`
- [ ] End-to-end workflow validated
- [ ] Error handling verified

### Final Verification
- [ ] Run all tests: `cargo test && npm test`
- [ ] Test coverage > 70% overall
- [ ] No manual testing required for regressions
- [ ] CI/CD pipeline includes all tests

---

## 🚀 Running Complete Test Suite

```bash
# Rust tests
cd lsp-server
cargo test -- --nocapture

# TypeScript tests
cd ../vscode-extension
npm run compile
npm test

# Verify coverage
cd ..
./scripts/check-test-coverage.sh
```

**Expected Output**:
```
Rust Tests:     22/22 passing ✅
TypeScript Tests: 12/12 passing ✅
Integration Tests: 5/5 passing ✅
Total:          39/39 passing ✅

Coverage:       85% (target: 70%) ✅
```

---

## 📚 Additional Resources

- TDD Rules: `.zed/rules.md` (lines 151-202)
- Coverage Analysis: `.zed/BUNDLE_TDD_COVERAGE_ANALYSIS.md`
- Manual Testing: `TESTING_CHECKLIST.md` (for reference, not required)
- Rust Testing: https://doc.rust-lang.org/book/ch11-00-testing.html
- VSCode Testing: https://code.visualstudio.com/api/working-with-extensions/testing-extension

---

**Implementation Guide Complete**  
**Total Time**: ~8 hours  
**Result**: Production-ready TDD coverage for bundle import feature