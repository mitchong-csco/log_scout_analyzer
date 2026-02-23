# TODO: Bundle Import UX Improvements

**Date**: February 23, 2026  
**Status**: 🚧 Planning Phase  
**Priority**: MEDIUM (UX Enhancements)

---

## Overview

Collection of UX improvements for the bundle import workflow to make it more intelligent and user-friendly.

---

## ✅ COMPLETED

### 1. Case ID Extraction from Filename with Auto-Skip ✅
**Status**: IMPLEMENTED (Feb 23, 2026 - v0.0.187)

**Changes Made**:
- Reordered import flow: File selection → Extract case ID
- QCSONE format detection: `700440257_qcsone_download_selected.zip` → extracts `700440257`
- **v0.0.186**: Pre-fills case ID input box with detected value
- **v0.0.187**: ⭐ **Skips prompt entirely when case ID detected** - zero clicks!
- Only prompts user when case ID cannot be auto-detected (non-QCSONE files)
- Prompt includes validation (required, numeric only)

**Files Modified**:
- `vscode-extension/src/extension.ts` (lines 3007-3100, 3380-3470)
  - Both `importPackage` and `importArchive` commands
  - Conditional prompt logic based on extraction success

**Benefit**: Zero clicks for QCSONE imports - maximum automation with user control fallback

### 2. Bundle Naming Format: "case_id bundle_id"
**Status**: ✅ IMPLEMENTED (Feb 23, 2026)

**Current Behavior**:
- Bundle name: Just case ID (e.g., "700356763")
- Bundle ID: UUID (e.g., "bundle_abc123...")

**Requested Change**:
- Display name should be: `"700356763 bundle_abc123"`
- Format: `"{case_id} {bundle_id}"`

**Rationale**:
- Cases can have multiple bundles (not yet implemented as collections)
- This naming prepares for future multi-bundle per case feature
- Makes bundle IDs visible and distinguishable

**Implementation Plan**:
1. Modify `lsp-server/src/bundle/manager.rs` - `import_log_package_with_progress()`
   - Change bundle name generation around line 1012-1024
   - Format: `format!("{} {}", case_id, bundle_id)`
2. Update bundle creation in `create_bundle()` if name provided
3. Consider: Should manual bundle creation also use this format?

**Files to Modify**:
- `lsp-server/src/bundle/manager.rs` (bundle name generation)
- Possibly `vscode-extension/src/bundleTreeProvider.ts` (display formatting)

**Testing**:
- Import QCSONE package → verify name is "700356763 bundle_xyz"
- Create manual bundle with case ID → verify format
- Multiple bundles for same case → verify distinguishable

### 3. Problems Panel Auto-Open Suppression ✅
**Status**: ✅ IMPLEMENTED (Feb 23, 2026)

**Feature**: Document how users can control Problems panel behavior

**Solution**:
- Removed redundant diagnostic handler that was creating DiagnosticCollection on every notification
- LSP client's built-in diagnostic handling is sufficient
- Created comprehensive user guide: `docs/USER_GUIDE_PROBLEMS_PANEL.md` (282 lines)

**User Setting**:
```json
{
  "problems.autoReveal": "never"  // Recommended for log analysis
}
```

**Files Modified**:
- `vscode-extension/src/lspClient.ts` - Removed redundant handler

**Files Created**:
- `docs/USER_GUIDE_PROBLEMS_PANEL.md` - Complete user guide with:
  - Setting configuration methods (UI, JSON, workspace)
  - Recommended settings by use case
  - Troubleshooting guide
  - Keyboard shortcuts
  - Example configurations

**Benefit**: Users can choose whether Problems panel opens automatically, better UX for log analysis

---

## 📋 TODO (Optional Features)

### 4. Optional Metadata Prompts
**Status**: 📋 TODO (Low Priority)

**Feature**: Add optional prompts during import for:
- **Log Product Type**: e.g., "Webex", "Jabber", "CUCM", "CUP", "Unity"
- **Log Service**: More specific service classification

**Current Behavior**:
- Service type is auto-detected from filenames/content
- Works reasonably well
- No user input during import

**Proposed UX**:
```typescript
// After case ID prompt, add:
const productType = await vscode.window.showQuickPick(
  ['Auto-detect', 'Webex', 'Jabber', 'CUCM', 'CUP', 'Unity', 'SIP', 'Other'],
  { 
    placeHolder: 'Select log product type (optional)',
    title: 'Log Product Type'
  }
);

const service = await vscode.window.showInputBox({
  prompt: 'Enter specific service (optional)',
  placeHolder: 'e.g., IM&P, Expressway, etc.'
});
```

**Questions**:
- Does auto-detection work well enough?
- When would user override be valuable?
- Should this be a checkbox "Show advanced options"?

**Implementation Location**:
- `vscode-extension/src/extension.ts` - Add prompts in import command
- `lsp-server/src/lsp_types.rs` - Add optional fields to `ImportPackageRequest`
- `lsp-server/src/bundle/manager.rs` - Use provided metadata if available

---

### 5. Bundle Service Discovery Discussion
**Status**: 📋 TODO (Architecture Decision Needed)

**Current Implementation**:
- Service detection happens per-file during import
- `ServiceDetector` uses filename patterns and content analysis
- Works from archive names and individual log names
- See: `lsp-server/src/bundle/service_detector.rs`

**Questions to Discuss**:
1. **Bundle-level service vs file-level service**:
   - Should bundles have a primary service type?
   - Or remain multi-service collections?

2. **Detection confidence**:
   - Should we show confidence scores?
   - Allow user to confirm/override detected services?

3. **Mixed service bundles**:
   - QCSONE packages often contain multiple services
   - How to handle in UI?

4. **Service as first-class metadata**:
   - Add `service_type` to `BundleMetadata`?
   - Aggregate from file-level detection?

**Files Involved**:
- `lsp-server/src/bundle/service_detector.rs` - Detection logic
- `lsp-server/src/bundle/models.rs` - Metadata structure
- `lsp-server/src/bundle/manager.rs` - Detection invocation

**Decision Needed Before Implementation**

---

### 6. File Filtering UI with Usefulness Categories
**Status**: 📋 TODO (Major Feature)

**Current Behavior**:
- All files from archive are preserved (as of v0.0.185)
- No filtering or hiding mechanism
- Users see all files in bundle tree

**Proposed Feature**: Multi-level file usefulness system

#### 5.1 Metadata Categories
Add `usefulness` field to file metadata:

```rust
pub enum FileUsefulness {
    Critical,      // Essential logs (error logs, traces)
    Important,     // Standard logs
    Supplemental,  // Config files, diagrams
    Junk,          // Known useless files (README, license.txt)
    Unknown,       // Not yet classified
}
```

**Storage**: Store in `bundle.json` per file:
```json
{
  "logs": [
    {
      "path": "logs/system.log",
      "usefulness": "Critical"
    },
    {
      "path": "README.txt",
      "usefulness": "Junk"
    }
  ]
}
```

#### 5.2 UI Filter Controls
Add filter toggles in bundle tree view:

```
📦 Bundle 700356763
  🔍 Filters: [All] [Hide Junk] [Important Only]
  📊 Showing: 45/120 files
```

**Implementation**:
- Add toolbar buttons to bundle tree view
- Store filter state in workspace state
- Filter tree items before display

#### 5.3 Auto-Classification
Build rules engine for automatic classification:

**Junk Patterns**:
- `README.*`, `LICENSE.*`, `MANIFEST.*`
- Empty files (0 bytes)
- Duplicate files (same hash)
- Known vendor boilerplate

**Critical Patterns**:
- Files with "error" in name
- Crash dumps, core dumps
- Main service logs

**File**: `lsp-server/src/bundle/file_classifier.rs` (new)

#### 5.4 Visual Indicators
Add icons/badges to files in tree:

- 🔴 Critical
- 🟡 Important  
- 🔵 Supplemental
- ⚪ Junk (grayed out)
- ❓ Unknown

#### 5.5 User Override
Right-click menu on files:
- "Mark as Critical"
- "Mark as Junk"
- "Reset Classification"

**Storage**: User overrides saved to bundle metadata

#### Implementation Phases

**Phase 1**: Basic junk detection (simple patterns)
- Add `usefulness` field to models
- Implement basic classifier
- Add "Hide Junk" toggle

**Phase 2**: Visual indicators
- Add icons/colors
- Filter controls in UI

**Phase 3**: Advanced classification
- Content-based analysis
- ML/heuristics for importance

**Phase 4**: User learning
- Remember user overrides
- Learn patterns across bundles

**Estimated Effort**: 2-3 days for Phase 1, 1 week total

**Files to Create/Modify**:
- `lsp-server/src/bundle/file_classifier.rs` (new)
- `lsp-server/src/bundle/models.rs` (add usefulness field)
- `vscode-extension/src/bundleTreeProvider.ts` (filtering logic)
- `vscode-extension/package.json` (filter commands)

---

## 📊 Priority Order

1. ✅ **DONE**: Case ID extraction from filename (v0.0.186)
2. ✅ **DONE**: Case ID auto-skip prompt when detected (v0.0.187) ⭐
3. ✅ **DONE**: Bundle naming format `"case_id bundle_id"`
4. ✅ **DONE**: Problems panel control (user guide)
5. **MEDIUM**: Optional metadata prompts (2 hours)
6. **LOW**: Service discovery discussion (architecture meeting)
7. **LOW**: File filtering UI Phase 1 (1 day)

---

## 🔗 Related Files

- Current bundle import: `vscode-extension/src/extension.ts` (lines 3007-3100)
- Bundle manager: `lsp-server/src/bundle/manager.rs`
- Service detection: `lsp-server/src/bundle/service_detector.rs`
- Bundle models: `lsp-server/src/bundle/models.rs`

---

## 📝 Notes

### Why "case_id bundle_id" Format?
- **Roadmap Item**: Cases as collections of bundles (not yet implemented)
- **Use Case**: Large investigations may need multiple bundle imports
  - Initial diagnostic bundle
  - Follow-up trace bundle  
  - Network capture bundle
- **Current Limitation**: One bundle per case effectively
- **This Format**: Prepares for multi-bundle future

### Why File Filtering Matters?
- **Problem**: QCSONE packages contain 100+ files
- **User Pain**: Scrolling through noise to find relevant logs
- **Solution**: Smart filtering + visual indicators
- **Benefit**: Faster troubleshooting, less cognitive load

---

## ✅ Next Actions

**Completed** (This Session):
1. ✅ Complete case ID extraction implementation (v0.0.186)
2. ✅ Skip prompt when case ID auto-detected (v0.0.187) ⭐
3. ✅ Implement bundle naming format change
4. ✅ Problems panel suppression (user guide)
5. ✅ Document changes in PROJECT_STATUS.md

**Short Term** (Next Session):
1. Test with real QCSONE packages
2. Consider optional metadata prompts based on user feedback
3. Schedule service discovery architecture discussion

**Long Term** (Future Roadmap):
1. File filtering UI (Phase 1)
2. Cases as bundle collections
3. Advanced file classification

---

**Last Updated**: February 23, 2026 (Updated with skip-prompt enhancement)  
**Owner**: Engineering Team  
**Review Date**: After v0.0.190 release  
**Latest Version**: v0.0.187  
**Completed This Session**: 4/7 items (Case ID extraction + auto-skip, Bundle naming, Problems panel)