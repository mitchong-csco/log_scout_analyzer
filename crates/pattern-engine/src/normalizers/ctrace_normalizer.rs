//! Cisco UCM Call Trace (CTRACE) Normalizer
//!
//! Parses CTRACE format logs from Cisco Unified Call Manager.
//!
//! # CTRACE Format
//!
//! 14 pipe-delimited fields:
//! ```text
//! Timestamp|Service|ProtoNum|Transport|Direction|ReceiverIP|ReceiverPort|MAC|SenderIP|SenderPort|CorrelationID|MessageTag|GUID|SIPMethod
//! ```
//!
//! Example:
//! ```text
//! 2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
//! ```

use super::{NormalizationError, NormalizationResult, VendorNormalizer};
use chrono::{DateTime, NaiveDateTime, Utc};
use log_scout_core::normalized_event::{
    Direction, NetworkContext, NormalizedEvent, RawData, SIPHeaders, SIPMessage, VendorInfo,
};
use std::collections::HashMap;

/// Normalizer for Cisco UCM Call Trace (CTRACE) logs
pub struct CtraceNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CtraceNormalizer {
    /// Create a new CTRACE normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_cucm_ctrace".to_string(),
            vendor_name: "Cisco UCM Call Trace".to_string(),
        }
    }

    /// Parse CTRACE timestamp: yyyy/MM/dd HH:mm:ss:SSS
    fn parse_timestamp(&self, timestamp_str: &str) -> NormalizationResult<DateTime<Utc>> {
        // Format: 2009/12/17 10:45:00.949
        // Note: CTRACE uses colons in time, but we need to handle the milliseconds
        let cleaned = timestamp_str.replace(':', ".");

        NaiveDateTime::parse_from_str(&cleaned, "%Y/%m/%d %H.%M.%S%.3f")
            .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
            .map_err(|_| NormalizationError::InvalidTimestamp(timestamp_str.to_string()))
    }

    /// Parse complete CTRACE line
    fn parse_ctrace_line(&self, line: &str) -> NormalizationResult<CtraceEntry> {
        let parts: Vec<&str> = line.split('|').collect();

        if parts.len() != 14 {
            return Err(NormalizationError::InvalidFormat(format!(
                "Expected 14 fields, found {}",
                parts.len()
            )));
        }

        Ok(CtraceEntry {
            timestamp: self.parse_timestamp(parts[0])?,
            service: parts[1].to_string(),
            protocol_num: parts[2].parse().unwrap_or(0),
            transport: parts[3].to_string(),
            direction: parts[4].to_string(),
            receiver_ip: parts[5].to_string(),
            receiver_port: parts[6].parse().unwrap_or(0),
            mac_address: parts[7].to_string(),
            sender_ip: parts[8].to_string(),
            sender_port: parts[9].parse().unwrap_or(0),
            correlation_id: parts[10].to_string(),
            message_tag: parts[11].to_string(),
            guid: parts[12].to_string(),
            sip_message: parts[13].to_string(),
        })
    }

    /// Determine event type from SIP message
    fn determine_event_type(&self, sip_message: &str) -> String {
        // Check if it's a response code (starts with digits)
        if let Some(code) = sip_message.split_whitespace().next() {
            if code.chars().all(|c| c.is_ascii_digit()) {
                return format!("sip_{}", code);
            }
        }

        // It's a method - extract and lowercase
        let method = sip_message
            .split_whitespace()
            .next()
            .unwrap_or("unknown")
            .to_lowercase();
        format!("sip_{}", method)
    }

    /// Extract network context
    fn extract_network_context(&self, entry: &CtraceEntry) -> NetworkContext {
        let direction = match entry.direction.as_str() {
            "IN" => Direction::Inbound,
            "OUT" => Direction::Outbound,
            _ => Direction::Unknown,
        };

        NetworkContext {
            source_ip: Some(entry.sender_ip.clone()),
            source_port: Some(entry.sender_port),
            destination_ip: Some(entry.receiver_ip.clone()),
            destination_port: Some(entry.receiver_port),
            protocol: Some(entry.transport.clone()),
            interface: None,
            direction: Some(direction),
        }
    }

    /// Create metadata map
    fn create_metadata(&self, entry: &CtraceEntry) -> HashMap<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("guid".to_string(), entry.guid.clone());
        metadata.insert("correlation_id".to_string(), entry.correlation_id.clone());
        metadata.insert("message_tag".to_string(), entry.message_tag.clone());
        metadata.insert("direction".to_string(), entry.direction.clone());
        metadata.insert("mac_address".to_string(), entry.mac_address.clone());
        metadata.insert("service".to_string(), entry.service.clone());
        metadata
    }

    /// Create SIP message structure
    fn create_sip_message(&self, entry: &CtraceEntry) -> SIPMessage {
        let first_word = entry.sip_message.split_whitespace().next().unwrap_or("");

        // Determine if it's a method or response
        let is_response = first_word.chars().all(|c| c.is_ascii_digit());

        let method = if !is_response && !first_word.is_empty() {
            Some(first_word.to_string())
        } else {
            None
        };

        let status_code = if is_response {
            first_word.parse::<u16>().ok()
        } else {
            None
        };

        let status_text = if is_response {
            let words: Vec<&str> = entry.sip_message.split_whitespace().collect();
            if words.len() > 1 {
                Some(words[1..].join(" "))
            } else {
                None
            }
        } else {
            None
        };

        let direction = match entry.direction.as_str() {
            "IN" => Direction::Inbound,
            "OUT" => Direction::Outbound,
            _ => Direction::Unknown,
        };

        SIPMessage {
            method,
            status_code,
            status_text,
            headers: SIPHeaders::default(),
            sdp: None,
            direction: Some(direction),
        }
    }
}

impl Default for CtraceNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for CtraceNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for CTRACE format markers
        (log_line.contains("|SIPL|") || log_line.contains("|SIPT|"))
            && log_line.matches('|').count() >= 13
    }

    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent> {
        let entry = self.parse_ctrace_line(log_line)?;

        let event_type = self.determine_event_type(&entry.sip_message);
        let network = self.extract_network_context(&entry);
        let metadata = self.create_metadata(&entry);
        let sip = self.create_sip_message(&entry);

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
            format: Some("ctrace".to_string()),
        };

        NormalizedEvent::builder()
            .event_type(event_type)
            .timestamp(entry.timestamp)
            .vendor(vendor)
            .raw(raw)
            .network(network)
            .sip_message(sip)
            .build()
            .map_err(NormalizationError::BuildError)
    }

    fn confidence(&self, log_line: &str) -> f32 {
        let mut confidence: f32 = 0.0;

        // Check for SIPL or SIPT markers (strong indicator)
        if log_line.contains("|SIPL|") || log_line.contains("|SIPT|") {
            confidence += 0.5;
        }

        // Check for exactly 13 pipe delimiters (14 fields)
        if log_line.matches('|').count() == 13 {
            confidence += 0.3;
        }

        // Check for timestamp pattern at start
        if log_line.starts_with(|c: char| c.is_ascii_digit()) {
            confidence += 0.2;
        }

        confidence.min(1.0)
    }
}

/// Internal struct for parsed CTRACE entry
#[derive(Debug, Clone)]
struct CtraceEntry {
    timestamp: DateTime<Utc>,
    service: String,
    protocol_num: u8,
    transport: String,
    direction: String,
    receiver_ip: String,
    receiver_port: u16,
    mac_address: String,
    sender_ip: String,
    sender_port: u16,
    correlation_id: String,
    message_tag: String,
    guid: String,
    sip_message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_timestamp() {
        let normalizer = CtraceNormalizer::new();
        let result = normalizer.parse_timestamp("2009/12/17 10:45:00.949");
        assert!(result.is_ok());

        let timestamp = result.unwrap();
        assert_eq!(timestamp.format("%Y/%m/%d").to_string(), "2009/12/17");
    }

    #[test]
    fn test_parse_ctrace_entry() {
        let normalizer = CtraceNormalizer::new();
        let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

        let result = normalizer.parse_ctrace_line(log);
        assert!(result.is_ok());

        let entry = result.unwrap();
        assert_eq!(entry.service, "SIPL");
        assert_eq!(entry.transport, "TCP");
        assert_eq!(entry.direction, "IN");
        assert_eq!(entry.guid, "001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240");
        assert_eq!(entry.sip_message, "INVITE");
    }

    #[test]
    fn test_determine_event_type_method() {
        let normalizer = CtraceNormalizer::new();
        assert_eq!(normalizer.determine_event_type("INVITE"), "sip_invite");
        assert_eq!(normalizer.determine_event_type("BYE"), "sip_bye");
        assert_eq!(normalizer.determine_event_type("ACK"), "sip_ack");
    }

    #[test]
    fn test_determine_event_type_response() {
        let normalizer = CtraceNormalizer::new();
        assert_eq!(normalizer.determine_event_type("100 Trying"), "sip_100");
        assert_eq!(normalizer.determine_event_type("180 Ringing"), "sip_180");
        assert_eq!(normalizer.determine_event_type("200 OK"), "sip_200");
    }
}
