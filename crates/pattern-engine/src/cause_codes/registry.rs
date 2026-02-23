use super::{load_properties_file, CauseCodeError, Result, Vendor};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

/// Thread-safe registry for cause code translations
pub struct CauseCodeRegistry {
    codes: Arc<RwLock<HashMap<String, HashMap<u32, String>>>>,
}

impl CauseCodeRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            codes: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Load cause codes for a vendor from properties file
    pub fn load_vendor(&self, vendor: &str) -> Result<()> {
        let vendor_enum = Vendor::from_str(vendor)
            .ok_or_else(|| CauseCodeError::VendorNotFound(vendor.to_string()))?;

        let filename = vendor_enum.properties_file();

        // Try multiple possible paths for the data file
        let possible_paths = vec![
            PathBuf::from(format!("data/cause_codes/{}", filename)),
            PathBuf::from(format!(
                "crates/pattern-engine/data/cause_codes/{}",
                filename
            )),
            PathBuf::from(format!("../pattern-engine/data/cause_codes/{}", filename)),
            PathBuf::from(format!(
                "../../pattern-engine/data/cause_codes/{}",
                filename
            )),
        ];

        let mut codes = None;
        let mut last_error = None;

        for path in possible_paths {
            match load_properties_file(&path) {
                Ok(loaded_codes) => {
                    codes = Some(loaded_codes);
                    break;
                }
                Err(e) => {
                    last_error = Some(e);
                }
            }
        }

        let codes = codes.ok_or_else(|| {
            last_error.unwrap_or_else(|| {
                CauseCodeError::LoadError(format!(
                    "Could not find {} in any expected location",
                    filename
                ))
            })
        })?;

        let mut registry = self.codes.write().unwrap();
        registry.insert(vendor.to_lowercase(), codes);

        Ok(())
    }

    /// Translate a cause code to human-readable description
    pub fn translate(&self, vendor: &str, code: u32) -> Option<String> {
        let registry = self.codes.read().unwrap();
        registry
            .get(&vendor.to_lowercase())
            .and_then(|vendor_codes| vendor_codes.get(&code))
            .cloned()
    }

    /// Check if a vendor is loaded
    pub fn is_vendor_loaded(&self, vendor: &str) -> bool {
        let registry = self.codes.read().unwrap();
        registry.contains_key(&vendor.to_lowercase())
    }

    /// Get all loaded vendors
    pub fn loaded_vendors(&self) -> Vec<String> {
        let registry = self.codes.read().unwrap();
        registry.keys().cloned().collect()
    }

    /// Get all codes for a vendor
    pub fn get_all_codes(&self, vendor: &str) -> Option<HashMap<u32, String>> {
        let registry = self.codes.read().unwrap();
        registry.get(&vendor.to_lowercase()).cloned()
    }

    /// Search cause codes by description (fuzzy match)
    pub fn search(&self, vendor: &str, query: &str) -> Vec<(u32, String)> {
        let registry = self.codes.read().unwrap();

        registry
            .get(&vendor.to_lowercase())
            .map(|vendor_codes| {
                vendor_codes
                    .iter()
                    .filter(|(_, desc)| desc.to_lowercase().contains(&query.to_lowercase()))
                    .map(|(code, desc)| (*code, desc.clone()))
                    .collect()
            })
            .unwrap_or_default()
    }
}

impl Default for CauseCodeRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_registry() {
        let registry = CauseCodeRegistry::new();
        assert_eq!(registry.loaded_vendors().len(), 0);
    }

    #[test]
    fn test_vendor_not_loaded() {
        let registry = CauseCodeRegistry::new();
        assert!(!registry.is_vendor_loaded("ucm"));
        assert_eq!(registry.translate("ucm", 16), None);
    }

    #[test]
    fn test_search_empty() {
        let registry = CauseCodeRegistry::new();
        let results = registry.search("ucm", "busy");
        assert_eq!(results.len(), 0);
    }
}
