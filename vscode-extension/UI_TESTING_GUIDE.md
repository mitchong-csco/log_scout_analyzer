# VS Code Extension UI Testing Guide 🧪

## Overview

This guide covers UI testing strategies for the Log Scout Analyzer VS Code extension. We use a **multi-tier testing approach** that balances speed, coverage, and maintainability.

---

## 📊 Testing Tiers

### Tier 1: Wiring Tests (Ultra-Fast) ⚡

**Purpose:** Validate configuration and code structure without launching VS Code  
**Speed:** 16ms  
**Coverage:** Configuration layer (10-20%)  
**Run Frequency:** On every file save

```bash
npm run test:wiring
```

**What they test:**
- ✅ Command registration in `package.json`
- ✅ View definitions
- ✅ Menu contributions
- ✅ File structure validation
- ✅ Naming conventions
- ✅ Code wiring (imports, registrations)

**Example:**
```typescript
test('Import Archive command should be registered', () => {
  const commands = packageJson.contributes.commands;
  const cmd = commands.find(c => c.command === 'logScoutAnalyzer.importArchive');
  assert.ok(cmd, 'Command should be defined in package.json');
});
```

**When to use:**
- ✅ TDD development cycle
- ✅ Pre-commit checks
- ✅ CI/CD pipelines
- ✅ Quick validation after changes

**Location:** `src/test/suite/wiring.test.ts`

---

### Tier 2: Integration Tests (Moderate Speed) 🔄

**Purpose:** Test actual VS Code API interactions in real Extension Host  
**Speed:** 20-30 seconds  
**Coverage:** Functional layer (50-70%)  
**Run Frequency:** Before commits, in CI

```bash
npm test
```

**What they test:**
- ✅ Command execution
- ✅ Tree view rendering
- ✅ VS Code API calls
- ✅ User interaction flows
- ✅ LSP communication
- ✅ File system operations

**Requirements:**
- Downloads VS Code (~150MB first time)
- Launches Extension Development Host
- Full access to `vscode` API

**Setup:**
```typescript
// src/test/runTest.ts
import { runTests } from '@vscode/test-electron';

await runTests({
  extensionDevelopmentPath,
  extensionTestsPath,
  launchArgs: [
    '--disable-extensions',
    testWorkspace,
    '--disable-workspace-trust'
  ]
});
```

**Example:**
```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

test('Should execute import command', async () => {
  const result = await vscode.commands.executeCommand(
    'logScoutAnalyzer.importArchive'
  );
  assert.ok(result, 'Command should return result');
});
```

**Location:** `src/test/suite/integration/`

---

### Tier 3: UI Component Tests (Targeted) 🎨

**Purpose:** Test specific UI components and interactions  
**Speed:** 5-10 seconds per suite  
**Coverage:** UI layer (30-50%)  
**Run Frequency:** When UI changes

```bash
npm run test:ui
```

**What they test:**
- ✅ Tree view items (icons, labels, tooltips)
- ✅ Context menus
- ✅ Quick picks
- ✅ Input boxes
- ✅ Progress indicators
- ✅ Status bar items
- ✅ Notifications

**Example Tests:**

#### Tree View Tests
```typescript
suite('Bundle Tree View UI', () => {
  let provider: BundleTreeProvider;
  
  setup(() => {
    provider = new BundleTreeProvider();
  });
  
  test('Should display bundle with icon', async () => {
    const items = await provider.getChildren(undefined);
    assert.ok(items.length > 0, 'Should have items');
    
    const bundle = items[0];
    assert.ok(bundle.iconPath, 'Should have icon');
    assert.ok(bundle.label, 'Should have label');
    assert.strictEqual(bundle.contextValue, 'bundle', 'Should have context value');
  });
  
  test('Should show context menu items', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(
      commands.includes('logScoutAnalyzer.bundle.delete'),
      'Delete command should be available'
    );
  });
  
  test('Should expand to show files', async () => {
    const bundles = await provider.getChildren(undefined);
    if (bundles.length > 0) {
      const files = await provider.getChildren(bundles[0]);
      assert.ok(Array.isArray(files), 'Should return files array');
    }
  });
  
  test('Should refresh on data change', (done) => {
    provider.onDidChangeTreeData(() => {
      assert.ok(true, 'Refresh event fired');
      done();
    });
    
    provider.refresh();
  });
});
```

#### Command UI Tests
```typescript
suite('Command User Interaction', () => {
  test('Should show file picker for import', async () => {
    let pickerShown = false;
    const original = vscode.window.showOpenDialog;
    
    vscode.window.showOpenDialog = async (options) => {
      pickerShown = true;
      assert.ok(options?.filters?.['Archives'], 'Should filter archives');
      return undefined; // User cancelled
    };
    
    try {
      await vscode.commands.executeCommand('logScoutAnalyzer.importArchive');
      assert.ok(pickerShown, 'File picker should be shown');
    } finally {
      vscode.window.showOpenDialog = original;
    }
  });
  
  test('Should show warning when no file open', async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    
    let warningShown = false;
    const original = vscode.window.showWarningMessage;
    
    vscode.window.showWarningMessage = async (msg: string) => {
      warningShown = true;
      assert.ok(msg.includes('No file'), 'Should mention no file');
      return undefined;
    };
    
    try {
      await vscode.commands.executeCommand('logScoutAnalyzer.bundle.addCurrentFile');
      assert.ok(warningShown, 'Warning should be shown');
    } finally {
      vscode.window.showWarningMessage = original;
    }
  });
  
  test('Should prompt for bundle name', async () => {
    let inputShown = false;
    const original = vscode.window.showInputBox;
    
    vscode.window.showInputBox = async (options) => {
      inputShown = true;
      assert.ok(options?.prompt, 'Should have prompt');
      return 'Test Bundle';
    };
    
    try {
      await vscode.commands.executeCommand('logScoutAnalyzer.bundle.create');
      assert.ok(inputShown, 'Input should be shown');
    } finally {
      vscode.window.showInputBox = original;
    }
  });
});
```

#### Progress Indicator Tests
```typescript
suite('Progress Indicators', () => {
  test('Should show progress during import', async () => {
    let progressShown = false;
    const original = vscode.window.withProgress;
    
    vscode.window.withProgress = async (options, task) => {
      progressShown = true;
      assert.ok(options.title, 'Should have title');
      assert.ok(options.location, 'Should have location');
      return task({ report: () => {} }, new vscode.CancellationTokenSource().token);
    };
    
    try {
      // Trigger operation that shows progress
      await vscode.commands.executeCommand('logScoutAnalyzer.importArchive');
      assert.ok(progressShown, 'Progress should be shown');
    } finally {
      vscode.window.withProgress = original;
    }
  });
});
```

**Location:** `src/test/suite/ui/`

---

### Tier 4: Manual E2E Tests (Exploratory) 👤

**Purpose:** Catch visual and UX issues automation misses  
**Speed:** 5-10 minutes  
**Coverage:** User experience validation  
**Run Frequency:** Before releases

**Checklist:**

#### Import Workflow
- [ ] Open VS Code with extension installed
- [ ] Click "Import Archive" in Command Palette
- [ ] Select test archive (QCSONE, generic ZIP)
- [ ] Verify progress indicator shows
- [ ] Verify bundle appears in tree view
- [ ] Verify case ID detected (if applicable)
- [ ] Verify files listed under bundle
- [ ] Click on log file - should open in editor
- [ ] Verify LSP diagnostics appear

#### Add Current File Workflow
- [ ] Open a `.log` file in editor
- [ ] Run "Add Current File to Bundle"
- [ ] Should show quick pick of bundles
- [ ] Select bundle or "Create New Bundle"
- [ ] Verify file added to bundle
- [ ] Verify tree view refreshes
- [ ] Verify success notification

#### Tree View Interactions
- [ ] Expand/collapse bundles
- [ ] Right-click bundle - verify context menu
- [ ] Delete bundle - should prompt for confirmation
- [ ] Rename bundle - should show input box
- [ ] Refresh tree view - should update
- [ ] Verify icons display correctly
- [ ] Verify tooltips show on hover

#### Webview Panels
- [ ] Open Console panel
- [ ] Verify logs display
- [ ] Verify filtering works
- [ ] Verify search works
- [ ] Verify panel persists on reload
- [ ] Open Analyzer panel
- [ ] Verify patterns display
- [ ] Verify charts render

#### Error Handling
- [ ] Try importing invalid archive
- [ ] Try importing corrupted ZIP
- [ ] Try adding non-log file to bundle
- [ ] Verify error messages are user-friendly
- [ ] Verify extension doesn't crash

**Documentation:** `MANUAL_TESTING_CHECKLIST.md`

---

## 🎯 What to Test Where

| Feature | Wiring | Integration | UI Component | Manual |
|---------|--------|-------------|--------------|--------|
| Command registered | ✅ | | | |
| Command executes | | ✅ | | |
| File picker shows | | ✅ | ✅ | ✅ |
| Tree item renders | | ✅ | ✅ | ✅ |
| Icon displays | ✅ | | ✅ | ✅ |
| Context menu works | | ✅ | ✅ | ✅ |
| Progress indicator | | ✅ | ✅ | ✅ |
| Error messages | | ✅ | ✅ | ✅ |
| LSP communication | | ✅ | | ✅ |
| Visual appearance | | | | ✅ |
| User experience | | | | ✅ |

---

## 🚀 Getting Started

### 1. Run Wiring Tests (Start Here)

```bash
# Fast validation - run constantly
npm run test:wiring
```

**Expected output:**
```
Extension Wiring Validation
  ✔ Should have correct command registration
  ✔ Import Archive command should be registered
  ✔ No Scout commands should have duplicate prefix
  ...
  
24 passing (16ms)
```

### 2. Run Integration Tests

```bash
# First time: Downloads VS Code (~150MB)
npm test
```

**First run:**
```
Downloading VS Code 1.85.0 from https://...
Extracting...
Running tests in Extension Development Host...
```

**Subsequent runs:**
```
Using cached VS Code 1.85.0
Running tests...

Bundle Import Integration Tests
  ✔ Should complete QCSONE import workflow (2.5s)
  ✔ Should handle generic ZIP import (1.8s)
  ✔ Should update tree view after import (0.5s)
  
All tests passed!
```

### 3. Add Your Own Tests

#### Create UI Test File
```bash
# Create new test file
touch src/test/suite/ui/myFeature.test.ts
```

#### Template
```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Feature Tests', () => {
  test('Should do something', async () => {
    // Arrange
    const testData = { ... };
    
    // Act
    const result = await vscode.commands.executeCommand('myCommand');
    
    // Assert
    assert.ok(result, 'Should return result');
  });
});
```

#### Run Your Tests
```bash
npm run compile
npm test
```

---

## 🔧 Testing Patterns & Best Practices

### Pattern 1: Mocking VS Code APIs

```typescript
suite('Command with Dialog', () => {
  test('Should show file picker', async () => {
    // Save original
    const original = vscode.window.showOpenDialog;
    
    // Mock
    let called = false;
    vscode.window.showOpenDialog = async (options) => {
      called = true;
      return [vscode.Uri.file('/test/file.zip')];
    };
    
    try {
      // Test
      await vscode.commands.executeCommand('myCommand');
      assert.ok(called, 'Dialog should be shown');
    } finally {
      // Restore
      vscode.window.showOpenDialog = original;
    }
  });
});
```

### Pattern 2: Testing Tree Views

```typescript
suite('Tree View Provider', () => {
  let provider: MyTreeProvider;
  
  setup(() => {
    provider = new MyTreeProvider();
  });
  
  teardown(() => {
    provider.dispose();
  });
  
  test('Should return root items', async () => {
    const items = await provider.getChildren(undefined);
    assert.ok(Array.isArray(items), 'Should return array');
  });
  
  test('Should return child items', async () => {
    const roots = await provider.getChildren(undefined);
    if (roots.length > 0) {
      const children = await provider.getChildren(roots[0]);
      assert.ok(children, 'Should return children');
    }
  });
});
```

### Pattern 3: Testing Commands with Async Operations

```typescript
suite('Async Command Tests', () => {
  test('Should complete async operation', async function() {
    this.timeout(5000); // Increase timeout for async operations
    
    const result = await vscode.commands.executeCommand(
      'myAsyncCommand'
    );
    
    // Wait for operation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    assert.ok(result, 'Should return result');
  });
});
```

### Pattern 4: Testing with Test Workspace

```typescript
suite('File Operations', () => {
  test('Should open test file', async () => {
    const testFile = path.join(__dirname, '../../../test-data/test.log');
    
    const doc = await vscode.workspace.openTextDocument(testFile);
    assert.ok(doc, 'Should open document');
    
    const editor = await vscode.window.showTextDocument(doc);
    assert.ok(editor, 'Should show editor');
    
    // Cleanup
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
```

### Pattern 5: Testing Events

```typescript
suite('Event Tests', () => {
  test('Should fire refresh event', (done) => {
    const provider = new MyTreeProvider();
    
    provider.onDidChangeTreeData(() => {
      assert.ok(true, 'Event fired');
      done(); // Signal test completion
    });
    
    provider.refresh(); // Trigger event
  });
  
  test('Should fire event with timeout', function(done) {
    this.timeout(5000);
    
    const provider = new MyTreeProvider();
    
    provider.onDidChangeTreeData(() => {
      done();
    });
    
    setTimeout(() => provider.refresh(), 100);
  });
});
```

---

## 🐛 Debugging Tests

### Debug in VS Code

1. Open `.vscode/launch.json`
2. Use "Extension Tests" configuration
3. Set breakpoints in test files
4. Press F5 to start debugging

```json
{
  "name": "Extension Tests",
  "type": "extensionHost",
  "request": "launch",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
  ],
  "outFiles": ["${workspaceFolder}/out/test/**/*.js"],
  "preLaunchTask": "Compile Extension"
}
```

### Debug Output

```typescript
test('Debug test', async () => {
  console.log('Test started'); // Shows in Debug Console
  
  const result = await myFunction();
  console.log('Result:', result);
  
  assert.ok(result);
});
```

### Common Issues

#### Issue: Tests timeout
**Solution:** Increase timeout
```typescript
test('Long running test', async function() {
  this.timeout(10000); // 10 seconds
  // ...
});
```

#### Issue: VS Code API not available
**Solution:** Check if running in Extension Host
```typescript
test('Should use VS Code API', async function() {
  if (typeof vscode === 'undefined') {
    this.skip(); // Skip if not in Extension Host
    return;
  }
  // Test code
});
```

#### Issue: Test fails intermittently
**Solution:** Add proper waits
```typescript
test('Should update UI', async () => {
  await vscode.commands.executeCommand('myCommand');
  
  // Wait for UI to update
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Now check results
  assert.ok(condition);
});
```

---

## 📦 Webview Testing

Webviews are isolated and harder to test. Two approaches:

### Approach 1: Test Message Passing

```typescript
suite('Webview Messages', () => {
  test('Should create valid message', () => {
    const message = {
      type: 'update',
      data: { logs: [] }
    };
    
    assert.strictEqual(message.type, 'update');
    assert.ok(message.data);
  });
  
  test('Should serialize state', () => {
    const state = { scrollPosition: 100 };
    const serialized = JSON.stringify(state);
    const parsed = JSON.parse(serialized);
    
    assert.deepStrictEqual(parsed, state);
  });
});
```

### Approach 2: Separate Webview Tests

Extract webview TypeScript into separate package:

```bash
# In webview-src/
npm install --save-dev vitest @testing-library/dom
```

```typescript
// webview-src/test/console.test.ts
import { describe, it, expect } from 'vitest';

describe('Console Logic', () => {
  it('should format logs', () => {
    const log = { level: 'ERROR', message: 'Test' };
    const formatted = formatLog(log);
    expect(formatted).toContain('ERROR');
  });
});
```

---

## 🎓 Testing Strategies by Component

### Commands
- ✅ Wiring: Command registered
- ✅ Integration: Command executes
- ✅ UI: User prompts shown
- ✅ Manual: End-to-end flow

### Tree Views
- ✅ Wiring: View registered
- ✅ Integration: Items returned
- ✅ UI: Icons, labels, tooltips
- ✅ Manual: Expand/collapse, context menus

### Webviews
- ✅ Integration: Panel creation
- ✅ UI: Message passing
- ✅ Manual: Visual appearance, interactions

### LSP Integration
- ✅ Wiring: Client configuration
- ✅ Integration: Request/response
- ✅ Manual: Diagnostics, completions

### Status Bar Items
- ✅ Integration: Item created
- ✅ UI: Click handler
- ✅ Manual: Appearance

---

## 📊 Coverage Goals

| Component | Target Coverage | Current |
|-----------|----------------|---------|
| Configuration | 100% | 92% ✅ |
| Commands | 80% | 45% ⚠️ |
| Tree Views | 70% | 30% ⚠️ |
| LSP Client | 60% | 20% ⚠️ |
| UI Components | 50% | 10% ⚠️ |
| Webviews | 40% | 5% ⚠️ |

---

## 🚦 CI/CD Integration

### GitHub Actions Example

```yaml
name: Extension Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd vscode-extension
          npm install
      
      - name: Run wiring tests
        run: |
          cd vscode-extension
          npm run test:wiring
      
      - name: Run integration tests (Linux)
        if: runner.os == 'Linux'
        run: |
          cd vscode-extension
          xvfb-run -a npm test
      
      - name: Run integration tests (Windows/Mac)
        if: runner.os != 'Linux'
        run: |
          cd vscode-extension
          npm test
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

cd vscode-extension

echo "Running wiring tests..."
npm run test:wiring

if [ $? -ne 0 ]; then
  echo "❌ Wiring tests failed. Commit aborted."
  exit 1
fi

echo "✅ All tests passed!"
```

---

## 📚 Resources

### VS Code Testing Documentation
- [Official Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)

### Our Documentation
- `WIRING_TESTS.md` - Wiring test documentation
- `PROJECT_STATUS.md` - Current test status
- `.zed/AI_ASSISTANT_GUIDE.md` - TDD workflow

### Test Frameworks
- [Mocha](https://mochajs.org/) - Test framework (what we use)
- [Node Assert](https://nodejs.org/api/assert.html) - Assertion library

---

## 🎯 Quick Reference

### Run Tests
```bash
npm run test:wiring        # Fast wiring tests (16ms)
npm test                   # Integration tests (30s)
npm run test:ui            # UI component tests (future)
npm run test:coverage      # With coverage report
```

### Create Tests
```bash
# Wiring test (no VS Code)
touch src/test/suite/myFeature.wiring.test.ts

# Integration test (with VS Code)
touch src/test/suite/integration/myFeature.test.ts

# UI test (focused on UI)
touch src/test/suite/ui/myComponent.test.ts
```

### Debug Tests
1. Open test file
2. Set breakpoint
3. Use "Extension Tests" launch config
4. Press F5

### Common Commands
```typescript
// Execute command
await vscode.commands.executeCommand('myCommand');

// Get all commands
const commands = await vscode.commands.getCommands();

// Mock dialog
const original = vscode.window.showOpenDialog;
vscode.window.showOpenDialog = async (opts) => { ... };
// ... test ...
vscode.window.showOpenDialog = original;
```

---

## ✅ Success Criteria

Extension UI testing is complete when:

- ✅ 90%+ wiring tests pass
- ✅ 70%+ integration tests pass
- ✅ All critical commands have tests
- ✅ Tree views have UI tests
- ✅ Error handling is tested
- ✅ Manual checklist exists
- ✅ Tests run in CI/CD
- ✅ Documentation is complete

---

## 🎉 Next Steps

1. **Run existing tests:** `npm run test:wiring`
2. **Set up integration tests:** Create `runTest.ts` (see above)
3. **Add UI component tests:** Start with tree views
4. **Create manual checklist:** Document manual test scenarios
5. **Configure CI/CD:** Add tests to GitHub Actions
6. **Measure coverage:** Set up nyc/istanbul
7. **Iterate:** Add tests as you add features

---

**Questions?** Check `PROJECT_STATUS.md` or ask in team chat!

**Found a testing pattern that works well?** Document it here for the team!

🚀 **Happy Testing!**