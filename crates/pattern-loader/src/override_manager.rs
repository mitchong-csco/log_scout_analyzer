//! Pattern override management

use pattern_engine::Pattern;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternOverride {
    pub id: String,
    pub enabled: Option<bool>,
    pub severity_override: Option<String>,
    pub annotation_override: Option<String>,
}

pub struct PatternOverrideManager {
    overrides: HashMap<String, PatternOverride>,
}

impl PatternOverrideManager {
    pub fn new() -> Self {
        Self {
            overrides: HashMap::new(),
        }
    }

    pub fn add_override(&mut self, override_data: PatternOverride) {
        self.overrides
            .insert(override_data.id.clone(), override_data);
    }

    pub fn apply_overrides(&self, patterns: Vec<Pattern>) -> Vec<Pattern> {
        patterns
            .into_iter()
            .filter_map(|mut pattern| {
                if let Some(override_data) = self.overrides.get(&pattern.id) {
                    if let Some(false) = override_data.enabled {
                        return None; // Pattern is disabled
                    }
                    if let Some(ref annotation) = override_data.annotation_override {
                        pattern.annotation = annotation.clone();
                    }
                }
                Some(pattern)
            })
            .collect()
    }
}

impl Default for PatternOverrideManager {
    fn default() -> Self {
        Self::new()
    }
}
