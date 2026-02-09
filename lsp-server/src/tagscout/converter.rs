//! Pattern Converter Module
//!
//! Converts TagScout annotations to Log Scout LSP patterns.
//! Handles severity mapping, pattern validation, and metadata transformation.

use crate::pattern_engine::{Pattern, PatternMode, Severity};
use crate::tagscout::client::TagScoutAnnotation;
use thiserror::Error;

/// Conversion errors
#[derive(Error, Debug)]
pub enum ConversionError {
    #[error("Invalid pattern syntax: {0}")]
    InvalidPattern(String),

    #[error("Invalid severity level: {0}")]
    InvalidSeverity(String),

    #[error("Missing required field: {0}")]
    MissingField(String),

    #[error("Conversion error: {0}")]
    ConversionFailed(String),
}

/// Pattern converter configuration
#[derive(Debug, Clone)]
pub struct ConverterConfig {
    /// Convert multi-line patterns (default: true)
    pub convert_multiline: bool,

    /// Default context window for multi-line patterns
    pub default_context_window: usize,

    /// Validate regex patterns before conversion
    pub validate_regex: bool,

    /// Include inactive patterns (default: false)
    pub include_inactive: bool,

    /// Severity mapping overrides
    pub severity_mapping: Option<std::collections::HashMap<String, Severity>>,

    /// Product to service name mapping
    pub product_service_mapping: Option<std::collections::HashMap<String, String>>,
}

impl Default for ConverterConfig {
    fn default() -> Self {
        Self {
            convert_multiline: true,
            default_context_window: 10,
            validate_regex: true,
            include_inactive: false,
            severity_mapping: None,
            product_service_mapping: None,
        }
    }
}

/// Pattern converter
pub struct PatternConverter {
    config: ConverterConfig,
}

impl PatternConverter {
    /// Create a new pattern converter with default configuration
    pub fn new() -> Self {
        Self {
            config: ConverterConfig::default(),
        }
    }

    /// Create a new pattern converter with custom configuration
    pub fn with_config(config: ConverterConfig) -> Self {
        Self { config }
    }

    /// Convert a single TagScout annotation to an LSP pattern
    pub fn convert(&self, annotation: &TagScoutAnnotation) -> Result<Pattern, ConversionError> {
        // Skip inactive patterns unless configured otherwise
        if !annotation.active && !self.config.include_inactive {
            return Err(ConversionError::ConversionFailed(
                "Pattern is inactive".to_string(),
            ));
        }

        // Validate pattern if configured
        if self.config.validate_regex {
            self.validate_pattern(&annotation.pattern)?;
        }

        // Generate unique ID
        let id = self.generate_id(annotation);

        // Convert severity
        let severity = self.convert_severity(&annotation.severity)?;

        // Determine pattern mode
        let mode = self.determine_pattern_mode(&annotation.pattern);

        // Map product to service name
        let service = self.map_product_to_service(&annotation.product);

        // Build action text
        let action = self.build_action(annotation);

        // Build tags
        let tags = self.build_tags(annotation);

        Ok(Pattern {
            id,
            name: annotation.name.clone(),
            description: annotation.description.clone(),
            pattern: annotation.pattern.clone(),
            mode,
            severity,
            category: annotation.category.clone(),
            service,
            tags,
            action,
            expected_frequency: None, // Could be derived from metadata in future
            enabled: annotation.active,
        })
    }

    /// Convert multiple annotations
    pub fn convert_batch(
        &self,
        annotations: Vec<TagScoutAnnotation>,
    ) -> Result<Vec<Pattern>, ConversionError> {
        let mut patterns = Vec::new();
        let mut errors = Vec::new();

        for annotation in annotations {
            match self.convert(&annotation) {
                Ok(pattern) => patterns.push(pattern),
                Err(e) => {
                    tracing::warn!("Failed to convert pattern '{}': {}", annotation.name, e);
                    errors.push(e);
                }
            }
        }

        if patterns.is_empty() && !errors.is_empty() {
            return Err(ConversionError::ConversionFailed(format!(
                "Failed to convert any patterns: {} errors",
                errors.len()
            )));
        }

        tracing::info!(
            "Converted {} patterns ({} errors)",
            patterns.len(),
            errors.len()
        );

        Ok(patterns)
    }

    /// Generate a unique ID for the pattern
    fn generate_id(&self, annotation: &TagScoutAnnotation) -> String {
        // Use MongoDB ObjectId as base
        let oid = annotation.id.to_hex();

        // Include product prefix if available
        if !annotation.product.is_empty() {
            format!("{}-{}", annotation.product.to_lowercase(), oid)
        } else {
            oid
        }
    }

    /// Convert severity string to Severity enum
    fn convert_severity(&self, severity_str: &str) -> Result<Severity, ConversionError> {
        // Check custom mapping first
        if let Some(mapping) = &self.config.severity_mapping {
            if let Some(severity) = mapping.get(severity_str) {
                return Ok(*severity);
            }
        }

        // Default mapping
        match severity_str.to_lowercase().as_str() {
            "error" | "critical" | "fatal" | "severe" => Ok(Severity::Error),
            "warning" | "warn" | "caution" => Ok(Severity::Warning),
            "info" | "information" | "notice" => Ok(Severity::Info),
            "hint" | "debug" | "trace" | "verbose" => Ok(Severity::Hint),
            _ => {
                tracing::warn!("Unknown severity '{}', defaulting to Info", severity_str);
                Ok(Severity::Info)
            }
        }
    }

    /// Determine pattern mode based on pattern content
    fn determine_pattern_mode(&self, pattern: &str) -> PatternMode {
        if !self.config.convert_multiline {
            return PatternMode::SingleLine;
        }

        // Check for multi-line indicators
        if pattern.contains(r"\n") || pattern.contains("(?s)") || pattern.contains("(?m)") {
            PatternMode::MultiLine {
                context_lines: self.config.default_context_window,
            }
        } else {
            PatternMode::SingleLine
        }
    }

    /// Validate regex pattern
    fn validate_pattern(&self, pattern: &str) -> Result<(), ConversionError> {
        regex::Regex::new(pattern)
            .map_err(|e| ConversionError::InvalidPattern(format!("{}: {}", pattern, e)))?;
        Ok(())
    }

    /// Map product name to service name
    fn map_product_to_service(&self, product: &str) -> Option<String> {
        if product.is_empty() {
            return None;
        }

        // Check custom mapping first
        if let Some(mapping) = &self.config.product_service_mapping {
            if let Some(service) = mapping.get(product) {
                return Some(service.clone());
            }
        }

        // Default: use product name as service name
        Some(product.to_lowercase())
    }

    /// Build action text from annotation
    fn build_action(&self, annotation: &TagScoutAnnotation) -> Option<String> {
        let mut action_parts = Vec::new();

        // Add primary action
        if !annotation.action.is_empty() {
            action_parts.push(annotation.action.clone());
        }

        // Add KB reference
        if !annotation.kb_id.is_empty() {
            action_parts.push(format!("See KB article: {}", annotation.kb_id));
        }

        // Add bug reference
        if !annotation.bug_id.is_empty() {
            action_parts.push(format!("Related bug: {}", annotation.bug_id));
        }

        // Add version information
        if !annotation.version_fixed.is_empty() {
            action_parts.push(format!("Fixed in version: {}", annotation.version_fixed));
        } else if !annotation.version_introduced.is_empty() {
            action_parts.push(format!(
                "Known issue since version: {}",
                annotation.version_introduced
            ));
        }

        if action_parts.is_empty() {
            None
        } else {
            Some(action_parts.join(" | "))
        }
    }

    /// Build tags from annotation
    fn build_tags(&self, annotation: &TagScoutAnnotation) -> Vec<String> {
        let mut tags = annotation.tags.clone();

        // Add product as tag if not empty
        if !annotation.product.is_empty() && !tags.contains(&annotation.product) {
            tags.push(annotation.product.clone());
        }

        // Add component as tag if not empty
        if !annotation.component.is_empty() && !tags.contains(&annotation.component) {
            tags.push(annotation.component.clone());
        }

        // Add category as tag if not already in tags
        if !annotation.category.is_empty() && !tags.contains(&annotation.category) {
            tags.push(annotation.category.clone());
        }

        tags
    }

    /// Get converter configuration
    pub fn config(&self) -> &ConverterConfig {
        &self.config
    }
}

impl Default for PatternConverter {
    fn default() -> Self {
        Self::new()
    }
}

/// Batch conversion result
#[derive(Debug)]
pub struct ConversionResult {
    /// Successfully converted patterns
    pub patterns: Vec<Pattern>,

    /// Conversion errors
    pub errors: Vec<(String, ConversionError)>,

    /// Total annotations processed
    pub total: usize,

    /// Success rate
    pub success_rate: f32,
}

impl ConversionResult {
    /// Create a new conversion result
    pub fn new(
        patterns: Vec<Pattern>,
        errors: Vec<(String, ConversionError)>,
        total: usize,
    ) -> Self {
        let success_rate = if total > 0 {
            patterns.len() as f32 / total as f32
        } else {
            0.0
        };

        Self {
            patterns,
            errors,
            total,
            success_rate,
        }
    }

    /// Check if conversion was successful
    pub fn is_success(&self) -> bool {
        !self.patterns.is_empty()
    }

    /// Get summary string
    pub fn summary(&self) -> String {
        format!(
            "Converted {}/{} patterns ({:.1}% success rate, {} errors)",
            self.patterns.len(),
            self.total,
            self.success_rate * 100.0,
            self.errors.len()
        )
    }
}

/// Convert annotations with detailed result tracking
pub fn convert_with_result(
    annotations: Vec<TagScoutAnnotation>,
    config: Option<ConverterConfig>,
) -> ConversionResult {
    let converter = match config {
        Some(cfg) => PatternConverter::with_config(cfg),
        None => PatternConverter::new(),
    };

    let total = annotations.len();
    let mut patterns = Vec::new();
    let mut errors = Vec::new();

    for annotation in annotations {
        let name = annotation.name.clone();
        match converter.convert(&annotation) {
            Ok(pattern) => patterns.push(pattern),
            Err(e) => errors.push((name, e)),
        }
    }

    ConversionResult::new(patterns, errors, total)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_annotation() -> TagScoutAnnotation {
        TagScoutAnnotation {
            id: bson::oid::ObjectId::new(),
            name: "Test Error Pattern".to_string(),
            description: "Detects test errors".to_string(),
            pattern: r"ERROR:\s+(.+)".to_string(),
            severity: "error".to_string(),
            category: "errors".to_string(),
            product: "test-product".to_string(),
            component: "test-component".to_string(),
            tags: vec!["test".to_string()],
            action: "Check logs for details".to_string(),
            kb_id: "KB12345".to_string(),
            bug_id: "BUG67890".to_string(),
            version_introduced: "1.0.0".to_string(),
            version_fixed: "1.1.0".to_string(),
            active: true,
            last_updated: Some(bson::DateTime::now()),
            created_at: Some(bson::DateTime::now()),
            author: "test-author".to_string(),
            metadata: None,
        }
    }

    #[test]
    fn test_convert_annotation() {
        let converter = PatternConverter::new();
        let annotation = create_test_annotation();

        let result = converter.convert(&annotation);
        assert!(result.is_ok());

        let pattern = result.unwrap();
        assert_eq!(pattern.name, "Test Error Pattern");
        assert_eq!(pattern.severity, Severity::Error);
        assert_eq!(pattern.category, "errors");
    }

    #[test]
    fn test_severity_conversion() {
        let converter = PatternConverter::new();

        assert_eq!(
            converter.convert_severity("error").unwrap(),
            Severity::Error
        );
        assert_eq!(
            converter.convert_severity("warning").unwrap(),
            Severity::Warning
        );
        assert_eq!(converter.convert_severity("info").unwrap(), Severity::Info);
        assert_eq!(converter.convert_severity("hint").unwrap(), Severity::Hint);
    }

    #[test]
    fn test_pattern_mode_detection() {
        let converter = PatternConverter::new();

        // Single line pattern
        let single = converter.determine_pattern_mode(r"ERROR:\s+(.+)");
        assert_eq!(single, PatternMode::SingleLine);

        // Multi-line pattern
        let multi = converter.determine_pattern_mode(r"ERROR:\s+(.+)\n");
        assert!(matches!(multi, PatternMode::MultiLine { .. }));
    }

    #[test]
    fn test_validate_pattern() {
        let converter = PatternConverter::new();

        // Valid pattern
        assert!(converter.validate_pattern(r"ERROR:\s+(.+)").is_ok());

        // Invalid pattern
        assert!(converter.validate_pattern(r"ERROR:\s+((.+)").is_err());
    }

    #[test]
    fn test_build_action() {
        let converter = PatternConverter::new();
        let annotation = create_test_annotation();

        let action = converter.build_action(&annotation);
        assert!(action.is_some());

        let action_text = action.unwrap();
        assert!(action_text.contains("KB12345"));
        assert!(action_text.contains("BUG67890"));
        assert!(action_text.contains("1.1.0"));
    }

    #[test]
    fn test_build_tags() {
        let converter = PatternConverter::new();
        let annotation = create_test_annotation();

        let tags = converter.build_tags(&annotation);
        assert!(tags.contains(&"test".to_string()));
        assert!(tags.contains(&"test-product".to_string()));
        assert!(tags.contains(&"test-component".to_string()));
    }

    #[test]
    fn test_batch_conversion() {
        let converter = PatternConverter::new();
        let annotations = vec![
            create_test_annotation(),
            create_test_annotation(),
            create_test_annotation(),
        ];

        let result = converter.convert_batch(annotations);
        assert!(result.is_ok());

        let patterns = result.unwrap();
        assert_eq!(patterns.len(), 3);
    }

    #[test]
    fn test_inactive_pattern_filtering() {
        let converter = PatternConverter::new();
        let mut annotation = create_test_annotation();
        annotation.active = false;

        let result = converter.convert(&annotation);
        assert!(result.is_err());
    }

    #[test]
    fn test_conversion_result() {
        let annotations = vec![create_test_annotation(), create_test_annotation()];
        let result = convert_with_result(annotations, None);

        assert!(result.is_success());
        assert_eq!(result.total, 2);
        assert_eq!(result.patterns.len(), 2);
        assert!(result.success_rate > 0.0);
    }
}
