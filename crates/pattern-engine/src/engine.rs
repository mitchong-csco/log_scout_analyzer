//! Pattern engine orchestrator

use crate::matcher::PatternMatcher;
use crate::types::{Pattern, PatternMatch};

pub struct PatternEngine {
    matcher: PatternMatcher,
}

impl PatternEngine {
    pub fn new(patterns: Vec<Pattern>) -> Result<Self, crate::types::PatternError> {
        let matcher = PatternMatcher::new(patterns)?;
        Ok(Self { matcher })
    }

    pub fn analyze_document(&self, content: &str) -> Vec<PatternMatch> {
        content
            .lines()
            .enumerate()
            .flat_map(|(line_num, line)| self.matcher.match_line(line, line_num))
            .collect()
    }
}
