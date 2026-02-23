# 🔔 LSP Notification Commands

**Feature**: Configurable Task Completion Notifications  
**Status**: Implemented  
**Module**: `lsp-server/src/notifications.rs`

---

## Overview

The LSP server now supports **configurable notifications** for task completions. Users can enable/disable specific categories of notifications based on their preferences.

---

## 📋 Notification Categories

| Category | Default | Description |
|----------|---------|-------------|
| **Bundle Operations** | ✅ Enabled | Bundle creation, import, deletion |
| **Analysis Complete** | ✅ Enabled | When log analysis finishes |
| **Pattern Updates** | ❌ Disabled | Pattern refresh/reload events |
| **File Extraction** | ✅ Enabled | Archive extraction completions |
| **Case Operations** | ✅ Enabled | Case management events |
| **TagScout Sync** | ❌ Disabled | TagScout synchronization |
| **Archive Extraction** | ✅ Enabled | ZIP/TAR extraction events |
| **Configuration Updates** | ❌ Disabled | Config changes |
| **Errors** | ✅ Always On | Critical errors (always shown) |

---

## 🎯 LSP Commands

### Get Notification Status

**Command**: `scout/notifications/status`

**Request**: (empty)

**Response**:
```json
{
  "notifications_enabled": true,
  "log_all_notifications": true,
  "enabled_categories": {
    "bundle_operations": true,
    "analysis_complete": true,
    "pattern_updates": false,
    "file_extraction": true,
    "case_operations": true,
    "tagscout_sync": false,
    "archive_extraction": true,
    "configuration_updates": false,
    "errors": true
  },
  "summary": "Notification Status:\n  ✅ Bundle Operations\n  ✅ Analysis Completions\n  ❌ Pattern Updates\n..."
}
```

---

### Enable Category

**Command**: `scout/notifications/enable`

**Request**:
```json
{
  "category": "pattern_updates"
}
```

**Response**:
```json
{
  "success": true,
  "category": "pattern_updates",
  "enabled": true,
  "message": "Pattern Updates notifications enabled"
}
```

---

### Disable Category

**Command**: `scout/notifications/disable`

**Request**:
```json
{
  "category": "tagscout_sync"
}
```

**Response**:
```json
{
  "success": true,
  "category": "tagscout_sync",
  "enabled": false,
  "message": "TagScout Sync notifications disabled"
}
```

---

### Toggle Category

**Command**: `scout/notifications/toggle`

**Request**:
```json
{
  "category": "analysis_complete"
}
```

**Response**:
```json
{
  "success": true,
  "category": "analysis_complete",
  "enabled": false,
  "message": "Analysis Completions notifications toggled OFF"
}
```

---

### Enable All

**Command**: `scout/notifications/enableAll`

**Request**: (empty)

**Response**:
```json
{
  "success": true,
  "message": "All notifications enabled"
}
```

---

### Disable All

**Command**: `scout/notifications/disableAll`

**Request**: (empty)

**Response**:
```json
{
  "success": true,
  "message": "All notifications disabled (except errors)"
}
```

---

### Get Preferences

**Command**: `scout/notifications/getPreferences`

**Request**: (empty)

**Response**:
```json
{
  "enabled_categories": {
    "bundle_operations": true,
    "analysis_complete": true,
    "pattern_updates": false,
    "file_extraction": true,
    "case_operations": true,
    "tagscout_sync": false,
    "archive_extraction": true,
    "configuration_updates": false,
    "errors": true
  },
  "notifications_enabled": true,
  "log_all_notifications": true
}
```

---

### Set Preferences

**Command**: `scout/notifications/setPreferences`

**Request**:
```json
{
  "enabled_categories": {
    "bundle_operations": true,
    "analysis_complete": false,
    "pattern_updates": true,
    "file_extraction": true,
    "case_operations": false,
    "tagscout_sync": true,
    "archive_extraction": true,
    "configuration_updates": false,
    "errors": true
  },
  "notifications_enabled": true,
  "log_all_notifications": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Notification preferences updated"
}
```

---

## 📝 Task-Specific Notifications

The `NotificationManager` provides helper methods for common task completions:

### Bundle Created
```rust
notifier.notify_bundle_created("Case 700440257", "bundle_abc123").await;
// Pop-up: "✅ Bundle 'Case 700440257' created successfully (bundle_abc123)"
```

### Bundle Imported
```rust
notifier.notify_bundle_imported("Case 700440257", 45).await;
// Pop-up: "✅ Bundle 'Case 700440257' imported with 45 files"
```

### Analysis Complete
```rust
notifier.notify_analysis_complete("cucm_sdi.log", 12).await;
// Pop-up: "Analysis complete: 12 issue(s) found in 'cucm_sdi.log'"
```

### Bundle Analysis Complete
```rust
notifier.notify_bundle_analysis_complete("Case 700440257", 87).await;
// Pop-up: "✅ Bundle 'Case 700440257' analyzed: 87 detection(s)"
```

### Patterns Refreshed
```rust
notifier.notify_patterns_refreshed(153).await;
// Pop-up: "Patterns refreshed: 153 pattern(s) loaded"
```

### TagScout Synced
```rust
notifier.notify_tagscout_synced(153, true).await;
// Pop-up: "TagScout synced: 153 pattern(s) from cache"
```

### Archive Extracted
```rust
notifier.notify_archive_extracted("700440257_qcsone.zip", 45).await;
// Pop-up: "✅ Extracted 45 file(s) from '700440257_qcsone.zip'"
```

### Case Created
```rust
notifier.notify_case_created("700440257", 3).await;
// Pop-up: "✅ Case '700440257' created with 3 bundle(s)"
```

### Configuration Updated
```rust
notifier.notify_config_updated("detection_threshold").await;
// Pop-up: "Configuration updated: detection_threshold"
```

### Extraction Policy Updated
```rust
notifier.notify_extraction_policy_updated(".sql").await;
// Pop-up: "Extraction policy updated: Added '.sql'"
```

### Error (Always Shown)
```rust
notifier.notify_error("Failed to load bundle: Database connection lost").await;
// Pop-up: "❌ Failed to load bundle: Database connection lost"
```

---

## 🎨 VS Code Extension Integration

### Add Commands to package.json

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScoutAnalyzer.notifications.toggle",
        "title": "Scout: Toggle Notifications",
        "category": "Scout Notifications"
      },
      {
        "command": "logScoutAnalyzer.notifications.enableAll",
        "title": "Scout: Enable All Notifications",
        "category": "Scout Notifications"
      },
      {
        "command": "logScoutAnalyzer.notifications.disableAll",
        "title": "Scout: Disable All Notifications",
        "category": "Scout Notifications"
      },
      {
        "command": "logScoutAnalyzer.notifications.configure",
        "title": "Scout: Configure Notifications",
        "category": "Scout Notifications"
      }
    ]
  }
}
```

### Implement in extension.ts

```typescript
// Toggle notifications command
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.notifications.toggle', async () => {
    const categories = [
      'bundle_operations',
      'analysis_complete',
      'pattern_updates',
      'file_extraction',
      'case_operations',
      'tagscout_sync',
      'archive_extraction',
      'configuration_updates',
    ];

    const selected = await vscode.window.showQuickPick(categories, {
      placeHolder: 'Select notification category to toggle',
    });

    if (selected) {
      const result = await client.sendRequest('scout/notifications/toggle', {
        category: selected,
      });
      
      vscode.window.showInformationMessage(result.message);
    }
  })
);

// Enable all notifications
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.notifications.enableAll', async () => {
    await client.sendRequest('scout/notifications/enableAll');
    vscode.window.showInformationMessage('✅ All notifications enabled');
  })
);

// Disable all notifications
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.notifications.disableAll', async () => {
    await client.sendRequest('scout/notifications/disableAll');
    vscode.window.showInformationMessage('🔕 All notifications disabled (except errors)');
  })
);

// Configure notifications (interactive UI)
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.notifications.configure', async () => {
    const status = await client.sendRequest('scout/notifications/status');
    
    const items = Object.entries(status.enabled_categories).map(([category, enabled]) => ({
      label: `${enabled ? '✅' : '❌'} ${category.replace(/_/g, ' ')}`,
      description: enabled ? 'Enabled' : 'Disabled',
      category,
      enabled,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select notification to toggle',
      canPickMany: false,
    });

    if (selected) {
      const result = await client.sendRequest('scout/notifications/toggle', {
        category: selected.category,
      });
      
      vscode.window.showInformationMessage(result.message);
      
      // Refresh and show again
      vscode.commands.executeCommand('logScoutAnalyzer.notifications.configure');
    }
  })
);
```

---

## 💾 Configuration Persistence

Notification preferences can be saved to a configuration file:

### notifications.yaml

```yaml
# Notification Preferences
notifications_enabled: true
log_all_notifications: true

enabled_categories:
  bundle_operations: true
  analysis_complete: true
  pattern_updates: false
  file_extraction: true
  case_operations: true
  tagscout_sync: false
  archive_extraction: true
  configuration_updates: false
  errors: true
```

### Load at Server Initialization

```rust
use lsp_server::notifications::{NotificationManager, NotificationPreferences};

// Load preferences from file
let prefs: NotificationPreferences = if let Ok(content) = fs::read_to_string("notifications.yaml") {
    serde_yaml::from_str(&content).unwrap_or_default()
} else {
    NotificationPreferences::default()
};

// Create notification manager with preferences
let notifier = NotificationManager::with_preferences(client.clone(), prefs);
```

---

## 🧪 Testing

### Unit Tests Included

- ✅ Category default states
- ✅ Preference serialization/deserialization
- ✅ Display names and descriptions
- ✅ Default configuration

### Manual Testing

1. **Enable/Disable Category**:
   ```
   Ctrl+Shift+P → Scout: Configure Notifications
   → Select category → Toggle
   → Verify pop-up shows/doesn't show
   ```

2. **Disable All**:
   ```
   Ctrl+Shift+P → Scout: Disable All Notifications
   → Import bundle → No pop-up (only logs)
   → Trigger error → Pop-up still shows (errors always on)
   ```

3. **Enable All**:
   ```
   Ctrl+Shift+P → Scout: Enable All Notifications
   → Import bundle → Pop-up shows
   → Analyze file → Pop-up shows
   ```

---

## 📊 Implementation Status

- ✅ **Core Module** (`notifications.rs`) - Complete
- ✅ **Notification Categories** - 9 categories defined
- ✅ **Task Helpers** - 10+ helper methods
- ✅ **Configuration** - YAML serialization support
- ✅ **Unit Tests** - 5 tests passing
- ⏳ **LSP Commands** - Need to add to server.rs
- ⏳ **VS Code Integration** - Need to add commands
- ⏳ **Documentation** - This file

---

## 🚀 Next Steps

1. **Add LSP Command Handlers** (server.rs):
   - `scout/notifications/status`
   - `scout/notifications/enable`
   - `scout/notifications/disable`
   - `scout/notifications/toggle`
   - `scout/notifications/enableAll`
   - `scout/notifications/disableAll`

2. **Integrate NotificationManager into LogScoutServer**:
   - Add as field
   - Replace existing `client.show_message()` calls
   - Use task-specific helper methods

3. **Add VS Code Commands** (extension.ts):
   - Configure notifications UI
   - Toggle category commands
   - Enable/disable all commands

4. **Update PROJECT_STATUS.md**:
   - Document new feature
   - Add to completed features list

---

## 📚 References

- **Module**: `lsp-server/src/notifications.rs`
- **Tower LSP Client**: [docs.rs/tower-lsp](https://docs.rs/tower-lsp/0.20.0/tower_lsp/struct.Client.html)
- **LSP Specification**: [microsoft.github.io/language-server-protocol](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)

---

**Version**: 1.0  
**Created**: February 22, 2024  
**Status**: Ready for integration