# Core

> Shared types, utilities, and common functionality

## Overview

The core crate provides foundational types and utilities used across all Log Scout Analyzer features:
- Common data structures
- Error types and handling
- Configuration management
- Utility functions
- Shared traits and interfaces

## Features

- **Type Definitions**: Shared types used across the monorepo
- **Error Handling**: Unified error types with thiserror
- **Configuration**: Common configuration structures
- **Serialization**: Serde-based serialization support
- **Utilities**: Helper functions for common tasks

## Key Types

### Pattern Types

```rust
pub struct PatternId(String);
pub struct PatternMatch {
    pub pattern_id: PatternId,
    pub range: Range,
    pub parameters: HashMap<String, String>,
}
```

### Result Types

```rust
pub type Result<T> = std::result::Result<T, Error>;

#[derive(Error, Debug)]
pub enum Error {
    #[error("Pattern error: {0}")]
    Pattern(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    // ... more error types
}
```

### Configuration

```rust
pub struct Config {
    pub patterns_dir: PathBuf,
    pub cache_size: usize,
    pub timeout: Duration,
}
```

## Architecture

```
core/
├── src/
│   ├── lib.rs            # Public API
│   ├── types.rs          # Common types
│   ├── error.rs          # Error definitions
│   ├── config.rs         # Configuration
│   ├── traits.rs         # Shared traits
│   └── utils.rs          # Utility functions
└── tests/
    └── unit/             # Unit tests
```

## Dependencies

### External
- `serde` - Serialization framework
- `thiserror` - Error handling
- `chrono` - Time and date handling
- `uuid` - Unique identifiers

## Usage Example

```rust
use log_scout_core::{PatternId, PatternMatch, Range, Result};

fn process_match(match_data: PatternMatch) -> Result<()> {
    println!("Pattern: {}", match_data.pattern_id);
    println!("Range: {}:{}", match_data.range.start, match_data.range.end);
    
    for (key, value) in match_data.parameters {
        println!("  {}: {}", key, value);
    }
    
    Ok(())
}
```

## Design Principles

1. **Minimal Dependencies**: Keep external dependencies to a minimum
2. **Stability First**: Changes to core should be rare and well-considered
3. **Clear Boundaries**: Well-defined interfaces for other crates
4. **Performance**: Zero-cost abstractions where possible
5. **Documentation**: Everything public must be documented

## Related Features

All other features depend on core:
- [Pattern Engine](../pattern-engine/README.md)
- [Pattern Loader](../pattern-loader/README.md)
- [Quality System](../quality-system/README.md)
- [LSP Server](../lsp-server/README.md)
