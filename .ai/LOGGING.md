# Logging System 📝

## Overview

All npm commands automatically log their output to files. You see output in real-time AND it's saved for later review.

**Key Features:**
- ✅ Automatic logging (no extra commands needed)
- ✅ Real-time terminal output (you see it happen)
- ✅ Saved to log files (review anytime)
- ✅ Both stdout and stderr captured (all messages)
- ✅ AI can read logs to diagnose failures

---

## How It Works

### Automatic Logging with `tee`

Every npm script uses the `tee` command:
```bash
npm run test:wiring
# Actually runs: node run-wiring-tests.js 2>&1 | tee logs/test-wiring.log
```

**What `tee` does:**
1. Shows output in terminal (real-time)
2. Writes output to log file (saved)
3. Captures both success and error messages

**Result:** You don't need to do anything special. Just run npm commands normally.

---

## Log Files Location

All logs are saved in `vscode-extension/logs/`:

```
logs/
├── README.md                      # Documentation
├── .gitignore                     # Ignore *.log files
├── test-wiring.log                # npm run test:wiring
├── test-security.log              # npm run test:security
├── dev-verify.log                 # npm run dev:verify
├── security-check-all.log         # npm run security:check-all
└── archive-20241219.zip           # Archived logs
```

**Log file naming:** `logs/[script-name].log`

---

## Common Log Files

### Testing Logs
```
logs/test-wiring.log              - Unit tests
logs/test-security.log            - Security tests
logs/test-performance.log         - Performance tests
logs/test-integration.log         - Integration tests
logs/test-all.log                 - All tests
logs/test-coverage.log            - Coverage report
```

### Development Logs
```
logs/dev-setup.log                - Setup process
logs/dev-test-fast.log            - Quick tests
logs/dev-pre-commit.log           - Pre-commit checks
logs/dev-verify.log               - Full verification
```

### Security Logs
```
logs/security-audit.log           - npm audit results
logs/security-scan.log            - retire.js scan
logs/security-check-all.log       - Full security check
logs/security-report.log          - Security report
```

### Maintenance Logs
```
logs/maintain-clean.log           - Cleanup process
logs/maintain-update.log          - Dependency updates
logs/maintain-verify.log          - Full system check
```

---

## Using Logs

### During Normal Operation

Just run commands normally. Logging happens automatically:

```bash
npm run test:wiring
# Terminal shows: ✔ 24 passing (16ms)
# Log saved to: logs/test-wiring.log
```

You don't need to think about logging. It just works.

---

### When Commands Fail

If a command fails, you see the error in terminal AND it's saved to the log:

```bash
npm run test:security
# Terminal shows:
#   ❌ Error: Cannot find module 'security.test.ts'
#   npm ERR! code 1

# Same error is saved to:
#   logs/test-security.log
```

**To review the error:**
```bash
# View the log file
type logs\test-security.log

# Or use npm command
npm run logs:view-latest
```

---

### For AI Assistant Debugging

When you ask an AI assistant for help with a failure:

**❌ Bad way:**
```
"npm run test:security failed. Help!"
```

**✅ Good way:**
```
"npm run test:security failed. Check logs/test-security.log and tell me what's wrong."
```

**AI Response:**
```
I read logs/test-security.log and found:
"Error: Cannot find module 'src/test/suite/security.test.ts'"

The issue is that the security test file doesn't exist yet.
I can create it for you. Should I proceed?
```

---

## Log Management Commands

### View Logs

```bash
# View all recent log contents
npm run logs:view-latest

# View specific log
type logs\test-wiring.log

# Search for errors in all logs
findstr /s /i "error fail ❌" logs\*.log
```

### Clean Logs

```bash
# Delete all log files
npm run logs:clean

# Creates empty logs/ directory
```

### Archive Logs

```bash
# Compress logs before cleaning
npm run logs:archive

# Creates: logs/archive-YYYYMMDD.zip
# Then deletes *.log files
```

---

## What Gets Logged

### Success Output

```
✅ All tests passing (24/24)
✅ No vulnerabilities found
✅ Compilation successful
✅ TypeScript: 0 errors, 0 warnings
```

### Failure Output

```
❌ 2 tests failing
   
   Test: "Should validate input"
   Expected: true
   Actual: false
   
   Test: "Should handle errors"
   Expected to throw, but didn't
```

### Warnings

```
⚠️  Deprecated package: retire@2.0.0
⚠️  Test took 150ms (expected < 100ms)
⚠️  Missing documentation for function parseLog
```

### Progress Messages

```
🔍 Detecting changed files...
📦 Running npm audit...
⚡ Compiling TypeScript...
🧪 Running tests...
✅ Complete!
```

### Error Details

```
❌ npm ERR! code 1
npm ERR! path: /src/test/suite/security.test.ts
npm ERR! command failed
npm ERR! exit code 1

Error: Cannot find module 'security.test.ts'
    at Module._resolveFilename (internal/modules/cjs/loader.js:883)
    at Function.Module._load (internal/modules/cjs/loader.js:743)
```

---

## Log Retention Policy

### Automatic Overwrites

- Each npm command overwrites its own log file
- Only the latest execution is kept
- No accumulation of old logs

**Example:**
```bash
# First run
npm run test:wiring
# Creates: logs/test-wiring.log (24 passing)

# Second run
npm run test:wiring
# Overwrites: logs/test-wiring.log (25 passing)
```

### Manual Cleanup

```bash
# Clean all logs (when they get old)
npm run logs:clean

# Archive before cleaning (keeps history)
npm run logs:archive
npm run logs:clean
```

### Git Ignore

Logs are NOT committed to git:
- `logs/*.log` is in `.gitignore`
- `logs/README.md` IS committed
- `logs/archive-*.zip` CAN be committed (optional)

---

## Integration with CI/CD

### GitHub Actions

Logs are automatically captured by GitHub Actions:

```yaml
- name: Run tests
  run: npm run test:all
  
# GitHub Actions saves output automatically
# No need for tee in CI/CD
```

### Local CI Simulation

```bash
# Run full CI pipeline locally
npm run ci:full

# Check logs/ci-full.log for results
type logs\ci-full.log
```

---

## Troubleshooting

### No logs directory

```bash
# Automatically created on npm install
npm install

# Or create manually
mkdir logs
```

### Can't read log file

```bash
# Use type command (Windows)
type logs\test-wiring.log

# Or use npm command
npm run logs:view-latest
```

### Log files too large

```bash
# Archive old logs
npm run logs:archive

# Clean all logs
npm run logs:clean
```

### Permission errors

```bash
# Fix permissions (Windows)
icacls logs /grant Users:F

# Or run as administrator
```

---

## Best Practices

### For Daily Development

1. **Just run commands** - Logging is automatic
2. **Ignore logs when everything works** - Only check on failures
3. **Clean weekly** - `npm run logs:clean` every Friday
4. **Archive monthly** - `npm run logs:archive` first Monday of month

### For Debugging

1. **Run the failing command** - Error appears in terminal
2. **Check the log file** - Full details saved
3. **Share with AI** - "Check logs/[name].log"
4. **Fix the issue** - Based on actual error
5. **Run again** - New log overwrites old one

### For AI Assistants

1. **Always read log files when commands fail**
2. **Base fixes on actual errors, not guesses**
3. **Include log excerpts in responses**
4. **Propose fixes with confidence (you saw the error)**

**Example AI Response:**
```markdown
## Command Failed

npm run test:security

## Log File Analysis

I read `logs/test-security.log` which shows:

```
Error: Cannot find module 'src/test/suite/security.test.ts'
```

## Root Cause

The security test file doesn't exist yet.

## Proposed Fix

Create `src/test/suite/security.test.ts` with:
[code here]
```

### For Code Reviews

1. **Check logs before committing** - Verify no warnings
2. **Archive logs before major changes** - Keep history
3. **Don't commit log files** - They're in .gitignore

---

## Example Workflows

### Workflow 1: Test Fails

```bash
# 1. Run test
npm run test:wiring

# 2. See failure in terminal
❌ 2 failing

# 3. Review log for details
type logs\test-wiring.log

# 4. Fix the issue

# 5. Run again (overwrites log)
npm run test:wiring

# 6. Success!
✅ 24 passing
```

### Workflow 2: Ask AI for Help

```bash
# 1. Command fails
npm run security:check-all
❌ Failed

# 2. Ask AI to check log
"Check logs/security-check-all.log and diagnose the issue"

# 3. AI reads the log and responds with fix

# 4. Apply the fix

# 5. Verify
npm run security:check-all
✅ Success
```

### Workflow 3: Pre-Commit Check

```bash
# 1. Before committing
npm run dev:pre-commit

# 2. Everything passes
✅ Compilation: Success
✅ Tests: 24/24 passing
✅ Docs: Valid

# 3. Check log for any warnings
type logs\dev-pre-commit.log

# 4. Commit with confidence
git commit -m "feat: add new feature"
```

---

## Performance Impact

### Logging Overhead

**Minimal impact:**
- `tee` is very fast (< 1ms overhead)
- No noticeable slowdown
- File I/O is async (doesn't block)

**Benchmarks:**
```
Without logging: 16ms
With logging:    17ms (+1ms, 6% overhead)
```

**Worth it for debugging capability!**

---

## Advanced Usage

### Filter Log Output

```bash
# Find all errors
findstr "❌ ERROR" logs\*.log

# Find specific test failures
findstr "failing" logs\test-*.log

# Find security issues
findstr "vulnerability" logs\security-*.log
```

### Compare Logs

```bash
# Before change
npm run test:all
copy logs\test-all.log logs\test-all-before.log

# Make changes

# After change
npm run test:all
fc logs\test-all-before.log logs\test-all.log
```

### Monitor Logs in Real-Time

```bash
# Terminal 1: Run tests in watch mode
npm run test:watch

# Terminal 2: Watch log file
powershell Get-Content logs\test-watch.log -Wait -Tail 50
```

---

## Summary

**Key Points:**
- ✅ All npm commands log automatically
- ✅ See output in real-time (terminal)
- ✅ Review anytime (log files)
- ✅ AI can read logs for debugging
- ✅ Zero extra effort required

**Commands to Remember:**
```bash
npm run logs:view-latest    # View recent logs
npm run logs:clean          # Clean old logs
npm run logs:archive        # Archive before cleaning
```

**When debugging:**
```bash
# 1. Command fails
npm run [command]

# 2. Check the log
type logs\[command-name].log

# 3. Or ask AI
"Check logs/[command-name].log and tell me what failed"
```

---

**Logging is automatic. Just use npm commands normally. Logs are there when you need them.** ✅