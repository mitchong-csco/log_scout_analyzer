//! Pattern Engine - Core pattern matching functionality
//!
//! This crate provides the pattern matching engine for log analysis.
//! It includes pattern matching, parameter extraction, and severity evaluation.

pub mod engine;
pub mod matcher;
pub mod normalizers;
pub mod types;
pub mod vendor_detection;

pub use engine::PatternEngine;
pub use matcher::PatternMatcher;
pub use normalizers::{
    CubeNormalizer, CucNormalizer, CucmNormalizer, JabberNormalizer, NormalizerRegistry,
    VendorNormalizer,
};
pub use types::{Pattern, PatternError, PatternMatch, Severity};
pub use vendor_detection::{VendorDetector, VendorMatch, VendorSignature};
