# How to Configure Conditional Severity in Patterns

## Overview

Patterns now support **dynamic severity** based on:
1. **Log Level** (ERROR, WARN, INFO, DEBUG detected in the line)
2. **Extracted Field Values** (from named capture groups in your regex)

## Method 1: Edit JSON Directly

### Open Pattern Manager
1. Open **Scout Toolkit** sidebar (circuit board icon)
2. Click "Open Creation & Authoring Panel"
3. Select **Patterns** tab
4. Click **Export** to save patterns.json
5. Edit the JSON file
6. Click **Import** to load it back

### Pattern Structure with Conditional Severity

```json
{
  "id": "custom-connection-1234567890",
  "name": "Connection Issues",
  "regex": "Connection to (?P<host>[\\w\\.]+) (?:failed with code (?P<code>\\d+)|status=(?P<status>\\w+))",
  "severity": "warning",
  "description": "Detects connection problems",
  
  "logLevelTriggers": {
    "ERROR": "error",
    "FATAL": "error",
    "DEBUG": "hint",
    "INFO": "info"
  },
  
  "conditionTriggers": [
    {
      "field": "code",
      "operator": "greaterthan",
      "value": "400",
      "severity": "error",
      "description": "HTTP 4xx/5xx are serious errors"
    },
    {
      "field": "status",
      "operator": "equals",
      "value": "failed",
      "severity": "error",
      "description": "Final failure state"
    },
    {
      "field": "status",
      "operator": "equals",
      "value": "retrying",
      "severity": "warning",
      "description": "Temporary retry state"
    }
  ]
}
```

## Field Definitions

### `severity` (required)
**Default severity** when no triggers match
- Values: `"error"`, `"warning"`, `"info"`, `"hint"`

### `logLevelTriggers` (optional)
**Map of log levels to severity overrides**

Format:
```json
"logLevelTriggers": {
  "FATAL": "error",      // When line contains FATAL
  "ERROR": "error",      // When line contains ERROR  
  "WARN": "warning",     // When line contains WARN/WARNING
  "INFO": "info",        // When line contains INFO
  "DEBUG": "hint"        // When line contains DEBUG/TRACE
}
```

### `conditionTriggers` (optional)
**Array of field-based severity rules**

Each trigger has:
- `field` (string): Name of the capture group (must match `(?P<name>...)` in regex)
- `operator` (string): How to compare the value
  - `"equals"` - Exact string match
  - `"contains"` - Substring match
  - `"regex"` - Regular expression match
  - `"greaterthan"` - Numeric comparison (field value > threshold)
  - `"lessthan"` - Numeric comparison (field value < threshold)
- `value` (string): The value to compare against
- `severity` (string): Severity to use when matched (`"error"`, `"warning"`, `"info"`, `"hint"`)
- `description` (string, optional): Why this trigger exists

## Examples

### Example 1: Performance Monitoring

Monitor query duration and escalate based on thresholds:

```json
{
  "name": "Slow Query Detection",
  "regex": "Query completed in (?P<duration>\\d+)ms",
  "severity": "info",
  "conditionTriggers": [
    {
      "field": "duration",
      "operator": "greaterthan",
      "value": "5000",
      "severity": "error",
      "description": "Query took over 5 seconds - critical!"
    },
    {
      "field": "duration",
      "operator": "greaterthan",
      "value": "1000",
      "severity": "warning",
      "description": "Query took over 1 second - slow"
    }
  ]
}
```

**Result:**
- Query in 500ms → **INFO** (default)
- Query in 1500ms → **WARNING** (first matching trigger)
- Query in 6000ms → **ERROR** (first matching trigger)

### Example 2: State-Based Alerting

Different severities for different service states:

```json
{
  "name": "Service State Transitions",
  "regex": "Service '(?P<service>\\w+)' transitioned to (?P<state>\\w+)",
  "severity": "info",
  "conditionTriggers": [
    {
      "field": "state",
      "operator": "equals",
      "value": "failed",
      "severity": "error"
    },
    {
      "field": "state",
      "operator": "equals",
      "value": "degraded",
      "severity": "warning"
    },
    {
      "field": "state",
      "operator": "equals",
      "value": "maintenance",
      "severity": "info"
    }
  ]
}
```

### Example 3: Log Level + Status Combo

Escalate based on BOTH log level AND status code:

```json
{
  "name": "HTTP Response Tracking",
  "regex": "HTTP (?P<code>\\d{3}) .*",
  "severity": "info",
  "logLevelTriggers": {
    "ERROR": "error",
    "WARN": "warning"
  },
  "conditionTriggers": [
    {
      "field": "code",
      "operator": "regex",
      "value": "^5\\d{2}$",
      "severity": "error",
      "description": "5xx server errors"
    },
    {
      "field": "code",
      "operator": "regex",
      "value": "^4\\d{2}$",
      "severity": "warning",
      "description": "4xx client errors"
    }
  ]
}
```

**Evaluation:**
- `[DEBUG] HTTP 200 OK` → **HINT** (log level trigger wins)
- `[INFO] HTTP 404 Not Found` → **WARNING** (condition trigger)
- `[ERROR] HTTP 500 Internal Server Error` → **ERROR** (log level trigger wins)
- `HTTP 503 Service Unavailable` → **ERROR** (condition trigger)

### Example 4: Retry Attempt Tracking

Escalate based on number of attempts:

```json
{
  "name": "Retry Attempts",
  "regex": "Retry attempt (?P<attempt>\\d+) for (?P<operation>\\w+)",
  "severity": "info",
  "conditionTriggers": [
    {
      "field": "attempt",
      "operator": "greaterthan",
      "value": "10",
      "severity": "error",
      "description": "Too many retries - give up!"
    },
    {
      "field": "attempt",
      "operator": "greaterthan",
      "value": "5",
      "severity": "warning",
      "description": "Multiple retries needed"
    }
  ]
}
```

### Example 5: Authentication Failure Types

Different severities for different auth failure reasons:

```json
{
  "name": "Authentication Failures",
  "regex": "Auth failed for user=(?P<user>\\w+) reason=(?P<reason>\\w+)",
  "severity": "warning",
  "conditionTriggers": [
    {
      "field": "reason",
      "operator": "equals",
      "value": "account_locked",
      "severity": "error",
      "description": "Security issue - account locked"
    },
    {
      "field": "reason",
      "operator": "equals",
      "value": "invalid_password",
      "severity": "info",
      "description": "Normal login failure attempt"
    },
    {
      "field": "reason",
      "operator": "contains",
      "value": "timeout",
      "severity": "warning",
      "description": "Connection/timeout issue"
    }
  ]
}
```

## Priority Order (First Match Wins)

When evaluating severity:

1. **Check Log Level Triggers** (if defined and log level detected)
   - If match found → use that severity ✓ (stop)
2. **Check Condition Triggers** (in array order)
   - If match found → use that severity ✓ (stop)
3. **Use Default Severity** (fallback)

**Example:**
```json
{
  "severity": "warning",
  "logLevelTriggers": { "ERROR": "error" },
  "conditionTriggers": [
    { "field": "code", "operator": "equals", "value": "500", "severity": "error" }
  ]
}
```

For line: `[ERROR] Connection failed with code 500`
- Log level = ERROR → triggers "error" severity ✓ **STOPS HERE**
- (condition trigger never checked)
- **Final Result: ERROR**

For line: `Connection failed with code 500`
- No log level → no log level trigger
- code = "500" → triggers "error" severity ✓ **STOPS HERE**
- **Final Result: ERROR**

For line: `Connection established`
- No log level → no log level trigger
- No matching condition trigger
- **Final Result: WARNING** (default)

## Tips

### Use Named Capture Groups
Your regex **MUST** use named capture groups to extract values:

✅ **Correct:**
```regex
Status: (?P<status>\w+)
```

❌ **Wrong:**
```regex
Status: (\w+)
```

### Test Your Regex
Use an online regex tester with your actual log lines before adding to patterns.

### Start Simple
Begin with just log level triggers, then add condition triggers as needed.

### Common Operators

- **equals** - Exact match (case-sensitive): `status = "failed"`
- **contains** - Substring search: `message contains "timeout"`
- **regex** - Pattern match: `code matches "^5\d{2}$"`
- **greaterthan** - Numeric only: `duration > 1000`
- **lessthan** - Numeric only: `count < 10`

## Workflow

1. **Analyze Your Logs** - What patterns do you see?
2. **Create Basic Pattern** - Start with regex and default severity
3. **Add Log Level Triggers** - Override severity for ERROR/WARN/DEBUG lines
4. **Add Condition Triggers** - Fine-tune based on field values
5. **Export & Test** - Analyze real logs to verify behavior
6. **Iterate** - Refine triggers based on results

## File Location

Patterns are stored in:
```
.log-scout/pattern-overrides.json
```

This file persists even when:
- Extension reloads
- LSP server restarts  
- Pattern cache is cleared
- MongoDB patterns are updated

## Next Steps

After editing patterns.json:
1. Save the file
2. Click **Import** in the Patterns tab
3. Re-analyze your log files
4. Check the Results view to see new severities in action

---

**Questions?** The condition triggers are checked **in order**, so put most specific rules first!
