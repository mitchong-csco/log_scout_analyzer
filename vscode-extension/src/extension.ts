import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { BUILD_INFO, getBuildInfo } from "./buildInfo";
import { ResultsTreeProvider, ResultItem } from "./resultsTreeProvider";
import { CategoriesTreeProvider } from "./categoriesTreeProvider";
import { TimelineTreeProvider } from "./timelineTreeProvider";
import { AnalyzerTreeProvider } from "./analyzerTreeProvider";
import { FilterTreeProvider } from "./filterTreeProvider";
import { FileLogger } from "./fileLogger";
import { GutterDecorator, AnnotatedLine } from "./gutterDecorator";
import { SplitViewProvider } from "./splitViewProvider";
import { TimeframeFilter } from "./analyzerTreeProvider";
import {
  TimelineVisualizationProvider,
  TimelineEvent,
} from "./timelineVisualization";
import { SipCallFlowParser } from "./sipCallFlowParser";
import {
  startLSPClient,
  stopLSPClient,
  getLSPClient,
  getLSPServerVersion,
  getLSPServerName,
  setLSPLogger,
} from "./lspClient";
import { PatternViewerPanel } from "./patternViewerPanel";
import { ScoutAnalyzerPanel } from "./scoutAnalyzerPanel";
import { AnnotationDashboardPanel } from "./annotationDashboardPanel";
import { ScenarioManager } from "./scenarioManager";
import { PatternOverrideManager } from "./patternOverrideManager";
import { ScoutInventorProvider } from "./scoutInventorProvider";
import { AnnotationRenderer } from "./annotationRenderer";
import { CachedFilesTreeProvider, CachedFile } from "./cachedFilesTreeProvider";
import { CaseManager } from "./caseManager";
import { CasesTreeProvider } from "./casesTreeProvider";

let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let resultsTreeProvider: ResultsTreeProvider | undefined;
let categoriesTreeProvider: CategoriesTreeProvider | undefined;
let timelineTreeProvider: TimelineTreeProvider | undefined;
let cachedFilesTreeProvider: CachedFilesTreeProvider | undefined;
let analyzerTreeProvider: AnalyzerTreeProvider | undefined;
let filterTreeProvider: FilterTreeProvider | undefined;
let fileLogger: FileLogger | undefined;
let gutterDecorator: GutterDecorator | undefined;
let annotationRenderer: AnnotationRenderer | undefined;
let scenarioManager: ScenarioManager | undefined;
let patternOverrideManager: PatternOverrideManager | undefined;
let scoutInventorProvider: ScoutInventorProvider | undefined;
let highlightDecoration: vscode.TextEditorDecorationType | undefined;
let highlightTimeout: NodeJS.Timeout | undefined;
let splitViewProvider: SplitViewProvider | undefined;
let timelineVisualization: TimelineVisualizationProvider | undefined;
let caseManager: CaseManager | undefined;
let casesTreeProvider: CasesTreeProvider | undefined;

// Store all results from last analysis for category filtering
let allResults: ResultItem[] = [];

// Analysis cache: stores results per file URI
const analysisCache = new Map<
  string,
  {
    results: ResultItem[];
    timestamp: Date;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
  }
>();

// Constants for cache management
const MAX_CACHE_ENTRIES = 50;
const CACHE_MAX_AGE_DAYS = 7;
const CACHE_STORAGE_KEY = "logScoutAnalyzer.persistedCache";
let saveTimeout: NodeJS.Timeout | undefined;
let extensionContext: vscode.ExtensionContext | undefined;

// Serialization types
interface SerializedCacheEntry {
  results: ResultItem[];
  timestamp: string;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
}

type SerializedCache = Record<string, SerializedCacheEntry>;

// Load persisted cache from storage
async function loadPersistedCache(
  context: vscode.ExtensionContext,
): Promise<void> {
  try {
    const cached = context.globalState.get<SerializedCache>(CACHE_STORAGE_KEY);
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
      } catch (err) {
        // File doesn't exist or can't be accessed, skip
      }
    }

    if (outputChannel && loadedCount > 0) {
      outputChannel.appendLine(
        `📦 Restored ${loadedCount} cached file${loadedCount !== 1 ? "s" : ""} from storage`,
      );
      if (expiredCount > 0) {
        outputChannel.appendLine(
          `   Skipped ${expiredCount} expired entr${expiredCount !== 1 ? "ies" : "y"}`,
        );
      }
    }

    // Update UI if cache was restored
    if (loadedCount > 0) {
      updateCachedFilesView();
    }
  } catch (error) {
    if (outputChannel) {
      outputChannel.appendLine(`⚠ Failed to load cache: ${error}`);
    }
  }
}

// Save cache to storage (debounced)
function debouncedSaveCache(context: vscode.ExtensionContext): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    await saveCache(context);
  }, 2000); // Wait 2s after last change
}

// Immediate save to storage
async function saveCache(context: vscode.ExtensionContext): Promise<void> {
  try {
    // Prune old entries before saving
    pruneCache();

    const serialized: SerializedCache = {};
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
  } catch (error) {
    if (outputChannel) {
      outputChannel.appendLine(`⚠ Failed to save cache: ${error}`);
    }
  }
}

// Prune cache to keep under size limit
function pruneCache(): void {
  if (analysisCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  // Sort by timestamp (newest first), keep only MAX_CACHE_ENTRIES
  const sorted = Array.from(analysisCache.entries()).sort(
    (a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime(),
  );

  analysisCache.clear();
  sorted.slice(0, MAX_CACHE_ENTRIES).forEach(([uri, entry]) => {
    analysisCache.set(uri, entry);
  });

  if (outputChannel) {
    const pruned = sorted.length - MAX_CACHE_ENTRIES;
    if (pruned > 0) {
      outputChannel.appendLine(
        `🧹 Pruned ${pruned} old cache entr${pruned !== 1 ? "ies" : "y"}`,
      );
    }
  }
}

// Check if cached results can be used for a file
async function shouldUseCachedResults(
  uri: vscode.Uri,
  cachedEntry: any,
): Promise<boolean> {
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
  } catch {
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
function handleDiagnosticsChange(
  uri: vscode.Uri,
  diagnostics: readonly vscode.Diagnostic[],
): void {
  const fileName = uri.fsPath.split(/[\\\/]/).pop();
  if (outputChannel) {
    outputChannel.appendLine(
      `[${new Date().toISOString()}] 📊 handleDiagnosticsChange()`,
    );
    outputChannel.appendLine(`   → File: ${fileName}`);
    outputChannel.appendLine(`   → Diagnostics: ${diagnostics.length}`);
  }

  // Get document from workspace
  const document = vscode.workspace.textDocuments.find(
    (doc) => doc.uri.toString() === uri.toString(),
  );
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
  const isActiveEditor =
    editor && editor.document.uri.toString() === uri.toString();

  // Convert diagnostics to ResultItems
  const results: ResultItem[] = diagnostics.map((diag) => {
    const severity =
      diag.severity === vscode.DiagnosticSeverity.Error
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
    let category: string | undefined = undefined;
    let patternId: string | undefined = undefined;
    let patternName: string | undefined = undefined;
    const diagWithData = diag as any;

    if (
      diagWithData.data &&
      typeof diagWithData.data === "object" &&
      "category" in diagWithData.data
    ) {
      category = diagWithData.data.category;
    }
    if (!category) {
      category = extractCategory(line.text);
    }

    if (
      diagWithData.data &&
      typeof diagWithData.data === "object" &&
      "patternName" in diagWithData.data
    ) {
      patternName = diagWithData.data.patternName;
    }

    if (diag.code && typeof diag.code === "string") {
      patternId = diag.code;
    }

    // Extract matched text - prefer from LSP data, fallback to range extraction
    let matchedText: string;
    if (
      diagWithData.data &&
      typeof diagWithData.data === "object" &&
      "matchedText" in diagWithData.data &&
      typeof diagWithData.data.matchedText === "string"
    ) {
      matchedText = diagWithData.data.matchedText;
    } else {
      // Fallback: extract from line using range
      matchedText =
        line.text
          .substring(
            diag.range.start.character,
            Math.min(
              diag.range.end.character,
              diag.range.start.character + 100,
            ),
          )
          .trim() || line.text.trim();
    }

    // Extract new structured fields from LSP (snake_case standard)
    const template = diagWithData.data?.template as string | undefined;
    const merged_template = diagWithData.data?.merged_template as
      | string
      | undefined;
    const pattern_regex = diagWithData.data?.pattern_regex as
      | string
      | undefined;

    // Extract ALL diagnostic data (includes all TagScout annotation fields)
    const allDiagnosticData = diagWithData.data
      ? { ...diagWithData.data }
      : undefined;

    // Debug logging
    if (outputChannel) {
      outputChannel.appendLine(
        `[DEBUG] Diagnostic data keys: ${diagWithData.data ? Object.keys(diagWithData.data).join(", ") : "none"}`,
      );
      outputChannel.appendLine(`[DEBUG] Raw diagnostic data:`);
      outputChannel.appendLine(`  template: ${diagWithData.data?.template}`);
      outputChannel.appendLine(
        `  merged_template: ${diagWithData.data?.merged_template}`,
      );
      outputChannel.appendLine(
        `  matched_text: ${diagWithData.data?.matched_text}`,
      );
      outputChannel.appendLine(`  log_line: ${diagWithData.data?.log_line}`);
      if (merged_template) {
        outputChannel.appendLine(
          `[DEBUG] Final merged_template value: ${merged_template}`,
        );
      } else {
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
      extracted_parameters: diagWithData.data?.extracted_parameters as
        | Array<{ name: string; value: string }>
        | undefined,
      pattern_regex: pattern_regex,
      log_line: diagWithData.data?.log_line as string | undefined,
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
    outputChannel.appendLine(
      `   ✓ Cached: ${errorCount}E ${warningCount}W ${infoCount}I ${debugCount}D`,
    );
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
  timelineTreeProvider?.setResults(results);

  if (outputChannel) {
    outputChannel.appendLine(
      `   ✓ Updated Results/Filters/Categories/Timeline views`,
    );
  }

  // Update gutter decorations only for the active editor
  if (isActiveEditor && editor && gutterDecorator) {
    const fileName = editor.document.uri.fsPath.split(/[\\\/]/).pop();
    const annotations: AnnotatedLine[] = results.map((r) => ({
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
      outputChannel.appendLine(
        `   ✓ Updated gutter decorations (active editor)`,
      );
    }
  } else if (outputChannel) {
    outputChannel.appendLine(
      `   ℹ️ Skipped gutter decorations (not active editor)`,
    );
  }

  // Always update cached files view
  updateCachedFilesView();
  updateStatusBar();

  if (outputChannel) {
    outputChannel.appendLine(`   ✓ Updated CachedFiles view and status bar`);
  }
}

export function activate(context: vscode.ExtensionContext) {
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
  outputChannel.appendLine(`📦 Version: ${BUILD_INFO.version}`);
  outputChannel.appendLine(`🔨 Build: ${BUILD_INFO.buildTimestamp}`);
  outputChannel.appendLine(`🔢 Build #: ${BUILD_INFO.buildNumber}`);
  outputChannel.appendLine(`🔗 Git: ${BUILD_INFO.gitCommit}`);
  outputChannel.appendLine(`⏰ Loaded: ${activationTime}`);
  outputChannel.appendLine("");

  console.log(`${getBuildInfo()} activated at ${activationTime}`);

  // Load persisted cache early (async, non-blocking)
  loadPersistedCache(context).catch((error) => {
    if (outputChannel) {
      outputChannel.appendLine(`⚠ Cache load failed: ${error.message}`);
    }
  });

  // Initialize File Logger first (needed by LSP client)
  fileLogger = new FileLogger(context);
  context.subscriptions.push({
    dispose: () => fileLogger?.dispose(),
  });
  fileLogger.log("Log Scout Analyzer initialized");
  fileLogger.log(`Build: ${BUILD_INFO.version} (${BUILD_INFO.buildTimestamp})`);

  // Connect file logger to LSP client
  setLSPLogger(fileLogger);

  // Initialize LSP client early (handles TagScout MongoDB patterns)
  const logChannel = outputChannel; // Capture for async callback
  startLSPClient(context, outputChannel)
    .then((lspClient) => {
      if (lspClient) {
        const lspVersion = getLSPServerVersion();
        const lspName = getLSPServerName();
        logChannel.appendLine("✓ LSP client connected");
        if (lspVersion) {
          logChannel.appendLine(
            `🔧 LSP Server: ${lspName || "Log Scout LSP"} v${lspVersion}`,
          );
        }
        logChannel.appendLine("✓ TagScout pattern engine ready");
      } else {
        logChannel.appendLine(
          "⚠ LSP client failed to start - using fallback patterns",
        );
      }
    })
    .catch((error) => {
      logChannel.appendLine(`⚠ LSP client error: ${error.message}`);
      logChannel.appendLine("⚠ Using fallback patterns");
    });

  // Initialize Scenario Manager
  scenarioManager = new ScenarioManager(context);
  outputChannel.appendLine("✓ Scenario Manager initialized");
  fileLogger.log("Scenario Manager ready");

  // Initialize Pattern Override Manager
  patternOverrideManager = new PatternOverrideManager(context);
  const patternStats = patternOverrideManager.getStats();
  outputChannel.appendLine(
    `✓ Pattern Override Manager initialized (${patternStats.totalOverrides} overrides, ${patternStats.totalCustom} custom)`,
  );
  fileLogger.log(
    `Pattern Override Manager ready - ${patternStats.totalOverrides} overrides, ${patternStats.totalCustom} custom patterns`,
  );

  // Register document link provider for console output (makes file paths clickable)
  // Note: VS Code doesn't support document links in output channels by default,
  // but we format output to be compatible with terminal link detection
  outputChannel.appendLine(
    "💡 Console output includes clickable file:line links",
  );
  outputChannel.appendLine("");

  // LSP server handles all pattern matching and diagnostics
  outputChannel.appendLine("✓ Using LSP server for pattern matching");
  outputChannel.appendLine("✓ Ready to analyze log files");
  outputChannel.appendLine("");
  fileLogger.log("LSP-based pattern engine initialized");

  // Initialize Tree Providers
  resultsTreeProvider = new ResultsTreeProvider();
  categoriesTreeProvider = new CategoriesTreeProvider();
  timelineTreeProvider = new TimelineTreeProvider();
  cachedFilesTreeProvider = new CachedFilesTreeProvider();
  analyzerTreeProvider = new AnalyzerTreeProvider();
  scoutInventorProvider = new ScoutInventorProvider();

  // Initialize Filter Tree Provider (consolidates categories, files, time filters)
  filterTreeProvider = new FilterTreeProvider();
  // When filters change, update Results tree with filtered results
  filterTreeProvider.setFilterChangeCallback((filteredResults) => {
    resultsTreeProvider?.setResults(filteredResults);
  });

  // Initialize Gutter Decorator for annotations
  gutterDecorator = new GutterDecorator();
  context.subscriptions.push(gutterDecorator);

  outputChannel.appendLine("✓ Gutter Decorator initialized");

  // Initialize Annotation Renderer (combines gutter glyphs + log level highlights)
  annotationRenderer = new AnnotationRenderer();
  context.subscriptions.push({
    dispose: () => annotationRenderer?.dispose(),
  });

  outputChannel.appendLine(
    "✓ Annotation Renderer initialized (glyphs + highlights)",
  );

  // Initialize Split View Provider
  splitViewProvider = SplitViewProvider.getInstance();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      "scout-annotated",
      splitViewProvider,
    ),
  );

  // Initialize Timeline Visualization Provider
  timelineVisualization = new TimelineVisualizationProvider(context);
  context.subscriptions.push(timelineVisualization);

  // Initialize highlight decoration for clicked lines
  highlightDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor(
      "editor.findMatchHighlightBackground",
    ),
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

  const timelineTreeView = vscode.window.createTreeView("scoutTimeline", {
    treeDataProvider: timelineTreeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(timelineTreeView);

  const cachedFilesTreeView = vscode.window.createTreeView("scoutCachedFiles", {
    treeDataProvider: cachedFilesTreeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(cachedFilesTreeView);

  const filterTreeView = vscode.window.createTreeView("scoutFilters", {
    treeDataProvider: filterTreeProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(filterTreeView);

  const scoutInventorTreeView = vscode.window.createTreeView("scoutInventor", {
    treeDataProvider: scoutInventorProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(scoutInventorTreeView);
  outputChannel.appendLine("✓ Scout Inventor view initialized");

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
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = "logScoutAnalyzer.openScoutView";
  statusBarItem.tooltip = "Click to open Scout Analyzer";
  context.subscriptions.push(statusBarItem);

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
  async function analyzeDocument(
    document: vscode.TextDocument,
    showUI: boolean = true,
  ): Promise<void> {
    if (!outputChannel) return;

    const uriString = document.uri.toString();
    const cachedEntry = analysisCache.get(uriString);

    // Check if we can use cached results
    if (
      cachedEntry &&
      (await shouldUseCachedResults(document.uri, cachedEntry))
    ) {
      const fileName = path.basename(document.uri.fsPath);
      if (showUI && outputChannel) {
        outputChannel.appendLine(
          `📦 Using cached results for ${fileName} (analyzed ${cachedEntry.timestamp.toLocaleString()})`,
        );
      }

      // Apply cached results to active editor UI
      const editor = vscode.window.activeTextEditor;
      const isActiveEditor =
        editor && editor.document.uri.toString() === document.uri.toString();

      if (isActiveEditor) {
        allResults = cachedEntry.results;
        resultsTreeProvider?.setResults(cachedEntry.results);
        categoriesTreeProvider?.setResults(cachedEntry.results);
        timelineTreeProvider?.setResults(cachedEntry.results);
        updateCachedFilesView();
        updateStatusBar();

        fileLogger?.logCacheOperation(
          `Loaded cached analysis for ${fileName} (${cachedEntry.errorCount}E ${cachedEntry.warningCount}W ${cachedEntry.infoCount}I ${cachedEntry.debugCount}D)`,
        );
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
  const dumpDiagnosticsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.dumpDiagnostics",
    async () => {
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
        outputChannel!.appendLine(`--- Diagnostic #${index + 1} ---`);
        outputChannel!.appendLine(`Message: ${diag.message}`);
        outputChannel!.appendLine(`Severity: ${diag.severity}`);
        outputChannel!.appendLine(`Code: ${diag.code}`);
        outputChannel!.appendLine(
          `Range: Line ${diag.range.start.line}, Col ${diag.range.start.character} -> Line ${diag.range.end.line}, Col ${diag.range.end.character}`,
        );
        outputChannel!.appendLine(`Source: ${diag.source}`);

        const diagWithData = diag as any;
        if (diagWithData.data) {
          outputChannel!.appendLine(
            `Data keys: ${Object.keys(diagWithData.data).join(", ")}`,
          );
          outputChannel!.appendLine("");
          outputChannel!.appendLine("Data contents:");
          outputChannel!.appendLine(
            `  template: ${diagWithData.data.template || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  merged_template: ${diagWithData.data.merged_template || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  matched_text: ${diagWithData.data.matched_text || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  log_line: ${diagWithData.data.log_line || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  pattern_id: ${diagWithData.data.pattern_id || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  pattern_name: ${diagWithData.data.pattern_name || "(not set)"}`,
          );
          outputChannel!.appendLine(
            `  category: ${diagWithData.data.category || "(not set)"}`,
          );

          if (diagWithData.data.extracted_parameters) {
            outputChannel!.appendLine(
              `  extracted_parameters: ${diagWithData.data.extracted_parameters.length} items`,
            );
            diagWithData.data.extracted_parameters.forEach((param: any) => {
              outputChannel!.appendLine(`    - ${param.name}: ${param.value}`);
            });
          } else {
            outputChannel!.appendLine(`  extracted_parameters: (not set)`);
          }

          outputChannel!.appendLine("");
          outputChannel!.appendLine("Full data object:");
          outputChannel!.appendLine(JSON.stringify(diagWithData.data, null, 2));
        } else {
          outputChannel!.appendLine("No data attached to diagnostic");
        }
        outputChannel!.appendLine("");
      });

      outputChannel.appendLine("=".repeat(80));
      outputChannel.appendLine("END DIAGNOSTIC DATA DUMP");
      outputChannel.appendLine("=".repeat(80));
    },
  );

  context.subscriptions.push(dumpDiagnosticsCommand);

  // Register commands
  const analyzeCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.analyzeFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && outputChannel) {
        await analyzeDocument(editor.document, true);

        // Update status bar
        updateStatusBar();
      } else {
        vscode.window.showWarningMessage(
          "No active editor or diagnostics provider not initialized",
        );
      }
    },
  );

  const clearCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.clearDiagnostics",
    () => {
      // Clear tree views (LSP manages diagnostics)
      resultsTreeProvider?.clear();
      categoriesTreeProvider?.clear();
      timelineTreeProvider?.clear();

      // Clear gutter decorations
      if (gutterDecorator) {
        gutterDecorator.clearAll();
      }

      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] Diagnostics cleared`,
        );
      }
      fileLogger?.log("Diagnostics cleared");

      vscode.window.showInformationMessage("Diagnostics cleared!");
      updateStatusBar();
    },
  );

  // Alias for clearDiagnostics (used by tree view)
  const clearResultsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.clearResults",
    () => {
      // Clear tree views (LSP manages diagnostics)
      resultsTreeProvider?.clear();
      categoriesTreeProvider?.clear();
      timelineTreeProvider?.clear();

      // Clear analysis cache
      analysisCache.clear();
      cachedFilesTreeProvider?.clear();

      // Clear gutter decorations
      if (gutterDecorator) {
        gutterDecorator.clearAll();
      }

      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] Results cleared`,
        );
      }
      fileLogger?.log("Results cleared");

      vscode.window.showInformationMessage("Results cleared!");
      updateStatusBar();
    },
  );

  const clearCacheCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.clearCache",
    async () => {
      const cacheSize = analysisCache.size;
      analysisCache.clear();
      cachedFilesTreeProvider?.clear();

      // Clear persisted cache from storage
      if (extensionContext) {
        await extensionContext.globalState.update(CACHE_STORAGE_KEY, undefined);
      }

      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] ♻️ Cache cleared (${cacheSize} files, including persisted storage)`,
        );
      }

      vscode.window.showInformationMessage(
        `Analysis cache cleared! (${cacheSize} cached files removed)`,
      );
      updateStatusBar();
    },
  );

  const removeCachedFileCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.removeCachedFile",
    (item: any) => {
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

      vscode.window.showInformationMessage(
        `Removed ${path.basename(cachedFile.uri.fsPath)} from cache`,
      );
    },
  );

  const openCachedFileCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openCachedFile",
    async (item: any) => {
      // Handle both CachedFile and CachedFileItem
      const cachedFile = item?.cachedFile || item;
      if (!cachedFile || !cachedFile.uri) {
        return;
      }

      const uriString = cachedFile.uri.toString();
      const cachedEntry = analysisCache.get(uriString);

      if (!cachedEntry) {
        vscode.window.showWarningMessage(
          `No cached results found for ${path.basename(cachedFile.uri.fsPath)}`,
        );
        return;
      }

      try {
        // Check if file exists
        await vscode.workspace.fs.stat(cachedFile.uri);

        // Check if document is already open
        const openDoc = vscode.workspace.textDocuments.find(
          (doc) => doc.uri.toString() === cachedFile.uri.toString(),
        );

        let doc: vscode.TextDocument;
        if (openDoc) {
          // Document already open, just show it
          await vscode.window.showTextDocument(openDoc, {
            preview: false,
            preserveFocus: false,
          });
          doc = openDoc;
        } else {
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
        timelineTreeProvider?.setResults(updatedResults);
        updateStatusBar();

        // Update cache with corrected URIs
        analysisCache.set(doc.uri.toString(), {
          ...cachedEntry,
          results: updatedResults,
        });

        // Log cache load
        fileLogger?.logCacheOperation(
          `Opened cached file ${path.basename(cachedFile.uri.fsPath)} (${cachedEntry.errorCount}E ${cachedEntry.warningCount}W ${cachedEntry.infoCount}I ${cachedEntry.debugCount}D)`,
        );

        if (outputChannel) {
          outputChannel.appendLine(
            `📦 Loaded cached results for ${path.basename(cachedFile.uri.fsPath)} - ${cachedEntry.results.length} issues`,
          );
        }
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`,
        );
      }
    },
  );

  // Open File in Editor (without loading cached results)
  const openFileInEditorCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openFileInEditor",
    async (item: any) => {
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
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`,
        );
      }
    },
  );

  // Reveal in Explorer command
  const revealInExplorerCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.revealInExplorer",
    async (item: any) => {
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
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to reveal file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`,
        );
      }
    },
  );

  // View Cache Metadata command
  const viewCacheMetadataCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.viewCacheMetadata",
    async () => {
      try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showWarningMessage("No workspace folder open");
          return;
        }

        // Look for .tagscout_cache directory in workspace root
        const cacheDir = vscode.Uri.joinPath(
          workspaceFolders[0].uri,
          ".tagscout_cache",
        );
        const cacheFile = vscode.Uri.joinPath(
          cacheDir,
          "tagscout_patterns.json",
        );

        try {
          await vscode.workspace.fs.stat(cacheFile);
          const doc = await vscode.workspace.openTextDocument(cacheFile);
          await vscode.window.showTextDocument(doc, { preview: false });

          if (outputChannel) {
            outputChannel.appendLine(
              `📄 Opened cache metadata: ${cacheFile.fsPath}`,
            );
          }
        } catch (statErr) {
          vscode.window.showWarningMessage(
            "Cache metadata file not found. Try analyzing a file first to create the cache.",
          );
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `Failed to open cache metadata: ${err.message}`,
        );
      }
    },
  );

  const showCacheStatsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showCacheStats",
    () => {
      if (analysisCache.size === 0) {
        vscode.window.showInformationMessage("No cached analysis results");
        return;
      }

      const stats: string[] = [];
      stats.push(`📊 Analysis Cache Statistics`);
      stats.push(`Total cached files: ${analysisCache.size}`);
      stats.push(``);

      let totalIssues = 0;
      analysisCache.forEach((cache, uri) => {
        const fileName = uri.split("/").pop() || uri;
        const total = cache.errorCount + cache.warningCount + cache.infoCount;
        totalIssues += total;
        stats.push(
          `📄 ${fileName} (${formatTimeSince(cache.timestamp)})\\n` +
            `   🔴 ${cache.errorCount} 🟡 ${cache.warningCount} 🔵 ${cache.infoCount}`,
        );
      });

      stats.push(``);
      stats.push(`Total issues across all files: ${totalIssues}`);

      const message = stats.join("\\n");
      vscode.window.showInformationMessage(message, { modal: false });

      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] Cache Statistics:`,
        );
        stats.forEach((line) => {
          if (outputChannel) {
            outputChannel.appendLine(line);
          }
        });
      }
    },
  );

  const showPatternsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showPatterns",
    async () => {
      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] Fetching patterns from LSP server...`,
        );
      }

      try {
        const lspClient = getLSPClient();
        if (!lspClient) {
          vscode.window.showWarningMessage(
            "LSP client not connected. Cannot fetch patterns.",
          );
          return;
        }

        // Call LSP server command to get patterns using executeCommand
        const result: any = await lspClient.sendRequest(
          "workspace/executeCommand",
          {
            command: "logScout.getPatterns",
            arguments: [],
          },
        );

        if (result && result.patterns) {
          // Show in panel
          PatternViewerPanel.createOrShow(context.extensionUri, result);

          if (outputChannel) {
            outputChannel.appendLine(
              `✓ Loaded ${result.count} patterns from ${result.source}`,
            );
          }
        } else {
          vscode.window.showWarningMessage("No patterns available");
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to fetch patterns: ${error.message}`,
        );
        if (outputChannel) {
          outputChannel.appendLine(
            `✗ Error fetching patterns: ${error.message}`,
          );
        }
      }
    },
  );

  // About command - shows version info in notification
  const showAboutCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showAbout",
    () => {
      const lspVersion = getLSPServerVersion();
      const lspName = getLSPServerName();

      if (outputChannel) {
        outputChannel.show();
        outputChannel.appendLine("");
        outputChannel.appendLine("╔════════════════════════════════════════╗");
        outputChannel.appendLine("║         ABOUT LOG SCOUT               ║");
        outputChannel.appendLine("╚════════════════════════════════════════╝");
        outputChannel.appendLine("");
        outputChannel.appendLine(`📦 Extension: Log Scout Analyzer`);
        outputChannel.appendLine(
          `🏷️  Extension Version: ${BUILD_INFO.version}`,
        );
        outputChannel.appendLine(`🔨 Build Time: ${BUILD_INFO.buildTimestamp}`);
        outputChannel.appendLine(`🔢 Build Number: ${BUILD_INFO.buildNumber}`);
        outputChannel.appendLine(`🔗 Git Commit: ${BUILD_INFO.gitCommit}`);
        outputChannel.appendLine("");

        if (lspVersion) {
          outputChannel.appendLine(
            `🔧 LSP Server: ${lspName || "Log Scout LSP"}`,
          );
          outputChannel.appendLine(`🏷️  LSP Version: ${lspVersion}`);
        } else {
          outputChannel.appendLine(`🔧 LSP Server: Not connected`);
        }

        outputChannel.appendLine("");
        outputChannel.appendLine(`⏰ Activated: ${new Date().toISOString()}`);
        outputChannel.appendLine(
          `🎯 Patterns: ${lspVersion ? "Managed by LSP server" : "Not available"}`,
        );
        outputChannel.appendLine("");
      }

      const aboutMsg = lspVersion
        ? `Log Scout Analyzer v${BUILD_INFO.version}\n\nLSP Server: ${lspName || "LSP"} v${lspVersion}\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}`
        : `Log Scout Analyzer v${BUILD_INFO.version}\n\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}\nLSP: Not connected`;

      vscode.window
        .showInformationMessage(aboutMsg, "View Logs", "Copy Info")
        .then((selection) => {
          if (selection === "View Logs") {
            vscode.commands.executeCommand("logScoutAnalyzer.showLogPaths");
          } else if (selection === "Copy Info") {
            vscode.env.clipboard.writeText(aboutMsg);
            vscode.window.showInformationMessage(
              "Version info copied to clipboard",
            );
          }
        });
    },
  );

  // Open extension log file command
  const openExtensionLogCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openExtensionLog",
    async () => {
      if (!fileLogger) {
        vscode.window.showWarningMessage("File logger not initialized");
        return;
      }

      const logPath = fileLogger.getLogPath();
      try {
        const doc = await vscode.workspace.openTextDocument(logPath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(
          `Opened extension log: ${logPath}`,
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to open extension log: ${error.message}`,
        );
      }
    },
  );

  // Open LSP server log file command
  const openLSPLogCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openLSPLog",
    async () => {
      if (!fileLogger) {
        vscode.window.showWarningMessage("File logger not initialized");
        return;
      }

      const logPath = fileLogger.getLSPLogPath();
      try {
        const doc = await vscode.workspace.openTextDocument(logPath);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.window.showInformationMessage(`Opened LSP log: ${logPath}`);
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to open LSP log: ${error.message}`,
        );
      }
    },
  );

  // Show log paths command
  const showLogPathsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showLogPaths",
    () => {
      if (!fileLogger) {
        vscode.window.showWarningMessage("File logger not initialized");
        return;
      }

      const extensionLog = fileLogger.getLogPath();
      const lspLog = fileLogger.getLSPLogPath();

      const message = `Extension Log: ${extensionLog}\n\nLSP Server Log: ${lspLog}`;

      vscode.window
        .showInformationMessage(
          "Log Files",
          { modal: true, detail: message },
          "Open Extension Log",
          "Open LSP Log",
          "Copy Paths",
        )
        .then((selection) => {
          if (selection === "Open Extension Log") {
            vscode.commands.executeCommand("logScoutAnalyzer.openExtensionLog");
          } else if (selection === "Open LSP Log") {
            vscode.commands.executeCommand("logScoutAnalyzer.openLSPLog");
          } else if (selection === "Copy Paths") {
            vscode.env.clipboard.writeText(
              `Extension Log:\n${extensionLog}\n\nLSP Server Log:\n${lspLog}`,
            );
            vscode.window.showInformationMessage(
              "Log paths copied to clipboard",
            );
          }
        });
    },
  );

  // Jump to line command
  const jumpToLineCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.jumpToLine",
    (uri: vscode.Uri, line: number, column: number) => {
      // Preserve focus on active editor column
      const activeColumn =
        vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

      vscode.window
        .showTextDocument(uri, {
          viewColumn: activeColumn,
          preserveFocus: false,
          preview: false,
        })
        .then((editor) => {
          const position = new vscode.Position(line, column);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport,
          );

          // Highlight the line temporarily
          if (highlightDecoration) {
            const lineRange = editor.document.lineAt(line).range;
            editor.setDecorations(highlightDecoration, [lineRange]);

            // Clear previous timeout if exists
            if (highlightTimeout) {
              clearTimeout(highlightTimeout);
            }

            // Get highlight duration from config
            const config =
              vscode.workspace.getConfiguration("logScoutAnalyzer");
            const duration = config.get<number>("highlightDuration", 2000);

            // Clear highlight after configured duration
            highlightTimeout = setTimeout(() => {
              if (
                highlightDecoration &&
                editor === vscode.window.activeTextEditor
              ) {
                editor.setDecorations(highlightDecoration, []);
              }
            }, duration);
          }
        });
    },
  );

  // Open Split View command
  const openSplitViewCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openSplitView",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isLogFile(editor.document)) {
        vscode.window.showWarningMessage(
          "Please open a log file to view split view",
        );
        return;
      }

      const results = resultsTreeProvider?.getResults() || [];

      if (results.length === 0) {
        vscode.window.showWarningMessage(
          "No analysis results. Run analysis first.",
        );
        return;
      }

      // Convert results to annotations
      const fileName = editor.document.uri.fsPath.split(/[\\\\/]/).pop();
      const annotations: AnnotatedLine[] = results.map((r) => ({
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
      vscode.window.showInformationMessage(
        "Split view opened! Use settings to configure sync features.",
      );
    },
  );

  // Close Split View command
  const closeSplitViewCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.closeSplitView",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const uri = editor.document.uri.toString();
      splitViewProvider?.closeSplitView(uri);
      vscode.window.showInformationMessage("Split view closed");
    },
  );

  // Refresh results command
  const refreshResultsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.refreshResults",
    () => {
      resultsTreeProvider?.refresh();
      categoriesTreeProvider?.refresh();
      timelineTreeProvider?.refresh();
      vscode.window.showInformationMessage("Results refreshed!");
    },
  );

  // Show output channel command (replaces show console)
  const showConsoleCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showConsole",
    () => {
      if (outputChannel) {
        outputChannel.show();
        vscode.window.showInformationMessage(
          "Scout Output Channel opened (for debugging).",
        );
      }
    },
  );

  // Clear console command (deprecated - does nothing now)
  const clearConsoleCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.clearConsole",
    () => {
      vscode.window.showInformationMessage(
        "Console output removed - check file logs instead",
      );
    },
  );

  // Group by commands
  const groupBySeverityCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.groupBySeverity",
    () => {
      resultsTreeProvider?.setGroupBy("severity");
      vscode.window.showInformationMessage("Grouped by severity");
    },
  );

  const groupByCategoryCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.groupByCategory",
    () => {
      resultsTreeProvider?.setGroupBy("category");
      vscode.window.showInformationMessage("Grouped by category");
    },
  );

  const groupByFileCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.groupByFile",
    () => {
      resultsTreeProvider?.setGroupBy("file");
      vscode.window.showInformationMessage("Grouped by file");
    },
  );

  // Reset view command
  const resetViewCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.resetView",
    () => {
      resultsTreeProvider?.resetGrouping();
      vscode.window.showInformationMessage(
        "View reset to default (by severity)",
      );
    },
  );

  // Sort Commands
  const sortByLineCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.sortByLine",
    () => {
      resultsTreeProvider?.setSortBy("line");
    },
  );

  const sortBySeverityCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.sortBySeverity",
    () => {
      resultsTreeProvider?.setSortBy("severity");
    },
  );

  const sortByTimeCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.sortByTime",
    () => {
      resultsTreeProvider?.setSortBy("time");
    },
  );

  const sortByFileCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.sortByFile",
    () => {
      resultsTreeProvider?.setSortBy("file");
    },
  );

  const sortByCategoryCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.sortByCategory",
    () => {
      resultsTreeProvider?.setSortBy("category");
    },
  );

  // Export results command
  const exportResultsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.exportResults",
    () => {
      const results = resultsTreeProvider?.getResults() || [];
      if (results.length === 0) {
        vscode.window.showWarningMessage("No results to export");
        return;
      }

      const content = results
        .map(
          (r) =>
            `Line ${r.line + 1}: [${r.severity.toUpperCase()}] ${r.message}\n  ${r.matchedText}\n`,
        )
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
      vscode.window.showInformationMessage(
        `Exported ${results.length} results`,
      );
    },
  );

  // Analyze Directory command
  const analyzeDirectoryCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.analyzeDirectory",
    async () => {
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

      fileLogger?.log(
        `Opened ${opened} files in directory for analysis (caching via event handler)`,
      );
      vscode.window.showInformationMessage(
        `Opened ${opened} files. LSP analyzing and caching. Check Cached Files view.`,
      );
    },
  );

  // Analyze All Below command (recursive)
  const analyzeAllBelowCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.analyzeAllBelow",
    async () => {
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

      fileLogger?.log(
        `Opened ${opened} files recursively for analysis (caching via event handler)`,
      );
      vscode.window.showInformationMessage(
        `Opened ${opened} files. LSP analyzing and caching. Check Cached Files view.`,
      );
    },
  );

  // Open Scout Analyzer Panel command (deprecated but kept for backward compatibility)
  const openAnalyzerPanelCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openAnalyzerPanel",
    () => {
      vscode.window.showInformationMessage(
        "Analyzer controls are in the left sidebar. Click the Scout icon in the activity bar.",
      );
    },
  );

  // Open Scout View command (for status bar and other triggers)
  const openScoutViewCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openScoutView",
    async () => {
      // Focus the Scout Analyzer view in the activity bar
      await vscode.commands.executeCommand(
        "workbench.view.extension.scout-analyzer",
      );
      // If a log file is open, also focus the analyzer tab
      const editor = vscode.window.activeTextEditor;
      if (editor && isLogFile(editor.document)) {
        await vscode.commands.executeCommand("scoutAnalyzer.focus");
      }
    },
  );

  // Open Action Panel with Scenarios
  const openActionPanelCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openActionPanel",
    () => {
      if (scenarioManager && patternOverrideManager) {
        ScoutAnalyzerPanel.createOrShow(
          context.extensionUri,
          scenarioManager,
          patternOverrideManager,
        );
      }
    },
  );

  // Open Annotation Dashboard command
  const openAnnotationDashboardCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openAnnotationDashboard",
    () => {
      AnnotationDashboardPanel.createOrShow(context.extensionUri);
    },
  );

  // Toggle Console Location command (deprecated - does nothing now)
  const toggleConsoleLocationCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleConsoleLocation",
    () => {
      vscode.window.showInformationMessage(
        "Console UI removed - check file logs at: " + fileLogger?.getLogPath(),
      );
    },
  );

  // Set Timeframe Filter command
  const setTimeframeCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.setTimeframe",
    (timeframe: TimeframeFilter | null) => {
      analyzerTreeProvider?.setTimeframe(timeframe);

      // Apply filter to results
      if (timeframe && timeframe.days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - timeframe.days);

        // Filter results by timestamp
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const diagnostics = vscode.languages.getDiagnostics(
            editor.document.uri,
          );

          // Convert to ResultItem format and filter
          const allResults: ResultItem[] = diagnostics.map((diag) => {
            const severity =
              diag.severity === vscode.DiagnosticSeverity.Error
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

            const diagWithData = diag as any;
            let category =
              diagWithData.data?.category || extractCategory(line.text);

            // Extract pattern ID and name
            let patternId: string | undefined = undefined;
            let patternName: string | undefined = undefined;

            if (diag.code && typeof diag.code === "string") {
              patternId = diag.code;
            }

            if (
              diagWithData.data &&
              typeof diagWithData.data === "object" &&
              "patternName" in diagWithData.data
            ) {
              patternName = diagWithData.data.patternName;
            }

            return {
              severity,
              line: diag.range.start.line,
              column: diag.range.start.character,
              message: mainMessage, // Clean description with substituted values
              matchedText:
                line.text
                  .substring(
                    diag.range.start.character,
                    Math.min(
                      diag.range.end.character,
                      diag.range.start.character + 100,
                    ),
                  )
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
            if (!r.timestamp) return false;
            return r.timestamp >= cutoffDate;
          });

          // Update tree views with filtered results
          resultsTreeProvider?.setResults(filteredResults);
          categoriesTreeProvider?.setResults(filteredResults);
          timelineTreeProvider?.setResults(filteredResults);

          vscode.window.showInformationMessage(
            `Timeframe filter applied: ${timeframe.label} (${filteredResults.length} of ${allResults.length} results)`,
          );
        }
      } else {
        // Show all results - re-run analysis
        vscode.commands.executeCommand("logScoutAnalyzer.analyzeFile");
        vscode.window.showInformationMessage("Showing all results");
      }
    },
  );

  // Toggle Significant Events command
  const toggleSignificantEventsCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleSignificantEvents",
    () => {
      const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
      const currentValue = config.get<boolean>(
        "timeline.showSignificantEvents",
        true,
      );

      config
        .update(
          "timeline.showSignificantEvents",
          !currentValue,
          vscode.ConfigurationTarget.Global,
        )
        .then(() => {
          timelineTreeProvider?.setShowSignificantEvents(!currentValue);
          vscode.window.showInformationMessage(
            `Timeline now showing: ${!currentValue ? "Significant Events" : "All Issues"}`,
          );
        });
    },
  );

  // Toggle Timeframe command
  const toggleTimeframeCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleTimeframe",
    (timeframeKey: string) => {
      timelineTreeProvider?.toggleTimeframe(timeframeKey);
    },
  );

  // Toggle All Timeframes command
  const toggleAllTimeframesCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleAllTimeframes",
    (enable: boolean) => {
      timelineTreeProvider?.toggleAllTimeframes(enable);
    },
  );

  // Change Time Interval command
  const changeTimeIntervalCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.changeTimeInterval",
    async () => {
      const intervals = [
        { label: "5 minutes", value: 5 },
        { label: "15 minutes (default)", value: 15 },
        { label: "30 minutes", value: 30 },
        { label: "1 hour", value: 60 },
        { label: "2 hours", value: 120 },
        { label: "4 hours", value: 240 },
      ];

      const selected = await vscode.window.showQuickPick(intervals, {
        placeHolder: "Select time interval for timeline grouping",
      });

      if (selected) {
        timelineTreeProvider?.setTimeInterval(selected.value);
        vscode.window.showInformationMessage(
          `Timeline interval set to ${selected.label}`,
        );
      }
    },
  );

  // Show Timeline Visualization command
  const showTimelineVisualizationCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showTimelineVisualization",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }

      // Get results and convert to timeline events
      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
      const timelineEvents: TimelineEvent[] = [];

      diagnostics.forEach((diag) => {
        const line = editor.document.lineAt(diag.range.start.line);
        const timestamp = extractTimestamp(line.text);
        const category = extractCategory(line.text);

        if (timestamp) {
          const severity =
            diag.severity === vscode.DiagnosticSeverity.Error
              ? "error"
              : diag.severity === vscode.DiagnosticSeverity.Warning
                ? "warning"
                : "info";

          // Determine event type
          let eventType: TimelineEvent["type"] = severity;
          const text = line.text.toLowerCase();
          if (/\b(start|exit|restart|shutdown)\b/i.test(text)) {
            eventType = "lifecycle";
          } else if (/\b(login|logout|auth)\b/i.test(text)) {
            eventType = "authentication";
          } else if (/\b(call|invite|bye)\b/i.test(text)) {
            eventType = "call";
          } else if (/\b(connect|disconnect)\b/i.test(text)) {
            eventType = "connection";
          }

          timelineEvents.push({
            timestamp,
            line: diag.range.start.line,
            type: eventType,
            message: diag.message.split("\n")[0],
            category,
          });
        }
      });

      if (timelineEvents.length === 0) {
        vscode.window.showInformationMessage(
          "No timeline events with timestamps found",
        );
        return;
      }

      timelineVisualization?.showTimelinePanel(timelineEvents, editor.document);
      vscode.window.showInformationMessage(
        `Timeline visualization opened with ${timelineEvents.length} events`,
      );
    },
  );

  // Show SIP Ladder Diagram command
  const showLadderDiagramCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showLadderDiagram",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }

      // Parse SIP messages from document
      const sipEvents = SipCallFlowParser.parseSipMessages(editor.document);

      if (sipEvents.length === 0) {
        vscode.window.showInformationMessage(
          "No SIP/call flow messages detected. Make sure your logs contain SIP protocol messages or call events.",
        );
        return;
      }

      timelineVisualization?.setLadderEvents(sipEvents);
      timelineVisualization?.showLadderDiagram();
      vscode.window.showInformationMessage(
        `SIP Ladder Diagram opened with ${sipEvents.length} messages`,
      );
    },
  );

  // Toggle Category command
  const toggleCategoryCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleCategory",
    (category: string) => {
      categoriesTreeProvider?.toggleCategory(category);
      // Filter results view based on enabled categories
      filterResultsByCategories();
    },
  );

  // Toggle All Categories command
  const toggleAllCategoriesCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleAllCategories",
    (enable: boolean) => {
      categoriesTreeProvider?.toggleAll(enable);
      // Filter results view based on enabled categories
      filterResultsByCategories();
    },
  );

  // Toggle Filter command (unified - handles categories, files, etc.)
  const toggleFilterCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.toggleFilter",
    (filterType: string, filterValue: string) => {
      if (filterType === "category") {
        filterTreeProvider?.toggleCategory(filterValue);
      } else if (filterType === "file") {
        filterTreeProvider?.toggleFile(filterValue);
      }
    },
  );

  // Helper function to filter results based on enabled categories
  function filterResultsByCategories() {
    if (!categoriesTreeProvider || !allResults) return;

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
  const copyFilePathCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.copyFilePath",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No file is currently open");
        return;
      }
      vscode.env.clipboard.writeText(editor.document.uri.fsPath);
      vscode.window.showInformationMessage(
        `Copied: ${editor.document.uri.fsPath}`,
      );
    },
  );

  // Open in New Window command
  const openInNewWindowCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openInNewWindow",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No file is currently open");
        return;
      }
      await vscode.commands.executeCommand(
        "vscode.openFolder",
        editor.document.uri,
        true,
      );
    },
  );

  // Copy Version Info command
  const copyVersionInfoCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.copyVersionInfo",
    () => {
      const lspVersion = getLSPServerVersion();
      const versionText = lspVersion
        ? `Extension: v${BUILD_INFO.version}\nLSP Server: v${lspVersion}\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}`
        : `Extension: v${BUILD_INFO.version}\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}\nLSP: Not connected`;

      vscode.env.clipboard.writeText(versionText);
      vscode.window.showInformationMessage("Version info copied to clipboard");
    },
  );

  const copyResultInfoCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.copyResultInfo",
    (item: any) => {
      if (!item || !item.result) {
        vscode.window.showErrorMessage("No result item selected");
        return;
      }

      const result = item.result;
      const fileName = result.uri.fsPath.split(/[\\/]/).pop();
      const lineNum = result.line + 1;

      // Format matching tooltip: Category (left) | severity filename:line (right)
      const category = result.category || "";
      const rightParts: string[] = [];

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
      vscode.window.showInformationMessage(
        "Tooltip content copied to clipboard",
      );
    },
  );

  const copyDiagnosticAtCursorCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.copyDiagnosticAtCursor",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }

      const position = editor.selection.active;
      const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

      // Find diagnostic at cursor position
      const diagnostic = diagnostics.find((diag) =>
        diag.range.contains(position),
      );

      if (!diagnostic) {
        vscode.window.showInformationMessage(
          "No diagnostic at cursor position",
        );
        return;
      }

      // Extract data from diagnostic
      const diagWithData = diagnostic as any;
      const category = diagWithData.data?.category || "";
      const patternId =
        typeof diagnostic.code === "string" ? diagnostic.code : "";
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
      const severityMap: { [key: number]: string } = {
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
      vscode.window.showInformationMessage(
        "Diagnostic message copied to clipboard",
      );
    },
  );

  const showCacheDataCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showCacheData",
    (item: any) => {
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

      if (
        result.extractedFields &&
        Object.keys(result.extractedFields).length > 0
      ) {
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
        output.appendLine(
          "FULL DIAGNOSTIC DATA (includes all TagScout annotation fields):",
        );
        output.appendLine(JSON.stringify(result.diagnosticData, null, 2));
        output.appendLine("");
        output.appendLine("═".repeat(80));
      }

      // Create output object with key annotation fields first
      const jsonOutput: any = {
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
    },
  );

  const showPatternByIdCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showPatternById",
    async (patternId: string) => {
      if (!patternId) {
        vscode.window.showErrorMessage("No pattern ID provided");
        return;
      }

      try {
        const lspClient = getLSPClient();
        if (!lspClient) {
          vscode.window.showWarningMessage(
            "LSP client not connected. Cannot fetch pattern.",
          );
          return;
        }

        // Fetch all patterns
        const allPatternsResult: any = await lspClient.sendRequest(
          "workspace/executeCommand",
          {
            command: "logScout.getPatterns",
            arguments: [],
          },
        );

        if (!allPatternsResult || !allPatternsResult.patterns) {
          vscode.window.showWarningMessage("No patterns available");
          return;
        }

        // Find the specific pattern by ID
        const pattern = allPatternsResult.patterns.find(
          (p: any) => p.id === patternId,
        );

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
          outputChannel.appendLine(
            `✓ Opened pattern for editing: ${pattern.name} (${patternId})`,
          );
        }

        // Show info message with option to save back
        const action = await vscode.window.showInformationMessage(
          `Editing pattern: ${pattern.name}`,
          "Save Changes",
          "Close",
        );

        if (action === "Save Changes") {
          // Get the edited content
          const editedContent = editor.document.getText();
          try {
            // Validate JSON
            JSON.parse(editedContent);

            // Here you would send the edited pattern back to LSP or save to file
            // For now, just show a message
            vscode.window.showInformationMessage(
              "Pattern save functionality coming soon. For now, you can copy this JSON to your patterns file.",
            );

            if (outputChannel) {
              outputChannel.appendLine(`Pattern edited:\n${editedContent}`);
            }
          } catch (parseError: any) {
            vscode.window.showErrorMessage(
              `Invalid JSON: ${parseError.message}`,
            );
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to fetch pattern: ${error.message}`,
        );
        if (outputChannel) {
          outputChannel.appendLine(
            `✗ Error fetching pattern: ${error.message}`,
          );
        }
      }
    },
  );

  const showPatternForResultCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showPatternForResult",
    async (item: any) => {
      if (!item || !item.result) {
        vscode.window.showErrorMessage("No result item selected");
        return;
      }

      const result = item.result;
      if (!result.patternId) {
        vscode.window.showWarningMessage(
          "No pattern information available for this result",
        );
        return;
      }

      try {
        const lspClient = getLSPClient();
        if (!lspClient) {
          vscode.window.showWarningMessage(
            "LSP client not connected. Cannot fetch pattern.",
          );
          return;
        }

        // Fetch all patterns
        const allPatternsResult: any = await lspClient.sendRequest(
          "workspace/executeCommand",
          {
            command: "logScout.getPatterns",
            arguments: [],
          },
        );

        if (!allPatternsResult || !allPatternsResult.patterns) {
          vscode.window.showWarningMessage("No patterns available");
          return;
        }

        // Find the specific pattern by ID
        const pattern = allPatternsResult.patterns.find(
          (p: any) => p.id === result.patternId,
        );

        if (!pattern) {
          vscode.window.showWarningMessage(
            `Pattern not found: ${result.patternId}`,
          );
          return;
        }

        // Show in panel with just this pattern
        PatternViewerPanel.createOrShow(context.extensionUri, {
          patterns: [pattern],
          count: 1,
          source: allPatternsResult.source,
        });

        if (outputChannel) {
          outputChannel.appendLine(
            `✓ Showing pattern: ${pattern.name} (${result.patternId})`,
          );
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to fetch pattern: ${error.message}`,
        );
        if (outputChannel) {
          outputChannel.appendLine(
            `✗ Error fetching pattern: ${error.message}`,
          );
        }
      }
    },
  );

  // Case Management Commands
  const downloadCaseCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.downloadCase",
    async () => {
      const url = await vscode.window.showInputBox({
        prompt: "Enter case download URL",
        placeHolder: "https://example.com/case.zip",
        validateInput: (value) => {
          if (!value) return "URL is required";
          if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return "URL must start with http:// or https://";
          }
          return null;
        },
      });

      if (url && caseManager) {
        try {
          await caseManager.downloadCaseFromUrl(url);
          casesTreeProvider?.refresh();
          vscode.window.showInformationMessage("Case downloaded successfully");
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to download case: ${error.message}`,
          );
        }
      }
    },
  );

  const importCaseCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.importCase",
    async () => {
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          Archives: ["zip", "tar", "gz", "tgz", "tar.gz"],
        },
        openLabel: "Import Case",
      });

      if (fileUris && fileUris.length > 0 && caseManager) {
        try {
          await caseManager.importCaseFromLocal(fileUris[0].fsPath);
          casesTreeProvider?.refresh();
          vscode.window.showInformationMessage("Case imported successfully");
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to import case: ${error.message}`,
          );
        }
      }
    },
  );

  const openCaseCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openCase",
    async (caseId: string) => {
      if (!caseManager) return;

      const caseInfo = caseManager.getCase(caseId);
      if (!caseInfo) {
        vscode.window.showErrorMessage(`Case ${caseId} not found`);
        return;
      }

      if (caseInfo.status !== "ready") {
        vscode.window.showWarningMessage(
          `Case ${caseInfo.caseName} is not ready (status: ${caseInfo.status})`,
        );
        return;
      }

      // Open the first log file
      if (caseInfo.logFiles.length > 0) {
        try {
          const firstLog = caseInfo.logFiles[0];
          const doc = await vscode.workspace.openTextDocument(firstLog);
          await vscode.window.showTextDocument(doc);
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to open case: ${error.message}`,
          );
        }
      } else {
        vscode.window.showWarningMessage("No log files found in this case");
      }
    },
  );

  const refreshCasesCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.refreshCases",
    () => {
      casesTreeProvider?.refresh();
    },
  );

  const deleteCaseCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.deleteCase",
    async (item: any) => {
      if (!caseManager || !item?.caseInfo) return;

      const caseInfo = item.caseInfo;
      const answer = await vscode.window.showWarningMessage(
        `Delete case "${caseInfo.caseName}"? This will remove all downloaded files.`,
        { modal: true },
        "Delete",
      );

      if (answer === "Delete") {
        try {
          await caseManager.deleteCase(caseInfo.caseId);
          casesTreeProvider?.refresh();
          vscode.window.showInformationMessage(
            `Case "${caseInfo.caseName}" deleted`,
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to delete case: ${error.message}`,
          );
        }
      }
    },
  );

  const showCasesListCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.showCasesList",
    () => {
      vscode.commands.executeCommand("scoutCases.focus");
    },
  );

  const openCaseLogFileCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.openCaseLogFile",
    async (item: any) => {
      if (item?.logFilePath) {
        try {
          const doc = await vscode.workspace.openTextDocument(item.logFilePath);
          await vscode.window.showTextDocument(doc);
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to open log file: ${error.message}`,
          );
        }
      }
    },
  );

  const revealCaseInExplorerCommand = vscode.commands.registerCommand(
    "logScoutAnalyzer.revealCaseInExplorer",
    async (item: any) => {
      if (item?.caseInfo?.extractedPath) {
        try {
          await vscode.commands.executeCommand(
            "revealFileInOS",
            vscode.Uri.file(item.caseInfo.extractedPath),
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to reveal case: ${error.message}`,
          );
        }
      }
    },
  );

  // Register all commands
  context.subscriptions.push(
    analyzeCommand,
    clearCommand,
    clearResultsCommand,
    clearCacheCommand,
    removeCachedFileCommand,
    openCachedFileCommand,
    openFileInEditorCommand,
    revealInExplorerCommand,
    showCacheStatsCommand,
    showPatternsCommand,
    showAboutCommand,
    openExtensionLogCommand,
    openLSPLogCommand,
    showLogPathsCommand,
    jumpToLineCommand,
    refreshResultsCommand,
    showConsoleCommand,
    clearConsoleCommand,
    groupBySeverityCommand,
    groupByCategoryCommand,
    groupByFileCommand,
    resetViewCommand,
    sortByLineCommand,
    sortBySeverityCommand,
    sortByTimeCommand,
    sortByFileCommand,
    sortByCategoryCommand,
    exportResultsCommand,
    analyzeDirectoryCommand,
    analyzeAllBelowCommand,
    openAnalyzerPanelCommand,
    openScoutViewCommand,
    openActionPanelCommand,
    openAnnotationDashboardCommand,
    toggleConsoleLocationCommand,
    openSplitViewCommand,
    closeSplitViewCommand,
    setTimeframeCommand,
    toggleSignificantEventsCommand,
    toggleTimeframeCommand,
    toggleAllTimeframesCommand,
    changeTimeIntervalCommand,
    showTimelineVisualizationCommand,
    showLadderDiagramCommand,
    toggleCategoryCommand,
    toggleAllCategoriesCommand,
    toggleFilterCommand,
    copyFilePathCommand,
    openInNewWindowCommand,
    copyVersionInfoCommand,
    copyResultInfoCommand,
    copyDiagnosticAtCursorCommand,
    showCacheDataCommand,
    showPatternByIdCommand,
    showPatternForResultCommand,
    viewCacheMetadataCommand,
    downloadCaseCommand,
    importCaseCommand,
    openCaseCommand,
    refreshCasesCommand,
    deleteCaseCommand,
    showCasesListCommand,
    openCaseLogFileCommand,
    revealCaseInExplorerCommand,
  );

  // Unified diagnostic change handler - event-driven, no polling
  const onDidChangeDiagnostics = vscode.languages.onDidChangeDiagnostics(
    (event) => {
      if (outputChannel) {
        outputChannel.appendLine(
          `[${new Date().toISOString()}] 🔔 onDidChangeDiagnostics fired`,
        );
        outputChannel.appendLine(`   → URIs affected: ${event.uris.length}`);
      }
      for (const uri of event.uris) {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        handleDiagnosticsChange(uri, diagnostics);
      }
    },
  );

  // Register document change listeners - LSP handles analysis automatically
  const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    (document) => {
      if (isLogFile(document) && outputChannel) {
        outputChannel.appendLine("");
        outputChannel.appendLine(
          `[${new Date().toISOString()}] 📂 Log file opened (LSP analyzing)`,
        );
        outputChannel.appendLine(`   → ${document.fileName}`);
      }
      updateStatusBar();
    },
  );

  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
    () => {
      // LSP server handles document changes automatically
      updateStatusBar();
    },
  );

  const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(
    (document) => {
      if (isLogFile(document)) {
        // LSP server re-analyzes on save automatically
        updateStatusBar();
      }
    },
  );

  const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      updateStatusBar();
      analyzerTreeProvider?.refresh();

      // Update results for the new active editor if diagnostics are available
      if (editor && isLogFile(editor.document)) {
        const diagnostics = vscode.languages.getDiagnostics(
          editor.document.uri,
        );
        if (diagnostics.length > 0) {
          // Trigger UI update for this editor's diagnostics
          handleDiagnosticsChange(editor.document.uri, diagnostics);
        }
      }
    },
  );

  // Listen for configuration changes to invalidate cache when patterns change
  const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration(
    async (e) => {
      if (
        e.affectsConfiguration("logScoutAnalyzer.patterns") ||
        e.affectsConfiguration("logScoutAnalyzer.lsp")
      ) {
        if (outputChannel) {
          outputChannel.appendLine(
            `[${new Date().toISOString()}] ⚙️ Configuration changed - invalidating cache`,
          );
        }
        analysisCache.clear();
        cachedFilesTreeProvider?.clear();

        // Clear persisted cache
        if (extensionContext) {
          await extensionContext.globalState.update(
            CACHE_STORAGE_KEY,
            undefined,
          );
        }

        vscode.window.showInformationMessage(
          "Pattern configuration changed. Cache cleared.",
        );
      }
    },
  );

  context.subscriptions.push(
    onDidChangeDiagnostics,
    onDidOpenTextDocument,
    onDidChangeTextDocument,
    onDidSaveTextDocument,
    onDidChangeActiveTextEditor,
    onDidChangeConfiguration,
  );

  // Process active editor if it already has diagnostics (reload scenario)
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor && isLogFile(activeEditor.document)) {
    const diagnostics = vscode.languages.getDiagnostics(
      activeEditor.document.uri,
    );
    if (diagnostics.length > 0) {
      handleDiagnosticsChange(activeEditor.document.uri, diagnostics);
      if (outputChannel) {
        outputChannel.appendLine(
          `✓ Processed active file: ${activeEditor.document.uri.fsPath.split(/[\\\/]/).pop()} (${diagnostics.length} diagnostic(s))`,
        );
        outputChannel.appendLine("");
      }
    }
  }

  if (outputChannel) {
    outputChannel.appendLine("─".repeat(60));
    outputChannel.appendLine(`✅ Extension ready! ${getBuildInfo()}`);
    outputChannel.appendLine(
      "   🔍 Click Scout icon in activity bar to open views",
    );
    outputChannel.appendLine("   � Debug logs at: " + fileLogger.getLogPath());
    outputChannel.appendLine("─".repeat(60));
    outputChannel.appendLine("");
  }

  fileLogger.log("All features initialized and ready");
  fileLogger.log("  - Results Tree View");
  fileLogger.log("  - Categories Tree View");
  fileLogger.log("  - Timeline Tree View");
  fileLogger.log("  - File-based logging");

  console.log(`${getBuildInfo()}: All features registered`);
}

export async function deactivate() {
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
  await stopLSPClient();

  if (outputChannel) {
    outputChannel.appendLine("");
    outputChannel.appendLine("─".repeat(60));
    outputChannel.appendLine(`❌ ${getBuildInfo()} deactivated`);
    outputChannel.appendLine(`   Time: ${new Date().toISOString()}`);
    outputChannel.appendLine("─".repeat(60));
    outputChannel.dispose();
  }

  fileLogger?.dispose();

  if (statusBarItem) {
    statusBarItem.dispose();
  }

  console.log(`${getBuildInfo()} deactivated`);
  outputChannel = undefined;
  statusBarItem = undefined;
  resultsTreeProvider = undefined;
  categoriesTreeProvider = undefined;
  timelineTreeProvider = undefined;
  fileLogger = undefined;
  gutterDecorator = undefined;

  if (highlightTimeout) {
    clearTimeout(highlightTimeout);
    highlightTimeout = undefined;
  }
  highlightDecoration = undefined;
  splitViewProvider = undefined;
  timelineVisualization = undefined;
}

function isLogFile(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
  const enableDiagnostics = config.get<boolean>("enableDiagnostics", true);

  if (!enableDiagnostics) {
    return false;
  }

  // Check language ID first
  if (document.languageId === "log") {
    return true;
  }

  // Check file extensions and patterns
  const fileName = document.fileName.toLowerCase();

  // Standard log file extensions
  const logExtensions = [".log", ".txt", ".out", ".err"];
  if (logExtensions.some((ext) => fileName.endsWith(ext))) {
    return true;
  }

  // Check for numbered log files: log.1, log.2, etc.
  if (/\blog\.\d+$/.test(fileName)) {
    return true;
  }

  // Check for rotated logs with patterns like: app.log.1, syslog.2, etc.
  if (/\.\d+$/.test(fileName)) {
    return true;
  }

  // Check for files named "log" or "syslog" without extension
  const baseName = fileName.split(/[\\/]/).pop() || "";
  if (baseName === "log" || baseName === "syslog") {
    return true;
  }

  return false;
}

function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }

  // Check if status bar button is enabled in settings
  const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
  const showStatusBar = config.get<boolean>("showStatusBarButton", true);

  if (!showStatusBar) {
    statusBarItem.hide();
    return;
  }

  // Build version tooltip
  const lspVersion = getLSPServerVersion();
  const lspName = getLSPServerName();
  const versionInfo = `Log Scout Analyzer v${BUILD_INFO.version}\nBuild: ${BUILD_INFO.buildTimestamp}\nLSP: ${lspVersion ? `${lspName || "LSP Server"} v${lspVersion}` : "Not connected"}`;

  const editor = vscode.window.activeTextEditor;
  if (editor && isLogFile(editor.document)) {
    const uriString = editor.document.uri.toString();
    const cached = analysisCache.get(uriString);

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
    const errorCount = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    ).length;
    const warningCount = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Warning,
    ).length;
    const infoCount = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Information,
    ).length;

    // Get timeline event counts
    let eventText = "";
    if (timelineTreeProvider) {
      const eventCounts = timelineTreeProvider.getEventCounts();
      const eventParts: string[] = [];

      if (eventCounts.lifecycle > 0) {
        eventParts.push(`🔄${eventCounts.lifecycle}`);
      }
      if (eventCounts.authentication > 0) {
        eventParts.push(`🔐${eventCounts.authentication}`);
      }
      if (eventCounts.call > 0) {
        eventParts.push(`📞${eventCounts.call}`);
      }
      if (eventCounts.connection > 0) {
        eventParts.push(`🔌${eventCounts.connection}`);
      }

      if (eventParts.length > 0) {
        eventText = " | " + eventParts.join(" ");
      }
    }

    // Add analysis badge if file has been cached
    const analyzedBadge = cached ? "✓ " : "";
    const cacheTime = cached ? ` (${formatTimeSince(cached.timestamp)})` : "";

    if (diagnostics.length === 0) {
      statusBarItem.text = `$(search) ${analyzedBadge}Scout: Analyze${eventText}`;
      statusBarItem.backgroundColor = undefined;
      statusBarItem.tooltip = cached
        ? `${versionInfo}\n\nFile analyzed ${cacheTime}\nClick to re-analyze`
        : `${versionInfo}\n\nClick to analyze file`;
    } else {
      // Show all counts in status bar with events
      statusBarItem.text = `$(search) ${analyzedBadge}Scout: 🔴 ${errorCount} 🟡 ${warningCount} 🔵 ${infoCount}${eventText}`;
      statusBarItem.tooltip = `${versionInfo}\n\nAnalyzed ${cacheTime}\n${errorCount} errors, ${warningCount} warnings, ${infoCount} info\nClick to view details`;
      if (errorCount > 0) {
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground",
        );
      } else if (warningCount > 0) {
        statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground",
        );
      } else {
        statusBarItem.backgroundColor = undefined;
      }
    }
  } else {
    // Show status bar even when no log file is open (permanent)
    statusBarItem.text = "$(search) Scout Analyzer";
    statusBarItem.tooltip = versionInfo;
    statusBarItem.backgroundColor = undefined;
  }

  // Always show status bar (permanent)
  statusBarItem.show();
}

// Update the cached files tree view with current cache
function updateCachedFilesView() {
  if (!cachedFilesTreeProvider) return;

  const cachedFiles = new Map<string, CachedFile>();

  for (const [uriString, cacheEntry] of analysisCache.entries()) {
    cachedFiles.set(uriString, {
      uri: vscode.Uri.parse(uriString),
      timestamp: cacheEntry.timestamp,
      errorCount: cacheEntry.errorCount,
      warningCount: cacheEntry.warningCount,
      infoCount: cacheEntry.infoCount,
      debugCount: cacheEntry.debugCount,
      totalCount:
        cacheEntry.errorCount +
        cacheEntry.warningCount +
        cacheEntry.infoCount +
        cacheEntry.debugCount,
    });
  }

  cachedFilesTreeProvider.setCachedFiles(cachedFiles);
}

// Pattern HTML generator removed - LSP server manages patterns

function extractTimestamp(logLine: string): Date | undefined {
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

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function extractCategory(logLine: string): string | undefined {
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

async function findLogFiles(
  directory: string,
  recursive: boolean,
): Promise<string[]> {
  const logFiles: string[] = [];
  const logExtensions = [".log", ".txt", ".out"];

  async function scan(dir: string): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && recursive) {
        await scan(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (logExtensions.includes(ext)) {
          logFiles.push(fullPath);
        }
      }
    }
  }

  await scan(directory);
  return logFiles;
}
