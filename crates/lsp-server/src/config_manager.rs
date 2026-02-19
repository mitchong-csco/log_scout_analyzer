//! User configuration management
//!
//! Provides backup and restore of user settings to MongoDB

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// Complete user configuration snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserConfig {
    /// Unique identifier for this config
    pub id: String,

    /// User identifier (email, username, etc.)
    pub user_id: String,

    /// Configuration name/description
    pub name: String,

    /// When this config was created
    pub created_at: DateTime<Utc>,

    /// When this config was last modified
    pub updated_at: DateTime<Utc>,

    /// Version number for tracking changes
    pub version: u32,

    /// Extraction policy configuration
    pub extraction_policy: Option<ExtractedPolicy>,

    /// Pattern overrides
    pub pattern_overrides: Option<PatternOverrides>,

    /// UI preferences
    pub ui_preferences: Option<UiPreferences>,

    /// Custom tags
    pub tags: Vec<String>,

    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

/// Extraction policy snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedPolicy {
    pub max_file_size_mb: u64,
    pub include_extensions: Vec<String>,
    pub exclude_extensions: Vec<String>,
    pub skip_images: bool,
    pub skip_videos: bool,
    pub skip_executables: bool,
}

/// Pattern overrides snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternOverrides {
    pub overrides: HashMap<String, PatternOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternOverride {
    pub pattern_id: String,
    pub enabled: bool,
    pub severity: Option<String>,
    pub custom_message: Option<String>,
}

/// UI preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiPreferences {
    pub theme: Option<String>,
    pub default_view: Option<String>,
    pub auto_analyze: bool,
    pub show_notifications: bool,
    pub recent_files: Vec<String>,
}

impl Default for UserConfig {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: String::new(),
            name: "Default Configuration".to_string(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            extraction_policy: None,
            pattern_overrides: None,
            ui_preferences: None,
            tags: Vec::new(),
            metadata: HashMap::new(),
        }
    }
}

impl UserConfig {
    /// Create new configuration
    pub fn new(user_id: String, name: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            name,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            extraction_policy: None,
            pattern_overrides: None,
            ui_preferences: None,
            tags: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    /// Create from current system state
    pub fn from_current_state(user_id: String, name: String) -> Self {
        let mut config = Self::new(user_id, name);

        // Load current extraction policy
        if let Ok(policy) = crate::bundle::ExtractionPolicy::load_or_default().to_extracted() {
            config.extraction_policy = Some(policy);
        }

        config
    }

    /// Update modification timestamp and version
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
        self.version += 1;
    }
}

/// Configuration manager
pub struct ConfigManager {
    mongo_client: Option<mongodb::Client>,
    db_name: String,
}

impl ConfigManager {
    /// Create new config manager
    pub fn new(mongo_client: Option<mongodb::Client>) -> Self {
        Self {
            mongo_client,
            db_name: "logscout".to_string(),
        }
    }

    /// Save configuration to MongoDB
    pub async fn save_config(&self, config: &UserConfig) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(client) = &self.mongo_client {
            let db = client.database(&self.db_name);
            let collection = db.collection::<UserConfig>("user_configs");

            // Upsert (update if exists, insert if not)
            let filter = bson::doc! { "id": &config.id };
            let options = mongodb::options::ReplaceOptions::builder()
                .upsert(true)
                .build();

            collection.replace_one(filter, config, options).await?;

            tracing::info!(
                "Saved config to MongoDB: {} (v{})",
                config.name,
                config.version
            );
            Ok(())
        } else {
            Err("MongoDB not available".into())
        }
    }

    /// Load configuration from MongoDB
    pub async fn load_config(
        &self,
        config_id: &str,
    ) -> Result<UserConfig, Box<dyn std::error::Error>> {
        if let Some(client) = &self.mongo_client {
            let db = client.database(&self.db_name);
            let collection = db.collection::<UserConfig>("user_configs");

            let filter = bson::doc! { "id": config_id };

            if let Some(config) = collection.find_one(filter, None).await? {
                tracing::info!(
                    "Loaded config from MongoDB: {} (v{})",
                    config.name,
                    config.version
                );
                Ok(config)
            } else {
                Err(format!("Config not found: {}", config_id).into())
            }
        } else {
            Err("MongoDB not available".into())
        }
    }

    /// List all configurations for a user
    pub async fn list_configs(
        &self,
        user_id: &str,
    ) -> Result<Vec<UserConfig>, Box<dyn std::error::Error>> {
        if let Some(client) = &self.mongo_client {
            let db = client.database(&self.db_name);
            let collection = db.collection::<UserConfig>("user_configs");

            let filter = bson::doc! { "user_id": user_id };
            let mut cursor = collection.find(filter, None).await?;

            let mut configs = Vec::new();
            while cursor.advance().await? {
                configs.push(cursor.deserialize_current()?);
            }

            tracing::info!("Listed {} configs for user: {}", configs.len(), user_id);
            Ok(configs)
        } else {
            Err("MongoDB not available".into())
        }
    }

    /// Delete configuration
    pub async fn delete_config(&self, config_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(client) = &self.mongo_client {
            let db = client.database(&self.db_name);
            let collection = db.collection::<UserConfig>("user_configs");

            let filter = bson::doc! { "id": config_id };
            collection.delete_one(filter, None).await?;

            tracing::info!("Deleted config: {}", config_id);
            Ok(())
        } else {
            Err("MongoDB not available".into())
        }
    }

    /// Export configuration to JSON file
    pub fn export_to_file(
        &self,
        config: &UserConfig,
        path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string_pretty(config)?;
        std::fs::write(path, json)?;
        tracing::info!("Exported config to file: {}", path);
        Ok(())
    }

    /// Import configuration from JSON file
    pub fn import_from_file(&self, path: &str) -> Result<UserConfig, Box<dyn std::error::Error>> {
        let json = std::fs::read_to_string(path)?;
        let config: UserConfig = serde_json::from_str(&json)?;
        tracing::info!("Imported config from file: {}", path);
        Ok(config)
    }

    /// Apply configuration to current system
    pub fn apply_config(&self, config: &UserConfig) -> Result<(), Box<dyn std::error::Error>> {
        // Apply extraction policy
        if let Some(policy) = &config.extraction_policy {
            let full_policy = policy.to_full_policy();
            full_policy.save_to_file("extraction_policy.yaml")?;
            tracing::info!("Applied extraction policy from config");
        }

        // Apply pattern overrides
        // TODO: Implement pattern override application

        tracing::info!("Applied configuration: {}", config.name);
        Ok(())
    }
}

/// Extension methods for ExtractionPolicy
impl crate::bundle::ExtractionPolicy {
    /// Convert to extracted snapshot
    pub fn to_extracted(&self) -> Result<ExtractedPolicy, Box<dyn std::error::Error>> {
        Ok(ExtractedPolicy {
            max_file_size_mb: self.max_file_size_mb,
            include_extensions: self.include_extensions.clone(),
            exclude_extensions: self.exclude_extensions.clone(),
            skip_images: self.options.skip_images,
            skip_videos: self.options.skip_videos,
            skip_executables: self.options.skip_executables,
        })
    }
}

impl ExtractedPolicy {
    /// Convert to full extraction policy
    pub fn to_full_policy(&self) -> crate::bundle::ExtractionPolicy {
        let mut policy = crate::bundle::ExtractionPolicy::default();
        policy.max_file_size_mb = self.max_file_size_mb;
        policy.include_extensions = self.include_extensions.clone();
        policy.exclude_extensions = self.exclude_extensions.clone();
        policy.options.skip_images = self.skip_images;
        policy.options.skip_videos = self.skip_videos;
        policy.options.skip_executables = self.skip_executables;
        policy
    }
}

/// Auto-backup configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutoBackupConfig {
    /// Enable automatic backups
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Backup immediately on configuration changes
    #[serde(default = "default_true")]
    pub backup_on_change: bool,

    /// Backup interval in minutes (for periodic backups)
    #[serde(default = "default_backup_interval")]
    pub backup_interval_minutes: u64,

    /// Maximum number of backups to keep per user
    #[serde(default = "default_max_backups")]
    pub max_backups_per_user: usize,

    /// Events that trigger automatic backups
    #[serde(default = "default_triggers")]
    pub backup_triggers: Vec<String>,
}

fn default_true() -> bool {
    true
}
fn default_backup_interval() -> u64 {
    60
}
fn default_max_backups() -> usize {
    10
}
fn default_triggers() -> Vec<String> {
    vec![
        "extraction_policy_change".to_string(),
        "pattern_override_change".to_string(),
        "preferences_change".to_string(),
    ]
}

impl Default for AutoBackupConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            backup_on_change: true,
            backup_interval_minutes: 60,
            max_backups_per_user: 10,
            backup_triggers: default_triggers(),
        }
    }
}

/// Auto-backup manager
pub struct AutoBackupManager {
    config_manager: Arc<ConfigManager>,
    auto_config: AutoBackupConfig,
    last_backup: Arc<Mutex<Option<DateTime<Utc>>>>,
    user_id: String,
}

impl AutoBackupManager {
    /// Create new auto-backup manager
    pub fn new(
        config_manager: Arc<ConfigManager>,
        auto_config: AutoBackupConfig,
        user_id: String,
    ) -> Self {
        Self {
            config_manager,
            auto_config,
            last_backup: Arc::new(Mutex::new(None)),
            user_id,
        }
    }

    /// Start automatic backup scheduler
    pub fn start(&self) {
        if !self.auto_config.enabled {
            tracing::info!("Auto-backup disabled");
            return;
        }

        tracing::info!(
            "Starting auto-backup (interval: {} minutes)",
            self.auto_config.backup_interval_minutes
        );

        // Clone for background task
        let manager = self.config_manager.clone();
        let user_id = self.user_id.clone();
        let interval = self.auto_config.backup_interval_minutes;
        let last_backup = self.last_backup.clone();

        // Spawn background task
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(interval * 60)).await;

                tracing::debug!("Auto-backup: Periodic backup triggered");

                match Self::create_backup(&manager, &user_id, "Auto-backup (periodic)").await {
                    Ok(config_id) => {
                        tracing::info!("Auto-backup completed: {}", config_id);
                        *last_backup.lock().unwrap() = Some(Utc::now());
                    }
                    Err(e) => {
                        tracing::warn!("Auto-backup failed: {}", e);
                    }
                }
            }
        });
    }

    /// Trigger backup on configuration change
    pub async fn on_config_change(
        &self,
        trigger: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        if !self.auto_config.enabled || !self.auto_config.backup_on_change {
            return Err("Auto-backup on change is disabled".into());
        }

        if !self
            .auto_config
            .backup_triggers
            .contains(&trigger.to_string())
        {
            return Err(format!("Trigger '{}' not enabled", trigger).into());
        }

        tracing::info!("Auto-backup triggered by: {}", trigger);

        let config_id = Self::create_backup(
            &self.config_manager,
            &self.user_id,
            &format!("Auto-backup ({})", trigger),
        )
        .await?;

        *self.last_backup.lock().unwrap() = Some(Utc::now());

        Ok(config_id)
    }

    /// Create a backup
    async fn create_backup(
        manager: &ConfigManager,
        user_id: &str,
        name: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let config = UserConfig::from_current_state(user_id.to_string(), name.to_string());
        manager.save_config(&config).await?;
        Ok(config.id)
    }

    /// Clean up old backups (keep only max_backups_per_user)
    pub async fn cleanup_old_backups(&self) -> Result<usize, Box<dyn std::error::Error>> {
        let configs = self.config_manager.list_configs(&self.user_id).await?;

        if configs.len() <= self.auto_config.max_backups_per_user {
            return Ok(0);
        }

        // Sort by created_at, oldest first
        let mut sorted = configs;
        sorted.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        let to_delete = sorted.len() - self.auto_config.max_backups_per_user;
        let mut deleted = 0;

        for config in sorted.iter().take(to_delete) {
            match self.config_manager.delete_config(&config.id).await {
                Ok(_) => {
                    tracing::info!("Deleted old backup: {} ({})", config.name, config.id);
                    deleted += 1;
                }
                Err(e) => {
                    tracing::warn!("Failed to delete backup {}: {}", config.id, e);
                }
            }
        }

        Ok(deleted)
    }

    /// Get time since last backup
    pub fn time_since_last_backup(&self) -> Option<Duration> {
        let last = self.last_backup.lock().unwrap();
        last.as_ref().map(|dt| {
            let now = Utc::now();
            (now - *dt).to_std().unwrap_or(Duration::from_secs(0))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_config() {
        let config = UserConfig::new("user@example.com".to_string(), "My Config".to_string());
        assert_eq!(config.user_id, "user@example.com");
        assert_eq!(config.name, "My Config");
        assert_eq!(config.version, 1);
    }

    #[test]
    fn test_config_versioning() {
        let mut config = UserConfig::default();
        assert_eq!(config.version, 1);

        config.touch();
        assert_eq!(config.version, 2);

        config.touch();
        assert_eq!(config.version, 3);
    }

    #[test]
    fn test_export_import() {
        let config = UserConfig::new("user@example.com".to_string(), "Test".to_string());
        let manager = ConfigManager::new(None);

        // Export
        let path = "/tmp/test_config.json";
        manager.export_to_file(&config, path).unwrap();

        // Import
        let imported = manager.import_from_file(path).unwrap();
        assert_eq!(imported.id, config.id);
        assert_eq!(imported.name, config.name);

        // Cleanup
        std::fs::remove_file(path).ok();
    }
}
