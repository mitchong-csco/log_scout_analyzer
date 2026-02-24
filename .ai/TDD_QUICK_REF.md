# TDD Quick Reference Card 🚀

## The Golden Rule

**TEST FIRST. CODE SECOND. NO EXCEPTIONS.**

## The Cycle

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  1. RED    → Write failing test                │
│  2. GREEN  → Write minimal code to pass        │
│  3. GREEN  → Verify test passes                │
│  4. DEPLOY → Ship with confidence              │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Before Any Code Change

```bash
# Ask yourself:
□ What test will prove this works?
□ How will I validate success?
□ What could go wrong?

# Then write the test FIRST
```

## Commands to Know

```bash
# Navigate to extension directory
cd vscode-extension

# Run tests (FAST - 16ms)
npm run test:wiring

# Compile TypeScript
npm run compile

# Full deployment
npm run deploy
```

## Response Template

Every code change follows this format:

```markdown
## Change: [What you're doing]

### 1. Test First (RED) ❌
[Failing test code]
Result: ❌ X failing

### 2. Implementation (GREEN) ✅
[Code changes]
Result: ✅ All passing

### 3. Manual Steps
1. [How to verify manually]
2. [Expected result]

### 4. Ready for QA
✅ Tests: X/X passing
✅ Deployed: Yes
```

## Forbidden Phrases

❌ "I'll add tests later"
❌ "It's a simple change"
❌ "Tests aren't needed for this"
❌ "Just a quick fix"
❌ "I tested it manually"

## Required Phrases

✅ "Test written and failing..."
✅ "Test now passes..."
✅ "All 24/24 tests passing"
✅ "Ready for QA with validation"

## Test File Locations

```
vscode-extension/
└── src/test/suite/
    ├── wiring.test.ts          ← Main validation
    └── [feature].test.ts       ← Feature-specific
```

## Common Test Patterns

### Configuration Test
```typescript
test('Should have correct setting', () => {
  const setting = packageJson.contributes.configuration.properties['key'];
  assert.ok(setting, 'Setting should exist');
});
```

### Command Registration Test
```typescript
test('Command should be registered', () => {
  const cmd = packageJson.contributes.commands.find(
    c => c.command === 'myCommand'
  );
  assert.ok(cmd, 'Command should be in package.json');
});
```

### Code Pattern Test
```typescript
test('Code should implement feature', () => {
  assert.ok(
    extensionTs.includes('expectedPattern'),
    'Pattern should exist in code'
  );
});
```

## Quality Gates Checklist

Before saying "Done":

- [ ] Test written and failing (RED)
- [ ] Code written to pass test (GREEN)
- [ ] `npm run test:wiring` passes
- [ ] `npm run compile` succeeds
- [ ] `npm run deploy` completes
- [ ] Manual steps documented
- [ ] Test results shared

## When Tests Fail

```bash
# Read the error message
npm run test:wiring

# It tells you EXACTLY what's wrong:
# ❌ "Import Archive command should NOT have duplicate Scout prefix"
#    Expected: true, Actual: false
#
# Fix the issue, recompile, retest
npm run compile
npm run test:wiring

# ✅ All passing? Deploy!
npm run deploy
```

## Real Example

**Request:** "Fix duplicate Scout: prefix"

**Wrong Approach:**
1. Edit package.json
2. Deploy
3. Hope it works ❌

**Right Approach:**
1. Write test that detects duplicate prefix (FAILS) ❌
2. Remove category from package.json (test PASSES) ✅
3. Run full test suite (24/24 passing) ✅
4. Deploy with confidence ✅
5. Document manual verification steps

## Success Metrics

**You know you're doing it right when:**
- Tests catch bugs BEFORE deployment
- Human QA never says "this isn't wired"
- Every change has validation
- Regressions are impossible (tests prevent them)
- Confidence is high in every deployment

## Remember

> "The time you spend writing tests is ALWAYS less than 
> the time you'd spend debugging issues found in QA."

**Test First. Always.**

## Quick Test Run

```bash
cd vscode-extension && npm run test:wiring
```

Expected output:
```
  Extension Wiring Validation
    ✔ Should have correct extension metadata
    ✔ Import Archive command should NOT have duplicate Scout prefix
    ✔ [... 22 more tests ...]
    
  24 passing (16ms)
```

---

**When in doubt: Write the test first. 🎯**