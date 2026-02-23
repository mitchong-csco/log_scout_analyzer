# 🧪 E2E Test Scenarios - User Workflows

**Document Type:** E2E Test Specifications  
**Version:** 1.0  
**Date:** February 24, 2025  
**Purpose:** Complete E2E test scenarios from user perspective  

---

## 📋 Document Overview

This document contains **complete E2E test scenarios** for the Log Scout Analyzer VS Code extension. Each scenario represents a **real user workflow** that must be validated end-to-end.

**Organization:**
- 🔴 Critical Scenarios (Must Test) - 5 scenarios
- 🟡 Important Scenarios (Should Test) - 4 scenarios
- 🟢 Nice-to-Have Scenarios (Could Test) - 3 scenarios

**Total:** 12 complete user workflows

---

## 🎭 User Persona: Kona the Cisco Engineer

**Background:**
- Name: Kona
- Role: UCAPPS Engineer at TAC
- Experience: 1 years with Cisco UC Appliances and Application
- Goal: Troubleshoot call quality issues
- Challenge: Analyzing 100+ log files manually

**Typical Workflow:**
1. Customer reports call issue
2. Downloads logs from RTMT (QCSONE package)
3. Needs to find patterns in logs
4. Correlates issues across multiple files
5. Exports findings for TAC case

---

# 🔴 CRITICAL SCENARIOS (MUST TEST)

## Scenario 1: First Time User - Import & Analyze

**Priority:** 🔴 CRITICAL  
**User Story:** Kona downloads logs from Quicker CSOne and finds the root cause  
**Time:** 5 minutes  
**Success:** User finds issue and understands next steps  

### Preconditions
- VS Code installed
- Log Scout extension installed
- Log archive downloaded: `700440257_qcsone_download.zip`
- User has never used the extension before

### Test Steps

#### Step 1: Opening VS Code
**User Action:** Opens VS Code with empty workspace  
**Expected Result:**
- VS Code opens
- No bundles in Bundle Explorer
- Extension activates automatically

**Test Verification:**
```typescript
assert(vscode.extensions.getExtension('log-scout-team.log-scout-analyzer').isActive);
assert(bundleExplorer.bundles.length === 0);
```

---

#### Step 2: Discovering Import Feature
**User Action:** Opens Command Palette (`Ctrl+Shift+P`)  
**Expected Result:**
- Command palette opens
- User can type "log scout" and see commands

**Test Verification:**
```typescript
const commands = await vscode.commands.getCommands();
assert(commands.includes('logScoutAnalyzer.importArchive'));
```

---

#### Step 3: Starting Import
**User Action:** 
1. Types "Log Scout: Import Bundle"
2. Selects command
3. File picker opens

**Expected Result:**
- File picker dialog appears
- Shows `.zip`, `.tar`, `.tar.gz` filter
- User can navigate filesystem

**Test Verification:**
```typescript
const fileDialog = await waitForFileDialog();
assert(fileDialog.filters.includes('*.zip'));
```

---

#### Step 4: Selecting File
**User Action:** 
1. Navigates to Downloads folder
2. Selects `700440257_qcsone_download.zip`
3. Clicks "Open"

**Expected Result:**
- File dialog closes
- Import begins

**Test Verification:**
```typescript
await selectFile('C:\\Users\\Kona\\Downloads\\700440257_qcsone_download.zip');
assert(importStarted === true);
```

---

#### Step 5: Entering Case ID
**User Action:** 
1. Input prompt appears: "Enter case ID (optional)"
2. User types: `700440257`
3. Presses Enter

**Expected Result:**
- Input accepted
- Case ID associated with bundle

**Test Verification:**
```typescript
const bundle = await waitForBundleImport();
assert(bundle.caseId === '700440257');
```

---

#### Step 6: Watching Progress
**User Action:** Waits while import happens  
**Expected Result:**
- Progress notification appears: "Importing bundle..."
- Progress bar or spinner visible
- Status updates: "Extracting files..." → "Detecting services..." → "Import complete"
- Takes < 30 seconds

**Test Verification:**
```typescript
const notifications = await captureNotifications();
assert(notifications.some(n => n.message.includes('Importing bundle')));
assert(importDuration < 30000); // 30 seconds
```

---

#### Step 7: Bundle Appears
**User Action:** Looks at Bundle Explorer panel  
**Expected Result:**
- Bundle appears in tree: "700440257" (case ID)
- Bundle shows file count: "(45 files)"
- Bundle is expanded by default
- Files grouped by service type (CUCM, Jabber, etc.)

**Test Verification:**
```typescript
const bundles = await getBundlesFromTree();
assert(bundles.length === 1);
assert(bundles[0].name === '700440257');
assert(bundles[0].fileCount === 45);
```

---

#### Step 8: Starting Analysis
**User Action:** 
1. Right-clicks bundle in tree
2. Sees context menu
3. Clicks "Analyze Bundle"

**Expected Result:**
- Context menu shows options:
  - ✅ "Analyze Bundle"
  - "Rename Bundle"
  - "Delete Bundle"
  - "Export Bundle"

**Test Verification:**
```typescript
const contextMenu = await showBundleContextMenu(bundle);
assert(contextMenu.items.includes('Analyze Bundle'));
await contextMenu.click('Analyze Bundle');
```

---

#### Step 9: Analysis Progress
**User Action:** Waits during analysis  
**Expected Result:**
- Progress notification: "Analyzing bundle..."
- Status bar shows progress (optional)
- Takes < 60 seconds for 45 files

**Test Verification:**
```typescript
const analysisStart = Date.now();
await waitForAnalysisComplete();
const analysisDuration = Date.now() - analysisStart;
assert(analysisDuration < 60000); // 60 seconds
```

---

#### Step 10: Dashboard Opens
**User Action:** Nothing (automatic)  
**Expected Result:**
- Annotation Dashboard panel opens automatically
- Appears in bottom panel (with Terminal, Problems, etc.)
- Dashboard tab is active/focused

**Test Verification:**
```typescript
const dashboard = await waitForDashboardOpen();
assert(dashboard.isVisible());
assert(dashboard.isActive());
```

---

#### Step 11: Seeing Results
**User Action:** Reads dashboard content  
**Expected Result:**
- Header shows: "Found 47 issues"
- Issues grouped by severity:
  - Errors (12) - red
  - Warnings (18) - yellow
  - Info (17) - blue
- Each issue shows:
  - Severity icon
  - Pattern name
  - File name (truncated)
  - Line number
  - Matched text preview
  - Timestamp

**Test Verification:**
```typescript
const annotations = await getDashboardAnnotations();
assert(annotations.length === 47);
assert(annotations.filter(a => a.severity === 'error').length === 12);
```

---

#### Step 12: Clicking First Error
**User Action:** 
1. Sees first error: "Call Setup Failure - Line 234 - cm/trace/ccm/sdi/sdi000001.txt"
2. Clicks on it

**Expected Result:**
- File opens in editor: `sdi000001.txt`
- Cursor jumps to line 234
- Line is highlighted
- Error text is visible: "ERROR: Call setup failed - codec mismatch"

**Test Verification:**
```typescript
const firstError = annotations.find(a => a.severity === 'error');
await clickAnnotation(firstError);

const editor = vscode.window.activeTextEditor;
assert(editor.document.fileName.includes('sdi000001.txt'));
assert(editor.selection.active.line === 234);
```

---

#### Step 13: Reading Context
**User Action:** Scrolls up/down to read surrounding log lines  
**Expected Result:**
- Can see 20 lines before error
- Can see 20 lines after error
- Context helps understand what happened
- Kona finds: "INVITE rejected - codec mismatch between endpoints"

**Test Verification:**
```typescript
const lineText = editor.document.lineAt(234).text;
assert(lineText.includes('codec mismatch'));
```

---

#### Step 14: Finding Related Errors
**User Action:** Goes back to dashboard, browses other errors  
**Expected Result:**
- Dashboard still visible
- Can click other annotations
- Kona finds 3 more "codec mismatch" errors
- Pattern emerges: All calls to extension 5001 fail

**Test Verification:**
```typescript
const codecErrors = annotations.filter(a => 
  a.matchedText.includes('codec mismatch')
);
assert(codecErrors.length === 4);
```

---

#### Step 15: Understanding Root Cause
**User Action:** Connects the dots  
**Expected Result:**
- Kona realizes: Extension 5001 has wrong codec config
- Root cause identified in < 5 minutes
- Ready to fix issue

**Test Verification:**
```typescript
// User has succeeded in finding root cause!
assert(userFoundRootCause === true);
```

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] User imported bundle successfully
- [x] Analysis ran without errors
- [x] Dashboard showed results
- [x] User could click and jump to errors
- [x] User understood the issue
- [x] Entire workflow took < 10 minutes

**User Sentiment:**
- ✅ "This saved me hours!"
- ✅ "I found the issue quickly"
- ✅ "The tool is intuitive"

---

### Error Scenarios

**What if import fails?**
- Show error: "Failed to import bundle: Invalid ZIP file"
- Offer "Try Again" button
- User can select different file

**What if no patterns found?**
- Dashboard shows: "No issues found"
- Explanation: "This may be normal, or patterns need updating"
- Show button: "Add Custom Pattern"

**What if file can't be opened?**
- Show error: "File no longer exists"
- Offer: "Refresh Bundle" option

---

### Performance Requirements

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Import time (45 files) | < 20s | < 30s |
| Analysis time | < 40s | < 60s |
| Dashboard load | < 1s | < 2s |
| Click → Jump to line | < 200ms | < 500ms |
| Memory usage | < 300MB | < 500MB |

---

### Test Data Requirements

**File Needed:**
- `700440257_qcsone_download.zip` (real RTMT export)
- Must contain:
  - CUCM logs with errors
  - Multiple log files (30+)
  - Real patterns (codec mismatch, call failures, etc.)
  - Various file types (sdi, sdl, trace, etc.)

---

### Implementation Notes

**Test File Location:**
```
vscode-extension/src/test/suite/e2e/scenarios/scenario_01_first_time_user.test.ts
```

**Estimated Implementation Time:** 3 hours

**Dependencies:**
- E2E test helpers created
- Real RTMT test data available
- Compilation errors fixed

---

## Scenario 2: Multi-File Investigation

**Priority:** 🔴 CRITICAL  
**User Story:** Kona needs context from multiple files to understand the issue  
**Time:** 10 minutes  
**Success:** User correlates information across files  

### Preconditions
- Bundle already imported (from Scenario 1)
- Dashboard shows 47 issues
- Kona has clicked on first error

### Test Steps

#### Step 1: Insufficient Context
**User Action:** Reading error in `sdi000001.txt` line 234  
**Expected Result:**
- Error shows: "Call setup failed - codec mismatch"
- But doesn't show WHICH codecs were attempted
- Kona needs more context

**Test Verification:**
```typescript
const editor = vscode.window.activeTextEditor;
const errorLine = editor.document.lineAt(234).text;
assert(errorLine.includes('codec mismatch'));
assert(!errorLine.includes('G.711')); // Codec details not in this line
```

---

#### Step 2: Opening Related File
**User Action:**
1. Opens Bundle Explorer
2. Expands bundle to see all files
3. Sees files grouped:
   - 📁 CUCM Traces (25 files)
   - 📁 SDL Traces (15 files)
   - 📁 Jabber Logs (5 files)
4. Opens `sdl000002.txt` (related SDL trace)

**Expected Result:**
- File opens in new tab
- Both files visible in editor tabs
- Can switch between files easily

**Test Verification:**
```typescript
await openFileFromBundle('cm/trace/ccm/sdl/sdl000002.txt');
const editors = vscode.window.visibleTextEditors;
assert(editors.length === 2);
assert(editors[0].document.fileName.includes('sdi000001.txt'));
assert(editors[1].document.fileName.includes('sdl000002.txt'));
```

---

#### Step 3: Searching in New File
**User Action:**
1. In `sdl000002.txt`
2. Opens Find (`Ctrl+F`)
3. Searches for "5001" (the problematic extension)
4. Finds relevant line

**Expected Result:**
- Find dialog opens
- Search highlights matches
- Kona finds: "Extension 5001 configured with G.729 only"
- Aha moment: Other extensions support G.711, but 5001 doesn't

**Test Verification:**
```typescript
await vscode.commands.executeCommand('actions.find');
await setSearchText('5001');
const matches = await findMatches();
assert(matches.length > 0);
const relevantLine = matches.find(m => m.text.includes('G.729'));
assert(relevantLine !== null);
```

---

#### Step 4: Adding File to Bundle
**User Action:**
1. Realizes this file is important for the case
2. File `sdl000002.txt` is NOT in the original bundle
3. Clicks Command Palette
4. Types "Add Current File to Bundle"
5. Selects command

**Expected Result:**
- Command executes
- File added to bundle
- Notification: "File added to bundle 700440257"

**Test Verification:**
```typescript
await vscode.commands.executeCommand('logScoutAnalyzer.addCurrentFileToBundle');
await wait(1000);
const bundle = await getBundle('700440257');
const hasFile = bundle.files.some(f => f.includes('sdl000002.txt'));
assert(hasFile === true);
```

---

#### Step 5: Re-analyzing Bundle
**User Action:**
1. Right-clicks bundle in Bundle Explorer
2. Clicks "Analyze Bundle" again

**Expected Result:**
- Analysis runs again
- This time includes the newly added file
- Progress notification shown

**Test Verification:**
```typescript
await analyzeBundle(bundle.id);
await waitForAnalysisComplete();
```

---

#### Step 6: Seeing New Results
**User Action:** Looks at dashboard  
**Expected Result:**
- Dashboard updates
- Now shows 52 issues (was 47)
- New issues from `sdl000002.txt` appear
- One shows: "Configuration Warning: G.729 only - Line 567"

**Test Verification:**
```typescript
const updatedAnnotations = await getDashboardAnnotations();
assert(updatedAnnotations.length === 52);
const newAnnotation = updatedAnnotations.find(a => 
  a.filePath.includes('sdl000002.txt') && 
  a.matchedText.includes('G.729')
);
assert(newAnnotation !== null);
```

---

#### Step 7: Clicking New Issue
**User Action:** Clicks the new G.729 configuration warning  
**Expected Result:**
- Editor jumps to `sdl000002.txt` line 567
- Shows full config: "Extension 5001: Codec=G.729 only, no fallback"
- Complete picture now visible

**Test Verification:**
```typescript
await clickAnnotation(newAnnotation);
const editor = vscode.window.activeTextEditor;
assert(editor.document.fileName.includes('sdl000002.txt'));
assert(editor.selection.active.line === 567);
```

---

#### Step 8: Root Cause Confirmed
**User Action:** Kona now has complete picture  
**Expected Result:**
- File 1 (`sdi000001.txt`): Call failures with codec mismatch
- File 2 (`sdl000002.txt`): Extension 5001 only supports G.729
- Correlation: All callers use G.711, but extension rejects it
- Solution: Reconfigure extension 5001 to support G.711

**Test Verification:**
```typescript
// User has correlated information across files
assert(userFoundRootCause === true);
assert(filesAnalyzed === 2);
```

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] User opened multiple related files
- [x] User added file to bundle
- [x] Re-analysis included new file
- [x] Dashboard updated with new results
- [x] User correlated information across files
- [x] Root cause confirmed

**User Sentiment:**
- ✅ "I can investigate across multiple files easily"
- ✅ "Adding files to bundle was intuitive"
- ✅ "The tool helped me connect the dots"

---

### Test Data Requirements

**Files Needed:**
- `sdi000001.txt` - Contains call failure errors
- `sdl000002.txt` - Contains codec configuration info
- Both files must have related information (same extension 5001)

**Estimated Implementation Time:** 2 hours

---

## Scenario 3: Export Results & Share

**Priority:** 🔴 CRITICAL  
**User Story:** Kona finishes investigation and exports findings for TAC case  
**Time:** 2 minutes  
**Success:** Files exported and ready to attach  

### Test Steps

#### Step 1: Investigation Complete
**User Action:** Kona has found root cause  
**Expected Result:**
- Dashboard shows 52 annotations
- 4 critical errors related to codec mismatch
- Ready to document findings

---

#### Step 2: Exporting Annotations
**User Action:**
1. Looks at dashboard toolbar
2. Sees "Export" button (icon: download)
3. Clicks Export button

**Expected Result:**
- File save dialog opens
- Default filename: `annotations_700440257_2025-02-24.json`
- Default location: Workspace root

**Test Verification:**
```typescript
await clickExportButton();
const saveDialog = await waitForSaveDialog();
assert(saveDialog.defaultFilename.includes('700440257'));
```

---

#### Step 3: Choosing Location
**User Action:**
1. Changes filename to: `case_700440257_findings.json`
2. Navigates to Desktop
3. Clicks Save

**Expected Result:**
- File saved to Desktop
- Notification: "Annotations exported to Desktop/case_700440257_findings.json"

**Test Verification:**
```typescript
await saveFileTo('C:\\Users\\Kona\\Desktop\\case_700440257_findings.json');
const notification = await waitForNotification();
assert(notification.message.includes('exported'));
```

---

#### Step 4: Verifying Export Content
**User Action:** Opens exported file to verify  
**Expected Result:**
- Valid JSON file
- Contains all 52 annotations
- Each annotation has:
  - Category
  - Severity
  - Pattern name
  - File path
  - Line number
  - Matched text
  - Timestamp
- Export metadata:
  - Export date/time
  - Total count
  - Case ID

**Test Verification:**
```typescript
const exportedContent = JSON.parse(
  fs.readFileSync('C:\\Users\\Kona\\Desktop\\case_700440257_findings.json', 'utf8')
);
assert(exportedContent.totalAnnotations === 52);
assert(exportedContent.caseId === '700440257');
assert(exportedContent.annotations.length === 52);
assert(exportedContent.annotations[0].matchedText !== undefined);
```

---

#### Step 5: Exporting from Results Tree
**User Action:**
1. Opens Results Tree (sidebar panel)
2. Right-clicks on results
3. Sees context menu option: "Export Results to JSON"
4. Clicks it

**Expected Result:**
- Another export dialog
- Different format (results tree format vs annotations format)
- Saves to: `case_700440257_results.json`

**Test Verification:**
```typescript
await rightClickResultsTree();
await selectContextMenuItem('Export Results to JSON');
const resultsExported = await waitForFileCreation('case_700440257_results.json');
assert(resultsExported === true);
```

---

#### Step 6: Creating Summary Document
**User Action:**
1. Opens Word/Text editor
2. Writes case summary:
   - Case ID: 700440257
   - Issue: Codec mismatch on extension 5001
   - Root cause: Extension configured for G.729 only
   - Solution: Reconfigure to support G.711
3. References exported files

**Expected Result:**
- Kona has complete case documentation
- Ready to submit to TAC

---

#### Step 7: Attaching to Case
**User Action:**
1. Opens TAC case portal
2. Attaches files:
   - `case_700440257_findings.json`
   - `case_700440257_results.json`
   - Case summary document
3. Submits update

**Expected Result:**
- TAC has all necessary information
- Case can be resolved quickly
- Kona's investigation is documented

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] Annotations exported successfully
- [x] Results exported successfully
- [x] Both files contain valid data
- [x] Files include all necessary information
- [x] User can attach to case

**User Sentiment:**
- ✅ "Export was quick and easy"
- ✅ "Files contain everything TAC needs"
- ✅ "I can document my investigation"

---

### Test Data Requirements

**Validation:**
- Exported JSON is valid
- Contains all required fields
- Can be re-imported (future feature)

**Estimated Implementation Time:** 1.5 hours

---

## Scenario 4: Workspace Persistence

**Priority:** 🔴 CRITICAL  
**User Story:** Kona works on case over 2 days without losing progress  
**Time:** 10 minutes (across 2 days)  
**Success:** Work persists between sessions  

### Test Steps

#### Day 1 - Evening

##### Step 1: Import and Analyze
**User Action:** Kona imports bundle and analyzes  
**Expected Result:**
- Bundle: 700440257 (45 files)
- Analysis complete: 52 annotations
- Dashboard showing results

---

##### Step 2: Partial Investigation
**User Action:** Kona reviews first 10 errors before end of work day  
**Expected Result:**
- 10 annotations clicked/reviewed
- Notes taken on 3 key errors
- Investigation not complete yet

---

##### Step 3: Closing VS Code
**User Action:**
1. Saves all open files (if any)
2. Closes VS Code (X button)
3. Shuts down computer

**Expected Result:**
- VS Code closes cleanly
- No errors
- No data loss warnings

**Test Verification:**
```typescript
await vscode.commands.executeCommand('workbench.action.closeWindow');
// Simulate full shutdown
await simulateVSCodeRestart();
```

---

#### Day 2 - Morning

##### Step 4: Reopening VS Code
**User Action:**
1. Next morning
2. Opens VS Code
3. Opens same workspace

**Expected Result:**
- VS Code opens normally
- Extension activates
- No errors or warnings

**Test Verification:**
```typescript
await openWorkspace(workspacePath);
await waitForExtensionActivation();
assert(extensionActivated === true);
```

---

##### Step 5: Bundle Still There
**User Action:** Looks at Bundle Explorer  
**Expected Result:**
- Bundle 700440257 still appears
- Shows same 45 files
- File structure preserved
- Case ID still associated

**Test Verification:**
```typescript
const bundles = await getBundlesFromTree();
assert(bundles.length === 1);
assert(bundles[0].id === savedBundleId);
assert(bundles[0].caseId === '700440257');
assert(bundles[0].fileCount === 45);
```

---

##### Step 6: Results Still Available
**User Action:** Opens Annotation Dashboard  
**Expected Result:**
- Dashboard still has 52 annotations
- Same issues visible
- Same grouping by severity
- Clicking still works

**Test Verification:**
```typescript
await openAnnotationDashboard();
const annotations = await getDashboardAnnotations();
assert(annotations.length === 52);
```

---

##### Step 7: Click History Preserved (Optional)
**User Action:** Notices which annotations were reviewed yesterday  
**Expected Result:**
- (Optional feature) Annotations show "viewed" indicator
- Kona knows which ones she already checked
- Can continue where she left off

---

##### Step 8: Filter Settings Preserved
**User Action:** Had set filter to "Errors Only" yesterday  
**Expected Result:**
- Filter setting persists
- Dashboard still shows errors only
- User preferences remembered

**Test Verification:**
```typescript
const filters = await getDashboardFilters();
assert(filters.severity === 'error');
assert(filters.active === true);
```

---

##### Step 9: Continuing Investigation
**User Action:** Continues reviewing annotations  
**Expected Result:**
- Everything works as expected
- No data loss
- No need to re-import or re-analyze
- Picks up right where she left off

---

##### Step 10: Finding Root Cause
**User Action:** Completes investigation  
**Expected Result:**
- Root cause identified
- Ready to export results
- No time wasted re-doing work

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] Bundle persists across sessions
- [x] Analysis results persist
- [x] User preferences persist
- [x] Files still accessible
- [x] No data loss
- [x] User can continue work seamlessly

**User Sentiment:**
- ✅ "I didn't lose any work overnight"
- ✅ "Everything was still there"
- ✅ "I could continue immediately"

---

### Test Data Requirements

**Persistence Locations:**
- Bundle metadata: `.log-scout/bundles/`
- Analysis results: (cached or stored)
- User preferences: Workspace settings

**Test Approach:**
```typescript
// Save state
const stateBeforeClose = captureState();

// Simulate VS Code restart
await simulateVSCodeRestart();

// Verify state
const stateAfterReopen = captureState();
assert.deepEqual(stateBeforeClose, stateAfterReopen);
```

**Estimated Implementation Time:** 1 hour

---

## Scenario 5: Error Recovery

**Priority:** 🔴 CRITICAL  
**User Story:** Kona handles errors gracefully and recovers  
**Time:** 5 minutes  
**Success:** Error handled, user knows what to do, operation succeeds on retry  

### Test Steps

#### Scenario 5a: Corrupted ZIP File

##### Step 1: Attempting Import
**User Action:**
1. Command: "Import Bundle"
2. Selects file: `corrupted_bundle.zip`
3. Clicks Open

**Expected Result:**
- Import starts
- Progress notification appears

---

##### Step 2: Import Fails
**User Action:** Waits  
**Expected Result:**
- After ~2 seconds
- Error notification appears
- **Clear Error Message:**
  - ❌ "Failed to import bundle"
  - 📝 "The file appears to be corrupted or invalid"
  - 💡 "Please check the file and try again"
- **Actions Available:**
  - [Try Again] button
  - [Cancel] button

**Test Verification:**
```typescript
try {
  await importBundle('corrupted_bundle.zip');
  assert.fail('Should have thrown error');
} catch (error) {
  assert(error.message.includes('corrupted'));
  const notification = await getErrorNotification();
  assert(notification.actions.includes('Try Again'));
}
```

---

##### Step 3: User Clicks "Try Again"
**User Action:** Clicks "Try Again" button  
**Expected Result:**
- File picker opens again
- User can select different file
- No leftover state from failed import

**Test Verification:**
```typescript
await clickTryAgain();
const fileDialog = await waitForFileDialog();
assert(fileDialog.isOpen === true);
```

---

##### Step 4: Selecting Valid File
**User Action:**
1. This time selects: `valid_bundle.zip`
2. Clicks Open

**Expected Result:**
- Import succeeds
- Bundle appears in explorer
- No remnants of failed import

**Test Verification:**
```typescript
await selectFile('valid_bundle.zip');
const bundle = await waitForBundleImport();
assert(bundle !== null);
assert(bundle.fileCount > 0);
```

---

##### Step 5: Normal Operation Resumes
**User Action:** Analyzes bundle  
**Expected Result:**
- Everything works normally
- No issues from previous error
- Kona successfully continues

---

#### Scenario 5b: Network Timeout (if fetching from URL)

##### Step 1: Network Error
**User Action:** Imports bundle from slow/unreliable network  
**Expected Result:**
- Import times out after 30 seconds
- Error message:
  - ❌ "Import timed out"
  - 📝 "Network connection may be slow or interrupted"
  - 💡 "Check your connection and try again"
- Actions: [Retry] [Cancel]

---

##### Step 2: Retry Succeeds
**User Action:** Clicks Retry (network is better)  
**Expected Result:**
- Import completes successfully
- No duplicate bundles created

---

#### Scenario 5c: Disk Space Error

##### Step 1: No Disk Space
**User Action:** Imports large bundle (200+ files)  
**Expected Result:**
- Import fails partway through
- Error message:
  - ❌ "Import failed: Insufficient disk space"
  - 📝 "Need 500MB free, only 50MB available"
  - 💡 "Free up disk space and try again"
- Actions: [OK]

---

##### Step 2: Cleanup
**User Action:** Frees up disk space  
**Expected Result:**
- Partial import cleaned up automatically
- No orphaned files
- Can retry import

---

#### Scenario 5d: LSP Server Crash

##### Step 1: Server Crash During Analysis
**User Action:** Analysis running, LSP server crashes  
**Expected Result:**
- Error notification:
  - ⚠️ "Analysis interrupted: Server connection lost"
  - 📝 "Reconnecting to language server..."
  - 💡 "Your work is safe"
- **Auto-recovery:**
  - Extension attempts to reconnect (3 attempts)
  - Shows "Reconnecting..." indicator
  - If successful: Analysis resumes
  - If failed: "Please reload window"

**Test Verification:**
```typescript
// Simulate LSP crash
await simulateLSPCrash();

// Verify auto-recovery
const reconnectAttempted = await waitForReconnectAttempt();
assert(reconnectAttempted === true);

const recovered = await waitForRecovery();
assert(recovered === true);
```

---

##### Step 2: Manual Recovery
**User Action:** If auto-recovery fails, clicks "Reload Window"  
**Expected Result:**
- Window reloads
- Extension restarts
- LSP server starts
- Bundle and results still there

---

### Success Criteria ✅

**Error Handling Complete When:**
- [x] Clear error messages shown
- [x] User knows what went wrong
- [x] User knows what to do next
- [x] Recovery actions work
- [x] No data loss
- [x] No leftover corrupted state

**User Sentiment:**
- ✅ "Error message was helpful"
- ✅ "I knew how to fix it"
- ✅ "Retry worked"
- ✅ "Didn't lose my work"

---

### Test Data Requirements

**Error Scenarios to Test:**
- `corrupted_bundle.zip` - Invalid ZIP structure
- `partial_bundle.zip` - Incomplete download
- Large bundle with disk space issue
- LSP crash simulation

**Estimated Implementation Time:** 2 hours

---

# 🟡 IMPORTANT SCENARIOS (SHOULD TEST)

## Scenario 6: Call Flow Analysis (Phase 3.6 Integration)

**Priority:** 🟡 IMPORTANT (if integrating Phase 3.6)  
**User Story:** Kona investigates SIP signaling issues  
**Time:** 8 minutes  
**Success:** Call flow visualized, issue identified  

### Preconditions
- Bundle imported with CTRACE files
- Phase 3.6 CLI commands integrated into VS Code
- Call flow analysis feature available

### Test Steps

#### Step 1: Discovering Call Flow Feature
**User Action:**
1. Opens Command Palette
2. Types "call flow"
3. Sees: "Log Scout: Show Call Flows"

**Expected Result:**
- Command available
- Help text: "Analyze SIP call flows from CTRACE logs"

---

#### Step 2: Starting Call Flow Analysis
**User Action:** Clicks "Show Call Flows"  
**Expected Result:**
- New panel opens: "Call Flows"
- Shows loading indicator
- Scans bundle for CTRACE files

**Test Verification:**
```typescript
await vscode.commands.executeCommand('logScoutAnalyzer.showCallFlows');
const panel = await waitForCallFlowPanel();
assert(panel.isVisible());
```

---

#### Step 3: Seeing Call List
**User Action:** Waits for analysis  
**Expected Result:**
- Panel shows list of call sessions
- Example:
  ```
  📞 Call Sessions (3 found)
  
  1. ✅ 001a2f8d-f17f0004-28...
     Duration: 47s | Status: Terminated | Messages: 7
     
  2. ❌ 002b3g9e-g28g0005-39...
     Duration: 5s | Status: Cancelled | Messages: 7
     
  3. ❌ 003c4h0f-h39h0006-40...
     Duration: 0.2s | Status: Failed (486 Busy) | Messages: 4
  ```

**Test Verification:**
```typescript
const callSessions = await getCallSessions();
assert(callSessions.length === 3);
assert(callSessions[0].status === 'Terminated');
assert(callSessions[1].status === 'Cancelled');
assert(callSessions[2].status === 'Failed');
```

---

#### Step 4: Identifying Problem Call
**User Action:** Kona sees Call #2 (30s duration, then disconnected)  
**Expected Result:**
- Call matches symptom: "Calls drop after 30 seconds"
- Kona clicks on Call #2

---

#### Step 5: Viewing Call Flow Diagram
**User Action:** Clicks Call #2  
**Expected Result:**
- Panel updates to show ASCII ladder diagram:
  ```
  # Call Flow: 002b3g9e-g28g0005-39...
  
  Duration: 30s | Status: ❌ Disconnected
  
         Caller               CUCM               Callee
           |                   |                   |
  10:46:15
           |    ---- INVITE ---->                 |
  10:46:15
           |    <--- 100 Trying ----              |
  10:46:15
           |    <--- 180 Ringing ----             |
  10:46:17
           |    <--- 200 OK ----                  |
  10:46:17
           |    ---- ACK ---->                    |
  10:46:47 (30s later)
           |    ---- BYE ---->                    |
  10:46:47
           |    <--- 200 OK ----                  |
  ```

**Test Verification:**
```typescript
await clickCallSession(callSessions[1]);
const diagram = await getCallFlowDiagram();
assert(diagram.includes('BYE'));
assert(diagram.includes('30s'));
```

---

#### Step 6: Identifying Issue
**User Action:** Kona examines diagram  
**Expected Result:**
- Sees: Call established successfully (200 OK + ACK)
- Sees: BYE sent exactly 30 seconds later
- Realizes: Timeout is triggering disconnect
- Correlates: This matches the symptom reported

---

#### Step 7: Exporting Diagram
**User Action:**
1. Clicks "Export" button in Call Flow panel
2. Saves as: `call_flow_30s_timeout.md`

**Expected Result:**
- Markdown file created
- Contains full ASCII diagram
- Includes call summary with timings

**Test Verification:**
```typescript
await exportCallFlow('call_flow_30s_timeout.md');
const fileExists = fs.existsSync('call_flow_30s_timeout.md');
assert(fileExists === true);

const content = fs.readFileSync('call_flow_30s_timeout.md', 'utf8');
assert(content.includes('30s'));
assert(content.includes('BYE'));
```

---

#### Step 8: Cross-Referencing with Dashboard
**User Action:**
1. Goes back to Annotation Dashboard
2. Searches for "timeout" or "30"
3. Finds related error: "Call disconnected unexpectedly - Line 456"

**Expected Result:**
- Error from dashboard correlates with call flow
- Complete picture: Call flow shows WHEN, error shows WHERE
- Kona has evidence for TAC case

---

#### Step 9: Root Cause Confirmed
**User Action:** Kona concludes  
**Expected Result:**
- Call flow analysis proved 30-second timeout
- Error logs showed unexpected disconnect
- Configuration issue: Session timer set too low
- Solution: Increase session timer to 300 seconds

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] Call flows listed from CTRACE files
- [x] User can click and view diagram
- [x] Diagram shows complete call signaling
- [x] Timing information visible
- [x] User can export diagram
- [x] Issue identified from call flow

**User Sentiment:**
- ✅ "Visual call flow helped me understand"
- ✅ "I could see exactly when the BYE occurred"
- ✅ "Export gave me evidence for the case"

---

### Test Data Requirements

**Files Needed:**
- CTRACE file with multiple call sessions
- At least one call with the specific issue (30s timeout)
- Valid SIP message sequence

**Estimated Implementation Time:** 2 hours

---

## Scenario 7: Multiple Bundles for Same Case

**Priority:** 🟡 IMPORTANT  
**User Story:** Kona has logs from multiple sources for one case  
**Time:** 15 minutes  
**Success:** Bundles grouped, analyzed together  

### Test Steps

#### Step 1: First Bundle Import
**User Action:** Imports TAC-provided logs  
**Expected Result:**
- Bundle: "700440257" (from TAC)
- 45 files
- Shows in Bundle Explorer

---

#### Step 2: Second Bundle Import
**User Action:** 
1. Customer sends additional logs
2. Kona imports: `700440257_customer_logs.zip`
3. Enters same case ID: 700440257

**Expected Result:**
- Second bundle created
- Both bundles visible
- **Grouped under case ID:**
  ```
  📦 Case 700440257 (2 bundles)
    ├─ 📁 700440257 (45 files) [TAC logs]
    └─ 📁 700440257_customer (32 files) [Customer logs]
  ```

**Test Verification:**
```typescript
const bundle2 = await importBundle('700440257_customer_logs.zip', '700440257');
const bundles = await getBundlesFromTree();
assert(bundles.length === 2);
assert(bundles[0].caseId === bundles[1].caseId);
```

---

#### Step 3: Third Bundle Import
**User Action:** Lab reproduction logs added  
**Expected Result:**
- Third bundle: "700440257_lab"
- All three grouped:
  ```
  📦 Case 700440257 (3 bundles)
    ├─ 700440257 (45 files)
    ├─ 700440257_customer (32 files)
    └─ 700440257_lab (28 files)
  ```

---

#### Step 4: Analyzing All Bundles
**User Action:**
1. Right-clicks on case: "Case 700440257"
2. Sees option: "Analyze All Bundles"
3. Clicks it

**Expected Result:**
- Analysis runs on all 3 bundles
- Progress: "Analyzing 3 bundles..."
- Dashboard combines results from all bundles

**Test Verification:**
```typescript
await rightClickCase('700440257');
await selectMenuItem('Analyze All Bundles');
await waitForAnalysisComplete();

const annotations = await getDashboardAnnotations();
// Should have annotations from all 3 bundles
const bundle1Annotations = annotations.filter(a => a.bundleId === bundle1.id);
const bundle2Annotations = annotations.filter(a => a.bundleId === bundle2.id);
const bundle3Annotations = annotations.filter(a => a.bundleId === bundle3.id);

assert(bundle1Annotations.length > 0);
assert(bundle2Annotations.length > 0);
assert(bundle3Annotations.length > 0);
```

---

#### Step 5: Seeing Correlated Results
**User Action:** Reviews dashboard  
**Expected Result:**
- Annotations show bundle source:
  - "Error in codec mismatch - TAC logs - Line 234"
  - "Error in codec mismatch - Customer logs - Line 89"
  - "Error in codec mismatch - Lab logs - Line 12"
- Same pattern appears in ALL THREE bundles
- Confirms: Issue is reproducible

---

#### Step 6: Filtering by Bundle
**User Action:**
1. Dashboard has bundle filter dropdown
2. Kona selects: "Show: TAC logs only"

**Expected Result:**
- Dashboard filters to show only TAC log issues
- Other bundles hidden temporarily
- Can switch to other bundles

---

#### Step 7: Cross-Bundle Pattern Recognition
**User Action:** Kona notices pattern  
**Expected Result:**
- Same error appears in all 3 bundles
- Same timestamp range (business hours)
- Same affected extension (5001)
- Pattern: Issue is environment-wide, not device-specific

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] Multiple bundles imported
- [x] Bundles grouped by case ID
- [x] Can analyze all bundles together
- [x] Results show bundle source
- [x] Can filter by bundle
- [x] Patterns identified across bundles

**User Sentiment:**
- ✅ "Easy to work with multiple log sources"
- ✅ "Grouping by case kept things organized"
- ✅ "Seeing patterns across bundles was valuable"

---

### Test Data Requirements

**Files Needed:**
- 3 bundles with same case ID
- Common patterns across bundles
- Different file sets per bundle

**Estimated Implementation Time:** 2 hours

---

## Scenario 8: Filter & Search Results

**Priority:** 🟡 IMPORTANT  
**User Story:** Kona narrows 200+ issues to find relevant ones  
**Time:** 5 minutes  
**Success:** Filters applied, relevant issues found  

### Test Steps

#### Step 1: Overwhelming Results
**User Action:** Dashboard shows 200+ annotations  
**Expected Result:**
- Too many to review manually
- Need to filter/search

**Test Verification:**
```typescript
const allAnnotations = await getDashboardAnnotations();
assert(allAnnotations.length > 200);
```

---

#### Step 2: Filter by Severity
**User Action:**
1. Clicks "Errors Only" filter button
2. Filter applies

**Expected Result:**
- Dashboard updates
- Shows only 47 errors (from 200+ total)
- Other annotations hidden

**Test Verification:**
```typescript
await clickFilterButton('Errors Only');
const filteredAnnotations = await getDashboardAnnotations();
assert(filteredAnnotations.length === 47);
assert(filteredAnnotations.every(a => a.severity === 'error'));
```

---

#### Step 3: Search Within Results
**User Action:**
1. Types "timeout" in search box
2. Presses Enter

**Expected Result:**
- Further filters to 8 errors containing "timeout"
- Search term highlighted in results

**Test Verification:**
```typescript
await searchAnnotations('timeout');
const searchResults = await getDashboardAnnotations();
assert(searchResults.length === 8);
assert(searchResults.every(a => a.matchedText.toLowerCase().includes('timeout')));
```

---

#### Step 4: Sort by Time
**User Action:**
1. Clicks sort dropdown
2. Selects "Newest First"

**Expected Result:**
- 8 timeout errors sorted by timestamp
- Most recent timeout at top
- Can see chronological pattern

**Test Verification:**
```typescript
await sortBy('Newest First');
const sorted = await getDashboardAnnotations();
for (let i = 0; i < sorted.length - 1; i++) {
  assert(sorted[i].timestamp >= sorted[i + 1].timestamp);
}
```

---

#### Step 5: Identifying Pattern
**User Action:** Reviews sorted results  
**Expected Result:**
- All 8 timeouts occurred between 2-3 PM
- All on same extension (5001)
- Pattern: Peak hour issue

---

#### Step 6: Clearing Filters
**User Action:** Clicks "Clear All Filters"  
**Expected Result:**
- Back to 200+ annotations
- All severities visible
- Can apply different filters

---

### Success Criteria ✅

**Workflow Complete When:**
- [x] Filter by severity works
- [x] Search narrows results
- [x] Sort orders results
- [x] Filters are stackable
- [x] Clear filters works
- [x] User finds relevant issues quickly

**Estimated Implementation Time:** 1.5 hours

---

## Scenario 9: Large Bundle Performance

**Priority:** 🟡 IMPORTANT  
**User Story:** Kona imports 100+ file bundle without UI freezing  
**Time:** 3 minutes  
**Success:** UI remains responsive  

### Test Steps

#### Step 1: Import Large Bundle
**User Action:** Imports `large_bundle_500MB.zip` (150 files)  
**Expected Result:**
- Import starts
- Progress indicator: "Extracting 150 files..."
- UI remains responsive (can click other things)
- Import completes in < 60 seconds

**Test Verification:**
```typescript
const importStart = Date.now();
await importBundle('large_bundle_500MB.zip');
const importDuration = Date.now() - importStart;

assert(importDuration < 60000); // 60 seconds
assert(uiResponsive === true); // UI didn't freeze
```

---

#### Step 2: Analyze Large Bundle
**User Action:** Clicks "Analyze Bundle"  
**Expected Result:**
- Analysis starts
- Progress: "Analyzing 150 files... 45/150 complete"
- UI responsive during analysis
- Analysis completes in < 120 seconds

**Test Verification:**
```typescript
const analysisStart = Date.now();
await analyzeBundle(largeBundle.id);
const analysisDuration = Date.now() - analysisStart;

assert(analysisDuration < 120000); // 120 seconds
```

---

#### Step 3: Loading Dashboard
**User Action:** Dashboard opens with 1,000+ annotations  
**Expected Result:**
- Dashboard loads in < 2 seconds
- Uses virtual scrolling (Phase 5 feature)
- Shows performance info: "Virtual scrolling enabled"
- Scrolling is smooth (60fps)

**Test Verification:**
```typescript
const annotations = await getDashboardAnnotations();
assert(annotations.length > 1000);

const virtualScrollEnabled = await isVirtualScrollEnabled();
assert(virtualScrollEnabled === true);

const scrollPerformance = await measureScrollPerformance();
assert(scrollPerformance.fps >= 55); // Near 60fps
```

---

#### Step 4: Memory Usage
**User Action:** Monitors system resources  
**Expected Result:**
- Memory usage < 500MB
- No memory leaks
- CPU returns to normal after operations

**Test Verification:**
```typescript
const memoryUsage = await getExtensionMemoryUsage();
assert(memoryUsage < 500 * 1024 * 1024); // 500MB in bytes
```

---

### Success Criteria ✅

**Performance Requirements:**
- [x] Import: < 60s for 150 files
- [x] Analysis: < 120s for 150 files
- [x] Dashboard: < 2s load for 1000+ annotations
- [x] UI: Responsive throughout (< 200ms clicks)
- [x] Memory: < 500MB
- [x] Scrolling: 55+ fps

**Estimated Implementation Time:** 2.5 hours

---

# 🟢 NICE-TO-HAVE SCENARIOS (COULD TEST)

## Scenario 10: Pattern Override

*Brief: User customizes severity levels for specific patterns*  
**Time to Implement:** 1 hour

---

## Scenario 11: Theme Compatibility

*Brief: Dashboard renders correctly in light/dark themes*  
**Time to Implement:** 30 minutes

---

## Scenario 12: Keyboard Navigation

*Brief: User navigates with keyboard shortcuts only*  
**Time to Implement:** 1 hour

---

# 📊 Summary

## Total Scenarios: 12

**Critical (Must Test):** 5 scenarios
- Import & Analyze (3h)
- Multi-File Investigation (2h)
- Export Results (1.5h)
- Workspace Persistence (1h)
- Error Recovery (2h)

**Important (Should Test):** 4 scenarios
- Call Flow Analysis (2h)
- Multiple Bundles (2h)
- Filter & Search (1.5h)
- Large Bundle Performance (2.5h)

**Nice-to-Have (Could Test):** 3 scenarios
- Pattern Override (1h)
- Theme Compatibility (30min)
- Keyboard Navigation (1h)

**Total Implementation Time:**
- Critical: 9.5 hours
- Important: 8 hours
- Nice-to-Have: 2.5 hours
- **Grand Total: 20 hours**

---

## Test Data Requirements

**Files Needed:**
1. `700440257_qcsone_download.zip` - Real RTMT export (45 files)
2. `corrupted_bundle.zip` - Invalid ZIP for error testing
3. `large_bundle_500MB.zip` - Performance testing (150 files)
4. `ctrace_bundle.zip` - Contains CTRACE files for call flow
5. Various log files with real patterns

---

## Next Steps

1. **Create E2E Test Helpers** (`helpers.ts`)
2. **Setup Test Fixtures** (real RTMT data)
3. **Implement Critical Scenarios** (Scenarios 1-5)
4. **Implement Important Scenarios** (Scenarios 6-9)
5. **Run and Debug** (fix issues found)
6. **Add to CI/CD** (automated testing)

---

**Document Version:** 1.0  
**Last Updated:** February 24, 2025  
**Status:** Ready for Implementation  
**Owner:** Development Team
