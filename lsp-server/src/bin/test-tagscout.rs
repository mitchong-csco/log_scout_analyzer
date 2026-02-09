//! TagScout Connection Test Utility
//!
//! A simple CLI tool to test MongoDB connectivity and pattern fetching.

use log_scout_lsp_server::tagscout::{SyncMode, SyncService, SyncServiceConfig, TagScoutClient};
use std::time::Instant;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into()),
        )
        .init();

    println!("╔════════════════════════════════════════════════════╗");
    println!("║     TagScout MongoDB Connection Test              ║");
    println!("╚════════════════════════════════════════════════════╝\n");

    // Test 1: Basic MongoDB Connection
    println!("📡 Test 1: MongoDB Connection");
    println!("─────────────────────────────────");
    let start = Instant::now();

    match TagScoutClient::new().await {
        Ok(client) => {
            println!("✓ Client created successfully");

            match client.test_connection().await {
                Ok(_) => {
                    println!("✓ MongoDB connection successful");
                    println!("⏱  Time: {:?}\n", start.elapsed());

                    // Test 2: Fetch Statistics
                    println!("📊 Test 2: Library Statistics");
                    println!("─────────────────────────────────");
                    match client.get_statistics().await {
                        Ok(stats) => {
                            println!("✓ Statistics retrieved:");
                            println!("  • Total annotations: {}", stats.total_annotations);
                            println!("  • Active annotations: {}", stats.active_annotations);
                            println!("  • Unique products: {}", stats.unique_products);
                            println!("  • Unique categories: {}", stats.unique_categories);
                            println!("\n  Products:");
                            for (i, product) in stats.products.iter().take(10).enumerate() {
                                println!("    {}. {}", i + 1, product);
                            }
                            if stats.products.len() > 10 {
                                println!("    ... and {} more", stats.products.len() - 10);
                            }
                            println!("\n  Categories:");
                            for (i, category) in stats.categories.iter().take(10).enumerate() {
                                println!("    {}. {}", i + 1, category);
                            }
                            if stats.categories.len() > 10 {
                                println!("    ... and {} more", stats.categories.len() - 10);
                            }
                            println!();
                        }
                        Err(e) => {
                            println!("✗ Failed to get statistics: {}\n", e);
                        }
                    }

                    // Test 3: Fetch Sample Patterns
                    println!("📝 Test 3: Sample Pattern Fetch");
                    println!("─────────────────────────────────");
                    let fetch_start = Instant::now();
                    match client.fetch_all_annotations().await {
                        Ok(annotations) => {
                            println!("✓ Fetched {} annotations", annotations.len());
                            println!("⏱  Time: {:?}", fetch_start.elapsed());

                            if !annotations.is_empty() {
                                println!("\n  Sample annotation:");
                                let sample = &annotations[0];
                                println!("    • Name: {}", sample.name);
                                println!("    • Severity: {}", sample.severity);
                                println!("    • Category: {}", sample.category);
                                println!("    • Product: {}", sample.product);
                                println!(
                                    "    • Pattern: {}...",
                                    if sample.pattern.len() > 50 {
                                        &sample.pattern[..50]
                                    } else {
                                        &sample.pattern
                                    }
                                );
                            }
                            println!();
                        }
                        Err(e) => {
                            println!("✗ Failed to fetch annotations: {}\n", e);
                        }
                    }
                }
                Err(e) => {
                    println!("✗ MongoDB connection failed: {}", e);
                    println!("⏱  Time: {:?}\n", start.elapsed());
                }
            }
        }
        Err(e) => {
            println!("✗ Failed to create client: {}", e);
            println!("⏱  Time: {:?}\n", start.elapsed());
        }
    }

    // Test 4: Sync Service with Cache
    println!("🔄 Test 4: Sync Service Integration");
    println!("─────────────────────────────────");
    let sync_start = Instant::now();

    let mut config = SyncServiceConfig::default();
    config.sync_mode = SyncMode::OnlineFirst;
    config.cache_dir = std::env::temp_dir().join(".tagscout_test_cache");

    match SyncService::new(config).await {
        Ok(mut service) => {
            println!("✓ Sync service created");

            match service.initialize().await {
                Ok(result) => {
                    println!("✓ Sync completed:");
                    println!("  • Patterns fetched: {}", result.patterns_fetched);
                    println!("  • Patterns cached: {}", result.patterns_cached);
                    println!("  • From cache: {}", result.from_cache);
                    println!("  • Duration: {}ms", result.duration_ms);

                    if !result.warnings.is_empty() {
                        println!("  • Warnings:");
                        for warning in &result.warnings {
                            println!("    - {}", warning);
                        }
                    }

                    // Get patterns
                    match service.get_patterns().await {
                        Ok(patterns) => {
                            println!("✓ Retrieved {} LSP patterns", patterns.len());

                            if !patterns.is_empty() {
                                println!("\n  Sample LSP pattern:");
                                let sample = &patterns[0];
                                println!("    • ID: {}", sample.id);
                                println!("    • Name: {}", sample.name);
                                println!("    • Severity: {:?}", sample.severity);
                                println!("    • Category: {}", sample.category);
                                println!("    • Enabled: {}", sample.enabled);
                            }
                        }
                        Err(e) => {
                            println!("✗ Failed to get patterns: {}", e);
                        }
                    }

                    // Get cache stats
                    if let Some(stats) = service.get_cache_stats().await {
                        println!("\n  Cache statistics:");
                        println!("    • Pattern count: {}", stats.pattern_count);
                        println!("    • Age: {} seconds", stats.age_seconds);
                        println!("    • Expired: {}", stats.is_expired);
                        println!("    • TTL: {} seconds", stats.ttl_seconds);
                    }

                    println!("⏱  Total time: {:?}\n", sync_start.elapsed());
                }
                Err(e) => {
                    println!("✗ Sync failed: {}", e);
                    println!("⏱  Time: {:?}\n", sync_start.elapsed());
                }
            }
        }
        Err(e) => {
            println!("✗ Failed to create sync service: {}", e);
            println!("⏱  Time: {:?}\n", sync_start.elapsed());
        }
    }

    // Test 5: Offline Mode
    println!("💾 Test 5: Offline Mode (Cache Only)");
    println!("─────────────────────────────────");
    let offline_start = Instant::now();

    let mut offline_config = SyncServiceConfig::default();
    offline_config.sync_mode = SyncMode::OfflineOnly;
    offline_config.cache_dir = std::env::temp_dir().join(".tagscout_test_cache");

    match SyncService::new(offline_config).await {
        Ok(mut service) => {
            println!("✓ Offline sync service created");

            match service.initialize().await {
                Ok(result) => {
                    println!("✓ Loaded from cache:");
                    println!("  • Patterns: {}", result.patterns_fetched);
                    println!("  • Duration: {}ms", result.duration_ms);
                    println!("⏱  Time: {:?}\n", offline_start.elapsed());
                }
                Err(e) => {
                    println!("✗ Cache load failed: {}", e);
                    println!("  (This is expected if no cache exists yet)");
                    println!("⏱  Time: {:?}\n", offline_start.elapsed());
                }
            }
        }
        Err(e) => {
            println!("✗ Failed to create offline service: {}", e);
            println!("⏱  Time: {:?}\n", offline_start.elapsed());
        }
    }

    println!("╔════════════════════════════════════════════════════╗");
    println!("║              Test Suite Complete                   ║");
    println!("╚════════════════════════════════════════════════════╝");
}
