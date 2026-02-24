# Pattern Overlays - Implementation TODO 🚧

**Status:** 📋 Design Complete, Ready for Implementation  
**Created:** 2026-02-24  
**Priority:** High (Critical Workflow Enhancement)

---

## 📚 Prerequisites - Read First

Before implementing, review these documents in order:

1. **USER_SCENARIOS.md** - Scenarios 10-17 (Pattern Overlays use cases)
2. **PATTERN_OVERLAYS_SCENARIOS.md** - Detailed scenarios, architecture, UI/UX design
3. **.rules** - STDD workflow (Scenario → Test → Code → Commit → CI)

---

## 🎯 Quick Summary

**What:** Pattern Overlays are ordered, composable layers that apply delta changes to base patterns without modifying them.

**Why:** Users need to suppress noise, tag categories, extract metrics, and customize patterns per bundle/case without breaking base patterns.

**How:** Layers with priority (0-125) merge in order. Each layer has Signatures (match), Actions (do), States (lifecycle), and Scenarios (conditions).

---

## 📋 Implementation Phases

### Phase 1: Core Types & Layer Manager (Week 1) 🔴 Not Started

**Goal:** Load and merge layers in priority order

**User Scenario:**
> "As Sarah, when I have multiple layers (base, org, case), they should merge in priority order with higher priority winning conflicts."

**Test Checklist (TDD - Write These First):**
- [ ] `layerManager.test.ts` - Load single layer from JSON
- [ ] Test: Merge two layers (priority order)
- [ ] Test: Resolve conflicts (higher priority wins)
- [ ] Test: Enable/disable layer toggle
- [ ] Test: Validate layer schema (reject invalid JSON)
- [ ] Test: Handle missing/corrupted layer files

**Files to Create:**
```
src/overlays/
├── types.ts              # TypeScript interfaces (Layer, Signature, Action, State, Scenario)
├── layerManager.ts       # Load, merge, enable/disable layers
├── validator.ts          # JSON schema validation
└── __tests__/
    ├── layerManager.test.ts
    └── validator.test.ts
```

**Type Definitions (from PATTERN_OVERLAYS_SCENARIOS.md):**
- `PatternLayer` - Core layer structure
- `Scope` - What the layer applies to
- `Scenario` - Activation conditions
- `Rule` - Signature + Action pair
- `Signature` - Pattern matcher
- `Action` - Union type of all actions
- `State` - Lifecycle enum

**Success Criteria:**
- ✅ Can load 5+ layers from `.vscode/scout-overlays/`
- ✅ Merge completes in <100ms for 1000 rules
- ✅ Higher priority always wins conflicts
- ✅ Invalid layers rejected with clear error messages

**Estimated Time:** 8 hours

---

### Phase 2: Suppress Action (Week 2) 🔴 Not Started

**Goal:** Suppress noisy warnings for specific bundle

**User Scenario:**
> "As Sarah, I see 200 'Jabber MRA timeout' warnings that are normal in my environment. I need to suppress them just for this case without affecting base patterns."

**Test Checklist:**
- [ ] `suppressAction.test.ts` - Create suppress rule
- [ ] Test: Apply suppression to diagnostics
- [ ] Test: Preview suppression impact (before/after counts)
- [ ] Test: Activate/deactivate suppression
- [ ] Test: Verify base patterns unchanged
- [ ] Test: Suppression scoped to specific bundle only

**Files to Create:**
```
src/overlays/actions/
├── suppressAction.ts
├── actionExecutor.ts     # Orchestrates all actions
└── __tests__/
    ├── suppressAction.test.ts
    └── actionExecutor.test.ts
```

**Integration Points:**
- Update `diagnosticsProvider.ts` to check suppression rules before showing diagnostics
- Add `isSuppressed(diagnostic, layers)` method

**UI Requirements:**
- Right-click diagnostic → "Suppress This Pattern"
- Preview shows: "847 warnings → 647 warnings (-200 suppressed)"

**Success Criteria:**
- ✅ Suppressions apply without modifying base patterns
- ✅ Preview accurate within 1% of actual result
- ✅ Can toggle suppression on/off instantly
- ✅ Suppression persists across VS Code restarts

**Estimated Time:** 6 hours

---

### Phase 3: Tag Action (Week 3) 🔴 Not Started

**Goal:** Tag custom error categories for filtering

**User Scenario:**
> "As Sarah, I want to tag all voicemail-related errors with 'voicemail-issue' so I can filter and group them separately."

**Test Checklist:**
- [ ] `tagAction.test.ts` - Create tag rule with regex
- [ ] Test: Apply tags to matching log lines
- [ ] Test: Multiple tags per line
- [ ] Test: Filter results by tag
- [ ] Test: Export includes tags
- [ ] Test: Tag inheritance (layers can add tags)

**Files to Create:**
```
src/overlays/actions/
├── tagAction.ts
└── __tests__/
    └── tagAction.test.ts
```

**Integration Points:**
- Update `resultsTreeProvider.ts` to show tags
- Update `modernResultsTreeProvider.ts` for tag filtering
- Add tag badges/icons in tree view
- Export tags in CSV/JSON output

**UI Requirements:**
- Tags appear as badges next to log lines
- Click tag → filter to only tagged lines
- Tree view grouping by tag

**Success Criteria:**
- ✅ Tags applied without modifying log files
- ✅ Can add multiple tags per pattern
- ✅ Tag filtering instant (<100ms for 10k lines)
- ✅ Tags exported to all formats (CSV, JSON, TAC case)

**Estimated Time:** 8 hours

---

### Phase 4: Extract Action (Week 4) 🔴 Not Started

**Goal:** Extract metrics from logs using regex capture groups

**User Scenario:**
> "As Sarah, I want to extract response times from 'Database query completed in 450ms' logs to find the slowest queries."

**Test Checklist:**
- [ ] `extractAction.test.ts` - Parse regex with named groups
- [ ] Test: Extract fields from log lines
- [ ] Test: Type conversion (string → integer, float)
- [ ] Test: Aggregate extracted data (avg, max, min, count)
- [ ] Test: Export to CSV with extracted fields
- [ ] Test: Handle missing/malformed captures gracefully

**Files to Create:**
```
src/overlays/actions/
├── extractAction.ts
├── fieldAggregator.ts    # Aggregate extracted metrics
└── __tests__/
    ├── extractAction.test.ts
    └── fieldAggregator.test.ts
```

**Regex Support:**
- Named capture groups: `(?P<duration>\d+)ms`
- Multiple fields per pattern
- Type hints: `{duration: "integer", query_type: "string"}`

**UI Requirements:**
- Results tree shows grouped by extracted field
- Metrics panel shows aggregations:
  - SELECT: avg 450ms (234 queries)
  - UPDATE: avg 1200ms (89 queries)
- Sort/filter by extracted values
- CSV export includes extracted columns

**Success Criteria:**
- ✅ Extract 10k+ fields in <1 second
- ✅ Accurate type conversion (no data loss)
- ✅ Aggregations match manual verification
- ✅ CSV export compatible with Excel/Python

**Estimated Time:** 10 hours

---

### Phase 5: UI Integration (Week 5-6) 🔴 Not Started

**Goal:** Full UI for creating, editing, and managing overlays

**User Scenario:**
> "As Sarah, I want to right-click a log line and create a pattern overlay without editing JSON files."

**Test Checklist:**
- [ ] `overlayTreeProvider.test.ts` - Tree view shows all layers
- [ ] Test: Right-click → "Create Pattern Overlay" menu
- [ ] Test: Dialog collects layer config (name, scope, priority)
- [ ] Test: Preview panel shows before/after impact
- [ ] Test: Can edit existing layer
- [ ] Test: Can delete layer with confirmation
- [ ] Test: Layer state transitions (draft → staged → active)

**Files to Create:**
```
src/overlays/
├── overlayTreeProvider.ts      # Tree view for layers
├── overlayCommands.ts          # VS Code commands
├── overlayDialog.ts            # Input dialogs
├── previewPanel.ts             # Webview preview
└── __tests__/
    ├── overlayTreeProvider.test.ts
    ├── overlayCommands.test.ts
    └── previewPanel.test.ts
```

**Commands to Register:**
- `logScoutAnalyzer.overlays.create` - Create new overlay
- `logScoutAnalyzer.overlays.edit` - Edit existing overlay
- `logScoutAnalyzer.overlays.delete` - Delete overlay
- `logScoutAnalyzer.overlays.toggle` - Enable/disable
- `logScoutAnalyzer.overlays.preview` - Show preview panel
- `logScoutAnalyzer.overlays.export` - Export to JSON
- `logScoutAnalyzer.overlays.import` - Import from JSON

**Tree View:**
```
📦 Pattern Overlays
├─ 🟢 Base Patterns (p=0) [Active]
├─ 🟢 Michigan Homes IT (p=25) [Active]
├─ 🟡 Case 700435046 (p=100) [Staged]
└─ ⚪ Sarah's Personal (p=125) [Draft]
```

**Preview Panel (Webview):**
- Before/after counts (warnings, errors, info)
- List of changes (suppressions, tags, extractions)
- Activate/Cancel buttons

**Success Criteria:**
- ✅ <2 clicks to create overlay from log line
- ✅ Preview loads in <500ms
- ✅ Tree view updates in real-time
- ✅ Keyboard shortcuts work (Ctrl+Shift+O)

**Estimated Time:** 16 hours

---

### Phase 6: Scenario Conditions (Week 7) 🔴 Not Started

**Goal:** Hostname-specific, time-window, and device-type filtering

**User Scenario:**
> "As Sarah, our publisher server has unique error patterns. I need overlays that only activate for logs from 'uc-cucm-pub1.mihomes.com'."

**Test Checklist:**
- [ ] `scenarioEvaluator.test.ts` - Hostname matching
- [ ] Test: Wildcard hostname patterns (*.mihomes.com)
- [ ] Test: Time window enforcement (from/to dates)
- [ ] Test: Device type filtering (publisher, subscriber)
- [ ] Test: Bundle ID filtering
- [ ] Test: Product version filtering

**Files to Create:**
```
src/overlays/
├── scenarioEvaluator.ts        # Evaluate scenario conditions
└── __tests__/
    └── scenarioEvaluator.test.ts
```

**Scenario Conditions:**
```typescript
{
  hostnames: ["uc-cucm-pub1.mihomes.com", "*.mihomes.com"],
  deviceTypes: ["publisher"],
  timeWindow: {from: "2026-02-20", to: "2026-03-01"},
  bundleIds: ["700435046"],
  productVersions: ["CUCM 12.5", "CUCM 14.0"]
}
```

**Success Criteria:**
- ✅ Hostname patterns support wildcards
- ✅ Time windows enforce UTC correctly
- ✅ Device types auto-detected from bundle metadata
- ✅ Clear indicator when scenario conditions not met

**Estimated Time:** 6 hours

---

### Phase 7: Advanced Actions (Week 8) 🔴 Not Started

**Goal:** Rewrite, Route, Annotate, Escalate, ChangeSeverity actions

**Test Checklist:**
- [ ] `rewriteAction.test.ts` - Normalize log format
- [ ] `routeAction.test.ts` - Send to different pipeline
- [ ] `annotateAction.test.ts` - Add comments/notes
- [ ] `escalateAction.test.ts` - Alert/notify
- [ ] `changeSeverityAction.test.ts` - Warning → Error

**Files to Create:**
```
src/overlays/actions/
├── rewriteAction.ts
├── routeAction.ts
├── annotateAction.ts
├── escalateAction.ts
└── changeSeverityAction.ts
```

**Success Criteria:**
- ✅ All action types implemented
- ✅ Actions composable (multiple per signature)
- ✅ Performance: <1ms per action execution

**Estimated Time:** 12 hours

---

## 🚀 Quick Start (When Ready to Implement)

### Step 1: Set Up Project Structure

```bash
cd vscode-extension
mkdir -p src/overlays/actions/__tests__
```

### Step 2: Create Type Definitions (Start Here!)

```bash
code src/overlays/types.ts
```

Copy interfaces from `PATTERN_OVERLAYS_SCENARIOS.md` section "Architecture"

### Step 3: Write First Test (TDD - RED Phase)

```bash
code src/overlays/__tests__/layerManager.test.ts
```

Start with simplest test:
```typescript
test('Should load single layer from JSON', () => {
  const json = {
    layerId: "test-1",
    name: "Test Layer",
    priority: 100,
    rules: []
  };
  const layer = LayerManager.loadFromJSON(json);
  assert.strictEqual(layer.name, "Test Layer");
});
```

### Step 4: Implement to Pass Test (GREEN Phase)

```bash
code src/overlays/layerManager.ts
```

Write minimal code to make test pass.

### Step 5: Commit (Following .rules)

```bash
git add -A
git commit -m "test: add layer loading test (RED)

- Test loads single layer from JSON
- Test currently failing (no implementation yet)
- Next: implement LayerManager.loadFromJSON()"

# After implementing:
git commit -m "feat: implement layer loading from JSON

- LayerManager.loadFromJSON() parses and validates JSON
- Test now passing (GREEN)
- Next: test layer merging"
```

---

## 📊 Progress Tracking

### Overall Status

```
Phase 1: Core Types & Layer Manager  [ ] 0% (Not Started)
Phase 2: Suppress Action             [ ] 0% (Not Started)
Phase 3: Tag Action                  [ ] 0% (Not Started)
Phase 4: Extract Action              [ ] 0% (Not Started)
Phase 5: UI Integration              [ ] 0% (Not Started)
Phase 6: Scenario Conditions         [ ] 0% (Not Started)
Phase 7: Advanced Actions            [ ] 0% (Not Started)

Overall: 0% Complete (0/7 phases)
```

### Estimated Timeline

- **Total Effort:** ~66 hours (8-9 weeks at 8 hours/week)
- **Target Completion:** End of April 2026
- **Milestone 1 (Basic):** Phase 1-2 complete → Suppression working
- **Milestone 2 (Useful):** Phase 1-4 complete → Suppress, Tag, Extract
- **Milestone 3 (Complete):** Phase 1-7 complete → Full feature set

---

## 🎯 Success Criteria (Definition of Done)

### Per-Phase Criteria

Each phase is considered complete when:
- ✅ All tests passing (GREEN)
- ✅ Test coverage ≥ 90% for new code
- ✅ No TypeScript errors
- ✅ No ESLint warnings
- ✅ Documentation updated
- ✅ User scenario verified manually
- ✅ Committed with clear message
- ✅ CI/CD pipeline passing

### Overall Feature Criteria

Pattern Overlays feature is complete when:
- ✅ All 7 phases implemented
- ✅ All user scenarios from PATTERN_OVERLAYS_SCENARIOS.md working
- ✅ Performance: <100ms layer merge for 1000 rules
- ✅ Storage: <10MB per layer file
- ✅ UI: <2 clicks to create overlay
- ✅ Zero breaking changes to existing pattern system
- ✅ Team can share overlays via git
- ✅ Documentation complete (README, examples, troubleshooting)

---

## 🔗 Related Files

### Documentation
- `USER_SCENARIOS.md` - High-level user scenarios (Scenarios 10-17)
- `PATTERN_OVERLAYS_SCENARIOS.md` - Detailed design, architecture, UI/UX
- `PATTERN_OVERLAYS_TODO.md` - This file (implementation tracking)

### Code (To Be Created)
- `src/overlays/types.ts` - Type definitions
- `src/overlays/layerManager.ts` - Core layer logic
- `src/overlays/actions/*.ts` - Action implementations
- `src/overlays/overlayTreeProvider.ts` - UI tree view
- `src/overlays/__tests__/*.ts` - All tests

### Storage
- `.vscode/scout-overlays/*.json` - User layer files

---

## 💡 Implementation Tips

### Follow STDD Workflow

**Scenario → Test (RED) → Code (GREEN) → Commit → CI**

1. Read user scenario from PATTERN_OVERLAYS_SCENARIOS.md
2. Write failing test that validates scenario
3. Run test, verify it fails (RED)
4. Implement minimal code to pass test
5. Run test, verify it passes (GREEN)
6. Commit with clear message
7. Push (CI validates)

### Start Simple, Iterate

- Phase 1-2 get you 80% of user value (suppress noise)
- Phases 3-4 add power features (tag, extract)
- Phases 5-7 polish UX and add enterprise features

### Test-Driven Benefits

- Tests become documentation
- Refactoring safe (tests catch regressions)
- Design emerges naturally from scenarios
- Confidence when shipping

### Performance Guidelines

- Layer merge: <100ms for 1000 rules
- Action execution: <1ms per action
- UI updates: <500ms for preview
- Storage: <10MB per layer file

### UX Principles

- **Empty State**: Welcoming, not alarming ("No overlays yet - create your first!")
- **Loading**: Show progress, allow cancel
- **Error**: Clear message + recovery action
- **Active**: Full functionality with keyboard shortcuts

---

## 🐛 Known Challenges

### Challenge 1: Regex Performance

**Issue:** Regex matching can be slow for complex patterns  
**Solution:** Compile regex once, cache compiled patterns, timeout after 100ms

### Challenge 2: Layer Merge Complexity

**Issue:** Merging 10+ layers with 100s of rules can be slow  
**Solution:** Build index by signature pattern, merge only conflicts

### Challenge 3: Preview Accuracy

**Issue:** Preview must match actual result exactly  
**Solution:** Use same merge logic for preview and execution, dry-run mode

### Challenge 4: Storage Migration

**Issue:** Existing pattern overrides use different schema  
**Solution:** Write migration script, support both formats temporarily

---

## 📞 Questions?

If you're implementing this and have questions:

1. **Check docs first:**
   - PATTERN_OVERLAYS_SCENARIOS.md
   - USER_SCENARIOS.md
   - .rules (STDD workflow)

2. **Review tests:**
   - Tests are living documentation
   - See `__tests__/` for examples

3. **Ask AI assistant:**
   - Reference this TODO file
   - Mention specific phase number
   - Share user scenario you're implementing

---

## 🎉 Future Enhancements (Post-MVP)

After Phase 7 is complete, consider:

- [ ] **Layer Templates** - Pre-built overlays for common scenarios
- [ ] **Layer Marketplace** - Share overlays with community
- [ ] **AI-Assisted Creation** - LLM suggests overlay rules
- [ ] **Telemetry** - Track which overlays are most useful
- [ ] **Visual Editor** - Drag-and-drop rule builder
- [ ] **Rollout Dashboards** - Metrics for gradual rollout
- [ ] **A/B Testing** - Compare two overlay configurations
- [ ] **Layer Recommendations** - "Users like you also use..."

---

**Last Updated:** 2026-02-24  
**Next Update:** After Phase 1 completion  
**Maintained By:** Development team

---

**Ready to start? Begin with Phase 1, Step 1! 🚀**