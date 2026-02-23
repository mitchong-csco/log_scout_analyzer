# 🚀 Quick Start: Building & Deploying Log Scout Analyzer

> **TL;DR:** Just run `npm run deploy` and reload VSCode!

---

## ⚡ One-Command Deployment

```bash
npm run deploy
```

**What it does:**
1. ✅ Increments both extension and LSP server versions
2. ✅ Builds the Rust LSP server
3. ✅ Compiles TypeScript
4. ✅ Packages everything into `.vsix`
5. ✅ Installs into VSCode
6. ✅ Copies `.vsix` to Downloads folder

**After deployment:**
- Press `Ctrl+Shift+P` → Type "Reload Window" → Press Enter
- Your new version is active!

---

## 🎯 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run status` | Show current versions & build info |
| `npm run deploy` | **Full deployment** (recommended) |
| `npm run version:increment` | Bump versions only (no build) |
| `npm run build:all` | Build LSP + extension (no version bump) |
| `npm run package` | Create `.vsix` file |
| `npm run test:scripts` | Verify all scripts work correctly |

---

## 📋 Step-by-Step Workflow

### First Time Setup

```bash
cd vscode-extension
npm install
```

### Development Cycle

1. **Check current status:**
   ```bash
   npm run status
   ```

2. **Make your code changes** in `src/`

3. **Deploy:**
   ```bash
   npm run deploy
   ```

4. **Reload VSCode:**
   - Press `Ctrl+Shift+P`
   - Type "Reload Window"
   - Press Enter

5. **Test your changes!**

---

## 🔧 Build Without Version Increment

If you want to rebuild without changing version numbers:

```bash
# Build LSP server
npm run build:lsp

# Build extension only
npm run update:versions
node generate-build-info.js
npm run compile

# Create VSIX
vsce package --allow-star-activation --out log-scout-analyzer.vsix

# Install
code --install-extension log-scout-analyzer.vsix
```

---

## 📊 Version Management

### Current Version Scheme

- **Extension:** `0.0.X` (patch version)
- **LSP Server:** `0.1.X` (patch version)

### Auto-Increment

`npm run version:increment` automatically bumps the **patch** version:
- `0.0.162` → `0.0.163`
- `0.1.10` → `0.1.11`

### Manual Version Change

For major or minor version changes:

1. **Edit `package.json`:**
   ```json
   "version": "1.0.0"
   ```

2. **Edit `lsp-server/Cargo.toml`:**
   ```toml
   version = "1.0.0"
   ```

3. **Sync versions:**
   ```bash
   npm run update:versions
   ```

---

## 🐛 Troubleshooting

### "Cargo.toml not found"

**Problem:** Script can't find the LSP server.

**Solution:** Make sure directory structure is:
```
log_scout_analyzer/
├── lsp-server/
│   └── Cargo.toml
└── vscode-extension/
    ├── package.json
    └── (scripts here)
```

### "VSIX installation failed"

**Problem:** VSCode CLI not in PATH or VSCode not running.

**Solution:** Manually install:
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Click "..." → "Install from VSIX"
4. Select `log-scout-analyzer.vsix`

### "TypeScript errors"

**Problem:** Compilation errors.

**Solution:** Fix errors or run with warnings:
```bash
npm run compile
```

The build is configured to continue despite TypeScript warnings.

### "Rust build fails"

**Problem:** Cargo build error.

**Solution:**
```bash
cd ../lsp-server
cargo check
cargo build --release
```

Fix any Rust compilation errors before deploying.

---

## 📁 Build Artifacts

After a successful build, you'll have:

| File/Folder | Purpose |
|-------------|---------|
| `out/` | Compiled JavaScript from TypeScript |
| `bin/log-scout-lsp-server-win.exe` | LSP server binary |
| `log-scout-analyzer.vsix` | Packaged extension |
| `src/buildInfo.ts` | Auto-generated build metadata |
| `~\Downloads\vscode-extensions\` | Copy of `.vsix` |

---

## 🎨 Activity Bar Display

After deployment, VSCode activity bar shows:

```
Scout Analyzer (v0.0.163 | LSP v0.1.11)
Scout Toolkit (v0.0.163 | LSP v0.1.11)
```

This is automatically updated by the build scripts!

---

## 🔍 Verify Everything Works

Run the test script:

```bash
npm run test:scripts
```

**Expected output:** All checks pass (✅)

---

## 💡 Pro Tips

1. **Always check status first:**
   ```bash
   npm run status
   ```

2. **Test locally before sharing:**
   - Deploy to your local VSCode
   - Test all features
   - Only then share the `.vsix` file

3. **Keep versions in sync:**
   - Never manually edit versions in both files
   - Let the scripts handle it

4. **Commit before building:**
   - Git hash is included in build info
   - Helps track which code is in which build

5. **Use the batch file on Windows:**
   ```cmd
   DEPLOY.bat
   ```
   Visual feedback for each step!

---

## 📚 More Information

- **Full documentation:** `SCRIPTS_README.md`
- **Package scripts:** Check `package.json` → `scripts` section
- **Script files:** 
  - `increment-version.js` - Version management
  - `update-versions.js` - Version sync
  - `generate-build-info.js` - Build metadata
  - `copy-vsix.js` - Copy to Downloads
  - `show-status.js` - Display status
  - `test-scripts.js` - Verify scripts

---

## 🚦 Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  LOG SCOUT ANALYZER - QUICK REFERENCE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Check Status:       npm run status                  │
│  🚀 Deploy:             npm run deploy                  │
│  🔢 Increment Only:     npm run version:increment       │
│  🔨 Build Only:         npm run build:all               │
│  📦 Package Only:       npm run package                 │
│  🧪 Test Scripts:       npm run test:scripts            │
│                                                          │
│  💻 Windows Shortcut:   DEPLOY.bat                      │
│                                                          │
│  After Deploy:          Ctrl+Shift+P → Reload Window    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated:** 2026-02-19  
**Maintained By:** Log Scout Team