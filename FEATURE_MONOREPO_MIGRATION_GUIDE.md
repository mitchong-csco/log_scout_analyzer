# 📦 Migration Guide - Monolithic to Feature-Based

**Goal:** Migrate existing code from `lsp-server/` to feature crates  
**Time:** 6-8 hours  
**Risk:** Low (incremental migration possible)  

---

## 🎯 Migration Strategy

### **Approach: Incremental Migration**

We'll migrate features one at a time, ensuring everything works at each step.

**Order:**
1. Core utilities (already done ✅)
2. Pattern engine
3. Pattern loader
4. Quality system
5. LSP server integration

---

## 📋 Step-by-Step Migration

### **Step 1: Backup Current Code** (5 min)

```bash
cd c:\Users\mitchong\code\log_scout_analyzer

# Create backup branch
git checkout -b backup/pre-feature-migration
git push origin backup/pre-feature-migration

# Return to main work branch
git checkout -b feature/monorepo-migration
```

### **Step 2: Migrate Pattern Engine** (2 hours)

#### **2.1: Copy Files**

```bash
# Copy main pattern engine file
cp lsp-server/src/pattern_engine.rs crates/pattern-engine/src/engine_old.rs

# Review the file structure
code crates/pattern-engine/src/engine_old.rs
```

#### **2.2: Refactor Into Modules**

Split `pattern_engine.rs` into:
- `types.rs` - Pattern, Severity, etc (already created ✅)
- `matcher.rs` - PatternMatcher logic
- `engine.rs` - PatternEngine orchestrator
- `extractor.rs` - Parameter extraction

#### **2.3: Update Imports**

```rust
// Old (in pattern_engine.rs)
use crate::config::Config;
use crate::diagnostics::Diagnostic;

// New (in pattern-engine crate)
use log_scout_core::Config;
use log_scout_core::Diagnostic;
```

#### **2.4: Test**

```bash
cargo test -p pattern-engine
cargo clippy -p pattern-engine
```

### **Step 3: Migrate Pattern Loader** (2 hours)

#### **3.1: Copy Files**

```bash
cp lsp-server/src/pattern_loader.rs crates/pattern-loader/src/loader_old.rs
```

#### **3.2: Split Into Modules**

- `loader.rs` - Pattern loading (already created ✅)
- `override_manager.rs` - Override system (already created ✅)
- `marking.rs` - Pattern marking (already created ✅)
- `merge.rs` - Merge logic

#### **3.3: Update Dependencies**

```rust
// Use the new pattern-engine crate
use pattern_engine::{Pattern, PatternMatch};
```

#### **3.4: Test**

```bash
cargo test -p pattern-loader
```

### **Step 4: Migrate Quality System** (2 hours)

#### **4.1: Copy Files**

```bash
cp lsp-server/src/pattern_quality_evaluator.rs crates/quality-system/src/evaluator_old.rs
cp lsp-server/src/pattern_tester.rs crates/quality-system/src/tester_old.rs
cp lsp-server/src/quality_monitor.rs crates/quality-system/src/monitor_old.rs
```

#### **4.2: Refactor**

Integrate with new crates:
```rust
use pattern_engine::Pattern;
use pattern_loader::PatternLoader;
```

#### **4.3: Test**

```bash
cargo test -p quality-system
```

### **Step 5: Update LSP Server** (2 hours)

#### **5.1: Update Cargo.toml**

```bash
cd crates/lsp-server
```

Edit `Cargo.toml`:
```toml
[dependencies]
# Use workspace crates
log-scout-core = { path = "../core" }
pattern-engine = { path = "../pattern-engine" }
pattern-loader = { path = "../pattern-loader" }
quality-system = { path = "../quality-system" }

# External dependencies
tower-lsp = { workspace = true }
tokio = { workspace = true }
# ... etc
```

#### **5.2: Update Server Code**

Copy from `lsp-server/src/server.rs`:

```bash
cp lsp-server/src/server.rs crates/lsp-server/src/server.rs
cp lsp-server/src/main.rs crates/lsp-server/src/main.rs
```

Update imports:
```rust
// Old
use crate::pattern_engine::PatternEngine;
use crate::pattern_loader::PatternLoader;

// New
use pattern_engine::PatternEngine;
use pattern_loader::PatternLoader;
use quality_system::QualityEvaluator;
```

#### **5.3: Copy TagScout Integration**

```bash
# TagScout might need its own crate
mkdir -p crates/tagscout-integration
# Or keep in lsp-server for now
```

#### **5.4: Test**

```bash
cargo build -p lsp-server
cargo run -p lsp-server -- --version
```

### **Step 6: Integration Testing** (1 hour)

```bash
# Test entire workspace
cargo test --workspace

# Build release
cargo build --workspace --release

# Test LSP server
cd crates/lsp-server
cargo run --release
```

### **Step 7: Update VSCode Extension** (30 min)

Update `vscode-extension/src/lspClient.ts`:

```typescript
// Update path to LSP server binary
const serverPath = context.asAbsolutePath(
  path.join('target', 'release', 'log-scout-lsp-server')  
  // Path may change depending on workspace structure
);
```

Test extension:
```bash
cd vscode-extension
npm run compile
code --install-extension log-scout-analyzer.vsix
```

---

## 🔄 Migration Checklist

### **Pre-Migration**
- [ ] Create backup branch
- [ ] Document current structure
- [ ] Ensure all tests pass
- [ ] Tag current version

### **During Migration**
- [ ] Migrate core (done ✅)
- [ ] Migrate pattern-engine
- [ ] Test pattern-engine
- [ ] Migrate pattern-loader
- [ ] Test pattern-loader
- [ ] Migrate quality-system
- [ ] Test quality-system
- [ ] Update LSP server
- [ ] Test LSP server

### **Post-Migration**
- [ ] Full workspace test
- [ ] Integration test
- [ ] VSCode extension test
- [ ] Update documentation
- [ ] Update README
- [ ] Commit changes
- [ ] Create PR

---

## 🎯 Testing at Each Step

### **After Each Feature Migration**

```bash
# 1. Build the feature
cargo build -p <feature-name>

# 2. Run tests
cargo test -p <feature-name>

# 3. Check formatting
cargo fmt --check -p <feature-name>

# 4. Run clippy
cargo clippy -p <feature-name> -- -D warnings

# 5. Test workspace
cargo test --workspace
```

### **Final Integration Test**

```bash
# Build everything
cargo build --workspace --release

# Test everything
cargo test --workspace

# Test LSP server manually
./target/release/log-scout-lsp-server

# Test with VSCode
cd vscode-extension
npm run compile
code --install-extension log-scout-analyzer.vsix
```

---

## 🆘 Troubleshooting

### **Issue: Import Errors**

**Problem:** `use crate::pattern_engine::Pattern` not found

**Solution:**
```rust
// Change from
use crate::pattern_engine::Pattern;

// To
use pattern_engine::Pattern;
```

### **Issue: Circular Dependencies**

**Problem:** Crate A needs Crate B, Crate B needs Crate A

**Solution:**
- Extract common types to `core` crate
- Use traits for abstraction
- Refactor to remove circular dependency

### **Issue: Missing Functions**

**Problem:** Function moved to different crate

**Solution:**
1. Find where function moved
2. Add dependency to new crate
3. Update import

### **Issue: Tests Fail After Migration**

**Solution:**
```bash
# Run with output
cargo test -p <crate> -- --nocapture

# Check what changed
git diff HEAD~1

# Revert if needed
git checkout HEAD~1 -- crates/<crate>
```

---

## 📊 Migration Progress Tracking

### **Use This Template**

```markdown
## Migration Progress

### ✅ Completed
- [x] Core utilities
- [x] Pattern engine structure
- [ ] Pattern engine full migration
- [ ] Pattern loader
- [ ] Quality system
- [ ] LSP server update

### 🚧 In Progress
- Pattern engine: 60% (matcher.rs done, extractor.rs pending)

### ⏳ Pending
- Pattern loader
- Quality system
- LSP server integration

### ❌ Blocked
- None

### 📝 Notes
- Pattern engine tests passing
- Need to handle TagScout integration
```

---

## 🎓 Best Practices During Migration

### **1. Commit Frequently**

```bash
# After each module
git add crates/pattern-engine/
git commit -m "refactor(pattern-engine): migrate matcher module"

# After each feature
git add crates/pattern-loader/
git commit -m "refactor: complete pattern-loader migration"
```

### **2. Keep Tests Passing**

```bash
# Before commit
cargo test --workspace

# If tests fail, fix before committing
```

### **3. Update Documentation**

```rust
//! Pattern Engine - Core pattern matching
//!
//! Migrated from lsp-server/src/pattern_engine.rs
//! Date: 2026-02-17
```

### **4. Preserve Git History**

```bash
# Use git mv when moving files
git mv lsp-server/src/pattern_engine.rs crates/pattern-engine/src/engine_old.rs
```

---

## ✅ Post-Migration Validation

### **Validate Everything Works**

```bash
# 1. Clean build
cargo clean
cargo build --workspace --release

# 2. Full test suite
cargo test --workspace

# 3. LSP server runs
./target/release/log-scout-lsp-server --version

# 4. VSCode extension works
cd vscode-extension
npm run compile
code --install-extension log-scout-analyzer.vsix
# Test with a log file

# 5. CI workflows trigger
git push
# Watch GitHub Actions
```

### **Performance Check**

```bash
# Before migration (baseline)
time cargo test --workspace
# Record: X minutes

# After migration
time cargo test -p pattern-engine
time cargo test -p quality-system
# Should be faster!
```

---

## 🎉 Migration Complete!

### **Final Steps**

1. **Merge PR:**
   ```bash
   git checkout main
   git merge feature/monorepo-migration
   git push origin main
   ```

2. **Tag Release:**
   ```bash
   git tag -a v0.2.0 -m "feat: feature-based monorepo architecture"
   git push origin v0.2.0
   ```

3. **Update Documentation:**
   - Update README.md
   - Update CONTRIBUTING.md
   - Update build instructions

4. **Celebrate:** 🎉
   - 70% faster builds
   - Better organization
   - Scalable architecture

---

**Your migration is complete! Start enjoying feature-based development! 🚀**
