# Pattern Overlays - User Scenarios & Design 🎨

## 📖 What Are Pattern Overlays?

**Pattern Overlays** are ordered, composable layers of pattern rules that apply delta changes on top of base patterns. Think of them like CSS layers or Git branches - each layer modifies behavior without changing the foundation.

### Core Concept

```
Base Patterns (shipped)
  ↓
+ Organization Layer (company rules)
  ↓
+ Site Layer (datacenter specific)
  ↓
+ Team Layer (team preferences)
  ↓
+ Case Layer (investigation specific)
  ↓
+ User Layer (personal overrides)
  ↓
= Final Effective Patterns
```

---

## 🎯 User Scenarios

### Scenario 1: Suppress Noisy Warnings for Specific Bundle

**User:** Sarah, Cisco UC Engineer  
**Context:** Investigating voicemail issue in case 700435046  
**Problem:** 200+ "Jabber MRA timeout" warnings are normal noise in this environment

**User Flow:**

1. **Sarah opens RTMT bundle**
   - Problems Panel shows 847 warnings
   - 200 are "Jabber MRA timeout" (not relevant)

2. **Sarah creates overlay**
   - Right-clicks warning → "Create Pattern Overlay"
   - Selects: "Suppress Pattern"

3. **Sarah configures layer**
   ```
   Layer Name: Case 700435046 - Voicemail Fix
   Scope: This bundle only
   Priority: 100
   State: Staged (preview first)
   ```

4. **Preview shows impact**
   ```
   Before: 847 warnings
   After:  647 warnings (200 suppressed)
   ```

5. **Sarah activates**
   - Changes state: Staged → Active
   - Warnings disappear
   - Layer saved: `.vscode/scout-overlays/case-700435046.json`

6. **Sarah shares with team**
   - Commits overlay to git
   - Team members auto-load same suppression rules

**Success Criteria:**
- ✅ Warnings suppressed without modifying base patterns
- ✅ Only affects this bundle
- ✅ Team can share overlay
- ✅ Easy to disable/rollback

---

### Scenario 2: Tag Custom Error Categories

**User:** Sarah  
**Context:** Need to group all voicemail-related errors  
**Problem:** Base patterns don't have voicemail-specific tags

**User Flow:**

1. **Sarah creates tagging overlay**
   ```
   Layer: Voicemail Error Tagging
   Scope: All bundles
   Priority: 75 (team level)
   ```

2. **Adds signature rule**
   ```json
   {
     "id": "sig-vm-001",
     "signature": {
       "type": "regex",
       "pattern": "(?i)voicemail.*(error|fail|timeout|not.*notify)"
     },
     "action": {
       "type": "tag",
       "tags": ["voicemail-issue", "priority-high"]
     }
   }
   ```

3. **Activates layer**
   - All voicemail errors now tagged
   - Tags appear in Results tree view
   - Can filter by tag

4. **Sarah filters & exports**
   - Clicks tag "voicemail-issue" → 47 results
   - Groups by severity
   - Exports to TAC case

**Success Criteria:**
- ✅ Custom tags applied dynamically
- ✅ Tags don't modify log files
- ✅ Can filter/group by tag
- ✅ Export includes tags

---

### Scenario 3: Extract Metrics from Logs

**User:** Sarah  
**Context:** Finding slow database queries  
**Problem:** Need to extract response times and query types

**User Flow:**

1. **Sarah creates extraction overlay**
   ```
   Layer: Database Performance Analysis
   Scope: Bundle 700435046
   Priority: 100
   ```

2. **Adds extraction signature**
   ```json
   {
     "signature": {
       "type": "regex",
       "pattern": "Database query completed in (?P<duration>\\d+)ms for (?P<query_type>\\w+)"
     },
     "action": {
       "type": "extract",
       "fields": {
         "duration": "integer",
         "query_type": "string"
       }
     }
   }
   ```

3. **Views extracted data**
   - Results tree shows grouped by `query_type`
   - SELECT: avg 450ms (234 queries)
   - UPDATE: avg 1200ms (89 queries)
   - DELETE: avg 340ms (12 queries)

4. **Identifies bottleneck**
   - Sees UPDATE queries > 1000ms
   - Exports slow queries to CSV
   - Shares with database team

**Success Criteria:**
- ✅ Regex capture groups → structured fields
- ✅ Fields available for aggregation
- ✅ Can sort/filter by extracted values
- ✅ Export to CSV with fields

---

### Scenario 4: Hostname-Specific Rules

**User:** Sarah  
**Context:** Publisher server has unique patterns  
**Problem:** Some errors only matter on publisher, not subscribers

**User Flow:**

1. **Sarah creates publisher-specific overlay**
   ```json
   {
     "layerId": "publisher-db-warnings",
     "name": "Publisher Database Warnings",
     "priority": 50,
     "scenario": {
       "hostnames": ["uc-cucm-pub1.mihomes.com"],
       "deviceTypes": ["publisher"]
     }
   }
   ```

2. **Adds publisher-only signatures**
   - "Database replication lag" → Error (critical on publisher)
   - "Subscriber sync timeout" → Warning (expected on publisher)

3. **Layer activates conditionally**
   - Publisher logs: layer active, rules applied
   - Subscriber logs: layer inactive, skipped

**Success Criteria:**
- ✅ Hostname pattern matching
- ✅ Device type filtering
- ✅ Clear indicator when layer is active
- ✅ Wildcard hostname support (*.mihomes.com)

---

### Scenario 5: Layer Priority & Inheritance

**User:** Engineering team  
**Context:** Multiple teams need different rule priorities  
**Problem:** Need clear precedence order

**Layer Hierarchy:**

```
Priority 0:   Base Patterns (shipped with extension)
Priority 25:  Organization (company-wide, IT admin)
Priority 50:  Site (datacenter/region, site lead)
Priority 75:  Team (team preferences, team lead)
Priority 100: Case (investigation-specific, engineer)
Priority 125: User (personal overrides, individual)
```

**Example Conflict Resolution:**

```
Base (p=0):    "Jabber MRA timeout" → Warning
Site (p=50):   "Jabber MRA timeout" → Info (less noisy at HQ)
Case (p=100):  "Jabber MRA timeout" → Suppress (not relevant)

Final Result: Suppressed (highest priority wins)
```

**User Flow:**

1. **IT Admin creates org layer** (p=25)
   - Company-wide suppressions
   - Committed to company repo

2. **Site Lead creates site layer** (p=50)
   - Datacenter-specific rules
   - Overrides org defaults

3. **Sarah creates case layer** (p=100)
   - Investigation-specific
   - Overrides everything below

4. **Preview merged result**
   - System shows effective rules after merge
   - Highlights conflicts and resolution

**Success Criteria:**
- ✅ Clear priority order
- ✅ Higher priority wins conflicts
- ✅ Can preview final merged result
- ✅ Audit trail (which layer set this rule)

---

### Scenario 6: State Lifecycle & Rollback

**User:** Sarah  
**Context:** Testing new pattern changes safely  
**Problem:** Need draft → test → activate → rollback flow

**State Machine:**

```
Draft → Staged → Active → Deprecated → Archived
  ↑                          ↓
  └──────── Rollback ────────┘
```

**User Flow:**

1. **Sarah creates layer in Draft state**
   ```
   State: Draft
   Version: 1.0
   Author: sarah@company.com
   Created: 2026-02-24 10:30
   ```

2. **Edits rules, tests locally**
   - Adds/removes signatures
   - Adjusts priorities
   - State remains Draft (not affecting results)

3. **Promotes to Staged**
   - Preview panel shows before/after
   - "847 warnings → 647 warnings (-200)"
   - No actual changes yet

4. **Reviews preview, activates**
   - State: Staged → Active
   - Version: 1.0 → 1.1
   - Rules now affect all analyses

5. **Issue found, needs rollback**
   - Sarah disables layer (Active → Draft)
   - Or reverts to previous version
   - Changes take effect immediately

6. **Case closed, deprecate layer**
   - State: Active → Deprecated
   - Warning shown: "This layer will be archived in 30 days"
   - After 30 days: auto-archived

**Success Criteria:**
- ✅ Clear state transitions
- ✅ Preview before activation
- ✅ Quick enable/disable toggle
- ✅ Version history
- ✅ Automatic cleanup

---

### Scenario 7: Gradual Rollout (Enterprise)

**User:** Team Lead  
**Context:** Testing risky pattern changes  
**Problem:** Need to roll out to 10% of users first

**User Flow:**

1. **Team lead creates new detection layer**
   ```json
   {
     "name": "Database Timeout Detection v2",
     "scenario": {
       "rolloutPercent": 10,
       "sampleSet": "random-deterministic",
       "timeWindow": {
         "from": "2026-02-24",
         "to": "2026-03-03"
       }
     }
   }
   ```

2. **Layer activates for 10% of users**
   - Deterministic sampling (same users each time)
   - Based on user hash or machine ID

3. **Monitor results for 1 week**
   - Check metrics dashboard
   - Review feedback from beta users

4. **Gradually increase rollout**
   - Week 1: 10%
   - Week 2: 25%
   - Week 3: 50%
   - Week 4: 100%

5. **Rollback if issues**
   - Set rolloutPercent: 0
   - Immediate deactivation for all users

**Success Criteria:**
- ✅ Percentage-based activation
- ✅ Deterministic sampling
- ✅ Time-window constraints
- ✅ Easy rollback
- ✅ Metrics/telemetry integration

---

## 🏗️ Architecture

### Layer Structure

```typescript
interface PatternLayer {
  // Identity
  layerId: string;           // "overlay-42"
  name: string;              // "Case 700435046 - Voicemail Fix"
  type: LayerType;           // "base" | "org" | "site" | "team" | "case" | "user"
  
  // Scope & Activation
  scope: Scope;              // What this layer applies to
  priority: number;          // 0-125, higher wins conflicts
  enabled: boolean;          // Quick on/off toggle
  
  // Lifecycle
  state: State;              // "draft" | "staged" | "active" | "deprecated" | "archived"
  version: string;           // "1.2.3"
  
  // Metadata
  author: string;            // "sarah@company.com"
  createdAt: string;         // ISO 8601
  updatedAt: string;
  
  // Activation Conditions
  scenario?: Scenario;       // When to activate this layer
  
  // Rules
  rules: Rule[];             // Ordered list of pattern rules
}
```

### Scope

```typescript
interface Scope {
  level: "global" | "bundle" | "file" | "selection";
  id?: string;               // Bundle ID, file path, etc.
}
```

### Scenario (Activation Conditions)

```typescript
interface Scenario {
  // Device/Bundle filtering
  hostnames?: string[];           // ["uc-cucm-pub1.mihomes.com", "*.mihomes.com"]
  deviceTypes?: DeviceType[];     // ["publisher", "subscriber", "tftp"]
  bundleIds?: string[];           // ["700435046", "700435047"]
  
  // Time constraints
  timeWindow?: {
    from: string;                 // ISO 8601
    to: string;
  };
  
  // Gradual rollout
  rolloutPercent?: number;        // 0-100
  sampleSet?: "random" | "random-deterministic" | "first-n";
  
  // Product/Version
  productVersions?: string[];     // ["CUCM 12.5", "CUCM 14.0"]
}
```

### Rule

```typescript
interface Rule {
  id: string;                // "sig-001"
  signature: Signature;      // What to match
  action: Action;            // What to do
  priority: number;          // Within layer priority
  state: State;              // Can be draft while layer is active
  notes?: string;            // Human-readable description
}
```

### Signature

```typescript
interface Signature {
  type: "regex" | "token" | "multiline" | "ast";
  pattern: string;           // Regex pattern or token sequence
  flags?: string;            // "i" for case-insensitive, etc.
  label?: string;            // Optional human-readable label
  severity?: Severity;       // Override base severity
}
```

### Action

```typescript
type Action = 
  | TagAction
  | ExtractAction
  | RewriteAction
  | SuppressAction
  | RouteAction
  | AnnotateAction
  | EscalateAction
  | ChangeSeverityAction;

interface TagAction {
  type: "tag";
  tags: string[];            // ["voicemail-issue", "priority-high"]
}

interface ExtractAction {
  type: "extract";
  fields: Record<string, FieldType>;  // { duration: "integer", query: "string" }
}

interface SuppressAction {
  type: "suppress";
  reason?: string;           // "Noise in this environment"
}

interface ChangeSeverityAction {
  type: "changeSeverity";
  newSeverity: Severity;     // "error" | "warning" | "info" | "hint"
}
```

### State

```typescript
type State = 
  | "draft"       // Working on it, not active
  | "staged"      // Preview mode, shows impact
  | "active"      // Live, affecting results
  | "deprecated"  // Marked for removal
  | "archived";   // Historical, not loaded
```

---

## 🎨 UI/UX Design

### Tree View: "Pattern Overlays"

```
📦 Pattern Overlays
├─ 🟢 Base Patterns (p=0) [Active]
│  └─ 847 signatures loaded
├─ 🟢 Michigan Homes IT (p=25) [Active]
│  ├─ 📝 12 suppressions
│  └─ 🏷️ 5 custom tags
├─ 🟢 HQ Datacenter (p=50) [Active]
│  └─ 🔧 3 severity changes
├─ 🟡 Case 700435046 (p=100) [Staged]
│  ├─ 🚫 200 suppressions (preview)
│  ├─ 🏷️ 15 tags
│  └─ 📊 5 extractions
└─ ⚪ Sarah's Personal (p=125) [Draft]
   └─ 🔧 2 rules (not active)
```

### Context Menu Actions

**Right-click on log line:**
- Create Pattern Overlay
  - → Suppress This Pattern
  - → Tag This Pattern
  - → Extract Fields from Pattern
  - → Change Severity
  - → Custom Action...

**Right-click on layer:**
- Activate / Deactivate
- Promote (Draft → Staged → Active)
- Preview Impact
- Edit Layer
- Duplicate Layer
- Export Layer
- Delete Layer

### Preview Panel

```
╔══════════════════════════════════════════════════════════╗
║ 🔍 Preview: Case 700435046 Layer                         ║
╠══════════════════════════════════════════════════════════╣
║                                                           ║
║  Before:  847 warnings, 123 errors, 2,341 info          ║
║  After:   647 warnings, 125 errors, 2,341 info          ║
║                                                           ║
║  Changes:                                                 ║
║  • 200 warnings suppressed (Jabber MRA timeout)          ║
║  • 15 warnings tagged with "voicemail-issue"             ║
║  • 2 warnings → errors (Database replication lag)        ║
║  • 5 fields extracted (database query metrics)           ║
║                                                           ║
║  [View Details] [Activate] [Cancel]                      ║
╚══════════════════════════════════════════════════════════╝
```

---

## 💾 Storage

### File Structure

```
.vscode/
└─ scout-overlays/
   ├─ base.json                    # Base patterns (read-only)
   ├─ org-michigan-homes.json      # Organization layer
   ├─ site-hq-datacenter.json      # Site layer
   ├─ team-uc-engineers.json       # Team layer
   ├─ case-700435046.json          # Case-specific layer
   └─ user-sarah.json              # Personal overrides
```

### Example Layer File

```json
{
  "layerId": "overlay-700435046",
  "name": "Case 700435046 - Voicemail Investigation",
  "type": "case",
  "scope": {
    "level": "bundle",
    "id": "700435046"
  },
  "priority": 100,
  "enabled": true,
  "state": "active",
  "version": "1.2.0",
  "author": "sarah@company.com",
  "createdAt": "2026-02-24T10:30:00Z",
  "updatedAt": "2026-02-24T14:15:00Z",
  "scenario": {
    "hostnames": ["uc-cucm-pub1.mihomes.com"],
    "timeWindow": {
      "from": "2026-02-20",
      "to": "2026-03-01"
    }
  },
  "rules": [
    {
      "id": "sig-001",
      "signature": {
        "type": "regex",
        "pattern": "(?i)jabber.*mra.*timeout",
        "flags": "i"
      },
      "action": {
        "type": "suppress",
        "reason": "Normal in MRA environments"
      },
      "priority": 10,
      "state": "active",
      "notes": "Suppressing known noise from Jabber MRA connections"
    },
    {
      "id": "sig-002",
      "signature": {
        "type": "regex",
        "pattern": "(?i)voicemail.*(error|fail|timeout)"
      },
      "action": {
        "type": "tag",
        "tags": ["voicemail-issue", "priority-high"]
      },
      "priority": 5,
      "state": "active",
      "notes": "Tag all voicemail errors for filtering"
    },
    {
      "id": "sig-003",
      "signature": {
        "type": "regex",
        "pattern": "Database query completed in (?P<duration>\\d+)ms for (?P<query_type>\\w+)"
      },
      "action": {
        "type": "extract",
        "fields": {
          "duration": "integer",
          "query_type": "string"
        }
      },
      "priority": 8,
      "state": "active",
      "notes": "Extract performance metrics for analysis"
    }
  ]
}
```

---

## 🔄 Implementation Plan (STDD)

### Phase 1: Core Types & Layer Manager (Week 1)

**Scenario:** Load and merge layers in priority order

**Tests:**
1. Load single layer from JSON
2. Merge two layers (priority order)
3. Resolve conflicts (higher priority wins)
4. Enable/disable layer
5. Validate layer schema

**Code:**
- `src/overlays/types.ts` - Type definitions
- `src/overlays/layerManager.ts` - Layer loading & merging
- `src/overlays/validator.ts` - Schema validation

---

### Phase 2: Suppress Action (Week 2)

**Scenario:** Suppress noisy warnings for specific bundle

**Tests:**
1. Create suppress rule
2. Apply suppression to diagnostics
3. Preview suppression impact
4. Activate/deactivate suppression
5. Verify base patterns unchanged

**Code:**
- `src/overlays/actions/suppressAction.ts`
- Update diagnostics provider to check suppressions

---

### Phase 3: Tag Action (Week 3)

**Scenario:** Tag custom error categories

**Tests:**
1. Create tag rule
2. Apply tags to matching logs
3. Filter by tag
4. Export with tags

**Code:**
- `src/overlays/actions/tagAction.ts`
- Update tree providers to show tags

---

### Phase 4: Extract Action (Week 4)

**Scenario:** Extract metrics from logs

**Tests:**
1. Parse regex with capture groups
2. Extract fields from log lines
3. Aggregate extracted data
4. Export to CSV

**Code:**
- `src/overlays/actions/extractAction.ts`
- Results aggregation & export

---

### Phase 5: UI Integration (Week 5-6)

**Scenario:** Context menu → create overlay

**Tests:**
1. Right-click log → "Create Pattern Overlay"
2. Dialog shows configuration options
3. Preview impact before activation
4. Layer appears in tree view
5. Can edit/delete layer

**Code:**
- `src/overlays/overlayTreeProvider.ts`
- Context menu commands
- Preview panel webview

---

### Phase 6: Scenario Conditions (Week 7)

**Scenario:** Hostname-specific & time-window rules

**Tests:**
1. Layer activates only for matching hostname
2. Time window enforcement
3. Device type filtering

**Code:**
- `src/overlays/scenarioEvaluator.ts`

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 95%+ test coverage
- ✅ <100ms layer merge time
- ✅ <10MB storage per layer
- ✅ Zero breaking changes to base patterns

### User Metrics
- ✅ 90% of users suppress patterns within first week
- ✅ Average 3 layers per bundle
- ✅ <2 clicks to create overlay
- ✅ 80% use preview before activation

---

## 🔗 Related Documentation

- **User Scenarios:** `USER_SCENARIOS.md` - Scenarios 10-17
- **API Design:** `src/overlays/README.md` (to be created)
- **Testing Guide:** `src/overlays/TESTING.md` (to be created)

---

**Last Updated:** 2026-02-24  
**Status:** 📋 Design Phase  
**Next Step:** Create type definitions and first test