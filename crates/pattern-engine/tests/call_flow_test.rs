//! Call Flow Correlator Tests
//!
//! Tests for grouping CTRACE messages by Call-ID into call sessions

use chrono::Utc;
use pattern_engine::call_flow::{CallCorrelator, CallSession, CtraceEntry, Direction, Transport};

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
fn test_correlate_single_call() {
    let mut correlator = CallCorrelator::new();

    let entry = create_test_entry("call-1", 0, Direction::In, "INVITE");
    correlator.add_message(entry);

    let sessions = correlator.get_sessions();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].call_id, "call-1");
    assert_eq!(sessions[0].message_count(), 1);
}

#[test]
fn test_correlate_multiple_messages_same_call() {
    let mut correlator = CallCorrelator::new();

    // INVITE
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));

    // 100 Trying
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));

    // 180 Ringing
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));

    // 200 OK
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));

    let sessions = correlator.get_sessions();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].message_count(), 4);
}

#[test]
fn test_correlate_multiple_concurrent_calls() {
    let mut correlator = CallCorrelator::new();

    // Call 1 - INVITE
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));

    // Call 2 - INVITE (different call, interleaved)
    correlator.add_message(create_test_entry("call-2", 1, Direction::In, "INVITE"));

    // Call 1 - 100 Trying
    correlator.add_message(create_test_entry("call-1", 2, Direction::Out, "100 Trying"));

    // Call 2 - 100 Trying
    correlator.add_message(create_test_entry("call-2", 3, Direction::Out, "100 Trying"));

    // Call 1 - 200 OK
    correlator.add_message(create_test_entry("call-1", 4, Direction::Out, "200 OK"));

    let sessions = correlator.get_sessions();
    assert_eq!(sessions.len(), 2);

    // Find each call
    let call1 = sessions.iter().find(|s| s.call_id == "call-1").unwrap();
    let call2 = sessions.iter().find(|s| s.call_id == "call-2").unwrap();

    assert_eq!(call1.message_count(), 3);
    assert_eq!(call2.message_count(), 2);
}

#[test]
fn test_messages_sorted_chronologically() {
    let mut correlator = CallCorrelator::new();

    // Add messages out of order
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));

    let sessions = correlator.get_sessions();
    let session = &sessions[0];

    // Verify messages are sorted by timestamp
    assert_eq!(session.messages[0].sip_message, "INVITE");
    assert_eq!(session.messages[1].sip_message, "100 Trying");
    assert_eq!(session.messages[2].sip_message, "180 Ringing");
    assert_eq!(session.messages[3].sip_message, "200 OK");
}

#[test]
fn test_get_session_by_call_id() {
    let mut correlator = CallCorrelator::new();

    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-2", 1, Direction::In, "INVITE"));

    let session = correlator.get_session("call-1");
    assert!(session.is_some());
    assert_eq!(session.unwrap().call_id, "call-1");

    let missing = correlator.get_session("call-999");
    assert!(missing.is_none());
}

#[test]
fn test_session_incoming_outgoing_counts() {
    let mut correlator = CallCorrelator::new();

    // 2 incoming, 3 outgoing
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));
    correlator.add_message(create_test_entry(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));
    correlator.add_message(create_test_entry("call-1", 3, Direction::Out, "200 OK"));
    correlator.add_message(create_test_entry("call-1", 4, Direction::In, "ACK"));

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.message_count(), 5);
    assert_eq!(session.incoming_count(), 2);
    assert_eq!(session.outgoing_count(), 3);
}

#[test]
fn test_session_start_time_from_first_message() {
    let mut correlator = CallCorrelator::new();

    let entry1 = create_test_entry("call-1", 0, Direction::In, "INVITE");
    let entry2 = create_test_entry("call-1", 5, Direction::Out, "100 Trying");

    correlator.add_message(entry1.clone());
    correlator.add_message(entry2);

    let session = correlator.get_session("call-1").unwrap();

    // Start time should match first message timestamp
    assert_eq!(session.start_time, entry1.timestamp);
}

#[test]
fn test_session_correlation_id() {
    let mut correlator = CallCorrelator::new();

    let entry = create_test_entry("call-1", 0, Direction::In, "INVITE");
    correlator.add_message(entry);

    let session = correlator.get_session("call-1").unwrap();
    assert_eq!(session.correlation_id, "correlation-id");
}

#[test]
fn test_find_first_message() {
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

    let invite = session.find_first_message("INVITE");
    assert!(invite.is_some());
    assert_eq!(invite.unwrap().sip_message, "INVITE");

    let ok = session.find_first_message("200");
    assert!(ok.is_some());
    assert_eq!(ok.unwrap().sip_message, "200 OK");

    let bye = session.find_first_message("BYE");
    assert!(bye.is_none());
}

#[test]
fn test_session_endpoints_from_invite() {
    let mut correlator = CallCorrelator::new();

    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));

    let session = correlator.get_session("call-1").unwrap();

    // Caller should be sender from INVITE
    assert_eq!(session.caller.ip, "5.5.5.240");
    assert_eq!(session.caller.port, 5060);
    assert_eq!(session.caller.mac_address, "SEP00000000111G");

    // Callee should be receiver from INVITE
    assert_eq!(session.callee.ip, "5.5.5.45");
    assert_eq!(session.callee.port, 58096);
}

#[test]
fn test_empty_correlator() {
    let correlator = CallCorrelator::new();

    let sessions = correlator.get_sessions();
    assert_eq!(sessions.len(), 0);

    let session = correlator.get_session("any-call");
    assert!(session.is_none());
}

#[test]
fn test_session_is_active() {
    let session = CallSession::new("call-1".to_string());

    // Initial state is active
    assert!(session.is_active());
    assert!(!session.is_complete());
}

#[test]
fn test_call_list() {
    let mut correlator = CallCorrelator::new();

    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-2", 1, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-3", 2, Direction::In, "INVITE"));

    let call_ids = correlator.list_call_ids();
    assert_eq!(call_ids.len(), 3);
    assert!(call_ids.contains(&"call-1".to_string()));
    assert!(call_ids.contains(&"call-2".to_string()));
    assert!(call_ids.contains(&"call-3".to_string()));
}

#[test]
fn test_correlator_statistics() {
    let mut correlator = CallCorrelator::new();

    // Add 3 calls with varying message counts
    correlator.add_message(create_test_entry("call-1", 0, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-1", 1, Direction::Out, "100 Trying"));

    correlator.add_message(create_test_entry("call-2", 2, Direction::In, "INVITE"));
    correlator.add_message(create_test_entry("call-2", 3, Direction::Out, "100 Trying"));
    correlator.add_message(create_test_entry(
        "call-2",
        4,
        Direction::Out,
        "180 Ringing",
    ));

    correlator.add_message(create_test_entry("call-3", 5, Direction::In, "INVITE"));

    assert_eq!(correlator.call_count(), 3);
    assert_eq!(correlator.total_message_count(), 6);
}
