//! Learning System Demo
//!
//! This example demonstrates how the learning system adapts normalization decisions
//! based on observed patterns and performance.

use pattern_engine::{LearningConfig, LearningEngine, ProcessingContext};

fn main() {
    println!("=== Learning System Demo ===\n");
    println!();

    // Demo 1: Basic Learning
    demo_basic_learning();

    println!("\n{}\n", "=".repeat(80));

    // Demo 2: Adaptive Learning Over Time
    demo_adaptive_learning();

    println!("\n{}\n", "=".repeat(80));

    // Demo 3: Multi-Vendor Scenario
    demo_multi_vendor_learning();

    println!("\n{}\n", "=".repeat(80));

    // Demo 4: Performance Optimization
    demo_performance_optimization();
}

/// Demonstrates basic learning from processing context
fn demo_basic_learning() {
    println!("Demo 1: Basic Learning");
    println!("{}", "-".repeat(80));

    let mut engine = LearningEngine::new();
    let mut context = ProcessingContext::new();

    println!("Training the learning engine with 150 log lines...");

    // Simulate processing 150 lines with high normalization rate
    for _i in 0..150 {
        context.record_vendor("cisco_cube", 0.95);
        context.record_normalization("cisco_cube");
    }

    println!("Before learning:");
    println!("  Learning cycles: {}", engine.learning_cycles());
    println!("  Vendors learned: 0");

    engine.learn_from_context(&context);

    println!("\nAfter learning:");
    println!("  Learning cycles: {}", engine.learning_cycles());

    if let Some(rec) = engine.get_vendor_recommendation("cisco_cube") {
        println!("  Vendor: {}", rec.vendor_id);
        println!("  Avg confidence: {:.2}", rec.avg_detection_confidence);
        println!(
            "  Normalization rate: {:.2}%",
            rec.normalization_rate * 100.0
        );
        println!("  Prefers normalization: {}", rec.prefer_normalization);
        println!("  Confidence threshold: {:.2}", rec.confidence_threshold);
    }

    let summary = engine.summary();
    println!("\n{}", summary.to_string());
}

/// Demonstrates adaptive learning over multiple cycles
fn demo_adaptive_learning() {
    println!("Demo 2: Adaptive Learning Over Multiple Cycles");
    println!("{}", "-".repeat(80));

    let mut engine = LearningEngine::new();

    println!("Running 5 learning cycles with improving confidence...\n");

    for cycle in 1..=5 {
        let mut context = ProcessingContext::new();
        let confidence = 0.70 + (cycle as f32 * 0.05);

        println!(
            "Cycle {}: Processing 100 lines with confidence {:.2}",
            cycle, confidence
        );

        for _ in 0..100 {
            context.record_vendor("cisco_cube", confidence);
            if cycle > 2 {
                // Start normalizing after cycle 2
                context.record_normalization("cisco_cube");
            } else {
                context.record_fast_path("cisco_cube");
            }
        }

        engine.learn_from_context(&context);

        if let Some(rec) = engine.get_vendor_recommendation("cisco_cube") {
            println!(
                "  -> Learned confidence: {:.2}, Normalization rate: {:.1}%, Prefers norm: {}",
                rec.avg_detection_confidence,
                rec.normalization_rate * 100.0,
                rec.prefer_normalization
            );
        }
    }

    println!("\nFinal learning summary:");
    let summary = engine.summary();
    println!("{}", summary.to_string());
}

/// Demonstrates learning in multi-vendor scenarios
fn demo_multi_vendor_learning() {
    println!("Demo 3: Multi-Vendor Scenario Learning");
    println!("{}", "-".repeat(80));

    let mut engine = LearningEngine::new();
    let mut context = ProcessingContext::new();

    println!("Simulating multi-vendor log file...");
    println!("  50 CUBE logs (high normalization rate)");
    println!("  50 CUCM logs (moderate normalization rate)");
    println!("  50 Jabber logs (low normalization rate)\n");

    // CUBE: high normalization rate
    for _ in 0..50 {
        context.record_vendor("cisco_cube", 0.95);
        context.record_normalization("cisco_cube");
    }

    // CUCM: moderate normalization rate
    for _ in 0..50 {
        context.record_vendor("cisco_cucm", 0.90);
        if rand::random::<f32>() > 0.5 {
            context.record_normalization("cisco_cucm");
        } else {
            context.record_fast_path("cisco_cucm");
        }
    }

    // Jabber: low normalization rate
    for _ in 0..50 {
        context.record_vendor("cisco_jabber", 0.85);
        if rand::random::<f32>() > 0.8 {
            context.record_normalization("cisco_jabber");
        } else {
            context.record_fast_path("cisco_jabber");
        }
    }

    println!("Context summary:");
    let _ctx_summary = context.summary();
    println!("  Multi-vendor: {}", context.is_multi_vendor());
    println!("  Vendor diversity: {:.2}", context.vendor_diversity());
    println!("  Dominant vendor: {:?}", context.dominant_vendor());

    engine.learn_from_context(&context);

    println!("\nLearned recommendations:");

    for vendor_id in ["cisco_cube", "cisco_cucm", "cisco_jabber"] {
        if let Some(rec) = engine.get_vendor_recommendation(vendor_id) {
            println!("  {}:", vendor_id);
            println!(
                "    Normalization rate: {:.1}%",
                rec.normalization_rate * 100.0
            );
            println!("    Prefers normalization: {}", rec.prefer_normalization);
        }
    }
}

/// Demonstrates performance optimization through learning
fn demo_performance_optimization() {
    println!("Demo 4: Performance Optimization");
    println!("{}", "-".repeat(80));

    // Create two engines with different learning rates
    let config_slow = LearningConfig {
        min_samples: 100,
        learning_rate: 0.05,
        enable_confidence_tuning: true,
        enable_pattern_learning: true,
        enable_performance_optimization: true,
    };

    let config_fast = LearningConfig {
        min_samples: 100,
        learning_rate: 0.3,
        enable_confidence_tuning: true,
        enable_pattern_learning: true,
        enable_performance_optimization: true,
    };

    let mut engine_slow = LearningEngine::with_config(config_slow);
    let mut engine_fast = LearningEngine::with_config(config_fast);

    println!("Comparing learning rates: 0.05 (slow) vs 0.3 (fast)\n");

    let initial_threshold = engine_slow
        .performance_thresholds()
        .ambiguous_confidence_threshold;
    println!("Initial confidence threshold: {:.2}\n", initial_threshold);

    // Train both engines
    let mut context = ProcessingContext::new();
    for _ in 0..150 {
        context.record_vendor("cisco_cube", 0.90);
    }

    engine_slow.learn_from_context(&context);
    engine_fast.learn_from_context(&context);

    let slow_threshold = engine_slow
        .performance_thresholds()
        .ambiguous_confidence_threshold;
    let fast_threshold = engine_fast
        .performance_thresholds()
        .ambiguous_confidence_threshold;

    println!("After learning (input confidence: 0.90):");
    println!("  Slow learning rate (0.05):");
    println!("    New threshold: {:.2}", slow_threshold);
    println!("    Change: {:+.2}", slow_threshold - initial_threshold);
    println!("  Fast learning rate (0.3):");
    println!("    New threshold: {:.2}", fast_threshold);
    println!("    Change: {:+.2}", fast_threshold - initial_threshold);

    println!("\nObservation: Higher learning rate produces larger threshold adjustments.");
}

// Simple random number generation for demo
mod rand {
    use std::cell::Cell;

    thread_local! {
        static SEED: Cell<u32> = Cell::new(12345);
    }

    pub fn random<T: RandomValue>() -> T {
        T::random()
    }

    pub trait RandomValue {
        fn random() -> Self;
    }

    impl RandomValue for f32 {
        fn random() -> Self {
            SEED.with(|s| {
                let mut seed = s.get();
                seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
                s.set(seed);
                (seed as f32 / u32::MAX as f32).abs()
            })
        }
    }
}
