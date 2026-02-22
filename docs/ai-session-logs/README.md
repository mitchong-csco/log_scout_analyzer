# 📂 AI Session Logs

**Purpose**: Store AI assistant session logs, progress reports, and temporary documentation  
**Why here?**: To avoid Zed editor permission prompts when AI modifies files

---

## 🚨 The Problem We Solved

When AI assistants try to modify files in the `.zed/` folder, Zed editor asks for permission every time because:
- `.zed/` contains editor configuration files
- Zed protects this folder for security (which is good!)
- But it becomes annoying when AI needs to update documentation frequently

## ✅ The Solution

**Move AI-generated session logs to `docs/ai-session-logs/` instead.**

This folder is outside `.zed/` so:
- ✅ No permission prompts
- ✅ AI can freely update progress reports
- ✅ Still version controlled and accessible
- ✅ Cleaner separation: config vs. documentation

---

## 📁 What Goes Here

### AI Session Logs
- Progress reports (e.g., `BUNDLE_TDD_PATH_C_PROGRESS.md`)
- Implementation summaries
- Session handoff notes
- Work-in-progress documentation

### Temporary Documentation
- Test implementation notes
- Debug session logs
- Performance analysis reports
- Any docs that change frequently during development

---

## 📁 What Stays in .zed/

The `.zed/` folder should only contain:

### Configuration Files
- `settings.json` - Editor settings
- `tasks.json` - Build tasks
- `rules.md` - TDD enforcement rules

### Reference Documentation (Stable)
- `PROJECT_STATUS.md` - Current project state
- `AI_ASSISTANT_GUIDE.md` - How AI should work
- Strategy documents (SECURITY_TESTING.md, etc.)
- Planning templates (PLANNING_TEMPLATES.md, etc.)

**Rule of thumb**: If it changes every session → put it here. If it's reference material → keep in `.zed/`

---

## 🔗 How to Reference Files

### From .zed/ to here
```markdown
See: docs/ai-session-logs/BUNDLE_TDD_PATH_C_PROGRESS.md
```

### From here to .zed/
```markdown
See: ../.zed/PROJECT_STATUS.md
```

### From project root
```markdown
See: docs/ai-session-logs/SESSION_NOTES.md
See: .zed/PROJECT_STATUS.md
```

---

## 📋 Naming Conventions

### Session Progress Reports
```
<FEATURE>_<PATH>_PROGRESS.md
Example: BUNDLE_TDD_PATH_C_PROGRESS.md
```

### Session Notes
```
SESSION_<DATE>_<TOPIC>.md
Example: SESSION_2024-02-20_BUNDLE_TESTS.md
```

### Implementation Reports
```
<FEATURE>_IMPLEMENTATION_<DATE>.md
Example: NORMALIZATION_IMPLEMENTATION_2024-02-20.md
```

---

## 🧹 Cleanup

These files are **temporary** and should be:
- ✅ Committed to git (for history)
- ✅ Kept for 1-2 sprints
- ✅ Archived or deleted after feature complete
- ✅ Summarized in main docs before deletion

**Archive old sessions**:
```bash
mkdir -p docs/ai-session-logs/archive/2024-02/
mv docs/ai-session-logs/SESSION_2024-02-*.md docs/ai-session-logs/archive/2024-02/
```

---

## 📊 Current Session Logs

### Active (Current Sprint)
- `BUNDLE_TDD_PATH_C_PROGRESS.md` - Path C implementation report (533 lines)

### Archive (Previous Sprints)
- None yet (first session in this folder)

---

## 🎯 Best Practices

### For AI Assistants
1. ✅ Always create progress reports here
2. ✅ Update frequently without worrying about permissions
3. ✅ Link to `.zed/PROJECT_STATUS.md` for project-wide updates
4. ✅ Use descriptive filenames with dates

### For Engineers
1. ✅ Review session logs after each AI session
2. ✅ Extract important info to permanent docs
3. ✅ Archive or delete after sprint complete
4. ✅ Keep this folder clean (< 10 active files)

---

## 🔍 Quick Reference

**Current Session**: See latest file by date  
**Project Status**: `../../.zed/PROJECT_STATUS.md`  
**How AI Works**: `../../.zed/AI_ASSISTANT_GUIDE.md`  
**Permission Info**: `../../.zed/SESSION_LOGS_LOCATION.md`

---

## ❓ FAQ

### Why not use .zed/ for everything?
Zed editor protects `.zed/` for security, causing permission prompts for AI modifications.

### Can I still put docs in .zed/?
Yes! Put stable reference docs there. Put frequently-changing session logs here.

### Will this break anything?
No! All references have been updated. Links work from anywhere.

### How do I find old session logs?
Check git history or the `archive/` subfolder.

---

**Created**: February 21, 2024  
**Purpose**: Avoid Zed permission prompts  
**Status**: Active solution ✅