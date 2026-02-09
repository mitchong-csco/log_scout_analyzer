# Pattern Creation Quick Guide

## TL;DR - Pattern Creation Rules

### ✅ DO
1. **Use word boundaries**: `\berror\b` not `error`
2. **Case insensitive**: `(?i)ERROR`
3. **Test with real logs**: Not made-up examples
4. **Specific over general**: Start narrow, widen if needed
5. **Negative lookahead**: Exclude false positives `(?!...)`

### ❌ DON'T
1. **Too broad**: `error` matches "terror", "error_count"
2. **Greedy quantifiers**: Use `.*?` not `.*`
3. **Assume format**: Don't anchor to timestamp format
4. **Skip testing**: Always test before deploy
5. **Duplicate patterns**: Check for overlaps

---

## Quick Pattern Template

```yaml
patterns:
  - id: "category-subcategory-specific"       # Hierarchical ID
    name: "Human Readable Name"               # Clear name
    description: "What it detects (RFC ref)"  # Detailed
    pattern: '(?i)\bKEYWORD\b'               # Regex
    severity: error                           # error|warning|info|hint
    category: "errors"                        # Grouping
    enabled: true                             # Active
```

---

## Common False Positive Fixes

### Problem: Matches "error" in "error_count"
```yaml
# BAD
pattern: 'error'

# GOOD - Word boundaries
pattern: '\berror\b'
```

### Problem: Matches "ERROR: test" in test logs
```yaml
# BAD
pattern: 'ERROR:'

# GOOD - Exclude test context
pattern: '(?i)ERROR:(?!.*test)'
```

### Problem: Matches "timeout configuration"
```yaml
# BAD
pattern: '(?i)timeout'

# GOOD - Add context + exclude config
pattern: '(?i)(?:connection|request)\s+(?:timeout|timed\s+out)(?!.*(?:config|set))'
```

### Problem: Matches "No error occurred"
```yaml
# BAD
pattern: '(?i)error'

# GOOD - Negative lookbehind
pattern: '(?<!no\s)(?i)\berror\b'
# OR - Negative lookahead
pattern: '(?i)\berror\b(?!.*occurred)'
```

---

## Regex Cheat Sheet

### Must-Know Patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `\b` | Word boundary | `\berror\b` |
| `(?i)` | Case insensitive | `(?i)ERROR` |
| `\s+` | One or more whitespace | `ERROR\s+message` |
| `.*?` | Non-greedy match | `ERROR:\s*(.*?)` |
| `(?!...)` | Negative lookahead | `error(?!.*test)` |
| `(?<!...)` | Negative lookbehind | `(?<!no\s)error` |
| `\d+` | One or more digits | `\b\d{3}\s+` |
| `[^\n]+` | Until newline | `ERROR:\s*([^\n]+)` |

### Common Regex Patterns

```yaml
# Error keyword
pattern: '(?i)\b(?:ERROR|FATAL|CRITICAL)\b'

# SIP response code
pattern: '\b[1-6]\d{2}\s+\w+'

# IP address
pattern: '\b(?:\d{1,3}\.){3}\d{1,3}\b'

# Connection error
pattern: '(?i)connection\s+(?:failed|refused|timeout)'

# Timestamp (flexible)
pattern: '\d{2}:\d{2}:\d{2}(?:\.\d{3})?'

# SIP URI
pattern: 'sips?:[^@\s]+@[^@\s>]+'
```

---

## Testing Checklist

### Required Tests

```yaml
# Test file for pattern
true_positives:    # SHOULD match
  - "ERROR: Connection failed"
  - "Error: connection failed"
  - "ERROR Connection Failed"

true_negatives:    # SHOULD NOT match
  - "No error occurred"
  - "error_count = 0"
  - "ERROR: test"
  - "Configured error threshold"
```

### Test Categories

- [ ] Matches expected cases (5+ examples)
- [ ] Doesn't match false positives (5+ examples)
- [ ] Case variations (ERROR, error, Error)
- [ ] Spacing variations (space, tab, multiple)
- [ ] Different log formats (syslog, ISO, JSON)
- [ ] Edge cases (empty lines, very long lines)

---

## Avoiding Duplicates

### Naming Convention

**Format**: `category-subcategory-specific`

```yaml
# GOOD - Organized hierarchy
error-connection-refused
error-connection-timeout
error-authentication-failed
sip-response-error-486-busy
sip-response-error-404-not-found

# BAD - No structure
error1
error2
network-issue
connection-problem
```

### Check for Overlaps

**Before adding a pattern**:
1. Search existing patterns for similar keywords
2. Check if more specific pattern exists
3. Verify category doesn't duplicate
4. Test if both patterns match same logs

---

## Specificity Levels

### Too Specific (Brittle)
```yaml
# Breaks with slight variations
pattern: 'ERROR: Connection failed to 10.1.1.1:5060'
```

### Too General (False Positives)
```yaml
# Matches too much
pattern: 'failed'
```

### Just Right ✓
```yaml
# Specific enough, flexible enough
pattern: '(?i)connection\s+failed'
```

---

## Pattern Quality Metrics

### Target Goals

| Metric | Formula | Target | Minimum |
|--------|---------|--------|---------|
| **Precision** | TP / (TP + FP) | > 95% | > 90% |
| **Recall** | TP / (TP + FN) | > 90% | > 85% |
| **F1 Score** | 2 × (P×R)/(P+R) | > 92% | > 88% |

**TP** = True Positives (correct matches)  
**FP** = False Positives (wrong matches)  
**FN** = False Negatives (missed matches)

---

## Common Patterns Library

### Error Detection

```yaml
# Generic error
- pattern: '(?i)\b(?:ERROR|FATAL|CRITICAL)\b'
  severity: error

# Exception
- pattern: '(?i)(?:exception|error):\s*(.+)'
  severity: error

# Stack trace (multi-line)
- pattern: '(?i)(?:exception|error)[^\n]*\n(?:\s+at\s+.+\n)+'
  mode:
    multiline:
      context_lines: 50
  severity: error
```

### Network Issues

```yaml
# Connection refused
- pattern: '(?i)connection\s+refused'
  severity: error

# Timeout
- pattern: '(?i)(?:connection|request|operation)\s+(?:timeout|timed\s+out)'
  severity: error

# DNS failure
- pattern: '(?i)(?:dns|name)\s+(?:resolution|lookup)\s+failed'
  severity: error
```

### SIP Patterns

```yaml
# 4xx Client Errors
- pattern: '\b4\d{2}\s+\w+'
  severity: error

# 5xx Server Errors
- pattern: '\b5\d{2}\s+\w+'
  severity: error

# 486 Busy
- pattern: '\b486\s+Busy\s+Here\b'
  severity: warning

# 404 Not Found
- pattern: '\b404\s+Not\s+Found\b'
  severity: error

# INVITE method
- pattern: '\bINVITE\s+sip:'
  severity: info
```

### Authentication

```yaml
# Auth failed
- pattern: '(?i)authentication\s+failed'
  severity: error

# Token expired
- pattern: '(?i)token\s+(?:expired|invalid)'
  severity: warning

# Unauthorized
- pattern: '\b401\s+Unauthorized\b'
  severity: error
```

---

## Quick Fixes for Common Issues

### Issue: Too Many False Positives

**Solution**: Add negative lookahead
```yaml
# Before
pattern: '(?i)error'

# After - Exclude common false positives
pattern: '(?i)\berror\b(?!.*(?:test|debug|count|free))'
```

### Issue: Missing Variations

**Solution**: Add alternatives
```yaml
# Before - Misses "timed out"
pattern: '(?i)timeout'

# After - Catches both
pattern: '(?i)(?:timeout|timed\s+out)'
```

### Issue: Case Sensitive

**Solution**: Add (?i) flag
```yaml
# Before
pattern: 'ERROR'

# After
pattern: '(?i)ERROR'
```

### Issue: Matches Within Words

**Solution**: Add word boundaries
```yaml
# Before - Matches "terror"
pattern: 'error'

# After
pattern: '\berror\b'
```

---

## Real-World Example: Creating a Good Pattern

### Goal: Detect SIP 486 Busy errors

**Step 1: Collect Examples**
```log
Received 486 Busy Here
SIP/2.0 486 Busy Here
16:20:15.123 |SIPTcp - 486 Busy Here
```

**Step 2: Identify False Positives**
```log
486 messages processed    # Not an error
Busy Here is a place      # Not SIP
4860 Busy Here Blvd      # Wrong number
```

**Step 3: Write Pattern**
```yaml
patterns:
  - id: "sip-486-busy"
    name: "SIP 486 Busy Here"
    description: "Called party is busy (RFC 3261 §21.4.24)"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip"
    service: "sip"
    tags: ["sip", "call-failure", "busy"]
    action: "User is on another call or has DND enabled"
    enabled: true
```

**Step 4: Test**
- ✓ Matches all 3 true positives
- ✓ Matches 0 false positives
- ✓ Works across different log formats
- ✓ Precision: 99%+
- ✓ Recall: 98%+

**Step 5: Deploy**

---

## Summary

### Pattern Creation Process

1. **Collect** real log examples (10+ samples)
2. **Identify** what should match (true positives)
3. **Identify** what shouldn't match (false positives)
4. **Write** pattern with word boundaries and case-insensitive
5. **Test** against both sets
6. **Measure** precision and recall
7. **Refine** until targets met (Precision > 95%, Recall > 90%)
8. **Deploy** with clear documentation

### Key Rules

✅ Specific enough to avoid false positives  
✅ General enough to catch variations  
✅ Test with real logs, not synthetic examples  
✅ Use hierarchical naming convention  
✅ Add negative lookahead for known false positives  
✅ Document RFC references for SIP patterns  
✅ Measure and improve based on metrics  

### When in Doubt

**Ask yourself**:
- Does this match only what I want? (Precision)
- Does this catch all cases I want? (Recall)
- Would this match in test logs? (False positive check)
- Is there a more specific pattern? (Duplicate check)

---

**Remember**: A good pattern is one that consistently catches what you want and nothing else. Test, measure, refine!