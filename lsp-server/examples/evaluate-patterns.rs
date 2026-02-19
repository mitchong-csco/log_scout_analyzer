/// Example: Pattern Quality Evaluation
///
/// Demonstrates how to evaluate patterns and generate quality reports.
///
/// Usage:
///   cargo run --example evaluate-patterns

use log_scout_lsp_server::pattern_quality_evaluator::{
    PatternQualityEvaluator, generate_quality_report, QualityGrade,
};
use log_scout_lsp_server::pattern_engine::{Pattern, PatternMode, Severity};
use std::collections::HashMap;

fn main() {
    println!("📊 Pattern Quality Evaluation Example");
    println!("====================================\n");

    // Create test patterns
    let patterns = create_test_patterns();

    // Evaluate all patterns
    println!("🔍 Evaluating {} patterns...\n", patterns.len());
    let report = generate_quality_report(&patterns);

    // Print summary
    print_summary(&report);

    // Print individual scores
    println!("\n📋 Individual Pattern Scores");
    println!("============================\n");
    for score in &report.pattern_scores {
        print_pattern_score(&score);
    }

    // Print recommendations
    println!("\n💡 Patterns Needing Improvement");
    println!("=============================\n");
    let mut improvements: Vec<_> = report.pattern_scores
        .iter()
        .filter(|s| s.needs_improvement)
        .collect();
    improvements.sort_by(|a, b| a.overall_score.partial_cmp(&b.overall_score).unwrap());

    for score in improvements.iter().take(5) {
        println!("Pattern: {}", score.pattern_name);
        println!("  Score: {:.1}/100 (Grade {})",
            score.overall_score, score.quality_grade.as_str());
        println!("  Issues:");
        for area in &score.improvement_areas {
            println!("    - {}", area.as_str());
        }
        println!("  Recommendations:");
        for (i, rec) in score.recommendations.iter().take(2).enumerate() {
            println!("    {}. {}", i + 1, rec);
        }
        println!();
    }

    // Print quality distribution
    println!("\n📈 Quality Distribution");
    println!("======================");
    print_grade_distribution(&report);
}

fn create_test_patterns() -> Vec<Pattern> {
    vec![
        Pattern {
            id: "p1".to_string(),
            name: "Simple ERROR".to_string(),
            annotation: "Matches ERROR messages".to_string(),
            pattern: r"ERROR".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Error,
            category: "error".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        },
        Pattern {
            id: "p2".to_string(),
            name: "HTTP Response Code".to_string(),
            annotation: "Matches HTTP responses like 'HTTP/1.1 200 OK'".to_string(),
            pattern: r"HTTP/1\.\d\s+(\d{3})\s+\w+".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Info,
            category: "http".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        },
        Pattern {
            id: "p3".to_string(),
            name: "Complex Email Regex".to_string(),
            annotation: "Validates email addresses".to_string(),
            pattern: r"^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Info,
            category: "validation".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        },
        Pattern {
            id: "p4".to_string(),
            name: "Authentication Failure".to_string(),
            annotation: "When authentication fails: 'Failed login for user [X] from [IP]'. Common in web apps and SSH.".to_string(),
            pattern: r"Failed login for user (\w+) from ([\d.]+)".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "security".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        },
        Pattern {
            id: "p5".to_string(),
            name: "Generic Pattern".to_string(),
            annotation: "".to_string(),
            pattern: r".*".to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Info,
            category: "generic".to_string(),
            service: None,
            tags: vec![],
            action: None,
            expected_frequency: None,
            enabled: true,
            log_level_triggers: HashMap::new(),
            condition_triggers: vec![],
            capture_fields: vec![],
            parameter_extractors: vec![],
            tagscout_metadata: None,
        },
    ]
}

fn print_summary(report: &log_scout_lsp_server::pattern_quality_evaluator::QualityReport) {
    println!("Summary Statistics");
    println!("==================");
    println!("Total Patterns: {}", report.total_patterns);
    println!("Average Score: {:.1}/100", report.average_score);
    println!("Useful Patterns: {}", report.useful_count);
    println!("Patterns Needing Improvement: {}", report.needs_improvement_count);
    println!();
}

fn print_pattern_score(
    score: &log_scout_lsp_server::pattern_quality_evaluator::PatternQualityScore,
) {
    let grade_icon = match score.quality_grade {
        QualityGrade::A => "✅",
        QualityGrade::B => "👍",
        QualityGrade::C => "⚠️ ",
        QualityGrade::D => "❌",
        QualityGrade::F => "🚫",
    };

    println!("{} {}", grade_icon, score.pattern_name);
    println!("   Score: {:.1}/100 (Grade {})", score.overall_score, score.quality_grade.as_str());
    println!("   Useful: {}", if score.is_useful { "Yes" } else { "No" });

    if !score.improvement_areas.is_empty() {
        println!("   Areas for improvement:");
        for area in &score.improvement_areas {
            println!("     • {}", area.as_str());
        }
    }
    println!();
}

fn print_grade_distribution(report: &log_scout_lsp_server::pattern_quality_evaluator::QualityReport) {
    let breakdown = &report.grade_breakdown;
    let total = report.total_patterns as f64;

    print_grade_bar("A", breakdown.a_count, total);
    print_grade_bar("B", breakdown.b_count, total);
    print_grade_bar("C", breakdown.c_count, total);
    print_grade_bar("D", breakdown.d_count, total);
    print_grade_bar("F", breakdown.f_count, total);
}

fn print_grade_bar(grade: &str, count: usize, total: f64) {
    let percentage = (count as f64 / total) * 100.0;
    let bar_width = (percentage / 5.0) as usize;
    let bar = "█".repeat(bar_width.min(20));

    println!("Grade {}: {} ({:3.0}%) {}",
        grade, count, percentage, bar);
}
