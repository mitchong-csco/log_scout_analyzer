//! Pattern loading logic

use anyhow::Result;
use pattern_engine::Pattern;
use std::path::Path;

pub struct PatternLoader;

impl PatternLoader {
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Vec<Pattern>> {
        let content = std::fs::read_to_string(path)?;
        let patterns: Vec<Pattern> = serde_yaml::from_str(&content)?;
        Ok(patterns)
    }

    pub fn load_from_directory<P: AsRef<Path>>(dir: P) -> Result<Vec<Pattern>> {
        let mut all_patterns = Vec::new();

        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("yaml")
                || path.extension().and_then(|s| s.to_str()) == Some("yml")
            {
                let patterns = Self::load_from_file(&path)?;
                all_patterns.extend(patterns);
            }
        }

        Ok(all_patterns)
    }
}
