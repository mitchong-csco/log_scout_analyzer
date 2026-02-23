# Command Implementations TODO

**Status**: 📝 Implementation Guide
**Priority**: HIGH - Commands are defined but not implemented

---

## Overview

The following 14 commands are now **defined** in `package.json` but need **handler implementations** in `extension.ts`.

Without implementations, commands will appear in the Command Palette but do nothing when executed.

---

## Implementation Location

**File**: `vscode-extension/src/extension.ts`

**Section**: Inside the `activate()` function, add to `context.subscriptions.push(...)`

---

## Commands to Implement

### 1. logScoutAnalyzer.showConsole

**Purpose**: Show the extension's output channel

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.showConsole', () => {
  outputChannel.show();
})
```

**Complexity**: ⭐ Trivial
**Dependencies**: `outputChannel` variable

---

### 2. logScoutAnalyzer.clearCache

**Purpose**: Clear cached log files and metadata

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.clearCache', async () => {
  try {
    // TODO: Clear cache directory
    // Path: ~/.log-scout-analyzer/cache/ or similar
    const cacheDir = path.join(os.homedir(), '.log-scout-analyzer', 'cache');
    
    if (fs.existsSync(cacheDir)) {
      await fs.promises.rm(cacheDir, { recursive: true, force: true });
      await fs.promises.mkdir(cacheDir, { recursive: true });
      
      vscode.window.showInformationMessage('✅ Cache cleared successfully');
      
      // Refresh cache tree view if exists
      cachedFilesProvider?.refresh();
    } else {
      vscode.window.showInformationMessage('Cache is already empty');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to clear cache: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐ Simple
**Dependencies**: `fs`, `path`, `os`, `cachedFilesProvider`

---

### 3. logScoutAnalyzer.viewCacheMetadata

**Purpose**: Display cache statistics and metadata

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.viewCacheMetadata', async () => {
  try {
    const cacheDir = path.join(os.homedir(), '.log-scout-analyzer', 'cache');
    
    if (!fs.existsSync(cacheDir)) {
      vscode.window.showInformationMessage('No cache metadata available');
      return;
    }
    
    // Count files and calculate size
    let fileCount = 0;
    let totalSize = 0;
    
    const files = await fs.promises.readdir(cacheDir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(cacheDir, file.toString());
      const stat = await fs.promises.stat(filePath);
      if (stat.isFile()) {
        fileCount++;
        totalSize += stat.size;
      }
    }
    
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    const message = `📊 Cache Metadata\n\n` +
      `Files: ${fileCount}\n` +
      `Total Size: ${sizeInMB} MB\n` +
      `Location: ${cacheDir}`;
    
    vscode.window.showInformationMessage(message, 'Open Location').then(choice => {
      if (choice === 'Open Location') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(cacheDir));
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to read cache metadata: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐ Medium
**Dependencies**: `fs`, `path`, `os`

---

### 4. logScoutAnalyzer.downloadCase

**Purpose**: Download a support case from remote system

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.downloadCase', async () => {
  // Prompt for case number
  const caseNumber = await vscode.window.showInputBox({
    prompt: 'Enter case number',
    placeHolder: 'e.g., CS123456',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Case number is required';
      }
      return null;
    }
  });
  
  if (!caseNumber) {
    return; // User cancelled
  }
  
  try {
    // TODO: Implement case download logic
    // This would typically involve:
    // 1. API call to case management system
    // 2. Download logs as zip
    // 3. Extract to workspace
    // 4. Refresh bundles view
    
    vscode.window.showInformationMessage(
      `Downloading case ${caseNumber}...`,
      'Feature coming soon!'
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to download case: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐⭐⭐ Complex (requires API integration)
**Dependencies**: API client, authentication, case management system

---

### 5. logScoutAnalyzer.importCase

**Purpose**: Import a case from local archive file

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.importCase', async () => {
  const files = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: {
      'Archives': ['zip', 'tar', 'tar.gz', 'tgz'],
      'All Files': ['*']
    },
    openLabel: 'Import Case'
  });
  
  if (!files || files.length === 0) {
    return;
  }
  
  const archivePath = files[0].fsPath;
  
  try {
    // TODO: Extract archive and create bundle
    // This is similar to logScoutAnalyzer.importArchive
    // but specifically for case files
    
    vscode.window.showInformationMessage(`Importing case from ${path.basename(archivePath)}...`);
    
    // Call existing import logic if available
    await vscode.commands.executeCommand('logScoutAnalyzer.importArchive', archivePath);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to import case: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐⭐ Complex (archive extraction)
**Dependencies**: Archive extraction library, bundle management

---

### 6. logScoutAnalyzer.refreshCases

**Purpose**: Refresh the cases tree view

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.refreshCases', () => {
  casesTreeProvider?.refresh();
  vscode.window.showInformationMessage('Cases refreshed');
})
```

**Complexity**: ⭐ Trivial
**Dependencies**: `casesTreeProvider`

---

### 7. logScoutAnalyzer.bundle.openDashboard

**Purpose**: Open analysis dashboard for a bundle

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.bundle.openDashboard', async (bundleItem) => {
  if (!bundleItem) {
    vscode.window.showErrorMessage('No bundle selected');
    return;
  }
  
  try {
    // Create or show dashboard webview
    const panel = vscode.window.createWebviewPanel(
      'bundleDashboard',
      `Dashboard: ${bundleItem.label}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
    
    // TODO: Load dashboard HTML from webview/dashboard.html
    panel.webview.html = getDashboardHtml(bundleItem);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open dashboard: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐⭐ Complex (webview)
**Dependencies**: Webview HTML, bundle data

---

### 8. logScoutAnalyzer.showCacheData

**Purpose**: Show detailed cache data for a result

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.showCacheData', async (resultItem) => {
  if (!resultItem) {
    vscode.window.showErrorMessage('No result selected');
    return;
  }
  
  try {
    // Display cache information in a quick pick or info message
    const cacheData = {
      file: resultItem.file,
      line: resultItem.line,
      severity: resultItem.severity,
      message: resultItem.message,
      timestamp: resultItem.timestamp || 'N/A',
      pattern: resultItem.patternName || 'Unknown'
    };
    
    const message = Object.entries(cacheData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    vscode.window.showInformationMessage(message);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show cache data: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐ Simple
**Dependencies**: Result item structure

---

### 9. logScoutAnalyzer.openCachedFile

**Purpose**: Open a cached file in the editor

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.openCachedFile', async (fileItem) => {
  if (!fileItem || !fileItem.resourceUri) {
    vscode.window.showErrorMessage('No file selected');
    return;
  }
  
  try {
    const document = await vscode.workspace.openTextDocument(fileItem.resourceUri);
    await vscode.window.showTextDocument(document);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
  }
})
```

**Complexity**: ⭐ Trivial
**Dependencies**: File tree item with resourceUri

---

### 10. logScoutAnalyzer.openFileInEditor

**Purpose**: Open file in editor (alternative to openCachedFile)

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.openFileInEditor', async (fileItem) => {
  // Same as openCachedFile - might be duplicate functionality
  await vscode.commands.executeCommand('logScoutAnalyzer.openCachedFile', fileItem);
})
```

**Complexity**: ⭐ Trivial
**Dependencies**: openCachedFile command

---

### 11. logScoutAnalyzer.revealInExplorer

**Purpose**: Reveal file in system file explorer

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.revealInExplorer', async (fileItem) => {
  if (!fileItem || !fileItem.resourceUri) {
    vscode.window.showErrorMessage('No file selected');
    return;
  }
  
  try {
    await vscode.commands.executeCommand('revealFileInOS', fileItem.resourceUri);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reveal file: ${error.message}`);
  }
})
```

**Complexity**: ⭐ Trivial
**Dependencies**: VS Code built-in command

---

### 12. logScoutAnalyzer.removeCachedFile

**Purpose**: Remove a file from cache

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.removeCachedFile', async (fileItem) => {
  if (!fileItem || !fileItem.resourceUri) {
    vscode.window.showErrorMessage('No file selected');
    return;
  }
  
  const fileName = path.basename(fileItem.resourceUri.fsPath);
  const confirm = await vscode.window.showWarningMessage(
    `Remove "${fileName}" from cache?`,
    { modal: true },
    'Remove'
  );
  
  if (confirm !== 'Remove') {
    return;
  }
  
  try {
    await fs.promises.unlink(fileItem.resourceUri.fsPath);
    vscode.window.showInformationMessage(`Removed ${fileName} from cache`);
    
    // Refresh cache view
    cachedFilesProvider?.refresh();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to remove file: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐ Simple
**Dependencies**: `fs`, `path`, `cachedFilesProvider`

---

### 13. logScoutAnalyzer.openInNewWindow

**Purpose**: Open current file in a new VS Code window

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.openInNewWindow', async (fileItem) => {
  if (!fileItem || !fileItem.resourceUri) {
    // Use active editor if no item passed
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No file to open');
      return;
    }
    fileItem = { resourceUri: activeEditor.document.uri };
  }
  
  try {
    await vscode.commands.executeCommand('vscode.openWith', fileItem.resourceUri, 'default', {
      viewColumn: vscode.ViewColumn.Active,
      preview: false
    });
    
    // Then open in new window
    await vscode.commands.executeCommand('workbench.action.files.newUntitledFile');
    await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open in new window: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐ Medium
**Dependencies**: VS Code window management

---

### 14. logScoutAnalyzer.patterns.createOverrideFromDiagnostic

**Purpose**: Create pattern override from a diagnostic (right-click on squiggle)

**Implementation**:
```typescript
vscode.commands.registerCommand('logScoutAnalyzer.patterns.createOverrideFromDiagnostic', async () => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }
  
  const position = activeEditor.selection.active;
  const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri);
  
  // Find diagnostic at cursor position
  const diagnostic = diagnostics.find(d => d.range.contains(position));
  
  if (!diagnostic) {
    vscode.window.showWarningMessage('No diagnostic found at cursor position');
    return;
  }
  
  try {
    // Get the text that triggered the diagnostic
    const text = activeEditor.document.getText(diagnostic.range);
    
    // Prompt for override action
    const action = await vscode.window.showQuickPick([
      { label: 'Suppress this diagnostic', value: 'suppress' },
      { label: 'Change severity', value: 'severity' },
      { label: 'Create custom pattern', value: 'custom' }
    ], {
      placeHolder: 'What would you like to do?'
    });
    
    if (!action) {
      return;
    }
    
    // TODO: Implement pattern override creation
    // This should call the pattern override system
    vscode.window.showInformationMessage(`Creating override for: "${text}"`);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create override: ${error.message}`);
  }
})
```

**Complexity**: ⭐⭐⭐⭐ Complex (pattern system integration)
**Dependencies**: Pattern override system, diagnostics API

---

## Implementation Template

Add this to `extension.ts` in the `activate()` function:

```typescript
export function activate(context: vscode.ExtensionContext) {
  // ... existing code ...

  // Register all commands
  context.subscriptions.push(
    // Existing commands...
    
    // NEW COMMANDS - Add these:
    vscode.commands.registerCommand('logScoutAnalyzer.showConsole', () => {
      outputChannel.show();
    }),
    
    vscode.commands.registerCommand('logScoutAnalyzer.clearCache', async () => {
      // Implementation here
    }),
    
    // ... add all 14 commands ...
  );
}
```

---

## Priority Order

**Phase 1 - Trivial** (Do first):
1. ✅ showConsole
2. ✅ refreshCases
3. ✅ openCachedFile
4. ✅ openFileInEditor
5. ✅ revealInExplorer

**Phase 2 - Simple** (Do next):
6. ✅ clearCache
7. ✅ removeCachedFile
8. ✅ showCacheData

**Phase 3 - Medium** (Then do):
9. ✅ viewCacheMetadata
10. ✅ openInNewWindow

**Phase 4 - Complex** (Do last):
11. ⏳ importCase
12. ⏳ bundle.openDashboard
13. ⏳ patterns.createOverrideFromDiagnostic

**Phase 5 - Requires External APIs**:
14. ⏳ downloadCase (needs case management system API)

---

## Testing Each Command

After implementing, test each command:

1. Open Command Palette (Ctrl+Shift+P)
2. Type "Scout: [command name]"
3. Execute command
4. Verify expected behavior
5. Check for error messages
6. Verify UI updates (if applicable)

---

## Error Handling Pattern

Use this pattern for all commands:

```typescript
vscode.commands.registerCommand('commandName', async (arg) => {
  try {
    // Validate inputs
    if (!arg) {
      vscode.window.showErrorMessage('Required argument missing');
      return;
    }
    
    // Do work
    const result = await doSomething(arg);
    
    // Show success
    vscode.window.showInformationMessage('Operation completed');
    
    // Update UI
    someProvider?.refresh();
    
  } catch (error) {
    // Log error
    outputChannel.appendLine(`Error in commandName: ${error.message}`);
    
    // Show user-friendly message
    vscode.window.showErrorMessage(`Failed: ${error.message}`);
  }
})
```

---

## Dependencies Checklist

Make sure these variables/providers exist in `extension.ts`:

- [ ] `outputChannel` - Output channel for logging
- [ ] `cachedFilesProvider` - Tree provider for cached files
- [ ] `casesTreeProvider` - Tree provider for cases
- [ ] `bundlesTreeProvider` - Tree provider for bundles
- [ ] `patternsProvider` - Pattern override manager

---

## Summary

- **Total Commands**: 14
- **Trivial**: 5 (can implement in 30 minutes)
- **Simple**: 3 (can implement in 1 hour)
- **Medium**: 2 (can implement in 2 hours)
- **Complex**: 4 (require significant work)

**Estimated Total Time**: 4-8 hours depending on complexity

Start with Phase 1 (trivial commands) to get quick wins, then work through the phases.

---

**Last Updated**: 2025-01-XX
**Status**: Ready for implementation