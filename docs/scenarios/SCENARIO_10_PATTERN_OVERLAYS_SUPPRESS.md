# Scenario 10: Pattern Overlays - Quick Fix for Noisy Warnings 📋

**Status:** 📋 Planned  
**Priority:** High (critical workflow)  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, I'm investigating case 700435046 and seeing hundreds of 'Jabber MRA timeout' warnings that are normal in my environment. I need to suppress these just for this case without affecting my base patterns."*

---

## 📖 Context

Sarah is analyzing an RTMT bundle for a voicemail issue. The Problems Panel shows 847 warnings, but 200 of them are "Jabber MRA timeout" messages that are completely normal in their MRA (Mobile and Remote Access) deployment. These warnings are drowning out the real issues she needs to investigate.

She needs a way to:
- **Suppress** these specific warnings for this case only
- **Preserve** the base pattern library (don't modify shipped patterns)
- **Share** this suppression with team members working on the same case
- **Revert** easily if needed

---

## 🎬 Target User Flow

### Step 1: Identify Noisy Pattern
1. Sarah opens RTMT bundle for case 700435046
2. Problems Panel shows:
   - 847 total warnings
   - 200 are "Jabber MRA timeout" (repetitive noise)
   - 647 are potentially relevant to voicemail investigation

### Step 2: Create Pattern Overlay
3. Sarah right-clicks on one "Jabber MRA timeout" warning
4. Context menu appears:
   - **"Create Pattern Overlay"** → hover reveals submenu:
     - "Suppress Pattern"
     - "Change Severity"
     - "Add Custom Tag"
     - "Extract Fields"
5. Sarah selects **"Suppress Pattern"**

### Step 3: Configure Overlay
6. Dialog appears with pre-filled values:

```
┌─────────────────────────────────────────────────┐
│ Create Pattern Overlay                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Layer Name:                                     │
│ [Case 700435046 - Voicemail Investigation]     │
│                                                 │
│ Pattern to Suppress:                            │
│ [(?i)jabber.*mra.*timeout]                     │
│                                                 │
│ Scope:                                          │
│ ○ All bundles                                   │
│ ● This bundle only                              │
│ ○ Hostname: [uc-cucm-pub1.mihomes.com ▼]      │
│                                                 │
│ Action:                                         │
│ ● Suppress (hide from Problems Panel)          │
│ ○ Change severity to: [Info ▼]                │
│ ○ Add tags: [____________]                     │
│                                                 │
│ State:                                          │
│ ○ Draft (inactive, for editing)                │
│ ● Staged (preview mode)                        │
│ ○ Active (apply immediately)                   │
│                                                 │
│ Reason (optional):                              │
│ [Normal in MRA environment, not relevant]      │
│                                                 │
│        [Preview]  [Cancel]  [Save Overlay]     │
└─────────────────────────────────────────────────┘
```

### Step 4: Preview Changes
7. Sarah clicks **"Preview"**
8. Split panel appears showing:
   - **Left:** Current state (847 warnings)
   - **Right:** Preview with overlay (647 warnings)
   - Highlighted: 200 warnings that will be suppressed
9. Preview shows: "✓ This overlay will suppress 200 warnings"

### Step 5: Activate Overlay
10. Sarah confirms and clicks **"Save Overlay"**
11. System creates overlay layer:
    - Priority: 100 (case-specific layer)
    - Scope: Bundle ID `700435046`
    - State: `staged` (preview mode)
12. File saved to: `.vscode/scout-overlays/case-700435046.json`

### Step 6: Verify Results
13. Problems Panel updates:
    - 847 warnings → 647 warnings (200 suppressed)
    - Suppressed warnings have strikethrough in expanded view (if needed for reference)
14. Tree view shows new overlay:
    ```
    📦 Pattern Overlays
    ├─ 🟢 Base Patterns (p=0) [Active]
    │  └─ 847 signatures
    └─ 🟡 Case 700435046 (p=100) [Staged]
       └─ 🚫 1 suppression (200 matches)
    ```

### Step 7: Activate & Share
15. Sarah right-clicks overlay → "Activate" (staged → active)
16. She commits the overlay file to git:
    ```bash
    git add .vscode/scout-overlays/case-700435046.json
    git commit -m "Add overlay to suppress Jabber MRA timeouts"
    git push
    ```
17. Team members pull the changes and get the same suppression rules

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Warnings suppressed** - 200 "Jabber MRA timeout" warnings hidden from Problems Panel
- ✅ **Base patterns unchanged** - Shipped pattern library not modified
- ✅ **Scoped correctly** - Only affects bundle 700435046 (other bundles unaffected)
- ✅ **Preview before activation** - Sarah can see impact before committing
- ✅ **Easy rollback** - Can disable or delete overlay with one click

### User Experience
- ✅ **< 5 clicks** to create overlay from right-click menu
- ✅ **< 3 seconds** to apply overlay to bundle
- ✅ **Clear visual feedback** - Problems Panel updates immediately
- ✅ **Shareable** - Team members can use same overlay
- ✅ **Git-friendly** - JSON file with readable diffs

### Technical
- ✅ **No performance impact** - < 100ms to merge layers
- ✅ **Persistent** - Overlay saved and restored across VS Code restarts
- ✅ **Auditable** - Created timestamp, author, reason tracked
- ✅ **Testable** - Unit tests for suppress action

---

## 📊 Acceptance Tests

### Test 1: Create Suppress Overlay from Context Menu
```gherkin
Given Sarah has opened bundle "700435046"
And the Problems Panel shows 200 "Jabber MRA timeout" warnings
When she right-clicks one warning
And selects "Create Pattern Overlay" → "Suppress Pattern"
And saves the overlay in "Staged" state
Then a new overlay file is created at ".vscode/scout-overlays/case-700435046.json"
And the overlay appears in the Pattern Overlays tree view
And the Problems Panel still shows 847 warnings (staged = preview only)
```

### Test 2: Preview Suppression
```gherkin
Given an overlay exists in "Staged" state
When Sarah clicks "Preview" in the overlay panel
Then a split view appears showing before/after
And 200 warnings are highlighted as "will be suppressed"
And the preview shows "847 → 647 warnings"
```

### Test 3: Activate Overlay
```gherkin
Given an overlay exists in "Staged" state
When Sarah right-clicks the overlay and selects "Activate"
Then the overlay state changes to "Active"
And the Problems Panel updates to show 647 warnings (200 suppressed)
And the tree view shows overlay as "🟢 Active"
```

### Test 4: Disable Overlay
```gherkin
Given an active overlay is suppressing 200 warnings
When Sarah right-clicks the overlay and selects "Disable"
Then the overlay state changes to "Inactive"
And the Problems Panel shows 847 warnings again
And the tree view shows overlay as "⚪ Inactive"
```

### Test 5: Scope Isolation
```gherkin
Given an overlay is scoped to bundle "700435046"
When Sarah opens a different bundle "700123456"
And that bundle contains "Jabber MRA timeout" warnings
Then those warnings are NOT suppressed
And the overlay shows as "🔒 Not Active (scope mismatch)"
```

### Test 6: Share with Team
```gherkin
Given Sarah has created and committed an overlay to git
When a teammate pulls the changes
And opens the same bundle "700435046"
Then the overlay is loaded automatically
And they see 647 warnings (200 suppressed)
And they can view/edit/disable the overlay
```

---

## 🏗️ Technical Implementation

### Data Structure (JSON)

```json
{
  "layerId": "overlay-case-700435046",
  "name": "Case 700435046 - Voicemail Investigation",
  "type": "case",
  "priority": 100,
  "scope": {
    "level": "bundle",
    "id": "700435046"
  },
  "state": "staged",
  "enabled": true,
  "version": "1.0.0",
  "author": "sarah@mihomes.com",
  "createdAt": "2026-02-24T10:30:00Z",
  "updatedAt": "2026-02-24T10:30:00Z",
  "rules": [
    {
      "id": "suppress-jabber-mra-timeout",
      "signature": {
        "type": "regex",
        "pattern": "(?i)jabber.*mra.*timeout",
        "flags": "i"
      },
      "action": {
        "type": "suppress",
        "reason": "Normal in MRA environment, not relevant to voicemail investigation"
      },
      "priority": 1,
      "state": "active",
      "notes": "Created from warning in CCM00000001.txt line 4582"
    }
  ]
}
```

### Code Flow

```typescript
// 1. User right-clicks diagnostic
commands.registerCommand('logScoutAnalyzer.createOverlay', async (diagnostic) => {
  const overlay = await showOverlayDialog(diagnostic);
  await layerManager.save(overlay);
  treeView.refresh();
});

// 2. Layer Manager applies overlays
class LayerManager {
  applyOverlays(diagnostics: Diagnostic[], bundleId: string): Diagnostic[] {
    const layers = this.getActiveLayers(bundleId);
    const sortedLayers = this.sortByPriority(layers); // Higher priority wins
    
    let result = diagnostics;
    for (const layer of sortedLayers) {
      result = this.applyLayer(result, layer);
    }
    return result;
  }
  
  private applyLayer(diagnostics: Diagnostic[], layer: PatternLayer): Diagnostic[] {
    for (const rule of layer.rules) {
      if (rule.action.type === 'suppress') {
        diagnostics = suppressAction.apply(diagnostics, rule);
      }
    }
    return diagnostics;
  }
}

// 3. Suppress Action
export function applySuppress(diagnostics: Diagnostic[], rule: Rule): Diagnostic[] {
  const regex = new RegExp(rule.signature.pattern, rule.signature.flags || 'i');
  
  return diagnostics.filter(diag => {
    const matches = regex.test(diag.message);
    if (matches && rule.action.type === 'suppress') {
      // Log for audit trail
      logger.debug(`Suppressed: ${diag.message} (rule: ${rule.id})`);
      return false; // Remove from diagnostics
    }
    return true; // Keep diagnostic
  });
}
```

---

## 🎨 UI Mockups

### Context Menu
```
Right-click on diagnostic:
┌─────────────────────────────────┐
│ Copy                            │
│ Copy Message                    │
│ ──────────────────────────────  │
│ Create Pattern Overlay       ▶  │ ┌────────────────────────┐
│ Go to File                      │ │ Suppress Pattern       │
│ ──────────────────────────────  │ │ Change Severity        │
│ Filter Similar                  │ │ Add Custom Tag         │
└─────────────────────────────────┘ │ Extract Fields         │
                                    └────────────────────────┘
```

### Pattern Overlays Tree View
```
📦 PATTERN OVERLAYS
├─ 🟢 Base Patterns (p=0) [Active]
│  └─ 📊 847 signatures
├─ 🟢 Michigan Homes IT (p=25) [Active]
│  ├─ 📝 12 suppressions
│  └─ 🏷️ 5 custom tags
└─ 🟡 Case 700435046 (p=100) [Staged]
   └─ 🚫 1 suppression
      └─ "Jabber MRA timeout" (200 matches)
         [Preview] [Activate] [Edit] [Delete]
```

### Preview Panel
```
┌─────────────────────────────────────────────────────────────┐
│ Preview: Case 700435046 Overlay                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️  Before (Current):  847 warnings                         │
│ ✅  After (Preview):   647 warnings                         │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🚫 Suppressed (200 warnings):                              │
│ ├─ "Jabber MRA connection timeout" (150 occurrences)       │
│ ├─ "Jabber MRA session timeout" (35 occurrences)           │
│ └─ "Jabber MRA authentication timeout" (15 occurrences)    │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│               [Cancel]  [Activate Overlay]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 State Diagram

```
┌────────┐
│ Draft  │ ← User is editing, not applied
└───┬────┘
    │ "Preview"
    ▼
┌────────┐
│ Staged │ ← Preview mode, shows impact
└───┬────┘
    │ "Activate"
    ▼
┌────────┐
│ Active │ ← Applied to diagnostics
└───┬────┘
    │ "Disable" or "Deprecate"
    ▼
┌──────────┐
│ Inactive │ ← Not applied, can re-enable
└──────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Core Types & Storage (Week 1)
- [ ] Define `PatternLayer`, `Rule`, `Signature`, `Action` types
- [ ] Implement JSON schema validation
- [ ] Create `LayerManager` class (load, save, enable/disable)
- [ ] Write tests for layer CRUD operations

### Phase 2: Suppress Action (Week 2)
- [ ] Implement `suppressAction.ts`
- [ ] Integrate with diagnostics provider
- [ ] Add tests for pattern matching and filtering
- [ ] Performance test: 10k diagnostics in < 100ms

### Phase 3: UI Integration (Week 3)
- [ ] Add context menu "Create Pattern Overlay"
- [ ] Build overlay creation dialog
- [ ] Create Pattern Overlays tree view
- [ ] Implement preview panel

### Phase 4: Preview & Activation (Week 4)
- [ ] Build preview logic (before/after comparison)
- [ ] Implement state transitions (draft → staged → active)
- [ ] Add enable/disable toggle
- [ ] Test with real bundle data

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 95%+ test coverage for suppress action
- ✅ All tests passing (GREEN phase)
- ✅ < 100ms layer merge time
- ✅ Zero breaking changes to existing patterns

### User Metrics
- ✅ 90% of users suppress at least one pattern in first week
- ✅ Average overlay creation time < 30 seconds
- ✅ 80% of users preview before activating
- ✅ Average 2-3 overlays per case bundle

### Business Impact
- ✅ 50% reduction in "noisy warnings" complaints
- ✅ 30% faster case analysis (less clutter)
- ✅ Increased user satisfaction scores
- ✅ Overlays shared across team (git commits)

---

## 🔗 Related Documentation

- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Architecture section)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 2)
- **Quick Reference:** `PATTERN_OVERLAYS_QUICK_REF.md` (Suppress Action)
- **Base Scenarios:** `USER_SCENARIOS.md` (Scenarios 10-16)

---

## 📝 Notes

### Design Decisions
1. **Why "Staged" state?** - Forces users to preview before committing, reduces mistakes
2. **Why bundle-scoped by default?** - Safest option, prevents accidental global suppression
3. **Why JSON files?** - Git-friendly, human-readable, easy to share
4. **Why priority-based?** - Allows clear hierarchy (base → org → site → case → user)

### Edge Cases
- **What if pattern is too broad?** - Preview shows all matches, user can refine
- **What if overlay file is corrupted?** - Validation fails gracefully, shows error in tree view
- **What if same pattern in multiple layers?** - Higher priority wins (clear documentation)
- **What if bundle is closed?** - Overlay persists, reactivates when bundle reopened

### Future Enhancements
- **Regex tester** - Test pattern against sample text before saving
- **Overlay templates** - Pre-built overlays for common scenarios (Jabber, DB, SIP)
- **Bulk operations** - Suppress multiple patterns at once
- **Analytics** - Show which patterns are most commonly suppressed

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 2)  
**Assigned To:** TBD