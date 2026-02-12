import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

/**
 * Get the path to the LSP server binary
 */
function getServerPath(context: vscode.ExtensionContext): string {
  const platform = process.platform;
  const binDir = path.join(context.extensionPath, "bin");
  
  let serverExecutable: string;
  if (platform === "win32") {
    serverExecutable = path.join(binDir, "log-scout-lsp-server-win.exe");
  } else if (platform === "linux") {
    serverExecutable = path.join(binDir, "log-scout-lsp-server-linux");
  } else if (platform === "darwin") {
    serverExecutable = path.join(binDir, "log-scout-lsp-server-mac");
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Check if server binary exists
  if (!fs.existsSync(serverExecutable)) {
    throw new Error(
      `LSP server binary not found: ${serverExecutable}\n\n` +
      `Please build the LSP server:\n` +
      `  cd lsp-server\n` +
      `  cargo build --release\n` +
      `Then copy the binary to: ${binDir}`
    );
  }

  return serverExecutable;
}

/**
 * Initialize and start the LSP client
 */
export async function startLSPClient(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): Promise<LanguageClient | undefined> {
  try {
    outputChannel.appendLine("🔌 Initializing LSP client...");

    // Get configuration
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const remoteHost = config.get<string>("lsp.serverHost");
    const remotePort = config.get<number>("lsp.serverPort", 8080);
    const traceLevel = config.get<string>("lsp.trace", "off");

    let serverOptions: ServerOptions;

    // Determine server mode: remote or local
    if (remoteHost) {
      // Remote server mode (TCP)
      outputChannel.appendLine(`📡  Using remote LSP server at ${remoteHost}:${remotePort}`);
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
          
          socket.on("error", (err: Error) => {
            reject(err);
          });
        });
      };
    } else {
      // Local server mode (embedded binary)
      const serverPath = getServerPath(context);
      outputChannel.appendLine(`📦 Using local LSP server: ${serverPath}`);
      
      serverOptions = {
        run: {
          command: serverPath,
          args: [],
          transport: TransportKind.stdio,
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
          transport: TransportKind.stdio,
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
        { scheme: "file", pattern: "**/*.log.*" },  // Match jabber.log.1, app.log.2, etc.
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
      traceOutputChannel:
        traceLevel !== "off"
          ? vscode.window.createOutputChannel("Log Scout Analyzer LSP Trace")
          : undefined,
    };

    // Create and start the language client
    client = new LanguageClient(
      "logScoutAnalyzer",
      "Log Scout Analyzer",
      serverOptions,
      clientOptions
    );

    outputChannel.appendLine("🚀 Starting LSP client...");
    await client.start();
    
    outputChannel.appendLine("✅ LSP client started successfully");
    outputChannel.appendLine("🔗 Connected to TagScout pattern engine via LSP");
    
    return client;
  } catch (error: any) {
    outputChannel.appendLine(`❌ Failed to start LSP client: ${error.message}`);
    vscode.window.showErrorMessage(
      `Failed to start Log Scout Analyzer LSP: ${error.message}`
    );
    return undefined;
  }
}

/**
 * Stop the LSP client
 */
export async function stopLSPClient(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

/**
 * Get the active LSP client
 */
export function getLSPClient(): LanguageClient | undefined {
  return client;
}

/**
 * Get the LSP server version from the initialize result
 */
export function getLSPServerVersion(): string | undefined {
  if (!client || !client.initializeResult) {
    return undefined;
  }
  return client.initializeResult.serverInfo?.version;
}

/**
 * Get the LSP server name from the initialize result
 */
export function getLSPServerName(): string | undefined {
  if (!client || !client.initializeResult) {
    return undefined;
  }
  return client.initializeResult.serverInfo?.name;
}
