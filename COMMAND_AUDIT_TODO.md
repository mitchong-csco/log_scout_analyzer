# Command Audit & Cleanup TODO

**Created**: February 21, 2024  
**Purpose**: Audit all VS Code commands and LSP commands to identify obsolete/unused ones  
**Status**: 🚨 **ACTION REQUIRED**

---

## 🎯 Objective

Review all registered commands in the extension to:
1. ✅ Identify which commands are actively used
2. ❌ Find obsolete/unused commands
3. 🧹 Remove commands that don't serve a purpose
4. 📋 Update command palette organization
5. 🔗 Ensure LSP commands match the schema

---

## 📊 Command Inventory

### Bundle Commands (LSP) - ✅ Validated by Contract Tests

| Command | Status | Used By | Keep? |
|---------|--------|---------|-------|
| `scout/bundle/list` | ✅ Active | Extension | ✅ Yes |
| `scout/bundle/get` | ⚠️ Unknown | LSP Server only | ❓ Review |
| `scout/bundle/create` | ✅ Active | Extension | ✅ Yes |
| `scout/bundle/importPackage` | ✅ Active | Extension | ✅ Yes |
| `scout/bundle/addLog` | ✅ Active | Extension | ✅ Yes |
| `scout/bundle/delete` | ✅ Active | Extension | ✅ Yes |
| `scout/bundle/analyze` | ✅ Active | Extension | ✅ Yes |

**Action**: Review `scout/bundle/get` - is it used anywhere?

---

### Bundle Commands (VS Code Palette)

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.bundle.create` | Scout: Create New Bundle | ✅ Active | Used |
| `logScoutAnalyzer.bundle.importPackage` | Scout: Create Bundle from Archive | ✅ Active | Used |
| `logScoutAnalyzer.bundle.addCurrentFile` | Scout: Add Current File to Bundle | ✅ Active | Phase 1 feature |
| `logScoutAnalyzer.bundle.addToBundle` | Scout: Add to Bundle | ⚠️ Duplicate? | Similar to addCurrentFile? |
| `logScoutAnalyzer.bundle.addLog` | Scout: Add Log File to Bundle | ⚠️ Duplicate? | Similar to above? |
| `logScoutAnalyzer.bundle.analyze` | Scout: Analyze Bundle | ✅ Active | Used |
| `logScoutAnalyzer.bundle.delete` | Scout: Delete Bundle | ✅ Active | Used |
| `logScoutAnalyzer.bundle.refresh` | Scout: Refresh Bundles | ✅ Active | Used |
| `logScoutAnalyzer.importArchive` | Scout: Import Log Archive | ⚠️ Duplicate? | Same as bundle.importPackage? |
| `logScoutAnalyzer.bundle.openDashboard` | (Not in commands list) | ⚠️ Missing? | Referenced in menus |

**Actions**:
1. ❓ Are `addToBundle`, `addLog`, and `addCurrentFile` duplicates? Pick one or clarify differences
2. ❓ Is `importArchive` the same as `bundle.importPackage`? If yes, remove one
3. ⚠️ Add `bundle.openDashboard` to commands list if it exists

---

### Analysis Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.analyzeFile` | (Missing?) | ❓ | Not in current package.json |
| `logScoutAnalyzer.analyzeDirectory` | (Implementation exists) | ⚠️ | Implemented but not in commands? |
| `logScoutAnalyzer.analyzeAllBelow` | (Implementation exists) | ⚠️ | Implemented but not in commands? |
| `logScoutAnalyzer.refreshResults` | Scout: Refresh Results | ✅ Active | Used |
| `logScoutAnalyzer.clearResults` | (Implementation exists) | ⚠️ | Implemented but not in commands? |
| `logScoutAnalyzer.clearCache` | (Implementation exists) | ⚠️ | Implemented but not in commands? |

**Actions**:
1. 🔍 Why are `analyzeDirectory` and `analyzeAllBelow` missing from commands list?
2. 🔍 Should `clearResults` and `clearCache` be in the palette?

---

### View/Display Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.showAbout` | Scout: About | ✅ Active | Used |
| `logScoutAnalyzer.openScoutView` | Scout: Open Analyzer View | ✅ Active | Used |
| `logScoutAnalyzer.jumpToLine` | Scout: Jump to Line | ✅ Active | Used |
| `logScoutAnalyzer.showConsole` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.clearConsole` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.showLadderDiagram` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.openSplitView` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.closeSplitView` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.openAnalyzerPanel` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.openActionPanel` | (Implementation exists) | ⚠️ | Not in commands list |
| `logScoutAnalyzer.openAnnotationDashboard` | (Implementation exists) | ⚠️ | Not in commands list |

**Actions**:
1. ❓ Are these internal commands (not meant for palette)?
2. 📋 If user-facing, add to commands list
3. 🧹 If obsolete, remove implementations

---

### Grouping/Sorting Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.groupBySeverity` | Scout: Group by Severity | ✅ Active | Results view |
| `logScoutAnalyzer.groupByCategory` | Scout: Group by Category | ✅ Active | Results view |
| `logScoutAnalyzer.groupByFile` | Scout: Group by File | ✅ Active | Results view |
| `logScoutAnalyzer.resetView` | Scout: Reset View | ✅ Active | Results view |
| `logScoutAnalyzer.sortByLine` | Scout: Sort by Line | ✅ Active | Results view |
| `logScoutAnalyzer.sortBySeverity` | Scout: Sort by Severity | ✅ Active | Results view |
| `logScoutAnalyzer.sortByTime` | Scout: Sort by Time | ✅ Active | Results view |
| `logScoutAnalyzer.sortByFile` | Scout: Sort by File | ✅ Active | Results view |
| `logScoutAnalyzer.sortByCategory` | Scout: Sort by Category | ✅ Active | Results view |

**Action**: ✅ These all seem active and useful - keep all

---

### Export/Copy Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.exportResults` | Scout: Export Results | ✅ Active | Used |
| `logScoutAnalyzer.copyFilePath` | Scout: Copy File Path | ✅ Active | Context menu |
| `logScoutAnalyzer.copyVersionInfo` | Scout: Copy Version Info | ✅ Active | Context menu |
| `logScoutAnalyzer.copyResultInfo` | Scout: Copy Issue Details | ✅ Active | Context menu |

**Action**: ✅ Keep all

---

### Pattern Management Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.showPatternForResult` | Scout: Show Pattern Details | ✅ Active | Used |
| `logScoutAnalyzer.patterns.createOverride` | Scout: Create Pattern Override | ✅ Active | Code actions |
| `logScoutAnalyzer.patterns.createOverrideFromSelection` | Scout: Create Override from Selection | ✅ Active | Context menu |
| `logScoutAnalyzer.patterns.createOverrideFromDiagnostic` | (Not in commands) | ⚠️ | Activation event but not in commands? |
| `logScoutAnalyzer.patterns.createCustom` | Scout: Create Custom Pattern | ✅ Active | Wizard |
| `logScoutAnalyzer.patterns.editOverride` | Scout: Edit Pattern | ✅ Active | Used |
| `logScoutAnalyzer.patterns.deleteOverride` | Scout: Delete Pattern | ✅ Active | Used |
| `logScoutAnalyzer.patterns.togglePattern` | Scout: Enable/Disable Pattern | ✅ Active | Used |
| `logScoutAnalyzer.patterns.showManager` | Scout: Open Pattern Overrides File | ✅ Active | Used |
| `logScoutAnalyzer.patterns.importOverrides` | Scout: Import Pattern Overrides | ✅ Active | Used |
| `logScoutAnalyzer.patterns.exportOverrides` | Scout: Export Pattern Overrides | ✅ Active | Used |
| `logScoutAnalyzer.patterns.reloadPatterns` | Scout: Reload Patterns from LSP | ✅ Active | Used |
| `logScoutAnalyzer.patterns.showStats` | (Activation event) | ⚠️ | Not in commands list |

**Actions**:
1. ⚠️ Add `createOverrideFromDiagnostic` to commands list
2. ⚠️ Add `patterns.showStats` to commands list or remove activation event

---

### File Extraction Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.extraction.addFileType` | Scout: Add File Type to Extraction Policy | ⚠️ Unknown | Is this feature active? |
| `logScoutAnalyzer.extraction.addCurrentFileType` | Scout: Add Current File Type to Extraction Policy | ⚠️ Unknown | Is this feature active? |
| `logScoutAnalyzer.extraction.showStats` | Scout: Show Extraction Statistics | ⚠️ Unknown | Is this feature active? |
| `logScoutAnalyzer.extraction.editPolicy` | Scout: Edit Extraction Policy | ⚠️ Unknown | Is this feature active? |

**Action**: ❓ **Review entire extraction feature** - is this implemented? Used? If not, remove commands

---

### Configuration/Cloud Sync Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.config.backup` | Scout: Backup Configuration to Cloud | ⚠️ Unknown | Is cloud sync implemented? |
| `logScoutAnalyzer.config.restore` | Scout: Restore Configuration from Cloud | ⚠️ Unknown | Is cloud sync implemented? |
| `logScoutAnalyzer.config.export` | Scout: Export Configuration to File | ⚠️ Unknown | Local export implemented? |
| `logScoutAnalyzer.config.import` | Scout: Import Configuration from File | ⚠️ Unknown | Local import implemented? |
| `logScoutAnalyzer.config.list` | Scout: List My Cloud Configurations | ⚠️ Unknown | Is cloud sync implemented? |

**Action**: ❓ **Review entire cloud sync feature** - if not implemented, remove all these commands

---

### Category/Filter Commands

| Command | Title | Status | Notes |
|---------|-------|--------|-------|
| `logScoutAnalyzer.toggleCategory` | Scout: Toggle Category Filter | ✅ Active | Context menu |
| `logScoutAnalyzer.toggleAllCategories` | Scout: Toggle All Categories | ✅ Active | Used |

**Action**: ✅ Keep both

---

### Cache Management Commands

| Command | Status | Implementation | In Palette? |
|---------|--------|----------------|-------------|
| `logScoutAnalyzer.clearCache` | ✅ Implemented | Yes (extension.ts:1278) | ❌ No |
| `logScoutAnalyzer.removeCachedFile` | ✅ Implemented | Yes (extension.ts:1303) | ❌ No |
| `logScoutAnalyzer.openCachedFile` | ✅ Implemented | Yes (extension.ts:1327) | ❌ No |
| `logScoutAnalyzer.openFileInEditor` | ✅ Implemented | Yes (extension.ts:1410) | ❌ No |
| `logScoutAnalyzer.revealInExplorer` | ✅ Implemented | Yes (extension.ts:1435) | ❌ No |
| `logScoutAnalyzer.viewCacheMetadata` | ✅ Implemented | Yes (extension.ts:1459) | ❌ No |
| `logScoutAnalyzer.showCacheStats` | ✅ Implemented | Yes (extension.ts:1502) | ❌ No |
| `logScoutAnalyzer.showCacheData` | ⚠️ Referenced | In menus but no implementation? | ❌ No |

**Action**: 
- ✅ These are internal/context menu commands - keep but don't add to palette
- ⚠️ Fix `showCacheData` - either implement or remove from menus

---

### Log Commands (Missing?)

| Command | Status | Notes |
|---------|--------|-------|
| `logScoutAnalyzer.openExtensionLog` | ✅ Implemented | Not in commands list |
| `logScoutAnalyzer.openLSPLog` | ✅ Implemented | Not in commands list |
| `logScoutAnalyzer.showLogPaths` | ✅ Implemented | Not in commands list |

**Action**: ❓ Should these be in command palette for debugging?

---

### Case Management Commands (TagScout Integration?)

| Command | Status | In Commands? | Notes |
|---------|--------|--------------|-------|
| `logScoutAnalyzer.downloadCase` | ⚠️ Referenced in menus | ❌ No | Is TagScout integrated? |
| `logScoutAnalyzer.importCase` | ⚠️ Referenced in menus | ❌ No | Is TagScout integrated? |
| `logScoutAnalyzer.refreshCases` | ⚠️ Referenced in menus | ❌ No | Is TagScout integrated? |

**Action**: ❓ **Review TagScout case management** - if not active, remove from menus

---

### Scout Inventor/Toolkit Commands

**Note**: Extension has `scout-inventor` activity bar container but no visible commands

**Action**: ❓ Is Scout Inventor/Toolkit feature active? If not, remove container

---

### Other Commands Found in Implementation

| Command | Implementation | Status |
|---------|----------------|--------|
| `logScoutAnalyzer.dumpDiagnostics` | extension.ts:1116 | ⚠️ Not in commands |
| `logScoutAnalyzer.openInNewWindow` | Referenced in menus | ⚠️ No implementation? |

---

## 🚨 Critical Issues Found

### 1. Duplicate/Similar Commands
- `bundle.addLog` vs `bundle.addToBundle` vs `bundle.addCurrentFile`
- `bundle.importPackage` vs `importArchive`

### 2. Commands in Menus But Not in Commands List
- `bundle.openDashboard`
- `showCacheData`
- `openInNewWindow`

### 3. Commands Implemented But Not Registered
- All the analysis commands (`analyzeDirectory`, etc.)
- Log viewing commands
- Console commands

### 4. Activation Events Without Commands
- `patterns.showStats`
- `patterns.createOverrideFromDiagnostic` (is in activation, not in commands)

### 5. Feature Uncertainty
- File extraction feature
- Cloud sync/configuration feature
- TagScout case management
- Scout Inventor/Toolkit

---

## 📋 Action Plan

### Phase 1: Audit & Document (1-2 hours)
1. ✅ List all commands (DONE - this document)
2. ⚠️ Test each command manually to see if it works
3. ⚠️ Check implementation exists for each
4. ⚠️ Document which features are active vs planned

### Phase 2: Cleanup (2-3 hours)
1. Remove unused activation events
2. Remove commands for unimplemented features
3. Fix duplicate commands (pick one, remove others)
4. Add missing commands to palette (if user-facing)
5. Remove commands from menus if no implementation

### Phase 3: Reorganization (1-2 hours)
1. Group commands logically in palette
2. Add command categories/grouping
3. Update command titles for consistency
4. Add keyboard shortcuts for frequently used commands

### Phase 4: Documentation (1 hour)
1. Update README with command list
2. Document which commands are internal vs user-facing
3. Update PROJECT_STATUS.md with command inventory
4. Create user guide for commands

---

## 🎯 Recommended Immediate Actions

### High Priority ⚠️

1. **Remove Duplicate Bundle Commands**
   ```
   Keep: bundle.addCurrentFile (Phase 1 feature, well-tested)
   Remove: bundle.addToBundle (or merge functionality)
   Keep: bundle.addLog (for selecting specific files)
   ```

2. **Clarify Import Commands**
   ```
   Keep: bundle.importPackage (matches LSP command)
   Remove: importArchive (alias? or merge?)
   ```

3. **Fix Menu References**
   - Implement `bundle.openDashboard` or remove from menus
   - Implement `showCacheData` or remove from menus
   - Implement `openInNewWindow` or remove from menus

4. **Review Unimplemented Features**
   - File extraction (remove if not implemented)
   - Cloud sync (remove if not implemented)
   - TagScout cases (remove if not integrated)

### Medium Priority ⚠️

5. **Add Missing Commands to Palette**
   - Log viewing commands (if useful for debugging)
   - Analysis commands (if user-facing)

6. **Clean Up Activation Events**
   - Remove events for non-existent commands
   - Add missing commands for existing events

### Low Priority ℹ️

7. **Organize Command Palette**
   - Group by feature area
   - Add command categories
   - Consistent naming

---

## 📊 Statistics

- **Total Commands in package.json**: ~67 commands
- **Commands with Implementation**: ~50+ (estimated)
- **Suspicious/Duplicate**: ~15 commands
- **Potentially Obsolete**: ~10 commands
- **Need Review**: ~20 commands

---

## 🔗 Related Documents

- `lsp-commands.schema.json` - LSP command definitions
- `COMMAND_CONTRACT_TESTING_QUICK_START.md` - Contract testing guide
- `vscode-extension/package.json` - All VS Code commands
- `vscode-extension/src/extension.ts` - Command implementations

---

## ✅ Next Steps

1. **Read this document** to understand the scope
2. **Manual testing session** - test each command to verify it works
3. **Create cleanup PR** with removals/fixes
4. **Update documentation** with final command list
5. **Update PROJECT_STATUS.md** with this task complete

---

**Status**: 🚨 NEEDS ATTENTION  
**Estimated Cleanup Time**: 4-6 hours  
**Priority**: MEDIUM (do after critical features are stable)  
**Blocker**: None (can be done anytime)