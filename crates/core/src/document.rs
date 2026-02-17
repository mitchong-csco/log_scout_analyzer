//! Document management
//!
//! Core document types for managing log files

use serde::{Deserialize, Serialize};

/// Represents a log document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub uri: String,
    pub content: String,
    pub version: i32,
}

impl Document {
    pub fn new(uri: String, content: String) -> Self {
        Self {
            uri,
            content,
            version: 0,
        }
    }

    pub fn line_count(&self) -> usize {
        self.content.lines().count()
    }

    pub fn get_line(&self, line: usize) -> Option<&str> {
        self.content.lines().nth(line)
    }
}
