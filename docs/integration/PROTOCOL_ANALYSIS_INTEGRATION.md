# Protocol Analysis Integration: PCAP, SIP, XMPP, and HAR Support

## Overview

This document extends the Log Scout Analyzer's multi-tier architecture to include protocol-level analysis tools. These tools provide deeper visibility into network communications, filling critical gaps between log entries and enabling root cause analysis of connectivity, signaling, and timing issues.

## Why Protocol Analysis Matters

### The Gap Between Log Tiers

Traditional logs show application-level events ("Call Failed", "Connection Lost"), but they don't reveal:
- **Network-level failures** (packet loss, latency, routing issues)
- **Protocol-level problems** (SIP negotiation failures, XMPP authentication issues)
- **Timing and sequencing** (message ordering, race conditions, timeout root causes)
- **Security issues** (TLS failures, certificate problems, authentication flows)

Protocol analysis tools bridge these gaps by capturing the actual wire-level communications.

---

## The Four Protocol Analysis Tools

### 1. Packet Captures (PCAP)
**What**: Raw network traffic capture (Wireshark/tcpdump format)
**Protocols**: TCP, UDP, RTP, RTCP, TLS, HTTP, SIP, XMPP, STUN, ICE
**Use Cases**:
- Network connectivity debugging (packet loss, latency, jitter)
- Media quality analysis (RTP packet timing, codec negotiation)
- Firewall/NAT traversal issues
- Certificate validation failures
- DNS resolution problems

**Tier Relevance**:
- **Tier 1 (Client App)**: Client-side packet captures show what the application sees
- **Tier 2 (Middleware)**: Middleware packet captures reveal driver/service network behavior
- **Tier 3 (Server)**: Server-side captures show infrastructure-level network state

---

### 2. SIP Message Analysis
**What**: Session Initiation Protocol messages for voice/video call signaling
**Message Types**: INVITE, ACK, BYE, CANCEL, REGISTER, OPTIONS, NOTIFY, SUBSCRIBE, PUBLISH
**Use Cases**:
- Call setup failures (4xx/5xx response codes)
- Registration problems (authentication, expired credentials)
- Call routing issues (proxy behavior, redirect loops)
- Codec negotiation failures (SDP analysis)
- Media path establishment (RTP/RTCP endpoint negotiation)

**Tier Relevance**:
- **Tier 1 (Jabber Client)**: SIP stack in client application
- **Tier 2 (TSP/CIM)**: May proxy or generate SIP messages
- **Tier 3 (CUCM/CUC)**: Server-side SIP processing, call control

**Critical Correlations**:
- SIP INVITE timing → Application "Call Initiated" log
- SIP 4xx/5xx response → Application "Call Failed" error
- SIP 180 Ringing → Application UI state change
- SIP BYE → Call termination event in logs

---

### 3. XMPP Message Analysis
**What**: Extensible Messaging and Presence Protocol (Jabber/IM)
**Stanza Types**: `<message>`, `<presence>`, `<iq>` (info/query)
**Use Cases**:
- Authentication failures (SASL mechanisms, certificate issues)
- Presence propagation delays (roster updates, subscription issues)
- Message delivery failures (offline storage, routing problems)
- Conference/MUC issues (multi-user chat join failures)
- Service discovery problems (disco#info, disco#items)

**Tier Relevance**:
- **Tier 1 (Jabber Client)**: XMPP client stack
- **Tier 2 (Client Middleware)**: May not be directly involved
- **Tier 3 (IM&P Server, CUPS)**: XMPP server processing, message routing

**Critical Correlations**:
- XMPP `<stream:error>` → Client "Connection Lost" log
- XMPP `<presence type="unavailable">` → Buddy list status change
- XMPP `<message>` delivery → IM delivery confirmation logs
- XMPP authentication → Client login success/failure

---

### 4. HAR (HTTP Archive) Analysis
**What**: Browser network traffic capture (JSON format from Chrome DevTools)
**Contents**: HTTP requests/responses, headers, timing, cookies, WebSocket frames
**Use Cases**:
- Web client performance (page load timing, resource blocking)
- REST API failures (authentication, authorization, malformed requests)
- WebSocket communication debugging (real-time updates, push notifications)
- CORS issues (cross-origin resource sharing)
- CDN/caching problems

**Tier Relevance**:
- **Tier 1 (Web-based clients)**: CUACA (web admin), Jabber web client
- **Tier 2**: Not typically applicable
- **Tier 3 (Server APIs)**: REST API behavior, web service responses

**Critical Correlations**:
- HAR timing data → Client "Slow Response" logs
- HAR 401/403 responses → Client authentication failure logs
- HAR WebSocket close → Client "Disconnected" event
- HAR request/response → API call logs on server

---

## Integration Architecture

### Unified Protocol Analysis Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                    Log Scout Analyzer Core                       │
├─────────────────────────────────────────────────────────────────┤
│  Traditional Log Analysis                                        │
│  ├─ Tier 1: Client Application Logs                             │
│  ├─ Tier 2: Client Middleware Logs                              │
│  └─ Tier 3: Server Service Logs                                 │
├─────────────────────────────────────────────────────────────────┤
│  Protocol Analysis Layer (NEW)                                   │
│  ├─ PCAP Parser (libpcap/pcapng format)                         │
│  │   ├─ TCP/UDP flow reconstruction                             │
│  │   ├─ RTP/RTCP media quality metrics                          │
│  │   ├─ TLS handshake analysis                                  │
│  │   └─ Timing and sequencing                                   │
│  ├─ SIP Parser                                                   │
│  │   ├─ SIP message parsing (requests/responses)                │
│  │   ├─ SDP parsing (media negotiation)                         │
│  │   ├─ Call flow reconstruction                                │
│  │   └─ SIP transaction matching (INVITE→200 OK→ACK)            │
│  ├─ XMPP Parser                                                  │
│  │   ├─ XML stanza parsing (<message>, <presence>, <iq>)        │
│  │   ├─ Stream management (stream:features, SASL)               │
│  │   ├─ Roster and presence tracking                            │
│  │   └─ Extension parsing (XEP support)                         │
│  └─ HAR Parser                                                   │
│      ├─ JSON parsing (HAR 1.2/1.3 spec)                         │
│      ├─ HTTP transaction reconstruction                         │
│      ├─ WebSocket frame extraction                              │
│      └─ Timing waterfall analysis                               │
├─────────────────────────────────────────────────────────────────┤
│  Cross-Layer Correlation Engine                                  │
│  ├─ Time-based correlation (synchronized timestamps)            │
│  ├─ Transaction ID correlation (call-id, message-id)            │
│  ├─ Protocol event → Log event mapping                          │
│  └─ Multi-source timeline reconstruction                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pattern Design: Protocol-Aware Patterns

### New Pattern Category: Protocol Events

Protocol events are different from log patterns:
- **Source**: Not text logs, but structured protocol data
- **Timing**: Precise microsecond timestamps (not log timestamps)
- **Correlation**: Multiple protocol messages form a transaction
- **Context**: Network layer provides different perspective than application logs

### Pattern Structure Extension

```typescript
interface ProtocolPattern extends BasePattern {
  // Existing fields
  id: string;
  category: string;
  tier: LogContext;
  
  // New protocol-specific fields
  protocol_type: 'pcap' | 'sip' | 'xmpp' | 'har';
  protocol_filter?: {
    // For PCAP
    packet_filter?: string;  // BPF syntax: "tcp.port == 5060"
    flow_criteria?: FlowCriteria;
    
    // For SIP
    sip_method?: string[];  // ["INVITE", "BYE", "CANCEL"]
    sip_response_code?: number[];  // [401, 403, 404, 503]
    
    // For XMPP
    xmpp_stanza_type?: string[];  // ["message", "presence", "iq"]
    xmpp_namespace?: string[];  // ["jabber:client", "urn:xmpp:ping"]
    
    // For HAR
    http_method?: string[];  // ["GET", "POST", "PUT"]
    http_status_code?: number[];  // [200, 404, 500]
    url_pattern?: string;  // Regex for URL matching
  };
  
  // Protocol-specific extractors
  protocol_extractors?: ProtocolExtractor[];
  
  // Correlation hints
  correlation?: {
    log_patterns?: string[];  // IDs of log patterns that correlate
    timing_window_ms?: number;  // Max time delta for correlation
    correlation_keys?: string[];  // Fields to match on
  };
}
```

---

## Example Patterns: Protocol Analysis

### Example 1: SIP Call Setup Failure

**Scenario**: User initiates call, receives "Call Failed" error. Need to determine if it's client issue, network issue, or server rejection.

**Multi-Source Analysis**:

```yaml
# Pattern 1: Client Log (Tier 1)
pattern_id: "jabber_call_failed_ui"
protocol_type: "log"
tier: "tier1"
regex: "Call Failed.*destination=(\\d+)"
extractors:
  - name: "destination"
    regex: "destination=(\\d+)"
  - name: "error_message"
    regex: "error=([^,]+)"

# Pattern 2: SIP INVITE (Protocol)
pattern_id: "sip_invite_sent"
protocol_type: "sip"
protocol_filter:
  sip_method: ["INVITE"]
extractors:
  - name: "call_id"
    field: "Call-ID"
  - name: "from_uri"
    field: "From"
  - name: "to_uri"
    field: "To"
  - name: "timestamp"
    field: "packet_timestamp"

# Pattern 3: SIP Error Response (Protocol)
pattern_id: "sip_error_response"
protocol_type: "sip"
protocol_filter:
  sip_response_code: [400, 401, 403, 404, 486, 503]
extractors:
  - name: "call_id"
    field: "Call-ID"
  - name: "response_code"
    field: "Status-Code"
  - name: "reason_phrase"
    field: "Reason-Phrase"
  - name: "timestamp"
    field: "packet_timestamp"
severity_rules:
  - condition: "response_code == 401"
    severity: "Warning"
    message: "Authentication required - credentials may be expired"
  - condition: "response_code == 404"
    severity: "Error"
    message: "User not found - invalid destination"
  - condition: "response_code == 503"
    severity: "Critical"
    message: "Service unavailable - server overload or offline"

# Correlation Rule
correlation:
  patterns: ["jabber_call_failed_ui", "sip_invite_sent", "sip_error_response"]
  correlation_keys: ["call_id", "destination"]
  timing_window_ms: 5000
  diagnostic_template: |
    User attempted to call {{destination}} at {{client_timestamp}}.
    SIP INVITE was sent with Call-ID {{call_id}} at {{sip_invite_timestamp}}.
    Server responded with {{response_code}} {{reason_phrase}} at {{sip_response_timestamp}}.
    
    Time from INVITE to response: {{delta_ms}}ms
    
    Root Cause: {{reason_phrase}}
    Tier: {{response_code >= 500 ? "Server (Tier 3)" : "Configuration/Permission"}}
```

---

### Example 2: XMPP Presence Delay

**Scenario**: User updates status, but buddies report seeing old status for several minutes.

```yaml
# Pattern 1: Client Presence Change (Tier 1)
pattern_id: "jabber_presence_sent"
protocol_type: "log"
tier: "tier1"
regex: "Sending presence.*status=(.+)"

# Pattern 2: XMPP Presence Stanza (Protocol)
pattern_id: "xmpp_presence_outbound"
protocol_type: "xmpp"
protocol_filter:
  xmpp_stanza_type: ["presence"]
extractors:
  - name: "from_jid"
    xpath: "/presence/@from"
  - name: "show"
    xpath: "/presence/show"
  - name: "status"
    xpath: "/presence/status"
  - name: "timestamp"
    field: "packet_timestamp"

# Pattern 3: XMPP Presence Acknowledgment (Protocol)
pattern_id: "xmpp_presence_ack"
protocol_type: "xmpp"
protocol_filter:
  xmpp_stanza_type: ["iq"]
  xmpp_namespace: ["urn:xmpp:sm:3"]
extractors:
  - name: "ack_h"
    xpath: "/iq/a/@h"
  - name: "timestamp"
    field: "packet_timestamp"

# Pattern 4: Server Presence Broadcast Log (Tier 3)
pattern_id: "imp_presence_broadcast"
protocol_type: "log"
tier: "tier3"
regex: "Broadcasting presence.*from=(.+?)\\s+to=(.+?)\\s+subscribers=(\\d+)"

# Temporal Analysis
temporal_analysis:
  type: "latency"
  start_pattern: "xmpp_presence_outbound"
  end_pattern: "imp_presence_broadcast"
  threshold_ms: 2000
  severity_rules:
    - condition: "latency_ms > 5000"
      severity: "Warning"
      message: "Presence propagation delayed by {{latency_ms}}ms"
    - condition: "latency_ms > 10000"
      severity: "Error"
      message: "Severe presence delay: {{latency_ms}}ms - server may be overloaded"
```

---

### Example 3: RTP Media Quality Issues

**Scenario**: User reports "choppy audio" during calls. Need to correlate user complaint with actual packet loss/jitter.

```yaml
# Pattern 1: PCAP RTP Flow Analysis
pattern_id: "rtp_quality_metrics"
protocol_type: "pcap"
protocol_filter:
  packet_filter: "udp.port >= 16384 && udp.port <= 32767"  # RTP port range
  flow_criteria:
    protocol: "RTP"
    min_packets: 100  # Ignore very short flows
analysis_type: "rtp_flow"
extractors:
  - name: "ssrc"
    field: "rtp.ssrc"
  - name: "packet_count"
    aggregate: "count"
  - name: "packet_loss_percent"
    aggregate: "rtp.lost_percent"
  - name: "jitter_ms"
    aggregate: "rtp.jitter"
  - name: "codec"
    field: "rtp.payload_type"
severity_rules:
  - condition: "packet_loss_percent > 1.0"
    severity: "Warning"
    message: "Packet loss detected: {{packet_loss_percent}}%"
  - condition: "packet_loss_percent > 5.0"
    severity: "Error"
    message: "Severe packet loss: {{packet_loss_percent}}% - audio will be degraded"
  - condition: "jitter_ms > 30"
    severity: "Warning"
    message: "High jitter: {{jitter_ms}}ms - may cause audio artifacts"

# Pattern 2: RTCP Quality Reports (Protocol)
pattern_id: "rtcp_receiver_report"
protocol_type: "pcap"
protocol_filter:
  packet_filter: "rtcp.pt == 201"  # Receiver Report
extractors:
  - name: "ssrc"
    field: "rtcp.ssrc"
  - name: "fraction_lost"
    field: "rtcp.fraction_lost"
  - name: "cumulative_lost"
    field: "rtcp.cumulative_lost"
  - name: "jitter"
    field: "rtcp.jitter"

# Pattern 3: Client Audio Quality Log (Tier 1)
pattern_id: "jabber_audio_quality_warning"
protocol_type: "log"
tier: "tier1"
regex: "Audio quality degraded.*jitter=(\\d+).*loss=(\\d+\\.\\d+)"

# Correlation
correlation:
  patterns: ["rtp_quality_metrics", "rtcp_receiver_report", "jabber_audio_quality_warning"]
  diagnostic_template: |
    Media Quality Analysis for SSRC {{ssrc}}:
    
    Network Measurements (PCAP):
    - Packet Loss: {{packet_loss_percent}}%
    - Jitter: {{jitter_ms}}ms
    - Codec: {{codec}}
    
    RTCP Reports:
    - Fraction Lost: {{fraction_lost}}
    - Cumulative Lost: {{cumulative_lost}} packets
    
    Client-Side Perception:
    - Jabber reported: {{client_jitter}}ms jitter, {{client_loss}}% loss
    
    Assessment:
    {{#if packet_loss_percent > 5.0}}
    CRITICAL: Network packet loss is causing severe audio quality issues.
    Check for network congestion, bandwidth limitations, or routing problems.
    {{else if jitter_ms > 30}}
    WARNING: High network jitter may cause occasional audio artifacts.
    Consider QoS configuration or network path optimization.
    {{else}}
    Audio quality is within acceptable parameters.
    {{/if}}
```

---

### Example 4: HAR Web Client Performance

**Scenario**: CUACA (web admin console) is slow to load. Need to identify bottleneck.

```yaml
# Pattern 1: HAR Slow Resource Load
pattern_id: "har_slow_resource"
protocol_type: "har"
protocol_filter:
  http_method: ["GET"]
  url_pattern: ".*\\.js|.*\\.css|.*\\.json"
extractors:
  - name: "url"
    field: "request.url"
  - name: "timing_total"
    field: "timings.wait + timings.receive"
  - name: "timing_dns"
    field: "timings.dns"
  - name: "timing_connect"
    field: "timings.connect"
  - name: "timing_ssl"
    field: "timings.ssl"
  - name: "timing_wait"
    field: "timings.wait"
  - name: "timing_receive"
    field: "timings.receive"
  - name: "response_status"
    field: "response.status"
  - name: "response_size"
    field: "response.bodySize"
severity_rules:
  - condition: "timing_total > 5000"
    severity: "Error"
    message: "Resource took {{timing_total}}ms to load - page will be very slow"
  - condition: "timing_total > 2000"
    severity: "Warning"
    message: "Slow resource load: {{timing_total}}ms"

# Pattern 2: HAR API Call Failure
pattern_id: "har_api_failure"
protocol_type: "har"
protocol_filter:
  http_method: ["GET", "POST", "PUT", "DELETE"]
  http_status_code: [400, 401, 403, 404, 500, 502, 503]
  url_pattern: ".*/api/.*"
extractors:
  - name: "url"
    field: "request.url"
  - name: "method"
    field: "request.method"
  - name: "status"
    field: "response.status"
  - name: "response_body"
    field: "response.content.text"

# Diagnostic Template
diagnostic_template: |
  Web Client Performance Analysis:
  
  Slow Resources:
  {{#each slow_resources}}
  - {{url}}: {{timing_total}}ms
    Breakdown:
    - DNS: {{timing_dns}}ms
    - Connect: {{timing_connect}}ms
    - SSL: {{timing_ssl}}ms
    - Server Wait: {{timing_wait}}ms
    - Download: {{timing_receive}}ms
  {{/each}}
  
  Failed API Calls:
  {{#each failed_apis}}
  - {{method}} {{url}}: {{status}}
    Error: {{response_body}}
  {{/each}}
  
  Recommendations:
  {{#if timing_dns > 500}}
  - DNS resolution is slow - consider DNS caching or alternate DNS server
  {{/if}}
  {{#if timing_ssl > 1000}}
  - SSL handshake is slow - check certificate chain, OCSP, or server CPU
  {{/if}}
  {{#if timing_wait > 2000}}
  - Server processing is slow - check server logs for backend issues
  {{/if}}
```

---

## Implementation Phases

### Phase 1: Foundation (Q2 2026)

**Goal**: Basic protocol file parsing and pattern matching

**Deliverables**:
1. **File Type Detection**
   - PCAP/PCAPNG detection (magic bytes: 0xA1B2C3D4, 0x0A0D0D0A)
   - SIP file detection (text-based, starts with SIP method or "SIP/2.0")
   - XMPP file detection (XML-based, `<stream:stream>` or `<message>`)
   - HAR file detection (JSON, `{"log": {"version": "1.2"}}`)

2. **Parser Libraries**
   - PCAP: `pcap-parser` (Node.js) or `libpcap` bindings
   - SIP: Custom parser (text-based, regex + state machine)
   - XMPP: `ltx` or `@xmpp/xml` (XML parsing)
   - HAR: Native JSON parsing with schema validation

3. **Basic Pattern Engine Extension**
   ```typescript
   interface ProtocolSource {
     type: 'pcap' | 'sip' | 'xmpp' | 'har';
     file_path: string;
     parser: ProtocolParser;
     events: ProtocolEvent[];
   }
   
   interface ProtocolEvent {
     timestamp: number;  // Microsecond precision
     protocol: string;
     event_type: string;
     data: any;
     raw_packet?: Buffer;
   }
   ```

4. **Pattern Matching**
   - Extend pattern engine to handle protocol events
   - Protocol-specific extractors
   - Basic diagnostic generation

**Success Criteria**:
- Can load and parse PCAP, SIP, XMPP, HAR files
- Can define patterns that match protocol events
- Can generate diagnostics from protocol data

---

### Phase 2: Correlation (Q3 2026)

**Goal**: Cross-correlate protocol events with log entries

**Deliverables**:
1. **Time Synchronization**
   - Handle different timestamp formats and precisions
   - Automatic clock skew detection and correction
   - Time zone handling

2. **Transaction Reconstruction**
   - SIP call flows (INVITE → 180 → 200 → ACK → BYE)
   - XMPP session establishment (stream negotiation → SASL → bind)
   - HAR waterfall reconstruction (page load with all resources)
   - TCP stream reassembly for PCAP

3. **Correlation Keys**
   - Call-ID (SIP)
   - Message-ID / Thread-ID (XMPP)
   - Session-ID / Tracking-ID (HAR)
   - IP address + port tuples (PCAP)

4. **Cross-Source Timeline**
   ```typescript
   interface UnifiedEvent {
     timestamp: number;
     source_type: 'log' | 'pcap' | 'sip' | 'xmpp' | 'har';
     source_file: string;
     tier: LogContext;
     event_description: string;
     correlation_keys: Map<string, string>;
     related_events: string[];  // IDs of correlated events
   }
   ```

**Success Criteria**:
- Can correlate SIP INVITE with "Call Initiated" log
- Can correlate XMPP authentication with login logs
- Can correlate HAR API calls with server logs
- Timeline shows events from all sources in sync

---

### Phase 3: Advanced Analysis (Q4 2026)

**Goal**: Deep protocol analysis and quality metrics

**Deliverables**:
1. **RTP/RTCP Media Quality Analysis**
   - Packet loss calculation (sequence number gaps)
   - Jitter measurement (timestamp variance)
   - MOS (Mean Opinion Score) estimation
   - Codec identification and performance
   - RTCP feedback loop analysis

2. **SIP Call Flow Diagrams**
   - Visual call flow generation (ladder diagrams)
   - SDP analysis (media negotiation details)
   - Call failure classification (timeout, rejection, error)
   - SIP transaction state tracking

3. **XMPP Session Analysis**
   - Stream management analysis (XEP-0198)
   - Roster subscription propagation tracking
   - Message delivery success rate
   - Presence storm detection

4. **HAR Performance Metrics**
   - Page load time breakdown
   - Critical rendering path analysis
   - Resource blocking chains
   - WebSocket frame timing

5. **Security Analysis**
   - TLS version and cipher suite detection
   - Certificate validation tracking
   - Authentication flow analysis
   - Credential exposure detection (warnings only, no logging)

**Success Criteria**:
- Can generate MOS scores from RTP streams
- Can produce SIP call flow diagrams
- Can identify XMPP presence storms
- Can pinpoint HAR performance bottlenecks

---

## Storage and Case Management

### Protocol Files in Case Structure

```
cases/
  CASE-2026-001/
    logs/
      jabber_client.log
      tsp_service.log
      cucm_sdl.log
    protocols/
      captures/
        client_network.pcap
        server_network.pcap
      sip/
        sip_messages.txt
        sip_trace.log
      xmpp/
        xmpp_stream.xml
        xmpp_debug.log
      har/
        cuaca_session.har
        jabber_web.har
    analysis/
      unified_timeline.json
      correlation_map.json
      diagnostics.json
```

### File Size Considerations

Protocol files can be **very large**:
- PCAP: 1GB+ for 30-minute captures
- HAR: 10MB+ for complex web sessions
- SIP/XMPP: Usually manageable (< 10MB)

**Strategies**:
1. **Selective Loading**: Load only time ranges relevant to issues
2. **Streaming Parsing**: Don't load entire file into memory
3. **Pre-Processing**: Extract relevant flows/transactions during import
4. **Compression**: Store PCAP as pcapng with compression

---

## Pattern Categories for Protocol Analysis

### New Categories (40+ existing + 6 new = 46 total)

1. **Network Connectivity** (PCAP-based)
   - TCP connection establishment/teardown
   - Packet loss detection
   - Latency and RTT measurement
   - Network path changes (route flapping)

2. **Media Quality** (PCAP RTP/RTCP)
   - Packet loss patterns
   - Jitter analysis
   - Codec performance
   - DTMF detection

3. **SIP Signaling** (SIP protocol)
   - Call setup/teardown
   - Registration issues
   - Authentication failures
   - Proxy/redirect handling

4. **XMPP Messaging** (XMPP protocol)
   - Stream negotiation
   - Presence propagation
   - Message delivery
   - Service discovery

5. **HTTP/REST** (HAR)
   - API call failures
   - Authentication issues
   - Performance bottlenecks
   - WebSocket connections

6. **Security & TLS** (PCAP/HAR)
   - Certificate validation
   - TLS handshake failures
   - Cipher negotiation
   - Authentication flows

---

## UI/UX Considerations

### Protocol Event Visualization

1. **Timeline View**
   ```
   |--- Log Events ---|
   |--- SIP Events ---|
   |--- XMPP Events --|
   |--- PCAP Packets -|
   
   User Click → INVITE → 100 Trying → 180 Ringing → 200 OK → ACK → Log: Call Connected
      (Tier 1)   (SIP)      (SIP)         (SIP)        (SIP)   (SIP)     (Tier 1)
   ```

2. **Protocol-Specific Views**
   - **SIP**: Call flow ladder diagram
   - **XMPP**: XML stanza viewer with syntax highlighting
   - **PCAP**: Packet list with Wireshark-style columns
   - **HAR**: Waterfall chart (like Chrome DevTools)

3. **Correlation Highlights**
   - Linked events highlighted in same color
   - Click on log entry → jump to related protocol event
   - Visual indicators for missing expected events

4. **Filtering and Search**
   - Filter by protocol type
   - Filter by correlation status (correlated/uncorrelated)
   - Search across all sources simultaneously

---

## Example Scenarios: Protocol-Enhanced Troubleshooting

### Scenario 1: "Calls Failing Intermittently"

**Without Protocol Analysis**:
```
Client log: "Call Failed - Network Error"
Server log: Nothing (call never reached server)
Diagnosis: Unknown - could be client, network, or firewall
```

**With Protocol Analysis**:
```
Timeline:
1. Client Log: User clicked Call button → target=555-1234
2. SIP: INVITE sent from client → destination 555-1234
3. PCAP: SYN packet sent to 10.1.1.50:5060 (CUCM server)
4. PCAP: No SYN-ACK received (firewall blocked? server down?)
5. PCAP: SYN retransmitted 3 times over 9 seconds
6. Client Log: "Call Failed - Network Error"

Diagnosis: Network connectivity issue between client and CUCM
Root Cause: Firewall blocking SIP (port 5060), or server unreachable
Action: Check firewall rules, verify server IP, test network path
Tier: Network (between Tier 1 and Tier 3)
```

---

### Scenario 2: "Audio Quality Problems"

**Without Protocol Analysis**:
```
User complaint: "Choppy audio"
Client log: Generic warnings about network quality
Server log: Nothing unusual
Diagnosis: Vague - "network problems"
```

**With Protocol Analysis**:
```
RTP Flow Analysis (PCAP):
- Direction: Client → Server
- Packets: 4,532
- Packet Loss: 0.3% (acceptable)
- Jitter: 8ms (good)
- Codec: G.711

- Direction: Server → Client
- Packets: 4,280 (should be ~4,532)
- Packet Loss: 5.6% (BAD - threshold is 1%)
- Jitter: 47ms (BAD - threshold is 30ms)
- Codec: G.711

RTCP Reports:
- Client reporting: 5.8% loss, 49ms jitter (matches PCAP)

Diagnosis: ASYMMETRIC packet loss - outbound audio is fine, 
           inbound audio (server → client) has severe packet loss
Root Cause: Network path from server to client has issues
           (could be congestion, QoS misconfiguration, or ISP problem)
Action: Check QoS on return path, test with different network
Tier: Network infrastructure (affects multiple users if on same path)
```

---

### Scenario 3: "Login Hangs for 30 Seconds"

**Without Protocol Analysis**:
```
Client log: "Connecting to IM&P server..."
            (30 second gap)
            "Login successful"
Server log: Login completed successfully
Diagnosis: Unknown cause of delay
```

**With Protocol Analysis**:
```
XMPP Stream Timeline:
1. T+0ms: TCP connection established to IM&P server (fast)
2. T+10ms: Client sends <stream:stream>
3. T+15ms: Server responds with <stream:features>
4. T+20ms: Client begins SASL authentication (SCRAM-SHA-1)
5. T+25ms: Client sends certificate for validation
6. T+30000ms: Server responds with success (!!!)
           
PCAP Analysis:
- T+25ms → T+30000ms: No packets between client and server
- T+2000ms: Server sends TCP Keep-Alive
- T+29800ms: Server finally responds to client

Server Process Analysis:
- Certificate validation requires OCSP check
- OCSP server at ocsp.example.com is unreachable
- Server waits for 30-second timeout before failing over

Diagnosis: Certificate revocation check (OCSP) timing out
Root Cause: OCSP server unreachable, causing 30-second delay per RFC
Action: Fix OCSP server connectivity, or disable OCSP checking
Tier: Server (Tier 3) configuration issue
```

---

## Best Practices

### For Pattern Authors

1. **Choose the Right Source**
   - Use logs for high-level events ("Call Started", "User Logged In")
   - Use protocols for wire-level details (SIP response codes, packet loss)
   - Use both for correlation and confirmation

2. **Be Aware of Timing Precision**
   - Log timestamps: Usually second or millisecond precision
   - Protocol timestamps: Microsecond precision
   - Use timing windows when correlating (e.g., ±5 seconds)

3. **Consider All Tiers**
   - PCAP can be captured at any tier (client, server, or in-between)
   - SIP and XMPP span multiple tiers
   - HAR is usually Tier 1 (client-side) only

4. **Don't Over-Filter**
   - Protocol patterns should be broad (like log patterns)
   - Use extractors and triggers to narrow down severity
   - One pattern can cover many scenarios with different severities

### For Troubleshooters

1. **Start with Logs, Confirm with Protocols**
   - Logs tell you *what* the application thinks happened
   - Protocols tell you *what actually happened* on the network

2. **Look for Missing Events**
   - Expected SIP response didn't arrive → network/firewall issue
   - Log says "sent" but PCAP shows nothing → software bug
   - HAR shows request but no response → server crash

3. **Use Timing to Identify Bottlenecks**
   - Large gaps in timeline → something waiting or timing out
   - Compare log timestamps vs. protocol timestamps → clock skew
   - Measure intervals between correlated events → performance metrics

4. **Correlate Asymmetrically**
   - Client PCAP shows what client sent/received
   - Server PCAP shows what server sent/received
   - Differences reveal network path issues (packet loss, reordering)

---

## Security and Privacy

### Sensitive Data in Protocol Captures

**PCAP files may contain**:
- Passwords (if not using TLS)
- SIP authentication credentials (digest auth)
- Phone numbers and call metadata
- Media streams (audio/video if not encrypted)

**HAR files may contain**:
- Cookies (session tokens)
- API keys in headers
- Authentication tokens
- User data in request/response bodies

**Best Practices**:
1. **Encrypt at Rest**: Store protocol files encrypted
2. **Sanitization**: Provide tools to scrub sensitive data before sharing
3. **Access Control**: Restrict who can view protocol data
4. **Warnings**: Alert users when exporting protocol files
5. **Compliance**: Follow data retention and privacy regulations

---

## Summary

### What Protocol Analysis Adds

1. **Network-Level Visibility**
   - See actual packets, not just application logs
   - Detect packet loss, latency, and timing issues
   - Identify network path problems (firewall, NAT, routing)

2. **Protocol-Level Details**
   - SIP: Call setup/teardown details, SDP negotiation, error codes
   - XMPP: Stream negotiation, presence propagation, message delivery
   - HAR: HTTP timing, API failures, WebSocket communication

3. **Timing Precision**
   - Microsecond-level timestamps
   - Accurate latency and jitter measurement
   - Identify race conditions and timeout root causes

4. **Cross-Layer Correlation**
   - Link log events to protocol events
   - Confirm or contradict log messages
   - Build complete transaction flows across all tiers

### Integration with Existing Architecture

- **Extends** the multi-tier model (adds network layer)
- **Complements** log analysis (confirmation + details)
- **Enhances** diagnostics (root cause + evidence)
- **Enables** new scenarios (media quality, protocol issues)

### Implementation Roadmap

- **Q2 2026**: Basic parsing and pattern matching
- **Q3 2026**: Cross-source correlation and unified timeline
- **Q4 2026**: Advanced analysis (RTP quality, call flows, performance)

---

**Status**: Design phase complete, ready for implementation planning
**Next Steps**: Prototype PCAP parser, define 20 high-value protocol patterns, test correlation engine