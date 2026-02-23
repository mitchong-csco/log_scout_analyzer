# CLI Call Flow Commands - Quick Reference

**Quick guide for using `log-scout call-flow` commands**

---

## 📋 Commands Overview

| Command | Purpose | Time |
|---------|---------|------|
| `list` | List all call sessions | < 1s |
| `show` | Display specific call flow | < 1s |
| `analyze` | Analyze all calls | 1-5s |
| `export` | Export to file | < 1s |

---

## 🚀 Quick Start

### 1. List All Calls

```bash
log-scout call-flow list <PATH>
```

**Examples:**
```bash
log-scout call-flow list bundle.zip
log-scout call-flow list /path/to/logs/
log-scout call-flow list sample.ctrace
```

**Output:**
```
✓ Found 3 call session(s):
  1. ❓ 001a2f8d-f17f0004... (7 messages, Calling ❓, 47.3s)
  2. ❓ 002b3g9e-g28g0005... (7 messages, Cancelled ❓, 5.4s)
  3. ❓ 003c4h0f-h39h0006... (4 messages, Calling ❓, 0.2s)
```

---

### 2. Show Specific Call

```bash
log-scout call-flow show <CALL_ID> --bundle <PATH> [OPTIONS]
```

**Examples:**
```bash
# Show in Markdown (default)
log-scout call-flow show 001a2f8d --bundle bundle.zip

# Show in plain ASCII
log-scout call-flow show 001a2f8d --bundle bundle.zip --format plain

# Partial Call-ID matching works
log-scout call-flow show 001a2f8d --bundle logs.zip
```

**Output:**
```markdown
# Call Flow Analysis: 001a2f8d-f17f0004-28...

**Duration:** 47s | **Status:** ✅ Terminated | **Messages:** 7

## Sequence Diagram
       Caller               CUCM               Callee
         |                   |                   |
10:45:00.949
         |          <--- INVITE sip:1... ----         |
...
```

---

### 3. Analyze All Calls

```bash
log-scout call-flow analyze <PATH> [OPTIONS]
```

**Examples:**
```bash
# Analyze all calls
log-scout call-flow analyze bundle.zip

# Limit to first 5 calls
log-scout call-flow analyze bundle.zip --limit 5

# Plain ASCII format
log-scout call-flow analyze bundle.zip --format plain
```

**Output:** Full diagrams for all (or limited) call sessions.

---

### 4. Export to File

```bash
log-scout call-flow export <CALL_ID> --output <FILE> --bundle <PATH> [OPTIONS]
```

**Examples:**
```bash
# Export as Markdown (default)
log-scout call-flow export 001a2f8d --output flow.md --bundle bundle.zip

# Export as plain text
log-scout call-flow export 001a2f8d --output flow.txt --bundle bundle.zip --format plain

# Short form
log-scout call-flow export 001a2f8d -o flow.md -b bundle.zip
```

**Output:**
```
✅ Call flow exported to flow.md
```

---

## 🎯 Options Reference

### Global Options

| Option | Short | Values | Default | Description |
|--------|-------|--------|---------|-------------|
| `--help` | `-h` | - | - | Show help text |

### Command-Specific Options

#### `show` and `export`

| Option | Short | Values | Default | Description |
|--------|-------|--------|---------|-------------|
| `--bundle` | `-b` | PATH | Required | Bundle/directory path |
| `--format` | `-f` | `markdown`, `plain` | `markdown` | Output format |

#### `analyze`

| Option | Short | Values | Default | Description |
|--------|-------|--------|---------|-------------|
| `--format` | `-f` | `markdown`, `plain` | `markdown` | Output format |
| `--limit` | `-n` | NUMBER | All | Max calls to display |

#### `export`

| Option | Short | Values | Default | Description |
|--------|-------|--------|---------|-------------|
| `--output` | `-o` | FILE | Required | Output file path |
| `--bundle` | `-b` | PATH | Required | Bundle/directory path |
| `--format` | `-f` | `markdown`, `plain` | `markdown` | Output format |

---

## 📁 Supported Input Formats

### File Types
- ✅ `.ctrace` files
- ✅ `.log` files (containing CTRACE data)
- ✅ `.zip` bundles
- ✅ Directories (scans for CTRACE files)

### CTRACE Format
14 pipe-delimited fields:
```
Timestamp|Service|ProtoNum|Transport|Direction|ReceiverIP|ReceiverPort|MAC|SenderIP|SenderPort|CorrelationID|MessageTag|GUID|SIPMethod
```

**Example:**
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

---

## 🎨 Output Formats

### Markdown (Default)
- Pretty headers (`# Call Flow Analysis`)
- Code blocks for diagrams
- Emoji indicators (✅ ❌ 🔔 📞)
- Formatted call summary

**Best for:** Documentation, VS Code, GitHub

### Plain ASCII
- No markdown formatting
- Simple text headers
- Emoji indicators
- Clean terminal output

**Best for:** Terminal viewing, plain text files

---

## 🔍 Call-ID Matching

**Partial matching supported!**

Full Call-ID:
```
001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
```

Any of these work:
```bash
log-scout call-flow show 001a2f8d --bundle bundle.zip
log-scout call-flow show 001a2f8d-f17f0004 --bundle bundle.zip
log-scout call-flow show f17f0004 --bundle bundle.zip
```

---

## 📊 Call State Indicators

| Emoji | State | Meaning |
|-------|-------|---------|
| ✅ | Terminated | Call ended normally |
| 🔔 | Ringing | Call is ringing |
| 📞 | Trying/Established | Call in progress |
| ❌ | Failed | Call failed (4xx/5xx) |
| ❓ | Other | Unknown state |

---

## 💡 Tips & Tricks

### 1. Quick Call Review
```bash
# List calls, then show specific one
log-scout call-flow list bundle.zip
log-scout call-flow show 001a2f8d -b bundle.zip
```

### 2. Export Multiple Calls
```bash
# Export each call to separate file
log-scout call-flow export 001a2f8d -o call1.md -b bundle.zip
log-scout call-flow export 002b3g9e -o call2.md -b bundle.zip
log-scout call-flow export 003c4h0f -o call3.md -b bundle.zip
```

### 3. Terminal-Friendly Analysis
```bash
# Use plain format for terminal viewing
log-scout call-flow analyze bundle.zip --format plain --limit 3
```

### 4. Directory Scanning
```bash
# Analyze all CTRACE files in a directory
log-scout call-flow list /var/log/cisco/ctrace/
log-scout call-flow analyze /var/log/cisco/ctrace/ --limit 10
```

### 5. Piping and Redirection
```bash
# Save list output
log-scout call-flow list bundle.zip > calls.txt

# Show and save
log-scout call-flow show 001a2f8d -b bundle.zip > flow.md
```

---

## 🚨 Common Errors

### "Bundle path is required"
**Problem:** Missing `--bundle` option  
**Solution:**
```bash
# Add --bundle option
log-scout call-flow show 001a2f8d --bundle bundle.zip
```

### "Call session not found"
**Problem:** Invalid or non-existent Call-ID  
**Solution:**
```bash
# List calls first to see available IDs
log-scout call-flow list bundle.zip
```

### "No valid CTRACE entries found"
**Problem:** File doesn't contain CTRACE format data  
**Solution:**
- Check file format (should be pipe-delimited)
- Verify 14 fields per line
- Ensure files have `.ctrace` extension or contain "ctrace" in name

### "Invalid format"
**Problem:** Unsupported format option  
**Solution:**
```bash
# Use only 'markdown' or 'plain'
log-scout call-flow show 001a2f8d -b bundle.zip --format markdown
```

---

## 📈 Performance Tips

### Large Files
```bash
# Use --limit to reduce processing time
log-scout call-flow analyze large-bundle.zip --limit 20
```

### Multiple Files
```bash
# Process directory with pattern
log-scout call-flow list /logs/*.ctrace
```

### Memory Usage
- Small files (<10MB): Instant
- Medium files (10-100MB): 1-2 seconds
- Large files (>100MB): 5-10 seconds

---

## 🔗 Integration Examples

### With `grep`
```bash
# Find failed calls
log-scout call-flow list bundle.zip | grep Failed
```

### With `awk`
```bash
# Extract Call-IDs
log-scout call-flow list bundle.zip | awk '{print $3}'
```

### With Scripts
```bash
#!/bin/bash
# Export all calls
for call_id in $(log-scout call-flow list bundle.zip | grep -oP '\w{8}-\w{8}'); do
    log-scout call-flow export "$call_id" -o "${call_id}.md" -b bundle.zip
done
```

---

## 📚 Related Documentation

- **Phase 3.6 Complete:** `PHASE_3_6_COMPLETE.md`
- **Phase 3.5 (Diagram Renderer):** `PHASE_3_5_ONE_PAGE.md`
- **Project Status:** `PROJECT_STATUS.md`

---

## ❓ Getting Help

```bash
# General help
log-scout --help

# Call-flow help
log-scout call-flow --help

# Command-specific help
log-scout call-flow list --help
log-scout call-flow show --help
log-scout call-flow analyze --help
log-scout call-flow export --help
```

---

## 🎯 Cheat Sheet

```bash
# List
log-scout call-flow list <PATH>

# Show
log-scout call-flow show <CALL_ID> -b <PATH> [-f markdown|plain]

# Analyze
log-scout call-flow analyze <PATH> [-f markdown|plain] [-n COUNT]

# Export
log-scout call-flow export <CALL_ID> -o <FILE> -b <PATH> [-f markdown|plain]
```

---

**Version:** 1.0  
**Last Updated:** 2024-02-24  
**Status:** Production Ready ✅