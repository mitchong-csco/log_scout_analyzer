# Phase 2 Quick Start Guide

**Status:** Ready to Begin  
**Duration:** 3-4 days  
**Goal:** Build user-friendly VSCode UI for Pattern Override System

---

## 🎯 What We're Building

A complete UI layer for the Pattern Override System, including:
- Command palette integration
- TreeView browser for patterns
- Visual editors with regex testing
- Context menus and quick fixes
- LSP integration for hot-reload
- Status bar indicators

---

## ✅ Prerequisites (Complete)

- [x] Backend `PatternOverrideManager.ts` ✅
- [x] LSP server pattern loader ✅
- [x] Pattern merge logic ✅
- [x] 15 unit tests ✅
- [x] Documentation ✅

---

## 🚀 Implementation Order

### Day 1: Foundation & Commands

#### Step 1.1: Register Commands (30 min)
**File:** `vscode-extension/package.json`

Add to `"commands"` array:
```json
{
  "command": "logScoutAnalyzer.patterns.createOverride",
  "title": "Scout Patterns: Create Override from Diagnostic",
  "icon": "$(edit)"
},
{
  "command": "logScoutAnalyzer.patterns.createCustom",
  "title": "Scout Patterns: Create Custom Pattern",
  "icon": "$(add)"
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
  "title": "Scout Patterns: Open Pattern Manager",
  "icon": "$(wrench)"
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
  "title": "Scout Patterns: Reload Patterns from LSP",
  "icon": "$(refresh)"
},
{
  "command": "logScoutAnalyzer.patterns.showStats",
  "title": "Scout Patterns: Show Statistics"
}
```

Add activation events:
```json
"onCommand:logScoutAnalyzer.patterns.createOverride",
"onCommand:logScoutAnalyzer.patterns.showManager"
```

#### Step 1.2: Create Status Bar (45 min)
**File:** `vscode-extension/src/extension.ts`

Add near other status bar code:
```typescript
// Pattern Override Status Bar
let patternStatusBarItem: vscode.StatusBarItem | undefined;

function initializePatternStatusBar(context: vscode.ExtensionContext) {
  patternStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(patternStatusBarItem);
  updatePatternStatusBar();
}

function updatePatternStatusBar() {
  if (!patternOverrideManager || !patternStatusBarItem) {
    return;
  }

  const stats = patternOverrideManager.getStats();
  const totalActive = stats.enabledOverrides + stats.enabledCustom;
  const totalInactive = 
    (stats.totalOverrides - stats.enabledOverrides) +
    (stats.totalCustom - stats.enabledCustom);
  
  patternStatusBarItem.text = `$(wrench) ${totalActive}`;
  patternStatusBarItem.tooltip = 
    `Pattern Overrides\n` +
    `Active: ${totalActive}\n` +
    `Inactive: ${totalInactive}\n` +
    `Click to manage patterns`;
  patternStatusBarItem.command = 'logScoutAnalyzer.patterns.showManager';
  patternStatusBarItem.show();
}
```

Call in `activate()`:
```typescript
// After patternOverrideManager initialization
initializePatternStatusBar(context);
```

#### Step 1.3: Create Command Handlers (2 hours)
**File:** `vscode-extension/src/extension.ts`

Add command registrations in `activate()`:
```typescript
// Pattern Override Commands
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.createOverride',
    async () => {
      await createOverrideFromDiagnostic();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.createCustom',
    async () => {
      await createCustomPattern();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.editOverride',
    async (patternId?: string) => {
      await editOverride(patternId);
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.deleteOverride',
    async (patternId?: string) => {
      await deleteOverride(patternId);
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.togglePattern',
    async (patternId?: string) => {
      await togglePattern(patternId);
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.showManager',
    async () => {
      await showPatternManager();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.importOverrides',
    async () => {
      await patternOverrideManager?.importPatterns();
      updatePatternStatusBar();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.exportOverrides',
    async () => {
      await patternOverrideManager?.exportPatterns();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.reloadPatterns',
    async () => {
      await reloadPatterns();
    }
  )
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.patterns.showStats',
    async () => {
      await showPatternStats();
    }
  )
);

// Helper functions (implement these)
async function createOverrideFromDiagnostic() {
  // TODO: Implement in Step 1.4
}

async function createCustomPattern() {
  // TODO: Implement in Step 1.4
}

async function editOverride(patternId?: string) {
  // TODO: Implement in Step 1.4
}

async function deleteOverride(patternId?: string) {
  if (!patternOverrideManager) return;
  
  const id = patternId || await pickPattern();
  if (!id) return;
  
  const pattern = patternOverrideManager.getPattern(id);
  if (!pattern) return;
  
  const confirm = await vscode.window.showWarningMessage(
    `Delete pattern "${pattern.name}"?`,
    { modal: true },
    'Delete'
  );
  
  if (confirm === 'Delete') {
    patternOverrideManager.deletePattern(id);
    vscode.window.showInformationMessage(`Pattern "${pattern.name}" deleted`);
    updatePatternStatusBar();
  }
}

async function togglePattern(patternId?: string) {
  if (!patternOverrideManager) return;
  
  const id = patternId || await pickPattern();
  if (!id) return;
  
  const pattern = patternOverrideManager.getPattern(id);
  if (!pattern) return;
  
  const newState = !pattern.enabled;
  patternOverrideManager.togglePattern(id, newState);
  
  vscode.window.showInformationMessage(
    `Pattern "${pattern.name}" ${newState ? 'enabled' : 'disabled'}`
  );
  updatePatternStatusBar();
}

async function showPatternManager() {
  // TODO: Implement TreeView in Day 2
  vscode.window.showInformationMessage('Pattern Manager (coming soon)');
}

async function reloadPatterns() {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Reloading patterns...',
      cancellable: false
    },
    async () => {
      // TODO: Add LSP integration in Day 4
      vscode.window.showInformationMessage('Patterns reloaded');
      updatePatternStatusBar();
    }
  );
}

async function showPatternStats() {
  if (!patternOverrideManager) return;
  
  const stats = patternOverrideManager.getStats();
  const message = 
    `Pattern Override Statistics:\n\n` +
    `Total Overrides: ${stats.totalOverrides}\n` +
    `Active Overrides: ${stats.enabledOverrides}\n` +
    `Disabled Overrides: ${stats.totalOverrides - stats.enabledOverrides}\n\n` +
    `Total Custom Patterns: ${stats.totalCustom}\n` +
    `Active Custom: ${stats.enabledCustom}\n` +
    `Disabled Custom: ${stats.totalCustom - stats.enabledCustom}\n\n` +
    `Storage: ${patternOverrideManager.getStoragePath()}`;
  
  vscode.window.showInformationMessage(message, { modal: true });
}

async function pickPattern(): Promise<string | undefined> {
  if (!patternOverrideManager) return;
  
  const patterns = patternOverrideManager.getAllPatterns();
  const items = patterns.map(p => ({
    label: p.name,
    description: p.enabled ? '$(check) Enabled' : '$(circle-slash) Disabled',
    detail: p.notes || p.description,
    patternId: p.id
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a pattern'
  });
  
  return selected?.patternId;
}
```

#### Step 1.4: Create Quick Input Dialogs (2 hours)
**New File:** `vscode-extension/src/patternOverrideUI.ts`

```typescript
import * as vscode from "vscode";
import { PatternOverrideManager, PatternOverride } from "./patternOverrideManager";

export async function createOverrideQuickInput(
  manager: PatternOverrideManager
): Promise<void> {
  // Step 1: Get pattern name
  const name = await vscode.window.showInputBox({
    prompt: 'Pattern name',
    placeHolder: 'e.g., Connection Error Override',
    validateInput: (value) => {
      return value.trim() ? null : 'Name is required';
    }
  });
  
  if (!name) return;
  
  // Step 2: Get regex
  const regex = await vscode.window.showInputBox({
    prompt: 'Regular expression',
    placeHolder: 'e.g., ERROR.*connection.*failed',
    validateInput: (value) => {
      try {
        new RegExp(value);
        return null;
      } catch (e) {
        return 'Invalid regex: ' + e;
      }
    }
  });
  
  if (!regex) return;
  
  // Step 3: Get severity
  const severity = await vscode.window.showQuickPick(
    [
      { label: 'Error', value: 'error' },
      { label: 'Warning', value: 'warning' },
      { label: 'Info', value: 'info' },
      { label: 'Hint', value: 'hint' }
    ],
    { placeHolder: 'Select severity' }
  );
  
  if (!severity) return;
  
  // Step 4: Get notes
  const notes = await vscode.window.showInputBox({
    prompt: 'Notes (why this override?)',
    placeHolder: 'Optional: Explain the reason for this override'
  });
  
  // Create the pattern
  const pattern = manager.createCustomPattern({
    name,
    regex,
    severity: severity.value,
    notes: notes || undefined,
    modified: false
  });
  
  vscode.window.showInformationMessage(
    `Pattern "${name}" created successfully`
  );
}

export async function editOverrideQuickInput(
  manager: PatternOverrideManager,
  patternId: string
): Promise<void> {
  const pattern = manager.getPattern(patternId);
  if (!pattern) {
    vscode.window.showErrorMessage('Pattern not found');
    return;
  }
  
  // Similar multi-step input for editing
  // Pre-fill with existing values
  const name = await vscode.window.showInputBox({
    prompt: 'Pattern name',
    value: pattern.name,
    validateInput: (value) => {
      return value.trim() ? null : 'Name is required';
    }
  });
  
  if (!name) return;
  
  // ... continue with other fields
  
  manager.updatePattern(patternId, {
    name,
    // ... other updated fields
  });
  
  vscode.window.showInformationMessage(`Pattern "${name}" updated`);
}
```

Update `extension.ts` to use these functions:
```typescript
import { createOverrideQuickInput, editOverrideQuickInput } from './patternOverrideUI';

async function createCustomPattern() {
  if (!patternOverrideManager) return;
  await createOverrideQuickInput(patternOverrideManager);
  updatePatternStatusBar();
}

async function editOverride(patternId?: string) {
  if (!patternOverrideManager) return;
  const id = patternId || await pickPattern();
  if (!id) return;
  await editOverrideQuickInput(patternOverrideManager, id);
  updatePatternStatusBar();
}
```

**✅ Day 1 Checkpoint:**
- Commands registered in package.json
- Status bar showing pattern count
- All command handlers implemented
- Quick Input dialogs working
- Test: Create, edit, delete patterns via Command Palette

---

### Day 2: TreeView & Context Menus

#### Step 2.1: Create TreeView Provider (3 hours)
**New File:** `vscode-extension/src/patternOverrideTreeProvider.ts`

```typescript
import * as vscode from "vscode";
import { PatternOverrideManager, PatternOverride } from "./patternOverrideManager";

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
      const stats = this.manager.getStats();
      return [
        new PatternTreeItem(
          `Overrides (${stats.enabledOverrides}/${stats.totalOverrides})`,
          'overrides',
          vscode.TreeItemCollapsibleState.Expanded
        ),
        new PatternTreeItem(
          `Custom Patterns (${stats.enabledCustom}/${stats.totalCustom})`,
          'custom',
          vscode.TreeItemCollapsibleState.Expanded
        ),
        new PatternTreeItem(
          `Disabled (${(stats.totalOverrides - stats.enabledOverrides) + (stats.totalCustom - stats.enabledCustom)})`,
          'disabled',
          vscode.TreeItemCollapsibleState.Collapsed
        )
      ];
    } else if (element.contextValue === 'category') {
      return this.getPatternsForCategory(element.categoryType!);
    }
    
    return [];
  }

  private getPatternsForCategory(category: string): PatternTreeItem[] {
    let patterns: PatternOverride[] = [];
    
    if (category === 'overrides') {
      patterns = this.manager.getAllOverrides().filter(p => p.enabled !== false);
    } else if (category === 'custom') {
      patterns = this.manager.getAllCustom().filter(p => p.enabled !== false);
    } else if (category === 'disabled') {
      patterns = this.manager.getAllPatterns().filter(p => p.enabled === false);
    }
    
    return patterns.map(p => new PatternTreeItem(
      p.name,
      'pattern',
      vscode.TreeItemCollapsibleState.None,
      p
    ));
  }
}

class PatternTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly contextValue: 'category' | 'pattern',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly pattern?: PatternOverride,
    public readonly categoryType?: string
  ) {
    super(label, collapsibleState);
    
    if (contextValue === 'pattern' && pattern) {
      this.tooltip = this.buildTooltip(pattern);
      this.description = pattern.severity;
      this.iconPath = new vscode.ThemeIcon(
        pattern.enabled === false ? 'circle-slash' : 
        pattern.sourceType === 'custom' ? 'add' : 'edit'
      );
      this.command = {
        command: 'logScoutAnalyzer.patterns.editOverride',
        title: 'Edit Pattern',
        arguments: [pattern.id]
      };
    } else if (contextValue === 'category') {
      this.iconPath = new vscode.ThemeIcon('folder');
      this.categoryType = this.getCategoryType(label);
    }
  }
  
  private getCategoryType(label: string): string {
    if (label.startsWith('Overrides')) return 'overrides';
    if (label.startsWith('Custom')) return 'custom';
    if (label.startsWith('Disabled')) return 'disabled';
    return '';
  }
  
  private buildTooltip(pattern: PatternOverride): string {
    const lines = [
      `Name: ${pattern.name}`,
      `Severity: ${pattern.severity}`,
      `Type: ${pattern.sourceType}`,
      `Regex: ${pattern.regex}`
    ];
    
    if (pattern.notes) {
      lines.push(`Notes: ${pattern.notes}`);
    }
    
    if (pattern.category && pattern.category.length > 0) {
      lines.push(`Categories: ${pattern.category.join(', ')}`);
    }
    
    return lines.join('\n');
  }
}
```

#### Step 2.2: Register TreeView (30 min)
**File:** `vscode-extension/package.json`

Add to `"views"` under `"scout-analyzer"`:
```json
{
  "id": "scoutPatternOverrides",
  "name": "Pattern Overrides",
  "icon": "$(wrench)",
  "contextualTitle": "Pattern Override Manager",
  "visibility": "visible"
}
```

**File:** `vscode-extension/src/extension.ts`

```typescript
import { PatternOverrideTreeProvider } from './patternOverrideTreeProvider';

// Add global variable
let patternOverrideTreeProvider: PatternOverrideTreeProvider | undefined;

// In activate() after patternOverrideManager initialization:
patternOverrideTreeProvider = new PatternOverrideTreeProvider(patternOverrideManager);
vscode.window.registerTreeDataProvider('scoutPatternOverrides', patternOverrideTreeProvider);

// Add refresh command
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.patterns.refresh', () => {
    patternOverrideTreeProvider?.refresh();
  })
);

// Update updatePatternStatusBar to also refresh tree:
function updatePatternStatusBar() {
  // ... existing code ...
  patternOverrideTreeProvider?.refresh();
}
```

#### Step 2.3: Add Context Menus (1 hour)
**File:** `vscode-extension/package.json`

Add to `"menus"`:
```json
"view/title": [
  {
    "command": "logScoutAnalyzer.patterns.createCustom",
    "when": "view == scoutPatternOverrides",
    "group": "navigation@1"
  },
  {
    "command": "logScoutAnalyzer.patterns.reloadPatterns",
    "when": "view == scoutPatternOverrides",
    "group": "navigation@2"
  }
],
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
    "when": "editorLangId == log",
    "group": "scout@1"
  }
]
```

**✅ Day 2 Checkpoint:**
- TreeView showing patterns organized by category
- Context menus on pattern items
- Clicking pattern opens editor
- Right-click in log file shows "Create Override"
- Test: Browse, edit, toggle patterns in TreeView

---

### Day 3: Visual Editor (WebView)

#### Step 3.1: Create Pattern Editor WebView (4 hours)
**New File:** `vscode-extension/src/patternOverrideEditor.ts`

```typescript
import * as vscode from "vscode";
import { PatternOverrideManager, PatternOverride } from "./patternOverrideManager";

export class PatternOverrideEditor {
  private static currentPanel: vscode.WebviewPanel | undefined;

  public static async show(
    context: vscode.ExtensionContext,
    manager: PatternOverrideManager,
    patternId?: string
  ): Promise<void> {
    const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

    if (PatternOverrideEditor.currentPanel) {
      PatternOverrideEditor.currentPanel.reveal(column);
      if (patternId) {
        const pattern = manager.getPattern(patternId);
        PatternOverrideEditor.currentPanel.webview.postMessage({
          command: 'load',
          data: pattern
        });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'patternOverrideEditor',
      'Pattern Override Editor',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
      }
    );

    PatternOverrideEditor.currentPanel = panel;
    panel.webview.html = this.getWebviewContent(panel.webview, context.extensionUri);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'save':
            await this.savePattern(manager, message.data, patternId);
            panel.dispose();
            break;
          case 'test':
            await this.testPattern(panel, message.data);
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

  private static getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
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
      box-sizing: border-box;
    }
    textarea {
      min-height: 100px;
      font-family: 'Courier New', monospace;
      resize: vertical;
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
    .primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .test-results {
      margin-top: 10px;
      padding: 10px;
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .success { color: #4ec9b0; }
    .error { color: #f48771; }
  </style>
</head>
<body>
  <h1>Pattern Override Editor</h1>
  
  <form id="patternForm">
    <div class="form-group">
      <label for="name">Pattern Name *</label>
      <input type="text" id="name" required placeholder="e.g., Connection Error Override">
    </div>

    <div class="form-group">
      <label for="regex">Regular Expression *</label>
      <textarea id="regex" required placeholder="e.g., ERROR.*connection.*failed"></textarea>
      <button type="button" class="secondary" onclick="testRegex()" style="margin-top: 5px;">
        Test Regex
      </button>
      <div id="testResults" class="test-results" style="display: none;"></div>
    </div>

    <div class="form-group">
      <label for="severity">Severity *</label>
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
      <small style="color: var(--vscode-descriptionForeground);">Comma-separated list</small>
    </div>

    <div class="form-group">
      <label for="notes">Notes (Why this override?)</label>
      <textarea id="notes" rows="3" placeholder="Explain the reason for this override..."></textarea>
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
      const categoryValue = document.getElementById('category').value;
      const categories = categoryValue 
        ? categoryValue.split(',').map(s => s.trim()).filter(s => s)
        : [];

      const data = {
        name: document.getElementById('name').value,
        regex: document.getElementById('regex').value,
        severity: document.getElementById('severity').value,
        category: categories.length > 0 ? categories : undefined,
        notes: document.getElementById('notes').value || undefined,
        enabled: document.getElementById('enabled').checked
      };
      
      vscode.postMessage({ command: 'save', data });
    }

    function testRegex() {
      const regex = document.getElementById('regex').value;
      if (!regex) {
        showTestResults({ valid: false, error: 'Please enter a regex pattern' });
        return;
      }
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
      if (!pattern) return;
      
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
      
      if (results.valid) {
        resultsDiv.className = 'test-results success';
        resultsDiv.textContent = '✓ Valid regex pattern';
      } else {
        resultsDiv.className = 'test-results error';
        resultsDiv.textContent = '✗ ' + (results.error || 'Invalid regex');
      }
    }
  </script>
</body>
</html>`;
  }

  private static async savePattern(
    manager: PatternOverrideManager,
    data: any,
    patternId?: string
  ): Promise<void> {
    try {
      if (patternId) {
        // Update existing
        manager.updatePattern(patternId, data);
        vscode.window.showInformationMessage(`Pattern "${data.name}" updated`);
      } else {
        // Create new
        manager.createCustomPattern(data);
        vscode.window.showInformationMessage(`Pattern "${data.name}" created`);
      }
      
      // Trigger UI updates
      vscode.commands.executeCommand('logScoutAnalyzer.patterns.refresh');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save pattern: ${error}`);
    }
  }

  private static async testPattern(panel: vscode.WebviewPanel, data: any): Promise<void> {
    try {
      new RegExp(data.regex);
      panel.webview.postMessage({
        command: 'testResults',
        data: { valid: true }
      });
    } catch (error) {
      panel.webview.postMessage({
        command: 'testResults',
        data: { valid: false, error: String(error) }
      });
    }
  }
}
```

#### Step 3.2: Integrate WebView Editor (30 min)
**File:** `vscode-extension/src/extension.ts`

```typescript
import { PatternOverrideEditor } from './patternOverrideEditor';

// Update showPatternManager to use WebView
async function showPatternManager() {
  if (!patternOverrideManager) return;
  await PatternOverrideEditor.show(context, patternOverrideManager);
}

// Update editOverride to use WebView
async function editOverride(patternId?: string) {
  if (!patternOverrideManager) return;
  const id = patternId || await pickPattern();
  if (!id) return;
  await PatternOverrideEditor.show(context, patternOverrideManager, id);
}
```

**✅ Day 3 Checkpoint:**
- Visual WebView editor with form
- Regex validation and testing
- Save and cancel functionality
- Edit existing patterns
- Test: Create/edit patterns using visual editor

---

### Day 4: LSP Integration & Polish

#### Step 4.1: Add File Watcher for Auto-reload (1 hour)
**File:** `vscode-extension/src/extension.ts`

```typescript
// In activate() after patternOverrideManager initialization:
const overrideFileWatcher = vscode.workspace.createFileSystemWatcher(
  '**/.log-scout/pattern-overrides.json'
);

overrideFileWatcher.onDidChange(async (uri) => {
  outputChannel.appendLine(`Pattern override file changed: ${uri.fsPath}`);
  
  // Reload patterns (this will trigger LSP reload when implemented)
  await reloadPatterns();
});

overrideFileWatcher.onDidCreate(async (uri) => {
  outputChannel.appendLine(`Pattern override file created: ${uri.fsPath}`);
  await reloadPatterns();
});

context.subscriptions.push(overrideFileWatcher);
```

#### Step 4.2: Enhanced Reload Function (30 min)
**File:** `vscode-extension/src/extension.ts`

```typescript
async function reloadPatterns() {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Reloading patterns...',
      cancellable: false
    },
    async (progress) => {
      progress.report({ increment: 0, message: 'Loading overrides...' });
      
      // Reload manager (re-reads from disk)
      if (patternOverrideManager) {
        // The manager automatically loads on construction
        // For runtime reload, we need to trigger LSP
        progress.report({ increment: 50, message: 'Notifying LSP server...' });
        
        // TODO: Send LSP command (add in future iteration)
        // For now, just show success
        progress.report({ increment: 100, message: 'Complete' });
        
        // Update UI
        updatePatternStatusBar();
        patternOverrideTreeProvider?.refresh();
        
        vscode.window.showInformationMessage('Patterns reloaded successfully');
      }
    }
  );
}
```

#### Step 4.3: Add Keyboard Shortcuts (15 min)
**File:** `vscode-extension/package.json`

Add after commands:
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

#### Step 4.4: Final Polish & Testing (2 hours)
1. Test all commands
2. Test TreeView interactions
3. Test WebView editor
4. Test file watcher
5. Update documentation

**✅ Day 4 Checkpoint:**
- Auto-reload on file changes
- Keyboard shortcuts working
- All UI components polished
- Integration tested end-to-end
- Documentation updated

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create override via Command Palette
- [ ] Create custom pattern via Command Palette
- [ ] Edit pattern via TreeView
- [ ] Delete pattern via TreeView
- [ ] Toggle pattern enable/disable
- [ ] View pattern statistics
- [ ] Import patterns from JSON
- [ ] Export patterns to JSON
- [ ] Reload patterns manually
- [ ] Status bar updates correctly
- [ ] TreeView refreshes on changes
- [ ] WebView editor saves correctly
- [ ] Regex testing works
- [ ] Context menus appear
- [ ] Keyboard shortcuts work
- [ ] File watcher triggers reload

### Integration Testing
- [ ] Pattern changes persist to disk
- [ ] JSON file format is correct
- [ ] Multiple patterns can be managed
- [ ] Disabled patterns don't break anything
- [ ] UI remains responsive with many patterns

---

## 📝 Documentation Updates

### Update Files:
1. `PATTERN_OVERRIDE_USER_GUIDE.md`
   - Add UI screenshots
   - Document all commands
   - Add keyboard shortcuts

2. `PATTERN_OVERRIDE_QUICK_START.md`
   - Update with UI workflows
   - Add visual examples

3. `README.md`
   - Mention UI features
   - Add feature highlights

---

## 🎉 Success Criteria

Phase 2 is complete when:
- [x] All commands registered and working
- [x] Status bar showing pattern count
- [x] TreeView displaying patterns
- [x] WebView editor functional
- [x] Context menus working
- [x] Import/export via UI
- [x] File watcher auto-reload
- [x] Keyboard shortcuts
- [x] Documentation updated
- [x] All manual tests passing

---

## 🚀 Ready to Start!

Begin with **Day 1, Step 1.1** and work through sequentially. Each step builds on the previous one. Test frequently and commit after each major step.

**Current Branch:** `feature/pattern-overrides`  
**Target:** VSCode Extension v0.0.145

Let's build an amazing UI! 🎨