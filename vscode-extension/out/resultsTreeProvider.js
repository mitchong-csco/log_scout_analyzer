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
exports.ResultTreeItem = exports.ResultsTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class ResultsTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.results = [];
        this.groupBy = "severity";
        this.sortBy = "line";
        this.originalResults = [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResults(results) {
        this.results = results;
        this.originalResults = [...results]; // Store original for reset
        this.applySorting();
        this.refresh();
    }
    getResults() {
        return this.results;
    }
    getGroupBy() {
        return this.groupBy;
    }
    setGroupBy(groupBy) {
        this.groupBy = groupBy;
        this.refresh();
    }
    setSortBy(sortBy) {
        this.sortBy = sortBy;
        this.applySorting();
        this.refresh();
    }
    getSortBy() {
        return this.sortBy;
    }
    applySorting() {
        switch (this.sortBy) {
            case "line":
                // Sort by URI, then by line number
                this.results.sort((a, b) => {
                    const uriCompare = a.uri.fsPath.localeCompare(b.uri.fsPath);
                    return uriCompare !== 0 ? uriCompare : a.line - b.line;
                });
                break;
            case "severity":
                // Sort by severity (Error > Warning > Info > Debug), then by line
                const severityOrder = { error: 0, warning: 1, info: 2, debug: 3 };
                this.results.sort((a, b) => {
                    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                    return severityDiff !== 0 ? severityDiff : a.line - b.line;
                });
                break;
            case "time":
                // Sort by timestamp (newest first), then by line
                this.results.sort((a, b) => {
                    if (!a.timestamp && !b.timestamp)
                        return a.line - b.line;
                    if (!a.timestamp)
                        return 1;
                    if (!b.timestamp)
                        return -1;
                    const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
                    return timeDiff !== 0 ? timeDiff : a.line - b.line;
                });
                break;
            case "file":
                // Sort by filename, then by line
                this.results.sort((a, b) => {
                    const fileA = a.uri.fsPath.split(/[\\/]/).pop() || "";
                    const fileB = b.uri.fsPath.split(/[\\/]/).pop() || "";
                    const fileCompare = fileA.localeCompare(fileB);
                    return fileCompare !== 0 ? fileCompare : a.line - b.line;
                });
                break;
            case "category":
                // Sort by category, then by line
                this.results.sort((a, b) => {
                    const catA = a.category || "Uncategorized";
                    const catB = b.category || "Uncategorized";
                    const catCompare = catA.localeCompare(catB);
                    return catCompare !== 0 ? catCompare : a.line - b.line;
                });
                break;
        }
    }
    resetGrouping() {
        this.groupBy = "severity";
        this.sortBy = "line";
        this.results = [...this.originalResults]; // Restore original results
        this.applySorting();
        this.refresh();
    }
    clear() {
        this.results = [];
        this.originalResults = [];
        this.groupBy = "severity"; // Reset to default
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show groups
            return Promise.resolve(this.getRootItems());
        }
        else if (element.contextValue === "group") {
            // Group level - show results in that group
            return Promise.resolve(this.getGroupItems(element));
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        if (this.results.length === 0) {
            return [
                new ResultTreeItem("No results", "Run analysis to see issues", vscode.TreeItemCollapsibleState.None, "empty"),
            ];
        }
        // Calculate severity counts
        const errorCount = this.results.filter((r) => r.severity === "error").length;
        const warningCount = this.results.filter((r) => r.severity === "warning").length;
        const infoCount = this.results.filter((r) => r.severity === "info").length;
        const debugCount = this.results.filter((r) => r.severity === "debug").length;
        // Show current grouping mode indicator with severity counts
        const countParts = [];
        if (errorCount > 0)
            countParts.push(`${errorCount}E`);
        if (warningCount > 0)
            countParts.push(`${warningCount}W`);
        if (infoCount > 0)
            countParts.push(`${infoCount}I`);
        if (debugCount > 0)
            countParts.push(`${debugCount}D`);
        const countDesc = countParts.join(" ");
        const modeIndicator = new ResultTreeItem(`📊 ${this.getGroupByLabel()}`, countDesc, vscode.TreeItemCollapsibleState.None, "mode-indicator");
        modeIndicator.iconPath = new vscode.ThemeIcon("filter", new vscode.ThemeColor("charts.blue"));
        // Add tooltip with instructions
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**Current View: ${this.getGroupByLabel()}**\n\n`);
        tooltip.appendMarkdown(`Showing ${this.results.length} issues\n\n`);
        tooltip.appendMarkdown(`**Change View:**\n`);
        tooltip.appendMarkdown(`- Group by Severity (default)\n`);
        tooltip.appendMarkdown(`- Group by Category\n`);
        tooltip.appendMarkdown(`- Group by File\n\n`);
        tooltip.appendMarkdown(`**Reset:** Click "Reset View" button to restore default grouping`);
        modeIndicator.tooltip = tooltip;
        const groups = this.getGroups();
        return [modeIndicator, ...groups];
    }
    getGroupByLabel() {
        switch (this.groupBy) {
            case "severity":
                return "By Severity";
            case "category":
                return "By Category";
            case "file":
                return "By File";
        }
    }
    getGroups() {
        if (this.groupBy === "severity") {
            return this.getGroupsBySeverity();
        }
        else if (this.groupBy === "category") {
            return this.getGroupsByCategory();
        }
        else {
            return this.getGroupsByFile();
        }
    }
    getGroupsBySeverity() {
        const errors = this.results.filter((r) => r.severity === "error");
        const warnings = this.results.filter((r) => r.severity === "warning");
        const infos = this.results.filter((r) => r.severity === "info");
        const debugs = this.results.filter((r) => r.severity === "debug");
        const groups = [];
        // Order: Debug -> Info -> Warning -> Error (least to most severe)
        if (debugs.length > 0) {
            const item = new ResultTreeItem(`🟣 Debug (${debugs.length})`, `${debugs.length} debug message${debugs.length !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.Collapsed, "group");
            item.iconPath = new vscode.ThemeIcon("bug", new vscode.ThemeColor("debugIcon.startForeground"));
            item.results = debugs;
            groups.push(item);
        }
        if (infos.length > 0) {
            const item = new ResultTreeItem(`🔵 Info (${infos.length})`, `${infos.length} informational message${infos.length !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.Collapsed, "group");
            item.iconPath = new vscode.ThemeIcon("info", new vscode.ThemeColor("editorInfo.foreground"));
            item.results = infos;
            groups.push(item);
        }
        if (warnings.length > 0) {
            const item = new ResultTreeItem(`🟡 Warnings (${warnings.length})`, `${warnings.length} potential issue${warnings.length !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.Collapsed, "group");
            item.iconPath = new vscode.ThemeIcon("warning", new vscode.ThemeColor("editorWarning.foreground"));
            item.results = warnings;
            groups.push(item);
        }
        if (errors.length > 0) {
            const item = new ResultTreeItem(`🔴 Errors (${errors.length})`, `${errors.length} critical issue${errors.length !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.Expanded, "group");
            item.iconPath = new vscode.ThemeIcon("error", new vscode.ThemeColor("errorForeground"));
            item.results = errors;
            groups.push(item);
        }
        return groups;
    }
    getGroupsByCategory() {
        const categoryMap = new Map();
        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category).push(result);
        }
        const groups = [];
        for (const [category, items] of categoryMap.entries()) {
            const item = new ResultTreeItem(`${category} (${items.length})`, category, vscode.TreeItemCollapsibleState.Collapsed, "group");
            item.iconPath = new vscode.ThemeIcon("symbol-folder");
            item.results = items;
            groups.push(item);
        }
        return groups.sort((a, b) => a.label.toString().localeCompare(b.label.toString()));
    }
    getGroupsByFile() {
        const fileMap = new Map();
        for (const result of this.results) {
            const fileName = result.uri.fsPath;
            if (!fileMap.has(fileName)) {
                fileMap.set(fileName, []);
            }
            fileMap.get(fileName).push(result);
        }
        const groups = [];
        for (const [filePath, items] of fileMap.entries()) {
            const fileName = filePath.split(/[\\/]/).pop() || filePath;
            const item = new ResultTreeItem(`${fileName} (${items.length})`, filePath, vscode.TreeItemCollapsibleState.Collapsed, "group");
            item.iconPath = new vscode.ThemeIcon("file");
            item.results = items;
            groups.push(item);
        }
        return groups;
    }
    getGroupItems(group) {
        const results = group.results || [];
        return results.map((result) => {
            const lineNum = result.line + 1; // Convert to 1-based
            // Format timestamp
            let timeStr = "";
            if (result.timestamp) {
                const timestamp = result.timestamp instanceof Date
                    ? result.timestamp
                    : new Date(result.timestamp);
                timeStr = timestamp.toLocaleString();
            }
            // Create label with timestamp and message
            const label = timeStr ? `${timeStr}  ${result.message}` : result.message;
            // Create description with structured fields
            const descParts = [];
            if (result.category) {
                descParts.push(`Category: ${result.category}`);
            }
            if (result.patternName) {
                descParts.push(`Pattern: ${result.patternName}`);
            }
            descParts.push(`Line: ${lineNum}, Col: ${result.column + 1}`);
            const description = descParts.join(" | ");
            const item = new ResultTreeItem(label, description, vscode.TreeItemCollapsibleState.None, "result");
            // Set icon based on severity with color
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
            // Create enhanced tooltip with rich formatting
            const tooltip = new vscode.MarkdownString();
            tooltip.supportHtml = true;
            tooltip.isTrusted = true;
            // Build header line: Category (left) | trace level filename:line (right)
            const fileName = result.uri.fsPath.split(/[\\/]/).pop();
            const category = result.category || "";
            const rightParts = [];
            rightParts.push(result.severity.toUpperCase());
            rightParts.push(`${fileName}:${lineNum}`);
            const rightSide = rightParts.join(" ");
            // Use HTML for left/right justification
            tooltip.appendMarkdown(`<div style="display: flex; justify-content: space-between;"><span>${category}</span><span>${rightSide}</span></div>\n\n`);
            tooltip.appendMarkdown(`---\n\n`);
            // Show the merged template (template with values substituted) or fall back to matched text
            const displayText = result.merged_template || result.matchedText || result.message;
            tooltip.appendMarkdown(`${displayText}\n\n`);
            // Add pattern ID as clickable link below message
            if (result.patternId) {
                const encodedId = encodeURIComponent(JSON.stringify([result.patternId]));
                tooltip.appendMarkdown(`Pattern: [(${result.patternId})](command:logScoutAnalyzer.showPatternById?${encodedId})\n\n`);
            }
            tooltip.appendMarkdown(`---\n\n`);
            tooltip.appendCodeblock(result.context, "log");
            item.tooltip = tooltip;
            item.result = result;
            return item;
        });
    }
}
exports.ResultsTreeProvider = ResultsTreeProvider;
class ResultTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
    }
}
exports.ResultTreeItem = ResultTreeItem;
//# sourceMappingURL=resultsTreeProvider.js.map