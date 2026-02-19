# Pattern Engine

> Core pattern matching and analysis engine

## Overview

The pattern engine is the heart of Log Scout Analyzer's pattern matching capabilities. It handles:
- Pattern compilation and optimization
- Regex and text-based pattern matching
- Parameter extraction from log lines
- Match result generation and formatting
- Pattern testing and validation

## Features

- **Multiple Pattern Types**: Support for exact, regex, and compound patterns
- **Parameter Extraction**: Extract and name parameters from matched patterns
- **Performance Optimized**: Caching and lazy compilation for speed
- **Testing Framework**: Built-in pattern testing with JSON export

## Quick Links

- [Pattern Design Philosophy](docs/PATTERN_DESIGN_PHILOSOPHY.md)
- [Parameter Extraction Fix](docs/PARAMETER_EXTRACTION_FIX.md)
- [Pattern Testing Guide](docs/PATTERN_TESTING_AND_MARKING_GUIDE.md)
- [JSON Export Guide](docs/PATTERN_TESTING_JSON_EXPORT_GUIDE.md)

## Usage Example

```rust
use pattern_engine::{PatternMatcher, Pattern};

// Create a pattern matcher
let matcher = PatternMatcher::new();

// Define a pattern
let pattern = Pattern::regex(
    r"ERROR: Connection to (?P<host>\S+) failed"
)?;

// Match against log line
let log_line = "ERROR: Connection to server.example.com failed";
if let Some(result) = matcher.match_pattern(&pattern, log_line) {
    println!("Matched: {}", result.matched_text());
    println!("Host: {}", result.parameter("host"));
}
```

## Architecture

```
pattern-engine/
├── src/
│   ├── matcher.rs        # Core matching logic
│   ├── pattern.rs        # Pattern types and compilation
│   ├── extractor.rs      # Parameter extraction
│   ├── result.rs         # Match result structures
│   └── test_support.rs   # Testing utilities
└── tests/
    └── integration/      # Integration tests
```

## Dependencies

### Internal
- `core` - Shared types and utilities

### External
- `regex` - Regular expression engine
- `serde` - Serialization support
- `thiserror` - Error handling

## Related Features

- [Pattern Loader](../pattern-loader/README.md) - Pattern loading and management
- [Quality System](../quality-system/README.md) - Pattern quality monitoring
