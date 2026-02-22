# Integration Plan: Hybrid Normalization with Signatures, Actions, and Scenarios

**Project**: Log Scout Analyzer  
**Date**: 2024-02-19  
**Status**: Planning Phase  
**Architecture**: Progressive Normalization + Pattern Overrides + Multi-Vendor Support  

---

## 📋 Executive Summary

This plan integrates a **progressive normalization strategy** into the existing Log Scout Analyzer project. The system will:

1. **Start fast** with raw pattern matching (existing capability)
2. **Normalize selectively** when multi-vendor scenarios are detected
3. **Use pattern overrides** to handle vendor-specific log formats
4. **Support signatures, actions, and scenarios** for complex analysis
5. **Maintain backward compatibility** with existing patterns

### Key Principles

✅ **No Breaking Changes** - All existing patterns continue to work  
✅ **Progressive Enhancement** - Add normalization layer on top  
✅ **Vendor Detection** - Automatic format identification  
✅ **Performance First** - Raw matching by default, normalize when needed  
✅ **User Control** - YAML configuration for everything  

---

## 🎯 Goals

### Primary Goals
1. Support multi-vendor SIP log analysis (CUBE, CUCM, CUP Proxy, Jabber, CUC)
2. Enable cross-vendor correlation (same Call-ID across different systems)
3. Maintain existing pattern matching performance
4. Provide declarative pattern override system
5. Support signatures, actions, and scenarios

### Secondary Goals
1. Add vendor format auto-detection
2. Enable runtime normalization hints (learning system)
3. Provide tooling for testing patterns across vendors
4. Create migration path for existing patterns

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Log Input Layer                           │
│  (Raw logs from LogDNA, files, archives)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Format Detection Layer (NEW)                    │
│  • Vendor signature detection                                │
│  • Format identification (CUBE, CUCM, Jabber, etc.)         │
│  • Confidence scoring                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│           Progressive Processing Pipeline (NEW)              │
│                                                              │
│  Fast Path:                                                  │
│  ┌──────────────────────────────────────────────┐          │
│  │ 1. Try raw pattern matching                  │          │
│  │ 2. Check normalization hints                 │          │
│  │ 3. If single vendor or simple → DONE         │          │
│  └──────────────────────────────────────────────┘          │
│                     │                                        │
│                     ↓ (if multi-vendor)                     │
│  Normalization Path:                                        │
│  ┌──────────────────────────────────────────────┐          │
│  │ 1. Select vendor normalizer                  │          │
│  │ 2. Parse vendor-specific format              │          │
│  │ 3. Convert to normalized event               │          │
│  │ 4. Match patterns on normalized data         │          │
│  └──────────────────────────────────────────────┘          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Pattern Matching with Overrides (ENHANCED)           │
│  • Base patterns (existing)                                  │
│  • Raw extraction overrides (NEW)                           │
│  • Normalized extraction overrides (NEW)                    │
│  • Vendor-specific overrides (NEW)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│        Signature/Action/Scenario Engine (NEW)                │
│  • Signature matching                                        │
│  • Action execution                                          │
│  • Scenario state tracking                                  │
│  • Cross-vendor correlation                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                    Output Layer                              │
│  • Diagnostics, Timeline, Scout Console, Metrics            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Phase 1: Foundation (Week 1-2)

### 1.1 Create Normalized Event Schema

**File**: `crates/core/src/normalized_event.rs`

**Purpose**: Define the standard schema that all vendors normalize to.

**Implementation**:
```rust
// Core normalized event structure
pub struct NormalizedEvent {
    pub event_type: String,
    pub timestamp: DateTime<Utc>,
    
    // For SIP events
    pub sip_message: Option<SIPMessage>,
    
    // Network context
    pub network: NetworkContext,
    
    // System context
    pub system: SystemContext,
    
    // Vendor info
    pub vendor: VendorInfo,
    
    // Raw data
    pub raw: RawData,
}

pub struct SIPMessage {
    pub method: Option<String>,
    pub status_code: Option<u16>,
    pub headers: SIPHeaders,
}

pub struct SIPHeaders {
    pub call_id: Option<String>,
    pub from: Option<SIPAddress>,
    pub to: Option<SIPAddress>,
    pub via: Vec<ViaHeader>,
    pub cseq: Option<CSeq>,
    pub contact: Option<String>,
}

pub struct NetworkContext {
    pub source_ip: Option<String>,
    pub source_port: Option<u16>,
    pub destination_ip: Option<String>,
    pub destination_port: Option<u16>,
    pub protocol: Option<String>,
    pub direction: Option<Direction>,
}

pub struct VendorInfo {
    pub vendor_type: String,
    pub product: Option<String>,
    pub version: Option<String>,
    pub metadata: HashMap<String, String>,
}
```

**Testing**:
- Unit tests for serialization/deserialization
- Property-based tests for schema validation

**Dependencies**: `chrono`, `serde`, `serde_json`

**Deliverables**:
- [ ] `normalized_event.rs` with complete schema
- [ ] Unit tests with 80%+ coverage
- [ ] Documentation with examples

---

### 1.2 Create Vendor Format Detection

**File**: `crates/pattern-engine/src/vendor_detection.rs`

**Purpose**: Detect which vendor/product produced a log line.

**Implementation**:
```rust
pub struct VendorDetector {
    signatures: HashMap<String, VendorSignature>,
}

pub struct VendorSignature {
    pub vendor_id: String,
    pub name: String,
    pub patterns: Vec<String>,  // Regex patterns
    pub confidence_threshold: f32,
}

impl VendorDetector {
    pub fn detect(&self, log_sample: &str) -> Option<VendorMatch> {
        // Check each vendor's signatures
        // Return best match above threshold
    }
    
    pub fn quick_detect(&self, log_sample: &str) -> Option<String> {
        // Fast heuristic detection
    }
}

pub struct VendorMatch {
    pub vendor_id: String,
    pub confidence: f32,
    pub matched_signatures: Vec<String>,
}
```

**Configuration**: `config/vendor_signatures.yaml`
```yaml
vendors:
  cisco_cube:
    name: "Cisco IOS/CUBE"
    signatures:
      - pattern: "ccsipDisplayMsg:"
        weight: 0.9
      - pattern: "/SIP/Msg/"
        weight: 0.8
      - pattern: '\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\.\d{3}'
        weight: 0.5
    confidence_threshold: 0.7
  
  cisco_cucm:
    name: "Cisco Unified Call Manager"
    signatures:
      - pattern: '\|SIPTcp\|'
        weight: 0.95
      - pattern: '\|AppId=Cisco CallManager\|'
        weight: 0.9
    confidence_threshold: 0.8
  
  cisco_jabber:
    name: "Cisco Jabber Client"
    signatures:
      - pattern: 'CSFClient\['
        weight: 0.9
      - pattern: '\|SIP_MSG_RECV\|'
        weight: 0.85
    confidence_threshold: 0.75
  
  cisco_cuc:
    name: "Cisco Unity Connection"
    signatures:
      - pattern: '\[CUC-'
        weight: 0.95
      - pattern: 'SIP\.Stack'
        weight: 0.8
    confidence_threshold: 0.8
```

**Testing**:
- Test with real log samples from each vendor
- Benchmark detection performance (<5ms)
- Validate confidence scoring

**Dependencies**: `regex`, `serde`, `serde_yaml`

**Deliverables**:
- [ ] `vendor_detection.rs` implementation
- [ ] `vendor_signatures.yaml` configuration
- [ ] Test suite with real vendor logs
- [ ] Performance benchmarks

---

### 1.3 Enhance Pattern Override System

**File**: `crates/pattern-loader/src/override_manager.rs` (ENHANCE EXISTING)

**Current State**: Basic pattern overrides (severity, annotation, enabled)

**Enhancements Needed**:
```rust
pub struct PatternOverride {
    pub id: String,
    pub extends: Option<String>,  // NEW: Base pattern to extend
    pub override_type: OverrideType,  // NEW: Type of override
    
    // Existing fields
    pub enabled: Option<bool>,
    pub severity_override: Option<String>,
    pub annotation_override: Option<String>,
    
    // NEW: Extraction overrides
    pub extraction: Option<ExtractionOverride>,
    
    // NEW: Vendor-specific conditions
    pub apply_when: Option<OverrideCondition>,
}

pub enum OverrideType {
    ExtractionRaw,
    ExtractionNormalized,
    VendorSpecific,
    General,
}

pub struct ExtractionOverride {
    pub mode: ExtractionMode,
    pub fields: HashMap<String, FieldExtraction>,
}

pub enum ExtractionMode {
    RawRegex,
    NormalizedPath,
}

pub struct FieldExtraction {
    pub pattern: Option<String>,  // Regex for raw
    pub path: Option<String>,     // JSON path for normalized
    pub transform: Vec<Transform>,
    pub optional: bool,
}

pub struct OverrideCondition {
    pub vendor_detected: Option<String>,
    pub format_match: Option<String>,
}
```

**Directory Structure**:
```
patterns/
├── base/
│   ├── sip_invite.yaml          # Base pattern definition
│   ├── sip_100_trying.yaml
│   └── sip_200_ok.yaml
│
├── overrides/
│   ├── raw/
│   │   ├── sip_invite.yaml      # Raw extraction rules
│   │   └── sip_100_trying.yaml
│   │
│   ├── normalized/
│   │   ├── sip_invite.yaml      # Normalized extraction rules
│   │   └── sip_100_trying.yaml
│   │
│   └── vendors/
│       ├── cisco_cube/
│       │   └── sip_invite.yaml  # CUBE-specific tweaks
│       ├── cisco_cucm/
│       │   └── sip_invite.yaml  # CUCM-specific tweaks
│       └── cisco_cuc/
│           └── sip_invite.yaml  # CUC-specific tweaks
```

**Example Base Pattern**:
```yaml
# patterns/base/sip_invite.yaml
pattern_name: "sip_invite"
namespace: "sip"
description: "Detects SIP INVITE messages (RFC 3261)"

signature:
  event_type: "sip_invite"
  method: "INVITE"

extract:
  - field: "call_id"
    description: "Unique call identifier"
    type: "string"
    required: true
  
  - field: "from_uri"
    description: "Caller SIP URI"
    type: "string"
    required: true
  
  - field: "to_uri"
    description: "Callee SIP URI"
    type: "string"
    required: true

normalization:
  strategy: "adaptive"
  trigger: "on_multi_vendor"
```

**Example Raw Override**:
```yaml
# patterns/overrides/raw/sip_invite.yaml
extends: "base.sip_invite"
override_type: "extraction_raw"

extraction:
  mode: "raw_regex"
  
  quick_match:
    pattern: "INVITE sip:"
    confidence: 0.9
  
  fields:
    call_id:
      pattern: "Call-ID:\\s*([^\\r\\n]+)"
      group: 1
    
    from_uri:
      pattern: "From:.*?<sip:([^>]+)>"
      group: 1
    
    to_uri:
      pattern: "To:.*?<sip:([^>]+)>"
      group: 1
```

**Example Vendor Override**:
```yaml
# patterns/overrides/vendors/cisco_cucm/sip_invite.yaml
extends: "base.sip_invite"
extends_override: "raw.sip_invite"
override_type: "vendor_specific"
vendor: "cisco_cucm"

extraction:
  mode: "raw_regex"
  
  context:
    metadata_section:
      pattern: "\\|(.+?)\\|"
      parse: "pipe_delimited"
  
  fields:
    call_id:
      inherit: true
    
    from_uri:
      inherit: true
    
    to_uri:
      inherit: true
    
    source_ip:
      source: "context.metadata_section"
      key: "RemoteAddr"
      pattern: "RemoteAddr=([0-9.]+):\\d+"
      group: 1
    
    destination_ip:
      source: "context.metadata_section"
      key: "LocalAddr"
      pattern: "LocalAddr=([0-9.]+):\\d+"
      group: 1

apply_when:
  vendor_detected: "cisco_cucm"
```

**Testing**:
- Test override chain resolution
- Test vendor-specific extraction
- Test inheritance and merging
- Validate YAML parsing

**Deliverables**:
- [ ] Enhanced `override_manager.rs`
- [ ] Override resolution logic
- [ ] Example base patterns (5+)
- [ ] Example raw overrides (5+)
- [ ] Example vendor overrides (3+ vendors)
- [ ] Unit tests for override chain
- [ ] Integration tests with real logs

---

## 📦 Phase 2: Normalization Pipeline (Week 3-4)

### 2.1 Create Vendor Normalizers

**Files**: 
- `crates/pattern-engine/src/normalizers/mod.rs`
- `crates/pattern-engine/src/normalizers/cube.rs`
- `crates/pattern-engine/src/normalizers/cucm.rs`
- `crates/pattern-engine/src/normalizers/jabber.rs`
- `crates/pattern-engine/src/normalizers/cuc.rs`

**Purpose**: Convert vendor-specific log formats to normalized events.

**Base Trait**:
```rust
pub trait Normalizer: Send + Sync {
    fn vendor_id(&self) -> &str;
    
    fn normalize(&self, raw_log: &str) -> Result<NormalizedEvent, NormalizationError>;
    
    fn can_normalize(&self, raw_log: &str) -> bool;
}
```

**CUCM Normalizer Example**:
```rust
pub struct CUCMNormalizer {
    metadata_regex: Regex,
    sip_header_regexes: HashMap<String, Regex>,
}

impl Normalizer for CUCMNormalizer {
    fn vendor_id(&self) -> &str {
        "cisco_cucm"
    }
    
    fn normalize(&self, raw_log: &str) -> Result<NormalizedEvent, NormalizationError> {
        let lines: Vec<&str> = raw_log.lines().collect();
        
        // Extract timestamp from CUCM format
        let timestamp = self.extract_timestamp(&lines[0])?;
        
        // Parse metadata pipe section
        let metadata = self.parse_metadata(&lines[0])?;
        
        // Extract SIP message (starts after metadata)
        let sip_lines = &lines[1..];
        let sip_message = self.parse_sip_message(sip_lines)?;
        
        // Build network context from metadata
        let network = NetworkContext {
            source_ip: metadata.get("RemoteAddr").and_then(|s| self.parse_ip(s)),
            destination_ip: metadata.get("LocalAddr").and_then(|s| self.parse_ip(s)),
            protocol: metadata.get("protocol").cloned(),
            direction: if lines[0].contains("Received") {
                Some(Direction::Inbound)
            } else {
                Some(Direction::Outbound)
            },
            ..Default::default()
        };
        
        Ok(NormalizedEvent {
            event_type: format!("sip_{}", sip_message.method.as_deref().unwrap_or("unknown").to_lowercase()),
            timestamp,
            sip_message: Some(sip_message),
            network,
            system: SystemContext {
                hostname: metadata.get("node").cloned(),
                component: Some("Call Manager".to_string()),
                ..Default::default()
            },
            vendor: VendorInfo {
                vendor_type: "cisco_cucm".to_string(),
                metadata: metadata,
                ..Default::default()
            },
            raw: RawData {
                original_lines: lines.iter().map(|s| s.to_string()).collect(),
                ..Default::default()
            },
        })
    }
}
```

**Normalizer Registry**:
```rust
pub struct NormalizerRegistry {
    normalizers: HashMap<String, Box<dyn Normalizer>>,
}

impl NormalizerRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            normalizers: HashMap::new(),
        };
        
        // Register all normalizers
        registry.register(Box::new(CUBENormalizer::new()));
        registry.register(Box::new(CUCMNormalizer::new()));
        registry.register(Box::new(JabberNormalizer::new()));
        registry.register(Box::new(CUCNormalizer::new()));
        
        registry
    }
    
    pub fn get(&self, vendor_id: &str) -> Option<&dyn Normalizer> {
        self.normalizers.get(vendor_id).map(|b| b.as_ref())
    }
}
```

**Testing**:
- Unit tests for each normalizer
- Test with real vendor log samples
- Validate normalized output schema
- Test error handling (malformed logs)

**Deliverables**:
- [ ] Base `Normalizer` trait
- [ ] `NormalizerRegistry`
- [ ] CUBE normalizer
- [ ] CUCM normalizer
- [ ] Jabber normalizer
- [ ] CUC normalizer
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests with real logs

---

### 2.2 Create Progressive Processing Pipeline

**File**: `crates/pattern-engine/src/progressive_pipeline.rs`

**Purpose**: Smart pipeline that chooses raw or normalized processing.

**Implementation**:
```rust
pub struct ProgressivePipeline {
    vendor_detector: VendorDetector,
    normalizer_registry: NormalizerRegistry,
    pattern_matcher: PatternMatcher,
    normalization_hints: Arc<RwLock<NormalizationHints>>,
    metrics: Arc<RwLock<ProcessingMetrics>>,
}

impl ProgressivePipeline {
    pub fn process(&self, raw_log: String) -> ProcessingResult {
        let start = Instant::now();
        
        // Step 1: Try fast path (raw matching)
        let raw_matches = self.pattern_matcher.match_raw(&raw_log);
        
        if !raw_matches.is_empty() {
            // Check if these patterns need normalization
            let needs_normalization = self.check_normalization_needed(&raw_matches);
            
            if !needs_normalization {
                // Fast path success!
                self.record_metric(ProcessingPath::RawFast, start.elapsed());
                return ProcessingResult::Raw {
                    matches: raw_matches,
                    cost: ProcessingCost::Cheap,
                };
            }
        }
        
        // Step 2: Slow path - normalize and match
        let vendor = self.vendor_detector.detect(&raw_log);
        
        if let Some(vendor_match) = vendor {
            if let Some(normalizer) = self.normalizer_registry.get(&vendor_match.vendor_id) {
                match normalizer.normalize(&raw_log) {
                    Ok(normalized) => {
                        let matches = self.pattern_matcher.match_normalized(&normalized);
                        
                        // Update hints for future processing
                        self.update_hints(&raw_matches, &vendor_match.vendor_id);
                        
                        self.record_metric(ProcessingPath::Normalized, start.elapsed());
                        
                        return ProcessingResult::Normalized {
                            event: normalized,
                            matches,
                            vendor: vendor_match.vendor_id,
                            cost: ProcessingCost::Expensive,
                        };
                    }
                    Err(e) => {
                        tracing::warn!("Normalization failed: {}", e);
                    }
                }
            }
        }
        
        // Step 3: Fallback to raw matches
        self.record_metric(ProcessingPath::RawFallback, start.elapsed());
        ProcessingResult::Raw {
            matches: raw_matches,
            cost: ProcessingCost::Medium,
        }
    }
    
    fn check_normalization_needed(&self, matches: &[PatternMatch]) -> bool {
        let hints = self.normalization_hints.read().unwrap();
        
        for pattern_match in matches {
            if hints.should_normalize(&pattern_match.pattern_type) {
                return true;
            }
        }
        
        false
    }
}

pub enum ProcessingResult {
    Raw {
        matches: Vec<PatternMatch>,
        cost: ProcessingCost,
    },
    Normalized {
        event: NormalizedEvent,
        matches: Vec<PatternMatch>,
        vendor: String,
        cost: ProcessingCost,
    },
}
```

**Normalization Hints** (Learning System):
```rust
pub struct NormalizationHints {
    hints: HashMap<String, NormalizationHint>,
}

pub struct NormalizationHint {
    pub pattern_type: String,
    pub vendor_count: usize,
    pub always_normalize: bool,
    pub reason: NormalizationReason,
}

impl NormalizationHints {
    pub fn should_normalize(&self, pattern_type: &str) -> bool {
        if let Some(hint) = self.hints.get(pattern_type) {
            hint.always_normalize || hint.vendor_count > 1
        } else {
            false
        }
    }
    
    pub fn learn(&mut self, pattern_type: String, vendor: String) {
        let hint = self.hints.entry(pattern_type).or_insert(NormalizationHint {
            pattern_type: pattern_type.clone(),
            vendor_count: 0,
            always_normalize: false,
            reason: NormalizationReason::SingleVendor,
        });
        
        hint.vendor_count += 1;
        
        if hint.vendor_count > 1 {
            hint.always_normalize = true;
            hint.reason = NormalizationReason::MultiVendor;
        }
    }
}
```

**Configuration**: `config/normalization_strategy.yaml`
```yaml
strategy: "progressive"

# Pattern-specific normalization triggers
pattern_normalization:
  sip_invite:
    trigger: "on_multi_vendor"
    vendors: ["cisco_cube", "cisco_cucm", "cisco_cup_proxy", "cisco_jabber"]
  
  sip_100_trying:
    trigger: "on_multi_vendor"
    vendors: ["cisco_cube", "cisco_cucm", "cisco_cup_proxy"]
  
  jabber_cti_event:
    trigger: "always"
    reason: "Complex CTI events require structured parsing"
  
  simple_error:
    trigger: "never"
    reason: "Simple text match, no vendor differences"

performance:
  raw_pattern_cache_size: 10000
  normalization_cache_size: 1000
  cache_ttl_seconds: 300
  max_normalization_time_ms: 50
```

**Testing**:
- Test raw fast path performance
- Test normalization path correctness
- Test learning system
- Benchmark against large log files
- Validate cache effectiveness

**Deliverables**:
- [ ] `progressive_pipeline.rs` implementation
- [ ] `NormalizationHints` with learning
- [ ] `normalization_strategy.yaml` config
- [ ] Performance benchmarks
- [ ] Integration tests
- [ ] Documentation

---

## 📦 Phase 3: Signatures, Actions, Scenarios (Week 5-6)

### 3.1 Signature System

**File**: `crates/pattern-engine/src/signature.rs`

**Purpose**: Enhanced pattern matching with signature verification.

**Implementation**:
```rust
pub struct Signature {
    pub name: String,
    pub pattern_type: String,
    pub components: Vec<SignatureComponent>,
    pub min_components: usize,
    pub confidence_threshold: f32,
}

pub struct SignatureComponent {
    pub name: String,
    pub required: bool,
    pub raw_pattern: Option<String>,
    pub normalized_field: Option<String>,
    pub confidence: f32,
}

impl Signature {
    pub fn matches_raw(&self, log: &str) -> Option<SignatureMatch> {
        let mut matched = 0;
        let mut total_confidence = 0.0;
        
        for component in &self.components {
            if let Some(ref pattern) = component.raw_pattern {
                if Regex::new(pattern).unwrap().is_match(log) {
                    matched += 1;
                    total_confidence += component.confidence;
                }
            }
        }
        
        let confidence = total_confidence / self.components.len() as f32;
        
        if matched >= self.min_components && confidence >= self.confidence_threshold {
            Some(SignatureMatch {
                signature_name: self.name.clone(),
                confidence,
                matched_components: matched,
            })
        } else {
            None
        }
    }
    
    pub fn matches_normalized(&self, event: &NormalizedEvent) -> Option<SignatureMatch> {
        // Similar logic for normalized events
    }
}
```

**Configuration** (integrated into pattern overrides):
```yaml
# patterns/base/sip_invite.yaml
signature:
  components:
    - name: "method_line"
      description: "INVITE request line"
      required: true
      raw_pattern: "INVITE sip:"
      normalized_field: "event_type"
      confidence: 0.95
    
    - name: "call_id_header"
      description: "Call-ID header"
      required: true
      raw_pattern: "Call-ID:\\s*[^\\r\\n]+"
      normalized_field: "sip_message.headers.call_id"
      confidence: 0.9
  
  min_components: 2
  confidence_threshold: 0.85
```

**Deliverables**:
- [ ] Signature matching implementation
- [ ] Integration with pattern system
- [ ] Signature YAML schema
- [ ] Unit tests
- [ ] Example signatures (10+)

---

### 3.2 Action System

**File**: `crates/pattern-engine/src/action.rs`

**Purpose**: Execute actions when patterns match.

**Implementation**:
```rust
pub enum Action {
    Extract {
        fields: Vec<String>,
    },
    StateManagement {
        operation: StateOperation,
    },
    Alert {
        severity: AlertSeverity,
        message: String,
        context: HashMap<String, String>,
    },
    Logging {
        level: LogLevel,
        message: String,
        structured: HashMap<String, serde_json::Value>,
    },
    Metrics {
        metric_type: MetricType,
        name: String,
        value: Option<f64>,
        labels: HashMap<String, String>,
    },
    Custom {
        handler_id: String,
        params: HashMap<String, serde_json::Value>,
    },
}

pub enum StateOperation {
    CreateSession {
        key: String,
        session_type: String,
        initial_state: String,
        expires_after: Duration,
    },
    UpdateSession {
        key: String,
        new_state: String,
        metadata: Option<HashMap<String, serde_json::Value>>,
    },
    DeleteSession {
        key: String,
    },
}

pub struct ActionExecutor {
    state_manager: Arc<Mutex<StateManager>>,
    alert_handler: Arc<dyn AlertHandler>,
    metrics_handler: Arc<dyn MetricsHandler>,
}

impl ActionExecutor {
    pub async fn execute(&self, action: &Action, context: &ActionContext) -> Result<(), ActionError> {
        match action {
            Action::Extract { fields } => {
                // Extract fields from match
                self.extract_fields(fields, context)?;
            }
            
            Action::StateManagement { operation } => {
                let mut state_mgr = self.state_manager.lock().await;
                state_mgr.execute_operation(operation, context)?;
            }
            
            Action::Alert { severity, message, context: alert_ctx } => {
                self.alert_handler.send_alert(Alert {
                    severity: *severity,
                    message: self.render_template(message, context)?,
                    context: alert_ctx.clone(),
                    timestamp: Utc::now(),
                }).await?;
            }
            
            Action::Logging { level, message, structured } => {
                let rendered = self.render_template(message, context)?;
                self.log_structured(*level, &rendered, structured);
            }
            
            Action::Metrics { metric_type, name, value, labels } => {
                self.metrics_handler.record(*metric_type, name, *value, labels).await?;
            }
            
            Action::Custom { handler_id, params } => {
                self.execute_custom_handler(handler_id, params, context).await?;
            }
        }
        
        Ok(())
    }
}
```

**Configuration** (integrated into patterns):
```yaml
# patterns/base/sip_invite.yaml
actions:
  - name: "extract_call_info"
    type: "extraction"
    execute: "always"
    fields:
      - call_id
      - from_uri
      - to_uri
      - source_ip
      - destination_ip
  
  - name: "start_call_tracking"
    type: "state_management"
    execute: "always"
    state:
      create_session:
        key: "{{ call_id }}"
        type: "sip_call"
        initial_state: "invite_sent"
        expires_after: "5m"
  
  - name: "alert_on_suspicious_destination"
    type: "alert"
    execute: "conditional"
    condition:
      field: "to_uri"
      matches: "^sip:(900|976).*"
    alert:
      severity: "medium"
      message: "Call to premium rate number detected"
      tags: ["fraud_risk", "premium_rate"]
  
  - name: "log_call_attempt"
    type: "logging"
    execute: "always"
    log:
      level: "info"
      message: "SIP INVITE: {{ from_uri }} -> {{ to_uri }}"
      structured:
        call_id: "{{ call_id }}"
        caller: "{{ from_uri }}"
        callee: "{{ to_uri }}"
```

**Deliverables**:
- [ ] Action system implementation
- [ ] State manager for session tracking
- [ ] Action executor
- [ ] Template rendering for dynamic values
- [ ] Action YAML schema
- [ ] Unit tests
- [ ] Example actions (15+)

---

### 3.3 Scenario System

**File**: `crates/pattern-engine/src/scenario.rs`

**Purpose**: Track multi-step sequences across log events.

**Implementation**:
```rust
pub struct Scenario {
    pub id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<ScenarioStep>,
    pub on_complete: Vec<Action>,
    pub on_timeout: Vec<Action>,
    pub on_error: Vec<Action>,
    pub timeout: Duration,
}

pub struct ScenarioStep {
    pub name: String,
    pub pattern_name: String,
    pub vendor_constraint: Option<String>,
    pub within: Option<Duration>,
    pub match_conditions: Vec<MatchCondition>,
    pub extract_as: HashMap<String, String>,
    pub actions: Vec<Action>,
    pub transition: String,
}

pub struct MatchCondition {
    pub field: String,
    pub operator: ConditionOperator,
    pub value: String,
    pub value_from: Option<String>,  // Reference to extracted value
}

pub struct ScenarioEngine {
    scenarios: HashMap<String, Scenario>,
    active_sessions: HashMap<String, ScenarioSession>,
    state_manager: Arc<Mutex<StateManager>>,
}

impl ScenarioEngine {
    pub async fn process_event(&mut self, event: &ProcessingResult) -> Vec<ScenarioUpdate> {
        let mut updates = Vec::new();
        
        // Check active scenarios for matching patterns
        for (session_id, session) in &mut self.active_sessions {
            if let Some(update) = session.process_event(event).await {
                updates.push(update);
                
                // Check if scenario completed
                if session.is_complete() {
                    let scenario = &self.scenarios[&session.scenario_id];
                    for action in &scenario.on_complete {
                        self.execute_action(action, session).await;
                    }
                    updates.push(ScenarioUpdate::Completed(session_id.clone()));
                }
            }
        }
        
        // Check for new scenarios triggered by this event
        for scenario in self.scenarios.values() {
            if scenario.first_step_matches(event) {
                let session = self.start_scenario(scenario, event).await;
                updates.push(ScenarioUpdate::Started(session.id.clone()));
            }
        }
        
        updates
    }
}

pub struct ScenarioSession {
    pub id: String,
    pub scenario_id: String,
    pub current_step: usize,
    pub started_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
    pub extracted_values: HashMap<String, serde_json::Value>,
    pub step_history: Vec<StepExecution>,
}

impl ScenarioSession {
    pub async fn process_event(&mut self, event: &ProcessingResult) -> Option<ScenarioUpdate> {
        let current_step = &self.scenario.steps[self.current_step];
        
        // Check if event matches current step
        if self.matches_step(current_step, event) {
            // Extract values
            for (field, store_as) in &current_step.extract_as {
                if let Some(value) = self.extract_field(field, event) {
                    self.extracted_values.insert(store_as.clone(), value);
                }
            }
            
            // Execute step actions
            for action in &current_step.actions {
                self.execute_action(action).await;
            }
            
            // Move to next step
            self.current_step += 1;
            self.last_updated = Utc::now();
            
            Some(ScenarioUpdate::Advanced(self.id.clone(), current_step.name.clone()))
        } else {
            None
        }
    }
    
    pub fn is_complete(&self) -> bool {
        self.current_step >= self.scenario.steps.len()
    }
    
    pub fn is_timeout(&self) -> bool {
        Utc::now() - self.started_at > self.scenario.timeout
    }
}
```

**Configuration**: `scenarios/successful_call_setup.yaml`
```yaml
scenario_name: "successful_call_setup"
description: "Complete SIP call setup sequence"
category: "voip"

# This scenario requires normalization (multi-vendor correlation)
normalization:
  required: true
  reason: "Call-ID must be correlated across vendors"

sequence:
  - step: "invite"
    pattern: "sip_invite"
    description: "Call initiation"
    extract:
      - call_id: "session_call_id"
      - from_uri: "session_caller"
      - to_uri: "session_callee"
    actions:
      - "start_call_tracking"
      - "log_call_attempt"
    transition: "wait_for_trying"
  
  - step: "trying"
    pattern: "sip_100_trying"
    description: "Call processing started"
    within: "100ms"
    match:
      call_id: "{{ session_call_id }}"
    actions:
      - name: "update_call_state"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            new_state: "trying"
    transition: "wait_for_ringing"
  
  - step: "ringing"
    pattern: "sip_180_ringing"
    within: "2s"
    match:
      call_id: "{{ session_call_id }}"
    transition: "wait_for_answer"
  
  - step: "answered"
    pattern: "sip_200_ok"
    within: "30s"
    match:
      call_id: "{{ session_call_id }}"
    actions:
      - name: "alert_on_quick_answer"
        type: "alert"
        execute: "conditional"
        condition:
          expression: "step.answered.timestamp - step.ringing.timestamp < 500ms"
        alert:
          severity: "low"
          message: "Call answered within 500ms - possible automated system"
    transition: "wait_for_ack"
  
  - step: "ack"
    pattern: "sip_ack"
    within: "500ms"
    match:
      call_id: "{{ session_call_id }}"
    actions:
      - name: "finalize_call_setup"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            new_state: "established"

on_complete:
  actions:
    - name: "log_successful_setup"
      type: "logging"
      log:
        level: "info"
        message: "Call setup completed successfully"
        structured:
          scenario: "successful_call_setup"
          call_id: "{{ session_call_id }}"
          duration_ms: "{{ step.ack.timestamp - step.invite.timestamp }}"
    
    - name: "update_metrics"
      type: "metrics"
      metrics:
        - name: "sip_calls_established_total"
          type: "counter"
          increment: 1
        - name: "sip_call_setup_duration_ms"
          type: "histogram"
          value: "{{ step.ack.timestamp - step.invite.timestamp }}"

on_timeout:
  actions:
    - name: "alert_incomplete_setup"
      type: "alert"
      alert:
        severity: "high"
        message: "Call setup incomplete - missing {{ missing_steps }}"

timeout: "60s"
```

**Multi-Vendor Scenario**: `scenarios/cross_vendor_call.yaml`
```yaml
scenario_name: "cross_vendor_call"
description: "SIP call traversing multiple Cisco products"
category: "voip_multi_vendor"

normalization:
  required: true
  reason: "Call-ID must be correlated across CUBE, CUP, and CUCM logs"

sequence:
  - step: "invite_at_cube"
    pattern: "sip_invite"
    vendor: "cisco_cube"
    extract:
      - call_id: "session_call_id"
      - source_ip: "external_ip"
  
  - step: "invite_at_cup"
    pattern: "sip_invite"
    vendor: "cisco_cup_proxy"
    within: "500ms"
    match:
      call_id: "{{ session_call_id }}"
  
  - step: "invite_at_cucm"
    pattern: "sip_invite"
    vendor: "cisco_cucm"
    within: "200ms"
    match:
      call_id: "{{ session_call_id }}"
    actions:
      - name: "alert_on_slow_routing"
        type: "alert"
        execute: "conditional"
        condition:
          expression: "step.invite_at_cucm.timestamp - step.invite_at_cube.timestamp > 1000ms"
        alert:
          severity: "medium"
          message: "Slow SIP routing detected (>1s from CUBE to CUCM)"

on_complete:
  actions:
    - name: "log_multi_vendor_call"
      type: "logging"
      log:
        level: "info"
        message: "Multi-vendor call completed"
        structured:
          hops: 
            - { vendor: "cisco_cube", timestamp: "{{ step.invite_at_cube.timestamp }}" }
            - { vendor: "cisco_cup_proxy", timestamp: "{{ step.invite_at_cup.timestamp }}" }
            - { vendor: "cisco_cucm", timestamp: "{{ step.invite_at_cucm.timestamp }}" }
```

**Deliverables**:
- [ ] Scenario engine implementation
- [ ] Scenario session management
- [ ] Step matching and transition logic
- [ ] Multi-vendor correlation
- [ ] Scenario YAML schema
- [ ] Unit tests
- [ ] Example scenarios (5+ single vendor, 2+ multi-vendor)
- [ ] Performance tests

---

## 📦 Phase 4: Integration & Testing (Week 7-8)

### 4.1 Integrate with LSP Server

**File**: `lsp-server/src/progressive_analyzer.rs`

**Purpose**: Connect progressive pipeline to LSP server.

**Implementation**:
```rust
pub struct ProgressiveAnalyzer {
    pipeline: ProgressivePipeline,
    scenario_engine: ScenarioEngine,
    pattern_loader: PatternLoader,
}

impl ProgressiveAnalyzer {
    pub async fn analyze_file(&mut self, file_path: &Path) -> AnalysisResult {
        let content = tokio::fs::read_to_string(file_path).await?;
        let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();
        
        let mut diagnostics = Vec::new();
        let mut scenario_updates = Vec::new();
        
        for (line_num, line) in lines.iter().enumerate() {
            // Process through progressive pipeline
            let result = self.pipeline.process(line.clone());
            
            // Convert to diagnostics
            match result {
                ProcessingResult::Raw { matches, .. } => {
                    for pattern_match in matches {
                        diagnostics.push(self.to_diagnostic(pattern_match, line_num));
                    }
                }
                ProcessingResult::Normalized { event, matches, .. } => {
                    for pattern_match in matches {
                        diagnostics.push(self.to_diagnostic(pattern_match, line_num));
                    }
                    
                    // Update scenarios
                    let updates = self.scenario_engine.process_event(&result).await;
                    scenario_updates.extend(updates);
                }
            }
        }
        
        // Check for scenario timeouts
        let timeout_updates = self.scenario_engine.check_timeouts().await;
        scenario_updates.extend(timeout_updates);
        
        AnalysisResult {
            diagnostics,
            scenario_updates,
            metrics: self.pipeline.get_metrics(),
        }
    }
}
```

**Deliverables**:
- [ ] LSP integration code
- [ ] Diagnostic conversion
- [ ] Scenario update handling
- [ ] Integration tests

---

### 4.2 Configuration Management

**File**: `config/log_scout.yaml` (master configuration)

```yaml
# Log Scout Analyzer Configuration

# Progressive processing
progressive_pipeline:
  enabled: true
  cache_size: 10000
  metrics_enabled: true

# Vendor detection
vendor_detection:
  enabled: true
  config_file: "config/vendor_signatures.yaml"
  confidence_threshold: 0.7

# Normalization
normalization:
  enabled: true
  strategy: "progressive"  # or "always", "never"
  config_file: "config/normalization_strategy.yaml"
  cache:
    enabled: true
    size: 1000
    ttl_seconds: 300

# Pattern system
patterns:
  base_patterns_dir: "patterns/base"
  overrides_dir: "patterns/overrides"
  custom_patterns: []
  
  # Pattern loading
  auto_reload: true
  reload_interval_seconds: 60

# Scenarios
scenarios:
  enabled: true
  scenarios_dir: "scenarios"
  max_active_sessions: 1000
  session_timeout_seconds: 300

# Actions
actions:
  logging:
    enabled: true
    output: "structured"  # or "text"
  
  alerts:
    enabled: true
    handler: "internal"  # or "webhook", "smtp"
  
  metrics:
    enabled: true
    handler: "prometheus"  # or "statsd", "influxdb"
  
  state_management:
    enabled: true
    storage: "memory"  # or "redis", "mongodb"

# Performance
performance:
  max_file_size_mb: 100
  chunk_size_kb: 64
  worker_threads: 4
  
  timeouts:
    pattern_match_ms: 50
    normalization_ms: 100
    scenario_step_ms: 200
```

**Deliverables**:
- [ ] Master configuration file
- [ ] Configuration loading
- [ ] Validation
- [ ] Hot reload support

---

### 4.3 CLI Tools

**File**: `lsp-server/src/bin/log-scout-cli.rs`

**Purpose**: Command-line tools for testing and debugging.

**Commands**:
```bash
# Test vendor detection
log-scout-cli detect-vendor sample.log

# Test normalization
log-scout-cli normalize sample.log --vendor cisco_cucm

# Test pattern matching
log-scout-cli match sample.log --pattern sip_invite

# Test scenario
log-scout-cli scenario sample.log --scenario successful_call_setup

# Validate configuration
log-scout-cli validate-config

# Show pattern overrides
log-scout-cli show-overrides sip_invite

# Performance benchmark
log-scout-cli benchmark sample.log
```

**Deliverables**:
- [ ] CLI implementation
- [ ] All commands working
- [ ] Help documentation
- [ ] Examples

---

### 4.4 Documentation

**Files**:
- `docs/PROGRESSIVE_NORMALIZATION.md` - Architecture overview
- `docs/VENDOR_SUPPORT.md` - Vendor-specific details
- `docs/PATTERN_OVERRIDES.md` - Override system guide
- `docs/SCENARIOS.md` - Scenario system guide
- `docs/ACTIONS.md` - Action system guide
- `docs/MIGRATION_GUIDE.md` - Migrating existing patterns

**Deliverables**:
- [ ] Complete documentation
- [ ] Code examples
- [ ] Diagrams
- [ ] Video tutorials (optional)

---

### 4.5 Testing Strategy

**Unit Tests** (Target: 80% coverage)
- All new modules have unit tests
- Test both happy path and error cases
- Mock external dependencies

**Integration Tests**
- Test full pipeline with real logs
- Test vendor detection accuracy
- Test normalization correctness
- Test scenario execution
- Test action execution

**Performance Tests**
- Benchmark raw vs normalized performance
- Measure memory usage
- Test with large log files (100MB+)
- Validate cache effectiveness

**End-to-End Tests**
- Test complete workflows
- Test multi-vendor scenarios
- Test LSP integration
- Test VS Code extension

**Test Data**:
```
test-data/
├── vendor-samples/
│   ├── cube/
│   │   ├── sip_invite.log
│   │   ├── sip_call_flow.log
│   │   └── error_cases.log
│   ├── cucm/
│   ├── jabber/
│   └── cuc/
├── scenarios/
│   ├── successful_call.log
│   ├── failed_call.log
│   └── multi_vendor_call.log
└── benchmarks/
    ├── small.log (1MB)
    ├── medium.log (10MB)
    └── large.log (100MB)
```

**Deliverables**:
- [ ] 80%+ unit test coverage
- [ ] Integration test suite
- [ ] Performance benchmarks
- [ ] E2E tests
- [ ] Test data collection

---

## 📦 Phase 5: Polish & Deployment (Week 9-10)

### 5.1 Performance Optimization

**Tasks**:
- [ ] Profile hot paths
- [ ] Optimize regex compilation
- [ ] Tune cache sizes
- [ ] Parallelize where possible
- [ ] Reduce allocations

**Deliverables**:
- [ ] Performance report
- [ ] Optimization recommendations
- [ ] Benchmarks before/after

---

### 5.2 Error Handling & Logging

**Tasks**:
- [ ] Standardize error types
- [ ] Add structured logging
- [ ] Improve error messages
- [ ] Add debug logging
- [ ] Add telemetry

**Deliverables**:
- [ ] Error handling review
- [ ] Logging strategy document
- [ ] Telemetry integration

---

### 5.3 VS Code Extension Updates

**File**: `vscode-extension/src/progressiveAnalyzer.ts`

**Updates Needed**:
- Display vendor detection results
- Show normalization status
- Visualize scenario progress
- Display action execution
- Add configuration UI

**Deliverables**:
- [ ] Extension updates
- [ ] UI components
- [ ] Configuration panel
- [ ] Status indicators

---

### 5.4 Release Preparation

**Tasks**:
- [ ] Create migration guide
- [ ] Update README
- [ ] Write release notes
- [ ] Create tutorial videos
- [ ] Prepare examples

**Deliverables**:
- [ ] Migration guide
- [ ] Release notes
- [ ] Tutorial content
- [ ] Example repository

---

## 📊 Success Metrics

### Performance Metrics
- Raw matching: < 10ms per file
- Normalization: < 100ms per file
- Scenario tracking: < 200ms per event
- Memory usage: < 500MB for 100MB log file

### Quality Metrics
- Unit test coverage: > 80%
- Integration test coverage: > 70%
- Documentation coverage: 100%
- Zero critical bugs at release

### User Experience Metrics
- Pattern creation time: < 5 minutes
- Scenario creation time: < 10 minutes
- Configuration complexity: Simple for 80% of use cases
- Error messages: Clear and actionable

---

## 🚧 Risks & Mitigation

### Risk 1: Performance Degradation
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- Extensive benchmarking
- Progressive rollout
- Performance monitoring
- Optimization sprints

### Risk 2: Breaking Changes
**Impact**: High  
**Probability**: Low  
**Mitigation**:
- Maintain backward compatibility
- Migration guide
- Version detection
- Gradual deprecation

### Risk 3: Complexity Creep
**Impact**: Medium  
**Probability**: High  
**Mitigation**:
- Clear documentation
- Simple defaults
- Progressive disclosure
- Examples and templates

### Risk 4: Vendor Coverage
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- Start with 4 major vendors
- Extensible architecture
- Community contributions
- Plugin system (future)

---

## 📅 Timeline Summary

### Week 1-2: Foundation
- Normalized event schema
- Vendor detection
- Enhanced overrides

### Week 3-4: Normalization
- Vendor normalizers (4x)
- Progressive pipeline
- Learning system

### Week 5-6: Advanced Features
- Signature system
- Action system
- Scenario system

### Week 7-8: Integration
- LSP integration
- Configuration
- CLI tools
- Documentation

### Week 9-10: Polish
- Performance optimization
- Error handling
- Extension updates
- Release prep

**Total Duration**: 10 weeks

---

## 🔄 Rollout Strategy

### Phase A: Internal Testing (Week 11)
- Deploy to internal test environment
- Test with real log data
- Gather feedback
- Fix critical issues

### Phase B: Beta Release (Week 12)
- Release to beta testers
- Monitor performance
- Collect user feedback
- Iterate on UX

### Phase C: General Availability (Week 13)
- Public release
- Monitor adoption
- Support users
- Plan next iteration

---

## 📝 Next Steps (Immediate Actions)

1. **Review & Approval**
   - [ ] Technical review of architecture
   - [ ] Stakeholder approval
   - [ ] Resource allocation

2. **Environment Setup**
   - [ ] Create feature branch
   - [ ] Set up test environment
   - [ ] Prepare test data

3. **Phase 1 Kickoff**
   - [ ] Create normalized event schema
   - [ ] Begin vendor detection
   - [ ] Start pattern override enhancements

4. **Communication**
   - [ ] Share plan with team
   - [ ] Set up progress tracking
   - [ ] Schedule weekly syncs

---

## 📚 References

- **RFC 3261** - SIP Protocol Specification
- **TagScout Integration** - Existing pattern system
- **Cisco Documentation** - Vendor log formats
- **Existing Patterns** - `patterns/base/*.yaml`
- **Override System** - `crates/pattern-loader/src/override_manager.rs`

---

## ✅ Acceptance Criteria

### Phase 1 Complete When:
- [ ] Normalized event schema implemented
- [ ] Vendor detection works for 4 vendors with >90% accuracy
- [ ] Pattern overrides support raw, normalized, and vendor-specific modes
- [ ] All unit tests passing
- [ ] Documentation complete

### Phase 2 Complete When:
- [ ] All 4 vendor normalizers implemented
- [ ] Progressive pipeline choosing correct path
- [ ] Learning system tracking vendor diversity
- [ ] Performance benchmarks met
- [ ] Integration tests passing

### Phase 3 Complete When:
- [ ] Signature system working
- [ ] Action system executing all action types
- [ ] Scenario engine tracking multi-step flows
- [ ] Multi-vendor correlation working
- [ ] Example scenarios running

### Phase 4 Complete When:
- [ ] LSP integration complete
- [ ] Configuration system working
- [ ] CLI tools functional
- [ ] Documentation complete
- [ ] All tests passing

### Phase 5 Complete When:
- [ ] Performance optimized
- [ ] Error handling reviewed
- [ ] Extension updated
- [ ] Release artifacts ready
- [ ] Migration guide complete

---

**Status**: ⏳ Awaiting Approval  
**Next Review**: TBD  
**Owner**: Development Team  
**Approvers**: Technical Lead, Product Owner  

---

*This is a living document and will be updated as implementation progresses.*