//! Processing Context - State tracking for the normalization pipeline
//!
//! This module provides context tracking for the progressive normalization pipeline,
//! including vendor statistics, performance metrics, and decision-making data.

use std::collections::HashMap;
use std::time::{Duration, Instant};

/// Context for processing decisions and metrics
#[derive(Debug, Clone)]
pub struct ProcessingContext {
    /// Vendors detected in the current session/file
    pub vendors_seen: HashMap<String, VendorStats>,
    /// Total lines processed
    pub lines_processed: usize,
    /// Lines normalized
    pub lines_normalized: usize,
    /// Lines processed via fast path
    pub lines_fast_path: usize,
    /// Explicitly request normalization
    pub force_normalize: bool,
    /// Start time of processing session
    start_time: Option<Instant>,
    /// Total processing time
    total_processing_time: Duration,
    /// Errors encountered
    pub errors: Vec<ProcessingError>,
}

/// Statistics for a specific vendor
#[derive(Debug, Clone)]
pub struct VendorStats {
    /// Number of times this vendor was detected
    pub occurrences: usize,
    /// Average confidence score
    pub avg_confidence: f32,
    /// Total confidence (for calculating average)
    confidence_sum: f32,
    /// Lines successfully normalized
    pub normalized_count: usize,
    /// Lines processed via fast path
    pub fast_path_count: usize,
}

impl VendorStats {
    /// Create new vendor stats
    pub fn new() -> Self {
        Self {
            occurrences: 0,
            avg_confidence: 0.0,
            confidence_sum: 0.0,
            normalized_count: 0,
            fast_path_count: 0,
        }
    }

    /// Record a detection
    pub fn record_detection(&mut self, confidence: f32) {
        self.occurrences += 1;
        self.confidence_sum += confidence;
        self.avg_confidence = self.confidence_sum / self.occurrences as f32;
    }

    /// Record normalization
    pub fn record_normalization(&mut self) {
        self.normalized_count += 1;
    }

    /// Record fast path usage
    pub fn record_fast_path(&mut self) {
        self.fast_path_count += 1;
    }
}

impl Default for VendorStats {
    fn default() -> Self {
        Self::new()
    }
}

/// Error encountered during processing
#[derive(Debug, Clone)]
pub struct ProcessingError {
    /// Line number where error occurred
    pub line_number: usize,
    /// Error message
    pub message: String,
    /// Vendor ID (if detected)
    pub vendor_id: Option<String>,
}

impl ProcessingContext {
    /// Create a new processing context
    pub fn new() -> Self {
        Self {
            vendors_seen: HashMap::new(),
            lines_processed: 0,
            lines_normalized: 0,
            lines_fast_path: 0,
            force_normalize: false,
            start_time: None,
            total_processing_time: Duration::default(),
            errors: Vec::new(),
        }
    }

    /// Start the processing timer
    pub fn start(&mut self) {
        self.start_time = Some(Instant::now());
    }

    /// Stop the processing timer
    pub fn stop(&mut self) {
        if let Some(start) = self.start_time {
            self.total_processing_time = start.elapsed();
            self.start_time = None;
        }
    }

    /// Record a vendor detection
    pub fn record_vendor(&mut self, vendor_id: &str, confidence: f32) {
        let stats = self
            .vendors_seen
            .entry(vendor_id.to_string())
            .or_insert_with(VendorStats::new);
        stats.record_detection(confidence);
        self.lines_processed += 1;
    }

    /// Record a normalization
    pub fn record_normalization(&mut self, vendor_id: &str) {
        if let Some(stats) = self.vendors_seen.get_mut(vendor_id) {
            stats.record_normalization();
        }
        self.lines_normalized += 1;
    }

    /// Record fast path usage
    pub fn record_fast_path(&mut self, vendor_id: &str) {
        if let Some(stats) = self.vendors_seen.get_mut(vendor_id) {
            stats.record_fast_path();
        }
        self.lines_fast_path += 1;
    }

    /// Record an error
    pub fn record_error(&mut self, message: String, vendor_id: Option<String>) {
        self.errors.push(ProcessingError {
            line_number: self.lines_processed,
            message,
            vendor_id,
        });
    }

    /// Check if multiple vendors have been seen
    pub fn is_multi_vendor(&self) -> bool {
        self.vendors_seen.len() > 1
    }

    /// Get the dominant vendor (most frequently seen)
    pub fn dominant_vendor(&self) -> Option<String> {
        self.vendors_seen
            .iter()
            .max_by_key(|(_, stats)| stats.occurrences)
            .map(|(vendor, _)| vendor.clone())
    }

    /// Get vendor diversity ratio (0.0 = single vendor, 1.0 = all different)
    pub fn vendor_diversity(&self) -> f32 {
        if self.lines_processed == 0 {
            return 0.0;
        }
        let unique_vendors = self.vendors_seen.len() as f32;
        let total_lines = self.lines_processed as f32;
        (unique_vendors / total_lines).min(1.0)
    }

    /// Get normalization ratio (0.0 = all fast path, 1.0 = all normalized)
    pub fn normalization_ratio(&self) -> f32 {
        if self.lines_processed == 0 {
            return 0.0;
        }
        self.lines_normalized as f32 / self.lines_processed as f32
    }

    /// Get fast path ratio
    pub fn fast_path_ratio(&self) -> f32 {
        if self.lines_processed == 0 {
            return 0.0;
        }
        self.lines_fast_path as f32 / self.lines_processed as f32
    }

    /// Get average processing time per line
    pub fn avg_processing_time(&self) -> Duration {
        if self.lines_processed == 0 {
            return Duration::default();
        }
        self.total_processing_time / self.lines_processed as u32
    }

    /// Get total processing time
    pub fn total_time(&self) -> Duration {
        self.total_processing_time
    }

    /// Get error rate (0.0 = no errors, 1.0 = all errors)
    pub fn error_rate(&self) -> f32 {
        if self.lines_processed == 0 {
            return 0.0;
        }
        self.errors.len() as f32 / self.lines_processed as f32
    }

    /// Get statistics for a specific vendor
    pub fn vendor_stats(&self, vendor_id: &str) -> Option<&VendorStats> {
        self.vendors_seen.get(vendor_id)
    }

    /// Get all vendor IDs
    pub fn vendor_ids(&self) -> Vec<String> {
        self.vendors_seen.keys().cloned().collect()
    }

    /// Generate a summary report
    pub fn summary(&self) -> ProcessingSummary {
        ProcessingSummary {
            total_lines: self.lines_processed,
            normalized_lines: self.lines_normalized,
            fast_path_lines: self.lines_fast_path,
            unique_vendors: self.vendors_seen.len(),
            dominant_vendor: self.dominant_vendor(),
            vendor_diversity: self.vendor_diversity(),
            normalization_ratio: self.normalization_ratio(),
            fast_path_ratio: self.fast_path_ratio(),
            total_time: self.total_processing_time,
            avg_time_per_line: self.avg_processing_time(),
            error_count: self.errors.len(),
            error_rate: self.error_rate(),
        }
    }

    /// Reset the context
    pub fn reset(&mut self) {
        self.vendors_seen.clear();
        self.lines_processed = 0;
        self.lines_normalized = 0;
        self.lines_fast_path = 0;
        self.force_normalize = false;
        self.start_time = None;
        self.total_processing_time = Duration::default();
        self.errors.clear();
    }
}

impl Default for ProcessingContext {
    fn default() -> Self {
        Self::new()
    }
}

/// Summary of processing statistics
#[derive(Debug, Clone)]
pub struct ProcessingSummary {
    pub total_lines: usize,
    pub normalized_lines: usize,
    pub fast_path_lines: usize,
    pub unique_vendors: usize,
    pub dominant_vendor: Option<String>,
    pub vendor_diversity: f32,
    pub normalization_ratio: f32,
    pub fast_path_ratio: f32,
    pub total_time: Duration,
    pub avg_time_per_line: Duration,
    pub error_count: usize,
    pub error_rate: f32,
}

impl ProcessingSummary {
    /// Format as a human-readable string
    pub fn to_string(&self) -> String {
        format!(
            "Processing Summary:\n\
             - Total Lines: {}\n\
             - Normalized: {} ({:.1}%)\n\
             - Fast Path: {} ({:.1}%)\n\
             - Unique Vendors: {}\n\
             - Dominant Vendor: {}\n\
             - Vendor Diversity: {:.2}\n\
             - Total Time: {:?}\n\
             - Avg Time/Line: {:?}\n\
             - Errors: {} ({:.2}%)",
            self.total_lines,
            self.normalized_lines,
            self.normalization_ratio * 100.0,
            self.fast_path_lines,
            self.fast_path_ratio * 100.0,
            self.unique_vendors,
            self.dominant_vendor.as_deref().unwrap_or("None"),
            self.vendor_diversity,
            self.total_time,
            self.avg_time_per_line,
            self.error_count,
            self.error_rate * 100.0
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_context_creation() {
        let context = ProcessingContext::new();
        assert_eq!(context.lines_processed, 0);
        assert!(!context.is_multi_vendor());
    }

    #[test]
    fn test_vendor_recording() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);

        assert_eq!(context.lines_processed, 1);
        assert_eq!(context.vendors_seen.len(), 1);

        let stats = context.vendor_stats("cisco_cube").unwrap();
        assert_eq!(stats.occurrences, 1);
        assert_eq!(stats.avg_confidence, 0.95);
    }

    #[test]
    fn test_multi_vendor_detection() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        assert!(!context.is_multi_vendor());

        context.record_vendor("cisco_cucm", 0.90);
        assert!(context.is_multi_vendor());
    }

    #[test]
    fn test_vendor_diversity() {
        let mut context = ProcessingContext::new();
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
        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cucm", 0.90);

        assert_eq!(context.dominant_vendor(), Some("cisco_cube".to_string()));
    }

    #[test]
    fn test_normalization_tracking() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        context.record_normalization("cisco_cube");

        assert_eq!(context.lines_normalized, 1);
        assert_eq!(context.normalization_ratio(), 1.0);

        let stats = context.vendor_stats("cisco_cube").unwrap();
        assert_eq!(stats.normalized_count, 1);
    }

    #[test]
    fn test_fast_path_tracking() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        context.record_fast_path("cisco_cube");

        assert_eq!(context.lines_fast_path, 1);
        assert_eq!(context.fast_path_ratio(), 1.0);

        let stats = context.vendor_stats("cisco_cube").unwrap();
        assert_eq!(stats.fast_path_count, 1);
    }

    #[test]
    fn test_error_tracking() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        context.record_error("Parse error".to_string(), Some("cisco_cube".to_string()));

        assert_eq!(context.errors.len(), 1);
        assert_eq!(context.error_rate(), 1.0);
    }

    #[test]
    fn test_summary() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        context.record_vendor("cisco_cucm", 0.90);
        context.record_normalization("cisco_cube");
        context.record_fast_path("cisco_cucm");

        let summary = context.summary();
        assert_eq!(summary.total_lines, 2);
        assert_eq!(summary.normalized_lines, 1);
        assert_eq!(summary.fast_path_lines, 1);
        assert_eq!(summary.unique_vendors, 2);
        assert!(summary.dominant_vendor.is_some());
    }

    #[test]
    fn test_vendor_stats() {
        let mut stats = VendorStats::new();
        stats.record_detection(0.9);
        stats.record_detection(1.0);

        assert_eq!(stats.occurrences, 2);
        assert_eq!(stats.avg_confidence, 0.95);
    }

    #[test]
    fn test_reset() {
        let mut context = ProcessingContext::new();
        context.record_vendor("cisco_cube", 0.95);
        context.record_normalization("cisco_cube");

        context.reset();

        assert_eq!(context.lines_processed, 0);
        assert_eq!(context.lines_normalized, 0);
        assert_eq!(context.vendors_seen.len(), 0);
    }
}
