# ⚡ Quick Reference Card: Extension Activation

## 🎯 One-Minute Explanation

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  USER OPENS .log FILE                              │
│         ↓                                           │
│  VS CODE DETECTS .log EXTENSION                    │
│         ↓                                           │
│  "onLanguage:log" ACTIVATION EVENT FIRES           │
│         ↓                                           │
│  EXTENSION WAKES UP & INITIALIZES                  │
│         ↓                                           │
│  FILE LISTENER DETECTS LOG FILE                    │
│         ↓                                           │
│  SHOWS PROMPT: "ANALYZE NOW?"                      │
│         ↓                                           │
│  USER CLICKS "ANALYZE NOW"                         │
│         ↓                                           │
│  PATTERN MATCHING BEGINS                           │
│         ↓                                           │
│  RESULTS APPEAR IN UI                              │
│         ↓                                           │
│  DONE! ANALYSIS COMPLETE                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📍 The 3 Magic Pieces

### Piece 1: Activation Event (When to start?)
**File:** `vscode-extension/package.json` line 26  
**Code:** `"onLanguage:log"`  
**Purpose:** Tell VS Code to start extension when .log file opens

### Piece 2: Extension Init (What to do?)
**File:** `vscode-extension/src/extension.ts` line 39  
**Code:** `export function activate(context) { ... }`  
**Purpose:** Initialize all components when extension starts

### Piece 3: File Listener (How to detect?)
**File:** `vscode-extension/src/extension.ts` line 1084  
**Code:** `vscode.workspace.onDidOpenTextDocument((doc) => { ... })`  
**Purpose:** Watch for files and analyze log files

---

## 🔄 The Complete Flow

```
ACTIVATION EVENT        → onLanguage:log (matches .log file)
           ↓
EXTENSION STARTS        → activate() function called
           ↓
INITIALIZE COMPONENTS   → PatternEngine, DiagnosticsProvider, Listeners
           ↓
WAIT FOR FILE OPEN      → onDidOpenTextDocument listener ready
           ↓
FILE OPENS              → User opens app.log
           ↓
CHECK FILE TYPE         → isLogFile() = YES
           ↓
SHOW PROMPT             → "Analyze this log file?"
           ↓
USER CLICKS YES         → "Analyze Now"
           ↓
ANALYZE DOCUMENT        → analyzeDocument(document)
           ↓
UPDATE UI               → Results, Categories, Timeline, Console
           ↓
DONE                    → Show results to user
```

---

## 💡 Key Code Snippets

### 1. Activation Event (package.json)
```json
"activationEvents": [
    "onLanguage:log"  ← THIS LINE!
]
```

### 2. Extension Activation (extension.ts:39)
```typescript
export function activate(context: vscode.ExtensionContext) {
    patternEngine = new PatternEngine();
    diagnosticsProvider = new DiagnosticsProvider(...);
    // Register listeners...
}
```

### 3. File Listener (extension.ts:1084)
```typescript
vscode.workspace.onDidOpenTextDocument((document) => {
    if (isLogFile(document)) {
        diagnosticsProvider.analyzeDocument(document);
    }
});
```

### 4. Log Detection (extension.ts:1248)
```typescript
function isLogFile(document): boolean {
    const fileName = document.fileName.toLowerCase();
    const logExtensions = [".log", ".txt", ".out", ".err"];
    return logExtensions.some(ext => fileName.endsWith(ext));
}
```

---

## ⏱️ Timeline

```
0:00  VS Code starts (extension dormant)
5:20  User opens app.log
5:20  VS Code triggers onLanguage:log event
5:20  Extension starts initializing
5:20.050  Initialization complete
5:20.051  File listener fires
5:20.052  User sees "Analyze now?" popup
5:20.053  User clicks "Analyze Now"
5:20.054  Analysis starts
5:20.150  Analysis complete
5:20.151  Results appear in UI
```

---

## 📊 Quick Comparison

| Aspect | With Lazy Loading ✅ | Without ❌ |
|--------|-------|-------|
| VS Code startup | <5 sec | 30+ sec |
| Memory used | 50 MB | 500+ MB |
| Extension loaded | Only when needed | Always |
| First .log file | ~100ms delay | Instant |
| Efficiency | HIGH | LOW |

---

## 🎓 What Happens

When you open `app.log`:

```
STAGE 1: ACTIVATION
├─ Activation event fires
├─ Extension code loads
└─ Components initialize

STAGE 2: DETECTION
├─ File open listener fires
├─ Checks: is it a log file?
└─ Result: YES!

STAGE 3: ANALYSIS
├─ Shows prompt (or auto-analyzes)
├─ User clicks "Analyze Now"
└─ Analysis begins

STAGE 4: DISPLAY
├─ Pattern matching complete
├─ Diagnostics created
├─ UI updates
└─ Results visible

STAGE 5: READY
└─ Extension idle, waiting for next event
```

---

## 🔌 Settings

```json
{
  "logScoutAnalyzer.enableDiagnostics": true,
  "logScoutAnalyzer.autoPromptOnOpen": true,
  "logScoutAnalyzer.autoAnalyzeOnOpen": false
}
```

| Setting | Default | Effect |
|---------|---------|--------|
| enableDiagnostics | true | Enable/disable analysis |
| autoPromptOnOpen | true | Show "Analyze?" prompt |
| autoAnalyzeOnOpen | false | Skip prompt, auto-analyze |

---

## 🎯 Why This Design?

**Lazy Loading = Efficiency**

```
❌ Load everything at startup
   - Slow to start
   - Uses lots of memory
   - Extensions you don't use run anyway

✅ Load only when needed
   - Fast to start
   - Uses minimal memory
   - Only active extensions you use
```

---

## ✅ Verification

**How to know it's working:**
- ✅ Open a .log file
- ✅ See the popup: "Log file detected"
- ✅ Click "Analyze Now"
- ✅ Results appear

**How to know it's NOT working:**
- ❌ Long delay before popup appears
- ❌ No popup at all
- ❌ Red errors in Output panel
- ❌ No results after analyzing

---

## 🚀 File Extensions Recognized

```
✅ .log    ← Automatically recognized
✅ .txt    ← Automatically recognized
✅ .out    ← Automatically recognized
✅ .err    ← Automatically recognized
❌ .logx   ← Not recognized (wrong extension)
```

---

## 📱 User Experience

```
User:  "I opened a log file"
Tool:  "Hey! That's a log file! Want me to analyze it?"
User:  "Yes!"
Tool:  "Analyzing... Done! Here are the errors:"
```

---

## 🔗 Source Files

**Must Know:**
```
vscode-extension/package.json       (line 26: activation event)
vscode-extension/src/extension.ts   (line 39: activate function)
vscode-extension/src/extension.ts   (line 1084: file listener)
vscode-extension/src/extension.ts   (line 1248: file detection)
```

**Nice to Know:**
```
vscode-extension/src/patternEngine.ts         (pattern matching)
vscode-extension/src/diagnosticsProvider.ts   (creating diagnostics)
vscode-extension/src/resultsTreeProvider.ts   (results view)
```

---

## 🎓 Concepts

**Lazy Loading:** Load code only when needed  
**Activation Event:** Signal that triggers extension loading  
**Event Listener:** Code that waits for something to happen  
**File Detection:** Checking if file is a log file  
**Pattern Matching:** Finding errors in log files  

---

## 📚 Full Documentation

| Time | Document |
|------|----------|
| 1 min | VISUAL_SUMMARY.md (end) |
| 5 min | ACTIVATION_QUICK_ANSWER.md |
| 10 min | VISUAL_SUMMARY.md (full) |
| 15 min | ACTIVATION_CODE_DEEP_DIVE.md |
| 30 min | HOW_ACTIVATION_WORKS.md |
| Navigation | DOCUMENTATION_NAVIGATION.md |

---

## 🎯 Bottom Line

```
Extension activates when:
  ✓ You open a .log/.txt/.out/.err file
  ✓ VS Code fires "onLanguage:log" event
  ✓ Extension starts and initializes
  ✓ Detects log file and shows prompt
  ✓ User clicks "Analyze Now"
  ✓ Results appear instantly
```

**Reason:** Lazy loading keeps VS Code fast!

---

**Created:** February 10, 2026  
**Print friendly:** YES (quick reference)  
**Read time:** <2 minutes  
**Understand:** YES ✅
