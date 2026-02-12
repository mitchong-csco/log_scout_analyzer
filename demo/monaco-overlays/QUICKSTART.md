# State Tracking Demo: Quick Start

**What you'll see:** Log lines with state-based glyph icons showing the system lifecycle.

---

## Run in 30 Seconds

```cmd
cd c:\Users\mitchong\code\log_scout_analyzer\demo\monaco-overlays
npm install
npm run dev
```

Open: http://localhost:5173

---

## What the Glyphs Mean

| Glyph | State | Color | Meaning |
|-------|-------|-------|---------|
| 🟡 | STARTING | Yellow | System initializing (transient) |
| 🟢 | RUNNING | Green | System operational (stable) |
| 🟠 | STOPPING | Orange | System shutting down (transient) |
| ⏹️ | STOPPED | Gray | System offline (terminal) |
| ❌ | ERROR | Red | Error detected |
| 💥 | CRASHED | Red | Critical failure |

---

## Reading the Demo

### Left Margin (Glyph Icons)
```
🟡  ← State icon (tells you state at this moment)
│
├─ Yellow = STARTING
├─ Green  = RUNNING
├─ Orange = STOPPING
└─ Red    = ERROR/CRASH
```

### Inline Highlighting
```
Error words get highlighted:
2026-02-10 10:00:15 ERROR Database timeout
                    ───── ────────────────
                    Highlighted inline
```

### Log Content
```
2026-02-10 10:00:15 ERROR Database timeout
│          │        │      │
│          │        │      └─ What happened
│          │        └─────── Severity (ERROR/WARN/INFO)
│          └──────────────── Time
└─────────────────────────── Date
```

---

## Example Trace Through Logs

### Line 1: `INFO Service starting`
- **State detected:** STARTING (matches "starting")
- **Glyph:** 🟡 (yellow circle)
- **Meaning:** System is initializing

### Line 2: `INFO Service initialized`
- **State detected:** STARTING (matches "initialized")
- **Glyph:** 🟡 (yellow circle)
- **Meaning:** Still initializing (not yet RUNNING)

### Line 3: `WARN Slow response detected`
- **State detected:** STARTING (still in previous state)
- **Glyph:** 🟡 (yellow circle)
- **Inline highlight:** "Slow response" (warning word)
- **Meaning:** Warning during startup phase

### Line 4: `ERROR Database timeout`
- **State detected:** ERROR (matches "error")
- **Glyph:** ❌ (red X)
- **Inline highlight:** "Database timeout" (error words)
- **Meaning:** Error detected, likely causes state to change

### Line 5: `INFO Retrying connection`
- **State detected:** STARTING (retry = still initializing)
- **Glyph:** 🟡 (yellow circle)
- **Meaning:** System recovering, still in startup phase

### Line 6: `INFO Service running`
- **State detected:** RUNNING (matches "running")
- **Glyph:** 🟢 (green circle)
- **Meaning:** System is now operational

### Line 7: `INFO Service healthy`
- **State detected:** RUNNING (matches "healthy")
- **Glyph:** 🟢 (green circle)
- **Meaning:** System is healthy and running

---

## State Timeline (Visual)

```
Timeline:
🟡 → 🟡 → 🟡 → ❌ → 🟡 → 🟢 → 🟢

Timeline story:
- Starting for 3 lines (🟡🟡🟡)
- Error occurred (❌)
- Recovery retry (🟡)
- Now running (🟢🟢)
```

---

## Key Insights

### 1. **State Continuity**
Once in a state, subsequent lines stay in that state until a new state pattern is detected.

### 2. **State Transitions**
```
🟡 (line 1) → 🟡 (line 2) → ❌ (line 3) → 🟡 (line 4) → 🟢 (line 5)
```

Each transition tells a story.

### 3. **Anomaly Spotting**
```
Normal:  🟡 🟡 🟢 🟢 🟢     (quick transition STARTING → RUNNING)
Anomaly: 🟡 🟡 🟡 🟡 🟡 ❌  (stuck in STARTING, then error)
```

### 4. **Duration in State**
```
Quick boot:     🟡 (1 line in STARTING) → 🟢
Slow boot:      🟡 🟡 🟡 🟡 (4 lines in STARTING) → 🟢
Stuck boot:     🟡 🟡 🟡 🟡 🟡 🟡 ❌ (timeout)
```

---

## How to Hover

Move your mouse over a **glyph icon** (the colored circle on the left margin):

```
Hover over:    🟡 (yellow circle)
You'll see:    Tooltip: "State: STARTING"
```

Each glyph shows its state name on hover.

---

## Integration with Log Scout

This pattern will eventually show:
- ✅ State glyphs in Log Scout editor
- ✅ State timeline in Results view
- ✅ State anomalies as signatures
- ✅ State-aware pattern matching
- ✅ State preconditions for actions
- ✅ State-driven scenarios

For now, this demo shows the **foundation**: detecting states and rendering glyphs.

---

## Troubleshooting

**Q: No glyphs showing?**
A: 
1. Make sure `glyphMargin: true` in editor options
2. Check that CSS classes are loaded (style.css)
3. Check browser console for errors

**Q: Can't see the demo?**
A:
1. Check server is running: `npm run dev` shows `http://localhost:5173`
2. Try http://127.0.0.1:5173 if localhost doesn't work
3. Check firewall allows localhost

**Q: What if I modify the log lines?**
A:
- State detection runs on original log content
- Edit the `logLines` array in `main.js` to change logs
- State detection happens automatically

---

## Next Step

After understanding this demo, read:
- **STATE_TRACKING_IN_LOGS.md** - Full architectural guide
- **STATE_TRACKING_SUMMARY.md** - Implementation roadmap

These explain how to integrate state tracking into Log Scout Analyzer.

