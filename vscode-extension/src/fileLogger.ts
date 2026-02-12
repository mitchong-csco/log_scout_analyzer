import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export class FileLogger {
  private logFilePath: string;
  private enabled: boolean = true;

  constructor(context: vscode.ExtensionContext) {
    // Log to workspace storage directory
    const storageUri = context.storageUri || context.globalStorageUri;
    const logDir = storageUri.fsPath;
    
    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create log file with date
    const date = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(logDir, `log-scout-${date}.log`);
    
    // Initialize log file with header
    const header = `\n${"=".repeat(80)}\nLog Scout Analyzer - Session Started: ${new Date().toISOString()}\n${"=".repeat(80)}\n`;
    fs.appendFileSync(this.logFilePath, header);

    this.log(`Log file: ${this.logFilePath}`);
  }

  public log(message: string): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.logFilePath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
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
    _fileUri?: vscode.Uri
  ): void {
    const severityIcon = {
      error: "ERROR",
      warning: "WARN ",
      info: "INFO ",
      debug: "DEBUG"
    }[severity];
    
    const cat = category ? `[${category}] ` : "";
    
    this.log(`  ${severityIcon} Line ${line + 1}: ${cat}${message}`);
  }

  public logAnalysisComplete(
    errorCount: number,
    warningCount: number,
    infoCount: number,
    debugCount: number,
    duration: number
  ): void {
    this.log(`✓ Analysis complete: ${errorCount}E ${warningCount}W ${infoCount}I ${debugCount}D (${duration}ms)`);
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

  public getLogPath(): string {
    return this.logFilePath;
  }

  public dispose(): void {
    this.log(`${"=".repeat(80)}\nSession ended: ${new Date().toISOString()}\n${"=".repeat(80)}\n`);
  }
}
