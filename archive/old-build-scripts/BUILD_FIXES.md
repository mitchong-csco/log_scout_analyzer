# Build Script Fixes - Windows/WSL Path Corrections

## Problem Summary

The Log Scout Analyzer extension was not appearing in Zed on Windows because the build script was copying files to the wrong location.

### Root Cause

The build script was using the incorrect Windows path for Zed extensions:
- **Incorrect**: `/mnt/c/Users/$WIN_USER/AppData/Local/Zed/extensions`
- **Correct**: `/mnt/c/Users/$WIN_USER/.config/zed/extensions`

## Changes Made

### 1. Fixed Windows Extension Path (Line 61)

**Before:**
```bash
ZED_EXT_DIR="/mnt/c/Users/$WIN_USER/AppData/Local/Zed/extensions"
```

**After:**
```bash
ZED_EXT_DIR="/mnt/c/Users/$WIN_USER/.config/zed/extensions"
```

### 2. Enhanced Installation Verification

Added comprehensive checks to the `install_to_zed()` function:

- ✅ Verify `extension.toml` exists before installing
- ✅ Verify target directory was created successfully
- ✅ Verify files were copied successfully
- ✅ Show file sizes for confirmation
- ✅ Display both WSL and Windows paths for clarity
- ✅ Provide clear next steps after installation

### 3. Added Diagnostic Command

New `diagnostic` command shows complete system status:

```bash
./build.sh diagnostic
```

This displays:
- Operating system and environment details
- Zed extensions directory path (WSL and Windows format)
- Whether the extension is installed
- List of all installed files with sizes
- Contents of `extension.toml`
- Build artifacts status
- Rust and WASM target installation status

## Usage

### Build and Install
```bash
cd ~/code/log_scout_analyzer
./build.sh build
```

This will:
1. Build the WASM binary
2. Copy it to `C:\Users\<username>\.config\zed\extensions\log-scout-analyzer\`
3. Copy `extension.toml` to the same location
4. Show verification that files were copied
5. Display the Windows path for reference

### Check Installation Status
```bash
./build.sh diagnostic
```

This shows whether the extension is properly installed and where.

### Verify in Zed

After building and installing:
1. Restart Zed (completely close and reopen)
2. Press `Ctrl+Shift+P`
3. Type "Extensions" → Open Extensions panel
4. Look for "Log Scout Analyzer" in the list

## Path Reference

### WSL Path
```
/mnt/c/Users/<username>/.config/zed/extensions/log-scout-analyzer/
```

### Windows Path
```
C:\Users\<username>\.config\zed\extensions\log-scout-analyzer\
```

### Expected Files
```
log-scout-analyzer/
├── log_scout_analyzer.wasm  (the compiled extension)
└── extension.toml           (extension metadata)
```

## Troubleshooting

### Extension Still Not Appearing?

1. **Check installation status:**
   ```bash
   ./build.sh diagnostic
   ```

2. **Verify Zed is completely restarted:**
   - Close all Zed windows
   - End any Zed processes in Task Manager
   - Reopen Zed

3. **Check Zed logs:**
   - In Zed: `Ctrl+Shift+P` → "Zed: Open Log"
   - Look for errors related to "log-scout-analyzer"

4. **Verify extension.toml syntax:**
   ```bash
   cat ~/.config/zed/extensions/log-scout-analyzer/extension.toml
   # On WSL: /mnt/c/Users/<username>/.config/zed/extensions/log-scout-analyzer/extension.toml
   ```

5. **Try manual dev installation:**
   - Copy extension folder to Windows Downloads or Documents
   - In Zed: `Ctrl+Shift+P` → "Install Dev Extension"
   - Browse to the copied folder

### Common Issues

- **"Extension not found"**: Extension wasn't copied to the right location
- **"TOML parse error"**: Syntax error in `extension.toml`
- **No errors but not loading**: Zed may need a full restart or extension may be disabled

## Additional Commands

```bash
# Full build cycle (recommended first time)
./build.sh all

# Just install (if already built)
./build.sh install

# Uninstall
./build.sh uninstall

# Clean and rebuild
./build.sh clean
./build.sh build
```

## Notes for Future Development

- Always test installation with `./build.sh diagnostic` after changes
- The `.config/zed/extensions` path is consistent across Zed installations on Windows
- WSL provides seamless access to Windows filesystem via `/mnt/c/`
- Extension must be in a directory matching its ID: `log-scout-analyzer`
- Zed watches the extensions directory, but requires restart to load new extensions

## References

- Original troubleshooting thread: Zed Extension Not Appearing Troubleshooting
- Zed extensions documentation: https://zed.dev/docs/extensions
- Extension development: https://zed.dev/docs/extensions/developing-extensions