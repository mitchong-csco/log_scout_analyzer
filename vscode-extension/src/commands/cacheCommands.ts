/**
 * Cache Commands Module
 *
 * Commands for managing the analysis cache:
 * - clearCache: Clear all cached analysis results
 * - viewCacheMetadata: View TagScout cache metadata file
 * - showCacheData: Show cache data panel
 * - openCachedFile: Open cached file and load results
 * - openFileInEditor: Open file without loading cached results
 * - revealInExplorer: Reveal file in system file explorer
 * - removeCachedFile: Remove specific file from cache
 */

import * as vscode from "vscode";
import * as path from "path";
import { FileLogger } from "../fileLogger";
import { CachedFilesTreeProvider } from "../cachedFilesTreeProvider";
import { ResultsTreeProvider } from "../resultsTreeProvider";
import { CategoriesTreeProvider } from "../categoriesTreeProvider";

const CACHE_STORAGE_KEY = "logScoutAnalyzer.analysisCache";

export function registerCacheCommands(
  context: vscode.ExtensionContext,
  analysisCache: Map<string, any>,
  cachedFilesTreeProvider: CachedFilesTreeProvider | undefined,
  resultsTreeProvider: ResultsTreeProvider | undefined,
  categoriesTreeProvider: CategoriesTreeProvider | undefined,
  fileLogger: FileLogger | undefined,
  outputChannel: vscode.OutputChannel | undefined,
  allResults: any[],
  updateStatusBar: () => void,
  updateCachedFilesView: () => void,
  debouncedSaveCache: (ctx: vscode.ExtensionContext) => void
): any[] {
  // Store reference to allResults so we can update it
  let resultsReference = { current: allResults };

  // Clear cache
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.clearCache",
      async () => {
        const cacheSize = analysisCache.size;
        analysisCache.clear();
        cachedFilesTreeProvider?.clear();

        // Clear persisted cache from storage
        await context.globalState.update(CACHE_STORAGE_KEY, undefined);

        if (outputChannel) {
          outputChannel.appendLine(
            `[${new Date().toISOString()}] ♻️ Cache cleared (${cacheSize} files, including persisted storage)`
          );
        }

        vscode.window.showInformationMessage(
          `Analysis cache cleared! (${cacheSize} cached files removed)`
        );
        updateStatusBar();
      }
    )
  );

  // Remove cached file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.removeCachedFile",
      (item: any) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
          return;
        }

        const uriString = cachedFile.uri.toString();
        analysisCache.delete(uriString);
        updateCachedFilesView();

        // Persist the removal
        debouncedSaveCache(context);

        vscode.window.showInformationMessage(
          `Removed ${path.basename(cachedFile.uri.fsPath)} from cache`
        );
      }
    )
  );

  // Open cached file with results
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.openCachedFile",
      async (item: any) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
          return;
        }

        const uriString = cachedFile.uri.toString();
        const cachedEntry = analysisCache.get(uriString);

        if (!cachedEntry) {
          vscode.window.showWarningMessage(
            `No cached results found for ${path.basename(cachedFile.uri.fsPath)}`
          );
          return;
        }

        try {
          // Check if file exists
          await vscode.workspace.fs.stat(cachedFile.uri);

          // Check if document is already open
          const openDoc = vscode.workspace.textDocuments.find(
            (doc) => doc.uri.toString() === cachedFile.uri.toString()
          );

          let doc: vscode.TextDocument;
          if (openDoc) {
            // Document already open, just show it
            await vscode.window.showTextDocument(openDoc, {
              preview: false,
              preserveFocus: false,
            });
            doc = openDoc;
          } else {
            // Open the document
            doc = await vscode.workspace.openTextDocument(cachedFile.uri);
            await vscode.window.showTextDocument(doc, {
              preview: false,
              preserveFocus: false,
            });
          }

          // Update all result URIs to match the opened document
          const updatedResults = cachedEntry.results.map((r: any) => ({
            ...r,
            uri: doc.uri,
          }));

          // Load cached results into all views
          resultsReference.current = updatedResults;
          resultsTreeProvider?.setResults(updatedResults);
          categoriesTreeProvider?.setResults(updatedResults);
          updateStatusBar();

          // Update cache with corrected URIs
          analysisCache.set(doc.uri.toString(), {
            ...cachedEntry,
            results: updatedResults,
          });

          // Log cache load
          fileLogger?.logCacheOperation(
            `Opened cached file ${path.basename(cachedFile.uri.fsPath)} (${cachedEntry.errorCount}E ${cachedEntry.warningCount}W ${cachedEntry.infoCount}I ${cachedEntry.debugCount}D)`
          );

          if (outputChannel) {
            outputChannel.appendLine(
              `📦 Loaded cached results for ${path.basename(cachedFile.uri.fsPath)} - ${cachedEntry.results.length} issues`
            );
          }
        } catch (err) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`
          );
        }
      }
    )
  );

  // Open file in editor without loading cached results
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.openFileInEditor",
      async (item: any) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
          return;
        }

        try {
          // Check if file exists
          await vscode.workspace.fs.stat(cachedFile.uri);

          // Just open the file
          const doc = await vscode.workspace.openTextDocument(cachedFile.uri);
          await vscode.window.showTextDocument(doc);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Failed to open file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`
          );
        }
      }
    )
  );

  // Reveal in Explorer
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.revealInExplorer",
      async (item: any) => {
        // Handle both CachedFile and CachedFileItem
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
          return;
        }

        try {
          // Check if file exists
          await vscode.workspace.fs.stat(cachedFile.uri);

          // Reveal in file explorer
          await vscode.commands.executeCommand("revealFileInOS", cachedFile.uri);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Failed to reveal file: ${path.basename(cachedFile.uri.fsPath)}. File may have been moved or deleted.`
          );
        }
      }
    )
  );

  // View Cache Metadata
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.viewCacheMetadata",
      async () => {
        try {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showWarningMessage("No workspace folder open");
            return;
          }

          // Look for .tagscout_cache directory in workspace root
          const cacheDir = vscode.Uri.joinPath(
            workspaceFolders[0].uri,
            ".tagscout_cache"
          );
          const cacheFile = vscode.Uri.joinPath(
            cacheDir,
            "tagscout_patterns.json"
          );

          try {
            await vscode.workspace.fs.stat(cacheFile);
            const doc = await vscode.workspace.openTextDocument(cacheFile);
            await vscode.window.showTextDocument(doc, { preview: false });

            if (outputChannel) {
              outputChannel.appendLine(
                `📄 Opened cache metadata: ${cacheFile.fsPath}`
              );
            }
          } catch (statErr) {
            vscode.window.showWarningMessage(
              "Cache metadata file not found. Try analyzing a file first to create the cache."
            );
          }
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Failed to open cache metadata: ${err.message}`
          );
        }
      }
    )
  );

  // Show Cache Data (webview panel)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.showCacheData",
      async (item: any) => {
        const cachedFile = item?.cachedFile || item;
        if (!cachedFile || !cachedFile.uri) {
          return;
        }

        const uriString = cachedFile.uri.toString();
        const cachedEntry = analysisCache.get(uriString);

        if (!cachedEntry) {
          vscode.window.showWarningMessage("No cache data available");
          return;
        }

        // Create simple info message for now
        // TODO: Create proper webview panel if needed
        const info = `
Cache Data for ${path.basename(cachedFile.uri.fsPath)}

Cached: ${new Date(cachedEntry.timestamp).toLocaleString()}
Results: ${cachedEntry.results.length}
Errors: ${cachedEntry.errorCount}
Warnings: ${cachedEntry.warningCount}
Info: ${cachedEntry.infoCount}
Debug: ${cachedEntry.debugCount}
        `.trim();

        vscode.window.showInformationMessage(info, { modal: true });
      }
    )
  );

  return [resultsReference];
}
