# Development Workflow Guide 🚀

## Quick Start: Feature Development in 5 Steps

```bash
1. git checkout -b feature/my-feature     # Create branch
2. # Plan tests (5 min) - fill planning template
3. # Write tests FIRST (RED phase)
4. # Write code (GREEN phase)
5. # Commit, test, deploy
```

**Total time for small feature: 30-60 minutes**

---

## Complete Workflow

### Phase 0: Planning (5 minutes)

**Before writing ANY code:**

```bash
# 1. Create feature branch
git checkout -b feature/import-progress
git push -u origin feature/import-progress

# 2. Document feature
# Edit docs/FEATURES.md - add feature entry
# Use template from .zed/PLANNING_TEMPLATES.md

# 3. Plan test scenarios
# Answer these questions:
# - What is the happy path?
# - What are 3 error cases?
# - What are 2 edge cases?
# - What requires unit vs integration tests?
# - What needs manual QA? (should be <5%)
```

**Output:**
- Feature branch created
- Feature documented in docs/FEATURES.md
- Test scenarios defined
- Acceptance criteria clear

---

### Phase 1: Write Tests (RED Phase)

**Goal: Failing tests that define success**

```bash
# Navigate to extension directory
cd vscode-extension

# Create test file
touch src/test/suite/import-progress.test.ts
```

**Write tests that FAIL:**

```typescript
// src/test/suite/import-progress.test.ts
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Import Progress Indicator', () => {
  let extensionTs: string;
  
  suiteSetup(() => {
    const extensionPath = path.resolve(__dirname, '../../../src/extension.ts');
    extensionTs = fs.readFileSync(extensionPath, 'utf8');
  });

  test('Import command uses withProgress', () => {
    assert.ok(
      extensionTs.includes('withProgress'),
      'Import should show progress notification'
    );
  });

  test('Progress shows in notification area', () => {
    assert.ok(
      extensionTs.includes('ProgressLocation.Notification'),
      'Progress should appear in notification'
    );
  });

  test('Progress reports status updates', () => {
    assert.ok(
      extensionTs.includes('progress.report'),
      'Progress should report status'
    );
  });
});
```

**Run tests (should FAIL):**

```bash
npm run compile
npm run test:wiring

# Expected:
# ❌ Import command uses withProgress - FAIL
# ❌ Progress shows in notification area - FAIL
# ❌ Progress reports status updates - FAIL
```

**Commit the failing tests:**

```bash
git add src/test/suite/import-progress.test.ts
git commit -m "test(import): add progress indicator test scenarios

- Test for withProgress usage
- Test for notification location
- Test for progress reporting
- All tests currently failing (RED phase)"
```

---

### Phase 2: Implement Code (GREEN Phase)

**Goal: Minimal code to make tests pass**

```typescript
// src/extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand(
    "logScoutAnalyzer.importArchive",
    async () => {
      if (!bundleTreeProvider) {
        vscode.window.showErrorMessage("Bundle tree provider not initialized");
        return;
      }

      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { Archives: ["zip", "tar", "gz", "tgz"] },
        title: "Select Log Archive to Import",
      });

      if (result && result.length > 0) {
        const archivePath = result[0].fsPath;
        
        // NEW: Add progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Importing Archive",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "Starting import..." });
            outputChannel?.appendLine(`Importing: ${archivePath}`);

            try {
              await bundleTreeProvider.importPackage(archivePath);
              progress.report({ message: "Complete!" });
              outputChannel?.appendLine("✓ Import completed");
            } catch (error) {
              outputChannel?.appendLine(`✗ Import failed: ${error}`);
              throw error;
            }
          }
        );
      }
    }
  )
);
```

**Compile and test:**

```bash
npm run compile
npm run test:wiring

# Expected:
# ✅ Import command uses withProgress - PASS
# ✅ Progress shows in notification area - PASS
# ✅ Progress reports status updates - PASS
#
# 27 passing (18ms)
```

**Commit the implementation:**

```bash
git add src/extension.ts
git commit -m "feat(import): add progress indicator

- Show progress notification during import
- Report status: starting, complete
- Auto-dismiss on completion

Tests: 27/27 passing"
```

---

### Phase 3: Refactor (GREEN Phase)

**Goal: Improve code while keeping tests green**

```typescript
// Extract progress logic to separate function
async function importWithProgress(
  archivePath: string,
  provider: BundleTreeProvider,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Importing Archive",
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: "Starting import..." });
      outputChannel.appendLine(`Importing: ${archivePath}`);

      try {
        await provider.importPackage(archivePath);
        progress.report({ message: "Complete!" });
        outputChannel.appendLine("✓ Import completed");
      } catch (error) {
        outputChannel.appendLine(`✗ Import failed: ${error}`);
        throw error;
      }
    }
  );
}
```

**Test after refactor:**

```bash
npm run test:wiring

# Expected:
# ✅ All 27 tests still passing
```

**Commit refactor:**

```bash
git add src/extension.ts
git commit -m "refactor(import): extract progress logic

- Moved progress indicator to separate function
- Improved code organization
- No behavioral changes

Tests: 27/27 passing"
```

---

### Phase 4: Documentation (Required)

**Update feature documentation:**

```markdown
<!-- docs/FEATURES.md -->

## Feature: Import Progress Indicator

### Overview
Shows real-time progress during archive import operations.

### Usage
1. Open Command Palette (Ctrl+Shift+P)
2. Type "Scout: Import Log Archive"
3. Select archive file
4. Progress notification appears automatically

### Expected Behavior
- Notification shows: "Importing Archive"
- Status updates: "Starting import...", "Complete!"
- Auto-dismisses on success
- Error shown if import fails

### Testing
```bash
npm run test:wiring -- --grep "Import Progress"
```

**Test Coverage:**
- Unit tests: 3/3 passing
- Manual QA: <1 minute (visual verification)

### Implementation Details
- File: `src/extension.ts`
- Tests: `src/test/suite/import-progress.test.ts`
- API: `vscode.window.withProgress`
```

**Commit documentation:**

```bash
git add docs/FEATURES.md
git commit -m "docs(import): document progress indicator feature

- Added usage instructions
- Added expected behavior
- Added testing information"
```

---

### Phase 5: Integration Testing (If Needed)

**Add integration tests for runtime behavior:**

```typescript
// src/test/suite/import-progress.integration.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Import Progress Integration', () => {
  test('Command executes with progress', async function() {
    this.timeout(10000);
    
    // This would require mocking file picker
    // and testing actual command execution
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('logScoutAnalyzer.importArchive'));
  });
});
```

**Run integration tests:**

```bash
npm test

# Expected:
# Integration tests pass
# Takes 2-5 seconds
```

---

### Phase 6: Pre-Commit Verification

**Run full test suite:**

```bash
# 1. Unit tests (fast)
npm run test:wiring
# ✅ 27/27 passing (18ms)

# 2. Compile check
npm run compile
# ✅ Compilation successful

# 3. Lint check
npm run lint
# ✅ No linting errors

# 4. Integration tests (if added)
npm test
# ✅ Integration tests pass

# 5. Review changes
git status
git diff
```

**Create comprehensive commit:**

```bash
git add .
git commit -m "feat(import): complete progress indicator implementation

Summary:
- Added progress notification during import
- Shows status updates in real-time
- Auto-dismisses on completion
- Graceful error handling

Tests:
- Unit tests: 27/27 passing (18ms)
- Integration tests: N/A
- Test coverage: 100% of new code
- Manual QA: <1 minute

Documentation:
- Added to docs/FEATURES.md
- Usage examples included
- Testing instructions provided

Breaking Changes: None
Backward Compatible: Yes"
```

---

### Phase 7: Push and Create PR

**Push to remote:**

```bash
git push origin feature/import-progress
```

**Create Pull Request with template:**

```markdown
## Feature: Import Progress Indicator

### Description
Adds real-time progress notification during archive import operations.

### Motivation
Users had no feedback during long import operations, leading to confusion
about whether the import was working or stuck.

### Changes
- Added `vscode.window.withProgress` to import command
- Shows notification with status updates
- Auto-dismisses on completion
- Error handling for failures

### Testing

**Automated Tests:**
- ✅ Unit tests: 27/27 passing (18ms)
- ✅ All tests green: No regressions
- ✅ Test coverage: 100% of new code

**Test Execution:**
```bash
npm run test:wiring -- --grep "Import Progress"
```

**Manual QA Checklist:**
- [ ] Progress notification appears on import
- [ ] Status messages update correctly
- [ ] Notification dismisses on success
- [ ] Error shown on failure
- [ ] Visual styling matches VS Code theme

**Estimated Manual QA Time:** <2 minutes

### Documentation
- ✅ Feature documented in docs/FEATURES.md
- ✅ Usage examples provided
- ✅ Testing instructions included

### Breaking Changes
None - This is a purely additive feature

### Backward Compatibility
Yes - Fully backward compatible

### Screenshots
[If applicable, add screenshots showing progress notification]

### Checklist
- [x] Tests written before code (TDD)
- [x] All tests passing
- [x] Code documented
- [x] Feature documented in docs/FEATURES.md
- [x] No breaking changes
- [x] Ready for review
```

---

### Phase 8: Code Review & Merge

**After PR approval:**

```bash
# 1. Ensure branch is up to date
git checkout feature/import-progress
git pull origin main
git rebase main

# 2. Resolve any conflicts
git mergetool
npm run test:wiring  # Verify still passing

# 3. Merge to main
git checkout main
git merge --no-ff feature/import-progress
git push origin main

# 4. Tag release (optional)
git tag -a v0.0.173 -m "Release: Import progress indicator"
git push origin v0.0.173

# 5. Clean up branch (optional)
git branch -d feature/import-progress
git push origin --delete feature/import-progress
```

---

## Optimization Strategies

### Fast Development Cycle

**Setup: Two Terminals**

```bash
# Terminal 1: Auto-compile on save
cd vscode-extension
npm run watch

# Terminal 2: Auto-test on compile
npm run test:wiring:watch -- --grep "MyFeature"
```

**Result: Save → Compile (300ms) → Test (16ms) → Feedback (<1s)**

---

### Run Only Affected Tests

**During development:**

```bash
# Only run tests for current feature
npm run test:wiring -- --grep "ImportProgress"

# Result: ~5ms instead of 18ms
```

**Before commit:**

```bash
# Run all unit tests
npm run test:wiring

# Result: 18ms - verify no regressions
```

**Before merge:**

```bash
# Run full suite
npm run test:all

# Result: Full validation including integration tests
```

---

### Incremental Compilation

**Enable in tsconfig.json:**

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true
  }
}
```

**Result:**
- First compile: ~2 seconds
- Subsequent compiles: ~300ms
- 85% faster iteration

---

### Test Caching

**Cache expensive setup:**

```typescript
suite('MyFeature', () => {
  // Setup runs once for entire suite
  let cachedData: any;
  
  suiteSetup(() => {
    cachedData = expensiveOperation();  // Runs once
  });
  
  test('Test 1', () => {
    // Use cachedData - no re-setup
    assert.ok(cachedData);
  });
  
  test('Test 2', () => {
    // Use same cachedData - no re-setup
    assert.ok(cachedData);
  });
});
```

---

## Branch Management

### Active Branch Strategy

**Keep feature branches short-lived:**

```
✅ Good: 1-3 days, 5-15 commits
❌ Bad: 2+ weeks, 50+ commits
```

**Reasons:**
- Easier to review
- Less merge conflicts
- Faster feedback
- Smaller risk

### Multiple Features in Parallel

**Each in separate branch:**

```
main
├── feature/import-progress
│   └── Tests: import-progress.test.ts
├── feature/bundle-export
│   └── Tests: bundle-export.test.ts
└── bugfix/duplicate-prefix
    └── Tests: wiring.test.ts (updated)
```

**Benefits:**
- No interference between features
- Independent testing
- Parallel development
- Easy context switching

---

## Time Budgets

### Small Feature (1 hour total)

```
Planning:        5 min   (5%)
Test writing:   20 min  (20%)
Implementation: 25 min  (25%)
Refactoring:    10 min  (10%)
Documentation:  10 min  (10%)
Testing:         5 min   (5%)
Commit/Push:     5 min   (5%)
Manual QA:       2 min   (2%)
```

### Medium Feature (3 hours total)

```
Planning:       15 min   (8%)
Test writing:   60 min  (33%)
Implementation: 60 min  (33%)
Refactoring:    20 min  (11%)
Documentation:  15 min   (8%)
Integration:    20 min  (11%)
Manual QA:       5 min   (3%)
```

### Large Feature (8 hours total)

```
Planning:        30 min   (6%)
Test writing:   180 min  (38%)
Implementation: 180 min  (38%)
Refactoring:     40 min   (8%)
Documentation:   30 min   (6%)
Integration:     40 min   (8%)
E2E Testing:     30 min   (6%)
Manual QA:       10 min   (2%)
```

---

## Common Workflows

### Bug Fix Workflow

```bash
# 1. Create bugfix branch
git checkout -b bugfix/duplicate-prefix

# 2. Write test that reproduces bug (FAILS)
# 3. Fix the bug
# 4. Test passes
# 5. Commit and push

git commit -m "fix: remove duplicate Scout prefix

- Removed category field from package.json
- Test validates no duplication

Tests: 27/27 passing
Fixes: #123"
```

### Refactoring Workflow

```bash
# 1. Create refactor branch
git checkout -b refactor/bundle-provider

# 2. Ensure test coverage >80%
npm run test:wiring

# 3. Refactor in small steps
# 4. Run tests after EACH step
# 5. Commit frequently

git commit -m "refactor: extract bundle creation logic

- No behavioral changes
- All tests passing without modification

Tests: 27/27 passing"
```

### Configuration Change Workflow

```bash
# 1. Create config branch
git checkout -b config/add-timeout-setting

# 2. Update package.json schema
# 3. Write validation tests
# 4. Implement config reading
# 5. Document in FEATURES.md

git commit -m "config: add import timeout setting

- Default: 30 seconds
- Configurable: 5-300 seconds
- Validation included

Tests: 30/30 passing"
```

---

## Success Metrics

**You're doing it right when:**

✅ Feature branches live <3 days
✅ Tests written before code (always)
✅ All tests passing before commit
✅ Compilation takes <1 second
✅ Test execution takes <100ms
✅ Manual QA takes <5 minutes
✅ Zero bugs found in manual QA
✅ Documentation always up-to-date
✅ PRs reviewed within 24 hours
✅ Zero regressions in production

---

## Troubleshooting

### Tests are slow

**Problem:** Tests take >1 second
**Solution:**
- Use `--grep` to run only affected tests
- Cache expensive setup in `suiteSetup`
- Mock external dependencies
- Avoid file I/O in unit tests

### Compilation is slow

**Problem:** Compilation takes >2 seconds
**Solution:**
- Enable incremental compilation
- Use `skipLibCheck: true`
- Watch mode for continuous compilation
- Avoid type-checking node_modules

### Too many merge conflicts

**Problem:** Conflicts when merging
**Solution:**
- Keep branches short-lived (1-3 days)
- Rebase frequently from main
- Smaller, focused changes
- Communicate with team

### Manual QA takes too long

**Problem:** Manual QA >10 minutes
**Solution:**
- Write more integration tests
- Automate what's being tested manually
- Reduce manual QA to visual checks only
- Target <5 minutes per feature

---

## Quick Reference

### Daily Workflow

```bash
# Morning: Sync with main
git checkout main
git pull
git checkout feature/my-feature
git rebase main

# Development: Fast iteration
npm run watch                    # Terminal 1
npm run test:wiring:watch       # Terminal 2
# Edit code, auto-compile, auto-test

# Before commit: Full validation
npm run test:wiring             # 18ms
npm run compile                 # Verify clean
git commit -m "..."             # Commit

# End of day: Push progress
git push origin feature/my-feature
```

### Keyboard Shortcuts

```
Ctrl+S        Save (triggers watch mode)
Ctrl+`        Toggle terminal
Ctrl+Shift+P  Command Palette
Ctrl+Shift+M  Problems panel (see errors)
```

---

## When in Doubt

**Ask yourself:**
1. Did I plan this feature? (5 min planning)
2. Did I write tests first? (RED phase)
3. Are tests passing? (GREEN phase)
4. Is code clean? (REFACTOR phase)
5. Is it documented? (docs/FEATURES.md)
6. Is manual QA <5 minutes?
7. Are all tests still passing?
8. Is the PR description complete?
9. Can someone else understand this?
10. Would I approve this PR?

**If "No" to any: Fix it before proceeding.**

---

**Remember: Test-First Development is not slower - it's faster and more reliable.**

**When in doubt, write a test first. 🎯**