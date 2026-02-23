# 🎯 Scenario 1: Ready to Implement E2E Test

**Status:** Ready for Implementation  
**Date Prepared:** 2025-02-24  
**Estimated Time:** 4-6 hours  
**Priority:** 🔴 Critical  

---

## 📋 What We're Building

**Goal:** Automate the complete user workflow for Scenario 1 (Import & Analyze Bundle)

**What the test does:**
1. User opens VS Code with empty workspace
2. User imports RTMT bundle (700440257_qcsone_download.zip)
3. Extension analyzes files automatically
4. Issues appear in Problems Panel
5. User clicks issue → navigates to log line
6. Test verifies complete workflow

**Why this matters:**
- Validates the #1 user scenario works end-to-end
- Catches regressions before users do
- Documents expected behavior
- Foundation for testing other scenarios

---

## 📚 Documentation Ready

### Detailed Scenario Walkthrough
✅ **Location:** `docs/user-scenarios/SCENARIO_01_IMPORT_AND_ANALYZE.md` (545 lines)
- Complete step-by-step user journey
- Visual diagrams for each step
- Expected results at each stage
- Edge cases documented
- Success criteria defined

### E2E Test Specification
✅ **Location:** `E2E_TEST_SCENARIOS.md` → Scenario 1 section
- Detailed test steps
- Preconditions listed
- Expected results defined
- Test verification code samples
- Estimated time: 5 minutes (user time)

### User Scenarios Master List
✅ **Location:** `USER_SCENARIOS.md`
- Scenario 1 is fully documented
- Implementation status: ✅ Complete
- Test coverage: 🟡 Partial (component-level only)
- Next action: Automate E2E test

---

## 🗂️ File Structure Prepared

```
vscode-extension/src/test/suite/
├── e2e/                           ← CREATE THIS FOLDER
│   └── scenario1.test.ts          ← CREATE THIS FILE (main test)
│
├── integration/                    ← EXISTS (reference these)
│   ├── bundleImport.test.ts       (LSP mocking examples)
│   └── bundleWorkflows.test.ts    (integration patterns)
│
└── unit/                          ← EXISTS (reference these)
    └── bundleTreeProvider.test.ts  (component tests)
```

---

## 🧪 Test Data Ready

**Test Bundle Location:**
- ✅ `test-data/700440257_qcsone_download.zip`
- Real RTMT bundle, ~250MB
- Contains 87 files
- Expected issues: 5 errors, 23 warnings, 45 info

**Alternative Test Data:**
- `test-data/quick-test.zip` (small, fast)
- `test-data/medium-test.zip` (medium size)

---

## 📝 Test Template

### Basic Structure
```typescript
// vscode-extension/src/test/suite/e2e/scenario1.test.ts

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('E2E: Scenario 1 - Import & Analyze Bundle', () => {
  let workspaceRoot: string;
  
  suiteSetup(async function() {
    this.timeout(60000); // 1 minute for setup
    // Clean workspace
    // Activate extension
    // Verify extension loaded
  });

  suiteTeardown(async function() {
    // Cleanup test bundles
    // Reset workspace
  });

  test('Complete user workflow: Import RTMT → See issues → Navigate', async function() {
    this.timeout(120000); // 2 minutes for full workflow

    // STEP 1: Import bundle
    // STEP 2: Wait for analysis
    // STEP 3: Verify bundle in tree
    // STEP 4: Verify issues in Problems Panel
    // STEP 5: Click issue → verify navigation
    // STEP 6: Verify success criteria
  });

  test('Edge case: Empty workspace', async function() {
    // Verify extension shows welcome state
  });

  test('Edge case: Corrupted archive', async function() {
    // Verify error handling
  });
});
```

---

## 🔑 Key Implementation Steps

### Step 1: Create E2E Test File (30 minutes)
```bash
# Create directory
mkdir -p vscode-extension/src/test/suite/e2e

# Create test file
touch vscode-extension/src/test/suite/e2e/scenario1.test.ts
```

**Tasks:**
- [ ] Import required modules (vscode, assert, path, fs)
- [ ] Set up suite setup/teardown hooks
- [ ] Define workspace cleanup helper
- [ ] Define timeout values

### Step 2: Implement Import Workflow (1-2 hours)
```typescript
// Simulate user importing bundle
const bundlePath = path.join(__dirname, '../../../../../test-data/700440257_qcsone_download.zip');

// Execute import command
await vscode.commands.executeCommand('logScoutAnalyzer.importArchive', bundlePath);

// Wait for import to complete
await waitForImportComplete(30000); // 30 second timeout
```

**Tasks:**
- [ ] Locate test data file
- [ ] Execute import command
- [ ] Wait for LSP to process
- [ ] Verify no errors during import

### Step 3: Verify Bundle in Tree View (30 minutes)
```typescript
// Get bundle tree provider
const bundleExplorer = vscode.window.registerTreeDataProvider(...);

// Wait for tree to update
await waitForTreeUpdate();

// Verify bundle exists
const bundles = await getBundles();
assert.strictEqual(bundles.length, 1, 'Should have 1 bundle');
assert.strictEqual(bundles[0].caseId, '700440257', 'Should detect case ID');
```

**Tasks:**
- [ ] Access bundle tree provider
- [ ] Wait for tree refresh
- [ ] Verify bundle count
- [ ] Verify case ID detection
- [ ] Verify file count

### Step 4: Verify Issues in Problems Panel (1 hour)
```typescript
// Get diagnostics from Problems Panel
const diagnostics = vscode.languages.getDiagnostics();

// Flatten to get all issues
const allIssues = Array.from(diagnostics.values()).flat();

// Verify issue counts
assert.ok(allIssues.length > 0, 'Should have issues');
const errors = allIssues.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
const warnings = allIssues.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);

assert.ok(errors.length > 0, 'Should have errors');
assert.ok(warnings.length > 0, 'Should have warnings');
```

**Tasks:**
- [ ] Get diagnostics from VS Code API
- [ ] Count issues by severity
- [ ] Verify expected issue counts
- [ ] Verify issue messages are meaningful

### Step 5: Test Navigation (1 hour)
```typescript
// Get first error diagnostic
const firstError = errors[0];

// Simulate user clicking issue
await vscode.window.showTextDocument(firstError.uri, {
  selection: new vscode.Range(firstError.range.start, firstError.range.end)
});

// Verify editor opened
const activeEditor = vscode.window.activeTextEditor;
assert.ok(activeEditor, 'Editor should be open');
assert.strictEqual(activeEditor.document.uri.toString(), firstError.uri.toString(), 'Should open correct file');
```

**Tasks:**
- [ ] Get diagnostic from Problems Panel
- [ ] Simulate click (showTextDocument)
- [ ] Verify correct file opened
- [ ] Verify cursor at correct line
- [ ] Verify line is highlighted

### Step 6: Verify Success Criteria (30 minutes)
```typescript
// All success criteria from scenario doc
assert.ok(bundleImported, '✅ Bundle imported successfully');
assert.ok(bundleVisible, '✅ Bundle visible in Bundle Explorer');
assert.ok(issuesVisible, '✅ Issues visible in Problems Panel');
assert.ok(navigationWorks, '✅ User can navigate to issue locations');
assert.ok(exportWorks, '✅ User can export findings'); // Optional for first version
```

**Tasks:**
- [ ] Verify all critical success criteria
- [ ] Add assertions for each criterion
- [ ] Log results for debugging
- [ ] Take screenshots (optional)

---

## 🛠️ Helper Functions Needed

### 1. Wait for Import Complete
```typescript
async function waitForImportComplete(timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    // Check if bundle directory exists
    // Check if analysis is complete
    // Return when ready
    await sleep(100);
  }
  throw new Error('Import timeout');
}
```

### 2. Wait for Tree Update
```typescript
async function waitForTreeUpdate(): Promise<void> {
  return new Promise((resolve) => {
    const disposable = bundleTreeProvider.onDidChangeTreeData(() => {
      disposable.dispose();
      resolve();
    });
  });
}
```

### 3. Clean Workspace
```typescript
async function cleanWorkspace(): Promise<void> {
  const bundlesDir = path.join(workspaceRoot, '.log-scout/bundles');
  if (fs.existsSync(bundlesDir)) {
    fs.rmSync(bundlesDir, { recursive: true });
  }
}
```

### 4. Sleep Helper
```typescript
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 🐛 Common Issues & Solutions

### Issue: Extension Not Activating
**Solution:** 
```typescript
// Force activation
await vscode.extensions.getExtension('log-scout-team.log-scout-analyzer')?.activate();
```

### Issue: LSP Not Responding
**Solution:**
```typescript
// Wait for LSP to be ready
await waitForLSPReady();
```

### Issue: Diagnostics Not Appearing
**Solution:**
```typescript
// Give LSP time to analyze
await sleep(5000);
// Force diagnostic refresh
vscode.commands.executeCommand('workbench.action.problems.focus');
```

### Issue: File System Race Condition
**Solution:**
```typescript
// Use file watcher instead of timeouts
const watcher = fs.watch(bundleDir, (eventType, filename) => {
  if (filename === 'bundle.json') {
    resolve();
  }
});
```

---

## ✅ Definition of Done

Test is complete when:
- [ ] Test file created: `e2e/scenario1.test.ts`
- [ ] Test compiles without errors
- [ ] Test runs and passes
- [ ] All 5 success criteria verified
- [ ] Edge cases handled (empty workspace, errors)
- [ ] Test takes <2 minutes to run
- [ ] Test is deterministic (passes consistently)
- [ ] Test documented with comments
- [ ] Added to CI/CD pipeline (optional for first version)

---

## 📊 Success Metrics

**Test Quality:**
- ✅ Tests complete user workflow (not just components)
- ✅ Tests what users actually do
- ✅ Catches real regressions
- ✅ Runs fast (<2 minutes)
- ✅ Easy to debug when fails

**Coverage:**
- ✅ Scenario 1 fully automated
- ✅ Critical path tested
- ✅ Edge cases covered
- ✅ Foundation for Scenarios 2-5

---

## 🚀 After This Test

Once Scenario 1 E2E test is complete:

### Immediate Next Steps
1. ✅ Celebrate! First E2E test done! 🎉
2. Document any issues found
3. Add test to CI/CD pipeline
4. Create PR for review

### Follow-Up Tasks
1. Scenario 2 E2E test (Multi-File Investigation)
2. Scenario 3 E2E test (Export Results)
3. Scenario 5 E2E test (Error Recovery)
4. Scenario 4 E2E test (Workspace Persistence)

### Long-Term Goals
- All 5 critical scenarios tested
- 80%+ E2E coverage
- Tests run in <10 minutes total
- Tests catch regressions before release

---

## 🤝 Getting Help

**Questions during implementation?**
- Check `E2E_TEST_SCENARIOS.md` for detailed test steps
- Check `docs/user-scenarios/SCENARIO_01_IMPORT_AND_ANALYZE.md` for user flow
- Check `vscode-extension/src/test/suite/integration/` for patterns
- Check VS Code test docs: https://code.visualstudio.com/api/working-with-extensions/testing-extension

**Stuck?**
- Start with simplest version (happy path only)
- Add edge cases later
- Use lots of console.log for debugging
- Take breaks - fresh eyes help!

---

## 📝 Quick Start Commands

```bash
# Navigate to extension directory
cd vscode-extension

# Create E2E test directory
mkdir -p src/test/suite/e2e

# Create test file (copy template from this doc)
code src/test/suite/e2e/scenario1.test.ts

# Run tests
npm test -- --grep "Scenario 1"

# Debug tests
F5 in VS Code (with test file open)
```

---

## 🎯 Ready to Start!

Everything is prepared:
- ✅ Documentation complete
- ✅ Test data ready
- ✅ Template provided
- ✅ Examples available
- ✅ Helper functions outlined
- ✅ Success criteria defined

**Next session:**
1. Copy this guide
2. Create the test file
3. Implement step by step
4. Run and iterate
5. Celebrate when it passes!

**Estimated time:** 4-6 hours for complete implementation

**Let's build the first E2E test and ensure Scenario 1 stays working forever! 🚀**

---

**Created:** 2025-02-24  
**Ready for:** Next development session  
**Owner:** Engineering Team  
**Priority:** 🔴 Critical

Good luck! You've got this! 💪