# Configuration Examples: Pattern Overrides, Signatures, Actions, and Scenarios

**Purpose**: Practical examples for configuring the hybrid normalization system  
**Audience**: Developers, DevOps, Network Engineers  
**Last Updated**: 2024-02-19  

---

## Table of Contents

1. [Base Pattern Examples](#base-pattern-examples)
2. [Raw Override Examples](#raw-override-examples)
3. [Normalized Override Examples](#normalized-override-examples)
4. [Vendor-Specific Override Examples](#vendor-specific-override-examples)
5. [Signature Examples](#signature-examples)
6. [Action Examples](#action-examples)
7. [Scenario Examples](#scenario-examples)
8. [Complete Workflow Examples](#complete-workflow-examples)

---

## Base Pattern Examples

Base patterns define **WHAT** to detect, vendor-agnostic.

### Example 1: SIP INVITE (Base)

**File**: `patterns/base/sip_invite.yaml`

```yaml
pattern_name: "sip_invite"
namespace: "sip"
description: "SIP call initiation message (RFC 3261 §13.1)"

# Pattern identification
id: "sip.invite"
version: "1.0"

# What we're looking for
signature:
  type: "sip_message"
  method: "INVITE"
  components:
    - name: "method_line"
      description: "INVITE request line"
      required: true
    
    - name: "call_id_header"
      description: "Call-ID header"
      required: true
    
    - name: "from_header"
      description: "From header"
      required: true
    
    - name: "to_header"
      description: "To header"
      required: true

# Fields we want to extract (vendor-agnostic names)
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
  
  - field: "source_ip"
    description: "Source IP address"
    type: "string"
    required: false
  
  - field: "destination_ip"
    description: "Destination IP address"
    type: "string"
    required: false
  
  - field: "via_transport"
    description: "Transport protocol (UDP/TCP/TLS)"
    type: "string"
    required: false

# When should this be normalized?
normalization:
  strategy: "adaptive"
  trigger: "on_multi_vendor"
  reason: "SIP logs vary significantly across Cisco products"

# Metadata
tags: ["voip", "sip", "call_setup", "rfc3261"]
category: "sip"
severity: "info"
```

### Example 2: SIP 200 OK Response (Base)

**File**: `patterns/base/sip_200_ok.yaml`

```yaml
pattern_name: "sip_200_ok"
namespace: "sip"
description: "SIP successful response (RFC 3261 §21.2)"

id: "sip.200_ok"
version: "1.0"

signature:
  type: "sip_message"
  status_code: 200
  status_text: "OK"
  components:
    - name: "status_line"
      description: "SIP/2.0 200 OK"
      required: true
    
    - name: "call_id_header"
      required: true
    
    - name: "to_tag"
      description: "To tag must be present in 200 OK"
      required: true

extract:
  - field: "call_id"
    type: "string"
    required: true
  
  - field: "to_tag"
    description: "To tag establishes dialog"
    type: "string"
    required: true
  
  - field: "contact"
    description: "Contact header for routing"
    type: "string"
    required: false
  
  - field: "sdp_offered_codecs"
    description: "Audio codecs in SDP"
    type: "array"
    required: false

normalization:
  strategy: "adaptive"
  trigger: "on_multi_vendor"

tags: ["voip", "sip", "response", "success"]
category: "sip"
severity: "info"
```

### Example 3: Authentication Failure (Base)

**File**: `patterns/base/auth_failure.yaml`

```yaml
pattern_name: "auth_failure"
namespace: "security"
description: "Authentication failure events"

id: "security.auth_failure"
version: "1.0"

signature:
  type: "authentication_event"
  result: "failure"
  components:
    - name: "auth_failed_keyword"
      required: true
    
    - name: "username"
      required: true

extract:
  - field: "username"
    type: "string"
    required: true
  
  - field: "source_ip"
    type: "string"
    required: false
  
  - field: "reason"
    description: "Failure reason"
    type: "string"
    required: false
  
  - field: "timestamp"
    type: "datetime"
    required: true

normalization:
  strategy: "always"
  trigger: "always"
  reason: "Security events must be normalized for correlation"

tags: ["security", "authentication", "failure"]
category: "security"
severity: "warning"
```

---

## Raw Override Examples

Raw overrides define **HOW** to extract from raw logs using regex.

### Example 1: SIP INVITE (Raw Extraction)

**File**: `patterns/overrides/raw/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
override_type: "extraction_raw"

extraction:
  mode: "raw_regex"
  
  # Quick match for performance (check this first)
  quick_match:
    pattern: "INVITE sip:"
    confidence: 0.9
  
  # Field extraction rules
  fields:
    call_id:
      pattern: "Call-ID:\\s*([^\\r\\n]+)"
      group: 1
      transform:
        - type: "trim"
      optional: false
    
    from_uri:
      # Try with angle brackets first, fallback to bare URI
      pattern: "From:.*?<sip:([^>]+)>|From:\\s*sip:([^;\\s]+)"
      group: [1, 2]  # Try group 1, then group 2
      transform:
        - type: "trim"
        - type: "to_lowercase"
      optional: false
    
    to_uri:
      pattern: "To:.*?<sip:([^>]+)>|To:\\s*sip:([^;\\s]+)"
      group: [1, 2]
      transform:
        - type: "trim"
        - type: "to_lowercase"
      optional: false
    
    source_ip:
      # Extract from Via header
      pattern: "Via:.*?([0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}):\\d+"
      group: 1
      optional: true
    
    destination_ip:
      # Extract from Request-URI
      pattern: "INVITE sip:[^@]*@([0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})"
      group: 1
      optional: true
    
    via_transport:
      # Extract transport from Via header
      pattern: "Via:\\s*SIP/2.0/(UDP|TCP|TLS)"
      group: 1
      transform:
        - type: "to_uppercase"
      optional: true

# Performance hints
performance:
  cache_compiled_regex: true
  estimated_cost_ms: 5
```

### Example 2: SIP 200 OK (Raw Extraction)

**File**: `patterns/overrides/raw/sip_200_ok.yaml`

```yaml
extends: "base.sip_200_ok"
override_type: "extraction_raw"

extraction:
  mode: "raw_regex"
  
  quick_match:
    pattern: "SIP/2.0 200 OK"
    confidence: 0.95
  
  fields:
    call_id:
      pattern: "Call-ID:\\s*([^\\r\\n]+)"
      group: 1
      transform:
        - type: "trim"
    
    to_tag:
      pattern: "To:.*?;tag=([^;\\s]+)"
      group: 1
      optional: false
    
    contact:
      pattern: "Contact:\\s*<([^>]+)>"
      group: 1
      optional: true
    
    sdp_offered_codecs:
      # Extract codecs from m= lines
      pattern: "m=audio\\s+\\d+\\s+RTP/AVP\\s+([\\d\\s]+)"
      group: 1
      transform:
        - type: "split"
          delimiter: " "
      optional: true

performance:
  estimated_cost_ms: 5
```

### Example 3: Authentication Failure (Raw Extraction)

**File**: `patterns/overrides/raw/auth_failure.yaml`

```yaml
extends: "base.auth_failure"
override_type: "extraction_raw"

extraction:
  mode: "raw_regex"
  
  quick_match:
    pattern: "(?i)(authentication|auth|login)\\s+(failed|failure|denied)"
    confidence: 0.85
  
  fields:
    username:
      pattern: "(?:user|username|account)[:\\s=]+([\\w\\.@-]+)"
      group: 1
      transform:
        - type: "trim"
        - type: "to_lowercase"
      optional: false
    
    source_ip:
      pattern: "(?:from|source|ip|address)[:\\s=]+([0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3})"
      group: 1
      optional: true
    
    reason:
      pattern: "(?:reason|cause|error)[:\\s=]+([^\\n]+)"
      group: 1
      transform:
        - type: "trim"
      optional: true
    
    timestamp:
      # ISO 8601 or common formats
      pattern: "(\\d{4}-\\d{2}-\\d{2}[T\\s]\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)"
      group: 1
      optional: false

performance:
  estimated_cost_ms: 8
```

---

## Normalized Override Examples

Normalized overrides define **HOW** to extract from normalized events using JSON paths.

### Example 1: SIP INVITE (Normalized Extraction)

**File**: `patterns/overrides/normalized/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
override_type: "extraction_normalized"

extraction:
  mode: "normalized_path"
  
  # Quick check on normalized event
  quick_match:
    field: "event_type"
    equals: "sip_invite"
  
  fields:
    call_id:
      path: "sip_message.headers.call_id"
      optional: false
    
    from_uri:
      path: "sip_message.headers.from.uri"
      optional: false
    
    to_uri:
      path: "sip_message.headers.to.uri"
      optional: false
    
    source_ip:
      path: "network.source_ip"
      optional: true
    
    destination_ip:
      path: "network.destination_ip"
      optional: true
    
    via_transport:
      path: "sip_message.headers.via[0].transport"
      optional: true

# Performance notes
performance:
  estimated_cost_ms: 1  # Direct field access, very fast
```

### Example 2: SIP 200 OK (Normalized Extraction)

**File**: `patterns/overrides/normalized/sip_200_ok.yaml`

```yaml
extends: "base.sip_200_ok"
override_type: "extraction_normalized"

extraction:
  mode: "normalized_path"
  
  quick_match:
    field: "event_type"
    equals: "sip_200_ok"
  
  fields:
    call_id:
      path: "sip_message.headers.call_id"
    
    to_tag:
      path: "sip_message.headers.to.tag"
    
    contact:
      path: "sip_message.headers.contact"
    
    sdp_offered_codecs:
      path: "sip_message.sdp.media[0].formats"

performance:
  estimated_cost_ms: 1
```

---

## Vendor-Specific Override Examples

Vendor overrides handle quirks and extract vendor-specific metadata.

### Example 1: CUCM SIP INVITE

**File**: `patterns/overrides/vendors/cisco_cucm/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
extends_override: "raw.sip_invite"
override_type: "vendor_specific"
vendor: "cisco_cucm"

extraction:
  mode: "raw_regex"
  
  # CUCM-specific context: pipe-delimited metadata
  context:
    metadata_section:
      pattern: "^[^|]*\\|([^\\n]+)"
      parse: "pipe_delimited"
      fields:
        - protocol
        - app_id
        - local_addr
        - remote_addr
        - node_name
  
  fields:
    # Inherit standard SIP field extractions
    call_id:
      inherit: true
    
    from_uri:
      inherit: true
    
    to_uri:
      inherit: true
    
    # CUCM provides better IP info in metadata
    source_ip:
      source: "context.metadata_section"
      key: "remote_addr"
      pattern: "RemoteAddr=([0-9.]+):\\d+"
      group: 1
      optional: true
    
    destination_ip:
      source: "context.metadata_section"
      key: "local_addr"
      pattern: "LocalAddr=([0-9.]+):\\d+"
      group: 1
      optional: true
    
    via_transport:
      source: "context.metadata_section"
      key: "protocol"
      pattern: "SIP(Tcp|Udp|Tls)"
      group: 1
      transform:
        - type: "to_uppercase"
      optional: true
    
    # CUCM-specific fields
    cucm_node:
      source: "context.metadata_section"
      key: "node_name"
      pattern: "\\|([^|]+)\\|(?:Received|Sent)"
      group: 1
      optional: true

apply_when:
  vendor_detected: "cisco_cucm"

performance:
  estimated_cost_ms: 12
```

### Example 2: Cisco Unity Connection (CUC) SIP INVITE

**File**: `patterns/overrides/vendors/cisco_cuc/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
extends_override: "raw.sip_invite"
override_type: "vendor_specific"
vendor: "cisco_cuc"

extraction:
  mode: "raw_regex"
  
  fields:
    # CUC prefixes Call-IDs with "vm-"
    call_id:
      pattern: "Call-ID:\\s*(?:vm-)?([^\\r\\n]+)"
      group: 1
      transform:
        - type: "remove_prefix"
          prefix: "vm-"
      optional: false
    
    # Other fields inherit
    from_uri:
      inherit: true
    
    to_uri:
      inherit: true
    
    source_ip:
      inherit: true
    
    destination_ip:
      inherit: true
    
    # CUC-specific: extract mailbox number
    cuc_mailbox:
      pattern: "To:.*?sip:(\\d+)@"
      group: 1
      optional: true

apply_when:
  vendor_detected: "cisco_cuc"

performance:
  estimated_cost_ms: 8
```

### Example 3: Cisco Jabber SIP INVITE

**File**: `patterns/overrides/vendors/cisco_jabber/sip_invite.yaml`

```yaml
extends: "base.sip_invite"
extends_override: "raw.sip_invite"
override_type: "vendor_specific"
vendor: "cisco_jabber"

extraction:
  mode: "raw_regex"
  
  # Jabber has context lines before SIP message
  context:
    message_metadata:
      pattern: "(Direction|Source|Destination):\\s*([^\\n]+)"
      parse: "key_value"
  
  fields:
    # Inherit SIP field extractions
    call_id:
      inherit: true
    
    from_uri:
      inherit: true
    
    to_uri:
      inherit: true
    
    # Jabber provides explicit source/destination
    source_ip:
      source: "context.message_metadata"
      key: "Source"
      pattern: "([0-9.]+):\\d+"
      group: 1
      optional: true
    
    destination_ip:
      source: "context.message_metadata"
      key: "Destination"
      pattern: "([0-9.]+):\\d+"
      group: 1
      optional: true
    
    # Jabber-specific: direction
    jabber_direction:
      source: "context.message_metadata"
      key: "Direction"
      pattern: "(Incoming|Outgoing)"
      group: 1
      optional: true

apply_when:
  vendor_detected: "cisco_jabber"

performance:
  estimated_cost_ms: 10
```

---

## Signature Examples

Signatures verify pattern matches with confidence scoring.

### Example 1: SIP INVITE Signature

**File**: `patterns/base/sip_invite.yaml` (signature section)

```yaml
signature:
  name: "sip_invite"
  pattern_type: "sip_request"
  
  # For raw logs
  raw_components:
    - name: "method_line"
      description: "INVITE request line"
      pattern: "INVITE sip:"
      confidence: 0.95
      required: true
    
    - name: "call_id_header"
      description: "Call-ID header present"
      pattern: "Call-ID:\\s*[^\\r\\n]+"
      confidence: 0.9
      required: true
    
    - name: "from_header"
      description: "From header present"
      pattern: "From:.*?sip:"
      confidence: 0.8
      required: true
    
    - name: "to_header"
      description: "To header present"
      pattern: "To:.*?sip:"
      confidence: 0.8
      required: true
    
    - name: "via_header"
      description: "Via header present"
      pattern: "Via:\\s*SIP/2.0"
      confidence: 0.7
      required: false
  
  # For normalized events
  normalized_components:
    - name: "event_type"
      field: "event_type"
      equals: "sip_invite"
      confidence: 1.0
      required: true
    
    - name: "method"
      field: "sip_message.method"
      equals: "INVITE"
      confidence: 1.0
      required: true
    
    - name: "has_call_id"
      field: "sip_message.headers.call_id"
      exists: true
      confidence: 1.0
      required: true
  
  # Scoring
  min_components: 3
  confidence_threshold: 0.85
```

### Example 2: Brute Force Attack Signature

**File**: `patterns/base/brute_force_attack.yaml`

```yaml
signature:
  name: "brute_force_attack"
  pattern_type: "security_threat"
  
  raw_components:
    - name: "failed_login_keyword"
      pattern: "(?i)(authentication|login)\\s+(failed|failure|denied)"
      confidence: 0.9
      required: true
    
    - name: "username_present"
      pattern: "(?:user|username|account)[:\\s=]+[\\w\\.@-]+"
      confidence: 0.8
      required: true
    
    - name: "source_ip_present"
      pattern: "(?:from|source|ip)[:\\s=]+[0-9.]+"
      confidence: 0.7
      required: false
    
    - name: "rapid_succession"
      description: "Multiple failures in short time"
      temporal: true
      window_seconds: 60
      count: 5
      confidence: 0.95
      required: true
  
  normalized_components:
    - name: "auth_failure_event"
      field: "event_type"
      matches: "auth_failure|login_denied"
      confidence: 1.0
      required: true
    
    - name: "has_username"
      field: "username"
      exists: true
      confidence: 1.0
      required: true
  
  min_components: 3
  confidence_threshold: 0.8
```

---

## Action Examples

Actions define what to do when patterns match.

### Example 1: Extract and Track Call

**File**: `patterns/base/sip_invite.yaml` (actions section)

```yaml
actions:
  - name: "extract_call_info"
    type: "extraction"
    description: "Extract call setup information"
    execute: "always"
    outputs:
      - call_id
      - from_uri
      - to_uri
      - source_ip
      - destination_ip
  
  - name: "start_call_tracking"
    type: "state_management"
    description: "Begin tracking this call session"
    execute: "always"
    state:
      create_session:
        key: "{{ call_id }}"
        type: "sip_call"
        initial_state: "invite_sent"
        initial_data:
          caller: "{{ from_uri }}"
          callee: "{{ to_uri }}"
          started_at: "{{ timestamp }}"
        expires_after: "5m"
  
  - name: "log_call_attempt"
    type: "logging"
    description: "Log all call attempts for audit"
    execute: "always"
    log:
      level: "info"
      message: "SIP INVITE: {{ from_uri }} -> {{ to_uri }}"
      structured:
        call_id: "{{ call_id }}"
        caller: "{{ from_uri }}"
        callee: "{{ to_uri }}"
        source_ip: "{{ source_ip }}"
        timestamp: "{{ timestamp }}"
  
  - name: "alert_on_suspicious_destination"
    type: "alert"
    description: "Alert if call to suspicious number"
    execute: "conditional"
    condition:
      field: "to_uri"
      matches: "^sip:(900|976).*"  # Premium rate numbers
    alert:
      severity: "medium"
      message: "Call to premium rate number detected: {{ to_uri }}"
      tags: ["fraud_risk", "premium_rate", "voip"]
      context:
        call_id: "{{ call_id }}"
        caller: "{{ from_uri }}"
        callee: "{{ to_uri }}"
  
  - name: "increment_call_counter"
    type: "metrics"
    description: "Track call volume"
    execute: "always"
    metrics:
      - name: "sip_invites_total"
        type: "counter"
        increment: 1
        labels:
          vendor: "{{ vendor_type }}"
          transport: "{{ via_transport }}"
```

### Example 2: Authentication Failure Actions

**File**: `patterns/base/auth_failure.yaml` (actions section)

```yaml
actions:
  - name: "extract_auth_details"
    type: "extraction"
    execute: "always"
    outputs:
      - username
      - source_ip
      - reason
      - timestamp
  
  - name: "track_failed_attempts"
    type: "state_management"
    description: "Track failed attempts by IP"
    execute: "always"
    state:
      update_session:
        key: "failed_auth_{{ source_ip }}"
        increment_counter: "failed_attempts"
        add_to_list:
          field: "usernames_tried"
          value: "{{ username }}"
        update_timestamp: "last_attempt"
        expires_after: "10m"
  
  - name: "log_failure"
    type: "logging"
    execute: "always"
    log:
      level: "warning"
      message: "Authentication failed for {{ username }} from {{ source_ip }}"
      structured:
        username: "{{ username }}"
        source_ip: "{{ source_ip }}"
        reason: "{{ reason }}"
        timestamp: "{{ timestamp }}"
  
  - name: "alert_on_threshold"
    type: "alert"
    execute: "conditional"
    condition:
      expression: "state.failed_auth_{{ source_ip }}.failed_attempts >= 5"
    alert:
      severity: "high"
      message: "Potential brute force: {{ failed_attempts }} failures from {{ source_ip }}"
      tags: ["security", "brute_force", "authentication"]
      context:
        source_ip: "{{ source_ip }}"
        failed_attempts: "{{ failed_attempts }}"
        usernames_tried: "{{ usernames_tried }}"
  
  - name: "update_security_metrics"
    type: "metrics"
    execute: "always"
    metrics:
      - name: "auth_failures_total"
        type: "counter"
        increment: 1
        labels:
          username: "{{ username }}"
          source_ip: "{{ source_ip }}"
```

### Example 3: Performance Monitoring Action

**File**: `patterns/base/sip_200_ok.yaml` (actions section)

```yaml
actions:
  - name: "calculate_setup_time"
    type: "state_management"
    execute: "always"
    state:
      update_session:
        key: "{{ call_id }}"
        new_state: "answered"
        calculate_duration:
          field: "setup_duration_ms"
          from_state_timestamp: "invite_sent"
          to: "{{ timestamp }}"
  
  - name: "alert_on_slow_setup"
    type: "alert"
    execute: "conditional"
    condition:
      expression: "state.{{ call_id }}.setup_duration_ms > 5000"
    alert:
      severity: "medium"
      message: "Slow call setup: {{ setup_duration_ms }}ms for call {{ call_id }}"
      tags: ["performance", "voip", "latency"]
  
  - name: "record_setup_time_metric"
    type: "metrics"
    execute: "always"
    metrics:
      - name: "sip_call_setup_duration_ms"
        type: "histogram"
        value: "{{ setup_duration_ms }}"
        labels:
          vendor: "{{ vendor_type }}"
          transport: "{{ via_transport }}"
```

---

## Scenario Examples

Scenarios track multi-step sequences.

### Example 1: Successful SIP Call Setup

**File**: `scenarios/successful_call_setup.yaml`

```yaml
scenario_name: "successful_call_setup"
description: "Complete SIP call setup sequence"
category: "voip"
version: "1.0"

# This scenario requires normalization for multi-vendor correlation
normalization:
  required: true
  reason: "Call-ID must be correlated across vendors"

# Multi-step sequence
sequence:
  - step: "invite"
    pattern: "sip_invite"
    description: "Call initiation"
    
    extract:
      - call_id: "session_call_id"
      - from_uri: "session_caller"
      - to_uri: "session_callee"
      - timestamp: "session_start_time"
    
    actions:
      - "start_call_tracking"
      - "log_call_attempt"
      - "increment_call_counter"
    
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
            set_field:
              name: "trying_at"
              value: "{{ timestamp }}"
    
    transition: "wait_for_ringing"
  
  - step: "ringing"
    pattern: "sip_180_ringing"
    description: "Phone is ringing"
    
    within: "2s"
    
    match:
      call_id: "{{ session_call_id }}"
    
    actions:
      - name: "update_call_state"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            new_state: "ringing"
            set_field:
              name: "ringing_at"
              value: "{{ timestamp }}"
    
    transition: "wait_for_answer"
  
  - step: "answered"
    pattern: "sip_200_ok"
    description: "Call answered"
    
    within: "30s"
    
    match:
      call_id: "{{ session_call_id }}"
    
    actions:
      - name: "update_call_state"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            new_state: "answered"
            set_field:
              name: "answered_at"
              value: "{{ timestamp }}"
      
      - name: "alert_on_quick_answer"
        type: "alert"
        execute: "conditional"
        condition:
          expression: "step.answered.timestamp - step.ringing.timestamp < 500ms"
        alert:
          severity: "low"
          message: "Call answered suspiciously fast - possible automated system"
          context:
            call_id: "{{ session_call_id }}"
            answer_time_ms: "{{ step.answered.timestamp - step.ringing.timestamp }}"
    
    transition: "wait_for_ack"
  
  - step: "ack"
    pattern: "sip_ack"
    description: "Call establishment confirmed"
    
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
            calculate_duration:
              field: "setup_duration_ms"
              from: "{{ session_start_time }}"
              to: "{{ timestamp }}"

# Actions when scenario completes successfully
on_complete:
  actions:
    - name: "log_successful_setup"
      type: "logging"
      log:
        level: "info"
        message: "Call setup completed successfully in {{ setup_duration_ms }}ms"
        structured:
          scenario: "successful_call_setup"
          call_id: "{{ session_call_id }}"
          caller: "{{ session_caller }}"
          callee: "{{ session_callee }}"
          setup_duration_ms: "{{ setup_duration_ms }}"
    
    - name: "update_metrics"
      type: "metrics"
      metrics:
        - name: "sip_calls_established_total"
          type: "counter"
          increment: 1
          labels:
            scenario: "successful_call_setup"
        
        - name: "sip_call_setup_duration_ms"
          type: "histogram"
          value: "{{ setup_duration_ms }}"
          buckets: [100, 500, 1000, 2000, 5000, 10000]

# Actions if scenario times out
on_timeout:
  actions:
    - name: "alert_incomplete_setup"
      type: "alert"
      alert:
        severity: "high"
        message: "Call setup incomplete - stuck at step {{ last_completed_step }}"
        context:
          call_id: "{{ session_call_id }}"
          completed_steps: "{{ completed_steps }}"
          last_step: "{{ last_completed_step }}"
          missing_steps: "{{ missing_steps }}"
    
    - name: "cleanup_session"
      type: "state_management"
      state:
        delete_session:
          key: "{{ session_call_id }}"

# Actions on error
on_error:
  actions:
    - name: "log_error"
      type: "logging"
      log:
        level: "error"
        message: "Call setup failed: {{ error_message }}"
    
    - name: "cleanup_session"
      type: "state_management"
      state:
        delete_session:
          key: "{{ session_call_id }}"

# Overall timeout
timeout: "60s"
```

### Example 2: Multi-Vendor Call Routing

**File**: `scenarios/cross_vendor_call.yaml`

```yaml
scenario_name: "cross_vendor_call"
description: "SIP call traversing multiple Cisco products (CUBE → CUP Proxy → CUCM)"
category: "voip_multi_vendor"
version: "1.0"

normalization:
  required: true
  reason: "Must correlate Call-ID across CUBE, CUP, and CUCM logs"

sequence:
  - step: "invite_at_cube"
    pattern: "sip_invite"
    vendor: "cisco_cube"
    description: "Call enters via CUBE gateway from external network"
    
    extract:
      - call_id: "session_call_id"
      - from_uri: "session_caller"
      - to_uri: "session_callee"
      - source_ip: "external_ip"
      - timestamp: "cube_timestamp"
    
    actions:
      - name: "track_external_call"
        type: "state_management"
        state:
          create_session:
            key: "{{ session_call_id }}"
            type: "external_call"
            initial_data:
              entry_point: "cube"
              external_ip: "{{ external_ip }}"
              caller: "{{ session_caller }}"
              callee: "{{ session_callee }}"
            hops: []
  
  - step: "invite_at_cup"
    pattern: "sip_invite"
    vendor: "cisco_cup_proxy"
    description: "Call forwarded through CUP proxy"
    
    within: "500ms"
    
    match:
      call_id: "{{ session_call_id }}"
    
    extract:
      - timestamp: "cup_timestamp"
    
    actions:
      - name: "track_cup_traversal"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            append_to_array:
              field: "hops"
              value:
                component: "cup_proxy"
                timestamp: "{{ cup_timestamp }}"
                latency_from_previous_ms: "{{ cup_timestamp - cube_timestamp }}"
  
  - step: "invite_at_cucm"
    pattern: "sip_invite"
    vendor: "cisco_cucm"
    description: "Call reaches internal CUCM"
    
    within: "200ms"
    
    match:
      call_id: "{{ session_call_id }}"
    
    extract:
      - destination_ip: "internal_destination"
      - timestamp: "cucm_timestamp"
    
    actions:
      - name: "track_cucm_delivery"
        type: "state_management"
        state:
          update_session:
            key: "{{ session_call_id }}"
            append_to_array:
              field: "hops"
              value:
                component: "cucm"
                timestamp: "{{ cucm_timestamp }}"
                latency_from_previous_ms: "{{ cucm_timestamp - cup_timestamp }}"
                internal_destination: "{{ internal_destination }}"
      
      - name: "alert_on_slow_routing"
        type: "alert"
        execute: "conditional"
        condition:
          expression: "cucm_timestamp - cube_timestamp > 1000"
        alert:
          severity: "medium"
          message: "Slow SIP routing detected: {{ routing_time }}ms from CUBE to CUCM"
          context:
            call_id: "{{ session_call_id }}"
            routing_time_ms: "{{ cucm_timestamp - cube_timestamp }}"
            hops: "{{ hops }}"

on_complete:
  actions:
    - name: "log_multi_vendor_call"
      type: "logging"
      log:
        level: "info"
        message: "Multi-vendor call successfully routed"
        structured:
          call_id: "{{ session_call_id }}"
          caller: "{{ session_caller }}"
          callee: "{{ session_callee }}"
          entry_point: "{{ external_ip }}"
          hops: "{{ hops }}"
          total_routing_time_ms: "{{ cucm_timestamp - cube_timestamp }}"
    
    - name: "update_routing_metrics"
      type: "metrics"
      metrics:
        - name: "multi_vendor_calls_total"
          type: "counter"
          increment: 1
          labels:
            path: "cube_cup_cucm"
        
        - name: "routing_latency_ms"
          type: "histogram"
          value: "{{ cucm_timestamp - cube_timestamp }}"
          labels:
            source: "cube"
            destination: "cucm"
          buckets: [100, 500, 1000, 2000, 5000]

timeout: "5s"
```

### Example 3: Brute Force Detection Scenario

**File**: `scenarios/brute_force_detection.yaml`

```yaml
scenario_name: "brute_force_detection"
description: "Detect brute force authentication attempts"
category: "security"
version: "1.0"

normalization:
  required: true
  reason: "Normalize auth failures across different systems"

sequence:
  - step: "first_failure"
    pattern: "auth_failure"
    description: "Initial authentication failure"
    
    extract:
      - source_ip: "attacker_ip"
      - username: "attempted_username"
      - timestamp: "first_attempt_time"
    
    actions:
      - name: "start_tracking"
        type: "state_management"
        state:
          create_session:
            key: "brute_force_{{ attacker_ip }}"
            type: "security_incident"
            initial_data:
              source_ip: "{{ attacker_ip }}"
              first_attempt: "{{ first_attempt_time }}"
              attempt_count: 1
              usernames: ["{{ attempted_username }}"]
    
    transition: "watch_for_more_failures"
  
  - step: "additional_failures"
    pattern: "auth_failure"
    description: "Subsequent failures from same IP"
    
    within: "60s"
    repeat: true
    max_repeats: 10
    
    match:
      source_ip: "{{ attacker_ip }}"
    
    extract:
      - username: "attempted_username"
    
    actions:
      - name: "increment_attempts"
        type: "state_management"
        state:
          update_session:
            key: "brute_force_{{ attacker_ip }}"
            increment: "attempt_count"
            append_to_array:
              field: "usernames"
              value: "{{ attempted_username }}"
              unique: true
      
      - name: "alert_on_threshold"
        type: "alert"
        execute: "conditional"
        condition:
          expression: "state.brute_force_{{ attacker_ip }}.attempt_count >= 5"
        alert:
          severity: "high"
          message: "Brute force attack detected: {{ attempt_count }} failures from {{ attacker_ip }}"
          tags: ["security", "brute_force", "authentication"]
          context:
            source_ip: "{{ attacker_ip }}"
            attempt_count: "{{ attempt_count }}"
            usernames_tried: "{{ usernames }}"
            duration_seconds: "{{ timestamp - first_attempt_time }}"

on_complete:
  actions:
    - name: "log_incident"
      type: "logging"
      log:
        level: "warning"
        message: "Brute force incident: {{ attempt_count }} failures from {{ attacker_ip }}"
        structured:
          incident_type: "brute_force"
          source_ip: "{{ attacker_ip }}"
          total_attempts: "{{ attempt_count }}"
          unique_usernames: "{{ usernames | length }}"
          duration_seconds: "{{ timestamp - first_attempt_time }}"
    
    - name: "update_security_metrics"
      type: "metrics"
      metrics:
        - name: "brute_force_incidents_total"
          type: "counter"
          increment: 1
        
        - name: "brute_force_attempt_count"
          type: "histogram"
          value: "{{ attempt_count }}"

timeout: "5m"
```

---

## Complete Workflow Examples

### Example: End-to-End SIP Call Analysis

This shows how base patterns, overrides, signatures, actions, and scenarios work together:

**1. Base Pattern** → What to detect  
**2. Raw Override** → How to extract from raw logs  
**3. Vendor Override** → Vendor-specific quirks  
**4. Signature** → Verify match quality  
**5. Actions** → What to do on match  
**6. Scenario** → Track multi-step flow  

```yaml
# Step 1: Base pattern defines WHAT (patterns/base/sip_invite.yaml)
pattern_name: "sip_invite"
extract: [call_id, from_uri, to_uri]
tags: ["voip", "sip"]

# Step 2: Raw override defines HOW for raw logs (patterns/overrides/raw/sip_invite.yaml)
extraction:
  mode: "raw_regex"
  fields:
    call_id:
      pattern: "Call-ID:\\s*([^\\r\\n]+)"

# Step 3: Vendor override handles CUCM quirks (patterns/overrides/vendors/cisco_cucm/sip_invite.yaml)
extraction:
  context:
    metadata_section:
      parse: "pipe_delimited"
  fields:
    source_ip:
      source: "context.metadata_section"
      key: "RemoteAddr"

# Step 4: Signature verifies match quality
signature:
  components:
    - name: "method_line"
      pattern: "INVITE sip:"
      confidence: 0.95
  confidence_threshold: 0.85

# Step 5: Actions execute on match
actions:
  - name: "start_call_tracking"
    type: "state_management"
    state:
      create_session:
        key: "{{ call_id }}"

# Step 6: Scenario tracks call flow (scenarios/successful_call_setup.yaml)
sequence:
  - step: "invite"
    pattern: "sip_invite"
  - step: "trying"
    pattern: "sip_100_trying"
    within: "100ms"
    match:
      call_id: "{{ session_call_id }}"
```

---

## Best Practices

### Pattern Design
1. **Keep base patterns vendor-agnostic** - Define what, not how
2. **Use descriptive field names** - `from_uri` not `field1`
3. **Mark fields as optional when appropriate** - Not all logs have all fields
4. **Document regex patterns** - Add descriptions explaining complex patterns

### Override Organization
1. **Single base pattern per concept** - One `sip_invite.yaml` in base/
2. **Raw overrides for common extraction** - Works across most vendors
3. **Vendor overrides for quirks only** - Inherit what you can
4. **Test overrides with real logs** - Don't guess at patterns

### Action Design
1. **Actions should be idempotent** - Safe to execute multiple times
2. **Use conditional execution** - Don't alert on everything
3. **Include context in alerts** - Help responders understand issue
4. **Metrics should be increment-only** - Counters and histograms

### Scenario Design
1. **Define clear success criteria** - What completes the scenario?
2. **Set realistic timeouts** - Based on expected behavior
3. **Handle timeout/error cases** - Always clean up state
4. **Test cross-vendor correlation** - Verify Call-IDs match

---

## Testing Your Configuration

### Validate YAML Syntax
```bash
# Check YAML is valid
yamllint patterns/**/*.yaml
yamllint scenarios/**/*.yaml
```

### Test Pattern Matching
```bash
# Test pattern against sample log
log-scout-cli match sample.log --pattern sip_invite --show-extraction
```

### Test Vendor Detection
```bash
# Verify vendor is detected correctly
log-scout-cli detect-vendor sample.log
```

### Test Scenario Execution
```bash
# Run scenario against log file
log-scout-cli scenario sample.log --scenario successful_call_setup --verbose
```

### Validate Override Chain
```bash
# Show how overrides are resolved
log-scout-cli show-overrides sip_invite --vendor cisco_cucm
```

---

## Troubleshooting

### Pattern Not Matching
- Check regex with https://regex101.com
- Verify vendor detection is correct
- Check signature confidence threshold
- Review logs with `--debug` flag

### Incorrect Field Extraction
- Print extracted fields with `--show-extraction`
- Check regex capture groups
- Verify field transformations
- Test with minimal pattern first

### Scenario Not Progressing
- Check step timeouts are realistic
- Verify match conditions (Call-ID, etc.)
- Review state management
- Check transition logic

### Performance Issues
- Profile with `--benchmark` flag
- Cache compiled regexes
- Use quick_match patterns
- Consider raw-only for simple cases

---

## Additional Resources

- [Pattern Override System Guide](PATTERN_OVERRIDES.md)
- [Vendor Support Documentation](VENDOR_SUPPORT.md)
- [Scenario System Guide](SCENARIOS.md)
- [Action System Guide](ACTIONS.md)
- [Integration Plan](INTEGRATION_PLAN_HYBRID_NORMALIZATION.md)

---

**Last Updated**: 2024-02-19  
**Version**: 1.0  
**Maintainer**: Log Scout Analyzer Team