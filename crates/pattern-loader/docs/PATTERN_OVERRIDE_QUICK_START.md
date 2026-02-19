# Pattern Override System - Quick Start Guide

> **Get started implementing pattern overrides in 5 minutes**  
> **For:** Developers new to the codebase  
> **Goal:** Understand the system and make your first override

---

## What Are Pattern Overrides?

Pattern overrides let users fix broken log patterns locally without modifying the central TagScout MongoDB database.

**Example Problem:**
```
Pattern matches: HTTP error 404
Extractor regex: ([45]\d{2})  ❌ Only matches 4xx and 5xx
Missing: 200, 201, 302 (2xx and 3xx codes)
```

**Solution with Override:**
```json
{
  "overrides": {
    "override-pattern123": {
      "parameterExtractors": {
        "CODE": {
          "override": "(\\d{3})",  ✅ Matches all HTTP codes
          "reason": "Original missed 2xx/3xx codes"
        }
      }
    }
  }
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      VSCode Extension                       │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ User Commands    │────────▶│ patternOverride  │        │
│  │ - Override       │         │ Manager.ts       │        │
│  │ - View           │         └─────────┬────────┘        │
│  │ - Reset          │                   │                  │
│  └──────────────────┘                   │ Write            │
│                                          ▼                  │
│                              .log-scout/                    │
│                        pattern-overrides.json               │
│                                          │                  │
└──────────────────────────────────────────┼──────────────────┘
                                           │ Read
                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       LSP Server (Rust)                     │
│  ┌──────────────────┐         ┌──────────────────┐        │
│  │ pattern_loader   │────────▶│ Pattern Engine   │        │
│  │ - load_overrides │         │ - Apply to logs  │        │
│  │ - merge_pattern  │         │ - Generate diag  │        │
│  └──────────────────┘         └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Flow:**
1. User creates override in VSCode → Saves to JSON file
2. LSP server reads JSON on startup/reload
3. Overrides merged into patterns from MongoDB
4. Modified patterns used for log analysis
5. Diagnostics show correctly extracted parameters

---

## File Structure

```
log_scout_analyzer/
├── lsp-server/src/
│   ├── pattern_loader.rs       ← Phase 1: Load & merge overrides
│   ├── pattern_engine.rs       ← Uses merged patterns
│   └── main.rs                 ← Integration point
│
├── vscode-extension/src/
│   ├── patternOverrideManager.ts  ← Existing: File I/O
│   ├── overrideHandlers.ts        ← Phase 2: UI handlers
│   ├── views/
│   │   ├── patternOverrideEditor.ts   ← Phase 3: Advanced UI
│   │   └── overrideTreeView.ts        ← Phase 3: TreeView
│   └── extension.ts               ← Command registration
│
└── .log-scout/
    └── pattern-overrides.json  ← User's overrides (Git-friendly)
```

---

## Implementation Phases

### Phase 1: LSP Server (Core Functionality)
**Duration:** 3-5 days  
**Priority:** Critical

**What to build:**
- Rust module to read JSON override file
- Merge logic to combine overrides with base patterns
- Integration into existing pattern loading

**Key files to create:**
- `lsp-server/src/pattern_loader.rs`

**Key functions:**
- `load_overrides()` - Read JSON file
- `merge_pattern()` - Apply overrides to pattern
- `load_patterns_with_overrides()` - Integration wrapper

### Phase 2: VSCode UI (User Interface)
**Duration:** 4-6 days  
**Priority:** High

**What to build:**
- Commands to create/edit/reset overrides
- Quick input forms for common changes
- Status bar indicator
- LSP reload trigger

**Key files to create:**
- `vscode-extension/src/overrideHandlers.ts`

**Key commands:**
- `logScoutAnalyzer.overridePattern`
- `logScoutAnalyzer.viewOverrides`
- `logScoutAnalyzer.resetOverride`

### Phase 3: Advanced Features (Nice to Have)
**Duration:** 3-5 days  
**Priority:** Medium

**What to build:**
- Webview editor with full control
- Import/export for team sharing
- TreeView for browsing overrides

---

## Your First Override (Step-by-Step)

### Step 1: Understand the Problem

Run the extension and find a diagnostic with unsubstituted parameters:

```
❌ HTTP response with status {{ CODE }} detected
```

The `{{ CODE }}` wasn't replaced because the extractor regex doesn't match the actual log line.

### Step 2: Identify the Pattern

Look at the diagnostic's `code` field to get the pattern ID:
```typescript
diagnostic.code // e.g., "5efde66677e36d0001e62450"
```

### Step 3: Create Override File

Manually create `.log-scout/pattern-overrides.json`:

```json
{
  "version": "1.0",
  "overrides": {
    "override-5efde66677e36d0001e62450": {
      "id": "override-5efde66677e36d0001e62450",
      "sourceType": "mongodb",
      "sourceId": "5efde66677e36d0001e62450",
      "name": "HTTP Error Pattern",
      "notes": "Fixed CODE extractor to match all status codes",
      "enabled": true,
      "overrides": {
        "parameterExtractors": {
          "CODE": {
            "original": "([45]\\d{2})",
            "override": "(\\d{3})",
            "reason": "Match all HTTP codes including 2xx and 3xx"
          }
        }
      }
    }
  },
  "custom": {}
}
```

### Step 4: Test the Override

**Without LSP implementation (current state):**
- File created but not read by LSP server
- No effect on diagnostics yet

**With Phase 1 complete:**
1. Restart LSP server or trigger reload
2. Open log file
3. See diagnostic: `HTTP response with status 404 detected` ✅
4. Parameter correctly extracted!

---

## Development Workflow

### Day 1-3: LSP Foundation

```bash
# 1. Create feature branch
git checkout -b feature/pattern-overrides

# 2. Create pattern loader module
cd lsp-server/src
touch pattern_loader.rs

# 3. Add module to main.rs
echo "mod pattern_loader;" >> main.rs

# 4. Implement structs and functions
# (See PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md Task 1.1-1.5)

# 5. Build and test
cargo build --release
cargo test

# 6. Manual test
# - Create sample override file
# - Run LSP server
# - Check logs for "Loaded X pattern overrides"
```

### Day 4-7: VSCode UI

```bash
# 1. Update package.json with commands
cd vscode-extension
# Add commands to contributes.commands

# 2. Create override handlers
touch src/overrideHandlers.ts

# 3. Register commands in extension.ts
# vscode.commands.registerCommand(...)

# 4. Build and install
npm run compile
vsce package
code --install-extension log-scout-analyzer-*.vsix

# 5. Test
# - Right-click diagnostic → "Override Pattern"
# - View overrides from Command Palette
# - Verify JSON file updated
```

### Day 8-10: Advanced Features (Optional)

```bash
# 1. Create webview editor
mkdir -p src/views
touch src/views/patternOverrideEditor.ts

# 2. Implement TreeView
touch src/views/overrideTreeView.ts

# 3. Add import/export
touch src/overrideIO.ts

# 4. Test all features
npm run compile
code --install-extension log-scout-analyzer-*.vsix
```

---

## Testing Your Implementation

### Unit Test (LSP)

```rust
#[test]
fn test_my_override() {
    let override_file = r#"{
        "version": "1.0",
        "overrides": {
            "override-test": {
                "id": "override-test",
                "sourceType": "mongodb",
                "enabled": true,
                "overrides": {
                    "parameterExtractors": {
                        "CODE": {
                            "override": "(\\d{3})",
                            "reason": "Test"
                        }
                    }
                }
            }
        },
        "custom": {}
    }"#;
    
    let parsed: OverrideFile = serde_json::from_str(override_file).unwrap();
    assert_eq!(parsed.overrides.len(), 1);
}
```

### Integration Test (Manual)

1. **Create test override:**
   ```bash
   mkdir -p .log-scout
   echo '{
     "version": "1.0",
     "overrides": {
       "override-test": {
         "id": "override-test",
         "sourceType": "mongodb",
         "enabled": true,
         "overrides": {
           "regex": "TEST.*PATTERN"
         }
       }
     },
     "custom": {}
   }' > .log-scout/pattern-overrides.json
   ```

2. **Check LSP logs:**
   ```
   [INFO] Loaded 1 pattern overrides and 0 custom patterns
   [INFO] Applying override 'override-test' to pattern: test
   [INFO]   Override applied successfully
   ```

3. **Verify diagnostic:**
   - Open log with matching pattern
   - Should see diagnostic generated with overridden values

---

## Common Pitfalls

### 1. Field Name Mismatches

❌ **Wrong:**
```json
{
  "parameter_extractors": { ... }  // snake_case
}
```

✅ **Correct:**
```json
{
  "parameterExtractors": { ... }  // camelCase for JSON
}
```

Rust structs use `#[serde(rename = "parameterExtractors")]` to handle conversion.

### 2. Missing Override Prefix

❌ **Wrong:**
```json
{
  "overrides": {
    "5efde66677e36d0001e62450": { ... }  // Missing "override-" prefix
  }
}
```

✅ **Correct:**
```json
{
  "overrides": {
    "override-5efde66677e36d0001e62450": { ... }  // With prefix
  }
}
```

### 3. Forgetting to Reload

After creating/modifying an override:
1. Save the JSON file
2. Trigger LSP reload: `logScout/reloadPatterns`
3. Or restart LSP server

### 4. Invalid Regex

Always validate regex before saving:
```typescript
try {
  new RegExp(userInput);
} catch (e) {
  vscode.window.showErrorMessage('Invalid regex');
}
```

---

## Debugging Tips

### LSP Server Not Loading Overrides

**Check:**
1. File location: `.log-scout/pattern-overrides.json` in workspace root
2. JSON syntax: Use validator at jsonlint.com
3. Logs: Search for "pattern override" in LSP output
4. Permissions: File readable by LSP server process

**Enable verbose logging:**
```rust
tracing::debug!("Override file path: {:?}", override_path);
tracing::debug!("Override file content: {:?}", content);
```

### VSCode Commands Not Appearing

**Check:**
1. `package.json`: Commands defined in `contributes.commands`
2. `extension.ts`: Commands registered with `registerCommand`
3. Context: `when` clauses satisfied (e.g., diagnostic selected)
4. Extension activated: Check "Extensions" view

**Debug command registration:**
```typescript
console.log('Registering command: logScoutAnalyzer.overridePattern');
context.subscriptions.push(
  vscode.commands.registerCommand('logScoutAnalyzer.overridePattern', ...)
);
console.log('Command registered successfully');
```

### Overrides Not Applied

**Check:**
1. Pattern ID matches: `override-{patternId}`
2. `enabled: true` in JSON
3. LSP server reloaded after file change
4. Pattern engine uses merged patterns
5. Diagnostics use correct pattern instance

**Verify in logs:**
```
[INFO] Applying override 'override-xyz' to pattern: xyz
[INFO]   Overriding parameter extractor 'CODE': (\d{3})
[INFO]   Override applied successfully
```

---

## Next Steps

1. **Read detailed docs:**
   - `PATTERN_OVERRIDE_INTEGRATION.md` - Design specification
   - `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md` - Step-by-step guide
   - `PATTERN_OVERRIDE_CHECKLIST.md` - Progress tracker

2. **Start implementation:**
   - Begin with Phase 1 (LSP Server)
   - Test thoroughly before moving to Phase 2
   - Phase 3 is optional but valuable

3. **Get help:**
   - Ask questions early
   - Review existing code first
   - Use Git for version control

---

## Success Criteria

You'll know it's working when:

✅ User creates override in VSCode UI  
✅ JSON file written to `.log-scout/pattern-overrides.json`  
✅ LSP server logs "Loaded X pattern overrides"  
✅ Diagnostic shows extracted parameter value (not `{{ PLACEHOLDER }}`)  
✅ Override persists across restarts  
✅ No crashes or errors  

---

## Resources

- **Rust JSON:** https://serde.rs/
- **VSCode API:** https://code.visualstudio.com/api
- **Regex Testing:** https://regex101.com/
- **JSON Validation:** https://jsonlint.com/

---

**Ready to code?** Start with Phase 1, Task 1.1 in the implementation plan! 🚀