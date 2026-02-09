# Log Scout Analyzer Extension - Troubleshooting Guide

## Extension Not Visible in Zed

If you don't see the **Log Scout Analyzer** extension in Zed after installation, follow these troubleshooting steps:

---

## Quick Checklist

- [ ] Extension files are in the correct directory
- [ ] Zed has been completely restarted
- [ ] Zed version is 0.118.0 or higher
- [ ] WASM binary is present and valid
- [ ] extension.toml is properly formatted

---

## Step 1: Verify Installation Location

Check that the extension is installed in the correct directory:

**Linux/macOS:**
```bash
ls -la ~/.config/zed/extensions/log-scout-analyzer/
```

**Windows (PowerShell):**
```powershell
Get-ChildItem $env:USERPROFILE\.config\zed\extensions\log-scout-analyzer\
```

**Expected files:**
```
log-scout-analyzer/
├── extension.toml
├── log_scout_analyzer.wasm
├── config/
│   ├── patterns.yaml
│   ├── jabber.yaml
│   └── webex.yaml
└── grammars/
    └── log/
        └── config.toml
```

---

## Step 2: Verify Zed Version

The extension requires Zed 0.118.0 or higher for WASM extension support.

```bash
zed --version
```

If you're on an older version, update Zed:
- **macOS/Linux:** Download from https://zed.dev/download
- **Windows:** Update via the installer

---

## Step 3: Check WASM Binary

Verify the WASM binary exists and has the correct size:

```bash
ls -lh ~/.config/zed/extensions/log-scout-analyzer/log_scout_analyzer.wasm
```

Expected size: ~1.0 - 1.1 MB

If missing or too small (< 100KB), rebuild:
```bash
cd log_scout_analyzer
cargo build --release --target wasm32-wasip1
./install-extension.sh
```

---

## Step 4: Validate extension.toml

Check the extension manifest:

```bash
cat ~/.config/zed/extensions/log-scout-analyzer/extension.toml
```

**Expected content:**
```toml
id = "log-scout-analyzer"
name = "Log Scout Analyzer"
description = "Advanced log analysis extension with pattern recognition and diagnostics"
version = "0.1.0"
schema_version = 1
authors = ["Log Scout Team"]
repository = "https://github.com/yourusername/log-scout-analyzer"

[language_servers.log-scout-lsp]
name = "Log Scout LSP"
language = "log"

[languages.log]
name = "Log Files"
grammar = "log"
path_suffixes = ["log", "txt"]
line_comments = ["#", "//"]
```

---

## Step 5: Completely Restart Zed

Extensions are loaded on startup, so a full restart is required:

1. **Close all Zed windows** - Don't just minimize
2. **Quit the application completely:**
   - **macOS:** Cmd+Q or right-click dock icon → Quit
   - **Linux:** Ctrl+Q or close all windows
   - **Windows:** Alt+F4 or File → Exit
3. **Verify Zed is not running:**
   ```bash
   # Linux/macOS
   pgrep -i zed
   
   # Windows (PowerShell)
   Get-Process | Where-Object {$_.Name -like "*zed*"}
   ```
4. **Restart Zed**

---

## Step 6: Check Extensions Panel

After restarting Zed:

1. Open Extensions panel: **Cmd/Ctrl+Shift+X**
2. Look in the **"Installed"** section
3. You should see: **"Log Scout Analyzer v0.1.0"**

**Alternative access:**
- Menu: **View → Extensions**
- Command palette: **Cmd/Ctrl+Shift+P** → type "extensions"

---

## Step 7: View Developer Console

Check for extension loading errors:

1. Open Developer Tools: **Cmd/Ctrl+Shift+I**
2. Go to the **Console** tab
3. Look for messages containing:
   - `log-scout-analyzer`
   - `extension`
   - `wasm`
   - Any red error messages

**Common errors:**
- `Failed to load WASM module` → Rebuild the extension
- `Invalid extension.toml` → Check TOML syntax
- `Schema version mismatch` → Update Zed or adjust schema_version

---

## Step 8: Test Extension Functionality

Even if not visible in the panel, test if it works:

1. Create a test log file:
   ```bash
   cd log_scout_analyzer
   zed test.log
   ```

2. The test.log file should be recognized with:
   - Syntax highlighting (if grammar is working)
   - Diagnostics/warnings for error patterns
   - Language mode showing as "Log Files" in status bar

---

## Step 9: Clean Reinstall

If issues persist, perform a clean reinstall:

```bash
# Remove existing installation
rm -rf ~/.config/zed/extensions/log-scout-analyzer

# Rebuild and reinstall
cd log_scout_analyzer
cargo clean
cargo build --release --target wasm32-wasip1
./install-extension.sh

# Restart Zed completely
pkill -9 zed  # Force quit (Linux/macOS)
```

---

## Step 10: Check Zed Configuration

Some Zed settings might affect extension loading. Check your settings:

```bash
cat ~/.config/zed/settings.json
```

Ensure you don't have:
- Extensions disabled globally
- Specific extensions blocked
- Development mode settings that conflict

**Recommended minimal settings for testing:**
```json
{
  "telemetry": {
    "diagnostics": true,
    "metrics": true
  },
  "features": {
    "extensions": true
  }
}
```

---

## Known Issues

### Issue: Extension loads but patterns don't work
**Solution:** Check that config files are in place:
```bash
ls ~/.config/zed/extensions/log-scout-analyzer/config/
```

### Issue: "Log Files" language not available
**Solution:** Verify grammar files exist:
```bash
ls ~/.config/zed/extensions/log-scout-analyzer/grammars/log/
```

### Issue: Extension appears but shows errors
**Solution:** Check extension API compatibility. The extension uses `zed_extension_api = "0.0.6"`. Update if Zed's API has changed.

### Issue: WSL/Windows path issues
**Solution:** Ensure you're using the correct config path:
- WSL: `~/.config/zed/extensions/`
- Windows: `%USERPROFILE%\.config\zed\extensions\`

---

## Manual Testing Without Zed UI

You can verify the extension works by checking its components:

### Test WASM Module
```bash
# Check WASM is valid
wasm-objdump -h ~/.config/zed/extensions/log-scout-analyzer/log_scout_analyzer.wasm
```

### Test Pattern Files
```bash
# Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('config/patterns.yaml'))"
```

### Test Regex Patterns
```bash
# Test a pattern manually
grep -E "(?i)(exception|error):\s*(.+)" test.log
```

---

## Getting Help

If you've tried all steps and the extension still doesn't appear:

1. **Check Zed GitHub Issues:**
   https://github.com/zed-industries/zed/issues

2. **Zed Discord Community:**
   https://discord.gg/zed

3. **Extension Logs:**
   Check Zed's log files for detailed error messages:
   ```bash
   # Linux/macOS
   tail -f ~/.local/share/zed/logs/Zed.log
   
   # Windows
   Get-Content $env:LOCALAPPDATA\Zed\logs\Zed.log -Tail 20 -Wait
   ```

4. **Create an Issue:**
   Include:
   - Zed version (`zed --version`)
   - OS and version
   - Extension installation path
   - Contents of extension.toml
   - Any error messages from console
   - Output of: `ls -la ~/.config/zed/extensions/log-scout-analyzer/`

---

## Alternative: Symlink Development Version

For development, you can symlink instead of copying:

```bash
# Remove copied version
rm -rf ~/.config/zed/extensions/log-scout-analyzer

# Create symlink to development directory
ln -s $(pwd) ~/.config/zed/extensions/log-scout-analyzer

# Rebuild WASM in place
cargo build --release --target wasm32-wasip1

# Copy WASM to extension root (Zed expects it in the root)
cp target/wasm32-wasip1/release/log_scout_analyzer.wasm .
```

This allows you to make changes and rebuild without reinstalling.

---

## Debug Mode

To run Zed with debug output for extensions:

```bash
# Linux/macOS
RUST_LOG=zed::extension=debug zed

# Or with all debug output
RUST_LOG=debug zed
```

This will show detailed information about extension loading in the terminal.

---

## Verification Script

Run this script to verify everything is in place:

```bash
#!/bin/bash

echo "=== Log Scout Analyzer Extension Verification ==="
echo ""

EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"

# Check directory exists
if [ -d "$EXTENSION_DIR" ]; then
    echo "✓ Extension directory exists"
else
    echo "✗ Extension directory NOT found"
    exit 1
fi

# Check WASM
if [ -f "$EXTENSION_DIR/log_scout_analyzer.wasm" ]; then
    SIZE=$(du -h "$EXTENSION_DIR/log_scout_analyzer.wasm" | cut -f1)
    echo "✓ WASM binary found ($SIZE)"
else
    echo "✗ WASM binary NOT found"
fi

# Check extension.toml
if [ -f "$EXTENSION_DIR/extension.toml" ]; then
    echo "✓ extension.toml found"
else
    echo "✗ extension.toml NOT found"
fi

# Check config
if [ -d "$EXTENSION_DIR/config" ]; then
    COUNT=$(ls "$EXTENSION_DIR/config"/*.yaml 2>/dev/null | wc -l)
    echo "✓ Config directory found ($COUNT pattern files)"
else
    echo "✗ Config directory NOT found"
fi

# Check grammars
if [ -d "$EXTENSION_DIR/grammars" ]; then
    echo "✓ Grammars directory found"
else
    echo "✗ Grammars directory NOT found"
fi

# Check if Zed is running
if pgrep -x "zed" > /dev/null || pgrep -x "Zed" > /dev/null; then
    echo "⚠  Zed is currently running - restart required"
else
    echo "✓ Zed is not running"
fi

echo ""
echo "=== Recommendation ==="
echo "1. Ensure all items above show ✓"
echo "2. Restart Zed completely"
echo "3. Press Cmd/Ctrl+Shift+X to view extensions"
```

Save this as `verify-extension.sh` and run it to check your installation.

---

## Success Indicators

When the extension is properly loaded, you should see:

1. **Extensions Panel:**
   - "Log Scout Analyzer" in installed list
   - Version 0.1.0 displayed
   - "Installed" badge/status

2. **When opening .log files:**
   - Status bar shows "Log Files" as language
   - Error patterns highlighted in red
   - Warning patterns highlighted in yellow
   - Hover tooltips on detected patterns

3. **Console (Cmd/Ctrl+Shift+I):**
   - No errors related to log-scout-analyzer
   - May see: "Extension loaded: log-scout-analyzer"

---

## Contact & Support

- **Repository:** https://github.com/yourusername/log-scout-analyzer
- **Issues:** Report bugs and request features on GitHub
- **Documentation:** See README.md and GET_STARTED.txt

For extension development questions, refer to:
- Zed Extension API: https://github.com/zed-industries/zed/tree/main/crates/extension_api
- Zed Extensions Guide: https://zed.dev/docs/extensions