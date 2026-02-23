# Extension Data Consumer Guide

## What Data Will the Extension Receive?

The extension receives LSP diagnostics with this structure:

---

## Complete Example

```typescript
// From LSP Server
const diagnostic: Diagnostic = {
  range: {
    start: { line: 0, character: 45 },
    end: { line: 0, character: 85 }
  },
  severity: DiagnosticSeverity.Error,  // 1 = Error
  code: "auth.failed",                  // pattern_id
  source: "log-scout",
  message: "User john.doe failed auth attempt 3/5",  // merged_template
  data: {
    
    // ===== DISPLAY CARDS =====
    
    // ANNOTATION CARD
    template: "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    merged_template: "User john.doe failed auth attempt 3/5",
    pattern_id: "auth.failed",
    pattern_name: "Authentication Failure",
    
    // CITATION CARD
    log_line: "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5",
    category: "authentication",
    timestamp: "2026-02-13T10:34:22Z",
    log_level: "ERROR",
    
    // DETAILS CARD
    extracted_parameters: [
      { name: "user", value: "john.doe" },
      { name: "attempt", value: "3" },
      { name: "max", value: "5" }
    ],
    
    // ===== TAGSCOUT METADATA =====
    
    severity: "error",
    documentation: "Multiple failed authentication attempts indicate a potential brute force attack or misconfigured credentials. Review the user account status and check access logs for patterns.",
    kb_id: "KB-AUTH-001",
    bug_id: "BUG-789",
    action: "Review user account status in admin console or contact security team",
    
    // Any other fields from the TagScout annotation...
    
    // ===== DEBUGGING INFO =====
    
    matched_text: "User john.doe failed auth attempt 3/5",
    pattern_regex: "USER\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)",
  }
}
```

---

## Field-by-Field Breakdown

### Message (Quick Preview)
```typescript
diagnostic.message  // "User john.doe failed auth attempt 3/5"
```
- For editor's built-in hover/tooltip
- Show this when space is limited
- This is the `merged_template` value

---

### Core Annotation Fields
```typescript
diagnostic.data.template
// "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}"
// Raw template with placeholders - show in "View Template" toggle
// Users can see what values are being substituted

diagnostic.data.merged_template  
// "User john.doe failed auth attempt 3/5"
// Template with values substituted - show in main card
// User-friendly, ready to read
```

---

### Citation/Evidence
```typescript
diagnostic.data.log_line
// "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5"
// The FULL log line - everything: timestamp, level, full message
// Show in citation card
// This is the SOURCE - the evidence for the annotation

diagnostic.data.category
// "authentication"
// Categorization of the log (can be substituted with field values)

diagnostic.data.timestamp
// "2026-02-13T10:34:22Z"
// When the log was created (ISO 8601)
// Use for timeline grouping

diagnostic.data.log_level
// "ERROR"
// Log severity (ERROR, WARN, INFO, DEBUG)
// Can color-code or filter by
```

---

### Extracted Parameters (The Facts)
```typescript
diagnostic.data.extracted_parameters
// [
//   { name: "user", value: "john.doe" },
//   { name: "attempt", value: "3" },
//   { name: "max", value: "5" }
// ]

// To display:
extracted_parameters.forEach(param => {
  console.log(`${param.name}: ${param.value}`);
  // user: john.doe
  // attempt: 3
  // max: 5
});
```

---

### Pattern Identification
```typescript
diagnostic.data.pattern_id
// "auth.failed"
// Unique identifier - use for linking to KB, filtering, etc.

diagnostic.data.pattern_name
// "Authentication Failure"
// Display name - use as card title

diagnostic.code  // Same as pattern_id
// "auth.failed"
// (Also available at diagnostic.code)
```

---

### TagScout Reference Data
```typescript
diagnostic.data.severity
// "error" | "warning" | "info" | "hint"
// Base severity from TagScout (before any conditional overrides)

diagnostic.severity  // LSP severity
// 1 = Error | 2 = Warning | 3 = Information | 4 = Hint
// Already evaluated with conditions

diagnostic.data.documentation
// "Multiple failed authentication attempts indicate a potential brute force attack..."
// Knowledge base content - show in details section
// This is the EXPLANATION

diagnostic.data.kb_id
// "KB-AUTH-001"
// Knowledge base reference - make clickable link
// Link to: https://kb.example.com/KB-AUTH-001

diagnostic.data.bug_id
// "BUG-789"
// Related bug tracker - make clickable link
// Link to: https://bugs.example.com/BUG-789

diagnostic.data.action
// "Review user account status in admin console or contact security team"
// Recommended action - show as next step/remediation
```

---

### Debugging & Pattern Creation
```typescript
diagnostic.data.matched_text
// "User john.doe failed auth attempt 3/5"
// Just the portion that the regex matched
// Use for: "What did the regex capture?"
// Show in Debug/Advanced panel

diagnostic.data.pattern_regex
// "USER\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)"
// The actual regex pattern used
// Use for: Creating/testing new patterns
// Show in Debug panel
```

---

## How to Render Cards

### Implementation Pattern

```typescript
function renderDiagnosticCards(diagnostic: Diagnostic) {
  const data = diagnostic.data as DiagnosticData;
  
  return (
    <>
      {/* ANNOTATION CARD */}
      <Card title={data.pattern_name}>
        <div className="merged-template">
          {data.merged_template}
        </div>
        <div className="meta">
          Pattern: {data.pattern_id} • Severity: {data.severity}
        </div>
        <button onClick={() => showRawTemplate(data.template)}>
          View Template
        </button>
      </Card>

      {/* CITATION CARD */}
      <Card title="Source Log">
        <div className="log-line">
          {data.log_line}
        </div>
        <div className="meta">
          {data.timestamp} • {data.log_level} • {data.category}
        </div>
      </Card>

      {/* DETAILS CARD */}
      <Card title="Details">
        <Section title="Extracted Parameters">
          {data.extracted_parameters.map(param => (
            <div key={param.name}>
              <strong>{param.name}</strong>: {param.value}
            </div>
          ))}
        </Section>
        
        {data.documentation && (
          <Section title="Documentation">
            {data.documentation}
          </Section>
        )}
        
        <Section title="References">
          {data.kb_id && (
            <Link href={`/kb/${data.kb_id}`}>{data.kb_id}</Link>
          )}
          {data.bug_id && (
            <Link href={`/bugs/${data.bug_id}`}>{data.bug_id}</Link>
          )}
          {data.action && (
            <div><strong>Action:</strong> {data.action}</div>
          )}
        </Section>
      </Card>

      {/* DEBUG CARD (Optional) */}
      {showDebug && (
        <Card title="Debug Info">
          <pre>{JSON.stringify({
            matched_text: data.matched_text,
            pattern_regex: data.pattern_regex
          }, null, 2)}</pre>
        </Card>
      )}
    </>
  );
}
```

---

## Field Availability

### Always Present
- `template`
- `merged_template`
- `log_line`
- `extracted_parameters` (may be empty array)
- `pattern_id`
- `pattern_name`
- `category`

### Usually Present
- `severity`
- `documentation`
- `timestamp`
- `log_level`

### May Be Absent
- `kb_id`
- `bug_id`
- `action`
- Other TagScout fields (check with `?.` or `||`)

### For Debugging Only
- `matched_text`
- `pattern_regex`
- (Only show if debug mode enabled)

---

## Recommended Display

### Main View
```
┌─ ANNOTATION ─────────────────────────┐
│ Authentication Failure               │  ← pattern_name
│                                      │
│ User john.doe failed auth attempt   │  ← merged_template
│ 3/5                                 │
│                                      │
│ Pattern: auth.failed (Error)        │  ← pattern_id, severity
│ [View Template] [Copy] [More...]   │
└──────────────────────────────────────┘

┌─ SOURCE LOG ────────────────────────┐
│ 2026-02-13 10:34:22 [ERROR]        │  ← timestamp, log_level
│                                     │
│ User john.doe failed auth attempt  │  ← log_line
│ 3/5                                │
│                                     │
│ Category: authentication            │  ← category
└─────────────────────────────────────┘

┌─ DETAILS ───────────────────────────┐
│ Extracted Parameters:               │
│ • user: john.doe                   │  ← extracted_parameters
│ • attempt: 3                       │
│ • max: 5                           │
│                                     │
│ Documentation:                      │
│ Multiple failed authentication      │  ← documentation
│ attempts indicate...                │
│                                     │
│ 🔗 KB-AUTH-001                     │  ← kb_id
│ 🐛 BUG-789                         │  ← bug_id
│ ✅ Review user account status...   │  ← action
└─────────────────────────────────────┘
```

---

## Type Definition (TypeScript)

```typescript
interface DiagnosticData {
  // Annotation
  template: string;
  merged_template: string;
  
  // Citation
  log_line: string;
  extracted_parameters: { name: string; value: string }[];
  
  // Pattern
  pattern_id: string;
  pattern_name: string;
  category: string;
  
  // TagScout
  severity: "error" | "warning" | "info" | "hint";
  documentation?: string;
  kb_id?: string;
  bug_id?: string;
  action?: string;
  
  // Metadata
  timestamp?: string;
  log_level?: string;
  
  // Debug
  matched_text?: string;
  pattern_regex?: string;
  
  // Any other TagScout fields...
  [key: string]: unknown;
}
```

---

## Summary

✅ Extension receives **complete, structured data**
✅ **Three main cards**: Annotation, Citation, Details
✅ **All values ready to use** - no additional processing needed
✅ **Flexible** - can customize card layouts
✅ **Debuggable** - regex and matched_text available
✅ **Rich** - all TagScout metadata included

**Everything the extension needs to render a professional analysis UI.**

