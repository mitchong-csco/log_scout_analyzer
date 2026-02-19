# Client-Server Log Architecture

## Overview

Log Scout Analyzer handles multiple log contexts across different architectural tiers:
1. **Client Application Logs** - UI and application logic (Jabber UI, Webex client)
2. **Client Middleware Logs** - Drivers and service providers (TSP, CTI Control, CUACA)
3. **Server Service Logs** - Backend services (CTI Manager, CUCM, CUC, Expressway)

This document explains the multi-tier architecture, how different log types relate to each other, and how to correlate them for complete diagnostics.

---

## The Multi-Tier Architecture

### Tier 1: Client Application Logs (End-User Perspective)

**What**: Logs from the user-facing application layer
**Examples**:
- Jabber UI logs (button clicks, window events)
- Webex desktop app UI logs
- Mobile app UI logs (iOS/Android)
- Browser-based client logs
- CUACA (Cisco Unified Application Client Architecture) application logs

**Characteristics**:
- **Single user context** - One person's experience
- **Local system info** - Device specs, OS, network interface
- **User actions** - Clicks, calls, settings changes
- **Subjective quality** - "No audio", "poor call quality"
- **Client-side events** - UI actions, local errors, device issues

**Example Client Log**:
```
2025-12-10 17:15:56,798 DEBUG [cpve] - RTP STATS,session_id=0,session_type=audio-main,rx_pkts_recv=0,tx_pkts_sent=0
2025-12-10 17:15:58 INFO [TelephonyPlugin] - User clicked 'End Call' button
2025-12-10 17:16:00 ERROR [AudioDevice] - Failed to initialize microphone: Access Denied
```

**Usage Context**:
- User reports "my call isn't working"
- Support agent opens user's client logs
- Analyze single user's experience
- Local troubleshooting (device, network, client app)

---

### Tier 2: Client Middleware Logs (Integration Layer)

**What**: Logs from client-side drivers, service providers, and middleware
**Examples**:
- TSP (Telephony Service Provider) logs
- TAPI (Telephony Application Programming Interface) logs
- CTI Control driver logs
- CUACA middleware logs
- Audio/video driver logs
- COM/DCOM interface logs

**Characteristics**:
- **Bridge layer** - Between application and system
- **Protocol translation** - App requests → System calls
- **Device abstraction** - Hardware/service access
- **State management** - Call state, device state
- **Client-side but system-level** - Runs with elevated privileges

**Example Middleware Log**:
```
2025-12-10 17:15:56 INFO [TSP] - MakeCall request for DN 5001 from line 1
2025-12-10 17:15:57 DEBUG [CTI Control] - Sending CTI message to CTI Manager
2025-12-10 17:15:58 ERROR [TSP] - CTI Manager timeout after 5 seconds
```

**Usage Context**:
- Diagnose integration issues between app and system
- Track call control flow (app → TSP → CTI Manager)
- Debug driver/middleware problems
- Understand protocol-level failures

---

### Tier 3: Server Service Logs (Infrastructure Perspective)

**What**: Logs from backend services and infrastructure
**Examples**:
- **CTI Manager logs** (CUCM component handling CTI requests)
- **CUCM (Call Manager) logs** (call routing, device management)
- **CUC (Unity Connection)** logs (voicemail)
- **Expressway logs** (edge/core, B2B calls)
- **Database server logs** (informix, PostgreSQL)
- **SIP proxy logs**
- **Cluster management logs**

**Characteristics**:
- **Multi-user context** - All users on the system
- **System-wide info** - Cluster health, resource usage, service state
- **Infrastructure events** - Registration, routing, database queries
- **Objective metrics** - Call success rate, latency, throughput
- **Server-side events** - Backend errors, capacity issues, integration problems

**Example Server Log**:
```
2025-12-10 17:15:56 INFO [CallManager] - SIP INVITE from device SEP001122334455 for line 5001
2025-12-10 17:15:57 WARN [Database] - Connection pool at 90% capacity (180/200)
2025-12-10 17:15:58 ERROR [CallManager] - Call setup failed: No available media resources
```

**Usage Context**:
- System-wide issues affecting multiple users
- Capacity planning and performance monitoring
- Infrastructure troubleshooting
- Integration and configuration issues

---

## Why Different Tiers Matter

### 1. Scale & Scope

| Aspect | Tier 1: Client App | Tier 2: Client Middleware | Tier 3: Server |
|--------|-------------------|---------------------------|----------------|
| **Users** | 1 user | 1 user (but system-wide impact) | Thousands of users |
| **Time Window** | User session | User session + system context | Continuous |
| **File Size** | MBs | MBs | GBs to TBs |
| **Analysis Goal** | Fix UI/app issues | Fix integration/driver issues | Optimize system |
| **Pattern Frequency** | UI events | Protocol/driver events | Aggregate patterns |
| **Permissions** | User-level | System/admin-level | Infrastructure admin |

### 2. Temporal Behavior

**Tier 1 (Client App)** - Linear user journey:
```
User opens app → Logs in → Makes call → Experiences issue → Ends call → Closes app
    ↓             ↓         ↓              ↓                ↓            ↓
Timeline is user's session (finite, clear start/end)
```

**Tier 2 (Client Middleware)** - Service lifecycle:
```
Service starts → Waits for app requests → Processes calls → Service runs
    ↓                      ↓                    ↓                ↓
Timeline is service uptime (can span multiple app sessions)
```

**Tier 3 (Server)** - Continuous operation:
```
System starts → Handles calls continuously → System runs indefinitely
    ↓                      ↓                          ↓
Timeline is system uptime (infinite, no clear boundaries)
```

### 3. Pattern Interpretation Across Tiers

**Tier 1 (Client App) Pattern**: "User clicked 'Make Call' button"
- **Interpretation**: User initiated call action in UI
- **Action**: Track user's intent, verify UI state
- **Scope**: One user's experience

**Tier 2 (Client Middleware) Pattern**: "TSP MakeCall failed: CTI Manager timeout"
- **Interpretation**: Call request reached middleware but couldn't reach server
- **Action**: Check network, CTI Manager availability, driver config
- **Scope**: One user but indicates possible system issue

**Tier 3 (Server) Pattern**: "CTI Manager: Call setup failed: No media resources"
- **Interpretation**: System ran out of capacity
- **Action**: Scale up resources, optimize allocation
- **Scope**: All users affected

### 4. Correlation Needs - Multi-Tier Transaction Flow

**Single User Transaction Across All Tiers**:
```
Tier 1 (Client App):
  - User clicked 'Make Call' button
  - App requested call via API
  
Tier 2 (Client Middleware):
  - TSP received MakeCall request
  - CTI Control formatted CTI message
  - Sent request to CTI Manager
  
Tier 3 (Server):
  - CTI Manager received request
  - CUCM allocated resources
  - Call setup initiated

→ Correlate by call_id, timestamp, user across ALL tiers
```

**Why Multi-Tier Correlation Matters**:
- **Complete picture**: See entire transaction flow
- **Pinpoint failure**: Which tier failed and why
- **Root cause**: App issue? Driver issue? Server issue?

---

## Architecture: How Log Scout Handles Multiple Tiers

### Current Architecture (LSP-based)

```
┌────────────────────────────────────────────────────────────┐
│              User Opens Log File(s)                         │
└────────────────────┬───────────────────────────────────────┘
                     ↓
              ┌──────────────┐
              │ File Context │
              │  Detection   │
              └──────┬───────┘
                     ↓
         ┌───────────┴────────────┬─────────────┐
         ↓                        ↓             ↓
   ┌─────────────┐         ┌────────────┐  ┌──────────────┐
   │ Tier 1:     │         │ Tier 2:    │  │ Tier 3:      │
   │ Client App  │         │ Middleware │  │ Server       │
   │ (CUACA, UI) │         │ (TSP, CTI) │  │ (CTI Mgr)    │
   └──────┬──────┘         └─────┬──────┘  └──────┬───────┘
          ↓                      ↓                 ↓
   ┌─────────────┐         ┌────────────┐  ┌──────────────┐
   │  Pattern    │         │  Pattern   │  │   Pattern    │
   │  Matching   │         │  Matching  │  │   Matching   │
   │ (App        │         │ (Driver    │  │  (Server     │
   │  Patterns)  │         │  Patterns) │  │  Patterns)   │
   └──────┬──────┘         └─────┬──────┘  └──────┬───────┘
          ↓                      ↓                 ↓
          └──────────────┬───────┴─────────────────┘
                         ↓
                  ┌──────────────┐
                  │ Multi-Tier   │
                  │ Correlation  │
                  │ Engine       │
                  └──────┬───────┘
                         ↓
                  ┌──────────────┐
                  │   Unified    │
                  │ Diagnostics  │
                  └──────────────┘
```

### Context Detection

**How we determine log context**:

```rust
enum LogContext {
    Tier1ClientApp {
        product: Product,        // Jabber, Webex, etc.
        component: String,       // UI, Application, CUACA
        platform: Platform,      // Windows, Mac, iOS, Android
        version: String,
        user_id: Option<String>,
        device_id: Option<String>,
    },
    Tier2ClientMiddleware {
        component: String,       // TSP, CTI Control, TAPI
        product: Product,        // Jabber, Webex
        platform: Platform,
        version: String,
        user_id: Option<String>,
    },
    Tier3Server {
        service: Service,        // CTI Manager, CUCM, CUC, Expressway
        component: String,       // CTI Manager, CallManager, Database
        cluster: Option<String>,
        node: Option<String>,
        version: String,
    },
    Unknown,
}

impl LogContext {
    fn detect(file_path: &str, first_lines: &[String]) -> Self {
        // Check file name patterns
        if file_path.contains("jabber") && file_path.contains("ui") {
            return Self::Tier1ClientApp { product: Product::Jabber, component: "UI", ... };
        }
        
        if file_path.contains("tsp") || file_path.contains("cti_control") {
            return Self::Tier2ClientMiddleware { component: "TSP", ... };
        }
        
        if file_path.contains("cuaca") {
            // Could be Tier 1 (app) or Tier 2 (middleware) - check content
            if has_pattern("User clicked|UI Event", first_lines) {
                return Self::Tier1ClientApp { component: "CUACA", ... };
            } else {
                return Self::Tier2ClientMiddleware { component: "CUACA", ... };
            }
        }
        
        // Check log headers
        if first_lines.iter().any(|l| l.contains("CTI Manager")) {
            return Self::Tier3Server { service: Service::CUCM, component: "CTI Manager", ... };
        }
        
        if first_lines.iter().any(|l| l.contains("Cisco Unified Communications Manager")) {
            return Self::Tier3Server { service: Service::CUCM, component: "CallManager", ... };
        }
        
        // Check log patterns
        if has_pattern("User clicked|Button pressed", first_lines) {
            return Self::Tier1ClientApp { ... };
        }
        
        if has_pattern("TSP|TAPI|CTI Control", first_lines) {
            return Self::Tier2ClientMiddleware { ... };
        }
        
        if has_pattern("Database query|Cluster sync|Device registration", first_lines) {
            return Self::Tier3Server { ... };
        }
        
        Self::Unknown
    }
}
```

**Context Indicators**:

| Indicator | Tier 1: Client App | Tier 2: Middleware | Tier 3: Server |
|-----------|-------------------|-------------------|----------------|
| **File Name** | `jabber_ui.log`, `cuaca.log` | `tsp.log`, `cti_control.log` | `cucm-syslog`, `ctimgr.log` |
| **Path** | `%APPDATA%`, `~/Library/Logs` | `%PROGRAMDATA%`, `/var/log` | `/var/log/cisco`, `/opt/cisco` |
| **Headers** | "Jabber Version 14.3" | "TSP Driver v2.3" | "CUCM 12.5", "CTI Manager" |
| **Patterns** | UI events, user actions | TSP calls, CTI messages | SIP messages, DB queries |
| **User Context** | Single user ID | Single user ID | Multiple users |
| **Permissions** | User-level | System/admin-level | Infrastructure admin |

---

## Pattern Design: Tier-Specific Patterns

### Tier 1: Client Application Patterns

**Focus**: User interface and application behavior

```yaml
Pattern: "User clicked 'Make Call'"
Context: Tier 1 (Client App)
Purpose: Track user's intent and UI interaction
Parameters:
  - target_number: Who user is calling
  - line_id: Which line user selected
  - timestamp: When user initiated action
Temporal Analysis:
  - Track user's call attempts
  - Detect repeated failures
Severity:
  - Info: Normal call initiation
Actions:
  - Track if call completes successfully
  - Correlate with middleware (TSP) logs
  - Correlate with server (CTI Manager) logs
```

**Example Tier 1 Patterns**:
- "User clicked" / "Button pressed" - UI interactions
- "Window state changed" - App lifecycle
- "Settings changed" - User preferences
- "Screen displayed" - UI flow tracking
- "Dialog shown" - User prompts

---

### Tier 2: Client Middleware Patterns

**Focus**: Protocol translation and system integration

```yaml
Pattern: "TSP MakeCall"
Context: Tier 2 (Client Middleware)
Purpose: Track call control flow through telephony driver
Parameters:
  - destination: Called number
  - line_id: Line being used
  - call_id: Unique call identifier
  - cti_manager_ip: Target CTI Manager
Temporal Analysis:
  - Track request → response timing
  - Detect timeouts
  - Monitor driver health
Severity:
  - Info: Normal TSP operation
  - Warning: Slow response from CTI Manager
  - Error: Timeout or driver failure
Actions:
  - Check network to CTI Manager
  - Verify driver configuration
  - Restart TSP service
  - Correlate with Tier 3 (CTI Manager) logs
```

**Example Tier 2 Patterns**:
- "TSP MakeCall" / "TAPI lineOpen" - Call control requests
- "CTI message sent" - Protocol messages
- "Driver initialization" - Middleware startup
- "COM interface" - Inter-process communication
- "Protocol error" - Integration failures

---

### Tier 3: Server Patterns

**Focus**: System-wide health and capacity

```yaml
Pattern: "CTI Manager: Call setup failed"
Context: Tier 3 (Server)
Purpose: Detect server-side call failures
Parameters:
  - failure_reason: Why system couldn't setup call
  - affected_user: Which user was impacted
  - resource_type: What resource was unavailable
Temporal Analysis:
  - Track failure rate across ALL users
  - Detect capacity exhaustion
  - Identify peak load periods
Severity:
  - Warning: 5% call failure rate (isolated issue)
  - Error: 20% call failure rate (widespread problem)
Actions:
  - Scale up media resources
  - Restart CTI Manager service
  - Check cluster health
  - Identify affected users (correlate with Tier 1/2)
```

**Example Tier 3 Patterns**:
- "CTI Manager: Device registration" - Client connectivity
- "Database connection pool" - System resource limits
- "Cluster node unreachable" - Infrastructure issues
- "Media resource allocation" - Capacity management
- "SIP 503 Service Unavailable" - Overload conditions
- "License limit reached" - System constraints

---

## Pattern Categories by Tier

### Tier 1: Client Application Patterns (~50 patterns)

**Categories**:
1. **UI Events** - Button clicks, menu selections, window states
2. **Device Access** - Camera, microphone, speakers, permissions
3. **Local Network** - WiFi state, VPN status, interface changes
4. **Client Performance** - Memory usage, CPU, thread states
5. **User Preferences** - Settings changes, customization
6. **Local Storage** - Cache, config files, credentials
7. **Desktop Integration** - Outlook, calendar, contacts

**Example**:
```
Pattern: "User clicked 'End Call' button"
Context: Client-only
Why: Only client knows about UI interactions
```

---

### Tier 2: Client Middleware Patterns (~50 patterns)

**Categories**:
1. **Call Control** - MakeCall, DropCall, Hold, Transfer
2. **Protocol Translation** - TAPI→CTI, API→TSP
3. **Driver Events** - Initialization, shutdown, errors
4. **CTI Messages** - Requests, responses, timeouts
5. **Device Management** - Line state, device state
6. **COM/DCOM** - Inter-process communication
7. **Configuration** - Driver settings, registry

**Example**:
```
Pattern: "TSP MakeCall timeout"
Context: Tier 2 only
Why: Only middleware knows about TSP timeout
Correlation: Check Tier 3 CTI Manager logs for corresponding failure
```

---

### Tier 3: Server Patterns (~150 patterns)

**Categories**:
1. **Call Routing** - Dial plan, route patterns, trunks
2. **Resource Management** - Media resources, transcoding, conferencing
3. **Database Operations** - Queries, replication, backups
4. **Cluster Management** - Node health, failover, synchronization
5. **Integration** - External systems, APIs, LDAP
6. **License Management** - Usage, limits, expiration
7. **System Maintenance** - Upgrades, patches, restarts

**Example**:
```
Pattern: "Media resource allocation failed"
Context: Server-only
Why: Only server manages media resource pool
```

---

### Cross-Tier Patterns (~173 patterns)

**Categories** (appear in multiple tiers but interpreted differently):
1. **Authentication** - Tier 1: user login; Tier 2: driver auth; Tier 3: device registration
2. **Call Events** - Tier 1: UI call state; Tier 2: TSP call state; Tier 3: system call records
3. **RTP Statistics** - Tier 1: local metrics; Tier 3: gateway aggregates
4. **Network Connectivity** - Tier 1: app connectivity; Tier 2: CTI Manager reachability; Tier 3: trunk/gateway
5. **Errors** - Tier 1: UI errors; Tier 2: driver errors; Tier 3: system errors

**Example**:
```yaml
Pattern: "Call failed"

Tier 1 (Client App) Context:
  - Parameters: target_number, user_action, error_message
  - Interpretation: User saw "Call Failed" dialog
  - Action: Guide user through troubleshooting
  - Temporal: Track THIS user's failed attempts

Tier 2 (Middleware) Context:
  - Parameters: call_id, cti_manager_response, timeout_duration
  - Interpretation: TSP couldn't reach CTI Manager
  - Action: Check network, CTI Manager service, driver config
  - Temporal: Track CTI Manager response times
  - Correlation: Check Tier 3 for CTI Manager availability

Tier 3 (Server) Context:
  - Parameters: device_id, failure_reason, system_state
  - Interpretation: Server couldn't setup call (capacity/config)
  - Action: Check resources, configuration, cluster health
  - Temporal: Track failure rate across ALL users
  - Correlation: Identify affected users in Tier 1/2 logs
```

---

## Temporal Analysis: Multi-Tier Perspective

### Tier 1 (Client App) Temporal Analysis

**Session-Based Tracking**:
```rust
struct ClientSession {
    user_id: String,
    session_start: Timestamp,
    session_end: Option<Timestamp>,
    
    // Track this user's metrics
    call_quality: Vec<RTCStats>,
    ui_interactions: Vec<UIEvent>,
    errors: Vec<ErrorEvent>,
}
```

**Time Windows**:
- Short: Last 5 minutes of this user's session
- Medium: This user's entire session (hours)
- Long: This user's history across multiple sessions (days)

**Stagnation Detection**:
```
User's RTP stats stuck at 0 for 10 seconds
→ THIS USER has no audio
→ Fix: Troubleshoot THIS USER's setup
```

---

### Tier 2 (Client Middleware) Temporal Analysis

**Request-Response Tracking**:
```rust
struct MiddlewareTransaction {
    call_id: String,
    request_time: Timestamp,
    response_time: Option<Timestamp>,
    timeout_occurred: bool,
    
    // Track middleware performance
    response_times: Vec<Duration>,
    timeout_count: u32,
}
```

**Time Windows**:
- Short: Last 10 TSP requests (recent performance)
- Medium: This user's session (middleware health for this user)
- Long: Service uptime (overall middleware stability)

**Timeout Detection**:
```
TSP MakeCall sent at 17:15:56
No response after 5 seconds
→ CTI Manager unreachable or overloaded
→ Need to check Tier 3 (server) logs
```

---

### Tier 3 (Server) Temporal Analysis

**Aggregate Tracking**:
```rust
struct SystemMetrics {
    time_window: Duration,
    
    // Track system-wide metrics
    total_calls: u64,
    failed_calls: u64,
    active_sessions: u64,
    resource_usage: ResourceMetrics,
}
```

**Time Windows**:
- Short: Last 5 minutes (real-time monitoring)
- Medium: Last hour (trend detection)
- Long: Last 24 hours/week (capacity planning)

**Trend Detection**:
```
Call failure rate increasing:
  10:00 - 2% failure rate (normal)
  10:30 - 5% failure rate (warning)
  11:00 - 15% failure rate (critical)
→ SYSTEM capacity issue
→ Fix: Scale up infrastructure
```

---

## Multi-Tier Correlation: Complete Transaction Flow

### Why Multi-Tier Correlation Matters

**Scenario**: User reports "My call failed"

**Tier 1 (Client App) Log Only**:
```
17:15:56 INFO - User clicked 'Make Call' to 5001
17:15:58 ERROR - Call setup failed: Timeout
```
→ We know user tried and UI showed error, but not WHY

**Tier 2 (Middleware) Log Only**:
```
17:15:56 DEBUG - TSP MakeCall request for 5001
17:15:57 DEBUG - Sent CTI message to CTI Manager
17:16:01 ERROR - CTI Manager timeout after 5 seconds
```
→ We know middleware couldn't reach server, but not root cause

**Tier 3 (Server) Log Only**:
```
17:15:57 WARN - CTI Manager: High load, request queue at 95%
17:15:58 ERROR - Call setup failed: No media resources available
```
→ We know system had issues, but not which users were affected

**All Three Tiers Combined**:
```
TIER 1: User john.doe clicked call at 17:15:56
TIER 2: TSP sent CTI request at 17:15:56, timeout at 17:16:01
TIER 3: CTI Manager overloaded, no media resources at 17:15:57

CORRELATION: 
→ User's call failed BECAUSE CTI Manager was overloaded
→ TSP timeout occurred BECAUSE CTI Manager couldn't respond
→ Root cause: Server capacity issue (not user's device or network)
→ Impact: ALL users attempting calls during this window
→ Solution: Scale CTI Manager resources, not troubleshoot user's PC
```

---

### Correlation Strategies

#### 1. **Time-Based Correlation**
```
Tier 1: [17:15:56] User clicked 'Make Call'
Tier 2: [17:15:56.100] TSP MakeCall request
Tier 2: [17:15:56.200] CTI message sent
Tier 3: [17:15:57] CTI Manager received request
Tier 3: [17:15:57.500] Call setup failed

Time Sequence: Complete flow visible
Correlation Confidence: Exact
```

#### 2. **Transaction ID Correlation**
```
Tier 1: call_id=xyz789, user clicked call
Tier 2: call_id=xyz789, TSP processing
Tier 3: call_id=xyz789, CTI Manager handling

Match Found: Same transaction across all tiers
Correlation Confidence: Exact (best case)
```

#### 3. **User-Based Correlation**
```
Tier 1: user=john.doe@example.com
Tier 2: username=john.doe (from TSP context)
Tier 3: device_name=SEP001122334455 (john.doe's phone)

Match Found: Track john.doe's experience across all tiers
Correlation Confidence: High
```

#### 4. **Flow-Based Correlation**
```
Tier 1: "User clicked Make Call" → No call_id yet
Tier 2: "TSP MakeCall" → call_id generated
Tier 3: "CTI Manager received" → Matches call_id

Flow Reconstruction: UI action → TSP → CTI Manager
Correlation Confidence: Medium (depends on timing/user match)
```

#### 5. **Failure Propagation Correlation**
```
Tier 3: [17:15:57] CTI Manager timeout
Tier 2: [17:16:01] TSP timeout (4 seconds later)
Tier 1: [17:16:02] UI shows error (1 second after TSP)

Cascade Visible: Server failure → Middleware timeout → UI error
Correlation Confidence: High
```

---

### Multi-Tier Correlation Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Tier 1:    │    │  Tier 2:    │    │  Tier 3:    │
│  Client App │    │  Middleware │    │  Server     │
│  (john.doe) │    │  (TSP/CTI)  │    │  (CUCM)     │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                   │
       ↓                  ↓                   ↓
  ┌─────────┐       ┌─────────┐        ┌─────────┐
  │Extract: │       │Extract: │        │Extract: │
  │- Time   │       │- Time   │        │- Time   │
  │- User   │       │- User   │        │- User   │
  │- Action │       │- Call ID│        │- Call ID│
  └────┬────┘       └────┬────┘        └────┬────┘
       │                 │                   │
       └─────────────────┼───────────────────┘
                         ↓
                ┌────────────────┐
                │  Multi-Tier    │
                │  Correlation   │
                │     Engine     │
                └────────┬───────┘
                         ↓
                ┌────────────────┐
                │   Unified      │
                │   Timeline     │
                │   (3 Tiers)    │
                └────────────────┘
```

**Unified Multi-Tier Timeline Example**:
```
17:15:56.000 [TIER 1] User john.doe clicked 'Make Call' to 5001
17:15:56.100 [TIER 2] TSP received MakeCall request (call_id: xyz789)
17:15:56.200 [TIER 2] CTI Control formatted CTI message
17:15:56.250 [TIER 2] Sent CTI message to CTI Manager at 10.1.1.5
17:15:56.500 [TIER 3] CTI Manager received request (call_id: xyz789)
17:15:56.800 [TIER 3] CUCM processing call setup
17:15:57.000 [TIER 3] Allocating media resources...
17:15:57.500 [TIER 3] ERROR: No media resources available
17:15:57.600 [TIER 3] CTI Manager: Call setup failed
17:16:01.000 [TIER 2] ERROR: CTI Manager timeout (no response after 5s)
17:16:01.100 [TIER 2] TSP: MakeCall failed
17:16:01.200 [TIER 1] ERROR: Call setup timeout from TSP
17:16:01.300 [TIER 1] User john.doe sees "Call Failed" dialog

ANALYSIS:
- User action (Tier 1) → Middleware request (Tier 2) → Server processing (Tier 3)
- Failure originated at Tier 3 (no media resources)
- Tier 2 timed out waiting for Tier 3 response
- Tier 1 displayed error from Tier 2
- Root Cause: Server capacity issue (Tier 3)
- Solution: Scale media resources, NOT troubleshoot user's PC
```

---

## Implementation: Current State

### What We Have (✅)

**Single Log File Analysis**:
- ✅ Pattern matching works for client logs
- ✅ Parameter extraction from full line
- ✅ Temporal analysis within single file
- ✅ Diagnostics with context-aware severity

**Context Detection**:
- ✅ File path analysis (jabber.log, webex.log)
- ✅ Pattern-based detection (UI events vs system events)

**Pattern Library**:
- ✅ 423 patterns from TagScout (mixed client/server)
- ✅ Patterns work regardless of context

---

### What We Need (📋 TODO)

**Tier-Aware Pattern Loading**:
```rust
// Load only relevant patterns based on log tier
fn load_patterns(context: &LogContext) -> Vec<Pattern> {
    match context {
        LogContext::Tier1ClientApp { product, component, .. } => {
            load_tier1_patterns(product, component)
        }
        LogContext::Tier2ClientMiddleware { component, .. } => {
            load_tier2_patterns(component)  // TSP, CTI Control, etc.
        }
        LogContext::Tier3Server { service, component, .. } => {
            load_tier3_patterns(service, component)  // CTI Manager, CUCM, etc.
        }
        LogContext::Unknown => {
            load_all_patterns()  // Try everything
        }
    }
}
```

**Multi-File Multi-Tier Analysis**:
```rust
// Analyze multiple log files across all tiers
struct MultiTierAnalyzer {
    tier1_logs: Vec<LogFile>,  // Client app logs
    tier2_logs: Vec<LogFile>,  // Middleware logs (TSP, CTI Control)
    tier3_logs: Vec<LogFile>,  // Server logs (CTI Manager, CUCM)
    
    // Multi-tier correlation engine
    correlator: MultiTierCorrelator,
}

struct MultiTierCorrelator {
    // Transaction tracking across tiers
    transactions: HashMap<String, Transaction>,
}

struct Transaction {
    id: String,
    user_id: Option<String>,
    start_time: Timestamp,
    
    // Events from each tier
    tier1_events: Vec<Event>,
    tier2_events: Vec<Event>,
    tier3_events: Vec<Event>,
    
    // Correlation status
    is_complete: bool,
    root_cause_tier: Option<Tier>,
}
```

**Unified Timeline**:
```rust
// Merge events from multiple sources
struct UnifiedTimeline {
    events: Vec<CorrelatedEvent>,
    
    fn add_client_event(&mut self, event: ClientEvent);
    fn add_server_event(&mut self, event: ServerEvent);
    fn correlate(&self) -> Vec<CorrelatedEventGroup>;
}
```

**Tier-Aware Actions**:
```yaml
Action: "Restart Service"

Tier 1 (Client App):
  - Command: "Restart-Process -Name 'Jabber'"
  - Scope: This user's application
  - Danger: LOW (affects only this user)
  - Permission: User

Tier 2 (Middleware):
  - Command: "Restart-Service -Name 'CiscoTSP'"
  - Scope: This user's telephony driver (may affect other apps)
  - Danger: MEDIUM (affects this PC's telephony)
  - Permission: Local Admin

Tier 3 (Server):
  - Command: "systemctl restart cti-manager"
  - Scope: Entire system (affects all users)
  - Danger: HIGH (system-wide impact)
  - Permission: Infrastructure Admin
  - Confirmation: Required + approval
```

---

## Pattern Catalog: Organizing by Tier

### TODO_PATTERN_CATALOG.md Enhancement

Add tier classification:

```yaml
Pattern Documentation Template:

# Existing fields...
Category: Telephony
Product: Jabber

# NEW: Tier Classification
Tier:
  primary: tier1 | tier2 | tier3 | multi-tier
  tier1_interpretation: |
    What this means in client app logs
  tier2_interpretation: |
    What this means in middleware logs
  tier3_interpretation: |
    What this means in server logs
  correlation_opportunities: |
    How to correlate across tiers

# Example:
Pattern: "Call failed"
Tier:
  primary: multi-tier
  tier1_interpretation: |
    User saw "Call Failed" error dialog.
    User's perspective: "My call isn't working"
  tier2_interpretation: |
    TSP or CTI Control couldn't complete call setup.
    Possible: Timeout reaching CTI Manager, driver error
  tier3_interpretation: |
    Server couldn't allocate resources or route call.
    Possible: Capacity issue, configuration error, trunk failure
  correlation_opportunities: |
    - Match call_id across all three tiers
    - Track time progression: UI click → TSP request → CTI Manager processing
    - Identify failure origin: Which tier failed first?
    - Determine root cause: UI issue? Driver issue? Server issue?
```

---

## Scenarios: Multi-Tier Workflows

### Tier 1 Focused Scenarios

**Example: "No Audio Troubleshooting"**
```yaml
Context: Tier 1 (Client App)
Steps:
  1. Check UI state and user actions (tier 1)
  2. Verify app configuration (tier 1)
  3. Check app logs for errors (tier 1)
  4. Restart application (tier 1)
  5. If still failing → Check Tier 2 (middleware) logs
```

---

### Tier 2 Focused Scenarios

**Example: "TSP Troubleshooting"**
```yaml
Context: Tier 2 (Middleware)
Steps:
  1. Check TSP service status (tier 2)
  2. Verify CTI Manager connectivity (tier 2)
  3. Check TSP configuration (tier 2)
  4. Review recent TSP errors (tier 2)
  5. If TSP OK → Check Tier 3 (server) availability
  6. If TSP failing → Check Tier 1 (app) symptoms
```

---

### Tier 3 Focused Scenarios

**Example: "CTI Manager Investigation"**
```yaml
Context: Tier 3 (Server)
Steps:
  1. Check CTI Manager service status (tier 3)
  2. Check system resource availability (tier 3)
  3. Check cluster health (tier 3)
  4. Review CTI Manager request queue (tier 3)
  5. Identify affected users (correlate with tier 1/2)
  6. For specific user → Trace through middleware (tier 2)
```

---

### Multi-Tier Cross-Context Scenarios

**Example: "Complete Call Failure Analysis"**
```yaml
Context: Multi-Tier (All tiers)
Steps:
  1. Start at symptom tier (where user reported issue)
  2. Tier 1: Check UI logs (user actions, errors shown)
  3. Tier 2: Check middleware logs (TSP/CTI Control)
     - Did request reach middleware?
     - Did middleware contact server?
     - What was the response/timeout?
  4. Tier 3: Check server logs (CTI Manager, CUCM)
     - Did server receive request?
     - What was server's response?
     - Was there a resource/config issue?
  5. Correlation: Build complete timeline
  6. Root cause: Identify which tier failed first
  7. Resolution: Apply fix at appropriate tier
  8. Validation: Verify fix across all tiers
```

---

## Best Practices

### For Pattern Authors

1. **Clearly label pattern tier**
   ```yaml
   Pattern: "TSP MakeCall"
   Tier: tier2 (middleware only)
   Rationale: Only TSP middleware generates this event
   ```

2. **Provide interpretation for each tier**
   ```yaml
   Pattern: "Call failed"
   Tier 1: UI showed error to user
   Tier 2: Middleware couldn't complete request
   Tier 3: Server couldn't allocate resources
   ```

3. **Design multi-tier correlation keys**
   ```yaml
   Pattern: "Call event"
   Correlation Keys:
     - call_id (exact match across all tiers)
     - user_id (track user across tiers)
     - timestamp (sequence across tiers)
     - transaction_flow (tier1 → tier2 → tier3)
   ```

### For Action Designers

1. **Tier-specific actions**
   ```yaml
   Action: "Fix Call Issue"
   Tier 1: Restart Jabber app (user-level)
   Tier 2: Restart TSP service (local admin)
   Tier 3: Restart CTI Manager (infrastructure admin)
   ```

2. **Appropriate permissions per tier**
   ```yaml
   Tier 1 Actions: User can execute
   Tier 2 Actions: Local admin required
   Tier 3 Actions: Infrastructure admin only
   ```

3. **Impact awareness per tier**
   ```yaml
   Tier 1: Affects one user only
   Tier 2: Affects this user + possibly other apps on PC
   Tier 3: May affect ALL users system-wide
   ```

---

## Future Enhancements

### Phase 1: Tier Detection (Next)
- [ ] Automatic log tier detection (tier 1/2/3)
- [ ] Technology identification (CUACA, TSP, CTI Manager, etc.)
- [ ] Tier-specific pattern loading
- [ ] Tier metadata in diagnostics

### Phase 2: Multi-File Multi-Tier Support (Q2)
- [ ] Load multiple log files from different tiers
- [ ] Multi-tier correlation engine
- [ ] Unified timeline view (all tiers)
- [ ] Transaction flow reconstruction

### Phase 3: Cross-Tier Correlation (Q3)
- [ ] Time-based correlation across tiers
- [ ] Transaction ID matching (call_id across tiers)
- [ ] User tracking across tiers
- [ ] Flow-based correlation (tier1 → tier2 → tier3)
- [ ] Failure propagation tracking
- [ ] Automated root cause analysis (identify failing tier)

### Phase 4: Advanced Multi-Tier Analytics (Q4)
- [ ] Cross-tier trend analysis
- [ ] Tier-specific vs cross-tier issue classification
- [ ] Predictive correlation (predict tier 3 issue from tier 2 patterns)
- [ ] Impact analysis (tier 3 issue → affected tier 2 → affected tier 1 users)
- [ ] Performance bottleneck identification (which tier is slow?)

---

## Summary

**Key Differences Across Tiers**:

| Aspect | Tier 1: App | Tier 2: Middleware | Tier 3: Server |
|--------|------------|-------------------|----------------|
| **Scope** | One user | One user (system-level) | All users |
| **Goal** | Fix UI/app issues | Fix integration/driver | Optimize system |
| **Time** | User session | Service uptime | System uptime |
| **Patterns** | User experience | Protocol/driver events | System health |
| **Actions** | App restart | Service restart | Infrastructure changes |
| **Permissions** | User-level | Local admin | Infrastructure admin |
| **Correlation** | With tier 2 | With tier 1 & 3 | With tier 2 |

**Integration Strategy**:
1. Analyze each tier independently (current)
2. Add tier detection and awareness (next)
3. Enable multi-file multi-tier analysis (Q2)
4. Build multi-tier correlation engine (Q3)
5. Create unified cross-tier diagnostics (Q3)
6. Implement transaction flow reconstruction (Q4)

**The Vision**:
```
User: "My call failed"
System:
  ✓ Analyzes Tier 1 (client app) → User clicked call, saw error
  ✓ Analyzes Tier 2 (middleware) → TSP timeout reaching CTI Manager
  ✓ Analyzes Tier 3 (server) → CTI Manager overloaded, media resources exhausted
  ✓ Correlation → Complete transaction flow reconstructed
  ✓ Root cause identified → Tier 3 capacity issue (not tier 1 or 2)
  ✓ Recommendation → Scale CTI Manager and media resources
  ✓ User notification → "System issue affecting multiple users, infrastructure team notified"
  ✓ Impact analysis → 47 other users affected in same time window
```

---

**Last Updated**: 2026-02-17
**Status**: 📋 Architecture Defined - Implementation TODO
**Dependencies**: 
- TODO_PATTERN_CATALOG.md (needs tier classification for all 423 patterns)
- PATTERN_TO_ACTION_FRAMEWORK.md (needs tier-aware actions)
- TEMPORAL_ANALYSIS_DESIGN.md (needs multi-tier temporal support)

**Key Technologies to Document**:
- CUACA (Cisco Unified Application Client Architecture)
- TSP (Telephony Service Provider)
- CTI Control (Computer Telephony Integration Control)
- CTI Manager (CUCM component)
- TAPI (Telephony Application Programming Interface)