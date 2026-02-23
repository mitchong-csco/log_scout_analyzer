# Bundle Output Impact Analysis

## Overview

The **Scout Log Output Reference Practices** document defines how LSP analysis results should be formatted and returned to clients. This has **significant implications** for how bundles store, retrieve, and display analysis results.

## Current Bundle Architecture

### Bundle Data Model (Rust)

```rust
pub struct Bundle {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub logs: Vec<BundleLog>,
    pub metadata: BundleMetadata,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub analysis: Option<BundleAnalysisResult>,  // ⚠️ KEY FIELD
}
```

### Bundle Analysis Result Structure

```rust
pub struct BundleAnalysisResult {
    pub bundle_id: String,
    pub detections: Vec<Detection>,
    pub by_service: HashMap<String, Vec<Detection>>,
    pub by_pattern: HashMap<String, Vec<Detection>>,
    pub statistics: AnalysisStatistics,
    pub analyzed_at: DateTime<Utc>,
    pub duration_ms: u64,
}
```

## How Output Practices Affect Bundles

### 1. **Analysis Result Storage**

#### Current State
- Bundle analysis results are stored in `bundle.analysis` field
- Results are persisted to `bundle.json` in `.log-scout/bundles/{id}/`
- Each bundle has a single `BundleAnalysisResult` object

#### Impact of Output Practices
The output format defined in the reference practices determines:

✅ **What gets stored:**
- All `Detection` objects with full context
- Groupings by service and pattern
- Statistics and summaries
- Timestamps and duration

✅ **How it's structured:**
- Must match the LSP response format for consistency
- Enables easy serialization/deserialization between LSP and bundle storage
- Ensures compatibility with VSCode extension consumers

### 2. **Bundle Analysis Workflow**

```
User Action → Bundle.analyzeBundle() → LSP Request → Pattern Matching
     ↓                                                      ↓
Refresh UI ← Store in Bundle ← Format Response ← Return Detections
```

#### Critical Integration Points

**A. LSP Response Format**
```rust
// From lsp_handlers.rs
pub async fn analyze_bundle(&self, bundle_id: String) -> Result<AnalyzeBundleResponse>
```

The response MUST adhere to Scout Log Output Reference Practices:
- **Structured diagnostics** for each detection
- **Severity levels** (Error, Warning, Info)
- **Location information** (file URI, line number, column)
- **Related information** for cross-file correlations
- **Code actions** for suggested fixes

**B. Bundle Storage Format**
```json
{
  "id": "bundle_123",
  "name": "INC-12345: Presence Failure",
  "analysis": {
    "bundle_id": "bundle_123",
    "detections": [...],
    "by_service": {...},
    "by_pattern": {...},
    "statistics": {...},
    "analyzed_at": "2024-01-15T10:30:00Z",
    "duration_ms": 1250
  }
}
```

### 3. **Detection Objects and LSP Diagnostics**

#### Alignment Required

The `Detection` struct must map cleanly to LSP `Diagnostic` format:

```rust
pub struct Detection {
    pub bundle_id: String,        // → Custom data
    pub log_uri: String,          // → Diagnostic.uri
    pub service: ServiceType,     // → Custom data
    pub pattern_id: String,       // → Diagnostic.code
    pub pattern_name: String,     // → Diagnostic.message (prefix)
    pub line_number: usize,       // → Diagnostic.range.start.line
    pub matched_text: String,     // → Diagnostic.range (highlight)
    pub log_line: String,         // → Diagnostic.message
    pub severity: DetectionSeverity, // → Diagnostic.severity
    pub detected_at: DateTime<Utc>, // → Custom data
    pub extracted_fields: HashMap<String, String>, // → Diagnostic.data
}
```

#### Key Considerations

1. **Severity Mapping**
   ```rust
   DetectionSeverity::Error   → DiagnosticSeverity::Error
   DetectionSeverity::Warning → DiagnosticSeverity::Warning
   DetectionSeverity::Info    → DiagnosticSeverity::Information
   ```

2. **Location Precision**
   - Must include precise line and column ranges
   - Enable "Go to Detection" functionality
   - Support inline squiggles in editor

3. **Related Information**
   - For multi-log correlations (e.g., Jabber → CUCM)
   - Cross-reference detections across bundle logs
   - Link cause-and-effect patterns

### 4. **Bundle Panel Display**

#### Data Flow to Action Panel

```
Bundle Analysis → ScoutAnalyzerPanel.setDataProvider() → Webview
                        ↓
                  resultsTreeProvider
                        ↓
                  Group by Bundle ID
                        ↓
                  Display in UI
```

#### UI Requirements Driven by Output Format

Based on the output practices, the action panel must:

✅ **Show Detection Context**
- Full log line with highlighting
- Service and log file source
- Pattern name and ID
- Severity with visual indicators

✅ **Enable Navigation**
- Click to jump to exact line/column in log file
- Open related files in bundle
- Show all detections for a pattern

✅ **Provide Filtering**
- By severity (Error/Warning/Info)
- By service type (Jabber/CUCM/CUP/etc.)
- By pattern category
- By time range (using `detected_at`)

✅ **Display Statistics**
```typescript
interface BundleStats {
  totalDetections: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  servicesAnalyzed: number;
  patternsMatched: number;
}
```

### 5. **Multi-Log Cross-References**

#### Challenge
Bundles contain multiple log files that may reference the same events:
- Jabber client logs (user side)
- CUCM logs (server side)
- Network traces (packet level)

#### Solution Using Output Practices

**Related Information Links:**
```rust
Diagnostic {
    uri: "jabber.log",
    range: Line 150,
    message: "SIP INVITE timeout",
    related_information: vec![
        DiagnosticRelatedInformation {
            location: Location {
                uri: "cucm.log",
                range: Line 523
            },
            message: "Corresponding server-side timeout"
        }
    ]
}
```

**Bundle Analysis Must:**
1. Detect correlations across bundle logs
2. Create bidirectional links
3. Store in `Detection.extracted_fields` with keys like:
   - `"related_log_uri"`
   - `"related_line_number"`
   - `"correlation_id"` (e.g., SIP Call-ID)

### 6. **Performance Implications**

#### Bundle Analysis at Scale

**Typical Bundle:**
- 5-15 log files
- 10,000-500,000 total lines
- 100-5,000 pattern matches

#### Output Format Impact

**❌ Anti-Pattern: Returning All Detections Immediately**
```rust
// DON'T: Send 5000 diagnostics at once
let all_detections = analyze_entire_bundle();
return all_detections; // Overwhelms client
```

**✅ Best Practice: Progressive/Paginated Results**
```rust
// DO: Stream results as analysis progresses
for log in bundle.logs {
    let detections = analyze_log(log);
    send_partial_results(detections); // Send per-file
}
```

**Reference Practice Alignment:**
- Use LSP's `workspace/diagnostic` for bundle-wide updates
- Send `textDocument/publishDiagnostics` per log file
- Store complete results in bundle for offline access

### 7. **Bundle Export/Import**

#### Export Format Requirements

When exporting bundles (for sharing or archiving):

```json
{
  "bundle": {
    "id": "bundle_123",
    "name": "INC-12345",
    "logs": [...],
    "analysis": {
      "detections": [
        {
          "log_uri": "relative/path/jabber.log",  // ⚠️ Must be relative
          "line_number": 150,
          "pattern_id": "jabber:sip_timeout",
          "severity": "Error",
          "matched_text": "SIP INVITE timeout",
          "log_line": "2024-01-15 10:30:15.123 [ERROR] SIP INVITE timeout",
          "extracted_fields": {
            "timestamp": "2024-01-15T10:30:15.123Z",
            "call_id": "abc123@example.com"
          }
        }
      ]
    }
  },
  "format_version": "1.0",
  "exported_at": "2024-01-15T11:00:00Z"
}
```

**Key Requirement:**
- File paths must be **relative** or remappable
- Timestamps must be **ISO 8601** for portability
- Extracted fields must be **JSON-serializable**

#### Import Validation

When importing bundles, validate against output practices:

✅ Check detection structure
✅ Verify severity values
✅ Validate line numbers (must be within file bounds)
✅ Ensure pattern IDs exist in pattern library
✅ Remap file URIs to local workspace

### 8. **Bundle Comparison & Diffing**

#### Use Case
Compare analysis results between:
- Different bundle versions (before/after config change)
- Different time periods (initial vs. follow-up logs)
- Different environments (dev vs. prod)

#### Output Format Enables Comparison

```rust
pub fn compare_bundles(
    bundle_a: &BundleAnalysisResult,
    bundle_b: &BundleAnalysisResult
) -> BundleComparison {
    BundleComparison {
        new_detections: detections_in_b_not_in_a,
        resolved_detections: detections_in_a_not_in_b,
        common_detections: detections_in_both,
        severity_changes: detect_severity_changes(),
        pattern_frequency_changes: compare_pattern_counts(),
    }
}
```

**Requires:**
- Stable detection IDs (based on pattern + location)
- Normalized extracted fields for comparison
- Consistent severity levels (per output practices)

## Action Items & Recommendations

### ✅ Immediate Actions

1. **Align Detection → Diagnostic Conversion**
   - Create helper function in `lsp_handlers.rs`
   - Ensure all Detection fields map to LSP Diagnostic properly
   - Test with multi-log bundles

2. **Update Bundle Serialization**
   - Ensure `bundle.json` format matches LSP output structure
   - Add format version field for future compatibility
   - Document JSON schema

3. **Enhance Action Panel Display**
   - Use resultsTreeProvider data (already connected via LSP_DATA_PROVIDER_FIX)
   - Group detections by bundle ID
   - Show bundle-level statistics
   - Enable bundle-wide filtering

### 🔧 Short-term Improvements

1. **Add Related Information Support**
   - Implement cross-log correlation in bundle analyzer
   - Store correlations in Detection.extracted_fields
   - Display related detections in action panel

2. **Implement Progressive Analysis**
   - Stream results as bundle analysis progresses
   - Show per-file progress in UI
   - Cache results to avoid re-analysis

3. **Bundle Export/Import**
   - Create export command with proper format
   - Add import validation against output practices
   - Support path remapping for portability

### 🚀 Long-term Enhancements

1. **Bundle Timeline View**
   - Use `detected_at` timestamps
   - Visualize detections across time
   - Correlate events chronologically

2. **Bundle Comparison Tool**
   - Compare analysis results between bundles
   - Show detection diffs
   - Track pattern trends over time

3. **Bundle Templates**
   - Pre-configured analysis profiles
   - Service-specific pattern sets
   - Custom output formats for different use cases

## Integration Checklist

When implementing bundle features, verify:

- [ ] Detection objects follow LSP Diagnostic structure
- [ ] Severity levels match reference practices
- [ ] Location information includes line/column ranges
- [ ] Extracted fields are JSON-serializable
- [ ] File URIs are relative or remappable
- [ ] Timestamps use ISO 8601 format
- [ ] Related information links are bidirectional
- [ ] Statistics aggregate correctly across logs
- [ ] Export format is version-tagged
- [ ] Import validates against schema
- [ ] Action panel displays all detection fields
- [ ] Navigation works across bundle logs
- [ ] Filtering respects bundle boundaries
- [ ] Performance scales to large bundles

## Conclusion

The Scout Log Output Reference Practices define a **structured, standardized format** for analysis results. Bundles must:

1. **Store** analysis results in this format
2. **Serialize** bundle.json with this structure
3. **Display** detections using this information
4. **Export/Import** with format compatibility
5. **Navigate** using location data
6. **Correlate** via related information

**Key Benefit:** By aligning bundle storage with LSP output practices, we achieve:
- ✅ Consistency across the entire system
- ✅ Easy data flow from LSP → Bundle → Action Panel → UI
- ✅ Portability of bundle files between systems
- ✅ Future-proof format with versioning support

**Status:** 🟡 Partial alignment exists, improvements needed per action items above.

**Last Updated:** 2024-01-15