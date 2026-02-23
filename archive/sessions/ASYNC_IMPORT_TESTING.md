# Async Import Testing Guide

This guide provides comprehensive testing procedures for the async bundle import feature with progress tracking.

---

## Overview

The async import feature allows users to import log archives with:
- **Immediate UI feedback** (optimistic UI)
- **Real-time progress updates**
- **Non-blocking operations**
- **Progress percentage and time elapsed**
- **Completion notifications**

---

## Test Environment Setup

### Prerequisites

1. **VS Code** installed (latest version)
2. **Log Scout Analyzer** extension installed
3. **Test archives** prepared (various sizes)
4. **Workspace folder** open in VS Code

### Test Archives

Prepare the following test archives:

| Archive | Size | Files | Purpose |
|---------|------|-------|---------|
| `small-test.zip` | < 10MB | < 50 | Quick test |
| `medium-test.zip` | 10-100MB | 50-200 | Standard test |
| `large-test.zip` | 100MB-1GB | 200-1000 | Stress test |
| `qcsone-sample.zip` | 200-500MB | 100-500 | Real-world test |

#### Creating Test Archives

```bash
# Small test archive
cd test-data
zip small-test.zip app.log debug.log error.log

# Medium test archive
zip medium-test.zip logs/*.log

# Simulate QCSONE package
zip 700440257_qcsone_download_selected.zip logs/**/*.log
```

---

## Test Cases

### Test 1: Basic Import Flow

**Objective**: Verify the complete import flow works correctly

**Steps**:
1. Open VS Code with a workspace folder
2. Open Log Scout Bundles view (Activity Bar → Log Scout icon)
3. Click the "+" button or use Command Palette: "Scout: Import Log Archive"
4. Select `small-test.zip`
5. Observe the UI

**Expected Results**:
- ✅ Bundle appears instantly in tree with spinner icon
- ✅ Label shows: "📦 Importing small-test.zip..."
- ✅ Description updates with progress: "0% Starting..."
- ✅ Progress updates appear every 2-5 seconds:
  - "5% Extracting archive..."
  - "20% Extracting: 10/50 files"
  - "50% Creating bundle..."
  - "75% Adding logs: 30/50"
- ✅ After completion (~5-8 seconds):
  - Importing bundle disappears
  - Real bundle appears with proper name
  - Success notification: "✅ Successfully imported X log files"

**Time Estimate**: 5-10 seconds

---

### Test 2: Progress Updates

**Objective**: Verify progress updates are sent and displayed correctly

**Steps**:
1. Import `medium-test.zip`
2. Watch the Bundle tree view closely
3. Note the progress updates

**Expected Results**:
- ✅ Progress starts at 0%
- ✅ Updates occur every 2-5 seconds
- ✅ Progress increases monotonically (never goes backward)
- ✅ Key milestones visible:
  - 1-40%: Extraction phase
  - 40-50%: Filtering phase
  - 50-55%: Bundle creation
  - 55-95%: Log file processing
  - 95-100%: Cleanup
- ✅ Time elapsed shown in description
- ✅ Final progress reaches 100%

**Time Estimate**: 15-45 seconds

---

### Test 3: Multiple Concurrent Imports

**Objective**: Verify multiple imports can run simultaneously

**Steps**:
1. Start importing `medium-test.zip`
2. Immediately start importing `small-test.zip`
3. Observe both imports in the tree

**Expected Results**:
- ✅ Both bundles appear with spinners
- ✅ Both show independent progress
- ✅ Progress tokens are unique for each import
- ✅ Both complete successfully
- ✅ Both show success notifications
- ✅ Tree updates correctly for both

**Time Estimate**: 20-50 seconds

---

### Test 4: Large Archive Import

**Objective**: Test performance with large archives

**Steps**:
1. Import `large-test.zip` (100MB-1GB)
2. Monitor progress updates
3. Verify UI remains responsive

**Expected Results**:
- ✅ Bundle appears instantly despite large size
- ✅ Progress updates continue throughout
- ✅ UI remains responsive (can click other bundles)
- ✅ Can continue working in VS Code
- ✅ Import completes successfully
- ✅ Memory usage stays reasonable

**Time Estimate**: 1-5 minutes

---

### Test 5: QCSONE Package Detection

**Objective**: Verify case ID detection from QCSONE packages

**Steps**:
1. Import `700440257_qcsone_download_selected.zip`
2. Watch the progress messages
3. Check final bundle name and metadata

**Expected Results**:
- ✅ Progress shows: "Detected case ID: 700440257"
- ✅ Bundle name becomes: "Case 700440257"
- ✅ Bundle has "qcsone" and "imported" tags
- ✅ Case ID stored in metadata
- ✅ All nested archives extracted

**Time Estimate**: 2-4 minutes

---

### Test 6: Error Handling

**Objective**: Verify graceful error handling

**Test 6a: Invalid Archive**

**Steps**:
1. Try to import a non-archive file (e.g., `test.txt`)
2. Observe behavior

**Expected Results**:
- ✅ Optimistic bundle appears briefly
- ✅ Error notification appears
- ✅ Optimistic bundle removed from tree
- ✅ No partial bundle created

**Test 6b: Corrupted Archive**

**Steps**:
1. Create corrupted ZIP file
2. Try to import it
3. Observe error handling

**Expected Results**:
- ✅ Progress starts normally
- ✅ Error detected during extraction
- ✅ Error notification with details
- ✅ Optimistic bundle removed
- ✅ Temp files cleaned up

**Test 6c: Permission Denied**

**Steps**:
1. Try to import archive without read permissions
2. Observe error handling

**Expected Results**:
- ✅ Error notification appears immediately
- ✅ Clear error message about permissions
- ✅ No partial import created

---

### Test 7: UI Responsiveness

**Objective**: Verify UI stays responsive during import

**Steps**:
1. Start importing `large-test.zip`
2. While import is running:
   - Click other bundles
   - Open log files
   - Use other VS Code features
   - Start another import

**Expected Results**:
- ✅ All UI interactions work normally
- ✅ No lag or freezing
- ✅ Can browse other bundles
- ✅ Can open/edit files
- ✅ Import continues in background

**Time Estimate**: 2-5 minutes

---

### Test 8: Cancellation (Future Enhancement)

**Objective**: Verify import can be cancelled

**Status**: ⚠️ Not yet implemented

**Expected Behavior** (when implemented):
- ✅ Cancel button appears during import
- ✅ Clicking cancel stops import
- ✅ Partial bundle removed
- ✅ Temp files cleaned up
- ✅ Notification: "Import cancelled"

---

### Test 9: Network/LSP Connection

**Objective**: Verify behavior when LSP disconnects

**Steps**:
1. Start importing an archive
2. Kill the LSP server process
3. Observe behavior

**Expected Results**:
- ✅ Error notification appears
- ✅ Clear error message about LSP disconnection
- ✅ Optimistic bundle removed
- ✅ Option to restart LSP server

---

### Test 10: Progress Notification Format

**Objective**: Verify progress notifications match LSP protocol

**Steps**:
1. Enable LSP tracing: Settings → "log-scout.trace.server": "verbose"
2. Import an archive
3. Check Output panel → Log Scout Analyzer (LSP)
4. Look for `$/progress` notifications

**Expected Log Format**:
```json
{
  "jsonrpc": "2.0",
  "method": "$/progress",
  "params": {
    "token": "import_1234567890",
    "value": {
      "kind": "report",
      "message": "Extracting archive...",
      "percentage": 5,
      "cancellable": true
    }
  }
}
```

**Expected Results**:
- ✅ `token` matches request token
- ✅ `kind` is "begin", "report", or "end"
- ✅ `message` is descriptive
- ✅ `percentage` is 0-100
- ✅ `cancellable` is true

---

## Performance Benchmarks

### Expected Timings

| Archive Size | Files | Extraction | Processing | Total | Progress Updates |
|--------------|-------|------------|------------|-------|------------------|
| < 10MB | < 50 | 1-3s | 2-5s | 3-8s | 3-5 updates |
| 10-100MB | 50-200 | 5-15s | 10-30s | 15-45s | 8-15 updates |
| 100MB-1GB | 200-1000 | 30-120s | 30-180s | 1-5min | 20-50 updates |
| QCSONE (typical) | 100-500 | 45-90s | 60-120s | 2-4min | 25-40 updates |

### Performance Metrics to Monitor

1. **Time to First Update**: Should be < 100ms
2. **Progress Update Frequency**: Every 2-5 seconds
3. **UI Responsiveness**: Should remain < 16ms frame time
4. **Memory Usage**: Should not spike > 500MB
5. **CPU Usage**: Should stay < 50% during import

---

## Manual Test Checklist

### Pre-Deployment Checklist

- [ ] LSP server builds without errors
- [ ] Extension compiles without TypeScript errors
- [ ] Extension packages as VSIX successfully
- [ ] Extension installs in VS Code

### Smoke Test (5 minutes)

- [ ] Extension activates without errors
- [ ] Bundles view appears in Activity Bar
- [ ] Can open Command Palette commands
- [ ] Import command appears in palette
- [ ] Small archive imports successfully
- [ ] Progress updates appear
- [ ] Success notification appears

### Full Test Suite (30 minutes)

- [ ] Test 1: Basic Import Flow ✓
- [ ] Test 2: Progress Updates ✓
- [ ] Test 3: Multiple Concurrent Imports ✓
- [ ] Test 4: Large Archive Import ✓
- [ ] Test 5: QCSONE Package Detection ✓
- [ ] Test 6: Error Handling ✓
- [ ] Test 7: UI Responsiveness ✓
- [ ] Test 9: Network/LSP Connection ✓
- [ ] Test 10: Progress Notification Format ✓

### Stress Test (1 hour)

- [ ] Import 10 archives sequentially
- [ ] Import 5 archives concurrently
- [ ] Import 1GB+ archive
- [ ] Monitor memory/CPU usage
- [ ] Check for memory leaks
- [ ] Verify temp files cleaned up

---

## Automated Testing (Future)

### Unit Tests

```typescript
describe('BundleTreeProvider', () => {
  it('should create optimistic bundle immediately', () => {
    const provider = new BundleTreeProvider();
    provider.importPackage('test.zip');
    
    // Verify optimistic bundle exists
    const bundles = provider.bundles;
    expect(bundles.length).toBe(1);
    expect(bundles[0].type).toBe('bundle-importing');
  });

  it('should update progress on notification', () => {
    const provider = new BundleTreeProvider();
    provider.handleProgressNotification({
      token: 'test-token',
      value: {
        kind: 'report',
        message: 'Testing...',
        percentage: 50
      }
    });
    
    // Verify progress updated
    const progress = provider.importingBundles.get('test-token');
    expect(progress.percentage).toBe(50);
  });
});
```

### Integration Tests

```typescript
describe('Import Flow', () => {
  it('should complete full import cycle', async () => {
    const provider = new BundleTreeProvider();
    const result = await provider.importPackage('small-test.zip');
    
    expect(result.importedCount).toBeGreaterThan(0);
    expect(result.bundleId).toMatch(/^bundle_/);
  });
});
```

---

## Troubleshooting Guide

### Issue: No Progress Updates Appearing

**Symptoms**:
- Bundle shows "0% Starting..." forever
- No progress updates in tree

**Diagnosis**:
1. Check LSP server logs: `%USERPROFILE%\.log-scout-analyzer\lsp-server-*.log`
2. Look for progress notification sends
3. Check extension output: View → Output → Log Scout Analyzer

**Solution**:
- Verify LSP server is sending `$/progress` notifications
- Check token matches between request and notification
- Verify extension is listening for notifications

---

### Issue: Bundle Stuck in "Importing" State

**Symptoms**:
- Spinner keeps spinning
- Never completes or shows error

**Diagnosis**:
1. Check LSP server for errors
2. Check if LSP crashed during import
3. Look for exceptions in logs

**Solution**:
- Restart LSP: Command Palette → "Restart LSP Server"
- Check disk space for temp directory
- Verify archive file is not locked

---

### Issue: Import Completes But No Bundle Appears

**Symptoms**:
- Progress reaches 100%
- Success notification appears
- But no bundle in tree

**Diagnosis**:
1. Check bundle index: `.log-scout/bundles/index.json`
2. Verify bundle directory created
3. Check bundle manifest exists

**Solution**:
- Manually refresh tree: Click refresh button
- Check file permissions on bundles directory
- Verify bundle ID returned by LSP

---

### Issue: Multiple Imports Interfere

**Symptoms**:
- Second import fails
- Progress updates mixed between imports

**Diagnosis**:
1. Check progress tokens are unique
2. Verify each import has separate state
3. Check for race conditions

**Solution**:
- Ensure UUID generation for tokens
- Verify Map storage by token
- Check concurrent access to bundle manager

---

## Success Criteria

### Must Have ✅

- [x] Optimistic UI appears instantly (< 100ms)
- [x] Progress updates sent from LSP
- [x] Progress updates displayed in tree
- [x] Import completes successfully
- [x] Real bundle replaces optimistic entry
- [x] Success notification appears
- [x] UI remains responsive during import

### Should Have ⚠️

- [ ] Cancellation support (future)
- [ ] Retry on failure (future)
- [ ] Resume interrupted import (future)
- [ ] Progress in status bar (future)
- [ ] Estimated time remaining (future)

### Nice to Have 💡

- [ ] Visual progress bar
- [ ] Detailed file-by-file progress
- [ ] Import history/logs
- [ ] Statistics (speed, compression ratio)
- [ ] Background imports when VS Code minimized

---

## Regression Testing

After any changes, verify:

1. **No Breaking Changes**:
   - [ ] Existing bundles still load
   - [ ] Existing commands still work
   - [ ] Diagnostics still show
   - [ ] Pattern matching still works

2. **Backward Compatibility**:
   - [ ] Old bundle format still loads
   - [ ] Imports without progress token work
   - [ ] Extension works without LSP

3. **Performance**:
   - [ ] No performance degradation
   - [ ] Memory usage unchanged
   - [ ] Startup time unchanged

---

## Test Report Template

```markdown
# Async Import Test Report

**Date**: YYYY-MM-DD
**Tester**: Name
**Version**: X.Y.Z
**Environment**: Windows 10/11, VS Code X.Y.Z

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Basic Import Flow | ✅ PASS | Completed in 5s |
| Progress Updates | ✅ PASS | 8 updates received |
| Multiple Concurrent | ✅ PASS | Both completed |
| Large Archive | ⚠️ WARN | Took 6min (expected 5min) |
| QCSONE Detection | ✅ PASS | Case ID detected |
| Error Handling | ✅ PASS | Errors caught |
| UI Responsiveness | ✅ PASS | No lag |

## Issues Found

1. **Issue #1**: Brief description
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual

## Performance Metrics

- Average import time (small): 6s
- Average import time (QCSONE): 3min 20s
- Memory usage: 250MB peak
- CPU usage: 35% average

## Recommendations

- List any improvements or fixes needed

## Sign-off

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for deployment

Signature: _______________  Date: ___________
```

---

## Summary

This testing guide covers:

✅ **10 comprehensive test cases**  
✅ **Performance benchmarks**  
✅ **Manual test checklist**  
✅ **Troubleshooting guide**  
✅ **Success criteria**  
✅ **Regression testing**  
✅ **Test report template**

Follow this guide to ensure the async import feature works reliably and provides an excellent user experience!