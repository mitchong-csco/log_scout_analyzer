# Protocol Parser Implementation Guide

## Overview

This document provides concrete implementation details for parsing PCAP, SIP, XMPP, and HAR files in the Log Scout Analyzer. It covers library selection, parser architecture, data structures, and code examples.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Protocol Parser Layer                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PCAP Parser  │  │  SIP Parser  │  │ XMPP Parser  │     │
│  │              │  │              │  │              │     │
│  │ • Libpcap    │  │ • Text-based │  │ • XML-based  │     │
│  │ • Flow       │  │ • State      │  │ • Stream     │     │
│  │   Assembly   │  │   Machine    │  │   Parser     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌─────────────────────────────────┐    │
│  │  HAR Parser  │  │   Protocol Event Normalizer     │    │
│  │              │  │                                   │    │
│  │ • JSON-based │  │  Converts all formats to         │    │
│  │ • Waterfall  │  │  unified ProtocolEvent structure │    │
│  └──────────────┘  └─────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. PCAP Parser Implementation

### Library Selection

**Primary: `pcap-parser` (Node.js)**
```json
{
  "dependencies": {
    "pcap-parser": "^2.3.0",
    "buffer": "^6.0.3"
  }
}
```

**Alternative: `cap` (native bindings to libpcap)**
```json
{
  "dependencies": {
    "cap": "^0.2.1"
  }
}
```

### Data Structures

```typescript
interface PcapFile {
  file_path: string;
  format: 'pcap' | 'pcapng';
  snaplen: number;
  linktype: number;
  packets: PcapPacket[];
}

interface PcapPacket {
  timestamp: number;  // Microseconds since epoch
  length: number;     // Actual packet length
  capture_length: number;  // Captured length (may be truncated)
  
  // Parsed layers
  ethernet?: EthernetLayer;
  ip?: IpLayer;
  tcp?: TcpLayer;
  udp?: UdpLayer;
  
  // Application protocols
  sip?: SipMessage;
  rtp?: RtpPacket;
  rtcp?: RtcpPacket;
  
  raw: Buffer;
}

interface EthernetLayer {
  source_mac: string;
  dest_mac: string;
  ethertype: number;
}

interface IpLayer {
  version: 4 | 6;
  source_ip: string;
  dest_ip: string;
  protocol: number;  // 6=TCP, 17=UDP
  ttl: number;
  length: number;
}

interface TcpLayer {
  source_port: number;
  dest_port: number;
  seq: number;
  ack: number;
  flags: TcpFlags;
  window_size: number;
  payload: Buffer;
}

interface TcpFlags {
  syn: boolean;
  ack: boolean;
  fin: boolean;
  rst: boolean;
  psh: boolean;
}

interface UdpLayer {
  source_port: number;
  dest_port: number;
  length: number;
  payload: Buffer;
}

interface RtpPacket {
  version: number;
  padding: boolean;
  extension: boolean;
  marker: boolean;
  payload_type: number;
  sequence_number: number;
  timestamp: number;
  ssrc: number;
  csrc?: number[];
  payload: Buffer;
}

interface RtcpPacket {
  type: 'SR' | 'RR' | 'SDES' | 'BYE' | 'APP';
  ssrc: number;
  reports?: RtcpReport[];
}

interface RtcpReport {
  ssrc: number;
  fraction_lost: number;
  cumulative_lost: number;
  highest_seq: number;
  jitter: number;
  lsr: number;  // Last SR timestamp
  dlsr: number; // Delay since last SR
}
```

### Parser Implementation

```typescript
import * as pcap from 'pcap-parser';
import { createReadStream } from 'fs';

class PcapParser {
  private flows: Map<string, TcpFlow> = new Map();
  private rtpFlows: Map<number, RtpFlow> = new Map();
  
  async parse(file_path: string): Promise<PcapFile> {
    return new Promise((resolve, reject) => {
      const packets: PcapPacket[] = [];
      const parser = pcap.parse(createReadStream(file_path));
      
      parser.on('packet', (raw_packet) => {
        const packet = this.parsePacket(raw_packet);
        packets.push(packet);
        
        // Track TCP flows for reassembly
        if (packet.tcp) {
          this.handleTcpPacket(packet);
        }
        
        // Track RTP flows for quality metrics
        if (packet.rtp) {
          this.handleRtpPacket(packet);
        }
      });
      
      parser.on('end', () => {
        resolve({
          file_path,
          format: 'pcap',
          snaplen: parser.header.snapLen,
          linktype: parser.header.linkLayerType,
          packets
        });
      });
      
      parser.on('error', reject);
    });
  }
  
  private parsePacket(raw: any): PcapPacket {
    const packet: PcapPacket = {
      timestamp: raw.header.timestampSeconds * 1e6 + raw.header.timestampMicroseconds,
      length: raw.header.originalLength,
      capture_length: raw.header.captureLength,
      raw: raw.data
    };
    
    let offset = 0;
    
    // Parse Ethernet
    if (raw.data.length >= 14) {
      packet.ethernet = this.parseEthernet(raw.data, offset);
      offset += 14;
    }
    
    // Parse IP
    if (packet.ethernet?.ethertype === 0x0800) {  // IPv4
      const ipResult = this.parseIPv4(raw.data, offset);
      packet.ip = ipResult.layer;
      offset = ipResult.nextOffset;
      
      // Parse TCP/UDP
      if (packet.ip.protocol === 6) {  // TCP
        const tcpResult = this.parseTCP(raw.data, offset);
        packet.tcp = tcpResult.layer;
        
        // Check for SIP in TCP payload
        if (this.isSipPort(packet.tcp.source_port) || 
            this.isSipPort(packet.tcp.dest_port)) {
          packet.sip = this.parseSipFromBuffer(packet.tcp.payload);
        }
      } else if (packet.ip.protocol === 17) {  // UDP
        const udpResult = this.parseUDP(raw.data, offset);
        packet.udp = udpResult.layer;
        
        // Check for SIP in UDP payload
        if (this.isSipPort(packet.udp.source_port) || 
            this.isSipPort(packet.udp.dest_port)) {
          packet.sip = this.parseSipFromBuffer(packet.udp.payload);
        }
        
        // Check for RTP (even ports >= 16384)
        if (this.isRtpPort(packet.udp.dest_port)) {
          packet.rtp = this.parseRTP(packet.udp.payload);
        }
        
        // Check for RTCP (odd ports >= 16385)
        if (this.isRtcpPort(packet.udp.dest_port)) {
          packet.rtcp = this.parseRTCP(packet.udp.payload);
        }
      }
    }
    
    return packet;
  }
  
  private parseEthernet(buffer: Buffer, offset: number): EthernetLayer {
    return {
      dest_mac: this.formatMac(buffer.slice(offset, offset + 6)),
      source_mac: this.formatMac(buffer.slice(offset + 6, offset + 12)),
      ethertype: buffer.readUInt16BE(offset + 12)
    };
  }
  
  private parseIPv4(buffer: Buffer, offset: number): { layer: IpLayer, nextOffset: number } {
    const version_ihl = buffer.readUInt8(offset);
    const version = (version_ihl >> 4) & 0x0F;
    const ihl = (version_ihl & 0x0F) * 4;  // Header length in bytes
    
    return {
      layer: {
        version: version as 4,
        source_ip: this.formatIPv4(buffer.slice(offset + 12, offset + 16)),
        dest_ip: this.formatIPv4(buffer.slice(offset + 16, offset + 20)),
        protocol: buffer.readUInt8(offset + 9),
        ttl: buffer.readUInt8(offset + 8),
        length: buffer.readUInt16BE(offset + 2)
      },
      nextOffset: offset + ihl
    };
  }
  
  private parseTCP(buffer: Buffer, offset: number): { layer: TcpLayer, nextOffset: number } {
    const source_port = buffer.readUInt16BE(offset);
    const dest_port = buffer.readUInt16BE(offset + 2);
    const seq = buffer.readUInt32BE(offset + 4);
    const ack = buffer.readUInt32BE(offset + 8);
    const data_offset = ((buffer.readUInt8(offset + 12) >> 4) & 0x0F) * 4;
    const flags_byte = buffer.readUInt8(offset + 13);
    const window_size = buffer.readUInt16BE(offset + 14);
    
    const header_end = offset + data_offset;
    const payload = buffer.slice(header_end);
    
    return {
      layer: {
        source_port,
        dest_port,
        seq,
        ack,
        flags: {
          syn: (flags_byte & 0x02) !== 0,
          ack: (flags_byte & 0x10) !== 0,
          fin: (flags_byte & 0x01) !== 0,
          rst: (flags_byte & 0x04) !== 0,
          psh: (flags_byte & 0x08) !== 0
        },
        window_size,
        payload
      },
      nextOffset: header_end
    };
  }
  
  private parseUDP(buffer: Buffer, offset: number): { layer: UdpLayer, nextOffset: number } {
    const source_port = buffer.readUInt16BE(offset);
    const dest_port = buffer.readUInt16BE(offset + 2);
    const length = buffer.readUInt16BE(offset + 4);
    const payload = buffer.slice(offset + 8, offset + length);
    
    return {
      layer: {
        source_port,
        dest_port,
        length,
        payload
      },
      nextOffset: offset + length
    };
  }
  
  private parseRTP(buffer: Buffer): RtpPacket | undefined {
    if (buffer.length < 12) return undefined;
    
    const byte0 = buffer.readUInt8(0);
    const version = (byte0 >> 6) & 0x03;
    if (version !== 2) return undefined;  // Not RTP v2
    
    const padding = ((byte0 >> 5) & 0x01) === 1;
    const extension = ((byte0 >> 4) & 0x01) === 1;
    const cc = byte0 & 0x0F;  // CSRC count
    
    const byte1 = buffer.readUInt8(1);
    const marker = ((byte1 >> 7) & 0x01) === 1;
    const payload_type = byte1 & 0x7F;
    
    const sequence_number = buffer.readUInt16BE(2);
    const timestamp = buffer.readUInt32BE(4);
    const ssrc = buffer.readUInt32BE(8);
    
    let offset = 12;
    const csrc: number[] = [];
    for (let i = 0; i < cc; i++) {
      csrc.push(buffer.readUInt32BE(offset));
      offset += 4;
    }
    
    // Skip extension header if present
    if (extension) {
      const ext_length = buffer.readUInt16BE(offset + 2) * 4;
      offset += 4 + ext_length;
    }
    
    const payload = buffer.slice(offset);
    
    return {
      version,
      padding,
      extension,
      marker,
      payload_type,
      sequence_number,
      timestamp,
      ssrc,
      csrc: csrc.length > 0 ? csrc : undefined,
      payload
    };
  }
  
  private parseRTCP(buffer: Buffer): RtcpPacket | undefined {
    if (buffer.length < 4) return undefined;
    
    const byte0 = buffer.readUInt8(0);
    const version = (byte0 >> 6) & 0x03;
    if (version !== 2) return undefined;
    
    const packet_type = buffer.readUInt8(1);
    
    let type: RtcpPacket['type'];
    switch (packet_type) {
      case 200: type = 'SR'; break;
      case 201: type = 'RR'; break;
      case 202: type = 'SDES'; break;
      case 203: type = 'BYE'; break;
      case 204: type = 'APP'; break;
      default: return undefined;
    }
    
    const ssrc = buffer.readUInt32BE(4);
    
    // Parse receiver reports
    const reports: RtcpReport[] = [];
    if (type === 'RR' || type === 'SR') {
      const rc = byte0 & 0x1F;  // Report count
      let offset = type === 'SR' ? 28 : 8;  // SR has sender info
      
      for (let i = 0; i < rc; i++) {
        if (buffer.length < offset + 24) break;
        
        reports.push({
          ssrc: buffer.readUInt32BE(offset),
          fraction_lost: buffer.readUInt8(offset + 4),
          cumulative_lost: buffer.readUIntBE(offset + 5, 3),
          highest_seq: buffer.readUInt32BE(offset + 8),
          jitter: buffer.readUInt32BE(offset + 12),
          lsr: buffer.readUInt32BE(offset + 16),
          dlsr: buffer.readUInt32BE(offset + 20)
        });
        
        offset += 24;
      }
    }
    
    return {
      type,
      ssrc,
      reports: reports.length > 0 ? reports : undefined
    };
  }
  
  private handleTcpPacket(packet: PcapPacket): void {
    if (!packet.tcp || !packet.ip) return;
    
    const flow_key = this.getTcpFlowKey(packet);
    let flow = this.flows.get(flow_key);
    
    if (!flow) {
      flow = new TcpFlow(packet);
      this.flows.set(flow_key, flow);
    }
    
    flow.addPacket(packet);
  }
  
  private handleRtpPacket(packet: PcapPacket): void {
    if (!packet.rtp) return;
    
    const ssrc = packet.rtp.ssrc;
    let flow = this.rtpFlows.get(ssrc);
    
    if (!flow) {
      flow = new RtpFlow(ssrc);
      this.rtpFlows.set(ssrc, flow);
    }
    
    flow.addPacket(packet);
  }
  
  private getTcpFlowKey(packet: PcapPacket): string {
    const ip = packet.ip!;
    const tcp = packet.tcp!;
    
    // Normalize flow key (ensure consistent direction)
    const parts = [ip.source_ip, tcp.source_port, ip.dest_ip, tcp.dest_port].map(String);
    parts.sort();
    return parts.join(':');
  }
  
  private isSipPort(port: number): boolean {
    return port === 5060 || port === 5061;  // Standard SIP ports
  }
  
  private isRtpPort(port: number): boolean {
    return port >= 16384 && port <= 32767 && port % 2 === 0;
  }
  
  private isRtcpPort(port: number): boolean {
    return port >= 16385 && port <= 32767 && port % 2 === 1;
  }
  
  private formatMac(buffer: Buffer): string {
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(':');
  }
  
  private formatIPv4(buffer: Buffer): string {
    return Array.from(buffer).join('.');
  }
  
  private parseSipFromBuffer(buffer: Buffer): SipMessage | undefined {
    // Will be implemented in SIP parser section
    return undefined;
  }
  
  getRtpFlowMetrics(ssrc: number): RtpFlowMetrics | undefined {
    const flow = this.rtpFlows.get(ssrc);
    return flow?.getMetrics();
  }
  
  getAllRtpFlows(): Map<number, RtpFlowMetrics> {
    const metrics = new Map<number, RtpFlowMetrics>();
    for (const [ssrc, flow] of this.rtpFlows) {
      metrics.set(ssrc, flow.getMetrics());
    }
    return metrics;
  }
}

// TCP Flow Reassembly
class TcpFlow {
  packets: PcapPacket[] = [];
  reassembled: Buffer[] = [];
  
  constructor(initial_packet: PcapPacket) {
    this.packets.push(initial_packet);
  }
  
  addPacket(packet: PcapPacket): void {
    this.packets.push(packet);
    
    // Sort by sequence number for reassembly
    this.packets.sort((a, b) => a.tcp!.seq - b.tcp!.seq);
  }
  
  getReassembledData(): Buffer {
    return Buffer.concat(this.reassembled);
  }
}

// RTP Flow Analysis
class RtpFlow {
  ssrc: number;
  packets: PcapPacket[] = [];
  sequence_numbers: Set<number> = new Set();
  expected_packets: number = 0;
  
  constructor(ssrc: number) {
    this.ssrc = ssrc;
  }
  
  addPacket(packet: PcapPacket): void {
    if (!packet.rtp) return;
    
    this.packets.push(packet);
    this.sequence_numbers.add(packet.rtp.sequence_number);
    
    // Update expected count based on sequence number range
    if (this.packets.length > 1) {
      const seq_nums = Array.from(this.sequence_numbers).sort((a, b) => a - b);
      const min_seq = seq_nums[0];
      const max_seq = seq_nums[seq_nums.length - 1];
      this.expected_packets = max_seq - min_seq + 1;
    }
  }
  
  getMetrics(): RtpFlowMetrics {
    const received = this.packets.length;
    const expected = this.expected_packets || received;
    const lost = expected - received;
    const loss_percent = expected > 0 ? (lost / expected) * 100 : 0;
    
    // Calculate jitter
    const jitter = this.calculateJitter();
    
    // Get codec info
    const codec = this.packets[0]?.rtp?.payload_type;
    
    return {
      ssrc: this.ssrc,
      packet_count: received,
      expected_packets: expected,
      lost_packets: lost,
      loss_percent,
      jitter_ms: jitter,
      codec
    };
  }
  
  private calculateJitter(): number {
    if (this.packets.length < 2) return 0;
    
    const timestamps = this.packets.map(p => p.rtp!.timestamp);
    const diffs: number[] = [];
    
    for (let i = 1; i < timestamps.length; i++) {
      diffs.push(Math.abs(timestamps[i] - timestamps[i - 1]));
    }
    
    const mean = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    const variance = diffs.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / diffs.length;
    
    // Convert to milliseconds (assuming 8kHz audio)
    return Math.sqrt(variance) / 8;
  }
}

interface RtpFlowMetrics {
  ssrc: number;
  packet_count: number;
  expected_packets: number;
  lost_packets: number;
  loss_percent: number;
  jitter_ms: number;
  codec?: number;
}
```

---

## 2. SIP Parser Implementation

### Data Structures

```typescript
interface SipMessage {
  type: 'request' | 'response';
  
  // For requests
  method?: string;  // INVITE, ACK, BYE, CANCEL, REGISTER, OPTIONS
  request_uri?: string;
  
  // For responses
  status_code?: number;
  reason_phrase?: string;
  
  // Common headers
  headers: Map<string, string | string[]>;
  
  // Body (often SDP for INVITE)
  body?: string;
  content_type?: string;
  
  // Parsed values from common headers
  call_id?: string;
  from?: SipUri;
  to?: SipUri;
  cseq?: { sequence: number, method: string };
  via?: SipVia[];
  
  // SDP (for INVITE/200 OK)
  sdp?: SdpSession;
  
  raw: string;
}

interface SipUri {
  scheme: 'sip' | 'sips' | 'tel';
  user?: string;
  host: string;
  port?: number;
  parameters?: Map<string, string>;
  display_name?: string;
}

interface SipVia {
  protocol: string;  // SIP/2.0/UDP
  host: string;
  port?: number;
  branch?: string;
  received?: string;
  rport?: number;
}

interface SdpSession {
  version: number;
  origin: SdpOrigin;
  session_name: string;
  connection?: SdpConnection;
  media: SdpMedia[];
}

interface SdpOrigin {
  username: string;
  session_id: string;
  session_version: string;
  network_type: string;
  address_type: string;
  address: string;
}

interface SdpConnection {
  network_type: string;
  address_type: string;
  address: string;
}

interface SdpMedia {
  type: 'audio' | 'video' | 'application';
  port: number;
  protocol: string;
  formats: string[];
  rtpmap?: Map<string, RtpMap>;
  connection?: SdpConnection;
  attributes?: Map<string, string>;
}

interface RtpMap {
  encoding: string;
  clock_rate: number;
  parameters?: string;
}
```

### Parser Implementation

```typescript
class SipParser {
  parse(text: string): SipMessage | null {
    const lines = text.split('\r\n');
    if (lines.length === 0) return null;
    
    const first_line = lines[0];
    const message: SipMessage = {
      type: first_line.startsWith('SIP/') ? 'response' : 'request',
      headers: new Map(),
      raw: text
    };
    
    // Parse first line
    if (message.type === 'request') {
      const match = first_line.match(/^(\w+)\s+(.+?)\s+SIP\/2\.0$/);
      if (!match) return null;
      message.method = match[1];
      message.request_uri = match[2];
    } else {
      const match = first_line.match(/^SIP\/2\.0\s+(\d{3})\s+(.+)$/);
      if (!match) return null;
      message.status_code = parseInt(match[1]);
      message.reason_phrase = match[2];
    }
    
    // Parse headers
    let i = 1;
    let current_header: string | null = null;
    let current_value: string = '';
    
    for (; i < lines.length; i++) {
      const line = lines[i];
      
      // Empty line = end of headers
      if (line === '') {
        if (current_header) {
          this.addHeader(message, current_header, current_value);
        }
        i++;
        break;
      }
      
      // Continuation line (starts with space/tab)
      if (line[0] === ' ' || line[0] === '\t') {
        current_value += ' ' + line.trim();
        continue;
      }
      
      // New header
      if (current_header) {
        this.addHeader(message, current_header, current_value);
      }
      
      const colon = line.indexOf(':');
      if (colon > 0) {
        current_header = line.substring(0, colon).trim();
        current_value = line.substring(colon + 1).trim();
      }
    }
    
    // Parse body
    if (i < lines.length) {
      message.body = lines.slice(i).join('\r\n');
      
      const content_type = message.headers.get('content-type');
      if (typeof content_type === 'string') {
        message.content_type = content_type;
        
        if (content_type.includes('application/sdp')) {
          message.sdp = this.parseSdp(message.body);
        }
      }
    }
    
    // Parse common headers
    message.call_id = this.getHeader(message, 'call-id');
    message.from = this.parseSipUri(this.getHeader(message, 'from'));
    message.to = this.parseSipUri(this.getHeader(message, 'to'));
    message.cseq = this.parseCSeq(this.getHeader(message, 'cseq'));
    message.via = this.parseVia(message.headers.get('via'));
    
    return message;
  }
  
  private addHeader(message: SipMessage, name: string, value: string): void {
    const lower_name = name.toLowerCase();
    const existing = message.headers.get(lower_name);
    
    if (existing) {
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        message.headers.set(lower_name, [existing, value]);
      }
    } else {
      message.headers.set(lower_name, value);
    }
  }
  
  private getHeader(message: SipMessage, name: string): string | undefined {
    const value = message.headers.get(name.toLowerCase());
    if (Array.isArray(value)) return value[0];
    return value;
  }
  
  private parseSipUri(text?: string): SipUri | undefined {
    if (!text) return undefined;
    
    // Extract display name if present
    let display_name: string | undefined;
    let uri_part = text;
    
    const display_match = text.match(/^"?([^"<]+)"?\s*<(.+)>$/);
    if (display_match) {
      display_name = display_match[1].trim();
      uri_part = display_match[2];
    }
    
    // Parse URI
    const match = uri_part.match(/^(sips?|tel):(?:([^@]+)@)?([^:;]+)(?::(\d+))?(;.*)?$/);
    if (!match) return undefined;
    
    const uri: SipUri = {
      scheme: match[1] as 'sip' | 'sips' | 'tel',
      user: match[2],
      host: match[3],
      port: match[4] ? parseInt(match[4]) : undefined,
      display_name
    };
    
    // Parse parameters
    if (match[5]) {
      uri.parameters = new Map();
      const params = match[5].substring(1).split(';');
      for (const param of params) {
        const [key, value] = param.split('=');
        uri.parameters.set(key, value || '');
      }
    }
    
    return uri;
  }
  
  private parseCSeq(text?: string): { sequence: number, method: string } | undefined {
    if (!text) return undefined;
    const match = text.match(/^(\d+)\s+(\w+)$/);
    if (!match) return undefined;
    return {
      sequence: parseInt(match[1]),
      method: match[2]
    };
  }
  
  private parseVia(value?: string | string[]): SipVia[] | undefined {
    if (!value) return undefined;
    const values = Array.isArray(value) ? value : [value];
    
    return values.map(v => {
      const match = v.match(/^(SIP\/2\.0\/\w+)\s+([^:;]+)(?::(\d+))?(.*)$/);
      if (!match) return null;
      
      const via: SipVia = {
        protocol: match[1],
        host: match[2],
        port: match[3] ? parseInt(match[3]) : undefined
      };
      
      // Parse parameters
      if (match[4]) {
        const params = match[4].split(';').filter(p => p.trim());
        for (const param of params) {
          const [key, val] = param.split('=').map(s => s.trim());
          if (key === 'branch') via.branch = val;
          if (key === 'received') via.received = val;
          if (key === 'rport') via.rport = val ? parseInt(val) : undefined;
        }
      }
      
      return via;
    }).filter((v): v is SipVia => v !== null);
  }
  
  private parseSdp(text: string): SdpSession | undefined {
    const lines = text.split('\r\n').filter(l => l.length > 0);
    
    const session: Partial<SdpSession> = {
      media: []
    };
    
    let current_media: Partial<SdpMedia> | null = null;
    
    for (const line of lines) {
      const type = line[0];
      const value = line.substring(2);
      
      switch (type) {
        case 'v':
          session.version = parseInt(value);
          break;
          
        case 'o':
          const o_parts = value.split(' ');
          session.origin = {
            username: o_parts[0],
            session_id: o_parts[1],
            session_version: o_parts[2],
            network_type: o_parts[3],
            address_type: o_parts[4],
            address: o_parts[5]
          };
          break;
          
        case 's':
          session.session_name = value;
          break;
          
        case 'c':
          const c_parts = value.split(' ');
          const connection = {
            network_type: c_parts[0],
            address_type: c_parts[1],
            address: c_parts[2]
          };
          if (current_media) {
            current_media.connection = connection;
          } else {
            session.connection = connection;
          }
          break;
          
        case 'm':
          // Save previous media
          if (current_media && current_media.type) {
            session.media!.push(current_media as SdpMedia);
          }
          
          const m_parts = value.split(' ');
          current_media = {
            type: m_parts[0] as 'audio' | 'video' | 'application',
            port: parseInt(m_parts[1]),
            protocol: m_parts[2],
            formats: m_parts.slice(3),
            rtpmap: new Map(),
            attributes: new Map()
          };
          break;
          
        case 'a':
          if (!current_media) break;
          
          const [attr_name, attr_value] = value.split(':', 2);
          
          if (attr_name === 'rtpmap') {
            const rtpmap_match = attr_value.match(/^(\d+)\s+(.+?)\/(\d+)(?:\/(.+))?$/);
            if (rtpmap_match) {
              current_media.rtpmap!.set(rtpmap_match[1], {
                encoding: rtpmap_match[2],
                clock_rate: parseInt(rtpmap_match[3]),
                parameters: rtpmap_match[4]
              });
            }
          } else {
            current_media.attributes!.set(attr_name, attr_value || '');
          }
          break;
      }
    }
    
    // Save last media
    if (current_media && current_media.type) {
      session.media!.push(current_media as SdpMedia);
    }
    
    return session.version !== undefined ? session as SdpSession : undefined;
  }
}
```

---

## 3. XMPP Parser Implementation

### Library Selection

```json
{
  "dependencies": {
    "ltx": "^3.0.0",
    "sax": "^1.2.4"
  }
}
```

### Data Structures

```typescript
interface XmppStanza {
  type: 'message' | 'presence' | 'iq';
  id?: string;
  from?: string;
  to?: string;
  
  // Message-specific
  message_type?: 'chat' | 'groupchat' | 'headline' | 'normal' | 'error';
  body?: string;
  subject?: string;
  thread?: string;
  
  // Presence-specific
  presence_type?: 'available' | 'unavailable' | 'subscribe' | 'subscribed' | 'unsubscribe' | 'unsubscribed' | 'probe' | 'error';
  show?: 'away' | 'chat' | 'dnd' | 'xa';
  status?: string;
  priority?: number;
  
  // IQ-specific
  iq_type?: 'get' | 'set' | 'result' | 'error';
  
  // Child elements
  children: XmppElement[];
  
  // Error info
  error?: XmppError;
  
  raw: string;
  timestamp: number;
}

interface XmppElement {
  name: string;
  namespace?: string;
  attributes: Map<string, string>;
  text?: string;
  children: XmppElement[];
}

interface XmppError {
  type: 'auth' | 'cancel' | 'continue' | 'modify' | 'wait';
  condition: string;
  text?: string;
}

interface XmppStream {
  from?: string;
  to?: string;
  version?: string;
  xml_lang?: string;
  id?: string;
  stanzas: XmppStanza[];
}
```

### Parser Implementation

```typescript
import { Parser, Element } from 'ltx';

class XmppParser {
  private stream: XmppStream = { stanzas: [] };
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser();
    
    this.parser.on('startElement', (element: Element) => {
      if (element.name === 'stream:stream') {
        this.handleStreamStart(element);
      }
    });
    
    this.parser.on('element', (element: Element) => {
      const stanza = this.parseStanza(element);
      if (stanza) {
        this.stream.stanzas.push(stanza);
      }
    });
  }
  
  parse(xml: string): XmppStream {
    this.parser.write(xml);
    return this.stream;
  }
  
  parseFile(file_path: string): Promise<XmppStream> {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const stream = fs.createReadStream(file_path);
      
      stream.on('data', (chunk: Buffer) => {
        this.parser.write(chunk.toString());
      });
      
      stream.on('end', () => {
        resolve(this.stream);
      });
      
      stream.on('error', reject);
    });
  }
  
  private handleStreamStart(element: Element): void {
    this.stream.from = element.attrs.from;
    this.stream.to = element.attrs.to;
    this.stream.version = element.attrs.version;
    this.stream.xml_lang = element.attrs['xml:lang'];
    this.stream.id = element.attrs.id;
  }
  
  private parseStanza(element: Element): XmppStanza | null {
    const name = element.name;
    
    if (!['message', 'presence', 'iq'].includes(name)) {
      return null;
    }
    
    const stanza: XmppStanza = {
      type: name as 'message' | 'presence' | 'iq',
      id: element.attrs.id,
      from: element.attrs.from,
      to: element.attrs.to,
      children: [],
      raw: element.toString(),
      timestamp: Date.now() * 1000  // Microseconds
    };
    
    // Parse type-specific attributes
    if (name === 'message') {
      stanza.message_type = element.attrs.type || 'normal';
      stanza.body = element.getChildText('body');
      stanza.subject = element.getChildText('subject');
      stanza.thread = element.getChildText('thread');
    } else if (name === 'presence') {
      stanza.presence_type = element.attrs.type || 'available';
      stanza.show = element.getChildText('show') as any;
      stanza.status = element.getChildText('status');
      const priority = element.getChildText('priority');
      if (priority) stanza.priority = parseInt(priority);
    } else if (name === 'iq') {
      stanza.iq_type = element.attrs.type as any;
    }
    
    // Parse error
    const error_el = element.getChild('error');
    if (error_el) {
      stanza.error = this.parseError(error_el);
    }
    
    // Parse children
    for (const child of element.children) {
      if (typeof child === 'string') continue;
      const parsed = this.parseElement(child);
      if (parsed) stanza.children.push(parsed);
    }
    
    return stanza;
  }
  
  private parseElement(element: Element): XmppElement {
    const parsed: XmppElement = {
      name: element.name,
      namespace: element.getNS(),
      attributes: new Map(),
      children: []
    };
    
    // Parse attributes
    for (const [key, value] of Object.entries(element.attrs)) {
      parsed.attributes.set(key, value);
    }
    
    // Parse text content
    const text = element.getText();
    if (text) parsed.text = text;
    
    // Parse children
    for (const child of element.children) {
      if (typeof child === 'string') continue;
      parsed.children.push(this.parseElement(child));
    }
    
    return parsed;
  }
  
  private parseError(element: Element): XmppError {
    return {
      type: element.attrs.type as any,
      condition: element.children.find(c => typeof c !== 'string')?.name || 'undefined-condition',
      text: element.getChildText('text')
    };
  }
}
```

---

## 4. HAR Parser Implementation

### Data Structures

```typescript
interface HarFile {
  log: HarLog;
}

interface HarLog {
  version: string;
  creator: HarCreator;
  browser?: HarBrowser;
  pages?: HarPage[];
  entries: HarEntry[];
}

interface HarCreator {
  name: string;
  version: string;
}

interface HarBrowser {
  name: string;
  version: string;
}

interface HarPage {
  startedDateTime: string;
  id: string;
  title: string;
  pageTimings: HarPageTimings;
}

interface HarPageTimings {
  onContentLoad?: number;
  onLoad?: number;
}

interface HarEntry {
  pageref?: string;
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: HarCache;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  
  // WebSocket
  _webSocketMessages?: HarWebSocketMessage[];
}

interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  queryString: HarQueryParam[];
  postData?: HarPostData;
  headersSize: number;
  bodySize: number;
}

interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  cookies: HarCookie[];
  headers: HarHeader[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
}

interface HarHeader {
  name: string;
  value: string;
}

interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

interface HarQueryParam {
  name: string;
  value: string;
}

interface HarPostData {
  mimeType: string;
  params?: HarParam[];
  text?: string;
}

interface HarParam {
  name: string;
  value?: string;
  fileName?: string;
  contentType?: string;
}

interface HarContent {
  size: number;
  compression?: number;
  mimeType: string;
  text?: string;
  encoding?: string;
}

interface HarCache {
  beforeRequest?: HarCacheEntry;
  afterRequest?: HarCacheEntry;
}

interface HarCacheEntry {
  expires?: string;
  lastAccess: string;
  eTag: string;
  hitCount: number;
}

interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
}

interface HarWebSocketMessage {
  type: 'send' | 'receive';
  time: number;
  opcode: number;
  data: string;
}
```

### Parser Implementation

```typescript
import * as fs from 'fs';

class HarParser {
  parse(json: string): HarFile {
    const parsed = JSON.parse(json);
    
    // Validate HAR version
    if (!parsed.log || !parsed.log.version) {
      throw new Error('Invalid HAR file: missing log.version');
    }
    
    return parsed as HarFile;
  }
  
  parseFile(file_path: string): HarFile {
    const content = fs.readFileSync(file_path, 'utf-8');
    return this.parse(content);
  }
  
  getEntryTimeline(har: HarFile): TimelineEntry[] {
    return har.log.entries.map(entry => ({
      timestamp: new Date(entry.startedDateTime).getTime() * 1000,  // Microseconds
      url: entry.request.url,
      method: entry.request.method,
      status: entry.response.status,
      duration_ms: entry.time,
      timings: entry.timings
    }));
  }
  
  getSlowEntries(har: HarFile, threshold_ms: number = 2000): HarEntry[] {
    return har.log.entries.filter(entry => entry.time > threshold_ms);
  }
  
  getFailedEntries(har: HarFile): HarEntry[] {
    return har.log.entries.filter(entry => 
      entry.response.status >= 400 || entry.response.status === 0
    );
  }
  
  getApiCalls(har: HarFile, pattern: RegExp = /\/api\//): HarEntry[] {
    return har.log.entries.filter(entry => pattern.test(entry.request.url));
  }
  
  getWebSocketMessages(har: HarFile): Map<string, HarWebSocketMessage[]> {
    const messages = new Map<string, HarWebSocketMessage[]>();
    
    for (const entry of har.log.entries) {
      if (entry._webSocketMessages && entry._webSocketMessages.length > 0) {
        messages.set(entry.request.url, entry._webSocketMessages);
      }
    }
    
    return messages;
  }
  
  analyzePageLoad(har: HarFile, page_id?: string): PageLoadAnalysis {
    let entries: HarEntry[];
    
    if (page_id) {
      entries = har.log.entries.filter(e => e.pageref === page_id);
    } else {
      entries = har.log.entries;
    }
    
    const timings = entries.map(e => e.timings);
    
    return {
      total_requests: entries.length,
      total_time_ms: Math.max(...entries.map(e => 
        new Date(e.startedDateTime).getTime() + e.time
      )),
      avg_dns_ms: this.average(timings.map(t => t.dns).filter(isDefined)),
      avg_connect_ms: this.average(timings.map(t => t.connect).filter(isDefined)),
      avg_ssl_ms: this.average(timings.map(t => t.ssl).filter(isDefined)),
      avg_wait_ms: this.average(timings.map(t => t.wait)),
      avg_receive_ms: this.average(timings.map(t => t.receive)),
      total_size_bytes: entries.reduce((sum, e) => sum + e.response.content.size, 0),
      failed_requests: entries.filter(e => e.response.status >= 400).length
    };
  }
  
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

interface TimelineEntry {
  timestamp: number;
  url: string;
  method: string;
  status: number;
  duration_ms: number;
  timings: HarTimings;
}

interface PageLoadAnalysis {
  total_requests: number;
  total_time_ms: number;
  avg_dns_ms: number;
  avg_connect_ms: number;
  avg_ssl_ms: number;
  avg_wait_ms: number;
  avg_receive_ms: number;
  total_size_bytes: number;
  failed_requests: number;
}

function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}
```

---

## 5. Unified Protocol Event System

### Event Normalization

```typescript
interface ProtocolEvent {
  id: string;
  timestamp: number;  // Microseconds since epoch
  source_type: 'pcap' | 'sip' | 'xmpp' | 'har';
  source_file: string;
  
  protocol: string;  // TCP, UDP, SIP, XMPP, HTTP, RTP, RTCP
  event_type: string;  // connection_start, message_sent, packet_lost, etc.
  
  tier?: LogContext;
  
  // Common fields
  source_ip?: string;
  dest_ip?: string;
  source_port?: number;
  dest_port?: number;
  
  // Protocol-specific data
  data: any;
  
  // Correlation keys
  correlation_keys: Map<string, string>;
  
  // Extracted parameters (for pattern matching)
  extracted_params?: Map<string, any>;
  
  // Related events (populated by correlation engine)
  related_events?: string[];
}

class ProtocolEventNormalizer {
  normalizePcapPacket(packet: PcapPacket, source_file: string): ProtocolEvent[] {
    const events: ProtocolEvent[] = [];
    
    // TCP connection events
    if (packet.tcp) {
      if (packet.tcp.flags.syn && !packet.tcp.flags.ack) {
        events.push(this.createEvent({
          timestamp: packet.timestamp,
          source_type: 'pcap',
          source_file,
          protocol: 'TCP',
          event_type: 'connection_start',
          source_ip: packet.ip!.source_ip,
          dest_ip: packet.ip!.dest_ip,
          source_port: packet.tcp.source_port,
          dest_port: packet.tcp.dest_port,
          data: { syn: true },
          correlation_keys: new Map([
            ['flow', `${packet.ip!.source_ip}:${packet.tcp.source_port}-${packet.ip!.dest_ip}:${packet.tcp.dest_port}`]
          ])
        }));
      }
      
      if (packet.tcp.flags.fin) {
        events.push(this.createEvent({
          timestamp: packet.timestamp,
          source_type: 'pcap',
          source_file,
          protocol: 'TCP',
          event_type: 'connection_end',
          source_ip: packet.ip!.source_ip,
          dest_ip: packet.ip!.dest_ip,
          source_port: packet.tcp.source_port,
          dest_port: packet.tcp.dest_port,
          data: { fin: true },
          correlation_keys: new Map([
            ['flow', `${packet.ip!.source_ip}:${packet.tcp.source_port}-${packet.ip!.dest_ip}:${packet.tcp.dest_port}`]
          ])
        }));
      }
    }
    
    // SIP events
    if (packet.sip) {
      events.push(this.normalizeSipMessage(packet.sip, packet.timestamp, source_file));
    }
    
    // RTP events
    if (packet.rtp) {
      events.push(this.createEvent({
        timestamp: packet.timestamp,
        source_type: 'pcap',
        source_file,
        protocol: 'RTP',
        event_type: 'media_packet',
        source_ip: packet.ip!.source_ip,
        dest_ip: packet.ip!.dest_ip,
        source_port: packet.udp!.source_port,
        dest_port: packet.udp!.dest_port,
        data: packet.rtp,
        correlation_keys: new Map([
          ['ssrc', packet.rtp.ssrc.toString()]
        ])
      }));
    }
    
    return events;
  }
  
  normalizeSipMessage(message: SipMessage, timestamp: number, source_file: string): ProtocolEvent {
    const event_type = message.type === 'request' 
      ? `sip_${message.method!.toLowerCase()}`
      : `sip_response_${message.status_code}`;
    
    const correlation_keys = new Map<string, string>();
    if (message.call_id) correlation_keys.set('call_id', message.call_id);
    if (message.from?.user) correlation_keys.set('from_user', message.from.user);
    if (message.to?.user) correlation_keys.set('to_user', message.to.user);
    
    return this.createEvent({
      timestamp,
      source_type: 'sip',
      source_file,
      protocol: 'SIP',
      event_type,
      data: message,
      correlation_keys
    });
  }
  
  normalizeXmppStanza(stanza: XmppStanza, source_file: string): ProtocolEvent {
    const event_type = `xmpp_${stanza.type}`;
    
    const correlation_keys = new Map<string, string>();
    if (stanza.id) correlation_keys.set('stanza_id', stanza.id);
    if (stanza.from) correlation_keys.set('from_jid', stanza.from);
    if (stanza.to) correlation_keys.set('to_jid', stanza.to);
    if (stanza.thread) correlation_keys.set('thread_id', stanza.thread);
    
    return this.createEvent({
      timestamp: stanza.timestamp,
      source_type: 'xmpp',
      source_file,
      protocol: 'XMPP',
      event_type,
      data: stanza,
      correlation_keys
    });
  }
  
  normalizeHarEntry(entry: HarEntry, source_file: string): ProtocolEvent {
    const timestamp = new Date(entry.startedDateTime).getTime() * 1000;
    const event_type = `http_${entry.request.method.toLowerCase()}`;
    
    const correlation_keys = new Map<string, string>();
    correlation_keys.set('url', entry.request.url);
    
    // Extract session/tracking IDs from cookies or headers
    for (const cookie of entry.request.cookies) {
      if (cookie.name.toLowerCase().includes('session')) {
        correlation_keys.set('session_id', cookie.value);
      }
    }
    
    return this.createEvent({
      timestamp,
      source_type: 'har',
      source_file,
      protocol: 'HTTP',
      event_type,
      data: entry,
      correlation_keys
    });
  }
  
  private createEvent(params: Partial<ProtocolEvent> & { 
    timestamp: number, 
    source_type: ProtocolEvent['source_type'],
    protocol: string,
    event_type: string,
    source_file: string
  }): ProtocolEvent {
    return {
      id: this.generateEventId(),
      timestamp: params.timestamp,
      source_type: params.source_type,
      source_file: params.source_file,
      protocol: params.protocol,
      event_type: params.event_type,
      source_ip: params.source_ip,
      dest_ip: params.dest_ip,
      source_port: params.source_port,
      dest_port: params.dest_port,
      tier: params.tier,
      data: params.data || {},
      correlation_keys: params.correlation_keys || new Map()
    };
  }
  
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
```

---

## Summary

This implementation guide provides:

1. **PCAP Parser**: Full packet dissection with TCP/UDP/RTP/RTCP support
2. **SIP Parser**: Request/response parsing with SDP support
3. **XMPP Parser**: XML stanza parsing with stream management
4. **HAR Parser**: JSON-based HTTP archive analysis
5. **Event Normalization**: Unified event structure for all protocols

### Next Steps

1. Integrate parsers into LSP server
2. Extend pattern engine to handle protocol events
3. Build correlation engine for cross-source analysis
4. Create UI components for protocol visualization

**Status**: Implementation guide complete, ready for coding