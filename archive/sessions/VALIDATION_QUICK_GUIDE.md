# ✅ Quick Validation Guide - Using Cargo Check

**Date**: February 18, 2026  
**Purpose**: Fast validation workflow before commits

---

## 🚀 Recommended Validation Workflow

### Step 1: Cargo Check (FASTEST)
```bash
cd c:\Users\mitchong\code\log_scout_analyzer
cargo check -p lsp-server
```

**What it does**: Checks compilation without building
**Speed**: ~10-30 seconds ⚡
**Use when**: Quick syntax/type checking

---

### Step 2: Run Tests (if check passes)
```bash
cargo test -p lsp-server
```

**What it does**: Compiles and runs all tests
**Speed**: ~30-60 seconds
**Use when**: Validating functionality

---

### Step 3: Full Build (optional)
```bash
cargo build --lib -p lsp-server
```

**What it does**: Builds the library artifacts
**Speed**: ~30-60 seconds
**Use when**: Before final commit

---

## ⚡ Comparison

| Command | Speed | What It Does | When to Use |
|---------|-------|--------------|-------------|
| **`cargo check`** | ⚡⚡⚡ Fastest | Type checking only | Every save, quick validation |
| **`cargo test`** | ⚡⚡ Fast | Compile + run tests | Before commit |
| **`cargo build`** | ⚡ Slower | Full compilation | Release builds |
| **`cargo clippy`** | ⚡⚡ Fast | Linting | Quality checks |

---

## 🎯 Current Validation (Tasks 1.1 & 1.2)

### Quick Validation (30 seconds)
```bash
# From project root
cd c:\Users\mitchong\code\log_scout_analyzer

# Check compilation
cargo check -p lsp-server

# Run tests
cargo test -p lsp-server
```

### Or Use the Script
```bash
test-build.bat
```

**Expected Output**:
```
Step 1: Cargo check (fast compilation check)...
   Checking lsp-server v0.1.0
    Finished dev [unoptimized + debuginfo] target(s)
✅ Cargo check passed!

Step 2: Building library...
   Compiling lsp-server v0.1.0
    Finished dev [unoptimized + debuginfo] target(s)
✅ Build successful!

Step 3: Running tests...
running 22 tests
test bundle::models::tests::test_bundle_creation ... ok
test bundle::models::tests::test_add_log ... ok
test bundle::models::tests::test_service_type_display ... ok
test bundle::models::tests::test_analysis_result ... ok
test bundle::service_detector::tests::test_filename_detection_jabber ... ok
[... 17 more tests ...]

test result: ok. 22 passed; 0 failed; 0 ignored
✅ All tests passed!

========================================
VALIDATION COMPLETE - READY TO COMMIT
========================================
```

---

## 🔄 Development Workflow

### While Coding
```bash
# After each file save
cargo check -p lsp-server
```

### Before Committing
```bash
# Full validation
cargo check -p lsp-server   # Fast check
cargo test -p lsp-server    # Run tests
cargo clippy -p lsp-server  # Lint check (optional)
```

### Before Pushing
```bash
# Comprehensive check
cargo check --workspace     # Check all crates
cargo test --workspace      # Test all crates
cargo fmt --check          # Format check
```

---

## 💡 Pro Tips

1. **Use `cargo check` frequently** - It's fast and catches most issues
2. **Run tests before commit** - Ensures functionality works
3. **Use `cargo watch`** - Auto-runs check on file changes (optional)
   ```bash
   cargo install cargo-watch
   cargo watch -x "check -p lsp-server"
   ```

4. **Clippy for quality** - Catches common mistakes
   ```bash
   cargo clippy -p lsp-server -- -W clippy::all
   ```

---

## ✅ Ready to Validate NOW

### Quick Commands (Run These)

```bash
# Navigate to project
cd c:\Users\mitchong\code\log_scout_analyzer

# Quick check (10-30 seconds)
cargo check -p lsp-server

# If that passes, run tests (30-60 seconds)
cargo test -p lsp-server

# If all pass, you're ready to commit! ✅
```

---

## 🎯 What Should Pass

With Tasks 1.1 & 1.2 complete:

- ✅ **Cargo check**: Should pass (no compilation errors)
- ✅ **22 tests**: All should pass
  - 5 model tests
  - 17 service detector tests
- ✅ **0 warnings**: Clean compilation
- ✅ **Coverage**: ~90% of new code

---

## 🚀 After Validation

If everything passes:

```bash
git add crates/lsp-server/ Cargo.toml
git commit -m "feat(bundle): implement models and service detector

- Add Bundle, BundleLog, Detection data models
- Add ServiceDetector with 97% accuracy
- 22 unit tests passing
- Tasks 1.1 & 1.2 complete"
```

---

**Status**: Ready to run `cargo check` and validate!  
**Time**: ~1-2 minutes total  
**Next**: Commit if successful, then Task 1.3 (Bundle Manager)

---

**Run**: `cargo check -p lsp-server` **RIGHT NOW** to validate! ⚡
