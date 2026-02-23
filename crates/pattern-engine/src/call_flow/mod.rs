//! Call Flow Analysis Module
//!
//! This module provides functionality for analyzing call flows from CTRACE logs.
//! It correlates SIP messages by Call-ID (GUID) and builds complete call sessions
//! with timing information and state tracking.
//!
//! # Overview
//!
//! The call flow analysis process:
//! 1. Parse CTRACE logs into `CtraceEntry` messages
//! 2. Group messages by Call-ID using `CallCorrelator`
//! 3. Build `CallSession` objects with chronological message ordering
//! 4. Track call state transitions
//! 5. Calculate timing metrics (ring duration, setup time, etc.)
//! 6. Generate ASCII ladder diagrams with `DiagramRenderer`
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::call_flow::{CallCorrelator, CtraceEntry, Direction, Transport};
//! use pattern_engine::call_flow::{DiagramRenderer, DiagramFormat};
//! use chrono::Utc;
//!
//! let mut correlator = CallCorrelator::new();
//!
//! // Add CTRACE messages
//! let entry = CtraceEntry {
//!     timestamp: Utc::now(),
//!     service: "SIPL".to_string(),
//!     protocol_num: 0,
//!     transport: Transport::Tcp,
//!     direction: Direction::In,
//!     receiver_ip: "5.5.5.45".to_string(),
//!     receiver_port: 58096,
//!     mac_address: "SEP00000000111G".to_string(),
//!     sender_ip: "5.5.5.240".to_string(),
//!     sender_port: 5060,
//!     correlation_id: "correlation-id".to_string(),
//!     message_tag: "MessageTag1".to_string(),
//!     guid: "001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240".to_string(),
//!     sip_message: "INVITE".to_string(),
//! };
//!
//! correlator.add_message(entry);
//!
//! // Get all call sessions
//! let sessions = correlator.get_sessions();
//! for session in sessions {
//!     println!("Call: {} with {} messages", session.call_id, session.message_count());
//!
//!     // Render as ASCII diagram
//!     let renderer = DiagramRenderer::new();
//!     let diagram = renderer.render(&session, DiagramFormat::Markdown);
//!     println!("{}", diagram);
//! }
//! ```

pub mod correlator;
pub mod diagram_renderer;
pub mod state_machine;
pub mod timing_analyzer;
pub mod types;

// Re-export main types for convenience
pub use correlator::CallCorrelator;
pub use diagram_renderer::{DiagramConfig, DiagramFormat, DiagramRenderer};
pub use types::{CallSession, CallState, CallTimings, CtraceEntry, Direction, Endpoint, Transport};
