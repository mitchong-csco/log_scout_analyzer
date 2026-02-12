# State Tracking: Visual Reference Card

---

## State → Glyph Mapping

```
STATE         GLYPH  COLOR    MEANING
─────────────────────────────────────────
STARTING      🟡    Yellow   Initializing (transient)
RUNNING       🟢    Green    Operational (stable)
STOPPING      🟠    Orange   Shutting down (transient)
STOPPED       ⏹️    Gray     Offline (terminal)
ERROR         ❌    Red      Error detected
CRASHED       💥    Red      Critical failure
```

---

## Reading Log State Timelines

### Service Healthy Lifecycle
```
🟡 → 🟡 → 🟢 → 🟢 → 🟢 → 🟠 → ⏹️

Story: Starts (🟡), runs well (🟢), shuts down (🟠), stops (⏹️)
```

### Service with Issues
```
🟡 → 🟡 → 🟡 → 🟡 → ❌ → 🟡 → 🟢

Story: Stuck starting (🟡🟡🟡🟡), error (❌), recovery (🟡), runs (🟢)
```

### Cascading Failure
```
Service A: 🟢 🟢 🟢 ⏹️
Service B: 🟢 🟢 🟢 ⏹️  (stopped 1s later)
Service C: 🟢 🟢 🟢 ⏹️  (stopped 2s later)

Story: All services crashed in sequence = cascading failure
```

### Unexpected Crash
```
🟢 → 🟢 → 🟢 → ⏹️

Story: Was running (🟢), suddenly stopped (⏹️) without stopping state (🟠)
       = unexpected crash (not graceful shutdown)
```

---

## Pattern Detection Rules

| Pattern | State | Confidence |
|---------|-------|-----------|
| `starting\|initializing` | STARTING | High |
| `initialized\|ready\|listening` | STARTING | Medium |
| `running\|operational\|healthy` | RUNNING | High |
| `stopping\|shutdown` | STOPPING | High |
| `stopped\|offline` | STOPPED | High |
| `error\|failed\|crash` | ERROR | High |
| `crashed\|fatal` | CRASHED | High |

---

## Anomaly Detection Patterns

### Pattern 1: Stuck in Transient State
```
🟡 🟡 🟡 🟡 🟡 ❌

Detection: STARTING state > expected duration
Action: Escalate or restart
```

### Pattern 2: Unexpected Crash
```
🟢 → ⏹️  (skipped 🟠 STOPPING)

Detection: RUNNING → STOPPED without STOPPING state
Action: Collect crash info, investigate
```

### Pattern 3: Rapid State Cycling
```
🟢 ⏹️ 🟡 🟢 ⏹️ 🟡 🟢

Detection: Rapid state changes, likely a loop
Action: Investigate root cause
```

### Pattern 4: Cascading Failure
```
Service A:  🟢 ⏹️
Service B:  🟢 ⏹️  (+1s)
Service C:  🟢 ⏹️  (+2s)

Detection: Multiple services transitioning at similar times
Action: Look for shared dependency
```

---

## Integration with Pattern Progression

```
Layer 0: STATE TRACKING
   └─ Detect states from log lines
      └─ Output: state per line

Layer 1: PATTERNS + STATES
   └─ Match patterns with state context
      └─ Output: state-aware detections

Layer 2: SIGNATURES + STATE SEQUENCES
   └─ Group state transitions into events
      └─ Output: anomalies (stuck, crash, etc.)

Layer 3: ACTIONS + STATE PRECONDITIONS
   └─ Execute only in safe states
      └─ Output: safe automation

Layer 4: SCENARIOS + STATE ORCHESTRATION
   └─ Drive workflows by state transitions
      └─ Output: incident response
```

---

## Quick Config Reference

### Detect State: STARTING
```yaml
patterns:
  - name: "service_starting"
    regex: '(?i)(starting|initializing)'
    state: "STARTING"
    state_type: "transient"
```

### Detect State: RUNNING
```yaml
patterns:
  - name: "service_running"
    regex: '(?i)(running|healthy|operational)'
    state: "RUNNING"
    state_type: "stable"
```

### Detect State: ERROR
```yaml
patterns:
  - name: "service_error"
    regex: '(?i)(error|failed|timeout)'
    state: "ERROR"
    state_type: "transient"
```

---

## Monaco Glyph Implementation

### Register Glyph in CSS
```css
.glyph-starting {
  background: url('data:image/svg+xml;...') center no-repeat;
}
```

### Render Glyph in Editor
```ts
editor.deltaDecorations([], [{
  range: new monaco.Range(lineNum, 1, lineNum, 1),
  options: {
    glyphMarginClassName: 'glyph-starting',
    glyphMarginHoverMessage: { value: 'State: STARTING' }
  }
}]);
```

---

## Temporal Markers

### Expected Durations
```
STARTING: 30-60 seconds (alert if > 120s)
RUNNING:  Unlimited (stable)
STOPPING: 10-30 seconds (alert if > 60s)
STOPPED:  Until next start
```

### Timeout Rules
```
If STARTING > timeout_seconds:
  → Signature: "Boot timeout"
  
If STOPPING > timeout_seconds:
  → Signature: "Shutdown timeout"
  
If state unchanged > expected_duration:
  → Anomaly: "Stuck in state X"
```

---

## Demo: What You See

### Editor View
```
Left Margin        Line Numbers    Log Content
   (Glyphs)        (1, 2, 3...)    (Log text)
─────────────────────────────────────────────
    🟡      │      1     │ 10:00:01 INFO Service starting
    🟡      │      2     │ 10:00:05 INFO Service initialized
    ❌      │      3     │ 10:00:15 ERROR Database timeout
    🔄      │      4     │ 10:00:18 INFO Retrying
    🟢      │      5     │ 10:00:25 INFO Service running
```

### Hover Behavior
```
Hover on: 🟡
Shows:    Tooltip "State: STARTING"
```

### Line-by-Line Trace
```
Line 1: Pattern "starting" matches → State = STARTING → Glyph = 🟡
Line 2: Pattern "initialized" matches → State = STARTING → Glyph = 🟡
Line 3: Pattern "error" matches → State = ERROR → Glyph = ❌
Line 4: Pattern "retrying" matches → State = RETRY → Glyph = 🔄
Line 5: Pattern "running" matches → State = RUNNING → Glyph = 🟢
```

---

## One-Page Summary

**State Tracking = Glyph Icons showing system state at each log line**

- 🟡 Yellow circle = System starting
- 🟢 Green circle = System running
- 🟠 Orange circle = System stopping
- ⏹️ Square = System stopped
- ❌ Red X = Error detected
- 💥 Red circle = Crash

**Why?** Context for patterns, safety for actions, anomaly detection, root cause analysis.

**How?** Pattern match to detect state, render glyph in Monaco margin, track transitions.

**Where?** `demo/monaco-overlays/` (run it), `docs/` (read about it), Log Scout (integrate it).

