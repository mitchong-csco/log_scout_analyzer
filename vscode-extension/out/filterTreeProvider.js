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
exports.FilterTreeItem = exports.FilterTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class FilterTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.results = [];
        this.filterState = {
            enabledCategories: new Set(),
            enabledFiles: new Set(),
            enabledTimeframes: new Set(),
            startDate: null,
            endDate: null,
        };
        this.allCategories = new Set();
        this.allFiles = new Set();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
        this.applyFilters();
    }
    setResults(results) {
        this.results = results;
        // Update available filters
        this.allCategories.clear();
        this.allFiles.clear();
        for (const result of results) {
            const category = result.category || "Uncategorized";
            this.allCategories.add(category);
            const fileName = result.uri.fsPath.split(/[\\/]/).pop() || "Unknown";
            this.allFiles.add(fileName);
            // Enable new items by default
            if (!this.filterState.enabledCategories.has(category)) {
                this.filterState.enabledCategories.add(category);
            }
            if (!this.filterState.enabledFiles.has(fileName)) {
                this.filterState.enabledFiles.add(fileName);
            }
        }
        this.refresh();
    }
    clear() {
        this.results = [];
        this.allCategories.clear();
        this.allFiles.clear();
        this.filterState.enabledCategories.clear();
        this.filterState.enabledFiles.clear();
        this.filterState.enabledTimeframes.clear();
        this.refresh();
    }
    setFilterChangeCallback(callback) {
        this.onFilterChangeCallback = callback;
    }
    applyFilters() {
        let filtered = this.results;
        // Filter by category
        if (this.filterState.enabledCategories.size < this.allCategories.size) {
            filtered = filtered.filter((r) => {
                const category = r.category || "Uncategorized";
                return this.filterState.enabledCategories.has(category);
            });
        }
        // Filter by file
        if (this.filterState.enabledFiles.size < this.allFiles.size) {
            filtered = filtered.filter((r) => {
                const fileName = r.uri.fsPath.split(/[\\/]/).pop() || "Unknown";
                return this.filterState.enabledFiles.has(fileName);
            });
        }
        // Filter by date range (if set)
        if (this.filterState.startDate || this.filterState.endDate) {
            filtered = filtered.filter((r) => {
                if (!r.timestamp)
                    return false;
                const timestamp = r.timestamp;
                if (this.filterState.startDate && timestamp < this.filterState.startDate) {
                    return false;
                }
                if (this.filterState.endDate && timestamp > this.filterState.endDate) {
                    return false;
                }
                return true;
            });
        }
        // Notify consumers of filtered results
        if (this.onFilterChangeCallback) {
            this.onFilterChangeCallback(filtered);
        }
    }
    toggleCategory(category) {
        if (this.filterState.enabledCategories.has(category)) {
            this.filterState.enabledCategories.delete(category);
        }
        else {
            this.filterState.enabledCategories.add(category);
        }
        this.refresh();
    }
    toggleFile(fileName) {
        if (this.filterState.enabledFiles.has(fileName)) {
            this.filterState.enabledFiles.delete(fileName);
        }
        else {
            this.filterState.enabledFiles.add(fileName);
        }
        this.refresh();
    }
    toggleAllCategories(enable) {
        if (enable) {
            this.filterState.enabledCategories = new Set(this.allCategories);
        }
        else {
            this.filterState.enabledCategories.clear();
        }
        this.refresh();
    }
    toggleAllFiles(enable) {
        if (enable) {
            this.filterState.enabledFiles = new Set(this.allFiles);
        }
        else {
            this.filterState.enabledFiles.clear();
        }
        this.refresh();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - show filter sections
            return Promise.resolve(this.getRootSections());
        }
        else if (element.type === "categorySection") {
            return Promise.resolve(this.getCategoryFilters());
        }
        else if (element.type === "fileSection") {
            return Promise.resolve(this.getFileFilters());
        }
        else if (element.type === "timeSection") {
            return Promise.resolve(this.getTimeFilters());
        }
        return Promise.resolve([]);
    }
    getRootSections() {
        const items = [];
        // Categories section
        const categoryCount = this.filterState.enabledCategories.size;
        const totalCategories = this.allCategories.size;
        const categoryItem = new FilterTreeItem(`📂 Categories (${categoryCount}/${totalCategories})`, "Toggle category filters", vscode.TreeItemCollapsibleState.Expanded, "categorySection", true);
        items.push(categoryItem);
        // Files section
        const fileCount = this.filterState.enabledFiles.size;
        const totalFiles = this.allFiles.size;
        const fileItem = new FilterTreeItem(`📄 Files (${fileCount}/${totalFiles})`, "Toggle file filters", vscode.TreeItemCollapsibleState.Collapsed, "fileSection", true);
        items.push(fileItem);
        // Time section
        const timeItem = new FilterTreeItem("⏱ Time Range", "Filter by timestamp", vscode.TreeItemCollapsibleState.Collapsed, "timeSection", true);
        items.push(timeItem);
        return items;
    }
    getCategoryFilters() {
        if (this.allCategories.size === 0) {
            return [
                new FilterTreeItem("No categories", "", vscode.TreeItemCollapsibleState.None, "empty", false),
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
        // Sort categories by name
        const sortedCategories = Array.from(this.allCategories).sort();
        const items = [];
        for (const category of sortedCategories) {
            const count = categoryMap.get(category)?.length || 0;
            const enabled = this.filterState.enabledCategories.has(category);
            const item = new FilterTreeItem(`${enabled ? "☑" : "☐"} ${category}`, `${count} result${count !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.None, "categoryFilter", enabled, category);
            item.command = {
                command: "logScoutAnalyzer.toggleFilter",
                title: "Toggle Filter",
                arguments: ["category", category],
            };
            items.push(item);
        }
        return items;
    }
    getFileFilters() {
        if (this.allFiles.size === 0) {
            return [
                new FilterTreeItem("No files", "", vscode.TreeItemCollapsibleState.None, "empty", false),
            ];
        }
        // Count results per file
        const fileMap = new Map();
        for (const result of this.results) {
            const fileName = result.uri.fsPath.split(/[\\/]/).pop() || "Unknown";
            if (!fileMap.has(fileName)) {
                fileMap.set(fileName, []);
            }
            fileMap.get(fileName).push(result);
        }
        // Sort files by name
        const sortedFiles = Array.from(this.allFiles).sort();
        const items = [];
        for (const fileName of sortedFiles) {
            const count = fileMap.get(fileName)?.length || 0;
            const enabled = this.filterState.enabledFiles.has(fileName);
            const item = new FilterTreeItem(`${enabled ? "☑" : "☐"} ${fileName}`, `${count} result${count !== 1 ? "s" : ""}`, vscode.TreeItemCollapsibleState.None, "fileFilter", enabled, fileName);
            item.command = {
                command: "logScoutAnalyzer.toggleFilter",
                title: "Toggle Filter",
                arguments: ["file", fileName],
            };
            items.push(item);
        }
        return items;
    }
    getTimeFilters() {
        const items = [];
        // Show current date range if set
        if (this.filterState.startDate || this.filterState.endDate) {
            const start = this.filterState.startDate
                ? this.filterState.startDate.toLocaleString()
                : "Beginning";
            const end = this.filterState.endDate
                ? this.filterState.endDate.toLocaleString()
                : "Now";
            items.push(new FilterTreeItem(`Range: ${start} - ${end}`, "Click to clear", vscode.TreeItemCollapsibleState.None, "timeRange", true));
        }
        else {
            items.push(new FilterTreeItem("All Time", "No time filter active", vscode.TreeItemCollapsibleState.None, "timeRange", true));
        }
        return items;
    }
}
exports.FilterTreeProvider = FilterTreeProvider;
class FilterTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, type, enabled, filterValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.enabled = enabled;
        this.filterValue = filterValue;
        this.description = description;
        this.tooltip = `${label}${description ? ` - ${description}` : ""}`;
        this.contextValue = type;
    }
}
exports.FilterTreeItem = FilterTreeItem;
//# sourceMappingURL=filterTreeProvider.js.map