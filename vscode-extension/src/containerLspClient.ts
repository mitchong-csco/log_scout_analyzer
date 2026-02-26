import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from "vscode-languageclient/node";
import { FileLogger } from "./fileLogger";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

let client: LanguageClient | undefined;
let logger: FileLogger | undefined;
let containerId: string | undefined;

/**
 * Set the file logger instance
 */
export function setContainerLSPLogger(fileLogger: FileLogger): void {
  logger = fileLogger;
}

/**
 * Pull and run LSP server in Docker container
 */
async function pullAndRunLSPContainer(
  imageTag: string = "latest",
  outputChannel: vscode.OutputChannel,
): Promise<string> {
  const imageName = `containers.cisco.com/log-scout-lsp-server:${imageTag}`;
  
  try {
    outputChannel.appendLine(`🐳 Pulling LSP server container: ${imageName}`);
    logger?.logLSP(`Pulling container: ${imageName}`, "info");

    // Pull the container
    await execAsync(`docker pull ${imageName}`);
    
    outputChannel.appendLine(`🐳 Starting LSP server container...`);
    logger?.logLSP("Starting LSP container", "info");

    // Run the container with stdio communication
    const { stdout } = await execAsync(
      `docker run --rm -i --name log-scout-lsp-${Date.now()} ${imageName} --stdio`,
      { encoding: 'utf8' }
    );

    return stdout.trim();
  } catch (error: any) {
    outputChannel.appendLine(`❌ Failed to start LSP container: ${error.message}`);
    logger?.logLSPError(error.message, "pullAndRunLSPContainer");
    throw error;
  }
}

/**
 * Initialize and start the LSP client using container
 */
export async function startContainerLSPClient(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
): Promise<LanguageClient | undefined> {
  try {
    outputChannel.appendLine("🐳 Initializing containerized LSP client...");
    logger?.logLSP("Initializing containerized LSP client", "info");

    // Get configuration
    const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
    const containerImage = config.get<string>("lsp.containerImage", "containers.cisco.com/log-scout-lsp-server:latest");
    const remoteHost = config.get<string>("lsp.serverHost");
    const remotePort = config.get<number>("lsp.serverPort", 8080);
    const traceLevel = config.get<string>("lsp.trace", "off");

    let serverOptions: ServerOptions;

    // Determine server mode: remote TCP, container, or local binary
    if (remoteHost) {
      // Remote server mode (TCP)
      outputChannel.appendLine(
        `📡 Using remote LSP server at ${remoteHost}:${remotePort}`,
      );
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

          socket.on("error", (err: Error) => {
            reject(err);
          });
        });
      };
    } else if (config.get<boolean>("lsp.useContainer", false)) {
      // Container mode
      outputChannel.appendLine(`🐳 Using containerized LSP server: ${containerImage}`);
      logger?.logLSPInitialization("container", containerImage);

      serverOptions = () => {
        return new Promise((resolve, reject) => {
          const spawn = require("child_process").spawn;
          
          // Start Docker container
          const container = spawn("docker", [
            "run", "--rm", "-i", 
            "--name", `log-scout-lsp-${Date.now()}`,
            containerImage,
            "--stdio"
          ]);

          containerId = container.pid?.toString();

          container.on("error", (err: Error) => {
            reject(err);
          });

          container.on("spawn", () => {
            resolve({
              reader: container.stdout,
              writer: container.stdin,
            });
          });

          // Handle container exit
          container.on("close", (code: number) => {
            if (code !== 0) {
              logger?.logLSPError(`Container exited with code ${code}`, "containerLSP");
            }
            containerId = undefined;
          });
        });
      };
    } else {
      // Fall back to local binary mode
      outputChannel.appendLine("📦 Container mode disabled, falling back to local binary");
      logger?.logLSP("Falling back to local binary", "info");
      
      // Import and use the regular LSP client
      const { startLSPClient } = require("./lspClient");
      return await startLSPClient(context, outputChannel);
    }

    // Client options
    const clientOptions: LanguageClientOptions = {
      // Register for log files
      documentSelector: [
        { scheme: "file", language: "log" },
        { scheme: "file", pattern: "**/*.log" },
        { scheme: "file", pattern: "**/*.log.*" },
        { scheme: "file", pattern: "**/log.[0-9]*" },
        { scheme: "file", pattern: "**/*.txt" },
        { scheme: "file", pattern: "**/*.out" },
        { scheme: "file", pattern: "**/*.err" },
        { scheme: "untitled", language: "log" },
      ],
      synchronize: {
        configurationSection: "logScoutAnalyzer",
        fileEvents: vscode.workspace.createFileSystemWatcher("**/*.log"),
      },
      outputChannelName: "Log Scout Analyzer LSP (Container)",
      traceOutputChannel:
        traceLevel !== "off"
          ? vscode.window.createOutputChannel("Log Scout Analyzer LSP Trace (Container)")
          : undefined,
    };

    // Create and start the language client
    client = new LanguageClient(
      "logScoutAnalyzerContainer",
      "Log Scout Analyzer (Container)",
      serverOptions,
      clientOptions,
    );

    outputChannel.appendLine("🚀 Starting containerized LSP client...");
    logger?.logLSP("Starting containerized LSP client", "info");
    await client.start();

    outputChannel.appendLine("✅ Containerized LSP client started successfully");
    outputChannel.appendLine("🔗 Connected to containerized TagScout pattern engine");
    logger?.logLSPConnection(
      true,
      client.initializeResult?.serverInfo?.version,
      client.initializeResult?.serverInfo?.name,
    );

    // Set up diagnostic handlers
    setupDiagnosticHandlers(client, outputChannel);

    return client;
  } catch (error: any) {
    outputChannel.appendLine(`❌ Failed to start containerized LSP client: ${error.message}`);
    logger?.logLSPError(error.message, "startContainerLSPClient");
    
    // Show user-friendly error
    const retryOption = "Retry with Local Binary";
    const result = await vscode.window.showErrorMessage(
      `Failed to start containerized LSP: ${error.message}`,
      retryOption,
      "Cancel"
    );

    if (result === retryOption) {
      // Fall back to local binary
      const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
      await config.update("lsp.useContainer", false, vscode.ConfigurationTarget.Global);
      
      const { startLSPClient } = require("./lspClient");
      return await startLSPClient(context, outputChannel);
    }

    return undefined;
  }
}

/**
 * Stop the containerized LSP client
 */
export async function stopContainerLSPClient(): Promise<void> {
  if (client) {
    logger?.logLSP("Stopping containerized LSP client", "info");
    await client.stop();
    client = undefined;
    logger?.logLSP("Containerized LSP client stopped", "info");
  }

  // Clean up container if running
  if (containerId) {
    try {
      await execAsync(`docker stop log-scout-lsp-${containerId}`);
      containerId = undefined;
    } catch (error) {
      logger?.logLSPError(`Failed to stop container: ${error}`, "stopContainerLSPClient");
    }
  }
}

/**
 * Get the active containerized LSP client
 */
export function getContainerLSPClient(): LanguageClient | undefined {
  return client;
}

/**
 * Set up handlers for LSP diagnostics
 */
function setupDiagnosticHandlers(
  lspClient: LanguageClient,
  outputChannel: vscode.OutputChannel,
): void {
  lspClient.onNotification("textDocument/publishDiagnostics", (params: any) => {
    const uri = vscode.Uri.parse(params.uri);
    const diagnostics = params.diagnostics as vscode.Diagnostic[];

    outputChannel.appendLine(
      `📊 Received ${diagnostics.length} diagnostics from containerized LSP for ${uri.fsPath}`,
    );
    logger?.logLSPDiagnostics(uri.fsPath, diagnostics.length);

    const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("log-scout-lsp-container");
    diagnosticCollection.set(uri, diagnostics);
  });

  outputChannel.appendLine("✅ Containerized LSP diagnostic handlers configured");
  logger?.logLSP("Containerized LSP diagnostic handlers configured", "info");
}
