# 📦 Build & Deployment Scripts Guide

This document explains the automated build and deployment workflow for the Log Scout Analyzer VSCode extension.

---

## 🎯 Overview

The extension uses a set of Node.js scripts to automate:
- Version management (both extension and LSP server)
- Build information generation
- Compilation and packaging
- Installation into VSCode

---

## 📜 Available Scripts

### 1. `increment-version.js`
**Purpose:** Auto-increments the patch version (third octet) in both:
- `package.json` (extension version)
- `lsp-server/Cargo.toml` (LSP server version)

**Example:**
```bash
node increment-version.js
```

**Output:**
```
🔄 Incrementing versions...

📦 Extension Version:
   Old: 0.0.162
   New: 0.0.163

🦀 LSP Server Version:
   Old: 0.1.10
   New: 0.1.11

✅ Version increment complete!
```

---

### 2. `update-versions.js`
**Purpose:** Syncs version information between `package.json` and `Cargo.toml`, then updates the activity bar titles in `package.json` to display both versions.

**Example:**
```bash
node update-versions.js
```

**Output:**
```
📦 Updating version information...
   ✓ Extension: v0.0.163
   ✓ LSP Server: v0.1.11
✅ Version information updated in package.json
   Activity bar: v0.0.163 | LSP v0.1.11
```

**Result:** Activity bar in VSCode will show: `Scout Analyzer (v0.0.163 | LSP v0.1.11)`

---

### 3. `generate-build-info.js`
**Purpose:** Generates `src/buildInfo.ts` with:
- Version number
- Build timestamp
- Build number (Unix timestamp)
- Git commit hash (if available)

**Example:**
```bash
node generate-build-info.js
```

**Output:**
```
✅ Build info generated successfully!
   Version: 0.0.163
   Build: 2026-02-19T13:58:56.165Z
   Build #: 1771509536166
   Git: c64fbc8
   Output: C:\...\vscode-extension\src\buildInfo.ts
```

**Generated File (`src/buildInfo.ts`):**
```typescript
export const BUILD_INFO = {
    version: "0.0.163",
    buildTimestamp: "2026-02-19T13:58:56.165Z",
    buildNumber: 1771509536166,
    gitCommit: "c64fbc8",
} as const;
```

---

### 4. `copy-vsix.js`
**Purpose:** Copies the generated `.vsix` file to `%USERPROFILE%\Downloads\vscode-extensions\` for easy access.

**Example:**
```bash
node copy-vsix.js
```

**Output:**
```
✅ VSIX package copied successfully!
   📦 File: log-scout-analyzer.vsix (1234.56 KB)
   📂 Location: C:\Users\yourname\Downloads\vscode-extensions

To install in VS Code, run:
   code --install-extension "C:\Users\yourname\Downloads\vscode-extensions\log-scout-analyzer.vsix"
```

---

## 🚀 NPM Scripts Workflow

### Quick Reference

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run version:increment` | Runs `increment-version.js` | Increment patch versions |
| `npm run update:versions` | Runs `update-versions.js` | Sync and update activity bar |
| `npm run build` | Runs update, generate, compile | Full build process |
| `npm run build:lsp` | Builds Rust LSP server | Compile and copy LSP binary |
| `npm run build:all` | Runs `build:lsp` + `build` | Complete build (LSP + extension) |
| `npm run compile` | Runs TypeScript compiler | Compile TS to JS |
| `npm run package` | Runs increment, build, vsce | Create `.vsix` file |
| `npm run deploy` | Runs package + install | Full deployment workflow |

---

## 🔄 Complete Deployment Workflow

### One-Command Deploy

```bash
npm run deploy
```

**This automatically:**
1. ✅ Increments version in `package.json`
2. ✅ Increments version in `lsp-server/Cargo.toml`
3. ✅ Builds Rust LSP server (`cargo build --release`)
4. ✅ Copies LSP binary to `vscode-extension/bin/`
5. ✅ Updates activity bar titles with version info
6. ✅ Generates `src/buildInfo.ts`
7. ✅ Compiles TypeScript
8. ✅ Packages everything into `.vsix` file
9. ✅ Installs the extension into VSCode
10. ✅ Copies `.vsix` to Downloads folder

**After running:**
- Reload VSCode (Ctrl+Shift+P → "Reload Window")
- Your new version is active!

---

## 📋 Step-by-Step Breakdown

### Phase 1: Version Increment
```bash
npm run version:increment
```
- Increments `package.json` version: `0.0.162` → `0.0.163`
- Increments `Cargo.toml` version: `0.1.10` → `0.1.11`

### Phase 2: Build LSP Server
```bash
npm run build:lsp
```
- Builds Rust LSP server in release mode
- Copies `log-scout-lsp-server.exe` to `vscode-extension/bin/`

### Phase 3: Build Extension
```bash
npm run build
```
- Runs `update-versions.js` (syncs versions to activity bar)
- Runs `generate-build-info.js` (creates build info)
- Compiles TypeScript (`tsc -p ./`)

### Phase 4: Package
```bash
npm run package
```
- Runs all build steps
- Creates `.vsix` file using `vsce`
- Runs `copy-vsix.js` to copy to Downloads

### Phase 5: Install
```bash
code --install-extension log-scout-analyzer.vsix
```
- Installs extension into VSCode

---

## 🛠️ Manual Build Steps

If you want to build without auto-incrementing versions:

```bash
# 1. Build LSP server only
npm run build:lsp

# 2. Build extension only (no version increment)
npm run update:versions
node generate-build-info.js
npm run compile

# 3. Package without version increment
vsce package --allow-star-activation --out log-scout-analyzer.vsix

# 4. Install manually
code --install-extension log-scout-analyzer.vsix
```

---

## 🔍 Troubleshooting

### Script Not Found Errors
**Problem:** `Error: Cannot find module 'increment-version.js'`

**Solution:** Make sure you're in the `vscode-extension` directory:
```bash
cd vscode-extension
node increment-version.js
```

### Cargo.toml Not Found
**Problem:** `Cargo.toml not found, skipping LSP server version increment`

**Solution:** The `lsp-server` folder should be at the same level as `vscode-extension`:
```
log_scout_analyzer/
├── lsp-server/
│   └── Cargo.toml
└── vscode-extension/
    ├── package.json
    └── increment-version.js
```

### Git Commit Hash "unknown"
**Problem:** Build info shows `gitCommit: "unknown"`

**Solution:** This is normal if:
- Not in a git repository
- Git is not installed
- Running in a CI environment without git access

It's informational only and doesn't affect functionality.

### VSIX Installation Fails
**Problem:** `code --install-extension` fails

**Solution:**
1. Make sure VSCode is installed and `code` is in PATH
2. Try absolute path: `code --install-extension "C:\full\path\to\log-scout-analyzer.vsix"`
3. Manually install: VSCode → Extensions → "..." → "Install from VSIX"

---

## 🎨 Customization

### Change Version Increment Behavior

To increment minor version instead of patch, edit `increment-version.js`:

```javascript
// Current: increments patch (0.0.162 → 0.0.163)
const newPatch = patch + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

// To increment minor (0.0.162 → 0.1.0):
const newMinor = minor + 1;
const newVersion = `${major}.${newMinor}.0`;
```

### Add Custom Build Metadata

Edit `generate-build-info.js` to add more fields:

```javascript
export const BUILD_INFO = {
    version: "${version}",
    buildTimestamp: "${buildTimestamp}",
    buildNumber: ${buildNumber},
    gitCommit: "${gitCommit}",
    buildMachine: "${os.hostname()}", // Add this
    nodeVersion: "${process.version}", // Add this
} as const;
```

---

## 📊 Version Management Strategy

### Current Strategy: Patch Increment
- Extension: `0.0.X` (patch increments each build)
- LSP Server: `0.1.X` (patch increments with extension)

### Recommended Version Scheme
- **Patch (0.0.X):** Bug fixes, minor tweaks
- **Minor (0.X.0):** New features, non-breaking changes
- **Major (X.0.0):** Breaking changes, major rewrites

### When to Manually Change Versions
- **Major release:** Edit both `package.json` and `Cargo.toml` manually
- **Minor release:** Edit both files, reset patch to 0
- **After manual edit:** Run `npm run update:versions` to sync

---

## 🚦 Best Practices

1. **Always use `npm run deploy`** for releases
2. **Test before deploying:** Run `npm run check` to verify code
3. **Commit before building:** Ensures git hash is accurate
4. **Reload VSCode after install:** New version won't activate until reload
5. **Keep versions in sync:** Let scripts handle versioning

---

## 📝 Summary Table

| File | Purpose | Auto-Updated? |
|------|---------|---------------|
| `package.json` | Extension version | ✅ Yes (by scripts) |
| `Cargo.toml` | LSP server version | ✅ Yes (by scripts) |
| `src/buildInfo.ts` | Build metadata | ✅ Yes (generated) |
| `.vsix` file | Packaged extension | ✅ Yes (created by vsce) |

---

## 🎯 Quick Commands

```bash
# Full deployment (most common)
npm run deploy

# Check code without building
npm run check

# Build everything without version increment
npm run build:all

# Increment version only (no build)
npm run version:increment

# Generate build info only
node generate-build-info.js
```

---

## 📚 Related Documentation

- [VSCode Extension API](https://code.visualstudio.com/api)
- [vsce (VSCode Extension Manager)](https://github.com/microsoft/vscode-vsce)
- [Cargo Book](https://doc.rust-lang.org/cargo/)

---

**Last Updated:** 2026-02-19  
**Maintained By:** Log Scout Team