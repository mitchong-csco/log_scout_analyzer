# Pattern Testing & Automatic Marking Guide

> **Date:** February 16, 2026  
> **Status:** New Feature - Phase 1.6 Extension  
> **Module:** `lsp-server/src/pattern_tester.rs`

---

## Overview

The Pattern Tester module enables you to:

1. **Run automated tests** against patterns with test cases
2. **Automatically detect quality issues** (failed extractions, incorrect matches, etc.)
3. **Mark patterns for review** based on test results
4. **Track improvement** through review workflow

This integrates seamlessly with the Phase 1.6 pattern marking system.

---

## Architecture

```
┌──────────────────────────────┐
│   Test Case Repository       │
│   (JSON or programmatic)     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   PatternTester              │
│   - test_pattern()           │
│   - analyze_results()        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   QualityIssue Analysis      │
│   - FailedExtraction         │
│   - IncorrectMatch           │
│   - MissingEdgeCases         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│   mark_patterns_from_results()│
│   - Auto-mark patterns       │
│   - Set priority/category    │
│   - Write to overrides.json  │
└──────────────────────────────┘
```

---

## Quick Start

### 1. Create Test Cases

```rust
use log_scout_lsp_server::pattern_tester::{PatternTester, TestCase};
use std::collections::HashMap;

let test_cases = vec![
    TestCase {
        input: "ERROR: Database connection failed".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("ERROR_CODE".to_string(), "DB_FAILED".to_string());
            m
        },
    },
    TestCase {
        input: "INFO: Process started successfully".to_string(),
        expected_match: false,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: HashMap::new(),
    },
];
```

### 2. Run Tests

```rust
let patterns = load_patterns_from_tagscout();
let tester = PatternTester::new(patterns);

let result = tester.test_pattern("http-error-pattern", test_cases);

println!("Pattern: {}", result.pattern_name);
println!("Passed: {}/{}", result.passed_count, result.total_cases);

if !result.passed {
    for failed in &result.failed_cases {
        println!("Failed: {} (expected: {})", failed.input, failed.expected_match);
    }
}
```

### 3. Analyze & Mark

```rust
let results = vec![result]; // from step 2

let issues = mark_patterns_from_test_results(
    &results,
    &mut overrides,
    &tester,
    "automated-test-suite",  // marker name
);

// Check what was marked
for (pattern_id, pattern_issues) in issues {
    println!("Pattern {} has {} issues:", pattern_id, pattern_issues.len());
    for issue in pattern_issues {
        println!("  - {} ({})", issue.description, issue.affected_cases);
    }
}
```

---

## Test Case Format

### TestCase Structure

```rust
pub struct TestCase {
    pub input: String,                              // Log line to test
    pub expected_match: bool,                       // Should pattern match?
    pub actual_match: bool,                         // Does it match?
    pub extracted_params: HashMap<String, String>, // What we extracted
    pub expected_params: HashMap<String, String>,  // What we should extract
}
```

### Example Test Cases

#### HTTP Error Pattern

```rust
vec![
    // Should match 4xx/5xx errors
    TestCase {
        input: "HTTP/1.1 500 Internal Server Error".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("CODE".to_string(), "500".to_string());
            m
        },
    },
    // Should match 2xx success
    TestCase {
        input: "HTTP/1.1 200 OK".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("CODE".to_string(), "200".to_string());
            m
        },
    },
]
```

#### Authentication Failure Pattern

```rust
vec![
    TestCase {
        input: "Failed login attempt for user john@example.com from 192.168.1.100".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("USERNAME".to_string(), "john@example.com".to_string());
            m.insert("IP".to_string(), "192.168.1.100".to_string());
            m
        },
    },
]
```

---

## Quality Issue Detection

### Automatic Issue Types

| Issue Type | Detected When | Priority |
|------------|---------------|----------|
| FailedExtraction | Pattern matches but params not extracted | HIGH |
| IncorrectMatch | Pattern fails to match expected logs | VARIES |
| PerformanceIssue | Pattern execution too slow | MEDIUM |
| MissingEdgeCases | Fails specific test cases | MEDIUM |
| LowConfidence | Multiple conflicting extractions | LOW |

### Severity Levels

- **Critical (>50% failure)**: High priority - mark for immediate review
- **High (25-50% failure)**: Mark as high priority
- **Medium (10-25% failure)**: Mark as medium priority
- **Low (<10% failure)**: Mark as low priority for periodic review

---

## Workflow: From Testing to Approval

```
Step 1: Run Tests
├─ Execute test_pattern() for each pattern
└─ Capture results (pass/fail, extracted params)
         │
         ▼
Step 2: Analyze Issues
├─ analyze_results() identifies quality problems
├─ Calculates severity (failure rate)
└─ Suggests fixes
         │
         ▼
Step 3: Auto-Mark Patterns
├─ mark_patterns_from_test_results()
├─ Creates/updates overrides
├─ Sets markingStatus: "pending-review"
└─ Assigns priority & category from issues
         │
         ▼
Step 4: Save to JSON
├─ Write updated overrides to .log-scout/pattern-overrides.json
├─ Team sees "View Patterns Pending Review"
└─ Patterns in git-friendly format
         │
         ▼
Step 5: Team Review
├─ Reviewer opens marked pattern in VSCode
├─ Reviews test failures and issues
├─ Approves fix or requests changes
└─ Pattern in overrides.json
         │
         ▼
Step 6: Apply Fix
├─ LSP server loads approved override
├─ Only approved overrides used
├─ Pattern fixed in all diagnostics
└─ Team member marks as "applied"
```

---

## Practical Example: Full Test Run

### Setup

```rust
use log_scout_lsp_server::pattern_tester::{PatternTester, TestCase};
use log_scout_lsp_server::pattern_loader::{load_overrides, MarkingStatus};
use std::collections::HashMap;

// Load existing patterns and overrides
let patterns = load_patterns_from_tagscout()?;
let mut overrides = load_overrides(workspace_path)?;
let tester = PatternTester::new(patterns.clone());
```

### Run Tests

```rust
// Test HTTP error patterns
let http_tests = vec![
    TestCase {
        input: "2026-02-16 10:30:45 ERROR HTTP/1.1 404 Not Found".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("CODE".to_string(), "404".to_string());
            m
        },
    },
    // ... more test cases
];

let http_result = tester.test_pattern("http-errors", http_tests);

// Test authentication patterns
let auth_tests = vec![
    TestCase {
        input: "Authentication failed for user admin from 10.0.0.50".to_string(),
        expected_match: true,
        actual_match: false,
        extracted_params: HashMap::new(),
        expected_params: {
            let mut m = HashMap::new();
            m.insert("USER".to_string(), "admin".to_string());
            m
        },
    },
    // ... more test cases
];

let auth_result = tester.test_pattern("auth-failures", auth_tests);
```

### Analyze & Mark

```rust
let results = vec![http_result, auth_result];
let issues = mark_patterns_from_test_results(
    &results,
    &mut overrides.overrides,  // Pass mutable ref to overrides
    &tester,
    "CI_TEST_RUNNER",
);

// Log what was marked
for (pattern_id, pattern_issues) in &issues {
    println!("📊 Pattern '{}' marked for review:", pattern_id);
    for issue in pattern_issues {
        println!("   - {}", issue.description);
        if let Some(suggestion) = &issue.suggestion {
            println!("     💡 Suggestion: {}", suggestion);
        }
    }
}
```

### Save Marked Patterns

```rust
use std::fs;

let override_json = serde_json::to_string_pretty(&overrides)?;
fs::write(".log-scout/pattern-overrides.json", override_json)?;

println!("✅ Marked patterns saved to .log-scout/pattern-overrides.json");
println!("Next: Open VSCode and review in 'Pattern Overrides' view");
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Pattern Quality Tests

on: [pull_request, push]

jobs:
  test-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run pattern tests
        run: |
          cd lsp-server
          cargo test pattern_tester::tests
          
      - name: Mark failed patterns
        run: |
          # Run test suite and auto-mark
          cargo run --bin pattern-test-runner -- \
            --patterns-dir ./patterns \
            --test-cases ./test-cases.json \
            --output .log-scout/pattern-overrides.json
      
      - name: Create PR comment
        uses: actions/github-script@v6
        with:
          script: |
            // Comment on PR with which patterns need review
            const fs = require('fs');
            const overrides = JSON.parse(
              fs.readFileSync('.log-scout/pattern-overrides.json', 'utf8')
            );
            const pending = Object.entries(overrides.overrides)
              .filter(([_, o]) => o.markingStatus === 'pending-review');
            
            if (pending.length > 0) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## 🔴 Pattern Quality Issues\n\n` +
                      `${pending.length} patterns need review:\n` +
                      pending.map(([_, o]) => `- ${o.name}`).join('\n')
              });
            }
```

### Local Development

```bash
# Run pattern tests before commit
cd lsp-server
cargo test pattern_tester

# Mark any failed patterns for review
cargo run --example test-and-mark

# Commit marked patterns for team review
git add .log-scout/pattern-overrides.json
git commit -m "test: Mark patterns needing review [automated]"
```

---

## Commands & APIs

### PatternTester

```rust
// Create tester with patterns
let tester = PatternTester::new(patterns);

// Test a single pattern
let result = tester.test_pattern(pattern_id, test_cases);

// Analyze batch of results
let issues = tester.analyze_results(&results);
```

### QualityIssue Analysis

```rust
pub enum IssueType {
    FailedExtraction,        // Params not extracted
    IncorrectMatch,          // Wrong match behavior
    PerformanceIssue,        // Too slow
    LowConfidence,           // Ambiguous
    MissingEdgeCases,        // Edge cases fail
}

pub enum IssueSeverity {
    Low,       // <10% failure
    Medium,    // 10-25% failure
    High,      // 25-50% failure
    Critical,  // >50% failure
}
```

### Marking Patterns

```rust
// Mark patterns from test results
let issues = mark_patterns_from_test_results(
    &test_results,
    &mut overrides,
    &tester,
    "test_runner_name",  // Who ran the tests
);

// Check what was marked
for (id, issues) in issues {
    println!("Pattern {} has {} issues", id, issues.len());
}
```

---

## Best Practices

### 1. Comprehensive Test Coverage

```rust
// Test all branches of pattern logic
let tests = vec![
    // Normal case
    TestCase { expected_match: true, ... },
    // Edge case - boundary values
    TestCase { input: "0", expected_match: true, ... },
    TestCase { input: "999", expected_match: true, ... },
    // Negative case - should NOT match
    TestCase { expected_match: false, ... },
    // Empty input
    TestCase { input: "", expected_match: false, ... },
];
```

### 2. Test Real Log Data

```rust
// Use actual logs from your environment
let production_logs = load_from_log_file("production.log")?;
let test_cases: Vec<TestCase> = production_logs
    .iter()
    .map(|log| TestCase {
        input: log.clone(),
        expected_match: should_match_pattern(&pattern, log),
        actual_match: false,
        extracted_params: extract_manually(log),
        expected_params: extract_manually(log),
    })
    .collect();
```

### 3. Regular Test Runs

```bash
# Weekly pattern quality check
0 0 * * MON /usr/local/bin/log-scout-test-patterns.sh

# After each log format change
./scripts/test-patterns-ci.sh

# Before pattern library updates
./scripts/validate-new-patterns.sh
```

### 4. Review Test Results

```rust
// Log detailed failure info
if !result.passed {
    eprintln!("FAILED: {} - {}/{} passed",
        result.pattern_name,
        result.passed_count,
        result.total_cases,
    );
    
    for (i, failed) in result.failed_cases.iter().enumerate() {
        eprintln!("  Case {}: expected={}, actual={}", 
            i, failed.expected_match, failed.actual_match);
        eprintln!("    Input: {}", failed.input);
    }
}
```

---

## Troubleshooting

### Pattern test shows passed but extraction failed

Check that expected_params in test case matches what pattern actually extracts:

```rust
TestCase {
    expected_params: {
        let mut m = HashMap::new();
        m.insert("CODE".to_string(), "500".to_string());  // Must match
        m
    },
    ...
}
```

### Test case passes but pattern still marked for review

Verify the mark_patterns_from_test_results is being called:

```rust
let issues = mark_patterns_from_test_results(
    &results,
    &mut overrides.overrides,  // Must use `mut overrides`
    &tester,
    "test_runner",
);
```

### Marked patterns not appearing in VSCode

1. Verify .log-scout/pattern-overrides.json was written
2. Check that markingStatus is "pending-review" or "approved"
3. Reload VSCode window (Cmd/Ctrl+Shift+P → "Reload Window")

---

## Next Steps

1. **Create test case library** - Build comprehensive test cases for your patterns
2. **Integrate with CI/CD** - Run tests on every PR/push
3. **Set up pattern review workflow** - Team reviews marked patterns
4. **Track metrics** - Monitor pattern quality over time

See `PHASE_2_5_UI_GUIDE.md` for VSCode UI commands to manage marked patterns.
