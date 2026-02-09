# Pattern System Documentation

## Overview

The Log Scout Analyzer uses a **YAML-based pattern configuration system** for defining log analysis rules. Patterns are stored in YAML files and loaded by the LSP server at runtime.

---

## Pattern Storage Location

### Default Pattern Files

```
log_scout_analyzer/
├── config/
│   ├── patterns.yaml      # General patterns (errors, warnings, etc.)
│   ├── jabber.yaml        # Cisco Jabber/CUCM specific patterns
│   └── webex.yaml         # Webex specific patterns
```

### Custom Pattern Files

Users can specify custom pattern files via:

**VS Code Settings:**
```json
{
  "logScoutAnalyzer.patterns.customFile": "/path/to/custom-patterns.yaml"
}
```

**Environment Variable:**
```bash
LOG_SCOUT_PATTERNS=/path/to/patterns.yaml
```

**Command Line (future):**
```bash
log-scout-lsp-server --patterns=/path/to/patterns.yaml
```

---

## Pattern File Format

Patterns are defined in **YAML** format using this structure:

### Basic Pattern Structure

```yaml
patterns:
  - id: "unique-pattern-id"
    name: "Human Readable Name"
    description: "Detailed description of what this pattern detects"
    pattern: "regex-pattern-here"
    severity: error|warning|info|hint
    category: "category-name"
    enabled: true
```

### Complete Pattern Schema

```yaml
patterns:
  - id: string                    # REQUIRED: Unique identifier
    name: string                  # REQUIRED: Display name
    description: string           # REQUIRED: What this detects
    pattern: string               # REQUIRED: Regex pattern
    
    # Pattern Matching Mode (OPTIONAL)
    mode: singleline              # Default: singleline
    # OR
    mode:
      multiline:
        context_lines: 10         # Lines of context
    # OR
    mode:
      sequence:
        max_gap_lines: 5          # Max lines between patterns
    
    severity: error               # REQUIRED: error|warning|info|hint
    category: string              # OPTIONAL: Grouping category
    service: string               # OPTIONAL: Service name (jabber, webex, etc.)
    tags: [string, ...]           # OPTIONAL: Classification tags
    action: string                # OPTIONAL: Suggested remediation
    enabled: boolean              # OPTIONAL: Default true
    
    # Baseline Deviation Detection (OPTIONAL)
    expected_frequency:
      expected_count: 0           # Expected occurrences
      window_seconds: 3600        # Per time window (seconds)
      threshold_percent: 10       # Deviation threshold
```

---

## Pattern Examples

### Example 1: Simple Error Pattern

```yaml
patterns:
  - id: "error-connection-refused"
    name: "Connection Refused"
    description: "Detects connection refused errors"
    pattern: '(?i)connection\s+refused'
    severity: error
    category: "network"
    tags: ["network", "connectivity"]
    action: "Check network connectivity and firewall rules"
    enabled: true
```

### Example 2: SIP Response Pattern

```yaml
patterns:
  - id: "sip-busy-here"
    name: "SIP 486 Busy Here"
    description: "Called party is busy"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip"
    service: "sip"
    tags: ["sip", "call-failure", "busy"]
    action: "Retry call later or check if user has DND enabled"
    enabled: true
```

### Example 3: Multi-Line Pattern

```yaml
patterns:
  - id: "stack-trace"
    name: "Stack Trace"
    description: "Detects multi-line exception stack traces"
    pattern: '(?i)(exception|error).*\n(?:\s+at\s+.+\n)+'
    mode:
      multiline:
        context_lines: 20
    severity: error
    category: "exceptions"
    tags: ["exception", "stack-trace"]
    action: "Analyze stack trace to identify root cause"
    enabled: true
```

### Example 4: Sequence Pattern

```yaml
patterns:
  - id: "auth-failure-sequence"
    name: "Multiple Authentication Failures"
    description: "Detects pattern of repeated auth failures"
    pattern: 'Authentication failed.*\n.*Retry attempt'
    mode:
      sequence:
        max_gap_lines: 10
    severity: warning
    category: "security"
    tags: ["authentication", "security", "brute-force"]
    action: "Check for potential brute force attack"
    enabled: true
```

### Example 5: Baseline Deviation

```yaml
patterns:
  - id: "critical-error-spike"
    name: "Critical Error Spike"
    description: "Detects unusual spike in critical errors"
    pattern: '(?i)critical\s+error'
    severity: error
    category: "errors"
    expected_frequency:
      expected_count: 0         # Normally zero critical errors
      window_seconds: 3600      # Per hour
      threshold_percent: 10     # 10% deviation triggers alert
    enabled: true
```

---

## Pattern Categories

Common categories used for organizing patterns:

### Standard Categories

| Category | Description | Examples |
|----------|-------------|----------|
| `errors` | Critical errors | Exceptions, fatal errors, crashes |
| `warnings` | Non-critical issues | Deprecations, slow operations |
| `network` | Network issues | Connection failures, timeouts |
| `authentication` | Auth issues | Login failures, token expires |
| `performance` | Performance issues | Slow queries, high latency |
| `security` | Security issues | Unauthorized access, attacks |
| `sip` | SIP protocol | SIP requests/responses |
| `call` | Call-related | Call setup, teardown, failures |
| `media` | Media issues | RTP, codec, quality issues |

### Service-Specific Categories

| Service | Categories |
|---------|-----------|
| `jabber` | presence, chat, call, conferencing |
| `webex` | meeting, recording, api, integration |
| `cucm` | registration, dial-plan, trunk |

---

## Severity Levels

### Error (Critical)

**When to use:**
- Service failures
- Crashes and exceptions
- Data loss
- Security breaches
- Call failures (4xx/5xx SIP responses)

**Visual:**
- Red underline in editor
- ❌ Error icon in Problems panel

**Example:**
```yaml
severity: error
```

### Warning (Needs Attention)

**When to use:**
- Deprecated features
- Slow performance
- Retries and backoffs
- Partial failures
- 1xx/3xx SIP responses

**Visual:**
- Yellow underline in editor
- ⚠️ Warning icon in Problems panel

**Example:**
```yaml
severity: warning
```

### Info (Informational)

**When to use:**
- Status messages
- Successful operations
- Informational events
- 2xx SIP responses

**Visual:**
- Blue underline in editor
- ℹ️ Info icon in Problems panel

**Example:**
```yaml
severity: info
```

### Hint (Suggestions)

**When to use:**
- Code improvements
- Best practice suggestions
- Optimization opportunities

**Visual:**
- Gray underline in editor
- 💡 Hint icon in Problems panel

**Example:**
```yaml
severity: hint
```

---

## Regex Pattern Guide

### Basic Patterns

```yaml
# Match exact text (case-insensitive)
pattern: '(?i)error'

# Match with word boundaries
pattern: '\berror\b'

# Capture groups
pattern: 'ERROR:\s+(.+)'

# Match IP addresses
pattern: '\b(?:\d{1,3}\.){3}\d{1,3}\b'

# Match timestamps
pattern: '\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}'

# Match SIP URIs
pattern: 'sip:[^@]+@[^\s;]+'
```

### Advanced Patterns

```yaml
# Non-greedy matching
pattern: 'ERROR:\s+(.+?)\n'

# Lookahead/lookbehind
pattern: '(?<=Call-ID:\s)[\w-]+'

# Alternative matches
pattern: '(INVITE|BYE|CANCEL)'

# Negative lookahead
pattern: 'ERROR(?!\s+ignored)'

# Multi-line matching
pattern: '(?s)BEGIN.*?END'
```

### SIP-Specific Patterns

```yaml
# SIP Methods
pattern: '\b(INVITE|ACK|BYE|CANCEL|REGISTER|OPTIONS)\b'

# SIP Response Codes
pattern: '\b([1-6]\d{2})\s+\w+'

# SIP URIs
pattern: 'sips?:[^@\s]+@[^@\s>]+'

# Call-ID
pattern: 'Call-ID:\s*([\w.-]+@[\w.-]+)'

# From/To headers
pattern: '(?:From|To):\s*(?:"([^"]+)")?\s*<sip:([^@>]+)@([^>]+)>'
```

---

## Pattern Matching Modes

### Single Line (Default)

Matches within a single line of the log file.

```yaml
mode: singleline
# OR (default, can be omitted)
```

**Use for:**
- Most error messages
- Single-line SIP messages
- Status messages
- Simple patterns

### Multi-Line

Matches across multiple lines with context window.

```yaml
mode:
  multiline:
    context_lines: 20
```

**Use for:**
- Stack traces
- Multi-line SIP message dumps
- Log blocks
- Complex error contexts

### Sequence

Matches a sequence of patterns that must appear in order.

```yaml
mode:
  sequence:
    max_gap_lines: 10
```

**Use for:**
- Call flows (INVITE → 180 → 200)
- Authentication sequences
- Multi-step failures
- Correlated events

---

## Pattern File Examples

### Example 1: General Patterns File

```yaml
# config/patterns.yaml
version: "1.0"

patterns:
  # Errors
  - id: "error-exception"
    name: "Exception"
    description: "Detects exception traces"
    pattern: '(?i)exception:\s*(.+)'
    severity: error
    category: "errors"
    enabled: true

  - id: "error-fatal"
    name: "Fatal Error"
    description: "Fatal errors causing termination"
    pattern: '(?i)fatal\s*error:\s*(.+)'
    severity: error
    category: "errors"
    enabled: true

  # Warnings
  - id: "warning-deprecated"
    name: "Deprecated Feature"
    description: "Usage of deprecated features"
    pattern: '(?i)deprecat(ed|ion)'
    severity: warning
    category: "warnings"
    enabled: true

  # Network
  - id: "network-timeout"
    name: "Network Timeout"
    description: "Network operation timeout"
    pattern: '(?i)\btimeout\b'
    severity: warning
    category: "network"
    enabled: true
```

### Example 2: SIP Patterns File

```yaml
# config/sip-patterns.yaml
version: "1.0"

patterns:
  # SIP Request Methods
  - id: "sip-invite"
    name: "SIP INVITE"
    description: "SIP call initiation (RFC 3261 §13.1)"
    pattern: '\bINVITE\s+sip:'
    severity: info
    category: "sip"
    service: "sip"
    tags: ["sip", "call-setup"]
    enabled: true

  - id: "sip-bye"
    name: "SIP BYE"
    description: "SIP call termination (RFC 3261 §15.1)"
    pattern: '\bBYE\s+sip:'
    severity: info
    category: "sip"
    service: "sip"
    tags: ["sip", "call-teardown"]
    enabled: true

  # SIP Responses - Errors
  - id: "sip-404"
    name: "SIP 404 Not Found"
    description: "User does not exist (RFC 3261 §21.4.5)"
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
    tags: ["sip", "server-error", "availability"]
    action: "Check server health and capacity"
    enabled: true
```

### Example 3: Cisco CUCM Patterns

```yaml
# config/cucm-patterns.yaml
version: "1.0"

patterns:
  - id: "cucm-sdl-error"
    name: "CUCM SDL Error"
    description: "SDL trace error messages"
    pattern: '^\d{2}:\d{2}:\d{2}\.\d{3}\s+\|\s*ERR'
    severity: error
    category: "cucm"
    service: "cucm"
    enabled: true

  - id: "cucm-registration-failed"
    name: "Phone Registration Failed"
    description: "Phone failed to register with CUCM"
    pattern: '(?i)registration\s+failed.*device'
    severity: error
    category: "cucm"
    service: "cucm"
    tags: ["registration", "phone"]
    action: "Check network connectivity and phone configuration"
    enabled: true

  - id: "cucm-trunk-down"
    name: "SIP Trunk Down"
    description: "SIP trunk connection lost"
    pattern: '(?i)trunk.*(?:down|unavailable|unreachable)'
    severity: error
    category: "cucm"
    service: "cucm"
    tags: ["trunk", "connectivity"]
    action: "Check trunk configuration and remote gateway"
    enabled: true
```

---

## Loading Patterns

### Server-Side Loading

The LSP server loads patterns at startup:

```rust
// Load default patterns
let default_patterns = load_patterns("config/patterns.yaml")?;

// Load service-specific patterns
let jabber_patterns = load_patterns("config/jabber.yaml")?;
let webex_patterns = load_patterns("config/webex.yaml")?;

// Merge all patterns
let all_patterns = merge_patterns(vec![
    default_patterns,
    jabber_patterns,
    webex_patterns,
]);

// Create pattern engine
let engine = PatternEngine::new(all_patterns, 0.7, 5)?;
```

### Custom Pattern Loading

Users can override with custom patterns:

```rust
// Check for custom pattern file
if let Ok(custom_path) = env::var("LOG_SCOUT_PATTERNS") {
    let custom_patterns = load_patterns(custom_path)?;
    // Custom patterns override defaults
}
```

---

## Pattern Priority

When multiple patterns match the same text:

1. **Most Specific First** - Longest/most specific pattern wins
2. **Highest Severity** - Errors before warnings before info
3. **First Defined** - If equal, first in file wins

---

## Pattern Testing

### Test Pattern Files

Create test files to validate patterns:

```yaml
# tests/patterns/test-error-patterns.yaml
patterns:
  - id: "test-error"
    name: "Test Error"
    pattern: "TEST_ERROR"
    severity: error
```

### Unit Tests

```rust
#[test]
fn test_error_pattern() {
    let yaml = r#"
patterns:
  - id: "error-test"
    name: "Test Error"
    pattern: "ERROR: (.+)"
    severity: error
    category: "test"
"#;
    
    let patterns = parse_patterns(yaml).unwrap();
    assert_eq!(patterns.len(), 1);
    assert_eq!(patterns[0].id, "error-test");
}
```

### Test Log Files

```
examples/
├── test-errors.log       # Test error detection
├── test-sip.log          # Test SIP parsing
└── test-cucm-sdl.log     # Test CUCM patterns
```

---

## Best Practices

### Pattern Design

1. **Use Word Boundaries** - `\berror\b` not just `error`
2. **Case Insensitive** - Use `(?i)` flag for keywords
3. **Capture Groups** - Extract useful information
4. **Specific Over General** - Specific patterns first
5. **Test Thoroughly** - Test with real log samples

### Pattern Organization

1. **Group by Category** - Keep related patterns together
2. **Use Comments** - Document complex patterns
3. **Descriptive IDs** - `sip-486-busy` not `pattern-42`
4. **Meaningful Names** - Clear, human-readable names
5. **Detailed Descriptions** - Include RFC references

### Performance

1. **Avoid Greedy Quantifiers** - Use `.*?` not `.*`
2. **Anchor When Possible** - Use `^` and `$`
3. **Limit Backtracking** - Avoid nested quantifiers
4. **Enable Selectively** - Disable unused patterns
5. **Use Single-Line Mode** - Default for performance

---

## Migration from v0.0.x

If you have patterns from the old VS Code extension:

### Old Format (TypeScript)
```typescript
const patterns = [
  {
    id: 'error',
    regex: /ERROR: (.+)/gi,
    severity: 'error'
  }
];
```

### New Format (YAML)
```yaml
patterns:
  - id: "error"
    name: "Error Message"
    description: "Detects ERROR messages"
    pattern: '(?i)ERROR: (.+)'
    severity: error
    category: "errors"
    enabled: true
```

---

## Summary

**Format**: YAML  
**Location**: `config/*.yaml`  
**Schema**: See "Complete Pattern Schema" section  
**Loading**: Automatic at server startup  
**Customization**: Via settings or environment variables  
**Priority**: Specific → Severity → Order  

**Key Features:**
- ✅ Human-readable YAML format
- ✅ RFC annotations supported
- ✅ Multi-line pattern matching
- ✅ Sequence detection
- ✅ Baseline deviation detection
- ✅ Service-specific patterns
- ✅ Extensible and customizable

---

**For complete examples, see:** `config/patterns.yaml`, `config/jabber.yaml`, `config/webex.yaml`
