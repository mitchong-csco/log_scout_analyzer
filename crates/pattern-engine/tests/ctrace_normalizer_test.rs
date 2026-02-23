//! CTRACE Normalizer Tests
//!
//! Tests for Cisco UCM Call Trace (CTRACE) format parsing

use pattern_engine::normalizers::{VendorNormalizer, CtraceNormalizer};

#[test]
fn test_can_normalize_ctrace_invite() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

    assert!(normalizer.can_normalize(log));
}

#[test]
fn test_normalize_ctrace_invite() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

    let result = normalizer.normalize(log);
    assert!(result.is_ok());

    let event = result.unwrap();
    assert_eq!(event.vendor.vendor_type, "cisco_cucm_ctrace");
    assert_eq!(event.event_type, "sip_invite");
}

#[test]
fn test_parse_ctrace_response() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:01.012|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag2|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|100 Trying";

    let result = normalizer.normalize(log);
    assert!(result.is_ok());

    let event = result.unwrap();
    assert_eq!(event.event_type, "sip_100");
}

#[test]
fn test_extract_call_id() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

    let event = normalizer.normalize(log).unwrap();

    // Check metadata contains GUID
    assert!(event.vendor.metadata.contains_key("guid"));
    assert_eq!(
        event.vendor.metadata.get("guid").unwrap(),
        "001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240"
    );
}

#[test]
fn test_extract_direction() {
    let normalizer = CtraceNormalizer::new();

    let in_log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";
    let in_event = normalizer.normalize(in_log).unwrap();
    assert_eq!(in_event.vendor.metadata.get("direction").unwrap(), "IN");

    let out_log = "2009/12/17 10:45:01.012|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag2|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|100 Trying";
    let out_event = normalizer.normalize(out_log).unwrap();
    assert_eq!(out_event.vendor.metadata.get("direction").unwrap(), "OUT");
}

#[test]
fn test_extract_endpoints() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

    let event = normalizer.normalize(log).unwrap();
    let network = event.network.unwrap();

    assert_eq!(network.destination_ip, Some("5.5.5.45".to_string()));
    assert_eq!(network.destination_port, Some(58096));
    assert_eq!(network.source_ip, Some("5.5.5.240".to_string()));
    assert_eq!(network.source_port, Some(5060));
}

#[test]
fn test_parse_all_transports() {
    let normalizer = CtraceNormalizer::new();

    let tcp_log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|id|tag|guid|INVITE";
    let tcp_event = normalizer.normalize(tcp_log).unwrap();
    assert_eq!(tcp_event.network.as_ref().unwrap().protocol, Some("TCP".to_string()));

    let udp_log = "2009/12/17 10:45:00.949|SIPL|0|UDP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|id|tag|guid|INVITE";
    let udp_event = normalizer.normalize(udp_log).unwrap();
    assert_eq!(udp_event.network.as_ref().unwrap().protocol, Some("UDP".to_string()));

    let tls_log = "2009/12/17 10:45:00.949|SIPL|0|TLS|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|id|tag|guid|INVITE";
    let tls_event = normalizer.normalize(tls_log).unwrap();
    assert_eq!(tls_event.network.as_ref().unwrap().protocol, Some("TLS".to_string()));
}

#[test]
fn test_confidence_high_for_ctrace() {
    let normalizer = CtraceNormalizer::new();
    let log = "2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE";

    let confidence = normalizer.confidence(log);
    assert!(confidence >= 0.9);
}

#[test]
fn test_reject_non_ctrace() {
    let normalizer = CtraceNormalizer::new();
    let log = "This is not a CTRACE log";

    assert!(!normalizer.can_normalize(log));
    assert!(normalizer.confidence(log) < 0.1);
}

#[test]
fn test_handle_malformed_ctrace() {
    let normalizer = CtraceNormalizer::new();

    // Missing fields
    let bad_log = "2009/12/17 10:45:00.949|SIPL|0|TCP";
    let result = normalizer.normalize(bad_log);
    assert!(result.is_err());
}
