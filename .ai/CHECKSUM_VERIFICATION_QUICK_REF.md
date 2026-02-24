# 🔐 Checksum Verification - Quick Reference

**Purpose**: Verify LSP server binaries are correct and detect build issues

---

## 🚀 Quick Commands

```bash
# Full checksum verification (recommended)
npm run verify:checksums

# Track binary sizes + hashes
npm run track:binaries

# Build with hash output
npm run build:lsp
```

---

## 📊 What Gets Verified

| Binary | Location | Expected Hash |
|--------|----------|---------------|
| **Production (build)** | `target/release/log-scout-lsp-server.exe` | Changes with code |
| **Production (extension)** | `vscode-extension/bin/log-scout-lsp-server.exe` | Must match build |
| **Production (Windows)** | `vscode-extension/bin/log-scout-lsp-server-win.exe` | Optional copy |
| **Legacy** | `vscode-extension/server/log-scout-lsp-server.exe` | Old, different hash OK |
| **Experimental** | `target/release/log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe` | Usually not built |

---

## ✅ Good Output (Example)

```
npm run verify:checksums

📦 Build Output
▪ Production LSP Server (build output)
  Status: ✅ Found
  Size:   9.29 MB
  SHA256: c8d4e2514eeca014248af851d243d1ddd9028a44a188a57f1bc00e9807585ea5

📁 Extension Binaries
▪ Production LSP Server (extension copy)
  Status: ✅ Found
  Size:   9.29 MB
  SHA256: c8d4e2514eeca014...  ← Same hash = Correct!

📊 Binary Comparison
⚠️  IDENTICAL BINARIES (c8d4e2514eeca014...)
   - Build output
   - Extension copy
   ← This is EXPECTED and GOOD!

Production Binary Sync Check:
✅ Build output matches extension binary
```

**This is correct** - build and extension should have identical hashes.

---

## ❌ Bad Output (Wrong Binary Built)

```
📦 Build Output
▪ Production LSP Server
  Size:   1.05 MB  ← TOO SMALL! Wrong binary!
  SHA256: 7a3f9e2c...

📁 Extension Binaries
▪ Production LSP Server (extension copy)
  Size:   1.05 MB  ← Stub binary, not production!
  SHA256: 7a3f9e2c...

Production Binary Sync Check:
⚠️  Build output differs from expected size
   Expected: 7-9 MB
   Actual:   1 MB
```

**This is wrong** - binary is too small (experimental stub was built instead).

---

## 🔍 Reading SHA256 Hashes

### **Hash Format**
```
SHA256: c8d4e2514eeca014248af851d243d1ddd9028a44a188a57f1bc00e9807585ea5
        └───────┬────────┘
           First 16 chars (displayed in short form)
```

### **What It Means**

| Hash Comparison | Meaning |
|-----------------|---------|
| **Identical hashes** | ✅ Exact same binary (bit-for-bit) |
| **Different hashes** | ⚠️ Different binaries (different code or build) |
| **No hash** | ❌ Binary doesn't exist or can't be read |

### **Examples**

```bash
# Good: Build and extension match
Build:     c8d4e2514eeca014...
Extension: c8d4e2514eeca014...  ✅ SAME = Correct

# Bad: Different binaries
Build:     c8d4e2514eeca014...
Extension: 7a3f9e2c59b4d1f8...  ❌ DIFFERENT = Wrong!

# Normal: Legacy is older version
Build:     c8d4e2514eeca014...  (new)
Legacy:    eb4dadfaafb094dc...  (old) ✅ OK - legacy can differ
```

---

## 📁 Output Files

### **Binary Checksums**
```
.log-scout/binary-checksums.txt
```

Contains:
- SHA256 and MD5 for all binaries
- Size and modification time
- Generated timestamp
- Human-readable format

**Use case**: Save with releases for verification

### **Binary Tracking History**
```
.log-scout/binary-size-tracking.json
```

Contains:
- Historical size and hash data
- Last 100 builds
- JSON format for scripting

**Use case**: Track changes over time

---

## 🛠️ Common Scenarios

### **Scenario 1: Just Built LSP - Verify It's Correct**

```bash
npm run build:lsp

# Output shows hash:
✅ LSP binary copied to: vscode-extension/bin/...
   Size: 9MB
   SHA256: c8d4e2514eec...  ← Short hash

# Verify it fully:
npm run verify:checksums

# Should show:
✅ Production Binary Sync Check: Build output matches extension binary
```

**Action**: If hashes match and size is ~9MB → ✅ Good to go!

---

### **Scenario 2: Suspicious Build - Check What Was Built**

```bash
# Build seemed fast or small...
npm run verify:checksums

# Check size:
Size: 1.05 MB  ← ❌ TOO SMALL (should be 7-9 MB)

# Check hash against known good:
SHA256: 7a3f9e2c...  ← Compare to previous builds
```

**Action**: If size < 5MB or hash is new/unknown → Rebuild!

```bash
npm run build:lsp
npm run verify:checksums
```

---

### **Scenario 3: Release - Save Checksums**

```bash
# Package new version
npm run package

# Save checksums for this release
npm run verify:checksums
cp .log-scout/binary-checksums.txt releases/v0.0.185-checksums.txt

# Or include in release notes
cat .log-scout/binary-checksums.txt
```

**Action**: Keep checksums with each release for verification.

---

### **Scenario 4: Downloaded VSIX - Verify Binary**

```bash
# Extract VSIX
unzip log-scout-analyzer-0.0.185.vsix -d extracted/

# Check binary
sha256sum extracted/extension/bin/log-scout-lsp-server.exe
# c8d4e2514eeca014248af851d243d1ddd9028a44a188a57f1bc00e9807585ea5

# Compare with release checksums
cat releases/v0.0.185-checksums.txt
```

**Action**: Hash should match release checksums.

---

## 🚨 Warning Signs

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| **Size < 2 MB** | Built experimental stub | `npm run build:lsp` |
| **Hashes don't match** | Stale copy or wrong build | Rebuild and copy |
| **Build took < 5 seconds** | Incremental or wrong package | `cargo clean && npm run build:lsp` |
| **Extension crashes (EPIPE)** | Wrong binary deployed | Verify checksum, rebuild |
| **No hash output** | Old build script | Update to latest package.json |

---

## 💡 Tips

### **Save Known-Good Hashes**

After successful release:
```bash
# v0.0.185
SHA256: c8d4e2514eeca014248af851d243d1ddd9028a44a188a57f1bc00e9807585ea5
```

Keep this in release notes or Git tag.

### **Compare Before Deployment**

```bash
# Before deploying:
npm run verify:checksums | grep SHA256

# Check against last known-good
# If different → code changed (expected with new version)
# If same → no code changes (might be config-only update)
```

### **Automate in CI/CD**

```yaml
# .github/workflows/build.yml
- name: Build LSP
  run: npm run build:lsp

- name: Verify checksums
  run: npm run verify:checksums

- name: Save checksums artifact
  uses: actions/upload-artifact@v3
  with:
    name: checksums
    path: .log-scout/binary-checksums.txt
```

---

## 🔗 Related Commands

```bash
# Size + hash tracking
npm run track:binaries

# Build with inline hash
npm run build:lsp

# Full verification
npm run verify:checksums

# Package (includes verification)
npm run package
```

---

## 📚 Related Documentation

- `LSP_BINARY_PROTECTION_SYSTEM.md` - Full protection system
- `.zed/LSP_SERVER_BUILD_WARNING.md` - Build warnings
- `scripts/track-binary-sizes.js` - Size tracking implementation
- `scripts/verify-binary-checksums.js` - Checksum verification

---

## 🎯 Quick Decision Tree

```
Is the binary correct?
├─ Size is 7-9 MB? → ✅ Probably correct
├─ Size is < 2 MB? → ❌ Wrong binary (stub)
├─ Hash matches build? → ✅ Correct copy
├─ Hash differs? → ❌ Stale or wrong copy
└─ No binary found? → ❌ Run npm run build:lsp
```

---

**Last Updated**: 2026-02-23  
**Quick Check**: `npm run verify:checksums`  
**Time**: ~1 second  
**Output**: Full SHA256 + MD5 for all binaries