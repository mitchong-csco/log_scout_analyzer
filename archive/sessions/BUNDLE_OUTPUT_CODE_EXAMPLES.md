# Bundle Output Code Examples

## Concrete Implementation Examples for Bundle Output Format Alignment

This document provides **copy-paste ready code examples** showing how to align bundle operations with Scout Log Output Reference Practices.

---

## 1. Detection → LSP Diagnostic Conversion

### Rust: Converting Bundle Detection to LSP Diagnostic

```rust
// crates/lsp-server/src/bundle/conversion.rs

use crate::bundle::models::{Detection, DetectionSeverity};
use tower_lsp::lsp_types::{
    Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Location, 
    NumberOrString, Position, Range, Url
};

/// Convert a bundle Detection to an LSP Diagnostic
pub fn detection_to_diagnostic(detection: &Detection) -> Result<Diagnostic, String> {
    // Parse the URI
    let uri = Url::from_file_path(&detection.log_uri)
        .map_err(|_| format!("Invalid URI: {}", detection.log_uri))?;

    // Convert line number (Detection uses 1-indexed, LSP uses 0-indexed)
    let line = detection.line_number.saturating_sub(1) as u32;
    
    // Calculate character range for the matched text
    let start_char = detection.log_line
        .find(&detection.matched_text)
        .unwrap_or(0) as u32;
    let end_char = start_char + detection.matched_text.len() as u32;

    // Create the range
    let range = Range {
        start: Position {
            line,
            character: start_char,
        },
        end: Position {
            line,
            character: end_char,
        },
    };

    // Convert severity
    let severity = match detection.severity {
        DetectionSeverity::Error => DiagnosticSeverity::ERROR,
        DetectionSeverity::Warning => DiagnosticSeverity::WARNING,
        DetectionSeverity::Info => DiagnosticSeverity::INFORMATION,
    };

    // Build message with pattern name
    let message = format!(
        "[{}] {}\n{}",
        detection.pattern_name,
        detection.matched_text,
        detection.log_line.trim()
    );

    // Create related information for cross-log correlations
    let related_information = build_related_information(detection)?;

    // Build the diagnostic
    Ok(Diagnostic {
        range,
        severity: Some(severity),
        code: Some(NumberOrString::String(detection.pattern_id.clone())),
        source: Some(format!("Scout: {}", detection.service)),
        message,
        related_information: if related_information.is_empty() {
            None
        } else {
            Some(related_information)
        },
        tags: None,
        code_description: None,
        data: Some(serde_json::to_value(&detection.extracted_fields).unwrap()),
    })
}

/// Build related information from extracted fields
fn build_related_information(
    detection: &Detection
) -> Result<Vec<DiagnosticRelatedInformation>, String> {
    let mut related = Vec::new();

    // Check for cross-log references in extracted fields
    if let Some(related_uri) = detection.extracted_fields.get("related_log_uri") {
        if let Some(related_line) = detection.extracted_fields.get("related_line_number") {
            if let Ok(line) = related_line.parse::<usize>() {
                let uri = Url::from_file_path(related_uri)
                    .map_err(|_| format!("Invalid related URI: {}", related_uri))?;

                let message = detection.extracted_fields
                    .get("related_message")
                    .cloned()
                    .unwrap_or_else(|| "Related detection".to_string());

                related.push(DiagnosticRelatedInformation {
                    location: Location {
                        uri,
                        range: Range {
                            start: Position {
                                line: (line - 1) as u32,
                                character: 0,
                            },
                            end: Position {
                                line: (line - 1) as u32,
                                character: 1000,
                            },
                        },
                    },
                    message,
                });
            }
        }
    }

    Ok(related)
}
```

---

## 2. Bundle Analysis Response Formatting

### Rust: LSP Handler for Bundle Analysis

```rust
// crates/lsp-server/src/lsp_handlers.rs

use crate::bundle::{BundleAnalyzer, BundleManager};
use crate::lsp_types::{AnalyzeBundleRequest, AnalyzeBundleResponse, SeverityCounts};
use std::sync::{Arc, Mutex};
use tower_lsp::jsonrpc::Result;

pub struct BundleHandler {
    manager: Arc<Mutex<BundleManager>>,
    analyzer: BundleAnalyzer,
}

impl BundleHandler {
    /// Analyze a bundle and return results following Scout Log Output Practices
    pub async fn analyze_bundle(
        &self,
        request: AnalyzeBundleRequest
    ) -> Result<AnalyzeBundleResponse> {
        let start_time = std::time::Instant::now();

        // Load the bundle
        let mut manager = self.manager.lock().unwrap();
        let bundle = manager.get_bundle(&request.bundle_id)
            .map_err(|e| tower_lsp::jsonrpc::Error::invalid_params(e.to_string()))?;

        // Run pattern matching analysis
        let analysis_result = self.analyzer
            .analyze_bundle(&bundle)
            .await
            .map_err(|e| tower_lsp::jsonrpc::Error::internal_error())?;

        // Calculate duration
        let duration_ms = start_time.elapsed().as_millis() as u64;

        // Count by severity (following output practices)
        let mut severity_counts = SeverityCounts {
            error: 0,
            warning: 0,
            info: 0,
        };

        for detection in &analysis_result.detections {
            match detection.severity {
                DetectionSeverity::Error => severity_counts.error += 1,
                DetectionSeverity::Warning => severity_counts.warning += 1,
                DetectionSeverity::Info => severity_counts.info += 1,
            }
        }

        // Update bundle with analysis results
        let mut bundle_mut = bundle.clone();
        bundle_mut.analysis = Some(analysis_result.clone());
        bundle_mut.updated_at = chrono::Utc::now();
        manager.save_bundle(&bundle_mut)
            .map_err(|e| tower_lsp::jsonrpc::Error::internal_error())?;

        // Build response following Scout Log Output Practices
        Ok(AnalyzeBundleResponse {
            bundle_id: request.bundle_id.clone(),
            total_detections: analysis_result.detections.len(),
            by_severity: severity_counts,
            services_analyzed: analysis_result.by_service.keys().cloned().collect(),
            patterns_matched: analysis_result.by_pattern.keys().cloned().collect(),
            duration_ms,
        })
    }

    /// Send progressive diagnostics as analysis proceeds (for large bundles)
    pub async fn analyze_bundle_progressive(
        &self,
        request: AnalyzeBundleRequest,
        progress_callback: impl Fn(String, Vec<Diagnostic>)
    ) -> Result<AnalyzeBundleResponse> {
        let manager = self.manager.lock().unwrap();
        let bundle = manager.get_bundle(&request.bundle_id)
            .map_err(|e| tower_lsp::jsonrpc::Error::invalid_params(e.to_string()))?;
        drop(manager);

        let mut all_detections = Vec::new();

        // Analyze each log file individually
        for log in &bundle.logs {
            // Analyze single log
            let log_detections = self.analyzer
                .analyze_log(&log.uri)
                .await
                .map_err(|e| tower_lsp::jsonrpc::Error::internal_error())?;

            // Convert to diagnostics
            let diagnostics: Vec<Diagnostic> = log_detections
                .iter()
                .filter_map(|d| detection_to_diagnostic(d).ok())
                .collect();

            // Send progressive update (following LSP publishDiagnostics)
            progress_callback(log.uri.clone(), diagnostics);

            all_detections.extend(log_detections);
        }

        // Build final response
        self.build_analysis_response(&request.bundle_id, all_detections)
    }
}
```

---

## 3. Bundle Storage Format

### Rust: Serializing Bundle with Analysis

```rust
// crates/lsp-server/src/bundle/manager.rs

use crate::bundle::models::{Bundle, BundleAnalysisResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Bundle JSON file format (matches output practices)
#[derive(Debug, Serialize, Deserialize)]
struct BundleFile {
    #[serde(flatten)]
    bundle: Bundle,
    
    /// Format version for compatibility
    format_version: String,
}

impl BundleManager {
    /// Save bundle to disk with analysis results
    pub fn save_bundle(&self, bundle: &Bundle) -> Result<(), std::io::Error> {
        let bundle_dir = self.bundles_dir.join(&bundle.id);
        let bundle_path = bundle_dir.join("bundle.json");

        // Create bundle file with version tag
        let bundle_file = BundleFile {
            bundle: bundle.clone(),
            format_version: "1.0".to_string(),
        };

        // Serialize with pretty formatting
        let json = serde_json::to_string_pretty(&bundle_file)?;

        // Write to disk
        fs::write(&bundle_path, json)?;

        Ok(())
    }

    /// Load bundle from disk and validate format
    pub fn load_bundle(&self, bundle_id: &str) -> Result<Bundle, std::io::Error> {
        let bundle_path = self.bundles_dir
            .join(bundle_id)
            .join("bundle.json");

        let json = fs::read_to_string(&bundle_path)?;
        let bundle_file: BundleFile = serde_json::from_str(&json)?;

        // Validate format version
        if bundle_file.format_version != "1.0" {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unsupported bundle format version: {}", bundle_file.format_version)
            ));
        }

        Ok(bundle_file.bundle)
    }
}
```

### Example Bundle JSON Output

```json
{
  "id": "bundle_1705320000_abc123",
  "name": "INC-12345: Jabber Presence Failure",
  "description": "User unable to see presence status for contacts",
  "logs": [
    {
      "uri": "/workspace/logs/jabber.log",
      "service": "Jabber",
      "log_type": "Trace",
      "added_at": "2024-01-15T10:00:00Z",
      "size_bytes": 1048576,
      "line_count": 15234,
      "timestamp_format": "%Y-%m-%d %H:%M:%S.%f"
    },
    {
      "uri": "/workspace/logs/cucm.log",
      "service": "CUCM",
      "log_type": "Debug",
      "added_at": "2024-01-15T10:05:00Z",
      "size_bytes": 2097152,
      "line_count": 28567,
      "timestamp_format": "%Y-%m-%d %H:%M:%S,%f"
    }
  ],
  "metadata": {
    "case_id": "INC-12345",
    "severity": "High",
    "tags": ["presence", "jabber", "connectivity"],
    "owner": "john.doe@company.com",
    "team_members": ["jane.smith@company.com"],
    "custom_fields": {
      "customer": "Acme Corp",
      "environment": "production"
    }
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "analysis": {
    "bundle_id": "bundle_1705320000_abc123",
    "detections": [
      {
        "bundle_id": "bundle_1705320000_abc123",
        "log_uri": "/workspace/logs/jabber.log",
        "service": "Jabber",
        "pattern_id": "jabber:sip_timeout",
        "pattern_name": "SIP INVITE Timeout",
        "line_number": 150,
        "matched_text": "SIP/2.0 408 Request Timeout",
        "log_line": "2024-01-15 10:30:15.123 [ERROR] SIP/2.0 408 Request Timeout - Call-ID: abc123@example.com",
        "severity": "Error",
        "detected_at": "2024-01-15T10:30:00Z",
        "extracted_fields": {
          "timestamp": "2024-01-15T10:30:15.123Z",
          "call_id": "abc123@example.com",
          "sip_response_code": "408",
          "related_log_uri": "/workspace/logs/cucm.log",
          "related_line_number": "523",
          "related_message": "Server-side timeout for same Call-ID"
        }
      }
    ],
    "by_service": {
      "Jabber": [ /* detection references */ ],
      "CUCM": [ /* detection references */ ]
    },
    "by_pattern": {
      "jabber:sip_timeout": [ /* detection references */ ],
      "cucm:session_timeout": [ /* detection references */ ]
    },
    "statistics": {
      "total_detections": 150,
      "error_count": 45,
      "warning_count": 80,
      "info_count": 25,
      "services_analyzed": 2,
      "patterns_matched": 12
    },
    "analyzed_at": "2024-01-15T10:30:00Z",
    "duration_ms": 1250
  },
  "format_version": "1.0"
}
```

---

## 4. VSCode Extension: Display Bundle Analysis

### TypeScript: Sending Bundle Data to Action Panel

```typescript
// vscode-extension/src/scoutAnalyzerPanel.ts

import * as vscode from 'vscode';

export class ScoutAnalyzerPanel {
  private static dataProvider: any;
  private panel: vscode.WebviewPanel;

  public static setDataProvider(provider: any): void {
    ScoutAnalyzerPanel.dataProvider = provider;
  }

  /**
   * Send bundle analysis data to webview (following output format)
   */
  public sendBundleAnalysis(bundleId: string): void {
    if (!ScoutAnalyzerPanel.dataProvider) {
      console.warn('Data provider not set');
      return;
    }

    // Get all results from LSP data provider
    const allResults = ScoutAnalyzerPanel.dataProvider.getAllResults();

    // Filter detections for this bundle
    const bundleDetections = allResults.filter(
      (result: any) => result.bundleId === bundleId
    );

    // Group by severity (matching output practices)
    const bySeverity = {
      error: bundleDetections.filter((d: any) => d.severity === 'Error'),
      warning: bundleDetections.filter((d: any) => d.severity === 'Warning'),
      info: bundleDetections.filter((d: any) => d.severity === 'Info')
    };

    // Group by service
    const byService: { [key: string]: any[] } = {};
    bundleDetections.forEach((detection: any) => {
      if (!byService[detection.service]) {
        byService[detection.service] = [];
      }
      byService[detection.service].push(detection);
    });

    // Calculate statistics
    const statistics = {
      totalDetections: bundleDetections.length,
      errorCount: bySeverity.error.length,
      warningCount: bySeverity.warning.length,
      infoCount: bySeverity.info.length,
      servicesAnalyzed: Object.keys(byService).length
    };

    // Send to webview (format matches LSP output)
    this.panel.webview.postMessage({
      type: 'bundleAnalysis',
      data: {
        bundleId,
        detections: bundleDetections,
        bySeverity,
        byService,
        statistics
      }
    });
  }

  /**
   * Handle navigation to detection location
   */
  public async navigateToDetection(detection: any): Promise<void> {
    // Open the log file
    const uri = vscode.Uri.file(detection.logUri);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Navigate to line (convert 1-indexed to 0-indexed)
    const line = detection.lineNumber - 1;
    const position = new vscode.Position(line, 0);
    const range = new vscode.Range(position, position);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    // Highlight the matched text if we have character positions
    if (detection.extractedFields?.start_char && detection.extractedFields?.end_char) {
      const startPos = new vscode.Position(line, detection.extractedFields.start_char);
      const endPos = new vscode.Position(line, detection.extractedFields.end_char);
      editor.selection = new vscode.Selection(startPos, endPos);
    }
  }
}
```

### TypeScript: Bundle Tree Provider Integration

```typescript
// vscode-extension/src/bundleTreeProvider.ts

import * as vscode from 'vscode';
import { getLSPClient } from './lspClient';

export class BundleTreeProvider implements vscode.TreeDataProvider<BundleItem> {
  
  /**
   * Analyze bundle and store results (following output format)
   */
  async analyzeBundle(bundleId: string): Promise<any> {
    const client = getLSPClient();
    if (!client) {
      throw new Error('LSP client not available');
    }

    // Show progress
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing Bundle',
        cancellable: false
      },
      async (progress) => {
        progress.report({ message: 'Loading bundle...' });

        // Send LSP request (response follows output practices)
        const response = await client.sendRequest('scout/bundle/analyze', {
          bundleId: bundleId
        });

        progress.report({ message: 'Processing results...' });

        // Response structure matches BundleAnalysisResult:
        // {
        //   bundle_id: string,
        //   total_detections: number,
        //   by_severity: { error, warning, info },
        //   services_analyzed: string[],
        //   patterns_matched: string[],
        //   duration_ms: number
        // }

        // Refresh the tree view
        this.refresh();

        // Show completion message
        vscode.window.showInformationMessage(
          `Analysis complete: ${response.total_detections} detections found ` +
          `(${response.by_severity.error} errors, ${response.by_severity.warning} warnings)`
        );

        return response;
      }
    );
  }

  /**
   * Get bundle analysis summary for display
   */
  async getBundleAnalysisSummary(bundleId: string): Promise<string | undefined> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return undefined;

    const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleId}/bundle.json`;

    try {
      const bundleUri = vscode.Uri.file(bundlePath);
      const bundleData = await vscode.workspace.fs.readFile(bundleUri);
      const bundle = JSON.parse(Buffer.from(bundleData).toString('utf8'));

      // Check if bundle has analysis results (following output format)
      if (!bundle.analysis) {
        return 'Not analyzed yet';
      }

      const stats = bundle.analysis.statistics;
      return `${stats.total_detections} detections (${stats.error_count} errors)`;
    } catch (error) {
      console.error('Failed to load bundle analysis:', error);
      return undefined;
    }
  }
}
```

---

## 5. Bundle Export/Import

### Rust: Export Bundle Package

```rust
// crates/lsp-server/src/bundle/export.rs

use crate::bundle::models::Bundle;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize)]
pub struct BundleExport {
    /// The bundle with analysis results
    bundle: Bundle,
    
    /// Format version for compatibility
    format_version: String,
    
    /// When this export was created
    exported_at: chrono::DateTime<Utc>,
    
    /// Original workspace root (for path remapping)
    workspace_root: String,
}

impl BundleManager {
    /// Export bundle to shareable package
    pub fn export_bundle(
        &self,
        bundle_id: &str,
        workspace_root: &Path
    ) -> Result<PathBuf, std::io::Error> {
        // Load the bundle
        let mut bundle = self.load_bundle(bundle_id)?;

        // Make all file paths relative to workspace root
        for log in &mut bundle.logs {
            if let Ok(rel_path) = Path::new(&log.uri).strip_prefix(workspace_root) {
                log.uri = rel_path.to_string_lossy().to_string();
            }
        }

        // Update detection URIs in analysis results
        if let Some(ref mut analysis) = bundle.analysis {
            for detection in &mut analysis.detections {
                if let Ok(rel_path) = Path::new(&detection.log_uri).strip_prefix(workspace_root) {
                    detection.log_uri = rel_path.to_string_lossy().to_string();
                }
            }
        }

        // Create export package
        let export = BundleExport {
            bundle,
            format_version: "1.0".to_string(),
            exported_at: Utc::now(),
            workspace_root: workspace_root.to_string_lossy().to_string(),
        };

        // Write to export file
        let export_filename = format!("{}_export.json", bundle_id);
        let export_path = self.bundles_dir.join(&export_filename);
        
        let json = serde_json::to_string_pretty(&export)?;
        std::fs::write(&export_path, json)?;

        Ok(export_path)
    }

    /// Import bundle from export package
    pub fn import_bundle(
        &self,
        export_path: &Path,
        workspace_root: &Path
    ) -> Result<String, std::io::Error> {
        // Read export file
        let json = std::fs::read_to_string(export_path)?;
        let export: BundleExport = serde_json::from_str(&json)?;

        // Validate format version
        if export.format_version != "1.0" {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Unsupported export format: {}", export.format_version)
            ));
        }

        // Remap file paths to local workspace
        let mut bundle = export.bundle;
        for log in &mut bundle.logs {
            let abs_path = workspace_root.join(&log.uri);
            log.uri = abs_path.to_string_lossy().to_string();
        }

        // Remap detection URIs
        if let Some(ref mut analysis) = bundle.analysis {
            for detection in &mut analysis.detections {
                let abs_path = workspace_root.join(&detection.log_uri);
                detection.log_uri = abs_path.to_string_lossy().to_string();
            }
        }

        // Generate new bundle ID
        let new_id = format!(
            "bundle_{}_{}",
            Utc::now().timestamp(),
            uuid::Uuid::new_v4().to_string()[..8].to_string()
        );
        bundle.id = new_id.clone();

        // Save imported bundle
        self.save_bundle(&bundle)?;

        Ok(new_id)
    }
}
```

---

## 6. Bundle Comparison

### Rust: Compare Bundle Analysis Results

```rust
// crates/lsp-server/src/bundle/comparison.rs

use crate::bundle::models::{BundleAnalysisResult, Detection};
use std::collections::{HashMap, HashSet};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BundleComparison {
    /// Bundle IDs being compared
    pub bundle_a_id: String,
    pub bundle_b_id: String,
    
    /// Detections only in bundle A (resolved)
    pub resolved_detections: Vec<Detection>,
    
    /// Detections only in bundle B (new issues)
    pub new_detections: Vec<Detection>,
    
    /// Detections in both bundles
    pub common_detections: Vec<Detection>,
    
    /// Detections that changed severity
    pub severity_changes: Vec<SeverityChange>,
    
    /// Pattern frequency comparison
    pub pattern_frequency: HashMap<String, FrequencyChange>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SeverityChange {
    pub pattern_id: String,
    pub log_uri: String,
    pub line_number: usize,
    pub old_severity: String,
    pub new_severity: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FrequencyChange {
    pub pattern_id: String,
    pub pattern_name: String,
    pub count_before: usize,
    pub count_after: usize,
    pub change_percent: f64,
}

/// Generate a stable ID for a detection (for comparison)
fn detection_id(detection: &Detection) -> String {
    format!(
        "{}:{}:{}",
        detection.pattern_id,
        detection.log_uri,
        detection.line_number
    )
}

/// Compare two bundle analysis results
pub fn compare_bundles(
    bundle_a: &BundleAnalysisResult,
    bundle_b: &BundleAnalysisResult
) -> BundleComparison {
    // Create detection ID maps
    let mut detections_a: HashMap<String, &Detection> = HashMap::new();
    let mut detections_b: HashMap<String, &Detection> = HashMap::new();
    
    for detection in &bundle_a.detections {
        detections_a.insert(detection_id(detection), detection);
    }
    
    for detection in &bundle_b.detections {
        detections_b.insert(detection_id(detection), detection);
    }
    
    let ids_a: HashSet<_> = detections_a.keys().collect();
    let ids_b: HashSet<_> = detections_b.keys().collect();
    
    // Find resolved detections (in A, not in B)
    let resolved: Vec<Detection> = ids_a.difference(&ids_b)
        .filter_map(|id| detections_a.get(*id).map(|d| (*d).clone()))
        .collect();
    
    // Find new detections (in B, not in A)
    let new: Vec<Detection> = ids_b.difference(&ids_a)
        .filter_map(|id| detections_b.get(*id).map(|d| (*d).clone()))
        .collect();
    
    // Find common detections
    let common: Vec<Detection> = ids_a.intersection(&ids_b)
        .filter_map(|id| detections_b.get(*id).map(|d| (*d).clone()))
        .collect();
    
    // Find severity changes
    let mut severity_changes = Vec::new();
    for id in ids_a.intersection(&ids_b) {
        let det_a = detections_a.get(*id).unwrap();
        let det_b = detections_b.get(*id).unwrap();
        
        if det_a.severity != det_b.severity {
            severity_changes.push(SeverityChange {
                pattern_id: det_a.pattern_id.clone(),
                log_uri: det_a.log_uri.clone(),
                line_number: det_a.line_number,
                old_severity: format!("{:?}", det_a.severity),
                new_severity: format!("{:?}", det_b.severity),
            });
        }
    }
    
    // Compare pattern frequencies
    let mut pattern_frequency = HashMap::new();
    
    let patterns_a: HashSet<_> = bundle_a.by_pattern.keys().collect();
    let patterns_b: HashSet<_> = bundle_b.by_pattern.keys().collect();
    let all_patterns: HashSet<_> = patterns_a.union(&patterns_b).collect();
    
    for pattern_id in all_patterns {
        let count_a = bundle_a.by_pattern
            .get(*pattern_id)
            .map(|v| v.len())
            .unwrap_or(0);
        let count_b = bundle_b.by_pattern
            .get(*pattern_id)
            .map(|v| v.len())
            .unwrap_or(0);
        
        let change_percent = if count_a > 0 {
            ((count_b as f64 - count_a as f64) / count_a as f64) * 100.0
        } else {
            100.0
        };
        
        let pattern_name = bundle_b.by_pattern
            .get(*pattern_id)
            .and_then(|v| v.first())
            .map(|d| d.pattern_name.clone())
            .unwrap_or_else(|| "Unknown".to_string());
        
        pattern_frequency.insert(
            pattern_id.to_string(),
            FrequencyChange {
                pattern_id: pattern_id.to_string(),
                pattern_name,
                count_before: count_a,
                count_after: count_b,
                change_percent,
            }
        );
    }
    
    BundleComparison {
        bundle_a_id: bundle_a.bundle_id.clone(),
        bundle_b_id: bundle_b.bundle_id.clone(),
        resolved_detections: resolved,
        new_detections: new,
        common_detections: common,
        severity_changes,
        pattern_frequency,
    }
}
```

---

## Summary

These code examples demonstrate:

1. ✅ **Detection ↔ Diagnostic conversion** maintains LSP compatibility
2. ✅ **Bundle storage format** follows Scout Log Output Practices
3. ✅ **Progressive analysis** streams results efficiently
4. ✅ **Action panel integration** displays analysis using standardized format
5. ✅ **Export/Import** handles path remapping and validation
6. ✅ **Bundle comparison** leverages structured detection data

**Key Principle:** Every detection must be serializable, displayable, and navigable using the Scout Log Output Reference Practices format.