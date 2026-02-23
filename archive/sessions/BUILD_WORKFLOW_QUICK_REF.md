# 🚀 Build Workflow Quick Reference

**Last Updated**: February 22, 2024  
**Version Increment**: Only during `build:all` ✅

---

## 📊 The Three-Phase Workflow

```
┌─────────────────────────────────────────────┐
│  PHASE 1: BUILD (Version Increments Here)  │
│  npm run build:all                          │
│    ├─ Increment version  ← 0.0.176 → 0.0.177│
│    ├─ Build Rust LSP                        │
│    └─ Build TypeScript                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PHASE 2: PACKAGE (No Version Change)      │
│  npm run package:only                       │
│    └─ Create .vsix from binaries            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  PHASE 3: DEPLOY (No Version Change)       │
│  npm run deploy                             │
│    ├─ Package (if needed)                   │
│    └─ Install to VS Code/Zed                │
└─────────────────────────────────────────────┘
```

---

## 🎯 Common Scenarios

### Scenario 1: I Changed Code
```bash
cd vscode-extension   # or zed-extension

# Build everything (version increments once)
npm run build:all

# Deploy (no version change)
npm run deploy
```

**Result**: Version incremented once ✅

---

### Scenario 2: I Just Want to Reinstall
```bash
cd vscode-extension   # or zed-extension

# Just deploy existing build
npm run deploy
```

**Result**: No version change, quick reinstall ✅

---

### Scenario 3: I Want to Test Packaging Multiple Times
```bash
cd vscode-extension

# Build once
npm run build:all     # Version: 0.0.176 → 0.0.177

# Package multiple times (same version!)
npm run package:only  # Still 0.0.177
npm run package:only  # Still 0.0.177
npm run package:only  # Still 0.0.177
```

**Result**: Same version for all packages ✅

---

### Scenario 4: Full Build from Scratch
```bash
cd vscode-extension

# Option A: Use the combined command
npm run package       # Builds + packages

# Option B: Step by step
npm run build:all     # Build first
npm run package:only  # Then package
```

**Result**: Clean build with one version increment ✅

---

## 📋 Command Cheat Sheet

| Command | What It Does | Version Change? |
|---------|--------------|-----------------|
| `npm run build:all` | Increment version + build LSP + build TS | ✅ **YES** |
| `npm run package` | Build everything + create package | ✅ (via build:all) |
| `npm run package:only` | Create package from existing build | ❌ **NO** |
| `npm run deploy` | Package + install | ❌ **NO** |

---

## ⚡ Quick Commands

```bash
# Check current version
npm run status

# Full build cycle (for code changes)
npm run build:all && npm run deploy

# Quick redeploy (no code changes)
npm run deploy

# Clean everything and rebuild
npm run clean && npm run build:all
```

---

## 🎨 Visual Flowchart

```
┌─────────────────────────────────────────────────────────┐
│ DID YOU CHANGE CODE?                                    │
└─────────────────────────────────────────────────────────┘
           │
           ├── YES ────────────────────┐
           │                           ↓
           │              ┌─────────────────────────┐
           │              │ npm run build:all       │
           │              │ (Version increments)    │
           │              └─────────────────────────┘
           │                           │
           │                           ↓
           │              ┌─────────────────────────┐
           │              │ npm run deploy          │
           │              │ (Just packages/installs)│
           │              └─────────────────────────┘
           │
           └── NO ─────────────────────┐
                                       ↓
                          ┌─────────────────────────┐
                          │ npm run deploy          │
                          │ (Uses existing build)   │
                          └─────────────────────────┘
```

---

## 🚨 Important Rules

1. **Version increments ONLY in `build:all`**
   - Not in `package`
   - Not in `package:only`
   - Not in `deploy`

2. **Changed code? Use `build:all` first**
   - Ensures version increment
   - Rebuilds everything
   - Then use `deploy`

3. **Just testing? Use `deploy` alone**
   - Reinstalls without rebuilding
   - No version change
   - Super fast (~5 seconds)

4. **CI/CD pattern**
   ```bash
   npm run build:all     # Once (version bump)
   npm run package:only  # Many times (same version)
   ```

---

## 💡 Pro Tips

### Tip 1: Check Version Before/After
```bash
npm run status          # Before: v0.0.176
npm run build:all      # Build (increments)
npm run status          # After: v0.0.177
npm run deploy         # Deploy (no change)
npm run status          # Still: v0.0.177 ✅
```

### Tip 2: Fast Development Loop
```bash
# Make code change
nano src/extension.ts

# Quick rebuild + deploy
npm run build:all && npm run deploy

# Reload VS Code (Ctrl+Shift+P → Reload Window)
```

### Tip 3: Package for Distribution
```bash
# Build once with new version
npm run build:all

# Package for marketplace
npm run package:only

# Result: vscode-extension/log-scout-analyzer.vsix
# or zed-extension/dist/log-scout-analyzer.tar.gz
```

---

## 🔍 Troubleshooting

### "Version didn't increment!"
- Did you run `build:all`? Only that command increments.
- Check: `npm run status` to see current version

### "Version incremented twice!"
- Old workflow: `package` used to increment
- New workflow: Only `build:all` increments
- Solution: Use `package:only` for re-packaging

### "Build is slow!"
- Full build: `npm run build:all` (~30 seconds)
- Quick deploy: `npm run deploy` (~5 seconds)
- Use `deploy` when no code changes

---

## 📚 Learn More

- **[BUILD_DEPLOY_SEPARATION.md](BUILD_DEPLOY_SEPARATION.md)** - Full explanation
- **[BUILD_AND_DEPLOY.md](BUILD_AND_DEPLOY.md)** - Deployment guide
- **[vscode-extension/SCRIPTS_README.md](vscode-extension/SCRIPTS_README.md)** - Script details

---

## ✅ Remember

```
Code Changed?
  YES → npm run build:all  (version increments)
  NO  → npm run deploy     (no version change)
```

**That's it!** 🎉