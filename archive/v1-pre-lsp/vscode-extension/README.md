# Log Scout Analyzer - DevTools Edition 🔍

**Professional log analysis workbench for Visual Studio Code**

Transform your log file analysis with a powerful DevTools-style interface featuring real-time diagnostics, intelligent pattern recognition, and native VS Code integration.

---

## ✨ Key Features

### 🎯 DevTools-Style Interface
- **Activity Bar Icon** - Quick access to analysis tools
- **Three Tree Views** - Results, Categories, and Timeline
- **Scout Console** - Real-time streaming output with timestamps (Output Panel or Terminal)
- **Flexible Console Location** - Choose between sidebar Output Panel or dedicated Terminal
- **Status Bar Integration** - At-a-glance issue statistics

### 🌳 Native VS Code Integration
- **Results View** - Hierarchical display with grouping options
- **Categories View** - Component-based issue isolation
- **Timeline View** - Chronological analysis (15-min intervals)
- **Problems Panel** - Standard VS Code diagnostics integration

### 🎨 Advanced Analysis
- Pattern recognition for errors, warnings, and info messages
- Real-time diagnostics as you view log files
- Click-to-navigate functionality
- Rich tooltips with code previews
- Keyboard-friendly navigation

### 📊 Powerful Filtering
- Tab-based filtering (All, Errors, Warnings, Info)
- Keyword search across results
- Category filtering by component
- DateTime range filtering
- Combined multi-filter support

### 🚀 Professional Features
- Export results to text files
- Multiple grouping options (Severity, Category, File)
- Auto-analysis on file open (configurable)
- Configurable pattern matching
- Support for large log files (up to 10MB default)

---

## 📦 Version Information

**Current Version:** 0.2.0  
**Build Date:** February 2026  
**Compatibility:** VS Code 1.75.0+

### What's New in 0.2.0
- ✅ DevTools-style hybrid interface
- ✅ Enhanced Jabber log support (59 patterns)
- ✅ Three specialized tree views
- ✅ Real-time Scout Console
- ✅ **Console Location Toggle** - Switch between Output Panel and Terminal
- ✅ Timeline-based analysis
- ✅ Advanced filtering capabilities
- ✅ Export functionality

### View Version Info
Press `Ctrl+Shift+P` and type: **Scout: Show Version Info**

---

## 🚀 Quick Start

### 1. Open a Log File
Open any log, txt, out, or err file

### 2. Click the Scout Icon
Look for the 🔍 icon in the Activity Bar (left sidebar)

### 3. Run Analysis
- **Automatic**: Opens automatically when you open a log file (if enabled)
- **Manual**: Press Ctrl+Shift+P then type Scout: Analyze Current File

### 4. Explore Results
- **Results View**: See all issues grouped by severity
- **Categories View**: Group by component/category
- **Timeline View**: See when issues occurred
- **Scout Console**: Real-time analysis output

---

## 🎯 Supported Log Types

### Default Support
- Generic application logs
- Error logs
- System logs
- Debug output

### Specialized Support
- **Cisco Jabber** logs (jabber.log, jabber_ui.log)
  - 20 error patterns
  - 21 warning patterns
  - 18 info patterns
  - Full CUCM, SIP, network, and authentication coverage

### Add Your Own
Easily configure custom patterns for any log format via settings!

---

## 📋 Available Commands

Access via Command Palette (Ctrl+Shift+P):

- **Scout: Analyze Current File** - Analyze the active log file
- **Scout: Clear Diagnostics** - Clear all analysis results
- **Scout: Show Configured Patterns** - View current pattern configuration
- **Scout: Show Version Info** - Display extension version and build info
- **Scout: Refresh Results** - Refresh tree view data
- **Scout: Show Console** - Open Scout Console panel
- **Scout: Toggle Console Location** - Switch between Output Panel and Terminal
- **Scout: Clear Console** - Clear console output
- **Scout: Group by Severity** - Group results by error/warning/info
- **Scout: Group by Category** - Group results by component
- **Scout: Group by File** - Group results by source file
- **Scout: Export Results** - Export to text file

---

## ⚙️ Configuration

Access settings via: File > Preferences > Settings (search for "Log Scout")

### Key Settings

- **Enable Diagnostics**: Turn analysis on/off
- **Console Output Location**: Choose Output Panel (default) or Terminal
- **Show Status Bar Button**: Display Scout button in status bar
- **Show Results Panel**: Open webview panel after analysis
- **Auto Prompt On Open**: Prompt to analyze when opening log files
- **Max File Size**: Maximum file size to analyze (default 10MB)
- **Pattern Configuration**: Customize error, warning, and info patterns

### Example Configuration

```json
{
  "logScoutAnalyzer.enableDiagnostics": true,
  "logScoutAnalyzer.consoleOutputLocation": "outputPanel",
  "logScoutAnalyzer.showStatusBarButton": true,
  "logScoutAnalyzer.showResultsPanel": true,
  "logScoutAnalyzer.autoPromptOnOpen": true,
  "logScoutAnalyzer.maxFileSize": 10485760
}
```

For Jabber log patterns, see the included **JABBER_LOG_PATTERNS.md** documentation.

---

## 🎨 Interface Overview

The extension provides a complete DevTools-style workspace:

**Activity Bar** - Click the 🔍 icon to access Scout Analyzer

**Three Tree Views:**
- Results: Hierarchical view grouped by severity
- Categories: Component-based grouping
- Timeline: Time-based analysis

**Scout Console** - Real-time output in Output Panel or Terminal (your choice!)

**Status Bar** - Quick stats display (errors, warnings, info counts)

**Problems Panel** - Standard VS Code diagnostics integration

---

## 💡 Tips & Tricks

### Console Flexibility
- Click **"Toggle Console Location"** in Analyzer sidebar to switch modes
- Use **Output Panel** for clickable links and persistent display
- Use **Terminal** for full-screen console experience
- Configure default location in settings: `logScoutAnalyzer.consoleOutputLocation`

### Multiple Perspectives
- Use **Results View** for severity-based analysis
- Use **Categories View** to isolate components
- Use **Timeline View** to track issue progression

### Quick Navigation
- Click any item in tree views to jump to that line
- Use arrow keys for keyboard navigation
- Press Enter to jump to selected issue

### Efficient Filtering
- Use webview panel for advanced filtering
- Combine keyword + category + datetime filters
- Export filtered results for sharing

### Jabber Log Analysis
Pre-configured patterns detect:
- Network connectivity issues
- CUCM registration problems
- Authentication failures
- Call quality degradation
- SIP protocol errors

---

## 🆘 Troubleshooting

### Extension Not Showing?
1. Reload VS Code: Ctrl+Shift+P → Developer: Reload Window
2. Check Extensions panel: Extension is enabled
3. Look for 🔍 icon in Activity Bar

### No Results Displayed?
1. Run analysis: Ctrl+Shift+P → Scout: Analyze Current File
2. Check Scout Console for output
3. Verify file extension is recognized
4. Check pattern configuration in settings

### Tree Views Empty?
1. Click 🔍 icon in Activity Bar
2. Ensure analysis has completed
3. Check Scout Console for errors
4. Try manual analysis command

---

## 📚 Documentation

Additional documentation files included:
- **CONSOLE_LOCATION_FEATURE.md** - Console location toggle guide
- **JABBER_LOG_PATTERNS.md** - Comprehensive Jabber pattern reference
- **JABBER_QUICK_SETUP.md** - Quick setup guide for Jabber logs
- **jabber-patterns-settings.json** - Ready-to-use settings file

---

## 🔧 Requirements

- Visual Studio Code 1.75.0 or higher
- No additional dependencies required

---

## 🎯 Use Cases

### Development
- Debug application logs
- Track error patterns
- Monitor performance issues

### Operations
- Analyze server logs
- Troubleshoot system issues
- Track incidents over time

### Support
- Analyze customer logs (Jabber, CUCM, etc.)
- Quick issue identification
- Generate analysis reports

---

## 📈 What Makes This Professional?

✅ **Native VS Code Integration** - Feels like built-in tooling  
✅ **Multiple View Modes** - Analyze from different perspectives  
✅ **Real-Time Console** - See analysis as it happens  
✅ **Export Capabilities** - Share findings with teams  
✅ **Keyboard Navigation** - Fully accessible interface  
✅ **Rich Tooltips** - Context without leaving the tree  
✅ **Configurable Patterns** - Adapt to any log format  
✅ **Professional UI** - Clean, intuitive interface  

---

## 🎉 Get Started Now!

1. Press Ctrl+Shift+P
2. Type: Scout: Show Version Info
3. Open a log file
4. Click the 🔍 icon
5. Start analyzing!

**Happy Log Hunting!** 🔍📊🚀

---

*Log Scout Analyzer - Making log analysis professional, fast, and enjoyable.*

**Version:** 0.2.0  
**Build:** February 2026  
**License:** MIT