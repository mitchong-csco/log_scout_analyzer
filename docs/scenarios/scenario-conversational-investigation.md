# Scenario: Conversational Investigation Workflow

## Overview
Engineer has a dialogue with the system, following evidence through natural language queries. Investigation branches and evolves based on findings.

## Core Concept
**Traditional:** Load all patterns → Scan everything → Present results
**Conversational:** Ask question → Get answer → Follow evidence → Ask next question

## Scenarios

### Scenario 1: Natural Language Guided Investigation

```
Engineer: "Analyze call failures in the last hour"

System: 
├─ Loading call failure patterns...
├─ Scanning logs from 14:23 - 15:23
├─ Found: 15 call failures
└─ Most common: SIP 503 Service Unavailable (8 occurrences)

Engineer: "Show me the SIP 503 errors"

System:
├─ Highlighting 8 SIP 503 errors in timeline
├─ Pattern: All from same trunk group
├─ Timeframe: 14:45 - 14:52 (7 minute window)
└─ Suggestion: "These errors cluster around 14:45. Check trunk capacity?"

Engineer: "Check trunk capacity during that window"

System:
├─ Loading trunk capacity patterns...
├─ Analyzing trunk utilization 14:40-14:55
├─ Found: Trunk group "PSTN-Primary" at 100% capacity
└─ Evidence: All 23 channels in use at 14:45

Engineer: "Why was capacity maxed out?"

System:
├─ Analyzing call volume patterns...
├─ Normal call rate: 15 calls/minute
├─ During incident: 45 calls/minute (3x spike!)
└─ Suggestion: "Unusual spike. Check for test calls or attack?"

Engineer: "Look for suspicious call patterns"

System:
├─ Loading security/fraud patterns...
├─ Found: 127 calls from single IP in 2 minutes
├─ Pattern: Sequential extension scanning (1000-1127)
└─ Diagnosis: "Possible toll fraud attempt - recommend blocking source IP"
```

---

### Scenario 2: Following the Call Flow

```
Engineer: "User reports 'call dropped after 30 seconds'"

System:
├─ Loading call drop patterns...
├─ Timeframe needed. When did this happen?

Engineer: "Around 2:45 PM today"

System:
├─ Searching logs around 14:45 ±5 minutes
├─ Found 3 dropped calls in that window
└─ Which user? Or analyze all 3?

Engineer: "User extension 2543"

System:
├─ Found call from ext 2543 at 14:47:23
├─ Call duration: 32 seconds before drop
├─ Call flow: 2543 → CUCM → SIP Trunk → +1-408-555-1234
└─ Drop point: Between CUCM and gateway

Engineer: "What happened at the gateway?"

System:
├─ Switching context to gateway logs...
├─ Loading gateway patterns...
├─ Timestamp: 14:47:55 (32 seconds after call start)
├─ Found: BYE received from CUCM (unexpected)
└─ Reason header: "Q.850;cause=47;text=Resource Unavailable"

Engineer: "Why did CUCM send BYE?"

System:
├─ Back to CUCM logs at 14:47:55...
├─ Loading CUCM media patterns...
├─ Found: RTP timeout - no media from gateway for 30 seconds
└─ Evidence: Media stream interrupted at 14:47:25

Engineer: "What caused the media interruption?"

System:
├─ Analyzing network path at 14:47:25...
├─ Looking for: packet loss, latency spikes, jitter
├─ Gateway logs show: "ICE connection failed"
└─ Diagnosis: "NAT binding expired, media path lost"

Engineer: "Recommend solution"

System:
└─ Recommendation: "Configure SIP keep-alive (OPTIONS ping) to maintain NAT bindings"
    Action: "Set 'Options Ping Interval' to 30 seconds on trunk configuration"
```

---

### Scenario 3: Comparative Analysis

```
Engineer: "Compare working calls to failed calls"

System:
├─ What timeframe?

Engineer: "Last 2 hours"

System:
├─ Analyzing 2-hour window (13:23 - 15:23)
├─ Found: 247 successful calls, 15 failed calls
└─ Running comparison analysis...

System:
Differences found:
├─ Failed calls: All used codec G.729
├─ Successful calls: G.711 or G.722
├─ Failed calls: All to same area code (512)
└─ Successful calls: Various destinations

Engineer: "Focus on the G.729 codec issue"

System:
├─ Loading codec negotiation patterns...
├─ Found: G.729 license exhaustion
├─ Evidence: "No DSP resources available" in gateway logs
├─ Impact: 15 calls rejected when G.729 requested
└─ Successful calls used G.711 (no DSP required)

Engineer: "How many G.729 licenses do we have?"

System:
├─ Searching configuration...
├─ Found: "max-dn" set to 10 in gateway config
├─ Current usage: 10/10 (100%)
└─ Recommendation: "Increase G.729 license count or use G.711 for non-WAN calls"
```

---

### Scenario 4: Multi-Path Investigation

```
Engineer: "Intermittent registration failures for Jabber clients"

System:
├─ Loading registration patterns...
├─ Found 47 registration failures in 24 hours
├─ Multiple potential causes detected:
│
├─ Path A: Certificate validation (12 failures)
├─ Path B: Network timeout (18 failures)  
├─ Path C: Invalid credentials (9 failures)
└─ Path D: Server unavailable (8 failures)
│
└─ Which path to investigate first?

Engineer: "Most common - network timeout"

System [Path B]:
├─ Analyzing 18 timeout failures...
├─ Pattern: All from remote workers (VPN)
├─ Timeout at: TCP SYN (connection establishment)
└─ None reached REGISTER message

Engineer: "Check VPN connectivity"

System [Path B]:
├─ No VPN logs in bundle
├─ Cannot verify VPN status
├─ Switch to Path A (certificates) or Path C (credentials)?

Engineer: "Try certificates"

System [Path A]:
├─ Analyzing 12 certificate validation failures...
├─ Error: "Certificate expired"
├─ Expired cert: CN=cucm-pub.example.com
├─ Expiration date: 2024-02-20 (6 days ago)
└─ Impact: All Jabber clients failing cert validation

Engineer: "So we have two issues - certificate AND VPN?"

System:
└─ Summary:
    ├─ Issue 1: Certificate expired (12 failures, ongoing)
        Priority: CRITICAL - affects all users
        Fix: Renew certificate
    │
    └─ Issue 2: VPN timeouts (18 failures, ongoing)
        Priority: HIGH - affects remote workers
        Needs: VPN logs to diagnose
        Next step: Collect VPN/firewall logs
```

---

### Scenario 5: Learning from Past Cases

```
Engineer: "Call setup slow, users waiting 5-10 seconds to hear ringback"

System:
├─ Loading call setup delay patterns...
├─ Analyzing recent calls for setup time...
├─ Found: Average setup time 8.2 seconds (normal: 2 seconds)
└─ Similar case found: Case #12345 from 3 weeks ago

System:
Previous resolution for similar symptom:
├─ Issue: Database query timeout in dialing rules
├─ Cause: Translation pattern regex complexity
├─ Fix: Optimized regex patterns, setup time dropped to 1.5s
└─ Try same analysis?

Engineer: "Yes, check translation patterns"

System:
├─ Loading translation pattern performance data...
├─ Found: Pattern "^\+1([2-9]\d{2}[2-9]\d{6})$" taking 6.2s per match
├─ This pattern tested against every dialed number
├─ Pattern has backtracking issues with invalid inputs
└─ Same issue as Case #12345

Engineer: "What was the replacement pattern?"

System:
└─ Old: ^\+1([2-9]\d{2}[2-9]\d{6})$
    New: ^\+1[2-9]\d{9}$
    Result: 6.2s → 0.1s per match
    Applied: 2024-02-03 (Case #12345)
    Recommend: Apply same optimization to this trunk's patterns
```

---

### Scenario 6: Handling Missing Context

```
Engineer: "Why are calls failing?"

System:
├─ Need more context. What kind of failures?
├─ Options: 
    ├─ Call setup failure (never connects)
    ├─ Call drop (connects then disconnects)
    ├─ Audio issues (connects but bad quality)
    └─ Feature failure (call works but feature doesn't)

Engineer: "Call setup failure"

System:
├─ Which phase of setup?
├─ Options:
    ├─ Dial tone (phone doesn't respond)
    ├─ Dialing (after digits entered)
    ├─ Ringing (remote end not answering)
    └─ Connection (fails during connect)

Engineer: "After dialing, before ringing"

System:
├─ Loading pre-alerting failure patterns...
├─ Need timeframe or specific user?

Engineer: "All users, last hour"

System:
├─ Now have enough context to analyze
└─ Proceeding with targeted analysis...
```

---

## Key Capabilities Needed

### 1. Context Tracking
```
System remembers:
├─ Current investigation focus (symptom)
├─ Current log position (timestamp, file)
├─ Current pattern set loaded
├─ Investigation history (breadcrumb trail)
└─ Hypotheses tested (what's ruled out)
```

### 2. Intent Recognition
```
User says → System understands:
├─ "Show me" → Display/filter
├─ "Why" → Root cause analysis
├─ "Compare" → Differential analysis
├─ "When" → Temporal correlation
├─ "Check" → Load new pattern set
└─ "Recommend" → Suggest action
```

### 3. Progressive Pattern Loading
```
Start with: Symptom-specific patterns (fast, focused)
Expand to: Related patterns (if needed)
Suggest: Adjacent areas (based on findings)
Learn: Remember what worked (case history)
```

### 4. Multi-Path Support
```
Investigation branches:
├─ Path A (following now)
├─ Path B (saved for later)
├─ Path C (ruled out)
└─ Path D (low priority)

Engineer can:
├─ Switch between paths
├─ Merge findings
└─ Save/resume investigation
```

---

## Key Questions

1. **Investigation State**: How to save/resume investigations?
   - Auto-save breadcrumb trail?
   - Export investigation session?
   - Share with colleague?

2. **Natural Language Interface**: Where does this live?
   - Chat panel in VS Code?
   - Command palette with natural language?
   - Separate investigation UI?

3. **Pattern Recommendations**: When to suggest new patterns?
   - When current patterns find nothing?
   - When evidence points elsewhere?
   - Based on similar past cases?

4. **Confidence Levels**: Should system express uncertainty?
   - "90% confident this is the cause"
   - "Need more logs to confirm"
   - "Multiple possible causes detected"

5. **Collaboration**: How to share investigation state?
   - Export as case bundle?
   - Real-time shared workspace?
   - Handoff with context preserved?

## Related Scenarios
- `scenario-symptom-targeted-analysis.md` - Pattern targeting by symptom
- `scenario-multi-log-correlation.md` - Cross-log analysis
- `scenario-case-management.md` - Saving/sharing investigations