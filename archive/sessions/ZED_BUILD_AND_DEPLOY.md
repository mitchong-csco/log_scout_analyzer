# Zed Extension - Build and Deploy Guide

> **Quick start guide for building and deploying the Log Scout Analyzer Zed extension**

---

## 🚀 Quick Start (TL;DR)

```bash
cd zed-extension
npm run deploy
```

Then restart Zed. Done! 🎉

---

## 📋 Prerequisites

Before you start, ensure you have:

- ✅ **Node.js** (v16 or later) - [Download](https://nodejs.org)
- ✅ **Rust/Cargo** - [Install](https://rustup.rs)
- ✅ **wasm32-wasip1 target** - `rustup target add wasm32-wasip1`
- ✅ **Zed Editor** - [Download](https://zed.dev)

### Quick Check

```bash
node --version     # Should show v16.x.x or later
cargo --version    # Should show cargo 1.x.x
rustup target list --installed | grep wasm32-wasip1  # Should show wasm32-wasip1
```

---

## 📂 Location

The Zed extension automation is in the `zed-extension/` directory:

```
log_scout_analyzer/
├── zed-extension/          ← Zed extension build automation
│   ├── package.json        ← npm scripts
│   ├── *.js                ← Automation scripts
│   ├── DEPLOY.bat          ← Windows deployment
│   └── [documentation]     ← Comprehensive guides
│
├── lsp-server/             ← Shared LSP server (Rust)
└── vscode-extension/       ← VSCode extension (separate)
```

---

## 🎯 Common Tasks

### Deploy Everything

```bash
cd zed-extension
npm run deploy
```

**What it does:**
1. Increments version numbers (+0.0.1)
2. Builds WASM extension (`wasm32-wasip1`)
3. Builds LSP server (native binary)
4. Creates distribution packages (.tar.gz, .zip)
5. Installs to Zed editor

**Time:** ~2-3 minutes

**After:** Restart Zed (quit and relaunch)

---

### Check Status

```bash
cd zed-extension
npm run status
```

**Shows:**
- Current versions (extension, LSP server)
- Build artifacts status
- Installation status
- Git status
- Quick commands

---

### Get Help

```bash
cd zed-extension
npm run help
```

**Displays:**
- All available commands
- Usage examples
- Quick workflows
- Documentation links

---

### Preview Deployment

```bash
cd zed-extension
npm run dry-run
```

**Shows what will happen WITHOUT making changes:**
- Version increments
- Build steps
- File operations
- Installation paths

---

### Clean & Rebuild

```bash
cd zed-extension
npm run clean
npm run deploy
```

**Use when:**
- Build is stuck
- Need fresh rebuild
- Troubleshooting issues

---

## 📦 Creating Distribution Packages

```bash
cd zed-extension
npm run package
```

**Creates:**
- `dist/log-scout-analyzer-zed-X.X.X.tar.gz` (Unix)
- `dist/log-scout-analyzer-zed-X.X.X.zip` (Windows)
- `dist/INSTALLATION.txt` (Quick guide)

**Also copies to:** `~/Downloads/zed-extensions/`

---

## 🎯 Zed Installation Paths

The extension is installed to:

| OS | Path |
|----|------|
| **Windows** | `%USERPROFILE%\.config\zed\extensions\log-scout-analyzer` |
| **macOS** | `~/Library/Application Support/Zed/extensions/log-scout-analyzer` |
| **Linux** | `~/.config/zed/extensions/log-scout-analyzer` |

---

## 🔧 Available Commands

### Deployment

| Command | Description | Time |
|---------|-------------|------|
| `npm run deploy` | Full deployment (recommended) | 2-3 min |
| `npm run package` | Create distribution packages | 2-3 min |
| `npm run install:zed` | Install to Zed only | < 5 sec |

### Build

| Command | Description | Time |
|---------|-------------|------|
| `npm run build:all` | Build WASM + LSP server | 2-3 min |
| `npm run build` | Build WASM extension only | 1-2 min |
| `npm run build:lsp` | Build LSP server only | 30-60 sec |

### Utilities

| Command | Description | Time |
|---------|-------------|------|
| `npm run status` | Show current status | < 1 sec |
| `npm run help` | Show all commands | < 1 sec |
| `npm run dry-run` | Preview deployment | < 1 sec |
| `npm run clean` | Remove build artifacts | < 5 sec |
| `npm run test:scripts` | Test automation system | < 1 sec |

---

## 💻 Windows Users

Double-click `DEPLOY.bat` for a visual, step-by-step deployment:

```
zed-extension/
└── DEPLOY.bat    ← Double-click this
```

**Features:**
- Color-coded output
- Step-by-step progress
- Error handling
- Automatic Explorer opening

---

## 🔍 Troubleshooting

### "cargo: command not found"

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
cargo --version
```

### "WASM target not found"

```bash
rustup target add wasm32-wasip1
```

### "Extension not loading in Zed"

```bash
# 1. Check status
npm run status

# 2. Clean & rebuild
npm run clean
npm run deploy

# 3. Restart Zed completely (quit and relaunch)

# 4. Check Zed console (Ctrl+Shift+I)
```

### "Version mismatch"

```bash
npm run update:versions
npm run status
```

---

## 📚 Documentation

The `zed-extension/` directory contains comprehensive documentation:

| Document | Purpose |
|----------|---------|
| **QUICK_START_BUILD.md** | Quick reference guide |
| **SCRIPTS_README.md** | Technical documentation |
| **BUILD_AUTOMATION_COMPLETE.md** | Feature summary |
| **DEPLOYMENT_WORKFLOW.md** | Visual workflow diagrams |
| **BUILD_AUTOMATION_INDEX.md** | Master index & navigation |

---

## 🎯 Quick Workflows

### Standard Deployment

```bash
cd zed-extension
npm run status          # Check current state
npm run deploy          # Deploy everything
# Restart Zed
```

### Safe Deployment (with preview)

```bash
cd zed-extension
npm run status          # Check current state
npm run dry-run         # Preview changes
npm run deploy          # Deploy everything
# Restart Zed
```

### Clean Rebuild

```bash
cd zed-extension
npm run clean           # Remove artifacts
npm run deploy          # Fresh build
# Restart Zed
```

### Distribution Package

```bash
cd zed-extension
npm run status          # Check state
npm run package         # Create packages
# Find in dist/ and ~/Downloads/zed-extensions/
```

---

## 🆚 VSCode vs Zed Extensions

Both extensions share the same LSP server but have different build systems:

| Aspect | VSCode | Zed |
|--------|--------|-----|
| **Location** | `vscode-extension/` | `zed-extension/` |
| **Format** | TypeScript → JavaScript | Rust → WASM |
| **Package** | `.vsix` | `.tar.gz` + `.zip` |
| **Installation** | `code --install-extension` | Copy to extensions dir |
| **LSP Server** | Shared (`lsp-server/`) | Shared (`lsp-server/`) |

**Both have:**
- One-command deployment (`npm run deploy`)
- Comprehensive automation
- Full documentation
- Status monitoring
- Windows batch files

---

## 💡 Pro Tips

1. **Always check status first:**
   ```bash
   npm run status
   ```

2. **Use dry-run to preview:**
   ```bash
   npm run dry-run
   ```

3. **Test the system periodically:**
   ```bash
   npm run test:scripts
   ```

4. **Clean rebuild if issues:**
   ```bash
   npm run clean && npm run deploy
   ```

5. **Use help for command reference:**
   ```bash
   npm run help
   ```

---

## 🎓 First-Time Setup

```bash
# 1. Navigate to zed-extension directory
cd log_scout_analyzer/zed-extension

# 2. Install npm dependencies (if needed)
npm install

# 3. Install WASM target
rustup target add wasm32-wasip1

# 4. Test the system
npm run test:scripts

# 5. Check status
npm run status

# 6. Deploy
npm run deploy

# 7. Restart Zed
```

---

## ✅ System Features

The Zed extension build system provides:

- ✅ **One-command deployment** - `npm run deploy`
- ✅ **Automatic version management** - Synced across all files
- ✅ **Build orchestration** - WASM + LSP server
- ✅ **Package creation** - .tar.gz and .zip
- ✅ **Installation automation** - OS-specific paths
- ✅ **Status monitoring** - Comprehensive reporting
- ✅ **Help system** - Interactive command guide
- ✅ **Dry-run preview** - See changes before applying
- ✅ **Cleanup utilities** - Safe artifact removal
- ✅ **Testing framework** - Verify system health
- ✅ **Windows batch file** - Visual deployment
- ✅ **Complete documentation** - 5 comprehensive guides

---

## 🆘 Need Help?

### Quick Help

```bash
cd zed-extension
npm run help
```

### Check Status

```bash
cd zed-extension
npm run status
```

### Test System

```bash
cd zed-extension
npm run test:scripts
```

### Read Documentation

- **Quick Start:** `zed-extension/QUICK_START_BUILD.md`
- **Technical:** `zed-extension/SCRIPTS_README.md`
- **Features:** `zed-extension/BUILD_AUTOMATION_COMPLETE.md`
- **Workflows:** `zed-extension/DEPLOYMENT_WORKFLOW.md`
- **Index:** `zed-extension/BUILD_AUTOMATION_INDEX.md`

---

## 📊 Build Automation Status

**Status:** ✅ **COMPLETE AND PRODUCTION READY**

**Components:**
- 11 core scripts (~2,670 lines)
- 1 Windows batch file
- 5 documentation files (~2,000+ lines)
- 20+ npm commands
- Comprehensive testing

**Total:** ~4,670+ lines of automation code and documentation

---

## 🔗 Related Documentation

- **VSCode Extension:** See `vscode-extension/BUILD_AND_DEPLOY.md`
- **LSP Server:** Shared between both extensions
- **Project Root:** This file (you're here!)

---

**Ready to deploy?** Run:

```bash
cd zed-extension
npm run deploy
```

**Happy building!** 🚀