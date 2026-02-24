/**
 * Debug Commands Module
 *
 * Commands for debugging and troubleshooting the extension:
 * - dumpDiagnostics: Dump diagnostic data for active file
 * - openExtensionLog: Open extension log file
 * - openLSPLog: Open LSP server log file
 * - showLogPaths: Show all log file paths
 */

import * as vscode from "vscode";
import { FileLogger } from "../fileLogger";

export function registerDebugCommands(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel | undefined,
  fileLogger: FileLogger | undefined
): void {
  // Dump diagnostic data for debugging
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
            `Range: Line ${diag.range.start.line}, Col ${diag.range.start.character} -> Line ${diag.range.end.line}, Col ${diag.range.end.character}`
          );
          outputChannel!.appendLine(`Source: ${diag.source}`);

          const diagWithData = diag as any;
          if (diagWithData.data) {
            outputChannel!.appendLine(
              `Data keys: ${Object.keys(diagWithData.data).join(", ")}`
            );
            outputChannel!.appendLine("");
            outputChannel!.appendLine("Data contents:");
            outputChannel!.appendLine(
              `  template: ${diagWithData.data.template || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  merged_template: ${diagWithData.data.merged_template || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  matched_text: ${diagWithData.data.matched_text || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  log_line: ${diagWithData.data.log_line || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  pattern_id: ${diagWithData.data.pattern_id || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  pattern_name: ${diagWithData.data.pattern_name || "(not set)"}`
            );
            outputChannel!.appendLine(
              `  category: ${diagWithData.data.category || "(not set)"}`
            );
          }
          outputChannel!.appendLine("");
        });

        outputChannel.appendLine("=".repeat(80));
        outputChannel.appendLine("END OF DUMP");
        outputChannel.appendLine("=".repeat(80));
        vscode.window.showInformationMessage(
          `Dumped ${diagnostics.length} diagnostic(s) to output channel`
        );
      }
    )
  );

  // Open extension log file
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
            `Opened extension log: ${logPath}`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to open extension log: ${error.message}`
          );
        }
      }
    )
  );

  // Open LSP server log file
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
            `Failed to open LSP log: ${error.message}`
          );
        }
      }
    )
  );

  // Show log paths
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
            "Copy Paths"
          )
          .then((selection) => {
            if (selection === "Open Extension Log") {
              vscode.commands.executeCommand("logScoutAnalyzer.openExtensionLog");
            } else if (selection === "Open LSP Log") {
              vscode.commands.executeCommand("logScoutAnalyzer.openLSPLog");
            } else if (selection === "Copy Paths") {
              vscode.env.clipboard.writeText(
                `Extension Log:\n${extensionLog}\n\nLSP Server Log:\n${lspLog}`
              );
              vscode.window.showInformationMessage(
                "Log paths copied to clipboard"
              );
            }
          });
      }
    )
  );
}
