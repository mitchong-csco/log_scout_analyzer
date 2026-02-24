/**
 * Navigation Commands Module
 *
 * Commands for navigation and opening views:
 * - jumpToLine: Jump to specific line in file
 * - openScoutView: Open Scout Analyzer view
 * - openActionPanel: Open action panel with scenarios
 * - showPatternForResult: Show pattern details for a result
 */

import * as vscode from "vscode";
import { ScoutAnalyzerPanel } from "../scoutAnalyzerPanel";
import { ScenarioManager } from "../scenarioManager";
import { PatternOverrideManager } from "../patternOverrideManager";
import { getLSPClient } from "../lspClient";

export function registerNavigationCommands(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel | undefined,
  highlightDecoration: vscode.TextEditorDecorationType | undefined,
  highlightTimeout: NodeJS.Timeout | undefined,
  scenarioManager: ScenarioManager | undefined,
  patternOverrideManager: PatternOverrideManager | undefined,
  isLogFile: (document: vscode.TextDocument) => boolean
): { setHighlightTimeout: (timeout: NodeJS.Timeout | undefined) => void } {
  let currentHighlightTimeout = highlightTimeout;

  // Jump to Line Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.jumpToLine",
      (uri: vscode.Uri, line: number, column: number) => {
        // Preserve focus on active editor column
        const activeColumn =
          vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

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
              vscode.TextEditorRevealType.InCenterIfOutsideViewport
            );

            // Highlight the line temporarily
            if (highlightDecoration) {
              const lineRange = editor.document.lineAt(line).range;
              editor.setDecorations(highlightDecoration, [lineRange]);

              // Clear previous timeout if exists
              if (currentHighlightTimeout) {
                clearTimeout(currentHighlightTimeout);
              }

              // Get highlight duration from config
              const config =
                vscode.workspace.getConfiguration("logScoutAnalyzer");
              const duration = config.get<number>("highlightDuration", 2000);

              // Clear highlight after configured duration
              currentHighlightTimeout = setTimeout(() => {
                if (
                  highlightDecoration &&
                  editor === vscode.window.activeTextEditor
                ) {
                  editor.setDecorations(highlightDecoration, []);
                }
              }, duration);
            }
          });
      }
    )
  );

  // Open Scout View Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.openScoutView",
      async () => {
        // Focus the Scout Analyzer view in the activity bar
        await vscode.commands.executeCommand(
          "workbench.view.extension.scout-analyzer"
        );
        // If a log file is open, also focus the analyzer tab
        const editor = vscode.window.activeTextEditor;
        if (editor && isLogFile(editor.document)) {
          await vscode.commands.executeCommand("scoutAnalyzer.focus");
        }
      }
    )
  );

  // Open Action Panel Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.openActionPanel",
      () => {
        if (scenarioManager && patternOverrideManager) {
          ScoutAnalyzerPanel.createOrShow(
            context.extensionUri,
            scenarioManager,
            patternOverrideManager
          );
        }
      }
    )
  );

  // Show Pattern for Result Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.showPatternForResult",
      async (item: any) => {
        if (!item || !item.result) {
          vscode.window.showErrorMessage("No result item selected");
          return;
        }

        const result = item.result;
        if (!result.patternId) {
          vscode.window.showWarningMessage(
            "No pattern information available for this result"
          );
          return;
        }

        try {
          const lspClient = getLSPClient();
          if (!lspClient) {
            vscode.window.showWarningMessage(
              "LSP client not connected. Cannot fetch pattern."
            );
            return;
          }

          // Fetch all patterns
          const allPatternsResult: any = await lspClient.sendRequest(
            "workspace/executeCommand",
            {
              command: "logScout.getPatterns",
              arguments: [],
            }
          );

          if (!allPatternsResult || !allPatternsResult.patterns) {
            vscode.window.showWarningMessage("No patterns available");
            return;
          }

          // Find the specific pattern by ID
          const pattern = allPatternsResult.patterns.find(
            (p: any) => p.id === result.patternId
          );

          if (!pattern) {
            vscode.window.showWarningMessage(
              `Pattern not found: ${result.patternId}`
            );
            return;
          }

          // Create a JSON document with the pattern data
          const patternJson = JSON.stringify(pattern, null, 2);
          const doc = await vscode.workspace.openTextDocument({
            content: patternJson,
            language: "json",
          });

          await vscode.window.showTextDocument(doc, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside,
          });

          outputChannel?.appendLine(
            `✓ Opened pattern: ${pattern.name} (${result.patternId})`
          );

          vscode.window.showInformationMessage(
            `Pattern: ${pattern.name} (${result.patternId})`
          );
        } catch (error: any) {
          vscode.window.showErrorMessage(
            `Failed to fetch pattern: ${error.message}`
          );
          outputChannel?.appendLine(
            `✗ Error fetching pattern: ${error.message}`
          );
        }
      }
    )
  );

  return {
    setHighlightTimeout: (timeout: NodeJS.Timeout | undefined) => {
      currentHighlightTimeout = timeout;
    },
  };
}
