# 🔧 Build & Deploy Separation - Version Increment Strategy

**Status**: ✅ Implemented  
**Date**: February 22, 2024  
**Affected**: VSCode Extension, Zed Extension, Build Scripts

---

## 🎯 Problem Solved

**Previous Workflow Issue**:
- Version incremented during `npm run package`
- `npm run deploy` called `package`, causing double increment
- Rebuilding/repackaging would increment version unnecessarily
- Version increments happened even when just copying binaries

**New Workflow Solution**:
- Version increments **only during compilation** (`build:all`)
- Packaging and deployment just copy/package existing binaries
- Clean separation: Build → Package → Deploy

---

## 📊 New Workflow

```
┌─────────────────────────────────────────────────────────┐
│ BUILD PHASE (Once per code change)                      │
├─────────────────────────────────────────────────────────┤
│ npm run build:all                                       │
│   ├─ npm run version:increment  ← Version bumped HERE  │
│   ├─ npm run build:lsp          ← Compile Rust         │
│   └─ npm run build              ← Compile TypeScript   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ PACKAGE PHASE (Can run multiple times)                  │
├─────────────────────────────────────────────────────────┤
│ npm run package:only             ← NO version increment │
│   └─ vsce package (or node package-extension.js)       │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│ DEPLOY PHASE (Can run multiple times)                   │
├─────────────────────────────────────────────────────────┤
│ npm run deploy                   ← NO version increment │
│   ├─ npm run package:only        ← Just package         │
│   └─ npm run vs:install (or install:zed)               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Changes

### VSCode Extension (`vscode-extension/package.json`)

**Before**:
```json
{
  "scripts": {
    "build:all": "npm run build:lsp && npm run build",
    "package": "npm run version:increment && npm run build:all && vsce package ...",
    "deploy": "npm run package && npm run vs:install"
  }
}
```

**After**:
```json
{
  "scripts": {
    "build:all": "npm run version:increment && npm run build:lsp && npm run build",
    "package": "npm run build:all && vsce package ...",
    "package:only": "vsce package --allow-star-activation --out log-scout-analyzer.vsix",
    "deploy": "npm run package:only && npm run vs:install"
  }
}
```

### Zed Extension (`zed-extension/package.json`)

**Before**:
```json
{
  "scripts": {
    "build:all": "npm run build:lsp && npm run build",
    "package": "npm run version:increment && npm run build:all && node package-extension.js",
    "deploy": "npm run package && npm run install:zed"
  }
}
```

**After**:
```json
{
  "scripts": {
    "build:all": "npm run version:increment && npm run build:lsp && npm run build",
    "package": "npm run build:all && node package-extension.js",
    "package:only": "node package-extension.js",
    "deploy": "npm run package:only && npm run install:zed"
  }
}
```

### Build Scripts

**BUILD_ALL.bat** and **BUILD_ALL.ps1** updated to:
1. Run `npm run build:all` (increments version, compiles everything)
2. Run `npm run package:only` (just packages, no increment)

---

## 💡 Usage Scenarios

### Scenario 1: Full Development Cycle
```bash
# Make code changes...
cd vscode-extension

# Build from scratch (version increments)
npm run build:all

# Package the built artifacts
npm run package:only

# Deploy to VS Code
npm run deploy
```

### Scenario 2: Quick Redeploy (No Code Changes)
```bash
# Already built, just need to reinstall
cd vscode-extension

# Package and deploy existing binaries (NO version increment)
npm run deploy
```

### Scenario 3: Package Multiple Times
```bash
# Build once
npm run build:all

# Package for different targets/tests
npm run package:only  # First package
npm run package:only  # Second package (same version!)
npm run package:only  # Third package (same version!)
```

### Scenario 4: Test Different Packaging Options
```bash
# Build with version increment
npm run build:all

# Try different VSIX settings
vsce package --allow-star-activation
vsce package --no-yarn
vsce package --pre-release

# All use the SAME version!
```

---

## 🎨 Command Summary

| Command | Version Increment? | Compiles? | Packages? | Deploys? |
|---------|-------------------|-----------|-----------|----------|
| `npm run version:increment` | ✅ Yes | ❌ No | ❌ No | ❌ No |
| `npm run build` | ❌ No | ✅ TS only | ❌ No | ❌ No |
| `npm run build:lsp` | ❌ No | ✅ Rust only | ❌ No | ❌ No |
| `npm run build:all` | ✅ **YES** | ✅ Both | ❌ No | ❌ No |
| `npm run package` | ❌ No* | ✅ Yes | ✅ Yes | ❌ No |
| `npm run package:only` | ❌ **NO** | ❌ No | ✅ Yes | ❌ No |
| `npm run deploy` | ❌ **NO** | ❌ No | ✅ Yes | ✅ Yes |

*`npm run package` calls `build:all` which increments version, but `package` itself doesn't increment.

---

## ✅ Benefits

### 1. **Predictable Versioning**
- Version only changes when you actually build
- Repackaging doesn't create version drift
- Easy to rebuild with same version for testing

### 2. **Faster Iteration**
- Can redeploy without rebuilding: ~5 seconds
- Full rebuild only when code changes: ~30 seconds
- Package multiple times without version confusion

### 3. **CI/CD Friendly**
- Build once, deploy many times
- Separate build artifacts from deployment
- Can package for multiple platforms with same version

### 4. **Cleaner Workflow**
```bash
# Developer workflow
npm run build:all    # Once per code change
npm run deploy       # As many times as needed

# CI/CD workflow
npm run build:all    # Build artifact
npm run package:only # Create distributable
# ... upload to marketplace, etc.
```

### 5. **Better Caching**
- Build artifacts can be cached
- Repackaging doesn't invalidate cache
- Faster testing cycles

---

## 🔍 Migration Notes

### No Breaking Changes
- All existing commands still work
- `npm run package` still builds everything (for backward compatibility)
- New `package:only` command is opt-in

### Updated Scripts
- ✅ `BUILD_ALL.bat` - Updated to use new workflow
- ✅ `BUILD_ALL.ps1` - Updated to use new workflow
- ✅ `vscode-extension/package.json` - New scripts added
- ✅ `zed-extension/package.json` - New scripts added

### Documentation Updates Needed
- 📝 Update quick start guides
- 📝 Update deployment workflows
- 📝 Update CI/CD documentation

---

## 🧪 Testing

### Verify Version Increment Behavior

```bash
# Test 1: Version increments during build
cd vscode-extension
npm run status              # Note current version (e.g., 0.0.176)
npm run build:all          # Should increment to 0.0.177
npm run status              # Verify version is 0.0.177

# Test 2: Version stays same during package/deploy
npm run package:only       # Should still be 0.0.177
npm run status              # Verify version is still 0.0.177
npm run deploy             # Should still be 0.0.177
npm run status              # Verify version is still 0.0.177
```

### Verify Full Workflow

```bash
# Make a code change...
echo "// test" >> src/extension.ts

# Build (version increments)
npm run build:all

# Package (no increment)
npm run package:only

# Deploy (no increment)
npm run deploy

# Verify only ONE version increment happened
npm run status
```

---

## 📚 Related Documentation

- **[BUILD_AND_DEPLOY.md](BUILD_AND_DEPLOY.md)** - Main deployment guide
- **[vscode-extension/SCRIPTS_README.md](vscode-extension/SCRIPTS_README.md)** - Script details
- **[BUILD_ALL_ENHANCED.md](BUILD_ALL_ENHANCED.md)** - Build script features

---

## 🎯 Quick Reference

### I Want To...

**Increment version and rebuild everything:**
```bash
npm run build:all
```

**Package existing build (no version change):**
```bash
npm run package:only
```

**Deploy without rebuilding:**
```bash
npm run deploy
```

**Full cycle (increment, build, package, deploy):**
```bash
npm run package  # OR
npm run build:all && npm run deploy
```

---

## 🚨 Important Notes

1. **Always run `build:all` after code changes** to ensure version increments
2. **Use `deploy` for quick reinstalls** - it won't rebuild or increment
3. **`package:only` is for CI/CD** - packages pre-built artifacts
4. **Version increments are now explicit** - only in `build:all`

---

**Last Updated**: February 22, 2024  
**Implemented By**: Log Scout Team  
**Status**: ✅ Production Ready