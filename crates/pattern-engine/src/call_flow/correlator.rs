//! Call Correlator
//!
//! Groups CTRACE messages by Call-ID (GUID) into call sessions.

use super::types::{CallSession, CtraceEntry};
use std::collections::HashMap;

/// Call correlator - groups messages by Call-ID
#[derive(Debug)]
pub struct CallCorrelator {
    sessions: HashMap<String, CallSession>,
}

impl CallCorrelator {
    /// Create a new call correlator
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    /// Add a message to the correlator
    ///
    /// Messages are automatically grouped by their GUID (Call-ID).
    /// If a session for this Call-ID doesn't exist, it's created.
    pub fn add_message(&mut self, entry: CtraceEntry) {
        let call_id = entry.guid.clone();

        // Get or create session for this Call-ID
        let session = self
            .sessions
            .entry(call_id.clone())
            .or_insert_with(|| CallSession::new(call_id));

        // Add message to session
        session.add_message(entry);
    }

    /// Get all call sessions
    pub fn get_sessions(&self) -> Vec<CallSession> {
        self.sessions.values().cloned().collect()
    }

    /// Get a specific session by Call-ID
    pub fn get_session(&self, call_id: &str) -> Option<&CallSession> {
        self.sessions.get(call_id)
    }

    /// Get a mutable reference to a session
    pub fn get_session_mut(&mut self, call_id: &str) -> Option<&mut CallSession> {
        self.sessions.get_mut(call_id)
    }

    /// List all Call-IDs
    pub fn list_call_ids(&self) -> Vec<String> {
        self.sessions.keys().cloned().collect()
    }

    /// Get total number of calls
    pub fn call_count(&self) -> usize {
        self.sessions.len()
    }

    /// Get total number of messages across all calls
    pub fn total_message_count(&self) -> usize {
        self.sessions.values().map(|s| s.message_count()).sum()
    }

    /// Clear all sessions
    pub fn clear(&mut self) {
        self.sessions.clear();
    }

    /// Remove a specific session
    pub fn remove_session(&mut self, call_id: &str) -> Option<CallSession> {
        self.sessions.remove(call_id)
    }

    /// Get sessions sorted by start time (oldest first)
    pub fn get_sessions_sorted(&self) -> Vec<CallSession> {
        let mut sessions = self.get_sessions();
        sessions.sort_by_key(|s| s.start_time);
        sessions
    }

    /// Get active sessions (not terminated or failed)
    pub fn get_active_sessions(&self) -> Vec<CallSession> {
        self.sessions
            .values()
            .filter(|s| s.is_active())
            .cloned()
            .collect()
    }

    /// Get completed sessions (terminated or failed)
    pub fn get_completed_sessions(&self) -> Vec<CallSession> {
        self.sessions
            .values()
            .filter(|s| s.is_complete())
            .cloned()
            .collect()
    }
}

impl Default for CallCorrelator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::call_flow::types::{Direction, Transport};
    use chrono::Utc;

    fn create_test_entry(guid: &str, sip_message: &str) -> CtraceEntry {
        CtraceEntry {
            timestamp: Utc::now(),
            service: "SIPL".to_string(),
            protocol_num: 0,
            transport: Transport::Tcp,
            direction: Direction::In,
            receiver_ip: "5.5.5.45".to_string(),
            receiver_port: 58096,
            mac_address: "SEP00000000111G".to_string(),
            sender_ip: "5.5.5.240".to_string(),
            sender_port: 5060,
            correlation_id: "correlation-id".to_string(),
            message_tag: "MessageTag1".to_string(),
            guid: guid.to_string(),
            sip_message: sip_message.to_string(),
        }
    }

    #[test]
    fn test_new_correlator() {
        let correlator = CallCorrelator::new();
        assert_eq!(correlator.call_count(), 0);
        assert_eq!(correlator.total_message_count(), 0);
    }

    #[test]
    fn test_add_single_message() {
        let mut correlator = CallCorrelator::new();
        correlator.add_message(create_test_entry("call-1", "INVITE"));

        assert_eq!(correlator.call_count(), 1);
        assert_eq!(correlator.total_message_count(), 1);
    }

    #[test]
    fn test_clear() {
        let mut correlator = CallCorrelator::new();
        correlator.add_message(create_test_entry("call-1", "INVITE"));
        correlator.add_message(create_test_entry("call-2", "INVITE"));

        assert_eq!(correlator.call_count(), 2);

        correlator.clear();
        assert_eq!(correlator.call_count(), 0);
    }

    #[test]
    fn test_remove_session() {
        let mut correlator = CallCorrelator::new();
        correlator.add_message(create_test_entry("call-1", "INVITE"));
        correlator.add_message(create_test_entry("call-2", "INVITE"));

        let removed = correlator.remove_session("call-1");
        assert!(removed.is_some());
        assert_eq!(correlator.call_count(), 1);

        let missing = correlator.remove_session("call-999");
        assert!(missing.is_none());
    }

    #[test]
    fn test_get_sessions_sorted() {
        let mut correlator = CallCorrelator::new();

        // Add in random order
        correlator.add_message(create_test_entry("call-2", "INVITE"));
        std::thread::sleep(std::time::Duration::from_millis(10));
        correlator.add_message(create_test_entry("call-1", "INVITE"));
        std::thread::sleep(std::time::Duration::from_millis(10));
        correlator.add_message(create_test_entry("call-3", "INVITE"));

        let sorted = correlator.get_sessions_sorted();
        // Should be sorted by start time
        assert!(sorted[0].start_time <= sorted[1].start_time);
        assert!(sorted[1].start_time <= sorted[2].start_time);
    }
}
