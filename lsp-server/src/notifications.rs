//! Notification Manager for LSP Task Completions
//!
//! This module provides a configurable notification system that allows users to
//! enable/disable notifications for various LSP task completions.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_lsp::lsp_types::MessageType;
use tower_lsp::Client;

/// Notification categories that can be enabled/disabled
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationCategory {
    /// Bundle creation/import completions
    BundleOperations,

    /// Analysis completion notifications
    AnalysisComplete,

    /// Pattern refresh/reload notifications
    PatternUpdates,

    /// File extraction completions
    FileExtraction,

    /// Case management operations (if enabled)
    CaseOperations,

    /// TagScout sync notifications
    TagScoutSync,

    /// Archive extraction completions
    ArchiveExtraction,

    /// Configuration changes
    ConfigurationUpdates,

    /// Error notifications (always shown by default)
    Errors,
}

impl NotificationCategory {
    /// Returns the default enabled state for this category
    pub fn default_enabled(&self) -> bool {
        match self {
            NotificationCategory::Errors => true,
            NotificationCategory::BundleOperations => true,
            NotificationCategory::AnalysisComplete => true,
            NotificationCategory::PatternUpdates => false,
            NotificationCategory::FileExtraction => true,
            NotificationCategory::CaseOperations => true,
            NotificationCategory::TagScoutSync => false,
            NotificationCategory::ArchiveExtraction => true,
            NotificationCategory::ConfigurationUpdates => false,
        }
    }

    /// Returns a human-readable name for the category
    pub fn display_name(&self) -> &'static str {
        match self {
            NotificationCategory::BundleOperations => "Bundle Operations",
            NotificationCategory::AnalysisComplete => "Analysis Completions",
            NotificationCategory::PatternUpdates => "Pattern Updates",
            NotificationCategory::FileExtraction => "File Extraction",
            NotificationCategory::CaseOperations => "Case Operations",
            NotificationCategory::TagScoutSync => "TagScout Sync",
            NotificationCategory::ArchiveExtraction => "Archive Extraction",
            NotificationCategory::ConfigurationUpdates => "Configuration Changes",
            NotificationCategory::Errors => "Error Messages",
        }
    }

    /// Returns a description of what this category includes
    pub fn description(&self) -> &'static str {
        match self {
            NotificationCategory::BundleOperations => {
                "Notifications for bundle creation, import, and deletion"
            }
            NotificationCategory::AnalysisComplete => "Notifications when log analysis finishes",
            NotificationCategory::PatternUpdates => {
                "Notifications when patterns are refreshed or reloaded"
            }
            NotificationCategory::FileExtraction => {
                "Notifications when files are extracted from archives"
            }
            NotificationCategory::CaseOperations => {
                "Notifications for case creation, import, and management"
            }
            NotificationCategory::TagScoutSync => {
                "Notifications when TagScout patterns are synchronized"
            }
            NotificationCategory::ArchiveExtraction => {
                "Notifications when archives (ZIP, TAR, etc.) are extracted"
            }
            NotificationCategory::ConfigurationUpdates => {
                "Notifications when configuration is changed"
            }
            NotificationCategory::Errors => "Critical error messages (recommended to keep enabled)",
        }
    }
}

/// Notification preferences configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPreferences {
    /// Map of category to enabled state
    #[serde(default)]
    pub enabled_categories: HashMap<NotificationCategory, bool>,

    /// Global enable/disable switch
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,

    /// Show notifications in output channel even if pop-ups are disabled
    #[serde(default = "default_true")]
    pub log_all_notifications: bool,
}

fn default_true() -> bool {
    true
}

impl Default for NotificationPreferences {
    fn default() -> Self {
        let mut enabled_categories = HashMap::new();

        // Set all categories to their defaults
        for category in [
            NotificationCategory::BundleOperations,
            NotificationCategory::AnalysisComplete,
            NotificationCategory::PatternUpdates,
            NotificationCategory::FileExtraction,
            NotificationCategory::CaseOperations,
            NotificationCategory::TagScoutSync,
            NotificationCategory::ArchiveExtraction,
            NotificationCategory::ConfigurationUpdates,
            NotificationCategory::Errors,
        ] {
            enabled_categories.insert(category, category.default_enabled());
        }

        Self {
            enabled_categories,
            notifications_enabled: true,
            log_all_notifications: true,
        }
    }
}

/// Notification manager for controlling task completion notifications
pub struct NotificationManager {
    client: Client,
    preferences: Arc<RwLock<NotificationPreferences>>,
}

impl NotificationManager {
    /// Create a new notification manager
    pub fn new(client: Client) -> Self {
        Self {
            client,
            preferences: Arc::new(RwLock::new(NotificationPreferences::default())),
        }
    }

    /// Create with custom preferences
    pub fn with_preferences(client: Client, preferences: NotificationPreferences) -> Self {
        Self {
            client,
            preferences: Arc::new(RwLock::new(preferences)),
        }
    }

    /// Check if a notification category is enabled
    pub async fn is_enabled(&self, category: NotificationCategory) -> bool {
        let prefs = self.preferences.read().await;

        // Global switch
        if !prefs.notifications_enabled {
            // Always show errors even if globally disabled
            return category == NotificationCategory::Errors;
        }

        // Check category-specific setting
        prefs
            .enabled_categories
            .get(&category)
            .copied()
            .unwrap_or_else(|| category.default_enabled())
    }

    /// Send a notification if the category is enabled
    pub async fn notify(
        &self,
        category: NotificationCategory,
        message_type: MessageType,
        message: impl AsRef<str>,
    ) {
        let message = message.as_ref();
        let prefs = self.preferences.read().await;

        // Always log if log_all_notifications is enabled
        if prefs.log_all_notifications {
            self.client.log_message(message_type, message).await;
        }

        // Check if pop-up notification should be shown
        if self.is_enabled_sync(&prefs, category) {
            self.client.show_message(message_type, message).await;
        }
    }

    /// Send an info notification
    pub async fn notify_info(&self, category: NotificationCategory, message: impl AsRef<str>) {
        self.notify(category, MessageType::INFO, message).await;
    }

    /// Send a warning notification
    pub async fn notify_warning(&self, category: NotificationCategory, message: impl AsRef<str>) {
        self.notify(category, MessageType::WARNING, message).await;
    }

    /// Send an error notification (always shown)
    pub async fn notify_error(&self, message: impl AsRef<str>) {
        self.notify(NotificationCategory::Errors, MessageType::ERROR, message)
            .await;
    }

    /// Send a success notification with custom emoji
    pub async fn notify_success(&self, category: NotificationCategory, message: impl AsRef<str>) {
        let formatted = format!("✅ {}", message.as_ref());
        self.notify_info(category, formatted).await;
    }

    /// Enable a notification category
    pub async fn enable_category(&self, category: NotificationCategory) {
        let mut prefs = self.preferences.write().await;
        prefs.enabled_categories.insert(category, true);
    }

    /// Disable a notification category
    pub async fn disable_category(&self, category: NotificationCategory) {
        let mut prefs = self.preferences.write().await;
        prefs.enabled_categories.insert(category, false);
    }

    /// Toggle a notification category
    pub async fn toggle_category(&self, category: NotificationCategory) -> bool {
        let mut prefs = self.preferences.write().await;
        let current = prefs
            .enabled_categories
            .get(&category)
            .copied()
            .unwrap_or_else(|| category.default_enabled());
        let new_state = !current;
        prefs.enabled_categories.insert(category, new_state);
        new_state
    }

    /// Enable all notifications
    pub async fn enable_all(&self) {
        let mut prefs = self.preferences.write().await;
        prefs.notifications_enabled = true;
    }

    /// Disable all notifications (except errors)
    pub async fn disable_all(&self) {
        let mut prefs = self.preferences.write().await;
        prefs.notifications_enabled = false;
    }

    /// Get current preferences
    pub async fn get_preferences(&self) -> NotificationPreferences {
        self.preferences.read().await.clone()
    }

    /// Update preferences
    pub async fn set_preferences(&self, preferences: NotificationPreferences) {
        let mut prefs = self.preferences.write().await;
        *prefs = preferences;
    }

    /// Get status summary for all categories
    pub async fn get_status_summary(&self) -> String {
        let prefs = self.preferences.read().await;

        if !prefs.notifications_enabled {
            return "🔕 All notifications disabled (except errors)".to_string();
        }

        let mut summary = String::from("Notification Status:\n");

        for category in [
            NotificationCategory::BundleOperations,
            NotificationCategory::AnalysisComplete,
            NotificationCategory::PatternUpdates,
            NotificationCategory::FileExtraction,
            NotificationCategory::CaseOperations,
            NotificationCategory::TagScoutSync,
            NotificationCategory::ArchiveExtraction,
            NotificationCategory::ConfigurationUpdates,
            NotificationCategory::Errors,
        ] {
            let enabled = prefs
                .enabled_categories
                .get(&category)
                .copied()
                .unwrap_or_else(|| category.default_enabled());

            let icon = if enabled { "✅" } else { "❌" };
            summary.push_str(&format!("  {} {}\n", icon, category.display_name()));
        }

        summary
    }

    /// Synchronous helper for checking if enabled
    fn is_enabled_sync(
        &self,
        prefs: &NotificationPreferences,
        category: NotificationCategory,
    ) -> bool {
        // Global switch
        if !prefs.notifications_enabled {
            // Always show errors even if globally disabled
            return category == NotificationCategory::Errors;
        }

        // Check category-specific setting
        prefs
            .enabled_categories
            .get(&category)
            .copied()
            .unwrap_or_else(|| category.default_enabled())
    }
}

impl Clone for NotificationManager {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            preferences: Arc::clone(&self.preferences),
        }
    }
}

/// Task-specific notification helpers
impl NotificationManager {
    /// Notify bundle creation success
    pub async fn notify_bundle_created(&self, bundle_name: &str, bundle_id: &str) {
        self.notify_success(
            NotificationCategory::BundleOperations,
            format!(
                "Bundle '{}' created successfully ({})",
                bundle_name, bundle_id
            ),
        )
        .await;
    }

    /// Notify bundle import success
    pub async fn notify_bundle_imported(&self, bundle_name: &str, file_count: usize) {
        self.notify_success(
            NotificationCategory::BundleOperations,
            format!(
                "Bundle '{}' imported with {} files",
                bundle_name, file_count
            ),
        )
        .await;
    }

    /// Notify analysis completion
    pub async fn notify_analysis_complete(&self, file_name: &str, issue_count: usize) {
        let message = if issue_count == 0 {
            format!("Analysis complete: No issues found in '{}'", file_name)
        } else {
            format!(
                "Analysis complete: {} issue(s) found in '{}'",
                issue_count, file_name
            )
        };
        self.notify_info(NotificationCategory::AnalysisComplete, message)
            .await;
    }

    /// Notify bundle analysis completion
    pub async fn notify_bundle_analysis_complete(
        &self,
        bundle_name: &str,
        total_detections: usize,
    ) {
        self.notify_success(
            NotificationCategory::AnalysisComplete,
            format!(
                "Bundle '{}' analyzed: {} detection(s)",
                bundle_name, total_detections
            ),
        )
        .await;
    }

    /// Notify pattern refresh
    pub async fn notify_patterns_refreshed(&self, pattern_count: usize) {
        self.notify_info(
            NotificationCategory::PatternUpdates,
            format!("Patterns refreshed: {} pattern(s) loaded", pattern_count),
        )
        .await;
    }

    /// Notify TagScout sync
    pub async fn notify_tagscout_synced(&self, pattern_count: usize, from_cache: bool) {
        let source = if from_cache { "cache" } else { "MongoDB" };
        self.notify_info(
            NotificationCategory::TagScoutSync,
            format!(
                "TagScout synced: {} pattern(s) from {}",
                pattern_count, source
            ),
        )
        .await;
    }

    /// Notify archive extraction
    pub async fn notify_archive_extracted(&self, archive_name: &str, file_count: usize) {
        self.notify_success(
            NotificationCategory::ArchiveExtraction,
            format!("Extracted {} file(s) from '{}'", file_count, archive_name),
        )
        .await;
    }

    /// Notify case created
    pub async fn notify_case_created(&self, case_id: &str, bundle_count: usize) {
        self.notify_success(
            NotificationCategory::CaseOperations,
            format!("Case '{}' created with {} bundle(s)", case_id, bundle_count),
        )
        .await;
    }

    /// Notify configuration updated
    pub async fn notify_config_updated(&self, setting_name: &str) {
        self.notify_info(
            NotificationCategory::ConfigurationUpdates,
            format!("Configuration updated: {}", setting_name),
        )
        .await;
    }

    /// Notify file extraction policy updated
    pub async fn notify_extraction_policy_updated(&self, file_type: &str) {
        self.notify_info(
            NotificationCategory::FileExtraction,
            format!("Extraction policy updated: Added '{}'", file_type),
        )
        .await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_category_defaults() {
        assert!(NotificationCategory::Errors.default_enabled());
        assert!(NotificationCategory::BundleOperations.default_enabled());
        assert!(NotificationCategory::AnalysisComplete.default_enabled());
        assert!(!NotificationCategory::PatternUpdates.default_enabled());
        assert!(!NotificationCategory::TagScoutSync.default_enabled());
    }

    #[test]
    fn test_default_preferences() {
        let prefs = NotificationPreferences::default();
        assert!(prefs.notifications_enabled);
        assert!(prefs.log_all_notifications);

        // Check that defaults are applied
        assert!(prefs
            .enabled_categories
            .get(&NotificationCategory::Errors)
            .copied()
            .unwrap());
        assert!(prefs
            .enabled_categories
            .get(&NotificationCategory::BundleOperations)
            .copied()
            .unwrap());
        assert!(!prefs
            .enabled_categories
            .get(&NotificationCategory::PatternUpdates)
            .copied()
            .unwrap());
    }

    #[test]
    fn test_category_display_names() {
        assert_eq!(
            NotificationCategory::BundleOperations.display_name(),
            "Bundle Operations"
        );
        assert_eq!(
            NotificationCategory::Errors.display_name(),
            "Error Messages"
        );
    }

    #[test]
    fn test_serialization() {
        let prefs = NotificationPreferences::default();
        let json = serde_json::to_string(&prefs).unwrap();
        let deserialized: NotificationPreferences = serde_json::from_str(&json).unwrap();

        assert_eq!(
            prefs.notifications_enabled,
            deserialized.notifications_enabled
        );
        assert_eq!(
            prefs.log_all_notifications,
            deserialized.log_all_notifications
        );
    }
}
