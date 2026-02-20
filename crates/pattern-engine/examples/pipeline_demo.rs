//! Pipeline Demo - Demonstrates the progressive normalization pipeline
//!
//! This example shows how to use the NormalizationPipeline to process logs
//! from multiple vendors, demonstrating both fast path and slow path processing.
//!
//! Run with:
//! ```bash
//! cargo run --example pipeline_demo
//! ```

use pattern_engine::{NormalizationPipeline, ProcessingContext, ProcessingMode, ProcessingResult};

fn main() {
    println!("🚀 Log Scout Analyzer - Pipeline Demo\n");
    println!("{}", "=".repeat(60));

    // Demo 1: Single vendor scenario (fast path preferred)
    demo_single_vendor();

    println!("\n{}\n", "=".repeat(60));

    // Demo 2: Multi-vendor scenario (normalization needed)
    demo_multi_vendor();

    println!("\n{}\n", "=".repeat(60));

    // Demo 3: Processing modes
    demo_processing_modes();

    println!("\n{}\n", "=".repeat(60));

    // Demo 4: Batch processing with statistics
    demo_batch_processing();
}

fn demo_single_vendor() {
    println!("📊 Demo 1: Single Vendor Scenario (CUBE logs)");
    println!("{}", "-".repeat(60));

    let pipeline = NormalizationPipeline::new();

    let cube_logs = vec![
        "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE sip:user@example.com SIP/2.0",
        "Jan 15 10:30:01.456: %SIP-6-200: ccsipDisplayMsg: Sent SIP/2.0 200 OK",
        "Jan 15 10:30:02.789: %SIP-6-BYE: ccsipDisplayMsg: Received BYE sip:user@example.com SIP/2.0",
    ];

    println!("Processing {} CUBE log lines...\n", cube_logs.len());

    for (i, log) in cube_logs.iter().enumerate() {
        let result = pipeline.process(log);
        print_result(i + 1, &result);
    }

    println!("\n✅ Single vendor = Fast path processing!");
}

fn demo_multi_vendor() {
    println!("📊 Demo 2: Multi-Vendor Scenario");
    println!("{}", "-".repeat(60));

    let pipeline = NormalizationPipeline::new();

    let mixed_logs = vec![
        (
            "CUBE",
            "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE",
        ),
        (
            "CUCM",
            "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|LocalAddr=10.1.1.1:5060",
        ),
        (
            "Jabber",
            "2024-01-15 10:30:00,123 <MAIN> <thread-1> |SIP_MSG_RECV| INVITE sip:user@example.com",
        ),
        (
            "CUC",
            "[CUC-SIP.Stack] INVITE sip:voicemail@example.com SIP/2.0",
        ),
        (
            "CUBE",
            "Jan 15 10:30:01.456: %SIP-6-200: ccsipDisplayMsg: Sent SIP/2.0 200 OK",
        ),
    ];

    println!(
        "Processing {} logs from multiple vendors...\n",
        mixed_logs.len()
    );

    let mut context = ProcessingContext::new();
    for (i, (vendor, log)) in mixed_logs.iter().enumerate() {
        let result = pipeline.process_with_context(log, &context);
        print_result_with_vendor(i + 1, vendor, &result);

        // Update context
        if let ProcessingResult::FastPath { vendor, .. }
        | ProcessingResult::Normalized { vendor, .. } = &result
        {
            context.record_vendor(&vendor.vendor_id, vendor.confidence);
        }
    }

    println!("\n✅ Multi-vendor = Pipeline adapts to use normalization!");
    println!("\n📈 Vendor Statistics:");
    println!("   Unique vendors: {}", context.vendor_ids().len());
    println!("   Diversity: {:.2}", context.vendor_diversity());
}

fn demo_processing_modes() {
    println!("📊 Demo 3: Processing Modes");
    println!("{}", "-".repeat(60));

    let log = "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE";

    // Fast Only Mode
    println!("Mode: FastOnly");
    let pipeline = NormalizationPipeline::with_mode(ProcessingMode::FastOnly);
    let result = pipeline.process(log);
    match result {
        ProcessingResult::FastPath { .. } => println!("   ✅ Fast path (as expected)"),
        ProcessingResult::Normalized { .. } => println!("   ❌ Normalized (unexpected)"),
        ProcessingResult::Unknown { .. } => println!("   ⚠️  Unknown"),
    }

    // Normalize Always Mode
    println!("\nMode: NormalizeAlways");
    let pipeline = NormalizationPipeline::with_mode(ProcessingMode::NormalizeAlways);
    let result = pipeline.process(log);
    match result {
        ProcessingResult::FastPath { .. } => println!("   ❌ Fast path (unexpected)"),
        ProcessingResult::Normalized { .. } => println!("   ✅ Normalized (as expected)"),
        ProcessingResult::Unknown { .. } => println!("   ⚠️  Unknown"),
    }

    // Adaptive Mode
    println!("\nMode: Adaptive (default)");
    let pipeline = NormalizationPipeline::with_mode(ProcessingMode::Adaptive);
    let result = pipeline.process(log);
    match result {
        ProcessingResult::FastPath { .. } => println!("   ✅ Fast path (single vendor detected)"),
        ProcessingResult::Normalized { .. } => println!("   ✅ Normalized (multi-vendor detected)"),
        ProcessingResult::Unknown { .. } => println!("   ⚠️  Unknown"),
    }
}

fn demo_batch_processing() {
    println!("📊 Demo 4: Batch Processing with Statistics");
    println!("{}", "-".repeat(60));

    let pipeline = NormalizationPipeline::new();

    let logs = vec![
        "Jan 15 10:30:00.123: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE",
        "Jan 15 10:30:00.456: %SIP-6-INVITE: ccsipDisplayMsg: Received INVITE",
        "2024-01-15 10:30:00,123 |SIPTcp|AppId=Cisco CallManager|LocalAddr=10.1.1.1:5060",
        "Jan 15 10:30:01.789: %SIP-6-200: ccsipDisplayMsg: Sent SIP/2.0 200 OK",
        "2024-01-15 10:30:01,456 <MAIN> <thread-1> |SIP_MSG_RECV| INVITE sip:user@example.com",
        "[CUC-SIP.Stack] INVITE sip:voicemail@example.com SIP/2.0",
        "Jan 15 10:30:02.123: %SIP-6-BYE: ccsipDisplayMsg: Received BYE",
        "This is not a valid log line",
        "2024-01-15 10:30:02,789 |SIPTcp|AppId=Cisco CallManager|RemoteAddr=10.1.1.100:5060",
        "Jan 15 10:30:03.456: %SIP-6-200: ccsipDisplayMsg: Sent SIP/2.0 200 OK",
    ];

    println!("Processing batch of {} log lines...\n", logs.len());

    let results = pipeline.process_batch(&logs);

    // Count results by type
    let mut fast_path_count = 0;
    let mut normalized_count = 0;
    let mut unknown_count = 0;
    let mut total_time_us = 0u64;

    for result in &results {
        match result {
            ProcessingResult::FastPath {
                processing_time_us, ..
            } => {
                fast_path_count += 1;
                total_time_us += processing_time_us;
            }
            ProcessingResult::Normalized {
                processing_time_us, ..
            } => {
                normalized_count += 1;
                total_time_us += processing_time_us;
            }
            ProcessingResult::Unknown {
                processing_time_us, ..
            } => {
                unknown_count += 1;
                total_time_us += processing_time_us;
            }
        }
    }

    println!("📊 Processing Summary:");
    println!("   Total lines:     {}", logs.len());
    println!(
        "   Fast path:       {} ({:.1}%)",
        fast_path_count,
        (fast_path_count as f32 / logs.len() as f32) * 100.0
    );
    println!(
        "   Normalized:      {} ({:.1}%)",
        normalized_count,
        (normalized_count as f32 / logs.len() as f32) * 100.0
    );
    println!(
        "   Unknown:         {} ({:.1}%)",
        unknown_count,
        (unknown_count as f32 / logs.len() as f32) * 100.0
    );
    println!("\n⚡ Performance:");
    println!("   Total time:      {} μs", total_time_us);
    println!(
        "   Avg per line:    {} μs",
        total_time_us / logs.len() as u64
    );

    // Pipeline stats
    let stats = pipeline.stats();
    println!("\n🔧 Pipeline Configuration:");
    println!("   Mode:            {:?}", stats.mode);
    println!("   Normalizers:     {}", stats.normalizers_count);
    println!("   Sample size:     {}", stats.sample_size);
    println!(
        "   Multi-vendor threshold: {:.2}",
        stats.multi_vendor_threshold
    );
}

fn print_result(line_num: usize, result: &ProcessingResult) {
    match result {
        ProcessingResult::FastPath {
            vendor,
            processing_time_us,
            ..
        } => {
            println!(
                "   Line {}: ⚡ Fast Path - {} (confidence: {:.2}, {}μs)",
                line_num, vendor.vendor_id, vendor.confidence, processing_time_us
            );
        }
        ProcessingResult::Normalized {
            vendor,
            event,
            processing_time_us,
        } => {
            println!(
                "   Line {}: 🔄 Normalized - {} → {} ({}μs)",
                line_num, vendor.vendor_id, event.event_type, processing_time_us
            );
        }
        ProcessingResult::Unknown {
            processing_time_us, ..
        } => {
            println!(
                "   Line {}: ❓ Unknown ({}μs)",
                line_num, processing_time_us
            );
        }
    }
}

fn print_result_with_vendor(line_num: usize, expected_vendor: &str, result: &ProcessingResult) {
    match result {
        ProcessingResult::FastPath {
            vendor,
            processing_time_us,
            ..
        } => {
            println!(
                "   Line {}: [{}] ⚡ Fast Path - {} ({}μs)",
                line_num, expected_vendor, vendor.vendor_id, processing_time_us
            );
        }
        ProcessingResult::Normalized {
            vendor,
            event,
            processing_time_us,
        } => {
            println!(
                "   Line {}: [{}] 🔄 Normalized - {} → {} ({}μs)",
                line_num, expected_vendor, vendor.vendor_id, event.event_type, processing_time_us
            );
        }
        ProcessingResult::Unknown {
            processing_time_us, ..
        } => {
            println!(
                "   Line {}: [{}] ❓ Unknown ({}μs)",
                line_num, expected_vendor, processing_time_us
            );
        }
    }
}
