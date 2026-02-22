//! Example: Vendor Detection and Normalized Events
//!
//! This example demonstrates how to use the vendor detection system
//! and create normalized events from raw log data.
//!
//! Run with:
//!   cargo run --example vendor_detection_example

use chrono::Utc;
use log_scout_analyzer_core::normalized_event::{
    CorrelationId, NetworkContext, NormalizedEvent, RawData, SIPAddress, SIPHeaders, SIPMessage,
    VendorInfo,
};
use pattern_engine::vendor_detection::{DetectionMode, VendorDetector};
use std::collections::HashMap;

fn main() {
    println!("=== Vendor Detection and Normalization Example ===\n");

    // Create a vendor detector
    let detector = VendorDetector::new();

    // Example 1: Cisco CUBE log
    println!("Example 1: Cisco CUBE (IOS)");
    println!("----------------------------");
    detect_and_normalize_cube(&detector);

    println!("\n");

    // Example 2: Cisco CUCM log
    println!("Example 2: Cisco CUCM");
    println!("----------------------------");
    detect_and_normalize_cucm(&detector);

    println!("\n");

    // Example 3: Cisco Jabber log
    println!("Example 3: Cisco Jabber");
    println!("----------------------------");
    detect_and_normalize_jabber(&detector);

    println!("\n");

    // Example 4: Multi-line detection
    println!("Example 4: Multi-line Detection");
    println!("--------------------------------");
    multi_line_detection(&detector);

    println!("\n");

    // Example 5: Detection modes comparison
    println!("Example 5: Detection Modes");
    println!("--------------------------");
    compare_detection_modes(&detector);

    println!("\n=== Complete ===");
}

fn detect_and_normalize_cube(detector: &VendorDetector) {
    let log_line = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE sip:5551234@example.com SIP/2.0";

    // Detect vendor
    match detector.detect(log_line) {
        Some(vendor_match) => {
            println!("✓ Detected: {}", vendor_match.name);
            println!("  Vendor ID: {}", vendor_match.vendor_id);
            println!("  Confidence: {:.2}%", vendor_match.confidence * 100.0);
            println!(
                "  Matched patterns: {}",
                vendor_match.matched_patterns.len()
            );

            // Create normalized event
            let event = NormalizedEvent::builder()
                .event_type("sip_invite")
                .timestamp(Utc::now())
                .sip_message(SIPMessage {
                    method: Some("INVITE".to_string()),
                    status_code: None,
                    status_text: None,
                    headers: SIPHeaders {
                        call_id: Some("abc123@10.1.1.1".to_string()),
                        to: Some(SIPAddress {
                            display_name: None,
                            uri: "sip:5551234@example.com".to_string(),
                            tag: None,
                            parameters: HashMap::new(),
                        }),
                        from: Some(SIPAddress {
                            display_name: Some("John Doe".to_string()),
                            uri: "sip:john@caller.com".to_string(),
                            tag: Some("tag1".to_string()),
                            parameters: HashMap::new(),
                        }),
                        ..Default::default()
                    },
                    sdp: None,
                    direction: None,
                })
                .network(NetworkContext {
                    source_ip: Some("10.1.1.100".to_string()),
                    source_port: Some(5060),
                    destination_ip: Some("10.1.1.1".to_string()),
                    destination_port: Some(5060),
                    protocol: Some("UDP".to_string()),
                    interface: None,
                    direction: None,
                })
                .vendor(VendorInfo {
                    vendor_type: vendor_match.vendor_id.clone(),
                    product: vendor_match.product.clone(),
                    version: Some("16.9".to_string()),
                    confidence: Some(vendor_match.confidence),
                    metadata: HashMap::new(),
                })
                .raw(RawData {
                    line: log_line.to_string(),
                    line_number: Some(42),
                    file_path: Some("/var/log/sip.log".to_string()),
                    format: Some("cisco_ios".to_string()),
                })
                .correlation_id("call_id", "abc123@10.1.1.1")
                .build()
                .expect("Failed to build event");

            println!("\n✓ Created normalized event:");
            println!("  Event type: {}", event.event_type);
            println!("  Call-ID: {:?}", event.call_id());
            println!("  Vendor: {}", event.vendor.vendor_type);
            println!("  Raw line preserved: {} chars", event.raw.line.len());
        }
        None => println!("✗ No vendor detected"),
    }
}

fn detect_and_normalize_cucm(detector: &VendorDetector) {
    let log_line = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|ClusterID=cluster1|LocalAddr=10.1.1.1:5060|RemoteAddr=10.1.1.100:5060";

    match detector.detect(log_line) {
        Some(vendor_match) => {
            println!("✓ Detected: {}", vendor_match.name);
            println!("  Vendor ID: {}", vendor_match.vendor_id);
            println!("  Confidence: {:.2}%", vendor_match.confidence * 100.0);

            let event = NormalizedEvent::builder()
                .event_type("sip_tcp_message")
                .timestamp(Utc::now())
                .vendor(VendorInfo {
                    vendor_type: vendor_match.vendor_id.clone(),
                    product: vendor_match.product.clone(),
                    version: None,
                    confidence: Some(vendor_match.confidence),
                    metadata: {
                        let mut map = HashMap::new();
                        map.insert("cluster_id".to_string(), "cluster1".to_string());
                        map
                    },
                })
                .raw(RawData {
                    line: log_line.to_string(),
                    line_number: Some(100),
                    file_path: Some("/var/log/cucm/sip.log".to_string()),
                    format: Some("cucm_pipe_delimited".to_string()),
                })
                .build()
                .expect("Failed to build event");

            println!("\n✓ Created normalized event:");
            println!("  Event type: {}", event.event_type);
            println!("  Vendor: {}", event.vendor.vendor_type);
            println!("  Metadata fields: {}", event.vendor.metadata.len());
        }
        None => println!("✗ No vendor detected"),
    }
}

fn detect_and_normalize_jabber(detector: &VendorDetector) {
    let log_line =
        "2024-01-15 10:30:00,123 INFO  [0x00001234] [csf.sip] CSFClient[5678] SIP_MSG_RECV: INVITE";

    match detector.detect(log_line) {
        Some(vendor_match) => {
            println!("✓ Detected: {}", vendor_match.name);
            println!("  Vendor ID: {}", vendor_match.vendor_id);
            println!("  Confidence: {:.2}%", vendor_match.confidence * 100.0);

            let event = NormalizedEvent::builder()
                .event_type("sip_invite")
                .timestamp(Utc::now())
                .vendor(VendorInfo {
                    vendor_type: vendor_match.vendor_id.clone(),
                    product: vendor_match.product.clone(),
                    version: Some("14.0".to_string()),
                    confidence: Some(vendor_match.confidence),
                    metadata: HashMap::new(),
                })
                .raw(RawData {
                    line: log_line.to_string(),
                    line_number: Some(500),
                    file_path: Some("/tmp/jabber.log".to_string()),
                    format: Some("jabber_csf".to_string()),
                })
                .correlation_id("thread_id", "0x00001234")
                .build()
                .expect("Failed to build event");

            println!("\n✓ Created normalized event:");
            println!("  Event type: {}", event.event_type);
            println!("  Vendor: {}", event.vendor.vendor_type);
            println!("  Correlation IDs: {}", event.correlation_ids.len());
        }
        None => println!("✗ No vendor detected"),
    }
}

fn multi_line_detection(detector: &VendorDetector) {
    let logs = vec![
        "Jan 15 10:30:00.123: %SIP-6-INVITE: test",
        "Jan 15 10:30:01.456: ccsipDisplayMsg: Received",
        "Jan 15 10:30:02.789: /SIP/Msg/ccsipDisplayMsg",
    ];

    println!("Analyzing {} log lines...", logs.len());

    match detector.detect_from_sample(&logs) {
        Some(vendor_match) => {
            println!("\n✓ Multi-line detection successful!");
            println!("  Detected: {}", vendor_match.name);
            println!("  Vendor ID: {}", vendor_match.vendor_id);
            println!(
                "  Average confidence: {:.2}%",
                vendor_match.confidence * 100.0
            );
            println!(
                "  Total patterns matched: {}",
                vendor_match.matched_patterns.len()
            );
        }
        None => println!("✗ No consistent vendor detected across sample"),
    }
}

fn compare_detection_modes(detector: &VendorDetector) {
    let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Test";

    println!("Testing log line with different modes...\n");

    // Quick mode
    if let Some(result) = detector.detect_with_mode(log, DetectionMode::Quick) {
        println!("✓ Quick mode:");
        println!("  Vendor: {}", result.vendor_id);
        println!("  Confidence: {:.2}%", result.confidence * 100.0);
        println!("  (Fast heuristic check)\n");
    }

    // Full mode
    if let Some(result) = detector.detect_with_mode(log, DetectionMode::Full) {
        println!("✓ Full mode:");
        println!("  Vendor: {}", result.vendor_id);
        println!("  Confidence: {:.2}%", result.confidence * 100.0);
        println!("  Matched patterns: {}", result.matched_patterns.join(", "));
        println!("  (Complete regex analysis)\n");
    }

    // Adaptive mode
    if let Some(result) = detector.detect_with_mode(log, DetectionMode::Adaptive) {
        println!("✓ Adaptive mode:");
        println!("  Vendor: {}", result.vendor_id);
        println!("  Confidence: {:.2}%", result.confidence * 100.0);
        println!("  (Quick first, then full if needed)");
    }

    // List all supported vendors
    println!("\n✓ Supported vendors:");
    let vendors = detector.get_vendors();
    for (i, vendor) in vendors.iter().enumerate() {
        println!("  {}. {}", i + 1, vendor);
    }
}
