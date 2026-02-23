//! Call Flow Data Types
//!
//! Core data structures for call flow analysis and correlation.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// CTRACE log entry (parsed from normalizer)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CtraceEntry {
    pub timestamp: DateTime<Utc>,
    pub service: String, // SIPL/SIPT
    pub protocol_num: u8,
    pub transport: Transport, // TCP/UDP/TLS
    pub direction: Direction, // IN/OUT
    pub receiver_ip: String,
    pub receiver_port: u16,
    pub mac_address: String,
    pub sender_ip: String,
    pub sender_port: u16,
    pub correlation_id: String,
    pub message_tag: String,
    pub guid: String,        // Call-ID (primary correlation key)
    pub sip_message: String, // INVITE, 200 OK, BYE, etc.
}

/// Transport protocol
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Transport {
    Tcp,
    Udp,
    Tls,
}

impl Transport {
    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "TCP" => Transport::Tcp,
            "UDP" => Transport::Udp,
            "TLS" => Transport::Tls,
            _ => Transport::Tcp, // default
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            Transport::Tcp => "TCP",
            Transport::Udp => "UDP",
            Transport::Tls => "TLS",
        }
    }
}

/// Message direction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Direction {
    In,  // Incoming/Inbound
    Out, // Outgoing/Outbound
}

impl Direction {
    pub fn from_str(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "IN" => Direction::In,
            "OUT" => Direction::Out,
            _ => Direction::In, // default
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            Direction::In => "IN",
            Direction::Out => "OUT",
        }
    }
}

/// Call session (grouped messages by Call-ID)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallSession {
    pub call_id: String, // GUID
    pub correlation_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub caller: Endpoint,
    pub callee: Endpoint,
    pub messages: Vec<CtraceEntry>,
    pub state: CallState,
    pub timings: CallTimings,
}

impl CallSession {
    /// Create a new call session
    pub fn new(call_id: String) -> Self {
        Self {
            call_id,
            correlation_id: String::new(),
            start_time: Utc::now(),
            end_time: None,
            caller: Endpoint::default(),
            callee: Endpoint::default(),
            messages: Vec::new(),
            state: CallState::Initial,
            timings: CallTimings::default(),
        }
    }

    /// Add a message to the session
    pub fn add_message(&mut self, entry: CtraceEntry) {
        // Update start time if this is the first message
        if self.messages.is_empty() {
            self.start_time = entry.timestamp;
            self.correlation_id = entry.correlation_id.clone();
        }

        // Add message
        self.messages.push(entry);

        // Sort chronologically
        self.messages.sort_by_key(|m| m.timestamp);

        // Update endpoints if not set
        if self.messages.len() == 1 {
            self.update_endpoints_from_first_message();
        }
    }

    /// Update endpoints from first INVITE message
    fn update_endpoints_from_first_message(&mut self) {
        if let Some(first) = self.messages.first() {
            if first.sip_message.starts_with("INVITE") {
                self.caller = Endpoint {
                    mac_address: first.mac_address.clone(),
                    ip: first.sender_ip.clone(),
                    port: first.sender_port,
                };
                self.callee = Endpoint {
                    mac_address: String::new(),
                    ip: first.receiver_ip.clone(),
                    port: first.receiver_port,
                };
            }
        }
    }

    /// Get total number of messages
    pub fn message_count(&self) -> usize {
        self.messages.len()
    }

    /// Get number of incoming messages
    pub fn incoming_count(&self) -> usize {
        self.messages
            .iter()
            .filter(|m| m.direction == Direction::In)
            .count()
    }

    /// Get number of outgoing messages
    pub fn outgoing_count(&self) -> usize {
        self.messages
            .iter()
            .filter(|m| m.direction == Direction::Out)
            .count()
    }

    /// Find first message of a specific type
    pub fn find_first_message(&self, msg_type: &str) -> Option<&CtraceEntry> {
        self.messages
            .iter()
            .find(|m| m.sip_message.starts_with(msg_type))
    }

    /// Check if call is active (not terminated or failed)
    pub fn is_active(&self) -> bool {
        matches!(
            self.state,
            CallState::Initial
                | CallState::Calling
                | CallState::Proceeding
                | CallState::Ringing
                | CallState::Connected
        )
    }

    /// Check if call is complete (terminated or failed)
    pub fn is_complete(&self) -> bool {
        matches!(
            self.state,
            CallState::Terminated | CallState::Failed | CallState::Cancelled
        )
    }
}

/// Endpoint (caller or callee)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Endpoint {
    pub mac_address: String,
    pub ip: String,
    pub port: u16,
}

impl Endpoint {
    pub fn new(mac_address: String, ip: String, port: u16) -> Self {
        Self {
            mac_address,
            ip,
            port,
        }
    }

    /// Get display string (e.g., "[SEP00000000111G] 5.5.5.45:58096")
    pub fn display(&self) -> String {
        if self.mac_address.is_empty() {
            format!("{}:{}", self.ip, self.port)
        } else {
            format!("[{}] {}:{}", self.mac_address, self.ip, self.port)
        }
    }
}

/// Call state machine
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CallState {
    Initial,       // No messages yet
    Calling,       // INVITE sent
    Proceeding,    // 1xx received (100 Trying, etc.)
    Ringing,       // 180 Ringing received
    Connected,     // 200 OK + ACK (call established)
    Disconnecting, // BYE sent
    Terminated,    // BYE acknowledged (normal completion)
    Failed,        // 4xx/5xx/6xx error received
    Cancelled,     // CANCEL sent
}

impl CallState {
    pub fn as_str(&self) -> &str {
        match self {
            CallState::Initial => "Initial",
            CallState::Calling => "Calling",
            CallState::Proceeding => "Proceeding",
            CallState::Ringing => "Ringing",
            CallState::Connected => "Connected",
            CallState::Disconnecting => "Disconnecting",
            CallState::Terminated => "Terminated",
            CallState::Failed => "Failed",
            CallState::Cancelled => "Cancelled",
        }
    }

    pub fn is_success(&self) -> bool {
        matches!(self, CallState::Connected | CallState::Terminated)
    }

    pub fn is_error(&self) -> bool {
        matches!(self, CallState::Failed | CallState::Cancelled)
    }
}

/// Call timings (calculated from messages)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CallTimings {
    pub ring_duration: Option<Duration>,      // INVITE → 200 OK
    pub setup_time: Option<Duration>,         // 200 OK → ACK
    pub connected_duration: Option<Duration>, // ACK → BYE
    pub total_duration: Option<Duration>,     // INVITE → Final
}

impl CallTimings {
    /// Get ring duration in seconds
    pub fn ring_duration_secs(&self) -> Option<f64> {
        self.ring_duration.map(|d| d.as_secs_f64())
    }

    /// Get setup time in milliseconds
    pub fn setup_time_ms(&self) -> Option<f64> {
        self.setup_time.map(|d| d.as_millis() as f64)
    }

    /// Get connected duration in seconds
    pub fn connected_duration_secs(&self) -> Option<f64> {
        self.connected_duration.map(|d| d.as_secs_f64())
    }

    /// Get total duration in seconds
    pub fn total_duration_secs(&self) -> Option<f64> {
        self.total_duration.map(|d| d.as_secs_f64())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transport_from_str() {
        assert_eq!(Transport::from_str("TCP"), Transport::Tcp);
        assert_eq!(Transport::from_str("tcp"), Transport::Tcp);
        assert_eq!(Transport::from_str("UDP"), Transport::Udp);
        assert_eq!(Transport::from_str("TLS"), Transport::Tls);
    }

    #[test]
    fn test_direction_from_str() {
        assert_eq!(Direction::from_str("IN"), Direction::In);
        assert_eq!(Direction::from_str("in"), Direction::In);
        assert_eq!(Direction::from_str("OUT"), Direction::Out);
    }

    #[test]
    fn test_call_session_new() {
        let session = CallSession::new("test-call-id".to_string());
        assert_eq!(session.call_id, "test-call-id");
        assert_eq!(session.state, CallState::Initial);
        assert_eq!(session.message_count(), 0);
    }

    #[test]
    fn test_endpoint_display() {
        let endpoint = Endpoint::new("SEP00000000111G".to_string(), "5.5.5.45".to_string(), 58096);
        assert_eq!(endpoint.display(), "[SEP00000000111G] 5.5.5.45:58096");

        let endpoint_no_mac = Endpoint::new(String::new(), "5.5.5.45".to_string(), 58096);
        assert_eq!(endpoint_no_mac.display(), "5.5.5.45:58096");
    }

    #[test]
    fn test_call_state_as_str() {
        assert_eq!(CallState::Initial.as_str(), "Initial");
        assert_eq!(CallState::Connected.as_str(), "Connected");
        assert_eq!(CallState::Failed.as_str(), "Failed");
    }

    #[test]
    fn test_call_state_is_success() {
        assert!(CallState::Connected.is_success());
        assert!(CallState::Terminated.is_success());
        assert!(!CallState::Failed.is_success());
    }

    #[test]
    fn test_call_state_is_error() {
        assert!(CallState::Failed.is_error());
        assert!(CallState::Cancelled.is_error());
        assert!(!CallState::Connected.is_error());
    }
}
