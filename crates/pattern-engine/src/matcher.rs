//! Pattern matching logic

use crate::types::{Pattern, PatternError, PatternMatch};
use regex::Regex;
use std::collections::HashMap;

pub struct PatternMatcher {
    patterns: Vec<(Pattern, Regex)>,
}

impl PatternMatcher {
    pub fn new(patterns: Vec<Pattern>) -> Result<Self, PatternError> {
        let compiled = patterns
            .into_iter()
            .map(|p| {
                let regex =
                    Regex::new(&p.regex).map_err(|e| PatternError::InvalidRegex(e.to_string()))?;
                Ok((p, regex))
            })
            .collect::<Result<Vec<_>, PatternError>>()?;

        Ok(Self { patterns: compiled })
    }

    pub fn match_line(&self, line: &str, line_number: usize) -> Vec<PatternMatch> {
        let mut matches = Vec::new();

        for (pattern, regex) in &self.patterns {
            if let Some(captures) = regex.captures(line) {
                let matched_text = captures
                    .get(0)
                    .map(|m| m.as_str().to_string())
                    .unwrap_or_default();

                let mut field_values = HashMap::new();
                for name in regex.capture_names().flatten() {
                    if let Some(value) = captures.name(name) {
                        field_values.insert(name.to_string(), value.as_str().to_string());
                    }
                }

                matches.push(PatternMatch {
                    pattern: pattern.clone(),
                    matched_text,
                    line_number,
                    field_values,
                });
            }
        }

        matches
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Severity;

    #[test]
    fn test_basic_matching() {
        let pattern = Pattern {
            id: "test".to_string(),
            name: "Test Pattern".to_string(),
            regex: r"ERROR: (?P<message>.+)".to_string(),
            annotation: "Error occurred".to_string(),
            severity: Severity::Error,
            category: "test".to_string(),
        };

        let matcher = PatternMatcher::new(vec![pattern]).unwrap();
        let matches = matcher.match_line("ERROR: Something went wrong", 0);

        assert_eq!(matches.len(), 1);
        assert_eq!(
            matches[0].field_values.get("message").unwrap(),
            "Something went wrong"
        );
    }
}
