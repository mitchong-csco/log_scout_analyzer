# 🚀 TagScout UI - Quick Start

## Get Started in 5 Minutes

### Step 1: Open VS Code

Open the Log Scout Analyzer project in VS Code:

```bash
cd /home/mitchong/code/log_scout_analyzer/clients/vscode
code .
```

### Step 2: Launch Extension Development Host

Press **F5** (or Run → Start Debugging)

This opens a new VS Code window with the extension loaded.

### Step 3: Find TagScout Analyzer

Look for the **TagScout Analyzer** icon in the Activity Bar (left sidebar).

It looks like: 🔍 (magnifying glass with tag icon)

Click it to open the TagScout panel.

### Step 4: Select a Log File

In the TagScout panel, you'll see:

```
📁 File Selection
No file selected
[Choose File...]
```

Click on **"No file selected"** or **"Choose File"** and select:
- A `.log` file
- A `.txt` file  
- A `.zip` archive containing logs

**Example file from project:**
```
/home/mitchong/code/log_scout_analyzer/examples/
Jabber-Win-14.3.0.308392-20251210_173411-Windows_10_Enterprise/jabber.log.1
```

### Step 5: Analyze

Once a file is selected, click:

```
▶ Analyze Now
```

You'll see progress:
- Extracting files...
- Detecting product...
- Loading patterns...
- Analyzing logs...

### Step 6: View Results

After a few seconds, a results panel opens showing:

📊 **Statistics**
- Total matches
- Errors (🔴)
- Warnings (🟡)
- Info (🔵)

📱 **Client Information**
- Product detected (e.g., "Jabber for Windows")
- Version number
- User/device info

⏱️ **Timeline**
- Chronological list of matched patterns
- Color-coded by severity
- Expandable details

### Step 7: Filter & Search

Use the filter buttons:
- **[All]** - Show everything
- **[🔴 Errors]** - Show only errors
- **[🟡 Warnings]** - Show only warnings
- **[🔵 Info]** - Show only info

Or type in the search box to find specific patterns.

---

## That's It!

You now have TagScout UI running and analyzing logs.

### What to Try Next

1. **Re-analyze** - Click "Analyze Now" again to refresh results
2. **Change file** - Click the file name to select a different file
3. **Right-click in Explorer** - Right-click any .zip/.log file → "Analyze with TagScout"
4. **Expand cards** - Click "▶ Show Details" on any match to see raw log line

### Common Test Scenarios

**Test with Jabber logs:**
```
log_scout_analyzer/examples/Jabber-Win-14.3.0.308392-*/jabber.log.*
```

**Test with ZIP archive:**
Create a ZIP of multiple log files and upload it.

**Test persistence:**
1. Select a file and analyze
2. Close VS Code
3. Reopen VS Code and press F5
4. The file should still be selected!

---

## Troubleshooting

**"No file selected" error**
→ Make sure you clicked "Choose File" and selected a file before clicking "Analyze Now"

**TagScout icon not visible**
→ Press F5 again or reload the Extension Development Host window (Ctrl+R)

**Analysis takes too long**
→ Normal for large files (>100 MB). Wait or click cancel button.

**Results panel doesn't open**
→ Check the sidebar - click "👁️ View Results" to reopen

---

## Need More Help?

📖 Read the full guide: `TAGSCOUT_UI_GUIDE.md`
🔧 Build details: `TAGSCOUT_BUILD_COMPLETE.md`

---

**Happy Analyzing!** 🎉