# Scenario: Multi-Log Correlation

## Overview
Investigate issues across multiple log files from different products/systems, handling timestamp mismatches, missing timestamps, and cross-referencing events.

## Problem Statement
Real-world troubleshooting requires correlating events across:
- Multiple log files (CUCM, Jabber, Gateway, Network devices)
- Different timestamp formats (UTC, local time, Unix epoch, no timestamps)
- Different log verbosity levels
- Different systems with clock drift

## Scenarios

### Scenario 1: Timestamp Correlation Across Products

**Setup:**
```
Log Bundle:
├─ cucm_sdl_trace.txt (timestamps: UTC)
├─ jabber_console.log (timestamps: Local PST)
├─ sip_gateway.log (timestamps: Unix epoch)
└─ packet_capture.pcap (timestamps: microsecond precision)
```

**User Action:**
```
Incident Time: "2024-02-26 14:23:15 PST"
Normalize to: UTC
Window: ±2 minutes
```

**Expected Behavior:**
- Convert all timestamps to UTC
- cucm: 14:23:15 UTC (no change)
- jabber: 06:23:15 PST → 14:23:15 UTC
- gateway: 1709045395 → 14:23:15 UTC
- pcap: Align to UTC timeline
- Show events on unified timeline

---

### Scenario 2: Logs Without Timestamps

**Challenge:**
```
Files:
├─ cucm_trace.txt (HAS timestamps)
├─ jabber_console.log (HAS timestamps)
├─ debug_output.txt (NO timestamps)
└─ error_dump.log (NO timestamps)
```

**Behavior:**
- Use timestamped logs as anchors
- Estimate sequence in non-timestamped logs by:
  - Event ordering
  - Error code cross-references
  - Session IDs / Call IDs
- Show non-timestamped logs separately with warning:
  `⚠️ This log has no timestamps - showing all entries`

**Test:**
- Can we correlate by Call-ID even without timestamps?
- Should we prompt user for estimated time range?

---

### Scenario 3: Clock Drift Between Systems

**Challenge:**
```
System A (CUCM): Event at 14:23:15.000
System B (Gateway): "Same" event at 14:23:17.250
Clock drift: 2.25 seconds
```

**Detection:**
- Identify duplicate events (same Call-ID, different timestamps)
- Calculate time offset between systems
- Adjust timeline to compensate

**User Prompt:**
```
System: "Detected 2.25s clock drift between CUCM and Gateway"
Options:
  - Auto-adjust timestamps
  - Keep original timestamps (show drift)
  - Manually specify correct offset
```

---

### Scenario 4: Cross-Reference by Call-ID/Session-ID

**Scenario:**
```
User: "Show me all logs related to Call-ID: abc123@cucm.example.com"
```

**Behavior:**
- Search all logs in bundle for Call-ID
- Find in:
  - CUCM: Call setup, routing decisions
  - Jabber: Client-side call events
  - Gateway: SIP messages (INVITE, 200 OK, BYE)
  - Packet capture: Network-level SIP frames
- Build unified timeline of this specific call

**Display:**
```
Timeline for Call-ID: abc123@cucm.example.com
├─ 14:23:15.000 [CUCM] Call originated from ext 2543
├─ 14:23:15.120 [Jabber] Sent INVITE
├─ 14:23:15.245 [Gateway] Received INVITE, routing to PSTN
├─ 14:23:16.100 [Gateway] 183 Session Progress
├─ 14:23:18.500 [Gateway] 200 OK
├─ 14:23:18.625 [CUCM] Call connected
└─ 14:23:55.000 [Gateway] BYE received (call ended)
```

---

### Scenario 5: Sparse Logs (Different Verbosity)

**Challenge:**
```
├─ cucm_trace.txt: VERBOSE (1,247,533 lines)
├─ jabber_console.log: INFO (12,443 lines)
├─ gateway.log: WARNING only (234 lines)
└─ network.log: CRITICAL only (7 lines)
```

**Behavior:**
- Align events where timestamps overlap
- Show density/verbosity differences
- Highlight critical events across all logs
- Allow filtering: "Show only ERROR and above across all logs"

---

### Scenario 6: Multi-Hop Call Flow Correlation

**Call Path:**
```
Jabber Client → CUCM → Gateway → PSTN
```

**Logs Available:**
```
├─ Jabber client log
├─ CUCM SDL trace
├─ Gateway debug log
└─ SIP packet capture between Gateway and PSTN
```

**User Request:**
```
"Trace call flow for +1-408-555-1234 at 14:23:15"
```

**System Behavior:**
- Find call in Jabber log (origination)
- Follow to CUCM using SIP Call-ID
- Follow to Gateway using Dialed Number
- Show hop-by-hop:
  ```
  Hop 1: Jabber → CUCM (120ms)
  Hop 2: CUCM → Gateway (245ms)
  Hop 3: Gateway → PSTN (1.2s ringing)
  Total setup time: 1.565s
  ```

---

### Scenario 7: Intermittent Issue Pattern Detection

**Problem:**
```
"Calls drop randomly, happens 3-4 times per day"
```

**Logs:**
```
24 hours of logs from all systems
```

**Analysis:**
- Scan 24 hours across all logs
- Find recurring patterns:
  - Same time of day?
  - Same trunk/route?
  - Same error code?
  - Periodic trigger (scheduled job)?
- Build incident timeline:
  ```
  Incidents detected:
  ├─ 2024-02-26 09:15:23 (Call drop - 4 users)
  ├─ 2024-02-26 12:47:10 (Call drop - 2 users)
  ├─ 2024-02-26 16:22:45 (Call drop - 5 users)
  └─ 2024-02-26 19:03:12 (Call drop - 3 users)
  
  Pattern: Every ~3 hours
  Correlation: Backup job runs at same time
  ```

---

### Scenario 8: Partial Log Coverage

**Challenge:**
```
Incident time: 14:23:15
Available logs:
├─ cucm_trace.txt: 13:00 - 15:00 ✅ Covers incident
├─ jabber_console.log: 14:00 - 16:00 ✅ Covers incident
├─ gateway.log: 10:00 - 13:50 ❌ Ends before incident
└─ network.log: 14:45 - 18:00 ❌ Starts after incident
```

**Behavior:**
- Show coverage timeline visually
- Warn: "Gateway log ends 33 minutes before incident"
- Warn: "Network log starts 22 minutes after incident"
- Still analyze available logs
- Recommend: "Need gateway logs from 14:00-15:00"

---

### Scenario 9: Aggregate Statistics Across Logs

**User Request:**
```
"Show call success rate per trunk over last hour"
```

**Behavior:**
- Extract call attempts from CUCM logs
- Extract call completions from Gateway logs
- Correlate by trunk group
- Calculate success rate per trunk:
  ```
  Trunk Statistics (14:00-15:00):
  ├─ PSTN-Primary: 245/247 (99.2% success)
  ├─ PSTN-Backup: 18/23 (78.3% success) ⚠️
  ├─ SIP-Trunk-1: 134/134 (100% success)
  └─ SIP-Trunk-2: 89/95 (93.7% success)
  ```

---

### Scenario 10: Log Bundle Export/Import

**Use Case:** Share investigation with TAC

**Export Bundle:**
```
User: "Export analysis bundle"
System creates:
├─ logs/ (all log files)
├─ timeline.json (unified timeline)
├─ findings.json (diagnostics found)
├─ context.json (investigation state)
└─ metadata.json (timestamp mappings, offsets)
```

**Import Bundle:**
```
TAC receives bundle
System loads:
├─ Pre-aligned timelines
├─ Pre-loaded findings
├─ Investigation breadcrumbs
└─ TAC adds deeper analysis
```

---

## Key Questions

1. **Timestamp Normalization**: Auto-detect timezone or require user input?
2. **Clock Drift**: What's acceptable drift before warning? (100ms? 1s? 5s?)
3. **Missing Timestamps**: Best strategy for non-timestamped logs?
4. **Correlation Keys**: What besides Call-ID? (Session-ID, Transaction-ID, User ID?)
5. **Performance**: Can we handle 1GB+ logs across 10+ files?
6. **Visual Timeline**: How to display multi-log timeline in VS Code?

## Related Scenarios
- `scenario-conversational-investigation.md` - Following evidence across logs
- `scenario-symptom-targeted-analysis.md` - Focusing on specific timeframes
- `scenario-case-management.md` - Exporting/sharing investigations