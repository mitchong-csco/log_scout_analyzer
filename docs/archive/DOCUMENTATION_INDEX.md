# 📚 Implementation Documentation Index

## 🎯 Overview

Complete refactoring of the LSP server to implement a **citation model** for log analysis:
- Annotation (template) = Interpretation
- Citation (log_line) = Evidence
- Never merged, always separate

---

## 📋 Documents Created

### 1. **IMPLEMENTATION_SUMMARY.md** ⭐ START HERE
- Quick overview of changes
- Key points and design principles
- What was changed and why

### 2. **LSP_DIAGNOSTIC_DATA_STRUCTURE.md**
- Complete data structure specification
- Field reference table
- Display card structure
- Data flow diagram

### 3. **EXTENSION_DATA_CONSUMER_GUIDE.md** ⭐ FOR EXTENSION DEVS
- Complete example of data extension receives
- Field-by-field breakdown
- How to render cards
- TypeScript type definitions

### 4. **CITATION_MODEL_IMPLEMENTATION.md**
- Design principles implemented
- Example diagnostic output
- How extension uses the data
- Advantages of this model

### 5. **COMPLETE_IMPLEMENTATION_GUIDE.md**
- Comprehensive guide with examples
- Philosophy and reasoning
- Data flow visualization
- Complete example in action

---

## 🔍 Quick Navigation

### "What changed?"
→ **IMPLEMENTATION_SUMMARY.md**

### "What data does extension get?"
→ **EXTENSION_DATA_CONSUMER_GUIDE.md**

### "How should I render it?"
→ **EXTENSION_DATA_CONSUMER_GUIDE.md** (scroll to "How to Render Cards")

### "What's the data structure?"
→ **LSP_DIAGNOSTIC_DATA_STRUCTURE.md**

### "Why this design?"
→ **CITATION_MODEL_IMPLEMENTATION.md**

### "Show me a complete example"
→ **COMPLETE_IMPLEMENTATION_GUIDE.md**

---

## 📊 Data Structure Quick Reference

```json
{
  "message": "User john.doe failed auth attempt 3/5",
  
  "data": {
    // === ANNOTATION ===
    "template": "User {{ user }} failed auth attempt {{ attempt }}/{{ max }}",
    "merged_template": "User john.doe failed auth attempt 3/5",
    
    // === CITATION ===
    "log_line": "2026-02-13 10:34:22 [AUTH] ERROR ...",
    "extracted_parameters": [
      {"name": "user", "value": "john.doe"},
      {"name": "attempt", "value": "3"},
      {"name": "max", "value": "5"}
    ],
    
    // === PATTERN ===
    "pattern_id": "auth.failed",
    "pattern_name": "Authentication Failure",
    "category": "authentication",
    
    // === TAGSCOUT ===
    "severity": "error",
    "documentation": "...",
    "kb_id": "KB-AUTH-001",
    "action": "...",
    
    // === DEBUG ===
    "matched_text": "...",
    "pattern_regex": "...",
    
    // === METADATA ===
    "timestamp": "2026-02-13T10:34:22Z",
    "log_level": "ERROR"
  }
}
```

---

## 🎨 Card Rendering

### Annotation Card
```
Title: pattern_name
Content: merged_template
Footer: pattern_id (severity)
Action: "View Template" shows raw template with {{ FIELD }}
```

### Citation Card
```
Title: Source Log
Content: log_line (full original)
Meta: timestamp + log_level + category
```

### Details Card
```
Section 1: extracted_parameters (list of {name, value})
Section 2: documentation (KB content)
Section 3: Links (kb_id, bug_id, action)
```

---

## ✅ Key Design Points

1. **Template is Required**
   - No fallbacks to matched_text
   - Errors clearly logged if missing

2. **Citation Model**
   - Template and log_line never merged
   - Extension controls presentation
   - Full traceability

3. **Structured Data**
   - extracted_parameters is a list
   - Each item is {name, value}
   - Easy to iterate and display

4. **TagScout Fidelity**
   - Original field names preserved
   - All metadata included
   - No lossy transformations

5. **Debuggability**
   - matched_text available
   - pattern_regex available
   - Can create/test patterns

---

## 🔄 Philosophy

> "If you can't document it, it never happened" + "Trust but verify"

Applied to log analysis:
- **Document** = The annotation/template from TagScout
- **Verify** = Show the original log line as evidence
- Always present both - never merge them

The extension receives both and controls how to display them.

---

## 📁 Files Changed

```
lsp-server/src/server.rs
├─ Lines 335-356: Template processing
├─ Lines 391-403: Extracted parameters
├─ Lines 405-457: Diagnostic data building
└─ Line 482: Message field assignment
```

---

## 🚀 Next Steps for Extension

1. **Read**: EXTENSION_DATA_CONSUMER_GUIDE.md
2. **Understand**: Data structure and field meanings
3. **Plan**: Card layout and styling
4. **Implement**: Parse diagnostic.data and render cards
5. **Test**: Verify data flow with real patterns

---

## 💡 For Reference

### Naming Convention
```
✅ "template" - raw template from TagScout
✅ "merged_template" - template with values
✅ "extracted_parameters" - structured KV pairs
✅ "log_line" - original full log line
✅ "matched_text" - just regex match (debugging)
✅ "pattern_regex" - the regex pattern (debugging)

❌ "message" - too generic
❌ "annotation_substituted" - not in TagScout
❌ "description" - confusing
```

### Required vs Optional
```
ALWAYS PRESENT:
- template
- merged_template
- log_line
- extracted_parameters
- pattern_id
- pattern_name
- category

USUALLY PRESENT:
- severity
- documentation
- timestamp
- log_level

MAY BE MISSING:
- kb_id
- bug_id
- action
- Other TagScout fields
```

---

## 📞 Questions?

Refer to:
- **What data?** → EXTENSION_DATA_CONSUMER_GUIDE.md
- **How render?** → EXTENSION_DATA_CONSUMER_GUIDE.md (section: "How to Render Cards")
- **Why this design?** → CITATION_MODEL_IMPLEMENTATION.md
- **Complete example?** → COMPLETE_IMPLEMENTATION_GUIDE.md

---

## ✨ Summary

The LSP server now provides the extension with:
1. Clean separation: template ≠ log_line
2. Structured data: extracted_parameters as list
3. Full metadata: all TagScout fields
4. Ready to display: no additional processing needed
5. Citation model: always traceable to source

**Everything needed for a professional analysis UI.**

