//! Diagram Renderer Demo
//!
//! Demonstrates the ASCII diagram renderer for SIP call flows.
//!
//! Run with:
//! ```bash
//! cargo run --example diagram_renderer_demo
//! ```

use chrono::Utc;
use pattern_engine::call_flow::{
    CallSession, CtraceEntry, DiagramFormat, DiagramRenderer, Direction, Transport,
};

fn main() {
    println!("═══════════════════════════════════════════════════════════════");
    println!("   ASCII Diagram Renderer Demo - Phase 3.5");
    println!("═══════════════════════════════════════════════════════════════\n");

    // Create a sample call session
    let mut session = CallSession::new("001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240".to_string());

    let base_time = Utc::now();

    // Simulate a successful call flow
    println!("Building sample call flow...\n");

    // 1. INVITE
    session.add_message(CtraceEntry {
        timestamp: base_time,
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::Out,
        receiver_ip: "5.5.5.240".to_string(),
        receiver_port: 5060,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.45".to_string(),
        sender_port: 58096,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag1".to_string(),
        guid: session.call_id.clone(),
        sip_message: "INVITE sip:1002@cucm.example.com".to_string(),
    });

    // 2. 100 Trying
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::milliseconds(45),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::In,
        receiver_ip: "5.5.5.45".to_string(),
        receiver_port: 58096,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.240".to_string(),
        sender_port: 5060,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag2".to_string(),
        guid: session.call_id.clone(),
        sip_message: "100 Trying".to_string(),
    });

    // 3. 180 Ringing
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::milliseconds(150),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::In,
        receiver_ip: "5.5.5.45".to_string(),
        receiver_port: 58096,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.240".to_string(),
        sender_port: 5060,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag3".to_string(),
        guid: session.call_id.clone(),
        sip_message: "180 Ringing".to_string(),
    });

    // 4. 200 OK (Call answered)
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::seconds(2) + chrono::Duration::milliseconds(350),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::In,
        receiver_ip: "5.5.5.45".to_string(),
        receiver_port: 58096,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.240".to_string(),
        sender_port: 5060,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag4".to_string(),
        guid: session.call_id.clone(),
        sip_message: "200 OK".to_string(),
    });

    // 5. ACK
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::seconds(2) + chrono::Duration::milliseconds(380),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::Out,
        receiver_ip: "5.5.5.240".to_string(),
        receiver_port: 5060,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.45".to_string(),
        sender_port: 58096,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag5".to_string(),
        guid: session.call_id.clone(),
        sip_message: "ACK".to_string(),
    });

    // 6. BYE (After 45 seconds of conversation)
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::seconds(47) + chrono::Duration::milliseconds(500),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::Out,
        receiver_ip: "5.5.5.240".to_string(),
        receiver_port: 5060,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.45".to_string(),
        sender_port: 58096,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag6".to_string(),
        guid: session.call_id.clone(),
        sip_message: "BYE".to_string(),
    });

    // 7. 200 OK (BYE acknowledged)
    session.add_message(CtraceEntry {
        timestamp: base_time + chrono::Duration::seconds(47) + chrono::Duration::milliseconds(545),
        service: "SIPL".to_string(),
        protocol_num: 0,
        transport: Transport::Tcp,
        direction: Direction::In,
        receiver_ip: "5.5.5.45".to_string(),
        receiver_port: 58096,
        mac_address: "SEP00000000111G".to_string(),
        sender_ip: "5.5.5.240".to_string(),
        sender_port: 5060,
        correlation_id: "SD-123456789".to_string(),
        message_tag: "MessageTag7".to_string(),
        guid: session.call_id.clone(),
        sip_message: "200 OK".to_string(),
    });

    // Create renderer
    let renderer = DiagramRenderer::new();

    // ═══════════════════════════════════════════════════════════════
    // Demo 1: Plain ASCII Format
    // ═══════════════════════════════════════════════════════════════
    println!("─────────────────────────────────────────────────────────────");
    println!("  Format 1: Plain ASCII (for terminal/logs)");
    println!("─────────────────────────────────────────────────────────────\n");

    let ascii_diagram = renderer.render(&session, DiagramFormat::PlainAscii);
    println!("{}", ascii_diagram);

    println!("\n");

    // ═══════════════════════════════════════════════════════════════
    // Demo 2: Markdown Format
    // ═══════════════════════════════════════════════════════════════
    println!("─────────────────────────────────────────────────────────────");
    println!("  Format 2: Markdown (for VS Code/documentation)");
    println!("─────────────────────────────────────────────────────────────\n");

    let markdown_diagram = renderer.render(&session, DiagramFormat::Markdown);
    println!("{}", markdown_diagram);

    println!("\n");

    // ═══════════════════════════════════════════════════════════════
    // Demo 3: Custom Configuration
    // ═══════════════════════════════════════════════════════════════
    println!("─────────────────────────────────────────────────────────────");
    println!("  Format 3: Custom Config (no emojis, no timestamps)");
    println!("─────────────────────────────────────────────────────────────\n");

    use pattern_engine::call_flow::DiagramConfig;

    let custom_config = DiagramConfig {
        column_width: 25,
        show_timestamps: false,
        show_correlation_ids: false,
        show_summary: true,
        use_emojis: false,
    };

    let custom_renderer = DiagramRenderer::with_config(custom_config);
    let custom_diagram = custom_renderer.render(&session, DiagramFormat::PlainAscii);
    println!("{}", custom_diagram);

    println!("\n");

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    println!("═══════════════════════════════════════════════════════════════");
    println!("  Phase 3.5 Complete! ✅");
    println!("═══════════════════════════════════════════════════════════════");
    println!("\nFeatures Demonstrated:");
    println!("  ✅ Ladder diagram layout (Caller ↔ CUCM ↔ Callee)");
    println!("  ✅ Message arrows (→ outgoing, ← incoming)");
    println!("  ✅ Timestamp display");
    println!("  ✅ SIP method/response labels");
    println!("  ✅ Color coding with emojis (✅ ❌ 🔔)");
    println!("  ✅ Call summary section");
    println!("  ✅ Timing metrics display");
    println!("  ✅ Multiple output formats (Plain ASCII, Markdown)");
    println!("  ✅ Configurable rendering options\n");

    println!("Next Steps:");
    println!("  → Phase 3.6: CLI Commands");
    println!("  → Integrate with log-scout CLI");
    println!("  → Add export options (save to file)");
    println!("\n");
}
