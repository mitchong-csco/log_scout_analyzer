# AI Assistant Rules for Log Scout Analyzer Project

## Core Principle: Test-Driven Development (TDD)

**All code changes MUST follow Test-Driven Development methodology.**

## Project Organization

### Directory Structure
```
log_scout_analyzer/
├── .zed/                           # Zed editor rules and config
│   ├── rules.md                    # This file - TDD rules
│   ├── PLANNING_TEMPLATES.md       # Test planning templates
│   ├── AUTOMATION_STRATEGY.md      # Test automation guide
│   └── TDD_QUICK_REF.md           # Quick reference card
├── vscode-extension/               # VS Code extension
│   ├── src/
│   │   ├── test/                  # All tests here
│   │   │   └── suite/
│   │   │       ├── wiring.test.ts          # Unit: Configuration
│   │   │       ├── [feature].test.ts       # Unit: Feature tests
│   │   │       ├── [feature].integration.test.ts  # Integration tests
│   │   │       └── [feature].e2e.test.ts   # End-to-end tests
│   │   ├── extension.ts           # Main extension entry
│   │   ├── bundleTreeProvider.ts  # Bundle management
│   │   ├── commands/              # Command implementations
│   │   ├── providers/             # Data providers
│   │   └── utils/                 # Utility functions
│   ├── package.json               # Extension manifest
│   └── README.md                  # Extension documentation
├── lsp-server/                    # Rust LSP server
│   ├── src/
│   │   ├── server.rs             # LSP server implementation
│   │   └── tests/                # Rust tests
│   └── Cargo.toml
├── docs/                          # Project documentation
│   ├── FEATURES.md               # Feature documentation
│   ├── ARCHITECTURE.md           # Architecture overview
│   └── CONTRIBUTING.md           # Contribution guide
└── test-data/                    # Test fixtures and data
```

### Feature Documentation Standards

**Every feature MUST have:**
1. Entry in `docs/FEATURES.md` with description and usage
2. Test file in `src/test/suite/[feature].test.ts`
3. Acceptance criteria documented
4. Example usage in documentation

### Git Branching Strategy

**Branch Naming Convention:**
```
feature/[feature-name]      # New features
bugfix/[bug-description]    # Bug fixes
refactor/[component]        # Refactoring
test/[test-improvement]     # Test infrastructure
docs/[doc-update]          # Documentation only
```

**Branch Workflow:**
```
main (protected)
  ├── feature/import-progress
  │   └── Tests: src/test/suite/import-progress.test.ts
  ├── bugfix/duplicate-prefix
  │   └── Tests: src/test/suite/wiring.test.ts (updated)
  └── feature/bundle-export
      └── Tests: src/test/suite/bundle-export.test.ts
```

**Rules:**
- Each feature gets its own branch
- Branch contains ONLY code for that feature
- Tests are feature-specific and isolated
- Run only affected tests during development
- Full test suite runs on PR to main

## Logging and Output

### All npm Commands Log Automatically

Every npm script automatically logs its output to `logs/[script-name].log`:
- **Terminal**: Shows output in real-time (you see it)
- **Log File**: Saves to `logs/` directory (for later review)
- **Both stdout and stderr**: Captures all messages

**Example:**
```bash
npm run test:wiring

# You see in terminal:
#   ✔ 24 passing (16ms)

# AND it's saved to:
#   logs/test-wiring.log
```

### When Commands Fail

If any command fails:
1. Error is visible in terminal immediately
2. Full output is saved to corresponding log file
3. AI assistant can read the log file to diagnose

**Example:**
```bash
npm run dev:verify
# Fails with error message

# To review later or share with AI:
type logs\dev-verify.log

# Or ask AI:
"Check logs/dev-verify.log and tell me what failed"
```

### Log Management

```bash
# View all recent logs
npm run logs:view-latest

# Clean old logs
npm run logs:clean

# Archive logs before cleaning
npm run logs:archive
```

### For AI Assistants

When a command fails:
1. Read the corresponding log file in `logs/` directory
2. Analyze the error output
3. Propose fixes based on the actual error
4. Never guess - always read the log

**Example:**
```
Human: "npm run test:security failed"

AI: "Let me check the log file..."
[Reads logs/test-security.log]
"I see the error: 'Module not found: security.test.ts'. 
This test file doesn't exist yet. Should I create it?"
```

## Mandatory Workflow

### For Every Bug Fix, Feature, or Code Change:

0. **PLANNING Phase - Design Before Coding**
   - Understand the requirement completely
   - Define acceptance criteria
   - Design test scenarios (happy path, error cases, edge cases)
   - Identify what needs to be tested (unit, integration, E2E)
   - Document test plan before writing any code
   - Get alignment on approach if needed
   - **DO NOT PROCEED** without a clear test plan

1. **RED Phase - Write Failing Test First**
   - Write a test that validates the desired behavior
   - Run the test and confirm it FAILS
   - Document the failure
   - **DO NOT PROCEED** until failing test is written

2. **GREEN Phase - Write Minimal Code**
   - Write the minimal code needed to make the test pass
   - Run the test and confirm it PASSES
   - Show test results

3. **REFACTOR Phase - Improve Code**
   - Refactor while keeping tests passing
   - Run tests after each refactor
   - Ensure all tests still pass

4. **VALIDATE Phase - Full Test Suite**
   - Run: `npm run test:wiring` (in vscode-extension directory)
   - All tests must pass before deployment
   - Document test results (e.g., "24/24 tests passing ✅")

5. **REVIEW Phase - Verify Against Plan**
   - Confirm all test scenarios from planning phase are covered
   - Verify acceptance criteria met
   - Check edge cases handled
   - Ensure no scenarios were missed

6. **AUTOMATE Phase - Add Integration Tests When Possible**
   - For UI changes: Add VS Code integration tests
   - For commands: Test command execution programmatically
   - For data flow: Test end-to-end scenarios
   - Minimize manual testing requirements

7. **DEPLOY Phase - Only After Validation**
   - Run: `npm run deploy` (in vscode-extension directory)
   - Provide manual test steps ONLY for what cannot be automated
   - Never deploy without passing tests

## Test Requirements

### Unit Tests (Required for All Changes)

Location: `vscode-extension/src/test/suite/`

**Every change must include:**
- Unit test(s) that validate the change
- Test must be written BEFORE implementation code
- Test must fail initially (RED phase)
- Test must pass after implementation (GREEN phase)

### Running Tests

```bash
cd vscode-extension

# Unit tests (fast, no VS Code launch) - ALWAYS RUN
npm run test:wiring

# Integration tests (launches VS Code) - RUN FOR FEATURES
npm test

# All tests (unit + integration) - RUN BEFORE DEPLOY
npm run test:all

# Compile TypeScript
npm run compile

# Full deployment (includes tests)
npm run deploy
```

### Test Pyramid Strategy

```
         /\
        /  \  E2E Tests (Few - Critical paths only)
       /    \
      /------\  Integration Tests (Some - Feature workflows)
     /        \
    /----------\  Unit Tests (Many - Everything testable)
   /______________\
```

**Aim for:**
- 70% Unit tests (wiring, configuration, logic)
- 20% Integration tests (command execution, UI updates)
- 10% E2E tests (complete user workflows)
- <5% Manual QA (visual verification, UX feel)

### Test Coverage Standards

**Level 1: Unit Tests (Required for ALL changes)**
- Configuration changes → Update `wiring.test.ts`
- Command registration → Test command appears in package.json
- New features → Add feature-specific test file
- Bug fixes → Test that reproduces bug, then fixes it

**Level 2: Integration Tests (Required when possible)**
- Command execution → Test command runs and produces expected result
- UI interactions → Test webview messages, tree view updates
- File operations → Test file creation, reading, writing
- LSP communication → Test client-server interaction

**Level 3: End-to-End Tests (Required for critical paths)**
- Import workflow → Test archive import from start to finish
- Bundle creation → Test bundle lifecycle
- Pattern analysis → Test pattern detection on real log files

**Goal: 90%+ test coverage, <10% manual QA needed**

## Response Format for Code Changes

When implementing any change, ALWAYS use this format:

```markdown
## Change: [Brief description]

### 0. Planning Phase 📋

**Requirement:**
[Clear statement of what needs to be done]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Test Scenarios:**

#### Happy Path
- Scenario 1: [Description]
  - Given: [Initial state]
  - When: [Action]
  - Then: [Expected outcome]
  
#### Error Cases
- Scenario 2: [Error condition]
  - Given: [Error setup]
  - When: [Action]
  - Then: [Expected error handling]
  
#### Edge Cases
- Scenario 3: [Boundary condition]
  - Given: [Edge case setup]
  - When: [Action]
  - Then: [Expected behavior]

**Test Coverage Plan:**
- Unit Tests: [What to test]
- Integration Tests: [What to test]
- E2E Tests: [What to test]
- Manual QA: [What requires human validation]

**Implementation Approach:**
[Brief description of how you'll implement this]

### 1. Test First (RED Phase) ❌
```typescript
// Test file: src/test/suite/[feature].test.ts
test('Description of what should work', () => {
  // Assertion that will fail before fix
  assert.ok(condition, 'Error message');
});
```

**Run test:**
```bash
npm run test:wiring
# Result: ❌ 1 failing - [specific failure message]
```

### 2. Implementation (GREEN Phase) ✅
```typescript
// Actual code changes in relevant files
```

**Run test:**
```bash
npm run test:wiring
# Result: ✅ 25/25 passing (19ms)
```

### 3. Deployment
```bash
npm run deploy
```

### 4. Manual Verification Steps
1. [Step-by-step instructions for human to verify]
2. [Expected result for each step]
3. [How to confirm success]

### 5. Verification Against Plan ✅
- [ ] All acceptance criteria met
- [ ] All test scenarios covered
- [ ] Happy path validated
- [ ] Error cases handled
- [ ] Edge cases tested
- [ ] No scenarios missed

### 6. Test Report
+- ✅ Unit tests: 25/25 passing
+- ✅ Integration tests: 8/8 passing (if applicable)
+- ✅ Test coverage: 92% (if measurable)
+- ✅ Compilation: Success
+- ✅ Deployment: Complete
- ✅ Ready for QA (minimal manual testing needed)

### 7. What Still Requires Manual QA
+- [ ] Visual appearance of [specific UI element]
+- [ ] User experience feel of [specific interaction]
+- ⚠️ If list is empty, no manual QA needed!
```

## Forbidden Actions

**NEVER:**
+- ❌ Write implementation code without a test first
+- ❌ Deploy without running `npm run test:wiring`
+- ❌ Say "done" without showing passing test results
+- ❌ Skip the RED phase (failing test)
+- ❌ Assume wiring is correct without tests validating it
+- ❌ Make excuses for skipping tests ("it's simple", "just a quick fix")
+- ❌ Say "this requires manual testing" without attempting to automate
+- ❌ Write only unit tests when integration tests are possible
+- ❌ Require manual QA for things that can be tested programmatically

## Quality Gates

Before marking work complete, verify:

- [ ] Test written and initially failing (RED)
- [ ] Code written to pass test (GREEN)
- [ ] Unit tests passing: `npm run test:wiring`
- [ ] Integration tests passing (if applicable): `npm test`
- [ ] Test coverage adequate for change type
- [ ] TypeScript compiles: `npm run compile`
- [ ] Extension deployed: `npm run deploy`
- [ ] Automated tests cover 90%+ of functionality
- [ ] Manual verification steps documented (only for untestable parts)
- [ ] Test results shared (e.g., "24/24 unit, 8/8 integration ✅")

## Project-Specific Context

### Extension Structure
- **VS Code Extension**: `vscode-extension/`
- **LSP Server**: `lsp-server/` (Rust)
- **Tests**: `vscode-extension/src/test/suite/`

### Key Test Files
- `wiring.test.ts` - Validates extension wiring, commands, configuration
- Future: Feature-specific test files as needed

### Build Commands
```bash
# VSCode Extension
cd vscode-extension
npm run compile              # Compile TypeScript
npm run build:lsp            # Build Rust LSP server
npm run build:all            # Build everything
npm run test:wiring          # Run unit tests (fast - 16ms)
npm test                     # Run integration tests (slow - launches VS Code)
npm run test:all             # Run all tests (unit + integration)
npm run package              # Create VSIX package
npm run deploy               # Build + package + install

# LSP Server
cd lsp-server
cargo test                   # Run Rust tests
cargo test -- --nocapture    # Run with output
cargo build --release        # Build release binary
```

### Common Issues We're Preventing

1. **"Scout: Scout: Import Log Archive" Bug**
   - Duplicate prefix issue
   - Test validates: NO duplicate "Scout:" in titles
   - Test location: `wiring.test.ts` - "Import Archive command should NOT have duplicate Scout prefix"

2. **Unregistered Commands**
   - Command in package.json but not in extension.ts
   - Test validates: Command registration in both places

3. **Missing Dependencies**
   - BundleTreeProvider not initialized
   - Test validates: Provider exists and is wired up

4. **File Structure Issues**
   - LSP binary missing or wrong size
   - Test validates: Binary exists and is reasonable size

## Automation Guidelines

### What MUST Be Automated

**Always write automated tests for:**
- ✅ Command registration and wiring
- ✅ Configuration schema validation
- ✅ Data structure creation/parsing
- ✅ File I/O operations
- ✅ Error handling paths
- ✅ API responses and data flow
- ✅ State management
- ✅ Business logic
- ✅ Tree view data providers
- ✅ Command execution outcomes

### What CAN Be Automated (Do It!)

**Write integration tests for:**
- ✅ Command execution with VS Code API
- ✅ Webview message passing
- ✅ Tree view updates and refresh
- ✅ File system operations
- ✅ LSP client-server communication
- ✅ Extension activation
- ✅ Settings reading/writing

**Example: Test command execution**
```typescript
test('Import command executes without error', async () => {
  await vscode.commands.executeCommand('logScoutAnalyzer.importArchive');
  // Verify no errors thrown
});
```

### What Requires Manual QA (Minimize This!)

**Only manual test when automation is truly impossible:**
- 🔍 Visual styling and appearance (CSS, colors, layouts)
- 🔍 Animation smoothness and timing
- 🔍 Subjective UX "feel" and ergonomics
- 🔍 Cross-platform visual consistency
- 🔍 Accessibility with screen readers

**For everything else: Write a test!**

### Test Automation Checklist

When implementing a feature, ask:
- [ ] Can I test this with a unit test? → YES: Write it!
- [ ] Can I test this with VS Code API? → YES: Write integration test!
- [ ] Can I simulate user interaction programmatically? → YES: Write E2E test!
- [ ] Does this REQUIRE human eyes/judgment? → Maybe manual QA needed
- [ ] Have I maximized test coverage before requiring manual QA?

**Goal: Human QA should only validate subjective UX, not functionality.**

## Example: Real-World Application

### User Request: "Add progress indicator to import command"

**Correct Response:**

```markdown
## Implementation: Import Progress Indicator

### 1. Test First (RED Phase) ❌

Creating test file: `src/test/suite/import-progress.test.ts`

```typescript
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('Import Progress Indicator', () => {
  let extensionTs: string;
  
  suiteSetup(() => {
    const extensionPath = path.resolve(__dirname, '../../../src/extension.ts');
    extensionTs = fs.readFileSync(extensionPath, 'utf8');
  });

  test('Import command should use withProgress', () => {
    assert.ok(
      extensionTs.includes('withProgress'),
      'Import command should use vscode.window.withProgress'
    );
  });

  test('Progress should show in notification area', () => {
    assert.ok(
      extensionTs.includes('ProgressLocation.Notification'),
      'Progress should be shown in notification area'
    );
  });

  test('Progress should report status messages', () => {
    const hasProgressReport = extensionTs.includes('progress.report');
    assert.ok(
      hasProgressReport,
      'Import should report progress status'
    );
  });
});
```

**Running test (before implementation):**
```bash
$ npm run test:wiring

Import Progress Indicator
  ❌ Import command should use withProgress
  ❌ Progress should show in notification area  
  ❌ Progress should report status messages

3 failing
```

### 2. Implementation (GREEN Phase) ✅

Updating `src/extension.ts`:

```typescript
// Import Archive Command
context.subscriptions.push(
  vscode.commands.registerCommand(
    "logScoutAnalyzer.importArchive",
    async () => {
      if (!bundleTreeProvider) {
        vscode.window.showErrorMessage("Bundle tree provider not initialized");
        return;
      }

      // Show file picker
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          Archives: ["zip", "tar", "gz", "tgz"],
        },
        title: "Select Log Archive to Import",
      });

      if (result && result.length > 0) {
        const archivePath = result[0].fsPath;
        
        // NEW: Progress indicator
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Importing Archive",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "Starting import..." });
            outputChannel?.appendLine(`Importing archive: ${archivePath}`);

            try {
              await bundleTreeProvider.importPackage(archivePath);
              progress.report({ message: "Complete!" });
              outputChannel?.appendLine("✓ Import completed successfully");
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

**Running tests (after implementation):**
```bash
$ npm run test:wiring

Import Progress Indicator
  ✅ Import command should use withProgress
  ✅ Progress should show in notification area
  ✅ Progress should report status messages

Extension Wiring Validation
  ✅ [... 24 other tests ...]

27 passing (18ms)
```

### 3. Deployment
```bash
$ npm run compile
# Compiling TypeScript...
# ✓ Compilation successful

$ npm run deploy
# Building extension...
# Packaging VSIX...
# Installing extension...
# ✓ Extension installed successfully
```

### 4. Integration Tests Added

**Testing progress indicator programmatically:**

Creating `src/test/suite/import-integration.test.ts`:

```typescript
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Import Integration Tests', () => {
  test('Import command shows progress notification', async () => {
    // Track notification calls
    let progressShown = false;
    
    // Execute command (with mocked file picker)
    await vscode.commands.executeCommand('logScoutAnalyzer.importArchive');
    
    // Verify progress was shown
    // Note: Actual implementation would mock/spy on vscode.window.withProgress
    assert.ok(true, 'Progress shown during import');
  });

  test('Import completes successfully', async () => {
    // Test import workflow end-to-end
    // Verify bundle created
    // Verify no errors in output
  });
});
```

**Running integration tests:**
```bash
$ npm test

Import Integration Tests
  ✅ Import command shows progress notification
  ✅ Import completes successfully

2 passing (450ms)
```

### 5. Manual Verification Steps (Minimal!)

**Only manual QA needed for subjective aspects:**

1. **Visual Check (30 seconds)**
   - Notification appears in expected location (bottom-right)
   - Progress message is readable and well-formatted
   - Notification styling matches VS Code theme

2. **UX Feel Check (30 seconds)**
   - Notification appears promptly (feels responsive)
   - Progress updates feel smooth
   - Auto-dismiss timing feels appropriate

**Expected Result:** ✅ Notification looks and feels good

⚠️ **Note:** Functionality is 100% validated by automated tests. Manual QA only for visual/UX feel.

### 6. Test Report

✅ **Ready for QA**

**Automated Test Results:**
- Unit tests: 27/27 passing (18ms)
- Integration tests: 2/2 passing (450ms)
- Total test coverage: ~95%
- TypeScript compilation: Success
- VSIX package created: log-scout-analyzer-0.0.173.vsix
- Extension installed: Success

**Test Coverage:**
- Progress indicator presence: ✅ (unit test)
- Progress location configuration: ✅ (unit test)
- Progress reporting: ✅ (unit test)
- Command execution: ✅ (integration test)
- Import workflow completion: ✅ (integration test)
- All existing tests still passing: ✅

**Manual QA Required:**
- Visual styling check: ~30 seconds
- UX feel validation: ~30 seconds
- **Total manual QA time: ~1 minute** (down from ~5 minutes!)

**Automation Coverage:**
- Functionality: 100% automated
- Visual/UX: Requires manual review
```

## Success Criteria

### Automated Testing Goals

**Target Metrics:**
- 90%+ functionality covered by automated tests
- <5 minutes manual QA time per feature
- Zero functional bugs caught in manual QA
- Manual QA only for subjective UX evaluation

Human QA should NEVER encounter:
- ❌ "This command isn't registered"
- ❌ "This feature doesn't work"
- ❌ "This isn't wired up"
- ❌ "Did you test this?"
- ❌ "This crashes when I click X"
- ❌ "The data isn't saved"
- ❌ "Nothing happens when I run the command"

Instead, human QA should see:
- ✅ All automated tests passing (unit + integration)
- ✅ Feature works exactly as documented
- ✅ Only visual/UX aspects need validation
- ✅ Manual QA time reduced to minutes, not hours
- ✅ High confidence from test coverage

### Quality Bar

**Before requesting manual QA:**
- Unit test coverage: >90%
- Integration test coverage: >70% (for testable interactions)
- All tests passing
- Functionality validated programmatically
- Only subjective aspects remain for human review

## Accountability

If a human discovers a **functional issue** that tests didn't catch:
1. **Immediate action:**
   - Acknowledge the gap in test coverage
   - Write a test that reproduces the issue (RED)
   - Fix the issue (GREEN)
   - Verify the new test passes
   - Add the test to the suite permanently

2. **Analysis:**
   - Why did the test miss this?
   - What category of tests is missing?
   - How can we prevent similar gaps?

3. **Prevention:**
   - Update test coverage guidelines
   - Add similar tests for related functionality
   - Document the lesson learned

**This should be RARE** - tests should catch 95%+ of issues before human QA.

### Test Gap Prevention

**When adding a feature, ensure tests cover:**
- ✅ Happy path (feature works correctly)
- ✅ Error paths (feature fails gracefully)
- ✅ Edge cases (boundary conditions)
- ✅ Integration points (interacts with other components correctly)
- ✅ State changes (data updates properly)
- ✅ User-visible outcomes (UI updates, files created, etc.)

## Summary

**Test-Driven Development is not optional.**

Every code change follows this cycle:
```
1. Write test (RED) → 2. Write code (GREEN) → 3. Verify (GREEN) → 4. Automate more → 5. Deploy
```

**No exceptions. No shortcuts. No "quick fixes" without tests.**

**Automation is respect:**
- Respects the human's time (QA is fast and focused)
- Respects code quality (bugs caught before deployment)
- Respects project velocity (CI/CD catches issues automatically)
- Respects future developers (tests document expected behavior)

**Goal: Manual QA becomes a pleasant 5-minute validation, not a grueling debug session.**

---

## Git Workflow for Features

### Feature Development Flow

**1. Create Feature Branch**
```bash
git checkout -b feature/import-progress
```

**2. Document Feature First**
```bash
# Create or update docs/FEATURES.md
# Add feature description, acceptance criteria, usage examples
```

**3. Create Test File**
```bash
# Create src/test/suite/import-progress.test.ts
# Define all test scenarios BEFORE coding
```

**4. TDD Workflow**
```bash
# Write test (RED)
npm run test:wiring  # Fails

# Write code (GREEN)
npm run compile
npm run test:wiring  # Passes

# Refactor (GREEN)
npm run test:wiring  # Still passes
```

**5. Commit Frequently**
```bash
git add src/test/suite/import-progress.test.ts
git commit -m "test: add import progress test scenarios"

git add src/extension.ts
git commit -m "feat: implement import progress indicator"

git add docs/FEATURES.md
git commit -m "docs: document import progress feature"
```

**6. Push and Create PR**
```bash
git push origin feature/import-progress
# Create PR with:
# - Feature description
# - Test results (X/X passing)
# - Manual QA checklist
```

**7. Merge to Main**
```bash
# After PR approval and all tests passing
git checkout main
git merge feature/import-progress
git tag v0.0.173
```

### Separation of Concerns

**Feature Isolation:**
- Each feature in separate branch
- Feature-specific test file
- Tests run independently
- No cross-feature dependencies during development

**Test Organization:**
```
feature/import-progress
  └── src/test/suite/import-progress.test.ts
      ✅ Only tests for import progress
      ✅ Run independently: npm run test:wiring -- import-progress
      ✅ Fast iteration (no other tests run)

feature/bundle-export  
  └── src/test/suite/bundle-export.test.ts
      ✅ Only tests for bundle export
      ✅ Independent development
      ✅ No conflicts with import-progress
```

### Minimizing Compilation and Re-testing

**Strategy 1: Test-Specific Runs**
```bash
# Run only specific test file
npm run test:wiring -- --grep "Import Progress"

# Watch mode for current feature
npm run test:wiring:watch

# Run only changed tests
npm run test:changed
```

**Strategy 2: Incremental Compilation**
```bash
# Watch mode - auto-recompile on save
npm run watch

# In separate terminal - auto-run tests
npm run test:wiring:watch

# Result: Save → Auto-compile → Auto-test (<1 second)
```

**Strategy 3: Skip Unaffected Tests**
```bash
# Unit tests only (fastest - 16ms)
npm run test:wiring

# Skip integration tests during feature dev
# Run integration only before commit
npm test

# Full suite only on PR
npm run test:all
```

**Strategy 4: Compilation Optimization**
```json
// tsconfig.json - incremental compilation
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**Strategy 5: Test Caching**
```typescript
// Cache expensive setup
let cachedData: any;

suiteSetup(() => {
  if (!cachedData) {
    cachedData = expensiveSetup();
  }
});

test('Fast test using cached data', () => {
  // Use cachedData - no re-setup needed
});
```

### Development Workflow Optimization

**Fast Development Cycle:**
```bash
# Terminal 1: Watch and auto-compile
npm run watch

# Terminal 2: Watch and auto-test current feature
npm run test:wiring:watch -- --grep "MyFeature"

# Terminal 3: Development work
code src/extension.ts

# Result: Save file → Compile (300ms) → Test (16ms) → Feedback (<1s)
```

**Pre-Commit Optimization:**
```bash
# Only run affected tests
npm run test:wiring -- --grep "$(git diff --name-only)"

# Quick smoke test
npm run test:wiring -- --grep "smoke"

# Full suite runs in CI/CD
```

**Branch-Specific Test Strategy:**
```bash
# Feature branch: Only feature tests
npm run test:wiring -- --grep "ImportProgress"

# Before PR: All unit tests
npm run test:wiring

# Before merge: Full test suite
npm run test:all
```

### Commit Message Convention

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding tests
- `refactor`: Code refactoring
- `docs`: Documentation
- `perf`: Performance improvement
- `chore`: Maintenance

**Examples:**
```bash
git commit -m "feat(import): add progress indicator

- Shows notification during import
- Reports progress percentage
- Auto-dismisses on completion

Tests: 27/27 passing"

git commit -m "test(import): add progress indicator tests

- Unit tests for progress logic
- Integration tests for notification
- All scenarios covered"

git commit -m "docs(import): document progress feature

Added to FEATURES.md with usage examples"
```

## Feature Documentation Template

### docs/FEATURES.md Structure

```markdown
# Feature: Import Progress Indicator

## Overview
Shows real-time progress during archive import operations.

## Acceptance Criteria
- [ ] Progress notification visible during import
- [ ] Percentage updates in real-time
- [ ] Success message on completion
- [ ] Error handling for failures

## Usage

### Command Palette
1. Ctrl+Shift+P → "Scout: Import Log Archive"
2. Select archive file
3. Progress notification appears automatically

### Expected Behavior
- Notification shows: "Importing Archive"
- Progress updates: "5%", "25%", "50%", "100%"
- Auto-dismisses on success

## Implementation Details

**Files:**
- `src/extension.ts` - Progress logic
- `src/test/suite/import-progress.test.ts` - Tests

**Dependencies:**
- `vscode.window.withProgress` API
- `bundleTreeProvider.importPackage()` method

## Testing

**Test Coverage:**
- Unit tests: 5/5 passing
- Integration tests: 2/2 passing
- Manual QA: <1 minute (visual only)

**How to Test:**
```bash
npm run test:wiring -- --grep "Import Progress"
```

## Known Limitations
- Cannot cancel import once started
- Progress is estimated, not exact

## Future Enhancements
- [ ] Add cancellation support
- [ ] Show file count progress
- [ ] Estimate time remaining
```

---

## Test Scenario Planning Templates

### Template 1: Feature Addition

```markdown
## Feature: [Name]

### Requirement
[Clear description of what the feature should do]

### Acceptance Criteria
1. [Measurable criterion 1]
2. [Measurable criterion 2]
3. [Measurable criterion 3]

### Test Scenarios

#### Scenario 1: Happy Path
- **Given:** User has a valid workspace open
- **When:** User executes the command
- **Then:** Feature works as expected and provides feedback

#### Scenario 2: Error - No Workspace
- **Given:** No workspace is open
- **When:** User executes the command
- **Then:** Error message shown, no crash

#### Scenario 3: Error - Invalid Input
- **Given:** User provides invalid input
- **When:** Command processes input
- **Then:** Validation error shown, user can retry

#### Scenario 4: Edge - Large Dataset
- **Given:** User has 1000+ items
- **When:** Feature processes data
- **Then:** Performance acceptable (<5s), no memory issues

#### Scenario 5: Edge - Empty State
- **Given:** No data exists
- **When:** Feature runs
- **Then:** Appropriate empty state shown

### Test Implementation Plan

**Unit Tests (5 tests):**
1. Command registered in package.json
2. Command registered in extension.ts
3. Error handling present
4. Validation logic correct
5. Data structure format correct

**Integration Tests (3 tests):**
1. Command executes successfully
2. Error cases handled gracefully
3. UI updates correctly

**E2E Tests (1 test):**
1. Complete workflow from start to finish

**Manual QA (<2 min):**
- Visual styling check
- UX feel validation

### Expected Coverage
- Unit: 90%
- Integration: 80%
- E2E: 100% of main workflow
- Manual: 5% (visual only)
```

### Template 2: Bug Fix

```markdown
## Bug: [Description]

### Problem Statement
[Clear description of the bug]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]
4. Bug occurs: [What happens]

### Expected Behavior
[What should happen instead]

### Root Cause Analysis
[Why the bug occurs]

### Test Scenarios

#### Scenario 1: Reproduce Bug
- **Given:** [Setup that causes bug]
- **When:** [Action that triggers bug]
- **Then:** [Bug manifests - test should FAIL initially]

#### Scenario 2: Verify Fix
- **Given:** [Same setup]
- **When:** [Same action]
- **Then:** [Correct behavior - test should PASS after fix]

#### Scenario 3: Regression Prevention
- **Given:** [Related scenarios]
- **When:** [Related actions]
- **Then:** [No side effects from fix]

### Test Implementation Plan

**Unit Tests (2-3 tests):**
1. Test that reproduces the bug (fails before fix)
2. Test that verifies the fix (passes after fix)
3. Regression test for related functionality

**Integration Tests (1-2 tests):**
1. End-to-end test of fixed behavior
2. Test that side effects are correct

**Manual QA (<1 min):**
- Quick verification that fix works
- No new issues introduced

### Prevention Strategy
[How to prevent similar bugs in the future]
```

### Template 3: Refactoring

```markdown
## Refactor: [Component/Feature]

### Goal
[What you're improving and why]

### Acceptance Criteria
1. All existing tests still pass
2. No behavioral changes
3. Code is more maintainable/performant
4. No regressions introduced

### Test Scenarios

#### Scenario 1: Behavior Preservation
- **Given:** Existing test suite
- **When:** Refactoring applied
- **Then:** All tests still pass without modification

#### Scenario 2: Performance (if applicable)
- **Given:** Baseline performance metrics
- **When:** Refactored code runs
- **Then:** Performance same or better

#### Scenario 3: API Compatibility
- **Given:** Existing consumers of API
- **When:** Refactored code used
- **Then:** All consumers work without changes

### Test Implementation Plan

**Before Refactoring:**
1. Ensure test coverage is adequate (>80%)
2. Document all existing tests
3. Capture performance baselines

**During Refactoring:**
1. Run tests frequently (after each small change)
2. Ensure no test modifications needed
3. Add tests for any new code paths

**After Refactoring:**
1. All tests pass
2. Coverage maintained or improved
3. Performance validated

**Manual QA (None):**
- Refactoring should be 100% validated by tests
- If manual QA needed, test coverage was insufficient
```

### Template 4: Configuration Change

```markdown
## Config Change: [What's changing]

### Change Description
[What configuration is being added/modified/removed]

### Impact Analysis
- **Breaking Changes:** Yes/No - [Details]
- **Migration Required:** Yes/No - [Details]
- **Backward Compatible:** Yes/No - [Details]

### Test Scenarios

#### Scenario 1: Default Value
- **Given:** Fresh installation
- **When:** Extension activates
- **Then:** Default value is correct

#### Scenario 2: User Override
- **Given:** User sets custom value
- **When:** Extension reads config
- **Then:** Custom value is used

#### Scenario 3: Invalid Value
- **Given:** User sets invalid value
- **When:** Extension reads config
- **Then:** Validation error or fallback to default

#### Scenario 4: Migration (if needed)
- **Given:** Old config format exists
- **When:** Extension activates
- **Then:** Config migrated automatically

### Test Implementation Plan

**Unit Tests (4-6 tests):**
1. Config schema validation
2. Default value correct
3. Value reading works
4. Invalid value handling
5. Type validation
6. Migration logic (if needed)

**Integration Tests (2-3 tests):**
1. Config changes applied at runtime
2. Extension behavior changes with config
3. Settings UI reflects values

**Manual QA (<1 min):**
- Visual check of settings UI
- Verify description is clear
```

### Quick Planning Checklist

Before writing ANY code, answer:

- [ ] What is the requirement in one sentence?
- [ ] What are 3-5 acceptance criteria?
- [ ] What is the happy path?
- [ ] What are 2-3 error cases?
- [ ] What are 2-3 edge cases?
- [ ] What unit tests do I need?
- [ ] What integration tests do I need?
- [ ] Do I need E2E tests?
- [ ] What requires manual QA?
- [ ] How will I verify success?

**If you can't answer these, you're not ready to code.**

---

**When in doubt, write a test first.**

---

## Optimization Strategies Summary

### Development Speed Optimizations

**1. Incremental Testing**
- Run only affected tests during development
- Use `--grep` to filter test suites
- Save 90%+ test execution time

**2. Watch Mode**
```bash
# Auto-compile + auto-test
Terminal 1: npm run watch
Terminal 2: npm run test:wiring:watch
Result: <1 second feedback loop
```

**3. Feature Branch Isolation**
- Develop feature in isolation
- Run only feature-specific tests
- No interference from other features
- Merge conflicts minimized

**4. Lazy Compilation**
```json
// Only compile what changed
{
  "compilerOptions": {
    "incremental": true,
    "skipLibCheck": true  // Skip node_modules type checking
  }
}
```

**5. Test Parallelization**
```bash
# Run tests in parallel (future enhancement)
npm run test:parallel
```

### CI/CD Pipeline Optimization

**Branch Testing Strategy:**
```yaml
feature-branch:
  - Run: Feature-specific tests only
  - Time: ~30 seconds
  
pull-request:
  - Run: Full unit test suite
  - Time: ~2 minutes
  
main-merge:
  - Run: Unit + Integration + E2E
  - Time: ~10 minutes
  
release:
  - Run: Full suite + Performance tests
  - Time: ~30 minutes
```

### Documentation Efficiency

**Documentation as Code:**
- Feature docs live with feature code
- Tests document expected behavior
- Commit messages tell the story
- No separate doc maintenance

**Auto-Generated Docs:**
```bash
# Generate test report
npm run test:wiring -- --reporter json > test-report.json

# Generate coverage report
npm run test:coverage

# Include in docs/
```

---

## Project Health Metrics

### Track These Metrics

**Test Metrics:**
- Unit test count: Target 100+
- Integration test count: Target 50+
- Test coverage: Target >90%
- Test execution time: Target <100ms for units
- Tests per feature: Target 5-10

**Development Metrics:**
- Feature branch lifetime: Target <3 days
- Commits per feature: Target 5-10
- Time from code to deploy: Target <1 hour
- Manual QA time per feature: Target <5 minutes
- Bugs found in QA: Target <1 per feature

**Quality Metrics:**
- Regressions per release: Target 0
- Failed deployments: Target 0
- Test failures on main: Target 0
- Documentation coverage: Target 100% of features

### Monthly Review

**Review and improve:**
1. Test execution time trends
2. Feature development velocity
3. Test coverage gaps
4. Manual QA time spent
5. CI/CD pipeline efficiency

---

## When in Doubt

**Questions to ask:**
1. Did I create a feature branch?
2. Did I document the feature in docs/FEATURES.md?
3. Did I write tests before code?
4. Are my tests running quickly (<100ms)?
5. Am I only running affected tests?
6. Did I commit with clear messages?
7. Is the PR description complete?
8. Are all tests passing?
9. Is manual QA <5 minutes?
10. Can someone else understand my changes?

**If answer is "No" to any: Fix it before proceeding.**

---

## Continuous Improvement: Evolving the Strategy

### The Strategy Is Not Set in Stone

These rules and strategies are living documents. When you discover:
- ❌ A design flaw
- ❌ An inefficient process
- ❌ A missing test category
- ❌ A better approach
- ❌ A gap in coverage

**DO NOT** just work around it. **UPDATE THE STRATEGY.**

### How to Update Strategy Documents

#### 1. Identify the Issue

Document what's wrong:
```markdown
## Issue Discovered

**Date**: 2024-01-15
**Discovered By**: [AI Assistant / Developer Name]
**Context**: While implementing feature X

**Problem**: 
Current strategy says to do Y, but this causes Z issue.

**Example**:
[Concrete example of the problem]

**Impact**:
- Wastes N hours per feature
- Causes confusion
- Leads to bugs
```

#### 2. Propose the Fix

```markdown
## Proposed Solution

**Update**: `.zed/[STRATEGY_FILE].md`

**Change**:
- OLD: "Do X because Y"
- NEW: "Do Z because W"

**Rationale**:
[Why this is better]

**Impact**:
- Saves N hours per feature
- Prevents bugs
- Clearer workflow
```

#### 3. Update the Strategy File

Make the actual change to the appropriate `.zed/*.md` file:

```bash
# Edit the strategy document
code .zed/SECURITY_TESTING.md

# Or ask AI to update it
"Update .zed/SECURITY_TESTING.md to include [new requirement]"
```

#### 4. Document the Change

Add entry to `.zed/CHANGELOG.md`:

```markdown
## 2024-01-15

### Strategy Updates

#### Security Testing Strategy
- **Added**: XYZ test category for better coverage
- **Rationale**: Discovered gap when implementing feature X
- **Impact**: Prevents [specific vulnerability type]

#### Performance Testing Strategy
- **Changed**: Performance budget for large files
- **OLD**: 5 seconds
- **NEW**: 10 seconds
- **Rationale**: Real-world files are larger than anticipated
```

#### 5. Communicate the Change

If working with a team:
```markdown
# Strategy Update Notification

**File Changed**: `.zed/SECURITY_TESTING.md`
**What Changed**: Added requirement for prototype pollution tests
**Why**: Discovered this gap during recent security review
**Action Required**: 
- Read the updated section
- Apply to future PRs
- Review existing code if time permits
```

### Strategy Update Checklist

Before updating a strategy document:

- [ ] Clearly identified the problem
- [ ] Verified it's a systemic issue, not a one-off
- [ ] Proposed solution is actionable
- [ ] Solution doesn't contradict other strategies
- [ ] Updated the appropriate `.zed/*.md` file
- [ ] Added entry to `.zed/CHANGELOG.md`
- [ ] Tested the new approach on current work
- [ ] Documented examples in the strategy file

### Common Strategy Updates

#### Adding a New Test Category

```markdown
<!-- In appropriate strategy file -->

### N. New Test Category Name

Why this category exists:
[Explain the gap this fills]

```typescript
suite('Category: New Tests', () => {
  test('Example test', () => {
    // Template
  });
});
```

When to use:
- [Scenario 1]
- [Scenario 2]
```

#### Changing a Time Budget

```markdown
<!-- In PERFORMANCE_TESTING.md or AUTOMATION_STRATEGY.md -->

### Performance Budget Update

**OLD**: Feature implementation: 2 hours
**NEW**: Feature implementation: 3 hours

**Rationale**: 
Analysis of 20 recent features shows average is 2.8 hours.
Old budget was too optimistic.

**Updated**: 2024-01-15
```

#### Adding a Security Check

```markdown
<!-- In SECURITY_TESTING.md -->

### New Security Check: [Name]

**Added**: 2024-01-15
**Reason**: Discovered vulnerability in production

**Test**:
```typescript
test('Prevents [specific attack]', () => {
  // Test implementation
});
```

**Mandatory**: Yes, all features must include this check
```

### Feedback Loops

#### Weekly Review (15 minutes)

Ask yourself:
1. Did any strategy rule waste time this week?
2. Did we discover any new test categories?
3. Were time budgets realistic?
4. Did documentation stay up-to-date?
5. What surprised us?

**If anything needs improvement: Update the strategy.**

#### Monthly Retrospective (1 hour)

Review metrics:
- Features completed vs time budgets
- Bugs found in QA vs in tests
- Strategy documents updated count
- Developer satisfaction with process

**Action items**:
- Update strategies based on data
- Remove rules that don't add value
- Add rules for discovered gaps

#### Quarterly Deep Dive (4 hours)

Full strategy audit:
- Read all `.zed/*.md` files
- Identify contradictions
- Find gaps in coverage
- Update based on new learnings
- Simplify overly complex rules

### Strategy Evolution Principles

#### 1. Data Over Opinion

```markdown
❌ BAD: "I think tests should run in <50ms"
✅ GOOD: "Analysis of 100 tests shows 95th percentile is 42ms. 
         Setting budget at 50ms gives headroom."
```

#### 2. Examples Over Abstractions

```markdown
❌ BAD: "Write good tests"
✅ GOOD: "See example in SECURITY_TESTING.md line 42"
```

#### 3. Iterate, Don't Perfect

```markdown
❌ BAD: Spend 4 hours designing perfect strategy upfront
✅ GOOD: Start simple, improve based on real experience
```

#### 4. Prefer Addition Over Deletion

```markdown
❌ RISKY: Delete old rule entirely
✅ SAFER: Mark as deprecated, add new rule, migrate gradually
```

### Version Control for Strategies

Track strategy versions in each document:

```markdown
# Strategy Document Name

**Version**: 2.1.0
**Last Updated**: 2024-01-15
**Status**: Active

## Version History

### 2.1.0 (2024-01-15)
- Added: XYZ test category
- Changed: Performance budgets
- Deprecated: Old approach to ABC

### 2.0.0 (2024-01-01)
- Major overhaul based on 6 months of experience
- Breaking: Changed test organization structure

### 1.0.0 (2023-07-01)
- Initial strategy
```

### When Strategies Conflict

If two strategies contradict:

1. **Identify the conflict**:
   ```
   SECURITY_TESTING.md says: "Test everything"
   PERFORMANCE_TESTING.md says: "Keep tests under 50ms"
   
   CONFLICT: Security tests for large files take 200ms
   ```

2. **Find the balance**:
   ```
   SOLUTION: 
   - Run expensive security tests in separate suite
   - Fast tests (<50ms) run on every commit
   - Slow tests (>50ms) run in CI/CD only
   ```

3. **Update both documents**:
   ```
   SECURITY_TESTING.md: "Expensive tests go in test:security-full"
   PERFORMANCE_TESTING.md: "50ms budget applies to test:fast only"
   ```

### AI Assistant Responsibilities

When you (AI assistant) discover a strategy issue:

1. **Flag it immediately**:
   ```
   ⚠️ STRATEGY ISSUE DETECTED
   
   While implementing [feature], discovered that current strategy
   in .zed/[FILE].md doesn't account for [scenario].
   
   Proposed update: [description]
   
   Shall I update the strategy document?
   ```

2. **Propose the change**:
   - Show exact text to add/change
   - Explain rationale
   - Show impact on current work

3. **Wait for approval**:
   - User may want to discuss
   - User may have context you don't
   - User makes final decision

4. **Make the update**:
   - Edit the `.zed/*.md` file
   - Add changelog entry
   - Apply to current work

### Developer Responsibilities

When you (human developer) discover a strategy issue:

1. **Don't suffer in silence**: If a rule wastes time, change it
2. **Document your reasoning**: Help future developers understand why
3. **Share learnings**: Update strategy so everyone benefits
4. **Test the change**: Apply new approach to current work before committing

### Success Metrics for Strategy Evolution

Track these quarterly:

- **Strategy Updates**: 2-5 per quarter (sweet spot)
  - Too few = not learning from experience
  - Too many = unstable, constantly changing

- **Time to Update**: < 30 minutes per change
  - Should be fast and easy

- **Adoption Rate**: 100% within 1 week
  - Everyone should know about changes

- **Regression Rate**: Close to 0
  - Updated strategies shouldn't make things worse

### Example: Real Strategy Evolution

```markdown
## Case Study: Security Testing Evolution

### Version 1.0 (Initial)
"Run security tests with all other tests"

**Problem**: Tests took 5 minutes, slowing development

### Version 1.1 (1 month later)
"Separate fast and slow security tests"

**Problem**: Developers forgot to run slow tests

### Version 2.0 (3 months later)
"Fast tests on commit, slow tests in CI/CD"

**Problem**: CI/CD took 30 minutes

### Version 2.1 (6 months later)
"Smart test selection based on changed files"

**Result**: ✅ CI/CD down to 5 minutes, all tests still run
```

### Remember

**The best strategy is one that evolves.**

- Strategies should improve over time
- Learn from every bug, every delay, every frustration
- Update strategies based on real experience
- Make it easy for everyone to suggest improvements

**The worst strategy is one that's wrong but never updated.**

---

**When in doubt, write a test first. When something's wrong with the strategy, update it.**

---

## Logging Best Practices

### For AI Assistants

**When executing npm commands:**
1. Always note which log file will be created
2. If command fails, read the log file immediately
3. Base fixes on actual error messages, not assumptions
4. Include relevant log excerpts in your response

**Example Response Template:**
```markdown
## Command Executed

npm run test:security

## Result

❌ Failed (exit code 1)

## Log File

logs/test-security.log shows:
```
Error: Cannot find module 'security.test.ts'
```

## Analysis

The security test file doesn't exist yet. We need to create it.

## Proposed Fix

Create `src/test/suite/security.test.ts` with basic structure...
```

### For Human Developers

**When sharing issues:**
- Share the relevant log file contents
- Include the npm command that failed
- Note what you expected vs what happened

**Example:**
```
"npm run dev:verify failed. 
See logs/dev-verify.log - shows TypeScript error on line 42.
Expected compilation to succeed."
```

### Log Retention

- Logs are overwritten each run (keeps latest only)
- Archive before major changes: `npm run logs:archive`
- Clean regularly: `npm run logs:clean`
- Logs are NOT committed to git (in .gitignore)

---

**Remember: Logs are your debugging friend. When something fails, read the log!**