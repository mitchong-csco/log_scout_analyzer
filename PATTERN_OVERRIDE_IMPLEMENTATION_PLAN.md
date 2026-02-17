# Pattern Override System - Implementation Plan

> **Document Version:** 1.1  
> **Created:** 2024  
> **Updated:** February 16, 2026  
> **Status:** Phase 1.6 Complete, Phase 2 Ready  
> **Related Docs:** `PATTERN_OVERRIDE_INTEGRATION.md`, `PATTERN_MARKING_INTEGRATION_PLAN.md`, `PHASE_1_6_IMPLEMENTATION_SUMMARY.md`

---

## Executive Summary

This document provides a **step-by-step implementation plan** for the Pattern Override System, which allows users to fix broken patterns locally without modifying the canonical TagScout MongoDB patterns.

**Core Principle:** Store overrides in JSON files (`.log-scout/pattern-overrides.json`) for version control, team sharing, and simplicity.

**Timeline:** 3-4 phases over 3-4 weeks  
**Risk Level:** Low (additive feature, no breaking changes)

**Latest Update:** Phase 1.6 (Pattern Marking Support) implemented ✅

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: LSP Server Foundation](#phase-1-lsp-server-foundation)
3. [Phase 2: VSCode UI Integration](#phase-2-vscode-ui-integration)
4. [Phase 3: Advanced Features](#phase-3-advanced-features)
5. [Phase 4: Agentic Intelligence (Optional)](#phase-4-agentic-intelligence-optional)
6. [Testing & Validation](#testing--validation)
7. [Deployment Checklist](#deployment-checklist)
8. [Success Metrics](#success-metrics)

---

## Prerequisites

### Required Knowledge
- [ ] Understanding of current pattern engine (`lsp-server/src/pattern_engine.rs`)
- [ ] Familiarity with TagScout integration (`tagscout-integration/`)
- [ ] VSCode extension architecture (`vscode-extension/src/`)
- [ ] Existing `patternOverrideManager.ts` implementation

### Environment Setup
- [ ] Development environment configured
- [ ] LSP server builds successfully
- [ ] VSCode extension builds and installs
- [ ] Access to test workspace with logs

### Documentation Review
- [ ] Read `PATTERN_OVERRIDE_INTEGRATION.md` (design spec)
- [ ] Review `PARAMETER_EXTRACTION_FIX.md` (context)
- [ ] Read `PATTERN_MARKING_INTEGRATION_PLAN.md` (marking feature)

---

## Phase 1: LSP Server Foundation

**Goal:** Enable LSP server to read and merge pattern overrides  
**Duration:** 3-5 days  
**Priority:** P0 (Critical Path)

### Task 1.1: Create Pattern Loader Module

**File:** `lsp-server/src/pattern_loader.rs` (NEW)

**Steps:**

1. **Create the file structure**
   ```bash
   cd lsp-server/src
   touch pattern_loader.rs
   ```

2. **Add to `mod.rs` or `main.rs`:**
   ```rust
   mod pattern_loader;
   ```

3. **Implement data structures:**
   - [ ] `PatternOverride` struct
   - [ ] `OverrideValues` struct
   - [ ] `ExtractorOverride` struct
   - [ ] `ConditionTrigger` struct
   - [ ] `OverrideFile` struct

4. **Reference implementation:**
   ```rust
   use serde::{Deserialize, Serialize};
   use std::collections::HashMap;
   use std::fs;
   use std::path::PathBuf;

   #[derive(Debug, Clone, Deserialize, Serialize)]
   pub struct PatternOverride {
       pub id: String,
       #[serde(rename = "sourceType")]
       pub source_type: String,
       #[serde(rename = "sourceId")]
       pub source_id: Option<String>,
       pub name: Option<String>,
       pub notes: Option<String>,
       pub reason: Option<String>,
       pub enabled: Option<bool>,
       pub overrides: OverrideValues,
   }

   #[derive(Debug, Clone, Deserialize, Serialize)]
   pub struct OverrideValues {
       pub regex: Option<String>,
       pub severity: Option<String>,
       #[serde(rename = "parameterExtractors")]
       pub parameter_extractors: Option<HashMap<String, ExtractorOverride>>,
       #[serde(rename = "conditionTriggers")]
       pub condition_triggers: Option<Vec<ConditionTrigger>>,
   }

   #[derive(Debug, Clone, Deserialize, Serialize)]
   pub struct ExtractorOverride {
       pub original: Option<String>,
       #[serde(rename = "override")]
       pub override_value: String,
       pub reason: Option<String>,
   }

   #[derive(Debug, Clone, Deserialize, Serialize)]
   pub struct ConditionTrigger {
       pub field: String,
       pub operator: String,
       pub value: String,
       pub severity: String,
       pub description: Option<String>,
   }

   #[derive(Debug, Clone, Deserialize, Serialize)]
   pub struct OverrideFile {
       pub version: String,
       #[serde(rename = "lastSync")]
       pub last_sync: Option<String>,
       pub overrides: HashMap<String, PatternOverride>,
       pub custom: HashMap<String, PatternOverride>,
   }
   ```

5. **Add dependencies to `Cargo.toml`:**
   ```toml
   [dependencies]
   dirs = "5.0"  # For home directory detection
   ```

**Acceptance Criteria:**
- [ ] Module compiles without errors
- [ ] All structs properly deserialize from JSON
- [ ] Proper error handling for missing fields

---

### Task 1.2: Implement Override File Loading

**File:** `lsp-server/src/pattern_loader.rs`

**Steps:**

1. **Implement `get_override_file_path()`:**
   ```rust
   fn get_override_file_path(workspace_path: Option<&str>) -> Result<PathBuf, Box<dyn std::error::Error>> {
       if let Some(workspace) = workspace_path {
           let mut path = PathBuf::from(workspace);
           path.push(".log-scout");
           path.push("pattern-overrides.json");
           Ok(path)
       } else {
           let home = dirs::home_dir()
               .ok_or("Could not determine home directory")?;
           let mut path = home;
           path.push(".log-scout-analyzer");
           path.push("pattern-overrides.json");
           Ok(path)
       }
   }
   ```

2. **Implement `load_overrides()`:**
   ```rust
   pub fn load_overrides(workspace_path: Option<&str>) -> Result<OverrideFile, Box<dyn std::error::Error>> {
       let override_path = get_override_file_path(workspace_path)?;
       
       if !override_path.exists() {
           tracing::info!("No pattern override file found at {:?}", override_path);
           return Ok(OverrideFile {
               version: "1.0".to_string(),
               last_sync: None,
               overrides: HashMap::new(),
               custom: HashMap::new(),
           });
       }
       
       let content = fs::read_to_string(&override_path)?;
       let override_file: OverrideFile = serde_json::from_str(&content)?;
       
       tracing::info!(
           "Loaded {} pattern overrides and {} custom patterns from {:?}",
           override_file.overrides.len(),
           override_file.custom.len(),
           override_path
       );
       
       Ok(override_file)
   }
   ```

3. **Add comprehensive logging:**
   - [ ] Log when override file is found/not found
   - [ ] Log number of overrides loaded
   - [ ] Log any parsing errors with context

**Testing:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_overrides_missing_file() {
        let result = load_overrides(Some("/nonexistent/path"));
        assert!(result.is_ok());
        let file = result.unwrap();
        assert_eq!(file.overrides.len(), 0);
    }

    #[test]
    fn test_load_overrides_valid_file() {
        // Create temp file with test data
        let temp_dir = tempfile::tempdir().unwrap();
        let override_path = temp_dir.path().join(".log-scout/pattern-overrides.json");
        std::fs::create_dir_all(override_path.parent().unwrap()).unwrap();
        
        let test_data = r#"{
            "version": "1.0",
            "overrides": {
                "override-test123": {
                    "id": "override-test123",
                    "sourceType": "mongodb",
                    "enabled": true,
                    "overrides": {
                        "regex": "test.*pattern"
                    }
                }
            },
            "custom": {}
        }"#;
        
        std::fs::write(&override_path, test_data).unwrap();
        
        let result = load_overrides(Some(temp_dir.path().to_str().unwrap()));
        assert!(result.is_ok());
        let file = result.unwrap();
        assert_eq!(file.overrides.len(), 1);
    }
}
```

**Acceptance Criteria:**
- [ ] Successfully loads valid override files
- [ ] Returns empty structure for missing files (no error)
- [ ] Proper error handling for malformed JSON
- [ ] All tests pass

---

### Task 1.3: Implement Pattern Merge Logic

**File:** `lsp-server/src/pattern_loader.rs`

**Steps:**

1. **Implement `merge_pattern()`:**
   ```rust
   pub fn merge_pattern(
       base: &mut Pattern,
       override_data: &PatternOverride
   ) {
       tracing::info!("Applying override '{}' to pattern: {}", override_data.id, base.id);
       
       // Override regex if provided
       if let Some(ref regex) = override_data.overrides.regex {
           tracing::info!("  Overriding regex: {} -> {}", base.regex_str, regex);
           base.regex_str = regex.clone();
       }
       
       // Override severity if provided
       if let Some(ref severity) = override_data.overrides.severity {
           tracing::info!("  Overriding severity: {} -> {}", base.severity, severity);
           base.severity = severity.clone();
       }
       
       // Override parameter extractors
       if let Some(ref extractors) = override_data.overrides.parameter_extractors {
           for (name, extractor) in extractors {
               tracing::info!(
                   "  Overriding parameter extractor '{}': {} (reason: {})",
                   name,
                   extractor.override_value,
                   extractor.reason.as_deref().unwrap_or("none")
               );
               
               base.parameter_extractors.insert(
                   name.clone(),
                   extractor.override_value.clone()
               );
           }
       }
       
       // Mark as overridden
       base.is_override = true;
       base.override_notes = override_data.notes.clone();
       
       tracing::info!("  Override applied successfully");
   }
   ```

2. **Update Pattern struct (if needed):**
   - Add `is_override: bool` field
   - Add `override_notes: Option<String>` field

**Acceptance Criteria:**
- [ ] Merge preserves base pattern values when override not specified
- [ ] Override values completely replace base values
- [ ] Logging clearly shows what was overridden
- [ ] Metadata fields are set correctly

---

### Task 1.4: Integrate into Pattern Loading Flow

**File:** `lsp-server/src/main.rs` (or wherever patterns are loaded)

**Steps:**

1. **Locate current pattern loading code:**
   - [ ] Find where `load_patterns_from_tagscout()` is called
   - [ ] Identify the `Vec<Pattern>` that's created

2. **Wrap with override logic:**
   ```rust
   async fn load_patterns_with_overrides(
       workspace_path: Option<&str>
   ) -> Result<Vec<Pattern>, Box<dyn std::error::Error>> {
       tracing::info!("Loading patterns with overrides...");
       
       // 1. Load base patterns from MongoDB/TagScout
       let mut patterns = load_patterns_from_tagscout().await?;
       tracing::info!("Loaded {} base patterns from TagScout", patterns.len());
       
       // 2. Load overrides from file
       let overrides = pattern_loader::load_overrides(workspace_path)?;
       
       // 3. Apply overrides to matching patterns
       let mut override_count = 0;
       for pattern in patterns.iter_mut() {
           let override_id = format!("override-{}", pattern.id);
           if let Some(override_data) = overrides.overrides.get(&override_id) {
               if override_data.enabled.unwrap_or(true) {
                   pattern_loader::merge_pattern(pattern, override_data);
                   override_count += 1;
               }
           }
       }
       tracing::info!("Applied {} pattern overrides", override_count);
       
       // 4. Add custom patterns
       for (id, custom) in overrides.custom {
           if custom.enabled.unwrap_or(true) {
               tracing::info!("Adding custom pattern: {}", id);
               patterns.push(convert_custom_to_pattern(custom));
           }
       }
       
       tracing::info!(
           "Final pattern count: {} (base + overrides + custom)",
           patterns.len()
       );
       
       Ok(patterns)
   }
   ```

3. **Update initialization code:**
   - [ ] Replace `load_patterns_from_tagscout()` calls
   - [ ] Pass workspace path to new function
   - [ ] Ensure workspace path is available from LSP initialization

**Acceptance Criteria:**
- [ ] Patterns load successfully with and without overrides
- [ ] Override count logged correctly
- [ ] Custom patterns are added
- [ ] No breaking changes to existing functionality

---

### Task 1.5: Add Pattern Reload Capability

**File:** `lsp-server/src/main.rs`

**Steps:**

1. **Add custom LSP command:**
   ```rust
   // In LSP command handler
   "logScout/reloadPatterns" => {
       tracing::info!("Reloading patterns with overrides...");
       let patterns = load_patterns_with_overrides(workspace_path).await?;
       // Update internal pattern engine
       pattern_engine.replace_patterns(patterns);
       Ok(serde_json::Value::Null)
   }
   ```

2. **Ensure pattern engine can be updated:**
   - [ ] Add `replace_patterns()` method if needed
   - [ ] Clear any compiled pattern caches
   - [ ] Trigger re-analysis of open documents

**Acceptance Criteria:**
- [ ] Patterns can be reloaded without restarting LSP server
- [ ] Open documents are re-analyzed with new patterns
- [ ] Diagnostics update correctly

---

### Phase 1 Completion Checklist

- [ ] All code compiles without warnings
- [ ] Unit tests pass
- [ ] Integration test with sample override file works
- [ ] Logging output is clear and informative
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Git commit with descriptive message

**Deliverable:** LSP server can read and apply pattern overrides from JSON file

---

## Phase 2: VSCode UI Integration

**Goal:** Enable users to create and manage overrides through VSCode  
**Duration:** 4-6 days  
**Priority:** P1 (High)

### Task 2.1: Verify Existing PatternOverrideManager

**File:** `vscode-extension/src/patternOverrideManager.ts`

**Steps:**

1. **Audit existing implementation:**
   - [ ] Review `createOverride()` method
   - [ ] Review `getAllPatterns()` method
   - [ ] Review `resetOverride()` method
   - [ ] Check file write logic

2. **Validate JSON structure matches Phase 1:**
   - [ ] Field names match (camelCase vs snake_case)
   - [ ] Required fields present
   - [ ] Optional fields handled correctly

3. **Test file operations:**
   - [ ] Creates `.log-scout` directory if missing
   - [ ] Writes valid JSON
   - [ ] Handles concurrent access

**Acceptance Criteria:**
- [ ] Existing manager works correctly
- [ ] JSON output matches LSP expectations
- [ ] File operations are safe and robust

---

### Task 2.2: Add Context Menu Commands

**File:** `vscode-extension/package.json`

**Steps:**

1. **Add command definitions:**
   ```json
   "contributes": {
       "commands": [
           {
               "command": "logScoutAnalyzer.overridePattern",
               "title": "Override Pattern...",
               "category": "Log Scout"
           },
           {
               "command": "logScoutAnalyzer.viewOverrides",
               "title": "View Pattern Overrides",
               "category": "Log Scout"
           },
           {
               "command": "logScoutAnalyzer.resetOverride",
               "title": "Reset Pattern Override",
               "category": "Log Scout"
           },
           {
               "command": "logScoutAnalyzer.editOverride",
               "title": "Edit Pattern Override...",
               "category": "Log Scout"
           }
       ]
   }
   ```

2. **Add to context menus:**
   ```json
   "menus": {
       "view/item/context": [
           {
               "command": "logScoutAnalyzer.overridePattern",
               "when": "view == logScoutResults && viewItem == diagnostic",
               "group": "2_override@1"
           },
           {
               "command": "logScoutAnalyzer.editOverride",
               "when": "view == logScoutResults && viewItem == diagnostic",
               "group": "2_override@2"
           }
       ],
       "commandPalette": [
           {
               "command": "logScoutAnalyzer.viewOverrides"
           }
       ]
   }
   ```

**Acceptance Criteria:**
- [ ] Commands appear in Command Palette
- [ ] Context menu shows on diagnostic items
- [ ] Commands are properly categorized

---

### Task 2.3: Implement Command Handlers

**File:** `vscode-extension/src/extension.ts`

**Steps:**

1. **Override Pattern command:**
   ```typescript
   context.subscriptions.push(
       vscode.commands.registerCommand(
           'logScoutAnalyzer.overridePattern',
           async (diagnostic: vscode.Diagnostic | string) => {
               try {
                   // Get pattern ID from diagnostic or parameter
                   const patternId = typeof diagnostic === 'string' 
                       ? diagnostic 
                       : (diagnostic as any).code?.value;
                   
                   if (!patternId) {
                       vscode.window.showErrorMessage('No pattern ID found');
                       return;
                   }
                   
                   // Get current pattern from LSP server
                   const pattern = await getPatternFromLsp(patternId);
                   
                   // Show quick input for override type
                   const overrideType = await vscode.window.showQuickPick([
                       { label: 'Fix Parameter Extractor', value: 'extractor' },
                       { label: 'Change Severity', value: 'severity' },
                       { label: 'Modify Regex', value: 'regex' },
                       { label: 'Advanced Editor', value: 'advanced' }
                   ], { placeHolder: 'What do you want to override?' });
                   
                   if (!overrideType) return;
                   
                   // Handle based on type
                   if (overrideType.value === 'extractor') {
                       await handleExtractorOverride(patternId, pattern);
                   } else if (overrideType.value === 'advanced') {
                       await showAdvancedEditor(patternId, pattern);
                   } else {
                       await handleSimpleOverride(patternId, pattern, overrideType.value);
                   }
                   
                   // Reload patterns in LSP
                   await reloadLspPatterns();
                   
                   vscode.window.showInformationMessage(
                       `Pattern override created for ${patternId}`
                   );
               } catch (error) {
                   vscode.window.showErrorMessage(
                       `Failed to create override: ${error}`
                   );
               }
           }
       )
   );
   ```

2. **View Overrides command:**
   ```typescript
   context.subscriptions.push(
       vscode.commands.registerCommand(
           'logScoutAnalyzer.viewOverrides',
           async () => {
               const overrides = patternOverrideManager.getAllPatterns();
               
               if (Object.keys(overrides).length === 0) {
                   vscode.window.showInformationMessage('No pattern overrides found');
                   return;
               }
               
               // Show QuickPick with override list
               const items = Object.entries(overrides).map(([id, override]) => ({
                   label: override.name || id,
                   description: override.reason || 'No reason provided',
                   detail: `Modified: ${override.modifiedAt || 'Unknown'}`,
                   patternId: id,
                   override: override
               }));
               
               const selected = await vscode.window.showQuickPick(items, {
                   placeHolder: 'Select a pattern override to edit or reset'
               });
               
               if (selected) {
                   const action = await vscode.window.showQuickPick([
                       { label: 'Edit', value: 'edit' },
                       { label: 'Reset', value: 'reset' },
                       { label: 'Disable', value: 'disable' }
                   ]);
                   
                   if (action?.value === 'edit') {
                       await showAdvancedEditor(selected.patternId, selected.override);
                   } else if (action?.value === 'reset') {
                       await vscode.commands.executeCommand(
                           'logScoutAnalyzer.resetOverride',
                           selected.patternId
                       );
                   }
               }
           }
       )
   );
   ```

3. **Reset Override command:**
   ```typescript
   context.subscriptions.push(
       vscode.commands.registerCommand(
           'logScoutAnalyzer.resetOverride',
           async (patternId: string) => {
               const confirm = await vscode.window.showWarningMessage(
                   `Reset pattern override for ${patternId}? This will revert to the original pattern.`,
                   { modal: true },
                   'Reset',
                   'Cancel'
               );
               
               if (confirm === 'Reset') {
                   patternOverrideManager.resetOverride(patternId);
                   await reloadLspPatterns();
                   vscode.window.showInformationMessage('Pattern override reset');
               }
           }
       )
   );
   ```

4. **Helper function to reload LSP patterns:**
   ```typescript
   async function reloadLspPatterns() {
       const client = getLanguageClient();
       if (client) {
           await client.sendRequest('logScout/reloadPatterns');
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Commands execute without errors
- [ ] User feedback is clear and helpful
- [ ] LSP server reloads patterns after changes
- [ ] Error handling is robust

---

### Task 2.4: Implement Quick Override UI

**File:** `vscode-extension/src/overrideHandlers.ts` (NEW)

**Steps:**

1. **Create file for override handlers:**
   ```typescript
   import * as vscode from 'vscode';
   import { PatternOverrideManager } from './patternOverrideManager';

   export async function handleExtractorOverride(
       patternId: string,
       pattern: any
   ): Promise<void> {
       // Get list of extractors
       const extractors = Object.entries(pattern.parameterExtractors || {});
       
       if (extractors.length === 0) {
           vscode.window.showInformationMessage('This pattern has no parameter extractors');
           return;
       }
       
       // Let user pick which extractor to fix
       const selected = await vscode.window.showQuickPick(
           extractors.map(([name, regex]) => ({
               label: name,
               description: regex as string,
               name,
               regex: regex as string
           })),
           { placeHolder: 'Which parameter extractor needs fixing?' }
       );
       
       if (!selected) return;
       
       // Get new regex
       const newRegex = await vscode.window.showInputBox({
           prompt: `New regex for ${selected.name}`,
           value: selected.regex,
           validateInput: (value) => {
               try {
                   new RegExp(value);
                   return null;
               } catch (e) {
                   return 'Invalid regex syntax';
               }
           }
       });
       
       if (!newRegex) return;
       
       // Get reason
       const reason = await vscode.window.showInputBox({
           prompt: 'Why are you changing this extractor?',
           placeHolder: 'e.g., Original regex only matches 3xx/4xx/5xx, missing 2xx'
       });
       
       // Create override
       const manager = PatternOverrideManager.getInstance();
       await manager.createOverride(patternId, 'mongodb', {
           parameterExtractors: {
               [selected.name]: {
                   override: newRegex,
                   reason: reason || 'Manual override'
               }
           }
       });
   }

   export async function handleSimpleOverride(
       patternId: string,
       pattern: any,
       type: string
   ): Promise<void> {
       if (type === 'severity') {
           const severity = await vscode.window.showQuickPick(
               ['error', 'warning', 'info', 'hint'],
               { placeHolder: `Current: ${pattern.severity}` }
           );
           
           if (severity) {
               const manager = PatternOverrideManager.getInstance();
               await manager.createOverride(patternId, 'mongodb', {
                   severity
               });
           }
       } else if (type === 'regex') {
           const newRegex = await vscode.window.showInputBox({
               prompt: 'New regex pattern',
               value: pattern.regex,
               validateInput: (value) => {
                   try {
                       new RegExp(value);
                       return null;
                   } catch (e) {
                       return 'Invalid regex syntax';
                   }
               }
           });
           
           if (newRegex) {
               const manager = PatternOverrideManager.getInstance();
               await manager.createOverride(patternId, 'mongodb', {
                   regex: newRegex
               });
           }
       }
   }
   ```

**Acceptance Criteria:**
- [ ] UI is intuitive and easy to use
- [ ] Regex validation works correctly
- [ ] User can see current values
- [ ] Changes are saved immediately

---

### Task 2.5: Add Status Bar Indicator

**File:** `vscode-extension/src/extension.ts`

**Steps:**

1. **Create status bar item:**
   ```typescript
   let overrideStatusBar: vscode.StatusBarItem;

   export function activate(context: vscode.ExtensionContext) {
       // ... existing code ...
       
       // Create status bar
       overrideStatusBar = vscode.window.createStatusBarItem(
           vscode.StatusBarAlignment.Right,
           100
       );
       overrideStatusBar.command = 'logScoutAnalyzer.viewOverrides';
       context.subscriptions.push(overrideStatusBar);
       
       // Update on file changes
       updateOverrideStatus();
       
       // Watch for changes
       const watcher = vscode.workspace.createFileSystemWatcher(
           '**/.log-scout/pattern-overrides.json'
       );
       watcher.onDidChange(() => updateOverrideStatus());
       watcher.onDidCreate(() => updateOverrideStatus());
       watcher.onDidDelete(() => updateOverrideStatus());
       context.subscriptions.push(watcher);
   }

   function updateOverrideStatus() {
       const manager = PatternOverrideManager.getInstance();
       const overrides = manager.getAllPatterns();
       const count = Object.keys(overrides).length;
       
       if (count > 0) {
           overrideStatusBar.text = `$(edit) ${count} Pattern Override${count > 1 ? 's' : ''}`;
           overrideStatusBar.tooltip = 'Click to view pattern overrides';
           overrideStatusBar.show();
       } else {
           overrideStatusBar.hide();
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Status bar shows when overrides exist
- [ ] Count updates automatically
- [ ] Clicking opens override list
- [ ] Hides when no overrides

---

### Phase 2 Completion Checklist

- [ ] All commands work as expected
- [ ] UI is responsive and intuitive
- [ ] Error handling is comprehensive
- [ ] Status bar updates correctly
- [ ] Code review completed
- [ ] User documentation drafted
- [ ] Git commit with descriptive message

**Deliverable:** Users can create and manage overrides through VSCode UI

---

## Phase 3: Advanced Features

**Goal:** Enhanced override management and team collaboration  
**Duration:** 3-5 days  
**Priority:** P2 (Medium)

### Task 3.1: Advanced Override Editor (Webview)

**File:** `vscode-extension/src/views/patternOverrideEditor.ts` (NEW)

**Steps:**

1. **Create webview panel:**
   ```typescript
   import * as vscode from 'vscode';

   export class PatternOverrideEditor {
       private static currentPanel: vscode.WebviewPanel | undefined;

       public static show(
           context: vscode.ExtensionContext,
           patternId: string,
           pattern: any
       ) {
           const columnToShowIn = vscode.window.activeTextEditor
               ? vscode.window.activeTextEditor.viewColumn
               : undefined;

           if (PatternOverrideEditor.currentPanel) {
               PatternOverrideEditor.currentPanel.reveal(columnToShowIn);
           } else {
               PatternOverrideEditor.currentPanel = vscode.window.createWebviewPanel(
                   'patternOverrideEditor',
                   `Override: ${pattern.name || patternId}`,
                   columnToShowIn || vscode.ViewColumn.One,
                   {
                       enableScripts: true,
                       retainContextWhenHidden: true,
                       localResourceRoots: [
                           vscode.Uri.joinPath(context.extensionUri, 'media')
                       ]
                   }
               );

               PatternOverrideEditor.currentPanel.webview.html =
                   this.getHtmlContent(
                       PatternOverrideEditor.currentPanel.webview,
                       context.extensionUri,
                       pattern
                   );

               PatternOverrideEditor.currentPanel.webview.onDidReceiveMessage(
                   async message => {
                       switch (message.command) {
                           case 'save':
                               await this.saveOverride(patternId, message.data);
                               vscode.window.showInformationMessage('Override saved');
                               break;
                           case 'test':
                               await this.testRegex(message.data);
                               break;
                       }
                   }
               );

               PatternOverrideEditor.currentPanel.onDidDispose(() => {
                   PatternOverrideEditor.currentPanel = undefined;
               });
           }
       }

       private static getHtmlContent(
           webview: vscode.Webview,
           extensionUri: vscode.Uri,
           pattern: any
       ): string {
           // Generate HTML for advanced editor
           return `<!DOCTYPE html>
   <html>
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>Pattern Override Editor</title>
       <style>
           body {
               font-family: var(--vscode-font-family);
               padding: 20px;
               color: var(--vscode-foreground);
               background-color: var(--vscode-editor-background);
           }
           .section {
               margin: 20px 0;
               padding: 15px;
               border: 1px solid var(--vscode-panel-border);
               border-radius: 4px;
               background-color: var(--vscode-editor-background);
           }
           .section h2 {
               margin-top: 0;
               color: var(--vscode-titleBar-activeForeground);
           }
           .field {
               margin: 15px 0;
           }
           .field label {
               display: block;
               font-weight: bold;
               margin-bottom: 5px;
               color: var(--vscode-input-foreground);
           }
           .field input, .field textarea {
               width: 100%;
               padding: 8px;
               background-color: var(--vscode-input-background);
               color: var(--vscode-input-foreground);
               border: 1px solid var(--vscode-input-border);
               border-radius: 2px;
               font-family: var(--vscode-editor-font-family);
           }
           .field textarea {
               min-height: 60px;
               font-family: monospace;
           }
           .original {
               color: var(--vscode-descriptionForeground);
               font-size: 0.9em;
               margin-top: 5px;
               font-family: monospace;
           }
           .buttons {
               margin-top: 20px;
               display: flex;
               gap: 10px;
           }
           button {
               padding: 8px 16px;
               background-color: var(--vscode-button-background);
               color: var(--vscode-button-foreground);
               border: none;
               border-radius: 2px;
               cursor: pointer;
           }
           button:hover {
               background-color: var(--vscode-button-hoverBackground);
           }
           .test-result {
               margin-top: 10px;
               padding: 10px;
               border-radius: 4px;
               display: none;
           }
           .test-result.success {
               background-color: var(--vscode-testing-iconPassed);
               color: white;
           }
           .test-result.error {
               background-color: var(--vscode-testing-iconFailed);
               color: white;
           }
       </style>
   </head>
   <body>
       <h1>Override Pattern: ${pattern.name || pattern.id}</h1>
       <p><strong>Pattern ID:</strong> <code>${pattern.id}</code></p>
       
       <div class="section">
           <h2>Pattern Regex</h2>
           <div class="field">
               <label>Regular Expression</label>
               <textarea id="regex">${pattern.regex || ''}</textarea>
               <div class="original">Original: ${pattern.regex || 'N/A'}</div>
           </div>
       </div>
       
       <div class="section">
           <h2>Parameter Extractors</h2>
           ${Object.entries(pattern.parameterExtractors || {})
               .map(([name, regex]) => `
                   <div class="field">
                       <label>${name}</label>
                       <input type="text" 
                              id="extractor-${name}" 
                              value="${regex}"
                              data-original="${regex}" />
                       <div class="original">Original: ${regex}</div>
                       <input type="text" 
                              id="reason-${name}" 
                              placeholder="Reason for override..." />
                   </div>
               `).join('')}
       </div>
       
       <div class="section">
           <h2>Severity</h2>
           <div class="field">
               <label>Severity Level</label>
               <select id="severity">
                   <option value="">-- Keep Original --</option>
                   <option value="error" ${pattern.severity === 'error' ? 'selected' : ''}>Error</option>
                   <option value="warning" ${pattern.severity === 'warning' ? 'selected' : ''}>Warning</option>
                   <option value="info" ${pattern.severity === 'info' ? 'selected' : ''}>Info</option>
                   <option value="hint" ${pattern.severity === 'hint' ? 'selected' : ''}>Hint</option>
               </select>
           </div>
       </div>
       
       <div class="section">
           <h2>Notes</h2>
           <div class="field">
               <textarea id="notes" placeholder="Why are you overriding this pattern?"></textarea>
           </div>
       </div>
       
       <div class="buttons">
           <button onclick="saveOverride()">Save Override</button>
           <button onclick="testRegex()">Test Regex</button>
           <button onclick="cancel()">Cancel</button>
       </div>
       
       <div id="testResult" class="test-result"></div>
       
       <script>
           const vscode = acquireVsCodeApi();
           
           function saveOverride() {
               const data = {
                   regex: document.getElementById('regex').value,
                   severity: document.getElementById('severity').value || undefined,
                   parameterExtractors: {},
                   notes: document.getElementById('notes').value
               };
               
               // Collect extractor overrides
               ${Object.keys(pattern.parameterExtractors || {})
                   .map(name => `
                       const extractor_${name} = document.getElementById('extractor-${name}');
                       const reason_${name} = document.getElementById('reason-${name}');
                       if (extractor_${name}.value !== extractor_${name}.dataset.original) {
                           data.parameterExtractors['${name}'] = {
                               override: extractor_${name}.value,
                               reason: reason_${name}.value
                           };
                       }
                   `).join('\n')}
               
               vscode.postMessage({ command: 'save', data });
           }
           
           function testRegex() {
               const regex = document.getElementById('regex').value;
               try {
                   new RegExp(regex);
                   showTestResult('Valid regex syntax', true);
               } catch (e) {
                   showTestResult('Invalid regex: ' + e.message, false);
               }
           }
           
           function showTestResult(message, success) {
               const result = document.getElementById('testResult');
               result.textContent = message;
               result.className = 'test-result ' + (success ? 'success' : 'error');
               result.style.display = 'block';
               setTimeout(() => {
                   result.style.display = 'none';
               }, 3000);
           }
           
           function cancel() {
               vscode.postMessage({ command: 'cancel' });
           }
       </script>
   </body>
   </html>`;
       }

       private static async saveOverride(patternId: string, data: any) {
           const manager = PatternOverrideManager.getInstance();
           await manager.createOverride(patternId, 'mongodb', data);
           
           // Reload patterns
           const client = getLanguageClient();
           if (client) {
               await client.sendRequest('logScout/reloadPatterns');
           }
       }

       private static async testRegex(data: any) {
           // Could send to LSP for more comprehensive testing
           try {
               new RegExp(data.regex);
               vscode.window.showInformationMessage('Regex is valid');
           } catch (e) {
               vscode.window.showErrorMessage(`Invalid regex: ${e}`);
           }
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Webview displays correctly
- [ ] All fields editable
- [ ] Save creates proper override
- [ ] Test functionality works
- [ ] UI follows VSCode design guidelines

---

### Task 3.2: Export/Import Overrides

**File:** `vscode-extension/src/overrideIO.ts` (NEW)

**Steps:**

1. **Export command:**
   ```typescript
   export async function exportOverrides() {
       const manager = PatternOverrideManager.getInstance();
       const overrides = manager.getAllPatterns();
       
       const uri = await vscode.window.showSaveDialog({
           defaultUri: vscode.Uri.file('pattern-overrides.json'),
           filters: {
               'JSON': ['json']
           }
       });
       
       if (uri) {
           const content = JSON.stringify({
               version: '1.0',
               exported: new Date().toISOString(),
               overrides
           }, null, 2);
           
           await vscode.workspace.fs.writeFile(
               uri,
               Buffer.from(content, 'utf8')
           );
           
           vscode.window.showInformationMessage('Overrides exported successfully');
       }
   }
   ```

2. **Import command:**
   ```typescript
   export async function importOverrides() {
       const uri = await vscode.window.showOpenDialog({
           canSelectFiles: true,
           canSelectMany: false,
           filters: {
               'JSON': ['json']
           }
       });
       
       if (uri && uri[0]) {
           try {
               const content = await vscode.workspace.fs.readFile(uri[0]);
               const data = JSON.parse(content.toString());
               
               const manager = PatternOverrideManager.getInstance();
               
               // Ask if they want to merge or replace
               const action = await vscode.window.showQuickPick(
                   ['Merge with existing', 'Replace all existing'],
                   { placeHolder: 'How do you want to import?' }
               );
               
               if (action === 'Replace all existing') {
                   await manager.replaceAll(data.overrides);
               } else {
                   await manager.merge(data.overrides);
               }
               
               vscode.window.showInformationMessage('Overrides imported successfully');
               
               // Reload patterns
               const client = getLanguageClient();
               if (client) {
                   await client.sendRequest('logScout/reloadPatterns');
               }
           } catch (e) {
               vscode.window.showErrorMessage(`Import failed: ${e}`);
           }
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Export creates valid JSON file
- [ ] Import validates file format
- [ ] Merge/replace options work correctly
- [ ] Errors handled gracefully

---

### Task 3.3: Pattern Override TreeView

**File:** `vscode-extension/src/views/overrideTreeView.ts` (NEW)

**Steps:**

1. **Create TreeDataProvider:**
   ```typescript
   import * as vscode from 'vscode';

   export class OverrideTreeProvider implements vscode.TreeDataProvider<OverrideItem> {
       private _onDidChangeTreeData = new vscode.EventEmitter<OverrideItem | undefined>();
       readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

       constructor(private manager: PatternOverrideManager) {
           // Watch for changes
           const watcher = vscode.workspace.createFileSystemWatcher(
               '**/.log-scout/pattern-overrides.json'
           );
           watcher.onDidChange(() => this.refresh());
           watcher.onDidCreate(() => this.refresh());
           watcher.onDidDelete(() => this.refresh());
       }

       refresh(): void {
           this._onDidChangeTreeData.fire(undefined);
       }

       getTreeItem(element: OverrideItem): vscode.TreeItem {
           return element;
       }

       getChildren(element?: OverrideItem): Thenable<OverrideItem[]> {
           if (!element) {
               // Root level - show all overrides
               const overrides = this.manager.getAllPatterns();
               return Promise.resolve(
                   Object.entries(overrides).map(([id, override]) =>
                       new OverrideItem(
                           override.name || id,
                           id,
                           override,
                           vscode.TreeItemCollapsibleState.Collapsed
                       )
                   )
               );
           } else {
               // Show override details
               const details: OverrideItem[] = [];
               
               if (element.override.overrides?.regex) {
                   details.push(new OverrideItem(
                       'Regex Override',
                       element.id,
                       element.override,
                       vscode.TreeItemCollapsibleState.None
                   ));
               }
               
               if (element.override.overrides?.severity) {
                   details.push(new OverrideItem(
                       `Severity: ${element.override.overrides.severity}`,
                       element.id,
                       element.override,
                       vscode.TreeItemCollapsibleState.None
                   ));
               }
               
               if (element.override.overrides?.parameterExtractors) {
                   const count = Object.keys(element.override.overrides.parameterExtractors).length;
                   details.push(new OverrideItem(
                       `${count} Extractor Override${count > 1 ? 's' : ''}`,
                       element.id,
                       element.override,
                       vscode.TreeItemCollapsibleState.None
                   ));
               }
               
               return Promise.resolve(details);
           }
       }
   }

   class OverrideItem extends vscode.TreeItem {
       constructor(
           public readonly label: string,
           public readonly id: string,
           public readonly override: any,
           public readonly collapsibleState: vscode.TreeItemCollapsibleState
       ) {
           super(label, collapsibleState);
           
           this.contextValue = 'override';
           this.tooltip = override.notes || override.reason || 'Pattern override';
           
           if (collapsibleState === vscode.TreeItemCollapsibleState.None) {
               this.iconPath = new vscode.ThemeIcon('edit');
           } else {
               this.iconPath = new vscode.ThemeIcon('file-code');
           }
       }
   }
   ```

2. **Register in package.json:**
   ```json
   "views": {
       "explorer": [
           {
               "id": "logScoutOverrides",
               "name": "Pattern Overrides",
               "when": "logScoutOverridesExist"
           }
       ]
   }
   ```

3. **Register in extension.ts:**
   ```typescript
   const overrideProvider = new OverrideTreeProvider(patternOverrideManager);
   vscode.window.registerTreeDataProvider('logScoutOverrides', overrideProvider);
   ```

**Acceptance Criteria:**
- [ ] TreeView shows all overrides
- [ ] Expandable to show details
- [ ] Updates automatically on file changes
- [ ] Context menu actions work

---

### Phase 3 Completion Checklist

- [ ] Advanced editor fully functional
- [ ] Export/import tested with real data
- [ ] TreeView displays correctly
- [ ] All features documented
- [ ] Code review completed
- [ ] Git commit with descriptive message

**Deliverable:** Full-featured override management system

---

## Phase 4: Agentic Intelligence (Optional)

**Goal:** Add intelligent pattern quality monitoring and automatic override suggestions  
**Duration:** 2-4 weeks (can be done in parallel or after Phase 3)  
**Priority:** P2-P3 (Nice to have, high value)

### Background

After implementing the basic override system, you may notice patterns:
- Users repeatedly fix the same types of issues (e.g., failed extractors)
- Certain patterns consistently need overrides
- Override suggestions could be automated based on learned patterns

**Agentic AI** can help by:
- Automatically detecting pattern quality issues
- Learning from user feedback to improve suggestions
- Discovering temporal correlations between events
- Providing root cause analysis across multiple diagnostics

**See:** `AGENTIC_DESIGN_ANALYSIS.md` and `AGENTIC_DECISION_FRAMEWORK.md` for detailed guidance.

### Task 4.1: Assess Need for Agentic Features

**Before starting this phase, evaluate:**

1. **Do we have enough data?**
   - [ ] 100+ patterns in use
   - [ ] 50+ override operations performed
   - [ ] Clear patterns in what users override

2. **Would learning add value?**
   - [ ] Users repeatedly fix similar issues
   - [ ] Override suggestions could be better
   - [ ] Time savings justify complexity

3. **Do we have resources?**
   - [ ] Team comfortable with ML/agents
   - [ ] 2-4 weeks available for development
   - [ ] Infrastructure for feedback loops

**Decision Point:** If 2/3 categories say YES, proceed. Otherwise, defer this phase.

### Task 4.2: Implement Pattern Quality Monitor

**File:** `lsp-server/src/quality_monitor.rs` (NEW)

**Steps:**

1. **Create quality monitoring module:**
   ```rust
   pub struct QualityMonitor {
       issues: Arc<RwLock<HashMap<String, QualityIssue>>>,
       stats: Arc<RwLock<HashMap<String, PatternMatchStats>>>,
   }
   
   pub struct QualityIssue {
       pub issue_type: QualityIssueType,
       pub pattern_id: String,
       pub severity: IssueSeverity,
       pub description: String,
       pub suggestion: Option<OverrideSuggestion>,
       pub occurrences: u32,
   }
   
   pub enum QualityIssueType {
       FailedExtraction,
       MisclassifiedPattern,
       PerformanceIssue,
       LowConfidence,
   }
   ```

2. **Detect failed parameter extractions:**
   ```rust
   impl QualityMonitor {
       pub fn analyze_diagnostic(&self, diagnostic: &Diagnostic) {
           // Check for unsubstituted placeholders
           if diagnostic.message.contains("{{") {
               self.record_issue(QualityIssue {
                   issue_type: QualityIssueType::FailedExtraction,
                   pattern_id: diagnostic.pattern_id.clone(),
                   severity: IssueSeverity::High,
                   description: "Parameter extraction failed".to_string(),
                   suggestion: self.generate_suggestion(diagnostic),
                   occurrences: 1,
               });
           }
       }
   }
   ```

3. **Integrate with pattern engine:**
   - [ ] Hook into diagnostic creation
   - [ ] Send quality notifications to VSCode
   - [ ] Track statistics per pattern

**Acceptance Criteria:**
- [ ] Failed extractions detected automatically
- [ ] Quality issues tracked and aggregated
- [ ] Notifications sent to VSCode
- [ ] Performance overhead <2ms per diagnostic

**See:** `PATTERN_QUALITY_MONITORING.md` for detailed implementation

### Task 4.3: Implement Simple Learning Agent

**File:** `lsp-server/src/agents/quality_agent.rs` (NEW)

**Steps:**

1. **Start with rule-based suggestions:**
   ```rust
   pub struct PatternQualityAgent {
       knowledge_base: KnowledgeBase,
       statistics: HashMap<String, PatternStats>,
   }
   
   impl PatternQualityAgent {
       pub fn suggest_fix(&self, issue: &QualityIssue) -> OverrideSuggestion {
           match issue.issue_type {
               QualityIssueType::FailedExtraction => {
                   self.suggest_extractor_fix(issue)
               }
               _ => self.heuristic_suggestion(issue),
           }
       }
       
       fn suggest_extractor_fix(&self, issue: &QualityIssue) -> OverrideSuggestion {
           // Infer pattern from parameter name and log samples
           let param_name = issue.parameter_name.as_ref()?;
           match param_name.to_uppercase().as_str() {
               "CODE" => OverrideSuggestion {
                   suggested_regex: r"(\d{3})".to_string(),
                   confidence: 0.8,
                   reason: "HTTP status codes are 3 digits".to_string(),
               },
               "IP" => OverrideSuggestion {
                   suggested_regex: r"(\d+\.\d+\.\d+\.\d+)".to_string(),
                   confidence: 0.9,
                   reason: "IP addresses have dotted format".to_string(),
               },
               _ => self.generic_suggestion(),
           }
       }
   }
   ```

2. **Add feedback tracking:**
   ```rust
   pub struct KnowledgeBase {
       successful_suggestions: Vec<SuccessCase>,
       failed_suggestions: Vec<FailureCase>,
   }
   
   impl KnowledgeBase {
       pub fn record_feedback(&mut self, feedback: &UserFeedback) {
           match feedback.action {
               FeedbackAction::Accepted => {
                   self.successful_suggestions.push(SuccessCase {
                       issue: feedback.issue.clone(),
                       suggestion: feedback.suggestion.clone(),
                       timestamp: Utc::now(),
                   });
               }
               FeedbackAction::Rejected => {
                   self.failed_suggestions.push(FailureCase {
                       issue: feedback.issue.clone(),
                       suggestion: feedback.suggestion.clone(),
                       user_correction: feedback.user_override.clone(),
                       timestamp: Utc::now(),
                   });
               }
           }
       }
       
       pub fn improve_confidence(&mut self) {
           // Recalculate confidence scores based on history
           let total = self.successful_suggestions.len() 
                     + self.failed_suggestions.len();
           let success_rate = self.successful_suggestions.len() as f32 
                            / total as f32;
           // Update future suggestions with learned confidence
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Agent suggests fixes for common issues
- [ ] Feedback tracked and stored
- [ ] Confidence scores calculated
- [ ] Suggestions improve with feedback (manual verification)

### Task 4.4: VSCode Quality Notification UI

**File:** `vscode-extension/src/qualityNotifications.ts` (NEW)

**Steps:**

1. **Handle quality notifications from LSP:**
   ```typescript
   client.onNotification('logScout/qualityIssue', async (issue: QualityIssue) => {
       const action = await vscode.window.showWarningMessage(
           `Pattern Quality Issue: ${issue.description}`,
           `View Details`,
           `Apply Suggested Fix`,
           `Dismiss`
       );
       
       if (action === 'Apply Suggested Fix' && issue.suggestion) {
           await showSuggestionPreview(issue);
       }
   });
   ```

2. **Preview suggestion before applying:**
   ```typescript
   async function showSuggestionPreview(issue: QualityIssue) {
       const preview = `
   Pattern: ${issue.pattern_id}
   Issue: ${issue.description}
   
   Suggested Fix:
   ${formatSuggestion(issue.suggestion)}
   
   Confidence: ${(issue.suggestion.confidence * 100).toFixed(0)}%
   Reason: ${issue.suggestion.reason}
       `;
       
       const apply = await vscode.window.showInformationMessage(
           preview,
           { modal: true },
           'Apply',
           'Edit First',
           'Cancel'
       );
       
       if (apply === 'Apply') {
           await applyAutoSuggestion(issue);
       } else if (apply === 'Edit First') {
           await showAdvancedEditor(issue.pattern_id, issue.suggestion);
       }
   }
   ```

3. **Track user feedback:**
   ```typescript
   async function applyAutoSuggestion(issue: QualityIssue) {
       try {
           // Apply the suggestion as an override
           await patternOverrideManager.createOverride(
               issue.pattern_id,
               'mongodb',
               issue.suggestion.override_data
           );
           
           // Send feedback to LSP for learning
           await client.sendNotification('logScout/userFeedback', {
               issue_id: issue.id,
               action: 'accepted',
               suggestion: issue.suggestion,
           });
           
           // Reload patterns
           await reloadLspPatterns();
           
           vscode.window.showInformationMessage('Override applied successfully');
       } catch (error) {
           vscode.window.showErrorMessage(`Failed to apply suggestion: ${error}`);
       }
   }
   ```

**Acceptance Criteria:**
- [ ] Quality notifications appear in VSCode
- [ ] Preview shows suggestion details
- [ ] User can accept/reject/modify
- [ ] Feedback sent back to LSP for learning

### Task 4.5: Optional - Advanced Agent Features

**Only if basic agent proves valuable:**

1. **LLM Integration (for complex reasoning):**
   - [ ] Choose LLM provider (OpenAI, local model)
   - [ ] Design prompts for pattern analysis
   - [ ] Add caching to reduce costs
   - [ ] Fallback to heuristics if unavailable

2. **Temporal Correlation Discovery:**
   - [ ] Detect start/end event pairs
   - [ ] Find patterns with common parameters
   - [ ] Suggest temporal pattern creation

3. **Root Cause Analysis:**
   - [ ] Analyze diagnostic timelines
   - [ ] Find causal relationships
   - [ ] Suggest root cause fixes

**See:** `AGENTIC_DESIGN_ANALYSIS.md` Section "Implementation Roadmap" for details

### Phase 4 Completion Checklist

- [ ] Quality monitoring detects issues
- [ ] Agent suggests reasonable fixes
- [ ] Users can accept/reject suggestions
- [ ] Feedback loop working
- [ ] Suggestions improve with usage (demonstrate improvement)
- [ ] Performance acceptable (<5ms overhead)
- [ ] Documentation complete
- [ ] User guide updated
- [ ] Git commit: "feat: Intelligent pattern quality monitoring"

**Deliverable:** Self-improving pattern quality system with automatic override suggestions

### Phase 4 Decision Points

**After Task 4.3 (Basic Agent):**
- [ ] Evaluate suggestion acceptance rate
- [ ] If <50% accepted → Improve heuristics before continuing
- [ ] If >60% accepted → Continue to advanced features

**After Task 4.5 (Advanced Features):**
- [ ] Evaluate ROI vs complexity
- [ ] If valuable → Expand to more agent types
- [ ] If marginal → Focus on core features

---

## Testing & Validation

### Unit Tests

**LSP Server Tests:**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_empty_overrides() {
        let result = load_overrides(Some("/nonexistent"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_merge_extractor() {
        let mut pattern = Pattern {
            id: "test".to_string(),
            parameter_extractors: HashMap::from([
                ("CODE".to_string(), r"([45]\d{2})".to_string())
            ]),
            ..Default::default()
        };

        let override_data = PatternOverride {
            id: "override-test".to_string(),
            overrides: OverrideValues {
                parameter_extractors: Some(HashMap::from([
                    ("CODE".to_string(), ExtractorOverride {
                        override_value: r"(\d{3})".to_string(),
                        original: Some(r"([45]\d{2})".to_string()),
                        reason: Some("Fix to match all codes".to_string())
                    })
                ])),
                ..Default::default()
            },
            ..Default::default()
        };

        merge_pattern(&mut pattern, &override_data);

        assert_eq!(
            pattern.parameter_extractors.get("CODE").unwrap(),
            r"(\d{3})"
        );
        assert!(pattern.is_override);
    }
}
```

**VSCode Extension Tests:**

```typescript
suite('Pattern Override Tests', () => {
    test('Create override', async () => {
        const manager = PatternOverrideManager.getInstance();
        await manager.createOverride('test-pattern', 'mongodb', {
            parameterExtractors: {
                TEST: {
                    override: 'new-regex',
                    reason: 'Testing'
                }
            }
        });
        
        const overrides = manager.getAllPatterns();
        assert.ok(overrides['override-test-pattern']);
    });
    
    test('Reset override', async () => {
        const manager = PatternOverrideManager.getInstance();
        await manager.createOverride('test-pattern', 'mongodb', {});
        manager.resetOverride('test-pattern');
        
        const overrides = manager.getAllPatterns();
        assert.strictEqual(overrides['override-test-pattern'], undefined);
    });
});
```

---

### Integration Tests

**Test Scenarios:**

1. **End-to-End Override Flow:**
   - [ ] Create override in VSCode
   - [ ] Verify JSON file written
   - [ ] Restart LSP server
   - [ ] Verify override applied
   - [ ] Check diagnostic uses new extractor

2. **Multi-Workspace:**
   - [ ] Create override in workspace A
   - [ ] Open workspace B
   - [ ] Verify workspace A overrides don't affect B
   - [ ] Create override in workspace B
   - [ ] Verify both workspaces independent

3. **Team Collaboration:**
   - [ ] Create override
   - [ ] Commit to Git
   - [ ] Clone to new machine
   - [ ] Verify override loads correctly
   - [ ] Make change and push
   - [ ] Pull and verify update

---

### Manual Testing Checklist

**Phase 1:**
- [ ] LSP loads overrides on startup
- [ ] Overrides applied to patterns
- [ ] Logging shows override activity
- [ ] Diagnostics use overridden extractors
- [ ] Pattern reload command works

**Phase 2:**
- [ ] Context menu appears on diagnostics
- [ ] Override creation wizard works
- [ ] Quick fixes apply correctly
- [ ] View overrides command lists all
- [ ] Reset override removes entry
- [ ] Status bar updates

**Phase 3:**
- [ ] Advanced editor displays correctly
- [ ] All fields editable
- [ ] Save persists changes
- [ ] Export creates valid file
- [ ] Import loads correctly
- [ ] TreeView shows overrides

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation updated:
  - [ ] README.md
  - [ ] User guide
  - [ ] API documentation
- [ ] Changelog updated
- [ ] Version numbers incremented

### Build & Package

**LSP Server:**
```bash
cd lsp-server
cargo build --release
cargo test
```

**VSCode Extension:**
```bash
cd vscode-extension
npm install
npm run compile
npm run test
vsce package
```

### Deployment Steps

1. **Tag release in Git:**
   ```bash
   git tag -a v1.x.0 -m "Pattern Override System"
   git push origin v1.x.0
   ```

2. **Deploy LSP binary:**
   ```bash
   # Copy to distribution location
   cp target/release/log-scout-lsp-server.exe dist/
   ```

3. **Install VSCode extension:**
   ```bash
   code --install-extension log-scout-analyzer-x.x.x.vsix
   ```

4. **Verify installation:**
   - [ ] Extension loads
   - [ ] LSP server starts
   - [ ] Commands available
   - [ ] Override file created

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test with real log files
- [ ] Gather user feedback
- [ ] Update documentation based on feedback

---

## Success Metrics

### Functionality Metrics
- [ ] 100% of override types work (regex, severity, extractors)
- [ ] 0 data loss incidents (overrides persist)
- [ ] <100ms overhead for pattern loading

### Usability Metrics
- [ ] User can create override in <30 seconds
- [ ] UI requires <5 clicks for common tasks
- [ ] No crashes or freezes

### Adoption Metrics
- [ ] Documentation complete
- [ ] At least 3 team members using overrides
- [ ] Positive feedback on ease of use

---

## Rollback Plan

If critical issues arise:

1. **Disable override loading:**
   - Comment out `load_overrides()` call
   - Rebuild LSP server
   - Redeploy

2. **Remove VSCode commands:**
   - Comment out command registrations
   - Rebuild extension
   - Reinstall

3. **Communicate to users:**
   - Email/Slack notification
   - Document known issues
   - Provide timeline for fix

---

## Future Enhancements (Post-MVP)

### V2.0 Features
- [ ] Pattern validation before save
- [ ] Visual regex tester with sample logs
- [ ] Override suggestions based on failed matches
- [ ] Team override sharing server
- [ ] Override analytics (most overridden patterns)
- [ ] Automatic sync with TagScout for approved fixes
- [ ] Community pattern marketplace

### V3.0 Features
- [ ] Machine learning pattern suggestions
- [ ] Collaborative editing
- [ ] Pattern versioning and history
- [ ] A/B testing for pattern effectiveness

---

## Appendix: File Locations

### LSP Server Files
```
lsp-server/
├── src/
│   ├── pattern_loader.rs          [NEW - Phase 1]
│   ├── main.rs                     [MODIFIED - Phase 1]
│   └── pattern_engine.rs           [MODIFIED - Phase 1]
└── Cargo.toml                      [MODIFIED - Phase 1]
```

### VSCode Extension Files
```
vscode-extension/
├── src/
│   ├── patternOverrideManager.ts   [EXISTING - verify Phase 2]
│   ├── overrideHandlers.ts         [NEW - Phase 2]
│   ├── overrideIO.ts               [NEW - Phase 3]
│   ├── views/
│   │   ├── patternOverrideEditor.ts [NEW - Phase 3]
│   │   └── overrideTreeView.ts     [NEW - Phase 3]
│   └── extension.ts                [MODIFIED - Phase 2]
└── package.json                    [MODIFIED - Phase 2]
```

### User Files
```
.log-scout/
└── pattern-overrides.json          [AUTO-GENERATED]
```

---

## Appendix: Sample Override File

```json
{
  "version": "1.0",
  "lastSync": "2024-01-15T10:30:00Z",
  "overrides": {
    "override-5efde66677e36d0001e62450": {
      "id": "override-5efde66677e36d0001e62450",
      "sourceType": "mongodb",
      "sourceId": "5efde66677e36d0001e62450",
      "name": "HTTP Error Pattern",
      "notes": "Fixed CODE extractor to match all HTTP status codes",
      "reason": "Original regex only matched 3xx/4xx/5xx, missing 2xx",
      "createdAt": "2024-01-15T10:30:00Z",
      "modifiedAt": "2024-01-15T10:30:00Z",
      "enabled": true,
      "overrides": {
        "parameterExtractors": {
          "CODE": {
            "original": "([45]\\d{2})",
            "override": "(\\d{3})",
            "reason": "Match all HTTP status codes including 2xx success codes"
          }
        }
      }
    }
  },
  "custom": {}
}
```

---

## Support & Questions

**Documentation:** See `PATTERN_OVERRIDE_INTEGRATION.md` for detailed design  
**Issues:** File bug reports in project issue tracker  
**Questions:** Contact development team

---

**Ready to Start?** Begin with [Phase 1, Task 1.1](#task-11-create-pattern-loader-module) ✅

---

## Related Documents

### Core Implementation
- **PATTERN_OVERRIDE_INTEGRATION.md** - Detailed design specification
- **PATTERN_OVERRIDE_CHECKLIST.md** - Quick reference checklist
- **PATTERN_OVERRIDE_QUICK_START.md** - Developer quick start guide

### Pattern Quality & Intelligence
- **PATTERN_QUALITY_MONITORING.md** - Quality detection strategies
- **AGENTIC_DESIGN_ANALYSIS.md** - When and how to use agentic AI
- **AGENTIC_DECISION_FRAMEWORK.md** - Quick decision guide for agents

### Context & Background
- **PARAMETER_EXTRACTION_FIX.md** - Parameter extraction context
- **PROTOCOL_ANALYSIS_INTEGRATION.md** - Multi-tier analysis integration

---

## FAQ

**Q: Should I implement Phase 4 (Agentic Intelligence)?**  
A: Only if you have 100+ patterns and users are creating many overrides. Start with Phases 1-3 first, then evaluate if learning would add value. See `AGENTIC_DECISION_FRAMEWORK.md`.

**Q: Can I skip Phase 3 (Advanced Features)?**  
A: Yes. Phases 1-2 provide core functionality. Phase 3 adds convenience features. Prioritize based on user feedback.

**Q: How long will this take total?**  
A: Phase 1-2: 1-2 weeks, Phase 3: 3-5 days, Phase 4: 2-4 weeks. Total: 3-7 weeks depending on scope.

**Q: Do I need machine learning experience for Phase 4?**  
A: Start with simple rule-based suggestions (no ML needed). Add learning only if valuable. ML is optional enhancement.

**Q: Will overrides work across different machines?**  
A: Yes, if you commit `.log-scout/pattern-overrides.json` to Git. Teams can share overrides through version control.

**Q: What if TagScout updates a pattern I've overridden?**  
A: Your override takes precedence. You'll need to manually review and update if TagScout's fix is better. Future: automatic merge notifications.

---

**Status:** Ready for implementation. Start with Phase 1! ✅