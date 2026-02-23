//! ASCII Diagram Renderer
//!
//! Generates beautiful Markdown-formatted ASCII ladder diagrams showing SIP call flows.
//!
//! # Features
//!
//! - Ladder diagram layout (Caller ↔ CUCM ↔ Callee)
//! - Message arrows (→ outgoing, ← incoming)
//! - Timestamp display
//! - SIP method/response labels
//! - Color coding with emojis (✅ ❌ 🔔)
//! - Call summary section
//! - Timing metrics display
//! - Multiple output formats (Plain ASCII, Markdown)
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::call_flow::{CallSession, diagram_renderer::{DiagramRenderer, DiagramFormat}};
//!
//! let session = CallSession::new("001a2f8d-f17f0004".to_string());
//! let renderer = DiagramRenderer::new();
//! let diagram = renderer.render(&session, DiagramFormat::Markdown);
//! println!("{}", diagram);
//! ```

use super::types::{CallSession, CallState, CtraceEntry, Direction};
use chrono::{DateTime, Utc};

/// Diagram output format
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DiagramFormat {
    /// Plain ASCII for terminal output
    PlainAscii,
    /// Markdown with ASCII diagrams in code blocks
    Markdown,
}

/// ASCII diagram renderer configuration
#[derive(Debug, Clone)]
pub struct DiagramConfig {
    /// Column width for each participant
    pub column_width: usize,
    /// Show timestamps on each message
    pub show_timestamps: bool,
    /// Show correlation IDs
    pub show_correlation_ids: bool,
    /// Include call summary section
    pub show_summary: bool,
    /// Use emojis for status indicators
    pub use_emojis: bool,
}

impl Default for DiagramConfig {
    fn default() -> Self {
        Self {
            column_width: 20,
            show_timestamps: true,
            show_correlation_ids: false,
            show_summary: true,
            use_emojis: true,
        }
    }
}

/// ASCII diagram renderer
pub struct DiagramRenderer {
    config: DiagramConfig,
}

impl DiagramRenderer {
    /// Create a new renderer with default configuration
    pub fn new() -> Self {
        Self {
            config: DiagramConfig::default(),
        }
    }

    /// Create a renderer with custom configuration
    pub fn with_config(config: DiagramConfig) -> Self {
        Self { config }
    }

    /// Render a call session as an ASCII diagram
    pub fn render(&self, session: &CallSession, format: DiagramFormat) -> String {
        match format {
            DiagramFormat::PlainAscii => self.render_plain_ascii(session),
            DiagramFormat::Markdown => self.render_markdown(session),
        }
    }

    /// Render as plain ASCII text
    fn render_plain_ascii(&self, session: &CallSession) -> String {
        let mut output = String::new();

        // Header
        output.push_str(&format!(
            "Call Flow: {}\n",
            truncate_call_id(&session.call_id)
        ));
        output.push_str(&"═".repeat(60));
        output.push_str("\n\n");

        // Participants header
        output.push_str(&self.render_participants_header());
        output.push_str("\n");

        // Messages
        for entry in &session.messages {
            output.push_str(&self.render_message(entry));
        }

        // Summary
        if self.config.show_summary {
            output.push_str("\n");
            output.push_str(&self.render_summary(session));
        }

        output
    }

    /// Render as Markdown with code blocks
    fn render_markdown(&self, session: &CallSession) -> String {
        let mut output = String::new();

        // Markdown title
        output.push_str(&format!(
            "# Call Flow Analysis: {}\n\n",
            truncate_call_id(&session.call_id)
        ));

        // Metadata section
        output.push_str(&self.render_metadata(session));
        output.push_str("\n");

        // Sequence diagram in code block
        output.push_str("## Sequence Diagram\n\n");
        output.push_str("```text\n");

        // Participants header
        output.push_str(&self.render_participants_header());
        output.push_str("\n");

        // Messages
        for entry in &session.messages {
            output.push_str(&self.render_message(entry));
        }

        output.push_str("```\n\n");

        // Summary section
        if self.config.show_summary {
            output.push_str("## Call Summary\n\n");
            output.push_str(&self.render_summary_markdown(session));
        }

        output
    }

    /// Render metadata section (Markdown only)
    fn render_metadata(&self, session: &CallSession) -> String {
        let status_emoji = self.get_status_emoji(session.state);
        let duration = if let Some(end) = session.end_time {
            format_duration((end - session.start_time).num_seconds() as u64)
        } else {
            "In Progress".to_string()
        };

        format!(
            "**Duration:** {} | **Status:** {} {} | **Messages:** {}\n",
            duration,
            status_emoji,
            session.state.as_str(),
            session.message_count()
        )
    }

    /// Render participants header
    fn render_participants_header(&self) -> String {
        let w = self.config.column_width;
        format!(
            "{:^width$}{:^width$}{:^width$}\n{:^width$}{:^width$}{:^width$}",
            "Caller",
            "CUCM",
            "Callee",
            "|",
            "|",
            "|",
            width = w
        )
    }

    /// Render a single message as a ladder diagram row
    fn render_message(&self, entry: &CtraceEntry) -> String {
        let w = self.config.column_width;
        let mut output = String::new();

        // Timestamp line (if enabled)
        if self.config.show_timestamps {
            let time_str = format_timestamp(&entry.timestamp);
            output.push_str(&format!("{}\n", time_str));
        }

        // Message arrow line
        let arrow_line = match entry.direction {
            Direction::Out => {
                // Outgoing: Caller → CUCM or CUCM → Callee
                if entry.sip_message.starts_with("INVITE")
                    || entry.sip_message.starts_with("ACK")
                    || entry.sip_message.starts_with("BYE")
                {
                    format!(
                        "{:^width$}{}{:^width$}",
                        "|",
                        format!("---- {} ---->", truncate_sip_message(&entry.sip_message)),
                        "|",
                        width = w
                    )
                } else {
                    format!(
                        "{:^width$}{}{:^width$}",
                        "|",
                        format!("<--- {} ----", truncate_sip_message(&entry.sip_message)),
                        "|",
                        width = w
                    )
                }
            }
            Direction::In => {
                // Incoming: CUCM ← Callee or Caller ← CUCM
                format!(
                    "{:^width$}{}{:^width$}",
                    "|",
                    format!("<--- {} ----", truncate_sip_message(&entry.sip_message)),
                    "|",
                    width = w
                )
            }
        };

        output.push_str(&arrow_line);
        output.push_str("\n");

        output
    }

    /// Render call summary (plain ASCII)
    fn render_summary(&self, session: &CallSession) -> String {
        let mut output = String::new();

        output.push_str("Call Summary:\n");

        // Ring duration
        if let Some(ring_secs) = session.timings.ring_duration_secs() {
            let emoji = if self.config.use_emojis { "🔔 " } else { "" };
            output.push_str(&format!("  {}Ring Duration: {:.3}s\n", emoji, ring_secs));
        }

        // Connected duration
        if let Some(connected_secs) = session.timings.connected_duration_secs() {
            let emoji = if self.config.use_emojis { "📞 " } else { "" };
            output.push_str(&format!("  {}Talk Time: {:.3}s\n", emoji, connected_secs));
        }

        // Total duration
        if let Some(total_secs) = session.timings.total_duration_secs() {
            let emoji = if self.config.use_emojis {
                "⏱️ "
            } else {
                ""
            };
            output.push_str(&format!("  {}Total Duration: {:.3}s\n", emoji, total_secs));
        }

        // Message counts
        let emoji = if self.config.use_emojis { "📨 " } else { "" };
        output.push_str(&format!(
            "  {}Messages: {} total ({} in, {} out)\n",
            emoji,
            session.message_count(),
            session.incoming_count(),
            session.outgoing_count()
        ));

        // Status
        let status_emoji = self.get_status_emoji(session.state);
        output.push_str(&format!(
            "  {}Status: {}\n",
            status_emoji,
            session.state.as_str()
        ));

        output
    }

    /// Render call summary (Markdown)
    fn render_summary_markdown(&self, session: &CallSession) -> String {
        let mut output = String::new();

        // Timing metrics
        if session.timings.ring_duration_secs().is_some()
            || session.timings.connected_duration_secs().is_some()
            || session.timings.total_duration_secs().is_some()
        {
            output.push_str("### Timing Metrics\n\n");

            if let Some(ring_secs) = session.timings.ring_duration_secs() {
                output.push_str(&format!("- **Ring Duration:** {:.3}s\n", ring_secs));
            }

            if let Some(connected_secs) = session.timings.connected_duration_secs() {
                output.push_str(&format!("- **Talk Time:** {:.3}s\n", connected_secs));
            }

            if let Some(total_secs) = session.timings.total_duration_secs() {
                output.push_str(&format!("- **Total Duration:** {:.3}s\n", total_secs));
            }

            output.push_str("\n");
        }

        // Message statistics
        output.push_str("### Message Statistics\n\n");
        output.push_str(&format!(
            "- **Total Messages:** {}\n",
            session.message_count()
        ));
        output.push_str(&format!("- **Incoming:** {}\n", session.incoming_count()));
        output.push_str(&format!("- **Outgoing:** {}\n", session.outgoing_count()));
        output.push_str("\n");

        // Endpoints
        output.push_str("### Endpoints\n\n");
        output.push_str(&format!("- **Caller:** {}\n", session.caller.display()));
        output.push_str(&format!("- **Callee:** {}\n", session.callee.display()));
        output.push_str("\n");

        output
    }

    /// Get emoji for call state
    fn get_status_emoji(&self, state: CallState) -> &str {
        if !self.config.use_emojis {
            return "";
        }

        match state {
            CallState::Connected | CallState::Terminated => "✅",
            CallState::Failed | CallState::Cancelled => "❌",
            CallState::Ringing => "🔔",
            CallState::Calling | CallState::Proceeding => "📞",
            _ => "🔄",
        }
    }
}

impl Default for DiagramRenderer {
    fn default() -> Self {
        Self::new()
    }
}

/// Truncate Call-ID for display (show first 16 chars + ...)
fn truncate_call_id(call_id: &str) -> String {
    if call_id.len() > 20 {
        format!("{}...", &call_id[..20])
    } else {
        call_id.to_string()
    }
}

/// Truncate SIP message for display
fn truncate_sip_message(msg: &str) -> String {
    if msg.len() > 15 {
        format!("{}...", &msg[..12])
    } else {
        msg.to_string()
    }
}

/// Format timestamp (HH:MM:SS.mmm)
fn format_timestamp(dt: &DateTime<Utc>) -> String {
    dt.format("%H:%M:%S%.3f").to_string()
}

/// Format duration as human-readable string
fn format_duration(secs: u64) -> String {
    if secs < 60 {
        format!("{}s", secs)
    } else if secs < 3600 {
        let mins = secs / 60;
        let remaining_secs = secs % 60;
        format!("{}m {}s", mins, remaining_secs)
    } else {
        let hours = secs / 3600;
        let mins = (secs % 3600) / 60;
        let remaining_secs = secs % 60;
        format!("{}h {}m {}s", hours, mins, remaining_secs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::call_flow::types::{CallSession, CtraceEntry, Direction, Transport};
    use chrono::Utc;

    /// Helper: Create a test CTRACE entry
    fn create_test_entry(
        timestamp: DateTime<Utc>,
        direction: Direction,
        sip_message: &str,
        call_id: &str,
    ) -> CtraceEntry {
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
            correlation_id: "corr-id-123".to_string(),
            message_tag: "MessageTag1".to_string(),
            guid: call_id.to_string(),
            sip_message: sip_message.to_string(),
        }
    }

    #[test]
    fn test_diagram_format_enum() {
        assert_eq!(DiagramFormat::PlainAscii, DiagramFormat::PlainAscii);
        assert_eq!(DiagramFormat::Markdown, DiagramFormat::Markdown);
        assert_ne!(DiagramFormat::PlainAscii, DiagramFormat::Markdown);
    }

    #[test]
    fn test_diagram_config_default() {
        let config = DiagramConfig::default();
        assert_eq!(config.column_width, 20);
        assert!(config.show_timestamps);
        assert!(!config.show_correlation_ids);
        assert!(config.show_summary);
        assert!(config.use_emojis);
    }

    #[test]
    fn test_diagram_renderer_new() {
        let renderer = DiagramRenderer::new();
        assert_eq!(renderer.config.column_width, 20);
        assert!(renderer.config.show_timestamps);
    }

    #[test]
    fn test_diagram_renderer_with_config() {
        let config = DiagramConfig {
            column_width: 30,
            show_timestamps: false,
            show_correlation_ids: true,
            show_summary: false,
            use_emojis: false,
        };
        let renderer = DiagramRenderer::with_config(config.clone());
        assert_eq!(renderer.config.column_width, 30);
        assert!(!renderer.config.show_timestamps);
        assert!(renderer.config.show_correlation_ids);
        assert!(!renderer.config.show_summary);
        assert!(!renderer.config.use_emojis);
    }

    #[test]
    fn test_truncate_call_id() {
        assert_eq!(truncate_call_id("short"), "short");
        assert_eq!(
            truncate_call_id("001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240"),
            "001a2f8d-f17f0004-28..."
        );
    }

    #[test]
    fn test_truncate_sip_message() {
        assert_eq!(truncate_sip_message("INVITE"), "INVITE");
        assert_eq!(
            truncate_sip_message("INVITE sip:user@domain.com"),
            "INVITE sip:u..."
        );
    }

    #[test]
    fn test_format_timestamp() {
        let dt = Utc::now();
        let formatted = format_timestamp(&dt);
        // Should be in format HH:MM:SS.mmm
        assert!(formatted.contains(':'));
        assert!(formatted.contains('.'));
    }

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(5), "5s");
        assert_eq!(format_duration(59), "59s");
        assert_eq!(format_duration(60), "1m 0s");
        assert_eq!(format_duration(125), "2m 5s");
        assert_eq!(format_duration(3600), "1h 0m 0s");
        assert_eq!(format_duration(3725), "1h 2m 5s");
    }

    #[test]
    fn test_get_status_emoji() {
        let renderer = DiagramRenderer::new();
        assert_eq!(renderer.get_status_emoji(CallState::Connected), "✅");
        assert_eq!(renderer.get_status_emoji(CallState::Terminated), "✅");
        assert_eq!(renderer.get_status_emoji(CallState::Failed), "❌");
        assert_eq!(renderer.get_status_emoji(CallState::Cancelled), "❌");
        assert_eq!(renderer.get_status_emoji(CallState::Ringing), "🔔");
        assert_eq!(renderer.get_status_emoji(CallState::Calling), "📞");
    }

    #[test]
    fn test_get_status_emoji_disabled() {
        let config = DiagramConfig {
            use_emojis: false,
            ..Default::default()
        };
        let renderer = DiagramRenderer::with_config(config);
        assert_eq!(renderer.get_status_emoji(CallState::Connected), "");
        assert_eq!(renderer.get_status_emoji(CallState::Failed), "");
    }

    #[test]
    fn test_render_empty_session() {
        let session = CallSession::new("test-call-id".to_string());
        let renderer = DiagramRenderer::new();

        let diagram = renderer.render(&session, DiagramFormat::PlainAscii);
        assert!(diagram.contains("Call Flow: test-call-id"));
        assert!(diagram.contains("Caller"));
        assert!(diagram.contains("CUCM"));
        assert!(diagram.contains("Callee"));
    }

    #[test]
    fn test_render_session_with_messages() {
        let mut session = CallSession::new("test-call-id".to_string());
        let base_time = Utc::now();

        // Add INVITE
        session.add_message(create_test_entry(
            base_time,
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        // Add 100 Trying
        session.add_message(create_test_entry(
            base_time + chrono::Duration::milliseconds(50),
            Direction::In,
            "100 Trying",
            "test-call-id",
        ));

        let renderer = DiagramRenderer::new();
        let diagram = renderer.render(&session, DiagramFormat::PlainAscii);

        assert!(diagram.contains("Call Flow: test-call-id"));
        assert!(diagram.contains("INVITE"));
        assert!(diagram.contains("100 Trying"));
        assert!(diagram.contains("Messages: 2 total"));
    }

    #[test]
    fn test_render_markdown_format() {
        let mut session = CallSession::new("test-call-id".to_string());
        let base_time = Utc::now();

        session.add_message(create_test_entry(
            base_time,
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        let renderer = DiagramRenderer::new();
        let diagram = renderer.render(&session, DiagramFormat::Markdown);

        // Check Markdown structure
        assert!(diagram.contains("# Call Flow Analysis:"));
        assert!(diagram.contains("## Sequence Diagram"));
        assert!(diagram.contains("```text"));
        assert!(diagram.contains("## Call Summary"));
        assert!(diagram.contains("**Duration:**"));
        assert!(diagram.contains("**Status:**"));
        assert!(diagram.contains("**Messages:**"));
    }

    #[test]
    fn test_render_participants_header() {
        let renderer = DiagramRenderer::new();
        let header = renderer.render_participants_header();

        assert!(header.contains("Caller"));
        assert!(header.contains("CUCM"));
        assert!(header.contains("Callee"));
        assert!(header.contains("|"));
    }

    #[test]
    fn test_render_message_outgoing() {
        let renderer = DiagramRenderer::new();
        let entry = create_test_entry(Utc::now(), Direction::Out, "INVITE", "test-call-id");

        let message_line = renderer.render_message(&entry);
        assert!(message_line.contains("INVITE"));
        assert!(message_line.contains("|"));
    }

    #[test]
    fn test_render_message_incoming() {
        let renderer = DiagramRenderer::new();
        let entry = create_test_entry(Utc::now(), Direction::In, "200 OK", "test-call-id");

        let message_line = renderer.render_message(&entry);
        assert!(message_line.contains("200 OK"));
        assert!(message_line.contains("|"));
    }

    #[test]
    fn test_render_message_without_timestamps() {
        let config = DiagramConfig {
            show_timestamps: false,
            ..Default::default()
        };
        let renderer = DiagramRenderer::with_config(config);
        let entry = create_test_entry(Utc::now(), Direction::Out, "INVITE", "test-call-id");

        let message_line = renderer.render_message(&entry);
        // Should not contain timestamp format (HH:MM:SS)
        assert!(message_line.contains("INVITE"));
        // Simple check: no colons from timestamps in first line
        let first_line = message_line.lines().next().unwrap();
        assert!(!first_line.contains(":") || !first_line.contains("."));
    }

    #[test]
    fn test_render_summary_with_emojis() {
        let mut session = CallSession::new("test-call-id".to_string());
        session.add_message(create_test_entry(
            Utc::now(),
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        let renderer = DiagramRenderer::new();
        let summary = renderer.render_summary(&session);

        assert!(summary.contains("Call Summary:"));
        assert!(summary.contains("📨")); // Message emoji
    }

    #[test]
    fn test_render_summary_without_emojis() {
        let mut session = CallSession::new("test-call-id".to_string());
        session.add_message(create_test_entry(
            Utc::now(),
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        let config = DiagramConfig {
            use_emojis: false,
            ..Default::default()
        };
        let renderer = DiagramRenderer::with_config(config);
        let summary = renderer.render_summary(&session);

        assert!(summary.contains("Call Summary:"));
        assert!(!summary.contains("📨")); // No emoji
    }

    #[test]
    fn test_render_summary_markdown() {
        let mut session = CallSession::new("test-call-id".to_string());
        session.add_message(create_test_entry(
            Utc::now(),
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        let renderer = DiagramRenderer::new();
        let summary = renderer.render_summary_markdown(&session);

        assert!(summary.contains("### Message Statistics"));
        assert!(summary.contains("### Endpoints"));
        assert!(summary.contains("**Total Messages:**"));
        assert!(summary.contains("**Caller:**"));
        assert!(summary.contains("**Callee:**"));
    }

    #[test]
    fn test_render_metadata() {
        let session = CallSession::new("test-call-id".to_string());
        let renderer = DiagramRenderer::new();
        let metadata = renderer.render_metadata(&session);

        assert!(metadata.contains("**Duration:**"));
        assert!(metadata.contains("**Status:**"));
        assert!(metadata.contains("**Messages:**"));
    }

    #[test]
    fn test_full_call_flow_plain_ascii() {
        let mut session =
            CallSession::new("001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240".to_string());
        let base_time = Utc::now();

        // Simulate a complete call flow
        session.add_message(create_test_entry(
            base_time,
            Direction::Out,
            "INVITE",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::milliseconds(50),
            Direction::In,
            "100 Trying",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::milliseconds(100),
            Direction::In,
            "180 Ringing",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(2),
            Direction::In,
            "200 OK",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(2) + chrono::Duration::milliseconds(50),
            Direction::Out,
            "ACK",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(47),
            Direction::Out,
            "BYE",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(47) + chrono::Duration::milliseconds(50),
            Direction::In,
            "200 OK",
            &session.call_id,
        ));

        let renderer = DiagramRenderer::new();
        let diagram = renderer.render(&session, DiagramFormat::PlainAscii);

        // Verify structure
        assert!(diagram.contains("Call Flow:"));
        assert!(diagram.contains("Caller"));
        assert!(diagram.contains("CUCM"));
        assert!(diagram.contains("Callee"));
        assert!(diagram.contains("INVITE"));
        assert!(diagram.contains("100 Trying"));
        assert!(diagram.contains("180 Ringing"));
        assert!(diagram.contains("200 OK"));
        assert!(diagram.contains("ACK"));
        assert!(diagram.contains("BYE"));
        assert!(diagram.contains("Call Summary:"));
        assert!(diagram.contains("Messages: 7 total"));
    }

    #[test]
    fn test_full_call_flow_markdown() {
        let mut session =
            CallSession::new("001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240".to_string());
        let base_time = Utc::now();

        // Simulate a complete call flow
        session.add_message(create_test_entry(
            base_time,
            Direction::Out,
            "INVITE",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::milliseconds(50),
            Direction::In,
            "100 Trying",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(2),
            Direction::In,
            "200 OK",
            &session.call_id,
        ));
        session.add_message(create_test_entry(
            base_time + chrono::Duration::seconds(2) + chrono::Duration::milliseconds(50),
            Direction::Out,
            "ACK",
            &session.call_id,
        ));

        let renderer = DiagramRenderer::new();
        let diagram = renderer.render(&session, DiagramFormat::Markdown);

        // Verify Markdown structure
        assert!(diagram.starts_with("# Call Flow Analysis:"));
        assert!(diagram.contains("**Duration:**"));
        assert!(diagram.contains("## Sequence Diagram"));
        assert!(diagram.contains("```text"));
        assert!(diagram.contains("## Call Summary"));
        assert!(diagram.contains("### Message Statistics"));
        assert!(diagram.contains("### Endpoints"));
    }

    #[test]
    fn test_config_show_summary_false() {
        let mut session = CallSession::new("test-call-id".to_string());
        session.add_message(create_test_entry(
            Utc::now(),
            Direction::Out,
            "INVITE",
            "test-call-id",
        ));

        let config = DiagramConfig {
            show_summary: false,
            ..Default::default()
        };
        let renderer = DiagramRenderer::with_config(config);
        let diagram = renderer.render(&session, DiagramFormat::PlainAscii);

        assert!(!diagram.contains("Call Summary:"));
    }
}
