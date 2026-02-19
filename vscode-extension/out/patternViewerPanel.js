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
exports.PatternViewerPanel = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class PatternViewerPanel {
    constructor(panel, _extensionUri) {
        this._disposables = [];
        this._panel = panel;
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case "exportToJson":
                    this._exportToJson(message.data);
                    break;
                case "copyToClipboard":
                    vscode.env.clipboard.writeText(JSON.stringify(message.data, null, 2));
                    vscode.window.showInformationMessage("Patterns copied to clipboard");
                    break;
            }
        }, null, this._disposables);
    }
    static createOrShow(extensionUri, patterns) {
        const column = vscode.ViewColumn.One;
        // If we already have a panel, show it
        if (PatternViewerPanel.currentPanel) {
            PatternViewerPanel.currentPanel._panel.reveal(column);
            PatternViewerPanel.currentPanel.updatePatterns(patterns);
            return PatternViewerPanel.currentPanel;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel("patternViewer", "Pattern Library", column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri],
        });
        PatternViewerPanel.currentPanel = new PatternViewerPanel(panel, extensionUri);
        PatternViewerPanel.currentPanel.updatePatterns(patterns);
        return PatternViewerPanel.currentPanel;
    }
    updatePatterns(patterns) {
        this._panel.webview.html = this._getHtmlForWebview(patterns);
    }
    _exportToJson(data) {
        const options = {
            saveLabel: "Export Patterns",
            filters: {
                "JSON files": ["json"],
                "All files": ["*"],
            },
            defaultUri: vscode.Uri.file("patterns-export.json"),
        };
        vscode.window.showSaveDialog(options).then((fileUri) => {
            if (fileUri) {
                fs.writeFileSync(fileUri.fsPath, JSON.stringify(data, null, 2), "utf8");
                vscode.window.showInformationMessage(`Patterns exported to ${path.basename(fileUri.fsPath)}`);
            }
        });
    }
    dispose() {
        PatternViewerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    _update() {
        this._panel.title = "Pattern Library";
    }
    _getHtmlForWebview(data) {
        const patterns = data.patterns || [];
        const count = data.count || 0;
        const source = data.source || "unknown";
        // Group patterns by category
        const byCategory = {};
        const bySeverity = {};
        const byService = {};
        patterns.forEach((p) => {
            const category = p.category || "uncategorized";
            const severity = p.severity || "info";
            const service = p.service || "general";
            if (!byCategory[category])
                byCategory[category] = [];
            if (!bySeverity[severity])
                bySeverity[severity] = [];
            if (!byService[service])
                byService[service] = [];
            byCategory[category].push(p);
            bySeverity[severity].push(p);
            byService[service].push(p);
        });
        const categories = Object.keys(byCategory).sort();
        const severities = Object.keys(bySeverity).sort();
        const services = Object.keys(byService).sort();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pattern Library</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .stat {
            display: flex;
            flex-direction: column;
        }
        .stat-label {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        select {
            padding: 6px 12px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 4px;
        }
        input[type="text"] {
            flex: 1;
            padding: 6px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .pattern-list {
            display: grid;
            gap: 12px;
        }
        .pattern-card {
            padding: 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 4px solid;
            border-radius: 4px;
        }
        .pattern-card.error { border-left-color: var(--vscode-errorForeground); }
        .pattern-card.warning { border-left-color: var(--vscode-editorWarning-foreground); }
        .pattern-card.info { border-left-color: var(--vscode-editorInfo-foreground); }
        .pattern-card.hint { border-left-color: var(--vscode-editorHint-foreground); }
        .pattern-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }
        .pattern-name {
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 4px 0;
        }
        .pattern-id {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-family: monospace;
        }
        .pattern-badges {
            display: flex;
            gap: 6px;
        }
        .badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
        }
        .badge.severity { background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
        .badge.category { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        .pattern-description {
            margin: 8px 0;
            color: var(--vscode-descriptionForeground);
        }
        .pattern-regex {
            margin: 8px 0;
            padding: 8px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
        }
        .pattern-parameters {
            margin: 8px 0;
            padding: 8px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-charts-blue);
        }
        .pattern-parameters-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-charts-blue);
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        .parameter-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .parameter {
            padding: 3px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
            font-size: 11px;
            font-family: monospace;
        }
        .pattern-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .tags {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        .tag {
            padding: 2px 6px;
            background-color: var(--vscode-badge-background);
            border-radius: 3px;
            font-size: 10px;
        }
        .action {
            margin-top: 8px;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            font-size: 12px;
        }
        .action::before {
            content: "💡 ";
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>📚 Pattern Library</h1>
            <p style="margin: 4px 0 0 0; color: var(--vscode-descriptionForeground);">
                Loaded from <strong>${source}</strong>
            </p>
        </div>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-label">Total Patterns</div>
            <div class="stat-value">${count}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Categories</div>
            <div class="stat-value">${categories.length}</div>
        </div>
        <div class="stat">
            <div class="stat-label">Services</div>
            <div class="stat-value">${services.length}</div>
        </div>
    </div>

    <div class="actions">
        <button onclick="exportJson()">📥 Export to JSON</button>
        <button onclick="copyToClipboard()">📋 Copy to Clipboard</button>
    </div>

    <div class="filters">
        <select id="severityFilter" onchange="filterPatterns()">
            <option value="">All Severities</option>
            ${severities
            .map((s) => `<option value="${s}">${s} (${bySeverity[s].length})</option>`)
            .join("")}
        </select>
        <select id="categoryFilter" onchange="filterPatterns()">
            <option value="">All Categories</option>
            ${categories
            .map((c) => `<option value="${c}">${c} (${byCategory[c].length})</option>`)
            .join("")}
        </select>
        <select id="serviceFilter" onchange="filterPatterns()">
            <option value="">All Services</option>
            ${services
            .map((s) => `<option value="${s}">${s} (${byService[s].length})</option>`)
            .join("")}
        </select>
        <input type="text" id="searchInput" placeholder="Search patterns..." oninput="filterPatterns()">
    </div>

    <div class="pattern-list" id="patternList">
        ${patterns
            .map((p) => `
            <div class="pattern-card ${p.severity}" 
                 data-severity="${p.severity}" 
                 data-category="${p.category || ""}" 
                 data-service="${p.service || ""}"
                 data-search="${p.name.toLowerCase()} ${p.description.toLowerCase()} ${p.id.toLowerCase()}">
                <div class="pattern-header">
                    <div>
                        <h3 class="pattern-name">${p.name}</h3>
                        <div class="pattern-id">${p.id}</div>
                    </div>
                    <div class="pattern-badges">
                        <span class="badge severity">${p.severity}</span>
                        ${p.category ? `<span class="badge category">${p.category}</span>` : ""}
                    </div>
                </div>
                <div class="pattern-description">${p.description}</div>
                <div class="pattern-regex"><code>${p.pattern}</code></div>
                ${p.captureFields && p.captureFields.length > 0
            ? `<div class="pattern-parameters">
                        <div class="pattern-parameters-title">📊 Extracted Fields</div>
                        <div class="parameter-list">
                          ${p.captureFields.map((field) => `<span class="parameter">${field}</span>`).join('')}
                        </div>
                      </div>`
            : ''}
                ${p.parameterExtractors && p.parameterExtractors.length > 0
            ? `<div class="pattern-parameters">
                        <div class="pattern-parameters-title">🔧 Parameter Extractors</div>
                        <div class="parameter-list">
                          ${p.parameterExtractors.map((pe) => `<span class="parameter" title="${pe.regex}">${pe.name}</span>`).join('')}
                        </div>
                      </div>`
            : ''}
                <div class="pattern-footer">
                    <div class="tags">
                        ${p.service ? `<span class="tag">🔧 ${p.service}</span>` : ""}
                        ${(p.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}
                    </div>
                </div>
                ${p.action ? `<div class="action">${p.action}</div>` : ""}
            </div>
        `)
            .join("")}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const patternsData = ${JSON.stringify(data)};

        function exportJson() {
            vscode.postMessage({
                command: 'exportToJson',
                data: patternsData
            });
        }

        function copyToClipboard() {
            vscode.postMessage({
                command: 'copyToClipboard',
                data: patternsData
            });
        }

        function filterPatterns() {
            const severityFilter = document.getElementById('severityFilter').value;
            const categoryFilter = document.getElementById('categoryFilter').value;
            const serviceFilter = document.getElementById('serviceFilter').value;
            const searchText = document.getElementById('searchInput').value.toLowerCase();

            const cards = document.querySelectorAll('.pattern-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const severity = card.getAttribute('data-severity');
                const category = card.getAttribute('data-category');
                const service = card.getAttribute('data-service');
                const searchData = card.getAttribute('data-search');

                const matchesSeverity = !severityFilter || severity === severityFilter;
                const matchesCategory = !categoryFilter || category === categoryFilter;
                const matchesService = !serviceFilter || service === serviceFilter;
                const matchesSearch = !searchText || searchData.includes(searchText);

                if (matchesSeverity && matchesCategory && matchesService && matchesSearch) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            // Update stats
            console.log('Showing ' + visibleCount + ' of ' + cards.length + ' patterns');
        }
    </script>
</body>
</html>`;
    }
}
exports.PatternViewerPanel = PatternViewerPanel;
//# sourceMappingURL=patternViewerPanel.js.map