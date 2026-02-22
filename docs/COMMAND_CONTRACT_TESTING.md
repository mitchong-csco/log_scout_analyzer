# Command Contract Testing

**Purpose**: Prevent command name mismatches between the VS Code extension and LSP server.

## 📋 Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Architecture](#architecture)
- [Running the Tests](#running-the-tests)
- [Adding New Commands](#adding-new-commands)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

---

## The Problem

**Real Issue We Had (Feb 21, 2024)**:

```
❌ Extension sent: "logScout.bundle.importPackage"
❌ LSP expected:   "scout/bundle/importPackage"
❌ Result:         Command silently ignored, feature broken
```

**Why This Happens**:

1. TypeScript extension defines commands in multiple files
2. Rust LSP server handles commands in server.rs
3. No shared source of truth
4. Easy to make typos or use wrong naming convention
5. Tests on each side don't validate against each other

**Impact**:

- Features appear broken to users
- Hard to debug (no error messages)
- Time wasted on troubleshooting
- Requires manual testing to catch

---

## The Solution

**Three-Part System**:

```
┌─────────────────────────────────────────────────────────────┐
│  1. SINGLE SOURCE OF TRUTH                                  │
│     lsp-commands.schema.json                                │
│     • Defines all command names                             │
│     • Defines request/response parameters                   │
│     • Version controlled                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│  2. TYPESCRIPT TESTS      │  │  3. RUST TESTS               │
│     Validate extension    │  │     Validate LSP server      │
│     uses schema commands  │  │     uses schema commands     │
└───────────────────────────┘  └──────────────────────────────┘
```

### Benefits

✅ **Single Source of Truth**: All command names defined in one place  
✅ **Automated Validation**: Tests fail if commands don't match  
✅ **Early Detection**: Catch mismatches before deployment  
✅ **Documentation**: Schema documents all commands and parameters  
✅ **CI/CD Ready**: Easy to integrate into build pipeline  

---

## Architecture

### 1. Schema File: `lsp-commands.schema.json`

Location: `<project-root>/lsp-commands.schema.json`

```json
{
  "version": "1.0.0",
  "commands": {
    "scout/bundle/create": {
      "description": "Create a new bundle",
      "request": {
        "name": { "type": "string", "required": true },
        "description": { "type": "string", "optional": true }
      },
      "response": {
        "bundleId": { "type": "string" }
      }
    },
    // ... more commands
  }
}
```

**Format Rules**:
- Command names: `scout/{feature}/{action}`
- Use camelCase for parameter names
- Mark parameters as `required` or `optional`
- Document request and response structures

### 2. TypeScript Tests

Location: `vscode-extension/src/test/suite/contract/commands.test.ts`

**What It Tests**:

1. ✅ All commands in code match schema
2. ✅ No old command format (e.g., `logScout.*`)
3. ✅ Command names follow format rules
4. ✅ Required parameters are present
5. ✅ Commands are properly awaited

**Example Test**:

```typescript
test("bundleTreeProvider.ts uses valid commands", () => {
  const content = fs.readFileSync("bundleTreeProvider.ts", "utf8");
  const usedCommands = extractCommands(content);
  
  usedCommands.forEach(cmd => {
    assert.ok(
      schemaCommands.includes(cmd),
      `Command "${cmd}" not in schema`
    );
  });
});
```

### 3. Rust Tests

Location: `lsp-server/src/command_contract_tests.rs`

**What It Tests**:

1. ✅ All commands in server.rs match schema
2. ✅ All schema commands have handlers
3. ✅ Command names follow format rules
4. ✅ No old command format
5. ✅ Documentation matches schema

**Example Test**:

```rust
#[test]
fn test_all_server_commands_are_in_schema() {
    let schema_commands = load_schema_commands();
    let server_commands = extract_server_commands();
    
    for cmd in &server_commands {
        assert!(
            schema_commands.contains(cmd),
            "Command '{}' not in schema",
            cmd
        );
    }
}
```

---

## Running the Tests

### Quick Test (All Platforms)

**Windows**:
```batch
.\scripts\test-command-contracts.bat
```

**Linux/macOS**:
```bash
bash scripts/test-command-contracts.sh
```

### Individual Tests

**Rust Only**:
```bash
cd lsp-server
cargo test --lib command_contract
```

**TypeScript Only**:
```bash
cd vscode-extension
npm test -- --grep "Command Contract Tests"
```

### Expected Output

**Success** ✅:
```
================================================
  📊 Test Summary
================================================

✅ ALL COMMAND CONTRACT TESTS PASSED

✓ Rust LSP server commands match schema
✓ TypeScript extension commands match schema

The extension and server are using the same command names.
```

**Failure** ❌:
```
================================================
  📊 Test Summary
================================================

❌ SOME TESTS FAILED

✗ TypeScript extension tests failed
  Check: vscode-extension/src/bundleTreeProvider.ts
  Ensure all commands use names from lsp-commands.schema.json

Common issues:
  • Command name mismatch (e.g., 'logScout.bundle.X' vs 'scout/bundle/X')
  • Commands defined in schema but not implemented
  • Commands implemented but not in schema
```

---

## Adding New Commands

### Step-by-Step Process

**1. Define in Schema** (`lsp-commands.schema.json`)

```json
{
  "commands": {
    "scout/bundle/export": {
      "description": "Export a bundle to a file",
      "request": {
        "bundleId": {
          "type": "string",
          "required": true,
          "description": "ID of the bundle to export"
        },
        "outputPath": {
          "type": "string",
          "required": true,
          "description": "Path where to save the export"
        }
      },
      "response": {
        "success": { "type": "boolean" },
        "path": { "type": "string" }
      }
    }
  }
}
```

**2. Implement in Rust** (`lsp-server/src/server.rs`)

```rust
async fn handle_bundle_request(&self, method: &str, params: Value) -> Result<Value> {
    match method {
        // ... existing commands ...
        
        "scout/bundle/export" => {
            #[derive(Deserialize)]
            struct ExportParams {
                #[serde(rename = "bundleId")]
                bundle_id: String,
                #[serde(rename = "outputPath")]
                output_path: String,
            }
            
            let params: ExportParams = serde_json::from_value(params)?;
            
            // Implementation here
            
            Ok(serde_json::json!({
                "success": true,
                "path": output_path
            }))
        }
        
        _ => Err(JsonRpcError::method_not_found())
    }
}
```

**3. Use in TypeScript** (`vscode-extension/src/bundleTreeProvider.ts`)

```typescript
async exportBundle(bundleId: string, outputPath: string): Promise<any> {
  const client = getLSPClient();
  if (!client) {
    throw new Error("LSP client not available");
  }
  
  const response = await client.sendRequest("scout/bundle/export", {
    bundleId: bundleId,
    outputPath: outputPath,
  });
  
  return response;
}
```

**4. Run Contract Tests**

```bash
# Both platforms
./scripts/test-command-contracts.sh   # or .bat

# Tests will validate:
# ✓ Command name in schema
# ✓ Command handler in Rust
# ✓ Command usage in TypeScript
# ✓ Parameter names match
```

**5. Commit All Three Changes Together**

```bash
git add lsp-commands.schema.json
git add lsp-server/src/server.rs
git add vscode-extension/src/bundleTreeProvider.ts
git commit -m "feat: Add bundle export command

- Add scout/bundle/export to schema
- Implement export handler in LSP server
- Add exportBundle method to tree provider
- All contract tests passing"
```

---

## Troubleshooting

### Test Failure: "Command not in schema"

**Error**:
```
Command "scout/bundle/myCommand" used in extension.ts is not defined in schema
```

**Fix**:
1. Check spelling in both files
2. Add command to schema if it's new
3. Ensure format is `scout/{feature}/{action}`

### Test Failure: "Command not handled in server"

**Error**:
```
Command "scout/bundle/myCommand" defined in schema but not handled in server
```

**Fix**:
1. Add handler in `handle_bundle_request()` in `server.rs`
2. Ensure case statement matches exactly: `"scout/bundle/myCommand" =>`

### Test Failure: "Old command format detected"

**Error**:
```
Should not use old "logScout.*" command format
```

**Fix**:
Replace:
```typescript
// ❌ Old format
client.sendRequest("logScout.bundle.create", {...})

// ✅ New format
client.sendRequest("scout/bundle/create", {...})
```

### Schema File Not Found

**Error**:
```
Schema file not found at: lsp-commands.schema.json
```

**Fix**:
1. Ensure you're running from project root
2. Check file exists: `ls lsp-commands.schema.json`
3. Check file permissions

### Tests Pass But Feature Doesn't Work

**Check**:
1. ✅ Command name matches schema
2. ✅ Parameters are correct (camelCase)
3. ✅ LSP server is recompiled
4. ✅ Extension is reloaded in VS Code
5. ✅ Check LSP server logs for errors

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Command Contract Tests

on: [push, pull_request]

jobs:
  test-contracts:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run Command Contract Tests
        run: bash scripts/test-command-contracts.sh
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run command contract tests before commit

echo "Running command contract tests..."
bash scripts/test-command-contracts.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Command contract tests failed!"
    echo "   Fix the issues before committing."
    exit 1
fi
```

### Manual Test Before Release

```bash
# 1. Run all tests
bash scripts/test-command-contracts.sh

# 2. Build both projects
cd lsp-server && cargo build --release
cd ../vscode-extension && npm run compile

# 3. Manual smoke test
# - Install extension in VS Code
# - Test each command in schema
# - Verify LSP server logs show correct commands
```

---

## Best Practices

### DO ✅

1. **Always update schema first** before implementing
2. **Run contract tests before committing** changes
3. **Use exact command names** from schema (copy-paste)
4. **Keep schema documented** with descriptions
5. **Version the schema** when making breaking changes
6. **Review schema changes** in code reviews

### DON'T ❌

1. **Don't skip schema** when adding commands
2. **Don't use old formats** like `logScout.*`
3. **Don't hardcode** command names in multiple places
4. **Don't commit** without running tests
5. **Don't change command names** without updating schema
6. **Don't mix naming conventions** (stick to `scout/*`)

---

## Maintenance

### Regular Tasks

**Weekly**:
- Review unused commands in schema
- Check for commands not in schema

**Before Each Release**:
- Run full contract test suite
- Review schema version
- Update documentation if needed

**After Adding Features**:
- Update schema with new commands
- Add to both server and extension
- Verify tests pass
- Document in release notes

---

## FAQ

**Q: Why not just use TypeScript types shared between projects?**  
A: Rust and TypeScript can't directly share types. JSON schema is language-agnostic.

**Q: Can I skip the schema for quick prototypes?**  
A: No - the schema is quick to update and prevents bugs. Always use it.

**Q: What if I forget to update the schema?**  
A: Tests will fail and prevent deployment. That's the point!

**Q: Can I have different command names in dev vs prod?**  
A: No - use the same schema everywhere to prevent environment-specific bugs.

**Q: How do I handle deprecated commands?**  
A: Mark as deprecated in schema, keep handler for compatibility, add removal timeline.

---

## Success Metrics

**Before Contract Testing**:
- ❌ Command mismatches found in production
- ❌ Manual testing required for each command
- ❌ Time wasted debugging name mismatches

**After Contract Testing**:
- ✅ Zero command mismatches in production
- ✅ Automated validation catches issues early
- ✅ Time saved on debugging and testing

---

## Related Documentation

- [Testing Strategy](.zed/TESTING_STRATEGY.md)
- [LSP Server Architecture](../docs/LSP_ARCHITECTURE.md)
- [Extension Development](../vscode-extension/README.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Version**: 1.0.0  
**Last Updated**: February 21, 2024  
**Status**: ✅ Active and Enforced