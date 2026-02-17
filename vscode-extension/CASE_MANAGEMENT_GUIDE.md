# Case Management Guide 📁

## Overview

The Case Management feature allows you to download, organize, and analyze support case files within the Log Scout Analyzer extension. Each case is automatically extracted and organized in its own directory with all log files ready for analysis.

---

## Quick Start

### 1. Download a Case from URL

```
Ctrl+Shift+P → Scout: Download Case from URL
```

Enter the URL to the case archive file (zip, tar.gz, tgz, 7z supported).

### 2. Import a Local Case File

```
Ctrl+Shift+P → Scout: Import Case from Local File
```

Browse to select a local archive file containing case logs.

### 3. View Cases

Click the **📁 Cases** icon in the Activity Bar to see all your cases.

---

## Features

### 📦 Automatic Organization

Each case is organized in its own directory structure:

```
.log-scout-cases/
├── case-<timestamp>-<id>/
│   ├── archive/
│   │   └── original-archive.zip
│   └── logs/
│       ├── application.log
│       ├── jabber.log
│       ├── debug.out
│       └── ... (all extracted logs)
```

### 🔍 Automatic Log Discovery

The extension automatically:
- Extracts archives (zip, tar, tar.gz, tgz, 7z)
- Recursively scans for log files
- Detects files with extensions: `.log`, `.txt`, `.out`, `.err`, `.trace`
- Lists all discovered logs in the Cases tree view

### 📊 Case Status Tracking

Cases have different statuses:
- **🕐 Pending** - Case created but not yet processed
- **📥 Downloading** - Archive is being downloaded
- **📦 Extracting** - Archive is being extracted
- **✅ Ready** - Case is ready with all logs extracted
- **❌ Error** - Something went wrong (see error message)

### 🌳 Tree View

The Cases view shows:
- **Case Name** - Click to open case in workspace
- **Details** - Case ID, status, date, log count
- **Log Files** - All discovered log files (click to open)

---

## Commands

### Download & Import

| Command | Description | Shortcut |
|---------|-------------|----------|
| `Scout: Download Case from URL` | Download case archive from URL | - |
| `Scout: Import Case from Local File` | Import local archive file | - |

### Case Management

| Command | Description |
|---------|-------------|
| `Scout: Open Case` | Open case logs folder in workspace |
| `Scout: Show Cases List` | Show all cases in Quick Pick |
| `Scout: Rename Case` | Change case display name |
| `Scout: Delete Case` | Remove case (with option to delete files) |
| `Scout: Refresh Cases` | Reload cases tree view |

### Analysis

| Command | Description |
|---------|-------------|
| `Scout: Analyze All Case Logs` | Analyze all logs in selected case |
| `Scout: Open Case in New Window` | Open case in separate VS Code window |

---

## Case Workflow

### Standard Workflow

1. **Download/Import** - Get the case archive
2. **Auto-Extract** - Extension extracts automatically
3. **Auto-Discover** - Log files are found automatically
4. **Open Case** - Add case folder to workspace
5. **Analyze** - Click any log file to analyze
6. **Review** - Use Results, Categories, Timeline views

### Example: Download from URL

```
1. Press Ctrl+Shift+P
2. Type: "Scout: Download Case from URL"
3. Enter URL: https://example.com/cases/case-12345.zip
4. Extension downloads and extracts automatically
5. Notification: "Case case-12345 is ready with 15 log files"
6. Click case in Cases view to open
7. Click any log file to analyze
```

### Example: Import Local Archive

```
1. Press Ctrl+Shift+P
2. Type: "Scout: Import Case from Local File"
3. Browse to: C:\Downloads\support-case.tar.gz
4. Extension extracts automatically
5. Case appears in Cases view
6. Click to open and analyze logs
```

---

## Supported Archive Formats

### Built-in Support

- **ZIP** - `.zip` files (uses PowerShell on Windows, unzip on Unix)
- **TAR** - `.tar` files
- **GZIP** - `.tar.gz`, `.tgz` files
- **7-Zip** - `.7z` files (requires 7-Zip installed)

### Format Notes

- **Windows**: ZIP extraction uses built-in PowerShell (no tools needed)
- **macOS/Linux**: Uses `tar` and `unzip` command-line tools (usually pre-installed)
- **7-Zip**: Requires separate installation on all platforms

---

## Case Storage

### Location

Cases are stored in one of two locations:

1. **Workspace Cases** (preferred):
   ```
   <workspace-root>/.log-scout-cases/
   ```
   - Used when a workspace folder is open
   - Cases travel with your workspace

2. **Global Cases** (fallback):
   ```
   <extension-storage>/cases/
   ```
   - Used when no workspace is open
   - Cases available across all VS Code instances

### Storage Structure

```
.log-scout-cases/
├── case-1234567890-abc123/
│   ├── archive/
│   │   └── original.zip       # Original downloaded archive
│   └── logs/
│       ├── app.log            # Extracted log files
│       └── debug.log
├── case-1234567891-def456/
│   ├── archive/
│   └── logs/
└── case-1234567892-ghi789/
    ├── archive/
    └── logs/
```

### Metadata Persistence

Case metadata is stored in VS Code's global state:
- Case ID
- Case name
- Description
- Dates (created, downloaded)
- File paths
- Status
- Log file list

---

## Advanced Usage

### Custom Case IDs

When downloading or importing, you can specify a custom case ID:

```javascript
// API example (for extension developers)
await caseManager.downloadCaseFromUrl(
    'https://example.com/case.zip',
    'my-custom-case-id'  // Optional custom ID
);
```

### Programmatic Access

```javascript
// Get case manager instance
const caseManager = extension.getCaseManager();

// Get all cases
const cases = caseManager.getAllCases();

// Get specific case
const caseInfo = caseManager.getCase('case-id');

// Get case log files
const logFiles = caseManager.getCaseLogFiles('case-id');
```

### Renaming Cases

1. Right-click case in tree view
2. Select "Rename Case"
3. Enter new name
4. Case keeps same ID but displays new name

### Case Deletion Options

When deleting a case, you have two options:

- **Delete Files** - Removes case directory and all files
- **Remove from List Only** - Keeps files but removes from case list

---

## Troubleshooting

### "Failed to extract archive"

**Problem**: Archive extraction failed.

**Solutions**:
- Verify archive is not corrupted
- For `.7z` files, ensure 7-Zip is installed
- Check disk space
- Check file permissions

### "No log files found"

**Problem**: Archive extracted but no logs detected.

**Solutions**:
- Verify archive contains log files
- Check if logs have supported extensions (`.log`, `.txt`, `.out`, `.err`, `.trace`)
- Look in case folder manually: `.log-scout-cases/<case-id>/logs/`

### "Download failed: HTTP 403/404"

**Problem**: Cannot download from URL.

**Solutions**:
- Verify URL is correct and accessible
- Check if authentication is required
- Try downloading manually first, then use "Import from Local File"

### Case shows "Error" status

**Problem**: Case processing failed.

**Solutions**:
1. Hover over case in tree view to see error message
2. Check Output Panel: "Log Scout Analyzer"
3. Try deleting and re-importing the case
4. Verify archive file is valid

---

## Best Practices

### 1. Use Descriptive Case Names

```
✅ "Customer-ACME-Network-Issue-2024-01"
❌ "case-1234567890-abc123"
```

### 2. Organize by Customer/Project

Create workspace folders for different customers:
```
Workspace: Customer-ACME/
├── .log-scout-cases/
│   ├── network-issue-jan/
│   ├── auth-problem-feb/
│   └── performance-mar/
```

### 3. Clean Up Old Cases

Regularly delete cases you no longer need:
- Right-click → Delete Case
- Choose "Delete Files" to free disk space

### 4. Use Case Descriptions

Add meaningful descriptions to cases:
```
Description: "Production outage 2024-01-15, affected authentication service"
```

### 5. Workspace Integration

After opening a case:
1. Case folder appears in Explorer
2. All logs are available for analysis
3. Use standard Log Scout features on all files

---

## Integration with Analysis Features

### After Opening a Case

All standard Log Scout features work with case logs:

- **Real-time Diagnostics** - Issues highlighted as you view logs
- **Results Tree View** - See all issues across all case logs
- **Categories View** - Group issues by component
- **Timeline View** - See when issues occurred
- **Pattern Matching** - All configured patterns apply
- **Export** - Export results for all case logs

### Multi-File Analysis

Analyze all logs in a case together:

1. Open case in workspace
2. Results view shows issues from ALL log files
3. Click any issue to jump to that file and line
4. Use filters to narrow down results

### Cross-File Correlation

Use timeline view to correlate issues across multiple log files:

1. Open Timeline view
2. See events from all case logs chronologically
3. Identify patterns across different logs
4. Spot cascading failures

---

## API Reference (For Extension Developers)

### CaseManager Methods

```typescript
class CaseManager {
    // Download case from URL
    downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo>
    
    // Import local archive
    importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo>
    
    // Get all cases
    getAllCases(): CaseInfo[]
    
    // Get specific case
    getCase(caseId: string): CaseInfo | undefined
    
    // Open case in workspace
    openCase(caseId: string): Promise<void>
    
    // Delete case
    deleteCase(caseId: string, deleteFiles: boolean): Promise<void>
    
    // Update case metadata
    updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void>
    
    // Get case log files
    getCaseLogFiles(caseId: string): string[]
}
```

### CaseInfo Interface

```typescript
interface CaseInfo {
    caseId: string;              // Unique identifier
    caseName: string;            // Display name
    description?: string;        // Optional description
    createdDate: Date;          // When case was created
    downloadedDate: Date;       // When archive was downloaded
    sourcePath: string;         // Path to original archive
    extractedPath: string;      // Path to extracted logs
    logFiles: string[];         // Array of log file paths
    status: 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';
    errorMessage?: string;      // Error details if status is 'error'
}
```

---

## Keyboard Shortcuts

No default keyboard shortcuts are assigned for case management commands. You can assign your own:

1. Open Keyboard Shortcuts: `Ctrl+K Ctrl+S`
2. Search for "Scout: Download Case" or other commands
3. Click the `+` icon to assign a shortcut

### Suggested Shortcuts

```json
{
    "key": "ctrl+alt+d",
    "command": "logScoutAnalyzer.downloadCase",
    "when": "!inDebugMode"
},
{
    "key": "ctrl+alt+i",
    "command": "logScoutAnalyzer.importCase",
    "when": "!inDebugMode"
}
```

---

## Configuration

### Case Storage Location

By default, cases are stored in `.log-scout-cases/` in your workspace. To change this:

```json
{
    "logScoutAnalyzer.cases.storagePath": "custom-path"
}
```

### Auto-Extract

Enable/disable automatic extraction after download:

```json
{
    "logScoutAnalyzer.cases.autoExtract": true
}
```

### Auto-Open

Automatically open case after extraction:

```json
{
    "logScoutAnalyzer.cases.autoOpen": false
}
```

---

## FAQ

### Q: Can I download cases from password-protected URLs?

**A:** Not directly. Download the file manually first, then use "Import Case from Local File".

### Q: Are cases shared across VS Code windows?

**A:** Cases stored in workspace folders (`.log-scout-cases/`) are local to that workspace. Cases in global storage are shared.

### Q: Can I move case files manually?

**A:** Yes, but the extension won't track them. Use the "Delete Case" → "Remove from List Only" option first, then move files.

### Q: What happens if I delete .log-scout-cases folder?

**A:** Cases will show errors. Delete them from the Cases view to clean up metadata.

### Q: Can I analyze cases without adding to workspace?

**A:** Yes, open log files directly from the Cases tree view without adding the folder to workspace.

### Q: How much disk space do cases use?

**A:** Cases store both the original archive and extracted files, so approximately 2x the archive size.

---

## Tips & Tricks

### Tip 1: Quick Case Access

Pin the Cases view to quickly access your most-used cases.

### Tip 2: Workspace per Customer

Create a separate workspace for each customer with their cases:
```
customer-acme.code-workspace
customer-contoso.code-workspace
```

### Tip 3: Case Naming Convention

Use a consistent naming scheme:
```
<customer>-<type>-<date>-<description>
Example: ACME-Network-2024-01-Auth-Timeout
```

### Tip 4: Batch Analysis

Open multiple cases in one workspace to analyze together:
1. Import case 1
2. Import case 2
3. Open both cases
4. All logs visible in Results view

### Tip 5: Export Case Results

After analyzing a case:
1. Run "Scout: Export Results"
2. Save to case folder
3. Include in case documentation

---

## Version History

### v0.2.0 (Initial Release)
- Case download from URL
- Local file import
- Automatic extraction (zip, tar, 7z)
- Log file discovery
- Tree view provider
- Status tracking
- Case metadata persistence

---

## Related Documentation

- [README.md](README.md) - Extension overview
- [QUICK_START_v0.0.14.md](QUICK_START_v0.0.14.md) - Getting started guide
- [ANALYZER_PANEL.md](ANALYZER_PANEL.md) - Analysis features
- [CONSOLE_OUTPUT_FEATURE.md](CONSOLE_OUTPUT_FEATURE.md) - Console features

---

## Support

For issues or questions about case management:

1. Check the troubleshooting section above
2. Review extension logs in Output Panel
3. Report issues on GitHub
4. Contact extension support

---

**Happy Case Analyzing!** 🔍