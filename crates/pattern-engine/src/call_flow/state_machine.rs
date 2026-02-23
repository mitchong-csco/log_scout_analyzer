//! Call State Machine
//!
//! Implements state transition logic for SIP call flows.
//!
//! # State Diagram
//!
//! ```text
//!                   ┌─────────┐
//!                   │ Initial │
//!                   └────┬────┘
//!                        │
//!                    INVITE
//!                        │
//!                   ┌────▼────┐
//!            ┌──────┤ Calling ├──────┐
//!            │      └────┬────┘      │
//!            │           │           │
//!         CANCEL      1xx Trying     │
//!            │           │        4xx/5xx
//!            │      ┌────▼────┐      │
//!            │      │Proceed- │      │
//!            │      │  ing    │      │
//!            │      └────┬────┘      │
//!            │           │           │
//!            │      180 Ringing      │
//!            │           │           │
//!            │      ┌────▼────┐      │
//!            │      │ Ringing │      │
//!            │      └────┬────┘      │
//!            │           │           │
//!            │        200 OK         │
//!            │           │           │
//!            │      ┌────▼────┐      │
//!            │      │Connected│      │
//!            │      └────┬────┘      │
//!            │           │           │
//!            │         BYE           │
//!            │           │           │
//!            │   ┌───────▼────────┐  │
//!            │   │ Disconnecting  │  │
//!            │   └───────┬────────┘  │
//!            │           │           │
//!            │       200 OK          │
//!            │           │           │
//!       ┌────▼───────────▼──────┬────▼────┐
//!       │    Cancelled           │  Failed │
//!       └────────────────────────┴─────────┘
//!                        │
//!                   ┌────▼────┐
//!                   │Terminated│
//!                   └─────────┘
//! ```

use super::types::{CallSession, CallState, CtraceEntry};

impl CallSession {
    /// Update call state based on new message
    ///
    /// This method implements the SIP call state machine. It examines the
    /// SIP message and current state to determine the next state.
    pub fn update_state(&mut self, entry: &CtraceEntry) {
        let new_state = match (&self.state, entry.sip_message.as_str()) {
            // Initial → Calling (INVITE received)
            (CallState::Initial, msg) if msg.starts_with("INVITE") => CallState::Calling,

            // Calling → Proceeding (1xx response)
            (CallState::Calling, msg) if is_1xx_response(msg) => {
                if msg.starts_with("180") {
                    CallState::Ringing
                } else {
                    CallState::Proceeding
                }
            }

            // Calling → Failed (error response)
            (CallState::Calling, msg) if is_error_response(msg) => CallState::Failed,

            // Calling → Cancelled (CANCEL received)
            (CallState::Calling, msg) if msg.starts_with("CANCEL") => CallState::Cancelled,

            // Proceeding → Ringing (180 Ringing)
            (CallState::Proceeding, msg) if msg.starts_with("180") => CallState::Ringing,

            // Proceeding → Connected (200 OK)
            (CallState::Proceeding, msg) if msg.starts_with("200") => CallState::Connected,

            // Proceeding → Failed (error response)
            (CallState::Proceeding, msg) if is_error_response(msg) => CallState::Failed,

            // Ringing → Connected (200 OK)
            (CallState::Ringing, msg) if msg.starts_with("200") => CallState::Connected,

            // Ringing → Failed (error response)
            (CallState::Ringing, msg) if is_error_response(msg) => CallState::Failed,

            // Any state → Connected (200 OK to INVITE)
            (_, msg) if msg.starts_with("200") && !self.is_bye_response() => CallState::Connected,

            // Connected → Disconnecting (BYE received)
            (CallState::Connected, msg) if msg.starts_with("BYE") => CallState::Disconnecting,

            // Connected stays Connected on ACK
            (CallState::Connected, msg) if msg.starts_with("ACK") => CallState::Connected,

            // Disconnecting → Terminated (200 OK to BYE)
            (CallState::Disconnecting, msg) if msg.starts_with("200") => {
                self.end_time = Some(entry.timestamp);
                CallState::Terminated
            }

            // Any state → Failed (error response)
            (_, msg) if is_error_response(msg) => CallState::Failed,

            // Any state → Cancelled (CANCEL received)
            (_, msg) if msg.starts_with("CANCEL") => CallState::Cancelled,

            // No state change
            _ => return,
        };

        self.state = new_state;

        // Set end time for terminal states
        if matches!(
            new_state,
            CallState::Terminated | CallState::Failed | CallState::Cancelled
        ) && self.end_time.is_none()
        {
            self.end_time = Some(entry.timestamp);
        }
    }

    /// Check if the last message was BYE (to distinguish 200 OK responses)
    fn is_bye_response(&self) -> bool {
        self.messages
            .iter()
            .rev()
            .take(3) // Check last 3 messages
            .any(|m| m.sip_message.starts_with("BYE"))
    }
}

/// Check if message is a 1xx provisional response
fn is_1xx_response(msg: &str) -> bool {
    msg.starts_with("1") && msg.len() >= 3 && msg.chars().nth(1).unwrap().is_ascii_digit()
}

/// Check if message is an error response (4xx, 5xx, 6xx)
fn is_error_response(msg: &str) -> bool {
    if msg.len() < 3 {
        return false;
    }

    let first_char = msg.chars().next().unwrap();
    matches!(first_char, '4' | '5' | '6')
        && msg.chars().nth(1).unwrap().is_ascii_digit()
        && msg.chars().nth(2).unwrap().is_ascii_digit()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::call_flow::types::{Direction, Transport};
    use chrono::Utc;

    fn create_test_entry(sip_message: &str) -> CtraceEntry {
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
            guid: "call-1".to_string(),
            sip_message: sip_message.to_string(),
        }
    }

    #[test]
    fn test_is_1xx_response() {
        assert!(is_1xx_response("100 Trying"));
        assert!(is_1xx_response("180 Ringing"));
        assert!(is_1xx_response("183 Session Progress"));
        assert!(!is_1xx_response("200 OK"));
        assert!(!is_1xx_response("486 Busy Here"));
    }

    #[test]
    fn test_is_error_response() {
        assert!(is_error_response("400 Bad Request"));
        assert!(is_error_response("404 Not Found"));
        assert!(is_error_response("486 Busy Here"));
        assert!(is_error_response("500 Server Error"));
        assert!(is_error_response("503 Service Unavailable"));
        assert!(is_error_response("600 Busy Everywhere"));
        assert!(is_error_response("603 Decline"));
        assert!(!is_error_response("100 Trying"));
        assert!(!is_error_response("200 OK"));
    }

    #[test]
    fn test_state_machine_invite() {
        let mut session = CallSession::new("call-1".to_string());
        assert_eq!(session.state, CallState::Initial);

        session.update_state(&create_test_entry("INVITE"));
        assert_eq!(session.state, CallState::Calling);
    }

    #[test]
    fn test_state_machine_100_trying() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Calling;

        session.update_state(&create_test_entry("100 Trying"));
        assert_eq!(session.state, CallState::Proceeding);
    }

    #[test]
    fn test_state_machine_180_ringing() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Calling;

        session.update_state(&create_test_entry("180 Ringing"));
        assert_eq!(session.state, CallState::Ringing);
    }

    #[test]
    fn test_state_machine_200_ok() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Ringing;

        session.update_state(&create_test_entry("200 OK"));
        assert_eq!(session.state, CallState::Connected);
    }

    #[test]
    fn test_state_machine_bye() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Connected;

        session.update_state(&create_test_entry("BYE"));
        assert_eq!(session.state, CallState::Disconnecting);
    }

    #[test]
    fn test_state_machine_error() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Calling;

        session.update_state(&create_test_entry("486 Busy Here"));
        assert_eq!(session.state, CallState::Failed);
        assert!(session.end_time.is_some());
    }

    #[test]
    fn test_state_machine_cancel() {
        let mut session = CallSession::new("call-1".to_string());
        session.state = CallState::Calling;

        session.update_state(&create_test_entry("CANCEL"));
        assert_eq!(session.state, CallState::Cancelled);
        assert!(session.end_time.is_some());
    }
}
