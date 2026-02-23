# Log Scout Analyzer - Quick Reference Guide

**Last Updated**: February 18, 2026  
**For**: Developers implementing Phases 1-3

---

## 🎯 Current Status At-a-Glance

| Component | Status | Priority | Est. Time |
|-----------|--------|----------|-----------|
| **Phase 1: Bundling** | Designed ✅ | **HIGH** | 16-20h |
| **Phase 2: Filters** | Implemented ✅ | MEDIUM | 8-10h (testing) |
| **Phase 3: MongoDB** | Designed ✅ | **HIGH** | 12-15h |
| **LSP Server** | Skeleton 🟡 | **CRITICAL** | - |

---

## 📋 Quick Implementation Checklist

### Phase 1: Local Log Bundling (Week 1-2)
```
□ Task 1.1: Create models.rs (350 lines)
□ Task 1.2: Create service_detector.rs (200 lines)
□ Task 1.3: Create manager.rs (400 lines)
□ Task 1.4: Create analyzer.rs (70 lines)
□ Task 1.5: Create mod.rs and wire to lib.rs
□ Task 1.6: Implement LSP handlers
□ Task 1.7: Write unit tests (300 lines)
✓ TOTAL: ~1,100 lines | 16-20 hours
```

### Phase 2: Dashboard Testing (Week 2)
```
□ Task 2.1: Test filter persistence
□ Task 2.2: Test hidden categories
□ Task 2.3: Test virtual scrolling (5000+)
□ Task 2.4: Refine webview styling
□ Task 2.5: Fix known issues
□ Task 2.6: Create test documentation
✓ TOTAL: 8-10 hours | Ready to ship
```

### Phase 3: MongoDB (Week 3-4)
```
□ Task 3.1: Create config.rs (160 lines)
□ Task 3.2: Create client.rs (170 lines)
□ Task 3.3: Create rbac.rs (130 lines)
□ Task 3.4: Create mod.rs and error types
□ Task 3.5: Update BundleManager hybrid mode (+100 lines)
□ Task 3.6: Create MongoDB indexes
□ Task 3.7: Integration tests (250 lines)
✓ TOTAL: ~600 lines | 12-15 hours
```

---

## 🏗️ Directory Structure to Create

```bash
# Phase 1: Bundle System
crates/lsp-server/src/bundle/
├── mod.rs              # Module root (created Week 1)
├── models.rs           # Bundle, Detection types
├── service_detector.rs # Service detection logic
├── manager.rs          # CRUD operations
├── analyzer.rs         # Pattern matching
└── tests/
    ├── models_tests.rs
    ├── detector_tests.rs
    ├── manager_tests.rs
    └── analyzer_tests.rs

# Phase 3: MongoDB Integration
crates/lsp-server/src/mongodb/
├── mod.rs              # Module root
├── config.rs           # YAML config loader
├── client.rs           # MongoDB wrapper
├── rbac.rs             # Role-based access
└── tests/
    ├── config_tests.rs
    ├── client_tests.rs
    └── rbac_tests.rs
```

---

## 🔧 Key Code Snippets

### Phase 1: Bundle Creation
```rust
// models.rs
#[derive(Serialize, Deserialize, Clone)]
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

impl Bundle {
    pub fn new(id: String, name: String) -> Self {
        Self {
            id,
            name,
            description: None,
            logs: Vec::new(),
            metadata: BundleMetadata::default(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            analysis: None,
        }
    }
}
```

### Phase 1: Service Detection
```rust
// service_detector.rs
pub struct ServiceDetector;

impl ServiceDetector {
    pub fn from_filename(path: &str) -> Option<ServiceType> {
        let lower = path.to_lowercase();
        
        if lower.contains("jabber") { return Some(ServiceType::Jabber); }
        if lower.contains("cucm") { return Some(ServiceType::CUCM); }
        if lower.contains("cup") || lower.contains("presence") { 
            return Some(ServiceType::CUP); 
        }
        // ... etc
        
        None
    }
}
```

### Phase 1: Manager Structure
```rust
// manager.rs
#[derive(Clone)]
pub struct BundleManager {
    bundles_dir: PathBuf,
    index_path: PathBuf,
    mongo_client: Option<Arc<MongoClient>>, // For Phase 3
}

impl BundleManager {
    pub fn new(workspace_root: &Path) -> Result<Self, BundleError> {
        let bundles_dir = workspace_root.join(".log-scout").join("bundles");
        fs::create_dir_all(&bundles_dir)?;
        
        let index_path = bundles_dir.join("index.json");
        if !index_path.exists() {
            fs::write(&index_path, "{\"bundles\": []}")?;
        }
        
        Ok(Self {
            bundles_dir,
            index_path,
            mongo_client: None,
        })
    }
    
    pub async fn create_bundle(
        &self,
        name: String,
        description: Option<String>,
        metadata: Option<BundleMetadata>,
    ) -> Result<String, BundleError> {
        let id = format!("bundle_{}", uuid::Uuid::new_v4());
        // Implementation
        Ok(id)
    }
}
```

### Phase 2: Filter Persistence
```typescript
// annotationDashboardPanel.ts
private _saveFilterState(state: any) {
    const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
    if (state.filterError !== undefined) {
        config.update('dashboard.filterError', state.filterError, 
                     vscode.ConfigurationTarget.Workspace);
    }
    // ... save all other filters
}

private _sendFilterState() {
    const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
    this._panel.webview.postMessage({
        command: 'setFilterState',
        state: {
            filterError: config.get<boolean>('dashboard.filterError', true),
            filterWarn: config.get<boolean>('dashboard.filterWarn', true),
            // ... etc
        }
    });
}
```

### Phase 3: MongoDB Config
```rust
// config.rs
pub struct MongoConfig {
    pub servers: Vec<MongoServer>,
    pub database: String,
    pub credentials: MongoCredentials,
    pub replica_set: Option<String>,
    pub ssl: bool,
}

impl MongoConfig {
    pub fn load(path: &Path) -> Result<Self, ConfigError> {
        let content = fs::read_to_string(path)?;
        let yaml: serde_yaml::Value = serde_yaml::from_str(&content)?;
        
        // Parse and validate
        Ok(Self { /* ... */ })
    }
    
    pub fn connection_string(&self) -> String {
        let servers = self.servers
            .iter()
            .map(|s| format!("{}:{}", s.host, s.port))
            .collect::<Vec<_>>()
            .join(",");
        
        format!(
            "mongodb://{}:{}@{}/{}?replicaSet={}",
            self.credentials.username,
            self.credentials.password,
            servers,
            self.database,
            self.replica_set.as_deref().unwrap_or("rs0")
        )
    }
}
```

### Phase 3: MongoDB Client
```rust
// client.rs
pub struct MongoClient {
    client: mongodb::Client,
    db: mongodb::Database,
}

impl MongoClient {
    pub async fn new(config: &MongoConfig) -> Result<Self, MongoError> {
        let uri = config.connection_string();
        let client = mongodb::Client::with_uri_str(&uri)
            .await
            .map_err(|e| MongoError::Connection(e.to_string()))?;
        
        let db = client.database(&config.database);
        
        // Test connectivity
        db.run_command(doc! { "ping": 1 }, None)
            .await
            .map_err(|e| MongoError::Connection(e.to_string()))?;
        
        Ok(Self { client, db })
    }
    
    pub async fn create_bundle(&self, bundle: &Bundle) -> Result<String, MongoError> {
        let collection = self.db.collection::<Bundle>("bundles");
        let result = collection.insert_one(bundle.clone(), None)
            .await
            .map_err(|e| MongoError::Database(e.to_string()))?;
        
        Ok(bundle.id.clone())
    }
}
```

### Phase 3: BundleManager Hybrid Mode
```rust
// manager.rs (updated)
pub async fn create_bundle(
    &self,
    name: String,
    description: Option<String>,
    metadata: Option<BundleMetadata>,
) -> Result<String, BundleError> {
    let id = format!("bundle_{}", uuid::Uuid::new_v4());
    let mut bundle = Bundle::new(id.clone(), name);
    bundle.description = description;
    if let Some(meta) = metadata {
        bundle.metadata = meta;
    }

    // Try MongoDB first if available
    if let Some(client) = &self.mongo_client {
        match client.create_bundle(&bundle).await {
            Ok(_) => {
                tracing::info!("✅ Bundle created in MongoDB: {}", id);
                // Backup to filesystem
                let _ = self.save_bundle_filesystem(&bundle);
                return Ok(id);
            }
            Err(e) => {
                tracing::warn!("⚠️ MongoDB failed, falling back to filesystem: {}", e);
            }
        }
    }

    // Fallback to filesystem
    self.save_bundle_filesystem(&bundle)?;
    Ok(id)
}

async fn save_bundle_filesystem(&self, bundle: &Bundle) -> Result<(), BundleError> {
    let bundle_dir = self.bundles_dir.join(&bundle.id);
    fs::create_dir_all(&bundle_dir)?;
    
    let bundle_path = bundle_dir.join("bundle.json");
    let json = serde_json::to_string_pretty(bundle)?;
    fs::write(&bundle_path, json)?;
    
    Ok(())
}
```

---

## 📍 File Locations Reference

### Phase 1 - Bundle System
| File | Location | Lines | Status |
|------|----------|-------|--------|
| Models | `crates/lsp-server/src/bundle/models.rs` | 350 | Create |
| Service Detector | `crates/lsp-server/src/bundle/service_detector.rs` | 200 | Create |
| Manager | `crates/lsp-server/src/bundle/manager.rs` | 400 | Create |
| Analyzer | `crates/lsp-server/src/bundle/analyzer.rs` | 70 | Create |
| Module Root | `crates/lsp-server/src/bundle/mod.rs` | 10 | Create |
| LSP Handlers | `crates/lsp-server/src/lsp_handlers.rs` | 150 | Create |
| Tests | `crates/lsp-server/src/bundle/tests/` | 300 | Create |

### Phase 2 - Dashboard
| File | Location | Status |
|------|----------|--------|
| Backend | `vscode-extension/src/annotationDashboardPanel.ts` | ✅ Done |
| Frontend | `vscode-extension/media/annotationDashboard.js` | ✅ Done |
| Styling | `vscode-extension/media/annotationDashboard.css` | ✅ Done |
| Config | `vscode-extension/package.json` | ✅ Done |

### Phase 3 - MongoDB
| File | Location | Lines | Status |
|------|----------|-------|--------|
| Config | `crates/lsp-server/src/mongodb/config.rs` | 160 | Create |
| Client | `crates/lsp-server/src/mongodb/client.rs` | 170 | Create |
| RBAC | `crates/lsp-server/src/mongodb/rbac.rs` | 130 | Create |
| Module Root | `crates/lsp-server/src/mongodb/mod.rs` | 30 | Create |
| Tests | `crates/lsp-server/src/mongodb/tests/` | 250 | Create |
| Manager Update | `crates/lsp-server/src/bundle/manager.rs` | +100 | Modify |

---

## 🔗 Documentation Cross-References

### Phase 1 Design
- **Full Design**: `docs/PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (743 lines)
- **Implementation Reference**: `docs/PHASE1_IMPLEMENTATION_COMPLETE.md` (463 lines)
- **Data Models Section**: `PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 150-350)
- **Service Detection Section**: `PHASE1_LOCAL_LOG_BUNDLING_DESIGN.md` (lines 350-450)

### Phase 2 Implementation
- **Feature Guide**: `vscode-extension/PHASE2_IMPLEMENTATION.md` (192 lines)
- **Test Checklist**: `vscode-extension/PHASE2_IMPLEMENTATION.md` (lines 140-192)
- **Configuration**: `vscode-extension/package.json` (search for `dashboard`)

### Phase 3 Design
- **Full Implementation Guide**: `docs/PHASE3_MONGODB_IMPLEMENTATION.md` (1204 lines)
- **MongoDB Setup**: `docs/PHASE3_MONGODB_IMPLEMENTATION.md` (lines 1-100)
- **Bundle Manager Changes**: `docs/BUNDLE_MANAGER_HYBRID_MODE_CHANGES.md` (241 lines)
- **Index Creation**: `docs/PHASE3_COMPLETE.md` (lines 100-150)

---

## 🚀 Getting Started Now

### Step 1: Set Up Your Environment
```bash
# Open project in VS Code or Zed
cd c:\Users\mitchong\code\log_scout_analyzer

# Check Rust setup
rustc --version   # Should be 1.70+
cargo --version   # Should be 1.70+

# Build to verify setup
cargo build --release  # Should succeed (crates only partially implemented)
```

### Step 2: Start Phase 1
```bash
# Create the bundle module directory
mkdir -p crates/lsp-server/src/bundle

# Create starter models.rs
# (Start with the code snippet above)

# Build incrementally
cargo build --lib  # Should show no errors after models.rs added
```

### Step 3: Follow Implementation Plan
- Use `IMPLEMENTATION_PLAN_PHASES_1_3.md` as your day-by-day guide
- Cross-reference with design docs when needed
- Write tests as you implement

### Step 4: Test Incrementally
```bash
# After each module
cargo test -p log-scout-lsp-server

# Full build check
cargo build --release

# Run specific tests
cargo test --test bundle_tests
```

---

## ⚠️ Important Notes

### Must Remember
1. **Use `tracing::` for logging** - NOT `println!`
2. **Add Serialize/Deserialize** to all types that need persistence
3. **Make I/O async** - Use `tokio::fs` not `std::fs`
4. **Test service detection** - Real-world logs vary
5. **Document everything** - All public items need doc comments

### Common Pitfalls to Avoid
- ❌ Forgetting to wire new modules in `lib.rs`
- ❌ Using sync I/O in async context
- ❌ Not handling errors properly
- ❌ Ignoring Phase 1 design docs
- ❌ Not writing tests as you go

### Best Practices to Follow
- ✅ TDD approach - write test first
- ✅ Small commits - one feature per commit
- ✅ Build frequently - catch issues early
- ✅ Reference existing code - consistency matters
- ✅ Read error messages - they're helpful

---

## 📊 Progress Tracking

### What to Track
```
Progress Checklist:
□ Week 1: Phase 1 models + detector done
□ Week 1-2: Phase 1 manager + analyzer done
□ Week 2: Phase 1 LSP integration working
□ Week 2: Phase 2 dashboard tested
□ Week 3: Phase 3 config + client done
□ Week 3-4: Phase 3 RBAC + BundleManager done
□ Week 4: Full integration tested
□ Week 4: Documentation complete
```

### Success Metrics
```
Code:
  - No compiler warnings
  - 80%+ test coverage
  - <30 seconds full build
  
Features:
  - All Phase 1 operations work
  - Phase 2 filters persist
  - Phase 3 MongoDB + fallback work
  
Performance:
  - 5000+ annotations in <2s
  - Service detection <100ms
  - Bundle CRUD <500ms
```

---

## 🎓 Learning Resources in Project

### Existing Examples
- `crates/pattern-engine/src/` - Good reference for structure
- `crates/pattern-loader/src/` - Reference for persistence
- `vscode-extension/src/annotationDashboardPanel.ts` - Good TypeScript patterns
- `examples/` - Example code you can reference

### MongoDB Resources
- `mongodb_connection.yaml` - Connection config file in repo root
- MongoDB docs: https://docs.mongodb.com/drivers/rust/
- Your cluster info in code comments

### LSP Resources
- `tower-lsp` crate docs: https://docs.rs/tower-lsp/latest/tower_lsp/
- LSP specification: https://microsoft.github.io/language-server-protocol/

---

## 🔐 Credentials & Config

### MongoDB Cluster (For Phase 3)
```
Host: 10.118.12.173:27017, 10.118.10.197:27017, 10.118.11.131:27017
Database: task_log_scout_analyzer
User (RW): log_scout_analyzer
Password: DBAAS.glTMEGM8KuzwwN5BVO0h0ge6V7OX2B4DELrU3gOD
ReplicaSet: rs0
```

**Note**: This is already in the design docs. Keep `mongodb_connection.yaml` in `.gitignore`.

### VS Code Test Setup
- Open workspace: `c:\Users\mitchong\code\log_scout_analyzer`
- Install extension: `code --install-extension log-scout-analyzer.vsix`
- Create test logs in workspace
- Open Command Palette → Scout commands

---

## 📞 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Compiler error: "module not found" | Add `pub mod bundle;` to `lib.rs` |
| Tests not running | Run from workspace root: `cargo test -p log-scout-lsp-server` |
| MongoDB connection fails | Check YAML format, credentials, network |
| Performance issues | Check for N+1 queries, add indexes |
| Serialization errors | Verify `#[derive(Serialize, Deserialize)]` |

---

## 📋 Pre-Implementation Checklist

Before you start, verify:
- [ ] Rust toolchain updated (`rustup update`)
- [ ] VS Code has Rust Analyzer extension
- [ ] Project builds: `cargo build --release`
- [ ] Tests run: `cargo test`
- [ ] Read `PROJECT_STATUS_REVIEW.md` - understand current state
- [ ] Read `IMPLEMENTATION_PLAN_PHASES_1_3.md` - understand plan
- [ ] Have MongoDB cluster info saved
- [ ] Have `mongodb_connection.yaml` ready for Phase 3

---

**This guide prepared by**: GitHub Copilot  
**Date**: February 18, 2026  
**Use this as your daily reference while implementing!**
