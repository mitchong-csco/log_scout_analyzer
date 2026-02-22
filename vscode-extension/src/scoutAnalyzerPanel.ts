import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { ScenarioManager } from "./scenarioManager";
import {
  PatternOverrideManager,
  PatternOverride,
} from "./patternOverrideManager";

export class ScoutAnalyzerPanel {
  public static currentPanel: ScoutAnalyzerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private scenarioManager?: ScenarioManager;
  private patternOverrideManager?: PatternOverrideManager;
  private static resultsDataProvider?: any; // Store results provider for data access

  // Method to set the results data provider
  public static setDataProvider(provider: any): void {
    ScoutAnalyzerPanel.resultsDataProvider = provider;
    // Refresh panel if it's open
    if (ScoutAnalyzerPanel.currentPanel) {
      ScoutAnalyzerPanel.currentPanel._update();
    }
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    scenarioManager: ScenarioManager,
    patternOverrideManager: PatternOverrideManager,
  ) {
    // If we already have a panel, show it
    if (ScoutAnalyzerPanel.currentPanel) {
      ScoutAnalyzerPanel.currentPanel._panel.reveal();
      ScoutAnalyzerPanel.currentPanel._update(); // Refresh content
      return;
    }

    // Open in the main editor window
    const column = vscode.ViewColumn.One;

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "scoutAnalyzer",
      "Scout Analyzer",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    ScoutAnalyzerPanel.currentPanel = new ScoutAnalyzerPanel(
      panel,
      scenarioManager,
      patternOverrideManager,
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    scenarioManager: ScenarioManager,
    patternOverrideManager: PatternOverrideManager,
  ) {
    this._panel = panel;
    this.scenarioManager = scenarioManager;
    this.patternOverrideManager = patternOverrideManager;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "analyzeCurrentFile":
            this._analyzeCurrentFile();
            return;
          case "analyzeDirectory":
            this._analyzeDirectory();
            return;
          case "analyzeAllBelow":
            this._analyzeAllBelow();
            return;
          case "clearResults":
            this._clearResults();
            return;
          case "createScenario":
            this._createScenario(message.data);
            return;
          case "deleteScenario":
            this._deleteScenario(message.scenarioId);
            return;
          case "exportScenario":
            this._exportScenario(message.scenarioId);
            return;
          case "loadScenarios":
            this._sendScenarios();
            return;
          case "createPattern":
            this._handleCreatePattern(message.data);
            return;
          case "updatePattern":
            this._handleUpdatePattern(message.id, message.data);
            return;
          case "deletePattern":
            this._handleDeletePattern(message.id);
            return;
          case "resetPattern":
            this._handleResetPattern(message.sourceId);
            return;
          case "togglePattern":
            this._handleTogglePattern(message.id, message.enabled);
            return;
          case "loadPatterns":
            this._sendPatterns();
            return;
          case "loadResults":
            this._sendCurrentResults();
            return;
          case "exportPatterns":
            this._handleExportPatterns();
            return;
          case "importPatterns":
            this._handleImportPatterns();
            return;
          case "createSignature":
            this._showCreationNotImplemented("Signature");
            return;
          case "createAction":
            this._showCreationNotImplemented("Action");
            return;
          case "createState":
            this._showCreationNotImplemented("State");
            return;
          case "createStatus":
            this._showCreationNotImplemented("Status");
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  public dispose() {
    ScoutAnalyzerPanel.currentPanel = undefined;

    // Clean up resources
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private async _analyzeCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._postMessage({
        command: "showError",
        message: "No active file to analyze",
      });
      return;
    }

    this._postMessage({ command: "analysisStarted" });

    try {
      // Trigger the analyze command
      await vscode.commands.executeCommand("logScoutAnalyzer.analyzeFile");

      this._postMessage({
        command: "analysisComplete",
        message: `Analyzed: ${path.basename(editor.document.fileName)}`,
      });
    } catch (error) {
      this._postMessage({
        command: "showError",
        message: `Analysis failed: ${error}`,
      });
    }
  }

  private async _analyzeDirectory() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._postMessage({
        command: "showError",
        message: "No active file to determine directory",
      });
      return;
    }

    // Store original file and editor column to return focus
    const originalUri = editor.document.uri;
    const originalColumn = editor.viewColumn || vscode.ViewColumn.One;

    this._postMessage({ command: "analysisStarted" });

    const currentDir = path.dirname(editor.document.fileName);
    const files = await this._findLogFiles(currentDir, false);

    this._postMessage({
      command: "updateStatus",
      message: `Found ${files.length} log files in directory...`,
    });

    let analyzed = 0;
    for (const file of files) {
      try {
        // Open document - LSP will analyze automatically
        await vscode.workspace.openTextDocument(file);

        analyzed++;
        this._postMessage({
          command: "updateStatus",
          message: `Analyzing... ${analyzed}/${files.length}`,
        });
      } catch (error) {
        console.error(`Failed to analyze ${file}:`, error);
      }
    }

    // Return focus to original file in original column
    await vscode.window.showTextDocument(originalUri, {
      viewColumn: originalColumn,
      preserveFocus: false,
      preview: false,
    });

    // Small delay to ensure diagnostics are processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger tree view updates
    await vscode.commands.executeCommand("logScoutAnalyzer.refreshResults");

    this._postMessage({
      command: "analysisComplete",
      message: `Analyzed ${analyzed} files in directory`,
    });
  }

  private async _analyzeAllBelow() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._postMessage({
        command: "showError",
        message: "No active file to determine directory",
      });
      return;
    }

    // Store original file and editor column to return focus
    const originalUri = editor.document.uri;
    const originalColumn = editor.viewColumn || vscode.ViewColumn.One;

    this._postMessage({ command: "analysisStarted" });

    const currentDir = path.dirname(editor.document.fileName);
    const files = await this._findLogFiles(currentDir, true);

    this._postMessage({
      command: "updateStatus",
      message: `Found ${files.length} log files (including subdirectories)...`,
    });

    let analyzed = 0;
    for (const file of files) {
      try {
        // Open document - LSP will analyze automatically
        await vscode.workspace.openTextDocument(file);

        analyzed++;
        this._postMessage({
          command: "updateStatus",
          message: `Analyzing... ${analyzed}/${files.length}`,
        });
      } catch (error) {
        console.error(`Failed to analyze ${file}:`, error);
      }
    }

    // Return focus to original file in original column
    await vscode.window.showTextDocument(originalUri, {
      viewColumn: originalColumn,
      preserveFocus: false,
      preview: false,
    });

    // Small delay to ensure diagnostics are processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Trigger tree view updates
    await vscode.commands.executeCommand("logScoutAnalyzer.refreshResults");

    this._postMessage({
      command: "analysisComplete",
      message: `Analyzed ${analyzed} files recursively`,
    });
  }

  private _clearResults() {
    vscode.commands.executeCommand("logScoutAnalyzer.clearDiagnostics");
    this._postMessage({
      command: "updateStatus",
      message: "Results cleared",
    });
  }

  private async _findLogFiles(
    dir: string,
    recursive: boolean,
  ): Promise<string[]> {
    const logFiles: string[] = [];
    const logExtensions = [".log", ".txt", ".out"];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          const subFiles = await this._findLogFiles(fullPath, true);
          logFiles.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (logExtensions.includes(ext)) {
            logFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to read directory ${dir}:`, error);
    }

    return logFiles;
  }

  private _postMessage(message: any) {
    this._panel.webview.postMessage(message);
  }

  private async _createScenario(data: {
    name: string;
    description: string;
    lines: number[];
    patterns: any[];
  }) {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        this._postMessage({
          command: "showError",
          message: "No active file to create scenario from",
        });
        return;
      }

      if (!this.scenarioManager) {
        this._postMessage({
          command: "showError",
          message: "Scenario manager not available",
        });
        return;
      }

      const scenario = this.scenarioManager.createScenario(
        data.name,
        data.description,
        editor.document.uri.fsPath,
        data.lines,
        data.patterns,
      );

      this._postMessage({
        command: "scenarioCreated",
        scenario,
      });

      vscode.window.showInformationMessage(
        `Scenario "${scenario.name}" created successfully`,
      );

      // Refresh the scenarios list
      this._sendScenarios();
    } catch (error) {
      console.error("Failed to create scenario:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to create scenario: ${error}`,
      });
    }
  }

  private async _deleteScenario(scenarioId: string) {
    try {
      if (!this.scenarioManager) {
        return;
      }

      const scenario = this.scenarioManager.getScenario(scenarioId);
      if (!scenario) {
        this._postMessage({
          command: "showError",
          message: "Scenario not found",
        });
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Delete scenario "${scenario.name}"?`,
        { modal: true },
        "Delete",
      );

      if (confirm === "Delete") {
        this.scenarioManager.deleteScenario(scenarioId);
        this._postMessage({
          command: "scenarioDeleted",
          scenarioId,
        });
        this._sendScenarios();
      }
    } catch (error) {
      console.error("Failed to delete scenario:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to delete scenario: ${error}`,
      });
    }
  }

  private async _exportScenario(scenarioId: string) {
    try {
      if (!this.scenarioManager) {
        return;
      }

      await this.scenarioManager.exportScenario(scenarioId);
    } catch (error) {
      console.error("Failed to export scenario:", error);
      vscode.window.showErrorMessage(`Failed to export scenario: ${error}`);
    }
  }

  private _sendScenarios() {
    if (!this.scenarioManager) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const scenarios = editor
      ? this.scenarioManager.getScenariosForFile(editor.document.uri.fsPath)
      : this.scenarioManager.getAllScenarios();

    this._postMessage({
      command: "scenariosLoaded",
      scenarios,
    });
  }

  private _showCreationNotImplemented(type: string) {
    vscode.window.showInformationMessage(
      `${type} creation is coming soon! This will allow you to create custom ${type.toLowerCase()}s for your log analysis.`,
      "OK",
    );
  }

  // Pattern management methods
  private async _handleCreatePattern(data: {
    name: string;
    regex: string;
    severity: string;
    description?: string;
    category?: string[];
    tags?: string[];
  }) {
    try {
      if (!this.patternOverrideManager) {
        this._postMessage({
          command: "showError",
          message: "Pattern manager not available",
        });
        return;
      }

      const pattern = this.patternOverrideManager.createCustomPattern({
        name: data.name,
        regex: data.regex,
        severity: data.severity,
        description: data.description,
        category: data.category,
        tags: data.tags,
      });

      this._postMessage({
        command: "patternCreated",
        pattern,
      });

      vscode.window.showInformationMessage(
        `Pattern "${pattern.name}" created successfully`,
      );

      this._sendPatterns();
    } catch (error) {
      console.error("Failed to create pattern:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to create pattern: ${error}`,
      });
    }
  }

  private async _handleUpdatePattern(
    id: string,
    updates: Partial<PatternOverride>,
  ) {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      const pattern = this.patternOverrideManager.updatePattern(id, updates);
      if (pattern) {
        this._postMessage({
          command: "patternUpdated",
          pattern,
        });
        this._sendPatterns();
      }
    } catch (error) {
      console.error("Failed to update pattern:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to update pattern: ${error}`,
      });
    }
  }

  private async _handleDeletePattern(id: string) {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      const pattern = this.patternOverrideManager.getPattern(id);
      if (!pattern) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Delete pattern "${pattern.name}"?`,
        { modal: true },
        "Delete",
      );

      if (confirm === "Delete") {
        this.patternOverrideManager.deletePattern(id);
        this._postMessage({
          command: "patternDeleted",
          id,
        });
        this._sendPatterns();
      }
    } catch (error) {
      console.error("Failed to delete pattern:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to delete pattern: ${error}`,
      });
    }
  }

  private async _handleResetPattern(sourceId: string) {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Reset pattern to MongoDB original?`,
        { modal: true },
        "Reset",
      );

      if (confirm === "Reset") {
        this.patternOverrideManager.resetOverride(sourceId);
        this._postMessage({
          command: "patternReset",
          sourceId,
        });
        vscode.window.showInformationMessage("Pattern reset to original");
        this._sendPatterns();
      }
    } catch (error) {
      console.error("Failed to reset pattern:", error);
      this._postMessage({
        command: "showError",
        message: `Failed to reset pattern: ${error}`,
      });
    }
  }

  private async _handleTogglePattern(id: string, enabled: boolean) {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      this.patternOverrideManager.togglePattern(id, enabled);
      this._sendPatterns();
    } catch (error) {
      console.error("Failed to toggle pattern:", error);
    }
  }

  private _sendCurrentResults() {
    if (
      ScoutAnalyzerPanel.resultsDataProvider &&
      typeof ScoutAnalyzerPanel.resultsDataProvider.getResults === "function"
    ) {
      const results = ScoutAnalyzerPanel.resultsDataProvider.getResults();
      this._postMessage({
        command: "resultsData",
        results: results,
      });
    } else {
      this._postMessage({
        command: "resultsData",
        results: [],
        error: "No data provider available - LSP may not be connected",
      });
    }
  }

  private _sendPatterns() {
    if (!this.patternOverrideManager) {
      return;
    }

    const patterns = this.patternOverrideManager.getAllPatterns();
    const stats = this.patternOverrideManager.getStats();

    this._postMessage({
      command: "patternsLoaded",
      patterns,
      stats,
    });
  }

  private async _handleExportPatterns() {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      await this.patternOverrideManager.exportPatterns();
    } catch (error) {
      console.error("Failed to export patterns:", error);
      vscode.window.showErrorMessage(`Failed to export patterns: ${error}`);
    }
  }

  private async _handleImportPatterns() {
    try {
      if (!this.patternOverrideManager) {
        return;
      }

      await this.patternOverrideManager.importPatterns();
      this._sendPatterns();
    } catch (error) {
      console.error("Failed to import patterns:", error);
      vscode.window.showErrorMessage(`Failed to import patterns: ${error}`);
    }
  }

  private _update() {
    // Send current results to the panel if data provider is available
    if (
      ScoutAnalyzerPanel.resultsDataProvider &&
      typeof ScoutAnalyzerPanel.resultsDataProvider.getResults === "function"
    ) {
      const results = ScoutAnalyzerPanel.resultsDataProvider.getResults();
      this._postMessage({
        command: "updateResults",
        results: results.length,
        data: results,
      });
    }

    this._panel.webview.html = this._getHtmlContent();
  }

  private _getHtmlContent(): string {
    const editor = vscode.window.activeTextEditor;
    const currentFile = editor
      ? path.basename(editor.document.fileName)
      : "No file open";
    const currentDir = editor ? path.dirname(editor.document.fileName) : "N/A";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scout Analyzer</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
        }

        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        h1 {
            font-size: 20px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }

        .subtitle {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }

        .info-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 20px;
        }

        .info-row {
            display: flex;
            margin-bottom: 8px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-label {
            font-weight: 600;
            min-width: 100px;
            color: var(--vscode-foreground);
        }

        .info-value {
            color: var(--vscode-descriptionForeground);
            word-break: break-all;
        }

        .actions {
            margin-bottom: 20px;
        }

        .action-group {
            margin-bottom: 15px;
        }

        .action-group h3 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-foreground);
        }

        .button {
            display: inline-block;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            font-size: 13px;
            cursor: pointer;
            border-radius: 2px;
            margin-right: 10px;
            margin-bottom: 8px;
            transition: background 0.1s;
        }

        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .button-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .button-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .button-icon {
            margin-right: 6px;
        }

        .status {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-top: 20px;
            display: none;
        }

        .status.active {
            display: block;
        }

        .status-message {
            color: var(--vscode-foreground);
        }

        .spinner {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid var(--vscode-progressBar-background);
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .error {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            padding: 12px;
            border-radius: 4px;
            margin-top: 15px;
            display: none;
        }

        .error.active {
            display: block;
        }

        .help {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .help h4 {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }

        .help ul {
            list-style: none;
            padding-left: 0;
        }

        .help li {
            margin-bottom: 4px;
            padding-left: 16px;
            position: relative;
        }

        .help li:before {
            content: "•";
            position: absolute;
            left: 0;
        }

        /* Creation & Authoring Section */
        .creation-section {
            margin-bottom: 20px;
        }

        .creation-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            overflow-x: auto;
        }

        .tab-button {
            background: transparent;
            color: var(--vscode-descriptionForeground);
            border: none;
            padding: 8px 16px;
            font-size: 12px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.1s;
            white-space: nowrap;
        }

        .tab-button:hover {
            color: var(--vscode-foreground);
            background: var(--vscode-list-hoverBackground);
        }

        .tab-button.active {
            color: var(--vscode-foreground);
            border-bottom-color: var(--vscode-focusBorder);
            font-weight: 600;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .tab-header {
            margin-bottom: 12px;
        }

        .tab-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }

        .items-list {
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 12px;
        }

        .empty-state {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px dashed var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }

        .empty-hint {
            margin-top: 8px;
            font-size: 11px;
            opacity: 0.8;
        }

        .scenario-item {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background 0.1s;
        }

        .scenario-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .scenario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .scenario-name {
            font-weight: 600;
            color: var(--vscode-foreground);
            font-size: 13px;
        }

        .scenario-actions {
            display: flex;
            gap: 8px;
        }

        .scenario-actions button {
            padding: 4px 8px;
            font-size: 11px;
            margin: 0;
        }

        .scenario-description {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-bottom: 6px;
        }

        .scenario-meta {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .scenario-meta span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 20px;
            max-width: 500px;
            width: 90%;
        }

        .modal-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--vscode-foreground);
        }

        .form-group {
            margin-bottom: 16px;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
        }

        .form-input,
        .form-textarea {
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            border-radius: 2px;
        }

        .form-textarea {
            resize: vertical;
            min-height: 60px;
        }

        .form-input:focus,
        .form-textarea:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }

        .modal-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .form-section {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .form-section-header {
            margin-bottom: 12px;
        }

        .form-section-header strong {
            display: block;
            font-size: 13px;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
        }

        .form-section-header small {
            display: block;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }

        .form-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--vscode-foreground);
            cursor: pointer;
        }

        .form-checkbox input[type="checkbox"] {
            cursor: pointer;
        }

        .inline-select {
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 2px;
            cursor: pointer;
        }

        .inline-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .triggers-list {
            margin-bottom: 12px;
        }

        .trigger-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 3px;
            padding: 12px;
            margin-bottom: 8px;
            position: relative;
        }

        .trigger-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .trigger-item label {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            display: block;
            margin-bottom: 4px;
        }

        .trigger-item input,
        .trigger-item select {
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px;
            font-size: 12px;
            border-radius: 2px;
            margin-bottom: 8px;
        }

        .trigger-remove-btn {
            padding: 4px 8px !important;
            font-size: 11px !important;
            margin: 0 !important;
            min-width: auto !important;
        }

        .button-sm {
            padding: 6px 12px !important;
            font-size: 12px !important;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Scout Analyzer</h1>
        <div class="subtitle">Analyze log files for errors, warnings, and patterns</div>
    </div>

    <div class="info-section">
        <div class="info-row">
            <div class="info-label">Current File:</div>
            <div class="info-value" id="currentFile">${currentFile}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Directory:</div>
            <div class="info-value" id="currentDir">${currentDir}</div>
        </div>
    </div>

    <div class="actions">
        <div class="action-group">
            <h3>Quick Actions</h3>
            <button class="button" id="analyzeCurrentBtn">
                <span class="button-icon">📄</span>
                Analyze Current File
            </button>
            <button class="button button-secondary" id="clearBtn">
                <span class="button-icon">🗑️</span>
                Clear Results
            </button>
        </div>

        <div class="action-group">
            <h3>Batch Analysis</h3>
            <button class="button" id="analyzeDirectoryBtn">
                <span class="button-icon">📁</span>
                Analyze Directory
            </button>
            <button class="button" id="analyzeAllBtn">
                <span class="button-icon">🌳</span>
                Analyze All Below (Recursive)
            </button>
        </div>

        <div class="action-group creation-section">
            <h3>✨ Creation & Authoring</h3>
            <div class="creation-tabs">
                <button class="tab-button active" data-tab="patterns">Patterns</button>
                <button class="tab-button" data-tab="signatures">Signatures</button>
                <button class="tab-button" data-tab="actions">Actions</button>
                <button class="tab-button" data-tab="scenarios">Scenarios</button>
                <button class="tab-button" data-tab="states">States</button>
                <button class="tab-button" data-tab="statuses">Statuses</button>
            </div>

            <!-- Patterns Tab -->
            <div class="tab-content active" id="patternsTab">
                <div class="tab-header">
                    <div class="tab-description">Create custom regex patterns for log detection</div>
                    <div>
                        <button class="button" id="createPatternBtn">
                            <span class="button-icon">➕</span>
                            New Pattern
                        </button>
                        <button class="button button-secondary" id="importPatternsBtn">
                            <span class="button-icon">📥</span>
                            Import
                        </button>
                        <button class="button button-secondary" id="exportPatternsBtn">
                            <span class="button-icon">📤</span>
                            Export
                        </button>
                    </div>
                </div>
                <div id="patternsList" class="items-list"></div>
                <div id="emptyPatterns" class="empty-state">
                    <div>No custom patterns yet</div>
                    <div class="empty-hint">Create patterns to detect specific log entries</div>
                </div>
            </div>

            <!-- Signatures Tab -->
            <div class="tab-content" id="signaturesTab">
                <div class="tab-header">
                    <div class="tab-description">Define signatures for known issues or behaviors</div>
                    <button class="button" id="createSignatureBtn">
                        <span class="button-icon">➕</span>
                        New Signature
                    </button>
                </div>
                <div id="signaturesList" class="items-list"></div>
                <div id="emptySignatures" class="empty-state">
                    <div>No signatures yet</div>
                    <div class="empty-hint">Signatures combine multiple patterns to identify complex issues</div>
                </div>
            </div>

            <!-- Actions Tab -->
            <div class="tab-content" id="actionsTab">
                <div class="tab-header">
                    <div class="tab-description">Create automated actions based on detections</div>
                    <button class="button" id="createActionBtn">
                        <span class="button-icon">➕</span>
                        New Action
                    </button>
                </div>
                <div id="actionsList" class="items-list"></div>
                <div id="emptyActions" class="empty-state">
                    <div>No actions yet</div>
                    <div class="empty-hint">Actions trigger automatically when patterns match</div>
                </div>
            </div>

            <!-- Scenarios Tab -->
            <div class="tab-content" id="scenariosTab">
                <div class="tab-header">
                    <div class="tab-description">Save log line selections as scenarios</div>
                    <button class="button" id="createScenarioBtn">
                        <span class="button-icon">➕</span>
                        New Scenario
                    </button>
                    <button class="button button-secondary" id="importScenarioBtn">
                        <span class="button-icon">📥</span>
                        Import
                    </button>
                </div>
                <div id="scenarioList" class="items-list"></div>
                <div id="emptyScenarios" class="empty-state">
                    <div>No scenarios yet</div>
                    <div class="empty-hint">Create scenarios to save specific log line selections</div>
                </div>
            </div>

            <!-- States Tab -->
            <div class="tab-content" id="statesTab">
                <div class="tab-header">
                    <div class="tab-description">Define custom states for system tracking</div>
                    <button class="button" id="createStateBtn">
                        <span class="button-icon">➕</span>
                        New State
                    </button>
                </div>
                <div id="statesList" class="items-list"></div>
                <div id="emptyStates" class="empty-state">
                    <div>No states yet</div>
                    <div class="empty-hint">States track system conditions over time</div>
                </div>
            </div>

            <!-- Statuses Tab -->
            <div class="tab-content" id="statusesTab">
                <div class="tab-header">
                    <div class="tab-description">Create custom status indicators</div>
                    <button class="button" id="createStatusBtn">
                        <span class="button-icon">➕</span>
                        New Status
                    </button>
                </div>
                <div id="statusesList" class="items-list"></div>
                <div id="emptyStatuses" class="empty-state">
                    <div>No statuses yet</div>
                    <div class="empty-hint">Statuses represent health or operational conditions</div>
                </div>
            </div>
        </div>
    </div>

    <div class="status" id="status">
        <span class="spinner"></span>
        <span class="status-message" id="statusMessage">Analyzing...</span>
    </div>

    <div class="error" id="error"></div>

    <div class="help">
        <h4>How to Use</h4>
        <ul>
            <li><strong>Analyze Current File:</strong> Scans the currently open log file</li>
            <li><strong>Analyze Directory:</strong> Scans all .log files in the current directory</li>
            <li><strong>Analyze All Below:</strong> Recursively scans all subdirectories</li>
            <li><strong>Clear Results:</strong> Removes all diagnostics and results</li>
        </ul>
        <div style="margin-top: 12px;">
            <strong>Results appear in:</strong> Problems panel (Ctrl+Shift+M), Scout sidebar, and Status bar
        </div>
    </div>

    <!-- Create Scenario Modal -->
    <div class="modal" id="createScenarioModal">
        <div class="modal-content">
            <div class="modal-header">Create New Scenario</div>
            <form id="createScenarioForm">
                <div class="form-group">
                    <label class="form-label" for="scenarioName">Scenario Name *</label>
                    <input
                        type="text"
                        id="scenarioName"
                        class="form-input"
                        placeholder="e.g., Authentication Failure Flow"
                        required
                    />
                </div>
                <div class="form-group">
                    <label class="form-label" for="scenarioDescription">Description</label>
                    <textarea
                        id="scenarioDescription"
                        class="form-textarea"
                        placeholder="Describe what this scenario captures..."
                    ></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Selected Lines</label>
                    <div style="font-size: 12px; color: var(--vscode-descriptionForeground);">
                        Currently: <span id="selectedLinesCount">0</span> lines selected
                        <div style="margin-top: 4px; font-size: 11px;">
                            Switch to the Problems panel or Results view to select specific lines
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="button button-secondary" id="cancelScenarioBtn">
                        Cancel
                    </button>
                    <button type="submit" class="button" id="saveScenarioBtn">
                        Create Scenario
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Create/Edit Pattern Modal -->
    <div class="modal" id="createPatternModal">
        <div class="modal-content">
            <div class="modal-header" id="patternModalTitle">Create New Pattern</div>
            <form id="createPatternForm">
                <input type="hidden" id="patternId" />
                <input type="hidden" id="patternSourceId" />
                <div class="form-group">
                    <label class="form-label" for="patternName">Pattern Name *</label>
                    <input
                        type="text"
                        id="patternName"
                        class="form-input"
                        placeholder="e.g., SSL Certificate Error"
                        required
                    />
                </div>
                <div class="form-group">
                    <label class="form-label" for="patternRegex">Regular Expression *</label>
                    <textarea
                        id="patternRegex"
                        class="form-textarea"
                        placeholder="e.g., \\bERROR\\b.*certificate.*expired"
                        required
                        style="font-family: 'Courier New', monospace;"
                    ></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="patternSeverity">Default Severity *</label>
                    <select id="patternSeverity" class="form-input" required>
                        <option value="error">Error</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                        <option value="hint">Hint</option>
                    </select>
                    <small style="color: var(--vscode-descriptionForeground); font-size: 11px;">
                        Used when no triggers match
                    </small>
                </div>
                <div class="form-group">
                    <label class="form-label" for="patternDescription">Description</label>
                    <textarea
                        id="patternDescription"
                        class="form-textarea"
                        placeholder="What does this pattern detect?"
                    ></textarea>
                </div>

                <!-- Log Level Triggers Section -->
                <div class="form-section">
                    <div class="form-section-header">
                        <strong>🔍 Log Level Severity Overrides</strong>
                        <small>Change severity based on the log level (ERROR, WARN, INFO, DEBUG)</small>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="triggerFatal" />
                            FATAL → <select id="severityFatal" class="inline-select">
                                <option value="">No Override</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="hint">Hint</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="triggerError" />
                            ERROR → <select id="severityError" class="inline-select">
                                <option value="">No Override</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="hint">Hint</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="triggerWarn" />
                            WARN → <select id="severityWarn" class="inline-select">
                                <option value="">No Override</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="hint">Hint</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="triggerInfo" />
                            INFO → <select id="severityInfo" class="inline-select">
                                <option value="">No Override</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="hint">Hint</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="triggerDebug" />
                            DEBUG → <select id="severityDebug" class="inline-select">
                                <option value="">No Override</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="hint">Hint</option>
                            </select>
                        </label>
                    </div>
                </div>

                <!-- Conditional Triggers Section -->
                <div class="form-section">
                    <div class="form-section-header">
                        <strong>⚡ Value-Based Severity Triggers</strong>
                        <small>Change severity based on captured field values (use named groups like (?P&lt;status&gt;...)</small>
                    </div>
                    <div id="conditionTriggersList" class="triggers-list"></div>
                    <button type="button" class="button button-secondary button-sm" id="addConditionBtn">
                        ➕ Add Condition Trigger
                    </button>
                </div>

                <div class="form-group">
                    <label class="form-label" for="patternNotes">Notes (Optional)</label>
                    <textarea
                        id="patternNotes"
                        class="form-textarea"
                        placeholder="Why did you create/modify this pattern?"
                    ></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="button button-secondary" id="cancelPatternBtn">
                        Cancel
                    </button>
                    <button type="submit" class="button" id="savePatternBtn">
                        Save Pattern
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const analyzeCurrentBtn = document.getElementById('analyzeCurrentBtn');
        const analyzeDirectoryBtn = document.getElementById('analyzeDirectoryBtn');
        const analyzeAllBtn = document.getElementById('analyzeAllBtn');
        const clearBtn = document.getElementById('clearBtn');
        const status = document.getElementById('status');
        const statusMessage = document.getElementById('statusMessage');
        const error = document.getElementById('error');

        function setButtonsEnabled(enabled) {
            analyzeCurrentBtn.disabled = !enabled;
            analyzeDirectoryBtn.disabled = !enabled;
            analyzeAllBtn.disabled = !enabled;
            clearBtn.disabled = !enabled;
        }

        function showStatus(message) {
            statusMessage.textContent = message;
            status.classList.add('active');
            error.classList.remove('active');
        }

        function hideStatus() {
            status.classList.remove('active');
        }

        function showError(message) {
            error.textContent = message;
            error.classList.add('active');
            hideStatus();
        }

        analyzeCurrentBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'analyzeCurrentFile' });
        });

        analyzeDirectoryBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'analyzeDirectory' });
        });

        analyzeAllBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'analyzeAllBelow' });
        });

        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearResults' });
        });

        // Tab switching for Creation & Authoring section
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(tabName + 'Tab');
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });

        // Pattern creation
        const createPatternBtn = document.getElementById('createPatternBtn');
        const importPatternsBtn = document.getElementById('importPatternsBtn');
        const exportPatternsBtn = document.getElementById('exportPatternsBtn');
        const createPatternModal = document.getElementById('createPatternModal');
        const createPatternForm = document.getElementById('createPatternForm');
        const cancelPatternBtn = document.getElementById('cancelPatternBtn');
        const patternsList = document.getElementById('patternsList');
        const emptyPatterns = document.getElementById('emptyPatterns');
        const patternModalTitle = document.getElementById('patternModalTitle');
        const addConditionBtn = document.getElementById('addConditionBtn');
        const conditionTriggersList = document.getElementById('conditionTriggersList');

        let patterns = [];
        let editingPatternId = null;

        // TODO: Trigger UI temporarily removed due to template literal compilation errors
        // Use CONDITIONAL_SEVERITY_GUIDE.md JSON editing workflow instead

        createPatternBtn.addEventListener('click', () => {
            // Reset form for new pattern
            createPatternForm.reset();
            document.getElementById('patternId').value = '';
            document.getElementById('patternSourceId').value = '';

            // TODO: Log level trigger reset removed (template literal syntax errors)
            // TODO: Condition triggers reset removed (template literal syntax errors)

            patternModalTitle.textContent = 'Create New Pattern';
            editingPatternId = null;
            createPatternModal.classList.add('active');
            document.getElementById('patternName').focus();
        });

        importPatternsBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'importPatterns' });
        });

        exportPatternsBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'exportPatterns' });
        });

        cancelPatternBtn.addEventListener('click', () => {
            createPatternModal.classList.remove('active');
            createPatternForm.reset();
            // clearConditionTriggers();
            editingPatternId = null;
        });

        createPatternModal.addEventListener('click', (e) => {
            if (e.target === createPatternModal) {
                createPatternModal.classList.remove('active');
                createPatternForm.reset();
                clearConditionTriggers();
                editingPatternId = null;
            }
        });

        createPatternForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('patternName').value.trim();
            const regex = document.getElementById('patternRegex').value.trim();
            const severity = document.getElementById('patternSeverity').value;
            const description = document.getElementById('patternDescription').value.trim();
            const notes = document.getElementById('patternNotes').value.trim();

            if (!name || !regex) {
                showError('Pattern name and regex are required');
                return;
            }

            // TODO: Collect log level triggers (removed due to template literal errors)
            const logLevelTriggers = {};

            // TODO: Collect condition triggers (removed due to template literal errors)
            const activeConditionTriggers = [];

                    activeConditionTriggers.push({
                        field,
                        operator,
                        value,
                        severity: triggerSeverity,
                        description: triggerDescription || undefined
                    });
                }
            });

            const data = {
                name,
                regex,
                severity,
                description,
                notes,
                logLevelTriggers: Object.keys(logLevelTriggers).length > 0 ? logLevelTriggers : undefined,
                conditionTriggers: activeConditionTriggers.length > 0 ? activeConditionTriggers : undefined
            };

            if (editingPatternId) {
                // Update existing pattern
                vscode.postMessage({
                    command: 'updatePattern',
                    id: editingPatternId,
                    data
                });
            } else {
                // Create new pattern
                vscode.postMessage({
                    command: 'createPattern',
                    data
                });
            }

            createPatternModal.classList.remove('active');
            createPatternForm.reset();
            editingPatternId = null;
            clearConditionTriggers();
        });

        function renderPatterns(patternsData, stats) {
            patterns = patternsData || [];

            if (patterns.length === 0) {
                patternsList.style.display = 'none';
                emptyPatterns.style.display = 'block';
                return;
            }

            patternsList.style.display = 'block';
            emptyPatterns.style.display = 'none';

            patternsList.innerHTML = patterns.map(pattern => {
                const badge = pattern.sourceType === 'custom'
                    ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">\u2728 CUSTOM</span>'
                    : pattern.modified
                    ? '<span style="background: #007acc; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 8px;">\ud83d\udd04 MODIFIED</span>'
                    : '';

                const enabledClass = pattern.enabled === false ? 'opacity: 0.5;' : '';
                const enabledText = pattern.enabled === false ? '\u274c Disabled' : '\u2705 Enabled';

                return '<div class="scenario-item" data-id="' + pattern.id + '" style="' + enabledClass + '">' +
                    '<div class="scenario-header">' +
                        '<div class="scenario-name">' + escapeHtml(pattern.name) + badge + '</div>' +
                        '<div class="scenario-actions">' +
                            '<button class="button button-secondary" onclick="editPattern(\'' + pattern.id + '\')" style="font-size: 11px; padding: 4px 8px;">Edit</button>' +
                            '<button class="button button-secondary" onclick="togglePattern(\'' + pattern.id + '\', ' + (pattern.enabled !== false) + ')" style="font-size: 11px; padding: 4px 8px;">' + (pattern.enabled === false ? 'Enable' : 'Disable') + '</button>' +
                            (pattern.modified ? '<button class="button button-secondary" onclick="resetPattern(\'' + pattern.sourceId + '\')" style="font-size: 11px; padding: 4px 8px;">Reset</button>' : '') +
                            '<button class="button button-secondary" onclick="deletePattern(\'' + pattern.id + '\')" style="font-size: 11px; padding: 4px 8px;">Delete</button>' +
                        '</div>' +
                    '</div>' +
                    (pattern.description ? '<div class="scenario-description">' + escapeHtml(pattern.description) + '</div>' : '') +
                    '<div class="scenario-meta">' +
                        '<span>\ud83d\udd0d ' + escapeHtml(pattern.severity) + '</span>' +
                        '<span>\ud83c\udff7\ufe0f ' + escapeHtml(pattern.regex.substring(0, 50)) + (pattern.regex.length > 50 ? '...' : '') + '</span>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        function editPattern(patternId) {
            const pattern = patterns.find(p => p.id === patternId);
            if (!pattern) return;

            document.getElementById('patternId').value = pattern.id;
            document.getElementById('patternSourceId').value = pattern.sourceId || '';
            document.getElementById('patternName').value = pattern.name;
            document.getElementById('patternRegex').value = pattern.regex;
            document.getElementById('patternSeverity').value = pattern.severity;
            document.getElementById('patternDescription').value = pattern.description || '';
            document.getElementById('patternNotes').value = pattern.notes || '';

            // TODO: Log level triggers UI removed (template literal syntax errors)
            // TODO: Condition triggers UI removed (template literal syntax errors)

            patternModalTitle.textContent = pattern.sourceType === 'custom' ? 'Edit Custom Pattern' : 'Edit Pattern Override';
            editingPatternId = patternId;
            createPatternModal.classList.add('active');
        }

        function deletePattern(patternId) {
            vscode.postMessage({
                command: 'deletePattern',
                id: patternId
            });
        }

        function resetPattern(sourceId) {
            vscode.postMessage({
                command: 'resetPattern',
                sourceId: sourceId
            });
        }

        function togglePattern(patternId, currentlyEnabled) {
            vscode.postMessage({
                command: 'togglePattern',
                id: patternId,
                enabled: !currentlyEnabled
            });
        }

        // Load patterns on startup
        vscode.postMessage({ command: 'loadPatterns' });

        // Signature creation
        const createSignatureBtn = document.getElementById('createSignatureBtn');
        createSignatureBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'createSignature' });
        });

        // Action creation
        const createActionBtn = document.getElementById('createActionBtn');
        createActionBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'createAction' });
        });

        // State creation
        const createStateBtn = document.getElementById('createStateBtn');
        createStateBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'createState' });
        });

        // Status creation
        const createStatusBtn = document.getElementById('createStatusBtn');
        createStatusBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'createStatus' });
        });

        // Scenario management
        const createScenarioBtn = document.getElementById('createScenarioBtn');
        const importScenarioBtn = document.getElementById('importScenarioBtn');
        const createScenarioModal = document.getElementById('createScenarioModal');
        const createScenarioForm = document.getElementById('createScenarioForm');
        const cancelScenarioBtn = document.getElementById('cancelScenarioBtn');
        const scenarioList = document.getElementById('scenarioList');
        const emptyScenarios = document.getElementById('emptyScenarios');

        let scenarios = [];
        let selectedLines = []; // Will be populated from extension

        createScenarioBtn.addEventListener('click', () => {
            createScenarioModal.classList.add('active');
            document.getElementById('scenarioName').focus();
        });

        importScenarioBtn.addEventListener('click', () => {
            vscode.postMessage({ command: 'importScenario' });
        });

        cancelScenarioBtn.addEventListener('click', () => {
            createScenarioModal.classList.remove('active');
            createScenarioForm.reset();
        });

        createScenarioModal.addEventListener('click', (e) => {
            if (e.target === createScenarioModal) {
                createScenarioModal.classList.remove('active');
                createScenarioForm.reset();
            }
        });

        createScenarioForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('scenarioName').value.trim();
            const description = document.getElementById('scenarioDescription').value.trim();

            if (!name) {
                showError('Scenario name is required');
                return;
            }

            vscode.postMessage({
                command: 'createScenario',
                data: {
                    name,
                    description,
                    lines: selectedLines,
                    patterns: []
                }
            });

            createScenarioModal.classList.remove('active');
            createScenarioForm.reset();
        });

        function renderScenarios(scenariosData) {
            scenarios = scenariosData || [];

            if (scenarios.length === 0) {
                scenarioList.style.display = 'none';
                emptyScenarios.style.display = 'block';
                return;
            }

            scenarioList.style.display = 'block';
            emptyScenarios.style.display = 'none';

            scenarioList.innerHTML = scenarios.map(scenario =>
                '<div class="scenario-item" data-id="' + scenario.id + '">' +
                    '<div class="scenario-header">' +
                        '<div class="scenario-name">' + escapeHtml(scenario.name) + '</div>' +
                        '<div class="scenario-actions">' +
                            '<button class="button button-secondary" onclick="exportScenario(\'' + scenario.id + '\')">' +
                                'Export' +
                            '</button>' +
                            '<button class="button button-secondary" onclick="deleteScenario(\'' + scenario.id + '\')">' +
                                'Delete' +
                            '</button>' +
                        '</div>' +
                    '</div>' +
                    (scenario.description ? '<div class="scenario-description">' + escapeHtml(scenario.description) + '</div>' : '') +
                    '<div class="scenario-meta">' +
                        '<span>📄 ' + escapeHtml(scenario.fileName) + '</span>' +
                        '<span>📍 ' + scenario.lines.length + ' lines</span>' +
                        '<span>📅 ' + formatDate(scenario.createdAt) + '</span>' +
                    '</div>' +
                '</div>'
            ).join('');
        }

        function exportScenario(scenarioId) {
            vscode.postMessage({
                command: 'exportScenario',
                scenarioId
            });
        }

        function deleteScenario(scenarioId) {
            vscode.postMessage({
                command: 'deleteScenario',
                scenarioId
            });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(isoString) {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return diffDays + ' days ago';

            return date.toLocaleDateString();
        }

        // Load scenarios on startup
        vscode.postMessage({ command: 'loadScenarios' });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'analysisStarted':
                    setButtonsEnabled(false);
                    showStatus('Analyzing...');
                    break;

                case 'updateStatus':
                    showStatus(message.message);
                    break;

                case 'analysisComplete':
                    setButtonsEnabled(true);
                    showStatus(message.message);
                    setTimeout(hideStatus, 3000);
                    break;

                case 'showError':
                    setButtonsEnabled(true);
                    showError(message.message);
                    break;

                case 'patternsLoaded':
                    renderPatterns(message.patterns, message.stats);
                    break;

                case 'patternCreated':
                    showStatus('Pattern created successfully');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'patternUpdated':
                    showStatus('Pattern updated');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'patternDeleted':
                    showStatus('Pattern deleted');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'patternReset':
                    showStatus('Pattern reset to original');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'scenariosLoaded':
                    renderScenarios(message.scenarios);
                    break;

                case 'scenarioCreated':
                    showStatus('Scenario created successfully');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'scenarioDeleted':
                    showStatus('Scenario deleted');
                    setTimeout(hideStatus, 2000);
                    break;

                case 'updateSelectedLines':
                    selectedLines = message.lines || [];
                    document.getElementById('selectedLinesCount').textContent = selectedLines.length;
                    break;
            }
        });
    </script>
</body>
</html>`;
  }
}
