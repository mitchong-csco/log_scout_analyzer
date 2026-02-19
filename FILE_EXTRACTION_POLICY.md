# 📋 FILE TYPE EXTRACTION POLICY

**Date**: February 18, 2026  
**Status**: Current Behavior Documented  
**Issue Found**: Need extraction filter policy  

---

## 🔍 CURRENT BEHAVIOR

### **What Happens During Extraction**

#### **ALL files are extracted to disk** ✅
```rust
// In archive_extractor.rs line ~120
let mut outfile = File::create(&outpath)?;
io::copy(&mut file, &mut outfile)?;
```
**Result**: Every file in the archive is written to the extraction directory

#### **Only CERTAIN files are tracked/imported** ⚠️
```rust
// In archive_extractor.rs line ~227
fn is_log_file(path: &Path) -> bool {
    matches!(
        ext.as_str(),
        "log" | "txt" | "trace" | "out" | "err" | "xml"
    )
}
```

### **Files Currently IMPORTED to Bundle**
✅ `.log` - Log files  
✅ `.txt` - Text files  
✅ `.trace` - Trace files  
✅ `.out` - Output files  
✅ `.err` - Error files  
✅ `.xml` - XML metadata (RTMT)  

### **Files Currently EXTRACTED but NOT IMPORTED** ⚠️

These are extracted to disk but ignored:
❌ `.json` - Configuration files, diagnostic outputs  
❌ `.csv` - Report data  
❌ `.conf` - Configuration files  
❌ `.cfg` - Configuration files  
❌ `.properties` - Java properties  
❌ `.ini` - Configuration files  
❌ `.yaml` / `.yml` - Configuration files  
❌ `.pcap` / `.pcapng` - Network captures  
❌ `.cap` - Packet captures  
❌ `.bin` - Binary files  
❌ `.dat` - Data files  
❌ `.db` - Database files  
❌ `.sql` - SQL dumps  
❌ `.html` / `.htm` - Report outputs  
❌ `.pdf` - Reports  
❌ `.zip` / `.tar` / `.gz` - Nested archives (handled separately)  
❌ `.exe` / `.dll` / `.so` - Binaries  
❌ `.png` / `.jpg` / `.gif` - Images  

---

## ⚠️ POTENTIAL ISSUES

### **Issue 1: Disk Space Waste**
```
Problem: Extract 1GB archive with 500MB of useless files
Result: Waste 500MB disk space on files we never import
```

### **Issue 2: Missing Useful Files**
```
Problem: CUCM might include .json diagnostic outputs
Result: We extract them but don't import them to bundle
User Action: Manual file examination required
```

### **Issue 3: Security Risk**
```
Problem: Customer sends archive with executables
Result: We extract .exe/.dll files to disk
Risk: Potential malware if archive compromised
```

### **Issue 4: No Cleanup**
```
Problem: Extracted files stay on disk forever
Result: Disk fills up with unused files over time
```

---

## ✅ RECOMMENDED IMPROVEMENTS

### **Option 1: Smart Extraction Filter** (Recommended)

Only extract file types we actually care about:

```rust
/// Check if file should be extracted at all
fn should_extract(path: &Path) -> bool {
    let ext = path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Extract log files and useful diagnostic files
    matches!(
        ext.as_str(),
        // Log files
        "log" | "txt" | "trace" | "out" | "err" |
        // Metadata
        "xml" | "json" | "yaml" | "yml" |
        // Configuration
        "conf" | "cfg" | "properties" | "ini" |
        // Reports/Data
        "csv" | "tsv" | "html" | "htm" |
        // Network captures
        "pcap" | "pcapng" | "cap" |
        // Archives (for nested extraction)
        "zip" | "tar" | "gz" | "tgz" | "bz2"
    )
}
```

**Benefits**:
- ✅ Save disk space
- ✅ Faster extraction (skip large binaries)
- ✅ Security (no executables extracted)
- ✅ Cleaner bundle directories

### **Option 2: Extract All, Import Selectively** (Current)

Keep current behavior but document it clearly.

**Benefits**:
- ✅ Safe (don't lose any files)
- ✅ Users can manually examine extracted files

**Drawbacks**:
- ❌ Disk space waste
- ❌ Security risk
- ❌ No cleanup

### **Option 3: Configurable Extraction** (Future)

Allow users to configure which file types to extract:

```yaml
# In mongodb_connection.yaml or bundle_config.yaml
extraction:
  include_extensions:
    - log
    - txt
    - xml
    - json
    - pcap
  exclude_extensions:
    - exe
    - dll
    - bin
    - pdf
  max_file_size_mb: 500  # Skip files larger than 500MB
```

---

## 🎯 IMMEDIATE RECOMMENDATION

### **Add Extraction Filter Now**

Update `archive_extractor.rs` to:
1. Check file type before extraction
2. Skip unwanted file types
3. Log skipped files
4. Add configuration option later

### **Suggested File Type Policy**

#### **Always Extract** ✅
```
Logs: .log, .txt, .trace, .out, .err
Metadata: .xml, .json
Config: .conf, .cfg, .properties, .ini, .yaml, .yml
Reports: .csv, .html, .htm
Network: .pcap, .pcapng, .cap
Archives: .zip, .tar, .gz, .tgz, .tar.gz (for nesting)
```

#### **Never Extract** ❌
```
Executables: .exe, .dll, .so, .dylib, .bat, .sh, .ps1
Binaries: .bin, .dat (unless specific need)
Images: .png, .jpg, .gif, .bmp (unless reports)
Videos: .mp4, .avi, .mov
Office: .doc, .docx, .xls, .xlsx (unless needed)
Archives: .rar, .7z (unless we add support)
Database: .db, .sqlite, .mdb (unless specific need)
```

#### **Conditional Extract** ⚠️
```
PDFs: Only if <10MB (reports might be useful)
JSON: Always (config/diagnostic data)
SQL: Only if <50MB (diagnostic dumps)
Large files: Skip if >500MB
```

---

## 📊 IMPACT ANALYSIS

### **Average QCSONE Package** (Example)
```
Total Size: 150MB
├─ Log files: 120MB ✅ Extract (80%)
├─ XML files: 5MB ✅ Extract (3%)
├─ JSON files: 10MB ✅ Extract (7%)
├─ Screenshots: 10MB ❌ Skip (7%)
├─ PDFs: 3MB ❌ Skip (2%)
└─ Misc: 2MB ❌ Skip (1%)

With Filter:
- Extract: 135MB (90%)
- Skip: 15MB (10%)
- Time Saved: ~1-2 seconds
- Disk Saved: 15MB per bundle
```

### **With 100 Bundles**
```
Without Filter:
- Total extracted: 15GB
- Wasted disk: 1.5GB
- Wasted time: 100-200 seconds

With Filter:
- Total extracted: 13.5GB
- Wasted disk: 0GB
- Time saved: 100-200 seconds
```

---

## 🚀 IMPLEMENTATION PLAN

### **Phase 1: Add Extraction Filter** (30 minutes)

1. Add `should_extract()` function
2. Update ZIP extraction to check filter
3. Update TAR/TAR.GZ extraction to check filter
4. Add logging for skipped files

### **Phase 2: Configuration** (1 hour)

1. Add extraction policy to config file
2. Allow override per bundle
3. Add UI setting in VS Code

### **Phase 3: Cleanup** (30 minutes)

1. Add cleanup task for extracted directories
2. Remove old extraction directories after bundle import
3. Add disk space monitoring

---

## 📝 CODE CHANGES NEEDED

### **1. Add Filter Function**

```rust
/// Check if file should be extracted
fn should_extract(path: &Path) -> ExtractionDecision {
    let ext = path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let size = path.metadata().ok().map(|m| m.len()).unwrap_or(0);
    
    // Check extension whitelist
    let is_allowed = matches!(
        ext.as_str(),
        "log" | "txt" | "trace" | "out" | "err" |
        "xml" | "json" | "yaml" | "yml" |
        "conf" | "cfg" | "properties" | "ini" |
        "csv" | "html" | "htm" |
        "pcap" | "pcapng" | "cap" |
        "zip" | "tar" | "gz" | "tgz"
    );
    
    // Check size limits
    if size > 500 * 1024 * 1024 { // 500MB
        return ExtractionDecision::SkipTooLarge(size);
    }
    
    if is_allowed {
        ExtractionDecision::Extract
    } else {
        ExtractionDecision::SkipUnwantedType(ext)
    }
}

enum ExtractionDecision {
    Extract,
    SkipUnwantedType(String),
    SkipTooLarge(u64),
}
```

### **2. Update ZIP Extraction**

```rust
// Before extracting
match should_extract(&outpath) {
    ExtractionDecision::Extract => {
        // Extract as normal
        let mut outfile = File::create(&outpath)?;
        io::copy(&mut file, &mut outfile)?;
    }
    ExtractionDecision::SkipUnwantedType(ext) => {
        tracing::debug!("Skipping unwanted file type: {} (.{})", 
            outpath.display(), ext);
        continue;
    }
    ExtractionDecision::SkipTooLarge(size) => {
        tracing::warn!("Skipping large file: {} ({} MB)", 
            outpath.display(), size / 1024 / 1024);
        continue;
    }
}
```

---

## ✅ RECOMMENDED ACTION

**Implement extraction filter NOW** to:
1. Save disk space (10-15% typical)
2. Improve security (no executables)
3. Faster extraction (skip large files)
4. Cleaner bundle directories

**Time**: 30 minutes  
**Benefit**: Immediate improvement  
**Risk**: Low (can adjust whitelist easily)

---

## 📋 CURRENT STATUS

**Behavior**: Extract ALL, import SOME  
**Issue**: Disk waste, security risk  
**Recommendation**: Add extraction filter  
**Priority**: MEDIUM (not critical but beneficial)  

---

## 🎯 SUMMARY

### **What Happens Now**
```
Archive Import:
├─ Extract ALL files to disk ✅
├─ Import only .log/.txt/.trace/.out/.err/.xml ✅
└─ Leave other files on disk forever ❌
```

### **What Should Happen**
```
Archive Import:
├─ Filter file types before extraction ✅
├─ Extract only useful files ✅
├─ Skip executables/images/etc ✅
├─ Import all extracted files ✅
└─ Cleanup extraction directory after import ✅
```

**Ready to implement extraction filter?** I can add it now! 🚀
