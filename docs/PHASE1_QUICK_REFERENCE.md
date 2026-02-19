# Phase 1: Local Log Bundling - Quick Reference Card

**Status**: Core implementation complete, ready for LSP integration  
**Date**: February 17, 2026  

---

## What is a Bundle?

A **Bundle** is a group of log files from different services (Jabber, CUCM, CUP, etc.) organized to investigate a single issue.

```
Bundle: "INC-12345: Presence Failure"
├─ Jabber.log           (Service: Jabber, Type: Trace)
├─ CUCM_trace.log       (Service: CUCM, Type: Trace)
└─ CUP_service.log      (Service: CUP, Type: Debug)
    ↓
    [Run pattern matching on all logs]
    ↓
    Results grouped by service & pattern
```

---

## Files Created

| File | Purpose |
|------|---------|
| `lsp-server/src/bundle/mod.rs` | Module root, exports all bundle components |
| `lsp-server/src/bundle/models.rs` | Data structures (Bundle, Detection, etc.) |
| `lsp-server/src/bundle/service_detector.rs` | Auto-detect service type from filename/content |
| `lsp-server/src/bundle/manager.rs` | Bundle CRUD operations + filesystem storage |
| `lsp-server/src/bundle/analyzer.rs` | Run pattern matching on bundles |
| `lsp-server/src/lib.rs` (modified) | Added `pub mod bundle;` |
| `lsp-server/Cargo.toml` (modified) | Added `uuid` dependency |

---

## Core Data Structures

### Bundle
```rust
Bundle {
    id: String,                          // Unique ID
    name: String,                        // User-friendly name
    logs: Vec<BundleLog>,               // Logs in bundle
    metadata: BundleMetadata,           // Case ID, severity, tags, owner
    analysis: Option<BundleAnalysisResult>, // Results
    created_at, updated_at: DateTime,   // Timestamps
}
```

### BundleLog
```rust
BundleLog {
    uri: String,                        // File path
    service: ServiceType,               // Jabber|CUCM|CUP|Unity|SIP|Network|Custom
    log_type: LogType,                  // Trace|Debug|Error|Warning|Audit|CDR|Activity
    size_bytes: u64,
    line_count: usize,
    timestamp_format: Option<String>,
    added_at: DateTime,
}
```

### Detection (Analysis Result)
```rust
Detection {
    log_uri: String,                    // Which log
    pattern_id: String,                 // Pattern that matched
    pattern_name: String,
    line_number: usize,                 // Where in log
    matched_text: String,               // What matched
    severity: DetectionSeverity,        // Error|Warning|Info|Hint
    service: ServiceType,               // Which service
}
```

---

## LSP Custom Methods (Ready to Implement)

### 1. Create Bundle
```
POST custom/createBundle
{
  name: "INC-12345: Issue Description",
  description?: "Optional details",
  metadata?: { case_id, severity, tags, owner }
}
→ { bundle_id, created_at }
```

### 2. Add Log to Bundle
```
POST custom/addLogToBundle
{
  bundle_id: "bundle_abc123",
  log_uri: "file:///path/to/log.log"
  // service auto-detected from filename/content
}
→ { bundle_id, log_uri, service, log_type, size_bytes, line_count }
```

### 3. Analyze Bundle
```
POST custom/analyzeBundle
{
  bundle_id: "bundle_abc123"
}
→ {
    analysis: {
      detections: [...],
      by_service: { jabber: [...], cucm: [...], ... },
      by_pattern: { pattern_id: [...], ... },
      summary: { total_detections, error_count, ... }
    }
  }
```

### 4. Get Bundle
```
POST custom/getBundle
{ bundle_id: "bundle_abc123" }
→ { bundle: { id, name, logs, metadata, analysis, ... } }
```

### 5. List Bundles
```
POST custom/listBundles
{ filter?: { case_id?, tag?, owner? } }
→ { bundles: [{ id, name, log_count, created_at, ... }] }
```

### 6. Delete Bundle
```
POST custom/deleteBundle
{ bundle_id: "bundle_abc123" }
→ { success: true, deleted_at }
```

---

## Service Auto-Detection

| Service | Detected From | Examples |
|---------|---------------|----------|
| **Jabber** | Filename contains "jabber" OR content has "Cisco Jabber", "CSF" | Jabber.log, jabber_trace.log |
| **CUCM** | Filename contains "cucm", "cm_", "callmanager" OR content has "CallManager" | CUCM_trace.log, cm_platform.log |
| **CUP** | Filename contains "cup", "presence" OR content has "Presence", "XCP" | CUP_service.log, presence.log |
| **Unity** | Filename contains "unity", "voicemail" | Unity.log, voicemail_trace.log |
| **SIP** | Filename contains "sip", "pcap" OR content has "SIP/2.0", "Via:" | sip_trace.log, network.pcap |
| **Network** | Filename contains "network", "packet" | network_trace.log |

---

## Storage on Filesystem

```
Workspace/
└─ .log-scout/
   └─ bundles/
      ├─ index.json                    ← Registry of all bundles
      ├─ bundle_abc123def456/
      │  ├─ bundle.json                ← Metadata
      │  ├─ results.json                ← Analysis results (optional)
      │  └─ logs/                       ← Log file references
      │     ├─ Jabber.log
      │     └─ CUCM_trace.log
      └─ bundle_xyz789uvw/
         └─ ... (same)
```

---

## Usage Example (JavaScript/LSP Client)

```javascript
// 1. Create bundle
const { bundle_id } = await lsp.sendRequest('custom/createBundle', {
  name: 'INC-12345: Presence Failure',
  metadata: { case_id: 'INC-12345', severity: 'high' }
});

// 2. Add logs (auto-detects Jabber)
await lsp.sendRequest('custom/addLogToBundle', {
  bundle_id,
  log_uri: 'file:///C:/logs/Jabber.log'
});

// 3. Add logs (auto-detects CUCM)
await lsp.sendRequest('custom/addLogToBundle', {
  bundle_id,
  log_uri: 'file:///C:/logs/CUCM_trace.log'
});

// 4. Analyze
const { analysis } = await lsp.sendRequest('custom/analyzeBundle', {
  bundle_id
});

// 5. View results grouped by service
console.log(analysis.summary.by_service);
// Output: { jabber: 12, cucm: 8 }

// 6. Get specific pattern matches
console.log(analysis.by_pattern['pattern_jabber_offline']);
```

---

## Key Features

✅ **Service-Aware**: Automatically detects Jabber, CUCM, CUP, Unity, SIP, Network  
✅ **Local Storage**: No database required - uses `.log-scout/bundles/` directory  
✅ **Pattern Matching**: Integrates with existing pattern engine  
✅ **Results Aggregation**: Groups detections by service and pattern  
✅ **Persistent**: Bundles survive LSP server restarts  
✅ **Extensible**: Easy to add more services and detection rules  

---

## Next Steps (Implementation Roadmap)

### Immediate (This Sprint)
1. ✅ Core data models - DONE
2. ✅ Service detection - DONE
3. ✅ Bundle manager (CRUD) - DONE
4. ✅ Bundle analyzer (pattern matching) - DONE
5. ⏳ Add LSP handlers to server.rs
6. ⏳ Test bundle workflow end-to-end

### Short Term (Next Sprint)
7. Add VS Code extension UI (Bundles sidebar)
8. Display results in editor
9. Filter patterns by service (Phase 2 prep)

### Medium Term (Phase 2+)
10. Timestamp alignment across logs
11. Cross-service anomaly detection
12. MongoDB persistence for team sharing
13. RBAC and collaboration features

---

## Testing Checklist

- [ ] Unit tests pass: `cargo test -p log-scout-lsp-server bundle::`
- [ ] Bundle creation and listing works
- [ ] Service detection accurate for Jabber, CUCM, CUP
- [ ] Pattern matching on multi-service bundle works
- [ ] Results properly grouped by service
- [ ] Filesystem storage correct (check .log-scout/bundles/)
- [ ] LSP handlers return correct JSON responses
- [ ] End-to-end: create → add → analyze → delete

---

## Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Create bundle | < 10ms | JSON write |
| Add log | < 50ms | File stats + metadata |
| Analyze (100KB bundle) | < 500ms | Pattern matching |
| List bundles | < 100ms | Index read |
| Delete bundle | < 50ms | Filesystem cleanup |

---

## Error Handling

```rust
pub enum BundleError {
    IoError(std::io::Error),                    // File system errors
    SerializationError(serde_json::Error),      // JSON parse errors
    BundleNotFound(String),                     // ID not found
    InvalidBundle(String),                      // Corrupted data
}
```

---

## Dependencies

```toml
[dependencies]
uuid = { version = "1.0", features = ["serde", "v4"] }
chrono = { version = "0.4", features = ["serde"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

---

## Integration Points with Existing Code

| Module | Integration | Status |
|--------|-------------|--------|
| Pattern Engine | Use `process_line()` for pattern matching | ✅ Ready |
| Tagscout Service | Will use patterns from TagScout | ✅ Ready |
| LSP Server | Add custom method handlers | ⏳ TODO |
| VS Code Extension | New Bundles UI panel | ⏳ TODO |
| Zed Extension | New Bundles command palette | ⏳ TODO |

---

## Known Limitations

- **No temporal alignment**: Different log timestamps not synchronized (Phase 2)
- **No cross-service patterns**: Can't detect anomalies across services (Phase 2)
- **No service filtering**: All patterns run on all logs (Phase 2)
- **Local only**: No MongoDB backing (Phase 3)
- **Single-user**: No team sharing (Phase 4)

---

## Questions?

Refer to detailed documentation:
- `PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` - Complete design spec
- `PHASE1_IMPLEMENTATION_SUMMARY.md` - Architecture and modules
- `PHASE1_LSP_INTEGRATION_GUIDE.md` - How to integrate with LSP server

