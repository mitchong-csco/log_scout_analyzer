//! Learning System - Adaptive optimization for normalization pipeline
//!
//! This module provides intelligent learning capabilities that improve
//! normalization decisions over time based on observed patterns and performance.

use crate::processing_context::ProcessingContext;
use std::collections::HashMap;

/// Learning engine that adapts normalization decisions based on feedback
#[derive(Debug, Clone)]
pub struct LearningEngine {
    /// Pattern-specific learning data
    pattern_hints: HashMap<String, PatternHint>,
    /// Vendor-specific recommendations
    vendor_recommendations: HashMap<String, VendorRecommendation>,
    /// Track first observations for proper learning rate application
    first_observations: HashMap<String, bool>,
    /// Global performance thresholds
    performance_thresholds: PerformanceThresholds,
    /// Learning configuration
    config: LearningConfig,
    /// Number of learning cycles completed
    learning_cycles: usize,
}

/// Learning data for a specific pattern type
#[derive(Debug, Clone)]
pub struct PatternHint {
    /// Pattern identifier
    pub pattern_id: String,
    /// Number of times seen
    pub occurrences: usize,
    /// Number of vendors that use this pattern
    pub vendor_count: usize,
    /// Success rate when normalized (0.0-1.0)
    pub normalization_success_rate: f32,
    /// Average processing time when normalized (microseconds)
    pub avg_normalization_time_us: u64,
    /// Recommended action
    pub recommendation: NormalizationRecommendation,
    /// Confidence in this recommendation (0.0-1.0)
    pub confidence: f32,
}

/// Vendor-specific learning data
#[derive(Debug, Clone)]
pub struct VendorRecommendation {
    /// Vendor identifier
    pub vendor_id: String,
    /// Average confidence score for detections
    pub avg_detection_confidence: f32,
    /// Recommended confidence threshold for this vendor
    pub confidence_threshold: f32,
    /// Percentage of logs that needed normalization
    pub normalization_rate: f32,
    /// Average performance (microseconds)
    pub avg_processing_time_us: u64,
    /// Whether to prefer normalization for this vendor
    pub prefer_normalization: bool,
}

/// Performance thresholds learned from data
#[derive(Debug, Clone)]
pub struct PerformanceThresholds {
    /// Maximum acceptable processing time per line (microseconds)
    pub max_processing_time_us: u64,
    /// Threshold for "fast" processing (microseconds)
    pub fast_threshold_us: u64,
    /// Threshold for "slow" processing (microseconds)
    pub slow_threshold_us: u64,
    /// Confidence threshold for ambiguous detections
    pub ambiguous_confidence_threshold: f32,
}

/// Recommended action for a pattern
#[derive(Debug, Clone, PartialEq)]
pub enum NormalizationRecommendation {
    /// Always normalize this pattern
    AlwaysNormalize,
    /// Only normalize if multi-vendor scenario
    NormalizeOnMultiVendor,
    /// Never normalize (fast path sufficient)
    NeverNormalize,
    /// Insufficient data to make recommendation
    Insufficient,
}

/// Learning system configuration
#[derive(Debug, Clone)]
pub struct LearningConfig {
    /// Minimum samples before making recommendations
    pub min_samples: usize,
    /// Learning rate (0.0-1.0) - how quickly to adapt
    pub learning_rate: f32,
    /// Enable confidence tuning
    pub enable_confidence_tuning: bool,
    /// Enable pattern learning
    pub enable_pattern_learning: bool,
    /// Enable performance optimization
    pub enable_performance_optimization: bool,
}

impl LearningEngine {
    /// Create a new learning engine with default configuration
    pub fn new() -> Self {
        Self {
            pattern_hints: HashMap::new(),
            vendor_recommendations: HashMap::new(),
            first_observations: HashMap::new(),
            performance_thresholds: PerformanceThresholds::default(),
            config: LearningConfig::default(),
            learning_cycles: 0,
        }
    }

    /// Create a learning engine with custom configuration
    pub fn with_config(config: LearningConfig) -> Self {
        Self {
            pattern_hints: HashMap::new(),
            vendor_recommendations: HashMap::new(),
            first_observations: HashMap::new(),
            performance_thresholds: PerformanceThresholds::default(),
            config,
            learning_cycles: 0,
        }
    }

    /// Learn from a completed processing context
    pub fn learn_from_context(&mut self, context: &ProcessingContext) {
        if !self.has_sufficient_data(context) {
            return;
        }

        self.learning_cycles += 1;

        // Learn vendor-specific patterns
        if self.config.enable_pattern_learning {
            self.learn_vendor_patterns(context);
        }

        // Tune confidence thresholds
        if self.config.enable_confidence_tuning {
            self.tune_confidence_thresholds(context);
        }

        // Optimize performance thresholds
        if self.config.enable_performance_optimization {
            self.optimize_performance_thresholds(context);
        }
    }

    /// Check if we have enough data to learn
    fn has_sufficient_data(&self, context: &ProcessingContext) -> bool {
        context.lines_processed >= self.config.min_samples
    }

    /// Learn vendor-specific patterns from context
    fn learn_vendor_patterns(&mut self, context: &ProcessingContext) {
        for (vendor_id, stats) in &context.vendors_seen {
            let is_first = !self.first_observations.contains_key(vendor_id);

            let recommendation = self
                .vendor_recommendations
                .entry(vendor_id.clone())
                .or_insert_with(|| VendorRecommendation::new(vendor_id));

            // Update average detection confidence
            // For first observation, set directly; for subsequent, use learning rate
            if is_first {
                recommendation.avg_detection_confidence = stats.avg_confidence;
                self.first_observations.insert(vendor_id.clone(), true);
            } else {
                recommendation.update_confidence(stats.avg_confidence, self.config.learning_rate);
            }

            // Update normalization rate
            let norm_rate = if stats.occurrences > 0 {
                stats.normalized_count as f32 / stats.occurrences as f32
            } else {
                0.0
            };

            if is_first {
                recommendation.normalization_rate = norm_rate;
            } else {
                recommendation.update_normalization_rate(norm_rate, self.config.learning_rate);
            }

            // Decide if we should prefer normalization for this vendor
            // Prefer normalization if:
            // 1. Multi-vendor scenario AND this vendor actually uses normalization (> 20%)
            // 2. High normalization rate (> 50%) in single-vendor scenario
            if context.is_multi_vendor() {
                // In multi-vendor, prefer normalization if this vendor uses it at all
                recommendation.prefer_normalization = recommendation.normalization_rate > 0.2;
            } else {
                recommendation.prefer_normalization = recommendation.normalization_rate > 0.5;
            }
        }
    }

    /// Tune confidence thresholds based on detection accuracy
    fn tune_confidence_thresholds(&mut self, context: &ProcessingContext) {
        let overall_confidence: f32 = context
            .vendors_seen
            .values()
            .map(|s| s.avg_confidence)
            .sum::<f32>()
            / context.vendors_seen.len().max(1) as f32;

        // Adjust ambiguous threshold based on overall confidence
        let current_threshold = self.performance_thresholds.ambiguous_confidence_threshold;
        let adjustment = (overall_confidence - current_threshold) * self.config.learning_rate;

        self.performance_thresholds.ambiguous_confidence_threshold =
            (current_threshold + adjustment).clamp(0.5, 0.9);

        // Update vendor-specific thresholds
        for (vendor_id, stats) in &context.vendors_seen {
            if let Some(recommendation) = self.vendor_recommendations.get_mut(vendor_id) {
                // Lower threshold if detection is consistently high confidence
                if stats.avg_confidence > 0.9 {
                    recommendation.confidence_threshold *= 0.95; // Reduce by 5%
                }
                // Raise threshold if detection confidence is low
                else if stats.avg_confidence < 0.6 {
                    recommendation.confidence_threshold *= 1.05; // Increase by 5%
                }
                // Clamp to reasonable range
                recommendation.confidence_threshold =
                    recommendation.confidence_threshold.clamp(0.5, 0.95);
            }
        }
    }

    /// Optimize performance thresholds based on observed timings
    fn optimize_performance_thresholds(&mut self, context: &ProcessingContext) {
        let avg_time = context.avg_processing_time();
        let avg_time_us = avg_time.as_micros() as u64;

        // Adjust fast/slow thresholds based on actual performance
        let fast_threshold = self.performance_thresholds.fast_threshold_us;
        let slow_threshold = self.performance_thresholds.slow_threshold_us;

        // If we're consistently fast, lower the fast threshold
        if avg_time_us < fast_threshold {
            let adjustment = (fast_threshold - avg_time_us) as f32 * self.config.learning_rate;
            self.performance_thresholds.fast_threshold_us =
                (fast_threshold as f32 - adjustment) as u64;
        }

        // If we're consistently slow, raise the slow threshold
        if avg_time_us > slow_threshold {
            let adjustment = (avg_time_us - slow_threshold) as f32 * self.config.learning_rate;
            self.performance_thresholds.slow_threshold_us =
                (slow_threshold as f32 + adjustment) as u64;
        }

        // Update max processing time if error rate is low
        if context.error_rate() < 0.01 {
            // Allow slightly longer processing if we're accurate
            let adjustment = avg_time_us as f32 * self.config.learning_rate * 0.1;
            self.performance_thresholds.max_processing_time_us =
                ((self.performance_thresholds.max_processing_time_us as f32 + adjustment) as u64)
                    .min(50_000); // Cap at 50ms
        }
    }

    /// Get recommendation for a specific vendor
    pub fn get_vendor_recommendation(&self, vendor_id: &str) -> Option<&VendorRecommendation> {
        self.vendor_recommendations.get(vendor_id)
    }

    /// Get pattern hint for a specific pattern
    pub fn get_pattern_hint(&self, pattern_id: &str) -> Option<&PatternHint> {
        self.pattern_hints.get(pattern_id)
    }

    /// Suggest whether to normalize based on learned patterns
    pub fn suggest_normalization(&self, vendor_id: &str, confidence: f32) -> bool {
        // If we have a vendor recommendation, use it
        if let Some(rec) = self.vendor_recommendations.get(vendor_id) {
            // Normalize if vendor prefers it
            if rec.prefer_normalization {
                return true;
            }
            // Or if confidence is below vendor-specific threshold
            if confidence < rec.confidence_threshold {
                return true;
            }
        }

        // Default: normalize if confidence is below global ambiguous threshold
        confidence < self.performance_thresholds.ambiguous_confidence_threshold
    }

    /// Get current performance thresholds
    pub fn performance_thresholds(&self) -> &PerformanceThresholds {
        &self.performance_thresholds
    }

    /// Get number of learning cycles completed
    pub fn learning_cycles(&self) -> usize {
        self.learning_cycles
    }

    /// Check if learning is enabled
    pub fn is_learning_enabled(&self) -> bool {
        self.config.enable_confidence_tuning
            || self.config.enable_pattern_learning
            || self.config.enable_performance_optimization
    }

    /// Reset all learned data
    pub fn reset(&mut self) {
        self.pattern_hints.clear();
        self.vendor_recommendations.clear();
        self.first_observations.clear();
        self.performance_thresholds = PerformanceThresholds::default();
        self.learning_cycles = 0;
    }

    /// Generate a learning summary report
    pub fn summary(&self) -> LearningSummary {
        LearningSummary {
            learning_cycles: self.learning_cycles,
            vendors_learned: self.vendor_recommendations.len(),
            patterns_learned: self.pattern_hints.len(),
            ambiguous_confidence_threshold: self
                .performance_thresholds
                .ambiguous_confidence_threshold,
            fast_threshold_us: self.performance_thresholds.fast_threshold_us,
            slow_threshold_us: self.performance_thresholds.slow_threshold_us,
            learning_enabled: self.is_learning_enabled(),
        }
    }
}

impl Default for LearningEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl LearningConfig {
    /// Create default learning configuration
    pub fn new() -> Self {
        Self {
            min_samples: 100,
            learning_rate: 0.1,
            enable_confidence_tuning: true,
            enable_pattern_learning: true,
            enable_performance_optimization: true,
        }
    }

    /// Create configuration with aggressive learning
    pub fn aggressive() -> Self {
        Self {
            min_samples: 50,
            learning_rate: 0.3,
            enable_confidence_tuning: true,
            enable_pattern_learning: true,
            enable_performance_optimization: true,
        }
    }

    /// Create configuration with conservative learning
    pub fn conservative() -> Self {
        Self {
            min_samples: 500,
            learning_rate: 0.05,
            enable_confidence_tuning: true,
            enable_pattern_learning: true,
            enable_performance_optimization: false,
        }
    }

    /// Disable all learning
    pub fn disabled() -> Self {
        Self {
            min_samples: 1000,
            learning_rate: 0.0,
            enable_confidence_tuning: false,
            enable_pattern_learning: false,
            enable_performance_optimization: false,
        }
    }
}

impl Default for LearningConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl PerformanceThresholds {
    /// Create default performance thresholds
    pub fn new() -> Self {
        Self {
            max_processing_time_us: 10_000,      // 10ms max
            fast_threshold_us: 1_000,            // 1ms is fast
            slow_threshold_us: 5_000,            // 5ms is slow
            ambiguous_confidence_threshold: 0.7, // Below 0.7 is ambiguous
        }
    }
}

impl Default for PerformanceThresholds {
    fn default() -> Self {
        Self::new()
    }
}

impl VendorRecommendation {
    /// Create a new vendor recommendation
    pub fn new(vendor_id: &str) -> Self {
        Self {
            vendor_id: vendor_id.to_string(),
            avg_detection_confidence: 0.8,
            confidence_threshold: 0.7,
            normalization_rate: 0.0,
            avg_processing_time_us: 0,
            prefer_normalization: false,
        }
    }

    /// Update average confidence with learning rate
    pub fn update_confidence(&mut self, new_confidence: f32, learning_rate: f32) {
        self.avg_detection_confidence =
            self.avg_detection_confidence * (1.0 - learning_rate) + new_confidence * learning_rate;
    }

    /// Update normalization rate with learning rate
    pub fn update_normalization_rate(&mut self, new_rate: f32, learning_rate: f32) {
        self.normalization_rate =
            self.normalization_rate * (1.0 - learning_rate) + new_rate * learning_rate;
    }
}

/// Summary of learning system state
#[derive(Debug, Clone)]
pub struct LearningSummary {
    pub learning_cycles: usize,
    pub vendors_learned: usize,
    pub patterns_learned: usize,
    pub ambiguous_confidence_threshold: f32,
    pub fast_threshold_us: u64,
    pub slow_threshold_us: u64,
    pub learning_enabled: bool,
}

impl LearningSummary {
    /// Format as a human-readable string
    pub fn to_string(&self) -> String {
        format!(
            "Learning Summary:\n\
             - Learning Cycles: {}\n\
             - Vendors Learned: {}\n\
             - Patterns Learned: {}\n\
             - Confidence Threshold: {:.2}\n\
             - Fast Threshold: {}μs\n\
             - Slow Threshold: {}μs\n\
             - Learning Enabled: {}",
            self.learning_cycles,
            self.vendors_learned,
            self.patterns_learned,
            self.ambiguous_confidence_threshold,
            self.fast_threshold_us,
            self.slow_threshold_us,
            self.learning_enabled
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_learning_engine_creation() {
        let engine = LearningEngine::new();
        assert_eq!(engine.learning_cycles(), 0);
        assert!(engine.is_learning_enabled());
    }

    #[test]
    fn test_learning_with_custom_config() {
        let config = LearningConfig::aggressive();
        let engine = LearningEngine::with_config(config);
        assert!(engine.is_learning_enabled());
    }

    #[test]
    fn test_learning_disabled() {
        let config = LearningConfig::disabled();
        let engine = LearningEngine::with_config(config);
        assert!(!engine.is_learning_enabled());
    }

    #[test]
    fn test_insufficient_data_no_learning() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Only process 50 lines (below min_samples of 100)
        for _i in 0..50 {
            context.record_vendor("cisco_cube", 0.95);
        }

        engine.learn_from_context(&context);

        // No learning should occur
        assert_eq!(engine.learning_cycles(), 0);
    }

    #[test]
    fn test_sufficient_data_triggers_learning() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Process 150 lines (above min_samples of 100)
        for _i in 0..150 {
            context.record_vendor("cisco_cube", 0.95);
        }

        engine.learn_from_context(&context);

        // Learning should occur
        assert_eq!(engine.learning_cycles(), 1);
    }

    #[test]
    fn test_vendor_pattern_learning() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate processing with high normalization rate
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_normalization("cisco_cube");
        }

        engine.learn_from_context(&context);

        // Should have learned about cisco_cube
        let recommendation = engine.get_vendor_recommendation("cisco_cube");
        assert!(recommendation.is_some());

        let rec = recommendation.unwrap();
        assert_eq!(rec.vendor_id, "cisco_cube");
        assert!(rec.prefer_normalization); // 100% normalization rate
    }

    #[test]
    fn test_vendor_recommendation_prefers_fast_path() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate processing with low normalization rate (mostly fast path)
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_fast_path("cisco_cube");
        }

        engine.learn_from_context(&context);

        let recommendation = engine.get_vendor_recommendation("cisco_cube");
        assert!(recommendation.is_some());

        let rec = recommendation.unwrap();
        assert!(!rec.prefer_normalization); // 0% normalization rate
    }

    #[test]
    fn test_confidence_tuning_high_confidence() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate high-confidence detections
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        let initial_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        engine.learn_from_context(&context);

        // Threshold should adjust based on high confidence
        let new_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;
        assert!(new_threshold >= initial_threshold);
    }

    #[test]
    fn test_confidence_tuning_low_confidence() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate low-confidence detections
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.55);
        }

        let initial_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        engine.learn_from_context(&context);

        // Threshold should adjust based on low confidence
        let new_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;
        assert!(new_threshold <= initial_threshold);
    }

    #[test]
    fn test_vendor_specific_confidence_threshold_adjustment() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate very high confidence detections
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.98);
        }

        engine.learn_from_context(&context);

        let rec = engine.get_vendor_recommendation("cisco_cube").unwrap();

        // Confidence threshold should be lowered for consistently high confidence
        assert!(rec.confidence_threshold < 0.7);
    }

    #[test]
    fn test_performance_optimization_fast_processing() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        context.start();

        // Simulate fast processing
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            std::thread::sleep(std::time::Duration::from_micros(100));
        }

        context.stop();

        let initial_fast_threshold = engine.performance_thresholds().fast_threshold_us;

        engine.learn_from_context(&context);

        // Fast threshold might be adjusted based on actual performance
        let new_fast_threshold = engine.performance_thresholds().fast_threshold_us;
        // Threshold should be adjusted (could be lower if we're consistently faster)
        assert!(new_fast_threshold <= initial_fast_threshold);
    }

    #[test]
    fn test_normalization_suggestion_with_recommendation() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Train the engine with a vendor that prefers normalization
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_normalization("cisco_cube");
        }

        engine.learn_from_context(&context);

        // Should suggest normalization for cisco_cube
        assert!(engine.suggest_normalization("cisco_cube", 0.8));
    }

    #[test]
    fn test_normalization_suggestion_without_recommendation() {
        let engine = LearningEngine::new();

        // No learning data, should fall back to confidence threshold
        assert!(engine.suggest_normalization("cisco_cube", 0.6)); // Below 0.7
        assert!(!engine.suggest_normalization("cisco_cube", 0.8)); // Above 0.7
    }

    #[test]
    fn test_learning_rate_affects_convergence() {
        let config_slow = LearningConfig {
            min_samples: 100,
            learning_rate: 0.01,
            enable_confidence_tuning: true,
            enable_pattern_learning: true,
            enable_performance_optimization: false,
        };

        let config_fast = LearningConfig {
            min_samples: 100,
            learning_rate: 0.5,
            enable_confidence_tuning: true,
            enable_pattern_learning: true,
            enable_performance_optimization: false,
        };

        let mut engine_slow = LearningEngine::with_config(config_slow);
        let mut engine_fast = LearningEngine::with_config(config_fast);

        let mut context = ProcessingContext::new();
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.9);
        }

        let initial = engine_slow
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        engine_slow.learn_from_context(&context);
        engine_fast.learn_from_context(&context);

        let slow_change = (engine_slow
            .performance_thresholds()
            .ambiguous_confidence_threshold
            - initial)
            .abs();
        let fast_change = (engine_fast
            .performance_thresholds()
            .ambiguous_confidence_threshold
            - initial)
            .abs();

        // Fast learning rate should produce larger changes
        assert!(fast_change > slow_change);
    }

    #[test]
    fn test_multi_vendor_scenario_learning() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Simulate multi-vendor scenario
        for _i in 0..50 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_normalization("cisco_cube");
        }
        for _i in 0..50 {
            context.record_vendor("cisco_cucm", 0.90);
            context.record_normalization("cisco_cucm");
        }

        engine.learn_from_context(&context);

        // Both vendors should prefer normalization in multi-vendor scenario
        let cube_rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        let cucm_rec = engine.get_vendor_recommendation("cisco_cucm").unwrap();

        assert!(cube_rec.prefer_normalization);
        assert!(cucm_rec.prefer_normalization);
    }

    #[test]
    fn test_learning_cycles_increment() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        assert_eq!(engine.learning_cycles(), 0);

        engine.learn_from_context(&context);
        assert_eq!(engine.learning_cycles(), 1);

        engine.learn_from_context(&context);
        assert_eq!(engine.learning_cycles(), 2);
    }

    #[test]
    fn test_reset_clears_learned_data() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        engine.learn_from_context(&context);

        assert_eq!(engine.learning_cycles(), 1);
        assert!(engine.get_vendor_recommendation("cisco_cube").is_some());

        engine.reset();

        assert_eq!(engine.learning_cycles(), 0);
        assert!(engine.get_vendor_recommendation("cisco_cube").is_none());
    }

    #[test]
    fn test_learning_summary() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        engine.learn_from_context(&context);

        let summary = engine.summary();
        assert_eq!(summary.learning_cycles, 1);
        assert_eq!(summary.vendors_learned, 1);
        assert!(summary.learning_enabled);
    }

    #[test]
    fn test_vendor_recommendation_confidence_update() {
        let mut rec = VendorRecommendation::new("cisco_cube");

        assert_eq!(rec.avg_detection_confidence, 0.8);

        rec.update_confidence(0.95, 0.5); // 50% learning rate

        // Should be: 0.8 * 0.5 + 0.95 * 0.5 = 0.875
        assert!((rec.avg_detection_confidence - 0.875).abs() < 0.001);
    }

    #[test]
    fn test_vendor_recommendation_normalization_rate_update() {
        let mut rec = VendorRecommendation::new("cisco_cube");

        assert_eq!(rec.normalization_rate, 0.0);

        rec.update_normalization_rate(1.0, 0.5); // 50% learning rate

        // Should be: 0.0 * 0.5 + 1.0 * 0.5 = 0.5
        assert!((rec.normalization_rate - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_performance_thresholds_default_values() {
        let thresholds = PerformanceThresholds::new();

        assert_eq!(thresholds.max_processing_time_us, 10_000);
        assert_eq!(thresholds.fast_threshold_us, 1_000);
        assert_eq!(thresholds.slow_threshold_us, 5_000);
        assert_eq!(thresholds.ambiguous_confidence_threshold, 0.7);
    }

    #[test]
    fn test_learning_config_aggressive() {
        let config = LearningConfig::aggressive();

        assert_eq!(config.min_samples, 50);
        assert_eq!(config.learning_rate, 0.3);
        assert!(config.enable_confidence_tuning);
        assert!(config.enable_pattern_learning);
        assert!(config.enable_performance_optimization);
    }

    #[test]
    fn test_learning_config_conservative() {
        let config = LearningConfig::conservative();

        assert_eq!(config.min_samples, 500);
        assert_eq!(config.learning_rate, 0.05);
        assert!(config.enable_confidence_tuning);
        assert!(config.enable_pattern_learning);
        assert!(!config.enable_performance_optimization);
    }

    #[test]
    fn test_pattern_hint_learning() {
        let engine = LearningEngine::new();

        // Pattern hints should be empty initially
        assert!(engine.get_pattern_hint("sip_invite").is_none());

        // After learning, we should have pattern-specific data
        // This will be implemented when we add pattern tracking
    }

    #[test]
    fn test_feedback_loop_improves_recommendations() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // First learning cycle - vendor with moderate confidence
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.85);
        }

        engine.learn_from_context(&context);
        let first_rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        let first_threshold = first_rec.confidence_threshold;

        // Second learning cycle - same vendor, higher confidence
        context.reset();
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        engine.learn_from_context(&context);
        let second_rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        let second_threshold = second_rec.confidence_threshold;

        // Threshold should be adjusted based on feedback
        assert_ne!(first_threshold, second_threshold);
    }

    #[test]
    fn test_adaptive_learning_over_multiple_cycles() {
        let mut engine = LearningEngine::new();

        // Simulate 5 learning cycles with improving performance
        let mut previous_confidence = 0.0;
        for cycle in 1..=5 {
            let mut context = ProcessingContext::new();

            for _i in 0..100 {
                let confidence = 0.7 + (cycle as f32 * 0.05); // Improving confidence
                context.record_vendor("cisco_cube", confidence);
            }

            engine.learn_from_context(&context);

            // After each cycle, confidence should be increasing (or at least not decreasing)
            let rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
            if cycle > 1 {
                assert!(rec.avg_detection_confidence >= previous_confidence);
            }
            previous_confidence = rec.avg_detection_confidence;
        }

        // After 5 cycles, should have learned significantly
        assert_eq!(engine.learning_cycles(), 5);

        let rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        // Confidence should reflect learning - should be > initial (0.75) and improving
        assert!(rec.avg_detection_confidence > 0.75);
        // Should be moving toward the later values (0.90-0.95 range)
        assert!(rec.avg_detection_confidence > previous_confidence * 0.95);
    }

    #[test]
    fn test_learning_converges_to_stable_state() {
        let mut engine = LearningEngine::new();

        // Run many learning cycles with consistent data
        let mut previous_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;
        let mut convergence_count = 0;

        for _cycle in 0..20 {
            let mut context = ProcessingContext::new();

            for _i in 0..100 {
                context.record_vendor("cisco_cube", 0.9);
            }

            engine.learn_from_context(&context);

            let new_threshold = engine
                .performance_thresholds()
                .ambiguous_confidence_threshold;

            // Check if changes are getting smaller (converging)
            if (new_threshold - previous_threshold).abs() < 0.01 {
                convergence_count += 1;
            }

            previous_threshold = new_threshold;
        }

        // Should converge after several cycles
        assert!(convergence_count > 10);
    }

    #[test]
    fn test_performance_optimization_respects_error_rate() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        context.start();

        // Simulate processing with errors
        for i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            if i % 10 == 0 {
                context.record_error("Parse error".to_string(), Some("cisco_cube".to_string()));
            }
        }

        context.stop();

        let initial_max_time = engine.performance_thresholds().max_processing_time_us;

        engine.learn_from_context(&context);

        let new_max_time = engine.performance_thresholds().max_processing_time_us;

        // With high error rate (10%), max time should not increase
        assert_eq!(initial_max_time, new_max_time);
    }

    #[test]
    fn test_performance_optimization_allows_longer_time_when_accurate() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        context.start();

        // Simulate accurate processing (no errors)
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        context.stop();

        let initial_max_time = engine.performance_thresholds().max_processing_time_us;

        engine.learn_from_context(&context);

        let new_max_time = engine.performance_thresholds().max_processing_time_us;

        // With low error rate, max time might increase slightly
        assert!(new_max_time >= initial_max_time);
    }

    #[test]
    fn test_learning_with_mixed_vendor_performance() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Vendor A: high confidence, prefers normalization
        for _i in 0..60 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_normalization("cisco_cube");
        }

        // Vendor B: moderate confidence, prefers fast path
        for _i in 0..40 {
            context.record_vendor("cisco_cucm", 0.75);
            context.record_fast_path("cisco_cucm");
        }

        engine.learn_from_context(&context);

        let cube_rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        let cucm_rec = engine.get_vendor_recommendation("cisco_cucm").unwrap();

        // Cube should prefer normalization
        assert!(cube_rec.prefer_normalization);

        // CUCM should not prefer normalization (mostly fast path)
        assert!(!cucm_rec.prefer_normalization);
    }

    #[test]
    fn test_confidence_threshold_clamping() {
        let mut engine = LearningEngine::new();

        // Run many cycles with extreme confidence values
        for _cycle in 0..50 {
            let mut context = ProcessingContext::new();

            for _i in 0..100 {
                context.record_vendor("cisco_cube", 0.99); // Very high confidence
            }

            engine.learn_from_context(&context);
        }

        let rec = engine.get_vendor_recommendation("cisco_cube").unwrap();

        // Threshold should be clamped to reasonable range (not go to 0)
        assert!(rec.confidence_threshold >= 0.5);
        assert!(rec.confidence_threshold <= 0.95);
    }

    #[test]
    fn test_ambiguous_confidence_threshold_clamping() {
        let mut engine = LearningEngine::new();

        // Run many cycles with low confidence
        for _cycle in 0..50 {
            let mut context = ProcessingContext::new();

            for _i in 0..100 {
                context.record_vendor("cisco_cube", 0.4); // Very low confidence
            }

            engine.learn_from_context(&context);
        }

        let threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        // Should be clamped between 0.5 and 0.9
        assert!(threshold >= 0.5);
        assert!(threshold <= 0.9);
    }

    #[test]
    fn test_learning_summary_format() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
            context.record_vendor("cisco_cucm", 0.90);
        }

        engine.learn_from_context(&context);

        let summary = engine.summary();
        let summary_string = summary.to_string();

        // Should contain key information
        assert!(summary_string.contains("Learning Cycles: 1"));
        assert!(summary_string.contains("Vendors Learned: 2"));
        assert!(summary_string.contains("Learning Enabled: true"));
    }

    #[test]
    fn test_suggest_normalization_with_low_confidence_unknown_vendor() {
        let engine = LearningEngine::new();

        // Unknown vendor with low confidence should normalize
        assert!(engine.suggest_normalization("unknown_vendor", 0.5));
    }

    #[test]
    fn test_suggest_normalization_with_high_confidence_unknown_vendor() {
        let engine = LearningEngine::new();

        // Unknown vendor with high confidence should not normalize
        assert!(!engine.suggest_normalization("unknown_vendor", 0.85));
    }

    #[test]
    fn test_vendor_specific_threshold_overrides_global() {
        let mut engine = LearningEngine::new();
        let mut context = ProcessingContext::new();

        // Train with vendor that has very high confidence
        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.98);
        }

        engine.learn_from_context(&context);

        // Vendor-specific threshold should be lower than global
        let rec = engine.get_vendor_recommendation("cisco_cube").unwrap();
        let global_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        assert!(rec.confidence_threshold < global_threshold);

        // Should not suggest normalization even at moderate confidence
        // because vendor-specific threshold is low
        assert!(!engine.suggest_normalization("cisco_cube", 0.8));
    }

    #[test]
    fn test_learning_disabled_config() {
        let config = LearningConfig::disabled();
        let mut engine = LearningEngine::with_config(config);
        let mut context = ProcessingContext::new();

        for _i in 0..100 {
            context.record_vendor("cisco_cube", 0.95);
        }

        let initial_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        engine.learn_from_context(&context);

        let new_threshold = engine
            .performance_thresholds()
            .ambiguous_confidence_threshold;

        // With learning disabled, thresholds should not change
        // (but learning cycles still increment if min_samples met)
        assert_eq!(initial_threshold, new_threshold);
    }

    #[test]
    fn test_performance_thresholds_cap_at_maximum() {
        let mut engine = LearningEngine::new();

        // Run cycles to try to push max_processing_time beyond cap
        for _cycle in 0..100 {
            let mut context = ProcessingContext::new();
            context.start();

            for _i in 0..100 {
                context.record_vendor("cisco_cube", 0.95);
                // Simulate slow processing
                std::thread::sleep(std::time::Duration::from_micros(100));
            }

            context.stop();
            engine.learn_from_context(&context);
        }

        // Max processing time should be capped at 50ms (50,000 microseconds)
        assert!(engine.performance_thresholds().max_processing_time_us <= 50_000);
    }
}
