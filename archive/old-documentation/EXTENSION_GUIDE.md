# Log Scout Analyzer Extension - Complete Guide

## 🎯 What It Does

Log Scout Analyzer is a professional log file analysis tool for VS Code that:
- **Detects errors, warnings, and patterns** in log files in real-time
- **Displays results in a DevTools-style interface** with multiple views
- **Provides diagnostics** integration with VS Code's Problems panel
- **Supports specialized patterns** for Cisco Jabber and SIP/VoIP logs
- **Runs on a Rust LSP server** for blazing-fast performance

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────┐
│      VS Code (TypeScript Client)     │
│  - Activates on log file open        │
│  - Shows UI components               │
│  - Displays diagnostics              │
└────────────────┬─────────────────────┘
                 │
                 │ LSP (JSON-RPC Protocol)
                 │ stdin/stdout
                 │
┌────────────────▼─────────────────────┐
│    Rust LSP Server                   │
│  - Pattern matching engine           │
│  - Log parsing                       │
│  - Diagnostics generation           │
│  - Timeline extraction               │
└──────────────────────────────────────┘
```

### Key Components

**1. Pattern Engine** (`patternEngine.ts`)
   - Loads pattern files (YAML format)
   - Matches regex patterns against log lines
   - Assigns severity levels (ERROR, WARNING, INFO)
   - Returns matched results with metadata

**2. Diagnostics Provider** (`diagnosticsProvider.ts`)
   - Processes patterns into VS Code diagnostics
   - Integrates with Problems panel
   - Updates on file changes
   - Manages error highlighting

**3. Tree Views** (Results, Categories, Timeline)
   - **Results View**: Shows all issues grouped by severity
   - **Categories View**: Groups issues by component/category
   - **Timeline View**: Shows when issues occurred (15-min intervals)

**4. Scout Console** (`scoutConsole.ts`)
   - Real-time analysis output with timestamps
   - Toggleable location: Output Panel or Terminal
   - Clickable file:line navigation links

**5. Status Bar**
   - At-a-glance statistics (X errors, Y warnings, Z info)
   - Click to open Problems panel

---

## 🚀 How to Start Using It

### Step 1: Install the Extension

```powershell
code --install-extension C:\Users\mitchong\Downloads\vscode-extensions\log-scout-analyzer.vsix
```

Or manually:
1. Open VS Code
2. Extensions (Ctrl+Shift+X)
3. Click "..." menu → "Install from VSIX..."
4. Select the `.vsix` file

### Step 2: Open a Log File

Open any log file with extensions like:
- `.log`
- `.txt`
- `.out`
- `.err`

### Step 3: Click the Scout Icon

Look for the 🔍 telescope icon in the Activity Bar (left sidebar)

### Step 4: Explore Results

The extension automatically shows:
- **Results Panel**: All detected issues
- **Categories Panel**: Issues grouped by component
- **Timeline Panel**: When issues occurred
- **Scout Console**: Real-time analysis output
- **Problems Panel**: VS Code's standard diagnostics

---

## 🎮 Main Commands

Press `Ctrl+Shift+P` and type:

| Command | What It Does |
|---------|-------------|
| `Scout: Analyze File` | Manually analyze the current log file |
| `Scout: Clear Diagnostics` | Remove all highlighted issues |
| `Scout: Show Patterns` | Display loaded pattern configurations |
| `Scout: Show Version Info` | Display build and version information |
| `Scout: Toggle Console Location` | Switch console between Output Panel ↔ Terminal |
| `Scout: Reset View` | Reset all panels to default state |

---

## 📂 Pattern System

Patterns are defined in YAML files in the `config/` folder:

```yaml
- name: "Database Connection Error"
  pattern: 'Failed to connect to (database\|DB)'
  severity: "error"
  category: "Database"
  description: "Database connection attempt failed"
  hint: "Check database credentials and network connectivity"
```

### Supported Categories
- Generic logs
- **Cisco Jabber** (jabber.yaml) - 59 patterns
- **WebEx** (webex.yaml) - For WebEx/Cisco collaboration logs
- Custom patterns (easy to add)

---

## 🎨 UI Components Explained

### Activity Bar Icon
- 🔍 Click to open Scout Analyzer panel
- Shows quick analysis status

### Results View
```
📋 Results
├── ❌ Errors (5)
│   ├── Database connection failed
│   ├── Timeout error
│   └── ...
├── ⚠️ Warnings (12)
│   ├── Slow response detected
│   └── ...
└── ℹ️ Info (8)
```
- Click any item to jump to that line in the editor
- Groups by severity level
- Expandable/collapsible

### Categories View
```
🏷️ Categories
├── Database (8 issues)
├── Network (5 issues)
├── Authentication (3 issues)
└── ...
```
- Groups all issues by their category
- Click to see all issues in that category

### Timeline View
```
📅 Timeline
├── 10:00-10:15 (3 issues)
├── 10:15-10:30 (7 issues)
├── 10:30-10:45 (2 issues)
└── ...
```
- Shows issues by 15-minute intervals
- Chronological analysis of problems

### Scout Console
```
📝 Scout Console
[13:45:23.123] ✅ Analysis started
[13:45:23.456] 🔍 Scanning file: app.log
[13:45:23.789] ✓ 5 errors found
[13:45:23.890] ✓ 12 warnings found
```
- Real-time output with timestamps
- Clickable file:line links (e.g., `file.log:42`)
- Toggle between Output Panel or Terminal

### Status Bar
```
📊 Scout: 5 errors | 12 warnings | 8 info
```
- Click to open Problems panel
- Updates in real-time

---

## ⚙️ Configuration

Press `Ctrl+,` to open Settings, search for "Log Scout":

| Setting | Default | Description |
|---------|---------|-------------|
| `logScoutAnalyzer.enableDiagnostics` | `true` | Enable error/warning highlighting |
| `logScoutAnalyzer.autoAnalyzeOnOpen` | `true` | Auto-analyze when opening log files |
| `logScoutAnalyzer.consoleOutputLocation` | `outputPanel` | Where console shows: `outputPanel` or `terminal` |
| `logScoutAnalyzer.maxFileSize` | `10485760` | Max file size (bytes) - 10MB default |

---

## 💡 Tips & Tricks

### 1. Jump to Errors
Click any result in the Results/Categories/Timeline view to jump directly to that line

### 2. Toggle Console Location
- Press Ctrl+Shift+P → "Scout: Toggle Console Location"
- Switch between Output Panel (cleaner) or Terminal (integrated)

### 3. Filter Results
- Use the tab bar in Results view:
  - **All** - All issues
  - **Errors** - Only errors
  - **Warnings** - Only warnings
  - **Info** - Only info messages

### 4. Search in Results
- Type in the search box to filter by keyword
- Works across severity levels

### 5. Export Results
- Right-click in Results view → Export to file
- Saves as text with all issue details

### 6. Hover for Details
- Hover over any error in the editor
- See detailed information with hints and suggestions

### 7. Use Problems Panel
- Press Ctrl+Shift+M to open VS Code's Problems panel
- Shows all detected issues from Scout Analyzer
- Click to navigate to issue location

---

## 🔧 Development

### Editing Source Code

All source files are in `vscode-extension/src/`:

```
├── extension.ts              ← Main entry point, activates on log file open
├── patternEngine.ts          ← Pattern matching logic
├── diagnosticsProvider.ts    ← Converts patterns to diagnostics
├── scoutConsole.ts           ← Real-time console output
├── resultsTreeProvider.ts    ← Results view implementation
├── categoriesTreeProvider.ts ← Categories view implementation
├── timelineTreeProvider.ts   ← Timeline view implementation
├── sipCallFlowParser.ts      ← SIP/VoIP call flow analysis
└── ...
```

### Rebuilding After Changes

```powershell
cd vscode-extension

# Compile TypeScript
npm run compile

# Or watch for changes
npm run watch

# Reload extension in VS Code: Ctrl+R
```

### Building a New VSIX

```powershell
cd vscode-extension
npm install
npm run package
```

This creates `log-scout-analyzer.vsix` and copies it to:
```
C:\Users\mitchong\Downloads\vscode-extensions\
```

---

## 🐛 Troubleshooting

### Issue: "Extension not activating"
**Solution**: 
- Make sure you're opening a file with `.log`, `.txt`, `.out`, or `.err` extension
- Or use command: Ctrl+Shift+P → "Scout: Analyze File"

### Issue: "LSP server failed to start"
**Solution**:
- Check that `log-scout-lsp-server-win.exe` exists in:
  - `clients/vscode/bin/log-scout-lsp-server-win.exe`
- Or rebuild the LSP server:
  - `.\BUILD_WINDOWS_BINARY.bat` from project root

### Issue: "No patterns loaded"
**Solution**:
- Check `config/patterns.yaml` exists
- Run: Ctrl+Shift+P → "Scout: Show Patterns"
- Verify YAML syntax is correct

### Issue: "Console not showing output"
**Solution**:
- Toggle console location: Ctrl+Shift+P → "Scout: Toggle Console Location"
- Or check Output panel: View → Output → select "Scout Console"

---

## 📚 Next Steps

1. **Use it on real logs** - Open a log file and explore the interface
2. **Customize patterns** - Edit `config/patterns.yaml` to add your own patterns
3. **Check results** - Analyze the Results/Categories/Timeline views
4. **Export findings** - Export results for reporting or documentation

---

## 🔗 Related Files

- **Main Extension**: `vscode-extension/src/extension.ts`
- **Pattern Configuration**: `config/patterns.yaml`
- **LSP Server**: `lsp-server/src/main.rs`
- **Build System**: `vscode-extension/BUILD_AND_PACKAGE.bat`
- **Documentation**: Root README.md + docs/ folder

---

## ❓ Questions?

Check the detailed documentation:
- Main README: `README.md`
- Extension README: `vscode-extension/README.md`
- Architecture Docs: `docs/` folder

