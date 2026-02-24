# Scenario 15: Pattern Overlays - Layer Inheritance & Priority 📋

**Status:** 📋 Planned  
**Priority:** High (core architecture)  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer / Team Lead

---

## 🎯 User Story

*"As a team, we have base patterns (priority 0), site-specific patterns (priority 50), and case-specific patterns (priority 100). Higher priority should override lower."*

---

## 📖 Context

Sarah works in a large enterprise with multiple teams, sites, and cases. They need a **layered pattern system** where patterns can be:

- **Inherited** - Start with base patterns, add organization/site/case overrides
- **Overridden** - Higher priority layers win conflicts
- **Composed** - Multiple layers merge to create final ruleset
- **Auditable** - Track which layer contributed which rule

**Without Priority System:**
- ❌ All patterns treated equally → chaos
- ❌ No way to override shipped patterns without modifying them
- ❌ Site-specific patterns conflict with base patterns
- ❌ Personal preferences can't override team settings

**With Priority System:**
- ✅ Clear hierarchy: Base → Org → Site → Team → Case → User
- ✅ Higher priority wins conflicts
- ✅ Delta-only storage (only store differences)
- ✅ Preview merged result before activation
- ✅ Audit trail (who/when/why for each layer)

---

## 🏗️ Layer Hierarchy

### Standard Priority Ranges

```
┌─────────────────────────────────────────────────┐
│ Layer Type      │ Priority │ Owner             │
├─────────────────┼──────────┼───────────────────┤
│ Base Patterns   │    0     │ Extension (read-only) │
│ Organization    │   25     │ IT Admin          │
│ Site/Location   │   50     │ Site Lead         │
│ Team            │   75     │ Team Lead         │
│ Case/Project    │  100     │ Engineer          │
│ User/Personal   │  125     │ Individual        │
└─────────────────────────────────────────────────┘

Higher priority wins conflicts ↑
```

### Example Scenario

**Pattern:** "Jabber MRA timeout"

1. **Base Layer (p=0):**  
   - Severity: **Warning**
   - Reason: Default behavior
   
2. **Site Layer (p=50):**  
   - Severity: **Info**
   - Reason: Less noisy at remote sites with MRA
   
3. **Case Layer (p=100):**  
   - Action: **Suppress**
   - Reason: Not relevant to voicemail investigation

**Final Result:** Pattern is **suppressed** (highest priority wins)

---

## 🎬 Target User Flow

### Step 1: Start with Base Patterns

1. Extension ships with **Base Layer (p=0)**:
   - 847 curated patterns
   - Read-only (cannot be modified)
   - Covers common UC issues

2. Sarah opens RTMT bundle
3. All base patterns active by default
4. Problems Panel shows 847 warnings

### Step 2: Add Organization Layer

5. IT Admin creates **Organization Layer (p=25)**:
   - Name: "Michigan Homes IT"
   - Scope: Global (all bundles)
   - Rules:
     - Suppress "Tomcat idle timeout" (normal in their environment)
     - Change "CDR file rotation" from Warning → Info

6. JSON file stored at:
   ```
   .vscode/scout-overlays/org-michigan-homes.json
   ```

7. When Sarah opens bundle:
   - Base layer (p=0) applies first
   - Org layer (p=25) applies second, overriding 2 patterns
   - Result: 845 warnings (2 suppressed)

### Step 3: Add Site Layer

8. Site Lead creates **Site Layer (p=50)**:
   - Name: "Ann Arbor Datacenter"
   - Scope: Hostname pattern `*-aa-dc1-*`
   - Rules:
     - Suppress "Network latency" warnings (WAN link is known-slow)
     - Tag "Backup failure" as "critical"

9. Only activates for bundles from Ann Arbor datacenter
10. When active: 843 warnings (2 from org + 2 from site)

### Step 4: Add Case-Specific Layer

11. Sarah creates **Case Layer (p=100)**:
    - Name: "Case 700435046 - Voicemail Investigation"
    - Scope: Bundle ID `700435046`
    - Rules:
      - Suppress "Jabber MRA timeout" (200 matches)
      - Tag "Voicemail.*error" as "primary-issue"

12. Highest priority layer for this specific case
13. Final result: 643 warnings (200 more suppressed)

### Step 5: Preview Merged Layers

14. Sarah clicks "Preview Layers" in tree view
15. Preview panel shows layer merge:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer Preview: Case 700435046                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Active Layers (in application order):                       │
│                                                             │
│ 1. 🔵 Base Patterns (p=0)                                   │
│    └─ 847 signatures                                        │
│                                                             │
│ 2. 🟢 Michigan Homes IT (p=25)                              │
│    ├─ 🚫 Suppress: Tomcat idle timeout                     │
│    └─ 📊 Change Severity: CDR file rotation (Warn→Info)    │
│                                                             │
│ 3. 🟢 Ann Arbor Datacenter (p=50)                           │
│    ├─ 🚫 Suppress: Network latency warnings                │
│    └─ 🏷️  Tag: Backup failure → "critical"                 │
│                                                             │
│ 4. 🟡 Case 700435046 (p=100) [STAGED]                       │
│    ├─ 🚫 Suppress: Jabber MRA timeout (200 matches)        │
│    └─ 🏷️  Tag: Voicemail errors → "primary-issue"          │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📊 Merge Result:                                            │
│                                                             │
│ Before: 847 warnings (base only)                            │
│ After:  643 warnings (4 layers merged)                      │
│                                                             │
│ Changes:                                                    │
│ • 204 warnings suppressed                                   │
│ • 1 severity changed                                        │
│ • 2 tag groups added                                        │
│                                                             │
│ Conflicts: None (all priorities unique)                     │
│                                                             │
│               [Cancel]  [Activate Layer]                    │
└─────────────────────────────────────────────────────────────┘
```

16. Sarah reviews and activates Case layer
17. All 4 layers now active, merged by priority

### Step 6: Handle Priority Conflict

**Scenario:** Two layers modify same pattern

18. Sarah creates **User Layer (p=125)**:
    - Suppresses "Database query timeout"
    
19. Team Layer (p=75) already tags "Database query timeout"

20. System detects conflict:
    - Team Layer (p=75): Tag as "db-issue"
    - User Layer (p=125): Suppress
    
21. User Layer wins (higher priority)
22. Pattern is **suppressed** (not tagged)

23. Conflict resolution logged:
    ```
    [2026-02-24 10:15:23] Pattern conflict resolved:
      Pattern: "Database query timeout"
      Winner: User Layer (p=125) - Suppress
      Override: Team Layer (p=75) - Tag
    ```

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Ordered layer application** - Layers applied in priority order (0 → 125)
- ✅ **Higher priority wins** - Conflicts resolved by priority
- ✅ **Delta-only storage** - Only store differences from lower layers
- ✅ **Preview merged result** - See final ruleset before activation
- ✅ **Audit trail** - Track who/when/why for each layer
- ✅ **Composability** - Multiple layers combine cleanly

### User Experience
- ✅ **< 3 seconds** to merge 10 layers
- ✅ **< 100ms** to apply merged layers to 10k diagnostics
- ✅ **Visual priority indication** - Tree view shows layer hierarchy
- ✅ **Clear conflict resolution** - Tooltip explains which layer won
- ✅ **Easy layer management** - Enable/disable any layer

### Technical
- ✅ **Deterministic merge** - Same layers = same result
- ✅ **Efficient** - Cache merged result, invalidate on change
- ✅ **Scalable** - Support 20+ layers without performance hit
- ✅ **Testable** - Unit tests for all merge scenarios

---

## 📊 Acceptance Tests

### Test 1: Layer Application Order
```gherkin
Given base layer (p=0) with pattern "ERROR" → severity=Error
And site layer (p=50) with pattern "ERROR" → severity=Warning
And case layer (p=100) with pattern "ERROR" → severity=Info
When layers are merged
Then final severity is Info (highest priority)
```

### Test 2: Priority Conflict Resolution
```gherkin
Given layer A (p=50) suppresses pattern "timeout"
And layer B (p=100) tags pattern "timeout"
When both layers are active
Then pattern is tagged (layer B wins)
And conflict is logged
```

### Test 3: Delta Storage
```gherkin
Given base layer has 847 patterns
And org layer only modifies 2 patterns
When org layer is saved
Then org layer file contains only 2 rules
And not all 847 patterns (delta-only)
```

### Test 4: Layer Enable/Disable
```gherkin
Given 4 active layers (base, org, site, case)
When user disables site layer
Then remaining 3 layers are re-merged
And patterns revert to pre-site-layer state
```

### Test 5: Preview Accuracy
```gherkin
Given a staged case layer (p=100)
When user previews merged result
Then preview shows exact same result as activation would
And no surprises after activation
```

### Test 6: Audit Trail
```gherkin
Given a pattern is suppressed
When user clicks "Why is this suppressed?"
Then tooltip shows:
  • Layer: "Case 700435046" (p=100)
  • Rule: "suppress-jabber-mra"
  • Author: "sarah@mihomes.com"
  • Date: "2026-02-24 10:15:23"
  • Reason: "Not relevant to voicemail investigation"
```

---

## 🏗️ Technical Implementation

### Data Structure

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
  "state": "active",
  "enabled": true,
  "version": "1.0.0",
  "author": "sarah@mihomes.com",
  "createdAt": "2026-02-24T10:15:23Z",
  "updatedAt": "2026-02-24T10:15:23Z",
  "inheritsFrom": ["base", "org-michigan-homes", "site-ann-arbor"],
  "rules": [
    {
      "id": "suppress-jabber-mra",
      "signature": {
        "type": "regex",
        "pattern": "(?i)jabber.*mra.*timeout"
      },
      "action": {
        "type": "suppress",
        "reason": "Not relevant to voicemail investigation"
      },
      "priority": 1,
      "overrides": null,
      "metadata": {
        "author": "sarah@mihomes.com",
        "createdAt": "2026-02-24T10:15:23Z",
        "context": "Case 700435046"
      }
    }
  ]
}
```

### Layer Manager

```typescript
class LayerManager {
  private layers: Map<string, PatternLayer> = new Map();
  private mergedCache: Map<string, MergedLayer> | null = null;

  /**
   * Load all active layers and merge by priority
   */
  async loadAndMerge(bundleContext: BundleContext): Promise<MergedLayer> {
    // Check cache
    const cacheKey = this.getCacheKey(bundleContext);
    if (this.mergedCache?.has(cacheKey)) {
      return this.mergedCache.get(cacheKey)!;
    }

    // Load all layers
    const allLayers = await this.loadLayers();

    // Filter by scope
    const activeLayers = allLayers.filter(layer => 
      this.scenarioEvaluator.shouldActivate(layer, bundleContext)
    );

    // Sort by priority (ascending)
    const sortedLayers = activeLayers.sort((a, b) => 
      a.priority - b.priority
    );

    // Merge layers
    const merged = this.mergeLayers(sortedLayers);

    // Cache result
    if (!this.mergedCache) {
      this.mergedCache = new Map();
    }
    this.mergedCache.set(cacheKey, merged);

    return merged;
  }

  /**
   * Merge layers in priority order (lower priority first)
   */
  private mergeLayers(layers: PatternLayer[]): MergedLayer {
    const merged: MergedLayer = {
      rules: new Map(),
      conflicts: [],
      metadata: {
        layerCount: layers.length,
        appliedLayers: layers.map(l => l.layerId),
        mergedAt: new Date()
      }
    };

    // Apply each layer in order
    for (const layer of layers) {
      for (const rule of layer.rules) {
        const key = this.getRuleKey(rule.signature);
        
        // Check for conflict
        if (merged.rules.has(key)) {
          const existing = merged.rules.get(key)!;
          merged.conflicts.push({
            pattern: rule.signature.pattern,
            loserLayer: existing.sourceLayer,
            loserPriority: existing.layerPriority,
            winnerLayer: layer.layerId,
            winnerPriority: layer.priority,
            resolvedAction: rule.action.type
          });
        }

        // Higher priority overwrites
        merged.rules.set(key, {
          rule,
          sourceLayer: layer.layerId,
          layerPriority: layer.priority,
          layerName: layer.name,
          layerType: layer.type
        });
      }
    }

    logger.info(
      `Merged ${layers.length} layers: ` +
      `${merged.rules.size} rules, ${merged.conflicts.length} conflicts`
    );

    return merged;
  }

  /**
   * Generate unique key for rule signature
   */
  private getRuleKey(signature: Signature): string {
    return `${signature.type}:${signature.pattern}`;
  }

  /**
   * Invalidate cache when layers change
   */
  invalidateCache() {
    this.mergedCache = null;
    logger.debug('Layer merge cache invalidated');
  }

  /**
   * Preview what merged result would be without activating
   */
  async previewMerge(
    newLayer: PatternLayer,
    bundleContext: BundleContext
  ): Promise<MergePreview> {
    // Get current merged state
    const currentMerged = await this.loadAndMerge(bundleContext);

    // Temporarily add new layer
    const allLayers = await this.loadLayers();
    allLayers.push(newLayer);

    // Re-merge with new layer
    const previewMerged = this.mergeLayers(
      allLayers
        .filter(l => this.scenarioEvaluator.shouldActivate(l, bundleContext))
        .sort((a, b) => a.priority - b.priority)
    );

    // Compare before/after
    return {
      before: {
        ruleCount: currentMerged.rules.size,
        conflicts: currentMerged.conflicts.length
      },
      after: {
        ruleCount: previewMerged.rules.size,
        conflicts: previewMerged.conflicts.length
      },
      changes: this.diffMergedLayers(currentMerged, previewMerged),
      newConflicts: previewMerged.conflicts.filter(c => 
        c.winnerLayer === newLayer.layerId
      )
    };
  }

  /**
   * Get audit trail for a specific rule
   */
  getAuditTrail(ruleKey: string): AuditEntry[] {
    const trail: AuditEntry[] = [];

    for (const layer of this.layers.values()) {
      for (const rule of layer.rules) {
        if (this.getRuleKey(rule.signature) === ruleKey) {
          trail.push({
            layerId: layer.layerId,
            layerName: layer.name,
            layerPriority: layer.priority,
            action: rule.action.type,
            author: layer.author,
            timestamp: layer.updatedAt,
            reason: rule.action.reason
          });
        }
      }
    }

    // Sort by priority (highest first)
    return trail.sort((a, b) => b.layerPriority - a.layerPriority);
  }
}

interface MergedLayer {
  rules: Map<string, MergedRule>;
  conflicts: Conflict[];
  metadata: {
    layerCount: number;
    appliedLayers: string[];
    mergedAt: Date;
  };
}

interface MergedRule {
  rule: Rule;
  sourceLayer: string;
  layerPriority: number;
  layerName: string;
  layerType: LayerType;
}

interface Conflict {
  pattern: string;
  loserLayer: string;
  loserPriority: number;
  winnerLayer: string;
  winnerPriority: number;
  resolvedAction: ActionType;
}

interface MergePreview {
  before: {
    ruleCount: number;
    conflicts: number;
  };
  after: {
    ruleCount: number;
    conflicts: number;
  };
  changes: {
    added: MergedRule[];
    removed: MergedRule[];
    modified: MergedRule[];
  };
  newConflicts: Conflict[];
}

interface AuditEntry {
  layerId: string;
  layerName: string;
  layerPriority: number;
  action: ActionType;
  author: string;
  timestamp: Date;
  reason?: string;
}
```

### Priority-Based Tree View

```typescript
class OverlayTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      // Root: Show layers sorted by priority
      const layers = this.layerManager.getActiveLayers();
      
      return layers
        .sort((a, b) => a.priority - b.priority)
        .map(layer => this.createLayerItem(layer));
    }

    // Child nodes...
  }

  private createLayerItem(layer: PatternLayer): LayerTreeItem {
    const item = new LayerTreeItem(layer);

    // Visual indication of priority
    const priorityRange = this.getPriorityRange(layer.priority);
    
    item.iconPath = new vscode.ThemeIcon(
      this.getIconForPriority(layer.priority),
      new vscode.ThemeColor(this.getColorForPriority(layer.priority))
    );

    item.description = `(p=${layer.priority}) [${layer.state}]`;
    
    item.tooltip = new vscode.MarkdownString(
      `**${layer.name}**\n\n` +
      `Priority: ${layer.priority} (${priorityRange})\n` +
      `Type: ${layer.type}\n` +
      `Rules: ${layer.rules.length}\n` +
      `Author: ${layer.author}\n` +
      `Updated: ${layer.updatedAt}`
    );

    return item;
  }

  private getPriorityRange(priority: number): string {
    if (priority === 0) return 'Base';
    if (priority <= 25) return 'Organization';
    if (priority <= 50) return 'Site';
    if (priority <= 75) return 'Team';
    if (priority <= 100) return 'Case';
    return 'User';
  }

  private getIconForPriority(priority: number): string {
    if (priority === 0) return 'library';
    if (priority <= 50) return 'organization';
    if (priority <= 100) return 'folder';
    return 'person';
  }

  private getColorForPriority(priority: number): string {
    if (priority === 0) return 'charts.blue';
    if (priority <= 50) return 'charts.green';
    if (priority <= 100) return 'charts.yellow';
    return 'charts.purple';
  }
}
```

---

## 🎨 UI Mockups

### Tree View - Layered Hierarchy

```
📦 PATTERN OVERLAYS
├─ 🔵 Base Patterns (p=0) [Active]
│  ├─ Type: Base
│  ├─ Rules: 847 signatures
│  └─ [Read-only]
│
├─ 🟢 Michigan Homes IT (p=25) [Active]
│  ├─ Type: Organization
│  ├─ Rules: 2 overrides
│  ├─ 🚫 Suppress: Tomcat idle timeout
│  └─ 📊 Change: CDR file rotation (Warn→Info)
│
├─ 🟢 Ann Arbor Datacenter (p=50) [Active]
│  ├─ Type: Site
│  ├─ Rules: 2 overrides
│  ├─ 🚫 Suppress: Network latency
│  └─ 🏷️  Tag: Backup failure → critical
│
├─ 🟡 Case 700435046 (p=100) [Staged]
│  ├─ Type: Case
│  ├─ Rules: 2 overrides
│  ├─ 🚫 Suppress: Jabber MRA timeout (200)
│  ├─ 🏷️  Tag: Voicemail errors
│  └─ [Preview Merge] [Activate]
│
└─ 🟣 Sarah's Overrides (p=125) [Draft]
   ├─ Type: User
   ├─ Rules: 1 override
   └─ 🚫 Suppress: Database query timeout
```

### Layer Merge Preview

```
┌─────────────────────────────────────────────────────────────┐
│ Layer Merge Preview                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Merge Summary:                                           │
│                                                             │
│ Active Layers: 4                                            │
│ ├─ Base Patterns (p=0)                                      │
│ ├─ Michigan Homes IT (p=25)                                 │
│ ├─ Ann Arbor Datacenter (p=50)                              │
│ └─ Case 700435046 (p=100) ← NEW                             │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📈 Impact:                                                  │
│                                                             │
│ Before (3 layers):  845 warnings                            │
│ After (4 layers):   643 warnings                            │
│ Change:             -202 warnings (24% reduction)           │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ ⚙️  Changes:                                                │
│                                                             │
│ • 200 patterns suppressed (Jabber MRA timeout)              │
│ • 2 patterns tagged (Voicemail errors)                      │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ ⚠️  Conflicts: None                                         │
│                                                             │
│ ✅ All layers have unique priorities                        │
│                                                             │
│               [Cancel]  [Activate Layer]                    │
└─────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Tooltip

```
Pattern: "Database query timeout"

❌ Conflict Detected

Two layers modify this pattern:

1. Team Layer (p=75)
   Action: Tag as "db-issue"
   Author: teamlead@mihomes.com
   Date: 2026-02-20

2. Sarah's Overrides (p=125) ✅ WINNER
   Action: Suppress
   Author: sarah@mihomes.com
   Date: 2026-02-24

Resolution: Suppressed (higher priority wins)

[View Team Layer] [Edit My Override]
```

---

## 🚀 Implementation Phases

### Phase 1: Core Layer Manager (Week 1)
- [ ] Create `LayerManager` class
- [ ] Implement layer loading from files
- [ ] Build priority-based sorting
- [ ] Write tests for basic operations

### Phase 2: Layer Merging (Week 1-2)
- [ ] Implement `mergeLayers()` function
- [ ] Handle rule conflicts by priority
- [ ] Log conflict resolutions
- [ ] Test with 10+ layers

### Phase 3: Delta Storage (Week 2)
- [ ] Store only rule differences
- [ ] Inherit from lower priority layers
- [ ] Optimize file size
- [ ] Test inheritance chain

### Phase 4: Preview & Diff (Week 3)
- [ ] Build merge preview logic
- [ ] Show before/after comparison
- [ ] Highlight changes and conflicts
- [ ] Test preview accuracy

### Phase 5: UI - Tree View (Week 3)
- [ ] Display layers sorted by priority
- [ ] Show priority-based icons/colors
- [ ] Add layer metadata tooltips
- [ ] Implement expand/collapse

### Phase 6: Audit Trail (Week 4)
- [ ] Track rule provenance
- [ ] Show which layer contributed which rule
- [ ] Display author/timestamp
- [ ] Build audit history view

### Phase 7: Cache & Performance (Week 4)
- [ ] Implement merge result caching
- [ ] Invalidate cache on layer changes
- [ ] Optimize for 20+ layers
- [ ] Performance test (<100ms merge)

---

## 📊 Success Metrics

### Developer Metrics
- ✅ < 100ms to merge 20 layers
- ✅ < 10ms for cached merge lookups
- ✅ 100% deterministic merging
- ✅ Zero memory leaks in cache

### User Metrics
- ✅ 90% of teams use 3+ layer types
- ✅ Average 5-7 active layers per bundle
- ✅ 85% preview before activating new layer
- ✅ < 5% conflict rate (good priority design)

### Business Impact
- ✅ Flexible pattern customization at all levels
- ✅ No modification of shipped patterns needed
- ✅ Clear organizational pattern governance
- ✅ Improved collaboration across teams

---

## 🔗 Related Documentation

- **Scenario 13:** Pattern Overlays - Gradual Rollout (scenario conditions)
- **Scenario 14:** Pattern Overlays - Hostname-Specific (scenario conditions)
- **Scenario 16:** Pattern Overlays - State Lifecycle (layer states)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Architecture)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 1)

---

## 📝 Notes

### Design Decisions

1. **Why 6 priority ranges?** - Covers all organizational levels without gaps
2. **Why delta-only storage?** - Reduces file size, clarifies intent (only changes)
3. **Why cached merging?** - Merge is expensive, most bundles use same layers
4. **Why conflict logging?** - Transparency helps users understand behavior

### Priority Range Guidelines

**Base (0):** Shipped patterns, never modified
**Organization (25):** Company-wide policies
**Site (50):** Location-specific (datacenter, region)
**Team (75):** Department or team preferences  
**Case (100):** Investigation-specific overrides
**User (125):** Personal preferences (highest priority)

### Edge Cases

- **Same priority** - Use layer name alphabetically as tiebreaker
- **Gaps in priorities** - Allowed (e.g., 0, 50, 100 without 25, 75)
- **Priority >125** - Allowed but discouraged (reserve for emergencies)
- **Priority <0** - Not allowed, validation error
- **Circular inheritance** - Detect and reject (DAG validation)

### Future Enhancements

- **Layer groups** - Logical grouping of related layers
- **Inheritance visualization** - Graph view of layer dependencies
- **Smart conflicts** - Suggest priority adjustments to resolve conflicts
- **Import/export layer sets** - Share entire layer hierarchies
- **Layer templates** - Start from predefined layer structures

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 1)  
**Assigned To:** TBD