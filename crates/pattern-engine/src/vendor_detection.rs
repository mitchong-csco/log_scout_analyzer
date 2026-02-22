//! Vendor Detection for Multi-Format Log Analysis
//!
//! This module provides functionality to detect which vendor/product produced
//! a log line based on signature patterns. It uses weighted pattern matching
//! with confidence scoring to identify log formats.
//!
//! # Architecture
//!
//! The detection system works in two modes:
//! 1. **Quick Detection**: Fast heuristic checks for common patterns
//! 2. **Full Detection**: Comprehensive regex-based matching with confidence scoring
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::vendor_detection::VendorDetector;
//!
//! let detector = VendorDetector::new();
//! let log_line = "Jan 1 12:00:00.000: %SIP-6-INVITE";
//!
//! if let Some(match_result) = detector.detect(log_line) {
//!     println!("Detected: {} (confidence: {})",
//!              match_result.vendor_id, match_result.confidence);
//! }
//! ```

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

/// Vendor detector that identifies log formats
#[derive(Clone)]
pub struct VendorDetector {
    signatures: HashMap<String, VendorSignature>,
    quick_patterns: Vec<QuickPattern>,
}

/// Signature definition for a vendor/product
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorSignature {
    /// Unique vendor identifier (e.g., "cisco_cube")
    pub vendor_id: String,

    /// Human-readable name
    pub name: String,

    /// Weighted patterns for detection
    pub patterns: Vec<WeightedPattern>,

    /// Minimum confidence threshold (0.0-1.0)
    pub confidence_threshold: f32,

    /// Product name (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product: Option<String>,

    /// Additional metadata
    #[serde(default, skip_serializing_if = "HashMap::is_empty")]
    pub metadata: HashMap<String, String>,
}

/// Pattern with associated weight for confidence calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeightedPattern {
    /// Regex pattern to match
    pub pattern: String,

    /// Weight (0.0-1.0) - higher means more distinctive
    pub weight: f32,

    /// Description of what this pattern matches
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Compiled regex (not serialized)
    #[serde(skip)]
    regex: Option<Arc<Regex>>,
}

/// Quick pattern for fast heuristic detection
#[derive(Debug, Clone)]
struct QuickPattern {
    vendor_id: String,
    literal: String,
    confidence: f32,
}

/// Result of vendor detection
#[derive(Debug, Clone, PartialEq)]
pub struct VendorMatch {
    /// Detected vendor identifier
    pub vendor_id: String,

    /// Vendor name
    pub name: String,

    /// Confidence score (0.0-1.0)
    pub confidence: f32,

    /// Patterns that matched
    pub matched_patterns: Vec<String>,

    /// Product name if known
    pub product: Option<String>,
}

/// Detection mode for controlling accuracy vs performance trade-off
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DetectionMode {
    /// Fast heuristic checks only
    Quick,
    /// Full regex-based detection
    Full,
    /// Try quick first, fall back to full if needed
    Adaptive,
}

/// Error types for vendor detection
#[derive(Debug, thiserror::Error)]
pub enum DetectionError {
    #[error("Invalid regex pattern: {0}")]
    InvalidRegex(String),

    #[error("No signatures loaded")]
    NoSignatures,

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

impl VendorDetector {
    /// Create a new detector with default signatures
    pub fn new() -> Self {
        let mut detector = Self {
            signatures: HashMap::new(),
            quick_patterns: Vec::new(),
        };

        // Load default signatures
        detector.add_default_signatures();
        detector
    }

    /// Create a detector from configuration
    pub fn from_signatures(signatures: Vec<VendorSignature>) -> Result<Self, DetectionError> {
        let mut detector = Self {
            signatures: HashMap::new(),
            quick_patterns: Vec::new(),
        };

        for sig in signatures {
            detector.add_signature(sig)?;
        }

        Ok(detector)
    }

    /// Add a signature to the detector
    pub fn add_signature(&mut self, mut signature: VendorSignature) -> Result<(), DetectionError> {
        // Compile regex patterns
        for pattern in &mut signature.patterns {
            let regex = Regex::new(&pattern.pattern)
                .map_err(|e| DetectionError::InvalidRegex(format!("{}: {}", pattern.pattern, e)))?;
            pattern.regex = Some(Arc::new(regex));
        }

        // Add quick patterns for fast detection
        for pattern in &signature.patterns {
            if pattern.weight >= 0.8 {
                // High-weight patterns are good for quick detection
                if let Some(literal) = extract_literal_from_pattern(&pattern.pattern) {
                    self.quick_patterns.push(QuickPattern {
                        vendor_id: signature.vendor_id.clone(),
                        literal,
                        confidence: pattern.weight,
                    });
                }
            }
        }

        self.signatures
            .insert(signature.vendor_id.clone(), signature);
        Ok(())
    }

    /// Detect vendor with full regex matching
    pub fn detect(&self, log_sample: &str) -> Option<VendorMatch> {
        self.detect_with_mode(log_sample, DetectionMode::Full)
    }

    /// Quick detection using heuristics
    pub fn quick_detect(&self, log_sample: &str) -> Option<String> {
        for quick_pattern in &self.quick_patterns {
            if log_sample.contains(&quick_pattern.literal) {
                return Some(quick_pattern.vendor_id.clone());
            }
        }
        None
    }

    /// Detect with specified mode
    pub fn detect_with_mode(&self, log_sample: &str, mode: DetectionMode) -> Option<VendorMatch> {
        match mode {
            DetectionMode::Quick => {
                self.quick_detect(log_sample)
                    .and_then(|vendor_id| self.signatures.get(&vendor_id))
                    .map(|sig| VendorMatch {
                        vendor_id: sig.vendor_id.clone(),
                        name: sig.name.clone(),
                        confidence: 0.7, // Quick detection has lower confidence
                        matched_patterns: vec!["quick_match".to_string()],
                        product: sig.product.clone(),
                    })
            }
            DetectionMode::Full => self.detect_full(log_sample),
            DetectionMode::Adaptive => {
                // Try quick first
                if let Some(vendor_id) = self.quick_detect(log_sample) {
                    // Verify with full detection
                    if let Some(full_match) = self.detect_full(log_sample) {
                        if full_match.vendor_id == vendor_id {
                            return Some(full_match);
                        }
                    }
                }
                // Fall back to full detection
                self.detect_full(log_sample)
            }
        }
    }

    /// Full detection with regex matching and confidence scoring
    fn detect_full(&self, log_sample: &str) -> Option<VendorMatch> {
        let mut best_match: Option<VendorMatch> = None;
        let mut best_confidence = 0.0;

        for signature in self.signatures.values() {
            let mut total_weight = 0.0;
            let mut matched_weight = 0.0;
            let mut matched_patterns = Vec::new();

            for pattern in &signature.patterns {
                total_weight += pattern.weight;

                if let Some(regex) = &pattern.regex {
                    if regex.is_match(log_sample) {
                        matched_weight += pattern.weight;
                        matched_patterns.push(pattern.pattern.clone());
                    }
                }
            }

            // Calculate confidence as ratio of matched weight to total weight
            let confidence = if total_weight > 0.0 {
                matched_weight / total_weight
            } else {
                0.0
            };

            // Check if this match meets the threshold and is better than current best
            if confidence >= signature.confidence_threshold && confidence > best_confidence {
                best_confidence = confidence;
                best_match = Some(VendorMatch {
                    vendor_id: signature.vendor_id.clone(),
                    name: signature.name.clone(),
                    confidence,
                    matched_patterns,
                    product: signature.product.clone(),
                });
            }
        }

        best_match
    }

    /// Detect vendor from multiple log lines (more accurate)
    pub fn detect_from_sample(&self, log_lines: &[&str]) -> Option<VendorMatch> {
        let mut vendor_votes: HashMap<String, (f32, Vec<String>)> = HashMap::new();

        for line in log_lines {
            if let Some(detection) = self.detect(line) {
                let entry = vendor_votes
                    .entry(detection.vendor_id.clone())
                    .or_insert((0.0, Vec::new()));
                entry.0 += detection.confidence;
                entry.1.extend(detection.matched_patterns);
            }
        }

        // Find vendor with highest total confidence
        vendor_votes
            .into_iter()
            .max_by(|a, b| {
                a.1 .0
                    .partial_cmp(&b.1 .0)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
            .and_then(|(vendor_id, (total_confidence, patterns))| {
                self.signatures.get(&vendor_id).map(|sig| VendorMatch {
                    vendor_id: sig.vendor_id.clone(),
                    name: sig.name.clone(),
                    confidence: total_confidence / log_lines.len() as f32,
                    matched_patterns: patterns,
                    product: sig.product.clone(),
                })
            })
    }

    /// Get all supported vendors
    pub fn get_vendors(&self) -> Vec<String> {
        self.signatures.keys().cloned().collect()
    }

    /// Get signature for a specific vendor
    pub fn get_signature(&self, vendor_id: &str) -> Option<&VendorSignature> {
        self.signatures.get(vendor_id)
    }

    /// Add default Cisco signatures
    fn add_default_signatures(&mut self) {
        let signatures = vec![
            VendorSignature {
                vendor_id: "cisco_cube".to_string(),
                name: "Cisco IOS/CUBE".to_string(),
                product: Some("IOS".to_string()),
                confidence_threshold: 0.7,
                patterns: vec![
                    WeightedPattern {
                        pattern: r"ccsipDisplayMsg:".to_string(),
                        weight: 0.9,
                        description: Some("CUBE SIP message display marker".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"/SIP/Msg/".to_string(),
                        weight: 0.85,
                        description: Some("CUBE SIP message path".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\.\d{3}".to_string(),
                        weight: 0.5,
                        description: Some("IOS timestamp format".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"%SIP-\d+-".to_string(),
                        weight: 0.8,
                        description: Some("IOS SIP syslog format".to_string()),
                        regex: None,
                    },
                ],
                metadata: HashMap::new(),
            },
            VendorSignature {
                vendor_id: "cisco_cucm".to_string(),
                name: "Cisco Unified Call Manager".to_string(),
                product: Some("CUCM".to_string()),
                confidence_threshold: 0.75,
                patterns: vec![
                    WeightedPattern {
                        pattern: r"\|SIPTcp\|".to_string(),
                        weight: 0.95,
                        description: Some("CUCM SIP TCP marker".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\|AppId=Cisco CallManager\|".to_string(),
                        weight: 0.9,
                        description: Some("CUCM application identifier".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\|LocalAddr=".to_string(),
                        weight: 0.7,
                        description: Some("CUCM metadata field".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3}".to_string(),
                        weight: 0.6,
                        description: Some("CUCM timestamp format".to_string()),
                        regex: None,
                    },
                ],
                metadata: HashMap::new(),
            },
            VendorSignature {
                vendor_id: "cisco_jabber".to_string(),
                name: "Cisco Jabber Client".to_string(),
                product: Some("Jabber".to_string()),
                confidence_threshold: 0.7,
                patterns: vec![
                    WeightedPattern {
                        pattern: r"CSFClient\[".to_string(),
                        weight: 0.9,
                        description: Some("Jabber client identifier".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\[csf\.".to_string(),
                        weight: 0.85,
                        description: Some("CSF framework marker".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"SIP_MSG_(RECV|SENT)".to_string(),
                        weight: 0.8,
                        description: Some("Jabber SIP message direction".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3}".to_string(),
                        weight: 0.5,
                        description: Some("Jabber timestamp format".to_string()),
                        regex: None,
                    },
                ],
                metadata: HashMap::new(),
            },
            VendorSignature {
                vendor_id: "cisco_cuc".to_string(),
                name: "Cisco Unity Connection".to_string(),
                product: Some("CUC".to_string()),
                confidence_threshold: 0.75,
                patterns: vec![
                    WeightedPattern {
                        pattern: r"\[CUC-".to_string(),
                        weight: 0.95,
                        description: Some("CUC log marker".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"SIP\.Stack".to_string(),
                        weight: 0.8,
                        description: Some("CUC SIP stack identifier".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"Unity Connection".to_string(),
                        weight: 0.7,
                        description: Some("CUC product name".to_string()),
                        regex: None,
                    },
                ],
                metadata: HashMap::new(),
            },
            VendorSignature {
                vendor_id: "cisco_cup".to_string(),
                name: "Cisco Unified Presence/CUP Proxy".to_string(),
                product: Some("CUP".to_string()),
                confidence_threshold: 0.7,
                patterns: vec![
                    WeightedPattern {
                        pattern: r"SIPProxy".to_string(),
                        weight: 0.9,
                        description: Some("CUP Proxy identifier".to_string()),
                        regex: None,
                    },
                    WeightedPattern {
                        pattern: r"Presence Engine".to_string(),
                        weight: 0.85,
                        description: Some("CUP presence engine".to_string()),
                        regex: None,
                    },
                ],
                metadata: HashMap::new(),
            },
        ];

        for sig in signatures {
            let _ = self.add_signature(sig);
        }
    }
}

impl Default for VendorDetector {
    fn default() -> Self {
        Self::new()
    }
}

/// Extract a literal string from a regex pattern for quick detection
fn extract_literal_from_pattern(pattern: &str) -> Option<String> {
    // Simple heuristic: if pattern contains a literal sequence without special chars
    // First, strip common regex escape sequences
    let cleaned = pattern
        .replace(r"\|", "")
        .replace(r"\.", "")
        .replace(r"\[", "")
        .replace(r"\]", "");

    // Extract sequences of alphanumeric chars with some special chars
    let literal_pattern = regex::Regex::new(r"[a-zA-Z0-9_\-./:|]{4,}").ok()?;

    if let Some(mat) = literal_pattern.find(&cleaned) {
        let literal = mat.as_str();
        // Avoid capturing regex metacharacters
        if !literal.contains(|c: char| {
            c == '('
                || c == ')'
                || c == '['
                || c == ']'
                || c == '*'
                || c == '+'
                || c == '?'
                || c == '\\'
        }) {
            return Some(literal.to_string());
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_cisco_cube() {
        let detector = VendorDetector::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";

        let result = detector.detect(log);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.vendor_id, "cisco_cube");
        assert!(result.confidence >= 0.7);
    }

    #[test]
    fn test_detect_cisco_cucm() {
        let detector = VendorDetector::new();
        let log = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|LocalAddr=10.1.1.1";

        let result = detector.detect(log);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.vendor_id, "cisco_cucm");
        assert!(result.confidence >= 0.75);
    }

    #[test]
    fn test_detect_cisco_jabber() {
        let detector = VendorDetector::new();
        let log = "2024-01-15 10:30:00,123 INFO  [csf.sip] CSFClient[123] SIP_MSG_RECV: INVITE";

        let result = detector.detect(log);
        assert!(result.is_some());
        let result = result.unwrap();
        assert_eq!(result.vendor_id, "cisco_jabber");
    }

    #[test]
    fn test_quick_detect() {
        let detector = VendorDetector::new();
        let log = "Jan 15 10:30:00.123: ccsipDisplayMsg: Test";

        let result = detector.quick_detect(log);
        assert_eq!(result, Some("cisco_cube".to_string()));
    }

    #[test]
    fn test_detect_from_sample() {
        let detector = VendorDetector::new();
        let logs = vec![
            "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: test",
            "Jan 15 10:30:01.456: ccsipDisplayMsg: Received INVITE",
            "Jan 15 10:30:02.789: /SIP/Msg/ccsipDisplayMsg test",
        ];

        let result = detector.detect_from_sample(&logs);
        assert!(result.is_some(), "Expected detection result");
        let result = result.unwrap();
        assert_eq!(result.vendor_id, "cisco_cube");
    }

    #[test]
    fn test_no_match() {
        let detector = VendorDetector::new();
        let log = "Random log line with no vendor signatures";

        let result = detector.detect(log);
        assert!(result.is_none());
    }

    #[test]
    fn test_get_vendors() {
        let detector = VendorDetector::new();
        let vendors = detector.get_vendors();

        assert!(vendors.contains(&"cisco_cube".to_string()));
        assert!(vendors.contains(&"cisco_cucm".to_string()));
        assert!(vendors.contains(&"cisco_jabber".to_string()));
        assert!(vendors.contains(&"cisco_cuc".to_string()));
    }

    #[test]
    fn test_custom_signature() {
        let mut detector = VendorDetector::new();

        let custom_sig = VendorSignature {
            vendor_id: "custom_vendor".to_string(),
            name: "Custom Vendor".to_string(),
            product: None,
            confidence_threshold: 0.8,
            patterns: vec![WeightedPattern {
                pattern: r"CUSTOM_MARKER".to_string(),
                weight: 1.0,
                description: Some("Custom marker".to_string()),
                regex: None,
            }],
            metadata: HashMap::new(),
        };

        assert!(detector.add_signature(custom_sig).is_ok());

        let log = "Log line with CUSTOM_MARKER present";
        let result = detector.detect(log);
        assert!(result.is_some());
        assert_eq!(result.unwrap().vendor_id, "custom_vendor");
    }

    #[test]
    fn test_detection_modes() {
        let detector = VendorDetector::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Test";

        // Quick mode
        let quick = detector.detect_with_mode(log, DetectionMode::Quick);
        assert!(quick.is_some(), "Quick mode should detect");

        // Full mode
        let full = detector.detect_with_mode(log, DetectionMode::Full);
        assert!(full.is_some(), "Full mode should detect");

        // Adaptive mode
        let adaptive = detector.detect_with_mode(log, DetectionMode::Adaptive);
        assert!(adaptive.is_some(), "Adaptive mode should detect");
    }

    #[test]
    fn test_extract_literal() {
        assert_eq!(
            extract_literal_from_pattern("ccsipDisplayMsg:"),
            Some("ccsipDisplayMsg:".to_string())
        );
        assert_eq!(
            extract_literal_from_pattern(r"\|SIPTcp\|"),
            Some("SIPTcp".to_string())
        );
    }
}
