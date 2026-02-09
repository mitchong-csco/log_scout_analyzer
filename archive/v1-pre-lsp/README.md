# Pre-LSP Architecture (v0.0.x)

This directory contains the original VS Code and Zed extensions before migration to the LSP (Language Server Protocol) architecture.

## Archive Date
February 2024

## What's Archived Here

### 1. VS Code Extension (`vscode-extension/`)
- **Language**: TypeScript
- **Last Version**: 0.0.15
- **Status**: Fully functional, feature-rich

**Key Features:**
- Pattern matching engine (TypeScript)
- Rich diagnostics with error/warning/info detection
- Timeline visualization with event categorization
- SIP call flow parsing
- Multiple UI panels:
  - Scout Analyzer Panel (tree view with categories)
  - Results Panel (detailed findings)
  - Timeline View (chronological events)
  - Console output with split views
- Status bar integration showing error/warning/timeline counts
- Gutter decorations for errors in editor
- Syntax highlighting for log files

**Architecture:**
- All pattern matching logic in TypeScript
- Runs entirely in VS Code extension host process
- ~17 TypeScript source files
- Heavy UI integration with VS Code API

### 2. Zed Extension (`zed-extension/`)
- **Language**: Rust (compiled to WASM)
- **Status**: Partially implemented
- **Last Version**: 0.1.0

**Key Features:**
- Pattern matching engine (Rust)
- Basic diagnostics
- Configuration management
- Compiled to WASM for Zed

**Architecture:**
- Core logic in Rust
- Compiled to WASM (wasm32-wasip1 target)
- Pattern engine ported from VS Code TypeScript version
- Minimal Zed-specific wrapper

**Reusable Components:**
- `src/pattern_engine.rs` - Core pattern matching (regex-based)
- `src/diagnostics.rs` - Diagnostic generation
- `src/config.rs` - Pattern configuration loading

## Why Migrated to LSP

The original architecture had several limitations:

### Problems with Old Architecture

1. **Code Duplication**
   - Pattern matching logic duplicated between TypeScript (VS Code) and Rust (Zed)
   - Hard to keep feature parity between editors
   - Double maintenance burden

2. **Limited Editor Support**
   - Each editor required complete rewrite
   - VS Code extension didn't work in other editors
   - Zed extension required WASM compilation

3. **Performance Issues**
   - TypeScript pattern matching slower than Rust
   - No ability to share analysis results
   - Each user running own analysis

4. **Scalability Concerns**
   - No centralized deployment option
   - Difficult to update patterns globally
   - Enterprise features hard to implement

### Benefits of New LSP Architecture

✅ **Single Codebase**: One Rust server, thin clients for each editor
✅ **Universal Support**: Same server works with VS Code, Zed, Vim, Emacs, etc.
✅ **Better Performance**: Rust-based analysis for all editors
✅ **Easier Maintenance**: Update server once, all editors benefit
✅ **Enterprise Ready**: Can deploy as centralized service
✅ **Feature Parity**: All editors get same features automatically

## Code Reuse in New Architecture

### From Zed Extension → LSP Server

| Original File | New Location | Changes |
|--------------|--------------|---------|
| `src/pattern_engine.rs` | `lsp-server/src/pattern_engine.rs` | Minimal (adapted for LSP) |
| `src/diagnostics.rs` | `lsp-server/src/diagnostics.rs` | Adapted to LSP Diagnostic types |
| `src/config.rs` | `lsp-server/src/config.rs` | No changes |

### From VS Code Extension → New VS Code Client

| Original File | New Location | Changes |
|--------------|--------------|---------|
| `src/timelineVisualization.ts` | `clients/vscode/src/panels/timelinePanel.ts` | Updated to consume LSP data |
| `src/resultsPanel.ts` | `clients/vscode/src/panels/resultsPanel.ts` | Updated to consume LSP data |
| `src/scoutAnalyzerPanel.ts` | `clients/vscode/src/panels/analyzerPanel.ts` | Updated to consume LSP data |
| `src/sipCallFlowParser.ts` | `lsp-server/src/parser/sip.rs` | Ported to Rust |

### Pattern Definitions

All pattern definitions and regex rules were migrated to:
- `shared/patterns/patterns.json` (in new architecture)

## Structure Overview

```
archive/v1-pre-lsp/
├── README.md                    (this file)
├── vscode-extension/            (Original VS Code extension)
│   ├── src/
│   │   ├── extension.ts         (Main entry point)
│   │   ├── patternEngine.ts     (TypeScript pattern matching)
│   │   ├── diagnosticsProvider.ts
│   │   ├── timelineVisualization.ts
│   │   ├── resultsPanel.ts
│   │   ├── scoutAnalyzerPanel.ts
│   │   ├── sipCallFlowParser.ts
│   │   └── ... (17 files total)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
└── zed-extension/               (Original Zed extension)
    ├── src/
    │   ├── lib.rs               (Entry point)
    │   ├── pattern_engine.rs    (Core pattern matching)
    │   ├── diagnostics.rs       (Diagnostic generation)
    │   ├── config.rs            (Configuration)
    │   └── language_server.rs   (Zed LSP wrapper)
    ├── Cargo.toml
    └── extension.toml
```

## Building Archived Extensions

If you need to build these for reference:

### VS Code Extension

```bash
cd archive/v1-pre-lsp/vscode-extension
npm install
npm run compile
vsce package
```

### Zed Extension

```bash
cd archive/v1-pre-lsp/zed-extension
cargo build --target wasm32-wasip1 --release
```

## Statistics

### VS Code Extension (v0.0.15)
- **Lines of Code**: ~3,500 TypeScript
- **Features**: 15+ major features
- **UI Components**: 6 panels/views
- **Package Size**: ~1.2 MB (without node_modules)

### Zed Extension (v0.1.0)
- **Lines of Code**: ~800 Rust
- **Features**: Basic pattern matching + diagnostics
- **Package Size**: ~150 KB (WASM)

## Migration Timeline

- **v0.0.1 - v0.0.15**: VS Code extension development (Jan - Feb 2024)
- **v0.1.0**: Zed extension initial implementation (Feb 2024)
- **Feb 2024**: Decision to migrate to LSP architecture
- **v1.0.0+**: New LSP-based architecture

## References

See the new architecture documentation:
- `../../docs/LSP_ARCHITECTURE.md` - LSP design overview
- `../../docs/LSP_SERVER_DEPLOYMENT.md` - Deployment strategies
- `../../docs/LSP_MIGRATION_PLAN.md` - Migration plan
- `../../README.md` - New project structure

## Notes

This archive is preserved for:
1. **Reference**: Understanding design decisions and feature evolution
2. **Code Reuse**: Extracting reusable components and patterns
3. **Comparison**: Benchmarking new LSP architecture against old
4. **History**: Maintaining project history and context

---

**For current development, see the root directory of the project.**

The new LSP-based architecture (v1.0.0+) is the actively maintained version.