/**
 * Results Commands Module
 *
 * Commands for managing results view and filtering:
 * - groupBySeverity: Group results by severity level
 * - groupByCategory: Group results by pattern category
 * - groupByFile: Group results by file name
 * - sortByLine: Sort results by line number
 * - sortBySeverity: Sort results by severity
 * - sortByTime: Sort results by timestamp
 * - sortByFile: Sort results by file name
 * - sortByCategory: Sort results by category
 * - toggleCategory: Toggle category visibility
 * - toggleAllCategories: Enable/disable all categories
 * - resetView: Reset view to default grouping
 * - exportResults: Export results to text file
 * - refreshResults: Refresh results tree view
 */

import * as vscode from "vscode";
import { ResultsTreeProvider } from "../resultsTreeProvider";
import { CategoriesTreeProvider } from "../categoriesTreeProvider";
import { FileLogger } from "../fileLogger";

export function registerResultsCommands(
  context: vscode.ExtensionContext,
  resultsTreeProvider: ResultsTreeProvider | undefined,
  categoriesTreeProvider: CategoriesTreeProvider | undefined,
  fileLogger: FileLogger | undefined,
  filterResultsByCategories: () => void
): void {
  // Refresh Results Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.refreshResults",
      () => {
        resultsTreeProvider?.refresh();
        categoriesTreeProvider?.refresh();
        vscode.window.showInformationMessage("Results refreshed!");
      }
    )
  );

  // Group by Severity Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.groupBySeverity",
      () => {
        resultsTreeProvider?.setGroupBy("severity");
        vscode.window.showInformationMessage("Grouped by severity");
      }
    )
  );

  // Group by Category Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.groupByCategory",
      () => {
        resultsTreeProvider?.setGroupBy("category");
        vscode.window.showInformationMessage("Grouped by category");
      }
    )
  );

  // Group by File Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.groupByFile",
      () => {
        resultsTreeProvider?.setGroupBy("file");
        vscode.window.showInformationMessage("Grouped by file");
      }
    )
  );

  // Reset View Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.resetView",
      () => {
        resultsTreeProvider?.resetGrouping();
        vscode.window.showInformationMessage(
          "View reset to default (by severity)"
        );
      }
    )
  );

  // Sort by Line Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.sortByLine",
      () => {
        resultsTreeProvider?.setSortBy("line");
      }
    )
  );

  // Sort by Severity Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.sortBySeverity",
      () => {
        resultsTreeProvider?.setSortBy("severity");
      }
    )
  );

  // Sort by Time Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.sortByTime",
      () => {
        resultsTreeProvider?.setSortBy("time");
      }
    )
  );

  // Sort by File Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.sortByFile",
      () => {
        resultsTreeProvider?.setSortBy("file");
      }
    )
  );

  // Sort by Category Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.sortByCategory",
      () => {
        resultsTreeProvider?.setSortBy("category");
      }
    )
  );

  // Export Results Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.exportResults",
      () => {
        const results = resultsTreeProvider?.getResults() || [];
        if (results.length === 0) {
          vscode.window.showWarningMessage("No results to export");
          return;
        }

        const content = results
          .map(
            (r) =>
              `Line ${r.line + 1}: [${r.severity.toUpperCase()}] ${r.message}\n  ${r.matchedText}\n`
          )
          .join("\n");

        const fileName = `scout-results-${new Date().toISOString().slice(0, 10)}.txt`;

        vscode.workspace
          .openTextDocument({
            content: content,
            language: "plaintext",
          })
          .then((doc) => {
            vscode.window.showTextDocument(doc);
          });

        fileLogger?.logExport(fileName, results.length);
        vscode.window.showInformationMessage(
          `Exported ${results.length} results`
        );
      }
    )
  );

  // Toggle Category Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.toggleCategory",
      (category: string) => {
        categoriesTreeProvider?.toggleCategory(category);
        // Filter results view based on enabled categories
        filterResultsByCategories();
      }
    )
  );

  // Toggle All Categories Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.toggleAllCategories",
      (enable: boolean) => {
        categoriesTreeProvider?.toggleAll(enable);
        // Filter results view based on enabled categories
        filterResultsByCategories();
      }
    )
  );
}
