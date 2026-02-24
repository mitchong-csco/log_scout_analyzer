# Pattern Overlays - Quick Reference Card 🎯

**One-page guide for developers implementing Pattern Overlays**

---

## 🚀 30-Second Overview

**Pattern Overlays** = Ordered layers that modify pattern behavior without changing base patterns

```
Base (p=0) + Org (p=25) + Site (p=50) + Case (p=100) = Final Rules
```

**Each Layer has:**
- **Signatures** - What to match (regex patterns)
- **Actions** - What to do (suppress, tag, extract, etc.)
- **States** - Lifecycle (draft → staged → active)
- **Scenarios** - When to activate (hostname, time, rollout %)

---

## 📖 Essential Reading (5 min)

1. `USER_SCENARIOS.md` - Scenarios 10-17
2. `PATTERN_OVERLAYS_SCENARIOS.md` - Architecture & design
3. `PATTERN_OVERLAYS_TODO.md` - Implementation phases

---

## 🏗️ Core Types

```typescript
interface PatternLayer {
  layerId: string;              // "overlay-42"
  name: string;                 // "Case 700435046"
  priority: number;             // 0-125 (higher wins)
  enabled: boolean;             // Quick toggle
  state: State;                 // draft | staged | active
  scope: Scope;                 // bundle | global | file
  scenario?: Scenario;          // Activation conditions
  rules: Rule[];                // Pattern rules
}

interface Rule {
  id: string;
  signature: Signature;         // What to match
  action: Action;               // What to do
  priority: number;             // Within-layer priority
}

interface Signature {
  type: "regex" | "token" | "multiline";
  pattern: string;              // e.g., "(?i)voicemail.*error"
}

type Action = 
  | { type: "suppress"; reason?: string }
  | { type: "tag"; tags: string[] }
  | { type: "extract"; fields: Record<string, FieldType> }
  | { type: "changeSeverity"; newSeverity: Severity };

type State = "draft" | "staged" | "active" | "deprecated" | "archived";
```

---

## 🎯 Common Use Cases

### 1. Suppress Noisy Warnings

```json
{
  "layerId": "suppress-jabber-mra",
  "name": "Suppress Jabber MRA Timeouts",
  "priority": 100,
  "scope": {"level": "bundle", "id": "700435046"},
  "rules": [{
    "signature": {"type": "regex", "pattern": "(?i)jabber.*mra.*timeout"},
    "action": {"type": "suppress", "reason": "Normal in MRA env"}
  }]
}
```

**Result:** 200 warnings disappear from Problems Panel

---

### 2. Tag Custom Categories

```json
{
  "layerId": "tag-voicemail",
  "name": "Tag Voicemail Issues",
  "priority": 75,
  "rules": [{
    "signature": {"type": "regex", "pattern": "(?i)voicemail.*(error|fail)"},
    "action": {"type": "tag", "tags": ["voicemail-issue", "priority-high"]}
  }]
}
```

**Result:** All voicemail errors tagged, filterable in tree view

---

### 3. Extract Metrics

```json
{
  "layerId": "db-perf",
  "name": "Database Performance",
  "priority": 100,
  "rules": [{
    "signature": {
      "type": "regex",
      "pattern": "Query completed in (?P<duration>\\d+)ms for (?P<type>\\w+)"
    },
    "action": {
      "type": "extract",
      "fields": {"duration": "integer", "type": "string"}
    }
  }]
}
```

**Result:** Extracted fields available for aggregation (avg, max, min)

---

### 4. Hostname-Specific Rules

```json
{
  "layerId": "publisher-only",
  "name": "Publisher DB Warnings",
  "priority": 50,
  "scenario": {
    "hostnames": ["uc-cucm-pub1.mihomes.com"],
    "deviceTypes": ["publisher"]
  },
  "rules": [...]
}
```

**Result:** Layer only activates for publisher server logs

---

## 🔄 STDD Workflow

```bash
# 1. SCENARIO - Read user scenario
code PATTERN_OVERLAYS_SCENARIOS.md
# Find "Scenario 1: Suppress Noisy Warnings"

# 2. TEST (RED) - Write failing test
cat > src/overlays/__tests__/suppressAction.test.ts <<EOF
import { applySuppress } from '../actions/suppressAction';

test('Should suppress matching diagnostics', () => {
  const rule = {
    signature: {type: 'regex', pattern: 'jabber.*timeout'},
    action: {type: 'suppress'}
  };
  const diagnostics = [
    {message: 'Jabber MRA timeout', severity: 'warning'},
    {message: 'Database error', severity: 'error'}
  ];
  
  const result = applySuppress(diagnostics, [rule]);
  
  assert.strictEqual(result.length, 1); // Only DB error remains
  assert.strictEqual(result[0].message, 'Database error');
});
EOF

# Run test - should FAIL (RED)
npm test

# 3. CODE (GREEN) - Implement minimal code
cat > src/overlays/actions/suppressAction.ts <<EOF
export function applySuppress(diagnostics, rules) {
  return diagnostics.filter(diag => {
    return !rules.some(rule => {
      const regex = new RegExp(rule.signature.pattern, 'i');
      return regex.test(diag.message);
    });
  });
}
EOF

# Run test - should PASS (GREEN)
npm test

# 4. COMMIT
git add -A
git commit -m "feat: implement suppress action

- applySuppress() filters diagnostics by regex
- Test passes (GREEN)
- Next: integrate with diagnosticsProvider"

# 5. CI - Push to GitHub Actions
git push
```

---

## 📁 File Structure

```
src/overlays/
├── types.ts                    # Core type definitions
├── layerManager.ts             # Load, merge, enable/disable
├── validator.ts                # JSON schema validation
├── scenarioEvaluator.ts        # Check activation conditions
├── actions/
│   ├── actionExecutor.ts       # Orchestrate all actions
│   ├── suppressAction.ts       # Suppress diagnostics
│   ├── tagAction.ts            # Add tags
│   ├── extractAction.ts        # Extract fields
│   ├── changeSeverityAction.ts # Change severity
│   └── __tests__/              # Action tests
├── overlayTreeProvider.ts      # UI tree view
├── overlayCommands.ts          # VS Code commands
├── previewPanel.ts             # Preview webview
└── __tests__/                  # Core tests
    ├── layerManager.test.ts
    ├── validator.test.ts
    └── scenarioEvaluator.test.ts

.vscode/scout-overlays/
├── base.json                   # Shipped base patterns
├── org-company.json            # Organization layer
├── site-datacenter.json        # Site layer
├── team-uc.json                # Team layer
├── case-700435046.json         # Case layer
└── user-sarah.json             # Personal layer
```

---

## 🎨 UI Components

### Tree View

```
📦 Pattern Overlays
├─ 🟢 Base Patterns (p=0) [Active]
│  └─ 847 signatures
├─ 🟢 Michigan Homes IT (p=25) [Active]
│  ├─ 📝 12 suppressions
│  └─ 🏷️ 5 tags
├─ 🟡 Case 700435046 (p=100) [Staged]
│  └─ 🚫 200 suppressions (preview)
└─ ⚪ Sarah's Personal (p=125) [Draft]
```

### Commands

```typescript
// Register in extension.ts
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScoutAnalyzer.overlays.create',
    () => OverlayCommands.createOverlay()
  ),
  vscode.commands.registerCommand(
    'logScoutAnalyzer.overlays.toggle',
    (layer) => LayerManager.toggle(layer.layerId)
  )
);
```

### Context Menu

```json
{
  "command": "logScoutAnalyzer.overlays.createFromDiagnostic",
  "when": "view == scoutResults",
  "group": "overlays@1"
}
```

---

## 🧪 Testing Checklist

### Per Action Type

- [ ] Create rule from JSON
- [ ] Apply action to 1 log line
- [ ] Apply action to 1000 log lines
- [ ] Handle invalid input gracefully
- [ ] Performance: <1ms per action
- [ ] Integration with diagnosticsProvider

### Per Layer

- [ ] Load from JSON file
- [ ] Validate schema
- [ ] Enable/disable toggle
- [ ] Merge with other layers (priority order)
- [ ] Preview before activation
- [ ] Persist across restarts

### Integration

- [ ] Right-click → Create overlay
- [ ] Preview shows accurate before/after
- [ ] Tree view updates in real-time
- [ ] Export/import layers
- [ ] Git-friendly (JSON diffs)

---

## ⚡ Performance Targets

| Operation | Target | Why |
|-----------|--------|-----|
| Layer merge | <100ms | User expects instant activation |
| Action execution | <1ms | Applied to 10k+ log lines |
| Preview generation | <500ms | UX feels responsive |
| Layer file size | <10MB | Git-friendly, fast load |
| Regex compilation | <10ms | Cache compiled patterns |

---

## 🐛 Common Pitfalls

### ❌ Don't Modify Base Patterns

```typescript
// BAD - Mutates base patterns
basePatterns.push(newRule);

// GOOD - Create overlay layer
const overlay = {
  priority: 100,
  rules: [newRule]
};
LayerManager.add(overlay);
```

### ❌ Don't Skip State Machine

```typescript
// BAD - Direct activation
layer.state = 'active';

// GOOD - Follow state transitions
layer.setState('staged');  // Preview first
layer.setState('active');  // Then activate
```

### ❌ Don't Forget Priority

```typescript
// BAD - All priorities = 0 (chaos)
{priority: 0, rules: [...]}

// GOOD - Clear hierarchy
base:   priority 0
org:    priority 25
site:   priority 50
case:   priority 100
user:   priority 125
```

---

## 🎯 Quick Wins (Start Here)

### Week 1: Suppress Action (Biggest Impact)

1. Create `suppressAction.ts`
2. Write 5 tests (load, apply, toggle, preview, persist)
3. Integrate with diagnosticsProvider
4. Manual test: suppress 200 warnings in case bundle

**User Value:** Immediate noise reduction

### Week 2: Tag Action (Filtering)

1. Create `tagAction.ts`
2. Update tree providers to show tags
3. Add tag filtering
4. Manual test: tag + filter voicemail errors

**User Value:** Custom categorization

### Week 3: UI Polish

1. Right-click menu
2. Preview panel
3. Tree view
4. Manual test: create overlay without editing JSON

**User Value:** No-code overlay creation

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 95%+ test coverage
- ✅ All tests passing (GREEN)
- ✅ <100ms layer merge
- ✅ Zero breaking changes

### User Metrics
- ✅ 90% users suppress patterns in week 1
- ✅ <2 clicks to create overlay
- ✅ 80% use preview before activation
- ✅ Average 3 layers per bundle

---

## 🔗 Essential Links

| Document | Purpose | Read When |
|----------|---------|-----------|
| `USER_SCENARIOS.md` | High-level use cases | Starting work |
| `PATTERN_OVERLAYS_SCENARIOS.md` | Detailed design | Implementing |
| `PATTERN_OVERLAYS_TODO.md` | Phase tracking | Planning sprint |
| `.rules` | STDD workflow | Every commit |

---

## 💡 Pro Tips

### 1. Start With Tests
Tests are documentation. Write test first, it clarifies design.

### 2. Use State Machine
Don't skip draft → staged → active. Preview saves pain.

### 3. Priority Matters
Higher priority wins. Document who owns which range (0-25-50-75-100-125).

### 4. Cache Compiled Regex
`new RegExp()` is expensive. Compile once, reuse.

### 5. Preview Must Match Reality
Use same merge logic for preview and execution. No surprises.

---

## 🆘 When Stuck

1. **Check user scenario** - What is user trying to accomplish?
2. **Write test first** - Clarifies what to build
3. **Start simple** - MVP over perfect
4. **Ask AI** - Reference PATTERN_OVERLAYS_SCENARIOS.md
5. **Pair program** - Two heads better than one

---

## 🎉 You're Ready!

**Start with:** Phase 1 (Layer Manager)  
**First test:** Load single layer from JSON  
**First commit:** Test (RED) → Code (GREEN) → Commit

**Remember:** Ship working code that users love, validated by tests.

---

**Last Updated:** 2026-02-24  
**Maintained By:** Development Team  
**Questions?** Check PATTERN_OVERLAYS_SCENARIOS.md or ask AI