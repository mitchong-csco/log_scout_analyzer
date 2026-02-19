# 🧪 Bundle Import Testing Checklist

**Feature**: QCSONE Package Import with Archive Extraction  
**Status**: ✅ Implementation Complete - Ready for Testing  
**Date**: February 19, 2026

---

## 📋 Pre-Testing Setup

### 1. Install Updated Extension
```bash
# Option A: Install from VSIX
cd vscode-extension
code --install-extension log-scout-analyzer-0.0.162.vsix

# Option B: Development Mode
cd vscode-extension
npm install
npm run compile
# Press F5 to launch Extension Development Host
```

### 2. Verify LSP Server Binary
```bash
# Check binary exists
ls -lh vscode-extension/bin/log-scout-lsp-server-win.exe

# Expected: ~9.16 MB, dated Feb 19, 2026
```

### 3. Open Test Workspace
```bash
# Create or open a workspace folder
# The LSP server needs a workspace to initialize bundle manager
mkdir test-workspace
cd test-workspace
code .
```

---

## ✅ Test Scenarios

### Test 1: Basic QCSONE Import (Critical Path)

**Objective**: Verify basic import workflow with QCSONE package

**Prerequisites**:
- [ ] QCSONE ZIP file with pattern: `{case_id}_qcsone_download_selected.zip`
- [ ] Example: `700440257_qcsone_download_selected.zip`

**Steps**:
1. [ ] Open VSCode with workspace folder
2. [ ] Wait for LSP server to initialize (check status bar)
3. [ ] Right-click on QCSONE ZIP file in Explorer
4. [ ] Select "Scout: Import Log Package (QCSONE)"
5. [ ] Wait for progress notification

**Expected Results**:
- [ ] Progress notification shows: "Importing {filename}"
- [ ] Sub-message: "Extracting archive (including nested archives)..."
- [ ] Success popup appears with:
  - [ ] ✅ Bundle Created Successfully!
  - [ ] 📋 Case: {detected_case_id}
  - [ ] 📦 Imported: X/Y files
  - [ ] Buttons: [Open Bundle] [Analyze Now]
- [ ] Bundle appears in Bundle Explorer tree
- [ ] Bundle name is "Case {case_id}"
- [ ] Logs are organized under bundle

**Logs to Check**:
```bash
# LSP server should log:
"Importing log package: ..."
"Extracting to temp directory: ..."
"Extracted N files from archive"
"Found N log files"
"Created bundle bundle_xxx for import"
"Import complete: X of Y log files added to bundle bundle_xxx"
```

---

### Test 2: Command Palette Import

**Objective**: Verify import via Command Palette

**Steps**:
1. [ ] Open Command Palette (Ctrl+Shift+P)
2. [ ] Type "Scout: Import Log Package"
3. [ ] Select the command
4. [ ] File picker opens with filter: "QCSONE Packages (*.zip)"
5. [ ] Select a ZIP file
6. [ ] Wait for completion

**Expected Results**:
- [ ] Same success message as Test 1
- [ ] Bundle created successfully

---

### Test 3: Import Without Case ID

**Objective**: Verify fallback when case ID cannot be detected

**Prerequisites**:
- [ ] ZIP file with non-standard name (e.g., `logs_backup.zip`)

**Steps**:
1. [ ] Import ZIP file with random name
2. [ ] Observe bundle creation

**Expected Results**:
- [ ] Bundle created successfully
- [ ] Bundle name: "Import logs_backup" (derived from filename)
- [ ] No case ID in metadata
- [ ] Tag "imported" present
- [ ] Tag "qcsone" NOT present (no case ID detected)

---

### Test 4: Nested Archives

**Objective**: Verify recursive extraction of nested archives

**Prerequisites**:
- [ ] ZIP file containing another ZIP file
- [ ] Example: `outer.zip` → contains `inner.zip` → contains `app.log`

**Steps**:
1. [ ] Import outer ZIP file
2. [ ] Check imported logs

**Expected Results**:
- [ ] Both ZIP files extracted
- [ ] Logs from nested ZIP are included
- [ ] Total files count includes all files from both archives
- [ ] All log files from both archives added to bundle

**Verify**:
```bash
# Check temp directory was cleaned up
ls /tmp/log-scout-import-* 
# Should be empty or not exist
```

---

### Test 5: Mixed File Types

**Objective**: Verify log file filtering

**Prerequisites**:
- [ ] ZIP containing:
  - [ ] `.log` files (should be imported)
  - [ ] `.txt` files (should be imported)
  - [ ] `.json` files (should be skipped)
  - [ ] `.xml` files (should be skipped)
  - [ ] `.pdf` files (should be skipped)

**Steps**:
1. [ ] Import ZIP with mixed file types
2. [ ] Check imported logs

**Expected Results**:
- [ ] Only log files (.log, .txt, .out, .err) imported
- [ ] JSON, XML, PDF files skipped
- [ ] importedCount < totalFiles
- [ ] Bundle contains only log files

---

### Test 6: Service Detection

**Objective**: Verify service auto-detection during import

**Prerequisites**:
- [ ] ZIP containing logs from different services:
  - [ ] Jabber logs (e.g., `cstartup.log`, `jabber-client.log`)
  - [ ] CUCM logs (e.g., `ccm.log`, `cucm_syslog.txt`)
  - [ ] CUP logs (e.g., `cup_tomcat.log`)

**Steps**:
1. [ ] Import ZIP with multi-service logs
2. [ ] Open Bundle Explorer
3. [ ] Expand the created bundle
4. [ ] Check each log file's description

**Expected Results**:
- [ ] Each log shows detected service in description
- [ ] Jabber logs labeled "Jabber"
- [ ] CUCM logs labeled "CUCM"
- [ ] CUP logs labeled "CUP"
- [ ] Unknown files labeled "Unknown"

---

### Test 7: Empty Archive

**Objective**: Verify handling of archives with no log files

**Prerequisites**:
- [ ] ZIP containing only non-log files (e.g., images, documents)

**Steps**:
1. [ ] Import empty/non-log ZIP
2. [ ] Observe result

**Expected Results**:
- [ ] Bundle created (importedCount = 0)
- [ ] Success message shows: "Imported: 0/X files"
- [ ] Bundle exists but contains no logs
- [ ] No error thrown

---

### Test 8: Large Archive

**Objective**: Verify performance with large archives

**Prerequisites**:
- [ ] Large ZIP file (>100 MB, >100 files)

**Steps**:
1. [ ] Import large ZIP
2. [ ] Monitor progress notification
3. [ ] Wait for completion
4. [ ] Check bundle

**Expected Results**:
- [ ] Import completes successfully (may take time)
- [ ] All log files imported
- [ ] No timeout errors
- [ ] Temp directory cleaned up

**Performance Expectations**:
- [ ] Small archives (<10 MB): <5 seconds
- [ ] Medium archives (10-50 MB): <15 seconds
- [ ] Large archives (>50 MB): <60 seconds

---

### Test 9: Corrupted Archive

**Objective**: Verify error handling for corrupted files

**Prerequisites**:
- [ ] Corrupted or invalid ZIP file

**Steps**:
1. [ ] Attempt to import corrupted ZIP
2. [ ] Observe error handling

**Expected Results**:
- [ ] Error message shown: "Import failed: ..."
- [ ] No bundle created
- [ ] Temp directory cleaned up
- [ ] LSP server continues running (no crash)

**Logs to Check**:
```bash
# LSP server should log:
"Import failed: Failed to extract archive: ..."
```

---

### Test 10: No Workspace Open

**Objective**: Verify error handling when no workspace is open

**Steps**:
1. [ ] Close all workspace folders
2. [ ] Attempt to import ZIP via Command Palette
3. [ ] Observe result

**Expected Results**:
- [ ] Error message: "No workspace folder open"
- [ ] No bundle created
- [ ] Graceful failure

---

### Test 11: Concurrent Imports

**Objective**: Verify handling of multiple simultaneous imports

**Steps**:
1. [ ] Start import of first ZIP
2. [ ] Immediately start import of second ZIP
3. [ ] Wait for both to complete

**Expected Results**:
- [ ] Both imports complete successfully
- [ ] Two separate bundles created
- [ ] No file conflicts
- [ ] No temp directory conflicts (UUIDs prevent collision)

---

### Test 12: Bundle Manager Initialization

**Objective**: Verify bundle manager initializes on server start

**Steps**:
1. [ ] Open VSCode with workspace
2. [ ] Check Output panel → "Log Scout Analyzer"
3. [ ] Look for initialization messages

**Expected Logs**:
```
LSP server initialized successfully
Initializing bundle manager at: /path/to/workspace
Bundle manager initialized successfully
Log Scout Analyzer ready!
```

**Also Check**:
- [ ] `.log-scout/bundles/` directory created
- [ ] `index.json` file exists
- [ ] No error messages about bundle manager

---

### Test 13: TAR Archive Support

**Objective**: Verify TAR/TGZ import works

**Prerequisites**:
- [ ] `.tar` file with logs
- [ ] `.tar.gz` or `.tgz` file with logs

**Steps**:
1. [ ] Import TAR file
2. [ ] Import TGZ file
3. [ ] Check results

**Expected Results**:
- [ ] Both TAR and TGZ extracted successfully
- [ ] Log files imported
- [ ] Same workflow as ZIP

---

### Test 14: Import Button Actions

**Objective**: Verify success popup buttons work

**Steps**:
1. [ ] Import a package successfully
2. [ ] Click "Open Bundle" button
3. [ ] Import another package
4. [ ] Click "Analyze Now" button

**Expected Results**:
- [ ] "Open Bundle": Bundle expanded in Bundle Explorer
- [ ] "Analyze Now": Analysis command triggered for bundle

---

### Test 15: Bundle Tags Verification

**Objective**: Verify correct tags applied to imported bundles

**Steps**:
1. [ ] Import QCSONE package (with case ID)
2. [ ] Import generic ZIP (no case ID)
3. [ ] Check bundle metadata

**For QCSONE Package**:
- [ ] Tags include: "imported", "qcsone"
- [ ] case_id field populated

**For Generic ZIP**:
- [ ] Tags include: "imported" only
- [ ] case_id field is null

**Verify via**:
```bash
cat .log-scout/bundles/{bundle_id}/bundle.json
```

---

## 🐛 Known Issues to Watch For

### Issue 1: Temp Directory Cleanup
**Symptom**: `/tmp/log-scout-import-*` directories accumulate  
**Impact**: Disk space usage  
**Check**: Run `ls /tmp/ | grep log-scout-import`  
**Expected**: Empty or non-existent after import completes

### Issue 2: Binary Size
**Symptom**: LSP server binary is large (9.16 MB)  
**Impact**: Extension download size  
**Check**: Monitor memory usage during imports  
**Expected**: <500 MB RAM during large imports

### Issue 3: File Locking
**Symptom**: Import fails with "file in use" on Windows  
**Impact**: Import failure  
**Check**: Close files before importing  
**Expected**: Graceful error message

### Issue 4: Case ID Detection Edge Cases
**Symptom**: Case ID not detected when it should be  
**Check**: Test with various filename patterns  
**Expected**: 9+ digit numbers at start of filename

---

## 📊 Test Results Template

### Test Session Info
```
Date: _________________
Tester: _________________
Environment: _________________
Extension Version: 0.0.162
LSP Binary Date: Feb 19, 2026
```

### Results Summary
| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Basic QCSONE Import | ⬜ Pass / ⬜ Fail | |
| 2 | Command Palette | ⬜ Pass / ⬜ Fail | |
| 3 | No Case ID | ⬜ Pass / ⬜ Fail | |
| 4 | Nested Archives | ⬜ Pass / ⬜ Fail | |
| 5 | Mixed File Types | ⬜ Pass / ⬜ Fail | |
| 6 | Service Detection | ⬜ Pass / ⬜ Fail | |
| 7 | Empty Archive | ⬜ Pass / ⬜ Fail | |
| 8 | Large Archive | ⬜ Pass / ⬜ Fail | |
| 9 | Corrupted Archive | ⬜ Pass / ⬜ Fail | |
| 10 | No Workspace | ⬜ Pass / ⬜ Fail | |
| 11 | Concurrent Imports | ⬜ Pass / ⬜ Fail | |
| 12 | Initialization | ⬜ Pass / ⬜ Fail | |
| 13 | TAR Support | ⬜ Pass / ⬜ Fail | |
| 14 | Button Actions | ⬜ Pass / ⬜ Fail | |
| 15 | Bundle Tags | ⬜ Pass / ⬜ Fail | |

**Overall Status**: ⬜ All Pass / ⬜ Some Fail / ⬜ Blocked

---

## 🔍 Debugging Tips

### Enable Verbose Logging
1. Open Output panel (View → Output)
2. Select "Log Scout Analyzer" from dropdown
3. Watch real-time logs during import

### Check LSP Server Logs
```bash
# LSP server logs to stdout
# Captured by VSCode in Output panel
# Look for:
- "Importing log package: ..."
- "Extracted N files from archive"
- "Import complete: ..."
```

### Check Bundle Structure
```bash
cd .log-scout/bundles
ls -la
cat index.json
cat {bundle_id}/bundle.json
```

### Check Temp Directory
```bash
# During import
ls -la /tmp/log-scout-import-*

# After import (should be empty)
ls /tmp/ | grep log-scout-import
```

### Manual Archive Test
```rust
// Run unit tests
cargo test -p lsp-server archive_extractor

// Test specific archive
cargo test -p lsp-server test_extract_zip -- --nocapture
```

---

## 📝 Bug Report Template

If you find issues, please report with this information:

```markdown
## Bug Report: [Brief Description]

**Date**: _________________
**Tester**: _________________
**Extension Version**: 0.0.162

### Steps to Reproduce
1. 
2. 
3. 

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happened]

### Logs
```
[Paste relevant logs from Output panel]
```

### Screenshots
[If applicable]

### Archive Details
- File name: _________________
- File size: _________________
- Archive type: _________________
- Number of files: _________________

### Environment
- OS: _________________
- VSCode version: _________________
- Workspace path: _________________
```

---

## ✅ Sign-Off Checklist

Before marking feature as "Production Ready":

- [ ] All 15 test scenarios pass
- [ ] No critical bugs found
- [ ] Performance acceptable (<60s for large archives)
- [ ] Error handling graceful
- [ ] Temp directories cleaned up
- [ ] Bundle Explorer updates correctly
- [ ] Service detection working
- [ ] Case ID detection working
- [ ] Documentation reviewed
- [ ] User-facing messages clear and helpful

**Tested By**: _________________  
**Date**: _________________  
**Status**: ⬜ Ready for Production / ⬜ Needs Fixes

---

## 🚀 Next Steps After Testing

### If All Tests Pass
1. ✅ Update feature status to "Production Ready"
2. ✅ Merge `feature/crates-lsp-migration` to main
3. ✅ Tag release: `v0.0.162-bundle-import`
4. ✅ Update user documentation
5. ✅ Announce feature to users

### If Issues Found
1. 🔧 Document all issues
2. 🔧 Prioritize (Critical / High / Medium / Low)
3. 🔧 Create fix branch
4. 🔧 Implement fixes
5. 🔧 Re-test
6. 🔧 Repeat until all pass

---

**Happy Testing!** 🧪✨