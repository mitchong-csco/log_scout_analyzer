# Install Log Scout Analyzer Extension

## Quick Install

### Option 1: Command Line (Recommended)
```bash
code --install-extension log-scout-analyzer.vsix
```

### Option 2: VS Code UI
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Click the ⋯ menu (top right)
4. Select "Install from VSIX..."
5. Choose `log-scout-analyzer.vsix`
6. Click "Install"

## ⚠️ Important: Reload VS Code

After installation, you **MUST** reload VS Code:
- Press `Ctrl+Shift+P`
- Type "Reload Window"
- Press Enter

Or simply close and reopen VS Code.

## Verify Installation

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Scout"
3. You should see commands like:
   - Scout: Analyze Current File
   - Scout: Show Version Info
   - Scout: Show Console

## Quick Test

1. Create a test file: `test.log`
2. Add some content:
   ```
   2024-01-15 10:30:45 INFO Application started
   2024-01-15 10:30:50 ERROR Connection failed
   2024-01-15 10:30:55 WARNING Retrying connection
   ```
3. Press `Ctrl+Shift+P`
4. Run "Scout: Analyze Current File"
5. Check:
   - Problems panel (Ctrl+Shift+M)
   - Scout sidebar (left panel)
   - Status bar (bottom right)

## Features

- **DevTools Interface** - Professional log analysis workbench
- **Pattern Recognition** - 100+ built-in patterns
- **Jabber Logs** - 59 specialized Jabber patterns
- **Real-time Analysis** - Instant diagnostics
- **Tree Views** - Results, Categories, Timeline
- **Console Output** - Detailed analysis logs

## Updating

To install a new build:
1. Uninstall the current version (optional)
2. Install the new `log-scout-analyzer.vsix`
3. **Reload VS Code** (critical!)

## Troubleshooting

### Commands Not Found
- **Solution**: Reload VS Code window

### Extension Not Loading
- Check Extensions panel
- Look for "Log Scout Analyzer - DevTools Edition"
- If missing, reinstall the VSIX

### Old Version Still Active
1. Uninstall old version
2. Close VS Code completely
3. Reopen VS Code
4. Install new VSIX
5. Reload window

## Support

Check these panels if something isn't working:
- **Output** → "Log Scout Analyzer" - Activation logs
- **Problems** → Diagnostic messages
- **Scout Console** → Real-time analysis output

## Current Version

Run this command to check your installed version:
- `Ctrl+Shift+P` → "Scout: Show Version Info"

---

**Ready to analyze logs!** 🚀