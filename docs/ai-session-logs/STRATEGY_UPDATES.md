# Strategy Update Guide 🔄

## Quick Start: How to Update a Strategy

When you discover a design flaw or better approach:

### 1. Identify the Problem (2 minutes)

```markdown
**What's wrong**: [Describe the issue]
**Which strategy**: .zed/[FILENAME].md
**When discovered**: [Date/Context]
**Impact**: [How this affects work]
```

### 2. Propose the Solution (3 minutes)

```markdown
**Current approach**: [What we do now]
**Proposed approach**: [What we should do]
**Why it's better**: [Rationale with data if possible]
**Examples**: [Show concrete examples]
```

### 3. Update the Strategy File (5 minutes)

Edit the appropriate `.zed/*.md` file:

```bash
# Option A: Edit directly
code .zed/SECURITY_TESTING.md

# Option B: Ask AI to update
"Update .zed/SECURITY_TESTING.md section 3 to include [new requirement]"
```

### 4. Document the Change (2 minutes)

Add entry to `.zed/CHANGELOG.md`:

```markdown
## 2024-MM-DD

### [Strategy File Name]
- **Changed**: [What changed]
- **Rationale**: [Why]
- **Impact**: [Effect on developers]
```

### 5. Apply Immediately (0 minutes)

Use the new approach in your current work to validate it.

---

## Common Strategy Updates

### Adding a Missing Test Category

**When**: You discover a type of bug that tests didn't catch

**Example**:
```markdown
Found prototype pollution bug in production.
No tests caught it because we don't test for it.
```

**Update**:
1. Open `.zed/SECURITY_TESTING.md`
2. Add new section: "Prototype Pollution Tests"
3. Include test template and examples
4. Mark as mandatory for object merging code
5. Update CHANGELOG.md
6. Write the test for current work

**Time**: 10 minutes

---

### Changing a Time Budget

**When**: Estimates are consistently wrong

**Example**:
```markdown
"Feature implementation: 2 hours" budget is too aggressive.
Last 10 features averaged 3.2 hours.
```

**Update**:
1. Open `.zed/AUTOMATION_STRATEGY.md` or `WORKFLOW_GUIDE.md`
2. Change time budget: 2h → 3h
3. Document analysis that led to change
4. Update CHANGELOG.md
5. Use new estimate going forward

**Time**: 5 minutes

---

### Adding a New npm Script

**When**: You create a useful automation

**Example**:
```markdown
Created script to check for hardcoded secrets.
Should be part of security check.
```

**Update**:
1. Add script to `package.json`
2. Document in `.zed/NPM_AUTOMATION.md`
3. Add to `.zed/SECURITY_TESTING.md` workflow
4. Update CHANGELOG.md
5. Add to CI/CD if needed

**Time**: 10 minutes

---

### Deprecating an Old Approach

**When**: You find a better way to do something

**Example**:
```markdown
Old: Generate fixtures manually
New: Use FixtureBuilder for consistency
```

**Update**:
1. Mark old approach as `[DEPRECATED]` in strategy file
2. Add new approach with examples
3. Provide migration guide
4. Set sunset date (e.g., "Remove after 2024-03-01")
5. Update CHANGELOG.md
6. Don't force immediate migration (gradual is better)

**Time**: 15 minutes

---

### Fixing a Strategy Conflict

**When**: Two strategies contradict each other

**Example**:
```markdown
SECURITY_TESTING.md: "Test everything exhaustively"
PERFORMANCE_TESTING.md: "Tests must run in <50ms"

Conflict: Exhaustive security tests take 500ms
```

**Update**:
1. Identify the conflict clearly
2. Find the balance/compromise
3. Update BOTH files to explain the resolution
4. Cross-reference between them
5. Update CHANGELOG.md

**Solution Example**:
```markdown
SECURITY_TESTING.md:
"Exhaustive tests run in `npm run test:security-full` (CI only)"

PERFORMANCE_TESTING.md:
"50ms budget applies to `npm run test:fast` only.
Full security suite runs separately."
```

**Time**: 20 minutes

---

## Who Can Update Strategies?

### Anyone Can Propose

- ✅ AI assistants
- ✅ Junior developers
- ✅ Senior developers
- ✅ QA team members
- ✅ Project managers

### Update Process

1. **Propose**: Open discussion or PR with proposed change
2. **Review**: Quick review by team/lead (< 30 minutes)
3. **Approve**: Consensus or lead decision
4. **Update**: Make the change to `.zed/*.md` files
5. **Communicate**: Notify team of change

**For non-breaking changes**: Can update immediately, notify after
**For breaking changes**: Discuss first, then update

---

## Strategy Update Templates

### Template 1: Bug-Driven Update

```markdown
## Strategy Update: [Bug Type] Prevention

**Triggered By**: Bug #123 in production
**Root Cause**: Gap in testing strategy
**Strategy File**: .zed/[FILE].md

### The Bug
[Describe what happened]

### Why Tests Didn't Catch It
[Explain the gap]

### Strategy Addition
[New test category/requirement]

### Test Template
```typescript
test('Prevents [bug type]', () => {
  // Test implementation
});
```

### Mandate
- [ ] Required for: [which types of code]
- [ ] Applies to: [new code / existing code]
- [ ] Deadline: [if applicable]
```

---

### Template 2: Efficiency Improvement

```markdown
## Strategy Update: [Process] Optimization

**Triggered By**: Process taking too long
**Current Time**: X hours per feature
**Target Time**: Y hours per feature
**Strategy File**: .zed/[FILE].md

### Current Approach
[What we do now]
**Time**: X hours
**Issues**: [Problems with current approach]

### New Approach
[What we should do]
**Time**: Y hours
**Benefits**: [Why it's better]

### Migration
- Existing work: [Continue current or migrate?]
- New work: [Start using immediately]
- Deadline: [Optional]

### Success Metrics
- Measure: [What to track]
- Target: [Goal to achieve]
- Review: [When to check progress]
```

---

### Template 3: Tool/Technology Addition

```markdown
## Strategy Update: New Tool - [Tool Name]

**Tool**: [Name]
**Purpose**: [What it does]
**Replaces**: [Old approach, if any]
**Strategy Files**: .zed/[FILE].md, .zed/[FILE2].md

### Why Add This Tool?
[Problem it solves]

### Installation
```bash
npm install --save-dev [tool-name]
```

### Configuration
[Show config]

### Integration Points
- Update `.zed/NPM_AUTOMATION.md`: Add npm scripts
- Update `.zed/[RELEVANT].md`: Add to workflow
- Update `package.json`: Add dependencies
- Update CI/CD: Include in pipeline

### Examples
[Show usage examples]

### Training Required
- Time: [How long to learn]
- Resources: [Links to docs]
```

---

## Review Schedule

### Weekly Quick Check (15 minutes)

**Every Monday**:
- Review last week's work
- Identify any strategy issues
- Quick updates if needed
- No formal meeting required

**Questions**:
1. Did any rule waste time?
2. Did we discover new test categories?
3. Were time estimates accurate?
4. Any confusion about process?

---

### Monthly Strategy Review (1 hour)

**First Monday of Month**:
- Review CHANGELOG.md
- Check metrics dashboard
- Identify trends
- Plan updates

**Metrics to Review**:
- Features completed vs estimated
- Bugs found in QA vs tests
- Test execution time trends
- Strategy update frequency
- Developer satisfaction scores

---

### Quarterly Deep Dive (4 hours)

**First week of quarter**:
- Read ALL `.zed/*.md` files
- Identify contradictions
- Find coverage gaps
- Major updates if needed
- Simplify overcomplicated rules

**Deliverables**:
- Updated strategies
- Removed obsolete rules
- Consolidated duplicates
- Improved examples
- Better organization

---

## Version Control

### Strategy Document Versions

Each strategy file should track its version:

```markdown
# Strategy Document Name

**Version**: 2.1.0
**Last Updated**: 2024-01-15
**Next Review**: 2024-02-15

## Version History

### 2.1.0 (2024-01-15)
- Added: XYZ
- Changed: ABC
- Fixed: DEF

### 2.0.0 (2024-01-01)
- Major: Complete overhaul
- Breaking: New structure
```

### Semantic Versioning for Strategies

**Major (X.0.0)**: Breaking changes
- Require immediate action
- Change fundamental approaches
- Example: Restructure entire test organization

**Minor (1.X.0)**: Additions
- New requirements
- New test categories
- New tools
- Example: Add security test category

**Patch (1.0.X)**: Clarifications
- Fix typos
- Add examples
- Improve wording
- Example: Add more examples to existing section

---

## Communication

### Non-Breaking Changes

**Method**: Async notification
```markdown
📢 Strategy Update

File: .zed/PERFORMANCE_TESTING.md
Change: Added example for streaming large files
Impact: None - just better documentation
Link: [file link]
```

### Breaking Changes

**Method**: Synchronous discussion
```markdown
🚨 Breaking Strategy Change Proposed

File: .zed/SECURITY_TESTING.md
Change: Require prototype pollution tests for all object merging
Impact: Existing PRs need update
Discussion: [link to discussion]
Vote by: 2024-01-20
```

---

## Success Metrics

Track these to know if strategy updates are working:

### Update Frequency
- **Target**: 2-5 updates per quarter
- **Too few**: Not learning from experience
- **Too many**: Unstable, constantly changing

### Time to Update
- **Target**: < 30 minutes per update
- **Actual**: [Track this]
- **Issue if >1 hour**: Process too complex

### Adoption Rate
- **Target**: 100% adoption within 1 week
- **Measure**: Spot checks in PRs
- **Issue if <100%**: Communication problem

### Regression Rate
- **Target**: 0 regressions from strategy updates
- **Measure**: Issues caused by strategy changes
- **Issue if >0**: Insufficient testing of strategy

### Developer Satisfaction
- **Target**: 8+/10 satisfaction with process
- **Measure**: Monthly survey
- **Issue if <7**: Process too burdensome

---

## Anti-Patterns to Avoid

### ❌ Analysis Paralysis

**Wrong**:
```
Spend 4 hours perfecting strategy before implementing
```

**Right**:
```
Implement simple strategy, improve based on real use
```

---

### ❌ Set-and-Forget

**Wrong**:
```
Write strategy once, never update it
```

**Right**:
```
Review regularly, update based on experience
```

---

### ❌ Too Many Rules

**Wrong**:
```
50-page strategy document with 100 rules
```

**Right**:
```
Concise strategies with clear examples
Focus on principles over procedures
```

---

### ❌ No Rationale

**Wrong**:
```
"Do X" (no explanation why)
```

**Right**:
```
"Do X because Y. This prevents Z problem."
```

---

### ❌ Breaking Without Migration

**Wrong**:
```
"Old approach is now forbidden effective immediately"
```

**Right**:
```
"New approach is recommended. Old approach deprecated.
Migration guide: [link]. Removal date: 2024-06-01"
```

---

## Quick Reference: Update Checklist

When updating any strategy:

- [ ] Identify problem clearly
- [ ] Propose solution with rationale
- [ ] Update `.zed/[FILE].md`
- [ ] Add example if applicable
- [ ] Update `.zed/CHANGELOG.md`
- [ ] Test on current work
- [ ] Communicate to team (if needed)
- [ ] Update version number
- [ ] Cross-reference related docs
- [ ] Schedule follow-up review

**Time budget**: 10-20 minutes per update

---

## Remember

**Good strategies evolve.**

- Learn from every bug
- Improve based on real experience
- Make updates easy and fast
- Document everything
- Communicate changes clearly

**Bad strategies are rigid.**

- Refuse to adapt
- Ignore feedback
- Become outdated
- Waste time

---

**When you find something wrong with the strategy, fix it. Don't suffer in silence.**

## Questions?

- See `rules.md` for detailed process
- See `CHANGELOG.md` for update history
- See `README.md` for strategy overview
- Ask team before breaking changes