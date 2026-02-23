# 🎯 Phase 3: Call Flow Analysis - Implementation Plan

**Status**: Ready to Start ⭐ **HIGHEST VALUE FEATURE**  
**Timeline**: 2-3 weeks  
**Complexity**: High  
**Value**: Very High (Core troubleshooting capability)

---

## 📋 Executive Summary

### What We're Building

A complete call flow analysis system that:
1. ✅ Parses CTRACE logs (14-field pipe-delimited format)
2. ✅ Correlates SIP messages by Call-ID/GUID
3. ✅ Builds call sessions with state tracking
4. ✅ Generates ASCII ladder diagrams
5. ✅ Provides CLI commands for analysis
6. ✅ Integrates cause code translation
7. ✅ Detects failure patterns and root causes

### User Experience

```bash
# Analyze a CTRACE log file
$ log-scout call-flow analyze cucm_ctrace.log

Found 15 calls in log file:

Call 1: 001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
  From: SEP00000000111G (5.5.5.45:58096)
  To: 5.5.5.240:5060
  Duration: 45 seconds
  Status: ✅ Connected
  Messages: 12

Call 2: 001a2f8d-f17f0005-280e0e49-7d091010@5.5.5.240
  From: SEP00000000222G (5.5.5.46:58097)
  To: 5.5.5.240:5060
  Duration: N/A
  Status: ❌ Failed (486 Busy Here)
  Messages: 5

# Show specific call flow
$ log-scout call-flow show 001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240

Call Flow: 001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
═══════════════════════════════════════════════════════════════

Caller: [SEP00000000111G] 5.5.5.45:58096
Callee: 5.5.5.240:5060
Duration: 45 seconds (Ring: 2s, Connected: 43s)

    Caller                   CUCM                    Callee
      |                       |                        |
10:45:00.949                                           
      |-------- INVITE ------>|                        |
      |                       |-------- INVITE ------->|
      |                       |                        |
10:45:01.012                                           
      |<------ 100 Trying ----|                        |
      |                       |<------ 100 Trying -----|
      |                       |                        |
10:45:01.156                                           
      |                       |<------ 180 Ringing ----|
      |<------ 180 Ringing ---|                        |
      |                       |                        |
10:45:02.891                                           
      |                       |<------ 200 OK ---------|
      |<------ 200 OK --------|                        |
      |                       |                        |
10:45:03.001                                           
      |-------- ACK --------->|                        |
      |                       |-------- ACK ---------->|
      |                       |                        |
      |<======== RTP Media Stream ===================>|
      |                       |                        |
10:45:48.234                                           
      |-------- BYE --------->|                        |
      |                       |-------- BYE ---------->|
      |                       |                        |
10:45:48.456                                           
      |                       |<------ 200 OK ---------|
      |<------ 200 OK --------|                        |
      |                       |                        |

Call Summary:
  • Ring Duration: 1.942s (INVITE → 200 OK)
  • Setup Time: 0.110s (200 OK → ACK)
  • Connected Duration: 45.233s (ACK → BYE)
  • Total Call Duration: 47.507s
  • Messages: 12 total (6 IN, 6 OUT)
  • Transport: TCP
  • Correlation ID: correlation-id
```

### Why This Matters

**Current Problem**: Engineers manually correlate SIP messages across hundreds of log lines
**Solution**: Automated call flow extraction and visualization
**Impact**: 10-30 minutes saved per troubleshooting session

---

## 🏗️ Architecture Overview

### Component Structure

```
crates/pattern-engine/src/
├── normalizers/
│   ├── ctrace_normalizer.rs      ✨ NEW - Parse CTRACE format
│   └── mod.rs                     (export CtracNormalizer)
│
├── call_flow/                     ✨ NEW MODULE
│   ├── mod.rs                     (public API)
│   ├── types.rs                   (CallSession, CallState, etc.)
│   ├── correlator.rs              (Group messages by Call-ID)
│   ├── session_builder.rs         (Build call sessions)
│   ├── state_machine.rs           (Call state tracking)
│   ├── timing_analyzer.rs         (Calculate durations)
│   ├── diagram_renderer.rs        (ASCII ladder diagrams)
│   └── failure_detector.rs        (Root cause analysis)
│
└── cause_codes/                   ✅ EXISTING
    └── registry.rs                (For integration)

crates/log-scout-cli/src/
├── commands/
│   └── call_flow.rs               ✨ NEW - CLI commands
└── main.rs                        (add call-flow subcommand)

tests/
├── ctrace_normalizer_test.rs      ✨ NEW
├── call_flow_test.rs              ✨ NEW
└── fixtures/
    └── ctrace_samples.txt         ✨ NEW
```

---

## 📊 CTRACE Log Format Specification

### Format Structure

**14 pipe-delimited fields**:

```
Timestamp|Service|ProtoNum|Transport|Direction|ReceiverIP|ReceiverPort|MAC|SenderIP|SenderPort|CorrelationID|MessageTag|GUID|SIPMethod
```

### Field Definitions

| # | Field | Example | Description |
|---|-------|---------|-------------|
| 1 | Timestamp | `2009/12/17 10:45:00.949` | Format: `yyyy/MM/dd HH:mm:ss:SSS` |
| 2 | Service | `SIPL` or `SIPT` | SIP Layer/Transport |
| 3 | Protocol Number | `0` | Protocol identifier |
| 4 | Transport | `TCP`, `UDP`, `TLS` | Transport protocol |
| 5 | Direction | `IN` or `OUT` | Message direction |
| 6 | Receiver IP | `5.5.5.45` | Destination IP |
| 7 | Receiver Port | `58096` | Destination port |
| 8 | MAC Address | `SEP00000000111G` | Device identifier |
| 9 | Sender IP | `5.5.5.240` | Source IP |
| 10 | Sender Port | `5060` | Source port |
| 11 | Correlation ID | `correlation-id` | Call correlation |
| 12 | Message Tag | `MessageTag1` | Message identifier |
| 13 | GUID | `001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240` | Call-ID (SIP) |
| 14 | SIP Method/Response | `INVITE`, `100 Trying`, `200 OK` | SIP message type |

### Example Messages

**INVITE (IN)**:
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

**100 Trying (OUT)**:
```
2009/12/17 10:45:01.012|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag2|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|100 Trying
```

**180 Ringing (OUT)**:
```
2009/12/17 10:45:01.156|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag3|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|180 Ringing
```

**200 OK (OUT)**:
```
2009/12/17 10:45:02.891|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag4|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|200 OK
```

**BYE (IN)**:
```
2009/12/17 10:45:48.234|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag5|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|BYE
```

---

## 🎯 Implementation Phases

### Phase 3.1: CTRACE Normalizer (3-5 days)

**Goal**: Parse CTRACE logs into NormalizedEvent format

#### 3.1.1 Create Data Structures

**File**: `crates/pattern-engine/src/call_flow/types.rs`

```rust
/// CTRACE log entry
#[derive(Debug, Clone)]
pub struct CtraceEntry {
    pub timestamp: DateTime<Utc>,
    pub service: String,           // SIPL/SIPT
    pub protocol_num: u8,
    pub transport: Transport,      // TCP/UDP/TLS
    pub direction: Direction,      // IN/OUT
    pub receiver_ip: String,
    pub receiver_port: u16,
    pub mac_address: String,
    pub sender_ip: String,
    pub sender_port: u16,
    pub correlation_id: String,
    pub message_tag: String,
    pub guid: String,              // Call-ID
    pub sip_message: String,       // INVITE, 200 OK, etc.
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Transport {
    Tcp,
    Udp,
    Tls,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    In,
    Out,
}

/// Call session (grouped messages)
#[derive(Debug, Clone)]
pub struct CallSession {
    pub call_id: String,           // GUID
    pub correlation_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub caller: Endpoint,
    pub callee: Endpoint,
    pub messages: Vec<CtraceEntry>,
    pub state: CallState,
    pub timings: CallTimings,
}

#[derive(Debug, Clone)]
pub struct Endpoint {
    pub mac_address: String,
    pub ip: String,
    pub port: u16,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CallState {
    Initial,
    Calling,       // INVITE sent
    Proceeding,    // 1xx received
    Ringing,       // 180 received
    Connected,     // 200 OK + ACK
    Disconnecting, // BYE sent
    Terminated,    // BYE acknowledged
    Failed,        // 4xx/5xx/6xx
    Cancelled,     // CANCEL sent
}

#[derive(Debug, Clone, Default)]
pub struct CallTimings {
    pub ring_duration: Option<Duration>,      // INVITE → 200 OK
    pub setup_time: Option<Duration>,         // 200 OK → ACK
    pub connected_duration: Option<Duration>, // ACK → BYE
    pub total_duration: Option<Duration>,     // INVITE → Final
}
```

#### 3.1.2 Create CTRACE Normalizer

**File**: `crates/pattern-engine/src/normalizers/ctrace_normalizer.rs`

**TDD Approach**:

1. **Test 1: Parse basic INVITE**
```rust
#[test]
fn test_parse_ctrace_invite() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";
    
    let event = normalizer.normalize(log).unwrap();
    
    assert_eq!(event.vendor.vendor_type, "cisco_cucm_ctrace");
    assert_eq!(event.event_type, "sip_invite");
    
    let entry = event.metadata.get("ctrace_entry").unwrap();
    assert_eq!(entry.direction, "IN");
    assert_eq!(entry.guid, "001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240");
}
```

2. **Test 2: Parse response codes**
3. **Test 3: Parse all transports (TCP/UDP/TLS)**
4. **Test 4: Parse both directions (IN/OUT)**
5. **Test 5: Extract endpoints**
6. **Test 6: Handle malformed logs**

**Implementation**:
```rust
pub struct CtraceNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CtraceNormalizer {
    pub fn new() -> Self { /* ... */ }
    
    fn parse_ctrace_line(&self, line: &str) -> Result<CtraceEntry> {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() != 14 {
            return Err(NormalizationError::InvalidFormat);
        }
        
        Ok(CtraceEntry {
            timestamp: parse_timestamp(parts[0])?,
            service: parts[1].to_string(),
            protocol_num: parts[2].parse()?,
            transport: parse_transport(parts[3])?,
            direction: parse_direction(parts[4])?,
            receiver_ip: parts[5].to_string(),
            receiver_port: parts[6].parse()?,
            mac_address: parts[7].to_string(),
            sender_ip: parts[8].to_string(),
            sender_port: parts[9].parse()?,
            correlation_id: parts[10].to_string(),
            message_tag: parts[11].to_string(),
            guid: parts[12].to_string(),
            sip_message: parts[13].to_string(),
        })
    }
}

impl VendorNormalizer for CtraceNormalizer {
    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for CTRACE format markers
        log_line.contains("|SIPL|") || log_line.contains("|SIPT|")
    }
    
    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent> {
        let entry = self.parse_ctrace_line(log_line)?;
        
        // Convert to NormalizedEvent
        // Similar to CucmNormalizer approach
    }
}
```

**Deliverables**:
- ✅ `ctrace_normalizer.rs` (200-300 lines)
- ✅ 15+ tests passing
- ✅ Exported in `normalizers/mod.rs`

---

### Phase 3.2: Call Correlation Engine (3-4 days)

**Goal**: Group CTRACE messages by Call-ID into sessions

#### 3.2.1 Message Correlator

**File**: `crates/pattern-engine/src/call_flow/correlator.rs`

**TDD Tests**:

1. **Test: Group messages by GUID**
```rust
#[test]
fn test_correlate_by_guid() {
    let correlator = CallCorrelator::new();
    let messages = vec![
        // INVITE for call 1
        // 100 Trying for call 1
        // INVITE for call 2
        // 180 Ringing for call 1
    ];
    
    let sessions = correlator.correlate(messages);
    assert_eq!(sessions.len(), 2);
    assert_eq!(sessions[0].messages.len(), 3); // Call 1
    assert_eq!(sessions[1].messages.len(), 1); // Call 2
}
```

2. **Test: Handle concurrent calls**
3. **Test: Sort messages chronologically**
4. **Test: Track correlation IDs**

**Implementation**:
```rust
pub struct CallCorrelator {
    sessions: HashMap<String, CallSession>,
}

impl CallCorrelator {
    pub fn new() -> Self { /* ... */ }
    
    pub fn add_message(&mut self, entry: CtraceEntry) {
        let session = self.sessions
            .entry(entry.guid.clone())
            .or_insert_with(|| CallSession::new(entry.guid.clone()));
        
        session.add_message(entry);
    }
    
    pub fn get_sessions(&self) -> Vec<CallSession> {
        self.sessions.values().cloned().collect()
    }
    
    pub fn get_session(&self, call_id: &str) -> Option<&CallSession> {
        self.sessions.get(call_id)
    }
}
```

#### 3.2.2 Session Builder

**File**: `crates/pattern-engine/src/call_flow/session_builder.rs`

```rust
impl CallSession {
    pub fn new(call_id: String) -> Self { /* ... */ }
    
    pub fn add_message(&mut self, entry: CtraceEntry) {
        // Add message
        self.messages.push(entry.clone());
        
        // Sort chronologically
        self.messages.sort_by_key(|m| m.timestamp);
        
        // Update endpoints
        self.update_endpoints(&entry);
        
        // Update state
        self.update_state(&entry);
        
        // Update timings
        self.update_timings();
    }
    
    fn update_endpoints(&mut self, entry: &CtraceEntry) {
        // Determine caller/callee from first INVITE
    }
    
    fn update_state(&mut self, entry: &CtraceEntry) {
        // State machine logic (see Phase 3.3)
    }
    
    fn update_timings(&mut self) {
        // Calculate durations (see Phase 3.4)
    }
}
```

**Deliverables**:
- ✅ `correlator.rs` (150-200 lines)
- ✅ `session_builder.rs` (200-250 lines)
- ✅ 20+ tests passing

---

### Phase 3.3: Call State Machine (2-3 days)

**Goal**: Track call state transitions

#### State Diagram

```
                  ┌─────────┐
                  │ Initial │
                  └────┬────┘
                       │
                   INVITE
                       │
                  ┌────▼────┐
           ┌──────┤ Calling ├──────┐
           │      └────┬────┘      │
           │           │           │
        CANCEL      1xx Trying     │
           │           │        4xx/5xx
           │      ┌────▼────┐      │
           │      │Proceed- │      │
           │      │  ing    │      │
           │      └────┬────┘      │
           │           │           │
           │      180 Ringing      │
           │           │           │
           │      ┌────▼────┐      │
           │      │ Ringing │      │
           │      └────┬────┘      │
           │           │           │
           │        200 OK         │
           │           │           │
           │      ┌────▼────┐      │
           │      │Connected│      │
           │      └────┬────┘      │
           │           │           │
           │         BYE           │
           │           │           │
           │   ┌───────▼────────┐  │
           │   │ Disconnecting  │  │
           │   └───────┬────────┘  │
           │           │           │
           │       200 OK          │
           │           │           │
      ┌────▼───────────▼──────┬────▼────┐
      │    Cancelled           │  Failed │
      └────────────────────────┴─────────┘
                       │
                  ┌────▼────┐
                  │Terminated│
                  └─────────┘
```

**File**: `crates/pattern-engine/src/call_flow/state_machine.rs`

**TDD Tests**:

1. **Test: Successful call flow**
```rust
#[test]
fn test_successful_call_flow() {
    let mut session = CallSession::new("test-call-id".to_string());
    
    // INVITE
    session.add_message(create_invite());
    assert_eq!(session.state, CallState::Calling);
    
    // 100 Trying
    session.add_message(create_100_trying());
    assert_eq!(session.state, CallState::Proceeding);
    
    // 180 Ringing
    session.add_message(create_180_ringing());
    assert_eq!(session.state, CallState::Ringing);
    
    // 200 OK
    session.add_message(create_200_ok());
    assert_eq!(session.state, CallState::Connected);
    
    // BYE
    session.add_message(create_bye());
    assert_eq!(session.state, CallState::Disconnecting);
    
    // 200 OK (to BYE)
    session.add_message(create_200_ok());
    assert_eq!(session.state, CallState::Terminated);
}
```

2. **Test: Failed call (486 Busy)**
3. **Test: Cancelled call**
4. **Test: Timeout scenario**

**Implementation**:
```rust
impl CallSession {
    pub fn update_state(&mut self, entry: &CtraceEntry) {
        use CallState::*;
        
        let new_state = match (&self.state, entry.sip_message.as_str()) {
            (Initial, "INVITE") => Calling,
            (Calling, msg) if msg.starts_with("1") => Proceeding,
            (Proceeding | Ringing, "180 Ringing") => Ringing,
            (_, "200 OK") if self.waiting_for_bye_response() => Terminated,
            (_, "200 OK") => Connected,
            (_, "BYE") => Disconnecting,
            (_, "CANCEL") => Cancelled,
            (_, msg) if msg.starts_with("4") || 
                        msg.starts_with("5") || 
                        msg.starts_with("6") => Failed,
            _ => return, // No state change
        };
        
        self.state = new_state;
    }
    
    fn waiting_for_bye_response(&self) -> bool {
        self.state == CallState::Disconnecting
    }
}
```

**Deliverables**:
- ✅ `state_machine.rs` (150-200 lines)
- ✅ 15+ state transition tests
- ✅ All edge cases covered

---

### Phase 3.4: Timing Analyzer (2-3 days)

**Goal**: Calculate call durations and timing metrics

**File**: `crates/pattern-engine/src/call_flow/timing_analyzer.rs`

**TDD Tests**:

1. **Test: Ring duration (INVITE → 200 OK)**
```rust
#[test]
fn test_calculate_ring_duration() {
    let mut session = CallSession::new("test-call-id".to_string());
    
    let invite_time = Utc.ymd(2024, 1, 15).and_hms_milli(10, 0, 0, 0);
    let ok_time = Utc.ymd(2024, 1, 15).and_hms_milli(10, 0, 2, 500);
    
    session.add_message(create_invite_at(invite_time));
    session.add_message(create_200_ok_at(ok_time));
    
    let timings = session.calculate_timings();
    assert_eq!(timings.ring_duration, Some(Duration::milliseconds(2500)));
}
```

2. **Test: Setup time (200 OK → ACK)**
3. **Test: Connected duration (ACK → BYE)**
4. **Test: Total duration**

**Implementation**:
```rust
impl CallSession {
    pub fn calculate_timings(&self) -> CallTimings {
        let mut timings = CallTimings::default();
        
        // Find key timestamps
        let invite_time = self.find_first_message("INVITE")
            .map(|m| m.timestamp);
        let ok_time = self.find_first_message("200 OK")
            .map(|m| m.timestamp);
        let ack_time = self.find_first_message("ACK")
            .map(|m| m.timestamp);
        let bye_time = self.find_first_message("BYE")
            .map(|m| m.timestamp);
        
        // Ring duration: INVITE → 200 OK
        if let (Some(invite), Some(ok)) = (invite_time, ok_time) {
            timings.ring_duration = Some(ok - invite);
        }
        
        // Setup time: 200 OK → ACK
        if let (Some(ok), Some(ack)) = (ok_time, ack_time) {
            timings.setup_time = Some(ack - ok);
        }
        
        // Connected duration: ACK → BYE
        if let (Some(ack), Some(bye)) = (ack_time, bye_time) {
            timings.connected_duration = Some(bye - ack);
        }
        
        // Total duration: INVITE → Final
        if let (Some(invite), Some(final_time)) = (invite_time, self.end_time) {
            timings.total_duration = Some(final_time - invite);
        }
        
        timings
    }
    
    fn find_first_message(&self, msg_type: &str) -> Option<&CtraceEntry> {
        self.messages.iter()
            .find(|m| m.sip_message.starts_with(msg_type))
    }
}
```

**Deliverables**:
- ✅ `timing_analyzer.rs` (100-150 lines)
- ✅ 10+ timing calculation tests

---

### Phase 3.5: ASCII Diagram Renderer (3-4 days)

**Goal**: Generate beautiful ASCII ladder diagrams

**File**: `crates/pattern-engine/src/call_flow/diagram_renderer.rs`

**TDD Tests**:

1. **Test: Render simple INVITE flow**
```rust
#[test]
fn test_render_simple_invite() {
    let session = create_test_session();
    let renderer = DiagramRenderer::new();
    
    let diagram = renderer.render(&session);
    
    assert!(diagram.contains("INVITE"));
    assert!(diagram.contains("100 Trying"));
    assert!(diagram.contains("200 OK"));
    assert!(diagram.contains("ACK"));
}
```

2. **Test: Render three-party call (caller → proxy → callee)**
3. **Test: Render timestamps**
4. **Test: Highlight errors in red**

**Implementation**:
```rust
pub struct DiagramRenderer {
    width: usize,
    show_timestamps: bool,
    show_details: bool,
}

impl DiagramRenderer {
    pub fn new() -> Self {
        Self {
            width: 80,
            show_timestamps: true,
            show_details: false,
        }
    }
    
    pub fn render(&self, session: &CallSession) -> String {
        let mut output = String::new();
        
        // Header
        output.push_str(&self.render_header(session));
        output.push_str("\n");
        
        // Participants
        output.push_str(&self.render_participants(session));
        output.push_str("\n");
        
        // Messages
        for message in &session.messages {
            output.push_str(&self.render_message(message, session));
            output.push_str("\n");
        }
        
        // Summary
        output.push_str(&self.render_summary(session));
        
        output
    }
    
    fn render_header(&self, session: &CallSession) -> String {
        format!(
            "Call Flow: {}\n{}",
            session.call_id,
            "═".repeat(self.width)
        )
    }
    
    fn render_participants(&self, session: &CallSession) -> String {
        format!(
            "    {:<20} {:<20} {:<20}\n      |{:>19}|{:>19}|",
            "Caller", "CUCM", "Callee",
            "", ""
        )
    }
    
    fn render_message(&self, msg: &CtraceEntry, session: &CallSession) -> String {
        let timestamp = if self.show_timestamps {
            format!("{}\n", msg.timestamp.format("%H:%M:%S%.3f"))
        } else {
            String::new()
        };
        
        let arrow = match msg.direction {
            Direction::In => self.render_incoming_arrow(msg),
            Direction::Out => self.render_outgoing_arrow(msg),
        };
        
        format!("{}{}", timestamp, arrow)
    }
    
    fn render_incoming_arrow(&self, msg: &CtraceEntry) -> String {
        format!(
            "      |-------- {} ------>|",
            self.format_sip_message(&msg.sip_message)
        )
    }
    
    fn render_outgoing_arrow(&self, msg: &CtraceEntry) -> String {
        format!(
            "      |<------ {} -------|",
            self.format_sip_message(&msg.sip_message)
        )
    }
    
    fn format_sip_message(&self, msg: &str) -> String {
        // Truncate if too long, highlight errors
        let formatted = if msg.len() > 15 {
            format!("{}...", &msg[..12])
        } else {
            msg.to_string()
        };
        
        // Color code: red for errors, green for success
        if msg.starts_with('4') || msg.starts_with('5') || msg.starts_with('6') {
            format!("❌ {}", formatted)
        } else if msg == "200 OK" {
            format!("✅ {}", formatted)
        } else if msg == "180 Ringing" {
            format!("🔔 {}", formatted)
        } else {
            formatted
        }
    }
    
    fn render_summary(&self, session: &CallSession) -> String {
        let timings = &session.timings;
        
        format!(
            "\nCall Summary:\n\
             • Ring Duration: {}\n\
             • Setup Time: {}\n\
             • Connected Duration: {}\n\
             • Total Duration: {}\n\
             • Messages: {} total ({} IN, {} OUT)\n\
             • Transport: {}\n\
             • State: {:?}",
            format_duration(timings.ring_duration),
            format_duration(timings.setup_time),
            format_duration(timings.connected_duration),
            format_duration(timings.total_duration),
            session.messages.len(),
            session.count_incoming(),
            session.count_outgoing(),
            session.get_transport(),
            session.state
        )
    }
}

fn format_duration(duration: Option<Duration>) -> String {
    duration
        .map(|d| format!("{:.3}s", d.num_milliseconds() as f64 / 1000.0))
        .unwrap_or_else(|| "N/A".to_string())
}
```

**Deliverables**:
- ✅ `diagram_renderer.rs` (300-400 lines)
- ✅ 15+ rendering tests
- ✅ Beautiful ASCII output with emojis

---

### Phase 3.6: CLI Commands (2-3 days)

**Goal**: User-facing CLI for call flow analysis

**File**: `crates/log-scout-cli/src/commands/call_flow.rs`

#### Commands to Implement

1. **`log-scout call-flow analyze <file>`**
   - Parse CTRACE log
   - List all calls found
   - Show summary statistics

2. **`log-scout call-flow show <call-id>`**
   - Display ASCII ladder diagram
   - Show detailed timings
   - Highlight errors

3. **`log-scout call-flow list <file>`**
   - List all Call-IDs in file
   - Show counts and states

4. **`log-scout call-flow export <call-id> --format json`**
   - Export call flow as JSON
   - For programmatic access

**TDD Tests**:

```rust
#[test]
fn test_analyze_command() {
    let output = run_cli(&["call-flow", "analyze", "test.log"]);
    assert!(output.contains("Found"));
    assert!(output.contains("calls"));
}

#[test]
fn test_show_command() {
    let output = run_cli(&["call-flow", "show", "test-call-id", "--file", "test.log"]);
    assert!(output.contains("Call Flow:"));
    assert!(output.contains("INVITE"));
}
```

**Implementation**:
```rust
pub fn analyze_command(file: &str, options: AnalyzeOptions) -> Result<()> {
    // 1. Read file
    let contents = fs::read_to_string(file)?;
    
    // 2. Parse CTRACE entries
    let normalizer = CtraceNormalizer::new();
    let mut entries = Vec::new();
    for line in contents.lines() {
        if let Ok(event) = normalizer.normalize(line) {
            entries.push(extract_ctrace_entry(event));
        }
    }
    
    // 3. Correlate into sessions
    let mut correlator = CallCorrelator::new();
    for entry in entries {
        correlator.add_message(entry);
    }
    let sessions = correlator.get_sessions();
    
    // 4. Display summary
    println!("Found {} calls in log file:\n", sessions.len());
    for (i, session) in sessions.iter().enumerate() {
        print_session_summary(i + 1, session);
    }
    
    Ok(())
}

pub fn show_command(call_id: &str, file: &str, options: ShowOptions) -> Result<()> {
    // Parse and find session
    let sessions = analyze_file(file)?;
    let session = sessions.iter()
        .find(|s| s.call_id == call_id)
        .ok_or_else(|| anyhow!("Call-ID not found: {}", call_id))?;
    
    // Render diagram
    let renderer = DiagramRenderer::new()
        .with_timestamps(options.show_timestamps)
        .with_details(options.show_details);
    
    let diagram = renderer.render(session);
    println!("{}", diagram);
    
    // Integrate cause codes if available
    if options.translate_causes {
        print_cause_code_translations(session);
    }
    
    Ok(())
}
```

**Deliverables**:
- ✅ `call_flow.rs` CLI command (400-500 lines)
- ✅ Integration with main.rs
- ✅ Help text and examples
- ✅ 10+ CLI integration tests

---

### Phase 3.7: Failure Detection & Root Cause Analysis (2-3 days)

**Goal**: Automatically detect common failure patterns

**File**: `crates/pattern-engine/src/call_flow/failure_detector.rs`

#### Failure Patterns to Detect

1. **486 Busy Here** → User busy, retry later
2. **404 Not Found** → Invalid number/user
3. **408 Request Timeout** → Network issues
4. **480 Temporarily Unavailable** → User offline
5. **500 Server Error** → CUCM issue
6. **503 Service Unavailable** → Overload
7. **CANCEL without reason** → User hung up
8. **No 200 OK after INVITE** → Call setup failure

**TDD Tests**:
```rust
#[test]
fn test_detect_busy_failure() {
    let session = create_session_with_486_busy();
    let detector = FailureDetector::new();
    
    let failure = detector.analyze(&session).unwrap();
    
    assert_eq!(failure.pattern, FailurePattern::UserBusy);
    assert_eq!(failure.root_cause, "Callee device busy");
    assert!(failure.recommendation.contains("retry"));
}
```

**Implementation**:
```rust
pub struct FailureDetector;

#[derive(Debug, Clone)]
pub struct CallFailure {
    pub pattern: FailurePattern,
    pub root_cause: String,
    pub recommendation: String,
    pub message: Option<CtraceEntry>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FailurePattern {
    UserBusy,
    NotFound,
    Timeout,
    Unavailable,
    ServerError,
    ServiceUnavailable,
    Cancelled,
    SetupFailure,
}

impl FailureDetector {
    pub fn analyze(&self, session: &CallSession) -> Option<CallFailure> {
        if session.state != CallState::Failed {
            return None;
        }
        
        // Find error message
        let error_msg = session.messages.iter()
            .find(|m| m.sip_message.starts_with('4') || 
                     m.sip_message.starts_with('5') ||
                     m.sip_message.starts_with('6'))?;
        
        let pattern = self.classify_error(&error_msg.sip_message);
        let (root_cause, recommendation) = self.get_details(pattern);
        
        Some(CallFailure {
            pattern,
            root_cause,
            recommendation,
            message: Some(error_msg.clone()),
        })
    }
    
    fn classify_error(&self, msg: &str) -> FailurePattern {
        if msg.contains("486") {
            FailurePattern::UserBusy
        } else if msg.contains("404") {
            FailurePattern::NotFound
        } else if msg.contains("408") {
            FailurePattern::Timeout
        } else if msg.contains("480") {
            FailurePattern::Unavailable
        } else if msg.contains("500") {
            FailurePattern::ServerError
        } else if msg.contains("503") {
            FailurePattern::ServiceUnavailable
        } else {
            FailurePattern::SetupFailure
        }
    }
    
    fn get_details(&self, pattern: FailurePattern) -> (String, String) {
        use FailurePattern::*;
        match pattern {
            UserBusy => (
                "Callee device is busy with another call".to_string(),
                "Wait and retry, or use call waiting".to_string()
            ),
            NotFound => (
                "Called number/user does not exist".to_string(),
                "Check dialed number, verify user configuration".to_string()
            ),
            // ... more patterns
        }
    }
}
```

**Deliverables**:
- ✅ `failure_detector.rs` (200-250 lines)
- ✅ 15+ failure pattern tests
- ✅ Integration with CLI show command

---

### Phase 3.8: Cause Code Integration (1-2 days)

**Goal**: Auto-translate cause codes in SIP responses

**Example Enhancement**:
```
Before:
  |<------ 500 Server Error ------|

After:
  |<------ 500 Server Error ------|
  Cause: 41 - Temporary failure
  Translation: The network is experiencing congestion
```

**Implementation**:
```rust
// In diagram_renderer.rs
fn format_sip_message_with_cause(&self, msg: &str, registry: &CauseCodeRegistry) -> String {
    let formatted = self.format_sip_message(msg);
    
    // Extract cause code if present
    if let Some(cause_code) = extract_cause_code(msg) {
        if let Some(translation) = registry.translate("ucm", cause_code) {
            return format!("{}\n  Cause: {} - {}", formatted, cause_code, translation);
        }
    }
    
    formatted
}
```

**Deliverables**:
- ✅ Cause code extraction from SIP responses
- ✅ Integration with CauseCodeRegistry
- ✅ Enhanced diagram output

---

## 🧪 Testing Strategy

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: All major workflows
- **CLI Tests**: All commands and options
- **Performance Tests**: Handle 10,000+ messages

### Test Files

```
crates/pattern-engine/tests/
├── ctrace_normalizer_test.rs      (15+ tests)
├── call_correlator_test.rs        (20+ tests)
├── call_session_test.rs           (25+ tests)
├── state_machine_test.rs          (15+ tests)
├── timing_analyzer_test.rs        (10+ tests)
├── diagram_renderer_test.rs       (15+ tests)
└── failure_detector_test.rs       (15+ tests)

crates/log-scout-cli/tests/
└── call_flow_cli_test.rs          (10+ tests)

Total: 125+ tests
```

### Test Data

Create comprehensive CTRACE samples:
```
tests/fixtures/ctrace_samples.txt
├── successful_call.txt            (INVITE → 200 OK → BYE)
├── busy_call.txt                  (INVITE → 486 Busy)
├── not_found_call.txt             (INVITE → 404 Not Found)
├── cancelled_call.txt             (INVITE → CANCEL)
├── timeout_call.txt               (INVITE → 408 Timeout)
├── concurrent_calls.txt           (Multiple interleaved calls)
└── malformed_logs.txt             (Edge cases)
```

---

## 📊 Success Metrics

### Functional Metrics

- ✅ Parse 100% of valid CTRACE logs
- ✅ Correlate 100% of calls correctly
- ✅ Track state transitions accurately
- ✅ Calculate timings within ±1ms
- ✅ Generate readable ASCII diagrams
- ✅ Detect 90%+ of common failures

### Performance Metrics

- ✅ Parse 10,000 messages in <1 second
- ✅ Correlate 1,000 calls in <500ms
- ✅ Render diagram in <100ms
- ✅ Memory usage <50MB for 100,000 messages

### User Experience Metrics

- ✅ CLI response time <2 seconds
- ✅ Diagram fits in 80-column terminal
- ✅ Clear error messages
- ✅ Helpful examples in --help

---

## 📅 Timeline & Milestones

### Week 1: Foundation (Days 1-5)

**Days 1-2**: CTRACE Normalizer
- ✅ Create data structures
- ✅ Implement parser
- ✅ Write 15+ tests
- ✅ Integration with normalizer system

**Days 3-4**: Call Correlation
- ✅ Implement correlator
- ✅ Session builder
- ✅ Write 20+ tests

**Day 5**: Buffer/Catch-up
- ✅ Fix any blockers
- ✅ Code review
- ✅ Documentation

### Week 2: Core Features (Days 6-10)

**Days 6-7**: State Machine & Timing
- ✅ Implement state transitions
- ✅ Calculate durations
- ✅ Write 25+ tests

**Days 8-9**: ASCII Diagram Renderer
- ✅ Basic rendering
- ✅ Timestamp display
- ✅ Error highlighting
- ✅ Write 15+ tests

**Day 10**: Buffer/Catch-up
- ✅ Fix rendering issues
- ✅ Improve diagram layout

### Week 3: CLI & Polish (Days 11-15)

**Days 11-12**: CLI Commands
- ✅ `analyze` command
- ✅ `show` command
- ✅ `list` command
- ✅ Write 10+ CLI tests

**Days 13-14**: Failure Detection & Cause Codes
- ✅ Implement failure patterns
- ✅ Integrate cause code translation
- ✅ Write 15+ tests

**Day 15**: Final Polish
- ✅ Documentation
- ✅ Examples
- ✅ README updates
- ✅ Demo video

---

## 🚀 Deliverables Checklist

### Code

- [ ] `crates/pattern-engine/src/normalizers/ctrace_normalizer.rs`
- [ ] `crates/pattern-engine/src/call_flow/` (7 files)
- [ ] `crates/log-scout-cli/src/commands/call_flow.rs`
- [ ] Test files (8 files, 125+ tests)
- [ ] Test fixtures (7 sample files)

### Documentation

- [ ] `docs/PHASE3_CTRACE_FORMAT.md` - Format specification
- [ ] `docs/PHASE3_CALL_FLOW_API.md` - Programmatic API guide
- [ ] `docs/PHASE3_CLI_GUIDE.md` - CLI user guide
- [ ] `README.md` updates - Add Phase 3 features
- [ ] `CHANGELOG.md` - Version notes

### Testing

- [ ] All 125+ tests passing
- [ ] 90%+ code coverage
- [ ] Performance benchmarks met
- [ ] CLI integration tests passing

### Deployment

- [ ] Binary built and tested
- [ ] CLI help text complete
- [ ] Examples in documentation
- [ ] Demo video/screenshots

---

## 🎓 Learning Resources

### SIP Protocol

- [RFC 3261 - SIP](https://tools.ietf.org/html/rfc3261)
- [SIP Call Flow Examples](https://www.cisco.com/c/en/us/support/docs/voice-unified-communications/unified-communications-manager-callmanager/13866-SIP-call-flows.html)

### Cisco CTRACE

- RTMT Plugin documentation (extracted)
- UCM SDL trace documentation
- Existing docs: `docs/CISCO_RTMT_*.md`

### Rust Implementation

- Existing normalizers: `crates/pattern-engine/src/normalizers/`
- Cause code module: `crates/pattern-engine/src/cause_codes/`

---

## 🎯 Next Steps to Start

### Option 1: Start Immediately

```bash
# 1. Create branch
git checkout -b phase3-call-flow

# 2. Create basic structure
mkdir -p crates/pattern-engine/src/call_flow
touch crates/pattern-engine/src/call_flow/mod.rs
touch crates/pattern-engine/src/call_flow/types.rs
touch crates/pattern-engine/src/normalizers/ctrace_normalizer.rs

# 3. Start TDD - Write first test
# File: crates/pattern-engine/tests/ctrace_normalizer_test.rs

# 4. Implement to pass test
# File: crates/pattern-engine/src/normalizers/ctrace_normalizer.rs

# 5. Iterate!
```

### Option 2: Review & Plan

1. Read this document thoroughly
2. Review existing normalizers
3. Check CTRACE XML format
4. Decide on any architectural changes
5. Start Phase 3.1

---

## 📞 Questions & Decisions Needed

### Before Starting

1. **Test Data**: Do we have real CTRACE logs to test with?
   - If not, we'll create synthetic samples

2. **CLI Design**: Any preferences on output format?
   - Current plan: ASCII art with emojis
   - Alternative: JSON output for scripts

3. **Integration Points**: Should we integrate with VS Code extension?
   - Current plan: CLI first
   - Extension integration in Phase 4

4. **Performance Requirements**: Expected log file sizes?
   - Current target: 10,000 messages in <1s
   - Adjust if needed for larger files

---

## 🎉 Success Criteria

Phase 3 is **COMPLETE** when:

- ✅ All 125+ tests passing
- ✅ CTRACE logs parse correctly
- ✅ Call flows correlate accurately
- ✅ ASCII diagrams render beautifully
- ✅ CLI commands work end-to-end
- ✅ Documentation complete
- ✅ Binary builds successfully
- ✅ Demo shows value clearly

**Estimated Completion**: 2-3 weeks from start  
**Value Delivered**: Core troubleshooting capability for Cisco UC engineers

---

**Ready to Start? Let's build Phase 3! 🚀**