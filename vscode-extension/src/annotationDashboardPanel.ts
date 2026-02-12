import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Annotation Dashboard Panel - TagScout-style card-based view for pattern detections
 * Iteration 2: Dynamic data loading from DiagnosticCollection
 */

interface AnnotationCardData {
    id: string;
    category: string;
    patternName: string;
    priority: 'critical' | 'high' | 'normal' | 'low';
    logLevel?: string;
    finalSeverity?: string;
    timestamp: string;
    filePath: string;
    lineNumber: number;
    matchedText: string;
    rawLogLine: string;
    extractedFields?: Record<string, string>;
    severityTrigger?: string;
    internalNotes?: string;
}

export class AnnotationDashboardPanel {
    public static currentPanel: AnnotationDashboardPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed (user closes it)
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Listen for diagnostic changes and refresh
        const diagnosticListener = vscode.languages.onDidChangeDiagnostics(() => {
            this._loadAnnotations();
        });
        this._disposables.push(diagnosticListener);

        // Load annotations immediately
        this._loadAnnotations();

        // Send initial filter state
        this._sendFilterState();

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'jumpToLine':
                        this._jumpToLine(message.filePath, message.line);
                        break;
                    case 'hideCategory':
                        this._hideCategory(message.category);
                        break;
                    case 'unhideCategory':
                        this._unhideCategory(message.category);
                        break;
                    case 'saveFilterState':
                        this._saveFilterState(message.state);
                        break;
                    case 'getFilterState':
                        this._sendFilterState();
                        break;
                    case 'copyText':
                        vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage('Copied to clipboard');
                        break;
                    case 'exportAnnotations':
                        this._exportAnnotationsToFile(message.data);
                        break;
                    case 'requestFilteredAnnotations':
                        this._loadFilteredAnnotations(message.filters);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.One;

        // If we already have a panel, show it
        if (AnnotationDashboardPanel.currentPanel) {
            AnnotationDashboardPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'annotationDashboard',
            'Annotation Dashboard',
            column,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ],
                retainContextWhenHidden: true
            }
        );

        panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, 'media', 'notebook-light.svg'),
            dark: vscode.Uri.joinPath(extensionUri, 'media', 'notebook-dark.svg')
        };

        AnnotationDashboardPanel.currentPanel = new AnnotationDashboardPanel(panel, extensionUri);
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Annotation Dashboard';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private async _loadAnnotations() {
        const annotations = await this._fetchAnnotationsFromDiagnostics();
        
        // Determine filtering strategy based on data size
        const LARGE_DATASET_THRESHOLD = 5000;
        const isLargeDataset = annotations.length >= LARGE_DATASET_THRESHOLD;
        
        // Send to webview
        this._panel.webview.postMessage({
            command: 'updateAnnotations',
            annotations: annotations,
            metadata: {
                totalCount: annotations.length,
                useServerSideFiltering: isLargeDataset
            }
        });
    }

    private async _loadFilteredAnnotations(filters: any) {
        // Get all annotations first
        const allAnnotations = await this._fetchAnnotationsFromDiagnostics();
        
        // Apply server-side filtering
        const filtered = allAnnotations.filter(annotation => {
            // Log level filter
            if (filters.logLevels && annotation.logLevel) {
                const level = annotation.logLevel.toLowerCase();
                if (filters.logLevels[level] === false) {
                    return false;
                }
            }
            
            // Priority filter
            if (filters.priorities && annotation.priority) {
                const priority = annotation.priority.toLowerCase();
                if (filters.priorities[priority] === false) {
                    return false;
                }
            }
            
            // Hidden categories
            if (filters.hiddenCategories && filters.hiddenCategories.includes(annotation.category)) {
                return false;
            }
            
            // Time range filter
            if (annotation.timestamp) {
                if (filters.timeRangeStart) {
                    const startTime = new Date(filters.timeRangeStart);
                    const annotationTime = new Date(annotation.timestamp);
                    if (annotationTime < startTime) {
                        return false;
                    }
                }
                if (filters.timeRangeEnd) {
                    const endTime = new Date(filters.timeRangeEnd);
                    const annotationTime = new Date(annotation.timestamp);
                    if (annotationTime > endTime) {
                        return false;
                    }
                }
            }
            
            // Search filter
            if (filters.searchQuery) {
                const searchText = [
                    annotation.matchedText,
                    annotation.rawLogLine,
                    annotation.category,
                    annotation.patternName
                ].join(' ').toLowerCase();
                
                if (filters.searchIsRegex) {
                    try {
                        const regex = new RegExp(filters.searchQuery, 'i');
                        if (!regex.test(searchText)) {
                            return false;
                        }
                    } catch (e) {
                        // Invalid regex, fall back to string search
                        if (!searchText.includes(filters.searchQuery.toLowerCase())) {
                            return false;
                        }
                    }
                } else {
                    if (!searchText.includes(filters.searchQuery.toLowerCase())) {
                        return false;
                    }
                }
            }
            
            return true;
        });
        
        console.log(`[Server-Side Filter] Filtered ${allAnnotations.length} → ${filtered.length} annotations`);
        
        // Send filtered results
        this._panel.webview.postMessage({
            command: 'updateAnnotations',
            annotations: filtered,
            metadata: {
                totalCount: allAnnotations.length,
                filteredCount: filtered.length,
                useServerSideFiltering: true
            }
        });
    }

    private async _fetchAnnotationsFromDiagnostics(): Promise<AnnotationCardData[]> {
        const annotations: AnnotationCardData[] = [];
        
        // Get all diagnostics from all files
        const allDiagnostics = vscode.languages.getDiagnostics();
        
        for (const [uri, diagnostics] of allDiagnostics) {
            // Only process log files
            if (!this._isLogFile(uri)) {
                continue;
            }

            try {
                const document = await vscode.workspace.openTextDocument(uri);
                
                for (const diagnostic of diagnostics) {
                    const lineNumber = diagnostic.range.start.line;
                    const line = document.lineAt(lineNumber);
                    const extractedFields = this._extractFields(diagnostic);
                    
                    // Get data from diagnostic.data if available (from LSP)
                    const diagnosticAny = diagnostic as any;
                    const data = (diagnosticAny.data && typeof diagnosticAny.data === 'object') ? diagnosticAny.data : undefined;
                    
                    const matchedText = data?.matchedText || diagnostic.message;
                    const timestamp = data?.timestamp || this._extractTimestamp(line.text);
                    const logLevel = data?.logLevel || this._extractLogLevel(line.text);
                    const finalPriority = this._mapPriority(diagnostic.severity);
                    
                    const annotation = {
                        id: `${uri.fsPath}-${lineNumber}`,
                        category: this._extractCategory(diagnostic),
                        patternName: this._extractPatternName(diagnostic),
                        priority: finalPriority,
                        logLevel: logLevel,
                        timestamp: timestamp,
                        filePath: vscode.workspace.asRelativePath(uri),
                        lineNumber: lineNumber + 1, // 1-indexed
                        matchedText: this._interpolateFields(matchedText, extractedFields),
                        rawLogLine: line.text,
                        extractedFields: extractedFields,
                        severityTrigger: this._extractSeverityTrigger(diagnostic)
                    };
                    
                    annotations.push(annotation);
                }
            } catch (error) {
                console.error(`Error processing diagnostics for ${uri.fsPath}:`, error);
            }
        }
        
        // Sort by timestamp (newest first)
        annotations.sort((a, b) => {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        return annotations;
    }

    private _isLogFile(uri: vscode.Uri): boolean {
        const fileName = uri.fsPath.toLowerCase();
        const logExtensions = ['.log', '.txt', '.out'];
        
        // Check if file has .log extension or contains .log. (for rotated logs like .log.1, .log.2)
        if (fileName.includes('.log')) {
            return true;
        }
        
        // Check other log extensions
        return logExtensions.some(ext => fileName.endsWith(ext));
    }

    private _extractCategory(diagnostic: vscode.Diagnostic): string {
        if (diagnostic.source) {
            return diagnostic.source;
        }
        if (diagnostic.code) {
            return String(diagnostic.code);
        }
        return 'Unknown';
    }

    private _extractPatternName(diagnostic: vscode.Diagnostic): string {
        if (diagnostic.code) {
            return String(diagnostic.code);
        }
        return 'Pattern Match';
    }

    private _mapPriority(severity: vscode.DiagnosticSeverity): 'critical' | 'high' | 'normal' | 'low' {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'critical';
            case vscode.DiagnosticSeverity.Warning:
                return 'high';
            case vscode.DiagnosticSeverity.Information:
                return 'normal';
            case vscode.DiagnosticSeverity.Hint:
                return 'low';
            default:
                return 'normal';
        }
    }

    private _extractLogLevel(line: string): string | undefined {
        const logLevelPatterns = [
            /<(FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|VERBOSE)>/i,
            /\[(FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|VERBOSE)\]/i,
            /\b(FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|VERBOSE):/i,
            /\b(FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE|VERBOSE)\s+\[/i  // Level followed by spaces and bracket
        ];

        for (const pattern of logLevelPatterns) {
            const match = line.match(pattern);
            if (match) {
                const level = match[1].toLowerCase();
                // Normalize warn/warning to warn for consistency
                return level === 'warning' ? 'warn' : level;
            }
        }
        return undefined;
    }

    private _extractTimestamp(line: string): string {
        // Try various timestamp formats
        const patterns = [
            // ISO 8601 or space-separated with dot or comma milliseconds: 2024-01-15T14:30:45.123Z or 2024-01-15 14:30:45,123
            /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.,]?\d{0,3}(?:Z|[+-]\d{2}:?\d{2})?)/,
            // [2024-01-15 14:30:45]
            /\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/
        ];

        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match) {
                return match[1];
            }
        }
        
        // Return current time if no timestamp found
        return new Date().toISOString();
    }

    private _extractFields(diagnostic: vscode.Diagnostic): Record<string, string> | undefined {
        // Check if diagnostic.data contains extractedFields
        const diagnosticAny = diagnostic as any;
        if (diagnosticAny.data && typeof diagnosticAny.data === 'object') {
            const data = diagnosticAny.data;
            if (data.extractedFields && typeof data.extractedFields === 'object') {
                return data.extractedFields as Record<string, string>;
            }
        }
        
        return undefined;
    }

    private _extractSeverityTrigger(diagnostic: vscode.Diagnostic): string | undefined {
        // Check diagnostic tags for trigger information
        if (diagnostic.tags?.includes(vscode.DiagnosticTag.Deprecated)) {
            return 'Severity escalated by conditional trigger';
        }
        return undefined;
    }

    private _interpolateFields(message: string, fields?: Record<string, string>): string {
        if (!fields || Object.keys(fields).length === 0) {
            return message;
        }
        
        // Replace {{field_name}} placeholders with actual values
        let interpolated = message;
        for (const [key, value] of Object.entries(fields)) {
            const placeholder = `{{${key}}}`;
            interpolated = interpolated.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }
        
        return interpolated;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // URIs for script and styles
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'annotationDashboard.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'annotationDashboard.css')
        );

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        // Ensure DOCTYPE is the absolute first thing (no whitespace)
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource}; connect-src ${webview.cspSource} https:;">
    <link href="${styleUri}" rel="stylesheet">
    <title>Annotation Dashboard</title>
</head>
<body>
    <div class="dashboard-container">
        <!-- Filter Bar -->
        <div class="filter-bar">
            <div class="filter-section">
                <span class="filter-label">Log Level:</span>
                <button id="filter-error" class="loglevel-toggle-btn error active" data-loglevel="error">
                    ERROR
                </button>
                <button id="filter-warn" class="loglevel-toggle-btn warning active" data-loglevel="warn">
                    WARN
                </button>
                <button id="filter-info" class="loglevel-toggle-btn info active" data-loglevel="info">
                    INFO
                </button>
                <button id="filter-debug" class="loglevel-toggle-btn debug active" data-loglevel="debug">
                    DEBUG
                </button>
                <button id="filter-trace" class="loglevel-toggle-btn trace active" data-loglevel="trace">
                    TRACE
                </button>
            </div>
            <div class="filter-section">
                <span class="filter-label">Priority:</span>
                <button id="filter-critical" class="priority-toggle-btn critical active" data-priority="critical">
                    CRITICAL
                </button>
                <button id="filter-high" class="priority-toggle-btn high active" data-priority="high">
                    HIGH
                </button>
                <button id="filter-normal" class="priority-toggle-btn normal active" data-priority="normal">
                    NORMAL
                </button>
                <button id="filter-low" class="priority-toggle-btn low active" data-priority="low">
                    LOW
                </button>
            </div>
            <div class="filter-section search-section">
                <input type="text" id="search-input" class="search-input" placeholder="Search annotations...">
                <button id="toggle-regex" class="toggle-regex-btn" title="Toggle regex search">
                    <span class="codicon codicon-regex"></span>
                </button>
            </div>
            <div class="filter-section">
                <select id="sort-dropdown" class="sort-dropdown">
                    <option value="time">Sort by Time</option>
                    <option value="priority">Sort by Priority</option>
                    <option value="category">Sort by Category</option>
                </select>
            </div>
            <div class="filter-section time-filter-section">
                <span class="filter-label">Time Range:</span>
                <button class="time-filter-btn active" data-minutes="0" title="Show all annotations">
                    All
                </button>
                <button class="time-filter-btn" data-minutes="5" title="Last 5 minutes">
                    5m
                </button>
                <button class="time-filter-btn" data-minutes="30" title="Last 30 minutes">
                    30m
                </button>
                <button class="time-filter-btn" data-minutes="60" title="Last 1 hour">
                    1h
                </button>
                <button class="time-filter-btn" data-minutes="360" title="Last 6 hours">
                    6h
                </button>
                <button class="time-filter-btn" data-minutes="1440" title="Last 24 hours">
                    24h
                </button>
            </div>
            <div class="filter-section">
                <button id="export-btn" class="export-btn" title="Export annotations to JSON">
                    <span class="codicon codicon-export"></span>
                    Export
                </button>
            </div>
            <div class="filter-section">
                <button id="toggle-minimap-btn" class="toggle-minimap-btn" title="Toggle minimap">
                    <span class="codicon codicon-map"></span>
                    Minimap
                </button>
                <button id="toggle-minimap-mode" class="toggle-minimap-mode" title="Toggle minimap mode">
                    <span class="codicon codicon-filter"></span>
                    <span id="minimap-mode-text">Filter</span>
                </button>
            </div>
        </div>

        <!-- Performance Info (shown for large result sets) -->
        <div class="performance-info" id="performance-info" style="display: none;">
            <span class="codicon codicon-pulse"></span>
            <span class="performance-text">Virtual scrolling enabled for optimal performance</span>
        </div>

        <!-- Hidden Categories Section -->
        <div id="hidden-categories-section" class="hidden-categories-section" style="display: none;">
            <div class="hidden-categories-header">
                <span class="codicon codicon-eye-closed"></span>
                <span>Hidden Categories:</span>
            </div>
            <div class="hidden-categories-list"></div>
        </div>

        <!-- Annotations List (will be populated dynamically) -->
        <div class="dashboard-content">
            <div class="annotations-list" id="annotations-list">
                <div class="empty-state">
                    <div class="empty-state-icon">⏳</div>
                    <div class="empty-state-text">Loading annotations...</div>
                    <div class="empty-state-hint">Analyzing log files for pattern matches</div>
                </div>
            </div>
            
            <!-- Minimap -->
            <div class="minimap-container" id="minimap-container">
                <div class="minimap-header">
                    <span class="codicon codicon-map"></span>
                    <span class="minimap-title">Overview</span>
                </div>
                <div class="minimap-canvas" id="minimap-canvas">
                    <!-- Annotation markers will be rendered here -->
                </div>
                <div class="minimap-legend">
                    <div class="legend-item">
                        <span class="legend-color critical"></span>
                        <span class="legend-label">Critical</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color high"></span>
                        <span class="legend-label">High</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color normal"></span>
                        <span class="legend-label">Normal</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color low"></span>
                        <span class="legend-label">Low</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
        
        // Return trimmed HTML to ensure no leading whitespace before DOCTYPE
        return html.trim();
    }

    private _jumpToLine(filePath: string, line: number) {
        // Check if filePath is already an absolute path (from diagnostics)
        let fileUri: vscode.Uri;
        
        if (path.isAbsolute(filePath)) {
            // Already absolute path - convert directly to URI
            fileUri = vscode.Uri.file(filePath);
        } else {
            // Relative path - resolve against workspace folder
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            fileUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
        }

        if (!fileUri) {
            vscode.window.showErrorMessage(`File not found: ${filePath}`);
            return;
        }

        // Open file and jump to line
        vscode.workspace.openTextDocument(fileUri).then(document => {
            vscode.window.showTextDocument(document).then(editor => {
                const position = new vscode.Position(line - 1, 0); // 0-indexed
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            });
        }, error => {
            vscode.window.showErrorMessage(`Error opening file: ${error.message}`);
        });
    }

    private _hideCategory(category: string) {
        // Store hidden categories in workspace state
        const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
        const hiddenCategories = config.get<string[]>('dashboard.hiddenCategories', []);
        if (!hiddenCategories.includes(category)) {
            hiddenCategories.push(category);
            config.update('dashboard.hiddenCategories', hiddenCategories, vscode.ConfigurationTarget.Workspace);
        }
        
        // Reload annotations to apply filter
        this._loadAnnotations();
    }

    private _unhideCategory(category: string) {
        const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
        const hiddenCategories = config.get<string[]>('dashboard.hiddenCategories', []);
        const index = hiddenCategories.indexOf(category);
        if (index > -1) {
            hiddenCategories.splice(index, 1);
            config.update('dashboard.hiddenCategories', hiddenCategories, vscode.ConfigurationTarget.Workspace);
        }
        
        // Reload annotations to apply filter
        this._loadAnnotations();
    }

    private _sendFilterState() {
        const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
        this._panel.webview.postMessage({
            command: 'setFilterState',
            state: {
                filterError: config.get<boolean>('dashboard.filterError', true),
                filterWarn: config.get<boolean>('dashboard.filterWarn', true),
                filterInfo: config.get<boolean>('dashboard.filterInfo', true),
                filterDebug: config.get<boolean>('dashboard.filterDebug', true),
                filterTrace: config.get<boolean>('dashboard.filterTrace', true),
                filterCritical: config.get<boolean>('dashboard.filterCritical', true),
                filterHigh: config.get<boolean>('dashboard.filterHigh', true),
                filterNormal: config.get<boolean>('dashboard.filterNormal', true),
                filterLow: config.get<boolean>('dashboard.filterLow', true),
                sortBy: config.get<string>('dashboard.sortBy', 'time'),
                hiddenCategories: config.get<string[]>('dashboard.hiddenCategories', [])
            }
        });
    }

    private _saveFilterState(state: any) {
        const config = vscode.workspace.getConfiguration('logScoutAnalyzer');
        if (state.filterError !== undefined) {
            config.update('dashboard.filterError', state.filterError, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterWarn !== undefined) {
            config.update('dashboard.filterWarn', state.filterWarn, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterInfo !== undefined) {
            config.update('dashboard.filterInfo', state.filterInfo, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterDebug !== undefined) {
            config.update('dashboard.filterDebug', state.filterDebug, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterTrace !== undefined) {
            config.update('dashboard.filterTrace', state.filterTrace, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterCritical !== undefined) {
            config.update('dashboard.filterCritical', state.filterCritical, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterHigh !== undefined) {
            config.update('dashboard.filterHigh', state.filterHigh, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterNormal !== undefined) {
            config.update('dashboard.filterNormal', state.filterNormal, vscode.ConfigurationTarget.Workspace);
        }
        if (state.filterLow !== undefined) {
            config.update('dashboard.filterLow', state.filterLow, vscode.ConfigurationTarget.Workspace);
        }
        if (state.sortBy !== undefined) {
            config.update('dashboard.sortBy', state.sortBy, vscode.ConfigurationTarget.Workspace);
        }
    }

    private async _exportAnnotationsToFile(data: any) {
        try {
            // Prompt user for save location
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('annotations-export.json'),
                filters: {
                    'JSON files': ['json'],
                    'All files': ['*']
                }
            });

            if (uri) {
                const jsonContent = JSON.stringify(data, null, 2);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonContent, 'utf8'));
                vscode.window.showInformationMessage(`Exported ${data.totalAnnotations} annotations to ${uri.fsPath}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export annotations: ${error}`);
        }
    }

    public dispose() {
        AnnotationDashboardPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
