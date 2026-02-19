# How to Activate the Case Manager UI

## Current Status

The **Case Management** system has been fully implemented in the codebase:

- ✅ **Shared Core** (`shared-core/src/caseManager.ts`) - Platform-agnostic case management logic
- ✅ **VS Code Adapter** (`vscode-extension/src/adapters/vscodeAdapter.ts`) - Platform integration
- ✅ **Case Manager** (`vscode-extension/src/caseManager.ts`) - VS Code wrapper for case operations
- ✅ **Tree Provider** (`vscode-extension/src/casesTreeProvider.ts`) - UI tree view for displaying cases

However, **the Case Manager UI is NOT currently activated** in the VS Code extension. The code exists but is not registered or wired up in `extension.ts`.

## What the Case Manager Does

The Case Manager allows you to:

1. **Download cases from URLs** - Download log case archives (zip/tar.gz/tgz) from web URLs
2. **Import local cases** - Import case archives from your local file system
3. **Extract and organize logs** - Automatically extract archives and discover log files
4. **Browse cases** - View all downloaded cases in a tree view
5. **Open case logs** - Quickly open log files from cases for analysis
6. **Manage case lifecycle** - Track download status, errors, and metadata

## What It Should Look Like

When activated, the Case Manager appears as a new view in the Scout activity bar:

```
SCOUT ANALYZER
├── Results
├── Filters
├── Categories
├── Timeline
├── Analyzer
├── Cached Files
└── Cases                    ← NEW VIEW
    ├── Case-123
    │   ├── Details
    │   │   ├── Case ID: case-123
    │   │   ├── Status: ready
    │   │   ├── Downloaded: 2024-01-15
    │   │   └── Log Files: 5
    │   └── Log Files (5)
    │       ├── application.log
    │       ├── error.log
    │       └── debug.log
    └── Case-456
        └── ...
```

## How to Activate It

To enable the Case Manager UI, you need to make the following changes to the VS Code extension:

### Step 1: Register the View in `package.json`

Add the Cases view to the `scout-analyzer` views container:

**File: `vscode-extension/package.json`**

Find the `"views"` section (around line 52) and add the Cases view:

```json
"views": {
    "scout-analyzer": [
        {
            "id": "scoutResults",
            "name": "Results",
            "icon": "$(list-tree)",
            "contextualTitle": "Scout Results",
            "visibility": "visible"
        },
        {
            "id": "scoutFilters",
            "name": "Filters",
            "icon": "$(filter)",
            "contextualTitle": "Result Filters",
            "visibility": "visible"
        },
        {
            "id": "scoutCategories",
            "name": "Categories",
            "icon": "$(symbol-folder)",
            "contextualTitle": "Scout Categories",
            "visibility": "collapsed"
        },
        {
            "id": "scoutTimeline",
            "name": "Timeline",
            "icon": "$(clock)",
            "contextualTitle": "Scout Timeline",
            "visibility": "collapsed"
        },
        {
            "id": "scoutAnalyzer",
            "name": "Analyzer",
            "icon": "$(play-circle)",
            "contextualTitle": "Scout Analyzer",
            "visibility": "visible"
        },
        {
            "id": "scoutCachedFiles",
            "name": "Cached Files",
            "icon": "$(database)",
            "contextualTitle": "Cached Analysis Files",
            "visibility": "visible"
        },
        {
            "id": "scoutCases",
            "name": "Cases",
            "icon": "$(archive)",
            "contextualTitle": "Scout Cases",
            "visibility": "visible"
        }
    ]
}
```

### Step 2: Add Commands to `package.json`

Add the case management commands to the `"commands"` array (around line 397):

```json
"commands": [
    // ... existing commands ...
    {
        "command": "logScoutAnalyzer.downloadCase",
        "title": "Scout: Download Case from URL",
        "icon": "$(cloud-download)"
    },
    {
        "command": "logScoutAnalyzer.importCase",
        "title": "Scout: Import Case from File",
        "icon": "$(file-add)"
    },
    {
        "command": "logScoutAnalyzer.openCase",
        "title": "Scout: Open Case"
    },
    {
        "command": "logScoutAnalyzer.refreshCases",
        "title": "Scout: Refresh Cases",
        "icon": "$(refresh)"
    },
    {
        "command": "logScoutAnalyzer.deleteCase",
        "title": "Scout: Delete Case",
        "icon": "$(trash)"
    },
    {
        "command": "logScoutAnalyzer.showCasesList",
        "title": "Scout: Show Cases List"
    },
    {
        "command": "logScoutAnalyzer.openCaseLogFile",
        "title": "Scout: Open Log File",
        "icon": "$(go-to-file)"
    },
    {
        "command": "logScoutAnalyzer.revealCaseInExplorer",
        "title": "Scout: Reveal Case in Explorer",
        "icon": "$(folder-opened)"
    }
]
```

### Step 3: Add Menu Items to `package.json`

Add menu items for the Cases view toolbar and context menu in the `"menus"` section:

```json
"menus": {
    "view/title": [
        // ... existing menus ...
        {
            "command": "logScoutAnalyzer.downloadCase",
            "when": "view == scoutCases",
            "group": "navigation@1"
        },
        {
            "command": "logScoutAnalyzer.importCase",
            "when": "view == scoutCases",
            "group": "navigation@2"
        },
        {
            "command": "logScoutAnalyzer.refreshCases",
            "when": "view == scoutCases",
            "group": "navigation@3"
        }
    ],
    "view/item/context": [
        // ... existing menus ...
        {
            "command": "logScoutAnalyzer.openCase",
            "when": "viewItem == case",
            "group": "navigation@1"
        },
        {
            "command": "logScoutAnalyzer.openCaseLogFile",
            "when": "viewItem == logFile",
            "group": "navigation@1"
        },
        {
            "command": "logScoutAnalyzer.revealCaseInExplorer",
            "when": "viewItem == case",
            "group": "actions@1"
        },
        {
            "command": "logScoutAnalyzer.deleteCase",
            "when": "viewItem == case",
            "group": "actions@2"
        }
    ]
}
```

### Step 4: Wire Up in `extension.ts`

Add the following code to `vscode-extension/src/extension.ts`:

#### 4a. Import the Case Manager Classes

At the top of the file (around line 1-20), add:

```typescript
import { CaseManager } from './caseManager';
import { CasesTreeProvider } from './casesTreeProvider';
```

#### 4b. Declare Module Variables

Add to the module-level variables (around line 29-46):

```typescript
let caseManager: CaseManager | undefined;
let casesTreeProvider: CasesTreeProvider | undefined;
```

#### 4c. Initialize in the `activate()` Function

Add this code in the `activate()` function after the other tree views are created (around line 640):

```typescript
// Initialize Case Manager
caseManager = new CaseManager(context, outputChannel);
casesTreeProvider = new CasesTreeProvider(caseManager);

const casesTreeView = vscode.window.createTreeView('scoutCases', {
    treeDataProvider: casesTreeProvider,
    showCollapseAll: true
});
context.subscriptions.push(casesTreeView);
```

#### 4d. Register Commands

Add these command registrations after the existing command registrations (before line 2285):

```typescript
// Case Management Commands
const downloadCaseCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.downloadCase',
    async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter case download URL',
            placeHolder: 'https://example.com/case.zip',
            validateInput: (value) => {
                if (!value) return 'URL is required';
                if (!value.startsWith('http://') && !value.startsWith('https://')) {
                    return 'URL must start with http:// or https://';
                }
                return null;
            }
        });

        if (url && caseManager) {
            await caseManager.downloadCaseFromUrl(url);
            casesTreeProvider?.refresh();
        }
    }
);

const importCaseCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.importCase',
    async () => {
        const fileUris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Archives': ['zip', 'tar', 'gz', 'tgz', 'tar.gz']
            },
            openLabel: 'Import Case'
        });

        if (fileUris && fileUris.length > 0 && caseManager) {
            await caseManager.importCase(fileUris[0].fsPath);
            casesTreeProvider?.refresh();
        }
    }
);

const openCaseCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.openCase',
    async (caseId: string) => {
        if (!caseManager) return;

        const caseInfo = caseManager.getCase(caseId);
        if (!caseInfo) {
            vscode.window.showErrorMessage(`Case ${caseId} not found`);
            return;
        }

        if (caseInfo.status !== 'ready') {
            vscode.window.showWarningMessage(`Case ${caseInfo.caseName} is not ready (status: ${caseInfo.status})`);
            return;
        }

        // Open the first log file
        if (caseInfo.logFiles.length > 0) {
            const firstLog = caseInfo.logFiles[0];
            const doc = await vscode.workspace.openTextDocument(firstLog);
            await vscode.window.showTextDocument(doc);
        }
    }
);

const refreshCasesCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.refreshCases',
    () => {
        casesTreeProvider?.refresh();
    }
);

const deleteCaseCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.deleteCase',
    async (item: any) => {
        if (!caseManager || !item?.caseInfo) return;

        const caseInfo = item.caseInfo;
        const answer = await vscode.window.showWarningMessage(
            `Delete case "${caseInfo.caseName}"?`,
            { modal: true },
            'Delete'
        );

        if (answer === 'Delete') {
            await caseManager.deleteCase(caseInfo.caseId);
            casesTreeProvider?.refresh();
        }
    }
);

const showCasesListCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.showCasesList',
    () => {
        vscode.commands.executeCommand('scoutCases.focus');
    }
);

const openCaseLogFileCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.openCaseLogFile',
    async (item: any) => {
        if (item?.logFilePath) {
            const doc = await vscode.workspace.openTextDocument(item.logFilePath);
            await vscode.window.showTextDocument(doc);
        }
    }
);

const revealCaseInExplorerCommand = vscode.commands.registerCommand(
    'logScoutAnalyzer.revealCaseInExplorer',
    async (item: any) => {
        if (item?.caseInfo?.extractedPath) {
            await vscode.commands.executeCommand(
                'revealFileInOS',
                vscode.Uri.file(item.caseInfo.extractedPath)
            );
        }
    }
);

context.subscriptions.push(
    downloadCaseCommand,
    importCaseCommand,
    openCaseCommand,
    refreshCasesCommand,
    deleteCaseCommand,
    showCasesListCommand,
    openCaseLogFileCommand,
    revealCaseInExplorerCommand
);
```

#### 4e. Clean Up in `deactivate()`

Add to the `deactivate()` function:

```typescript
if (caseManager) {
    caseManager.dispose();
}
```

### Step 5: Rebuild the Extension

After making these changes, rebuild the extension:

```bash
cd vscode-extension
npm run build
```

Or use the build-all script:

```batch
build-all.bat
```

### Step 6: Reload VS Code

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Run: **Developer: Reload Window**
3. Look for the **Cases** view in the Scout Analyzer activity bar

## Using the Case Manager

Once activated, you can:

### Download a Case from URL

1. Click the **download icon** (☁️) in the Cases view toolbar
2. Enter the URL to a case archive (zip/tar.gz)
3. The case will be downloaded and extracted automatically
4. Expand the case to see log files

### Import a Local Case

1. Click the **import icon** (➕) in the Cases view toolbar
2. Select a local archive file
3. The case will be imported and extracted

### Open a Case

1. Click on a case in the Cases tree view
2. The first log file will open automatically
3. Or expand the case and click on individual log files

### Delete a Case

1. Right-click on a case
2. Select **Scout: Delete Case**
3. Confirm the deletion

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                     │
│                                                           │
│  ┌─────────────────────────┐   ┌────────────────────┐  │
│  │  casesTreeProvider.ts   │   │   extension.ts     │  │
│  │  (UI Tree View)         │◄──┤   (Commands)       │  │
│  └────────────┬────────────┘   └─────────┬──────────┘  │
│               │                           │              │
│               │    ┌──────────────────────▼─────┐       │
│               └───►│   caseManager.ts          │       │
│                    │   (VS Code Wrapper)       │       │
│                    └──────────┬─────────────────┘       │
└───────────────────────────────┼──────────────────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   Shared Core Module     │
                    │   @log-scout/shared-core │
                    │                           │
                    │  caseManager.ts          │
                    │  (Platform-agnostic)     │
                    └───────────┬──────────────┘
                                │
                    ┌───────────▼──────────────┐
                    │   VS Code Adapter        │
                    │   vscodeAdapter.ts       │
                    │   (Platform API)         │
                    └──────────────────────────┘
```

## Troubleshooting

### Cases view doesn't appear

- Check that `package.json` has the view registered
- Rebuild the extension: `npm run build`
- Reload VS Code: `Ctrl+Shift+P` → **Developer: Reload Window**

### Commands not working

- Verify all commands are registered in `package.json`
- Check the Developer Console for errors: `Ctrl+Shift+I` → Console tab
- Ensure commands are properly subscribed in `extension.ts`

### Cases not persisting

- Check that the workspace has write permissions
- Cases are stored in `.log-scout-cases/` in the workspace root
- Check the Output channel: **Scout Analyzer** for error messages

### Download fails

- Check internet connectivity
- Verify the URL is accessible
- Check the Output channel for error details
- Some servers require authentication (not currently supported)

## Future Enhancements

Potential improvements to the Case Manager:

1. **Authentication Support** - Download cases from authenticated URLs
2. **Case Metadata** - Edit case descriptions and tags
3. **Case Search** - Search across all cases
4. **Case Export** - Export analyzed cases with annotations
5. **Case Templates** - Create case templates for common scenarios
6. **Case Sharing** - Share cases with team members
7. **Cloud Integration** - Sync cases to cloud storage

## Related Documentation

- **CASE_MANAGEMENT_COMPLETE.md** - Detailed implementation documentation
- **CROSS_EXTENSION_CASE_MANAGEMENT.md** - Architecture and design decisions
- **shared-core/README.md** - Shared core API documentation

## Summary

The Case Manager is **fully implemented but not activated**. Follow the steps above to integrate it into the VS Code extension. Once activated, users will have a powerful tool for managing and analyzing log case archives directly within VS Code.

For questions or issues, check the shared-core documentation or the implementation files in `vscode-extension/src/`.