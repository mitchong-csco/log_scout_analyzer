# Pattern → Action → Scenario Framework

## Overview

This framework connects the entire log analysis pipeline from pattern matching through to actionable remediation steps and automated scenarios.

**Flow**:
```
Pattern Match → Parameter Extraction → Severity Evaluation → Diagnostic
     ↓                                                            ↓
Temporal Analysis                                            Action Button
     ↓                                                            ↓
Trend Detection                                              Quick Fix
     ↓                                                            ↓
Scenario Trigger                                             Automation
```

---

## The Complete Pipeline

### Stage 1: Pattern Detection (Current)
**What**: Find relevant log lines
**Output**: Matched line + extracted parameters
**Example**: "RTP STATS" pattern matches, extracts `rx_pkts=0`

### Stage 2: Diagnostic Creation (Current)
**What**: Create human-readable diagnostic with severity
**Output**: Diagnostic with message, severity, parameters
**Example**: "⚠️ RTP Statistics: No packets received (rx_pkts=0)"

### Stage 3: Temporal Analysis (In Progress)
**What**: Track parameters over time to detect trends
**Output**: Trend classification (stagnant, increasing, oscillating)
**Example**: "rx_pkts stuck at 0 for 5 consecutive logs (10 seconds)"

### Stage 4: Action Recommendation (TODO)
**What**: Suggest specific actions based on diagnostic
**Output**: List of actionable remediation steps
**Example**: "Check firewall rules for RTP ports (16384-32766)"

### Stage 5: Scenario Execution (TODO)
**What**: Automated or guided troubleshooting workflows
**Output**: Step-by-step resolution with validation
**Example**: "Run network diagnostics → Test audio devices → Restart media engine"

---

## Action Design Philosophy

### Action Types

#### 1. **Investigation Actions**
**Purpose**: Gather more information to diagnose
**Examples**:
- View related log lines
- Show timeline of events
- Display parameter history
- Compare with baseline
- Search for similar issues

#### 2. **Quick Fix Actions**
**Purpose**: One-click remediation for common issues
**Examples**:
- Restart service
- Clear cache
- Refresh connection
- Reset configuration
- Toggle setting

#### 3. **Guided Troubleshooting Actions**
**Purpose**: Step-by-step diagnostic workflows
**Examples**:
- Network connectivity wizard
- Audio device setup
- Certificate validation
- Authentication flow test
- Performance profiler

#### 4. **Documentation Actions**
**Purpose**: Link to relevant help/knowledge
**Examples**:
- Open KB article
- Show troubleshooting guide
- Link to API documentation
- Display configuration reference
- Show best practices

#### 5. **External Tool Actions**
**Purpose**: Launch external tools/utilities
**Examples**:
- Open Wireshark for packet capture
- Launch audio device settings
- Open Windows Event Viewer
- Run system diagnostics
- Open browser for web UI

---

## Pattern-to-Action Mapping

### Example 1: RTP Statistics - No Audio

**Pattern**: RTP STATS
**Diagnostic**: No packets received (rx_pkts=0, tx_pkts=0)
**Temporal Analysis**: Stagnant for 10+ seconds

**Actions**:

```yaml
Investigation Actions:
  - action_id: "view_call_setup_logs"
    label: "View Call Setup Logs"
    description: "Show logs leading up to RTP session start"
    icon: "search"
    scope: "timeline"
    parameters:
      time_window: "-30s to current"
      patterns: ["CALL_EVENT", "audio stream"]
  
  - action_id: "show_rtp_timeline"
    label: "Show RTP Packet Timeline"
    description: "Graph packet counts over time"
    icon: "chart"
    scope: "visualization"
    parameters:
      metric: "rx_pkts, tx_pkts"
      duration: "60s"

Quick Fix Actions:
  - action_id: "restart_audio_engine"
    label: "Restart Audio Engine"
    description: "Restart media processing engine"
    icon: "refresh"
    scope: "system"
    danger_level: "low"
    confirmation_required: true
    command: "restart-service audio-engine"
  
  - action_id: "toggle_audio_device"
    label: "Switch Audio Device"
    description: "Try alternate audio input/output"
    icon: "speaker"
    scope: "system"
    danger_level: "low"

Guided Troubleshooting:
  - action_id: "diagnose_no_audio"
    label: "Run No Audio Diagnostic Wizard"
    description: "Step-by-step troubleshooting for audio issues"
    icon: "wizard"
    scope: "scenario"
    scenario_id: "no_audio_troubleshooting"

Documentation Actions:
  - action_id: "open_rtp_kb"
    label: "RTP Troubleshooting Guide"
    description: "Knowledge base article on RTP issues"
    icon: "book"
    scope: "external"
    url: "https://docs.example.com/rtp-troubleshooting"
  
  - action_id: "open_firewall_guide"
    label: "Firewall Configuration Guide"
    description: "Configure firewall for RTP traffic"
    icon: "shield"
    scope: "external"
    url: "https://docs.example.com/firewall-rtp"
```

---

### Example 2: Authentication Failed

**Pattern**: Authentication failed
**Diagnostic**: User john.doe failed auth (attempt 3/5)
**Temporal Analysis**: 3 failures in 60 seconds

**Actions**:

```yaml
Investigation Actions:
  - action_id: "view_user_auth_history"
    label: "View User Auth History"
    description: "Show all auth attempts for this user"
    parameters:
      user: "john.doe"
      time_window: "last 24h"
  
  - action_id: "check_account_status"
    label: "Check Account Status"
    description: "Verify account is active and not locked"
    api_call: "/api/users/john.doe/status"

Quick Fix Actions:
  - action_id: "reset_auth_cache"
    label: "Clear Auth Cache"
    description: "Clear cached credentials and retry"
    danger_level: "low"
  
  - action_id: "force_password_reset"
    label: "Force Password Reset"
    description: "Send password reset email to user"
    danger_level: "medium"
    confirmation_required: true
    requires_permission: "admin"

Guided Troubleshooting:
  - action_id: "diagnose_auth_failure"
    label: "Authentication Diagnostic Wizard"
    scenario_id: "auth_failure_troubleshooting"

Documentation Actions:
  - action_id: "open_auth_kb"
    label: "Authentication Troubleshooting"
    url: "https://docs.example.com/auth-issues"
```

---

### Example 3: HTTP 500 Response

**Pattern**: HTTP Response
**Diagnostic**: HTTP 500 error for /api/orders
**Temporal Analysis**: 15 500 errors in last 60 seconds (spike)

**Actions**:

```yaml
Investigation Actions:
  - action_id: "view_api_error_rate"
    label: "View API Error Rate"
    description: "Graph error rate over time"
    visualization: "timeseries"
  
  - action_id: "show_stack_trace"
    label: "Show Server Stack Trace"
    description: "View exception details if available"
    search_patterns: ["Exception", "StackTrace"]
  
  - action_id: "check_database_status"
    label: "Check Database Connection"
    description: "Verify database is reachable"
    health_check: "/api/health/database"

Quick Fix Actions:
  - action_id: "restart_api_service"
    label: "Restart API Service"
    danger_level: "high"
    confirmation_required: true
    requires_permission: "operator"
  
  - action_id: "enable_circuit_breaker"
    label: "Enable Circuit Breaker"
    description: "Temporarily disable failing endpoint"
    danger_level: "medium"

Guided Troubleshooting:
  - action_id: "diagnose_api_failure"
    label: "API Failure Diagnostic"
    scenario_id: "api_500_troubleshooting"

Documentation Actions:
  - action_id: "open_api_docs"
    label: "API Documentation"
    url: "https://docs.example.com/api/orders"
```

---

## Scenario Design

### What is a Scenario?

A **scenario** is an automated or guided workflow that combines:
1. **Multiple pattern checks** (across different log lines)
2. **Diagnostic logic** (if X then check Y)
3. **Action sequences** (step-by-step remediation)
4. **Validation** (verify fix worked)
5. **Reporting** (document what was done)

---

### Scenario Structure

```yaml
scenario:
  id: "no_audio_troubleshooting"
  name: "No Audio Troubleshooting Wizard"
  description: "Diagnose and fix no audio issues during calls"
  trigger_patterns: ["rtp_stats_zero_packets"]
  category: "telephony"
  
  steps:
    - step_1:
        name: "Verify Audio Devices"
        type: "check"
        actions:
          - check_audio_input_device
          - check_audio_output_device
        validation:
          - devices_detected: true
          - devices_accessible: true
        on_success: "step_2"
        on_failure: "step_1_remediation"
    
    - step_1_remediation:
        name: "Fix Audio Devices"
        type: "remediation"
        actions:
          - enable_audio_permissions
          - select_default_devices
          - test_audio_devices
        validation:
          - audio_test_passed: true
        on_success: "step_2"
        on_failure: "step_failed"
    
    - step_2:
        name: "Verify Network Connectivity"
        type: "check"
        actions:
          - ping_media_gateway
          - check_firewall_rules
          - verify_rtp_ports_open
        validation:
          - network_reachable: true
          - firewall_allows_rtp: true
        on_success: "step_3"
        on_failure: "step_2_remediation"
    
    - step_2_remediation:
        name: "Fix Network Issues"
        type: "remediation"
        actions:
          - configure_firewall
          - enable_upnp
          - restart_network_stack
        validation:
          - network_test_passed: true
        on_success: "step_3"
        on_failure: "step_failed"
    
    - step_3:
        name: "Verify Codec Support"
        type: "check"
        actions:
          - check_codec_list
          - verify_codec_compatibility
        validation:
          - compatible_codecs_available: true
        on_success: "step_4"
        on_failure: "step_3_remediation"
    
    - step_3_remediation:
        name: "Fix Codec Issues"
        type: "remediation"
        actions:
          - enable_additional_codecs
          - negotiate_codec_fallback
        on_success: "step_4"
        on_failure: "step_failed"
    
    - step_4:
        name: "Restart Media Engine and Test"
        type: "remediation"
        actions:
          - restart_audio_engine
          - wait_for_service_ready
          - initiate_test_call
          - monitor_rtp_stats
        validation:
          - rtp_packets_flowing: true
          - audio_quality_acceptable: true
        on_success: "step_complete"
        on_failure: "step_failed"
    
    - step_complete:
        name: "Issue Resolved"
        type: "success"
        report:
          - summary: "Audio issue resolved"
          - steps_taken: [...]
          - time_to_resolution: "3m 15s"
    
    - step_failed:
        name: "Manual Intervention Required"
        type: "failure"
        report:
          - summary: "Automated remediation failed"
          - failed_at: "step_X"
          - suggested_actions:
              - "Contact network administrator"
              - "Verify UCM configuration"
              - "Check for known bugs"
          - escalation: "create_support_ticket"
```

---

### Scenario Types

#### 1. **Diagnostic Scenarios**
**Purpose**: Identify root cause
**Example**: "Why is my call dropping?"
```yaml
- Check network quality
- Check audio device status
- Check UCM registration
- Check certificate validity
- Generate diagnostic report
```

#### 2. **Remediation Scenarios**
**Purpose**: Fix identified issues
**Example**: "Fix no audio issue"
```yaml
- Restart audio engine
- Reset network stack
- Reconfigure firewall
- Validate fix
- Monitor for recurrence
```

#### 3. **Proactive Scenarios**
**Purpose**: Prevent issues before they occur
**Example**: "Performance degradation detected"
```yaml
- Predict resource exhaustion
- Scale up resources
- Clear caches preemptively
- Restart services during maintenance window
- Validate system health
```

#### 4. **Investigation Scenarios**
**Purpose**: Explore related issues
**Example**: "Call quality investigation"
```yaml
- Collect RTP statistics over time
- Analyze network latency
- Check for concurrent issues
- Compare with baseline
- Generate quality report
```

---

## Pattern Documentation → Action Design Workflow

### Step 1: Document Pattern (Per TODO_PATTERN_CATALOG.md)
```yaml
Pattern: RTP STATS
Parameters: rx_pkts, tx_pkts, session_id
Conditions: rx_pkts=0 OR tx_pkts=0
Common Issues:
  - No audio during call
  - One-way audio
  - Poor call quality
```

### Step 2: Identify Root Causes
```yaml
No Audio Issue:
  Possible Causes:
    1. Audio devices not accessible
    2. Firewall blocking RTP
    3. Codec negotiation failed
    4. Network connectivity issue
    5. Media engine crashed
```

### Step 3: Design Investigation Actions
```yaml
Actions to Gather More Info:
  - Check audio device list
  - View firewall rules
  - Show codec negotiation logs
  - Test network connectivity
  - Verify media engine status
```

### Step 4: Design Remediation Actions
```yaml
Actions to Fix Issue:
  - Restart audio engine
  - Configure firewall
  - Enable fallback codecs
  - Reset network
  - Reinitialize devices
```

### Step 5: Build Scenario Workflow
```yaml
Scenario: "No Audio Troubleshooting"
  1. Diagnose (investigation actions)
  2. Identify root cause
  3. Remediate (fix actions)
  4. Validate (check if fixed)
  5. Monitor (ensure stays fixed)
```

### Step 6: Test and Refine
```yaml
Test Scenario:
  - Run against known no-audio logs
  - Verify correct root cause identified
  - Validate remediation works
  - Measure time to resolution
  - Gather user feedback
```

---

## Action Implementation Architecture

### Action Definition
```typescript
interface Action {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: ActionCategory;
  scope: ActionScope;
  danger_level: DangerLevel;
  requires_confirmation: boolean;
  requires_permission?: string;
  
  // What this action does
  handler: ActionHandler;
  
  // When this action is available
  availability: {
    patterns: string[];           // Available for these patterns
    conditions?: Condition[];     // Only if conditions met
    platform?: string[];          // OS/platform specific
  };
  
  // How to execute
  execution: {
    type: ExecutionType;         // command|api|script|ui|external
    command?: string;
    api_endpoint?: string;
    script?: string;
    parameters?: Parameter[];
  };
  
  // What to do after
  validation?: {
    check: string;               // How to verify success
    success_message: string;
    failure_message: string;
  };
}

enum ActionCategory {
  Investigation = "investigation",
  QuickFix = "quick_fix",
  Guided = "guided",
  Documentation = "documentation",
  External = "external"
}

enum ActionScope {
  LogFile = "log",           // Actions on log file
  System = "system",         // System-level actions
  Service = "service",       // Service management
  Network = "network",       // Network operations
  API = "api",              // API calls
  External = "external"     // External tools
}

enum DangerLevel {
  Safe = "safe",            // Read-only, no side effects
  Low = "low",              // Reversible, low impact
  Medium = "medium",        // Some risk, requires care
  High = "high",            // Significant risk, requires confirmation
  Critical = "critical"     // Production impact, requires authorization
}
```

### Scenario Definition
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  category: string;
  
  // When to suggest this scenario
  triggers: {
    patterns: string[];
    temporal_conditions?: TemporalCondition[];
    severity_threshold?: Severity;
  };
  
  // Workflow steps
  steps: ScenarioStep[];
  
  // Context needed
  required_parameters: string[];
  
  // Execution settings
  execution: {
    mode: ExecutionMode;           // automated|guided|manual
    timeout?: number;
    rollback_on_failure?: boolean;
  };
  
  // Results
  reporting: {
    generate_report: boolean;
    include_logs: boolean;
    create_ticket?: boolean;
  };
}

interface ScenarioStep {
  id: string;
  name: string;
  type: StepType;                  // check|remediation|validation|decision
  actions: Action[];
  
  // Validation criteria
  validation?: {
    checks: ValidationCheck[];
    require_all?: boolean;         // All checks must pass
  };
  
  // Flow control
  on_success: string;              // Next step ID
  on_failure: string;              // Alternative step ID
  on_skip?: string;                // If user skips
  
  // User interaction
  user_prompt?: string;
  show_progress?: boolean;
}

enum ExecutionMode {
  Automated = "automated",     // Run without user interaction
  Guided = "guided",           // Step-by-step with user confirmation
  Manual = "manual"            // User executes, we just guide
}
```

---

## Example: Complete Pattern-to-Scenario Implementation

### Pattern: RTP STATS (Zero Packets)

#### 1. Pattern Definition (from catalog)
```yaml
id: "5ea153adebad09000114ae92"
pattern: "RTP STATS"
extractors:
  - rx_pkts_recv
  - tx_pkts_sent
  - session_id
conditions:
  - rx_pkts_recv = 0 AND tx_pkts_sent = 0 → Warning
```

#### 2. Actions Defined
```typescript
const actions: Action[] = [
  {
    id: "view_audio_devices",
    label: "View Audio Devices",
    category: ActionCategory.Investigation,
    scope: ActionScope.System,
    execution: {
      type: ExecutionType.Command,
      command: "Get-AudioDevice -List"
    }
  },
  {
    id: "restart_audio_engine",
    label: "Restart Audio Engine",
    category: ActionCategory.QuickFix,
    scope: ActionScope.Service,
    danger_level: DangerLevel.Low,
    requires_confirmation: true,
    execution: {
      type: ExecutionType.Command,
      command: "Restart-Service -Name 'Cisco Jabber Audio'"
    },
    validation: {
      check: "Test-ServiceRunning -Name 'Cisco Jabber Audio'",
      success_message: "Audio engine restarted successfully",
      failure_message: "Failed to restart audio engine"
    }
  },
  {
    id: "check_firewall",
    label: "Check RTP Firewall Rules",
    category: ActionCategory.Investigation,
    scope: ActionScope.Network,
    execution: {
      type: ExecutionType.Script,
      script: "check_rtp_firewall.ps1",
      parameters: [
        { name: "ports", value: "16384-32766" }
      ]
    }
  }
];
```

#### 3. Scenario Defined
```typescript
const scenario: Scenario = {
  id: "no_audio_troubleshooting",
  name: "No Audio Troubleshooting Wizard",
  description: "Diagnose and fix no audio/video issues",
  category: "telephony",
  
  triggers: {
    patterns: ["5ea153adebad09000114ae92"],
    temporal_conditions: [
      {
        parameter: "rx_pkts_recv",
        value: 0,
        duration: ">10s",
        occurrences: ">3"
      }
    ]
  },
  
  steps: [
    {
      id: "step_1_check_devices",
      name: "Check Audio Devices",
      type: StepType.Check,
      actions: [actions[0]],  // view_audio_devices
      validation: {
        checks: [
          { condition: "devices_found > 0", message: "Audio devices detected" },
          { condition: "devices_accessible = true", message: "Devices are accessible" }
        ]
      },
      on_success: "step_2_check_network",
      on_failure: "step_1_fix_devices"
    },
    {
      id: "step_1_fix_devices",
      name: "Fix Audio Device Issues",
      type: StepType.Remediation,
      actions: [actions[1]],  // restart_audio_engine
      user_prompt: "Audio devices not accessible. Restart audio engine?",
      on_success: "step_2_check_network",
      on_failure: "step_failed"
    },
    {
      id: "step_2_check_network",
      name: "Check Network/Firewall",
      type: StepType.Check,
      actions: [actions[2]],  // check_firewall
      on_success: "step_complete",
      on_failure: "step_2_fix_network"
    },
    // ... more steps
  ],
  
  execution: {
    mode: ExecutionMode.Guided,
    timeout: 300000,  // 5 minutes
    rollback_on_failure: false
  },
  
  reporting: {
    generate_report: true,
    include_logs: true,
    create_ticket: false
  }
};
```

#### 4. UI Integration
```typescript
// In diagnostic hover/card
if (diagnostic.pattern_id === "5ea153adebad09000114ae92" && 
    diagnostic.data.extracted_parameters.rx_pkts === "0") {
  
  // Show quick actions
  showQuickActions([
    actions[0],  // View devices
    actions[1],  // Restart engine
    actions[2]   // Check firewall
  ]);
  
  // Show scenario button
  showScenarioButton({
    label: "Run No Audio Wizard",
    scenario: scenario,
    icon: "wizard"
  });
}
```

---

## Implementation Roadmap

### Phase 1: Action Framework (Current Sprint)
- [ ] Define action data structures
- [ ] Implement action registry
- [ ] Create action execution engine
- [ ] Build action UI components
- [ ] Add actions to diagnostics

### Phase 2: Basic Actions (Next Sprint)
- [ ] Implement 20 high-value investigation actions
- [ ] Implement 10 quick-fix actions
- [ ] Add documentation actions
- [ ] Create action permission system
- [ ] Add action analytics

### Phase 3: Scenario Framework (Sprint 3)
- [ ] Define scenario data structures
- [ ] Implement scenario execution engine
- [ ] Build scenario UI (wizard interface)
- [ ] Add scenario state management
- [ ] Create scenario templates

### Phase 4: Core Scenarios (Sprint 4-5)
- [ ] No Audio troubleshooting scenario
- [ ] Authentication failure scenario
- [ ] API error scenario
- [ ] Network connectivity scenario
- [ ] Performance degradation scenario

### Phase 5: Advanced Features (Sprint 6+)
- [ ] Automated scenario execution
- [ ] Scenario chaining (one scenario triggers another)
- [ ] Custom scenario builder
- [ ] Scenario sharing/marketplace
- [ ] Machine learning for scenario recommendations

---

## Success Metrics

### Action Metrics
- **Action Usage Rate**: % of diagnostics where user clicks action
- **Action Success Rate**: % of actions that complete successfully
- **Time Saved**: Minutes saved vs manual troubleshooting
- **User Satisfaction**: Rating of action helpfulness

### Scenario Metrics
- **Scenario Completion Rate**: % of scenarios completed vs abandoned
- **Resolution Rate**: % of issues resolved by scenario
- **Time to Resolution**: Average time to complete scenario
- **Step Success Rate**: % of steps that succeed first try

### Business Impact
- **MTTR Reduction**: Mean time to resolution improvement
- **Support Ticket Reduction**: Fewer escalations needed
- **User Self-Service**: % of issues resolved without support
- **Knowledge Capture**: Growth of action/scenario library

---

## Summary

This framework creates a powerful connection between pattern detection and actionable remediation:

```
Pattern (WHAT is happening)
   ↓
Diagnostic (WHY it matters)
   ↓
Temporal Analysis (HOW it's changing)
   ↓
Action (WHAT can be done about it)
   ↓
Scenario (HOW to fix it step-by-step)
   ↓
Resolution (Issue RESOLVED)
```

By systematically documenting patterns (TODO_PATTERN_CATALOG.md) and designing corresponding actions and scenarios, we create:

1. **Intelligence**: Know what every log line means
2. **Context**: Understand patterns over time
3. **Guidance**: Show users what to do
4. **Automation**: Fix common issues automatically
5. **Learning**: Build knowledge base of solutions

**Next Steps**:
1. Complete pattern documentation (TODO_PATTERN_CATALOG.md)
2. Design actions for top 20 patterns
3. Build first 5 scenarios
4. Test with real users
5. Iterate and expand

---

**Last Updated**: 2026-02-17
**Status**: 📋 Framework Defined - Implementation TODO
**Dependencies**: TODO_PATTERN_CATALOG.md, TEMPORAL_ANALYSIS_DESIGN.md