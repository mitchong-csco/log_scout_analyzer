//! Core pattern matching engine for log analysis
//!
//! This module provides the foundational pattern matching capabilities including:
//! - Single and multi-line pattern matching
//! - Pattern signatures and actions
//! - Baseline deviation detection
//! - Performance-optimized streaming processing

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use thiserror::Error;

/// Error types for pattern engine operations
#[derive(Error, Debug)]
pub enum PatternError {
    #[error("Invalid regex pattern: {0}")]
    InvalidRegex(String),

    #[error("Pattern not found: {0}")]
    PatternNotFound(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Processing error: {0}")]
    ProcessingError(String),
}

/// Severity level for pattern matches
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Error,
    Warning,
    Info,
    Hint,
}

/// Pattern matching mode
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PatternMode {
    /// Single line pattern matching
    SingleLine,
    /// Multi-line pattern with context window
    MultiLine { context_lines: usize },
    /// Sequence of patterns that must appear in order
    Sequence { max_gap_lines: usize },
}

/// A pattern definition loaded from configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pattern {
    /// Unique identifier for the pattern
    pub id: String,

    /// Human-readable name
    pub name: String,

    /// Description of what this pattern detects
    pub description: String,

    /// Regular expression pattern
    pub pattern: String,

    /// Pattern matching mode
    #[serde(default = "default_pattern_mode")]
    pub mode: PatternMode,

    /// Severity level when matched
    pub severity: Severity,

    /// Category for grouping (e.g., "network", "authentication", "performance")
    #[serde(default)]
    pub category: String,

    /// Service this pattern applies to (e.g., "jabber", "webex", "system")
    #[serde(default)]
    pub service: Option<String>,

    /// Tags for additional classification
    #[serde(default)]
    pub tags: Vec<String>,

    /// Suggested action or remediation
    #[serde(default)]
    pub action: Option<String>,

    /// Expected frequency (for baseline deviation detection)
    #[serde(default)]
    pub expected_frequency: Option<FrequencyBaseline>,

    /// Whether this pattern is enabled
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_pattern_mode() -> PatternMode {
    PatternMode::SingleLine
}

fn default_true() -> bool {
    true
}

/// Baseline frequency for deviation detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrequencyBaseline {
    /// Expected occurrences per time window
    pub expected_count: u32,

    /// Time window in seconds
    pub window_seconds: u64,

    /// Deviation threshold (percentage)
    pub threshold_percent: f32,
}

/// A compiled pattern ready for matching
pub struct CompiledPattern {
    pub pattern: Pattern,
    regex: Regex,
}

impl CompiledPattern {
    /// Compile a pattern for efficient matching
    pub fn new(pattern: Pattern) -> Result<Self, PatternError> {
        let regex = Regex::new(&pattern.pattern)
            .map_err(|e| PatternError::InvalidRegex(format!("{}: {}", pattern.id, e)))?;

        Ok(CompiledPattern { pattern, regex })
    }

    /// Check if this pattern matches a single line
    pub fn matches(&self, line: &str) -> bool {
        self.regex.is_match(line)
    }

    /// Find all matches in a line with capture groups
    pub fn find_matches(&self, line: &str) -> Vec<PatternMatch> {
        self.regex
            .captures_iter(line)
            .map(|cap| {
                let full_match = cap.get(0).unwrap();
                PatternMatch {
                    pattern_id: self.pattern.id.clone(),
                    start: full_match.start(),
                    end: full_match.end(),
                    text: full_match.as_str().to_string(),
                    captures: cap
                        .iter()
                        .skip(1)
                        .filter_map(|m| m.map(|m| m.as_str().to_string()))
                        .collect(),
                }
            })
            .collect()
    }
}

/// A pattern match result
#[derive(Debug, Clone)]
pub struct PatternMatch {
    pub pattern_id: String,
    pub start: usize,
    pub end: usize,
    pub text: String,
    pub captures: Vec<String>,
}

/// A detected pattern occurrence in a log file
#[derive(Debug, Clone)]
pub struct Detection {
    /// The pattern that was matched
    pub pattern: Arc<Pattern>,

    /// Line number where the match occurred (1-based)
    pub line_number: usize,

    /// Column range for the match
    pub column_range: (usize, usize),

    /// The matched text
    pub matched_text: String,

    /// Captured groups from the pattern
    pub captures: Vec<String>,

    /// Context lines (for multi-line patterns)
    pub context: Vec<String>,

    /// Timestamp if parsed from log
    pub timestamp: Option<String>,
}

/// Pattern engine for log analysis
pub struct PatternEngine {
    /// Compiled patterns ready for matching
    patterns: Vec<Arc<CompiledPattern>>,

    /// Pattern lookup by ID
    pattern_map: HashMap<String, Arc<CompiledPattern>>,

    /// Detection threshold (0.0 - 1.0)
    threshold: f32,

    /// Context window for multi-line patterns
    context_window: usize,
}

impl PatternEngine {
    /// Create a new pattern engine with the given patterns
    pub fn new(patterns: Vec<Pattern>, threshold: f32, context_window: usize) -> Result<Self, PatternError> {
        let mut compiled_patterns = Vec::new();
        let mut pattern_map = HashMap::new();

        for pattern in patterns {
            if !pattern.enabled {
                continue;
            }

            let compiled = Arc::new(CompiledPattern::new(pattern)?);
            pattern_map.insert(compiled.pattern.id.clone(), Arc::clone(&compiled));
            compiled_patterns.push(compiled);
        }

        Ok(PatternEngine {
            patterns: compiled_patterns,
            pattern_map,
            threshold: threshold.clamp(0.0, 1.0),
            context_window,
        })
    }

    /// Process a single line and return all detections
    pub fn process_line(&self, line: &str, line_number: usize) -> Vec<Detection> {
        let mut detections = Vec::new();

        for compiled_pattern in &self.patterns {
            match compiled_pattern.pattern.mode {
                PatternMode::SingleLine => {
                    let matches = compiled_pattern.find_matches(line);
                    for m in matches {
                        detections.push(Detection {
                            pattern: Arc::new(compiled_pattern.pattern.clone()),
                            line_number,
                            column_range: (m.start, m.end),
                            matched_text: m.text,
                            captures: m.captures,
                            context: vec![line.to_string()],
                            timestamp: None, // TODO: Parse timestamp
                        });
                    }
                }
                _ => {
                    // Multi-line patterns require context processor
                    // This will be handled by the context processor
                }
            }
        }

        detections
    }

    /// Get a pattern by ID
    pub fn get_pattern(&self, id: &str) -> Option<&CompiledPattern> {
        self.pattern_map.get(id).map(|arc| arc.as_ref())
    }

    /// Get all enabled patterns
    pub fn get_patterns(&self) -> &[Arc<CompiledPattern>] {
        &self.patterns
    }

    /// Get patterns filtered by service
    pub fn get_patterns_by_service(&self, service: &str) -> Vec<&CompiledPattern> {
        self.patterns
            .iter()
            .filter(|p| {
                p.pattern.service.as_ref().map_or(false, |s| s == service)
            })
            .map(|arc| arc.as_ref())
            .collect()
    }

    /// Get patterns filtered by category
    pub fn get_patterns_by_category(&self, category: &str) -> Vec<&CompiledPattern> {
        self.patterns
            .iter()
            .filter(|p| p.pattern.category == category)
            .map(|arc| arc.as_ref())
            .collect()
    }
}

/// Context processor for multi-line pattern matching
pub struct ContextProcessor {
    /// Ring buffer for maintaining context
    context_buffer: VecDeque<String>,

    /// Maximum context window size
    max_window: usize,

    /// Current line number
    current_line: usize,
}

impl ContextProcessor {
    /// Create a new context processor
    pub fn new(max_window: usize) -> Self {
        ContextProcessor {
            context_buffer: VecDeque::with_capacity(max_window),
            max_window,
            current_line: 0,
        }
    }

    /// Add a line to the context buffer
    pub fn push_line(&mut self, line: String) {
        if self.context_buffer.len() >= self.max_window {
            self.context_buffer.pop_front();
        }
        self.context_buffer.push_back(line);
        self.current_line += 1;
    }

    /// Get the current context window
    pub fn get_context(&self, lines: usize) -> Vec<String> {
        let start = self.context_buffer.len().saturating_sub(lines);
        self.context_buffer
            .iter()
            .skip(start)
            .cloned()
            .collect()
    }

    /// Check multi-line patterns against current context
    pub fn check_multiline_patterns(
        &self,
        patterns: &[Arc<CompiledPattern>],
    ) -> Vec<Detection> {
        let mut detections = Vec::new();

        for pattern in patterns {
            if let PatternMode::MultiLine { context_lines } = pattern.pattern.mode {
                let context = self.get_context(context_lines);
                let combined = context.join("\n");

                let matches = pattern.find_matches(&combined);
                for m in matches {
                    detections.push(Detection {
                        pattern: Arc::new(pattern.pattern.clone()),
                        line_number: self.current_line,
                        column_range: (m.start, m.end),
                        matched_text: m.text,
                        captures: m.captures,
                        context: context.clone(),
                        timestamp: None,
                    });
                }
            }
        }

        detections
    }

    /// Reset the processor
    pub fn reset(&mut self) {
        self.context_buffer.clear();
        self.current_line = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_compilation() {
        let pattern = Pattern {
            id: "test-error".to_string(),
            name: "Test Error".to_string(),
            description: "Test error pattern".to_string(),
            pattern: r"ERROR:\s+(.+)".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Error,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
        };

        let compiled = CompiledPattern::new(pattern);
        assert!(compiled.is_ok());
    }

    #[test]
    fn test_pattern_matching() {
        let pattern = Pattern {
            id: "test-error".to_string(),
            name: "Test Error".to_string(),
            description: "Test error pattern".to_string(),
            pattern: r"ERROR:\s+(.+)".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Error,
            category: "test".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
        };

        let compiled = CompiledPattern::new(pattern).unwrap();
        assert!(compiled.matches("ERROR: Something went wrong"));
        assert!(!compiled.matches("INFO: All good"));
    }

    #[test]
    fn test_pattern_engine_processing() {
        let patterns = vec![
            Pattern {
                id: "error-pattern".to_string(),
                name: "Error Pattern".to_string(),
                description: "Matches error lines".to_string(),
                pattern: r"ERROR".to_string(),
                mode: PatternMode::SingleLine,
                severity: Severity::Error,
                category: "errors".to_string(),
                service: None,
                tags: vec![],
                action: None,
                expected_frequency: None,
                enabled: true,
            },
        ];

        let engine = PatternEngine::new(patterns, 0.85, 10).unwrap();
        let detections = engine.process_line("ERROR: Test error message", 1);

        assert_eq!(detections.len(), 1);
        assert_eq!(detections[0].pattern.id, "error-pattern");
    }

    #[test]
    fn test_context_processor() {
        let mut processor = ContextProcessor::new(5);

        processor.push_line("Line 1".to_string());
        processor.push_line("Line 2".to_string());
        processor.push_line("Line 3".to_string());

        let context = processor.get_context(2);
        assert_eq!(context.len(), 2);
        assert_eq!(context[0], "Line 2");
        assert_eq!(context[1], "Line 3");
    }
}
