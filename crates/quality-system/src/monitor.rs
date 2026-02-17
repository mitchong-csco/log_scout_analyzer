//! Runtime quality monitoring

use std::collections::HashMap;

pub struct QualityMonitor {
    pattern_usage: HashMap<String, usize>,
}

impl QualityMonitor {
    pub fn new() -> Self {
        Self {
            pattern_usage: HashMap::new(),
        }
    }

    pub fn record_match(&mut self, pattern_id: &str) {
        *self
            .pattern_usage
            .entry(pattern_id.to_string())
            .or_insert(0) += 1;
    }

    pub fn get_usage(&self, pattern_id: &str) -> usize {
        self.pattern_usage.get(pattern_id).copied().unwrap_or(0)
    }

    pub fn get_all_usage(&self) -> &HashMap<String, usize> {
        &self.pattern_usage
    }
}

impl Default for QualityMonitor {
    fn default() -> Self {
        Self::new()
    }
}
