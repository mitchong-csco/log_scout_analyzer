//! Pattern types and structures

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PatternError {
    #[error("Invalid regex: {0}")]
    InvalidRegex(String),
    #[error("Pattern not found: {0}")]
    NotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Severity {
    Error,
    Warning,
    Information,
    Hint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pattern {
    pub id: String,
    pub name: String,
    pub regex: String,
    pub annotation: String,
    pub severity: Severity,
    pub category: String,
}

#[derive(Debug, Clone)]
pub struct PatternMatch {
    pub pattern: Pattern,
    pub matched_text: String,
    pub line_number: usize,
    pub field_values: HashMap<String, String>,
}
