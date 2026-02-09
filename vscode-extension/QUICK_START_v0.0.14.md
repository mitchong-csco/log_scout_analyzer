# Log Scout Analyzer v0.0.14 - Quick Start Guide

**Installation Ready** ✅ | **All Features Active** 🚀 | **Production Ready** 💎

---

## 📦 Installation (2 Minutes)

### Windows Installation
```powershell
# Navigate to Downloads folder
cd C:\Users\mitchong\Downloads\vscode-extensions

# Install the extension
code --install-extension log-scout-analyzer.vsix --force

# Restart VS Code
```

### Verify Installation
1. Open VS Code
2. Look for the **🔭 Telescope icon** in the left Activity Bar
3. Press `Ctrl+Shift+P` and type "Scout: Show Version Info"
4. You should see version **0.0.14**

---

## 🎯 Quick Start (30 Seconds)

### Step 1: Open a Log File
- Open any `.log`, `.txt`, `.out`, or `.err` file
- The extension activates automatically

### Step 2: Click the Telescope Icon
- Look in the **left Activity Bar** (sidebar)
- Click the **🔭 telescope icon**
- You'll see four panels:
  - **Results** - All detected issues
  - **Categories** - Grouped by component
  - **Timeline** - Grouped by time
  - **Analyzer** - Quick actions

### Step 3: Run Analysis
**Option A: Automatic** (if enabled in settings)
- Analysis runs automatically when you open a log file

**Option B: Manual**
- Click **"Analyze Current File"** in the Analyzer panel
- Or press `Ctrl+Shift+P` → type "Scout: Analyze"

### Step 4: Explore Results
- Click any issue in the tree views to jump to that line
- Look for **colored circles** in the gutter (🔴🟡🔵🟣)
- Hover over gutter icons for detailed tooltips
- Check the **status bar** for issue counts

---

## 🎨 Key Features

### 1. Gutter Annotations
**Visual indicators right in your editor:**
- 🔴 **Red** - Errors
- 🟡 **Yellow** - Warnings
- 🔵 **Blue** - Info
- 🟣 **Purple** - Debug

**To use:**
- Run analysis on a log file
- Look for colored circles in the left gutter
- Hover over them for rich tooltips showing:
  - Severity and category
  - Full message
  - Matched text with context
  - Timestamp (if detected)

### 2. Line Highlighting
**Click to navigate with visual feedback:**
- Click any result in Results/Categories/Timeline views
- The corresponding line highlights temporarily (2 seconds default)
- Configurable duration: 500-10000ms

**To configure:**
```json
{
  "logScoutAnalyzer.highlightDuration": 3000
}
```

### 3. Split View with Sync
**Side-by-side comparison of original and annotated logs:**

**To open Split View:**
1. Run analysis on a log file
2. Press `Ctrl+Shift+P`
3. Type "Scout: Open Split View"
4. Original log appears on left, annotated on right

**Four Sync Features (all configurable):**
- **Cursor Sync** - Move cursor in one, it moves in the other
- **Scroll Sync** - Scroll one, the other follows
- **Selection Sync** - Select text in one, mirrors in the other
- **Highlight Sync** - Hover over a line to see it highlighted in both

**To configure:**
```json
{
  "logScoutAnalyzer.splitView.enabled": true,
  "logScoutAnalyzer.splitView.cursorSync": true,
  "logScoutAnalyzer.splitView.scrollSync": true,
  "logScoutAnalyzer.splitView.selectionSync": true,
  "logScoutAnalyzer.splitView.highlightSync": true
}
```

### 4. Four Tree Views
**Multiple perspectives on your log data:**

**Results View**
- All issues grouped by severity
- Filter: All / Errors / Warnings / Info
- Group by: Severity / Category / File

**Categories View**
- Issues grouped by component
- Example: "Authentication", "Database", "Network"
- Click a category to see only those issues

**Timeline View**
- Issues grouped by 15-minute intervals
- Track when problems occurred
- Identify patterns over time

**Analyzer View**
- Quick action buttons:
  - Analyze Current File
  - Analyze Directory
  - Analyze Recursively
  - Clear Results
  - Export Results
  - Show Console
  - Show Patterns
  - About/Version

---

## ⚡ Essential Commands

### Analysis Commands
| Command | Shortcut | Description |
|---------|----------|-------------|
| Scout: Analyze Current File | `Ctrl+Shift+P` → "Scout: Analyze" | Analyze active log file |
| Scout: Analyze Directory | Command Palette | Analyze all logs in folder |
| Scout: Analyze Recursively | Command Palette | Analyze logs in folder tree |
| Scout: Clear Diagnostics | Command Palette | Clear all analysis results |

### View Commands
| Command | Description |
|---------|-------------|
| Scout: Refresh Results | Refresh all tree views |
| Scout: Group by Severity | Group results by error/warning/info |
| Scout: Group by Category | Group results by component |
| Scout: Group by File | Group results by source file |

### Split View Commands
| Command | Description |
|---------|-------------|
| Scout: Open Split View | Open annotated side-by-side view |
| Scout: Close Split View | Close split view |

### Utility Commands
| Command | Description |
|---------|-------------|
| Scout: Show Configured Patterns | View pattern configuration |
| Scout: Show Version Info | Display version and build info |
| Scout: Export Results | Export analysis to text file |
| Scout: Show Console | Open Scout Console output |
| Scout: Toggle Console Location | Switch between Output Panel/Terminal |

---

## 🔧 Essential Settings

### Quick Configuration
Open VS Code Settings (`Ctrl+,`) and search for "Log Scout"

### Recommended Settings
```json
{
  // Core features
  "logScoutAnalyzer.enableDiagnostics": true,
  "logScoutAnalyzer.autoPromptOnOpen": true,
  "logScoutAnalyzer.showStatusBarButton": true,
  
  // UI preferences
  "logScoutAnalyzer.consoleOutputLocation": "outputPanel",
  "logScoutAnalyzer.useEnhancedTreeView": true,
  "logScoutAnalyzer.highlightDuration": 2000,
  
  // Split view (enable if desired)
  "logScoutAnalyzer.splitView.enabled": false,
  "logScoutAnalyzer.splitView.cursorSync": true,
  "logScoutAnalyzer.splitView.scrollSync": true,
  
  // Performance
  "logScoutAnalyzer.maxFileSize": 10485760,
  "logScoutAnalyzer.contextLines": 3
}
```

---

## 🎓 Common Workflows

### Workflow 1: Quick Error Check
```
1. Open log file
2. Click 🔭 telescope icon
3. Look at Results view → Errors folder
4. Click an error to jump to it
5. Hover over 🔴 gutter icon for details
```

### Workflow 2: Component Analysis
```
1. Open log file
2. Run analysis
3. Switch to Categories view
4. Find component (e.g., "Database")
5. Click to see all issues in that component
6. Export results if needed
```

### Workflow 3: Time-Based Investigation
```
1. Open log file
2. Run analysis
3. Switch to Timeline view
4. Identify time periods with high issue counts
5. Click a time slot to see issues
6. Investigate patterns
```

### Workflow 4: Batch Analysis
```
1. Open any file in a directory
2. Click Analyzer panel
3. Click "Analyze Recursively"
4. Watch progress in Scout Console
5. Results appear for all log files
6. Navigate between files via tree views
```

### Workflow 5: Split View Comparison
```
1. Open log file with many issues
2. Run analysis
3. Open Split View
4. Original on left, annotated on right
5. Use sync features to navigate both
6. Annotations include badges (ERROR, WARNING, etc.)
```

---

## 💡 Pro Tips

### Tip 1: Keyboard Navigation
- Use **arrow keys** to navigate tree views
- Press **Enter** to jump to selected issue
- Press **Escape** to return focus to editor

### Tip 2: Status Bar Shortcuts
- Click status bar item to toggle Scout Analyzer panel
- Shows real-time counts: "🔴 5 🟡 12 🔵 8"

### Tip 3: Console Links
- Console output includes clickable file paths
- Format: `/path/to/file.log:123:1`
- `Ctrl+Click` to navigate instantly

### Tip 4: Export for Sharing
- Use "Export Results" to create text report
- Includes all issues with categories and timestamps
- Perfect for sharing with team or documentation

### Tip 5: Custom Patterns
- Add your own patterns in settings
- Supports full regex syntax
- Configure per severity level

---

## 🐛 Troubleshooting

### Extension Not Appearing?
1. Restart VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Check Extensions panel: Extension is enabled
3. Look for 🔭 icon in Activity Bar (leftmost sidebar)

### No Results Displayed?
1. Ensure analysis ran: Check Scout Console for output
2. Verify file extension: Must be `.log`, `.txt`, `.out`, or `.err`
3. Check file size: Default max is 10MB
4. Try manual analysis: `Ctrl+Shift+P` → "Scout: Analyze Current File"

### Gutter Icons Not Showing?
1. Ensure analysis completed successfully
2. Check if diagnostics are enabled in settings
3. Look in Problems panel (should see issues there too)
4. Try running analysis again

### Split View Not Syncing?
1. Check sync settings are enabled
2. Verify you're using the annotated split view (right side)
3. Try closing and reopening split view
4. Restart VS Code if issues persist

### Performance Issues?
1. Reduce `maxFileSize` if analyzing large files
2. Decrease `contextLines` to speed up analysis
3. Disable unused sync features in split view
4. Close split view when not needed

---

## 📚 Additional Resources

### Documentation Files
- `README.md` - Full feature overview
- `FEATURE_VERIFICATION_v0.0.14.md` - Complete feature list
- `CONSOLE_LOCATION_FEATURE.md` - Console configuration guide
- `BUILD_SYSTEM.md` - Build and development info

### Pattern Configuration
- See `logScoutAnalyzer.patterns.*` settings
- Supports error, warning, info, and debug patterns
- Regex-based with full syntax support

### Getting Help
- Check documentation files in extension folder
- Use "Scout: Show Version Info" to verify installation
- Review Scout Console for error messages

---

## 🎉 You're Ready!

You now have everything you need to:
- ✅ Analyze log files professionally
- ✅ Navigate issues with visual feedback
- ✅ Use split view with synchronization
- ✅ Leverage gutter annotations and tooltips
- ✅ Work efficiently with multiple view modes

**Start analyzing logs like a pro!** 🔍📊🚀

---

**Version:** 0.0.14  
**Build Date:** February 8, 2026  
**Package Size:** 139.5 KB  
**Status:** Production Ready ✅

*Happy Log Hunting!*