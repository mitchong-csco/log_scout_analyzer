//! Bundle analysis - runs pattern matching on bundled logs
//!
//! Applies patterns to logs in a bundle, respecting service types and aggregating results

use super::models::*;
use crate::pattern_engine::PatternEngine;
use std::fs;
use std::time::Instant;

pub struct BundleAnalyzer;

impl BundleAnalyzer {
    /// Analyze a bundle with the given pattern engine
    pub fn analyze_bundle(
        bundle: &Bundle,
        pattern_engine: &PatternEngine,
    ) -> Result<BundleAnalysisResult, String> {
        let start_time = Instant::now();
        let mut detections = Vec::new();

        // Analyze each log in the bundle
        for bundle_log in &bundle.logs {
            // Read log file
            let content = fs::read_to_string(&bundle_log.uri)
                .map_err(|e| format!("Failed to read {}: {}", bundle_log.uri, e))?;

            // Run patterns on each line of this log
            for (line_num, line) in content.lines().enumerate() {
                let matches = pattern_engine.process_line(line, line_num);

                // Convert pattern matches to bundle detections
                for pattern_match in matches {
                    // Phase 2 will add more sophisticated service filtering
                    let detection = Detection {
                        log_uri: bundle_log.uri.clone(),
                        pattern_id: pattern_match.pattern.id.clone(),
                        pattern_name: pattern_match.pattern.name.clone(),
                        line_number: pattern_match.line_number + 1, // 0-based to 1-based
                        matched_text: pattern_match.matched_text.clone(),
                        severity: convert_severity(&pattern_match.final_severity),
                        service: bundle_log.service.clone(),
                    };
                    detections.push(detection);
                }
            }
        }

        let duration_ms = start_time.elapsed().as_millis() as u64;

        // Create result
        let mut result = BundleAnalysisResult::new(detections);
        result.summary.total_logs = bundle.logs.len();
        result.summary.total_lines = bundle.total_lines();
        result.summary.analysis_duration_ms = duration_ms;

        tracing::info!(
            "Bundle analysis completed: {} detections in {}ms",
            result.summary.total_detections,
            duration_ms
        );

        Ok(result)
    }
}

/// Convert pattern severity to detection severity
fn convert_severity(pattern_severity: &crate::pattern_engine::Severity) -> DetectionSeverity {
    use crate::pattern_engine::Severity;

    match pattern_severity {
        Severity::Error => DetectionSeverity::Error,
        Severity::Warning => DetectionSeverity::Warning,
        Severity::Info => DetectionSeverity::Info,
        Severity::Hint => DetectionSeverity::Hint,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
}
