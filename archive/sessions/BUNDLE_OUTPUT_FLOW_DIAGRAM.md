# Bundle Output Data Flow Diagram

## Overview: How Output Format Affects Bundles

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCOUT LOG OUTPUT REFERENCE PRACTICES                  │
│                         (Authoritative Format)                           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ Defines structure for:
                             │ • Diagnostics
                             │ • Severity levels
                             │ • Location info
                             │ • Related information
                             │ • Extracted fields
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌────────────────┐                      ┌────────────────┐
│  LSP ANALYSIS  │                      │ BUNDLE STORAGE │
│  (Rust Core)   │                      │  (bundle.json) │
└────────┬───────┘                      └────────┬───────┘
         │                                       │
         │ Returns:                              │ Contains:
         │ • AnalyzeBundleResponse               │ • BundleAnalysisResult
         │ • Vec<Detection>                      │ • Vec<Detection>
         │ • Statistics                          │ • by_service HashMap
         │                                       │ • by_pattern HashMap
         │                                       │
         └───────────────┬───────────────────────┘
                         │
                         │ Both use same Detection format
                         │
                         ▼
         ┌───────────────────────────────┐
         │      DETECTION OBJECT         │
         │                               │
         │  • log_uri: String            │
         │  • line_number: usize         │
         │  • matched_text: String       │
         │  • severity: DetectionSeverity│
         │  • pattern_id: String         │
         │  • extracted_fields: HashMap  │
         └───────────────┬───────────────┘
                         │
                         │ Consumed by:
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼                               ▼
┌────────────────┐              ┌────────────────┐
│ RESULTS TREE   │              │ ACTION PANEL   │
│ PROVIDER       │◄─────────────┤ (Webview UI)   │
└────────┬───────┘              └────────┬───────┘
         │                               │
         │ Provides:                     │ Displays:
         │ • Tree items                  │ • Detection cards
         │ • Grouping                    │ • Statistics
         │ • Filtering                   │ • Navigation links
         │                               │ • Severity badges
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   USER DISPLAY   │
              │                  │
              │  [ERROR] Line 150│
              │  SIP timeout     │
              │  ↳ See cucm.log  │
              └──────────────────┘
```

## Data Flow Sequence

```
1. USER ACTION
   └─► "Analyze Bundle"
       │
       ▼
2. LSP REQUEST
   └─► scout/bundle/analyze { bundleId: "bundle_123" }
       │
       ▼
3. PATTERN MATCHING (Rust)
   ├─► Load bundle logs
   ├─► Run pattern matching
   ├─► Create Detection objects
   └─► Group by service/pattern
       │
       ▼
4. LSP RESPONSE (Follows Output Practices)
   └─► AnalyzeBundleResponse {
       │   detections: Vec<Detection>,
       │   statistics: AnalysisStatistics,
       │   ...
       │ }
       ▼
5. STORE IN BUNDLE
   └─► bundle.analysis = Some(BundleAnalysisResult)
       └─► Save to .log-scout/bundles/{id}/bundle.json
           │
           ▼
6. UPDATE PROVIDERS
   ├─► resultsTreeProvider.refresh()
   └─► ScoutAnalyzerPanel.sendResultsData()
       │
       ▼
7. RENDER IN UI
   └─► Action panel displays:
       ├─► Statistics dashboard
       ├─► Detection list (grouped)
       ├─► Navigation controls
       └─► Filter options
```

## Detection → Diagnostic Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                    DETECTION (Bundle Storage)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  bundle_id: "bundle_123"           ┌─────────────────────────┐  │
│  log_uri: "jabber.log"  ──────────►│ LSP Diagnostic.uri      │  │
│  service: Jabber                   └─────────────────────────┘  │
│  pattern_id: "jabber:sip_timeout"  ┌─────────────────────────┐  │
│  pattern_name: "SIP Timeout"       │ LSP Diagnostic.code     │  │
│  line_number: 150  ────────────────►│ LSP Diagnostic.range    │  │
│  matched_text: "timeout"           └─────────────────────────┘  │
│  log_line: "...full line..."       ┌─────────────────────────┐  │
│  severity: Error  ─────────────────►│ LSP Diagnostic.severity │  │
│  detected_at: "2024-01-15..."      └─────────────────────────┘  │
│  extracted_fields: {               ┌─────────────────────────┐  │
│    "call_id": "abc@ex.com",        │ LSP Diagnostic.data     │  │
│    "timestamp": "10:30:15"  ───────►│ (custom JSON)           │  │
│  }                                 └─────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Multi-Log Correlation Flow

```
Bundle: INC-12345
├─── jabber.log
│    └─► Detection @ line 150
│        ├─ Message: "SIP INVITE timeout"
│        ├─ Extracted: call_id = "abc@example.com"
│        └─► related_information: [
│                location: "cucm.log:523"  ◄───┐
│            ]                                  │
│                                               │
├─── cucm.log                                   │
│    └─► Detection @ line 523 ─────────────────┘
│        ├─ Message: "Server-side timeout"
│        ├─ Extracted: call_id = "abc@example.com"
│        └─► related_information: [
│                location: "jabber.log:150"
│            ]
│
└─── Action Panel Display:
     ┌────────────────────────────────────┐
     │ [ERROR] SIP INVITE timeout         │
     │ jabber.log:150                     │
     │ ↳ Related: cucm.log:523            │ ◄── Click to navigate
     │                                    │
     │ [ERROR] Server-side timeout        │
     │ cucm.log:523                       │
     │ ↳ Related: jabber.log:150          │ ◄── Bidirectional link
     └────────────────────────────────────┘
```

## Bundle Export/Import Flow

```
EXPORT WORKFLOW
===============

Bundle (In-Memory)
    │
    │ 1. Serialize with output format
    │
    ▼
┌───────────────────────────────────┐
│  EXPORT PACKAGE                   │
│  bundle_123_export.json           │
├───────────────────────────────────┤
│  {                                │
│    "bundle": {                    │
│      "id": "bundle_123",          │
│      "analysis": {                │
│        "detections": [            │
│          {                        │
│            "log_uri": "logs/j.log"│ ◄── Relative path
│            "line_number": 150,    │ ◄── 0-indexed
│            "severity": "Error",   │ ◄── Standard enum
│            "extracted_fields": {} │ ◄── JSON serializable
│          }                        │
│        ]                          │
│      }                            │
│    },                             │
│    "format_version": "1.0",       │ ◄── Version tag
│    "exported_at": "2024-01-15..." │ ◄── ISO 8601
│  }                                │
└───────────────────────────────────┘
    │
    │ 2. Share/Archive
    │
    ▼

IMPORT WORKFLOW
===============

Bundle Package File
    │
    │ 1. Validate against output format schema
    │
    ▼
┌───────────────────────────────────┐
│  VALIDATION CHECKS                │
├───────────────────────────────────┤
│  ✓ format_version supported?      │
│  ✓ detections[] structure valid?  │
│  ✓ severity values recognized?    │
│  ✓ line_numbers within bounds?    │
│  ✓ pattern_ids exist in library?  │
│  ✓ extracted_fields parseable?    │
└───────────────────────────────────┘
    │
    │ 2. Remap file paths to local workspace
    │
    ▼
┌───────────────────────────────────┐
│  PATH REMAPPING                   │
├───────────────────────────────────┤
│  "logs/j.log"                     │
│      ↓                            │
│  "C:\workspace\logs\j.log"        │ ◄── Absolute local path
└───────────────────────────────────┘
    │
    │ 3. Create bundle in .log-scout/bundles/
    │
    ▼
Bundle (Imported & Ready)
```

## Performance Flow (Large Bundles)

```
SCENARIO: Analyze bundle with 15 logs, 500K lines
==================================================

APPROACH 1: All-at-Once (❌ Bad)
─────────────────────────────────
Analyze all → 5000 detections → Send to client → UI freezes
    (5 min)       (huge JSON)       (overload)

APPROACH 2: Progressive Streaming (✅ Good)
───────────────────────────────────────────
For each log file:
  ├─► Analyze log (10,000 lines)
  │   ├─► Find 50 detections
  │   ├─► Send partial results (small payload)
  │   └─► Update UI incrementally
  │
  └─► User sees progress in real-time

Implementation:
┌────────────────────────────────────────┐
│ for log in bundle.logs:                │
│   detections = analyze_log(log)        │
│   textDocument/publishDiagnostics(     │
│     uri: log.uri,                      │
│     diagnostics: detections            │ ◄── Per-file update
│   )                                    │
│   partial_statistics.update()          │
│   send_progress_notification()         │
└────────────────────────────────────────┘
```

## Bundle Comparison Flow

```
COMPARE BUNDLES (Before vs. After)
===================================

Bundle A (Before config change)        Bundle B (After fix)
├─ 150 error detections                ├─ 15 error detections
├─ 300 warning detections              ├─ 200 warning detections
└─ Pattern: SIP timeout (80 times)     └─ Pattern: SIP timeout (5 times)

                    │
                    │ compare_bundles(A, B)
                    ▼
        ┌─────────────────────────┐
        │  BUNDLE COMPARISON      │
        ├─────────────────────────┤
        │  New Detections: 10     │ ◄── In B, not in A
        │  Resolved: 145          │ ◄── In A, not in B
        │  Common: 15             │ ◄── In both
        │                         │
        │  Severity Changes:      │
        │    Error → Warning: 5   │
        │                         │
        │  Pattern Frequency:     │
        │    SIP timeout:         │
        │      80 → 5 (94% ↓)     │ ◄── Significant improvement
        └─────────────────────────┘

Requires: Stable detection IDs based on:
  • pattern_id
  • log_uri
  • line_number
  • matched_text (hash)
```

## Output Format Versioning

```
FORMAT EVOLUTION
================

Version 1.0 (Current)
└─► Detection {
      log_uri, line_number, severity, pattern_id,
      matched_text, extracted_fields
    }

Version 2.0 (Future - with AI insights)
└─► Detection {
      ...all v1.0 fields...,
      ai_analysis: {
        root_cause_probability: 0.85,
        recommended_actions: ["restart_service"],
        similar_incidents: ["INC-123", "INC-456"]
      }
    }

Bundle Storage Compatibility:
┌────────────────────────────────────┐
│  bundle.json                       │
│  {                                 │
│    "format_version": "1.0",        │ ◄── Explicit version
│    "analysis": { ... }             │
│  }                                 │
│                                    │
│  Reader checks format_version:     │
│  • Can read v1.0? ✓                │
│  • Can read v2.0? ✗ (future)       │
│  • Can read v0.x? ✗ (deprecated)   │
└────────────────────────────────────┘
```

## Key Takeaways

### 1. Single Source of Truth
The **Scout Log Output Reference Practices** define the format for:
- LSP responses
- Bundle storage
- Action panel display
- Export packages

### 2. Data Alignment
All Detection objects must contain fields needed for:
- LSP Diagnostics (uri, range, severity)
- UI display (full context, metadata)
- Navigation (precise location)
- Correlation (extracted fields)
- Export (relative paths, JSON serializable)

### 3. Consistency Benefits
- ✅ No format conversion needed
- ✅ Direct data flow: LSP → Bundle → UI
- ✅ Portable bundle files
- ✅ Version-compatible format

### 4. Critical Implementation Rule
**When output format changes, bundles MUST update to match.**

Otherwise:
- ❌ Bundle storage breaks
- ❌ Action panel can't display data
- ❌ Export/import fails
- ❌ Navigation doesn't work
- ❌ Cross-references break

---

**Conclusion:** The output format is not just about LSP responses—it's the **universal data contract** for the entire bundle system.