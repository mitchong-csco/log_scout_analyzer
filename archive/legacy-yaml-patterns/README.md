# Legacy YAML Pattern Files

**Status**: Archived - Not used by current system

## What These Are

These YAML files contained pattern definitions for log analysis before the TagScout MongoDB integration was implemented.

- `jabber.yaml` - 285 lines of Jabber/CUCM patterns
- `patterns.yaml` - 421 lines of general log patterns  
- `webex.yaml` - 275 lines of Webex patterns

## Why They're Archived

The current system uses:
- **TagScout MongoDB** for pattern storage (1000+ patterns)
- **LSP Server** with TagScout client integration
- **Real-time pattern synchronization** from MongoDB

These static YAML files are no longer loaded or referenced by:
- LSP server (uses TagScout MongoDB)
- VS Code extension (LSP-based diagnostics)
- Current build/run workflows

## Historical Context

These files were created during development phases when:
1. Patterns were stored locally in YAML format
2. PatternEngine loaded them directly from filesystem
3. Before TagScout integration existed

## If You Need Them

These patterns may be useful as:
- Reference for pattern structure/examples
- Source material for TagScout database imports
- Documentation of coverage requirements

**Archived**: February 10, 2026
