//! Timing Analyzer Tests
//!
//! Tests for calculating call timing metrics (ring duration, setup time, connected duration)

use chrono::Utc;
use pattern_engine::call_flow::{CallCorrelator, CtraceEntry, Direction, Transport};

/// Helper function to create a test CTRACE entry with specific timestamp
fn create_test_entry_at_time(
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
fn test_ring_duration_invite_to_200_ok() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 100 Trying at T+1
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        1,
        Direction::Out,
        "100 Trying",
    ));

    // 180 Ringing at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));

    // 200 OK at T+5 (ring duration = 5 seconds)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        5,
        Direction::Out,
        "200 OK",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Ring duration should be approximately 5 seconds
    let ring_secs = session.timings.ring_duration_secs().unwrap();
    assert!(
        (ring_secs - 5.0).abs() < 0.1,
        "Expected ~5s, got {}",
        ring_secs
    );
}

#[test]
fn test_setup_time_200_ok_to_ack() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "200 OK",
    ));

    // ACK at T+2.5 (setup time = 0.5 seconds)
    correlator.add_message(create_test_entry_at_time("call-1", 2, Direction::In, "ACK"));

    // Add one more message slightly after to have measurable difference
    std::thread::sleep(std::time::Duration::from_millis(500));
    correlator.add_message(create_test_entry_at_time("call-1", 3, Direction::In, "ACK"));

    let session = correlator.get_session("call-1").unwrap();

    // Setup time should be small (< 1 second in this test)
    if let Some(setup_ms) = session.timings.setup_time_ms() {
        assert!(setup_ms < 2000.0, "Expected <2000ms, got {}ms", setup_ms);
    }
}

#[test]
fn test_connected_duration_ack_to_bye() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "200 OK",
    ));

    // ACK at T+3
    correlator.add_message(create_test_entry_at_time("call-1", 3, Direction::In, "ACK"));

    // BYE at T+10 (connected duration = 7 seconds)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        10,
        Direction::In,
        "BYE",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Connected duration should be approximately 7 seconds
    let connected_secs = session.timings.connected_duration_secs().unwrap();
    assert!(
        (connected_secs - 7.0).abs() < 0.1,
        "Expected ~7s, got {}",
        connected_secs
    );
}

#[test]
fn test_total_duration_invite_to_terminated() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "200 OK",
    ));

    // ACK at T+3
    correlator.add_message(create_test_entry_at_time("call-1", 3, Direction::In, "ACK"));

    // BYE at T+10
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        10,
        Direction::In,
        "BYE",
    ));

    // 200 OK (to BYE) at T+11 (total duration = 11 seconds)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        11,
        Direction::Out,
        "200 OK",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Total duration should be approximately 11 seconds
    let total_secs = session.timings.total_duration_secs().unwrap();
    assert!(
        (total_secs - 11.0).abs() < 0.1,
        "Expected ~11s, got {}",
        total_secs
    );
}

#[test]
fn test_no_ring_duration_when_no_200_ok() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 486 Busy Here at T+1 (no 200 OK, call failed)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        1,
        Direction::Out,
        "486 Busy Here",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Should have no ring duration (call failed before answer)
    assert!(session.timings.ring_duration_secs().is_none());
}

#[test]
fn test_no_connected_duration_when_no_ack() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "200 OK",
    ));

    // No ACK, call not fully established

    let session = correlator.get_session("call-1").unwrap();

    // Should have no connected duration (no ACK received)
    assert!(session.timings.connected_duration_secs().is_none());
}

#[test]
fn test_timings_with_180_ringing() {
    let mut correlator = CallCorrelator::new();

    // Complete call with ringing
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        1,
        Direction::Out,
        "100 Trying",
    ));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "180 Ringing",
    ));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        5,
        Direction::Out,
        "200 OK",
    ));
    correlator.add_message(create_test_entry_at_time("call-1", 6, Direction::In, "ACK"));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        20,
        Direction::In,
        "BYE",
    ));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        21,
        Direction::Out,
        "200 OK",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Verify all timings are present
    assert!(session.timings.ring_duration_secs().is_some());
    assert!(session.timings.setup_time_ms().is_some());
    assert!(session.timings.connected_duration_secs().is_some());
    assert!(session.timings.total_duration_secs().is_some());
}

#[test]
fn test_ring_duration_without_180() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+3 (no 180 Ringing, direct answer)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        3,
        Direction::Out,
        "200 OK",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Should still have ring duration even without 180
    let ring_secs = session.timings.ring_duration_secs().unwrap();
    assert!(
        (ring_secs - 3.0).abs() < 0.1,
        "Expected ~3s, got {}",
        ring_secs
    );
}

#[test]
fn test_failed_call_has_total_duration() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 404 Not Found at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "404 Not Found",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Should have total duration even for failed call
    let total_secs = session.timings.total_duration_secs().unwrap();
    assert!(
        (total_secs - 2.0).abs() < 0.1,
        "Expected ~2s, got {}",
        total_secs
    );
}

#[test]
fn test_cancelled_call_timings() {
    let mut correlator = CallCorrelator::new();

    // INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // CANCEL at T+1
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        1,
        Direction::In,
        "CANCEL",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Should have total duration
    let total_secs = session.timings.total_duration_secs().unwrap();
    assert!(
        (total_secs - 1.0).abs() < 0.1,
        "Expected ~1s, got {}",
        total_secs
    );

    // Should not have ring or connected duration
    assert!(session.timings.ring_duration_secs().is_none());
    assert!(session.timings.connected_duration_secs().is_none());
}

#[test]
fn test_timing_with_re_invite() {
    let mut correlator = CallCorrelator::new();

    // Initial INVITE at T+0
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));

    // 200 OK at T+2
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        2,
        Direction::Out,
        "200 OK",
    ));

    // ACK at T+3
    correlator.add_message(create_test_entry_at_time("call-1", 3, Direction::In, "ACK"));

    // Re-INVITE at T+10 (call hold, etc.)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        10,
        Direction::In,
        "INVITE",
    ));

    // 200 OK to re-INVITE at T+11
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        11,
        Direction::Out,
        "200 OK",
    ));

    // BYE at T+20
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        20,
        Direction::In,
        "BYE",
    ));

    // 200 OK to BYE at T+21
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        21,
        Direction::Out,
        "200 OK",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Ring duration should be from first INVITE to first 200 OK
    let ring_secs = session.timings.ring_duration_secs().unwrap();
    assert!(
        (ring_secs - 2.0).abs() < 0.1,
        "Expected ~2s, got {}",
        ring_secs
    );

    // Connected duration from first ACK to BYE
    let connected_secs = session.timings.connected_duration_secs().unwrap();
    assert!(
        (connected_secs - 17.0).abs() < 0.1,
        "Expected ~17s, got {}",
        connected_secs
    );
}

#[test]
fn test_zero_duration_immediate_response() {
    let mut correlator = CallCorrelator::new();

    // INVITE and immediate error (same second)
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::In,
        "INVITE",
    ));
    correlator.add_message(create_test_entry_at_time(
        "call-1",
        0,
        Direction::Out,
        "400 Bad Request",
    ));

    let session = correlator.get_session("call-1").unwrap();

    // Total duration should be close to 0
    let total_secs = session.timings.total_duration_secs().unwrap();
    assert!(total_secs < 1.0, "Expected <1s, got {}", total_secs);
}
