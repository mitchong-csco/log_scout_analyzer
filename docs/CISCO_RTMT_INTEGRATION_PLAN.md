# 🎯 Cisco RTMT Integration Plan

**Project**: Log Scout Analyzer - Cisco UC Log Support
**Source**: CiscoRTMTPlugin.zip (Cisco Real-Time Monitoring Tool)
**Goal**: Port RTMT log parsing capabilities to modern Rust implementation
**Created**: February 23, 2025
**Status**: Planning Phase

---

## 📋 Executive Summary

We're porting Cisco RTMT's log parsing capabilities from a legacy Java/Swing application into the Log Scout Analyzer Rust backend. This will add enterprise-grade Cisco Unified Communications (UC) log analysis capabilities, including SIP call flow correlation, cause code translation, and multi-product support.

**Value Proposition**:
- ✅ Enterprise log analysis for Cisco UC (CUCM, UCCX, CUC, CUBE, etc.)
- ✅ Call flow correlation and troubleshooting
- ✅ Human-readable cause code translations
- ✅ Modern CLI/TUI instead of legacy Java Swing
- ✅ 10-100x faster than Java implementation
- ✅ No JRE dependency

---

## 🔍 What We Found in CiscoRTMTPlugin.zip

### 1. Log Format Definitions (`TraceConfig.xml`)

The plugin supports these formats:

#### **SDI (Service Debug Interface) Logs**
```xml
<ParserClass>SDIParser</ParserClass>
<Identifier><FileStartWith>sdi</FileStartWith></Identifier>
<Delimiter>PIPE</Delimiter>
<SupportedFields>
  - TimeStamp
  - Trace Name
  - Message
  - ClusterId, NodeId
  - Correlation Tag
  - Trace Level
  - Mask
  - Ip, Device
</SupportedFields>
```

**Example SDI Log**:
```
2024-01-15 10:30:00,123|SDITrace|Connection established|cluster-01|node-01|corr-123|INFO|0x0001|10.1.1.1|SEP001122334455
```

#### **SDL (Signal Distribution Layer) Logs**
```xml
<ParserClass>SDLParser</ParserClass>
<Identifier><FileStartWith>sdl</FileStartWith></Identifier>
<Delimiter>PIPE</Delimiter>
<SupportedFields>
  - Seq. Id
  - TimeStamp
  - NodeId
  - Log Entry Type
  - Signal Name
  - Signal Description
  - Destination Process
  - Source Process
  - User Info
  - Info Line
</SupportedFields>
```

**Example SDL Log**:
```
00001|2024-01-15 10:30:00,123|node-01|SIGNAL|SETUP_REQ|Setup Request|CCM|SIP|user@example.com|Call setup initiated
```

#### **UCM Call Trace (CTRACE) Logs** (`clavConfig/UCM_CTRACE.xml`)

**Most Important Format** - SIP message correlation:

```xml
<MessageType name="UCM_CTRACE" group="Cisco UCM">
  <TimestampFormat>yyyy/MM/dd HH:mm:ss:SSS</TimestampFormat>
  <RequiredFields>
    <Field key="true">GUID</Field>
    <Field key="true">CORRELATIONID</Field>
    <Field key="true">MSGTAG</Field>
  </RequiredFields>
</MessageType>
```

**Example CTRACE Log (IN)**:
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

**Example CTRACE Log (OUT)**:
```
2009/12/17 10:45:01.949|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag2|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|100 Trying
```

**Fields**:
1. Timestamp
2. Service (SIPL/SIPT)
3. Protocol Number
4. Transport (TCP/UDP/TLS)
5. Direction (IN/OUT)
6. Receiver IP
7. Receiver Port
8. MAC Address
9. Sender IP
10. Sender Port
11. Correlation ID
12. Message Tag
13. GUID (Call-ID)
14. SIP Method/Response

#### **Syslog Format**
```xml
<ParserClass>LogParser</ParserClass>
<Identifier><FileStartWith>syslog</FileStartWith></Identifier>
<SupportedFields>
  - Date, Time
  - Machine Name
  - Severity
  - Process
  - Message
</SupportedFields>
```

#### **Log4j Format**
```xml
<ParserClass>Log4jParser</ParserClass>
<SupportedFields>
  - Date
  - Trace Level
  - Thread
  - Class Name
  - Message
</SupportedFields>
```

### 2. Cause Code Mappings

**UCM Cause Codes** (`conf/ucmCauseCode.properties`):
```properties
0 = No error
1 = Unallocated (unassigned) number
16 = Normal call clearing
17 = User busy
18 = No user responding
28 = Invalid number format (address incomplete)
41 = Temporary failure
47 = Resource unavailable, unspecified
58 = Bearer capability not presently available
```

**UCCX Cause Codes** (`conf/uccxCauseCode.properties`)
**ACS Cause Codes** (`conf/acsCauseCode.properties`)
**CVP Cause Codes** (`conf/cvpCauseCode.properties`)
**UCCE Cause Codes** (`conf/ucceCauseCode.properties`)

### 3. Product Support

The RTMT plugin supports these Cisco products:
- **CUCM** (Unified Call Manager)
- **UCCX** (Contact Center Express)
- **CUC** (Unity Connection)
- **CUP** (Unified Presence)
- **CUBE** (Border Element) - Already have this!
- **EA** (Emergency Responder)
- **ICM** (Intelligent Contact Manager)

---

## 🏗️ Architecture Integration Plan

### Phase 1: Foundation (Week 1)
**Goal**: Set up infrastructure for Cisco UC log parsing

#### 1.1 Create Cause Code Module
**File**: `crates/pattern-engine/src/cause_codes/mod.rs`

```rust
pub struct CauseCodeRegistry {
    vendors: HashMap<String, HashMap<u32, String>>,
}

impl CauseCodeRegistry {
    pub fn translate(&self, vendor: &str, code: u32) -> Option<&str>;
    pub fn load_from_properties(vendor: &str, properties: &str);
}
```

**Files to Create**:
- `crates/pattern-engine/src/cause_codes/mod.rs`
- `crates/pattern-engine/src/cause_codes/ucm.rs`
- `crates/pattern-engine/src/cause_codes/uccx.rs`
- `crates/pattern-engine/src/cause_codes/cvp.rs`

**Data Files** (copy from RTMT):
- `crates/pattern-engine/data/cause_codes/ucm.properties`
- `crates/pattern-engine/data/cause_codes/uccx.properties`
- `crates/pattern-engine/data/cause_codes/cvp.properties`

**Estimated Time**: 4-6 hours

#### 1.2 Extract RTMT Configuration Files
**Action**: Copy and document relevant configs

```bash
# Create data directory
mkdir -p crates/pattern-engine/data/rtmt_configs

# Copy configs
cp /tmp/rtmt_extract/TraceConfig.xml data/rtmt_configs/
cp /tmp/rtmt_extract/clavConfig/UCM_CTRACE.xml data/rtmt_configs/
cp /tmp/rtmt_extract/conf/*.properties data/cause_codes/
```

**Estimated Time**: 1 hour

---

### Phase 2: SDI/SDL Normalizers (Week 1-2)
**Goal**: Parse basic Cisco UC trace formats

#### 2.1 SDI Normalizer
**File**: `crates/pattern-engine/src/normalizers/cisco_sdi_normalizer.rs`

**Features**:
- Parse pipe-delimited SDI format
- Extract timestamp, trace name, message
- Extract cluster/node IDs
- Extract correlation tags
- Map to NormalizedEvent

**Test Data**:
```
2024-01-15 10:30:00,123|SDITrace|Connection established|cluster-01|node-01|corr-123|INFO|0x0001|10.1.1.1|SEP001122334455
2024-01-15 10:30:01,456|SDITrace|Authentication successful|cluster-01|node-01|corr-123|INFO|0x0002|10.1.1.1|SEP001122334455
```

**Estimated Time**: 6-8 hours

#### 2.2 SDL Normalizer
**File**: `crates/pattern-engine/src/normalizers/cisco_sdl_normalizer.rs`

**Features**:
- Parse pipe-delimited SDL format
- Extract signal names and descriptions
- Track process communication (source → destination)
- Correlate by sequence ID
- Map to NormalizedEvent

**Test Data**:
```
00001|2024-01-15 10:30:00,123|node-01|SIGNAL|SETUP_REQ|Setup Request|CCM|SIP|user@example.com|Call setup initiated
00002|2024-01-15 10:30:00,456|node-01|SIGNAL|SETUP_ACK|Setup Acknowledged|SIP|CCM|user@example.com|Call accepted
```

**Estimated Time**: 6-8 hours

---

### Phase 3: CTRACE Normalizer (Week 2-3) 🎯 **HIGHEST VALUE**
**Goal**: Parse and correlate UCM call traces

#### 3.1 CTRACE Parser
**File**: `crates/pattern-engine/src/normalizers/cisco_ctrace_normalizer.rs`

**Features**:
- Parse UCM CTRACE format (14-field pipe-delimited)
- Extract SIP direction (IN/OUT)
- Parse transport protocol (TCP/UDP/TLS)
- Extract network addresses and ports
- Extract correlation ID, message tag, GUID
- Parse SIP method/response code
- Map to NormalizedEvent with full SIPMessage

**Advanced Features**:
- Detect message pairs (INVITE → 100 Trying)
- Build call flow sequences
- Track message tags for debugging

**Test Data**:
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
2009/12/17 10:45:01.949|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag2|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|100 Trying
2009/12/17 10:45:02.123|SIPT|0|TCP|OUT|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag3|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|180 Ringing
```

**Estimated Time**: 10-12 hours

#### 3.2 Call Flow Correlation Engine
**File**: `crates/pattern-engine/src/call_flow/mod.rs`

**Features**:
- Group messages by GUID (Call-ID)
- Correlate by correlation ID
- Build IN/OUT message pairs
- Detect call states (Setup, Ringing, Connected, Disconnected)
- Generate call flow diagrams (ASCII art for CLI)

**Data Structure**:
```rust
pub struct CallFlow {
    pub guid: String,
    pub correlation_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub messages: Vec<CallFlowMessage>,
    pub state: CallState,
}

pub struct CallFlowMessage {
    pub timestamp: DateTime<Utc>,
    pub direction: Direction, // IN or OUT
    pub transport: Transport,  // TCP/UDP/TLS
    pub source: NetworkAddr,
    pub destination: NetworkAddr,
    pub message_tag: String,
    pub sip_method: Option<String>,
    pub sip_response_code: Option<u16>,
}

pub enum CallState {
    Setup,
    Ringing,
    Connected,
    Disconnected,
    Failed,
}
```

**Estimated Time**: 12-16 hours

---

### Phase 4: Cause Code Integration (Week 3)
**Goal**: Translate numeric codes to human-readable messages

#### 4.1 Cause Code Translation
**File**: `crates/pattern-engine/src/normalizers/enrichment.rs`

**Features**:
- Detect cause codes in SIP responses
- Look up vendor-specific translations
- Add enrichment to NormalizedEvent
- Support multiple vendors (UCM, UCCX, CVP, etc.)

**Example**:
```rust
// Input: SIP/2.0 503 Service Unavailable (Cause: 41)
// Output: "503 Service Unavailable: Temporary failure"

pub fn enrich_with_cause_code(
    event: &mut NormalizedEvent,
    vendor: &str,
) -> Result<()> {
    if let Some(ref mut sip) = event.sip_message {
        if let Some(code) = sip.response_code {
            if let Some(cause_code) = extract_cause_code(&sip.body) {
                let translation = CAUSE_CODE_REGISTRY.translate(vendor, cause_code);
                sip.enriched_description = translation;
            }
        }
    }
    Ok(())
}
```

**Estimated Time**: 6-8 hours

#### 4.2 Update NormalizedEvent Schema
**File**: `crates/log-scout-core/src/normalized_event.rs`

**Changes**:
```rust
pub struct SIPMessage {
    // Existing fields...
    
    // New fields for RTMT integration
    pub correlation_id: Option<String>,
    pub message_tag: Option<String>,
    pub cause_code: Option<u32>,
    pub enriched_description: Option<String>,
    pub cluster_id: Option<String>,
    pub node_id: Option<String>,
}
```

**Estimated Time**: 2-3 hours

---

### Phase 5: CLI/TUI Features (Week 4)
**Goal**: Add user-facing features for UC log analysis

#### 5.1 Call Flow Viewer
**Command**: `log-scout call-flow <file>`

**Features**:
- Parse CTRACE logs
- Build call flow tree
- Display ASCII call flow diagram
- Filter by Call-ID, correlation ID, or time range
- Export to JSON/CSV

**Example Output**:
```
Call Flow: 001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
Correlation ID: correlation-id
Duration: 5.2 seconds

10:45:00.949  [IN]  INVITE               5.5.5.45:58096 → 5.5.5.240:5060
10:45:01.949  [OUT] 100 Trying           5.5.5.240:5060 → 5.5.5.45:58096
10:45:02.123  [OUT] 180 Ringing          5.5.5.240:5060 → 5.5.5.45:58096
10:45:05.456  [OUT] 200 OK               5.5.5.240:5060 → 5.5.5.45:58096
10:45:05.789  [IN]  ACK                  5.5.5.45:58096 → 5.5.5.240:5060
10:45:10.012  [IN]  BYE                  5.5.5.45:58096 → 5.5.5.240:5060
10:45:10.123  [OUT] 200 OK               5.5.5.240:5060 → 5.5.5.45:58096

State: Normal call clearing (Cause: 16)
```

**Estimated Time**: 8-10 hours

#### 5.2 Cause Code Lookup Tool
**Command**: `log-scout cause-code --vendor ucm --code 41`

**Features**:
- Interactive cause code lookup
- Support all vendors (UCM, UCCX, CVP, etc.)
- Fuzzy search by description
- Export cause code reference tables

**Example Output**:
```
Vendor: UCM (Cisco Unified Call Manager)
Code: 41
Description: Temporary failure

Explanation:
The equipment or network is experiencing a temporary condition that prevents
the call from being completed. This is typically a transient issue and the
call should be retried.

Related Codes:
  42 - Switching equipment congestion
  47 - Resource unavailable, unspecified
  58 - Bearer capability not presently available
```

**Estimated Time**: 4-6 hours

#### 5.3 Enhanced Bundle Import
**Update**: Existing bundle import feature

**New Capabilities**:
- Detect Cisco UC log formats automatically
- Extract Call-IDs and offer to bundle by call
- Bundle all logs related to a specific correlation ID
- Bundle by time window around incident

**Example**:
```
Bundle Options for CTRACE log:
1. Bundle by Call-ID (5 files found)
2. Bundle by Correlation ID (12 files found)
3. Bundle by time window ±5 minutes
4. Bundle entire directory
```

**Estimated Time**: 6-8 hours

---

### Phase 6: Testing & Documentation (Week 4-5)

#### 6.1 Test Data Collection
**Goal**: Create comprehensive test suite

**Sources**:
1. Extract sample logs from RTMT ZIP
2. Generate synthetic test data
3. Use anonymized production logs (if available)

**Test Files**:
```
crates/pattern-engine/tests/data/cisco_uc/
├── sdi_samples.txt          (SDI format logs)
├── sdl_samples.txt          (SDL format logs)
├── ctrace_invite.txt        (INVITE call flow)
├── ctrace_bye.txt           (BYE call flow)
├── ctrace_cancel.txt        (CANCEL call flow)
├── ctrace_error.txt         (Error responses)
└── mixed_vendor.txt         (Multiple vendors)
```

**Estimated Time**: 8-10 hours

#### 6.2 Integration Tests
**File**: `crates/pattern-engine/tests/cisco_uc_integration_tests.rs`

**Test Coverage**:
- [ ] SDI normalizer parses all fields correctly
- [ ] SDL normalizer tracks process communication
- [ ] CTRACE normalizer extracts all 14 fields
- [ ] Call flow correlation works across messages
- [ ] Cause code translation for all vendors
- [ ] Call state detection (Setup → Connected → Disconnected)
- [ ] Multi-vendor log files handled correctly
- [ ] Performance: Parse 10,000 lines in <1 second

**Estimated Time**: 10-12 hours

#### 6.3 Documentation
**Files to Create**:
- `docs/CISCO_UC_LOG_FORMATS.md` - Format specifications
- `docs/CALL_FLOW_ANALYSIS.md` - How to use call flow features
- `docs/CAUSE_CODE_REFERENCE.md` - Cause code guide
- `docs/RTMT_MIGRATION_GUIDE.md` - For existing RTMT users

**Estimated Time**: 6-8 hours

---

## 📊 Project Timeline

### Week 1: Foundation & Basic Parsing
- [x] Planning document created
- [ ] Cause code module infrastructure
- [ ] SDI normalizer complete
- [ ] SDL normalizer complete
- **Milestone**: Can parse basic Cisco UC logs

### Week 2-3: CTRACE & Correlation (Critical Path)
- [ ] CTRACE normalizer complete
- [ ] Call flow correlation engine
- [ ] Cause code integration
- [ ] NormalizedEvent schema updates
- **Milestone**: Can correlate SIP call flows

### Week 4: CLI Features
- [ ] Call flow viewer command
- [ ] Cause code lookup tool
- [ ] Enhanced bundle import
- **Milestone**: User-facing features complete

### Week 4-5: Testing & Polish
- [ ] Test data collection
- [ ] Integration tests (>90% coverage)
- [ ] Documentation complete
- [ ] Performance benchmarks
- **Milestone**: Production ready

**Total Estimated Time**: 90-120 hours (4-5 weeks)

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ Parse SDI, SDL, and CTRACE formats
- ✅ Correlate messages by Call-ID and correlation ID
- ✅ Translate cause codes for all supported vendors
- ✅ Build call flow visualizations
- ✅ CLI commands for troubleshooting
- ✅ Integration with existing normalizer system

### Performance Requirements
- ✅ Parse 10,000 log lines in <1 second
- ✅ Correlate 1,000 calls in <100ms
- ✅ Memory usage <100MB for typical bundle

### Quality Requirements
- ✅ >90% test coverage for new code
- ✅ All integration tests passing
- ✅ Documentation complete
- ✅ TDD approach maintained

---

## 🔧 Technical Decisions

### 1. Module Organization
```
crates/pattern-engine/src/
├── cause_codes/
│   ├── mod.rs              (Registry + loader)
│   ├── ucm.rs              (UCM codes)
│   ├── uccx.rs             (UCCX codes)
│   └── cvp.rs              (CVP codes)
├── call_flow/
│   ├── mod.rs              (CallFlow struct + builder)
│   ├── correlation.rs      (Message correlation logic)
│   └── visualization.rs    (ASCII diagrams)
├── normalizers/
│   ├── cisco_sdi_normalizer.rs
│   ├── cisco_sdl_normalizer.rs
│   ├── cisco_ctrace_normalizer.rs
│   └── enrichment.rs       (Cause code enrichment)
└── ...
```

### 2. Data Storage
**Cause Code Properties Files**:
- Store as `.properties` files in `data/cause_codes/`
- Load at startup into HashMap
- Use `lazy_static!` for performance

**RTMT Configs**:
- Store as reference in `data/rtmt_configs/`
- Use for test data generation
- Document format specifications

### 3. NormalizedEvent Extensions
**Add Cisco-specific fields without breaking existing code**:

```rust
pub struct NormalizedEvent {
    // Existing fields...
    
    // Cisco UC extensions
    pub cisco_metadata: Option<CiscoMetadata>,
}

pub struct CiscoMetadata {
    pub correlation_id: Option<String>,
    pub message_tag: Option<String>,
    pub cluster_id: Option<String>,
    pub node_id: Option<String>,
    pub trace_name: Option<String>,
    pub signal_name: Option<String>,
}
```

### 4. Call Flow Storage
**Use separate data structure for call flows**:

```rust
pub struct CallFlowDatabase {
    flows: HashMap<String, CallFlow>,  // Key: GUID (Call-ID)
}

impl CallFlowDatabase {
    pub fn add_message(&mut self, event: &NormalizedEvent);
    pub fn get_flow(&self, guid: &str) -> Option<&CallFlow>;
    pub fn find_by_correlation_id(&self, corr_id: &str) -> Vec<&CallFlow>;
}
```

---

## 🚀 Quick Start (When Ready to Begin)

### Phase 1 Quick Start
```bash
# 1. Extract RTMT configs
cd log_scout_analyzer
mkdir -p crates/pattern-engine/data/{cause_codes,rtmt_configs}
unzip -j "/c/Users/mitchong/Downloads/CiscoRTMTPlugin (2).zip" \
  "conf/*.properties" -d crates/pattern-engine/data/cause_codes/

# 2. Create cause code module
cargo new --lib crates/pattern-engine/src/cause_codes

# 3. Run initial tests
cd crates/pattern-engine
cargo test cause_codes

# 4. Create SDI normalizer (use CUCM normalizer as template)
cp src/normalizers/cucm_normalizer.rs src/normalizers/cisco_sdi_normalizer.rs
```

### Testing Strategy
```bash
# TDD approach - write tests first
# 1. Create test file
touch crates/pattern-engine/tests/cisco_sdi_tests.rs

# 2. Write failing test
cargo test cisco_sdi -- --nocapture

# 3. Implement normalizer
# 4. Tests pass
# 5. Commit
```

---

## 📚 Reference Materials

### From RTMT Plugin
- ✅ `TraceConfig.xml` - Log format definitions
- ✅ `clavConfig/UCM_CTRACE.xml` - Call trace correlation rules
- ✅ `conf/ucmCauseCode.properties` - UCM cause codes
- ✅ `conf/uccxCauseCode.properties` - UCCX cause codes
- ✅ `conf/cvpCauseCode.properties` - CVP cause codes
- ✅ `README.txt` - RTMT usage documentation

### Existing Code to Reference
- ✅ `crates/pattern-engine/src/normalizers/cucm_normalizer.rs` - CUCM SIP parsing
- ✅ `crates/pattern-engine/src/normalizers/cube_normalizer.rs` - IOS log parsing
- ✅ `crates/pattern-engine/src/normalizers/mod.rs` - Normalizer trait
- ✅ `crates/log-scout-core/src/normalized_event.rs` - Event schema

---

## 🎨 UX Considerations

### User Personas

**Persona 1: TAC Engineer**
- Need: Quick call flow analysis for troubleshooting
- Use Case: "Show me all SIP messages for Call-ID xyz"
- Feature: `log-scout call-flow --call-id xyz`

**Persona 2: Network Admin**
- Need: Understand cause codes and failures
- Use Case: "Why did this call fail with code 41?"
- Feature: `log-scout cause-code --code 41 --vendor ucm`

**Persona 3: Developer**
- Need: Correlate logs across multiple components
- Use Case: "Bundle all logs related to this incident"
- Feature: Enhanced bundle import with correlation ID filter

### Empty State Handling
Following project UX principles:

```rust
// Good: Graceful empty state
if call_flows.is_empty() {
    println!("📞 No call flows found in this log file.");
    println!("\nThis might be because:");
    println!("  • The file is not a CTRACE format log");
    println!("  • No SIP messages are present");
    println!("  • Try: log-scout detect <file> to identify format");
}

// Bad: Error message
if call_flows.is_empty() {
    eprintln!("ERROR: No call flows detected!");
}
```

---

## 🔄 Integration with Existing Features

### 1. Bundle Import Enhancement
**Current**: Import files into bundle
**Enhanced**: Smart Cisco UC bundling

```rust
// Detect Cisco UC logs and offer smart bundling
pub fn detect_cisco_uc_bundle_opportunities(files: &[PathBuf]) -> BundleOptions {
    let mut call_ids = HashSet::new();
    let mut correlation_ids = HashSet::new();
    
    for file in files {
        if let Some(metadata) = extract_cisco_metadata(file) {
            call_ids.extend(metadata.call_ids);
            correlation_ids.extend(metadata.correlation_ids);
        }
    }
    
    BundleOptions {
        by_call_id: call_ids.len() > 0,
        by_correlation: correlation_ids.len() > 0,
        call_ids: call_ids.into_iter().collect(),
        correlation_ids: correlation_ids.into_iter().collect(),
    }
}
```

### 2. Pattern Recognition Enhancement
**Current**: Detect patterns in normalized events
**Enhanced**: Cisco-specific patterns

**New Patterns**:
- Call setup failures (INVITE → 4xx/5xx)
- Registration loops (REGISTER → 401 → REGISTER)
- Media negotiation issues (SDP offer/answer problems)
- Call transfer failures
- Conference bridge errors

### 3. Results Display Enhancement
**Current**: Show normalized events in tree
**Enhanced**: Call flow hierarchies

```
📞 Call Flows (3 found)
├─ ✅ Call: 001a2f8d... (Completed - 5.2s)
│  ├─ 10:45:00 INVITE
│  ├─ 10:45:01 100 Trying
│  ├─ 10:45:02 180 Ringing
│  ├─ 10:45:05 200 OK
│  └─ 10:45:10 BYE (Normal clearing)
├─ ❌ Call: 002b3f9e... (Failed - Cause: 41)
│  ├─ 10:46:00 INVITE
│  └─ 10:46:01 503 Service Unavailable
└─ ⏱️ Call: 003c4a7f... (In Progress)
   ├─ 10:47:00 INVITE
   └─ 10:47:01 100 Trying
```

---

## 💡 Future Enhancements (Post-MVP)

### Phase 7: Advanced Features (Future)
1. **Real-time Monitoring** (like RTMT)
   - Connect to CUCM via SOAP API
   - Stream live call flows
   - Alert on error patterns

2. **Call Flow Diagrams**
   - Generate SVG/PNG call flow diagrams
   - Export to PlantUML
   - Mermaid.js integration for web view

3. **Multi-file Correlation**
   - Correlate across CUCM + CUBE logs
   - Track calls across cluster nodes
   - Build end-to-end call paths

4. **Machine Learning**
   - Predict call failures
   - Detect anomalous patterns
   - Suggest root causes

5. **Web UI**
   - Interactive call flow viewer
   - Real-time dashboard
   - Collaboration features

---

## 📝 Notes & Decisions

### Decision Log

**2025-02-23**: Initial plan created
- Decided to focus on CTRACE format first (highest value)
- Will use existing CUCM normalizer as template
- Chose to store cause codes as .properties files
- TDD approach mandatory for all new code

### Questions to Answer
- [ ] Should we support real-time monitoring? (Probably Phase 7+)
- [ ] Do we need RTMT config XML compatibility? (No, just reference)
- [ ] Should call flows be stored in SQLite? (Future enhancement)
- [ ] Do we want web UI for call flows? (Phase 7+)

### Risks & Mitigations

**Risk 1**: RTMT formats might be underdocumented
- **Mitigation**: Extract sample data, reverse engineer if needed

**Risk 2**: Performance with large log files (>1GB)
- **Mitigation**: Streaming parser, lazy correlation

**Risk 3**: Scope creep with advanced features
- **Mitigation**: Strict MVP focus, defer non-critical features

---

## ✅ Acceptance Checklist

Before marking complete:
- [ ] All normalizers implemented (SDI, SDL, CTRACE)
- [ ] Cause code translation works for all vendors
- [ ] Call flow correlation functional
- [ ] CLI commands added and documented
- [ ] Integration tests >90% coverage
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Existing tests still passing
- [ ] No regressions in bundle import
- [ ] User guide updated
- [ ] Example data provided

---

## 📞 Support & Resources

### External Resources
- Cisco RTMT Documentation
- Cisco UC Troubleshooting Guides
- SIP RFC 3261 (reference)
- Cisco Call Manager Administration Guide

### Internal Resources
- PROJECT_STATUS.md (current state)
- AI_ASSISTANT_GUIDE.md (development approach)
- PHASE1_COMPLETE_NEXT_STEPS.md (normalizer examples)
- TDD_STRATEGY.md (testing approach)

---

**Next Action**: Review plan and approve Phase 1 start
**Owner**: AI + Human collaboration
**Priority**: High (Cisco UC logs are common in enterprise)
**Value**: ⭐⭐⭐⭐⭐ Enterprise-grade log analysis capability