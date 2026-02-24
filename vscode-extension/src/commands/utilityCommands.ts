/**
 * Utility Commands Module
 *
 * Miscellaneous utility commands:
 * - showAbout: Show extension and LSP version info
 * - showConsole: Open output channel for debugging
 * - copyFilePath: Copy current file path to clipboard
 * - copyVersionInfo: Copy version info to clipboard
 * - copyResultInfo: Copy result details to clipboard
 * - openInNewWindow: Open current file in new window
 */

import * as vscode from "vscode";
import { BUILD_INFO } from "../buildInfo";
import { getLSPServerVersion, getLSPServerName } from "../lspClient";

export function registerUtilityCommands(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel | undefined
): void {
  // Show About Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
            `🏷️  Extension Version: ${BUILD_INFO.version}`
          );
          outputChannel.appendLine(`🔨 Build Time: ${BUILD_INFO.buildTimestamp}`);
          outputChannel.appendLine(`🔢 Build Number: ${BUILD_INFO.buildNumber}`);
          outputChannel.appendLine(`🔗 Git Commit: ${BUILD_INFO.gitCommit}`);
          outputChannel.appendLine("");

          if (lspVersion) {
            outputChannel.appendLine(
              `🔧 LSP Server: ${lspName || "Log Scout LSP"}`
            );
            outputChannel.appendLine(`🏷️  LSP Version: ${lspVersion}`);
          } else {
            outputChannel.appendLine(`🔧 LSP Server: Not connected`);
          }

          outputChannel.appendLine("");
          outputChannel.appendLine(`⏰ Activated: ${new Date().toISOString()}`);
          outputChannel.appendLine(
            `🎯 Patterns: ${lspVersion ? "Managed by LSP server" : "Not available"}`
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
                "Version info copied to clipboard"
              );
            }
          });
      }
    )
  );

  // Show Console Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.showConsole",
      () => {
        if (outputChannel) {
          outputChannel.show();
          vscode.window.showInformationMessage(
            "Scout Output Channel opened (for debugging)."
          );
        }
      }
    )
  );

  // Copy File Path Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.copyFilePath",
      () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("No file is currently open");
          return;
        }
        vscode.env.clipboard.writeText(editor.document.uri.fsPath);
        vscode.window.showInformationMessage(
          `Copied: ${editor.document.uri.fsPath}`
        );
      }
    )
  );

  // Copy Version Info Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.copyVersionInfo",
      () => {
        const lspVersion = getLSPServerVersion();
        const versionText = lspVersion
          ? `Extension: v${BUILD_INFO.version}\nLSP Server: v${lspVersion}\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}`
          : `Extension: v${BUILD_INFO.version}\nBuild: ${BUILD_INFO.buildTimestamp}\nGit: ${BUILD_INFO.gitCommit}\nLSP: Not connected`;

        vscode.env.clipboard.writeText(versionText);
        vscode.window.showInformationMessage("Version info copied to clipboard");
      }
    )
  );

  // Copy Result Info Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
          "Tooltip content copied to clipboard"
        );
      }
    )
  );

  // Open in New Window Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
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
          true
        );
      }
    )
  );
}
