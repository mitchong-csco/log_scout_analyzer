# Session Checkpoint Protocol - Token Management

**Purpose**: Ensure no work is lost when approaching token limits  
**Created**: February 21, 2024  
**Status**: MANDATORY for all AI assistant sessions

---

## 🚨 Critical Token Thresholds

**IMPORTANT**: Claude sessions typically limit to **~128k-200k tokens** (not 1M)

| Token Usage | Status | Action Required |
|-------------|--------|-----------------|
| 0-50k | 🟢 Safe | Continue normally |
| 50k-90k | 🟡 Caution | Start thinking about checkpoint |
| 90k-110k | 🟠 Warning | **CREATE CHECKPOINT NOW** |
| 110k-120k | 🔴 Critical | **STOP NEW WORK - COMMIT & DOCUMENT** |
| 120k+ | 🚨 Emergency | **IMMEDIATE CHECKPOINT - END SESSION** |

**Typical Token Limits**: 
- Conservative: 128k tokens per session
- Extended: 200k tokens per session
- **Plan for 128k to be safe**

---

## 📋 Checkpoint Protocol

### When Token Usage Reaches ~90k tokens (70% of 128k)

**STOP and execute:**

1. **Check Current Status**
   ```bash
   git status --short | wc -l
   ```

2. **Create Session Summary**
   - What was accomplished?
   - What files were created/modified?
   - What tests pass/fail?
   - What's the next step?

3. **Commit All Work**
   ```bash
   # Use commit script
   .\commit-command-contract-testing.bat  # or current work script
   
   # Or manual
   git add [files]
   git commit -m "checkpoint: [description]"
   ```

4. **Update PROJECT_STATUS.md**
   - Add session entry to "Recent Changes Log"
   - Update "Session Context" section
   - Document next actions

5. **Create Handoff Document**
   - File: `SESSION_HANDOFF_[date]_[topic].md`
   - What was done
   - What's incomplete
   - Exact next steps
   - Files to review

---

### When Token Usage Reaches ~110k tokens (85% of 128k)

**IMMEDIATE CHECKPOINT - NO NEW WORK**

Execute in this order:

1. ✅ **Commit Everything** (5 minutes max)
   ```bash
   # Quick commit of current work
   git add [critical files]
   git commit -m "checkpoint: Emergency commit at 85% token usage"
   ```

2. ✅ **Update PROJECT_STATUS.md** (3 minutes max)
   ```markdown
   ### Session: [Date] - [Topic] - ⚠️ CHECKPOINT AT 110k TOKENS
   
   **Status**: IN PROGRESS - Checkpointed due to approaching token limit
   
   **What Was Completed**:
   - [List completed items]
   
   **What's In Progress**:
   - [Current task]
   - [Status: X% complete]
   
   **Next Steps** (IMMEDIATE):
   1. [Exact next action]
   2. [File to edit]
   3. [Expected result]
   
   **Uncommitted Work**: [X files - describe them]
   ```

3. ✅ **Create Quick Handoff** (2 minutes max)
   ```markdown
   # EMERGENCY HANDOFF - [Date] [Time]
   
   **Token Usage**: 85%+ (Checkpoint required)
   
   ## Current Task
   [One sentence: what you're doing]
   
   ## Progress
   - [ ] Task 1 (complete)
   - [ ] Task 2 (in progress - 60% done)
   - [ ] Task 3 (not started)
   
   ## Next Action (EXACT STEPS)
   1. Open file: [path]
   2. Add code: [description]
   3. Test: [command]
   
   ## Files Modified (Uncommitted)
   [List files]
   
   ## Continue Command for Next Session
   ```
   Read PROJECT_STATUS.md
   Read SESSION_HANDOFF_[this file]
   Continue task: [exact task name]
   ```
   ```

4. ✅ **Notify User**
   ```
   ⚠️ TOKEN LIMIT WARNING: ~110k tokens reached (85% of 128k limit)
   
   I've created a checkpoint:
   - ✅ Committed work to git
   - ✅ Updated PROJECT_STATUS.md
   - ✅ Created handoff document
   
   Ready to continue in new session or end here.
   ```

---

### When Token Usage Reaches ~120k tokens (95% of 128k)

**EMERGENCY - END SESSION IMMEDIATELY**

No new work. Only save what exists:

1. **Emergency Commit** (1 minute)
   ```bash
   git add -A
   git commit -m "EMERGENCY: Checkpoint at ~120k tokens - session ending"
   ```

2. **Minimal Status Update** (1 minute)
   - Add one line to PROJECT_STATUS.md
   - "⚠️ Emergency checkpoint at ~120k tokens - see git log"

3. **End Session**
   - Tell user: "Token limit critical. Session ending. All work committed."

---

## 📝 Checkpoint File Naming

Format: `SESSION_CHECKPOINT_[YYYYMMDD]_[HHMM]_[topic].md`

Example: `SESSION_CHECKPOINT_20240221_1430_command_contract_testing.md`

**Location**: Project root (for easy finding)

---

## 🎯 Checkpoint Content Template

```markdown
# Session Checkpoint - [Date] [Time]

**Topic**: [What you were working on]
**Token Usage**: [X]k tokens (~[Y]% of 128k limit)
**Reason**: [Planned checkpoint / Token limit / Emergency]

---

## ✅ What Was Completed

### Files Created ([X] files)
- `path/to/file.ext` - Purpose
- `path/to/file2.ext` - Purpose

### Files Modified ([X] files)
- `path/to/file.ext` - Changes made
- `path/to/file2.ext` - Changes made

### Tests Status
- ✅ [Test suite name]: X/Y passing
- ⚠️ [Test suite name]: X/Y passing (Y failures)
- ❌ [Test suite name]: Failing

### Commits Made
```bash
git log --oneline -5
```
[Paste output here]

---

## 🚧 What's In Progress

**Current Task**: [Exact description]

**Status**: [X]% complete

**What's Done**:
- [X] Step 1
- [X] Step 2
- [ ] Step 3 (IN PROGRESS - stopped here)
- [ ] Step 4
- [ ] Step 5

**Uncommitted Files**: [X] files
```bash
git status --short
```
[Paste output here]

---

## 🎯 Next Steps (EXACT ACTIONS)

**Continue from here:**

1. **Immediate Next Action**
   - File: `path/to/file.ext`
   - Action: [Exact description]
   - Expected result: [What should happen]

2. **After That**
   - [Second action]

3. **Then**
   - [Third action]

**Estimated Time**: [X] minutes/hours

**Blockers**: [None / List any blockers]

---

## 📚 Context for Next Session

**Read These First**:
1. `PROJECT_STATUS.md` - Overall status
2. This file - Checkpoint details
3. `[specific file]` - [Why to read it]

**Key Decisions Made**:
- [Decision 1]: [Reasoning]
- [Decision 2]: [Reasoning]

**Commands to Resume**:
```bash
# Verify current state
git status

# Continue work
[specific commands]
```

---

## 💡 Notes & Discoveries

**Important Findings**:
- [Something discovered]
- [Something learned]

**Warnings**:
- [Something to watch out for]

**Questions for Next Session**:
- [Question 1]
- [Question 2]

---

## 🔗 Related Files

- `PROJECT_STATUS.md` - Updated with this session
- `[other files]` - Related work

---

**Checkpoint Created**: [Date] [Time]  
**Token Usage at Checkpoint**: [X]% ([Y]k tokens)  
**Session Can Resume**: ✅ Yes / ⚠️ With caution / ❌ Start fresh
```

---

## 🤖 AI Assistant Instructions

### Auto-Checkpoint Triggers

**AI should automatically checkpoint when:**

1. Token usage exceeds ~90k tokens (70%) AND any of:
   - About to start new major feature
   - Completed a major milestone
   - User asks "what's next?"
   - Haven't committed in 30+ minutes of work

2. Token usage exceeds ~110k tokens (85%):
   - ALWAYS checkpoint, no exceptions
   - Stop new work immediately
   - Commit, document, notify

3. User says any of these phrases:
   - "Let's stop here"
   - "Save progress"
   - "Continue later"
   - "Create checkpoint"

### Checkpoint Announcement Format

```
🚦 CHECKPOINT RECOMMENDED

Token Usage: [X]k tokens (~[Y]% of 128k limit)
Reason: [Why checkpointing]

Should I create a checkpoint now?
This will:
1. Commit all current work
2. Update PROJECT_STATUS.md
3. Create handoff document
4. Prepare for session end or continuation

Continue? (y/n)
```

---

## 📊 Token Usage Tracking

### Check Token Usage

**AI should track and announce at these milestones:**
- 32k tokens (25%) - "Quarter through session"
- 64k tokens (50%) - "Halfway through session"
- 90k tokens (70%) - "Checkpoint recommended"
- 110k tokens (85%) - "CHECKPOINT REQUIRED"
- 120k tokens (95%) - "EMERGENCY - End session now"

### Token Usage Report Format

```
📊 Token Usage Report
━━━━━━━━━━━━━━━━━━━━
Current: [X]k / ~128k tokens ([Y]%)
Status: [🟢 Safe / 🟡 Caution / 🟠 Warning / 🔴 Critical]
Action: [Continue / Checkpoint Soon / CHECKPOINT NOW]

Estimated Remaining: [X]k tokens (~[Y] responses)
Checkpoint Recommended At: 90k tokens
```

---

## ✅ Commit Strategy Per Sprint/Iteration

### End of Every Work Session

**Before ending ANY session, MUST complete:**

1. **Commit Strategy Execution** (10-15 minutes)
   ```bash
   # Run appropriate commit script
   .\commit-command-contract-testing.bat
   # OR
   .\commit-all-uncommitted.bat
   ```

2. **PROJECT_STATUS.md Update** (5 minutes)
   - Add session to "Recent Changes Log"
   - Update "Session Context"
   - Document next steps

3. **Verify Commits** (2 minutes)
   ```bash
   git log --oneline -5
   git status --short
   ```

4. **Push to Remote** (if ready)
   ```bash
   git push
   ```

---

## 🎓 Best Practices

### DO ✅

1. **Commit Early, Commit Often**
   - Every 30-50k tokens
   - After each feature/fix
   - Before starting new work

2. **Update Documentation Continuously**
   - Don't wait until end
   - Update PROJECT_STATUS.md as you go
   - Create session summaries incrementally

3. **Test Before Checkpointing**
   - Run relevant tests
   - Verify nothing broken
   - Document test results

4. **Clear Next Steps**
   - Always document "what's next"
   - Include exact file paths and actions
   - Make it easy to resume

### DON'T ❌

1. **Don't wait until 120k tokens** to checkpoint
   - Too risky
   - Not enough tokens to document properly
   - Might lose work

2. **Don't create features across checkpoint**
   - Finish current task before checkpoint
   - Or document exact stopping point

3. **Don't leave uncommitted work**
   - Always commit before checkpoint
   - Even if work is incomplete
   - Use "WIP" in commit message if needed

4. **Don't forget to push**
   - Commits only on local until pushed
   - Push after checkpoint (if stable)

---

## 🔄 Session Continuation Protocol

### Starting a New Session After Checkpoint

**User should provide:**

```
Continue from checkpoint: SESSION_CHECKPOINT_[date]_[topic].md

Read in this order:
1. PROJECT_STATUS.md
2. SESSION_CHECKPOINT_[date]_[topic].md
3. [any specific files mentioned]

Resume task: [task name from checkpoint]
```

**AI should:**

1. Read checkpoint file
2. Read PROJECT_STATUS.md
3. Verify git status
4. Confirm understanding
5. Ask if ready to continue
6. Resume from exact point

---

## 📈 Success Metrics

**Checkpoint is successful when:**

- ✅ All work committed to git
- ✅ PROJECT_STATUS.md updated
- ✅ Clear next steps documented
- ✅ New session can continue seamlessly
- ✅ No work lost
- ✅ No confusion about what's next

**Session is successful when:**

- ✅ Regular checkpoints created
- ✅ No emergency checkpoints needed
- ✅ All code committed
- ✅ All docs updated
- ✅ Tests documented
- ✅ Next session ready to go

---

## 🚨 Emergency Recovery

**If session ended without checkpoint:**

1. Check git log: `git log --oneline -10`
2. Check uncommitted: `git status`
3. Read PROJECT_STATUS.md
4. Create recovery document:
   - What was last committed
   - What's uncommitted
   - Best guess at next steps
5. Start new session with recovery

---

**Remember**: A checkpoint at 90k tokens is better than an emergency at 120k!

**Current Session Check**: Ask "What's our token usage?" to stay aware!

**Version**: 1.0  
**Last Updated**: February 21, 2024  
**Status**: ✅ ACTIVE - ENFORCE IN ALL SESSIONS