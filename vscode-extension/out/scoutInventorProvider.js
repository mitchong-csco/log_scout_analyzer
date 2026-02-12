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
exports.ScoutInventorProvider = exports.InventorItem = exports.InventorItemType = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Item types for Scout Inventor
 */
var InventorItemType;
(function (InventorItemType) {
    InventorItemType[InventorItemType["Category"] = 0] = "Category";
    InventorItemType[InventorItemType["Action"] = 1] = "Action";
    InventorItemType[InventorItemType["Tool"] = 2] = "Tool";
    InventorItemType[InventorItemType["Quick"] = 3] = "Quick";
})(InventorItemType || (exports.InventorItemType = InventorItemType = {}));
/**
 * Tree item for Scout Inventor
 */
class InventorItem extends vscode.TreeItem {
    constructor(label, type, commandId, collapsibleState, children) {
        super(label, collapsibleState || vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.type = type;
        this.commandId = commandId;
        this.collapsibleState = collapsibleState;
        this.children = children;
        // Set icons based on type
        switch (type) {
            case InventorItemType.Category:
                this.iconPath = new vscode.ThemeIcon("folder");
                break;
            case InventorItemType.Action:
                this.iconPath = new vscode.ThemeIcon("play");
                break;
            case InventorItemType.Tool:
                this.iconPath = new vscode.ThemeIcon("tools");
                break;
            case InventorItemType.Quick:
                this.iconPath = new vscode.ThemeIcon("zap");
                break;
        }
        // Set command if provided
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
            };
        }
        // Set context value for when clauses
        this.contextValue = type.toString();
    }
}
exports.InventorItem = InventorItem;
/**
 * Provides the Scout Inventor tree view with quick actions and tools
 */
class ScoutInventorProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        }
        else {
            // Child items
            return Promise.resolve(element.children || []);
        }
    }
    /**
     * Get root level items
     */
    getRootItems() {
        return [
            // Quick Actions Section
            new InventorItem("⚡ Quick Actions", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Expanded, [
                new InventorItem("Analyze Current File", InventorItemType.Quick, "logScoutAnalyzer.analyzeFile"),
                new InventorItem("Clear Results", InventorItemType.Quick, "logScoutAnalyzer.clearDiagnostics"),
                new InventorItem("Clear Cache", InventorItemType.Quick, "logScoutAnalyzer.clearCache"),
                new InventorItem("Show Patterns", InventorItemType.Quick, "logScoutAnalyzer.showPatterns"),
            ]),
            // Creation Tools Section
            new InventorItem("✨ Creation & Authoring", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Expanded, [
                new InventorItem("Open Action Panel", InventorItemType.Tool, "logScoutAnalyzer.openActionPanel"),
                new InventorItem("Create Pattern", InventorItemType.Tool, "logScoutAnalyzer.createPattern"),
                new InventorItem("Create Signature", InventorItemType.Tool, "logScoutAnalyzer.createSignature"),
                new InventorItem("Create Scenario", InventorItemType.Tool, "logScoutAnalyzer.createScenario"),
                new InventorItem("Create Action", InventorItemType.Tool, "logScoutAnalyzer.createAction"),
            ]),
            // Visualization Section
            new InventorItem("📊 Visualization", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Expanded, [
                new InventorItem("Show Timeline", InventorItemType.Tool, "logScoutAnalyzer.showTimelineVisualization"),
                new InventorItem("Show Ladder Diagram", InventorItemType.Tool, "logScoutAnalyzer.showLadderDiagram"),
                new InventorItem("Open Split View", InventorItemType.Tool, "logScoutAnalyzer.openSplitView"),
            ]),
            // Export & Share Section
            new InventorItem("📤 Export & Share", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Expanded, [
                new InventorItem("Export Results", InventorItemType.Action, "logScoutAnalyzer.exportResults"),
                new InventorItem("Export Patterns", InventorItemType.Action, "logScoutAnalyzer.exportPatterns"),
                new InventorItem("Export Scenarios", InventorItemType.Action, "logScoutAnalyzer.exportScenarios"),
            ]),
            // Batch Operations Section
            new InventorItem("🔄 Batch Operations", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new InventorItem("Analyze Directory", InventorItemType.Action, "logScoutAnalyzer.analyzeDirectory"),
                new InventorItem("Analyze All Below", InventorItemType.Action, "logScoutAnalyzer.analyzeAllBelow"),
            ]),
            // Console Section
            new InventorItem("🖥️ Console", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new InventorItem("Show Console", InventorItemType.Action, "logScoutAnalyzer.showConsole"),
                new InventorItem("Clear Console", InventorItemType.Action, "logScoutAnalyzer.clearConsole"),
            ]),
            // View Options Section
            new InventorItem("👁️ View Options", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new InventorItem("Group by Severity", InventorItemType.Action, "logScoutAnalyzer.groupBySeverity"),
                new InventorItem("Group by Category", InventorItemType.Action, "logScoutAnalyzer.groupByCategory"),
                new InventorItem("Group by File", InventorItemType.Action, "logScoutAnalyzer.groupByFile"),
                new InventorItem("Reset View", InventorItemType.Action, "logScoutAnalyzer.resetView"),
            ]),
            // Info Section
            new InventorItem("ℹ️ Information", InventorItemType.Category, undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new InventorItem("Show Version", InventorItemType.Action, "logScoutAnalyzer.showVersion"),
                new InventorItem("Show Cache Stats", InventorItemType.Action, "logScoutAnalyzer.showCacheStats"),
            ]),
        ];
    }
}
exports.ScoutInventorProvider = ScoutInventorProvider;
//# sourceMappingURL=scoutInventorProvider.js.map