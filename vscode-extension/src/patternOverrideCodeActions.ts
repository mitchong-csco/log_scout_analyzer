import * as vscode from "vscode";

export class PatternOverrideCodeActionProvider
  implements vscode.CodeActionProvider
{
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    if (context.diagnostics.length === 0) {
      return [];
    }

    return context.diagnostics.map((diagnostic) => {
      const action = new vscode.CodeAction(
        "Scout: Create Override from Diagnostic",
        vscode.CodeActionKind.QuickFix,
      );
      action.diagnostics = [diagnostic];
      action.command = {
        command: "logScoutAnalyzer.patterns.createOverrideFromDiagnostic",
        title: "Create Override from Diagnostic",
        arguments: [diagnostic],
      };
      action.isPreferred = false;

      return action;
    });
  }
}
