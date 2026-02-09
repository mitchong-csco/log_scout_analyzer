# Scout Analyzer Panel

## Overview

The Scout Analyzer Panel is an interactive panel that provides quick access to log analysis features. It automatically opens when you open a log file and provides buttons to analyze individual files or entire directories.

---

## Features

### 🎯 Quick Actions
- **Analyze Current File** - Scan the currently open log file
- **Clear Results** - Remove all diagnostics and results

### 📁 Batch Analysis
- **Analyze Directory** - Scan all `.log` files in the current directory
- **Analyze All Below (Recursive)** - Scan all `.log` files in the current directory and all subdirectories

---

## How to Open

### Automatic Opening
By default, the Scout Analyzer Panel opens automatically when you open a log file.

**To disable auto-open:**
1. Open Settings (Ctrl+,)
2. Search for: `Log Scout Analyzer`
3. Uncheck: `Auto Open Analyzer Panel`

### Manual Opening
- **Command Palette:** Press `Ctrl+Shift+P` → Type: `Scout: Open Analyzer Panel`
- **Command:** `logScoutAnalyzer.openAnalyzerPanel`

---

## Panel Layout

The panel can be positioned:
- **Side by side** with your editor (default - opens in Column 2)
- **Move it anywhere** by dragging the panel tab

---

## Usage Examples

### Example 1: Analyze Single File
1. Open a log file (e.g., `app.log`)
2. Scout Analyzer Panel opens automatically
3. Click **"Analyze Current File"** button
4. Results appear in:
   - Problems panel (Ctrl+Shift+M)
   - Scout sidebar (left panel)
   - Status bar (bottom right)

### Example 2: Analyze Directory
You have this structure:
```
logs/
├── app.log
├── error.log
└── debug.log
```

1. Open any file in the `logs/` directory
2. Click **"Analyze Directory"** button
3. All 3 files will be analyzed
4. Progress shown in panel: "Analyzing... 1/3", "2/3", "3/3"

### Example 3: Analyze Recursively
You have this structure:
```
logs/
├── app.log
├── 2024/
│   ├── jan.log
│   └── feb.log
└── 2025/
    └── jan.log
```

1. Open any file in the `logs/` directory
2. Click **"Analyze All Below (Recursive)"** button
4. All 4 files will be analyzed (including subdirectories)
5. Progress shown: "Analyzing... 1/4", "2/4", etc.

---

## Panel Information Display

The panel shows:
- **Current File:** Name of the active file
- **Directory:** Full path to the current directory

This helps you understand which files will be analyzed when using batch operations.

---

## Results

After analysis, results appear in multiple locations:

### 1. Problems Panel (Ctrl+Shift+M)
- All errors, warnings, and info messages
- Click any issue to jump to that line
- Grouped by file

### 2. Scout Sidebar
Three tree views:
- **Results** - All findings hierarchically organized
- **Categories** - Grouped by issue type
- **Timeline** - Distributed by timestamp

### 3. Status Bar
- Issue counts: 🔴 Errors 🟡 Warnings 🔵 Info
- Click to analyze current file

### 4. Scout Console
- Detailed analysis logs
- Real-time progress
- Build and version info

---

## Settings

Configure the panel behavior in VS Code settings:

### Auto-Open Panel
```json
"logScoutAnalyzer.autoOpenAnalyzerPanel": true
```
- `true` - Panel opens automatically when you open a log file (default)
- `false` - You must manually open the panel

### Show Results Panel
```json
"logScoutAnalyzer.showResultsPanel": true
```
- Controls whether the detailed results webview panel opens after analysis

---

## Button States

### During Analysis
- All buttons are **disabled**
- Status shows: "Analyzing..." with spinner
- Cannot start new analysis until current one completes

### After Analysis
- All buttons are **enabled**
- Status shows: "Analyzed X files" (disappears after 3 seconds)
- Ready for next analysis

### On Error
- All buttons are **enabled**
- Error message displayed in red
- You can retry the operation

---

## Tips & Tricks

### 1. Keep Panel Open
The panel retains its context even when hidden. It will remember the last directory and file you were working with.

### 2. Batch Analysis Best Practices
- Use **"Analyze Directory"** for focused analysis of a single folder
- Use **"Analyze All Below"** when you need comprehensive coverage
- Large directories may take longer - watch the progress counter

### 3. Clear Results Before New Analysis
Click **"Clear Results"** to remove previous findings before starting a new analysis. This helps avoid confusion when comparing results.

### 4. Keyboard Shortcuts
While in a log file:
- `Ctrl+Shift+P` → `Scout: Analyze Current File` - Quick analyze
- `Ctrl+Shift+M` - Open Problems panel to view results

### 5. Multi-File Workflow
1. Click "Analyze All Below" to scan all log files
2. Open Problems panel (Ctrl+Shift+M)
3. Navigate through issues across all files
4. Click any issue to jump to that file and line

---

## Supported File Types

The analyzer looks for these file extensions:
- `.log` - Standard log files
- `.txt` - Text files
- `.out` - Output files

Files with these extensions will be included in batch analysis.

---

## Performance Notes

### Analysis Speed
- **Single file:** Near-instant (<1 second)
- **Directory (10 files):** ~2-5 seconds
- **Recursive (100 files):** ~10-30 seconds

### Large Directories
For directories with many subdirectories and files:
- Consider analyzing specific subdirectories instead of using "Analyze All Below"
- Watch the status counter to track progress
- Results are processed in real-time as files are analyzed

---

## Troubleshooting

### Panel Doesn't Open
**Problem:** Panel doesn't open when I open a log file

**Solutions:**
1. Check setting: `logScoutAnalyzer.autoOpenAnalyzerPanel` is `true`
2. Manually open: `Ctrl+Shift+P` → `Scout: Open Analyzer Panel`
3. Reload VS Code window

### No Results Appear
**Problem:** Clicked analyze but no results show

**Solutions:**
1. Check Problems panel (Ctrl+Shift+M)
2. Check Scout sidebar (left activity bar)
3. Verify file has recognizable patterns (errors, warnings)
4. Check Output panel → "Log Scout Analyzer" for errors

### Button Stuck Disabled
**Problem:** Buttons remain disabled after analysis

**Solutions:**
1. Close and reopen the panel
2. Reload VS Code window
3. Check for errors in Developer Tools (Help → Toggle Developer Tools)

### "No active file" Error
**Problem:** Error message when trying to analyze

**Solutions:**
1. Make sure you have a file open in the editor
2. Ensure the file is saved to disk
3. Click in the editor window to make it active

---

## Integration with Other Features

### Works With:
- ✅ **Problems Panel** - All diagnostics appear here
- ✅ **Scout Sidebar** - Tree views update in real-time
- ✅ **Scout Console** - Detailed logs of analysis
- ✅ **Status Bar** - Quick issue counts
- ✅ **Command Palette** - All commands accessible

### Complements:
- **Pattern Recognition** - Uses all configured patterns
- **Jabber Log Support** - Automatically detects Jabber patterns
- **Multi-line Analysis** - Handles stack traces and exceptions
- **Timeline Analysis** - Extracts timestamps for temporal view

---

## Example Workflow

**Scenario:** Troubleshooting application errors across multiple log files

1. **Open log directory in VS Code**
   - File → Open Folder → Select `logs/`

2. **Open any log file**
   - Scout Analyzer Panel opens automatically

3. **Scan all logs**
   - Click "Analyze All Below (Recursive)"
   - Wait for "Analyzed X files recursively" message

4. **Review results**
   - Press `Ctrl+Shift+M` to open Problems panel
   - See all errors/warnings from all files
   - Click any issue to jump to that file/line

5. **Export findings**
   - Scout sidebar → Click export button
   - Save results for reporting

6. **Clean up**
   - Click "Clear Results" in panel
   - Ready for next analysis

---

## Keyboard Shortcuts Reference

| Action                        | Shortcut              |
|-------------------------------|----------------------|
| Open Command Palette          | `Ctrl+Shift+P`       |
| Open Problems Panel           | `Ctrl+Shift+M`       |
| Open Scout Analyzer Panel     | Command: Scout: Open Analyzer Panel |
| Analyze Current File          | Command: Scout: Analyze Current File |
| Clear Results                 | Command: Scout: Clear Diagnostics |

---

## FAQ

**Q: Can I analyze files outside the current directory?**  
A: Currently, batch analysis is limited to the current directory and subdirectories. You can manually open files from other locations and analyze them individually.

**Q: Does analysis modify my log files?**  
A: No, analysis is read-only. Your files are never modified.

**Q: How many files can I analyze at once?**  
A: There's no hard limit, but very large directories (>500 files) may take several minutes. Consider analyzing subdirectories separately.

**Q: Can I customize which patterns are detected?**  
A: Yes! Go to Settings → Log Scout Analyzer → Patterns. You can add custom regex patterns for errors, warnings, and info messages.

**Q: Will this work with non-English log files?**  
A: Pattern matching is based on regex, so it depends on your configured patterns. The default patterns work best with English logs but can be customized.

---

## Version

**Current Version:** 0.0.2+  
**Feature Added:** February 2026  
**Status:** ✅ Stable

---

**Ready to analyze!** Open a log file and the Scout Analyzer Panel will guide you through the rest. 🚀