# Test Scenario Planning Templates 📋

## Purpose

**Plan your tests BEFORE writing any code.**

This ensures:
- ✅ Complete test coverage
- ✅ No missed edge cases
- ✅ Clear acceptance criteria
- ✅ Efficient implementation
- ✅ Minimal rework

---

## Quick Start: 5-Minute Planning

Before any code change, spend 5 minutes answering:

1. **What** needs to be done? (1 sentence)
2. **Why** is it needed? (1 sentence)
3. **How** will I know it works? (3-5 criteria)
4. **What** could go wrong? (2-3 error cases)
5. **What** are the edge cases? (2-3 boundary conditions)

**Then document it using templates below.**

---

## Template 1: New Feature

```markdown
# Feature: [Feature Name]

## Overview
**What:** [One sentence description]
**Why:** [One sentence justification]
**Who:** [Target user/persona]

## Acceptance Criteria
- [ ] AC1: [Measurable, testable criterion]
- [ ] AC2: [Measurable, testable criterion]
- [ ] AC3: [Measurable, testable criterion]
- [ ] AC4: [Measurable, testable criterion]
- [ ] AC5: [Measurable, testable criterion]

## Test Scenarios

### Happy Path Tests

#### Scenario 1.1: Basic Flow
- **Given:** [Initial state/setup]
- **When:** [User action or trigger]
- **Then:** [Expected outcome]
- **Test Type:** Unit / Integration / E2E
- **Priority:** High

#### Scenario 1.2: With Valid Data
- **Given:** [Setup with valid data]
- **When:** [Process data]
- **Then:** [Correct result produced]
- **Test Type:** Integration
- **Priority:** High

### Error Handling Tests

#### Scenario 2.1: Missing Prerequisites
- **Given:** [Missing required setup]
- **When:** [User attempts action]
- **Then:** [Clear error message, graceful failure]
- **Test Type:** Integration
- **Priority:** High

#### Scenario 2.2: Invalid Input
- **Given:** [Invalid data provided]
- **When:** [System validates input]
- **Then:** [Validation error shown, no crash]
- **Test Type:** Unit
- **Priority:** High

#### Scenario 2.3: External Failure
- **Given:** [External dependency fails]
- **When:** [System attempts operation]
- **Then:** [Retry logic or fallback behavior]
- **Test Type:** Integration
- **Priority:** Medium

### Edge Case Tests

#### Scenario 3.1: Empty State
- **Given:** [No data exists]
- **When:** [Feature accessed]
- **Then:** [Appropriate empty state shown]
- **Test Type:** Integration
- **Priority:** Medium

#### Scenario 3.2: Large Dataset
- **Given:** [1000+ items]
- **When:** [Feature processes data]
- **Then:** [Performance acceptable (<5s), no memory issues]
- **Test Type:** E2E
- **Priority:** Medium

#### Scenario 3.3: Boundary Values
- **Given:** [Min/max allowed values]
- **When:** [System processes boundaries]
- **Then:** [Correct handling of limits]
- **Test Type:** Unit
- **Priority:** Low

### Performance Tests (if applicable)

#### Scenario 4.1: Load Test
- **Given:** [1000 concurrent operations]
- **When:** [System under load]
- **Then:** [Response time <100ms, no crashes]
- **Test Type:** E2E
- **Priority:** Medium

## Test Implementation Plan

### Unit Tests (Target: 70% of effort)
**File:** `src/test/suite/[feature].test.ts`

1. [ ] Test 1: [Specific unit test]
2. [ ] Test 2: [Specific unit test]
3. [ ] Test 3: [Specific unit test]
4. [ ] Test 4: [Specific unit test]
5. [ ] Test 5: [Specific unit test]

**Estimated Time:** [X minutes]

### Integration Tests (Target: 20% of effort)
**File:** `src/test/suite/[feature].integration.test.ts`

1. [ ] Test 1: [Specific integration test]
2. [ ] Test 2: [Specific integration test]
3. [ ] Test 3: [Specific integration test]

**Estimated Time:** [X minutes]

### E2E Tests (Target: 10% of effort)
**File:** `src/test/suite/[feature].e2e.test.ts`

1. [ ] Test 1: [Complete workflow test]

**Estimated Time:** [X minutes]

### Manual QA (Target: <5 minutes)

1. [ ] Visual check: [What to look at]
2. [ ] UX feel: [What to experience]

**Estimated Time:** [X minutes]

## Implementation Approach

**Phase 1: Core Functionality**
- [Step 1]
- [Step 2]
- [Step 3]

**Phase 2: Error Handling**
- [Step 1]
- [Step 2]

**Phase 3: Edge Cases**
- [Step 1]
- [Step 2]

**Phase 4: Polish**
- [Step 1]
- [Step 2]

## Success Metrics

- Unit Tests: [X/X passing]
- Integration Tests: [X/X passing]
- E2E Tests: [X/X passing]
- Test Coverage: [Target %]
- Manual QA Time: [<5 min]
- All acceptance criteria met: Yes/No

## Dependencies

- [ ] Dependency 1: [What's needed]
- [ ] Dependency 2: [What's needed]

## Risks

- **Risk 1:** [Description] - **Mitigation:** [Plan]
- **Risk 2:** [Description] - **Mitigation:** [Plan]

---

**Estimated Total Time:** [X hours]
**Actual Time:** [Filled in after completion]
```

---

## Template 2: Bug Fix

```markdown
# Bug Fix: [Brief Description]

## Bug Report

**Bug ID:** [Issue number or reference]
**Severity:** Critical / High / Medium / Low
**Reported By:** [Name/Source]
**Date Reported:** [Date]

## Problem Statement

**Observed Behavior:**
[What actually happens - be specific]

**Expected Behavior:**
[What should happen instead]

**Impact:**
- **Users Affected:** [Number or percentage]
- **Frequency:** [How often it occurs]
- **Workaround:** [If any exists]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]
4. **Bug occurs:** [What you see]

**Reproducibility:** Always / Sometimes / Rarely

## Root Cause Analysis

**Investigation:**
- [Finding 1]
- [Finding 2]
- [Finding 3]

**Root Cause:**
[One sentence explanation of why bug occurs]

**Affected Code:**
- File: `[path/to/file.ts]`
- Line: [Line number]
- Function: `[functionName]`

## Test Scenarios

### Scenario 1: Reproduce Bug (RED Phase)
- **Given:** [Exact conditions that trigger bug]
- **When:** [Exact action that causes bug]
- **Then:** [Bug manifests - test FAILS before fix]
- **Test Type:** Unit / Integration
- **Priority:** High

### Scenario 2: Verify Fix (GREEN Phase)
- **Given:** [Same conditions as Scenario 1]
- **When:** [Same action as Scenario 1]
- **Then:** [Correct behavior - test PASSES after fix]
- **Test Type:** Unit / Integration
- **Priority:** High

### Scenario 3: Regression - Related Case A
- **Given:** [Similar but slightly different conditions]
- **When:** [Related action]
- **Then:** [Still works correctly]
- **Test Type:** Unit / Integration
- **Priority:** High

### Scenario 4: Regression - Related Case B
- **Given:** [Another variation]
- **When:** [Another related action]
- **Then:** [No side effects from fix]
- **Test Type:** Integration
- **Priority:** Medium

### Scenario 5: Edge Case
- **Given:** [Boundary condition related to bug]
- **When:** [Edge case action]
- **Then:** [Handled correctly]
- **Test Type:** Unit
- **Priority:** Low

## Test Implementation Plan

### Unit Tests
**File:** `src/test/suite/[bugfix].test.ts`

1. [ ] Reproduce bug test (should fail initially)
2. [ ] Verify fix test (should pass after fix)
3. [ ] Regression test A
4. [ ] Regression test B
5. [ ] Edge case test

**Estimated Time:** [X minutes]

### Integration Tests (if needed)
**File:** `src/test/suite/[bugfix].integration.test.ts`

1. [ ] End-to-end test of fixed behavior
2. [ ] Test no side effects introduced

**Estimated Time:** [X minutes]

### Manual QA
1. [ ] Verify bug is fixed visually
2. [ ] Verify no new issues introduced

**Estimated Time:** [<2 minutes]

## Fix Approach

**Solution:**
[Brief description of how you'll fix it]

**Files to Change:**
- `[path/to/file1.ts]` - [What changes]
- `[path/to/file2.ts]` - [What changes]

**Testing Strategy:**
1. Write test that fails (reproduces bug)
2. Implement fix
3. Verify test passes
4. Run full test suite
5. Deploy

## Prevention Strategy

**Why did this happen?**
[Analysis of how bug was introduced]

**How to prevent similar bugs?**
- [ ] Add test category: [Type of tests]
- [ ] Improve validation: [Where]
- [ ] Update guidelines: [What]

## Verification Checklist

- [ ] Bug reproduced with test
- [ ] Test fails before fix (RED)
- [ ] Fix implemented
- [ ] Test passes after fix (GREEN)
- [ ] Regression tests added
- [ ] Full test suite passes
- [ ] Manual QA complete
- [ ] Documentation updated (if needed)

---

**Estimated Fix Time:** [X hours]
**Actual Fix Time:** [Filled in after completion]
```

---

## Template 3: Configuration Change

```markdown
# Configuration Change: [What's Changing]

## Change Summary

**Configuration Item:** [Setting name]
**Change Type:** Add / Modify / Remove / Deprecate
**Breaking Change:** Yes / No

## Motivation

**Problem:**
[What problem does this solve?]

**Solution:**
[How does this config change help?]

## Impact Analysis

### Backward Compatibility
- **Breaking:** Yes / No
- **Migration Needed:** Yes / No
- **Default Behavior Changes:** Yes / No

### Affected Users
- **Who:** [Which users are impacted]
- **When:** [When they'll notice]
- **How:** [What they need to do]

## Configuration Schema

### Before (if modifying)
```json
{
  "setting.name": {
    "type": "string",
    "default": "old-value"
  }
}
```

### After
```json
{
  "setting.name": {
    "type": "string",
    "default": "new-value",
    "enum": ["option1", "option2"],
    "description": "Clear description"
  }
}
```

## Test Scenarios

### Scenario 1: Default Value
- **Given:** Fresh installation, no user config
- **When:** Extension reads setting
- **Then:** Default value used correctly
- **Test Type:** Unit
- **Priority:** High

### Scenario 2: User Override
- **Given:** User sets custom value in settings.json
- **When:** Extension reads setting
- **Then:** User value used correctly
- **Test Type:** Integration
- **Priority:** High

### Scenario 3: Invalid Value
- **Given:** User sets invalid value (wrong type/format)
- **When:** Extension validates setting
- **Then:** Validation error or fallback to default
- **Test Type:** Unit
- **Priority:** High

### Scenario 4: Enum Constraint
- **Given:** User sets value not in enum
- **When:** Extension validates setting
- **Then:** Error shown, valid options displayed
- **Test Type:** Unit
- **Priority:** Medium

### Scenario 5: Migration (if applicable)
- **Given:** Old config format exists
- **When:** Extension activates
- **Then:** Config automatically migrated to new format
- **Test Type:** Integration
- **Priority:** High

### Scenario 6: Runtime Update
- **Given:** Extension running
- **When:** User changes setting
- **Then:** New value takes effect immediately
- **Test Type:** Integration
- **Priority:** Medium

## Test Implementation Plan

### Unit Tests
**File:** `src/test/suite/config-[setting].test.ts`

1. [ ] Test default value
2. [ ] Test user override
3. [ ] Test invalid value handling
4. [ ] Test type validation
5. [ ] Test enum constraints
6. [ ] Test migration logic (if needed)

**Estimated Time:** [X minutes]

### Integration Tests
**File:** `src/test/suite/config-[setting].integration.test.ts`

1. [ ] Test runtime config changes
2. [ ] Test extension behavior with different values
3. [ ] Test settings UI reflects values

**Estimated Time:** [X minutes]

### Manual QA
1. [ ] Visual check of settings UI
2. [ ] Verify description is clear
3. [ ] Verify enum dropdown works (if applicable)

**Estimated Time:** [<1 minute]

## Migration Plan (if breaking change)

### Communication
- [ ] Update CHANGELOG.md
- [ ] Add migration note to README
- [ ] Show notification on first activation after update

### Migration Code
```typescript
// Pseudocode for migration
if (hasOldSetting) {
  const oldValue = getOldSetting();
  const newValue = convertOldToNew(oldValue);
  setNewSetting(newValue);
  removeOldSetting();
  logMigration();
}
```

### Fallback
- [ ] Respect old setting if new one not set
- [ ] Provide grace period (N versions)
- [ ] Remove old setting in version X.Y.Z

## Documentation Updates

- [ ] Update package.json schema
- [ ] Update README.md
- [ ] Update settings documentation
- [ ] Update migration guide (if breaking)

## Verification Checklist

- [ ] Schema validated
- [ ] Default value tested
- [ ] User override tested
- [ ] Invalid value handling tested
- [ ] Migration tested (if applicable)
- [ ] Settings UI verified
- [ ] Documentation updated
- [ ] Full test suite passes

---

**Estimated Time:** [X hours]
**Actual Time:** [Filled in after completion]
```

---

## Template 4: Refactoring

```markdown
# Refactoring: [Component/Feature]

## Refactoring Goal

**What:** [What code are you refactoring]
**Why:** [Why it needs refactoring]
**Benefit:** [What improvement this brings]

## Current State Analysis

### Problems with Current Implementation
1. [Problem 1]
2. [Problem 2]
3. [Problem 3]

### Technical Debt
- [Debt item 1]
- [Debt item 2]

### Performance Issues (if applicable)
- Current: [Metric]
- Target: [Improved metric]

## Proposed Changes

### Architecture
**Before:**
```
[ASCII diagram or description of current structure]
```

**After:**
```
[ASCII diagram or description of new structure]
```

### Files Affected
- `[path/to/file1.ts]` - [What changes]
- `[path/to/file2.ts]` - [What changes]
- `[path/to/file3.ts]` - [What changes]

## Test Scenarios

### Scenario 1: Behavior Preservation
- **Given:** Existing functionality
- **When:** Refactoring applied
- **Then:** All existing tests pass WITHOUT modification
- **Test Type:** All existing tests
- **Priority:** Critical

### Scenario 2: API Compatibility
- **Given:** Existing consumers of this component
- **When:** New implementation used
- **Then:** All consumers work without changes
- **Test Type:** Integration
- **Priority:** Critical

### Scenario 3: Performance Validation
- **Given:** Baseline performance metrics
- **When:** Refactored code runs
- **Then:** Performance same or better
- **Test Type:** E2E
- **Priority:** High

### Scenario 4: New Code Paths (if any)
- **Given:** New internal structure
- **When:** Code executes
- **Then:** New paths covered by tests
- **Test Type:** Unit
- **Priority:** High

## Test Implementation Plan

### Pre-Refactoring
1. [ ] Ensure existing test coverage >80%
2. [ ] Document all existing tests
3. [ ] Capture performance baselines
4. [ ] Run full test suite (establish baseline)

### During Refactoring
1. [ ] Make small, incremental changes
2. [ ] Run tests after each change
3. [ ] Never modify existing tests (they validate behavior preservation)
4. [ ] Add tests only for new code paths

### Post-Refactoring
1. [ ] All existing tests pass
2. [ ] Coverage maintained or improved
3. [ ] Performance validated
4. [ ] No behavioral changes detected

### Success Criteria
- [ ] All tests pass without modification
- [ ] Test coverage: [Current %] → [New %] (same or better)
- [ ] Performance: [Baseline] → [New] (same or better)
- [ ] Code maintainability: [Subjective improvement]

## Refactoring Steps

**Phase 1: Preparation**
1. [ ] Create feature branch
2. [ ] Run full test suite (baseline)
3. [ ] Document current behavior

**Phase 2: Incremental Changes**
1. [ ] Change 1: [Description]
   - [ ] Make change
   - [ ] Run tests
   - [ ] Commit if passing
2. [ ] Change 2: [Description]
   - [ ] Make change
   - [ ] Run tests
   - [ ] Commit if passing
3. [ ] Change 3: [Description]
   - [ ] Make change
   - [ ] Run tests
   - [ ] Commit if passing

**Phase 3: Validation**
1. [ ] Full test suite passes
2. [ ] Performance validated
3. [ ] Code review
4. [ ] Merge to main

## Risk Mitigation

### What Could Go Wrong?
- **Risk 1:** [Description]
  - **Mitigation:** [Strategy]
- **Risk 2:** [Description]
  - **Mitigation:** [Strategy]

### Rollback Plan
- [ ] Feature flag available
- [ ] Easy to revert (single commit or PR)
- [ ] Old code preserved in branch

## Manual QA

**Should be ZERO for pure refactoring.**

If manual QA is needed, refactoring is changing behavior and should be reconsidered.

- [ ] No manual QA required ✅

## Verification Checklist

- [ ] All existing tests pass
- [ ] No test modifications required
- [ ] Code coverage maintained or improved
- [ ] Performance same or better
- [ ] No behavioral changes
- [ ] Code more maintainable
- [ ] Technical debt reduced

---

**Estimated Time:** [X hours]
**Actual Time:** [Filled in after completion]
```

---

## Template 5: Command Addition

```markdown
# New Command: [Command Name]

## Command Overview

**Command ID:** `extension.commandName`
**Title:** "Extension: Command Display Name"
**Category:** [Category]
**Keybinding:** [Optional: Ctrl+Shift+X]

## Functionality

**What it does:**
[Clear description of command functionality]

**User Story:**
As a [user type], I want to [action] so that [benefit].

## Acceptance Criteria

- [ ] AC1: Command appears in Command Palette
- [ ] AC2: Command executes without error
- [ ] AC3: Command produces expected outcome
- [ ] AC4: Feedback provided to user (success/error)
- [ ] AC5: Command respects prerequisites (workspace, etc.)

## Test Scenarios

### Scenario 1: Happy Path
- **Given:** All prerequisites met
- **When:** User executes command
- **Then:** Command completes successfully, feedback shown
- **Test Type:** Integration
- **Priority:** High

### Scenario 2: No Workspace
- **Given:** No workspace open
- **When:** User executes command
- **Then:** Error message: "Please open a workspace"
- **Test Type:** Integration
- **Priority:** High

### Scenario 3: Invalid State
- **Given:** System in invalid state for command
- **When:** User executes command
- **Then:** Error message explaining requirements
- **Test Type:** Integration
- **Priority:** High

### Scenario 4: Command Idempotency
- **Given:** Command already executed
- **When:** User executes command again
- **Then:** Appropriate behavior (repeat or prevent duplicate)
- **Test Type:** Integration
- **Priority:** Medium

### Scenario 5: User Cancellation
- **Given:** Command shows input dialog/picker
- **When:** User cancels
- **Then:** Command aborts gracefully, no error shown
- **Test Type:** Integration
- **Priority:** Medium

## Test Implementation Plan

### Unit Tests
**File:** `src/test/suite/commands/[command-name].test.ts`

1. [ ] Command registered in package.json
2. [ ] Command registered in extension.ts
3. [ ] Command handler function exists
4. [ ] Error handling present
5. [ ] Input validation logic correct

**Estimated Time:** [10 minutes]

### Integration Tests
**File:** `src/test/suite/commands/[command-name].integration.test.ts`

1. [ ] Command appears in command list
2. [ ] Command executes successfully
3. [ ] Expected outcome occurs
4. [ ] Error cases handled
5. [ ] UI updates correctly

**Estimated Time:** [15 minutes]

### E2E Tests (if part of larger workflow)
**File:** `src/test/suite/workflows/[workflow].e2e.test.ts`

1. [ ] Command works in complete workflow

**Estimated Time:** [10 minutes]

### Manual QA
1. [ ] Command Palette shows correct title
2. [ ] Command feedback is clear
3. [ ] UX feels responsive

**Estimated Time:** [2 minutes]

## Implementation Checklist

### package.json
- [ ] Add to `contributes.commands`
- [ ] Add to `activationEvents`
- [ ] Add keybinding (if applicable)
- [ ] Add to context menu (if applicable)

### extension.ts
- [ ] Register command handler
- [ ] Add to context.subscriptions
- [ ] Implement command logic
- [ ] Add error handling
- [ ] Add user feedback

### Tests
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] E2E tests written (if needed)

## Command Configuration

```json
{
  "command": "extension.commandName",
  "title": "Extension: Command Display Name",
  "category": "Extension Name"
}
```

## Keybinding (if applicable)

```json
{
  "command": "extension.commandName",
  "key": "ctrl+shift+x",
  "when": "editorTextFocus"
}
```

## Verification Checklist

- [ ] Command registered correctly
- [ ] Appears in Command Palette
- [ ] Executes without error
- [ ] Produces expected outcome
- [ ] Error handling works
- [ ] User feedback provided
- [ ] All tests pass
- [ ] Manual QA complete

---

**Estimated Time:** [X hours]
**Actual Time:** [Filled in after completion]
```

---

## Quick Reference: Planning Questions

### Before Starting ANY Work:

1. **What** exactly needs to be done? (1 clear sentence)
2. **Why** is this needed? (1 sentence justification)
3. **Who** will use this? (target user)
4. **How** will success be measured? (3-5 criteria)
5. **What** is the happy path? (1 scenario)
6. **What** could go wrong? (2-3 error scenarios)
7. **What** are the edge cases? (2-3 boundary conditions)
8. **How** will I test this? (unit/integration/E2E breakdown)
9. **What** requires manual QA? (should be <5%)
10. **How long** will this take? (estimate)

---

## Time Budgets for Planning

| Change Type | Planning Time | Coding Time | Testing Time | Total Time |
|-------------|---------------|-------------|--------------|------------|
| Small Bug Fix | 2 min | 5 min | 5 min | 12 min |
| Medium Bug Fix | 5 min | 15 min | 10 min | 30 min |
| Small Feature | 5 min | 20 min | 15 min | 40 min |
| Medium Feature | 10 min | 40 min | 30 min | 80 min |
| Large Feature | 20 min | 90 min | 60 min | 170 min |

**Planning is 5-10% of total time but prevents 50%+ of rework!**

---

## Success Indicators

You've planned well when:

- ✅ All team members understand the requirement
- ✅ Acceptance criteria are clear and measurable
- ✅ Test scenarios cover happy path, errors, and edges
- ✅ You know exactly what tests to write
- ✅ You can estimate time accurately
- ✅ You've identified risks and mitigations
- ✅ You know what requires manual QA (and it's minimal)

---

## Common Planning Mistakes to Avoid

❌ **Skipping planning** ("I'll figure it out as I code")
❌ **Vague acceptance criteria** ("It should work well")
❌ **Only happy path** (no error or edge cases)
❌ **No test plan** ("I'll write tests later")
❌ **Underestimating manual QA** (should be <5%)
❌ **No risk analysis** (surprised by problems)

---

## Summary

**5 minutes of planning saves hours of debugging.**

**Planning workflow:**
1. Choose appropriate template
2. Fill out all sections
3. Share with team if needed
4. Get approval on approach
5. THEN start coding (with tests first!)

**Remember: If you can't plan it, you can't test it. If you can't test it, you can't build it.**

---

**Next Steps:**
1. Pick a template that matches your task
2. Fill it out completely (5 minutes)
3. Review with someone if needed
4. Start TDD workflow (RED → GREEN → REFACTOR)
5. Track actual time vs. estimate
6. Improve estimates over time