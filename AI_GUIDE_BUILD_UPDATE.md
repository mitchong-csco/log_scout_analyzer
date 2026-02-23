# AI Assistant Guide - Build Process Update

**Date**: 2024
**Status**: ✅ Complete

## Summary

Updated the AI Assistant Guide to emphasize that **all builds must go through npm scripts from the root folder**. Also created a root `package.json` to centralize build orchestration.

---

## Changes Made

### 1. Added New Section: "🔨 MANDATORY: Always Build Through npm"

**Location**: `.zed/AI_ASSISTANT_GUIDE.md` (after "Quick Start for AI Assistants" section)

**Key Points**:
- ✅ All builds MUST use npm scripts from root folder
- ✅ Never use raw `cargo`, `tsc`, or other build tools directly
- ✅ If root `package.json` doesn't exist, create it
- ✅ Documents standard build commands and what they do
- ✅ Explains why direct cargo/tsc is wrong
- ✅ Provides quick reference table

**Why This Matters**:
- Coordinates multi-language builds (Rust LSP + TypeScript extension)
- Handles path resolution correctly
- Synchronizes versions across components
- Copies LSP binary to correct location
- Platform-aware builds (Windows vs Mac vs Linux)

### 2. Created Root `package.json`

**Location**: `log_scout_analyzer/package.json`

**Purpose**: Centralized build orchestration for entire workspace

**Key Scripts**:
```bash
npm run build:lsp          # Build Rust LSP server + copy binary
npm run build:extension    # Build TypeScript VS Code extension
npm run build:zed          # Build Zed extension
npm run build:all          # Build LSP + VS Code extension
npm run check              # Fast syntax check (no full build)
npm run package            # Version bump + build + create VSIX
npm run status             # Show current versions
```

**Features**:
- Workspace configuration for monorepo
- Automatic dependency installation
- Clean commands for all components
- Test orchestration

### 3. Updated Core Workflow Sections

**Updated Sections**:
- Phase 2: Implementation (TDD - RED)
- Phase 3: Implementation (TDD - GREEN)
- Phase 4: Verification

**Changes**:
- Added explicit "Build from root" step before testing
- Emphasized using `npm run build:all` from root
- Added reminders to never use cargo/tsc directly

### 4. Updated Common Scenarios

**Scenario 1: Adding a New Feature**
- Added: "AI builds from root: cd log_scout_analyzer && npm run build:all"

**Scenario 2: Fixing a Bug**
- Added: "AI builds from root: cd log_scout_analyzer && npm run build:all"

**Scenario 3: Security Issue**
- Added: "AI builds from root: cd log_scout_analyzer && npm run build:all"

### 5. Updated "Remember" Section

**Added to Success Criteria**:
- ✅ **You ALWAYS build from root folder using npm scripts**
- ❌ **Using cargo or tsc directly instead of npm scripts (CRITICAL FAILURE)**
- ❌ **Building from subdirectories instead of root (CRITICAL FAILURE)**

---

## Build Command Reference

### From Root Folder ONLY

| Task | Command | Description |
|------|---------|-------------|
| Quick check | `npm run check` | Fast syntax check, no full build |
| Build LSP | `npm run build:lsp` | Cargo build + copy binary to extension |
| Build extension | `npm run build:extension` | TypeScript compile for VS Code |
| Build everything | `npm run build:all` | LSP + VS Code extension |
| Build Zed | `npm run build:zed` | Build Zed extension |
| Create package | `npm run package` | Version bump + build + create VSIX |
| Check versions | `npm run status` | Show current versions |
| Clean all | `npm run clean` | Clean build artifacts |

---

## The Golden Rule

```
ALWAYS:
1. cd log_scout_analyzer          # Start from root
2. npm run build:all              # Let npm orchestrate
3. npm run test                   # Test from root
4. npm run package                # Package from root

NEVER:
1. cd lsp-server && cargo build   # ❌ Wrong! Binary won't be copied
2. cd vscode-extension && tsc     # ❌ Wrong! LSP won't be built
3. Build from subdirectories      # ❌ Wrong! Paths won't work
```

---

## Why This Update Was Needed

### Problem Before
- Build commands scattered across subdirectories
- Inconsistent build processes
- Manual binary copying required
- Version sync issues
- Easy to forget steps

### Solution Now
- Centralized npm scripts in root `package.json`
- Consistent `npm run build:all` command
- Automatic binary copying
- Coordinated version updates
- Clear, documented process

---

## For AI Assistants

**When you see a build/compile task:**

1. ✅ **STOP** - Don't use cargo or tsc directly
2. ✅ **Navigate** to root: `cd log_scout_analyzer`
3. ✅ **Build** with npm: `npm run build:all`
4. ✅ **Test** from root: `npm run test`
5. ✅ **Document** what you built

**If root package.json is missing:**

1. Create it using the template in AI_ASSISTANT_GUIDE.md
2. Test that builds work
3. Update AI_ASSISTANT_GUIDE.md to document it
4. Update PROJECT_STATUS.md with the change

---

## Files Modified

1. **`.zed/AI_ASSISTANT_GUIDE.md`** (+138 lines)
   - Added "🔨 MANDATORY: Always Build Through npm" section
   - Updated Phase 2, 3, 4 workflows
   - Updated Common Scenarios
   - Updated Remember section

2. **`package.json`** (NEW - 58 lines)
   - Root workspace package.json
   - Centralized build orchestration
   - Cross-component coordination

3. **`AI_GUIDE_BUILD_UPDATE.md`** (NEW - this file)
   - Summary of changes
   - Reference documentation

---

## Next Steps for AI Assistants

When working on this project:

1. **Read** `.zed/AI_ASSISTANT_GUIDE.md` section "🔨 MANDATORY: Always Build Through npm"
2. **Follow** the build-from-root rule
3. **Use** npm scripts exclusively
4. **Update** PROJECT_STATUS.md when you complete work

---

## Questions & Answers

**Q: Can I just run `cargo build` in the lsp-server folder?**
A: ❌ NO. Use `npm run build:lsp` from root. This copies the binary to the right place.

**Q: What if I only changed TypeScript code?**
A: Still run from root: `npm run build:extension` or `npm run build:all`

**Q: Do I need to install dependencies in subdirectories?**
A: No, `npm install` in root handles everything via workspace configuration.

**Q: What if the build fails?**
A: Read the error message. If it's about missing dependencies, run `npm run dev:setup` from root.

**Q: Can I use VS Code's built-in build task?**
A: Only if it's configured to run `npm run build:all` from root. Otherwise, use terminal.

---

## Status: ✅ READY TO USE

All AI assistants should now follow the npm-based build process from the root folder.

---

**Document Version**: 1.0
**Last Updated**: 2024
**Author**: AI Assistant
**Status**: ✅ Complete and Ready for Use