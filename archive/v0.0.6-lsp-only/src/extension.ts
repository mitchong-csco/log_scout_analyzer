/**
 * Log Scout Analyzer - VS Code Extension
 *
 * LSP client for log file analysis with SIP/VoIP pattern matching
 * and RFC annotations.
 *
 * Now includes TagScout UI for batch analysis of log archives.
 */

import * as path from "path";
import * as vscode from "vscode";
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from "vscode-languageclient/node";

// TagScout UI components
import { TagScoutAnalyzerProvider } from "./tagscout/analyzerTreeProvider";
import { FileSelector } from "./tagscout/fileSelector";
import { TagScoutAnalyzer } from "./tagscout/analyzer";
import { AnalysisPanel } from "./tagscout/analysisPanel";

let client: LanguageClient | undefined;

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log("Log Scout Analyzer extension activating...");

    // Get configuration
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const remoteHost = config.get<string>("serverHost");
    const remotePort = config.get<number>("serverPort", 8080);
    const customServerPath = config.get<string>("serverPath");
    const traceLevel = config.get<string>("trace.server", "off");

    let serverOptions: ServerOptions;

    // Determine server mode: remote or local
    if (remoteHost) {
        // Remote server mode (TCP)
        console.log(`Using remote LSP server at ${remoteHost}:${remotePort}`);
        serverOptions = () => {
            return new Promise((resolve) => {
                const net = require("net");
                const socket = net.connect({
                    port: remotePort,
                    host: remoteHost,
                });
                resolve({
                    reader: socket,
                    writer: socket,
                });
            });
        };
    } else {
        // Local server mode (embedded binary)
        const serverPath = getServerPath(context, customServerPath);
        console.log(`Using local LSP server: ${serverPath}`);

        serverOptions = {
            run: {
                command: serverPath,
                args: [],
                options: {
                    env: {
                        ...process.env,
                        RUST_LOG: traceLevel === "verbose" ? "debug" : "info",
                    },
                },
            },
            debug: {
                command: serverPath,
                args: [],
                options: {
                    env: {
                        ...process.env,
                        RUST_LOG: "debug",
                    },
                },
            },
        };
    }

    // Client options
    const clientOptions: LanguageClientOptions = {
        // Register for log files
        documentSelector: [
            { scheme: "file", language: "log" },
            { scheme: "file", pattern: "**/*.log" },
            { scheme: "file", pattern: "**/*.txt" },
            { scheme: "untitled", language: "log" },
        ],
        synchronize: {
            // Notify server of configuration changes
            configurationSection: "logScoutAnalyzer",
            fileEvents: vscode.workspace.createFileSystemWatcher("**/*.log"),
        },
        outputChannelName: "Log Scout Analyzer",
        traceOutputChannel:
            traceLevel !== "off"
                ? vscode.window.createOutputChannel("Log Scout Analyzer Trace")
                : undefined,
    };

    // Create and start the language client
    client = new LanguageClient(
        "logScoutAnalyzer",
        "Log Scout Analyzer",
        serverOptions,
        clientOptions,
    );

    // Start the client (this will also launch the server)
    client
        .start()
        .then(() => {
            console.log("Log Scout Analyzer LSP client started");

            // Initialize TagScout UI now that LSP is ready
            if (client) {
                initializeTagScoutUI(context, client);
            }

            vscode.window.showInformationMessage(
                "Log Scout Analyzer is ready!",
            );
        })
        .catch((error) => {
            console.error("Failed to start LSP client:", error);
            vscode.window.showErrorMessage(
                `Failed to start Log Scout Analyzer: ${error.message}`,
            );
        });

    // Register LSP commands
    registerCommands(context);

    // Register status bar
    createStatusBar(context);
}

/**
 * Initialize TagScout UI for batch analysis
 */
function initializeTagScoutUI(
    context: vscode.ExtensionContext,
    lspClient: LanguageClient,
): void {
    console.log("Initializing TagScout UI...");

    // Create tree provider for sidebar
    const treeProvider = new TagScoutAnalyzerProvider(context);
    const treeView = vscode.window.createTreeView("tagscoutFileAnalyzer", {
        treeDataProvider: treeProvider,
        showCollapseAll: false,
    });

    // File selector
    const fileSelector = new FileSelector(context, treeProvider);
    fileSelector.loadPersistedFile();

    // Analyzer - pass the LSP client so it can use TagScout MongoDB patterns
    const analyzer = new TagScoutAnalyzer(lspClient);

    // Register TagScout commands
    context.subscriptions.push(
        // Select file
        vscode.commands.registerCommand("tagscout.selectFile", async () => {
            await fileSelector.selectFile();
        }),

        // Change file
        vscode.commands.registerCommand("tagscout.changeFile", async () => {
            await fileSelector.changeFile();
        }),

        // Analyze file
        vscode.commands.registerCommand("tagscout.analyzeFile", async () => {
            const currentFile = treeProvider.getCurrentFile();
            if (!currentFile) {
                vscode.window.showErrorMessage("No file selected");
                return;
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "Analyzing logs with TagScout...",
                    cancellable: true,
                },
                async (progress, token) => {
                    try {
                        treeProvider.setAnalysisInProgress(true);

                        const results = await analyzer.analyze(
                            currentFile,
                            progress,
                            token,
                        );

                        if (!token.isCancellationRequested) {
                            treeProvider.setLastResults(results);
                            AnalysisPanel.createOrShow(
                                context.extensionUri,
                                results,
                            );

                            vscode.window.showInformationMessage(
                                `Analysis complete: ${results.totalMatches} matches found`,
                            );
                        }
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `Analysis failed: ${error}`,
                        );
                    } finally {
                        treeProvider.setAnalysisInProgress(false);
                    }
                },
            );
        }),

        // Analyze from Explorer context menu
        vscode.commands.registerCommand(
            "tagscout.analyzeFileFromExplorer",
            async (uri: vscode.Uri) => {
                await fileSelector.setFile(uri.fsPath);
                const currentFile = treeProvider.getCurrentFile();
                if (currentFile) {
                    await vscode.commands.executeCommand(
                        "tagscout.analyzeFile",
                    );
                }
            },
        ),

        // View results
        vscode.commands.registerCommand("tagscout.viewResults", async () => {
            const results = treeProvider.getLastResults();
            if (results) {
                AnalysisPanel.createOrShow(context.extensionUri, results);
            } else {
                vscode.window.showInformationMessage(
                    "No analysis results available",
                );
            }
        }),

        treeView,
    );

    console.log("TagScout UI initialized");
}

/**
 * Deactivate the extension
 */
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    console.log("Log Scout Analyzer extension deactivating...");
    return client.stop();
}

/**
 * Get the path to the LSP server binary
 */
function getServerPath(
    context: vscode.ExtensionContext,
    customPath?: string,
): string {
    if (customPath) {
        return customPath;
    }

    // Detect platform and architecture
    const platform = process.platform;
    const arch = process.arch;

    let serverExecutable: string;

    if (platform === "win32") {
        serverExecutable = "log-scout-lsp-server-win.exe";
    } else if (platform === "darwin") {
        serverExecutable =
            arch === "arm64"
                ? "log-scout-lsp-server-macos-arm"
                : "log-scout-lsp-server-macos";
    } else if (platform === "linux") {
        serverExecutable = "log-scout-lsp-server-linux";
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const serverPath = context.asAbsolutePath(
        path.join("bin", serverExecutable),
    );
    return serverPath;
}

/**
 * Register extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
    // Analyze current log file
    const analyzeCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.analyze",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage("No active editor");
                return;
            }

            if (!client) {
                vscode.window.showErrorMessage("LSP client not initialized");
                return;
            }

            try {
                await client.sendRequest("workspace/executeCommand", {
                    command: "logScout.analyze",
                    arguments: [editor.document.uri.toString()],
                });
                vscode.window.showInformationMessage("Analysis complete");
            } catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            }
        },
    );

    // Show timeline visualization
    const timelineCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.showTimeline",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage("No active editor");
                return;
            }

            if (!client) {
                vscode.window.showErrorMessage("LSP client not initialized");
                return;
            }

            try {
                await client.sendRequest("workspace/executeCommand", {
                    command: "logScout.showTimeline",
                    arguments: [editor.document.uri.toString()],
                });
                vscode.window.showInformationMessage(
                    "Timeline visualization opened",
                );
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to show timeline: ${error}`,
                );
            }
        },
    );

    // Export results
    const exportCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.exportResults",
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage("No active editor");
                return;
            }

            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file("log-analysis-results.json"),
                filters: {
                    JSON: ["json"],
                    Text: ["txt"],
                    "All Files": ["*"],
                },
            });

            if (!saveUri) {
                return;
            }

            if (!client) {
                vscode.window.showErrorMessage("LSP client not initialized");
                return;
            }

            try {
                await client.sendRequest("workspace/executeCommand", {
                    command: "logScout.exportResults",
                    arguments: [editor.document.uri.toString(), saveUri.fsPath],
                });
                vscode.window.showInformationMessage(
                    `Results exported to ${saveUri.fsPath}`,
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Export failed: ${error}`);
            }
        },
    );

    // Restart server
    const restartCommand = vscode.commands.registerCommand(
        "logScoutAnalyzer.restartServer",
        async () => {
            if (!client) {
                vscode.window.showWarningMessage("LSP client not running");
                return;
            }

            try {
                await client.stop();
                await client.start();
                vscode.window.showInformationMessage("LSP server restarted");
            } catch (error) {
                vscode.window.showErrorMessage(
                    `Failed to restart server: ${error}`,
                );
            }
        },
    );

    context.subscriptions.push(
        analyzeCommand,
        timelineCommand,
        exportCommand,
        restartCommand,
    );
}

/**
 * Create status bar item
 */
function createStatusBar(context: vscode.ExtensionContext): void {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );

    statusBarItem.text = "$(search) Scout";
    statusBarItem.tooltip = "Log Scout Analyzer: Click to analyze";
    statusBarItem.command = "logScoutAnalyzer.analyze";
    statusBarItem.show();

    context.subscriptions.push(statusBarItem);

    // Update status bar when active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.languageId === "log") {
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }
        }),
    );

    // Show/hide based on current editor
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === "log") {
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}
