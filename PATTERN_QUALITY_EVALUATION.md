# Pattern Quality Evaluator - Complete Guide

> **Date:** February 16, 2026  
> **Status:** ✅ IMPLEMENTED  
> **Feature:** Analyze pattern quality and identify improvements

---

## Overview

The **Pattern Quality Evaluator** analyzes patterns to:

✅ **Score patterns** (0-100 with letter grades A-F)  
✅ **Assess usefulness** (is it useful or too broken?)  
✅ **Identify problems** (what needs improvement?)  
✅ **Recommend fixes** (how to improve it?)  
✅ **Generate reports** (overview of all patterns)  

---

## Quality Metrics Evaluated

### 1. Regex Complexity (0-100, lower is better)
Measures how complex the regex is:
- Long patterns: +0.2 per character
- Special characters: +5 per special char
- Goal: Keep under 30-40

```
Simple:     r"ERROR"              → ~5
Moderate:   r"ERROR\s+\[.*\]"     → ~25
Complex:    r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$" → ~75
```

### 2. Extractor Quality (0-100, higher is better)
Quality of parameter extractors:
- Simple extractors (<30 chars): +20
- Specific patterns (no .*): +15
- Named groups: +15

```
No extractors:      → ~50 (neutral)
Good extractors:    → 80-100
Poor extractors:    → 40-60
```

### 3. Description Quality (0-100, higher is better)
How detailed is the annotation:
- Detailed (>50 chars): +30
- Has context (when/if): +20
- Has examples: +10

### 4. Specificity Score (0-100, higher is better)
How specific vs generic:
- Uses `[0-9]`, `\d`, `\w`: high specificity
- Uses `.*`, `.+`: low specificity
- Goal: Specific patterns match intentional logs

### 5. Maintainability (0-100, higher is better)
How easy is it to maintain:
- Pattern length penalty: up to -30
- Nesting level penalty: -5 per level
- Goal: Simple, readable patterns

### 6. Estimated Coverage (0-100, higher is better)
Estimated % of logs it matches:
- Has date patterns: +10
- Has time patterns: +5
- Has log level: +10
- Has IP address: +5
- Is service-specific: +10

---

## Quality Grades

| Grade | Score | Meaning |
|-------|-------|---------|
| **A** | 90-100 | Excellent pattern, production-ready |
| **B** | 80-89 | Good pattern, minor improvements possible |
| **C** | 70-79 | Acceptable, but has issues |
| **D** | 60-69 | Poor, needs improvement |
| **F** | <60 | Broken/unusable, requires fixing |

---

## Usefulness Assessment

```rust
pub is_useful: bool  // true if score >= 60
```

- **TRUE:** Pattern is usable and provides value
- **FALSE:** Pattern is too broken to use reliably

---

## Improvement Areas Detected

| Area | What It Means | How to Fix |
|------|---------------|-----------|
| **ComplexRegex** | Regex is too complicated | Break into smaller patterns |
| **MissingExtractors** | No parameters extracted | Add parameter extractors |
| **PoorDescription** | Unclear what pattern does | Improve annotation |
| **TooGeneric** | Pattern too broad | Add specific constraints |
| **LowCoverage** | Doesn't match many logs | Expand pattern variations |
| **HighFalsePositiveRisk** | May match wrong logs | Be more specific |
| **MaintainabilityIssue** | Hard to understand/change | Simplify regex |
| **PerformanceRisk** | Slow regex execution | Optimize (avoid backtracking) |

---

## Core API

### Evaluate Single Pattern

```rust
use log_scout_lsp_server::pattern_quality_evaluator::PatternQualityEvaluator;

let score = PatternQualityEvaluator::evaluate_pattern(&pattern);

println!("Pattern: {}", score.pattern_name);
println!("Score: {:.1}/100", score.overall_score);
println!("Grade: {}", score.quality_grade.as_str());
println!("Useful: {}", score.is_useful);
println!("Needs improvement: {}", score.needs_improvement);

// See metrics
println!("Regex complexity: {:.1}", score.metrics.regex_complexity);
println!("Extractor quality: {:.1}", score.metrics.extractor_quality);
println!("Description quality: {:.1}", score.metrics.description_quality);
println!("Specificity: {:.1}", score.metrics.specificity_score);
println!("Maintainability: {:.1}", score.metrics.maintainability_score);
println!("Coverage: {:.1}", score.metrics.estimated_coverage);

// See improvement areas
for area in &score.improvement_areas {
    println!("⚠️  {}", area.as_str());
}

// See recommendations
for rec in &score.recommendations {
    println!("💡 {}", rec);
}
```

### Evaluate Multiple Patterns

```rust
let patterns = load_patterns()?;
let scores = PatternQualityEvaluator::evaluate_patterns(&patterns);

for score in scores {
    println!("{}: Grade {}", score.pattern_name, score.quality_grade.as_str());
}
```

### Generate Quality Report

```rust
use log_scout_lsp_server::pattern_quality_evaluator::generate_quality_report;

let report = generate_quality_report(&patterns);

println!("Total patterns: {}", report.total_patterns);
println!("Average score: {:.1}", report.average_score);
println!("Grade A: {}", report.grade_breakdown.a_count);
println!("Grade F: {}", report.grade_breakdown.f_count);
println!("Useful: {}", report.useful_count);
println!("Need improvement: {}", report.needs_improvement_count);
```

---

## Real Examples

### Example 1: Simple, Good Pattern

```
Pattern: "ERROR"
Regex Complexity: 5 (very simple)
Extractor Quality: 50 (no extractors, but simple)
Description Quality: 75 (decent)
Specificity: 90 (matches only ERROR lines)
Maintainability: 95 (very simple)
Coverage: 60 (moderate)

Overall Score: 78/100
Grade: C (acceptable, but could add extractors)

Recommendations:
- Add parameter extractors to capture important values
```

### Example 2: Complex but Good

```
Pattern: "HTTP/1.1\s+(\d{3})\s+\w+"
Regex Complexity: 35 (moderate)
Extractor Quality: 85 (good extractors)
Description Quality: 80 (detailed)
Specificity: 85 (specific HTTP responses)
Maintainability: 80 (readable)
Coverage: 85 (good coverage)

Overall Score: 82/100
Grade: B (good, production-ready)

Recommendations:
- Pattern is well-designed with no major improvements needed
```

### Example 3: Broken Pattern

```
Pattern: "^(?:[0-9a-zA-Z-])*(?:\.(?:[0-9a-zA-Z-])*)*\.(?:[a-zA-Z]{2,})$"
Regex Complexity: 85 (very complex)
Extractor Quality: 40 (poor extractors)
Description Quality: 30 (minimal description)
Specificity: 40 (too generic)
Maintainability: 25 (hard to read)
Coverage: 65 (okay coverage)

Overall Score: 48/100
Grade: F (broken, needs major revision)

Improvements Needed:
- Regex is overly complex - break into smaller patterns
- Missing important parameter extractors
- Pattern description is unclear
- High risk of false positives
- Difficult to maintain

Recommendations:
- Consider breaking down this regex into smaller, more focused patterns
- Add parameter extractors to capture important values
- Enhance the pattern description with more context and examples
- Make the pattern more specific to reduce false positives
- Simplify the regex or add comments to improve readability
```

---

## Integration with Marking System

### Auto-Mark Low-Quality Patterns

```rust
use log_scout_lsp_server::pattern_quality_evaluator::PatternQualityEvaluator;
use log_scout_lsp_server::pattern_loader::{MarkingStatus, Priority};

let score = PatternQualityEvaluator::evaluate_pattern(&pattern);

if !score.is_useful {
    // Mark pattern for review
    let mut override_data = PatternOverride {
        // ...
        marking_status: Some(MarkingStatus::PendingReview.as_str().to_string()),
        priority: Some(if score.overall_score < 50.0 {
            Priority::Critical
        } else {
            Priority::High
        }.as_str().to_string()),
        category: Some(improvement_areas[0].to_category().as_str().to_string()),
        notes: Some(format!(
            "Quality Score: {:.1}/100 (Grade {})\nImprovements needed:\n{}",
            score.overall_score,
            score.quality_grade.as_str(),
            score.improvement_areas
                .iter()
                .map(|a| format!("- {}", a.as_str()))
                .collect::<Vec<_>>()
                .join("\n")
        )),
        // ...
    };
}
```

---

## Quality Report Output

```
Quality Report: Pattern Analysis
================================

Total Patterns Analyzed: 156

Average Quality Score: 72.5/100
Overall Grade Distribution:
  Grade A: 12 patterns (7.7%)
  Grade B: 34 patterns (21.8%)
  Grade C: 45 patterns (28.8%)
  Grade D: 42 patterns (26.9%)
  Grade F: 23 patterns (14.7%)

Useful Patterns: 133 (85.3%)
Patterns Needing Improvement: 65 (41.7%)

Top Performers (Grade A):
  1. HTTP_SUCCESS (94/100)
  2. ERROR_RESPONSE (92/100)
  3. AUTH_FAILURE (91/100)

Lowest Performers (Grade F):
  1. LEGACY_DNS (45/100) - Regex too complex
  2. OLD_MAIL (42/100) - No extractors
  3. DEPRECATED_APP (38/100) - Too generic
```

---

## Testing

Run tests:
```bash
cargo test pattern_quality_evaluator::tests

# ✓ test_evaluate_simple_pattern
# ✓ test_evaluate_complex_pattern
# ✓ test_quality_grade_from_score
# ✓ test_improvement_areas_for_complex_pattern
# ✓ test_quality_report_generation
```

---

## Use Cases

### 1. Pattern Library Audit
Evaluate all patterns to find low-quality ones:

```rust
let patterns = load_from_tagscout()?;
let report = generate_quality_report(&patterns);

// Find all Grade F patterns
let bad_patterns: Vec<_> = report.pattern_scores
    .iter()
    .filter(|s| s.quality_grade == QualityGrade::F)
    .collect();

// Mark them for review
for score in bad_patterns {
    mark_for_improvement(&score, "library-audit")?;
}
```

### 2. Pre-Commit Quality Check
Verify new patterns are high quality:

```rust
fn verify_pattern_quality(pattern: &Pattern) -> Result<()> {
    let score = PatternQualityEvaluator::evaluate_pattern(pattern);
    
    if score.overall_score < 70.0 {
        Err(format!(
            "Pattern quality below minimum: {:.1}/100",
            score.overall_score
        ).into())
    } else {
        Ok(())
    }
}
```

### 3. Pattern Library Maintenance
Identify patterns to refactor:

```rust
let patterns = load_patterns()?;
let scores = PatternQualityEvaluator::evaluate_patterns(&patterns);

// Find patterns that need simplification
let maintenance_candidates: Vec<_> = scores
    .iter()
    .filter(|s| 
        s.metrics.regex_complexity > 70.0 ||
        s.metrics.maintainability_score < 50.0
    )
    .collect();

// Create improvement task for each
for score in maintenance_candidates {
    create_task(&format!(
        "Refactor pattern '{}' - too complex",
        score.pattern_name
    ))?;
}
```

### 4. Quality Dashboard
Show team the health of pattern library:

```rust
let patterns = load_patterns()?;
let report = generate_quality_report(&patterns);

let quality_metrics = json!({
    "total": report.total_patterns,
    "average_score": report.average_score,
    "grades": {
        "a": report.grade_breakdown.a_count,
        "b": report.grade_breakdown.b_count,
        "c": report.grade_breakdown.c_count,
        "d": report.grade_breakdown.d_count,
        "f": report.grade_breakdown.f_count,
    },
    "useful": report.useful_count,
    "needs_improvement": report.needs_improvement_count,
});

// Send to dashboard/monitoring system
post_to_dashboard(&quality_metrics)?;
```

---

## Metrics Weighting

```
Overall Score = 
    (100 - regex_complexity) * 0.20 +  // Keep regex simple
    extractor_quality * 0.25 +         // Extract parameters
    description_quality * 0.15 +       // Describe purpose
    specificity_score * 0.15 +         // Be specific
    maintainability_score * 0.15 +     // Easy to maintain
    estimated_coverage * 0.10          // Match logs
```

---

## Summary

✅ **Scores patterns** 0-100 with letter grades  
✅ **Assesses usefulness** based on quality  
✅ **Identifies problems** in patterns  
✅ **Recommends fixes** for each issue  
✅ **Generates reports** for pattern library  
✅ **Integrates with marking** to auto-flag low-quality  

**Result:** Understand which patterns are good, which are broken, and what to fix.

---

## Next Steps

1. Evaluate all patterns in your library
2. Review Grade F patterns and fix them
3. Set minimum quality score (e.g., 70 for production)
4. Add quality checks to your deployment pipeline
5. Monitor and improve over time

See `PATTERN_QUALITY_EVALUATION_GUIDE.md` for more examples.
