# Building Both Zed and VS Code Extensions

This guide explains how to build and deploy both the Zed and VS Code versions of the Log Scout Analyzer extension simultaneously.

## Quick Start

### On Linux/macOS/WSL:
```bash
chmod +x build-all.sh
./build-all.sh
```

### On Windows (PowerShell or CMD):
```cmd
build-all.bat
```

## What Gets Built

The unified build script handles:

1. **Zed Extension**
   - Compiles Rust code to WebAssembly (WASM)
   - Deploys to `~/.config/zed/extensions/log-scout-analyzer`
   - Includes: extension.toml, WASM binary, config files, grammars

2. **VS Code Extension**
   - Compiles TypeScript to JavaScript
   - Creates installable `.vsix` package
   - Automatically installs to VS Code (if CLI available)
   - Includes: all compiled code, language configuration, syntax highlighting

## Prerequisites

Both build scripts automatically check for and help install:

### Required Tools
- **Rust & Cargo** (1.70+)
  - Install: https://rustup.rs/
  - WASM target: `rustup target add wasm32-wasip1`

- **Node.js & npm** (18+)
  - Install: https://nodejs.org/
  - For VS Code extension compilation

### Optional Tools
- **vsce** - VS Code Extension Manager
  - Installed automatically by build script
  - Or manually: `npm install -g @vscode/vsce`

- **code** CLI - VS Code command-line interface
  - For automatic extension installation
  - Setup in VS Code: `Ctrl+Shift+P` → "Shell Command: Install 'code' command in PATH"

## Build Process Details

### Step-by-Step Breakdown

1. **OS Detection**
   - Automatically detects: Linux, macOS, Windows, WSL
   - Sets appropriate paths for each platform

2. **Prerequisites Check**
   - Verifies Rust, Cargo, Node.js, npm
   - Installs WASM target if missing
   - Reports all versions

3. **Zed Extension Build**
   - Compiles: `cargo build --release --target wasm32-wasip1`
   - Output: `target/wasm32-wasip1/release/log_scout_analyzer.wasm`
   - Size: ~1.1 MB

4. **Zed Extension Deploy**
   - Copies WASM binary to Zed extensions directory
   - Copies extension.toml manifest
   - Copies config/ directory (pattern files)
   - Copies grammars/ directory (syntax highlighting)

5. **VS Code Dependencies**
   - Runs: `npm install` in vscode-extension/
   - Installs TypeScript, VS Code types, build tools
   - Updates if node_modules already exists

6. **VS Code Extension Build**
   - Compiles: `npm run compile` (TypeScript → JavaScript)
   - Output: `vscode-extension/out/` directory
   - Includes: extension.js, patternEngine.js, diagnosticsProvider.js

7. **VS Code Extension Package**
   - Creates: `npm run package` (generates .vsix file)
   - Output: `log-scout-analyzer-0.1.0.vsix`
   - Size: ~50-100 KB (much smaller, no WASM)

8. **VS Code Extension Deploy**
   - Attempts: `code --install-extension <file>.vsix`
   - Falls back to manual instructions if CLI unavailable

9. **Summary Report**
   - Shows installation paths
   - Lists file sizes
   - Provides next steps for both editors

## Installation Paths

### Zed Extension
- **Linux/macOS**: `~/.config/zed/extensions/log-scout-analyzer/`
- **Windows**: `%USERPROFILE%\.config\zed\extensions\log-scout-analyzer\`
- **WSL**: `/mnt/c/Users/<username>/.config/zed/extensions/log-scout-analyzer/`

### VS Code Extension
- **Linux/macOS**: `~/.vscode/extensions/log-scout-analyzer-0.1.0/`
- **Windows**: `%USERPROFILE%\.vscode\extensions\log-scout-analyzer-0.1.0\`
- **Package File**: `log-scout-analyzer-0.1.0.vsix` (in project root)

## Verification

### Verify Zed Extension
```bash
ls -lh ~/.config/zed/extensions/log-scout-analyzer/
```

Expected files:
- `log_scout_analyzer.wasm` (~1.1 MB)
- `extension.toml` (~500 bytes)
- `config/` directory
- `grammars/` directory

### Verify VS Code Extension
```bash
code --list-extensions | grep log-scout
```

Or check in VS Code:
1. `Ctrl+Shift+X` to open Extensions
2. Search for "Log Scout Analyzer"
3. Should show as installed

## Testing

### Create a Test Log File
```bash
cat > test.log << 'EOF'
2024-02-04 23:30:00 INFO Application started
2024-02-04 23:30:01 DEBUG Initializing components
2024-02-04 23:30:02 WARN Connection timeout, retrying...
2024-02-04 23:30:03 ERROR Failed to connect to database
2024-02-04 23:30:04 FATAL Application crashed
java.lang.NullPointerException: Something went wrong
    at com.example.Main.main(Main.java:42)
EOF
```

### Test in Zed
```bash
zed test.log
```

Expected behavior:
- Syntax highlighting for timestamps, log levels
- Red squiggles under ERROR and FATAL
- Yellow squiggles under WARN
- Hover tooltips with pattern information

### Test in VS Code
```bash
code test.log
```

Expected behavior:
- Language mode shows "Log" in status bar
- Problems panel shows detected errors/warnings
- Syntax highlighting matches log patterns
- Commands available in Command Palette

## Troubleshooting

### Zed Extension Not Loading

**Check installation:**
```bash
./verify-extension.sh
```

**Common issues:**
- Zed not restarted after installation → Completely quit and restart
- WASM file missing → Re-run build-all script
- extension.toml syntax error → Check for proper TOML formatting

**Solution:**
```bash
rm -rf ~/.config/zed/extensions/log-scout-analyzer
./build-all.sh
# Restart Zed completely
```

### VS Code Extension Not Loading

**Check installation:**
```bash
code --list-extensions | grep log-scout
```

**Common issues:**
- VS Code not reloaded → `Ctrl+Shift+P` → "Developer: Reload Window"
- VSIX not installed → Install manually from Extensions panel
- Compilation errors → Check `vscode-extension/out/` exists

**Solution:**
```bash
cd vscode-extension
npm run compile
code --install-extension log-scout-analyzer-0.1.0.vsix --force
# Reload VS Code window
```

### Build Failures

**Rust compilation errors:**
```bash
cargo clean
rustup update
rustup target add wasm32-wasip1
cargo build --release --target wasm32-wasip1
```

**TypeScript compilation errors:**
```bash
cd vscode-extension
rm -rf node_modules package-lock.json
npm install
npm run compile
```

**Permission errors (WSL/Linux):**
```bash
chmod +x build-all.sh
sudo chown -R $USER:$USER ~/.config/zed
sudo chown -R $USER:$USER ~/.vscode
```

## Manual Build (Individual Extensions)

### Build Only Zed Extension
```bash
# Linux/macOS/WSL
./build.sh build

# Windows
build.bat
```

### Build Only VS Code Extension
```bash
cd vscode-extension
npm install
npm run compile
npm run package
code --install-extension log-scout-analyzer-0.1.0.vsix
```

## Distribution

### Share Zed Extension
Package the directory:
```bash
cd ~/.config/zed/extensions
tar -czf log-scout-analyzer-zed.tar.gz log-scout-analyzer/
```

Recipients extract to their extensions directory:
```bash
cd ~/.config/zed/extensions
tar -xzf log-scout-analyzer-zed.tar.gz
```

### Share VS Code Extension
The `.vsix` file is ready for distribution:
```bash
# Share this file:
log-scout-analyzer-0.1.0.vsix

# Recipients install with:
code --install-extension log-scout-analyzer-0.1.0.vsix
```

Or publish to VS Code Marketplace:
```bash
cd vscode-extension
vsce publish
```

## Development Workflow

### Iterative Development

**For Zed extension:**
```bash
# Edit Rust code in src/
cargo build --release --target wasm32-wasip1
cp target/wasm32-wasip1/release/log_scout_analyzer.wasm ~/.config/zed/extensions/log-scout-analyzer/
# Restart Zed
```

**For VS Code extension:**
```bash
# Edit TypeScript code in vscode-extension/src/
cd vscode-extension
npm run watch  # Auto-recompile on save
# Press F5 in VS Code to launch Extension Development Host
```

### Watch Mode

**VS Code development:**
```bash
cd vscode-extension
npm run watch
```

Then in VS Code:
1. Open vscode-extension folder
2. Press `F5` to start debugging
3. Edit code, save, reload extension host

**Zed development:**
```bash
# Terminal 1: Watch and rebuild
cargo watch -x 'build --release --target wasm32-wasip1'

# Terminal 2: Auto-copy on build
while true; do
  inotifywait -e modify target/wasm32-wasip1/release/log_scout_analyzer.wasm
  cp target/wasm32-wasip1/release/log_scout_analyzer.wasm ~/.config/zed/extensions/log-scout-analyzer/
  echo "Updated Zed extension - restart Zed to reload"
done
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Extensions

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-wasip1
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build both extensions
        run: ./build-all.sh
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: extensions
          path: |
            log-scout-analyzer-*.vsix
            ~/.config/zed/extensions/log-scout-analyzer/
```

## Performance Considerations

### Build Times
- **Zed Extension**: 30-60 seconds (Rust compilation)
- **VS Code Extension**: 10-20 seconds (TypeScript compilation)
- **Total**: ~1-2 minutes for both

### Optimization Tips
- Use `cargo build --release` for production (slower but optimized)
- Use `cargo build` for development (faster but larger)
- Enable incremental compilation: `CARGO_INCREMENTAL=1`
- Use `npm ci` instead of `npm install` in CI (faster, reproducible)

## File Sizes

### Zed Extension
- WASM binary: ~1.1 MB (release), ~3-5 MB (debug)
- extension.toml: ~500 bytes
- Config files: ~10 KB
- Grammars: ~5 KB
- **Total**: ~1.2 MB

### VS Code Extension
- Compiled JS: ~50 KB
- Node modules (not in .vsix): ~20 MB
- Language configs: ~2 KB
- Grammars: ~8 KB
- **VSIX package**: ~50-100 KB (very compact!)

## Differences Between Extensions

| Feature | Zed Extension | VS Code Extension |
|---------|---------------|-------------------|
| Language | Rust (WASM) | TypeScript/JavaScript |
| Size | ~1.1 MB | ~50 KB (packaged) |
| Build Time | 30-60s | 10-20s |
| Hot Reload | No (restart required) | Yes (F5 in dev mode) |
| Distribution | Directory copy | Single .vsix file |
| API | Zed Extension API | VS Code Extension API |
| Diagnostics | Via LSP hooks | Via DiagnosticCollection |
| Patterns | YAML config files | VS Code settings.json |

## Best Practices

1. **Always build both** when making changes to:
   - Pattern configurations
   - Core logic
   - Documentation

2. **Test in both editors** to ensure feature parity

3. **Keep versions in sync** - Update version in:
   - `Cargo.toml` (Zed)
   - `vscode-extension/package.json` (VS Code)
   - `extension.toml` (Zed)

4. **Commit generated files** selectively:
   - ✅ Commit: extension.toml, package.json, README
   - ❌ Don't commit: target/, out/, node_modules/, *.vsix, *.wasm

5. **Use semantic versioning**:
   - 0.1.0 → Initial release
   - 0.1.1 → Bug fixes
   - 0.2.0 → New features
   - 1.0.0 → Stable release

## Support

- **Build Issues**: Check EXTENSION_TROUBLESHOOTING.md
- **Zed Specific**: See VIEWING_EXTENSION.md
- **VS Code Specific**: See vscode-extension/README.md
- **General Help**: See README.md

## Quick Reference

```bash
# Build both extensions
./build-all.sh                    # Linux/macOS/WSL
build-all.bat                     # Windows

# Verify installations
./verify-extension.sh             # Zed only
code --list-extensions | grep log # VS Code only

# Test
zed test.log                      # In Zed
code test.log                     # In VS Code

# Clean and rebuild
cargo clean
rm -rf vscode-extension/node_modules vscode-extension/out
./build-all.sh

# Uninstall
rm -rf ~/.config/zed/extensions/log-scout-analyzer
code --uninstall-extension log-scout-team.log-scout-analyzer
```

---

**Happy building! 🛠️**