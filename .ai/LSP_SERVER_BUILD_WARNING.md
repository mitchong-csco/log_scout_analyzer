# ⚠️ LSP Server Build Warning - READ THIS FIRST

**CRITICAL**: This project has TWO LSP server directories. Building the wrong one will break the extension!

---

## 🚨 The Problem

```
Project Structure:
├─ lsp-server/                           ✅ REAL SERVER (use this!)
│  └─ Cargo.toml: name = "log-scout-lsp-server"
│  └─ Full implementation (~8 MB binary)
│
└─ crates/lsp-server-PLACEHOLDER-DO-NOT-USE/   ❌ STUB (DO NOT USE!)
   └─ Cargo.toml: name = "lsp-server"
   └─ Placeholder only (~1 MB binary)
```

**If you build the wrong one**: Extension will crash with EPIPE errors immediately!

---

## ✅ Correct Build Commands

### **Always use these commands:**

```bash
# From project root:
npm run build:lsp        # ✅ Uses --manifest-path (correct)
npm run build:all        # ✅ Uses --manifest-path (correct)
npm run package          # ✅ Uses --manifest-path (correct)
```

### **NEVER use these:**

```bash
# ❌ WRONG - will build placeholder stub:
cargo build --release --package lsp-server

# ❌ WRONG - ambiguous package name:
cd lsp-server && cargo build --release --package lsp-server
```

### **If you must use cargo directly:**

```bash
# ✅ CORRECT - explicit path:
cargo build --release --manifest-path lsp-server/Cargo.toml

# ✅ CORRECT - from lsp-server directory:
cd lsp-server
cargo build --release --bin log-scout-lsp-server
```

---

## 🔍 How to Verify You Built the Correct Binary

### **1. Check Binary Size**

```bash
ls -lh target/release/log-scout-lsp-server.exe

Expected: ~7-9 MB   ✅ Correct (full server)
Actual:   ~1 MB     ❌ Wrong (placeholder stub)
```

### **2. Check Build Output**

```
✅ CORRECT build output:
   Compiling log-scout-lsp-server v0.1.39
   ✅ LSP binary copied to: vscode-extension/bin/... (8MB)

❌ WRONG build output:
   Compiling lsp-server v0.1.0
   ✅ LSP binary copied to: vscode-extension/bin/... (1MB)
```

### **3. Test the Binary**

```bash
./target/release/log-scout-lsp-server.exe

Expected: Waits for LSP input (no output)
Wrong:    Exits immediately or crashes
```

---

## 🛡️ Safety Features Added

### **1. Workspace Protection**

`Cargo.toml` now excludes the placeholder from workspace:

```toml
members = [
    "lsp-server",                    # ✅ Real server
    # "crates/lsp-server",            # ❌ REMOVED - conflicts
]
```

### **2. Directory Renamed**

Placeholder renamed to make it obvious:

```
crates/lsp-server/  →  crates/lsp-server-PLACEHOLDER-DO-NOT-USE/
```

### **3. Build Validation**

Build scripts now check binary size:

```javascript
if (binarySize < 5 MB) {
  console.error('❌ ERROR: Binary too small. Wrong package built!');
  process.exit(1);
}
```

### **4. Explicit Manifest Path**

All npm scripts use `--manifest-path`:

```json
"build:lsp": "cargo build --release --manifest-path lsp-server/Cargo.toml"
```

---

## 🚨 Symptoms of Building Wrong Binary

If you accidentally built the placeholder, you'll see:

### **In VS Code Output Panel:**
```
[Error] Client Log Scout Analyzer: connection to server is erroring.
write EPIPE
[Error] Server process exited with code 0.
[Error] The Log Scout Analyzer server crashed 5 times in the last 3 minutes.
```

### **Extension Behavior:**
- Extension activates but LSP fails immediately
- No diagnostics appear in log files
- Bundle panel appears but commands fail
- "Client is not running" errors

### **Fix:**
```bash
# Rebuild with correct server:
npm run build:lsp

# Verify size:
ls -lh vscode-extension/bin/log-scout-lsp-server.exe
# Should show 7-9 MB, not 1 MB

# Repackage:
npm run package
```

---

## 📋 Pre-Build Checklist

Before building, verify:

- [ ] Using `npm run build:lsp` (not raw cargo commands)
- [ ] Workspace `Cargo.toml` has placeholder commented out
- [ ] Placeholder directory renamed to `-PLACEHOLDER-DO-NOT-USE`
- [ ] Build script uses `--manifest-path lsp-server/Cargo.toml`

---

## 🎯 Why This Situation Exists

**Context**: This project started migrating from a monolithic LSP server to a modular crates architecture:

```
Phase 1: Created new crates/ structure (STARTED)
Phase 2: Migrate code to crates (NOT STARTED)
Phase 3: Delete old lsp-server/ (NOT REACHED)

Current State: Both exist, causing confusion
```

**Options Going Forward:**

### **Option A: Complete Migration** (4-6 days)
- Finish moving code to `crates/`
- Delete old `lsp-server/`
- Use modular architecture
- See: `CRATES_MIGRATION_PLAN.md`

### **Option B: Stay with Monolithic** (current)
- Keep using `lsp-server/`
- Delete `crates/lsp-server-PLACEHOLDER-DO-NOT-USE/`
- Accept monolithic structure
- ✅ **This is the current approach**

### **Option C: Hybrid** (not recommended)
- Keep both for different purposes
- High confusion risk
- Not worth the complexity

---

## 🔧 Quick Recovery Procedure

If you suspect you built/packaged the wrong binary:

```bash
# 1. Clean everything
rm -rf target/release/log-scout-lsp-server.exe
rm -rf vscode-extension/bin/log-scout-lsp-server.exe

# 2. Rebuild correctly (from root)
npm run build:lsp

# 3. Verify size
ls -lh vscode-extension/bin/log-scout-lsp-server.exe
# Must be 7-9 MB

# 4. Test binary
./vscode-extension/bin/log-scout-lsp-server.exe
# Should wait for input (Ctrl+C to exit)

# 5. Repackage
npm run package

# 6. Reinstall
code --uninstall-extension log-scout-team.log-scout-analyzer
code --install-extension vscode-extension/log-scout-analyzer-*.vsix
```

---

## 📚 Related Documentation

- `CRATES_MIGRATION_ANALYSIS.md` - Why migration was considered
- `CRATES_MIGRATION_PLAN.md` - How to complete migration
- `LSP_NOT_RUNNING_FIX.md` - Troubleshooting LSP issues
- `.zed/AI_ASSISTANT_GUIDE.md` - Build process guidelines

---

## ✅ Summary

**DO:**
- ✅ Use `npm run build:lsp` from project root
- ✅ Verify binary is 7-9 MB after build
- ✅ Use `--manifest-path lsp-server/Cargo.toml` if using cargo directly

**DON'T:**
- ❌ Use `--package lsp-server` (ambiguous)
- ❌ Build from `crates/lsp-server-PLACEHOLDER-DO-NOT-USE/`
- ❌ Package binaries < 5 MB

**Remember**: If the extension crashes with EPIPE errors, you built the wrong server!

---

**Last Updated**: 2026-02-22  
**Status**: Active protection measures in place  
**Risk Level**: LOW (with current safeguards)