# 🛡️ LSP Server Binary Protection System

**Purpose**: Prevent building/deploying the wrong LSP server binary

---

## 📋 Table of Contents

1. [The Problem](#-the-problem)
2. [Protection Layers](#-protection-layers)
3. [Binary Tracking](#-binary-tracking)
4. [Usage Guide](#-usage-guide)
5. [For Future Developers](#-for-future-developers)

---

## 🚨 The Problem

This project has **TWO** LSP server implementations:

```
Production Server (Active):
  Location: lsp-server/
  Package:  log-scout-lsp-server
  Binary:   log-scout-lsp-server.exe
  Size:     ~9 MB
  Status:   ✅ PRODUCTION - Fully functional

Experimental Server (Placeholder):
  Location: crates/lsp-server-PLACEHOLDER-DO-NOT-USE/
  Package:  lsp-server-modular
  Binary:   log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe
  Size:     ~1 MB (stub)
  Status:   ❌ EXPERIMENTAL - Incomplete, exits immediately
```

**What Happened**: On Feb 22, 2026, the build script accidentally built the experimental stub instead of the production server. This resulted in:
- EPIPE errors (broken pipe)
- LSP client crashes
- Extension completely non-functional
- Packaged and deployed broken VSIX to production

**Root Cause**: Build script used `--package lsp-server` which matched the experimental package name instead of production.

---

## 🛡️ Protection Layers

### **Layer 1: Workspace Exclusion**

The experimental server is **NOT** in workspace members:

```toml
# Cargo.toml
[workspace]
members = [
    "lsp-server",                    # ✅ Production
    # "crates/lsp-server-PLACEHOLDER-DO-NOT-USE",  # ❌ Excluded
]
```

**Effect**: Cargo won't find it during workspace builds

---

### **Layer 2: Directory Naming**

```
OLD: crates/lsp-server/
NEW: crates/lsp-server-PLACEHOLDER-DO-NOT-USE/
```

**Effect**: 
- Obvious warning in directory name
- Prevents accidental navigation
- Clear "DO NOT USE" signal

---

### **Layer 3: Code-Named Binary**

```toml
# crates/lsp-server-PLACEHOLDER-DO-NOT-USE/Cargo.toml
[[bin]]
name = "log-scout-lsp-server-MODULAR-EXPERIMENTAL"
```

**Effect**:
- Binary has completely different name
- Impossible to confuse with production binary
- Won't overwrite production binary

---

### **Layer 4: Explicit Manifest Path**

```json
// package.json
"build:lsp": "cargo build --release --manifest-path lsp-server/Cargo.toml"
```

**Effect**:
- Unambiguous - points directly to production server
- No package name resolution needed
- Cargo can't select wrong package

---

### **Layer 5: Size Validation**

```javascript
// Build script checks binary size
if (binarySize < 5 MB) {
  console.error('❌ ERROR: Binary too small. Wrong package built!');
  process.exit(1);
}
```

**Effect**:
- Build fails if stub is accidentally built
- Prevents packaging broken binaries
- Immediate feedback to developer

---

### **Layer 6: Exit-on-Run Protection**

```rust
// crates/lsp-server-PLACEHOLDER-DO-NOT-USE/src/main.rs
fn main() -> anyhow::Result<()> {
    eprintln!("⚠️  EXPERIMENTAL LSP SERVER - DO NOT USE");
    eprintln!("For production, use: lsp-server/");
    std::process::exit(1);
}
```

**Effect**:
- Even if built and run, it exits immediately with warning
- Can't accidentally use in production
- Clear error message explains the issue

---

### **Layer 7: Binary Tracking & Hash Verification**

```bash
npm run track:binaries
```

**Effect**:
- Tracks size, hash, and modification time
- Detects if wrong binary was built
- Compares production vs experimental
- Historical tracking in `.log-scout/binary-size-tracking.json`

---

## 📊 Binary Tracking

### **Run Tracking**

```bash
# Check current binaries
npm run track:binaries

# Build and track
npm run track:post-build
```

### **Output**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📦 LSP SERVER BINARY SIZE TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅  Production LSP Server
   Status: PRODUCTION
   Version: 0.1.41
   Binary: log-scout-lsp-server.exe
   Size: 9.29 MB
   Modified: 2026-02-23 02:00:11
   Hash: c8d4e2514eec...
   ✅ Size within expected range

🧪  Experimental Modular LSP Server
   Status: EXPERIMENTAL
   Version: 0.1.0
   Binary: Not built
   Expected: log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe

📊 Comparison
   Experimental binary not built (this is normal).
```

### **What Gets Tracked**

```json
{
  "timestamp": "2026-02-23T02:30:00.000Z",
  "production": {
    "exists": true,
    "size": 9742336,
    "hash": "c8d4e2514eec3f1a...",
    "version": "0.1.41",
    "modified": "2026-02-23T02:00:11.000Z"
  },
  "experimental": {
    "exists": false,
    "size": 0,
    "hash": null,
    "version": "0.1.0",
    "modified": null
  }
}
```

**Stored in**: `.log-scout/binary-size-tracking.json`

**Retention**: Last 100 builds

---

## 🔧 Usage Guide

### **Normal Development (Use Production Server)**

```bash
# Build production LSP
npm run build:lsp

# Build everything
npm run build:all

# Package extension (includes tracking)
npm run package
```

**Expected output**:
```
✅ LSP binary copied to: vscode-extension/bin/... (9MB)
```

### **Testing Experimental Server (Advanced)**

```bash
# Build experimental server
cargo build --release --manifest-path crates/lsp-server-PLACEHOLDER-DO-NOT-USE/Cargo.toml

# Check what was built
npm run track:binaries

# Try to run it (will exit with warning)
./target/release/log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe
```

**Expected**: Immediate exit with warning message

---

## ⚠️ Warning Signs

### **You Built the Wrong Binary If:**

1. **Build is very fast** (< 1 second)
   - Production build: 2-3 minutes
   - Stub build: < 1 second

2. **Binary is small** (< 2 MB)
   - Production: 7-9 MB
   - Stub: ~1 MB

3. **Extension crashes immediately**
   - EPIPE errors
   - "Client is not running"
   - Server crashes 5 times in 3 minutes

4. **Tracking shows wrong size**
   ```
   ❌ ERROR: Binary too small (1MB). Wrong package built!
   ```

### **Recovery**

```bash
# Clean everything
rm target/release/log-scout-lsp-server*.exe
rm vscode-extension/bin/log-scout-lsp-server*.exe

# Rebuild correctly
npm run build:lsp

# Verify
npm run track:binaries
# Should show: ✅ Production: 9.29 MB

# Repackage
npm run package
```

---

## 👨‍💻 For Future Developers

### **When Experimental Server is Ready**

When the modular server is complete and ready to replace production:

#### **Step 1: Verify Completeness**

```bash
# Build experimental
cargo build --release --manifest-path crates/lsp-server-PLACEHOLDER-DO-NOT-USE/Cargo.toml

# Track and compare
npm run track:binaries

# Sizes should be comparable (within 20%)
```

#### **Step 2: Integration Testing**

```bash
# Copy experimental binary for testing
cp target/release/log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe \
   vscode-extension/bin/log-scout-lsp-server-test.exe

# Update lspClient.ts temporarily to use test binary
# Test thoroughly:
# - Extension activation
# - Diagnostics
# - Bundle operations
# - Performance
```

#### **Step 3: Swap (When Ready)**

```bash
# 1. Archive old production server
mv lsp-server lsp-server-ARCHIVED-v0.1.41

# 2. Promote experimental to production
mv crates/lsp-server-PLACEHOLDER-DO-NOT-USE crates/lsp-server-production

# 3. Update build scripts to point to new location
# Edit package.json:
"build:lsp": "cargo build --release --manifest-path crates/lsp-server-production/Cargo.toml"

# 4. Update tracking config in scripts/track-binary-sizes.js
# Change production.manifestPath to new location

# 5. Rename binary back to production name in Cargo.toml
# [[bin]]
# name = "log-scout-lsp-server"  # Remove MODULAR-EXPERIMENTAL suffix

# 6. Update Cargo.toml workspace members

# 7. Full rebuild and test
npm run build:all
npm run track:binaries
npm run package

# 8. Test VSIX thoroughly before deployment
```

#### **Step 4: Update Documentation**

- Update this file to reflect new architecture
- Update `.zed/AI_ASSISTANT_GUIDE.md`
- Update `CRATES_MIGRATION_PLAN.md` (mark complete)
- Create migration completion summary

---

## 📚 Related Documentation

| File | Purpose |
|------|---------|
| `.zed/LSP_SERVER_BUILD_WARNING.md` | Detailed warning about dual servers |
| `CRATES_MIGRATION_PLAN.md` | Full migration plan (if continuing) |
| `CRATES_MIGRATION_ANALYSIS.md` | Analysis of migration effort |
| `LSP_NOT_RUNNING_FIX.md` | Troubleshooting LSP issues |
| `scripts/track-binary-sizes.js` | Binary tracking implementation |

---

## 🔍 Verification Commands

```bash
# Check which binaries exist
ls -lh target/release/log-scout-lsp-server*.exe

# Check which binary extension uses
grep -r "log-scout-lsp-server" vscode-extension/src/lspClient.ts

# Track current state
npm run track:binaries

# View tracking history
cat .log-scout/binary-size-tracking.json | jq '.[-5:]'

# Verify build script
cat package.json | grep "build:lsp"
```

---

## ✅ Success Criteria

**System is working correctly when:**

1. ✅ `npm run build:lsp` builds production server (9 MB)
2. ✅ Size validation passes (no error)
3. ✅ `npm run track:binaries` shows production OK
4. ✅ Extension starts without EPIPE errors
5. ✅ Experimental binary not in workspace
6. ✅ Build scripts use `--manifest-path`
7. ✅ Package includes correct binary (check VSIX contents)

---

## 🎯 Summary

**Protection Layers**: 7 independent safeguards  
**Build Validation**: Automatic size check  
**Binary Tracking**: Size + hash verification  
**Recovery Time**: < 5 minutes with npm commands  
**Risk Level**: LOW (with all protections active)  

**Key Principle**: Make it **hard to do the wrong thing** and **easy to do the right thing**.

---

**Last Updated**: 2026-02-23  
**Incident**: Binary confusion on 2026-02-22  
**Status**: ✅ All protections active and tested  
**Maintainer**: Log Scout Team