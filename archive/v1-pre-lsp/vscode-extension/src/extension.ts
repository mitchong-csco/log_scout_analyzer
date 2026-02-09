import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { PatternEngine } from "./patternEngine";
import { DiagnosticsProvider } from "./diagnosticsProvider";
import { BUILD_INFO, getBuildInfo } from "./buildInfo";
import { ResultsPanel } from "./resultsPanel";
import { ResultsTreeProvider, ResultItem } from "./resultsTreeProvider";
import { CategoriesTreeProvider } from "./categoriesTreeProvider";
import { TimelineTreeProvider } from "./timelineTreeProvider";
import { AnalyzerTreeProvider } from "./analyzerTreeProvider";
import { ScoutConsole } from "./scoutConsole";
import { ScoutAnalyzerPanel } from "./scoutAnalyzerPanel";
import { registerConsoleNavigationCommand } from "./consoleLinksProvider";
import { GutterDecorator, AnnotatedLine } from "./gutterDecorator";
import { SplitViewProvider } from "./splitViewProvider";
import { TimeframeFilter } from "./analyzerTreeProvider";
import {
    TimelineVisualizationProvider,
    TimelineEvent,
} from "./timelineVisualization";
import { SipCallFlowParser } from "./sipCallFlowParser";

let diagnosticsProvider: DiagnosticsProvider | undefined;
let patternEngine: PatternEngine | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let resultsTreeProvider: ResultsTreeProvider | undefined;
let categoriesTreeProvider: CategoriesTreeProvider | undefined;
let timelineTreeProvider: TimelineTreeProvider | undefined;
let analyzerTreeProvider: AnalyzerTreeProvider | undefined;
let scoutConsole: ScoutConsole | undefined;
let gutterDecorator: GutterDecorator | undefined;
let highlightDecoration: vscode.TextEditorDecorationType | undefined;
let highlightTimeout: NodeJS.Timeout | undefined;
let splitViewProvider: SplitViewProvider | undefined;
let timelineVisualization: TimelineVisualizationProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
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

    // Initialize Scout Console
    scoutConsole = new ScoutConsole();
    context.subscriptions.push({
        dispose: () => scoutConsole?.dispose(),
    });
    scoutConsole.logMessage("╔════════════════════════════════════════╗");
    scoutConsole.logMessage("║   SCOUT CONSOLE INITIALIZED           ║");
    scoutConsole.logMessage("╚════════════════════════════════════════╝");
    scoutConsole.logMessage("");
    scoutConsole.logMessage(
        "💡 Tip: Click on file:line links to navigate to source",
    );
    scoutConsole.logMessage("");

    // Register console navigation command
    registerConsoleNavigationCommand(context);

    // Register document link provider for console output (makes file paths clickable)
    // Note: VS Code doesn't support document links in output channels by default,
    // but we format output to be compatible with terminal link detection
    outputChannel.appendLine(
        "💡 Console output includes clickable file:line links",
    );
    outputChannel.appendLine("");

    // Initialize pattern engine
    patternEngine = new PatternEngine();

    // Initialize diagnostics provider
    const diagnosticCollection =
        vscode.languages.createDiagnosticCollection("log-scout-analyzer");
    diagnosticsProvider = new DiagnosticsProvider(
        diagnosticCollection,
        patternEngine,
        outputChannel,
        updateStatusBar,
    );

    context.subscriptions.push(diagnosticCollection);

    // Pass diagnostics provider to ScoutAnalyzerPanel
    ScoutAnalyzerPanel.setDiagnosticsProvider(diagnosticsProvider);

    const patternCount = patternEngine.getPatternCount();
    outputChannel.appendLine(`✓ Loaded ${patternCount} patterns`);
    outputChannel.appendLine("✓ Ready to analyze log files");
    outputChannel.appendLine("");
    scoutConsole.logPatternLoad(patternCount);

    // Initialize Tree Providers
    resultsTreeProvider = new ResultsTreeProvider();
    categoriesTreeProvider = new CategoriesTreeProvider();
    timelineTreeProvider = new TimelineTreeProvider();
    analyzerTreeProvider = new AnalyzerTreeProvider();

    // Initialize Gutter Decorator for annotations
    gutterDecorator = new GutterDecorator();
    context.subscriptions.push(gutterDecorator);

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

    // Pass diagnostics provider to AnalyzerTreeProvider
    AnalyzerTreeProvider.setDiagnosticsProvider(diagnosticsProvider);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );
    statusBarItem.command = "logScoutAnalyzer.openScoutView";
    statusBarItem.tooltip = "Click to open Scout Analyzer";
    context.subscriptions.push(statusBarItem);

    // Update status bar based on active editor
    updateStatusBar();

    // Register commands
    const analyzeCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.analyzeFile",
        () => {
            const editor = vscode.window.activeTextEditor;
            if (
                editor &&
                diagnosticsProvider &&
                outputChannel &&
                scoutConsole
            ) {
                const startTime = Date.now();
                const timestamp = new Date().toISOString();

                // Log to console
                scoutConsole.logAnalysisStart(
                    editor.document.fileName,
                    editor.document.uri,
                );
                scoutConsole.show();

                outputChannel.appendLine("");
                outputChannel.appendLine(`[${"=".repeat(50)}]`);
                outputChannel.appendLine(
                    `[${timestamp}] 🔍 MANUAL ANALYSIS TRIGGERED`,
                );
                outputChannel.appendLine(`File: ${editor.document.fileName}`);
                outputChannel.show(true);

                // Perform analysis
                diagnosticsProvider.analyzeDocument(editor.document);

                // Get diagnostics
                const diagnostics = vscode.languages.getDiagnostics(
                    editor.document.uri,
                );
                const diagnosticCount = diagnostics.length;

                // Convert diagnostics to ResultItem format
                const results: ResultItem[] = diagnostics.map((diag) => {
                    const severity =
                        diag.severity === vscode.DiagnosticSeverity.Error
                            ? "error"
                            : diag.severity ===
                                vscode.DiagnosticSeverity.Warning
                              ? "warning"
                              : diag.severity === vscode.DiagnosticSeverity.Hint
                                ? "debug"
                                : "info";

                    const line = editor.document.lineAt(diag.range.start.line);
                    const messageLines = diag.message.split("\n");
                    const mainMessage = messageLines[0];

                    // Extract timestamp and category
                    const extractedTimestamp = extractTimestamp(line.text);
                    const category = extractCategory(line.text);

                    // Log to console in real-time
                    if (scoutConsole) {
                        scoutConsole.logResult(
                            severity,
                            diag.range.start.line,
                            mainMessage,
                            category,
                            extractedTimestamp,
                            editor.document.uri,
                        );
                    }

                    return {
                        severity,
                        line: diag.range.start.line,
                        column: diag.range.start.character,
                        message: mainMessage,
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
                        context: line.text,
                        timestamp: extractedTimestamp,
                        category: category,
                        uri: editor.document.uri,
                    };
                });

                // Update tree views
                resultsTreeProvider?.setResults(results);
                categoriesTreeProvider?.setResults(results);
                timelineTreeProvider?.setResults(results);

                // Update gutter decorations with annotations
                if (gutterDecorator) {
                    const annotations: AnnotatedLine[] = results.map((r) => ({
                        line: r.line,
                        severity: r.severity,
                        message: r.message,
                        matchedText: r.matchedText,
                        context: r.context,
                        timestamp: r.timestamp,
                        category: r.category,
                        pattern: undefined, // Can be added if pattern info is available
                    }));
                    gutterDecorator.updateDecorations(editor, annotations);
                }

                // Calculate duration
                const duration = Date.now() - startTime;

                // Count by severity
                const errorCount = results.filter(
                    (r) => r.severity === "error",
                ).length;
                const warningCount = results.filter(
                    (r) => r.severity === "warning",
                ).length;
                const infoCount = results.filter(
                    (r) => r.severity === "info",
                ).length;
                const debugCount = results.filter(
                    (r) => r.severity === "debug",
                ).length;

                // Log completion
                scoutConsole.logAnalysisComplete(
                    errorCount,
                    warningCount,
                    infoCount,
                    debugCount,
                    duration,
                );

                // Log summary
                const categories = [
                    ...new Set(results.map((r) => r.category).filter((c) => c)),
                ];
                const timestamps = results
                    .map((r) => r.timestamp)
                    .filter((t) => t) as Date[];
                const timeRange =
                    timestamps.length > 0
                        ? {
                              start: new Date(
                                  Math.min(
                                      ...timestamps.map((t) => t.getTime()),
                                  ),
                              ),
                              end: new Date(
                                  Math.max(
                                      ...timestamps.map((t) => t.getTime()),
                                  ),
                              ),
                          }
                        : undefined;

                scoutConsole.logSummary({
                    totalFiles: 1,
                    totalIssues: diagnosticCount,
                    errors: errorCount,
                    warnings: warningCount,
                    infos: infoCount,
                    categories: categories as string[],
                    timeRange: timeRange,
                });

                outputChannel.appendLine(
                    `✓ Analysis complete: Found ${diagnosticCount} issue(s)`,
                );
                outputChannel.appendLine(
                    "  → Check Scout Analyzer sidebar for tree views",
                );
                outputChannel.appendLine(
                    "  → Check Scout Console for real-time output",
                );
                outputChannel.appendLine(
                    "  → Check Problems panel (Ctrl+Shift+M) for details",
                );
                outputChannel.appendLine("");

                // Still show webview panel if enabled
                const config =
                    vscode.workspace.getConfiguration("logScoutAnalyzer");
                const showPanel = config.get<boolean>("showResultsPanel", true);

                if (showPanel) {
                    const panel = ResultsPanel.createOrShow(
                        context.extensionUri,
                        editor.document,
                    );
                    panel.updateResults(
                        results.map((r) => ({
                            severity: r.severity,
                            line: r.line,
                            column: r.column,
                            message: r.message,
                            matchedText: r.matchedText,
                            context: r.context,
                            timestamp: r.timestamp,
                            category: r.category,
                        })),
                        editor.document.fileName,
                        new Date().toLocaleString(),
                    );
                }

                vscode.window.showInformationMessage(
                    `Analysis complete! 🔴 ${errorCount} 🟡 ${warningCount} 🔵 ${infoCount} | Check Scout Analyzer in left sidebar`,
                );

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
            diagnosticCollection.clear();
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
            if (scoutConsole) {
                scoutConsole.logClear();
            }

            vscode.window.showInformationMessage("Diagnostics cleared!");
            updateStatusBar();
        },
    );

    const showPatternsCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.showPatterns",
        () => {
            if (patternEngine && outputChannel) {
                const patterns = patternEngine.getAllPatterns();
                outputChannel.appendLine(
                    `[${new Date().toISOString()}] Showing patterns configuration`,
                );
                outputChannel.appendLine(
                    `  Errors: ${patterns.errors.length} patterns`,
                );
                outputChannel.appendLine(
                    `  Warnings: ${patterns.warnings.length} patterns`,
                );
                outputChannel.appendLine(
                    `  Info: ${patterns.info.length} patterns`,
                );

                const panel = vscode.window.createWebviewPanel(
                    "logScoutPatterns",
                    "Log Scout Patterns",
                    vscode.ViewColumn.One,
                    {},
                );
                panel.webview.html = generatePatternsHtml(patterns);
            }
        },
    );

    const showVersionCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.showVersion",
        () => {
            if (outputChannel) {
                outputChannel.show();
                outputChannel.appendLine("");
                outputChannel.appendLine(
                    "╔════════════════════════════════════════╗",
                );
                outputChannel.appendLine(
                    "║        VERSION INFORMATION            ║",
                );
                outputChannel.appendLine(
                    "╚════════════════════════════════════════╝",
                );
                outputChannel.appendLine("");
                outputChannel.appendLine(`📦 Extension: Log Scout Analyzer`);
                outputChannel.appendLine(`🏷️  Version: ${BUILD_INFO.version}`);
                outputChannel.appendLine(
                    `🔨 Build Time: ${BUILD_INFO.buildTimestamp}`,
                );
                outputChannel.appendLine(
                    `🔢 Build Number: ${BUILD_INFO.buildNumber}`,
                );
                outputChannel.appendLine(
                    `🔗 Git Commit: ${BUILD_INFO.gitCommit}`,
                );
                outputChannel.appendLine(
                    `⏰ Activated: ${new Date().toISOString()}`,
                );
                outputChannel.appendLine(
                    `🎯 Pattern Count: ${patternEngine?.getPatternCount() || 0}`,
                );
                outputChannel.appendLine("");
            }

            vscode.window.showInformationMessage(
                `${getBuildInfo()}\nBuild: ${BUILD_INFO.buildTimestamp}\nBuild #: ${BUILD_INFO.buildNumber}`,
            );
        },
    );

    // Jump to line command
    const jumpToLineCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.jumpToLine",
        (uri: vscode.Uri, line: number, column: number) => {
            // Preserve focus on active editor column
            const activeColumn =
                vscode.window.activeTextEditor?.viewColumn ||
                vscode.ViewColumn.One;

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
                            vscode.workspace.getConfiguration(
                                "logScoutAnalyzer",
                            );
                        const duration = config.get<number>(
                            "highlightDuration",
                            2000,
                        );

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
            const annotations: AnnotatedLine[] = results.map((r) => ({
                line: r.line,
                severity: r.severity,
                message: r.message,
                matchedText: r.matchedText,
                context: r.context,
                timestamp: r.timestamp,
                category: r.category,
                pattern: undefined,
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

    // Show console command
    const showConsoleCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.showConsole",
        () => {
            if (scoutConsole) {
                scoutConsole.show();
                vscode.window.showInformationMessage(
                    "Scout Console opened in bottom panel. File paths are clickable (Ctrl+Click).",
                );
            }
        },
    );

    // Clear console command
    const clearConsoleCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.clearConsole",
        () => {
            scoutConsole?.clear();
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

            scoutConsole?.logExport(fileName, results.length);
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
            if (!editor || !diagnosticsProvider || !scoutConsole) {
                vscode.window.showWarningMessage("No active editor");
                return;
            }

            const originalUri = editor.document.uri;
            const originalColumn = editor.viewColumn;
            scoutConsole.logMessage("🔍 Analyzing directory...");

            const currentDir = path.dirname(editor.document.uri.fsPath);
            const files = await findLogFiles(currentDir, false);

            scoutConsole.logMessage(`Found ${files.length} log files`);

            let analyzed = 0;
            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                diagnosticsProvider.analyzeDocument(doc);
                analyzed++;
            }

            // Return focus to original file
            const originalDoc =
                await vscode.workspace.openTextDocument(originalUri);
            await vscode.window.showTextDocument(originalDoc, {
                viewColumn: originalColumn,
                preserveFocus: false,
                preview: false,
            });

            scoutConsole.logMessage(
                `✓ Analyzed ${analyzed} files in directory`,
            );
            vscode.window.showInformationMessage(
                `Analyzed ${analyzed} files. Check Scout Analyzer in left sidebar for results.`,
            );
        },
    );

    // Analyze All Below command (recursive)
    const analyzeAllBelowCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.analyzeAllBelow",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || !diagnosticsProvider || !scoutConsole) {
                vscode.window.showWarningMessage("No active editor");
                return;
            }

            const originalUri = editor.document.uri;
            const originalColumn = editor.viewColumn;
            scoutConsole.logMessage("🔍 Analyzing recursively...");

            const currentDir = path.dirname(editor.document.uri.fsPath);
            const files = await findLogFiles(currentDir, true);

            scoutConsole.logMessage(`Found ${files.length} log files`);

            let analyzed = 0;
            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                diagnosticsProvider.analyzeDocument(doc);
                analyzed++;
            }

            // Return focus to original file
            const originalDoc =
                await vscode.workspace.openTextDocument(originalUri);
            await vscode.window.showTextDocument(originalDoc, {
                viewColumn: originalColumn,
                preserveFocus: false,
                preview: false,
            });

            scoutConsole.logMessage(`✓ Analyzed ${analyzed} files recursively`);
            vscode.window.showInformationMessage(
                `Analyzed ${analyzed} files. Check Scout Analyzer in left sidebar for results.`,
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

    // Toggle Console Location command
    const toggleConsoleLocationCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.toggleConsoleLocation",
        () => {
            if (scoutConsole) {
                scoutConsole.toggleOutputLocation();
                analyzerTreeProvider?.refresh(); // Refresh sidebar to show new location
            }
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
                                : diag.severity ===
                                    vscode.DiagnosticSeverity.Warning
                                  ? "warning"
                                  : diag.severity ===
                                      vscode.DiagnosticSeverity.Hint
                                    ? "debug"
                                    : "info";

                        const line = editor.document.lineAt(
                            diag.range.start.line,
                        );
                        const messageLines = diag.message.split("\n");
                        const mainMessage = messageLines[0];
                        const extractedTimestamp = extractTimestamp(line.text);
                        const category = extractCategory(line.text);

                        return {
                            severity,
                            line: diag.range.start.line,
                            column: diag.range.start.character,
                            message: mainMessage,
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
                            context: line.text,
                            timestamp: extractedTimestamp,
                            category: category,
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
            const config =
                vscode.workspace.getConfiguration("logScoutAnalyzer");
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
                    timelineTreeProvider?.setShowSignificantEvents(
                        !currentValue,
                    );
                    vscode.window.showInformationMessage(
                        `Timeline now showing: ${!currentValue ? "Significant Events" : "All Issues"}`,
                    );
                });
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
            const diagnostics = vscode.languages.getDiagnostics(
                editor.document.uri,
            );
            const timelineEvents: TimelineEvent[] = [];

            diagnostics.forEach((diag) => {
                const line = editor.document.lineAt(diag.range.start.line);
                const timestamp = extractTimestamp(line.text);
                const category = extractCategory(line.text);

                if (timestamp) {
                    const severity =
                        diag.severity === vscode.DiagnosticSeverity.Error
                            ? "error"
                            : diag.severity ===
                                vscode.DiagnosticSeverity.Warning
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

            timelineVisualization?.showTimelinePanel(
                timelineEvents,
                editor.document,
            );
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
            const sipEvents = SipCallFlowParser.parseSipMessages(
                editor.document,
            );

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

    // Register all commands
    context.subscriptions.push(
        analyzeCommand,
        clearCommand,
        showPatternsCommand,
        showVersionCommand,
        jumpToLineCommand,
        refreshResultsCommand,
        showConsoleCommand,
        clearConsoleCommand,
        groupBySeverityCommand,
        groupByCategoryCommand,
        groupByFileCommand,
        resetViewCommand,
        exportResultsCommand,
        analyzeDirectoryCommand,
        analyzeAllBelowCommand,
        openAnalyzerPanelCommand,
        openScoutViewCommand,
        toggleConsoleLocationCommand,
        openSplitViewCommand,
        closeSplitViewCommand,
        setTimeframeCommand,
        toggleSignificantEventsCommand,
        showTimelineVisualizationCommand,
        showLadderDiagramCommand,
    );

    // Register document change listeners
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
        (document) => {
            if (isLogFile(document) && diagnosticsProvider && outputChannel) {
                outputChannel.appendLine("");
                outputChannel.appendLine(
                    `[${new Date().toISOString()}] 📂 Auto-analyzing opened file`,
                );
                outputChannel.appendLine(`   → ${document.fileName}`);

                // Show prompt for analysis
                const config =
                    vscode.workspace.getConfiguration("logScoutAnalyzer");
                const autoPrompt = config.get<boolean>(
                    "autoPromptOnOpen",
                    true,
                );

                if (autoPrompt) {
                    vscode.window
                        .showInformationMessage(
                            `Log file detected: ${document.fileName.split(/[\\/]/).pop()}`,
                            "Analyze Now",
                            "Analyze Later",
                            "Don't Ask Again",
                        )
                        .then((choice) => {
                            if (
                                choice === "Analyze Now" &&
                                diagnosticsProvider
                            ) {
                                vscode.commands.executeCommand(
                                    "logScoutAnalyzer.analyzeFile",
                                );
                            } else if (choice === "Don't Ask Again") {
                                config.update(
                                    "autoPromptOnOpen",
                                    false,
                                    vscode.ConfigurationTarget.Global,
                                );
                            }
                        });
                } else {
                    // Auto-analyze if prompt is disabled
                    diagnosticsProvider.analyzeDocument(document);
                }
            }
            updateStatusBar();
        },
    );

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
        (event) => {
            if (isLogFile(event.document) && diagnosticsProvider) {
                // Debounce analysis on change
                setTimeout(() => {
                    if (diagnosticsProvider) {
                        diagnosticsProvider.analyzeDocument(event.document);
                    }
                }, 500);
            }
        },
    );

    const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(
        (document) => {
            if (isLogFile(document) && diagnosticsProvider) {
                diagnosticsProvider.analyzeDocument(document);
            }
        },
    );

    const onDidChangeActiveTextEditor =
        vscode.window.onDidChangeActiveTextEditor(() => {
            updateStatusBar();
            analyzerTreeProvider?.refresh();
        });

    context.subscriptions.push(
        onDidOpenTextDocument,
        onDidChangeTextDocument,
        onDidSaveTextDocument,
        onDidChangeActiveTextEditor,
    );

    // Analyze currently open log files
    let analyzedCount = 0;
    vscode.workspace.textDocuments.forEach((document) => {
        if (isLogFile(document) && diagnosticsProvider) {
            diagnosticsProvider.analyzeDocument(document);
            analyzedCount++;
        }
    });

    if (outputChannel && analyzedCount > 0) {
        outputChannel.appendLine(
            `✓ Auto-analyzed ${analyzedCount} open log file(s)`,
        );
        outputChannel.appendLine("");
    }

    if (outputChannel) {
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine(`✅ Extension ready! ${getBuildInfo()}`);
        outputChannel.appendLine(
            "   🔍 Click Scout icon in activity bar to open views",
        );
        outputChannel.appendLine(
            "   📺 Scout Console available in bottom panel",
        );
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine("");
    }

    scoutConsole.logMessage("✅ All features initialized and ready");
    scoutConsole.logMessage("   • Results Tree View");
    scoutConsole.logMessage("   • Categories Tree View");
    scoutConsole.logMessage("   • Timeline Tree View");
    scoutConsole.logMessage("   • Real-time Console Output");
    scoutConsole.logMessage("");

    console.log(`${getBuildInfo()}: All features registered`);
}

export function deactivate() {
    if (outputChannel) {
        outputChannel.appendLine("");
        outputChannel.appendLine("─".repeat(60));
        outputChannel.appendLine(`❌ ${getBuildInfo()} deactivated`);
        outputChannel.appendLine(`   Time: ${new Date().toISOString()}`);
        outputChannel.appendLine("─".repeat(60));
        outputChannel.dispose();
    }

    if (scoutConsole) {
        scoutConsole.logMessage("");
        scoutConsole.logMessage("╔════════════════════════════════════════╗");
        scoutConsole.logMessage("║   SCOUT CONSOLE DEACTIVATED           ║");
        scoutConsole.logMessage("╚════════════════════════════════════════╝");
    }

    if (statusBarItem) {
        statusBarItem.dispose();
    }

    console.log(`${getBuildInfo()} deactivated`);
    diagnosticsProvider = undefined;
    patternEngine = undefined;
    outputChannel = undefined;
    statusBarItem = undefined;
    resultsTreeProvider = undefined;
    categoriesTreeProvider = undefined;
    timelineTreeProvider = undefined;
    scoutConsole = undefined;
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

    // Check file extensions
    const fileName = document.fileName.toLowerCase();
    const logExtensions = [".log", ".txt", ".out", ".err"];

    return logExtensions.some((ext) => fileName.endsWith(ext));
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

    const editor = vscode.window.activeTextEditor;
    if (editor && isLogFile(editor.document)) {
        const diagnostics = vscode.languages.getDiagnostics(
            editor.document.uri,
        );
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

        if (diagnostics.length === 0) {
            statusBarItem.text = `$(search) Scout: Analyze${eventText}`;
            statusBarItem.backgroundColor = undefined;
        } else {
            // Show all counts in status bar with events
            statusBarItem.text = `$(search) Scout: 🔴 ${errorCount} 🟡 ${warningCount} 🔵 ${infoCount}${eventText}`;
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
        statusBarItem.backgroundColor = undefined;
    }

    // Always show status bar (permanent)
    statusBarItem.show();
}

function generatePatternsHtml(patterns: {
    errors: string[];
    warnings: string[];
    info: string[];
}): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Log Scout Patterns</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        h1 {
            color: var(--vscode-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 30px;
        }
        .pattern-list {
            list-style: none;
            padding: 0;
        }
        .pattern-item {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 10px;
            margin: 5px 0;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .error-pattern {
            border-left: 4px solid #f44336;
        }
        .warning-pattern {
            border-left: 4px solid #ff9800;
        }
        .info-pattern {
            border-left: 4px solid #2196f3;
        }
    </style>
</head>
<body>
    <h1>📋 Log Scout Analyzer - Configured Patterns</h1>

    <h2>🔴 Error Patterns (${patterns.errors.length})</h2>
    <ul class="pattern-list">
        ${patterns.errors.map((p) => `<li class="pattern-item error-pattern">${escapeHtml(p)}</li>`).join("")}
    </ul>

    <h2>🟡 Warning Patterns (${patterns.warnings.length})</h2>
    <ul class="pattern-list">
        ${patterns.warnings.map((p) => `<li class="pattern-item warning-pattern">${escapeHtml(p)}</li>`).join("")}
    </ul>

    <h2>🔵 Info Patterns (${patterns.info.length})</h2>
    <ul class="pattern-list">
        ${patterns.info.map((p) => `<li class="pattern-item info-pattern">${escapeHtml(p)}</li>`).join("")}
    </ul>
</body>
</html>
    `;
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
