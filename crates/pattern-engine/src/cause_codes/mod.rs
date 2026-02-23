//! Cisco Cause Code Translation Module
//!
//! Provides translation of numeric cause codes to human-readable descriptions
//! for various Cisco UC products (CUCM, UCCX, CVP, ACS, UCCE).
//!
//! # Example
//!
//! ```rust
//! use pattern_engine::cause_codes::CauseCodeRegistry;
//!
//! let registry = CauseCodeRegistry::new();
//! registry.load_vendor("ucm").expect("Failed to load UCM codes");
//!
//! let description = registry.translate("ucm", 16);
//! assert_eq!(description, Some("Normal call clearing".to_string()));
//! ```

mod loader;
mod registry;

pub use loader::load_properties_file;
pub use registry::CauseCodeRegistry;

/// Result type for cause code operations
pub type Result<T> = std::result::Result<T, CauseCodeError>;

/// Errors that can occur during cause code operations
#[derive(Debug, thiserror::Error)]
pub enum CauseCodeError {
    #[error("Failed to load cause codes from file: {0}")]
    LoadError(String),

    #[error("Vendor not found: {0}")]
    VendorNotFound(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    ParseError(String),
}

/// Supported Cisco vendors
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Vendor {
    /// Cisco Unified Call Manager
    UCM,
    /// Cisco Unity Connection
    CUC,
    /// Cisco Unified Contact Center Express
    UCCX,
    /// Cisco Unified Contact Center Enterprise
    UCCE,
    /// Cisco Customer Voice Portal
    CVP,
    /// Cisco Access Control Server
    ACS,
}

impl Vendor {
    /// Convert vendor to string identifier
    pub fn as_str(&self) -> &str {
        match self {
            Vendor::UCM => "ucm",
            Vendor::CUC => "cuc",
            Vendor::UCCX => "uccx",
            Vendor::UCCE => "ucce",
            Vendor::CVP => "cvp",
            Vendor::ACS => "acs",
        }
    }

    /// Parse vendor from string identifier
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "ucm" | "cucm" => Some(Vendor::UCM),
            "cuc" | "unity" => Some(Vendor::CUC),
            "uccx" => Some(Vendor::UCCX),
            "ucce" => Some(Vendor::UCCE),
            "cvp" => Some(Vendor::CVP),
            "acs" => Some(Vendor::ACS),
            _ => None,
        }
    }

    /// Get properties file name for this vendor
    pub fn properties_file(&self) -> &str {
        match self {
            Vendor::UCM => "ucmCauseCode.properties",
            Vendor::CUC => "cucCauseCode.properties",
            Vendor::UCCX => "uccxCauseCode.properties",
            Vendor::UCCE => "ucceCauseCode.properties",
            Vendor::CVP => "cvpCauseCode.properties",
            Vendor::ACS => "acsCauseCode.properties",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vendor_enum() {
        assert_eq!(Vendor::UCM.as_str(), "ucm");
        assert_eq!(Vendor::from_str("ucm"), Some(Vendor::UCM));
        assert_eq!(Vendor::from_str("CUCM"), Some(Vendor::UCM));
        assert_eq!(Vendor::from_str("invalid"), None);
    }

    #[test]
    fn test_properties_file_names() {
        assert_eq!(Vendor::UCM.properties_file(), "ucmCauseCode.properties");
        assert_eq!(Vendor::UCCX.properties_file(), "uccxCauseCode.properties");
    }
}
