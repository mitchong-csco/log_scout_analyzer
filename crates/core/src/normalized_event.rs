//! Normalized Event Schema for Multi-Vendor Log Analysis
//!
//! This module defines the standard schema that all vendor-specific log formats
//! normalize to, enabling cross-vendor correlation and unified analysis.
//!
//! # Architecture
//!
//! The normalization system uses a progressive approach:
//! 1. Raw logs are initially matched with vendor-specific patterns
//! 2. When multi-vendor scenarios are detected, logs are normalized
//! 3. Normalized events enable correlation across different systems
//!
//! # Example
//!
//! ```rust
//! use log_scout_analyzer_core::normalized_event::{NormalizedEvent, SIPMessage};
//! use chrono::Utc;
//!
//! let event = NormalizedEvent::builder()
//!     .event_type("sip_invite")
//!     .timestamp(Utc::now())
//!     .build();
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Core normalized event structure
///
/// This is the universal format that all vendor-specific logs normalize to.
/// It contains common fields that are present across different vendors,
/// enabling unified analysis and correlation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NormalizedEvent {
    /// Type of event (e.g., "sip_invite", "sip_200_ok", "authentication_failure")
    pub event_type: String,

    /// Timestamp when the event occurred
    pub timestamp: DateTime<Utc>,

    /// SIP-specific message data (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sip_message: Option<SIPMessage>,

    /// Network context (IPs, ports, protocols)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<NetworkContext>,

    /// System context (host, process, thread)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<SystemContext>,

    /// Vendor and product information
    pub vendor: VendorInfo,

    /// Raw log data (preserved for reference)
    pub raw: RawData,

    /// Additional extracted fields (vendor-specific or custom)
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,

    /// Correlation identifiers for linking related events
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub correlation_ids: Vec<CorrelationId>,
}

/// SIP protocol message information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SIPMessage {
    /// SIP method (INVITE, ACK, BYE, etc.) for requests
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,

    /// Status code (100-699) for responses
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_code: Option<u16>,

    /// Status text (e.g., "OK", "Not Found")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status_text: Option<String>,

    /// SIP headers
    pub headers: SIPHeaders,

    /// SDP (Session Description Protocol) body if present
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sdp: Option<SDPInfo>,

    /// Message direction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<Direction>,
}

/// Common SIP headers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct SIPHeaders {
    /// Call-ID header (unique identifier for the call)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub call_id: Option<String>,

    /// From header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<SIPAddress>,

    /// To header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub to: Option<SIPAddress>,

    /// Via headers (routing path)
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub via: Vec<ViaHeader>,

    /// CSeq header (command sequence)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cseq: Option<CSeq>,

    /// Contact header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contact: Option<String>,

    /// Route headers
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub route: Vec<String>,

    /// Record-Route headers
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub record_route: Vec<String>,

    /// Content-Type header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,

    /// Content-Length header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content_length: Option<usize>,

    /// User-Agent or Server header
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_agent: Option<String>,

    /// Additional headers not in common set
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub other: HashMap<String, String>,
}

/// SIP address (URI with optional display name and parameters)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SIPAddress {
    /// Display name (e.g., "John Doe")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,

    /// SIP URI (e.g., "sip:john@example.com")
    pub uri: String,

    /// Tag parameter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag: Option<String>,

    /// Additional parameters
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub parameters: HashMap<String, String>,
}

/// Via header information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ViaHeader {
    /// Protocol (e.g., "SIP/2.0/UDP")
    pub protocol: String,

    /// Host
    pub host: String,

    /// Port
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<u16>,

    /// Branch parameter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branch: Option<String>,

    /// Received parameter (actual source IP)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub received: Option<String>,

    /// Rport parameter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rport: Option<u16>,

    /// Additional parameters
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub parameters: HashMap<String, String>,
}

/// CSeq (Command Sequence) header
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CSeq {
    /// Sequence number
    pub number: u32,

    /// Method (INVITE, BYE, etc.)
    pub method: String,
}

/// SDP (Session Description Protocol) information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SDPInfo {
    /// Media descriptions
    pub media: Vec<MediaDescription>,

    /// Connection information
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection: Option<String>,

    /// Session name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_name: Option<String>,

    /// Attributes
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub attributes: HashMap<String, String>,
}

/// Media description in SDP
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MediaDescription {
    /// Media type (audio, video)
    pub media_type: String,

    /// Port number
    pub port: u16,

    /// Protocol (RTP/AVP, etc.)
    pub protocol: String,

    /// Codecs/formats
    pub formats: Vec<String>,

    /// Attributes
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub attributes: HashMap<String, String>,
}

/// Network context information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NetworkContext {
    /// Source IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_ip: Option<String>,

    /// Source port
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_port: Option<u16>,

    /// Destination IP address
    #[serde(skip_serializing_if = "Option::is_none")]
    pub destination_ip: Option<String>,

    /// Destination port
    #[serde(skip_serializing_if = "Option::is_none")]
    pub destination_port: Option<u16>,

    /// Protocol (TCP, UDP, TLS)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<String>,

    /// Interface name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interface: Option<String>,

    /// Message direction
    #[serde(skip_serializing_if = "Option::is_none")]
    pub direction: Option<Direction>,
}

/// Message direction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    /// Incoming/received message
    Inbound,
    /// Outgoing/sent message
    Outbound,
    /// Direction unknown
    Unknown,
}

/// System context information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SystemContext {
    /// Hostname
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,

    /// Process ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,

    /// Thread ID
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thread_id: Option<String>,

    /// Component/module name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub component: Option<String>,

    /// Log level
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_level: Option<String>,
}

/// Vendor and product information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VendorInfo {
    /// Vendor identifier (e.g., "cisco_cube", "cisco_cucm")
    pub vendor_type: String,

    /// Product name
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product: Option<String>,

    /// Version string
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,

    /// Detection confidence (0.0-1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f32>,

    /// Additional vendor-specific metadata
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,
}

/// Raw log data (preserved)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RawData {
    /// Original log line
    pub line: String,

    /// Line number in source file
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line_number: Option<usize>,

    /// Source file path
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,

    /// Original format identifier
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
}

/// Correlation identifier for linking related events
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CorrelationId {
    /// Type of correlation (e.g., "call_id", "session_id", "transaction_id")
    pub id_type: String,

    /// Correlation value
    pub value: String,

    /// Scope of correlation (e.g., "global", "vendor", "system")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

/// Builder for NormalizedEvent
#[derive(Debug, Default)]
pub struct NormalizedEventBuilder {
    event_type: Option<String>,
    timestamp: Option<DateTime<Utc>>,
    sip_message: Option<SIPMessage>,
    network: Option<NetworkContext>,
    system: Option<SystemContext>,
    vendor: Option<VendorInfo>,
    raw: Option<RawData>,
    metadata: HashMap<String, String>,
    correlation_ids: Vec<CorrelationId>,
}

impl NormalizedEvent {
    /// Create a new builder
    pub fn builder() -> NormalizedEventBuilder {
        NormalizedEventBuilder::default()
    }

    /// Get Call-ID if this is a SIP event
    pub fn call_id(&self) -> Option<&str> {
        self.sip_message
            .as_ref()
            .and_then(|sip| sip.headers.call_id.as_deref())
    }

    /// Add a correlation ID
    pub fn add_correlation_id(&mut self, id_type: String, value: String) {
        self.correlation_ids.push(CorrelationId {
            id_type,
            value,
            scope: None,
        });
    }

    /// Get correlation IDs of a specific type
    pub fn get_correlation_ids(&self, id_type: &str) -> Vec<&str> {
        self.correlation_ids
            .iter()
            .filter(|cid| cid.id_type == id_type)
            .map(|cid| cid.value.as_str())
            .collect()
    }
}

impl NormalizedEventBuilder {
    pub fn event_type(mut self, event_type: impl Into<String>) -> Self {
        self.event_type = Some(event_type.into());
        self
    }

    pub fn timestamp(mut self, timestamp: DateTime<Utc>) -> Self {
        self.timestamp = Some(timestamp);
        self
    }

    pub fn sip_message(mut self, sip_message: SIPMessage) -> Self {
        self.sip_message = Some(sip_message);
        self
    }

    pub fn network(mut self, network: NetworkContext) -> Self {
        self.network = Some(network);
        self
    }

    pub fn system(mut self, system: SystemContext) -> Self {
        self.system = Some(system);
        self
    }

    pub fn vendor(mut self, vendor: VendorInfo) -> Self {
        self.vendor = Some(vendor);
        self
    }

    pub fn raw(mut self, raw: RawData) -> Self {
        self.raw = Some(raw);
        self
    }

    pub fn metadata(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }

    pub fn correlation_id(mut self, id_type: impl Into<String>, value: impl Into<String>) -> Self {
        self.correlation_ids.push(CorrelationId {
            id_type: id_type.into(),
            value: value.into(),
            scope: None,
        });
        self
    }

    pub fn build(self) -> Result<NormalizedEvent, String> {
        let event_type = self.event_type.ok_or("event_type is required")?;
        let timestamp = self.timestamp.ok_or("timestamp is required")?;
        let vendor = self.vendor.ok_or("vendor is required")?;
        let raw = self.raw.ok_or("raw data is required")?;

        Ok(NormalizedEvent {
            event_type,
            timestamp,
            sip_message: self.sip_message,
            network: self.network,
            system: self.system,
            vendor,
            raw,
            metadata: self.metadata,
            correlation_ids: self.correlation_ids,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builder_minimal() {
        let event = NormalizedEvent::builder()
            .event_type("test_event")
            .timestamp(Utc::now())
            .vendor(VendorInfo {
                vendor_type: "test_vendor".to_string(),
                product: None,
                version: None,
                confidence: None,
                metadata: HashMap::new(),
            })
            .raw(RawData {
                line: "test log line".to_string(),
                line_number: Some(1),
                file_path: None,
                format: None,
            })
            .build();

        assert!(event.is_ok());
        let event = event.unwrap();
        assert_eq!(event.event_type, "test_event");
        assert_eq!(event.vendor.vendor_type, "test_vendor");
    }

    #[test]
    fn test_builder_missing_required() {
        let result = NormalizedEvent::builder().event_type("test_event").build();

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("timestamp"));
    }

    #[test]
    fn test_sip_message() {
        let sip = SIPMessage {
            method: Some("INVITE".to_string()),
            status_code: None,
            status_text: None,
            headers: SIPHeaders {
                call_id: Some("abc123@example.com".to_string()),
                from: Some(SIPAddress {
                    display_name: Some("Alice".to_string()),
                    uri: "sip:alice@example.com".to_string(),
                    tag: Some("tag1".to_string()),
                    parameters: HashMap::new(),
                }),
                to: Some(SIPAddress {
                    display_name: Some("Bob".to_string()),
                    uri: "sip:bob@example.com".to_string(),
                    tag: None,
                    parameters: HashMap::new(),
                }),
                via: vec![],
                cseq: Some(CSeq {
                    number: 1,
                    method: "INVITE".to_string(),
                }),
                contact: None,
                route: vec![],
                record_route: vec![],
                content_type: Some("application/sdp".to_string()),
                content_length: Some(200),
                user_agent: Some("Test UA".to_string()),
                other: HashMap::new(),
            },
            sdp: None,
            direction: Some(Direction::Inbound),
        };

        assert_eq!(sip.method, Some("INVITE".to_string()));
        assert_eq!(sip.headers.call_id, Some("abc123@example.com".to_string()));
    }

    #[test]
    fn test_call_id_extraction() {
        let event = NormalizedEvent::builder()
            .event_type("sip_invite")
            .timestamp(Utc::now())
            .sip_message(SIPMessage {
                method: Some("INVITE".to_string()),
                status_code: None,
                status_text: None,
                headers: SIPHeaders {
                    call_id: Some("test-call-123".to_string()),
                    ..Default::default()
                },
                sdp: None,
                direction: None,
            })
            .vendor(VendorInfo {
                vendor_type: "test".to_string(),
                product: None,
                version: None,
                confidence: None,
                metadata: HashMap::new(),
            })
            .raw(RawData {
                line: "test".to_string(),
                line_number: None,
                file_path: None,
                format: None,
            })
            .build()
            .unwrap();

        assert_eq!(event.call_id(), Some("test-call-123"));
    }

    #[test]
    fn test_correlation_ids() {
        let mut event = NormalizedEvent::builder()
            .event_type("test")
            .timestamp(Utc::now())
            .vendor(VendorInfo {
                vendor_type: "test".to_string(),
                product: None,
                version: None,
                confidence: None,
                metadata: HashMap::new(),
            })
            .raw(RawData {
                line: "test".to_string(),
                line_number: None,
                file_path: None,
                format: None,
            })
            .correlation_id("call_id", "abc123")
            .correlation_id("session_id", "xyz789")
            .build()
            .unwrap();

        assert_eq!(event.correlation_ids.len(), 2);
        assert_eq!(event.get_correlation_ids("call_id"), vec!["abc123"]);
        assert_eq!(event.get_correlation_ids("session_id"), vec!["xyz789"]);

        event.add_correlation_id("transaction_id".to_string(), "tx456".to_string());
        assert_eq!(event.correlation_ids.len(), 3);
    }

    #[test]
    fn test_serialization() {
        let event = NormalizedEvent::builder()
            .event_type("sip_invite")
            .timestamp(Utc::now())
            .vendor(VendorInfo {
                vendor_type: "cisco_cube".to_string(),
                product: Some("IOS".to_string()),
                version: Some("16.9".to_string()),
                confidence: Some(0.95),
                metadata: HashMap::new(),
            })
            .raw(RawData {
                line: "Jan 1 12:00:00.000: %SIP-6-INVITE".to_string(),
                line_number: Some(42),
                file_path: Some("/var/log/sip.log".to_string()),
                format: Some("cisco_ios".to_string()),
            })
            .build()
            .unwrap();

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("sip_invite"));
        assert!(json.contains("cisco_cube"));

        let deserialized: NormalizedEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.event_type, event.event_type);
        assert_eq!(deserialized.vendor.vendor_type, event.vendor.vendor_type);
    }
}
