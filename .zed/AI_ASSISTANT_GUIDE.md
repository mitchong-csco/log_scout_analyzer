# AI Assistant Efficiency Guide 🤖

## Purpose

This guide helps AI assistants work efficiently with this project by leveraging:
- ✅ Automatic logging system
- ✅ Strategy documents with templates
- ✅ npm-driven automation
- ✅ Clear workflows and patterns

**Goal:** Enable AI assistants to help humans debug, implement, and test features with maximum efficiency.

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
3. Run: npm run test:wiring
4. Tests should PASS (GREEN phase)
5. If tests fail, read logs/[test-name].log
6. Fix based on actual error (not guessing)
```

### Phase 4: Verification

```markdown
1. Run: npm run dev:verify
2. If LSP commands were added/modified:
   - Run: ./scripts/test-command-contracts.sh (or .bat on Windows)
   - All contract tests MUST pass before committing
   - If tests fail, fix mismatches immediately
3. Check: logs/dev-verify.log if failures
4. Ensure all tests pass
5. Document what was done
6. UPDATE PROJECT_STATUS.md with session summary (MANDATORY!)
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

6. AI runs: npm run dev:verify

7. AI checks: logs/dev-verify.log (all passing)

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

8. AI tests: npm run test:performance

9. AI verifies: logs/test-performance.log shows 450MB usage

10. Ready for human review
```

### Scenario 3: Security Issue

```markdown
1. Human: "Found XSS vulnerability in filename display"

2. AI reads: SECURITY_TESTING.md section 1

3. AI writes test that reproduces XSS (RED)

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
✅ You document what you did clearly
✅ You ask questions when unsure
✅ You update strategy documents when you find gaps
✅ **You ALWAYS update PROJECT_STATUS.md at end of session**

❌ You're NOT efficient when:

- Guessing without reading logs
- Inventing custom test patterns
- Skipping tests
- Making changes without verification
- Providing vague responses
- Breaking APIs without asking
- **Forgetting to update PROJECT_STATUS.md (CRITICAL FAILURE)**

---

## Remember

**Humans trust AI assistants who:**
1. Base fixes on actual data (logs)
2. Follow established patterns (templates)
3. Test thoroughly (TDD)
4. Document clearly
5. Ask before breaking things
6. **Update PROJECT_STATUS.md every session (MANDATORY)**

**Make the human's job easy:**
- They just review your work
- They don't debug your guesses
- They don't write tests you skipped
- They don't fix your breaking changes
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

### Commit Strategy (MANDATORY - AI EXECUTES AUTOMATICALLY)
- [ ] **AI assistant MUST commit all uncommitted work using terminal tool**
  - Execute commits directly via `git add` and `git commit`
  - Create logical commits by category (core system, docs, config, etc.)
  - Use descriptive commit messages
  - AI has terminal access - DO NOT ask user to run scripts manually
- [ ] **AI verifies commits**: `git log --oneline -5`
- [ ] **AI checks nothing left uncommitted**: `git status --short`
- [ ] **AI asks user permission before push**: `git push` (if stable)

**AI MUST execute commits, not instruct user to run scripts!**

### Session Checkpoint (if >90k tokens)
- [ ] **Create checkpoint document** (see `.zed/SESSION_CHECKPOINT_PROTOCOL.md`)
- [ ] **Document exact stopping point** (file, line, next action)
- [ ] **Save all context** for next session
- [ ] **Notify user** session can resume seamlessly

### Token Management
- [ ] **Check current token usage** (aim to checkpoint before 90k tokens)
- [ ] **If >90k tokens**: Create checkpoint NOW
- [ ] **If >110k tokens**: STOP new work, commit & document only

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