/**
 * Pattern Commands Module
 *
 * Commands for managing pattern overrides and custom patterns:
 * - patterns.createOverride: Create pattern override
 * - patterns.createOverrideFromSelection: Create override from text selection
 * - patterns.createOverrideFromDiagnostic: Create override from diagnostic
 * - patterns.createCustom: Create custom pattern with wizard
 * - patterns.editOverride: Edit existing pattern override
 * - patterns.deleteOverride: Delete pattern override
 * - patterns.togglePattern: Toggle pattern enabled/disabled
 * - patterns.importOverrides: Import patterns from file
 * - patterns.exportOverrides: Export patterns to file
 * - patterns.reloadPatterns: Reload patterns from LSP server
 */

import * as vscode from "vscode";
import { PatternOverrideManager } from "../patternOverrideManager";
import { PatternOverrideTreeProvider } from "../patternOverrideTreeProvider";
import { getLSPClient } from "../lspClient";
import {
  createOverrideQuickInput,
  createCustomPatternWizard,
  editPatternQuickInput,
  deletePatternQuickPick,
  togglePatternQuickPick,
  createOverrideFromSelection,
  createOverrideFromDiagnostic,
} from "../patternOverrideUI";

export function registerPatternCommands(
  context: vscode.ExtensionContext,
  patternOverrideManager: PatternOverrideManager | undefined,
  patternOverrideTreeProvider: PatternOverrideTreeProvider | undefined,
  updatePatternStatusBar: () => void
): void {
  const ensurePatternManager = (): PatternOverrideManager | undefined => {
    if (!patternOverrideManager) {
      vscode.window.showErrorMessage(
        "Pattern Override Manager is not available yet."
      );
      return undefined;
    }

    return patternOverrideManager;
  };

  // Create Override Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.createOverride",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await createOverrideQuickInput(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Create Override from Selection Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.createOverrideFromSelection",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active editor found.");
          return;
        }

        const selectionText = editor.document.getText(editor.selection);
        await createOverrideFromSelection(manager, selectionText);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Create Override from Diagnostic Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.createOverrideFromDiagnostic",
      async (diagnostic?: vscode.Diagnostic) => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        if (diagnostic) {
          await createOverrideFromDiagnostic(manager, diagnostic);
          patternOverrideTreeProvider?.refresh();
          updatePatternStatusBar();
          return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showInformationMessage("No active editor found.");
          return;
        }

        const diagnostics = vscode.languages.getDiagnostics(
          editor.document.uri
        );
        if (diagnostics.length === 0) {
          vscode.window.showInformationMessage(
            "No diagnostics found for this file."
          );
          return;
        }

        const cursor = editor.selection.active;
        const atCursor = diagnostics.filter((diag) =>
          diag.range.contains(cursor)
        );
        const candidates = atCursor.length > 0 ? atCursor : diagnostics;

        let selectedDiagnostic: vscode.Diagnostic | undefined;
        if (candidates.length === 1) {
          selectedDiagnostic = candidates[0];
        } else {
          const items = candidates.map((diag, index) => {
            const code = typeof diag.code === "string" ? diag.code : "";
            const mainMessage = diag.message.split("\n")[0];
            const label = code ? `${code}: ${mainMessage}` : mainMessage;
            const data = (diag as any).data as
              | Record<string, unknown>
              | undefined;
            const patternName =
              typeof data?.patternName === "string"
                ? data.patternName
                : undefined;

            return {
              label,
              description: patternName,
              detail: `Diagnostic #${index + 1}`,
              diagnostic: diag,
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            title: "Select a diagnostic to override",
            placeHolder: "Choose a diagnostic",
            matchOnDescription: true,
            matchOnDetail: true,
          });

          selectedDiagnostic = picked?.diagnostic;
        }

        if (!selectedDiagnostic) {
          return;
        }

        await createOverrideFromDiagnostic(manager, selectedDiagnostic);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Create Custom Pattern Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.createCustom",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await createCustomPatternWizard(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Edit Override Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.editOverride",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await editPatternQuickInput(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Delete Override Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.deleteOverride",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await deletePatternQuickPick(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Toggle Pattern Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.togglePattern",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await togglePatternQuickPick(manager);
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Import Overrides Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.importOverrides",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await manager.importPatterns();
        patternOverrideTreeProvider?.refresh();
        updatePatternStatusBar();
      }
    )
  );

  // Export Overrides Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.exportOverrides",
      async () => {
        const manager = ensurePatternManager();
        if (!manager) {
          return;
        }

        await manager.exportPatterns();
        updatePatternStatusBar();
      }
    )
  );

  // Reload Patterns Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.patterns.reloadPatterns",
      async () => {
        const client = getLSPClient();
        if (!client) {
          vscode.window.showWarningMessage(
            "LSP client is not connected. Pattern reload skipped."
          );
          return;
        }

        try {
          await client.sendRequest("workspace/executeCommand", {
            command: "logScout.reloadPatterns",
            arguments: [],
          });
          vscode.window.showInformationMessage(
            "Requested pattern reload from LSP."
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to reload patterns: ${error}`);
        }
      }
    )
  );
}
