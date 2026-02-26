# Scenario: Collaboration and Case Handoff

## Overview
Engineers need to share investigation state, handoff cases between teams, and collaborate on troubleshooting with full context preservation.

## Problem Statement
When escalating or collaborating:
- Context is lost (what was already checked, what was ruled out)
- Duplicate work (next engineer re-analyzes same logs)
- Communication gaps (verbal handoff misses details)
- Time wasted (finding relevant logs, timeframes, evidence)

## Scenarios

### Scenario 1: Team-to-Team Handoff

**Voice Team Analysis:**
```
Issue: "Call not completing to PSTN"
Voice Team Findings:
├─ CUCM routing: OK (verified)
├─ SIP INVITE sent: OK (captured)
├─ Gateway response: None (timeout after 3s)
└─ Conclusion: Problem at gateway or beyond

Handoff to: Network Team
Context needed:
├─ Timeframe: 14:23:15 - 14:23:30
├─ Call-ID: abc123@cucm.example.com
├─ Affected trunk: PSTN-Primary
├─ Pattern used: SIP call flow
└─ Already checked: CUCM config, route patterns, dial plan
```

**Network Team Receives:**
```
Opens case bundle with:
├─ Pre-filtered logs (only gateway/trunk related)
├─ Timeline already marked (14:23:15 - 14:23:30)
├─ Previous findings highlighted
├─ Breadcrumb trail of investigation
└─ Recommended next steps: "Check gateway health, routing table"

Network team continues from where Voice team left off
```

---

### Scenario 2: TAC Escalation

**Customer Analysis:**
```
Issue: "Multiple users can't make calls"
Customer Findings:
├─ 50 users affected
├─ Timeframe: 14:00-15:00 (1 hour window)
├─ Pattern: All failures on Trunk Group "PSTN-Primary"
├─ Logs attached: CUCM SDL traces, Gateway logs
└─ Diagnostics: 15 SIP 503 errors, 8 timeouts

Export: "Save investigation as case bundle"
```

**TAC Receives:**
```
Opens case bundle:
├─ Customer's investigation state loaded
├─ Logs pre-filtered (PSTN-Primary trunk only)
├─ Timeline pre-configured (14:00-15:00)
├─ Customer's annotations visible
├─ Diagnostics already categorized
└─ TAC adds:
    - Deeper pattern analysis
    - Vendor bug checks
    - Configuration validation
```

---

### Scenario 3: Shift Handoff

**Day Shift Engineer:**
```
Investigating: "Intermittent call quality issues"
Status at end of shift:
├─ Analyzed 4 hours of logs
├─ Found: Packet loss spikes every 2 hours
├─ Correlation: Possible link to backup jobs
├─ Still investigating: Network path, QoS config
└─ Next steps: Check firewall QoS, WAN utilization

Handoff: Save investigation state
```

**Night Shift Engineer:**
```
Resumes investigation:
├─ Loads saved state
├─ Sees analysis already done
├─ Continues from "Check firewall QoS"
├─ Finds: QoS policy misconfiguration
└─ Updates case with resolution

Day shift returns:
├─ Reviews night shift findings
├─ Sees complete timeline of investigation
└─ Closes case
```

---

### Scenario 4: Real-Time Collaboration

**Setup:**
- Two engineers working on same issue
- Shared workspace/session

**Engineer A:**
```
Analyzing: CUCM logs
Finds: "SIP INVITE timeout"
Annotates: "Gateway not responding at 14:23:15"
```

**Engineer B (sees in real-time):**
```
Switches to: Gateway logs at 14:23:15
Finds: "Database connection lost"
Annotates: "Root cause: DB connection failure"
Links: Back to Engineer A's finding
```

**Both Engineers See:**
```
Complete timeline:
├─ 14:23:10 [Gateway] Database connection lost
├─ 14:23:15 [CUCM] SIP INVITE sent
├─ 14:23:18 [CUCM] Gateway timeout
└─ Root cause: Database issue prevented gateway response
```

---

### Scenario 5: Supervisor Review

**Engineer submits case for review:**
```
Case: "Call drops after 30 seconds"
Investigation:
├─ Analyzed: 3 log files
├─ Timeframe: 45 minutes
├─ Findings: 12 call drops, all same pattern
├─ Root cause: NAT binding timeout
└─ Recommendation: Configure SIP keep-alive
```

**Supervisor reviews:**
```
Opens case:
├─ Sees complete investigation trail
├─ Reviews findings and evidence
├─ Validates recommendation
├─ Adds notes: "Approved. Also check session timers"
└─ Approves implementation
```

---

### Scenario 6: Vendor Support Collaboration

**Customer:**
```
Issue with vendor equipment (Gateway)
Collects:
├─ Customer logs (CUCM, Jabber)
├─ Gateway logs (from vendor device)
├─ Packet captures
└─ Investigation findings so far

Export: "Sanitized case bundle" (removes sensitive data)
```

**Vendor Support:**
```
Receives sanitized bundle:
├─ Customer PII removed (extensions, numbers)
├─ IP addresses anonymized
├─ Full technical context preserved
└─ Vendor analyzes gateway logs with context

Vendor response:
├─ Identifies: Known bug in Gateway firmware
├─ Provides: Patch and workaround
└─ Case closed
```

---

### Scenario 7: Knowledge Base Contribution

**After resolving case:**
```
Engineer: "Save this investigation as KB article"

System generates:
├─ Issue summary
├─ Symptoms observed
├─ Investigation steps taken
├─ Root cause identified
├─ Resolution applied
└─ Similar cases (for reference)

Published to KB:
├─ Searchable by symptom
├─ Linked to similar cases
├─ Future engineers can reference
└─ AI learning: Improves future suggestions
```

---

### Scenario 8: Multi-Organization Collaboration

**Service Provider → Enterprise Customer:**
```
Service Provider:
├─ Operates SIP trunk infrastructure
├─ Sees issue on their side
├─ Shares: Trunk logs, carrier logs
└─ Context: "Seeing high packet loss from your firewall"

Enterprise Customer:
├─ Receives shared context
├─ Adds: Internal logs (CUCM, firewall)
├─ Correlates: Backup job causing bandwidth spike
└─ Resolves: Reschedules backup, QoS adjustment

Shared timeline:
├─ Both organizations see full picture
├─ Collaborate on resolution
└─ Case closed with joint root cause
```

---

## Case Bundle Format

### Contents:
```
case-bundle-123456/
├─ manifest.json (case metadata)
├─ logs/ (original log files)
│   ├─ cucm_trace.txt
│   ├─ jabber_console.log
│   └─ gateway.log
├─ timeline.json (unified timeline with events)
├─ findings.json (diagnostics and patterns matched)
├─ annotations.json (engineer notes and highlights)
├─ context.json (investigation state)
│   ├─ Current focus
│   ├─ Paths explored
│   ├─ Hypotheses tested
│   └─ Next steps
├─ evidence/ (screenshots, packet captures)
└─ resolution.json (if case closed)
```

### metadata.json example:
```json
{
  "case_id": "123456",
  "created_by": "engineer@example.com",
  "created_at": "2024-02-26T14:23:15Z",
  "issue_type": "call_failure",
  "symptom": "one_way_audio",
  "severity": "high",
  "products": ["cucm", "jabber", "gateway"],
  "status": "in_progress",
  "assigned_to": "network-team",
  "tags": ["sip", "nat", "media"]
}
```

---

## Key Questions

1. **Data Privacy**: How to sanitize logs for external sharing?
   - Auto-detect PII (phone numbers, extensions, names)?
   - Anonymization vs. pseudonymization?
   - Compliance requirements (GDPR, etc.)?

2. **Real-Time Collaboration**: How to implement?
   - VS Code Live Share integration?
   - Separate collaboration server?
   - Conflict resolution if two engineers edit same thing?

3. **Case Bundle Size**: Large logs can be gigabytes
   - Compress logs?
   - Store only relevant excerpts?
   - Cloud storage integration?

4. **Access Control**: Who can see what?
   - Role-based access?
   - Customer data vs. internal notes?
   - Audit trail of who accessed case?

5. **Integration**: Connect to existing systems?
   - ServiceNow, Jira, Salesforce?
   - Email notifications on case updates?
   - ChatOps (Slack, Teams)?

## Related Scenarios
- `scenario-conversational-investigation.md` - Investigation workflow
- `scenario-multi-log-correlation.md` - Building unified timeline
- `scenario-case-management.md` - Case lifecycle management