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
        this.originalResults = [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResults(results) {
        this.results = results;
        this.originalResults = [...results]; // Store original for reset
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
    resetGrouping() {
        this.groupBy = "severity";
        this.results = [...this.originalResults]; // Restore original results
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
            // Create rich label with emoji and truncated message
            const severityEmoji = {
                error: "🔴",
                warning: "🟡",
                info: "🔵",
                debug: "🟣",
            };
            const emoji = severityEmoji[result.severity];
            const shortMessage = result.message.length > 50
                ? result.message.substring(0, 47) + "..."
                : result.message;
            const label = `${emoji} Line ${lineNum}: ${shortMessage}`;
            // Create rich description with timestamp and category badges
            let description = "";
            if (result.timestamp) {
                const timestamp = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
                const time = timestamp.toLocaleTimeString();
                description = `⏰ ${time}`;
            }
            if (result.category) {
                description = description
                    ? `${description} • 📁 ${result.category}`
                    : `📁 ${result.category}`;
            }
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
            // Add severity indicator
            tooltip.appendMarkdown(`${emoji} **${result.severity.toUpperCase()}**\n\n`);
            // Add metadata in a structured format
            tooltip.appendMarkdown(`---\n\n`);
            if (result.timestamp) {
                tooltip.appendMarkdown(`⏰ **Time:** ${result.timestamp.toLocaleString()}\n\n`);
            }
            if (result.category) {
                tooltip.appendMarkdown(`📁 **Category:** \`${result.category}\`\n\n`);
            }
            const fileName = result.uri.fsPath.split(/[\\/]/).pop();
            tooltip.appendMarkdown(`📄 **File:** \`${fileName}\`\n\n`);
            tooltip.appendMarkdown(`📍 **Location:** Line ${lineNum}, Column ${result.column + 1}\n\n`);
            // Add full message
            tooltip.appendMarkdown(`---\n\n`);
            tooltip.appendMarkdown(`**Message:**\n\n${result.message}\n\n`);
            // Add matched text in code block
            if (result.matchedText && result.matchedText !== result.message) {
                tooltip.appendMarkdown(`---\n\n`);
                tooltip.appendMarkdown(`**Matched Text:**\n\n`);
                tooltip.appendCodeblock(result.matchedText, "log");
            }
            // Add context hint if available
            if (result.context) {
                tooltip.appendMarkdown(`\n---\n\n`);
                tooltip.appendMarkdown(`💡 **Context Available**\n\n`);
                tooltip.appendCodeblock(result.context.substring(0, 200) + "...", "log");
            }
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