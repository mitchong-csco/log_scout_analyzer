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
exports.setLSPLogger = setLSPLogger;
exports.startLSPClient = startLSPClient;
exports.stopLSPClient = stopLSPClient;
exports.getLSPClient = getLSPClient;
exports.getLSPServerVersion = getLSPServerVersion;
exports.getLSPServerName = getLSPServerName;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
let client;
let logger;
/**
 * Get the path to the LSP server binary
 */
function getServerPath(context) {
    const platform = process.platform;
    const binDir = path.join(context.extensionPath, "bin");
    let serverExecutable;
    if (platform === "win32") {
        serverExecutable = path.join(binDir, "log-scout-lsp-server-win.exe");
    }
    else if (platform === "linux") {
        serverExecutable = path.join(binDir, "log-scout-lsp-server-linux");
    }
    else if (platform === "darwin") {
        serverExecutable = path.join(binDir, "log-scout-lsp-server-mac");
    }
    else {
        throw new Error(`Unsupported platform: ${platform}`);
    }
    // Check if server binary exists
    if (!fs.existsSync(serverExecutable)) {
        throw new Error(`LSP server binary not found: ${serverExecutable}\n\n` +
            `Please build the LSP server:\n` +
            `  cd lsp-server\n` +
            `  cargo build --release\n` +
            `Then copy the binary to: ${binDir}`);
    }
    return serverExecutable;
}
/**
 * Set the file logger instance
 */
function setLSPLogger(fileLogger) {
    logger = fileLogger;
}
/**
 * Initialize and start the LSP client
 */
async function startLSPClient(context, outputChannel) {
    try {
        outputChannel.appendLine("🔌 Initializing LSP client...");
        logger?.logLSP("Initializing LSP client", "info");
        // Get configuration
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const remoteHost = config.get("lsp.serverHost");
        const remotePort = config.get("lsp.serverPort", 8080);
        const traceLevel = config.get("lsp.trace", "off");
        let serverOptions;
        // Determine server mode: remote or local
        if (remoteHost) {
            // Remote server mode (TCP)
            outputChannel.appendLine(`📡  Using remote LSP server at ${remoteHost}:${remotePort}`);
            logger?.logLSPInitialization("remote", `${remoteHost}:${remotePort}`);
            serverOptions = () => {
                return new Promise((resolve, reject) => {
                    const net = require("net");
                    const socket = net.connect({
                        port: remotePort,
                        host: remoteHost,
                    });
                    socket.on("connect", () => {
                        resolve({
                            reader: socket,
                            writer: socket,
                        });
                    });
                    socket.on("error", (err) => {
                        reject(err);
                    });
                });
            };
        }
        else {
            // Local server mode (embedded binary)
            const serverPath = getServerPath(context);
            outputChannel.appendLine(`📦 Using local LSP server: ${serverPath}`);
            logger?.logLSPInitialization("local", serverPath);
            serverOptions = {
                run: {
                    command: serverPath,
                    args: [],
                    transport: node_1.TransportKind.stdio,
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
                    transport: node_1.TransportKind.stdio,
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
                { scheme: "file", pattern: "**/*.log.*" }, // Match jabber.log.1, app.log.2, etc.
                { scheme: "file", pattern: "**/log.[0-9]*" }, // Match log.1, log.2, etc.
                { scheme: "file", pattern: "**/*.txt" },
                { scheme: "file", pattern: "**/*.out" },
                { scheme: "file", pattern: "**/*.err" },
                { scheme: "untitled", language: "log" },
            ],
            synchronize: {
                // Notify server of configuration changes
                configurationSection: "logScoutAnalyzer",
                fileEvents: vscode.workspace.createFileSystemWatcher("**/*.log"),
            },
            outputChannelName: "Log Scout Analyzer LSP",
            traceOutputChannel: traceLevel !== "off"
                ? vscode.window.createOutputChannel("Log Scout Analyzer LSP Trace")
                : undefined,
        };
        // Create and start the language client
        client = new node_1.LanguageClient("logScoutAnalyzer", "Log Scout Analyzer", serverOptions, clientOptions);
        outputChannel.appendLine("🚀 Starting LSP client...");
        logger?.logLSP("Starting LSP client", "info");
        await client.start();
        outputChannel.appendLine("✅ LSP client started successfully");
        outputChannel.appendLine("🔗 Connected to TagScout pattern engine via LSP");
        logger?.logLSPConnection(true, client.initializeResult?.serverInfo?.version, client.initializeResult?.serverInfo?.name);
        // Log paths for easy access
        if (logger) {
            outputChannel.appendLine(`📝 Extension log: ${logger.getLogPath()}`);
            outputChannel.appendLine(`📝 LSP server log: ${logger.getLSPLogPath()}`);
        }
        // Set up diagnostic handler to process LSP diagnostics
        setupDiagnosticHandlers(client, outputChannel);
        return client;
    }
    catch (error) {
        outputChannel.appendLine(`❌ Failed to start LSP client: ${error.message}`);
        logger?.logLSPError(error.message, "startLSPClient");
        logger?.logLSPConnection(false);
        vscode.window.showErrorMessage(`Failed to start Log Scout Analyzer LSP: ${error.message}`);
        return undefined;
    }
}
/**
 * Stop the LSP client
 */
async function stopLSPClient() {
    if (client) {
        logger?.logLSP("Stopping LSP client", "info");
        await client.stop();
        client = undefined;
        logger?.logLSP("LSP client stopped", "info");
    }
}
/**
 * Get the active LSP client
 */
function getLSPClient() {
    return client;
}
/**
 * Get the LSP server version from the initialize result
 */
function getLSPServerVersion() {
    if (!client || !client.initializeResult) {
        return undefined;
    }
    return client.initializeResult.serverInfo?.version;
}
/**
 * Get the LSP server name from the initialize result
 */
function getLSPServerName() {
    if (!client || !client.initializeResult) {
        return undefined;
    }
    return client.initializeResult.serverInfo?.name;
}
/**
 * Set up handlers for LSP diagnostics
 * This allows the extension to process diagnostics from the LSP server
 */
function setupDiagnosticHandlers(lspClient, outputChannel) {
    // Handler for when LSP server publishes diagnostics
    lspClient.onNotification("textDocument/publishDiagnostics", (params) => {
        const uri = vscode.Uri.parse(params.uri);
        const diagnostics = params.diagnostics;
        // Log diagnostic information
        outputChannel.appendLine(`📊 Received ${diagnostics.length} diagnostics from LSP server for ${uri.fsPath}`);
        logger?.logLSPDiagnostics(uri.fsPath, diagnostics.length);
        // Publish diagnostics through VS Code's diagnostic collection
        const diagnosticCollection = vscode.languages.createDiagnosticCollection("log-scout-lsp");
        diagnosticCollection.set(uri, diagnostics);
        // Note: The extension can also listen to vscode.languages.onDidChangeDiagnostics
        // to react to these diagnostics in its UI components
    });
    outputChannel.appendLine("✅ LSP diagnostic handlers configured");
    logger?.logLSP("LSP diagnostic handlers configured", "info");
}
//# sourceMappingURL=lspClient.js.map