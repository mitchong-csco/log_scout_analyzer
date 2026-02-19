# LSP Server - Complete Implementation Summary

## 🎯 What Changed and Why

### The Philosophy
> "If you can't document it, it never happened" + "Trust but verify"

**Applies to Log Analysis:**
- **Template** = The annotation/documentation (what we think happened)
- **Log Line** = The original evidence (what actually happened)
- Always show both - keep them separate, don't merge

---

## 📊 Complete Diagnostic Data Structure

### What the Extension Receives

```typescript
// LSP Diagnostic
{
  // Standard LSP fields
  range: { start, end },
  severity: Error | Warning | Information | Hint,
  code: string,              // pattern_id
  source: "log-scout",
  message: string,           // merged_template for quick preview
  data: {
    
    // === ANNOTATION (The Interpretation) ===
    template: string,              // "User {{ user }} failed auth"
    merged_template: string,       // "User john.doe failed auth"
    
    // ===  CITATION (The Evidence) ===
    log_line: string,              // Full original log line with datetime/level
    
    // === FACTS (Extracted from Log) ===
    extracted_parameters: [        // List of {name, value} pairs
      { name: string, value: string },
      ...
    ],
    
    // === PATTERN IDENTITY ===
    pattern_id: string,            // "auth.failed"
    pattern_name: string,          // "Authentication Failure"
    category: string,              // "authentication" (substituted)
    
    // === ORIGINAL TAGSCOUT FIELDS ===
    severity: string,              // "error", "warning", etc.
    documentation: string,         // Full KB article text
    kb_id: string,                 // "KB-AUTH-001"
    action: string,                // Recommended action
    // ... all other TagScout annotation fields ...
    
    // === DEBUGGING (For Pattern Creation) ===
    matched_text: string,          // Just what regex matched
    pattern_regex: string,         // The actual regex pattern
    
    // === LOG METADATA ===
    timestamp: string,             // ISO 8601 format
    log_level: string,             // "ERROR", "WARN", etc.
  }
}
```

---

## 🎨 How Extension Uses This Data

### Renders Three Cards

#### 1. Annotation Card
```
Title: {{ pattern_name }}
Content: {{ merged_template }}
Footer: {{ pattern_id }} ({{ severity }})

// Hover/Click: Show raw template with {{ FIELD }} placeholders
```

**Data from:**
- `pattern_name`
- `merged_template`
- `pattern_id`, `severity`

---

#### 2. Citation Card
```
Title: Source Log

Header: [timestamp] [log_level]

Content: {{ log_line }}

Footer: Category: {{ category }}
```

**Data from:**
- `timestamp`
- `log_level`
- `log_line`
- `category`

---

#### 3. Details Card
```
Section 1: Extracted Parameters
- user: john.doe
- attempt: 3
- max: 5
(From: extracted_parameters array)

Section 2: Documentation
{{ documentation }}
(From: documentation field)

Section 3: Links
Knowledge Base: {{ kb_id }}
Recommended Action: {{ action }}
(From: kb_id, action fields)
```

**Data from:**
- `extracted_parameters` (iterate and display each {name, value})
- `documentation`
- `kb_id`, `action`

---

## 🔄 Data Flow

```
┌──────────────────────────────────────┐
│ Log Line (Raw)                       │
│ "2026-02-13 10:34:22 [AUTH] ERROR   │
│  User john.doe failed auth attempt  │
│  3/5"                               │
└────────────┬─────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────────┐  ┌──────────────────────┐
│ Regex Match │  │ TagScout Template    │
│ Extract:    │  │ "User {{ user }}     │
│ - user      │  │  failed auth         │
│ - attempt   │  │  attempt             │
│ - max       │  │  {{ attempt }}/      │
│             │  │  {{ max }}"          │
└──────┬──────┘  └──────────┬───────────┘
       │                    │
       │ extracted_         │ Substitution
       │ parameters         │ with field values
       │                    │
       └────────┬───────────┘
                ▼
        ┌──────────────────┐
        │ merged_template  │
        │ "User john.doe   │
        │  failed auth     │
        │  attempt 3/5"    │
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    ┌────────────┐   ┌─────────────┐
    │ LSP Message│   │ data object │
    │ (preview)  │   │ (full data) │
    └────────────┘   └─────────────┘
```

---

## ✅ Validation Rules

| Condition | Behavior |
|-----------|----------|
| Template exists | Use it for merged_template |
| Template empty | Set to "(missing)" + log error |
| Field extraction fails | Still send what was extracted |
| Log line missing | Use matched_text as fallback |
| All fields succeed | Perfect case - all data available |

---

## 📝 Field Naming Convention

**Why these names?**

```
// NOT these:
❌ "message" - too generic, doesn't match TagScout
❌ "annotation_substituted" - too verbose, not in TagScout
❌ "matched_text" - should only be for debugging
❌ "description" - misleading, confused with pattern description

// YES these:
✅ "template" - matches TagScout, clear what it is
✅ "merged_template" - clear it's the template with values merged
✅ "extracted_parameters" - matches TagScout, structured format
✅ "log_line" - clear it's the original log source
```

---

## 🔐 Design Guarantees

✅ **Template is Required**
- Patterns without templates are invalid
- System flags missing templates as errors
- No silent fallbacks

✅ **Citation Model**
- Template and log_line never merged
- Extension controls presentation
- Full traceability to source

✅ **Structured Data**
- `extracted_parameters` is always a list
- Each parameter is {name, value}
- Easy to iterate and display

✅ **TagScout Fidelity**
- Original field names preserved
- All metadata included
- No lossy transformations

✅ **Debuggability**
- `pattern_regex` available for debugging
- `matched_text` shows what regex captured
- Can create/test new patterns

---

## 🎯 For Extension Developer

### To Render Cards:

**Annotation Card:**
```javascript
{
  title: diagnostic.data.pattern_name,
  content: diagnostic.data.merged_template,
  footer: `${diagnostic.data.pattern_id} (${diagnostic.data.severity})`
}
```

**Citation Card:**
```javascript
{
  timestamp: diagnostic.data.timestamp,
  level: diagnostic.data.log_level,
  content: diagnostic.data.log_line,
  category: diagnostic.data.category
}
```

**Details Card:**
```javascript
{
  parameters: diagnostic.data.extracted_parameters.map(p => `${p.name}: ${p.value}`),
  documentation: diagnostic.data.documentation,
  kb_id: diagnostic.data.kb_id,
  action: diagnostic.data.action
}
```

---

## 🚀 Example in Action

**Log Line:**
```
2026-02-13 10:34:22.456 [AUTH-SERVICE] [THREAD-5678] ERROR Failed to authenticate user john.doe from IP 192.168.1.100 attempt 3 of 5 reason=INVALID_PASSWORD
```

**TagScout Pattern:**
```
id: "auth.failed"
name: "Authentication Failure"
template: "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}"
category: ["authentication", "security"]
severity: "error"
parameters: [
  {name: "user", regex: "user\\s+(\\w+)"},
  {name: "attempt", regex: "attempt\\s+(\\d+)"},
  {name: "max", regex: "of\\s+(\\d+)"}
]
```

**LSP Diagnostic Sent:**
```json
{
  "message": "User john.doe failed auth attempt 3/5",
  "data": {
    "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    "merged_template": "User john.doe failed auth attempt 3/5",
    "log_line": "2026-02-13 10:34:22.456 [AUTH-SERVICE] [THREAD-5678] ERROR Failed to authenticate user john.doe from IP 192.168.1.100 attempt 3 of 5 reason=INVALID_PASSWORD",
    "extracted_parameters": [
      {"name": "user", "value": "john.doe"},
      {"name": "attempt", "value": "3"},
      {"name": "max", "value": "5"}
    ],
    "pattern_id": "auth.failed",
    "pattern_name": "Authentication Failure",
    "category": "authentication",
    "severity": "error",
    "timestamp": "2026-02-13T10:34:22.456Z",
    "log_level": "ERROR"
  }
}
```

**Extension Renders:**

```
┌─────────────────────────────────────────┐
│ AUTHENTICATION FAILURE                  │
├─────────────────────────────────────────┤
│ User john.doe failed auth attempt 3/5   │
│                                         │
│ Pattern: auth.failed (Error)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ SOURCE LOG                              │
├─────────────────────────────────────────┤
│ 2026-02-13 10:34:22.456 [ERROR]        │
│                                         │
│ Failed to authenticate user john.doe   │
│ from IP 192.168.1.100 attempt 3 of 5  │
│ reason=INVALID_PASSWORD                 │
│                                         │
│ Category: authentication                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DETAILS                                 │
├─────────────────────────────────────────┤
│ Extracted Parameters:                   │
│ • user = john.doe                       │
│ • attempt = 3                           │
│ • max = 5                               │
│                                         │
│ Multiple failed attempts indicate       │
│ potential brute force attack or        │
│ misconfigured credentials...            │
└─────────────────────────────────────────┘
```

---

## ✨ Summary

The LSP server now provides:

1. ✅ **Annotation** (`template` + `merged_template`) - The interpretation
2. ✅ **Citation** (`log_line`) - The evidence  
3. ✅ **Facts** (`extracted_parameters`) - The data extracted
4. ✅ **Metadata** (`pattern_*`, TagScout fields) - Context and references
5. ✅ **Debugging** (`matched_text`, `pattern_regex`) - For pattern creation

All in a clean, structured format ready for the extension to render cards.

