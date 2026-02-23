//! Timeframe analysis for intelligent bundle grouping
//!
//! Analyzes log files to detect timestamp ranges and suggests
//! grouping logs by timeframe overlap.

use chrono::{DateTime, Duration, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// Timeframe information for a log file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogTimeframe {
    /// Log file path
    pub log_path: String,

    /// First timestamp found in log
    pub start_time: Option<DateTime<Utc>>,

    /// Last timestamp found in log
    pub end_time: Option<DateTime<Utc>>,

    /// Total duration covered
    pub duration: Option<Duration>,

    /// Number of timestamps analyzed
    pub sample_count: usize,
}

impl LogTimeframe {
    /// Check if this timeframe overlaps with another
    pub fn overlaps_with(&self, other: &LogTimeframe) -> bool {
        match (
            self.start_time,
            self.end_time,
            other.start_time,
            other.end_time,
        ) {
            (Some(s1), Some(e1), Some(s2), Some(e2)) => {
                // Check if ranges overlap
                !(e1 < s2 || e2 < s1)
            }
            _ => true, // If we don't know, assume they might overlap
        }
    }

    /// Calculate gap between this timeframe and another
    pub fn gap_to(&self, other: &LogTimeframe) -> Option<Duration> {
        match (self.end_time, other.start_time) {
            (Some(end), Some(start)) if end < start => Some(start.signed_duration_since(end)),
            (Some(start), Some(end)) if start > end => Some(start.signed_duration_since(end)),
            _ => None,
        }
    }

    /// Check if timeframes are close (within threshold)
    pub fn is_close_to(&self, other: &LogTimeframe, threshold: Duration) -> bool {
        if self.overlaps_with(other) {
            return true;
        }

        match self.gap_to(other) {
            Some(gap) => gap <= threshold,
            None => true,
        }
    }
}

/// Analyzer for detecting log timeframes
pub struct TimeframeAnalyzer {
    /// Common timestamp patterns
    patterns: Vec<Regex>,
}

impl TimeframeAnalyzer {
    /// Create a new timeframe analyzer
    pub fn new() -> Self {
        let patterns = vec![
            // ISO 8601: 2026-02-18T14:30:00Z
            Regex::new(r"(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)").unwrap(),

            // Common log format: 2026-02-18 14:30:00
            Regex::new(r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})").unwrap(),

            // Cisco format: Feb 18 14:30:00.123
            Regex::new(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)").unwrap(),

            // CUCM format: 2026-02-18 14:30:00,123
            Regex::new(r"(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+)").unwrap(),
        ];

        Self { patterns }
    }

    /// Analyze a log file to determine its timeframe
    pub fn analyze_log(&self, log_path: &Path) -> std::io::Result<LogTimeframe> {
        let file = File::open(log_path)?;
        let reader = BufReader::new(file);

        let mut first_timestamp: Option<DateTime<Utc>> = None;
        let mut last_timestamp: Option<DateTime<Utc>> = None;
        let mut sample_count = 0;

        // Sample first 100 and last 100 lines for performance
        let lines: Vec<String> = reader.lines().filter_map(|l| l.ok()).collect();
        let total_lines = lines.len();

        // Analyze first 100 lines
        for line in lines.iter().take(100) {
            if let Some(ts) = self.extract_timestamp(line) {
                if first_timestamp.is_none() {
                    first_timestamp = Some(ts);
                }
                last_timestamp = Some(ts);
                sample_count += 1;
            }
        }

        // Analyze last 100 lines
        if total_lines > 100 {
            for line in lines.iter().skip(total_lines.saturating_sub(100)) {
                if let Some(ts) = self.extract_timestamp(line) {
                    last_timestamp = Some(ts);
                    sample_count += 1;
                }
            }
        }

        let duration = match (first_timestamp, last_timestamp) {
            (Some(start), Some(end)) => Some(end.signed_duration_since(start)),
            _ => None,
        };

        Ok(LogTimeframe {
            log_path: log_path.to_string_lossy().to_string(),
            start_time: first_timestamp,
            end_time: last_timestamp,
            duration,
            sample_count,
        })
    }

    /// Extract timestamp from a log line
    fn extract_timestamp(&self, line: &str) -> Option<DateTime<Utc>> {
        for pattern in &self.patterns {
            if let Some(captures) = pattern.captures(line) {
                if let Some(ts_str) = captures.get(1) {
                    // Try parsing with various formats
                    if let Ok(dt) = dateparser::parse(ts_str.as_str()) {
                        return Some(DateTime::<Utc>::from(dt));
                    }
                }
            }
        }
        None
    }
}

/// Suggests bundle grouping based on timeframe analysis
pub struct TimeframeBundleAnalyzer {
    analyzer: TimeframeAnalyzer,
    /// Maximum gap to consider logs as "related" (default 6 hours)
    max_gap: Duration,
}

impl TimeframeBundleAnalyzer {
    /// Create a new bundle analyzer
    pub fn new() -> Self {
        Self {
            analyzer: TimeframeAnalyzer::new(),
            max_gap: Duration::hours(6),
        }
    }

    /// Analyze multiple logs and suggest bundle groupings
    pub fn suggest_bundles(&self, log_paths: &[&Path]) -> Vec<BundleGroup> {
        // Analyze each log
        let mut timeframes: Vec<LogTimeframe> = Vec::new();

        for path in log_paths {
            match self.analyzer.analyze_log(path) {
                Ok(tf) => {
                    tracing::info!(
                        "Log {} covers {:?} to {:?}",
                        path.display(),
                        tf.start_time,
                        tf.end_time
                    );
                    timeframes.push(tf);
                }
                Err(e) => {
                    tracing::warn!("Failed to analyze {}: {}", path.display(), e);
                }
            }
        }

        // Group by overlapping timeframes
        let mut groups: Vec<BundleGroup> = Vec::new();

        for timeframe in timeframes {
            let mut added = false;

            // Try to add to existing group
            for group in &mut groups {
                if group.should_include(&timeframe, self.max_gap) {
                    group.add_log(timeframe.clone());
                    added = true;
                    break;
                }
            }

            // Create new group if doesn't fit existing
            if !added {
                let mut group = BundleGroup::new();
                group.add_log(timeframe);
                groups.push(group);
            }
        }

        // Sort groups by start time
        groups.sort_by(|a, b| match (a.start_time, b.start_time) {
            (Some(a_start), Some(b_start)) => a_start.cmp(&b_start),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        });

        groups
    }
}

/// A suggested bundle group based on timeframe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleGroup {
    /// Logs in this group
    pub logs: Vec<LogTimeframe>,

    /// Combined start time
    pub start_time: Option<DateTime<Utc>>,

    /// Combined end time
    pub end_time: Option<DateTime<Utc>>,

    /// Suggested bundle name
    pub suggested_name: String,
}

impl BundleGroup {
    fn new() -> Self {
        Self {
            logs: Vec::new(),
            start_time: None,
            end_time: None,
            suggested_name: String::new(),
        }
    }

    fn add_log(&mut self, timeframe: LogTimeframe) {
        // Update group timeframe
        if let Some(log_start) = timeframe.start_time {
            self.start_time = Some(match self.start_time {
                Some(current) => current.min(log_start),
                None => log_start,
            });
        }

        if let Some(log_end) = timeframe.end_time {
            self.end_time = Some(match self.end_time {
                Some(current) => current.max(log_end),
                None => log_end,
            });
        }

        self.logs.push(timeframe);
        self.update_suggested_name();
    }

    fn should_include(&self, timeframe: &LogTimeframe, max_gap: Duration) -> bool {
        if self.logs.is_empty() {
            return true;
        }

        // Check if overlaps with any log in group
        for log in &self.logs {
            if log.is_close_to(timeframe, max_gap) {
                return true;
            }
        }

        false
    }

    fn update_suggested_name(&mut self) {
        match (self.start_time, self.end_time) {
            (Some(start), Some(end)) => {
                let start_str = start.format("%Y-%m-%d %H:%M").to_string();
                let end_str = end.format("%H:%M").to_string();

                // If same day, show time range
                if start.date_naive() == end.date_naive() {
                    self.suggested_name = format!("{} to {}", start_str, end_str);
                } else {
                    // Different days
                    let end_full = end.format("%Y-%m-%d %H:%M").to_string();
                    self.suggested_name = format!("{} to {}", start_str, end_full);
                }
            }
            _ => {
                self.suggested_name = format!("Bundle {} logs", self.logs.len());
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeframe_overlap() {
        let tf1 = LogTimeframe {
            log_path: "log1".to_string(),
            start_time: Some(Utc::now()),
            end_time: Some(Utc::now() + Duration::hours(2)),
            duration: Some(Duration::hours(2)),
            sample_count: 100,
        };

        let tf2 = LogTimeframe {
            log_path: "log2".to_string(),
            start_time: Some(Utc::now() + Duration::hours(1)),
            end_time: Some(Utc::now() + Duration::hours(3)),
            duration: Some(Duration::hours(2)),
            sample_count: 100,
        };

        assert!(tf1.overlaps_with(&tf2));
    }

    #[test]
    fn test_timeframe_gap() {
        let tf1 = LogTimeframe {
            log_path: "log1".to_string(),
            start_time: Some(Utc::now()),
            end_time: Some(Utc::now() + Duration::hours(1)),
            duration: Some(Duration::hours(1)),
            sample_count: 100,
        };

        let tf2 = LogTimeframe {
            log_path: "log2".to_string(),
            start_time: Some(Utc::now() + Duration::hours(3)),
            end_time: Some(Utc::now() + Duration::hours(4)),
            duration: Some(Duration::hours(1)),
            sample_count: 100,
        };

        assert!(!tf1.overlaps_with(&tf2));

        let gap = tf1.gap_to(&tf2).unwrap();
        assert_eq!(gap, Duration::hours(2));
    }
}
