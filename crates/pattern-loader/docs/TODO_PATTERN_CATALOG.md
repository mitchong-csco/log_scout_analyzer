# TODO: Pattern Catalog Documentation

## Overview

This document serves as a TODO for cataloging and documenting all 423 patterns currently loaded from TagScout. Understanding each pattern is critical for:

1. **Maintenance** - Know what each pattern detects and why
2. **Troubleshooting** - Debug why patterns match or don't match
3. **Enhancement** - Improve patterns with better extractors and conditions
4. **Training** - Help users understand what diagnostics mean
5. **Quality** - Identify redundant, broken, or missing patterns

---

## Current Status

- **Total Patterns**: 423 patterns loaded from TagScout cache
- **Categories**: 40+ categories (Telephony, Authentication, Network, etc.)
- **Products**: Primarily Jabber (Windows/Mac/Mobile)
- **Documentation Status**: ❌ Not yet documented

---

## Pattern Catalog Structure

For each pattern, we need to document:

### 1. Pattern Metadata
```yaml
Pattern ID: <unique_id>
Pattern Name: <human_readable_name>
Category: <category>
Product: <jabber|webex|etc>
Enabled: <true|false>
Mode: <SingleLine|MultiLine>
```

### 2. Pattern Matching
```yaml
Regex Pattern: <the_regex>
Purpose: <what log lines does this find?>
Example Match: <sample log line>
```

### 3. Parameter Extraction
```yaml
Extractors:
  - Name: <parameter_name>
    Regex: <extraction_regex>
    Purpose: <what does this extract?>
    Example Value: <sample_value>
```

### 4. Severity Rules
```yaml
Base Severity: <Info|Warning|Error|Hint>
Log Level Triggers:
  - Level: <DEBUG|INFO|WARN|ERROR>
    Severity: <severity>
Condition Triggers:
  - Field: <parameter_name>
    Operator: <Equals|Contains|Regex>
    Value: <value>
    Severity: <severity>
    Rationale: <why this condition matters>
```

### 5. Annotation Template
```yaml
Template: <template_with_{{ FIELDS }}>
Purpose: <what message does this create?>
Example Output: <sample merged message>
```

### 6. Temporal Behavior
```yaml
Frequency: <how often does this log?>
Temporal Significance:
  - Stagnation: <what stagnant values indicate?>
  - Trends: <what trends indicate?>
  - Frequency: <what high/low frequency indicates?>
```

### 7. Diagnostic Use Cases
```yaml
Common Issues Detected:
  - Issue: <problem description>
    Symptoms: <what the log shows>
    Root Cause: <actual problem>
    Resolution: <how to fix>
```

### 8. Related Patterns
```yaml
Related To:
  - Pattern: <related_pattern_id>
    Relationship: <precedes|follows|concurrent|alternative>
```

---

## Documentation Workflow

### Phase 1: Pattern Inventory (TODO)
- [ ] Export all patterns to structured format (CSV/JSON)
- [ ] Group patterns by category
- [ ] Identify patterns with most parameters (complex)
- [ ] Identify patterns with most matches (high value)
- [ ] Identify patterns that never match (candidates for removal)

### Phase 2: High-Priority Documentation (TODO)
Focus on patterns that:
- ✅ Have the most diagnostic value (RTP STATS, HTTP responses, errors)
- ✅ Are complex (many parameters, conditions)
- ✅ Are frequently matched (appear in most logs)
- ✅ Are critical for troubleshooting (call failures, auth issues, crashes)

### Phase 3: Category-by-Category Review (TODO)
Document patterns systematically by category:
1. **Telephony** - Call setup, RTP, codecs, media
2. **Authentication** - Login, OAuth, SAML, certificates
3. **Network** - DNS, HTTP, connectivity, proxies
4. **Performance** - Memory, CPU, response times
5. **Errors** - Crashes, exceptions, timeouts
6. And 35+ more categories...

### Phase 4: Pattern Quality Assessment (TODO)
For each pattern, evaluate:
- [ ] Does the regex correctly match intended log lines?
- [ ] Are parameter extractors working?
- [ ] Are condition triggers appropriate?
- [ ] Is the annotation template helpful?
- [ ] Are there false positives/negatives?
- [ ] Can this be improved?

### Phase 5: Create Pattern Library (TODO)
- [ ] Build searchable pattern documentation site
- [ ] Create pattern examples repository
- [ ] Write troubleshooting guides per pattern
- [ ] Create pattern relationship diagrams
- [ ] Build pattern testing framework

---

## Priority Patterns to Document First

### Category: Telephony / Media (Critical for Call Quality)

#### 1. RTP Statistics Pattern
**Why Priority**: Detects audio/video issues - highest diagnostic value

```yaml
Pattern ID: 5ea153adebad09000114ae92
Pattern: "RTP STATS"
Parameters: 12+ (session_id, rx_pkts, tx_pkts, jitter, etc.)
Use Cases:
  - No audio/video detection (packets = 0)
  - Packet loss detection (rx_pkts_lost increasing)
  - Jitter issues (rx_jitter > threshold)
  - One-way audio (rx=0 but tx>0, or vice versa)
Status: ⏳ TODO - Document
```

#### 2. Audio Stream State Pattern
```yaml
Pattern: "audio stream"
Parameters: message, status
Use Cases:
  - Stream setup failures
  - Codec negotiation issues
  - Stream termination tracking
Status: ⏳ TODO - Document
```

#### 3. Call Event Patterns
```yaml
Patterns: "CALL_EVENT", "evStateChanged"
Use Cases:
  - Call state tracking (OffHook, Connected, OnHook)
  - Call failure detection
  - Call duration calculation
Status: ⏳ TODO - Document
```

### Category: Authentication (Critical for Login Issues)

#### 4. Authentication Failed Pattern
```yaml
Pattern: "Authentication failed"
Parameters: user, attempt, max
Use Cases:
  - Brute force detection (high frequency)
  - Account lockout prediction (attempt approaching max)
  - Credential issues
Status: ⏳ TODO - Document
```

#### 5. OAuth/SAML Patterns
```yaml
Pattern: "OAuth|SAML|token"
Use Cases:
  - SSO failures
  - Token expiration
  - Authorization issues
Status: ⏳ TODO - Document
```

### Category: Network (Critical for Connectivity)

#### 6. HTTP Response Patterns
```yaml
Pattern: "HTTP Response"
Parameters: status_code, url, response_time
Use Cases:
  - API failures (4xx, 5xx codes)
  - Performance degradation (response_time increasing)
  - Service availability
Status: ⏳ TODO - Document
```

#### 7. DNS Resolution Patterns
```yaml
Pattern: "DNS|NSLOOKUP"
Use Cases:
  - DNS failures (NXDOMAIN)
  - Resolution delays
  - Split DNS issues
Status: ⏳ TODO - Document
```

### Category: Errors (Critical for Crash Analysis)

#### 8. Exception/Crash Patterns
```yaml
Pattern: "Exception|Error|Crash|Assertion"
Parameters: error_type, error_code, stack_trace
Use Cases:
  - Application crashes
  - Unhandled exceptions
  - Memory violations
Status: ⏳ TODO - Document
```

---

## Pattern Analysis Tools (TODO - Build These)

### Tool 1: Pattern Statistics Generator
```python
# Analyze pattern matches across log corpus
def analyze_patterns(log_files, patterns):
    """
    Generate statistics:
    - Match frequency per pattern
    - Parameter extraction success rate
    - Average parameters per match
    - Patterns that never match
    - Most common parameter values
    """
    pass
```

### Tool 2: Pattern Tester
```python
# Test patterns against sample logs
def test_pattern(pattern, test_logs):
    """
    Test:
    - Does regex match expected lines?
    - Do parameter extractors work?
    - Are condition triggers firing correctly?
    - Is annotation template rendering properly?
    """
    pass
```

### Tool 3: Pattern Validator
```python
# Validate pattern configuration
def validate_pattern(pattern):
    """
    Check:
    - Regex syntax valid?
    - Parameter extractors have capture groups?
    - Condition trigger fields exist?
    - Template placeholders match extractors?
    - No circular dependencies?
    """
    pass
```

### Tool 4: Pattern Relationship Mapper
```python
# Map relationships between patterns
def map_relationships(patterns, log_files):
    """
    Discover:
    - Patterns that often appear together
    - Temporal sequences (A always precedes B)
    - Causal relationships (A causes B)
    - Alternative patterns (A or B, never both)
    """
    pass
```

---

## Pattern Quality Metrics (TODO - Define)

For each pattern, track:

### Match Metrics
- **Match Rate**: % of log files where pattern matches
- **Match Frequency**: Average matches per file
- **Match Distribution**: How evenly distributed across logs

### Extraction Metrics
- **Parameter Success Rate**: % of matches with all parameters extracted
- **Parameter Coverage**: Which parameters extract successfully
- **Extraction Failures**: Common reasons extractors fail

### Diagnostic Metrics
- **Severity Distribution**: % of matches at each severity
- **Condition Trigger Rate**: How often conditions fire
- **False Positive Rate**: Matches that aren't real issues
- **False Negative Rate**: Real issues pattern misses

### User Value Metrics
- **Time to Diagnosis**: How much faster with this pattern?
- **Issue Coverage**: What % of real issues does it catch?
- **Actionability**: Can user fix the issue from the diagnostic?

---

## Example Pattern Documentation (Template)

### Pattern: RTP Statistics

#### Metadata
```yaml
ID: 5ea153adebad09000114ae92
Name: "[0x000000016c92b000] [cpve/src/main/SessionImpl.cpp...]"
Category: Telephony
Product: Jabber (all platforms)
Enabled: true
Mode: SingleLine
Priority: HIGH (critical for call quality diagnosis)
```

#### Pattern Matching
```yaml
Regex: "RTP STATS"
Purpose: Find RTP statistics log lines that report media packet metrics
Frequency: Every 2 seconds during active calls
Example:
  Input: "2025-12-10 17:15:56,798 DEBUG [cpve] - RTP STATS,session_id=0,session_type=audio-main,..."
  Match: "RTP STATS"
```

#### Parameter Extraction (12 extractors)
```yaml
1. SESSION_ID:
   Regex: "session_id=(\\d+)"
   Purpose: Unique identifier for this media session
   Example: "0"
   Temporal: Use for tracking same session over time

2. SESSION_TYPE:
   Regex: "session_type=(.+?),"
   Purpose: Type of media (audio-main, video, etc.)
   Example: "audio-main"

3. rx_pkts_recv:
   Regex: "rx_pkts_recv=(\\d+)"
   Purpose: Total packets received (should increase over time)
   Example: "54" (increasing to 154, 254, etc.)
   Stagnation: If stuck at 0 = no incoming media

4. tx_pkts_sent:
   Regex: "tx_pkts_sent=(\\d+)"
   Purpose: Total packets transmitted (should increase over time)
   Example: "77" (increasing to 178, 279, etc.)
   Stagnation: If stuck at 0 = no outgoing media

5. rx_pkts_lost:
   Regex: "rx_pkts_lost=(\\d+)"
   Purpose: Packets lost in reception
   Example: "0" (good), "50" (bad)
   Trend: Increasing = degrading quality

6. rx_jitter:
   Regex: "rx_jitter=(\\d+)"
   Purpose: Jitter in milliseconds (packet timing variance)
   Example: "2" (good), "50" (bad)
   Threshold: >30ms = quality issues

7-12. [Additional extractors for tx metrics, averages, etc.]
```

#### Severity Rules
```yaml
Base Severity: Info (statistics are informational)

Condition Triggers:
  - Trigger 1: No Received Packets
    Field: rx_pkts_recv
    Operator: Equals
    Value: "0"
    Severity: Warning
    Rationale: No incoming audio/video
    
  - Trigger 2: No Transmitted Packets
    Field: tx_pkts_sent
    Operator: Equals
    Value: "0"
    Severity: Warning
    Rationale: No outgoing audio/video
    
  - Trigger 3: High Packet Loss
    Field: rx_pkts_lost
    Operator: GreaterThan
    Value: "100"
    Severity: Error
    Rationale: Severe packet loss = unusable call
    
  - Trigger 4: High Jitter
    Field: rx_jitter
    Operator: GreaterThan
    Value: "30"
    Severity: Warning
    Rationale: Jitter >30ms causes quality issues
```

#### Annotation Template
```html
<p>RTP Statistics: Session ID=<span class="ql-color-orange">{{ SESSION_ID }}</span>, 
   Type=<span class="ql-color-orange">{{ SESSION_TYPE }}</span></p>
<p>rx_pkts_recv=<em class="ql-color-orange"><u>{{ rx_pkts_recv }}</u></em>, 
   rx_pkts_lost={{ rx_pkts_lost }}, 
   rx_jitter={{ rx_jitter }}</p>
<p>tx_pkts_sent=<em class="ql-color-orange">{{ tx_pkts_sent }}</em>, 
   tx_pkts_lost={{ tx_pkts_lost }}</p>
```

**Rendered Example**:
```
RTP Statistics: Session ID=0, Type=audio-main
rx_pkts_recv=254, rx_pkts_lost=5, rx_jitter=12
tx_pkts_sent=279, tx_pkts_lost=0
```

#### Temporal Behavior Analysis

**Normal Pattern** (healthy call):
```
Time     | rx_pkts | tx_pkts | Status
---------|---------|---------|--------
17:15:56 |      54 |      77 | ✓ Starting
17:15:58 |     154 |     178 | ✓ Increasing
17:16:00 |     254 |     279 | ✓ Increasing
17:16:02 |     354 |     379 | ✓ Healthy
```

**Problem Pattern 1** (no audio):
```
Time     | rx_pkts | tx_pkts | Status
---------|---------|---------|--------
17:15:56 |       0 |       0 | ⚠️ No media
17:15:58 |       0 |       0 | ⚠️ STAGNANT
17:16:00 |       0 |       0 | ⚠️ STAGNANT
17:16:02 |       0 |       0 | 🔴 PROBLEM: No audio/video for 8+ seconds
```

**Problem Pattern 2** (one-way audio):
```
Time     | rx_pkts | tx_pkts | Status
---------|---------|---------|--------
17:15:56 |     154 |       0 | ⚠️ Can hear but can't speak
17:15:58 |     254 |       0 | ⚠️ TX still zero
17:16:00 |     354 |       0 | 🔴 PROBLEM: Microphone/TX issue
```

**Problem Pattern 3** (packet loss):
```
Time     | rx_pkts | lost | Status
---------|---------|------|--------
17:15:56 |      54 |    0 | ✓ Good
17:15:58 |     154 |   12 | ⚠️ Starting to lose packets
17:16:00 |     254 |   45 | ⚠️ Loss increasing
17:16:02 |     354 |  103 | 🔴 PROBLEM: Severe packet loss
```

#### Common Issues Detected

**Issue 1: No Audio During Call**
- **Symptoms**: rx_pkts_recv = 0 AND tx_pkts_sent = 0 for multiple consecutive logs
- **Root Causes**:
  - Codec negotiation failed
  - Network firewall blocking RTP ports
  - Audio device not initialized
  - No network path between endpoints
- **Resolution**: Check codec support, verify firewall rules, test audio devices

**Issue 2: One-Way Audio**
- **Symptoms**: rx_pkts > 0 BUT tx_pkts = 0 (or vice versa)
- **Root Causes**:
  - Asymmetric NAT/firewall
  - Microphone not accessible
  - TX audio device failure
- **Resolution**: Check NAT configuration, verify microphone permissions

**Issue 3: Poor Call Quality**
- **Symptoms**: rx_jitter > 30 OR rx_pkts_lost increasing rapidly
- **Root Causes**:
  - Network congestion
  - WiFi interference
  - QoS not configured
  - Bandwidth insufficient
- **Resolution**: Switch to wired connection, enable QoS, reduce bandwidth usage

**Issue 4: Call Drops Suddenly**
- **Symptoms**: Normal packet flow → sudden drop to 0
- **Root Causes**:
  - Network disconnect
  - Endpoint crash
  - Call terminated
- **Resolution**: Check for disconnect events before RTP stops

#### Related Patterns

```yaml
Precedes:
  - Pattern: "audio stream.*closed"
    Relationship: RTP stats stop when stream closes
    
Concurrent With:
  - Pattern: "CALL_EVENT.*Connected"
    Relationship: RTP stats during active call
    
Follows:
  - Pattern: "audio stream.*starting"
    Relationship: RTP stats begin after stream starts
    
Alternative To:
  - Pattern: "Video statistics"
    Relationship: Separate pattern for video RTP
```

#### Testing & Validation

**Test Cases**:
1. ✅ Match "RTP STATS" in DEBUG log lines
2. ✅ Extract session_id correctly
3. ✅ Extract all 12 parameters
4. ✅ Detect zero packets as Warning
5. ✅ Detect high jitter as Warning
6. ✅ Template renders with actual values
7. ⏳ TODO: Test multi-line scenarios
8. ⏳ TODO: Test edge cases (missing fields)

**Known Issues**:
- Some parameters may be -1 (not available) - need to handle
- HTML in template may not render properly in all editors
- Need better threshold values for jitter/packet loss

**Improvement Ideas**:
- Add temporal analysis to detect stagnation automatically
- Calculate packet rate (packets/second) as derived parameter
- Add MOS score estimation based on jitter/loss
- Correlate with call quality complaints

---

## Pattern Categories Overview (TODO - Document Each)

### 1. Telephony & Media (High Priority)
- [ ] RTP Statistics (documented above)
- [ ] Audio Stream State
- [ ] Video Stream State
- [ ] Call Events (State Changes)
- [ ] Codec Negotiation
- [ ] DTMF Events
- [ ] Call Park/Transfer
- [ ] Conference Calls
- [ ] Voicemail (CUC)

**Estimated**: 50+ patterns

### 2. Authentication & Security
- [ ] Login Success/Failure
- [ ] OAuth Token Flow
- [ ] SAML Authentication
- [ ] Certificate Validation
- [ ] Password Changes
- [ ] Account Lockout
- [ ] Two-Factor Auth

**Estimated**: 40+ patterns

### 3. Network & Connectivity
- [ ] HTTP Requests/Responses
- [ ] DNS Lookups
- [ ] TCP Connections
- [ ] WebSocket Events
- [ ] Proxy Configuration
- [ ] TLS/SSL Handshakes
- [ ] Network Interface Changes

**Estimated**: 60+ patterns

### 4. Performance & Resources
- [ ] Memory Usage
- [ ] CPU Usage
- [ ] Thread Pool State
- [ ] Database Connection Pool
- [ ] Cache Hit/Miss Rates
- [ ] Response Times
- [ ] Queue Depths

**Estimated**: 30+ patterns

### 5. Errors & Exceptions
- [ ] Application Crashes
- [ ] Unhandled Exceptions
- [ ] Stack Traces
- [ ] Assertion Failures
- [ ] Memory Violations
- [ ] Deadlocks
- [ ] Resource Exhaustion

**Estimated**: 50+ patterns

### 6. Contact & Directory Services
- [ ] LDAP Queries
- [ ] UDS Queries
- [ ] Contact Search
- [ ] Directory Sync
- [ ] Outlook Integration
- [ ] Photo Retrieval

**Estimated**: 40+ patterns

### 7. Presence & IM
- [ ] Presence Updates
- [ ] Instant Messages
- [ ] Chat Room Events
- [ ] File Transfers
- [ ] Screen Sharing
- [ ] Desktop Share

**Estimated**: 35+ patterns

### 8. Configuration & Settings
- [ ] Config File Loads
- [ ] Setting Changes
- [ ] Policy Updates
- [ ] Feature Toggles
- [ ] Plugin Loading
- [ ] Service Discovery

**Estimated**: 30+ patterns

### 9. UCM/CUCM Integration
- [ ] Device Registration
- [ ] Line Registration
- [ ] CTI Events
- [ ] Call Control
- [ ] DND Status
- [ ] Call Forwarding

**Estimated**: 40+ patterns

### 10. Mobile & Platform Specific
- [ ] iOS Specific Events
- [ ] Android Specific Events
- [ ] Background/Foreground
- [ ] Push Notifications (APNS)
- [ ] Battery State
- [ ] Network Reachability

**Estimated**: 48+ patterns

---

## Documentation Schedule (Proposed)

### Week 1: Foundation Setup
- [ ] Set up pattern documentation structure
- [ ] Create documentation templates
- [ ] Build pattern extraction/analysis tools
- [ ] Identify top 20 priority patterns

### Weeks 2-3: High Priority Patterns (20 patterns)
- [ ] RTP Statistics
- [ ] HTTP Responses
- [ ] Authentication Failures
- [ ] Call Events
- [ ] DNS Lookups
- [ ] Crashes/Exceptions
- [ ] Memory Usage
- [ ] Network Connectivity
- [ ] Certificate Issues
- [ ] OAuth/SAML
- [ ] + 10 more high-value patterns

### Weeks 4-8: Category-by-Category (200 patterns)
- Week 4: Telephony & Media (50 patterns)
- Week 5: Authentication & Network (100 patterns)
- Week 6: Performance & Errors (80 patterns)
- Week 7: Contact, Presence, IM (110 patterns)
- Week 8: Configuration, UCM, Mobile (83 patterns)

### Week 9-10: Quality Review & Enhancement
- [ ] Review all documented patterns
- [ ] Test patterns against real logs
- [ ] Identify improvement opportunities
- [ ] Document pattern relationships
- [ ] Create troubleshooting guides

### Week 11-12: Tools & Automation
- [ ] Build pattern testing framework
- [ ] Create pattern validation tools
- [ ] Generate pattern statistics
- [ ] Build pattern relationship mapper
- [ ] Create searchable pattern catalog

---

## Success Metrics

### Documentation Completeness
- **Target**: 100% of 423 patterns documented
- **Current**: 0% (0/423)
- **Milestone 1**: 5% (20/423) - High priority patterns
- **Milestone 2**: 50% (211/423) - Major categories covered
- **Milestone 3**: 100% (423/423) - All patterns documented

### Pattern Quality
- **Regex Accuracy**: >95% of patterns match intended lines
- **Extractor Success**: >90% of parameters extract successfully
- **Condition Accuracy**: >95% of condition triggers fire correctly
- **Template Quality**: >95% of templates render helpful messages

### User Value
- **Time to Diagnosis**: Reduce by 80% (from minutes to seconds)
- **Issue Detection**: Catch 95%+ of known issues
- **False Positives**: <5% of diagnostics are false alarms
- **User Satisfaction**: 90%+ of users find diagnostics helpful

---

## Notes

This is a significant documentation effort that will:
- **Clarify** what each pattern does and why it exists
- **Improve** pattern quality through systematic review
- **Enable** better troubleshooting and support
- **Empower** users to understand their logs better
- **Facilitate** pattern maintenance and enhancement

**Estimated Effort**: 3 months for complete documentation
**Estimated Value**: Immeasurable - this becomes the foundation for all log analysis

---

## Next Steps

1. **Immediate**: Review and approve this documentation plan
2. **This Week**: Set up tooling to extract pattern data
3. **Next Week**: Begin documenting top 20 high-priority patterns
4. **Ongoing**: Document 20-30 patterns per week
5. **Continuous**: Test and improve patterns as we document them

---

**Last Updated**: 2026-02-17
**Status**: 📋 TODO - Documentation Not Started
**Owner**: TBD
**Target Completion**: Q2 2026