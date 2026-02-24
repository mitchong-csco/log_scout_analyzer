# Scenario 17: Natural Language Query for Feature Analysis 🗣️

**Status:** 📋 Planned  
**Priority:** High (game-changer feature)  
**Feature Area:** Natural Language Analysis  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, I want to ask 'show me all Jabber login sequences' in plain English and have the extension find and analyze all related log entries without manually searching through patterns."*

---

## 📖 Context

Sarah is troubleshooting a Jabber login issue for case 700435046. Currently, she must:

1. **Manually search** through 100+ log files for keywords like "login", "authentication", "XMPP"
2. **Know the exact patterns** - What log messages indicate login start, authentication, success/failure?
3. **Correlate across files** - Login spans multiple subsystems (CUCM, IM&P, LDAP, database)
4. **Understand sequence** - Login is a multi-step process, not a single event
5. **Filter noise** - Not all "login" mentions are relevant to this user's issue

**This is too slow and error-prone.**

Sarah wants to:
- **Ask in natural language** - "Show me all Jabber login sequences"
- **Let AI understand intent** - What patterns, files, and sequences matter
- **Get structured results** - Login attempts grouped by user, timeline, success/failure
- **Drill down interactively** - "Show only failed logins", "What happened before this failure?"

---

## 🎬 Target User Flow

### Step 1: Open Natural Language Query Panel

1. Sarah opens RTMT bundle for case 700435046
2. Clicks **"Ask Scout"** button in toolbar (or Ctrl+Shift+L)
3. Natural Language Query panel appears:

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Ask Scout - Natural Language Analysis                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ What would you like to analyze?                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Show me all Jabber login sequences                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 💡 Try asking:                                              │
│ • "Show all SIP call failures for extension 4001"          │
│ • "Find database performance issues"                       │
│ • "What happened before the service restart?"              │
│ • "Show voicemail retrieval errors"                        │
│ • "Compare login times before and after 10:30am"           │
│                                                             │
│                              [🔍 Analyze]  [Clear]          │
└─────────────────────────────────────────────────────────────┘
```

### Step 2: AI Analyzes Query

4. Sarah types: **"Show me all Jabber login sequences"**
5. Clicks **"Analyze"**
6. System shows analysis progress:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Analyzing your query...                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ Understanding intent: "Jabber login sequences"           │
│    Detected: Feature analysis, login flow, Jabber client    │
│                                                             │
│ ✅ Identifying relevant patterns:                           │
│    • Jabber authentication (XMPP, OAuth)                    │
│    • LDAP user lookup                                       │
│    • Database user profile fetch                            │
│    • Service profile assignment                             │
│    • Presence subscription                                  │
│                                                             │
│ ✅ Searching files:                                         │
│    • CCM*.txt (15 files)                                    │
│    • SDL*.txt (8 files)                                     │
│    • IMP*.txt (3 files)                                     │
│                                                             │
│ ✅ Extracting sequences:                                    │
│    Found 47 login sequences across 12 users                 │
│                                                             │
│ ✅ Correlating events:                                      │
│    Linking authentication → profile fetch → presence        │
│                                                             │
│ Done! (3.2 seconds)                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: View Structured Results

7. Results panel appears with structured analysis:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Query Results: Jabber Login Sequences                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📈 Summary:                                                 │
│ • Total login attempts: 47                                  │
│ • Successful: 42 (89%)                                      │
│ • Failed: 5 (11%)                                           │
│ • Time range: 2026-02-24 08:15:23 - 10:47:12               │
│ • Users: 12 unique users                                    │
│ • Avg login time: 2.3 seconds                               │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🔴 Failed Login Sequences (5):                              │
│                                                             │
│ 1. 🔴 user@domain.com (08:23:45) - LDAP Timeout             │
│    ├─ 08:23:45.123 XMPP connection established             │
│    ├─ 08:23:45.456 Authenticating user@domain.com          │
│    ├─ 08:23:47.789 LDAP query timeout (3.2s)               │
│    └─ 08:23:48.012 Login failed: Authentication timeout    │
│    [View Full Sequence] [View Logs] [Export]               │
│                                                             │
│ 2. 🔴 jsmith@company.com (09:15:22) - Profile Not Found    │
│    ├─ 09:15:22.345 XMPP connection established             │
│    ├─ 09:15:22.678 User authenticated successfully         │
│    ├─ 09:15:23.123 Fetching user profile from DB           │
│    ├─ 09:15:23.456 ERROR: User profile not found           │
│    └─ 09:15:23.567 Login failed: Profile retrieval error   │
│    [View Full Sequence] [View Logs] [Export]               │
│                                                             │
│ ... (3 more failed sequences)                               │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🟢 Successful Login Sequences (42):                         │
│                                                             │
│ [Show All] [Group by User] [Group by Time] [Export CSV]    │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🔍 Insights & Recommendations:                              │
│                                                             │
│ ⚠️  LDAP timeout pattern detected (3 failures)              │
│    Recommendation: Check LDAP server load at 08:00-09:00   │
│                                                             │
│ ℹ️  Average login time increased 40% after 10:00am          │
│    Possible correlation with batch job start time          │
│                                                             │
│        [Ask Follow-up] [Refine Query] [Export Report]      │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Drill Down with Follow-up Questions

8. Sarah clicks **"Ask Follow-up"**
9. Query panel shows context-aware suggestions:

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Follow-up Questions (Context: Jabber Login)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Based on your results, you might want to ask:               │
│                                                             │
│ 🔍 [Show only LDAP timeout failures]                        │
│ 🔍 [What happened on LDAP server during these failures?]    │
│ 🔍 [Compare successful vs failed login sequences]           │
│ 🔍 [Show login times for user@domain.com only]              │
│ 🔍 [What system events occurred before 08:23:45?]           │
│                                                             │
│ Or ask your own:                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [🔍 Analyze]  [Back]           │
└─────────────────────────────────────────────────────────────┘
```

10. Sarah clicks **"Show only LDAP timeout failures"**
11. Results filter to 3 sequences with detailed LDAP timing analysis

### Step 5: View Sequence Details

12. Sarah clicks **"View Full Sequence"** on first failed login
13. Detailed sequence view appears:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Login Sequence Details: user@domain.com                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📅 Timestamp: 2026-02-24 08:23:45.123                      │
│ 👤 User: user@domain.com                                    │
│ 🖥️  Client: Jabber 14.2.1 (Windows)                         │
│ 🌐 Server: uc-cucm-pub1.mihomes.com                         │
│ ⏱️  Total Duration: 2.889 seconds                           │
│ ❌ Result: FAILED (LDAP Timeout)                            │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📝 Event Timeline:                                          │
│                                                             │
│ 🟢 08:23:45.123 (+0ms) XMPP Connection                      │
│    CCM00000001.txt:1423                                     │
│    XMPP client connected from 10.1.2.45                     │
│    [Go to Log]                                              │
│                                                             │
│ 🟢 08:23:45.456 (+333ms) Authentication Start               │
│    CCM00000001.txt:1445                                     │
│    Authenticating user@domain.com via LDAP                  │
│    [Go to Log]                                              │
│                                                             │
│ 🟡 08:23:45.789 (+666ms) LDAP Query Sent                    │
│    SDL00000001.txt:2341                                     │
│    LDAP bind successful, querying user attributes           │
│    Query: (&(objectClass=user)(mail=user@domain.com))       │
│    [Go to Log]                                              │
│                                                             │
│ 🟠 08:23:47.789 (+2666ms) LDAP Timeout Warning              │
│    SDL00000001.txt:2389                                     │
│    ⚠️  LDAP query timeout (elapsed: 2.0s, limit: 3.0s)      │
│    [Go to Log]                                              │
│                                                             │
│ 🔴 08:23:48.012 (+2889ms) Login Failed                      │
│    CCM00000001.txt:1489                                     │
│    ❌ Authentication failed: LDAP timeout                    │
│    Error code: 0x8004E001                                   │
│    [Go to Log]                                              │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🔍 Related Events:                                          │
│                                                             │
│ • LDAP server load: 87% CPU at 08:23:45                     │
│ • 12 concurrent login attempts in same second               │
│ • Previous LDAP timeout: 08:15:23 (8 minutes earlier)       │
│                                                             │
│ 💡 Likely Cause: LDAP server overload during peak hours     │
│                                                             │
│        [Compare with Successful Login]  [Export]  [Close]   │
└─────────────────────────────────────────────────────────────┘
```

### Step 6: Export for TAC Case

14. Sarah clicks **"Export Report"**
15. Export dialog appears:

```
┌─────────────────────────────────────────────────────────────┐
│ 📤 Export Analysis Report                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Query: "Show me all Jabber login sequences"                 │
│ Results: 47 sequences (5 failed, 42 successful)             │
│                                                             │
│ Export Format:                                              │
│ ● Detailed Report (PDF)                                     │
│ ○ Summary Report (Markdown)                                 │
│ ○ Raw Data (CSV)                                            │
│ ○ JSON (API format)                                         │
│                                                             │
│ Include:                                                    │
│ ☑ Executive summary                                         │
│ ☑ Failed sequence details                                   │
│ ☑ Timeline visualizations                                   │
│ ☑ Log excerpts with context (±5 lines)                      │
│ ☑ Insights and recommendations                              │
│ ☐ All successful sequences (42)                             │
│                                                             │
│ File name:                                                  │
│ [jabber-login-analysis-700435046-2026-02-24.pdf]           │
│                                                             │
│                           [Cancel]  [Export]                │
└─────────────────────────────────────────────────────────────┘
```

16. Report exported, ready to attach to TAC case

---

## 🗣️ Example Natural Language Queries

### Troubleshooting Scenarios

#### 1. Feature Analysis
```
"Show me all Jabber login sequences"
"Find all voicemail retrieval attempts"
"Show SIP registration failures"
"Analyze call setup sequences for extension 4001"
```

#### 2. Error Investigation
```
"What database errors occurred today?"
"Show all authentication failures"
"Find timeout errors in the last hour"
"What caused the service restart at 10:30am?"
```

#### 3. Performance Analysis
```
"Show slow database queries (>1 second)"
"Find call setup times over 5 seconds"
"What's the average login time by hour?"
"Compare performance before and after 10am"
```

#### 4. User-Specific Analysis
```
"Show all activity for user jsmith@company.com"
"What happened to extension 4001 between 9am-10am?"
"Find all calls from device SEP123456789ABC"
"Show login history for user@domain.com"
```

#### 5. Correlation & Root Cause
```
"What happened before the database timeout?"
"Show system events around the time of login failure"
"Find related errors across all files"
"What changed between successful and failed attempts?"
```

#### 6. Comparative Analysis
```
"Compare login times this morning vs afternoon"
"Show difference between successful and failed calls"
"How does extension 4001 compare to 4002?"
"Contrast performance on pub1 vs pub2 server"
```

#### 7. Trend Analysis
```
"Show login frequency by hour"
"Graph call failures over time"
"Find patterns in database timeout errors"
"Show busiest time periods"
```

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Natural language understanding** - Parse intent from plain English
- ✅ **Feature recognition** - Identify "login", "call", "voicemail", etc.
- ✅ **Pattern mapping** - Map features to relevant log patterns
- ✅ **Sequence extraction** - Find multi-step processes (not just single events)
- ✅ **Cross-file correlation** - Link events across multiple log files
- ✅ **Structured results** - Present findings in organized, actionable format
- ✅ **Follow-up queries** - Support iterative refinement
- ✅ **Export capabilities** - Generate reports for sharing

### User Experience
- ✅ **< 5 seconds** to analyze typical query
- ✅ **90%+ intent accuracy** - Understands what user wants
- ✅ **Clear results** - Easy to understand findings
- ✅ **Context awareness** - Suggests relevant follow-ups
- ✅ **No training needed** - Intuitive natural language interface

### Technical
- ✅ **Offline-capable** - Works without internet (local LLM)
- ✅ **Privacy-preserving** - No log data sent to cloud
- ✅ **Fast indexing** - Pre-index bundle for quick queries
- ✅ **Scalable** - Handle 1000+ files, 10M+ log lines

---

## 📊 Acceptance Tests

### Test 1: Basic Feature Query
```gherkin
Given a bundle with 47 Jabber login attempts
When user asks "Show me all Jabber login sequences"
Then system returns 47 sequences
And groups them by success/failure
And shows timeline and duration for each
```

### Test 2: Error-Focused Query
```gherkin
Given a bundle with 5 login failures
When user asks "Show only failed Jabber logins"
Then system returns exactly 5 sequences
And highlights failure reasons
And suggests root cause
```

### Test 3: User-Specific Query
```gherkin
Given a bundle with multiple users
When user asks "Show login attempts for jsmith@company.com"
Then system returns only jsmith's login sequences
And shows success rate
And compares to other users
```

### Test 4: Time-Bound Query
```gherkin
Given a bundle spanning 08:00-12:00
When user asks "Show logins between 9am and 10am"
Then system returns only sequences in that time window
And shows hourly distribution
```

### Test 5: Performance Query
```gherkin
Given a bundle with varying login times
When user asks "Show slow login attempts (over 5 seconds)"
Then system returns only sequences >5 seconds
And sorts by duration
And highlights bottlenecks
```

### Test 6: Follow-up Query
```gherkin
Given initial query "Show all Jabber logins"
When user asks follow-up "Show only LDAP failures"
Then system filters previous results
And maintains context
And allows further refinement
```

### Test 7: Comparative Query
```gherkin
Given successful and failed login sequences
When user asks "Compare successful vs failed logins"
Then system shows side-by-side comparison
And highlights key differences
And suggests root cause
```

---

## 🏗️ Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Natural Language Query                    │
│                                                             │
│  User Input                                                 │
│      ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Query Parser (NLP)                                    │  │
│  │ - Intent classification                               │  │
│  │ - Entity extraction (users, times, features)          │  │
│  │ - Action identification (show, find, compare)         │  │
│  └──────────────────────────────────────────────────────┘  │
│      ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Feature Mapper                                        │  │
│  │ - "login" → Jabber auth patterns                      │  │
│  │ - "call" → SIP INVITE/BYE sequences                   │  │
│  │ - "voicemail" → Unity Connection patterns             │  │
│  └──────────────────────────────────────────────────────┘  │
│      ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Pattern Orchestrator                                  │  │
│  │ - Select relevant patterns from library               │  │
│  │ - Apply to indexed log data                           │  │
│  │ - Extract matching sequences                          │  │
│  └──────────────────────────────────────────────────────┘  │
│      ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Sequence Correlator                                   │  │
│  │ - Link related events across files                    │  │
│  │ - Build timeline for each sequence                    │  │
│  │ - Identify start/end/failure points                   │  │
│  └──────────────────────────────────────────────────────┘  │
│      ↓                                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Result Formatter                                      │  │
│  │ - Structure findings                                  │  │
│  │ - Generate insights                                   │  │
│  │ - Suggest follow-ups                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│      ↓                                                      │
│  Results Panel                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Structures

```typescript
interface NaturalLanguageQuery {
  rawQuery: string;
  parsedIntent: Intent;
  entities: Entity[];
  context?: QueryContext;
}

interface Intent {
  action: 'show' | 'find' | 'analyze' | 'compare' | 'explain';
  feature: 'login' | 'call' | 'voicemail' | 'error' | 'performance';
  modifiers: QueryModifier[];
}

interface Entity {
  type: 'user' | 'extension' | 'device' | 'time' | 'duration' | 'status';
  value: string;
  confidence: number;
}

interface QueryModifier {
  type: 'filter' | 'sort' | 'group' | 'limit' | 'timerange';
  value: any;
}

interface QueryContext {
  previousQuery?: NaturalLanguageQuery;
  previousResults?: AnalysisResult[];
  bundleMetadata: BundleMetadata;
  sessionId: string;
}

interface AnalysisResult {
  queryId: string;
  sequences: FeatureSequence[];
  summary: ResultSummary;
  insights: Insight[];
  suggestedFollowUps: string[];
}

interface FeatureSequence {
  id: string;
  feature: string;
  user?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failure' | 'partial';
  events: SequenceEvent[];
  metadata: Record<string, any>;
}

interface SequenceEvent {
  timestamp: Date;
  file: string;
  line: number;
  severity: string;
  message: string;
  category: 'start' | 'progress' | 'success' | 'error' | 'end';
  parsedData?: Record<string, any>;
}

interface ResultSummary {
  totalSequences: number;
  successCount: number;
  failureCount: number;
  timeRange: { start: Date; end: Date };
  uniqueUsers: number;
  avgDuration: number;
}

interface Insight {
  type: 'warning' | 'info' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  relatedSequences: string[];
}
```

### Query Parser Implementation

```typescript
class NaturalLanguageQueryParser {
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  
  async parse(query: string, context?: QueryContext): Promise<NaturalLanguageQuery> {
    // Normalize query
    const normalized = this.normalize(query);
    
    // Classify intent
    const intent = await this.intentClassifier.classify(normalized);
    
    // Extract entities
    const entities = await this.entityExtractor.extract(normalized, intent);
    
    // Apply context if available (follow-up query)
    if (context?.previousQuery) {
      this.applyContext(intent, entities, context);
    }
    
    return {
      rawQuery: query,
      parsedIntent: intent,
      entities,
      context
    };
  }
  
  private normalize(query: string): string {
    // Convert to lowercase, remove punctuation, standardize
    return query
      .toLowerCase()
      .trim()
      .replace(/[?!.]/g, '');
  }
}

class IntentClassifier {
  async classify(query: string): Promise<Intent> {
    // Use pattern matching + simple ML for intent detection
    
    // Detect action
    const action = this.detectAction(query);
    
    // Detect feature
    const feature = this.detectFeature(query);
    
    // Detect modifiers
    const modifiers = this.detectModifiers(query);
    
    return { action, feature, modifiers };
  }
  
  private detectAction(query: string): Intent['action'] {
    if (/\b(show|display|list)\b/.test(query)) return 'show';
    if (/\b(find|search|locate)\b/.test(query)) return 'find';
    if (/\b(analyze|examine|investigate)\b/.test(query)) return 'analyze';
    if (/\b(compare|diff|contrast)\b/.test(query)) return 'compare';
    if (/\b(explain|why|what caused)\b/.test(query)) return 'explain';
    return 'show'; // Default
  }
  
  private detectFeature(query: string): Intent['feature'] {
    if (/\b(login|logon|signin|authentication)\b/.test(query)) return 'login';
    if (/\b(call|invite|sip|dial)\b/.test(query)) return 'call';
    if (/\b(voicemail|vm|message)\b/.test(query)) return 'voicemail';
    if (/\b(error|failure|fail)\b/.test(query)) return 'error';
    if (/\b(performance|slow|timeout)\b/.test(query)) return 'performance';
    return 'error'; // Default to errors if unclear
  }
  
  private detectModifiers(query: string): QueryModifier[] {
    const modifiers: QueryModifier[] = [];
    
    // Time range
    const timeMatch = query.match(/\b(between|from|after|before)\s+([\d:apm\s-]+)/i);
    if (timeMatch) {
      modifiers.push({
        type: 'timerange',
        value: this.parseTimeRange(timeMatch[2])
      });
    }
    
    // Filter by user
    const userMatch = query.match(/\bfor\s+(user\s+)?(\S+@\S+|\S+)/i);
    if (userMatch) {
      modifiers.push({
        type: 'filter',
        value: { field: 'user', value: userMatch[2] }
      });
    }
    
    // Filter by status
    if (/\b(failed|failure|unsuccessful)\b/.test(query)) {
      modifiers.push({
        type: 'filter',
        value: { field: 'status', value: 'failure' }
      });
    } else if (/\b(successful|succeeded)\b/.test(query)) {
      modifiers.push({
        type: 'filter',
        value: { field: 'status', value: 'success' }
      });
    }
    
    // Duration filter
    const durationMatch = query.match(/\b(over|above|more than|greater than)\s+(\d+)\s*(seconds?|sec|s|ms|milliseconds?)\b/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[2]);
      const unit = durationMatch[3];
      const ms = unit.includes('ms') ? value : value * 1000;
      modifiers.push({
        type: 'filter',
        value: { field: 'duration', operator: '>', value: ms }
      });
    }
    
    // Sorting
    if (/\b(slowest|longest)\b/.test(query)) {
      modifiers.push({
        type: 'sort',
        value: { field: 'duration', order: 'desc' }
      });
    }
    
    // Grouping
    if (/\b(group by|grouped by)\s+(\w+)/i.test(query)) {
      const match = query.match(/\b(group by|grouped by)\s+(\w+)/i);
      modifiers.push({
        type: 'group',
        value: match![2]
      });
    }
    
    return modifiers;
  }
}
```

### Feature Mapper

```typescript
class FeatureMapper {
  private featureDefinitions: Map<string, FeatureDefinition>;
  
  constructor() {
    this.featureDefinitions = new Map([
      ['login', {
        name: 'Jabber Login',
        patterns: [
          'jabber.*authentication.*start',
          'xmpp.*connection.*established',
          'ldap.*user.*query',
          'user.*profile.*fetch',
          'presence.*subscription',
          'login.*(success|fail|complete)'
        ],
        startIndicators: ['xmpp.*connection', 'authentication.*start'],
        endIndicators: ['login.*success', 'login.*fail', 'authentication.*complete'],
        sequenceTimeout: 30000, // 30 seconds
        requiredFields: ['user', 'timestamp'],
        relatedFiles: ['CCM*.txt', 'SDL*.txt', 'IMP*.txt']
      }],
      ['call', {
        name: 'SIP Call',
        patterns: [
          'sip.*invite',
          'trying.*100',
          'ringing.*180',
          'ok.*200',
          'ack',
          'bye',
          'cancel'
        ],
        startIndicators: ['invite'],
        endIndicators: ['bye', 'cancel'],
        sequenceTimeout: 300000, // 5 minutes
        requiredFields: ['callId', 'from', 'to'],
        relatedFiles: ['CCM*.txt', 'SDL*.txt']
      }]
      // ... more features
    ]);
  }
  
  getFeatureDefinition(feature: string): FeatureDefinition {
    return this.featureDefinitions.get(feature)!;
  }
}

interface FeatureDefinition {
  name: string;
  patterns: string[];
  startIndicators: string[];
  endIndicators: string[];
  sequenceTimeout: number;
  requiredFields: string[];
  relatedFiles: string[];
}
```

### Sequence Correlator

```typescript
class SequenceCorrelator {
  async extractSequences(
    intent: Intent,
    entities: Entity[],
    featureDef: FeatureDefinition,
    logIndex: LogIndex
  ): Promise<FeatureSequence[]> {
    // Find all matching log entries
    const entries = await this.findMatchingEntries(featureDef, logIndex);
    
    // Group into sequences by correlation keys
    const sequences = await this.correlateEntries(entries, featureDef);
    
    // Apply filters from entities
    const filtered = this.applyFilters(sequences, entities);
    
    // Sort and enrich
    const enriched = await this.enrichSequences(filtered);
    
    return enriched;
  }
  
  private async correlateEntries(
    entries: LogEntry[],
    featureDef: FeatureDefinition
  ): Promise<FeatureSequence[]> {
    const sequences: Map<string, FeatureSequence> = new Map();
    
    for (const entry of entries) {
      // Extract correlation key (e.g., userId, callId)
      const correlationKey = this.extractCorrelationKey(entry, featureDef);
      
      if (!sequences.has(correlationKey)) {
        // Start new sequence
        sequences.set(correlationKey, {
          id: this.generateSequenceId(),
          feature: featureDef.name,
          user: this.extractUser(entry),
          startTime: entry.timestamp,
          endTime: entry.timestamp,
          duration: 0,
          status: 'partial',
          events: [],
          metadata: {}
        });
      }
      
      // Add event to sequence
      const sequence = sequences.get(correlationKey)!;
      sequence.events.push({
        timestamp: entry.timestamp,
        file: entry.file,
        line: entry.line,
        severity: entry.severity,
        message: entry.message,
        category: this.categorizeEvent(entry, featureDef),
        parsedData: entry.parsedData
      });
      
      // Update end time
      if (entry.timestamp > sequence.endTime) {
        sequence.endTime = entry.timestamp;
      }
      
      // Check if sequence is complete
      if (this.isSequenceComplete(sequence, featureDef)) {
        sequence.duration = sequence.endTime.getTime() - sequence.startTime.getTime();
        sequence.status = this.determineStatus(sequence, featureDef);
      }
    }
    
    return Array.from(sequences.values());
  }
  
  private categorizeEvent(entry: LogEntry, featureDef: FeatureDefinition): SequenceEvent['category'] {
    const message = entry.message.toLowerCase();
    
    if (featureDef.startIndicators.some(pattern => new RegExp(pattern).test(message))) {
      return 'start';
    }
    if (featureDef.endIndicators.some(pattern => new RegExp(pattern).test(message))) {
      return 'end';
    }
    if (/\b(error|fail|timeout)\b/.test(message)) {
      return 'error';
    }
    if (/\b(success|complete|ok|200)\b/.test(message)) {
      return 'success';
    }
    return 'progress';
  }
  
  private determineStatus(sequence: FeatureSequence, featureDef: FeatureDefinition): 'success' | 'failure' | 'partial' {
    const lastEvent = sequence.events[sequence.events.length - 1];
    
    if (lastEvent.category === 'error') {
      return 'failure';
    }
    if (lastEvent.category === 'success') {
      return 'success';
    }
    
    // Check if timed out
    if (sequence.duration > featureDef.sequenceTimeout) {
      return 'failure';
    }
    
    return 'partial';
  }
}
```

---

## 🚀 Implementation Phases

### Phase 1: Query Parser (Week 1)
- [ ] Define intent classification rules
- [ ] Implement entity extraction
- [ ] Build query normalization
- [ ] Test with 50+ example queries
- [ ] 90%+ intent accuracy

### Phase 2: Feature Definitions (Week 1-2)
- [ ] Define login sequence patterns
- [ ] Define call sequence patterns
- [ ] Define voicemail sequence patterns
- [ ] Define error patterns
- [ ] Test pattern matching accuracy

### Phase 3: Sequence Correlator (Week 2-3)
- [ ] Build event correlation engine
- [ ] Implement timeline construction
- [ ] Add status determination logic
- [ ] Test with real log bundles
- [ ] Performance: < 5s for typical bundle

### Phase 4: UI - Query Panel (Week 3)
- [ ] Create natural language input UI
- [ ] Build progress indicator
- [ ] Add query suggestions
- [ ] Implement context-aware follow-ups

### Phase 5: UI - Results Display (Week 4)
- [ ] Build structured results view
- [ ] Add sequence detail panel
- [ ] Implement timeline visualization
- [ ] Add filtering and sorting

### Phase 6: Insights Generation (Week 5)
- [ ] Analyze patterns in results
- [ ] Generate recommendations
- [ ] Detect anomalies
- [ ] Suggest root causes

### Phase 7: Export & Reporting (Week 5)
- [ ] Build PDF report generator
- [ ] Add CSV export
- [ ] Create markdown summaries
- [ ] Test report quality

### Phase 8: Optimization (Week 6)
- [ ] Optimize query parsing (< 100ms)
- [ ] Cache feature definitions
- [ ] Pre-index bundles
- [ ] Performance tuning

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 90%+ intent classification accuracy
- ✅ 85%+ entity extraction accuracy
- ✅ < 5 seconds query processing time
- ✅ < 100ms query parsing
- ✅ Support 20+ query types

### User Metrics
- ✅ 80% of engineers use NL query weekly
- ✅ Average 5-7 queries per investigation
- ✅ 90% find results helpful
- ✅ 70% prefer NL over manual search
- ✅ < 30 seconds to get actionable insights

### Business Impact
- ✅ 60% faster root cause analysis
- ✅ Reduced TAC escalation time
- ✅ Better case documentation
- ✅ Knowledge sharing improved
- ✅ Training time reduced (intuitive interface)

---

## 🔗 Related Documentation

- **Scenario 6:** SIP Call Flow Analysis (related feature)
- **Scenario 10-16:** Pattern Overlays (pattern library foundation)
- **Technical:** `PATTERN_SYSTEM.md` (pattern definitions)
- **AI Assisted:** `AI_ASSISTED_PATTERN_DISCOVERY.md` (ML integration)

---

## 📝 Notes

### Design Decisions

1. **Why offline-first?** - Enterprise security requirements, no log data to cloud
2. **Why simple NLP vs full LLM?** - Balance accuracy with performance and privacy
3. **Why sequence-based?** - Features are processes, not single events
4. **Why context-aware follow-ups?** - Iterative investigation is natural workflow

### Privacy & Security

- ✅ **No cloud AI** - All processing local
- ✅ **No log upload** - Data stays on user's machine
- ✅ **No telemetry** - Query patterns not tracked
- ✅ **Offline capable** - Works in air-gapped environments

### Performance Considerations

**Pre-indexing Strategy:**
```
On bundle open:
1. Build log line index (file, line, timestamp)
2. Extract common entities (users, extensions, devices)
3. Cache pattern matches for common features
4. Store in memory for fast queries

Result: First query fast, subsequent queries instant
```

**Query Optimization:**
```
1. Parse query → < 100ms
2. Map to patterns → < 50ms
3. Apply to index → < 2s (10k+ lines)
4. Correlate sequences → < 1s
5. Format results → < 500ms
Total: < 5s for typical bundle
```

### Future Enhancements

- **Voice queries** - "Alexa, show me Jabber login failures"
- **Query templates** - Save common queries for reuse
- **Query history** - Previous queries accessible
- **Shared queries** - Team can share useful queries
- **ML improvements** - Learn from user feedback
- **Multi-bundle queries** - "Compare logins across 3 bundles"
- **Predictive queries** - "You might want to check..."
- **Advanced NLP** - More complex query understanding

### Example Query Templates

**Login Analysis:**
```
- "Show all {feature} login attempts"
- "Find failed logins for {user}"
- "Compare login times {timerange}"
- "Show {feature} authentication errors"
```

**Performance Analysis:**
```
- "Find slow {feature} operations (> {duration})"
- "Show {feature} response times by hour"
- "Compare {feature} performance {timerange}"
- "What's slowing down {feature}?"
```

**Error Investigation:**
```
- "Show all {feature} errors"
- "What caused {feature} failure at {time}?"
- "Find {error_type} errors"
- "Show error patterns"
```

**User Activity:**
```
- "Show all activity for {user}"
- "What did {user} do at {time}?"
- "Find {user}'s {feature} attempts"
- "Compare {user1} vs {user2} activity"
```

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 1)  
**Assigned To:** TBD