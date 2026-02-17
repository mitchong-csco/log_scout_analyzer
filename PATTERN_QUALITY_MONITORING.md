# Pattern Quality Monitoring & Override Suggestions

> **Automatically detect problematic patterns and suggest overrides**  
> **Status:** Design Document  
> **Related:** `PATTERN_OVERRIDE_INTEGRATION.md`, `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md`

---

## Overview

The Pattern Quality Monitoring system automatically detects when patterns are not working correctly and suggests overrides to fix them. This helps users identify and fix broken patterns before they waste time debugging.

**Key Problem:** Users don't know a pattern is broken until they see unsubstituted placeholders like `{{ mergeValue }}` or notice missing diagnostics.

**Solution:** Monitor pattern execution in real-time, detect quality issues, and proactively suggest fixes.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Detection Strategies](#detection-strategies)
3. [Architecture](#architecture)
4. [Implementation Plan](#implementation-plan)
5. [User Experience](#user-experience)
6. [Future Enhancements](#future-enhancements)

---

## Problem Statement

### Issues We Can Detect

#### 1. **Failed Parameter Extraction**
```
Pattern: "HTTP response with status {{ CODE }}"
Log line: "HTTP response with status 200"
Result: "HTTP response with status {{ CODE }}"  ❌
Problem: Extractor regex `([45]\d{2})` doesn't match "200"
```

#### 2. **Pattern Misclassification**
```
Pattern Type: Single-line diagnostic
Actual Need: Temporal analysis (start/end pair)
Example: 
  - "Transaction started" (should correlate with)
  - "Transaction completed in 5s"
Problem: Treated as two separate issues instead of one temporal flow
```

#### 3. **Overly Strict Regex**
```
Pattern: "Error code (\d{4})"
Log line: "Error code ABC-123"
Result: No match
Problem: Pattern assumes numeric codes only
```

#### 4. **Missing Context**
```
Pattern: "Connection failed"
Suggestion: Should extract IP, port, reason for better diagnostics
Problem: Pattern matches but provides minimal actionable info
```

#### 5. **Performance Issues**
```
Pattern: ".*error.*" with backtracking
Log line: Very long line without "error"
Result: 10+ seconds to process
Problem: Catastrophic backtracking in regex
```

---

## Detection Strategies

### Strategy 1: Post-Diagnostic Analysis

**When:** After a diagnostic is created  
**What:** Check for unsubstituted placeholders  
**How:** Scan message for `{{ }}` patterns

```rust
fn detect_failed_extraction(diagnostic: &Diagnostic) -> Option<QualityIssue> {
    let placeholder_regex = Regex::new(r"\{\{\s*(\w+)\s*\}\}").unwrap();
    
    if let Some(captures) = placeholder_regex.captures(&diagnostic.message) {
        let failed_param = captures.get(1).unwrap().as_str();
        
        return Some(QualityIssue {
            issue_type: QualityIssueType::FailedExtraction,
            pattern_id: diagnostic.pattern_id.clone(),
            parameter_name: Some(failed_param.to_string()),
            log_line: diagnostic.source_line.clone(),
            severity: IssueSeverity::High,
            suggestion: suggest_extractor_fix(diagnostic, failed_param),
        });
    }
    
    None
}
```

### Strategy 2: Pattern Match Failure Tracking

**When:** Pattern regex matches but creates no useful diagnostic  
**What:** Track patterns that match but produce low-quality results  
**How:** Score diagnostics based on completeness

```rust
struct PatternMatchStats {
    pattern_id: String,
    total_matches: u32,
    failed_extractions: u32,
    empty_parameters: u32,
    average_confidence: f32,
}

fn track_pattern_quality(stats: &mut PatternMatchStats, diagnostic: &Diagnostic) {
    stats.total_matches += 1;
    
    // Check for failed extractions
    if diagnostic.message.contains("{{") {
        stats.failed_extractions += 1;
    }
    
    // Check for empty parameters
    let empty_params = diagnostic.parameters
        .values()
        .filter(|v| v.is_empty())
        .count();
    stats.empty_parameters += empty_params as u32;
    
    // Calculate quality score
    let quality_score = calculate_quality_score(diagnostic);
    stats.average_confidence = 
        (stats.average_confidence * (stats.total_matches - 1) as f32 + quality_score) 
        / stats.total_matches as f32;
    
    // Trigger alert if quality drops below threshold
    if stats.average_confidence < 0.5 && stats.total_matches >= 10 {
        trigger_quality_alert(stats);
    }
}
```

### Strategy 3: Temporal Pattern Detection

**When:** Analyzing log sequences  
**What:** Detect start/end patterns that should be correlated  
**How:** Look for matching pairs in temporal proximity

```rust
fn detect_uncorrelated_temporal_patterns(diagnostics: &[Diagnostic]) -> Vec<QualityIssue> {
    let mut issues = Vec::new();
    
    // Common temporal indicators
    let start_keywords = ["started", "begin", "opening", "connecting"];
    let end_keywords = ["completed", "finished", "closed", "disconnected"];
    
    for diagnostic in diagnostics {
        let msg_lower = diagnostic.message.to_lowercase();
        
        let has_start = start_keywords.iter().any(|kw| msg_lower.contains(kw));
        let has_end = end_keywords.iter().any(|kw| msg_lower.contains(kw));
        
        if (has_start || has_end) && !diagnostic.pattern_type.is_temporal() {
            issues.push(QualityIssue {
                issue_type: QualityIssueType::MisclassifiedPattern,
                pattern_id: diagnostic.pattern_id.clone(),
                severity: IssueSeverity::Medium,
                suggestion: Some(OverrideSuggestion {
                    suggested_type: PatternType::Temporal,
                    reason: format!(
                        "Pattern contains temporal keyword '{}' but is classified as single-line",
                        if has_start { "start" } else { "end" }
                    ),
                }),
            });
        }
    }
    
    issues
}
```

### Strategy 4: Performance Monitoring

**When:** During pattern matching  
**What:** Track regex execution time  
**How:** Instrument pattern matching with timing

```rust
fn monitor_pattern_performance(pattern: &CompiledPattern, line: &str) -> Option<QualityIssue> {
    let start = Instant::now();
    let result = pattern.regex.is_match(line);
    let duration = start.elapsed();
    
    // Flag patterns that take >100ms
    if duration.as_millis() > 100 {
        return Some(QualityIssue {
            issue_type: QualityIssueType::PerformanceIssue,
            pattern_id: pattern.id.clone(),
            severity: IssueSeverity::Medium,
            suggestion: Some(OverrideSuggestion {
                suggested_fix: "Simplify regex to avoid backtracking".to_string(),
                example: format!(
                    "Consider replacing '.*' with more specific patterns. \
                     Current execution time: {}ms",
                    duration.as_millis()
                ),
            }),
        });
    }
    
    None
}
```

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         LSP Server                              │
│                                                                 │
│  ┌────────────────────┐         ┌─────────────────────────┐   │
│  │  Pattern Engine    │────────▶│  Quality Monitor        │   │
│  │  - Match patterns  │         │  - Detect issues        │   │
│  │  - Extract params  │         │  - Track stats          │   │
│  │  - Create diag     │         │  - Score quality        │   │
│  └────────────────────┘         └──────────┬──────────────┘   │
│                                             │                   │
│                                             ▼                   │
│                                  ┌─────────────────────┐       │
│                                  │  Issue Aggregator   │       │
│                                  │  - Group by pattern │       │
│                                  │  - Calculate scores │       │
│                                  │  - Rank by severity │       │
│                                  └──────────┬──────────┘       │
│                                             │                   │
│                                             ▼                   │
│                                  ┌─────────────────────┐       │
│                                  │ Suggestion Engine   │       │
│                                  │ - Generate fixes    │       │
│                                  │ - Auto-fix simple   │       │
│                                  │ - Suggest overrides │       │
│                                  └──────────┬──────────┘       │
└────────────────────────────────────────────┼────────────────────┘
                                              │ Send via LSP
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VSCode Extension                           │
│                                                                 │
│  ┌────────────────────┐         ┌─────────────────────────┐   │
│  │ Quality Issues     │         │ Override Suggestions    │   │
│  │ Panel/TreeView     │◀────────│ Notification Handler    │   │
│  │ - Show issues      │         │ - Toast notifications   │   │
│  │ - Apply fixes      │         │ - Quick fix actions     │   │
│  └────────────────────┘         └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Structures

```rust
/// Quality issue detected in a pattern
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityIssue {
    pub issue_type: QualityIssueType,
    pub pattern_id: String,
    pub pattern_name: Option<String>,
    pub severity: IssueSeverity,
    pub description: String,
    pub log_line: Option<String>,
    pub parameter_name: Option<String>,
    pub suggestion: Option<OverrideSuggestion>,
    pub occurrences: u32,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QualityIssueType {
    FailedExtraction,           // Parameter extractor didn't match
    MisclassifiedPattern,       // Wrong pattern type (single vs temporal)
    PerformanceIssue,           // Slow regex execution
    LowConfidence,              // Pattern matches but confidence is low
    MissingContext,             // Pattern should extract more info
    OverlyPermissive,           // Pattern matches too many lines
    RegexError,                 // Regex compilation or execution error
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IssueSeverity {
    Critical,   // Pattern completely broken (100% failure rate)
    High,       // Frequent failures (>50% failure rate)
    Medium,     // Occasional failures (10-50% failure rate)
    Low,        // Minor issues (<10% failure rate)
    Info,       // Suggestions for improvement
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverrideSuggestion {
    pub suggested_fix: String,
    pub confidence: f32,
    pub auto_apply: bool,
    pub override_data: Option<PatternOverrideData>,
    pub reason: String,
    pub example: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternOverrideData {
    pub parameter_extractors: Option<HashMap<String, String>>,
    pub severity: Option<String>,
    pub pattern_type: Option<PatternType>,
    pub regex: Option<String>,
}
```

### Quality Monitoring Service

```rust
pub struct QualityMonitor {
    issues: Arc<RwLock<HashMap<String, QualityIssue>>>,
    stats: Arc<RwLock<HashMap<String, PatternMatchStats>>>,
    notification_sender: Sender<QualityNotification>,
}

impl QualityMonitor {
    /// Check diagnostic quality after creation
    pub fn analyze_diagnostic(&self, diagnostic: &Diagnostic, pattern: &CompiledPattern) {
        // Check for failed extractions
        if let Some(issue) = self.check_failed_extraction(diagnostic, pattern) {
            self.record_issue(issue);
        }
        
        // Check for pattern misclassification
        if let Some(issue) = self.check_misclassification(diagnostic) {
            self.record_issue(issue);
        }
        
        // Update statistics
        self.update_stats(&pattern.id, diagnostic);
        
        // Check if we should trigger notification
        if self.should_notify(&pattern.id) {
            self.send_notification(&pattern.id);
        }
    }
    
    /// Record a quality issue
    fn record_issue(&self, issue: QualityIssue) {
        let mut issues = self.issues.write().unwrap();
        
        let key = format!("{}-{:?}", issue.pattern_id, issue.issue_type);
        
        if let Some(existing) = issues.get_mut(&key) {
            // Update existing issue
            existing.occurrences += 1;
            existing.last_seen = Utc::now();
        } else {
            // New issue
            issues.insert(key, issue);
        }
    }
    
    /// Generate override suggestion for an issue
    pub fn generate_suggestion(&self, issue: &QualityIssue) -> Option<OverrideSuggestion> {
        match issue.issue_type {
            QualityIssueType::FailedExtraction => {
                self.suggest_extractor_fix(issue)
            }
            QualityIssueType::MisclassifiedPattern => {
                self.suggest_type_change(issue)
            }
            QualityIssueType::PerformanceIssue => {
                self.suggest_regex_optimization(issue)
            }
            _ => None,
        }
    }
    
    /// Suggest fix for failed parameter extraction
    fn suggest_extractor_fix(&self, issue: &QualityIssue) -> Option<OverrideSuggestion> {
        let param_name = issue.parameter_name.as_ref()?;
        let log_line = issue.log_line.as_ref()?;
        
        // Try to infer what the extractor should match
        let suggested_regex = self.infer_extraction_pattern(param_name, log_line)?;
        
        Some(OverrideSuggestion {
            suggested_fix: format!(
                "Update '{}' extractor to match actual values",
                param_name
            ),
            confidence: 0.8,
            auto_apply: false,
            override_data: Some(PatternOverrideData {
                parameter_extractors: Some(HashMap::from([
                    (param_name.clone(), suggested_regex.clone())
                ])),
                ..Default::default()
            }),
            reason: format!(
                "Current extractor doesn't match '{}' in log line",
                log_line
            ),
            example: Some(format!(
                "Suggested regex: {}\nTest line: {}",
                suggested_regex, log_line
            )),
        })
    }
    
    /// Infer extraction pattern from log line
    fn infer_extraction_pattern(&self, param_name: &str, log_line: &str) -> Option<String> {
        match param_name.to_uppercase().as_str() {
            "CODE" | "STATUS" => {
                // Look for numeric codes
                if log_line.contains(char::is_numeric) {
                    Some(r"(\d{3})".to_string())
                } else {
                    Some(r"([A-Z0-9_-]+)".to_string())
                }
            }
            "IP" | "ADDRESS" => {
                Some(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})".to_string())
            }
            "PORT" => {
                Some(r"(\d{1,5})".to_string())
            }
            "TIME" | "DURATION" => {
                Some(r"(\d+(?:\.\d+)?)\s*(?:ms|s|sec|seconds?)".to_string())
            }
            _ => {
                // Generic: any word or number
                Some(r"(\S+)".to_string())
            }
        }
    }
}
```

---

## Implementation Plan

### Phase 1: Basic Detection (2-3 days)

**Goal:** Detect failed parameter extractions

**Tasks:**
1. **Add Quality Monitor to LSP Server**
   - [ ] Create `quality_monitor.rs` module
   - [ ] Implement `QualityIssue` and related structs
   - [ ] Add post-diagnostic analysis hook

2. **Detect Unsubstituted Placeholders**
   - [ ] Scan diagnostic messages for `{{ }}` patterns
   - [ ] Record pattern ID and parameter name
   - [ ] Track occurrences and frequency

3. **Generate Simple Notifications**
   - [ ] Send LSP notification to VSCode
   - [ ] Include pattern ID and issue description

**Acceptance Criteria:**
- [ ] Failed extractions detected
- [ ] Notifications sent to VSCode
- [ ] No performance impact (<1ms overhead)

### Phase 2: Override Suggestions (3-4 days)

**Goal:** Generate and apply override suggestions

**Tasks:**
1. **Implement Suggestion Engine**
   - [ ] Add pattern inference logic
   - [ ] Generate override data structures
   - [ ] Calculate confidence scores

2. **VSCode UI Integration**
   - [ ] Show toast notification for issues
   - [ ] Add "Apply Suggested Fix" quick action
   - [ ] Preview override before applying

3. **Auto-Apply Simple Fixes**
   - [ ] Identify high-confidence suggestions
   - [ ] Prompt user for approval
   - [ ] Apply override and reload patterns

**Acceptance Criteria:**
- [ ] Suggestions are reasonable (manually verify)
- [ ] User can preview before applying
- [ ] Applied overrides work correctly

### Phase 3: Quality Dashboard (2-3 days)

**Goal:** Comprehensive pattern quality view

**Tasks:**
1. **Create Quality TreeView**
   - [ ] Group issues by severity
   - [ ] Show pattern names and issue counts
   - [ ] Allow drill-down to details

2. **Pattern Health Scores**
   - [ ] Calculate overall quality score per pattern
   - [ ] Highlight patterns needing attention
   - [ ] Show trend over time

3. **Batch Operations**
   - [ ] Apply multiple fixes at once
   - [ ] Export issues for reporting
   - [ ] Dismiss false positives

**Acceptance Criteria:**
- [ ] Dashboard shows all quality issues
- [ ] Health scores are accurate
- [ ] Batch operations work correctly

### Phase 4: Advanced Detection (3-5 days)

**Goal:** Detect misclassification and performance issues

**Tasks:**
1. **Temporal Pattern Detection**
   - [ ] Identify start/end keyword patterns
   - [ ] Suggest temporal correlation
   - [ ] Provide example override

2. **Performance Monitoring**
   - [ ] Instrument regex execution
   - [ ] Flag slow patterns (>100ms)
   - [ ] Suggest optimizations

3. **Context Analysis**
   - [ ] Detect patterns that should extract more info
   - [ ] Suggest additional extractors
   - [ ] Provide examples from logs

**Acceptance Criteria:**
- [ ] Temporal patterns identified correctly
- [ ] Performance issues caught
- [ ] Context suggestions are helpful

---

## User Experience

### Notification Flow

#### 1. **Real-Time Toast Notification**

When a quality issue is detected:

```
┌─────────────────────────────────────────────────────┐
│ ⚠️  Pattern Quality Issue Detected                 │
│                                                     │
│ Pattern: "HTTP Error Pattern"                       │
│ Issue: Parameter 'CODE' not extracted               │
│                                                     │
│ Found in 5 log lines                                │
│                                                     │
│ [View Details]  [Apply Suggested Fix]  [Dismiss]   │
└─────────────────────────────────────────────────────┘
```

#### 2. **Quick Fix Action**

When user clicks "Apply Suggested Fix":

```
┌─────────────────────────────────────────────────────┐
│ Preview Override Suggestion                         │
│                                                     │
│ Parameter: CODE                                     │
│ Current:   ([45]\d{2})                             │
│ Suggested: (\d{3})                                 │
│                                                     │
│ Reason: Current extractor doesn't match 2xx codes  │
│                                                     │
│ Example:                                            │
│   Log: "HTTP response with status 200"             │
│   Current: HTTP response with status {{ CODE }}    │
│   Fixed:   HTTP response with status 200           │
│                                                     │
│ Confidence: High (85%)                              │
│                                                     │
│ [Apply Override]  [Edit First]  [Cancel]           │
└─────────────────────────────────────────────────────┘
```

#### 3. **Quality Dashboard**

TreeView in sidebar:

```
📊 Pattern Quality
  ⚠️ Critical Issues (1)
    ├─ HTTP Error Pattern
    │   └─ Failed extraction: CODE (12 occurrences)
  ⚠️ High Priority (3)
    ├─ Transaction Start/End
    │   └─ Should be temporal pattern
    ├─ Connection Error
    │   └─ Missing context extractors
    └─ Database Query
        └─ Performance issue (150ms avg)
  ℹ️ Suggestions (5)
    └─ ...
```

### Commands

```
Log Scout: View Pattern Quality Issues
Log Scout: Apply Suggested Overrides
Log Scout: Dismiss Quality Issue
Log Scout: Export Quality Report
Log Scout: Show Pattern Health Score
```

---

## Configuration

### Settings

```json
{
  "logScout.quality.enabled": true,
  "logScout.quality.notificationThreshold": "high",
  "logScout.quality.autoApplyHighConfidence": false,
  "logScout.quality.trackingWindowHours": 24,
  "logScout.quality.minOccurrencesForAlert": 5,
  "logScout.quality.performanceThresholdMs": 100
}
```

### Disable for Specific Patterns

```json
{
  "overrides": {
    "override-pattern123": {
      "qualityMonitoring": {
        "enabled": false,
        "reason": "Known issue, working as intended"
      }
    }
  }
}
```

---

## Future Enhancements

### V2.0 Features

1. **Machine Learning Suggestions**
   - Train on successfully applied overrides
   - Predict fixes based on similar patterns
   - Improve confidence scores over time

2. **Community Feedback**
   - Share quality issues with TagScout
   - Crowd-source pattern improvements
   - Vote on suggested fixes

3. **Automated Testing**
   - Generate test cases from real logs
   - Verify extractors work before deployment
   - Regression testing for pattern changes

4. **Pattern Evolution**
   - Track pattern changes over time
   - A/B test improvements
   - Automatically promote successful overrides to TagScout

5. **Smart Grouping**
   - Group related issues
   - Find patterns in failures
   - Suggest systemic fixes

### V3.0 Features

1. **Predictive Analysis**
   - Warn before patterns break
   - Analyze log format changes
   - Suggest preemptive overrides

2. **Cross-Pattern Learning**
   - Learn from fixes across all patterns
   - Apply lessons to similar patterns
   - Build pattern improvement knowledge base

3. **Integration with TagScout**
   - Automatic PR creation for proven fixes
   - Pattern quality dashboard in TagScout
   - Collaborative pattern improvement workflow

---

## Implementation Example

### CUC Voicemail Case

**Problem:**
```
Pattern: "Voicemail merge failed: {{ mergeValue }}"
Log: "Voicemail merge failed: mailbox=5001,status=FULL"
Result: "Voicemail merge failed: {{ mergeValue }}"
```

**Detection:**
```rust
// In quality monitor
let issue = QualityIssue {
    issue_type: QualityIssueType::FailedExtraction,
    pattern_id: "cuc-voicemail-merge-fail".to_string(),
    pattern_name: Some("CUC Voicemail Merge Failure".to_string()),
    severity: IssueSeverity::High,
    description: "Parameter 'mergeValue' not extracted from log line".to_string(),
    log_line: Some("Voicemail merge failed: mailbox=5001,status=FULL".to_string()),
    parameter_name: Some("mergeValue".to_string()),
    occurrences: 12,
    first_seen: Utc::now(),
    last_seen: Utc::now(),
    suggestion: Some(generate_suggestion()),
};
```

**Suggested Fix:**
```rust
let suggestion = OverrideSuggestion {
    suggested_fix: "Extract mailbox ID and status separately".to_string(),
    confidence: 0.9,
    auto_apply: false,
    override_data: Some(PatternOverrideData {
        parameter_extractors: Some(HashMap::from([
            ("mailbox".to_string(), r"mailbox=(\d+)".to_string()),
            ("status".to_string(), r"status=(\w+)".to_string()),
        ])),
        ..Default::default()
    }),
    reason: "Current extractor tries to capture everything as one value".to_string(),
    example: Some(
        "Original: {{ mergeValue }}\n\
         Suggested: mailbox={{ mailbox }}, status={{ status }}\n\
         Result: mailbox=5001, status=FULL"
            .to_string()
    ),
};
```

**User Experience:**
1. Toast appears: "Pattern quality issue detected in CUC Voicemail pattern"
2. User clicks "View Details"
3. Sees suggestion to extract mailbox and status separately
4. Previews the fix with actual log example
5. Clicks "Apply Override"
6. Pattern override created automatically
7. LSP reloads patterns
8. Future diagnostics show extracted values

---

## Performance Considerations

### Overhead

- Detection: <1ms per diagnostic
- Suggestion generation: <10ms (on-demand)
- Statistics tracking: <0.5ms per pattern match
- Notification: Async, no blocking

### Memory Usage

- Issues cache: ~1KB per unique issue
- Statistics: ~100 bytes per pattern
- Total overhead: <1MB for 1000 patterns

### Optimization

- Lazy suggestion generation (only when requested)
- Periodic cleanup of old issues (>7 days)
- Rate limiting for notifications (max 1 per pattern per hour)
- Background processing for complex analysis

---

## Success Metrics

### Effectiveness
- [ ] >80% of suggested fixes are accepted by users
- [ ] >90% of applied fixes resolve the issue
- [ ] <5% false positive rate

### Performance
- [ ] <1ms overhead per diagnostic
- [ ] <100ms for suggestion generation
- [ ] No user-perceived lag

### Adoption
- [ ] Users actively review quality issues
- [ ] Overrides created via suggestions >50% of time
- [ ] Positive feedback on feature

---

## Related Documents

- `PATTERN_OVERRIDE_INTEGRATION.md` - Override system design
- `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md` - Implementation steps
- `PATTERN_OVERRIDE_CHECKLIST.md` - Progress tracking
- `PARAMETER_EXTRACTION_FIX.md` - Context for extraction issues

---

**Status:** Ready for implementation after Pattern Override System is complete