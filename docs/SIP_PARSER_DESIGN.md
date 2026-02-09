# SIP Parser Design Document

## Overview

The SIP (Session Initiation Protocol) parser extracts call flow information from log files to create visual representations of SIP message exchanges. This enables telecom engineers to understand call setup, progression, and teardown sequences.

---

## What Does the SIP Parser Do?

### Primary Functions

1. **Extract SIP Messages** from log lines
   - SIP Requests (INVITE, BYE, ACK, CANCEL, REGISTER, etc.)
   - SIP Responses (100 Trying, 180 Ringing, 200 OK, 4xx errors, etc.)
   - Message direction (incoming vs outgoing)
   - Endpoints (caller and callee)

2. **Parse Call Flow Events**
   - Call initiation
   - Call ringing
   - Call answered
   - Call ended/terminated
   - Call failures

3. **Extract Timing Information**
   - Timestamps for each message
   - Call duration calculation
   - Response time analysis

4. **Build Call Sessions**
   - Group related SIP messages into call sessions
   - Track call state transitions
   - Identify call legs and dialog flows

5. **Create Ladder Diagrams**
   - Visual representation of message flow
   - Show sequence: Caller → Proxy/Server → Callee
   - Display timing and response codes

### Example Input/Output

**Input (Log Line):**
```
2024-02-08 10:15:23.456 [SIP] Sending INVITE from alice@example.com to bob@example.com
2024-02-08 10:15:23.789 [SIP] Received 100 Trying from proxy.example.com
2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from bob@example.com
2024-02-08 10:15:26.456 [SIP] Received 200 OK from bob@example.com
2024-02-08 10:15:26.789 [SIP] Sending ACK to bob@example.com
```

**Output (Parsed Events):**
```rust
[
    LadderDiagramEvent {
        timestamp: 2024-02-08T10:15:23.456Z,
        from: "alice@example.com",
        to: "bob@example.com",
        message: "SIP INVITE",
        method: "INVITE",
        direction: "outgoing"
    },
    LadderDiagramEvent {
        timestamp: 2024-02-08T10:15:23.789Z,
        from: "proxy.example.com",
        to: "alice@example.com",
        message: "100 Trying",
        response_code: 100,
        direction: "incoming"
    },
    // ... more events
]
```

---

## SIP Protocol Background

### What is SIP?

**SIP (Session Initiation Protocol)** is defined in **RFC 3261** and is used for:
- Establishing voice/video calls
- Managing multimedia sessions
- Text messaging
- Presence information

### Key SIP Concepts

#### 1. SIP Messages

**Requests (Methods):**
- `INVITE` - Initiate a call/session
- `ACK` - Acknowledge final response to INVITE
- `BYE` - Terminate a call/session
- `CANCEL` - Cancel a pending request
- `REGISTER` - Register contact information
- `OPTIONS` - Query capabilities
- `INFO` - Send mid-session information
- `PRACK` - Provisional response acknowledgment
- `UPDATE` - Modify session parameters
- `REFER` - Transfer call
- `SUBSCRIBE` - Subscribe to event notification
- `NOTIFY` - Notify of events
- `MESSAGE` - Send instant message

**Responses (Status Codes):**
- `1xx` - Provisional (100 Trying, 180 Ringing, 183 Session Progress)
- `2xx` - Success (200 OK, 202 Accepted)
- `3xx` - Redirection (301 Moved Permanently, 302 Moved Temporarily)
- `4xx` - Client Error (400 Bad Request, 401 Unauthorized, 404 Not Found, 486 Busy Here)
- `5xx` - Server Error (500 Internal Error, 503 Service Unavailable)
- `6xx` - Global Failure (600 Busy Everywhere, 603 Decline)

#### 2. SIP Call Flow (Basic)

```
Alice                Proxy               Bob
  |                    |                   |
  |---INVITE---------->|                   |
  |<--100 Trying-------|                   |
  |                    |---INVITE--------->|
  |                    |<--100 Trying------|
  |                    |<--180 Ringing-----|
  |<--180 Ringing------|                   |
  |                    |<--200 OK----------|
  |<--200 OK-----------|                   |
  |---ACK------------->|                   |
  |                    |---ACK------------>|
  |                                        |
  |<========== RTP Media Stream =========>|
  |                                        |
  |---BYE------------->|                   |
  |                    |---BYE------------>|
  |                    |<--200 OK----------|
  |<--200 OK-----------|                   |
  |                    |                   |
```

#### 3. SIP URIs

Format: `sip:user@domain:port;parameters`

Examples:
- `sip:alice@example.com`
- `sip:+15551234567@pstn.example.com`
- `sips:secure@example.com` (secure SIP)

---

## Using Cisco's SIP Implementation

### Cisco SIP References

Cisco has extensive SIP documentation and RFCs:

#### Official RFCs
- **RFC 3261** - SIP: Session Initiation Protocol (Base)
- **RFC 3262** - Reliability of Provisional Responses (PRACK)
- **RFC 3263** - Locating SIP Servers
- **RFC 3264** - Offer/Answer Model with SDP
- **RFC 3265** - Event Notification (SUBSCRIBE/NOTIFY)
- **RFC 3311** - UPDATE Method
- **RFC 3323** - Privacy Mechanism
- **RFC 3325** - Asserted Identity
- **RFC 3515** - REFER Method
- **RFC 3891** - Replaces Header
- **RFC 4028** - Session Timers

#### Cisco-Specific SIP Features

1. **Cisco Unified Communications Manager (CUCM) SIP**
   - Custom headers: `X-Cisco-*`
   - Remote-Party-ID
   - Diversion headers
   - P-Asserted-Identity

2. **Cisco SIP Trunking**
   - Registration flows
   - OPTIONS keepalives
   - Authentication sequences

3. **Cisco Contact Center SIP**
   - Queue status
   - Agent state changes
   - Call recording indicators

### Cisco Log Formats

Cisco systems use specific log formats we should parse:

#### CUCM SDL Traces
```
16:20:15.123 |SIPTcp - wait_SdlReadRsp: Incoming SIP TCP Message from 10.1.1.100:5060
INVITE sip:2000@10.1.1.200:5060 SIP/2.0
Via: SIP/2.0/TCP 10.1.1.100:5060;branch=z9hG4bK-abc123
From: "Alice" <sip:1000@example.com>;tag=123456
To: <sip:2000@example.com>
Call-ID: unique-call-id@10.1.1.100
CSeq: 1 INVITE
```

#### Cisco IOS/IOS-XE SIP Logs
```
*Feb  8 10:15:23.456: //-1/xxxxxxxxxxxx/SIP/Msg/ccsipDisplayMsg:
Sent:
INVITE sip:2000@10.1.1.200:5060 SIP/2.0
```

#### Webex/Spark SIP Logs
```
2024-02-08T10:15:23.456Z [SIP] TX -> INVITE sip:user@webex.com SIP/2.0
2024-02-08T10:15:23.789Z [SIP] RX <- 180 Ringing
```

---

## Parser Implementation Design

### Rust Data Structures

```rust
/// SIP message types
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SipMethod {
    Invite,
    Ack,
    Bye,
    Cancel,
    Register,
    Options,
    Info,
    Prack,
    Update,
    Refer,
    Subscribe,
    Notify,
    Message,
}

/// SIP response class
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SipResponseClass {
    Provisional,  // 1xx
    Success,      // 2xx
    Redirection,  // 3xx
    ClientError,  // 4xx
    ServerError,  // 5xx
    GlobalFailure // 6xx
}

/// SIP response
#[derive(Debug, Clone)]
pub struct SipResponse {
    pub code: u16,
    pub reason_phrase: String,
    pub class: SipResponseClass,
}

/// Parsed SIP message
#[derive(Debug, Clone)]
pub struct SipMessage {
    pub timestamp: DateTime<Utc>,
    pub line_number: usize,
    pub direction: Direction,
    pub message_type: SipMessageType,
    pub from: SipEndpoint,
    pub to: SipEndpoint,
    pub call_id: Option<String>,
    pub cseq: Option<u32>,
}

/// Message type (request or response)
#[derive(Debug, Clone)]
pub enum SipMessageType {
    Request(SipMethod),
    Response(SipResponse),
}

/// SIP endpoint
#[derive(Debug, Clone)]
pub struct SipEndpoint {
    pub user: String,
    pub domain: Option<String>,
    pub display_name: Option<String>,
}

/// Direction of message
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Direction {
    Outgoing,  // Sent
    Incoming,  // Received
}

/// Call session (grouped messages)
#[derive(Debug, Clone)]
pub struct CallSession {
    pub call_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub caller: SipEndpoint,
    pub callee: SipEndpoint,
    pub messages: Vec<SipMessage>,
    pub state: CallState,
}

/// Call state machine
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CallState {
    Initial,
    Calling,       // INVITE sent
    Proceeding,    // 1xx received
    Ringing,       // 180 received
    Connected,     // 200 OK + ACK
    Disconnecting, // BYE sent
    Terminated,    // Final state
    Failed,        // 4xx/5xx/6xx received
}
```

### Parsing Strategy

#### 1. Pattern Matching

Use regex patterns to identify SIP messages in logs:

```rust
// Pattern for outgoing SIP request
r"(?i)(send|sent|tx|transmit|outgoing|->)\s+.*(INVITE|BYE|ACK|CANCEL|REGISTER)\s+.*?sip:([^@\s]+)@([^\s;>]+)"

// Pattern for incoming SIP response
r"(?i)(receiv|recv|rx|incoming|<-)\s+.*?(\d{3})\s+(\w+)"

// Pattern for CUCM SDL format
r"(?:Incoming|Outgoing)\s+SIP\s+(TCP|UDP)\s+Message"

// Pattern for Call-ID extraction
r"Call-ID:\s*([^\s]+)"

// Pattern for CSeq extraction
r"CSeq:\s*(\d+)\s+(\w+)"
```

#### 2. Multi-Line Message Parsing

For full SIP message headers:

```rust
/// Parse complete SIP message from multiple lines
pub fn parse_sip_message_block(lines: &[&str]) -> Option<SipMessage> {
    let first_line = lines.first()?;
    
    // Check if request or response
    if first_line.starts_with("SIP/2.0") {
        // Response: "SIP/2.0 200 OK"
        parse_response(lines)
    } else {
        // Request: "INVITE sip:user@example.com SIP/2.0"
        parse_request(lines)
    }
}
```

#### 3. State Machine for Call Tracking

```rust
impl CallSession {
    /// Update session state based on new message
    pub fn update_state(&mut self, message: &SipMessage) {
        match (&self.state, &message.message_type) {
            (CallState::Initial, SipMessageType::Request(SipMethod::Invite)) => {
                self.state = CallState::Calling;
            }
            (CallState::Calling, SipMessageType::Response(r)) if r.code >= 100 && r.code < 200 => {
                self.state = CallState::Proceeding;
                if r.code == 180 {
                    self.state = CallState::Ringing;
                }
            }
            (_, SipMessageType::Response(r)) if r.code == 200 => {
                self.state = CallState::Connected;
            }
            (_, SipMessageType::Request(SipMethod::Bye)) => {
                self.state = CallState::Disconnecting;
            }
            (CallState::Disconnecting, SipMessageType::Response(r)) if r.code == 200 => {
                self.state = CallState::Terminated;
                self.end_time = Some(message.timestamp);
            }
            (_, SipMessageType::Response(r)) if r.code >= 400 => {
                self.state = CallState::Failed;
                self.end_time = Some(message.timestamp);
            }
            _ => {}
        }
    }
}
```

---

## Benefits of Using Standard RFCs

### ✅ Advantages

1. **Vendor Neutrality**
   - Works with Cisco, Avaya, Asterisk, FreeSWITCH, etc.
   - Not locked to Cisco-specific formats

2. **Completeness**
   - RFCs define all standard SIP messages
   - Covers edge cases and error scenarios

3. **Future-Proof**
   - New SIP extensions follow RFC patterns
   - Easy to add new methods/responses

4. **Community Knowledge**
   - Well-documented in RFC 3261
   - Large community support

### ⚠️ Cisco-Specific Considerations

While we use RFCs as base, we should handle:

1. **Custom Headers**
   ```
   X-Cisco-Original-Called-Number
   Remote-Party-ID (older Cisco)
   P-Asserted-Identity (newer standard)
   ```

2. **Proprietary Messages**
   ```
   X-cisco-serviceuri headers
   Cisco-specific reason codes
   ```

3. **Log Format Variations**
   - SDL traces (CUCM)
   - IOS debug output
   - Webex cloud logs

---

## Recommended Approach

### Phase 1: RFC-Based Core
✅ Implement standard SIP parsing per RFC 3261
✅ Support all standard methods and responses
✅ Generic pattern matching for any SIP log format

### Phase 2: Cisco Enhancements
✅ Add patterns for CUCM SDL traces
✅ Parse Cisco-specific headers
✅ Handle IOS/IOS-XE log formats

### Phase 3: Advanced Features
✅ Call correlation (match INVITE to BYE)
✅ Call duration calculation
✅ Response time analysis
✅ Error pattern detection

---

## Implementation Modules

```
lsp-server/src/parser/
├── mod.rs              # Parser module exports
├── sip/
│   ├── mod.rs          # SIP parser main
│   ├── messages.rs     # SIP message types
│   ├── patterns.rs     # Regex patterns
│   ├── endpoints.rs    # URI parsing
│   ├── sessions.rs     # Call session tracking
│   ├── state.rs        # Call state machine
│   └── cisco.rs        # Cisco-specific parsing
├── timeline.rs         # Timeline extraction
└── events.rs           # Generic event parsing
```

---

## Example Usage

```rust
use crate::parser::sip::SipParser;

let parser = SipParser::new();
let messages = parser.parse_log_file("cucm_sdl.log")?;

// Group into call sessions
let sessions = parser.group_into_sessions(&messages);

for session in sessions {
    println!("Call from {} to {}",
        session.caller.user,
        session.callee.user
    );
    println!("Duration: {:?}", session.duration());
    println!("State: {:?}", session.state);
    
    for msg in &session.messages {
        println!("  {:?} - {:?}",
            msg.timestamp,
            msg.message_type
        );
    }
}
```

---

## Testing Strategy

### Unit Tests
- Parse individual SIP messages
- Test all RFC 3261 methods
- Test all response codes
- Timestamp extraction
- Endpoint parsing

### Integration Tests
- Parse real CUCM SDL traces
- Parse IOS debug output
- Parse Webex logs
- Multi-vendor log compatibility

### Test Data
```
tests/
└── fixtures/
    ├── rfc3261_examples.log   # From RFC
    ├── cucm_sdl.log           # Real CUCM logs
    ├── ios_sip.log            # IOS debug
    ├── webex_sip.log          # Webex logs
    └── mixed_vendor.log       # Multi-vendor
```

---

## Performance Considerations

1. **Streaming Parser**
   - Don't load entire file into memory
   - Process line-by-line

2. **Regex Compilation**
   - Pre-compile all patterns
   - Use `lazy_static` for static patterns

3. **Session Caching**
   - Keep active sessions in memory
   - Flush completed sessions

4. **Pattern Optimization**
   - Most specific patterns first
   - Early exit on non-SIP lines

---

## References

### RFCs
- [RFC 3261 - SIP](https://tools.ietf.org/html/rfc3261)
- [RFC 3262 - PRACK](https://tools.ietf.org/html/rfc3262)
- [RFC 3265 - SUBSCRIBE/NOTIFY](https://tools.ietf.org/html/rfc3265)

### Cisco Documentation
- [CUCM SIP Trunk Configuration Guide](https://www.cisco.com/c/en/us/support/unified-communications/unified-communications-manager-callmanager/products-installation-and-configuration-guides-list.html)
- [IOS Voice SIP Configuration](https://www.cisco.com/c/en/us/support/ios-nx-os-software/ios-software-releases-150-1-m/products-command-reference-list.html)

### Tools
- [SIPp](https://github.com/SIPp/sipp) - SIP testing tool
- [Wireshark](https://www.wireshark.org/) - SIP packet capture

---

## Summary

**Answer to your question:**

Yes, we should definitely use the standard SIP RFCs (especially RFC 3261) as our foundation because:

1. ✅ **Universal**: Works with Cisco, Avaya, Asterisk, and any SIP implementation
2. ✅ **Complete**: Covers all standard SIP methods and responses
3. ✅ **Vendor-neutral**: Not locked to Cisco-specific formats
4. ✅ **Extensible**: Easy to add Cisco-specific enhancements on top

**Approach:**
- Base parser on RFC 3261 (standard SIP)
- Add Cisco-specific patterns as extensions
- Support multiple log formats (CUCM, IOS, Webex)
- Create vendor-agnostic call flow analysis

This gives us maximum flexibility while ensuring compatibility with all SIP systems!