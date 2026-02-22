# 📍 Session Logs Location

**AI session logs and progress reports have been moved to avoid permission prompts.**

## 🗂️ New Location

All AI session logs, progress reports, and temporary documentation are now in:

```
docs/ai-session-logs/
```

This folder is NOT in `.zed/` to prevent Zed editor from repeatedly asking for permission to modify configuration files.

## 📋 What's There

- Session progress reports (e.g., `BUNDLE_TDD_PATH_C_PROGRESS.md`)
- Temporary implementation notes
- AI assistant session summaries
- Work-in-progress documentation

## 📚 What Stays in .zed/

The `.zed/` folder contains only:
- ✅ Project guides (AI_ASSISTANT_GUIDE.md, etc.)
- ✅ Strategy documents (SECURITY_TESTING.md, etc.)
- ✅ Reference documentation (PROJECT_STATUS.md, etc.)
- ✅ Configuration files (settings.json, tasks.json, rules.md)

## 🔗 Quick Links

**Session Logs**: `../docs/ai-session-logs/`  
**Project Status**: `.zed/PROJECT_STATUS.md`  
**Current Work**: See latest file in `docs/ai-session-logs/`

---

**Why the change?**: Zed editor protects `.zed/` folder from AI modifications (for safety). Moving session logs to `docs/` prevents permission prompts while keeping important references in `.zed/`.