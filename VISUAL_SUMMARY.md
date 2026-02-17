# 📊 Visual Summary: What Changed

## The Problem You Identified

```
❌ BEFORE:
   LSP Server
   └─ Diagnostic.message = "User john.doe failed auth"
      └─ Where did this come from?
         ├─ Template from TagScout?
         ├─ Regex matched text?
         ├─ Pattern name?
         └─ No way to tell!

✅ AFTER:
   LSP Server
   └─ Diagnostic
      ├─ message = "User john.doe failed auth"  (merged_template)
      └─ data
         ├─ template = "User {{ user }} failed"
         ├─ merged_template = "User john.doe failed"
         ├─ log_line = "2026-02-13... ERROR User john.doe failed"
         ├─ extracted_parameters = [{name: "user", value: "john.doe"}]
         ├─ pattern_id = "auth.failed"
         └─ ... all other metadata
```

---

## Data Structure Comparison

### Old Approach (Problematic)
```
Diagnostic {
  message: "User john.doe failed auth"
  data: {
    mergedTemplate: "User john.doe failed auth"
    matchedText: "User john.doe failed auth"
    extractedFields: {user: "john.doe"}
    // Unclear what's what
  }
}
```

### New Approach (Citation Model)
```
Diagnostic {
  message: "User john.doe failed auth"  // For quick preview
  data: {
    // === ANNOTATION ===
    template: "User {{ user }} failed auth",
    merged_template: "User john.doe failed auth",
    
    // === CITATION ===
    log_line: "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth",
    
    // === FACTS ===
    extracted_parameters: [
      {name: "user", value: "john.doe"}
    ],
    
    // === METADATA ===
    pattern_id: "auth.failed",
    pattern_name: "Authentication Failure",
    category: "authentication",
    // ... all TagScout fields
  }
}
```

---

## Three Cards Extension Renders

```
┌─────────────────────────────────────────┐
│  🔴 ANNOTATION CARD                     │
├─────────────────────────────────────────┤
│                                         │
│  Authentication Failure                │  ← pattern_name
│                                         │
│  User john.doe failed auth attempt     │  ← merged_template
│  3/5                                    │
│                                         │
│  Pattern: auth.failed (Error)          │  ← pattern_id + severity
│                                         │
│  [View Raw Template] [Copy]             │
│                                         │
└─────────────────────────────────────────┘
         ↑
         │ Shows the INTERPRETATION
         │ (what we think happened)


┌─────────────────────────────────────────┐
│  📋 CITATION CARD                       │
├─────────────────────────────────────────┤
│                                         │
│  Source Log                             │
│                                         │
│  2026-02-13 10:34:22 [ERROR]           │  ← Full original
│  User john.doe failed auth attempt     │
│  3/5                                    │  ← log_line
│                                         │
│  Category: authentication               │  ← category
│  Timestamp: 2026-02-13T10:34:22Z       │  ← timestamp
│                                         │
└─────────────────────────────────────────┘
         ↑
         │ Shows the EVIDENCE
         │ (what actually happened in the log)


┌─────────────────────────────────────────┐
│  📊 DETAILS CARD                        │
├─────────────────────────────────────────┤
│                                         │
│  Extracted Parameters:                  │
│  • user = john.doe                     │  ← extracted_parameters
│  • attempt = 3                         │
│  • max = 5                              │
│                                         │
│  Documentation:                         │
│  Multiple failed authentication         │  ← documentation
│  attempts indicate a potential...       │
│                                         │
│  🔗 Knowledge Base: KB-AUTH-001        │  ← kb_id
│  🐛 Related Bug: BUG-789               │  ← bug_id
│  ✅ Action: Review user account...    │  ← action
│                                         │
└─────────────────────────────────────────┘
         ↑
         │ Shows the FACTS
         │ (what we extracted and know about it)
```

---

## Code Changes Summary

```rust
// BEFORE (Confusing)
let template = detection.pattern.description.clone();  // Wait, is this the template?
if template.is_empty() {
    detection.matched_text.clone()  // Falls back to raw log?
}

// AFTER (Clear)
let template = detection.pattern.annotation.clone();  // This is the template!
if template == "(missing)" {
    tracing::error!("Template is MISSING");  // Error logged!
    template  // Propagates error, doesn't hide it
}

// Build structured data
data_map.insert("template", template);              // Raw template with {{ FIELD }}
data_map.insert("merged_template", merged);         // Template with values
data_map.insert("log_line", full_log_line);        // Full original source
data_map.insert("extracted_parameters", params);    // List of {name, value}
```

---

## Field Naming: Why These Names?

```
❌ WRONG NAMING:
message             → Too generic
annotation_substituted → Too verbose, not in TagScout
description         → Misleading
raw_template        → Implicit, not needed
source_text         → Vague

✅ RIGHT NAMING:
template            → Matches TagScout, clear what it is
merged_template     → Clear it's the merged version
extracted_parameters → Matches TagScout, structured
log_line           → Clear it's the original log
matched_text       → For debugging only
```

---

## Extension Receives This JSON

```json
{
  "message": "User john.doe failed auth attempt 3/5",
  "code": "auth.failed",
  "severity": 1,
  
  "data": {
    
    // CARD 1: Annotation (Interpretation)
    "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    "merged_template": "User john.doe failed auth attempt 3/5",
    
    // CARD 2: Citation (Evidence)
    "log_line": "2026-02-13 10:34:22 [AUTH] ERROR User john.doe failed auth attempt 3/5",
    "category": "authentication",
    "timestamp": "2026-02-13T10:34:22Z",
    "log_level": "ERROR",
    
    // CARD 3: Details (Facts)
    "extracted_parameters": [
      {"name": "user", "value": "john.doe"},
      {"name": "attempt", "value": "3"},
      {"name": "max", "value": "5"}
    ],
    "documentation": "Multiple failed authentication attempts...",
    "kb_id": "KB-AUTH-001",
    "action": "Review user account status",
    
    // Identification
    "pattern_id": "auth.failed",
    "pattern_name": "Authentication Failure",
    "severity": "error",
    
    // Debugging
    "matched_text": "User john.doe failed auth attempt 3/5",
    "pattern_regex": "USER\\s+(\\w+).*attempt\\s+(\\d+)/(\\d+)"
  }
}
```

---

## Philosophy: Citation Model

```
BEFORE:
Show merged message, user can't see the source
❌ "User john.doe failed auth attempt 3/5"
   └─ Is this real or computed? Don't know!

AFTER:
Show both interpretation AND evidence
✅ Annotation Card: "User john.doe failed auth attempt 3/5"
   ↓ (cites)
   Citation Card: "2026-02-13 10:34:22 [AUTH] ERROR User john.doe..."
   
Like academic papers:
- Claim (Annotation) backed by evidence (Citation)
- Readers can verify the claim against the source
```

---

## The Three-Layer Model

```
Layer 1: ANNOTATION (What we think)
┌─────────────────────────────┐
│ User {{ user }} failed auth │  ← Template with variables
│ User john.doe failed auth   │  ← Merged (interpreted)
└─────────────────────────────┘

Layer 2: CITATION (What really happened)
┌──────────────────────────────────────────────────┐
│ 2026-02-13 10:34:22 [AUTH] ERROR User john.doe  │  ← Source of truth
│ failed auth attempt 3/5                          │
└──────────────────────────────────────────────────┘

Layer 3: FACTS (What we know)
┌──────────────────────────────┐
│ user = john.doe             │
│ attempt = 3                 │
│ max = 5                     │
└──────────────────────────────┘
     ↑
     └─ Extracted from Layer 2 using Layer 1 rules
```

---

## Timeline: What Gets Shown When

```
1. File opens
   ↓
2. LSP analyzes log line
   ↓
3. Pattern matches
   ↓
4. Fields extracted
   ↓
5. Template substituted
   ↓
6. Diagnostic sent to extension
   {
     message: "User john.doe failed auth"
     data: {
       template: "...",
       merged_template: "...",
       log_line: "...",
       extracted_parameters: [...]
     }
   }
   ↓
7. Extension renders three cards
   ↓
8. User sees
   - What happened (annotation)
   - Where it happened (source log)
   - What we found (facts)
```

---

## Impact Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Clarity** | Confusing | Clear |
| **Source** | Hidden | Visible |
| **Template** | Fallback used | Always shown |
| **Parameters** | Raw dict | Structured list |
| **Extension** | Gets merged message | Gets complete data |
| **Debugging** | Hard to trace | Regex/matched available |

---

## Ready For

✅ Extension development - all data available
✅ Testing - clear data structure
✅ Documentation - complete guides
✅ Production - no ambiguity

---

## Start Reading

**Quick overview:** TASK_COMPLETE.md
**For extension devs:** EXTENSION_DATA_CONSUMER_GUIDE.md
**Full spec:** LSP_DIAGNOSTIC_DATA_STRUCTURE.md
**All docs:** DOCUMENTATION_INDEX.md

