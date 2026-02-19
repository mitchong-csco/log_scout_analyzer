# Pattern Loader

> Pattern loading, override management, and runtime pattern marking

## Overview

The pattern loader manages the lifecycle of patterns in Log Scout Analyzer:
- Loading patterns from YAML files
- Pattern override system for user customizations
- Runtime pattern marking and tracking
- Pattern catalog management
- Hot-reloading of pattern changes

## Features

- **YAML-based Configuration**: Define patterns in easy-to-edit YAML files
- **Override System**: User patterns can override built-in patterns
- **Runtime Marking**: Mark patterns during analysis for quality tracking
- **Phase-based Loading**: Load patterns in phases for better organization
- **Hot Reload**: Update patterns without restarting the analyzer

## Quick Links

- [Pattern Override Quick Start](docs/PATTERN_OVERRIDE_QUICK_START.md)
- [Pattern Override System Summary](docs/PATTERN_OVERRIDE_SYSTEM_SUMMARY.md)
- [Pattern Marking Integration](docs/PATTERN_MARKING_INTEGRATION_PLAN.md)
- [Pattern Catalog TODO](docs/TODO_PATTERN_CATALOG.md)
- [Phase Implementation](docs/PHASE_1_COMPLETE.md)

## Usage Example

```rust
use pattern_loader::{PatternLoader, OverrideManager};

// Create a pattern loader
let loader = PatternLoader::new("patterns/")?;

// Load patterns
let patterns = loader.load_all()?;

// Setup override system
let override_mgr = OverrideManager::new(
    "patterns/",
    Some(".log-scout/overrides/")
)?;

// Load with overrides applied
let patterns_with_overrides = override_mgr.load_patterns()?;
```

## Pattern YAML Format

```yaml
patterns:
  - id: connection_fail
    name: "Connection Failure"
    type: regex
    pattern: "ERROR: Connection to (?P<host>\\S+) failed"
    severity: error
    category: network
    parameters:
      - name: host
        description: "Target host that failed to connect"
```

## Architecture

```
pattern-loader/
├── src/
│   ├── loader.rs         # Core loading logic
│   ├── override.rs       # Override management
│   ├── marking.rs        # Runtime pattern marking
│   ├── catalog.rs        # Pattern catalog
│   └── yaml_parser.rs    # YAML parsing
└── tests/
    └── fixtures/         # Test pattern files
```

## Dependencies

### Internal
- `core` - Shared types
- `pattern-engine` - Pattern types

### External
- `serde_yaml` - YAML parsing
- `notify` - File watching for hot reload
- `walkdir` - Directory traversal

## Related Features

- [Pattern Engine](../pattern-engine/README.md) - Pattern matching logic
- [Quality System](../quality-system/README.md) - Pattern quality metrics
- [LSP Server](../lsp-server/README.md) - LSP integration
