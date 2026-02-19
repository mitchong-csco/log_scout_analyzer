# Phase 1: Local Log Bundling - Design & Implementation

**Status**: Implementation Planning  
**Date**: February 17, 2026  
**Scope**: Service-aware local log bundling with LSP integration for pattern matching and storage

---

## Overview

Transform Log Scout from single-file analysis to **service-grouped log bundles** where:
- Users create bundles (e.g., "INC-12345 Presence Failure")
- Add logs from different services (Jabber, CUCM, CUP, etc.)
- System understands which service each log is from
- Run patterns through LSP that respect service boundaries
- Store bundle metadata and analysis results locally

**Key Constraint**: Local-first (no MongoDB yet) - filesystem-based storage for simplicity, extensible to DB in Phase 2.

---

## Architecture

```
┌────────────────────────────────────────────────┐
│         Client (VS Code / Zed)                 │
│                                                │
│  Commands:                                     │
│  - Create Bundle                               │
│  - Add Log to Bundle                           │
│  - List Bundles                                │
│  - Analyze Bundle                              │
│  - View Results                                │
└────────────────┬────────────────────────────────┘
                 │ LSP Protocol (custom methods)
                 │
┌────────────────▼────────────────────────────────┐
│    LSP Server (LogScoutServer)                  │
│                                                │
│  New Modules:                                  │
│  ├─ bundle_manager.rs                          │
│  ├─ service_detector.rs                        │
│  └─ bundle_analyzer.rs                         │
│                                                │
│  Existing:                                     │
│  ├─ pattern_engine.rs (enhanced with          │
│  │   service awareness)                        │
│  └─ tagscout/ (pattern loading)                │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────┐
│  Storage Layer (Local Filesystem)               │
│                                                │
│  .log-scout/bundles/                            │
│  ├─ bundle_<id>/                               │
│  │  ├─ bundle.json (metadata)                  │
│  │  ├─ results.json (analysis results)         │
│  │  └─ logs/ (symlinks or copies)              │
│  └─ index.json (all bundles)                   │
└────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Bundle Metadata

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bundle {
    /// Unique identifier (UUID or timestamp-based)
    pub id: String,
    
    /// User-friendly name
    pub name: String,
    
    /// Optional description
    pub description: Option<String>,
    
    /// Logs in this bundle
    pub logs: Vec<BundleLog>,
    
    /// Metadata about the investigation
    pub metadata: BundleMetadata,
    
    /// When bundle was created
    pub created_at: DateTime<Utc>,
    
    /// When bundle was last modified
    pub updated_at: DateTime<Utc>,
    
    /// Analysis results (stored after analysis)
    pub analysis: Option<BundleAnalysisResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleLog {
    /// File path (URI or local path)
    pub uri: String,
    
    /// Detected service type
    pub service: ServiceType,
    
    /// Log type (trace, debug, error, audit)
    pub log_type: LogType,
    
    /// When added to bundle
    pub added_at: DateTime<Utc>,
    
    /// File size in bytes
    pub size_bytes: u64,
    
    /// Line count (cached)
    pub line_count: usize,
    
    /// Timestamp format in this log (detected)
    pub timestamp_format: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ServiceType {
    Jabber,
    CUCM,
    CUP,      // Presence
    Unity,
    SIP,
    Network,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum LogType {
    Trace,
    Debug,
    Error,
    Warning,
    Audit,
    CDR,
    Activity,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BundleMetadata {
    /// Case/Incident ID
    pub case_id: Option<String>,
    
    /// Severity level
    pub severity: Option<String>,
    
    /// Tags for searching
    pub tags: Vec<String>,
    
    /// Who is investigating
    pub owner: Option<String>,
    
    /// Custom fields
    pub custom: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleAnalysisResult {
    /// When analysis was run
    pub analyzed_at: DateTime<Utc>,
    
    /// All detections from all logs
    pub detections: Vec<Detection>,
    
    /// Detections grouped by service
    pub by_service: HashMap<ServiceType, Vec<Detection>>,
    
    /// Detections grouped by pattern
    pub by_pattern: HashMap<String, Vec<Detection>>,
    
    /// Summary statistics
    pub summary: AnalysisSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Detection {
    /// Which log this came from
    pub log_uri: String,
    
    /// Pattern that matched
    pub pattern_id: String,
    pub pattern_name: String,
    
    /// Line in log file
    pub line_number: usize,
    
    /// Matched text
    pub matched_text: String,
    
    /// Severity
    pub severity: DetectionSeverity,
    
    /// Service that produced this log
    pub service: ServiceType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum DetectionSeverity {
    Error,
    Warning,
    Info,
    Hint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub total_logs: usize,
    pub total_lines: usize,
    pub total_detections: usize,
    pub error_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    pub by_service: HashMap<ServiceType, u32>,
    pub analysis_duration_ms: u64,
}
```

### 2. Service Detection Rules

```rust
#[derive(Debug, Clone)]
pub struct ServiceDetectionRule {
    pub service: ServiceType,
    pub filename_patterns: Vec<String>,  // glob patterns
    pub content_signatures: Vec<String>, // regex patterns to detect in first lines
}

impl ServiceDetectionRule {
    pub fn detect_from_filename(filename: &str) -> Option<ServiceType> {
        // Case-insensitive matching
        let lower = filename.to_lowercase();
        
        if lower.contains("jabber") {
            Some(ServiceType::Jabber)
        } else if lower.contains("cucm") || lower.contains("cm_") {
            Some(ServiceType::CUCM)
        } else if lower.contains("cup") || lower.contains("presence") {
            Some(ServiceType::CUP)
        } else if lower.contains("unity") || lower.contains("voicemail") {
            Some(ServiceType::Unity)
        } else if lower.contains("sip") || lower.contains("pcap") {
            Some(ServiceType::SIP)
        } else if lower.contains("network") || lower.contains("trace") {
            Some(ServiceType::Network)
        } else {
            None
        }
    }
    
    pub fn detect_from_content(content: &str) -> Option<ServiceType> {
        let first_lines = content.lines().take(100).collect::<Vec<_>>().join("\n");
        
        // Jabber signatures
        if first_lines.contains("Jabber") || first_lines.contains("CSF") {
            return Some(ServiceType::Jabber);
        }
        
        // CUCM signatures
        if first_lines.contains("CallManager") || first_lines.contains("CCM") {
            return Some(ServiceType::CUCM);
        }
        
        // CUP signatures
        if first_lines.contains("Presence") || first_lines.contains("XCP") {
            return Some(ServiceType::CUP);
        }
        
        // Unity signatures
        if first_lines.contains("Unity") || first_lines.contains("Voicemail") {
            return Some(ServiceType::Unity);
        }
        
        // SIP signatures
        if first_lines.contains("SIP/2.0") || first_lines.contains("Via:") {
            return Some(ServiceType::SIP);
        }
        
        None
    }
}
```

---

## LSP Protocol Extensions (Phase 1)

### Custom Methods

#### 1. Create Bundle
```
request: custom/createBundle
params: {
  name: string,
  description?: string,
  metadata?: {
    case_id?: string,
    severity?: string,
    tags?: string[],
    owner?: string
  }
}
response: {
  bundle_id: string,
  created_at: string (ISO8601)
}
```

**Example:**
```json
{
  "method": "custom/createBundle",
  "params": {
    "name": "INC-12345: Presence Failure",
    "description": "User alice@acme.com cannot register for presence",
    "metadata": {
      "case_id": "INC-12345",
      "severity": "high",
      "tags": ["presence", "jabber", "cucm"],
      "owner": "engineer@acme.com"
    }
  }
}
```

#### 2. Add Log to Bundle
```
request: custom/addLogToBundle
params: {
  bundle_id: string,
  log_uri: string,  // file:// URI
  service?: ServiceType,  // Optional: jabber|cucm|cup|unity|sip|network|custom
  log_type?: LogType      // Optional: trace|debug|error|warning|audit|cdr|activity
}
response: {
  bundle_id: string,
  log_count: number,
  log_info: {
    service: string,
    log_type: string,
    size_bytes: number,
    line_count: number
  }
}
```

#### 3. Get Bundle
```
request: custom/getBundle
params: {
  bundle_id: string
}
response: {
  bundle: Bundle  // Full bundle object (see data model)
}
```

#### 4. List Bundles
```
request: custom/listBundles
params: {
  filter?: {
    tag?: string,
    owner?: string,
    case_id?: string
  }
}
response: {
  bundles: BundleInfo[]  // Lightweight list with id, name, log_count, created_at
}
```

#### 5. Analyze Bundle
```
request: custom/analyzeBundle
params: {
  bundle_id: string,
  force_reanalyze?: boolean  // Skip cached results
}
response: {
  bundle_id: string,
  analysis: BundleAnalysisResult,
  analysis_duration_ms: number,
  from_cache: boolean
}
```

#### 6. Delete Bundle
```
request: custom/deleteBundle
params: {
  bundle_id: string
}
response: {
  success: boolean,
  deleted_at: string (ISO8601)
}
```

---

## Storage Layout

### Directory Structure
```
Workspace Root/
└─ .log-scout/
   ├─ bundles/
   │  ├─ index.json
   │  ├─ bundle_abc123/
   │  │  ├─ bundle.json       (metadata + log references)
   │  │  ├─ results.json      (analysis results)
   │  │  └─ logs/
   │  │     ├─ jabber.log     (symlink or copy)
   │  │     └─ cucm_trace.log (symlink or copy)
   │  └─ bundle_def456/
   │     └─ ...
   └─ cache/
      └─ analysis_cache.json   (optional: cache for large analyses)
```

### bundle.json
```json
{
  "id": "bundle_abc123",
  "name": "INC-12345: Presence Failure",
  "description": "User alice@acme.com cannot register for presence",
  "logs": [
    {
      "uri": "file:///C:/logs/Jabber.log",
      "service": "jabber",
      "log_type": "trace",
      "added_at": "2026-02-17T10:05:00Z",
      "size_bytes": 1048576,
      "line_count": 15234,
      "timestamp_format": "YYYY-MM-DD HH:mm:ss,SSS"
    },
    {
      "uri": "file:///C:/logs/CUCM_trace.log",
      "service": "cucm",
      "log_type": "trace",
      "added_at": "2026-02-17T10:10:00Z",
      "size_bytes": 2097152,
      "line_count": 32456,
      "timestamp_format": "MM/DD/YYYY HH:mm:ss.SSS"
    }
  ],
  "metadata": {
    "case_id": "INC-12345",
    "severity": "high",
    "tags": ["presence", "jabber", "cucm"],
    "owner": "engineer@acme.com"
  },
  "created_at": "2026-02-17T10:00:00Z",
  "updated_at": "2026-02-17T10:30:00Z",
  "analysis": null
}
```

### results.json
```json
{
  "analyzed_at": "2026-02-17T10:30:00Z",
  "detections": [
    {
      "log_uri": "file:///C:/logs/Jabber.log",
      "pattern_id": "pattern_jabber_offline",
      "pattern_name": "User Went Offline",
      "line_number": 42,
      "matched_text": "[2026-02-17 10:23:45,123] INFO User went offline",
      "severity": "info",
      "service": "jabber"
    },
    {
      "log_uri": "file:///C:/logs/CUCM_trace.log",
      "pattern_id": "pattern_cucm_presence_change",
      "pattern_name": "Presence Changed",
      "line_number": 180,
      "matched_text": "[02/17/2026 10:23:46.001] WARN Presence changed: offline",
      "severity": "warning",
      "service": "cucm"
    }
  ],
  "by_service": {
    "jabber": [
      { "pattern_id": "...", "line_number": 42, ... }
    ],
    "cucm": [
      { "pattern_id": "...", "line_number": 180, ... }
    ]
  },
  "by_pattern": {
    "pattern_jabber_offline": [
      { "log_uri": "...", "line_number": 42, ... }
    ]
  },
  "summary": {
    "total_logs": 2,
    "total_lines": 47690,
    "total_detections": 2,
    "error_count": 0,
    "warning_count": 1,
    "info_count": 1,
    "by_service": {
      "jabber": 1,
      "cucm": 1
    },
    "analysis_duration_ms": 245
  }
}
```

### index.json (Global bundle registry)
```json
{
  "bundles": [
    {
      "id": "bundle_abc123",
      "name": "INC-12345: Presence Failure",
      "owner": "engineer@acme.com",
      "created_at": "2026-02-17T10:00:00Z",
      "updated_at": "2026-02-17T10:30:00Z",
      "log_count": 2,
      "case_id": "INC-12345",
      "tags": ["presence", "jabber", "cucm"],
      "analysis_status": "completed"
    }
  ],
  "last_updated": "2026-02-17T10:30:00Z"
}
```

---

## Implementation Plan

### Files to Create

#### 1. Core Bundle Management
- `lsp-server/src/bundle_manager.rs` - Bundle CRUD operations
- `lsp-server/src/service_detector.rs` - Auto-detect service type from log
- `lsp-server/src/bundle_analyzer.rs` - Run patterns on bundle logs
- `lsp-server/src/models/bundle.rs` - Data structures (move to dedicated module)
- `lsp-server/src/models/detection.rs` - Detection result structures

#### 2. Pattern Matching Enhancement
- Enhance `pattern_engine.rs` to accept service context
- Add filtering by service in pattern matching

#### 3. LSP Handler
- Add custom method handlers to `server.rs`

### Files to Modify

- `lsp-server/src/server.rs` - Add custom method handlers
- `lsp-server/src/lib.rs` - Expose new modules
- `lsp-server/Cargo.toml` - Add dependencies (uuid, chrono)

---

## Pattern Matching with Service Awareness

### Extended Pattern Structure

We enhance the existing `Pattern` struct to optionally specify which services it applies to:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pattern {
    pub id: String,
    pub name: String,
    pub pattern: String,
    pub annotation: String,
    pub severity: Severity,
    pub category: String,
    
    // NEW: Service filtering
    #[serde(default)]
    pub applies_to: Option<Vec<ServiceType>>,  // None = applies to all
}
```

### Analyzer Logic

```rust
pub fn should_analyze_pattern(
    pattern: &Pattern,
    service: &ServiceType,
) -> bool {
    match &pattern.applies_to {
        None => true,  // Applies to all services
        Some(services) => services.contains(service),
    }
}

pub async fn analyze_bundle_logs(
    bundle: &Bundle,
    engine: &PatternEngine,
) -> Vec<Detection> {
    let mut detections = Vec::new();
    
    for log in &bundle.logs {
        let content = std::fs::read_to_string(&log.uri)?;
        
        // Get patterns applicable to this service
        let patterns = engine.get_patterns();
        let applicable_patterns: Vec<_> = patterns
            .iter()
            .filter(|p| should_analyze_pattern(p, &log.service))
            .collect();
        
        // Run patterns on this log
        for (line_num, line) in content.lines().enumerate() {
            for pattern in &applicable_patterns {
                if let Some(matched) = pattern.regex.find(line) {
                    detections.push(Detection {
                        log_uri: log.uri.clone(),
                        pattern_id: pattern.id.clone(),
                        pattern_name: pattern.name.clone(),
                        line_number: line_num + 1,
                        matched_text: matched.as_str().to_string(),
                        severity: convert_severity(&pattern.severity),
                        service: log.service.clone(),
                    });
                }
            }
        }
    }
    
    detections
}
```

---

## UI Integration (VS Code Extension)

### Commands to Implement

```typescript
// Create a new bundle
vscode.commands.registerCommand('logScout.createBundle', async () => {
  const name = await vscode.window.showInputBox({
    prompt: 'Bundle name (e.g., INC-12345: Presence Failure)'
  });
  
  const result = await lspClient.sendRequest('custom/createBundle', {
    name
  });
  
  vscode.window.showInformationMessage(`Created bundle: ${result.bundle_id}`);
});

// Add current file to bundle
vscode.commands.registerCommand('logScout.addLogToBundle', async () => {
  const bundles = await lspClient.sendRequest('custom/listBundles', {});
  
  const selected = await vscode.window.showQuickPick(
    bundles.bundles.map(b => ({ label: b.name, bundle_id: b.id }))
  );
  
  if (selected) {
    const uri = vscode.window.activeTextEditor.document.uri.toString();
    
    await lspClient.sendRequest('custom/addLogToBundle', {
      bundle_id: selected.bundle_id,
      log_uri: uri
    });
    
    vscode.window.showInformationMessage('Log added to bundle');
  }
});

// Analyze bundle
vscode.commands.registerCommand('logScout.analyzeBundle', async () => {
  // ... similar to above, select bundle
  
  const result = await lspClient.sendRequest('custom/analyzeBundle', {
    bundle_id: selected.bundle_id
  });
  
  // Show results in diagnostics/output
});
```

### UI Views

1. **Bundles Explorer** sidebar showing all bundles
2. **Bundle Details** panel (logs, metadata, analysis results)
3. **Analysis Results** grouped by service and severity

---

## Testing Strategy

### Unit Tests
- Service detection (filename + content)
- Bundle CRUD operations
- Pattern filtering by service
- Analysis aggregation

### Integration Tests
- End-to-end bundle creation → add logs → analyze → view results
- Multiple logs with different services
- Storage persistence (write/read bundles)

### Manual Testing
- Create bundle with Jabber, CUCM, CUP logs
- Verify service detection
- Run analysis
- Verify results grouped by service

---

## Success Criteria

- ✅ Can create bundles with metadata
- ✅ Can add logs to bundles (any local file)
- ✅ Service type auto-detected from filename/content
- ✅ Patterns can specify `applies_to` for service filtering
- ✅ Bundles stored locally and persist across sessions
- ✅ Bundle analysis runs patterns on all logs
- ✅ Results grouped by service and severity
- ✅ LSP endpoints work via custom methods
- ✅ No changes to existing single-file analysis

---

## Next Steps After Phase 1

- Phase 2: Enhance patterns with timestamp format detection
- Phase 3: Add temporal correlation (cross-service anomalies)
- Phase 4: MongoDB persistence for team sharing

