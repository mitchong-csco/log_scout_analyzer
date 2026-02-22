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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternOverrideTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
class PatternOverrideTreeProvider {
    constructor(manager) {
        this.manager = manager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve([
                new PatternTreeItem("Overrides", vscode.TreeItemCollapsibleState.Expanded, "category", "overrides"),
                new PatternTreeItem("Custom Patterns", vscode.TreeItemCollapsibleState.Expanded, "category", "custom"),
                new PatternTreeItem("Disabled", vscode.TreeItemCollapsibleState.Collapsed, "category", "disabled"),
            ]);
        }
        if (element.type === "category" && element.categoryId) {
            return Promise.resolve(this.getPatternsForCategory(element.categoryId));
        }
        return Promise.resolve([]);
    }
    getPatternsForCategory(category) {
        let patterns = [];
        switch (category) {
            case "overrides":
                patterns = this.manager
                    .getAllOverrides()
                    .filter((pattern) => pattern.enabled !== false);
                break;
            case "custom":
                patterns = this.manager
                    .getAllCustom()
                    .filter((pattern) => pattern.enabled !== false);
                break;
            case "disabled":
                patterns = this.manager
                    .getAllPatterns()
                    .filter((pattern) => pattern.enabled === false);
                break;
            default:
                patterns = [];
        }
        return patterns
            .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id, undefined, {
            sensitivity: "base",
        }))
            .map((pattern) => new PatternTreeItem(pattern.name?.trim() ? pattern.name : pattern.id, vscode.TreeItemCollapsibleState.None, "pattern", undefined, pattern));
    }
}
exports.PatternOverrideTreeProvider = PatternOverrideTreeProvider;
class PatternTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, type, categoryId, pattern) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.type = type;
        this.categoryId = categoryId;
        this.pattern = pattern;
        if (type === "category") {
            this.contextValue = "patternCategory";
            this.iconPath = new vscode.ThemeIcon("folder");
            return;
        }
        if (!pattern) {
            return;
        }
        this.contextValue = "patternItem";
        this.description = `${pattern.severity}${pattern.enabled === false ? " (disabled)" : ""}`;
        this.tooltip =
            `ID: ${pattern.id}\n` +
                `Source: ${pattern.sourceType}\n` +
                `Severity: ${pattern.severity}\n` +
                `Enabled: ${pattern.enabled !== false}`;
        this.iconPath = new vscode.ThemeIcon(pattern.enabled === false ? "circle-slash" : "symbol-property");
    }
}
//# sourceMappingURL=patternOverrideTreeProvider.js.map