/// Pattern Quality Evaluator
///
/// Analyzes patterns to determine:
/// - Quality score
/// - Usefulness assessment
/// - Improvement recommendations
use crate::pattern_engine::Pattern;
use crate::pattern_loader::IssueCategory;

/// Overall pattern quality score
#[derive(Debug, Clone)]
pub struct PatternQualityScore {
    pub pattern_id: String,
    pub pattern_name: String,
    pub overall_score: f64,          // 0-100
    pub quality_grade: QualityGrade, // A-F
    pub is_useful: bool,
    pub needs_improvement: bool,
    pub improvement_areas: Vec<ImprovementArea>,
    pub metrics: QualityMetrics,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QualityGrade {
    A, // 90-100
    B, // 80-89
    C, // 70-79
    D, // 60-69
    F, // <60
}

impl QualityGrade {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::A => "A",
            Self::B => "B",
            Self::C => "C",
            Self::D => "D",
            Self::F => "F",
        }
    }

    pub fn from_score(score: f64) -> Self {
        match score {
            s if s >= 90.0 => Self::A,
            s if s >= 80.0 => Self::B,
            s if s >= 70.0 => Self::C,
            s if s >= 60.0 => Self::D,
            _ => Self::F,
        }
    }
}

#[derive(Debug, Clone)]
pub struct QualityMetrics {
    pub regex_complexity: f64,      // 0-100 (lower is better)
    pub extractor_count: usize,     // Number of parameter extractors
    pub extractor_quality: f64,     // 0-100 (average quality of extractors)
    pub description_quality: f64,   // 0-100 (how detailed/clear)
    pub specificity_score: f64,     // 0-100 (how specific vs generic)
    pub maintainability_score: f64, // 0-100 (how easy to maintain)
    pub estimated_coverage: f64,    // 0-100 (estimated % of logs it matches)
}

#[derive(Debug, Clone)]
pub enum ImprovementArea {
    ComplexRegex,
    MissingExtractors,
    PoorDescription,
    TooGeneric,
    LowCoverage,
    HighFalsePositiveRisk,
    MaintainabilityIssue,
    PerformanceRisk,
}

impl ImprovementArea {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::ComplexRegex => "Regex is overly complex",
            Self::MissingExtractors => "Missing important parameter extractors",
            Self::PoorDescription => "Pattern description is unclear or incomplete",
            Self::TooGeneric => "Pattern may be too generic (high false positive risk)",
            Self::LowCoverage => "Pattern has low estimated coverage",
            Self::HighFalsePositiveRisk => "High risk of false positives",
            Self::MaintainabilityIssue => "Pattern is difficult to maintain or understand",
            Self::PerformanceRisk => "Regex may have performance issues",
        }
    }

    pub fn to_category(&self) -> IssueCategory {
        match self {
            Self::ComplexRegex | Self::PerformanceRisk => IssueCategory::Regex,
            Self::MissingExtractors => IssueCategory::Extractor,
            _ => IssueCategory::MissingPattern,
        }
    }
}

/// Pattern Quality Evaluator
pub struct PatternQualityEvaluator;

impl PatternQualityEvaluator {
    /// Evaluate a single pattern
    pub fn evaluate_pattern(pattern: &Pattern) -> PatternQualityScore {
        let metrics = Self::calculate_metrics(pattern);
        let improvement_areas = Self::identify_improvements(&metrics);
        let recommendations = Self::generate_recommendations(&improvement_areas, &metrics);

        let overall_score = Self::calculate_overall_score(&metrics);
        let quality_grade = QualityGrade::from_score(overall_score);
        let is_useful = overall_score >= 60.0;
        let needs_improvement = overall_score < 80.0;

        PatternQualityScore {
            pattern_id: pattern.id.clone(),
            pattern_name: pattern.name.clone(),
            overall_score,
            quality_grade,
            is_useful,
            needs_improvement,
            improvement_areas,
            metrics,
            recommendations,
        }
    }

    /// Evaluate multiple patterns
    pub fn evaluate_patterns(patterns: &[Pattern]) -> Vec<PatternQualityScore> {
        patterns.iter().map(|p| Self::evaluate_pattern(p)).collect()
    }

    /// Calculate individual quality metrics
    fn calculate_metrics(pattern: &Pattern) -> QualityMetrics {
        // Regex complexity (based on special characters and length)
        let regex_complexity = Self::assess_regex_complexity(&pattern.pattern);

        // Extractor quality
        let extractor_count = pattern.parameter_extractors.len();
        let extractor_quality = if extractor_count > 0 {
            Self::assess_extractors(&pattern.parameter_extractors)
        } else {
            50.0 // Neutral score if no extractors
        };

        // Description quality
        let description_quality = Self::assess_description(&pattern.annotation);

        // Specificity (how specific vs generic)
        let specificity_score = Self::assess_specificity(&pattern.pattern);

        // Maintainability (readability of regex)
        let maintainability_score = Self::assess_maintainability(&pattern.pattern);

        // Estimated coverage (heuristic based on pattern type)
        let estimated_coverage = Self::estimate_coverage(&pattern.pattern);

        QualityMetrics {
            regex_complexity,
            extractor_count,
            extractor_quality,
            description_quality,
            specificity_score,
            maintainability_score,
            estimated_coverage,
        }
    }

    /// Assess regex complexity (0-100, lower is better)
    fn assess_regex_complexity(regex: &str) -> f64 {
        let len = regex.len();
        let special_count = regex
            .chars()
            .filter(|c| "[](){}+*?|^$\\.".contains(*c))
            .count();

        // Heuristic: penalize long and complex regexes
        let complexity_score = (len as f64 * 0.2) + (special_count as f64 * 5.0);

        // Convert to 0-100 scale where 100 is worst
        (complexity_score).min(100.0)
    }

    /// Assess quality of parameter extractors (0-100, higher is better)
    fn assess_extractors(extractors: &[crate::pattern_engine::ParameterExtractor]) -> f64 {
        if extractors.is_empty() {
            return 50.0;
        }

        let mut total_quality = 0.0;

        for extractor in extractors {
            let regex_len = extractor.regex.len();
            let is_simple = regex_len < 30; // Simple regex is better
            let has_named_group = extractor.regex.contains("(?P<");
            let is_specific = !extractor.regex.contains(".*"); // .* is too generic

            let mut quality: f64 = 50.0;
            if is_simple {
                quality += 20.0;
            }
            if is_specific {
                quality += 15.0;
            }
            if has_named_group {
                quality += 15.0;
            }

            total_quality += quality.min(100.0);
        }

        (total_quality / extractors.len() as f64).min(100.0)
    }

    /// Assess description/annotation quality (0-100, higher is better)
    fn assess_description(annotation: &str) -> f64 {
        let len = annotation.len();
        let has_context = annotation.contains("when") || annotation.contains("if");
        let has_examples = annotation.contains("example") || annotation.contains("e.g.");
        let is_detailed = len > 50;

        let mut score: f64 = 40.0; // Base score
        if is_detailed {
            score += 30.0;
        }
        if has_context {
            score += 20.0;
        }
        if has_examples {
            score += 10.0;
        }

        score.min(100.0)
    }

    /// Assess pattern specificity (0-100, higher is better)
    fn assess_specificity(regex: &str) -> f64 {
        // Count specific elements vs generic ones
        let generic_count = regex.matches(".*").count() + regex.matches(".+").count();
        let specific_elements = regex.matches("[0-9]").count()
            + regex.matches("[a-z]").count()
            + regex.matches("[A-Z]").count()
            + regex.matches("\\d").count()
            + regex.matches("\\w").count();

        let specificity_ratio = if generic_count == 0 {
            100.0
        } else {
            (specific_elements as f64 / (specific_elements as f64 + generic_count as f64)) * 100.0
        };

        specificity_ratio.min(100.0)
    }

    /// Assess maintainability/readability (0-100, higher is better)
    fn assess_maintainability(regex: &str) -> f64 {
        let len = regex.len();
        let nesting_level = regex.matches('(').count().max(regex.matches('[').count());

        // Simpler patterns are easier to maintain
        let length_penalty = (len as f64 / 200.0 * 30.0).min(30.0);
        let nesting_penalty = (nesting_level as f64 * 5.0).min(30.0);

        (100.0 - length_penalty - nesting_penalty).max(0.0)
    }

    /// Estimate coverage of pattern (0-100)
    fn estimate_coverage(regex: &str) -> f64 {
        let has_date = regex.contains("\\d{2}") || regex.contains("\\d{4}");
        let has_time = regex.contains("\\d{1,2}:[\\d]{1,2}");
        let has_level = regex.contains("ERROR|WARN|INFO|DEBUG") || regex.contains("[A-Z]{4,}");
        let has_ip = regex.contains("\\d{1,3}") || regex.contains("\\.");
        let is_service_pattern = !regex.contains(".*") && regex.len() > 10;

        let mut score: f64 = 50.0;
        if has_date {
            score += 10.0;
        }
        if has_time {
            score += 5.0;
        }
        if has_level {
            score += 10.0;
        }
        if has_ip {
            score += 5.0;
        }
        if is_service_pattern {
            score += 10.0;
        }

        score.min(100.0)
    }

    /// Calculate overall quality score (0-100)
    fn calculate_overall_score(metrics: &QualityMetrics) -> f64 {
        // Weight different metrics
        let regex_health = 100.0 - metrics.regex_complexity; // Inverse: less complex is better
        let extractors_health = metrics.extractor_quality;
        let description_health = metrics.description_quality;
        let specificity_health = metrics.specificity_score;
        let maintainability_health = metrics.maintainability_score;
        let coverage_health = metrics.estimated_coverage;

        // Calculate weighted average
        let overall: f64 = (regex_health * 0.2
            + extractors_health * 0.25
            + description_health * 0.15
            + specificity_health * 0.15
            + maintainability_health * 0.15
            + coverage_health * 0.1)
            .round();

        overall.min(100.0).max(0.0)
    }

    /// Identify improvement areas
    fn identify_improvements(metrics: &QualityMetrics) -> Vec<ImprovementArea> {
        let mut areas = Vec::new();

        if metrics.regex_complexity > 70.0 {
            areas.push(ImprovementArea::ComplexRegex);
        }

        if metrics.extractor_count == 0 {
            areas.push(ImprovementArea::MissingExtractors);
        }

        if metrics.description_quality < 60.0 {
            areas.push(ImprovementArea::PoorDescription);
        }

        if metrics.specificity_score < 50.0 {
            areas.push(ImprovementArea::TooGeneric);
        }

        if metrics.estimated_coverage < 40.0 {
            areas.push(ImprovementArea::LowCoverage);
        }

        if metrics.specificity_score < 40.0 {
            areas.push(ImprovementArea::HighFalsePositiveRisk);
        }

        if metrics.maintainability_score < 50.0 {
            areas.push(ImprovementArea::MaintainabilityIssue);
        }

        if metrics.regex_complexity > 80.0 {
            areas.push(ImprovementArea::PerformanceRisk);
        }

        areas
    }

    /// Generate improvement recommendations
    fn generate_recommendations(
        improvements: &[ImprovementArea],
        _metrics: &QualityMetrics,
    ) -> Vec<String> {
        let mut recommendations = Vec::new();

        for area in improvements {
            match area {
                ImprovementArea::ComplexRegex => {
                    recommendations.push(
                        "Consider breaking down this regex into smaller, more focused patterns"
                            .to_string(),
                    );
                }
                ImprovementArea::MissingExtractors => {
                    recommendations.push(
                        "Add parameter extractors to capture important values from matched logs"
                            .to_string(),
                    );
                }
                ImprovementArea::PoorDescription => {
                    recommendations.push(
                        "Enhance the pattern description with more context and examples"
                            .to_string(),
                    );
                }
                ImprovementArea::TooGeneric => {
                    recommendations.push(
                        "Make the pattern more specific to reduce false positives".to_string(),
                    );
                }
                ImprovementArea::LowCoverage => {
                    recommendations.push(
                        "Expand pattern coverage to match more relevant log variations".to_string(),
                    );
                }
                ImprovementArea::HighFalsePositiveRisk => {
                    recommendations.push(
                        "Add more specific constraints to avoid matching unintended logs"
                            .to_string(),
                    );
                }
                ImprovementArea::MaintainabilityIssue => {
                    recommendations.push(
                        "Simplify the regex or add comments to improve readability".to_string(),
                    );
                }
                ImprovementArea::PerformanceRisk => {
                    recommendations.push(
                        "Optimize the regex to improve performance (use atomic groups, avoid backtracking)"
                            .to_string(),
                    );
                }
            }
        }

        if recommendations.is_empty() {
            recommendations.push(
                "Pattern is well-designed with no identified improvements needed".to_string(),
            );
        }

        recommendations
    }
}

/// Generate a quality report for patterns
pub fn generate_quality_report(patterns: &[Pattern]) -> QualityReport {
    let scores = PatternQualityEvaluator::evaluate_patterns(patterns);

    let total_score: f64 =
        scores.iter().map(|s| s.overall_score).sum::<f64>() / scores.len() as f64;
    let grade_a = scores
        .iter()
        .filter(|s| s.quality_grade == QualityGrade::A)
        .count();
    let grade_f = scores
        .iter()
        .filter(|s| s.quality_grade == QualityGrade::F)
        .count();
    let useful_count = scores.iter().filter(|s| s.is_useful).count();
    let needs_improvement_count = scores.iter().filter(|s| s.needs_improvement).count();

    QualityReport {
        total_patterns: patterns.len(),
        average_score: total_score,
        grade_breakdown: GradeBreakdown {
            a_count: grade_a,
            b_count: scores
                .iter()
                .filter(|s| s.quality_grade == QualityGrade::B)
                .count(),
            c_count: scores
                .iter()
                .filter(|s| s.quality_grade == QualityGrade::C)
                .count(),
            d_count: scores
                .iter()
                .filter(|s| s.quality_grade == QualityGrade::D)
                .count(),
            f_count: grade_f,
        },
        useful_count,
        needs_improvement_count,
        pattern_scores: scores,
    }
}

#[derive(Debug, Clone)]
pub struct QualityReport {
    pub total_patterns: usize,
    pub average_score: f64,
    pub grade_breakdown: GradeBreakdown,
    pub useful_count: usize,
    pub needs_improvement_count: usize,
    pub pattern_scores: Vec<PatternQualityScore>,
}

#[derive(Debug, Clone)]
pub struct GradeBreakdown {
    pub a_count: usize,
    pub b_count: usize,
    pub c_count: usize,
    pub d_count: usize,
    pub f_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pattern_engine::{Pattern, PatternMode, Severity};
    use std::collections::HashMap;

    fn create_test_pattern(id: &str, name: &str, regex: &str) -> Pattern {
        Pattern {
            id: id.to_string(),
            name: name.to_string(),
            annotation: "Test annotation for this pattern".to_string(),
            pattern: regex.to_string(),
            mode: PatternMode::SingleLine,
            severity: Severity::Warning,
            category: "test".to_string(),
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
        }
    }

    #[test]
    fn test_evaluate_simple_pattern() {
        let pattern = create_test_pattern("p1", "Simple", r"ERROR");
        let score = PatternQualityEvaluator::evaluate_pattern(&pattern);

        assert!(score.is_useful);
        assert!(score.overall_score >= 60.0);
    }

    #[test]
    fn test_evaluate_complex_pattern() {
        let pattern = create_test_pattern(
            "p2",
            "Complex",
            r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$",
        );
        let score = PatternQualityEvaluator::evaluate_pattern(&pattern);

        // Complex pattern should have lower maintainability
        assert!(score.metrics.regex_complexity > 50.0);
    }

    #[test]
    fn test_quality_grade_from_score() {
        assert_eq!(QualityGrade::from_score(95.0), QualityGrade::A);
        assert_eq!(QualityGrade::from_score(85.0), QualityGrade::B);
        assert_eq!(QualityGrade::from_score(75.0), QualityGrade::C);
        assert_eq!(QualityGrade::from_score(65.0), QualityGrade::D);
        assert_eq!(QualityGrade::from_score(55.0), QualityGrade::F);
    }

    #[test]
    fn test_improvement_areas_for_complex_pattern() {
        let pattern = create_test_pattern("p3", "Complex", r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$");
        let score = PatternQualityEvaluator::evaluate_pattern(&pattern);

        // Should identify improvement areas
        assert!(!score.improvement_areas.is_empty());
    }

    #[test]
    fn test_quality_report_generation() {
        let patterns = vec![
            create_test_pattern("p1", "Pattern 1", r"ERROR"),
            create_test_pattern("p2", "Pattern 2", r"WARNING"),
            create_test_pattern("p3", "Pattern 3", r"INFO"),
        ];

        let report = generate_quality_report(&patterns);

        assert_eq!(report.total_patterns, 3);
        assert!(report.average_score >= 0.0 && report.average_score <= 100.0);
    }
}
