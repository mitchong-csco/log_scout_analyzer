# LSP Server Integration: Runtime Quality Monitoring

> **Date:** February 16, 2026  
> **Status:** Ready for Integration  
> **Purpose:** Mark patterns for improvement during LSP processing

---

## Quick Integration

### Step 1: Add to LSP Server

In `lsp-server/src/server.rs` or main handling code:

```rust
use crate::quality_monitor::RuntimeQualityMonitor;
use std::sync::Arc;

pub struct LogScoutServer {
    // ...existing fields...
    quality_monitor: Arc<RuntimeQualityMonitor>,
}

impl LogScoutServer {
    pub fn new(client: ClientSender) -> Self {
        Self {
            // ...existing init...
            quality_monitor: Arc::new(RuntimeQualityMonitor::new()),
        }
    }
}
```

### Step 2: Record Issues During Pattern Matching

In diagnostic creation:

```rust
async fn create_diagnostics(&self, log_line: &str, pattern: &Pattern) {
    // Try to match pattern
    if let Some(captures) = pattern.regex.captures(log_line) {
        // Extract parameters
        for extractor in &pattern.parameter_extractors {
            if extract_parameter(extractor, &captures).is_err() {
                // Record extraction failure
                self.quality_monitor.record_extraction_failure(
                    pattern.id.clone(),
                    extractor.name.clone(),
                    log_line.to_string(),
                );
            }
        }
    } else {
        // Record no match for critical patterns
        if is_critical_pattern(pattern) {
            self.quality_monitor.record_no_match(
                pattern.id.clone(),
                log_line.to_string(),
            );
        }
    }
}
```

### Step 3: Setup Periodic Export

In server initialization:

```rust
impl LogScoutServer {
    pub fn start_quality_export(monitor: Arc<RuntimeQualityMonitor>) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                Duration::from_secs(3600) // 1 hour
            );
            
            loop {
                interval.tick().await;
                
                match export_runtime_issues(
                    &monitor,
                    load_overrides(None)
                        .unwrap_or_default()
                        .overrides,
                    ".log-scout/pattern-overrides.json"
                ) {
                    Ok(count) => {
                        tracing::info!(
                            "Exported {} patterns with quality issues",
                            count
                        );
                    }
                    Err(e) => {
                        tracing::error!("Quality export failed: {}", e);
                    }
                }
            }
        });
    }
}
```

---

## Full Integration Example

```rust
// In lsp-server/src/server.rs

use crate::quality_monitor::{RuntimeQualityMonitor, export_runtime_issues};
use std::sync::Arc;
use std::time::Instant;

pub struct LogScoutServer {
    client: ClientSender,
    patterns: Vec<Pattern>,
    quality_monitor: Arc<RuntimeQualityMonitor>,
}

impl LogScoutServer {
    pub fn new(client: ClientSender) -> Self {
        let server = Self {
            client,
            patterns: vec![],
            quality_monitor: Arc::new(RuntimeQualityMonitor::new()),
        };
        
        // Start background quality export task
        let monitor = Arc::clone(&server.quality_monitor);
        Self::start_quality_export(monitor);
        
        server
    }

    fn start_quality_export(monitor: Arc<RuntimeQualityMonitor>) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                std::time::Duration::from_secs(3600)
            );
            
            loop {
                interval.tick().await;
                
                if let Err(e) = export_runtime_issues(
                    &monitor,
                    load_overrides(None)
                        .unwrap_or_default()
                        .overrides,
                    ".log-scout/pattern-overrides.json"
                ) {
                    tracing::error!("Failed to export quality issues: {}", e);
                }
            }
        });
    }

    async fn analyze_diagnostics(
        &self,
        uri: &str,
        text: &str,
    ) -> Result<Vec<Diagnostic>> {
        let mut diagnostics = Vec::new();

        for line in text.lines() {
            for pattern in &self.patterns {
                let start = Instant::now();
                
                // Try to match
                if let Some(captures) = pattern.regex.captures(line) {
                    let elapsed = start.elapsed();
                    
                    // Check performance
                    if elapsed.as_millis() > 100 {
                        self.quality_monitor.record_slow_pattern(
                            pattern.id.clone(),
                            elapsed.as_secs_f64() * 1000.0,
                        );
                    }

                    // Build diagnostic
                    let mut message = pattern.message.clone();

                    // Extract parameters
                    for extractor in &pattern.parameter_extractors {
                        match self.extract_parameter(extractor, &captures) {
                            Ok(value) => {
                                message = message.replace(
                                    &format!("{{{{{}}}}}", extractor.name),
                                    &value,
                                );
                            }
                            Err(_) => {
                                // Record extraction failure
                                self.quality_monitor.record_extraction_failure(
                                    pattern.id.clone(),
                                    extractor.name.clone(),
                                    line.to_string(),
                                );
                            }
                        }
                    }

                    // Check if message still has placeholders
                    if message.contains("{{") {
                        tracing::debug!(
                            "Pattern {} has unsubstituted parameters",
                            pattern.id
                        );
                    }

                    diagnostics.push(Diagnostic {
                        range: calculate_range(line),
                        severity: Some(pattern.severity),
                        message,
                        // ...other fields...
                    });
                }
            }
        }

        Ok(diagnostics)
    }

    fn extract_parameter(
        &self,
        extractor: &ParameterExtractor,
        captures: &Captures,
    ) -> Result<String> {
        // Try to extract using regex
        if let Some(m) = captures.get(1) {
            Ok(m.as_str().to_string())
        } else {
            Err("Failed to extract".into())
        }
    }
}

// In initialization
pub async fn initialize_lsp() -> Result<()> {
    let (service, socket) = LspService::new(|client| {
        LogScoutServer::new(client)
    });

    // ...rest of initialization...

    Ok(())
}
```

---

## Command to Export On-Demand

Add LSP command for manual export:

```rust
async fn handle_custom_command(
    &self,
    command: String,
    _args: Option<Vec<serde_json::Value>>,
) -> Result<Option<serde_json::Value>> {
    match command.as_str() {
        "logScout/exportQualityIssues" => {
            tracing::info!("Exporting quality issues...");
            
            match export_runtime_issues(
                &self.quality_monitor,
                load_overrides(None)
                    .unwrap_or_default()
                    .overrides,
                ".log-scout/pattern-overrides.json"
            ) {
                Ok(count) => {
                    self.client.log_message(
                        MessageType::INFO,
                        format!("Marked {} patterns for review", count)
                    ).await;
                    Ok(Some(serde_json::json!({
                        "success": true,
                        "marked": count
                    })))
                }
                Err(e) => {
                    self.client.log_message(
                        MessageType::ERROR,
                        format!("Quality export failed: {}", e)
                    ).await;
                    Ok(Some(serde_json::json!({
                        "success": false,
                        "error": e.to_string()
                    })))
                }
            }
        }
        _ => Ok(None),
    }
}
```

---

## VSCode Command Integration

In VSCode extension `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScoutAnalyzer.exportQualityIssues",
        "title": "Export Detected Quality Issues",
        "category": "Log Scout"
      },
      {
        "command": "logScoutAnalyzer.viewQualityReport",
        "title": "View Quality Report",
        "category": "Log Scout"
      }
    ]
  }
}
```

In VSCode extension code:

```typescript
// Register command
vscode.commands.registerCommand('logScoutAnalyzer.exportQualityIssues', async () => {
    const result = await lspClient.sendRequest('logScout/exportQualityIssues');
    
    if (result.success) {
        vscode.window.showInformationMessage(
            `Marked ${result.marked} patterns for review`
        );
    } else {
        vscode.window.showErrorMessage(`Failed: ${result.error}`);
    }
});
```

---

## Configuration Options

Add to `logscout.config.json` or settings:

```json
{
  "qualityMonitoring": {
    "enabled": true,
    "exportInterval": 3600,
    "exportPath": ".log-scout/pattern-overrides.json",
    "recordFailedExtractions": true,
    "recordFailedMatches": true,
    "recordLowConfidence": true,
    "recordSlowPatterns": true,
    "slowPatternThreshold": 100
  }
}
```

---

## Workflow

```
1. LSP Server starts
   └─ Initialize RuntimeQualityMonitor
   └─ Start background export task
   └─ Export every 1 hour

2. User opens log files
   ↓
3. LSP analyzes each line
   ├─ Applies patterns
   ├─ Detects issues
   │  ├─ Failed extraction → record_extraction_failure()
   │  ├─ No match → record_no_match()
   │  ├─ Slow regex → record_slow_pattern()
   │  └─ Low confidence → record_low_confidence()
   └─ Creates diagnostics
   ↓
4. Issues accumulate in monitor
   ↓
5. Every hour (or on demand):
   └─ export_runtime_issues()
   ├─ Reads accumulated issues
   ├─ Marks patterns that had issues
   ├─ Sets priority from severity
   ├─ Writes .log-scout/pattern-overrides.json
   └─ Team gets notified
   ↓
6. Team opens VSCode
   ├─ Sees "Pattern Overrides" view updated
   ├─ Sees new marked patterns
   └─ Reviews and fixes them
```

---

## Metrics & Monitoring

Query quality issues:

```rust
// In diagnostics handler
let summary = self.quality_monitor.get_summary();

// Log statistics
for (pattern_id, (count, severity)) in summary {
    tracing::info!(
        "Pattern {}: {} issues (max severity: {:?})",
        pattern_id, count, severity
    );
}

// Send to client for UI display
self.client.publish_diagnostics(
    uri.clone(),
    diagnostics,
).await;
```

---

## Summary

✅ **Real-time detection** - Issues recorded as patterns are applied  
✅ **Periodic export** - Background task exports hourly  
✅ **On-demand export** - VSCode command for immediate export  
✅ **Zero overhead** - Issues stored in HashMap  
✅ **Team ready** - JSON format for review in VSCode  

**Result:** Broken patterns are found and marked automatically during normal LSP operation.

See `RUNTIME_PATTERN_QUALITY_MONITORING.md` for API reference.
