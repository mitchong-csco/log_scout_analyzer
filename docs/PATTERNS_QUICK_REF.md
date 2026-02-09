# Pattern System - Quick Reference

## Where Are Patterns Stored?

### Default Locations

```
log_scout_analyzer/
├── config/
│   ├── patterns.yaml      # General patterns (errors, warnings, network)
│   ├── jabber.yaml        # Cisco Jabber/CUCM patterns
│   └── webex.yaml         # Webex patterns
```

### Custom Patterns

**VS Code Settings:**
```json
{
  "logScoutAnalyzer.patterns.customFile": "/path/to/my-patterns.yaml"
}
```

**Environment Variable:**
```bash
export LOG_SCOUT_PATTERNS=/path/to/patterns.yaml
```

---

## What Format Are They Stored In?

**Format:** YAML (`.yaml` or `.yml`)

---

## Basic Pattern Structure

```yaml
patterns:
  - id: "unique-id"              # REQUIRED: Unique identifier
    name: "Display Name"         # REQUIRED: Human-readable name
    description: "What it does"  # REQUIRED: Explanation
    pattern: "regex-here"        # REQUIRED: Regular expression
    severity: error              # REQUIRED: error|warning|info|hint
    category: "errors"           # OPTIONAL: Grouping
    enabled: true                # OPTIONAL: Default true
```

---

## Complete Example

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

---

## All Pattern Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `id` | ✅ Yes | string | Unique identifier (e.g., "error-timeout") |
| `name` | ✅ Yes | string | Display name (e.g., "Connection Timeout") |
| `description` | ✅ Yes | string | What this pattern detects |
| `pattern` | ✅ Yes | string | Regex pattern |
| `severity` | ✅ Yes | enum | `error`, `warning`, `info`, `hint` |
| `category` | ❌ No | string | Grouping (e.g., "network", "sip") |
| `service` | ❌ No | string | Service name (e.g., "jabber", "webex") |
| `tags` | ❌ No | array | Tags for classification |
| `action` | ❌ No | string | Suggested remediation |
| `enabled` | ❌ No | boolean | Default: `true` |
| `mode` | ❌ No | object | Pattern matching mode (see below) |
| `expected_frequency` | ❌ No | object | Baseline deviation (see below) |

---

## Severity Levels

```yaml
severity: error      # Critical issues (red underline)
severity: warning    # Needs attention (yellow underline)
severity: info       # Informational (blue underline)
severity: hint       # Suggestions (gray underline)
```

---

## Pattern Matching Modes

### Single Line (Default)

```yaml
mode: singleline
# OR just omit (default)
```

### Multi-Line

```yaml
mode:
  multiline:
    context_lines: 20    # Number of lines to include
```

### Sequence

```yaml
mode:
  sequence:
    max_gap_lines: 10    # Max lines between pattern matches
```

---

## Common Regex Patterns

### Error Patterns

```yaml
# Match ERROR keyword
pattern: '(?i)\bERROR\b'

# Match ERROR with message
pattern: '(?i)ERROR:\s+(.+)'

# Match exceptions
pattern: '(?i)(exception|error):\s*(.+)'

# Match fatal errors
pattern: '(?i)fatal\s*error'
```

### Network Patterns

```yaml
# Timeout
pattern: '(?i)\btimeout\b'

# Connection refused
pattern: '(?i)connection\s+refused'

# IP address
pattern: '\b(?:\d{1,3}\.){3}\d{1,3}\b'
```

### SIP Patterns

```yaml
# SIP Methods
pattern: '\b(INVITE|BYE|ACK|CANCEL|REGISTER)\b'

# SIP Response codes
pattern: '\b([1-6]\d{2})\s+\w+'

# SIP URI
pattern: 'sips?:[^@\s]+@[^@\s>]+'

# 486 Busy
pattern: '\b486\s+Busy\s+Here\b'

# 404 Not Found
pattern: '\b404\s+Not\s+Found\b'
```

### Timestamp Patterns

```yaml
# ISO format
pattern: '\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}'

# Time only
pattern: '\d{2}:\d{2}:\d{2}(?:\.\d{3})?'

# Unix timestamp
pattern: '\b\d{13}\b'
```

---

## Complete Pattern File Example

```yaml
# config/patterns.yaml
version: "1.0"

patterns:
  # ============================================================================
  # ERRORS
  # ============================================================================
  
  - id: "error-exception"
    name: "Exception"
    description: "Detects exception traces in logs"
    pattern: '(?i)(exception|error):\s*(.+)'
    severity: error
    category: "errors"
    tags: ["exception", "critical"]
    action: "Review stack trace and identify root cause"
    enabled: true

  - id: "error-timeout"
    name: "Timeout"
    description: "Operation timeout"
    pattern: '(?i)\btimeout\b'
    severity: error
    category: "network"
    tags: ["timeout", "network"]
    action: "Check network connectivity and service health"
    enabled: true

  # ============================================================================
  # WARNINGS
  # ============================================================================
  
  - id: "warning-deprecated"
    name: "Deprecated Feature"
    description: "Usage of deprecated features"
    pattern: '(?i)deprecat(ed|ion)'
    severity: warning
    category: "warnings"
    tags: ["deprecated", "code-quality"]
    action: "Update code to use current API"
    enabled: true

  # ============================================================================
  # SIP PATTERNS
  # ============================================================================
  
  - id: "sip-404"
    name: "SIP 404 Not Found"
    description: "User does not exist at domain (RFC 3261 §21.4.5)"
    pattern: '\b404\s+Not\s+Found\b'
    severity: error
    category: "sip"
    service: "sip"
    tags: ["sip", "call-failure", "not-found"]
    action: "Verify called number exists in dial plan"
    enabled: true

  - id: "sip-486"
    name: "SIP 486 Busy Here"
    description: "Called party is busy (RFC 3261 §21.4.24)"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip"
    service: "sip"
    tags: ["sip", "call-failure", "busy"]
    action: "User is on another call or has DND enabled"
    enabled: true

  - id: "sip-503"
    name: "SIP 503 Service Unavailable"
    description: "Server temporarily unavailable (RFC 3261 §21.5.4)"
    pattern: '\b503\s+Service\s+Unavailable\b'
    severity: error
    category: "sip"
    service: "sip"
    tags: ["sip", "server-error"]
    action: "Check server health and capacity"
    enabled: true
```

---

## Loading Priority

When patterns are loaded:

1. **Default patterns** from `config/patterns.yaml`
2. **Service patterns** from `config/jabber.yaml`, `config/webex.yaml`
3. **Custom patterns** from user settings (override defaults)

If duplicate IDs exist, **last loaded wins**.

---

## Best Practices

### ✅ Do

- Use `(?i)` for case-insensitive matching
- Use `\b` for word boundaries
- Add RFC references in descriptions for SIP patterns
- Use descriptive IDs like `sip-486-busy`
- Test patterns with real log files
- Group related patterns together
- Add helpful action messages

### ❌ Don't

- Use greedy quantifiers (`.*` instead of `.*?`)
- Create overly broad patterns
- Use generic IDs like `pattern1`
- Forget to test with edge cases
- Leave descriptions empty
- Enable patterns you don't need

---

## Testing Your Patterns

### 1. Create Test Log File

```log
2024-02-08 10:15:23 ERROR: Connection timeout
2024-02-08 10:15:24 WARNING: Deprecated API used
2024-02-08 10:15:25 486 Busy Here
```

### 2. Add Pattern

```yaml
patterns:
  - id: "test-error"
    name: "Test Error"
    pattern: 'ERROR: (.+)'
    severity: error
```

### 3. Open in VS Code

- Should see red underline on ERROR line
- Hover to see diagnostic
- Check Problems panel

---

## Quick Start: Add Your First Pattern

1. **Create/Edit** `config/patterns.yaml`

2. **Add pattern**:
```yaml
patterns:
  - id: "my-error"
    name: "My Custom Error"
    description: "Detects my application errors"
    pattern: 'MY_APP_ERROR: (.+)'
    severity: error
    category: "my-app"
    enabled: true
```

3. **Restart LSP server**:
   - VS Code: Command Palette → "Log Scout: Restart LSP Server"

4. **Test**: Open log file with "MY_APP_ERROR" in it

5. **Verify**: Should see error highlighted

---

## Common Categories

| Category | Use For |
|----------|---------|
| `errors` | Critical errors, exceptions, crashes |
| `warnings` | Non-critical issues, deprecations |
| `network` | Connection issues, timeouts, DNS |
| `authentication` | Login failures, token expires |
| `security` | Unauthorized access, attacks |
| `performance` | Slow queries, high latency |
| `sip` | SIP protocol messages |
| `call` | Call setup, teardown, failures |
| `cucm` | Cisco CUCM specific |
| `webex` | Webex specific |

---

## Summary

**Format**: YAML files  
**Location**: `config/*.yaml` (default) or custom path  
**Structure**: List of pattern objects with required fields  
**Loading**: Automatic at server startup  
**Customization**: Via VS Code settings  
**Priority**: Custom patterns override defaults  

**Minimum Required**:
```yaml
patterns:
  - id: "unique-id"
    name: "Name"
    description: "Description"
    pattern: "regex"
    severity: error
```

**Full Documentation**: See `docs/PATTERN_SYSTEM.md`
