# Scenario: Symptom-Targeted Analysis

## Overview
Instead of loading all patterns and analyzing everything, engineer declares the problem/symptom being investigated, and system loads only relevant patterns.

## Core Concept
**Problem:** Full pattern scan is wasteful when:
- Not all logs have timestamps (can't correlate timeframes)
- Not all logs are relevant to the issue (service coverage)
- Engineer already knows the symptom/issue

**Solution:** Target patterns based on symptom/issue being investigated.

## Scenarios

### Scenario 1: Call Failure Investigation
**User declares:**
```
Issue Type: "Call Failure"
Symptom: "One-way audio"
```

**Patterns loaded:**
- Media stream diagnostics (RTP, codec negotiation)
- SIP INVITE/200 OK/ACK sequences
- NAT/firewall traversal issues
- ICE candidate failures
- SRTP key exchange problems

**Patterns ignored:**
- Registration patterns
- Presence/IM patterns
- Conference bridging
- Recording/monitoring features

**Expected:**
- Faster analysis (fewer patterns)
- More relevant diagnostics
- Less noise from unrelated errors

---

### Scenario 2: Registration Failure
**User declares:**
```
Issue Type: "Registration Problem"
Symptom: "User can't log in"
Products: [CUCM, Jabber]
```

**Patterns loaded:**
- Authentication errors (401, 403)
- Certificate validation failures
- LDAP/AD sync issues
- License exhaustion
- Database connection problems
- Network connectivity checks

**Patterns ignored:**
- Call routing
- Media diagnostics
- Conference features
- Call recording

---

### Scenario 3: Performance Degradation
**User declares:**
```
Issue Type: "Performance Issue"
Symptom: "Slow response times"
Timeframe: "2024-02-26 14:00-15:00"
```

**Patterns loaded:**
- Database query timeouts
- Thread pool exhaustion
- Memory pressure warnings
- CPU spike indicators
- Network latency markers
- GC pause events

**Patterns ignored:**
- Feature-specific errors
- User-level diagnostics
- Call quality metrics

---

### Scenario 4: Service-Scoped Analysis
**User declares:**
```
Services in Scope:
- Call Manager (CUCM)
- Jabber Client
- SIP Trunk to PSTN

Out of Scope:
- WebEx integration
- Contact Center
- Expressway
```

**Behavior:**
- Only analyze CUCM SDL traces, Jabber client logs, SIP trunk logs
- Skip WebEx meeting logs, CCX/UCCX logs, Expressway logs

---

### Scenario 5: Timeframe-Scoped Analysis
**User declares:**
```
Incident Time: 2024-02-26 14:23:15
Window: ±5 minutes
```

**Behavior:**
- Only analyze log entries: 14:18:15 - 14:28:15 (10 min window)
- Skip all other timestamps
- Report if logs don't cover this timeframe

**Results:**
- 15 errors found in timeframe
- 3 warnings in timeframe
- 1,247 log lines ignored (outside window)

---

### Scenario 6: Progressive Analysis
**Phase 1: Broad Scan**
```
User: "Analyze everything, show me what you find"
System: Full scan → 150 errors, 300 warnings (too much noise)
```

**Phase 2: Filter Down**
```
User: "Show only CRITICAL errors"
System: Filters to 15 critical errors

User: "Focus on call signaling issues"
System: Narrows to 5 SIP INVITE failures
```

**Phase 3: Deep Dive**
```
User: Clicks on one INVITE failure
System:
- Shows context (10 lines before/after)
- Cross-references Jabber log at same time
- Shows related SIP messages
- Suggests: "Check NAT configuration"
```

---

### Scenario 7: Reverse Flow (Start Specific, Expand)
**Phase 1: Targeted**
```
User: "One-way audio issue"
System: Loads only media patterns
Result: No clear cause found
```

**Phase 2: Expand**
```
System: "No media issues found. Expand to signaling?"
User: "Yes, check SIP signaling"
System: Loads SIP patterns
Result: Found asymmetric routing issue
```

**Phase 3: Root Cause**
```
System: "Asymmetric routing detected. Check firewall?"
User: "Yes"
System: Loads NAT/firewall patterns
Result: Found missing NAT pinhole rule
```

---

## Key Questions

1. **Issue Type Taxonomy**: How to categorize issues?
   - Pre-defined list: Call failures, Registration, Performance, Security?
   - User-defined tags?
   - Machine learning from past cases?

2. **Pattern Metadata**: Do patterns need symptom tags?
   ```
   symptom: ["one-way-audio", "call-drop", "no-audio"]
   service: ["call-manager", "jabber", "gateway"]
   severity: ["critical", "major", "minor"]
   ```

3. **Progressive Discovery**: Should system suggest expanding scope?
   - Recommend related patterns if nothing found?
   - Learn from past investigations?

4. **Default Behavior**: If user doesn't specify symptom:
   - Load minimal patterns (fast, low noise)?
   - Load common patterns (balanced)?
   - Prompt user to select issue type?

## Related Scenarios
- `scenario-conversational-investigation.md` - Natural language workflow
- `scenario-multi-engineering-patterns.md` - Cross-product pattern loading