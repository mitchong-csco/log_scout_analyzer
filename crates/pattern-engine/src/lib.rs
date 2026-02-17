//! Pattern Engine - Core pattern matching functionality
//!
//! This crate provides the pattern matching engine for log analysis.
//! It includes pattern matching, parameter extraction, and severity evaluation.

pub mod engine;
pub mod matcher;
pub mod types;

pub use engine::PatternEngine;
pub use matcher::PatternMatcher;
pub use types::{Pattern, PatternError, PatternMatch, Severity};
