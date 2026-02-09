# TagScout UI - User Guide

## Overview

The **TagScout UI** extension is integrated into Log Scout Analyzer, providing a batch analysis interface for log files and archives. It uses the TagScout pattern library to analyze logs and present results in a timeline view.

## Features

✅ **Upload & Analyze** - Select log files or archives (.zip, .7z, .tar.gz)  
✅ **Auto-Detection** - Automatically detects product (Jabber, CUCM, Webex, etc.)  
✅ **Pattern Matching** - Applies patterns from TagScout library  
✅ **Timeline View** - Chronological display of matched patterns  
✅ **Client Information** - Extracts product version, user, device info  
✅ **Filtering** - Filter by severity, category, and search  
✅ **Persistent Selection** - Selected file persists between VS Code sessions  

---

## Getting Started

### 1. Open TagScout Analyzer Panel

Look for the **TagScout Analyzer** icon in the VS Code Activity Bar (left sidebar).

```
┌─────────────────────────────┐
│  📊 TAGSCOUT ANALYZER       │
│  ─────────────────────────  │
│  File Selection             │
│  No file selected           │
│  [Choose File...]           │
└─────────────────────────────┘
```

### 2. Select a Log File or Archive

**Option A: Click "Choose File"**
- Click on "No file selected" or the button
- Browse to your log file/archive
- Supported formats: `.zip`, `.7z`, `.tar.gz`, `.log`, `.txt`

**Option B: Drag & Drop**
- Drag a file from Explorer
- Drop it on the TagScout panel

**Option C: Right-Click in Explorer**
- Right-click any `.zip`, `.log`, or `.txt` file
- Select "Analyze with TagScout"

### 3. Start Analysis

Once a file is selected, click **"▶ Analyze Now"**

The panel will show progress:
```
⏳ Analyzing...

Extracting files...
Detecting product...
Loading Jabber patterns...
Analyzing logs...
```

### 4. View Results

After analysis completes, a results panel opens automatically showing:
- Statistics (total matches, errors, warnings, info)
- Client information (product, version, user, device)
- Configuration files found
- Timeline of matched patterns

---

## Results Panel

### Statistics Cards

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    2,577    │ │     147     │ │      89     │ │      13     │
│    Total    │ │   🔴 Errors │ │ 🟡 Warnings │ │   🔵 Info   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Client Information Card

```
📱 Client Information
──────────────────────────────────
Product:  Jabber for Windows
Version:  14.3.0.308392
User:     jsmith@company.com
Device:   SEP001122334455

⚙️ Configuration Files:
[jabber-config.xml] [phone-services.xml]
```

### Filter Controls

```
🔍 Filters
──────────────────────────────────
[All] [🔴 Errors] [🟡 Warnings] [🔵 Info]

Search: [________________] 
```

Click severity buttons to filter, or type in search box to find specific patterns.

### Status Bar

```
Showing 147 of 2,577 matches
Time Range: 2024-01-10 08:00:00 to 2024-01-11 17:30:45
```

### Timeline Cards

Each matched pattern appears as a card:

```
┃ 2024-01-10 14:23:45.123  🔴 ERROR
┃ Authentication failed for user jsmith
┃ ────────────────────────────────────────
┃ Pattern: Jabber/Authentication/Auth-Failed-001
┃ Category: Authentication
┃ File: jabber.log.1 (Line 1,234)
┃ ▶ Show Details
```

Click **"▶ Show Details"** to expand and see the raw log line.

---

## Features in Detail

### Persistent File Selection

Once you select a file, it remains selected even if you:
- Close VS Code
- Switch workspaces
- Restart your computer

This allows you to:
- Re-analyze the same file after changes
- Keep working with the same case logs across sessions

To change the file, click the file name in the sidebar or use the **"Change File"** button.

### Automatic Product Detection

TagScout UI automatically detects:

| Product | Detection Keywords |
|---------|-------------------|
| **Jabber** | "Jabber", "csf.ecc", "CiscoJabber" |
| **CUCM** | "CallManager", "CCM", "Cisco Unified" |
| **Webex** | "webex", "spark", "Webex" |

It also extracts version numbers when available.

### Archive Extraction

When you upload a `.zip` archive:
1. Files are extracted to a temporary directory
2. All `.log` and `.txt` files are found recursively
3. Each file is analyzed separately
4. Results are combined in a unified timeline
5. Temp files are cleaned up after analysis

### Pattern Matching

The analyzer uses simple built-in patterns for:
- **Errors**: ERROR, FATAL, FAILED, Exception, Critical
- **Warnings**: WARN, WARNING, retry, timeout, deprecated
- **Info**: INFO, authenticated, connected, INVITE, BYE, REGISTER

> **Note**: Future versions will connect to TagScout MongoDB for full pattern library.

### Timeline Features

**Chronological Order** - All matches sorted by timestamp  
**Color-Coded Severity** - Red (errors), yellow (warnings), blue (info)  
**Expandable Details** - Click any card to see the raw log line  
**Metadata** - Shows pattern name, category, file, and line number  

### Filtering & Search

**Severity Filter**
- Click **All** to show everything
- Click **🔴 Errors** to show only errors
- Click **🟡 Warnings** to show only warnings
- Click **🔵 Info** to show only info messages

**Search**
- Type in the search box
- Searches in message text and pattern names
- Updates results in real-time
- Case-insensitive by default

---

## Sidebar Panel Reference

### File Selection View

```
📁 File Selection
─────────────────────────────
📦 tac-case-logs.zip
   45.2 MB
   [Change File]

▶ Analyze Now
```

### During Analysis

```
📁 File Selection
─────────────────────────────
📦 tac-case-logs.zip
   45.2 MB

⏳ Analyzing...
   Please wait
```

### After Analysis

```
📁 File Selection
─────────────────────────────
📦 tac-case-logs.zip
   45.2 MB
   [Change File]

Analysis Results
─────────────────────────────
✅ Analysis Complete
   2,577 matches

Errors: 147 ⚠️
Warnings: 89 !
Info: 2,341 ✓

👁️ View Results
```

---

## Keyboard Shortcuts

Currently, all actions are performed via mouse clicks. Keyboard shortcuts may be added in future versions.

---

## Tips & Best Practices

### 💡 Analyzing Large Archives

For archives with many files (>100 log files):
- Analysis may take 1-2 minutes
- Progress is shown in the notification
- You can cancel with the ❌ button

### 💡 Re-analyzing Files

To re-analyze the same file:
1. Make sure the file is still selected (shown in sidebar)
2. Click **"▶ Analyze Now"** again
3. Results will be refreshed

### 💡 Working with Multiple Cases

To switch between different case logs:
1. Click **"Change File"** in the sidebar
2. Select a new file
3. Click **"▶ Analyze Now"**

The previous file selection is saved, so you can easily switch back.

### 💡 Exporting Results

Currently, results are view-only in the webview. Future versions will support:
- Export to JSON
- Export to CSV
- Generate HTML report
- Copy to clipboard

### 💡 Large Log Files

For individual log files larger than 100 MB:
- Analysis may be slower
- Results are still displayed in timeline
- Consider using Log Scout LSP for real-time analysis instead

---

## Troubleshooting

### "No file selected" error

**Solution**: Click on "No file selected" and choose a file before clicking Analyze.

### "Unsupported file type" error

**Supported formats**: `.zip`, `.7z`, `.tar.gz`, `.tgz`, `.log`, `.txt`

If you have a different format, extract it manually first, then select the `.log` files.

### "Failed to extract ZIP" error

**Possible causes**:
- Corrupted archive
- Insufficient disk space
- Permission issues

**Solution**: Try extracting the archive manually first, then select the extracted log files.

### Analysis takes too long

**For very large archives** (>500MB):
- Analysis can take 2-5 minutes
- Be patient or use the cancel button
- Consider analyzing individual log files instead

### Results panel doesn't open

**Solution**: 
1. Check the sidebar - if it shows "Analysis Complete"
2. Click **"👁️ View Results"** to reopen the panel

### Previously selected file not found

If VS Code shows "File not found" for a previously selected file:
- The file was moved or deleted
- Click **"Change File"** to select a new file

---

## Comparison: TagScout UI vs Log Scout LSP

| Feature | TagScout UI | Log Scout LSP |
|---------|-------------|---------------|
| **Use Case** | Batch analysis of archives | Real-time analysis of open files |
| **Input** | Upload file/archive | Open .log file in editor |
| **Output** | Timeline results panel | Inline diagnostics + Problems panel |
| **Speed** | Slower (analyzes all at once) | Fast (real-time as you scroll) |
| **Best For** | Customer log archives | Active log monitoring |

**Use TagScout UI when:**
- You receive a customer log archive (.zip)
- You need to analyze multiple log files together
- You want a comprehensive timeline view

**Use Log Scout LSP when:**
- You're actively working on a single log file
- You want real-time diagnostics as you scroll
- You need to jump between errors quickly

Both can be used together!

---

## Known Limitations

⚠️ **TagScout MongoDB not yet connected** - Currently uses built-in patterns only  
⚠️ **7z and tar.gz extraction not implemented** - Use .zip files for now  
⚠️ **No export functionality yet** - View-only results  
⚠️ **No advanced filters** - Only severity and search available  

These features are planned for future releases.

---

## Planned Features

### Coming Soon
- [ ] Full TagScout MongoDB integration (1000+ patterns)
- [ ] Export results (JSON, CSV, HTML)
- [ ] Advanced filtering (by category, file, date range)
- [ ] Pattern effectiveness scoring
- [ ] Cross-file correlation analysis

### Future
- [ ] Real-time log streaming support
- [ ] AI-powered pattern suggestions
- [ ] Team collaboration features
- [ ] Integration with TagScout Inventor

---

## Support

**Questions or Issues?**
- Check this guide first
- Look at the Log Scout Analyzer documentation
- Open an issue on GitHub

**Feedback Welcome!**
- Feature requests
- Bug reports
- Usability suggestions

---

## Version History

### v1.0.0 (Current)
- Initial TagScout UI integration
- File upload and analysis
- Auto-detection for Jabber, CUCM, Webex
- Timeline results view with filtering
- Persistent file selection

---

**Happy Analyzing!** 🎉