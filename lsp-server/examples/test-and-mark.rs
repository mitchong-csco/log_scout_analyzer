/// Example: Test patterns and automatically mark ones with issues
///
/// This example shows the complete workflow:
/// 1. Load patterns and test cases
/// 2. Run tests via PatternTester
/// 3. Analyze results to find issues
/// 4. Automatically mark failing patterns for review
/// 5. Export marked patterns to .log-scout/pattern-overrides.json
///
/// Usage:
///   cargo run --example test-and-mark -- \
///     --patterns patterns.json \
///     --tests test-cases.json \
///     --output .log-scout/pattern-overrides.json
use log_scout_lsp_server::pattern_tester::{
    create_override_file_from_patterns, export_overrides_to_file, mark_patterns_from_test_results,
    PatternTester, TestCase,
};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn main() {
    // Parse arguments
    let args: Vec<String> = std::env::args().collect();
    let mut patterns_file = "patterns.json".to_string();
    let mut test_cases_file = "test-cases.json".to_string();
    let mut output_file = ".log-scout/pattern-overrides.json".to_string();

    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--patterns" => {
                i += 1;
                if i < args.len() {
                    patterns_file = args[i].clone();
                }
            }
            "--tests" => {
                i += 1;
                if i < args.len() {
                    test_cases_file = args[i].clone();
                }
            }
            "--output" => {
                i += 1;
                if i < args.len() {
                    output_file = args[i].clone();
                }
            }
            _ => {}
        }
        i += 1;
    }

    println!("🧪 Pattern Testing & Marking Example");
    println!("=====================================\n");

    // Load patterns (simplified for example)
    println!("📦 Loading patterns from {}...", patterns_file);
    let patterns = load_patterns_from_file(&patterns_file);
    println!("   ✓ Loaded {} patterns\n", patterns.len());

    // Load test cases
    println!("📋 Loading test cases from {}...", test_cases_file);
    let test_cases_map = load_test_cases_from_file(&test_cases_file);
    println!("   ✓ Loaded test cases\n");

    // Create tester
    let tester = PatternTester::new(patterns);

    // Run tests
    println!("🚀 Running tests...\n");
    let mut results = Vec::new();
    let mut total_tests = 0;
    let mut failed_tests = 0;

    for (pattern_id, test_cases) in &test_cases_map {
        let result = tester.test_pattern(pattern_id, test_cases.clone());
        total_tests += result.total_cases;
        if !result.passed {
            failed_tests += result.failed_cases.len();
            println!(
                "   ⚠️  Pattern '{}': {}/{} tests passed",
                pattern_id, result.passed_count, result.total_cases,
            );
        } else {
            println!("   ✓ Pattern '{}': All tests passed", pattern_id);
        }
        results.push(result);
    }

    println!("\n📊 Test Results Summary:");
    println!("   Total tests: {}", total_tests);
    println!("   Failed tests: {}\n", failed_tests);

    // Analyze results and mark patterns
    println!("🏷️  Analyzing results and marking patterns...\n");
    let mut overrides = HashMap::new();

    let issues = mark_patterns_from_test_results(&results, &mut overrides, &tester, "test-runner");

    if issues.is_empty() {
        println!("✅ All patterns passed! No issues found.\n");
    } else {
        for (pattern_id, pattern_issues) in &issues {
            println!(
                "⚠️  Pattern '{}' ({} issues):",
                pattern_id,
                pattern_issues.len()
            );
            for issue in pattern_issues {
                println!(
                    "   • {} (affected: {} cases)",
                    issue.description, issue.affected_cases,
                );
                if let Some(suggestion) = &issue.suggestion {
                    println!("     💡 {}", suggestion);
                }
            }
        }
        println!();
    }

    // Create override file
    let override_file = create_override_file_from_patterns(overrides.clone());

    // Export to JSON
    println!("💾 Exporting marked patterns to {}...", output_file);

    // Create parent directories if needed
    if let Some(parent) = PathBuf::from(&output_file).parent() {
        fs::create_dir_all(parent).ok();
    }

    match export_overrides_to_file(&override_file, &output_file) {
        Ok(_) => {
            println!("   ✓ Exported {} overrides\n", overrides.len());
        }
        Err(e) => {
            eprintln!("   ✗ Failed to export: {}\n", e);
            return;
        }
    }

    // Summary
    println!("════════════════════════════════════");
    println!("Summary:");
    println!("  Patterns tested: {}", results.len());
    println!("  Tests run: {}", total_tests);
    println!("  Failed tests: {}", failed_tests);
    println!(
        "  Patterns marked for review: {}",
        overrides
            .values()
            .filter(|o| o
                .marking_status
                .as_ref()
                .map(|s| s == "pending-review")
                .unwrap_or(false))
            .count()
    );
    println!("  Output file: {}", output_file);
    println!("════════════════════════════════════\n");

    println!("✨ Done! Next steps:");
    println!("  1. Review the JSON file: cat {}", output_file);
    println!(
        "  2. Commit to git: git add {} && git commit -m 'test: Mark patterns needing review'",
        output_file
    );
    println!("  3. Open VSCode and load the workspace");
    println!("  4. Run 'Log Scout: View Patterns Pending Review'");
    println!("  5. Review and approve/request changes");
}

fn load_patterns_from_file(_path: &str) -> Vec<log_scout_lsp_server::pattern_engine::Pattern> {
    // In real implementation, would parse JSON file
    // For this example, return empty vector
    Vec::new()
}

fn load_test_cases_from_file(_path: &str) -> HashMap<String, Vec<TestCase>> {
    // In real implementation, would parse JSON test case file
    // For this example, return empty map
    HashMap::new()
}
