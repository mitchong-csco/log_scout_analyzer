# Pattern Creation Best Practices

## Overview

This guide covers efficient pattern creation, avoiding duplicates, and preventing false positives. Following these practices ensures high-quality, maintainable pattern definitions.

---

## Table of Contents

1. [Pattern Design Philosophy](#pattern-design-philosophy)
2. [Preventing Duplicates](#preventing-duplicates)
3. [Avoiding False Positives](#avoiding-false-positives)
4. [Pattern Testing Strategy](#pattern-testing-strategy)
5. [Pattern Organization](#pattern-organization)
6. [Common Pitfalls](#common-pitfalls)
7. [Pattern Metrics](#pattern-metrics)
8. [Real-World Examples](#real-world-examples)

---

## Pattern Design Philosophy

### The Golden Rules

1. **Specific Over General** - Start specific, generalize only if needed
2. **Test Before Deploy** - Always test with real log samples
3. **Document Intent** - Clear descriptions prevent duplicates
4. **Measure Accuracy** - Track false positives and negatives
5. **Iterate** - Refine patterns based on feedback

### Specificity Spectrum

```
TOO SPECIFIC                    OPTIMAL                    TOO GENERAL
     ↓                             ↓                            ↓
"Connection failed to            "Connection failed"         "failed"
 10.1.1.100:5060 at             (right level of detail)    (too broad)
 2024-02-08 10:15:23"
(brittle, won't match variants)                          (many false positives)
```

**Goal**: Find the sweet spot between specificity and generality.

---

## Preventing Duplicates

### Problem: Overlapping Patterns

**Bad Example - Duplicates**:
```yaml
patterns:
  # Pattern 1
  - id: "error-1"
    pattern: '(?i)ERROR'
    severity: error
    
  # Pattern 2 (DUPLICATE - matches same thing!)
  - id: "error-message"
    pattern: '(?i)\bERROR\b'
    severity: error
    
  # Pattern 3 (ALSO DUPLICATE!)
  - id: "error-log"
    pattern: 'ERROR:'
    severity: error
```

**Problem**: All three match the same log lines, creating duplicate diagnostics.

### Solution 1: Unique Pattern IDs with Clear Scope

**Good Example - Non-Overlapping**:
```yaml
patterns:
  # Generic error (broad)
  - id: "error-generic"
    name: "Generic Error"
    description: "Catches any ERROR keyword"
    pattern: '(?i)\bERROR\b'
    severity: error
    category: "errors"
    
  # Specific error (narrow)
  - id: "error-connection-refused"
    name: "Connection Refused"
    description: "Specific connection error"
    pattern: '(?i)ERROR.*connection\s+refused'
    severity: error
    category: "network"
    
  # Different context (distinct)
  - id: "sip-error-response"
    name: "SIP Error Response"
    description: "SIP 4xx/5xx responses"
    pattern: '\b[45]\d{2}\s+\w+'
    severity: error
    category: "sip"
```

**Why it works**:
- Each pattern has a distinct purpose
- More specific patterns have higher priority
- Clear descriptions prevent accidental duplication

### Solution 2: Pattern Hierarchy

**Organize from Specific to General**:
```yaml
patterns:
  # LEVEL 1: Most Specific (SIP-specific errors)
  - id: "sip-486-busy"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip-busy"
    
  - id: "sip-404-not-found"
    pattern: '\b404\s+Not\s+Found\b'
    severity: error
    category: "sip-not-found"
  
  # LEVEL 2: Moderate Specificity (Network errors)
  - id: "network-connection-refused"
    pattern: '(?i)connection\s+refused'
    severity: error
    category: "network-connection"
    
  - id: "network-timeout"
    pattern: '(?i)(?:connection\s+)?timeout'
    severity: error
    category: "network-timeout"
  
  # LEVEL 3: Generic (Fallback)
  - id: "error-generic"
    pattern: '(?i)\bERROR\b'
    severity: error
    category: "errors-generic"
```

**Loading Order**: Specific patterns first, generic last.

### Solution 3: Duplicate Detection Tool

**Check for overlaps before adding**:
```rust
// Pattern validation
pub fn check_duplicates(patterns: &[Pattern]) -> Vec<DuplicateWarning> {
    let mut warnings = Vec::new();
    
    for i in 0..patterns.len() {
        for j in (i+1)..patterns.len() {
            // Check if patterns are too similar
            if patterns_overlap(&patterns[i], &patterns[j]) {
                warnings.push(DuplicateWarning {
                    pattern1: patterns[i].id.clone(),
                    pattern2: patterns[j].id.clone(),
                    reason: "Patterns may match the same content",
                });
            }
        }
    }
    
    warnings
}
```

### Pattern Naming Convention

**Use Hierarchical IDs**:
```yaml
# Good - Clear hierarchy
sip-response-error-486-busy
sip-response-error-404-not-found
network-error-connection-refused
network-error-timeout
auth-error-failed
auth-error-expired

# Bad - No organization
error1
error2
busy-error
network-problem
```

**Format**: `category-subcategory-specific-detail`

---

## Avoiding False Positives

### Problem 1: Too Broad Patterns

**Bad Example**:
```yaml
# Matches too much!
patterns:
  - id: "error-bad"
    pattern: 'error'
    severity: error
```

**False Positives**:
```log
✗ No error occurred        # Contains "error" but not an error!
✗ Error-free processing    # Word contains "error"
✗ DEBUG: error_count = 0   # Variable name
✗ URL: /api/errors         # URL path
```

**Good Example**:
```yaml
patterns:
  - id: "error-good"
    pattern: '(?i)\bERROR\b(?!\s*(?:free|count|occurred|=))'
    severity: error
```

**Explanation**:
- `\b` - Word boundaries (avoid matching within words)
- `(?i)` - Case insensitive but specific
- `(?!...)` - Negative lookahead (don't match "error free", "error_count", etc.)

### Problem 2: Context Matters

**Bad Example - No Context**:
```yaml
patterns:
  - id: "timeout-bad"
    pattern: 'timeout'
    severity: error
```

**False Positives**:
```log
✗ Configured timeout: 30s     # Configuration, not an error
✗ Connection timeout (retry)  # Handled, not critical
✗ timeout_ms = 5000           # Variable name
✗ Set timeout to 30           # Command
```

**Good Example - With Context**:
```yaml
patterns:
  - id: "timeout-good"
    pattern: '(?i)(?:connection|request|operation)\s+(?:timed\s+out|timeout)(?!\s+(?:set|configured|=))'
    severity: error
```

**Only matches actual timeout errors**:
```log
✓ Connection timed out
✓ Request timeout occurred
✓ Operation timed out
✗ Configured timeout: 30s     # Negative lookahead prevents match
```

### Problem 3: Severity Misclassification

**Bad Example**:
```yaml
# SIP 180 Ringing marked as error!
patterns:
  - id: "sip-response"
    pattern: '\b\d{3}\s+\w+'
    severity: error  # WRONG! Not all responses are errors
```

**Good Example**:
```yaml
patterns:
  # Success responses
  - id: "sip-2xx-success"
    pattern: '\b2\d{2}\s+\w+'
    severity: info
    
  # Provisional responses
  - id: "sip-1xx-provisional"
    pattern: '\b1\d{2}\s+\w+'
    severity: info
    
  # Client errors
  - id: "sip-4xx-client-error"
    pattern: '\b4\d{2}\s+\w+'
    severity: error
    
  # Server errors
  - id: "sip-5xx-server-error"
    pattern: '\b5\d{2}\s+\w+'
    severity: error
```

### Problem 4: Ignoring Common Patterns

**Bad Example - Matches Informational Messages**:
```yaml
patterns:
  - id: "failed-bad"
    pattern: '(?i)failed'
    severity: error
```

**False Positives**:
```log
✗ Authentication failed (expected for first attempt)
✗ Failed over to backup server (expected behavior)
✗ Operation failed but will retry (handled)
✗ No errors, 0 failed
```

**Good Example - Exclude Expected Failures**:
```yaml
patterns:
  - id: "failed-good"
    pattern: '(?i)(?:critically|permanently|unexpectedly)\s+failed'
    severity: error
    
  - id: "failed-retry"
    pattern: '(?i)failed.*(?:retry|retrying|will\s+retry)'
    severity: warning  # Not error, it's retrying
```

### Solution: Negative Patterns

**Exclude known false positives**:
```yaml
patterns:
  - id: "error-real"
    name: "Real Error"
    description: "Matches ERROR but not test/debug/informational"
    pattern: '(?i)\bERROR\b(?!.*(?:test|debug|info|count|free|expected))'
    severity: error
```

**Negative Lookahead Syntax**:
- `(?!...)` - Don't match if followed by pattern
- `(?<!...)` - Don't match if preceded by pattern

**Examples**:
```yaml
# Don't match "ERROR" in test logs
pattern: '(?i)ERROR(?!.*test)'

# Don't match "failed" if it says "will retry"
pattern: '(?i)failed(?!.*retry)'

# Don't match "timeout" if it's configuration
pattern: '(?i)timeout(?!.*(?:config|setting|set))'
```

---

## Pattern Testing Strategy

### Test-Driven Pattern Development

**Process**:
1. Collect real log samples
2. Identify what SHOULD match (true positives)
3. Identify what SHOULD NOT match (true negatives)
4. Write pattern
5. Test against both sets
6. Refine until accurate

### Example Test Cases

```yaml
# Pattern under test
patterns:
  - id: "sip-486-busy"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
```

**Test File** (`tests/sip-486-test.log`):
```log
# SHOULD MATCH (True Positives)
2024-02-08 10:15:23 Received 486 Busy Here
16:20:15.123 |SIPTcp - 486 Busy Here
SIP/2.0 486 Busy Here
486 Busy Here from bob@example.com

# SHOULD NOT MATCH (True Negatives)
486 messages processed      # Number, not SIP response
Busy Here is a restaurant   # Words but not SIP code
4860 Busy Here Blvd        # Different number
486Busy                     # No space
```

### Testing Checklist

**For each pattern, test**:
- ✅ Matches expected cases (true positives)
- ✅ Doesn't match false positives
- ✅ Works across different log formats
- ✅ Handles case variations (ERROR, error, Error)
- ✅ Handles spacing variations (space, tab, multiple spaces)
- ✅ Doesn't match in comments or test logs
- ✅ Severity is correct

### Automated Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sip_486_pattern() {
        let pattern = Pattern {
            id: "sip-486-busy".to_string(),
            pattern: r"\b486\s+Busy\s+Here\b".to_string(),
            severity: Severity::Warning,
            // ...
        };
        
        let engine = PatternEngine::new(vec![pattern], 0.7, 5).unwrap();
        
        // True positives (should match)
        let should_match = vec![
            "Received 486 Busy Here",
            "SIP/2.0 486 Busy Here",
            "16:20:15.123 |SIPTcp - 486 Busy Here",
        ];
        
        for line in should_match {
            let matches = engine.process_line(line, 0);
            assert!(!matches.is_empty(), "Should match: {}", line);
        }
        
        // True negatives (should NOT match)
        let should_not_match = vec![
            "486 messages processed",
            "Busy Here is a place",
            "4860 Busy",
            "486Busy",
        ];
        
        for line in should_not_match {
            let matches = engine.process_line(line, 0);
            assert!(matches.is_empty(), "Should NOT match: {}", line);
        }
    }
    
    #[test]
    fn test_no_false_positives() {
        let patterns = load_all_patterns().unwrap();
        let engine = PatternEngine::new(patterns, 0.7, 5).unwrap();
        
        // Known false positive examples
        let false_positives = vec![
            "No error occurred",
            "error_count = 0",
            "ERROR-free processing",
            "timeout configuration: 30s",
            "Set timeout to 5000ms",
        ];
        
        for line in false_positives {
            let matches = engine.process_line(line, 0);
            assert!(matches.is_empty(), 
                "False positive detected: '{}' matched {:?}", 
                line, matches);
        }
    }
}
```

---

## Pattern Organization

### File Structure

```
config/
├── patterns.yaml           # Core patterns (errors, warnings, network)
├── sip-patterns.yaml       # SIP-specific patterns (organized by code)
├── cucm-patterns.yaml      # Cisco CUCM patterns
├── webex-patterns.yaml     # Webex patterns
└── custom/                 # User-custom patterns
    └── my-app.yaml
```

### Within-File Organization

```yaml
# patterns.yaml

# ==============================================================================
# ERRORS - Critical Issues
# ==============================================================================

patterns:
  # --- Exceptions ---
  - id: "error-exception"
    name: "Exception"
    pattern: '(?i)(exception|error):\s*(.+)'
    severity: error
    category: "exceptions"
  
  - id: "error-stack-trace"
    name: "Stack Trace"
    pattern: '(?i)(?:exception|error)[^\n]*\n(?:\s+at\s+.+\n)+'
    mode:
      multiline:
        context_lines: 50
    severity: error
    category: "exceptions"
  
  # --- Network Errors ---
  - id: "error-connection-refused"
    name: "Connection Refused"
    pattern: '(?i)connection\s+refused'
    severity: error
    category: "network"
    
  - id: "error-connection-timeout"
    name: "Connection Timeout"
    pattern: '(?i)connection\s+(?:timeout|timed\s+out)'
    severity: error
    category: "network"

# ==============================================================================
# WARNINGS - Non-Critical Issues
# ==============================================================================

  # --- Deprecations ---
  - id: "warning-deprecated"
    name: "Deprecated Feature"
    pattern: '(?i)deprecat(?:ed|ion)'
    severity: warning
    category: "deprecation"

# ==============================================================================
# SIP PATTERNS - Organized by Response Code
# ==============================================================================

  # --- 4xx Client Errors ---
  - id: "sip-404-not-found"
    name: "SIP 404 Not Found"
    description: "User does not exist (RFC 3261 §21.4.5)"
    pattern: '\b404\s+Not\s+Found\b'
    severity: error
    category: "sip"
    service: "sip"
    tags: ["sip", "4xx", "not-found"]
```

### Naming Convention Summary

| Level | Example | Purpose |
|-------|---------|---------|
| **Category** | `error`, `warning`, `sip`, `network` | Top-level grouping |
| **Subcategory** | `connection`, `authentication`, `response` | More specific area |
| **Type** | `refused`, `timeout`, `404` | Specific issue |
| **Full ID** | `error-connection-refused` | Unique identifier |

---

## Common Pitfalls

### Pitfall 1: Overly Greedy Matching

**Problem**:
```yaml
# BAD - Greedy quantifier
pattern: 'ERROR: (.*)'
```

**Issue**: `.*` matches everything to end of line, even across log entries if multiline.

**Solution**:
```yaml
# GOOD - Non-greedy quantifier
pattern: 'ERROR: (.*?)'
# OR - Specific end boundary
pattern: 'ERROR: ([^\n]+)'
```

### Pitfall 2: Case Sensitivity

**Problem**:
```yaml
# BAD - Only matches uppercase
pattern: 'ERROR'
```

**Misses**:
```log
error: Something failed
Error: Something Failed  
ErRoR: Something failed
```

**Solution**:
```yaml
# GOOD - Case insensitive
pattern: '(?i)ERROR'
```

### Pitfall 3: No Word Boundaries

**Problem**:
```yaml
# BAD - Matches within words
pattern: 'error'
```

**False Positives**:
```log
✗ terror attack         # Contains "error"
✗ interror handling     # Contains "error"
✗ error-prone           # Partial match
```

**Solution**:
```yaml
# GOOD - Word boundaries
pattern: '\berror\b'
```

### Pitfall 4: Assuming Field Order

**Problem**:
```yaml
# BAD - Assumes timestamp, then ERROR, then message
pattern: '^\d{4}-\d{2}-\d{2}.*ERROR:\s*(.+)$'
```

**Breaks with**:
```log
ERROR: Connection failed [2024-02-08]    # Timestamp at end
[ERROR] Connection failed                # No timestamp
```

**Solution**:
```yaml
# GOOD - Order independent
pattern: '(?i)ERROR:?\s*connection\s+failed'
```

### Pitfall 5: Not Testing Edge Cases

**Common Edge Cases**:
- Empty lines
- Very long lines
- Special characters in message
- Unicode characters
- Multiple errors on same line
- Partial log entries (truncated)

**Example**:
```yaml
# Test these scenarios
test_cases:
  - ""                                    # Empty line
  - "ERROR: " + ("x" * 10000)            # Very long message
  - "ERROR: File not found: /path/\u0000" # Null character
  - "ERROR: 日本語のエラー"               # Unicode
  - "ERROR: Failed ERROR: Retry"         # Multiple matches
```

---

## Pattern Metrics

### Measuring Pattern Quality

**Key Metrics**:

1. **Precision** = True Positives / (True Positives + False Positives)
   - How many matches are actually correct?
   - Goal: > 95%

2. **Recall** = True Positives / (True Positives + False Negatives)
   - How many actual errors did we catch?
   - Goal: > 90%

3. **F1 Score** = 2 × (Precision × Recall) / (Precision + Recall)
   - Balance between precision and recall
   - Goal: > 92%

### Example Metrics Collection

```rust
pub struct PatternMetrics {
    pub pattern_id: String,
    pub true_positives: usize,
    pub false_positives: usize,
    pub false_negatives: usize,
}

impl PatternMetrics {
    pub fn precision(&self) -> f64 {
        let tp = self.true_positives as f64;
        let fp = self.false_positives as f64;
        if tp + fp == 0.0 { return 0.0; }
        tp / (tp + fp)
    }
    
    pub fn recall(&self) -> f64 {
        let tp = self.true_positives as f64;
        let fn_ = self.false_negatives as f64;
        if tp + fn_ == 0.0 { return 0.0; }
        tp / (tp + fn_)
    }
    
    pub fn f1_score(&self) -> f64 {
        let p = self.precision();
        let r = self.recall();
        if p + r == 0.0 { return 0.0; }
        2.0 * (p * r) / (p + r)
    }
}
```

### Pattern Quality Report

```
Pattern Metrics Report
=====================

Pattern: error-connection-refused
  True Positives:  95
  False Positives:  3
  False Negatives:  5
  Precision:       96.9%  ✓ GOOD
  Recall:          95.0%  ✓ GOOD
  F1 Score:        96.0%  ✓ EXCELLENT

Pattern: error-generic
  True Positives:  150
  False Positives: 25
  False Negatives:  2
  Precision:       85.7%  ⚠ NEEDS IMPROVEMENT
  Recall:          98.7%  ✓ EXCELLENT
  F1 Score:        91.8%  ⚠ ACCEPTABLE
  
  Recommendation: Add negative lookahead to reduce false positives
```

---

## Real-World Examples

### Example 1: SIP 486 Busy - Evolution

**Version 1 (Too Broad)**:
```yaml
pattern: '486'
```
**Problem**: Matches "486" in any context (line numbers, counts, addresses)

**Version 2 (Better)**:
```yaml
pattern: '486 Busy'
```
**Problem**: Misses "486  Busy" (two spaces) or "486\tBusy" (tab)

**Version 3 (Production Quality)**:
```yaml
pattern: '\b486\s+Busy\s+Here\b'
```
**Result**: 
- Precision: 99.2%
- Recall: 97.8%
- F1 Score: 98.5%

### Example 2: Connection Timeout - Avoiding False Positives

**Version 1 (Too Broad)**:
```yaml
pattern: '(?i)timeout'
```
**False Positives**: Configuration lines, variable names, log messages about setting timeouts

**Version 2 (Added Context)**:
```yaml
pattern: '(?i)connection.*timeout'
```
**False Positives**: "Connection timeout set to 30s"

**Version 3 (Production Quality)**:
```yaml
pattern: '(?i)connection\s+(?:timed\s+out|timeout)(?!\s+(?:set|configured|=|:))'
```
**Result**:
- Precision: 98.1%
- Recall: 96.5%
- F1 Score: 97.3%

### Example 3: Stack Trace - Multi-Line Pattern

**Version 1 (Single Line - Incomplete)**:
```yaml
pattern: '(?i)exception'
```
**Problem**: Catches first line but misses stack trace context

**Version 2 (Multi-Line - Complete)**:
```yaml
pattern: '(?i)(?:exception|error)[^\n]*\n(?:\s+at\s+.+\n)+'
mode:
  multiline:
    context_lines: 50
```
**Result**:
- Captures full stack trace
- Provides complete context
- Easier debugging

---

## Pattern Review Checklist

Before adding a new pattern, check:

### Design
- [ ] Clear, unique ID following naming convention
- [ ] Descriptive name and detailed description
- [ ] Appropriate severity level
- [ ] Proper category assignment
- [ ] RFC references (if applicable)

### Quality
- [ ] Tested with 10+ real log examples
- [ ] Tested for false positives
- [ ] Case insensitive where appropriate
- [ ] Word boundaries used correctly
- [ ] No duplicate/overlapping patterns

### Regex
- [ ] Non-greedy quantifiers used (`.*?` not `.*`)
- [ ] Word boundaries where needed (`\b`)
- [ ] Negative lookahead for exclusions (`(?!...)`)
- [ ] Flexible whitespace (`\s+`)
- [ ] Format-agnostic (works across log formats)

### Performance
- [ ] Pattern as specific as possible
- [ ] No catastrophic backtracking
- [ ] Efficient regex (no nested quantifiers)

### Documentation
- [ ] Comments explain complex regex
- [ ] Example matches provided
- [ ] Edge cases documented
- [ ] Action/remediation suggested

---

## Summary

### Key Takeaways

**Preventing Duplicates**:
1. Use unique, hierarchical IDs
2. Clear descriptions prevent accidental duplication
3. Organize patterns by specificity
4. Use duplicate detection tools

**Avoiding False Positives**:
1. Test with real logs (not just made-up examples)
2. Use word boundaries (`\b`)
3. Add negative lookahead for known false positives
4. Context matters - don't match configuration/tests
5. Measure precision/recall

**Efficient Creation**:
1. Start specific, generalize if needed
2. Test-driven development (write tests first)
3. Organize patterns hierarchically
4. Document intent clearly
5. Iterate based on metrics

### Pattern Quality Targets

| Metric | Target | Acceptable | Needs Work |
|--------|--------|-----------|------------|
| **Precision** | > 95% | > 90% | < 90% |
| **Recall** | > 90% | > 85% | < 85% |
| **F1 Score** | > 92% | > 88% | < 88% |

### Quick Reference

**Good Pattern Template**:
```yaml
patterns:
  - id: "category-subcategory-specific"
    name: "Human Readable Name"
    description: "Detailed explanation with RFC if applicable"
    pattern: '(?i)\bKEYWORD\b(?!.*(?:false|positive|patterns))'
    severity: error|warning|info|hint
    category: "category"
    service: "service-name"  # optional
    tags: ["tag1", "tag2"]   # optional
    action: "Suggested fix"  # optional
    enabled: true
```

**Testing Template**:
```yaml
# Test cases for pattern
true_positives:
  - "Should match this line"
  - "And this line"
  
true_negatives:
  - "Should NOT match this"
  - "Or this"
```

---

**Remember**: Good patterns are specific enough to avoid false positives, but general enough to catch variations. Always test with real logs!