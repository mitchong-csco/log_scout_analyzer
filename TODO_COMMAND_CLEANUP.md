# TODO: Command Cleanup Checklist

**Created**: February 21, 2024  
**Priority**: MEDIUM  
**Estimated Time**: 4-6 hours  
**Status**: 🚨 NOT STARTED

---

## 📋 Overview

After implementing command contract testing, we discovered **~67 commands** in the VS Code extension with potential issues:
- ~15 suspicious/duplicate commands
- ~10 potentially obsolete commands  
- Features that may not be implemented (file extraction, cloud sync, TagScout)
- Commands in menus without implementations
- Commands implemented but not in palette

**See**: `COMMAND_AUDIT_TODO.md` for detailed analysis

---

## ✅ Phase 1: Manual Testing (1-2 hours)

Test each command to verify it works and is still needed.

### Bundle Commands
- [ ] Test `logScoutAnalyzer.bundle.create` - works?
- [ ] Test `logScoutAnalyzer.bundle.importPackage` - works?
- [ ] Test `logScoutAnalyzer.bundle.addCurrentFile` - works?
- [ ] Test `logScoutAnalyzer.bundle.addToBundle` - works? (duplicate of addCurrentFile?)
- [ ] Test `logScoutAnalyzer.bundle.addLog` - works? (duplicate?)
- [ ] Test `logScoutAnalyzer.bundle.analyze` - works?
- [ ] Test `logScoutAnalyzer.bundle.delete` - works?
- [ ] Test `logScoutAnalyzer.bundle.refresh` - works?
- [ ] Test `logScoutAnalyzer.importArchive` - duplicate of bundle.importPackage?
- [ ] Check if `logScoutAnalyzer.bundle.openDashboard` exists (in menus but not commands)

**Decision Needed**:
- [ ] Keep ONE of: `addToBundle` / `addLog` / `addCurrentFile` (or clarify differences)
- [ ] Keep ONE of: `importArchive` / `bundle.importPackage` (or merge)

---

### File Extraction Feature
- [ ] Test `logScoutAnalyzer.extraction.addFileType` - implemented?
- [ ] Test `logScoutAnalyzer.extraction.addCurrentFileType` - implemented?
- [ ] Test `logScoutAnalyzer.extraction.showStats` - implemented?
- [ ] Test `logScoutAnalyzer.extraction.editPolicy` - implemented?

**Decision**:
- [ ] If NOT implemented → Remove all 4 extraction commands
- [ ] If partially implemented → Complete or remove
- [ ] If fully implemented → Keep and document

---

### Cloud Sync/Configuration Feature
- [ ] Test `logScoutAnalyzer.config.backup` - implemented?
- [ ] Test `logScoutAnalyzer.config.restore` - implemented?
- [ ] Test `logScoutAnalyzer.config.export` - implemented?
- [ ] Test `logScoutAnalyzer.config.import` - implemented?
- [ ] Test `logScoutAnalyzer.config.list` - implemented?

**Decision**:
- [ ] If NOT implemented → Remove all 5 config commands
- [ ] If partially implemented → Complete or remove
- [ ] If fully implemented → Keep and document

---

### TagScout Case Management
- [ ] Test `logScoutAnalyzer.downloadCase` - implemented?
- [ ] Test `logScoutAnalyzer.importCase` - implemented?
- [ ] Test `logScoutAnalyzer.refreshCases` - implemented?
- [ ] Check if `scoutCases` tree view exists

**Decision**:
- [ ] If NOT integrated → Remove case commands and tree view from menus
- [ ] If integrated → Keep and document

---

### Pattern Management Commands
- [ ] Test `logScoutAnalyzer.patterns.createOverride` - works?
- [ ] Test `logScoutAnalyzer.patterns.createOverrideFromSelection` - works?
- [ ] Test `logScoutAnalyzer.patterns.createOverrideFromDiagnostic` - in commands list?
- [ ] Test `logScoutAnalyzer.patterns.createCustom` - works?
- [ ] Test `logScoutAnalyzer.patterns.editOverride` - works?
- [ ] Test `logScoutAnalyzer.patterns.deleteOverride` - works?
- [ ] Test `logScoutAnalyzer.patterns.togglePattern` - works?
- [ ] Test `logScoutAnalyzer.patterns.showManager` - works?
- [ ] Test `logScoutAnalyzer.patterns.importOverrides` - works?
- [ ] Test `logScoutAnalyzer.patterns.exportOverrides` - works?
- [ ] Test `logScoutAnalyzer.patterns.reloadPatterns` - works?
- [ ] Test `logScoutAnalyzer.patterns.showStats` - works? (not in commands list)

**Action Items**:
- [ ] Add `createOverrideFromDiagnostic` to commands list if working
- [ ] Add `showStats` to commands list if working, or remove activation event

---

### Internal/Context Menu Commands
- [ ] Verify these work but don't add to palette (internal only):
  - [ ] `clearCache`
  - [ ] `removeCachedFile`
  - [ ] `openCachedFile`
  - [ ] `openFileInEditor`
  - [ ] `revealInExplorer`
  - [ ] `viewCacheMetadata`
  - [ ] `showCacheStats`
- [ ] Fix `showCacheData` - implement or remove from menus

---

### Missing Commands (Implemented but Not in Commands List)
- [ ] Should these be in command palette?
  - [ ] `analyzeDirectory` - add to palette?
  - [ ] `analyzeAllBelow` - add to palette?
  - [ ] `clearResults` - add to palette?
  - [ ] `openExtensionLog` - add to palette? (useful for debugging)
  - [ ] `openLSPLog` - add to palette? (useful for debugging)
  - [ ] `showLogPaths` - add to palette?
  - [ ] `showConsole` - add to palette?
  - [ ] `clearConsole` - add to palette?
  - [ ] `openSplitView` - internal only?
  - [ ] `closeSplitView` - internal only?

---

### Scout Inventor/Toolkit
- [ ] Check if `scout-inventor` activity bar container is used
- [ ] Check if any Scout Inventor commands exist
- [ ] Check if any Scout Toolkit features are active

**Decision**:
- [ ] If NOT active → Remove `scout-inventor` container from package.json
- [ ] If active → Document what it does

---

## ✅ Phase 2: Cleanup (2-3 hours)

Based on Phase 1 testing, clean up the code.

### Remove Unused Features
- [ ] Remove file extraction commands (if not implemented)
- [ ] Remove cloud sync commands (if not implemented)
- [ ] Remove TagScout case commands (if not integrated)
- [ ] Remove Scout Inventor container (if not active)

### Fix Duplicate Commands
- [ ] Decide on ONE bundle add command and remove others
- [ ] Decide on ONE import command and remove others
- [ ] Update all references to removed commands

### Fix Menu/Command Mismatches
- [ ] Implement `bundle.openDashboard` OR remove from menus
- [ ] Implement `showCacheData` OR remove from menus
- [ ] Implement `openInNewWindow` OR remove from menus
- [ ] Add missing commands to commands list (if user-facing)

### Clean Up Activation Events
- [ ] Remove activation events for deleted commands
- [ ] Add missing commands for existing activation events
- [ ] Ensure all activation events have corresponding commands

### Update Code References
- [ ] Search for removed command names in:
  - [ ] `extension.ts`
  - [ ] `bundleTreeProvider.ts`
  - [ ] All other `*TreeProvider.ts` files
  - [ ] Test files
  - [ ] Documentation
- [ ] Update to use correct command names

---

## ✅ Phase 3: Reorganization (1-2 hours)

Improve command organization and user experience.

### Group Commands Logically
- [ ] Group by feature area in `package.json`:
  - [ ] Bundle commands
  - [ ] Analysis commands
  - [ ] Pattern management commands
  - [ ] View/Display commands
  - [ ] Export/Copy commands
  - [ ] Configuration commands

### Update Command Titles
- [ ] Ensure consistent naming:
  - [ ] All start with "Scout:"
  - [ ] Clear action verbs
  - [ ] No abbreviations
- [ ] Update any inconsistent titles

### Add Command Categories (if VS Code supports)
- [ ] Research VS Code command categories
- [ ] Add categories if supported
- [ ] Group related commands together

### Add Keyboard Shortcuts
- [ ] Identify frequently used commands
- [ ] Add keyboard shortcuts for:
  - [ ] Analyze current file
  - [ ] Create bundle
  - [ ] Import archive
  - [ ] Open Scout view
  - [ ] Refresh results

---

## ✅ Phase 4: Documentation (1 hour)

Update all documentation with final command list.

### Update README.md
- [ ] Add "Available Commands" section
- [ ] List all user-facing commands with descriptions
- [ ] Document keyboard shortcuts
- [ ] Add command palette screenshot

### Update PROJECT_STATUS.md
- [ ] Document final command count
- [ ] List removed commands (for reference)
- [ ] Update "Commands Validated" section
- [ ] Mark command audit as COMPLETE

### Create Command Reference
- [ ] Create `docs/COMMANDS.md` with:
  - [ ] All commands listed by category
  - [ ] Description of each command
  - [ ] When to use each command
  - [ ] Examples
  - [ ] Keyboard shortcuts

### Update Internal Docs
- [ ] Update `.zed/AI_ASSISTANT_GUIDE.md` if needed
- [ ] Update any architecture docs mentioning commands
- [ ] Update CONTRIBUTING.md with command guidelines

---

## ✅ Phase 5: Testing & Verification

Final checks before marking complete.

### Contract Tests
- [ ] Run `./scripts/test-command-contracts.sh`
- [ ] All LSP commands validated ✅
- [ ] All schema commands implemented ✅

### Manual Testing
- [ ] Test each remaining command manually
- [ ] Verify command palette organization
- [ ] Test keyboard shortcuts
- [ ] Check for any broken references

### Code Review
- [ ] Review all changed files
- [ ] Ensure no broken imports
- [ ] Check for TODO comments left behind
- [ ] Verify all tests still pass

---

## 📊 Completion Checklist

### Definition of Done
- [ ] All obsolete commands removed
- [ ] All duplicate commands resolved
- [ ] All menu/command mismatches fixed
- [ ] All activation events match commands
- [ ] Command palette well organized
- [ ] Documentation updated
- [ ] All tests passing
- [ ] PROJECT_STATUS.md updated

### Files That Need Changes
- [ ] `vscode-extension/package.json` - commands, activation events, menus
- [ ] `vscode-extension/src/extension.ts` - remove implementations
- [ ] `vscode-extension/src/bundleTreeProvider.ts` - update command names
- [ ] `README.md` - add command reference
- [ ] `docs/COMMANDS.md` - create command reference
- [ ] `PROJECT_STATUS.md` - mark complete
- [ ] `COMMAND_AUDIT_TODO.md` - mark findings resolved

---

## 📈 Success Metrics

### Before Cleanup
- ~67 commands total
- ~15 suspicious/duplicates
- ~10 potentially obsolete
- Unclear feature status

### After Cleanup (Target)
- ~40-50 commands (estimate)
- Zero duplicates
- Zero obsolete commands
- All features documented

---

## 🚨 Blockers / Dependencies

**None** - This task can be done anytime

**Recommended Timing**: 
- After critical features are stable
- Before next major release
- When you have 4-6 hours available

---

## 💡 Tips

1. **Test Thoroughly**: Some commands may have subtle differences
2. **Document Removals**: Keep a list of removed commands for reference
3. **Check Git History**: See when commands were added and why
4. **Ask Team**: If unsure about a command, ask other developers
5. **Back Up First**: Create a branch before major deletions

---

## 📝 Notes Section

Use this space to track decisions and findings:

```
Date: ___________
Tester: ___________

Command Test Results:
- extraction.* : [IMPLEMENTED / NOT IMPLEMENTED]
- config.* : [IMPLEMENTED / NOT IMPLEMENTED]
- case management: [INTEGRATED / NOT INTEGRATED]
- scout-inventor: [ACTIVE / NOT ACTIVE]

Decisions Made:
- Keep: [list]
- Remove: [list]
- Merge: [list]

Issues Found:
[Add any issues discovered during testing]

Time Spent:
- Phase 1: ___ hours
- Phase 2: ___ hours
- Phase 3: ___ hours
- Phase 4: ___ hours
Total: ___ hours
```

---

**Status**: 🚨 NOT STARTED  
**Assignee**: [Your Name]  
**Due Date**: [When you have 4-6 hours]  
**Priority**: MEDIUM