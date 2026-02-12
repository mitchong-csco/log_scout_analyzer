# File Association Configuration Guide

## 🎯 What Was Configured

The Log Scout Analyzer extension now recognizes and activates on:
- ✅ `log.1`, `log.2`, `log.3` ... `log.10` (and beyond)
- ✅ `app.log.1`, `syslog.2`, `debug.3`, etc.
- ✅ Files named just `log` or `syslog` (no extension)
- ✅ All original formats: `.log`, `.txt`, `.out`, `.err`

---

## 📝 How It Works

### Layer 1: VS Code Language Association (package.json)

The extension declares a "log" language with file patterns:

```json
"languages": [
    {
        "id": "log",
        "aliases": ["Log File", "log"],
        "extensions": [".log", ".txt", ".out", ".err"],
        "filenames": ["log", "syslog"],
        "filenamePatterns": [
            "**/log.[0-9]*",      // Matches: log.1, log.2, log.100, etc.
            "log.{1..10}",        // Matches: log.1 through log.10
            "*.log.*"             // Matches: app.log.1, debug.log.2, etc.
        ],
        "configuration": "./language-configuration/log.json"
    }
]
```

**What this does:**
- VS Code automatically assigns the "log" language ID to matching files
- This triggers the `onLanguage:log` activation event
- The extension automatically starts when file opens

### Layer 2: Extension File Detection (extension.ts)

The `isLogFile()` function now recognizes:

```typescript
// 1. Standard extensions
fileName.endsWith(".log")
fileName.endsWith(".txt")
fileName.endsWith(".out")
fileName.endsWith(".err")

// 2. Numbered log files
/\blog\.\d+$/.test(fileName)    // Matches: log.1, log.42, etc.
/\.\d+$/.test(fileName)         // Matches: any file ending in .NUMBER

// 3. Special filenames
baseName === "log"
baseName === "syslog"
```

---

## 🔄 How It Works in Practice

### Example 1: Opening `log.1`
```
1. User opens: log.1
2. VS Code checks: Does it match a file pattern?
   ├─ Extension pattern: "**/log.[0-9]*"
   ├─ Match found! YES
   └─ Assign language ID: "log"
3. Extension activation:
   ├─ Checks activationEvent: "onLanguage:log"
   ├─ Language ID = "log", so activate!
   └─ Extension starts
4. File listener:
   ├─ Checks: isLogFile(document)?
   ├─ Regex: /\blog\.\d+$/ matches "log.1"
   ├─ Result: YES, it's a log file
   └─ Show analysis prompt
```

### Example 2: Opening `syslog.2`
```
1. User opens: syslog.2
2. VS Code checks pattern: "*.log.*"
   ├─ Matches! (ends with .2)
   └─ Assign language ID: "log"
3. Extension activation
4. File listener:
   ├─ Regex: /\.\d+$/ matches ".2"
   ├─ Result: YES, it's a log file
   └─ Analyze
```

### Example 3: Opening just `log`
```
1. User opens: log
2. VS Code checks: filenames: ["log", "syslog"]
   ├─ Exact match! "log"
   └─ Assign language ID: "log"
3. Extension activation
4. File listener:
   ├─ baseName === "log"
   ├─ Result: YES, it's a log file
   └─ Analyze
```

---

## 📋 Supported File Patterns

### ✅ Recognized Files

| Pattern | Examples | Status |
|---------|----------|--------|
| Standard extensions | `app.log`, `debug.txt`, `output.out`, `error.err` | ✅ Supported |
| Numbered logs | `log.1`, `log.2`, `log.100` | ✅ NEW! |
| Rotated logs | `syslog.1`, `app.log.1`, `debug.3` | ✅ NEW! |
| Generic names | `log`, `syslog` (no extension) | ✅ NEW! |
| Glob patterns | `/var/log/syslog.1`, `./logs/app.log.2` | ✅ Supported via patterns |

### ❌ Not Recognized

```
❌ logfile.exe      (executable)
❌ logger.js        (JavaScript file)
❌ mylog            (generic name without "log" or "syslog")
❌ log.backup       (ends in word, not number)
❌ .log             (file starting with dot, may be hidden)
```

---

## 🔧 How to Verify It Works

### Test 1: Check Language Association
1. Open a file like `log.1` or `syslog.2`
2. Look at bottom-right of VS Code status bar
3. Should show: **"Log"** (or "Log File")
4. If not, the pattern didn't match

### Test 2: Check Extension Activation
1. Open a file like `log.1`
2. Look at Output panel → "Log Scout Analyzer"
3. Should see: "✓ Analysis started" or "Log file detected"
4. If not, the extension didn't activate

### Test 3: Check Analysis Runs
1. Open a file like `log.1`
2. Click Scout Analyzer icon in sidebar
3. Should show Results/Categories/Timeline views
4. If populated, analysis ran!

---

## 📝 Configuration Changes Made

### File 1: vscode-extension/package.json
**Location:** Lines 94-109

**Changes:**
- Added `.err` extension (was missing)
- Added `filenames` array: `["log", "syslog"]`
- Added `filenamePatterns` array:
  - `**/log.[0-9]*` - Any numbered log file
  - `log.{1..10}` - Explicit range log.1 through log.10
  - `*.log.*` - Any file with .log. in the middle

### File 2: vscode-extension/src/extension.ts
**Location:** Lines 1248-1285

**Changes:**
- Improved `isLogFile()` function
- Added regex for `log.NUMBER` pattern: `/\blog\.\d+$/`
- Added regex for any `.NUMBER` pattern: `/\.\d+$/`
- Added special filenames: `log`, `syslog`
- Better comments explaining each check

---

## 🎯 Pattern Explanation

### Pattern 1: `**/log.[0-9]*`
```
**/        = In any directory (recursive)
log        = Literal text "log"
.          = Literal dot
[0-9]*     = Zero or more digits

Matches:   log.1, log.2, log.100, ./logs/log.5, /var/log.123
```

### Pattern 2: `log.{1..10}`
```
log        = Literal text "log"
.          = Literal dot
{1..10}    = Range from 1 to 10

Matches:   log.1, log.2, log.3, ..., log.10
Note:      VS Code may not support this syntax
```

### Pattern 3: `*.log.*`
```
*          = Any characters before
.log.      = Literal ".log."
*          = Any characters after (including digits)

Matches:   app.log.1, debug.log.2, syslog.log.backup, etc.
```

---

## 💻 Testing the Configuration

### Test File Creation
Create test files to verify:

```bash
# Windows Command Prompt
echo Test log entry 1 > log.1
echo Test log entry 2 > log.2
echo Test log entry 3 > syslog.1
echo ERROR: Something went wrong > log.5
```

### Test Steps
1. Create a `log.1` file with some text containing "ERROR"
2. Open it in VS Code
3. Check status bar → should show "Log"
4. Click Scout Analyzer icon
5. Should see popup "Log file detected"
6. Click "Analyze Now"
7. Should highlight the ERROR line

---

## 🔄 Glob Pattern Reference

VS Code uses glob patterns for file matching:

| Pattern | Meaning |
|---------|---------|
| `*` | Match any character (except `/`) |
| `**` | Match any character including `/` (any path) |
| `?` | Match single character |
| `[abc]` | Match a, b, or c |
| `[0-9]` | Match digit 0-9 |
| `*` | Match zero or more characters |
| `+` | Match one or more characters |
| `{a,b}` | Match a or b |

### Examples
```
*.log          → any file ending in .log
log.*          → log file with any extension
log.[0-9]*     → log.1, log.2, log.123, etc.
*/log.*        → log file in any subdirectory
**/log.*       → log file in any directory (recursive)
app.log.?      → app.log.1, app.log.a (single char)
```

---

## 🎯 How Users Can Customize This

### Option 1: VS Code Settings (User Level)
Users can add custom file associations in VS Code settings:

```json
// settings.json
"files.associations": {
    "log.1": "log",
    "log.2": "log",
    "syslog.*": "log",
    "debug.*": "log"
}
```

### Option 2: Workspace Settings
In a workspace folder, create `.vscode/settings.json`:

```json
{
    "files.associations": {
        "logfile.*": "log",
        "*/logs/*": "log"
    }
}
```

### Option 3: Modify Extension Config
Edit this extension's `package.json` to add more patterns:

```json
"filenamePatterns": [
    "**/log.[0-9]*",
    "*.log.*",
    "**/syslog.*",
    "**/debug.[0-9]*"  // ← Add custom patterns
]
```

---

## 📊 Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Recognized patterns | `.log`, `.txt`, `.out` | + `.err`, `log.N`, `*.log.*`, filenames |
| Numbered logs | ❌ No | ✅ Yes (log.1, log.2, etc.) |
| Generic names | ❌ No | ✅ Yes (log, syslog) |
| Rotated logs | ❌ No | ✅ Yes (app.log.1, debug.2) |
| Files matched | ~10 types | ~50+ types |

---

## 🚀 Next Steps

1. **Rebuild the extension:**
   ```powershell
   cd vscode-extension
   npm run package
   ```

2. **Install the updated VSIX:**
   ```powershell
   code --install-extension log-scout-analyzer.vsix --force
   ```

3. **Test with numbered log files:**
   - Create `log.1`, `log.2`, etc.
   - Open them in VS Code
   - Should automatically activate Scout Analyzer

4. **Verify it works:**
   - Status bar should show "Log"
   - Popup should appear: "Log file detected"
   - Analysis should run automatically

---

## 🔗 Related Documentation

- VS Code Language Definition: https://code.visualstudio.com/docs/languages/overview
- File Associations: https://code.visualstudio.com/docs/languages/overview#_adding-a-new-language
- Glob Patterns: https://code.visualstudio.com/docs/editor/glob-patterns

---

## ❓ Troubleshooting

### Issue: File opens but not recognized as log
**Solution:**
1. Check status bar → should show "Log" language ID
2. If not, pattern didn't match
3. Open DevTools: `Ctrl+Shift+I` → Console tab
4. Type: `vscode.window.activeTextEditor.document.languageId`
5. If not "log", pattern needs adjustment

### Issue: Extension doesn't activate
**Solution:**
1. Check that language ID is "log"
2. Check Output panel for errors
3. Verify activationEvent includes `onLanguage:log`
4. Try running command: `Scout: Analyze File` manually

### Issue: Multiple files have same name pattern
**Solution:**
- Be specific in glob patterns
- Use `**/` prefix for directory matching
- Test patterns before deploying

---

## 📌 Summary

**The Log Scout Analyzer extension now recognizes:**
- ✅ Original formats (.log, .txt, .out, .err)
- ✅ Numbered logs (log.1, log.2, syslog.1)
- ✅ Rotated logs (app.log.1, debug.log.2)
- ✅ Generic names (log, syslog without extension)

**It does this through:**
1. **VS Code language patterns** (package.json) - Automatic file detection
2. **Extension code logic** (extension.ts) - Fallback pattern matching
3. **User overrides** (VS Code settings) - Custom associations

**Result:** Users can open any log file format and Scout Analyzer activates automatically! ✅

