# AI Assistant Development Guide

## Purpose

Help AI assistants deliver high-quality features using:
- **Scenario-Test-Driven Development (STDD)** - User scenarios drive tests, tests drive code
- **UX-First Thinking** - Consider all lifecycle states before implementing
- **Git + CI/CD** - Proper commits, GitHub Actions validation

**Goal:** Ship working features that users love, validated by automated tests.

> **Note:** This guide applies to all AI assistants (Windsurf, Zed, Cursor, Claude, etc.)
---

## 🎯 Core Principle: STDD (Scenario-Test-Driven Development)

### The Workflow

```
1. User Scenario → 2. Write Test (RED) → 3. Implement (GREEN) → 4. Git Commit → 5. CI Validates
```

### Example: User wants to import RTMT bundle

**Step 1: Understand the scenario**
```
User opens VS Code → Clicks "Import Package" → Selects RTMT.zip 
→ Sees progress indicator → Bundle appears in Explorer → Issues show in Problems Panel
```

**Step 2: Write the test (RED phase)**
```typescript
// vscode-extension/src/test/suite/e2e/bundleImport.test.ts
test('User imports RTMT bundle and sees results', async () => {
  // Given: User has an RTMT bundle
  const bundlePath = path.join(testDataDir, 'sample-rtmt.zip');
  
  // When: User imports the bundle
  await vscode.commands.executeCommand('logScout.importPackage', bundlePath);
  
  // Then: Bundle appears in tree view
  const bundles = await bundleTreeProvider.getChildren();
  assert.strictEqual(bundles.length, 1);
  
  // And: Diagnostics appear in Problems Panel
  const diagnostics = vscode.languages.getDiagnostics();
  assert.ok(diagnostics.length > 0, 'Should have diagnostics');
});
```

**Step 3: Run test - it should FAIL**
```bash
npm test
# Expected: Test fails because importPackage not implemented yet
```

**Step 4: Implement minimum code to pass**
```typescript
// vscode-extension/src/bundleTreeProvider.ts
async importPackage(archivePath: string): Promise<void> {
  // Extract archive
  // Parse logs
  // Add to tree view
  // Trigger LSP analysis
}
```

**Step 5: Test passes (GREEN) → Commit**
```bash
git add -A
git commit -m "feat: implement RTMT bundle import

- Add importPackage command
- Extract zip archives
- Display in tree view
- Trigger LSP analysis
- Test: e2e/bundleImport.test.ts passes"

git push
```

**Step 6: CI validates**
- GitHub Actions runs all tests
- If green: feature is validated
- If red: fix before merging

---

## 🎨 UX-First Thinking: Extension Lifecycle States

**CRITICAL:** Before implementing ANY UI feature, design for ALL states.

### The 5 States Every Feature Must Handle

#### 1. Initial State (Nothing loaded yet)
```typescript
// ❌ BAD: Shows error when nothing is wrong
if (!data) {
  showError("No data available");
}

// ✅ GOOD: Welcoming empty state
if (!data) {
  return {
    icon: "📂",
    title: "Ready to start",
    message: "Open a log file or import a bundle",
    actions: ["Import Bundle", "Open File"]
  };
}
```

#### 2. Loading State (Operation in progress)
```typescript
// ✅ Show progress, allow cancel
await vscode.window.withProgress({
  location: vscode.ProgressLocation.Notification,
  title: "Importing bundle...",
  cancellable: true
}, async (progress, token) => {
  // Implementation
});
```

#### 3. Active State (Working normally)
```typescript
// ✅ Show data, enable all features
return resultsTreeProvider.refresh();
```

#### 4. Empty Result State (No data, but not an error)
```typescript
// ✅ Helpful message, not alarming
if (results.length === 0) {
  return {
    icon: "✨",
    title: "No issues found",
    message: "Your logs look clean!"
  };
}
```

#### 5. Error State (Something actually failed)
```typescript
// ✅ Clear error, recovery action
catch (error) {
  vscode.window.showErrorMessage(
    `Failed to import bundle: ${error.message}`,
    "Retry", "View Logs"
  );
}
```

### UX Checklist (Use Before Every Implementation)

- [ ] What does user see when nothing has happened yet?
- [ ] What does user see while waiting?
- [ ] What does user see if operation succeeds but returns no data?
- [ ] What does user see if operation fails?
- [ ] Can user recover without restarting VS Code?

---

## 🔨 Build & Test Commands

### Always Run from Root Directory

```bash
# Navigate to root first
cd log_scout_analyzer

# Build everything (LSP + Extension)
npm run build:all

# Run tests
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests

# Check without building (fast)
npm run check              # TypeScript + Rust check

# Package for distribution
npm run package            # Creates .vsix file
```

### Why Use npm Scripts?

- ✅ Coordinates Rust (cargo) + TypeScript (tsc) builds
- ✅ Copies LSP binary to correct location
- ✅ Syncs versions across components
- ✅ Works on Windows, Mac, Linux

### ❌ Don't Do This

```bash
cd lsp-server
cargo build --release      # Wrong! Binary won't copy to extension

cd vscode-extension  
tsc -p ./                  # Wrong! LSP won't build, versions won't sync
```

---

## 📝 Git Workflow

### Commit After Every Completed Feature

```bash
# 1. Check what changed
git status

# 2. Stage all changes
git add -A

# 3. Commit with clear message
git commit -m "feat: add RTMT bundle import

- Implement importPackage command
- Add archive extraction
- Add tree view provider
- Add LSP integration
- Tests: e2e/bundleImport.test.ts passes (12 assertions)

Closes #45"

# 4. Push to trigger CI
git push
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <brief summary>

<details>
- What was added/changed
- What tests validate it
- Issue references

<footer>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `test:` - Test additions/changes
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `chore:` - Maintenance

### When to Commit

- ✅ After tests pass (GREEN phase)
- ✅ After completing a logical unit of work
- ✅ Before switching to different task
- ✅ End of work session

### What NOT to Commit

- ❌ Commented-out code (delete it)
- ❌ `console.log` debug statements (remove them)
- ❌ Failing tests (fix them first)
- ❌ Unused imports (clean them up)

---

## 🤖 GitHub Actions Integration

### What CI Does Automatically

When you push code, GitHub Actions:

1. **Builds** - Compiles Rust + TypeScript
2. **Tests** - Runs all test suites
3. **Lints** - Checks code style
4. **Type checks** - Validates TypeScript types
5. **Validates** - Checks LSP command contracts

### Check CI Status

```bash
# View recent workflow runs
git push
# Then check: https://github.com/your-repo/log_scout_analyzer/actions

# Or use GitHub CLI
gh run list
gh run view [run-id]
```

### If CI Fails

1. **Check the logs** - GitHub Actions shows exactly what failed
2. **Reproduce locally** - Run the same command that failed
3. **Fix the issue** - Update code/tests
4. **Push again** - CI re-runs automatically

```bash
# Example: CI says "npm test failed"
npm test                    # Reproduce locally
# Fix the failing test
git commit -am "fix: resolve test failure in bundleImport"
git push                    # CI runs again
```

---

## 🧪 LSP Command Contract Testing

### When Adding/Modifying LSP Commands

**Rule:** Schema defines the contract. Implementation must match exactly.

**Process:**

1. **Update schema first** (`lsp-commands.schema.json`)
```json
{
  "scout/bundle/import": {
    "description": "Import RTMT bundle",
    "request": {
      "archivePath": { "type": "string", "required": true },
      "caseId": { "type": "string", "required": false }
    },
    "response": {
      "bundleId": { "type": "string" },
      "filesCount": { "type": "number" }
    }
  }
}
```

2. **Implement in Rust** (`lsp-server/src/server.rs`)
```rust
"scout/bundle/import" => {
    let params: ImportBundleParams = params.parse()?;
    self.handle_import_bundle(params).await
}
```

3. **Use in TypeScript** (`vscode-extension/src/*.ts`)
```typescript
const result = await lspClient.sendRequest("scout/bundle/import", {
  archivePath: bundlePath,
  caseId: "12345"
});
```

4. **Validate contract**
```bash
npm run test:contracts
# Must pass before committing!
```

### Contract Tests Check

- ✅ All schema commands have Rust handlers
- ✅ All Rust handlers are in schema
- ✅ Command names match exactly (no typos)
- ✅ No deprecated "logScout.*" format

---

## 🚀 Quick Reference

### Starting a New Feature

1. Read `README.md` to understand the project
2. Check `USER_SCENARIOS.md` to understand user needs
3. Identify which scenario you're implementing
4. Write test that validates the scenario (RED)
5. Implement minimum code to pass test (GREEN)
6. Commit with clear message
7. Push to trigger CI

### Debugging a Test Failure

1. Read the test output (don't guess)
2. Run the specific test in isolation
3. Add `console.log` to understand state
4. Fix the issue
5. Remove debug logging
6. Verify test passes
7. Commit the fix

### Before Pushing Code

- [ ] All tests pass locally (`npm test`)
- [ ] Build succeeds (`npm run build:all`)
- [ ] No TypeScript errors (`npm run check`)
- [ ] Commit message follows format
- [ ] No debug code left in

### If You're Stuck

1. Check existing tests for similar patterns
2. Read the LSP server logs
3. Ask user for clarification
4. Don't guess - verify assumptions

---

## 💬 Communication Guidelines

### Explain in Chat, Not in Files

**DO:**
```
"I've implemented bundle import:
1. Added importPackage() command
2. Integrated with LSP server
3. Added tree view refresh
4. Test passes: e2e/bundleImport.test.ts

Ready to commit?"
```

**DON'T:**
```
"I've created SESSION_SUMMARY.md with details..."
[Creates markdown file with same info]
```

### Progress Updates

**Simple status in chat:**
```
"Building LSP server... done (12s)
Compiling TypeScript... done (3s)
Running tests... 45/45 passing ✓

Ready to commit."
```

### Ask When Uncertain

**DON'T:** Implement based on assumptions
**DO:** Ask clarifying questions

```
"Should bundle import auto-open the first log file?
Or just show the bundle in the tree view?"
```

---

## 📋 Remember

### The Golden Rules

1. **User scenario first** - Understand what user wants to accomplish
2. **Test first** - Write failing test before implementation
3. **UX states** - Handle initial, loading, empty, active, error states
4. **Commit often** - After each GREEN phase
5. **CI validates** - Let GitHub Actions catch issues
6. **No session docs** - Explain in chat, not markdown files

### File Size Limits

- **Max 500 lines per file** - If larger, split into modules
- **Max 100 lines per function** - If larger, extract helpers
- **Max 50 lines per test** - Use setup/helper functions

### When Things Go Wrong

1. Read the actual error message (don't skim)
2. Check the logs
3. Reproduce the issue
4. Fix root cause (not symptoms)
5. Add test to prevent regression
6. Commit the fix

---

**Version:** 2.0 (STDD + UX Focused)  
**Lines:** ~350 (was 1,529)  
**Focus:** Ship features, not documentation