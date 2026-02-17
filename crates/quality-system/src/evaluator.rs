//! Pattern quality evaluation

use pattern_engine::Pattern;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityGrade {
    A,
    B,
    C,
    D,
    F,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityScore {
    pub pattern_id: String,
    pub grade: QualityGrade,
    pub score: f64,
    pub issues: Vec<String>,
}

pub struct QualityEvaluator;

impl QualityEvaluator {
    pub fn evaluate(pattern: &Pattern) -> QualityScore {
        let mut score = 100.0;
        let mut issues = Vec::new();

        // Check if pattern has annotation
        if pattern.annotation.is_empty() {
            score -= 20.0;
            issues.push("Missing annotation".to_string());
        }

        // Check regex complexity
        if pattern.regex.len() > 200 {
            score -= 10.0;
            issues.push("Complex regex".to_string());
        }

        let grade = match score as i32 {
            90..=100 => QualityGrade::A,
            80..=89 => QualityGrade::B,
            70..=79 => QualityGrade::C,
            60..=69 => QualityGrade::D,
            _ => QualityGrade::F,
        };

        QualityScore {
            pattern_id: pattern.id.clone(),
            grade,
            score,
            issues,
        }
    }
}
