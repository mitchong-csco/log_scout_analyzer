# AI Assistant Efficiency Guide 🤖

## Purpose

This guide helps AI assistants work efficiently with this project by leveraging:
- ✅ Automatic logging system
- ✅ Strategy documents with templates
- ✅ npm-driven automation
- ✅ Clear workflows and patterns
- ✅ User experience and lifecycle thinking

**Goal:** Enable AI assistants to help humans debug, implement, and test features with maximum efficiency while maintaining excellent user experience.

---

## 🎨 CRITICAL: UX & Extension Lifecycle Thinking

**MANDATORY PRINCIPLE:** Always think about user experience and extension lifecycle states.

### The Golden Rule: Empty States Are Not Errors

**❌ BAD UX:**
```typescript
// Showing an error when nothing is wrong
if (!data || data.length === 0) {
  showError("No data provider available - LSP may not be connected");
}
```

**✅ GOOD UX:**
```typescript
// Graceful empty state with helpful guidance
if (!data || data.length === 0) {
  showEmptyState({
    icon: "📂",
    title: "No files analyzed yet",
    message: "Open a log file to see analysis results",
    actions: ["Open File", "Learn More"]
  });
}
```

### Extension Lifecycle States to Consider

Every feature should handle these states gracefully:

1. **Initial State** (extension just activated)
   - No files open
   - No analysis run
   - Empty results
   - **Action:** Show welcome/getting-started UI

2. **Loading State** (processing in progress)
   - LSP analyzing files
   - Data being fetched
   - Commands executing
   - **Action:** Show progress indicators, disable buttons

3. **Active State** (working normally)
   - Files analyzed
   - Data available
   - User can interact
   - **Action:** Show full functionality

4. **Error State** (something actually went wrong)
   - LSP server crashed
   - File read failed
   - Network error
   - **Action:** Show clear error with recovery actions

5. **Disconnected State** (LSP not connected)
   - Server stopped
   - Connection lost
   - **Action:** Show reconnect option, don't block UI

### UX Checklist (Use for EVERY Feature)

Before implementing any UI feature, ask:

- [ ] **What does the user see when nothing has happened yet?**
  - Is it welcoming or intimidating?
  - Does it guide them to the next action?

- [ ] **What does the user see while waiting?**
  - Is there a loading indicator?
  - Can they cancel the operation?

- [ ] **What does the user see when something goes wrong?**
  - Is the error message helpful?
  - Can they recover without restarting VS Code?

- [ ] **What does the user see when returning after a break?**
  - Is their previous state preserved?
  - Do they need to re-analyze everything?

- [ ] **Does this error message actually indicate an error?**
  - Or is it just an empty/initial state?
  - Would a new user think something is broken?

### Examples from This Project

#### ❌ BAD: Misleading Error Message
```typescript
// scoutAnalyzerPanel.ts - OLD CODE
private _sendCurrentResults() {
  if (!ScoutAnalyzerPanel.resultsDataProvider) {
    this._postMessage({
      command: "resultsData",
      results: [],
      error: "No data provider available - LSP may not be connected"
    });
  }
}
```
**Problem:** Shows error when user hasn't opened any files yet. Makes them think extension is broken.

#### ✅ GOOD: Graceful Empty State
```typescript
// scoutAnalyzerPanel.ts - IMPROVED CODE
private _sendCurrentResults() {
  if (!ScoutAnalyzerPanel.resultsDataProvider) {
    this._postMessage({
      command: "emptyState",
      state: "initial",
      icon: "🔍",
      title: "Ready to analyze",
      message: "Open a log file to see analysis results",
      helpText: "Scout Analyzer will automatically detect patterns and issues."
    });
    return;
  }
  
  const results = ScoutAnalyzerPanel.resultsDataProvider.getResults();
  
  if (results.length === 0) {
    this._postMessage({
      command: "emptyState",
      state: "no-results",
      icon: "✨",
      title: "No issues found",
      message: "Your log file looks clean!",
      helpText: "If you expected to see results, check that the LSP server is connected."
    });
  } else {
    this._postMessage({
      command: "resultsData",
      results: results
    });
  }
}
```

#### ✅ GOOD: Results Tree Empty State
```typescript
// resultsTreeProvider.ts - GOOD EXAMPLE
private getRootItems(): ResultTreeItem[] {
  if (this.results.length === 0) {
    return [
      new ResultTreeItem(
        "No results",
        "Run analysis to see issues",
        vscode.TreeItemCollapsibleState.None,
        "empty"
      )
    ];
  }
  // ... show actual results
}
```

### UI State Machine Template

Use this pattern for all UI components:

```typescript
enum UIState {
  Initial,    // Nothing loaded yet
  Loading,    // Operation in progress
  Empty,      // No data (but not an error)
  Active,     // Has data, functioning normally
  Error,      // Actual error occurred
  Disconnected // LSP disconnected
}

function renderUI(state: UIState, data?: any, error?: Error) {
  switch(state) {
    case UIState.Initial:
      return renderWelcome();
    case UIState.Loading:
      return renderProgress();
    case UIState.Empty:
      return renderEmptyState();
    case UIState.Active:
      return renderData(data);
    case UIState.Error:
      return renderError(error);
    case UIState.Disconnected:
      return renderReconnect();
  }
}
```

### Key Principles

1. **Empty ≠ Error**: No data is a valid state, not a failure
2. **Guide, Don't Block**: Show next steps, don't just display errors
3. **Preserve State**: Cache results, remember preferences
4. **Progressive Enhancement**: Show partial data while loading more
5. **Recovery Actions**: Always provide a way to fix or retry
6. **Appropriate Icons**: 
   - 🔍 📂 ✨ = Neutral/helpful
   - ⚠️ = Warning (something might be wrong)
   - ❌ 🔴 = Error (something IS wrong)

### Testing UX States

When writing tests, verify ALL lifecycle states:

```typescript
describe('ActionPanel UX', () => {
  it('shows welcome state when no files opened', () => {
    // Test initial empty state
  });
  
  it('shows loading state during analysis', () => {
    // Test progress indicators
  });
  
  it('shows results when analysis complete', () => {
    // Test active state
  });
  
  it('shows helpful message when no issues found', () => {
    // Test empty results (not an error!)
  });
  
  it('shows error with recovery when LSP fails', () => {
    // Test actual error state
  });
});
```

---

## 🚨 MANDATORY: Always Update PROJECT_STATUS.md

**CRITICAL RULE:** After completing ANY work session, you MUST update PROJECT_STATUS.md

### When to Update (ALWAYS)
- ✅ After implementing features
- ✅ After creating tests
- ✅ After fixing bugs
- ✅ After creating documentation
- ✅ After discovering issues
- ✅ After completing analysis
- ✅ At end of every session

### What to Include
1. **Add new entry** to "RECENT CHANGES LOG" section (at the top)
2. **Session title**: Date + brief description
3. **What was done**: Bullet list of accomplishments
4. **Files created/modified**: List with line counts
5. **Key findings**: Important discoveries or blockers
6. **Status**: Current state (✅ Complete, ⚠️ In Progress, 🔴 Blocked)
7. **Next actions**: Clear next steps

### Template
```markdown
### Session: [Date] - [Brief Description] [Status Emoji]

**What Was Done**:
- ✅ [Accomplishment 1]
- ✅ [Accomplishment 2]
- ⚠️ [In Progress Item]

**Files Created/Modified**:
1. `path/to/file.ts` (XXX lines) - Description
2. `path/to/doc.md` (XXX lines) - Description

**Key Findings**:
- [Important discovery or blocker]
- [Performance insight]
- [Technical decision]

**Status**: ✅ [Complete/In Progress/Blocked]

**Next Actions**:
1. [Specific next step]
2. [Follow-up task]
3. [Dependency to resolve]
```

### Why This Matters
- 🎯 Maintains project continuity across sessions
- 🎯 Enables quick context loading for new chats
- 🎯 Documents decisions and findings
- 🎯 Prevents duplicate work
- 🎯 Tracks progress over time
- 🎯 Creates searchable project history

**Remember:** PROJECT_STATUS.md is THE source of truth. Update it EVERY session!

---

## 🔨 MANDATORY: Always Build Through npm

**CRITICAL RULE:** All builds MUST go through npm scripts. Never use raw cargo, tsc, or other build tools directly.

### Build Location: Root Folder ONLY

**MANDATORY**: All npm build commands must be run from the **root folder** (`log_scout_analyzer/`), NOT from subdirectories.

- ✅ **CORRECT**: `cd log_scout_analyzer && npm run build:all`
- ❌ **WRONG**: `cd vscode-extension && npm run build`
- ❌ **WRONG**: `cargo build --release` (direct cargo usage)

### Why Root Folder?

1. **Centralized package.json**: The root `package.json` orchestrates builds across all components
2. **Consistent paths**: Relative paths work correctly from root
3. **Cross-component builds**: LSP + Extension builds coordinate properly
4. **Version synchronization**: Versions update consistently across all components

### If Root package.json Doesn't Exist

**If you need to build and there's no root `package.json`:**

1. **Create root package.json** with build scripts:
   ```json
   {
     "name": "log-scout-analyzer-workspace",
     "version": "1.0.0",
     "private": true,
     "scripts": {
       "build:lsp": "cd lsp-server && cargo build --release",
       "build:extension": "cd vscode-extension && npm run compile",
       "build:all": "npm run build:lsp && npm run build:extension",
       "build:zed": "cd zed-extension && npm run build"
     }
   }
   ```

2. **Move from subdirectories**: If package.json exists in subdirectories, create root one that coordinates them

3. **Update AI_ASSISTANT_GUIDE.md**: Document the new root build process

### Standard Build Commands

From **root folder only**:

```bash
# Check code without full build (fast)
npm run check              # Check both LSP and extension
npm run check:lsp          # Check Rust LSP only

# Full builds (slower but complete)
npm run build:lsp          # Build Rust LSP server binary
npm run build:extension    # Build TypeScript extension
npm run build:all          # Build everything (LSP + extension)

# Development builds with auto-increment
npm run build:all          # Increments version, builds LSP + extension

# Package for distribution
npm run package            # Build + create VSIX package
```

### What npm Build Scripts Do

1. **Coordinate multi-language builds**: 
   - Rust (cargo) for LSP server
   - TypeScript (tsc) for VS Code extension
   - WASM (cargo) for Zed extension

2. **Handle paths correctly**:
   - Copy LSP binary to extension's `bin/` folder
   - Resolve cross-workspace dependencies

3. **Version synchronization**:
   - Update version numbers consistently
   - Generate build info files

4. **Platform detection**:
   - Build correct LSP binary name (`.exe` on Windows)
   - Copy to correct location

### Why NOT Direct cargo/tsc?

❌ **DON'T DO THIS:**
```bash
cd lsp-server
cargo build --release    # Wrong! Binary won't be copied to extension
```

❌ **DON'T DO THIS:**
```bash
cd vscode-extension
tsc -p ./                # Wrong! LSP won't be built, versions won't sync
```

✅ **DO THIS:**
```bash
cd log_scout_analyzer    # Always start from root
npm run build:all        # Let npm orchestrate everything
```

### Quick Reference

| Task | Command (from root) | What It Does |
|------|---------------------|--------------|
| Quick check | `npm run check` | Fast syntax/type check (no build) |
| Build LSP only | `npm run build:lsp` | Cargo build + copy binary |
| Build extension only | `npm run build:extension` | TypeScript compile |
| Build everything | `npm run build:all` | Version bump + LSP + extension |
| Create package | `npm run package` | Build all + create .vsix |
| Check versions | `npm run status` | Show current versions |

### For Zed Extension

Same principle applies:

```bash
cd log_scout_analyzer         # Root folder
npm run build:zed            # Builds Zed extension
```

### Remember

- 🔨 **Always from root folder**: `cd log_scout_analyzer` first
- 🔨 **Always use npm**: Let npm orchestrate builds
- 🔨 **Never direct cargo/tsc**: npm handles the complexity
- 🔨 **Create root package.json if missing**: Centralize build logic
- 🔨 **Document in this guide**: Keep build process clear

---

## Quick Start for AI Assistants

### 1. Always Read These First

When starting work on this project:

```
Priority 1: PROJECT_STATUS.md - Current project state (ALWAYS READ FIRST!)
Priority 2: .zed/rules.md - Mandatory TDD workflow
Priority 3: .zed/NPM_AUTOMATION.md - All available npm commands
Priority 4: .zed/LOGGING.md - How to read logs when commands fail
Priority 5: vscode-extension/UI_TESTING_GUIDE.md - UI testing (for extension work)
```

**Note:** After reading PROJECT_STATUS.md at the start, you MUST update it at the end!

### 2. When Commands Fail

**DON'T:** Guess what went wrong
**DO:** Read the log file

```bash
Human: "npm run test:security failed"

AI Response:
"Let me check logs/test-security.log..."
[Read the actual log file]
"I see the error: 'Cannot find module security.test.ts'.
The test file doesn't exist yet. Should I create it?"
```

### 3. Use Strategy Document Templates

**DON'T:** Invent your own test patterns
**DO:** Use templates from strategy documents

```
"I'll create security tests using the template from 
SECURITY_TESTING.md section 1 (Input Validation Tests)..."
```

### 4. Use UI Testing Infrastructure (For VS Code Extension)

**DON'T:** Try to test VS Code UI without the framework
**DO:** Use the established testing infrastructure

```
"For this VS Code command, I'll write:
1. Wiring test (fast - 8ms) to validate configuration
2. UI component test to mock the file picker
3. Integration test to verify the full workflow

See vscode-extension/UI_TESTING_GUIDE.md for examples."
```

---

## 🛡️ Command Contract Testing (MANDATORY for LSP Commands)

**When to Use**: ANY time you add, modify, or remove LSP commands

**Rule**: Schema → Implementation → Tests (in that order)

### Quick Process

1. **Update Schema First** (`lsp-commands.schema.json`)
   ```json
   "scout/bundle/newCommand": {
     "description": "What it does",
     "request": { "param": { "type": "string", "required": true } },
     "response": { "result": { "type": "boolean" } }
   }
   ```

2. **Implement in Rust** (`lsp-server/src/server.rs`)
   ```rust
   "scout/bundle/newCommand" => {
       // Handler code
   }
   ```

3. **Use in TypeScript** (`vscode-extension/src/*.ts`)
   ```typescript
   await client.sendRequest("scout/bundle/newCommand", { param: value });
   ```

4. **Run Contract Tests** (MANDATORY)
   ```bash
   ./scripts/test-command-contracts.sh
   ```

5. **Must Pass Before Commit**
   - ✅ All schema commands have handlers
   - ✅ All handlers are in schema
   - ✅ Command names match exactly
   - ✅ No old "logScout.*" format

**Enforcement**: Contract tests fail → Cannot proceed → Fix mismatches

**See**: `COMMAND_CONTRACT_TESTING_QUICK_START.md` for full guide

---

## Core Workflow for AI Assistants

**Remember:** Always consider UX lifecycle states before implementing!

### Phase 1: Planning (Before Writing Code)

```markdown
1. Read PROJECT_STATUS.md (current state, blockers, next steps)
2. Understand the request
3. Check relevant strategy document:
   - Security feature? → .zed/SECURITY_TESTING.md
   - Performance critical? → .zed/PERFORMANCE_TESTING.md
   - API change? → .zed/CONTRACT_TESTING.md
   - Need test data? → .zed/TEST_DATA_MANAGEMENT.md
   - Adding LSP command? → COMMAND_CONTRACT_TESTING_QUICK_START.md
4. Identify which templates to use
5. Plan test scenarios
6. If adding/modifying LSP commands:
   - Check lsp-commands.schema.json first
   - Plan to update schema, Rust, and TypeScript together
```

### Phase 2: Implementation (TDD - RED)

```markdown
1. Write tests FIRST using strategy templates
2. If adding LSP commands:
   - Update lsp-commands.schema.json FIRST
   - This is your contract - define it before implementation
3. Run: npm run test:wiring (or relevant test command)
4. Tests should FAIL (RED phase)
5. If tests pass unexpectedly, they're wrong - rewrite them
```

### Phase 3: Implementation (TDD - GREEN)

```markdown
1. Write minimal code to pass tests
2. If implementing LSP commands:
   - Add handler in lsp-server/src/server.rs
   - Add usage in vscode-extension/src/*.ts
   - Command names must match schema exactly (copy-paste!)
3. Build from root folder: cd log_scout_analyzer && npm run build:all
4. Run: npm run test:wiring (from root)
5. Tests should PASS (GREEN phase)
6. If tests fail, read logs/[test-name].log
7. Fix based on actual error (not guessing)

REMEMBER: Always build from root folder using npm scripts!
```

### Phase 4: Verification

```markdown
1. Build from root: cd log_scout_analyzer && npm run build:all
2. Run: npm run dev:verify (from root)
3. If LSP commands were added/modified:
   - Run: ./scripts/test-command-contracts.sh (or .bat on Windows)
   - All contract tests MUST pass before committing
   - If tests fail, fix mismatches immediately
4. Check: logs/dev-verify.log if failures
5. Ensure all tests pass
6. Check package & deployment status: npm run status (MANDATORY!)
7. Document what was done
8. UPDATE PROJECT_STATUS.md with session summary (MANDATORY!)
9. Include status report at end of response (MANDATORY!)

REMEMBER: 
- Always cd to root folder first: cd log_scout_analyzer
- Always use npm scripts for builds: npm run build:all
- Never use cargo or tsc directly
- Always run npm run status and report versions/deployment readiness
```

---

## Reading Logs Efficiently

### When to Read Logs

**ALWAYS read logs when:**
- ❌ Any npm command fails
- ❌ Tests fail
- ❌ Compilation fails
- ❌ Security checks fail
- ❌ Human reports an issue

**ALWAYS check PROJECT_STATUS.md when:**
- ✅ Starting a new session
- ✅ Continuing previous work
- ✅ Encountering blockers
- ✅ Before making major changes

### How to Read Logs

```markdown
1. Identify the log file: logs/[command-name].log
2. Read the ENTIRE log (don't skim)
3. Find the actual error message
4. Identify the root cause
5. Propose fix based on actual error
```

### Example: Efficient Log Reading

```
Human: "Tests are failing"

AI (Inefficient):
"Try running npm install. Maybe dependencies are missing."
❌ Guessing without data

AI (Efficient):
"Let me check which tests failed by reading the log..."
[Reads logs/test-all.log]
"I see from logs/test-all.log:
  - Line 42: 'Expected true, got false in security.test.ts:15'
  - Line 58: 'TypeError: Cannot read property of undefined'

The security test at line 15 is checking XSS sanitization.
The error shows the HTML isn't being escaped. 
I need to update the sanitizeInput function to escape '<' and '>'."
✅ Based on actual data
```

---

## Strategy Document Reference

### Security Testing (.zed/SECURITY_TESTING.md)

**When to use:** Implementing features that handle:
- User input
- File paths
- Commands/shell operations
- Sensitive data (passwords, API keys)
- Authentication/authorization

**What you get:**
- Test templates for 5 security categories
- Security checklist
- Common vulnerabilities to test
- Best practices

**How to use:**
```
1. Read relevant section (e.g., "Input Validation Tests")
2. Copy test template
3. Adapt to your feature
4. Run: npm run test:security
5. Check: logs/test-security.log if failures
```

### Performance Testing (.zed/PERFORMANCE_TESTING.md)

**When to use:** Implementing features that:
- Process large files
- Handle many items (tree views, lists)
- Perform expensive operations (parsing, searching)
- Run frequently (on every keystroke)

**What you get:**
- Performance budgets for operations
- Test templates for performance testing
- Optimization techniques
- Benchmarking patterns

**How to use:**
```
1. Check performance budget for your operation type
2. Create performance test using template
3. Run: npm run test:performance
4. If exceeds budget, apply optimization from document
5. Check: logs/test-performance.log for measurements
```

### Contract Testing (.zed/CONTRACT_TESTING.md)

**When to use:** Making changes to:
- Public APIs (exported functions/classes)
- LSP protocol handlers
- VS Code extension APIs
- Data formats (JSON schemas)

**What you get:**
- Contract test templates
- Versioning rules (semantic versioning)
- Breaking change detection
- Backward compatibility patterns

**How to use:**
```
1. Before changing API, read "When Changing Existing APIs"
2. Create contract test using template
3. Run: npm run test:all
4. Check: logs/test-all.log for contract violations
5. Ask human before making breaking changes
```

### Test Data Management (.zed/TEST_DATA_MANAGEMENT.md)

**When to use:** Need test data for:
- Log files
- Archives
- Configuration files
- Edge cases
- Large datasets

**What you get:**
- Fixture organization strategy
- Fixture builder utilities
- Validation scripts
- Best practices

**How to use:**
```
1. Check if fixture exists in src/test/fixtures/
2. If not, use FixtureBuilder to create
3. Run: npm run test:validate-fixtures
4. Check: logs/test-validate-fixtures.log
```

### UI Testing (VS Code Extension) - NEW (Feb 21, 2024)

**When to use:** Implementing VS Code extension UI features:
- Commands with dialogs
- Tree views
- Webviews
- Status bar items
- User interactions

**What you get:**
- Three-tier testing strategy (wiring, integration, manual)
- Example tests for tree views and commands
- Mock patterns for VS Code APIs
- Integration test orchestrator

**Documentation:**
- `vscode-extension/UI_TESTING_GUIDE.md` - Comprehensive guide (882 lines)
- `vscode-extension/UI_TESTING_RECOMMENDATIONS.md` - Action plan (650 lines)
- `vscode-extension/UI_TESTING_QUICK_REF.md` - Quick reference (500 lines)

**How to use:**
```
1. Write wiring test (validates package.json config)
2. Run: npm run test:wiring (8ms - instant feedback)
3. Write UI component test (mocks dialogs, tests interactions)
4. Write integration test (full VS Code API access)
5. Run: npm test (30s - launches VS Code Extension Host)
6. Check: Test results in console
```

**Example UI Test Pattern:**
```typescript
// Mock file picker
test('Should show file picker', async () => {
  const original = vscode.window.showOpenDialog;
  vscode.window.showOpenDialog = async (options) => {
    // Test logic
    return [vscode.Uri.file('/test/file.zip')];
  };
  
  try {
    await vscode.commands.executeCommand('myCommand');
    // Assertions
  } finally {
    vscode.window.showOpenDialog = original; // Always restore!
  }
});
```

**Test Tiers:**
- **Tier 1: Wiring (8ms)** - Config validation, no VS Code launch
- **Tier 2: Integration (30s)** - Full VS Code Extension Host with API access
- **Tier 3: Manual (5-10min)** - Human validation of UX

**Status**: ✅ Infrastructure 100% operational (verified Feb 21, 2024)
- 78/81 tests passing in real test run
- VS Code Extension Host launches successfully
- Full `vscode` API accessible in tests
- Ready for TDD workflow on UI features

---

## Efficiency Patterns

### Pattern 1: Template-Driven Development

**DON'T:**
```
"I'll write a test for this security feature..."
[Invents custom test structure]
```

**DO:**
```
"I'll use the Input Validation template from SECURITY_TESTING.md section 1..."
[Copy template, adapt to feature]
```

**Why:** Templates are proven patterns. Don't reinvent.

---

### Pattern 2: Log-Driven Debugging

**DON'T:**
```
"The test failed. Let me try changing [random thing]..."
```

**DO:**
```
"Let me read logs/test-security.log to see the actual error..."
[Read log]
"Line 42 shows: 'Expected <safe>, got <script>alert()</script>'.
The sanitization isn't escaping script tags. I'll fix the regex."
```

**Why:** Fix actual problems, not imagined ones.

---

### Pattern 3: Incremental Verification

**DON'T:**
```
"I'll implement all features, then test at the end..."
```

**DO:**
```
1. Write test for feature A
2. Run: npm run test:wiring
3. Implement feature A
4. Run: npm run test:wiring
5. Verify A works, then move to B
```

**Why:** Catch issues immediately, not at the end.

---

### Pattern 4: Strategy-First Development

**DON'T:**
```
"I'll implement this, then figure out how to test it..."
```

**DO:**
```
1. Check relevant strategy document
2. Understand test requirements
3. Use templates
4. Write tests first
5. Implement to pass tests
```

**Why:** Strategy documents prevent common mistakes.

---

## Common Scenarios

### Scenario 1: Adding a New Feature

```markdown
1. Human requests: "Add progress indicator to import"

2. AI reads: PLANNING_TEMPLATES.md for feature template

3. AI creates test plan:
   - Test 1: Progress shown when import starts
   - Test 2: Progress updates during import
   - Test 3: Progress closes when complete

4. AI writes tests using template (RED)

5. AI implements feature (GREEN)

6. AI builds from root: cd log_scout_analyzer && npm run build:all

7. AI runs: npm run dev:verify (from root)

8. AI checks: logs/dev-verify.log (all passing)

8. AI documents in FEATURES.md

9. Ready for human review
```

### Scenario 2: Fixing a Bug

```markdown
1. Human reports: "Import crashes on large files"

2. AI asks: "Can you run: npm run test:performance"

3. Human runs, it fails

4. AI reads: logs/test-performance.log

5. AI sees: "Memory usage: 2GB (budget: 500MB)"

6. AI checks: PERFORMANCE_TESTING.md for memory optimization

7. AI applies: Streaming instead of loading entire file

8. AI builds from root: cd log_scout_analyzer && npm run build:all

9. AI tests: npm run test:performance (from root)

10. AI verifies: logs/test-performance.log shows 450MB usage

11. Ready for human review
```

### Scenario 3: Security Issue

```markdown
1. Human: "Found XSS vulnerability in filename display"

2. AI reads: SECURITY_TESTING.md section 1

3. AI writes test that reproduces XSS (RED)

4. AI builds from root: cd log_scout_analyzer && npm run build:all

4. AI runs: npm run test:security (fails as expected)

5. AI checks: logs/test-security.log confirms XSS reproduced

6. AI implements: HTML escaping for filenames

7. AI runs: npm run test:security (passes)

8. AI runs: npm run security:check-all

9. AI checks: logs/security-check-all.log (no issues)

10. Ready for human review
```

---

## Response Templates

### Template 1: Successful Implementation

```markdown
## Feature: [Name]

### Tests Created (RED → GREEN)
1. File: `src/test/suite/[name].test.ts`
2. Tests: 3 tests covering happy path, error cases, edge cases
3. Template used: [Strategy doc] section [X]

### Implementation
- File: `src/[file].ts`
- Lines: [X-Y]
- Approach: [Brief description]

### Verification
```bash
npm run dev:verify
# Output saved to logs/dev-verify.log
✅ All tests passing (27/27)
✅ Compilation successful
✅ No security issues
```

### Manual QA Steps
1. [Step 1]
2. [Step 2]
3. Expected result: [Description]

### PROJECT_STATUS.md Updated
✅ Added session entry to RECENT CHANGES LOG
✅ Documented files created and findings
✅ Listed next actions

### Ready for Review
All automated tests passing. Human can verify with manual QA steps above.

---

## 📦 Package & Deployment Status

**Command Run**: `npm run status` (from log_scout_analyzer/)

**Current Versions**:
- Extension: v0.0.XXX
- LSP Server: v0.1.XX

**Build Status**:
- Last Build: [date/time or "X hours ago"]
- LSP Binary: [filename, size, date]

**Package Status**:
- VSIX File: ✅ Exists (vX.X.XXX) / ⚠️ Not created

**Deployment Readiness**:
- Status: ✅ Ready to deploy / ⚠️ Not ready / 🔴 Blocked
- Next Step: [what needs to happen]

**Recommended Action**:
- [ ] `npm run package` to create VSIX
- [ ] `npm run deploy` when ready
```

### Template 2: Command Failed - Need Help

```markdown
## Issue: [Command] Failed

### Command Executed
```bash
npm run [command]
```

### Log Analysis
I read `logs/[command-name].log` which shows:
```
[Actual error from log]
```

### Root Cause
[Analysis based on log]

### What I Tried
1. [Attempt 1] - [Result]
2. [Attempt 2] - [Result]

### Question
[Specific question for human based on actual error]

---

## 📦 Package & Deployment Status

**Command Run**: `npm run status` (from log_scout_analyzer/)

**Current Versions**:
- Extension: v0.0.XXX
- LSP Server: v0.1.XX

**Build Status**:
- Last Build: [date/time]
- Issue Encountered: [brief description]

**Deployment Readiness**:
- Status: 🔴 Blocked - Need help resolving [issue]
- Next Step: Awaiting human guidance on [question]
```

### Template 3: Security Implementation

```markdown
## Security Implementation: [Feature]

### Security Categories Covered
- ✅ Input validation (SECURITY_TESTING.md section 1)
- ✅ Injection prevention (SECURITY_TESTING.md section 4)
- ⚠️ Authentication not applicable (no auth in this feature)

### Tests Created
File: `src/test/suite/security.test.ts`
- Test 1: Path traversal prevention
- Test 2: XSS prevention
- Test 3: Command injection prevention

### Verification
```bash
npm run test:security
# Output saved to logs/test-security.log
✅ All 3 security tests passing

npm run security:check-all
# Output saved to logs/security-check-all.log
✅ No vulnerabilities found
```

### Security Checklist
- [x] All inputs validated
- [x] No secrets in logs
- [x] HTML properly escaped
- [x] Commands use safe API (no shell=true)

### Ready for Review
All security tests passing. Human can verify security report.

---

## 📦 Package & Deployment Status

**Command Run**: `npm run status` (from log_scout_analyzer/)

**Current Versions**:
- Extension: v0.0.XXX
- LSP Server: v0.1.XX

**Build Status**:
- Last Build: [date/time]
- Security Tests: ✅ All passing

**Deployment Readiness**:
- Status: ✅ Ready to deploy (security verified)
- Next Step: Run `npm run package` when ready
```

---

## Key Principles

### 1. Read Logs, Don't Guess
```
❌ "Maybe it's a dependency issue..."
✅ "Let me check logs/test-all.log... I see the actual error is..."
```

### 2. Use Templates, Don't Invent
```
❌ "I'll create my own test structure..."
✅ "I'll use the template from SECURITY_TESTING.md section 1..."
```

### 3. Test First, Always
```
❌ "I'll implement first, then add tests..."
✅ "I'll write the test first (RED), then implement (GREEN)..."
```

### 4. Verify Frequently
```
❌ "I'll test everything at the end..."
✅ "I'll run npm run test:wiring after each small change..."
```

### 5. Document Actions
```
❌ "I made changes..."
✅ "I created tests in [file], implemented [feature], verified with [command]..."
```

### 6. Ask When Unsure
```
❌ "I'll try this approach and see what happens..."
✅ "This could be a breaking change. Should I deprecate instead?"
```

### 7. Always Update PROJECT_STATUS.md
```
❌ "I finished the feature. Here's what I did..."
✅ "I finished the feature. Here's what I did... [Updates PROJECT_STATUS.md]
    Added session entry with files created, findings, and next steps."
```

---

## npm Commands Cheat Sheet

### Testing
```bash
npm run test:wiring          # Fast unit tests (16ms)
npm run test:security        # Security tests
npm run test:performance     # Performance tests
npm run test:all             # All tests
```

### Development
```bash
npm run dev:test-fast        # Quick check
npm run dev:pre-commit       # Before commit
npm run dev:verify           # Full verification
```

### Security
```bash
npm run security:check-all   # Full security audit
npm run security:report      # Generate report
```

### Logs
```bash
npm run logs:view-latest     # View all recent logs
npm run logs:clean           # Clean old logs
```

**All commands save logs to `logs/[command-name].log`**

---

## Success Metrics

You're being an efficient AI assistant when:

✅ You read logs before proposing fixes
✅ You use templates from strategy documents
✅ You write tests before code (TDD)
✅ You verify frequently with npm commands
✅ **You ALWAYS build from root folder using npm scripts**
✅ You document what you did clearly
✅ You ask questions when unsure
✅ You update strategy documents when you find gaps
✅ **You ALWAYS update PROJECT_STATUS.md at end of session**

❌ You're NOT efficient when:

- Guessing without reading logs
- Inventing custom test patterns
- Skipping tests
- Making changes without verification
- **Using cargo or tsc directly instead of npm scripts (CRITICAL FAILURE)**
- **Building from subdirectories instead of root (CRITICAL FAILURE)**
- Providing vague responses
- Breaking APIs without asking
- **Forgetting to update PROJECT_STATUS.md (CRITICAL FAILURE)**

---

## Remember

**Humans trust AI assistants who:**
1. Base fixes on actual data (logs)
2. Follow established patterns (templates)
3. Test thoroughly (TDD)
4. **Always build from root folder using npm scripts (MANDATORY)**
5. **Report package & deployment status every session (MANDATORY)**
6. Document clearly
7. Ask before breaking things
8. **Update PROJECT_STATUS.md every session (MANDATORY)**

**Make the human's job easy:**
- They just review your work
- They don't debug your guesses
- They don't write tests you skipped
- They don't fix your breaking changes
- **They don't fix build issues because you used cargo/tsc directly**
- **They know exactly what state the project is in (because you ran npm run status)**
- **They can pick up where you left off (because you updated PROJECT_STATUS.md)**

**You have all the tools:**
- Strategy documents with templates
- Automatic logging of all commands
- npm automation for everything
- Clear workflows and patterns
- **PROJECT_STATUS.md for continuity**

**Use them efficiently!** 🚀

---

## 🚨 Token Management & Session Checkpoints

**CRITICAL**: Claude sessions limit to ~128k-200k tokens (plan for 128k)

### Token Usage Thresholds

| Tokens Used | Status | Action Required |
|-------------|--------|-----------------|
| 0-50k | 🟢 Safe | Continue normally |
| 50k-90k | 🟡 Caution | Plan checkpoint soon |
| 90k-110k | 🟠 Warning | **CREATE CHECKPOINT NOW** |
| 110k-120k | 🔴 Critical | **STOP NEW WORK - COMMIT & DOCUMENT** |
| 120k+ | 🚨 Emergency | **IMMEDIATE CHECKPOINT - END SESSION** |

### When to Checkpoint

**Checkpoint at 90k tokens (70%) OR when:**
- Completed a major feature/milestone
- About to start new major work
- User asks "what's next?"
- Haven't committed in 30+ minutes of work

### Checkpoint Protocol (Quick) - AI EXECUTES

1. ✅ **AI commits all work via terminal tool** (git add + git commit)
2. ✅ **AI updates PROJECT_STATUS.md** (add session entry)
3. ✅ **AI creates checkpoint document** (if >90k tokens)
4. ✅ **AI notifies user** (commits made, ready for next session or continue)

**AI uses terminal tool to execute git commands - do NOT ask user to run scripts!**

**See**: `.zed/SESSION_CHECKPOINT_PROTOCOL.md` for detailed protocol

---

## 📋 End of Session Checklist

Before finishing ANY session, verify:

### Code & Testing
- [ ] Tests written and passing (if applicable)
- [ ] Code implemented and verified (if applicable)
- [ ] Logs checked for any issues
- [ ] Command contract tests run (if LSP commands added/modified)

### Documentation
- [ ] Documentation created/updated (if applicable)
- [ ] **PROJECT_STATUS.md updated with session summary** ⚠️ MANDATORY
- [ ] Next actions clearly defined
- [ ] Any blockers documented

### Package & Deployment Status (MANDATORY - Always Report)
- [ ] **Run status command**: `npm run status` (from root)
- [ ] **Report current versions**: Extension version + LSP version
- [ ] **Report build status**: When was last build, binary size/date
- [ ] **Report package status**: VSIX exists? Version matches?
- [ ] **Report deployment readiness**: Ready to deploy? Blockers?
- [ ] **Include status in session summary** (copy output to documentation)

**Status Report Template**:
```
📦 Package & Deployment Status:
- Extension Version: v0.0.XXX
- LSP Version: v0.1.XX
- Last Build: [date/time]
- VSIX Package: ✅ Exists / ⚠️ Not created
- Deployment Ready: ✅ Yes / ⚠️ Needs [action]
- Blockers: None / [list blockers]
```

### Git Commit Strategy (MANDATORY - AI EXECUTES AUTOMATICALLY)

**AI MUST commit all work at end of session - this is REQUIRED, not optional!**

#### Commit Protocol (AI Executes Directly)

1. **Check Status**:
   ```bash
   git status --short
   ```

2. **Stage All Changes**:
   ```bash
   git add -A
   ```

3. **Commit with Descriptive Message**:
   ```bash
   git commit -m "feat: [Brief title]
   
   - [Change 1]
   - [Change 2]
   - [Change 3]
   - [Test results]
   - [Documentation updates]
   
   [Optional: Closes/Fixes/Relates to issue]"
   ```

4. **Verify Commit**:
   ```bash
   git log --oneline -1
   ```

5. **Confirm Clean State**:
   ```bash
   git status --short  # Should show nothing or just untracked files
   ```

#### Commit Message Format

Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code restructuring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

#### Example Good Commit Message

```
feat: Complete bundle import with 4 major enhancements

- Fix LSP command routing (scout/bundle/* format support)
- Implement file persistence (copy to bundle dir, preserve all files)
- Add workspace integration (auto-add bundle folder to Explorer)
- Add QCSOne integration (case ID required, simplified naming, right-click link)
- All 83 tests passing, 2 tests updated for new behavior
- Comprehensive documentation added (4 docs, 1500+ lines)

Closes: Bundle import now production ready with enhanced UX
```

#### When to Commit

- ✅ End of every session (MANDATORY)
- ✅ After completing a logical feature/fix
- ✅ After tests pass
- ✅ After documentation updates
- ✅ Before creating checkpoints (>90k tokens)

#### What AI MUST Do

- ✅ Execute `git add` and `git commit` directly via terminal
- ✅ Create one or more logical commits (group related changes)
- ✅ Write clear, descriptive commit messages
- ✅ Verify commits succeeded
- ✅ Check for any remaining uncommitted changes
- ❌ DO NOT ask user to run git commands
- ❌ DO NOT skip commits due to "too many files"
- ❌ DO NOT assume user will commit later

#### Push Strategy

- ⚠️ **AI asks user permission before pushing**
- Only push if work is stable and tested
- Command: `git push` (only after user approval)

**REMEMBER: Commits preserve work history and enable recovery. Always commit at session end!**

### Session Checkpoint (if >90k tokens)
- [ ] **Create checkpoint document** (see `.zed/SESSION_CHECKPOINT_PROTOCOL.md`)
- [ ] **Document exact stopping point** (file, line, next action)
- [ ] **Save all context** for next session
- [ ] **Notify user** session can resume seamlessly

### Token Management
- [ ] **Check current token usage** (aim to checkpoint before 90k tokens)
- [ ] **If >90k tokens**: Create checkpoint NOW
- [ ] **If >110k tokens**: STOP new work, commit & document only

---

## 📊 Final Status Report Template

**Copy this to the end of your response when finishing ANY session:**

```markdown
---

## 📦 Package & Deployment Status

**Command Run**: `npm run status` (from log_scout_analyzer/)

**Current Versions**:
- Extension: v0.0.XXX
- LSP Server: v0.1.XX

**Build Status**:
- Last Build: [date/time or "X hours ago"]
- LSP Binary: [filename, size, date]
- Extension Compiled: ✅ Yes / ⚠️ Needs rebuild

**Package Status**:
- VSIX File: ✅ Exists (vX.X.XXX) / ⚠️ Not created
- Location: [path to .vsix file] / N/A

**Deployment Readiness**:
- Status: ✅ Ready to deploy / ⚠️ Not ready / 🔴 Blocked
- Reason: [explanation]
- Next Step: [what needs to happen before deployment]

**Blockers** (if any):
- [List any blockers preventing deployment]

**Recommended Action**:
- [ ] Ready to package: `npm run package`
- [ ] Ready to deploy: [deployment command]
- [ ] Needs work: [what needs to be done]
```

**Why This Matters**:
- Human knows exactly what state the project is in
- Clear whether work is deployment-ready
- Identifies blockers immediately
- Provides next actionable steps
- Creates deployment audit trail

**Critical Rules:**
1. ⚠️ PROJECT_STATUS.md update is MANDATORY every session
2. ⚠️ AI MUST commit all work before ending session (use terminal tool)
3. ⚠️ Checkpoint required if token usage >90k (70% of 128k limit)
4. ⚠️ Never end session with uncommitted work
5. ⚠️ AI has terminal access - execute git commands directly, don't ask user

**Commit Strategy**: AI assistant executes commits automatically at checkpoints!

**AI Commit Workflow**:
```bash
# AI executes these commands via terminal tool:
git add [files]
git commit -m "descriptive message"
git log --oneline -5  # verify
git status --short    # check remaining
# Ask user permission before: git push
```