# Command Registry & UI Component Mapping

**Purpose:** Complete reference for all commands, their UI locations, and the command contract testing rules.

**Last Updated:** 2025-02-24  
**Version:** 1.0.0

---

## 📋 Table of Contents

- [The New Rules (Command Contract Testing)](#the-new-rules-command-contract-testing)
- [Command Naming Convention](#command-naming-convention)
- [UI Component Architecture](#ui-component-architecture)
- [Complete Command Registry](#complete-command-registry)
- [Commands by UI Location](#commands-by-ui-location)
- [LSP Commands (Schema-Driven)](#lsp-commands-schema-driven)
- [Quick Reference](#quick-reference)

---

## The New Rules (Command Contract Testing)

### ⚠️ MANDATORY as of February 21, 2024

**Problem Solved:**
```
❌ Extension sent: "logScout.bundle.importPackage"
❌ LSP expected:   "scout/bundle/importPackage"
❌ Result:         Silently broken, hard to debug
```

### The Three-Part System

```
┌─────────────────────────────────────────┐
│  1. Single Source of Truth              │
│     lsp-commands.schema.json            │
│     • All LSP command names             │
│     • Request/response parameters       │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────┐
│  2. Rust      │      │  3. TypeScript │
│     Tests     │      │     Tests      │
│  (LSP Server) │      │  (Extension)   │
└───────────────┘      └────────────────┘
```

### Rules for New Commands

1. **LSP Commands**: Must be defined in `lsp-commands.schema.json` first
2. **Format**: Use `scout/{feature}/{action}` (NOT `logScout.*`)
3. **Parameters**: Use camelCase (e.g., `bundleId`, not `bundle_id`)
4. **Testing**: Run `.\scripts\test-command-contracts.bat` before commit
5. **Atomic Commits**: Schema + Rust + TypeScript together

### Example (Correct Way)

```typescript
// ✅ CORRECT - New format
await client.sendRequest("scout/bundle/create", {
  name: "My Bundle",
  caseId: "700440257"
});

// ❌ WRONG - Old format (will fail tests)
await client.sendRequest("logScout.bundle.create", {
  name: "My Bundle",
  case_id: "700440257"
});
```

**Documentation:** See [COMMAND_CONTRACT_TESTING.md](docs/COMMAND_CONTRACT_TESTING.md)

---

## Command Naming Convention

### Current Patterns

| Pattern | Count | Example | Usage |
|---------|-------|---------|-------|
| `logScoutAnalyzer.*` | ~60 | `logScoutAnalyzer.bundle.create` | Extension UI commands |
| `scout/*` | 7 | `scout/bundle/create` | LSP server commands |

### Migration Status

- ✅ **LSP Commands**: Migrated to `scout/*` format (schema-driven)
- 🚧 **Extension Commands**: Still use `logScoutAnalyzer.*` (UI-only)
- 📋 **Future**: May unify to single namespace

### Command Types

1. **LSP Commands** - Backend operations via language server
   - Format: `scout/{feature}/{action}`
   - Defined in: `lsp-commands.schema.json`
   - Handled by: Rust LSP server

2. **Extension Commands** - Frontend UI operations
   - Format: `logScoutAnalyzer.{feature}.{action}`
   - Defined in: `package.json` contributions
   - Handled by: TypeScript extension

---

## UI Component Architecture

### View Containers

The extension defines **1 activity bar container** with **6 views**:

```
📦 Scout Analyzer (Activity Bar Icon)
├── 📋 Results          (scoutResults)
├── 🔍 Filters          (scoutFilters)
├── 📁 Categories       (scoutCategories)
├── ▶️  Analyzer        (scoutAnalyzer)
├── ✏️  Pattern Overrides (scoutPatternOverrides)
└── 📦 Bundles          (scoutBundles)
```

### Tree Providers (Data Sources)

| View ID | Tree Provider | File Location |
|---------|---------------|---------------|
| `scoutResults` | `resultsTreeProvider` | `src/resultsTreeProvider.ts` |
| `scoutFilters` | `filterTreeProvider` | `src/filterTreeProvider.ts` |
| `scoutCategories` | `categoriesTreeProvider` | `src/categoriesTreeProvider.ts` |
| `scoutAnalyzer` | `analyzerTreeProvider` | `src/analyzerTreeProvider.ts` |
| `scoutPatternOverrides` | `patternOverrideTreeProvider` | `src/patternOverrideTreeProvider.ts` |
| `scoutBundles` | `bundleTreeProvider` | `src/bundleTreeProvider.ts` |

### Context Menu Locations

| Menu Location | Purpose | Command Count |
|--------------|---------|---------------|
| `view/title` | Toolbar buttons in view headers | 19 |
| `view/item/context` | Right-click menu on tree items | 23 |
| `explorer/context` | Right-click in File Explorer | 1 |
| `editor/context` | Right-click in text editor | 2 |

---

## Complete Command Registry

### Total: 67+ Commands

#### Bundle Management (10 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.bundle.create` | Scout: Create New Bundle | `$(add)` | Bundles view title |
| `logScoutAnalyzer.bundle.importPackage` | Scout: Import Package | `$(archive)` | Bundles view title, Explorer context |
| `logScoutAnalyzer.bundle.addCurrentFile` | Scout: Add Current File to Bundle | `$(file-add)` | Command Palette |
| `logScoutAnalyzer.bundle.addToBundle` | Scout: Add to Bundle | `$(add)` | Explorer context menu |
| `logScoutAnalyzer.bundle.addLog` | Scout: Add Log File to Bundle | `$(file-add)` | Bundle item context menu |
| `logScoutAnalyzer.bundle.analyze` | Scout: Analyze Bundle | `$(search)` | Bundle item context (inline) |
| `logScoutAnalyzer.bundle.delete` | Scout: Delete Bundle | `$(trash)` | Bundle item context |
| `logScoutAnalyzer.bundle.refresh` | Scout: Refresh Bundles | `$(refresh)` | Command Palette |
| `logScoutAnalyzer.bundle.openInQCSOne` | Scout: Open Case in QCSOne | `$(link-external)` | Bundle item context |
| `logScoutAnalyzer.bundle.openDashboard` | Scout: Open Bundle Dashboard | `$(dashboard)` | Bundle item context (inline) |

#### Results & Analysis (13 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.refreshResults` | Scout: Refresh Results | `$(refresh)` | Results view title |
| `logScoutAnalyzer.jumpToLine` | Scout: Jump to Line | - | Result item context |
| `logScoutAnalyzer.showPatternForResult` | Scout: Show Pattern Details | `$(search)` | Result item context |
| `logScoutAnalyzer.copyResultInfo` | Scout: Copy Issue Details | `$(clippy)` | Result item context |
| `logScoutAnalyzer.showCacheData` | Scout: Show Cache Data | `$(database)` | Result item context |
| `logScoutAnalyzer.groupBySeverity` | Scout: Group by Severity | `$(symbol-event)` | Results view title menu |
| `logScoutAnalyzer.groupByCategory` | Scout: Group by Category | `$(symbol-folder)` | Results view title menu |
| `logScoutAnalyzer.groupByFile` | Scout: Group by File | `$(file)` | Results view title menu |
| `logScoutAnalyzer.resetView` | Scout: Reset View | `$(clear-all)` | Results view title menu |
| `logScoutAnalyzer.sortByLine` | Scout: Sort by Line | `$(sort-precedence)` | Results view title menu |
| `logScoutAnalyzer.sortBySeverity` | Scout: Sort by Severity | `$(symbol-color)` | Results view title menu |
| `logScoutAnalyzer.sortByTime` | Scout: Sort by Time | `$(history)` | Results view title menu |
| `logScoutAnalyzer.sortByFile` | Scout: Sort by File | `$(file)` | Results view title menu |
| `logScoutAnalyzer.sortByCategory` | Scout: Sort by Category | `$(symbol-folder)` | Results view title menu |

#### Pattern Management (10 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.patterns.createOverride` | Scout: Create Pattern Override | - | Command Palette |
| `logScoutAnalyzer.patterns.createOverrideFromSelection` | Scout: Create Override from Selection | - | Editor context menu |
| `logScoutAnalyzer.patterns.createOverrideFromDiagnostic` | Scout: Create Override from Diagnostic | `$(add)` | Editor context menu |
| `logScoutAnalyzer.patterns.createCustom` | Scout: Create Custom Pattern | - | Command Palette |
| `logScoutAnalyzer.patterns.editOverride` | Scout: Edit Pattern | - | Pattern item context (inline) |
| `logScoutAnalyzer.patterns.deleteOverride` | Scout: Delete Pattern | - | Pattern item context |
| `logScoutAnalyzer.patterns.togglePattern` | Scout: Enable/Disable Pattern | - | Pattern item context (inline) |
| `logScoutAnalyzer.patterns.showManager` | Scout: Open Pattern Overrides File | - | Command Palette |
| `logScoutAnalyzer.patterns.importOverrides` | Scout: Import Pattern Overrides | - | Command Palette |
| `logScoutAnalyzer.patterns.exportOverrides` | Scout: Export Pattern Overrides | - | Command Palette |
| `logScoutAnalyzer.patterns.reloadPatterns` | Scout: Reload Patterns from LSP | - | Command Palette |

#### Cache & File Management (8 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.clearCache` | Scout: Clear Cache | `$(trash)` | Cache view title |
| `logScoutAnalyzer.viewCacheMetadata` | Scout: View Cache Metadata | `$(info)` | Cache view title menu |
| `logScoutAnalyzer.openCachedFile` | Scout: Open Cached File | `$(file)` | Cached file item context |
| `logScoutAnalyzer.openFileInEditor` | Scout: Open File in Editor | `$(go-to-file)` | Cached file item context |
| `logScoutAnalyzer.revealInExplorer` | Scout: Reveal in Explorer | `$(folder-opened)` | Cached file item context |
| `logScoutAnalyzer.removeCachedFile` | Scout: Remove Cached File | `$(trash)` | Cached file item context |
| `logScoutAnalyzer.copyFilePath` | Scout: Copy File Path | `$(clippy)` | Current file item context |
| `logScoutAnalyzer.openInNewWindow` | Scout: Open in New Window | `$(empty-window)` | Current file item context |

#### Configuration & Cloud Sync (5 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.config.backup` | Scout: Backup Configuration to Cloud | `$(cloud-upload)` | Command Palette |
| `logScoutAnalyzer.config.restore` | Scout: Restore Configuration from Cloud | `$(cloud-download)` | Command Palette |
| `logScoutAnalyzer.config.export` | Scout: Export Configuration to File | `$(save)` | Command Palette |
| `logScoutAnalyzer.config.import` | Scout: Import Configuration from File | `$(folder-opened)` | Command Palette |
| `logScoutAnalyzer.config.list` | Scout: List My Cloud Configurations | `$(list-unordered)` | Command Palette |

#### Extraction & Archive (4 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.importArchive` | Scout: Import Log Archive | `$(cloud-upload)` | Command Palette |
| `logScoutAnalyzer.extraction.addFileType` | Scout: Add File Type to Extraction Policy | `$(add)` | Command Palette |
| `logScoutAnalyzer.extraction.addCurrentFileType` | Scout: Add Current File Type to Extraction Policy | `$(add)` | Command Palette |
| `logScoutAnalyzer.extraction.showStats` | Scout: Show Extraction Statistics | `$(graph)` | Command Palette |
| `logScoutAnalyzer.extraction.editPolicy` | Scout: Edit Extraction Policy | `$(edit)` | Command Palette |

#### Case Management (3 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.downloadCase` | Scout: Download Case | `$(cloud-download)` | Cases view title |
| `logScoutAnalyzer.importCase` | Scout: Import Case | `$(cloud-upload)` | Cases view title |
| `logScoutAnalyzer.refreshCases` | Scout: Refresh Cases | `$(refresh)` | Cases view title |

#### Category & Filter Management (3 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.toggleCategory` | Scout: Toggle Category Filter | - | Command Palette |
| `logScoutAnalyzer.toggleAllCategories` | Scout: Toggle All Categories | - | Command Palette |
| `logScoutAnalyzer.toggleFilter` | Scout: Toggle Filter | - | Command Palette |

#### Console & Output (2 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.showConsole` | Scout: Show Console/Output | `$(output)` | Results/Categories view title |
| `logScoutAnalyzer.clearConsole` | Scout: Clear Console | - | Command Palette |

#### Version & About (2 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.showAbout` | Scout: About | `$(info)` | Version item context |
| `logScoutAnalyzer.copyVersionInfo` | Scout: Copy Version Info | `$(clippy)` | Version item context |

#### View & Panel Commands (7 commands)

| Command | Title | Icon | UI Location |
|---------|-------|------|-------------|
| `logScoutAnalyzer.openScoutView` | Scout: Open Analyzer View | `$(telescope)` | Command Palette |
| `logScoutAnalyzer.openActionPanel` | Scout: Open Action Panel | `$(notebook)` | Command Palette |
| `logScoutAnalyzer.openAnalyzerPanel` | Scout: Open Analyzer Panel | - | Command Palette |
| `logScoutAnalyzer.openAnnotationDashboard` | Scout: Open Annotation Dashboard | - | Command Palette |
| `logScoutAnalyzer.toggleConsoleLocation` | Scout: Toggle Console Location | - | Command Palette |
| `logScoutAnalyzer.setTimeframe` | Scout: Set Timeframe | - | Command Palette |
| `logScoutAnalyzer.exportResults` | Scout: Export Results | `$(save)` | Results/Categories view title |

---

## Commands by UI Location

### Results View Title Bar

```
┌────────────────────────────────────────────────────┐
│ Results                      [🔄] [💾] [📺]     │ ← Title actions
├────────────────────────────────────────────────────┤
│ • Group by Severity                             │ ← Dropdown menu
│ • Group by Category                             │
│ • Group by File                                 │
│ • Reset View                                    │
│ • Sort by Line                                  │
│ • Sort by Severity                              │
│ • Sort by Time                                  │
│ • Sort by File                                  │
│ • Sort by Category                              │
│ • Export Results                                │
│ • Show Console                                  │
└────────────────────────────────────────────────────┘
```

**Inline Actions** (navigation):
- `refreshResults` - Refresh button
- `exportResults` - Save button
- `showConsole` - Console button

**Menu Actions** (grouping/sorting):
- Group: `groupBySeverity`, `groupByCategory`, `groupByFile`, `resetView`
- Sort: `sortByLine`, `sortBySeverity`, `sortByTime`, `sortByFile`, `sortByCategory`

### Bundles View Title Bar

```
┌─────────────────────────────────────────────────┐
│ Bundles                      [➕] [📦]          │
├─────────────────────────────────────────────────┤
│ ├─ Bundle: Case 700440257                       │
│ │  ├─ [🔍][📊] Actions                          │ ← Inline actions
│ │  ├─ Add Log File                              │ ← Context menu
│ │  ├─ Open in QCSOne                            │
│ │  └─ Delete Bundle                             │
└─────────────────────────────────────────────────┘
```

**Title Actions**:
- `bundle.create` - Create new bundle
- `bundle.importPackage` - Import QCSONE package

**Item Inline Actions**:
- `bundle.analyze` - Analyze button
- `bundle.openDashboard` - Dashboard button

**Item Context Menu**:
- `bundle.addLog` - Add log file
- `bundle.openInQCSOne` - Open case URL
- `bundle.delete` - Delete bundle

### Pattern Overrides View

```
┌─────────────────────────────────────────────────┐
│ Pattern Overrides                               │
├─────────────────────────────────────────────────┤
│ ├─ Custom Pattern 1                             │
│ │  [✏️][⏸️] Actions           [🗑️] Delete      │ ← Inline + context
└─────────────────────────────────────────────────┘
```

**Item Actions**:
- `patterns.editOverride` - Edit button (inline)
- `patterns.togglePattern` - Enable/Disable button (inline)
- `patterns.deleteOverride` - Delete (context menu)

### Explorer Context Menu

```
Right-click file/folder in Explorer
├─ Scout: Add to Bundle        ← logScoutAnalyzer.bundle.addToBundle
└─ (for .zip files automatically triggers importPackage)
```

### Editor Context Menu

```
Right-click in log file
├─ Scout: Create Override from Selection        ← When text selected
└─ Scout: Create Override from Diagnostic       ← When diagnostic present
```

### Result Item Context Menu

```
Right-click result item
├─ Scout: Jump to Line                  ← Navigate to log line
├─ Scout: Show Pattern Details          ← View pattern info
├─ Scout: Copy Issue Details            ← Copy to clipboard
└─ Scout: Show Cache Data               ← View cached metadata
```

---

## LSP Commands (Schema-Driven)

These commands communicate with the Rust LSP server via JSON-RPC.

### Defined in: `lsp-commands.schema.json`

| Command | Description | Request Parameters | Response |
|---------|-------------|-------------------|----------|
| `scout/bundle/list` | List all bundles | `logs?`, `caseId?`, `tags?` | `bundles[]` |
| `scout/bundle/get` | Get bundle details | `bundleId` (required) | `bundle{}` |
| `scout/bundle/create` | Create new bundle | `name`, `description?`, `caseId?` | `bundleId` |
| `scout/bundle/importPackage` | Import QCSONE package | `packagePath`, `bundleName?`, `caseId?`, `progressToken?` | `bundleId`, `filesImported`, `success` |
| `scout/bundle/addLog` | Add log to bundle | `bundleId`, `logPath` | `success` |
| `scout/bundle/delete` | Delete bundle | `bundleId`, `deleteFiles?` | `success` |
| `scout/bundle/analyze` | Analyze bundle | `bundleId`, `options?` | `analysis{}` |

**Source:** `lsp-commands.schema.json`

---

## Quick Reference

### Command Registration Pattern

```typescript
// In extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand(
    "logScoutAnalyzer.commandName",  // VS Code command ID
    async (param?: Type) => {
      // Implementation
      
      // If calling LSP:
      const client = getLSPClient();
      await client.sendRequest("scout/feature/action", {
        paramName: value  // Must match schema
      });
    }
  )
);
```

### Where Commands Are Defined

| Aspect | Location | Format |
|--------|----------|--------|
| **Command IDs** | `vscode-extension/package.json` | `logScoutAnalyzer.*` |
| **Command Registration** | `vscode-extension/src/extension.ts` | `registerCommand()` |
| **LSP Command Schema** | `lsp-commands.schema.json` | `scout/*` |
| **LSP Handlers** | `lsp-server/src/server.rs` | Match `scout/*` |
| **Menu Bindings** | `vscode-extension/package.json` → `menus` | View/context mapping |
| **Icons** | `vscode-extension/package.json` → `commands[].icon` | Codicon syntax |
| **Tree Providers** | `vscode-extension/src/*TreeProvider.ts` | Data source |

---

## Development Workflow

### Adding a New Command

#### 1. Extension-Only Command (UI)

**File**: `vscode-extension/package.json`

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScoutAnalyzer.myFeature.myAction",
        "title": "Scout: My Action",
        "icon": "$(symbol-icon)"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "logScoutAnalyzer.myFeature.myAction",
          "when": "view == scoutMyView",
          "group": "navigation"
        }
      ]
    }
  }
}
```

**File**: `vscode-extension/src/extension.ts`

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand(
    "logScoutAnalyzer.myFeature.myAction",
    async () => {
      // Implementation
    }
  )
);
```

#### 2. LSP Command (Backend)

**Step 1**: Define in `lsp-commands.schema.json`
```json
{
  "scout/myFeature/myAction": {
    "description": "My action description",
    "request": {
      "param1": { "type": "string", "required": true }
    },
    "response": {
      "result": { "type": "boolean" }
    }
  }
}
```

**Step 2**: Implement in `lsp-server/src/server.rs`
```rust
"scout/myFeature/myAction" => {
    #[derive(Deserialize)]
    struct MyParams {
        param1: String,
    }
    let params: MyParams = serde_json::from_value(params)?;
    
    // Implementation
    
    Ok(serde_json::json!({
        "result": true
    }))
}
```

**Step 3**: Call from extension
```typescript
const response = await client.sendRequest("scout/myFeature/myAction", {
  param1: "value"
});
```

**Step 4**: Run tests
```bash
.\scripts\test-command-contracts.bat
```

### Command Testing Checklist

When adding a new command:

- [ ] **Schema** - Added to `lsp-commands.schema.json` (if LSP command)
- [ ] **Rust** - Handler added to `lsp-server/src/server.rs` (if LSP command)
- [ ] **TypeScript** - Registered in `extension.ts`
- [ ] **Package.json** - Added to `contributes.commands[]`
- [ ] **Menu** - Added to appropriate menu in `contributes.menus[]`
- [ ] **Contract Tests** - Run `test-command-contracts.bat/sh`
- [ ] **Manual Test** - Verify in VS Code Extension Host
- [ ] **Documentation** - Update this file

---

## Troubleshooting

### Command Not Appearing in UI

1. Check `package.json` → `contributes.commands[]` - Is it defined?
2. Check `package.json` → `contributes.menus[]` - Is it in a menu?
3. Check "when" clause - Does it match current context?
4. Reload VS Code window (Ctrl+Shift+P → "Reload Window")

### Command Does Nothing

1. Check `extension.ts` - Is `registerCommand()` called?
2. Check LSP client - Is server running? (Output panel)
3. Check command name spelling - Extension vs. Schema
4. Run contract tests - `.\scripts\test-command-contracts.bat`

### Contract Tests Failing

1. Check command name format: `scout/feature/action`
2. Check parameter names: must be camelCase
3. Check schema matches implementation exactly
4. Review error message for specific mismatch

---

## Status & Next Steps

### Current State

- ✅ **67 total commands** registered and functional
- ✅ **7 LSP commands** schema-driven and tested
- ✅ **6 view panels** organized in activity bar
- ✅ **Contract testing** enforced for LSP commands
- 🚧 **Extension commands** need audit (see COMMAND_AUDIT_TODO.md)

### Potential Issues

1. **Suspicious Commands** (~15 found)
   - Some commands may be duplicates
   - Some features may not be fully implemented
   - Example: Cloud sync, case management features

2. **Naming Inconsistency**
   - LSP: `scout/*` format
   - Extension: `logScoutAnalyzer.*` format
   - Future: May need unification

3. **Missing Tests**
   - Extension commands lack contract tests
   - Only LSP commands are validated
   - Manual testing required

### Recommended Actions

1. **Audit Extension Commands** (2-3 hours)
   - Test each command manually
   - Identify broken/incomplete features
   - Document working state

2. **Cleanup Unused Commands** (1-2 hours)
   - Remove dead code
   - Consolidate duplicates
   - Update documentation

3. **Extend Contract Testing** (3-4 hours)
   - Add validation for extension commands
   - Ensure all registered commands work
   - Automate regression testing

**See:** [COMMAND_AUDIT_TODO.md](COMMAND_AUDIT_TODO.md) for detailed plan

---

## Related Documentation

- **[Command Contract Testing](docs/COMMAND_CONTRACT_TESTING.md)** - Detailed rules and workflow
- **[Command Audit TODO](COMMAND_AUDIT_TODO.md)** - Cleanup action items
- **[LSP Commands Schema](lsp-commands.schema.json)** - Source of truth for LSP commands
- **[Package.json](vscode-extension/package.json)** - All command definitions and UI bindings
- **[Extension.ts](vscode-extension/src/extension.ts)** - Command implementations

---

**Maintained By:** Engineering Team  
**Questions?** See [docs/COMMAND_CONTRACT_TESTING.md](docs/COMMAND_CONTRACT_TESTING.md) or ask in team chat.