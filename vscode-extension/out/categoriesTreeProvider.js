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
exports.CategoryTreeItem = exports.CategoriesTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class CategoriesTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.results = [];
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResults(results) {
        this.results = results;
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
            // Root level - show categories
            return Promise.resolve(this.getCategoryGroups());
        }
        else if (element.contextValue === "category") {
            // Category level - show results in that category
            return Promise.resolve(this.getCategoryResults(element));
        }
        return Promise.resolve([]);
    }
    getCategoryGroups() {
        if (this.results.length === 0) {
            return [
                new CategoryTreeItem("No categories", "", vscode.TreeItemCollapsibleState.None, "empty"),
            ];
        }
        // Group results by category
        const categoryMap = new Map();
        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category).push(result);
        }
        // Create tree items for each category
        const items = [];
        for (const [category, results] of categoryMap.entries()) {
            const errors = results.filter((r) => r.severity === "error").length;
            const warnings = results.filter((r) => r.severity === "warning").length;
            const infos = results.filter((r) => r.severity === "info").length;
            const debugs = results.filter((r) => r.severity === "debug").length;
            // Simple count description
            const parts = [];
            if (debugs > 0)
                parts.push(`${debugs} debug`);
            if (infos > 0)
                parts.push(`${infos} info`);
            if (warnings > 0)
                parts.push(`${warnings} warnings`);
            if (errors > 0)
                parts.push(`${errors} errors`);
            const description = parts.join(", ");
            const tooltip = `${category}\n${errors} errors, ${warnings} warnings, ${infos} info`;
            const item = new CategoryTreeItem(category, description, vscode.TreeItemCollapsibleState.Collapsed, "category");
            item.iconPath = new vscode.ThemeIcon("symbol-folder");
            item.tooltip = tooltip;
            item.results = results;
            // Badge showing most severe issue
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon("symbol-folder", new vscode.ThemeColor("errorForeground"));
            }
            else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon("symbol-folder", new vscode.ThemeColor("editorWarning.foreground"));
            }
            items.push(item);
        }
        // Sort by number of errors (descending), then by name
        return items.sort((a, b) => {
            const aErrors = a.results?.filter((r) => r.severity === "error").length || 0;
            const bErrors = b.results?.filter((r) => r.severity === "error").length || 0;
            if (aErrors !== bErrors) {
                return bErrors - aErrors; // More errors first
            }
            return a.label.toString().localeCompare(b.label.toString());
        });
    }
    getCategoryResults(category) {
        const results = category.results || [];
        // Sort by severity (errors first), then by line number
        const sortedResults = results.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2, debug: 3 };
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0)
                return severityDiff;
            return a.line - b.line;
        });
        return sortedResults.map((result) => {
            const lineNum = result.line + 1; // Convert to 1-based
            const label = `Line ${lineNum}: ${result.message}`;
            const description = result.timestamp
                ? result.timestamp.toLocaleTimeString()
                : "";
            const item = new CategoryTreeItem(label, description, vscode.TreeItemCollapsibleState.None, "result");
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
            tooltip.appendMarkdown(`**Line ${lineNum}:${result.column}**\n\n`);
            tooltip.appendMarkdown(`**Severity:** ${result.severity}\n\n`);
            tooltip.appendMarkdown(`${result.message}\n\n`);
            tooltip.appendCodeblock(result.matchedText, "log");
            if (result.timestamp) {
                tooltip.appendMarkdown(`\n**Time:** ${result.timestamp.toLocaleString()}`);
            }
            item.tooltip = tooltip;
            item.result = result;
            return item;
        });
    }
}
exports.CategoriesTreeProvider = CategoriesTreeProvider;
class CategoryTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
    }
}
exports.CategoryTreeItem = CategoryTreeItem;
//# sourceMappingURL=categoriesTreeProvider.js.map