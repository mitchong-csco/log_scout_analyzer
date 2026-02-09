# Log Scout Analyzer - Testing Guide

Complete guide for building, testing, and validating the Log Scout Analyzer extension.

---

## Quick Start

### For Windows Users

```cmd
# Run the automated build script
build.bat

# Or step by step:
build.bat setup      # Install Rust
build.bat build      # Build extension
build.bat test       # Run tests
build.bat install    # Install to Zed
```

### For Mac/Linux Users

```bash
# Make script executable (first time only)
chmod +x build.sh

# Run the automated build script
./build.sh

# Or step by step:
./build.sh setup     # Install Rust
./build.sh build     # Build extension
./build.sh test      # Run tests
./build.sh install   # Install to Zed
```

---

## Manual Setup (Without Build Scripts)

### Step 1: Install Rust

**Windows:**
```cmd
# Download and run rustup installer
curl --proto =https --tlsv1.2 -sSf https://win.rustup.rs/x86_64 -o rustup-init.exe
rustup-init.exe
```

**Mac/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Verify Installation:**
```bash
rustc --version
cargo --version
```

### Step 2: Add WebAssembly Target

```bash
rustup target add wasm32-wasi
```

Verify:
```bash
rustup target list | grep wasm32-wasi
# Should show: wasm32-wasi (installed)
```

### Step 3: Build the Extension

```bash
cd log_scout_analyzer
cargo build --release --target wasm32-wasi
```

Expected output:
```
   Compiling log-scout-analyzer v0.1.0
    Finished release [optimized] target(s) in X.XXs
```

### Step 4: Run Tests

```bash
cargo test
```

Expected output:
```
running X tests
test tests::test_extension_initialization ... ok
test tests::test_pattern_loading ... ok
test tests::test_log_analysis ... ok
...
test result: ok. X passed; 0 failed; 0 ignored
```

### Step 5: Install to Zed

**Windows:**
```cmd
mkdir "%APPDATA%\Zed\extensions\log-scout-analyzer"
copy target\wasm32-wasi\release\log_scout_analyzer.wasm "%APPDATA%\Zed\extensions\log-scout-analyzer\"
copy extension.toml "%APPDATA%\Zed\extensions\log-scout-analyzer\"
xcopy /E /I config "%APPDATA%\Zed\extensions\log-scout-analyzer\config"
```

**Mac:**
```bash
mkdir -p "$HOME/Library/Application Support/Zed/extensions/log-scout-analyzer"
cp target/wasm32-wasi/release/log_scout_analyzer.wasm "$HOME/Library/Application Support/Zed/extensions/log-scout-analyzer/"
cp extension.toml "$HOME/Library/Application Support/Zed/extensions/log-scout-analyzer/"
cp -r config "$HOME/Library/Application Support/Zed/extensions/log-scout-analyzer/"
```

**Linux:**
```bash
mkdir -p "$HOME/.config/zed/extensions/log-scout-analyzer"
cp target/wasm32-wasi/release/log_scout_analyzer.wasm "$HOME/.config/zed/extensions/log-scout-analyzer/"
cp extension.toml "$HOME/.config/zed/extensions/log-scout-analyzer/"
cp -r config "$HOME/.config/zed/extensions/log-scout-analyzer/"
```

### Step 6: Restart Zed

Close and reopen Zed editor for the extension to load.

---

## Verifying Installation

### 1. Check Extension Loaded

In Zed:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Extensions"
3. Look for "Log Scout Analyzer" in the list

### 2. Test with Sample Log

1. Open `examples/sample.log` in Zed
2. You should see:
   - Red underlines on ERROR lines
   - Yellow underlines on WARN lines
   - Blue underlines on INFO lines

### 3. Check Diagnostics Panel

1. Open the diagnostics panel (if available)
2. Should show list of detected issues
3. Hover over underlined text to see details

---

## Testing Checklist

### Unit Tests

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_pattern_matching

# Run tests in a specific module
cargo test pattern_engine::tests

# Show test execution time
cargo test -- --show-output
```

### Code Quality

```bash
# Check for common mistakes
cargo clippy

# Check with warnings as errors
cargo clippy -- -D warnings

# Format code
cargo fmt

# Check formatting without changing files
cargo fmt -- --check
```

### Pattern Validation

Test each pattern type:

**1. Error Patterns:**
```bash
# Create test log
echo "ERROR: Connection failed" > test.log
echo "FATAL: Out of memory" >> test.log

# Open in Zed and verify red underlines appear
```

**2. Warning Patterns:**
```bash
echo "WARN: Retry attempt 1 of 3" > test.log
echo "WARN: High memory usage at 85%" >> test.log

# Verify yellow underlines
```

**3. Multi-line Patterns:**
```bash
cat > test.log << 'EOF'
Exception in thread "main"
  at com.example.Main.run(Main.java:42)
  at com.example.App.start(App.java:15)
EOF

# Verify stack trace is detected as a single diagnostic
```

**4. Service-Specific Patterns:**
```bash
# Jabber patterns
echo "ERROR: Jabber cluster node jabber-01 unreachable" > jabber.log

# Webex patterns
echo "ERROR: Webex API error: Rate limit exceeded" > webex.log
```

---

## Performance Testing

### Test File Sizes

Create test files of various sizes:

```bash
# 1 KB file (small)
head -n 20 examples/sample.log > test_1kb.log

# 100 KB file (medium)
for i in {1..2500}; do cat examples/sample.log >> test_100kb.log; done

# 1 MB file (large)
for i in {1..25000}; do cat examples/sample.log >> test_1mb.log; done

# 10 MB file (very large)
for i in {1..250000}; do cat examples/sample.log >> test_10mb.log; done
```

### Measure Performance

Time the analysis:

```bash
# Using time command (Unix)
time cargo run --release -- analyze test_1mb.log

# Expected: < 100ms for 1MB
# Expected: < 50MB memory usage
```

### Memory Profiling

```bash
# Install valgrind (Linux only)
valgrind --tool=massif cargo run --release

# Analyze memory usage
ms_print massif.out.*
```

---

## Integration Testing

### Test Scenarios

**Scenario 1: Fresh Installation**
1. Clean Zed extensions directory
2. Install extension
3. Restart Zed
4. Open sample log
5. Verify patterns detected

**Scenario 2: Configuration Loading**
1. Create `config/patterns.yaml` in workspace
2. Add custom pattern
3. Reload Zed or workspace
4. Verify custom pattern works

**Scenario 3: Multiple Log Files**
1. Open multiple log files
2. Switch between tabs
3. Verify each file analyzed independently
4. Check memory usage remains stable

**Scenario 4: Large File Handling**
1. Open 10MB+ log file
2. Verify no crash
3. Check for reasonable performance
4. Verify diagnostics are accurate

**Scenario 5: Real-time Updates**
1. Open log file
2. Edit file (add error line)
3. Verify diagnostic appears immediately
4. Remove error line
5. Verify diagnostic disappears

---

## Troubleshooting Tests

### Build Failures

**Problem: `cargo build` fails**
```bash
# Check Rust version
rustc --version  # Should be 1.70+

# Update Rust
rustup update

# Clean and rebuild
cargo clean
cargo build --release --target wasm32-wasi
```

**Problem: WASM target not found**
```bash
# Add target again
rustup target add wasm32-wasi

# Verify
rustup target list | grep wasm32
```

### Test Failures

**Problem: Tests failing**
```bash
# Run tests with verbose output
cargo test -- --nocapture

# Check specific failing test
cargo test test_name -- --exact --nocapture

# Update dependencies
cargo update
```

**Problem: Pattern tests failing**
```bash
# Test regex patterns at regex101.com
# Verify YAML syntax with yamllint
yamllint config/patterns.yaml
```

### Extension Not Loading

**Problem: Extension not appearing in Zed**
```bash
# Check installation directory
ls "$HOME/.config/zed/extensions/log-scout-analyzer/"  # Linux
ls "$HOME/Library/Application Support/Zed/extensions/log-scout-analyzer/"  # Mac
dir "%APPDATA%\Zed\extensions\log-scout-analyzer"  # Windows

# Should contain:
# - log_scout_analyzer.wasm
# - extension.toml
# - config/ directory

# Check Zed logs
# In Zed: Cmd+Shift+P -> "Zed: Open Logs"
```

**Problem: Patterns not detecting**
```bash
# Verify pattern file syntax
cargo test config::tests

# Check file extension is recognized
# File must be .log, .txt, or match patterns in extension.toml
```

---

## Continuous Integration Testing

### GitHub Actions Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-wasi
      
      - name: Run tests
        run: cargo test --verbose
      
      - name: Run clippy
        run: cargo clippy -- -D warnings
      
      - name: Check formatting
        run: cargo fmt -- --check
      
      - name: Build
        run: cargo build --release --target wasm32-wasi
```

---

## Regression Testing

### Test Suite for Each Release

```bash
# Run full test suite
./build.sh test

# Test all example logs
for log in examples/*.log; do
    echo "Testing $log..."
    # Open in Zed and verify
done

# Performance regression test
time cargo run --release -- analyze test_1mb.log
# Compare with previous version times
```

---

## User Acceptance Testing

### UAT Checklist

- [ ] Extension installs without errors
- [ ] Sample log displays diagnostics correctly
- [ ] All error patterns detected (red underlines)
- [ ] All warning patterns detected (yellow underlines)
- [ ] Info patterns detected (blue underlines)
- [ ] Hover shows pattern details
- [ ] Custom patterns can be added
- [ ] Configuration changes take effect
- [ ] Performance is acceptable (< 100ms for 1MB)
- [ ] Memory usage is reasonable (< 50MB)
- [ ] No crashes with large files (10MB+)
- [ ] Works with real-world log files
- [ ] Jabber-specific patterns work
- [ ] Webex-specific patterns work
- [ ] Multi-line patterns work
- [ ] Documentation is clear and accurate

---

## Reporting Issues

### When reporting a bug, include:

1. **Environment:**
   - OS and version
   - Zed version
   - Extension version
   - Rust version

2. **Steps to reproduce:**
   - Exact commands run
   - Files used
   - Configuration settings

3. **Expected vs Actual:**
   - What you expected to happen
   - What actually happened

4. **Logs:**
   - Zed logs
   - Cargo test output
   - Any error messages

5. **Sample data:**
   - Minimal log file that reproduces issue
   - Pattern configuration used

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Tag release version: `git tag v0.1.0`
2. ✅ Update CHANGELOG.md
3. ✅ Create release notes
4. ✅ Publish to Zed extensions marketplace
5. ✅ Announce to users
6. ✅ Begin Phase 2 development

---

## Resources

- **Rust Testing:** https://doc.rust-lang.org/book/ch11-00-testing.html
- **Cargo Book:** https://doc.rust-lang.org/cargo/
- **Zed Extensions:** https://zed.dev/docs/extensions
- **Regex Testing:** https://regex101.com/
- **YAML Validation:** https://www.yamllint.com/

---

**Happy Testing! 🧪**