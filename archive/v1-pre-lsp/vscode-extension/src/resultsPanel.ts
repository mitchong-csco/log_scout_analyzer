import * as vscode from "vscode";

export interface AnalysisResult {
    severity: "error" | "warning" | "info" | "debug";
    line: number;
    column: number;
    message: string;
    matchedText: string;
    context: string;
    timestamp?: Date;
    category?: string;
}

export class ResultsPanel {
    private static currentPanel: ResultsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private document: vscode.TextDocument | undefined;
    private allResults: AnalysisResult[] = [];
    private fileName: string = "";
    private analysisTime: string = "";

    private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri) {
        this.panel = panel;

        // Set up message handling
        this.panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case "goToLine":
                        this.goToLine(message.line, message.column);
                        break;
                    case "clearDiagnostics":
                        vscode.commands.executeCommand(
                            "logScoutAnalyzer.clearDiagnostics",
                        );
                        break;
                    case "reanalyze":
                        vscode.commands.executeCommand(
                            "logScoutAnalyzer.analyzeFile",
                        );
                        break;
                    case "applyFilters":
                        this.applyFilters(message.filters);
                        break;
                }
            },
            null,
            this.disposables,
        );

        // Clean up when panel is closed
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        document?: vscode.TextDocument,
    ): ResultsPanel {
        const column = vscode.ViewColumn.Two;

        // If we already have a panel, show it
        if (ResultsPanel.currentPanel) {
            ResultsPanel.currentPanel.panel.reveal(column);
            if (document) {
                ResultsPanel.currentPanel.document = document;
            }
            return ResultsPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            "logScoutResults",
            "Scout Analysis Results",
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri],
            },
        );

        ResultsPanel.currentPanel = new ResultsPanel(panel, extensionUri);
        if (document) {
            ResultsPanel.currentPanel.document = document;
        }
        return ResultsPanel.currentPanel;
    }

    public updateResults(
        results: AnalysisResult[],
        fileName: string,
        timestamp: string,
    ): void {
        this.allResults = results;
        this.fileName = fileName;
        this.analysisTime = timestamp;
        this.panel.webview.html = this.getHtmlContent(
            results,
            fileName,
            timestamp,
        );
    }

    private applyFilters(filters: any): void {
        let filtered = [...this.allResults];

        // Filter by tab (severity)
        if (filters.tab !== "all") {
            filtered = filtered.filter((r) => r.severity === filters.tab);
        }

        // Filter by category
        if (filters.category && filters.category !== "all") {
            filtered = filtered.filter((r) => r.category === filters.category);
        }

        // Filter by keyword search
        if (filters.keyword && filters.keyword.trim() !== "") {
            const keyword = filters.keyword.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.message.toLowerCase().includes(keyword) ||
                    r.matchedText.toLowerCase().includes(keyword) ||
                    r.context.toLowerCase().includes(keyword),
            );
        }

        // Filter by datetime range
        if (filters.startDate || filters.endDate) {
            filtered = filtered.filter((r) => {
                if (!r.timestamp) return true;
                const resultTime = r.timestamp.getTime();
                if (
                    filters.startDate &&
                    resultTime < new Date(filters.startDate).getTime()
                ) {
                    return false;
                }
                if (
                    filters.endDate &&
                    resultTime > new Date(filters.endDate).getTime()
                ) {
                    return false;
                }
                return true;
            });
        }

        // Re-render with filtered results
        this.panel.webview.html = this.getHtmlContent(
            filtered,
            this.fileName,
            this.analysisTime,
        );
    }

    private goToLine(line: number, column: number): void {
        if (!this.document) {
            // Try to get active editor
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                this.document = editor.document;
            }
        }

        if (this.document) {
            vscode.window.showTextDocument(this.document).then((editor) => {
                const position = new vscode.Position(line, column);
                const range = new vscode.Range(position, position);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(range);
            });
        }
    }

    private getHtmlContent(
        results: AnalysisResult[],
        fileName: string,
        timestamp: string,
    ): string {
        const errors = results.filter((r) => r.severity === "error");
        const warnings = results.filter((r) => r.severity === "warning");
        const infos = results.filter((r) => r.severity === "info");

        const hasResults = results.length > 0;

        // Extract unique categories
        const categories = [
            ...new Set(results.map((r) => r.category).filter((c) => c)),
        ];

        // Extract timestamps for date range
        const timestamps = results
            .map((r) => r.timestamp)
            .filter((t) => t) as Date[];
        const minDate =
            timestamps.length > 0
                ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
                : null;
        const maxDate =
            timestamps.length > 0
                ? new Date(Math.max(...timestamps.map((t) => t.getTime())))
                : null;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scout Analysis Results</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            overflow-x: hidden;
        }
        .header {
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 16px 20px;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header h1 {
            margin: 0 0 8px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .header .meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            gap: 20px;
            margin-top: 8px;
        }
        .header .meta .file {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .summary {
            display: flex;
            gap: 12px;
            padding: 16px 20px;
            background-color: var(--vscode-editorWidget-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .summary-card {
            flex: 1;
            padding: 12px 16px;
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .summary-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .summary-card.error {
            background-color: rgba(255, 0, 0, 0.1);
            border-color: var(--vscode-inputValidation-errorBorder);
        }
        .summary-card.warning {
            background-color: rgba(255, 165, 0, 0.1);
            border-color: var(--vscode-inputValidation-warningBorder);
        }
        .summary-card.info {
            background-color: rgba(0, 100, 255, 0.1);
            border-color: var(--vscode-inputValidation-infoBorder);
        }
        .summary-card.success {
            background-color: rgba(0, 200, 0, 0.1);
            border-color: rgba(0, 200, 0, 0.3);
        }
        .summary-card.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
        }
        .summary-icon {
            font-size: 24px;
            line-height: 1;
        }
        .summary-content {
            flex: 1;
        }
        .summary-count {
            font-size: 24px;
            font-weight: 600;
            line-height: 1;
            margin-bottom: 4px;
        }
        .summary-label {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.8;
            letter-spacing: 0.5px;
        }
        .filters {
            padding: 16px 20px;
            background-color: var(--vscode-editorWidget-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .filters-row {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .filter-group {
            flex: 1;
            min-width: 200px;
        }
        .filter-group label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }
        .filter-group input,
        .filter-group select {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        .filter-group input:focus,
        .filter-group select:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .filter-actions {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        .content {
            padding: 20px;
            max-height: calc(100vh - 400px);
            overflow-y: auto;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
        }
        .empty-state .icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
        .empty-state h2 {
            margin: 0 0 8px 0;
            font-size: 20px;
            color: var(--vscode-foreground);
        }
        .empty-state p {
            margin: 0;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .result-item {
            background-color: var(--vscode-list-hoverBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        .result-item:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
            border-color: var(--vscode-focusBorder);
            transform: translateX(2px);
        }
        .result-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
        }
        .result-icon {
            font-size: 16px;
            line-height: 1;
            margin-top: 2px;
        }
        .result-info {
            flex: 1;
        }
        .result-location {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        .result-timestamp {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-left: 8px;
        }
        .result-category {
            display: inline-block;
            font-size: 10px;
            color: var(--vscode-badge-foreground);
            background-color: var(--vscode-badge-background);
            padding: 2px 6px;
            border-radius: 3px;
            margin-left: 8px;
        }
        .result-message {
            font-size: 13px;
            color: var(--vscode-foreground);
            margin-bottom: 6px;
            font-weight: 500;
        }
        .result-text {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            color: var(--vscode-textPreformat-foreground);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 3px;
            margin-bottom: 6px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-all;
        }
        .result-context {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            padding: 6px 8px;
            background-color: var(--vscode-editorWidget-background);
            border-left: 2px solid var(--vscode-panel-border);
            border-radius: 2px;
            overflow-x: auto;
            white-space: nowrap;
        }
        .actions {
            padding: 16px 20px;
            background-color: var(--vscode-editorGroupHeader-tabsBackground);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            position: sticky;
            bottom: 0;
        }
        .btn {
            padding: 6px 14px;
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.15s ease;
        }
        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-small {
            padding: 4px 10px;
            font-size: 12px;
        }
        .stats {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            padding: 8px 20px;
            background-color: var(--vscode-editorWidget-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Scout Analysis Results</h1>
        <div class="meta">
            <span class="file" title="${this.escapeHtml(fileName)}">📄 ${this.escapeHtml(fileName)}</span>
            <span>⏱️ ${this.escapeHtml(timestamp)}</span>
        </div>
    </div>

    <div class="summary">
        ${
            hasResults
                ? `
        <div class="summary-card" data-tab="all" onclick="filterByTab('all')">
            <div class="summary-icon">📊</div>
            <div class="summary-content">
                <div class="summary-count">${results.length}</div>
                <div class="summary-label">All Issues</div>
            </div>
        </div>
        <div class="summary-card error" data-tab="error" onclick="filterByTab('error')">
            <div class="summary-icon">🔴</div>
            <div class="summary-content">
                <div class="summary-count">${errors.length}</div>
                <div class="summary-label">Errors</div>
            </div>
        </div>
        <div class="summary-card warning" data-tab="warning" onclick="filterByTab('warning')">
            <div class="summary-icon">🟡</div>
            <div class="summary-content">
                <div class="summary-count">${warnings.length}</div>
                <div class="summary-label">Warnings</div>
            </div>
        </div>
        <div class="summary-card info" data-tab="info" onclick="filterByTab('info')">
            <div class="summary-icon">🔵</div>
            <div class="summary-content">
                <div class="summary-count">${infos.length}</div>
                <div class="summary-label">Info</div>
            </div>
        </div>
        `
                : `
        <div class="summary-card success" style="flex: 1;">
            <div class="summary-icon">✅</div>
            <div class="summary-content">
                <div class="summary-count">0</div>
                <div class="summary-label">Issues Found</div>
            </div>
        </div>
        `
        }
    </div>

    ${
        hasResults
            ? `
    <div class="filters">
        <div class="filters-row">
            <div class="filter-group">
                <label for="keywordSearch">🔎 Keyword Search</label>
                <input type="text" id="keywordSearch" placeholder="Search in messages, text, context..." />
            </div>
            ${
                categories.length > 0
                    ? `
            <div class="filter-group">
                <label for="categoryFilter">📂 Category</label>
                <select id="categoryFilter">
                    <option value="all">All Categories</option>
                    ${categories.map((cat) => `<option value="${this.escapeHtml(cat || "")}">${this.escapeHtml(cat || "Uncategorized")}</option>`).join("")}
                </select>
            </div>
            `
                    : ""
            }
            ${
                minDate && maxDate
                    ? `
            <div class="filter-group">
                <label for="startDate">📅 Start Date</label>
                <input type="datetime-local" id="startDate" value="${this.formatDateForInput(minDate)}" />
            </div>
            <div class="filter-group">
                <label for="endDate">📅 End Date</label>
                <input type="datetime-local" id="endDate" value="${this.formatDateForInput(maxDate)}" />
            </div>
            `
                    : ""
            }
            <div class="filter-actions">
                <button class="btn btn-primary btn-small" onclick="applyFilters()">Apply Filters</button>
                <button class="btn btn-secondary btn-small" onclick="resetFilters()">Reset</button>
            </div>
        </div>
    </div>

    <div class="stats">
        Showing <strong id="resultCount">${results.length}</strong> of <strong>${this.allResults.length}</strong> results
    </div>
    `
            : ""
    }

    <div class="content" id="resultsContent">
        ${
            hasResults
                ? results
                      .map((result) => this.renderResultItem(result))
                      .join("")
                : `
            <div class="empty-state">
                <div class="icon">✨</div>
                <h2>All Clear!</h2>
                <p>No errors, warnings, or issues detected in this log file.</p>
                <p style="margin-top: 8px; font-size: 12px;">The file appears to be clean or no patterns matched.</p>
            </div>
        `
        }
    </div>

    <div class="actions">
        <button class="btn btn-primary" onclick="reanalyze()">🔄 Re-analyze</button>
        <button class="btn btn-secondary" onclick="clearDiagnostics()">🗑️ Clear All</button>
        ${hasResults ? `<button class="btn btn-secondary" onclick="exportResults()">💾 Export</button>` : ""}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentTab = 'all';
        let allResultsData = ${JSON.stringify(results)};

        function goToLine(line, column) {
            vscode.postMessage({
                command: 'goToLine',
                line: line,
                column: column
            });
        }

        function clearDiagnostics() {
            vscode.postMessage({
                command: 'clearDiagnostics'
            });
        }

        function reanalyze() {
            vscode.postMessage({
                command: 'reanalyze'
            });
        }

        function filterByTab(tab) {
            currentTab = tab;

            // Update active state
            document.querySelectorAll('.summary-card').forEach(card => {
                card.classList.remove('active');
            });
            document.querySelector(\`[data-tab="\${tab}"]\`)?.classList.add('active');

            applyFilters();
        }

        function applyFilters() {
            const keyword = document.getElementById('keywordSearch')?.value || '';
            const category = document.getElementById('categoryFilter')?.value || 'all';
            const startDate = document.getElementById('startDate')?.value || '';
            const endDate = document.getElementById('endDate')?.value || '';

            vscode.postMessage({
                command: 'applyFilters',
                filters: {
                    tab: currentTab,
                    keyword: keyword,
                    category: category,
                    startDate: startDate,
                    endDate: endDate
                }
            });
        }

        function resetFilters() {
            currentTab = 'all';
            document.querySelectorAll('.summary-card').forEach(card => {
                card.classList.remove('active');
            });

            const keywordInput = document.getElementById('keywordSearch');
            if (keywordInput) keywordInput.value = '';

            const categorySelect = document.getElementById('categoryFilter');
            if (categorySelect) categorySelect.value = 'all';

            const startDateInput = document.getElementById('startDate');
            if (startDateInput) startDateInput.value = '';

            const endDateInput = document.getElementById('endDate');
            if (endDateInput) endDateInput.value = '';

            applyFilters();
        }

        function exportResults() {
            const results = allResultsData;
            const text = results.map(r =>
                \`Line \${r.line + 1}: [\${r.severity.toUpperCase()}] \${r.message}\\n  \${r.matchedText}\\n\`
            ).join('\\n');

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'scout-analysis-results.txt';
            a.click();
        }

        // Add enter key support for keyword search
        document.getElementById('keywordSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });

        // Initialize first tab as active
        document.querySelector('[data-tab="all"]')?.classList.add('active');
    </script>
</body>
</html>`;
    }

    private renderResultItem(result: AnalysisResult): string {
        const icon =
            result.severity === "error"
                ? "🔴"
                : result.severity === "warning"
                  ? "🟡"
                  : "🔵";
        const lineNum = result.line + 1; // Convert to 1-based for display

        return `
        <div class="result-item" onclick="goToLine(${result.line}, ${result.column})">
            <div class="result-header">
                <span class="result-icon">${icon}</span>
                <div class="result-info">
                    <span class="result-location">Line ${lineNum}:${result.column}</span>
                    ${result.timestamp ? `<span class="result-timestamp">🕐 ${this.formatTimestamp(result.timestamp)}</span>` : ""}
                    ${result.category ? `<span class="result-category">${this.escapeHtml(result.category)}</span>` : ""}
                </div>
            </div>
            <div class="result-message">${this.escapeHtml(result.message)}</div>
            <div class="result-text">${this.escapeHtml(result.matchedText)}</div>
            ${result.context ? `<div class="result-context">${this.escapeHtml(result.context)}</div>` : ""}
        </div>`;
    }

    private formatTimestamp(date: Date): string {
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    private formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public dispose(): void {
        ResultsPanel.currentPanel = undefined;

        // Clean up resources
        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
