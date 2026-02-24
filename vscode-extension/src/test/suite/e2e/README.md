# E2E Test Suite - Log Scout Analyzer

## 📖 Overview

This directory contains **End-to-End (E2E) tests** that validate complete user workflows from start to finish. Unlike unit or integration tests that test components in isolation, E2E tests simulate real user interactions with the VS Code extension.

## 🎯 Purpose

**Why E2E Tests?**
- ✅ Validate that features work from the user's perspective
- ✅ Catch regressions in critical workflows
- ✅ Document expected behavior through executable tests
- ✅ Build confidence before releases

**What makes these tests different?**
- They test complete user journeys (Import → Analyze → View Results → Export)
- They interact with real VS Code APIs (commands, file system, Problems Panel)
- They use actual test data (RTMT bundles, log files)
- They take longer to run (30 seconds to 2 minutes per scenario)

## 🧪 Test Scenarios

### ✅ Implemented

#### Scenario 1: Import & Analyze Bundle (`scenario1.test.ts`)
**User Story:** User imports an RTMT bundle and finds issues in their logs

**Workflow:**
1. User opens VS Code
2. User imports RTMT bundle via command
3. Extension analyzes files automatically
4. Issues appear in Problems Panel
5. User clicks issue → navigates to log line

**Success Criteria:**
- Bundle imported successfully
- Bundle visible in workspace
- Issues detected and displayed
- Navigation works correctly

**Runtime:** ~2 minutes (includes LSP analysis)

### 🚧 Planned (TODO)

#### Scenario 2: Multi-File Investigation
- Add files to existing bundle
- Re-analyze with new files
- Cross-reference issues across files

#### Scenario 3: Export Results
- Generate Markdown report
- Export JSON/CSV formats
- Attach to TAC case

#### Scenario 5: Error Recovery
- Handle corrupted archives gracefully
- Recover from LSP crashes
- Display helpful error messages

## 🚀 Running E2E Tests

### Prerequisites

1. **Workspace Required:** E2E tests need a VS Code workspace
2. **Test Data:** Ensure `test-data/` directory exists with test bundles
3. **Extension Built:** Run `npm run compile` first
4. **LSP Server:** Should be built and available

### Run All E2E Tests

```bash
cd vscode-extension
npm test -- --grep "E2E:"
```

### Run Specific Scenario

```bash
# Scenario 1 only
npm test -- --grep "E2E: Scenario 1"

# Scenario 2 only (when implemented)
npm test -- --grep "E2E: Scenario 2"
```

### Debug Tests in VS Code

1. Open test file: `e2e/scenario1.test.ts`
2. Set breakpoints where needed
3. Press `F5` or use Run & Debug panel
4. Select "Extension Tests" launch configuration

### Watch Mode (for development)

```bash
# Terminal 1: Watch for file changes
npm run watch

# Terminal 2: Re-run tests on save
npm test -- --grep "E2E:" --watch
```

## 📊 Test Output

### Successful Test Run

```
=== E2E Test Suite Setup: Scenario 1 ===
📁 Workspace root: C:\Users\...\log_scout_analyzer
📁 Test data path: C:\Users\...\test-data
✅ Extension activated
✅ E2E Test Suite Setup Complete

--- Test: Complete user workflow: Import RTMT → See issues → Navigate ---
🎬 Starting E2E Workflow Test

📋 Step 1: Verify extension commands are registered
✅ Import command available: logScoutAnalyzer.importArchive

📦 Step 2: Verify test bundle file exists
✅ Found test bundle: quick-test.zip

📥 Step 3: Import bundle (simulating user action)
✅ Import command executed
⏳ Waiting for import to complete...
✅ Import completed in 2547ms

📁 Step 4: Verify bundle created in workspace
✅ Found 1 bundle(s) in workspace
✅ Bundle metadata exists
✅ Bundle validated:
   - ID: bundle_1234567890_abc123
   - Name: quick-test
   - Files: 5

🔍 Step 5: Wait for analysis to complete
⏳ Waiting for LSP to process files...

🔍 Step 6: Verify issues appear in Problems Panel
✅ Found 12 diagnostic(s)
📊 Diagnostics found: 12
   - Errors: 3
   - Warnings: 6
   - Info: 3

🎯 Step 7: Test navigation to issue location
📍 Testing navigation to: test.log:45
✅ Navigation successful - file opened at correct line

✅ SUCCESS CRITERIA VERIFICATION:
   ✅ Bundle imported successfully
   ✅ Bundle visible in workspace file system
   ✅ Bundle metadata created correctly
   ✅ LSP processed files without errors
   ✅ Issues visible in Problems Panel
   ✅ User can navigate to issue locations

🎉 E2E Workflow Test PASSED - All success criteria met!
✅ Test passed: Complete user workflow: Import RTMT → See issues → Navigate
```

### Test Failure

When a test fails, you'll see:
- ❌ Which step failed
- Detailed error message with stack trace
- Current state of workspace/diagnostics
- Suggestions for fixing the issue

## 🐛 Troubleshooting

### Test Times Out

**Problem:** Test exceeds 2-minute timeout

**Solutions:**
- Increase timeout in test: `this.timeout(300000);` (5 minutes)
- Use smaller test bundle: `quick-test.zip` instead of full RTMT bundle
- Check if LSP server is hanging (check logs)

### No Test Data Found

**Problem:** Test skips with "test-data directory not found"

**Solution:**
```bash
# Ensure test data exists
ls ../test-data
# Should show: quick-test.zip, small-test.zip, etc.
```

### Extension Not Activating

**Problem:** Extension fails to activate in test environment

**Solution:**
- Check `package.json` activation events include `*` or relevant commands
- Verify extension builds successfully: `npm run compile`
- Check for errors in VS Code Developer Console

### No Diagnostics Appearing

**Problem:** Test completes but no issues found

**Possible Causes:**
1. **Clean Bundle:** Test bundle has no issues (this is OK!)
2. **LSP Not Running:** Check if LSP server started correctly
3. **Patterns Not Loaded:** Verify pattern files exist in LSP server

**Debug Steps:**
```typescript
// Add logging in test
console.log("LSP running:", await checkLSPRunning());
console.log("Diagnostics:", getAllDiagnosticsWithUri());
```

### File System Cleanup Issues

**Problem:** Tests fail because previous test data wasn't cleaned up

**Solution:**
- Tests should clean up in `setup()` and `teardown()`
- Manually clean workspace: `rm -rf .log-scout/bundles`
- Ensure no file watchers are holding locks

## 📝 Writing New E2E Tests

### Test Structure Template

```typescript
test("Scenario X: Description of user workflow", async function() {
  this.timeout(120000); // 2 minutes

  console.log("\n🎬 Starting Scenario X Test");

  // STEP 1: Setup/preconditions
  console.log("\n📋 Step 1: Description");
  // ... test code ...
  assert.ok(condition, "Should do something");

  // STEP 2: User action
  console.log("\n📥 Step 2: Description");
  await vscode.commands.executeCommand("some.command");
  
  // STEP 3: Verify result
  console.log("\n✅ Step 3: Verification");
  const result = await waitForSomething();
  assert.strictEqual(result, expected);

  // SUCCESS CRITERIA
  console.log("\n✅ SUCCESS CRITERIA:");
  console.log("   ✅ Criterion 1");
  console.log("   ✅ Criterion 2");
});
```

### Best Practices

1. **User-Centric:** Write tests from user perspective, not implementation details
2. **Descriptive Logging:** Add console.log for each step (helps debugging)
3. **Generous Timeouts:** E2E tests interact with real systems (LSP, file system)
4. **Clean State:** Always clean up before and after tests
5. **Realistic Data:** Use actual RTMT bundles, not mock data
6. **Assertions:** Test outcomes, not implementation details

### Helper Functions

Common helpers are in each test file:
- `cleanWorkspace()` - Remove test bundles and close editors
- `waitForBundleImport()` - Poll until bundle appears
- `getAllDiagnosticsWithUri()` - Get all Problems Panel issues
- `sleep()` - Wait for async operations

## 🎯 Success Metrics

**What makes a good E2E test?**

- ✅ **Fast enough:** < 5 minutes per scenario
- ✅ **Deterministic:** Passes consistently (not flaky)
- ✅ **Valuable:** Tests critical user workflows
- ✅ **Maintainable:** Easy to understand and update
- ✅ **Debuggable:** Clear failure messages with context

**Coverage Goals:**

| Scenario Type | Target Coverage |
|--------------|----------------|
| Critical workflows (1-5) | 100% |
| Important workflows (6-9) | 80% |
| Nice-to-have (10-12) | 50% |

## 📚 Related Documentation

- **User Scenarios:** `../../USER_SCENARIOS.md` - What users can do
- **E2E Spec:** `../../E2E_TEST_SCENARIOS.md` - Detailed test specifications
- **Scenario Docs:** `../../docs/user-scenarios/` - User journey documentation
- **Integration Tests:** `../integration/` - Component integration tests

## 🤝 Contributing

### Adding a New E2E Test

1. **Create test file:** `scenarioX.test.ts`
2. **Follow template:** Copy structure from `scenario1.test.ts`
3. **Document scenario:** Add comments explaining user workflow
4. **Run locally:** Ensure it passes on your machine
5. **Update this README:** Add scenario to "Implemented" list
6. **Update PROJECT_STATUS.md:** Mark scenario as tested

### Review Checklist

- [ ] Test follows user workflow (not implementation)
- [ ] Clear console logging at each step
- [ ] Reasonable timeouts (don't wait unnecessarily)
- [ ] Cleans up test data (workspace, files)
- [ ] Handles edge cases (no data, errors)
- [ ] Passes consistently (run 3 times)
- [ ] Documentation updated

## 🎉 Current Status

**Last Updated:** 2025-02-24

**Test Count:** 3 tests (1 main workflow + 2 edge cases)

**Coverage:**
- ✅ Scenario 1: Import & Analyze - **Implemented**
- ⏳ Scenario 2: Multi-File - Planned
- ⏳ Scenario 3: Export - Planned
- ⏳ Scenario 5: Error Recovery - Partially implemented

**Next Steps:**
1. Run Scenario 1 test and verify it passes
2. Implement Scenario 2 E2E test
3. Add CI/CD integration (run on PRs)

---

**Questions?** Check the main project documentation or open a discussion!

**Built with ❤️ for Cisco UC engineers**