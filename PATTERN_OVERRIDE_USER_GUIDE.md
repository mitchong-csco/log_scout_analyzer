# Pattern Override System - User Guide

> **Complete guide to customizing Log Scout Analyzer patterns**  
> **For:** VSCode Extension Users, DevOps Engineers, Log Analysts

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Override File Structure](#override-file-structure)
4. [Override Types](#override-types)
5. [Common Use Cases](#common-use-cases)
6. [Working with Overrides](#working-with-overrides)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Topics](#advanced-topics)

---

## Introduction

The Pattern Override System allows you to customize how Log Scout Analyzer detects and categorizes issues in your logs. You can:

- **Override existing patterns** from TagScout
- **Adjust severity levels** for specific patterns
- **Disable noisy patterns** that create too many false positives
- **Customize parameter extractors** to capture additional context
- **Add conditional severity triggers** based on extracted values

### Why Use Overrides?

- **Adapt to your environment** - Generic patterns may not fit your specific infrastructure
- **Reduce noise** - Disable patterns that are too sensitive for your use case
- **Increase accuracy** - Fine-tune extractors to match your log formats
- **Share configurations** - Team members can use the same overrides via version control

---

## Quick Start

### Step 1: Create Override File

Create a file at `.log-scout/pattern-overrides.json` in your workspace:

```json
{
  "version": "1.0",
  "overrides": {},
  "custom": {}
}
```

### Step 2: Add Your First Override

```json
{
  "version": "1.0",
  "overrides": {
    "override-my-pattern": {
      "id": "override-my-pattern",
      "sourceType": "mongodb",
      "sourceId": "original-pattern-id",
      "reason": "Increase severity for production",
      "enabled": true,
      "overrides": {
        "severity": "error"
      }
    }
  },
  "custom": {}
}
```

### Step 3: Reload Patterns

Execute the LSP command:
```
logScout.reloadPatterns
```

Or restart VSCode to pick up the changes.

### Step 4: Verify

Check the LSP server logs to confirm your override was applied:
```
[INFO] Applying 1 overrides and 0 custom patterns
[INFO] Applied override to pattern 'original-pattern-id': Increase severity for production
```

---

## Override File Structure

### Top-Level Structure

```json
{
  "version": "1.0",           // Schema version (required)
  "lastSync": "2024-01-15T10:30:00Z",  // Optional: last sync timestamp
  "overrides": {              // Pattern overrides (required)
    "override-id": { ... }
  },
  "custom": {}                // Custom patterns (future feature)
}
```

### Override Entry Structure

```json
{
  "id": "override-pattern-name",        // Unique ID for this override (required)
  "sourceType": "mongodb",              // Source of base pattern (required)
  "sourceId": "base-pattern-id",        // ID of pattern to override (required)
  "name": "Custom Pattern Name",        // Optional: override pattern name
  "notes": "Additional context",        // Optional: documentation
  "reason": "Why this override exists", // Optional: justification
  "enabled": true,                      // Optional: enable/disable (default: true)
  "overrides": {                        // Override values (required)
    "regex": "new.*pattern",            // Optional: new regex
    "severity": "error",                // Optional: new severity
    "parameterExtractors": { ... },     // Optional: extractor overrides
    "conditionTriggers": [ ... ]        // Optional: conditional severity
  }
}
```

---

## Override Types

### 1. Severity Override

Change the severity level of a pattern.

**Severity Levels:**
- `error` - Critical issues that require immediate attention
- `warning` - Important issues that should be investigated
- `info` - Informational messages
- `hint` - Low-priority suggestions

**Example:**
```json
{
  "id": "override-increase-severity",
  "sourceType": "mongodb",
  "sourceId": "database-connection-warning",
  "reason": "Database issues are critical in production",
  "enabled": true,
  "overrides": {
    "severity": "error"
  }
}
```

### 2. Regex Override

Replace the pattern's regular expression.

**Example:**
```json
{
  "id": "override-http-pattern",
  "sourceType": "mongodb",
  "sourceId": "http-error-pattern",
  "reason": "Match all HTTP codes, not just errors",
  "enabled": true,
  "overrides": {
    "regex": "HTTP/\\d\\.\\d\\s+(?P<code>\\d{3})"
  }
}
```

### 3. Parameter Extractor Override

Modify how values are extracted from log lines.

**Example:**
```json
{
  "id": "override-error-code-extractor",
  "sourceType": "mongodb",
  "sourceId": "error-pattern",
  "reason": "Extract all HTTP codes instead of just errors",
  "enabled": true,
  "overrides": {
    "parameterExtractors": {
      "CODE": {
        "original": "([45]\\d{2})",
        "override": "(\\d{3})",
        "reason": "Match 2xx, 3xx, 4xx, and 5xx codes"
      },
      "MESSAGE": {
        "override": "message[=:\\s]+(.+?)(?:\\s|$)",
        "reason": "Extract error message text"
      }
    }
  }
}
```

### 4. Condition Triggers

Add dynamic severity based on extracted values.

**Operators:**
- `equals` / `eq` / `==` - Exact match
- `contains` - Substring match
- `regex` / `matches` - Regular expression match
- `greaterthan` / `gt` / `>` - Numeric comparison
- `lessthan` / `lt` / `<` - Numeric comparison

**Example:**
```json
{
  "id": "override-memory-thresholds",
  "sourceType": "mongodb",
  "sourceId": "memory-usage-pattern",
  "reason": "Add custom thresholds for our infrastructure",
  "enabled": true,
  "overrides": {
    "conditionTriggers": [
      {
        "field": "MEMORY_MB",
        "operator": "greaterthan",
        "value": "8192",
        "severity": "error",
        "description": "Memory exceeds 8GB - critical"
      },
      {
        "field": "MEMORY_MB",
        "operator": "greaterthan",
        "value": "6144",
        "severity": "warning",
        "description": "Memory exceeds 6GB - warning"
      }
    ]
  }
}
```

### 5. Disable Pattern

Completely disable a pattern to reduce noise.

**Example:**
```json
{
  "id": "override-disable-verbose",
  "sourceType": "mongodb",
  "sourceId": "verbose-debug-pattern",
  "reason": "Too many false positives in production",
  "enabled": false,
  "overrides": {}
}
```

---

## Common Use Cases

### Use Case 1: Reduce False Positives

**Problem:** A pattern flags too many non-issues.

**Solution:** Disable the pattern or make it less sensitive.

```json
{
  "id": "override-reduce-noise",
  "sourceType": "mongodb",
  "sourceId": "connection-retry-pattern",
  "reason": "Connection retries are normal in our setup",
  "enabled": false,
  "overrides": {}
}
```

### Use Case 2: Environment-Specific Thresholds

**Problem:** Default thresholds don't match your infrastructure.

**Solution:** Add condition triggers with your specific values.

```json
{
  "id": "override-disk-threshold",
  "sourceType": "mongodb",
  "sourceId": "disk-usage-pattern",
  "reason": "Custom thresholds for our server specs",
  "enabled": true,
  "overrides": {
    "conditionTriggers": [
      {
        "field": "DISK_PERCENT",
        "operator": "greaterthan",
        "value": "95",
        "severity": "error",
        "description": "Disk usage critical (>95%)"
      },
      {
        "field": "DISK_PERCENT",
        "operator": "greaterthan",
        "value": "85",
        "severity": "warning",
        "description": "Disk usage high (>85%)"
      }
    ]
  }
}
```

### Use Case 3: Extract Additional Context

**Problem:** Pattern doesn't capture useful information from logs.

**Solution:** Add or modify parameter extractors.

```json
{
  "id": "override-auth-failure",
  "sourceType": "mongodb",
  "sourceId": "authentication-failure",
  "reason": "Extract username and IP for security analysis",
  "enabled": true,
  "overrides": {
    "parameterExtractors": {
      "USERNAME": {
        "override": "user[=:\\s]+([\\w.-]+)",
        "reason": "Extract username from auth logs"
      },
      "IP_ADDRESS": {
        "override": "from\\s+([\\d.]+)",
        "reason": "Extract source IP address"
      }
    }
  }
}
```

### Use Case 4: Increase Severity for Production

**Problem:** Some warnings should be errors in production.

**Solution:** Override severity level.

```json
{
  "id": "override-prod-severity",
  "sourceType": "mongodb",
  "sourceId": "database-slow-query",
  "reason": "Slow queries are critical in production",
  "enabled": true,
  "overrides": {
    "severity": "error"
  }
}
```

### Use Case 5: Match Custom Log Format

**Problem:** Your logs use a different format than the default pattern.

**Solution:** Override the regex pattern.

```json
{
  "id": "override-custom-format",
  "sourceType": "mongodb",
  "sourceId": "error-pattern",
  "reason": "Our logs use custom error format",
  "enabled": true,
  "overrides": {
    "regex": "\\[ERROR\\]\\s+\\[(?P<component>[^\\]]+)\\]\\s+(?P<message>.+)"
  }
}
```

---

## Working with Overrides

### Creating Overrides

1. **Identify the pattern ID** - Check the LSP logs or use `logScout.getPatterns` command
2. **Create override entry** - Add to `.log-scout/pattern-overrides.json`
3. **Test your changes** - Use the reload command
4. **Document your reasoning** - Use `reason` and `notes` fields

### Testing Overrides

1. **Create a test log file** with examples of the pattern
2. **Apply your override**
3. **Reload patterns** using `logScout.reloadPatterns`
4. **Verify diagnostics** in VSCode
5. **Check LSP logs** for confirmation

### Updating Overrides

1. Edit `.log-scout/pattern-overrides.json`
2. Save the file
3. Execute `logScout.reloadPatterns` command
4. Verify changes in diagnostics

### Removing Overrides

1. Delete the override entry from JSON file
2. Save the file
3. Execute `logScout.reloadPatterns` command

### Sharing Overrides

**Option 1: Version Control (Recommended)**
- Commit `.log-scout/pattern-overrides.json` to your repository
- Team members get overrides automatically
- Changes are tracked and reviewed

**Option 2: Manual Distribution**
- Export override file
- Share with team members
- Each person imports into their workspace

---

## Best Practices

### 1. Document Your Overrides

Always include `reason` and `notes` fields:

```json
{
  "reason": "Why this override exists",
  "notes": "Additional context for team members"
}
```

### 2. Use Descriptive IDs

Make override IDs clear and meaningful:

```
✅ "override-increase-auth-severity"
❌ "override1"
```

### 3. Test Before Committing

Always test overrides with sample logs before sharing with team.

### 4. Keep Overrides Minimal

Only override what you need to change:

```json
// Good - only change severity
{
  "overrides": {
    "severity": "error"
  }
}

// Avoid - unnecessary fields
{
  "overrides": {
    "severity": "error",
    "regex": "...",  // Don't include if not changing
    "parameterExtractors": {}  // Don't include if not changing
  }
}
```

### 5. Version Control

**Do commit:**
- `.log-scout/pattern-overrides.json` - Team-wide overrides

**Don't commit:**
- Personal/experimental overrides
- Sensitive information in override files

### 6. Regular Review

- Review overrides quarterly
- Remove obsolete overrides
- Update documentation when patterns change

### 7. Use Condition Triggers Wisely

Prefer condition triggers over multiple severity overrides:

```json
// Good - dynamic severity
{
  "overrides": {
    "conditionTriggers": [
      { "field": "CODE", "operator": "equals", "value": "500", "severity": "error" },
      { "field": "CODE", "operator": "equals", "value": "404", "severity": "warning" }
    ]
  }
}

// Less flexible - static severity
{
  "overrides": {
    "severity": "error"
  }
}
```

---

## Troubleshooting

### Override Not Applied

**Symptom:** Changes don't appear in diagnostics.

**Solutions:**
1. Check override file syntax (use a JSON validator)
2. Verify `sourceId` matches the pattern ID
3. Check LSP server logs for errors
4. Ensure `enabled: true` (or omit the field)
5. Execute `logScout.reloadPatterns` command

### Invalid JSON

**Symptom:** LSP server logs show JSON parsing errors.

**Solutions:**
1. Validate JSON syntax (use online validator)
2. Check for missing commas, quotes, or brackets
3. Ensure field names are in camelCase
4. Verify no trailing commas in arrays/objects

### Pattern Not Matching

**Symptom:** Override applied but pattern still doesn't match logs.

**Solutions:**
1. Test regex separately (use regex tester tool)
2. Check for escaped characters (`\` needs to be `\\`)
3. Verify named capture groups syntax: `(?P<name>...)`
4. Test with actual log samples

### Severity Not Changing

**Symptom:** Severity override has no effect.

**Solutions:**
1. Check severity value is valid: `error`, `warning`, `info`, `hint`
2. Verify no condition triggers overriding your severity
3. Check if pattern is disabled elsewhere
4. Reload patterns after changes

### Extractor Not Working

**Symptom:** Parameter extraction fails or extracts wrong values.

**Solutions:**
1. Test regex with actual log lines
2. Ensure extractor name matches field in pattern
3. Check for correct escaping in JSON
4. Verify regex has capture group: `(...)` or `(?P<name>...)`

### Performance Issues

**Symptom:** Analysis is slow after adding overrides.

**Solutions:**
1. Simplify complex regex patterns
2. Reduce number of condition triggers
3. Profile patterns using LSP logs
4. Consider disabling unused patterns

---

## Advanced Topics

### Override Matching Logic

Overrides are matched in this order:
1. By `sourceId` field (exact match)
2. By `id` field with "override-" prefix

Example:
```json
// Pattern ID: "http-error-pattern"

// Option 1: Match by sourceId (recommended)
{
  "id": "override-custom-http",
  "sourceId": "http-error-pattern",
  "overrides": { ... }
}

// Option 2: Match by id with prefix
{
  "id": "override-http-error-pattern",
  "overrides": { ... }
}
```

### Workspace vs User Overrides

**Workspace Overrides** (`.log-scout/pattern-overrides.json`):
- Shared with team via version control
- Project-specific customizations
- Committed to repository

**User Overrides** (`~/.log-scout-analyzer/pattern-overrides.json`):
- Personal preferences
- Not shared with team
- Falls back when workspace overrides don't exist

**Precedence:** Workspace overrides take precedence over user overrides.

### Regex Best Practices

**Named Capture Groups:**
```regex
(?P<code>\d{3})          # Good - named group
(\d{3})                   # Works but less clear
```

**Escaping in JSON:**
```json
{
  "regex": "\\d+\\.\\d+"  # Correct - double backslash
  // "regex": "\d+\.\d+"  # Wrong - single backslash
}
```

**Common Patterns:**
```regex
\d+                      # One or more digits
\w+                      # One or more word characters
[^\s]+                   # One or more non-whitespace
.+?                      # Non-greedy any character
(?:...)                  # Non-capturing group
(?P<name>...)            # Named capture group
```

### Condition Trigger Evaluation

Triggers are evaluated in order. First match wins:

```json
{
  "conditionTriggers": [
    // Evaluated first
    { "field": "CODE", "operator": "equals", "value": "500", "severity": "error" },
    
    // Evaluated second (only if first doesn't match)
    { "field": "CODE", "operator": "greaterthan", "value": "400", "severity": "warning" },
    
    // Evaluated last (fallback)
    { "field": "CODE", "operator": "greaterthan", "value": "0", "severity": "info" }
  ]
}
```

### Future Features

Features planned for future releases:

- **Custom patterns** - Create patterns from scratch
- **Pattern templates** - Reusable pattern components
- **Override presets** - Common override configurations
- **UI integration** - Visual override editor in VSCode
- **Import/Export** - Share overrides between projects
- **Override validation** - Syntax checking and warnings

---

## Reference

### Complete Example

See `examples/pattern-override-example.json` for a comprehensive example with:
- Severity overrides
- Regex overrides
- Parameter extractor overrides
- Condition triggers
- Disabled patterns

### File Locations

| Location | Purpose |
|----------|---------|
| `.log-scout/pattern-overrides.json` | Workspace overrides (shared) |
| `~/.log-scout-analyzer/pattern-overrides.json` | User overrides (personal) |
| `examples/pattern-override-example.json` | Example override file |

### LSP Commands

| Command | Description |
|---------|-------------|
| `logScout.reloadPatterns` | Reload patterns with overrides and re-analyze documents |
| `logScout.refreshPatterns` | Refresh patterns from TagScout (without re-analyzing) |
| `logScout.getPatterns` | Get list of all patterns (for debugging) |

### Severity Mapping

| Override Value | LSP Severity | Display |
|----------------|--------------|---------|
| `"error"` or `"critical"` | Error | Red squiggly |
| `"warning"` or `"warn"` | Warning | Yellow squiggly |
| `"info"` | Info | Blue squiggly |
| `"hint"` or `"debug"` | Hint | Gray squiggly |

---

## Support

### Getting Help

1. **Check logs** - LSP server logs show override application
2. **Validate JSON** - Use online JSON validator
3. **Test regex** - Use regex testing tools (regex101.com)
4. **Check documentation** - Review this guide and examples
5. **Ask for help** - Contact your team or project maintainers

### Reporting Issues

When reporting override issues, include:
- Override file content (sanitized)
- Sample log lines
- LSP server logs
- Expected vs actual behavior

---

**Last Updated:** 2024-01-XX  
**Version:** 1.0  
**Related Documentation:**
- `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md` - Technical implementation details
- `PATTERN_OVERRIDE_QUICK_START.md` - Developer quick start
- `examples/pattern-override-example.json` - Complete examples