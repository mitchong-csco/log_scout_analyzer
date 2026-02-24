# 💬 CHAT CONTINUATION GUIDE

**Purpose**: Guide for what files to attach when starting a new AI chat session.

---

## 🎯 QUICK START

### Minimum Required (Always)

Copy-paste this message:

```
I'm continuing work on Log Scout Analyzer.

Please read:
1. .zed/PROJECT_STATUS.md
2. .zed/AI_ASSISTANT_GUIDE.md

Task: [describe your goal]
```

**The AI will read these files from the project automatically.**

---

## 📎 WHAT TO ATTACH IN THREADS

### Option 1: Minimal (Recommended)

**Just paste this message** - AI reads from project:
```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md for full context.
Task: [your task]
```

**No attachments needed!** The AI can read files directly from the project.

---

### Option 2: If Files Changed Since Last Update

If you updated PROJECT_STATUS.md and want to ensure AI sees latest:

**Attach**:
1. `.zed/PROJECT_STATUS.md` (current status)

**Message**:
```
Continuing Log Scout Analyzer.
I've attached updated PROJECT_STATUS.md.
Task: [your task]
```

---

### Option 3: Specific Component Work

If working on specific component:

**Attach**:
1. `.zed/PROJECT_STATUS.md` (current status)
2. Relevant source file (if discussing specific code)

**Example - Working on Normalizers**:
```
Continuing Log Scout Analyzer - normalizer work.

Attached:
- .zed/PROJECT_STATUS.md (status)
- crates/pattern-engine/src/normalizers/cube_normalizer.rs (template)

Task: Create JabberNormalizer using cube_normalizer.rs as template
```

---

### Option 4: Debugging Session

**Attach**:
1. `.zed/PROJECT_STATUS.md` (current status)
2. Error output (if have compile errors)
3. Relevant source file (if debugging specific code)

**Example**:
```
Continuing Log Scout Analyzer - debugging compilation error.

Attached:
- .zed/PROJECT_STATUS.md
- error output from cargo build
- crates/pattern-engine/src/normalizers/mod.rs

Error: mod.rs references jabber_normalizer.rs which doesn't exist
```

---

## 📂 KEY FILES REFERENCE

### Always Available (AI Can Read)

```
Project Status & Planning:
  .zed/PROJECT_STATUS.md              ⭐ Most important
  .zed/AI_ASSISTANT_GUIDE.md          ⭐ How to work efficiently
  .zed/SESSION_HANDOFF_TEMPLATE.md    📋 Handoff template
  .zed/NEW_CHAT_START_HERE.md         🚀 Quick start

Bundle Import Documentation:
  QUICK_START_TESTING.md              5-min test guide
  STATUS_BUNDLE_IMPORT_READY.md       Implementation details
  TESTING_CHECKLIST.md                Test scenarios

Normalization Documentation:
  PHASE1_COMPLETE_NEXT_STEPS.md       ⭐ Phase 2 roadmap
  HYBRID_NORMALIZATION_PHASE1_STATUS.md  Phase 1 details
  INTEGRATION_PLAN_HYBRID_NORMALIZATION.md  Full plan
  HYBRID_NORMALIZATION_SUMMARY.md     Overview

Source Code - Normalizers:
  crates/pattern-engine/src/normalizers/mod.rs           Trait + utils
  crates/pattern-engine/src/normalizers/cube_normalizer.rs   CUBE (template)
  crates/pattern-engine/src/normalizers/cucm_normalizer.rs   CUCM (template)

Source Code - Bundle Import:
  lsp-server/src/bundle/archive_extractor.rs
  lsp-server/src/bundle/manager.rs
```

---

## 🎯 ATTACHMENT STRATEGY BY TASK

### Creating New Normalizer

**Minimal**:
```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md.

Task: Create JabberNormalizer
```

**With Template**:
Attach: `cube_normalizer.rs` (if you want to discuss specific patterns)

---

### Fixing Bug

**Minimal**:
```
Continuing Log Scout Analyzer - bug fix.
Read .zed/PROJECT_STATUS.md.

Bug: [description]
```

**With Context**:
Attach: File with the bug + error output

---

### Testing Feature

**Minimal**:
```
Continuing Log Scout Analyzer - testing.
Read .zed/PROJECT_STATUS.md.

Test: [what to test]
```

**With Test Results**:
Attach: Test output or log file if have failures

---

### Code Review

**Minimal**:
```
Continuing Log Scout Analyzer - code review.
Read .zed/PROJECT_STATUS.md.

Review: [component]
```

**With Code**:
Attach: Specific file(s) to review

---

## 🚫 DON'T ATTACH THESE

**Never attach** (AI can read from project):
- ❌ All documentation files (AI reads directly)
- ❌ Source files AI can read from project
- ❌ Test files already in project
- ❌ Configuration files (.zed/*, package.json, etc.)

**Only attach**:
- ✅ Updated PROJECT_STATUS.md if just changed
- ✅ Error output from terminal
- ✅ Log files if debugging
- ✅ Specific code snippet if discussing pattern

---

## 💡 BEST PRACTICES

### DO ✅

1. **Always reference PROJECT_STATUS.md**
   ```
   Read .zed/PROJECT_STATUS.md
   ```

2. **Be specific about task**
   ```
   Task: Create JabberNormalizer using CUBE as template
   ```

3. **Mention blockers if known**
   ```
   Blocker: File referenced but doesn't exist
   ```

4. **Reference documentation locations**
   ```
   Requirements: PHASE1_COMPLETE_NEXT_STEPS.md lines 214-279
   ```

5. **Ask for confirmation**
   ```
   Please confirm you understand the task.
   ```

### DON'T ❌

1. **Don't be vague**
   ```
   ❌ Continue the work
   ```

2. **Don't attach everything**
   ```
   ❌ Attaching 10 files "just in case"
   ```

3. **Don't assume memory**
   ```
   ❌ Remember what we were doing?
   ```

4. **Don't skip status file**
   ```
   ❌ Starting without reading PROJECT_STATUS.md
   ```

5. **Don't forget context**
   ```
   ❌ No mention of what was done previously
   ```

---

## 📊 ATTACHMENT SIZE GUIDE

### Text Files
- ✅ Small (<10KB): Fine to attach
- ⚠️ Medium (10-50KB): Attach if discussing specific sections
- ❌ Large (>50KB): Don't attach, reference line numbers instead

### Error Output
- ✅ Console errors: Copy-paste directly in message
- ✅ Short log files (<5KB): Attach
- ❌ Large log files: Share relevant excerpt only

### Code Files
- ✅ Single function/class: Copy-paste in message
- ✅ Full file if <500 lines: Can attach if discussing
- ❌ Multiple large files: Don't attach, AI reads from project

---

## 🔄 WORKFLOW

```
┌─────────────────────────────┐
│ Starting New Chat?          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Updated PROJECT_STATUS.md?  │
└──┬────────────────────┬─────┘
   │ No                 │ Yes
   ▼                    ▼
┌──────────────┐    ┌──────────────────┐
│ Just message │    │ Attach updated   │
│ AI to read   │    │ PROJECT_STATUS.md│
└──────┬───────┘    └────────┬─────────┘
       │                     │
       └─────────┬───────────┘
                 │
                 ▼
┌─────────────────────────────┐
│ Specific code to discuss?   │
└──┬────────────────────┬─────┘
   │ No                 │ Yes
   ▼                    ▼
┌──────────┐    ┌────────────────────┐
│ Just task│    │ Attach relevant    │
│ message  │    │ file or snippet    │
└────┬─────┘    └──────┬─────────────┘
     │                 │
     └────────┬────────┘
              │
              ▼
┌─────────────────────────────┐
│ Send message & start work   │
└─────────────────────────────┘
```

---

## 📝 MESSAGE TEMPLATES

### Standard Continuation
```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md.
Task: [specific task]
```

### With Recent Update
```
Continuing Log Scout Analyzer.
Just updated PROJECT_STATUS.md (attached).
Task: [specific task]
```

### With Code Discussion
```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md.

Attached: [filename] - want to discuss [aspect]
Task: [specific task]
```

### Debugging
```
Continuing Log Scout Analyzer - debugging.
Read .zed/PROJECT_STATUS.md.

Error: [description]
Attached: error output

Need help with: [specific issue]
```

### Quick Question
```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md.

Quick question: [your question]
Context: [relevant context]
```

---

## ⏱️ TIME COMPARISON

### Minimal Approach (Recommended)
```
Message: "Read .zed/PROJECT_STATUS.md, Task: X"
Time: 30 seconds
AI reads status: 30 seconds
Start working: 1 minute total
```

### Over-Attachment Approach (Not Recommended)
```
Gather 10 files: 5 minutes
Attach files: 2 minutes
AI processes: 2 minutes
Still asks questions: 3 minutes
Start working: 12 minutes total
```

**Savings: 11 minutes per session**

---

## 🎯 SUMMARY

### Golden Rules

1. **Always reference PROJECT_STATUS.md** - AI reads it automatically
2. **Be specific about task** - "Create JabberNormalizer" not "continue work"
3. **Only attach what's new** - Error output, updated status, specific code
4. **Don't attach project files** - AI can read them already
5. **Include context** - Brief summary of where you are

### Typical Message

```
Continuing Log Scout Analyzer.
Read .zed/PROJECT_STATUS.md.

Task: [specific and clear]
Context: [if needed]

[Attachments: only if necessary]
```

### Result

- ✅ AI gets full context immediately
- ✅ No 20 questions back and forth
- ✅ Start working in 1 minute
- ✅ Save 10+ minutes per session

---

**Version**: 1.0  
**Created**: 2024-02-20  
**Purpose**: Optimize chat continuation efficiency  
**Time saved per use**: 10+ minutes