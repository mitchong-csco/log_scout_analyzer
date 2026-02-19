# Log Scout Analyzer: Log Collection Evolution Roadmap

**Status**: Planning Phase  
**Date**: February 17, 2026  
**Vision**: Transform from single-file LSP analysis to investigation-centric "Log Collection" model for multi-system case analysis

---

## The Core Shift: From Files to Investigations

### Current Model (File-Centric)
```
User opens Jabber.log in Editor
    ↓
LSP Server (on file change)
    ↓
Pattern Engine (runs all patterns)
    ↓
Show diagnostics in editor
    ↓
User manually opens CUCM_trace.log in separate tab
    ↓
(repeat separately - no connection between analyses)
```

**Problem:** Each file analyzed in isolation. No persistent record. No cross-system insights.

### Target Model (Investigation-Centric)
```
Support Engineer creates Collection: "Presence Failure - user@acme.com"
    ↓
Adds logs to collection:
  - Jabber.log (Device 1)
  - Jabber.log (Device 2)
  - CUCM_trace.log (Call Manager 1)
  - CUP_service.log (Presence Service)
    ↓
Configures metadata:
  - Case ID: INC-12345
  - User: alice@acme.com
  - Issue: "Cannot register for presence"
  - Timeline: Feb 17, 10:00-10:30 UTC
    ↓
Clicks "Analyze Collection"
    ↓
System processes:
  1. Parses each log (format-aware)
  2. Aligns timestamps across systems
  3. Runs patterns per-system AND cross-system patterns
  4. Detects anomalies (e.g., "Jabber offline 0.5s before CUP unregister")
    ↓
Shows unified timeline + anomalies + evidence
    ↓
Shares with engineering team (read-only link)
    ↓
Team adds notes, patterns, finds root cause
```

**Benefit:** Holistic view. Persistent investigation record. Team collaboration. Audit trail.

---

## Phase Evolution Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 1: Collections (Weeks 1-8)                                    │
│ Goal: Enable persistent collection storage & basic CRUD             │
├─────────────────────────────────────────────────────────────────────┤
│ • MongoDB collection schema                                          │
│ • LSP endpoints: createCollection, addLog, getCollection             │
│ • UI: Collections sidebar + metadata editor                          │
│ • Backward compat: ephemeral collections for single-file analysis    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 2: Format Awareness (Weeks 9-14)                              │
│ Goal: Understand log sources & filter patterns accordingly           │
├─────────────────────────────────────────────────────────────────────┤
│ • LogMetadata: source_system, log_type, timestamp_format             │
│ • Pattern filtering by source                                        │
│ • Format-aware analyzer (coordinates multi-file analysis)            │
│ • Metadata UI: auto-detect + manual override                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 3: Temporal Correlation (Weeks 15-22)                         │
│ Goal: Align events chronologically + detect cross-system anomalies   │
├─────────────────────────────────────────────────────────────────────┤
│ • Timestamp parsing + normalization                                  │
│ • Temporal index (in-memory, sorted by timestamp)                    │
│ • Cross-system pattern type (temporal_correlation YAML)              │
│ • Timeline UI: unified event view + anomaly highlighting             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Phase 4: Team Collaboration (Weeks 23-28)                           │
│ Goal: Share collections, track contributors, enable group analysis   │
├─────────────────────────────────────────────────────────────────────┤
│ • Permissions: owner/collaborators, visibility levels                │
│ • Activity log: who added what log, when                             │
│ • Sharing UI + notification system                                   │
│ • Export: PDF/HTML with analysis + temporal graph                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Collections as First-Class Entities

### What Happens
- **Users can create named collections** (e.g., "INC-12345 Presence Failure")
- **Logs are added to collections** with basic metadata (filename, size, timestamp added)
- **Collections persist in MongoDB** - investigation record lives beyond editor session
- **Single-file analysis still works** - ephemeral collections created automatically (hidden)

### Data Flow
```
User Action               LSP Request                    MongoDB
─────────────────────────────────────────────────────────────────
"Create Collection"  →    createCollection             Collections
                          (name, description)          {id, name, logs[]}
                                    ↓
"Add Current File"   →    addLogToCollection           Update Collections
                          (collectionId, uri)          logs += {uri}
                                    ↓
"View Collection"    →    getCollection               Query Collections
                          (collectionId)              Return doc
```

### MongoDB Schema
```yaml
db.collections:
  {
    _id: ObjectId,
    id: "col-123abc",
    name: "INC-12345: Presence Failure",
    description: "User alice cannot register for presence",
    created_by: "engineer@acme.com",
    created_at: ISODate("2026-02-17T10:00:00Z"),
    updated_at: ISODate("2026-02-17T10:30:00Z"),
    
    metadata: {
      case_id: "INC-12345",
      severity: "high",
      tags: ["presence", "jabber", "cucm"]
    },
    
    logs: [
      {
        uri: "file:///C:/logs/Jabber.log",
        filename: "Jabber.log",
        size_bytes: 1048576,
        added_at: ISODate("2026-02-17T10:05:00Z")
      },
      {
        uri: "file:///C:/logs/CUCM_trace.log",
        filename: "CUCM_trace.log",
        size_bytes: 2097152,
        added_at: ISODate("2026-02-17T10:10:00Z")
      }
    ]
  }
```

### LSP Protocol Extensions (Phase 1)
```typescript
// Create a new collection
request: custom/createCollection
params: {
  name: string,
  description?: string,
  metadata?: { case_id?, severity?, tags? }
}
response: {
  id: string,
  uri: string  // e.g., "log-scout://collection/col-123abc"
}

// Add a log file to collection
request: custom/addLogToCollection
params: {
  collectionId: string,
  logUri: string,      // file:// or log-scout://
  metadata?: { ... }
}
response: {
  collectionId: string,
  logCount: number
}

// Get collection details
request: custom/getCollection
params: { collectionId: string }
response: {
  id: string,
  name: string,
  logs: [{uri, filename, size_bytes, added_at}],
  metadata: { ... },
  created_at: datetime
}

// List all collections for user
request: custom/listCollections
params: { filter?: "owned" | "all" }
response: {
  collections: [{id, name, logCount, updated_at}]
}
```

### UI Changes (VS Code Extension)

**New Sidebar View: "Collections"**
```
📁 Collections
  ├─ 🔴 INC-12345: Presence Failure (3 logs)
  │   ├─ 📄 Jabber.log (1 MB)
  │   ├─ 📄 CUCM_trace.log (2 MB)
  │   └─ 📄 CUP_service.log (512 KB)
  │
  └─ 🟡 Case-456: Call Drop (2 logs)
      ├─ 📄 CDR.log
      └─ 📄 SIP_trace.log

[+ New Collection]
```

**Collection Detail Pane (right-click menu)**
```
Collection: INC-12345 Presence Failure

Description: User alice cannot register for presence
Case ID: INC-12345 | Severity: High | Tags: presence, jabber

Logs in Collection (3):
  ✓ Jabber.log (1 MB) - Added 10:05 AM
  ✓ CUCM_trace.log (2 MB) - Added 10:10 AM
  ✓ CUP_service.log (512 KB) - Added 10:15 AM

[Edit] [Analyze] [Share] [Export] [Delete]
```

### Backward Compatibility

**For existing single-file users:**
```
User opens Jabber.log
    ↓
LSP detects: "single file, no explicit collection"
    ↓
Auto-creates ephemeral collection:
  {
    id: "_ephemeral_jabber_123",
    name: "_ephemeral: Jabber.log",
    logs: [{uri, added_at: now}],
    created_by: "system"
  }
    ↓
User still sees diagnostics inline (unchanged)
    ↓
Collection UI hidden (setting: "Show Collection UI" = false)
    ↓
Result: seamless upgrade, no behavior change
```

### Success Criteria for Phase 1
- ✅ Users can create and persist collections in MongoDB
- ✅ Files added to collections retain order
- ✅ Collection CRUD endpoints fully working
- ✅ UI allows basic collection management (create, list, view, delete)
- ✅ Single-file analysis unchanged
- ✅ No performance regression (< 100ms for collection operations)

---

## Phase 2: Heterogeneous Format Awareness

### What Happens
- **Each log gets metadata** (source system, log type, parser hint, timestamp format)
- **Patterns are tagged** with which sources they apply to
- **Pattern matching respects format** - only run jabber patterns on jabber logs
- **Metadata UI guides users** (auto-detect from filename, allow override)

### Motivation
```
Problem: "SIP 486" pattern runs on Jabber.log and produces false positives
         because it's SIP-specific, but raw regex doesn't know context

Solution: 
  Pattern: { name: "SIP 486 Response", applies_to: ["sip", "cucm"], ... }
  Log: { source_system: "jabber", ... }
  Result: Pattern skipped for this log (correct)
```

### LogMetadata Schema
```yaml
logs: [
  {
    uri: "file:///C:/logs/Jabber.log",
    filename: "Jabber.log",
    source_system: "jabber",      # NEW
    log_type: "client_trace",      # NEW
    parser_hint: "cisco-jabber-3.x", # NEW
    timestamp_format: "YYYY-MM-DD HH:mm:ss,SSS", # NEW
    timezone: "America/Chicago",    # NEW
    device_id: "DESKTOP-ABC123",    # NEW (optional)
    user_id: "alice@acme.com",      # NEW (optional)
    line_count: 15234,              # NEW
    first_event_time: ISODate("2026-02-17T10:00:00Z"), # NEW
    last_event_time: ISODate("2026-02-17T10:30:00Z"),  # NEW
    size_bytes: 1048576,
    added_at: ISODate(...)
  }
]
```

### Enum Values (Reference)

**source_system:**
```
jabber, cucm, cup (presence), unity, sip, cdr, identity_service, 
network_trace, firewall, proxy, load_balancer, database, custom
```

**log_type:**
```
trace, debug, error, warning, audit, cdr, pcap, config, alert, activity
```

### Pattern Extension (applies_to)
```yaml
# Old pattern
pattern:
  id: "pattern-sip-486"
  name: "SIP 486 Busy Response"
  regex: "^.*SIP/2.0\\s+486\\s+Busy.*$"
  severity: warning

# New pattern (Phase 2+)
pattern:
  id: "pattern-sip-486"
  name: "SIP 486 Busy Response"
  applies_to: ["sip", "cucm", "network_trace"]  # NEW: only run on these
  regex: "^.*SIP/2.0\\s+486\\s+Busy.*$"
  severity: warning
  
# Pattern that applies to ALL sources (backward compat)
pattern:
  id: "pattern-timestamp-error"
  name: "Timestamp Parse Error"
  applies_to: null  # null means: run on all
  regex: ".*ERROR.*timestamp.*"
```

### Metadata Editor UI (Phase 2)

```
When adding log to collection:

┌─────────────────────────────────────────────┐
│ Add Log to Collection                       │
├─────────────────────────────────────────────┤
│                                              │
│ File: Jabber.log                            │
│                                              │
│ Source System: [Dropdown ▼] jabber           │ ← Auto-detected
│ Log Type: [Dropdown ▼] client_trace          │
│ Parser Hint: cisco-jabber-3.x (v3.x-4.x)   │
│ Timestamp Format: YYYY-MM-DD HH:mm:ss,SSS  │ ← Auto-detect or custom
│ Timezone: [Dropdown ▼] America/Chicago       │
│                                              │
│ Advanced (optional):                         │
│ ☐ Device ID: DESKTOP-ABC123                 │
│ ☐ User ID: alice@acme.com                   │
│                                              │
│ [Cancel] [Add to Collection]                │
└─────────────────────────────────────────────┘
```

### Pattern Filtering Logic (Phase 2)

```rust
fn should_run_pattern(pattern: &Pattern, log_metadata: &LogMetadata) -> bool {
    // If pattern has no applies_to filter, always run (backward compat)
    if pattern.applies_to.is_none() || pattern.applies_to.as_ref().unwrap().is_empty() {
        return true;
    }
    
    // Check if log's source_system is in pattern's applies_to list
    pattern.applies_to.as_ref().unwrap().contains(&log_metadata.source_system)
}

// Usage in analyzer:
for log in collection.logs {
    let log_metadata = load_metadata(&log.uri);
    for pattern in patterns {
        if should_run_pattern(&pattern, &log_metadata) {
            let matches = pattern.regex.find_matches(&log_content);
            results.push((log.uri, pattern.id, matches));
        }
    }
}
```

### Auto-Detect Logic (Phase 2)

```typescript
function autoDetectMetadata(filename: string, content: string): LogMetadata {
    let metadata = {} as LogMetadata;
    
    // Source system from filename
    if (filename.includes("jabber")) metadata.source_system = "jabber";
    else if (filename.includes("cucm") || filename.includes("trace")) metadata.source_system = "cucm";
    else if (filename.includes("cup") || filename.includes("presence")) metadata.source_system = "cup";
    else if (filename.includes("unity") || filename.includes("voicemail")) metadata.source_system = "unity";
    else if (filename.includes("sip") || filename.includes("pcap")) metadata.source_system = "sip";
    else metadata.source_system = "custom";
    
    // Log type from filename/content
    if (filename.includes("trace") || filename.includes("debug")) metadata.log_type = "trace";
    else if (filename.includes("error")) metadata.log_type = "error";
    else if (filename.includes("audit")) metadata.log_type = "audit";
    else if (filename.includes("cdr")) metadata.log_type = "cdr";
    else metadata.log_type = "debug";
    
    // Timestamp format from first 100 lines
    const firstLines = content.split('\n').slice(0, 100);
    metadata.timestamp_format = detectTimestampFormat(firstLines);
    
    // Count lines
    metadata.line_count = content.split('\n').length;
    
    return metadata;
}
```

### Analyzer Enhancement (Phase 2)

**Old Analyzer:**
```rust
pub struct FileAnalyzer {
    patterns: Vec<Pattern>,
}

impl FileAnalyzer {
    pub fn analyze(&self, content: &str) -> Vec<Match> {
        self.patterns
            .iter()
            .flat_map(|p| p.regex.find_matches(content))
            .collect()
    }
}
```

**New Analyzer (Phase 2):**
```rust
pub struct CollectionAnalyzer {
    patterns: Vec<Pattern>,
    metadata_cache: HashMap<String, LogMetadata>,
}

impl CollectionAnalyzer {
    pub async fn analyze_collection(&self, collection: &Collection) -> AnalysisResult {
        let mut results = AnalysisResult::new();
        
        for log in &collection.logs {
            // Load metadata
            let metadata = self.metadata_cache.get(&log.uri)
                .unwrap_or_else(|| self.auto_detect_metadata(&log.uri));
            
            // Read file
            let content = std::fs::read_to_string(&log.uri)?;
            
            // Run patterns (only applicable ones)
            for pattern in &self.patterns {
                if should_run_pattern(pattern, metadata) {
                    let matches = pattern.regex.find_matches(&content);
                    results.add_matches(log.uri.clone(), pattern.id.clone(), matches);
                }
            }
        }
        
        Ok(results)
    }
}
```

### Success Criteria for Phase 2
- ✅ Users can specify source_system and log_type per log
- ✅ Auto-detection works for 80%+ of common Jabber/CUCM/CUP logs
- ✅ Patterns with applies_to correctly filter
- ✅ No false positives from format mismatch
- ✅ Metadata editor intuitive and discoverable

---

## Phase 3: Temporal Correlation & Cross-System Anomalies

### What Happens
- **Events are aligned by timestamp** across all logs in collection
- **Cross-system patterns detect multi-step failures** (e.g., "Jabber offline THEN CUCM presence change THEN CUP unreg")
- **Timeline view shows unified event stream** with anomalies highlighted
- **Evidence links related events** so user sees cause-effect flow

### Motivation
```
Example: Presence Registration Failure
─────────────────────────────────────────

Jabber.log:
  10:23:45.123  [INFO] User went offline

CUCM_trace.log:
  10:23:46.001  [WARN] Presence changed: offline

CUP_service.log:
  10:23:46.892  [ERROR] User unregistered - timeout

Current behavior: 3 independent pattern matches, no connection
Desired behavior: "Coordinated Presence Failure" anomaly detected, timeline shows chain
```

### Timestamp Parser (Phase 3)

```rust
pub struct TimestampParser {
    format: String,  // "YYYY-MM-DD HH:mm:ss,SSS"
    timezone: String, // "America/Chicago"
}

impl TimestampParser {
    pub fn parse_line(&self, line: &str) -> Option<ParsedEvent> {
        // Extract timestamp using regex derived from format
        let ts_regex = self.format_to_regex();
        let ts_match = ts_regex.find(line)?;
        let ts_str = &line[ts_match.start()..ts_match.end()];
        
        // Parse to UTC
        let local_time = chrono::NaiveDateTime::parse_from_str(
            ts_str,
            self.format.as_str()
        ).ok()?;
        
        let tz = chrono_tz::Tz::from_str(&self.timezone)?;
        let utc_time = tz.from_local_datetime(&local_time)
            .single()
            .unwrap()
            .with_timezone(&chrono::Utc);
        
        Some(ParsedEvent {
            timestamp: utc_time,
            line_number: /* ... */,
            content: line.to_string(),
        })
    }
}

// Usage in collection analyzer:
pub async fn build_temporal_index(
    &self,
    collection: &Collection
) -> Result<TemporalIndex> {
    let mut events = Vec::new();
    
    for log in &collection.logs {
        let metadata = self.get_metadata(&log.uri);
        let parser = TimestampParser::new(
            metadata.timestamp_format.clone(),
            metadata.timezone.clone()
        );
        
        let content = std::fs::read_to_string(&log.uri)?;
        for (line_num, line) in content.lines().enumerate() {
            if let Some(event) = parser.parse_line(line) {
                events.push(IndexedEvent {
                    timestamp: event.timestamp,
                    source_system: metadata.source_system.clone(),
                    log_uri: log.uri.clone(),
                    line_number: line_num,
                    content: line.to_string(),
                });
            }
        }
    }
    
    // Sort by timestamp
    events.sort_by_key(|e| e.timestamp);
    
    Ok(TemporalIndex { events })
}
```

### Cross-System Pattern Type (Phase 3)

**New YAML Pattern Type:**

```yaml
# Single-system pattern (existing)
pattern:
  type: regex
  id: "pattern-jabber-offline"
  name: "User Went Offline"
  applies_to: ["jabber"]
  regex: "^.*user went offline.*$"
  severity: info

# Cross-system pattern (NEW in Phase 3)
pattern:
  type: temporal_correlation
  id: "pattern-coordinated-presence-failure"
  name: "Coordinated Presence Failure"
  severity: error
  
  # Define events from different systems
  events:
    - id: "jabber_offline"
      source: "jabber"
      pattern: "user went offline"
      regex: "^.*user went offline.*$"
      
    - id: "cucm_presence_change"
      source: "cucm"
      pattern: "presence changed"
      regex: "^.*Presence changed: offline.*$"
      
    - id: "cup_unreg"
      source: "cup"
      pattern: "user unregistered"
      regex: "^.*User unregistered.*$"
  
  # Trigger condition: sequence of events within time windows
  triggers_if:
    # Jabber offline, then CUCM change within 2 seconds, then CUP unreg within 5 seconds of Jabber
    - "(jabber_offline) followed_by (cucm_presence_change within 2s) followed_by (cup_unreg within 5s)"
  
  evidence: "User presence system went offline across all components within 5 seconds"
  recommendation: "Check CUP service logs for timeout; verify network connectivity"
  
  # References for UI
  cve?: null
  kb_article?: "KB-12345"
```

### Temporal Index Schema (Phase 3)

```yaml
db.temporal_indices:
  {
    _id: ObjectId,
    collection_id: ObjectId,
    
    events: [
      {
        timestamp: ISODate("2026-02-17T10:23:45.123Z"),
        source_system: "jabber",
        log_uri: "file:///C:/logs/Jabber.log",
        line_number: 42,
        content: "[2026-02-17 10:23:45,123] INFO User went offline",
        
        # Extracted data (pattern-matched)
        extraction: {
          user_id: "alice@acme.com",
          event_type: "offline",
          reason: null
        }
      },
      {
        timestamp: ISODate("2026-02-17T10:23:46.001Z"),
        source_system: "cucm",
        log_uri: "file:///C:/logs/CUCM_trace.log",
        line_number: 180,
        content: "[02/17/2026 10:23:46.001] WARN Presence changed: offline",
        extraction: {
          user_id: "alice@acme.com",
          event_type: "presence_change",
          new_state: "offline"
        }
      },
      # ... more events
    ]
  }
```

### Anomaly Detection Result (Phase 3)

```yaml
db.anomalies:
  {
    _id: ObjectId,
    collection_id: ObjectId,
    
    pattern_id: "pattern-coordinated-presence-failure",
    pattern_name: "Coordinated Presence Failure",
    severity: "error",
    
    # Time range of anomaly
    detected_at: ISODate("2026-02-17T10:23:45.123Z"),
    duration_seconds: 1.768,
    
    # Events that triggered this anomaly
    involved_events: [
      {
        event_id: "jabber_offline",
        timestamp: ISODate("2026-02-17T10:23:45.123Z"),
        source: "jabber",
        log_uri: "file:///C:/logs/Jabber.log",
        line_number: 42,
      },
      {
        event_id: "cucm_presence_change",
        timestamp: ISODate("2026-02-17T10:23:46.001Z"),
        source: "cucm",
        log_uri: "file:///C:/logs/CUCM_trace.log",
        line_number: 180,
      },
      {
        event_id: "cup_unreg",
        timestamp: ISODate("2026-02-17T10:23:46.891Z"),
        source: "cup",
        log_uri: "file:///C:/logs/CUP_service.log",
        line_number: 234,
      }
    ],
    
    evidence: "User presence system went offline across all components within 5 seconds",
    recommendation: "Check CUP service logs for timeout; verify network connectivity",
    
    # Impact
    affected_users: ["alice@acme.com"],
    affected_systems: ["jabber", "cucm", "cup"]
  }
```

### Timeline UI (Phase 3)

```
Timeline View for Collection: "INC-12345 Presence Failure"

10:23:45.123  📍 Jabber.log (line 42)
              USER OFFLINE
              User went offline
              
              ↓ 0.878s
              
10:23:46.001  📍 CUCM_trace.log (line 180)
              PRESENCE CHANGE
              Presence changed: offline
              
              ↓ 0.890s
              
10:23:46.891  📍 CUP_service.log (line 234)  🔴 ANOMALY
              USER UNREGISTERED
              User unregistered - timeout
              
              ⚠️ Coordinated Presence Failure (ERROR)
                 Severity: HIGH
                 Involved: 3 events in 1.768s
                 Evidence: User presence system went offline...
                 
                 [View Details] [Add Note] [Link to KB]

[← Previous Anomaly] | [Showing 1 of 5 anomalies] | [Next Anomaly →]
```

### Success Criteria for Phase 3
- ✅ Timestamp parsing works for 95%+ of log lines
- ✅ Clock skew detected (warning if events > 5 min apart between systems)
- ✅ Cross-system patterns defined in YAML and validated
- ✅ Anomalies correctly detected and linked
- ✅ Timeline renders 1000+ events in < 1 second
- ✅ Evidence clearly explains why anomaly triggered

---

## Phase 4: Team Collaboration & Sharing

### What Happens
- **Collections can be shared** with team members
- **Activity log tracks contributions** (who added which log, when)
- **Permissions prevent accidental overwrites** (owner/editor/viewer roles)
- **Shared analyses can be exported** as reports

### Permissions Model (Phase 4)

| Role | View | Add Log | Edit Metadata | Share | Delete |
|------|------|---------|---------------|-------|--------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | Own logs only |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ |

### MongoDB Schema Extension (Phase 4)

```yaml
db.collections:
  {
    # ... [existing Phase 1-3 fields]
    
    # Phase 4: Sharing & Collaboration
    permissions: {
      owner_id: "engineer@acme.com",
      
      collaborators: [
        {
          user_id: "engineer2@acme.com",
          role: "editor",
          added_at: ISODate("2026-02-17T10:30:00Z"),
          added_by: "engineer@acme.com"
        },
        {
          user_id: "manager@acme.com",
          role: "viewer",
          added_at: ISODate("2026-02-17T10:35:00Z"),
          added_by: "engineer@acme.com"
        }
      ],
      
      visibility: "private"  # "private" | "team" | "org" | "public"
    },
    
    # Activity log for audit trail
    activity_log: [
      {
        user_id: "engineer@acme.com",
        action: "created",
        details: "Collection created",
        timestamp: ISODate("2026-02-17T10:00:00Z")
      },
      {
        user_id: "engineer@acme.com",
        action: "log_added",
        details: "Added Jabber.log (1 MB)",
        timestamp: ISODate("2026-02-17T10:05:00Z")
      },
      {
        user_id: "engineer@acme.com",
        action: "log_added",
        details: "Added CUCM_trace.log (2 MB)",
        timestamp: ISODate("2026-02-17T10:10:00Z")
      },
      {
        user_id: "engineer@acme.com",
        action: "analyzed",
        details: "Ran analysis - 5 anomalies found",
        timestamp: ISODate("2026-02-17T10:30:00Z")
      },
      {
        user_id: "engineer@acme.com",
        action: "shared",
        details: "Shared with engineer2@acme.com (editor role)",
        timestamp: ISODate("2026-02-17T10:35:00Z")
      }
    ],
    
    # Optional: notes/discussion
    discussion: [
      {
        user_id: "engineer2@acme.com",
        comment: "The timestamp skew between CUCM and CUP is suspicious",
        timestamp: ISODate("2026-02-17T10:40:00Z"),
        resolved: false
      }
    ]
  }
```

### Sharing UI (Phase 4)

```
Collection: INC-12345 Presence Failure

Owner: engineer@acme.com
Visibility: Private  [🔒]

Collaborators (2):
  👤 engineer2@acme.com - Editor (Added 10:35 AM)
  👤 manager@acme.com - Viewer (Added 10:35 AM)
  
  [+ Add Collaborator]
  [Share Link]

Activity (showing last 5):
  ✓ engineer2@acme.com added note "timestamp skew suspicious" - 10:40 AM
  ✓ engineer@acme.com shared with manager@acme.com - 10:35 AM
  ✓ engineer@acme.com ran analysis (5 anomalies) - 10:30 AM
  ✓ engineer@acme.com added CUCM_trace.log - 10:10 AM
  ✓ engineer@acme.com added Jabber.log - 10:05 AM
  
[View Full Activity]
```

### Export to Report (Phase 4)

```
Generate Report: INC-12345 Presence Failure

[Export as PDF]

────────────────────────────────────────────
Case ID: INC-12345
Title: Presence Failure
User: alice@acme.com
Severity: HIGH
Date: 2026-02-17
────────────────────────────────────────────

EXECUTIVE SUMMARY
The user's presence registration failed across three systems (Jabber, CUCM, CUP)
within a 1.8-second window, indicating a coordinated failure likely originating
in the CUP service.

TIMELINE OF EVENTS
10:23:45.123 - Jabber.log: User went offline
10:23:46.001 - CUCM_trace.log: Presence changed to offline
10:23:46.891 - CUP_service.log: User unregistered (timeout)

ANOMALIES DETECTED (5)
1. 🔴 Coordinated Presence Failure (ERROR)
   Confidence: 95%
   Evidence: All three presence systems synchronized failure
   Recommendation: Check CUP service logs for timeout

2. 🟡 High Latency in CUP Response (WARNING)
   ...

LOGS ANALYZED
• Jabber.log (1 MB, 15,234 lines) - Client trace, Cisco Jabber 3.x
• CUCM_trace.log (2 MB, 32,456 lines) - Server trace, CUCM 14.x
• CUP_service.log (512 KB, 8,123 lines) - Presence service, CUP 14.x

CONTRIBUTORS
• engineer@acme.com (Owner, added logs and analysis)
• engineer2@acme.com (Editor, added notes)
• manager@acme.com (Viewer)

Generated: 2026-02-17 11:00:00 UTC
```

### LSP Sharing Endpoints (Phase 4)

```typescript
// Share collection with users
request: custom/shareCollection
params: {
  collectionId: string,
  users: [{user_id: string, role: "editor" | "viewer"}],
  visibility?: "private" | "team" | "org" | "public"
}
response: {
  success: boolean,
  shared_with_count: number
}

// Add comment/note to collection
request: custom/addCollectionNote
params: {
  collectionId: string,
  comment: string
}
response: {
  note_id: string,
  timestamp: datetime
}

// Get activity log
request: custom/getCollectionActivity
params: {
  collectionId: string,
  limit?: number
}
response: {
  activity: [{user_id, action, details, timestamp}]
}

// Export collection as report
request: custom/exportCollection
params: {
  collectionId: string,
  format: "pdf" | "html" | "json"
}
response: {
  download_url: string,
  expires_at: datetime
}
```

### Success Criteria for Phase 4
- ✅ Collections can be shared with configurable roles
- ✅ Activity log fully tracks all changes
- ✅ Permissions enforced (viewers can't edit)
- ✅ Export generates readable PDF/HTML reports
- ✅ Multiple users can collaborate on same collection
- ✅ No data loss or overwrites with concurrent edits

---

## Timeline & Effort Estimate

| Phase | Duration | Key Tasks | Team Size |
|-------|----------|-----------|-----------|
| Phase 1 | 6-8 weeks | MongoDB schema, LSP endpoints, UI sidebar | 2-3 people |
| Phase 2 | 4-6 weeks | Format metadata, pattern filtering, auto-detect | 2 people |
| Phase 3 | 6-8 weeks | Timestamp parsing, temporal index, cross-system patterns | 2-3 people |
| Phase 4 | 4-6 weeks | Sharing, permissions, export, activity log | 1-2 people |
| **Total** | **≈20-28 weeks** | | |

**Parallel tracks:**
- Documentation & user guides (start Week 1)
- Pattern authoring standards (start Week 1)
- QA & testing (start Week 2)
- User feedback & iteration (ongoing)

---

## Known Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **Pattern explosion** - Need to maintain separate patterns for Jabber/CUCM/CUP | HIGH | MEDIUM | Define naming conventions (e.g., `pattern_source_symptom`) early; auto-tagging |
| **Timestamp parsing edge cases** - Different vendors use different formats | MEDIUM | MEDIUM | Build regex library for common formats; graceful fallback (line-number ordering) |
| **Clock skew** - Systems 5+ minutes apart → false correlations | HIGH | LOW | Require timezone metadata; configurable tolerance; alerts when skew detected |
| **Performance cliff** - 1000+ event collections timeout | MEDIUM | MEDIUM | Lazy-load temporal index; paginate timeline; benchmark at Phase 3 start |
| **Permission model confusion** - Users misunderstand roles | MEDIUM | MEDIUM | Clear docs + role-based UI (disable edit buttons for viewers); activity log audit trail |
| **MongoDB growth** - Ephemeral collections + temporal indices = storage bloat | LOW | MEDIUM | TTL policy (90-day auto-delete ephemeral); compress old indices; manual purge |
| **Cross-system false positives** - "Offline + Presence Change" triggers on unrelated events 3s apart | HIGH | HIGH | Require sub-second windows (<1s default); user feedback loop; KB article for tuning |

---

## Questions to Resolve Before Phase 1

1. **MongoDB infrastructure:** Local, managed (Atlas), or containerized?
2. **Pattern ownership:** Who maintains patterns for each source system?
3. **Offline support:** Should team sharing require network, or pull-once-use-offline?
4. **Conflict resolution:** Two engineers analyze same collection simultaneously—combine results or last-write-wins?
5. **Privacy/encryption:** Should logs be encrypted at rest in MongoDB?

---

## Success Metrics (End-to-End)

- ✅ Users can create and share investigation collections
- ✅ Cross-system anomalies detected with 90%+ accuracy
- ✅ Timeline UI renders 100K+ events in < 2 seconds
- ✅ 95%+ of common log formats auto-detected correctly
- ✅ Team can collaborate on same collection without conflicts
- ✅ Analysis results exportable as actionable reports
- ✅ Backward compatibility: single-file analysis unchanged

---

## Next Steps

**Immediate (Week 1):**
- [ ] Resolve open questions (above)
- [ ] Design detailed MongoDB schema with team
- [ ] Create pattern naming/tagging standard
- [ ] Setup test MongoDB instance

**Phase 1 (Weeks 2-8):**
- [ ] Implement collection CRUD in LSP server
- [ ] Create Collections sidebar UI
- [ ] Add collection metadata storage in MongoDB
- [ ] Write integration tests

**Beyond:**
- [ ] Phase 2: Format awareness
- [ ] Phase 3: Temporal correlation
- [ ] Phase 4: Team collaboration

