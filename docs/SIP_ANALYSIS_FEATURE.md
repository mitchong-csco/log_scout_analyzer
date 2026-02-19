# SIP Call Flow Analysis Feature

## Overview
Generate comprehensive SIP call flow analysis files similar to the existing manual analysis format, with automated extraction, analysis, and documentation.

## Feature Description

### Input
- SIP log files (SDL, Jabber, SIP-Proxy formats)
- Boundary-based SIP message extraction

### Output
- **SIP_Call_Analysis_{call-id}.md** - Comprehensive analysis file containing:

#### 1. Call Summary Section
```markdown
## Call Summary

| Parameter | Value |
|-----------|-------|
| **Direction** | Incoming/Outgoing |
| **From** | "Name" <sip:user@domain> |
| **To** | "Name" <sip:user@domain> |
| **Call-ID** | UUID@domain |
| **Ring Duration** | X seconds |
| **Connected Duration** | Y seconds |
| **Failure Reason** | Error code/description |
| **Disconnect Cause** | Q.850 cause |
```

#### 2. Detailed SIP Message Flow
```markdown
## Detailed SIP Message Flow

### 1. ☎️ Initial INVITE (timestamp)
```
[Full SIP message]
```
**Analysis:**
- Technical observations
- Protocol insights
- Call state changes

### 2. 🔔 180 Ringing (timestamp)
```
[Full SIP message]
```
**Analysis:**
- Ringing behavior
- Dialog establishment

### 3. ✅ 200 OK Answer (timestamp)
```
[Full SIP message + SDP]
```
**Analysis:**
- SDP breakdown
- Media capabilities
- Codec negotiation

### 4. ❌ 500 Server Error (timestamp)
```
[Full SIP message]
```
**Analysis:**
- Error analysis
- Root cause identification
```

#### 3. Root Cause Analysis
```markdown
## Root Cause Analysis

**Summary:** Brief explanation of what happened
**Cause:** Technical root cause
**Impact:** Effect on call
**Recommendation:** Fix suggestions
```

### Automated Analysis Capabilities

#### 1. Call Classification
- **Call Type Detection**: Incoming/Outgoing, UCCX, Internal, External
- **Service Identification**: CUCM, UCCX, Jabber, SIP Gateway
- **Call Pattern Recognition**: Normal call flow, failure patterns

#### 2. Timing Analysis
- **Ring Duration**: Time from INVITE to 200 OK
- **Setup Time**: Time from 200 OK to ACK completion
- **Call Duration**: Connected time before disconnect
- **Response Time Analysis**: Identify timing-related issues

#### 3. Failure Pattern Detection
- **Common Issues**:
  - 500 Internal Server Error
  - 404 Not Found
  - 486 Busy Here
  - 503 Service Unavailable
  - Timeout scenarios
- **Root Cause Mapping**:
  - Re-INVITE timing issues
  - SDP negotiation failures
  - Codec incompatibility
  - Network connectivity issues

#### 4. SDP Analysis
- **Media Stream Detection**: Audio, Video, BFCP, H.224
- **Codec Negotiation**: Opus, G.722, H.264, etc.
- **Transport Analysis**: TCP/UDP, port assignments
- **Capability Detection**: Video, desktop sharing, FECC

#### 5. Network Analysis
- **IP Address Mapping**: CUCM, Jabber clients, gateways
- **Transport Protocol**: TCP vs UDP usage
- **Port Assignment**: Dynamic port allocation
- **Network Topology**: Call path identification

### Implementation Plan

#### Phase 1: Foundation
- [x] SIP message extraction (boundary-based)
- [x] Call-ID grouping and UUID extraction
- [x] Raw/Clean SIP file generation
- [ ] Basic analysis file generation
- [ ] Call summary table population

#### Phase 2: Analysis Engine
- [ ] Message flow reconstruction
- [ ] Timing analysis calculations
- [ ] Failure pattern detection
- [ ] SDP parsing and analysis
- [ ] Network topology mapping

#### Phase 3: Advanced Features
- [ ] Root cause analysis engine
- [ ] Automated recommendations
- [ ] Visual call flow diagrams
- [ ] Integration with ladder diagrams
- [ ] Export to multiple formats

### File Naming Convention
- **Analysis File**: `SIP_Call_Analysis_{call-id-uuid}.md`
- **Raw SIP**: `SIP_Call_Raw_{call-id-uuid}.sip`
- **Clean SIP**: `SIP_Call_Clean_{call-id-uuid}.sip`

### Integration Points
1. **Extract SIP Messages** command → Generate all 3 files
2. **Show Ladder Diagram** command → Link to analysis file
3. **Pattern Override UI** → Highlight analysis insights
4. **Diagnostic Integration** → Auto-generate analysis on SIP errors

### Success Metrics
- **Accuracy**: 95%+ correct call flow reconstruction
- **Completeness**: All relevant SIP parameters captured
- **Usability**: Analysis files readable by both technical and non-technical users
- **Speed**: Analysis generation < 5 seconds per call

### Technical Requirements
- **Message Ordering**: Chronological sequence reconstruction
- **State Tracking**: SIP dialog state management
- **Error Handling**: Graceful handling of malformed SIP
- **Performance**: Efficient parsing of large log files
- **Extensibility**: Plugin architecture for custom analysis rules

## Example Output Structure
```
SIP_Call_Analysis_b52c7f00-1f212963-1b2e-62045b0a.md
├── Header (Call-ID, Summary, Result)
├── Call Summary Table
├── Detailed Message Flow (chronological)
│   ├── INVITE with analysis
│   ├── 100 Trying with analysis
│   ├── 180 Ringing with analysis
│   ├── 200 OK with SDP analysis
│   ├── ACK with analysis
│   └── Error messages with root cause
└── Root Cause Analysis section
```

This feature will transform SIP log analysis from manual effort to automated, comprehensive technical documentation.
