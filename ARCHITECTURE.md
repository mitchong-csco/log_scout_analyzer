# Log Scout Analyzer - Architecture

## Overview

Log Scout Analyzer is an LSP-based log analysis tool with a consolidated architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
│                   (vscode-extension/)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Enhanced DevTools UI (tree views, console)          │ │
│  │  • LSP Client (vscode-languageclient)                  │ │
│  │  • Timeline visualization                               │ │
│  │  • SIP call flow diagrams                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓ LSP Protocol
┌─────────────────────────────────────────────────────────────┐
│                    LSP Server (Rust)                         │
│                    (lsp-server/)                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  • Pattern matching engine                              │ │
│  │  • TagScout MongoDB integration                         │ │
│  │  • Offline caching                                      │ │
│  │  • Real-time diagnostics                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              TagScout Pattern Database                       │
│                   (MongoDB)                                  │
│  • 1000+ curated patterns                                   │
│  • Product-specific rules                                   │
│  • Real-time sync                                           │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

### Active Components

- **`vscode-extension/`** - VS Code extension (v0.0.23)
  - Full LSP integration
  - Enhanced DevTools-style UI
  - Timeline views, console output, call flow diagrams

- **`lsp-server/`** - Rust LSP server
  - Shared by all editor clients
  - TagScout MongoDB integration
  - High-performance pattern matching

- **`zed-extension/`** - Zed editor extension
  - Lightweight LSP client for Zed
  - Uses same LSP server

- **`tagscout-integration/`** - TagScout bridge library
  - TypeScript/Node.js interface to MongoDB
  - Pattern synchronization
  - Offline caching

- **`config/`** - Pattern configuration files
  - YAML pattern definitions
  - Product-specific configs (Jabber, WebEx, CUCM)

- **`docs/`** - Documentation
  - Pattern system guides
  - SIP parser documentation
  - RFC annotation specs

- **`examples/`** - Sample log files for testing

### Archived Components

- **`archive/v1-pre-lsp/`** - Pre-LSP version (standalone TypeScript)
- **`archive/v0.0.6-lsp-only/`** - Original LSP version without enhanced UI
- **`archive/old-documentation/`** - Outdated documentation files

## Key Design Decisions

### Why LSP?
- **Universal**: One server works with VS Code, Zed, Vim, Emacs, etc.
- **Performance**: Rust-based server handles large files efficiently
- **Separation**: UI logic separate from analysis logic

### Why TagScout Integration?
- **Centralized Patterns**: Single source of truth for all patterns
- **Real-time Updates**: Patterns update without extension reinstall
- **Offline-First**: Cached patterns work without network

### Why Consolidated Extension?
- **Single codebase**: Easier maintenance
- **Feature parity**: All features in one place
- **Better UX**: Enhanced UI + powerful LSP backend

## Development Workflow

### Building the LSP Server
```bash
cd lsp-server
cargo build --release
```

### Building the VS Code Extension
```bash
cd vscode-extension
npm install
npm run build
npm run package
```

### Testing
```bash
# Test LSP server
cd lsp-server
cargo test

# Test TagScout connection
cargo run --bin test-tagscout

# Test extension
code --install-extension vscode-extension/log-scout-analyzer.vsix
```

## Future Enhancements

- [ ] Language server for additional editors (Emacs, Sublime)
- [ ] Web-based log viewer using same LSP server
- [ ] Machine learning pattern suggestions
- [ ] Distributed log analysis across multiple files
- [ ] Export to various formats (JSON, CSV, HTML)

## Version History

- **v0.0.23** (Current) - Consolidated LSP + DevTools UI
- **v0.0.6-v0.0.22** - Parallel development (LSP-only vs DevTools)
- **v0.0.1-v0.0.5** - Pre-LSP standalone extension

---

For detailed documentation, see individual component READMEs:
- [VS Code Extension](vscode-extension/README.md)
- [LSP Server](lsp-server/README.md)
- [Pattern System](docs/PATTERN_SYSTEM.md)
