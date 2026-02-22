# 🗺️ Bundle Import - Test Coverage Map

**Visual Guide**: What's tested ✅ vs. what's missing ❌  
**Purpose**: Quick reference for test implementation priorities  
**Last Updated**: February 20, 2024

---

## 🎯 Legend

```
✅ = Test exists and passes
❌ = Test missing (critical gap)
⚠️ = Partial coverage (needs more tests)
🟢 = Low priority (nice to have)
🔴 = High priority (must have for production)
```

---

## 📊 Coverage Overview

```
Rust LSP Server:           [████░░░░░░░░░░░░░░░░] 20% coverage
TypeScript Extension:      [░░░░░░░░░░░░░░░░░░░░]  0% coverage
Integration Tests:         [░░░░░░░░░░░░░░░░░░░░]  0% coverage
────────────────────────────────────────────────────────────
Overall:                   [██░░░░░░░░░░░░░░░░░░] 10% coverage
Target:                    [██████████████░░░░░░] 70% minimum
```

---

## 🦀 Rust LSP Server - Test Map

### `archive_extractor.rs` - Archive Utilities

#### Case ID Detection
```
✅ test_detect_case_id_qcsone          - "700440257_qcsone.zip" → "700440257"
✅ test_detect_case_id_no_match        - "random.zip" → None
✅ test_detect_case_id_short_number    - "123.zip" → None (too short)
```

#### File Filtering
```
✅ test_is_log_file                    - Extension validation (.log, .txt, .out)
✅ test_filter_log_files               - Filter mixed file types
```

#### Archive Extraction (🔴 CRITICAL GAPS)
```
❌ test_extract_zip_creates_files      - ZIP extraction creates files on disk
❌ test_extract_tar_creates_files      - TAR extraction creates files on disk
❌ test_extract_tgz_creates_files      - TGZ extraction creates files on disk
❌ test_extract_nested_archives        - Recursive extraction (outer.zip → inner.zip)
❌ test_extract_handles_corrupted      - Error handling for invalid archives
❌ test_summarize_extraction           - ExtractionSummary calculation
```

**Status**: 5/11 tests (45%) - ⚠️ Helper functions only

---

### `bundle/manager.rs` - Bundle Operations

#### Basic CRUD
```
✅ test_bundle_creation                - Create bundle with name
✅ test_list_bundles                   - List multiple bundles
```

#### Import Logic (🔴 CRITICAL GAPS - THE MAIN FEATURE!)
```
❌ test_import_qcsone_with_case_id     - Import QCSONE, detect case ID
❌ test_import_generic_no_case_id      - Import without case ID pattern
❌ test_import_filters_non_logs        - Only import .log/.txt files
❌ test_import_detects_services        - Auto-detect Jabber/CUCM/CUP
❌ test_import_handles_empty           - Archive with no log files
❌ test_import_handles_corrupted       - Corrupted archive error handling
❌ test_import_cleans_temp_dir         - Temp directory cleanup verification
❌ test_import_nested_archives         - Nested archive extraction
```

#### Progress Tracking (🔴 CRITICAL GAPS)
```
❌ test_progress_calls_callback        - Progress function invoked
❌ test_progress_percentages           - Percentage accuracy (0% → 100%)
❌ test_progress_messages              - Descriptive status messages
```

**Status**: 2/13 tests (15%) - 🔴 CORE FUNCTIONALITY UNTESTED

---

## 🎨 TypeScript Extension - Test Map

### `wiring.test.ts` - Configuration Tests

#### Package.json Validation
```
✅ Extension metadata                  - Name, publisher, version
✅ Views configuration                 - MOST views defined
❌ scout-bundles view                  - MISSING from config
✅ Commands defined                    - Most commands in package.json
✅ Activation events                   - Command activation configured
```

#### Command Wiring
```
⚠️ Import command registered           - Defined but not in extension.ts
✅ File picker configuration           - Archive filters configured
✅ Error handling present              - Try-catch blocks exist
✅ Output channel created              - Logging capability exists
✅ Naming conventions                  - No duplicate "Scout:" prefixes
```

#### File Structure
```
✅ LSP binary exists                   - log-scout-lsp-server-win.exe
✅ Compiled extension exists           - out/extension.js
✅ BundleTreeProvider exists           - src/bundleTreeProvider.ts
```

**Status**: 24/26 tests (92%) - ✅ Configuration well tested

---

### `bundleTreeProvider.ts` - UI Logic (🔴 ALL MISSING!)

#### Import Operations
```
❌ test_import_creates_optimistic      - Optimistic bundle shows immediately
❌ test_import_calls_lsp               - LSP client invoked with correct params
❌ test_import_progress_updates        - Progress updates bundle description
❌ test_import_success_handling        - Removes optimistic, shows real bundle
❌ test_import_error_handling          - Removes optimistic on error
❌ test_import_shows_notification      - Success message displayed
```

#### Bundle Management
```
❌ test_create_bundle_filesystem       - Creates directory and bundle.json
❌ test_create_updates_index           - Updates bundles/index.json
❌ test_delete_bundle_cleanup          - Removes files and refreshes tree
❌ test_get_children_returns_bundles   - Tree data structure correct
```

#### Tree View
```
❌ test_refresh_triggers_event         - onDidChangeTreeData fires
❌ test_bundle_item_properties         - Bundle items formatted correctly
❌ test_log_item_properties            - Log items formatted correctly
❌ test_bundle_item_collapsible        - Bundles are expandable
```

**Status**: 0/14 tests (0%) - 🔴 COMPLETE GAP

---

## 🔗 Integration Tests - End-to-End (🔴 ALL MISSING!)

### `integration/bundleImport.test.ts` (FILE DOESN'T EXIST)

#### Happy Path
```
❌ test_e2e_qcsone_import              - Full QCSONE workflow
   └─ Import ZIP → Bundle created → Case ID detected → Logs added → UI updated
   
❌ test_e2e_generic_import             - Generic ZIP workflow
   └─ Import ZIP → Bundle created → No case ID → Logs added → UI updated
```

#### UI Integration
```
❌ test_ui_tree_updates                - Bundle appears in tree view
❌ test_ui_progress_visible            - Progress notification shown
❌ test_ui_success_notification        - Success message displayed
❌ test_ui_error_notification          - Error message on failure
```

#### Edge Cases
```
❌ test_concurrent_imports             - Multiple simultaneous imports
❌ test_large_archive_performance      - Large file import (<60s)
❌ test_nested_archive_integration     - Nested archives extracted
```

**Status**: 0/9 tests (0%) - 🔴 NO VALIDATION OF WORKFLOW

---

## 🎯 Priority Matrix

### 🔴 MUST HAVE (Production Blockers)

| Test | File | Lines | Priority | Effort |
|------|------|-------|----------|--------|
| Core import logic | `manager.rs` | 8 tests | P0 | 1.5h |
| Progress tracking | `manager.rs` | 3 tests | P0 | 0.5h |
| E2E QCSONE import | `integration/` | 1 test | P0 | 1h |
| E2E error handling | `integration/` | 1 test | P0 | 0.5h |
| E2E UI updates | `integration/` | 1 test | P0 | 0.5h |

**Total MUST HAVE**: 14 tests, ~4 hours

---

### 🟡 SHOULD HAVE (High Value)

| Test | File | Lines | Priority | Effort |
|------|------|-------|----------|--------|
| Archive extraction | `archive_extractor.rs` | 6 tests | P1 | 1.5h |
| UI layer logic | `bundleTreeProvider.ts` | 7 tests | P1 | 2h |
| Concurrent imports | `integration/` | 1 test | P1 | 0.5h |

**Total SHOULD HAVE**: 14 tests, ~4 hours

---

### 🟢 NICE TO HAVE (Future)

| Test | File | Lines | Priority | Effort |
|------|------|-------|----------|--------|
| Performance tests | Various | 3 tests | P2 | 1h |
| Stress tests | Various | 2 tests | P2 | 1h |
| Edge case coverage | Various | 5 tests | P2 | 1.5h |

**Total NICE TO HAVE**: 10 tests, ~3.5 hours

---

## 📈 Implementation Roadmap

### Phase 1: Production Minimum (4 hours) 🔴
```
Week 1, Day 1:
  ├─ Core import logic (8 tests)      [1.5h] ████████░░░░░░░░░░░░
  ├─ Progress tracking (3 tests)      [0.5h] ██░░░░░░░░░░░░░░░░░░
  └─ Integration tests (3 tests)      [2h]   ████████████░░░░░░░░

Status: 14/38 tests (37%) → Production ready for core path
```

### Phase 2: High Confidence (4 hours) 🟡
```
Week 1, Day 2:
  ├─ Archive extraction (6 tests)     [1.5h] ████████░░░░░░░░░░░░
  ├─ UI layer (7 tests)               [2h]   ████████████░░░░░░░░
  └─ Concurrent (1 test)              [0.5h] ██░░░░░░░░░░░░░░░░░░

Status: 28/38 tests (74%) → Production ready with full validation
```

### Phase 3: Complete Coverage (3.5 hours) 🟢
```
Week 2, Day 1:
  └─ Edge cases & performance         [3.5h] ██████████████░░░░░░

Status: 38/38 tests (100%) → Best practices achieved
```

---

## 🎯 Quick Reference: What to Test Next

### If you have 30 minutes:
```bash
Priority: test_import_qcsone_with_case_id
Location: lsp-server/src/bundle/manager.rs
Template: BUNDLE_TDD_IMPLEMENTATION_GUIDE.md, Phase 1, Test 1
Impact: Validates core import with case ID detection
```

### If you have 1 hour:
```bash
Priority: Core import tests (3 tests)
  1. test_import_qcsone_with_case_id
  2. test_import_generic_no_case_id  
  3. test_import_filters_non_logs
Location: lsp-server/src/bundle/manager.rs
Impact: Validates main import scenarios
```

### If you have 2 hours:
```bash
Priority: All core import + progress (11 tests)
Location: lsp-server/src/bundle/manager.rs
Impact: Core functionality fully tested
```

### If you have 4 hours (Recommended):
```bash
Priority: Phase 1 (Production Minimum)
  - Core import: 8 tests
  - Progress: 3 tests
  - Integration: 3 tests
Impact: Production-ready, regression protected
```

---

## 📊 Coverage by File

```
archive_extractor.rs      [████████░░░░░░░░░░░░] 45% - 5/11 tests
bundle/manager.rs         [██░░░░░░░░░░░░░░░░░░] 15% - 2/13 tests
wiring.test.ts            [██████████████████░░] 92% - 24/26 tests
bundleTreeProvider.ts     [░░░░░░░░░░░░░░░░░░░░]  0% - 0/14 tests
integration/              [░░░░░░░░░░░░░░░░░░░░]  0% - 0/9 tests
──────────────────────────────────────────────────────────────
TOTAL                     [███░░░░░░░░░░░░░░░░░] 18% - 31/73 tests
```

---

## ✅ Success Checklist

Use this to track your progress:

### Phase 1: Production Minimum
- [ ] 8 core import tests passing
- [ ] 3 progress tests passing
- [ ] 3 integration tests passing
- [ ] Total: 14 critical tests
- [ ] Can deploy to production with confidence

### Phase 2: High Confidence  
- [ ] All Phase 1 tests passing
- [ ] 6 extraction tests passing
- [ ] 7 UI layer tests passing
- [ ] 1 concurrent test passing
- [ ] Total: 28 tests (74% coverage)
- [ ] Full regression protection

### Phase 3: Complete Coverage
- [ ] All Phase 1+2 tests passing
- [ ] 10 additional edge case tests
- [ ] Total: 38 tests (100% coverage)
- [ ] Best practices followed
- [ ] Future-proof

---

## 🚀 Get Started

```bash
# 1. Pick your priority level (Phase 1, 2, or 3)

# 2. Open the implementation guide
cat .zed/BUNDLE_TDD_IMPLEMENTATION_GUIDE.md

# 3. Start with Phase 1, Test 1
cd lsp-server
# Open src/bundle/manager.rs
# Add test_import_qcsone_with_case_id

# 4. Run and verify
cargo test import_tests -- --nocapture

# 5. Repeat for next test

# 6. Track progress using this map
```

---

**Use this map to:**
- ✅ See what's tested vs. what's missing
- ✅ Prioritize test implementation
- ✅ Track progress toward production readiness
- ✅ Understand the test landscape at a glance

**Visual guide for making bundle import production-ready!** 🎯