"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const buildInfo_1 = require("./buildInfo");
const resultsTreeProvider_1 = require("./resultsTreeProvider");
const categoriesTreeProvider_1 = require("./categoriesTreeProvider");
const analyzerTreeProvider_1 = require("./analyzerTreeProvider");
const filterTreeProvider_1 = require("./filterTreeProvider");
const fileLogger_1 = require("./fileLogger");
const gutterDecorator_1 = require("./gutterDecorator");
const splitViewProvider_1 = require("./splitViewProvider");
const timelineVisualization_1 = require("./timelineVisualization");
const lspClient_1 = require("./lspClient");
const sipCallFlowParser_1 = require("./sipCallFlowParser");
const patternViewerPanel_1 = require("./patternViewerPanel");
const scoutAnalyzerPanel_1 = require("./scoutAnalyzerPanel");
const annotationDashboardPanel_1 = require("./annotationDashboardPanel");
const scenarioManager_1 = require("./scenarioManager");
const patternOverrideManager_1 = require("./patternOverrideManager");
const patternOverrideUI_1 = require("./patternOverrideUI");
const patternOverrideTreeProvider_1 = require("./patternOverrideTreeProvider");
const patternOverrideCodeActions_1 = require("./patternOverrideCodeActions");
const bundleTreeProvider_1 = require("./bundleTreeProvider");
let outputChannel;
let statusBarItem;
let patternStatusBarItem;
let resultsTreeProvider;
let categoriesTreeProvider;
let cachedFilesTreeProvider; // CachedFilesTreeProvider | undefined;
let analyzerTreeProvider;
let filterTreeProvider;
let fileLogger;
let gutterDecorator;
let annotationRenderer; // AnnotationRenderer | undefined;
let scenarioManager;
let patternOverrideManager;
let scoutInventorProvider; // ScoutInventorProvider | undefined;
let highlightDecoration;
let highlightTimeout;
let splitViewProvider;
let timelineVisualization;
let caseManager; // CaseManager | undefined;
let casesTreeProvider; // CasesTreeProvider | undefined;
let patternOverrideTreeProvider;
let bundleTreeProvider;
// Store all results from last analysis for category filtering
let allResults = [];
// Analysis cache: stores results per file URI
const analysisCache = new Map();
// Constants for cache management
const MAX_CACHE_ENTRIES = 50;
const CACHE_MAX_AGE_DAYS = 7;
const CACHE_STORAGE_KEY = "logScoutAnalyzer.persistedCache";
let saveTimeout;
let extensionContext;
// Load persisted cache from storage
async function loadPersistedCache(context) {
    try {
        const cached = context.globalState.get(CACHE_STORAGE_KEY);
        if (!cached) {
            return;
        }
        let loadedCount = 0;
        let expiredCount = 0;
        const now = Date.now();
        const maxAge = CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        for (const [uri, entry] of Object.entries(cached)) {
            const timestamp = new Date(entry.timestamp);
            const age = now - timestamp.getTime();
            // Skip expired entries
            if (age > maxAge) {
                expiredCount++;
                continue;
            }
            // Validate file still exists and hasn't been modified
            try {
                const fileUri = vscode.Uri.parse(uri);
                const fileStat = await vscode.workspace.fs.stat(fileUri);
                const fileModTime = new Date(fileStat.mtime);
                // Only restore if file hasn't been modified since cache
                if (fileModTime <= timestamp) {
                    analysisCache.set(uri, {
                        results: entry.results,
                        timestamp,
                        errorCount: entry.errorCount,
                        warningCount: entry.warningCount,
                        infoCount: entry.infoCount,
                        debugCount: entry.debugCount,
                    });
                    loadedCount++;
                }
            }
            catch (err) {
                // File doesn't exist or can't be accessed, skip
            }
        }
        if (outputChannel && loadedCount > 0) {
            outputChannel.appendLine(`📦 Restored ${loadedCount} cached file${loadedCount !== 1 ? "s" : ""} from storage`);
            if (expiredCount > 0) {
                outputChannel.appendLine(`   Skipped ${expiredCount} expired entr${expiredCount !== 1 ? "ies" : "y"}`);
            }
        }
        // Update UI if cache was restored
        if (loadedCount > 0) {
            updateCachedFilesView();
        }
    }
    catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`⚠ Failed to load cache: ${error}`);
        }
    }
}
// Save cache to storage (debounced)
function debouncedSaveCache(context) {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
        await saveCache(context);
    }, 2000); // Wait 2s after last change
}
// Immediate save to storage
async function saveCache(context) {
    try {
        // Prune old entries before saving
        pruneCache();
        const serialized = {};
        for (const [uri, entry] of analysisCache.entries()) {
            serialized[uri] = {
                results: entry.results,
                timestamp: entry.timestamp.toISOString(),
                errorCount: entry.errorCount,
                warningCount: entry.warningCount,
                infoCount: entry.infoCount,
                debugCount: entry.debugCount,
            };
        }
        await context.globalState.update(CACHE_STORAGE_KEY, serialized);
    }
    catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`⚠ Failed to save cache: ${error}`);
        }
    }
}
// Prune cache to keep under size limit
function pruneCache() {
    if (analysisCache.size <= MAX_CACHE_ENTRIES) {
        return;
    }
    // Sort by timestamp (newest first), keep only MAX_CACHE_ENTRIES
    const sorted = Array.from(analysisCache.entries()).sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());
    analysisCache.clear();
    sorted.slice(0, MAX_CACHE_ENTRIES).forEach(([uri, entry]) => {
        analysisCache.set(uri, entry);
    });
    if (outputChannel) {
        const pruned = sorted.length - MAX_CACHE_ENTRIES;
        if (pruned > 0) {
            outputChannel.appendLine(`🧹 Pruned ${pruned} old cache entr${pruned !== 1 ? "ies" : "y"}`);
        }
    }
}
// Check if cached results can be used for a file
async function shouldUseCachedResults(uri, cachedEntry) {
    try {
        const fileStat = await vscode.workspace.fs.stat(uri);
        const fileModTime = new Date(fileStat.mtime);
        // File modified after cache = invalid
        if (fileModTime > cachedEntry.timestamp) {
            return false;
        }
        // Check expiration
        const age = Date.now() - cachedEntry.timestamp.getTime();
        const maxAge = CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        if (age > maxAge) {
            return false;
        }
        return true;
    }
    catch {
        return false; // File doesn't exist or error
    }
}
// Wait for LSP diagnostics to be available (with timeout)
/**
 * =============================================================================
 * UNIFIED ANALYSIS FLOW ARCHITECTURE
 * =============================================================================
 *
 * This extension uses a unified, event-driven flow for log analysis:
 *
 * 1. LSP SERVER AUTO-ANALYZES
 *    - When any log file is opened, the LSP server automatically analyzes it
 *    - LSP server publishes diagnostics to VS Code
 *    - Result: Problems panel is automatically populated
 *
 * 2. DIAGNOSTICS CHANGE EVENT
 *    - VS Code fires onDidChangeDiagnostics event
 *    - handleDiagnosticsChange() is called with the diagnostics
 *    - Diagnostics are converted to ResultItems
 *    - Results are cached in analysisCache (in-memory + persistent)
 *    - If file is active editor: Results tree, gutter decorations, etc. are updated
 *
 * 3. MANUAL COMMANDS
 *    - "Analyze File" command: Calls analyzeDocument() to force UI refresh from cache
 *    - Directory analysis: Opens files, waits for LSP diagnostics, lets auto-flow handle caching
 *
 * This eliminates duplicate analysis logic and ensures a single source of truth.
 * =============================================================================
 */
/**
 * Unified diagnostic handler - converts LSP diagnostics to ResultItems and updates UI
 * This is event-driven and eliminates polling
 */
function handleDiagnosticsChange(uri, diagnostics) {
    const fileName = uri.fsPath.split(/[\\\/]/).pop();
    if (outputChannel) {
        outputChannel.appendLine(`[${new Date().toISOString()}] 📊 handleDiagnosticsChange()`);
        outputChannel.appendLine(`   → File: ${fileName}`);
        outputChannel.appendLine(`   → Diagnostics: ${diagnostics.length}`);
    }
    // Get document from workspace
    const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
    if (!document) {
        if (outputChannel) {
            outputChannel.appendLine(`   ⚠️ Document not found in workspace`);
        }
        return;
    }
    // Check if this is a log file
    if (!isLogFile(document)) {
        if (outputChannel) {
            outputChannel.appendLine(`   ℹ️ Not a log file, skipping`);
        }
        return;
    }
    const editor = vscode.window.activeTextEditor;
    const isActiveEditor = editor && editor.document.uri.toString() === uri.toString();
    // Convert diagnostics to ResultItems
    const results = diagnostics.map((diag) => {
        const severity = diag.severity === vscode.DiagnosticSeverity.Error
            ? "error"
            : diag.severity === vscode.DiagnosticSeverity.Warning
                ? "warning"
                : diag.severity === vscode.DiagnosticSeverity.Hint
                    ? "debug"
                    : "info";
        const line = document.lineAt(diag.range.start.line);
        const messageLines = diag.message.split("\n");
        const mainMessage = messageLines[0];
        const extractedTimestamp = extractTimestamp(line.text);
        let category = undefined;
        let patternId = undefined;
        let patternName = undefined;
        const diagWithData = diag;
        if (diagWithData.data &&
            typeof diagWithData.data === "object" &&
            "category" in diagWithData.data) {
            category = diagWithData.data.category;
        }
        if (!category) {
            category = extractCategory(line.text);
        }
        if (diagWithData.data &&
            typeof diagWithData.data === "object" &&
            "patternName" in diagWithData.data) {
            patternName = diagWithData.data.patternName;
        }
        if (diag.code && typeof diag.code === "string") {
            patternId = diag.code;
        }
        // Extract matched text - prefer from LSP data, fallback to range extraction
        let matchedText;
        if (diagWithData.data &&
            typeof diagWithData.data === "object" &&
            "matchedText" in diagWithData.data &&
            typeof diagWithData.data.matchedText === "string") {
            matchedText = diagWithData.data.matchedText;
        }
        else {
            // Fallback: extract from line using range
            matchedText =
                line.text
                    .substring(diag.range.start.character, Math.min(diag.range.end.character, diag.range.start.character + 100))
                    .trim() || line.text.trim();
        }
        // Extract new structured fields from LSP (snake_case standard)
        const template = diagWithData.data?.template;
        const merged_template = diagWithData.data?.merged_template;
        const pattern_regex = diagWithData.data?.pattern_regex;
        // Extract ALL diagnostic data (includes all TagScout annotation fields)
        const allDiagnosticData = diagWithData.data
            ? { ...diagWithData.data }
            : undefined;
        // Debug logging
        if (outputChannel) {
            outputChannel.appendLine(`[DEBUG] Diagnostic data keys: ${diagWithData.data ? Object.keys(diagWithData.data).join(", ") : "none"}`);
            outputChannel.appendLine(`[DEBUG] Raw diagnostic data:`);
            outputChannel.appendLine(`  template: ${diagWithData.data?.template}`);
            outputChannel.appendLine(`  merged_template: ${diagWithData.data?.merged_template}`);
            outputChannel.appendLine(`  matched_text: ${diagWithData.data?.matched_text}`);
            outputChannel.appendLine(`  log_line: ${diagWithData.data?.log_line}`);
            if (merged_template) {
                outputChannel.appendLine(`[DEBUG] Final merged_template value: ${merged_template}`);
            }
            else {
                outputChannel.appendLine(`[DEBUG] merged_template is undefined/null`);
            }
        }
        return {
            severity,
            line: diag.range.start.line,
            column: diag.range.start.character,
            message: merged_template || mainMessage, // Prefer merged_template from LSP
            matchedText: matchedText,
            context: line.text,
            timestamp: extractedTimestamp,
            category: category,
            patternId: patternId,
            patternName: patternName,
            uri: document.uri,
            template: template,
            merged_template: merged_template,
            extracted_parameters: diagWithData.data?.extracted_parameters,
            pattern_regex: pattern_regex,
            log_line: diagWithData.data?.log_line,
            // Include ALL diagnostic data from LSP (all TagScout fields)
            diagnosticData: allDiagnosticData,
        };
    });
    // Count by severity
    const errorCount = results.filter((r) => r.severity === "error").length;
    const warningCount = results.filter((r) => r.severity === "warning").length;
    const infoCount = results.filter((r) => r.severity === "info").length;
    const debugCount = results.filter((r) => r.severity === "debug").length;
    // Cache results
    analysisCache.set(uri.toString(), {
        results,
        timestamp: new Date(),
        errorCount,
        warningCount,
        infoCount,
        debugCount,
    });
    if (outputChannel) {
        outputChannel.appendLine(`   ✓ Cached: ${errorCount}E ${warningCount}W ${infoCount}I ${debugCount}D`);
    }
    // Persist cache
    if (extensionContext) {
        debouncedSaveCache(extensionContext);
    }
    // Update Results tree views for all log files
    allResults = results;
    // Feed all results to filter provider - it will apply filters and update Results tree
    filterTreeProvider?.setResults(results);
    // Legacy views still updated for backward compatibility
    categoriesTreeProvider?.setResults(results);
    if (outputChannel) {
        outputChannel.appendLine(`   ✓ Updated Results/Filters/Categories/Timeline views`);
    }
    // Update gutter decorations only for the active editor
    if (isActiveEditor && editor && gutterDecorator) {
        const fileName = editor.document.uri.fsPath.split(/[\\\/]/).pop();
        const annotations = results.map((r) => ({
            line: r.line,
            severity: r.severity,
            message: r.message,
            matchedText: r.matchedText,
            context: r.context,
            timestamp: r.timestamp,
            category: r.category,
            pattern: undefined,
            patternId: r.patternId,
            fileName: fileName,
            // New structured fields from LSP (snake_case standard)
            template: r.template,
            merged_template: r.merged_template,
            extracted_parameters: r.extracted_parameters,
            pattern_regex: r.pattern_regex,
            log_line: r.log_line,
        }));
        gutterDecorator.updateDecorations(editor, annotations);
        if (annotationRenderer) {
            annotationRenderer.render(editor, annotations);
        }
        if (outputChannel) {
            outputChannel.appendLine(`   ✓ Updated gutter decorations (active editor)`);
        }
    }
    else if (outputChannel) {
        outputChannel.appendLine(`   ℹ️ Skipped gutter decorations (not active editor)`);
    }
    // Always update cached files view
    updateCachedFilesView();
    updateStatusBar();
    if (outputChannel) {
        outputChannel.appendLine(`   ✓ Updated CachedFiles view and status bar`);
    }
}
function activate(context) {
    // Store context for cache persistence
    extensionContext = context;
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel("Log Scout Analyzer");
    context.subscriptions.push(outputChannel);
    const activationTime = new Date().toISOString();
    outputChannel.appendLine("╔════════════════════════════════════════╗");
    outputChannel.appendLine("║   LOG SCOUT ANALYZER ACTIVATED        ║");
    outputChannel.appendLine("╚════════════════════════════════════════╝");
    outputChannel.appendLine("");
    outputChannel.appendLine(`📦 Version: ${buildInfo_1.BUILD_INFO.version}`);
    outputChannel.appendLine(`🔨 Build: ${buildInfo_1.BUILD_INFO.buildTimestamp}`);
    outputChannel.appendLine(`🔢 Build #: ${buildInfo_1.BUILD_INFO.buildNumber}`);
    outputChannel.appendLine(`🔗 Git: ${buildInfo_1.BUILD_INFO.gitCommit}`);
    outputChannel.appendLine(`⏰ Loaded: ${activationTime}`);
    outputChannel.appendLine("");
    console.log(`${(0, buildInfo_1.getBuildInfo)()} activated at ${activationTime}`);
    // Load persisted cache early (async, non-blocking)
    loadPersistedCache(context).catch((error) => {
        if (outputChannel) {
            outputChannel.appendLine(`⚠ Cache load failed: ${error.message}`);
        }
    });
    // Initialize File Logger first (needed by LSP client)
    fileLogger = new fileLogger_1.FileLogger(context);
    context.subscriptions.push({
        dispose: () => fileLogger?.dispose(),
    });
    fileLogger.log("Log Scout Analyzer initialized");
    fileLogger.log(`Build: ${buildInfo_1.BUILD_INFO.version} (${buildInfo_1.BUILD_INFO.buildTimestamp})`);
    // Connect file logger to LSP client
    (0, lspClient_1.setLSPLogger)(fileLogger);
    // Initialize LSP client early (handles TagScout MongoDB patterns)
    const logChannel = outputChannel; // Capture for async callback
    (0, lspClient_1.startLSPClient)(context, outputChannel)
        .then((lspClient) => {
        if (lspClient) {
            const lspVersion = (0, lspClient_1.getLSPServerVersion)();
            const lspName = (0, lspClient_1.getLSPServerName)();
            logChannel.appendLine("✓ LSP client connected");
            if (lspVersion) {
                logChannel.appendLine(`🔧 LSP Server: ${lspName || "Log Scout LSP"} v${lspVersion}`);
            }
            logChannel.appendLine("✓ TagScout pattern engine ready");
        }
        else {
            logChannel.appendLine("⚠ LSP client failed to start - using fallback patterns");
        }
    })
        .catch((error) => {
        logChannel.appendLine(`⚠ LSP client error: ${error.message}`);
        logChannel.appendLine("⚠ Using fallback patterns");
    });
    // Initialize Scenario Manager
    scenarioManager = new scenarioManager_1.ScenarioManager(context);
    outputChannel.appendLine("✓ Scenario Manager initialized");
    fileLogger.log("Scenario Manager ready");
    // Initialize Pattern Override Manager
    patternOverrideManager = new patternOverrideManager_1.PatternOverrideManager(context);
    const patternStats = patternOverrideManager.getStats();
    outputChannel.appendLine(`✓ Pattern Override Manager initialized (${patternStats.totalOverrides} overrides, ${patternStats.totalCustom} custom)`);
    fileLogger.log(`Pattern Override Manager ready - ${patternStats.totalOverrides} overrides, ${patternStats.totalCustom} custom patterns`);
    patternOverrideTreeProvider = new patternOverrideTreeProvider_1.PatternOverrideTreeProvider(patternOverrideManager);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ language: "log", scheme: "file" }, new patternOverrideCodeActions_1.PatternOverrideCodeActionProvider(), {
        providedCodeActionKinds: patternOverrideCodeActions_1.PatternOverrideCodeActionProvider.providedCodeActionKinds,
    }));
    const ensurePatternManager = () => {
        if (!patternOverrideManager) {
            vscode.window.showErrorMessage("Pattern Override Manager is not available yet.");
            return undefined;
        }
        return patternOverrideManager;
    };
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.patterns.createOverride", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await (0, patternOverrideUI_1.createOverrideQuickInput)(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.createOverrideFromSelection", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }
        const selectionText = editor.document.getText(editor.selection);
        await (0, patternOverrideUI_1.createOverrideFromSelection)(manager, selectionText);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.createOverrideFromDiagnostic", async (diagnostic) => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        if (diagnostic) {
            await (0, patternOverrideUI_1.createOverrideFromDiagnostic)(manager, diagnostic);
            patternOverrideTreeProvider?.refresh();
            updatePatternStatusBar();
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.");
            return;
        }
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        if (diagnostics.length === 0) {
            vscode.window.showInformationMessage("No diagnostics found for this file.");
            return;
        }
        const cursor = editor.selection.active;
        const atCursor = diagnostics.filter((diag) => diag.range.contains(cursor));
        const candidates = atCursor.length > 0 ? atCursor : diagnostics;
        let selectedDiagnostic;
        if (candidates.length === 1) {
            selectedDiagnostic = candidates[0];
        }
        else {
            const items = candidates.map((diag, index) => {
                const code = typeof diag.code === "string" ? diag.code : "";
                const mainMessage = diag.message.split("\n")[0];
                const label = code ? `${code}: ${mainMessage}` : mainMessage;
                const data = diag.data;
                const patternName = typeof data?.patternName === "string"
                    ? data.patternName
                    : undefined;
                return {
                    label,
                    description: patternName,
                    detail: `Diagnostic #${index + 1}`,
                    diagnostic: diag,
                };
            });
            const picked = await vscode.window.showQuickPick(items, {
                title: "Select a diagnostic to override",
                placeHolder: "Choose a diagnostic",
                matchOnDescription: true,
                matchOnDetail: true,
            });
            selectedDiagnostic = picked?.diagnostic;
        }
        if (!selectedDiagnostic) {
            return;
        }
        await (0, patternOverrideUI_1.createOverrideFromDiagnostic)(manager, selectedDiagnostic);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.createCustom", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await (0, patternOverrideUI_1.createCustomPatternWizard)(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.editOverride", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await (0, patternOverrideUI_1.editPatternQuickInput)(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.deleteOverride", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await (0, patternOverrideUI_1.deletePatternQuickPick)(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.togglePattern", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await (0, patternOverrideUI_1.togglePatternQuickPick)(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.importOverrides", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await manager.importPatterns();
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.exportOverrides", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        await manager.exportPatterns();
        updatePatternStatusBar();
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.reloadPatterns", async () => {
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            vscode.window.showWarningMessage("LSP client is not connected. Pattern reload skipped.");
            return;
        }
        try {
            await client.sendRequest("workspace/executeCommand", {
                command: "logScout.reloadPatterns",
                arguments: [],
            });
            vscode.window.showInformationMessage("Requested pattern reload from LSP.");
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to reload patterns: ${error}`);
        }
    }), vscode.commands.registerCommand("logScoutAnalyzer.patterns.showStats", async () => {
        const manager = ensurePatternManager();
        if (!manager) {
            return;
        }
        const stats = manager.getStats();
        vscode.window.showInformationMessage(`Overrides: ${stats.enabledOverrides}/${stats.totalOverrides}, Custom: ${stats.enabledCustom}/${stats.totalCustom}`);
    }));
    // Register document link provider for console output (makes file paths clickable)
    // Note: VS Code doesn't support document links in output channels by default,
    // but we format output to be compatible with terminal link detection
    outputChannel.appendLine("💡 Console output includes clickable file:line links");
    outputChannel.appendLine("");
    // LSP server handles all pattern matching and diagnostics
    outputChannel.appendLine("✓ Using LSP server for pattern matching");
    outputChannel.appendLine("✓ Ready to analyze log files");
    outputChannel.appendLine("");
    fileLogger.log("LSP-based pattern engine initialized");
    // Initialize Tree Providers
    resultsTreeProvider = new resultsTreeProvider_1.ResultsTreeProvider();
    categoriesTreeProvider = new categoriesTreeProvider_1.CategoriesTreeProvider();
    // Commented out - CachedFilesTreeProvider not properly imported
    // cachedFilesTreeProvider = new CachedFilesTreeProvider();
    analyzerTreeProvider = new analyzerTreeProvider_1.AnalyzerTreeProvider();
    // scoutInventorProvider = new ScoutInventorProvider(); // Commented out - class not imported
    // Initialize Filter Tree Provider (consolidates categories, files, time filters)
    filterTreeProvider = new filterTreeProvider_1.FilterTreeProvider();
    // When filters change, update Results tree with filtered results
    filterTreeProvider.setFilterChangeCallback((filteredResults) => {
        resultsTreeProvider?.setResults(filteredResults);
    });
    // Initialize Gutter Decorator for annotations
    gutterDecorator = new gutterDecorator_1.GutterDecorator();
    context.subscriptions.push(gutterDecorator);
    outputChannel.appendLine("✓ Gutter Decorator initialized");
    // Initialize Annotation Renderer (combines gutter glyphs + log level highlights)
    // Commented out - AnnotationRenderer not properly imported
    // annotationRenderer = new AnnotationRenderer();
    // context.subscriptions.push({
    //   dispose: () => annotationRenderer?.dispose(),
    // });
    // outputChannel.appendLine(
    //   "✓ Annotation Renderer initialized (glyphs + highlights)",
    // );
    // Initialize Split View Provider
    splitViewProvider = splitViewProvider_1.SplitViewProvider.getInstance();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("scout-annotated", splitViewProvider));
    // Initialize Timeline Visualization Provider
    timelineVisualization = new timelineVisualization_1.TimelineVisualizationProvider(context);
    context.subscriptions.push(timelineVisualization);
    // Initialize highlight decoration for clicked lines
    highlightDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: new vscode.ThemeColor("editor.findMatchHighlightBackground"),
        border: "1px solid",
        borderColor: new vscode.ThemeColor("editorInfo.foreground"),
        isWholeLine: true,
    });
    context.subscriptions.push(highlightDecoration);
    // Register Tree Views
    const analyzerTreeView = vscode.window.createTreeView("scoutAnalyzer", {
        treeDataProvider: analyzerTreeProvider,
        showCollapseAll: false,
    });
    context.subscriptions.push(analyzerTreeView);
    const resultsTreeView = vscode.window.createTreeView("scoutResults", {
        treeDataProvider: resultsTreeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(resultsTreeView);
    // ✅ Connect results provider to Action Panel so it can access LSP data
    scoutAnalyzerPanel_1.ScoutAnalyzerPanel.setDataProvider(resultsTreeProvider);
    const categoriesTreeView = vscode.window.createTreeView("scoutCategories", {
        treeDataProvider: categoriesTreeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(categoriesTreeView);
    // Commented out - CachedFilesTreeProvider not properly imported
    // const cachedFilesTreeView = vscode.window.createTreeView("scoutCachedFiles", {
    //   treeDataProvider: cachedFilesTreeProvider,
    //   showCollapseAll: false,
    // });
    // context.subscriptions.push(cachedFilesTreeView);
    const filterTreeView = vscode.window.createTreeView("scoutFilters", {
        treeDataProvider: filterTreeProvider,
        showCollapseAll: false,
    });
    context.subscriptions.push(filterTreeView);
    // Commented out - ScoutInventorProvider not properly imported
    // const scoutInventorTreeView = vscode.window.createTreeView("scoutInventor", {
    //   treeDataProvider: scoutInventorProvider,
    //   showCollapseAll: true,
    // });
    // context.subscriptions.push(scoutInventorTreeView);
    outputChannel.appendLine("✓ Scout Inventor view initialized");
    if (patternOverrideTreeProvider) {
        const patternOverridesTreeView = vscode.window.createTreeView("scoutPatternOverrides", {
            treeDataProvider: patternOverrideTreeProvider,
            showCollapseAll: true,
        });
        context.subscriptions.push(patternOverridesTreeView);
        outputChannel.appendLine("✓ Pattern Overrides view initialized");
    }
    // Initialize Bundle Tree Provider
    bundleTreeProvider = new bundleTreeProvider_1.BundleTreeProvider();
    const bundleTreeView = vscode.window.createTreeView("scoutBundles", {
        treeDataProvider: bundleTreeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(bundleTreeView);
    outputChannel.appendLine("✓ Bundle view initialized");
    // Initialize Case Manager (DISABLED - not needed at the moment)
    // caseManager = new CaseManager(context, outputChannel);
    // casesTreeProvider = new CasesTreeProvider(caseManager);
    //
    // const casesTreeView = vscode.window.createTreeView("scoutCases", {
    //   treeDataProvider: casesTreeProvider,
    //   showCollapseAll: true,
    // });
    // context.subscriptions.push(casesTreeView);
    // outputChannel.appendLine("✓ Case Manager initialized");
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = "logScoutAnalyzer.openScoutView";
    statusBarItem.tooltip = "Click to open Scout Analyzer";
    context.subscriptions.push(statusBarItem);
    patternStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
    patternStatusBarItem.command = "logScoutAnalyzer.patterns.showManager";
    patternStatusBarItem.tooltip = "Click to open pattern overrides";
    context.subscriptions.push(patternStatusBarItem);
    updatePatternStatusBar();
    // Shared function to analyze a document and update cache
    /**
     * Analyze document manually (for analyze command)
     * The unified diagnostic handler will pick up results automatically
     */
    /**
     * Analyze document - simplified to use LSP diagnostics and unified cache
     *
     * Flow:
     * 1. LSP server auto-analyzes when file is opened
     * 2. onDidChangeDiagnostics fires → handleDiagnosticsChange → cache + update UI
     * 3. This function just forces UI refresh for manual "Analyze" command
     */
    async function analyzeDocument(document, showUI = true) {
        if (!outputChannel)
            return;
        const uriString = document.uri.toString();
        const cachedEntry = analysisCache.get(uriString);
        // Check if we can use cached results
        if (cachedEntry &&
            (await shouldUseCachedResults(document.uri, cachedEntry))) {
            const fileName = path.basename(document.uri.fsPath);
            if (showUI && outputChannel) {
                outputChannel.appendLine(`📦 Using cached results for ${fileName} (analyzed ${cachedEntry.timestamp.toLocaleString()})`);
            }
            // Apply cached results to active editor UI
            const editor = vscode.window.activeTextEditor;
            const isActiveEditor = editor && editor.document.uri.toString() === document.uri.toString();
            if (isActiveEditor) {
                allResults = cachedEntry.results;
                resultsTreeProvider?.setResults(cachedEntry.results);
                categoriesTreeProvider?.setResults(cachedEntry.results);
                updateCachedFilesView();
                updateStatusBar();
                fileLogger?.logCacheOperation(`Loaded cached analysis for ${fileName} (${cachedEntry.errorCount}E ${cachedEntry.warningCount}W ${cachedEntry.infoCount}I ${cachedEntry.debugCount}D)`);
            }
            return;
        }
        // Get current LSP diagnostics (LSP has already analyzed the file)
        const diagnostics = vscode.languages.getDiagnostics(document.uri);
        if (showUI) {
            const timestamp = new Date().toISOString();
            fileLogger?.logAnalysisStart(document.fileName, document.uri);
            outputChannel.appendLine("");
            outputChannel.appendLine(`[${"=".repeat(50)}]`);
            outputChannel.appendLine(`[${timestamp}] 🔍 VIEWING LSP DIAGNOSTICS`);
            outputChannel.appendLine(`File: ${document.fileName}`);
            outputChannel.show(true);
        }
        // Use unified handler to convert diagnostics → cache → update UI
        handleDiagnosticsChange(document.uri, diagnostics);
    }
    // Update status bar based on active editor
    updateStatusBar();
    // Register debug command to dump diagnostic data
    const dumpDiagnosticsCommand = vscode.commands.registerCommand("logScoutAnalyzer.dumpDiagnostics", async () => {
        if (!outputChannel) {
            vscode.window.showErrorMessage("Output channel not initialized");
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const uri = editor.document.uri;
        const diagnostics = vscode.languages.getDiagnostics(uri);
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine("=".repeat(80));
        outputChannel.appendLine("DIAGNOSTIC DATA DUMP");
        outputChannel.appendLine("=".repeat(80));
        outputChannel.appendLine(`File: ${uri.fsPath}`);
        outputChannel.appendLine(`Total diagnostics: ${diagnostics.length}`);
        outputChannel.appendLine("");
        diagnostics.forEach((diag, index) => {
            outputChannel.appendLine(`--- Diagnostic #${index + 1} ---`);
            outputChannel.appendLine(`Message: ${diag.message}`);
            outputChannel.appendLine(`Severity: ${diag.severity}`);
            outputChannel.appendLine(`Code: ${diag.code}`);
            outputChannel.appendLine(`Range: Line ${diag.range.start.line}, Col ${diag.range.start.character} -> Line ${diag.range.end.line}, Col ${diag.range.end.character}`);
            outputChannel.appendLine(`Source: ${diag.source}`);
            const diagWithData = diag;
            if (diagWithData.data) {
                outputChannel.appendLine(`Data keys: ${Object.keys(diagWithData.data).join(", ")}`);
                outputChannel.appendLine("");
                outputChannel.appendLine("Data contents:");
                outputChannel.appendLine(`  template: ${diagWithData.data.template || "(not set)"}`);
                outputChannel.appendLine(`  merged_template: ${diagWithData.data.merged_template || "(not set)"}`);
                outputChannel.appendLine(`  matched_text: ${diagWithData.data.matched_text || "(not set)"}`);
                outputChannel.appendLine(`  log_line: ${diagWithData.data.log_line || "(not set)"}`);
                outputChannel.appendLine(`  pattern_id: ${diagWithData.data.pattern_id || "(not set)"}`);
                outputChannel.appendLine(`  pattern_name: ${diagWithData.data.pattern_name || "(not set)"}`);
                outputChannel.appendLine(`  category: ${diagWithData.data.category || "(not set)"}`);
                if (diagWithData.data.extracted_parameters) {
                    outputChannel.appendLine(`  extracted_parameters: ${diagWithData.data.extracted_parameters.length} items`);
                    diagWithData.data.extracted_parameters.forEach((param) => {
                        outputChannel.appendLine(`    - ${param.name}: ${param.value}`);
                    });
                }
                else {
                    outputChannel.appendLine(`  extracted_parameters: (not set)`);
                }
                outputChannel.appendLine("");
                outputChannel.appendLine("Full data object:");
                outputChannel.appendLine(JSON.stringify(diagWithData.data, null, 2));
            }
            else {
                outputChannel.appendLine("No data attached to diagnostic");
            }
            outputChannel.appendLine("");
        });
        outputChannel.appendLine("=".repeat(80));
        outputChannel.appendLine("END DIAGNOSTIC DATA DUMP");
        outputChannel.appendLine("=".repeat(80));
    });
    // Register commands
    const analyzeCommand = vscode.commands.registerCommand("logScoutAnalyzer.analyzeFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && outputChannel) {
            await analyzeDocument(editor.document, true);
            // Update status bar
            updateStatusBar();
        }
        else {
            vscode.window.showWarningMessage("No active editor or diagnostics provider not initialized");
        }
    });
    const clearCommand = vscode.commands.registerCommand("logScoutAnalyzer.clearDiagnostics", () => {
        // Clear tree views (LSP manages diagnostics)
        resultsTreeProvider?.clear();
        categoriesTreeProvider?.clear();
        // Clear gutter decorations
        if (gutterDecorator) {
            gutterDecorator.clearAll();
        }
        if (outputChannel) {
            outputChannel.appendLine(`[${new Date().toISOString()}] Diagnostics cleared`);
        }
        fileLogger?.log("Diagnostics cleared");
        vscode.window.showInformationMessage("Diagnostics cleared!");
        updateStatusBar();
    });
    // Alias for clearDiagnostics (used by tree view)
    const clearResultsCommand = vscode.commands.registerCommand("logScoutAnalyzer.clearResults", () => {
        // Clear tree views (LSP manages diagnostics)
        resultsTreeProvider?.clear();
        categoriesTreeProvider?.clear();
        // Clear analysis cache
        analysisCache.clear();
        cachedFilesTreeProvider?.clear();
        // Clear gutter decorations
        if (gutterDecorator) {
            gutterDecorator.clearAll();
        }
        if (outputChannel) {
            outputChannel.appendLine(`[${new Date().toISOString()}] Results cleared`);
        }
        fileLogger?.log("Results cleared");
        vscode.window.showInformationMessage("Results cleared!");
        updateStatusBar();
    });
    const clearCacheCommand = vscode.commands.registerCommand("logScoutAnalyzer.clearCache", async () => {
        const cacheSize = analysisCache.size;
        analysisCache.clear();
        cachedFilesTreeProvider?.clear();
        // Clear persisted cache from storage
        if (extensionContext) {
            await extensionContext.globalState.update(CACHE_STORAGE_KEY, undefined);
        }
        if (outputChannel) {
            outputChannel.appendLine(`[${new Date().toISOString()}] ♻️ Cache cleared (${cacheSize} files, including persisted storage)`);
        }
        vscode.window.showInformationMessage(`Analysis cache cleared! (${cacheSize} cached files removed)`);
        updateStatusBar();
    });
    const removeCachedFileCommand = vscode.commands.registerCommand("logScoutAnalyzer.removeCachedFile", (item) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
            return;
        }
        const uriString = cachedFile.uri.toString();
        analysisCache.delete(uriString);
        updateCachedFilesView();
        // Persist the removal
        if (extensionContext) {
            debouncedSaveCache(extensionContext);
        }
        vscode.window.showInformationMessage(`Removed ${path.basename(cachedFile.uri.fsPath)} from cache`);
    });
    const openCachedFileCommand = vscode.commands.registerCommand("logScoutAnalyzer.openCachedFile", async (item) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
            return;
        }
        const uriString = cachedFile.uri.toString();
        const cachedEntry = analysisCache.get(uriString);
        if (!cachedEntry) {
            vscode.window.showWarningMessage(`No cached results found for ${path.basename(cachedFile.uri.fsPath)}`);
            return;
        }
        try {
            // Check if file exists
            await vscode.workspace.fs.stat(cachedFile.uri);
            // Check if document is already open
            const openDoc = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === cachedFile.uri.toString());
            let doc;
            if (openDoc) {
                // Document already open, just show it
                await vscode.window.showTextDocument(openDoc, {
                    preview: false,
                    preserveFocus: false,
                });
                doc = openDoc;
            }
            else {
                // Open the document
                doc = await vscode.workspace.openTextDocument(cachedFile.uri);
                await vscode.window.showTextDocument(doc, {
                    preview: false,
                    preserveFocus: false,
                });
            }
            // Update all result URIs to match the opened document
            // This ensures goto/jump commands work correctly
            const updatedResults = cachedEntry.results.map((r) => ({
                ...r,
                uri: doc.uri,
            }));
            // Load cached results into all views
            allResults = updatedResults;
            resultsTreeProvider?.setResults(updatedResults);
            categoriesTreeProvider?.setResults(updatedResults);
            updateStatusBar();
            // Update cache with corrected URIs
            analysisCache.set(doc.uri.toString(), {
                ...cachedEntry,
                results: updatedResults,
            });
            // Log cache load
            fileLogger?.logCacheOperation(`Opened cached file ${path.basename(cachedFile.uri.fsPath)} (${cachedEntry.errorCount}E ${cachedEntry.warningCount}W ${cachedEntry.infoCount}I ${cachedEntry.debugCount}D)`);
            if (outputChannel) {
                outputChannel.appendLine(`📦 Loaded cached results for ${path.basename(cachedFile.uri.fsPath)} - ${cachedEntry.results.length} issues`);
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`);
        }
    });
    // Open File in Editor (without loading cached results)
    const openFileInEditorCommand = vscode.commands.registerCommand("logScoutAnalyzer.openFileInEditor", async (item) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
            return;
        }
        try {
            // Check if file exists
            await vscode.workspace.fs.stat(cachedFile.uri);
            // Just open the file
            const doc = await vscode.workspace.openTextDocument(cachedFile.uri);
            await vscode.window.showTextDocument(doc);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`);
        }
    });
    // Reveal in Explorer command
    const revealInExplorerCommand = vscode.commands.registerCommand("logScoutAnalyzer.revealInExplorer", async (item) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
            return;
        }
        try {
            // Check if file exists
            await vscode.workspace.fs.stat(cachedFile.uri);
            // Reveal in file explorer
            await vscode.commands.executeCommand("revealFileInOS", cachedFile.uri);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to reveal file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`);
        }
    });
    // View Cache Metadata command
    const viewCacheMetadataCommand = vscode.commands.registerCommand("logScoutAnalyzer.viewCacheMetadata", async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showWarningMessage("No workspace folder open");
                return;
            }
            // Look for .tagscout_cache directory in workspace root
            const cacheDir = vscode.Uri.joinPath(workspaceFolders[0].uri, ".tagscout_cache");
            const cacheFile = vscode.Uri.joinPath(cacheDir, "tagscout_patterns.json");
            try {
                await vscode.workspace.fs.stat(cacheFile);
                const doc = await vscode.workspace.openTextDocument(cacheFile);
                await vscode.window.showTextDocument(doc, { preview: false });
                if (outputChannel) {
                    outputChannel.appendLine(`📄 Opened cache metadata: ${cacheFile.fsPath}`);
                }
            }
            catch (statErr) {
                vscode.window.showWarningMessage("Cache metadata file not found. Try analyzing a file first to create the cache.");
            }
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to open cache metadata: ${err.message}`);
        }
    });
    const showCacheStatsCommand = vscode.commands.registerCommand("logScoutAnalyzer.showCacheStats", () => {
        if (analysisCache.size === 0) {
            vscode.window.showInformationMessage("No cached analysis results");
            return;
        }
        const stats = [];
        stats.push(`📊 Analysis Cache Statistics`);
        stats.push(`Total cached files: ${analysisCache.size}`);
        stats.push(``);
        let totalIssues = 0;
        analysisCache.forEach((cache, uri) => {
            const fileName = uri.split("/").pop() || uri;
            const total = cache.errorCount + cache.warningCount + cache.infoCount;
            totalIssues += total;
            stats.push(`📄 ${fileName} (${formatTimeSince(cache.timestamp)})\\n` +
                `   🔴 ${cache.errorCount} 🟡 ${cache.warningCount} 🔵 ${cache.infoCount}`);
        });
        stats.push(``);
        stats.push(`Total issues across all files: ${totalIssues}`);
        const message = stats.join("\\n");
        vscode.window.showInformationMessage(message, { modal: false });
        if (outputChannel) {
            outputChannel.appendLine(`[${new Date().toISOString()}] Cache Statistics:`);
            stats.forEach((line) => {
                if (outputChannel) {
                    outputChannel.appendLine(line);
                }
            });
        }
    });
    const showPatternsCommand = vscode.commands.registerCommand("logScoutAnalyzer.showPatterns", async () => {
        if (outputChannel) {
            outputChannel.appendLine(`[${new Date().toISOString()}] Fetching patterns from LSP server...`);
        }
        try {
            const lspClient = (0, lspClient_1.getLSPClient)();
            if (!lspClient) {
                vscode.window.showWarningMessage("LSP client not connected. Cannot fetch patterns.");
                return;
            }
            // Call LSP server command to get patterns using executeCommand
            const result = await lspClient.sendRequest("workspace/executeCommand", {
                command: "logScout.getPatterns",
                arguments: [],
            });
            if (result && result.patterns) {
                // Show in panel
                patternViewerPanel_1.PatternViewerPanel.createOrShow(context.extensionUri, result);
                if (outputChannel) {
                    outputChannel.appendLine(`✓ Loaded ${result.count} patterns from ${result.source}`);
                }
            }
            else {
                vscode.window.showWarningMessage("No patterns available");
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch patterns: ${error.message}`);
            if (outputChannel) {
                outputChannel.appendLine(`✗ Error fetching patterns: ${error.message}`);
            }
        }
    });
    // About command - shows version info in notification
    const showAboutCommand = vscode.commands.registerCommand("logScoutAnalyzer.showAbout", () => {
        const lspVersion = (0, lspClient_1.getLSPServerVersion)();
        const lspName = (0, lspClient_1.getLSPServerName)();
        if (outputChannel) {
            outputChannel.show();
            outputChannel.appendLine("");
            outputChannel.appendLine("╔════════════════════════════════════════╗");
            outputChannel.appendLine("║         ABOUT LOG SCOUT               ║");
            outputChannel.appendLine("╚════════════════════════════════════════╝");
            outputChannel.appendLine("");
            outputChannel.appendLine(`📦 Extension: Log Scout Analyzer`);
            outputChannel.appendLine(`🏷️  Extension Version: ${buildInfo_1.BUILD_INFO.version}`);
            outputChannel.appendLine(`🔨 Build Time: ${buildInfo_1.BUILD_INFO.buildTimestamp}`);
            outputChannel.appendLine(`🔢 Build Number: ${buildInfo_1.BUILD_INFO.buildNumber}`);
            outputChannel.appendLine(`🔗 Git Commit: ${buildInfo_1.BUILD_INFO.gitCommit}`);
            outputChannel.appendLine("");
            if (lspVersion) {
                outputChannel.appendLine(`🔧 LSP Server: ${lspName || "Log Scout LSP"}`);
                outputChannel.appendLine(`🏷️  LSP Version: ${lspVersion}`);
            }
            else {
                outputChannel.appendLine(`🔧 LSP Server: Not connected`);
            }
            outputChannel.appendLine("");
            outputChannel.appendLine(`⏰ Activated: ${new Date().toISOString()}`);
            outputChannel.appendLine(`🎯 Patterns: ${lspVersion ? "Managed by LSP server" : "Not available"}`);
            outputChannel.appendLine("");
        }
        const aboutMsg = lspVersion
            ? `Log Scout Analyzer v${buildInfo_1.BUILD_INFO.version}\n\nLSP Server: ${lspName || "LSP"} v${lspVersion}\nBuild: ${buildInfo_1.BUILD_INFO.buildTimestamp}\nGit: ${buildInfo_1.BUILD_INFO.gitCommit}`
            : `Log Scout Analyzer v${buildInfo_1.BUILD_INFO.version}\n\nBuild: ${buildInfo_1.BUILD_INFO.buildTimestamp}\nGit: ${buildInfo_1.BUILD_INFO.gitCommit}\nLSP: Not connected`;
        vscode.window
            .showInformationMessage(aboutMsg, "View Logs", "Copy Info")
            .then((selection) => {
            if (selection === "View Logs") {
                vscode.commands.executeCommand("logScoutAnalyzer.showLogPaths");
            }
            else if (selection === "Copy Info") {
                vscode.env.clipboard.writeText(aboutMsg);
                vscode.window.showInformationMessage("Version info copied to clipboard");
            }
        });
    });
    // Open extension log file command
    const openExtensionLogCommand = vscode.commands.registerCommand("logScoutAnalyzer.openExtensionLog", async () => {
        if (!fileLogger) {
            vscode.window.showWarningMessage("File logger not initialized");
            return;
        }
        const logPath = fileLogger.getLogPath();
        try {
            const doc = await vscode.workspace.openTextDocument(logPath);
            await vscode.window.showTextDocument(doc, { preview: false });
            vscode.window.showInformationMessage(`Opened extension log: ${logPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open extension log: ${error.message}`);
        }
    });
    // Open LSP server log file command
    const openLSPLogCommand = vscode.commands.registerCommand("logScoutAnalyzer.openLSPLog", async () => {
        if (!fileLogger) {
            vscode.window.showWarningMessage("File logger not initialized");
            return;
        }
        const logPath = fileLogger.getLSPLogPath();
        try {
            const doc = await vscode.workspace.openTextDocument(logPath);
            await vscode.window.showTextDocument(doc, { preview: false });
            vscode.window.showInformationMessage(`Opened LSP log: ${logPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open LSP log: ${error.message}`);
        }
    });
    // Show log paths command
    const showLogPathsCommand = vscode.commands.registerCommand("logScoutAnalyzer.showLogPaths", () => {
        if (!fileLogger) {
            vscode.window.showWarningMessage("File logger not initialized");
            return;
        }
        const extensionLog = fileLogger.getLogPath();
        const lspLog = fileLogger.getLSPLogPath();
        const message = `Extension Log: ${extensionLog}\n\nLSP Server Log: ${lspLog}`;
        vscode.window
            .showInformationMessage("Log Files", { modal: true, detail: message }, "Open Extension Log", "Open LSP Log", "Copy Paths")
            .then((selection) => {
            if (selection === "Open Extension Log") {
                vscode.commands.executeCommand("logScoutAnalyzer.openExtensionLog");
            }
            else if (selection === "Open LSP Log") {
                vscode.commands.executeCommand("logScoutAnalyzer.openLSPLog");
            }
            else if (selection === "Copy Paths") {
                vscode.env.clipboard.writeText(`Extension Log:\n${extensionLog}\n\nLSP Server Log:\n${lspLog}`);
                vscode.window.showInformationMessage("Log paths copied to clipboard");
            }
        });
    });
    // Jump to line command
    const jumpToLineCommand = vscode.commands.registerCommand("logScoutAnalyzer.jumpToLine", (uri, line, column) => {
        // Preserve focus on active editor column
        const activeColumn = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;
        vscode.window
            .showTextDocument(uri, {
            viewColumn: activeColumn,
            preserveFocus: false,
            preview: false,
        })
            .then((editor) => {
            const position = new vscode.Position(line, column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            // Highlight the line temporarily
            if (highlightDecoration) {
                const lineRange = editor.document.lineAt(line).range;
                editor.setDecorations(highlightDecoration, [lineRange]);
                // Clear previous timeout if exists
                if (highlightTimeout) {
                    clearTimeout(highlightTimeout);
                }
                // Get highlight duration from config
                const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
                const duration = config.get("highlightDuration", 2000);
                // Clear highlight after configured duration
                highlightTimeout = setTimeout(() => {
                    if (highlightDecoration &&
                        editor === vscode.window.activeTextEditor) {
                        editor.setDecorations(highlightDecoration, []);
                    }
                }, duration);
            }
        });
    });
    // Open Split View command
    const openSplitViewCommand = vscode.commands.registerCommand("logScoutAnalyzer.openSplitView", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !isLogFile(editor.document)) {
            vscode.window.showWarningMessage("Please open a log file to view split view");
            return;
        }
        const results = resultsTreeProvider?.getResults() || [];
        if (results.length === 0) {
            vscode.window.showWarningMessage("No analysis results. Run analysis first.");
            return;
        }
        // Convert results to annotations
        const fileName = editor.document.uri.fsPath.split(/[\\\\/]/).pop();
        const annotations = results.map((r) => ({
            line: r.line,
            severity: r.severity,
            message: r.message,
            matchedText: r.matchedText,
            context: r.context,
            timestamp: r.timestamp,
            category: r.category,
            pattern: undefined,
            patternId: r.patternId,
            fileName: fileName,
            // New structured fields from LSP (snake_case standard)
            template: r.template,
            merged_template: r.merged_template,
            extracted_parameters: r.extracted_parameters,
            pattern_regex: r.pattern_regex,
            log_line: r.log_line,
        }));
        await splitViewProvider?.openSplitView(editor, annotations);
        vscode.window.showInformationMessage("Split view opened! Use settings to configure sync features.");
    });
    // Close Split View command
    const closeSplitViewCommand = vscode.commands.registerCommand("logScoutAnalyzer.closeSplitView", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const uri = editor.document.uri.toString();
        splitViewProvider?.closeSplitView(uri);
        vscode.window.showInformationMessage("Split view closed");
    });
    // Refresh results command
    const refreshResultsCommand = vscode.commands.registerCommand("logScoutAnalyzer.refreshResults", () => {
        resultsTreeProvider?.refresh();
        categoriesTreeProvider?.refresh();
        vscode.window.showInformationMessage("Results refreshed!");
    });
    // Show output channel command (replaces show console)
    const showConsoleCommand = vscode.commands.registerCommand("logScoutAnalyzer.showConsole", () => {
        if (outputChannel) {
            outputChannel.show();
            vscode.window.showInformationMessage("Scout Output Channel opened (for debugging).");
        }
    });
    // Clear console command (deprecated - does nothing now)
    const clearConsoleCommand = vscode.commands.registerCommand("logScoutAnalyzer.clearConsole", () => {
        vscode.window.showInformationMessage("Console output removed - check file logs instead");
    });
    // Show SIP Ladder Diagram command
    const showLadderDiagramCommand = vscode.commands.registerCommand("logScoutAnalyzer.showLadderDiagram", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor found");
            return;
        }
        try {
            // Extract SIP messages using enhanced boundary-based detection
            const messages = sipCallFlowParser_1.SipCallFlowParser.extractSipMessages(editor.document);
            if (messages.length === 0) {
                vscode.window.showInformationMessage("No SIP messages found to extract");
                return;
            }
            // Generate both raw and clean SIP content
            const rawSipContent = sipCallFlowParser_1.SipCallFlowParser.generateRawSipFile(messages);
            const cleanSipContent = sipCallFlowParser_1.SipCallFlowParser.generateSipFile(messages);
            // Get original file path and create UUID-based filenames
            const originalPath = editor.document.uri.fsPath;
            const dirPath = path.dirname(originalPath);
            // Extract Call-ID from first message for UUID naming
            let callId = messages[0]?.extractedParams?.callId || "unknown";
            // Extract UUID part from Call-ID (everything before @)
            const uuidMatch = callId.match(/^([^@]+)/);
            const uuid = uuidMatch ? uuidMatch[1] : callId;
            // Create UUID-based filenames
            const rawSipPath = path.join(dirPath, `SIP_Call_Raw_${uuid}.sip`);
            const cleanSipPath = path.join(dirPath, `SIP_Call_Clean_${uuid}.sip`);
            // Write raw SIP file
            const rawSipUri = vscode.Uri.file(rawSipPath);
            await vscode.workspace.fs.writeFile(rawSipUri, Buffer.from(rawSipContent, "utf8"));
            // Write clean SIP file
            const cleanSipUri = vscode.Uri.file(cleanSipPath);
            await vscode.workspace.fs.writeFile(cleanSipUri, Buffer.from(cleanSipContent, "utf8"));
            // Show both files
            const rawSipDoc = await vscode.workspace.openTextDocument(rawSipUri);
            const cleanSipDoc = await vscode.workspace.openTextDocument(cleanSipUri);
            await vscode.window.showTextDocument(rawSipDoc);
            await vscode.window.showTextDocument(cleanSipDoc);
            vscode.window.showInformationMessage(`Created SIP files:\n• Raw: ${path.basename(rawSipPath)}\n• Clean: ${path.basename(cleanSipPath)}\n\nCall-ID: ${callId}\nTotal messages: ${messages.length}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to extract SIP messages: ${error}`);
        }
    });
    // Group by commands
    const groupBySeverityCommand = vscode.commands.registerCommand("logScoutAnalyzer.groupBySeverity", () => {
        resultsTreeProvider?.setGroupBy("severity");
        vscode.window.showInformationMessage("Grouped by severity");
    });
    const groupByCategoryCommand = vscode.commands.registerCommand("logScoutAnalyzer.groupByCategory", () => {
        resultsTreeProvider?.setGroupBy("category");
        vscode.window.showInformationMessage("Grouped by category");
    });
    const groupByFileCommand = vscode.commands.registerCommand("logScoutAnalyzer.groupByFile", () => {
        resultsTreeProvider?.setGroupBy("file");
        vscode.window.showInformationMessage("Grouped by file");
    });
    // Reset view command
    const resetViewCommand = vscode.commands.registerCommand("logScoutAnalyzer.resetView", () => {
        resultsTreeProvider?.resetGrouping();
        vscode.window.showInformationMessage("View reset to default (by severity)");
    });
    // Sort Commands
    const sortByLineCommand = vscode.commands.registerCommand("logScoutAnalyzer.sortByLine", () => {
        resultsTreeProvider?.setSortBy("line");
    });
    const sortBySeverityCommand = vscode.commands.registerCommand("logScoutAnalyzer.sortBySeverity", () => {
        resultsTreeProvider?.setSortBy("severity");
    });
    const sortByTimeCommand = vscode.commands.registerCommand("logScoutAnalyzer.sortByTime", () => {
        resultsTreeProvider?.setSortBy("time");
    });
    const sortByFileCommand = vscode.commands.registerCommand("logScoutAnalyzer.sortByFile", () => {
        resultsTreeProvider?.setSortBy("file");
    });
    const sortByCategoryCommand = vscode.commands.registerCommand("logScoutAnalyzer.sortByCategory", () => {
        resultsTreeProvider?.setSortBy("category");
    });
    // Export results command
    const exportResultsCommand = vscode.commands.registerCommand("logScoutAnalyzer.exportResults", () => {
        const results = resultsTreeProvider?.getResults() || [];
        if (results.length === 0) {
            vscode.window.showWarningMessage("No results to export");
            return;
        }
        const content = results
            .map((r) => `Line ${r.line + 1}: [${r.severity.toUpperCase()}] ${r.message}\n  ${r.matchedText}\n`)
            .join("\n");
        const fileName = `scout-results-${new Date().toISOString().slice(0, 10)}.txt`;
        vscode.workspace
            .openTextDocument({
            content: content,
            language: "plaintext",
        })
            .then((doc) => {
            vscode.window.showTextDocument(doc);
        });
        fileLogger?.logExport(fileName, results.length);
        vscode.window.showInformationMessage(`Exported ${results.length} results`);
    });
    // Analyze Directory command
    const analyzeDirectoryCommand = vscode.commands.registerCommand("logScoutAnalyzer.analyzeDirectory", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const originalUri = editor.document.uri;
        const originalColumn = editor.viewColumn;
        fileLogger?.log("Analyzing directory...");
        const currentDir = path.dirname(editor.document.uri.fsPath);
        const files = await findLogFiles(currentDir, false);
        fileLogger?.log(`Found ${files.length} log files`);
        // Open each file - LSP auto-analyzes and handleDiagnosticsChange caches asynchronously
        // Event-driven flow handles caching automatically
        let opened = 0;
        for (const file of files) {
            await vscode.workspace.openTextDocument(file);
            opened++;
        }
        // Give LSP time to analyze all files
        await new Promise((resolve) => setTimeout(resolve, files.length * 100));
        // Return focus to original file
        const originalDoc = await vscode.workspace.openTextDocument(originalUri);
        await vscode.window.showTextDocument(originalDoc, {
            viewColumn: originalColumn,
            preserveFocus: false,
            preview: false,
        });
        // Update UI with cached files
        updateCachedFilesView();
        fileLogger?.log(`Opened ${opened} files in directory for analysis (caching via event handler)`);
        vscode.window.showInformationMessage(`Opened ${opened} files. LSP analyzing and caching. Check Cached Files view.`);
    });
    // Analyze All Below command (recursive)
    const analyzeAllBelowCommand = vscode.commands.registerCommand("logScoutAnalyzer.analyzeAllBelow", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const originalUri = editor.document.uri;
        const originalColumn = editor.viewColumn;
        fileLogger?.log("Analyzing recursively...");
        const currentDir = path.dirname(editor.document.uri.fsPath);
        const files = await findLogFiles(currentDir, true);
        fileLogger?.log(`Found ${files.length} log files`);
        // Open each file - LSP auto-analyzes and handleDiagnosticsChange caches asynchronously
        // Event-driven flow handles caching automatically
        let opened = 0;
        for (const file of files) {
            await vscode.workspace.openTextDocument(file);
            opened++;
        }
        // Give LSP time to analyze all files
        await new Promise((resolve) => setTimeout(resolve, files.length * 100));
        // Return focus to original file
        const originalDoc = await vscode.workspace.openTextDocument(originalUri);
        await vscode.window.showTextDocument(originalDoc, {
            viewColumn: originalColumn,
            preserveFocus: false,
            preview: false,
        });
        // Update UI with cached files
        updateCachedFilesView();
        fileLogger?.log(`Opened ${opened} files recursively for analysis (caching via event handler)`);
        vscode.window.showInformationMessage(`Opened ${opened} files. LSP analyzing and caching. Check Cached Files view.`);
    });
    // Open Scout Analyzer Panel command (deprecated but kept for backward compatibility)
    const openAnalyzerPanelCommand = vscode.commands.registerCommand("logScoutAnalyzer.openAnalyzerPanel", () => {
        vscode.window.showInformationMessage("Analyzer controls are in the left sidebar. Click the Scout icon in the activity bar.");
    });
    // Open Scout View command (for status bar and other triggers)
    const openScoutViewCommand = vscode.commands.registerCommand("logScoutAnalyzer.openScoutView", async () => {
        // Focus the Scout Analyzer view in the activity bar
        await vscode.commands.executeCommand("workbench.view.extension.scout-analyzer");
        // If a log file is open, also focus the analyzer tab
        const editor = vscode.window.activeTextEditor;
        if (editor && isLogFile(editor.document)) {
            await vscode.commands.executeCommand("scoutAnalyzer.focus");
        }
    });
    // Open Action Panel with Scenarios
    const openActionPanelCommand = vscode.commands.registerCommand("logScoutAnalyzer.openActionPanel", () => {
        if (scenarioManager && patternOverrideManager) {
            scoutAnalyzerPanel_1.ScoutAnalyzerPanel.createOrShow(context.extensionUri, scenarioManager, patternOverrideManager);
        }
    });
    // Open Annotation Dashboard command
    const openAnnotationDashboardCommand = vscode.commands.registerCommand("logScoutAnalyzer.openAnnotationDashboard", () => {
        annotationDashboardPanel_1.AnnotationDashboardPanel.createOrShow(context.extensionUri);
    });
    // Toggle Console Location command (deprecated - does nothing now)
    const toggleConsoleLocationCommand = vscode.commands.registerCommand("logScoutAnalyzer.toggleConsoleLocation", () => {
        vscode.window.showInformationMessage("Console UI removed - check file logs at: " + fileLogger?.getLogPath());
    });
    // Set Timeframe Filter command
    const setTimeframeCommand = vscode.commands.registerCommand("logScoutAnalyzer.setTimeframe", (timeframe) => {
        analyzerTreeProvider?.setTimeframe(timeframe);
        // Apply filter to results
        if (timeframe && timeframe.days > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - timeframe.days);
            // Filter results by timestamp
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                // Convert to ResultItem format and filter
                const allResults = diagnostics.map((diag) => {
                    const severity = diag.severity === vscode.DiagnosticSeverity.Error
                        ? "error"
                        : diag.severity === vscode.DiagnosticSeverity.Warning
                            ? "warning"
                            : diag.severity === vscode.DiagnosticSeverity.Hint
                                ? "debug"
                                : "info";
                    const line = editor.document.lineAt(diag.range.start.line);
                    const messageLines = diag.message.split("\n");
                    const mainMessage = messageLines[0];
                    const extractedTimestamp = extractTimestamp(line.text);
                    const diagWithData = diag;
                    let category = diagWithData.data?.category || extractCategory(line.text);
                    // Extract pattern ID and name
                    let patternId = undefined;
                    let patternName = undefined;
                    if (diag.code && typeof diag.code === "string") {
                        patternId = diag.code;
                    }
                    if (diagWithData.data &&
                        typeof diagWithData.data === "object" &&
                        "patternName" in diagWithData.data) {
                        patternName = diagWithData.data.patternName;
                    }
                    return {
                        severity,
                        line: diag.range.start.line,
                        column: diag.range.start.character,
                        message: mainMessage, // Clean description with substituted values
                        matchedText: line.text
                            .substring(diag.range.start.character, Math.min(diag.range.end.character, diag.range.start.character + 100))
                            .trim() || line.text.trim(),
                        context: line.text, // Full log line with timestamp and level
                        timestamp: extractedTimestamp,
                        category: category,
                        patternId: patternId,
                        patternName: patternName,
                        uri: editor.document.uri,
                    };
                });
                // Filter by timeframe
                const filteredResults = allResults.filter((r) => {
                    if (!r.timestamp)
                        return false;
                    return r.timestamp >= cutoffDate;
                });
                // Update tree views with filtered results
                resultsTreeProvider?.setResults(filteredResults);
                categoriesTreeProvider?.setResults(filteredResults);
                vscode.window.showInformationMessage(`Timeframe filter applied: ${timeframe.label} (${filteredResults.length} of ${allResults.length} results)`);
            }
        }
        else {
            // Show all results - re-run analysis
            vscode.commands.executeCommand("logScoutAnalyzer.analyzeFile");
            vscode.window.showInformationMessage("Showing all results");
        }
    });
    // Toggle Category command
    const toggleCategoryCommand = vscode.commands.registerCommand("logScoutAnalyzer.toggleCategory", (category) => {
        categoriesTreeProvider?.toggleCategory(category);
        // Filter results view based on enabled categories
        filterResultsByCategories();
    });
    // Toggle All Categories command
    const toggleAllCategoriesCommand = vscode.commands.registerCommand("logScoutAnalyzer.toggleAllCategories", (enable) => {
        categoriesTreeProvider?.toggleAll(enable);
        // Filter results view based on enabled categories
        filterResultsByCategories();
    });
    // Toggle Filter command (unified - handles categories, files, etc.)
    const toggleFilterCommand = vscode.commands.registerCommand("logScoutAnalyzer.toggleFilter", (filterType, filterValue) => {
        if (filterType === "category") {
            filterTreeProvider?.toggleCategory(filterValue);
        }
        else if (filterType === "file") {
            filterTreeProvider?.toggleFile(filterValue);
        }
    });
    // Helper function to filter results based on enabled categories
    function filterResultsByCategories() {
        if (!categoriesTreeProvider || !allResults)
            return;
        const enabledCategories = categoriesTreeProvider.getEnabledCategories();
        if (enabledCategories.size === 0) {
            // No categories enabled - show nothing
            resultsTreeProvider?.setResults([]);
            return;
        }
        const filteredResults = allResults.filter((result) => {
            const category = result.category || "Uncategorized";
            return enabledCategories.has(category);
        });
        resultsTreeProvider?.setResults(filteredResults);
    }
    // Copy File Path command
    const copyFilePathCommand = vscode.commands.registerCommand("logScoutAnalyzer.copyFilePath", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No file is currently open");
            return;
        }
        vscode.env.clipboard.writeText(editor.document.uri.fsPath);
        vscode.window.showInformationMessage(`Copied: ${editor.document.uri.fsPath}`);
    });
    // Open in New Window command
    const openInNewWindowCommand = vscode.commands.registerCommand("logScoutAnalyzer.openInNewWindow", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No file is currently open");
            return;
        }
        await vscode.commands.executeCommand("vscode.openFolder", editor.document.uri, true);
    });
    // Extract SIP Messages command
    const extractSipMessagesCommand = vscode.commands.registerCommand("logScoutAnalyzer.extractSipMessages", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const document = editor.document;
        if (document.languageId !== "log") {
            vscode.window.showWarningMessage("This command only works with log files");
            return;
        }
        try {
            // Extract SIP messages using our parser
            const sipMessages = sipCallFlowParser_1.SipCallFlowParser.extractSipMessages(document);
            if (sipMessages.length === 0) {
                vscode.window.showInformationMessage("No SIP messages found in this file");
                return;
            }
            // Generate SIP file content
            const sipContent = sipCallFlowParser_1.SipCallFlowParser.generateSipFile(sipMessages);
            // Create .sip file in temp directory
            const os = require("os");
            const path = require("path");
            const fs = require("fs");
            const tempDir = os.tmpdir();
            const originalFileName = path.basename(document.fileName, path.extname(document.fileName));
            const sipFileName = `${originalFileName}_extracted.sip`;
            const sipFilePath = path.join(tempDir, sipFileName);
            // Write SIP file
            fs.writeFileSync(sipFilePath, sipContent, "utf8");
            // Open the .sip file in new tab
            const sipDocument = await vscode.workspace.openTextDocument(sipFilePath);
            await vscode.window.showTextDocument(sipDocument);
            vscode.window.showInformationMessage(`Extracted ${sipMessages.length} SIP messages to ${sipFileName}`);
            if (outputChannel) {
                outputChannel.appendLine(`[${new Date().toISOString()}] SIP extraction: ${sipMessages.length} messages extracted from ${document.fileName}`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to extract SIP messages: ${error}`);
        }
    });
    // Copy Version Info command
    const copyVersionInfoCommand = vscode.commands.registerCommand("logScoutAnalyzer.copyVersionInfo", () => {
        const lspVersion = (0, lspClient_1.getLSPServerVersion)();
        const versionText = lspVersion
            ? `Extension: v${buildInfo_1.BUILD_INFO.version}\nLSP Server: v${lspVersion}\nBuild: ${buildInfo_1.BUILD_INFO.buildTimestamp}\nGit: ${buildInfo_1.BUILD_INFO.gitCommit}`
            : `Extension: v${buildInfo_1.BUILD_INFO.version}\nBuild: ${buildInfo_1.BUILD_INFO.buildTimestamp}\nGit: ${buildInfo_1.BUILD_INFO.gitCommit}\nLSP: Not connected`;
        vscode.env.clipboard.writeText(versionText);
        vscode.window.showInformationMessage("Version info copied to clipboard");
    });
    const copyResultInfoCommand = vscode.commands.registerCommand("logScoutAnalyzer.copyResultInfo", (item) => {
        if (!item || !item.result) {
            vscode.window.showErrorMessage("No result item selected");
            return;
        }
        const result = item.result;
        const fileName = result.uri.fsPath.split(/[\\/]/).pop();
        const lineNum = result.line + 1;
        // Format matching tooltip: Category (left) | severity filename:line (right)
        const category = result.category || "";
        const rightParts = [];
        rightParts.push(result.severity.toUpperCase());
        rightParts.push(`${fileName}:${lineNum}`);
        const rightSide = rightParts.join(" ");
        // Build copyable text matching tooltip format (pattern ID below message)
        let text = `${category}`.padEnd(40) + rightSide + "\n";
        text += `${"─".repeat(80)}\n\n`;
        text += `${result.message}\n\n`;
        if (result.patternId) {
            text += `Pattern: (${result.patternId})\n\n`;
        }
        text += `${"─".repeat(80)}\n\n`;
        text += `${result.context}\n`;
        vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage("Tooltip content copied to clipboard");
    });
    const copyDiagnosticAtCursorCommand = vscode.commands.registerCommand("logScoutAnalyzer.copyDiagnosticAtCursor", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No active editor");
            return;
        }
        const position = editor.selection.active;
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        // Find diagnostic at cursor position
        const diagnostic = diagnostics.find((diag) => diag.range.contains(position));
        if (!diagnostic) {
            vscode.window.showInformationMessage("No diagnostic at cursor position");
            return;
        }
        // Extract data from diagnostic
        const diagWithData = diagnostic;
        const category = diagWithData.data?.category || "";
        const patternId = typeof diagnostic.code === "string" ? diagnostic.code : "";
        const fileName = editor.document.uri.fsPath.split(/[\\/]/).pop();
        const lineNum = position.line + 1;
        // Get the full log line
        const logLine = editor.document.lineAt(position.line).text;
        // Extract clean message (remove pattern name prefix if present)
        let message = diagnostic.message;
        const colonIndex = message.indexOf(":");
        if (colonIndex > 0) {
            message = message.substring(colonIndex + 1).trim();
        }
        // Format severity
        const severityMap = {
            0: "ERROR",
            1: "WARNING",
            2: "INFO",
            3: "HINT",
        };
        const severity = severityMap[diagnostic.severity || 2] || "INFO";
        // Build copyable text matching tooltip format (pattern ID below message)
        const rightParts = [severity, `${fileName}:${lineNum}`].filter((p) => p);
        const rightSide = rightParts.join(" ");
        let text = `${category}`.padEnd(40) + rightSide + "\n";
        text += `${"─".repeat(80)}\n\n`;
        text += `${message}\n\n`;
        if (patternId) {
            text += `Pattern: (${patternId})\n\n`;
        }
        text += `${"─".repeat(80)}\n\n`;
        text += `${logLine}\n`;
        vscode.env.clipboard.writeText(text);
        vscode.window.showInformationMessage("Diagnostic message copied to clipboard");
    });
    const showCacheDataCommand = vscode.commands.registerCommand("logScoutAnalyzer.showCacheData", (item) => {
        if (!item || !item.result) {
            vscode.window.showErrorMessage("No result item selected");
            return;
        }
        const result = item.result;
        const lineNum = result.line + 1;
        // Create a document showing all cached analysis data
        const output = vscode.window.createOutputChannel("Scout: Cache Data");
        output.clear();
        output.appendLine("═".repeat(80));
        output.appendLine("📊 CACHED ANALYSIS DATA");
        output.appendLine("═".repeat(80));
        output.appendLine("");
        output.appendLine("📍 LOCATION:");
        output.appendLine(`   File: ${result.uri.fsPath}`);
        output.appendLine(`   Line: ${lineNum} (0-based: ${result.line})`);
        output.appendLine(`   Column: ${result.column}`);
        output.appendLine("");
        output.appendLine("🔍 DETECTION:");
        output.appendLine(`   Severity: ${result.severity.toUpperCase()}`);
        output.appendLine(`   Category: ${result.category || "(none)"}`);
        output.appendLine(`   Pattern ID: ${result.patternId || "(none)"}`);
        output.appendLine(`   Pattern Name: ${result.patternName || "(none)"}`);
        output.appendLine("");
        output.appendLine("💬 MESSAGE:");
        output.appendLine(`   ${result.message}`);
        output.appendLine("");
        // ANNOTATION TEXT - the key field with values populated
        if (result.mergedTemplate) {
            output.appendLine("📝 ANNOTATION TEXT (with values):");
            output.appendLine(`   ${result.mergedTemplate}`);
            output.appendLine("");
        }
        if (result.template) {
            output.appendLine("📋 TEMPLATE (Raw with placeholders):");
            output.appendLine(`   ${result.template}`);
            output.appendLine("");
        }
        if (result.extractedFields &&
            Object.keys(result.extractedFields).length > 0) {
            output.appendLine("🎯 EXTRACTED FIELDS:");
            for (const [key, value] of Object.entries(result.extractedFields)) {
                output.appendLine(`   ${key}: ${value}`);
            }
            output.appendLine("");
        }
        if (result.patternRegex) {
            output.appendLine("🔧 PATTERN REGEX:");
            output.appendLine(`   ${result.patternRegex}`);
            output.appendLine("");
        }
        output.appendLine("📝 MATCHED TEXT:");
        output.appendLine(`   ${result.matchedText || "(none)"}`);
        output.appendLine("");
        output.appendLine("📄 CONTEXT (Full Line):");
        output.appendLine(`   ${result.context}`);
        output.appendLine("");
        if (result.timestamp) {
            output.appendLine("🕐 TIMESTAMP:");
            output.appendLine(`   ${result.timestamp}`);
            output.appendLine("");
        }
        output.appendLine("═".repeat(80));
        output.appendLine("Raw JSON Data:");
        output.appendLine("═".repeat(80));
        // Show complete diagnostic data if available
        if (result.diagnosticData) {
            output.appendLine("");
            output.appendLine("FULL DIAGNOSTIC DATA (includes all TagScout annotation fields):");
            output.appendLine(JSON.stringify(result.diagnosticData, null, 2));
            output.appendLine("");
            output.appendLine("═".repeat(80));
        }
        // Create output object with key annotation fields first
        const jsonOutput = {
            // KEY ANNOTATION FIELDS
            mergedTemplate: result.mergedTemplate,
            extractedFields: result.extractedFields,
            template: result.template,
            // Other fields
            severity: result.severity,
            line: result.line,
            column: result.column,
            message: result.message,
            matchedText: result.matchedText,
            context: result.context,
            timestamp: result.timestamp,
            category: result.category,
            patternId: result.patternId,
            patternName: result.patternName,
            patternRegex: result.patternRegex,
            uri: result.uri,
        };
        output.appendLine(JSON.stringify(jsonOutput, null, 2));
        output.show();
    });
    const showPatternByIdCommand = vscode.commands.registerCommand("logScoutAnalyzer.showPatternById", async (patternId) => {
        if (!patternId) {
            vscode.window.showErrorMessage("No pattern ID provided");
            return;
        }
        try {
            const lspClient = (0, lspClient_1.getLSPClient)();
            if (!lspClient) {
                vscode.window.showWarningMessage("LSP client not connected. Cannot fetch pattern.");
                return;
            }
            // Fetch all patterns
            const allPatternsResult = await lspClient.sendRequest("workspace/executeCommand", {
                command: "logScout.getPatterns",
                arguments: [],
            });
            if (!allPatternsResult || !allPatternsResult.patterns) {
                vscode.window.showWarningMessage("No patterns available");
                return;
            }
            // Find the specific pattern by ID
            const pattern = allPatternsResult.patterns.find((p) => p.id === patternId);
            if (!pattern) {
                vscode.window.showWarningMessage(`Pattern not found: ${patternId}`);
                return;
            }
            // Create a JSON document with the pattern data for editing
            const patternJson = JSON.stringify(pattern, null, 2);
            const doc = await vscode.workspace.openTextDocument({
                content: patternJson,
                language: "json",
            });
            const editor = await vscode.window.showTextDocument(doc, {
                preview: false,
                viewColumn: vscode.ViewColumn.One,
            });
            if (outputChannel) {
                outputChannel.appendLine(`✓ Opened pattern for editing: ${pattern.name} (${patternId})`);
            }
            // Show info message with option to save back
            const action = await vscode.window.showInformationMessage(`Editing pattern: ${pattern.name}`, "Save Changes", "Close");
            if (action === "Save Changes") {
                // Get the edited content
                const editedContent = editor.document.getText();
                try {
                    // Validate JSON
                    JSON.parse(editedContent);
                    // Here you would send the edited pattern back to LSP or save to file
                    // For now, just show a message
                    vscode.window.showInformationMessage("Pattern save functionality coming soon. For now, you can copy this JSON to your patterns file.");
                    if (outputChannel) {
                        outputChannel.appendLine(`Pattern edited:\n${editedContent}`);
                    }
                }
                catch (parseError) {
                    vscode.window.showErrorMessage(`Invalid JSON: ${parseError.message}`);
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch pattern: ${error.message}`);
            if (outputChannel) {
                outputChannel.appendLine(`✗ Error fetching pattern: ${error.message}`);
            }
        }
    });
    const showPatternForResultCommand = vscode.commands.registerCommand("logScoutAnalyzer.showPatternForResult", async (item) => {
        if (!item || !item.result) {
            vscode.window.showErrorMessage("No result item selected");
            return;
        }
        const result = item.result;
        if (!result.patternId) {
            vscode.window.showWarningMessage("No pattern information available for this result");
            return;
        }
        try {
            const lspClient = (0, lspClient_1.getLSPClient)();
            if (!lspClient) {
                vscode.window.showWarningMessage("LSP client not connected. Cannot fetch pattern.");
                return;
            }
            // Fetch all patterns
            const allPatternsResult = await lspClient.sendRequest("workspace/executeCommand", {
                command: "logScout.getPatterns",
                arguments: [],
            });
            if (!allPatternsResult || !allPatternsResult.patterns) {
                vscode.window.showWarningMessage("No patterns available");
                return;
            }
            // Find the specific pattern by ID
            const pattern = allPatternsResult.patterns.find((p) => p.id === result.patternId);
            if (!pattern) {
                vscode.window.showWarningMessage(`Pattern not found: ${result.patternId}`);
                return;
            }
            // Show in panel with just this pattern
            patternViewerPanel_1.PatternViewerPanel.createOrShow(context.extensionUri, {
                patterns: [pattern],
                count: 1,
                source: allPatternsResult.source,
            });
            if (outputChannel) {
                outputChannel.appendLine(`✓ Showing pattern: ${pattern.name} (${result.patternId})`);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch pattern: ${error.message}`);
            if (outputChannel) {
                outputChannel.appendLine(`✗ Error fetching pattern: ${error.message}`);
            }
        }
    });
    // ============================================================
    // REGISTER ALL COMMANDS
    // ============================================================
    context.subscriptions.push(dumpDiagnosticsCommand);
    context.subscriptions.push(analyzeCommand);
    context.subscriptions.push(clearCommand);
    context.subscriptions.push(clearResultsCommand);
    context.subscriptions.push(clearCacheCommand);
    context.subscriptions.push(removeCachedFileCommand);
    context.subscriptions.push(openCachedFileCommand);
    context.subscriptions.push(openFileInEditorCommand);
    context.subscriptions.push(revealInExplorerCommand);
    context.subscriptions.push(viewCacheMetadataCommand);
    context.subscriptions.push(showCacheStatsCommand);
    context.subscriptions.push(showPatternsCommand);
    context.subscriptions.push(showAboutCommand);
    context.subscriptions.push(openExtensionLogCommand);
    context.subscriptions.push(openLSPLogCommand);
    context.subscriptions.push(showLogPathsCommand);
    context.subscriptions.push(jumpToLineCommand);
    context.subscriptions.push(openSplitViewCommand);
    context.subscriptions.push(closeSplitViewCommand);
    context.subscriptions.push(refreshResultsCommand);
    context.subscriptions.push(showConsoleCommand);
    context.subscriptions.push(clearConsoleCommand);
    context.subscriptions.push(showLadderDiagramCommand);
    context.subscriptions.push(groupBySeverityCommand);
    context.subscriptions.push(groupByCategoryCommand);
    context.subscriptions.push(groupByFileCommand);
    context.subscriptions.push(resetViewCommand);
    context.subscriptions.push(sortByLineCommand);
    context.subscriptions.push(sortBySeverityCommand);
    context.subscriptions.push(sortByTimeCommand);
    context.subscriptions.push(sortByFileCommand);
    context.subscriptions.push(sortByCategoryCommand);
    context.subscriptions.push(exportResultsCommand);
    context.subscriptions.push(analyzeDirectoryCommand);
    context.subscriptions.push(analyzeAllBelowCommand);
    context.subscriptions.push(openAnalyzerPanelCommand);
    context.subscriptions.push(openScoutViewCommand);
    context.subscriptions.push(openActionPanelCommand);
    context.subscriptions.push(openAnnotationDashboardCommand);
    context.subscriptions.push(toggleConsoleLocationCommand);
    context.subscriptions.push(setTimeframeCommand);
    context.subscriptions.push(toggleCategoryCommand);
    context.subscriptions.push(toggleAllCategoriesCommand);
    context.subscriptions.push(toggleFilterCommand);
    context.subscriptions.push(copyFilePathCommand);
    context.subscriptions.push(openInNewWindowCommand);
    context.subscriptions.push(extractSipMessagesCommand);
    context.subscriptions.push(copyVersionInfoCommand);
    context.subscriptions.push(copyResultInfoCommand);
    context.subscriptions.push(copyDiagnosticAtCursorCommand);
    context.subscriptions.push(showCacheDataCommand);
    context.subscriptions.push(showPatternByIdCommand);
    context.subscriptions.push(showPatternForResultCommand);
    // ============================================================
    // BUNDLE MANAGEMENT COMMANDS
    // ============================================================
    // Create Bundle Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.create", async () => {
        const name = await vscode.window.showInputBox({
            prompt: "Enter bundle name (e.g., INC-12345 or Case 700440257)",
            placeHolder: "INC-12345: Presence Failure",
        });
        if (!name) {
            return;
        }
        const description = await vscode.window.showInputBox({
            prompt: "Enter description (optional)",
            placeHolder: "User cannot see presence status",
        });
        const caseId = await vscode.window.showInputBox({
            prompt: "Enter case ID (optional)",
            placeHolder: "700440257",
        });
        if (bundleTreeProvider) {
            const bundleId = await bundleTreeProvider.createBundle(name, description || undefined, caseId || undefined);
            if (bundleId) {
                vscode.window.showInformationMessage(`✅ Bundle created: ${name}`);
                outputChannel?.appendLine(`✓ Created bundle: ${name} (${bundleId})`);
            }
        }
    }));
    // Import Package Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.importPackage", async (uri) => {
        let packagePath;
        if (uri) {
            packagePath = uri.fsPath;
        }
        else {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectMany: false,
                filters: {
                    "QCSONE Packages": ["zip"],
                    "All Archives": ["zip", "tar.gz", "tgz", "tar", "gz"],
                },
                title: "Select Log Package (e.g., 700440257_qcsone_download_selected.zip)",
            });
            if (files && files.length > 0) {
                packagePath = files[0].fsPath;
            }
        }
        if (!packagePath) {
            return;
        }
        const filename = packagePath.split(/[\\/]/).pop() || packagePath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Importing ${filename}`,
            cancellable: false,
        }, async (progress) => {
            progress.report({
                message: "Extracting archive (including nested archives)...",
            });
            try {
                if (bundleTreeProvider) {
                    const result = await bundleTreeProvider.importPackage(packagePath);
                    if (result) {
                        let message = `✅ Bundle Created Successfully!\n\n`;
                        if (result.caseId) {
                            message += `📋 Case: ${result.caseId}\n`;
                        }
                        message += `📦 Imported: ${result.importedCount}/${result.totalFiles} files\n`;
                        if (result.serviceCounts) {
                            message += `🔍 Services Detected:\n`;
                            Object.entries(result.serviceCounts).forEach(([service, count]) => {
                                message += `   • ${service}: ${count} log(s)\n`;
                            });
                        }
                        const action = await vscode.window.showInformationMessage(message, "Open Bundle", "Analyze Now");
                        if (action === "Analyze Now" && result.bundleId) {
                            vscode.commands.executeCommand("logScoutAnalyzer.bundle.analyze", result.bundleId);
                        }
                        outputChannel?.appendLine(`✓ Imported package: ${filename} → ${result.bundleName}`);
                        outputChannel?.appendLine(`  Note: Nested archives automatically extracted`);
                    }
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Import failed: ${error}`);
                outputChannel?.appendLine(`✗ Import failed: ${error}`);
            }
        });
    }));
    // Add Current File to Bundle Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.addCurrentFile", async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("No file is currently open");
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;
        // Check if it's a log file
        if (!fileName.match(/\.(log|txt|trace|out|err)$/i)) {
            const proceed = await vscode.window.showWarningMessage(`"${fileName}" doesn't appear to be a log file. Add it anyway?`, "Yes", "No");
            if (proceed !== "Yes") {
                return;
            }
        }
        // Get list of bundles
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            vscode.window.showErrorMessage("LSP client not available");
            return;
        }
        try {
            // List existing bundles
            const response = await client.sendRequest("scout/bundle/list", {
                logs: [filePath],
            });
            if (!response || !response.bundles || response.bundles.length === 0) {
                // No bundles exist, offer to create one
                const action = await vscode.window.showInformationMessage(`No bundles exist yet. Create a new bundle for "${fileName}"?`, "Create Bundle", "Cancel");
                if (action === "Create Bundle") {
                    // Trigger create bundle command, which will add this file
                    await vscode.commands.executeCommand("logScoutAnalyzer.bundle.create");
                }
                return;
            }
            // Let user pick which bundle to add to
            const items = response.bundles.map((bundle) => ({
                label: bundle.name,
                description: `${bundle.logs?.length || 0} logs`,
                detail: bundle.description || "",
                id: bundle.id,
            }));
            items.unshift({
                label: "$(add) Create New Bundle",
                description: "Create a new bundle for this log",
                detail: "",
                id: "__new__",
            });
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Add "${fileName}" to bundle...`,
                title: "Select Bundle",
            });
            if (!selected) {
                return;
            }
            if (selected.id === "__new__") {
                // Create new bundle
                await vscode.commands.executeCommand("logScoutAnalyzer.bundle.create");
                return;
            }
            // Add file to selected bundle
            await client.sendRequest("scout/bundle/addLog", {
                bundleId: selected.id,
                logPath: filePath,
            });
            vscode.window.showInformationMessage(`✅ Added "${fileName}" to bundle "${selected.label}"`);
            outputChannel?.appendLine(`✓ Added log to bundle: ${fileName} → ${selected.label}`);
            // Refresh bundle view
            bundleTreeProvider?.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to add log: ${error}`);
            outputChannel?.appendLine(`✗ Failed to add log: ${error}`);
        }
    }));
    // Unified Add to Bundle Command (for Explorer context menu)
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.addToBundle", async (uri) => {
        if (!uri) {
            vscode.window.showWarningMessage("No file or folder selected");
            return;
        }
        const fsPath = uri.fsPath;
        const fileName = fsPath.split(/[\\/]/).pop() || fsPath;
        const stats = await vscode.workspace.fs.stat(uri);
        const isDirectory = stats.type === vscode.FileType.Directory;
        // Determine what was selected
        let actionType = "file";
        if (isDirectory) {
            actionType = "folder";
        }
        else if (fileName.match(/\.(zip|tar\.gz|tgz|tar|gz)$/i)) {
            actionType = "archive";
        }
        // Handle based on type
        switch (actionType) {
            case "archive":
                // Import as QCSONE package
                await vscode.commands.executeCommand("logScoutAnalyzer.bundle.importPackage", uri);
                break;
            case "folder":
                // Create bundle from folder
                const folderName = fileName;
                const bundleName = await vscode.window.showInputBox({
                    prompt: `Create bundle from folder "${folderName}"`,
                    value: folderName,
                    placeHolder: "Enter bundle name",
                });
                if (!bundleName) {
                    return;
                }
                const client = (0, lspClient_1.getLSPClient)();
                if (!client) {
                    vscode.window.showErrorMessage("LSP client not available");
                    return;
                }
                try {
                    const response = await client.sendRequest("scout/bundle/create", {
                        name: bundleName,
                        description: `Created from folder: ${folderName}`,
                    });
                    if (response && response.bundleId) {
                        vscode.window.showInformationMessage(`✅ Bundle "${bundleName}" created!\n\nNow add log files from the folder.`);
                        outputChannel?.appendLine(`✓ Created bundle: ${bundleName}`);
                        bundleTreeProvider?.refresh();
                    }
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to create bundle: ${error}`);
                }
                break;
            case "file":
                // Add file to bundle (reuse existing logic)
                const doc = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(doc);
                await vscode.commands.executeCommand("logScoutAnalyzer.bundle.addCurrentFile");
                break;
        }
    }));
    // Refresh Bundles Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.refresh", () => {
        bundleTreeProvider?.refresh();
        outputChannel?.appendLine("✓ Bundles refreshed");
    }));
    // Import Log Archive Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.importArchive", async () => {
        if (!bundleTreeProvider) {
            vscode.window.showErrorMessage("Bundle tree provider not initialized");
            return;
        }
        // Show file picker
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                Archives: ["zip", "tar", "gz", "tgz"],
            },
            title: "Select Log Archive to Import",
        });
        if (result && result.length > 0) {
            const archivePath = result[0].fsPath;
            outputChannel?.appendLine(`Importing archive: ${archivePath}`);
            try {
                await bundleTreeProvider.importPackage(archivePath);
                outputChannel?.appendLine("✓ Import completed successfully");
            }
            catch (error) {
                outputChannel?.appendLine(`✗ Import failed: ${error}`);
            }
        }
    }));
    // Analyze Bundle Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.analyze", async (bundleId) => {
        if (!bundleTreeProvider) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Bundle",
            cancellable: false,
        }, async (progress) => {
            progress.report({ message: "Running pattern analysis..." });
            try {
                if (!bundleTreeProvider) {
                    throw new Error("Bundle tree provider not initialized");
                }
                const result = await bundleTreeProvider.analyzeBundle(bundleId);
                if (result) {
                    const message = `✅ Analysis Complete!\n\n` +
                        `📊 Detections: ${result.totalDetections}\n` +
                        `🔴 Errors: ${result.errorCount}\n` +
                        `🟡 Warnings: ${result.warningCount}\n` +
                        `🔵 Info: ${result.infoCount}`;
                    vscode.window.showInformationMessage(message, "View Results");
                    outputChannel?.appendLine(`✓ Analyzed bundle: ${bundleId}`);
                    outputChannel?.appendLine(`  Detections: ${result.totalDetections}`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error}`);
                outputChannel?.appendLine(`✗ Analysis failed: ${error}`);
            }
        });
    }));
    // Delete Bundle Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.delete", async (bundleId) => {
        const confirm = await vscode.window.showWarningMessage("Delete this bundle? This action cannot be undone.", { modal: true }, "Delete");
        if (confirm === "Delete" && bundleTreeProvider) {
            const success = await bundleTreeProvider.deleteBundle(bundleId);
            if (success) {
                vscode.window.showInformationMessage("Bundle deleted");
                outputChannel?.appendLine(`✓ Deleted bundle: ${bundleId}`);
            }
        }
    }));
    // ============================================================
    // END BUNDLE MANAGEMENT COMMANDS
    // ============================================================
    // Process active editor if it already has diagnostics (reload scenario)
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && isLogFile(activeEditor.document)) {
        const diagnostics = vscode.languages.getDiagnostics(activeEditor.document.uri);
        if (diagnostics.length > 0) {
            handleDiagnosticsChange(activeEditor.document.uri, diagnostics);
            if (outputChannel) {
                outputChannel.appendLine(`✓ Processed active file: ${activeEditor.document.uri.fsPath.split(/[\\\/]/).pop()} (${diagnostics.length} diagnostic(s))`);
                outputChannel.appendLine("");
            }
        }
    }
    if (outputChannel) {
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine(`✅ Extension ready! ${(0, buildInfo_1.getBuildInfo)()}`);
        outputChannel.appendLine("   🔍 Click Scout icon in activity bar to open views");
        outputChannel.appendLine("   � Debug logs at: " + fileLogger.getLogPath());
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine("");
    }
    fileLogger.log("All features initialized and ready");
    fileLogger.log("  - Results Tree View");
    fileLogger.log("  - Categories Tree View");
    fileLogger.log("  - Timeline Tree View");
    fileLogger.log("  - File-based logging");
    console.log(`${(0, buildInfo_1.getBuildInfo)()}: All features registered`);
}
exports.activate = activate;
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function updateCachedFilesView() {
    // TODO: Implement cached files view update when CachedFilesTreeProvider exists
    // Currently this is a stub to satisfy calls from cache management code
    if (cachedFilesTreeProvider) {
        // cachedFilesTreeProvider.refresh();
    }
}
function updateStatusBar() {
    if (!statusBarItem) {
        return;
    }
    // Check if status bar button is enabled in settings
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const showStatusBar = config.get("showStatusBarButton", true);
    if (!showStatusBar) {
        statusBarItem.hide();
        return;
    }
    const editor = vscode.window.activeTextEditor;
    if (editor && isLogFile(editor.document)) {
        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
        const errorCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
        const warningCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning).length;
        const infoCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Information).length;
        if (diagnostics.length === 0) {
            statusBarItem.text = `$(search) Scout: Analyze`;
            statusBarItem.backgroundColor = undefined;
        }
        else {
            statusBarItem.text = `$(search) Scout: 🔴 ${errorCount} 🟡 ${warningCount} 🔵 ${infoCount}`;
            if (errorCount > 0) {
                statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
            }
            else if (warningCount > 0) {
                statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
            }
            else {
                statusBarItem.backgroundColor = undefined;
            }
        }
    }
    else {
        statusBarItem.text = "$(search) Scout Analyzer";
        statusBarItem.backgroundColor = undefined;
    }
    statusBarItem.show();
}
function updatePatternStatusBar() {
    if (!patternStatusBarItem) {
        return;
    }
    // Update pattern status bar with current pattern statistics
    if (patternOverrideManager) {
        const stats = patternOverrideManager.getStats();
        const activeCount = stats.enabledOverrides + stats.enabledCustom;
        const totalCount = stats.totalOverrides + stats.totalCustom;
        patternStatusBarItem.text = `$(edit) Patterns: ${activeCount}/${totalCount}`;
        patternStatusBarItem.show();
    }
    else {
        patternStatusBarItem.text = "$(edit) Patterns";
        patternStatusBarItem.show();
    }
}
function isLogFile(document) {
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const enableDiagnostics = config.get("enableDiagnostics", true);
    if (!enableDiagnostics) {
        return false;
    }
    // Check language ID first
    if (document.languageId === "log") {
        return true;
    }
    // Check file extensions
    const fileName = document.fileName.toLowerCase();
    const logExtensions = [".log", ".txt", ".out", ".err"];
    return logExtensions.some((ext) => fileName.endsWith(ext));
}
function extractTimestamp(logLine) {
    // Try various timestamp formats
    const patterns = [
        // ISO 8601: 2024-01-15T14:30:45.123Z or 2024-01-15 14:30:45
        /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)/,
        // Common log format: [2024-01-15 14:30:45]
        /\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/,
        // Unix timestamp with milliseconds: 1705329045123
        /\b(\d{13})\b/,
        // Unix timestamp: 1705329045
        /\b(\d{10})\b/,
        // Month DD YYYY HH:MM:SS: Jan 15 2024 14:30:45
        /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2})/i,
        // MM/DD/YYYY HH:MM:SS
        /(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
    ];
    for (const pattern of patterns) {
        const match = logLine.match(pattern);
        if (match) {
            const dateStr = match[1];
            // Handle Unix timestamps
            if (/^\d{10}$/.test(dateStr)) {
                return new Date(parseInt(dateStr) * 1000);
            }
            if (/^\d{13}$/.test(dateStr)) {
                return new Date(parseInt(dateStr));
            }
            // Try parsing as date string
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }
    return undefined;
}
function extractCategory(logLine) {
    // Try to extract category/component/module from common patterns
    const patterns = [
        // [Category] or [CATEGORY]
        /\[([A-Z][A-Za-z0-9_-]+)\]/,
        // Category: or CATEGORY:
        /^([A-Z][A-Za-z0-9_-]+):/,
        // <Category> or <CATEGORY>
        /<([A-Z][A-Za-z0-9_-]+)>/,
        // category.function or Category.Function
        /([A-Z][A-Za-z0-9_]+)\.[A-Za-z0-9_]+/,
        // Common logging framework patterns
        /(?:ERROR|WARN|INFO|DEBUG)\s+\[([A-Za-z0-9._-]+)\]/,
        // Java-style: com.example.Service
        /([a-z]+\.[a-z]+\.[A-Z][A-Za-z0-9]+)/,
    ];
    for (const pattern of patterns) {
        const match = logLine.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return undefined;
}
function formatTimeSince(date) {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1)
        return "just now";
    if (minutes === 1)
        return "1 minute ago";
    if (minutes < 60)
        return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1)
        return "1 hour ago";
    if (hours < 24)
        return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return "1 day ago";
    return `${days} days ago`;
}
async function findLogFiles(directory, recursive) {
    const logFiles = [];
    const logExtensions = [".log", ".txt", ".out", ".err"];
    async function scan(dir) {
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && recursive) {
                    await scan(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (logExtensions.includes(ext)) {
                        logFiles.push(fullPath);
                    }
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
            if (outputChannel) {
                outputChannel.appendLine(`Warning: Could not read directory ${dir}`);
            }
        }
    }
    await scan(directory);
    return logFiles;
}
async function deactivate() {
    // Save cache before shutting down
    if (extensionContext && saveTimeout) {
        clearTimeout(saveTimeout);
        await saveCache(extensionContext);
        if (outputChannel) {
            outputChannel.appendLine("💾 Cache persisted on shutdown");
        }
    }
    // Cleanup case manager (DISABLED)
    // if (caseManager) {
    //   caseManager.dispose();
    // }
    // Stop LSP client
    await (0, lspClient_1.stopLSPClient)();
    if (outputChannel) {
        outputChannel.appendLine("");
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine(`❌ ${(0, buildInfo_1.getBuildInfo)()} deactivated`);
        outputChannel.appendLine(`   Time: ${new Date().toISOString()}`);
        outputChannel.appendLine("─".repeat(60));
        outputChannel.dispose();
    }
    fileLogger?.dispose();
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (patternStatusBarItem) {
        patternStatusBarItem.dispose();
    }
    resultsTreeProvider = undefined;
    categoriesTreeProvider = undefined;
    fileLogger = undefined;
    gutterDecorator = undefined;
    patternOverrideManager = undefined;
    patternOverrideTreeProvider = undefined;
    if (highlightTimeout) {
        clearTimeout(highlightTimeout);
        highlightTimeout = undefined;
    }
    highlightDecoration = undefined;
    splitViewProvider = undefined;
    timelineVisualization = undefined;
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map