# Log Scout Analyzer: Multi-File Caching & Team Sharing Architecture Plan

**Status**: Design Phase  
**Date**: February 17, 2026  
**Vision**: Evolve from single-file LSP-based analysis to a scalable multi-file/directory system with MongoDB-backed caching and team sharing capabilities.

---

## Executive Summary

Current State: Single-file pattern analysis via LSP  
Target State: Directory-wide analysis with intelligent multi-layer caching, MongoDB persistence, and team collaboration

**Key Insight**: Transform from "analyze-on-demand" to "cache-once-share-forever" architecture, where:
- Jabber logs (10+ files) are analyzed together once, results cached by (file_hash, pattern_version)
- Team members access cached results instantly (zero recomputation)
- CUCM/Unity logs scale through chunking and pre-computed summaries
- Team sharing via MongoDB enables collaborative analysis workflows

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (VS Code Extension / Zed Extension / Web Dashboard)            │
└─────────────────┬───────────────────────────────────────────────┘
                  │ LSP Protocol (extended)
┌─────────────────▼───────────────────────────────────────────────┐
│                    LSP Server                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WorkspaceAnalyzer                                        │  │
│  │ - Workspace root tracking                               │  │
│  │ - Recursive directory scanning                          │  │
│  │ - Glob patterns & exclusions                            │  │
│  │ - Parallel file analysis (Rayon)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│                 Analysis Coordination Layer                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ AnalysisCoordinator (NEW)                               │  │
│  │ - Detects single vs. multi-file context                 │  │
│  │ - Routes to appropriate analyzer                        │  │
│  │ - Manages result aggregation                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────────────────┐
│ Pattern      │    │ Caching & Persistence    │
│ Engine       │    │ Layer                    │
│ (existing)   │    │                          │
└──────────────┘    │ ┌────────────────────┐  │
        ▲           │ │ FileCache (L1)     │  │
        │           │ │ - Single file      │  │
        │           │ │ - Hash-based key   │  │
        │           │ │ - TTL: 1 hour      │  │
        │           │ └────────────────────┘  │
        │           │                          │
        │           │ ┌────────────────────┐  │
        │           │ │DirectoryCache (L2) │  │
        │           │ │ - Directory set    │  │
        │           │ │ - Merged results   │  │
        │           │ │ - Summaries        │  │
        │           │ └────────────────────┘  │
        │           │                          │
        │           │ ┌────────────────────┐  │
        │           │ │MongoDB (L3)        │  │
        │           │ │ - Persistent store │  │
        │           │ │ - Team sharing     │  │
        │           │ │ - RBAC             │  │
        │           │ └────────────────────┘  │
        │           └──────────────────────────┘
        │                   ▲
        └───────────────────┘
```

---

## Phase 1: Extend LSP Server for Workspace/Directory Scanning

### Objectives
- Add workspace root tracking and change notifications
- Implement recursive directory discovery
- Support Jabber/CUCM/Unity multi-file structures
- Parallelize analysis across files

### Files to Create/Modify

#### New Files:
- `lsp-server/src/workspace_analyzer.rs` - Workspace and directory handling
- `lsp-server/src/models/workspace.rs` - Data models for workspace configs

#### Modified Files:
- `lsp-server/src/server.rs` - Add workspace handlers
- `lsp-server/Cargo.toml` - Add Rayon dependency (if not present)

### Implementation Details

**WorkspaceAnalyzer Responsibilities:**
```rust
pub struct WorkspaceAnalyzer {
    root_uri: Option<String>,
    config: WorkspaceConfig,
    pattern_paths: Vec<String>,
}

pub struct WorkspaceConfig {
    // File patterns to include
    include_patterns: Vec<String>,  // ["*.log", "*.txt"]
    
    // File patterns to exclude
    exclude_patterns: Vec<String>,  // ["*.tmp", "*backup*"]
    
    // Directory structure handlers
    log_set_handlers: Vec<LogSetHandler>,  // Jabber, CUCM, Unity
}

pub enum LogSetHandler {
    Jabber {
        file_count: usize,  // Expects ~10 files
    },
    CUCM {
        file_count: usize,
    },
    Unity {
        file_count: usize,
    },
    Generic,
}

pub struct DirectoryAnalysisRequest {
    pub directory: String,
    pub recursive: bool,
    pub parallel: bool,
}

pub struct DirectoryAnalysisResult {
    pub analyzed_files: Vec<FileAnalysisResult>,
    pub directory_summary: DirectorySummary,
    pub analysis_duration_ms: u64,
}

pub struct DirectorySummary {
    pub total_files: usize,
    pub total_entries: usize,
    pub error_count: usize,
    pub warning_count: usize,
    pub info_count: usize,
    pub timeline: Vec<(String, usize)>,  // (timestamp, event_count)
}
```

**LSP Protocol Extensions:**

New custom methods to add to server:
```
custom/analyzeDirectory
  Request: { directory: string, recursive: bool }
  Response: DirectoryAnalysisResult

custom/getWorkspaceStatus
  Request: {}
  Response: { 
    root_uri?: string, 
    loaded_configs: string[],
    cached_directories: string[]
  }

custom/refreshWorkspaceCache
  Request: { directory?: string }
  Response: { refreshed_count: number }
```

### Configuration File: `.log-scout/workspace.yaml`

Place at workspace root:
```yaml
version: "1.0"
analysis:
  include_patterns:
    - "*.log"
    - "*.txt"
  exclude_patterns:
    - "*.tmp"
    - "*backup*"
  recursive: true
  
log_sets:
  - type: jabber
    expected_count: 10
    file_pattern: "Jabber*"
  - type: cucm
    expected_count: 20
    file_pattern: "*cucm*"
  - type: unity
    expected_count: 15
    file_pattern: "*unity*"

cache:
  directory_cache_ttl_minutes: 60
  enable_local_disk_cache: true
  disk_cache_path: ".log-scout/cache"
```

---

## Phase 2: Design & Implement Multi-Layer Caching Strategy

### Objectives
- Create three-tier cache: file-level, directory-level, semantic grouping
- Implement intelligent invalidation based on file hash, pattern version, analyzer version
- Add TTL and manual refresh capabilities
- Design for eventual MongoDB backing

### Files to Create/Modify

#### New Files:
- `lsp-server/src/caching/cache_layer.rs` - Multi-layer cache abstraction
- `lsp-server/src/caching/file_cache.rs` - L1: File-level caching
- `lsp-server/src/caching/directory_cache.rs` - L2: Directory-level caching
- `lsp-server/src/caching/invalidation.rs` - Cache invalidation logic

#### Modified Files:
- `lsp-server/src/tagscout/cache.rs` - Extend existing cache with new layers
- `lsp-server/src/config.rs` - Add cache configuration

### Implementation Details

**Cache Key Design:**

```rust
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub enum CacheKey {
    // Single file: URI + file hash + pattern version
    File {
        uri: String,
        file_hash: String,
        pattern_version: String,
    },
    
    // Directory: path + list of file hashes + pattern version
    Directory {
        path: String,
        file_hashes: Vec<String>,  // sorted for consistency
        pattern_version: String,
    },
    
    // Semantic grouping: e.g., "jabber-session-123"
    SemanticGroup {
        group_id: String,
        pattern_version: String,
    },
}

pub struct CacheEntry<T> {
    pub key: CacheKey,
    pub value: T,
    pub created_at: SystemTime,
    pub expires_at: SystemTime,
    pub hits: u64,
    pub last_accessed: SystemTime,
}

pub struct CacheMetrics {
    pub hit_count: u64,
    pub miss_count: u64,
    pub invalidation_count: u64,
    pub avg_hit_rate: f64,
}
```

**Cache Invalidation Strategy:**

Triggers:
1. **File Modification Time**: If `mtime` changes, invalidate immediately
2. **Content Hash Mismatch**: Compute SHA256(file_content) on access; mismatch = invalidate
3. **Pattern Version Change**: New pattern set = invalidate all entries with old version
4. **Analyzer Version Change**: New analyzer binary = invalidate all entries
5. **TTL Expiration**: Soft TTL of 1 hour; check on access

```rust
pub struct InvalidationStrategy {
    pub check_mtime: bool,
    pub check_content_hash: bool,
    pub pattern_version_sensitive: bool,
    pub analyzer_version_sensitive: bool,
    pub ttl_minutes: u64,
}

pub fn is_cache_valid(entry: &CacheEntry, strategy: &InvalidationStrategy) -> bool {
    // Check TTL
    if SystemTime::now() > entry.expires_at {
        return false;
    }
    
    // Check file modification time
    if strategy.check_mtime {
        if fs::metadata(&entry.key.uri())?.modified()? > entry.created_at {
            return false;
        }
    }
    
    // Check content hash
    if strategy.check_content_hash {
        let current_hash = compute_hash(&fs::read(&entry.key.uri())?);
        if current_hash != entry.key.hash() {
            return false;
        }
    }
    
    true
}
```

**Three-Tier Cache Architecture:**

```rust
pub struct CacheLayer {
    l1_file_cache: HashMap<CacheKey, CacheEntry<FileAnalysisResult>>,
    l2_directory_cache: HashMap<CacheKey, CacheEntry<DirectoryAnalysisResult>>,
    l3_mongodb: Option<MongoDBStore>,  // Phase 3
    
    metrics: CacheMetrics,
    strategy: InvalidationStrategy,
}

impl CacheLayer {
    pub async fn get_or_analyze_file(
        &mut self,
        uri: &str,
        file_hash: &str,
        pattern_version: &str,
    ) -> Result<FileAnalysisResult> {
        let key = CacheKey::File {
            uri: uri.to_string(),
            file_hash: file_hash.to_string(),
            pattern_version: pattern_version.to_string(),
        };
        
        // Check L1 (in-memory)
        if let Some(entry) = self.l1_file_cache.get(&key) {
            if is_cache_valid(entry, &self.strategy) {
                self.metrics.hit_count += 1;
                return Ok(entry.value.clone());
            }
        }
        
        // Check L3 (MongoDB) - Phase 3
        if let Some(mongodb) = &self.l3_mongodb {
            if let Ok(Some(result)) = mongodb.get_analysis_result(&key).await {
                // Populate L1 for fast re-access
                self.l1_file_cache.insert(key, CacheEntry::new(result.clone()));
                self.metrics.hit_count += 1;
                return Ok(result);
            }
        }
        
        // Cache miss - analyze
        self.metrics.miss_count += 1;
        let result = analyze_file(uri).await?;
        
        // Store in L1 and L3
        let entry = CacheEntry::new(result.clone());
        self.l1_file_cache.insert(key.clone(), entry);
        
        if let Some(mongodb) = &self.l3_mongodb {
            mongodb.store_analysis_result(&key, &result).await?;
        }
        
        Ok(result)
    }
    
    pub async fn get_or_analyze_directory(
        &mut self,
        path: &str,
        files: Vec<String>,
        pattern_version: &str,
    ) -> Result<DirectoryAnalysisResult> {
        // Hash all files
        let file_hashes: Vec<String> = files
            .iter()
            .map(|f| compute_hash(&fs::read(f).ok()?))
            .collect::<Option<_>>()?;
        
        let key = CacheKey::Directory {
            path: path.to_string(),
            file_hashes: file_hashes.clone(),
            pattern_version: pattern_version.to_string(),
        };
        
        // Check L2
        if let Some(entry) = self.l2_directory_cache.get(&key) {
            if is_cache_valid(entry, &self.strategy) {
                return Ok(entry.value.clone());
            }
        }
        
        // Analyze each file using L1
        let file_results = futures::future::join_all(
            files.iter().enumerate().map(|(i, file)| {
                self.get_or_analyze_file(file, &file_hashes[i], pattern_version)
            })
        ).await;
        
        // Aggregate results
        let result = aggregate_results(file_results?)?;
        
        // Store in L2 and L3
        let entry = CacheEntry::new(result.clone());
        self.l2_directory_cache.insert(key.clone(), entry);
        
        if let Some(mongodb) = &self.l3_mongodb {
            mongodb.store_directory_result(&key, &result).await?;
        }
        
        Ok(result)
    }
}
```

---

## Phase 3: MongoDB Persistence & Team Sharing Layer

### Objectives
- Store immutable analysis results in MongoDB
- Enable team access with role-based access control
- Support result querying and sharing workflows
- Provide offline fallback to local cache

### Files to Create/Modify

#### New Files:
- `lsp-server/src/mongodb/client.rs` - MongoDB client wrapper
- `lsp-server/src/mongodb/schema.rs` - Document schemas
- `lsp-server/src/mongodb/access_control.rs` - RBAC implementation
- `lsp-server/src/models/team.rs` - Team and user models

#### Modified Files:
- `lsp-server/Cargo.toml` - Add mongodb crate
- `lsp-server/src/config.rs` - Add MongoDB connection settings
- `lsp-server/src/caching/cache_layer.rs` - Integrate MongoDB store

### MongoDB Schema

**Collections:**

1. **analysis_results**
```javascript
{
  _id: ObjectId,
  
  // Immutable identifiers
  file_uri: "/workspace/logs/jabber_1.log",
  file_hash: "sha256:abc123...",
  pattern_version: "1.2.3",
  analyzer_version: "2.0.0",
  
  // Analysis data
  entries: [
    {
      timestamp: "2026-02-17T10:30:00Z",
      level: "ERROR",
      message: "...",
      patterns_matched: ["pattern_id_1", "pattern_id_2"],
      severity_score: 8.5
    }
  ],
  
  // Team/Sharing metadata
  team_id: "acme-corp",
  owner_id: "user_123",
  access_level: "private|shared|public",
  
  // Timestamps
  created_at: ISODate("2026-02-17T10:00:00Z"),
  updated_at: ISODate("2026-02-17T10:00:00Z"),
  expires_at: ISODate("2026-05-17T10:00:00Z"),
  
  // Tracking
  computed_in_ms: 150,
  file_size_bytes: 1024000,
}

Indexes:
- { team_id: 1, created_at: -1 }
- { file_hash: 1, pattern_version: 1 }
- { owner_id: 1, access_level: 1 }
- { expires_at: 1 }  // TTL index: expireAfterSeconds: 2592000 (30 days)
```

2. **directory_results**
```javascript
{
  _id: ObjectId,
  
  // Directory identifiers
  directory_path: "/workspace/logs/jabber_session_1",
  file_count: 10,
  file_hashes: ["hash1", "hash2", ...],
  pattern_version: "1.2.3",
  
  // Aggregated summary
  summary: {
    total_entries: 50000,
    error_count: 150,
    warning_count: 450,
    info_count: 49400,
    timeline: [
      { timestamp: "2026-02-17T10:00:00Z", event_count: 100 },
      { timestamp: "2026-02-17T10:05:00Z", event_count: 150 }
    ],
    state_changes: [
      { timestamp: "...", old_state: "IDLE", new_state: "PROCESSING" }
    ]
  },
  
  // File-level results (references)
  file_results: ["result_id_1", "result_id_2", ...],
  
  // Team/Sharing
  team_id: "acme-corp",
  owner_id: "user_123",
  access_level: "private|shared|public",
  shared_with: ["user_456", "team_xyz"],
  
  // Timestamps
  created_at: ISODate("2026-02-17T10:00:00Z"),
  expires_at: ISODate("2026-05-17T10:00:00Z"),
}

Indexes:
- { directory_path: 1, pattern_version: 1 }
- { team_id: 1, owner_id: 1 }
- { created_at: -1 }
```

3. **team_members**
```javascript
{
  _id: ObjectId,
  
  team_id: "acme-corp",
  user_id: "user_123",
  email: "user@acme.com",
  
  role: "owner|member|reader",  // RBAC
  
  permissions: {
    can_view: true,
    can_create_analysis: true,
    can_share: false,
    can_delete_shared: false,
  },
  
  created_at: ISODate("2026-02-17T10:00:00Z"),
}

Indexes:
- { team_id: 1, user_id: 1 }
- { team_id: 1, role: 1 }
```

**RBAC Role Definitions:**

| Role | View | Create | Share | Delete | Admin |
|------|------|--------|-------|--------|-------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Member | ✅ | ✅ | ✅ | Own only | ❌ |
| Reader | ✅ | ❌ | ❌ | ❌ | ❌ |

### Rust Models

```rust
pub struct AnalysisResult {
    pub id: Option<ObjectId>,
    pub file_uri: String,
    pub file_hash: String,
    pub pattern_version: String,
    pub analyzer_version: String,
    
    pub entries: Vec<LogEntry>,
    
    pub team_id: String,
    pub owner_id: String,
    pub access_level: AccessLevel,
    
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    
    pub computed_in_ms: u64,
    pub file_size_bytes: u64,
}

pub enum AccessLevel {
    Private,
    Shared(Vec<String>),  // user/team IDs
    Public,
}

pub struct TeamMember {
    pub team_id: String,
    pub user_id: String,
    pub email: String,
    pub role: TeamRole,
    pub permissions: Permissions,
}

pub enum TeamRole {
    Owner,
    Member,
    Reader,
}

pub struct Permissions {
    pub can_view: bool,
    pub can_create_analysis: bool,
    pub can_share: bool,
    pub can_delete_shared: bool,
}

pub struct MongoDBStore {
    client: MongoClient,
    db: Database,
}

impl MongoDBStore {
    pub async fn store_analysis_result(&self, result: &AnalysisResult) -> Result<()> {
        self.db
            .collection::<AnalysisResult>("analysis_results")
            .insert_one(result, None)
            .await?;
        Ok(())
    }
    
    pub async fn get_team_results(
        &self,
        team_id: &str,
        user_id: &str,
    ) -> Result<Vec<AnalysisResult>> {
        // Check user role and permissions
        let member = self.get_team_member(team_id, user_id).await?;
        
        if !member.permissions.can_view {
            return Err("Access denied".into());
        }
        
        let filter = doc! {
            "team_id": team_id,
            "$or": [
                { "owner_id": user_id },
                { "shared_with": user_id },
                { "access_level": "public" }
            ]
        };
        
        let results = self.db
            .collection::<AnalysisResult>("analysis_results")
            .find(filter, None)
            .await?
            .try_collect()
            .await?;
        
        Ok(results)
    }
    
    pub async fn share_analysis(
        &self,
        result_id: &str,
        team_id: &str,
        requester_id: &str,
        target_users: Vec<String>,
    ) -> Result<()> {
        // Check requester permissions
        let member = self.get_team_member(team_id, requester_id).await?;
        
        if !member.permissions.can_share {
            return Err("Permission denied".into());
        }
        
        // Update access
        self.db
            .collection::<AnalysisResult>("analysis_results")
            .update_one(
                doc! { "_id": ObjectId::from_str(result_id)? },
                doc! {
                    "$push": {
                        "shared_with": { "$each": target_users }
                    }
                },
                None,
            )
            .await?;
        
        Ok(())
    }
}
```

---

## Phase 4: Performance & Scalability Optimizations

### Objectives
- Handle large combined log sets (CUCM/Unity with 100K+ entries)
- Implement streaming/chunked processing
- Add result indexing for fast queries
- Memory-aware buffering

### Files to Create/Modify

#### New Files:
- `crates/pattern-engine/src/streaming.rs` - Chunked processing
- `crates/pattern-engine/src/memory_buffer.rs` - Configurable memory limits
- `lsp-server/src/mongodb/indexing.rs` - Index management

#### Modified Files:
- `crates/pattern-engine/src/engine.rs` - Integrate streaming
- `lsp-server/src/config.rs` - Add performance config

### Implementation Details

**Streaming/Chunked Processing:**

```rust
pub struct StreamingAnalyzer {
    chunk_size_bytes: usize,  // Default 10MB
    max_buffer_entries: usize,  // Default 10,000
}

pub struct ChunkedFile {
    pub path: String,
    pub total_size: u64,
    pub chunks: Vec<FileChunk>,
}

pub struct FileChunk {
    pub chunk_index: usize,
    pub offset: u64,
    pub size: u64,
    pub content: Vec<u8>,
}

impl StreamingAnalyzer {
    pub async fn analyze_large_file(
        &self,
        path: &str,
    ) -> Result<CompleteAnalysisResult> {
        let file = File::open(path)?;
        let file_size = file.metadata()?.len();
        
        let mut results = Vec::new();
        let mut buffer = Vec::new();
        let mut offset = 0u64;
        
        // Stream file in chunks
        loop {
            let mut chunk = vec![0u8; self.chunk_size_bytes];
            let bytes_read = file.read(&mut chunk)?;
            
            if bytes_read == 0 {
                break;
            }
            
            chunk.truncate(bytes_read);
            
            // Analyze chunk
            let chunk_result = self.analyze_chunk(&chunk, offset).await?;
            results.extend(chunk_result);
            
            // Check memory usage
            if buffer.len() > self.max_buffer_entries {
                // Flush to storage
                self.flush_buffer(&buffer).await?;
                buffer.clear();
            }
            
            offset += bytes_read as u64;
        }
        
        Ok(aggregate_results(results))
    }
    
    async fn analyze_chunk(
        &self,
        chunk: &[u8],
        offset: u64,
    ) -> Result<Vec<LogEntry>> {
        // Pattern matching on chunk
        // Handle line boundaries carefully
        let chunk_str = String::from_utf8_lossy(chunk);
        let entries = parse_and_analyze(&chunk_str)?;
        
        Ok(entries)
    }
}
```

**Memory-Aware Configuration:**

```yaml
# In workspace.yaml or lsp config
performance:
  chunk_size_mb: 10
  max_buffer_entries: 10000
  
  # Auto-adjust based on available system memory
  memory_limit_mb: 2048
  auto_adjust: true
  
  # Streaming thresholds
  stream_file_threshold_mb: 100  # Files > 100MB use streaming
  
  # Parallel processing
  max_parallel_files: 4
  use_rayon_threadpool: true
```

**MongoDB Indexing Strategy:**

```rust
pub async fn ensure_indexes(db: &Database) -> Result<()> {
    let analysis_coll = db.collection::<Document>("analysis_results");
    
    // Index 1: Team + Created time (for recent results)
    analysis_coll.create_index(
        IndexModel::builder()
            .keys(doc! { "team_id": 1, "created_at": -1 })
            .build(),
        None,
    ).await?;
    
    // Index 2: File identification (for cache lookup)
    analysis_coll.create_index(
        IndexModel::builder()
            .keys(doc! { "file_hash": 1, "pattern_version": 1 })
            .build(),
        None,
    ).await?;
    
    // Index 3: Access control (for sharing queries)
    analysis_coll.create_index(
        IndexModel::builder()
            .keys(doc! { 
                "team_id": 1, 
                "owner_id": 1, 
                "access_level": 1 
            })
            .build(),
        None,
    ).await?;
    
    // Index 4: TTL (automatic expiration)
    analysis_coll.create_index(
        IndexModel::builder()
            .keys(doc! { "expires_at": 1 })
            .options(IndexOptions::builder()
                .expire_after(Duration::from_secs(2_592_000))  // 30 days
                .build())
            .build(),
        None,
    ).await?;
    
    Ok(())
}
```

---

## Phase 5: UI/Client Integration for Multi-File Workflows

### Objectives
- Add workspace analysis view to VS Code/Zed extensions
- Visualize cached files and directories
- Implement cross-file navigation
- Show team shared analysis

### VS Code Extension Changes

**New Views (in package.json):**

```json
{
  "views": {
    "log-scout": [
      {
        "id": "log-scout.workspace-analysis",
        "name": "Workspace Analysis",
        "when": "workspaceFolderCount > 0"
      },
      {
        "id": "log-scout.cached-files",
        "name": "Cached Logs",
        "when": "workspaceFolderCount > 0"
      },
      {
        "id": "log-scout.team-shared",
        "name": "Team Shared",
        "when": "config.logScout.teamMode"
      }
    ]
  },
  
  "commands": [
    {
      "command": "log-scout.analyzeDirectory",
      "title": "Analyze Directory",
      "category": "Log Scout"
    },
    {
      "command": "log-scout.refreshCache",
      "title": "Refresh Cache",
      "category": "Log Scout"
    },
    {
      "command": "log-scout.shareAnalysis",
      "title": "Share Analysis with Team",
      "category": "Log Scout"
    }
  ]
}
```

**Workspace Analysis View Provider:**

```typescript
export class WorkspaceAnalysisProvider implements TreeDataProvider<WorkspaceItem> {
    async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
        if (!element) {
            // Root: show directories
            const dirs = await this.lspClient.sendRequest('custom/getWorkspaceStatus');
            return dirs.cached_directories.map(dir => ({
                path: dir,
                type: 'directory',
                collapsibleState: TreeItemCollapsibleState.Collapsible,
            }));
        }
        
        // Children: show files in directory
        const files = await this.lspClient.sendRequest('custom/analyzeDirectory', {
            directory: element.path,
            recursive: false,
        });
        
        return files.analyzed_files.map(f => ({
            path: f.uri,
            type: 'file',
            label: `${Path.basename(f.uri)} (${f.entry_count} entries)`,
            collapsibleState: TreeItemCollapsibleState.None,
        }));
    }
}
```

---

## Implementation Roadmap

### Timeline
- **Week 1 (Feb 17-23)**: Phase 1 - Workspace analyzer infrastructure
- **Week 2-3 (Feb 24-Mar 9)**: Phase 2 - Multi-layer caching
- **Week 4-5 (Mar 10-23)**: Phase 3 - MongoDB integration
- **Week 6-7 (Mar 24-Apr 6)**: Phase 4 - Performance optimizations
- **Week 8 (Apr 7-13)**: Phase 5 - UI integration and testing

### Dependencies to Add

```toml
[dependencies]
# Phase 1
rayon = "1.7"  # Parallel processing

# Phase 2
sha2 = "0.10"  # File hashing

# Phase 3
mongodb = "2.5"
tokio = { version = "1.35", features = ["full"] }
serde_json = "1.0"

# Phase 4
bytes = "1.5"

# General
async-trait = "0.1"
thiserror = "1.0"
serde = { version = "1.0", features = ["derive"] }
```

---

## Migration & Backward Compatibility

### Strategy
All existing single-file LSP methods remain unchanged. New multi-file capabilities are purely additive.

**AnalysisCoordinator Pattern:**
```rust
pub enum AnalysisContext {
    SingleFile {
        uri: String,
    },
    MultiFile {
        directory: String,
        files: Vec<String>,
    },
}

pub struct AnalysisCoordinator {
    single_file_analyzer: PatternEngine,
    multi_file_analyzer: WorkspaceAnalyzer,
}

impl AnalysisCoordinator {
    pub async fn analyze(&self, context: AnalysisContext) -> Result<AnalysisResult> {
        match context {
            AnalysisContext::SingleFile { uri } => {
                // Use existing single-file path
                self.single_file_analyzer.analyze(&uri).await
            }
            AnalysisContext::MultiFile { directory, files } => {
                // Use new multi-file path
                self.multi_file_analyzer.analyze_directory(&directory, files).await
            }
        }
    }
}
```

### LSP Capability Negotiation
```rust
// Server declares capabilities
{
  "capabilities": {
    "textDocumentSync": "Full",
    "hoverProvider": true,
    "custom/multiFileAnalysis": true,  // NEW
    "custom/caching": {                // NEW
      "fileCaching": true,
      "directoryCaching": true,
      "teamSharing": true,
    },
    // ... existing capabilities ...
  }
}
```

---

## Data Migration & Cleanup

### Phase 3 to Phase 4 Migration
When MongoDB is enabled:
1. Migrate all L1 (file cache) entries → MongoDB
2. Keep L1 cache warm from MongoDB on startup
3. Implement periodic sync (every 5 minutes)

### TTL & Expiration
- Individual file results: 30-day TTL (configurable)
- Directory results: 30-day TTL
- Automatic cleanup via MongoDB TTL index
- Manual purge available: `custom/clearExpiredCache`

---

## Monitoring & Observability

### Metrics to Track
```rust
pub struct CacheMetrics {
    pub hit_count: u64,
    pub miss_count: u64,
    pub hit_rate: f64,
    pub avg_analysis_time_ms: u64,
    pub invalidation_count: u64,
    pub mongodb_latency_ms: Option<u64>,
}

pub struct WorkspaceMetrics {
    pub total_files_analyzed: u64,
    pub total_entries_processed: u64,
    pub parallel_workers_active: usize,
    pub memory_usage_mb: u64,
}
```

### LSP Custom Methods for Monitoring
```
custom/getCacheMetrics
  Response: CacheMetrics

custom/getWorkspaceMetrics
  Response: WorkspaceMetrics
```

---

## Testing Strategy

### Unit Tests
- Cache invalidation logic
- CacheKey uniqueness
- RBAC permission checks
- Chunk processing boundaries

### Integration Tests
- Multi-file analysis aggregation
- MongoDB CRUD operations
- Cache hit/miss scenarios
- TTL expiration

### Performance Tests
- Benchmark: 100MB file streaming vs. single-load
- MongoDB index performance: 100K documents query
- Parallel analysis: 4-file vs. 1-file throughput

---

## Known Unknowns & Questions

1. **MongoDB Infrastructure**: Host MongoDB locally, use managed service (Atlas), or containerized (Docker)?
2. **Offline-First vs. Online-First**: Should team sharing require network, or pull from MongoDB on background sync?
3. **Conflict Resolution**: If two team members analyze the same directory simultaneously, combine results or last-write-wins?
4. **Privacy**: Encryption at rest for sensitive logs in MongoDB?

---

## Success Criteria

- ✅ Directory analysis 10x faster with caching than first run
- ✅ 95%+ cache hit rate for repeated team analysis
- ✅ CUCM/Unity (100K+ entries) analyzes in < 5 seconds with streaming
- ✅ Team members can access shared analysis < 500ms (MongoDB query)
- ✅ RBAC prevents unauthorized access to private analyses
- ✅ Single-file analysis unchanged (backward compatible)
