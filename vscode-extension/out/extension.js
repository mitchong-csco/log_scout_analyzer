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
const patternOverrideManager_1 = require("./patternOverrideManager");
const patternOverrideUI_1 = require("./patternOverrideUI");
const patternOverrideTreeProvider_1 = require("./patternOverrideTreeProvider");
const patternOverrideCodeActions_1 = require("./patternOverrideCodeActions");
const bundleTreeProvider_1 = require("./bundleTreeProvider");
// Command modules
const debugCommands_1 = require("./commands/debugCommands");
const cacheCommands_1 = require("./commands/cacheCommands");
const bundleCommands_1 = require("./commands/bundleCommands");
const patternCommands_1 = require("./commands/patternCommands");
const resultsCommands_1 = require("./commands/resultsCommands");
const navigationCommands_1 = require("./commands/navigationCommands");
const utilityCommands_1 = require("./commands/utilityCommands");
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
let patternOverrideManager;
// Removed unused placeholder variables: _scoutInventorProvider, _caseManager, _casesTreeProvider
let highlightDecoration;
let highlightTimeout;
let splitViewProvider;
let timelineVisualization;
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
    // Register Pattern Overrides tree view (must be registered synchronously during activation)
    const patternOverridesTreeView = vscode.window.createTreeView("scoutPatternOverrides", {
        treeDataProvider: patternOverrideTreeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(patternOverridesTreeView);
    outputChannel.appendLine("✓ Pattern Overrides view initialized");
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
    // ============================================================
    // REGISTER COMMAND MODULES
    // ============================================================
    // Register all command modules after providers are initialized
    (0, debugCommands_1.registerDebugCommands)(context, outputChannel, fileLogger);
    (0, cacheCommands_1.registerCacheCommands)(context, analysisCache, cachedFilesTreeProvider, resultsTreeProvider, categoriesTreeProvider, fileLogger, outputChannel, allResults, updateStatusBar, updateCachedFilesView, debouncedSaveCache);
    (0, bundleCommands_1.registerBundleCommands)(context, outputChannel, bundleTreeProvider);
    (0, patternCommands_1.registerPatternCommands)(context, patternOverrideManager, patternOverrideTreeProvider, updatePatternStatusBar);
    (0, resultsCommands_1.registerResultsCommands)(context, resultsTreeProvider, categoriesTreeProvider, fileLogger, filterResultsByCategories);
    (0, navigationCommands_1.registerNavigationCommands)(context, outputChannel, highlightDecoration, highlightTimeout, isLogFile);
    (0, utilityCommands_1.registerUtilityCommands)(context, outputChannel);
    outputChannel.appendLine("✓ Command modules registered (49 commands)");
    // Shared function to analyze a document and update cache
    /**
     * Analyze document manually (for analyze command)
     * The unified diagnostic handler will pick up results automatically
     */
    // Update status bar based on active editor
    updateStatusBar();
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
    // ============================================================
    // REGISTER ALL COMMANDS
    // ============================================================
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
        // Step 1: Select file first
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
        // Step 2: Try to extract case ID from filename
        let extractedCaseId;
        // QCSONE format: 700440257_qcsone_download_selected.zip
        if (filename.includes("_qcsone_")) {
            const parts = filename.split("_");
            if (parts.length > 0 && /^\d+$/.test(parts[0])) {
                extractedCaseId = parts[0];
                outputChannel?.appendLine(`✓ Detected case ID from filename: ${extractedCaseId}`);
            }
        }
        // Step 3: Use extracted case ID or prompt if not found
        let caseId;
        if (extractedCaseId) {
            // Use extracted value directly, no prompt needed
            caseId = extractedCaseId;
            outputChannel?.appendLine(`✓ Using auto-detected case ID: ${caseId}`);
        }
        else {
            // No extraction successful, prompt user (required)
            caseId = await vscode.window.showInputBox({
                prompt: "Enter Case ID (required)",
                placeHolder: "e.g., 700356763",
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "Case ID is required";
                    }
                    if (!/^\d+$/.test(value.trim())) {
                        return "Case ID must contain only numbers";
                    }
                    return null;
                },
            });
            if (!caseId) {
                outputChannel?.appendLine("✗ Import cancelled: Case ID is required");
                return;
            }
        }
        // TODO: Add optional prompts for log product type and log service
        // TODO: Discussion needed on bundle service discovery mechanism
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
                    const result = await bundleTreeProvider.importPackage(packagePath, undefined, caseId.trim());
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
            const response = await client.sendRequest("workspace/executeCommand", {
                command: "scout/bundle/list",
                arguments: [{ logs: [filePath] }],
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
            await client.sendRequest("workspace/executeCommand", {
                command: "scout/bundle/addLog",
                arguments: [{ bundleId: selected.id, logPath: filePath }],
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
    // Open Bundle Case in QCSOne
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.openInQCSOne", async (bundleItem) => {
        if (!bundleItem || !vscode.workspace.workspaceFolders) {
            return;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleItem.bundleId}/bundle.json`;
        try {
            // Read bundle.json to get case URL
            const bundleUri = vscode.Uri.file(bundlePath);
            const bundleData = await vscode.workspace.fs.readFile(bundleUri);
            const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));
            const caseUrl = bundle.metadata?.case_url;
            if (caseUrl) {
                await vscode.env.openExternal(vscode.Uri.parse(caseUrl));
                outputChannel?.appendLine(`✓ Opened case in QCSOne: ${caseUrl}`);
            }
            else {
                vscode.window.showWarningMessage("No case URL available for this bundle");
                outputChannel?.appendLine("✗ No case URL found in bundle metadata");
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open case in QCSOne: ${error}`);
            outputChannel?.appendLine(`✗ Failed to open case URL: ${error}`);
        }
    }));
    // Import Log Archive Command
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.importArchive", async () => {
        if (!bundleTreeProvider) {
            vscode.window.showErrorMessage("Bundle tree provider not initialized");
            return;
        }
        // Step 1: Show file picker first
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                Archives: ["zip", "tar", "gz", "tgz"],
            },
            title: "Select Log Archive to Import",
        });
        if (!result || result.length === 0) {
            return;
        }
        const archivePath = result[0].fsPath;
        const filename = archivePath.split(/[\\/]/).pop() || archivePath;
        // Step 2: Try to extract case ID from filename
        let extractedCaseId;
        // QCSONE format: 700440257_qcsone_download_selected.zip
        if (filename.includes("_qcsone_")) {
            const parts = filename.split("_");
            if (parts.length > 0 && /^\d+$/.test(parts[0])) {
                extractedCaseId = parts[0];
                outputChannel?.appendLine(`✓ Detected case ID from filename: ${extractedCaseId}`);
            }
        }
        // Step 3: Use extracted case ID or prompt if not found
        let caseId;
        if (extractedCaseId) {
            // Use extracted value directly, no prompt needed
            caseId = extractedCaseId;
            outputChannel?.appendLine(`✓ Using auto-detected case ID: ${caseId}`);
        }
        else {
            // No extraction successful, prompt user (required)
            caseId = await vscode.window.showInputBox({
                prompt: "Enter Case ID (required)",
                placeHolder: "e.g., 700356763",
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return "Case ID is required";
                    }
                    if (!/^\d+$/.test(value.trim())) {
                        return "Case ID must contain only numbers";
                    }
                    return null;
                },
            });
            if (!caseId) {
                outputChannel?.appendLine("✗ Import cancelled: Case ID is required");
                return;
            }
        }
        outputChannel?.appendLine(`Importing archive: ${archivePath} (Case: ${caseId})`);
        // TODO: Add optional prompts for log product type and log service
        // TODO: Discussion needed on bundle service discovery mechanism
        try {
            await bundleTreeProvider.importPackage(archivePath, undefined, caseId.trim());
            outputChannel?.appendLine("✓ Import completed successfully");
        }
        catch (error) {
            outputChannel?.appendLine(`✗ Import failed: ${error}`);
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
    context.subscriptions.push(vscode.commands.registerCommand("logScoutAnalyzer.bundle.delete", async (item) => {
        // Extract bundleId from tree item (context menu passes the whole object)
        const bundleId = typeof item === 'string' ? item : item?.bundleId;
        if (!bundleId) {
            vscode.window.showErrorMessage("No bundle selected");
            return;
        }
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