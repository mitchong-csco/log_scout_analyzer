//! LSP request handlers for bundle operations
//!
//! Provides custom LSP methods for bundle management:
//! - scout/bundle/create
//! - scout/bundle/addLog
//! - scout/bundle/list
//! - scout/bundle/analyze
//! - scout/bundle/delete

use serde::{Deserialize, Serialize};

/// Request to create a new bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBundleRequest {
    /// Bundle name
    pub name: String,

    /// Optional description
    pub description: Option<String>,

    /// Optional case/incident ID
    pub case_id: Option<String>,

    /// Optional tags
    pub tags: Option<Vec<String>>,
}

/// Response from creating a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBundleResponse {
    /// Generated bundle ID
    pub bundle_id: String,

    /// Bundle name
    pub name: String,

    /// Creation timestamp
    pub created_at: String,
}

/// Request to add a log to a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLogRequest {
    /// Bundle ID
    pub bundle_id: String,

    /// Log file path (URI or filesystem path)
    pub file_path: String,
}

/// Response from adding a log
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddLogResponse {
    /// Detected service type
    pub service: String,

    /// File size in bytes
    pub size_bytes: u64,

    /// Line count
    pub line_count: usize,

    /// Detection confidence (0.0 - 1.0)
    pub confidence: f32,
}

/// Request to list bundles
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBundlesRequest {
    /// Optional name filter
    pub filter: Option<String>,
}

/// Response with bundle list
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBundlesResponse {
    /// List of bundles
    pub bundles: Vec<BundleSummary>,
}

/// Summary of a bundle for listing
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleSummary {
    /// Bundle ID
    pub id: String,

    /// Bundle name
    pub name: String,

    /// Description
    pub description: Option<String>,

    /// Number of logs
    pub log_count: usize,

    /// Total size in bytes
    pub total_size: u64,

    /// Created timestamp
    pub created_at: String,

    /// Last updated timestamp
    pub updated_at: String,
}

/// Request to analyze a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeBundleRequest {
    /// Bundle ID
    pub bundle_id: String,
}

/// Response from bundle analysis
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeBundleResponse {
    /// Bundle ID
    pub bundle_id: String,

    /// Total detections found
    pub total_detections: usize,

    /// Detections by severity
    pub by_severity: SeverityCounts,

    /// Services analyzed
    pub services: Vec<String>,

    /// Analysis duration in milliseconds
    pub duration_ms: u64,
}

/// Counts by severity
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeverityCounts {
    pub error: usize,
    pub warning: usize,
    pub info: usize,
}

/// Request to delete a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBundleRequest {
    /// Bundle ID
    pub bundle_id: String,
}

/// Response from deleting a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBundleResponse {
    /// Whether deletion was successful
    pub success: bool,

    /// Deleted bundle ID
    pub bundle_id: String,
}

/// Get bundle details
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBundleRequest {
    /// Bundle ID
    pub bundle_id: String,
}

/// Full bundle details response
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBundleResponse {
    /// Bundle ID
    pub id: String,

    /// Bundle name
    pub name: String,

    /// Description
    pub description: Option<String>,

    /// Logs in bundle
    pub logs: Vec<LogInfo>,

    /// Created timestamp
    pub created_at: String,

    /// Updated timestamp
    pub updated_at: String,
}

/// Request to import log package (QCSONE smart import)
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPackageRequest {
    /// Path to package file (e.g., 700440257_qcsone_download_selected.zip)
    pub package_path: String,

    /// Optional bundle name (auto-generated if not provided)
    pub bundle_name: Option<String>,

    /// Optional case ID (auto-detected from filename if not provided)
    pub case_id: Option<String>,
}

/// Response from importing package
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPackageResponse {
    /// Created bundle ID
    pub bundle_id: String,

    /// Bundle name
    pub bundle_name: String,

    /// Detected or provided case ID
    pub case_id: Option<String>,

    /// Total files in package
    pub total_files: usize,

    /// Successfully imported
    pub imported_count: usize,

    /// Failed to import
    pub failed_count: usize,

    /// Services detected (Jabber, CUCM, CUP, Unity, etc.)
    pub services_detected: Vec<String>,

    /// Count by service
    pub service_counts: std::collections::HashMap<String, usize>,
}

/// Information about a log in a bundle
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogInfo {
    /// File URI/path
    pub uri: String,

    /// Detected service
    pub service: String,

    /// File size
    pub size_bytes: u64,

    /// Line count
    pub line_count: usize,

    /// When added
    pub added_at: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_bundle_request_serialization() {
        let req = CreateBundleRequest {
            name: "Test Bundle".to_string(),
            description: Some("Test description".to_string()),
            case_id: Some("INC-12345".to_string()),
            tags: Some(vec!["urgent".to_string()]),
        };

        let json = serde_json::to_string(&req).unwrap();
        assert!(json.contains("Test Bundle"));

        let deserialized: CreateBundleRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "Test Bundle");
    }

    #[test]
    fn test_add_log_request_serialization() {
        let req = AddLogRequest {
            bundle_id: "bundle_123".to_string(),
            file_path: "/logs/test.log".to_string(),
        };

        let json = serde_json::to_string(&req).unwrap();
        let deserialized: AddLogRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.bundle_id, "bundle_123");
    }

    #[test]
    fn test_list_bundles_response() {
        let response = ListBundlesResponse {
            bundles: vec![BundleSummary {
                id: "bundle_1".to_string(),
                name: "Bundle 1".to_string(),
                description: None,
                log_count: 3,
                total_size: 1024,
                created_at: "2026-02-18T10:00:00Z".to_string(),
                updated_at: "2026-02-18T10:00:00Z".to_string(),
            }],
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("Bundle 1"));
    }
}
