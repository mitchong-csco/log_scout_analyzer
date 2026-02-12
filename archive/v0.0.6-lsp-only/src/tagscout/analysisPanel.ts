import * as vscode from 'vscode';
import { AnalysisResults, LogMatch } from './analyzerTreeProvider';

export class AnalysisPanel {
    public static currentPanel: AnalysisPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _results: AnalysisResults;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, results: AnalysisResults) {
        this._panel = panel;
        this._results = results;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            null,
            this._disposables
        );

        this._update();
    }

    public static createOrShow(extensionUri: vscode.Uri, results: AnalysisResults) {
        const column = vscode.ViewColumn.One;

        if (AnalysisPanel.currentPanel) {
            AnalysisPanel.currentPanel._panel.reveal(column);
            AnalysisPanel.currentPanel._results = results;
            AnalysisPanel.currentPanel._update();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'tagscoutResults',
            'TagScout Analysis Results',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        AnalysisPanel.currentPanel = new AnalysisPanel(panel, extensionUri, results);
    }

    private _update() {
        this._panel.webview.html = this._getHtmlContent();
    }

    private _handleMessage(message: any) {
        switch (message.command) {
            case 'expandCard':
                console.log('Expand card:', message.id);
                break;
            case 'filterBySeverity':
                console.log('Filter by severity:', message.severity);
                break;
            case 'searchPattern':
                console.log('Search pattern:', message.query);
                break;
        }
    }

    private _getHtmlContent(): string {
        const results = this._results;
        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>TagScout Analysis Results</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }

        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .subtitle {
            font-size: 14px;
            opacity: 0.7;
        }

        /* Statistics Cards */
        .stats-section {
            margin-bottom: 30px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .stat-card {
            padding: 20px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            border-left: 4px solid;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .stat-card.error { border-left-color: #f44336; }
        .stat-card.warning { border-left-color: #ff9800; }
        .stat-card.info { border-left-color: #2196f3; }
        .stat-card.total { border-left-color: #9c27b0; }

        .stat-number {
            font-size: 36px;
            font-weight: bold;
        }

        .stat-label {
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.7;
            letter-spacing: 1px;
        }

        /* Client Info Card */
        .info-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .info-card h2 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 12px;
        }

        .info-item {
            display: flex;
            gap: 10px;
        }

        .info-label {
            font-weight: 600;
            min-width: 80px;
        }

        .info-value {
            opacity: 0.9;
        }

        /* Config Files */
        .config-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .config-tag {
            background: var(--vscode-button-secondaryBackground);
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
        }

        /* Filter Card */
        .filter-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 20px;
        }

        .filter-card h2 {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .filter-row {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 10px;
        }

        .filter-button {
            padding: 8px 16px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }

        .filter-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .filter-button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .search-box {
            flex: 1;
            min-width: 300px;
        }

        .search-input {
            width: 100%;
            padding: 8px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 13px;
        }

        /* Status Bar */
        .status-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 20px;
            background: var(--vscode-statusBar-background);
            color: var(--vscode-statusBar-foreground);
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 13px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* Timeline Section */
        .timeline-section {
            margin-top: 30px;
        }

        .timeline-header {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* Log Card */
        .log-card {
            display: flex;
            margin-bottom: 12px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .log-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }

        .log-card-border {
            width: 5px;
            min-height: 100%;
        }

        .log-card-border.error { background-color: #f44336; }
        .log-card-border.warning { background-color: #ff9800; }
        .log-card-border.info { background-color: #2196f3; }

        .log-card-content {
            flex: 1;
            padding: 16px;
        }

        .log-card-header {
            display: grid;
            grid-template-columns: 180px 80px 1fr;
            gap: 16px;
            align-items: center;
            cursor: pointer;
            padding: 4px 0;
        }

        .log-card-header:hover {
            background: var(--vscode-list-hoverBackground);
            margin: 0 -8px;
            padding: 4px 8px;
            border-radius: 4px;
        }

        .log-timestamp {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .log-severity {
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .log-severity.error { color: #f44336; }
        .log-severity.warning { color: #ff9800; }
        .log-severity.info { color: #2196f3; }

        .log-message {
            font-size: 14px;
        }

        .log-card-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .meta-label {
            font-weight: 600;
        }

        .pattern-tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
        }

        /* Accordion */
        .accordion {
            margin-top: 12px;
        }

        .accordion-toggle {
            background: none;
            border: none;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-size: 12px;
            padding: 4px 0;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .accordion-toggle:hover {
            text-decoration: underline;
        }

        .accordion-content {
            margin-top: 8px;
            padding: 12px;
            background: var(--vscode-textCodeBlock-background);
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            word-wrap: break-word;
            overflow-x: auto;
            display: none;
        }

        .accordion-content.expanded {
            display: block;
        }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            opacity: 0.6;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 TagScout Analysis Results</h1>
        <div class="subtitle">Complete analysis of log files</div>
    </div>

    <!-- Statistics Section -->
    <div class="stats-section">
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-number">${results.totalMatches}</div>
                <div class="stat-label">Total Matches</div>
            </div>
            <div class="stat-card error">
                <div class="stat-number">${results.errorCount}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-number">${results.warningCount}</div>
                <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-card info">
                <div class="stat-number">${results.infoCount}</div>
                <div class="stat-label">Info</div>
            </div>
        </div>
    </div>

    <!-- Client Information -->
    ${this._generateClientInfoHtml(results)}

    <!-- Filter Card -->
    <div class="filter-card">
        <h2>🔍 Filters</h2>
        <div class="filter-row">
            <button class="filter-button active" onclick="filterBySeverity('all')">All</button>
            <button class="filter-button" onclick="filterBySeverity('error')">🔴 Errors</button>
            <button class="filter-button" onclick="filterBySeverity('warning')">🟡 Warnings</button>
            <button class="filter-button" onclick="filterBySeverity('info')">🔵 Info</button>
        </div>
        <div class="filter-row">
            <div class="search-box">
                <input type="text" class="search-input" placeholder="Search patterns..."
                       oninput="searchPattern(this.value)">
            </div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar">
        <div class="status-item">
            <strong>Showing:</strong> <span id="shown-count">${results.totalMatches}</span>
            of <strong>${results.totalMatches}</strong> matches
        </div>
        <div class="status-item">
            <strong>Time Range:</strong>
            ${this._formatDateTime(results.timeRange.from)} to ${this._formatDateTime(results.timeRange.to)}
        </div>
    </div>

    <!-- Timeline Section -->
    <div class="timeline-section">
        <div class="timeline-header">
            ⏱️ Timeline
        </div>

        ${results.matches.length > 0 ? this._generateTimelineHtml(results.matches) : '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No matches found</p></div>'}
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentFilter = 'all';
        let currentSearch = '';

        function toggleCard(id) {
            const content = document.getElementById('content-' + id);
            const arrow = document.getElementById('arrow-' + id);
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                arrow.textContent = '▶';
            } else {
                content.classList.add('expanded');
                arrow.textContent = '▼';
                vscode.postMessage({ command: 'expandCard', id: id });
            }
        }

        function filterBySeverity(severity) {
            currentFilter = severity;
            applyFilters();

            // Update button states
            document.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }

        function searchPattern(query) {
            currentSearch = query.toLowerCase();
            applyFilters();
        }

        function applyFilters() {
            const cards = document.querySelectorAll('.log-card');
            let shownCount = 0;

            cards.forEach(card => {
                const severity = card.dataset.severity;
                const message = card.dataset.message.toLowerCase();
                const pattern = card.dataset.pattern.toLowerCase();

                const matchesSeverity = currentFilter === 'all' || severity === currentFilter;
                const matchesSearch = !currentSearch ||
                                     message.includes(currentSearch) ||
                                     pattern.includes(currentSearch);

                if (matchesSeverity && matchesSearch) {
                    card.style.display = 'flex';
                    shownCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            document.getElementById('shown-count').textContent = shownCount;
        }
    </script>
</body>
</html>`;
    }

    private _generateClientInfoHtml(results: AnalysisResults): string {
        if (!results.clientInfo) {
            return '';
        }

        const info = results.clientInfo;

        return `
        <div class="info-card">
            <h2>📱 Client Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Product:</div>
                    <div class="info-value">${this._escape(info.product)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Version:</div>
                    <div class="info-value">${this._escape(info.version)}</div>
                </div>
                ${info.user ? `
                <div class="info-item">
                    <div class="info-label">User:</div>
                    <div class="info-value">${this._escape(info.user)}</div>
                </div>
                ` : ''}
                ${info.device ? `
                <div class="info-item">
                    <div class="info-label">Device:</div>
                    <div class="info-value">${this._escape(info.device)}</div>
                </div>
                ` : ''}
            </div>
            ${results.configFiles && results.configFiles.length > 0 ? `
            <div style="margin-top: 15px;">
                <div style="font-weight: 600; margin-bottom: 8px;">⚙️ Configuration Files:</div>
                <div class="config-list">
                    ${results.configFiles.map(file => `<div class="config-tag">${this._escape(file)}</div>`).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        `;
    }

    private _generateTimelineHtml(matches: LogMatch[]): string {
        return matches.map((match, index) => {
            const severityIcon = {
                error: '🔴',
                warning: '🟡',
                info: '🔵'
            }[match.severity];

            return `
            <div class="log-card"
                 data-severity="${match.severity}"
                 data-message="${this._escape(match.message)}"
                 data-pattern="${this._escape(match.pattern.name)}">
                <div class="log-card-border ${match.severity}"></div>
                <div class="log-card-content">
                    <div class="log-card-header" onclick="toggleCard(${index})">
                        <div class="log-timestamp">${this._formatTimestamp(match.timestamp)}</div>
                        <div class="log-severity ${match.severity}">${severityIcon} ${match.severity.toUpperCase()}</div>
                        <div class="log-message">${this._escape(match.message)}</div>
                    </div>
                    <div class="log-card-meta">
                        <div class="meta-item">
                            <span class="meta-label">Pattern:</span>
                            <span class="pattern-tag">${this._escape(match.pattern.name)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Category:</span>
                            <span>${this._escape(match.pattern.category)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">File:</span>
                            <span>${this._escape(match.file)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Line:</span>
                            <span>${match.lineNumber}</span>
                        </div>
                    </div>
                    <div class="accordion">
                        <button class="accordion-toggle" onclick="toggleCard(${index})">
                            <span id="arrow-${index}">▶</span> Show Details
                        </button>
                        <div id="content-${index}" class="accordion-content">
${this._escape(match.rawLine)}
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    private _formatTimestamp(date: Date): string {
        return date.toISOString().replace('T', ' ').substring(0, 23);
    }

    private _formatDateTime(date: Date): string {
        return date.toISOString().replace('T', ' ').substring(0, 19);
    }

    private _escape(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    public dispose() {
        AnalysisPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
