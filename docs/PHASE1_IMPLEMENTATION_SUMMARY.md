# Phase 1 Implementation: Local Log Bundling - Integration Summary

**Status**: Core Implementation Complete  
**Date**: February 17, 2026  
**What's Done**: Foundation for log bundling system

---

## Files Created

### 1. Bundle Module Structure
```
lsp-server/src/bundle/
├─ mod.rs                  (Module root)
├─ models.rs              (Data structures)
├─ service_detector.rs    (Service type detection)
├─ manager.rs             (Bundle CRUD operations)
└─ analyzer.rs            (Pattern matching on bundles)
```

### 2. Updated Files
- `lsp-server/src/lib.rs` - Added `pub mod bundle;`
- `lsp-server/Cargo.toml` - Added `uuid` dependency

---

## Core Components

### Data Models (models.rs)

**Bundle** - Top-level container for a log investigation
- `id: String` - Unique identifier (UUID-based)
- `name: String` - Human-readable name
- `logs: Vec<BundleLog>` - Logs grouped in this bundle
- `metadata: BundleMetadata` - Case ID, severity, tags, owner
- `analysis: Option<BundleAnalysisResult>` - Results after analysis
- `created_at, updated_at: DateTime<Utc>` - Timestamps

**BundleLog** - Single log file with service metadata
- `uri: String` - File path or LSP URI
- `service: ServiceType` - Jabber, CUCM, CUP, Unity, SIP, Network
- `log_type: LogType` - Trace, Debug, Error, Warning, Audit, etc.
- `size_bytes, line_count` - File metrics
- `timestamp_format: Option<String>` - Format of timestamps in log

**Detection** - A single pattern match in a log
- `log_uri: String` - Which log this came from
- `pattern_id, pattern_name: String` - Pattern metadata
- `line_number, matched_text: String` - Match location and text
- `severity: DetectionSeverity` - Error/Warning/Info/Hint
- `service: ServiceType` - Source service

**BundleAnalysisResult** - Complete analysis output
- `detections: Vec<Detection>` - All matches
- `by_service: HashMap<ServiceType, Vec<Detection>>` - Grouped by service
- `by_pattern: HashMap<String, Vec<Detection>>` - Grouped by pattern
- `summary: AnalysisSummary` - Statistics

### Service Detector (service_detector.rs)

**ServiceDetector::detect(filename, content)** - Auto-detect service type
- **Filename patterns**: Case-insensitive matching for "jabber", "cucm", "cup", "unity", "sip", "network"
- **Content signatures**: Regex patterns in file header (first 50 lines) to confirm detection
- **Fallback**: Custom service with filename if undetectable

**ServiceDetector::detect_log_type(content)** - Categorize log type
- Looks for keywords: "trace", "debug", "error", "warning", "audit", "cdr", "activity"

**ServiceDetector::detect_timestamp_format(content)** - Extract timestamp format pattern
- Heuristic: Looks for common formats like "YYYY-MM-DD HH:mm:ss,SSS"

### Bundle Manager (manager.rs)

**BundleManager::new(workspace_root)** - Initialize bundle system
- Creates `.log-scout/bundles/` directory structure
- Initializes `index.json` (global bundle registry)

**BundleManager::create_bundle(name, description, metadata)** - Create new bundle
- Generates UUID-based ID
- Creates bundle directory and metadata JSON
- Returns bundle ID

**BundleManager::add_log_to_bundle(bundle_id, log_uri, service, log_type)** - Add log to bundle
- Reads file (gets size, line count)
- Auto-detects service type from filename/content
- Saves BundleLog metadata
- Updates bundle and index

**BundleManager::get_bundle(bundle_id)** - Load bundle from disk
**BundleManager::list_bundles(filter_case_id, filter_tag, filter_owner)** - List with optional filters
**BundleManager::delete_bundle(bundle_id)** - Remove bundle and its data

### Bundle Analyzer (analyzer.rs)

**BundleAnalyzer::analyze_bundle(bundle, pattern_engine)** - Run analysis
- Iterates through each log in bundle
- For each line, calls `pattern_engine.process_line()`
- Collects all Pattern matches
- Converts to `Detection` objects with service context
- Groups by service and pattern
- Computes summary statistics

---

## Storage Layout

### Filesystem Structure
```
Workspace Root/
└─ .log-scout/
   └─ bundles/
      ├─ index.json                    (global bundle registry)
      ├─ bundle_abc123def456/
      │  ├─ bundle.json               (metadata + log references)
      │  ├─ results.json              (analysis results) [optional]
      │  └─ logs/
      │     ├─ Jabber.log             (symlink or copy)
      │     └─ CUCM_trace.log         (symlink or copy)
      └─ bundle_xyz789uvw/
         └─ ... (same structure)
```

### Example: bundle.json
```json
{
  "id": "bundle_abc123def456",
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
    }
  ],
  "metadata": {
    "case_id": "INC-12345",
    "severity": "high",
    "tags": ["presence", "jabber"],
    "owner": "engineer@acme.com"
  },
  "created_at": "2026-02-17T10:00:00Z",
  "updated_at": "2026-02-17T10:30:00Z",
  "analysis": null
}
```

---

## Next Steps: LSP Integration

To fully integrate bundles with the LSP server, we need to:

### 1. Add Custom Method Handlers in server.rs

```rust
// In LogScoutServer::execute() or new execute_custom() method:

match method.as_str() {
    "custom/createBundle" => {
        let params: CreateBundleParams = serde_json::from_value(params)?;
        let bundle_id = self.bundle_manager
            .create_bundle(params.name, params.description, params.metadata)?;
        Ok(serde_json::json!({ "bundle_id": bundle_id }))
    },
    "custom/addLogToBundle" => {
        let params: AddLogParams = serde_json::from_value(params)?;
        let log = self.bundle_manager
            .add_log_to_bundle(&params.bundle_id, &params.log_uri, None, None)?;
        Ok(serde_json::to_value(log)?)
    },
    "custom/analyzeBundle" => {
        let params: AnalyzeBundleParams = serde_json::from_value(params)?;
        let mut bundle = self.bundle_manager.get_bundle(&params.bundle_id)?;
        
        let pattern_engine = self.pattern_engine.read().await
            .as_ref()
            .ok_or("No pattern engine available")?;
        
        let analysis = BundleAnalyzer::analyze_bundle(&bundle, pattern_engine)?;
        bundle.analysis = Some(analysis.clone());
        self.bundle_manager.save_bundle(&bundle)?;
        
        Ok(serde_json::to_value(analysis)?)
    },
    // ... more methods
}
```

### 2. Update Server Initialization

```rust
pub async fn initialize_bundles(&self, workspace_path: Option<&str>) -> Result<(), String> {
    if let Some(path) = workspace_path {
        let manager = BundleManager::new(Path::new(path))
            .map_err(|e| format!("Failed to initialize bundle manager: {}", e))?;
        *self.bundle_manager.write().await = Some(manager);
        Ok(())
    } else {
        Err("Workspace path not available".to_string())
    }
}
```

### 3. Extend Server Struct

```rust
pub struct LogScoutServer {
    // ... existing fields
    bundle_manager: Arc<RwLock<Option<BundleManager>>>,
}
```

---

## Testing Checklist

### Unit Tests (Completed)
- ✅ Service detection from filename
- ✅ Service detection from content
- ✅ Bundle creation
- ✅ Bundle listing

### Integration Tests (TODO)
- Bundle creation → add log → get bundle
- Multiple logs in one bundle
- Analysis on bundle with multiple services
- Results grouped by service

### Manual Testing (TODO)
1. Create bundle with test logs
2. Add Jabber, CUCM, CUP logs
3. Verify service auto-detection
4. Run analysis through LSP
5. Verify results grouped by service

---

## API Endpoints to Implement

### Create Bundle
```
Method: custom/createBundle
Request: {
  name: string,
  description?: string,
  metadata?: {
    case_id?: string,
    severity?: string,
    tags?: string[],
    owner?: string
  }
}
Response: {
  bundle_id: string,
  created_at: string
}
```

### Add Log to Bundle
```
Method: custom/addLogToBundle
Request: {
  bundle_id: string,
  log_uri: string,
  service?: ServiceType,
  log_type?: LogType
}
Response: {
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

### Analyze Bundle
```
Method: custom/analyzeBundle
Request: {
  bundle_id: string,
  force_reanalyze?: boolean
}
Response: {
  bundle_id: string,
  analysis: BundleAnalysisResult,
  analysis_duration_ms: number
}
```

### Get Bundle
```
Method: custom/getBundle
Request: { bundle_id: string }
Response: { bundle: Bundle }
```

### List Bundles
```
Method: custom/listBundles
Request: {
  filter?: {
    tag?: string,
    owner?: string,
    case_id?: string
  }
}
Response: { bundles: BundleInfo[] }
```

### Delete Bundle
```
Method: custom/deleteBundle
Request: { bundle_id: string }
Response: { success: boolean }
```

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│  VS Code / Zed Extension            │
│  - Create Bundle UI                 │
│  - Add Logs to Bundle               │
│  - Analyze Bundle                   │
│  - View Results                     │
└────────────┬────────────────────────┘
             │ LSP custom/createBundle
             │ LSP custom/addLogToBundle
             │ LSP custom/analyzeBundle
             ▼
┌─────────────────────────────────────┐
│  LSP Server (LogScoutServer)        │
│  - Custom method handlers           │
│  - Bundle Manager instance          │
│  - Pattern Engine instance          │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        ▼         ▼
   ┌─────────┐ ┌──────────────┐
   │ Bundle  │ │ Pattern      │
   │ Manager │ │ Engine       │
   └────┬────┘ └──────────────┘
        │
        ▼
   ┌─────────────────────────┐
   │ Filesystem Storage      │
   │ .log-scout/bundles/     │
   │ ├─ index.json           │
   │ ├─ bundle_xxx/          │
   │ │  ├─ bundle.json       │
   │ │  ├─ results.json      │
   │ │  └─ logs/             │
   │ └─ bundle_yyy/          │
   └─────────────────────────┘
```

---

## Phase 1 Completion Checklist

- ✅ Data models (Bundle, BundleLog, Detection, BundleAnalysisResult)
- ✅ Service detection (Jabber, CUCM, CUP, Unity, SIP, Network)
- ✅ Bundle management (CRUD operations)
- ✅ Analysis execution (pattern matching on logs)
- ✅ Filesystem storage (.log-scout/bundles/)
- ✅ Index tracking (index.json)
- ⏳ LSP custom method handlers (in progress)
- ⏳ VS Code extension UI (next)
- ⏳ End-to-end testing (next)

---

## Dependencies Added

```toml
uuid = { version = "1.0", features = ["serde", "v4"] }
```

(chrono already present)

---

## Known Limitations & Future Work

### Phase 1 Limitations
- No temporal alignment (different timestamps not correlated)
- No cross-service anomaly detection
- No pattern service filtering (all patterns run on all logs)
- No MongoDB persistence (local filesystem only)
- No team sharing

### Phase 2+ Enhancements
- Add pattern `applies_to` field for service filtering
- Timestamp format detection and alignment
- Cross-service pattern matching
- MongoDB backing for large collections
- Team sharing and RBAC

---

## Usage Example (LSP Client Perspective)

```javascript
// Create a bundle
const createResult = await lspClient.sendRequest('custom/createBundle', {
  name: 'INC-12345: Presence Failure',
  description: 'User alice cannot register for presence',
  metadata: {
    case_id: 'INC-12345',
    severity: 'high',
    tags: ['presence', 'jabber', 'cucm'],
    owner: 'engineer@acme.com'
  }
});
const bundleId = createResult.bundle_id;

// Add logs to bundle
await lspClient.sendRequest('custom/addLogToBundle', {
  bundle_id: bundleId,
  log_uri: 'file:///C:/logs/Jabber.log'
  // service will be auto-detected as "jabber"
});

await lspClient.sendRequest('custom/addLogToBundle', {
  bundle_id: bundleId,
  log_uri: 'file:///C:/logs/CUCM_trace.log'
  // service will be auto-detected as "cucm"
});

// Analyze the bundle
const analysisResult = await lspClient.sendRequest('custom/analyzeBundle', {
  bundle_id: bundleId
});

console.log(`Found ${analysisResult.analysis.summary.total_detections} issues`);
console.log(`Jabber issues: ${analysisResult.analysis.summary.by_service.jabber}`);
console.log(`CUCM issues: ${analysisResult.analysis.summary.by_service.cucm}`);
```

