# Case Manager - Quick Start Guide 🚀

## What is the Case Manager?

The Case Manager lets you download and organize log case archives directly in VS Code. Perfect for:
- 📥 Downloading customer cases from support systems
- 📦 Importing troubleshooting logs from zip files
- 🗂️ Organizing multiple log collections in one place
- 🔍 Quickly accessing log files without extracting manually

## Where to Find It

The Case Manager appears in the **Panel** at the bottom of VS Code:

1. Look for the **Scout Cases** icon in the bottom toolbar
2. Or press `Ctrl+Shift+P` and run: `Scout: Show Cases List`

```
┌─────────────────────────────────────┐
│                                     │
│      Main Editor Area               │
│                                     │
├─────────────────────────────────────┤
│ SCOUT CASES ▼                       │ ← Look here!
├─────────────────────────────────────┤
│ 📦 Customer-Case-123                │
│ 📦 Production-Issue-456             │
└─────────────────────────────────────┘
```

## Quick Actions

### 1. Download a Case from URL ☁️

**Use when**: You have a URL to a case archive (e.g., from a ticketing system)

1. Click the **☁️ download icon** in Cases toolbar
2. Paste the URL: `https://example.com/case123.zip`
3. Press Enter
4. ✨ Case downloads and extracts automatically!

**Example URLs**:
- `https://support.company.com/cases/case-12345.zip`
- `https://fileserver.local/logs/production-issue.tar.gz`
- `http://192.168.1.100/troubleshooting/logs.tgz`

### 2. Import a Local Case 📁

**Use when**: You have a zip file on your computer

1. Click the **➕ import icon** in Cases toolbar
2. Browse to your archive file
3. Select it
4. ✨ Case imports and extracts automatically!

**Supported formats**: `.zip`, `.tar`, `.gz`, `.tgz`, `.tar.gz`

### 3. Open a Case 📖

**Method 1 - Quick Open**:
- Just **click on a case name** → opens first log file

**Method 2 - Choose File**:
1. Expand the case (click the arrow ▶️)
2. Expand "Log Files"
3. Click on any log file

**Method 3 - Right-Click**:
- Right-click a case → "Scout: Open Case"

### 4. Delete a Case 🗑️

1. Right-click on a case
2. Select "Scout: Delete Case"
3. Confirm deletion
4. ✨ Case and all files removed!

## Case Structure

Each case shows:

```
📦 Customer-Case-123
├── 📄 Details
│   ├── Case ID: case-123
│   ├── Status: ready ✓
│   ├── Downloaded: 2024-01-15
│   └── Log Files: 5
└── 📂 Log Files (5)
    ├── application.log
    ├── error.log
    ├── system.log
    ├── debug.log
    └── access.log
```

## Tips & Tricks

### 💡 Where Are Cases Stored?

- **With Workspace**: `.log-scout-cases/` folder in your workspace
- **No Workspace**: Extension storage (managed by VS Code)

**Pro Tip**: Add `.log-scout-cases/` to your `.gitignore`!

### 💡 Refresh the View

Click the **🔄 refresh icon** if:
- You manually added files to `.log-scout-cases/`
- Cases aren't showing up
- You want to reload the list

### 💡 Find Case Files on Disk

Right-click a case → "Scout: Reveal Case in Explorer"

Opens the case folder in your file explorer so you can:
- See all extracted files
- Copy files elsewhere
- Share with teammates
- Backup manually

### 💡 Multiple Workspaces

Each workspace has its own `.log-scout-cases/` folder!

```
project-a/
└── .log-scout-cases/
    └── case-1/

project-b/
└── .log-scout-cases/
    └── case-2/
```

### 💡 Check Progress

All downloads and operations are logged to the **Scout Analyzer** output channel:

1. Open Output panel: `Ctrl+Shift+` (backtick)
2. Select "Scout Analyzer" from dropdown
3. See real-time progress:
   ```
   [Case Manager] Downloading case from: https://...
   [Case Manager] Download complete: 2.5 MB
   [Case Manager] Extracting archive...
   [Case Manager] Discovered 5 log files
   [Case Manager] Case ready!
   ```

## Common Workflows

### Workflow 1: Customer Support Case

```
1. Receive support ticket with case URL
2. Click ☁️ download icon in Cases panel
3. Paste URL → Enter
4. Wait for extraction (watch Output channel)
5. Click case to open first log
6. Analyze logs with Scout Analyzer
7. When done: Right-click → Delete Case
```

### Workflow 2: Local Troubleshooting

```
1. Receive logs.zip via email
2. Save to Downloads folder
3. Click ➕ import icon in Cases panel
4. Navigate to Downloads/logs.zip
5. Select and import
6. Browse log files in tree
7. Open relevant logs for analysis
```

### Workflow 3: Multiple Cases

```
1. Download several cases from different sources
2. All appear in Cases panel
3. Switch between cases by clicking
4. Each case keeps its own folder
5. Delete old cases when done
```

## Troubleshooting

### ❓ Cases panel is missing

**Solution 1**: Look in the bottom panel toolbar for "Scout Cases"
**Solution 2**: Run `Scout: Show Cases List` command
**Solution 3**: Reload VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`

### ❓ Download fails

**Check**:
- ✅ Internet connection working?
- ✅ URL is accessible in browser?
- ✅ File is actually an archive (.zip, .tar.gz)?
- ✅ Check Output channel for error details

**Note**: Authentication (username/password) not yet supported!

### ❓ Import fails

**Check**:
- ✅ File is a valid archive?
- ✅ File isn't corrupted?
- ✅ You have read permissions?
- ✅ Disk has enough space?

### ❓ No log files found

**Possible causes**:
- Archive doesn't contain .log files
- Files have unusual extensions
- Files are in a deeply nested structure

**Solution**: Right-click case → "Reveal in Explorer" to check manually

### ❓ Case stuck in "downloading" status

**Solution**:
1. Refresh the view (🔄 icon)
2. Check Output channel for errors
3. If stuck, delete and try again

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Command Palette | `Ctrl+Shift+P` |
| Focus Cases Panel | `Ctrl+Shift+P` → "Scout: Show Cases List" |
| Refresh View | Click 🔄 or re-run command |

## What's Next?

Once you have cases loaded:

1. **Analyze Logs**: Click on log files → Scout automatically analyzes them
2. **View Results**: Check the Results panel for errors/warnings
3. **Browse Timeline**: See events over time
4. **Export Results**: Save your findings

## Command Palette

All commands available via `Ctrl+Shift+P`:

- `Scout: Download Case from URL` - Download from web
- `Scout: Import Case from File` - Import local archive  
- `Scout: Show Cases List` - Open Cases panel
- `Scout: Refresh Cases` - Reload cases list

## Status Icons

Cases show their current status:

| Icon | Status | Meaning |
|------|--------|---------|
| ✓ ready | Green | Ready to use |
| ⏳ downloading | Yellow | Downloading from URL |
| 📦 extracting | Yellow | Extracting archive |
| ❌ error | Red | Something went wrong |

## Best Practices

✅ **DO**:
- Delete old cases when done (saves disk space)
- Use meaningful case names/IDs
- Check Output channel if things go wrong
- Keep `.log-scout-cases/` in `.gitignore`

❌ **DON'T**:
- Don't commit cases to git (they're large!)
- Don't edit files in `.log-scout-cases/` directly
- Don't expect authentication support (yet)

## Need Help?

1. **Check Output Channel**: `Scout Analyzer` output shows detailed logs
2. **Check this guide**: Most common issues covered above
3. **Reload VS Code**: Often fixes UI issues
4. **Check file permissions**: Ensure you can read/write files

## Success! 🎉

You now know how to:
- ✅ Download cases from URLs
- ✅ Import local archives
- ✅ Browse and open log files
- ✅ Manage multiple cases
- ✅ Clean up when done

Happy analyzing! 🔍

---

**Quick Reference Card**

```
╔═══════════════════════════════════════════════╗
║          CASE MANAGER QUICK ACTIONS           ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  ☁️  Download from URL                        ║
║  ➕  Import from file                         ║
║  🔄  Refresh view                             ║
║                                               ║
║  Click case → Opens first log                 ║
║  Right-click → More options                   ║
║                                               ║
║  Output channel: Scout Analyzer               ║
║  Storage: .log-scout-cases/                   ║
║                                               ║
╚═══════════════════════════════════════════════╝
```
