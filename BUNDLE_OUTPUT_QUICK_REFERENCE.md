# Bundle Output Quick Reference

## TL;DR: How Scout Log Output Practices Affect Bundles

The Scout Log Output Reference Practices define the **format and structure of analysis results**. This directly impacts bundles in 5 critical ways:

---

## 1. 📦 **Bundle Storage Format**

Bundles store analysis results in `bundle.json`:

```json
{
  "id": "bundle_123",
  "name": "INC-12345: Presence Failure",
  "analysis": {
    "detections": [/* Must match LSP Diagnostic format */],
    "by_service": {/* Grouped by service */},
    "by_pattern": {/* Grouped by pattern */},
    "statistics": {/* Aggregated counts */}
  }
}
```

**Impact:** The output format IS the bundle storage format.

---

## 2. 🔄 **Detection ↔ Diagnostic Mapping**

Every `Detection` in a bundle must map to an LSP `Diagnostic`:

| Detection Field | LSP Diagnostic Field | Purpose |
|----------------|---------------------|---------|
| `log_uri` | `uri` | Which file |
| `line_number` | `range.start.line` | Where in file |
| `matched_text` | `range` (highlight) | What matched |
| `severity` | `severity` | Error/Warning/Info |
| `pattern_id` | `code` | Which pattern |
| `pattern_name` | `message` (prefix) | Human-readable |
| `extracted_fields` | `data` | Structured data |

**Impact:** Bundle detections must contain ALL fields needed for LSP diagnostics.

---

## 3. 🎯 **Action Panel Display**

The Scout Analyzer Action Panel displays bundle analysis using:

```typescript
resultsTreeProvider
  ↓
Filter by Bundle ID
  ↓
Group & Display Detections
  ↓
Enable Click-to-Navigate
```

**What the panel needs from output format:**
- ✅ Full log line with context
- ✅ Precise line/column for navigation
- ✅ Severity for visual indicators
- ✅ Service type for grouping
- ✅ Pattern name for filtering
- ✅ Related information for cross-file links

**Impact:** Output format determines what can be displayed in UI.

---

## 4. 🔗 **Multi-Log Correlation**

Bundles contain multiple logs that need cross-referencing:

```
jabber.log:150  → "SIP INVITE timeout"
                   ↓ (related_information)
cucm.log:523    → "Server-side timeout" 
```

**How output practices enable this:**
- `DiagnosticRelatedInformation` links detections across files
- `extracted_fields` stores correlation IDs (e.g., SIP Call-ID)
- Bundle analyzer creates bidirectional links

**Impact:** Output format enables cross-log investigation workflows.

---

## 5. 📤 **Export/Import Portability**

Bundle export packages must be shareable:

```json
{
  "bundle": {/* Bundle data */},
  "format_version": "1.0",  // ← Output format version
  "exported_at": "2024-01-15T11:00:00Z"
}
```

**Requirements from output practices:**
- File paths must be **relative** (not absolute)
- Timestamps must be **ISO 8601**
- Severity values must be **standardized**
- Extracted fields must be **JSON-serializable**

**Impact:** Output format defines bundle portability and compatibility.

---

## Critical Implementation Points

### ✅ DO THIS
```rust
// Align bundle storage with LSP output
pub struct BundleAnalysisResult {
    pub detections: Vec<Detection>,  // ← Matches Diagnostic structure
    pub by_service: HashMap<String, Vec<Detection>>,
    pub statistics: AnalysisStatistics,
}
```

### ❌ DON'T DO THIS
```rust
// Custom format that doesn't match LSP
pub struct BundleAnalysisResult {
    pub results: Vec<CustomFormat>,  // ← Requires conversion
    pub summary: String,             // ← Not structured
}
```

---

## Quick Checklist

When working with bundles, ensure:

- [ ] Detections have all LSP Diagnostic fields
- [ ] Severity levels match (Error/Warning/Info)
- [ ] Line numbers are 0-indexed (LSP convention)
- [ ] File URIs are relative for export
- [ ] Extracted fields are JSON-serializable
- [ ] Related information links are populated
- [ ] Statistics aggregate correctly
- [ ] Format version is tagged

---

## Key Takeaway

**The Scout Log Output Reference Practices define how analysis results flow through the entire system:**

```
LSP Analysis → Bundle Storage → Action Panel → User Display
     ↓              ↓                ↓              ↓
  Diagnostic    Detection       Tree Item      UI Element
```

**All four representations must align with the same output format.**

If the output format changes, bundles must be updated to match.

---

## Related Documentation

- `BUNDLE_OUTPUT_IMPACT_ANALYSIS.md` - Full detailed analysis
- `LSP_DATA_PROVIDER_FIX.md` - How data flows to action panel
- Scout Log Output Reference Practices - Authoritative format definition

**Last Updated:** 2024-01-15