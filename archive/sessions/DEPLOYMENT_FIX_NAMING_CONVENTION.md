# 🔧 Deployment Fix: File Naming Convention

**Date**: February 22, 2024  
**Issue**: Multiple extension versions causing VS Code to load old version  
**Status**: ✅ RESOLVED  
**Version**: 0.0.178

---

## 🚨 Problem Identified

### Symptom
User saw version 0.0.176 in VS Code UI despite deploying 0.0.178.

### Root Cause
1. **Multiple VSIX files** existed in build directory:
   - `log-scout-analyzer.vsix` (no version - old)
   - `log-scout-analyzer-0.0.178.vsix` (versioned - new)

2. **Multiple versions installed** in VS Code extensions folder:
   - `log-scout-team.log-scout-analyzer-0.0.176/`
   - `log-scout-team.log-scout-analyzer-0.0.177/`
   - `log-scout-team.log-scout-analyzer-0.0.178/`
   - `log-scout-team.log-scout-analyzer-0.0.26/`

3. **VS Code loaded wrong version** - picked up older version from cache.

---

## ✅ Solution Applied

### Step 1: Clean Up Build Artifacts
```bash
# Remove non-versioned VSIX file
rm vscode-extension/log-scout-analyzer.vsix

# Keep only: log-scout-analyzer-0.0.178.vsix
```

### Step 2: Clean VS Code Extensions Folder
```bash
# Remove old versions
rm -rf ~/.vscode/extensions/log-scout-team.log-scout-analyzer-0.0.176
rm -rf ~/.vscode/extensions/log-scout-team.log-scout-analyzer-0.0.177
rm -rf ~/.vscode/extensions/log-scout-team.log-scout-analyzer-0.0.26

# Keep only: log-scout-team.log-scout-analyzer-0.0.178
```

### Step 3: Reinstall Clean
```bash
# Uninstall completely
code --uninstall-extension log-scout-team.log-scout-analyzer

# Install specific version
code --install-extension vscode-extension/log-scout-analyzer-0.0.178.vsix --force
```

### Step 4: Verify
```bash
# Check installed version
code --list-extensions --show-versions | grep log-scout
# Output: log-scout-team.log-scout-analyzer@0.0.178 ✅

# Check extension folder
ls -ld ~/.vscode/extensions/log-scout-team.log-scout-analyzer-*
# Output: Only 0.0.178 exists ✅

# Check package.json version
cat ~/.vscode/extensions/log-scout-team.log-scout-analyzer-0.0.178/package.json | grep version
# Output: "version": "0.0.178" ✅
```

---

## 📋 Naming Convention Rules

### ✅ Correct: Always Use Versioned Names

**VSIX Package**:
```
✅ GOOD: log-scout-analyzer-0.0.178.vsix
✅ GOOD: log-scout-analyzer-0.0.179.vsix
❌ BAD:  log-scout-analyzer.vsix (no version)
```

**Command to Build**:
```bash
# vsce automatically adds version from package.json
npx vsce package --no-dependencies
# Creates: log-scout-analyzer-0.0.178.vsix ✅
```

**Command to Install**:
```bash
# Always specify the versioned file
code --install-extension vscode-extension/log-scout-analyzer-0.0.178.vsix --force
```

---

## 🛠️ Updated Deployment Process

### Build Script Pattern
```bash
#!/bin/bash
# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Build with explicit output
npx vsce package --no-dependencies

# Verify correct file was created
if [ -f "log-scout-analyzer-${VERSION}.vsix" ]; then
    echo "✅ Package created: log-scout-analyzer-${VERSION}.vsix"
else
    echo "❌ ERROR: Expected log-scout-analyzer-${VERSION}.vsix"
    exit 1
fi

# Clean up any non-versioned files
rm -f log-scout-analyzer.vsix

# Install the versioned file
code --install-extension "log-scout-analyzer-${VERSION}.vsix" --force
```

---

## 🔍 How to Detect This Issue

### Symptoms
1. Extension shows old version in VS Code UI
2. `code --list-extensions --show-versions` shows different version than expected
3. Multiple extension folders exist in `~/.vscode/extensions/`

### Quick Check
```bash
# Check what's actually installed
ls -d ~/.vscode/extensions/log-scout-team.log-scout-analyzer-* 2>/dev/null

# Should see ONLY the latest version
# ✅ GOOD: Only one folder (0.0.178)
# ❌ BAD:  Multiple folders (0.0.176, 0.0.177, 0.0.178)
```

---

## 🚀 Prevention Strategy

### 1. Always Clean Before Build
```bash
# Remove old VSIX files
cd vscode-extension
rm -f log-scout-analyzer*.vsix

# Build fresh
npx vsce package --no-dependencies
```

### 2. Uninstall Before Install
```bash
# Always uninstall first
code --uninstall-extension log-scout-team.log-scout-analyzer

# Then install new version
code --install-extension log-scout-analyzer-0.0.178.vsix --force
```

### 3. Verify After Install
```bash
# Check version matches
code --list-extensions --show-versions | grep log-scout

# Check only one folder exists
ls -d ~/.vscode/extensions/log-scout-team.log-scout-analyzer-*
```

---

## 📊 Before vs After

### Before (Problem)
```
vscode-extension/
├── log-scout-analyzer.vsix              ← Old, no version
└── log-scout-analyzer-0.0.178.vsix      ← New, versioned

~/.vscode/extensions/
├── log-scout-team.log-scout-analyzer-0.0.26/    ← Very old
├── log-scout-team.log-scout-analyzer-0.0.176/   ← Old
├── log-scout-team.log-scout-analyzer-0.0.177/   ← Older
└── log-scout-team.log-scout-analyzer-0.0.178/   ← Current (but ignored!)

VS Code loads: 0.0.176 ❌ (picks up old version from cache)
```

### After (Fixed)
```
vscode-extension/
└── log-scout-analyzer-0.0.178.vsix      ← Only versioned file

~/.vscode/extensions/
└── log-scout-team.log-scout-analyzer-0.0.178/   ← Only current version

VS Code loads: 0.0.178 ✅ (correct version)
```

---

## 🧪 Testing Checklist

After any deployment:

- [ ] Check VSIX files: Only versioned file exists
  ```bash
  ls vscode-extension/*.vsix
  # Should see: log-scout-analyzer-X.X.X.vsix only
  ```

- [ ] Check installed version matches
  ```bash
  code --list-extensions --show-versions | grep log-scout
  # Should match package.json version
  ```

- [ ] Check only one extension folder exists
  ```bash
  ls -d ~/.vscode/extensions/log-scout-team.log-scout-analyzer-*
  # Should see only ONE folder with correct version
  ```

- [ ] Restart VS Code and verify UI shows correct version
  - Extensions panel should show correct version number

---

## 💡 Best Practices

### DO ✅
1. Always use versioned VSIX files
2. Clean old extensions before installing new ones
3. Verify version after installation
4. Keep only the latest VSIX in build directory
5. Use `--force` flag when installing

### DON'T ❌
1. Don't keep multiple VSIX files in build directory
2. Don't skip version number in filename
3. Don't install without uninstalling first
4. Don't assume VS Code picks latest version
5. Don't leave old extension folders around

---

## 🔄 Rollback Procedure

If you need to rollback to a previous version:

```bash
# 1. Uninstall current
code --uninstall-extension log-scout-team.log-scout-analyzer

# 2. Install specific old version (if you kept the VSIX)
code --install-extension log-scout-analyzer-0.0.177.vsix --force

# 3. Or rebuild old version from git
git checkout tags/v0.0.177
cd vscode-extension
npx vsce package --no-dependencies
code --install-extension log-scout-analyzer-0.0.177.vsix --force
```

---

## 📚 Related Files

- `install-extension.bat` - Uses versioned VSIX selection
- `BUILD_ALL.bat` - Main build script
- `package.json` - Source of version number
- `DEPLOYMENT_NOTIFICATIONS_v0.0.178.md` - This deployment doc

---

## ✅ Resolution Summary

**Problem**: Multiple extension versions caused VS Code to load old version  
**Root Cause**: Non-versioned VSIX files + multiple installed versions  
**Solution**: 
1. Remove non-versioned VSIX files
2. Clean old extension folders
3. Uninstall/reinstall cleanly
4. Verify single version exists

**Result**: VS Code now correctly shows v0.0.178 ✅

---

## 🎯 Key Takeaway

**ALWAYS use versioned filenames for VSIX packages.**

The version number in the filename prevents confusion and ensures VS Code loads the correct version. VS Code's extension system can handle multiple installed versions, but it's cleaner and more reliable to have only one.

---

**Status**: ✅ RESOLVED  
**Version Now Active**: 0.0.178  
**Verification**: All checks passing
