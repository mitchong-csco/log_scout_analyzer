# Scenario: Multi-Analysis Views (Flip Between Perspectives)

## Overview
Engineer creates multiple targeted analyses for the same log bundle, each focusing on different symptoms or investigation angles. System preserves each analysis as a separate view that can be switched between, allowing progressive discovery and multi-perspective troubleshooting.

## Problem Statement
Traditional single-pass analysis forces engineer to either:
- Load all patterns (overwhelming noise)
- Choose one symptom upfront (may miss related issues)
- Re-analyze from scratch if investigation pivots

**Better approach:** Create multiple analysis views for same logs, flip between them as investigation evolves.

---

## Core Concept

```
Same Log Bundle → Multiple Targeted Analyses → Flip Between Views

Bundle: customer_logs.zip
├─ Analysis #1: "Call Drops" (50 patterns, 23 findings)
├─ Analysis #2: "Audio Quality" (35 patterns, 15 findings)
├─ Analysis #3: "Network Path" (28 patterns, 8 findings)
└─ Analysis #4: "Full Scan" (500 patterns, 1,247 findings)

Engineer switches between analyses as investigation evolves
Each analysis preserves its state, findings, and context
```

---

## Scenarios

### Scenario 1: Progressive Investigation

**Initial Analysis**
```
Engineer creates: "Call Drops" analysis
Target: Calls dropping after 30 seconds
Patterns loaded: 50 call drop patterns
Findings: 23 issues detected
Action: Bookmarks 3 critical findings
Status: Potential root cause identified (RTP timeout)
```

**Second Perspective**
```
Engineer creates: "Audio Quality" analysis (same logs)
Target: Audio degradation patterns
Patterns loaded: 35 media quality patterns
Findings: 15 issues detected
Cross-reference: Overlaps with "Call Drops" bookmarks
Confirmation: Both analyses point to same RTP timeout at 14:23:47
```

**Deep Dive**
```
Engineer creates: "Network Path" analysis
Target: NAT/firewall issues
Scope: Focused on bookmarked timeframe (14:23:40-14:24:00)
Patterns loaded: 28 network patterns
Findings: 8 issues detected
Result: NAT configuration issue found → ROOT CAUSE
```

**Outcome:**
- Engineer flips between all 3 analyses
- Each provides different perspective on same issue
- Bookmarks link related findings across analyses
- Root cause confirmed by multiple viewpoints

---

### Scenario 2: Compare Working vs. Failed

**Setup:**
```
Same bundle contains:
- 15 failed calls (dropped)
- 85 successful calls (completed)
```

**Analysis #1: Failed Calls**
```
Target: Only analyze failed call timeframes
Patterns: Call drop + media failure patterns
Timeframe: 14:20-14:30 (when drops occurred)
Findings:
├─ All failed calls used G.729 codec
├─ All required NAT traversal
├─ All had RTP timeout
└─ All routed through Gateway A
```

**Analysis #2: Successful Calls**
```
Target: Analyze successful call timeframes
Patterns: Same patterns as Analysis #1
Timeframe: 14:20-14:30 (same window)
Findings:
├─ All successful calls used G.711 codec
├─ All used direct routing (no NAT)
├─ No RTP timeouts
└─ Mixed gateway routing
```

**Comparison View:**
```
Side-by-side comparison reveals:
├─ Common factor: G.729 + NAT = failure
├─ Root cause: Gateway A's G.729 DSP resources exhausted
├─ Solution: Increase DSP licenses or avoid G.729 on that gateway
└─ Prevention: Load balance G.729 calls across gateways
```

---

### Scenario 3: Team Collaboration Handoff

**Day 1: Engineer A (Initial Triage)**
```
Creates: "Initial Triage" analysis
Action: Broad scan with common patterns
Findings: 50+ issues found
Bookmarks:
├─ 5 suspicious NAT-related items
├─ 3 database slow queries
└─ 2 certificate warnings
Notes: "Focus on NAT issues - seem most relevant"
Handoff: Assigns to Engineer B (network specialist)
```

**Day 2: Engineer B (Deep Dive)**
```
Opens bundle, sees Engineer A's analysis
Reviews: Engineer A's bookmarks
Creates: "Deep Dive - NAT Issues" analysis
Target: NAT/firewall patterns only
Scope: Focused on timeframes from bookmarks
Patterns loaded: 45 network patterns
Findings: 12 NAT-related issues
Root cause: NAT binding timeout (30s default, calls drop at 32s)
Bookmarks: Adds evidence chain linking 3 key findings
Resolution: Recommends SIP keep-alive configuration
```

**Day 3: Engineer A (Review & Close)**
```
Returns to bundle
Flips to: Engineer B's "Deep Dive - NAT Issues" analysis
Reviews: Evidence chain bookmarks
Validates: Solution matches symptoms
Action: Implements SIP keep-alive (OPTIONS ping every 25s)
Creates: "Post-Fix Verification" analysis
Result: No drops after fix applied
Status: Case closed
```

---

### Scenario 4: Multi-Symptom Investigation

**User Report:**
```
"Calls have multiple issues:
- Some drop after 30 seconds
- Some have poor audio quality
- Some won't connect at all"
```

**Analysis Strategy:**
```
Create 3 separate analyses for each symptom:

Analysis #1: "Call Drops"
├─ Target: Mid-call disconnects
├─ Patterns: 40 call drop patterns
└─ Findings: 15 drops, all at ~30s mark

Analysis #2: "Audio Quality"
├─ Target: Poor audio, choppy, robotic
├─ Patterns: 35 media quality patterns
└─ Findings: 22 quality issues, high packet loss

Analysis #3: "Call Setup Failures"
├─ Target: Calls never connect
├─ Patterns: 50 signaling patterns
└─ Findings: 8 setup failures, SIP timeouts

Cross-Analysis Discovery:
├─ Call drops: NAT timeout (root cause #1)
├─ Audio quality: Network congestion (root cause #2)
└─ Setup failures: Database overload (root cause #3)

Conclusion: 3 separate issues, not 1 systemic problem
```

---

### Scenario 5: Timeframe-Focused Analysis

**Scenario:**
```
"Issue started at 2:45 PM, lasted 10 minutes"
```

**Analysis #1: Pre-Incident Baseline**
```
Target: Normal operation before incident
Timeframe: 14:30-14:45 (15 min before)
Patterns: Health check patterns
Findings: System normal, no warnings
Purpose: Establish baseline for comparison
```

**Analysis #2: Incident Window**
```
Target: The actual incident
Timeframe: 14:45-14:55 (10 min incident)
Patterns: All error patterns
Findings: 67 errors, 23 critical
Pattern: Spike in database connection timeouts
```

**Analysis #3: Post-Incident Recovery**
```
Target: System recovery after incident
Timeframe: 14:55-15:10 (15 min after)
Patterns: Recovery patterns
Findings: Gradual return to normal
Observation: 5 min recovery time
```

**Timeline View:**
```
Flip between analyses to see:
├─ Before: Normal (baseline)
├─ During: Chaos (incident)
└─ After: Recovery (resolution)

Root cause: Database backup job started at 14:44
Solution: Reschedule backups to off-hours
```

---

### Scenario 6: Pattern Refinement via Multiple Runs

**First Pass: Broad Analysis**
```
Analysis: "Full Scan"
Patterns: All 500 patterns loaded
Findings: 1,247 findings
Problem: Too much noise, can't identify issue
Action: Engineer hides 200 noisy patterns
Time: 45 minutes wasted
```

**Second Pass: Targeted Analysis**
```
Analysis: "Call Quality - Refined"
Patterns: Only 35 media patterns (engineer selected)
Findings: 15 findings
Result: Clear signal, RTP issues visible
Action: Bookmarks 3 critical findings
Time: 5 minutes
```

**Third Pass: Root Cause Hunt**
```
Analysis: "Network Deep Dive"
Patterns: 28 network patterns
Scope: Only bookmarked timeframes from Analysis #2
Findings: 8 findings
Result: NAT timeout confirmed
Time: 3 minutes
```

**Learning:**
```
System tracks:
├─ Pattern refinement (500 → 35 → 28)
├─ Time improvement (45min → 5min → 3min)
├─ Signal-to-noise (1,247 → 15 → 8 findings)
└─ Success path (broad → media → network)

Future guidance:
"For similar symptoms, others found success with this sequence"
```

---

## Analysis File Structure

### Storage Location:
```
.log-scout/bundles/{bundle_id}/
├─ logs/ (original log files)
├─ bundle.json (metadata)
├─ analyses/
│   ├─ call_drops_2024-02-26_14-23.analysis
│   ├─ audio_quality_2024-02-26_14-45.analysis
│   ├─ network_path_2024-02-26_15-10.analysis
│   └─ full_scan_2024-02-26_15-30.analysis
└─ bookmarks/
    └─ bookmarks.json
```

### Analysis File Format:
```json
{
  "analysis_id": "call_drops_2024-02-26_14-23",
  "created_at": "2024-02-26T14:23:15Z",
  "created_by": "sarah@example.com",
  "bundle_id": "case_700440257",
  
  "target": {
    "symptom": "call_drop",
    "description": "Users report calls dropping after 30 seconds",
    "tags": ["call_drop", "media_timeout", "mid_conversation"],
    "timeframe": {
      "start": "2024-02-26T14:20:00Z",
      "end": "2024-02-26T14:30:00Z"
    },
    "services_in_scope": ["cucm", "jabber", "gateway"]
  },
  
  "patterns_loaded": [
    {
      "pattern_id": "cucm_rtp_timeout_001",
      "loaded_at": "2024-02-26T14:23:20Z",
      "reason": "auto_loaded_for_symptom"
    },
    {
      "pattern_id": "gateway_nat_timeout_018",
      "loaded_at": "2024-02-26T14:25:30Z",
      "reason": "engineer_expanded_scope"
    }
  ],
  
  "findings": [
    {
      "finding_id": "f_001",
      "pattern_id": "cucm_rtp_timeout_001",
      "timestamp": "2024-02-26T14:23:47Z",
      "file": "cucm_sdl_trace.txt",
      "line": 12445,
      "severity": "high",
      "message": "RTP timeout - no packets received for 30 seconds",
      "rating": {
        "helpful": true,
        "critical": true,
        "rated_at": "2024-02-26T14:28:00Z"
      },
      "bookmarked": true,
      "notes": "Root cause - NAT binding expired"
    }
  ],
  
  "behavioral_data": {
    "time_spent_seconds": 342,
    "patterns_hidden": ["cucm_debug_verbose_099"],
    "scope_expansions": 2,
    "findings_clicked": [1, 3, 5, 7],
    "resolution_found": true
  },
  
  "state": "completed",
  "last_accessed": "2024-02-26T14:30:45Z"
}
```

---

## UI Concepts

### Analysis Tabs (Bottom Panel):
```
┌─────────────────────────────────────────────────────────────┐
│ Bundle: Case 700440257                                       │
│                                                               │
│ [Call Drops✨] [Audio Quality] [Network] [Full Scan] [+ New]│
│ └─ 23 findings └─ 15 findings  └─ 8      └─ 1,247           │
├───────────────────────────────────────────────────────────────┤
│ Analysis: Call Drops (23 findings)                           │
│ Target: Mid-conversation drops | Timeframe: 14:20-14:30      │
│                                                               │
│ ⭐ ROOT CAUSE FOUND                                          │
│ ⚠️  RTP Timeout at 14:23:47 [CRITICAL] [📌 Bookmarked]      │
│     NAT binding expired, media path lost                     │
│     File: cucm_sdl_trace.txt:12445                           │
│     [View Context] [View Related Findings]                   │
│                                                               │
│ ⚠️  Gateway NAT timeout at 14:23:45 [HIGH] [📌 Bookmarked]  │
│     Related to above - confirms NAT issue                    │
│                                                               │
│ 21 more findings... [Expand]                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Analysis Switcher (Context Menu):
```
Right-click Bundle → "Switch Analysis"
├─ 📊 Call Drops (active) ✨
│   23 findings, root cause found
│   Last viewed: 2 minutes ago
│
├─ 📊 Audio Quality
│   15 findings, investigating
│   Last viewed: 15 minutes ago
│
├─ 📊 Network Path
│   8 findings, completed
│   Last viewed: 1 hour ago
│
├─ 📊 Full Scan
│   1,247 findings, reference only
│   Created: 2024-02-26 15:30
│
├─ ➕ New Analysis...
└─ 📂 Manage Analyses...
```

### Comparison View (Side-by-Side):
```
┌──────────────────┬──────────────────┬──────────────────┐
│ Call Drops       │ Audio Quality    │ Network Path     │
├──────────────────┼──────────────────┼──────────────────┤
│ 23 findings      │ 15 findings      │ 8 findings       │
│                  │                  │                  │
│ ⭐ RTP Timeout   │ 📌 Packet Loss   │ ⭐ NAT Timeout   │
│    14:23:47      │    14:23:45      │    14:23:47      │
│                  │                  │                  │
│ 📌 Gateway Issue │ 📌 Jitter High   │ 📌 Firewall Rule │
│    14:23:45      │    14:23:50      │    [Config]      │
│                  │                  │                  │
│ • SIP Timeout    │ • Codec Mismatch │ • Route Missing  │
│   14:24:02       │   14:23:52       │   [None]         │
│                  │                  │                  │
├──────────────────┴──────────────────┴──────────────────┤
│ 💡 Common Finding Across All Analyses:                 │
│    RTP Timeout at 14:23:47 appears in all 3 views      │
│    → Strong signal this is the root cause              │
│                                                          │
│ 💡 Recommendation:                                      │
│    Focus on NAT configuration (Network Path analysis)   │
└──────────────────────────────────────────────────────────┘
```

### Create New Analysis Dialog:
```
┌─────────────────────────────────────────────────┐
│ Create New Analysis                             │
├─────────────────────────────────────────────────┤
│                                                  │
│ Analysis Name: [Deep Dive - NAT Issues________] │
│                                                  │
│ Target Symptom:                                 │
│ ( ) Call Drops                                  │
│ ( ) Audio Quality                               │
│ (•) Network/NAT Issues                          │
│ ( ) Registration Problems                       │
│ ( ) Custom...                                   │
│                                                  │
│ Scope:                                          │
│ ☑️ Use timeframes from bookmarks                │
│   Focused on: 14:23:40 - 14:24:00              │
│                                                  │
│ Patterns:                                       │
│ (•) Auto-load for symptom (28 patterns)        │
│ ( ) Use patterns from: [Select Analysis ▼]     │
│ ( ) Custom selection...                        │
│                                                  │
│ [Create Analysis] [Cancel]                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## Key Benefits

### 1. Multiple Perspectives
- Same logs analyzed from different angles
- Each analysis provides unique insights
- Cross-validate findings across analyses

### 2. Progressive Discovery
- Start with broad analysis
- Create focused analyses as you learn
- No need to re-analyze from scratch

### 3. Preserved Context
- Each analysis maintains its own state
- Switch between analyses without losing work
- Resume investigation from any analysis

### 4. Efficient Investigation
- Targeted patterns = faster analysis
- Less noise = clearer signal
- Focused scope = relevant findings

### 5. Team Collaboration
- Share analyses with team members
- Each engineer can create their own perspective
- Bookmarks link shared insights

### 6. Learning Over Time
- System learns successful analysis sequences
- Recommends next analysis based on findings
- Improves guidance for future investigations

---

## Behavioral Data Collection

### Per Analysis:
```
Track:
├─ Which symptom/target selected
├─ Patterns loaded (what, when, why)
├─ Scope changes (expansions/contractions)
├─ Time spent in this analysis view
├─ Findings rated helpful/critical
├─ Patterns hidden or shown
├─ Resolution status (found/investigating/closed)
└─ Next analysis created from this one

Use for:
├─ Recommend next analysis based on current findings
├─ Learn which symptom combinations work well
├─ Identify common investigation paths
└─ Share successful workflows with team
```

### Cross-Analysis Patterns:
```
Track:
├─ Which analyses created for same bundle
├─ Order of analysis creation (investigation flow)
├─ Findings that appear in multiple analyses
├─ Which analysis led to resolution
└─ Time to resolution per analysis type

Learn:
├─ Common investigation sequences
│   Example: "Call Drops" → "Network Path" (67% success)
├─ Effective analysis pairs
│   Example: "Audio Quality" + "Codec Issues" = good pair
├─ Dead-end analyses (created but not helpful)
└─ Recommend: "Others also created X analysis for this symptom"
```

---

## Key Questions

1. **Analysis Naming**: 
   - Auto-generate names from symptom/target?
   - Let engineer name them?
   - Both (default name + custom override)?

2. **Max Analyses Per Bundle**:
   - Unlimited?
   - Limit to 10?
   - Warn after 5 ("getting cluttered")?

3. **Analysis Templates**:
   - Pre-built analysis targets? ("SIP Call Flow", "Media Troubleshooting")
   - User-defined templates?
   - Team-shared templates?

4. **Auto-Analysis Suggestions**:
   - System auto-suggests creating "Audio Quality" analysis when finding RTP issues?
   - Wait for engineer to request?
   - Proactive vs. reactive?

5. **Analysis State**:
   - Save automatically on every change?
   - Manual save?
   - Auto-save with undo history?

6. **Deletion/Archiving**:
   - Can engineers delete analyses?
   - Archive old analyses?
   - Keep all analyses forever?

## Related Scenarios
- `scenario-symptom-targeted-analysis.md` - How patterns get selected per symptom
- `scenario-bookmarking-system.md` - Bookmark system that spans analyses
- `scenario-behavioral-learning.md` - Learning from analysis patterns
- `scenario-collaboration-handoff.md` - Sharing analyses between team members

---

**Status**: 📋 Planned - Requires implementation
**Priority**: High - Core investigation workflow
**Dependencies**: 
- Pattern tagging system
- Behavioral data collection
- Analysis file format