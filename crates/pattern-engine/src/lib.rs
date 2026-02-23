//! Pattern Engine - Core pattern matching functionality
//!
//! This crate provides the pattern matching engine for log analysis.
//! It includes pattern matching, parameter extraction, and severity evaluation.

pub mod call_flow;
pub mod cause_codes;
pub mod engine;
pub mod learning;
pub mod matcher;
pub mod normalizers;
pub mod pipeline;
pub mod processing_context;
pub mod types;
pub mod vendor_detection;

pub use call_flow::{
    CallCorrelator, CallSession, CallState, CallTimings, CtraceEntry, Direction, Endpoint,
    Transport,
};
pub use cause_codes::{CauseCodeRegistry, Vendor};
pub use engine::PatternEngine;
pub use learning::{
    LearningConfig, LearningEngine, LearningSummary, NormalizationRecommendation, PatternHint,
    PerformanceThresholds, VendorRecommendation,
};
pub use matcher::PatternMatcher;
pub use normalizers::{
    CubeNormalizer, CucNormalizer, CucmNormalizer, JabberNormalizer, NormalizerRegistry,
    VendorNormalizer,
};
pub use pipeline::{
    NormalizationHints, NormalizationPipeline, PipelineStats, ProcessingMode, ProcessingResult,
};
pub use processing_context::{ProcessingContext, ProcessingError, ProcessingSummary, VendorStats};
pub use types::{Pattern, PatternError, PatternMatch, Severity};
pub use vendor_detection::{VendorDetector, VendorMatch, VendorSignature};
