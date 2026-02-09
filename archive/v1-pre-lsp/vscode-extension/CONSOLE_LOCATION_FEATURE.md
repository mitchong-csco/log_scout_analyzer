# Scout Console Location Toggle Feature

## Overview

The Scout Console can now be displayed in **three different locations**, giving you flexibility in how you view analysis output:

1. **Output Panel** (default) - Traditional sidebar output channel
2. **Webview (Modern UI)** - Beautiful visual log viewer with colored bars, badges, and collapsible items
3. **Terminal** - Dedicated terminal window for console-style output

You can easily toggle between these locations at any time!

---

## 🎯 Quick Start

### Using the Sidebar Button

1. Open the **Scout Analyzer** view in the sidebar
2. Look for the **"Toggle Console Location"** button
3. Click it to cycle through modes: **Output Panel → Webview → Terminal → Output Panel**
4. The current location is shown in the button description

### Using the Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Scout: Toggle Console Location`
3. Press Enter to toggle

### Using Settings

1. Open Settings (`Ctrl+,` or `Cmd+,`)
2. Search for: `logScoutAnalyzer.consoleOutputLocation`
3. Choose:
   - **outputPanel** - Show in Output panel (sidebar)
   - **webview** - Show in modern webview panel with visual styling
   - **terminal** - Show in dedicated Terminal

---

## 📍 Output Panel Mode (Default)

**Best for:**
- Side-by-side viewing with code
- Quick reference while editing
- Persistent output that stays visible
- Clickable file:line links (Ctrl+Click)

**Features:**
- Appears in the bottom Output panel
- Select "Scout Console" from the dropdown
- Automatically formatted with colors and icons
- File paths are clickable for navigation
- Stays visible across sessions

**How to access:**
- Click **"Show Console"** in the Analyzer sidebar
- Or use the command: `Scout: Show Console`

---

## 🎨 Webview Mode (Modern UI)

**Best for:**
- Visual log analysis similar to Chrome DevTools
- Color-coded severity indicators (red/yellow/blue bars)
- Badges showing categories, timestamps, and file locations
- Collapsible context for detailed inspection
- Filtering by severity with one click
- Modern, beautiful interface

**Features:**
- Appears in a dedicated webview panel (Column 2)
- **Colored vertical bars** on the left (red for errors, yellow for warnings, blue for info)
- **Badges** for severity, category, file, and timestamp
- **Toolbar** with filter buttons (All, Errors, Warnings, Info)
- **Live statistics** showing error/warning/info counts
- **Collapsible items** - click to expand and see context
- **Clickable file badges** - jump to source location
- **Export** button to save console output
- **Clear** button to reset view

**Visual Example:**
```
┌────────────────────────────────────────────────────────┐
│ [Clear] [Export] │ [All] [Errors] [Warnings] [Info]   │
│                    🔴 15  🟡 23  🔵 8                   │
├────────────────────────────────────────────────────────┤
│ ┃ 2:28:16 PM  ERROR  Network  file.log:123            │
│ ┃ Connection failed to CUCM server                    │
│ ┃ ▶ Show context                                      │
├────────────────────────────────────────────────────────┤
│ ┃ 2:28:17 PM  WARNING  Performance  file.log:456     │
│ ┃ Slow response time detected                         │
└────────────────────────────────────────────────────────┘
```

**How to access:**
- Toggle to Webview mode
- The panel opens automatically in Column 2
- Find it in the editor tabs as "Scout Console"

---

## 💻 Terminal Mode

**Best for:**
- Full-screen console experience
- Developers who prefer terminal workflows
- Real-time streaming output
- More space for long messages

**Features:**
- Dedicated terminal named "Scout Console"
- Console-style output with echo commands
- Automatically opens when toggled
- Integrates with VS Code terminal panel
- Can be moved, split, or maximized

**How to access:**
- Toggle to Terminal mode
- The terminal appears automatically
- Find it in the Terminal panel dropdown

---

## 🎨 Output Formatting

Both modes support the same rich formatting:

### Analysis Headers
```
═══════════════════════════════════════════════════════════
🔍 ANALYSIS STARTED - 2/7/2026, 2:28:16 AM
📄 File: application.log
═══════════════════════════════════════════════════════════
```

### Issue Detection
```
  /path/to/file.log:123:1
  🔴 ERROR [Network] 2:28:16 AM: Connection failed
  
  /path/to/file.log:456:1
  🟡 WARNING [Performance] 2:28:17 AM: Slow response time
  
  /path/to/file.log:789:1
  🔵 INFO [System] 2:28:18 AM: Service started
```

### Summary Statistics
```
📊 SUMMARY
═══════════════════════════════════════════════════════════
  Files Analyzed: 1
  Total Issues: 42
    🔴 Errors: 15 (36%)
    🟡 Warnings: 20 (48%)
    🔵 Info: 7 (17%)
  Categories Found: 5
    Network, Performance, System, Security, Database
═══════════════════════════════════════════════════════════
```

---

## 🔄 Switching Between Modes

### What Happens When You Toggle?

The toggle button cycles through three modes:

1. **Output Panel → Webview:**
   - Webview panel opens automatically in Column 2
   - Beautiful visual interface appears
   - New output goes to webview
   - Notification: "Scout Console now showing in Webview (Modern UI)"

2. **Webview → Terminal:**
   - Terminal window opens automatically
   - Console-style output
   - New output goes to terminal
   - Notification: "Scout Console now showing in Terminal"

3. **Terminal → Output Panel:**
   - Output panel becomes active
   - Traditional output channel
   - New output goes to output panel
   - Notification: "Scout Console now showing in Output Panel"

### Preserving Output

- Previous output is **not** automatically cleared when toggling
- Use **"Scout: Clear Console"** to clear output in either mode
- Each mode maintains its own buffer

---

## ⚙️ Configuration

### Via Settings JSON

Add to your `settings.json`:

```json
{
  "logScoutAnalyzer.consoleOutputLocation": "webview"
}
```

Or use terminal:

```json
{
  "logScoutAnalyzer.consoleOutputLocation": "terminal"
}
```

Or keep the default:

```json
{
  "logScoutAnalyzer.consoleOutputLocation": "outputPanel"
}
```

### Workspace vs User Settings

- **User Settings:** Applies globally to all projects
- **Workspace Settings:** Applies only to current workspace

---

## 🔗 Clickable Links

### Output Panel Mode
- File paths are formatted as: `file.log:123:1`
- **Ctrl+Click** (Windows/Linux) or **Cmd+Click** (Mac) to navigate
- VS Code automatically detects and highlights links
- Jumps directly to the line and column

### Webview Mode
- File badges are clickable
- Click any file badge (e.g., "file.log:123") to navigate
- Jumps directly to the line in the editor
- Visual indication on hover

### Terminal Mode
- Same file:line:column format
- Link detection depends on terminal capabilities
- May work with some terminal extensions

---

## 💡 Pro Tips

1. **Visual analysis workflow:**
   - Use Webview mode
   - Beautiful interface like Chrome DevTools
   - Perfect for detailed issue inspection
   - Filter by severity with one click

2. **Side-by-side workflow:**
   - Use Output Panel mode
   - Split editor vertically
   - Keep console visible while coding
   - Persistent output that stays visible

3. **Full-screen analysis:**
   - Use Terminal mode
   - Maximize terminal panel
   - Great for reviewing large batches of logs
   - Console-style streaming output

4. **Quick switching:**
   - Add keybinding for `logScoutAnalyzer.toggleConsoleLocation`
   - Example: `Ctrl+Alt+T` or `Cmd+Alt+T`
   - Cycle through all three modes quickly

5. **Team consistency:**
   - Set preference in workspace settings
   - Team members get the same experience
   - Good for consistent workflows

---

## 🐛 Troubleshooting

### Webview not appearing?
- Check if panel was closed manually
- Toggle away and back to recreate webview
- Look for "Scout Console" tab in editor area
- Check Column 2 for the panel

### Terminal output not showing?
- Check if terminal was closed manually
- Toggle away and back to recreate terminal
- Look for "Scout Console" in terminal dropdown

### Links not clickable?
- **Webview mode:** File badges are always clickable
- **Output Panel mode:** Use Ctrl+Click on file paths
- **Terminal mode:** Limited link support, use Results sidebar
- Switch to Webview for best clickable experience

### Output appearing in wrong location?
- Check your settings: `logScoutAnalyzer.consoleOutputLocation`
- Try toggling manually to force update
- Reload VS Code if settings aren't taking effect

### Want to clear both outputs?
- Toggle to Output Panel, run "Clear Console"
- Toggle to Terminal, run "Clear Console"
- Or manually clear each separately

---

## 📋 Commands Reference

| Command | Description |
|---------|-------------|
| `Scout: Show Console` | Open console in current location |
| `Scout: Toggle Console Location` | Switch between Output Panel and Terminal |
| `Scout: Clear Console` | Clear output in current location |

---

## 🎯 Use Cases

### Scenario 1: Visual Issue Inspection
**Recommended:** Webview (Modern UI)
- Beautiful visual interface
- Color-coded severity bars (red/yellow/blue)
- Filter by severity with one click
- Collapsible context for detailed analysis
- Perfect for understanding complex issues

### Scenario 2: Quick File Analysis
**Recommended:** Output Panel
- Keep console visible in bottom panel
- Click links to jump to issues
- Don't lose focus from code
- Traditional, familiar interface

### Scenario 3: Batch Processing
**Recommended:** Terminal
- Full-screen terminal view
- Stream output in real-time
- Easier to scroll through large volumes
- Console-style experience

### Scenario 4: CI/CD Integration
**Recommended:** Output Panel
- Better formatting for structured output
- Easier to copy/paste formatted results
- Links work for sharing with team

### Scenario 5: Team Demos & Presentations
**Recommended:** Webview (Modern UI)
- Professional, modern appearance
- Visually impressive for stakeholders
- Easy to understand at a glance
- Color-coding helps convey severity

### Scenario 6: Live Monitoring
**Recommended:** Terminal
- Console-style streaming
- Feels more like a monitoring tool
- Can combine with other terminal commands

---

## 🚀 Future Enhancements

Potential future features:
- **Split-pane mode** - Show multiple views simultaneously
- **Custom webview themes** - Dark/light/custom color schemes
- **Auto-export** - Save console to file automatically
- **Configurable link formats** - Custom file path templates
- **Terminal color customization** - Theme the terminal output
- **Search in webview** - Find text across all console messages
- **Time-range filtering** - Filter by timestamp in webview
- **Category badges customization** - Custom colors and icons

---

## 📝 Feedback

Have suggestions for improving the console experience?
- Open an issue on GitHub
- Share your preferred workflow (Webview? Terminal? Output Panel?)
- Request new output locations or visual enhancements
- Suggest improvements to the webview UI

---

## Version History

- **v0.0.3** - Console location toggle with three modes
  - Added Output Panel mode (default)
  - Added **Webview mode** with modern UI and visual styling
  - Added Terminal mode
  - Added toggle command and UI button (cycles through all 3 modes)
  - Added configuration setting
  - Webview features: colored bars, badges, filters, collapsible context

---

**Happy Analyzing! 🔍**