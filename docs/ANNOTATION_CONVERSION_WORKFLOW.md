# Annotation Conversion Workflow

## Quick Start: Convert Your Existing Patterns

This guide walks you through converting patterns from your existing annotation-based tool to Log Scout Analyzer's YAML format.

---

## Your Source Format (From Screenshot)

```
Annotation ID: 5e9db48100bfec000145ebd6

Input Data:
2020-02-04 05:38:19,642 DEBUG [0x00000001003f5fdc0] [esX/Classes/Login/ARXSSOLoginView.m(122)] [i4m] [-[ARXSSOLoginView webView:didFinishLoadForFrame:]] - [ARXSSOLoginView web view frame loaded. Status code: 401]

Regexes:
ARXSSOLoginView web view frame loaded

Categories: Login,HTTP
Severity: Info
Multiline: false
External: true

Name: status
Regex: code: (\d+)
```

---

## Step-by-Step Conversion

### Step 1: Extract Information

From your annotation, identify:

| Field | Value | Maps To |
|-------|-------|---------|
| **Annotation ID** | `5e9db48100bfec000145ebd6` | Pattern ID (shortened) |
| **Input Data** | Full log line | Test case |
| **Regexes** | `ARXSSOLoginView web view frame loaded` | Main pattern |
| **Categories** | `Login,HTTP` | category + tags |
| **Severity** | `Info` | severity |
| **Captures** | `status: code: (\d+)` | Documented in description |

### Step 2: Create Pattern Structure

```yaml
patterns:
  - id: "login-http-arxsso-frame-loaded"
    name: "ARXSSO Login View Frame Loaded"
    description: |
      Detects when ARXSSOLoginView web view frame finishes loading.
      
      This pattern identifies successful or failed login attempts based on
      the HTTP status code returned when the SSO frame loads.
      
      Common status codes:
      - 200: Success
      - 401: Unauthorized (authentication required)
      - 403: Forbidden
      - 404: Not Found
      
      Original Annotation: 5e9db48100bfec000145ebd6
      
      Captures:
        - status: HTTP status code from "code: (\d+)"
    
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?(?:Status\s+)?code:\s*(\d+)'
    
    severity: info
    category: "login"
    service: "arxsso"
    tags: ["login", "http", "webview", "sso", "authentication"]
    
    action: |
      If status code is 401: Check SSO authentication credentials
      If status code is 403: Verify user permissions
      If status code is 404: Check SSO endpoint URL configuration
    
    enabled: true
```

### Step 3: Test Against Original Log Line

**Test Log Line** (from Input Data):
```
2020-02-04 05:38:19,642 DEBUG [0x00000001003f5fdc0] [esX/Classes/Login/ARXSSOLoginView.m(122)] [i4m] [-[ARXSSOLoginView webView:didFinishLoadForFrame:]] - [ARXSSOLoginView web view frame loaded. Status code: 401]
```

**Expected**: ✅ Pattern should match and extract "401"

### Step 4: Test Variations

```yaml
# Additional test cases (variations)
test_cases:
  should_match:
    - "ARXSSOLoginView web view frame loaded. Status code: 200"
    - "ARXSSOLoginView web view frame loaded. code: 401"
    - "arxssoLoginView web view frame loaded. Status Code: 404"
    
  should_not_match:
    - "ARXSSOLoginView frame loading"        # Not loaded yet
    - "Different view frame loaded"          # Different component
    - "ARXSSOLoginView status: pending"      # No code
```

---

## Conversion Examples

### Example 1: Simple Pattern (No Captures)

**Source**:
```
Annotation ID: abc123
Regexes: Connection timeout
Categories: Network,Error
Severity: Error
```

**Converted**:
```yaml
patterns:
  - id: "network-error-connection-timeout"
    name: "Connection Timeout"
    description: "Detects connection timeout errors in network operations"
    pattern: '(?i)Connection\s+timeout'
    severity: error
    category: "network"
    tags: ["network", "error", "timeout"]
    action: "Check network latency and firewall rules"
    enabled: true
```

**Enhancements Made**:
- ✅ Added `(?i)` for case-insensitive matching
- ✅ Added `\s+` for flexible whitespace
- ✅ Added hierarchical ID
- ✅ Added action suggestion

---

### Example 2: Pattern with Capture Groups

**Source**:
```
Annotation ID: def456
Input Data: 2020-02-04 10:15:23 Received 486 Busy Here from bob@example.com
Regexes: Busy Here
Categories: SIP,Call
Severity: Warning

Name: response_code
Regex: (\d{3})

Name: user
Regex: from ([^@\s]+@[^\s]+)
```

**Converted**:
```yaml
patterns:
  - id: "sip-call-486-busy-here"
    name: "SIP 486 Busy Here"
    description: |
      Detects SIP 486 Busy Here responses indicating called party is busy.
      
      RFC 3261 §21.4.24: Called user equipment can receive but user declines 
      to answer (typically on another call or DND enabled).
      
      Captures:
        - response_code: SIP response code (\d{3})
        - user: SIP URI from "from ([^@\s]+@[^\s]+)"
      
      Original Annotation: def456
    
    pattern: '(\d{3})\s+Busy\s+Here(?:\s+from\s+([^@\s]+@[^\s]+))?'
    
    severity: warning
    category: "sip"
    service: "sip"
    tags: ["sip", "call", "busy", "486"]
    
    action: "Call cannot be completed - user is busy. Retry later or check if user has DND enabled."
    
    enabled: true
    
    # Capture groups:
    # $1 - Response code (should be 486)
    # $2 - (Optional) User SIP URI
```

**Enhancements Made**:
- ✅ Combined main pattern with capture regexes
- ✅ Made user capture optional with `(?:...)?`
- ✅ Added RFC reference (RFC 3261 §21.4.24)
- ✅ Added detailed action
- ✅ Added SIP-specific tags

---

### Example 3: HTTP Status Code Pattern

**Source** (Your Screenshot Example):
```
Annotation ID: 5e9db48100bfec000145ebd6
Input Data: [...] Status code: 401
Regexes: ARXSSOLoginView web view frame loaded
Categories: Login,HTTP
Severity: Info
Name: status
Regex: code: (\d+)
```

**Converted & Enhanced**:
```yaml
patterns:
  - id: "login-http-status-code-401"
    name: "HTTP 401 Unauthorized in Login Flow"
    description: |
      Detects HTTP 401 Unauthorized responses during SSO login flow.
      
      This indicates authentication is required or credentials are invalid.
      Common in ARXSSO/SAML authentication flows.
      
      HTTP 401 requires:
      - Valid authentication credentials
      - Proper session tokens
      - Correct authentication headers
      
      Original Annotation: 5e9db48100bfec000145ebd6
    
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?(?:Status\s+)?code:\s*(401)\b'
    
    severity: warning  # Changed from info - 401 is an issue
    category: "authentication"
    service: "sso"
    tags: ["login", "http", "401", "unauthorized", "authentication"]
    
    action: |
      1. Verify user credentials are correct
      2. Check SSO authentication server is reachable
      3. Verify authentication tokens haven't expired
      4. Check for clock sync issues (Kerberos/SAML)
    
    enabled: true
    
    # Capture groups:
    # $1 - HTTP status code (401)
    
    # Test cases:
    # ✓ 2020-02-04 05:38:19 [...] Status code: 401
    # ✓ ARXSSOLoginView web view frame loaded. code: 401
```

---

## Handling Capture Groups

### Capture Group Types

Your annotations have named capture groups like:
- `status` → `code: (\d+)` - Extract HTTP/SIP status codes
- `user` → `from ([^@]+@[^\s]+)` - Extract user URIs
- `server` → `to ([\d\.]+:\d+)` - Extract server addresses

### Integration Strategy

**Option 1: Merge into Main Pattern**
```yaml
# Combine main regex with captures
pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*(\d+)'
```

**Option 2: Document in Description**
```yaml
description: |
  Captures:
    - status: code: (\d+) - HTTP status code
```

**Option 3: Use for Pattern Variants**
```yaml
# Create specific patterns based on captured values

# Pattern for 401 specifically
- id: "login-http-401"
  pattern: 'ARXSSOLoginView.*?code:\s*401\b'
  severity: warning
  
# Pattern for 200 specifically  
- id: "login-http-200"
  pattern: 'ARXSSOLoginView.*?code:\s*200\b'
  severity: info
```

**Recommendation**: Use Option 1 (merge) with Option 2 (document) for best results.

---

## Conversion Tool Design

### Input: JSON Export

```json
{
  "annotations": [
    {
      "id": "5e9db48100bfec000145ebd6",
      "inputData": "2020-02-04 05:38:19,642 DEBUG [...] Status code: 401",
      "regexes": "ARXSSOLoginView web view frame loaded",
      "categories": "Login,HTTP",
      "severity": "Info",
      "multiline": false,
      "external": true,
      "captures": [
        {
          "name": "status",
          "regex": "code: (\\d+)"
        }
      ]
    }
  ]
}
```

### Output: YAML Patterns

```yaml
# Generated by annotation-to-yaml converter
# Date: 2024-02-08
# Source: annotations.json

patterns:
  - id: "login-http-arxsso-frame-loaded"
    name: "ARXSSO Login View Frame Loaded"
    description: |
      Detects: ARXSSOLoginView web view frame loaded
      Original: 5e9db48100bfec000145ebd6
      Captures: status (code: (\d+))
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*(\d+)'
    severity: info
    category: "login"
    tags: ["login", "http"]
    enabled: true
```

### Command Line Tool

```bash
# Install converter
cd tools/annotation-converter
cargo build --release

# Convert single annotation
./target/release/annotation-converter \
  --input annotation.json \
  --output pattern.yaml

# Batch convert
./target/release/annotation-converter \
  --input all-annotations.json \
  --output imported-patterns.yaml \
  --enhance  # Auto-add improvements

# With validation
./target/release/annotation-converter \
  --input annotations.json \
  --output patterns.yaml \
  --validate \
  --test-with-input-data
```

---

## Enhanced Conversion with RFC Mapping

### For SIP Patterns

If your annotation has SIP-related content, auto-add RFC references:

```yaml
# Input annotation
categories: SIP,Call
regexes: 486 Busy Here

# Auto-enhanced output
patterns:
  - id: "sip-response-error-486-busy"
    name: "SIP 486 Busy Here"
    description: |
      Detects SIP 486 Busy Here responses.
      
      RFC 3261 §21.4.24: Called user equipment can receive but user 
      declines to answer.
      
      Common causes:
      - User is on another call
      - Do Not Disturb (DND) enabled
      - Call forwarding to busy destination
    
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip"
    tags: ["sip", "call", "486", "busy"]
    action: "User is busy - retry later or check DND status"
    enabled: true
```

**Auto-added**:
- RFC 3261 reference
- Common causes
- Specific action steps

---

## Workflow Summary

### Simple 3-Step Process

**Step 1: Prepare Export**
```json
{
  "annotations": [
    {
      "id": "annotation-id",
      "inputData": "your log line here",
      "regexes": "main pattern",
      "categories": "Cat1,Cat2",
      "severity": "Error|Warning|Info",
      "captures": [
        {"name": "field1", "regex": "pattern1"},
        {"name": "field2", "regex": "pattern2"}
      ]
    }
  ]
}
```

**Step 2: Run Converter**
```bash
./annotation-converter annotations.json > patterns.yaml
```

**Step 3: Review & Deploy**
```bash
# Review generated patterns
cat patterns.yaml

# Test with original log lines
cargo test --test pattern_validation

# Copy to config directory
cp patterns.yaml ../../config/imported-patterns.yaml

# Restart LSP server
# VS Code: Command Palette → "Log Scout: Restart LSP Server"
```

---

## Manual Conversion Template

If you prefer manual conversion, use this template:

```yaml
patterns:
  # Pattern from annotation {ANNOTATION_ID}
  - id: "{category}-{subcategory}-{specific}"
    name: "{Human Readable Name}"
    
    description: |
      {What this pattern detects}
      
      Original Annotation: {ANNOTATION_ID}
      
      {Add RFC reference if SIP/HTTP related}
      
      Captures:
        - {capture_name}: {capture_regex}
      
      Test Case:
      {Original Input Data line}
    
    # Main pattern + merged captures
    pattern: '{regexes}.*?{capture_regex}'
    
    # Map severity: Error→error, Warning→warning, Info→info
    severity: {severity.lowercase}
    
    # First category becomes primary
    category: "{first_category.lowercase}"
    
    # Other categories become tags
    tags: [{all_categories.lowercase}]
    
    # Optional: Add action/remediation
    action: "{Suggested fix or next steps}"
    
    enabled: true
```

---

## Example: Your Screenshot Pattern

### Source Data
```
Annotation ID: 5e9db48100bfec000145ebd6
Input Data: 2020-02-04 05:38:19,642 DEBUG [...] Status code: 401
Regexes: ARXSSOLoginView web view frame loaded
Categories: Login,HTTP
Severity: Info
Captures: status → code: (\d+)
```

### Converted Pattern (Basic)
```yaml
patterns:
  - id: "login-http-arxsso-frame"
    name: "ARXSSO Frame Loaded"
    description: |
      ARXSSOLoginView web view frame loaded.
      Original: 5e9db48100bfec000145ebd6
      Captures: status code
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*(\d+)'
    severity: info
    category: "login"
    tags: ["login", "http"]
    enabled: true
```

### Enhanced Pattern (Production Quality)
```yaml
patterns:
  # Generic pattern - catches all status codes
  - id: "login-http-arxsso-frame-loaded"
    name: "ARXSSO Login Frame Loaded"
    description: |
      Detects when ARXSSOLoginView web view frame finishes loading during
      SSO authentication flow. Captures HTTP status code to determine
      success or failure.
      
      Original Annotation: 5e9db48100bfec000145ebd6
    pattern: '(?i)ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?(?:Status\s+)?code:\s*(\d+)'
    severity: info
    category: "login"
    service: "sso"
    tags: ["login", "http", "webview", "sso"]
    enabled: true
    
  # Specific pattern - 401 Unauthorized (more actionable)
  - id: "login-http-arxsso-401-unauthorized"
    name: "SSO Login 401 Unauthorized"
    description: |
      ARXSSOLoginView received 401 Unauthorized response.
      Authentication credentials required or invalid.
      
      HTTP 401 indicates:
      - User not authenticated
      - Session expired
      - Invalid credentials
      
      Related: Annotation 5e9db48100bfec000145ebd6
    pattern: '(?i)ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*401\b'
    severity: warning  # 401 is an issue, not just info
    category: "authentication"
    service: "sso"
    tags: ["login", "http", "401", "unauthorized", "authentication-failure"]
    action: |
      1. Verify user credentials
      2. Check SSO server is accessible
      3. Verify authentication tokens
      4. Check for expired sessions
    enabled: true
```

**Why Two Patterns?**
- Generic pattern captures all status codes (info level)
- Specific 401 pattern provides better diagnostics (warning level)
- More specific pattern = better action suggestions

---

## Automated Conversion Script

### Python Script

```python
#!/usr/bin/env python3
"""
Convert annotation-based patterns to Log Scout YAML format
"""

import json
import sys
from typing import List, Dict

def convert_annotation(anno: Dict) -> Dict:
    """Convert single annotation to Log Scout pattern"""
    
    # Extract fields
    anno_id = anno.get('id', anno.get('annotationId', 'unknown'))
    regexes = anno.get('regexes', '')
    categories = anno.get('categories', '').split(',')
    severity = anno.get('severity', 'info').lower()
    captures = anno.get('captures', [])
    input_data = anno.get('inputData', '')
    
    # Build pattern ID
    cats_clean = [c.strip().lower().replace(' ', '-') for c in categories]
    pattern_id = '-'.join(cats_clean[:2]) + '-' + anno_id[:8]
    
    # Generate name from regex
    name = regexes.strip()
    if len(name) > 50:
        name = name[:47] + '...'
    
    # Build pattern with captures
    pattern = regexes.replace(' ', r'\s+')
    
    if captures:
        for cap in captures:
            cap_regex = cap.get('regex', '')
            if cap_regex and cap_regex not in pattern:
                pattern += r'.*?' + cap_regex
    
    # Add case-insensitive flag
    if not pattern.startswith('(?i)'):
        pattern = '(?i)' + pattern
    
    # Build description
    capture_doc = '\n'.join([
        f"  - {c.get('name')}: {c.get('regex')}"
        for c in captures
    ])
    
    description = f"""Detects: {regexes}

Original Annotation: {anno_id}

Captures:
{capture_doc}

Test Case:
{input_data}"""
    
    # Build pattern object
    return {
        'id': pattern_id,
        'name': name,
        'description': description,
        'pattern': pattern,
        'severity': severity,
        'category': cats_clean[0] if cats_clean else 'general',
        'tags': cats_clean,
        'enabled': True
    }

def main():
    # Read JSON from stdin or file
    input_file = sys.argv[1] if len(sys.argv) > 1 else '/dev/stdin'
    
    with open(input_file) as f:
        data = json.load(f)
    
    annotations = data.get('annotations', [data])
    
    # Convert all annotations
    patterns = [convert_annotation(a) for a in annotations]
    
    # Output as YAML
    import yaml
    output = {'patterns': patterns}
    print(yaml.dump(output, default_flow_style=False, sort_keys=False))

if __name__ == '__main__':
    main()
```

### Usage

```bash
# Install dependencies
pip install pyyaml

# Convert
python convert-annotations.py annotations.json > patterns.yaml

# Or via pipe
cat annotations.json | python convert-annotations.py > patterns.yaml
```

---

## Quality Assurance

### After Conversion Checklist

- [ ] All original log lines match their patterns
- [ ] Pattern IDs are unique
- [ ] No overlapping/duplicate patterns
- [ ] Severity levels are appropriate
- [ ] Capture groups are properly integrated
- [ ] Added word boundaries where needed
- [ ] Made patterns case-insensitive
- [ ] Added RFC references for SIP/HTTP patterns
- [ ] Added action/remediation suggestions
- [ ] Tested with variations of log lines

### Validation Tool

```rust
// Validate all patterns in file
fn validate_patterns(yaml_file: &str) -> Result<ValidationReport> {
    let patterns = load_patterns(yaml_file)?;
    let mut report = ValidationReport::new();
    
    for pattern in &patterns {
        // Check for duplicates
        report.check_duplicate_id(pattern);
        
        // Validate regex
        report.validate_regex(&pattern.pattern);
        
        // Check if matches test case
        if let Some(test_case) = extract_test_case(&pattern.description) {
            report.test_against_input(&pattern, &test_case);
        }
    }
    
    report
}
```

---

## Best Practices for Imported Patterns

### 1. Always Test Original Log Line

The Input Data from your annotation is a gold mine - it's a real test case!

```yaml
# Include in description for automatic testing
description: |
  Original test case:
  {inputData}
```

### 2. Enhance After Import

Don't just blindly import - enhance:
- Add RFC references (SIP/HTTP)
- Add action suggestions
- Improve regex specificity
- Add negative lookahead for false positives

### 3. Organize by Service

```yaml
# Group imported patterns by service
config/
├── patterns.yaml           # Generic patterns
├── sip-imported.yaml       # Imported SIP patterns
├── http-imported.yaml      # Imported HTTP patterns
├── login-imported.yaml     # Imported login patterns
└── custom-app.yaml         # Application-specific
```

### 4. Preserve Original IDs

Keep annotation IDs for reference:
```yaml
description: |
  Original Annotation: 5e9db48100bfec000145ebd6
  
  This allows tracing back to source system.
```

---

## Summary

### Conversion Workflow

1. **Export** annotations from existing tool (JSON format)
2. **Run converter** (automated tool or manual template)
3. **Review** generated YAML patterns
4. **Enhance** patterns (RFC refs, actions, specificity)
5. **Test** against original Input Data lines
6. **Validate** (no duplicates, regex correct, severity appropriate)
7. **Deploy** to `config/` directory
8. **Monitor** for false positives in production

### Key Points

✅ **Preserve original log lines** - They're perfect test cases  
✅ **Merge capture groups** - Integrate into main pattern  
✅ **Document captures** - Explain what each group extracts  
✅ **Enhance with RFC refs** - Add for SIP/HTTP patterns  
✅ **Test variations** - Don't just test original line  
✅ **Organize by category** - Keep related patterns together  
✅ **Unique IDs** - Use hierarchical naming  

### Benefits

- 🚀 **Fast bootstrap** - Import hundreds of patterns quickly
- 🎯 **Real test cases** - Input Data provides validation
- 📚 **Preserve knowledge** - Keep institutional patterns
- ✨ **Enhance incrementally** - Improve patterns over time
- 🔄 **Bidirectional** - Can export back if needed

---

**Next**: Create the annotation converter tool and start importing your existing patterns!