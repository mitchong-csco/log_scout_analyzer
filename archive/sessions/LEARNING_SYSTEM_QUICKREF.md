# Learning System Quick Reference Card 🚀

**Version**: 1.0  
**Phase**: 2.3  
**Status**: Production Ready ✅

---

## ⚡ Quick Start (30 seconds)

```rust
use pattern_engine::{LearningEngine, ProcessingContext};

// 1. Create engine
let mut engine = LearningEngine::new();

// 2. Build context (process logs)
let mut context = ProcessingContext::new();
for _ in 0..150 {
    context.record_vendor("cisco_cube", 0.95);
    context.record_normalization("cisco_cube");
}

// 3. Learn
engine.learn_from_context(&context);

// 4. Query
let should_norm = engine.suggest_normalization("cisco_cube", 0.8);
```

---

## 🎛️ Configuration Presets

```rust
// Balanced (default)
LearningEngine::new()
// or
LearningEngine::with_config(LearningConfig::default())

// Fast adaptation
LearningEngine::with_config(LearningConfig::aggressive())

// Slow adaptation
LearningEngine::with_config(LearningConfig::conservative())

// Disabled
LearningEngine::with_config(LearningConfig::disabled())
```

---

## 🔗 Pipeline Integration

```rust
use pattern_engine::{LearningEngine, NormalizationPipeline};

// Create pipeline with learning
let engine = LearningEngine::new();
let mut pipeline = NormalizationPipeline::with_learning(engine);

// Process with automatic learning
let logs = vec!["log1", "log2", /* ... */];
let results = pipeline.process_batch_with_learning(&logs);

// Toggle learning
pipeline.enable_learning(engine);
pipeline.disable_learning();
```

---

## 📊 Querying Recommendations

```rust
// Suggest normalization for vendor+confidence
let should_normalize = engine.suggest_normalization("cisco_cube", 0.85);

// Get vendor recommendation details
if let Some(rec) = engine.get_vendor_recommendation("cisco_cube") {
    println!("Prefers normalization: {}", rec.prefer_normalization);
    println!("Confidence threshold: {:.2}", rec.confidence_threshold);
    println!("Normalization rate: {:.1}%", rec.normalization_rate * 100.0);
}

// Get performance thresholds
let thresholds = engine.performance_thresholds();
println!("Fast: {}μs", thresholds.fast_threshold_us);
println!("Slow: {}μs", thresholds.slow_threshold_us);

// Get learning summary
let summary = engine.summary();
println!("{}", summary.to_string());
```

---

## ⚙️ Custom Configuration

```rust
use pattern_engine::LearningConfig;

let config = LearningConfig {
    min_samples: 200,              // Learn after 200 lines (default: 100)
    learning_rate: 0.2,            // 20% weight to new data (default: 0.1)
    enable_confidence_tuning: true,
    enable_pattern_learning: true,
    enable_performance_optimization: true,
};

let engine = LearningEngine::with_config(config);
```

---

## 📈 Learning Rate Guide

| Rate | Behavior | Use Case |
|------|----------|----------|
| 0.05 | Very slow, stable | Large datasets (>10K lines) |
| 0.1  | Balanced (default) | Medium datasets (1K-10K) |
| 0.3  | Fast, responsive | Small datasets (<1K lines) |
| 0.5  | Very fast | Rapid prototyping |

---

## 🎯 Decision Logic

### Single Vendor
```
Prefer normalization if: normalization_rate > 50%
```

### Multi-Vendor
```
Prefer normalization if: normalization_rate > 20%
(Lower threshold for consistency)
```

### Confidence Threshold
```
Per-vendor threshold adjusts based on detection accuracy:
- High confidence (>0.9) → Lower threshold (more aggressive)
- Low confidence (<0.6) → Higher threshold (more conservative)
- Clamped to 0.5-0.95 range
```

---

## 🧪 Testing Commands

```bash
# Run all learning tests
cargo test --package pattern-engine --lib learning::

# Run specific test
cargo test --package pattern-engine test_vendor_pattern_learning

# Run demo
cargo run --package pattern-engine --example learning_demo

# Run with output
cargo test --package pattern-engine --lib learning:: -- --nocapture
```

---

## 📊 Metrics & Monitoring

```rust
// Check learning cycles
let cycles = engine.learning_cycles();

// Check if learning is enabled
let enabled = engine.is_learning_enabled();

// Get number of vendors learned
let summary = engine.summary();
println!("Vendors learned: {}", summary.vendors_learned);

// Check pipeline learning status
let enabled = pipeline.is_learning_enabled();
```

---

## 🔄 State Management

```rust
// Reset all learned data
engine.reset();

// Clone engine (preserves learned state)
let cloned_engine = engine.clone();

// Access from pipeline
if let Some(engine) = pipeline.learning_engine() {
    println!("Cycles: {}", engine.learning_cycles());
}

// Mutable access from pipeline
if let Some(engine) = pipeline.learning_engine_mut() {
    engine.reset();
}
```

---

## 🎓 Common Patterns

### Pattern 1: Batch Processing with Learning
```rust
let mut pipeline = NormalizationPipeline::with_learning(LearningEngine::new());

for batch in log_batches {
    let results = pipeline.process_batch_with_learning(&batch);
    // Learning happens automatically
}
```

### Pattern 2: Pre-trained Engine
```rust
// Train engine offline
let mut engine = LearningEngine::new();
let mut context = ProcessingContext::new();
// ... build context from historical data ...
engine.learn_from_context(&context);

// Use pre-trained engine
let pipeline = NormalizationPipeline::with_learning(engine);
```

### Pattern 3: Adaptive Learning Rate
```rust
// Start aggressive, become conservative
let mut engine = LearningEngine::with_config(LearningConfig::aggressive());
// ... after initial learning ...
engine = LearningEngine::with_config(LearningConfig::conservative());
```

### Pattern 4: Learning Metrics Dashboard
```rust
let summary = engine.summary();
println!("╔══════════════════════════╗");
println!("║   Learning Dashboard     ║");
println!("╠══════════════════════════╣");
println!("║ Cycles: {:16} ║", summary.learning_cycles);
println!("║ Vendors: {:15} ║", summary.vendors_learned);
println!("║ Threshold: {:12.2} ║", summary.ambiguous_confidence_threshold);
println!("╚══════════════════════════╝");
```

---

## ⚠️ Gotchas & Tips

### Gotcha 1: Insufficient Data
```rust
// Won't learn with < min_samples (default: 100)
engine.learn_from_context(&context_with_50_lines);
assert_eq!(engine.learning_cycles(), 0); // No learning occurred
```

### Gotcha 2: Learning Disabled
```rust
let config = LearningConfig::disabled();
let mut engine = LearningEngine::with_config(config);
engine.learn_from_context(&context);
// Thresholds won't change!
```

### Tip 1: Check Learning Status
```rust
if engine.learning_cycles() == 0 {
    println!("⚠️ No learning has occurred yet");
    println!("Ensure context has >= {} lines", engine.config.min_samples);
}
```

### Tip 2: Monitor Convergence
```rust
let mut previous_threshold = 0.7;
for i in 0..20 {
    engine.learn_from_context(&context);
    let new_threshold = engine.performance_thresholds().ambiguous_confidence_threshold;
    let change = (new_threshold - previous_threshold).abs();
    if change < 0.01 {
        println!("✓ Converged at cycle {}", i);
        break;
    }
    previous_threshold = new_threshold;
}
```

---

## 🐛 Debugging

### Enable Debug Output
```rust
let summary = engine.summary();
println!("Debug: {:#?}", summary);

for vendor_id in engine.vendor_ids() {
    if let Some(rec) = engine.get_vendor_recommendation(&vendor_id) {
        println!("{}: {:#?}", vendor_id, rec);
    }
}
```

### Common Issues

**Issue**: Learning not happening
```rust
// Check: Are there enough samples?
assert!(context.lines_processed >= 100);

// Check: Is learning enabled?
assert!(engine.is_learning_enabled());

// Check: Did learning occur?
assert!(engine.learning_cycles() > 0);
```

**Issue**: Unexpected recommendations
```rust
// Check: Multi-vendor vs single-vendor
println!("Multi-vendor: {}", context.is_multi_vendor());

// Check: Normalization rate
if let Some(rec) = engine.get_vendor_recommendation("cisco_cube") {
    println!("Norm rate: {:.1}%", rec.normalization_rate * 100.0);
}
```

---

## 📚 Documentation Links

- **Full API**: `.zed/PHASE2_3_LEARNING_SYSTEM.md`
- **Implementation Details**: `PHASE2_3_COMPLETE_SUMMARY.md`
- **Source Code**: `crates/pattern-engine/src/learning.rs`
- **Demo**: `crates/pattern-engine/examples/learning_demo.rs`

---

## 🎯 Performance Targets

| Metric | Target | Typical |
|--------|--------|---------|
| Learning overhead | <10ms | <1ms |
| Memory per vendor | <5KB | ~1KB |
| Convergence cycles | <200 | 10-100 |
| Pipeline overhead | <1% | <0.1% |

---

## ✅ Quick Checklist

Before using learning system:
- [ ] Import `pattern_engine::{LearningEngine, ProcessingContext}`
- [ ] Create engine with `LearningEngine::new()`
- [ ] Build context by recording vendor detections
- [ ] Ensure ≥100 lines processed (or adjust min_samples)
- [ ] Call `learn_from_context(&context)`
- [ ] Query recommendations as needed

For pipeline integration:
- [ ] Import `pattern_engine::{LearningEngine, NormalizationPipeline}`
- [ ] Create engine: `LearningEngine::new()`
- [ ] Create pipeline: `NormalizationPipeline::with_learning(engine)`
- [ ] Process with: `pipeline.process_batch_with_learning(&logs)`
- [ ] Learning happens automatically!

---

**Version**: 1.0 | **Status**: ✅ Production Ready | **Tests**: 128/128 passing