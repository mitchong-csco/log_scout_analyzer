# Scenario 10: Application State Tracking Over Time 🚧

**Status:** 🚧 Partially Implemented  
**Priority:** 🟢 Future Enhancement  
**User Persona:** Sarah the Cisco UC Engineer  

---

## 📖 User Story

*"As Sarah, I need to track how application states change over time—like call states, registration status, TLS keys, connection pools, and feature flags—to understand system behavior and identify when failures occurred."*

---

## 🎯 User Flow

### Primary Flow: Call State Timeline

1. Sarah opens a bundle with call flow logs
2. Right-clicks in editor → "Scout: Track State Changes"
3. Extension identifies state-tracking patterns in the log
4. Timeline view shows state transitions:
   ```
   10:23:15 - Call abc123: Initial → Calling
   10:23:16 - Call abc123: Calling → Proceeding
   10:23:17 - Call abc123: Proceeding → Ringing
   10:23:20 - Call abc123: Ringing → Connected
   10:25:45 - Call abc123: Connected → Disconnecting
   10:25:46 - Call abc123: Disconnecting → Terminated
   ```
5. Sarah clicks on a state transition → jumps to log line
6. Hover shows state duration: "Connected: 2m 25s"
7. Sarah filters timeline to show only "Failed" state changes
8. Identifies pattern: all failures occur during "Proceeding → Ringing" transition

### Alternative Flow 1: Registration State Tracking

1. Sarah analyzes Jabber logs for registration issues
2. Extension tracks registration state changes:
   ```
   09:00:00 - Registration: Unregistered
   09:00:05 - Registration: Registering (attempt 1)
   09:00:10 - Registration: Failed (401 Unauthorized)
   09:00:15 - Registration: Registering (attempt 2)
   09:00:20 - Registration: Registered ✅
   09:15:30 - Registration: Unregistered (timeout)
   09:15:35 - Registration: Registering (attempt 3)
   ```
3. State summary shows:
   - Registered: 15m 10s (95%)
   - Unregistered: 35s (4%)
   - Failed attempts: 2

### Alternative Flow 2: Feature State Tracking

1. Sarah investigates feature toggle behavior
2. Extension tracks feature states:
   ```
   08:00:00 - Feature "VoicemailToEmail": Enabled
   10:30:00 - Feature "VoicemailToEmail": Disabled (admin change)
   11:45:00 - Feature "E911": Enabled
   14:20:00 - Feature "VideoCall": Disabled (license expired)
   ```
3. Correlates feature state changes with errors
4. Finds spike in errors after "VoicemailToEmail" disabled

### Alternative Flow 3: Connection Pool State

1. Sarah tracks database connection pool over time:
   ```
   10:00 - Pool: 0/50 active
   10:15 - Pool: 10/50 active
   10:30 - Pool: 25/50 active
   10:45 - Pool: 48/50 active ⚠️
   11:00 - Pool: 50/50 active (exhausted) ❌
   11:01 - Errors: "Connection timeout" (x150)
   ```
2. Identifies connection leak pattern
3. Exports state timeline for TAC case

---

## 🎨 State Types to Track

### 1. **Call States** ✅ (Already Implemented)
**Pattern Source:** Call flow analysis  
**States:**
- Initial → Calling → Proceeding → Ringing → Connected → Disconnecting → Terminated
- Failed, Cancelled

**TagScout Patterns:**
- `INVITE` (triggers Calling state)
- `180 Ringing` (triggers Ringing state)
- `200 OK` (triggers Connected state)
- `BYE` (triggers Disconnecting state)
- `4xx/5xx` responses (trigger Failed state)

### 2. **Registration States** 🚧 (Partial)
**Pattern Source:** SIP REGISTER messages  
**States:**
- Unregistered → Registering → Registered
- Failed, Expired, Unauthorized

**Potential TagScout Patterns:**
```regex
Registration state: (?P<state>Unregistered|Registering|Registered|Failed)
SIP/2.0 (?P<code>200|401|403) (?P<reason>.*)
Registration expired for user (?P<user>.*)
```

### 3. **TLS/Certificate States** 🚧 (Partial)
**Pattern Source:** SSL/TLS handshake logs  
**States:**
- Valid → Expiring Soon → Expired
- Renewed, Revoked

**Potential TagScout Patterns:**
```regex
Certificate expires in (?P<days>\d+) days
TLS handshake: (?P<result>success|failed)
Certificate rotation: (?P<status>started|completed|failed)
Key strength: (?P<bits>\d+) bits
```

### 4. **Connection States** 🚧 (Planned)
**Pattern Source:** Database/network connection logs  
**States:**
- Disconnected → Connecting → Connected → Active → Idle → Closing → Closed
- Error, Timeout, Refused

**Potential TagScout Patterns:**
```regex
Connection pool: (?P<active>\d+)/(?P<max>\d+) active
Database connection: (?P<state>established|lost|timeout)
TCP state: (?P<state>SYN_SENT|ESTABLISHED|CLOSE_WAIT|CLOSED)
```

### 5. **Feature Flags** 🚧 (Planned)
**Pattern Source:** Configuration change logs  
**States:**
- Enabled → Disabled
- Default, Overridden

**Potential TagScout Patterns:**
```regex
Feature (?P<feature>\w+): (?P<state>enabled|disabled)
Feature toggle: (?P<feature>\w+) = (?P<value>true|false)
License status for (?P<feature>\w+): (?P<status>valid|expired|invalid)
```

### 6. **Service Health** 🚧 (Planned)
**Pattern Source:** Health check logs  
**States:**
- Starting → Healthy → Degraded → Unhealthy → Stopped
- Restarting, Failed

**Potential TagScout Patterns:**
```regex
Service (?P<service>\w+): (?P<state>starting|healthy|degraded|unhealthy)
Health check: (?P<result>passed|failed) \((?P<latency>\d+)ms\)
```

---

## 💡 Implementation Strategy

### Phase 1: Pattern Identification
**Goal:** Identify existing TagScout patterns that contain state information

**Approach:**
1. Scan TagScout patterns for state-related fields:
   - Patterns with `state`, `status`, `mode` in extracted fields
   - Patterns with known state values (enabled/disabled, connected/disconnected)
   - Patterns with sequential progression (attempt 1→2→3)

2. Annotate patterns with state metadata:
```json
{
  "pattern_id": "SIP_REGISTER_200",
  "state_tracking": {
    "entity_type": "registration",
    "state_field": "status",
    "state_value": "registered",
    "transitions_from": ["registering", "unregistered"],
    "transitions_to": ["unregistered", "expired"]
  }
}
```

### Phase 2: State Extraction
**Goal:** Extract state changes from log lines

**Implementation:**
```typescript
interface StateChange {
  timestamp: Date;
  entity_id: string;        // call-id, user-id, connection-id
  entity_type: string;      // "call", "registration", "feature"
  previous_state?: string;
  new_state: string;
  duration_in_state?: number; // milliseconds
  metadata: {
    pattern_id: string;
    extracted_fields: Record<string, string>;
    log_line: string;
  };
}
```

**Algorithm:**
1. For each log line with state pattern:
   - Extract entity ID (call-id, user, connection)
   - Extract state value
   - Compare with previous state for this entity
   - If changed, record StateChange event
   - Calculate duration in previous state

### Phase 3: Timeline Visualization
**Goal:** Show state changes over time in UI

**Timeline View Features:**
- **Swimlanes:** One row per entity (call, connection, user)
- **State blocks:** Visual blocks showing state and duration
- **Transitions:** Arrows showing state changes
- **Color coding:** Green (success), Yellow (warning), Red (error)
- **Hover details:** State duration, transition count
- **Filtering:** By entity type, state, time range

**Example Timeline:**
```
Call abc123  |▓▓|===|~~~|█████████████|---| Terminated ✅
             | ^ ^   ^   ^           ^
             | | |   |   |           Disconnecting (1s)
             | | |   |   Connected (2m 25s)
             | | |   Ringing (3s)
             | | Proceeding (1s)
             | Calling (1s)
             Initial

Call def456  |▓▓|===|XXX Failed ❌
             | ^ ^   ^
             | | |   Error: 486 Busy Here
             | | Proceeding
             | Calling
             Initial

Legend: |▓| Initial  |=| Proceeding  |~| Ringing  |█| Connected  |-| Disconnecting  |X| Failed
```

### Phase 4: Analytics & Insights
**Goal:** Provide statistical analysis of state patterns

**Metrics:**
- **State Distribution:** Time spent in each state (%)
- **Transition Frequency:** Most common transitions
- **Failure Patterns:** Which transitions fail most often
- **Outliers:** Unusually long/short state durations
- **Trends:** State changes over time

**Example Report:**
```
Call State Analysis (50 calls, 2 hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success Rate: 92% (46/50 calls)
Failed: 8% (4/50 calls)

Average State Durations:
  Calling: 0.8s
  Proceeding: 1.2s
  Ringing: 3.5s
  Connected: 2m 15s
  Disconnecting: 0.5s

Failure Analysis:
  Proceeding → Failed: 3 occurrences (75%)
    - 486 Busy Here: 2
    - 408 Request Timeout: 1
  Ringing → Failed: 1 occurrence (25%)
    - 487 Request Terminated: 1

Recommendations:
⚠️  High failure rate in Proceeding state
💡 Check network latency (408 timeouts)
💡 Review busy handling configuration (486)
```

---

## ✅ Implementation Status

### Completed Features
- ✅ Call state tracking (CallState enum)
- ✅ Call state machine (state transitions)
- ✅ State change detection in call flows
- ✅ Call duration calculation

### Partially Implemented
- 🚧 Timeline visualization (basic timeline view exists)
- 🚧 State correlation with errors
- 🚧 Pattern metadata for state tracking

### Not Yet Implemented
- ❌ Automatic pattern state annotation
- ❌ Multi-entity state tracking (beyond calls)
- ❌ State analytics dashboard
- ❌ State transition filtering
- ❌ State change alerts
- ❌ Export state timeline

---

## 🧪 Test Coverage

**Status:** ⏸️ **Partially Tested**

**Existing Tests:**
- ✅ Call state machine transitions (10+ tests)
- ✅ Call state detection from SIP messages

**Needed Tests:**
- ❌ Multi-entity state tracking
- ❌ State timeline generation
- ❌ State duration calculation
- ❌ State analytics
- ❌ Pattern state annotation

---

## 📚 Documentation

**Existing:**
- **Call Flow:** `docs/PHASE3_CALL_FLOW_IMPLEMENTATION.md`
- **State Machine:** `crates/pattern-engine/src/call_flow/state_machine.rs`
- **Call States:** `crates/pattern-engine/src/call_flow/types.rs`

**Needed:**
- State tracking architecture
- Pattern state annotation guide
- State analytics API
- Timeline visualization spec

---

## 🔮 Future Enhancements

### Phase 5: Real-Time State Monitoring
- Live state tracking as logs stream in
- State change notifications
- Anomaly detection (unexpected state transitions)

### Phase 6: Predictive State Analysis
- ML-based state prediction
- "Calls typically fail in Proceeding state when..."
- Proactive alerts: "Connection pool approaching limit"

### Phase 7: Cross-System State Correlation
- Track states across multiple services
- "When Jabber goes to Registered, CUCM shows..."
- Distributed tracing of state changes

---

## 🎯 Example Use Cases

### Use Case 1: Call Failure Debugging
**Problem:** Calls randomly fail  
**Investigation:**
1. Track call states for failed calls
2. Identify common state at failure: "Proceeding"
3. Filter for "Proceeding → Failed" transitions
4. Find pattern: All failures have 100ms+ delay before failure
5. Root cause: Network congestion

### Use Case 2: Registration Flapping
**Problem:** Users complain about intermittent registration  
**Investigation:**
1. Track registration state for affected users
2. State timeline shows: Registered → Unregistered every 5 minutes
3. Duration analysis: Only registered for 4m 30s (should be indefinite)
4. Root cause: Incorrect keepalive timer

### Use Case 3: Feature Rollout Impact
**Problem:** After enabling feature, errors increased  
**Investigation:**
1. Track feature state changes
2. Correlate with error rate
3. Timeline shows: Feature enabled → Error spike 2 minutes later
4. State tracking identifies affected component
5. Rollback decision based on data

### Use Case 4: Connection Pool Exhaustion
**Problem:** Application becomes unresponsive periodically  
**Investigation:**
1. Track connection pool state
2. State shows gradual increase: 10 → 25 → 40 → 50/50
3. No connections released (leak detected)
4. Identify code path that doesn't close connections
5. Fix connection leak

---

## ⏱️ Time to Complete

**Setup:** 5 minutes (enable state tracking)  
**Analysis:** 10-20 minutes (review state timeline)  
**Total:** 15-25 minutes

---

## 🔗 Related Scenarios

- **Scenario 2:** Multi-File Investigation (state across files)
- **Scenario 6:** SIP Call Flow Analysis (call state tracking exists)
- **Scenario 7:** Multiple Bundles for Same Case (state across bundles)
- **Scenario 8:** Filter & Search Results (filter by state)

---

## 🛠️ Technical Architecture

### State Tracker Service
```typescript
class StateTracker {
  private entities: Map<string, EntityState>;
  
  trackStateChange(event: StateChange): void {
    const entity = this.entities.get(event.entity_id) || {
      id: event.entity_id,
      type: event.entity_type,
      states: [],
      currentState: null
    };
    
    entity.states.push({
      state: event.new_state,
      timestamp: event.timestamp,
      duration: event.duration_in_state
    });
    
    entity.currentState = event.new_state;
    this.entities.set(event.entity_id, entity);
  }
  
  getTimeline(entityId: string): StateTimeline {
    const entity = this.entities.get(entityId);
    return new StateTimeline(entity.states);
  }
  
  getAnalytics(entityType: string): StateAnalytics {
    const entities = Array.from(this.entities.values())
      .filter(e => e.type === entityType);
    return new StateAnalytics(entities);
  }
}
```

### LSP Integration
```rust
// Pattern metadata for state tracking
pub struct StateMetadata {
    pub entity_type: String,
    pub state_field: String,
    pub state_value: String,
    pub transitions_from: Vec<String>,
    pub transitions_to: Vec<String>,
}

// Enhanced pattern match with state
pub struct StateMatch {
    pub pattern_match: PatternMatch,
    pub state_change: Option<StateChange>,
}
```

---

**Last Updated:** January 8, 2025  
**Implementation Priority:** Future (Q2 2025)  
**Dependencies:** Pattern metadata system, Timeline view enhancements