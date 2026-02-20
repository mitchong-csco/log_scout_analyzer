//! Cisco Unity Connection (CUC) Normalizer
//!
//! Parses Cisco Unity Connection logs and converts them to NormalizedEvent format.
//!
//! # Log Format
//!
//! CUC logs use a bracketed component format with Unity Connection specific markers:
//! ```text
//! [CUC-SIP.Stack] INVITE sip:5551234@example.com SIP/2.0
//! [CUC-Voicemail] Processing voicemail for extension 5551234
//! 2024-01-15 10:30:00,123 [CUC-SIP.Stack] SIP/2.0 200 OK
//! ```
//!
//! Components:
//! - Timestamp: `2024-01-15 10:30:00,123` (optional, comma for milliseconds)
//! - Component: `[CUC-*]` format (Unity Connection component markers)
//! - Common components: `[CUC-SIP.Stack]`, `[CUC-Voicemail]`, `[CUC-TRAP]`, `[CUC-Telephony]`
//! - SIP Message: Standard SIP message content (for SIP-related logs)
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::normalizers::{VendorNormalizer, CucNormalizer};
//!
//! let normalizer = CucNormalizer::new();
//! let log = "[CUC-SIP.Stack] INVITE sip:voicemail@example.com SIP/2.0";
//!
//! let event = normalizer.normalize(log).unwrap();
//! assert_eq!(event.vendor.vendor_type, "cisco_cuc");
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
    // Match CUC timestamp (optional): "2024-01-15 10:30:00,123"
    static ref TIMESTAMP_REGEX: Regex =
        Regex::new(r"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})").unwrap();

    // Match CUC component marker: "[CUC-SIP.Stack]", "[CUC-Voicemail]", etc.
    static ref CUC_COMPONENT_REGEX: Regex = Regex::new(r"\[CUC-([^\]]+)\]").unwrap();

    // Match SIP method
    static ref SIP_METHOD_REGEX: Regex =
        Regex::new(r"\b(INVITE|ACK|BYE|CANCEL|OPTIONS|REGISTER|PRACK|SUBSCRIBE|NOTIFY|PUBLISH|INFO|REFER|MESSAGE|UPDATE)\s+sip:").unwrap();

    // Match SIP response
    static ref SIP_RESPONSE_REGEX: Regex =
        Regex::new(r"SIP/2\.0\s+(\d{3})\s+([^\r\n]+)").unwrap();

    // Match voicemail-specific patterns
    static ref VOICEMAIL_REGEX: Regex = Regex::new(r"(?i)(voicemail|mailbox|greeting|message)").unwrap();

    // Match extension patterns (common in CUC logs)
    static ref EXTENSION_REGEX: Regex = Regex::new(r"\b(extension|ext)[\s:]+(\d{4,10})\b").unwrap();

    // Extract IP addresses and ports
    static ref IP_REGEX: Regex =
        Regex::new(r"\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)\b").unwrap();
}

/// Normalizer for Cisco Unity Connection logs
pub struct CucNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CucNormalizer {
    /// Create a new CUC normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_cuc".to_string(),
            vendor_name: "Cisco Unity Connection".to_string(),
        }
    }

    /// Parse the timestamp from the log line (if present)
    fn parse_timestamp(&self, log_line: &str) -> NormalizationResult<chrono::DateTime<Utc>> {
        if let Some(caps) = TIMESTAMP_REGEX.captures(log_line) {
            let timestamp_str = caps.get(1).unwrap().as_str();
            timestamp_utils::parse_cucm_timestamp(timestamp_str)
        } else {
            // CUC logs may not always have timestamps, use current time
            Ok(Utc::now())
        }
    }

    /// Extract CUC component from log line
    fn extract_component(&self, log_line: &str) -> Option<String> {
        CUC_COMPONENT_REGEX
            .captures(log_line)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Determine if this is a voicemail-related log
    fn is_voicemail_log(&self, log_line: &str) -> bool {
        VOICEMAIL_REGEX.is_match(log_line)
            || log_line.contains("CUC-Voicemail")
            || log_line.contains("CUC-Mailbox")
    }

    /// Determine the event type
    fn determine_event_type(&self, log_line: &str) -> String {
        // Check for SIP method first (higher priority than voicemail context)
        if let Some(caps) = SIP_METHOD_REGEX.captures(log_line) {
            let method = caps.get(1).unwrap().as_str().to_lowercase();
            return format!("sip_{}", method);
        }

        // Check for SIP response
        if let Some(caps) = SIP_RESPONSE_REGEX.captures(log_line) {
            let status = caps.get(1).unwrap().as_str();
            return format!("sip_{}", status);
        }

        // Check for voicemail-specific events (but only if not a SIP message)
        if self.is_voicemail_log(log_line) {
            if log_line.contains("greeting") {
                return "cuc_greeting".to_string();
            } else if log_line.contains("message") {
                return "cuc_message".to_string();
            }
            return "cuc_voicemail".to_string();
        }

        // Check component for event type hints
        if let Some(component) = self.extract_component(log_line) {
            if component.contains("SIP") {
                return "sip_message".to_string();
            } else if component.contains("TRAP") {
                return "cuc_trap".to_string();
            } else if component.contains("Telephony") {
                return "cuc_telephony".to_string();
            }
        }

        // Default
        "cuc_log".to_string()
    }

    /// Extract SIP message (if present)
    fn extract_sip_message(&self, log_line: &str) -> Option<SIPMessage> {
        // Only process if we have SIP content
        if !log_line.contains("SIP") {
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

        let headers = sip_utils::extract_sip_headers(log_line);

        Some(SIPMessage {
            method,
            status_code,
            status_text,
            headers,
            sdp: None,
            direction: None, // CUC logs typically don't have explicit direction markers
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

        Some(NetworkContext {
            source_ip: Some(source_ip),
            source_port: Some(source_port),
            destination_ip: Some(destination_ip),
            destination_port: Some(destination_port),
            protocol: Some("TCP".to_string()), // CUC typically uses TCP for SIP
            interface: None,
            direction: None,
        })
    }

    /// Extract system context (component)
    fn extract_system_context(&self, log_line: &str) -> Option<SystemContext> {
        let component = self.extract_component(log_line);

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

    /// Extract metadata including voicemail-specific information
    fn extract_metadata(&self, log_line: &str) -> HashMap<String, String> {
        let mut metadata = HashMap::new();

        if let Some(component) = self.extract_component(log_line) {
            metadata.insert("component".to_string(), component);
        }

        if self.is_voicemail_log(log_line) {
            metadata.insert("context".to_string(), "voicemail".to_string());
        }

        // Extract extension if present
        if let Some(caps) = EXTENSION_REGEX.captures(log_line) {
            if let Some(ext) = caps.get(2) {
                metadata.insert("extension".to_string(), ext.as_str().to_string());
            }
        }

        metadata
    }
}

impl Default for CucNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for CucNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for CUC-specific markers
        CUC_COMPONENT_REGEX.is_match(log_line)
            || log_line.contains("[CUC-")
            || (log_line.contains("Unity Connection") && TIMESTAMP_REGEX.is_match(log_line))
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
            product: Some("Unity Connection".to_string()),
            version: None,
            confidence: Some(1.0),
            metadata,
        };

        let raw = RawData {
            line: log_line.to_string(),
            line_number: None,
            file_path: None,
            format: Some("cuc_bracketed".to_string()),
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

        // Strong CUC indicator
        if CUC_COMPONENT_REGEX.is_match(log_line) {
            confidence += 0.6;
        }

        // Unity Connection mention
        if log_line.contains("Unity Connection") {
            confidence += 0.3;
        }

        // Timestamp format
        if TIMESTAMP_REGEX.is_match(log_line) {
            confidence += 0.1;
        }

        // Voicemail context
        if self.is_voicemail_log(log_line) {
            confidence += 0.2;
        }

        confidence.min(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_can_normalize_cuc_log() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-SIP.Stack] INVITE sip:voicemail@example.com SIP/2.0";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_can_normalize_with_timestamp() {
        let normalizer = CucNormalizer::new();
        let log = "2024-01-15 10:30:00,123 [CUC-SIP.Stack] test";
        assert!(normalizer.can_normalize(log));
    }

    #[test]
    fn test_normalize_cuc_invite() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-SIP.Stack] INVITE sip:5551234@10.1.1.1:5060 SIP/2.0\r\n\
                   Call-ID: abc123@10.1.1.100\r\n\
                   From: <sip:user@10.1.1.100>;tag=tag1\r\n\
                   To: <sip:voicemail@10.1.1.1>";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.vendor.vendor_type, "cisco_cuc");
        assert_eq!(event.event_type, "sip_invite");
        assert!(event.sip_message.is_some());

        let sip = event.sip_message.unwrap();
        assert_eq!(sip.method, Some("INVITE".to_string()));
        assert_eq!(sip.headers.call_id, Some("abc123@10.1.1.100".to_string()));
    }

    #[test]
    fn test_normalize_cuc_response() {
        let normalizer = CucNormalizer::new();
        let log = "2024-01-15 10:30:01,456 [CUC-SIP.Stack] SIP/2.0 200 OK\r\n\
                   Call-ID: abc123@10.1.1.100";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.event_type, "sip_200");

        let sip = event.sip_message.unwrap();
        assert_eq!(sip.status_code, Some(200));
    }

    #[test]
    fn test_normalize_voicemail_log() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-Voicemail] Processing voicemail for extension 5551234";

        let result = normalizer.normalize(log);
        assert!(result.is_ok());

        let event = result.unwrap();
        assert_eq!(event.vendor.vendor_type, "cisco_cuc");
        assert_eq!(event.event_type, "cuc_voicemail");
    }

    #[test]
    fn test_extract_component() {
        let normalizer = CucNormalizer::new();

        assert_eq!(
            normalizer.extract_component("[CUC-SIP.Stack] test"),
            Some("SIP.Stack".to_string())
        );

        assert_eq!(
            normalizer.extract_component("[CUC-Voicemail] test"),
            Some("Voicemail".to_string())
        );

        assert_eq!(
            normalizer.extract_component("[CUC-TRAP] test"),
            Some("TRAP".to_string())
        );

        assert_eq!(normalizer.extract_component("no component"), None);
    }

    #[test]
    fn test_is_voicemail_log() {
        let normalizer = CucNormalizer::new();

        assert!(normalizer.is_voicemail_log("[CUC-Voicemail] test"));
        assert!(normalizer.is_voicemail_log("Processing voicemail for user"));
        assert!(normalizer.is_voicemail_log("Mailbox access"));
        assert!(!normalizer.is_voicemail_log("[CUC-SIP.Stack] INVITE"));
    }

    #[test]
    fn test_determine_event_type() {
        let normalizer = CucNormalizer::new();

        assert_eq!(
            normalizer.determine_event_type("INVITE sip:test"),
            "sip_invite"
        );

        assert_eq!(normalizer.determine_event_type("SIP/2.0 200 OK"), "sip_200");

        assert_eq!(
            normalizer.determine_event_type("[CUC-Voicemail] greeting"),
            "cuc_greeting"
        );

        assert_eq!(
            normalizer.determine_event_type("[CUC-TRAP] alarm"),
            "cuc_trap"
        );
    }

    #[test]
    fn test_extract_system_context() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-SIP.Stack] test message";

        let system = normalizer.extract_system_context(log);
        assert!(system.is_some());

        let sys = system.unwrap();
        assert_eq!(sys.component, Some("SIP.Stack".to_string()));
    }

    #[test]
    fn test_extract_network_context() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-SIP.Stack] From 10.1.1.100:5060 To 10.1.1.1:5060";

        let network = normalizer.extract_network_context(log);
        assert!(network.is_some());

        let net = network.unwrap();
        assert_eq!(net.source_ip, Some("10.1.1.100".to_string()));
        assert_eq!(net.source_port, Some(5060));
        assert_eq!(net.protocol, Some("TCP".to_string()));
    }

    #[test]
    fn test_extract_metadata() {
        let normalizer = CucNormalizer::new();
        let log = "[CUC-Voicemail] Processing for extension 5551234";

        let metadata = normalizer.extract_metadata(log);
        assert_eq!(metadata.get("component"), Some(&"Voicemail".to_string()));
        assert_eq!(metadata.get("context"), Some(&"voicemail".to_string()));
        assert_eq!(metadata.get("extension"), Some(&"5551234".to_string()));
    }

    #[test]
    fn test_confidence_scoring() {
        let normalizer = CucNormalizer::new();

        let high_confidence = "[CUC-SIP.Stack] INVITE sip:test";
        assert!(normalizer.confidence(high_confidence) >= 0.6);

        let medium_confidence = "Unity Connection log message";
        assert!(normalizer.confidence(medium_confidence) >= 0.3);

        let low_confidence = "Random log line";
        assert!(normalizer.confidence(low_confidence) < 0.3);
    }

    #[test]
    fn test_parse_timestamp() {
        let normalizer = CucNormalizer::new();
        let log = "2024-01-15 10:30:00,123 [CUC-SIP.Stack] test";

        let result = normalizer.parse_timestamp(log);
        assert!(result.is_ok());
    }

    #[test]
    fn test_vendor_info() {
        let normalizer = CucNormalizer::new();
        assert_eq!(normalizer.vendor_id(), "cisco_cuc");
        assert_eq!(normalizer.vendor_name(), "Cisco Unity Connection");
    }
}
