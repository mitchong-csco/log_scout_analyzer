//! Extraction policy configuration
//!
//! Configurable rules for which file types to extract from archives.
//! Loaded from `extraction_policy.yaml` or uses sensible defaults.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::Path;

/// Statistics about skipped files during extraction
#[derive(Debug, Default, Clone)]
pub struct ExtractionStats {
    pub total_files: usize,
    pub extracted_files: usize,
    pub skipped_executables: usize,
    pub skipped_images: usize,
    pub skipped_videos: usize,
    pub skipped_too_large: usize,
    pub skipped_unwanted: HashMap<String, usize>, // extension -> count
}

impl ExtractionStats {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_skip(&mut self, decision: &ExtractionDecision, ext: String) {
        match decision {
            ExtractionDecision::SkipExecutable => self.skipped_executables += 1,
            ExtractionDecision::SkipImage => self.skipped_images += 1,
            ExtractionDecision::SkipVideo => self.skipped_videos += 1,
            ExtractionDecision::SkipTooLarge(_) => self.skipped_too_large += 1,
            ExtractionDecision::SkipUnwantedType => {
                *self.skipped_unwanted.entry(ext.to_lowercase()).or_insert(0) += 1;
            }
            ExtractionDecision::Extract => {}
        }
    }

    pub fn record_extracted(&mut self) {
        self.extracted_files += 1;
    }

    /// Get suggestions for file types to add
    pub fn get_suggestions(&self, min_count: usize) -> Vec<(String, usize)> {
        let mut suggestions: Vec<_> = self
            .skipped_unwanted
            .iter()
            .filter(|(_, &count)| count >= min_count)
            .map(|(ext, &count)| (ext.clone(), count))
            .collect();

        suggestions.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by count descending
        suggestions
    }

    /// Generate summary message
    pub fn summary(&self) -> String {
        let mut msg = format!(
            "Extraction Stats: {} extracted, {} skipped total\n",
            self.extracted_files,
            self.total_files - self.extracted_files
        );

        if self.skipped_executables > 0 {
            msg.push_str(&format!(
                "  - {} executables (security)\n",
                self.skipped_executables
            ));
        }
        if self.skipped_images > 0 {
            msg.push_str(&format!("  - {} images\n", self.skipped_images));
        }
        if self.skipped_videos > 0 {
            msg.push_str(&format!("  - {} videos\n", self.skipped_videos));
        }
        if self.skipped_too_large > 0 {
            msg.push_str(&format!("  - {} too large\n", self.skipped_too_large));
        }

        if !self.skipped_unwanted.is_empty() {
            msg.push_str("\n  Skipped file types:\n");
            let mut types: Vec<_> = self.skipped_unwanted.iter().collect();
            types.sort_by(|a, b| b.1.cmp(a.1));
            for (ext, count) in types.iter().take(10) {
                msg.push_str(&format!("    .{}: {} files\n", ext, count));
            }
        }

        msg
    }
}

/// Extraction policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionPolicy {
    /// Maximum file size in MB
    #[serde(default = "default_max_size")]
    pub max_file_size_mb: u64,

    /// Extensions to always extract
    #[serde(default = "default_include_extensions")]
    pub include_extensions: Vec<String>,

    /// Extensions to always skip
    #[serde(default = "default_exclude_extensions")]
    pub exclude_extensions: Vec<String>,

    /// Conditional extraction rules
    #[serde(default)]
    pub conditional: ConditionalRules,

    /// Behavior options
    #[serde(default)]
    pub options: ExtractionOptions,

    /// Override rules per archive pattern
    #[serde(default)]
    pub overrides: Vec<OverrideRule>,
}

/// Conditional extraction rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionalRules {
    #[serde(default = "default_pdf_max")]
    pub pdf_max_size_mb: u64,

    #[serde(default = "default_sql_max")]
    pub sql_max_size_mb: u64,

    #[serde(default = "default_db_max")]
    pub db_max_size_mb: u64,
}

/// Extraction behavior options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractionOptions {
    #[serde(default = "default_true")]
    pub skip_images: bool,

    #[serde(default = "default_true")]
    pub skip_videos: bool,

    #[serde(default = "default_true")]
    pub skip_executables: bool,

    #[serde(default = "default_true")]
    pub log_skipped_files: bool,

    #[serde(default = "default_true")]
    pub warn_on_large_files: bool,
}

/// Override rule for specific archive patterns
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverrideRule {
    /// Pattern to match archive name (glob style)
    pub pattern: String,

    /// Additional extensions to include
    #[serde(default)]
    pub include_extensions: Vec<String>,

    /// Override max file size
    pub max_file_size_mb: Option<u64>,

    /// Override options
    pub options: Option<ExtractionOptions>,

    /// Override conditional rules
    pub conditional: Option<ConditionalRules>,
}

// Default values
fn default_max_size() -> u64 {
    500
}
fn default_pdf_max() -> u64 {
    10
}
fn default_sql_max() -> u64 {
    50
}
fn default_db_max() -> u64 {
    100
}
fn default_true() -> bool {
    true
}

fn default_include_extensions() -> Vec<String> {
    vec![
        // Log files
        "log".to_string(),
        "txt".to_string(),
        "trace".to_string(),
        "out".to_string(),
        "err".to_string(),
        // Metadata
        "xml".to_string(),
        "json".to_string(),
        // Configuration
        "yaml".to_string(),
        "yml".to_string(),
        "conf".to_string(),
        "cfg".to_string(),
        "config".to_string(),
        "properties".to_string(),
        "ini".to_string(),
        // Reports
        "csv".to_string(),
        "tsv".to_string(),
        "html".to_string(),
        "htm".to_string(),
        // Network captures
        "pcap".to_string(),
        "pcapng".to_string(),
        "cap".to_string(),
        // Archives
        "zip".to_string(),
        "tar".to_string(),
        "gz".to_string(),
        "tgz".to_string(),
        "bz2".to_string(),
    ]
}

fn default_exclude_extensions() -> Vec<String> {
    vec![
        // Executables
        "exe".to_string(),
        "dll".to_string(),
        "so".to_string(),
        "dylib".to_string(),
        "bat".to_string(),
        "cmd".to_string(),
        "sh".to_string(),
        "ps1".to_string(),
        // Images
        "png".to_string(),
        "jpg".to_string(),
        "jpeg".to_string(),
        "gif".to_string(),
        "bmp".to_string(),
        // Videos
        "mp4".to_string(),
        "avi".to_string(),
        "mov".to_string(),
        "wmv".to_string(),
    ]
}

impl Default for ConditionalRules {
    fn default() -> Self {
        Self {
            pdf_max_size_mb: default_pdf_max(),
            sql_max_size_mb: default_sql_max(),
            db_max_size_mb: default_db_max(),
        }
    }
}

impl Default for ExtractionOptions {
    fn default() -> Self {
        Self {
            skip_images: true,
            skip_videos: true,
            skip_executables: true,
            log_skipped_files: true,
            warn_on_large_files: true,
        }
    }
}

impl Default for ExtractionPolicy {
    fn default() -> Self {
        Self {
            max_file_size_mb: default_max_size(),
            include_extensions: default_include_extensions(),
            exclude_extensions: default_exclude_extensions(),
            conditional: ConditionalRules::default(),
            options: ExtractionOptions::default(),
            overrides: Vec::new(),
        }
    }
}

impl ExtractionPolicy {
    /// Load policy from YAML file
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let config: serde_yaml::Value = serde_yaml::from_str(&content)?;

        // Extract just the extraction section
        if let Some(extraction) = config.get("extraction") {
            let policy: Self = serde_yaml::from_value(extraction.clone())?;
            Ok(policy)
        } else {
            // If no extraction section, try to parse the whole file
            Ok(serde_yaml::from_str(&content)?)
        }
    }

    /// Load policy from default location or use defaults
    pub fn load_or_default() -> Self {
        // Try multiple locations
        let possible_paths = vec![
            "extraction_policy.yaml",
            "config/extraction_policy.yaml",
            ".config/extraction_policy.yaml",
        ];

        for path in possible_paths {
            if let Ok(policy) = Self::from_file(path) {
                tracing::info!("Loaded extraction policy from: {}", path);
                return policy;
            }
        }

        tracing::info!("No extraction policy file found, using defaults");
        Self::default()
    }

    /// Check if a file extension should be extracted
    pub fn should_extract_extension(&self, ext: &str) -> bool {
        let ext_lower = ext.to_lowercase();

        // Exclude list takes priority
        if self.exclude_extensions.contains(&ext_lower) {
            return false;
        }

        // Then check include list
        self.include_extensions.contains(&ext_lower)
    }

    /// Check if a file should be extracted based on size and extension
    pub fn should_extract_file(&self, path: &Path, size_bytes: u64) -> ExtractionDecision {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        // Check executables first (security)
        if self.options.skip_executables {
            if matches!(
                ext.as_str(),
                "exe" | "dll" | "so" | "dylib" | "bat" | "cmd" | "com" | "sh" | "ps1" | "scr"
            ) {
                return ExtractionDecision::SkipExecutable;
            }
        }

        // Check images
        if self.options.skip_images {
            if matches!(
                ext.as_str(),
                "png" | "jpg" | "jpeg" | "gif" | "bmp" | "ico" | "svg" | "tiff"
            ) {
                return ExtractionDecision::SkipImage;
            }
        }

        // Check videos
        if self.options.skip_videos {
            if matches!(
                ext.as_str(),
                "mp4" | "avi" | "mov" | "wmv" | "flv" | "mkv" | "webm"
            ) {
                return ExtractionDecision::SkipVideo;
            }
        }

        // Check size limits
        let max_bytes = self.max_file_size_mb * 1024 * 1024;
        if size_bytes > max_bytes {
            return ExtractionDecision::SkipTooLarge(size_bytes);
        }

        // Check conditional rules
        match ext.as_str() {
            "pdf" => {
                let pdf_max = self.conditional.pdf_max_size_mb * 1024 * 1024;
                if size_bytes > pdf_max {
                    return ExtractionDecision::SkipTooLarge(size_bytes);
                }
            }
            "sql" => {
                let sql_max = self.conditional.sql_max_size_mb * 1024 * 1024;
                if size_bytes > sql_max {
                    return ExtractionDecision::SkipTooLarge(size_bytes);
                }
            }
            "db" | "sqlite" | "mdb" => {
                let db_max = self.conditional.db_max_size_mb * 1024 * 1024;
                if size_bytes > db_max {
                    return ExtractionDecision::SkipTooLarge(size_bytes);
                }
            }
            _ => {}
        }

        // Check if extension is in include list
        if self.should_extract_extension(&ext) {
            ExtractionDecision::Extract
        } else {
            ExtractionDecision::SkipUnwantedType
        }
    }

    /// Get policy for specific archive (applies overrides)
    pub fn for_archive(&self, archive_name: &str) -> Self {
        let mut policy = self.clone();

        // Check overrides
        for override_rule in &self.overrides {
            if Self::matches_pattern(archive_name, &override_rule.pattern) {
                tracing::info!(
                    "Applying extraction policy override for pattern: {}",
                    override_rule.pattern
                );

                // Add additional extensions
                for ext in &override_rule.include_extensions {
                    if !policy.include_extensions.contains(ext) {
                        policy.include_extensions.push(ext.clone());
                    }
                }

                // Override max size
                if let Some(max_size) = override_rule.max_file_size_mb {
                    policy.max_file_size_mb = max_size;
                }

                // Override options
                if let Some(ref options) = override_rule.options {
                    policy.options = options.clone();
                }

                // Override conditional rules
                if let Some(ref conditional) = override_rule.conditional {
                    policy.conditional = conditional.clone();
                }
            }
        }

        policy
    }

    /// Simple glob-style pattern matching
    fn matches_pattern(text: &str, pattern: &str) -> bool {
        // Simple implementation - expand as needed
        if pattern.starts_with('*') && pattern.ends_with('*') {
            let middle = &pattern[1..pattern.len() - 1];
            text.contains(middle)
        } else if pattern.starts_with('*') {
            let suffix = &pattern[1..];
            text.ends_with(suffix)
        } else if pattern.ends_with('*') {
            let prefix = &pattern[..pattern.len() - 1];
            text.starts_with(prefix)
        } else {
            text == pattern
        }
    }

    /// Convert to HashSet for faster lookups
    pub fn include_set(&self) -> HashSet<String> {
        self.include_extensions.iter().cloned().collect()
    }

    /// Convert to HashSet for faster lookups
    pub fn exclude_set(&self) -> HashSet<String> {
        self.exclude_extensions.iter().cloned().collect()
    }

    /// Add a file extension to the include list and save to file
    pub fn add_extension(&mut self, ext: String) -> Result<(), Box<dyn std::error::Error>> {
        let ext_lower = ext.to_lowercase();

        // Remove from exclude list if present
        self.exclude_extensions.retain(|e| e != &ext_lower);

        // Add to include list if not already there
        if !self.include_extensions.contains(&ext_lower) {
            self.include_extensions.push(ext_lower.clone());
            tracing::info!("Added extension to policy: {}", ext_lower);

            // Save to file
            self.save_to_file("extraction_policy.yaml")?;
            tracing::info!("Updated extraction_policy.yaml");

            // Trigger auto-backup
            Self::trigger_auto_backup("extraction_policy_change");
        }

        Ok(())
    }

    /// Add multiple extensions at once
    pub fn add_extensions(
        &mut self,
        extensions: Vec<String>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut changed = false;

        for ext in extensions {
            let ext_lower = ext.to_lowercase();
            self.exclude_extensions.retain(|e| e != &ext_lower);
            if !self.include_extensions.contains(&ext_lower) {
                self.include_extensions.push(ext_lower);
                changed = true;
            }
        }

        if changed {
            self.save_to_file("extraction_policy.yaml")?;
            tracing::info!(
                "Added {} extensions to policy",
                self.include_extensions.len()
            );

            // Trigger auto-backup
            Self::trigger_auto_backup("extraction_policy_change");
        }

        Ok(())
    }

    /// Remove an extension from include list
    pub fn remove_extension(&mut self, ext: String) -> Result<(), Box<dyn std::error::Error>> {
        let ext_lower = ext.to_lowercase();

        self.include_extensions.retain(|e| e != &ext_lower);

        // Add to exclude list to prevent re-extraction
        if !self.exclude_extensions.contains(&ext_lower) {
            self.exclude_extensions.push(ext_lower.clone());
        }

        self.save_to_file("extraction_policy.yaml")?;
        tracing::info!("Removed extension from policy: {}", ext_lower);

        // Trigger auto-backup
        Self::trigger_auto_backup("extraction_policy_change");

        Ok(())
    }

    /// Trigger auto-backup (non-blocking)
    fn trigger_auto_backup(trigger: &str) {
        // Send notification that config changed
        // The AutoBackupManager will handle this asynchronously
        tracing::debug!("Config change trigger: {}", trigger);

        // TODO: Send event to AutoBackupManager
        // For now, just log - the periodic backup will catch it
    }

    /// Save current policy to YAML file
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<(), Box<dyn std::error::Error>> {
        // Build YAML manually for better formatting
        let mut output = String::new();
        output.push_str("# Extraction Policy Configuration\n");
        output.push_str("#\n");
        output.push_str("# Auto-updated by Log Scout Analyzer\n");
        output.push_str(&format!(
            "# Last modified: {}\n\n",
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
        ));
        output.push_str("version: 1\n\n");
        output.push_str("extraction:\n");
        output.push_str(&format!(
            "  max_file_size_mb: {}\n\n",
            self.max_file_size_mb
        ));

        // Include extensions
        output.push_str("  include_extensions:\n");
        for ext in &self.include_extensions {
            output.push_str(&format!("    - {}\n", ext));
        }
        output.push_str("\n");

        // Exclude extensions
        output.push_str("  exclude_extensions:\n");
        for ext in &self.exclude_extensions {
            output.push_str(&format!("    - {}\n", ext));
        }
        output.push_str("\n");

        // Conditional rules
        output.push_str("  conditional:\n");
        output.push_str(&format!(
            "    pdf_max_size_mb: {}\n",
            self.conditional.pdf_max_size_mb
        ));
        output.push_str(&format!(
            "    sql_max_size_mb: {}\n",
            self.conditional.sql_max_size_mb
        ));
        output.push_str(&format!(
            "    db_max_size_mb: {}\n\n",
            self.conditional.db_max_size_mb
        ));

        // Options
        output.push_str("  options:\n");
        output.push_str(&format!("    skip_images: {}\n", self.options.skip_images));
        output.push_str(&format!("    skip_videos: {}\n", self.options.skip_videos));
        output.push_str(&format!(
            "    skip_executables: {}\n",
            self.options.skip_executables
        ));
        output.push_str(&format!(
            "    log_skipped_files: {}\n",
            self.options.log_skipped_files
        ));
        output.push_str(&format!(
            "    warn_on_large_files: {}\n",
            self.options.warn_on_large_files
        ));

        // Write to file
        let mut file = fs::File::create(path)?;
        file.write_all(output.as_bytes())?;

        Ok(())
    }
}

/// Decision on whether to extract a file
#[derive(Debug, PartialEq)]
pub enum ExtractionDecision {
    Extract,
    SkipExecutable,
    SkipImage,
    SkipVideo,
    SkipTooLarge(u64),
    SkipUnwantedType,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_policy() {
        let policy = ExtractionPolicy::default();
        assert!(policy.should_extract_extension("log"));
        assert!(policy.should_extract_extension("xml"));
        assert!(!policy.should_extract_extension("exe"));
    }

    #[test]
    fn test_pattern_matching() {
        assert!(ExtractionPolicy::matches_pattern(
            "rtmt_export.zip",
            "rtmt_*"
        ));
        assert!(ExtractionPolicy::matches_pattern(
            "test_network_diag.zip",
            "*_network_*"
        ));
        assert!(!ExtractionPolicy::matches_pattern("other.zip", "rtmt_*"));
    }

    #[test]
    fn test_conditional_extraction() {
        let policy = ExtractionPolicy::default();
        let small_pdf = policy.should_extract_file(Path::new("report.pdf"), 5 * 1024 * 1024);
        assert_eq!(small_pdf, ExtractionDecision::Extract);

        let large_pdf = policy.should_extract_file(Path::new("report.pdf"), 20 * 1024 * 1024);
        assert!(matches!(large_pdf, ExtractionDecision::SkipTooLarge(_)));
    }

    #[test]
    fn test_executable_filtering() {
        let policy = ExtractionPolicy::default();
        let exe = policy.should_extract_file(Path::new("malware.exe"), 1024);
        assert_eq!(exe, ExtractionDecision::SkipExecutable);
    }
}
