//! Configuration types and loading
//!
//! Core configuration structures used across Log Scout components

use serde::{Deserialize, Serialize};

/// Main configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// General settings
    #[serde(default)]
    pub settings: Settings,
}

/// General extension settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    /// Detection threshold (0.0 - 1.0)
    #[serde(default = "default_threshold")]
    pub detection_threshold: f32,

    /// Enable multi-line pattern matching
    #[serde(default = "default_true")]
    pub multiline_patterns: bool,

    /// Context window size for multi-line patterns
    #[serde(default = "default_context_window")]
    pub multiline_context_window: usize,

    /// Maximum file size to process (in MB)
    #[serde(default = "default_max_file_size")]
    pub max_file_size_mb: usize,

    /// Streaming chunk size (in KB)
    #[serde(default = "default_chunk_size")]
    pub streaming_chunk_size_kb: usize,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            detection_threshold: default_threshold(),
            multiline_patterns: default_true(),
            multiline_context_window: default_context_window(),
            max_file_size_mb: default_max_file_size(),
            streaming_chunk_size_kb: default_chunk_size(),
        }
    }
}

fn default_threshold() -> f32 {
    0.5
}

fn default_true() -> bool {
    true
}

fn default_context_window() -> usize {
    5
}

fn default_max_file_size() -> usize {
    100
}

fn default_chunk_size() -> usize {
    64
}
