//! Vendor Normalizers - Convert vendor-specific logs to NormalizedEvent
//!
//! This module provides the trait and implementations for parsing vendor-specific
//! log formats and converting them into the universal NormalizedEvent schema.
//!
//! # Architecture
//!
//! Each vendor has a dedicated normalizer that implements the `VendorNormalizer` trait:
//! - `CubeNormalizer` - Cisco IOS/CUBE logs
//! - `CucmNormalizer` - Cisco CUCM logs
//! - `JabberNormalizer` - Cisco Jabber logs
//! - `CucNormalizer` - Cisco Unity Connection logs
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::normalizers::{VendorNormalizer, CubeNormalizer};
//!
//! let normalizer = CubeNormalizer::new();
//! let raw_log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ...";
//!
//! if normalizer.can_normalize(raw_log) {
//!     let event = normalizer.normalize(raw_log)?;
//!     println!("Normalized: {:?}", event);
//! }
//! ```

use log_scout_core::normalized_event::NormalizedEvent;
use std::collections::HashMap;

pub mod ctrace_normalizer;
pub mod cube_normalizer;
pub mod cuc_normalizer;
pub mod cucm_normalizer;
pub mod jabber_normalizer;

pub use ctrace_normalizer::CtraceNormalizer;
pub use cube_normalizer::CubeNormalizer;
pub use cuc_normalizer::CucNormalizer;
pub use cucm_normalizer::CucmNormalizer;
pub use jabber_normalizer::JabberNormalizer;

/// Error types for normalization operations
#[derive(Debug, thiserror::Error)]
pub enum NormalizationError {
    #[error("Failed to parse log line: {0}")]
    ParseError(String),

    #[error("Unsupported log format: {0}")]
    UnsupportedFormat(String),

    #[error("Invalid format: {0}")]
    InvalidFormat(String),

    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Invalid timestamp format: {0}")]
    InvalidTimestamp(String),

    #[error("Regex error: {0}")]
    RegexError(#[from] regex::Error),

    #[error("Event building failed: {0}")]
    BuildError(String),
}

/// Result type for normalization operations
pub type NormalizationResult<T> = Result<T, NormalizationError>;

/// Trait for vendor-specific log normalizers
///
/// Each vendor implements this trait to convert their specific log format
/// into the universal `NormalizedEvent` structure.
pub trait VendorNormalizer: Send + Sync {
    /// Get the vendor identifier (e.g., "cisco_cube", "cisco_cucm")
    fn vendor_id(&self) -> &str;

    /// Get the human-readable vendor name
    fn vendor_name(&self) -> &str;

    /// Check if this normalizer can handle the given log line
    ///
    /// This should be a fast check (substring matching, simple regex)
    fn can_normalize(&self, log_line: &str) -> bool;

    /// Normalize a raw log line into a NormalizedEvent
    ///
    /// This performs the full parsing and conversion to the normalized format.
    fn normalize(&self, log_line: &str) -> NormalizationResult<NormalizedEvent>;

    /// Get the confidence that this normalizer is correct for the log
    ///
    /// Returns a value between 0.0 and 1.0. Default implementation
    /// returns 1.0 if can_normalize is true, 0.0 otherwise.
    fn confidence(&self, log_line: &str) -> f32 {
        if self.can_normalize(log_line) {
            1.0
        } else {
            0.0
        }
    }

    /// Normalize multiple log lines in batch
    ///
    /// Default implementation processes each line individually,
    /// but vendors can override for optimizations.
    fn normalize_batch(&self, log_lines: &[&str]) -> Vec<NormalizationResult<NormalizedEvent>> {
        log_lines.iter().map(|line| self.normalize(line)).collect()
    }
}

/// Common utilities for parsing timestamps
pub mod timestamp_utils {
    use super::NormalizationError;
    use chrono::{DateTime, Datelike, NaiveDateTime, Utc};

    /// Parse Cisco IOS timestamp format: "Jan 15 10:30:00.123"
    pub fn parse_ios_timestamp(timestamp_str: &str) -> Result<DateTime<Utc>, NormalizationError> {
        // IOS logs don't include year, so we use current year
        let current_year = Utc::now().year();
        let with_year = format!("{} {}", current_year, timestamp_str);

        // Try formats with and without milliseconds
        let formats = ["%Y %b %d %H:%M:%S%.3f", "%Y %b %d %H:%M:%S"];

        for format in &formats {
            if let Ok(naive) = NaiveDateTime::parse_from_str(&with_year, format) {
                return Ok(DateTime::from_naive_utc_and_offset(naive, Utc));
            }
        }

        Err(NormalizationError::InvalidTimestamp(
            timestamp_str.to_string(),
        ))
    }

    /// Parse CUCM timestamp format: "2024-01-15 10:30:00,123"
    pub fn parse_cucm_timestamp(timestamp_str: &str) -> Result<DateTime<Utc>, NormalizationError> {
        // CUCM uses comma instead of period for milliseconds
        let normalized = timestamp_str.replace(',', ".");

        let formats = ["%Y-%m-%d %H:%M:%S%.3f", "%Y-%m-%d %H:%M:%S"];

        for format in &formats {
            if let Ok(naive) = NaiveDateTime::parse_from_str(&normalized, format) {
                return Ok(DateTime::from_naive_utc_and_offset(naive, Utc));
            }
        }

        Err(NormalizationError::InvalidTimestamp(
            timestamp_str.to_string(),
        ))
    }

    /// Parse Jabber timestamp format: "2024-01-15 10:30:00,123"
    pub fn parse_jabber_timestamp(
        timestamp_str: &str,
    ) -> Result<DateTime<Utc>, NormalizationError> {
        // Jabber format is same as CUCM
        parse_cucm_timestamp(timestamp_str)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_parse_ios_timestamp() {
            let result = parse_ios_timestamp("Jan 15 10:30:00.123");
            assert!(result.is_ok());
        }

        #[test]
        fn test_parse_cucm_timestamp() {
            let result = parse_cucm_timestamp("2024-01-15 10:30:00,123");
            assert!(result.is_ok());
        }

        #[test]
        fn test_parse_invalid_timestamp() {
            let result = parse_ios_timestamp("invalid");
            assert!(result.is_err());
        }
    }
}

/// Common utilities for parsing SIP headers
pub mod sip_utils {
    use lazy_static::lazy_static;
    use log_scout_core::normalized_event::{CSeq, SIPAddress, SIPHeaders};
    use regex::Regex;
    use std::collections::HashMap;

    lazy_static! {
        static ref CALL_ID_REGEX: Regex = Regex::new(r"Call-ID:\s*([^\r\n]+)").unwrap();
        static ref FROM_REGEX: Regex =
            Regex::new(r#"From:\s*(?:"([^"]*)")?\s*<?(sip:[^>;\s]+)>?(?:;tag=([^;\s]+))?"#)
                .unwrap();
        static ref TO_REGEX: Regex =
            Regex::new(r#"To:\s*(?:"([^"]*)")?\s*<?(sip:[^>;\s]+)>?(?:;tag=([^;\s]+))?"#).unwrap();
        static ref CSEQ_REGEX: Regex = Regex::new(r"CSeq:\s*(\d+)\s+(\w+)").unwrap();
        static ref CONTACT_REGEX: Regex = Regex::new(r"Contact:\s*<?(sip:[^>\r\n]+)>?").unwrap();
    }

    /// Parse Call-ID header
    pub fn parse_call_id(text: &str) -> Option<String> {
        CALL_ID_REGEX
            .captures(text)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().trim().to_string())
    }

    /// Parse From header into SIPAddress
    pub fn parse_from_header(text: &str) -> Option<SIPAddress> {
        FROM_REGEX.captures(text).map(|c| {
            let display_name = c.get(1).map(|m| m.as_str().to_string());
            let uri = c.get(2).map(|m| m.as_str().to_string()).unwrap_or_default();
            let tag = c.get(3).map(|m| m.as_str().to_string());

            SIPAddress {
                display_name,
                uri,
                tag,
                parameters: HashMap::new(),
            }
        })
    }

    /// Parse To header into SIPAddress
    pub fn parse_to_header(text: &str) -> Option<SIPAddress> {
        TO_REGEX.captures(text).map(|c| {
            let display_name = c.get(1).map(|m| m.as_str().to_string());
            let uri = c.get(2).map(|m| m.as_str().to_string()).unwrap_or_default();
            let tag = c.get(3).map(|m| m.as_str().to_string());

            SIPAddress {
                display_name,
                uri,
                tag,
                parameters: HashMap::new(),
            }
        })
    }

    /// Parse CSeq header
    pub fn parse_cseq(text: &str) -> Option<CSeq> {
        CSEQ_REGEX.captures(text).and_then(|c| {
            let number = c.get(1)?.as_str().parse().ok()?;
            let method = c.get(2)?.as_str().to_string();
            Some(CSeq { number, method })
        })
    }

    /// Parse Contact header
    pub fn parse_contact(text: &str) -> Option<String> {
        CONTACT_REGEX
            .captures(text)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str().to_string())
    }

    /// Extract all SIP headers from a SIP message
    pub fn extract_sip_headers(sip_message: &str) -> SIPHeaders {
        SIPHeaders {
            call_id: parse_call_id(sip_message),
            from: parse_from_header(sip_message),
            to: parse_to_header(sip_message),
            cseq: parse_cseq(sip_message),
            contact: parse_contact(sip_message),
            ..Default::default()
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn test_parse_call_id() {
            let sip = "INVITE sip:bob@example.com SIP/2.0\r\nCall-ID: abc123@host\r\n";
            assert_eq!(parse_call_id(sip), Some("abc123@host".to_string()));
        }

        #[test]
        fn test_parse_from_header() {
            let sip = r#"From: "Alice" <sip:alice@example.com>;tag=tag1"#;
            let from = parse_from_header(sip).unwrap();
            assert_eq!(from.display_name, Some("Alice".to_string()));
            assert_eq!(from.uri, "sip:alice@example.com");
            assert_eq!(from.tag, Some("tag1".to_string()));
        }

        #[test]
        fn test_parse_cseq() {
            let sip = "CSeq: 1 INVITE";
            let cseq = parse_cseq(sip).unwrap();
            assert_eq!(cseq.number, 1);
            assert_eq!(cseq.method, "INVITE");
        }
    }
}

/// Registry for managing multiple normalizers
pub struct NormalizerRegistry {
    normalizers: HashMap<String, Box<dyn VendorNormalizer>>,
}

impl NormalizerRegistry {
    /// Create a new registry with default normalizers
    pub fn new() -> Self {
        let mut registry = Self {
            normalizers: HashMap::new(),
        };

        // Register default normalizers
        registry.register(Box::new(CubeNormalizer::new()));
        registry.register(Box::new(CucmNormalizer::new()));
        registry.register(Box::new(CtraceNormalizer::new()));
        registry.register(Box::new(JabberNormalizer::new()));
        registry.register(Box::new(CucNormalizer::new()));

        registry
    }

    /// Register a normalizer
    pub fn register(&mut self, normalizer: Box<dyn VendorNormalizer>) {
        let vendor_id = normalizer.vendor_id().to_string();
        self.normalizers.insert(vendor_id, normalizer);
    }

    /// Get a normalizer by vendor ID
    pub fn get(&self, vendor_id: &str) -> Option<&dyn VendorNormalizer> {
        self.normalizers.get(vendor_id).map(|b| b.as_ref())
    }

    /// Find the best normalizer for a log line
    pub fn find_normalizer(&self, log_line: &str) -> Option<&dyn VendorNormalizer> {
        self.normalizers
            .values()
            .filter(|n| n.can_normalize(log_line))
            .max_by(|a, b| {
                a.confidence(log_line)
                    .partial_cmp(&b.confidence(log_line))
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .map(|b| b.as_ref())
    }

    /// Get all registered vendor IDs
    pub fn list_vendors(&self) -> Vec<String> {
        self.normalizers.keys().cloned().collect()
    }
}

impl Default for NormalizerRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_creation() {
        let registry = NormalizerRegistry::new();
        let vendors = registry.list_vendors();
        assert!(!vendors.is_empty());
        assert!(vendors.contains(&"cisco_cube".to_string()));
    }

    #[test]
    fn test_get_normalizer() {
        let registry = NormalizerRegistry::new();
        let normalizer = registry.get("cisco_cube");
        assert!(normalizer.is_some());
    }
}
