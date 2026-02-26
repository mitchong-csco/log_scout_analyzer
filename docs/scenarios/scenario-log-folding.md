# Scenario: Log Folding in Editor

## Overview
Implement code folding capabilities in log files to collapse/expand sections of logs, making it easier to navigate large files and focus on relevant sections during analysis.

## Problem Statement
**Current State:**
- Large log files are overwhelming (10,000+ lines)
- Scrolling through irrelevant sections is tedious
- Hard to maintain context when jumping between locations
- No way to hide noise while keeping structure visible

**Desired State:**
- Collapse/expand log sections like code folding
- Focus on relevant timeframes or error sections
- Quick navigation between folded sections
- Preserve visual context of log structure

---

## Core Concepts

### What Can Be Folded?

1. **Timeframe Blocks**
   - Fold entire hour blocks: `14:00:00 - 14:59:59`
   - Fold minute blocks: `14:23:00 - 14:23:59`
   - Keep only incident timeframe expanded
   - **Fold everything before/after specific time**
   - **"Show only 8:40 AM and newer"** - Hide all historical logs
   - **"Show only last 30 minutes"** - Rolling time window

2. **Log Level Sections**
   - Fold all DEBUG lines (noise)
   - Fold all INFO lines
   - Keep only ERROR/WARN visible

3. **Thread/Component Sections**
   - Fold specific thread IDs
   - Fold specific components/modules
   - Focus on problematic thread

4. **Call/Session Blocks**
   - Fold by Call-ID
   - Fold by Session-ID
   - Focus on one call flow

5. **Pattern-Based Folding**
   - Fold lines matching pattern (e.g., heartbeat logs)
   - Fold repetitive sequences
   - Fold known noise patterns

6. **Custom Regions**
   - Manually mark start/end of fold region
   - Save folded regions for later
   - Share fold configurations

---

## Scenarios

### Scenario 1: Timeframe-Based Folding (Relative Time)

**Context:**
```
Engineer investigating login issues
Issue started at 8:40 AM
Log file starts at 6:00 AM (2h 40min of irrelevant logs)
```

**Action:**
```
1. Open log file (87,456 lines, spans 6:00 AM - 4:00 PM)
2. Right-click → "Fold Before Time..."
3. Enter: 08:40:00 (or "8:40 AM")
4. System folds everything before 8:40 AM
```

**Result:**
```
[06:00:00 - 08:39:59] ... (23,456 lines folded - before issue started)
▼ 08:40:00 - 16:00:00 (64,000 lines visible - from issue start)
  08:40:03 [INFO] User login attempt started
  08:40:05 [ERROR] LDAP connection timeout
  08:40:07 [WARN] Retrying authentication
  08:40:12 [ERROR] Login failed for user@example.com
  ... (rest of day visible)
```

**Alternate Commands:**
```
- "Fold Before Time..." → Hide everything before specified time
- "Fold After Time..." → Hide everything after specified time
- "Fold Outside Range..." → Show only time window (start + end)
- "Fold Last N Hours..." → Show only recent logs
```

**Benefits:**
- Instantly hide all irrelevant historical logs
- Focus on "when issue started and everything after"
- No need to calculate exact end time
- Perfect for "started at X, still investigating" scenarios

---

### Scenario 1b: Absolute Time Range Folding

**Context:**
```
Engineer analyzing specific incident window
Incident at 14:23:15
Need to see 14:20 - 14:25 (5 minute window around incident)
```

**Action:**
```
1. Open log file (87,456 lines)
2. Right-click → "Fold Outside Time Range..."
3. Enter start: 14:20:00, end: 14:25:00
4. System folds everything outside this range
```

**Result:**
```
[10:00:00 - 14:19:59] ... (45,234 lines folded)
▼ 14:20:00 - 14:25:00 (327 lines visible)
  14:20:03 [INFO] Call started from ext 2543
  14:20:15 [DEBUG] Media negotiation...
  14:23:15 [ERROR] RTP timeout - no packets received
  14:23:47 [ERROR] Call dropped - media failure
  14:24:30 [INFO] Call cleanup complete
[14:25:01 - 16:00:00] ... (42,895 lines folded)
```

**Benefits:**
- See only exact incident window
- Visual context preserved (folded regions show line counts)
- Easy to expand neighboring timeframes if needed

---

### Scenario 1c: Relative Time Window Folding

**Context:**
```
Engineer wants to see "last 30 minutes of logs only"
Current time: 3:15 PM
Show only: 2:45 PM - 3:15 PM
```

**Action:**
```
1. Command Palette → "Fold: Show Last N Minutes"
2. Enter: 30
3. System calculates time range and folds the rest
```

**Result:**
```
[06:00:00 - 14:44:59] ... (78,234 lines folded - older than 30 min ago)
▼ 14:45:00 - 15:15:00 (9,222 lines visible - last 30 minutes)
  14:45:12 [INFO] Processing request
  14:52:34 [WARN] High memory usage
  15:03:45 [ERROR] Database slow query
  15:12:22 [INFO] Request completed
```

**Relative Time Commands:**
```
- "Show Last 5 Minutes"
- "Show Last 30 Minutes"
- "Show Last 1 Hour"
- "Show Last 4 Hours"
- Custom: "Show Last N Minutes/Hours"
```

**Use Cases:**
- Live log monitoring (show recent activity)
- Quick triage (what happened recently?)
- Performance analysis (last hour only)

---

### Scenario 2: Log Level Filtering with Folding

**Context:**
```
Log file has excessive DEBUG messages
Engineer only cares about WARN and ERROR
But wants to see INFO for context occasionally
```

**Action:**
```
1. Command Palette → "Fold by Log Level"
2. Select levels to fold: [DEBUG]
3. System folds all DEBUG lines
```

**Before (overwhelming):**
```
14:23:10 [INFO] Processing request
14:23:11 [DEBUG] Entering function processCall()
14:23:11 [DEBUG] Parameter validation...
14:23:11 [DEBUG] Checking user permissions...
14:23:11 [DEBUG] Loading configuration...
14:23:12 [DEBUG] Database query: SELECT...
14:23:12 [DEBUG] Query result: 1 row
14:23:12 [DEBUG] Parsing result set...
14:23:13 [DEBUG] Building response object...
14:23:13 [INFO] Request processed
14:23:15 [ERROR] RTP timeout
```

**After (focused):**
```
14:23:10 [INFO] Processing request
[DEBUG] ... (8 debug lines folded)
14:23:13 [INFO] Request processed
14:23:15 [ERROR] RTP timeout
```

**Interaction:**
```
Engineer clicks folded DEBUG section:
▼ [DEBUG] ... (8 debug lines folded)
  Shows all 8 lines temporarily
  Click again to re-fold
```

---

### Scenario 3: Thread-Based Folding

**Context:**
```
Multi-threaded application log
50 threads running simultaneously
Engineer tracking specific thread with issue: Thread-42
```

**Action:**
```
1. Click on line with "Thread-42"
2. Right-click → "Fold Other Threads"
3. System folds all lines NOT from Thread-42
```

**Result:**
```
[Other threads] ... (523 lines folded)
▼ Thread-42
  14:23:10 [Thread-42] Call setup initiated
  14:23:12 [Thread-42] SIP INVITE sent
  14:23:15 [Thread-42] No response from gateway
  14:23:18 [Thread-42] Timeout, retrying...
  14:23:21 [Thread-42] Still no response
  14:23:24 [Thread-42] Call setup failed
[Other threads] ... (1,234 lines folded)
```

**Benefits:**
- Follow single thread's execution path
- No distractions from other threads
- Easy to expand other threads if needed (click fold)

---

### Scenario 4: Call-ID Based Folding

**Context:**
```
SIP logs with multiple concurrent calls
Engineer troubleshooting specific call
Call-ID: abc123@cucm.example.com
```

**Action:**
```
1. Click on line with Call-ID
2. Right-click → "Fold Other Calls"
3. System folds all lines for other Call-IDs
```

**Result:**
```
[Other calls] ... (2,456 lines folded)
▼ Call-ID: abc123@cucm.example.com
  14:23:10 INVITE sip:2543@gateway.example.com
  14:23:12 100 Trying
  14:23:15 180 Ringing
  14:23:18 200 OK
  14:23:20 ACK
  14:23:47 BYE (call dropped)
  14:23:48 200 OK
[Other calls] ... (3,789 lines folded)
```

**Benefits:**
- See complete call flow for one call
- No noise from other calls
- Timeline of events for specific call clear

---

### Scenario 5: Pattern-Based Folding (Noise Reduction)

**Context:**
```
Log has repetitive heartbeat messages every second
Clutters the view, makes finding real issues hard
```

**Pattern:**
```
Every line matching: "^.*\[HEARTBEAT\].*keepalive$"
```

**Action:**
```
1. Select line with heartbeat pattern
2. Right-click → "Fold Similar Lines"
3. System detects pattern, folds all matches
```

**Before:**
```
14:23:10 [INFO] Processing request
14:23:11 [DEBUG] HEARTBEAT keepalive
14:23:12 [INFO] Request complete
14:23:13 [DEBUG] HEARTBEAT keepalive
14:23:14 [INFO] New request received
14:23:15 [DEBUG] HEARTBEAT keepalive
14:23:16 [ERROR] Database timeout
14:23:17 [DEBUG] HEARTBEAT keepalive
```

**After:**
```
14:23:10 [INFO] Processing request
[HEARTBEAT] ... (4 keepalive messages folded)
14:23:12 [INFO] Request complete
14:23:14 [INFO] New request received
14:23:16 [ERROR] Database timeout
```

---

### Scenario 6: Bookmark-Driven Folding

**Context:**
```
Engineer has bookmarked 5 critical log lines
Wants to see ONLY those 5 lines and their context
```

**Action:**
```
1. Bookmarks Panel → "Show Only Bookmarks"
2. System folds everything except:
   - Bookmarked lines
   - ±5 lines context around each bookmark
```

**Result:**
```
[Lines 1-1000] ... (1,000 lines folded)
▼ Bookmark #1 (lines 1001-1011)
  1006 [INFO] Call setup started
  1007 [DEBUG] Checking routing rules
  1008 [ERROR] No route pattern matched ← Bookmarked
  1009 [WARN] Using default route
  1010 [INFO] Call proceeding
[Lines 1012-5400] ... (4,388 lines folded)
▼ Bookmark #2 (lines 5401-5411)
  5406 [INFO] Media negotiation
  5407 [WARN] Codec mismatch detected
  5408 [ERROR] RTP stream failed ← Bookmarked
  5409 [ERROR] Call drop imminent
  5410 [INFO] BYE sent
[Lines 5412-12000] ... (6,588 lines folded)
```

**Benefits:**
- Focus only on evidence
- See context around each finding
- Easy to expand for more detail

---

### Scenario 7: Progressive Unfolding (Discovery Mode)

**Context:**
```
Engineer starts with heavily folded view
Progressively unfolds sections as investigation evolves
```

**Initial State (Heavy Fold):**
```
[10:00-14:00] ... (25,000 lines folded) - Before incident
▼ [14:00-15:00] ... (5,234 lines) - Incident window
▼ [15:00-16:00] ... (3,456 lines) - Recovery period
```

**Step 1: Expand incident hour:**
```
▼ [14:00-15:00]
  [14:00-14:20] ... (1,234 lines folded) - Before incident
  ▼ [14:20-14:30] ... (456 lines) - Incident window
  [14:30-15:00] ... (3,544 lines folded) - After incident
```

**Step 2: Expand incident 10-minute window:**
```
▼ [14:20-14:30]
  [14:20:00-14:22:59] ... (145 lines folded)
  ▼ [14:23:00-14:23:59] ... (67 lines) - Exact incident minute
  [14:24:00-14:29:59] ... (244 lines folded)
```

**Step 3: Fold log levels within incident minute:**
```
▼ [14:23:00-14:23:59]
  [DEBUG] ... (23 lines folded)
  14:23:15 [ERROR] RTP timeout ← Found it!
  14:23:47 [ERROR] Call dropped
  [INFO] ... (18 lines folded)
```

**Benefits:**
- Start broad, drill down progressively
- Maintain context at each zoom level
- Natural investigation flow (hour → minute → second)

---

### Scenario 8: Saved Fold Configurations

**Context:**
```
Engineer frequently analyzes similar logs
Same folding patterns needed each time
```

**Create Configuration:**
```
1. Fold log as desired:
   - Fold all DEBUG lines
   - Fold timeframes outside 14:00-15:00
   - Fold known noise patterns (heartbeat, keepalive)
2. Right-click → "Save Fold Configuration"
3. Name: "CUCM Call Drop Investigation"
```

**Reuse Configuration:**
```
1. Open new log file with similar structure
2. Command Palette → "Apply Fold Configuration"
3. Select: "CUCM Call Drop Investigation"
4. System applies same folding rules
```

**Share Configuration:**
```
1. Export configuration to file
2. Team member imports configuration
3. Consistent folding across team
```

---

### Scenario 9: Folding + Diagnostics Integration

**Context:**
```
Extension finds 234 diagnostics (errors/warnings)
Engineer wants to see ONLY lines with diagnostics
```

**Action:**
```
1. Problems Panel → "Show Only Diagnostic Lines"
2. System folds all lines except those with diagnostics
```

**Result:**
```
[Lines 1-1234] ... (1,234 lines folded)
▼ Diagnostic #1
  1235 [ERROR] Database connection timeout ← Diagnostic
[Lines 1236-3456] ... (2,220 lines folded)
▼ Diagnostic #2
  3457 [WARN] High memory usage detected ← Diagnostic
[Lines 3458-5678] ... (2,221 lines folded)
▼ Diagnostic #3
  5679 [ERROR] RTP stream timeout ← Diagnostic
[Lines 5680-12000] ... (6,321 lines folded)
```

**Interaction:**
```
- Click diagnostic in Problems Panel → Jumps to line, unfolds context
- Click folded region → Temporarily expand to see surrounding lines
- "Expand All" → Show full log again
```

---

### Scenario 9a: Time-Based Folding for Login Issues

**Real-World Example:**
```
Engineer gets ticket: "Users can't login since 8:40 AM"
Log file spans: 6:00 AM - 4:00 PM (10 hours)
Only care about: 8:40 AM onwards
```

**Quick Fold:**
```
1. Right-click in editor → "Fold Before Time..."
2. Type: "8:40" (system auto-completes to 08:40:00)
3. Press Enter
```

**Result:**
```
[06:00:00 - 08:39:59] ... (15,234 lines folded - irrelevant)
▼ 08:40:00 - 16:00:00 (visible - from issue start)
  08:40:03 [INFO] Login attempt: user1@example.com
  08:40:05 [ERROR] LDAP server timeout
  08:40:07 [INFO] Login attempt: user2@example.com
  08:40:08 [ERROR] LDAP server timeout
  08:40:12 [ERROR] Authentication service unavailable
  08:40:15 [WARN] LDAP connection pool exhausted
  ... (all relevant logs visible)

Problems Panel (filtered to visible time):
├─ ERROR (23) - all from 8:40 AM onwards
│   ├─ 08:40:05 - LDAP server timeout
│   ├─ 08:40:08 - LDAP server timeout
│   └─ 08:40:12 - Authentication unavailable
└─ (45 problems before 8:40 AM - hidden in fold)
```

**Benefits:**
- One command: "Fold Before 8:40"
- Instantly hides 2h 40min of irrelevant logs
- Problems Panel shows only login-related errors
- Can expand earlier logs if needed

**Smart Parsing:**
```
Engineer can type various formats:
- "8:40" → 08:40:00
- "8:40am" → 08:40:00
- "8:40:30" → 08:40:30
- "08:40" → 08:40:00
- "840" → 08:40:00 (smart parse)

System suggests based on log content:
"Found 23 errors starting at 08:40:03 - fold before this time?"
```

---

### Scenario 9b: Problems Panel Reflects Folding State

**Context:**
```
Log file has 234 diagnostics
Engineer folds timeframes to focus on incident window
Problems Panel should show ONLY diagnostics in visible sections
```

**Before Folding:**
```
Problems Panel (234 problems):
├─ ERROR (45)
│   ├─ Line 1235: Database timeout
│   ├─ Line 3457: Memory high
│   ├─ Line 5679: RTP timeout ← In incident window
│   ├─ Line 8234: Connection lost
│   └─ ... (41 more)
├─ WARNING (123)
└─ INFO (66)
```

**After Folding (14:20-14:30 incident window):**
```
[10:00-14:19:59] ... (45,234 lines folded)
▼ 14:20:00 - 14:30:00 (327 lines visible)
  14:23:15 [ERROR] RTP timeout
  14:24:30 [WARN] High packet loss
[14:30:01-16:00:00] ... (42,895 lines folded)

Problems Panel (3 problems - FILTERED):
├─ ERROR (1)
│   └─ Line 5679: RTP timeout ← Visible in editor
├─ WARNING (2)
│   ├─ Line 5681: High packet loss ← Visible
│   └─ Line 5695: Codec mismatch ← Visible
└─ (231 problems in folded sections - hidden)
```

**Benefits:**
- Problems Panel stays synchronized with editor view
- No confusion from invisible diagnostics
- Click diagnostic → guaranteed to be in visible section
- Toggle: "Show All Problems" vs. "Show Visible Problems Only"

**User Control:**
```
Problems Panel Toolbar:
[🔍 Show: ▼]
├─ All Problems (234)
├─ Visible Problems Only (3) ← Active when folding
└─ Folded Problems (231)

[Filter Options ▼]
├─ ☑️ Hide folded sections
├─ ☐ Show count badge: "(231 hidden)"
└─ ☐ Dim folded problems (gray out)
```

**Interaction Examples:**

**Example 1: Click folded problem**
```
User clicks problem in "folded sections"
→ System automatically unfolds that section
→ Jumps to diagnostic line
→ Problems Panel updates to show newly visible problems
```

**Example 2: Expand folded region**
```
User clicks to expand folded region in editor
→ Problems Panel instantly updates
→ Shows diagnostics from newly expanded section
→ Badge updates: "(231 hidden)" → "(198 hidden)"
```

**Example 3: Fold region with problems**
```
User folds section containing 15 diagnostics
→ Problems Panel removes those 15 from visible list
→ Shows notification: "15 problems now hidden in folded sections"
→ Can click notification to see hidden problems
```

---

### Scenario 10: Multi-File Synchronized Folding

**Context:**
```
Engineer analyzing 3 related logs simultaneously
Same Call-ID in all 3 logs
Wants to fold all 3 logs to same Call-ID
```

**Action:**
```
1. Open 3 log files side-by-side
2. Select Call-ID in first file
3. Right-click → "Fold by Call-ID (All Files)"
4. System folds same Call-ID in all 3 files
```

**Result:**
```
File 1 (CUCM):           File 2 (Jabber):         File 3 (Gateway):
▼ Call abc123            ▼ Call abc123            ▼ Call abc123
  INVITE sent              INVITE received          INVITE forwarded
  180 Ringing              Alerting user            100 Trying
  200 OK                   Answer accepted          200 OK
  BYE                      Call ended               BYE received
```

**Benefits:**
- Correlated view across multiple logs
- Same fold state in all files
- Easy to follow call flow across systems

---

## Implementation Considerations

### VS Code Folding Providers

**Language Server Integration:**
```typescript
// LSP server provides folding ranges
interface FoldingRange {
  startLine: number;
  endLine: number;
  kind?: 'comment' | 'imports' | 'region';
}

// Custom fold kinds for logs:
- 'timeframe'
- 'loglevel'
- 'thread'
- 'session'
- 'pattern'
```

**Dynamic Folding:**
```
LSP server calculates fold ranges based on:
├─ Log format detection (timestamp, log level, thread ID)
├─ Pattern matching (Call-ID, Session-ID, etc.)
├─ User-defined markers (bookmarks, diagnostics)
└─ Behavioral hints (frequently folded patterns)
```

---

## UI/UX Concepts

### Fold Gutter Icons:
```
Line numbers:
  1234 ▼ [10:00-14:00] ... (25,000 lines folded)
       │
       └─ Click to expand/collapse
```

### Fold Peek (Hover):
```
Hover over folded region:
┌─────────────────────────────────────────┐
│ [10:00-14:00] (25,000 lines folded)     │
│                                          │
│ Preview (first 3 and last 3 lines):     │
│   10:00:01 [INFO] System started        │
│   10:00:02 [INFO] Loading config        │
│   10:00:03 [DEBUG] Modules init         │
│   ...                                    │
│   13:59:58 [DEBUG] Heartbeat            │
│   13:59:59 [INFO] Hour complete         │
│   14:00:00 [INFO] New hour started      │
│                                          │
│ [Click to expand] [Shift+Click: peek]   │
└─────────────────────────────────────────┘
```

### Fold Configuration UI:
```
┌─────────────────────────────────────────┐
│ Folding Configuration                    │
├─────────────────────────────────────────┤
│                                          │
│ ☑️ Fold by Log Level                    │
│   ☑️ DEBUG                              │
│   ☐ INFO                                │
│   ☐ WARN                                │
│   ☐ ERROR                               │
│                                          │
│ ☑️ Fold by Timeframe                    │
│   Keep visible: 14:00:00 - 15:00:00     │
│   Fold everything else                  │
│                                          │
│ ☑️ Fold by Pattern                      │
│   Pattern: "HEARTBEAT.*keepalive"       │
│   Action: Fold all matches              │
│                                          │
│ ☐ Fold by Thread ID                    │
│   (No thread ID detected in this log)   │
│                                          │
│ [Apply] [Save As...] [Cancel]           │
│                                          │
└─────────────────────────────────────────┘
```

---

## Key Benefits

### 1. Reduced Cognitive Load
- See only relevant information
- Hide noise without losing it
- Visual hierarchy preserved
- Problems Panel shows only visible diagnostics
- **Time-based folding: "Show only since 8:40 AM"**

### 2. Faster Navigation
- Jump between folded sections quickly
- Bookmark + fold = laser focus
- Less scrolling, more analyzing
- No confusion from invisible problems
- **One command to hide hours of irrelevant logs**

### 3. Context Preservation
- Fold regions show what's hidden
- Easy to expand for more detail
- Never lose your place
- Problems count shows hidden vs. visible

### 4. Flexible Investigation
- Start folded, progressively expand
- Fold/unfold as investigation evolves
- Multiple folding strategies
- Problems Panel adapts to current view

### 5. Team Consistency
- Share fold configurations
- Standard views for common issues
- Faster onboarding
- Consistent problem visibility

### 6. Synchronized State (NEW)
- Editor folding ↔ Problems Panel in sync
- No "ghost" problems in panel from folded sections
- Click problem → always jumps to visible line
- Clear indication of hidden problems count

---

## Key Questions

1. **Default Folding State**: 
   - Open logs fully expanded?
   - Auto-fold based on file size?
   - Remember last fold state per file?
   - Auto-suggest time-based folding on open?
     - "This log spans 10 hours. Show only recent logs?"

2. **Fold Granularity**:
   - How small can fold regions be? (minimum lines)
   - Allow single-line folds?
   - Nested folds supported?

3. **Performance**:
   - Can we fold 100,000+ line files?
   - Real-time fold calculations?
   - Cache fold ranges?

4. **Persistence**:
   - Save fold state per file?
   - Save fold state per workspace?
   - Global fold preferences?

5. **Multi-File Folding**:
   - Synchronize fold state across files?
   - Fold by shared keys (Call-ID)?
   - Performance implications?

6. **Pattern Learning**:
   - Learn which sections users fold frequently?
   - Auto-suggest fold configurations?
   - Community-shared fold patterns?
   - Remember common time windows (e.g., "always fold before 8 AM")?

7. **Problems Panel Sync**:
   - Filter problems by default when folding?
   - Show hidden problem count badge?
   - Allow clicking hidden problems to unfold?
   - Separate "Visible" and "Hidden" problem groups?

8. **Performance with Problems**:
   - Real-time filtering as folding changes?
   - Cache problem visibility state?
   - Batch updates for multiple fold operations?

---

## Related Scenarios
- `scenario-bookmarking-system.md` - Bookmarks drive folding focus
- `scenario-multi-log-correlation.md` - Folding across multiple files
- `scenario-symptom-targeted-analysis.md` - Fold to symptom-relevant sections
- `scenario-behavioral-learning.md` - Learn folding preferences

---

**Status**: 📋 Planned
**Priority**: High - Significantly improves large log navigation
**Complexity**: Medium - VS Code folding provider API available
**Dependencies**: 
- LSP server folding range provider
- Log format detection
- Pattern matching engine