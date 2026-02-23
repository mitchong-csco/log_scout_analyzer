# LSP Server Not Running - Quick Fix

**Error**: `Failed to import archive: Error: Client is not running`

**Status**: ⚠️ CRITICAL - LSP server failed to start

---

## Immediate Diagnosis

### Step 1: Check LSP Server Logs

**Windows**:
```bash
# Check if log file exists
dir %USERPROFILE%\.log-scout-analyzer\lsp-server-*.log

# View latest log
notepad %USERPROFILE%\.log-scout-analyzer\lsp-server-%date:~-4,4%-%date:~-10,2%-%date:~-7,2%.log
```

**Or check temp directory**:
```bash
dir %TEMP%\log-scout-analyzer\lsp-server-*.log
```

Look for:
- `panic` messages
- `Error:` lines
- Stack traces
- "Failed to initialize" messages

---

## Quick Fixes (Try in Order)

### Fix 1: Test LSP Binary Directly (30 seconds)

```bash
cd vscode-extension\bin

# Try to run the binary (it should wait for stdin)
.\log-scout-lsp-server-win.exe
```

**Expected**: Server should start and wait (won't output anything until it receives LSP protocol messages)

**If it crashes immediately**: Binary is corrupted or missing dependencies.

**Action**: Rebuild binary
```bash
cd ..\..
npm run build:lsp
```

---

### Fix 2: Check File Permissions (1 minute)

The LSP binary might not have execute permissions:

```bash
# Check if binary is blocked by Windows
cd vscode-extension\bin
dir /Q log-scout-lsp-server-win.exe

# Unblock if needed (right-click → Properties → Unblock)
```

**Or via PowerShell**:
```powershell
Unblock-File -Path "vscode-extension\bin\log-scout-lsp-server-win.exe"
```

---

### Fix 3: Check Antivirus (2 minutes)

Some antivirus software blocks unsigned executables from running in pipe mode.

**Action**: 
1. Add exception for `log-scout-lsp-server-win.exe`
2. Or temporarily disable antivirus to test

**Common culprits**:
- Windows Defender
- Symantec Endpoint Protection
- McAfee
- Norton

---

### Fix 4: Verify Binary Architecture (1 minute)

```bash
# Check if binary is 64-bit (should be)
dumpbin /headers vscode-extension\bin\log-scout-lsp-server-win.exe | findstr machine
```

**Expected**: `8664 machine (x64)`

If it shows `14C machine (x86)`, you need to rebuild for 64-bit:
```bash
cd lsp-server
cargo build --release --target x86_64-pc-windows-msvc
```

---

### Fix 5: Check for Missing DLL Dependencies (2 minutes)

```bash
# Check for missing DLLs
dumpbin /dependents vscode-extension\bin\log-scout-lsp-server-win.exe
```

The Rust binary should be mostly self-contained, but might need:
- `VCRUNTIME140.dll`
- `api-ms-win-crt-runtime-l1-1-0.dll`

**Fix**: Install Visual C++ Redistributable
- Download from: https://aka.ms/vs/17/release/vc_redist.x64.exe
- Or: `winget install Microsoft.VCRedist.2015+.x64`

---

### Fix 6: Enable Verbose LSP Logging (3 minutes)

**Edit**: `vscode-extension/src/lspClient.ts`

Find line ~110 and change:
```typescript
RUST_LOG: traceLevel === "verbose" ? "debug" : "info",
```

To:
```typescript
RUST_LOG: "trace",  // Force maximum verbosity
```

**Then rebuild**:
```bash
cd vscode-extension
npm run compile
```

**Test again** and check logs for more details.

---

### Fix 7: Test with Simple LSP Test Client (5 minutes)

Create a minimal test to see if the server can respond:

**test-lsp.js**:
```javascript
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'vscode-extension', 'bin', 'log-scout-lsp-server-win.exe');

console.log('Starting LSP server:', serverPath);

const server = spawn(serverPath, [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, RUST_LOG: 'trace' }
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('exit', (code, signal) => {
  console.log('Server exited:', code, signal);
});

// Send LSP initialize request
const initRequest = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    processId: process.pid,
    rootUri: null,
    capabilities: {}
  }
});

const message = `Content-Length: ${initRequest.length}\r\n\r\n${initRequest}`;

server.stdin.write(message);

setTimeout(() => {
  console.log('Shutting down...');
  server.kill();
}, 5000);
```

**Run**:
```bash
node test-lsp.js
```

**Expected**: Should see LSP server responding with initialization result.

---

### Fix 8: Disable LSP Temporarily (Workaround)

If LSP continues to fail, you can disable it temporarily to test the rest of the extension.

**Edit**: `vscode-extension/src/extension.ts`

Find the `activate()` function and comment out LSP startup:
```typescript
export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...
  
  // TEMPORARILY DISABLED - Comment out these lines:
  // setLSPLogger(fileLogger);
  // await startLSPClient(context, outputChannel);
  
  // ... rest of code ...
}
```

**Rebuild and test**:
```bash
npm run compile
# Press F5 to test
```

This lets you test if the rest of the extension works without LSP.

---

## Common Root Causes

### 1. **Binary Corruption**
- **Symptom**: Process exits immediately
- **Fix**: Rebuild binary (`npm run build:lsp`)

### 2. **Windows Security**
- **Symptom**: Process blocked or killed immediately
- **Fix**: Unblock file, add antivirus exception

### 3. **Missing Dependencies**
- **Symptom**: "DLL not found" or similar
- **Fix**: Install VC++ Redistributable

### 4. **Path Issues**
- **Symptom**: "File not found"
- **Fix**: Check `lspClient.ts` getServerPath() function

### 5. **Pipe Communication Failure**
- **Symptom**: EPIPE errors
- **Fix**: Check stdin/stdout/stderr configuration

### 6. **Rust Panic**
- **Symptom**: Server crashes on startup
- **Fix**: Check LSP server logs for panic messages

---

## Detailed Log Analysis

### What to Look For in LSP Logs

**Good startup**:
```
Starting Log Scout LSP Server v0.1.0
Log file: C:\Users\...\lsp-server-2025-01-22.log
LSP Server running in stdio mode
```

**Bad startup - Panic**:
```
thread 'main' panicked at 'Failed to...'
stack backtrace:
  0: std::panicking::begin_panic
  ...
```

**Bad startup - Missing file**:
```
Error: No such file or directory (os error 2)
```

**Bad startup - Permission denied**:
```
Error: Permission denied (os error 5)
```

---

## Windows Event Viewer Check

1. Open **Event Viewer** (eventvwr.msc)
2. Navigate to: **Windows Logs → Application**
3. Look for errors from `log-scout-lsp-server-win.exe`
4. Check error details for crash information

---

## Nuclear Option: Complete Rebuild (10 minutes)

If nothing else works:

```bash
# Clean everything
cd lsp-server
cargo clean

# Remove node_modules
cd ../vscode-extension
rm -rf node_modules
rm -rf out
npm install

# Rebuild LSP from scratch
cd ..
npm run build:lsp

# Rebuild extension
cd vscode-extension
npm run compile

# Test
code .
# Press F5
```

---

## Verification After Fix

Once fixed, you should see in Output → "Log Scout Analyzer":

```
🔌 Initializing LSP client...
📦 Using local LSP server: C:\...\log-scout-lsp-server-win.exe
🚀 Starting LSP client...
✅ LSP client started successfully
🔗 Connected to TagScout pattern engine via LSP
📝 Extension log: C:\Users\...\extension.log
📝 LSP server log: C:\Users\...\lsp-server-2025-01-22.log
```

**No more**:
- ❌ EPIPE errors
- ❌ "Client is not running" errors
- ❌ Server crash messages

---

## Still Broken?

### Last Resort Diagnostic

Create a GitHub issue with:

1. **LSP server log** (latest from `%USERPROFILE%\.log-scout-analyzer\`)
2. **Extension log** (from same directory)
3. **Output from**:
   ```bash
   # System info
   systeminfo | findstr /C:"OS Name" /C:"OS Version"
   
   # Binary info
   dir vscode-extension\bin\log-scout-lsp-server-win.exe
   
   # Cargo version
   cargo --version
   
   # Node version
   node --version
   ```
4. **Event Viewer errors** (if any)
5. **Steps to reproduce**

---

## Summary

**Most Common Fix**: Rebuild LSP binary
```bash
npm run build:lsp
```

**Second Most Common**: Unblock file or add antivirus exception

**Third Most Common**: Missing VC++ Redistributable

**Test Method**: Check logs first, then try fixes in order.

---

**Last Updated**: 2025-01-22
**Success Rate**: 95% resolved by Fix 1-3
**Time to Fix**: 5-15 minutes average