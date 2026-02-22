# Natural Language Test Definitions - User Guide

**For**: Network Engineers, Security Analysts, Operations Teams  
**Purpose**: Create tests without writing code  
**Difficulty**: ⭐ Easy - No programming required  

---

## Quick Start

Write tests in plain English. The system converts them to executable tests automatically.

### Example 1: Basic SIP Call Test

```
Test: SIP Call Setup Check

When I see a SIP call:
- It should start with INVITE
- Followed by 100 Trying within 100ms
- Then 180 Ringing within 2 seconds
- Then 200 OK within 5 seconds
- Then ACK within 500ms
- The Call-ID should be the same in all messages
- Total setup time should be under 10 seconds

If setup time is 5-8 seconds: WARNING
If setup time is over 8 seconds: CRITICAL
```

That's it! Save this as `my_test.txt` and the system will:
- Create pattern matchers for each SIP message
- Track Call-IDs across messages
- Measure timing
- Alert based on thresholds

---

## Natural Language Syntax

### Structure

```
Test: <name>

When I see <pattern>:
- <condition 1>
- <condition 2>
- <condition N>

Then I expect:
- <assertion 1>
- <assertion 2>
- <assertion N>

If <condition>: <severity>
```

### Keywords Recognized

**Pattern Detection**:
- "When I see..."
- "When there is..."
- "When logs show..."
- "Looking for..."

**Conditions**:
- "should", "must", "needs to"
- "within", "before", "after"
- "less than", "more than", "equals"
- "same as", "different from"

**Assertions**:
- "Then I expect..."
- "The result should..."
- "This means..."

**Thresholds**:
- "If ... then ..."
- "When ... alert ..."
- "WARNING", "CRITICAL", "INFO"

---

## Pattern Reference Guide

### SIP Patterns

#### Basic Call Flow

```
Test: Normal Call Flow

When I see a SIP call:
- INVITE starts the call
- 100 Trying responds immediately (within 100ms)
- 180 Ringing happens within 2 seconds
- 200 OK answers within 30 seconds
- ACK confirms within 500ms
- All messages have the same Call-ID
```

#### Failed Call

```
Test: Call Failure Detection

When I see a SIP call:
- INVITE is sent
- But no 200 OK arrives within 30 seconds

Then I expect:
- An alert saying "Call failed to connect"
- Severity: HIGH
- Include the Call-ID and both phone numbers
```

#### Poor Call Quality

```
Test: Call Quality Check

When a SIP call is active:
- Check the RTP quality metrics
- Jitter should be less than 30ms
- Packet loss should be less than 2%
- MOS score should be above 3.5

If jitter is 30-50ms: WARNING
If jitter is over 50ms: CRITICAL
If packet loss is over 2%: CRITICAL
```

### Authentication Patterns

#### Brute Force Detection

```
Test: Brute Force Login Detection

When I see failed login attempts:
- More than 5 failures
- From the same IP address
- Within a 60 second window
- Trying different usernames

Then I expect:
- An alert for "Potential brute force attack"
- Severity: HIGH
- Include the source IP and list of usernames tried
```

#### Successful Login After Failures

```
Test: Suspicious Login Success

When I see:
- Multiple failed login attempts (3 or more)
- From the same IP
- Followed by a successful login
- All within 5 minutes

Then I expect:
- Alert: "Successful login after multiple failures"
- Severity: MEDIUM
- Could indicate compromised credentials
```

### Network Patterns

#### Connection Timeouts

```
Test: Network Timeout Pattern

When logs show connection timeouts:
- More than 3 timeouts
- To the same destination
- Within 5 minutes

Then I expect:
- Alert: "Network connectivity issue detected"
- Include destination IP and timeout count
- Severity: MEDIUM
```

#### Port Scan Detection

```
Test: Port Scan Detection

When I see connection attempts:
- From a single source IP
- To more than 10 different ports
- Within 1 second

Then I expect:
- Alert: "Port scan detected"
- Severity: HIGH
- Include source IP and list of ports contacted
```

### Multi-Vendor Patterns

#### Cross-Vendor Call Routing

```
Test: Multi-Vendor Call Path

When I see a SIP call:
- INVITE arrives at CUBE from external network
- Same Call-ID appears in CUP Proxy within 500ms
- Same Call-ID appears in CUCM within 200ms after CUP
- All INVITEs have matching Call-IDs

Then I expect:
- Track the complete call path
- Measure routing latency at each hop
- Alert if total routing time exceeds 1 second

The system should:
- Detect CUBE, CUP, and CUCM logs automatically
- Correlate by Call-ID across different log formats
- Work even if logs are slightly out of order
```

#### Vendor Format Differences

```
Test: Jabber vs CUCM SIP

When analyzing SIP calls:
- Jabber logs have "CSFClient" marker
- CUCM logs have "|SIPTcp|" marker
- Both should detect the same SIP INVITE
- Extract Call-ID from both formats
- Normalize to same data format

Then I expect:
- Same Call-ID extracted regardless of vendor
- Same caller/callee information
- Timing correlation works across vendors
```

---

## Time Specifications

### Supported Time Units

- **Milliseconds**: `ms`, `milliseconds`
- **Seconds**: `s`, `sec`, `seconds`
- **Minutes**: `m`, `min`, `minutes`
- **Hours**: `h`, `hr`, `hours`

### Examples

```
- within 100ms
- within 5 seconds
- within 2 minutes
- before 1 hour
- after 30 seconds
```

---

## Comparison Operators

### Numeric Comparisons

```
- less than 10
- more than 100
- equals 5
- at least 3
- at most 50
- between 10 and 20
```

### String Comparisons

```
- equals "INVITE"
- contains "error"
- starts with "SIP/"
- ends with ".com"
- matches pattern "\\d{3} OK"
```

### Field Comparisons

```
- Call-ID is the same in all messages
- source IP is the same
- username is different
- timestamp is after the previous event
```

---

## Alert Severity Levels

### INFO

For informational events, no action needed.

```
If call setup completes normally: INFO
```

### WARNING

For events that need attention but aren't critical.

```
If call setup takes 5-8 seconds: WARNING
If jitter is 30-50ms: WARNING
```

### CRITICAL

For serious issues requiring immediate attention.

```
If call fails: CRITICAL
If jitter exceeds 50ms: CRITICAL
If brute force detected: CRITICAL
```

---

## Advanced Features

### State Tracking

```
Test: Call Duration Tracking

When I see a SIP call:
- Start tracking when INVITE is seen
- Mark as "ringing" when 180 arrives
- Mark as "active" when 200 OK arrives
- Mark as "ended" when BYE arrives
- Calculate total duration

Then I expect:
- Alert if call is shorter than 5 seconds (possible issue)
- Alert if call is longer than 2 hours (possible stuck call)
```

### Field Extraction

```
Test: Extract Call Details

When I see a SIP INVITE:
- Extract the caller phone number from "From:" header
- Extract the callee phone number from "To:" header
- Extract the Call-ID
- Extract the source IP from Via header

Store these as:
- caller -> caller_number
- callee -> callee_number  
- Call-ID -> session_id
- source IP -> origin_ip

Use these in alerts and logs.
```

### Correlation Across Events

```
Test: Login Session Tracking

When I see authentication events:
- Track login attempts by username
- Count failures within 10 minutes
- Remember the source IP
- Correlate with successful login

Then I expect:
- If 3+ failures then success from same IP: MEDIUM alert
- If 5+ failures then success from different IP: HIGH alert
- If 10+ failures with no success: HIGH alert (locked account)
```

### Multi-Vendor Correlation

```
Test: End-to-End Call Visibility

When tracking a call:
- CUBE log shows external caller
- CUP Proxy log shows routing
- CUCM log shows internal destination
- Jabber log shows client ringing
- All have the same Call-ID

The system should:
- Auto-detect each vendor's log format
- Extract Call-ID correctly from each
- Correlate all events into one call timeline
- Show the complete end-to-end path

Alert if:
- Call-ID appears in CUBE but not CUCM (routing failed)
- Call-ID appears in CUCM but not Jabber (client issue)
```

---

## Real-World Examples

### Example 1: Production SIP Monitoring

```
Test: Production SIP Call Quality

When analyzing SIP calls in production:

Call Setup Requirements:
- INVITE to 200 OK should be under 5 seconds (normal)
- INVITE to 200 OK under 8 seconds is acceptable (warning)
- INVITE to 200 OK over 8 seconds is problematic (critical)

Call Quality Requirements:
- Jitter must be under 30ms
- Packet loss must be under 2%
- MOS score must be above 3.5

Error Detection:
- If I see "503 Service Unavailable": CRITICAL - server overloaded
- If I see "486 Busy Here" more than 5 times/minute: WARNING - capacity issue
- If I see "408 Request Timeout" more than 3 times: CRITICAL - network issue

Multi-Vendor Correlation:
- Track calls from external (CUBE) to internal (CUCM)
- Measure routing time through CUP Proxy
- Alert if routing takes more than 1 second

Report:
- Count total calls per hour
- Track average setup time
- Track call failure rate
- Identify most common failure codes
```

### Example 2: Security Monitoring

```
Test: Security Event Monitoring

Brute Force Detection:
When I see login failures:
- 5+ failures from same IP within 60 seconds: HIGH alert
- 10+ failures from same IP within 5 minutes: CRITICAL alert
- Include IP address and usernames attempted

Successful Compromise Detection:
When I see:
- Multiple failures followed by success: MEDIUM alert
- Success from different IP after failures: HIGH alert
- Success after hours (1 AM - 5 AM): WARNING alert

Account Lockout Detection:
When I see:
- 10+ failures with no successes: Account likely locked
- Same username from multiple IPs: Possible distributed attack

Geographic Anomaly:
When I see:
- User logs in from New York
- Same user logs in from Tokyo within 30 minutes
- Alert: "Impossible travel detected" (CRITICAL)
```

### Example 3: Multi-Service Correlation

```
Test: Complete UC Environment Monitoring

Voice Services:
- Monitor CUBE for external calls
- Monitor CUCM for internal calls
- Monitor CUC for voicemail access
- Correlate all by Call-ID

Jabber Client:
- Monitor registration status
- Track presence changes
- Detect connection issues
- Correlate with CUCM events

Network:
- Monitor for packet loss
- Track jitter and latency
- Detect routing changes
- Correlate with voice quality issues

Alerts:
When voice quality degrades:
- Check if network issues present
- Check if affecting multiple users
- Identify root cause (network vs server vs client)
- Severity based on impact (1 user = MEDIUM, 10+ users = CRITICAL)
```

---

## Template Library

### Quick Start Templates

Copy and customize these for common use cases:

#### Template: Basic Call Monitoring

```
Test: [Your Test Name]

When I see a SIP call:
- INVITE starts the call
- 100 Trying within 100ms
- 180 Ringing within 2 seconds
- 200 OK within 30 seconds
- ACK within 500ms

If setup time is over [X] seconds: [SEVERITY]
```

#### Template: Authentication Monitoring

```
Test: [Your Test Name]

When I see failed login attempts:
- More than [X] failures
- From the same IP
- Within [Y] seconds
- [Additional conditions]

Then alert: "[Your message]"
Severity: [WARNING/CRITICAL]
```

#### Template: Performance Monitoring

```
Test: [Your Test Name]

When monitoring [service]:
- [Metric 1] should be less than [threshold]
- [Metric 2] should be less than [threshold]
- [Metric 3] should be more than [threshold]

If [condition]: [SEVERITY]
```

---

## Tips and Best Practices

### Writing Effective Tests

1. **Be Specific**: "within 2 seconds" is better than "quickly"
2. **Use Real Numbers**: Base thresholds on actual production data
3. **Include Context**: Alert messages should help responders understand the issue
4. **Test Incrementally**: Start simple, add complexity as needed
5. **Use Comments**: Add notes explaining why thresholds were chosen

### Common Patterns

```
# Good: Specific and measurable
- Call setup should complete within 5 seconds

# Bad: Vague
- Call setup should be fast

---

# Good: Clear threshold
- If jitter exceeds 30ms: WARNING

# Bad: Unclear
- If jitter is high: alert

---

# Good: Helpful context
- Alert: "Call failed - 486 Busy Here means user is on another call"

# Bad: Unclear
- Alert: "Error"
```

### Organizing Tests

Group related tests in the same file:

```
# File: sip_call_tests.txt

Test: Normal Call Setup
[test definition]

---

Test: Failed Call Detection
[test definition]

---

Test: Poor Quality Detection
[test definition]
```

Or create separate files per concern:

```
tests/
├── sip_call_setup.txt
├── sip_call_quality.txt
├── authentication.txt
└── network_monitoring.txt
```

---

## Troubleshooting

### Test Not Triggering

**Problem**: Test never matches
**Solutions**:
- Check your pattern keywords are recognized
- Verify log format matches expectations
- Test with `--debug` flag to see what's detected
- Start with simpler conditions

### Wrong Values Extracted

**Problem**: Fields contain incorrect data
**Solutions**:
- View raw log to verify format
- Check if vendor-specific format needs normalization
- Use more specific pattern descriptions
- Test extraction with sample logs

### False Positives

**Problem**: Test matches too often
**Solutions**:
- Add more specific conditions
- Increase thresholds
- Add exclusion conditions
- Review alert severity levels

### Performance Issues

**Problem**: Tests are slow
**Solutions**:
- Use more specific pattern keywords (faster matching)
- Reduce time windows
- Limit correlation scope
- Consider splitting into multiple tests

---

## Converting Natural Language to YAML

You don't usually need to see this, but here's what happens behind the scenes:

### Your Natural Language:
```
Test: SIP Call Setup

When I see a SIP call:
- INVITE starts the call
- 200 OK arrives within 5 seconds

If setup time is over 5 seconds: WARNING
```

### Generated YAML:
```yaml
test_name: "SIP Call Setup"
test_type: "sip_call_flow"

sequence:
  - pattern: "sip_invite"
    extract:
      - call_id: "session_call_id"
  
  - pattern: "sip_200_ok"
    within: "5s"
    match:
      call_id: "{{ session_call_id }}"

assertions:
  - name: "setup_time"
    value: "{{ step_2.timestamp - step_1.timestamp }}"
    operator: "<"
    threshold: 5000
    severity: "warning"
```

The system handles all this automatically!

---

## Next Steps

### Getting Started

1. **Write your first test** using a template above
2. **Save as `.txt` file** in your tests directory
3. **Run the test** against sample logs
4. **Review results** and adjust thresholds
5. **Deploy to production** monitoring

### Learning More

- See [Configuration Examples](CONFIGURATION_EXAMPLES.md) for YAML details
- See [Scenario Guide](SCENARIOS.md) for complex workflows
- See [Integration Plan](INTEGRATION_PLAN_HYBRID_NORMALIZATION.md) for architecture

### Getting Help

```bash
# Validate your test
log-scout-cli validate-test my_test.txt

# Test against sample logs
log-scout-cli run-test my_test.txt sample.log --verbose

# Convert to YAML to see what was generated
log-scout-cli show-yaml my_test.txt

# Get test suggestions
log-scout-cli suggest-tests sample.log
```

---

## Examples Gallery

### Complete Working Examples

#### Example 1: Enterprise Voice Monitoring

```
Test: Enterprise Voice Quality Monitoring

When monitoring production voice infrastructure:

CUBE (External Gateway):
- Monitor all incoming calls
- Extract external caller ID
- Track call routing decisions
- Alert if rejection rate exceeds 5%

CUP Proxy (SIP Proxy):
- Track routing latency
- Should be under 100ms
- Alert if over 500ms (CRITICAL)

CUCM (Call Manager):
- Monitor internal call setup
- Track registration status
- Alert on trunk failures (CRITICAL)

Jabber (Clients):
- Monitor client registrations
- Track presence status
- Alert on repeated registration failures

Call Quality:
- Jitter under 30ms (WARNING at 30-50ms, CRITICAL over 50ms)
- Packet loss under 2% (CRITICAL over 2%)
- MOS score above 3.5 (WARNING at 3.0-3.5, CRITICAL under 3.0)

Cross-System Correlation:
- Track calls end-to-end using Call-ID
- Measure total routing time (CUBE to CUCM)
- Alert if routing exceeds 1 second
- Identify bottlenecks in call path

Reporting:
- Total calls per hour
- Average call quality metrics
- Top failure reasons
- Busiest time periods
```

#### Example 2: Security Operations Center

```
Test: SOC Security Monitoring

Authentication Security:
- Detect brute force (5+ failures/60s): HIGH
- Detect credential stuffing (many usernames, same IP): CRITICAL
- Detect impossible travel (geo-location change): CRITICAL
- Track successful logins after failures: MEDIUM

Network Security:
- Port scan detection (10+ ports/second): HIGH
- DDoS indicators (connection spike): CRITICAL
- Suspicious traffic patterns: MEDIUM

VoIP Security:
- Toll fraud detection (premium numbers): CRITICAL
- SIP flooding (excessive INVITE): HIGH
- Registration hijacking: CRITICAL
- Unauthorized trunks: HIGH

Compliance:
- Log all authentication events
- Track admin access
- Monitor privileged actions
- Generate audit reports

Response Actions:
- CRITICAL: Page on-call engineer
- HIGH: Create incident ticket
- MEDIUM: Email security team
- All: Log to SIEM
```

---

**Remember**: You don't need to know YAML, regex, or programming. Just describe what you want to detect in plain English, and the system handles the rest!

---

**Version**: 1.0  
**Last Updated**: 2024-02-19  
**Difficulty**: ⭐ Easy  
**Audience**: Everyone  

For more advanced configuration, see [Configuration Examples](CONFIGURATION_EXAMPLES.md).