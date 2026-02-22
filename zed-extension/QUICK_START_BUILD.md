# Quick Start Build Guide - Zed Extension

> **Quick reference for building and deploying the Log Scout Analyzer Zed extension**

## ⚡ TL;DR - Deploy Everything Now

```bash
npm run deploy
```

Then restart Zed. Done! 🚀

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

## 🚀 Common Commands

### Deployment Commands

| Command | Description | Time |
|---------|-------------|------|
| `npm run deploy` | 🚀 Full deployment (recommended) | 2-3 min |
| `npm run package` | 📦 Create distribution packages | 2-3 min |
| `npm run install:zed` | 🎯 Install to Zed only | < 5 sec |

### Build Commands

| Command | Description | Time |
|---------|-------------|------|
| `npm run build:all` | 🔨 Build WASM + LSP (no version increment) | 2-3 min |
| `npm run build` | 📝 Build WASM extension only | 1-2 min |
| `npm run build:lsp` | 🦀 Build LSP server only | 30-60 sec |

### Utility Commands

| Command | Description | Time |
|---------|-------------|------|
| `npm run status` | 📊 Show current versions and status | < 1 sec |
| `npm run help` | 🆘 Display all available commands | < 1 sec |
| `npm run dry-run` | 🔍 Preview deployment (no changes) | < 1 sec |
| `npm run clean` | 🧹 Remove all build artifacts | < 5 sec |

---

## 📖 Quick Workflows

### 1️⃣ Standard Deployment

```bash
# Check what will happen
npm run status

# Deploy everything
npm run deploy

# Restart Zed
# (Ctrl+Shift+P → "Reload Extensions")
```

### 2️⃣ Safe Deployment (Preview First)

```bash
# Check current state
npm run status

# Preview what will happen
npm run dry-run

# Deploy
npm run deploy

# Restart Zed
```

### 3️⃣ Clean Rebuild

```bash
# Remove all artifacts
npm run clean

# Fresh build and deploy
npm run deploy

# Restart Zed
```

### 4️⃣ Build Without Installing

```bash
# Just build, don't install
npm run build:all

# Or create distribution packages
npm run package
# (Creates .tar.gz and .zip in dist/ folder)
```

---

## 🎯 What Each Command Does

### `npm run deploy`

**Full automated deployment:**
1. Increments version numbers (+0.0.1)
2. Updates version in all config files
3. Generates build info (timestamp, git commit)
4. Builds WASM extension (`wasm32-wasip1`)
5. Builds LSP server (native Windows binary)
6. Creates distribution packages (.tar.gz, .zip)
7. Copies packages to Downloads folder
8. Installs extension to Zed

**After running:** Restart Zed to load the new extension.

### `npm run package`

**Creates distribution packages:**
1. Increments version numbers
2. Builds everything
3. Creates dist/ folder with:
   - `log-scout-analyzer-zed-X.X.X.tar.gz`
   - `log-scout-analyzer-zed-X.X.X.zip`
   - `INSTALLATION.txt` (instructions)
4. Copies to Downloads folder

**Use case:** When you want to share the extension with others.

### `npm run status`

**Shows comprehensive status:**
- Current versions (extension, LSP server)
- Last build timestamp
- Git information
- Build artifacts status
- Zed installation status
- Quick command reference

**Use case:** Run before deploying to see current state.

---

## 📂 Directory Structure

```
zed-extension/
├── src/                       # Rust source code
│   ├── lib.rs                # Main extension code
│   └── build_info.rs         # Auto-generated build info
├── grammars/                  # Syntax highlighting definitions
├── target/
│   └── wasm32-wasip1/
│       └── release/
│           └── log_scout_analyzer.wasm  # Built extension
├── dist/                      # Distribution packages (created by package)
│   ├── log-scout-analyzer-zed-X.X.X/
│   ├── log-scout-analyzer-zed-X.X.X.tar.gz
│   └── log-scout-analyzer-zed-X.X.X.zip
├── Cargo.toml                 # Rust package manifest
├── extension.toml             # Zed extension manifest
├── package.json               # npm scripts
├── *.js                       # Build automation scripts
└── DEPLOY.bat                 # Windows deployment script
```

---

## 🔧 Build Artifacts

### Created by Build

| File/Directory | Description | Size |
|----------------|-------------|------|
| `target/wasm32-wasip1/release/log_scout_analyzer.wasm` | Extension binary | 1-3 MB |
| `src/build_info.rs` | Build metadata | < 1 KB |
| `../lsp-server/target/release/log-scout-lsp-server.exe` | LSP server | 8-12 MB |

### Created by Package

| File/Directory | Description | Size |
|----------------|-------------|------|
| `dist/log-scout-analyzer-zed-X.X.X/` | Package folder | - |
| `dist/log-scout-analyzer-zed-X.X.X.tar.gz` | Distribution archive | 1-3 MB |
| `dist/log-scout-analyzer-zed-X.X.X.zip` | Distribution archive | 1-3 MB |
| `dist/INSTALLATION.txt` | Installation guide | < 1 KB |

---

## 🎯 Zed Installation Paths

The extension is installed to:

| OS | Path |
|----|------|
| **Windows** | `%USERPROFILE%\.config\zed\extensions\log-scout-analyzer` |
| **macOS** | `~/Library/Application Support/Zed/extensions/log-scout-analyzer` |
| **Linux** | `~/.config/zed/extensions/log-scout-analyzer` |

### Installed Files

```
log-scout-analyzer/
├── log_scout_analyzer.wasm    # Extension binary
├── extension.toml             # Extension manifest
├── grammars/                  # Syntax highlighting
├── README.md                  # Documentation
└── LICENSE                    # MIT License
```

---

## ⚠️ Troubleshooting

### "WASM binary not found"

**Solution:**
```bash
# Install WASM target
rustup target add wasm32-wasip1

# Build extension
npm run build
```

### "cargo: command not found"

**Solution:**
1. Install Rust from https://rustup.rs
2. Restart your terminal
3. Verify: `cargo --version`

### "Extension not showing in Zed"

**Solution:**
1. Run `npm run status` to verify installation
2. Restart Zed completely (quit and relaunch)
3. Check Zed's Console (Ctrl+Shift+I) for errors
4. Verify files exist in Zed's extensions directory

### Build takes very long

**First build:**
- Downloads and compiles dependencies (2-3 minutes is normal)

**Subsequent builds:**
- Should be faster (30-60 seconds) due to caching

**Speed up:**
```bash
# Clean and rebuild if stuck
npm run clean
npm run build:all
```

### Version mismatch warnings

**Solution:**
```bash
# Sync all versions
npm run update:versions
```

---

## 💡 Pro Tips

1. **Always check status first:**
   ```bash
   npm run status
   ```

2. **Use dry-run to preview changes:**
   ```bash
   npm run dry-run
   ```

3. **Commit changes before building:**
   - Git commit hash is embedded in build info
   - Makes troubleshooting easier

4. **Test scripts periodically:**
   ```bash
   npm run test:scripts
   ```

5. **Use clean rebuild if issues occur:**
   ```bash
   npm run clean
   npm run deploy
   ```

6. **Distribution packages:**
   - Created in `dist/` folder
   - Also copied to Downloads for easy sharing
   - Include full installation instructions

---

## 🚀 Next Steps

- **For deployment:** See [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)
- **For detailed documentation:** See [SCRIPTS_README.md](SCRIPTS_README.md)
- **For all commands:** Run `npm run help`
- **For complete reference:** See [BUILD_AUTOMATION_INDEX.md](BUILD_AUTOMATION_INDEX.md)

---

## 🆘 Need Help?

```bash
# Show all available commands
npm run help

# Check current status
npm run status

# Test that everything works
npm run test:scripts
```

**Still stuck?** Check the detailed documentation:
- [SCRIPTS_README.md](SCRIPTS_README.md) - Technical details
- [BUILD_AUTOMATION_INDEX.md](BUILD_AUTOMATION_INDEX.md) - Master index
- [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md) - Visual workflows

---

**Happy building!** 🎉