# Log Scout Analyzer - Installation Guide

Complete installation instructions for both Zed and VS Code extensions.

## 📦 Quick Install (Both Extensions)

### On Linux/macOS/WSL:
```bash
cd log_scout_analyzer
chmod +x build-all.sh
./build-all.sh
```

### On Windows:
```cmd
cd log_scout_analyzer
build-all.bat
```

The unified build script will:
- ✅ Build and deploy the Zed extension (WASM)
- ✅ Build and package the VS Code extension (.vsix)
- ✅ Automatically install both extensions
- ✅ Show detailed status and next steps

---

## 🎯 Zed Extension Installation

### Automatic Installation (Recommended)

**Linux/macOS/WSL:**
```bash
cd log_scout_analyzer
./build.sh build
```

**Windows:**
```cmd
cd log_scout_analyzer
build.bat
```

The script will:
1. Compile Rust code to WebAssembly
2. Deploy to `~/.config/zed/extensions/log-scout-analyzer`
3. Copy all necessary files (extension.toml, config/, grammars/)

### Manual Installation

1. **Build the WASM binary:**
   ```bash
   cargo build --release --target wasm32-wasip1
   ```

2. **Create extension directory:**
   ```bash
   mkdir -p ~/.config/zed/extensions/log-scout-analyzer
   ```

3. **Copy files:**
   ```bash
   cp target/wasm32-wasip1/release/log_scout_analyzer.wasm ~/.config/zed/extensions/log-scout-analyzer/
   cp extension.toml ~/.config/zed/extensions/log-scout-analyzer/
   cp -r config ~/.config/zed/extensions/log-scout-analyzer/
   cp -r grammars ~/.config/zed/extensions/log-scout-analyzer/
   ```

4. **Restart Zed completely**

### Verify Zed Installation

```bash
# Run verification script
./verify-extension.sh

# Or manually check
ls -lh ~/.config/zed/extensions/log-scout-analyzer/
```

Expected files:
- `log_scout_analyzer.wasm` (~1.1 MB)
- `extension.toml` (~500 bytes)
- `config/` (pattern files)
- `grammars/` (syntax highlighting)

### Enable in Zed

1. Completely quit and restart Zed (important!)
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Look for **"Log Scout Analyzer"** in installed extensions
4. Open a `.log` file to test

---

## 💻 VS Code Extension Installation

### Method 1: Install from VSIX (Recommended)

**After running build-all script:**
```bash
cd log_scout_analyzer
code --install-extension vscode-extension/log-scout-analyzer-0.1.0.vsix
```

**Or in VS Code:**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Extensions: Install from VSIX`
3. Navigate to: `log_scout_analyzer/vscode-extension/log-scout-analyzer-0.1.0.vsix`
4. Click Install
5. Reload VS Code window

### Method 2: Build Manually

```bash
cd log_scout_analyzer/vscode-extension

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
npm run package

# Install
code --install-extension log-scout-analyzer-0.1.0.vsix
```

### Verify VS Code Installation

```bash
# List installed extensions
code --list-extensions | grep log-scout

# Or check in VS Code
# Ctrl+Shift+X -> Search "Log Scout Analyzer"
```

### Enable in VS Code

1. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Open Extensions panel: `Ctrl+Shift+X`
3. Search for "Log Scout Analyzer"
4. Should show as installed and enabled
5. Open a `.log` file to test

---

## 🔧 Prerequisites

### For Both Extensions
- **Git** - For cloning the repository
- **Text editor or IDE** - For viewing configuration files

### For Zed Extension
- **Rust & Cargo** (1.70 or higher)
  - Install: https://rustup.rs/
  - Verify: `cargo --version`

- **WASM Target**
  ```bash
  rustup target add wasm32-wasip1
  ```

### For VS Code Extension
- **Node.js** (18 or higher)
  - Install: https://nodejs.org/
  - Verify: `node --version`

- **npm** (usually comes with Node.js)
  - Verify: `npm --version`

- **VS Code** (1.75 or higher)
  - Install: https://code.visualstudio.com/

---

## 📍 Installation Paths

### Zed Extension
- **Linux/macOS**: `~/.config/zed/extensions/log-scout-analyzer/`
- **Windows**: `%USERPROFILE%\.config\zed\extensions\log-scout-analyzer\`
- **WSL**: `/mnt/c/Users/<username>/.config/zed/extensions/log-scout-analyzer/`

### VS Code Extension
- **Linux/macOS**: `~/.vscode/extensions/log-scout-analyzer-0.1.0/`
- **Windows**: `%USERPROFILE%\.vscode\extensions\log-scout-analyzer-0.1.0\`
- **Package**: `log-scout-analyzer-0.1.0.vsix` (portable)

---

## ✅ Testing the Installation

### Create a Test Log File

```bash
cat > test.log << 'EOF'
2024-02-06 03:00:00 INFO Application starting...
2024-02-06 03:00:01 DEBUG Initializing database connection
2024-02-06 03:00:02 INFO Database connected successfully
2024-02-06 03:00:03 WARN Connection pool at 80% capacity
2024-02-06 03:00:04 ERROR Failed to load configuration file
2024-02-06 03:00:05 FATAL Application shutting down due to critical error
java.lang.NullPointerException: Configuration is null
    at com.example.App.loadConfig(App.java:123)
    at com.example.App.main(App.java:45)
Caused by: java.io.FileNotFoundException: config.yaml not found
    at com.example.ConfigLoader.load(ConfigLoader.java:78)
EOF
```

### Test in Zed

```bash
zed test.log
```

**Expected behavior:**
- ✅ Syntax highlighting for timestamps
- ✅ Color-coded log levels (ERROR in red, WARN in yellow)
- ✅ Red underlines under ERROR and FATAL lines
- ✅ Yellow underlines under WARN lines
- ✅ Hover tooltips with pattern information
- ✅ Status bar shows "Log Files" as language

### Test in VS Code

```bash
code test.log
```

**Expected behavior:**
- ✅ Language mode shows "Log" in status bar (bottom-right)
- ✅ Problems panel shows detected errors/warnings
- ✅ Syntax highlighting for log patterns
- ✅ Error squiggles under ERROR/FATAL lines
- ✅ Warning squiggles under WARN lines
- ✅ Commands available: `Ctrl+Shift+P` → "Log Scout"

---

## 🐛 Troubleshooting

### Zed Extension Issues

**Extension not appearing:**
```bash
# Verify files are in place
ls -lh ~/.config/zed/extensions/log-scout-analyzer/

# Check WASM binary size (should be ~1.1 MB)
du -h ~/.config/zed/extensions/log-scout-analyzer/log_scout_analyzer.wasm

# Completely restart Zed (quit, don't just close windows)
pkill -9 zed  # Force quit (Linux/macOS)
```

**WASM compilation errors:**
```bash
# Clean and rebuild
cargo clean
rustup update
cargo build --release --target wasm32-wasip1
```

**Permission errors:**
```bash
# Fix ownership (Linux/macOS)
sudo chown -R $USER:$USER ~/.config/zed
```

### VS Code Extension Issues

**Extension not loading:**
```bash
# Reinstall extension
code --uninstall-extension log-scout-team.log-scout-analyzer
code --install-extension log-scout-analyzer-0.1.0.vsix --force

# Reload VS Code
# Ctrl+Shift+P -> "Developer: Reload Window"
```

**TypeScript compilation errors:**
```bash
cd vscode-extension
rm -rf node_modules out
npm install
npm run compile
```

**VSIX packaging errors:**
```bash
# Install vsce globally
npm install -g @vscode/vsce

# Package again
npm run package
```

### Common Issues (Both)

**File size too large:**
- Zed WASM should be ~1.1 MB in release mode
- If it's 3-5 MB, you built in debug mode
- Rebuild: `cargo build --release --target wasm32-wasip1`

**Extension not recognizing .log files:**
- Make sure file has `.log` extension
- In VS Code: Click language indicator (bottom-right) → Select "Log"
- In Zed: Should auto-detect

**Patterns not matching:**
- Check configuration files in `config/` directory
- Patterns use regex syntax
- Test patterns at https://regex101.com/

---

## 🔄 Updating the Extension

### Update Zed Extension
```bash
cd log_scout_analyzer
git pull  # If using git
./build.sh build
# Restart Zed
```

### Update VS Code Extension
```bash
cd log_scout_analyzer
git pull  # If using git
cd vscode-extension
npm install  # Update dependencies
npm run compile
npm run package
code --install-extension log-scout-analyzer-0.1.0.vsix --force
# Reload VS Code window
```

---

## 🗑️ Uninstalling

### Uninstall Zed Extension
```bash
rm -rf ~/.config/zed/extensions/log-scout-analyzer
# Restart Zed
```

### Uninstall VS Code Extension
```bash
# Via command line
code --uninstall-extension log-scout-team.log-scout-analyzer

# Or in VS Code
# Ctrl+Shift+X -> Search "Log Scout Analyzer" -> Uninstall
```

---

## 📊 Build Status Check

### Verify Successful Build

**Zed Extension:**
```bash
# Should show ~1.1 MB WASM file
ls -lh ~/.config/zed/extensions/log-scout-analyzer/log_scout_analyzer.wasm

# Should show extension.toml
cat ~/.config/zed/extensions/log-scout-analyzer/extension.toml
```

**VS Code Extension:**
```bash
# Should show .vsix file (~14 KB)
ls -lh vscode-extension/*.vsix

# Check package contents
unzip -l vscode-extension/log-scout-analyzer-0.1.0.vsix
```

---

## 🚀 Advanced Installation

### Install in Development Mode

**Zed (Symlink):**
```bash
ln -s $(pwd) ~/.config/zed/extensions/log-scout-analyzer
cargo build --release --target wasm32-wasip1
cp target/wasm32-wasip1/release/log_scout_analyzer.wasm ~/.config/zed/extensions/log-scout-analyzer/
```

**VS Code (Debug Mode):**
```bash
cd vscode-extension
npm run watch  # Compile on save
# Press F5 in VS Code to launch Extension Development Host
```

### Custom Installation Path

**Override Zed path:**
```bash
export ZED_EXT_DIR="/custom/path/to/zed/extensions"
./build.sh build
```

**Override VS Code path:**
```bash
code --extensions-dir /custom/path --install-extension log-scout-analyzer-0.1.0.vsix
```

---

## 📚 Additional Resources

- **Build Documentation**: See `BUILD_BOTH.md`
- **Troubleshooting Guide**: See `EXTENSION_TROUBLESHOOTING.md`
- **Configuration**: See `README.md`
- **Contributing**: See `CONTRIBUTING.md`

---

## 💡 Quick Tips

1. **Always restart** the editor completely after installation
2. **Check file extensions** - `.log` and `.txt` are supported
3. **Look at the test file** - `test.log` has examples of all patterns
4. **Use verification scripts** - They'll catch common issues
5. **Build both at once** - Use `build-all.sh` for consistency

---

## ✨ What's Next?

After successful installation:

1. **Configure patterns** - Edit config files to match your log format
2. **Test with real logs** - Open your actual log files
3. **Customize settings** - Adjust pattern matching sensitivity
4. **Share feedback** - Report issues or suggest features

---

**Installation successful?** Open a log file and start analyzing! 🎉