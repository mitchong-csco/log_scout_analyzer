# Activation Code Deep Dive - Actual Source Code

## 📖 The Complete Code Flow

This document shows the actual TypeScript code that makes activation work.

---

## Step 1: Activation Events Trigger

**File:** `vscode-extension/package.json` (lines 23-34)

```json
"activationEvents": [
    "onCommand:logScoutAnalyzer.analyzeFile",
    "onCommand:logScoutAnalyzer.clearDiagnostics",
    "onCommand:logScoutAnalyzer.showPatterns",
    "onCommand:logScoutAnalyzer.showVersion",
    "onCommand:logScoutAnalyzer.openAnalyzerPanel",
    "onLanguage:log",              ← When user opens .log file
    "onView:scoutCategories",      ← When user clicks Categories view
    "onView:scoutResults",         ← When user clicks Results view
    "onView:scoutTimeline",        ← When user clicks Timeline view
    "*"                            ← Fallback (activate on anything)
],
```

**What VS Code does:**
```
User opens app.log
    ↓
VS Code checks: Is file extension .log?
    ↓
YES! → Matches "onLanguage:log" event
    ↓
VS Code triggers: activate() function in extension.ts
```

---

## Step 2: Extension Initializes

**File:** `vscode-extension/src/extension.ts` (line 39)

```typescript
export function activate(context: vscode.ExtensionContext) {
    // ========== STEP 1: Create output channel ==========
    outputChannel = vscode.window.createOutputChannel("Log Scout Analyzer");
    context.subscriptions.push(outputChannel);

    const activationTime = new Date().toISOString();
    outputChannel.appendLine("╔════════════════════════════════════════╗");
    outputChannel.appendLine("║   LOG SCOUT ANALYZER ACTIVATED        ║");
    outputChannel.appendLine("╚════════════════════════════════════════╝");
    outputChannel.appendLine(`📦 Version: ${BUILD_INFO.version}`);
    
    // ========== STEP 2: Initialize Scout Console ==========
    scoutConsole = new ScoutConsole();
    scoutConsole.logMessage("╔════════════════════════════════════════╗");
    scoutConsole.logMessage("║   SCOUT CONSOLE INITIALIZED           ║");
    scoutConsole.logMessage("╚════════════════════════════════════════╝");

    // ========== STEP 3: Initialize Pattern Engine ==========
    patternEngine = new PatternEngine();
    // This loads all pattern files from config/

    // ========== STEP 4: Initialize Diagnostics Provider ==========
    const diagnosticCollection = 
        vscode.languages.createDiagnosticCollection("log-scout-analyzer");
    diagnosticsProvider = new DiagnosticsProvider(
        diagnosticCollection,
        patternEngine,
        outputChannel,
        updateStatusBar
    );

    // ========== STEP 5: Register tree views ==========
    resultsTreeProvider = new ResultsTreeProvider();
    categoriesTreeProvider = new CategoriesTreeProvider();
    timelineTreeProvider = new TimelineTreeProvider();
    analyzerTreeProvider = new AnalyzerTreeProvider();

    // ========== STEP 6: Register document change listeners ==========
    // THIS IS THE MAGIC PART!
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
        (document) => {
            // Called every time a document is opened
            if (isLogFile(document) && diagnosticsProvider && outputChannel) {
                // ... handle log file
            }
            updateStatusBar();
        }
    );

    // ... more initialization code ...

    context.subscriptions.push(onDidOpenTextDocument);
}
```

**What happens:**
1. ✅ Output channel created for logging
2. ✅ Scout Console initialized
3. ✅ Pattern Engine loads YAML files from `config/`
4. ✅ Diagnostics Provider created
5. ✅ Tree Views registered
6. ✅ **Document listener registered** ← This watches for file opens!

---

## Step 3: Document Open Listener

**File:** `vscode-extension/src/extension.ts` (lines 1084-1128)

```typescript
// This code runs EVERY TIME a document is opened
const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    (document) => {
        // document = the file that was just opened
        
        if (isLogFile(document) && diagnosticsProvider && outputChannel) {
            // Only process if it's a log file!
            
            outputChannel.appendLine("");
            outputChannel.appendLine(
                `[${new Date().toISOString()}] 📂 Auto-analyzing opened file`
            );
            outputChannel.appendLine(`   → ${document.fileName}`);

            // Get user's settings
            const config = 
                vscode.workspace.getConfiguration("logScoutAnalyzer");
            const autoPrompt = config.get<boolean>(
                "autoPromptOnOpen",
                true  // Default to true
            );

            if (autoPrompt) {
                // ========== SHOW PROMPT ==========
                vscode.window
                    .showInformationMessage(
                        `Log file detected: ${document.fileName.split(/[\\/]/).pop()}`,
                        "Analyze Now",      // Option 1
                        "Analyze Later",    // Option 2
                        "Don't Ask Again"   // Option 3
                    )
                    .then((choice) => {
                        if (choice === "Analyze Now" && diagnosticsProvider) {
                            // User clicked "Analyze Now"
                            vscode.commands.executeCommand(
                                "logScoutAnalyzer.analyzeFile"
                            );
                        } else if (choice === "Don't Ask Again") {
                            // User clicked "Don't Ask Again"
                            // Disable prompt in settings
                            config.update(
                                "autoPromptOnOpen",
                                false,
                                vscode.ConfigurationTarget.Global
                            );
                            // Now auto-analyze future files
                        }
                    });
            } else {
                // ========== AUTO-ANALYZE (NO PROMPT) ==========
                // User previously disabled prompt, so analyze immediately
                diagnosticsProvider.analyzeDocument(document);
            }
        }
        updateStatusBar();
    }
);
```

**What happens:**
1. ✅ Check if file is a log file using `isLogFile(document)`
2. ✅ If yes, get user settings
3. ✅ If `autoPrompt` is true → Show popup with 3 options
4. ✅ If `autoPrompt` is false → Auto-analyze immediately

---

## Step 4: Log File Detection

**File:** `vscode-extension/src/extension.ts` (lines 1248-1264)

```typescript
function isLogFile(document: vscode.TextDocument): boolean {
    // Get settings
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const enableDiagnostics = config.get<boolean>(
        "enableDiagnostics",
        true  // Default: enabled
    );

    // ========== CHECK 1: Are diagnostics enabled? ==========
    if (!enableDiagnostics) {
        return false;  // User disabled, don't analyze
    }

    // ========== CHECK 2: Language ID ==========
    if (document.languageId === "log") {
        return true;  // VS Code detected it as "log" language
    }

    // ========== CHECK 3: File Extension ==========
    const fileName = document.fileName.toLowerCase();
    const logExtensions = [".log", ".txt", ".out", ".err"];

    return logExtensions.some((ext) => fileName.endsWith(ext));
    // Returns: true if any extension matches, false otherwise
}
```

**Logic:**
```
Is enableDiagnostics true?
    ├─ NO  → return false (skip analysis)
    └─ YES → continue

Is language ID "log"?
    ├─ YES → return true (it's a log file!)
    └─ NO  → check extension

Does filename end with .log, .txt, .out, or .err?
    ├─ YES → return true (it's a log file!)
    └─ NO  → return false (not a log file)
```

---

## Step 5: Analyze Command Execution

**File:** `vscode-extension/src/extension.ts` (lines 200-250)

```typescript
const analyzeCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.analyzeFile",
    () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && diagnosticsProvider && outputChannel && scoutConsole) {
            const startTime = Date.now();
            const timestamp = new Date().toISOString();

            // ========== LOG START ==========
            scoutConsole.logAnalysisStart(
                editor.document.fileName,
                editor.document.uri
            );

            // ========== RUN ANALYSIS ==========
            diagnosticsProvider.analyzeDocument(editor.document);

            const elapsed = Date.now() - startTime;
            outputChannel.appendLine(
                `✓ Analysis completed in ${elapsed}ms`
            );
        }
    }
);

context.subscriptions.push(analyzeCommand);
```

**What happens:**
1. ✅ Get the active text editor
2. ✅ Log analysis start message
3. ✅ Call `diagnosticsProvider.analyzeDocument()`
4. ✅ Log completion time

---

## Step 6: Diagnostics Provider Analysis

**File:** `vscode-extension/src/diagnosticsProvider.ts`

The `analyzeDocument()` method does the heavy lifting:

```typescript
public analyzeDocument(document: vscode.TextDocument): void {
    if (!this.patternEngine) {
        return;
    }

    // ========== READ FILE CONTENT ==========
    const lines = document.getText().split('\n');
    const diagnostics: vscode.Diagnostic[] = [];

    // ========== LOOP THROUGH LINES ==========
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        const line = lines[lineNumber];

        // ========== MATCH PATTERNS ==========
        // patternEngine compares line against all loaded patterns
        const matches = this.patternEngine.matchPatterns(line);

        for (const match of matches) {
            // ========== CREATE DIAGNOSTIC FOR EACH MATCH ==========
            const range = new vscode.Range(
                lineNumber,
                0,
                lineNumber,
                line.length
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                match.message,           // Error message
                match.severity           // ERROR, WARNING, INFO
            );

            diagnostics.push(diagnostic);
        }
    }

    // ========== UPDATE VS CODE DIAGNOSTICS ==========
    this.diagnosticCollection.set(document.uri, diagnostics);

    // ========== UPDATE TREE VIEWS ==========
    this.updateResultsTree(document, diagnostics);
    this.updateCategoriesTree(document, diagnostics);
    this.updateTimelineTree(document, diagnostics);

    // ========== UPDATE STATUS BAR ==========
    const errorCount = diagnostics.filter(d => d.severity === 0).length;
    const warningCount = diagnostics.filter(d => d.severity === 1).length;
    this.updateStatusBar(errorCount, warningCount);
}
```

**Process:**
1. ✅ Read file line by line
2. ✅ Match each line against patterns
3. ✅ Create diagnostics for matches
4. ✅ Update Problems panel
5. ✅ Update tree views (Results, Categories, Timeline)
6. ✅ Update status bar

---

## 🔗 Complete Call Chain

```
User opens app.log
    ↓
VS Code: "onLanguage:log" activation event
    ↓
activate(context) called
    ├─ Initialize PatternEngine
    ├─ Initialize DiagnosticsProvider
    ├─ Create UI components
    └─ Register: onDidOpenTextDocument listener
            ↓
File is opened, listener fires
    ↓
onDidOpenTextDocument event
    ├─ Check: isLogFile(document)?
    │   ├─ Check: enableDiagnostics = true?
    │   ├─ Check: extension is .log/.txt/.out/.err?
    │   └─ Result: YES!
    │
    ├─ Get setting: autoPrompt?
    │   ├─ YES: Show popup
    │   │   ├─ User clicks "Analyze Now"
    │   │   ├─ Execute: logScoutAnalyzer.analyzeFile
    │   │   └─ → Jump to next step
    │   │
    │   └─ NO: Skip popup, go to next step
    │
    └─ diagnosticsProvider.analyzeDocument(document)
        ├─ Read file content
        ├─ Loop through each line
        ├─ Match against patterns
        ├─ Create diagnostics
        ├─ Update Problems panel
        ├─ Update tree views
        └─ Update status bar
                ↓
Results display!
    ├─ 📋 Results View
    ├─ 🏷️ Categories View
    ├─ 📅 Timeline View
    ├─ 📝 Scout Console
    └─ 📊 Status Bar
```

---

## 🎯 Key Classes & Files

| Class | File | Purpose |
|-------|------|---------|
| `PatternEngine` | `patternEngine.ts` | Loads and matches patterns |
| `DiagnosticsProvider` | `diagnosticsProvider.ts` | Creates VS Code diagnostics |
| `ResultsTreeProvider` | `resultsTreeProvider.ts` | Results view |
| `CategoriesTreeProvider` | `categoriesTreeProvider.ts` | Categories view |
| `TimelineTreeProvider` | `timelineTreeProvider.ts` | Timeline view |
| `ScoutConsole` | `scoutConsole.ts` | Console output |

---

## 📊 State Machine

```
┌──────────────┐
│    DORMANT   │  (Extension loaded, not active)
└──────┬───────┘
       │ User opens .log/.txt/.out/.err file
       ▼
┌──────────────────┐
│    ACTIVATING    │  (activate() function runs)
└──────┬───────────┘
       │ All initialization complete
       ▼
┌──────────────────┐
│    LISTENING     │  (onDidOpenTextDocument listener waiting)
└──────┬───────────┘
       │ File opened, isLogFile() = true
       ▼
┌──────────────────┐
│  PROMPTING/AUTO  │  (Show prompt or auto-analyze)
└──────┬───────────┘
       │ User clicks "Analyze Now" or auto-analyze triggered
       ▼
┌──────────────────┐
│   ANALYZING      │  (analyzeDocument() running)
└──────┬───────────┘
       │ Analysis complete
       ▼
┌──────────────────┐
│   DISPLAYING     │  (Results shown in UI)
└──────────────────┘
```

---

## 💡 Key Insights

1. **Lazy Loading**: Extension doesn't initialize until needed
2. **Event-Driven**: Everything triggered by VS Code events
3. **Pattern Matching**: Uses regex to detect issues
4. **Diagnostics Integration**: Results integrated into VS Code's Problems panel
5. **User Control**: Settings allow disabling or auto-analyzing

