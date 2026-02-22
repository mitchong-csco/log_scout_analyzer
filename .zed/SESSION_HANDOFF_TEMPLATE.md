# 🔄 SESSION HANDOFF TEMPLATE

**Purpose**: Copy-paste this into a new chat to quickly get AI assistant up to speed.

---

## Template for Starting New Chat Session

```
I'm continuing work on the Log Scout Analyzer project.

Please read these files in order to get full context:
1. .zed/PROJECT_STATUS.md (MUST READ - current status, blockers, next steps)
2. .zed/AI_ASSISTANT_GUIDE.md (how to work efficiently on this project)

Current focus: [FILL IN - e.g., "Complete Phase 2.1 normalizers"]

Specific task: [FILL IN - e.g., "Create JabberNormalizer and CucNormalizer"]

Context from last session:
[FILL IN - brief 2-3 sentence summary of what we were doing]

Please confirm you've read PROJECT_STATUS.md and understand:
- Current work in progress
- Known blockers
- Immediate next steps
```

---

## Quick Handoff (Minimal Version)

```
Continuing Log Scout Analyzer work.
Read .zed/PROJECT_STATUS.md for full context.

Task: [FILL IN]
```

---

## Session End Checklist

Before ending a session and starting a new chat, do this:

### 1. Update PROJECT_STATUS.md
- [ ] Update progress percentages
- [ ] Add any new blockers discovered
- [ ] Update "What We Were Doing" section
- [ ] Note any important decisions made
- [ ] Update test status if changed

### 2. Commit Important Work
```bash
# If at a good stopping point
git add [files]
git commit -m "[clear description]"
```

### 3. Document Decisions
If any architectural or important decisions were made:
- Add to PROJECT_STATUS.md under appropriate section
- Note WHY the decision was made
- Add any trade-offs considered

### 4. Note Next Steps
- Update "IMMEDIATE NEXT STEPS" in PROJECT_STATUS.md
- Be specific about what should happen next
- Include time estimates if known

---

## Example Good Handoff

```
I'm continuing work on Log Scout Analyzer.

Read .zed/PROJECT_STATUS.md - it has complete status.

Last session summary:
- Discovered JabberNormalizer and CucNormalizer files are missing
- These files are referenced in mod.rs but don't exist yet
- This blocks Phase 2.1 completion
- Reviewed existing normalizers (CUBE and CUCM) as templates

Next task: Create JabberNormalizer
- File: crates/pattern-engine/src/normalizers/jabber_normalizer.rs
- Use cube_normalizer.rs as template
- Requirements in PHASE1_COMPLETE_NEXT_STEPS.md lines 214-279
- Estimated time: 1-1.5 hours

Please confirm you understand the task and can see the template files.
```

---

## Example Bad Handoff (Don't Do This)

```
❌ Continue the normalization work
```

**Why bad**: 
- No context about what normalization work
- No mention of PROJECT_STATUS.md
- No specific task
- No reference to where we left off
- AI has to ask many questions to understand

---

## Tips for Effective Handoffs

### DO ✅
- Reference PROJECT_STATUS.md explicitly
- Mention specific files or components
- Note what was discovered in last session
- Provide clear next action
- Include time estimates if known
- Mention relevant documentation

### DON'T ❌
- Assume AI remembers previous conversations
- Skip reading PROJECT_STATUS.md
- Be vague about the task
- Forget to mention blockers
- Ignore test status
- Skip context about why we're doing something

---

## Context Information to Include

### Minimum (Always Include)
1. Project name
2. Reference to PROJECT_STATUS.md
3. Current task/focus

### Good (Recommended)
1. Project name
2. Reference to PROJECT_STATUS.md
3. Current task/focus
4. Brief summary of last session
5. Specific next action
6. Relevant file paths

### Excellent (Detailed)
1. Project name
2. Reference to PROJECT_STATUS.md and AI_ASSISTANT_GUIDE.md
3. Current phase/component
4. What was done in last session
5. What was discovered
6. Any blockers encountered
7. Specific next action with file paths
8. Time estimate
9. Relevant documentation references
10. Test status if relevant

---

## Special Cases

### Starting Mid-Feature
```
Continuing Log Scout Analyzer - mid-feature work.

Read .zed/PROJECT_STATUS.md for full context.

Feature: [name]
Status: [X% complete / specific state]
Last completed: [specific thing]
Next step: [specific thing]
Blocker: [if any]

Files involved:
- [file 1]
- [file 2]
```

### Bug Fix Session
```
Continuing Log Scout Analyzer - bug fix.

Read .zed/PROJECT_STATUS.md for context.

Bug: [brief description]
Location: [file/component]
Reproduced: [yes/no]
Test written: [yes/no]
Fix attempted: [what was tried]
Next: [next debugging step or fix to try]
```

### Testing Session
```
Continuing Log Scout Analyzer - testing.

Read .zed/PROJECT_STATUS.md for context.

Testing: [component/feature]
Test type: [unit/integration/manual]
Status: [X/Y tests passing]
Issues found: [list or "none"]
Next: [next test to write or issue to fix]
```

### Code Review/Refactor
```
Continuing Log Scout Analyzer - code review.

Read .zed/PROJECT_STATUS.md for context.

Reviewing: [component]
Issues found: [list]
Refactoring plan: [brief description]
Impact: [what will change]
Tests needed: [what tests to update]
```

---

## Session Handoff Workflow

```
┌─────────────────────────────────────┐
│  Session Ending Soon?               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  1. Update PROJECT_STATUS.md        │
│     - Current progress              │
│     - New blockers                  │
│     - What we were doing            │
│     - Next steps                    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  2. Commit if at good stopping point│
│     git commit -m "..."             │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  3. Copy template from this file    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  4. Fill in [FILL IN] sections      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  5. Start new chat with filled      │
│     template                         │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  6. AI reads PROJECT_STATUS.md      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  7. Continue work seamlessly        │
└─────────────────────────────────────┘
```

---

## Token Limit Warning Signs

If you're approaching token limits:

### Warning Signs
- Response times getting slower
- Truncated responses
- AI mentions token limits
- Chat feels "sluggish"

### Action
1. **Update PROJECT_STATUS.md NOW** with:
   - Current progress
   - Any discoveries
   - Next steps
   - Any blockers

2. **Commit work if possible**
   ```bash
   git add .
   git commit -m "WIP: [describe current state]"
   ```

3. **Use template from this file** to start new chat

4. **Don't wait** - better to handoff early than lose context

---

## Verification Checklist

Before starting new chat, verify:

- [ ] PROJECT_STATUS.md is updated with latest info
- [ ] Progress percentages reflect current state
- [ ] Known blockers are documented
- [ ] "What We Were Doing" section is current
- [ ] Next steps are clear and specific
- [ ] Test status is accurate
- [ ] Any important decisions are noted
- [ ] File locations are correct
- [ ] Handoff template is filled in
- [ ] Committed work if at stopping point

---

## Time Savings

Good handoff saves:
- **10-15 minutes** of context gathering per session
- **5-10 questions** back and forth
- **Frustration** of explaining same things multiple times
- **Errors** from working on wrong thing

**Investment**: 2-3 minutes to update PROJECT_STATUS.md and fill template
**Return**: 10-15 minutes saved in next session
**ROI**: 5-7x return on time invested

---

## Real Example from This Project

**Good Handoff**:
```
Continuing Log Scout Analyzer.

Read .zed/PROJECT_STATUS.md - fully updated.

Last session:
- Bundle Import is 100% complete, needs manual testing
- Phase 1 normalization complete (16/16 tests passing)
- CubeNormalizer and CucmNormalizer complete
- Discovered JabberNormalizer and CucNormalizer missing

Blocker: 
- mod.rs references jabber_normalizer and cuc_normalizer
- These files don't exist yet
- Prevents normalizers module from compiling

Next task: Create JabberNormalizer
- File: crates/pattern-engine/src/normalizers/jabber_normalizer.rs
- Template: cube_normalizer.rs
- Requirements: PHASE1_COMPLETE_NEXT_STEPS.md lines 214-279
- Format: "2024-01-15 10:30:00,123 <MAIN> <thread-1> SIP_MSG_RECV: ..."
- Need: CSF framework parsing, thread ID extraction, component paths
- Tests: Write 8-10 tests
- Time: 1-1.5 hours

Confirm you see cube_normalizer.rs and understand the task.
```

**Result**: AI immediately understands task and can start coding.

---

## Summary

**Golden Rule**: Always update PROJECT_STATUS.md before ending session.

**Template Use**: Copy, fill in [FILL IN] sections, paste to new chat.

**Time Investment**: 2-3 minutes to save 10-15 minutes next session.

**Goal**: Seamless continuation with zero context loss.

---

**File Version**: 1.0  
**Created**: 2024-02-20  
**Purpose**: Enable efficient session handoffs  
**Updated**: After handoff process improvements