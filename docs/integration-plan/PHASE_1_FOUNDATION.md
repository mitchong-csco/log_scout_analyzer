# Phase 1: Foundation - Detailed Implementation Guide

**Duration**: Week 1-2  
**Status**: Not Started  
**Dependencies**: None  

---

## Overview

Phase 1 establishes the foundational components for progressive normalization:
1. Normalized event schema (the "what" - standard data model)
2. Vendor format detection (the "who" - identify log sources)
3. Enhanced pattern override system (the "how" - extraction rules)

---

## Task 1.1: Create Normalized Event Schema

### Objective
Define a standard schema that all vendor log formats normalize to, enabling cross-vendor correlation and consistent pattern matching.

### File Structure
```
crates/core/src/
├── lib.rs (update exports)
├── normalized_event.rs (NEW)
└── tests/
    └── normalized_event_tests.rs (NEW)
```

### Implementation Steps

#### Step 1: Create Base Types

**File**: `crates/core/src/normalized_event.rs`

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Core normalized event structure - all vendors normalize to this
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedEvent {
    /// Event type identifier (e.g., "sip_invite", "sip_200_ok")
    pub event_type: String,
    
    /// When the event occurred (normalized from vendor timestamps)
    pub timestamp: DateTime<Utc>,
    
    /// SIP-specific message data (if this is a SIP event)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sip_message: Option<SIPMessage>,
    
    /// Network context (IPs, ports, protocol)
    pub network: NetworkContext,
    
    /// System context (hostname, component, etc.)
    pub system: SystemContext,
    
    /// Vendor information
    pub vendor: VendorInfo,
    
    /// Raw log data (for debugging/auditing)
    pub raw: RawData,
}

/// SIP message structure (RFC 3261)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SIPMessage {
    /// SIP method (INVITE, BYE, etc.) - present for requests
    pub method: Option<String>,
    
    /// SIP status code (200, 486, etc.) - present for responses
    pub status_code: Option<u16>,
    
    /// Status text ("OK", "Busy Here", etc.)
    pub status_text: Option<String>,
    
    /// SIP headers
    pub headers: SIPHeaders,
    
    /// SDP body (if present)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sdp: Option<SDPInfo>,
}

/// SIP headers (RFC 3261)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SIPHeaders {
    /// Call-ID header (unique identifier for call)
    pub call_id: Option<String>,
    
    /// From header
    pub from: Option<SIPAddress>,
    
    /// To header
    pub to: Option<SIPAddress>,
    
    /// Via headers (routing path)
    #[serde(default)]
    pub via: Vec<ViaHeader>,
    
    /// CSeq header (command sequence)
    pub cseq: Option<CSeq>,
    
    /// Contact header
    pub contact: Option<String>,
    
    /// Max-Forwards header
    pub max_forwards: Option<u32>,
    
    /// User-Agent or Server header
    pub user_agent: Option<String>,
    
    /// Other headers (vendor-specific or less common)
    #[serde(default)]
    pub other: HashMap<String, String>,
}

/// SIP address (from From/To headers)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SIPAddress {
    /// Display name (e.g., "John Doe")
    pub display_name: Option<String>,
    
    /// SIP URI (e.g., "john@example.com")
    pub uri: String,
    
    /// Tag parameter
    pub tag: Option<String>,
}

/// Via header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViaHeader {
    /// Protocol (SIP/2.0)
    pub protocol: String,
    
    /// Transport (UDP, TCP, TLS)
    pub transport: String,
    
    /// Host:port
    pub sent_by: String,
    
    /// Branch parameter
    pub branch: Option<String>,
}

/// CSeq header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CSeq {
    /// Sequence number
    pub sequence: u32,
    
    /// Method
    pub method: String,
}

/// SDP information (simplified)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SDPInfo {
    /// Connection address
    pub connection: Option<String>,
    
    /// Media descriptions
    pub media: Vec<MediaDescription>,
}

/// Media description in SDP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaDescription {
    /// Media type (audio, video)
    pub media_type: String,
    
    /// Port
    pub port: u16,
    
    /// Protocol (RTP/AVP, etc.)
    pub protocol: String,
    
    /// Codecs/formats
    pub formats: Vec<String>,
}

/// Network context
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NetworkContext {
    /// Source IP address
    pub source_ip: Option<String>,
    
    /// Source port
    pub source_port: Option<u16>,
    
    /// Destination IP address
    pub destination_ip: Option<String>,
    
    /// Destination port
    pub destination_port: Option<u16>,
    
    /// Protocol (UDP, TCP, TLS)
    pub protocol: Option<String>,
    
    /// Direction (from perspective of logging system)
    pub direction: Option<Direction>,
}

/// Traffic direction
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    Inbound,
    Outbound,
    Local,
    Unknown,
}

/// System context
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SystemContext {
    /// Hostname or node name
    pub hostname: Option<String>,
    
    /// Component/service name
    pub component: Option<String>,
    
    /// Log level (if detected)
    pub log_level: Option<String>,
    
    /// Process ID
    pub pid: Option<u32>,
    
    /// Thread ID
    pub thread_id: Option<String>,
}

/// Vendor information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorInfo {
    /// Vendor identifier (e.g., "cisco_cucm", "cisco_cube")
    pub vendor_type: String,
    
    /// Product name
    pub product: Option<String>,
    
    /// Product version
    pub version: Option<String>,
    
    /// Vendor-specific metadata (key-value pairs)
    #[serde(default)]
    pub metadata: HashMap<String, String>,
}

/// Raw log data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawData {
    /// Original log lines
    pub original_lines: Vec<String>,
    
    /// When this was extracted
    pub extracted_at: DateTime<Utc>,
    
    /// Original format identifier
    pub original_format: String,
}

impl Default for RawData {
    fn default() -> Self {
        Self {
            original_lines: Vec::new(),
            extracted_at: Utc::now(),
            original_format: String::from("unknown"),
        }
    }
}

/// Builder for constructing normalized events
pub struct NormalizedEventBuilder {
    event: NormalizedEvent,
}

impl NormalizedEventBuilder {
    pub fn new(event_type: impl Into<String>, vendor_type: impl Into<String>) -> Self {
        Self {
            event: NormalizedEvent {
                event_type: event_type.into(),
                timestamp: Utc::now(),
                sip_message: None,
                network: NetworkContext::default(),
                system: SystemContext::default(),
                vendor: VendorInfo {
                    vendor_type: vendor_type.into(),
                    product: None,
                    version: None,
                    metadata: HashMap::new(),
                },
                raw: RawData::default(),
            },
        }
    }
    
    pub fn timestamp(mut self, timestamp: DateTime<Utc>) -> Self {
        self.event.timestamp = timestamp;
        self
    }
    
    pub fn sip_message(mut self, sip_message: SIPMessage) -> Self {
        self.event.sip_message = Some(sip_message);
        self
    }
    
    pub fn network(mut self, network: NetworkContext) -> Self {
        self.event.network = network;
        self
    }
    
    pub fn system(mut self, system: SystemContext) -> Self {
        self.event.system = system;
        self
    }
    
    pub fn raw_lines(mut self, lines: Vec<String>) -> Self {
        self.event.raw.original_lines = lines;
        self
    }
    
    pub fn vendor_metadata(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.event.vendor.metadata.insert(key.into(), value.into());
        self
    }
    
    pub fn build(self) -> NormalizedEvent {
        self.event
    }
}
```

#### Step 2: Add Helper Methods

Continue in `normalized_event.rs`:

```rust
impl NormalizedEvent {
    /// Create a builder for this event type
    pub fn builder(event_type: impl Into<String>, vendor: impl Into<String>) -> NormalizedEventBuilder {
        NormalizedEventBuilder::new(event_type, vendor)
    }
    
    /// Get the Call-ID if this is a SIP event
    pub fn call_id(&self) -> Option<&str> {
        self.sip_message
            .as_ref()
            .and_then(|msg| msg.headers.call_id.as_deref())
    }
    
    /// Get source IP
    pub fn source_ip(&self) -> Option<&str> {
        self.network.source_ip.as_deref()
    }
    
    /// Get destination IP
    pub fn destination_ip(&self) -> Option<&str> {
        self.network.destination_ip.as_deref()
    }
    
    /// Check if this is a SIP request
    pub fn is_sip_request(&self) -> bool {
        self.sip_message
            .as_ref()
            .and_then(|msg| msg.method.as_ref())
            .is_some()
    }
    
    /// Check if this is a SIP response
    pub fn is_sip_response(&self) -> bool {
        self.sip_message
            .as_ref()
            .and_then(|msg| msg.status_code.as_ref())
            .is_some()
    }
    
    /// Get SIP method (if request)
    pub fn sip_method(&self) -> Option<&str> {
        self.sip_message
            .as_ref()
            .and_then(|msg| msg.method.as_deref())
    }
    
    /// Get SIP status code (if response)
    pub fn sip_status_code(&self) -> Option<u16> {
        self.sip_message
            .as_ref()
            .and_then(|msg| msg.status_code)
    }
}

impl SIPMessage {
    /// Check if this is a successful response (2xx)
    pub fn is_success(&self) -> bool {
        self.status_code
            .map(|code| code >= 200 && code < 300)
            .unwrap_or(false)
    }
    
    /// Check if this is a client error (4xx)
    pub fn is_client_error(&self) -> bool {
        self.status_code
            .map(|code| code >= 400 && code < 500)
            .unwrap_or(false)
    }
    
    /// Check if this is a server error (5xx)
    pub fn is_server_error(&self) -> bool {
        self.status_code
            .map(|code| code >= 500 && code < 600)
            .unwrap_or(false)
    }
}
```

#### Step 3: Create Tests

**File**: `crates/core/src/tests/normalized_event_tests.rs`

```rust
use super::*;
use chrono::Utc;

#[test]
fn test_normalized_event_builder() {
    let event = NormalizedEvent::builder("sip_invite", "cisco_cucm")
        .timestamp(Utc::now())
        .raw_lines(vec!["INVITE sip:test@example.com SIP/2.0".to_string()])
        .vendor_metadata("node", "cucm-pub")
        .build();
    
    assert_eq!(event.event_type, "sip_invite");
    assert_eq!(event.vendor.vendor_type, "cisco_cucm");
    assert_eq!(event.vendor.metadata.get("node"), Some(&"cucm-pub".to_string()));
}

#[test]
fn test_sip_message_with_call_id() {
    let sip_msg = SIPMessage {
        method: Some("INVITE".to_string()),
        status_code: None,
        status_text: None,
        headers: SIPHeaders {
            call_id: Some("abc123@example.com".to_string()),
            ..Default::default()
        },
        sdp: None,
    };
    
    let event = NormalizedEvent::builder("sip_invite", "test")
        .sip_message(sip_msg)
        .build();
    
    assert_eq!(event.call_id(), Some("abc123@example.com"));
    assert!(event.is_sip_request());
    assert!(!event.is_sip_response());
}

#[test]
fn test_network_context() {
    let network = NetworkContext {
        source_ip: Some("192.168.1.100".to_string()),
        source_port: Some(5060),
        destination_ip: Some("10.0.0.1".to_string()),
        destination_port: Some(5060),
        protocol: Some("UDP".to_string()),
        direction: Some(Direction::Inbound),
    };
    
    let event = NormalizedEvent::builder("sip_invite", "test")
        .network(network)
        .build();
    
    assert_eq!(event.source_ip(), Some("192.168.1.100"));
    assert_eq!(event.destination_ip(), Some("10.0.0.1"));
}

#[test]
fn test_sip_response_codes() {
    let success = SIPMessage {
        method: None,
        status_code: Some(200),
        status_text: Some("OK".to_string()),
        headers: SIPHeaders::default(),
        sdp: None,
    };
    
    assert!(success.is_success());
    assert!(!success.is_client_error());
    
    let client_error = SIPMessage {
        status_code: Some(486),
        ..success.clone()
    };
    
    assert!(!client_error.is_success());
    assert!(client_error.is_client_error());
}

#[test]
fn test_serialization() {
    let event = NormalizedEvent::builder("sip_invite", "test").build();
    
    let json = serde_json::to_string(&event).unwrap();
    let deserialized: NormalizedEvent = serde_json::from_str(&json).unwrap();
    
    assert_eq!(event.event_type, deserialized.event_type);
    assert_eq!(event.vendor.vendor_type, deserialized.vendor.vendor_type);
}
```

#### Step 4: Update Module Exports

**File**: `crates/core/src/lib.rs`

```rust
pub mod normalized_event;

pub use normalized_event::*;
```

### Testing Checklist

- [ ] All types compile without errors
- [ ] Builder pattern works correctly
- [ ] Helper methods return correct values
- [ ] Serialization/deserialization works
- [ ] Tests pass with `cargo test`
- [ ] Documentation is clear

### Deliverables

- [ ] `normalized_event.rs` implemented
- [ ] All tests passing
- [ ] Documentation comments added
- [ ] Examples in doc comments

---

## Task 1.2: Create Vendor Format Detection

### Objective
Automatically detect which vendor/product produced a log line based on signature patterns.

### File Structure
```
crates/pattern-engine/src/
├── vendor_detection.rs (NEW)
└── tests/
    └── vendor_detection_tests.rs (NEW)

config/
└── vendor_signatures.yaml (NEW)
```

### Implementation Steps

#### Step 1: Create Vendor Detection Module

**File**: `crates/pattern-engine/src/vendor_detection.rs`

```rust
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VendorDetectionError {
    #[error("Failed to compile regex: {0}")]
    RegexError(String),
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

/// Vendor signature configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorSignature {
    /// Unique vendor identifier (e.g., "cisco_cucm")
    pub vendor_id: String,
    
    /// Human-readable vendor name
    pub name: String,
    
    /// Signature patterns with weights
    pub signatures: Vec<SignaturePattern>,
    
    /// Minimum confidence required to match (0.0 - 1.0)
    pub confidence_threshold: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignaturePattern {
    /// Regex pattern to match
    pub pattern: String,
    
    /// Weight of this pattern (0.0 - 1.0)
    pub weight: f32,
    
    /// Description of what this pattern matches
    #[serde(default)]
    pub description: Option<String>,
}

/// Result of vendor detection
#[derive(Debug, Clone)]
pub struct VendorMatch {
    /// Vendor identifier
    pub vendor_id: String,
    
    /// Vendor name
    pub name: String,
    
    /// Confidence score (0.0 - 1.0)
    pub confidence: f32,
    
    /// Which patterns matched
    pub matched_patterns: Vec<String>,
}

/// Compiled vendor signature
struct CompiledVendorSignature {
    config: VendorSignature,
    compiled_patterns: Vec<(Regex, f32, String)>, // (regex, weight, description)
}

/// Vendor detector
pub struct VendorDetector {
    vendors: Vec<CompiledVendorSignature>,
}

impl VendorDetector {
    /// Create a new detector from configuration
    pub fn new(signatures: Vec<VendorSignature>) -> Result<Self, VendorDetectionError> {
        let mut vendors = Vec::new();
        
        for sig in signatures {
            let mut compiled_patterns = Vec::new();
            
            for pattern in &sig.signatures {
                let regex = Regex::new(&pattern.pattern)
                    .map_err(|e| VendorDetectionError::RegexError(format!("{}: {}", pattern.pattern, e)))?;
                
                compiled_patterns.push((
                    regex,
                    pattern.weight,
                    pattern.description.clone().unwrap_or_default(),
                ));
            }
            
            vendors.push(CompiledVendorSignature {
                config: sig,
                compiled_patterns,
            });
        }
        
        Ok(Self { vendors })
    }
    
    /// Detect vendor from log sample
    pub fn detect(&self, log_sample: &str) -> Option<VendorMatch> {
        let mut best_match: Option<VendorMatch> = None;
        let mut best_confidence = 0.0;
        
        for vendor in &self.vendors {
            let mut total_weight = 0.0;
            let mut matched_weight = 0.0;
            let mut matched = Vec::new();
            
            for (regex, weight, desc) in &vendor.compiled_patterns {
                total_weight += weight;
                
                if regex.is_match(log_sample) {
                    matched_weight += weight;
                    matched.push(desc.clone());
                }
            }
            
            let confidence = if total_weight > 0.0 {
                matched_weight / total_weight
            } else {
                0.0
            };
            
            if confidence >= vendor.config.confidence_threshold && confidence > best_confidence {
                best_confidence = confidence;
                best_match = Some(VendorMatch {
                    vendor_id: vendor.config.vendor_id.clone(),
                    name: vendor.config.name.clone(),
                    confidence,
                    matched_patterns: matched,
                });
            }
        }
        
        best_match
    }
    
    /// Quick heuristic detection (faster, less accurate)
    pub fn quick_detect(&self, log_sample: &str) -> Option<String> {
        // Simple string checks for common vendors
        if log_sample.contains("ccsipDisplayMsg") {
            return Some("cisco_cube".to_string());
        }
        if log_sample.contains("|SIPTcp|") || log_sample.contains("Cisco CallManager") {
            return Some("cisco_cucm".to_string());
        }
        if log_sample.contains("CSFClient[") {
            return Some("cisco_jabber".to_string());
        }
        if log_sample.contains("[CUC-") {
            return Some("cisco_cuc".to_string());
        }
        
        None
    }
    
    /// Get all supported vendor IDs
    pub fn supported_vendors(&self) -> Vec<String> {
        self.vendors.iter().map(|v| v.config.vendor_id.clone()).collect()
    }
}

/// Load vendor signatures from YAML
pub fn load_vendor_signatures(yaml_content: &str) -> Result<Vec<VendorSignature>, VendorDetectionError> {
    #[derive(Deserialize)]
    struct Config {
        vendors: HashMap<String, VendorConfig>,
    }
    
    #[derive(Deserialize)]
    struct VendorConfig {
        name: String,
        signatures: Vec<SignaturePattern>,
        confidence_threshold: f32,
    }
    
    let config: Config = serde_yaml::from_str(yaml_content)
        .map_err(|e| VendorDetectionError::ConfigError(e.to_string()))?;
    
    let mut signatures = Vec::new();
    
    for (vendor_id, vendor_config) in config.vendors {
        signatures.push(VendorSignature {
            vendor_id,
            name: vendor_config.name,
            signatures: vendor_config.signatures,
            confidence_threshold: vendor_config.confidence_threshold,
        });
    }
    
    Ok(signatures)
}
```

#### Step 2: Create Configuration File

**File**: `config/vendor_signatures.yaml`

```yaml
# Vendor signature patterns for automatic detection
# Each vendor has multiple signature patterns with weights

vendors:
  cisco_cube:
    name: "Cisco IOS/CUBE Gateway"
    confidence_threshold: 0.7
    
    signatures:
      - pattern: "ccsipDisplayMsg:"
        weight: 0.9
        description: "CUBE SIP message display marker"
      
      - pattern: "/SIP/Msg/"
        weight: 0.8
        description: "CUBE SIP message path"
      
      - pattern: '\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\.\d{3}\s+\w+:'
        weight: 0.6
        description: "IOS timestamp format"
      
      - pattern: "//\\d+/\\d+/SIP"
        weight: 0.7
        description: "CUBE call identifier format"
  
  cisco_cucm:
    name: "Cisco Unified Call Manager"
    confidence_threshold: 0.8
    
    signatures:
      - pattern: '\|SIPTcp\|'
        weight: 0.95
        description: "CUCM SIP TCP protocol marker"
      
      - pattern: '\|SIPUdp\|'
        weight: 0.95
        description: "CUCM SIP UDP protocol marker"
      
      - pattern: '\|AppId=Cisco CallManager\|'
        weight: 0.9
        description: "CUCM application identifier"
      
      - pattern: '\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3}'
        weight: 0.6
        description: "CUCM timestamp format"
      
      - pattern: '\|LocalAddr=[\d\.]+:\d+\|'
        weight: 0.7
        description: "CUCM local address metadata"
      
      - pattern: '\|RemoteAddr=[\d\.]+:\d+\|'
        weight: 0.7
        description: "CUCM remote address metadata"
  
  cisco_jabber:
    name: "Cisco Jabber Client"
    confidence_threshold: 0.75
    
    signatures:
      - pattern: 'CSFClient\['
        weight: 0.9
        description: "Jabber client process identifier"
      
      - pattern: '\|SIP_MSG_RECV\|'
        weight: 0.85
        description: "Jabber SIP message received marker"
      
      - pattern: '\|SIP_MSG_SENT\|'
        weight: 0.85
        description: "Jabber SIP message sent marker"
      
      - pattern: '<\d+>\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}'
        weight: 0.5
        description: "Syslog-style timestamp"
      
      - pattern: 'Direction:\s+(Incoming|Outgoing)'
        weight: 0.7
        description: "Jabber direction metadata"
  
  cisco_cuc:
    name: "Cisco Unity Connection"
    confidence_threshold: 0.8
    
    signatures:
      - pattern: '\[CUC-'
        weight: 0.95
        description: "CUC log marker"
      
      - pattern: 'SIP\.Stack'
        weight: 0.8
        description: "CUC SIP stack component"
      
      - pattern: '\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}'
        weight: 0.7
        description: "ISO 8601 timestamp with timezone"
      
      - pattern: '>>> (Incoming|Outgoing) INVITE'
        weight: 0.75
        description: "CUC SIP message marker"
      
      - pattern: 'Call-ID:\s*vm-'
        weight: 0.8
        description: "CUC voicemail Call-ID prefix"
  
  cisco_cup_proxy:
    name: "Cisco Unified Presence / SIP Proxy"
    confidence_threshold: 0.75
    
    signatures:
      - pattern: 'Proxy-SIP'
        weight: 0.9
        description: "CUP SIP proxy marker"
      
      - pattern: 'CUP-'
        weight: 0.85
        description: "CUP component identifier"
      
      - pattern: '\[PROXY\]'
        weight: 0.8
        description: "Proxy component marker"
```

#### Step 3: Create Tests

**File**: `crates/pattern-engine/src/tests/vendor_detection_tests.rs`

```rust
use super::vendor_detection::*;

const TEST_CONFIG: &str = r#"
vendors:
  test_vendor_a:
    name: "Test Vendor A"
    confidence_threshold: 0.7
    signatures:
      - pattern: "VENDOR_A:"
        weight: 0.9
      - pattern: "Product A v\\d+"
        weight: 0.8
  
  test_vendor_b:
    name: "Test Vendor B"
    confidence_threshold: 0.6
    signatures:
      - pattern: "\\[VENDOR_B\\]"
        weight: 1.0
"#;

#[test]
fn test_load_vendor_signatures() {
    let signatures = load_vendor_signatures(TEST_CONFIG).unwrap();
    assert_eq!(signatures.len(), 2);
    
    let vendor_a = signatures.iter().find(|s| s.vendor_id == "test_vendor_a").unwrap();
    assert_eq!(vendor_a.name, "Test Vendor A");
    assert_eq!(vendor_a.signatures.len(), 2);
}

#[test]
fn test_vendor_detection() {
    let signatures = load_vendor_signatures(TEST_CONFIG).unwrap();
    let detector = VendorDetector::new(signatures).unwrap();
    
    let log = "VENDOR_A: Something happened Product A v1.0";
    let result = detector.detect(log);
    
    assert!(result.is_some());
    let vendor_match = result.unwrap();
    assert_eq!(vendor_match.vendor_id, "test_vendor_a");
    assert!(vendor_match.confidence >= 0.7);
}

#[test]
fn test_no_match() {
    let signatures = load_vendor_signatures(TEST_CONFIG).unwrap();
    let detector = VendorDetector::new(signatures).unwrap();
    
    let log = "Unknown vendor log line";
    let result = detector.detect(log);
    
    assert!(result.is_none());
}

#[test]
fn test_confidence_scoring() {
    let signatures = load_vendor_signatures(TEST_CONFIG).unwrap();
    let detector = VendorDetector::new(signatures).unwrap();
    
    // Only one pattern matches (0.9 weight out of 1.7 total)
    let log_partial = "VENDOR_A: Something";
    let result = detector.detect(log_partial);
    assert!(result.is_some());
    let match_partial = result.unwrap();
    
    // Both patterns match (1.7 weight out of 1.7 total)
    let log_full = "VENDOR_A: Something Product A v1.0";
    let result = detector.detect(log_full);
    assert!(result.is_some());
    let match_full = result.unwrap();
    
    // Full match should have higher confidence
    assert!(match_full.confidence > match_partial.confidence);
}

#[test]
fn test_quick_detect() {
    let signatures = load_vendor_signatures(TEST_CONFIG).unwrap();
    let detector = VendorDetector::new(signatures).unwrap();
    
    // Test known shortcuts
    assert_eq!(detector.quick_detect("ccsipDisplayMsg: test"), Some("cisco_cube".to_string()));
    assert_eq!(detector.quick_detect("|SIPTcp| test"), Some("cisco_cucm".to_string()));
    assert_eq!(detector.quick_detect("CSFClient[123]: test"), Some("cisco_jabber".to_string()));
    assert_eq!(detector.quick_detect("[CUC-123] test"), Some("cisco_cuc".to_string()));
}
```

### Testing Checklist

- [ ] Vendor signatures load from YAML
- [ ] Detection works with test vendors
- [ ] Confidence scoring is correct
- [ ] Quick detection provides fast heuristics
- [ ] Real vendor logs are detected correctly
- [ ] Performance is acceptable (<5ms per detection)

### Deliverables

- [ ] `vendor_detection.rs` implemented
- [ ] `vendor_signatures.yaml` with 5 vendors
- [ ] All tests passing
- [ ] Performance benchmarks documented

---

## Task 1.3: Enhance Pattern Override System

### Objective
Extend the existing override system to support extraction rules for raw, normalized, and vendor-specific scenarios.

### File Structure
```
crates/pattern-loader/src/
├── override_manager.rs (ENHANCE EXISTING)
└── tests/
    └── override_tests.rs (ADD TESTS)

patterns/
├── base/ (NEW)
│   └── sip_invite.yaml (EXAMPLE)
├── overrides/ (NEW)
    ├── raw/
    │   └── sip_invite.yaml (EXAMPLE)
    ├── normalized/
    │   └── sip_invite.yaml (EXAMPLE)
    └── vendors/
        └── cisco_cucm/
            └── sip_invite.yaml (EXAMPLE)
```

### Implementation Steps

#### Step 1: Extend Override Types

**File**: `crates/pattern-loader/src/override_manager.rs`

Add these types to the existing file:

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ... existing PatternOverride struct ...

// ADD THESE NEW TYPES:

/// Type of pattern override
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OverrideType {
    /// General override (existing functionality)
    General,
    
    /// Raw log extraction rules
    ExtractionRaw,
    
    /// Normalized event extraction rules
    ExtractionNormalized,
    
    /// Vendor-specific customizations
    VendorSpecific,
}

/// Extraction configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionOverride {
    /// Extraction mode
    pub mode: ExtractionMode,
    
    /// Quick match pattern (for performance)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quick_match: Option<QuickMatch>,
    
    /// Field extraction rules
    pub fields: HashMap<String, FieldExtraction>,
    
    /// Context extraction (for vendor-specific metadata)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<HashMap<String, ContextExtraction>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExtractionMode {
    RawRegex,
    NormalizedPath,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickMatch {
    pub pattern: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldExtraction {
    /// Regex pattern for raw extraction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    
    /// Regex capture group number(s)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<GroupSelector>,
    
    /// JSON path for normalized extraction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    
    /// Extract from context instead
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    
    /// Context key to extract
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    
    /// Transformations to apply
    #[serde(default)]
    pub transform: Vec<Transform>,
    
    /// Whether this field is optional
    #[serde(default)]
    pub optional: bool,
    
    /// Inherit from parent override
    #[serde(default)]
    pub inherit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GroupSelector {
    Single(usize),
    Multiple(Vec<usize>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextExtraction {
    pub pattern: String,
    pub parse: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Transform {
    RemovePrefix { prefix: String },
    RemoveSuffix { suffix: String },
    ToLowercase,
    ToUppercase,
    Trim,
    Replace { from: String, to: String },
}

/// Condition for when to apply override
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverrideCondition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor_detected: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format_match: Option<String>,
}

// UPDATE PatternOverride struct:
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternOverride {
    pub id: String,
    
    // NEW: Base pattern to extend
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extends: Option<String>,
    
    // NEW: Which override to extend (for chaining)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extends_override: Option<String>,
    
    // NEW: Type of override
    #[serde(default)]
    pub override_type: OverrideType,
    
    // NEW: Vendor identifier (for vendor-specific overrides)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vendor: Option<String>,
    
    // Existing fields
    pub enabled: Option<bool>,
    pub severity_override: Option<String>,
    pub annotation_override: Option<String>,
    
    // NEW: Extraction rules
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extraction: Option<ExtractionOverride>,
    
    // NEW: Conditions for applying this override
    #[serde(skip_serializing_if = "Option::is_none")]
    pub apply_when: Option<OverrideCondition>,
}

impl Default for OverrideType {
    fn default() -> Self {
        OverrideType::General
    }
}
```

#### Step 2: Add Override Resolution Logic

Continue in `override_manager.rs`:

```rust
/// Context for resolving pattern overrides
pub struct ResolutionContext {
    pub vendor: Option<String>,
    pub format: Option<String>,
}

impl PatternOverrideManager {
    // ... existing methods ...
    
    /// Resolve a pattern with all applicable overrides
    pub fn resolve_pattern(
        &self,
        pattern_id: &str,
        context: &ResolutionContext,
    ) -> Option<ResolvedPattern> {
        // Find base override
        let base = self.overrides.get(pattern_id)?;
        
        let mut resolved = ResolvedPattern {
            id: pattern_id.to_string(),
            extraction_mode: None,
            fields: HashMap::new(),
            vendor_metadata: HashMap::new(),
        };
        
        // Apply base override
        self.apply_override(&mut resolved, base);
        
        // Find and apply extraction mode override (raw or normalized)
        if let Some(extraction_override) = self.find_extraction_override(pattern_id) {
            self.apply_override(&mut resolved, extraction_override);
        }
        
        // Find and apply vendor-specific override (if applicable)
        if let Some(vendor_id) = &context.vendor {
            if let Some(vendor_override) = self.find_vendor_override(pattern_id, vendor_id) {
                // Check if conditions are met
                if self.should_apply_vendor_override(vendor_override, context) {
                    self.apply_override(&mut resolved, vendor_override);
                }
            }
        }
        
        Some(resolved)
    }
    
    fn find_extraction_override(&self, pattern_id: &str) -> Option<&PatternOverride> {
        // Look for raw or normalized extraction overrides
        // In practice, you'd search through loaded overrides
        None // Placeholder
    }
    
    fn find_vendor_override(&self, pattern_id: &str, vendor_id: &str) -> Option<&PatternOverride> {
        // Look for vendor-specific overrides
        None // Placeholder
    }
    
    fn should_apply_vendor_override(
        &self,
        override_data: &PatternOverride,
        context: &ResolutionContext,
    ) -> bool {
        if let Some(condition) = &override_data.apply_when {
            if let Some(required_vendor) = &condition.vendor_detected {
                if context.vendor.as_ref() != Some(required_vendor) {
                    return false;
                }
            }
        }
        true
    }
    
    fn apply_override(&self, resolved: &mut ResolvedPattern, override_data: &PatternOverride) {
        if let Some(extraction) = &override_data.extraction {
            resolved.extraction_mode = Some(extraction.mode.clone());
            
            for (field_name, field_extraction) in &extraction.fields {
                if field_extraction.inherit {
                    // Keep existing value
                    continue;
                }
                
                resolved.fields.insert(field_name.clone(), field_extraction.clone());
            }
        }
    }
}

/// Resolved pattern with all overrides applied
pub struct ResolvedPattern {
    pub id: String,
    pub extraction_mode: Option<ExtractionMode>,
    pub fields: HashMap<String, FieldExtraction>,
    pub vendor_metadata: HashMap<String, String>,
}
```

#### Step 3: Create Example Pattern Files

**File**: `patterns/base/sip_invite.yaml`

```yaml
pattern_name: "sip_invite"
namespace: "sip"
description: "Detects SIP INVITE messages (RFC 3261)"

signature:
  event_type: "sip_invite"
  method: "INVITE"

extract:
  - field: "call_id"
    description: "Unique call identifier"
    type: "string"
    required: true
  
  - field: "from_uri"
    description: "Caller SIP URI"
    type: "string"
    required: true
  
  - field: "to_uri"
    description: "Callee SIP URI"
    type: "string"
    required: true
  
  - field: "source_ip"
    description: "Source IP address"
    type: "string"
    required: false
  
  - field: "destination_ip"
    description: "Destination IP address"
    type: "string"
    required: false

normalization:
  strategy: "adaptive"
  trigger: "on_multi_vendor"
```

**File**: `patterns/overrides/raw/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
override_type: "extraction_raw"

extraction:
  mode: "raw_regex"
  
  quick_match:
    pattern: "INVITE sip:"
    confidence: 0.9
  
  fields:
    call_id:
      pattern: "Call-ID:\\s*([^\\r\\n]+)"
      group: 1
      optional: false
    
    from_uri:
      pattern: "From:.*?<sip:([^>]+)>"
      group: 1
      optional: false
    
    to_uri:
      pattern: "To:.*?<sip:([^>]+)>"
      group: 1
      optional: false
    
    source_ip:
      pattern: "Via:.*?([0-9.]+):\\d+"
      group: 1
      optional: true
    
    destination_ip:
      pattern: "INVITE sip:[^@]*@([0-9.]+)"
      group: 1
      optional: true
```

**File**: `patterns/overrides/vendors/cisco_cucm/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
extends_override: "raw.sip_invite"
override_type: "vendor_specific"
vendor: "cisco_cucm"

extraction:
  mode: "raw_regex"
  
  context:
    metadata_section:
      pattern: "\\|(.+?)\\|"
      parse: "pipe_delimited"
  
  fields:
    # Inherit standard fields
    call_id:
      inherit: true
    
    from_uri:
      inherit: true
    
    to_uri:
      inherit: true
    
    # CUCM-specific: better IP extraction from metadata
    source_ip:
      source: "context.metadata_section"
      key: "RemoteAddr"
      pattern: "RemoteAddr=([0-9.]+):\\d+"
      group: 1
      optional: true
    
    destination_ip:
      source: "context.metadata_section"
      key: "LocalAddr"
      pattern: "LocalAddr=([0-9.]+):\\d+"
      group: 1
      optional: true

apply_when:
  vendor_detected: "cisco_cucm"
```

### Testing Checklist

- [ ] Override types load correctly
- [ ] Override chaining works (extends, extends_override)
- [ ] Vendor-specific overrides apply conditionally
- [ ] Field inheritance works
- [ ] Transforms apply correctly
- [ ] Example patterns load and validate

### Deliverables

- [ ] Enhanced `override_manager.rs`
- [ ] Example base patterns (3+)
- [ ] Example raw overrides (3+)
- [ ] Example vendor overrides (2+ vendors)
- [ ] All tests passing
- [ ] Documentation updated

---

## Phase 1 Completion Criteria

### Code Quality
- [ ] All Rust code compiles without warnings
- [ ] Unit test coverage >= 80%
- [ ] All tests pass
- [ ] Documentation comments on all public items
- [ ] No clippy warnings

### Functionality
- [ ] Normalized event schema complete
- [ ] Vendor detection works for 4+ vendors
- [ ] Pattern overrides support all modes
- [ ] Examples demonstrate all features

### Documentation
- [ ] Architecture documented
- [ ] API documentation complete
- [ ] Examples provided
- [ ] Integration guide started

### Performance
- [ ] Vendor detection < 5ms
- [ ] Schema serialization < 1ms
- [ ] Override resolution < 10ms

---

## Dependencies for Phase 2

Once Phase 1 is complete, you'll need:
- Normalized event schema (from Task 1.1)
- Vendor detector (from Task 1.2)
- Enhanced overrides (from Task 1.3)

These provide the foundation for:
- Vendor normalizers (will normalize to schema)
- Progressive pipeline (will use vendor detection)
- Pattern matching (will use overrides)

---

## Troubleshooting

### Common Issues

**Issue**: Regex compilation errors
**Solution**: Test regex patterns at https://regex101.com before adding to config

**Issue**: Vendor detection false positives
**Solution**: Increase confidence threshold or add more specific patterns

**Issue**: Override chaining not working
**Solution**: Check `extends` and `extends_override` references are correct

---

## Next Phase

After Phase 1 completion, proceed to **Phase 2: Normalization Pipeline** which will:
- Create vendor-specific normalizers
- Build progressive processing pipeline
- Implement learning system

**Expected Start**: Week 3