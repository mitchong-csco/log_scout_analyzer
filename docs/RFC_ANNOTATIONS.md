# RFC Annotations & Tooltip System Design

## Overview

This document describes how to integrate RFC (Request for Comments) references into the Log Scout Analyzer LSP server, providing educational tooltips and annotations that help users understand SIP protocol details directly in their editor.

---

## Goals

1. **Educational**: Help engineers learn SIP while analyzing logs
2. **Reference**: Quick access to RFC specifications without leaving the editor
3. **Context**: Understand why certain patterns/codes exist
4. **Professional**: Industry-standard documentation practices

---

## Implementation Strategy

### 1. RFC Metadata Database

Create a structured database of RFC references for SIP messages.

```rust
// lsp-server/src/parser/sip/rfc_metadata.rs

use std::collections::HashMap;
use lazy_static::lazy_static;

/// RFC reference with section details
#[derive(Debug, Clone)]
pub struct RfcReference {
    /// RFC number (e.g., 3261)
    pub rfc_number: u16,
    
    /// Section reference (e.g., "8.1.1")
    pub section: Option<String>,
    
    /// Brief description
    pub description: String,
    
    /// Full URL to RFC
    pub url: String,
    
    /// Optional notes
    pub notes: Option<String>,
}

impl RfcReference {
    /// Format as markdown for hover tooltip
    pub fn to_markdown(&self) -> String {
        let mut md = format!("**RFC {}**", self.rfc_number);
        
        if let Some(section) = &self.section {
            md.push_str(&format!(" §{}", section));
        }
        
        md.push_str(&format!("\n\n{}", self.description));
        
        if let Some(notes) = &self.notes {
            md.push_str(&format!("\n\n*Note: {}*", notes));
        }
        
        md.push_str(&format!("\n\n[View RFC]({})", self.url));
        
        md
    }
    
    /// Format as plain text
    pub fn to_text(&self) -> String {
        let mut text = format!("RFC {}", self.rfc_number);
        
        if let Some(section) = &self.section {
            text.push_str(&format!(" §{}", section));
        }
        
        text.push_str(&format!(": {}", self.description));
        
        text
    }
}

lazy_static! {
    /// RFC references for SIP methods
    pub static ref SIP_METHOD_RFCS: HashMap<&'static str, RfcReference> = {
        let mut map = HashMap::new();
        
        map.insert("INVITE", RfcReference {
            rfc_number: 3261,
            section: Some("13.1".to_string()),
            description: "Initiates a session or modifies session parameters".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-13.1".to_string(),
            notes: Some("INVITE is used to establish media sessions between user agents".to_string()),
        });
        
        map.insert("ACK", RfcReference {
            rfc_number: 3261,
            section: Some("13.2.1".to_string()),
            description: "Confirms final response to INVITE".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-13.2.1".to_string(),
            notes: Some("ACK completes the three-way handshake for INVITE".to_string()),
        });
        
        map.insert("BYE", RfcReference {
            rfc_number: 3261,
            section: Some("15.1".to_string()),
            description: "Terminates a session".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-15.1".to_string(),
            notes: Some("Either party can send BYE to end the call".to_string()),
        });
        
        map.insert("CANCEL", RfcReference {
            rfc_number: 3261,
            section: Some("9.1".to_string()),
            description: "Cancels a pending request".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-9.1".to_string(),
            notes: Some("Used to cancel a pending INVITE before final response".to_string()),
        });
        
        map.insert("REGISTER", RfcReference {
            rfc_number: 3261,
            section: Some("10".to_string()),
            description: "Registers contact information with a registrar".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-10".to_string(),
            notes: Some("Allows a UA to inform the network of its location".to_string()),
        });
        
        map.insert("OPTIONS", RfcReference {
            rfc_number: 3261,
            section: Some("11.1".to_string()),
            description: "Queries capabilities of a user agent".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-11.1".to_string(),
            notes: Some("Used for keepalives and capability discovery".to_string()),
        });
        
        map.insert("PRACK", RfcReference {
            rfc_number: 3262,
            section: Some("3".to_string()),
            description: "Acknowledges provisional responses reliably".to_string(),
            url: "https://tools.ietf.org/html/rfc3262#section-3".to_string(),
            notes: Some("Used with 100rel to ensure 1xx responses are received".to_string()),
        });
        
        map.insert("UPDATE", RfcReference {
            rfc_number: 3311,
            section: Some("5".to_string()),
            description: "Modifies session parameters before answer".to_string(),
            url: "https://tools.ietf.org/html/rfc3311#section-5".to_string(),
            notes: Some("Allows session modification during early dialog".to_string()),
        });
        
        map.insert("REFER", RfcReference {
            rfc_number: 3515,
            section: Some("2".to_string()),
            description: "Requests recipient to perform action (e.g., transfer)".to_string(),
            url: "https://tools.ietf.org/html/rfc3515#section-2".to_string(),
            notes: Some("Commonly used for call transfer operations".to_string()),
        });
        
        map.insert("SUBSCRIBE", RfcReference {
            rfc_number: 3265,
            section: Some("3.1".to_string()),
            description: "Subscribes to event notifications".to_string(),
            url: "https://tools.ietf.org/html/rfc3265#section-3.1".to_string(),
            notes: Some("Used for presence, MWI, and other event subscriptions".to_string()),
        });
        
        map.insert("NOTIFY", RfcReference {
            rfc_number: 3265,
            section: Some("3.2".to_string()),
            description: "Notifies subscriber of event state changes".to_string(),
            url: "https://tools.ietf.org/html/rfc3265#section-3.2".to_string(),
            notes: Some("Sent in response to SUBSCRIBE to convey event state".to_string()),
        });
        
        map.insert("INFO", RfcReference {
            rfc_number: 6086,
            section: Some("4".to_string()),
            description: "Sends mid-session information".to_string(),
            url: "https://tools.ietf.org/html/rfc6086#section-4".to_string(),
            notes: Some("Used for DTMF relay and other in-call signaling".to_string()),
        });
        
        map.insert("MESSAGE", RfcReference {
            rfc_number: 3428,
            section: Some("4".to_string()),
            description: "Sends instant message".to_string(),
            url: "https://tools.ietf.org/html/rfc3428#section-4".to_string(),
            notes: Some("SIP-based instant messaging".to_string()),
        });
        
        map
    };
    
    /// RFC references for SIP response codes
    pub static ref SIP_RESPONSE_RFCS: HashMap<u16, RfcReference> = {
        let mut map = HashMap::new();
        
        // 1xx Provisional Responses
        map.insert(100, RfcReference {
            rfc_number: 3261,
            section: Some("21.1.1".to_string()),
            description: "100 Trying - Extended search being performed".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.1.1".to_string(),
            notes: Some("Indicates request received and being processed".to_string()),
        });
        
        map.insert(180, RfcReference {
            rfc_number: 3261,
            section: Some("21.1.2".to_string()),
            description: "180 Ringing - Destination user agent is alerting".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.1.2".to_string(),
            notes: Some("Phone is ringing at called party".to_string()),
        });
        
        map.insert(181, RfcReference {
            rfc_number: 3261,
            section: Some("21.1.3".to_string()),
            description: "181 Call Is Being Forwarded".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.1.3".to_string(),
            notes: None,
        });
        
        map.insert(182, RfcReference {
            rfc_number: 3261,
            section: Some("21.1.4".to_string()),
            description: "182 Queued - Call placed in queue".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.1.4".to_string(),
            notes: Some("Destination has no resources, call queued".to_string()),
        });
        
        map.insert(183, RfcReference {
            rfc_number: 3261,
            section: Some("21.1.5".to_string()),
            description: "183 Session Progress - Early media or progress info".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.1.5".to_string(),
            notes: Some("Often used for early media (ringback tones, announcements)".to_string()),
        });
        
        // 2xx Success Responses
        map.insert(200, RfcReference {
            rfc_number: 3261,
            section: Some("21.2.1".to_string()),
            description: "200 OK - Request succeeded".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.2.1".to_string(),
            notes: Some("Call answered, registration successful, etc.".to_string()),
        });
        
        map.insert(202, RfcReference {
            rfc_number: 3261,
            section: Some("21.2.2".to_string()),
            description: "202 Accepted - Request accepted for processing".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.2.2".to_string(),
            notes: Some("Used for REFER acceptance".to_string()),
        });
        
        // 3xx Redirection Responses
        map.insert(300, RfcReference {
            rfc_number: 3261,
            section: Some("21.3.1".to_string()),
            description: "300 Multiple Choices - Several possible locations".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.3.1".to_string(),
            notes: None,
        });
        
        map.insert(301, RfcReference {
            rfc_number: 3261,
            section: Some("21.3.2".to_string()),
            description: "301 Moved Permanently - User has moved".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.3.2".to_string(),
            notes: Some("Contact header contains new permanent address".to_string()),
        });
        
        map.insert(302, RfcReference {
            rfc_number: 3261,
            section: Some("21.3.3".to_string()),
            description: "302 Moved Temporarily - User temporarily reachable elsewhere".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.3.3".to_string(),
            notes: Some("Contact header contains temporary address".to_string()),
        });
        
        // 4xx Client Error Responses
        map.insert(400, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.1".to_string()),
            description: "400 Bad Request - Syntax error in request".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.1".to_string(),
            notes: Some("Malformed request that cannot be processed".to_string()),
        });
        
        map.insert(401, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.2".to_string()),
            description: "401 Unauthorized - Authentication required".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.2".to_string(),
            notes: Some("Client must authenticate (WWW-Authenticate header)".to_string()),
        });
        
        map.insert(403, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.4".to_string()),
            description: "403 Forbidden - Request understood but refused".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.4".to_string(),
            notes: Some("Authorization will not help, request should not be repeated".to_string()),
        });
        
        map.insert(404, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.5".to_string()),
            description: "404 Not Found - User does not exist".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.5".to_string(),
            notes: Some("Request-URI user unknown at domain".to_string()),
        });
        
        map.insert(407, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.8".to_string()),
            description: "407 Proxy Authentication Required".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.8".to_string(),
            notes: Some("Client must authenticate with proxy (Proxy-Authenticate header)".to_string()),
        });
        
        map.insert(408, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.9".to_string()),
            description: "408 Request Timeout - Request took too long".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.9".to_string(),
            notes: Some("Server timed out waiting for client response".to_string()),
        });
        
        map.insert(480, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.18".to_string()),
            description: "480 Temporarily Unavailable - User not currently available".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.18".to_string(),
            notes: Some("Called party exists but unavailable (DND, offline, etc.)".to_string()),
        });
        
        map.insert(481, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.19".to_string()),
            description: "481 Call/Transaction Does Not Exist".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.19".to_string(),
            notes: Some("Request received for non-existent dialog".to_string()),
        });
        
        map.insert(486, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.24".to_string()),
            description: "486 Busy Here - Called party is busy".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.24".to_string(),
            notes: Some("Called user equipment can receive but user declines to answer".to_string()),
        });
        
        map.insert(487, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.25".to_string()),
            description: "487 Request Terminated - Request cancelled".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.25".to_string(),
            notes: Some("INVITE cancelled by originator (CANCEL received)".to_string()),
        });
        
        map.insert(488, RfcReference {
            rfc_number: 3261,
            section: Some("21.4.26".to_string()),
            description: "488 Not Acceptable Here - Media parameters unacceptable".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.4.26".to_string(),
            notes: Some("Offer in SDP unacceptable (codecs, bandwidth, etc.)".to_string()),
        });
        
        // 5xx Server Error Responses
        map.insert(500, RfcReference {
            rfc_number: 3261,
            section: Some("21.5.1".to_string()),
            description: "500 Server Internal Error".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.5.1".to_string(),
            notes: Some("Server encountered unexpected condition".to_string()),
        });
        
        map.insert(503, RfcReference {
            rfc_number: 3261,
            section: Some("21.5.4".to_string()),
            description: "503 Service Unavailable - Server temporarily unavailable".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.5.4".to_string(),
            notes: Some("Overload, maintenance, or temporary failure".to_string()),
        });
        
        // 6xx Global Failure Responses
        map.insert(600, RfcReference {
            rfc_number: 3261,
            section: Some("21.6.1".to_string()),
            description: "600 Busy Everywhere - All possible endpoints busy".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.6.1".to_string(),
            notes: Some("Called party busy on all devices".to_string()),
        });
        
        map.insert(603, RfcReference {
            rfc_number: 3261,
            section: Some("21.6.2".to_string()),
            description: "603 Decline - User explicitly rejected call".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.6.2".to_string(),
            notes: Some("User pressed reject button".to_string()),
        });
        
        map.insert(604, RfcReference {
            rfc_number: 3261,
            section: Some("21.6.3".to_string()),
            description: "604 Does Not Exist Anywhere - User does not exist".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-21.6.3".to_string(),
            notes: Some("Definitive 404 - user has no valid addresses".to_string()),
        });
        
        map
    };
    
    /// RFC references for SIP headers
    pub static ref SIP_HEADER_RFCS: HashMap<&'static str, RfcReference> = {
        let mut map = HashMap::new();
        
        map.insert("Call-ID", RfcReference {
            rfc_number: 3261,
            section: Some("20.8".to_string()),
            description: "Uniquely identifies a particular invitation or registration".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.8".to_string(),
            notes: Some("Must be globally unique across space and time".to_string()),
        });
        
        map.insert("CSeq", RfcReference {
            rfc_number: 3261,
            section: Some("20.16".to_string()),
            description: "Command Sequence - transaction ordering identifier".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.16".to_string(),
            notes: Some("Increments with each new request in a dialog".to_string()),
        });
        
        map.insert("Via", RfcReference {
            rfc_number: 3261,
            section: Some("20.42".to_string()),
            description: "Transport path taken by request, used for routing responses".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.42".to_string(),
            notes: Some("Each proxy adds Via header, response follows reverse path".to_string()),
        });
        
        map.insert("From", RfcReference {
            rfc_number: 3261,
            section: Some("20.20".to_string()),
            description: "Logical identity of initiator".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.20".to_string(),
            notes: Some("Contains tag parameter for dialog identification".to_string()),
        });
        
        map.insert("To", RfcReference {
            rfc_number: 3261,
            section: Some("20.39".to_string()),
            description: "Logical recipient of request".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.39".to_string(),
            notes: Some("Tag added by UAS to establish dialog".to_string()),
        });
        
        map.insert("Contact", RfcReference {
            rfc_number: 3261,
            section: Some("20.10".to_string()),
            description: "Direct route to contact user".to_string(),
            url: "https://tools.ietf.org/html/rfc3261#section-20.10".to_string(),
            notes: Some("Used for routing subsequent requests in dialog".to_string()),
        });
        
        map
    };
}

/// Get RFC reference for SIP method
pub fn get_method_rfc(method: &str) -> Option<&RfcReference> {
    SIP_METHOD_RFCS.get(method)
}

/// Get RFC reference for SIP response code
pub fn get_response_rfc(code: u16) -> Option<&RfcReference> {
    SIP_RESPONSE_RFCS.get(&code)
}

/// Get RFC reference for SIP header
pub fn get_header_rfc(header: &str) -> Option<&RfcReference> {
    SIP_HEADER_RFCS.get(header)
}
```

### 2. LSP Hover Provider Integration

Integrate RFC tooltips into the LSP hover provider.

```rust
// lsp-server/src/server.rs (add to existing hover implementation)

use crate::parser::sip::rfc_metadata::{get_method_rfc, get_response_rfc};

async fn hover(&self, params: HoverParams) -> Result<Option<Hover>> {
    let uri = &params.text_document_position_params.text_document.uri;
    let position = params.text_document_position_params.position;

    if let Some(doc) = self.documents.get(uri) {
        let lines: Vec<&str> = doc.lines().collect();
        if let Some(line) = lines.get(position.line as usize) {
            
            // Check for SIP method
            for method in &["INVITE", "ACK", "BYE", "CANCEL", "REGISTER", "OPTIONS", 
                           "PRACK", "UPDATE", "REFER", "SUBSCRIBE", "NOTIFY", "INFO", "MESSAGE"] {
                if line.contains(method) {
                    if let Some(rfc_ref) = get_method_rfc(method) {
                        let markdown = format!(
                            "### SIP Method: {}\n\n{}\n\n---\n\n{}",
                            method,
                            line.trim(),
                            rfc_ref.to_markdown()
                        );
                        
                        return Ok(Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: MarkupKind::Markdown,
                                value: markdown,
                            }),
                            range: None,
                        }));
                    }
                }
            }
            
            // Check for SIP response code
            if let Some(captures) = Regex::new(r"\b(\d{3})\s+(\w+)").unwrap().captures(line) {
                if let Ok(code) = captures[1].parse::<u16>() {
                    if let Some(rfc_ref) = get_response_rfc(code) {
                        let markdown = format!(
                            "### SIP Response: {} {}\n\n{}\n\n---\n\n{}",
                            code,
                            &captures[2],
                            line.trim(),
                            rfc_ref.to_markdown()
                        );
                        
                        return Ok(Some(Hover {
                            contents: HoverContents::Markup(MarkupContent {
                                kind: MarkupKind::Markdown,
                                value: markdown,
                            }),
                            range: None,
                        }));
                    }
                }
            }
            
            // Default hover
            let contents = HoverContents::Markup(MarkupContent {
                kind: MarkupKind::Markdown,
                value: format!("**Log Line {}**\n\n```\n{}\n```", position.line + 1, line),
            });

            return Ok(Some(Hover {
                contents,
                range: None,
            }));
        }
    }

    Ok(None)
}
```

### 3. Enhanced Diagnostics with RFC References

```rust
// lsp-server/src/server.rs

fn detection_to_diagnostic(&self, detection: &Detection) -> Diagnostic {
    let mut message = format!("{}: {}", 
        detection.pattern.name, 
        detection.pattern.description
    );
    
    // Add RFC reference if available
    if detection.pattern.category == "sip" {
        // Check if it's a method or response
        if let Some(method) = extract_sip_method(&detection.matched_text) {
            if let Some(rfc_ref) = get_method_rfc(&method) {
                message.push_str(&format!("\n\n📖 {}", rfc_ref.to_text()));
            }
        } else if let Some(code) = extract_sip_response_code(&detection.matched_text) {
            if let Some(rfc_ref) = get_response_rfc(code) {
                message.push_str(&format!("\n\n📖 {}", rfc_ref.to_text()));
            }
        }
    }
    
    Diagnostic {
        range: /* ... */,
        severity: /* ... */,
        message,
        // ... rest of diagnostic
    }
}
```

### 4. Code Comments with RFC References

```rust
// lsp-server/src/parser/sip/messages.rs

/// SIP INVITE method
/// 
/// RFC 3261 §13.1: The INVITE method indicates that the user or service is being
/// invited to participate in a session. The body of an INVITE request contains
/// a description of the session to which the callee is being invited.
///
/// # RFC Reference
/// - **RFC 3261** Section 13.1 - Initiating a Session
/// - URL: <https://tools.ietf.org/html/rfc3261#section-13.1>
///
/// # Call Flow
/// ```text
/// UAC              UAS
///  |---INVITE----->|
///  |<--100 Trying--|
///  |<--180 Ringing-|
///  |<--200 OK------|
///  |---ACK-------->|
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SipMethod {
    /// INVITE - Initiate a session (RFC 3261 §13.1)
    Invite,
    
    /// ACK - Acknowledge final response to INVITE (RFC 3261 §13.2.1)
    Ack,
    
    /// BYE - Terminate a session (RFC 3261 §15.1)
    Bye,
    
    /// CANCEL - Cancel a pending request (RFC 3261 §9.1)
    Cancel,
    
    /// REGISTER - Register contact information (RFC 3261 §10)
    Register,
    
    /// OPTIONS - Query capabilities (RFC 3261 §11.1)
    Options,
    
    /// PRACK - Acknowledge provisional response (RFC 3262 §3)
    Prack,
    
    /// UPDATE - Modify session during early dialog (RFC 3311 §5)
    Update,
    
    /// REFER - Transfer call or refer to another resource (RFC 3515 §2)
    Refer,
    
    /// SUBSCRIBE - Subscribe to event notifications (RFC 3265 §3.1)
    Subscribe,
    
    /// NOTIFY - Notify of event state changes (RFC 3265 §3.2)
    Notify,
    
    /// INFO - Send mid-session information (RFC 6086 §4)
    Info,
    
    /// MESSAGE - Send instant message (RFC 3428 §4)
    Message,
}

/// SIP Response Codes
///
/// All response codes defined in RFC 3261 §21 (Response Codes)
/// URL: <https://tools.ietf.org/html/rfc3261#section-21>
///
/// # Response Classes
/// - 1xx: Provisional (RFC 3261 §21.1)
/// - 2xx: Success (RFC 3261 §21.2)
/// - 3xx: Redirection (RFC 3261 §21.3)
/// - 4xx: Client Error (RFC 3261 §21.4)
/// - 5xx: Server Error (RFC 3261 §21.5)
/// - 6xx: Global Failure (RFC 3261 §21.6)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SipResponseCode(pub u16);

impl SipResponseCode {
    /// RFC 3261 §21.1.1 - Extended search being performed
    pub const TRYING: u16 = 100;
    
    /// RFC 3261 §21.1.2 - Destination user agent is alerting
    pub const RINGING: u16 = 180;
    
    /// RFC 3261 §21.2.1 - Request succeeded
    pub const OK: u16 = 200;
    
    /// RFC 3261 §21.4.2 - Authentication required
    pub const UNAUTHORIZED: u16 = 401;
    
    /// RFC 3261 §21.4.5 - User does not exist at domain
    pub const NOT_FOUND: u16 = 404;
    
    /// RFC 3261 §21.4.8 - Proxy authentication required
    pub const PROXY_AUTH_REQUIRED: u16 = 407;
    
    /// RFC 3261 §21.4.24 - Called party is busy
    pub const BUSY_HERE: u16 = 486;
    
    /// RFC 3261 §21.4.25 - Request cancelled by originator
    pub const REQUEST_TERMINATED: u16 = 487;
    
    /// RFC 3261 §21.5.4 - Server temporarily unavailable
    pub const SERVICE_UNAVAILABLE: u16 = 503;
    
    /// RFC 3261 §21.6.2 - User explicitly rejected call
    pub const DECLINE: u16 = 603;
}
```

---

## Usage Examples

### Example 1: Hover over INVITE

**User hovers over "INVITE" in log:**
```
2024-02-08 10:15:23 Sending INVITE to alice@example.com
```

**Tooltip displays:**
```markdown
### SIP Method: INVITE

2024-02-08 10:15:23 Sending INVITE to alice@example.com

---

**RFC 3261** §13.1

Initiates a session or modifies session parameters

*Note: INVITE is used to establish media sessions between user agents*

[View RFC](https://tools.ietf.org/html/rfc3261#section-13.1)
```

### Example 2: Hover over Response Code

**User hovers over "486" in log:**
```
2024-02-08 10:15:25 Received 486 Busy Here
```

**Tooltip displays:**
```markdown
### SIP Response: 486 Busy Here

2024-02-08 10:15:25 Received 486 Busy Here

---

**RFC 3261** §21.4.24

486 Busy Here - Called party is busy

*Note: Called user equipment can receive but user declines to answer*

[View RFC](https://tools.ietf.org/html/rfc3261#section-21.4.24)
```

### Example 3: Diagnostic with RFC

**Problem panel shows:**
```
❌ Error (Line 42): Call Setup Failed - 486 Busy Here

📖 RFC 3261 §21.4.24: 486 Busy Here - Called party is busy
```

---

## Benefits

### 1. Educational Value
- Engineers learn SIP while analyzing logs
- No need to switch to browser for RFC lookups
- Contextual learning (see RFC in context of actual logs)

### 2. Faster Troubleshooting
- Understand error codes immediately
- Know which RFC section to reference for details
- Reduce time spent searching documentation

### 3. Professional Tool
- Industry-standard references
- Authoritative source (IETF RFCs)
- Credibility for enterprise environments

### 4. Self-Documenting Code
- Future developers understand design decisions
- Clear traceability to specifications
- Easier maintenance and extension

---

## Implementation Checklist

- [ ] Create `rfc_metadata.rs` with RFC database
- [ ] Add RFC references for all SIP methods
- [ ] Add RFC references for all response codes (1xx-6xx)
- [ ] Add RFC references for common headers
- [ ] Integrate RFC tooltips into hover provider
- [ ] Enhance diagnostics with RFC references
- [ ] Add RFC references to code comments
- [ ] Create unit tests for RFC lookups
- [ ] Add examples to documentation

---

## Future Enhancements

### 1. Cisco-Specific RFCs
```rust
pub static ref CISCO_RFCS: HashMap<&'static str, RfcReference> = {
    // Cisco proprietary headers and extensions
};
```

### 2. Interactive RFC Links
- Click-through to open RFC in browser
- Code action to "View Full RFC Section"
- Copy RFC reference to clipboard

### 3. RFC Learning Mode
- Quiz mode: guess the RFC for a response code
- Show common mistakes (e.g., 404 vs 480)
- Suggest best practices from RFCs

### 4. Multi-Protocol Support
- H.323 ITU-T recommendations
- MGCP RFCs
- WebRTC W3C specifications

---

## References

- [RFC 3261 - SIP](https://tools.ietf.org/html/rfc3261)
- [RFC 3262 - PRACK](https://tools.ietf.org/html/rfc3262)
- [RFC 3265 - Event Notification](https://tools.ietf.org/html/rfc3265)
- [RFC 3311 - UPDATE](https://tools.ietf.org/html/rfc3311)
- [RFC 3515 - REFER](https://tools.ietf.org/html/rfc3515)
- [RFC 3428 - MESSAGE](https://tools.ietf.org/html/rfc3428)
- [RFC 6086 - INFO](https://tools.ietf.org/html/rfc6086)

---

**Summary**: RFC annotations transform the log analyzer into an educational tool that helps engineers understand SIP while troubleshooting, making it more valuable and professional.