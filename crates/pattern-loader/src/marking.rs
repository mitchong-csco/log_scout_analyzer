//! Pattern marking system

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MarkingStatus {
    Draft,
    PendingReview,
    Approved,
    Applied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMarking {
    pub pattern_id: String,
    pub status: MarkingStatus,
    pub marked_by: String,
    pub marked_at: String,
    pub notes: Option<String>,
}
