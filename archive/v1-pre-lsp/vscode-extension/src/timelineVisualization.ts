import * as vscode from "vscode";

export interface TimelineEvent {
    timestamp: Date;
    line: number;
    type:
        | "lifecycle"
        | "authentication"
        | "call"
        | "connection"
        | "error"
        | "warning"
        | "info";
    message: string;
    category?: string;
    relatedLines?: number[];
}

export interface LadderDiagramEvent {
    timestamp: Date;
    line: number;
    from: string;
    to: string;
    message: string;
    method?: string; // SIP method (INVITE, BYE, etc.)
    responseCode?: number;
    direction: "outgoing" | "incoming";
}

/**
 * Timeline Visualization Provider
 * Renders visual timeline and ladder diagrams in editor
 */
export class TimelineVisualizationProvider implements vscode.Disposable {
    private panel: vscode.WebviewPanel | undefined;
    private ladderEvents: LadderDiagramEvent[] = [];
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        // Store context if needed for future use
        void context;
    }

    /**
     * Show timeline visualization panel
     */
    public showTimelinePanel(
        events: TimelineEvent[],
        document: vscode.TextDocument,
    ): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                "scoutTimeline",
                "📊 Timeline Visualization",
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                null,
                this.disposables,
            );

            // Handle messages from webview
            this.panel.webview.onDidReceiveMessage(
                (message) => {
                    switch (message.command) {
                        case "jumpToLine":
                            this.jumpToLine(document, message.line);
                            break;
                        case "showLadderDiagram":
                            this.showLadderDiagram(
                                message.startLine,
                                message.endLine,
                            );
                            break;
                    }
                },
                null,
                this.disposables,
            );
        }

        this.panel.webview.html = this.getTimelineHtml(events, document);
    }

    /**
     * Show SIP ladder diagram
     */
    public showLadderDiagram(startLine?: number, endLine?: number): void {
        const events =
            startLine && endLine
                ? this.ladderEvents.filter(
                      (e) => e.line >= startLine && e.line <= endLine,
                  )
                : this.ladderEvents;

        if (events.length === 0) {
            vscode.window.showInformationMessage(
                "No SIP/call flow events detected in the selected range",
            );
            return;
        }

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Beside);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                "scoutLadder",
                "📞 SIP Ladder Diagram",
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                },
            );

            this.panel.onDidDispose(
                () => {
                    this.panel = undefined;
                },
                null,
                this.disposables,
            );
        }

        this.panel.webview.html = this.getLadderDiagramHtml(events);
    }

    /**
     * Set ladder diagram events
     */
    public setLadderEvents(events: LadderDiagramEvent[]): void {
        this.ladderEvents = events;
    }

    /**
     * Jump to line in editor
     */
    private jumpToLine(document: vscode.TextDocument, line: number): void {
        const editor = vscode.window.visibleTextEditors.find(
            (e) => e.document === document,
        );
        if (editor) {
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.InCenter,
            );
            vscode.window.showTextDocument(document, editor.viewColumn);
        }
    }

    /**
     * Generate timeline HTML
     */
    private getTimelineHtml(
        events: TimelineEvent[],
        document: vscode.TextDocument,
    ): string {
        const fileName = document.fileName.split(/[\\/]/).pop() || "Log File";

        // Sort events by timestamp
        const sortedEvents = [...events].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        // Calculate time range
        const startTime = sortedEvents[0]?.timestamp;
        const endTime = sortedEvents[sortedEvents.length - 1]?.timestamp;
        const totalDuration =
            endTime && startTime ? endTime.getTime() - startTime.getTime() : 0;

        // Generate event items HTML (sequential layout to prevent overlap)
        const eventItems = sortedEvents
            .map((event, index) => {
                const icon = this.getEventIcon(event.type);
                const color = this.getEventColor(event.type);
                const time = event.timestamp.toLocaleTimeString();

                // Calculate time difference from previous event
                let timeSinceLastEvent = "";
                if (index > 0) {
                    const prevEvent = sortedEvents[index - 1];
                    const diffMs =
                        event.timestamp.getTime() -
                        prevEvent.timestamp.getTime();
                    if (diffMs > 60000) {
                        // More than 1 minute
                        const diffMinutes = Math.floor(diffMs / 60000);
                        timeSinceLastEvent = `<div class="time-gap">⏱️ ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} later</div>`;
                    }
                }

                return `
                ${timeSinceLastEvent}
                <div class="timeline-event" data-line="${event.line}" data-index="${index}">
                    <div class="event-marker" style="background-color: ${color};">
                        <span class="event-icon">${icon}</span>
                    </div>
                    <div class="event-content">
                        <div class="event-time">${time}</div>
                        <div class="event-type">${event.type}</div>
                        <div class="event-message">${this.escapeHtml(event.message)}</div>
                        ${event.category ? `<div class="event-category">${event.category}</div>` : ""}
                        <div class="event-line">Line ${event.line + 1}</div>
                    </div>
                </div>
            `;
            })
            .join("");

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timeline Visualization</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        .header {
            padding: 15px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .header h1 {
            margin: 0 0 10px 0;
            font-size: 18px;
            font-weight: 600;
        }

        .header .file-name {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .stats {
            display: flex;
            gap: 20px;
            margin-top: 10px;
        }

        .stat {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 13px;
        }

        .stat-icon {
            font-size: 16px;
        }

        .timeline-container {
            position: relative;
            margin: 0 auto;
            max-width: 1200px;
            padding: 20px 0 40px 0;
        }

        .timeline-line {
            position: absolute;
            left: 50px;
            top: 0;
            bottom: 0;
            width: 3px;
            background: linear-gradient(
                to bottom,
                var(--vscode-charts-blue) 0%,
                var(--vscode-charts-purple) 100%
            );
            z-index: 0;
        }

        .time-gap {
            margin: 15px 0 15px 70px;
            padding: 6px 14px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: inline-block;
            font-style: italic;
            border-left: 3px solid var(--vscode-charts-blue);
        }

        .timeline-event {
            position: relative;
            display: flex;
            align-items: flex-start;
            padding: 6px 0;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            z-index: 1;
        }

        .timeline-event:hover {
            transform: translateX(5px);
        }

        .timeline-event:hover .event-content {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border-color: var(--vscode-focusBorder);
        }

        .event-marker {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 30px;
            margin-right: 20px;
            border: 3px solid var(--vscode-editor-background);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            flex-shrink: 0;
            position: relative;
            z-index: 2;
        }

        .event-icon {
            font-size: 20px;
        }

        .event-content {
            flex: 1;
            padding: 12px 16px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
            transition: all 0.2s;
            max-width: calc(100% - 110px);
        }

        .event-time {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .event-type {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            opacity: 0.8;
        }

        .event-message {
            font-size: 13px;
            margin-bottom: 6px;
            line-height: 1.4;
            word-wrap: break-word;
            max-width: 100%;
        }

        .event-category {
            display: inline-block;
            padding: 2px 8px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
            font-size: 11px;
            margin-bottom: 4px;
        }

        .event-line {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .timeline-controls {
            position: sticky;
            top: 0;
            background-color: var(--vscode-editor-background);
            padding: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
            z-index: 100;
        }

        .btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background-color 0.2s;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }

        /* Scrollbar styling */
        .timeline-container::-webkit-scrollbar {
            width: 8px;
        }

        .timeline-container::-webkit-scrollbar-track {
            background: var(--vscode-editor-background);
        }

        .timeline-container::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
        }

        .timeline-container::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Timeline Visualization</h1>
        <div class="file-name">${this.escapeHtml(fileName)}</div>
        <div class="stats">
            <div class="stat">
                <span class="stat-icon">📅</span>
                <span>${events.length} events</span>
            </div>
            ${
                startTime
                    ? `
            <div class="stat">
                <span class="stat-icon">⏱️</span>
                <span>${this.formatDuration(totalDuration)}</span>
            </div>
            `
                    : ""
            }
        </div>
    </div>

    <div class="timeline-controls">
        <button class="btn" onclick="showLadderDiagram()">
            📞 Show Call Flow Diagram
        </button>
        <button class="btn btn-secondary" onclick="toggleCompactMode()">
            📏 Toggle Compact Mode
        </button>
        <button class="btn btn-secondary" onclick="exportTimeline()">
            💾 Export Timeline
        </button>
    </div>

    ${
        events.length > 0
            ? `
        <div class="timeline-container">
            <div class="timeline-line"></div>
            ${eventItems}
        </div>
    `
            : `
        <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <p>No timeline events detected</p>
            <p style="font-size: 12px;">Events with timestamps will appear here</p>
        </div>
    `
    }

    <script>
        const vscode = acquireVsCodeApi();

        // Click event to jump to line
        document.querySelectorAll('.timeline-event').forEach(event => {
            event.addEventListener('click', () => {
                const line = parseInt(event.dataset.line);
                vscode.postMessage({
                    command: 'jumpToLine',
                    line: line
                });
            });
        });

        function showLadderDiagram() {
            vscode.postMessage({
                command: 'showLadderDiagram'
            });
        }

        let compactMode = false;
        function toggleCompactMode() {
            compactMode = !compactMode;
            const container = document.querySelector('.timeline-container');
            const events = document.querySelectorAll('.timeline-event');
            const timeGaps = document.querySelectorAll('.time-gap');

            if (compactMode) {
                // Compact mode: smaller spacing, hide time gaps
                events.forEach(event => {
                    event.style.marginBottom = '2px';
                    event.style.padding = '3px 0';
                });
                timeGaps.forEach(gap => {
                    gap.style.display = 'none';
                });
                container.style.paddingBottom = '20px';
            } else {
                // Normal mode: restore spacing
                events.forEach(event => {
                    event.style.marginBottom = '8px';
                    event.style.padding = '6px 0';
                });
                timeGaps.forEach(gap => {
                    gap.style.display = 'inline-block';
                });
                container.style.paddingBottom = '40px';
            }
        }

        function exportTimeline() {
            // TODO: Implement export functionality
            vscode.postMessage({
                command: 'exportTimeline'
            });
        }
    </script>
</body>
</html>
        `;
    }

    /**
     * Generate SIP ladder diagram HTML
     */
    private getLadderDiagramHtml(events: LadderDiagramEvent[]): string {
        // Extract unique endpoints
        const endpoints = new Set<string>();
        events.forEach((e) => {
            endpoints.add(e.from);
            endpoints.add(e.to);
        });
        const endpointArray = Array.from(endpoints);

        // Generate ladder HTML
        const ladderItems = events
            .map((event) => {
                const fromIndex = endpointArray.indexOf(event.from);
                const toIndex = endpointArray.indexOf(event.to);
                const direction = fromIndex < toIndex ? "right" : "left";

                const color = this.getSipMessageColor(
                    event.method,
                    event.responseCode,
                );
                const label =
                    event.method || `${event.responseCode}` || event.message;

                return `
                <div class="ladder-row" data-line="${event.line}">
                    <div class="ladder-time">${event.timestamp.toLocaleTimeString()}</div>
                    <div class="ladder-diagram">
                        <div class="ladder-arrow"
                             data-from="${fromIndex}"
                             data-to="${toIndex}"
                             data-direction="${direction}"
                             style="--from: ${fromIndex}; --to: ${toIndex};">
                            <div class="arrow-line" style="background-color: ${color};"></div>
                            <div class="arrow-head ${direction}"></div>
                            <div class="arrow-label">${this.escapeHtml(label)}</div>
                        </div>
                    </div>
                    <div class="ladder-details">
                        <div class="detail-message">${this.escapeHtml(event.message)}</div>
                        <div class="detail-line">Line ${event.line + 1}</div>
                    </div>
                </div>
            `;
            })
            .join("");

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIP Ladder Diagram</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }

        .header {
            padding: 15px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .header h1 {
            margin: 0 0 10px 0;
            font-size: 18px;
            font-weight: 600;
        }

        .endpoints {
            display: flex;
            justify-content: space-around;
            padding: 20px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .endpoint {
            text-align: center;
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 6px;
            font-weight: 600;
            position: relative;
        }

        .endpoint::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 2px;
            height: 20px;
            background-color: var(--vscode-panel-border);
        }

        .ladder-container {
            position: relative;
            max-width: 1400px;
            margin: 0 auto;
        }

        .ladder-row {
            display: flex;
            align-items: center;
            padding: 20px 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            transition: background-color 0.2s;
            min-height: 70px;
        }

        .ladder-row:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .ladder-time {
            width: 110px;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            flex-shrink: 0;
            padding-right: 10px;
        }

        .ladder-diagram {
            flex: 1;
            position: relative;
            height: 50px;
            display: flex;
            align-items: center;
            min-width: 400px;
        }

        .ladder-arrow {
            position: absolute;
            display: flex;
            align-items: center;
            height: 100%;
        }

        .arrow-line {
            flex: 1;
            height: 3px;
            position: relative;
            min-width: 50px;
        }

        .arrow-head {
            width: 0;
            height: 0;
            border-style: solid;
            flex-shrink: 0;
        }

        .arrow-head.right {
            border-width: 7px 0 7px 12px;
            border-color: transparent transparent transparent currentColor;
        }

        .arrow-head.left {
            border-width: 7px 12px 7px 0;
            border-color: transparent currentColor transparent transparent;
        }

        .arrow-label {
            position: absolute;
            top: -24px;
            left: 50%;
            transform: translateX(-50%);
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            font-weight: 600;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .ladder-details {
            width: 280px;
            padding-left: 20px;
            flex-shrink: 0;
        }

        .detail-message {
            font-size: 13px;
            margin-bottom: 4px;
            line-height: 1.4;
            word-wrap: break-word;
        }

        .detail-line {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .controls {
            position: sticky;
            top: 0;
            background-color: var(--vscode-editor-background);
            padding: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
            z-index: 100;
        }

        .btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📞 SIP Ladder Diagram</h1>
        <p style="color: var(--vscode-descriptionForeground); font-size: 13px;">
            ${events.length} messages between ${endpointArray.length} endpoints
        </p>
    </div>

    <div class="controls">
        <button class="btn" onclick="showTimeline()">
            📊 Back to Timeline
        </button>
        <button class="btn" onclick="exportDiagram()">
            💾 Export Diagram
        </button>
    </div>

    <div class="endpoints">
        ${endpointArray.map((ep) => `<div class="endpoint">${this.escapeHtml(ep)}</div>`).join("")}
    </div>

    <div class="ladder-container">
        ${ladderItems}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        document.querySelectorAll('.ladder-row').forEach(row => {
            row.addEventListener('click', () => {
                const line = parseInt(row.dataset.line);
                vscode.postMessage({
                    command: 'jumpToLine',
                    line: line
                });
            });
        });

        function showTimeline() {
            vscode.postMessage({
                command: 'showTimeline'
            });
        }

        function exportDiagram() {
            vscode.postMessage({
                command: 'exportDiagram'
            });
        }
    </script>
</body>
</html>
        `;
    }

    /**
     * Get event icon
     */
    private getEventIcon(type: string): string {
        const icons: Record<string, string> = {
            lifecycle: "🔄",
            authentication: "🔐",
            call: "📞",
            connection: "🔌",
            error: "🔴",
            warning: "🟡",
            info: "🔵",
        };
        return icons[type] || "⚪";
    }

    /**
     * Get event color
     */
    private getEventColor(type: string): string {
        const colors: Record<string, string> = {
            lifecycle: "#8b5cf6",
            authentication: "#f59e0b",
            call: "#10b981",
            connection: "#3b82f6",
            error: "#ef4444",
            warning: "#f59e0b",
            info: "#3b82f6",
        };
        return colors[type] || "#6b7280";
    }

    /**
     * Get SIP message color
     */
    private getSipMessageColor(method?: string, responseCode?: number): string {
        if (responseCode) {
            if (responseCode >= 200 && responseCode < 300) return "#10b981"; // Success - green
            if (responseCode >= 300 && responseCode < 400) return "#3b82f6"; // Redirect - blue
            if (responseCode >= 400 && responseCode < 500) return "#f59e0b"; // Client error - orange
            if (responseCode >= 500) return "#ef4444"; // Server error - red
            return "#6b7280";
        }

        if (method) {
            const requestMethods = [
                "INVITE",
                "ACK",
                "BYE",
                "CANCEL",
                "REGISTER",
                "OPTIONS",
                "INFO",
            ];
            return requestMethods.includes(method) ? "#8b5cf6" : "#6b7280";
        }

        return "#6b7280";
    }

    /**
     * Format duration
     */
    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Escape HTML
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Dispose
     */
    public dispose(): void {
        this.panel?.dispose();
        this.disposables.forEach((d) => d.dispose());
    }
}
