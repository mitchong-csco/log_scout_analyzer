# Log Scout Analyzer - Implementation Plan: Phases 1-3 & Log Bundle

**Date**: February 18, 2026  
**Target Completion**: March 31, 2026  
**Team Size**: 1 developer (you)

---

## Table of Contents
1. [Phase 1: Local Log Bundling](#phase-1-local-log-bundling)
2. [Phase 2: Dashboard Filters (Testing & Polish)](#phase-2-dashboard-filters)
3. [Phase 3: MongoDB Integration](#phase-3-mongodb-integration)
4. [Log Bundle - Complete System](#log-bundle-complete-system)
5. [Implementation Schedule](#implementation-schedule)
6. [Dependency Management](#dependency-management)
7. [Testing Strategy](#testing-strategy)

---

## Phase 1: Local Log Bundling

### Overview
Implement local service-aware log bundling where users can:
- Create bundles (e.g., "INC-12345: Presence Failure")
- Add logs from different services automatically detected
- Run pattern matching respecting service boundaries
- Store results locally with metadata

### Work Breakdown

#### Task 1.1: Create Bundle Models Module
**File**: `crates/lsp-server/src/bundle/models.rs`  
**Estimated**: 3-4 hours  
**Lines**: ~350

**What to Implement**:
```rust
// Main types to create:
pub struct Bundle {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub logs: Vec<BundleLog>,
    pub metadata: BundleMetadata,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub analysis: Option<BundleAnalysisResult>,
}

pub struct BundleLog {
    pub uri: String,
    pub service: ServiceType,
    pub log_type: LogType,
    pub added_at: DateTime<Utc>,
    pub size_bytes: u64,
    pub line_count: usize,
    pub timestamp_format: Option<String>,
}

// Enums
pub enum ServiceType {
    Jabber,
    CUCM,
    CUP,
    Unity,
    SIP,
    Network,
    Custom(String),
}

pub enum LogType {
    Trace,
    Debug,
    Error,
    Warning,
    Audit,
    CDR,
    Activity,
    Other(String),
}

pub struct BundleMetadata { ... }
pub struct Detection { ... }
pub struct BundleAnalysisResult { ... }
```

**Checklist**:
- [ ] Define all types with Serialize/Deserialize
- [ ] Implement Display traits
- [ ] Add Eq, Hash for types that need them
- [ ] Add helper constructors (new methods)
- [ ] Document all public items
- [ ] Add tests for type creation

**Reference**: `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 1-200)

---

#### Task 1.2: Implement Service Detection
**File**: `crates/lsp-server/src/bundle/service_detector.rs`  
**Estimated**: 2-3 hours  
**Lines**: ~200

**What to Implement**:
```rust
pub struct ServiceDetector;

impl ServiceDetector {
    /// Detect from filename first (fast path)
    pub fn from_filename(path: &str) -> Option<ServiceType> { ... }
    
    /// Detect from content signatures
    pub async fn from_content(
        &self,
        uri: &str,
        first_lines: &[String]
    ) -> Result<ServiceType, DetectorError> { ... }
    
    /// Combined detection with fallback
    pub async fn detect(
        &self,
        uri: &str,
        content: &[String]
    ) -> Result<ServiceType, DetectorError> { ... }
}
```

**Signatures to Detect**:
- **Jabber**: "Cisco Jabber", "com.cisco.jabber", "JabberVersion"
- **CUCM**: "Unified Communications Manager", "CUCM", "CallManager"
- **CUP**: "Cisco Unified Presence", "CUP", "PresenceService"
- **Unity**: "Cisco Unity", "VoiceMessage", "UMServicePort"
- **SIP**: "Via: SIP/2.0", "INVITE", "REGISTER"
- **Network**: "TCP", "UDP", "ICMP", "packet"

**Checklist**:
- [ ] Implement filename matching (case-insensitive)
- [ ] Implement content pattern matching
- [ ] Add confidence scoring
- [ ] Handle Unicode properly
- [ ] Add performance caching
- [ ] Test with 100+ real log samples

**Reference**: `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 200-300)

---

#### Task 1.3: Implement Bundle Manager
**File**: `crates/lsp-server/src/bundle/manager.rs`  
**Estimated**: 4-5 hours  
**Lines**: ~400

**What to Implement**:
```rust
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
    mongo_client: Option<Arc<MongoClient>>, // For Phase 3
}

impl BundleManager {
    pub fn new(workspace_root: &Path) -> Result<Self, BundleError> { ... }
    
    pub async fn create_bundle(
        &self,
        name: String,
        description: Option<String>,
        metadata: Option<BundleMetadata>,
    ) -> Result<String, BundleError> { ... }
    
    pub async fn add_log_to_bundle(
        &self,
        bundle_id: &str,
        uri: &Path,
    ) -> Result<(), BundleError> { ... }
    
    pub async fn get_bundle(&self, id: &str) -> Result<Bundle, BundleError> { ... }
    
    pub async fn list_bundles(&self, filter: Option<&str>) -> Result<Vec<Bundle>, BundleError> { ... }
    
    pub async fn delete_bundle(&self, id: &str) -> Result<(), BundleError> { ... }
    
    // Internal
    async fn load_bundle(&self, bundle_id: &str) -> Result<Bundle, BundleError> { ... }
    async fn save_bundle(&self, bundle: &Bundle) -> Result<(), BundleError> { ... }
    async fn load_index(&self) -> Result<BundleIndex, BundleError> { ... }
    async fn save_index(&self, index: &BundleIndex) -> Result<(), BundleError> { ... }
}
```

**Directory Structure**:
```
.log-scout/
└── bundles/
    ├── index.json
    ├── bundle_abc123/
    │   ├── bundle.json (metadata)
    │   ├── results.json (analysis results)
    │   └── logs/
    │       ├── jabber_trace_2026-02-18.log
    │       └── cucm_audit_2026-02-18.log
    └── bundle_def456/
        ├── bundle.json
        └── logs/
```

**Checklist**:
- [ ] Implement CRUD operations
- [ ] Implement filesystem persistence
- [ ] Add atomic writes (write-and-flush)
- [ ] Handle concurrent access safely
- [ ] Add comprehensive error messages
- [ ] Implement logging with tracing
- [ ] Add path validation
- [ ] Test with multiple bundles

**Reference**: `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 300-450)

---

#### Task 1.4: Implement Bundle Analyzer
**File**: `crates/lsp-server/src/bundle/analyzer.rs`  
**Estimated**: 1-2 hours  
**Lines**: ~70

**What to Implement**:
```rust
pub struct BundleAnalyzer;

impl BundleAnalyzer {
    /// Run pattern engine on all logs in bundle
    pub async fn analyze_bundle(
        &self,
        bundle: &Bundle,
        pattern_engine: &PatternEngine,
    ) -> Result<BundleAnalysisResult, AnalyzerError> { ... }
    
    /// Aggregate results by service and pattern
    fn aggregate_results(detections: Vec<Detection>) -> BundleAnalysisResult { ... }
}
```

**Checklist**:
- [ ] Integration with PatternEngine
- [ ] Per-line matching
- [ ] Result aggregation
- [ ] Service-grouped results
- [ ] Add timing information
- [ ] Handle large bundles efficiently

**Reference**: `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 450-500)

---

#### Task 1.5: Create Module Root
**File**: `crates/lsp-server/src/bundle/mod.rs`  
**Estimated**: 30 minutes  
**Lines**: ~10

```rust
//! Bundle management system
//! 
//! Provides local, filesystem-based log bundling with service detection

pub mod models;
pub mod service_detector;
pub mod manager;
pub mod analyzer;

pub use models::{
    Bundle, BundleLog, BundleMetadata, Detection,
    BundleAnalysisResult, ServiceType, LogType,
};
pub use manager::BundleManager;
pub use service_detector::ServiceDetector;
pub use analyzer::BundleAnalyzer;

#[derive(Debug)]
pub enum BundleError {
    Io(std::io::Error),
    Serialization(serde_json::Error),
    NotFound(String),
    Invalid(String),
}

impl From<std::io::Error> for BundleError { ... }
impl From<serde_json::Error> for BundleError { ... }
```

**Checklist**:
- [ ] Add to `crates/lsp-server/src/lib.rs` as `pub mod bundle;`
- [ ] Export all public types
- [ ] Add documentation comments
- [ ] Test module visibility

---

#### Task 1.6: LSP Integration
**File**: `crates/lsp-server/src/lsp_handlers.rs` (new)  
**Estimated**: 2-3 hours  
**Lines**: ~100-150

**LSP Methods to Implement**:
```rust
// Scout/bundle/create
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "scout/bundle/create",
    "params": {
        "name": "INC-12345",
        "description": "Presence failure investigation"
    }
}
// → Returns: { "id": "bundle_abc123" }

// Scout/bundle/addLog
{
    "method": "scout/bundle/addLog",
    "params": {
        "bundleId": "bundle_abc123",
        "filePath": "/path/to/jabber.log"
    }
}
// → Returns: { "service": "Jabber", "lineCount": 5000 }

// Scout/bundle/analyze
{
    "method": "scout/bundle/analyze",
    "params": { "bundleId": "bundle_abc123" }
}
// → Returns: { "detections": [...], "statistics": {...} }

// Scout/bundle/list
{
    "method": "scout/bundle/list"
}
// → Returns: { "bundles": [...] }
```

**Checklist**:
- [ ] Create LSP handler trait implementation
- [ ] Add command dispatcher
- [ ] Implement all CRUD methods
- [ ] Add error handling
- [ ] Serialize/deserialize correctly
- [ ] Test with VS Code LSP client

---

#### Task 1.7: Unit Tests
**File**: `crates/lsp-server/src/bundle/tests/` (new directory)  
**Estimated**: 3-4 hours  
**Lines**: ~300

**Test Files**:
- `tests/models_tests.rs` - Type creation, serialization
- `tests/service_detector_tests.rs` - Service detection accuracy
- `tests/manager_tests.rs` - CRUD operations, persistence
- `tests/analyzer_tests.rs` - Pattern matching integration

**Coverage Target**: >80%

**Checklist**:
- [ ] Test bundle creation/deletion
- [ ] Test service detection on 50+ files
- [ ] Test log addition and metadata
- [ ] Test persistence across restarts
- [ ] Test analyzer output
- [ ] Test error conditions

---

### Phase 1 Summary
- **Total Code**: ~1,100 lines
- **Total Time**: ~16-20 hours
- **Files**: 7 new files (6 + tests)
- **Testing**: Unit tests + manual E2E with VS Code

---

## Phase 2: Dashboard Filters (Testing & Polish)

### Overview
Phase 2 is **already implemented** in TypeScript. This phase is about testing thoroughly and fixing any issues.

### Work Breakdown

#### Task 2.1: Test Filter Persistence
**Time**: 2 hours  
**Checklist**:
- [ ] Uncheck ERROR filter, close dashboard, reopen → should stay unchecked
- [ ] Uncheck WARN filter, reload VS Code → should stay unchecked
- [ ] Test with multiple filters toggled
- [ ] Test sort order persists
- [ ] Test hidden categories persist through reload
- [ ] Test in both light and dark themes

**Test Log**: Create test scenarios document

---

#### Task 2.2: Test Hidden Categories
**Time**: 2 hours  
**Checklist**:
- [ ] Click "Hide" on a card → annotations disappear
- [ ] Hidden categories banner appears
- [ ] Banner shows all hidden categories
- [ ] Click category button in banner → annotations reappear
- [ ] Hide multiple categories
- [ ] Close and reopen dashboard
- [ ] All categories still hidden

---

#### Task 2.3: Test Virtual Scrolling
**Time**: 1 hour  
**Checklist**:
- [ ] Generate 5000+ annotations
- [ ] Virtual scrolling activates
- [ ] Scrolling is smooth
- [ ] Click "Jump to Line" works while scrolled
- [ ] Filters work with virtual scrolling
- [ ] No memory leaks on scroll

---

#### Task 2.4: Webview Styling Refinement
**Time**: 1-2 hours  
**Updates Needed**:
- [ ] Hidden categories banner alignment
- [ ] Icon sizing consistency
- [ ] Color contrast in both themes
- [ ] Minimap legend alignment
- [ ] Export button styling
- [ ] Search input styling

**Files to Update**:
- `vscode-extension/media/annotationDashboard.css`
- `vscode-extension/media/annotationDashboard.js`

---

#### Task 2.5: Fix Known Issues
**Time**: 1-2 hours  
**Known Issues** (from Phase 2 docs):
1. Hidden categories section styling
2. Virtual scrolling edge cases
3. Minimap toggle state management
4. Filter persistence with very large datasets

**Checklist**:
- [ ] Review and fix each issue
- [ ] Test edge cases
- [ ] Document any configuration changes
- [ ] Update configuration if needed

---

#### Task 2.6: Create Test Documentation
**Time**: 1 hour  
**Create**: `docs/PHASE2_TEST_RESULTS.md`

**Content**:
- Test scenarios completed
- Issues found and fixed
- Performance metrics
- Browser/version tested
- Screenshots of dashboard

---

### Phase 2 Summary
- **Total Time**: ~8-10 hours
- **Deliverable**: Tested and polished dashboard
- **Status**: Ready for production

---

## Phase 3: MongoDB Integration

### Overview
Add MongoDB persistence to bundles with automatic filesystem fallback. Enable team collaboration and high availability.

### Work Breakdown

#### Task 3.1: Create Configuration Module
**File**: `crates/lsp-server/src/mongodb/config.rs`  
**Estimated**: 1.5-2 hours  
**Lines**: ~160

**What to Load**:
```yaml
# mongodb_connection.yaml
servers:
  - host: 10.118.12.173
    port: 27017
  - host: 10.118.10.197
    port: 27017
  - host: 10.118.11.131
    port: 27017

database: task_log_scout_analyzer
credentials:
  username: log_scout_analyzer
  password: DBAAS.glTMEGM8KuzwwN5BVO0h0ge6V7OX2B4DELrU3gOD

replicaSet: rs0
authSource: admin
ssl: true
```

**Implementation**:
```rust
pub struct MongoConfig {
    pub servers: Vec<MongoServer>,
    pub database: String,
    pub credentials: MongoCredentials,
    pub replica_set: Option<String>,
    pub ssl: bool,
}

impl MongoConfig {
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        // Parse YAML
        // Validate all fields
        // Return config
    }
    
    pub fn connection_string(&self) -> String {
        // Generate mongodb://... string
    }
}
```

**Checklist**:
- [ ] Load YAML configuration
- [ ] Validate all fields present
- [ ] Generate connection strings
- [ ] Handle missing config gracefully
- [ ] Add environment variable override
- [ ] Test with real MongoDB creds

**Reference**: `docs/PHASE3_MONGODB_IMPLEMENTATION.md` (lines 1-200)

---

#### Task 3.2: Create MongoDB Client
**File**: `crates/lsp-server/src/mongodb/client.rs`  
**Estimated**: 2-2.5 hours  
**Lines**: ~170

**What to Implement**:
```rust
pub struct MongoClient {
    client: mongodb::Client,
    db: mongodb::Database,
}

impl MongoClient {
    pub async fn new(config: &MongoConfig) -> Result<Self, MongoError> {
        // Create connection
        // Test connectivity
        // Return client
    }
    
    pub async fn health_check(&self) -> Result<(), MongoError> {
        // Ping MongoDB
    }
    
    pub async fn create_bundle(&self, bundle: &Bundle) -> Result<String, MongoError> {
        // Insert into bundles collection
    }
    
    pub async fn get_bundle(&self, id: &str) -> Result<Bundle, MongoError> {
        // Query by ID
    }
    
    pub async fn list_bundles(&self) -> Result<Vec<Bundle>, MongoError> {
        // Return all bundles
    }
    
    pub async fn update_bundle(&self, bundle: &Bundle) -> Result<(), MongoError> {
        // Update existing
    }
    
    pub async fn delete_bundle(&self, id: &str) -> Result<(), MongoError> {
        // Delete by ID
    }
}
```

**Checklist**:
- [ ] Create MongoDB client connection
- [ ] Implement connection pooling
- [ ] Add health checks
- [ ] Implement CRUD operations
- [ ] Convert between Bundle and BSON
- [ ] Add error handling
- [ ] Test with real MongoDB

**Reference**: `docs/PHASE3_MONGODB_IMPLEMENTATION.md` (lines 200-400)

---

#### Task 3.3: Create RBAC Module
**File**: `crates/lsp-server/src/mongodb/rbac.rs`  
**Estimated**: 1.5-2 hours  
**Lines**: ~130

**What to Implement**:
```rust
#[derive(Debug, Clone, Copy)]
pub enum Role {
    Owner,
    Admin,
    Contributor,
    Viewer,
}

#[derive(Debug, Clone, Copy)]
pub enum Permission {
    Read,
    Write,
    Delete,
    Share,
    ManageTeam,
}

pub struct TeamMember {
    pub username: String,
    pub role: Role,
    pub email: Option<String>,
    pub added_at: DateTime<Utc>,
}

pub struct RbacManager;

impl RbacManager {
    pub fn can_access(&self, member: &TeamMember, perm: Permission) -> bool {
        // Check role → permissions mapping
    }
    
    pub fn has_permission(&self, bundle_id: &str, member: &TeamMember, perm: Permission) -> bool {
        // Check bundle-specific permissions
    }
}
```

**Permissions Matrix**:
| Role | Read | Write | Delete | Share | ManageTeam |
|------|------|-------|--------|-------|------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ |
| Contributor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |

**Checklist**:
- [ ] Define all roles
- [ ] Define permissions per role
- [ ] Implement permission checking
- [ ] Add bundle-level permissions
- [ ] Test all combinations

**Reference**: `docs/PHASE3_MONGODB_IMPLEMENTATION.md` (lines 400-600)

---

#### Task 3.4: Create Module Root & Error Types
**File**: `crates/lsp-server/src/mongodb/mod.rs`  
**Estimated**: 1 hour  
**Lines**: ~30

```rust
pub mod config;
pub mod client;
pub mod rbac;

pub use config::{MongoConfig, MongoServer, MongoCredentials};
pub use client::MongoClient;
pub use rbac::{Role, Permission, TeamMember, RbacManager};

#[derive(Debug)]
pub enum MongoError {
    Connection(String),
    Database(String),
    Serialization(String),
    NotFound(String),
    Unauthorized(String),
}

#[derive(Debug)]
pub enum ConfigError {
    InvalidYaml(String),
    MissingField(String),
    InvalidValue(String),
}
```

**Checklist**:
- [ ] Export all types
- [ ] Add error conversions
- [ ] Document all items
- [ ] Add to `lib.rs`

---

#### Task 3.5: Update BundleManager for Hybrid Mode
**File**: `crates/lsp-server/src/bundle/manager.rs` (modify existing)  
**Estimated**: 2-2.5 hours  
**Lines**: +100-150

**Changes Needed** (See: `docs/BUNDLE_MANAGER_HYBRID_MODE_CHANGES.md`):

1. Add MongoDB client field
2. Add `MongoError` to error enum
3. Add `new_with_mongodb()` constructor
4. Make `create_bundle()` async
5. Implement MongoDB fallback logic
6. Add `save_bundle_filesystem()` helper

**Example**:
```rust
#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
    mongo_client: Option<Arc<MongoClient>>,  // NEW
}

pub async fn create_bundle(&self, ...) -> Result<String, BundleError> {
    let id = generate_id();
    let mut bundle = Bundle::new(id.clone(), name);
    
    // Try MongoDB first
    if let Some(client) = &self.mongo_client {
        match client.create_bundle(&bundle).await {
            Ok(_) => {
                tracing::info!("✅ Saved to MongoDB");
                // Backup to filesystem
                let _ = self.save_bundle_filesystem(&bundle);
                return Ok(id);
            }
            Err(e) => {
                tracing::warn!("⚠️ MongoDB failed, falling back: {}", e);
            }
        }
    }
    
    // Fallback to filesystem
    self.save_bundle_filesystem(&bundle)?;
    Ok(id)
}
```

**Checklist**:
- [ ] Add mongo_client field
- [ ] Implement new_with_mongodb()
- [ ] Make create_bundle async
- [ ] Implement fallback logic
- [ ] Add helper methods
- [ ] Update tests to async
- [ ] Test fallback mechanism

**Reference**: `docs/BUNDLE_MANAGER_HYBRID_MODE_CHANGES.md`

---

#### Task 3.6: Create MongoDB Indexes
**File**: Script or shell command  
**Estimated**: 30 minutes

**Connect to MongoDB**:
```bash
mongosh "mongodb://log_scout_analyzer:DBAAS.glTMEGM8KuzwwN5BVO0h0ge6V7OX2B4DELrU3gOD@10.118.12.173:27017,10.118.10.197:27017,10.118.11.131:27017/task_log_scout_analyzer?replicaSet=rs0"
```

**Create Indexes**:
```javascript
use task_log_scout_analyzer;

// Primary key
db.bundles.createIndex({ "id": 1 }, { unique: true });

// Search indexes
db.bundles.createIndex({ "metadata.case_id": 1 });
db.bundles.createIndex({ "metadata.tags": 1 });
db.bundles.createIndex({ "metadata.owner": 1 });

// Time-based indexes
db.bundles.createIndex({ "created_at": -1 });
db.bundles.createIndex({ "updated_at": -1 });

// Team indexes
db.bundle_permissions.createIndex({ "bundle_id": 1, "user_id": 1 }, { unique: true });
db.team_members.createIndex({ "team_id": 1 });
```

**Checklist**:
- [ ] Connect to MongoDB cluster
- [ ] Create all indexes
- [ ] Verify with db.bundles.getIndexes()
- [ ] Document index strategy

---

#### Task 3.7: Integration Tests
**File**: `crates/lsp-server/src/mongodb/tests/` (new)  
**Estimated**: 2-3 hours  
**Lines**: ~250

**Test Scenarios**:
1. MongoDB connection success/failure
2. Create bundle in MongoDB
3. Fallback to filesystem
4. Get bundle from MongoDB
5. List bundles
6. RBAC permission checking
7. Configuration loading

**Checklist**:
- [ ] Test happy path (MongoDB available)
- [ ] Test fallback (MongoDB down)
- [ ] Test RBAC rules
- [ ] Test config loading
- [ ] Test error messages
- [ ] Coverage >80%

---

### Phase 3 Summary
- **Total Code**: ~600 lines
- **Total Time**: ~12-15 hours
- **Files**: 6 new files + 1 modification
- **Testing**: Unit tests + MongoDB integration tests

---

## Log Bundle - Complete System

### Integration Overview
The log bundle system integrates Phase 1, 2, and 3:

```
User Interface (VS Code)
    ↓ (LSP)
LSP Server
    ├─ Receive "Create Bundle" command
    ├─ Call BundleManager::create_bundle()
    │   ├─ Create local Bundle struct
    │   ├─ Auto-detect services
    │   ├─ Try MongoDB (if configured)
    │   └─ Fallback to filesystem
    ├─ Send results back
    └─ Update UI
```

### User Workflow

**Step 1: Create Bundle** (LSP Handler)
```typescript
// VS Code command palette
Scout: Create Bundle
// Input: Name = "INC-12345: Presence Failure"
// Output: Bundle created with ID
```

**Step 2: Add Logs** (LSP Handler)
```typescript
// Drag/drop or command: Scout: Add Log to Bundle
// System auto-detects:
//   - jabber_trace.log → Jabber service
//   - cucm_audit.log → CUCM service
```

**Step 3: Analyze Bundle** (LSP Handler)
```typescript
// Command: Scout: Analyze Bundle
// System runs patterns on all logs
// Shows results in Annotation Dashboard
```

**Step 4: View Results** (Phase 2 Dashboard)
```typescript
// Results shown in Annotation Dashboard
// Apply filters (Phase 2):
//   - By log level
//   - By severity
//   - By category
//   - Hidden categories
// Results persist per bundle
```

### Data Storage

**Local (Always)**:
```
.log-scout/bundles/
└── bundle_abc123/
    ├── bundle.json (metadata + logs)
    └── results.json (analysis output)
```

**Remote (If MongoDB available)**:
```
MongoDB task_log_scout_analyzer
└── bundles collection
    └── documents matching Bundle schema
```

**Sync Strategy** (Hybrid Mode):
1. Write to MongoDB (if available)
2. If success: also save locally as backup
3. If failure: save locally only (log warning)
4. Read: Try MongoDB first, fallback to local

### Configuration

**`mongodb_connection.yaml`** (required for Phase 3):
```yaml
servers:
  - host: 10.118.12.173
    port: 27017
  - host: 10.118.10.197
    port: 27017
  - host: 10.118.11.131
    port: 27017
database: task_log_scout_analyzer
credentials:
  username: log_scout_analyzer
  password: DBAAS.glTMEGM8KuzwwN5BVO0h0ge6V7OX2B4DELrU3gOD
replicaSet: rs0
ssl: true
```

**VS Code Settings** (Phase 2):
```json
{
  "logScoutAnalyzer.dashboard.filterError": true,
  "logScoutAnalyzer.dashboard.filterWarning": true,
  "logScoutAnalyzer.dashboard.filterInfo": true,
  "logScoutAnalyzer.dashboard.sortBy": "time",
  "logScoutAnalyzer.dashboard.hiddenCategories": []
}
```

---

## Implementation Schedule

### Week 1 (Feb 18-22)
- **Days 1-3**: Phase 1 Models & Service Detection (Tasks 1.1-1.2)
  - Create models.rs (350 lines)
  - Create service_detector.rs (200 lines)
  - Write unit tests
  - Estimated: 6-8 hours

- **Days 4-5**: Phase 1 Manager & Analyzer (Tasks 1.3-1.4)
  - Create manager.rs (400 lines)
  - Create analyzer.rs (70 lines)
  - Integration tests
  - Estimated: 6-8 hours

**Deliverable**: Phase 1 bundle system completed and tested

### Week 2 (Feb 25-Mar 1)
- **Days 1-2**: Phase 1 LSP Integration & Testing (Tasks 1.5-1.7)
  - Create module.rs and LSP handlers
  - End-to-end testing with VS Code
  - Estimated: 8-10 hours

- **Days 3-5**: Phase 2 Dashboard Testing & Polish (Tasks 2.1-2.6)
  - Test all filter scenarios
  - Fix styling issues
  - Document results
  - Estimated: 8-10 hours

**Deliverable**: Phase 1 fully working, Phase 2 tested and production-ready

### Week 3 (Mar 4-8)
- **Days 1-2**: Phase 3 MongoDB Config & Client (Tasks 3.1-3.2)
  - Create config.rs (160 lines)
  - Create client.rs (170 lines)
  - Unit tests
  - Estimated: 4-5 hours

- **Days 3-4**: Phase 3 RBAC & Module Setup (Tasks 3.3-3.4)
  - Create rbac.rs (130 lines)
  - Create mod.rs and error types
  - Tests
  - Estimated: 3-4 hours

- **Day 5**: Phase 3 BundleManager Hybrid Mode (Task 3.5)
  - Update manager.rs
  - Implement fallback logic
  - Initial testing
  - Estimated: 2-3 hours

**Deliverable**: Phase 3 MongoDB modules implemented

### Week 4 (Mar 11-15)
- **Days 1-2**: Phase 3 MongoDB Indexes & Testing (Tasks 3.6-3.7)
  - Create indexes on MongoDB
  - Integration tests
  - Fallback mechanism testing
  - Estimated: 3-4 hours

- **Days 3-5**: Integration & System Testing
  - Test full workflow: Create → Add → Analyze → Filter
  - Test MongoDB fallback
  - Performance testing
  - Documentation
  - Estimated: 8-10 hours

**Deliverable**: Complete system tested end-to-end

### Contingency (Mar 18-22)
- Buffer time for:
  - Unexpected issues
  - Performance optimization
  - Additional testing
  - Documentation completion

---

## Dependency Management

### Required Dependencies (Already in Workspace Cargo.toml)
```toml
[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"  # For MongoDB config
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
mongodb = { version = "2.8", features = ["tokio-runtime"] }
bson = "2.9"
regex = "1"
dashmap = "5"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
anyhow = "1"
thiserror = "1"
uuid = { version = "1", features = ["v4", "serde"] }  # Add this
```

### New Dependencies to Add
```toml
uuid = { version = "1", features = ["v4", "serde"] }  # For bundle IDs
```

### Add to `Cargo.toml`:
```toml
[workspace.dependencies]
# ... existing ...
uuid = { version = "1", features = ["v4", "serde"] }
```

---

## Testing Strategy

### Unit Tests
- Models serialization/deserialization
- Service detection on 50+ samples
- Bundle CRUD operations
- Filesystem I/O
- MongoDB operations
- RBAC permission matrix

### Integration Tests
- Full bundle workflow
- MongoDB connectivity and fallback
- LSP message handling
- File operations on actual filesystem
- Config loading from YAML

### End-to-End Tests
- Create bundle from VS Code UI
- Add logs with auto-detection
- Run analysis
- View results in dashboard
- Apply filters
- Persist settings

### Performance Tests
- Large bundles (1000+ logs)
- Many annotations (5000+)
- Virtual scrolling performance
- MongoDB index performance

### Manual Tests
- All scenarios in `PHASE2_IMPLEMENTATION.md`
- MongoDB connection failures
- Filesystem I/O errors
- Network timeouts

---

## Quality Checkpoints

### Before Phase 1 Complete
- [ ] All bundle operations tested
- [ ] Service detection >95% accurate
- [ ] Error handling comprehensive
- [ ] Code documented
- [ ] Coverage >80%

### Before Phase 2 Ready
- [ ] Dashboard tested in light/dark themes
- [ ] All filters working
- [ ] Preferences persist
- [ ] No performance issues
- [ ] No memory leaks

### Before Phase 3 Complete
- [ ] MongoDB connection working
- [ ] Hybrid mode tested
- [ ] Fallback mechanism works
- [ ] RBAC enforced
- [ ] Indexes optimized

### Final System Ready When
- [ ] All phases integrated
- [ ] End-to-end workflow tested
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for user testing

---

## Success Criteria

### Phase 1: Bundle System
✅ Users can create named bundles  
✅ Auto-detection works for 95%+ of logs  
✅ Pattern matching respects service boundaries  
✅ Results persist locally  
✅ All CRUD operations work  

### Phase 2: Dashboard Filters
✅ Filter preferences persist across sessions  
✅ Sort order persists  
✅ Hidden categories feature works  
✅ Dashboard handles 10,000+ annotations  
✅ Performance acceptable (<2s load time)  

### Phase 3: MongoDB Integration
✅ MongoDB connection established  
✅ Hybrid mode works (MongoDB + filesystem)  
✅ Fallback mechanism automatic  
✅ RBAC enforced  
✅ Team collaboration enabled  

### Complete System
✅ Create bundle → Add logs → Analyze → View/filter results  
✅ All operations work offline (filesystem only)  
✅ All operations enhanced with MongoDB (when available)  
✅ Settings and preferences persist  
✅ Performance acceptable for enterprise use  

---

## Documentation Deliverables

### During Implementation
- [ ] Code comments on all public items
- [ ] Architecture diagram (if needed)
- [ ] LSP protocol documentation

### Post Implementation
- [ ] Phase 1 implementation guide
- [ ] Phase 2 test results
- [ ] Phase 3 deployment guide
- [ ] Troubleshooting guide
- [ ] MongoDB administration guide
- [ ] User documentation

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| MongoDB unavailable | High | Fallback to filesystem |
| Service detection inaccuracy | Medium | Manual override option |
| Performance issues (large files) | Medium | Virtual scrolling, async I/O |
| Configuration errors | Low | Validation on load |
| Concurrent bundle access | Low | File locking |

---

## Notes for Implementation

### Key Files to Reference
- `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` - Bundle system design
- `docs/PHASE3_MONGODB_IMPLEMENTATION.md` - MongoDB design
- `docs/BUNDLE_MANAGER_HYBRID_MODE_CHANGES.md` - Exact code changes
- `vscode-extension/src/annotationDashboardPanel.ts` - Phase 2 implementation
- `Cargo.toml` - Workspace configuration

### Important Patterns to Follow
- Use `tracing::` for logging (not println!)
- Use Result<T, E> for error handling
- Implement serde traits for all types
- Add documentation comments with examples
- Write tests as you implement (TDD)
- Use async/await for I/O operations

### VS Code Testing
```bash
# Build extension
cd vscode-extension
npm run build
npm run package

# Install for testing
code --install-extension log-scout-analyzer.vsix
```

---

**Prepared by**: GitHub Copilot  
**Date**: February 18, 2026  
**Last Updated**: February 18, 2026
