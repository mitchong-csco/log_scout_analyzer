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
        this.enabledCategories = new Set();
        this.allCategories = new Set();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setResults(results) {
        this.results = results;
        // Update categories list
        this.allCategories.clear();
        for (const result of results) {
            const category = result.category || "Uncategorized";
            this.allCategories.add(category);
            // Enable new categories by default
            if (!this.enabledCategories.has(category)) {
                this.enabledCategories.add(category);
            }
        }
        this.refresh();
    }
    clear() {
        this.results = [];
        this.allCategories.clear();
        this.enabledCategories.clear();
        this.refresh();
    }
    toggleCategory(category) {
        if (this.enabledCategories.has(category)) {
            this.enabledCategories.delete(category);
        }
        else {
            this.enabledCategories.add(category);
        }
        this.refresh();
    }
    toggleAll(enable) {
        if (enable) {
            this.enabledCategories = new Set(this.allCategories);
        }
        else {
            this.enabledCategories.clear();
        }
        this.refresh();
    }
    getEnabledCategories() {
        return this.enabledCategories;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show category toggle buttons
            return Promise.resolve(this.getCategoryButtons());
        }
        return Promise.resolve([]);
    }
    getCategoryButtons() {
        if (this.results.length === 0) {
            return [
                new CategoryTreeItem("No categories", "", vscode.TreeItemCollapsibleState.None, "empty", false),
            ];
        }
        // Group results by category to get counts
        const categoryMap = new Map();
        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category).push(result);
        }
        // Create button items for each category
        const items = [];
        // Add "All" button at the top
        const allEnabled = this.enabledCategories.size === this.allCategories.size;
        const allButton = new CategoryTreeItem(allEnabled ? "✓ All Categories" : "☐ All Categories", `${this.allCategories.size} total`, vscode.TreeItemCollapsibleState.None, "toggle-all", allEnabled);
        allButton.iconPath = new vscode.ThemeIcon(allEnabled ? "check-all" : "close-all");
        allButton.command = {
            command: "logScoutAnalyzer.toggleAllCategories",
            title: "Toggle All",
            arguments: [!allEnabled],
        };
        items.push(allButton);
        // Sort categories by error count
        const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => {
            const aErrors = a[1].filter((r) => r.severity === "error").length;
            const bErrors = b[1].filter((r) => r.severity === "error").length;
            if (aErrors !== bErrors)
                return bErrors - aErrors;
            return a[0].localeCompare(b[0]);
        });
        for (const [category, results] of sortedCategories) {
            const enabled = this.enabledCategories.has(category);
            const errors = results.filter((r) => r.severity === "error").length;
            const warnings = results.filter((r) => r.severity === "warning").length;
            const infos = results.filter((r) => r.severity === "info").length;
            // Build count description
            const parts = [];
            if (errors > 0)
                parts.push(`${errors}E`);
            if (warnings > 0)
                parts.push(`${warnings}W`);
            if (infos > 0)
                parts.push(`${infos}I`);
            const countDesc = parts.join(" ");
            const label = enabled ? `✓ ${category}` : `☐ ${category}`;
            const item = new CategoryTreeItem(label, countDesc, vscode.TreeItemCollapsibleState.None, "category-toggle", enabled);
            // Set icon based on severity and state
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon(enabled ? "circle-filled" : "circle-outline", new vscode.ThemeColor("errorForeground"));
            }
            else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon(enabled ? "circle-filled" : "circle-outline", new vscode.ThemeColor("editorWarning.foreground"));
            }
            else {
                item.iconPath = new vscode.ThemeIcon(enabled ? "circle-filled" : "circle-outline", new vscode.ThemeColor("editorInfo.foreground"));
            }
            // Command to toggle this category
            item.command = {
                command: "logScoutAnalyzer.toggleCategory",
                title: "Toggle Category",
                arguments: [category],
            };
            item.tooltip = `${category}\n${errors} errors, ${warnings} warnings, ${infos} info\n\nClick to ${enabled ? "hide" : "show"}`;
            item.categoryName = category;
            items.push(item);
        }
        return items;
    }
}
exports.CategoriesTreeProvider = CategoriesTreeProvider;
class CategoryTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, contextValue, enabled = false) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
        this.enabled = enabled;
    }
}
exports.CategoryTreeItem = CategoryTreeItem;
//# sourceMappingURL=categoriesTreeProvider.js.map