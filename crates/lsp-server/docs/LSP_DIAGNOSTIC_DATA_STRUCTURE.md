# LSP Diagnostic Data Structure - Citation Model

## 📋 Overview

The LSP server now provides the extension with all necessary information for it to display annotation + citation cards, following the "trust but verify" and citation principle.

**Philosophy:**
- **Template** = The annotation from TagScout (the interpretation/summary)
- **Log Line** = The original source (the evidence/citation)
- **Extracted Parameters** = The facts extracted from the log
- **Merged Template** = Template with values filled in (for display)

---

## 🔧 Data Structure

### Diagnostic Fields

```json
{
  "range": { /* LSP range where pattern matched */ },
  "severity": "Error|Warning|Information|Hint",
  "code": "pattern_id",
  "source": "log-scout",
  "message": "User john.doe failed auth attempt 3/5",  // ← merged_template (substituted)
  "data": {
    /* Core annotation fields */
    "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    "merged_template": "User john.doe failed auth attempt 3/5",
    
    /* Source/Evidence */
    "log_line": "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5",
    
    /* Extracted parameters as list of KV pairs */
    "extracted_parameters": [
      { "name": "user", "value": "john.doe" },
      { "name": "attempt", "value": "3" },
      { "name": "max", "value": "5" }
    ],
    
    /* Pattern identification */
    "pattern_id": "auth.failed",
    "pattern_name": "Authentication Failure",
    "category": "authentication",
    
    /* Additional metadata from TagScout */
    "severity": "error",
    "documentation": "...",
    "kb_id": "KB12345",
    
    /* For debugging/pattern creation */
    "matched_text": "User john.doe failed auth attempt 3/5",  // Just the matched portion
    "pattern_regex": "(?:ERROR|FAIL).*User\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)",
    
    /* Log metadata */
    "timestamp": "2026-02-13T10:34:22Z",
    "log_level": "ERROR"
  }
}
```

---

## 📊 Field Reference

### Core Annotation Fields (Required)

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `template` | string | Raw template from TagScout | `"User {{ user }} failed"` |
| `merged_template` | string | Template with substituted values | `"User john.doe failed"` |

### Source/Citation Fields (Required)

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `log_line` | string | Full original log line | `"2026-02-13 10:34:22 [AUTH] ERROR User john.doe..."` |
| `extracted_parameters` | array | KV pairs extracted from log | `[{name: "user", value: "john.doe"}]` |

### Pattern Identification (Required)

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `pattern_id` | string | Unique pattern identifier | `"auth.failed"` |
| `pattern_name` | string | Human-readable pattern name | `"Authentication Failure"` |
| `category` | string | Pattern category (substituted) | `"authentication"` |

### Original TagScout Fields (Optional)

| Field | Type | Purpose |
|-------|------|---------|
| `severity` | string | Base severity from TagScout | 
| `documentation` | string | KB article/notes |
| `kb_id` | string | Knowledge base ID |
| `bug_id` | string | Related bug |
| `action` | string | Recommended action |
| `parameters` | array | Parameter definitions (from TagScout) |
| ... | ... | All other TagScout annotation fields |

### Debugging Fields (Optional)

| Field | Type | Purpose | Use Case |
|-------|------|---------|----------|
| `matched_text` | string | Portion of log matched by regex | Creating new patterns |
| `pattern_regex` | string | The actual regex pattern | Debugging regex issues |
| `timestamp` | string | Parsed timestamp from log | Correlation analysis |
| `log_level` | string | Detected log level | Filtering/sorting |

---

## 🎯 Display Card Structure (For Extension)

The extension receives this data and renders:

### Card 1: Annotation Card
```
┌─────────────────────────────────────┐
│ Authentication Failure              │ ← pattern_name
├─────────────────────────────────────┤
│ User john.doe failed auth attempt   │ ← merged_template
│ 3/5                                 │
│                                     │
│ Pattern: auth.failed (Error)        │ ← pattern_id + severity
└─────────────────────────────────────┘
```

Data from:
- `pattern_name`
- `merged_template`
- `pattern_id`
- `severity` (from data.data)

### Card 2: Citation Card (Log Line)
```
┌─────────────────────────────────────┐
│ Source Log                          │
├─────────────────────────────────────┤
│ 2026-02-13 10:34:22 [AUTH] ERROR   │
│ User john.doe failed auth attempt  │ ← log_line
│ 3/5                                │
│                                    │
│ Category: authentication           │
│ Timestamp: 2026-02-13T10:34:22Z   │
└─────────────────────────────────────┘
```

Data from:
- `log_line`
- `category`
- `timestamp`

### Card 3: Details Card
```
┌──────────────────────────────────┐
│ Extracted Parameters             │
├──────────────────────────────────┤
│ • user = john.doe                │
│ • attempt = 3                    │
│ • max = 5                        │
│                                  │
│ Documentation:                   │
│ For security reasons...          │ ← from TagScout
│                                  │
│ Knowledge Base: KB12345          │
└──────────────────────────────────┘
```

Data from:
- `extracted_parameters`
- `documentation`
- `kb_id`

---

## 🔄 Data Flow

```
┌─────────────────────────────────┐
│ Log Line (Original)             │
│ "2026-02-13 10:34:22 [AUTH]    │
│  ERROR User john.doe failed..." │
└────────────┬────────────────────┘
             │
             ├─────────────────────────────────┐
             │                                 │
             ▼                                 ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │ Pattern Regex    │         │ TagScout Template    │
    │ Extract: user    │         │ "User {{ user }}...  │
    │ Extract: attempt │         │ failed {{ attempt }}/│
    │ Extract: max     │         │ {{ max }}"           │
    └────────┬─────────┘         └──────────┬───────────┘
             │                              │
             │    Extracted Parameters     │
             │    [user, attempt, max]     │
             │                              │
             └──────────┬──────────────────┘
                        │
                        ▼
    ┌─────────────────────────────────────┐
    │ Diagnostic.data                     │
    │ {                                   │
    │   template: "...",                  │
    │   merged_template: "...",           │
    │   log_line: "...",                  │
    │   extracted_parameters: [...]       │
    │ }                                   │
    └────────────┬────────────────────────┘
                 │
                 ▼
    ┌─────────────────────────────────────┐
    │ Extension UI (Annotation + Citation)│
    │ ┌─────────────────────────────────┐ │
    │ │ Annotation Card (merged)        │ │
    │ │ Citation Card (log_line)        │ │
    │ │ Details Card (parameters, KB)   │ │
    │ └─────────────────────────────────┘ │
    └─────────────────────────────────────┘
```

---

## 📌 Special Cases

### When Template is Missing

```json
{
  "template": "(missing)",
  "merged_template": "(missing)",
  "message": "(missing)"
}
```

Note: This is an error condition - pattern is invalid without a template.

---

## ✅ Design Principles

1. **Keep TagScout Naming** - Use original field names from annotations
2. **No Semantic Loss** - Don't merge or combine information
3. **Citation Model** - Always include source (log_line)
4. **Separation of Concerns** - Template, Source, Parameters are distinct
5. **Debuggability** - Include regex and matched_text for pattern creation
6. **Rich Metadata** - All TagScout fields preserved

---

## 🔍 Extension Implementation Notes

**To render cards, the extension needs:**

1. **Annotation Card**
   - `pattern_name` (title)
   - `merged_template` (content)
   - `pattern_id` + `severity` (metadata)

2. **Citation Card**
   - `log_line` (full log with datetime and level)
   - `category` (classification)
   - `timestamp` (when it occurred)

3. **Details Card**
   - `extracted_parameters` (list of {name, value})
   - `documentation` (KB content)
   - `kb_id`, `bug_id`, `action` (links/metadata)

All data is provided in `Diagnostic.data` object.

