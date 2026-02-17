# Parameter Extraction Fix: Test & Verification Guide

## Issue Summary

**Problem**: Parameter extractors were not extracting values from matched log lines, resulting in templates with unsubstituted placeholders like `{{ SESSION_ID }}` instead of actual values like `0`.

**Root Cause**: The `extract_fields()` function was applying parameter regex extractors to only the matched text (e.g., "RTP STATS") instead of the full log line where the actual parameter values exist.

**Example**:
```
Full Line: "2025-12-10 17:15:56,798 DEBUG [...] - RTP STATS,session_id=0,session_type=audio-main,..."
Pattern Match: "RTP STATS"
Parameter Extractor: "session_id=(.+?),"
```

The extractor was trying to find `session_id=` in "RTP STATS" (10 characters) instead of the full line (200+ characters).

---

## The Fix

### Files Changed
- `lsp-server/src/pattern_engine.rs`

### Changes Made

1. **Modified `extract_fields()` signature** (Line ~311):
```rust
// Before:
pub fn extract_fields(&self, captures: &regex::Captures) -> HashMap<String, String>

// After:
pub fn extract_fields(
    &self,
    captures: &regex::Captures,
    full_line: &str,  // NEW: Pass the complete log line
) -> HashMap<String, String>
```

2. **Changed parameter extraction scope** (Line ~345):
```rust
// Before: Applied extractors to matched text only
let matched_text = captures.get(0).unwrap().as_str();
for (param_name, param_regex) in &self.parameter_regexes {
    if let Some(cap) = param_regex.captures(matched_text) {
        // ...
    }
}

// After: Apply extractors to full line
for (param_name, param_regex) in &self.parameter_regexes {
    if let Some(cap) = param_regex.captures(full_line) {
        // ...
    }
}
```

3. **Updated function calls** (Lines ~537, ~665):
```rust
// Single-line patterns:
let field_values = compiled_pattern.extract_fields(&cap, line);

// Multi-line patterns:
let field_values = pattern.extract_fields(&cap, &combined);
```

4. **Added debug logging**:
```rust
tracing::info!("=== EXTRACT_FIELDS ===");
tracing::info!("  Pattern ID: {}", self.pattern.id);
tracing::info!("  Pattern has {} parameter extractors", self.parameter_regexes.len());
tracing::info!("  Full line for parameter extraction: '{}'", full_line);
// ... logs each extractor attempt and result
tracing::info!("  Total fields extracted: {}", fields.len());
```

---

## Testing the Fix

### Step 1: Reload VS Code
1. Press `Ctrl+Shift+P`
2. Type "Developer: Reload Window"
3. Press Enter

This will restart the LSP server with the new code.

### Step 2: Open a Test Log File
Open one of these example files:
```
log_scout_analyzer/examples/Jabber-Win-14.3.0.308392-*/jabber.log.1
```

### Step 3: Look for RTP STATS Diagnostics
Search for lines containing "RTP STATS" - these should now show diagnostics with:
- ✅ Extracted parameter values (not placeholders)
- ✅ Human-readable messages with actual data

### Step 4: Check the LSP Server Log
Location: `C:\Users\mitchong\.log-scout-analyzer\lsp-server-2026-02-16.log`

Look for entries like:
```
=== EXTRACT_FIELDS ===
  Pattern ID: 5ea153adebad09000114ae92
  Pattern has 12 parameter extractors
  Full line for parameter extraction: '2025-12-10 17:15:56,798 DEBUG [...] - RTP STATS,session_id=0,...'
  
  Regex has 0 named capture groups
  
  Trying parameter extractor 'SESSION_ID' with regex: session_id=(.+?),
    SUCCESS: Extracted 'SESSION_ID' = '0'
  
  Trying parameter extractor 'SESSION_TYPE' with regex: session_type=(.+?),
    SUCCESS: Extracted 'SESSION_TYPE' = 'audio-main'
  
  ... (more extractors)
  
  Total fields extracted: 12
=== END EXTRACT_FIELDS ===
```

### Step 5: Verify Merged Templates
In the LSP log, look for:
```
=== COMPUTING MERGED_TEMPLATE ===
  Pattern name: [0x000000016c92b000] [cpve/src/main/SessionImpl.cp...
  Template: '<p>RTP Statistics: Session ID=<span>{{ SESSION_ID }}</span>, Type=<span>{{ SESSION_TYPE }}</span></p>'
  Field values count: 12
  
=== SUBSTITUTE_TEMPLATE ===
  Input template: '<p>RTP Statistics: Session ID=<span>{{ SESSION_ID }}</span>...'
  Field values: {"SESSION_ID": "0", "SESSION_TYPE": "audio-main", ...}
  Replaced {{ SESSION_ID }} with '0'
  Replaced {{ SESSION_TYPE }} with 'audio-main'
  Output result: '<p>RTP Statistics: Session ID=<span>0</span>, Type=<span>audio-main</span></p>'
  
  Final merged_template: '<p>RTP Statistics: Session ID=<span>0</span>, Type=<span>audio-main</span></p>'
```

---

## Expected Results

### Before Fix
```
Diagnostic Message: 
"RTP Statistics: Session ID={{ SESSION_ID }}, Type={{ SESSION_TYPE }}"

Field Values: {}  (empty)
```

### After Fix
```
Diagnostic Message:
"RTP Statistics: Session ID=0, Type=audio-main"

Field Values: {
  "SESSION_ID": "0",
  "SESSION_TYPE": "audio-main",
  "rx_pkts_recv": "54",
  "tx_pkts_sent": "77",
  ...
}
```

---

## Test Cases

### Test Case 1: RTP STATS Pattern
**Pattern**: `RTP STATS`
**Log Line**: 
```
2025-12-10 17:15:56,798 DEBUG [cpve] - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=54,tx_pkts_sent=77
```

**Expected Extractions**:
- `SESSION_ID` = `0`
- `SESSION_TYPE` = `audio-main`
- `rx_pkts_recv` = `54`
- `tx_pkts_sent` = `77`

**Verify**: Check that merged_template contains actual values, not `{{ ... }}` placeholders

---

### Test Case 2: HTTP Response Pattern
**Pattern**: `HTTP Response`
**Log Line**:
```
2024-01-15 10:23:45 INFO HTTP Response 404 Not Found for /api/products/999
```

**Expected Extractions**:
- `status_code` = `404`
- `url` = `/api/products/999`

**Verify**: 
- Severity should be Warning (from condition trigger)
- Message should show "HTTP 404 response for /api/products/999"

---

### Test Case 3: Authentication Pattern
**Pattern**: `Authentication failed`
**Log Line**:
```
2024-01-15 10:20:45 WARN Authentication failed for user john.doe (attempt 3/5)
```

**Expected Extractions**:
- `user` = `john.doe`
- `attempt` = `3`
- `max` = `5`

**Verify**:
- Severity should escalate based on attempt number
- Message should show actual user and attempt count

---

## Verification Checklist

- [ ] LSP server restarted (reload VS Code window)
- [ ] Test log file opened
- [ ] Diagnostics appear on relevant lines
- [ ] Diagnostic messages show actual values (not `{{ FIELD }}`)
- [ ] LSP server log shows "=== EXTRACT_FIELDS ===" entries
- [ ] Parameter extractors show "SUCCESS" for matched fields
- [ ] "Total fields extracted" count > 0 for patterns with parameters
- [ ] "Field values count" > 0 in COMPUTING_MERGED_TEMPLATE section
- [ ] Merged templates show substituted values

---

## Troubleshooting

### Issue: Still seeing `{{ FIELD }}` placeholders

**Possible Causes**:
1. VS Code not reloaded - LSP server still running old code
2. Parameter extractor regex doesn't match the log line format
3. Pattern has no parameter extractors defined

**Debug Steps**:
1. Check LSP log for "Pattern has X parameter extractors" - should be > 0
2. Check "Trying parameter extractor" logs - should show the regex attempts
3. Look for "No match for parameter" - indicates regex doesn't match
4. Verify the full line contains the data the extractor expects

---

### Issue: No diagnostics appearing

**Possible Causes**:
1. Pattern regex doesn't match log lines
2. Pattern is disabled
3. LSP server not running

**Debug Steps**:
1. Check LSP log for "Processing file" entries
2. Search for pattern ID in the log
3. Verify pattern is enabled in TagScout cache

---

### Issue: Wrong parameter values extracted

**Possible Causes**:
1. Parameter extractor regex is too greedy
2. Multiple patterns matching same line
3. Extractor capturing wrong group

**Debug Steps**:
1. Check "Extracted 'FIELD' = 'value'" logs
2. Verify parameter regex has proper capture group `(...)`
3. Test regex against actual log line format

---

## Implementation Status

### ✅ Completed
- [x] Modified `extract_fields()` to accept `full_line` parameter
- [x] Updated parameter extraction to use full line instead of matched text
- [x] Updated all function calls (single-line and multi-line patterns)
- [x] Added comprehensive debug logging
- [x] Built and packaged extension
- [x] Documented pattern design philosophy

### 🔄 Testing in Progress
- [ ] Verify RTP STATS pattern extracts all 12+ parameters
- [ ] Verify HTTP response patterns show correct status codes
- [ ] Verify authentication patterns extract user/attempt counts
- [ ] Check that condition triggers work with extracted values
- [ ] Confirm severity escalation based on parameters

### 📋 Future Enhancements
- [ ] Add unit tests for parameter extraction
- [ ] Add visual regression tests for merged templates
- [ ] Implement parameter extraction metrics/statistics
- [ ] Add parameter validation (type checking, range validation)
- [ ] Support computed/derived parameters

---

## Related Documentation

- `PATTERN_DESIGN_PHILOSOPHY.md` - Complete design explanation
- `CITATION_MODEL_IMPLEMENTATION.md` - Diagnostic data structure
- `COMPLETE_IMPLEMENTATION_GUIDE.md` - Overall LSP implementation
- `LSP_DIAGNOSTIC_DATA_STRUCTURE.md` - Diagnostic JSON format

---

## Summary

This fix resolves the parameter extraction issue by ensuring extractors operate on the **full matched log line** rather than just the pattern match text. This aligns with the design philosophy where:

1. **Pattern regex** = Find interesting lines (broad filter)
2. **Parameter extractors** = Extract variable values (from full line)
3. **Condition triggers** = Evaluate severity (based on extracted values)
4. **Template substitution** = Create human message (with actual values)

The fix enables the full power of the pattern system, allowing context-aware severity evaluation and meaningful diagnostic messages.