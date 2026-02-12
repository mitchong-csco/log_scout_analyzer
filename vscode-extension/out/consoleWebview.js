"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleWebview = void 0;
const vscode = __importStar(require("vscode"));
class ConsoleWebview {
    static createOrShow(extensionUri) {
        const column = vscode.ViewColumn.Two;
        // If we already have a panel, show it
        if (ConsoleWebview.currentPanel) {
            ConsoleWebview.currentPanel._panel.reveal(column);
            return ConsoleWebview.currentPanel;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel("scoutConsoleWebview", "Scout Console", column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri],
        });
        ConsoleWebview.currentPanel = new ConsoleWebview(panel);
        return ConsoleWebview.currentPanel;
    }
    constructor(panel) {
        // Extension URI reserved for future use (e.g., loading resources)
        // private readonly _extensionUri: vscode.Uri;
        this._disposables = [];
        this._messages = [];
        this._panel = panel;
        // this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "navigate":
                    this._navigateToLine(message.file, message.line);
                    return;
                case "filter":
                    this._filterMessages(message.severity);
                    return;
                case "clear":
                    this.clear();
                    return;
                case "export":
                    this._exportConsole();
                    return;
            }
        }, null, this._disposables);
    }
    clear() {
        this._messages = [];
        this._update();
    }
    logAnalysisStart(fileName, fileUri) {
        this._messages.push({
            type: "header",
            severity: "info",
            timestamp: new Date(),
            message: `Analysis Started`,
            details: `File: ${fileName}`,
            file: fileUri?.fsPath,
            collapsible: false,
        });
        this._update();
    }
    logAnalysisComplete(errorCount, warningCount, infoCount, duration) {
        const total = errorCount + warningCount + infoCount;
        this._messages.push({
            type: "summary",
            severity: "info",
            timestamp: new Date(),
            message: `Analysis Complete`,
            details: `Duration: ${duration}ms | Total: ${total} | Errors: ${errorCount} | Warnings: ${warningCount} | Info: ${infoCount}`,
            collapsible: false,
        });
        this._update();
    }
    logMessage(severity, line, message, category, timestamp, fileUri, context) {
        this._messages.push({
            type: "message",
            severity,
            timestamp: timestamp || new Date(),
            message,
            category,
            line,
            file: fileUri?.fsPath,
            context,
            collapsible: !!context,
            collapsed: true,
        });
        this._update();
    }
    _navigateToLine(file, line) {
        if (!file)
            return;
        vscode.workspace.openTextDocument(vscode.Uri.file(file)).then((doc) => {
            vscode.window
                .showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: false,
                preview: false,
            })
                .then((editor) => {
                const position = new vscode.Position(line, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            });
        });
    }
    _filterMessages(severity) {
        // Filtering handled in webview via CSS classes
        this._panel.webview.postMessage({
            command: "filterApplied",
            severity,
        });
    }
    _exportConsole() {
        const content = this._messages
            .map((msg) => {
            const timestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
            const time = timestamp.toLocaleTimeString();
            const sev = msg.severity.toUpperCase();
            const cat = msg.category ? `[${msg.category}]` : "";
            const loc = msg.line ? `Line ${msg.line + 1}` : "";
            return `[${time}] ${sev} ${cat} ${loc}: ${msg.message}`;
        })
            .join("\n");
        vscode.workspace
            .openTextDocument({
            content,
            language: "log",
        })
            .then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    }
    _update() {
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
    }
    _getHtmlForWebview(_webview) {
        const messagesHtml = this._messages
            .map((msg, index) => this._getMessageHtml(msg, index))
            .join("");
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scout Console</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            overflow-x: hidden;
        }

        .toolbar {
            position: sticky;
            top: 0;
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 8px 12px;
            display: flex;
            gap: 8px;
            align-items: center;
            z-index: 100;
            flex-wrap: wrap;
        }

        .toolbar-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        }

        .toolbar-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .toolbar-button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .toolbar-button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .toolbar-button.active {
            background-color: var(--vscode-button-hoverBackground);
            font-weight: 600;
        }

        .toolbar-divider {
            width: 1px;
            height: 20px;
            background-color: var(--vscode-panel-border);
            margin: 0 4px;
        }

        .console-container {
            padding: 0;
        }

        .console-message {
            display: flex;
            border-bottom: 1px solid var(--vscode-panel-border);
            transition: background-color 0.1s;
        }

        .console-message:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .console-message.hidden {
            display: none;
        }

        .message-bar {
            width: 4px;
            flex-shrink: 0;
        }

        .message-bar.error {
            background-color: var(--vscode-editorError-foreground);
        }

        .message-bar.warning {
            background-color: var(--vscode-editorWarning-foreground);
        }

        .message-bar.info {
            background-color: var(--vscode-editorInfo-foreground);
        }

        .message-content {
            flex: 1;
            padding: 8px 12px;
            min-width: 0;
        }

        .message-header {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 4px;
        }

        .message-timestamp {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            font-family: var(--vscode-editor-font-family);
            white-space: nowrap;
        }

        .message-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
        }

        .message-badge.error {
            background-color: rgba(244, 67, 54, 0.2);
            color: var(--vscode-editorError-foreground);
        }

        .message-badge.warning {
            background-color: rgba(255, 152, 0, 0.2);
            color: var(--vscode-editorWarning-foreground);
        }

        .message-badge.info {
            background-color: rgba(33, 150, 243, 0.2);
            color: var(--vscode-editorInfo-foreground);
        }

        .message-badge.category {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .message-badge.file {
            background-color: var(--vscode-editorWidget-background);
            color: var(--vscode-editorWidget-foreground);
            cursor: pointer;
        }

        .message-badge.file:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .message-text {
            color: var(--vscode-editor-foreground);
            font-size: 13px;
            word-break: break-word;
        }

        .message-text.header {
            font-weight: 600;
            font-size: 14px;
        }

        .message-text.summary {
            font-weight: 500;
            color: var(--vscode-editorInfo-foreground);
        }

        .message-details {
            margin-top: 4px;
            padding: 8px;
            background-color: var(--vscode-editorWidget-background);
            border-left: 3px solid var(--vscode-editorInfo-foreground);
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: none;
        }

        .message-details.expanded {
            display: block;
        }

        .message-toggle {
            cursor: pointer;
            user-select: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            color: var(--vscode-textLink-foreground);
            font-size: 12px;
            margin-top: 4px;
        }

        .message-toggle:hover {
            text-decoration: underline;
        }

        .toggle-icon {
            transition: transform 0.2s;
        }

        .toggle-icon.expanded {
            transform: rotate(90deg);
        }

        .empty-state {
            padding: 40px 20px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-state-text {
            font-size: 14px;
        }

        .stats {
            display: flex;
            gap: 12px;
            font-size: 12px;
        }

        .stat {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .stat-count {
            font-weight: 600;
        }

        .stat.error .stat-count {
            color: var(--vscode-editorError-foreground);
        }

        .stat.warning .stat-count {
            color: var(--vscode-editorWarning-foreground);
        }

        .stat.info .stat-count {
            color: var(--vscode-editorInfo-foreground);
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <button class="toolbar-button" onclick="clearConsole()">
            Clear
        </button>
        <button class="toolbar-button secondary" onclick="exportConsole()">
            Export
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-button filter-btn active" onclick="filterMessages(null)" data-filter="all">
            All
        </button>
        <button class="toolbar-button filter-btn" onclick="filterMessages('error')" data-filter="error">
            Errors
        </button>
        <button class="toolbar-button filter-btn" onclick="filterMessages('warning')" data-filter="warning">
            Warnings
        </button>
        <button class="toolbar-button filter-btn" onclick="filterMessages('info')" data-filter="info">
            Info
        </button>
        <div class="toolbar-divider"></div>
        <div class="stats">
            <div class="stat error">
                <span>🔴</span>
                <span class="stat-count" id="error-count">0</span>
            </div>
            <div class="stat warning">
                <span>🟡</span>
                <span class="stat-count" id="warning-count">0</span>
            </div>
            <div class="stat info">
                <span>🔵</span>
                <span class="stat-count" id="info-count">0</span>
            </div>
        </div>
    </div>

    <div class="console-container">
        ${messagesHtml || '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">No console output yet. Run an analysis to see results here.</div></div>'}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentFilter = null;

        function clearConsole() {
            vscode.postMessage({ command: 'clear' });
        }

        function exportConsole() {
            vscode.postMessage({ command: 'export' });
        }

        function filterMessages(severity) {
            currentFilter = severity;

            // Update button states
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');

            // Filter messages
            const messages = document.querySelectorAll('.console-message');
            messages.forEach(msg => {
                if (severity === null) {
                    msg.classList.remove('hidden');
                } else {
                    if (msg.dataset.severity === severity) {
                        msg.classList.remove('hidden');
                    } else {
                        msg.classList.add('hidden');
                    }
                }
            });

            vscode.postMessage({ command: 'filter', severity });
        }

        function navigateToLine(file, line) {
            vscode.postMessage({
                command: 'navigate',
                file: file,
                line: line
            });
        }

        function toggleDetails(index) {
            const details = document.getElementById('details-' + index);
            const icon = document.getElementById('icon-' + index);

            if (details.classList.contains('expanded')) {
                details.classList.remove('expanded');
                icon.classList.remove('expanded');
            } else {
                details.classList.add('expanded');
                icon.classList.add('expanded');
            }
        }

        // Update stats
        function updateStats() {
            const messages = document.querySelectorAll('.console-message');
            let errorCount = 0;
            let warningCount = 0;
            let infoCount = 0;

            messages.forEach(msg => {
                const severity = msg.dataset.severity;
                if (severity === 'error') errorCount++;
                else if (severity === 'warning') warningCount++;
                else if (severity === 'info') infoCount++;
            });

            document.getElementById('error-count').textContent = errorCount;
            document.getElementById('warning-count').textContent = warningCount;
            document.getElementById('info-count').textContent = infoCount;
        }

        // Initial stats update
        updateStats();
    </script>
</body>
</html>`;
    }
    _getMessageHtml(msg, index) {
        const timestamp = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
        const time = timestamp.toLocaleTimeString();
        const severityBadge = `<span class="message-badge ${msg.severity}">${msg.severity.toUpperCase()}</span>`;
        const categoryBadge = msg.category
            ? `<span class="message-badge category">${msg.category}</span>`
            : "";
        let fileBadge = "";
        if (msg.file && msg.line !== undefined) {
            const fileName = msg.file.split(/[\\/]/).pop();
            const lineNum = msg.line + 1;
            fileBadge = `<span class="message-badge file" onclick="navigateToLine('${msg.file.replace(/\\/g, "\\\\")}', ${msg.line})">${fileName}:${lineNum}</span>`;
        }
        const messageClass = msg.type === "header"
            ? "header"
            : msg.type === "summary"
                ? "summary"
                : "";
        let detailsHtml = "";
        if (msg.collapsible && msg.context) {
            detailsHtml = `
                <div class="message-toggle" onclick="toggleDetails(${index})">
                    <span class="toggle-icon" id="icon-${index}">▶</span>
                    Show context
                </div>
                <div class="message-details" id="details-${index}">
                    <pre>${this._escapeHtml(msg.context)}</pre>
                </div>
            `;
        }
        else if (msg.details) {
            detailsHtml = `<div class="message-details expanded">${this._escapeHtml(msg.details)}</div>`;
        }
        return `
            <div class="console-message" data-severity="${msg.severity}">
                <div class="message-bar ${msg.severity}"></div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-timestamp">${time}</span>
                        ${severityBadge}
                        ${categoryBadge}
                        ${fileBadge}
                    </div>
                    <div class="message-text ${messageClass}">${this._escapeHtml(msg.message)}</div>
                    ${detailsHtml}
                </div>
            </div>
        `;
    }
    _escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    dispose() {
        ConsoleWebview.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
exports.ConsoleWebview = ConsoleWebview;
//# sourceMappingURL=consoleWebview.js.map