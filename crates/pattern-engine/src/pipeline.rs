//! Normalization Pipeline - Progressive processing with fast and slow paths
//!
//! This module implements the progressive normalization pipeline that intelligently
//! decides whether to use fast path (raw pattern matching) or slow path (normalization).
//!
//! # Architecture
//!
//! ```text
//! ┌─────────────────────────────────────────────────────────┐
//! │                   Log Line Input                        │
//! └─────────────────────────────────────────────────────────┘
//!                          ↓
//!              ┌───────────────────────┐
//!              │   Vendor Detection    │
//!              └───────────────────────┘
//!                          ↓
//!              ┌───────────────────────┐
//!              │   Should Normalize?   │
//!              └───────────────────────┘
//!                   ↙            ↘
//!          Fast Path              Slow Path
//!     (Raw Matching Only)    (Normalize + Match)
//!                   ↘            ↙
//!              ┌───────────────────────┐
//!              │   Processing Result   │
//!              └───────────────────────┘
//! ```
//!
//! # Decision Logic
//!
//! Fast path is used when:
//! - Single vendor detected in file
//! - No cross-vendor correlation needed
//! - Pattern match succeeds on raw log
//!
//! Slow path is used when:
//! - Multiple vendors detected in same file
//! - Cross-vendor correlation needed
//! - Explicit normalization requested
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::{NormalizationPipeline, ProcessingMode};
//!
//! let pipeline = NormalizationPipeline::new();
//!
//! // Process a log line
//! let result = pipeline.process("Jan 15 10:30:00: %SIP-6-INVITE: ...")?;
//!
//! match result {
//!     ProcessingResult::FastPath { raw_log, vendor, .. } => {
//!         println!("Fast path: {}", vendor);
//!     }
//!     ProcessingResult::Normalized { event, .. } => {
//!         println!("Normalized: {:?}", event);
//!     }
//! }
//! ```

use crate::normalizers::{NormalizationResult, NormalizerRegistry};
use crate::processing_context::ProcessingContext;
use crate::vendor_detection::{VendorDetector, VendorMatch};
use log_scout_core::normalized_event::NormalizedEvent;
use std::sync::Arc;

/// Processing mode for the pipeline
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessingMode {
    /// Always use fast path (raw matching only)
    FastOnly,
    /// Always use slow path (always normalize)
    NormalizeAlways,
    /// Adaptive mode (decide based on context)
    Adaptive,
}

impl Default for ProcessingMode {
    fn default() -> Self {
        Self::Adaptive
    }
}

/// Result of processing a log line through the pipeline
#[derive(Debug, Clone)]
pub enum ProcessingResult {
    /// Fast path result - raw log with vendor detection
    FastPath {
        raw_log: String,
        vendor: VendorMatch,
        processing_time_us: u64,
    },
    /// Slow path result - normalized event
    Normalized {
        event: NormalizedEvent,
        vendor: VendorMatch,
        processing_time_us: u64,
    },
    /// No vendor detected
    Unknown {
        raw_log: String,
        processing_time_us: u64,
    },
}

/// Hints for normalization decisions (learning system)
#[derive(Debug, Clone, Default)]
pub struct NormalizationHints {
    /// Threshold for multi-vendor detection (0.0-1.0)
    pub multi_vendor_threshold: f32,
    /// Lines to sample before making decision
    pub sample_size: usize,
    /// Enable learning from processing results
    pub enable_learning: bool,
}

impl NormalizationHints {
    /// Create default hints
    pub fn new() -> Self {
        Self {
            multi_vendor_threshold: 0.2, // If > 20% are different vendors, consider multi-vendor
            sample_size: 100,            // Sample first 100 lines
            enable_learning: true,
        }
    }

    /// Create hints optimized for single-vendor scenarios
    pub fn single_vendor() -> Self {
        Self {
            multi_vendor_threshold: 0.5, // Higher threshold
            sample_size: 50,
            enable_learning: true,
        }
    }

    /// Create hints optimized for multi-vendor scenarios
    pub fn multi_vendor() -> Self {
        Self {
            multi_vendor_threshold: 0.1, // Lower threshold
            sample_size: 200,
            enable_learning: true,
        }
    }
}

/// Normalization Pipeline - coordinates detection and normalization
pub struct NormalizationPipeline {
    detector: VendorDetector,
    normalizers: Arc<NormalizerRegistry>,
    mode: ProcessingMode,
    hints: NormalizationHints,
}

impl NormalizationPipeline {
    /// Create a new pipeline with default settings
    pub fn new() -> Self {
        Self {
            detector: VendorDetector::default(),
            normalizers: Arc::new(NormalizerRegistry::new()),
            mode: ProcessingMode::default(),
            hints: NormalizationHints::new(),
        }
    }

    /// Create a pipeline with custom mode
    pub fn with_mode(mode: ProcessingMode) -> Self {
        Self {
            detector: VendorDetector::default(),
            normalizers: Arc::new(NormalizerRegistry::new()),
            mode,
            hints: NormalizationHints::new(),
        }
    }

    /// Create a pipeline with custom hints
    pub fn with_hints(hints: NormalizationHints) -> Self {
        Self {
            detector: VendorDetector::default(),
            normalizers: Arc::new(NormalizerRegistry::new()),
            mode: ProcessingMode::default(),
            hints,
        }
    }

    /// Set the processing mode
    pub fn set_mode(&mut self, mode: ProcessingMode) {
        self.mode = mode;
    }

    /// Get the current processing mode
    pub fn mode(&self) -> ProcessingMode {
        self.mode
    }

    /// Process a single log line
    pub fn process(&self, log_line: &str) -> ProcessingResult {
        self.process_with_context(log_line, &ProcessingContext::new())
    }

    /// Process a log line with context
    pub fn process_with_context(
        &self,
        log_line: &str,
        context: &ProcessingContext,
    ) -> ProcessingResult {
        let start = std::time::Instant::now();

        // Step 1: Detect vendor
        let vendor_match = match self.detector.detect(log_line) {
            Some(vendor) => vendor,
            None => {
                let elapsed = start.elapsed().as_micros() as u64;
                return ProcessingResult::Unknown {
                    raw_log: log_line.to_string(),
                    processing_time_us: elapsed,
                };
            }
        };

        // Step 2: Decide whether to normalize
        let should_normalize = self.should_normalize(&vendor_match, context);

        let elapsed = start.elapsed().as_micros() as u64;

        // Step 3: Take appropriate path
        if should_normalize {
            // Slow path: Normalize the log
            match self.normalize_log(log_line, &vendor_match) {
                Ok(event) => ProcessingResult::Normalized {
                    event,
                    vendor: vendor_match,
                    processing_time_us: elapsed,
                },
                Err(_) => {
                    // Fallback to fast path if normalization fails
                    ProcessingResult::FastPath {
                        raw_log: log_line.to_string(),
                        vendor: vendor_match,
                        processing_time_us: elapsed,
                    }
                }
            }
        } else {
            // Fast path: Return raw log with vendor info
            ProcessingResult::FastPath {
                raw_log: log_line.to_string(),
                vendor: vendor_match,
                processing_time_us: elapsed,
            }
        }
    }

    /// Process multiple log lines in batch
    pub fn process_batch(&self, log_lines: &[&str]) -> Vec<ProcessingResult> {
        let mut context = ProcessingContext::new();
        let mut results = Vec::with_capacity(log_lines.len());

        for log_line in log_lines {
            let result = self.process_with_context(log_line, &context);

            // Update context based on result
            match &result {
                ProcessingResult::FastPath { vendor, .. } => {
                    context.record_vendor(&vendor.vendor_id, vendor.confidence);
                    context.record_fast_path(&vendor.vendor_id);
                }
                ProcessingResult::Normalized { vendor, .. } => {
                    context.record_vendor(&vendor.vendor_id, vendor.confidence);
                    context.record_normalization(&vendor.vendor_id);
                }
                ProcessingResult::Unknown { .. } => {}
            }

            results.push(result);
        }

        results
    }

    /// Decide whether to normalize based on context
    fn should_normalize(&self, vendor_match: &VendorMatch, context: &ProcessingContext) -> bool {
        match self.mode {
            ProcessingMode::FastOnly => false,
            ProcessingMode::NormalizeAlways => true,
            ProcessingMode::Adaptive => {
                // Force normalization if requested
                if context.force_normalize {
                    return true;
                }

                // Always normalize if confidence is low (ambiguous format)
                if vendor_match.confidence < 0.7 {
                    return true;
                }

                // Normalize if we're still in the sampling phase
                if context.lines_processed < self.hints.sample_size {
                    // Check if we're seeing vendor diversity
                    return context.vendor_diversity() > self.hints.multi_vendor_threshold;
                }

                // After sampling, normalize if multi-vendor scenario
                context.is_multi_vendor()
            }
        }
    }

    /// Normalize a log line using the appropriate normalizer
    fn normalize_log(
        &self,
        log_line: &str,
        vendor_match: &VendorMatch,
    ) -> NormalizationResult<NormalizedEvent> {
        let normalizer = self
            .normalizers
            .get(&vendor_match.vendor_id)
            .ok_or_else(|| {
                crate::normalizers::NormalizationError::UnsupportedFormat(format!(
                    "No normalizer found for vendor: {}",
                    vendor_match.vendor_id
                ))
            })?;

        normalizer.normalize(log_line)
    }

    /// Get statistics about the pipeline
    pub fn stats(&self) -> PipelineStats {
        PipelineStats {
            mode: self.mode,
            normalizers_count: self.normalizers.list_vendors().len(),
            multi_vendor_threshold: self.hints.multi_vendor_threshold,
            sample_size: self.hints.sample_size,
        }
    }
}

impl Default for NormalizationPipeline {
    fn default() -> Self {
        Self::new()
    }
}

/// Statistics about the pipeline configuration
#[derive(Debug, Clone)]
pub struct PipelineStats {
    pub mode: ProcessingMode,
    pub normalizers_count: usize,
    pub multi_vendor_threshold: f32,
    pub sample_size: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipeline_creation() {
        let pipeline = NormalizationPipeline::new();
        assert_eq!(pipeline.mode(), ProcessingMode::Adaptive);
    }

    #[test]
    fn test_pipeline_with_mode() {
        let pipeline = NormalizationPipeline::with_mode(ProcessingMode::FastOnly);
        assert_eq!(pipeline.mode(), ProcessingMode::FastOnly);
    }

    #[test]
    fn test_processing_context() {
        let mut context = ProcessingContext::new();
        assert_eq!(context.lines_processed, 0);
        assert!(!context.is_multi_vendor());

        context.record_vendor("cisco_cube", 0.95);
        assert_eq!(context.lines_processed, 1);
        assert!(!context.is_multi_vendor());

        context.record_vendor("cisco_cucm", 0.90);
        assert_eq!(context.lines_processed, 2);
        assert!(context.is_multi_vendor());
    }

    #[test]
    fn test_vendor_diversity() {
        let mut context = ProcessingContext::new();
        assert_eq!(context.vendor_diversity(), 0.0);

        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cube", 0.95);
        // 1 vendor / 3 lines = 0.33
        assert!((context.vendor_diversity() - 0.33).abs() < 0.01);

        context.record_vendor("cisco_cucm", 0.90);
        context.record_vendor("cisco_jabber", 0.85);
        // 3 vendors / 5 lines = 0.6
        assert!((context.vendor_diversity() - 0.6).abs() < 0.01);
    }

    #[test]
    fn test_dominant_vendor() {
        let mut context = ProcessingContext::new();
        assert_eq!(context.dominant_vendor(), None);

        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cucm", 0.90);

        assert_eq!(context.dominant_vendor(), Some("cisco_cube".to_string()));
    }

    #[test]
    fn test_process_cube_log() {
        let pipeline = NormalizationPipeline::new();
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";

        let result = pipeline.process(log);

        match result {
            ProcessingResult::FastPath { vendor, .. } => {
                assert_eq!(vendor.vendor_id, "cisco_cube");
            }
            ProcessingResult::Normalized { vendor, .. } => {
                assert_eq!(vendor.vendor_id, "cisco_cube");
            }
            ProcessingResult::Unknown { .. } => panic!("Expected vendor detection"),
        }
    }

    #[test]
    fn test_process_cucm_log() {
        let pipeline = NormalizationPipeline::new();
        let log = "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|";

        let result = pipeline.process(log);

        match result {
            ProcessingResult::FastPath { vendor, .. }
            | ProcessingResult::Normalized { vendor, .. } => {
                assert_eq!(vendor.vendor_id, "cisco_cucm");
            }
            ProcessingResult::Unknown { .. } => panic!("Expected vendor detection"),
        }
    }

    #[test]
    fn test_process_unknown_log() {
        let pipeline = NormalizationPipeline::new();
        let log = "This is not a recognizable log format";

        let result = pipeline.process(log);

        match result {
            ProcessingResult::Unknown { .. } => {}
            _ => panic!("Expected unknown result"),
        }
    }

    #[test]
    fn test_fast_only_mode() {
        let pipeline = NormalizationPipeline::with_mode(ProcessingMode::FastOnly);
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";

        let result = pipeline.process(log);

        // Should always use fast path
        match result {
            ProcessingResult::FastPath { .. } => {}
            _ => panic!("Expected fast path result"),
        }
    }

    #[test]
    fn test_normalize_always_mode() {
        let pipeline = NormalizationPipeline::with_mode(ProcessingMode::NormalizeAlways);
        let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";

        let result = pipeline.process(log);

        // Should always normalize
        match result {
            ProcessingResult::Normalized { .. } => {}
            _ => panic!("Expected normalized result"),
        }
    }

    #[test]
    fn test_batch_processing() {
        let pipeline = NormalizationPipeline::new();
        let logs = vec![
            "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE",
            "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|",
            "Unknown log format",
        ];

        let results = pipeline.process_batch(&logs);
        assert_eq!(results.len(), 3);

        // First two should be detected
        match &results[0] {
            ProcessingResult::Unknown { .. } => panic!("Should detect CUBE"),
            _ => {}
        }

        match &results[1] {
            ProcessingResult::Unknown { .. } => panic!("Should detect CUCM"),
            _ => {}
        }

        // Third should be unknown
        match &results[2] {
            ProcessingResult::Unknown { .. } => {}
            _ => panic!("Should be unknown"),
        }
    }

    #[test]
    fn test_pipeline_stats() {
        let pipeline = NormalizationPipeline::new();
        let stats = pipeline.stats();

        assert_eq!(stats.mode, ProcessingMode::Adaptive);
        assert!(stats.normalizers_count > 0);
        assert!(stats.multi_vendor_threshold > 0.0);
        assert!(stats.sample_size > 0);
    }

    #[test]
    fn test_normalization_hints() {
        let hints = NormalizationHints::new();
        assert!(hints.enable_learning);
        assert!(hints.multi_vendor_threshold > 0.0);
        assert!(hints.sample_size > 0);

        let single = NormalizationHints::single_vendor();
        let multi = NormalizationHints::multi_vendor();

        // Single vendor should have higher threshold
        assert!(single.multi_vendor_threshold > multi.multi_vendor_threshold);
    }
}
