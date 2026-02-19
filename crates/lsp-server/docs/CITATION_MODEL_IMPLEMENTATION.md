# Implementation Complete: Citation Model for LSP Server

## ✅ Changes Made

The LSP server now provides the extension with properly structured data using the citation/evidence model.

### Key Changes in `server.rs`

#### 1. **Template Handling (Line 335-346)**
```rust
// Get raw template from pattern
let template = if detection.pattern.annotation.is_empty() {
    "(missing)".to_string()
} else {
    detection.pattern.annotation.clone()
};

// Create merged template (substituted values)
let merged_template = if template == "(missing)" {
    tracing::error!("Template is MISSING for pattern '{}'", detection.pattern.id);
    template
} else {
    let substituted = Self::substitute_template(&template, &detection.field_values);
    substituted
};
```

**Purpose:**
- ✅ Template is **required** (not optional)
- ✅ Clear indication if missing
- ✅ Merged template has values substituted

#### 2. **Extracted Parameters (Line 391-403)**
```rust
// Build extracted_parameters as list of key-value pairs
let extracted_params: Vec<serde_json::Value> = detection
    .field_values
    .iter()
    .map(|(name, value)| {
        let mut param = serde_json::Map::new();
        param.insert("name".to_string(), serde_json::Value::String(name.clone()));
        param.insert("value".to_string(), serde_json::Value::String(value.clone()));
        serde_json::Value::Object(param)
    })
    .collect();
```

**Purpose:**
- ✅ List of {name, value} pairs (structured)
- ✅ Easy for extension to iterate and display
- ✅ Clear facts extracted from the log

#### 3. **Diagnostic Data Structure (Line 405-457)**

**Core Fields:**
```json
{
  "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
  "merged_template": "User john.doe failed auth attempt 3/5"
}
```

**Source/Citation Fields:**
```json
{
  "log_line": "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5",
  "extracted_parameters": [
    {"name": "user", "value": "john.doe"},
    {"name": "attempt", "value": "3"},
    {"name": "max", "value": "5"}
  ]
}
```

**Pattern Identification:**
```json
{
  "pattern_id": "auth.failed",
  "pattern_name": "Authentication Failure",
  "category": "authentication"
}
```

**Debugging/Pattern Creation:**
```json
{
  "matched_text": "User john.doe failed auth attempt 3/5",
  "pattern_regex": "USER\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)"
}
```

**TagScout Metadata:**
```json
{
  "severity": "error",
  "documentation": "...",
  "kb_id": "KB12345",
  "action": "...",
  // ... all other TagScout fields preserved
}
```

#### 4. **Message Field (Line 482)**
```rust
message: merged_template,  // Main message is the merged template (substituted values)
```

**Purpose:**
- ✅ LSP message shows human-readable version
- ✅ Full data structure in `data` object for card rendering

---

## 🎯 Design Principles Implemented

✅ **Keep TagScout Naming**
- `template` (not `annotation`, `message`, or `description`)
- `merged_template` (not `substituted_message` or `annotation_substituted`)
- `extracted_parameters` (not `fields`, `values`, or `data`)
- `log_line` (not `matched_text`, `source`, or `original`)

✅ **No Semantic Merging**
- Template and log_line are separate
- Each serves distinct purpose
- Extension controls how they're combined for display

✅ **Citation Model**
- `template` = Summary/Interpretation
- `log_line` = Evidence/Source
- `extracted_parameters` = Facts

✅ **Required vs Optional**
- **Required**: `template`, `merged_template`, `log_line`, `extracted_parameters`, `pattern_id`
- **Optional**: Debugging fields, TagScout metadata
- **Invalid**: Missing template → "(missing)" error

✅ **Debuggability**
- `matched_text` (just the regex match)
- `pattern_regex` (the actual pattern)
- Both available for pattern creation/debugging

---

## 📊 Example Diagnostic Output

```json
{
  "range": { "start": {"line": 0, "character": 45}, "end": {"line": 0, "character": 85} },
  "severity": 1,
  "code": "auth.failed",
  "source": "log-scout",
  "message": "User john.doe failed auth attempt 3/5",
  "data": {
    // Core annotation
    "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    "merged_template": "User john.doe failed auth attempt 3/5",
    
    // Source/Citation
    "log_line": "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5",
    "extracted_parameters": [
      {"name": "user", "value": "john.doe"},
      {"name": "attempt", "value": "3"},
      {"name": "max", "value": "5"}
    ],
    
    // Pattern info
    "pattern_id": "auth.failed",
    "pattern_name": "Authentication Failure",
    "category": "authentication",
    
    // Debugging
    "matched_text": "User john.doe failed auth attempt 3/5",
    "pattern_regex": "USER\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)",
    
    // TagScout fields (all preserved)
    "severity": "error",
    "documentation": "Multiple failed authentication attempts indicate...",
    "kb_id": "KB-AUTH-001",
    "action": "Review user account status and access logs",
    
    // Log metadata
    "timestamp": "2026-02-13T10:34:22Z",
    "log_level": "ERROR"
  }
}
```

---

## 🎨 Extension Card Rendering

**Extension receives the diagnostic and renders:**

### Card 1: Annotation
```
Authentication Failure
User john.doe failed auth attempt 3/5

Pattern: auth.failed (Error)
```
From: `pattern_name`, `merged_template`, `pattern_id`

### Card 2: Citation
```
2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5

Category: authentication
Timestamp: 2026-02-13T10:34:22Z
```
From: `log_line`, `category`, `timestamp`

### Card 3: Details
```
Extracted Parameters
• user = john.doe
• attempt = 3
• max = 5

Documentation
Multiple failed authentication attempts indicate...

Knowledge Base: KB-AUTH-001
Action: Review user account status and access logs
```
From: `extracted_parameters`, `documentation`, `kb_id`, `action`

---

## ✨ Advantages of This Model

1. **Separation of Concerns**
   - Template (annotation summary) ≠ Log line (original source)
   - Extension controls combination

2. **Citation/Evidence Model**
   - Always cite the original log
   - Show how conclusion (template) relates to evidence (log_line)
   - Transparent and trustworthy

3. **Structured Data**
   - `extracted_parameters` is a clean list
   - No merging or string manipulation needed
   - Easy to iterate and display

4. **Preserves TagScout**
   - All original fields kept
   - No mapping/renaming
   - True source of truth

5. **Debuggability**
   - Regex and matched_text available
   - Can create/test new patterns
   - Clear what was matched vs extracted

6. **Flexibility**
   - Extension renders cards as it sees fit
   - Can show template raw or merged
   - Can customize display per card

---

## 🔍 Special Case: Missing Template

If template is missing (invalid pattern):
```json
{
  "template": "(missing)",
  "merged_template": "(missing)",
  "message": "(missing)",
  // In logs:
  // "ERROR: Template is MISSING for pattern 'auth.failed' - this pattern requires an annotation"
}
```

This makes the error clear and traceable.

---

## 📋 Summary

✅ Template is **required** (not fallback to matched_text)
✅ Proper **citation model** (annotation + source)
✅ **Structured parameters** (list of KV pairs)
✅ **TagScout naming preserved** (template, extracted_parameters, etc.)
✅ **All metadata included** (for extension flexibility)
✅ **Debugging fields available** (matched_text, pattern_regex)

The extension now has all the information it needs to render annotation cards + citation cards + details cards, following the "trust but verify" principle.

