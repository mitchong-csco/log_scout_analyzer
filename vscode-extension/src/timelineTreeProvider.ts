import * as vscode from "vscode";
import { ResultItem } from "./resultsTreeProvider";

export interface SignificantEvent {
    type:
        | "error"
        | "warning"
        | "info"
        | "lifecycle"
        | "authentication"
        | "call"
        | "connection";
    timestamp: Date;
    line: number;
    message: string;
    category?: string;
    uri?: vscode.Uri;
}

export class TimelineTreeProvider implements vscode.TreeDataProvider<TimelineTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        TimelineTreeItem | undefined | null | void
    > = new vscode.EventEmitter<TimelineTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        TimelineTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private results: ResultItem[] = [];
    private significantEvents: SignificantEvent[] = [];
    private timeInterval: number = 15; // minutes
    private showSignificantEvents: boolean = true;
    private enabledTimeframes: Set<string> = new Set();
    private allTimeframes: Set<string> = new Set();

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setResults(results: ResultItem[]): void {
        this.results = results;
        this.extractSignificantEvents(results);
        
        // Update timeframes list and enable all by default
        this.updateTimeframesList();
        
        this.refresh();
    }

    setShowSignificantEvents(show: boolean): void {
        this.showSignificantEvents = show;
        this.refresh();
    }

    toggleTimeframe(timeframeKey: string): void {
        if (this.enabledTimeframes.has(timeframeKey)) {
            this.enabledTimeframes.delete(timeframeKey);
        } else {
            this.enabledTimeframes.add(timeframeKey);
        }
        this.refresh();
    }

    toggleAllTimeframes(enable: boolean): void {
        if (enable) {
            this.enabledTimeframes = new Set(this.allTimeframes);
        } else {
            this.enabledTimeframes.clear();
        }
        this.refresh();
    }

    getEnabledTimeframes(): Set<string> {
        return this.enabledTimeframes;
    }

    private updateTimeframesList(): void {
        this.allTimeframes.clear();
        
        const resultsWithTimestamps = this.showSignificantEvents 
            ? this.significantEvents.filter(e => e.timestamp)
            : this.results.filter(r => r.timestamp);
            
        if (resultsWithTimestamps.length === 0) return;
        
        const intervalMs = this.timeInterval * 60 * 1000;
        
        for (const item of resultsWithTimestamps) {
            const timestamp = this.showSignificantEvents 
                ? (item as SignificantEvent).timestamp 
                : (item as ResultItem).timestamp!;
            const normalizedTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const resultTime = normalizedTimestamp.getTime();
            const bucketTime = new Date(
                Math.floor(resultTime / intervalMs) * intervalMs,
            );
            const bucketKey = bucketTime.toISOString();
            this.allTimeframes.add(bucketKey);
            
            // Enable new timeframes by default
            if (!this.enabledTimeframes.has(bucketKey)) {
                this.enabledTimeframes.add(bucketKey);
            }
       }
    }

    private extractSignificantEvents(results: ResultItem[]): void {
        this.significantEvents = [];

        // Define patterns for significant lifecycle events
        const lifecyclePatterns = [
            /\b(start(?:ing|ed)?|launch(?:ing|ed)?|init(?:ializ)?(?:ing|ed)?)\b/i,
            /\b(exit(?:ing|ed)?|shutdown|shutting down|stop(?:ping|ped)?|terminat(?:ing|ed)?)\b/i,
            /\b(restart(?:ing|ed)?|reload(?:ing|ed)?)\b/i,
        ];

        const authPatterns = [
            /\b(sign(?:\s|-)?in|login|log(?:\s|-)?in|logged in|authenticated?|authentication)\b/i,
            /\b(sign(?:\s|-)?out|logout|log(?:\s|-)?out|logged out|unauthenticat(?:ed|ing))\b/i,
            /\b(register(?:ing|ed)?|registration)\b/i,
            /\b(credential|token|oauth|saml|sso)\b/i,
        ];

        const callPatterns = [
            /\b(call(?:\s+)?(?:start(?:ing|ed)?|initiat(?:ing|ed)?|placed?))\b/i,
            /\b(call(?:\s+)?(?:end(?:ing|ed)?|terminat(?:ing|ed)?|dropped?))\b/i,
            /\b(join(?:ing|ed)?(?:\s+)?(?:call|meeting|conference))\b/i,
            /\b(leav(?:ing|e)(?:\s+)?(?:call|meeting|conference))\b/i,
            /\b(incoming call|outgoing call|missed call)\b/i,
        ];

        const connectionPatterns = [
            /\b(connect(?:ing|ed)?|connection established)\b/i,
            /\b(disconnect(?:ing|ed)?|connection (?:lost|closed|terminated))\b/i,
            /\b(reconnect(?:ing|ed)?)\b/i,
            /\b(network (?:available|unavailable))\b/i,
        ];

        results.forEach((result) => {
            if (!result.timestamp) return;

            const text = result.message + " " + result.matchedText;
            let eventType: SignificantEvent["type"] | null = null;

            // Check for lifecycle events
            if (lifecyclePatterns.some((p) => p.test(text))) {
                eventType = "lifecycle";
            }
            // Check for authentication events
            else if (authPatterns.some((p) => p.test(text))) {
                eventType = "authentication";
            }
            // Check for call events
            else if (callPatterns.some((p) => p.test(text))) {
                eventType = "call";
            }
            // Check for connection events
            else if (connectionPatterns.some((p) => p.test(text))) {
                eventType = "connection";
            }
            // Use severity as event type if no specific pattern matched
            else if (
                result.severity === "error" ||
                result.severity === "warning"
            ) {
                eventType = result.severity;
            } else if (result.severity === "info") {
                eventType = "info";
            }

            if (eventType) {
                this.significantEvents.push({
                    type: eventType,
                    timestamp: result.timestamp,
                    line: result.line,
                    message: result.message,
                    category: result.category,
                    uri: result.uri,
                });
            }
        });
    }

    setTimeInterval(minutes: number): void {
        this.timeInterval = minutes;
        this.updateTimeframesList();
        this.refresh();
    }

    clear(): void {
        this.results = [];
        this.allTimeframes.clear();
        this.enabledTimeframes.clear();
        this.refresh();
    }

    getTreeItem(element: TimelineTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TimelineTreeItem): Thenable<TimelineTreeItem[]> {
        if (!element) {
            // Root level - show timeframe toggle buttons
            return Promise.resolve(this.getTimeframeToggleButtons());
        }
        return Promise.resolve([]);
    }

    private getTimeframeToggleButtons(): TimelineTreeItem[] {
        // Use significant events if enabled, otherwise use all results
        const dataSource = this.showSignificantEvents ? this.significantEvents : this.results.filter(r => r.timestamp);
        
        if (dataSource.length === 0) {
            return [
                new TimelineTreeItem(
                    "No timestamps detected",
                    "",
                    vscode.TreeItemCollapsibleState.None,
                    "empty",
                ),
            ];
        }

        const items: TimelineTreeItem[] = [];
        const intervalMs = this.timeInterval * 60 * 1000;
        
        // Add interval selector button at top
        const intervalLabels: {[key: number]: string} = {
            5: "5 min",
            15: "15 min",
            30: "30 min",
            60: "1 hour",
            120: "2 hours",
            240: "4 hours"
        };
        
        const intervalButton = new TimelineTreeItem(
            `⏱️ Interval: ${intervalLabels[this.timeInterval] || `${this.timeInterval}m`}`,
            `${this.allTimeframes.size} blocks`,
            vscode.TreeItemCollapsibleState.None,
            "interval-selector",
        );
        intervalButton.iconPath = new vscode.ThemeIcon("settings-gear");
        intervalButton.command = {
            command: "logScoutAnalyzer.changeTimeInterval",
            title: "Change Time Interval",
        };
        intervalButton.tooltip = "Click to change time interval (5m, 15m, 30m, 1h, 2h, 4h)";
        items.push(intervalButton);
        
        // Add "All Timeframes" button
        const allEnabled = this.enabledTimeframes.size === this.allTimeframes.size;
        const allButton = new TimelineTreeItem(
            allEnabled ? "✓ All Timeframes" : "☐ All Timeframes",
            `${this.allTimeframes.size} total`,
            vscode.TreeItemCollapsibleState.None,
            "toggle-all-timeframes",
        );
        allButton.iconPath = new vscode.ThemeIcon(allEnabled ? "check-all" : "close-all");
        allButton.command = {
            command: "logScoutAnalyzer.toggleAllTimeframes",
            title: "Toggle All",
            arguments: [!allEnabled],
        };
        items.push(allButton);

        // Create bucket map
        const bucketMap = new Map<string, (ResultItem | SignificantEvent)[]>();

        for (const item of dataSource) {
            const timestamp = this.showSignificantEvents 
                ? (item as SignificantEvent).timestamp 
                : (item as ResultItem).timestamp!;
            const normalizedTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
            const resultTime = normalizedTimestamp.getTime();
            const bucketTime = new Date(
                Math.floor(resultTime / intervalMs) * intervalMs,
            );
            const bucketKey = bucketTime.toISOString();

            if (!bucketMap.has(bucketKey)) {
                bucketMap.set(bucketKey, []);
            }
            bucketMap.get(bucketKey)!.push(item);
        }

        // Create toggle buttons for each bucket
        const sortedBuckets = Array.from(bucketMap.entries()).sort((a, b) => 
            new Date(a[0]).getTime() - new Date(b[0]).getTime()
        );

        for (const [bucketKey, bucketItems] of sortedBuckets) {
            const enabled = this.enabledTimeframes.has(bucketKey);
            const bucketTime = new Date(bucketKey);
            const endTime = new Date(bucketTime.getTime() + intervalMs);
            const timeLabel = this.formatTimeRange(bucketTime, endTime);

            // Count by severity/type
            let errors = 0, warnings = 0, infos = 0, debugs = 0;
            
            if (this.showSignificantEvents) {
                errors = (bucketItems as SignificantEvent[]).filter((e) => e.type === "error").length;
                warnings = (bucketItems as SignificantEvent[]).filter((e) => e.type === "warning").length;
                infos = (bucketItems as SignificantEvent[]).filter((e) => e.type === "info").length;
            } else {
                errors = (bucketItems as ResultItem[]).filter((r) => r.severity === "error").length;
                warnings = (bucketItems as ResultItem[]).filter((r) => r.severity === "warning").length;
                infos = (bucketItems as ResultItem[]).filter((r) => r.severity === "info").length;
                debugs = (bucketItems as ResultItem[]).filter((r) => r.severity === "debug").length;
            }

            // Build count description
            const parts: string[] = [];
            if (errors > 0) parts.push(`${errors}E`);
            if (warnings > 0) parts.push(`${warnings}W`);
            if (infos > 0) parts.push(`${infos}I`);
            if (debugs > 0) parts.push(`${debugs}D`);
            const countDesc = parts.join(" ");

            const label = enabled ? `✓ ${timeLabel}` : `☐ ${timeLabel}`;
            const item = new TimelineTreeItem(
                label,
                countDesc,
                vscode.TreeItemCollapsibleState.None,
                "timeframe-toggle",
            );

            // Set icon based on severity and state
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("errorForeground"),
                );
            } else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("editorWarning.foreground"),
                );
            } else {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("editorInfo.foreground"),
                );
            }

            // Command to toggle this timeframe
            item.command = {
                command: "logScoutAnalyzer.toggleTimeframe",
                title: "Toggle Timeframe",
                arguments: [bucketKey],
            };

            item.tooltip = `${timeLabel}\n${errors} errors, ${warnings} warnings, ${infos} info\n\nClick to ${enabled ? "hide" : "show"}`;
            item.bucketTime = bucketTime;

            items.push(item);
        }

        return items;
    }

    getEventCounts(): {
        lifecycle: number;
        authentication: number;
        call: number;
        connection: number;
        error: number;
        warning: number;
        info: number;
        total: number;
    } {
        const counts = {
            lifecycle: 0,
            authentication: 0,
            call: 0,
            connection: 0,
            error: 0,
            warning: 0,
            info: 0,
            total: this.significantEvents.length,
        };

        for (const event of this.significantEvents) {
            switch (event.type) {
                case "lifecycle":
                    counts.lifecycle++;
                    break;
                case "authentication":
                    counts.authentication++;
                    break;
                case "call":
                    counts.call++;
                    break;
                case "connection":
                    counts.connection++;
                    break;
                case "error":
                    counts.error++;
                    break;
                case "warning":
                    counts.warning++;
                    break;
                case "info":
                    counts.info++;
                    break;
            }
        }

        return counts;
    }

    private formatTimeRange(start: Date, end: Date): string {
        const sameDay =
            start.getDate() === end.getDate() &&
            start.getMonth() === end.getMonth() &&
            start.getFullYear() === end.getFullYear();

        if (sameDay) {
            // Same day: show time range only
            return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        } else {
            // Different day: show full date/time
            return `${start.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
        }
    }
}

export class TimelineTreeItem extends vscode.TreeItem {
    public results?: ResultItem[];
    public result?: ResultItem;
    public events?: SignificantEvent[];
    public bucketTime?: Date;

    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
    ) {
        super(label, collapsibleState);
        this.description = description;
    }
}
