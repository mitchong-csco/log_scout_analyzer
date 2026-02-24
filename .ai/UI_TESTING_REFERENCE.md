# UI Testing Quick Reference for AI Assistants 🧪

**Purpose**: Quick guide for AI assistants working on VS Code extension UI  
**Location**: `.zed/UI_TESTING_REFERENCE.md`  
**Last Updated**: February 21, 2024

---

## ✅ Status: UI Testing Infrastructure OPERATIONAL

**Test Results** (Verified Feb 21, 2024):
```
✅ 78/81 tests passing (96% pass rate)
✅ VS Code Extension Host launches successfully
✅ Full vscode API accessible in tests
✅ Ready for TDD workflow on UI features
```

---

## 🚀 Quick Start for AI Assistants

### When Working on VS Code Extension UI:

**1. Read This First** (before coding):
```
Priority 1: PROJECT_STATUS.md - Current test status
Priority 2: vscode-extension/UI_TESTING_GUIDE.md - Comprehensive guide
Priority 3: This file - Quick patterns and commands
```

**2. Testing Workflow**:
```
1. Write wiring test → npm run test:wiring (8ms)
2. Write UI test → npm run compile && npm test (30s)
3. Code feature → Tests pass ✅
```

**3. Three-Tier Strategy**:
- **Tier 1**: Wiring tests (8ms) - No VS Code, config validation
- **Tier 2**: Integration tests (30s) - Full VS Code, API access
- **Tier 3**: Manual checklist (5min) - Human UX validation

---

## 📁 File Locations

### Documentation (READ THESE!)
```
vscode-extension/UI_TESTING_GUIDE.md              ← Start here (882 lines)
vscode-extension/UI_TESTING_RECOMMENDATIONS.md    ← Action plan (650 lines)
vscode-extension/UI_TESTING_QUICK_REF.md          ← Quick reference (500 lines)
vscode-extension/TESTING_APPROACHES_COMPARISON.md ← Strategy comparison (676 lines)
```

### Test Infrastructure
```
src/test/runTest.ts                    ← Integration test orchestrator ✅
src/test/suite/index.ts                ← Test runner
src/test/suite/wiring.test.ts          ← Wiring tests (24 passing)
src/test/suite/ui/                     ← UI component tests
  ├── treeView.test.ts                 ← Tree view examples (367 lines)
  └── commands.test.ts                 ← Command examples (558 lines)
src/test/suite/integration/            ← Integration tests
  ├── bundleImport.test.ts             ← Bundle import workflows
  └── addCurrentFileIntegration.test.ts ← Add file workflows
```

---

## 🎯 Common Patterns (Copy-Paste Ready!)

### Pattern 1: Wiring Test (Fast - 8ms)
```typescript
// src/test/suite/wiring.test.ts or myFeature.test.ts
test('Command should be registered in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const cmd = pkg.contributes.commands.find(
    c => c.command === 'logScoutAnalyzer.myCommand'
  );
  assert.ok(cmd, 'Command should be defined');
});
```

### Pattern 2: Mock File Picker
```typescript
// src/test/suite/ui/commands.test.ts
test('Should show file picker', async () => {
  const original = vscode.window.showOpenDialog;
  vscode.window.showOpenDialog = async (options) => {
    assert.ok(options?.filters, 'Should have file filters');
    return [vscode.Uri.file('/test/file.zip')];
  };
  
  try {
    await vscode.commands.executeCommand('logScoutAnalyzer.myCommand');
    // Assertions
  } finally {
    vscode.window.showOpenDialog = original; // ALWAYS restore!
  }
});
```

### Pattern 3: Mock Warning Message
```typescript
test('Should show warning when invalid', async () => {
  let warningShown = false;
  let warningText = '';
  const original = vscode.window.showWarningMessage;
  
  vscode.window.showWarningMessage = async (message: string) => {
    warningShown = true;
    warningText = message;
    return undefined;
  };
  
  try {
    await vscode.commands.executeCommand('logScoutAnalyzer.myCommand');
    assert.ok(warningShown, 'Should show warning');
    assert.ok(warningText.includes('invalid'), 'Should mention invalid');
  } finally {
    vscode.window.showWarningMessage = original;
  }
});
```

### Pattern 4: Test Tree View
```typescript
// src/test/suite/ui/treeView.test.ts
test('Should return tree items', async () => {
  const provider = new MyTreeProvider();
  const items = await provider.getChildren(undefined);
  
  assert.ok(Array.isArray(items), 'Should return array');
  assert.ok(items[0].label, 'Should have label');
  assert.ok(items[0].iconPath, 'Should have icon');
  assert.ok(items[0].contextValue, 'Should have context value');
});
```

### Pattern 5: Test Async Operations
```typescript
test('Long operation', async function() {
  this.timeout(5000); // IMPORTANT: Increase timeout for async
  
  const result = await myAsyncOperation();
  
  // Wait for side effects if needed
  await new Promise(resolve => setTimeout(resolve, 500));
  
  assert.ok(result, 'Should complete');
});
```

### Pattern 6: Test Events
```typescript
test('Should fire refresh event', (done) => {
  const provider = new MyTreeProvider();
  
  provider.onDidChangeTreeData(() => {
    assert.ok(true, 'Event fired');
    done(); // Signal completion
  });
  
  provider.refresh(); // Trigger event
});
```

---

## 🔧 Commands Reference

### Running Tests
```bash
# Fast wiring tests (8ms)
cd vscode-extension
npm run test:wiring

# Integration tests (30s - launches VS Code)
npm run compile
npm test

# Or combined
npm run compile && npm test

# Watch mode (auto-compile on changes)
npm run watch
```

### Debugging Tests
```
1. Open test file in VS Code
2. Set breakpoint (click line number)
3. Press F5 → Select "Extension Tests"
4. Debugger launches Extension Development Host
5. Breakpoint hits, full debugging available
```

### Creating New Tests
```bash
# Wiring test (no VS Code needed)
touch src/test/suite/myFeature.test.ts

# UI component test
touch src/test/suite/ui/myComponent.test.ts

# Integration test
touch src/test/suite/integration/myWorkflow.test.ts
```

---

## ✅ Checklist for AI Assistants

### Before Writing Code:
- [ ] Read PROJECT_STATUS.md for current test status
- [ ] Check vscode-extension/UI_TESTING_GUIDE.md for patterns
- [ ] Identify which tier of testing needed (wiring/integration/manual)

### When Adding UI Feature:
- [ ] Write wiring test first (validates package.json)
- [ ] Run `npm run test:wiring` (should fail - RED)
- [ ] Write UI component test (mocks dialogs/interactions)
- [ ] Run `npm test` (should fail - RED)
- [ ] Implement feature
- [ ] Run tests (should pass - GREEN)
- [ ] Verify in PROJECT_STATUS.md that tests pass

### After Completing Feature:
- [ ] All tests passing (wiring + integration)
- [ ] Update PROJECT_STATUS.md if significant change
- [ ] Document any new patterns in test files
- [ ] Commit with test coverage

---

## 🚨 Common Issues & Solutions

### Issue: "Cannot find module 'vscode'"
```bash
# In VS Code extension directory
npm install
npm run compile
```

### Issue: "Tests timeout"
```typescript
test('Long test', async function() {
  this.timeout(10000); // 10 seconds (default is 2s)
  // ...
});
```

### Issue: "VS Code not found"
```bash
# Delete cache and retry
rm -rf ~/.vscode-test  # Mac/Linux
# Or delete C:\Users\<you>\.vscode-test  # Windows
npm test
```

### Issue: "Forgot to restore mock"
```typescript
// WRONG - Memory leak!
test('Test', async () => {
  vscode.window.showOpenDialog = async () => { ... };
  // Forgot to restore!
});

// RIGHT - Always restore
test('Test', async () => {
  const original = vscode.window.showOpenDialog;
  vscode.window.showOpenDialog = async () => { ... };
  try {
    // Test code
  } finally {
    vscode.window.showOpenDialog = original; // ✅ Restored
  }
});
```

---

## 📊 Test Status Summary (Feb 21, 2024)

```
Component                Status        Tests   Pass Rate
─────────────────────────────────────────────────────────
Wiring Tests             ✅ Working    24/26   92%
Integration Tests        ✅ Working    54/55   98%
VS Code Extension Host   ✅ Working    -       100%
UI Component Examples    ✅ Ready      -       -
Infrastructure           ✅ Complete   -       100%
─────────────────────────────────────────────────────────
Overall                  ✅ Ready      78/81   96%
```

**Known Issues** (3 failures):
1. ❌ scout-bundles view config (package.json issue)
2. ❌ importArchive command registration (extension.ts issue)
3. ❌ LSP test error handling (test needs update)

**These are pre-existing code issues, NOT infrastructure problems!**

---

## 💡 Best Practices for AI Assistants

### DO ✅
- ✅ Write wiring test first (fastest feedback)
- ✅ Use example tests as templates
- ✅ Mock VS Code APIs at boundaries
- ✅ Always restore mocks in finally block
- ✅ Increase timeouts for async operations
- ✅ Test error cases, not just happy paths
- ✅ Update PROJECT_STATUS.md after changes

### DON'T ❌
- ❌ Test VS Code internals (not your code)
- ❌ Skip wiring tests (they're fast!)
- ❌ Forget to restore mocks (memory leaks)
- ❌ Hardcode file paths (use __dirname)
- ❌ Test too much in one test (one assertion)
- ❌ Ignore test failures (fix or document)

---

## 🎯 Decision Tree for AI Assistants

**What are you testing?**

→ **Configuration/Command Registration?**
  ✅ Use Wiring Tests (8ms, no VS Code)
  📄 Add to `src/test/suite/wiring.test.ts`

→ **Command Execution?**
  ✅ Use Integration Tests (30s, with VS Code)
  📄 Add to `src/test/suite/integration/`

→ **User Dialog (file picker, input, etc.)?**
  ✅ Use UI Component Tests (mock APIs)
  📄 Add to `src/test/suite/ui/commands.test.ts`

→ **Tree View Rendering?**
  ✅ Use UI Component Tests
  📄 Add to `src/test/suite/ui/treeView.test.ts`

→ **Complete Workflow (end-to-end)?**
  ✅ Use Integration Tests + Manual
  📄 Integration: `src/test/suite/integration/`
  📄 Manual: Create checklist in docs

→ **Visual Appearance?**
  ✅ Manual Testing Only
  📄 Create checklist, human validates

---

## 🔗 Related Documentation

**In This Project:**
- `PROJECT_STATUS.md` - Current status, test results
- `vscode-extension/UI_TESTING_GUIDE.md` - Comprehensive guide
- `vscode-extension/UI_TESTING_RECOMMENDATIONS.md` - Actionable roadmap
- `vscode-extension/UI_TESTING_QUICK_REF.md` - Quick reference
- `vscode-extension/WIRING_TESTS.md` - Existing wiring tests doc
- `.zed/rules.md` - TDD enforcement rules
- `.zed/AI_ASSISTANT_GUIDE.md` - General AI guide

**External:**
- [VS Code Testing Docs](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [@vscode/test-electron](https://github.com/microsoft/vscode-test)

---

## 🎉 Summary

**Status**: ✅ UI Testing Infrastructure 100% Operational

**What You Have:**
- ✅ Integration test orchestrator (runTest.ts)
- ✅ Example UI tests (925 lines)
- ✅ Comprehensive documentation (2,500+ lines)
- ✅ Verified test run (78/81 passing)
- ✅ VS Code Extension Host working
- ✅ Full `vscode` API access

**What You Can Do:**
- ✅ Write wiring tests (8ms feedback)
- ✅ Write UI component tests (30s feedback)
- ✅ Write integration tests (full workflow)
- ✅ Debug tests with VS Code debugger
- ✅ TDD workflow for UI features

**Time Savings:**
- Wiring tests: 8ms (instant feedback!)
- Integration tests: 30s (after initial setup)
- Manual testing: Reduced by automation

**Ready to build UI with full test coverage!** 🚀

---

**Questions?**
1. Check `vscode-extension/UI_TESTING_GUIDE.md` (comprehensive)
2. Check `vscode-extension/UI_TESTING_QUICK_REF.md` (quick patterns)
3. Check `PROJECT_STATUS.md` (current status)
4. Check example tests in `src/test/suite/ui/`

**Happy Testing!** 🧪✨