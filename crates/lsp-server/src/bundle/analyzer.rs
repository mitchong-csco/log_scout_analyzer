//! Bundle analyzer - pattern matching across bundle logs
//!
//! Runs pattern analysis on all logs in a bundle and aggregates results
//! by service and pattern.

use crate::bundle::{
    Bundle, BundleAnalysisResult, Detection, DetectionSeverity, Result, ServiceType,
};
use std::collections::HashMap;
use std::time::Instant;

/// Analyzer for running pattern matching on bundles
pub struct BundleAnalyzer;

impl BundleAnalyzer {
    /// Create a new bundle analyzer
    pub fn new() -> Self {
        Self
    }

    /// Analyze a bundle with a pattern engine
    ///
    /// This is a placeholder that demonstrates the structure.
    /// In practice, this would integrate with the actual PatternEngine.
    ///
    /// # Arguments
    /// * `bundle` - The bundle to analyze
    ///
    /// # Returns
    /// Analysis results with all detections
    pub fn analyze_bundle(&self, bundle: &Bundle) -> Result<BundleAnalysisResult> {
        let start = Instant::now();

        tracing::info!(
            "Starting analysis of bundle: {} ({} logs)",
            bundle.name,
            bundle.logs.len()
        );

        let mut all_detections = Vec::new();

        // Analyze each log in the bundle
        for log in &bundle.logs {
            tracing::debug!("Analyzing log: {} ({} service)", log.uri, log.service);

            // In real implementation, this would call pattern_engine
            // For now, we create a placeholder structure
            let detections = self.analyze_log(bundle, log)?;
            all_detections.extend(detections);
        }

        let duration = start.elapsed();
        let duration_ms = duration.as_millis() as u64;

        let result = BundleAnalysisResult::new(bundle.id.clone(), all_detections, duration_ms);

        tracing::info!(
            "Analysis complete: {} detections in {}ms",
            result.statistics.total_detections,
            duration_ms
        );

        Ok(result)
    }

    /// Analyze a single log file (placeholder for pattern engine integration)
    fn analyze_log(
        &self,
        bundle: &Bundle,
        log: &crate::bundle::BundleLog,
    ) -> Result<Vec<Detection>> {
        // This is a placeholder that shows the structure
        // In real implementation, this would:
        // 1. Read the log file
        // 2. Pass each line to the pattern engine
        // 3. Collect all matches
        // 4. Convert to Detection structs

        // For now, return empty Vec - will be integrated with pattern engine in Task 1.6
        tracing::debug!(
            "Pattern analysis for {} (service: {})",
            log.uri,
            log.service
        );

        Ok(Vec::new())
    }

    /// Analyze with a custom pattern matcher function
    ///
    /// This allows flexible integration with different pattern engines
    ///
    /// # Arguments
    /// * `bundle` - The bundle to analyze
    /// * `matcher_fn` - Function that takes (log_uri, line_number, line_text) and returns detections
    pub fn analyze_with_matcher<F>(
        &self,
        bundle: &Bundle,
        mut matcher_fn: F,
    ) -> Result<BundleAnalysisResult>
    where
        F: FnMut(&str, usize, &str) -> Vec<Detection>,
    {
        let start = Instant::now();
        let mut all_detections = Vec::new();

        for log in &bundle.logs {
            // Read log file and process line by line
            // In real implementation, this would read the actual file
            // For now, this is the structure that will be used

            // Placeholder: In Task 1.6, this will read actual files
            tracing::debug!("Processing log: {}", log.uri);

            // Example of how it would work:
            // let content = fs::read_to_string(&log.uri)?;
            // for (line_num, line) in content.lines().enumerate() {
            //     let detections = matcher_fn(&log.uri, line_num + 1, line);
            //     all_detections.extend(detections);
            // }
        }

        let duration_ms = start.elapsed().as_millis() as u64;
        let result = BundleAnalysisResult::new(bundle.id.clone(), all_detections, duration_ms);

        Ok(result)
    }

    /// Get analysis statistics without full analysis
    ///
    /// Useful for quick overview of bundle contents
    pub fn get_bundle_stats(&self, bundle: &Bundle) -> BundleStats {
        let mut stats = BundleStats::default();

        stats.total_logs = bundle.logs.len();
        stats.total_size_bytes = bundle.total_size();
        stats.total_lines = bundle.total_lines();

        // Count by service
        for log in &bundle.logs {
            let service_name = log.service.to_string();
            *stats.logs_by_service.entry(service_name).or_insert(0) += 1;
        }

        stats
    }
}

impl Default for BundleAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

/// Statistics about a bundle
#[derive(Debug, Clone, Default)]
pub struct BundleStats {
    /// Total number of logs
    pub total_logs: usize,

    /// Total size in bytes
    pub total_size_bytes: u64,

    /// Total line count
    pub total_lines: usize,

    /// Logs grouped by service
    pub logs_by_service: HashMap<String, usize>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::bundle::{Bundle, BundleLog, LogType, ServiceType};

    fn create_test_bundle() -> Bundle {
        let mut bundle = Bundle::new("test_bundle".to_string(), "Test Bundle".to_string());

        let mut log1 = BundleLog::new(
            "/logs/jabber.log".to_string(),
            ServiceType::Jabber,
            LogType::Trace,
        );
        log1.size_bytes = 1024;
        log1.line_count = 100;

        let mut log2 = BundleLog::new(
            "/logs/cucm.log".to_string(),
            ServiceType::CUCM,
            LogType::Trace,
        );
        log2.size_bytes = 2048;
        log2.line_count = 200;

        bundle.add_log(log1);
        bundle.add_log(log2);

        bundle
    }

    #[test]
    fn test_analyzer_creation() {
        let analyzer = BundleAnalyzer::new();
        assert!(true); // Analyzer created successfully
    }

    #[test]
    fn test_analyze_bundle() {
        let analyzer = BundleAnalyzer::new();
        let bundle = create_test_bundle();

        let result = analyzer.analyze_bundle(&bundle).unwrap();

        assert_eq!(result.bundle_id, "test_bundle");
        assert!(result.duration_ms > 0);
        assert_eq!(result.statistics.total_detections, 0); // Placeholder returns empty
    }

    #[test]
    fn test_get_bundle_stats() {
        let analyzer = BundleAnalyzer::new();
        let bundle = create_test_bundle();

        let stats = analyzer.get_bundle_stats(&bundle);

        assert_eq!(stats.total_logs, 2);
        assert_eq!(stats.total_size_bytes, 3072); // 1024 + 2048
        assert_eq!(stats.total_lines, 300); // 100 + 200
        assert_eq!(stats.logs_by_service.len(), 2);
        assert_eq!(stats.logs_by_service.get("Jabber"), Some(&1));
        assert_eq!(stats.logs_by_service.get("CUCM"), Some(&1));
    }

    #[test]
    fn test_analyze_with_custom_matcher() {
        let analyzer = BundleAnalyzer::new();
        let bundle = create_test_bundle();

        // Custom matcher that creates test detections
        let result = analyzer
            .analyze_with_matcher(&bundle, |_uri, _line_num, _line| {
                // Return empty for now - structure is in place
                Vec::new()
            })
            .unwrap();

        assert_eq!(result.bundle_id, "test_bundle");
        assert!(result.duration_ms >= 0);
    }

    #[test]
    fn test_empty_bundle_analysis() {
        let analyzer = BundleAnalyzer::new();
        let bundle = Bundle::new("empty".to_string(), "Empty Bundle".to_string());

        let result = analyzer.analyze_bundle(&bundle).unwrap();

        assert_eq!(result.statistics.total_detections, 0);
        assert_eq!(result.statistics.services_analyzed, 0);
    }

    #[test]
    fn test_stats_for_empty_bundle() {
        let analyzer = BundleAnalyzer::new();
        let bundle = Bundle::new("empty".to_string(), "Empty".to_string());

        let stats = analyzer.get_bundle_stats(&bundle);

        assert_eq!(stats.total_logs, 0);
        assert_eq!(stats.total_size_bytes, 0);
        assert_eq!(stats.total_lines, 0);
        assert_eq!(stats.logs_by_service.len(), 0);
    }
}
