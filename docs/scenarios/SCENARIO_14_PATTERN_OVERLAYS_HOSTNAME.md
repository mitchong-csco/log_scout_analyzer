# Scenario 14: Pattern Overlays - Hostname-Specific Rules 📋

**Status:** 📋 Planned  
**Priority:** Medium  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, our publisher server has unique error patterns that don't apply to subscriber servers. I need hostname-specific overlays."*

---

## 📖 Context

Sarah's Cisco UC cluster has different server types with distinct roles:

- **Publisher Server** (`uc-cucm-pub1.mihomes.com`)
  - Manages database writes
  - Runs administrative processes
  - Handles configuration changes
  - Has unique error patterns related to DB replication

- **Subscriber Servers** (`uc-cucm-sub[1-4].mihomes.com`)
  - Read-only database replicas
  - Handle call processing
  - Different performance characteristics
  - Different error patterns than publisher

The same pattern appearing in publisher vs. subscriber logs has different meanings:
- **"Database replication lag"** on publisher → normal during bulk updates
- **"Database replication lag"** on subscriber → critical issue

Sarah needs **hostname-specific overlays** that:
- Only activate when analyzing logs from specific servers
- Support wildcard patterns for server groups
- Allow device-type filtering (publisher, subscriber, TFTP, IM&P)
- Clearly indicate when overlay is active/inactive

---

## 🎬 Target User Flow

### Step 1: Identify Hostname-Specific Pattern

1. Sarah opens RTMT bundle from publisher server
2. Sees 45 "Database replication lag" warnings
3. These are normal for publisher during nightly maintenance
4. Same warnings on subscriber would be critical

### Step 2: Create Hostname-Specific Overlay

5. Sarah creates new overlay: "Publisher DB Warnings"
6. Opens **Scenario Conditions** dialog:

```
┌─────────────────────────────────────────────────┐
│ Overlay Scenario Conditions                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Activation Strategy:                            │
│ ● Hostname-based (Specific Servers)            │
│ ○ Always Active                                 │
│ ○ Gradual Rollout                               │
│ ○ Time-window based                             │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ Hostname Configuration:                         │
│                                                 │
│ Match Hostnames (one per line):                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ uc-cucm-pub1.mihomes.com                    │ │
│ │ uc-cucm-pub-dr.mihomes.com                  │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ☑ Support wildcards (* and ?)                  │
│   Example: uc-cucm-pub*.mihomes.com            │
│                                                 │
│ Device Types:                                   │
│ ☑ Publisher                                     │
│ ☐ Subscriber                                    │
│ ☐ TFTP Server                                   │
│ ☐ IM&P Server                                   │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ 📊 Preview:                                     │
│                                                 │
│ Current Bundle:                                 │
│   Hostname: uc-cucm-pub1.mihomes.com            │
│   Device Type: Publisher                        │
│   ✅ This overlay WILL activate                 │
│                                                 │
│        [Test Pattern]  [Cancel]  [Save]         │
└─────────────────────────────────────────────────┘
```

7. Sarah configures:
   - **Hostnames:** `uc-cucm-pub*.mihomes.com`
   - **Device Types:** Publisher only
   - Pattern matches current bundle ✅

### Step 3: Define Suppression Rule

8. Sarah adds rule to suppress normal publisher warnings:

```json
{
  "signature": {
    "type": "regex",
    "pattern": "(?i)database replication lag detected"
  },
  "action": {
    "type": "suppress",
    "reason": "Normal for publisher during maintenance window"
  }
}
```

### Step 4: Activate and Test

9. Sarah activates overlay in current bundle (publisher)
10. Tree view shows:

```
📦 PATTERN OVERLAYS
└─ 🟢 Publisher DB Warnings (p=50) [Active]
   ├─ 🎯 Scope: Hostname-specific
   │  ├─ Matches: uc-cucm-pub*.mihomes.com
   │  ├─ Device Type: Publisher
   │  └─ ✅ Active for current bundle
   └─ 🚫 1 suppression (45 matches)
```

11. 45 warnings disappear from Problems Panel

### Step 5: Verify Scope Isolation

12. Sarah opens different bundle from subscriber server
13. Tree view updates:

```
📦 PATTERN OVERLAYS
└─ ⚪ Publisher DB Warnings (p=50) [Inactive - Scope Mismatch]
   ├─ 🎯 Scope: Hostname-specific
   │  ├─ Matches: uc-cucm-pub*.mihomes.com
   │  ├─ Device Type: Publisher
   │  └─ ❌ NOT active for current bundle
   │     (hostname: uc-cucm-sub2.mihomes.com)
   └─ 🚫 1 suppression (would match 45, but inactive)
```

14. If subscriber bundle has "Database replication lag" warnings:
    - They are NOT suppressed (overlay inactive)
    - They appear in Problems Panel as critical issues ✅

### Step 6: Create Complementary Subscriber Overlay

15. Sarah creates matching overlay for subscribers:
    - **Name:** "Subscriber DB Warnings"
    - **Hostnames:** `uc-cucm-sub*.mihomes.com`
    - **Device Types:** Subscriber
    - **Action:** Tag as "critical-db-issue" (not suppress)

16. Now Sarah has:
    - Publisher overlay → suppresses (normal behavior)
    - Subscriber overlay → tags as critical (requires attention)

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Hostname-based activation** - Overlay only active for matching hostnames
- ✅ **Device-type filtering** - Can restrict to specific UC server types
- ✅ **Wildcard support** - Patterns like `uc-cucm-pub*.mihomes.com`
- ✅ **Clear indication** - Visual status shows why overlay is active/inactive
- ✅ **Multiple hostnames** - Support list of hostname patterns
- ✅ **Regex support** - Advanced pattern matching for complex naming

### User Experience
- ✅ **< 5 clicks** to create hostname-specific overlay
- ✅ **Visual feedback** - Clear indicator when overlay doesn't match
- ✅ **Test before save** - Preview which bundles will match
- ✅ **Easy debugging** - Show why overlay didn't activate

### Technical
- ✅ **Fast matching** - < 1ms to check hostname patterns
- ✅ **Cached results** - Don't re-check on every log line
- ✅ **Case-insensitive** - Handle hostname case variations
- ✅ **FQDN support** - Match both short names and fully qualified

---

## 📊 Acceptance Tests

### Test 1: Exact Hostname Match
```gherkin
Given an overlay with hostname "uc-cucm-pub1.mihomes.com"
When a bundle with hostname "uc-cucm-pub1.mihomes.com" is opened
Then the overlay activates
And patterns are applied
```

### Test 2: Wildcard Match
```gherkin
Given an overlay with hostname pattern "uc-cucm-pub*.mihomes.com"
When bundles are opened with hostnames:
  - "uc-cucm-pub1.mihomes.com"
  - "uc-cucm-pub2.mihomes.com"
  - "uc-cucm-pub-dr.mihomes.com"
Then the overlay activates for all three
```

### Test 3: Wildcard No Match
```gherkin
Given an overlay with hostname pattern "uc-cucm-pub*.mihomes.com"
When a bundle with hostname "uc-cucm-sub1.mihomes.com" is opened
Then the overlay does NOT activate
And tree view shows "Inactive - Scope Mismatch"
```

### Test 4: Device Type Filter
```gherkin
Given an overlay with:
  - Hostname: "*" (all)
  - Device Type: "Publisher"
When a bundle from a Subscriber server is opened
Then the overlay does NOT activate
Even if hostname pattern matches
```

### Test 5: Multiple Hostname Patterns
```gherkin
Given an overlay with hostnames:
  - "uc-cucm-pub1.mihomes.com"
  - "uc-cucm-pub-dr.mihomes.com"
When a bundle from "uc-cucm-pub-dr.mihomes.com" is opened
Then the overlay activates (OR logic between patterns)
```

### Test 6: Case Insensitive
```gherkin
Given an overlay with hostname "UC-CUCM-PUB1.mihomes.com"
When a bundle with hostname "uc-cucm-pub1.MIHOMES.COM" is opened
Then the overlay activates (case-insensitive match)
```

### Test 7: Short Name vs FQDN
```gherkin
Given an overlay with hostname "uc-cucm-pub1"
When a bundle logs contain "uc-cucm-pub1.mihomes.com"
Then the overlay activates (partial match)
```

### Test 8: Visual Feedback
```gherkin
Given an overlay scoped to "uc-cucm-pub1.mihomes.com"
When a bundle from "uc-cucm-sub2.mihomes.com" is opened
Then tree view shows overlay with:
  - Gray/disabled icon
  - Status: "Inactive - Scope Mismatch"
  - Tooltip: "Overlay requires hostname: uc-cucm-pub1.mihomes.com"
```

---

## 🏗️ Technical Implementation

### Data Structure (JSON)

```json
{
  "layerId": "overlay-publisher-db-warnings",
  "name": "Publisher DB Warnings",
  "type": "site",
  "priority": 50,
  "scope": {
    "level": "global"
  },
  "state": "active",
  "enabled": true,
  "scenario": {
    "type": "hostname-based",
    "hostnames": [
      "uc-cucm-pub1.mihomes.com",
      "uc-cucm-pub-dr.mihomes.com",
      "uc-cucm-pub*.mihomes.com"
    ],
    "deviceTypes": ["publisher"],
    "matchMode": "any"
  },
  "rules": [
    {
      "id": "suppress-pub-db-lag",
      "signature": {
        "type": "regex",
        "pattern": "(?i)database replication lag detected"
      },
      "action": {
        "type": "suppress",
        "reason": "Normal for publisher during maintenance"
      }
    }
  ]
}
```

### Scenario Type Definition

```typescript
interface HostnameScenario {
  type: 'hostname-based';
  
  // Hostname patterns (supports wildcards)
  hostnames?: string[];
  
  // Device type filter
  deviceTypes?: DeviceType[];
  
  // Match logic: 'any' (OR) or 'all' (AND)
  matchMode?: 'any' | 'all';
  
  // Case-sensitive matching
  caseSensitive?: boolean;
  
  // Match short names or require FQDN
  requireFQDN?: boolean;
}

type DeviceType = 
  | 'publisher'
  | 'subscriber'
  | 'tftp'
  | 'imp'
  | 'presence'
  | 'unity-connection'
  | 'expressway'
  | 'unknown';

interface BundleMetadata {
  hostname: string;
  deviceType: DeviceType;
  ipAddress?: string;
  version?: string;
}
```

### Code Flow

```typescript
// 1. Scenario Evaluator - Hostname Check
class ScenarioEvaluator {
  shouldActivate(
    overlay: PatternLayer,
    bundleMetadata: BundleMetadata
  ): boolean {
    if (!overlay.scenario) {
      return true; // No conditions = always active
    }
    
    const scenario = overlay.scenario;
    
    if (scenario.type === 'hostname-based') {
      return this.checkHostnameMatch(scenario, bundleMetadata);
    }
    
    return true;
  }
  
  private checkHostnameMatch(
    scenario: HostnameScenario,
    metadata: BundleMetadata
  ): boolean {
    // Check device type first (fast filter)
    if (scenario.deviceTypes && scenario.deviceTypes.length > 0) {
      if (!scenario.deviceTypes.includes(metadata.deviceType)) {
        logger.debug(
          `Device type mismatch: expected ${scenario.deviceTypes}, ` +
          `got ${metadata.deviceType}`
        );
        return false;
      }
    }
    
    // If no hostname patterns, device type check is sufficient
    if (!scenario.hostnames || scenario.hostnames.length === 0) {
      return true;
    }
    
    // Check hostname patterns
    const hostname = scenario.caseSensitive 
      ? metadata.hostname 
      : metadata.hostname.toLowerCase();
    
    const matches = scenario.hostnames.map(pattern => {
      const normalizedPattern = scenario.caseSensitive
        ? pattern
        : pattern.toLowerCase();
      
      return this.hostnameMatches(hostname, normalizedPattern);
    });
    
    // Apply match mode (any = OR, all = AND)
    const result = scenario.matchMode === 'all'
      ? matches.every(m => m)
      : matches.some(m => m);
    
    logger.debug(
      `Hostname match: hostname=${hostname}, ` +
      `patterns=${scenario.hostnames}, result=${result}`
    );
    
    return result;
  }
  
  private hostnameMatches(hostname: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    // * = match any characters
    // ? = match single character
    const regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots
      .replace(/\*/g, '.*')    // * → .*
      .replace(/\?/g, '.');    // ? → .
    
    const regex = new RegExp(`^${regexPattern}$`);
    
    // Try exact match
    if (regex.test(hostname)) {
      return true;
    }
    
    // Try partial match (short name vs FQDN)
    // e.g., pattern "uc-cucm-pub1" matches "uc-cucm-pub1.mihomes.com"
    if (hostname.startsWith(pattern + '.')) {
      return true;
    }
    
    return false;
  }
}

// 2. Bundle Metadata Extractor
class BundleMetadataExtractor {
  extract(bundle: Bundle): BundleMetadata {
    // Extract hostname from log file headers
    const hostname = this.extractHostname(bundle);
    
    // Infer device type from hostname or log patterns
    const deviceType = this.inferDeviceType(hostname, bundle);
    
    return {
      hostname,
      deviceType,
      ipAddress: this.extractIPAddress(bundle),
      version: this.extractVersion(bundle)
    };
  }
  
  private extractHostname(bundle: Bundle): string {
    // Common patterns in RTMT logs:
    // "Hostname: uc-cucm-pub1.mihomes.com"
    // "Host=uc-cucm-sub2.mihomes.com"
    // File path: /uc-cucm-pub1/logs/...
    
    for (const file of bundle.files) {
      const lines = file.content.split('\n').slice(0, 50); // First 50 lines
      
      for (const line of lines) {
        // Try various patterns
        const patterns = [
          /Hostname:\s*([^\s,]+)/i,
          /Host\s*=\s*([^\s,]+)/i,
          /Server:\s*([^\s,]+)/i,
          /Node:\s*([^\s,]+)/i
        ];
        
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
      }
    }
    
    // Fallback: extract from bundle directory name
    const dirName = bundle.path.split('/').find(p => 
      p.includes('cucm') || p.includes('unity')
    );
    
    return dirName || 'unknown';
  }
  
  private inferDeviceType(hostname: string, bundle: Bundle): DeviceType {
    const lower = hostname.toLowerCase();
    
    // Check hostname patterns
    if (lower.includes('pub')) return 'publisher';
    if (lower.includes('sub')) return 'subscriber';
    if (lower.includes('tftp')) return 'tftp';
    if (lower.includes('imp') || lower.includes('presence')) return 'imp';
    if (lower.includes('unity') || lower.includes('cuc')) return 'unity-connection';
    if (lower.includes('expressway') || lower.includes('exp')) return 'expressway';
    
    // Check log content for clues
    // Publisher typically has DB master logs
    const hasDbMasterLogs = bundle.files.some(f => 
      f.content.includes('DB Master') || 
      f.content.includes('database master')
    );
    if (hasDbMasterLogs) return 'publisher';
    
    return 'unknown';
  }
}

// 3. Tree View - Scope Status Indicator
class OverlayTreeItem extends vscode.TreeItem {
  constructor(
    public overlay: PatternLayer,
    public bundleMetadata: BundleMetadata,
    public evaluator: ScenarioEvaluator
  ) {
    super(overlay.name, vscode.TreeItemCollapsibleState.Collapsed);
    
    const isActive = evaluator.shouldActivate(overlay, bundleMetadata);
    
    if (isActive) {
      this.iconPath = new vscode.ThemeIcon('check', 
        new vscode.ThemeColor('testing.iconPassed'));
      this.description = `[Active]`;
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-slash',
        new vscode.ThemeColor('testing.iconSkipped'));
      this.description = `[Inactive - Scope Mismatch]`;
      
      // Build detailed tooltip
      const reason = this.buildInactiveReason(overlay, bundleMetadata);
      this.tooltip = `Overlay is inactive\n\n${reason}`;
    }
  }
  
  private buildInactiveReason(
    overlay: PatternLayer,
    metadata: BundleMetadata
  ): string {
    const scenario = overlay.scenario as HostnameScenario;
    const reasons: string[] = [];
    
    if (scenario.hostnames) {
      reasons.push(
        `Requires hostname: ${scenario.hostnames.join(' OR ')}\n` +
        `Current bundle: ${metadata.hostname}`
      );
    }
    
    if (scenario.deviceTypes) {
      reasons.push(
        `Requires device type: ${scenario.deviceTypes.join(' OR ')}\n` +
        `Current bundle: ${metadata.deviceType}`
      );
    }
    
    return reasons.join('\n\n');
  }
}
```

---

## 🎨 UI Mockups

### Hostname Configuration Dialog

```
┌─────────────────────────────────────────────────┐
│ Hostname-Based Activation                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ Hostname Patterns:                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ uc-cucm-pub1.mihomes.com                    │ │
│ │ uc-cucm-pub*.mihomes.com                    │ │
│ │ uc-cucm-pub-dr.*                            │ │
│ └─────────────────────────────────────────────┘ │
│ [+ Add Pattern]                                 │
│                                                 │
│ ℹ️  Wildcards: * = any chars, ? = single char   │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ Device Types:                                   │
│ ☑ Publisher    ☐ Subscriber   ☐ TFTP          │
│ ☐ IM&P         ☐ Unity Conn   ☐ Expressway    │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ Current Bundle Test:                            │
│ 📄 Hostname: uc-cucm-pub1.mihomes.com           │
│ 🖥️  Device: Publisher                           │
│ ✅ This overlay WILL activate                   │
│                                                 │
│        [Test with Another Bundle]  [Save]       │
└─────────────────────────────────────────────────┘
```

### Tree View - Active Overlay

```
📦 PATTERN OVERLAYS
└─ 🟢 Publisher DB Warnings (p=50) [Active]
   ├─ 🎯 Activation Scope:
   │  ├─ Type: Hostname-based
   │  ├─ Hostnames: uc-cucm-pub*.mihomes.com
   │  ├─ Device Type: Publisher
   │  └─ Status: ✅ MATCHES current bundle
   │     (uc-cucm-pub1.mihomes.com)
   └─ 🚫 1 suppression rule
      └─ 45 warnings suppressed
```

### Tree View - Inactive Overlay

```
📦 PATTERN OVERLAYS
└─ ⚪ Publisher DB Warnings (p=50) [Inactive]
   ├─ 🎯 Activation Scope:
   │  ├─ Type: Hostname-based
   │  ├─ Hostnames: uc-cucm-pub*.mihomes.com
   │  ├─ Device Type: Publisher
   │  └─ Status: ❌ DOES NOT MATCH current bundle
   │     Current: uc-cucm-sub2.mihomes.com (Subscriber)
   │     [Why?] [Test] [Edit Scope]
   └─ 🚫 1 suppression rule (inactive)
```

---

## 🚀 Implementation Phases

### Phase 1: Hostname Extraction (Week 6)
- [ ] Build `BundleMetadataExtractor` class
- [ ] Extract hostname from log headers
- [ ] Infer device type from patterns
- [ ] Test with real RTMT bundles

### Phase 2: Hostname Matching (Week 6)
- [ ] Implement wildcard pattern matching
- [ ] Add case-insensitive comparison
- [ ] Support short name vs FQDN matching
- [ ] Write tests for edge cases

### Phase 3: Scenario Evaluation (Week 7)
- [ ] Add hostname check to `ScenarioEvaluator`
- [ ] Implement device type filtering
- [ ] Add match mode logic (any/all)
- [ ] Performance test (<1ms per check)

### Phase 4: UI - Configuration Dialog (Week 7)
- [ ] Build hostname pattern input UI
- [ ] Add device type checkboxes
- [ ] Implement "test with bundle" feature
- [ ] Show real-time match preview

### Phase 5: UI - Tree View Status (Week 7)
- [ ] Add active/inactive icons
- [ ] Show scope mismatch reasons
- [ ] Implement "Why?" explanation dialog
- [ ] Add quick edit actions

### Phase 6: Testing & Polish (Week 8)
- [ ] Test with various hostname formats
- [ ] Test device type detection accuracy
- [ ] Add comprehensive error handling
- [ ] Write user documentation

---

## 📊 Success Metrics

### Developer Metrics
- ✅ < 1ms to check hostname match
- ✅ 95%+ accuracy in device type detection
- ✅ 100% test coverage for pattern matching
- ✅ Zero false positives in matching

### User Metrics
- ✅ 70% of teams use hostname-specific overlays
- ✅ Average 2-3 hostname overlays per deployment
- ✅ < 30 seconds to create hostname overlay
- ✅ 90% find scope status "very helpful"

### Business Impact
- ✅ Accurate server-specific pattern handling
- ✅ Reduced false positives from wrong-server patterns
- ✅ Better multi-server deployment support
- ✅ Improved pattern reusability across sites

---

## 🔗 Related Documentation

- **Scenario 13:** Pattern Overlays - Gradual Rollout (related scenario type)
- **Scenario 15:** Pattern Overlays - Layer Priority (architecture)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Scenario section)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 6)

---

## 📝 Notes

### Design Decisions
1. **Why wildcards over regex?** - Simpler for users, covers 99% of use cases
2. **Why device type filter?** - Hostname patterns alone can be ambiguous
3. **Why case-insensitive by default?** - DNS hostnames are case-insensitive
4. **Why support short names?** - Logs often contain partial hostnames

### Hostname Patterns in UC Environments

**Common Naming Conventions:**
- **Publisher:** `uc-cucm-pub1`, `cucm-pub`, `ccm-pub-01`
- **Subscriber:** `uc-cucm-sub[1-4]`, `cucm-sub`, `ccm-sub-01`
- **TFTP:** `uc-tftp[1-2]`, `tftp-server`
- **IM&P:** `uc-imp1`, `im-presence`
- **Unity Connection:** `uc-cuc1`, `unity-conn`

**Wildcard Examples:**
- `uc-cucm-pub*` → Matches all publisher servers
- `uc-cucm-sub[1-4]*` → Matches sub1, sub2, sub3, sub4
- `*-pub-*` → Matches any publisher in any naming scheme
- `uc-cucm-*.mihomes.com` → Matches all CUCM servers at domain

### Edge Cases
- **Multiple hostnames in bundle** - Use first detected, warn if inconsistent
- **Hostname not found** - Default to "unknown", log warning
- **FQDN vs short name** - Try both matches, prefer longer match
- **IPv6 addresses** - Treat as string patterns, support wildcards
- **Cluster name vs node name** - Extract node-specific hostname

### Future Enhancements
- **IP address matching** - Match by subnet (e.g., 10.1.*.*)
- **Cluster-aware** - Match all nodes in a cluster
- **Geographic filters** - Match by datacenter location
- **Auto-detection** - Suggest patterns based on bundle analysis
- **Import from CUCM** - Auto-discover cluster topology

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 6)  
**Assigned To:** TBD