# Temporal Analysis Design: Detecting Issues Over Time

## Overview

Temporal analysis is the ability to detect problems by observing how extracted parameters change (or fail to change) across multiple log lines over time. This is critical for diagnosing issues that single log entries cannot reveal.

---

## Core Concept

**Single Log Analysis**: "This log line says packets=0"
**Temporal Analysis**: "Packets have been 0 for the last 10 seconds across 5 consecutive log lines"

The second diagnosis is far more actionable because it shows a **persistent problem**, not just a momentary state.

---

## Real-World Examples

### Example 1: No Audio/Video Detection (RTP Statistics)

**Scenario**: User reports "no audio" during a Jabber call

**Traditional Approach** (without parameter extraction):
- Search for "no audio" or "RTP" in logs
- Find hundreds of RTP STATS lines
- Manually compare packet counts across lines
- Takes 10+ minutes to diagnose

**With Temporal Analysis**:
```
Pattern: "RTP STATS"
Extractors: rx_pkts_recv, tx_pkts_sent
```

**Log Timeline**:
```
17:15:56 | RTP STATS | rx=0, tx=0     ⚠️
17:15:58 | RTP STATS | rx=0, tx=0     ⚠️
17:16:00 | RTP STATS | rx=0, tx=0     ⚠️
17:16:02 | RTP STATS | rx=0, tx=0     ⚠️
17:16:04 | RTP STATS | rx=0, tx=0     ⚠️ PROBLEM: 5 consecutive zeros!
```

**Diagnosis**: Immediate - packets stuck at 0 = no media flowing

**Editor View** (with our LSP):
```
Line 38762: ⚠️ RTP Stats: rx=0, tx=0 [Session 0]
Line 39593: ⚠️ RTP Stats: rx=0, tx=0 [Session 0]
Line 41023: ⚠️ RTP Stats: rx=0, tx=0 [Session 0]
Line 44090: ⚠️ RTP Stats: rx=0, tx=0 [Session 0]
Line 45448: ⚠️ RTP Stats: rx=0, tx=0 [Session 0]
            ↑ User can instantly see the pattern
```

**Result**: Diagnosis in seconds, not minutes

---

### Example 2: Performance Degradation (HTTP Response Times)

**Scenario**: API becoming slow over time

**Pattern**: `HTTP Response`
**Extractors**: `status_code`, `response_time`, `endpoint`

**Log Timeline**:
```
10:00:00 | HTTP 200 /api/users      | 45ms   ✓
10:00:30 | HTTP 200 /api/users      | 52ms   ✓
10:01:00 | HTTP 200 /api/users      | 89ms   ⚠️ trending up
10:01:30 | HTTP 200 /api/users      | 134ms  ⚠️
10:02:00 | HTTP 200 /api/users      | 287ms  🔴 severe degradation
10:02:30 | HTTP 200 /api/users      | 543ms  🔴
10:03:00 | HTTP 504 /api/users      | timeout 🔴 now failing
```

**Diagnosis**: Response times climbing → eventually timing out

**Visual in Editor**:
```
Line 1234: ✓ HTTP 200 /api/users (45ms)
Line 1567: ✓ HTTP 200 /api/users (52ms)
Line 1893: ⚠️ HTTP 200 /api/users (89ms) [+85% slower]
Line 2145: ⚠️ HTTP 200 /api/users (134ms) [+198% slower]
Line 2489: 🔴 HTTP 200 /api/users (287ms) [+538% slower]
Line 2756: 🔴 HTTP 200 /api/users (543ms) [+1107% slower]
Line 3021: 🔴 HTTP 504 /api/users (timeout) [FAILED]
```

**Root Cause Visible**: Performance degradation over 3 minutes leading to failure

---

### Example 3: Memory Leak Detection

**Pattern**: `Memory usage`
**Extractors**: `heap_used_mb`, `heap_total_mb`, `process_id`

**Log Timeline** (every 30 seconds):
```
09:00:00 | Heap: 245MB / 512MB  (48%)  ✓
09:00:30 | Heap: 267MB / 512MB  (52%)  ✓
09:01:00 | Heap: 289MB / 512MB  (56%)  ⚠️
09:01:30 | Heap: 312MB / 512MB  (61%)  ⚠️
09:02:00 | Heap: 334MB / 512MB  (65%)  ⚠️
09:02:30 | Heap: 358MB / 512MB  (70%)  ⚠️
09:03:00 | Heap: 381MB / 512MB  (74%)  🔴
09:03:30 | Heap: 405MB / 512MB  (79%)  🔴
09:04:00 | Heap: 429MB / 512MB  (84%)  🔴
09:04:30 | Heap: 453MB / 512MB  (88%)  🔴
09:05:00 | Heap: 477MB / 512MB  (93%)  🔴 approaching limit
09:05:30 | Heap: 501MB / 512MB  (98%)  🔴 critical
09:06:00 | OutOfMemoryError             🔴 crash
```

**Diagnosis**: Steady 22MB/30sec increase = memory leak
**Prediction**: Will crash at ~09:06:00 (based on trend)
**Action**: Restart required before crash

---

## Design Patterns for Temporal Analysis

### Pattern 1: Stagnation Detection
**When to use**: Values should change but don't
**Examples**: 
- Packet counts stuck at 0
- Session IDs not rotating
- Timestamps frozen
- Progress counters not incrementing

**Implementation**:
```json
{
  "pattern": "RTP STATS",
  "extractors": [
    {"name": "rx_pkts", "regex": "rx_pkts_recv=(\\d+)"}
  ],
  "conditions": [
    {
      "field": "rx_pkts",
      "operator": "Equals",
      "value": "0",
      "severity": "Warning",
      "annotation": "No packets received - possible media failure"
    }
  ]
}
```

**User sees**: Multiple warnings with same value → recognizes stagnation

---

### Pattern 2: Trend Detection (Increasing)
**When to use**: Values climbing toward a threshold
**Examples**:
- Response times increasing
- Memory usage growing
- Error rates climbing
- Queue depths building up

**Implementation**:
```json
{
  "pattern": "Memory usage",
  "extractors": [
    {"name": "heap_mb", "regex": "heap=(\\d+)MB"}
  ],
  "conditions": [
    {"field": "heap_mb", "operator": "GreaterThan", "value": "400", "severity": "Warning"},
    {"field": "heap_mb", "operator": "GreaterThan", "value": "450", "severity": "Error"}
  ]
}
```

**User sees**: Escalating severity across lines → recognizes trend

---

### Pattern 3: Frequency Analysis
**When to use**: Rate of events indicates problem
**Examples**:
- Login failures every 2 seconds = brute force
- Connection retries spiking = network issue
- Cache misses increasing = cache problem

**Implementation**: Same pattern matching multiple times per second

**User sees**: Dense clustering of diagnostics → recognizes high frequency

---

### Pattern 4: Value Oscillation
**When to use**: Values flip-flopping indicates instability
**Examples**:
- Connection state: up/down/up/down
- Leader election: nodeA/nodeB/nodeA/nodeB
- Health checks: pass/fail/pass/fail

**Implementation**:
```json
{
  "pattern": "Connection state",
  "extractors": [
    {"name": "state", "regex": "state=(\\w+)"}
  ],
  "conditions": [
    {"field": "state", "operator": "Equals", "value": "DOWN", "severity": "Error"}
  ]
}
```

**User sees**: Alternating Error/Info diagnostics → recognizes instability

---

## Implementation Architecture

### Phase 1: Single-Line Analysis (Current)
✅ **Status**: Implemented

**Capabilities**:
- Pattern matching per line
- Parameter extraction per match
- Severity evaluation per line
- Diagnostic per match

**User Experience**:
- Diagnostics appear on matching lines
- Parameters show in diagnostic data
- User can manually observe patterns over multiple lines

---

### Phase 2: Multi-Line Context (Partially Implemented)
🔄 **Status**: Multi-line pattern matching exists, but not temporal aggregation

**Current Capabilities**:
- Multi-line pattern regex (e.g., stack traces)
- Context lines included in matches

**Missing**:
- Parameter aggregation across matches
- Trend calculation
- Anomaly detection

---

### Phase 3: Temporal Aggregation (Future)
📋 **Status**: Not yet implemented

**Proposed Features**:

#### 3.1 Session-Based Tracking
Track parameters by session/user/connection ID:
```rust
struct SessionTracker {
    session_id: String,
    pattern_id: String,
    parameter_history: Vec<(Timestamp, HashMap<String, String>)>,
}
```

**Example**:
```rust
// Track RTP stats for session_id=0
session_0.rx_pkts_history = [
    (17:15:56, 0),
    (17:15:58, 0),
    (17:16:00, 0),
    (17:16:02, 0),
    (17:16:04, 0),
]
// Detect: All zeros → no media
```

#### 3.2 Trend Analysis
Calculate trends from parameter history:
```rust
fn calculate_trend(history: &[(Timestamp, i64)]) -> TrendType {
    // Linear regression or simple delta analysis
    if all_same(history) { TrendType::Stagnant }
    else if increasing(history) { TrendType::Increasing }
    else if decreasing(history) { TrendType::Decreasing }
    else { TrendType::Oscillating }
}
```

#### 3.3 Anomaly Detection
Flag abnormal patterns:
```rust
fn detect_anomaly(history: &[i64], latest: i64) -> Option<Anomaly> {
    let mean = average(history);
    let stddev = std_deviation(history);
    
    if abs(latest - mean) > 2.0 * stddev {
        Some(Anomaly::OutOfNormalRange)
    } else if all_equal(history) && latest == history[0] {
        Some(Anomaly::Stagnation)
    } else {
        None
    }
}
```

#### 3.4 Predictive Alerts
Forecast problems before they occur:
```rust
fn predict_threshold_breach(
    history: &[(Timestamp, i64)],
    threshold: i64
) -> Option<Duration> {
    let rate = calculate_rate_of_change(history);
    let current = history.last().unwrap().1;
    let remaining = threshold - current;
    
    if rate > 0 && remaining > 0 {
        Some(Duration::from_secs(remaining / rate))
    } else {
        None
    }
}
```

**Example**: "Memory will reach 512MB limit in ~3 minutes at current rate"

---

## Data Structures

### Temporal Context Store
```rust
struct TemporalContext {
    // Key: (pattern_id, session_id)
    sessions: HashMap<(String, String), SessionHistory>,
    
    // Key: pattern_id
    global_patterns: HashMap<String, GlobalHistory>,
    
    // Configuration
    max_history_size: usize,
    time_window: Duration,
}

struct SessionHistory {
    session_id: String,
    pattern_id: String,
    first_seen: Timestamp,
    last_seen: Timestamp,
    match_count: usize,
    parameter_timeline: Vec<ParameterSnapshot>,
}

struct ParameterSnapshot {
    timestamp: Timestamp,
    line_number: usize,
    parameters: HashMap<String, String>,
}

struct GlobalHistory {
    pattern_id: String,
    total_matches: usize,
    first_match: Timestamp,
    last_match: Timestamp,
    frequency: f64, // matches per second
}
```

---

## Diagnostic Enhancements for Temporal Analysis

### Current Diagnostic (Single Match)
```json
{
  "message": "RTP Statistics: rx=0, tx=0",
  "data": {
    "template": "RTP Statistics: rx={{ rx_pkts }}, tx={{ tx_pkts }}",
    "merged_template": "RTP Statistics: rx=0, tx=0",
    "extracted_parameters": [
      {"name": "rx_pkts", "value": "0"},
      {"name": "tx_pkts", "value": "0"}
    ],
    "pattern_id": "rtp_stats_pattern"
  }
}
```

### Enhanced Diagnostic (with Temporal Context)
```json
{
  "message": "⚠️ RTP Statistics: rx=0, tx=0 (STAGNANT for 10s)",
  "data": {
    "template": "RTP Statistics: rx={{ rx_pkts }}, tx={{ tx_pkts }}",
    "merged_template": "RTP Statistics: rx=0, tx=0",
    "extracted_parameters": [
      {"name": "rx_pkts", "value": "0"},
      {"name": "tx_pkts", "value": "0"}
    ],
    "pattern_id": "rtp_stats_pattern",
    
    // NEW: Temporal analysis
    "temporal": {
      "session_id": "0",
      "occurrence_count": 5,
      "time_span": "10s",
      "trend": "stagnant",
      "anomaly": "zero_packets_detected",
      "previous_values": {
        "rx_pkts": ["0", "0", "0", "0", "0"],
        "tx_pkts": ["0", "0", "0", "0", "0"]
      },
      "diagnosis": "No packet activity detected for 10 seconds - possible media failure"
    }
  }
}
```

---

## User Interface Enhancements

### Current: Individual Diagnostics
```
Line 38762: ⚠️ RTP Statistics: rx=0, tx=0
Line 39593: ⚠️ RTP Statistics: rx=0, tx=0
Line 41023: ⚠️ RTP Statistics: rx=0, tx=0
Line 44090: ⚠️ RTP Statistics: rx=0, tx=0
Line 45448: ⚠️ RTP Statistics: rx=0, tx=0
```

### Enhanced: Temporal Summary Card
```
╔══════════════════════════════════════════════════════════╗
║ 🔴 TEMPORAL PATTERN DETECTED                             ║
╟──────────────────────────────────────────────────────────╢
║ Pattern: RTP Statistics (Session 0)                      ║
║ Issue: Media stagnation                                  ║
║ Duration: 10 seconds (5 occurrences)                     ║
║ Lines: 38762, 39593, 41023, 44090, 45448                 ║
║                                                          ║
║ rx_pkts: 0 → 0 → 0 → 0 → 0  (STAGNANT)                  ║
║ tx_pkts: 0 → 0 → 0 → 0 → 0  (STAGNANT)                  ║
║                                                          ║
║ Diagnosis: No audio/video packets flowing                ║
║ Action: Check network connectivity, codec negotiation    ║
╚══════════════════════════════════════════════════════════╝
```

### Hover Tooltip Enhancement
**Current**:
```
RTP Statistics: rx=0, tx=0
Pattern: rtp_stats_pattern
```

**Enhanced**:
```
RTP Statistics: rx=0, tx=0

⚠️ This value has been STAGNANT for 10 seconds
   (5 consecutive occurrences)

Previous values:
  17:15:56 - rx=0, tx=0
  17:15:58 - rx=0, tx=0
  17:16:00 - rx=0, tx=0
  17:16:02 - rx=0, tx=0
  17:16:04 - rx=0, tx=0 (current)

Possible cause: Media not flowing (codec issue, network problem)
```

---

## Implementation Roadmap

### Phase 1: Foundation (✅ Complete)
- [x] Pattern matching engine
- [x] Parameter extraction from full line
- [x] Single-line diagnostics
- [x] Condition-based severity

### Phase 2: Data Collection (Next)
- [ ] Session ID extraction and tracking
- [ ] Parameter history storage (in-memory)
- [ ] Time-based windowing (last N seconds)
- [ ] Occurrence counting per session

### Phase 3: Analysis Engine
- [ ] Stagnation detection (same value over time)
- [ ] Trend calculation (increasing/decreasing)
- [ ] Frequency analysis (events per second)
- [ ] Anomaly detection (statistical outliers)

### Phase 4: Enhanced Diagnostics
- [ ] Temporal context in diagnostic data
- [ ] Summary cards for temporal patterns
- [ ] Enhanced hover tooltips with history
- [ ] Timeline visualization

### Phase 5: Predictive Alerts
- [ ] Threshold breach prediction
- [ ] Performance degradation forecasting
- [ ] Resource exhaustion warnings
- [ ] Cascading failure detection

---

## Configuration

### Pattern Configuration (Extended)
```json
{
  "pattern": "RTP STATS",
  "extractors": [
    {"name": "session_id", "regex": "session_id=(\\d+)"},
    {"name": "rx_pkts", "regex": "rx_pkts_recv=(\\d+)"}
  ],
  "temporal_analysis": {
    "enabled": true,
    "track_by": "session_id",
    "window_size": 60,
    "min_occurrences": 3,
    "detection_rules": [
      {
        "type": "stagnation",
        "field": "rx_pkts",
        "threshold": 5,
        "severity": "Warning",
        "message": "No packet activity - possible media failure"
      },
      {
        "type": "trend",
        "field": "rx_pkts",
        "direction": "decreasing",
        "rate_threshold": 0.5,
        "severity": "Warning",
        "message": "Packet loss increasing - media quality degrading"
      }
    ]
  }
}
```

---

## Benefits

### For Users
1. **Faster Diagnosis**: Spot patterns in seconds vs. minutes
2. **Proactive Alerting**: Catch problems before they become critical
3. **Better Context**: Understand not just what happened, but how it evolved
4. **Clearer Root Cause**: Trends reveal causation better than individual events

### For Developers
1. **Rich Telemetry**: Extract and track any parameter
2. **Flexible Analysis**: Multiple detection strategies (stagnation, trends, anomalies)
3. **Extensible**: Easy to add new temporal patterns
4. **Efficient**: In-memory tracking with configurable windows

### For Support Teams
1. **Pattern Recognition**: Identify known issues quickly
2. **Evidence Collection**: Show customer the timeline of events
3. **Validation**: Prove the issue with concrete data trends
4. **Knowledge Base**: Build library of temporal patterns for common issues

---

## Summary

Temporal analysis transforms log analysis from:
- ❌ "Find a needle in a haystack"
- ✅ "Understand how the haystack is changing over time"

By extracting parameters and tracking them across multiple log lines, we enable:
- **Stagnation detection**: Values stuck when they should change
- **Trend analysis**: Values climbing/falling toward thresholds
- **Frequency analysis**: Events happening too often/rarely
- **Anomaly detection**: Unusual patterns in otherwise normal logs

**Key Implementation Points**:
1. Parameter extraction from full line (✅ Complete)
2. Session/ID-based tracking (📋 Next)
3. Time-windowed history (📋 Next)
4. Analysis algorithms (📋 Future)
5. Enhanced diagnostics (📋 Future)

This design enables powerful temporal analysis while maintaining the clean separation of concerns in our pattern system.