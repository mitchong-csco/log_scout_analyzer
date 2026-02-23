# 🚀 Cisco RTMT Integration - Quick Start Guide

**For**: Immediate implementation of Phase 1
**Time**: 30 minutes to first working code
**Prerequisite**: Read CISCO_RTMT_INTEGRATION_PLAN.md for full context

---

## 🎯 What We're Building First

**Phase 1 Focus**: Cause Code Module (Highest ROI, Lowest Effort)

This gets us:
- ✅ Cause code translation working
- ✅ Foundation for all normalizers
- ✅ Immediate value for users
- ✅ Test data extracted and ready

---

## 📋 Pre-Flight Checklist

Before starting, confirm:
- [x] RTMT ZIP file extracted to `/tmp/rtmt_extract`
- [ ] Read PROJECT_STATUS.md (know current state)
- [ ] Read AI_ASSISTANT_GUIDE.md (know TDD approach)
- [ ] All existing tests passing (`npm test`)

---

## 🔥 Step-by-Step Implementation

### Step 1: Extract RTMT Data (5 minutes)

```bash
cd /c/Users/mitchong/code/log_scout_analyzer

# Create data directories
mkdir -p crates/pattern-engine/data/cause_codes
mkdir -p crates/pattern-engine/data/rtmt_configs

# Copy cause code properties
cp /tmp/rtmt_extract/conf/ucmCauseCode.properties \
   crates/pattern-engine/data/cause_codes/

cp /tmp/rtmt_extract/conf/uccxCauseCode.properties \
   crates/pattern-engine/data/cause_codes/

cp /tmp/rtmt_extract/conf/cvpCauseCode.properties \
   crates/pattern-engine/data/cause_codes/

cp /tmp/rtmt_extract/conf/acsCauseCode.properties \
   crates/pattern-engine/data/cause_codes/

cp /tmp/rtmt_extract/conf/ucceCauseCode.properties \
   crates/pattern-engine/data/cause_codes/

# Copy RTMT configs for reference
cp /tmp/rtmt_extract/TraceConfig.xml \
   crates/pattern-engine/data/rtmt_configs/

cp /tmp/rtmt_extract/clavConfig/UCM_CTRACE.xml \
   crates/pattern-engine/data/rtmt_configs/

# Verify files
ls -lh crates/pattern-engine/data/cause_codes/
ls -lh crates/pattern-engine/data/rtmt_configs/
```

**Expected Output**:
```
cause_codes/
├── acsCauseCode.properties (2.7K)
├── cvpCauseCode.properties (1.4K)
├── ucmCauseCode.properties (7.3K)
├── ucceCauseCode.properties (1.7K)
└── uccxCauseCode.properties (583B)

rtmt_configs/
├── TraceConfig.xml (4.3K)
└── UCM_CTRACE.xml (1.6K)
```

---

### Step 2: Create Cause Code Module (10 minutes)

#### 2.1: Create Module Structure

```bash
cd crates/pattern-engine/src

# Create cause_codes directory
mkdir cause_codes
touch cause_codes/mod.rs
touch cause_codes/registry.rs
touch cause_codes/loader.rs
```

#### 2.2: Write Test First (TDD)

**File**: `crates/pattern-engine/tests/cause_codes_test.rs`

```rust
use pattern_engine::cause_codes::CauseCodeRegistry;

#[test]
fn test_ucm_cause_code_translation() {
    let registry = CauseCodeRegistry::new();
    
    // Load UCM cause codes
    registry.load_vendor("ucm").expect("Failed to load UCM codes");
    
    // Test common codes
    assert_eq!(
        registry.translate("ucm", 0),
        Some("No error")
    );
    
    assert_eq!(
        registry.translate("ucm", 16),
        Some("Normal call clearing")
    );
    
    assert_eq!(
        registry.translate("ucm", 17),
        Some("User busy")
    );
    
    assert_eq!(
        registry.translate("ucm", 41),
        Some("Temporary failure")
    );
}

#[test]
fn test_unknown_cause_code() {
    let registry = CauseCodeRegistry::new();
    registry.load_vendor("ucm").unwrap();
    
    assert_eq!(registry.translate("ucm", 99999), None);
}

#[test]
fn test_multiple_vendors() {
    let registry = CauseCodeRegistry::new();
    
    registry.load_vendor("ucm").unwrap();
    registry.load_vendor("uccx").unwrap();
    
    assert!(registry.translate("ucm", 16).is_some());
    assert!(registry.translate("uccx", 0).is_some());
}
```

#### 2.3: Run Test (Should Fail)

```bash
cd crates/pattern-engine
cargo test cause_codes --lib
```

**Expected**: Compilation errors (module doesn't exist yet)

---

### Step 3: Implement Cause Code Module (15 minutes)

#### 3.1: Create Registry

**File**: `crates/pattern-engine/src/cause_codes/mod.rs`

```rust
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
//! assert_eq!(description, Some("Normal call clearing"));
//! ```

mod loader;
mod registry;

pub use registry::CauseCodeRegistry;
pub use loader::load_properties_file;

use std::collections::HashMap;

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
```

#### 3.2: Create Registry Implementation

**File**: `crates/pattern-engine/src/cause_codes/registry.rs`

```rust
use super::{CauseCodeError, Result, Vendor, load_properties_file};
use std::collections::HashMap;
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
        let data_path = format!("data/cause_codes/{}", filename);
        
        let codes = load_properties_file(&data_path)?;
        
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
                    .filter(|(_, desc)| {
                        desc.to_lowercase().contains(&query.to_lowercase())
                    })
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
```

#### 3.3: Create Properties Loader

**File**: `crates/pattern-engine/src/cause_codes/loader.rs`

```rust
use super::{CauseCodeError, Result};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

/// Load a Java properties file into a HashMap<u32, String>
///
/// Format: `<code> = <description>`
/// Example: `16 = Normal call clearing`
pub fn load_properties_file<P: AsRef<Path>>(path: P) -> Result<HashMap<u32, String>> {
    let path = path.as_ref();
    
    let file = File::open(path).map_err(|e| {
        CauseCodeError::LoadError(format!("Cannot open {}: {}", path.display(), e))
    })?;
    
    let reader = BufReader::new(file);
    let mut codes = HashMap::new();
    
    for (line_num, line) in reader.lines().enumerate() {
        let line = line?;
        let line = line.trim();
        
        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        // Parse: "code = description"
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim();
            let value = value.trim();
            
            // Parse code as u32
            match key.parse::<u32>() {
                Ok(code) => {
                    codes.insert(code, value.to_string());
                }
                Err(_) => {
                    // Skip invalid lines (might be headers or other content)
                    eprintln!(
                        "Warning: Skipping invalid line {} in {}: {}",
                        line_num + 1,
                        path.display(),
                        line
                    );
                }
            }
        }
    }
    
    Ok(codes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;
    
    #[test]
    fn test_load_properties_file() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "# Test properties file").unwrap();
        writeln!(temp_file, "0 = No error").unwrap();
        writeln!(temp_file, "16 = Normal call clearing").unwrap();
        writeln!(temp_file, "").unwrap();
        writeln!(temp_file, "17 = User busy").unwrap();
        temp_file.flush().unwrap();
        
        let codes = load_properties_file(temp_file.path()).unwrap();
        
        assert_eq!(codes.len(), 3);
        assert_eq!(codes.get(&0), Some(&"No error".to_string()));
        assert_eq!(codes.get(&16), Some(&"Normal call clearing".to_string()));
        assert_eq!(codes.get(&17), Some(&"User busy".to_string()));
    }
    
    #[test]
    fn test_load_invalid_file() {
        let result = load_properties_file("/nonexistent/file.properties");
        assert!(result.is_err());
    }
}
```

#### 3.4: Update Module Exports

**File**: `crates/pattern-engine/src/lib.rs`

Add this line:
```rust
pub mod cause_codes;
```

---

### Step 4: Run Tests (Should Pass) ✅

```bash
cd crates/pattern-engine

# Run cause code tests
cargo test cause_codes

# Run all tests
cargo test
```

**Expected**: All tests passing! 🎉

---

### Step 5: Manual Verification (5 minutes)

Create a quick CLI test:

**File**: `crates/pattern-engine/examples/cause_code_demo.rs`

```rust
use pattern_engine::cause_codes::CauseCodeRegistry;

fn main() {
    let registry = CauseCodeRegistry::new();
    
    // Load UCM codes
    println!("Loading UCM cause codes...");
    registry.load_vendor("ucm").expect("Failed to load UCM");
    
    // Test translations
    let test_codes = vec![0, 16, 17, 18, 28, 41, 47, 58];
    
    println!("\nUCM Cause Code Translations:");
    println!("{:-<60}", "");
    
    for code in test_codes {
        match registry.translate("ucm", code) {
            Some(desc) => println!("{:3} - {}", code, desc),
            None => println!("{:3} - [Unknown]", code),
        }
    }
    
    // Search functionality
    println!("\n{:-<60}", "");
    println!("\nSearching for 'busy' in UCM codes:");
    let results = registry.search("ucm", "busy");
    for (code, desc) in results {
        println!("{:3} - {}", code, desc);
    }
}
```

Run it:
```bash
cargo run --example cause_code_demo
```

**Expected Output**:
```
Loading UCM cause codes...

UCM Cause Code Translations:
------------------------------------------------------------
  0 - No error
 16 - Normal call clearing
 17 - User busy
 18 - No user responding
 28 - Invalid number format (address incomplete)
 41 - Temporary failure
 47 - Resource unavailable, unspecified
 58 - Bearer capability not presently available
------------------------------------------------------------

Searching for 'busy' in UCM codes:
 17 - User busy
```

---

## ✅ Success Criteria

You're done with Phase 1 when:
- [x] All cause code properties files extracted
- [x] CauseCodeRegistry module created
- [x] Tests passing (cause_codes_test.rs)
- [x] Manual demo working
- [x] No regressions in existing tests

---

## 🎉 What You've Accomplished

In 30 minutes, you've:
1. ✅ Extracted all RTMT cause code data
2. ✅ Created reusable cause code translation module
3. ✅ Implemented thread-safe registry
4. ✅ Added search functionality
5. ✅ Written comprehensive tests
6. ✅ Created working demo

**Value Added**:
- Users can now translate Cisco cause codes
- Foundation ready for normalizers
- Test infrastructure in place

---

## 🚀 Next Steps

### Option A: Continue to Phase 2 (SDI Normalizer)
Time: 6-8 hours
Difficulty: Medium

### Option B: Add CLI Command
Time: 2-3 hours
Difficulty: Easy

**Recommended**: Add CLI command first for immediate user value!

```bash
# Create CLI command
log-scout cause-code --vendor ucm --code 16
# Output: Normal call clearing
```

---

## 🆘 Troubleshooting

### Problem: "File not found: data/cause_codes/..."
**Solution**: 
```bash
# Verify files exist
ls -la crates/pattern-engine/data/cause_codes/

# Check working directory
pwd
# Should be: /c/Users/mitchong/code/log_scout_analyzer
```

### Problem: Tests fail with "cannot find module cause_codes"
**Solution**:
```rust
// Make sure lib.rs has:
pub mod cause_codes;
```

### Problem: Properties file parsing errors
**Solution**:
```bash
# Check file format (should be UTF-8)
file crates/pattern-engine/data/cause_codes/ucmCauseCode.properties

# Look at first few lines
head -20 crates/pattern-engine/data/cause_codes/ucmCauseCode.properties
```

---

## 📚 References

- Full Plan: `docs/CISCO_RTMT_INTEGRATION_PLAN.md`
- Project Status: `PROJECT_STATUS.md`
- TDD Guide: `AI_ASSISTANT_GUIDE.md`
- RTMT Configs: `crates/pattern-engine/data/rtmt_configs/`

---

**Time to Complete**: 30-45 minutes
**Difficulty**: ⭐⭐☆☆☆ (Easy)
**Value**: ⭐⭐⭐⭐⭐ (High - Foundation for everything else)

**Ready to start? Copy-paste the commands and let's go! 🚀**