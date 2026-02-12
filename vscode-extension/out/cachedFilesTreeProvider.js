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
exports.CachedFileItem = exports.CachedFilesTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class CachedFilesTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.cachedFiles = new Map();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    setCachedFiles(cache) {
        this.cachedFiles = new Map();
        // Ensure timestamps are Date objects
        for (const [key, file] of cache.entries()) {
            this.cachedFiles.set(key, {
                ...file,
                timestamp: file.timestamp instanceof Date ? file.timestamp : new Date(file.timestamp)
            });
        }
        this.refresh();
    }
    clear() {
        this.cachedFiles.clear();
        this.refresh();
    }
    getCachedFiles() {
        return this.cachedFiles;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getCachedFileItems());
        }
        return Promise.resolve([]);
    }
    getCachedFileItems() {
        if (this.cachedFiles.size === 0) {
            return [
                new CachedFileItem("No cached files", "", vscode.TreeItemCollapsibleState.None, undefined),
            ];
        }
        // Convert cache to sorted array
        const items = [];
        for (const cachedFile of this.cachedFiles.values()) {
            const fileName = path.basename(cachedFile.uri.fsPath);
            const dirName = path.basename(path.dirname(cachedFile.uri.fsPath));
            // Build count description
            const parts = [];
            if (cachedFile.errorCount > 0)
                parts.push(`${cachedFile.errorCount}E`);
            if (cachedFile.warningCount > 0)
                parts.push(`${cachedFile.warningCount}W`);
            if (cachedFile.infoCount > 0)
                parts.push(`${cachedFile.infoCount}I`);
            if (cachedFile.debugCount > 0)
                parts.push(`${cachedFile.debugCount}D`);
            const countDesc = parts.length > 0 ? parts.join(" ") : "0 issues";
            // Time since analyzed
            const now = new Date();
            const timestamp = cachedFile.timestamp instanceof Date ? cachedFile.timestamp : new Date(cachedFile.timestamp);
            const diffMs = now.getTime() - timestamp.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            let timeDesc = "";
            if (diffMins === 0) {
                timeDesc = "just now";
            }
            else if (diffMins === 1) {
                timeDesc = "1 min ago";
            }
            else if (diffMins < 60) {
                timeDesc = `${diffMins} mins ago`;
            }
            else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours === 1) {
                    timeDesc = "1 hour ago";
                }
                else if (diffHours < 24) {
                    timeDesc = `${diffHours} hours ago`;
                }
                else {
                    timeDesc = cachedFile.timestamp.toLocaleDateString();
                }
            }
            const item = new CachedFileItem(fileName, `${countDesc} • ${timeDesc}`, vscode.TreeItemCollapsibleState.None, cachedFile);
            item.contextValue = "cachedFile";
            // Icon based on severity
            if (cachedFile.errorCount > 0) {
                item.iconPath = new vscode.ThemeIcon("file-text", new vscode.ThemeColor("errorForeground"));
            }
            else if (cachedFile.warningCount > 0) {
                item.iconPath = new vscode.ThemeIcon("file-text", new vscode.ThemeColor("editorWarning.foreground"));
            }
            else if (cachedFile.totalCount > 0) {
                item.iconPath = new vscode.ThemeIcon("file-text", new vscode.ThemeColor("editorInfo.foreground"));
            }
            else {
                item.iconPath = new vscode.ThemeIcon("file-text");
            }
            // Command to open file and load cached results
            item.command = {
                command: "logScoutAnalyzer.openCachedFile",
                title: "Open Cached File",
                arguments: [cachedFile],
            };
            // Tooltip
            const tooltip = new vscode.MarkdownString();
            tooltip.appendMarkdown(`**${fileName}**\n\n`);
            tooltip.appendMarkdown(`📁 ${dirName}\n\n`);
            tooltip.appendMarkdown(`**Issues:**\n`);
            tooltip.appendMarkdown(`- ${cachedFile.errorCount} Errors\n`);
            tooltip.appendMarkdown(`- ${cachedFile.warningCount} Warnings\n`);
            tooltip.appendMarkdown(`- ${cachedFile.infoCount} Info\n`);
            tooltip.appendMarkdown(`- ${cachedFile.debugCount} Debug\n\n`);
            tooltip.appendMarkdown(`**Analyzed:** ${cachedFile.timestamp.toLocaleString()}\n\n`);
            tooltip.appendMarkdown(`**Total Issues:** ${cachedFile.totalCount}\n\n`);
            tooltip.appendMarkdown(`_Click to open file_`);
            item.tooltip = tooltip;
            item.contextValue = "cachedFile";
            items.push(item);
        }
        // Sort by timestamp (most recent first)
        return items.sort((a, b) => {
            if (!a.cachedFile || !b.cachedFile)
                return 0;
            const aTime = a.cachedFile.timestamp instanceof Date ? a.cachedFile.timestamp : new Date(a.cachedFile.timestamp);
            const bTime = b.cachedFile.timestamp instanceof Date ? b.cachedFile.timestamp : new Date(b.cachedFile.timestamp);
            return bTime.getTime() - aTime.getTime();
        });
    }
}
exports.CachedFilesTreeProvider = CachedFilesTreeProvider;
class CachedFileItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, cachedFile) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.cachedFile = cachedFile;
        this.description = description;
    }
}
exports.CachedFileItem = CachedFileItem;
//# sourceMappingURL=cachedFilesTreeProvider.js.map