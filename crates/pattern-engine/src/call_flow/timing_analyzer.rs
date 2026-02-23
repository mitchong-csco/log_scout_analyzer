//! Timing Analyzer
//!
//! Calculates timing metrics for call flows (ring duration, setup time, connected duration).
//!
//! # Timing Metrics
//!
//! - **Ring Duration**: Time from INVITE to 200 OK (call setup time)
//! - **Setup Time**: Time from 200 OK to ACK (call establishment)
//! - **Connected Duration**: Time from ACK to BYE (active call time)
//! - **Total Duration**: Time from INVITE to final message (overall call time)
//!
//! # Example
//!
//! ```
//! use pattern_engine::call_flow::CallSession;
//!
//! let session = CallSession::new("call-1".to_string());
//! // ... add messages ...
//!
//! if let Some(ring_secs) = session.timings.ring_duration_secs() {
//!     println!("Ring duration: {:.2}s", ring_secs);
//! }
//! ```

use super::types::{CallSession, CtraceEntry};
use std::time::Duration;

impl CallSession {
    /// Calculate all timing metrics for the call
    ///
    /// This should be called after adding messages to update timing information.
    pub fn calculate_timings(&mut self) {
        // Ring Duration: INVITE → 200 OK
        self.timings.ring_duration = self.calculate_ring_duration();

        // Setup Time: 200 OK → ACK
        self.timings.setup_time = self.calculate_setup_time();

        // Connected Duration: ACK → BYE
        self.timings.connected_duration = self.calculate_connected_duration();

        // Total Duration: INVITE → Final message
        self.timings.total_duration = self.calculate_total_duration();
    }

    /// Calculate ring duration (INVITE → 200 OK)
    fn calculate_ring_duration(&self) -> Option<Duration> {
        let invite_time = self.find_first_message("INVITE")?.timestamp;
        let ok_time = self.find_first_ok_response()?.timestamp;

        Some(duration_between(invite_time, ok_time))
    }

    /// Calculate setup time (200 OK → ACK)
    fn calculate_setup_time(&self) -> Option<Duration> {
        let ok_time = self.find_first_ok_response()?.timestamp;
        let ack_time = self.find_first_message("ACK")?.timestamp;

        Some(duration_between(ok_time, ack_time))
    }

    /// Calculate connected duration (ACK → BYE)
    fn calculate_connected_duration(&self) -> Option<Duration> {
        let ack_time = self.find_first_message("ACK")?.timestamp;
        let bye_time = self.find_first_message("BYE")?.timestamp;

        Some(duration_between(ack_time, bye_time))
    }

    /// Calculate total duration (INVITE → Final message)
    fn calculate_total_duration(&self) -> Option<Duration> {
        let invite_time = self.find_first_message("INVITE")?.timestamp;

        // Use end_time if set, otherwise use last message timestamp
        let end_time = self
            .end_time
            .or_else(|| self.messages.last().map(|m| m.timestamp))?;

        Some(duration_between(invite_time, end_time))
    }

    /// Find first 200 OK response (not a response to BYE)
    fn find_first_ok_response(&self) -> Option<&CtraceEntry> {
        // Find the first 200 OK that's not preceded by BYE
        let mut prev_was_bye = false;

        for msg in &self.messages {
            if msg.sip_message.starts_with("BYE") {
                prev_was_bye = true;
            } else if msg.sip_message.starts_with("200") {
                if !prev_was_bye {
                    return Some(msg);
                }
                prev_was_bye = false;
            } else if !msg.sip_message.starts_with("ACK") {
                // Reset flag on non-ACK, non-200, non-BYE messages
                prev_was_bye = false;
            }
        }

        None
    }
}

/// Calculate duration between two timestamps
fn duration_between(
    start: chrono::DateTime<chrono::Utc>,
    end: chrono::DateTime<chrono::Utc>,
) -> Duration {
    let diff = end.signed_duration_since(start);

    // Convert to std::time::Duration, handling negative durations
    if diff.num_milliseconds() < 0 {
        Duration::from_millis(0)
    } else {
        Duration::from_millis(diff.num_milliseconds() as u64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::call_flow::types::{CallTimings, CtraceEntry, Direction, Transport};
    use chrono::Utc;

    fn create_test_entry(offset_secs: i64, sip_message: &str) -> CtraceEntry {
        let timestamp = Utc::now() + chrono::Duration::seconds(offset_secs);

        CtraceEntry {
            timestamp,
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
            guid: "call-1".to_string(),
            sip_message: sip_message.to_string(),
        }
    }

    #[test]
    fn test_calculate_ring_duration() {
        let mut session = CallSession::new("call-1".to_string());

        session.add_message(create_test_entry(0, "INVITE"));
        session.add_message(create_test_entry(5, "200 OK"));

        session.calculate_timings();

        let ring_secs = session.timings.ring_duration_secs().unwrap();
        assert!((ring_secs - 5.0).abs() < 0.1);
    }

    #[test]
    fn test_calculate_setup_time() {
        let mut session = CallSession::new("call-1".to_string());

        session.add_message(create_test_entry(0, "INVITE"));
        session.add_message(create_test_entry(2, "200 OK"));
        session.add_message(create_test_entry(3, "ACK"));

        session.calculate_timings();

        let setup_ms = session.timings.setup_time_ms().unwrap();
        assert!((setup_ms - 1000.0).abs() < 100.0);
    }

    #[test]
    fn test_calculate_connected_duration() {
        let mut session = CallSession::new("call-1".to_string());

        session.add_message(create_test_entry(0, "INVITE"));
        session.add_message(create_test_entry(2, "200 OK"));
        session.add_message(create_test_entry(3, "ACK"));
        session.add_message(create_test_entry(10, "BYE"));

        session.calculate_timings();

        let connected_secs = session.timings.connected_duration_secs().unwrap();
        assert!((connected_secs - 7.0).abs() < 0.1);
    }

    #[test]
    fn test_calculate_total_duration() {
        let mut session = CallSession::new("call-1".to_string());

        session.add_message(create_test_entry(0, "INVITE"));
        session.add_message(create_test_entry(2, "200 OK"));
        session.add_message(create_test_entry(3, "ACK"));
        session.add_message(create_test_entry(10, "BYE"));
        session.add_message(create_test_entry(11, "200 OK"));

        session.end_time = Some(Utc::now() + chrono::Duration::seconds(11));

        session.calculate_timings();

        let total_secs = session.timings.total_duration_secs().unwrap();
        assert!((total_secs - 11.0).abs() < 0.1);
    }

    #[test]
    fn test_no_timings_without_messages() {
        let mut session = CallSession::new("call-1".to_string());
        session.calculate_timings();

        assert!(session.timings.ring_duration_secs().is_none());
        assert!(session.timings.setup_time_ms().is_none());
        assert!(session.timings.connected_duration_secs().is_none());
    }

    #[test]
    fn test_find_first_ok_response_ignores_bye_response() {
        let mut session = CallSession::new("call-1".to_string());

        let base_time = Utc::now();
        session.add_message(create_test_entry(0, "INVITE"));
        session.add_message(create_test_entry(2, "200 OK")); // This one
        session.add_message(create_test_entry(3, "ACK"));
        session.add_message(create_test_entry(10, "BYE"));
        session.add_message(create_test_entry(11, "200 OK")); // Not this one

        let ok = session.find_first_ok_response().unwrap();
        // Check that it's the 200 OK at offset 2, not the one at offset 11
        let expected = base_time + chrono::Duration::seconds(2);
        let diff = (ok.timestamp - expected).num_milliseconds().abs();
        assert!(
            diff < 100,
            "Expected timestamp near {:?}, got {:?}",
            expected,
            ok.timestamp
        );
    }

    #[test]
    fn test_duration_between() {
        let start = Utc::now();
        let end = start + chrono::Duration::seconds(5);

        let duration = duration_between(start, end);
        assert_eq!(duration.as_secs(), 5);
    }

    #[test]
    fn test_negative_duration_becomes_zero() {
        let start = Utc::now();
        let end = start - chrono::Duration::seconds(5);

        let duration = duration_between(start, end);
        assert_eq!(duration.as_secs(), 0);
    }
}
