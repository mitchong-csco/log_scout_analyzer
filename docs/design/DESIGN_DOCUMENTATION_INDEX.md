# Design Documentation Index

## 📚 Complete Design Documentation Suite

This index provides a comprehensive overview of all design documents for the Log Scout Analyzer project, showing how patterns, parameters, temporal analysis, actions, and scenarios work together.

---

## 🎯 Quick Navigation

### For New Users
1. Start here: [Pattern Design Philosophy](#pattern-design-philosophy)
2. Then read: [Parameter Extraction Fix](#parameter-extraction-fix)
3. Understand: [Temporal Analysis](#temporal-analysis)

### For Developers
1. Implementation: [Complete Implementation Guide](#implementation-guides)
2. Architecture: [Pattern to Action Framework](#pattern-to-action-framework)
3. Reference: [Diagnostic Data Structure](#diagnostic-data-structure)

### For Pattern Authors
1. Catalog: [Pattern Catalog (TODO)](#pattern-catalog)
2. Testing: [Parameter Extraction Fix](#parameter-extraction-fix)
3. Actions: [Pattern to Action Framework](#pattern-to-action-framework)

### For System Architects
1. Architecture: [Client-Server Log Architecture](#client-server-log-architecture)
2. Correlation: [How Contexts Work Together](#client-server-log-architecture)
3. Scale: [Handling Different Log Types](#client-server-log-architecture)

---

## 📖 Core Design Documents

### 1. Pattern Design Philosophy
**File**: `PATTERN_DESIGN_PHILOSOPHY.md`  
**Status**: ✅ Complete  
**Last Updated**: 2026-02-17

**What it covers**:
- The three-stage log analysis process (Match → Extract → Evaluate)
- Separation of concerns: Pattern Regex vs Parameter Extractors vs Condition Triggers
- Why patterns are intentionally broad (filters, not scopes)
- Real-world examples (HTTP responses, RTP stats, authentication)
- Temporal analysis benefits (stagnation, trends, anomalies)

**Key Concepts**:
```
Pattern Regex: "Find interesting lines" (broad filter)
↓
Parameter Extractors: "Extract variable values" (from full line)
↓
Condition Triggers: "Determine actual severity" (context-aware)
↓
Template Substitution: "Create human message" (with actual values)
```

**Key Takeaway**: 
> The pattern regex finds the haystack, the parameter extractors find the needles, the condition triggers tell you if those needles are dangerous, and repeated matches over time reveal trends and problems that single log lines cannot show.

**Read this first if**: You want to understand the fundamental design philosophy

---

### 2. Parameter Extraction Fix
**File**: `PARAMETER_EXTRACTION_FIX.md`  
**Status**: ✅ Complete  
**Last Updated**: 2026-02-17

**What it covers**:
- The bug: Parameters weren't being extracted from matched lines
- Root cause: Extractors running on matched text instead of full line
- The fix: Modified `extract_fields()` to use full log line
- Testing guide: How to verify the fix works
- Expected results: Before/after comparison

**The Issue**:
```
Pattern Match: "RTP STATS" (10 characters)
Parameter Extractor: "session_id=(.+?),"
Problem: Trying to find "session_id=" in "RTP STATS"
Result: No parameters extracted ❌
```

**The Fix**:
```rust
// Before:
let matched_text = captures.get(0).unwrap().as_str();
for (param_name, param_regex) in &self.parameter_regexes {
    if let Some(cap) = param_regex.captures(matched_text) { ... }
}

// After:
for (param_name, param_regex) in &self.parameter_regexes {
    if let Some(cap) = param_regex.captures(full_line) { ... }
}
```

**Impact**: 
- ✅ Parameters now extracted correctly
- ✅ Templates render with actual values instead of `{{ FIELD }}` placeholders
- ✅ Condition triggers can evaluate extracted values
- ✅ Temporal analysis can track parameter changes

**Read this if**: You're debugging parameter extraction issues or want to understand the implementation details

---

### 3. Temporal Analysis Design
**File**: `TEMPORAL_ANALYSIS_DESIGN.md`  
**Status**: ✅ Complete  
**Last Updated**: 2026-02-17

**What it covers**:
- Why temporal analysis matters (single log vs patterns over time)
- Four temporal pattern types (stagnation, trends, frequency, oscillation)
- Real-world examples (no audio detection, performance degradation, memory leaks)
- Implementation architecture (phases 1-5)
- Data structures for tracking parameters over time
- Enhanced diagnostic format with temporal context

**The Power of Time**:
```
Single Log: "RTP STATS: rx_pkts=0"
Temporal:   "rx_pkts stuck at 0 for 10 seconds (5 occurrences) → NO AUDIO"
```

**Use Cases**:
1. **Stagnation Detection**: Values stuck when they should change
   - Example: Packet counts at 0 → no media flowing
2. **Trend Detection**: Values climbing/falling toward thresholds
   - Example: Response times increasing → performance degrading
3. **Frequency Analysis**: Events happening too often/rarely
   - Example: Auth failures every 2s → brute force attack
4. **Anomaly Detection**: Unusual patterns in normal logs
   - Example: Memory jumping 200MB in 1 second → leak

**Implementation Phases**:
- Phase 1: ✅ Single-line analysis (Complete)
- Phase 2: 🔄 Multi-line context (Partial)
- Phase 3: 📋 Temporal aggregation (TODO)
- Phase 4: 📋 Enhanced diagnostics (TODO)
- Phase 5: 📋 Predictive alerts (TODO)

**Read this if**: You want to understand how we detect issues that unfold over time

---

### 4. Pattern to Action Framework
**File**: `PATTERN_TO_ACTION_FRAMEWORK.md`  
**Status**: ✅ Complete  
**Last Updated**: 2026-02-17

**What it covers**:
- Complete pipeline from pattern match to automated remediation
- Five action types (Investigation, Quick Fix, Guided, Documentation, External)
- Scenario design (automated troubleshooting workflows)
- Pattern-to-action mapping methodology
- Implementation architecture (action and scenario definitions)
- Full example: RTP STATS → No Audio Wizard

**The Complete Pipeline**:
```
Pattern Match → Extract Parameters → Evaluate Severity → Create Diagnostic
     ↓                                                            ↓
Temporal Analysis                                            Action Button
     ↓                                                            ↓
Trend Detection                                              Quick Fix
     ↓                                                            ↓
Scenario Trigger                                             Automation
```

**Action Types**:
1. **Investigation**: Gather more info (view logs, show timeline)
2. **Quick Fix**: One-click remediation (restart service, clear cache)
3. **Guided**: Step-by-step workflows (troubleshooting wizards)
4. **Documentation**: Link to help (KB articles, guides)
5. **External**: Launch tools (Wireshark, device settings)

**Scenario Example**:
```yaml
Scenario: "No Audio Troubleshooting Wizard"
  Step 1: Check audio devices → If OK, Step 2; If fail, Fix devices
  Step 2: Check network/firewall → If OK, Step 3; If fail, Fix network
  Step 3: Check codec support → If OK, Step 4; If fail, Enable codecs
  Step 4: Restart media engine → Validate → Complete or Escalate
```

**Pattern → Action Workflow**:
1. Document pattern (what it detects)
2. Identify root causes (why it happens)
3. Design investigation actions (gather info)
4. Design remediation actions (fix issues)
5. Build scenario workflow (step-by-step)
6. Test and refine

**Read this if**: You want to add actionable remediation to diagnostics

---

## 🏗️ Architecture Documents

### 9. Client-Server Log Architecture
**File**: `CLIENT_SERVER_LOG_ARCHITECTURE.md`  
**Status**: ✅ Complete  
**Last Updated**: 2026-02-17

**What it covers**:
- Fundamental differences between client and server logs
- Why they require different analysis approaches
- Context detection and pattern loading strategies
- Temporal behavior differences (session vs continuous)
- Correlation strategies (time, session, user, pattern-based)
- Multi-file analysis architecture
- Context-aware actions and scenarios

**The Two Contexts**:
```
CLIENT LOGS (User Perspective)
- Single user's experience
- Local device/network/app issues
- User actions and UI events
- "My call isn't working"

SERVER LOGS (System Perspective)
- All users on the system
- Infrastructure/capacity/service issues
- System-wide metrics and health
- "System having problems"
```

**Why This Matters**:
```
Same Pattern, Different Meaning:

"RTP STATS: rx_pkts=0"
Client Context: THIS user has no audio
Server Context: Media gateway has issues

Action differs by context:
Client: Fix user's device/network
Server: Scale infrastructure/fix gateway
```

**Correlation Power**:
```
CLIENT: User john.doe call failed at 17:15:58
SERVER: System exhausted media resources at 17:15:57
INSIGHT: User's call failed BECAUSE of system capacity
ROOT CAUSE: Infrastructure issue (not user's fault)
```

**Key Tables**:

| Aspect | Client Logs | Server Logs |
|--------|-------------|-------------|
| **Scope** | 1 user | 1000s of users |
| **Time** | User session (hours) | System uptime (days) |
| **Size** | MBs | GBs to TBs |
| **Goal** | Fix one user | Optimize system |
| **Actions** | User-level | Admin-level |

**Implementation Phases**:
- Phase 1: ✅ Single file analysis (Complete)
- Phase 2: 📋 Context detection (Next)
- Phase 3: 📋 Multi-file support (Q2)
- Phase 4: 📋 Client-server correlation (Q3)
- Phase 5: 📋 Advanced analytics (Q4)

**Pattern Catalog Impact**:
All 423 patterns need context classification:
- Client-only patterns (50+): UI events, device access, local network
- Server-only patterns (100+): Call routing, resources, cluster health
- Shared patterns (273+): Different interpretation per context

**Read this if**: You need to understand how to handle different log types or build correlation features

---

## 📋 TODO Documents

### 5. Pattern Catalog (TODO)
**File**: `TODO_PATTERN_CATALOG.md`  
**Status**: 📋 TODO - Not Started  
**Last Updated**: 2026-02-17

**What it will cover**:
- Documentation of all 423 patterns from TagScout
- Systematic review by category (40+ categories)
- Pattern metadata, matching rules, parameters, severity triggers
- Common issues detected and resolutions
- Related patterns and temporal behavior
- Quality assessment and improvement recommendations

**Pattern Documentation Template**:
```yaml
Pattern ID: <unique_id>
Pattern Name: <human_readable_name>
Category: <category>
Regex Pattern: <the_regex>
Purpose: <what log lines does this find?>

Parameters:
  - Name, Regex, Purpose, Example Value

Severity Rules:
  - Conditions, Rationale

Temporal Behavior:
  - What stagnation/trends indicate

Common Issues:
  - Symptoms, Root Cause, Resolution

Related Patterns:
  - Precedes, Follows, Concurrent, Alternative
```

**Priority Categories**:
1. **Telephony & Media** (50+ patterns) - Call quality, RTP, audio/video
2. **Authentication & Security** (40+ patterns) - Login, OAuth, certificates
3. **Network & Connectivity** (60+ patterns) - HTTP, DNS, firewall
4. **Performance & Resources** (30+ patterns) - Memory, CPU, response times
5. **Errors & Exceptions** (50+ patterns) - Crashes, timeouts, failures
6. **And 5+ more categories...**

**Workflow**:
- Phase 1: Pattern inventory and grouping
- Phase 2: High-priority patterns first (RTP, HTTP, auth)
- Phase 3: Category-by-category review
- Phase 4: Quality assessment
- Phase 5: Create searchable pattern library

**Estimated Effort**: 3 months for 423 patterns

**Why this matters**: This becomes the foundation for designing actions and scenarios. Each documented pattern will reveal what actions are needed.

**Read this when**: You're ready to start systematic pattern documentation

---

## 🔧 Implementation Guides

### 6. Complete Implementation Guide
**File**: `COMPLETE_IMPLEMENTATION_GUIDE.md`  
**Status**: ✅ Complete (referenced in conversation)

**What it covers**:
- Complete LSP server implementation overview
- Diagnostic data structure (what the extension receives)
- How the extension uses diagnostic data
- Data flow from TagScout → Pattern → Diagnostic → UI
- Validation rules and best practices

**Key Data Structure**:
```json
{
  "message": "merged_template with substituted values",
  "severity": "Error|Warning|Information|Hint",
  "code": "pattern_id",
  "data": {
    "template": "raw {{ FIELD }} template",
    "merged_template": "template with actual values",
    "log_line": "full original log line",
    "extracted_parameters": [{"name": "field", "value": "value"}],
    "pattern_id": "unique_id",
    "pattern_name": "human_readable_name",
    "category": "category",
    "severity": "base_severity",
    // ... all metadata
  }
}
```

---

### 7. Citation Model Implementation
**File**: `CITATION_MODEL_IMPLEMENTATION.md`  
**Status**: ✅ Complete (referenced in conversation)

**What it covers**:
- The three-part diagnostic model: Annotation + Citation + Facts
- **Annotation**: The interpretation (template with substituted values)
- **Citation**: The evidence (original log line)
- **Facts**: Extracted data (parameters as key-value pairs)
- How these parts work together for transparency

**The Model**:
```
┌─────────────────────────────────────────┐
│ ANNOTATION (The Interpretation)         │
│ "User john.doe failed auth (3/5)"       │
└─────────────────────────────────────────┘
           ↑ derived from ↓
┌─────────────────────────────────────────┐
│ CITATION (The Evidence)                 │
│ "2024-01-15 10:20:45 WARN Auth failed   │
│  for user john.doe (attempt 3/5)"       │
└─────────────────────────────────────────┘
           ↑ contains ↓
┌─────────────────────────────────────────┐
│ FACTS (Extracted Data)                  │
│ user=john.doe, attempt=3, max=5         │
└─────────────────────────────────────────┘
```

---

### 8. LSP Diagnostic Data Structure
**File**: `LSP_DIAGNOSTIC_DATA_STRUCTURE.md`  
**Status**: ✅ Complete (referenced in conversation)

**What it covers**:
- Complete JSON schema for diagnostic data
- Field descriptions and types
- Required vs optional fields
- Extension usage patterns

---

## 🔗 How Documents Connect

### The Story Flow

```
1. PATTERN_DESIGN_PHILOSOPHY.md
   ↓ "Here's how pattern matching SHOULD work"
   
2. PARAMETER_EXTRACTION_FIX.md
   ↓ "Here's the bug that broke it and how we fixed it"
   
3. TEMPORAL_ANALYSIS_DESIGN.md
   ↓ "Here's how we detect issues over time"
   
4. PATTERN_TO_ACTION_FRAMEWORK.md
   ↓ "Here's how we turn diagnostics into actions"
   
5. CLIENT_SERVER_LOG_ARCHITECTURE.md
   ↓ "Here's how we handle different log contexts"
   
6. TODO_PATTERN_CATALOG.md
   ↓ "Here's how we'll document all 423 patterns"
   ↓ "And design actions for each one"
   ↓ "With context awareness built in"
```

### The Implementation Flow

```
Log File Opened
   ↓
Context Detection (CLIENT_SERVER_LOG_ARCHITECTURE.md)
   ↓ (client vs server)
Pattern Definition (TODO_PATTERN_CATALOG.md)
   ↓ (context-aware pattern loading)
Pattern Matching (PATTERN_DESIGN_PHILOSOPHY.md)
   ↓
Parameter Extraction (PARAMETER_EXTRACTION_FIX.md)
   ↓
Diagnostic Creation (CITATION_MODEL_IMPLEMENTATION.md)
   ↓
Temporal Analysis (TEMPORAL_ANALYSIS_DESIGN.md)
   ↓ (session-based or aggregate)
Action Design (PATTERN_TO_ACTION_FRAMEWORK.md)
   ↓ (context-specific actions)
Scenario Execution (PATTERN_TO_ACTION_FRAMEWORK.md)
   ↓
Multi-File Correlation (CLIENT_SERVER_LOG_ARCHITECTURE.md)
   ↓
Issue Resolution
```

---

## 🎓 Learning Path

### Path 1: Understanding the System (New Users)
1. **Start**: `PATTERN_DESIGN_PHILOSOPHY.md` - Learn the fundamentals
2. **Context**: `CLIENT_SERVER_LOG_ARCHITECTURE.md` - Understand different log types
3. **Model**: `CITATION_MODEL_IMPLEMENTATION.md` - See the diagnostic model
4. **Time**: `TEMPORAL_ANALYSIS_DESIGN.md` - Understand time-based detection
5. **Action**: `PATTERN_TO_ACTION_FRAMEWORK.md` - See how to fix issues

### Path 2: Implementing Features (Developers)
1. **Architecture**: `COMPLETE_IMPLEMENTATION_GUIDE.md` - Overall system
2. **Contexts**: `CLIENT_SERVER_LOG_ARCHITECTURE.md` - Handle different logs
3. **Debugging**: `PARAMETER_EXTRACTION_FIX.md` - How extraction works
4. **Data**: `LSP_DIAGNOSTIC_DATA_STRUCTURE.md` - Data format reference
5. **Build**: `PATTERN_TO_ACTION_FRAMEWORK.md` - Add actions/scenarios

### Path 3: Creating Patterns (Pattern Authors)
1. **Philosophy**: `PATTERN_DESIGN_PHILOSOPHY.md` - Design principles
2. **Context**: `CLIENT_SERVER_LOG_ARCHITECTURE.md` - Classify pattern context
3. **Catalog**: `TODO_PATTERN_CATALOG.md` - Documentation template
4. **Testing**: `PARAMETER_EXTRACTION_FIX.md` - Verify extraction works
5. **Actions**: `PATTERN_TO_ACTION_FRAMEWORK.md` - Add remediation

---

## 📊 Documentation Status

| Document | Status | Priority | Completeness |
|----------|--------|----------|--------------|
| Pattern Design Philosophy | ✅ Complete | High | 100% |
| Parameter Extraction Fix | ✅ Complete | High | 100% |
| Temporal Analysis Design | ✅ Complete | High | 100% |
| Pattern to Action Framework | ✅ Complete | High | 100% |
| Client-Server Log Architecture | ✅ Complete | High | 100% |
| Pattern Catalog (TODO) | 📋 TODO | Critical | 0% |
| Complete Implementation Guide | ✅ Complete | Medium | 100% |
| Citation Model | ✅ Complete | Medium | 100% |
| LSP Data Structure | ✅ Complete | Medium | 100% |

**Overall Documentation Coverage**: 
- Core Design: ✅ 100% (5/5 documents complete)
- Implementation: ✅ 100% (3/3 documents complete)
- Pattern Catalog: 📋 0% (Critical TODO)

---

## 🚀 Next Steps

### Immediate (This Week)
1. ✅ Review and approve design documentation
2. ✅ Test parameter extraction fix in production
3. 📋 Set up tools for pattern catalog extraction

### Short Term (Next 2 Weeks)
1. 📋 Begin pattern catalog documentation
2. 📋 Document top 20 high-priority patterns
3. 📋 Design actions for RTP, HTTP, Auth patterns
4. 📋 Build first prototype scenario (No Audio Wizard)

### Medium Term (Next Month)
1. 📋 Document 100 most common patterns
2. 📋 Implement action framework
3. 📋 Build 5 core scenarios
4. 📋 Begin temporal analysis implementation

### Long Term (Next Quarter)
1. 📋 Complete all 423 pattern documentation
2. 📋 Full action library (100+ actions)
3. 📋 Scenario library (20+ scenarios)
4. 📋 Multi-file analysis and correlation
5. 📋 Automated remediation system
6. 📋 Predictive alerting

---

## 🎯 Success Criteria

### Documentation Quality
- ✅ All core design documents complete
- ✅ Context architecture documented
- 📋 All 423 patterns documented with context
- 📋 Every pattern has defined actions
- 📋 Every common issue has a scenario

### System Capability
- ✅ Pattern matching works correctly
- ✅ Parameter extraction works correctly
- 📋 Temporal analysis detects stagnation/trends
- 📋 Actions provide remediation guidance
- 📋 Scenarios automate troubleshooting

### User Impact
- 📋 90% reduction in time to diagnosis
- 📋 80% of issues resolved without escalation
- 📋 95% of diagnostics rated as helpful
- 📋 50% of common issues self-remediated

---

## 📞 Document Owners

- **Pattern Design Philosophy**: System Architect
- **Parameter Extraction Fix**: Core Team
- **Temporal Analysis Design**: Analytics Team
- **Pattern to Action Framework**: Solutions Team
- **Client-Server Log Architecture**: Platform Team
- **Pattern Catalog**: Pattern Team (TBD - needs dedicated resources)

---

## 🔄 Document Maintenance

### Review Cadence
- **Weekly**: Implementation guides (as code changes)
- **Monthly**: Design philosophy (as patterns evolve)
- **Quarterly**: Full documentation review

### Version Control
All documents versioned with:
- Last Updated date
- Status indicator
- Change summary in commit messages

### Feedback Loop
- User feedback → Update pattern catalog
- Bug reports → Update implementation guides
- Feature requests → Update framework designs

---

## 📚 Additional Resources

### Related Documentation
- `ARCHITECTURE.md` - Overall system architecture
- `LOGGING_SETUP.md` - Logging configuration
- `BUILD_AND_INSTALL.md` - Build instructions
- `QUICK_START.md` - Getting started guide

### External References
- TagScout pattern database
- LSP specification
- VS Code extension API
- Cisco Jabber log format documentation

---

## 💡 Key Insights

### 1. Pattern Design is About Separation of Concerns
The regex finds, extractors gather, conditions decide, templates explain.

### 2. Time Reveals Truth
Single log lines show state, temporal analysis shows problems.

### 3. Parameters Enable Intelligence
Without extraction, we're just grep. With extraction, we're diagnosis.

### 4. Actions Close the Loop
Diagnostics without actions are just observations. Actions drive resolution.

### 5. Documentation Enables Everything
Can't improve what you don't understand. Can't automate what isn't documented.

### 6. Context is Critical
Same pattern, different logs, different meanings. Client vs server requires different handling.

---

## 🎉 Summary

This documentation suite represents a **complete design** for log analysis from pattern matching through automated remediation:

1. **Philosophy** → Understand the "why"
2. **Implementation** → Build the "how"
3. **Temporal** → Add the "when"
4. **Actions** → Enable the "fix"
5. **Context** → Handle the "where" (client vs server)
6. **Catalog** → Document the "what" (TODO)

**Status**: Core design complete (including context architecture), pattern catalog is next major deliverable.

**Value**: These documents will serve as the foundation for:
- Training new team members
- Designing new features
- Troubleshooting issues
- Building knowledge base
- Creating automated solutions

---

**Last Updated**: 2026-02-17  
**Document Version**: 1.0  
**Status**: ✅ Core Documentation Complete, 📋 Pattern Catalog TODO  
**Next Review**: 2026-03-01