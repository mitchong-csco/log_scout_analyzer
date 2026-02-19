# Build and Install Guide

Complete guide for building and installing Log Scout Analyzer extensions for both VS Code and Zed.

---

## 🚀 Quick Start

### Build Everything (Recommended)

```bash
build-all.bat
```

This single command will:
1. ✅ Build shared-core module
2. ✅ Build VS Code extension
3. ✅ Package VS Code extension as .vsix
4. ✅ Install VS Code extension
5. ✅ Build Zed extension (if configured)
6. ✅ Install Zed extension (if configured)

**Then just restart your editor!**

---

## 📋 Prerequisites

### For VS Code Extension

- **Node.js** (v16 or later)
- **npm** (comes with Node.js)
- **VS Code** installed with `code` command in PATH

### For Zed Extension

- **Rust** installed via [rustup](https://rustup.rs/)
  - ⚠️ **MUST** be installed via rustup (not homebrew or other methods)
- **Cargo** (comes with Rust)
- **Zed** installed

---

## 🏗️ Build Options

### Option 1: Build and Install Everything

```bash
# From project root
build-all.bat
```

**What it does:**
- Builds shared-core
- Builds and installs VS Code extension
- Builds and installs Zed extension (if available)
- Shows next steps

### Option 2: VS Code Only

```bash
# Just install VS Code extension (already built)
install-extension.bat
```

Or manually:
```bash
cd vscode-extension
npm install
npm run compile
npm run package
code --install-extension log-scout-analyzer-*.vsix --force
```

### Option 3: Zed Only

```bash
# Build and install Zed extension
install-zed-extension.bat
```

Or manually:
```bash
cd zed-extension
cargo build --release
# Copy to %LOCALAPPDATA%\Zed\extensions\installed\log-scout-analyzer
```

### Option 4: Development Mode

**For VS Code:**
```bash
cd shared-core
npm run watch       # Terminal 1

cd vscode-extension
npm run watch       # Terminal 2

# Then press F5 in VS Code to debug
```

**For Zed:**
```bash
cd zed-extension
cargo watch -x "build --release"

# Start Zed with: zed --foreground
```

---

## 📁 File Structure

```
log_scout_analyzer/
├── shared-core/                    # Shared business logic
│   ├── src/
│   ├── dist/                       # Built files (after build)
│   └── package.json
│
├── vscode-extension/
│   ├── src/
│   ├── out/                        # Compiled JS (after build)
│   ├── *.vsix                      # Packaged extension (after build)
│   └── package.json
│
├── zed-extension/
│   ├── src/
│   ├── target/                     # Rust build output (after build)
│   ├── extension.toml
│   └── Cargo.toml
│
├── build-all.bat                   # Build everything
├── install-extension.bat           # Install VS Code only
└── install-zed-extension.bat       # Install Zed only
```

---

## 🔨 Build Scripts Explained

### `build-all.bat`

**Complete build and install pipeline:**

```
[1/4] Build shared-core
       ├─> npm install (if needed)
       └─> npm run build

[2/4] Build VS Code extension
       ├─> npm install (if needed)
       └─> npm run compile

[3/4] Package VS Code extension
       ├─> npm run package
       └─> Creates .vsix file

[4/4] Install VS Code extension
       └─> code --install-extension *.vsix --force

[Optional] Build and Install Zed extension
       ├─> cargo build --release
       └─> Copy to Zed extensions directory
```

### `install-extension.bat`

**Quick VS Code install (when already built):**
- Finds latest .vsix file
- Installs to VS Code
- Shows usage instructions

### `install-zed-extension.bat`

**Build and install Zed extension:**
- Checks for Rust/Cargo
- Builds shared-core if needed
- Compiles Rust to WebAssembly
- Installs as dev extension in Zed

---

## 📍 Installation Locations

### VS Code

**Extension installed to:**
- Windows: `%USERPROFILE%\.vscode\extensions\log-scout-team.log-scout-analyzer-*`
- macOS: `~/.vscode/extensions/log-scout-team.log-scout-analyzer-*`
- Linux: `~/.vscode/extensions/log-scout-team.log-scout-analyzer-*`

### Zed

**Dev extension installed to:**
- Windows: `%LOCALAPPDATA%\Zed\extensions\installed\log-scout-analyzer`
- macOS: `~/Library/Application Support/Zed/extensions/installed/log-scout-analyzer`
- Linux: `~/.local/share/zed/extensions/installed/log-scout-analyzer`

### Shared Storage

**Cases stored in:**
- Workspace: `<workspace>/.log-scout-cases/`
- Global: `~/.log-scout-cases/`

Both editors can access the same cases! 🎉

---

## ✅ Verification

### Verify VS Code Installation

```bash
# List installed extensions
code --list-extensions | findstr log-scout

# Should show: log-scout-team.log-scout-analyzer
```

**In VS Code:**
1. Press `Ctrl+Shift+X` (Extensions)
2. Search for "Log Scout"
3. Should show as installed

### Verify Zed Installation

**In Zed:**
1. Press `Ctrl+Shift+X` (Extensions)
2. Look for "log-scout-analyzer" with "Dev" badge
3. Should show as installed

### Test Functionality

**VS Code:**
1. Open a `.log` file
2. Look for 🔍 icon in Activity Bar
3. Press `Ctrl+Shift+P` and type "Scout"
4. Try: "Scout: Analyze Current File"

**Zed:**
1. Open a `.log` file
2. Check for log analysis features
3. Open command palette and search "Scout"

---

## 🔧 Troubleshooting

### VS Code Issues

**"Cannot find module '@log-scout/shared-core'"**
```bash
cd shared-core
npm run build

cd ../vscode-extension
rm -rf node_modules
npm install
```

**"Extension not showing up"**
1. Restart VS Code completely
2. Check: `code --list-extensions`
3. Reinstall: `install-extension.bat`

**"VSIX file not found"**
```bash
cd vscode-extension
npm run package
```

### Zed Issues

**"Cargo not found"**
- Install Rust via rustup: https://rustup.rs/
- Restart terminal
- Verify: `cargo --version`

**"Extension not showing up"**
1. Restart Zed completely
2. Check: `%LOCALAPPDATA%\Zed\extensions\installed\`
3. Reinstall: `install-zed-extension.bat`

**"Build failed"**
```bash
cd zed-extension
cargo check          # Check for errors
cargo clean          # Clean build
cargo build --release
```

### Shared Core Issues

**"Build failed"**
```bash
cd shared-core
rm -rf node_modules dist
npm install
npm run build
```

**"Types not found"**
- Shared core must be built first
- Run: `cd shared-core && npm run build`

---

## 🔄 Updating

### Update VS Code Extension

```bash
# Make your changes in vscode-extension/src/
cd vscode-extension
npm run compile
npm run package
code --install-extension log-scout-analyzer-*.vsix --force
# Restart VS Code
```

### Update Zed Extension

```bash
# Make your changes in zed-extension/src/
cd zed-extension
cargo build --release
# Copy to Zed extensions directory
install-zed-extension.bat
# Restart Zed
```

### Update Shared Core

```bash
# Make changes in shared-core/src/
cd shared-core
npm run build

# Then rebuild both extensions
cd ..
build-all.bat
```

---

## 🗑️ Uninstalling

### Uninstall VS Code Extension

```bash
code --uninstall-extension log-scout-team.log-scout-analyzer
```

Or via VS Code UI:
1. Press `Ctrl+Shift+X`
2. Find "Log Scout Analyzer"
3. Click "Uninstall"

### Uninstall Zed Extension

**Windows:**
```bash
rmdir /s /q "%LOCALAPPDATA%\Zed\extensions\installed\log-scout-analyzer"
```

**macOS/Linux:**
```bash
rm -rf ~/Library/Application\ Support/Zed/extensions/installed/log-scout-analyzer
# or
rm -rf ~/.local/share/zed/extensions/installed/log-scout-analyzer
```

Then restart Zed.

### Clean Up Build Artifacts

```bash
# Clean everything
cd shared-core
rm -rf node_modules dist

cd ../vscode-extension
rm -rf node_modules out *.vsix

cd ../zed-extension
cargo clean

# Or just delete these folders manually
```

---

## 📊 Build Comparison

| Feature | build-all.bat | install-extension.bat | install-zed-extension.bat |
|---------|---------------|----------------------|---------------------------|
| Builds shared-core | ✅ Yes | ❌ No | ✅ Yes (if needed) |
| Builds VS Code | ✅ Yes | ❌ No (must be built) | ❌ No |
| Packages VS Code | ✅ Yes | ❌ No (uses existing) | ❌ No |
| Installs VS Code | ✅ Yes | ✅ Yes | ❌ No |
| Builds Zed | ✅ Yes (optional) | ❌ No | ✅ Yes |
| Installs Zed | ✅ Yes (optional) | ❌ No | ✅ Yes |
| Use case | First time / Full rebuild | Quick VS Code reinstall | Zed development |

---

## 🎯 Recommended Workflows

### First Time Setup

```bash
build-all.bat
# Restart both VS Code and Zed
```

### Daily Development (VS Code)

```bash
cd shared-core
npm run watch         # Terminal 1

cd vscode-extension
npm run watch         # Terminal 2

# Press F5 in VS Code for debugging
```

### Daily Development (Zed)

```bash
cd zed-extension
cargo watch -x "build --release"

# Start Zed with: zed --foreground
# See debug output in terminal
```

### Quick Reinstall

**VS Code:**
```bash
install-extension.bat
```

**Zed:**
```bash
install-zed-extension.bat
```

### Full Rebuild

```bash
# Clean everything
cd shared-core && rm -rf node_modules dist
cd ../vscode-extension && rm -rf node_modules out
cd ../zed-extension && cargo clean
cd ..

# Rebuild
build-all.bat
```

---

## 🚦 CI/CD Considerations

### GitHub Actions Example

```yaml
name: Build and Test

on: [push, pull_request]

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Build shared-core
        run: |
          cd shared-core
          npm install
          npm run build
      
      - name: Build VS Code extension
        run: |
          cd vscode-extension
          npm install
          npm run compile
          npm run package
      
      - name: Upload VSIX
        uses: actions/upload-artifact@v3
        with:
          name: vscode-extension
          path: vscode-extension/*.vsix
```

---

## 📚 Related Documentation

- [Shared Core Setup](SHARED_CORE_SETUP.md) - Detailed shared-core integration
- [Case Management Guide](vscode-extension/CASE_MANAGEMENT_GUIDE.md) - User guide
- [Integration Guide](vscode-extension/CASE_MANAGEMENT_INTEGRATION.md) - Developer guide
- [API Reference](shared-core/README.md) - Shared core API

---

## 💡 Tips

1. **Use watch mode during development** - Auto-rebuild on changes
2. **Test in both editors** - Ensure cross-platform compatibility
3. **Clean build if issues** - Remove node_modules and dist folders
4. **Check logs** - VS Code: Output panel, Zed: `zed --foreground`
5. **Version sync** - Keep shared-core version in sync across extensions

---

## ❓ FAQ

**Q: Do I need to build shared-core separately?**
A: No, `build-all.bat` handles it automatically.

**Q: Can I use the same cases in both editors?**
A: Yes! Both extensions can access `.log-scout-cases/` in your workspace.

**Q: How do I debug the extensions?**
A: VS Code: Press F5. Zed: Run `zed --foreground` and check terminal output.

**Q: What if I only want VS Code?**
A: Use `install-extension.bat` after building once.

**Q: What if I only want Zed?**
A: Use `install-zed-extension.bat`

**Q: Do I need both Node.js and Rust?**
A: Only if building both extensions. VS Code needs Node.js, Zed needs Rust.

---

## ✨ Summary

**Simplest path:**
```bash
build-all.bat
# Restart your editor(s)
# Done! 🎉
```

**For development:**
```bash
# Use watch mode
npm run watch       # For TypeScript
cargo watch        # For Rust
```

**For quick reinstall:**
```bash
install-extension.bat      # VS Code
install-zed-extension.bat  # Zed
```

---

**Happy Building!** 🔨✨