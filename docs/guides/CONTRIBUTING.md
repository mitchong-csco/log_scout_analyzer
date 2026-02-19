# Contributing to Log Scout Analyzer

Thank you for your interest in contributing to Log Scout Analyzer! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pattern Contribution](#pattern-contribution)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/log-scout-analyzer.git
   cd log-scout-analyzer
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original/log-scout-analyzer.git
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## Development Setup

### Prerequisites

- **Rust** (1.70 or later): Install from [rustup.rs](https://rustup.rs/)
- **Zed Editor**: Latest version recommended
- **Git**: For version control
- **wasm32-wasi target**: `rustup target add wasm32-wasi`

### Initial Setup

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-wasi

# Clone and build
git clone https://github.com/YOUR_USERNAME/log-scout-analyzer.git
cd log-scout-analyzer
cargo build

# Run tests
cargo test
```

### IDE Setup

#### VS Code

Install these extensions:
- rust-analyzer
- Better TOML
- YAML

#### Zed

The project includes appropriate settings for Zed development.

## Project Structure

```
log_scout_analyzer/
├── src/
│   ├── lib.rs              # Extension entry point
│   ├── pattern_engine.rs   # Core pattern matching
│   ├── language_server.rs  # LSP implementation
│   ├── diagnostics.rs      # Diagnostic handling
│   └── config.rs           # Configuration management
├── config/
│   ├── patterns.yaml       # General patterns
│   ├── jabber.yaml         # Jabber patterns
│   └── webex.yaml          # Webex patterns
├── tests/                  # Integration tests
├── examples/               # Example log files
├── extension.toml          # Extension manifest
├── Cargo.toml              # Rust dependencies
└── README.md
```

## How to Contribute

### Types of Contributions

1. **Bug Fixes**: Fix issues and improve stability
2. **New Features**: Add new functionality
3. **Pattern Definitions**: Contribute log patterns
4. **Documentation**: Improve docs and examples
5. **Tests**: Add test coverage
6. **Performance**: Optimize code

### Finding Issues to Work On

- Check [Issues](https://github.com/yourusername/log-scout-analyzer/issues)
- Look for `good-first-issue` labels for beginners
- Check `help-wanted` labels for community contributions
- Propose new features in discussions

## Coding Standards

### Rust Style Guide

We follow the [Rust Style Guide](https://doc.rust-lang.org/nightly/style-guide/):

- Use `rustfmt` for formatting: `cargo fmt`
- Use `clippy` for linting: `cargo clippy`
- Write idiomatic Rust code
- Prefer explicit types when it improves clarity
- Document public APIs with doc comments

### Code Quality

```rust
// Good: Clear, documented, tested
/// Processes a log line and returns detected patterns
///
/// # Arguments
/// * `line` - The log line to process
/// * `line_number` - The 1-based line number
///
/// # Returns
/// Vector of pattern detections
pub fn process_line(&self, line: &str, line_number: usize) -> Vec<Detection> {
    // Implementation
}

// Bad: Unclear, undocumented
pub fn proc(l: &str, n: usize) -> Vec<Detection> {
    // Implementation
}
```

### Error Handling

- Use `Result<T, E>` for fallible operations
- Use `thiserror` for custom errors
- Provide meaningful error messages
- Don't panic in library code

```rust
// Good
pub fn load_pattern(path: &str) -> Result<Pattern, PatternError> {
    let content = fs::read_to_string(path)
        .map_err(|e| PatternError::ConfigError(format!("Failed to read {}: {}", path, e)))?;
    parse_pattern(&content)
}

// Bad
pub fn load_pattern(path: &str) -> Pattern {
    let content = fs::read_to_string(path).unwrap();
    parse_pattern(&content).unwrap()
}
```

## Testing Guidelines

### Unit Tests

- Write tests for all public functions
- Test edge cases and error conditions
- Use descriptive test names

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_matches_error_line() {
        let pattern = Pattern::new("ERROR: (.*)").unwrap();
        assert!(pattern.matches("ERROR: Connection failed"));
        assert!(!pattern.matches("INFO: All good"));
    }

    #[test]
    fn test_pattern_with_empty_string() {
        let pattern = Pattern::new("ERROR").unwrap();
        assert!(!pattern.matches(""));
    }
}
```

### Integration Tests

Place integration tests in `tests/` directory:

```rust
// tests/pattern_engine_test.rs
use log_scout_analyzer::PatternEngine;

#[test]
fn test_full_log_analysis() {
    let engine = PatternEngine::new(/* ... */);
    let log = "ERROR: test\nWARN: test\nINFO: test";
    let results = engine.analyze(log);
    assert_eq!(results.len(), 3);
}
```

### Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_pattern_matches

# Run with output
cargo test -- --nocapture

# Run with coverage (requires tarpaulin)
cargo tarpaulin --out Html
```

## Pattern Contribution

### Adding New Patterns

Patterns are defined in YAML files in the `config/` directory.

#### Pattern Structure

```yaml
- id: "unique-pattern-id"           # Unique identifier
  name: "Human Readable Name"        # Display name
  description: "Detailed description" # What it detects
  pattern: "regex pattern here"      # Regular expression
  severity: error                    # error|warning|info|hint
  category: "category-name"          # Group patterns
  service: "service-name"            # Optional: jabber|webex
  tags: ["tag1", "tag2"]             # Classification tags
  action: "Suggested fix"            # Remediation advice
  enabled: true                      # Active status
```

#### Pattern Guidelines

1. **ID**: Use kebab-case, prefix with service name if applicable
2. **Pattern**: Test regex thoroughly, escape special characters
3. **Severity**: Choose appropriate level
4. **Description**: Clear, actionable description
5. **Action**: Provide specific remediation steps

#### Testing Patterns

1. Add test log samples to `examples/`
2. Verify pattern matches expected lines
3. Check for false positives
4. Document edge cases

#### Example Pattern Contribution

```yaml
# Good pattern
- id: "jabber-connection-timeout"
  name: "Jabber Connection Timeout"
  description: "Detects connection timeouts to Jabber servers"
  pattern: "Connection timeout to ([\\w\\.:-]+)"
  severity: error
  category: "network"
  service: "jabber"
  tags: ["connectivity", "timeout"]
  action: "Verify network connectivity and firewall rules"
  enabled: true
```

### Pattern Testing Checklist

- [ ] Pattern ID is unique
- [ ] Pattern regex is valid
- [ ] Matches expected log lines
- [ ] No false positives on test data
- [ ] Description is clear
- [ ] Action provides useful guidance
- [ ] Added to appropriate YAML file
- [ ] Documented edge cases

## Submitting Changes

### Before Submitting

1. **Update your branch**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:
   ```bash
   cargo test
   cargo clippy
   cargo fmt --check
   ```

3. **Update documentation** if needed

4. **Write clear commit messages**:
   ```
   Add connection timeout pattern for Jabber
   
   - Detects timeout errors in Jabber logs
   - Includes suggested remediation
   - Adds test cases for validation
   
   Fixes #123
   ```

### Pull Request Process

1. **Push to your fork**:
   ```bash
   git push origin feature/my-new-feature
   ```

2. **Create Pull Request** on GitHub:
   - Use descriptive title
   - Reference related issues
   - Describe changes clearly
   - Add screenshots if applicable

3. **PR Template**:
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Pattern addition
   - [ ] Documentation
   
   ## Testing
   - [ ] Tests pass locally
   - [ ] New tests added
   - [ ] Manual testing performed
   
   ## Checklist
   - [ ] Code follows style guide
   - [ ] Documentation updated
   - [ ] No breaking changes
   ```

## Review Process

### What to Expect

1. **Initial Review**: Within 2-3 days
2. **Feedback**: Reviewers may request changes
3. **Iteration**: Address feedback and update PR
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer will merge when ready

### Responding to Feedback

- Be open to suggestions
- Ask questions if unclear
- Make requested changes promptly
- Update PR with new commits

### After Merge

- Delete your branch (local and remote)
- Update your fork
- Celebrate! 🎉

## Additional Resources

- [Rust Book](https://doc.rust-lang.org/book/)
- [Zed Extension API](https://zed.dev/docs/extensions)
- [Regex Testing](https://regex101.com/)
- [YAML Validator](https://www.yamllint.com/)

## Questions?

- Open an [issue](https://github.com/yourusername/log-scout-analyzer/issues)
- Start a [discussion](https://github.com/yourusername/log-scout-analyzer/discussions)
- Join our community chat

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Log Scout Analyzer!** 🚀