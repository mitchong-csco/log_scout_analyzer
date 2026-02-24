# Extension.ts Refactoring Progress

## Goal
Reduce extension.ts from 3,892 lines to ~200 lines by extracting commands into focused modules.

## Current Status: IN PROGRESS

### Completed ✅

1. **Created commands/ directory structure**
   - `commands/` directory created

2. **Extracted Debug Commands** (4 commands, ~190 lines)
   - ✅ `commands/debugCommands.ts` created
   - Commands: dumpDiagnostics, openExtensionLog, openLSPLog, showLogPaths
   - Status: **Ready to integrate**

3. **Extracted Cache Commands** (7 commands, ~310 lines)
   - ✅ `commands/cacheCommands.ts` created
   - Commands: clearCache, viewCacheMetadata, showCacheData, openCachedFile, openFileInEditor, revealInExplorer, removeCachedFile
   - Status: **Ready to integrate**

### Next Steps 🔄

#### Phase 1: Extract Remaining Command Modules
1. **bundleCommands.ts** (8 commands) - PRIORITY
   - bundle.create, bundle.importPackage, bundle.addCurrentFile, bundle.addToBundle
   - bundle.analyze, bundle.delete, bundle.refresh, bundle.openInQCSOne

2. **patternCommands.ts** (10 commands)
   - patterns.createOverride, patterns.createOverrideFromSelection
   - patterns.createOverrideFromDiagnostic, patterns.createCustom
   - patterns.editOverride, patterns.deleteOverride, patterns.togglePattern
   - patterns.importOverrides, patterns.exportOverrides, patterns.reloadPatterns

3. **resultsCommands.ts** (13 commands)
   - groupBySeverity, groupByCategory, groupByFile
   - sortByLine, sortBySeverity, sortByTime, sortByFile, sortByCategory
   - toggleCategory, toggleAllCategories
   - resetView, exportResults, refreshResults

4. **navigationCommands.ts** (4 commands)
   - jumpToLine, openScoutView, openActionPanel, showPatternForResult

5. **utilityCommands.ts** (7 commands)
   - importArchive, showAbout, showConsole
   - copyFilePath, copyVersionInfo, copyResultInfo, openInNewWindow

#### Phase 2: Integration
1. Import command modules into extension.ts
2. Replace inline registrations with module calls
3. Test each module integration
4. Run verification script after each module

#### Phase 3: Remove Deprecated Commands
Once all active commands are extracted:
- Delete 20 deprecated command registrations (~500-800 lines)
- What remains will be mostly infrastructure

#### Phase 4: Slim extension.ts
Final extension.ts should only contain:
- Imports
- Service initialization (LSP, logging, pattern manager)
- Tree provider registration
- Command module registration calls
- Event handlers

Target: ~200-300 lines

## Verification

After each module:
```bash
cd vscode-extension
node scripts/verify-commands.js
```

Should show: ✅ ALL TESTS PASSED (53 commands verified)

## Benefits

- ✅ Each module is 100-300 lines (easy to navigate)
- ✅ Clear responsibility (bundle commands only deal with bundles)
- ✅ Easy to test (test individual command modules)
- ✅ Easy to find bugs (know exactly where to look)
- ✅ Easy to remove deprecated code (delete entire files)
- ✅ Better IDE performance (smaller files load faster)

## File Structure (Target)

```
src/
├── extension.ts                    (200 lines - MAIN ENTRY POINT)
├── commands/
│   ├── bundleCommands.ts          ✅ (to create)
│   ├── patternCommands.ts         ✅ (to create)
│   ├── resultsCommands.ts         ✅ (to create)
│   ├── navigationCommands.ts      ✅ (to create)
│   ├── cacheCommands.ts           ✅ DONE
│   ├── debugCommands.ts           ✅ DONE
│   └── utilityCommands.ts         ✅ (to create)
├── providers/ (already exists)
├── panels/ (already exists)
└── utils/
```

## Notes

- Deprecated commands (20) are still in extension.ts - will remove after extraction
- All new modules compile successfully
- No breaking changes to functionality
- Commands remain registered exactly as before