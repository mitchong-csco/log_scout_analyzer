# Pattern Import and Conversion Guide

## Overview

This guide explains how to import patterns from existing analysis tools and convert them to Log Scout Analyzer's YAML format. This allows you to leverage previous work and quickly bootstrap your pattern library.

---

## Table of Contents

1. [Understanding the Source Format](#understanding-the-source-format)
2. [Converting to Log Scout Format](#converting-to-log-scout-format)
3. [Pattern Import Tool](#pattern-import-tool)
4. [Example Conversions](#example-conversions)
5. [Annotation-Based Patterns](#annotation-based-patterns)
6. [Testing Imported Patterns](#testing-imported-patterns)
7. [Batch Import](#batch-import)

---

## Understanding the Source Format

### Example: Annotation-Based Pattern

Based on your screenshot, you have patterns in this format:

```
Annotation ID: 5e9db48100bfec000145ebd6

Input Data (Log Line):
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

### Key Components

1. **Log Line Sample** - Example of what the pattern should match
2. **Main Pattern** - The primary text to detect
3. **Categories** - Classification tags (Login, HTTP)
4. **Severity** - Error level (Info, Warning, Error)
5. **Capture Groups** - Named regex patterns to extract values (status, code)
6. **Metadata** - Multiline, External flags

---

## Converting to Log Scout Format

### Conversion Mapping

| Source Field | Log Scout Field | Notes |
|--------------|----------------|-------|
| Annotation ID | `id` | Use as unique identifier |
| Regexes | `pattern` | Main regex pattern |
| Categories | `category` + `tags` | Split into primary category and tags |
| Severity | `severity` | Map to: error, warning, info, hint |
| Name/Regex (capture) | Pattern description | Document in description |
| Input Data | Test case | Use for validation |

### Conversion Template

```yaml
patterns:
  - id: "annotation-{annotation-id}"
    name: "{derived from regexes or manual}"
    description: "{what this detects - include capture info}"
    pattern: '{main regex pattern}'
    severity: {severity.lowercase}
    category: "{first category}"
    tags: [{other categories}]
    enabled: true
    
    # Optional: Document capture groups in description
    # Captures: status (code: (\d+))
```

---

## Example Conversions

### Example 1: HTTP Status Code Pattern

**Source (Annotation Format)**:
```
Annotation ID: 5e9db48100bfec000145ebd6

Input Data:
2020-02-04 05:38:19,642 DEBUG [...] - [ARXSSOLoginView web view frame loaded. Status code: 401]

Regexes:
ARXSSOLoginView web view frame loaded

Categories: Login,HTTP
Severity: Info

Name: status
Regex: code: (\d+)
```

**Converted (Log Scout YAML)**:
```yaml
patterns:
  - id: "login-arxsso-frame-loaded"
    name: "ARXSSO Login View Frame Loaded"
    description: |
      Detects when ARXSSOLoginView web view frame finishes loading.
      Captures HTTP status code for analysis.
      Original: Annotation 5e9db48100bfec000145ebd6
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?(?:Status\s+)?code:\s*(\d+)'
    severity: info
    category: "login"
    service: "arxsso"
    tags: ["login", "http", "webview", "status-code"]
    enabled: true
    
    # Capture groups:
    # $1 - HTTP status code (e.g., 401, 200, 404)
    
    # Test case:
    # 2020-02-04 05:38:19,642 DEBUG [...] - [ARXSSOLoginView web view frame loaded. Status code: 401]
```

### Example 2: Error Pattern with Severity Mapping

**Source**:
```
Annotation ID: abc123

Input Data:
2020-02-04 10:15:23 ERROR Connection failed to server 10.1.1.100:5060

Regexes:
Connection failed

Categories: Network,Error
Severity: Error

Name: server
Regex: to server ([\d\.]+:\d+)
```

**Converted**:
```yaml
patterns:
  - id: "network-connection-failed"
    name: "Connection Failed"
    description: |
      Detects connection failures to remote servers.
      Captures server IP and port for troubleshooting.
      Original: Annotation abc123
    pattern: 'Connection\s+failed\s+to\s+server\s+([\d\.]+:\d+)'
    severity: error
    category: "network"
    tags: ["network", "connection", "error"]
    action: "Check network connectivity and firewall rules to target server"
    enabled: true
    
    # Capture groups:
    # $1 - Server address (IP:port format, e.g., 10.1.1.100:5060)
```

### Example 3: Multi-Category Pattern

**Source**:
```
Input Data:
2020-02-04 11:30:45 WARN SIP INVITE timeout for call to bob@example.com

Regexes:
SIP INVITE timeout

Categories: SIP,Call,Timeout
Severity: Warning
```

**Converted**:
```yaml
patterns:
  - id: "sip-invite-timeout"
    name: "SIP INVITE Timeout"
    description: |
      Detects timeouts when sending SIP INVITE requests.
      Indicates network issues or unresponsive callee.
    pattern: 'SIP\s+INVITE\s+timeout(?:\s+for\s+call\s+to\s+([^\s]+))?'
    severity: warning
    category: "sip"
    service: "sip"
    tags: ["sip", "call", "timeout", "invite"]
    action: "Check network connectivity to destination and verify callee is available"
    enabled: true
    
    # Capture groups:
    # $1 - (Optional) Destination SIP URI
```

---

## Pattern Import Tool

### Automated Conversion Script

Create a conversion tool to transform annotation format to YAML:

```rust
// tools/pattern_importer/src/main.rs

use serde::{Deserialize, Serialize};
use std::fs;

/// Source annotation format
#[derive(Debug, Deserialize)]
struct Annotation {
    #[serde(rename = "annotationId")]
    annotation_id: String,
    
    #[serde(rename = "inputData")]
    input_data: String,
    
    regexes: String,
    
    categories: String,  // Comma-separated
    
    severity: String,
    
    multiline: bool,
    
    #[serde(default)]
    captures: Vec<CaptureGroup>,
}

#[derive(Debug, Deserialize)]
struct CaptureGroup {
    name: String,
    regex: String,
}

/// Target Log Scout pattern
#[derive(Debug, Serialize)]
struct LogScoutPattern {
    id: String,
    name: String,
    description: String,
    pattern: String,
    severity: String,
    category: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    service: Option<String>,
    tags: Vec<String>,
    enabled: bool,
}

fn convert_annotation(anno: Annotation) -> LogScoutPattern {
    // Parse categories
    let cats: Vec<String> = anno.categories
        .split(',')
        .map(|s| s.trim().to_lowercase())
        .collect();
    
    let primary_category = cats.first()
        .cloned()
        .unwrap_or_else(|| "general".to_string());
    
    // Generate ID from annotation ID or first category
    let id = if anno.annotation_id.len() > 10 {
        format!("imported-{}", &anno.annotation_id[..10])
    } else {
        format!("{}-{}", primary_category, anno.annotation_id)
    };
    
    // Combine main regex with capture groups
    let mut pattern = anno.regexes.clone();
    
    // If there are capture groups, try to incorporate them
    if !anno.captures.is_empty() {
        // Build description with capture info
        let capture_doc = anno.captures.iter()
            .map(|c| format!("{}: {}", c.name, c.regex))
            .collect::<Vec<_>>()
            .join("\n      ");
        
        // Try to merge main pattern with captures
        pattern = merge_pattern_with_captures(&anno.regexes, &anno.captures);
    }
    
    // Map severity
    let severity = match anno.severity.to_lowercase().as_str() {
        "error" | "critical" | "fatal" => "error",
        "warning" | "warn" => "warning",
        "info" | "information" => "info",
        "hint" | "debug" => "hint",
        _ => "info",
    }.to_string();
    
    // Generate name from regex or category
    let name = generate_name(&anno.regexes, &primary_category);
    
    // Build description
    let description = format!(
        "Detects: {}\n\nOriginal Annotation: {}\n\nTest Case:\n{}",
        anno.regexes,
        anno.annotation_id,
        anno.input_data
    );
    
    LogScoutPattern {
        id,
        name,
        description,
        pattern,
        severity,
        category: primary_category,
        service: None,
        tags: cats,
        enabled: true,
    }
}

fn merge_pattern_with_captures(main: &str, captures: &[CaptureGroup]) -> String {
    let mut pattern = main.to_string();
    
    // If pattern doesn't already have captures, try to add them
    for capture in captures {
        // Look for the capture context in the pattern
        // This is heuristic - may need manual adjustment
        if !pattern.contains(&capture.regex) {
            pattern = format!("{}.*?{}", pattern, capture.regex);
        }
    }
    
    pattern
}

fn generate_name(regex: &str, category: &str) -> String {
    // Convert regex to human-readable name
    // Remove regex special chars, capitalize words
    let cleaned = regex
        .replace("\\s+", " ")
        .replace("\\", "")
        .replace(".*", "")
        .replace(".+", "")
        .replace("(", "")
        .replace(")", "")
        .replace("[", "")
        .replace("]", "")
        .trim()
        .to_string();
    
    if cleaned.is_empty() {
        format!("{} Pattern", category.to_uppercase())
    } else {
        // Capitalize first letter of each word
        cleaned
            .split_whitespace()
            .map(|w| {
                let mut chars = w.chars();
                match chars.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().chain(chars).collect(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    }
}

fn main() {
    // Read annotations from JSON file
    let input = fs::read_to_string("annotations.json")
        .expect("Failed to read input file");
    
    let annotations: Vec<Annotation> = serde_json::from_str(&input)
        .expect("Failed to parse annotations");
    
    // Convert each annotation
    let patterns: Vec<LogScoutPattern> = annotations
        .into_iter()
        .map(convert_annotation)
        .collect();
    
    // Output as YAML
    let yaml = serde_yaml::to_string(&patterns)
        .expect("Failed to serialize to YAML");
    
    println!("{}", yaml);
}
```

### Usage

```bash
# Install the converter
cd tools/pattern_importer
cargo build --release

# Convert annotations.json to patterns.yaml
cat annotations.json | ./target/release/pattern_importer > patterns.yaml

# Or process file directly
./target/release/pattern_importer annotations.json > imported-patterns.yaml
```

---

## Annotation-Based Patterns

### Input Format (JSON)

```json
{
  "annotations": [
    {
      "annotationId": "5e9db48100bfec000145ebd6",
      "inputData": "2020-02-04 05:38:19,642 DEBUG [...] - [ARXSSOLoginView web view frame loaded. Status code: 401]",
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
    },
    {
      "annotationId": "abc123def456",
      "inputData": "2020-02-04 10:15:23 ERROR Connection failed to 10.1.1.100:5060",
      "regexes": "Connection failed",
      "categories": "Network,Error",
      "severity": "Error",
      "multiline": false,
      "captures": [
        {
          "name": "server",
          "regex": "to ([\\d\\.]+:\\d+)"
        }
      ]
    }
  ]
}
```

### Output Format (YAML)

```yaml
patterns:
  - id: "login-arxsso-frame-loaded"
    name: "Arxsso Login View Frame Loaded"
    description: |
      Detects: ARXSSOLoginView web view frame loaded
      
      Original Annotation: 5e9db48100bfec000145ebd6
      
      Captures:
        - status: code: (\d+)
      
      Test Case:
      2020-02-04 05:38:19,642 DEBUG [...] - [ARXSSOLoginView web view frame loaded. Status code: 401]
    pattern: 'ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*(\d+)'
    severity: info
    category: "login"
    tags: ["login", "http"]
    enabled: true
    
  - id: "network-connection-failed"
    name: "Connection Failed"
    description: |
      Detects: Connection failed
      
      Original Annotation: abc123def456
      
      Captures:
        - server: to ([\d\.]+:\d+)
      
      Test Case:
      2020-02-04 10:15:23 ERROR Connection failed to 10.1.1.100:5060
    pattern: 'Connection\s+failed\s+to\s+([\d\.]+:\d+)'
    severity: error
    category: "network"
    tags: ["network", "error"]
    enabled: true
```

---

## Testing Imported Patterns

### Validate Against Original Log Lines

After conversion, test each pattern against its original input data:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_imported_pattern_login_arxsso() {
        let pattern = Pattern {
            id: "login-arxsso-frame-loaded".to_string(),
            pattern: r"ARXSSOLoginView\s+web\s+view\s+frame\s+loaded.*?code:\s*(\d+)".to_string(),
            severity: Severity::Info,
            // ...
        };
        
        let test_line = "2020-02-04 05:38:19,642 DEBUG [0x00000001003f5fdc0] [esX/Classes/Login/ARXSSOLoginView.m(122)] [i4m] [-[ARXSSOLoginView webView:didFinishLoadForFrame:]] - [ARXSSOLoginView web view frame loaded. Status code: 401]";
        
        let engine = PatternEngine::new(vec![pattern], 0.7, 5).unwrap();
        let matches = engine.process_line(test_line, 0);
        
        assert!(!matches.is_empty(), "Pattern should match original log line");
        
        // Verify capture group
        // Should capture "401" from "Status code: 401"
        // (Implementation depends on your capture group handling)
    }
}
```

### Test Suite Generation

Generate test files automatically:

```yaml
# tests/imported-patterns-test.yaml
tests:
  - pattern_id: "login-arxsso-frame-loaded"
    should_match:
      - "2020-02-04 05:38:19,642 DEBUG [...] - [ARXSSOLoginView web view frame loaded. Status code: 401]"
      - "ARXSSOLoginView web view frame loaded. Status code: 200"
    should_not_match:
      - "Different view frame loaded"
      - "ARXSSOLoginView started"
      
  - pattern_id: "network-connection-failed"
    should_match:
      - "2020-02-04 10:15:23 ERROR Connection failed to 10.1.1.100:5060"
      - "Connection failed to 192.168.1.1:443"
    should_not_match:
      - "Connection succeeded"
      - "No connection issues"
```

---

## Batch Import

### Import Multiple Annotations

```bash
#!/bin/bash
# import-annotations.sh

ANNOTATIONS_FILE=$1
OUTPUT_FILE=${2:-imported-patterns.yaml}

echo "Importing annotations from: $ANNOTATIONS_FILE"
echo "Output file: $OUTPUT_FILE"

# Convert annotations to YAML
./pattern_importer "$ANNOTATIONS_FILE" > "$OUTPUT_FILE"

# Validate the output
echo "Validating patterns..."
cd ../../lsp-server
cargo test --test pattern_validation

echo "Import complete!"
echo "Patterns written to: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "1. Review patterns in $OUTPUT_FILE"
echo "2. Adjust regex patterns if needed"
echo "3. Test with real log files"
echo "4. Copy to config/ directory"
echo "5. Restart LSP server"
```

### Import Workflow

```
1. Export annotations from previous tool
   ↓
2. Format as JSON (see example above)
   ↓
3. Run conversion tool
   ↓
4. Review generated YAML
   ↓
5. Test patterns with original log lines
   ↓
6. Adjust patterns if needed
   ↓
7. Merge into main patterns file
   ↓
8. Deploy to LSP server
```

---

## Manual Conversion Guidelines

### When to Adjust Patterns

After automated conversion, you may need to manually adjust:

1. **Regex Specificity**
   - Original: `Connection failed`
   - Improved: `Connection\s+failed` (explicit whitespace)

2. **Capture Groups Integration**
   - Original pattern and captures are separate
   - Merge into single pattern: `Connection failed.*?to\s+([\d\.]+:\d+)`

3. **Category Organization**
   - Split comma-separated categories
   - Choose primary category logically
   - Others become tags

4. **Pattern Names**
   - Auto-generated names may be generic
   - Add descriptive, specific names

5. **Severity Validation**
   - Verify severity matches issue criticality
   - Adjust if needed (e.g., timeout might be warning, not error)

### Enhancement Checklist

After import, enhance each pattern:

- [ ] Add word boundaries (`\b`) if appropriate
- [ ] Make case-insensitive with `(?i)`
- [ ] Add negative lookahead for false positives
- [ ] Document what capture groups extract
- [ ] Add action/remediation suggestion
- [ ] Include RFC references (for SIP patterns)
- [ ] Test with variations of log line

---

## Example: Complete Import Process

### Step 1: Source Annotation

```
Annotation ID: 5e9db48100bfec000145ebd6
Input Data: 2020-02-04 05:38:19,642 DEBUG [...] Status code: 401
Regexes: Status code
Categories: Login,HTTP
Severity: Info
Name: status
Regex: code: (\d+)
```

### Step 2: Automated Conversion

```yaml
patterns:
  - id: "imported-5e9db48100"
    name: "Status Code"
    description: "Detects: Status code"
    pattern: 'Status code.*?code:\s*(\d+)'
    severity: info
    category: "login"
    tags: ["login", "http"]
    enabled: true
```

### Step 3: Manual Enhancement

```yaml
patterns:
  - id: "http-status-code-response"
    name: "HTTP Status Code Response"
    description: |
      Detects HTTP status code responses in login flow.
      Common codes: 200 (OK), 401 (Unauthorized), 404 (Not Found)
      
      Original: Annotation 5e9db48100bfec000145ebd6
    pattern: '(?i)Status\s+code:\s*(\d{3})'
    severity: info
    category: "http"
    service: "login"
    tags: ["login", "http", "status-code", "response"]
    enabled: true
    
    # Capture groups:
    # $1 - HTTP status code (e.g., 200, 401, 404, 500)
    
    # Test cases:
    # ✓ 2020-02-04 05:38:19,642 DEBUG [...] Status code: 401
    # ✓ Status Code: 200
    # ✓ status code: 404
```

### Step 4: Test

```rust
#[test]
fn test_http_status_code() {
    let pattern = load_pattern("http-status-code-response");
    let engine = PatternEngine::new(vec![pattern], 0.7, 5).unwrap();
    
    // Original test case
    assert!(matches_line(&engine, "Status code: 401"));
    
    // Variations
    assert!(matches_line(&engine, "Status Code: 200"));
    assert!(matches_line(&engine, "status code: 404"));
    
    // Should not match
    assert!(!matches_line(&engine, "Status: OK"));
    assert!(!matches_line(&engine, "code: 12345"));
}
```

---

## Summary

### Import Process Overview

1. **Export** annotations from previous tool
2. **Format** as JSON with required fields
3. **Convert** using automated tool
4. **Review** generated YAML patterns
5. **Enhance** patterns manually
6. **Test** with original log lines
7. **Deploy** to Log Scout Analyzer

### Key Benefits

✅ **Leverage existing work** - Don't start from scratch  
✅ **Quick bootstrap** - Import hundreds of patterns quickly  
✅ **Preserve knowledge** - Keep institutional knowledge  
✅ **Test coverage** - Original log lines serve as test cases  
✅ **Improve incrementally** - Enhance patterns over time  

### What Gets Preserved

- Original log line (test case)
- Pattern regex (main and captures)
- Categories and severity
- Annotation ID (for reference)

### What Gets Enhanced

- Word boundaries and case handling
- Pattern specificity
- False positive prevention
- RFC references
- Action suggestions
- Better naming and organization

---

**Next Steps**: Start by exporting 5-10 sample annotations, run the converter, review output, and iterate on the conversion logic until you're satisfied with the results.