# Protocol Analysis Tool Integration Strategy

## Overview

Rather than building protocol parsers from scratch, Log Scout Analyzer integrates with existing, battle-tested protocol analysis tools. This approach leverages decades of expert knowledge and mature tooling while focusing on what Log Scout does best: multi-tier log correlation, pattern matching, and actionable diagnostics.

---

## Philosophy: Import, Correlate, Validate

```
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Expert Tools                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Wireshark   │  │ SIP Analyzer │  │ XMPP Debug   │         │
│  │   (tshark)   │  │   (Homer)    │  │    Tools     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │ JSON/CSV         │ JSON             │ XML             │
│         └──────────────────┴──────────────────┘                 │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             ▼
         ┌───────────────────────────────────────┐
         │   Log Scout Analyzer Import Layer     │
         │                                        │
         │  • Parse tool output formats           │
         │  • Normalize to ProtocolFinding        │
         │  • Extract correlation keys            │
         └───────────────┬───────────────────────┘
                         ▼
         ┌───────────────────────────────────────┐
         │      Correlation Engine                │
         │                                        │
         │  • Match protocol findings to logs     │
         │  • Confirm/refute log diagnostics      │
         │  • Add network-level evidence          │
         └───────────────┬───────────────────────┘
                         ▼
         ┌───────────────────────────────────────┐
         │   Enhanced Diagnostic Output           │
         │                                        │
         │  Log Pattern: "Call Failed"            │
         │  + Wireshark: No response to SIP       │
         │  = Root Cause: Network/Firewall        │
         └───────────────────────────────────────┘
```

---

## Integration Targets: Existing Tools

### 1. Wireshark / tshark (Network Analysis)

**What it does**: Industry-standard packet analysis
**Export formats**: JSON, CSV, PDML (XML), text
**Key capabilities**:
- Expert Info (protocol errors, warnings, anomalies)
- Statistics (conversations, endpoints, protocols)
- Flow graphs
- RTP analysis (packet loss, jitter, MOS scores)
- Service Response Time

**Integration approach**:
```bash
# Export expert info as JSON
tshark -r capture.pcap -q -z expert -T json > expert_info.json

# Export RTP statistics
tshark -r capture.pcap -q -z rtp,streams > rtp_stats.txt

# Export conversations
tshark -r capture.pcap -q -z conv,tcp -T json > conversations.json

# Export SIP statistics
tshark -r capture.pcap -Y sip -T json > sip_messages.json
```

**What we import**:
- Expert Info warnings/errors (malformed packets, retransmissions, etc.)
- RTP stream quality metrics (already calculated!)
- TCP retransmissions and connection issues
- Protocol-specific statistics

---

### 2. Cisco RTMT (Real-Time Monitoring Tool)

**What it does**: Built-in Cisco UC diagnostics and monitoring
**Export formats**: CSV, XML reports
**Key capabilities**:
- CTI Manager performance counters
- Call processing metrics
- Device registration status
- Cluster health indicators
- Alert definitions

**Integration approach**:
- Import RTMT alert logs (already contain thresholds and severity)
- Import performance counter exports
- Map RTMT alerts to Log Scout patterns

**What we import**:
- Pre-defined Cisco thresholds and alerts
- System health metrics
- Performance baselines

---

### 3. Homer SIP Capture (SIP Analysis)

**What it does**: Open-source SIP capture and analysis platform
**Export formats**: JSON API, PCAP
**Key capabilities**:
- SIP call flow visualization
- Call quality metrics
- SIP error tracking
- Transaction correlation (INVITE→200 OK→ACK)

**Integration approach**:
```bash
# Query Homer API for call details
curl "http://homer:9060/api/v3/call/data" \
  -d '{"timestamp":{"from":1234567890,"to":1234567900}}' \
  > homer_calls.json
```

**What we import**:
- Call setup/teardown success rates
- SIP response codes and frequencies
- Call duration statistics
- Identified call quality issues

---

### 4. Chrome DevTools / HAR Exporters

**What it does**: Browser network performance analysis
**Export formats**: HAR (JSON), Performance traces
**Key capabilities**:
- Resource loading timeline
- Critical rendering path
- Network timing breakdown
- WebSocket frame capture

**Integration approach**:
- Import HAR files directly (already JSON)
- Parse Chrome Performance profiles
- Extract timing and error data

**What we import**:
- Page load bottlenecks (already identified by Chrome)
- Failed requests and status codes
- Timing breakdowns (DNS, connect, SSL, wait, receive)

---

### 5. VoIP Quality Analysis Tools

**Tools**: 
- PESQ (Perceptual Evaluation of Speech Quality)
- POLQA (Perceptual Objective Listening Quality Assessment)
- Cisco CallManager Serviceability reports

**What they do**: Audio quality assessment and MOS scoring
**Export formats**: CSV, XML reports

**Integration approach**:
- Import MOS scores and quality metrics
- Map to call IDs for correlation

**What we import**:
- MOS (Mean Opinion Score) - already calculated
- Audio quality classifications (excellent/good/fair/poor)
- Codec performance assessments

---

### 6. XMPP Debugging Tools

**Tools**:
- Psi+ XMPP console
- Gajim XML console
- Cisco Jabber Problem Report Tool (PRT)

**What they do**: XMPP stream debugging and session analysis
**Export formats**: XML logs, text logs

**Integration approach**:
- Import XMPP XML streams (Jabber PRT already exports these)
- Parse for stream errors and authentication issues

**What we import**:
- Stream negotiation outcomes
- Authentication success/failure
- Presence propagation timing

---

## Data Model: Protocol Findings

Instead of raw protocol events, we import **findings** from analysis tools:

```typescript
interface ProtocolFinding {
  id: string;
  source_tool: string;  // "wireshark", "homer", "rtmt", "chrome"
  source_file: string;
  
  timestamp_start: number;  // Microseconds
  timestamp_end?: number;
  
  category: FindingCategory;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  title: string;
  description: string;
  
  // What the tool found
  finding_type: string;  // "packet_loss", "sip_timeout", "http_slow_response"
  
  // Metrics and details
  metrics?: Map<string, number>;  // e.g., packet_loss_percent: 5.2
  details?: any;  // Tool-specific data
  
  // Correlation keys (extracted from finding)
  correlation_keys: Map<string, string>;
  
  // Link to source data
  source_reference?: string;  // Line number, packet number, etc.
  
  // Evidence/confirmation
  confidence: number;  // 0-100, how confident is the tool?
  
  // Relationship to logs
  related_log_patterns?: string[];
  validates?: string[];  // Pattern IDs this confirms
  refutes?: string[];    // Pattern IDs this contradicts
}

enum FindingCategory {
  NetworkConnectivity = "network_connectivity",
  MediaQuality = "media_quality",
  SignalingIssue = "signaling_issue",
  PerformanceBottleneck = "performance_bottleneck",
  ProtocolError = "protocol_error",
  SecurityIssue = "security_issue",
  ConfigurationIssue = "configuration_issue"
}
```

---

## Integration Architecture

### Phase 1: Import Layer

```typescript
interface ToolImporter {
  tool_name: string;
  supported_formats: string[];
  
  // Detect if a file is from this tool
  canImport(file_path: string): boolean;
  
  // Import and normalize to findings
  import(file_path: string): Promise<ProtocolFinding[]>;
  
  // Extract correlation keys
  extractCorrelationKeys(data: any): Map<string, string>;
}

class WiresharkExpertInfoImporter implements ToolImporter {
  tool_name = "wireshark";
  supported_formats = [".json", ".xml"];
  
  canImport(file_path: string): boolean {
    // Check for tshark JSON format or PDML
    const content = fs.readFileSync(file_path, 'utf-8');
    return content.includes('"_source"') || content.includes('<pdml>');
  }
  
  async import(file_path: string): Promise<ProtocolFinding[]> {
    const content = JSON.parse(fs.readFileSync(file_path, 'utf-8'));
    const findings: ProtocolFinding[] = [];
    
    // Example: Import expert info
    for (const packet of content) {
      const expert_info = packet._source?.layers?.expert;
      if (!expert_info) continue;
      
      findings.push({
        id: generateId(),
        source_tool: "wireshark",
        source_file: file_path,
        timestamp_start: parseWiresharkTimestamp(packet._source.layers.frame),
        category: this.mapExpertSeverity(expert_info.severity),
        severity: this.mapToSeverity(expert_info.severity),
        title: expert_info.message,
        description: expert_info.message,
        finding_type: expert_info.group,
        correlation_keys: this.extractCorrelationKeys(packet),
        source_reference: `Packet ${packet._source.layers.frame['frame.number']}`,
        confidence: 95  // Wireshark is highly confident
      });
    }
    
    return findings;
  }
  
  extractCorrelationKeys(packet: any): Map<string, string> {
    const keys = new Map<string, string>();
    
    // IP addresses
    if (packet._source.layers.ip) {
      keys.set('src_ip', packet._source.layers.ip['ip.src']);
      keys.set('dst_ip', packet._source.layers.ip['ip.dst']);
    }
    
    // TCP/UDP ports
    if (packet._source.layers.tcp) {
      keys.set('src_port', packet._source.layers.tcp['tcp.srcport']);
      keys.set('dst_port', packet._source.layers.tcp['tcp.dstport']);
    }
    
    // SIP Call-ID
    if (packet._source.layers.sip) {
      keys.set('call_id', packet._source.layers.sip['sip.Call-ID']);
    }
    
    return keys;
  }
  
  private mapExpertSeverity(severity: string): FindingCategory {
    // Map Wireshark expert severity to our categories
    switch (severity.toLowerCase()) {
      case 'error': return FindingCategory.ProtocolError;
      case 'warn': return FindingCategory.NetworkConnectivity;
      default: return FindingCategory.NetworkConnectivity;
    }
  }
  
  private mapToSeverity(expert_severity: string): 'info' | 'warning' | 'error' | 'critical' {
    switch (expert_severity.toLowerCase()) {
      case 'error': return 'error';
      case 'warn': return 'warning';
      case 'note': return 'info';
      default: return 'info';
    }
  }
}

class HomerSipImporter implements ToolImporter {
  tool_name = "homer";
  supported_formats = [".json"];
  
  async import(file_path: string): Promise<ProtocolFinding[]> {
    const data = JSON.parse(fs.readFileSync(file_path, 'utf-8'));
    const findings: ProtocolFinding[] = [];
    
    for (const call of data.data) {
      // Homer has already analyzed the call
      if (call.status === 'failed') {
        findings.push({
          id: generateId(),
          source_tool: "homer",
          source_file: file_path,
          timestamp_start: call.create_date * 1000000,
          timestamp_end: call.destroy_date * 1000000,
          category: FindingCategory.SignalingIssue,
          severity: 'error',
          title: `SIP Call Failed: ${call.source} → ${call.destination}`,
          description: `Call setup failed with response: ${call.response_code} ${call.response_text}`,
          finding_type: "sip_call_failure",
          metrics: new Map([
            ['response_code', call.response_code],
            ['duration_ms', call.duration]
          ]),
          correlation_keys: new Map([
            ['call_id', call.callid],
            ['from_user', call.source],
            ['to_user', call.destination]
          ]),
          confidence: 100  // Homer parsed actual SIP messages
        });
      }
      
      // Check call quality
      if (call.mos_score && call.mos_score < 3.5) {
        findings.push({
          id: generateId(),
          source_tool: "homer",
          source_file: file_path,
          timestamp_start: call.create_date * 1000000,
          category: FindingCategory.MediaQuality,
          severity: call.mos_score < 2.5 ? 'error' : 'warning',
          title: `Poor Audio Quality: MOS ${call.mos_score}`,
          description: `Call had poor audio quality (MOS score: ${call.mos_score})`,
          finding_type: "poor_audio_quality",
          metrics: new Map([
            ['mos_score', call.mos_score],
            ['packet_loss', call.packet_loss],
            ['jitter', call.jitter]
          ]),
          correlation_keys: new Map([
            ['call_id', call.callid]
          ]),
          confidence: 90
        });
      }
    }
    
    return findings;
  }
}

class ChromeHarImporter implements ToolImporter {
  tool_name = "chrome";
  supported_formats = [".har"];
  
  async import(file_path: string): Promise<ProtocolFinding[]> {
    const har = JSON.parse(fs.readFileSync(file_path, 'utf-8'));
    const findings: ProtocolFinding[] = [];
    
    for (const entry of har.log.entries) {
      // Chrome has already calculated timings
      if (entry.time > 5000) {  // Slow request (>5 seconds)
        findings.push({
          id: generateId(),
          source_tool: "chrome",
          source_file: file_path,
          timestamp_start: new Date(entry.startedDateTime).getTime() * 1000,
          category: FindingCategory.PerformanceBottleneck,
          severity: entry.time > 10000 ? 'error' : 'warning',
          title: `Slow HTTP Request: ${entry.time}ms`,
          description: `${entry.request.method} ${entry.request.url} took ${entry.time}ms`,
          finding_type: "slow_http_request",
          metrics: new Map([
            ['total_time_ms', entry.time],
            ['dns_ms', entry.timings.dns],
            ['connect_ms', entry.timings.connect],
            ['ssl_ms', entry.timings.ssl],
            ['wait_ms', entry.timings.wait],
            ['receive_ms', entry.timings.receive]
          ]),
          correlation_keys: new Map([
            ['url', entry.request.url],
            ['method', entry.request.method]
          ]),
          details: entry,
          confidence: 100  // Chrome measured actual timings
        });
      }
      
      // Failed requests
      if (entry.response.status >= 400) {
        findings.push({
          id: generateId(),
          source_tool: "chrome",
          source_file: file_path,
          timestamp_start: new Date(entry.startedDateTime).getTime() * 1000,
          category: FindingCategory.ProtocolError,
          severity: entry.response.status >= 500 ? 'error' : 'warning',
          title: `HTTP ${entry.response.status}: ${entry.request.url}`,
          description: `${entry.request.method} ${entry.request.url} failed with status ${entry.response.status}`,
          finding_type: "http_error",
          metrics: new Map([
            ['status_code', entry.response.status]
          ]),
          correlation_keys: new Map([
            ['url', entry.request.url]
          ]),
          confidence: 100
        });
      }
    }
    
    return findings;
  }
}
```

---

## Phase 2: Correlation with Logs

### Correlation Strategy

```typescript
class ProtocolLogCorrelator {
  correlate(
    log_diagnostics: Diagnostic[],
    protocol_findings: ProtocolFinding[]
  ): CorrelatedDiagnostic[] {
    
    const correlated: CorrelatedDiagnostic[] = [];
    
    for (const diagnostic of log_diagnostics) {
      const matching_findings = this.findMatchingProtocolFindings(
        diagnostic,
        protocol_findings
      );
      
      correlated.push({
        ...diagnostic,
        protocol_evidence: matching_findings,
        confidence: this.calculateConfidence(diagnostic, matching_findings),
        validation_status: this.determineValidation(diagnostic, matching_findings)
      });
    }
    
    return correlated;
  }
  
  private findMatchingProtocolFindings(
    diagnostic: Diagnostic,
    findings: ProtocolFinding[]
  ): ProtocolFinding[] {
    
    const matches: ProtocolFinding[] = [];
    
    for (const finding of findings) {
      // Time correlation (within 5 seconds)
      if (!this.isTimeCorrelated(diagnostic, finding, 5000000)) {
        continue;
      }
      
      // Key correlation (IP, call-id, user, etc.)
      if (this.hasMatchingKeys(diagnostic, finding)) {
        matches.push(finding);
      }
    }
    
    return matches;
  }
  
  private isTimeCorrelated(
    diagnostic: Diagnostic,
    finding: ProtocolFinding,
    window_us: number
  ): boolean {
    const diag_time = diagnostic.timestamp * 1000;  // Convert to microseconds
    const finding_time = finding.timestamp_start;
    
    return Math.abs(diag_time - finding_time) <= window_us;
  }
  
  private hasMatchingKeys(
    diagnostic: Diagnostic,
    finding: ProtocolFinding
  ): boolean {
    // Extract potential correlation keys from diagnostic
    const diag_params = diagnostic.extracted_parameters || {};
    
    for (const [key, value] of finding.correlation_keys) {
      // Check if diagnostic has matching parameter
      if (diag_params[key] === value) {
        return true;
      }
      
      // Check if diagnostic message contains the value
      if (diagnostic.message.includes(value)) {
        return true;
      }
    }
    
    return false;
  }
  
  private calculateConfidence(
    diagnostic: Diagnostic,
    findings: ProtocolFinding[]
  ): number {
    if (findings.length === 0) return 50;  // No protocol evidence
    
    // Average confidence of protocol findings
    const avg_confidence = findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length;
    
    // Boost confidence if multiple findings agree
    const boost = Math.min(findings.length * 10, 40);
    
    return Math.min(avg_confidence + boost, 100);
  }
  
  private determineValidation(
    diagnostic: Diagnostic,
    findings: ProtocolFinding[]
  ): ValidationStatus {
    if (findings.length === 0) {
      return 'unconfirmed';
    }
    
    // Check if findings support the diagnostic
    const supporting = findings.filter(f => 
      this.findingSupportsCategory(f, diagnostic.category)
    );
    
    if (supporting.length > 0) {
      return 'confirmed';
    }
    
    // Check if findings contradict
    const contradicting = findings.filter(f =>
      this.findingContradictsCategory(f, diagnostic.category)
    );
    
    if (contradicting.length > 0) {
      return 'refuted';
    }
    
    return 'partial';
  }
  
  private findingSupportsCategory(
    finding: ProtocolFinding,
    category: string
  ): boolean {
    // Map protocol findings to log categories
    const supportMap: Record<string, string[]> = {
      'network_connectivity': ['tcp_retransmission', 'connection_timeout', 'packet_loss'],
      'media_quality': ['poor_audio_quality', 'rtp_packet_loss', 'high_jitter'],
      'signaling_issue': ['sip_call_failure', 'sip_timeout', 'sip_error_response']
    };
    
    return supportMap[finding.category]?.includes(category) || false;
  }
  
  private findingContradictsCategory(
    finding: ProtocolFinding,
    category: string
  ): boolean {
    // Examples of contradictions
    if (category === 'network_connectivity' && finding.finding_type === 'successful_connection') {
      return true;
    }
    
    if (category === 'media_quality' && finding.metrics?.get('mos_score') > 4.0) {
      return true;  // Good MOS contradicts audio quality complaint
    }
    
    return false;
  }
}

interface CorrelatedDiagnostic extends Diagnostic {
  protocol_evidence: ProtocolFinding[];
  confidence: number;
  validation_status: ValidationStatus;
}

type ValidationStatus = 'confirmed' | 'refuted' | 'partial' | 'unconfirmed';
```

---

## Enhanced Diagnostic Output

### Example 1: Confirmed by Protocol Analysis

```
┌────────────────────────────────────────────────────────────────┐
│ DIAGNOSTIC: Call Setup Failed                                  │
├────────────────────────────────────────────────────────────────┤
│ Severity: ERROR                                                │
│ Source: Jabber Client Log (Tier 1)                            │
│ Time: 2024-01-15 10:23:45.123                                 │
│ Message: Call to 555-1234 failed - Network Error              │
├────────────────────────────────────────────────────────────────┤
│ PROTOCOL EVIDENCE (Wireshark):                                │
│ ✓ TCP SYN sent to 10.1.1.50:5060                             │
│ ✗ No SYN-ACK received (timeout after 3 seconds)              │
│ ✓ TCP retransmissions detected (3 attempts)                  │
│                                                                 │
│ PROTOCOL EVIDENCE (Homer SIP):                                │
│ ✓ SIP INVITE sent (Call-ID: abc123...)                       │
│ ✗ No SIP response received                                    │
├────────────────────────────────────────────────────────────────┤
│ VALIDATION: CONFIRMED ✓                                        │
│ Confidence: 95%                                                │
│                                                                 │
│ ROOT CAUSE: Network connectivity issue between client and     │
│             CUCM server (10.1.1.50). SIP port (5060) is       │
│             blocked or server is unreachable.                  │
│                                                                 │
│ EVIDENCE CHAIN:                                                │
│ 1. Application logged "Network Error"                         │
│ 2. Wireshark shows no response to TCP SYN                     │
│ 3. Homer confirms SIP INVITE never reached server             │
│                                                                 │
│ RECOMMENDED ACTIONS:                                           │
│ 1. Verify firewall rules allow SIP (port 5060)                │
│ 2. Ping/traceroute to CUCM server (10.1.1.50)                │
│ 3. Check CUCM server status and network interface             │
└────────────────────────────────────────────────────────────────┘
```

### Example 2: Refuted by Protocol Analysis

```
┌────────────────────────────────────────────────────────────────┐
│ DIAGNOSTIC: Poor Audio Quality                                 │
├────────────────────────────────────────────────────────────────┤
│ Severity: WARNING                                              │
│ Source: Jabber Client Log (Tier 1)                            │
│ Time: 2024-01-15 10:25:30.456                                 │
│ Message: Audio quality degraded - packet loss detected        │
├────────────────────────────────────────────────────────────────┤
│ PROTOCOL EVIDENCE (Wireshark RTP Analysis):                   │
│ ✓ Packet Loss: 0.2% (threshold: 1.0%)                        │
│ ✓ Jitter: 12ms (threshold: 30ms)                             │
│ ✓ MOS Score: 4.2/5.0 (Good)                                   │
│ ✓ All RTP packets accounted for                               │
├────────────────────────────────────────────────────────────────┤
│ VALIDATION: REFUTED ✗                                          │
│ Confidence: 90%                                                │
│                                                                 │
│ ANALYSIS: Network measurements show excellent audio quality.  │
│           The client's perception may be due to:               │
│                                                                 │
│ POSSIBLE CAUSES:                                               │
│ 1. Audio codec issue (not network-related)                    │
│ 2. Local sound card/driver problem                            │
│ 3. CPU/resource constraints on client machine                 │
│ 4. Bluetooth headset latency/interference                      │
│                                                                 │
│ RECOMMENDED ACTIONS:                                           │
│ 1. Check client CPU/memory usage during calls                 │
│ 2. Test with different audio device                           │
│ 3. Update audio drivers                                        │
│ 4. Check for local interference (Bluetooth, WiFi)             │
└────────────────────────────────────────────────────────────────┘
```

---

## Case Structure with Protocol Tools

```
cases/
  CASE-2026-001/
    logs/
      jabber_client.log
      tsp_service.log
      cucm_sdl.log
    
    protocol_captures/
      client_network.pcap
      server_network.pcap
      sip_trace.txt
      xmpp_stream.xml
      web_session.har
    
    protocol_analysis/
      wireshark/
        expert_info.json          # ← Import this
        rtp_statistics.csv        # ← Import this
        conversations.json        # ← Import this
      
      homer/
        call_analysis.json        # ← Import this
      
      chrome/
        performance_trace.json    # ← Import this
      
      rtmt/
        alerts.csv                # ← Import this
        performance_counters.csv  # ← Import this
    
    log_scout_analysis/
      diagnostics.json
      correlated_findings.json    # ← New: combined view
      evidence_map.json           # ← New: correlation map
      timeline_unified.json       # ← New: logs + protocol
```

---

## Implementation Phases

### Phase 1: Import Layer (Q2 2026)

**Goal**: Import findings from 3 key tools

**Deliverables**:
1. Wireshark Expert Info importer (JSON)
2. Wireshark RTP Statistics importer (text/CSV)
3. Chrome HAR importer (JSON)
4. Generic CSV importer for RTMT alerts

**Success Criteria**:
- Can load Wireshark expert info and convert to findings
- Can extract RTP quality metrics from tshark output
- Can import HAR files and identify slow/failed requests
- Findings have proper correlation keys

### Phase 2: Correlation Engine (Q3 2026)

**Goal**: Match protocol findings to log diagnostics

**Deliverables**:
1. Time-based correlation (±5 second window)
2. Key-based correlation (IP, Call-ID, user, URL)
3. Confidence scoring
4. Validation status (confirmed/refuted/partial)

**Success Criteria**:
- Protocol findings confirm/refute log diagnostics
- Evidence chains show complete transaction flow
- Diagnostics display protocol evidence

### Phase 3: Advanced Integration (Q4 2026)

**Goal**: Integrate with more specialized tools

**Deliverables**:
1. Homer SIP API integration
2. RTMT alert import
3. Cisco PRT (Problem Report Tool) import
4. Custom tool output templates

**Success Criteria**:
- Support 5+ external tools
- User can add custom tool importers
- Real-time API integration (Homer, RTMT)

---

## User Workflows

### Workflow 1: Offline Analysis with Wireshark

```
1. User captures packets during issue (Wireshark/tcpdump)
2. User opens capture in Wireshark
3. User exports analysis:
   - Tools → Expert Information → Export as JSON
   - Telephony → RTP → Stream Analysis → Save As
   - Statistics → Conversations → Export as JSON
4. User imports exports into Log Scout case
5. Log Scout correlates with logs automatically
6. User sees enhanced diagnostics with network evidence
```

### Workflow 2: Quick Check with tshark

```
1. User has PCAP file in case directory
2. Log Scout detects PCAP file
3. Log Scout prompts: "Run tshark analysis on client_network.pcap?"
4. User clicks "Yes"
5. Log Scout runs:
   tshark -r client_network.pcap -q -z expert -T json > expert_info.json
6. Log Scout imports results automatically
7. Diagnostics update with protocol evidence
```

### Workflow 3: Chrome DevTools Integration

```
1. User debugging web client (CUACA, Jabber web)
2. User opens Chrome DevTools (F12)
3. User exports HAR: Network tab → Right-click → Save as HAR
4. User drops HAR file into Log Scout case
5. Log Scout imports automatically
6. Web performance issues correlate with server API logs
```

### Workflow 4: Homer SIP Dashboard

```
1. Organization runs Homer SIP capture server
2. User enters Homer API credentials in Log Scout
3. User specifies time range for analysis
4. Log Scout queries Homer API for calls
5. Homer's pre-analyzed call data imports
6. SIP call failures correlate with client/server logs
```

---

## Configuration

### Tool Integration Settings

```yaml
# log_scout_config.yaml

protocol_tools:
  wireshark:
    enabled: true
    tshark_path: "C:\\Program Files\\Wireshark\\tshark.exe"
    auto_analyze: true
    export_formats:
      - expert_info
      - rtp_statistics
      - conversations
  
  homer:
    enabled: false
    api_url: "http://homer.example.com:9060"
    api_key: "${HOMER_API_KEY}"
    auto_import: false
  
  chrome:
    enabled: true
    auto_detect_har: true
  
  rtmt:
    enabled: true
    alert_csv_path: "protocol_analysis/rtmt/alerts.csv"
  
  custom_tools:
    - name: "internal_sip_analyzer"
      importer: "custom_importers/internal_sip.js"
      file_pattern: "*_sip_analysis.json"

correlation:
  time_window_seconds: 5
  min_confidence: 50
  auto_correlate: true
```

---

## Benefits

### For Users

1. **Leverage Expert Tools**: Use industry-standard tools you already know
2. **No Duplicate Work**: Don't capture data twice - import existing analysis
3. **Confidence in Diagnostics**: Protocol evidence confirms or refutes log-based findings
4. **Complete Picture**: See both application perspective (logs) and network reality (protocols)

### For Development

1. **No Protocol Expertise Needed**: Don't reinvent packet parsing, SIP parsing, etc.
2. **Battle-Tested Analysis**: Leverage decades of Wireshark, Homer, Chrome expertise
3. **Flexible Integration**: Easy to add new tools via importer interface
4. **Maintainable**: Tools maintain their own parsers, we just import results

### For Troubleshooting

1. **Evidence-Based Diagnosis**: "Client says network error" + "Wireshark confirms no response" = high confidence
2. **Contradiction Detection**: "Client reports packet loss" + "Wireshark shows 0.1% loss" = look elsewhere
3. **Root Cause Precision**: Distinguish network vs. application vs. server issues
4. **Actionable Insights**: Know exactly where to focus remediation

---

## Summary

Instead of building protocol parsers, Log Scout Analyzer:

✓ **Imports** analysis results from expert tools (Wireshark, Homer, Chrome)
✓ **Correlates** protocol findings with log-based diagnostics
✓ **Validates** diagnostics with network-level evidence
✓ **Enhances** output with confidence scores and evidence chains

This approach:
- Respects existing tooling and expertise
- Focuses on Log Scout's core strength (multi-tier log correlation)
- Provides validation and evidence for diagnostics
- Enables users to leverage tools they already know

**Next Steps**:
1. Implement Wireshark Expert Info importer (most valuable)
2. Implement Chrome HAR importer (easiest)
3. Build correlation engine prototype
4. Test with real case data

**Status**: Design complete, ready for implementation planning