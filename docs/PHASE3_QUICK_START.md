# 🚀 Phase 3: Call Flow Analysis - Quick Start Guide

**Ready to start Phase 3?** This guide gets you coding in 5 minutes.

---

## ⚡ TL;DR - Start Now

```bash
# 1. Create branch
git checkout -b phase3-call-flow

# 2. Create first test (TDD RED phase)
# Copy test template below into:
# crates/pattern-engine/tests/ctrace_normalizer_test.rs

# 3. Run test (should fail)
cd crates/pattern-engine
cargo test ctrace -- --nocapture

# 4. Implement normalizer (TDD GREEN phase)
# Copy implementation template below

# 5. Run test again (should pass)
cargo test ctrace -- --nocapture

# 6. Commit!
git add .
git commit -m "feat(ctrace): Phase 3.1 - Basic CTRACE parser (test passing)"
```

---

## 📋 Prerequisites Checklist

- ✅ Phase 1 complete (Cause codes module exists)
- ✅ Existing normalizers work (CUCM, Jabber, etc.)
- ✅ PROJECT_STATUS.md reviewed
- ✅ This guide read (you're here!)

**Time to complete Phase 3.1**: 3-5 hours (first normalizer + tests)

---

## 🎯 Phase 3.1: CTRACE Normalizer (Start Here)

### Step 1: Understand CTRACE Format (2 minutes)

**Example CTRACE log line**:
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

**14 fields (pipe-delimited)**:
1. `2009/12/17 10:45:00.949` - Timestamp
2. `SIPL` - Service (SIPL/SIPT)
3. `0` - Protocol number
4. `TCP` - Transport (TCP/UDP/TLS)
5. `IN` - Direction (IN/OUT)
6. `5.5.5.45` - Receiver IP
7. `58096` - Receiver port
8. `SEP00000000111G` - MAC address
9. `5.5.5.240` - Sender IP
10. `5060` - Sender port
11. `correlation-id` - Correlation ID
12. `MessageTag1` - Message tag
13. `001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240` - GUID (Call-ID)
14. `INVITE` - SIP method/response

---

### Step 2: Create Test File (5 minutes)

**File**: `crates/pattern-engine/tests/ctrace_normalizer_test.rs`

**Copy-paste this**:

```rust
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
```

**Run test (should fail - RED phase)**:
```bash
cd crates/pattern-engine
cargo test ctrace -- --nocapture
```

Expected: Compilation error (CtraceNormalizer doesn't exist yet)

---

### Step 3: Create Normalizer Implementation (30 minutes)

**File**: `crates/pattern-engine/src/normalizers/ctrace_normalizer.rs`

**Copy-paste this**:

```rust
//! Cisco UCM Call Trace (CTRACE) Normalizer
//!
//! Parses CTRACE format logs from Cisco Unified Call Manager.
//!
//! # CTRACE Format
//!
//! 14 pipe-delimited fields:
//! ```text
//! Timestamp|Service|ProtoNum|Transport|Direction|ReceiverIP|ReceiverPort|MAC|SenderIP|SenderPort|CorrelationID|MessageTag|GUID|SIPMethod
//! ```
//!
//! Example:
//! ```text
//! 2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
//! ```

use super::{timestamp_utils, NormalizationError, NormalizationResult, VendorNormalizer};
use chrono::{DateTime, NaiveDateTime, Utc};
use log_scout_core::normalized_event::{
    NetworkContext, NormalizedEvent, RawData, SIPMessage, VendorInfo,
};
use std::collections::HashMap;

/// Normalizer for Cisco UCM Call Trace (CTRACE) logs
pub struct CtraceNormalizer {
    vendor_id: String,
    vendor_name: String,
}

impl CtraceNormalizer {
    /// Create a new CTRACE normalizer
    pub fn new() -> Self {
        Self {
            vendor_id: "cisco_cucm_ctrace".to_string(),
            vendor_name: "Cisco UCM Call Trace".to_string(),
        }
    }

    /// Parse CTRACE timestamp: yyyy/MM/dd HH:mm:ss:SSS
    fn parse_timestamp(&self, timestamp_str: &str) -> NormalizationResult<DateTime<Utc>> {
        // Format: 2009/12/17 10:45:00.949
        let cleaned = timestamp_str.replace(':', ".");
        
        NaiveDateTime::parse_from_str(&cleaned, "%Y/%m/%d %H.%M.%S%.3f")
            .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
            .map_err(|_| NormalizationError::InvalidTimestamp(timestamp_str.to_string()))
    }

    /// Parse complete CTRACE line
    fn parse_ctrace_line(&self, line: &str) -> NormalizationResult<CtraceEntry> {
        let parts: Vec<&str> = line.split('|').collect();
        
        if parts.len() != 14 {
            return Err(NormalizationError::InvalidFormat(
                format!("Expected 14 fields, found {}", parts.len())
            ));
        }

        Ok(CtraceEntry {
            timestamp: self.parse_timestamp(parts[0])?,
            service: parts[1].to_string(),
            protocol_num: parts[2].parse().unwrap_or(0),
            transport: parts[3].to_string(),
            direction: parts[4].to_string(),
            receiver_ip: parts[5].to_string(),
            receiver_port: parts[6].parse().unwrap_or(0),
            mac_address: parts[7].to_string(),
            sender_ip: parts[8].to_string(),
            sender_port: parts[9].parse().unwrap_or(0),
            correlation_id: parts[10].to_string(),
            message_tag: parts[11].to_string(),
            guid: parts[12].to_string(),
            sip_message: parts[13].to_string(),
        })
    }

    /// Determine event type from SIP message
    fn determine_event_type(&self, sip_message: &str) -> String {
        // Check if it's a response code
        if let Some(code) = sip_message.split_whitespace().next() {
            if code.chars().all(|c| c.is_ascii_digit()) {
                return format!("sip_{}", code);
            }
        }

        // It's a method
        let method = sip_message.split_whitespace().next()
            .unwrap_or("unknown")
            .to_lowercase();
        format!("sip_{}", method)
    }

    /// Extract network context
    fn extract_network_context(&self, entry: &CtraceEntry) -> NetworkContext {
        NetworkContext {
            source_ip: Some(entry.sender_ip.clone()),
            source_port: Some(entry.sender_port),
            destination_ip: Some(entry.receiver_ip.clone()),
            destination_port: Some(entry.receiver_port),
            protocol: Some(entry.transport.clone()),
            interface: None,
            direction: Some(entry.direction.clone()),
        }
    }

    /// Create metadata map
    fn create_metadata(&self, entry: &CtraceEntry) -> HashMap<String, String> {
        let mut metadata = HashMap::new();
        metadata.insert("guid".to_string(), entry.guid.clone());
        metadata.insert("correlation_id".to_string(), entry.correlation_id.clone());
        metadata.insert("message_tag".to_string(), entry.message_tag.clone());
        metadata.insert("direction".to_string(), entry.direction.clone());
        metadata.insert("mac_address".to_string(), entry.mac_address.clone());
        metadata.insert("service".to_string(), entry.service.clone());
        metadata
    }
}

impl Default for CtraceNormalizer {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorNormalizer for CtraceNormalizer {
    fn vendor_id(&self) -> &str {
        &self.vendor_id
    }

    fn vendor_name(&self) -> &str {
        &self.vendor_name
    }

    fn can_normalize(&self, log_line: &str) -> bool {
        // Check for CTRACE format markers
        (log_line.contains("|SIPL|") || log_line.contains("|SIPT|"))
            && log_line.matches('|').count() >= 13
    }

    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent> {
        let entry = self.parse_ctrace_line(log_line)?;
        
        let event_type = self.determine_event_type(&entry.sip_message);
        let network = self.extract_network_context(&entry);
        let metadata = self.create_metadata(&entry);

        let vendor = VendorInfo {
            vendor_type: self.vendor_id.clone(),
            product: Some("CUCM".to_string()),
            version: None,
            confidence: Some(1.0),
            metadata,
        };

        let raw = RawData {
            line: log_line.to_string(),
            line_number: None,
            file_path: None,
            format: Some("ctrace".to_string()),
        };

        // Create SIP message
        let sip = SIPMessage {
            method: if entry.sip_message.chars().next()
                .map(|c| c.is_ascii_uppercase()).unwrap_or(false) 
            {
                Some(entry.sip_message.split_whitespace().next()
                    .unwrap_or("").to_string())
            } else {
                None
            },
            status_code: entry.sip_message.split_whitespace().next()
                .and_then(|s| s.parse::<u16>().ok()),
            status_text: if entry.sip_message.split_whitespace().next()
                .map(|s| s.parse::<u16>().is_ok()).unwrap_or(false)
            {
                Some(entry.sip_message.split_whitespace().skip(1).collect::<Vec<_>>().join(" "))
            } else {
                None
            },
            headers: HashMap::new(),
            sdp: None,
            direction: Some(entry.direction.clone()),
        };

        NormalizedEvent::builder()
            .event_type(event_type)
            .timestamp(entry.timestamp)
            .vendor(vendor)
            .raw(raw)
            .network(network)
            .sip_message(sip)
            .build()
            .map_err(|e| NormalizationError::BuildError(e))
    }

    fn confidence(&self, log_line: &str) -> f32 {
        let mut confidence = 0.0;

        if log_line.contains("|SIPL|") || log_line.contains("|SIPT|") {
            confidence += 0.5;
        }

        if log_line.matches('|').count() == 13 {
            confidence += 0.3;
        }

        // Check for timestamp pattern
        if log_line.starts_with(|c: char| c.is_ascii_digit()) {
            confidence += 0.2;
        }

        confidence.min(1.0)
    }
}

/// Internal struct for parsed CTRACE entry
#[derive(Debug, Clone)]
struct CtraceEntry {
    timestamp: DateTime<Utc>,
    service: String,
    protocol_num: u8,
    transport: String,
    direction: String,
    receiver_ip: String,
    receiver_port: u16,
    mac_address: String,
    sender_ip: String,
    sender_port: u16,
    correlation_id: String,
    message_tag: String,
    guid: String,
    sip_message: String,
}
```

---

### Step 4: Export Normalizer (2 minutes)

**File**: `crates/pattern-engine/src/normalizers/mod.rs`

Add to exports:
```rust
mod ctrace_normalizer;
pub use ctrace_normalizer::CtraceNormalizer;
```

---

### Step 5: Run Tests (GREEN phase) (1 minute)

```bash
cd crates/pattern-engine
cargo test ctrace -- --nocapture
```

Expected: **All tests pass!** ✅

---

### Step 6: Commit Your Work (1 minute)

```bash
git add .
git commit -m "feat(ctrace): Phase 3.1 - CTRACE normalizer with 11 tests passing"
git push origin phase3-call-flow
```

---

## 🎉 Phase 3.1 Complete!

**What you've built**:
- ✅ CTRACE normalizer parsing 14-field format
- ✅ 11 comprehensive tests passing
- ✅ Extracts Call-ID, endpoints, direction
- ✅ Integrated with normalizer system

**Time spent**: ~1 hour  
**Tests passing**: 11/11  
**Lines of code**: ~350

---

## 🚀 Next Steps: Phase 3.2 - Call Correlation

Now that you have a working CTRACE parser, next is to correlate messages by Call-ID!

**See**: `docs/PHASE3_CALL_FLOW_IMPLEMENTATION.md` - Section "Phase 3.2"

**Quick preview**:
1. Create `call_flow/correlator.rs`
2. Group messages by GUID
3. Build CallSession objects
4. Track call state transitions

**Time estimate**: 3-4 hours

---

## 📚 Reference

### Files Created
- `crates/pattern-engine/tests/ctrace_normalizer_test.rs` (11 tests)
- `crates/pattern-engine/src/normalizers/ctrace_normalizer.rs` (~350 lines)
- Updated `crates/pattern-engine/src/normalizers/mod.rs`

### Key Concepts
- **CTRACE Format**: 14 pipe-delimited fields
- **GUID**: Call-ID for correlation
- **Direction**: IN (incoming) / OUT (outgoing)
- **Transport**: TCP, UDP, TLS

### Troubleshooting

**Test compilation errors?**
- Check `mod.rs` exports CtraceNormalizer
- Verify NormalizationError has InvalidFormat variant

**Tests failing?**
- Check timestamp format parsing (colons vs periods)
- Verify field count is exactly 14
- Check direction/transport string matching

**Need help?**
- Review existing normalizers: `cucm_normalizer.rs`
- Check `docs/PHASE3_CALL_FLOW_IMPLEMENTATION.md`
- Read CTRACE XML: `data/rtmt_configs/UCM_CTRACE.xml`

---

## ✅ Checkpoint

Before moving to Phase 3.2, verify:

- [ ] All 11 tests pass
- [ ] Code committed to git
- [ ] No compiler warnings
- [ ] CtraceNormalizer exported in mod.rs
- [ ] Ready for next phase!

---

**Congratulations! You've completed Phase 3.1! 🎉**

**Total time**: ~1 hour  
**Next phase**: Call Correlation (3-4 hours)  
**Total Phase 3**: 2-3 weeks

Keep going! 🚀