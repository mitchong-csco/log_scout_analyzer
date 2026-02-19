# Log Scout Analyzer - Style Guide

> Standardized conventions for code, documentation, and implementation tracking

**Version**: 1.0.0  
**Last Updated**: 2026-02-17

---

## Table of Contents

- [Documentation Standards](#documentation-standards)
- [Implementation Status](#implementation-status)
- [Code Style](#code-style)
- [Git Conventions](#git-conventions)
- [Testing Standards](#testing-standards)

---

## Documentation Standards

### Documentation Structure

Each feature crate must have its own `docs/` directory with:

```
crates/<feature>/
├── docs/
│   ├── README.md              # Feature overview (via parent README)
│   ├── DESIGN.md              # Design decisions and architecture
│   ├── API.md                 # Public API documentation (optional)
│   ├── IMPLEMENTATION.md      # Current implementation status
│   └── CHANGELOG.md           # Feature-specific changes (optional)
├── src/
└── Cargo.toml
```

### Documentation Types

#### 1. Feature README (`README.md`)

**Purpose**: Quick overview and navigation for the feature

**Required Sections**:
- Title and tagline
- Overview
- Features list
- Quick Links to detailed docs
- Usage Example
- Architecture diagram/description
- Dependencies (internal and external)
- Related Features

**Template**: See existing feature READMEs in `crates/*/README.md`

#### 2. Design Documentation (`DESIGN.md`)

**Purpose**: Explain design decisions, architecture, and rationale

**Required Sections**:
- Problem Statement
- Design Goals
- Architecture
- Design Decisions (with rationale)
- Data Structures
- Error Handling approach
- Performance Considerations
- Security Considerations

#### 3. Implementation Status (`IMPLEMENTATION.md`)

**Purpose**: Track feature implementation progress

See [Implementation Status](#implementation-status) section below for the complete template.

---

## Implementation Status

### Status Tracking Template

Use this template for `IMPLEMENTATION.md` in each feature:

````markdown
# <Feature Name> - Implementation Status

**Last Updated**: YYYY-MM-DD  
**Status**: 🟢 Stable | 🟡 Beta | 🔴 Alpha | ⚪ Planned

---

## Overview

Brief summary of current implementation state.

## Completion Status

### Core Functionality

| Component | Status | Completion | Notes |
|-----------|--------|------------|-------|
| Component A | 🟢 Done | 100% | Production ready |
| Component B | 🟡 In Progress | 60% | See [Issue #123] |
| Component C | ⚪ Planned | 0% | Scheduled for v2.0 |
| Component D | 🔴 Blocked | 30% | Waiting on dependency |

**Legend**:
- 🟢 **Done**: Implemented, tested, documented
- 🟡 **In Progress**: Actively being developed
- ⚪ **Planned**: Designed but not started
- 🔴 **Blocked**: Cannot proceed due to dependencies
- ❌ **Deprecated**: No longer maintained

### Features

- [x] Feature 1 - Description
- [x] Feature 2 - Description
- [ ] Feature 3 - Description (🟡 60% complete)
- [ ] Feature 4 - Description (⚪ planned)

### Testing

| Test Type | Coverage | Status | Notes |
|-----------|----------|--------|-------|
| Unit Tests | 85% | 🟢 | Good coverage |
| Integration Tests | 60% | 🟡 | Need more scenarios |
| Performance Tests | 40% | 🔴 | In progress |
| Documentation Tests | 100% | 🟢 | All examples verified |

### Documentation

- [x] API Reference
- [x] Design Documentation
- [ ] User Guide (🟡 in progress)
- [ ] Tutorial (⚪ planned)

---

## Known Issues

### Critical Issues

- **Issue #123**: Brief description
  - **Impact**: What's affected
  - **Workaround**: Temporary solution (if any)
  - **ETA**: When fix is expected

### Minor Issues

- **Issue #124**: Brief description

---

## Technical Debt

### High Priority

1. **Debt Item 1**
   - **Description**: What needs to be improved
   - **Impact**: Why it matters
   - **Effort**: Estimated time to fix

---

## Upcoming Work

### Next Sprint

- [ ] Task 1 - Description
- [ ] Task 2 - Description

### Future Releases

#### v2.0 (Target: Q1 2026)
- [ ] Major feature 1
- [ ] Major feature 2

---

## Dependencies

### Internal Dependencies (Other Crates)

| Crate | Version | Status | Notes |
|-------|---------|--------|-------|
| `core` | 0.1.0 | 🟢 Stable | No issues |

### External Dependencies

| Crate | Version | Status | Notes |
|-------|---------|--------|-------|
| `serde` | 1.0 | 🟢 Stable | Core dependency |

---

## Performance Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Response Time | 50ms | <100ms | 🟢 |
| Memory Usage | 128MB | <256MB | 🟢 |

---

## Change History

### YYYY-MM-DD
- Major change description
````

### Status Indicators

Use consistent status indicators across all documentation:

| Symbol | Status | Description |
|--------|--------|-------------|
| 🟢 | Done/Stable | Complete, tested, production-ready |
| 🟡 | In Progress/Beta | Actively being developed |
| 🔴 | Blocked/Alpha | Cannot proceed or experimental |
| ⚪ | Planned | Designed but not started |
| ❌ | Deprecated | No longer maintained |
| ✅ | Verified | Tested and validated |
| ⚠️ | Warning | Has known issues |
| 🔧 | Maintenance | Under maintenance |

---

## Code Style

### Rust Style

Follow the [Rust Style Guide](https://doc.rust-lang.org/1.0.0/style/) with these additions:

#### Naming Conventions

```rust
// Types: PascalCase
pub struct PatternMatcher { }
pub enum MatchResult { }
pub trait Analyzer { }

// Functions and methods: snake_case
pub fn analyze_pattern() { }
fn internal_helper() { }

// Constants: SCREAMING_SNAKE_CASE
pub const MAX_PATTERN_LENGTH: usize = 1024;
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);

// Modules: snake_case
mod pattern_engine;
mod quality_metrics;
```

#### File Organization

```rust
// 1. Imports (grouped and sorted)
use std::collections::HashMap;
use std::error::Error;

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::core::types::Pattern;
use crate::pattern_engine::MatchResult;

// 2. Module declarations
mod internal_module;

// 3. Constants
const DEFAULT_CAPACITY: usize = 100;

// 4. Type definitions
pub struct MyStruct { }

// 5. Trait definitions
pub trait MyTrait { }

// 6. Implementations
impl MyStruct { }

// 7. Trait implementations
impl MyTrait for MyStruct { }

// 8. Tests (in separate module)
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_something() { }
}
```

#### Documentation Comments

```rust
/// Brief one-line description.
///
/// Longer description explaining the purpose and behavior.
///
/// # Arguments
///
/// * `param1` - Description of first parameter
/// * `param2` - Description of second parameter
///
/// # Returns
///
/// Description of return value.
///
/// # Errors
///
/// Description of when and why errors occur.
///
/// # Examples
///
/// ```
/// use crate::module::function_name;
///
/// let result = function_name(arg1, arg2)?;
/// assert_eq!(result, expected);
/// ```
///
/// # Panics
///
/// Description of panic conditions (if any).
pub fn function_name(param1: Type1, param2: Type2) -> Result<ReturnType, Error> {
    // Implementation
}
```

#### Error Handling

```rust
use thiserror::Error;

/// Use thiserror for custom error types
#[derive(Error, Debug)]
pub enum MyError {
    #[error("pattern not found: {0}")]
    PatternNotFound(String),
    
    #[error("invalid format: {0}")]
    InvalidFormat(String),
    
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

/// Return Result for functions that can fail
pub fn may_fail() -> Result<Value, MyError> {
    // Use ? for error propagation
    let data = read_data()?;
    
    // Use context for better error messages
    parse_data(&data)
        .map_err(|e| MyError::InvalidFormat(e.to_string()))
}
```

#### Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    /// Test function names should describe what they test
    #[test]
    fn test_pattern_matcher_finds_exact_match() {
        // Arrange
        let matcher = PatternMatcher::new();
        let pattern = Pattern::new("test");
        
        // Act
        let result = matcher.find(&pattern);
        
        // Assert
        assert!(result.is_some());
        assert_eq!(result.unwrap().name(), "test");
    }
    
    #[test]
    #[should_panic(expected = "invalid pattern")]
    fn test_pattern_matcher_panics_on_invalid_input() {
        let matcher = PatternMatcher::new();
        matcher.find(&Pattern::new("")); // Should panic
    }
}
```

---

## Git Conventions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples**:

```
feat(pattern-engine): add regex support for patterns

Implement regex pattern matching with caching for improved
performance. Patterns are compiled once and reused.

Closes #123
```

```
fix(lsp-server): correct diagnostic range calculation

The diagnostic range was off by one character when the pattern
matched at the end of a line. Updated to use inclusive ranges.

Fixes #456
```

```
docs(pattern-loader): add API documentation

Added comprehensive API docs with examples for all public
functions in the pattern loader.
```

### Branch Naming

```
<type>/<short-description>
```

**Examples**:
- `feat/regex-patterns`
- `fix/diagnostic-range`
- `docs/api-reference`
- `refactor/error-handling`

---

## Testing Standards

### Test Organization

```
crates/<feature>/
├── src/
│   └── lib.rs
├── tests/
│   ├── integration/
│   │   ├── test_scenario_1.rs
│   │   └── test_scenario_2.rs
│   └── common/
│       └── mod.rs         # Shared test utilities
└── benches/
    └── benchmarks.rs
```

### Test Coverage Goals

| Test Type | Target Coverage | Priority |
|-----------|----------------|----------|
| Unit Tests | ≥80% | High |
| Integration Tests | ≥60% | High |
| Documentation Tests | 100% | Medium |
| Benchmark Tests | Key paths | Low |

### Test Naming

```rust
#[test]
fn test_<component>_<action>_<expected_outcome>() {
    // Test implementation
}

// Examples:
#[test]
fn test_pattern_matcher_finds_exact_match() { }

#[test]
fn test_pattern_loader_handles_invalid_yaml() { }
```

---

## Review Checklist

### For Code Reviews

- [ ] Code follows style guide
- [ ] All tests pass and have good coverage
- [ ] Documentation is complete and accurate
- [ ] No new compiler warnings
- [ ] Error handling is appropriate
- [ ] Performance impact is acceptable
- [ ] Breaking changes are documented
- [ ] Implementation status updated

### For Documentation Reviews

- [ ] Clear and concise writing
- [ ] Examples are accurate and helpful
- [ ] Links are valid
- [ ] Status indicators are current
- [ ] Follows documentation template
- [ ] Code blocks are properly formatted

---

## Questions?

For questions about this style guide:
1. Check existing documentation in `docs/`
2. Review related feature documentation
3. Open a discussion issue
4. Contact the maintainers

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-17
