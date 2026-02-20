//! Cisco Jabber Normalizer
//!
//! Parses Cisco Jabber CSF (Client Services Framework) logs and converts them to NormalizedEvent format.
//!
//! # Log Format
//!
//! Jabber logs use a structured format with thread information and component markers:
//! ```text
//! 2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| INVITE sip:5551234@example.com SIP/2.0
//! 2024-01-15 10:30:00,456 <CSF.SIP> <thread-2> |SIP_MSG_SENT| SIP/2.0 200 OK
//! ```
//!
//! Components:
//! - Timestamp: `2024-01-15 10:30:00,123` (comma for milliseconds, same as CUCM)
//! - Component: `<MAIN>`, `<CSF.SIP>`, `<CSF>`, etc. (framework component path)
//! - Thread: `<thread-1>`, `<thread-2>`, etc. (thread identifier)
//! - Direction Marker: `|SIP_MSG_RECV|` or `|SIP_MSG_SENT|`
//! - SIP Message: Standard SIP message content
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::normalizers::{VendorNormalizer, JabberNormalizer};
//!
//! let normalizer = JabberNormalizer::new();
//! let log = "2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| INVITE sip:5551234@example.com SIP/2.0";
//!
//! let event = normalizer.normalize(log).unwrap();
//! assert_eq!(event.vendor.vendor_type, "cisco_jabber");
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
    // Match Jabber timestamp: "2024-01-15 10:30:00,123"
    static ref TIMESTAMP_REGEX: Regex =
        Regex::new(r"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})").unwrap();

    // Match component marker: "<MAIN>", "<CSF.SIP>", "<CSF>", etc.
    static ref COMPONENT_REGEX: Regex = Regex::new(r"<([A-Z][A-Z0-9._]*)>").unwrap();

    // Match thread identifier: "<thread-1>", "<thread-2>", etc.
    static ref THREAD_REGEX: Regex = Regex::new(r"<(thread-\d+)>").unwrap();

    // Match SIP message direction markers
    static ref SIP_MSG_RECV_REGEX: Regex = Regex::new(r"\|SIP_MSG_RECV\|").unwrap();
    static ref SIP_MSG_SENT_REGEX: Regex = Regex::new(r"\|SIP_MSG_SENT\|").unwrap();

    // Match CSFClient marker (another Jabber indicator)
    static ref CSF_CLIENT_REGEX: Regex = Regex::new(r"CSFClient\[").unwrap();

    // Match SIP method
    static ref SIP_METHOD_REGEX: Regex =
        Regex::new(r"\b(INVITE|ACK|BYE|CANCEL|OPTIONS|REGISTER|PRACK|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE)\s+sip:").unwrap();

    // Match SIP response
    static ref SIP_RESPONSE_REGEX: Regex =
        Regex::new(r"SIP/2\.0\s+(\d{3})\s+([^\r\n]+)").unwrap();

    // Extract IP addresses and ports
    static ref IP_REGEX: Regex =
        Regex::new(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)\b").unwrap();
}

/// Normalizer for Cisco Jabber logs
pub struct JabberNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl JabberNormalizer {
    /// Create a new Jabber normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_jabber".to_string(),
            vendor_name: "Cisco Jabber".to_string(),
        }
    }

    /// Parse the timestamp from the log line
    fn parse_timestamp(&self, log_line: &str) -> NormalizationResult<chrono::DateTime<Utc>> {
        if let Some(caps) = TIMESTAMP_REGEX.captures(log_line) {
            let timestamp_str = caps.get(1).unwrap().as_str();
            timestamp_utils::parse_jabber_timestamp(timestamp_str)
        } else {
            Ok(Utc::now())
        }
    }

    /// Extract component from log line
    fn extract_component(&self, log_line: &str) -> Option<String> {
        COMPONENT_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Extract thread ID from log line
    fn extract_thread_id(&self, log_line: &str) -> Option<String> {
        THREAD_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Determine the direction from the log markers
    fn determine_direction(&self, log_line: &str) -> Option<Direction> {
        if SIP_MSG_RECV_REGEX.is_match(log_line) {
            Some(Direction::Inbound)
        } else if SIP_MSG_SENT_REGEX.is_match(log_line) {
            Some(Direction::Outbound)
        } else {
            None
        }
    }

    /// Determine the event type
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

        // Check for message direction markers
        if SIP_MSG_RECV_REGEX.is_match(log_line) || SIP_MSG_SENT_REGEX.is_match(log_line) {
            return "sip_message".to_string();
        }

        // Default
        "jabber_log".to_string()
    }

    /// Extract SIP message
    fn extract_sip_message(&self, log_line: &str) -> Option<SIPMessage> {
        // Only process if we have SIP markers or content
        if !SIP_MSG_RECV_REGEX.is_match(log_line)
            && !SIP_MSG_SENT_REGEX.is_match(log_line)
            && !log_line.contains("SIP")
        {
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

        // Only create SIPMessage if we found SIP content
        if method.is_none() && status_code.is_none() {
            return None;
        }

        let direction = self.determine_direction(log_line);
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

    /// Extract network context from log line
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

        // Determine direction based on SIP markers
        let direction = self.determine_direction(log_line);

        Some(NetworkContext {
            source_ip: Some(source_ip),
            source_port: Some(source_port),
            destination_ip: Some(destination_ip),
            destination_port: Some(destination_port),
            protocol: Some("TCP".to_string()), // Jabber typically uses TCP
            interface: None,
            direction,
        })
    }

    /// Extract system context (component, thread)
    fn extract_system_context(&self, log_line: &str) -> Option<SystemContext> {
        let component = self.extract_component(log_line);
        let thread_id = self.extract_thread_id(log_line);

        if component.is_some() || thread_id.is_some() {
            Some(SystemContext {
                hostname: None,
                pid: None,
                thread_id,
                component,
                log_level: None,
            })
        } else {
            None
        }
    }

    /// Extract metadata
    fn extract_metadata(&self, log_line: &str) -> HashMap<String, String> {
        let mut metadata = HashMap::new();

        if let Some(component) = self.extract_component(log_line) {
            metadata.insert("component".to_string(), component);
        }

        if let Some(thread) = self.extract_thread_id(log_line) {
            metadata.insert("thread_id".to_string(), thread);
        }

        if SIP_MSG_RECV_REGEX.is_match(log_line) {
            metadata.insert("direction".to_string(), "inbound".to_string());
        } else if SIP_MSG_SENT_REGEX.is_match(log_line) {
            metadata.insert("direction".to_string(), "outbound".to_string());
        }

        metadata
    }
}

impl Default for JabberNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for JabberNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for Jabber-specific markers
        (TIMESTAMP_REGEX.is_match(log_line) && COMPONENT_REGEX.is_match(log_line))
            || SIP_MSG_RECV_REGEX.is_match(log_line)
            || SIP_MSG_SENT_REGEX.is_match(log_line)
            || CSF_CLIENT_REGEX.is_match(log_line)
            || (THREAD_REGEX.is_match(log_line) && TIMESTAMP_REGEX.is_match(log_line))
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
            product: Some("Jabber".to_string()),
            version: None,
            confidence: Some(1.0),
            metadata,
        };

        let raw = RawData {
            line: log_line.to_string(),
            line_number: None,
            file_path: None,
            format: Some("jabber_csf".to_string()),
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

        // Strong indicators
        if SIP_MSG_RECV_REGEX.is_match(log_line) || SIP_MSG_SENT_REGEX.is_match(log_line) {
            confidence += 0.5;
        }

        if CSF_CLIENT_REGEX.is_match(log_line) {
            confidence += 0.4;
        }

        // Component marker is a good indicator
        if COMPONENT_REGEX.is_match(log_line) {
            confidence += 0.3;
        }

        // Thread marker combined with timestamp
        if THREAD_REGEX.is_match(log_line) && TIMESTAMP_REGEX.is_match(log_line) {
            confidence += 0.2;
        }

        // Timestamp alone
        if TIMESTAMP_REGEX.is_match(log_line) {
            confidence += 0.1;
        }

        confidence.min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_normalize_jabber_log() {
        let normalizer = JabberNormalizer::new();
        let log = "2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| INVITE";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_can_normalize_csf_client_log() {
        let normalizer = JabberNormalizer::new();
        let log = "CSFClient[12345]: Some log message";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_normalize_jabber_invite() {
        let normalizer = JabberNormalizer::new();
        let log = "2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| \
                   INVITE sip:5551234@10.1.1.1:5060 SIP/2.0\r\n\
                   Call-ID: abc123@10.1.1.100\r\n\
                   From: <sip:alice@10.1.1.100>;tag=tag1\r\n\
                   To: <sip:bob@10.1.1.1>";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.vendor.vendor_type, "cisco_jabber");
        assert_eq!(event.event_type, "sip_invite");
        assert!(event.sip_message.is_some());

        let sip = event.sip_message.unwrap();
        assert_eq!(sip.method, Some("INVITE".to_string()));
        assert_eq!(sip.direction, Some(Direction::Inbound));
        assert_eq!(sip.headers.call_id, Some("abc123@10.1.1.100".to_string()));
    }

    #[test]
    fn test_normalize_jabber_response() {
        let normalizer = JabberNormalizer::new();
        let log = "2024-01-15 10:30:01,456 <CSF.SIP> <thread-2> |SIP_MSG_SENT| \
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
    fn test_extract_component() {
        let normalizer = JabberNormalizer::new();

        assert_eq!(
            normalizer.extract_component("<MAIN> some log"),
            Some("MAIN".to_string())
        );

        assert_eq!(
            normalizer.extract_component("<CSF.SIP> some log"),
            Some("CSF.SIP".to_string())
        );

        assert_eq!(normalizer.extract_component("no component"), None);
    }

    #[test]
    fn test_extract_thread_id() {
        let normalizer = JabberNormalizer::new();

        assert_eq!(
            normalizer.extract_thread_id("<thread-1> some log"),
            Some("thread-1".to_string())
        );

        assert_eq!(
            normalizer.extract_thread_id("<thread-99> some log"),
            Some("thread-99".to_string())
        );

        assert_eq!(normalizer.extract_thread_id("no thread"), None);
    }

    #[test]
    fn test_determine_direction() {
        let normalizer = JabberNormalizer::new();

        assert_eq!(
            normalizer.determine_direction("|SIP_MSG_RECV| test"),
            Some(Direction::Inbound)
        );

        assert_eq!(
            normalizer.determine_direction("|SIP_MSG_SENT| test"),
            Some(Direction::Outbound)
        );

        assert_eq!(normalizer.determine_direction("no marker"), None);
    }

    #[test]
    fn test_extract_system_context() {
        let normalizer = JabberNormalizer::new();
        let log = "2024-01-15 10:30:00,123 <MAIN> <thread-1> test";

        let system = normalizer.extract_system_context(log);
        assert!(system.is_some());

        let sys = system.unwrap();
        assert_eq!(sys.component, Some("MAIN".to_string()));
        assert_eq!(sys.thread_id, Some("thread-1".to_string()));
    }

    #[test]
    fn test_extract_network_context() {
        let normalizer = JabberNormalizer::new();
        let log = "|SIP_MSG_RECV| From 10.1.1.100:5060 To 10.1.1.1:5060";

        let network = normalizer.extract_network_context(log);
        assert!(network.is_some());

        let net = network.unwrap();
        assert_eq!(net.source_ip, Some("10.1.1.100".to_string()));
        assert_eq!(net.source_port, Some(5060));
        assert_eq!(net.protocol, Some("TCP".to_string()));
        assert_eq!(net.direction, Some(Direction::Inbound));
    }

    #[test]
    fn test_determine_event_type() {
        let normalizer = JabberNormalizer::new();

        assert_eq!(
            normalizer.determine_event_type("INVITE sip:test"),
            "sip_invite"
        );

        assert_eq!(normalizer.determine_event_type("SIP/2.0 200 OK"), "sip_200");

        assert_eq!(
            normalizer.determine_event_type("|SIP_MSG_RECV| some message"),
            "sip_message"
        );
    }

    #[test]
    fn test_confidence_scoring() {
        let normalizer = JabberNormalizer::new();

        let high_confidence = "2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| test";
        assert!(normalizer.confidence(high_confidence) >= 0.9);

        let medium_confidence = "2024-01-15 10:30:00,123 <MAIN> test";
        assert!(normalizer.confidence(medium_confidence) >= 0.3);

        let low_confidence = "Random log line";
        assert!(normalizer.confidence(low_confidence) < 0.3);
    }

    #[test]
    fn test_parse_timestamp() {
        let normalizer = JabberNormalizer::new();
        let log = "2024-01-15 10:30:00,123 test";

        let result = normalizer.parse_timestamp(log);
        assert!(result.is_ok());
    }

    #[test]
    fn test_vendor_info() {
        let normalizer = JabberNormalizer::new();
        assert_eq!(normalizer.vendor_id(), "cisco_jabber");
        assert_eq!(normalizer.vendor_name(), "Cisco Jabber");
    }
}
