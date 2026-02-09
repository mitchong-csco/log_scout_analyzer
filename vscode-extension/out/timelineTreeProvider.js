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
exports.TimelineTreeItem = exports.TimelineTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class TimelineTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.results = [];
        this.significantEvents = [];
        this.timeInterval = 15; // minutes
        this.showSignificantEvents = true;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResults(results) {
        this.results = results;
        this.extractSignificantEvents(results);
        this.refresh();
    }
    setShowSignificantEvents(show) {
        this.showSignificantEvents = show;
        this.refresh();
    }
    extractSignificantEvents(results) {
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
            if (!result.timestamp)
                return;
            const text = result.message + " " + result.matchedText;
            let eventType = null;
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
            else if (result.severity === "error" ||
                result.severity === "warning") {
                eventType = result.severity;
            }
            else if (result.severity === "info") {
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
    setTimeInterval(minutes) {
        this.timeInterval = minutes;
        this.refresh();
    }
    clear() {
        this.results = [];
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show time buckets
            return Promise.resolve(this.getTimeBuckets());
        }
        else if (element.contextValue === "timebucket") {
            // Time bucket level - show results in that bucket
            return Promise.resolve(this.getTimeResults(element));
        }
        return Promise.resolve([]);
    }
    getTimeBuckets() {
        // Use significant events if enabled, otherwise use all results
        if (this.showSignificantEvents) {
            return this.getSignificantEventBuckets();
        }
        else {
            return this.getResultBuckets();
        }
    }
    getSignificantEventBuckets() {
        if (this.significantEvents.length === 0) {
            return [
                new TimelineTreeItem("No timestamps detected", "Timestamps not found in log lines", vscode.TreeItemCollapsibleState.None, "empty"),
            ];
        }
        // Create time buckets
        const bucketMap = new Map();
        const intervalMs = this.timeInterval * 60 * 1000;
        for (const event of this.significantEvents) {
            const resultTime = event.timestamp.getTime();
            const bucketTime = new Date(Math.floor(resultTime / intervalMs) * intervalMs);
            const bucketKey = bucketTime.toISOString();
            if (!bucketMap.has(bucketKey)) {
                bucketMap.set(bucketKey, []);
            }
            bucketMap.get(bucketKey).push(event);
        }
        // Create tree items for each bucket
        const treeItems = [];
        for (const [bucketKey, events] of bucketMap.entries()) {
            const bucketTime = new Date(bucketKey);
            const endTime = new Date(bucketTime.getTime() + intervalMs);
            const timeLabel = this.formatTimeRange(bucketTime, endTime);
            // Count event types
            const errors = events.filter((e) => e.type === "error").length;
            const warnings = events.filter((e) => e.type === "warning").length;
            const infos = events.filter((e) => e.type === "info").length;
            const lifecycleEvents = events.filter((e) => e.type === "lifecycle").length;
            const authEvents = events.filter((e) => e.type === "authentication").length;
            const callEvents = events.filter((e) => e.type === "call").length;
            const connectionEvents = events.filter((e) => e.type === "connection").length;
            const totalCount = events.length;
            const description = `${totalCount} event${totalCount !== 1 ? "s" : ""}`;
            let tooltip = `${timeLabel}\n`;
            if (errors > 0)
                tooltip += `🔴 ${errors} errors\n`;
            if (warnings > 0)
                tooltip += `🟡 ${warnings} warnings\n`;
            if (infos > 0)
                tooltip += `🔵 ${infos} info\n`;
            if (lifecycleEvents > 0)
                tooltip += `🔄 ${lifecycleEvents} lifecycle\n`;
            if (authEvents > 0)
                tooltip += `🔐 ${authEvents} auth\n`;
            if (callEvents > 0)
                tooltip += `📞 ${callEvents} calls\n`;
            if (connectionEvents > 0)
                tooltip += `🔌 ${connectionEvents} connections`;
            const item = new TimelineTreeItem(timeLabel, description, vscode.TreeItemCollapsibleState.Collapsed, "timebucket");
            item.iconPath = new vscode.ThemeIcon("clock");
            item.tooltip = tooltip;
            item.events = events;
            item.bucketTime = bucketTime;
            // Color based on severity
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("errorForeground"));
            }
            else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("editorWarning.foreground"));
            }
            else {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("editorInfo.foreground"));
            }
            treeItems.push(item);
        }
        // Sort by time (ascending)
        return treeItems.sort((a, b) => {
            return a.bucketTime.getTime() - b.bucketTime.getTime();
        });
    }
    getResultBuckets() {
        const resultsWithTimestamps = this.results.filter((r) => r.timestamp);
        if (resultsWithTimestamps.length === 0) {
            return [
                new TimelineTreeItem("No timestamps detected", "Timestamps not found in log lines", vscode.TreeItemCollapsibleState.None, "empty"),
            ];
        }
        // Create time buckets
        const bucketMap = new Map();
        const intervalMs = this.timeInterval * 60 * 1000;
        for (const result of resultsWithTimestamps) {
            const resultTime = result.timestamp.getTime();
            const bucketTime = new Date(Math.floor(resultTime / intervalMs) * intervalMs);
            const bucketKey = bucketTime.toISOString();
            if (!bucketMap.has(bucketKey)) {
                bucketMap.set(bucketKey, []);
            }
            bucketMap.get(bucketKey).push(result);
        }
        // Create tree items for each bucket
        const treeItems = [];
        for (const [bucketKey, results] of bucketMap.entries()) {
            const bucketTime = new Date(bucketKey);
            const endTime = new Date(bucketTime.getTime() + intervalMs);
            const timeLabel = this.formatTimeRange(bucketTime, endTime);
            const errors = results.filter((r) => r.severity === "error").length;
            const warnings = results.filter((r) => r.severity === "warning").length;
            const infos = results.filter((r) => r.severity === "info").length;
            const description = `${results.length} issue${results.length !== 1 ? "s" : ""}`;
            const tooltip = `${timeLabel}\n🔴 ${errors} errors\n🟡 ${warnings} warnings\n🔵 ${infos} info`;
            const item = new TimelineTreeItem(timeLabel, description, vscode.TreeItemCollapsibleState.Collapsed, "timebucket");
            item.iconPath = new vscode.ThemeIcon("clock");
            item.tooltip = tooltip;
            item.results = results;
            item.bucketTime = bucketTime;
            // Color based on severity
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("errorForeground"));
            }
            else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("editorWarning.foreground"));
            }
            else {
                item.iconPath = new vscode.ThemeIcon("clock", new vscode.ThemeColor("editorInfo.foreground"));
            }
            treeItems.push(item);
        }
        // Sort by time (ascending)
        return treeItems.sort((a, b) => {
            return a.bucketTime.getTime() - b.bucketTime.getTime();
        });
    }
    getTimeResults(bucket) {
        if (this.showSignificantEvents && bucket.events) {
            return this.createSignificantEventItems(bucket.events);
        }
        else if (bucket.results) {
            return this.createResultItems(bucket.results);
        }
        return [];
    }
    createSignificantEventItems(events) {
        // Sort by timestamp
        const sortedEvents = events.sort((a, b) => {
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        return sortedEvents.map((event) => {
            const lineNum = event.line + 1;
            const timeStr = event.timestamp.toLocaleTimeString();
            // Event type icon
            let icon;
            let iconName;
            let iconColor;
            switch (event.type) {
                case "error":
                    icon = "🔴";
                    iconName = "error";
                    iconColor = new vscode.ThemeColor("errorForeground");
                    break;
                case "warning":
                    icon = "🟡";
                    iconName = "warning";
                    iconColor = new vscode.ThemeColor("editorWarning.foreground");
                    break;
                case "lifecycle":
                    icon = "🔄";
                    iconName = "debug-restart";
                    iconColor = new vscode.ThemeColor("charts.purple");
                    break;
                case "authentication":
                    icon = "🔐";
                    iconName = "key";
                    iconColor = new vscode.ThemeColor("charts.yellow");
                    break;
                case "call":
                    icon = "📞";
                    iconName = "call-outgoing";
                    iconColor = new vscode.ThemeColor("charts.green");
                    break;
                case "connection":
                    icon = "🔌";
                    iconName = "plug";
                    iconColor = new vscode.ThemeColor("charts.blue");
                    break;
                default:
                    icon = "🔵";
                    iconName = "info";
                    iconColor = new vscode.ThemeColor("editorInfo.foreground");
            }
            const label = `${icon} ${timeStr} - ${event.message}`;
            const description = `Line ${lineNum}`;
            const item = new TimelineTreeItem(label, description, vscode.TreeItemCollapsibleState.None, "event");
            item.iconPath = new vscode.ThemeIcon(iconName, iconColor);
            // Set command to jump to line
            if (event.uri) {
                item.command = {
                    command: "logScoutAnalyzer.jumpToLine",
                    title: "Jump to Line",
                    arguments: [event.uri, event.line, 0],
                };
            }
            // Tooltip
            const tooltip = new vscode.MarkdownString();
            tooltip.appendMarkdown(`**Time:** ${event.timestamp.toLocaleString()}\n\n`);
            tooltip.appendMarkdown(`**Line ${lineNum}**\n\n`);
            tooltip.appendMarkdown(`**Type:** ${event.type}\n\n`);
            tooltip.appendMarkdown(`${event.message}\n\n`);
            if (event.category) {
                tooltip.appendMarkdown(`**Category:** ${event.category}`);
            }
            item.tooltip = tooltip;
            return item;
        });
    }
    createResultItems(results) {
        // Sort by timestamp (ascending), then by severity
        const sortedResults = results.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
                if (timeDiff !== 0)
                    return timeDiff;
            }
            const severityOrder = { error: 0, warning: 1, info: 2, debug: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
        return sortedResults.map((result) => {
            const lineNum = result.line + 1; // Convert to 1-based
            const timeStr = result.timestamp
                ? result.timestamp.toLocaleTimeString()
                : "";
            const severityIcon = result.severity === "error"
                ? "🔴"
                : result.severity === "warning"
                    ? "🟡"
                    : "🔵";
            const label = `${severityIcon} ${timeStr} - ${result.message}`;
            const description = `Line ${lineNum}`;
            const item = new TimelineTreeItem(label, description, vscode.TreeItemCollapsibleState.None, "result");
            // Set icon based on severity
            if (result.severity === "error") {
                item.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));
            }
            else if (result.severity === "warning") {
                item.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
            }
            else if (result.severity === "debug") {
                item.iconPath = new vscode.ThemeIcon("bug", new vscode.ThemeColor("debugIcon.startForeground"));
            }
            else {
                item.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("editorInfo.foreground"));
            }
            // Set command to jump to line
            item.command = {
                command: "logScoutAnalyzer.jumpToLine",
                title: "Jump to Line",
                arguments: [result.uri, result.line, result.column],
            };
            // Add tooltip with more details
            const tooltip = new vscode.MarkdownString();
            if (result.timestamp) {
                tooltip.appendMarkdown(`**Time:** ${result.timestamp.toLocaleString()}\n\n`);
            }
            tooltip.appendMarkdown(`**Line ${lineNum}:${result.column}**\n\n`);
            tooltip.appendMarkdown(`**Severity:** ${result.severity}\n\n`);
            tooltip.appendMarkdown(`${result.message}\n\n`);
            tooltip.appendCodeblock(result.matchedText, "log");
            if (result.category) {
                tooltip.appendMarkdown(`\n**Category:** ${result.category}`);
            }
            item.tooltip = tooltip;
            item.result = result;
            return item;
        });
    }
    getEventCounts() {
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
    formatTimeRange(start, end) {
        const sameDay = start.getDate() === end.getDate() &&
            start.getMonth() === end.getMonth() &&
            start.getFullYear() === end.getFullYear();
        if (sameDay) {
            // Same day: show time range only
            return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
        else {
            // Different day: show full date/time
            return `${start.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
        }
    }
}
exports.TimelineTreeProvider = TimelineTreeProvider;
class TimelineTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
    }
}
exports.TimelineTreeItem = TimelineTreeItem;
//# sourceMappingURL=timelineTreeProvider.js.map