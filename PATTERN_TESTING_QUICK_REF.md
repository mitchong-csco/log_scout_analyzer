# Pattern Testing & JSON Export - Quick Reference

> **Last Updated:** February 16, 2026

---

## One-Minute Overview

```
Tests Fail → Auto-Mark → Export JSON → Commit to Git → Team Reviews
```

---

## Quick API

### Export JSON File
```rust
export_overrides_to_file(&override_file, ".log-scout/pattern-overrides.json")?;
```

### Create Override File
```rust
let file = create_override_file_from_patterns(marked_patterns);
```

### Complete Workflow
```rust
test_and_export(&tester, &results, output_path, "marker_name")?;
```

---

## Quick Example

```rust
// 1. Test patterns
let tester = PatternTester::new(patterns);
let result = tester.test_pattern("pattern-id", test_cases);

// 2. Mark from test results  
let mut overrides = HashMap::new();
let issues = mark_patterns_from_test_results(
    &[result], &mut overrides, &tester, "test-runner"
);

// 3. Create file
let override_file = create_override_file_from_patterns(overrides);

// 4. Export
export_overrides_to_file(&override_file, ".log-scout/pattern-overrides.json")?;

// Done! File is ready for git commit
```

---

## Generated JSON Structure

```json
{
  "version": "1.0",
  "lastSync": "ISO8601_TIMESTAMP",
  "overrides": {
    "override-PATTERN_ID": {
      "id": "override-PATTERN_ID",
      "sourceType": "mongodb",
      "sourceId": "PATTERN_ID",
      "markingStatus": "pending-review",
      "markedBy": "MARKER_NAME",
      "markedAt": "ISO8601_TIMESTAMP",
      "priority": "high|medium|low|critical",
      "category": "extractor|regex|severity|missing-pattern",
      "notes": "Issue description",
      "overrides": { }
    }
  },
  "custom": {}
}
```

---

## CI/CD One-Liner

```bash
cargo run --example test-and-mark -- \
  --output .log-scout/pattern-overrides.json && \
git add .log-scout/pattern-overrides.json && \
git commit -m "test: Mark patterns [automated]"
```

---

## Key Points

✅ **Fully automatic** - No manual JSON writing  
✅ **Git-friendly** - Standard format, ready to commit  
✅ **One function** - `test_and_export()` does it all  
✅ **Marked metadata** - Who marked it, when, priority, category  
✅ **Validation included** - Checks marking fields  
✅ **Directory creation** - Auto-creates `.log-scout/`  

---

## Import Statements

```rust
use log_scout_lsp_server::pattern_tester::{
    PatternTester,
    TestCase,
    create_override_file_from_patterns,
    mark_patterns_from_test_results,
    export_overrides_to_file,
    test_and_export,  // All-in-one
};
```

---

## File Paths

```
Workspace
├─ .log-scout/
│  └─ pattern-overrides.json  ← Exported here
├─ patterns.json
├─ test-cases.json
└─ Cargo.toml
```

---

## Testing the Export

```bash
# Run tests and export
cargo run --example test-and-mark -- --output ./test-out.json

# Verify JSON
cat ./test-out.json | jq '.'

# Check marking status
jq '.overrides[].markingStatus' ./test-out.json

# Count marked patterns
jq '.overrides | length' ./test-out.json
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Permission denied" | `chmod 755 .log-scout/` |
| Empty JSON | Check test results array |
| Wrong path | Use absolute path or verify CWD |
| Invalid JSON | Check for serde errors in logs |

---

## Next Steps

1. Read: `PATTERN_TESTING_JSON_EXPORT_GUIDE.md`
2. Run: `cargo run --example test-and-mark`
3. Commit: `git add .log-scout/pattern-overrides.json`
4. Review: Open in VSCode "Pattern Overrides" view

---

## Files Reference

| File | Contains |
|------|----------|
| `lsp-server/src/pattern_tester.rs` | Implementation |
| `lsp-server/examples/test-and-mark.rs` | Example code |
| `PATTERN_TESTING_JSON_EXPORT_GUIDE.md` | Full guide |
| This file | Quick reference |

---

## Marker Names (Examples)

```rust
"CI_GITHUB_ACTIONS"
"CI_GITLAB_CI"
"local-dev"
"scheduled-job"
"pattern-quality-bot"
"john-laptop"
```

---

## Return Value

```rust
// Returns quality issues found
HashMap<String, Vec<QualityIssue>>

// Example:
for (pattern_id, issues) in result {
    println!("Pattern {}: {} issues", pattern_id, issues.len());
    for issue in issues {
        println!("  - {}", issue.description);
    }
}
```

---

## Environment Variables

```bash
# Enable debug logging
RUST_LOG=debug cargo run --example test-and-mark

# Run tests only
cargo test pattern_tester::tests
```

---

**For complete documentation:** See `PATTERN_TESTING_JSON_EXPORT_GUIDE.md`

**For detailed guide:** See `PATTERN_TESTING_AND_MARKING_GUIDE.md`
