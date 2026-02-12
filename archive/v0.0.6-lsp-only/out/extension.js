"use strict";
/**
 * Log Scout Analyzer - VS Code Extension
 *
 * LSP client for log file analysis with SIP/VoIP pattern matching
 * and RFC annotations.
 *
 * Now includes TagScout UI for batch analysis of log archives.
 */
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
// TagScout UI components
const analyzerTreeProvider_1 = require("./tagscout/analyzerTreeProvider");
const fileSelector_1 = require("./tagscout/fileSelector");
const analyzer_1 = require("./tagscout/analyzer");
const analysisPanel_1 = require("./tagscout/analysisPanel");
let client;
/**
 * Activate the extension
 */
function activate(context) {
    console.log("Log Scout Analyzer extension activating...");
    // Get configuration
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const remoteHost = config.get("serverHost");
    const remotePort = config.get("serverPort", 8080);
    const customServerPath = config.get("serverPath");
    const traceLevel = config.get("trace.server", "off");
    let serverOptions;
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
    }
    else {
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
    const clientOptions = {
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
        traceOutputChannel: traceLevel !== "off"
            ? vscode.window.createOutputChannel("Log Scout Analyzer Trace")
            : undefined,
    };
    // Create and start the language client
    client = new node_1.LanguageClient("logScoutAnalyzer", "Log Scout Analyzer", serverOptions, clientOptions);
    // Start the client (this will also launch the server)
    client
        .start()
        .then(() => {
        console.log("Log Scout Analyzer LSP client started");
        // Initialize TagScout UI now that LSP is ready
        if (client) {
            initializeTagScoutUI(context, client);
        }
        vscode.window.showInformationMessage("Log Scout Analyzer is ready!");
    })
        .catch((error) => {
        console.error("Failed to start LSP client:", error);
        vscode.window.showErrorMessage(`Failed to start Log Scout Analyzer: ${error.message}`);
    });
    // Register LSP commands
    registerCommands(context);
    // Register status bar
    createStatusBar(context);
}
/**
 * Initialize TagScout UI for batch analysis
 */
function initializeTagScoutUI(context, lspClient) {
    console.log("Initializing TagScout UI...");
    // Create tree provider for sidebar
    const treeProvider = new analyzerTreeProvider_1.TagScoutAnalyzerProvider(context);
    const treeView = vscode.window.createTreeView("tagscoutFileAnalyzer", {
        treeDataProvider: treeProvider,
        showCollapseAll: false,
    });
    // File selector
    const fileSelector = new fileSelector_1.FileSelector(context, treeProvider);
    fileSelector.loadPersistedFile();
    // Analyzer - pass the LSP client so it can use TagScout MongoDB patterns
    const analyzer = new analyzer_1.TagScoutAnalyzer(lspClient);
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
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing logs with TagScout...",
            cancellable: true,
        }, async (progress, token) => {
            try {
                treeProvider.setAnalysisInProgress(true);
                const results = await analyzer.analyze(currentFile, progress, token);
                if (!token.isCancellationRequested) {
                    treeProvider.setLastResults(results);
                    analysisPanel_1.AnalysisPanel.createOrShow(context.extensionUri, results);
                    vscode.window.showInformationMessage(`Analysis complete: ${results.totalMatches} matches found`);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Analysis failed: ${error}`);
            }
            finally {
                treeProvider.setAnalysisInProgress(false);
            }
        });
    }), 
    // Analyze from Explorer context menu
    vscode.commands.registerCommand("tagscout.analyzeFileFromExplorer", async (uri) => {
        await fileSelector.setFile(uri.fsPath);
        const currentFile = treeProvider.getCurrentFile();
        if (currentFile) {
            await vscode.commands.executeCommand("tagscout.analyzeFile");
        }
    }), 
    // View results
    vscode.commands.registerCommand("tagscout.viewResults", async () => {
        const results = treeProvider.getLastResults();
        if (results) {
            analysisPanel_1.AnalysisPanel.createOrShow(context.extensionUri, results);
        }
        else {
            vscode.window.showInformationMessage("No analysis results available");
        }
    }), treeView);
    console.log("TagScout UI initialized");
}
/**
 * Deactivate the extension
 */
function deactivate() {
    if (!client) {
        return undefined;
    }
    console.log("Log Scout Analyzer extension deactivating...");
    return client.stop();
}
/**
 * Get the path to the LSP server binary
 */
function getServerPath(context, customPath) {
    if (customPath) {
        return customPath;
    }
    // Detect platform and architecture
    const platform = process.platform;
    const arch = process.arch;
    let serverExecutable;
    if (platform === "win32") {
        serverExecutable = "log-scout-lsp-server-win.exe";
    }
    else if (platform === "darwin") {
        serverExecutable =
            arch === "arm64"
                ? "log-scout-lsp-server-macos-arm"
                : "log-scout-lsp-server-macos";
    }
    else if (platform === "linux") {
        serverExecutable = "log-scout-lsp-server-linux";
    }
    else {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    const serverPath = context.asAbsolutePath(path.join("bin", serverExecutable));
    return serverPath;
}
/**
 * Register extension commands
 */
function registerCommands(context) {
    // Analyze current log file
    const analyzeCommand = vscode.commands.registerCommand("logScoutAnalyzer.analyze", async () => {
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
        }
        catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
    });
    // Show timeline visualization
    const timelineCommand = vscode.commands.registerCommand("logScoutAnalyzer.showTimeline", async () => {
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
            vscode.window.showInformationMessage("Timeline visualization opened");
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to show timeline: ${error}`);
        }
    });
    // Export results
    const exportCommand = vscode.commands.registerCommand("logScoutAnalyzer.exportResults", async () => {
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
            vscode.window.showInformationMessage(`Results exported to ${saveUri.fsPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    });
    // Restart server
    const restartCommand = vscode.commands.registerCommand("logScoutAnalyzer.restartServer", async () => {
        if (!client) {
            vscode.window.showWarningMessage("LSP client not running");
            return;
        }
        try {
            await client.stop();
            await client.start();
            vscode.window.showInformationMessage("LSP server restarted");
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to restart server: ${error}`);
        }
    });
    context.subscriptions.push(analyzeCommand, timelineCommand, exportCommand, restartCommand);
}
/**
 * Create status bar item
 */
function createStatusBar(context) {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(search) Scout";
    statusBarItem.tooltip = "Log Scout Analyzer: Click to analyze";
    statusBarItem.command = "logScoutAnalyzer.analyze";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Update status bar when active editor changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.languageId === "log") {
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    }));
    // Show/hide based on current editor
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === "log") {
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
}
//# sourceMappingURL=extension.js.map