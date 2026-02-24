# 🚀 Test Quick Reference - One-Page Cheat Sheet

**Last Updated:** 2025-02-24  
**Keep this handy!** 📌

---

## ⚡ Quick Commands

```bash
# 🔴 MOST IMPORTANT - Run before every commit!
npm test -- --grep "MASTER WIRING"        # 10 seconds - catches typos

# 🟡 Run before pushing
npm test -- --grep "E2E"                  # 2-5 minutes - validates workflows

# 🟢 Full test suite
npm test                                   # 10-15 minutes - all tests
```

---

## 🎯 Daily Workflow

```bash
# 1. Make changes to package.json or extension.ts
# 2. Run wiring tests (catches typos in config)
cd vscode-extension
npm test -- --grep "Wiring"

# 3. If wiring tests pass, run E2E tests
npm test -- --grep "E2E"

# 4. Commit with confidence!
```

---

## 📋 Test Categories

| Type | Command | Runtime | What It Tests |
|------|---------|---------|---------------|
| **Wiring** | `--grep "Wiring"` | ~30 sec | UI config ↔ code sync |
| **E2E** | `--grep "E2E"` | ~5 min | User workflows |
| **Integration** | `--grep "Integration"` | ~2 min | Component interactions |
| **Unit** | (default) | ~30 sec | Individual functions |

---

## 🚨 What Each Test Catches

### Wiring Tests (Run First!)
✅ Typos in command IDs  
✅ Menu items → missing commands  
✅ Keybindings → missing commands  
✅ Views without providers  
✅ Missing activation events  

**Example Caught:**
```diff
// package.json
- "command": "logScoutAnalyzer.importArhcive"  ❌ Typo
+ "command": "logScoutAnalyzer.importArchive"  ✅ Fixed
```

### E2E Tests (Run Second!)
✅ Complete user workflows  
✅ Import → Analyze → Results  
✅ Navigation works  
✅ Problems Panel updates  
✅ Real bundle processing  

---

## 🐛 When Tests Fail

### Wiring Test Fails
```
❌ Command "importArhcive" declared but not registered

Fix: Check package.json for typos
     OR add registerCommand() in extension.ts
```

**Action:** Fix typo immediately, re-run test

### E2E Test Fails
```
❌ Bundle import timeout after 30 seconds

Fix: Check LSP server is running
     OR check test bundle exists
     OR increase timeout
```

**Action:** Debug the workflow, check logs

---

## 🎓 Common Commands

```bash
# Build extension
npm run compile

# Build LSP server
cd ../lsp-server && cargo build --release

# Run specific test file
npm test -- src/test/suite/wiring/commandWiring.test.ts

# Debug test in VS Code
# 1. Open test file
# 2. Set breakpoints
# 3. Press F5
# 4. Select "Extension Tests"

# Clean and rebuild
npm run clean && npm run compile
```

---

## 📂 Test Locations

```
vscode-extension/src/test/suite/
├── wiring/              ← Wiring validation (110+ tests)
│   ├── masterWiring.test.ts      (Run this first!)
│   ├── commandWiring.test.ts
│   ├── menuWiring.test.ts
│   ├── viewWiring.test.ts
│   └── keybindingWiring.test.ts
│
├── e2e/                 ← End-to-end workflows (3 tests)
│   └── scenario1.test.ts
│
├── integration/         ← Component integration (66+ tests)
│   ├── bundleImport.test.ts
│   └── bundleWorkflows.test.ts
│
└── unit/                ← Unit tests (240+ tests)
    └── bundleTreeProvider.test.ts
```

---

## ⚡ Speed Comparison

```
Wiring Tests:    10 seconds   🟢 FAST
Unit Tests:      30 seconds   🟢 FAST
Integration:     2 minutes    🟡 MEDIUM
E2E Tests:       5 minutes    🔴 SLOW
Full Suite:      15 minutes   🔴 SLOW
```

**Tip:** Run fast tests first (fail fast!)

---

## 🎯 Pre-Commit Checklist

Before every commit:
- [ ] Code compiles: `npm run compile`
- [ ] Wiring tests pass: `npm test -- --grep "Wiring"`
- [ ] Changed files tested: Run relevant tests
- [ ] No console errors: Check VS Code Developer Console

Before pushing:
- [ ] E2E tests pass: `npm test -- --grep "E2E"`
- [ ] All tests pass: `npm test`
- [ ] Documentation updated: If API changed

---

## 🔧 Troubleshooting

### "Extension not found"
```bash
# Solution: Ensure extension is built
npm run compile
```

### "Test data not found"
```bash
# Solution: Check test-data directory exists
ls ../test-data/
```

### "LSP server not responding"
```bash
# Solution: Build LSP server
cd ../lsp-server && cargo build --release
```

### "Command not found"
```bash
# Solution: Wiring test found a typo!
# Check the error message - it tells you exactly what's wrong
```

---

## 📊 Success Output

### Wiring Tests ✅
```
✅ All 45 declared commands are registered
✅ All 127 menu items reference valid commands
✅ All 8 keybindings reference valid commands
✅ ALL CRITICAL WIRING TESTS PASSED!
```

### E2E Tests ✅
```
✅ Bundle imported successfully
✅ Issues visible in Problems Panel
✅ User can navigate to issue locations
🎉 E2E Workflow Test PASSED!
```

---

## 🚀 CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Wiring Tests (fail fast)
  run: npm test -- --grep "Wiring"
  
- name: E2E Tests (if wiring passes)
  run: npm test -- --grep "E2E"
  if: success()
```

---

## 💡 Pro Tips

1. **Run wiring tests first** - They're fast and catch most issues
2. **Use `--grep` to focus** - Don't run all tests every time
3. **Watch mode for development** - `npm run watch` in one terminal
4. **Debug with VS Code** - Set breakpoints, press F5
5. **Keep test data small** - Use `quick-test.zip` for iteration

---

## 🎯 Test Coverage Goals

```
✅ Wiring:       100% (all UI elements)
🟡 E2E:           20% (1 of 5 scenarios) → Target: 100%
✅ Integration:   Good (66+ tests)
✅ Unit:          Good (240+ tests)
```

**Focus:** Complete E2E coverage for all 5 critical scenarios

---

## 📞 Getting Help

**Test fails?** Read the error message - they're very descriptive!

**Need more info?**
- E2E tests: `vscode-extension/src/test/suite/e2e/README.md`
- Wiring tests: `vscode-extension/src/test/suite/wiring/README.md`
- Project status: `PROJECT_STATUS.md`

**Found a bug?** Run wiring tests - they often explain what's wrong!

---

## 🎉 Remember

**Wiring tests = Your safety net for UI configuration**  
**E2E tests = Your safety net for user workflows**

Both are **essential** for professional quality!

---

**Print this and keep it at your desk! 📌**

**Built with ❤️ to make testing easy**