# 🔴 ROOT CAUSE: LSP Connection Breaking

**Date**: February 22, 2024  
**Severity**: CRITICAL  
**Status**: ✅ IDENTIFIED & DOCUMENTED  
**Impact**: Every deployment breaks LSP connection

---

## 🚨 THE PROBLEM

**Symptom**: After building and deploying, VS Code shows "LSP disconnected" or no diagnostics appear.

**User Experience**: Goes from working → broken after every build/deploy cycle.

---

## 🔍 ROOT CAUSE IDENTIFIED

### The Issue: **LSP Binary Not Copied to Extension**

When we build the LSP server, the binary is created in:
```
target/release/log-scout-lsp-server.exe
```

But the VS Code extension looks for it in:
```
vscode-extension/bin/log-scout-lsp-server-win.exe
```

**Critical Gap**: Our build process does NOT copy the binary to the extension folder!

---

## 📊 Timeline of the Break

1. **Build LSP server** → `target/release/log-scout-lsp-server.exe` (new, with notifications)
2. **Package extension** → Uses OLD binary from `vscode-extension/bin/` (from morning)
3. **Install extension** → Extension has OLD LSP server (no notifications)
4. **User sees**: Broken connection (old binary doesn't match new code)

---

## 🔧 What We Were Missing

### Missing Step in Build Process

```bash
# What we were doing:
cargo build --release                    # ✅ Builds new binary
cd vscode-extension && vsce package      # ❌ Uses OLD binary
code --install-extension *.vsix          # ❌ Installs OLD binary

# What we SHOULD be doing:
cargo build --release                                           # ✅ Build new binary
cp target/release/log-scout-lsp-server.exe vscode-extension/bin/log-scout-lsp-server-win.exe  # ← CRITICAL!
cd vscode-extension && vsce package                            # ✅ Packages NEW binary
code --install-extension *.vsix                                # ✅ Installs NEW binary
```

---

## 📁 File Locations

### LSP Server Binary (Built Here)
```
target/
├── debug/
│   └── log-scout-lsp-server.exe         (29 MB - debug build)
└── release/
    └── log-scout-lsp-server.exe         (1.1 MB - release build) ← SOURCE
```

### Extension Binary (Must Be Copied Here)
```
vscode-extension/
├── bin/
│   ├── log-scout-lsp-server-win.exe     ← DESTINATION (Windows)
│   ├── log-scout-lsp-server-linux       ← DESTINATION (Linux)
│   └── log-scout-lsp-server-mac         ← DESTINATION (macOS)
└── package.json
```

### Extension Code (Looks Here)
```typescript
// vscode-extension/src/lspClient.ts
function getServerPath(context: vscode.ExtensionContext): string {
  const binDir = path.join(context.extensionPath, "bin");
  
  if (platform === "win32") {
    serverExecutable = path.join(binDir, "log-scout-lsp-server-win.exe");  // ← LOOKS HERE
  }
  
  // Check if server binary exists
  if (!fs.existsSync(serverExecutable)) {
    throw new Error(`LSP server binary not found: ${serverExecutable}`);
  }
}
```

---

## ✅ THE FIX

### Correct Build & Deploy Process

```bash
#!/bin/bash
# Step 1: Build LSP server (release mode)
cd lsp-server
cargo build --release

# Step 2: Copy binary to extension (CRITICAL!)
cd ..
cp target/release/log-scout-lsp-server.exe vscode-extension/bin/log-scout-lsp-server-win.exe

# Step 3: Package extension (now includes new binary)
cd vscode-extension
npx vsce package --no-dependencies

# Step 4: Install extension
code --uninstall-extension log-scout-team.log-scout-analyzer
code --install-extension log-scout-analyzer-0.0.178.vsix --force

# Step 5: Restart VS Code
echo "⚠️  RESTART VS CODE to activate new extension"
```

---

## 🎯 Verification Checklist

After every build, verify these timestamps match:

```bash
# Check when LSP server was built
ls -lh target/release/log-scout-lsp-server.exe
# Output: Feb 22 12:45  ← Note timestamp

# Check when extension binary was updated
ls -lh vscode-extension/bin/log-scout-lsp-server-win.exe
# Output: Feb 22 12:46  ← Should be AFTER or SAME as above

# If timestamps don't match → LSP binary wasn't copied!
```

---

## 🔴 Why This Keeps Breaking

### Our Current Workflow Issues

1. **No automated copy step** - We manually build, but forget to copy
2. **Multiple build scripts** - `BUILD_ALL.bat`, `build-lsp.bat`, etc. (inconsistent)
3. **No verification** - We don't check if binary was copied
4. **Muscle memory** - We're used to just running `cargo build` and expecting it to work

### The Silent Failure

The worst part: **No error message!**

- Extension packages successfully (uses old binary)
- Extension installs successfully (old binary included)
- VS Code starts successfully (loads old binary)
- LSP server starts successfully (old version runs)
- **But**: Code doesn't match, features missing, connection unstable

---

## 📊 Evidence

### Before Fix (Broken)
```bash
$ ls -lh target/release/log-scout-lsp-server.exe
-rwxr-xr-x  1.1M Feb 22 12:45 target/release/log-scout-lsp-server.exe  ← NEW

$ ls -lh vscode-extension/bin/log-scout-lsp-server-win.exe  
-rwxr-xr-x  9.3M Feb 22 07:44 vscode-extension/bin/log-scout-lsp-server-win.exe  ← OLD (5 hours old!)

Result: Extension uses 5-hour-old binary → Connection breaks
```

### After Fix (Working)
```bash
$ ls -lh target/release/log-scout-lsp-server.exe
-rwxr-xr-x  1.1M Feb 22 12:45 target/release/log-scout-lsp-server.exe  ← NEW

$ ls -lh vscode-extension/bin/log-scout-lsp-server-win.exe  
-rwxr-xr-x  1.1M Feb 22 12:46 vscode-extension/bin/log-scout-lsp-server-win.exe  ← NEW (same size!)

Result: Extension uses current binary → Connection works
```

---

## 🛠️ Solution: Automated Build Script

Create `BUILD_AND_DEPLOY.bat` (Windows):

```batch
@echo off
echo ============================================
echo Log Scout Analyzer - Complete Build & Deploy
echo ============================================

REM Step 1: Build LSP Server
echo.
echo [1/5] Building LSP Server (release mode)...
cargo build --release --package lsp-server
if errorlevel 1 (
    echo ERROR: LSP build failed!
    exit /b 1
)

REM Step 2: Copy Binary to Extension
echo.
echo [2/5] Copying LSP binary to extension...
copy /Y target\release\log-scout-lsp-server.exe vscode-extension\bin\log-scout-lsp-server-win.exe
if errorlevel 1 (
    echo ERROR: Binary copy failed!
    exit /b 1
)

REM Step 3: Verify Binary Was Copied
echo.
echo [3/5] Verifying binary...
if not exist vscode-extension\bin\log-scout-lsp-server-win.exe (
    echo ERROR: Binary not found in extension!
    exit /b 1
)
dir vscode-extension\bin\log-scout-lsp-server-win.exe

REM Step 4: Package Extension
echo.
echo [4/5] Packaging VS Code extension...
cd vscode-extension
call npx vsce package --no-dependencies
if errorlevel 1 (
    echo ERROR: Extension packaging failed!
    cd ..
    exit /b 1
)
cd ..

REM Step 5: Install Extension
echo.
echo [5/5] Installing extension...
code --uninstall-extension log-scout-team.log-scout-analyzer
code --install-extension vscode-extension\log-scout-analyzer-*.vsix --force

echo.
echo ============================================
echo ✅ BUILD & DEPLOY COMPLETE
echo ============================================
echo.
echo ⚠️  IMPORTANT: Restart VS Code to activate the extension
echo.
pause
```

---

## 🔄 Platform-Specific Binary Names

### Cross-Platform Copy Commands

```bash
# Windows
cp target/release/log-scout-lsp-server.exe vscode-extension/bin/log-scout-lsp-server-win.exe

# Linux
cp target/release/log-scout-lsp-server vscode-extension/bin/log-scout-lsp-server-linux

# macOS
cp target/release/log-scout-lsp-server vscode-extension/bin/log-scout-lsp-server-mac
```

---

## 🎓 Lessons Learned

### Why This Is Easy to Miss

1. **Cargo only builds** - Doesn't copy to other locations
2. **VSCode packages whatever exists** - Doesn't check if it's latest
3. **No timestamp validation** - Old binary still "works"
4. **Silent failure** - Everything appears to succeed

### Prevention Strategies

1. ✅ **Always copy binary** after building
2. ✅ **Verify timestamps** match
3. ✅ **Use automated script** (don't rely on memory)
4. ✅ **Check file sizes** (debug=29MB, release=1.1MB)
5. ✅ **Test LSP connection** after every deploy

---

## 🚀 Quick Recovery

If LSP breaks after deployment:

```bash
# 1. Rebuild and copy
cargo build --release --package lsp-server
cp target/release/log-scout-lsp-server.exe vscode-extension/bin/log-scout-lsp-server-win.exe

# 2. Repackage (will include new binary)
cd vscode-extension
npx vsce package --no-dependencies

# 3. Reinstall
cd ..
code --uninstall-extension log-scout-team.log-scout-analyzer
code --install-extension vscode-extension/log-scout-analyzer-*.vsix --force

# 4. Restart VS Code
```

---

## 📋 Deployment Checklist

Before marking deployment "complete", verify:

- [ ] LSP server built successfully (`cargo build --release`)
- [ ] Binary copied to extension (`cp target/release/...`)
- [ ] Timestamps match (source and destination within 1 minute)
- [ ] File sizes match (both should be ~1.1MB for release)
- [ ] Extension packaged with new binary
- [ ] Extension installed
- [ ] VS Code restarted
- [ ] LSP connection works
- [ ] Features work (analyze file, see diagnostics)

---

## 🎯 Summary

**Root Cause**: LSP binary not copied from build output to extension folder

**Impact**: Every deployment breaks LSP connection (old binary, new code)

**Fix**: Add binary copy step to build process

**Prevention**: Use automated build script that includes copy step

**Verification**: Check timestamps match after every build

---

## 🔗 Related Files

- Build script: `BUILD_AND_DEPLOY.bat` (to be created)
- LSP client: `vscode-extension/src/lspClient.ts`
- Package config: `vscode-extension/package.json`

---

**Status**: ✅ Root cause identified and documented  
**Next Action**: Create automated build script with binary copy step  
**Priority**: CRITICAL - Must fix for every future deployment