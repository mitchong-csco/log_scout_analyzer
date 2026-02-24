/**
 * Bundle Commands Module
 *
 * Commands for managing log bundles (cases from QCSOne):
 * - bundle.create: Create a new bundle
 * - bundle.importPackage: Import a QCSONE package/archive
 * - bundle.addCurrentFile: Add current file to a bundle
 * - bundle.addToBundle: Add file/folder to bundle (Explorer context menu)
 * - bundle.analyze: Analyze all logs in a bundle
 * - bundle.delete: Delete a bundle
 * - bundle.refresh: Refresh bundle tree view
 * - bundle.openInQCSOne: Open associated case in QCSOne
 * - importArchive: Import log archive (legacy command)
 */

import * as vscode from "vscode";
import { BundleTreeProvider } from "../bundleTreeProvider";
import { getLSPClient } from "../lspClient";

export function registerBundleCommands(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel | undefined,
  bundleTreeProvider: BundleTreeProvider | undefined
): void {
  // Create Bundle Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.create",
      async () => {
        const name = await vscode.window.showInputBox({
          prompt: "Enter bundle name (e.g., INC-12345 or Case 700440257)",
          placeHolder: "INC-12345: Presence Failure",
        });

        if (!name) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: "Enter description (optional)",
          placeHolder: "User cannot see presence status",
        });

        const caseId = await vscode.window.showInputBox({
          prompt: "Enter case ID (optional)",
          placeHolder: "700440257",
        });

        if (bundleTreeProvider) {
          const bundleId = await bundleTreeProvider.createBundle(
            name,
            description || undefined,
            caseId || undefined
          );

          if (bundleId) {
            vscode.window.showInformationMessage(`✅ Bundle created: ${name}`);
            outputChannel?.appendLine(
              `✓ Created bundle: ${name} (${bundleId})`
            );
          }
        }
      }
    )
  );

  // Import Package Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.importPackage",
      async (uri?: vscode.Uri) => {
        // Step 1: Select file first
        let packagePath: string | undefined;

        if (uri) {
          packagePath = uri.fsPath;
        } else {
          const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
              "QCSONE Packages": ["zip"],
              "All Archives": ["zip", "tar.gz", "tgz", "tar", "gz"],
            },
            title:
              "Select Log Package (e.g., 700440257_qcsone_download_selected.zip)",
          });

          if (files && files.length > 0) {
            packagePath = files[0].fsPath;
          }
        }

        if (!packagePath) {
          return;
        }

        const filename = packagePath.split(/[\\/]/).pop() || packagePath;

        // Step 2: Try to extract case ID from filename
        let extractedCaseId: string | undefined;

        // QCSONE format: 700440257_qcsone_download_selected.zip
        if (filename.includes("_qcsone_")) {
          const parts = filename.split("_");
          if (parts.length > 0 && /^\d+$/.test(parts[0])) {
            extractedCaseId = parts[0];
            outputChannel?.appendLine(
              `✓ Detected case ID from filename: ${extractedCaseId}`
            );
          }
        }

        // Step 3: Use extracted case ID or prompt if not found
        let caseId: string | undefined;

        if (extractedCaseId) {
          // Use extracted value directly, no prompt needed
          caseId = extractedCaseId;
          outputChannel?.appendLine(`✓ Using auto-detected case ID: ${caseId}`);
        } else {
          // No extraction successful, prompt user (required)
          caseId = await vscode.window.showInputBox({
            prompt: "Enter Case ID (required)",
            placeHolder: "e.g., 700356763",
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return "Case ID is required";
              }
              if (!/^\d+$/.test(value.trim())) {
                return "Case ID must contain only numbers";
              }
              return null;
            },
          });

          if (!caseId) {
            outputChannel?.appendLine(
              "✗ Import cancelled: Case ID is required"
            );
            return;
          }
        }

        // TODO: Add optional prompts for log product type and log service
        // TODO: Discussion needed on bundle service discovery mechanism

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Importing ${filename}`,
            cancellable: false,
          },
          async (progress) => {
            progress.report({
              message: "Extracting archive (including nested archives)...",
            });

            try {
              if (bundleTreeProvider) {
                const result = await bundleTreeProvider.importPackage(
                  packagePath!,
                  undefined,
                  caseId.trim()
                );

                if (result) {
                  let message = `✅ Bundle Created Successfully!\n\n`;

                  if (result.caseId) {
                    message += `📋 Case: ${result.caseId}\n`;
                  }

                  message += `📦 Imported: ${result.importedCount}/${result.totalFiles} files\n`;

                  if (result.serviceCounts) {
                    message += `🔍 Services Detected:\n`;
                    Object.entries(result.serviceCounts).forEach(
                      ([service, count]) => {
                        message += `   • ${service}: ${count} log(s)\n`;
                      }
                    );
                  }

                  const action = await vscode.window.showInformationMessage(
                    message,
                    "Open Bundle",
                    "Analyze Now"
                  );

                  if (action === "Analyze Now" && result.bundleId) {
                    vscode.commands.executeCommand(
                      "logScoutAnalyzer.bundle.analyze",
                      result.bundleId
                    );
                  }

                  outputChannel?.appendLine(
                    `✓ Imported package: ${filename} → ${result.bundleName}`
                  );
                  outputChannel?.appendLine(
                    `  Note: Nested archives automatically extracted`
                  );
                }
              }
            } catch (error) {
              vscode.window.showErrorMessage(`Import failed: ${error}`);
              outputChannel?.appendLine(`✗ Import failed: ${error}`);
            }
          }
        );
      }
    )
  );

  // Add Current File to Bundle Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.addCurrentFile",
      async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showWarningMessage("No file is currently open");
          return;
        }

        const filePath = editor.document.uri.fsPath;
        const fileName = filePath.split(/[\\/]/).pop() || filePath;

        // Check if it's a log file
        if (!fileName.match(/\.(log|txt|trace|out|err)$/i)) {
          const proceed = await vscode.window.showWarningMessage(
            `"${fileName}" doesn't appear to be a log file. Add it anyway?`,
            "Yes",
            "No"
          );
          if (proceed !== "Yes") {
            return;
          }
        }

        // Get list of bundles
        const client = getLSPClient();
        if (!client) {
          vscode.window.showErrorMessage("LSP client not available");
          return;
        }

        try {
          // List existing bundles
          const response: any = await client.sendRequest("scout/bundle/list", {
            logs: [filePath],
          });

          if (!response || !response.bundles || response.bundles.length === 0) {
            // No bundles exist, offer to create one
            const action = await vscode.window.showInformationMessage(
              `No bundles exist yet. Create a new bundle for "${fileName}"?`,
              "Create Bundle",
              "Cancel"
            );

            if (action === "Create Bundle") {
              // Trigger create bundle command, which will add this file
              await vscode.commands.executeCommand(
                "logScoutAnalyzer.bundle.create"
              );
            }
            return;
          }

          // Let user pick which bundle to add to
          const items = response.bundles.map((bundle: any) => ({
            label: bundle.name,
            description: `${bundle.logs?.length || 0} logs`,
            detail: bundle.description || "",
            id: bundle.id,
          }));

          items.unshift({
            label: "$(add) Create New Bundle",
            description: "Create a new bundle for this log",
            detail: "",
            id: "__new__",
          });

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `Add "${fileName}" to bundle...`,
            title: "Select Bundle",
          });

          if (!selected) {
            return;
          }

          if ((selected as any).id === "__new__") {
            // Create new bundle
            await vscode.commands.executeCommand(
              "logScoutAnalyzer.bundle.create"
            );
            return;
          }

          // Add file to selected bundle
          await client.sendRequest("scout/bundle/addLog", {
            bundleId: (selected as any).id,
            logPath: filePath,
          });

          vscode.window.showInformationMessage(
            `✅ Added "${fileName}" to bundle "${(selected as any).label}"`
          );

          outputChannel?.appendLine(
            `✓ Added log to bundle: ${fileName} → ${(selected as any).label}`
          );

          // Refresh bundle view
          bundleTreeProvider?.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to add log: ${error}`);
          outputChannel?.appendLine(`✗ Failed to add log: ${error}`);
        }
      }
    )
  );

  // Unified Add to Bundle Command (for Explorer context menu)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.addToBundle",
      async (uri?: vscode.Uri) => {
        if (!uri) {
          vscode.window.showWarningMessage("No file or folder selected");
          return;
        }

        const fsPath = uri.fsPath;
        const fileName = fsPath.split(/[\\/]/).pop() || fsPath;
        const stats = await vscode.workspace.fs.stat(uri);
        const isDirectory = stats.type === vscode.FileType.Directory;

        // Determine what was selected
        let actionType: "file" | "folder" | "archive" = "file";
        if (isDirectory) {
          actionType = "folder";
        } else if (fileName.match(/\.(zip|tar\.gz|tgz|tar|gz)$/i)) {
          actionType = "archive";
        }

        // Handle based on type
        switch (actionType) {
          case "archive":
            // Import as QCSONE package
            await vscode.commands.executeCommand(
              "logScoutAnalyzer.bundle.importPackage",
              uri
            );
            break;

          case "folder":
            // Create bundle from folder
            const folderName = fileName;
            const bundleName = await vscode.window.showInputBox({
              prompt: `Create bundle from folder "${folderName}"`,
              value: folderName,
              placeHolder: "Enter bundle name",
            });

            if (!bundleName) {
              return;
            }

            const client = getLSPClient();
            if (!client) {
              vscode.window.showErrorMessage("LSP client not available");
              return;
            }

            try {
              const response: any = await client.sendRequest(
                "scout/bundle/create",
                {
                  name: bundleName,
                  description: `Created from folder: ${folderName}`,
                }
              );

              if (response && response.bundleId) {
                vscode.window.showInformationMessage(
                  `✅ Bundle "${bundleName}" created!\n\nNow add log files from the folder.`
                );
                outputChannel?.appendLine(`✓ Created bundle: ${bundleName}`);
                bundleTreeProvider?.refresh();
              }
            } catch (error) {
              vscode.window.showErrorMessage(
                `Failed to create bundle: ${error}`
              );
            }
            break;

          case "file":
            // Add file to bundle (reuse existing logic)
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
            await vscode.commands.executeCommand(
              "logScoutAnalyzer.bundle.addCurrentFile"
            );
            break;
        }
      }
    )
  );

  // Refresh Bundles Command
  context.subscriptions.push(
    vscode.commands.registerCommand("logScoutAnalyzer.bundle.refresh", () => {
      bundleTreeProvider?.refresh();
      outputChannel?.appendLine("✓ Bundles refreshed");
    })
  );

  // Open Bundle Case in QCSOne
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.openInQCSOne",
      async (bundleItem: any) => {
        if (!bundleItem || !vscode.workspace.workspaceFolders) {
          return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleItem.bundleId}/bundle.json`;

        try {
          // Read bundle.json to get case URL
          const bundleUri = vscode.Uri.file(bundlePath);
          const bundleData = await vscode.workspace.fs.readFile(bundleUri);
          const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));

          const caseUrl = bundle.metadata?.case_url;
          if (caseUrl) {
            await vscode.env.openExternal(vscode.Uri.parse(caseUrl));
            outputChannel?.appendLine(`✓ Opened case in QCSOne: ${caseUrl}`);
          } else {
            vscode.window.showWarningMessage(
              "No case URL available for this bundle"
            );
            outputChannel?.appendLine(
              "✗ No case URL found in bundle metadata"
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open case in QCSOne: ${error}`
          );
          outputChannel?.appendLine(`✗ Failed to open case URL: ${error}`);
        }
      }
    )
  );

  // Import Log Archive Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.importArchive",
      async () => {
        if (!bundleTreeProvider) {
          vscode.window.showErrorMessage(
            "Bundle tree provider not initialized"
          );
          return;
        }

        // Step 1: Show file picker first
        const result = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            Archives: ["zip", "tar", "gz", "tgz"],
          },
          title: "Select Log Archive to Import",
        });

        if (!result || result.length === 0) {
          return;
        }

        const archivePath = result[0].fsPath;
        const filename = archivePath.split(/[\\/]/).pop() || archivePath;

        // Step 2: Try to extract case ID from filename
        let extractedCaseId: string | undefined;

        // QCSONE format: 700440257_qcsone_download_selected.zip
        if (filename.includes("_qcsone_")) {
          const parts = filename.split("_");
          if (parts.length > 0 && /^\d+$/.test(parts[0])) {
            extractedCaseId = parts[0];
            outputChannel?.appendLine(
              `✓ Detected case ID from filename: ${extractedCaseId}`
            );
          }
        }

        // Step 3: Use extracted case ID or prompt if not found
        let caseId: string | undefined;

        if (extractedCaseId) {
          // Use extracted value directly, no prompt needed
          caseId = extractedCaseId;
          outputChannel?.appendLine(`✓ Using auto-detected case ID: ${caseId}`);
        } else {
          // No extraction successful, prompt user (required)
          caseId = await vscode.window.showInputBox({
            prompt: "Enter Case ID (required)",
            placeHolder: "e.g., 700356763",
            validateInput: (value) => {
              if (!value || value.trim().length === 0) {
                return "Case ID is required";
              }
              if (!/^\d+$/.test(value.trim())) {
                return "Case ID must contain only numbers";
              }
              return null;
            },
          });

          if (!caseId) {
            outputChannel?.appendLine(
              "✗ Import cancelled: Case ID is required"
            );
            return;
          }
        }

        outputChannel?.appendLine(
          `Importing archive: ${archivePath} (Case: ${caseId})`
        );

        // TODO: Add optional prompts for log product type and log service
        // TODO: Discussion needed on bundle service discovery mechanism

        try {
          await bundleTreeProvider.importPackage(
            archivePath,
            undefined,
            caseId.trim()
          );
          outputChannel?.appendLine("✓ Import completed successfully");
        } catch (error) {
          outputChannel?.appendLine(`✗ Import failed: ${error}`);
        }
      }
    )
  );

  // Analyze Bundle Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.analyze",
      async (bundleId: string) => {
        if (!bundleTreeProvider) {
          return;
        }

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Bundle",
            cancellable: false,
          },
          async (progress) => {
            progress.report({ message: "Running pattern analysis..." });

            try {
              if (!bundleTreeProvider) {
                throw new Error("Bundle tree provider not initialized");
              }

              const result = await bundleTreeProvider.analyzeBundle(bundleId);

              if (result) {
                const message =
                  `✅ Analysis Complete!\n\n` +
                  `📊 Detections: ${result.totalDetections}\n` +
                  `🔴 Errors: ${result.errorCount}\n` +
                  `🟡 Warnings: ${result.warningCount}\n` +
                  `🔵 Info: ${result.infoCount}`;

                vscode.window.showInformationMessage(message, "View Results");

                outputChannel?.appendLine(`✓ Analyzed bundle: ${bundleId}`);
                outputChannel?.appendLine(
                  `  Detections: ${result.totalDetections}`
                );
              }
            } catch (error) {
              vscode.window.showErrorMessage(`Analysis failed: ${error}`);
              outputChannel?.appendLine(`✗ Analysis failed: ${error}`);
            }
          }
        );
      }
    )
  );

  // Delete Bundle Command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "logScoutAnalyzer.bundle.delete",
      async (bundleId: string) => {
        const confirm = await vscode.window.showWarningMessage(
          "Delete this bundle? This action cannot be undone.",
          { modal: true },
          "Delete"
        );

        if (confirm === "Delete" && bundleTreeProvider) {
          const success = await bundleTreeProvider.deleteBundle(bundleId);

          if (success) {
            vscode.window.showInformationMessage("Bundle deleted");
            outputChannel?.appendLine(`✓ Deleted bundle: ${bundleId}`);
          }
        }
      }
    )
  );
}
