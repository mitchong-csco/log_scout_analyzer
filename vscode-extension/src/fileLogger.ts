import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class FileLogger {
  private logFilePath: string;
  private enabled: boolean = true;
  private lspLogPath: string;

  constructor(context: vscode.ExtensionContext) {
    // Log to workspace storage directory
    const storageUri = context.storageUri || context.globalStorageUri;
    const logDir = storageUri.fsPath;

    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create log file with date
    const date = new Date().toISOString().split("T")[0];
    this.logFilePath = path.join(logDir, `log-scout-extension-${date}.log`);

    // LSP server log path (shared location)
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const lspLogDir = homeDir
      ? path.join(homeDir, ".log-scout-analyzer")
      : logDir;
    if (!fs.existsSync(lspLogDir)) {
      fs.mkdirSync(lspLogDir, { recursive: true });
    }
    this.lspLogPath = path.join(lspLogDir, `lsp-server-${date}.log`);

    // Initialize log file with header
    const header = `\n${"=".repeat(80)}\nLog Scout Analyzer Extension - Session Started: ${new Date().toISOString()}\n${"=".repeat(80)}\n`;
    fs.appendFileSync(this.logFilePath, header);

    this.log(`Extension log file: ${this.logFilePath}`);
    this.log(`LSP server log file: ${this.lspLogPath}`);
  }

  public log(message: string): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;

    try {
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  public logLSP(
    message: string,
    level: "info" | "warn" | "error" | "debug" = "info",
  ): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const logLine = `[${timestamp}] [LSP] [${levelStr}] ${message}\n`;

    try {
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error("Failed to write LSP log:", error);
    }
  }

  public logAnalysisStart(fileName: string, uri: vscode.Uri): void {
    this.log(`\n▶ Analysis started: ${fileName}`);
    this.log(`  URI: ${uri.toString()}`);
  }

  public logResult(
    severity: "error" | "warning" | "info" | "debug",
    line: number,
    message: string,
    category?: string,
    _timestamp?: Date,
    _fileUri?: vscode.Uri,
  ): void {
    const severityIcon = {
      error: "ERROR",
      warning: "WARN ",
      info: "INFO ",
      debug: "DEBUG",
    }[severity];

    const cat = category ? `[${category}] ` : "";

    this.log(`  ${severityIcon} Line ${line + 1}: ${cat}${message}`);
  }

  public logAnalysisComplete(
    errorCount: number,
    warningCount: number,
    infoCount: number,
    debugCount: number,
    duration: number,
  ): void {
    this.log(
      `✓ Analysis complete: ${errorCount}E ${warningCount}W ${infoCount}I ${debugCount}D (${duration}ms)`,
    );
  }

  public logCacheOperation(message: string): void {
    this.log(`  📦 ${message}`);
  }

  public logExport(fileName: string, resultCount: number): void {
    this.log(`📤 Export: ${fileName} (${resultCount} results)`);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.log(enabled ? "Logging enabled" : "Logging disabled");
  }

  public getLSPLogPath(): string {
    return this.lspLogPath;
  }

  public getLogPath(): string {
    return this.logFilePath;
  }

  public logLSPInitialization(mode: "local" | "remote", details: string): void {
    this.logLSP(`Initializing LSP client in ${mode} mode: ${details}`, "info");
  }

  public logLSPConnection(
    success: boolean,
    version?: string,
    name?: string,
  ): void {
    if (success) {
      const info = version
        ? `${name || "LSP Server"} v${version}`
        : "connected";
      this.logLSP(`Successfully connected - ${info}`, "info");
    } else {
      this.logLSP("Failed to connect", "error");
    }
  }

  public logLSPDiagnostics(uri: string, count: number): void {
    this.logLSP(`Received ${count} diagnostics for ${uri}`, "debug");
  }

  public logLSPRequest(method: string, params?: any): void {
    const paramsStr = params ? ` with params: ${JSON.stringify(params)}` : "";
    this.logLSP(`Sending request: ${method}${paramsStr}`, "debug");
  }

  public logLSPResponse(
    method: string,
    success: boolean,
    error?: string,
  ): void {
    if (success) {
      this.logLSP(`Response received for: ${method}`, "debug");
    } else {
      this.logLSP(`Response error for: ${method} - ${error}`, "error");
    }
  }

  public logLSPNotification(method: string, params?: any): void {
    const paramsStr = params
      ? ` - ${JSON.stringify(params).substring(0, 100)}`
      : "";
    this.logLSP(`Notification: ${method}${paramsStr}`, "debug");
  }

  public logLSPError(error: string, context?: string): void {
    const contextStr = context ? ` [${context}]` : "";
    this.logLSP(`Error${contextStr}: ${error}`, "error");
  }

  public dispose(): void {
    this.log(
      `${"=".repeat(80)}\nSession ended: ${new Date().toISOString()}\n${"=".repeat(80)}\n`,
    );
  }
}
