# Phase 2: Pattern Override UI Implementation Plan

## Executive Summary

Phase 2 focuses on building a user-friendly VSCode UI for the Pattern Override System. All backend functionality is complete in Phase 1, including the Rust LSP server pattern loader and override merger. This phase will create intuitive UI components, commands, and workflows to make pattern override management accessible to all users.

**Status:** Ready to Begin  
**Estimated Duration:** 3-4 days  
**Prerequisites:** Phase 1 Complete ✅

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current State Assessment](#current-state-assessment)
3. [Implementation Phases](#implementation-phases)
4. [Detailed Task Breakdown](#detailed-task-breakdown)
5. [UI/UX Design Specifications](#uiux-design-specifications)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)
8. [Documentation Requirements](#documentation-requirements)
9. [Success Criteria](#success-criteria)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     VSCode Extension Layer                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐        ┌──────────────────────┐   │
│  │ Command Palette     │        │  Context Menus       │   │
│  │ - Create Override   │        │  - Right-click menu  │   │
│  │ - Edit Override     │        │  - Inline actions    │   │
│  │ - Delete Override   │        │  - Quick actions     │   │
│  └─────────────────────┘        └──────────────────────┘   │
│                                                               │
│  ┌─────────────────────┐        ┌──────────────────────┐   │
│  │ TreeView Provider   │        │  WebView Panels      │   │
│  │ - Pattern browser   │        │  - Visual editor     │   │
│  │ - Override manager  │        │  - Pattern preview   │   │
│  │ - Custom patterns   │        │  - Testing UI        │   │
│  └─────────────────────┘        └──────────────────────┘   │
│                                                               │
│  ┌─────────────────────┐        ┌──────────────────────┐   │
│  │ Status Bar          │        │  Quick Input Dialogs │   │
│  │ - Override count    │        │  - Simple forms      │   │
│  │ - Active/Inactive   │        │  - Field validation  │   │
│  │ - Quick toggle      │        │  - Multi-step wizard │   │
│  └─────────────────────┘        └──────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│              PatternOverrideManager (Existing)               │
│  - CRUD operations                                           │
│  - File I/O                                                  │
│  - Validation                                                │
├─────────────────────────────────────────────────────────────┤
│                  LSP Client Communication                    │
│  - Request pattern reload                                    │
│  - Trigger re-analysis                                       │
│  - Sync with LSP server                                      │
├─────────────────────────────────────────────────────────────┤
│                    Rust LSP Server (Phase 1)                 │
│  - Pattern loading & merging                                 │
│  - Hot-reload support                                        │
│  - Override application                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State Assessment

### ✅ What We Have (Phase 1)

1. **Backend (`PatternOverrideManager.ts`)**
   - Full CRUD operations for overrides and custom patterns
   - JSON file storage (workspace and user-level)
   - Import/export functionality
   - Statistics and reporting
   - Enable/disable pattern support
   - Severity triggers and conditional logic

2. **LSP Server (`pattern_loader.rs`)**
   - Pattern override loading
   - Pattern merging logic
   - Custom pattern support
   - Hot-reload capabilities
   - 15 comprehensive unit tests

3. **Documentation**
   - User guide
   - Technical progress report
   - Quick reference
   - Example override files

### ❌ What We Need (Phase 2)

1. **Command Palette Integration**
   - No commands registered for pattern override operations
   - Need user-friendly command names and categories

2. **TreeView Provider**
   - No visual pattern browser
   - No override management UI

3. **Context Menus**
   - No right-click actions for diagnostics
   - No inline override creation

4. **Visual Editors**
   - No form-based override editor
   - No regex testing UI
   - No pattern preview

5. **Status Bar**
   - No override status indicator
   - No quick access to override management

6. **LSP Integration**
   - No command to trigger pattern reload
   - No automatic re-analysis after override changes

---

## Implementation Phases

### Phase 2.1: Foundation & Commands (Day 1)
- Register command palette commands
- Implement basic CRUD UI flows
- Add status bar indicator
- Create simple input dialogs

### Phase 2.2: TreeView & Context Menus (Day 2)
- Build pattern override TreeView
- Add context menu actions
- Implement diagnostic quick fixes
- Create pattern browser

### Phase 2.3: Visual Editors & WebViews (Day 3)
- Design and build override editor WebView
- Add regex testing UI
- Implement pattern preview
- Create validation and feedback

### Phase 2.4: LSP Integration & Polish (Day 4)
- Integrate LSP reload command
- Implement auto-reload after changes
- Add keyboard shortcuts
- Polish UX and add animations
- Write integration tests

---

## Detailed Task Breakdown

### 2.1 Foundation & Commands

#### Task 2.1.1: Register Command Palette Commands
**File:** `package.json`

Add commands:
```json
{
  "command": "logScoutAnalyzer.patterns.createOverride",
  "title": "Scout Patterns: Create Override from Diagnostic"
},
{
  "command": "logScoutAnalyzer.patterns.createCustom",
  "title": "Scout Patterns: Create Custom Pattern"
},
{
  "command": "logScoutAnalyzer.patterns.editOverride",
  "title": "Scout Patterns: Edit Override"
},
{
  "command": "logScoutAnalyzer.patterns.deleteOverride",
  "title": "Scout Patterns: Delete Override"
},
{
  "command": "logScoutAnalyzer.patterns.togglePattern",
  "title": "Scout Patterns: Enable/Disable Pattern"
},
{
  "command": "logScoutAnalyzer.patterns.showManager",
  "title": "Scout Patterns: Open Pattern Manager"
},
{
  "command": "logScoutAnalyzer.patterns.importOverrides",
  "title": "Scout Patterns: Import Overrides"
},
{
  "command": "logScoutAnalyzer.patterns.exportOverrides",
  "title": "Scout Patterns: Export Overrides"
},
{
  "command": "logScoutAnalyzer.patterns.reloadPatterns",
  "title": "Scout Patterns: Reload Patterns from LSP"
},
{
  "command": "logScoutAnalyzer.patterns.showStats",
  "title": "Scout Patterns: Show Statistics"
}
```

**Activation Events:**
```json
"onCommand:logScoutAnalyzer.patterns.createOverride",
"onCommand:logScoutAnalyzer.patterns.showManager"
```

#### Task 2.1.2: Implement Command Handlers
**File:** `extension.ts`

```typescript
// Register all pattern override commands
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.createOverride',
    async () => {
      await createOverrideFromSelection(patternOverrideManager, lspClient);
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.createCustom',
    async () => {
      await createCustomPatternWizard(patternOverrideManager);
    }
  )
);

// ... more commands
```

#### Task 2.1.3: Create Status Bar Indicator
**File:** `extension.ts`

```typescript
// Status bar item showing override count and status
const patternStatusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);

function updatePatternStatusBar() {
  const stats = patternOverrideManager.getStats();
  const totalActive = stats.enabledOverrides + stats.enabledCustom;
  const totalInactive = 
    (stats.totalOverrides - stats.enabledOverrides) +
    (stats.totalCustom - stats.enabledCustom);
  
  patternStatusBarItem.text = `$(wrench) ${totalActive} patterns`;
  patternStatusBarItem.tooltip = 
    `Active: ${totalActive} | Inactive: ${totalInactive}\nClick to manage`;
  patternStatusBarItem.command = 'logScoutAnalyzer.patterns.showManager';
  patternStatusBarItem.show();
}
```

#### Task 2.1.4: Create Quick Input Dialogs
**New File:** `src/patternOverrideUI.ts`

```typescript
export async function createOverrideQuickInput(
  manager: PatternOverrideManager,
  diagnostic?: vscode.Diagnostic
): Promise<void> {
  // Multi-step quick input for creating overrides
  // Step 1: Choose pattern source (diagnostic or custom)
  // Step 2: Edit regex
  // Step 3: Set severity
  // Step 4: Add notes/reason
  // Step 5: Preview and confirm
}

export async function editOverrideQuickInput(
  manager: PatternOverrideManager,
  patternId: string
): Promise<void> {
  // Multi-step quick input for editing existing overrides
}

export async function customPatternWizard(
  manager: PatternOverrideManager
): Promise<void> {
  // Full wizard for creating custom patterns from scratch
}
```

---

### 2.2 TreeView & Context Menus

#### Task 2.2.1: Create Pattern Override TreeView
**New File:** `src/patternOverrideTreeProvider.ts`

```typescript
export class PatternOverrideTreeProvider implements vscode.TreeDataProvider<PatternTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<PatternTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private manager: PatternOverrideManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PatternTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: PatternTreeItem): Promise<PatternTreeItem[]> {
    if (!element) {
      // Root level: Show categories
      return [
        new PatternTreeItem('Overrides', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new PatternTreeItem('Custom Patterns', vscode.TreeItemCollapsibleState.Expanded, 'category'),
        new PatternTreeItem('Disabled', vscode.TreeItemCollapsibleState.Collapsed, 'category')
      ];
    } else if (element.type === 'category') {
      // Show patterns in category
      return this.getPatternsForCategory(element.label as string);
    }
    return [];
  }

  private getPatternsForCategory(category: string): PatternTreeItem[] {
    // Implementation
  }
}

class PatternTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: 'category' | 'pattern'
  ) {
    super(label, collapsibleState);

    if (type === 'pattern') {
      this.contextValue = 'pattern';
      this.iconPath = new vscode.ThemeIcon('symbol-property');
    }
  }
}
```

**Register TreeView in `package.json`:**
```json
{
  "id": "scoutPatternOverrides",
  "name": "Pattern Overrides",
  "icon": "$(edit)",
  "contextualTitle": "Pattern Override Manager",
  "visibility": "visible"
}
```

#### Task 2.2.2: Add Context Menu Actions
**File:** `package.json`

```json
"menus": {
  "view/item/context": [
    {
      "command": "logScoutAnalyzer.patterns.editOverride",
      "when": "view == scoutPatternOverrides && viewItem == pattern",
      "group": "inline@1"
    },
    {
      "command": "logScoutAnalyzer.patterns.togglePattern",
      "when": "view == scoutPatternOverrides && viewItem == pattern",
      "group": "inline@2"
    },
    {
      "command": "logScoutAnalyzer.patterns.deleteOverride",
      "when": "view == scoutPatternOverrides && viewItem == pattern",
      "group": "destructive"
    }
  ],
  "editor/context": [
    {
      "command": "logScoutAnalyzer.patterns.createOverride",
      "when": "editorLangId == log && editorHasSelection",
      "group": "scout@1"
    }
  ]
}
```

#### Task 2.2.3: Implement Diagnostic Quick Fixes
**New File:** `src/patternOverrideCodeActions.ts`

```typescript
export class PatternOverrideCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private manager: PatternOverrideManager) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      // Add "Override Pattern" action
      const overrideAction = new vscode.CodeAction(
        'Override Pattern Severity',
        vscode.CodeActionKind.QuickFix
      );
      overrideAction.command = {
        command: 'logScoutAnalyzer.patterns.createOverride',
        title: 'Create Override',
        arguments: [diagnostic]
      };
      actions.push(overrideAction);

      // Add "Disable Pattern" action
      const disableAction = new vscode.CodeAction(
        'Disable This Pattern',
        vscode.CodeActionKind.QuickFix
      );
      disableAction.command = {
        command: 'logScoutAnalyzer.patterns.disablePattern',
        title: 'Disable Pattern',
        arguments: [diagnostic]
      };
      actions.push(disableAction);
    }

    return actions;
  }
}
```

---

### 2.3 Visual Editors & WebViews

#### Task 2.3.1: Create Pattern Override Editor WebView
**New File:** `src/patternOverrideEditor.ts`

```typescript
export class PatternOverrideEditor {
  private static currentPanel: vscode.WebviewPanel | undefined;

  public static async show(
    context: vscode.ExtensionContext,
    manager: PatternOverrideManager,
    patternId?: string
  ): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PatternOverrideEditor.currentPanel) {
      PatternOverrideEditor.currentPanel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'patternOverrideEditor',
      'Pattern Override Editor',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'media')
        ]
      }
    );

    PatternOverrideEditor.currentPanel = panel;
    panel.webview.html = this.getWebviewContent(panel.webview, context.extensionUri);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'save':
            await this.saveOverride(manager, message.data);
            break;
          case 'test':
            await this.testPattern(message.data);
            break;
          case 'cancel':
            panel.dispose();
            break;
        }
      }
    );

    panel.onDidDispose(() => {
      PatternOverrideEditor.currentPanel = undefined;
    });

    // Load existing pattern if editing
    if (patternId) {
      const pattern = manager.getPattern(patternId);
      panel.webview.postMessage({ command: 'load', data: pattern });
    }
  }

  private static getWebviewContent(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    // Return HTML for the editor UI
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pattern Override Editor</title>
  <style>
    body {
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
    }
    input, textarea, select {
      width: 100%;
      padding: 8px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
    }
    textarea {
      min-height: 100px;
      font-family: 'Courier New', monospace;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
    }
    .primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .test-results {
      margin-top: 10px;
      padding: 10px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Pattern Override Editor</h1>
  
  <form id="patternForm">
    <div class="form-group">
      <label for="name">Pattern Name</label>
      <input type="text" id="name" required>
    </div>

    <div class="form-group">
      <label for="regex">Regular Expression</label>
      <textarea id="regex" required></textarea>
      <button type="button" class="secondary" onclick="testRegex()">Test Regex</button>
      <div id="testResults" class="test-results" style="display: none;"></div>
    </div>

    <div class="form-group">
      <label for="severity">Severity</label>
      <select id="severity">
        <option value="error">Error</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
        <option value="hint">Hint</option>
      </select>
    </div>

    <div class="form-group">
      <label for="category">Category</label>
      <input type="text" id="category" placeholder="e.g., network, auth, database">
    </div>

    <div class="form-group">
      <label for="notes">Notes (Why this override?)</label>
      <textarea id="notes"></textarea>
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" id="enabled" checked>
        Pattern Enabled
      </label>
    </div>

    <div class="button-group">
      <button type="submit" class="primary">Save Override</button>
      <button type="button" class="secondary" onclick="cancel()">Cancel</button>
    </div>
  </form>

  <script>
    const vscode = acquireVsCodeApi();

    document.getElementById('patternForm').addEventListener('submit', (e) => {
      e.preventDefault();
      savePattern();
    });

    function savePattern() {
      const data = {
        name: document.getElementById('name').value,
        regex: document.getElementById('regex').value,
        severity: document.getElementById('severity').value,
        category: document.getElementById('category').value.split(',').map(s => s.trim()),
        notes: document.getElementById('notes').value,
        enabled: document.getElementById('enabled').checked
      };
      vscode.postMessage({ command: 'save', data });
    }

    function testRegex() {
      const regex = document.getElementById('regex').value;
      vscode.postMessage({ command: 'test', data: { regex } });
    }

    function cancel() {
      vscode.postMessage({ command: 'cancel' });
    }

    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.command) {
        case 'load':
          loadPattern(message.data);
          break;
        case 'testResults':
          showTestResults(message.data);
          break;
      }
    });

    function loadPattern(pattern) {
      document.getElementById('name').value = pattern.name || '';
      document.getElementById('regex').value = pattern.regex || '';
      document.getElementById('severity').value = pattern.severity || 'info';
      document.getElementById('category').value = (pattern.category || []).join(', ');
      document.getElementById('notes').value = pattern.notes || '';
      document.getElementById('enabled').checked = pattern.enabled !== false;
    }

    function showTestResults(results) {
      const resultsDiv = document.getElementById('testResults');
      resultsDiv.style.display = 'block';
      resultsDiv.textContent = JSON.stringify(results, null, 2);
    }
  </script>
</body>
</html>`;
  }

  private static async saveOverride(
    manager: PatternOverrideManager,
    data: any
  ): Promise<void> {
    try {
      // Save the override
      const override = await manager.createCustomPattern(data);
      vscode.window.showInformationMessage(
        `Pattern override "${data.name}" saved successfully`
      );
      
      // Trigger reload
      vscode.commands.executeCommand('logScoutAnalyzer.patterns.reloadPatterns');
      
      this.currentPanel?.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save override: ${error}`);
    }
  }

  private static async testPattern(data: any): Promise<void> {
    // Test regex against sample text
    try {
      const regex = new RegExp(data.regex);
      const results = {
        valid: true,
        message: 'Regex is valid',
        // Add test against current document if available
      };
      this.currentPanel?.webview.postMessage({
        command: 'testResults',
        data: results
      });
    } catch (error) {
      this.currentPanel?.webview.postMessage({
        command: 'testResults',
        data: { valid: false, error: String(error) }
      });
    }
  }
}
```

---

### 2.4 LSP Integration & Polish

#### Task 2.4.1: Add LSP Reload Command
**File:** `lsp-server/src/main.rs`

Add command execution capability:

```rust
use tower_lsp::lsp_types::ExecuteCommandOptions;

// In server capabilities
let capabilities = ServerCapabilities {
    // ... existing capabilities
    execute_command_provider: Some(ExecuteCommandOptions {
        commands: vec![
            "logScout.reloadPatterns".to_string(),
            "logScout.analyzeDocument".to_string(),
        ],
        ..Default::default()
    }),
};

// In backend implementation
async fn execute_command(&self, params: ExecuteCommandParams) -> Result<Option<Value>> {
    match params.command.as_str() {
        "logScout.reloadPatterns" => {
            self.reload_patterns().await?;
            self.client.log_message(MessageType::INFO, "Patterns reloaded").await;
            Ok(None)
        }
        "logScout.analyzeDocument" => {
            if let Some(uri) = params.arguments.get(0) {
                let uri = serde_json::from_value(uri.clone())?;
                self.analyze_document(uri).await?;
            }
            Ok(None)
        }
        _ => Ok(None)
    }
}

async fn reload_patterns(&self) -> Result<()> {
    // Reload patterns from override files
    let workspace_path = self.workspace_path.read().await;
    let patterns = load_patterns_with_overrides(workspace_path.as_deref())?;
    
    let mut pattern_store = self.patterns.write().await;
    *pattern_store = patterns;
    
    Ok(())
}
```

#### Task 2.4.2: Implement Auto-reload on Save
**File:** `extension.ts`

```typescript
// Watch for changes to pattern override files
const overrideFileWatcher = vscode.workspace.createFileSystemWatcher(
  '**/.log-scout/pattern-overrides.json'
);

overrideFileWatcher.onDidChange(async (uri) => {
  outputChannel.appendLine(`Pattern override file changed: ${uri.fsPath}`);
  
  // Reload patterns in LSP server
  await lspClient.sendRequest('workspace/executeCommand', {
    command: 'logScout.reloadPatterns',
    arguments: []
  });
  
  // Re-analyze all open log documents
  const logDocuments = vscode.workspace.textDocuments.filter(
    doc => doc.languageId === 'log'
  );
  
  for (const doc of logDocuments) {
    await lspClient.sendRequest('workspace/executeCommand', {
      command: 'logScout.analyzeDocument',
      arguments: [doc.uri.toString()]
    });
  }
  
  // Update UI
  updatePatternStatusBar();
  patternOverrideTreeProvider?.refresh();
  
  vscode.window.showInformationMessage('Patterns reloaded');
});

context.subscriptions.push(overrideFileWatcher);
```

#### Task 2.4.3: Add Keyboard Shortcuts
**File:** `package.json`

```json
"keybindings": [
  {
    "command": "logScoutAnalyzer.patterns.createOverride",
    "key": "ctrl+k ctrl+o",
    "mac": "cmd+k cmd+o",
    "when": "editorLangId == log"
  },
  {
    "command": "logScoutAnalyzer.patterns.showManager",
    "key": "ctrl+k ctrl+p",
    "mac": "cmd+k cmd+p"
  },
  {
    "command": "logScoutAnalyzer.patterns.reloadPatterns",
    "key": "ctrl+k ctrl+r",
    "mac": "cmd+k cmd+r"
  }
]
```

#### Task 2.4.4: Add Notifications and Feedback
**New File:** `src/patternOverrideNotifications.ts`

```typescript
export class PatternOverrideNotifications {
  private static statusBarItem: vscode.StatusBarItem;

  static initialize(context: vscode.ExtensionContext) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    context.subscriptions.push(this.statusBarItem);
  }

  static async showOverrideCreated(patternName: string) {
    const action = await vscode.window.showInformationMessage(
      `Pattern override "${patternName}" created`,
      'Open Manager',
      'Dismiss'
    );

    if (action === 'Open Manager') {
      vscode.commands.executeCommand('logScoutAnalyzer.patterns.showManager');
    }
  }

  static async showReloadProgress() {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Reloading patterns...',
        cancellable: false
      },
      async (progress) => {
        progress.report({ increment: 0 });
        await new Promise(resolve => setTimeout(resolve, 500));
        progress.report({ increment: 50, message: 'Applying overrides...' });
        await new Promise(resolve => setTimeout(resolve, 500));
        progress.report({ increment: 100, message: 'Complete' });
      }
    );
  }

  static showPatternStats(stats: any) {
    const message = `Patterns: ${stats.enabledOverrides + stats.enabledCustom} active, ` +
                   `${stats.totalOverrides - stats.enabledOverrides + stats.totalCustom - stats.enabledCustom} disabled`;
    
    this.statusBarItem.text = `$(wrench) ${stats.enabledOverrides + stats.enabledCustom}`;
    this.statusBarItem.tooltip = message;
    this.statusBarItem.command = 'logScoutAnalyzer.patterns.showManager';
    this.statusBarItem.show();
  }
}
```

---

## UI/UX Design Specifications

### Color Scheme & Icons

- **Overrides:** `$(edit)` icon, blue accent
- **Custom Patterns:** `$(add)` icon, green accent
- **Disabled Patterns:** `$(circle-slash)` icon, gray/muted
- **Active Patterns:** `$(check)` icon, theme accent color

### Interaction Patterns

1. **Creating Overrides:**
   - Right-click diagnostic → "Override Pattern"
   - Command palette → "Create Override"
   - Quick input flow with validation
   - Preview before saving

2. **Editing Overrides:**
   - Click pattern in TreeView → Opens editor
   - Inline edit buttons
   - Live regex testing
   - Undo/redo support

3. **Managing Patterns:**
   - TreeView with categories
   - Search/filter functionality
   - Bulk enable/disable
   - Drag-and-drop reordering (future)

### Responsive Design

- TreeView collapses categories to save space
- WebView adapts to panel width
- Status bar updates in real-time
- Notifications are non-intrusive

---

## Integration Points

### 1. Extension ↔ PatternOverrideManager
- All UI components use the existing manager
- No direct file I/O from UI code
- Manager handles validation and persistence

### 2. Extension ↔ LSP Client
- Commands trigger LSP reload
- LSP notifies extension of changes
- Diagnostics updated automatically

### 3. TreeView ↔ WebView
- Clicking TreeView item can open WebView editor
- Changes in WebView refresh TreeView
- Synchronized state management

### 4. Status Bar ↔ All Components
- Status bar reflects current state
- Clicking opens pattern manager
- Updates on any pattern change

---

## Testing Strategy

### Unit Tests

1. **PatternOverrideManager Tests** ✅ (Complete in Phase 1)
   - CRUD operations
   - File I/O
   - Validation
   - Edge cases

2. **UI Component Tests** (Phase 2)
   - Command registration
   - TreeView data provider
   - WebView message handling
   - Status bar updates

### Integration Tests

1. **End-to-End Override Creation**
   - User creates override via UI
   - File is saved correctly
   - LSP server reloads patterns
   - Diagnostics are updated

2. **Pattern Manager Workflow**
   - User opens pattern manager
   - Views existing overrides
   - Edits an override
   - Changes are persisted

3. **Import/Export Flow**
   - User exports patterns
   - File is created with correct format
   - User imports patterns
   - Patterns are loaded correctly

### Manual Testing Checklist

- [ ] Create override from diagnostic
- [ ] Create custom pattern from scratch
- [ ] Edit existing override
- [ ] Delete override
- [ ] Enable/disable pattern
- [ ] Import patterns from file
- [ ] Export patterns to file
- [ ] Reload patterns via command
- [ ] Test regex in editor
- [ ] View pattern statistics
- [ ] Status bar updates correctly
- [ ] TreeView reflects changes
- [ ] Context menus work
- [ ] Keyboard shortcuts work
- [ ] LSP integration works
- [ ] Auto-reload on file save

---

## Documentation Requirements

### User Documentation

1. **Pattern Override Guide** (Update existing)
   - Add UI screenshots
   - Document all commands
   - Explain workflows
   - Add troubleshooting section

2. **Video Tutorial** (Optional)
   - 5-minute walkthrough
   - Creating an override
   - Managing patterns
   - Best practices

3. **Quick Reference Card** (Update existing)
   - Keyboard shortcuts
   - Command palette commands
   - Common workflows

### Developer Documentation

1. **Architecture Guide**
   - Component interaction diagram
   - State management flow
   - WebView communication protocol
   - LSP integration details

2. **Extension API**
   - PatternOverrideManager API reference
   - Command interface
   - TreeView provider interface
   - WebView message protocol

3. **Testing Guide**
   - How to run tests
   - How to add new tests
   - Test coverage expectations

---

## Success Criteria

### Must Have (MVP)

- [x] Backend pattern override system working (Phase 1)
- [ ] Command palette integration for all CRUD operations
- [ ] TreeView showing overrides and custom patterns
- [ ] Status bar indicator with pattern count
- [ ] Basic override editor (Quick Input or WebView)
- [ ] LSP reload integration
- [ ] Context menu actions for diagnostics
- [ ] Import/export functionality accessible via UI
- [ ] Documentation updated with UI instructions

### Should Have

- [ ] Visual WebView editor with regex testing
- [ ] Drag-and-drop pattern reordering
- [ ] Search/filter in TreeView
- [ ] Pattern preview before saving
- [ ] Keyboard shortcuts
- [ ] Auto-reload on file changes
- [ ] Comprehensive notifications

### Nice to Have

- [ ] Pattern templates library
- [ ] Regex syntax highlighting in editor
- [ ] Diff view for overrides vs original
- [ ] Pattern performance metrics
- [ ] Shareable pattern packs
- [ ] Collaborative pattern editing

---

## Risk Assessment & Mitigation

### Risk 1: WebView Complexity
**Impact:** High  
**Probability:** Medium

**Mitigation:**
- Start with Quick Input dialogs for MVP
- WebView can be added incrementally
- Reuse existing WebView patterns from project

### Risk 2: LSP Command Integration
**Impact:** High  
**Probability:** Low

**Mitigation:**
- LSP server already supports hot-reload
- Command execution is straightforward
- Fallback: File watcher triggers reload

### Risk 3: Performance with Many Patterns
**Impact:** Medium  
**Probability:** Low

**Mitigation:**
- Virtual scrolling in TreeView
- Lazy loading of pattern details
- Cache rendered items

### Risk 4: User Experience Complexity
**Impact:** Medium  
**Probability:** Medium

**Mitigation:**
- Follow VSCode UI patterns
- Progressive disclosure of features
- Comprehensive onboarding documentation

---

## Timeline & Milestones

### Day 1: Foundation & Commands
- **Morning:** Command registration, status bar, Quick Input dialogs
- **Afternoon:** Command handlers, basic override creation flow
- **Evening:** Testing, documentation

**Deliverable:** Working command palette integration

### Day 2: TreeView & Context Menus
- **Morning:** TreeView provider, data structure
- **Afternoon:** Context menu integration, code actions
- **Evening:** Testing, refinement

**Deliverable:** Visual pattern browser and management

### Day 3: Visual Editors & WebViews
- **Morning:** WebView editor design and implementation
- **Afternoon:** Regex testing UI, form validation
- **Evening:** Polish, edge cases

**Deliverable:** Rich visual editor for patterns

### Day 4: LSP Integration & Polish
- **Morning:** LSP command integration, auto-reload
- **Afternoon:** Keyboard shortcuts, notifications, final polish
- **Evening:** Integration testing, documentation

**Deliverable:** Complete Phase 2 feature set

---

## Next Steps After Phase 2

### Phase 3: Advanced Features (Optional)
- Pattern analytics and performance monitoring
- Advanced regex builder with visual tools
- Pattern recommendation engine
- Team collaboration features
- Pattern marketplace/sharing

### Phase 4: User Feedback & Iteration
- Beta testing with real users
- Collect feedback and metrics
- Iterate on UX based on usage patterns
- Performance optimization

---

## Appendix

### A. Command Reference

| Command | Shortcut | Description |
|---------|----------|-------------|
| `logScoutAnalyzer.patterns.createOverride` | `Ctrl+K Ctrl+O` | Create override from selection |
| `logScoutAnalyzer.patterns.createCustom` | - | Create custom pattern |
| `logScoutAnalyzer.patterns.editOverride` | - | Edit existing override |
| `logScoutAnalyzer.patterns.deleteOverride` | - | Delete override |
| `logScoutAnalyzer.patterns.togglePattern` | - | Enable/disable pattern |
| `logScoutAnalyzer.patterns.showManager` | `Ctrl+K Ctrl+P` | Open pattern manager |
| `logScoutAnalyzer.patterns.importOverrides` | - | Import patterns from file |
| `logScoutAnalyzer.patterns.exportOverrides` | - | Export patterns to file |
| `logScoutAnalyzer.patterns.reloadPatterns` | `Ctrl+K Ctrl+R` | Reload patterns from LSP |
| `logScoutAnalyzer.patterns.showStats` | - | Show pattern statistics |

### B. File Structure

```
vscode-extension/
├── src/
│   ├── extension.ts (updated)
│   ├── patternOverrideManager.ts (existing)
│   ├── patternOverrideUI.ts (new)
│   ├── patternOverrideTreeProvider.ts (new)
│   ├── patternOverrideEditor.ts (new)
│   ├── patternOverrideCodeActions.ts (new)
│   └── patternOverrideNotifications.ts (new)
├── package.json (updated)
└── README.md (updated)
```

### C. Data Flow Diagram

```
User Action
    ↓
Command/UI Event
    ↓
PatternOverrideManager (CRUD)
    ↓
JSON File (.log-scout/pattern-overrides.json)
    ↓
File Watcher Detects Change
    ↓
Extension sends LSP Command
    ↓
LSP Server Reloads Patterns
    ↓
LSP Server Re-analyzes Documents
    ↓
Diagnostics Updated
    ↓
UI Refreshes (TreeView, Status Bar, etc.)
```

---

## Conclusion

Phase 2 will transform the Pattern Override System from a backend feature into a user-friendly, fully-integrated VSCode experience. By building on the solid foundation of Phase 1, we can deliver a comprehensive UI that makes pattern management intuitive and accessible.

**Key Success Factors:**
1. Leverage existing `PatternOverrideManager` infrastructure
2. Follow VSCode UI patterns and best practices
3. Integrate seamlessly with LSP server
4. Provide immediate visual feedback
5. Maintain excellent documentation

**Ready to Begin!** 🚀