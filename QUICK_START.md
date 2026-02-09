# Log Scout Analyzer - Quick Start Guide

Get up and running with Log Scout Analyzer in 5 minutes!

## Installation

### From Zed Extensions (Recommended)

1. Open Zed editor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Extensions: Install Extension"
4. Search for "Log Scout Analyzer"
5. Click Install
6. Restart Zed

### From Source

```bash
# Clone repository
git clone https://github.com/yourusername/log-scout-analyzer.git
cd log-scout-analyzer

# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-wasi

# Build
cargo build --release --target wasm32-wasi

# Install to Zed
# Mac/Linux:
mkdir -p ~/.config/zed/extensions/log-scout-analyzer
cp target/wasm32-wasi/release/log_scout_analyzer.wasm ~/.config/zed/extensions/log-scout-analyzer/

# Windows:
# mkdir %APPDATA%\Zed\extensions\log-scout-analyzer
# copy target\wasm32-wasi\release\log_scout_analyzer.wasm %APPDATA%\Zed\extensions\log-scout-analyzer\
```

## First Use

### 1. Open a Log File

Open any `.log` file in Zed. The extension automatically recognizes:
- `*.log`
- `*.txt`
- `jabber*.log`
- `webex*.log`
- `application*.log`

### 2. See It In Action

Open the included sample log:
```bash
# In Zed, open:
examples/sample.log
```

You should immediately see:
- 🔴 **Red underlines** for errors
- 🟡 **Yellow underlines** for warnings
- 🔵 **Blue underlines** for info messages

### 3. Explore Diagnostics

1. Hover over any underlined text to see details
2. Click on the diagnostic to see the full message
3. Use `Cmd+.` (Mac) or `Ctrl+.` (Windows/Linux) for code actions

## Basic Configuration

### Create Pattern Configuration

Create a file in your workspace: `config/patterns.yaml`

```yaml
patterns:
  - id: "my-custom-error"
    name: "My Custom Error"
    description: "Detects my application errors"
    pattern: "ERROR: (.*)"
    severity: error
    category: "errors"
    action: "Check application logs for details"
```

### Configure Extension Settings

Add to your Zed `settings.json`:

```json
{
  "log-scout-analyzer": {
    "detection_threshold": 0.85,
    "multiline_patterns": true,
    "multiline_context_window": 10,
    "patterns_config": "config/patterns.yaml"
  }
}
```

## Common Use Cases

### Analyzing Application Logs

```bash
# Open your application log
open myapp.log

# Extension automatically:
# 1. Loads patterns
# 2. Scans the file
# 3. Highlights issues
# 4. Shows diagnostics
```

### Finding Specific Errors

1. Open the log file
2. Press `Cmd+F` (Mac) or `Ctrl+F` (Windows/Linux)
3. Search for error codes or patterns
4. Use diagnostics panel to see all errors

### Tracking Down Connection Issues

The extension automatically detects:
- Connection timeouts
- Connection refused
- DNS resolution failures
- SSL certificate errors

Look for diagnostic messages with:
- 🔴 Red underlines for critical connection failures
- 🟡 Yellow for warnings and retries

## Pattern Examples

### Simple Error Pattern

```yaml
- id: "connection-error"
  name: "Connection Error"
  pattern: "Connection (failed|refused|timeout)"
  severity: error
  category: "network"
```

### Pattern with Capture Groups

```yaml
- id: "user-login"
  name: "User Login"
  pattern: "User ([\\w\\.@-]+) (logged in|logged out)"
  severity: info
  category: "authentication"
```

### Multi-line Pattern

```yaml
- id: "stack-trace"
  name: "Exception Stack Trace"
  pattern: "(?s)Exception.*?\\n(\\s+at.*?\\n)+"
  mode:
    multiline:
      context_lines: 20
  severity: error
  category: "exceptions"
```

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Command Palette | `Cmd+Shift+P` | `Ctrl+Shift+P` |
| Quick Fix | `Cmd+.` | `Ctrl+.` |
| Find | `Cmd+F` | `Ctrl+F` |
| Go to Line | `Cmd+G` | `Ctrl+G` |

## Tips & Tricks

### 1. Use Service-Specific Patterns

Create separate pattern files for different services:

```
config/
├── patterns.yaml       # General patterns
├── jabber.yaml        # Jabber-specific
├── webex.yaml         # Webex-specific
└── myapp.yaml         # Your app patterns
```

### 2. Adjust Sensitivity

If you're getting too many/few detections, adjust the threshold:

```json
{
  "log-scout-analyzer": {
    "detection_threshold": 0.75  // Lower = more sensitive
  }
}
```

### 3. Focus on Specific Categories

Filter patterns by category in your configuration:

```yaml
patterns:
  - id: "critical-only"
    pattern: "CRITICAL: (.*)"
    severity: error
    category: "critical"
    enabled: true

  - id: "debug-info"
    pattern: "DEBUG: (.*)"
    severity: info
    category: "debug"
    enabled: false  # Disable debug patterns
```

### 4. Performance with Large Files

For very large log files (>50MB):

```json
{
  "log-scout-analyzer": {
    "streaming_chunk_size_kb": 1024,
    "background_processing": true
  }
}
```

## Troubleshooting

### Extension Not Working

1. Check extension is installed: `~/.config/zed/extensions/`
2. Restart Zed editor
3. Check file extension is `.log` or `.txt`
4. View Zed logs: `Cmd+Shift+P` → "Zed: Open Logs"

### No Patterns Detected

1. Verify pattern file exists: `config/patterns.yaml`
2. Check YAML syntax is valid
3. Ensure patterns are enabled: `enabled: true`
4. Test regex at https://regex101.com/

### Performance Issues

1. Reduce context window: `multiline_context_window: 5`
2. Disable unused plugins
3. Increase chunk size for streaming
4. Disable multi-line patterns if not needed

### Patterns Not Matching

1. Test regex pattern independently
2. Check for escaped characters: `\\.` for literal dot
3. Verify severity level is correct
4. Enable case-insensitive matching: `(?i)pattern`

## Example Workflows

### Debugging Production Issues

1. Open production log file
2. Look for red (error) diagnostics
3. Hover to see error details and suggested actions
4. Use "Find" to locate related errors
5. Check timestamps to understand sequence

### Analyzing Performance

1. Configure performance patterns (CPU, memory, slow queries)
2. Open application logs
3. Look for yellow (warning) diagnostics
4. Track frequency of performance warnings
5. Identify patterns in timing

### Security Auditing

1. Configure authentication and security patterns
2. Open security logs
3. Search for failed logins, unauthorized access
4. Track suspicious activity patterns
5. Export findings for reporting

## Next Steps

- 📖 Read the full [README.md](README.md)
- 🎨 Customize patterns in `config/patterns.yaml`
- 🔌 Enable service-specific plugins (Jabber, Webex)
- 📊 Explore advanced features (correlation, baselines)
- 🤝 Contribute patterns: see [CONTRIBUTING.md](CONTRIBUTING.md)

## Getting Help

- 📝 Check [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for current status
- 🐛 Report issues: https://github.com/yourusername/log-scout-analyzer/issues
- 💬 Ask questions: https://github.com/yourusername/log-scout-analyzer/discussions
- 📧 Email: support@logscout.dev

## Cheat Sheet

```yaml
# Minimal Pattern
- id: "error-pattern"
  name: "Error"
  pattern: "ERROR: (.*)"
  severity: error

# Full Pattern
- id: "full-pattern"
  name: "Descriptive Name"
  description: "What this detects"
  pattern: "regex here"
  mode: singleline  # or multiline
  severity: error   # error|warning|info|hint
  category: "group"
  service: "jabber" # optional
  tags: ["tag1"]
  action: "Fix suggestion"
  enabled: true
```

**Happy log analyzing! 🚀**