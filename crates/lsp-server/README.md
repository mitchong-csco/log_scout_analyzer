# LSP Server

> Language Server Protocol orchestrator for log file analysis

## Overview

The LSP server acts as the bridge between editor extensions and the core analysis engine:
- Provides LSP protocol implementation for log files
- Coordinates analysis across all features
- Delivers diagnostics to editor extensions
- Manages analysis state and caching
- Implements citation and reference features

## Features

- **LSP Protocol**: Full Language Server Protocol support
- **Real-time Analysis**: Analyze logs as you edit
- **Diagnostic Reporting**: Show issues inline in the editor
- **Citation Model**: Track and reference log entries
- **Multi-Editor Support**: Works with VS Code, Zed, and other LSP clients
- **Performance Optimized**: Incremental analysis and caching

## Quick Links

- [LSP Diagnostic Data Structure](docs/LSP_DIAGNOSTIC_DATA_STRUCTURE.md)
- [LSP Server Analysis Capabilities](docs/LSP_SERVER_ANALYSIS_CAPABILITIES.md)
- [Extension Data Consumer Guide](docs/EXTENSION_DATA_CONSUMER_GUIDE.md)
- [Citation Model Implementation](docs/CITATION_MODEL_IMPLEMENTATION.md)
- [Logging Setup](docs/LOGGING_SETUP.md)

## Usage

### Starting the Server

```bash
# Start the LSP server
log-scout-lsp-server

# Or with custom configuration
log-scout-lsp-server --config /path/to/config.yaml
```

### LSP Capabilities

The server provides:
- `textDocument/diagnostic` - Real-time log analysis
- `textDocument/hover` - Pattern information on hover
- `textDocument/codeAction` - Quick fixes for common issues
- `textDocument/references` - Find related log entries
- `workspace/symbol` - Search for patterns across logs

## Architecture

```
lsp-server/
├── src/
│   ├── server.rs         # LSP server implementation
│   ├── handlers/         # LSP message handlers
│   │   ├── diagnostic.rs
│   │   ├── hover.rs
│   │   └── code_action.rs
│   ├── analyzer.rs       # Orchestrates pattern analysis
│   ├── cache.rs          # Analysis result caching
│   ├── citation.rs       # Citation tracking
│   └── state.rs          # Server state management
└── tests/
    └── integration/      # Integration tests
```

## Diagnostic Structure

```json
{
  "range": {
    "start": { "line": 42, "character": 0 },
    "end": { "line": 42, "character": 80 }
  },
  "severity": "Error",
  "code": "connection_failed",
  "source": "log-scout",
  "message": "Connection failure detected",
  "data": {
    "pattern_id": "conn_fail_001",
    "parameters": {
      "host": "server.example.com",
      "port": "8080"
    },
    "quality_score": 0.95
  }
}
```

## Configuration

```yaml
# lsp-config.yaml
patterns:
  directory: "./patterns"
  watch: true

analysis:
  incremental: true
  cache_size: 1000
  timeout_ms: 5000

logging:
  level: info
  file: "./lsp-server.log"
```

## Extension Integration

The LSP server is designed to work with editor extensions:

- **VS Code Extension**: Located in `vscode-extension/`
- **Zed Extension**: Located in `zed-extension/`

See [Extension Data Consumer Guide](docs/EXTENSION_DATA_CONSUMER_GUIDE.md) for details.

## Dependencies

### Internal
- `core` - Shared types
- `pattern-engine` - Pattern matching
- `pattern-loader` - Pattern management
- `quality-system` - Quality tracking

### External
- `tower-lsp` - LSP framework
- `tokio` - Async runtime
- `serde_json` - JSON serialization
- `dashmap` - Concurrent caching

## Performance Considerations

- **Incremental Analysis**: Only re-analyze changed portions
- **Smart Caching**: Cache frequently accessed results
- **Async Processing**: Non-blocking analysis
- **Resource Limits**: Configurable timeouts and limits

## Related Features

- [Pattern Engine](../pattern-engine/README.md) - Pattern matching
- [Pattern Loader](../pattern-loader/README.md) - Pattern loading
- [Quality System](../quality-system/README.md) - Quality metrics

## Related Projects

- [VS Code Extension](../../vscode-extension/README.md)
- [Zed Extension](../../zed-extension/README.md)
