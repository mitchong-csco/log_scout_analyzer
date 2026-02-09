# How to View Log Scout Analyzer Extension in Zed

## ✅ Installation Verification

Your extension is **properly installed** at:
```
~/.config/zed/extensions/log-scout-analyzer/
```

All required files are in place:
- ✓ WASM binary (1.1M)
- ✓ extension.toml
- ✓ Config files (patterns.yaml, jabber.yaml, webex.yaml)
- ✓ Grammar files

---

## 🔄 Step 1: Restart Zed (CRITICAL)

**You MUST completely restart Zed** for the extension to load:

### Windows:
1. Close all Zed windows
2. Press **Alt+F4** or **File → Exit**
3. Verify Zed is closed (check Task Manager)
4. Relaunch Zed

### Linux/macOS:
1. Press **Cmd+Q** (macOS) or **Ctrl+Q** (Linux)
2. Or close all windows
3. Verify it's not running: `pgrep -i zed`
4. Relaunch Zed

⚠️ **Important:** Just closing windows may not quit Zed completely!

---

## 📦 Step 2: Open Extensions Panel

After restarting Zed, open the Extensions panel:

**Option 1 - Keyboard Shortcut:**
- **Windows/Linux:** `Ctrl+Shift+X`
- **macOS:** `Cmd+Shift+X`

**Option 2 - Menu:**
- Go to: **View → Extensions**

**Option 3 - Command Palette:**
- Press `Ctrl/Cmd+Shift+P`
- Type: "extensions"
- Select: "zed: extensions"

---

## 🔍 Step 3: Find Your Extension

In the Extensions panel, look for:

```
📦 Log Scout Analyzer
   v0.1.0
   [Installed]
```

**Check these sections:**
- **Installed** tab (should be here)
- **All Extensions** tab
- Search for "log scout" or "analyzer"

---

## 🧪 Step 4: Test the Extension

Even if you don't see it in the panel, test if it works:

1. **Open the test log file:**
   ```bash
   cd log_scout_analyzer
   zed test.log
   ```

2. **What to look for:**
   - Status bar shows: **"Log Files"** as the language mode
   - Error patterns highlighted in **red**
   - Warning patterns highlighted in **yellow**
   - Hover over errors/warnings for details

3. **Check language mode:**
   - Look at the bottom-right corner of Zed
   - Should say "Log Files" or "log"
   - If it says "Plain Text", the extension isn't loaded

---

## 🐛 Debug Mode (If Not Visible)

### Check Developer Console:
1. Press **Ctrl/Cmd+Shift+I** to open Developer Tools
2. Go to **Console** tab
3. Look for:
   - `Extension loaded: log-scout-analyzer`
   - Any errors related to "extension" or "wasm"

### Check Zed Logs:
```bash
# Linux/macOS
tail -f ~/.local/share/zed/logs/Zed.log

# Windows (PowerShell)
Get-Content $env:LOCALAPPDATA\Zed\logs\Zed.log -Tail 20 -Wait
```

### Run Zed with Debug Output:
```bash
# Linux/macOS
RUST_LOG=zed::extension=debug zed

# Windows (PowerShell)
$env:RUST_LOG="zed::extension=debug"; zed
```

---

## 🎯 Expected Behavior

### When Extension is Loaded:

1. **Extensions Panel:**
   - Shows "Log Scout Analyzer v0.1.0"
   - Status: "Installed"

2. **Opening .log Files:**
   - Automatic language detection
   - Syntax highlighting
   - Real-time pattern detection

3. **File Associations:**
   - `.log` files → Log Scout Analyzer
   - `.txt` files → Log Scout Analyzer

4. **Features Active:**
   - 30+ pattern detections
   - Error/Warning highlights
   - Jabber-specific patterns
   - Webex-specific patterns
   - Network issue detection
   - Performance warnings

---

## 🚨 Common Issues

### Issue: Extension Not in Panel
**Solutions:**
1. Did you restart Zed? (Most common cause!)
2. Run: `./verify-extension.sh` to check installation
3. Check Zed version: `zed --version` (need 0.118.0+)
4. Look in Developer Console for errors

### Issue: Extension Loads but Doesn't Work
**Solutions:**
1. Verify config files exist:
   ```bash
   ls ~/.config/zed/extensions/log-scout-analyzer/config/
   ```
2. Check WASM binary size (should be ~1.1MB)
3. Try clean reinstall: `./install-extension.sh`

### Issue: "Permission Denied" Errors
**Solutions:**
```bash
chmod +x ~/.config/zed/extensions/log-scout-analyzer/log_scout_analyzer.wasm
chmod -R 755 ~/.config/zed/extensions/log-scout-analyzer/
```

### Issue: WSL/Windows Path Confusion
**Solution:**
- In WSL, use: `~/.config/zed/extensions/`
- In Windows, use: `%USERPROFILE%\.config\zed\extensions\`
- Your current setup uses WSL paths correctly ✓

---

## ✨ Quick Commands Reference

```bash
# Verify installation
./verify-extension.sh

# Rebuild and reinstall
./install-extension.sh

# Open test file
zed test.log

# Check Zed version
zed --version

# View extension files
ls -la ~/.config/zed/extensions/log-scout-analyzer/

# Watch Zed logs
tail -f ~/.local/share/zed/logs/Zed.log

# Clean reinstall
rm -rf ~/.config/zed/extensions/log-scout-analyzer
./install-extension.sh
```

---

## 📋 Verification Checklist

Before asking "Why can't I see it?", confirm:

- [ ] Zed was **completely restarted** (not just window closed)
- [ ] `verify-extension.sh` shows all checks passed
- [ ] WASM binary exists and is ~1.1MB in size
- [ ] extension.toml has correct ID: "log-scout-analyzer"
- [ ] Zed version is 0.118.0 or higher
- [ ] No errors in Developer Console (Ctrl/Cmd+Shift+I)
- [ ] Tried opening a .log file to test functionality

---

## 🎓 What You Have

Your extension includes:

**Pattern Categories:**
- ✓ Error patterns (exceptions, fatal errors, OOM)
- ✓ Warning patterns (retries, deprecated APIs)
- ✓ Authentication/Security (failed logins, unauthorized access)
- ✓ Jabber-specific (cluster nodes, presence storms, XMPP)
- ✓ Webex-specific (meetings, media servers, recordings)
- ✓ Network issues (DNS, SSL, timeouts)
- ✓ Performance (CPU, memory, disk, threads)

**Files:**
- 3 pattern configuration files (30+ patterns)
- Comprehensive test.log with sample patterns
- Build and installation scripts
- Full documentation

---

## 📞 Still Not Working?

1. **Run diagnostics:**
   ```bash
   ./verify-extension.sh
   ```

2. **Check the troubleshooting guide:**
   - See: `EXTENSION_TROUBLESHOOTING.md`

3. **Manual verification:**
   ```bash
   cat ~/.config/zed/extensions/log-scout-analyzer/extension.toml
   ```

4. **Report an issue:**
   - Include output of `verify-extension.sh`
   - Include Zed version
   - Include any console errors
   - Include screenshot of Extensions panel

---

## 🎉 Success Indicators

You'll know it's working when:

1. ✅ "Log Scout Analyzer" appears in Extensions panel
2. ✅ Opening test.log shows error highlighting
3. ✅ Status bar shows "Log Files" language
4. ✅ Hover tooltips show pattern descriptions
5. ✅ No errors in Developer Console

**Current Status:** Extension is installed correctly and ready to use!
**Next Action:** Restart Zed and press `Ctrl/Cmd+Shift+X`
