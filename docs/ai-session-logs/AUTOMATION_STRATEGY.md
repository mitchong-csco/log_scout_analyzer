# Test Automation Strategy Guide 🤖

## Mission: Minimize Manual QA to <5 Minutes Per Feature

**Goal:** Automate 95%+ of testing so human QA only validates subjective UX aspects.

---

## The Testing Pyramid

```
         /\
        /  \  Manual QA (5% - Visual/UX feel only)
       /----\
      /      \  E2E Tests (10% - Critical workflows)
     /--------\
    /          \  Integration Tests (20% - Feature interactions)
   /------------\
  /              \  Unit Tests (70% - Everything else)
 /__________________\
```

### Distribution Strategy

| Test Type | Coverage | Runtime | When to Run |
|-----------|----------|---------|-------------|
| Unit Tests | 70% | 16ms | Every save/commit |
| Integration Tests | 20% | 2-5s | Before deployment |
| E2E Tests | 10% | 30s-2min | Before release |
| Manual QA | 5% | 1-5min | Final validation |

---

## Test Categories

### 1. Unit Tests (Fast, No VS Code)

**What:** Validate code structure, configuration, and wiring
**Runtime:** <100ms total
**Run:** On every file save

**Test Coverage:**
```typescript
// Configuration validation
✅ package.json structure
✅ Command registration
✅ Settings schema
✅ Menu contributions
✅ View definitions
✅ Activation events

// Code structure
✅ Imports and dependencies
✅ Function existence
✅ Variable declarations
✅ Error handling presence
✅ Logging setup

// File structure
✅ Required files exist
✅ Binary sizes reasonable
✅ Build artifacts present
```

**Example:**
```typescript
// wiring.test.ts
test('Import command registered in package.json', () => {
  const cmd = packageJson.contributes.commands.find(
    c => c.command === 'logScoutAnalyzer.importArchive'
  );
  assert.ok(cmd);
});
```

**Run:** `npm run test:wiring`

---

### 2. Integration Tests (Medium, Launches VS Code)

**What:** Validate feature interactions with VS Code API
**Runtime:** 2-10 seconds per test
**Run:** Before deployment

**Test Coverage:**
```typescript
✅ Command execution
✅ Tree view updates
✅ Webview messaging
✅ File operations
✅ LSP client-server communication
✅ Settings read/write
✅ Extension activation
✅ Context menu interactions
```

**Example:**
```typescript
// import-integration.test.ts
test('Import command executes successfully', async () => {
  // Mock file picker
  const mockUri = vscode.Uri.file('/path/to/test.zip');
  
  // Execute command
  await vscode.commands.executeCommand(
    'logScoutAnalyzer.importArchive'
  );
  
  // Verify bundle created
  const bundles = await getBundles();
  assert.strictEqual(bundles.length, 1);
});
```

**Run:** `npm test`

---

### 3. E2E Tests (Slow, Full Workflow)

**What:** Validate complete user workflows
**Runtime:** 30 seconds - 2 minutes per test
**Run:** Before release/tagging

**Test Coverage:**
```typescript
✅ Import archive → Create bundle → Analyze → View results
✅ Create case → Import logs → Tag → Search
✅ Pattern override → Analyze → Verify custom severity
✅ Export results → Verify file format → Re-import
```

**Example:**
```typescript
// import-e2e.test.ts
test('Complete import workflow', async () => {
  // 1. Start with clean state
  await cleanWorkspace();
  
  // 2. Import archive
  await importArchive('test-data/sample.zip');
  
  // 3. Verify bundle created
  const bundle = await waitForBundle();
  assert.ok(bundle);
  
  // 4. Analyze bundle
  await analyzeBundle(bundle.id);
  
  // 5. Verify results
  const results = await getAnalysisResults(bundle.id);
  assert.ok(results.length > 0);
  
  // 6. Verify UI updated
  const treeItems = await getBundleTreeItems();
  assert.ok(treeItems.length > 0);
});
```

**Run:** `npm run test:e2e`

---

## What to Automate vs. Manual Test

### ✅ ALWAYS Automate (No Excuses)

| Feature Type | Test Type | Why |
|--------------|-----------|-----|
| Configuration | Unit | Fast, deterministic |
| Command registration | Unit | Simple validation |
| Data parsing | Unit | Pure functions |
| File I/O | Integration | Easily mockable |
| API calls | Integration | Mock HTTP responses |
| State changes | Integration | Observable outcomes |
| Error handling | Unit + Integration | Critical paths |
| Business logic | Unit | Core functionality |

### 🤖 CAN Automate (Do It!)

| Feature Type | Test Type | Effort |
|--------------|-----------|--------|
| Command execution | Integration | Medium |
| Tree view updates | Integration | Medium |
| Webview interactions | Integration | Medium-High |
| Settings changes | Integration | Low |
| File system operations | Integration | Low |
| LSP communication | Integration | Medium |

### 🔍 Manual QA Only (Minimize This!)

| Feature Type | Why Manual | Time |
|--------------|------------|------|
| Visual styling | Subjective appearance | 30s |
| Color schemes | Theme compatibility | 30s |
| Layout flow | Spatial arrangement | 1min |
| Animation timing | Subjective smoothness | 30s |
| UX "feel" | Ergonomics/comfort | 2min |
| Accessibility | Screen reader compat | 3min |

**Total Manual QA Time: <5 minutes per feature**

---

## Automation Decision Tree

```
┌─────────────────────────────────────────┐
│ New Feature or Bug Fix                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Is it purely visual?│
         └────────┬────────────┘
                  │
         ┌────────┴────────┐
         │                 │
        YES               NO
         │                 │
         ▼                 ▼
    Manual QA        Can it be tested
    (Visual check)   with VS Code API?
                           │
                    ┌──────┴──────┐
                   YES            NO
                    │              │
                    ▼              ▼
            Integration Test   Unit Test
            (Test behavior)    (Test structure)
                    │              │
                    └──────┬───────┘
                           │
                           ▼
                    All tests pass?
                           │
                    ┌──────┴──────┐
                   YES            NO
                    │              │
                    ▼              ▼
                 Deploy         Fix & Retest
```

---

## Automation Templates

### Command Execution Test Template

```typescript
suite('Command: [CommandName]', () => {
  test('Command is registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('extension.commandName'));
  });

  test('Command executes without error', async () => {
    await vscode.commands.executeCommand('extension.commandName');
    // No assertion needed - will fail if throws
  });

  test('Command produces expected outcome', async () => {
    await vscode.commands.executeCommand('extension.commandName');
    
    // Verify side effects
    const result = await getExpectedOutcome();
    assert.strictEqual(result, expectedValue);
  });

  test('Command handles errors gracefully', async () => {
    // Setup error condition
    setupErrorCondition();
    
    await vscode.commands.executeCommand('extension.commandName');
    
    // Verify error handling
    const errorShown = await wasErrorMessageShown();
    assert.ok(errorShown);
  });
});
```

### Tree View Update Test Template

```typescript
suite('TreeView: [ViewName]', () => {
  let treeDataProvider: MyTreeDataProvider;

  setup(() => {
    treeDataProvider = getTreeDataProvider();
  });

  test('Tree updates when data changes', async () => {
    // Get initial state
    const initialItems = await treeDataProvider.getChildren();
    
    // Trigger data change
    await performAction();
    
    // Verify tree updated
    const updatedItems = await treeDataProvider.getChildren();
    assert.notDeepStrictEqual(updatedItems, initialItems);
  });

  test('Tree items have correct properties', async () => {
    const items = await treeDataProvider.getChildren();
    
    items.forEach(item => {
      assert.ok(item.label);
      assert.ok(item.collapsibleState !== undefined);
      assert.ok(item.iconPath);
    });
  });
});
```

### File Operation Test Template

```typescript
suite('FileOperations: [Feature]', () => {
  let testDir: string;

  setup(async () => {
    testDir = await createTempDirectory();
  });

  teardown(async () => {
    await cleanupTempDirectory(testDir);
  });

  test('Creates file with correct content', async () => {
    const filePath = path.join(testDir, 'test.json');
    
    await createFile(filePath, { key: 'value' });
    
    const exists = fs.existsSync(filePath);
    assert.ok(exists);
    
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.deepStrictEqual(content, { key: 'value' });
  });

  test('Handles missing directory gracefully', async () => {
    const filePath = path.join(testDir, 'missing', 'test.json');
    
    // Should create parent directories
    await createFile(filePath, {});
    
    assert.ok(fs.existsSync(filePath));
  });
});
```

### LSP Communication Test Template

```typescript
suite('LSP: [Feature]', () => {
  let client: LanguageClient;

  setup(async () => {
    client = await getLSPClient();
    await client.onReady();
  });

  test('Sends request and receives response', async () => {
    const response = await client.sendRequest('custom/request', {
      param: 'value'
    });
    
    assert.ok(response);
    assert.ok(response.data);
  });

  test('Handles LSP errors', async () => {
    try {
      await client.sendRequest('custom/invalidRequest', {});
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.ok(error);
    }
  });
});
```

---

## Test Organization Strategy

### Directory Structure

```
vscode-extension/
└── src/
    └── test/
        ├── suite/
        │   ├── wiring.test.ts           # Unit: Configuration/wiring
        │   ├── commands.test.ts         # Integration: Command execution
        │   ├── treeview.test.ts         # Integration: Tree view updates
        │   ├── fileops.test.ts          # Integration: File operations
        │   ├── lsp.test.ts              # Integration: LSP communication
        │   └── import-e2e.test.ts       # E2E: Complete workflows
        ├── fixtures/
        │   ├── sample-logs/             # Test data
        │   ├── config/                  # Test configurations
        │   └── archives/                # Test archives
        ├── helpers/
        │   ├── workspace.ts             # Workspace setup/cleanup
        │   ├── mocks.ts                 # Mock implementations
        │   └── assertions.ts            # Custom assertions
        └── runTest.ts                   # Test runner
```

### Naming Conventions

```typescript
// Unit tests (fast)
wiring.test.ts
config.test.ts
validation.test.ts

// Integration tests (medium)
commands.integration.test.ts
treeview.integration.test.ts
webview.integration.test.ts

// E2E tests (slow)
import-workflow.e2e.test.ts
analysis-workflow.e2e.test.ts
export-workflow.e2e.test.ts
```

---

## Coverage Goals

### Per Feature Type

| Feature | Unit | Integration | E2E | Manual |
|---------|------|-------------|-----|--------|
| Configuration | 100% | - | - | - |
| Commands | 80% | 90% | 50% | 10% |
| Tree Views | 70% | 90% | 30% | 10% |
| File I/O | 60% | 95% | 40% | 5% |
| UI/Webviews | 40% | 70% | 30% | 30% |
| Workflows | - | 50% | 80% | 20% |

### Overall Targets

- **Unit Test Coverage:** 70% of all code
- **Integration Test Coverage:** 60% of features
- **E2E Test Coverage:** 80% of user workflows
- **Manual QA Required:** <5% of validation time

---

## Implementation Checklist

When adding a feature, ensure:

### Unit Tests ✅
- [ ] Configuration validated (package.json)
- [ ] Command registered (both places)
- [ ] Imports and dependencies present
- [ ] Error handling exists
- [ ] File structure correct

### Integration Tests ✅
- [ ] Command executes successfully
- [ ] Expected side effects occur
- [ ] UI updates (tree view, webview)
- [ ] File operations work
- [ ] Error cases handled

### E2E Tests ✅
- [ ] Complete workflow works end-to-end
- [ ] Multiple features interact correctly
- [ ] State persists across operations
- [ ] User-visible outcomes correct

### Manual QA 🔍
- [ ] Visual appearance acceptable
- [ ] Colors match theme
- [ ] Layout flows naturally
- [ ] Animations feel smooth
- [ ] Overall UX feels good

---

## Time Budgets

### Per Change Type

| Change Type | Unit Tests | Integration | E2E | Manual | Total |
|-------------|-----------|-------------|-----|--------|-------|
| Bug Fix | 5 min | 5 min | - | 1 min | 11 min |
| Small Feature | 10 min | 10 min | 5 min | 2 min | 27 min |
| Medium Feature | 20 min | 20 min | 10 min | 5 min | 55 min |
| Large Feature | 40 min | 40 min | 20 min | 10 min | 110 min |

**Note:** Writing tests first actually SAVES time by catching bugs early!

---

## CI/CD Integration

### Automated Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd vscode-extension && npm install
      - run: cd vscode-extension && npm run test:wiring
    # Runtime: ~30 seconds
    
  integration-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd vscode-extension && npm install
      - run: cd vscode-extension && npm test
    # Runtime: ~2 minutes
    
  e2e-tests:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd vscode-extension && npm install
      - run: cd vscode-extension && npm run test:e2e
    # Runtime: ~5 minutes
    
  deploy:
    needs: [unit-tests, integration-tests, e2e-tests]
    runs-on: windows-latest
    steps:
      - run: cd vscode-extension && npm run deploy
    # Only runs if all tests pass
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running unit tests..."
cd vscode-extension
npm run test:wiring

if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Commit aborted."
  exit 1
fi

echo "✅ Unit tests passed. Committing..."
```

---

## ROI: Test Automation vs Manual QA

### Time Investment

**Initial Setup:**
- Test infrastructure: 2 hours (one-time)
- First test templates: 1 hour (one-time)
- Learning curve: 2 hours (one-time)

**Per Feature:**
- Write tests: 20-40 minutes
- Manual QA: 2-5 minutes

**Total Time Per Feature:** 25-45 minutes

### Without Automation

**Per Feature:**
- Manual testing: 20-30 minutes
- Bug discovery in QA: 10-60 minutes
- Debug and fix: 20-120 minutes
- Re-test: 20-30 minutes

**Total Time Per Feature:** 70-240 minutes

### Savings

**Per Feature:** 45-195 minutes saved
**Per 10 Features:** 7.5-32.5 hours saved
**Per 100 Features:** 75-325 hours saved

**Plus:**
- ✅ Regression prevention (priceless)
- ✅ Documentation via tests (priceless)
- ✅ Confidence in deployments (priceless)
- ✅ Faster CI/CD pipeline (velocity++)

---

## Success Metrics

### How to Measure Success

**Track:**
- % of features with unit tests
- % of features with integration tests
- % of bugs caught by tests (vs. manual QA)
- Average manual QA time per feature
- Number of regressions (should be ~0)
- Time from code-complete to deployment

**Goals:**
- 90%+ features have unit tests ✅
- 70%+ features have integration tests ✅
- 95%+ bugs caught by automated tests ✅
- <5 minutes manual QA per feature ✅
- 0 regressions per release ✅
- <10 minutes code-complete to deploy ✅

---

## Summary

**Automate everything that can be automated.**
**Manual QA only for subjective UX validation.**
**Tests are not overhead - they're velocity multipliers.**

### The Promise

With 90%+ test automation:
- ✅ Features work on first try
- ✅ Regressions caught immediately
- ✅ Deployments are confident
- ✅ Manual QA is pleasant and fast
- ✅ Development velocity increases
- ✅ Technical debt decreases

**Test automation respects everyone's time.**

---

**Next Steps:**
1. Run: `npm run test:wiring` (verify unit tests work)
2. Add: Integration test templates
3. Write: One integration test per feature
4. Measure: Manual QA time reduction
5. Iterate: Continuously improve coverage

**Questions?** See `.zed/rules.md` for TDD workflow details.