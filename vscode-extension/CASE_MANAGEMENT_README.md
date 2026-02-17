# Case Management Feature - Quick Reference

## Overview

The Case Management feature allows you to download, extract, and organize support case archive files within the Log Scout Analyzer extension. Each case is automatically extracted and organized in its own directory with all log files ready for analysis.

---

## 🚀 Quick Start

### Download a Case from URL
```
1. Press Ctrl+Shift+P
2. Type: "Scout: Download Case from URL"
3. Enter the URL to the archive file
4. (Optional) Enter a custom case ID
5. Wait for automatic extraction
6. Case appears in Cases view with status "ready"
```

### Import a Local Archive
```
1. Press Ctrl+Shift+P
2. Type: "Scout: Import Case from Local File"
3. Browse and select the archive file
4. (Optional) Enter a custom case ID
5. Wait for automatic extraction
6. Case appears in Cases view
```

### Open and Analyze
```
1. Click the Cases icon in Activity Bar
2. Click on a case to open it in workspace
3. Click any log file to analyze
4. View results in Results, Categories, and Timeline views
```

---

## 📁 File Organization

Cases are stored in a structured directory:

```
.log-scout-cases/
├── case-<timestamp>-<id>/
│   ├── archive/
│   │   └── original-archive.zip    (original file)
│   └── logs/
│       ├── application.log         (extracted logs)
│       ├── debug.log
│       └── error.log
```

---

## 🎯 Key Features

- **Auto-Download**: Download archives from URLs
- **Auto-Extract**: Supports ZIP, TAR, TAR.GZ, TGZ, 7Z formats
- **Auto-Discover**: Finds all .log, .txt, .out, .err, .trace files
- **Workspace Integration**: Add cases to workspace with one click
- **Batch Analysis**: Analyze all logs in a case at once
- **Status Tracking**: Visual status indicators (pending, downloading, extracting, ready, error)
- **Metadata Persistence**: Case information saved between sessions

---

## 📊 Case Statuses

| Status | Icon | Description |
|--------|------|-------------|
| Pending | 🕐 | Case created, not processed |
| Downloading | 📥 | Archive being downloaded |
| Extracting | 📦 | Archive being extracted |
| Ready | ✅ | Case ready for analysis |
| Error | ❌ | Something went wrong |

---

## 🎨 Tree View

The Cases view shows:
- **Case List**: All your cases with status
- **Details Section**: Case ID, status, dates, file count
- **Log Files Section**: All discovered log files (click to open)

---

## ⌨️ Commands

| Command | Description |
|---------|-------------|
| `Scout: Download Case from URL` | Download archive from web |
| `Scout: Import Case from Local File` | Import local archive |
| `Scout: Open Case` | Add case folder to workspace |
| `Scout: Delete Case` | Remove case |
| `Scout: Rename Case` | Change case display name |
| `Scout: Analyze All Case Logs` | Batch analyze all logs |
| `Scout: Show Cases List` | Quick pick case selector |

---

## 🔧 Supported Archive Formats

- **ZIP** (.zip) - Built-in support on all platforms
- **TAR** (.tar) - Unix tar archives
- **GZIP** (.tar.gz, .tgz) - Compressed tar archives
- **7-Zip** (.7z) - Requires 7-Zip installed

---

## 💡 Use Cases

### Support Engineer Workflow
1. Receive case archive from customer
2. Import into extension
3. Auto-extract all logs
4. Analyze for errors/warnings
5. Review results in organized views
6. Export findings

### Multi-Case Analysis
1. Import multiple cases
2. Open all in workspace
3. Compare issues across cases
4. Use timeline to correlate events
5. Identify common patterns

### Remote Case Analysis
1. Customer uploads case to shared URL
2. Download directly into extension
3. Analyze without manual extraction
4. Quick turnaround on investigation

---

## 📝 Best Practices

1. **Use Descriptive Names**: `Customer-ACME-Network-2024-01` instead of `case-123`
2. **Add Descriptions**: Document what the case is about
3. **Clean Up**: Delete old cases when done to save space
4. **Organize by Customer**: Create separate workspaces per customer
5. **Batch Analyze**: Use "Analyze All Case Logs" for comprehensive review

---

## 🛠️ Files Included

| File | Purpose |
|------|---------|
| `caseManager.ts` | Core case management logic |
| `casesTreeProvider.ts` | Tree view provider for displaying cases |
| `CASE_MANAGEMENT_GUIDE.md` | Detailed user guide |
| `CASE_MANAGEMENT_INTEGRATION.md` | Integration instructions |
| `CASE_WORKFLOW_DIAGRAM.md` | Visual workflow diagrams |

---

## 🔗 Integration Steps

To integrate case management into your extension:

1. **Copy Files**:
   - Copy `caseManager.ts` to `src/`
   - Copy `casesTreeProvider.ts` to `src/`

2. **Update package.json**:
   - Add Cases view container
   - Add case management commands
   - Add context menus

3. **Update extension.ts**:
   - Import case manager and tree provider
   - Initialize components in `activate()`
   - Register commands

4. **Test**:
   - Build extension
   - Test download and import
   - Verify all commands work

See [CASE_MANAGEMENT_INTEGRATION.md](CASE_MANAGEMENT_INTEGRATION.md) for complete steps.

---

## 🎯 Example Scenarios

### Scenario 1: Quick Case Download
```
User has URL to case archive
↓
Ctrl+Shift+P → "Download Case from URL"
↓
Enter URL: https://example.com/cases/case-12345.zip
↓
Extension downloads, extracts, discovers 15 log files
↓
Click case → Opens in workspace
↓
Click log file → Analyze
```

### Scenario 2: Local Archive Import
```
User has case-archive.tar.gz on desktop
↓
Ctrl+Shift+P → "Import Case from Local File"
↓
Browse to C:\Users\...\Desktop\case-archive.tar.gz
↓
Extension copies to workspace, extracts
↓
Case ready with 8 log files
```

### Scenario 3: Multi-Case Investigation
```
Import 3 related cases
↓
Open all in workspace
↓
Run "Analyze All Case Logs" on each
↓
Results view shows issues from all cases
↓
Use Timeline to correlate events across cases
↓
Export combined results
```

---

## 📚 Documentation

- **[CASE_MANAGEMENT_GUIDE.md](CASE_MANAGEMENT_GUIDE.md)**: Complete user guide with troubleshooting
- **[CASE_MANAGEMENT_INTEGRATION.md](CASE_MANAGEMENT_INTEGRATION.md)**: Developer integration guide
- **[CASE_WORKFLOW_DIAGRAM.md](CASE_WORKFLOW_DIAGRAM.md)**: Visual workflow diagrams

---

## ⚙️ Configuration (Future)

Planned configuration options:

```json
{
    "logScoutAnalyzer.cases.storagePath": ".log-scout-cases",
    "logScoutAnalyzer.cases.autoExtract": true,
    "logScoutAnalyzer.cases.autoOpen": false,
    "logScoutAnalyzer.cases.keepArchive": true
}
```

---

## 🐛 Troubleshooting

### Archive won't extract
- Verify archive is not corrupted
- For .7z files, ensure 7-Zip is installed
- Check available disk space

### No log files found
- Verify archive contains log files
- Check if logs have supported extensions
- Browse case folder manually

### Download fails
- Verify URL is accessible
- Check internet connection
- Try downloading manually first, then import

---

## 🚦 Next Steps

After implementing case management:

1. ✅ Test with real case archives
2. ✅ Gather user feedback
3. ✅ Add configuration options
4. ✅ Optimize for large archives
5. ✅ Add progress indicators
6. ✅ Implement case search/filter
7. ✅ Add case tagging/categorization

---

## 📊 Architecture

```
┌─────────────────────────────────────────┐
│         VS Code Extension               │
│                                         │
│  ┌──────────────┐   ┌───────────────┐ │
│  │ extension.ts │──▶│ CaseManager   │ │
│  └──────────────┘   └───────────────┘ │
│         │                   │          │
│         ▼                   ▼          │
│  ┌──────────────┐   ┌───────────────┐ │
│  │CasesTreeView │   │  File System  │ │
│  └──────────────┘   └───────────────┘ │
└─────────────────────────────────────────┘
                 │
                 ▼
      .log-scout-cases/
```

---

## 🎓 API Reference

### CaseManager

```typescript
// Download case from URL
downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo>

// Import local archive
importCaseFromLocal(path: string, caseId?: string): Promise<CaseInfo>

// Get all cases
getAllCases(): CaseInfo[]

// Get specific case
getCase(caseId: string): CaseInfo | undefined

// Open case in workspace
openCase(caseId: string): Promise<void>

// Delete case
deleteCase(caseId: string, deleteFiles: boolean): Promise<void>

// Update case info
updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void>

// Get case log files
getCaseLogFiles(caseId: string): string[]
```

### CaseInfo Interface

```typescript
interface CaseInfo {
    caseId: string;
    caseName: string;
    description?: string;
    createdDate: Date;
    downloadedDate: Date;
    sourcePath: string;
    extractedPath: string;
    logFiles: string[];
    status: 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';
    errorMessage?: string;
}
```

---

## ✨ Benefits

- **Time Savings**: No manual extraction or organization
- **Consistency**: Same structure for every case
- **Efficiency**: Batch operations on all logs
- **Organization**: Each case isolated in its own folder
- **Persistence**: Case metadata saved automatically
- **Integration**: Works seamlessly with existing analysis features

---

**Happy Case Analyzing!** 🔍📁