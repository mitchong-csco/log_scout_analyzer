# How Extension Activation Works

## 🚀 The Activation Flow

When you open VS Code, the Log Scout Analyzer extension doesn't load immediately. Instead, it waits for **activation events** that trigger it to start. Here's exactly how it works:

---

## 📋 Step-by-Step Activation Process

### **Step 1: Extension Registration** (VS Code startup)
When VS Code starts, it reads the `package.json` file and checks the `activationEvents`:

```json
"activationEvents": [
    "onCommand:logScoutAnalyzer.analyzeFile",
    "onCommand:logScoutAnalyzer.clearDiagnostics",
    "onCommand:logScoutAnalyzer.showPatterns",
    "onCommand:logScoutAnalyzer.showVersion",
    "onCommand:logScoutAnalyzer.openAnalyzerPanel",
    "onLanguage:log",
    "onView:scoutCategories",
    "onView:scoutResults",
    "onView:scoutTimeline",
    "*"
]
```

**What each activation event means:**

| Event | Triggers When |
|-------|--------------|
| `onCommand:logScoutAnalyzer.analyzeFile` | You run the "Analyze File" command |
| `onCommand:logScoutAnalyzer.clearDiagnostics` | You run the "Clear Diagnostics" command |
| `onCommand:logScoutAnalyzer.showPatterns` | You run the "Show Patterns" command |
| `onCommand:logScoutAnalyzer.showVersion` | You run the "Show Version" command |
| `onCommand:logScoutAnalyzer.openAnalyzerPanel` | You run the "Open Analyzer Panel" command |
| `onLanguage:log` | You open any `.log` file |
| `onView:scoutCategories` | You click on the Categories view in the sidebar |
| `onView:scoutResults` | You click on the Results view in the sidebar |
| `onView:scoutTimeline` | You click on the Timeline view in the sidebar |
| `*` | Fallback: Activates on any event (ensures it's ready) |

### **Step 2: You Open a Log File**
You open any file with these extensions:
- `.log`
- `.txt`
- `.out`
- `.err`

Example:
```
Open file: C:\logs\app.log
```

### **Step 3: VS Code Triggers Activation**
VS Code sees the `onLanguage:log` activation event and the file extension matches. It calls the `activate()` function in `extension.ts`:

```typescript
export function activate(context: vscode.ExtensionContext) {
    // Extension initialization code runs here
    outputChannel = vscode.window.createOutputChannel("Log Scout Analyzer");
    patternEngine = new PatternEngine();
    diagnosticsProvider = new DiagnosticsProvider(...);
    // ... more initialization
}
```

### **Step 4: Document Open Event Listener**
Once activated, the extension registers a listener for when documents are opened:

```typescript
const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    (document) => {
        // This code runs every time a document is opened
        if (isLogFile(document) && diagnosticsProvider && outputChannel) {
            // Check if it's a log file
            // Then ask user to analyze or auto-analyze
        }
    }
);
```

### **Step 5: Check if It's a Log File**
The `isLogFile()` function checks:

```typescript
function isLogFile(document: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const enableDiagnostics = config.get<boolean>("enableDiagnostics", true);

    if (!enableDiagnostics) {
        return false;  // User disabled diagnostics
    }

    // Check language ID
    if (document.languageId === "log") {
        return true;
    }

    // Check file extensions
    const fileName = document.fileName.toLowerCase();
    const logExtensions = [".log", ".txt", ".out", ".err"];

    return logExtensions.some((ext) => fileName.endsWith(ext));
}
```

**Returns `true` if:**
- ✅ File extension is `.log`, `.txt`, `.out`, or `.err`
- ✅ Language ID is "log"
- ✅ `enableDiagnostics` setting is `true` (default)

### **Step 6: Prompt User (Optional)**
If a log file is detected, the extension shows a prompt:

```typescript
if (autoPrompt) {
    vscode.window
        .showInformationMessage(
            `Log file detected: app.log`,
            "Analyze Now",
            "Analyze Later",
            "Don't Ask Again"
        )
        .then((choice) => {
            if (choice === "Analyze Now") {
                vscode.commands.executeCommand("logScoutAnalyzer.analyzeFile");
            }
        });
}
```

**Options:**
- **Analyze Now** - Runs analysis immediately
- **Analyze Later** - Skips analysis for this file
- **Don't Ask Again** - Disables the prompt globally (auto-analyzes all future files)

### **Step 7: Analysis Runs**
If user chooses "Analyze Now" (or auto-analyze is enabled), the analysis starts:

```typescript
diagnosticsProvider.analyzeDocument(document);
```

This:
1. Loads pattern files from `config/` folder
2. Matches patterns against log lines
3. Creates diagnostics for matches
4. Updates the Results/Categories/Timeline views
5. Shows output in Scout Console

### **Step 8: Display Results**
Results appear in:
- 📋 **Results View** - Grouped by severity
- 🏷️ **Categories View** - Grouped by component
- 📅 **Timeline View** - Grouped by time
- 📝 **Scout Console** - Real-time output
- ⚠️ **Problems Panel** - VS Code's diagnostics
- 📊 **Status Bar** - Quick stats

---

## 🔄 The Complete Lifecycle

```
┌─────────────────────────────────────────────────────┐
│ 1. VS Code Starts                                   │
│    └─ Reads package.json activationEvents           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Waits for Activation Event                       │
│    (no extension code running yet)                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. User Opens Log File (app.log)                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. VS Code Triggers:                                │
│    - onLanguage:log                                 │
│    - OR: onCommand:* (if user runs command)         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Extension Loads & Activates                      │
│    - Calls activate() function                      │
│    - Initializes components                         │
│    - Loads patterns                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. File Open Listener Fires                         │
│    - onDidOpenTextDocument event                    │
│    - Checks isLogFile(document)                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. Show Prompt (or Auto-Analyze)                   │
│    - "Analyze Now" or "Analyze Later"               │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 8. Analyze Document                                 │
│    - Match patterns                                 │
│    - Create diagnostics                             │
│    - Update views                                   │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 9. Display Results                                  │
│    - Results/Categories/Timeline views              │
│    - Scout Console output                           │
│    - Problems panel                                 │
└─────────────────────────────────────────────────────┘
```

---

## 💡 Key Code Locations

### **Activation Events Definition**
📄 File: `vscode-extension/package.json` (lines 23-34)
```json
"activationEvents": [
    "onLanguage:log",
    "onCommand:logScoutAnalyzer.analyzeFile",
    "*"
]
```

### **Extension Main Entry Point**
📄 File: `vscode-extension/src/extension.ts` (line 39)
```typescript
export function activate(context: vscode.ExtensionContext) {
    // All initialization happens here
}
```

### **Document Open Listener**
📄 File: `vscode-extension/src/extension.ts` (line 1084)
```typescript
const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    (document) => {
        if (isLogFile(document) && diagnosticsProvider) {
            // Handle log file
        }
    }
);
```

### **Log File Detection**
📄 File: `vscode-extension/src/extension.ts` (line 1248)
```typescript
function isLogFile(document: vscode.TextDocument): boolean {
    // Checks extension and settings
}
```

---

## ⚙️ Configuration Settings

Users can control activation behavior in VS Code settings:

```json
{
    "logScoutAnalyzer.enableDiagnostics": true,      // Enable/disable analysis
    "logScoutAnalyzer.autoPromptOnOpen": true,       // Show prompt on log file open
    "logScoutAnalyzer.autoAnalyzeOnOpen": false      // Auto-analyze without prompt
}
```

### Settings Behavior

| Setting | Value | Behavior |
|---------|-------|----------|
| `enableDiagnostics` | `true` | Analysis enabled (default) |
| `enableDiagnostics` | `false` | No analysis, extension still runs |
| `autoPromptOnOpen` | `true` | Shows "Analyze Now?" prompt (default) |
| `autoPromptOnOpen` | `false` | Auto-analyzes without asking |

---

## 🎯 Summary

**How it activates on log file open:**

1. ✅ User opens a file with `.log`, `.txt`, `.out`, or `.err` extension
2. ✅ VS Code triggers `onLanguage:log` activation event
3. ✅ Extension's `activate()` function is called
4. ✅ Extension registers a listener for file open events
5. ✅ When the log file opens, `onDidOpenTextDocument` fires
6. ✅ `isLogFile()` checks if it's a log file
7. ✅ If yes, shows prompt or auto-analyzes based on settings
8. ✅ Analysis runs and results display in the UI

**The key insight:** The extension uses **lazy loading** - it only activates when needed, not on every VS Code startup. This keeps VS Code fast!

