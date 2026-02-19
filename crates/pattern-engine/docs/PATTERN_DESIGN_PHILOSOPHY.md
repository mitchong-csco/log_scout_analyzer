# Pattern Design Philosophy: Matching, Extraction, and Severity Evaluation

## Overview

The Log Scout Analyzer uses a three-stage process for log analysis:
1. **Pattern Matching** - Find relevant log lines
2. **Parameter Extraction** - Pull out variable values from matched lines
3. **Severity Evaluation** - Determine the actual severity based on extracted values

This document explains the design philosophy and how these stages work together.

---

## Core Concept: Separation of Concerns

### 1. Pattern Regex (The Filter)
**Purpose**: Find log lines that match a general pattern

The pattern regex is intentionally **broad** and designed to:
- Match ALL instances of a particular log event type
- Act as a filter to identify "interesting" log lines
- NOT narrow down the scope of data to extract from

**Example**:
```regex
HTTP Response
```
This pattern matches ANY log line containing "HTTP Response", regardless of status code.

**Important**: The pattern regex is NOT meant to capture the specific details - that's what parameter extractors are for!

---

### 2. Parameter Extractors (The Data Miners)
**Purpose**: Extract variable values from the ENTIRE matched log line

Parameter extractors run against the **full log line** that was matched by the pattern regex. They pull out:
- Status codes
- Error codes
- Session IDs
- User names
- Timestamps
- Any other variable data

**Example**:
```json
{
  "name": "status_code",
  "regex": "HTTP Response (\\d{3})"
}
```

This extractor pulls out the 3-digit status code from the matched line.

**Key Design Decision**: Parameter extractors operate on the FULL matched line, not just the regex match. This is because:
- The pattern regex might only match a small identifier (e.g., "RTP STATS")
- The actual parameter values are elsewhere in the same line
- The full line provides complete context for extraction

---

### 3. Condition Triggers (The Decision Makers)
**Purpose**: Evaluate extracted parameters to determine actual severity

Condition triggers use the extracted parameter values to make decisions about severity.

**Example**:
```json
{
  "field": "status_code",
  "operator": "Equals",
  "value": "200",
  "severity": "Info"
},
{
  "field": "status_code",
  "operator": "Equals",
  "value": "404",
  "severity": "Warning"
},
{
  "field": "status_code",
  "operator": "Equals",
  "value": "500",
  "severity": "Error"
}
```

---

## Real-World Examples

### Example 1: HTTP Response Pattern

**Pattern**: Matches all HTTP responses
**Challenge**: All responses are logged at INFO level, but some indicate errors

```
Pattern Regex: "HTTP Response"
```

**Matched Lines**:
```
2024-01-15 10:23:45 INFO HTTP Response 200 OK for /api/users
2024-01-15 10:24:12 INFO HTTP Response 404 Not Found for /api/products/999
2024-01-15 10:25:33 INFO HTTP Response 500 Internal Server Error for /api/orders
```

**Parameter Extractors**:
```json
[
  {
    "name": "status_code",
    "regex": "HTTP Response (\\d{3})"
  },
  {
    "name": "url",
    "regex": "for (\\S+)"
  }
]
```

**Extracted Values**:
- Line 1: `status_code=200`, `url=/api/users`
- Line 2: `status_code=404`, `url=/api/products/999`
- Line 3: `status_code=500`, `url=/api/orders`

**Condition Triggers**:
```json
[
  {"field": "status_code", "operator": "Equals", "value": "200", "severity": "Info"},
  {"field": "status_code", "operator": "Equals", "value": "404", "severity": "Warning"},
  {"field": "status_code", "operator": "Regex", "value": "^5\\d{2}$", "severity": "Error"}
]
```

**Results**:
- Line 1: Info severity (success)
- Line 2: Warning severity (client error)
- Line 3: Error severity (server error)

**Annotation Template**:
```
HTTP {{ status_code }} response for {{ url }}
```

**Merged Messages**:
- Line 1: "HTTP 200 response for /api/users"
- Line 2: "HTTP 404 response for /api/products/999"
- Line 3: "HTTP 500 response for /api/orders"

---

### Example 2: RTP Statistics Pattern

**Pattern**: Matches RTP statistics log lines
**Challenge**: Pattern match is small, but data is spread across the entire line

```
Pattern Regex: "RTP STATS"
```

**Matched Line**:
```
2025-12-10 17:15:56,798 DEBUG [cpve] [SessionImpl::logRtpStatsWithLock] - RTP STATS,session_id=0,session_type=audio-main,rx_bytes_recv=0,rx_pkts_recv=0,rx_pkts_lost=0,tx_bytes_sent=0,tx_pkts_sent=0
```

**Why Full Line Extraction Matters**:
- Pattern regex matches only "RTP STATS" (10 characters)
- Parameter values are in the rest of the line (100+ characters)
- If we only extracted from "RTP STATS", we'd get nothing!

**Parameter Extractors** (applied to full line):
```json
[
  {"name": "SESSION_ID", "regex": "session_id=(.+?),"},
  {"name": "SESSION_TYPE", "regex": "session_type=(.+?),"},
  {"name": "rx_pkts_recv", "regex": "rx_pkts_recv=(\\d+)"},
  {"name": "tx_pkts_sent", "regex": "tx_pkts_sent=(\\d+)"}
]
```

**Extracted Values**:
- `SESSION_ID=0`
- `SESSION_TYPE=audio-main`
- `rx_pkts_recv=0`
- `tx_pkts_sent=0`

**Annotation Template**:
```html
<p>RTP Statistics: Session ID=<span class="ql-color-orange">{{ SESSION_ID }}</span>, Type=<span class="ql-color-orange">{{ SESSION_TYPE }}</span></p>
<p>Received: {{ rx_pkts_recv }} packets, Sent: {{ tx_pkts_sent }} packets</p>
```

**Merged Message**:
```
RTP Statistics: Session ID=0, Type=audio-main
Received: 0 packets, Sent: 0 packets
```

---

### Example 3: Authentication Failure Pattern

**Pattern**: Matches auth failures with attempt tracking
**Challenge**: Need to escalate severity as attempts increase

```
Pattern Regex: "Authentication failed"
```

**Matched Lines**:
```
2024-01-15 10:20:15 WARN Authentication failed for user john.doe (attempt 1/5)
2024-01-15 10:20:45 WARN Authentication failed for user john.doe (attempt 3/5)
2024-01-15 10:21:10 WARN Authentication failed for user john.doe (attempt 5/5)
```

**Parameter Extractors**:
```json
[
  {"name": "user", "regex": "user (\\S+)"},
  {"name": "attempt", "regex": "attempt (\\d+)"},
  {"name": "max", "regex": "/(\\d+)\\)$"}
]
```

**Condition Triggers**:
```json
[
  {"field": "attempt", "operator": "Equals", "value": "1", "severity": "Info"},
  {"field": "attempt", "operator": "Equals", "value": "3", "severity": "Warning"},
  {"field": "attempt", "operator": "Equals", "value": "5", "severity": "Error"}
]
```

**Results**:
- Line 1: Info (first attempt - might be a typo)
- Line 2: Warning (repeated failures - suspicious)
- Line 3: Error (account locked out - critical)

---

## Why This Design Is Powerful

### 1. One Pattern, Many Meanings
A single pattern can match hundreds of log lines, each with different severity based on extracted values.

### 2. Context-Aware Severity
The log level (INFO, WARN, ERROR) might not reflect the actual problem. Extracted parameter values provide the real context.

### 3. Reusable Patterns
Patterns can be generic and reused across different log sources, with parameter extractors adapting to specific formats.

### 4. Human-Readable Annotations
Templates with substituted values provide clear, actionable messages instead of cryptic log text.

---

## Implementation Details

### How Parameter Extraction Works

1. **Pattern regex matches a line**:
   ```
   Match found: "RTP STATS" at position 95-104 in line
   ```

2. **Full line is saved**:
   ```
   Full line: "2025-12-10 17:15:56,798 DEBUG [...] - RTP STATS,session_id=0,..."
   ```

3. **Parameter extractors run against FULL LINE**:
   ```
   Extractor "session_id=(.+?)," → searches entire line → finds "session_id=0,"
   Result: SESSION_ID = "0"
   ```

4. **All extracted parameters stored**:
   ```json
   {
     "SESSION_ID": "0",
     "SESSION_TYPE": "audio-main",
     "rx_pkts_recv": "0",
     "tx_pkts_sent": "0"
   }
   ```

5. **Condition triggers evaluate parameters**:
   ```
   If rx_pkts_recv > 1000 && rx_pkts_lost > 100:
     severity = Warning (packet loss detected)
   ```

6. **Template substitution creates message**:
   ```
   Template: "RTP Statistics: Session {{ SESSION_ID }}, Type {{ SESSION_TYPE }}"
   Result: "RTP Statistics: Session 0, Type audio-main"
   ```

---

## Edge Cases and Considerations

### Multiple Patterns on Same Line
✅ **Supported**: Each pattern independently extracts its parameters

**Example**:
```
ERROR: HTTP 500 response - Database connection failed
```

Both patterns match:
1. HTTP Response pattern → extracts `status_code=500`
2. Database Error pattern → extracts `error_type=connection`

Each produces its own diagnostic with appropriate parameters.

### Overlapping Parameter Names
✅ **Safe**: Each pattern has its own parameter namespace

Pattern A's `code` parameter won't conflict with Pattern B's `code` parameter.

### Parameter Extraction Failures
✅ **Graceful**: If a parameter extractor doesn't match, the template shows `{{ FIELD }}` placeholder

Users can see which fields failed to extract and update the extractor regex.

---

## Best Practices

### Writing Pattern Regexes
✅ **DO**: Keep patterns broad to match all relevant log lines
```regex
Authentication failed
```

❌ **DON'T**: Try to capture everything in the pattern regex
```regex
Authentication failed for user (\S+) \(attempt (\d+)/(\d+)\)
```

### Writing Parameter Extractors
✅ **DO**: Use specific extractors with capture groups
```json
{"name": "user", "regex": "user (\\S+)"}
```

✅ **DO**: Handle optional/variable spacing
```json
{"name": "code", "regex": "code[:\\s]+(\\w+)"}
```

❌ **DON'T**: Make extractors too greedy
```json
{"name": "message", "regex": "message: (.+)"}  // Will capture everything after "message:"
```

### Writing Condition Triggers
✅ **DO**: Cover common cases
```json
[
  {"field": "status", "operator": "Equals", "value": "success", "severity": "Info"},
  {"field": "status", "operator": "Equals", "value": "failure", "severity": "Error"}
]
```

✅ **DO**: Use regex for ranges
```json
{"field": "code", "operator": "Regex", "value": "^(4|5)\\d{2}$", "severity": "Error"}
```

---

## Future Enhancements

### 1. Multi-Line Parameter Extraction
Extract parameters from context lines (e.g., stack traces, multi-line JSON)

### 2. Computed Parameters
Derive new parameters from existing ones (e.g., calculate duration from start/end timestamps)

### 3. Cross-Pattern References
Use parameters from one pattern to enrich another (e.g., session tracking)

### 4. Statistical Aggregation
Track patterns over time (e.g., error rate, average response time)

---

---

## Advanced Use Case: Temporal Pattern Analysis

### Example 4: RTP Statistics - No Audio/Video Detection

**Pattern**: Matches RTP statistics logged every 2 seconds
**Challenge**: Detect when audio/video has stopped flowing (packets not increasing over time)

```
Pattern Regex: "RTP STATS"
```

**Sample Log Lines** (over 10 seconds):
```
17:15:56 DEBUG - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
17:15:58 DEBUG - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
17:16:00 DEBUG - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
17:16:02 DEBUG - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
17:16:04 DEBUG - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
```

**Parameter Extractors**:
```json
[
  {"name": "SESSION_ID", "regex": "session_id=(\\d+)"},
  {"name": "rx_pkts_recv", "regex": "rx_pkts_recv=(\\d+)"},
  {"name": "tx_pkts_sent", "regex": "tx_pkts_sent=(\\d+)"}
]
```

**Extracted Values** (each line):
- `SESSION_ID=0`, `rx_pkts_recv=0`, `tx_pkts_sent=0`

**Diagnosis**:
- **Normal**: Packet counts increase over time (54 → 154 → 254 → 354)
- **Problem**: Packet counts remain at 0 across multiple logs = **No audio/video flowing**

**Annotation Template**:
```html
<p>RTP Statistics: Session {{ SESSION_ID }}</p>
<p>⚠️ Packets received: {{ rx_pkts_recv }}, sent: {{ tx_pkts_sent }}</p>
<p style="color: orange;">⚠️ WARNING: No packet activity detected - possible audio/video issue</p>
```

**Condition Triggers** (checking for stalled media):
```json
[
  {
    "field": "rx_pkts_recv",
    "operator": "Equals",
    "value": "0",
    "severity": "Warning",
    "description": "No RX packets - no incoming audio/video"
  },
  {
    "field": "tx_pkts_sent",
    "operator": "Equals",
    "value": "0",
    "severity": "Warning",
    "description": "No TX packets - no outgoing audio/video"
  }
]
```

**Why This Pattern Is Powerful**:
1. **Repeating diagnostics** - Same pattern matches every 2 seconds
2. **Parameter trending** - User can see packet counts over time
3. **Early detection** - Zero packets for 10+ seconds = clear problem
4. **Context for troubleshooting** - Session ID helps correlate with call events

**Example Timeline in Editor**:
```
Line 38762: ⚠️ RTP Statistics: rx_pkts=0, tx_pkts=0  [17:15:56]
Line 39593: ⚠️ RTP Statistics: rx_pkts=0, tx_pkts=0  [17:15:58]
Line 41023: ⚠️ RTP Statistics: rx_pkts=0, tx_pkts=0  [17:16:00]
Line 44090: ⚠️ RTP Statistics: rx_pkts=0, tx_pkts=0  [17:16:02]
Line 45448: ⚠️ RTP Statistics: rx_pkts=0, tx_pkts=0  [17:16:04]
```

**Vs. Normal Call**:
```
Line 38762: ✓ RTP Statistics: rx_pkts=54, tx_pkts=77     [17:15:56]
Line 39593: ✓ RTP Statistics: rx_pkts=154, tx_pkts=178   [17:15:58]
Line 41023: ✓ RTP Statistics: rx_pkts=254, tx_pkts=279   [17:16:00]
Line 44090: ✓ RTP Statistics: rx_pkts=354, tx_pkts=379   [17:16:02]
Line 45448: ✓ RTP Statistics: rx_pkts=455, tx_pkts=479   [17:16:04]
```

**User can instantly see**: "Packets are stuck at 0 - there's no media flowing!"

---

### Temporal Analysis Benefits

#### 1. **Trend Detection**
Same parameter extracted repeatedly shows progression or stagnation:
- HTTP response times increasing → performance degradation
- Memory usage climbing → memory leak
- Error counts accumulating → cascading failure

#### 2. **Anomaly Detection**
Parameters that should change but don't:
- Packet counts stuck at 0 → media failure
- Session IDs not rotating → connection stuck
- Timestamps not advancing → processing hung

#### 3. **Rate Analysis**
Frequency of pattern matches:
- Login failures every 2 seconds → brute force attack
- Database timeouts spiking → connection pool exhaustion
- Cache misses increasing → cache invalidation storm

#### 4. **Correlation**
Multiple patterns with extracted session/user IDs:
- User john.doe → 5 failed auths → account locked → call dropped
- Session 0 → RTP packets=0 → "no audio" error → call ended

---

## Summary

The pattern matching system is designed with clear separation:

| Stage | Purpose | Input | Output |
|-------|---------|-------|--------|
| **Pattern Matching** | Find relevant lines | Log line | Match/No Match |
| **Parameter Extraction** | Extract variable values | Full matched line | Key-value pairs |
| **Severity Evaluation** | Determine actual severity | Extracted parameters + log level | Final severity |
| **Template Substitution** | Create human message | Template + parameters | Merged message |

This design allows for:
- ✅ Flexible, reusable patterns
- ✅ Context-aware severity escalation
- ✅ Clear, actionable diagnostic messages
- ✅ Powerful analysis capabilities
- ✅ Temporal trend analysis
- ✅ Anomaly and stagnation detection

**Key Takeaway**: The pattern regex finds the haystack, the parameter extractors find the needles, the condition triggers tell you if those needles are dangerous, and repeated matches over time reveal trends and problems that single log lines cannot show.