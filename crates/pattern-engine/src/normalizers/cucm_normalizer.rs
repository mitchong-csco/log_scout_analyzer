//! Cisco CUCM Normalizer
//!
//! Parses Cisco Unified Call Manager (CUCM) SIP logs and converts them to NormalizedEvent format.
//!
//! # Log Format
//!
//! CUCM logs use a pipe-delimited metadata format:
//! ```text
//! 2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|ClusterID=StdCluster|LocalAddr=10.1.1.1:5060|RemoteAddr=10.1.1.100:5060
//! INVITE sip:5551234@10.1.1.1:5060 SIP/2.0
//! Call-ID: abc123@10.1.1.100
//! ```
//!
//! Components:
//! - Timestamp: `2024-01-15 10:30:00,123` (comma for milliseconds)
//! - Transport: `|SIPTcp|` or `|SIPUdp|` or `|SIPTls|`
//! - Metadata: Pipe-delimited key=value pairs
//! - SIP Message: Standard SIP message following metadata line
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::normalizers::{VendorNormalizer, CucmNormalizer};
//!
//! let normalizer = CucmNormalizer::new();
//! let log = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|...";
//!
//! let event = normalizer.normalize(log).unwrap();
//! assert_eq!(event.vendor.vendor_type, "cisco_cucm");
//! ```

use super::{
    sip_utils, timestamp_utils, NormalizationError, NormalizationResult, VendorNormalizer,
};
use chrono::Utc;
use lazy_static::lazy_static;
use log_scout_core::normalized_event::{
    NetworkContext, NormalizedEvent, RawData, SIPMessage, SystemContext, VendorInfo,
};
use regex::Regex;
use std::collections::HashMap;

lazy_static! {
    // Match CUCM timestamp: "2024-01-15 10:30:00,123"
    static ref TIMESTAMP_REGEX: Regex =
        Regex::new(r"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})").unwrap();

    // Match pipe-delimited transport marker
    static ref TRANSPORT_REGEX: Regex = Regex::new(r"\|(SIP(?:Tcp|Udp|Tls))\|").unwrap();

    // Match AppId field
    static ref APPID_REGEX: Regex = Regex::new(r"AppId=([^|]+)").unwrap();

    // Match ClusterID
    static ref CLUSTER_REGEX: Regex = Regex::new(r"ClusterID=([^|]+)").unwrap();

    // Match LocalAddr
    static ref LOCALADDR_REGEX: Regex =
        Regex::new(r"LocalAddr=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)").unwrap();

    // Match RemoteAddr
    static ref REMOTEADDR_REGEX: Regex =
        Regex::new(r"RemoteAddr=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)").unwrap();

    // Match SIP method (multiline mode to match across newlines)
    static ref SIP_METHOD_REGEX: Regex =
        Regex::new(r"(?m)^\s*(INVITE|ACK|BYE|CANCEL|OPTIONS|REGISTER|PRACK|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE)\s+sip:").unwrap();

    // Match SIP response (multiline mode to match across newlines)
    static ref SIP_RESPONSE_REGEX: Regex =
        Regex::new(r"(?m)^\s*SIP/2\.0\s+(\d{3})\s+([^\r\n]+)").unwrap();
}

/// Normalizer for Cisco CUCM logs
pub struct CucmNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CucmNormalizer {
    /// Create a new CUCM normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_cucm".to_string(),
            vendor_name: "Cisco Unified Call Manager".to_string(),
        }
    }

    /// Parse the timestamp from the log line
    fn parse_timestamp(&self, log_line: &str) -> NormalizationResult<chrono::DateTime<Utc>> {
        if let Some(caps) = TIMESTAMP_REGEX.captures(log_line) {
            let timestamp_str = caps.get(1).unwrap().as_str();
            timestamp_utils::parse_cucm_timestamp(timestamp_str)
        } else {
            Ok(Utc::now())
        }
    }

    /// Extract metadata from pipe-delimited format
    fn extract_metadata(&self, log_line: &str) -> HashMap<String, String> {
        let mut metadata = HashMap::new();

        if let Some(caps) = APPID_REGEX.captures(log_line) {
            metadata.insert("app_id".to_string(), caps[1].to_string());
        }

        if let Some(caps) = CLUSTER_REGEX.captures(log_line) {
            metadata.insert("cluster_id".to_string(), caps[1].to_string());
        }

        metadata
    }

    /// Determine the event type
    fn determine_event_type(&self, log_line: &str) -> String {
        // Check for SIP method first (highest priority)
        if let Some(caps) = SIP_METHOD_REGEX.captures(log_line) {
            let method = caps.get(1).unwrap().as_str().to_lowercase();
            return format!("sip_{}", method);
        }

        // Check for SIP response
        if let Some(caps) = SIP_RESPONSE_REGEX.captures(log_line) {
            let status = caps.get(1).unwrap().as_str();
            return format!("sip_{}", status);
        }

        // Only check transport type if no specific SIP method/response found
        if let Some(caps) = TRANSPORT_REGEX.captures(log_line) {
            let transport = caps.get(1).unwrap().as_str().to_lowercase();
            return format!("sip_{}_message", transport);
        }

        "sip_message".to_string()
    }

    /// Extract SIP message
    fn extract_sip_message(&self, log_line: &str) -> Option<SIPMessage> {
        // Determine if it's a request or response
        let method = SIP_METHOD_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string());

        let (status_code, status_text) = SIP_RESPONSE_REGEX
            .captures(log_line)
            .map(|c| {
                let code = c.get(1).unwrap().as_str().parse::<u16>().ok();
                let text = c.get(2).map(|m| m.as_str().trim().to_string());
                (code, text)
            })
            .unwrap_or((None, None));

        // Only create SIPMessage if we found SIP content
        if method.is_none() && status_code.is_none() {
            return None;
        }

        let headers = sip_utils::extract_sip_headers(log_line);

        Some(SIPMessage {
            method,
            status_code,
            status_text,
            headers,
            sdp: None,
            direction: None,
        })
    }

    /// Extract network context from LocalAddr/RemoteAddr
    fn extract_network_context(&self, log_line: &str) -> Option<NetworkContext> {
        let local_addr = LOCALADDR_REGEX.captures(log_line).and_then(|c| {
            let ip = c.get(1).unwrap().as_str().to_string();
            let port = c.get(2).unwrap().as_str().parse::<u16>().ok()?;
            Some((ip, port))
        });

        let remote_addr = REMOTEADDR_REGEX.captures(log_line).and_then(|c| {
            let ip = c.get(1).unwrap().as_str().to_string();
            let port = c.get(2).unwrap().as_str().parse::<u16>().ok()?;
            Some((ip, port))
        });

        if local_addr.is_none() && remote_addr.is_none() {
            return None;
        }

        // Determine protocol from transport marker
        let protocol = TRANSPORT_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| {
                let transport = m.as_str();
                match transport {
                    "SIPTcp" => "TCP".to_string(),
                    "SIPUdp" => "UDP".to_string(),
                    "SIPTls" => "TLS".to_string(),
                    _ => "UDP".to_string(),
                }
            });

        let (destination_ip, destination_port) = local_addr.clone().or(remote_addr.clone())?;
        let (source_ip, source_port) = remote_addr
            .or(local_addr)
            .unwrap_or_else(|| (destination_ip.clone(), destination_port));

        Some(NetworkContext {
            source_ip: Some(source_ip),
            source_port: Some(source_port),
            destination_ip: Some(destination_ip),
            destination_port: Some(destination_port),
            protocol,
            interface: None,
            direction: None,
        })
    }

    /// Extract system context
    fn extract_system_context(&self, log_line: &str) -> Option<SystemContext> {
        let component = APPID_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string());

        if component.is_some() {
            Some(SystemContext {
                hostname: None,
                pid: None,
                thread_id: None,
                component,
                log_level: None,
            })
        } else {
            None
        }
    }
}

impl Default for CucmNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for CucmNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for CUCM-specific markers
        TRANSPORT_REGEX.is_match(log_line)
            || (TIMESTAMP_REGEX.is_match(log_line) && APPID_REGEX.is_match(log_line))
            || log_line.contains("Cisco CallManager")
    }

    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent> {
        let timestamp = self.parse_timestamp(log_line)?;
        let event_type = self.determine_event_type(log_line);
        let sip_message = self.extract_sip_message(log_line);
        let network = self.extract_network_context(log_line);
        let system = self.extract_system_context(log_line);

        let metadata = self.extract_metadata(log_line);

        let vendor = VendorInfo {
            vendor_type: self.vendor_id.clone(),
            product: Some("CUCM".to_string()),
            version: None,
            confidence: Some(1.0),
            metadata,
        };

        let raw = RawData {
            line: log_line.to_string(),
            line_number: None,
            file_path: None,
            format: Some("cucm_pipe_delimited".to_string()),
        };

        let mut event = NormalizedEvent::builder()
            .event_type(event_type)
            .timestamp(timestamp)
            .vendor(vendor)
            .raw(raw);

        if let Some(sip) = sip_message {
            event = event.sip_message(sip);
        }

        if let Some(net) = network {
            event = event.network(net);
        }

        if let Some(sys) = system {
            event = event.system(sys);
        }

        event.build().map_err(|e| NormalizationError::BuildError(e))
    }

    fn confidence(&self, log_line: &str) -> f32 {
        let mut confidence: f32 = 0.0;

        if TRANSPORT_REGEX.is_match(log_line) {
            confidence += 0.5;
        }

        if APPID_REGEX.is_match(log_line) {
            confidence += 0.3;
        }

        if TIMESTAMP_REGEX.is_match(log_line) {
            confidence += 0.2;
        }

        confidence.min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_normalize_cucm_log() {
        let normalizer = CucmNormalizer::new();
        let log = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_normalize_cucm_log() {
        let normalizer = CucmNormalizer::new();
        let log = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|ClusterID=StdCluster|LocalAddr=10.1.1.1:5060|RemoteAddr=10.1.1.100:5060\nINVITE sip:5551234@10.1.1.1:5060 SIP/2.0\nCall-ID: abc123@10.1.1.100";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.vendor.vendor_type, "cisco_cucm");
        assert_eq!(event.event_type, "sip_invite");
    }

    #[test]
    fn test_extract_metadata() {
        let normalizer = CucmNormalizer::new();
        let log = "AppId=Cisco CallManager|ClusterID=StdCluster";

        let metadata = normalizer.extract_metadata(log);
        assert_eq!(
            metadata.get("app_id"),
            Some(&"Cisco CallManager".to_string())
        );
        assert_eq!(metadata.get("cluster_id"), Some(&"StdCluster".to_string()));
    }

    #[test]
    fn test_extract_network_context() {
        let normalizer = CucmNormalizer::new();
        let log = "|SIPTcp|LocalAddr=10.1.1.1:5060|RemoteAddr=10.1.1.100:5060";

        let network = normalizer.extract_network_context(log);
        assert!(network.is_some());

        let net = network.unwrap();
        assert_eq!(net.destination_ip, Some("10.1.1.1".to_string()));
        assert_eq!(net.protocol, Some("TCP".to_string()));
    }

    #[test]
    fn test_vendor_info() {
        let normalizer = CucmNormalizer::new();
        assert_eq!(normalizer.vendor_id(), "cisco_cucm");
        assert_eq!(normalizer.vendor_name(), "Cisco Unified Call Manager");
    }
}
