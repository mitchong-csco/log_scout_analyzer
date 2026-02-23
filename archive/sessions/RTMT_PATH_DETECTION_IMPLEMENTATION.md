# 🔧 RTMT Path Detection System - Implementation Guide

**Status**: Ready to Implement  
**Based On**: Real-world data from 41 RTMT archives (Ford CUCM)  
**Purpose**: Accurate service detection from log file paths  

---

## 🎯 Overview

This guide provides **production-ready code** for implementing path-based service detection in Log Scout Analyzer. The patterns are learned from actual CUCM deployments.

---

## 📦 Architecture

```
┌─────────────────────────────────────────────────────────┐
│  RTMT Archive Import                                    │
│  (ZIP files with logs)                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Path Extractor                                         │
│  - Extract all file paths from archive                 │
│  - Normalize path separators (\ → /)                   │
│  - Remove leading/trailing slashes                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Path Detector (Multi-Level)                           │
│  1. Unique Signature Check (100% confidence)           │
│  2. Composite Path Match (95% confidence)              │
│  3. Base Path + Extension (85% confidence)             │
│  4. Filename Pattern (70% confidence)                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Service Aggregation                                    │
│  - Vote-based detection from multiple paths            │
│  - Confidence scoring                                  │
│  - Service categorization                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  UI Display                                             │
│  - Organized service tree                              │
│  - Confidence indicators                               │
│  - Component grouping                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Data Structure

### Path Signature Database

```typescript
// File: lsp-server/src/detection/path_signatures.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathSignatureDatabase {
    pub version: String,
    pub signatures: HashMap<String, ServiceSignature>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceSignature {
    /// Unique path components that identify this service (100% confidence)
    pub unique_identifiers: Vec<String>,
    
    /// Path patterns that strongly suggest this service (95% confidence)
    pub strong_patterns: Vec<PathPattern>,
    
    /// Base paths where this service logs appear
    pub base_paths: Vec<String>,
    
    /// File extensions used by this service
    pub extensions: Vec<String>,
    
    /// Example file paths for reference
    pub examples: Vec<String>,
    
    /// Overall confidence level
    pub confidence: ConfidenceLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathPattern {
    /// Pattern to match (supports wildcards)
    pub pattern: String,
    
    /// Required components that must all be present
    pub required_components: Vec<String>,
    
    /// Confidence when this pattern matches
    pub confidence: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum ConfidenceLevel {
    VeryHigh, // 95-100%
    High,     // 85-94%
    Medium,   // 70-84%
    Low,      // 50-69%
    Unknown,  // < 50%
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceDetection {
    /// Detected service name
    pub service: String,
    
    /// Confidence score (0-100)
    pub confidence: u8,
    
    /// Service category (Web, Core, Platform, System)
    pub category: ServiceCategory,
    
    /// Paths that contributed to this detection
    pub matching_paths: Vec<String>,
    
    /// Detection method used
    pub method: DetectionMethod,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceCategory {
    CallManagerCore,
    WebServices,
    PlatformServices,
    SystemLogs,
    AuditLogs,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DetectionMethod {
    UniqueSignature,
    CompositePattern,
    BasePathContext,
    FilenamePattern,
    BundleAggregation,
}
```

---

## 🔍 Core Detection Algorithm

```rust
// File: lsp-server/src/detection/path_detector.rs

use std::path::Path;
use regex::Regex;

pub struct PathDetector {
    signatures: PathSignatureDatabase,
    cache: HashMap<String, ServiceDetection>,
}

impl PathDetector {
    pub fn new(signatures: PathSignatureDatabase) -> Self {
        Self {
            signatures,
            cache: HashMap::new(),
        }
    }

    /// Detect service from a single file path
    pub fn detect(&mut self, path: &str) -> ServiceDetection {
        // Check cache first
        if let Some(cached) = self.cache.get(path) {
            return cached.clone();
        }

        // Normalize path
        let normalized = self.normalize_path(path);

        // Level 1: Check unique signatures (fastest, highest confidence)
        if let Some(detection) = self.check_unique_signatures(&normalized) {
            self.cache.insert(path.to_string(), detection.clone());
            return detection;
        }

        // Level 2: Check composite patterns
        if let Some(detection) = self.check_composite_patterns(&normalized) {
            self.cache.insert(path.to_string(), detection.clone());
            return detection;
        }

        // Level 3: Check base path + extension
        if let Some(detection) = self.check_base_path_context(&normalized) {
            self.cache.insert(path.to_string(), detection.clone());
            return detection;
        }

        // Level 4: Filename pattern matching
        if let Some(detection) = self.check_filename_patterns(&normalized) {
            self.cache.insert(path.to_string(), detection.clone());
            return detection;
        }

        // Default: Unknown
        ServiceDetection {
            service: "Unknown".to_string(),
            confidence: 0,
            category: ServiceCategory::Unknown,
            matching_paths: vec![path.to_string()],
            method: DetectionMethod::BundleAggregation,
        }
    }

    /// Normalize path for consistent matching
    fn normalize_path(&self, path: &str) -> String {
        path.replace('\\', "/")
            .trim_start_matches('/')
            .trim_end_matches('/')
            .to_lowercase()
    }

    /// Level 1: Check for unique service identifiers
    fn check_unique_signatures(&self, path: &str) -> Option<ServiceDetection> {
        for (service_name, signature) in &self.signatures.signatures {
            for identifier in &signature.unique_identifiers {
                if path.contains(identifier) {
                    return Some(ServiceDetection {
                        service: service_name.clone(),
                        confidence: 100,
                        category: self.categorize_service(service_name),
                        matching_paths: vec![path.to_string()],
                        method: DetectionMethod::UniqueSignature,
                    });
                }
            }
        }
        None
    }

    /// Level 2: Check composite path patterns
    fn check_composite_patterns(&self, path: &str) -> Option<ServiceDetection> {
        for (service_name, signature) in &self.signatures.signatures {
            for pattern in &signature.strong_patterns {
                if self.matches_pattern(path, pattern) {
                    return Some(ServiceDetection {
                        service: service_name.clone(),
                        confidence: pattern.confidence,
                        category: self.categorize_service(service_name),
                        matching_paths: vec![path.to_string()],
                        method: DetectionMethod::CompositePattern,
                    });
                }
            }
        }
        None
    }

    /// Level 3: Base path + file extension context
    fn check_base_path_context(&self, path: &str) -> Option<ServiceDetection> {
        // Extract file extension
        let ext = Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_lowercase());

        for (service_name, signature) in &self.signatures.signatures {
            for base_path in &signature.base_paths {
                if path.starts_with(base_path) {
                    // If extension matches, higher confidence
                    let confidence = if let Some(ref ext) = ext {
                        if signature.extensions.contains(ext) {
                            90
                        } else {
                            85
                        }
                    } else {
                        85
                    };

                    return Some(ServiceDetection {
                        service: service_name.clone(),
                        confidence,
                        category: self.categorize_service(service_name),
                        matching_paths: vec![path.to_string()],
                        method: DetectionMethod::BasePathContext,
                    });
                }
            }
        }
        None
    }

    /// Level 4: Filename pattern matching
    fn check_filename_patterns(&self, path: &str) -> Option<ServiceDetection> {
        let filename = Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        // Known filename patterns
        let patterns = vec![
            ("catalina.out", "Cisco Tomcat", 80),
            ("localhost_access_log.txt", "Tomcat Component", 75),
            ("hostagt.log", "Host Resources Agent", 75),
            ("vos-audit.log", "VOS Audit", 80),
        ];

        for (pattern, service, confidence) in patterns {
            if filename.contains(pattern) {
                return Some(ServiceDetection {
                    service: service.to_string(),
                    confidence,
                    category: self.categorize_service(service),
                    matching_paths: vec![path.to_string()],
                    method: DetectionMethod::FilenamePattern,
                });
            }
        }

        None
    }

    /// Match path against pattern with required components
    fn matches_pattern(&self, path: &str, pattern: &PathPattern) -> bool {
        // Check if all required components are present
        pattern.required_components.iter().all(|comp| path.contains(comp))
    }

    /// Categorize service into broad categories
    fn categorize_service(&self, service: &str) -> ServiceCategory {
        let service_lower = service.to_lowercase();
        
        if service_lower.contains("tomcat") || service_lower.contains("axl") 
            || service_lower.contains("uds") || service_lower.contains("soap")
            || service_lower.contains("ssosp") || service_lower.contains("web") {
            ServiceCategory::WebServices
        } else if service_lower.contains("platform") || service_lower.contains("snmp")
            || service_lower.contains("drf") || service_lower.contains("cert") {
            ServiceCategory::PlatformServices
        } else if service_lower.contains("syslog") || service_lower.contains("messages")
            || service_lower.contains("secure") || service_lower.contains("ntp") {
            ServiceCategory::SystemLogs
        } else if service_lower.contains("audit") {
            ServiceCategory::AuditLogs
        } else if service_lower.contains("cm") || service_lower.contains("ris")
            || service_lower.contains("amc") || service_lower.contains("dbl") {
            ServiceCategory::CallManagerCore
        } else {
            ServiceCategory::Unknown
        }
    }

    /// Detect service from bundle of paths (aggregate detection)
    pub fn detect_from_bundle(&mut self, paths: &[String]) -> ServiceDetection {
        let mut service_votes: HashMap<String, (u64, Vec<String>)> = HashMap::new();

        // Each path votes for its detected service
        for path in paths {
            let detection = self.detect(path);
            let entry = service_votes.entry(detection.service.clone())
                .or_insert((0, Vec::new()));
            entry.0 += detection.confidence as u64;
            entry.1.push(path.clone());
        }

        // Find service with highest total confidence
        let winner = service_votes.iter()
            .max_by_key(|(_, (score, _))| score)
            .map(|(service, (score, paths))| {
                ServiceDetection {
                    service: service.clone(),
                    confidence: (*score / paths.len() as u64).min(100) as u8,
                    category: self.categorize_service(service),
                    matching_paths: paths.clone(),
                    method: DetectionMethod::BundleAggregation,
                }
            })
            .unwrap_or_else(|| ServiceDetection {
                service: "Unknown".to_string(),
                confidence: 0,
                category: ServiceCategory::Unknown,
                matching_paths: Vec::new(),
                method: DetectionMethod::BundleAggregation,
            });

        winner
    }
}
```

---

## 📋 Signature Database JSON

```json
{
  "version": "2.0",
  "signatures": {
    "AXL Tomcat": {
      "unique_identifiers": [
        "/axl-tomcat/"
      ],
      "strong_patterns": [
        {
          "pattern": "active/tomcat/logs/axl-tomcat/*",
          "required_components": ["active", "tomcat", "axl-tomcat"],
          "confidence": 100
        }
      ],
      "base_paths": [
        "active/tomcat/logs",
        "l/thirdparty/jakarta-tomcat/logs"
      ],
      "extensions": ["log", "txt"],
      "examples": [
        "active/tomcat/logs/axl-tomcat/localhost_access_log.txt",
        "l/thirdparty/jakarta-tomcat/logs/axl-tomcat/manager.2026-02-23.log"
      ],
      "confidence": "VeryHigh"
    },
    "UDS Tomcat": {
      "unique_identifiers": [
        "/uds-tomcat/"
      ],
      "strong_patterns": [
        {
          "pattern": "*/uds-tomcat/*",
          "required_components": ["uds-tomcat"],
          "confidence": 100
        }
      ],
      "base_paths": [
        "active/tomcat/logs",
        "l/thirdparty/jakarta-tomcat/logs"
      ],
      "extensions": ["log", "txt"],
      "examples": [
        "l/thirdparty/jakarta-tomcat/logs/uds-tomcat/localhost_access_log.txt"
      ],
      "confidence": "VeryHigh"
    },
    "SSOSP Tomcat": {
      "unique_identifiers": [
        "/ssosp-tomcat/"
      ],
      "strong_patterns": [
        {
          "pattern": "*/ssosp-tomcat/*",
          "required_components": ["ssosp-tomcat"],
          "confidence": 100
        }
      ],
      "base_paths": [
        "l/thirdparty/jakarta-tomcat/logs"
      ],
      "extensions": ["log", "txt"],
      "examples": [
        "l/thirdparty/jakarta-tomcat/logs/ssosp-tomcat/localhost_access_log.txt"
      ],
      "confidence": "VeryHigh"
    },
    "Security Logs": {
      "unique_identifiers": [
        "/security/log4j/"
      ],
      "strong_patterns": [
        {
          "pattern": "active/tomcat/logs/security/log4j/*",
          "required_components": ["security", "log4j"],
          "confidence": 100
        }
      ],
      "base_paths": [
        "active/tomcat/logs/security"
      ],
      "extensions": ["log"],
      "examples": [
        "active/tomcat/logs/security/log4j/securityaxl.log",
        "active/tomcat/logs/security/log4j/security.log"
      ],
      "confidence": "VeryHigh"
    },
    "RIS Data Collector": {
      "unique_identifiers": [],
      "strong_patterns": [
        {
          "pattern": "active/cm/trace/ris/sdi/*",
          "required_components": ["cm", "trace", "ris", "sdi"],
          "confidence": 95
        }
      ],
      "base_paths": [
        "active/cm/trace/ris"
      ],
      "extensions": ["txt"],
      "examples": [
        "active/cm/trace/ris/sdi/ris00000001.txt"
      ],
      "confidence": "VeryHigh"
    },
    "SOAP Web Service": {
      "unique_identifiers": [
        "/soap/"
      ],
      "strong_patterns": [
        {
          "pattern": "active/tomcat/logs/soap/*",
          "required_components": ["tomcat", "soap"],
          "confidence": 100
        }
      ],
      "base_paths": [
        "active/tomcat/logs/soap"
      ],
      "extensions": ["log", "csv"],
      "examples": [
        "active/tomcat/logs/soap/log4j/soap.log"
      ],
      "confidence": "VeryHigh"
    },
    "Platform Services": {
      "unique_identifiers": [],
      "strong_patterns": [
        {
          "pattern": "active/platform/*",
          "required_components": ["active", "platform"],
          "confidence": 85
        }
      ],
      "base_paths": [
        "active/platform/log",
        "active/platform/drf",
        "active/platform/snmp"
      ],
      "extensions": ["log"],
      "examples": [
        "active/platform/log/cli-auto1c.log"
      ],
      "confidence": "High"
    },
    "System Logs": {
      "unique_identifiers": [
        "/syslog/messages",
        "/syslog/secure"
      ],
      "strong_patterns": [
        {
          "pattern": "active/syslog/*",
          "required_components": ["syslog"],
          "confidence": 90
        }
      ],
      "base_paths": [
        "active/syslog"
      ],
      "extensions": ["log"],
      "examples": [
        "active/syslog/messages",
        "active/syslog/secure"
      ],
      "confidence": "VeryHigh"
    }
  }
}
```

---

## 🔧 Integration with Bundle Manager

```rust
// File: lsp-server/src/bundle/detection.rs

use crate::detection::{PathDetector, PathSignatureDatabase, ServiceDetection};
use std::path::PathBuf;

pub struct BundleDetector {
    path_detector: PathDetector,
}

impl BundleDetector {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Load signature database
        let signatures_json = include_str!("../../../config/path_signatures.json");
        let signatures: PathSignatureDatabase = serde_json::from_str(signatures_json)?;
        
        Ok(Self {
            path_detector: PathDetector::new(signatures),
        })
    }

    /// Detect service from bundle paths
    pub fn detect_bundle_service(&mut self, bundle_path: &PathBuf) -> Vec<ServiceDetection> {
        let mut detections = Vec::new();

        // Extract all file paths from bundle
        if let Ok(paths) = self.extract_paths_from_bundle(bundle_path) {
            // Individual path detections
            for path in &paths {
                let detection = self.path_detector.detect(path);
                if detection.confidence >= 70 {
                    detections.push(detection);
                }
            }

            // Bundle-level aggregation
            let bundle_detection = self.path_detector.detect_from_bundle(&paths);
            if bundle_detection.confidence >= 80 {
                detections.insert(0, bundle_detection);
            }
        }

        detections
    }

    fn extract_paths_from_bundle(&self, bundle_path: &PathBuf) -> Result<Vec<String>, std::io::Error> {
        let mut paths = Vec::new();
        
        // Walk through bundle directory
        for entry in std::fs::read_dir(bundle_path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_file() {
                if let Some(path_str) = path.to_str() {
                    paths.push(path_str.to_string());
                }
            }
        }

        Ok(paths)
    }
}
```

---

## 🎨 UI Integration (VSCode Extension)

```typescript
// File: vscode-extension/src/detection/pathDetector.ts

interface ServiceDetection {
    service: string;
    confidence: number;
    category: string;
    matchingPaths: string[];
    method: string;
}

export class PathDetector {
    private signatures: any;

    constructor() {
        // Load signatures from LSP
        this.loadSignatures();
    }

    async detectService(paths: string[]): Promise<ServiceDetection[]> {
        // Send to LSP for detection
        const response = await this.lspClient.sendRequest('logScout/detectService', {
            paths: paths
        });
        
        return response.detections;
    }

    async loadSignatures(): Promise<void> {
        const response = await this.lspClient.sendRequest('logScout/getSignatures', {});
        this.signatures = response.signatures;
    }

    // Client-side quick detection for UI responsiveness
    quickDetect(path: string): string {
        const normalized = path.toLowerCase().replace(/\\/g, '/');
        
        // Quick unique identifier checks
        if (normalized.includes('/axl-tomcat/')) return '🔷 AXL Tomcat';
        if (normalized.includes('/uds-tomcat/')) return '👥 UDS Tomcat';
        if (normalized.includes('/ssosp-tomcat/')) return '🔐 SSOSP Tomcat';
        if (normalized.includes('/security/log4j/')) return '🔒 Security Logs';
        if (normalized.includes('/soap/')) return '🌐 SOAP Web Service';
        if (normalized.includes('/cm/trace/ris/')) return '📊 RIS Data Collector';
        if (normalized.includes('/platform/')) return '⚙️ Platform Services';
        if (normalized.includes('/syslog/')) return '🗂️ System Logs';
        
        return '📄 Log File';
    }
}
```

---

## 📊 Bundle Panel Display

```typescript
// File: vscode-extension/src/providers/bundleTreeProvider.ts

export class BundleTreeProvider {
    private detector: PathDetector;

    async getChildren(element?: BundleTreeItem): Promise<BundleTreeItem[]> {
        if (!element) {
            // Root level - show bundles
            return this.getBundles();
        }

        if (element.type === 'bundle') {
            // Detect services in bundle
            const paths = await this.getBundlePaths(element.bundlePath);
            const detections = await this.detector.detectService(paths);
            
            // Group by service category
            return this.groupByCategory(detections);
        }

        if (element.type === 'category') {
            // Show services in this category
            return this.getServicesInCategory(element);
        }

        if (element.type === 'service') {
            // Show files for this service
            return this.getServiceFiles(element);
        }

        return [];
    }

    private groupByCategory(detections: ServiceDetection[]): BundleTreeItem[] {
        const categories = new Map<string, ServiceDetection[]>();

        for (const detection of detections) {
            const category = detection.category;
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            categories.get(category)!.push(detection);
        }

        const items: BundleTreeItem[] = [];
        
        // Sort categories by importance
        const order = [
            'CallManagerCore',
            'WebServices', 
            'PlatformServices',
            'SystemLogs',
            'AuditLogs'
        ];

        for (const category of order) {
            if (categories.has(category)) {
                const services = categories.get(category)!;
                const totalFiles = services.reduce((sum, s) => sum + s.matchingPaths.length, 0);
                
                items.push(new BundleTreeItem(
                    `${this.getCategoryIcon(category)} ${category} (${services.length} services, ${totalFiles} files)`,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'category',
                    { category, services }
                ));
            }
        }

        return items;
    }

    private getCategoryIcon(category: string): string {
        const icons = {
            'CallManagerCore': '📞',
            'WebServices': '🌐',
            'PlatformServices': '⚙️',
            'SystemLogs': '🗂️',
            'AuditLogs': '🔍'
        };
        return icons[category] || '📄';
    }

    private getConfidenceIcon(confidence: number): string {
        if (confidence >= 95) return '🟢';
        if (confidence >= 85) return '🟡';
        if (confidence >= 70) return '🟠';
        return '🔴';
    }
}
```

---

## 🧪 Testing Strategy

```rust
// File: lsp-server/tests/path_detection_tests.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_axl_tomcat_detection() {
        let mut detector = create_test_detector();
        
        let paths = vec![
            "active/tomcat/logs/axl-tomcat/localhost_access_log.txt".to_string(),
            "l/thirdparty/jakarta-tomcat/logs/axl-tomcat/manager.2026-02-23.log".to_string(),
        ];

        for path in paths {
            let detection = detector.detect(&path);
            assert_eq!(detection.service, "AXL Tomcat");
            assert_eq!(detection.confidence, 100);
            assert_eq!(detection.method, DetectionMethod::UniqueSignature);
        }
    }

    #[test]
    fn test_ris_collector_detection() {
        let mut detector = create_test_detector();
        
        let path = "active/cm/trace/ris/sdi/ris00000001.txt";
        let detection = detector.detect(path);
        
        assert_eq!(detection.service, "RIS Data Collector");
        assert!(detection.confidence >= 95);
    }

    #[test]
    fn test_bundle_aggregation() {
        let mut detector = create_test_detector();
        
        let paths = vec![
            "active/tomcat/logs/axl-tomcat/localhost_access_log.txt".to_string(),
            "active/tomcat/logs/uds-tomcat/manager.log".to_string(),
            "active/tomcat/logs/security/log4j/securityaxl.log".to_string(),
            "active/tomcat/logs/catalina.out".to_string(),
        ];

        let detection = detector.detect_from_bundle(&paths);
        
        // Should detect as CUCM with high confidence
        assert!(detection.confidence >= 90);
        assert_eq!(detection.matching_paths.len(), 4);
    }

    #[test]
    fn test_unknown_path() {
        let mut detector = create_test_detector();
        
        let path = "some/random/path/to/file.log";
        let detection = detector.detect(path);
        
        assert_eq!(detection.service, "Unknown");
        assert_eq!(detection.confidence, 0);
    }

    fn create_test_detector() -> PathDetector {
        let signatures = load_test_signatures();
        PathDetector::new(signatures)
    }
}
```

---

## 🚀 Deployment Checklist

- [ ] **Add signature database**: Copy `path_signatures.json` to `config/`
- [ ] **Implement PathDetector**: Add `lsp-server/src/detection/path_detector.rs`
- [ ] **Update BundleManager**: Integrate detection on bundle import
- [ ] **Add LSP commands**:
  - [ ] `logScout/detectService` - Detect from paths
  - [ ] `logScout/getSignatures` - Get signature database
  - [ ] `logScout/learnFromArchive` - Add new patterns
- [ ] **Update UI**:
  - [ ] Bundle tree grouping by service category
  - [ ] Confidence indicators
  - [ ] Service icons
- [ ] **Add tests**: Path detection unit tests
- [ ] **Documentation**: Update user guide with service detection

---

## 📈 Performance Optimization

### Caching Strategy

```rust
use lru::LruCache;

pub struct CachedPathDetector {
    detector: PathDetector,
    cache: LruCache<String, ServiceDetection>,
}

impl CachedPathDetector {
    pub fn new(detector: PathDetector) -> Self {
        Self {
            detector,
            cache: LruCache::new(1000), // Cache 1000 recent detections
        }
    }

    pub fn detect(&mut self, path: &str) -> ServiceDetection {
        if let Some(cached) = self.cache.get(path) {
            return cached.clone();
        }

        let detection = self.detector.detect(path);
        self.cache.put(path.to_string(), detection.clone());
        detection
    }
}
```

### Batch Processing

```rust
pub fn detect_batch(&mut self, paths: &[String]) -> Vec<ServiceDetection> {
    paths.par_iter()  // Use rayon for parallel processing
        .map(|path| self.detect(path))
        .collect()
}
```

---

## 📊 Metrics & Monitoring

```rust
#[derive(Debug, Default)]
pub struct DetectionMetrics {
    pub total_detections: u64,
    pub high_confidence: u64,  // >= 95%
    pub medium_confidence: u64, // 70-94%
    pub low_confidence: u64,    // < 70%
    pub cache_hits: u64,
    pub cache_misses: u64,
}

impl PathDetector {
    pub fn get_metrics(&self) -> DetectionMetrics {
        // Return current metrics
    }
}
```

---

## 🔄 Continuous Learning

```rust
pub struct LearningSystem {
    detector: PathDetector,
    new_patterns: HashMap<String, Vec<String>>,
}

impl LearningSystem {
    /// Learn new patterns from user-corrected detections
    pub fn learn_from_correction(&mut self, path: &str, correct_service: &str) {
        self.new_patterns
            .entry(correct_service.to_string())
            .or_insert_with(Vec::new)
            .push(path.to_string());
        
        // After N corrections, update signature database
        if self.new_patterns.len() >= 10 {
            self.update_signatures();
        }
    }

    fn update_signatures(&mut self) {
        // Analyze new patterns and update database
    }
}
```

---

## ✅ Success Criteria

- [ ] **Accuracy**: >= 95% for unique signatures
- [ ] **Performance**: < 1ms per path detection
- [ ] **Coverage**: Detects all 41 Ford CUCM services
- [ ] **Scalability**: Handles bundles with 10,000+ files
- [ ] **Reliability**: Graceful fallback for unknown paths

---

**Version**: 1.0  
**Status**: Ready for Implementation  
**Est. Development Time**: 2-3 days  
**Dependencies**: serde, regex, lru (Rust); none (TypeScript)