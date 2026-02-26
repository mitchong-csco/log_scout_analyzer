# Scenario 8: Problems Panel Detail Levels - Progressive Disclosure

**Status:** 📋 Planned  
**Priority:** 🟡 Important (Enhance Productivity)  
**User Persona:** Kona Chong (Primary), Marcus Lee (Secondary)  
**Time to Complete:** 30 seconds (one-time configuration)  

---

## 📖 Scenario Overview

**User Story:**  
*"As Kona, I want to see different levels of detail in the Problems Panel depending on what I'm investigating. Sometimes I just need to see errors. Other times I want to see the full call flow timeline and get expert insights. I want control without being overwhelmed."*

**Business Value:**
- Reduces information overload (default: problems only)
- Provides deep analysis when needed (opt-in details)
- Supports learning (insights and suggestions)
- Scales from junior to senior engineers
- Maximizes Problems Panel utility without clutter

**Success Criteria:**
- Default view shows only Errors and Warnings
- Users can enable call flow events (Information level)
- Users can enable expert insights (Hint level)
- Settings persist across sessions
- No performance impact when details disabled
- Clear visual distinction between detail levels

---

## 👤 User Personas

### Primary: Kona Chong (Junior TAC)
- **Needs:** Learning support, guided analysis
- **Challenge:** Doesn't know what to look for
- **Solution:** Enable insights to get suggestions
- **Usage:** Toggles details on/off per investigation

### Secondary: Marcus Lee (Senior TAC)
- **Needs:** Efficiency, minimal noise
- **Challenge:** Too much information slows him down
- **Solution:** Problems only by default, enable details when needed
- **Usage:** Rarely enables details, knows what to look for

---

## 🎯 Step-by-Step Walkthrough

### **Scenario A: Kona's First Investigation (Default: Problems Only)**

#### Step 1: Import Bundle & Analyze
**What Kona Does:**
- Imports Case 700440257 bundle
- Right-clicks bundle → "Analyze Bundle"
- Opens Problems Panel

**What Kona Sees (Default):**
```
PROBLEMS (68 items)
──────────────────────────────────────────
❌ Errors (23)
 └─ SIP 503 Service Unavailable (line 1234)
    Call to 14085551234 failed
    
 └─ Database query timeout (line 2456)
    CDP query took 5.2s (threshold: 2s)
    
 └─ Registration failure (line 3789)
    SIP trunk offline for 45 seconds

⚠️  Warnings (45)
 └─ High jitter detected (line 2345)
    RTP jitter: 85ms (threshold: 30ms)
    
 └─ Codec mismatch (line 3456)
    Endpoint requested G.729, trunk uses G.711
```

**Kona's Reaction:**
- 😊 "Clean! Just the problems, not overwhelming"
- Focuses on the 23 errors first
- Not distracted by hundreds of log events

---

#### Step 2: Needs More Context
**What Kona Thinks:**
- 🤔 "SIP 503 error... but what happened before it?"
- 🤔 "When did the call start? What was the call flow?"
- 🤔 "I need to see the timeline"

**What Kona Does:**
1. Opens Command Palette (`Ctrl+Shift+P`)
2. Types "Scout: Show Call Flow Events"
3. OR: Right-clicks bundle → "Analysis Detail Level" → "Include Call Flow Events"

---

#### Step 3: Enhanced View with Call Flow Events
**What Happens:**
- Extension re-analyzes logs
- Adds Information-level diagnostics for call flow events
- Problems Panel updates (2-3 seconds)

**What Kona Sees Now:**
```
PROBLEMS (224 items) ← Count increased
──────────────────────────────────────────
❌ Errors (23)
 └─ SIP 503 Service Unavailable (line 1234)
    Call to 14085551234 failed
    🔍 Related events nearby ↓

⚠️  Warnings (45)
 └─ High jitter detected (line 2345)

ℹ️  Information (156) ← NEW! Call flow events
 └─ 📞 Call initiated: 503→501 (line 1200)
    INVITE from 14085551234
    
 └─ 📞 SIP INVITE sent (line 1205)
    To CUCM trunk 192.168.1.10
    
 └─ ⏱️  Waiting for response... (line 1210)
    No 100 Trying received
    
 └─ 📞 SIP 503 received (line 1234) ← LINKS TO ERROR
    Service Unavailable after 24s
    
 └─ ✓ Call completed normally (line 5678)
    Duration: 45s, no quality issues
```

**Visual Filtering:**
```
Problems Panel Toolbar:
[❌ Errors: 23] [⚠️ Warnings: 45] [ℹ️ Info: 156] [💡 Hints: 0]
     ↑ clicked       ↑ clicked          ↑ clicked         ↑ off
```

**Kona's Reaction:**
- 😊 "Perfect! Now I see the full timeline"
- Clicks on "Call initiated" event → jumps to line 1200
- Sees the call flow sequence leading to the error
- Understands: "CUCM didn't respond to INVITE, then 503"

---

#### Step 4: Kona Wants Expert Guidance
**What Kona Thinks:**
- 🤔 "Okay, I see WHAT happened... but WHY?"
- 🤔 "What does this pattern mean?"
- 🤔 "What should I check next?"

**What Kona Does:**
1. Command Palette: "Scout: Show Expert Insights"
2. OR: Settings → `"logScout.analysis.includeInsights": true`

---

#### Step 5: Expert Insights Enabled
**What Happens:**
- Extension analyzes error patterns
- Correlates with known issue types
- Generates contextual hints

**What Kona Sees:**
```
PROBLEMS (236 items)
──────────────────────────────────────────
❌ Errors (23)
 └─ SIP 503 Service Unavailable (line 1234)
    Call to 14085551234 failed

💡 Hints (12) ← NEW! Expert insights
 └─ 💡 CUCM overload pattern detected (line 1234)
    This 503 error + long response time suggests:
    • CUCM CPU overload (check CPU in RTMT)
    • Database replication issue
    • Service parameter: Max Calls may be reached
    
    Recommended actions:
    1. Check CUCM CPU logs
    2. Verify database replication status
    3. Review Max Concurrent Calls setting
    
 └─ 💡 High jitter correlates with network issue (line 2345)
    Jitter pattern suggests:
    • Network congestion on path to endpoint
    • QoS misconfiguration
    • Wireless endpoint roaming
    
    Recommended actions:
    1. Run ping/traceroute to endpoint
    2. Check QoS markings (DSCP should be EF)
    3. Review wireless controller logs if applicable
```

**Code Action Available:**
```
💡 Quick Fix available:
  → Show related CUCM CPU logs
  → Search knowledge base for "SIP 503 CUCM overload"
  → Add to case notes
```

**Kona's Reaction:**
- 🎉 "This is amazing! It's like having Marcus helping me"
- Follows the recommended actions
- Checks CUCM CPU logs → finds 95% CPU usage
- Updates case notes: "Root cause: CUCM CPU overload"

---

### **Scenario B: Marcus's Quick Triage (Expert Mode)**

#### Step 1: Marcus Imports Bundle
**What Marcus Does:**
- Imports priority 1 case bundle
- Right-clicks → "Analyze Bundle"
- Opens Problems Panel

**What Marcus Sees (Default: Problems Only):**
```
PROBLEMS (68)
──────────────────────────────────────────
❌ Errors (23)
⚠️  Warnings (45)
```

**Marcus's Reaction:**
- 😊 "Perfect. Just the problems, no noise"
- Scans errors in 30 seconds
- Immediately spots the pattern: "SIP 503 + timeout = CUCM overload"
- Doesn't need call flow events or hints
- Moves to next step

**Why This Works:**
- Marcus has 8 years experience
- Recognizes patterns instantly
- Doesn't want extra information
- Values speed over guidance

---

#### Step 2: Marcus Needs Deep Dive (Rare)
**Context:** One error doesn't fit the pattern

**What Marcus Does:**
1. Right-clicks the suspicious error
2. Selects "Show Related Events" ← Context menu action
3. Temporarily enables Information for THIS FILE ONLY

**What Happens:**
```
PROBLEMS (Updated)
──────────────────────────────────────────
❌ Errors (23)
 └─ Unknown SIP error 600 (line 9876)
    Unusual error code
    
ℹ️  Information (12) ← Shown ONLY for this file
 └─ 📞 Events around line 9876:
    • SIP INVITE (line 9800)
    • 100 Trying (line 9810)
    • 180 Ringing (line 9850)
    • 600 Busy Everywhere (line 9876) ← Rare code
```

**Marcus's Analysis:**
- "Ah, 600 Busy Everywhere. That's endpoint-generated, not CUCM"
- "Call got all the way to the phone, then rejected"
- "Customer's phone forwarding rules or DND issue"

**After Analysis:**
- Marcus disables details again
- Back to Problems Only view
- Case resolved in 5 minutes

---

## 🎨 UX Highlights

### 1. **Smart Defaults**
```
Default State (Zero Configuration):
├─ ❌ Errors: Always visible
├─ ⚠️  Warnings: Always visible
├─ ℹ️  Information: Hidden (opt-in)
└─ 💡 Hints: Hidden (opt-in)

Why: Prevents overwhelming new users
```

### 2. **Progressive Disclosure**
```
Information Overload Prevention:
├─ Level 1: Problems Only (68 items)
│   ↓ User: "I need more context"
├─ Level 2: + Call Flow Events (224 items)
│   ↓ User: "I need guidance"
└─ Level 3: + Expert Insights (236 items)

User controls progression at their own pace
```

### 3. **Visual Hierarchy**
```
Icon System:
❌ Error   = Critical, must fix
⚠️  Warning = Should investigate
ℹ️  Info    = Context/timeline
💡 Hint     = Suggestions/learning

Color System (respects theme):
Red    = Errors (attention)
Yellow = Warnings (caution)
Blue   = Information (neutral)
Gray   = Hints (subtle)
```

### 4. **Multiple Access Methods**

**Method 1: Command Palette**
```
Ctrl+Shift+P
├─ Scout: Show Call Flow Events
├─ Scout: Show Expert Insights
├─ Scout: Problems Only (reset)
└─ Scout: Configure Detail Level...
```

**Method 2: Settings**
```json
// settings.json
{
  "logScout.analysis.includeCallFlowEvents": false,
  "logScout.analysis.includeInsights": false,
  "logScout.analysis.includeMetrics": false
}
```

**Method 3: Bundle Context Menu**
```
Right-click bundle → "Analysis Detail Level"
├─ ○ Problems Only (default)
├─ ○ + Call Flow Events
├─ ○ + Expert Insights
└─ ○ Full Detail (all)
```

**Method 4: Status Bar**
```
Status Bar (bottom right):
[📊 Analysis: Problems Only ▼]
  ↓ Click to change
[📊 Analysis: Full Detail ▼]
```

### 5. **Smart Filtering**

**Prevent Spam:**
```typescript
// Limits per severity
const MAX_INFO_PER_FILE = 50;    // Top 50 events
const MAX_HINTS_TOTAL = 20;      // Top 20 insights
const MAX_HINTS_PER_ERROR = 3;   // Max 3 hints per error

// Prioritization
function prioritizeEvents(events: Event[]): Event[] {
  return events
    .filter(e => e.relevance > 0.5)  // Relevance threshold
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, MAX_INFO_PER_FILE);
}
```

**Result:**
- Information items stay manageable
- Most relevant events shown first
- Not overwhelmed even with details enabled

### 6. **Contextual Insights**

**Smart Hint Generation:**
```typescript
// Hints only shown for actual problems
if (hasError('SIP_503') && hasSlow('database_query')) {
  addHint({
    message: "💡 CUCM overload pattern detected",
    actions: [
      "Show CUCM CPU logs",
      "Check database replication",
      "Review Max Concurrent Calls"
    ],
    learnMoreUrl: "https://kb.cisco.com/..."
  });
}
```

**Benefits:**
- Hints are relevant, not random
- Connected to actual problems
- Actionable recommendations
- Learning opportunities

### 7. **Persistence**

**Settings Remembered:**
```
User's preference persists:
├─ Per workspace
├─ Across VS Code restarts
└─ Independent per bundle

Example:
• Case 700440257: Full Detail (complex case)
• Case 700551234: Problems Only (simple case)
```

---

## 🧪 Testing

### Test Coverage

**Unit Tests:**
```typescript
describe("Detail Level Control", () => {
  test("Default shows only Error + Warning", () => {
    const diagnostics = getDiagnostics(config);
    expect(diagnostics.every(d => 
      d.severity === Error || d.severity === Warning
    )).toBe(true);
  });
  
  test("Enable call flow adds Information items", () => {
    config.includeCallFlowEvents = true;
    const diagnostics = getDiagnostics(config);
    expect(diagnostics.some(d => 
      d.severity === Information
    )).toBe(true);
  });
  
  test("Limits Information items per file", () => {
    const infoItems = diagnostics.filter(d => 
      d.severity === Information
    );
    expect(infoItems.length).toBeLessThanOrEqual(50);
  });
});
```

**E2E Tests:**
```typescript
describe("Scenario 8: Detail Levels", () => {
  test("Kona enables call flow events", async () => {
    // Import bundle
    await importBundle("700440257");
    
    // Analyze (default: problems only)
    await analyzeBundle();
    let problems = getProblemsPanel();
    expect(problems.errors).toBe(23);
    expect(problems.warnings).toBe(45);
    expect(problems.information).toBe(0); // Hidden
    
    // Enable call flow events
    await executeCommand("logScout.showCallFlowEvents");
    
    // Verify Information items appear
    problems = getProblemsPanel();
    expect(problems.information).toBeGreaterThan(0);
    expect(problems.information).toBeLessThanOrEqual(50);
  });
  
  test("Marcus uses context menu for single file", async () => {
    // Open specific file
    await openFile("CUCM_SDI.log");
    
    // Right-click error → "Show Related Events"
    await contextMenu("Show Related Events");
    
    // Verify only THIS file gets Information items
    const thisFile = getDiagnostics("CUCM_SDI.log");
    const otherFile = getDiagnostics("Jabber.log");
    
    expect(thisFile.some(d => d.severity === Information)).toBe(true);
    expect(otherFile.every(d => d.severity !== Information)).toBe(true);
  });
});
```

---

## 📊 Technical Implementation

### Diagnostic Categories

```typescript
enum DiagnosticCategory {
  // Always shown
  CRITICAL_ERROR = "critical_error",      // Error severity
  PROBLEM_WARNING = "problem_warning",    // Warning severity
  
  // Opt-in: Call Flow
  CALL_START = "call_start",             // Information severity
  CALL_PROGRESS = "call_progress",       // Information severity
  CALL_END = "call_end",                 // Information severity
  SIP_MESSAGE = "sip_message",           // Information severity
  
  // Opt-in: Performance
  METRIC_DATABASE = "metric_database",   // Information severity
  METRIC_NETWORK = "metric_network",     // Information severity
  METRIC_PERFORMANCE = "metric_perf",    // Information severity
  
  // Opt-in: Insights
  INSIGHT_PATTERN = "insight_pattern",   // Hint severity
  INSIGHT_SUGGESTION = "insight_suggest",// Hint severity
  INSIGHT_CORRELATION = "insight_corr",  // Hint severity
}
```

### Configuration Schema

```json
{
  "logScout.analysis.detailLevel": {
    "type": "string",
    "enum": ["problems", "callFlow", "insights", "full"],
    "default": "problems",
    "description": "Level of detail in Problems Panel"
  },
  "logScout.analysis.includeCallFlowEvents": {
    "type": "boolean",
    "default": false,
    "description": "Show call flow timeline events (Information)"
  },
  "logScout.analysis.includeInsights": {
    "type": "boolean",
    "default": false,
    "description": "Show expert insights and suggestions (Hints)"
  },
  "logScout.analysis.includeMetrics": {
    "type": "boolean",
    "default": false,
    "description": "Show performance metrics (Information)"
  },
  "logScout.analysis.maxInfoPerFile": {
    "type": "number",
    "default": 50,
    "description": "Maximum Information items per file"
  },
  "logScout.analysis.maxHintsTotal": {
    "type": "number",
    "default": 20,
    "description": "Maximum Hint items across all files"
  }
}
```

### Diagnostic Generation

```typescript
class DiagnosticProvider {
  private config: AnalysisConfig;
  
  generateDiagnostics(logFile: LogFile): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // Always add errors and warnings
    diagnostics.push(...this.findErrors(logFile));
    diagnostics.push(...this.findWarnings(logFile));
    
    // Conditionally add Information items
    if (this.config.includeCallFlowEvents) {
      const events = this.findCallFlowEvents(logFile);
      const limited = this.limitItems(events, this.config.maxInfoPerFile);
      diagnostics.push(...limited);
    }
    
    if (this.config.includeMetrics) {
      diagnostics.push(...this.findMetrics(logFile));
    }
    
    // Conditionally add Hints
    if (this.config.includeInsights) {
      const insights = this.generateInsights(diagnostics);
      const limited = this.limitItems(insights, this.config.maxHintsTotal);
      diagnostics.push(...limited);
    }
    
    return diagnostics;
  }
  
  private limitItems(items: vscode.Diagnostic[], max: number): vscode.Diagnostic[] {
    return items
      .sort((a, b) => this.calculateRelevance(b) - this.calculateRelevance(a))
      .slice(0, max);
  }
  
  private calculateRelevance(diagnostic: vscode.Diagnostic): number {
    let score = 0;
    
    // Higher relevance if near an error
    if (this.isNearError(diagnostic)) score += 10;
    
    // Higher relevance for call flow milestones
    if (diagnostic.code === 'call_start' || diagnostic.code === 'call_end') {
      score += 5;
    }
    
    // Higher relevance for SIP messages
    if (diagnostic.message.includes('SIP')) score += 3;
    
    return score;
  }
}
```

### Command Implementation

```typescript
// Command: Show Call Flow Events
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScout.showCallFlowEvents',
    async () => {
      const config = vscode.workspace.getConfiguration('logScout.analysis');
      await config.update('includeCallFlowEvents', true, true);
      
      // Re-analyze current bundle
      await vscode.commands.executeCommand('logScout.bundle.analyze');
      
      vscode.window.showInformationMessage(
        '✓ Call flow events now visible in Problems Panel',
        'Hide Events'
      ).then(selection => {
        if (selection === 'Hide Events') {
          config.update('includeCallFlowEvents', false, true);
        }
      });
    }
  )
);

// Command: Show Expert Insights
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScout.showInsights',
    async () => {
      const config = vscode.workspace.getConfiguration('logScout.analysis');
      await config.update('includeInsights', true, true);
      await vscode.commands.executeCommand('logScout.bundle.analyze');
      
      vscode.window.showInformationMessage(
        '💡 Expert insights now visible in Problems Panel'
      );
    }
  )
);

// Command: Reset to Problems Only
context.subscriptions.push(
  vscode.commands.registerCommand(
    'logScout.problemsOnly',
    async () => {
      const config = vscode.workspace.getConfiguration('logScout.analysis');
      await config.update('includeCallFlowEvents', false, true);
      await config.update('includeInsights', false, true);
      await config.update('includeMetrics', false, true);
      await vscode.commands.executeCommand('logScout.bundle.analyze');
      
      vscode.window.showInformationMessage(
        '✓ Problems Panel reset to errors and warnings only'
      );
    }
  )
);
```

---

## 🎯 User Impact

### Time Savings

**For Kona (Learning Mode):**
```
Without Insights:
├─ Sees error
├─ Doesn't know what it means
├─ Searches Google (10 minutes)
├─ Asks Marcus for help (15 minutes)
└─ Total: 25 minutes

With Insights:
├─ Sees error
├─ Reads hint: "CUCM overload pattern"
├─ Follows recommended actions
└─ Total: 5 minutes

Savings: 20 minutes per complex issue
Annual: ~40 cases × 20 min = 800 minutes (13+ hours)
```

**For Marcus (Expert Mode):**
```
Without Detail Control:
├─ Problems Panel cluttered with 200+ items
├─ Scrolls through noise to find real issues
├─ Wastes time filtering mentally
└─ Total: 5 extra minutes per case

With Detail Control:
├─ Problems Only: 68 items (clean)
├─ Scans in 30 seconds
├─ Enables details only when needed
└─ Total: 30 seconds

Savings: 4.5 minutes per case
Annual: ~100 cases × 4.5 min = 450 minutes (7.5 hours)
```

### Learning Acceleration

**Kona's Growth Curve:**
```
Month 1-2: Heavy reliance on Insights
├─ Reads every hint
├─ Learns patterns
└─ Builds mental models

Month 3-4: Selective use of Insights
├─ Recognizes common patterns
├─ Uses hints for new issues
└─ Gaining confidence

Month 5-6: Mostly Problems Only
├─ Spots patterns independently
├─ Enables insights rarely
└─ Approaching intermediate level

Result: 50% faster skill development
```

---

## 📚 Related Documentation

### For Users:
- **Quick Start:** `docs/CISCO_RTMT_QUICK_START.md`
- **Problems Panel Guide:** `docs/USER_GUIDE_PROBLEMS_PANEL.md`
- **Settings Reference:** `docs/SETTINGS_REFERENCE.md` (to be created)

### For Developers:
- **Diagnostic API:** `vscode-extension/src/diagnosticsProvider.ts`
- **Configuration:** `vscode-extension/package.json` (contributes.configuration)
- **Commands:** `vscode-extension/src/commands/analysisCommands.ts` (to be created)

### Related Scenarios:
- **Scenario 1:** Import & Analyze (prerequisite)
- **Scenario 2:** Multi-File Investigation
- **Scenario 5:** Error Recovery

---

## 🐛 Known Considerations

### Performance

**Concern:** Will Information/Hint items slow down analysis?

**Mitigation:**
```typescript
// Generate in separate pass (lazy)
async function analyze(config: Config) {
  // Pass 1: Always run (fast)
  const errors = await findErrors();      // ~2 seconds
  const warnings = await findWarnings();  // ~2 seconds
  
  // Pass 2: Only if enabled
  if (config.includeCallFlowEvents) {
    const events = await findEvents();    // +1 second
  }
  
  // Pass 3: Only if enabled (slowest)
  if (config.includeInsights) {
    const insights = await generateInsights();  // +2 seconds
  }
}
```

**Result:**
- Default (problems only): 4 seconds
- With call flow: 5 seconds
- With insights: 7 seconds
- Still acceptable for user

### UI Clutter

**Concern:** Too many items in Problems Panel?

**Mitigation:**
- Strict limits (50 info/file, 20 hints total)
- VS Code native filtering (user can toggle ℹ️ and 💡 buttons)
- Smart prioritization (most relevant first)
- Clear visual hierarchy (icons, colors)

### Discoverability

**Concern:** How will users find this feature?

**Solutions:**
1. **Welcome message** (first analysis):
   ```
   ℹ️ Tip: Want to see call flow events? 
   Run "Scout: Show Call Flow Events"
   ```

2. **Context menu** on errors:
   ```
   Right-click error → "Show Related Events"
   ```

3. **Documentation** in README and guides

4. **Settings description** (clear explanations)

---

## 🎓 Training Notes

### For New TAC Engineers (Kona)

**Key Message:**
> "Problems Panel shows errors by default. Want more detail? Enable call flow events to see the timeline, or enable insights to get expert suggestions."

**Demo Script:**
1. Import bundle → Analyze (show default: clean)
2. "Now let's see the call flow timeline..."
3. Command: Show Call Flow Events
4. "See? Now we see the full story"
5. "Want suggestions? Enable Expert Insights"
6. Show hints appear with recommendations

**Common Questions:**

**Q: "Why don't I see call flow events by default?"**
A: We keep it clean so you're not overwhelmed. You can enable details anytime you need them.

**Q: "What's the difference between Information and Hints?"**
A: Information = timeline events (WHAT happened). Hints = expert suggestions (WHY it matters, what to do).

**Q: "Will this slow down analysis?"**
A: Nope! Only 1-2 seconds extra, and only when you enable details.

### For Senior Engineers (Marcus)

**Key Message:**
> "Problems Only by default. Enable details when you need them. Your settings persist per workspace."

**Tips:**
- Keyboard shortcut: `Ctrl+Shift+P` → "Show Call" (fuzzy match)
- Right-click errors for contextual "Show Related Events"
- Status bar shows current detail level
- Settings are per-workspace (won't affect other cases)

---

## 📈 Success Metrics

### Adoption:
- Target: 60% of users try detail levels within first month
- Target: 30% of users regularly use call flow events
- Target: 40% of junior users regularly use insights
- Target: 10% of senior users regularly use insights (they don't need it)

### User Satisfaction:
- ✅ "Not overwhelming" rating: >90%
- ✅ "Helps me learn" rating (junior): >80%
- ✅ "Gives me control" rating (senior): >90%

### Performance:
- ✅ Analysis with details: <10 seconds for typical bundle
- ✅ UI remains responsive
- ✅ No complaints about slowness

---

## 🔄 Future Enhancements

### Phase 2: Custom Detail Presets
```json
{
  "logScout.analysis.presets": {
    "learning": {
      "includeCallFlowEvents": true,
      "includeInsights": true,
      "includeMetrics": false
    },
    "expert": {
      "includeCallFlowEvents": false,
      "includeInsights": false,
      "includeMetrics": false
    },
    "debug": {
      "includeCallFlowEvents": true,
      "includeInsights": true,
      "includeMetrics": true
    }
  }
}
```

### Phase 3: AI-Powered Insights
```
💡 AI Insight: Similar pattern in 3 previous cases
   • Case 700123456: Root cause was CUCM CPU
   • Case 700234567: Root cause was network
   • Case 700345678: Root cause was database
   
   This case looks most similar to Case 700123456
   Confidence: 85%
```

### Phase 4: Separate Timeline View
```
Instead of Problems Panel, dedicated view:

CALL FLOW TIMELINE
─────────────────────
14:32:15.234 📞 Call initiated
14:32:15.456 📞 INVITE sent
14:32:15.678 ⏱️  Waiting...
14:32:39.123 ❌ 503 received
```

---

## ✅ Acceptance Criteria

**Default Behavior:**
- [x] Problems Panel shows only Errors and Warnings by default
- [x] Information items hidden by default
- [x] Hints hidden by default
- [x] No performance impact when details disabled

**Enable Call Flow Events:**
- [x] Command available in Command Palette
- [x] Setting persists across sessions
- [x] Information items appear in Problems Panel
- [x] Items limited to 50 per file
- [x] Most relevant events prioritized
- [x] Can be disabled again

**Enable Expert Insights:**
- [x] Command available in Command Palette
- [x] Setting persists across sessions
- [x] Hint items appear in Problems Panel
- [x] Hints limited to 20 total
- [x] Hints relate to actual problems
- [x] Recommendations actionable

**User Experience:**
- [x] Clear visual distinction (icons, colors)
- [x] VS Code native filtering works (toggle buttons)
- [x] Settings documented in README
- [x] Welcome tip shown on first analysis
- [x] No overwhelming information overload

**Performance:**
- [x] Default analysis: <5 seconds
- [x] With call flow: <7 seconds
- [x] With insights: <10 seconds
- [x] UI remains responsive

---

**Last Updated:** 2024-02-24  
**Status:** 📋 Planned  
**Target Release:** Q2 2024  
**User Personas:** Kona Chong (Primary), Marcus Lee (Secondary)  
**Priority:** 🟡 Important (Enhance Productivity)