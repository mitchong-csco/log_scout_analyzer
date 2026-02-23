# Command Contract Testing - Quick Start Guide

**TL;DR**: Prevents command name mismatches between TypeScript extension and Rust LSP server.

---

## 🚨 The Problem We Solved

**Real Bug (Feb 21, 2024)**:
```
Extension sent:  "logScout.bundle.importPackage"
LSP expected:    "scout/bundle/importPackage"
Result:          Feature silently broken ❌
```

---

## ✅ The Solution

**Three Files Work Together**:

```
lsp-commands.schema.json          ← Single source of truth
    ↓
    ├── TypeScript tests validate extension
    └── Rust tests validate LSP server
```

---

## 🎯 Quick Usage

### Run All Tests

**Windows**:
```batch
.\scripts\test-command-contracts.bat
```

**Linux/macOS**:
```bash
bash scripts/test-command-contracts.sh
```

### Run Individual Tests

**Rust only**:
```bash
cd lsp-server
cargo test --lib command_contract
```

**TypeScript only**:
```bash
cd vscode-extension
npm test -- --grep "Command Contract Tests"
```

---

## 📝 Adding a New Command (3 Steps)

### Step 1: Update Schema

**File**: `lsp-commands.schema.json`

```json
{
  "commands": {
    "scout/bundle/myNewCommand": {
      "description": "What it does",
      "request": {
        "param1": { "type": "string", "required": true }
      },
      "response": {
        "result": { "type": "boolean" }
      }
    }
  }
}
```

### Step 2: Implement in Rust

**File**: `lsp-server/src/server.rs`

```rust
async fn handle_bundle_request(&self, method: &str, params: Value) -> Result<Value> {
    match method {
        "scout/bundle/myNewCommand" => {
            #[derive(Deserialize)]
            struct MyParams {
                param1: String,
            }
            
            let params: MyParams = serde_json::from_value(params)?;
            
            // Your implementation here
            
            Ok(serde_json::json!({ "result": true }))
        }
        
        // ... other commands
    }
}
```

### Step 3: Use in TypeScript

**File**: `vscode-extension/src/bundleTreeProvider.ts` or `extension.ts`

```typescript
async myNewCommand(param1: string): Promise<any> {
  const client = getLSPClient();
  if (!client) {
    throw new Error("LSP client not available");
  }
  
  const response = await client.sendRequest("scout/bundle/myNewCommand", {
    param1: param1
  });
  
  return response;
}
```

### Step 4: Test

```bash
# Run contract tests
./scripts/test-command-contracts.sh

# Should see:
# ✅ ALL COMMAND CONTRACT TESTS PASSED
```

---

## 🎨 Command Naming Rules

✅ **DO**: Use format `scout/{feature}/{action}`
```typescript
"scout/bundle/create"
"scout/bundle/importPackage"
"scout/analysis/run"
```

❌ **DON'T**: Use old format
```typescript
"logScout.bundle.create"     // Wrong!
"bundle/create"              // Wrong!
"scout-bundle-create"        // Wrong!
```

✅ **DO**: Use camelCase for parameters
```typescript
{ packagePath: "...", bundleName: "..." }
```

❌ **DON'T**: Use snake_case or other formats
```typescript
{ package_path: "...", bundle_name: "..." }  // Wrong!
```

---

## 🔍 What Gets Tested

### TypeScript Tests
- ✅ All commands match schema
- ✅ No old `logScout.*` format
- ✅ Command names follow rules
- ✅ Required parameters present
- ✅ Commands are awaited

### Rust Tests
- ✅ All commands match schema
- ✅ All schema commands have handlers
- ✅ Command names follow rules
- ✅ Documentation updated
- ✅ No old formats in new code

---

## 🐛 Common Issues

### "Command not in schema"

**Error**:
```
Command "scout/bundle/test" not defined in schema
```

**Fix**: Add to `lsp-commands.schema.json` first

---

### "Command not handled in server"

**Error**:
```
Command "scout/bundle/test" in schema but not in server
```

**Fix**: Add handler in `server.rs` `handle_bundle_request()`

---

### "Old command format detected"

**Error**:
```
Should not use "logScout.*" format
```

**Fix**: Change to `scout/{feature}/{action}` format

---

### Tests pass but feature doesn't work

**Checklist**:
1. Rebuild Rust: `cd lsp-server && cargo build --release`
2. Rebuild TypeScript: `cd vscode-extension && npm run compile`
3. Reload VS Code: `Ctrl+Shift+P` → "Reload Window"
4. Check LSP server logs for errors

---

## 📊 Test Output

### Success ✅
```
================================================
  📊 Test Summary
================================================

✅ ALL COMMAND CONTRACT TESTS PASSED

✓ Rust LSP server commands match schema
✓ TypeScript extension commands match schema
```

### Failure ❌
```
================================================
  📊 Test Summary
================================================

❌ SOME TESTS FAILED

✗ TypeScript extension tests failed
  Check: vscode-extension/src/bundleTreeProvider.ts
```

---

## 🔗 File Locations

| File | Purpose | Location |
|------|---------|----------|
| **Schema** | Single source of truth | `lsp-commands.schema.json` |
| **Rust Tests** | Validate server | `lsp-server/src/command_contract_tests.rs` |
| **TS Tests** | Validate extension | `vscode-extension/src/test/suite/contract/commands.test.ts` |
| **Test Script** | Run all tests | `scripts/test-command-contracts.{sh,bat}` |
| **Full Docs** | Complete guide | `docs/COMMAND_CONTRACT_TESTING.md` |

---

## 🎓 Pro Tips

1. **Always update schema first** - It's your contract
2. **Copy-paste command names** - Don't type them manually
3. **Run tests before committing** - Catch issues early
4. **Test both sides** - Extension AND server
5. **Check the schema** - When in doubt, look at `lsp-commands.schema.json`

---

## 📚 More Information

- **Full Documentation**: [docs/COMMAND_CONTRACT_TESTING.md](docs/COMMAND_CONTRACT_TESTING.md)
- **Testing Strategy**: [.zed/TESTING_STRATEGY.md](.zed/TESTING_STRATEGY.md)
- **Architecture**: [docs/LSP_ARCHITECTURE.md](docs/LSP_ARCHITECTURE.md)

---

## ✨ Benefits

Before Contract Testing:
- ❌ Command mismatches in production
- ❌ Manual testing required
- ❌ Time wasted debugging

After Contract Testing:
- ✅ Zero command mismatches
- ✅ Automated validation
- ✅ Time saved

---

**Version**: 1.0.0  
**Created**: February 21, 2024  
**Status**: ✅ Production Ready