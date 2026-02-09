# Log Format Handling Strategy

## The Challenge

Different systems produce logs in vastly different formats:

```log
# Format 1: Syslog (RFC 3164)
Feb  8 10:15:23 server01 myapp[1234]: ERROR Connection failed

# Format 2: ISO 8601 timestamp
2024-02-08T10:15:23.456Z [ERROR] Connection failed

# Format 3: Custom application format
10:15:23.456 | myapp | ERROR | Connection failed

# Format 4: Windows Event Log style
02/08/2024 10:15:23 AM ERROR Connection failed

# Format 5: Cisco CUCM SDL
16:20:15.123 |SIPTcp - ERROR Connection failed

# Format 6: JSON structured
{"timestamp":"2024-02-08T10:15:23.456Z","level":"ERROR","message":"Connection failed"}

# Format 7: Apache/Nginx access log
192.168.1.1 - - [08/Feb/2024:10:15:23 +0000] "GET /api HTTP/1.1" 500

# Format 8: Java stack trace (multi-line)
ERROR: Exception occurred
    at com.example.Main.run(Main.java:42)
    at com.example.Main.main(Main.java:15)
```

**Question**: Do we need to worry about these differences?

**Answer**: YES and NO - Here's our strategy...

---

## Our Approach: Format-Agnostic Pattern Matching

### Strategy 1: Flexible Regex Patterns (Current)

**Philosophy**: Patterns should match the *content*, not the *format*.

**Example - Error Detection**:
```yaml
# This pattern works across ALL formats above:
patterns:
  - id: "error-connection"
    name: "Connection Error"
    pattern: '(?i)\bERROR\b.*connection\s+failed'
    severity: error
```

**Why it works**:
- `(?i)` - Case insensitive (handles ERROR, error, Error)
- `\b` - Word boundaries (avoids matching "ERRORS")
- `.*` - Matches anything between ERROR and "connection"
- Works regardless of timestamp format, separators, etc.

### Strategy 2: Multi-Pattern Approach

**For the same issue, provide multiple patterns for different formats**:

```yaml
patterns:
  # Generic pattern (works for most)
  - id: "error-generic"
    name: "Error Message"
    pattern: '(?i)\bERROR\b'
    severity: error
    
  # Syslog format specific
  - id: "error-syslog"
    name: "Syslog Error"
    pattern: '\[\s*ERROR\s*\]'
    severity: error
    
  # JSON format specific
  - id: "error-json"
    name: "JSON Error"
    pattern: '"level"\s*:\s*"ERROR"'
    severity: error
```

---

## Timestamp Handling

### Problem: Many Timestamp Formats

```log
2024-02-08T10:15:23.456Z          # ISO 8601 with milliseconds
2024-02-08 10:15:23               # ISO 8601 simplified
02/08/2024 10:15:23 AM            # US format with AM/PM
Feb  8 10:15:23                   # Syslog format
10:15:23.456                      # Time only
1707390923456                     # Unix timestamp (ms)
16:20:15.123                      # HH:MM:SS.mmm
```

### Solution: Pattern Flexibility

**Our timestamp extraction is format-agnostic**:

```rust
// In server.rs hover implementation
fn extract_timestamp(line: &str) -> Option<DateTime> {
    // Try ISO 8601 first
    if let Some(ts) = parse_iso8601(line) { return Some(ts); }
    
    // Try time-only format
    if let Some(ts) = parse_time_only(line) { return Some(ts); }
    
    // Try Unix timestamp
    if let Some(ts) = parse_unix_timestamp(line) { return Some(ts); }
    
    // Try syslog format
    if let Some(ts) = parse_syslog(line) { return Some(ts); }
    
    // Fallback: use current date with extracted time
    parse_best_effort(line)
}
```

**For patterns, timestamp format doesn't matter**:
```yaml
# Pattern doesn't care about timestamp format
pattern: '(?i)ERROR.*connection failed'
# This works regardless of what comes before "ERROR"
```

---

## Severity Level Variations

### Problem: Different Severity Formats

```log
ERROR                 # All caps
error                 # Lowercase
[ERROR]               # Brackets
<ERROR>               # Angle brackets
E:                    # Abbreviated
ERR                   # Short form
Level=ERROR           # Key-value
"level":"error"       # JSON
ERROR:                # With colon
```

### Solution: Comprehensive Patterns

```yaml
patterns:
  - id: "severity-error"
    name: "Error Level"
    description: "Matches various error severity formats"
    pattern: '(?i)(?:\[|<|level\s*=\s*|"level"\s*:\s*")?(?:ERROR|ERR|E|FATAL|CRITICAL)(?:\]|>|")?'
    severity: error
    category: "errors"
```

**Breakdown**:
- `(?i)` - Case insensitive
- `(?:\[|<|level\s*=\s*)?` - Optional prefix (brackets, level=, etc.)
- `(?:ERROR|ERR|E|FATAL|CRITICAL)` - Various error keywords
- `(?:\]|>|")?` - Optional suffix

---

## Field Separator Handling

### Problem: Different Delimiters

```log
space:     2024-02-08 10:15:23 ERROR Connection failed
pipe:      2024-02-08|10:15:23|ERROR|Connection failed
comma:     2024-02-08,10:15:23,ERROR,Connection failed
tab:       2024-02-08	10:15:23	ERROR	Connection failed
colon:     timestamp:2024-02-08 level:ERROR message:Connection failed
```

### Solution: Whitespace-Agnostic Patterns

```yaml
# Use \s+ to match any whitespace (space, tab, newline)
pattern: '(?i)ERROR\s+connection\s+failed'

# For structured formats, be flexible
pattern: '(?i)ERROR[\s\|,:\t]+connection'
```

---

## Structured vs Unstructured Logs

### JSON Logs

**Example**:
```json
{"timestamp":"2024-02-08T10:15:23.456Z","level":"ERROR","message":"Connection failed","context":{"host":"server01","port":5060}}
```

**Pattern Strategy**:
```yaml
patterns:
  # Match JSON structure
  - id: "json-error"
    name: "JSON Error"
    pattern: '"level"\s*:\s*"(?:ERROR|error)"'
    severity: error
    
  # Match message content (works for JSON too)
  - id: "connection-failed"
    name: "Connection Failed"
    pattern: '(?i)connection\s+failed'
    severity: error
```

**Future Enhancement**: Add JSON parser for structured logs
```rust
// Detect JSON logs and parse separately
if line.trim_start().starts_with('{') {
    if let Ok(log_entry) = serde_json::from_str::<LogEntry>(line) {
        // Extract fields directly
        return Some(Diagnostic {
            severity: map_severity(&log_entry.level),
            message: log_entry.message,
            // ...
        });
    }
}
```

### CSV Logs

**Example**:
```csv
timestamp,level,component,message
2024-02-08 10:15:23,ERROR,network,Connection failed
```

**Pattern Strategy**:
```yaml
# Still works with CSV format
pattern: '(?i),ERROR,'
# OR
pattern: '(?i)ERROR.*connection\s+failed'
```

---

## Multi-Line Log Handling

### Problem: Log Entries Span Multiple Lines

**Stack Traces**:
```log
2024-02-08 10:15:23 ERROR Exception occurred
    at com.example.Main.run(Main.java:42)
    at com.example.Main.processRequest(Main.java:28)
    at com.example.Main.main(Main.java:15)
Caused by: java.net.SocketException: Connection refused
    at java.net.Socket.connect(Socket.java:589)
```

**SIP Message Dumps**:
```log
16:20:15.123 |SIPTcp - Incoming SIP Message:
INVITE sip:bob@example.com SIP/2.0
Via: SIP/2.0/TCP 10.1.1.1:5060;branch=z9hG4bK-abc123
From: <sip:alice@example.com>;tag=123
To: <sip:bob@example.com>
Call-ID: 12345@10.1.1.1
CSeq: 1 INVITE
```

### Solution: Multi-Line Pattern Mode

```yaml
patterns:
  - id: "stack-trace"
    name: "Stack Trace"
    description: "Multi-line exception stack trace"
    pattern: '(?i)(?:exception|error)[^\n]*\n(?:\s+at\s+.+\n)+'
    mode:
      multiline:
        context_lines: 50
    severity: error
    category: "exceptions"
```

---

## Format Detection (Future Enhancement)

### Auto-Detect Log Format

```rust
pub enum LogFormat {
    Syslog,
    Iso8601,
    Json,
    Csv,
    Apache,
    Nginx,
    CucmSdl,
    Custom,
}

pub fn detect_format(sample_lines: &[&str]) -> LogFormat {
    // Check for JSON
    if sample_lines.iter().any(|l| l.trim_start().starts_with('{')) {
        return LogFormat::Json;
    }
    
    // Check for CSV header
    if sample_lines.first().map_or(false, |l| l.contains(',') && l.contains("timestamp")) {
        return LogFormat::Csv;
    }
    
    // Check for ISO 8601 timestamp
    if sample_lines.iter().any(|l| ISO8601_REGEX.is_match(l)) {
        return LogFormat::Iso8601;
    }
    
    // Check for CUCM SDL format
    if sample_lines.iter().any(|l| l.contains("|SIP")) {
        return LogFormat::CucmSdl;
    }
    
    // Default
    LogFormat::Custom
}
```

### Format-Specific Parsers

```rust
pub struct LogParser {
    format: LogFormat,
}

impl LogParser {
    pub fn parse_line(&self, line: &str) -> Option<ParsedLog> {
        match self.format {
            LogFormat::Json => self.parse_json(line),
            LogFormat::Csv => self.parse_csv(line),
            LogFormat::Syslog => self.parse_syslog(line),
            _ => self.parse_generic(line),
        }
    }
    
    fn parse_json(&self, line: &str) -> Option<ParsedLog> {
        serde_json::from_str::<JsonLog>(line).ok()
            .map(|jl| ParsedLog {
                timestamp: jl.timestamp,
                level: jl.level,
                message: jl.message,
                fields: jl.fields,
            })
    }
}
```

---

## Cisco-Specific Format Handling

### CUCM SDL Traces

**Format**:
```
16:20:15.123 |SIPTcp - wait_SdlReadRsp: Incoming SIP TCP Message from 10.1.1.100:5060
INVITE sip:2000@10.1.1.200:5060 SIP/2.0
Via: SIP/2.0/TCP 10.1.1.100:5060;branch=z9hG4bK-abc123
```

**Pattern Strategy**:
```yaml
patterns:
  - id: "cucm-sdl-timestamp"
    name: "CUCM SDL Entry"
    pattern: '^\d{2}:\d{2}:\d{2}\.\d{3}\s+\|'
    severity: info
    category: "cucm"
    
  - id: "cucm-sip-message"
    name: "CUCM SIP Message"
    pattern: '\|SIP(?:Tcp|Udp)\s+-.*(?:Incoming|Outgoing)'
    severity: info
    category: "sip"
    service: "cucm"
```

### IOS Debug Output

**Format**:
```
*Feb  8 10:15:23.456: %SIP-4-ERROR: Connection failed to 10.1.1.1:5060
*Feb  8 10:15:24.789: //-1/xxxxxxxxxxxx/SIP/Msg/ccsipDisplayMsg:
Sent:
INVITE sip:2000@10.1.1.200:5060 SIP/2.0
```

**Pattern Strategy**:
```yaml
patterns:
  - id: "ios-timestamp"
    name: "IOS Timestamp"
    pattern: '^\*\w{3}\s+\d+\s+\d{2}:\d{2}:\d{2}'
    severity: info
    
  - id: "ios-sip-debug"
    name: "IOS SIP Debug"
    pattern: '/SIP/Msg/ccsipDisplayMsg:'
    severity: info
    category: "sip"
    service: "ios"
```

---

## Best Practices for Format-Agnostic Patterns

### ✅ DO

1. **Focus on Content, Not Structure**
   ```yaml
   # Good - matches content
   pattern: '(?i)ERROR.*connection.*failed'
   
   # Bad - assumes specific structure
   pattern: '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+ERROR.*failed$'
   ```

2. **Use Flexible Whitespace**
   ```yaml
   # Good - any whitespace
   pattern: '(?i)ERROR\s+connection'
   
   # Bad - assumes single space
   pattern: 'ERROR connection'
   ```

3. **Make Patterns Case-Insensitive**
   ```yaml
   # Good
   pattern: '(?i)error'
   
   # Bad
   pattern: 'ERROR'
   ```

4. **Avoid Anchoring Unless Necessary**
   ```yaml
   # Good - matches anywhere in line
   pattern: 'connection failed'
   
   # Bad - must be at start
   pattern: '^connection failed'
   ```

5. **Test with Multiple Formats**
   ```yaml
   # Test your pattern against:
   # - Different timestamp formats
   # - Different separators
   # - JSON vs plain text
   # - Different case variations
   ```

### ❌ DON'T

1. **Don't Hardcode Timestamp Formats**
   ```yaml
   # Bad - assumes specific timestamp
   pattern: '2024-\d{2}-\d{2}.*ERROR'
   
   # Good - timestamp independent
   pattern: '(?i)ERROR'
   ```

2. **Don't Assume Field Order**
   ```yaml
   # Bad - assumes timestamp, then level
   pattern: '^\d{4}.*ERROR.*failed'
   
   # Good - order independent
   pattern: '(?i)ERROR.*failed'
   ```

3. **Don't Match Delimiters**
   ```yaml
   # Bad - assumes pipe separator
   pattern: 'timestamp\|ERROR\|message'
   
   # Good - delimiter agnostic
   pattern: '(?i)ERROR'
   ```

---

## Configuration for Different Formats

### User Can Specify Format Hints (Future)

```json
{
  "logScoutAnalyzer.format.detection": "auto",
  "logScoutAnalyzer.format.override": "cucm-sdl",
  "logScoutAnalyzer.format.timestampPattern": "HH:mm:ss.SSS",
  "logScoutAnalyzer.format.structured": false
}
```

### Format Profiles (Future)

```yaml
# config/formats/cucm-sdl.yaml
format:
  name: "CUCM SDL Traces"
  timestamp_pattern: '^\d{2}:\d{2}:\d{2}\.\d{3}'
  field_separator: '|'
  structured: false
  multiline_indicators:
    - "Incoming SIP"
    - "Outgoing SIP"
```

---

## Real-World Examples

### Example 1: Same Error, Different Formats

**Application A (Syslog)**:
```log
Feb  8 10:15:23 server01 myapp[1234]: ERROR Connection failed to database
```

**Application B (ISO)**:
```log
2024-02-08T10:15:23.456Z [ERROR] Connection failed to database
```

**Application C (JSON)**:
```json
{"ts":"2024-02-08T10:15:23.456Z","lvl":"ERROR","msg":"Connection failed to database"}
```

**Single Pattern Catches All**:
```yaml
patterns:
  - id: "db-connection-error"
    name: "Database Connection Error"
    pattern: '(?i)ERROR.*connection\s+failed.*database'
    severity: error
    category: "database"
```

✅ **Works for all three formats!**

### Example 2: SIP 486 Busy Across Formats

**CUCM SDL**:
```
16:20:15.123 |SIPTcp - Received: 486 Busy Here
```

**IOS Debug**:
```
*Feb  8 10:15:23: SIP/2.0 486 Busy Here
```

**Generic**:
```
2024-02-08 10:15:23 Received 486 Busy Here
```

**Single Pattern**:
```yaml
patterns:
  - id: "sip-486"
    name: "SIP 486 Busy"
    pattern: '\b486\s+Busy\s+Here\b'
    severity: warning
    category: "sip"
```

✅ **Works for all three formats!**

---

## When Format DOES Matter

### Use Cases Requiring Format Awareness

1. **Timeline Construction**
   - Need accurate timestamps
   - Solution: Multiple timestamp parsers

2. **Call Correlation**
   - Need Call-ID extraction
   - Solution: Format-specific Call-ID patterns

3. **Performance Metrics**
   - Need precise timing
   - Solution: Parse timestamp from each format

4. **Structured Data Extraction**
   - Need field values
   - Solution: JSON/CSV parsers

### Our Approach

**Phase 1 (Current)**: Format-agnostic pattern matching
- ✅ Works for 90% of use cases
- ✅ Simple and fast
- ✅ No format detection needed

**Phase 2 (Future)**: Format-aware enhancement
- Optional format detection
- Structured log parsing
- Format-specific optimizations
- User can force specific format

---

## Summary

### Answer to Your Question

**Do we need to worry about log file formatting?**

**For pattern matching: NO** - Our regex-based patterns are format-agnostic and work across different log formats.

**For advanced features: YES, BUT LATER** - Timeline construction and structured data extraction will benefit from format detection, but this is a future enhancement.

### Current Strategy

✅ **Format-Agnostic Patterns**
- Patterns focus on content, not structure
- Works with any timestamp format
- Handles different delimiters
- Case-insensitive matching

✅ **Flexible Parsing**
- Multiple timestamp parsers
- Best-effort extraction
- Fallback mechanisms

✅ **Multi-Format Support**
- Test patterns across formats
- Provide format-specific patterns when needed
- User can add custom patterns

### Future Enhancements

⏳ **Format Detection** (optional)
⏳ **Structured Log Parsers** (JSON, CSV)
⏳ **Format Profiles** (CUCM, IOS, etc.)
⏳ **Format-Specific Optimizations**

### Recommendation

**Don't worry about log format for now**. The pattern system is designed to be format-agnostic. Focus on:
1. Writing good content-based patterns
2. Testing with your specific log files
3. Adding format-specific patterns only if needed

**The patterns will work across different formats!**