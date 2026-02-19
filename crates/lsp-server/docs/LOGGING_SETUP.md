# Logging Setup and Configuration

This document describes the logging infrastructure for Log Scout Analyzer, covering both the VSCode extension and the LSP server.

## Overview

The Log Scout Analyzer uses a comprehensive logging system that writes to separate log files for:
- **Extension activities**: VSCode extension operations, UI interactions, and general events
- **LSP server operations**: Language Server Protocol communication, pattern matching, and diagnostics

## Log File Locations

### Windows
- **Extension Log**: `%USERPROFILE%\.log-scout-analyzer\log-scout-extension-YYYY-MM-DD.log`
- **LSP Server Log**: `%USERPROFILE%\.log-scout-analyzer\lsp-server-YYYY-MM-DD.log`

### Linux/macOS
- **Extension Log**: `~/.log-scout-analyzer/log-scout-extension-YYYY-MM-DD.log`
- **LSP Server Log**: `~/.log-scout-analyzer/lsp-server-YYYY-MM-DD.log`

Log files are named with the current date, creating a new file each day for easy organization.

## Features

### Extension Logging (`fileLogger.ts`)

The extension logger tracks:
- Extension activation and initialization
- File analysis operations (start, completion, results)
- Cache operations (load, save, hits, misses)
- Export operations
- LSP client lifecycle (initialization, connection, disconnection)
- LSP diagnostics (received, counts, errors)
- LSP requests and responses
- LSP notifications
- LSP errors with context

### LSP Server Logging (`main.rs`)

The LSP server logger tracks:
- Server startup and version information
- Client connections and disconnections
- Document analysis requests
- Pattern matching operations
- Diagnostic publishing
- TagScout integration events
- Performance metrics

## Accessing Logs

### Via Command Palette

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type one of:
   - `Scout: Open Extension Log` - Opens the extension log file
   - `Scout: Open LSP Server Log` - Opens the LSP server log file
   - `Scout: Show Log File Paths` - Shows both log paths with options to open or copy

### Via Output Channel

The extension also logs to the VSCode Output Channel:
1. Open View → Output (`Ctrl+Shift+U`)
2. Select "Log Scout Analyzer" from the dropdown

## Log Levels

### Extension Logs
- `INFO`: Normal operations (analysis start/complete, cache operations)
- `WARN`: Warnings and non-critical issues
- `ERROR`: Errors and failures
- `DEBUG`: Detailed diagnostic information

### LSP Server Logs
Controlled by the `RUST_LOG` environment variable:
- `info`: Standard operations (default)
- `debug`: Detailed debugging information
- `trace`: Very verbose tracing

To enable debug logging for the LSP server:
1. Open VSCode Settings
2. Search for "logScoutAnalyzer.lsp.trace"
3. Set to "verbose"

## Log Format

### Extension Log Format
```
[2024-01-15T10:30:45.123Z] Message text
[2024-01-15T10:30:45.124Z] [LSP] [INFO ] LSP-specific message
```

### LSP Server Log Format
```
2024-01-15T10:30:45.123456Z  INFO log_scout_lsp_server: Server message
2024-01-15T10:30:45.123456Z DEBUG log_scout_lsp_server: Debug message
```

## Configuration

### Extension Logging

The file logger is automatically initialized when the extension activates. It logs to the workspace storage directory by default, with a fallback to the global storage directory.

### LSP Server Logging

The LSP server uses the Rust `tracing` framework with the following configuration:
- Logs to both stderr (for debugging) and file (for persistence)
- File logging excludes ANSI color codes for better readability
- Log level can be controlled via `RUST_LOG` environment variable

## Troubleshooting

### Logs Not Appearing

1. **Check log file exists**: Use `Scout: Show Log File Paths` command
2. **Check file permissions**: Ensure write access to `~/.log-scout-analyzer/`
3. **Check disk space**: Ensure sufficient space for log files

### LSP Server Not Logging

1. Verify LSP client is connected:
   - Open Output Channel → "Log Scout Analyzer"
   - Look for "LSP client started successfully" message
2. Check LSP server binary exists in `bin/` directory
3. Try setting `RUST_LOG=debug` for more verbose output

### Log Files Growing Too Large

Log files are created daily, so old logs can be safely deleted:
- Windows: Delete files in `%USERPROFILE%\.log-scout-analyzer\`
- Linux/macOS: `rm ~/.log-scout-analyzer/*.log`

Or keep only recent logs:
```bash
# Keep only last 7 days (Linux/macOS)
find ~/.log-scout-analyzer/ -name "*.log" -mtime +7 -delete
```

## Development

### Adding New Log Statements

#### Extension (TypeScript)

```typescript
// General logging
fileLogger?.log("Your message here");

// LSP-specific logging
fileLogger?.logLSP("LSP message", "info"); // or "warn", "error", "debug"

// LSP connection events
fileLogger?.logLSPConnection(true, "1.0.0", "LSP Server");

// LSP diagnostics
fileLogger?.logLSPDiagnostics(uri, diagnosticsCount);

// LSP errors
fileLogger?.logLSPError("Error message", "context");
```

#### LSP Server (Rust)

```rust
use tracing::{info, warn, error, debug, trace};

// Use standard tracing macros
info!("Normal operation message");
debug!("Detailed debugging info");
error!("Error occurred: {}", error_msg);
```

### Custom Log Locations

To use a custom log location for the extension, you can modify the `FileLogger` constructor in `fileLogger.ts` to use a different base directory.

## Log Rotation

Currently, logs rotate daily based on the filename date. To implement size-based rotation:

1. Monitor file size in `FileLogger.log()`
2. When threshold exceeded, rename current file with timestamp
3. Create new log file

Example threshold: 10MB per file

## Privacy Considerations

Log files may contain:
- File paths from your workspace
- Log file content snippets
- Pattern matching results
- Error messages with stack traces

**Do not share log files publicly without reviewing for sensitive information.**

## Support

When reporting issues, include:
1. Extension version (`Scout: Show Version Info`)
2. Relevant log excerpts from both extension and LSP logs
3. Steps to reproduce
4. VSCode version

Use `Scout: Show Log File Paths` to quickly locate and copy log file paths.

## See Also

- [Architecture Documentation](ARCHITECTURE.md)
- [LSP Server Implementation](lsp-server/README.md)
- [VSCode Extension Guide](vscode-extension/README.md)