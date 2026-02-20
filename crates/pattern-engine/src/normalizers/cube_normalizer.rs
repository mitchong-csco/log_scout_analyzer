//! Cisco CUBE (IOS) Normalizer
//!
//! Parses Cisco IOS/CUBE SIP logs and converts them to NormalizedEvent format.
//!
//! # Log Format
//!
//! Cisco IOS logs follow this format:
//! ```text
//! Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE sip:...
//! ```
//!
//! Components:
//! - Timestamp: `Jan 15 10:30:00.123` (no year, uses current)
//! - Severity: `%SIP-6-INVITE` (facility-level-mnemonic)
//! - Marker: `ccsipDisplayMsg:` (CUBE-specific marker)
//! - Message: SIP message content
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::normalizers::{VendorNormalizer, CubeNormalizer};
//!
//! let normalizer = CubeNormalizer::new();
//! let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received \
//!            INVITE sip:5551234@example.com SIP/2.0";
//!
//! let event = normalizer.normalize(log).unwrap();
//! assert_eq!(event.vendor.vendor_type, "cisco_cube");
//! ```

use super::{
    sip_utils, timestamp_utils, NormalizationError, NormalizationResult, VendorNormalizer,
};
use chrono::Utc;
use lazy_static::lazy_static;
use log_scout_core::normalized_event::{
    Direction, NetworkContext, NormalizedEvent, RawData, SIPMessage, SystemContext, VendorInfo,
};
use regex::Regex;
use std::collections::HashMap;

lazy_static! {
    // Match IOS timestamp at start: "Jan 15 10:30:00.123"
    static ref TIMESTAMP_REGEX: Regex =
        Regex::new(r"^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?)").unwrap();

    // Match IOS syslog format: "%SIP-6-INVITE"
    static ref SYSLOG_REGEX: Regex = Regex::new(r"%(\w+)-(\d+)-(\w+)").unwrap();

    // Match ccsipDisplayMsg marker
    static ref CCSIPDISPLAYMSG_REGEX: Regex = Regex::new(r"ccsipDisplayMsg:").unwrap();

    // Match SIP method (INVITE, ACK, BYE, etc.)
    static ref SIP_METHOD_REGEX: Regex =
        Regex::new(r"\b(INVITE|ACK|BYE|CANCEL|OPTIONS|REGISTER|PRACK|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE)\s+sip:").unwrap();

    // Match SIP response (SIP/2.0 200 OK)
    static ref SIP_RESPONSE_REGEX: Regex =
        Regex::new(r"SIP/2\.0\s+(\d{3})\s+([^\r\n]+)").unwrap();

    // Match Received/Sent direction
    static ref DIRECTION_REGEX: Regex = Regex::new(r"\b(Received|Sent)\b").unwrap();

    // Extract IP addresses
    static ref IP_REGEX: Regex =
        Regex::new(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)\b").unwrap();
}

/// Normalizer for Cisco IOS/CUBE logs
pub struct CubeNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CubeNormalizer {
    /// Create a new CUBE normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_cube".to_string(),
            vendor_name: "Cisco IOS/CUBE".to_string(),
        }
    }

    /// Parse the timestamp from the log line
    fn parse_timestamp(&self, log_line: &str) -> NormalizationResult<chrono::DateTime<Utc>> {
        if let Some(caps) = TIMESTAMP_REGEX.captures(log_line) {
            let timestamp_str = caps.get(1).unwrap().as_str();
            timestamp_utils::parse_ios_timestamp(timestamp_str)
        } else {
            // Fallback to current time if no timestamp found
            Ok(Utc::now())
        }
    }

    /// Determine the event type from the log line
    fn determine_event_type(&self, log_line: &str) -> String {
        // Check for SIP method
        if let Some(caps) = SIP_METHOD_REGEX.captures(log_line) {
            let method = caps.get(1).unwrap().as_str().to_lowercase();
            return format!("sip_{}", method);
        }

        // Check for SIP response
        if let Some(caps) = SIP_RESPONSE_REGEX.captures(log_line) {
            let status = caps.get(1).unwrap().as_str();
            return format!("sip_{}", status);
        }

        // Check syslog mnemonic
        if let Some(caps) = SYSLOG_REGEX.captures(log_line) {
            let mnemonic = caps.get(3).unwrap().as_str().to_lowercase();
            return format!("sip_{}", mnemonic);
        }

        // Default
        "sip_message".to_string()
    }

    /// Extract SIP message from the log line
    fn extract_sip_message(&self, log_line: &str) -> Option<SIPMessage> {
        // Check if this contains a SIP message
        if !log_line.contains("SIP") && !CCSIPDISPLAYMSG_REGEX.is_match(log_line) {
            return None;
        }

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

        // Determine direction
        let direction = DIRECTION_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| match m.as_str() {
                "Received" => Direction::Inbound,
                "Sent" => Direction::Outbound,
                _ => Direction::Unknown,
            });

        // Extract SIP headers
        let headers = sip_utils::extract_sip_headers(log_line);

        Some(SIPMessage {
            method,
            status_code,
            status_text,
            headers,
            sdp: None,
            direction,
        })
    }

    /// Extract network context (IPs and ports)
    fn extract_network_context(&self, log_line: &str) -> Option<NetworkContext> {
        let mut ips: Vec<(String, u16)> = Vec::new();

        for caps in IP_REGEX.captures_iter(log_line) {
            let ip = caps.get(1).unwrap().as_str().to_string();
            let port = caps.get(2).unwrap().as_str().parse::<u16>().ok()?;
            ips.push((ip, port));
        }

        if ips.is_empty() {
            return None;
        }

        // Heuristic: first IP is often source, second is destination
        let (source_ip, source_port) = ips.first().cloned()?;
        let (destination_ip, destination_port) = ips
            .get(1)
            .cloned()
            .unwrap_or_else(|| ips.first().cloned().unwrap());

        Some(NetworkContext {
            source_ip: Some(source_ip),
            source_port: Some(source_port),
            destination_ip: Some(destination_ip),
            destination_port: Some(destination_port),
            protocol: Some("UDP".to_string()), // IOS default is UDP unless TCP specified
            interface: None,
            direction: None,
        })
    }

    /// Extract system context (severity, facility)
    fn extract_system_context(&self, log_line: &str) -> Option<SystemContext> {
        if let Some(caps) = SYSLOG_REGEX.captures(log_line) {
            let facility = caps.get(1).unwrap().as_str();
            let level = caps.get(2).unwrap().as_str();
            let mnemonic = caps.get(3).unwrap().as_str();

            Some(SystemContext {
                hostname: None,
                pid: None,
                thread_id: None,
                component: Some(facility.to_string()),
                log_level: Some(format!("{}:{}", level, mnemonic)),
            })
        } else {
            None
        }
    }
}

impl Default for CubeNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for CubeNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Quick checks for CUBE-specific markers
        CCSIPDISPLAYMSG_REGEX.is_match(log_line)
            || (TIMESTAMP_REGEX.is_match(log_line) && SYSLOG_REGEX.is_match(log_line))
            || log_line.contains("%SIP-")
    }

    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent> {
        // Parse timestamp
        let timestamp = self.parse_timestamp(log_line)?;

        // Determine event type
        let event_type = self.determine_event_type(log_line);

        // Extract SIP message if present
        let sip_message = self.extract_sip_message(log_line);

        // Extract network context
        let network = self.extract_network_context(log_line);

        // Extract system context
        let system = self.extract_system_context(log_line);

        // Build vendor info
        let vendor = VendorInfo {
            vendor_type: self.vendor_id.clone(),
            product: Some("IOS".to_string()),
            version: None, // Could extract from logs if available
            confidence: Some(1.0),
            metadata: HashMap::new(),
        };

        // Build raw data
        let raw = RawData {
            line: log_line.to_string(),
            line_number: None,
            file_path: None,
            format: Some("cisco_ios".to_string()),
        };

        // Build the normalized event
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

        if CCSIPDISPLAYMSG_REGEX.is_match(log_line) {
            confidence += 0.5;
        }

        if TIMESTAMP_REGEX.is_match(log_line) {
            confidence += 0.2;
        }

        if SYSLOG_REGEX.is_match(log_line) {
            confidence += 0.3;
        }

        confidence.min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_normalize_cube_log() {
        let normalizer = CubeNormalizer::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_normalize_cube_invite() {
        let normalizer = CubeNormalizer::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received \
                   INVITE sip:5551234@10.1.1.1:5060 SIP/2.0\r\n\
                   Call-ID: abc123@10.1.1.100\r\n\
                   From: <sip:alice@10.1.1.100>;tag=tag1\r\n\
                   To: <sip:bob@10.1.1.1>";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.vendor.vendor_type, "cisco_cube");
        assert_eq!(event.event_type, "sip_invite");
        assert!(event.sip_message.is_some());

        let sip = event.sip_message.unwrap();
        assert_eq!(sip.method, Some("INVITE".to_string()));
        assert_eq!(sip.headers.call_id, Some("abc123@10.1.1.100".to_string()));
    }

    #[test]
    fn test_normalize_cube_response() {
        let normalizer = CubeNormalizer::new();
        let log = "Jan 15 10:30:01.456: %SIP-6-200: ccsipDisplayMsg: Sent \
                   SIP/2.0 200 OK\r\n\
                   Call-ID: abc123@10.1.1.100";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.event_type, "sip_200");

        let sip = event.sip_message.unwrap();
        assert_eq!(sip.status_code, Some(200));
        assert_eq!(sip.direction, Some(Direction::Outbound));
    }

    #[test]
    fn test_extract_network_context() {
        let normalizer = CubeNormalizer::new();
        let log = "Source 10.1.1.100:5060 Destination 10.1.1.1:5060";

        let network = normalizer.extract_network_context(log);
        assert!(network.is_some());

        let net = network.unwrap();
        assert_eq!(net.source_ip, Some("10.1.1.100".to_string()));
        assert_eq!(net.source_port, Some(5060));
    }

    #[test]
    fn test_extract_system_context() {
        let normalizer = CubeNormalizer::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: test";

        let system = normalizer.extract_system_context(log);
        assert!(system.is_some());

        let sys = system.unwrap();
        assert_eq!(sys.component, Some("SIP".to_string()));
        assert_eq!(sys.log_level, Some("6:INVITE".to_string()));
    }

    #[test]
    fn test_determine_event_type() {
        let normalizer = CubeNormalizer::new();

        assert_eq!(
            normalizer.determine_event_type("INVITE sip:test"),
            "sip_invite"
        );
        assert_eq!(normalizer.determine_event_type("SIP/2.0 200 OK"), "sip_200");
        assert_eq!(
            normalizer.determine_event_type("%SIP-6-BYE: test"),
            "sip_bye"
        );
    }

    #[test]
    fn test_confidence_scoring() {
        let normalizer = CubeNormalizer::new();

        let high_confidence = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: test";
        assert!(normalizer.confidence(high_confidence) >= 0.9);

        let medium_confidence = "Jan 15 10:30:00.123: %SIP-6-INVITE: test";
        assert!(normalizer.confidence(medium_confidence) >= 0.5);

        let low_confidence = "Random log line";
        assert!(normalizer.confidence(low_confidence) < 0.5);
    }

    #[test]
    fn test_parse_timestamp() {
        let normalizer = CubeNormalizer::new();
        let log = "Jan 15 10:30:00.123: test";

        let result = normalizer.parse_timestamp(log);
        assert!(result.is_ok());
    }

    #[test]
    fn test_vendor_info() {
        let normalizer = CubeNormalizer::new();
        assert_eq!(normalizer.vendor_id(), "cisco_cube");
        assert_eq!(normalizer.vendor_name(), "Cisco IOS/CUBE");
    }
}
