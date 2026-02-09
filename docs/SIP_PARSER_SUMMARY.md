# SIP Parser - Executive Summary

## Quick Answer: Should We Use Cisco SIP RFC?

**YES - Use standard SIP RFCs (RFC 3261) as the foundation, with Cisco-specific enhancements.**

---

## What the SIP Parser Does

### Primary Purpose
Extracts **call flow information** from log files to create visual representations of SIP (Session Initiation Protocol) message exchanges between endpoints.

### Key Functions

1. **Parse SIP Messages from Logs**
   - Identifies SIP requests (INVITE, BYE, ACK, REGISTER, etc.)
   - Identifies SIP responses (100 Trying, 180 Ringing, 200 OK, errors)
   - Extracts sender and receiver endpoints
   - Captures timestamps

2. **Build Call Sessions**
   - Groups related SIP messages into complete call flows
   - Tracks call state (calling → ringing → connected → terminated)
   - Correlates messages using Call-ID

3. **Generate Timeline Events**
   - Creates chronological sequence of call events
   - Shows message direction (incoming/outgoing)
   - Displays timing between events

4. **Visual Representation** (Ladder Diagrams)
   ```
   Alice                Proxy               Bob
     |---INVITE---------->|                   |
     |<--100 Trying-------|                   |
     |                    |---INVITE--------->|
     |                    |<--180 Ringing-----|
     |<--180 Ringing------|                   |
     |                    |<--200 OK----------|
     |<--200 OK-----------|                   |
     |---ACK------------->|---ACK------------>|
     |<============== Call Connected =======>>|
     |---BYE------------->|---BYE------------>|
     |<--200 OK-----------|<--200 OK----------|
   ```

---

## Real-World Example

### Input (Cisco CUCM Log)
```
2024-02-08 10:15:23.456 [SIP] Sending INVITE from alice@example.com to bob@example.com
2024-02-08 10:15:23.789 [SIP] Received 100 Trying from proxy.example.com
2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from bob@example.com
2024-02-08 10:15:26.456 [SIP] Received 200 OK from bob@example.com
2024-02-08 10:15:26.789 [SIP] Sending ACK to bob@example.com
[...call in progress...]
2024-02-08 10:20:15.123 [SIP] Sending BYE to bob@example.com
2024-02-08 10:20:15.456 [SIP] Received 200 OK from bob@example.com
```

### Output (Parsed Events)
```
Call Session: alice@example.com → bob@example.com
Duration: 4 minutes 52 seconds
State: Terminated (Success)

Timeline:
  10:15:23.456 | alice → bob          | INVITE (Call Setup)
  10:15:23.789 | proxy → alice        | 100 Trying
  10:15:24.123 | bob → alice          | 180 Ringing
  10:15:26.456 | bob → alice          | 200 OK (Call Answered)
  10:15:26.789 | alice → bob          | ACK
  10:20:15.123 | alice → bob          | BYE (Hangup)
  10:20:15.456 | bob → alice          | 200 OK

Call Setup Time: 3.0 seconds (INVITE to 200 OK)
```

---

## Why Use Standard SIP RFCs?

### RFC 3261 (Standard SIP Protocol)

**Advantages:**
- ✅ **Universal**: Works with ALL SIP vendors (Cisco, Avaya, Asterisk, FreeSWITCH)
- ✅ **Complete**: Defines all standard SIP methods and response codes
- ✅ **Well-Documented**: Extensive documentation and examples
- ✅ **Future-Proof**: New SIP features build on RFC 3261
- ✅ **Community**: Large developer community and tooling

**Standard SIP Methods (RFC 3261):**
- `INVITE` - Initiate call
- `ACK` - Acknowledge response
- `BYE` - End call
- `CANCEL` - Cancel pending request
- `REGISTER` - Register endpoint
- `OPTIONS` - Query capabilities

**Standard Response Codes:**
- `1xx` - Provisional (100 Trying, 180 Ringing)
- `2xx` - Success (200 OK)
- `3xx` - Redirection
- `4xx` - Client Error (404 Not Found, 486 Busy)
- `5xx` - Server Error (503 Service Unavailable)
- `6xx` - Global Failure (603 Decline)

---

## Cisco-Specific Enhancements

### What Makes Cisco Special?

While Cisco uses standard SIP, they have:

1. **Custom Headers**
   ```
   X-Cisco-Original-Called-Number
   Remote-Party-ID (legacy)
   P-Asserted-Identity (newer)
   ```

2. **Proprietary Log Formats**
   - **CUCM SDL Traces**: Detailed SIP message dumps
   - **IOS Debug Output**: `debug ccsip messages`
   - **Webex Cloud Logs**: JSON-formatted SIP events

3. **Cisco-Specific Features**
   - Call preservation
   - Media bypass
   - Intercluster trunks
   - Extension mobility

### Example: CUCM SDL Format
```
16:20:15.123 |SIPTcp - wait_SdlReadRsp:
Incoming SIP TCP Message from 10.1.1.100:5060
INVITE sip:2000@10.1.1.200:5060 SIP/2.0
Via: SIP/2.0/TCP 10.1.1.100:5060;branch=z9hG4bK-abc123
From: "Alice" <sip:1000@example.com>;tag=123456
To: <sip:2000@example.com>
Call-ID: unique-call-id@10.1.1.100
CSeq: 1 INVITE
```

---

## Recommended Implementation Approach

### Phase 1: RFC-Based Core (Week 1) ⭐
**Build vendor-neutral parser:**
- ✅ Parse standard SIP methods (INVITE, BYE, ACK, etc.)
- ✅ Parse standard SIP responses (1xx, 2xx, 3xx, 4xx, 5xx, 6xx)
- ✅ Extract endpoints (sip:user@domain)
- ✅ Extract timestamps
- ✅ Generic pattern matching for any log format

**Benefits:**
- Works with Cisco, Avaya, Asterisk, ANY SIP system
- Covers 90% of real-world scenarios
- Easy to test against RFC examples

### Phase 2: Cisco Enhancements (Week 2)
**Add Cisco-specific patterns:**
- ✅ CUCM SDL trace format
- ✅ IOS debug output format
- ✅ Parse Cisco custom headers
- ✅ Handle proprietary features

**Benefits:**
- Better integration with Cisco environments
- Richer data extraction from Cisco logs
- Support for Cisco troubleshooting workflows

### Phase 3: Advanced Features (Week 3)
**Call flow analysis:**
- ✅ Group messages into call sessions
- ✅ Track call state machine
- ✅ Calculate call metrics (setup time, duration)
- ✅ Detect common call failures
- ✅ Generate ladder diagrams

---

## Technical Implementation

### Data Structures (Rust)

```rust
// SIP Message
pub struct SipMessage {
    pub timestamp: DateTime<Utc>,
    pub direction: Direction,        // Incoming/Outgoing
    pub message_type: SipMessageType, // Request or Response
    pub from: SipEndpoint,
    pub to: SipEndpoint,
    pub call_id: Option<String>,
}

// Request or Response
pub enum SipMessageType {
    Request(SipMethod),      // INVITE, BYE, etc.
    Response(u16, String),   // 200 OK, 404 Not Found
}

// Call Session (grouped messages)
pub struct CallSession {
    pub call_id: String,
    pub caller: SipEndpoint,
    pub callee: SipEndpoint,
    pub messages: Vec<SipMessage>,
    pub state: CallState,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
}

// Call State
pub enum CallState {
    Initial,
    Calling,      // INVITE sent
    Ringing,      // 180 received
    Connected,    // 200 OK + ACK
    Terminated,   // BYE completed
    Failed,       // 4xx/5xx received
}
```

### Pattern Matching Strategy

```rust
// Pattern 1: Standard SIP request
r"(INVITE|BYE|ACK|CANCEL|REGISTER)\s+sip:([^@]+)@([^\s;]+)"

// Pattern 2: Standard SIP response
r"SIP/2\.0\s+(\d{3})\s+(\w+)"

// Pattern 3: Cisco CUCM format
r"(Incoming|Outgoing)\s+SIP\s+(TCP|UDP)\s+Message"

// Pattern 4: Generic log format
r"(send|sent|recv|received)\s+.*?(INVITE|BYE|200\s+OK)"
```

---

## Why NOT Cisco-Only?

### Problems with Cisco-Only Approach

❌ **Limited Compatibility**
- Only works with Cisco equipment
- Can't analyze Avaya, Asterisk, or other vendor logs

❌ **Vendor Lock-in**
- Tied to Cisco log formats
- Can't handle multi-vendor environments

❌ **Incomplete**
- Cisco docs don't cover all SIP scenarios
- RFC 3261 is the authoritative source

❌ **Maintenance Burden**
- Cisco formats may change
- RFC-based parser is stable

---

## Best Practice: Layered Approach

```
┌─────────────────────────────────────────┐
│   Cisco-Specific Enhancements           │
│   (Custom headers, SDL format, etc.)    │
├─────────────────────────────────────────┤
│   RFC 3261 Core Parser                  │
│   (Standard SIP methods & responses)    │
├─────────────────────────────────────────┤
│   Generic Log Pattern Matching          │
│   (Timestamps, endpoints, direction)    │
└─────────────────────────────────────────┘
```

**Benefits:**
1. **Universal**: Works with any SIP system (bottom layer)
2. **Standard**: Follows RFC 3261 (middle layer)
3. **Enhanced**: Optimized for Cisco (top layer)

---

## Use Cases

### 1. Troubleshooting Call Failures
**Problem**: "Calls to specific numbers fail"

**Analysis**:
- Parse logs to find failed calls (4xx/5xx responses)
- Identify which SIP proxy/gateway returned error
- Show exact error code (404 Not Found, 486 Busy, etc.)
- Display timing to identify timeout issues

### 2. Call Quality Issues
**Problem**: "Calls have poor audio quality"

**Analysis**:
- Track call setup time (INVITE to 200 OK)
- Identify delayed responses (> 3 seconds)
- Detect missing ACK (incomplete handshake)
- Show codec negotiation (SDP analysis)

### 3. Capacity Planning
**Problem**: "How many concurrent calls?"

**Analysis**:
- Count active calls (INVITE without BYE)
- Calculate average call duration
- Identify peak call times
- Track trunk utilization

### 4. Security Auditing
**Problem**: "Detect unauthorized calls"

**Analysis**:
- Track failed REGISTER attempts (401 Unauthorized)
- Identify calls from unknown sources
- Detect SIP scanning (multiple INVITE to non-existent numbers)
- Monitor authentication failures

---

## Summary & Recommendation

### ✅ YES - Use Standard SIP RFCs

**Primary Foundation**: RFC 3261 (Session Initiation Protocol)

**Reasoning**:
1. **Universal compatibility** - Works with ALL vendors
2. **Complete specification** - Covers all SIP scenarios  
3. **Well-documented** - Authoritative source
4. **Future-proof** - New features build on RFC 3261
5. **Extensible** - Easy to add Cisco enhancements

**Implementation**:
- Start with RFC 3261 core parser (vendor-neutral)
- Add Cisco-specific patterns as enhancements
- Support multiple log formats (CUCM, IOS, Webex)
- Maintain layered architecture (generic → standard → vendor-specific)

**Result**:
- Maximum flexibility
- Works in any environment (pure Cisco or multi-vendor)
- Easy to extend to other protocols (H.323, MGCP, etc.)
- Professional-grade tool that follows industry standards

---

## References

**RFCs (Standards):**
- [RFC 3261](https://tools.ietf.org/html/rfc3261) - SIP: Session Initiation Protocol ⭐
- [RFC 3262](https://tools.ietf.org/html/rfc3262) - Reliability of Provisional Responses
- [RFC 3265](https://tools.ietf.org/html/rfc3265) - Event Notification

**Cisco Documentation:**
- [CUCM SIP Trunk Configuration](https://www.cisco.com/c/en/us/support/unified-communications/unified-communications-manager-callmanager/)
- [IOS Voice SIP Configuration](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/voice/sip/)

**Tools:**
- [Wireshark](https://www.wireshark.org/) - SIP packet capture
- [SIPp](https://github.com/SIPp/sipp) - SIP testing

---

**Conclusion**: Build on RFC 3261 (industry standard) with Cisco-specific enhancements. This gives you the best of both worlds - universal compatibility AND Cisco optimization.