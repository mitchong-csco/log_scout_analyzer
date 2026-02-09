import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DiagnosticsProvider } from "./diagnosticsProvider";

export class ScoutAnalyzerPanel {
    public static currentPanel: ScoutAnalyzerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private static _diagnosticsProvider: DiagnosticsProvider | undefined;

    public static setDiagnosticsProvider(provider: DiagnosticsProvider) {
        ScoutAnalyzerPanel._diagnosticsProvider = provider;
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        // If we already have a panel, show it
        if (ScoutAnalyzerPanel.currentPanel) {
            ScoutAnalyzerPanel.currentPanel._panel.reveal();
            return;
        }

        // Open beside the active editor (preserves focus on main editor)
        const column = vscode.ViewColumn.Beside;

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

        ScoutAnalyzerPanel.currentPanel = new ScoutAnalyzerPanel(panel);
    }

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

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
            await vscode.commands.executeCommand(
                "logScoutAnalyzer.analyzeFile",
            );

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
                // Open document in background without showing it
                const doc = await vscode.workspace.openTextDocument(file);

                // Analyze directly using diagnostics provider (no UI opening)
                if (ScoutAnalyzerPanel._diagnosticsProvider) {
                    ScoutAnalyzerPanel._diagnosticsProvider.analyzeDocument(
                        doc,
                    );
                }

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
                // Open document in background without showing it
                const doc = await vscode.workspace.openTextDocument(file);

                // Analyze directly using diagnostics provider (no UI opening)
                if (ScoutAnalyzerPanel._diagnosticsProvider) {
                    ScoutAnalyzerPanel._diagnosticsProvider.analyzeDocument(
                        doc,
                    );
                }

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

    private _update() {
        this._panel.webview.html = this._getHtmlContent();
    }

    private _getHtmlContent(): string {
        const editor = vscode.window.activeTextEditor;
        const currentFile = editor
            ? path.basename(editor.document.fileName)
            : "No file open";
        const currentDir = editor
            ? path.dirname(editor.document.fileName)
            : "N/A";

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
            }
        });
    </script>
</body>
</html>`;
    }
}
