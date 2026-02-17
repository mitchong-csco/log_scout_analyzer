# Pattern Override Integration Design

## Overview

This document describes how to integrate the existing Pattern Override system with the LSP server to allow local pattern fixes that persist across TagScout syncs.

---

## Problem Statement

**Current Situation:**
- TagScout MongoDB contains patterns with some issues (e.g., regex bugs, incorrect extractors)
- Users have read-only access to MongoDB
- Fixing patterns in MongoDB would affect all users globally
- No mechanism to override patterns locally

**Requirements:**
1. Allow local pattern overrides/fixes
2. Persist overrides across TagScout syncs
3. Override patterns take precedence over MongoDB patterns
4. Don't sync overrides back to MongoDB (read-only)
5. Easy UI for creating/managing overrides

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │   patternOverrideManager.ts (EXISTS)               │    │
│  │                                                      │    │
│  │   • createOverride(sourceId, updates)               │    │
│  │   • createCustomPattern(pattern)                    │    │
│  │   • getOverride(sourceId)                           │    │
│  │   • hasOverride(sourceId)                           │    │
│  │   • save/load from pattern-overrides.json           │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────┐    │
│  │   .log-scout/pattern-overrides.json                 │    │
│  │                                                      │    │
│  │   {                                                  │    │
│  │     "version": "1.0",                                │    │
│  │     "overrides": {                                   │    │
│  │       "override-5efde66677e36d0001e62450": {        │    │
│  │         "sourceId": "5efde66677e36d0001e62450",     │    │
│  │         "notes": "Fixed CODE extractor regex",       │    │
│  │         "parameterExtractors": {                     │    │
│  │           "CODE": "HTTP response code ([12345]...)" │    │
│  │         }                                            │    │
│  │       }                                              │    │
│  │     },                                               │    │
│  │     "custom": { ... }                                │    │
│  │   }                                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    LSP Server (Rust)                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │   pattern_loader.rs (NEW)                          │    │
│  │                                                      │    │
│  │   fn load_patterns_with_overrides() {               │    │
│  │     // 1. Load from MongoDB                         │    │
│  │     let mongodb_patterns = load_from_tagscout();    │    │
│  │                                                      │    │
│  │     // 2. Load overrides from JSON                  │    │
│  │     let overrides = load_override_file(             │    │
│  │       ".log-scout/pattern-overrides.json"           │    │
│  │     );                                               │    │
│  │                                                      │    │
│  │     // 3. Merge: overrides take precedence          │    │
│  │     for pattern in mongodb_patterns {               │    │
│  │       if let Some(override) = overrides.get(id) {   │    │
│  │         pattern.merge(override);                    │    │
│  │       }                                              │    │
│  │     }                                                │    │
│  │                                                      │    │
│  │     // 4. Add custom patterns                       │    │
│  │     patterns.extend(overrides.custom);              │    │
│  │   }                                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern Override File Format

### Storage Location

**Workspace-specific:**
```
<workspace>/.log-scout/pattern-overrides.json
```

**Global fallback:**
```
~/.vscode/extensions/log-scout-analyzer/pattern-overrides.json
```

### JSON Structure

```json
{
  "version": "1.0",
  "lastSync": "2026-02-17T02:45:00.000Z",
  "overrides": {
    "override-5efde66677e36d0001e62450": {
      "id": "override-5efde66677e36d0001e62450",
      "sourceType": "mongodb",
      "sourceId": "5efde66677e36d0001e62450",
      "name": "Voicemail - HTTP Error Response (FIXED)",
      "notes": "Fixed CODE extractor to include 2xx codes",
      "reason": "Original regex only matched 3xx/4xx/5xx, missing 2xx success codes",
      "createdAt": "2026-02-17T02:45:00.000Z",
      "modifiedAt": "2026-02-17T02:50:00.000Z",
      "modified": true,
      "enabled": true,
      
      "overrides": {
        "regex": null,
        "severity": null,
        "parameterExtractors": {
          "CODE": {
            "original": "HTTP response code ([0345][0-9]?[0-9]?)",
            "override": "HTTP response code ([12345][0-9]{2})",
            "reason": "Include all HTTP status codes (1xx-5xx)"
          }
        },
        "conditionTriggers": [
          {
            "field": "CODE",
            "operator": "regex",
            "value": "^[45]",
            "severity": "error",
            "description": "4xx and 5xx are errors"
          },
          {
            "field": "CODE",
            "operator": "regex",
            "value": "^[123]",
            "severity": "info",
            "description": "1xx, 2xx, 3xx are informational"
          }
        ]
      }
    }
  },
  
  "custom": {
    "custom-1234567890-abc123": {
      "id": "custom-1234567890-abc123",
      "sourceType": "custom",
      "name": "My Custom Pattern",
      "regex": "CUSTOM.*ERROR",
      "severity": "error",
      "category": ["Custom"],
      "enabled": true,
      "createdAt": "2026-02-17T03:00:00.000Z"
    }
  }
}
```

---

## Pattern Merge Logic

### Override Precedence

When merging patterns, the following rules apply:

1. **MongoDB pattern** = Base pattern
2. **Override file** = Changes to apply
3. **Result** = Merged pattern

### Merge Rules

```rust
fn merge_pattern(base: Pattern, override: PatternOverride) -> Pattern {
    let mut merged = base.clone();
    
    // Only override fields that are explicitly set in the override
    if let Some(regex) = override.overrides.regex {
        merged.regex = regex;
    }
    
    if let Some(severity) = override.overrides.severity {
        merged.severity = severity;
    }
    
    // Parameter extractors: merge individual extractors
    for (name, extractor_override) in override.overrides.parameter_extractors {
        merged.parameter_extractors.insert(name, extractor_override.override_value);
    }
    
    // Condition triggers: completely replace if provided
    if let Some(triggers) = override.overrides.condition_triggers {
        merged.condition_triggers = triggers;
    }
    
    // Add metadata
    merged.is_override = true;
    merged.override_notes = override.notes;
    merged.override_reason = override.reason;
    
    merged
}
```

### Example: HTTP Error Pattern Fix

**MongoDB Pattern (Original):**
```rust
Pattern {
    id: "5efde66677e36d0001e62450",
    name: "Voicemail - HTTP Error Response",
    regex: "HTTP response c",
    severity: "error",
    parameter_extractors: {
        "CODE": "HTTP response code ([0345][0-9]?[0-9]?)",  // BUG: Missing 2xx!
        "ID": "for request (#\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?) to",
        "URL": "for request #\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d? to (.*)"
    }
}
```

**Override (Fix):**
```json
{
  "sourceId": "5efde66677e36d0001e62450",
  "notes": "Fixed CODE extractor to include all HTTP codes",
  "overrides": {
    "parameterExtractors": {
      "CODE": {
        "override": "HTTP response code ([12345][0-9]{2})"
      }
    },
    "conditionTriggers": [
      {
        "field": "CODE",
        "operator": "regex",
        "value": "^[45]",
        "severity": "error"
      },
      {
        "field": "CODE",
        "operator": "regex",
        "value": "^[123]",
        "severity": "info"
      }
    ]
  }
}
```

**Merged Pattern (Result):**
```rust
Pattern {
    id: "5efde66677e36d0001e62450",
    name: "Voicemail - HTTP Error Response",
    regex: "HTTP response c",
    severity: "error",  // Will be overridden by conditionTriggers
    parameter_extractors: {
        "CODE": "HTTP response code ([12345][0-9]{2})",  // FIXED!
        "ID": "for request (#\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?) to",
        "URL": "for request #\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d?\\d? to (.*)"
    },
    condition_triggers: [
        { field: "CODE", operator: "regex", value: "^[45]", severity: "error" },
        { field: "CODE", operator: "regex", value: "^[123]", severity: "info" }
    ],
    is_override: true,
    override_notes: "Fixed CODE extractor to include all HTTP codes"
}
```

---

## Implementation Plan

### Phase 1: LSP Server Integration (Priority 1)

**File:** `lsp-server/src/pattern_loader.rs` (NEW)

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Pattern override from JSON file
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PatternOverride {
    pub id: String,
    pub source_type: String,
    pub source_id: Option<String>,
    pub name: Option<String>,
    pub notes: Option<String>,
    pub reason: Option<String>,
    pub enabled: Option<bool>,
    pub overrides: OverrideValues,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OverrideValues {
    pub regex: Option<String>,
    pub severity: Option<String>,
    #[serde(rename = "parameterExtractors")]
    pub parameter_extractors: Option<HashMap<String, ExtractorOverride>>,
    #[serde(rename = "conditionTriggers")]
    pub condition_triggers: Option<Vec<ConditionTrigger>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExtractorOverride {
    pub original: Option<String>,
    #[serde(rename = "override")]
    pub override_value: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ConditionTrigger {
    pub field: String,
    pub operator: String,
    pub value: String,
    pub severity: String,
    pub description: Option<String>,
}

/// Override file structure
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OverrideFile {
    pub version: String,
    #[serde(rename = "lastSync")]
    pub last_sync: Option<String>,
    pub overrides: HashMap<String, PatternOverride>,
    pub custom: HashMap<String, PatternOverride>,
}

/// Load pattern overrides from file
pub fn load_overrides(workspace_path: Option<&str>) -> Result<OverrideFile, Box<dyn std::error::Error>> {
    let override_path = get_override_file_path(workspace_path)?;
    
    if !override_path.exists() {
        tracing::info!("No pattern override file found at {:?}", override_path);
        return Ok(OverrideFile {
            version: "1.0".to_string(),
            last_sync: None,
            overrides: HashMap::new(),
            custom: HashMap::new(),
        });
    }
    
    let content = fs::read_to_string(&override_path)?;
    let override_file: OverrideFile = serde_json::from_str(&content)?;
    
    tracing::info!(
        "Loaded {} pattern overrides and {} custom patterns from {:?}",
        override_file.overrides.len(),
        override_file.custom.len(),
        override_path
    );
    
    Ok(override_file)
}

/// Get the path to the override file
fn get_override_file_path(workspace_path: Option<&str>) -> Result<PathBuf, Box<dyn std::error::Error>> {
    if let Some(workspace) = workspace_path {
        let mut path = PathBuf::from(workspace);
        path.push(".log-scout");
        path.push("pattern-overrides.json");
        Ok(path)
    } else {
        // Fallback to home directory
        let home = dirs::home_dir().ok_or("Could not determine home directory")?;
        let mut path = home;
        path.push(".log-scout-analyzer");
        path.push("pattern-overrides.json");
        Ok(path)
    }
}

/// Merge override into base pattern
pub fn merge_pattern(
    base: &mut crate::pattern_engine::Pattern,
    override_data: &PatternOverride
) {
    tracing::info!("Applying override to pattern: {}", base.id);
    
    // Override regex if provided
    if let Some(ref regex) = override_data.overrides.regex {
        tracing::info!("  Overriding regex");
        base.regex_str = regex.clone();
        // Note: Regex will be recompiled in pattern engine
    }
    
    // Override severity if provided
    if let Some(ref severity) = override_data.overrides.severity {
        tracing::info!("  Overriding severity: {}", severity);
        base.severity = severity.clone();
    }
    
    // Override parameter extractors
    if let Some(ref extractors) = override_data.overrides.parameter_extractors {
        for (name, extractor) in extractors {
            tracing::info!("  Overriding parameter extractor '{}': {}", name, extractor.override_value);
            // This will be applied in CompiledPattern when it's compiled
            base.parameter_extractors.insert(name.clone(), extractor.override_value.clone());
        }
    }
    
    // Override condition triggers
    if let Some(ref triggers) = override_data.overrides.condition_triggers {
        tracing::info!("  Overriding {} condition triggers", triggers.len());
        // Convert to internal format
        // This would need to be integrated with existing severity trigger system
    }
    
    // Add metadata
    base.is_override = true;
    base.override_notes = override_data.notes.clone();
    
    tracing::info!("  Override applied successfully");
}
```

**Integrate into main.rs:**

```rust
// In src/main.rs

async fn load_patterns_with_overrides(
    workspace_path: Option<&str>
) -> Result<Vec<Pattern>, Box<dyn std::error::Error>> {
    // 1. Load patterns from MongoDB/TagScout
    let mut patterns = load_patterns_from_tagscout().await?;
    
    // 2. Load overrides from file
    let overrides = pattern_loader::load_overrides(workspace_path)?;
    
    // 3. Apply overrides to matching patterns
    for pattern in patterns.iter_mut() {
        let override_id = format!("override-{}", pattern.id);
        if let Some(override_data) = overrides.overrides.get(&override_id) {
            if override_data.enabled.unwrap_or(true) {
                pattern_loader::merge_pattern(pattern, override_data);
            }
        }
    }
    
    // 4. Add custom patterns
    for (_, custom) in overrides.custom {
        if custom.enabled.unwrap_or(true) {
            patterns.push(convert_custom_to_pattern(custom));
        }
    }
    
    Ok(patterns)
}
```

---

### Phase 2: VSCode UI Integration (Priority 2)

**Add Commands:**

```typescript
// In extension.ts

vscode.commands.registerCommand('logScoutAnalyzer.overridePattern', async (patternId: string) => {
    // Show override editor UI
    const override = await showPatternOverrideEditor(patternId);
    if (override) {
        await patternOverrideManager.createOverride(patternId, 'mongodb', override);
        await restartLspServer(); // Reload patterns with overrides
    }
});

vscode.commands.registerCommand('logScoutAnalyzer.viewOverrides', async () => {
    // Show list of all overrides
    const overrides = patternOverrideManager.getAllPatterns();
    await showOverridesList(overrides);
});

vscode.commands.registerCommand('logScoutAnalyzer.resetOverride', async (patternId: string) => {
    const confirm = await vscode.window.showWarningMessage(
        'Reset pattern override? This will revert to the original pattern.',
        'Reset', 'Cancel'
    );
    if (confirm === 'Reset') {
        patternOverrideManager.resetOverride(patternId);
        await restartLspServer();
    }
});
```

**Add Context Menu:**

```json
// In package.json contributions.menus

"view/item/context": [
    {
        "command": "logScoutAnalyzer.overridePattern",
        "when": "view == scoutResults && viewItem == result",
        "group": "2_override@1"
    },
    {
        "command": "logScoutAnalyzer.viewPatternSource",
        "when": "view == scoutResults && viewItem == result",
        "group": "2_override@2"
    }
]
```

---

### Phase 3: Override Editor UI (Priority 3)

**Webview Panel:** `patternOverrideEditor.ts`

```typescript
export class PatternOverrideEditor {
    public static show(context: vscode.ExtensionContext, patternId: string, pattern: any) {
        const panel = vscode.window.createWebviewPanel(
            'patternOverrideEditor',
            `Override Pattern: ${pattern.name}`,
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = this.getHtmlContent(pattern);
        
        panel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'save':
                    await this.saveOverride(patternId, message.override);
                    panel.dispose();
                    break;
                case 'test':
                    await this.testOverride(message.override);
                    break;
            }
        });
    }
    
    private static getHtmlContent(pattern: any): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        .override-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .extractor {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .extractor label {
            width: 150px;
            font-weight: bold;
        }
        .extractor input {
            flex: 1;
            font-family: monospace;
        }
        .original {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin-left: 150px;
        }
        .reason {
            margin-left: 150px;
            margin-top: 5px;
        }
        .reason input {
            width: 100%;
        }
    </style>
</head>
<body>
    <h1>Override Pattern: ${pattern.name}</h1>
    <p><strong>Pattern ID:</strong> ${pattern.id}</p>
    
    <div class="override-section">
        <h2>Parameter Extractors</h2>
        ${Object.entries(pattern.parameterExtractors || {}).map(([name, regex]) => `
            <div class="extractor">
                <label>${name}:</label>
                <input type="text" id="extractor-${name}" value="${regex}" />
            </div>
            <div class="original">Original: ${regex}</div>
            <div class="reason">
                <input type="text" placeholder="Reason for override..." id="reason-${name}" />
            </div>
        `).join('')}
    </div>
    
    <div class="override-section">
        <h2>Notes</h2>
        <textarea id="notes" rows="4" style="width: 100%;" 
                  placeholder="Why are you overriding this pattern?"></textarea>
    </div>
    
    <button onclick="saveOverride()">Save Override</button>
    <button onclick="testOverride()">Test Override</button>
    <button onclick="cancel()">Cancel</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function saveOverride() {
            const override = {
                parameterExtractors: {},
                notes: document.getElementById('notes').value
            };
            
            ${Object.keys(pattern.parameterExtractors || {}).map(name => `
                override.parameterExtractors['${name}'] = {
                    override: document.getElementById('extractor-${name}').value,
                    reason: document.getElementById('reason-${name}').value
                };
            `).join('')}
            
            vscode.postMessage({ command: 'save', override });
        }
        
        function testOverride() {
            // Test regex before saving
            vscode.postMessage({ command: 'test', override: /* ... */ });
        }
        
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }
    </script>
</body>
</html>
        `;
    }
}
```

---

## User Workflows

### Workflow 1: Fix Broken Parameter Extractor

**Scenario:** User notices `{{ CODE }}` not being extracted

1. User right-clicks on diagnostic in Results view
2. Selects **"Override Pattern"**
3. Override editor opens showing current extractors
4. User modifies `CODE` extractor regex:
   - Original: `([0345][0-9]?[0-9]?)`
   - Override: `([12345][0-9]{2})`
5. User enters reason: "Include 2xx success codes"
6. User clicks **"Test Override"** (optional)
7. User clicks **"Save Override"**
8. LSP server reloads patterns
9. Pattern now extracts all HTTP codes correctly

### Workflow 2: View All Overrides

1. User opens Command Palette
2. Types "Scout: View Pattern Overrides"
3. Tree view shows:
   ```
   Pattern Overrides (2)
   ├─ Voicemail - HTTP Error Response (FIXED)
   │  └─ Modified: CODE extractor
   └─ Custom Pattern - My Debug Filter
   
   Custom Patterns (1)
   └─ My Custom Error Pattern
   ```
4. User can right-click to:
   - Edit override
   - Reset to original
   - Disable temporarily
   - Export/share override

### Workflow 3: Share Overrides with Team

1. User A fixes a pattern
2. User A runs **"Scout: Export Pattern Overrides"**
3. Saves to `team-pattern-fixes.json`
4. User A commits file to team repo
5. User B runs **"Scout: Import Pattern Overrides"**
6. Selects `team-pattern-fixes.json`
7. User B now has same fixes applied

---

## Testing Strategy

### Unit Tests

**Rust (LSP Server):**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_load_overrides() {
        let override_json = r#"
        {
            "version": "1.0",
            "overrides": {
                "override-test123": {
                    "sourceId": "test123",
                    "overrides": {
                        "parameterExtractors": {
                            "CODE": {
                                "override": "([12345][0-9]{2})"
                            }
                        }
                    }
                }
            },
            "custom": {}
        }
        "#;
        
        let override_file: OverrideFile = serde_json::from_str(override_json).unwrap();
        assert_eq!(override_file.overrides.len(), 1);
    }
    
    #[test]
    fn test_merge_pattern() {
        let mut base_pattern = Pattern {
            id: "test123".to_string(),
            parameter_extractors: HashMap::from([
                ("CODE".to_string(), "([0345][0-9]?[0-9]?)".to_string())
            ]),
            ..Default::default()
        };
        
        let override_data = PatternOverride {
            overrides: OverrideValues {
                parameter_extractors: Some(HashMap::from([
                    ("CODE".to_string(), ExtractorOverride {
                        override_value: "([12345][0-9]{2})".to_string(),
                        ..Default::default()
                    })
                ])),
                ..Default::default()
            },
            ..Default::default()
        };
        
        merge_pattern(&mut base_pattern, &override_data);
        
        assert_eq!(
            base_pattern.parameter_extractors.get("CODE"),
            Some(&"([12345][0-9]{2})".to_string())
        );
        assert!(base_pattern.is_override);
    }
}
```

### Integration Tests

1. **Test override file loading**
   - Create test override file
   - Load patterns
   - Verify overrides applied

2. **Test pattern merging**
   - Load MongoDB pattern
   - Apply override
   - Verify merged pattern behavior

3. **Test parameter extraction with override**
   - Use overridden extractor regex
   - Parse test log line
   - Verify correct extraction

### Manual Testing Checklist

- [ ] Create override for pattern with broken extractor
- [ ] Verify override persists after reload
- [ ] Verify override takes precedence over MongoDB
- [ ] Test with TagScout sync (override not overwritten)
- [ ] Disable override - verify reverts to original
- [ ] Export overrides to file
- [ ] Import overrides from file
- [ ] View override in pattern viewer
- [ ] Edit existing override
- [ ] Delete override

---

## Migration Path

### Existing Users

No migration needed - system is backward compatible:
- Users without overrides: patterns load from MongoDB as before
- Users with overrides: patterns merge automatically

### Rollout Plan

**Phase 1 (Week 1):**
- Implement LSP server override loading
- Basic merge logic
- Test with sample overrides

**Phase 2 (Week 2):**
- Add VSCode commands for override management
- Simple override editor
- Test end-to-end

**Phase 3 (Week 3):**
- Enhanced override editor UI
- Import/export functionality
- Documentation

**Phase 4 (Week 4):**
- User testing and feedback
- Bug fixes
- Release

---

## Performance Considerations

### Loading Performance

**Impact:** Minimal
- Override file is small (< 100KB typically)
- Loaded once at startup
- JSON parsing is fast

**Optimization:**
- Cache merged patterns
- Only reload on file change

### Memory Impact

**Impact:** Negligible
- Overrides stored in memory alongside patterns
- ~1-2KB per override
- Typical usage: 5-20 overrides = ~20-40KB

---

## Security Considerations

### File Access

- Override file is in workspace (`.log-scout/`)
- Standard file permissions apply
- No remote access or sync (local only)

### Regex Safety

- Pattern regexes are validated before compilation
- Invalid regex = error message, pattern disabled
- No arbitrary code execution

### Data Privacy

- Override file may contain pattern details
- Should not contain sensitive data (just regex patterns)
- Can be committed to version control safely

---

## Future Enhancements

### Version 2.0 Features

1. **Override Suggestions**
   - AI/ML suggest fixes for common pattern issues
   - Community-contributed override library

2. **Pattern Testing Framework**
   - Test pattern/override against sample logs
   - Validate before saving

3. **Override Versioning**
   - Track history of changes to overrides
   - Rollback to previous versions

4. **Collaborative Overrides**
   - Share overrides with team via remote repo
   - Automatic sync of team overrides

5. **Pattern Marketplace**
   - Community-contributed patterns
   - Rating and review system
   - One-click install

---

## References

- **Existing Code:** `vscode-extension/src/patternOverrideManager.ts`
- **Pattern Engine:** `lsp-server/src/pattern_engine.rs`
- **TagScout Integration:** `lsp-server/src/mongodb_integration.rs`

---

## Appendix: Example Override File

```json
{
  "version": "1.0",
  "lastSync": "2026-02-17T02:45:00.000Z",
  "overrides": {
    "override-5efde66677e36d0001e62450": {
      "id": "override-5efde66677e36d0001e62450",
      "sourceType": "mongodb",
      "sourceId": "5efde66677e36d0001e62450",
      "name": "Voicemail - HTTP Error Response (FIXED)",
      "notes": "Fixed CODE extractor to include all HTTP status codes",
      "reason": "Original regex ([0345][0-9]?[0-9]?) only matched 3xx/4xx/5xx, missing 2xx success codes",
      "createdAt": "2026-02-17T02:45:00.000Z",
      "modifiedAt": "2026-02-17T02:50:00.000Z",
      "modified": true,
      "enabled": true,
      "overrides": {
        "regex": null,
        "severity": null,
        "parameterExtractors": {
          "CODE": {
            "original": "HTTP response code ([0345][0-9]?[0-9]?)",
            "override": "HTTP response code ([12345][0-9]{2})",
            "reason": "Include all HTTP status codes (1xx-5xx)"
          }
        },
        "conditionTriggers": [
          {
            "field": "CODE",
            "operator": "regex",
            "value": "^[45]",
            "severity": "error",
            "description": "4xx and 5xx response codes are errors"
          },
          {
            "field": "CODE",
            "operator": "regex",
            "value": "^[123]",
            "severity": "info",
            "description": "1xx, 2xx, 3xx response codes are informational"
          }
        ]
      }
    },
    "override-682623c3ca88a5bf6b048912": {
      "id": "override-682623c3ca88a5bf6b048912",
      "sourceType": "mongodb",
      "sourceId": "682623c3ca88a5bf6b048912",
      "name": "VCM TX/RX Events (ENHANCED)",
      "notes": "Added session_id extractor for better correlation",
      "createdAt": "2026-02-17T03:00:00.000Z",
      "modified": true,
      "enabled": true,
      "overrides": {
        "parameterExtractors": {
          "session_id": {
            "override": "stream (\\d+)",
            "reason": "Extract session ID for correlation with RTP stats"
          }
        }
      }
    }
  },
  "custom": {
    "custom-1708137600-xyz789": {
      "id": "custom-1708137600-xyz789",
      "sourceType": "custom",
      "name": "My Debug Filter - High Latency",
      "regex": "latency.*?(\\d+)ms",
      "severity": "warning",
      "category": ["Performance", "Custom"],
      "tags": ["latency", "performance"],
      "description": "Catch high latency warnings in my custom logs",
      "enabled": true,
      "createdAt": "2026-02-17T03:15:00.000Z",
      "parameterExtractors": {
        "latency_ms": {
          "override": "latency.*?(\\d+)ms"
        }
      },
      "conditionTriggers": [
        {
          "field": "latency_ms",
          "operator": "greaterthan",
          "value": "100",
          "severity": "warning"
        },
        {
          "field": "latency_ms",
          "operator": "greaterthan",
          "value": "500",
          "severity": "error"
        }
      ]
    }
  }
}
```

---

**Status:** Design complete, ready for implementation
**Priority:** High (fixes critical pattern issues)
**Effort:** ~2-3 weeks (phased rollout)