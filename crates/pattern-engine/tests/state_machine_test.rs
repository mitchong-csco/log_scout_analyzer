//! Call State Machine Tests
//!
//! Tests for call state transition logic

use chrono::Utc;
use pattern_engine::call_flow::{
    CallCorrelator, CallSession, CallState, CtraceEntry, Direction, Transport,
};

/// Helper function to create a test CTRACE entry
fn create_test_entry(
    guid: &str,
    timestamp_offset_secs: i64,
    direction: Direction,
    sip_message: &str,
) -> CtraceEntry {
    let timestamp = Utc::now() + chrono::Duration::seconds(timestamp_offset_secs);

    CtraceEntry {
        timestamp,
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction,
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
fn test_initial_state() {
    let session = CallSession::new("call-1".to_string());
    assert_eq!(session.state, CallState::Initial);
}

#[test]
fn test_invite_transitions_to_calling() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Calling);
}

#[test]
fn test_100_trying_transitions_to_proceeding() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Proceeding);
}

#[test]
fn test_180_ringing_transitions_to_ringing() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Ringing);
}

#[test]
fn test_200_ok_transitions_to_connected() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Connected);
}

#[test]
fn test_bye_transitions_to_disconnecting() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "200 OK"));
    correlator.add_message(create_test_entry("call-1", 2, Direction::In, "BYE"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Disconnecting);
}

#[test]
fn test_bye_200_ok_transitions_to_terminated() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "200 OK"));
    correlator.add_message(create_test_entry("call-1", 2, Direction::In, "BYE"));
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Terminated);
}

#[test]
fn test_4xx_error_transitions_to_failed() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "486 Busy Here"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Failed);
}

#[test]
fn test_5xx_error_transitions_to_failed() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry(
        "call-1",
        1,
        Direction::Out,
        "500 Server Error",
    ));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Failed);
}

#[test]
fn test_6xx_error_transitions_to_failed() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry(
        "call-1",
        1,
        Direction::Out,
        "603 Decline",
    ));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Failed);
}

#[test]
fn test_cancel_transitions_to_cancelled() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::In, "CANCEL"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Cancelled);
}

#[test]
fn test_complete_successful_call_flow() {
    let mut correlator = CallCorrelator::new();

    // INVITE
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Calling
    );

    // 100 Trying
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Proceeding
    );

    // 180 Ringing
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Ringing
    );

    // 200 OK
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Connected
    );

    // ACK (stays Connected)
    correlator.add_message(create_test_entry("call-1", 4, Direction::In, "ACK"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Connected
    );

    // BYE
    correlator.add_message(create_test_entry("call-1", 5, Direction::In, "BYE"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Disconnecting
    );

    // 200 OK (to BYE)
    correlator.add_message(create_test_entry("call-1", 6, Direction::Out, "200 OK"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Terminated
    );
}

#[test]
fn test_direct_180_without_100() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry(
        "call-1",
        1,
        Direction::Out,
        "180 Ringing",
    ));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Ringing);
}

#[test]
fn test_183_session_progress_transitions_to_proceeding() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry(
        "call-1",
        1,
        Direction::Out,
        "183 Session Progress",
    ));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.state, CallState::Proceeding);
}

#[test]
fn test_state_is_success() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "200 OK"));

    let session = correlator.get_session("call-1").unwrap();
    assert!(session.state.is_success());
    assert!(!session.state.is_error());
}

#[test]
fn test_state_is_error() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "486 Busy Here"));

    let session = correlator.get_session("call-1").unwrap();
    assert!(!session.state.is_success());
    assert!(session.state.is_error());
}

#[test]
fn test_session_is_complete() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "200 OK"));
    correlator.add_message(create_test_entry("call-1", 2, Direction::In, "BYE"));
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));

    let session = correlator.get_session("call-1").unwrap();
    assert!(session.is_complete());
    assert!(!session.is_active());
}

#[test]
fn test_ack_does_not_change_connected_state() {
    let mut correlator = CallCorrelator::new();
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "200 OK"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Connected
    );

    correlator.add_message(create_test_entry("call-1", 2, Direction::In, "ACK"));
    assert_eq!(
        correlator.get_session("call-1").unwrap().state,
        CallState::Connected
    );
}
