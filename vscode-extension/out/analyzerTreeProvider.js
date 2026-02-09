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
exports.AnalyzerTreeItem = exports.AnalyzerTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class AnalyzerTreeProvider {
    static setDiagnosticsProvider(_provider) {
        // Reserved for future use
    }
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.activeTimeframe = null;
    }
    setTimeframe(timeframe) {
        this.activeTimeframe = timeframe;
        this.refresh();
    }
    getActiveTimeframe() {
        return this.activeTimeframe;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }
    getRootItems() {
        const editor = vscode.window.activeTextEditor;
        const items = [];
        // Current File Section
        if (editor) {
            const fileName = path.basename(editor.document.fileName);
            const currentFileItem = new AnalyzerTreeItem(`📄 ${fileName}`, "", vscode.TreeItemCollapsibleState.None, "currentFile");
            currentFileItem.tooltip = `Current file: ${editor.document.fileName}`;
            currentFileItem.iconPath = new vscode.ThemeIcon("file", new vscode.ThemeColor("charts.blue"));
            items.push(currentFileItem);
        }
        // Quick Actions
        const analyzeCurrentItem = new AnalyzerTreeItem("Analyze Current File", editor ? "Run analysis on active file" : "No file open", vscode.TreeItemCollapsibleState.None, "analyzeFile");
        analyzeCurrentItem.command = {
            command: "logScoutAnalyzer.analyzeFile",
            title: "Analyze File",
        };
        analyzeCurrentItem.iconPath = new vscode.ThemeIcon("play-circle", new vscode.ThemeColor("testing.runIcon"));
        items.push(analyzeCurrentItem);
        const analyzeDirectoryItem = new AnalyzerTreeItem("Analyze Directory", editor ? "All log files in current directory" : "No file open", vscode.TreeItemCollapsibleState.None, "analyzeDirectory");
        analyzeDirectoryItem.command = {
            command: "logScoutAnalyzer.analyzeDirectory",
            title: "Analyze Directory",
        };
        analyzeDirectoryItem.iconPath = new vscode.ThemeIcon("folder", new vscode.ThemeColor("testing.runIcon"));
        items.push(analyzeDirectoryItem);
        const analyzeRecursiveItem = new AnalyzerTreeItem("Analyze Recursively", editor ? "All log files in directory tree" : "No file open", vscode.TreeItemCollapsibleState.None, "analyzeRecursive");
        analyzeRecursiveItem.command = {
            command: "logScoutAnalyzer.analyzeAllBelow",
            title: "Analyze Recursively",
        };
        analyzeRecursiveItem.iconPath = new vscode.ThemeIcon("folder-library", new vscode.ThemeColor("testing.runIcon"));
        items.push(analyzeRecursiveItem);
        // Separator
        const separatorItem = new AnalyzerTreeItem("────────────────────", "", vscode.TreeItemCollapsibleState.None, "separator");
        items.push(separatorItem);
        // Timeframe Filters Section
        const timeframeHeader = new AnalyzerTreeItem("⏱️ Timeframe Filters", this.activeTimeframe
            ? `Active: ${this.activeTimeframe.label}`
            : "Show all time", vscode.TreeItemCollapsibleState.None, "timeframeHeader");
        timeframeHeader.iconPath = new vscode.ThemeIcon("calendar", new vscode.ThemeColor("charts.purple"));
        items.push(timeframeHeader);
        // Timeframe buttons
        const timeframes = [
            { label: "Last 1 Day", days: 1, active: false },
            { label: "Last 2 Days", days: 2, active: false },
            { label: "Last 3 Days", days: 3, active: false },
            { label: "Last 7 Days", days: 7, active: false },
            { label: "All Time", days: 0, active: false },
        ];
        timeframes.forEach((tf) => {
            const isActive = this.activeTimeframe?.days === tf.days;
            const item = new AnalyzerTreeItem(isActive ? `✓ ${tf.label}` : `  ${tf.label}`, isActive ? "Currently active" : "Click to apply", vscode.TreeItemCollapsibleState.None, "timeframeFilter");
            item.command = {
                command: "logScoutAnalyzer.setTimeframe",
                title: "Set Timeframe",
                arguments: [tf.days === 0 ? null : tf],
            };
            item.iconPath = new vscode.ThemeIcon(isActive ? "check" : "circle-outline", isActive ? new vscode.ThemeColor("charts.green") : undefined);
            items.push(item);
        });
        // Separator
        const separator2Item = new AnalyzerTreeItem("────────────────────", "", vscode.TreeItemCollapsibleState.None, "separator");
        items.push(separator2Item);
        // Tools Section
        const clearResultsItem = new AnalyzerTreeItem("Clear Results", "Clear all diagnostics", vscode.TreeItemCollapsibleState.None, "clearResults");
        clearResultsItem.command = {
            command: "logScoutAnalyzer.clearDiagnostics",
            title: "Clear Results",
        };
        clearResultsItem.iconPath = new vscode.ThemeIcon("clear-all", new vscode.ThemeColor("errorForeground"));
        items.push(clearResultsItem);
        const exportResultsItem = new AnalyzerTreeItem("Export Results", "Export to JSON", vscode.TreeItemCollapsibleState.None, "exportResults");
        exportResultsItem.command = {
            command: "logScoutAnalyzer.exportResults",
            title: "Export Results",
        };
        exportResultsItem.iconPath = new vscode.ThemeIcon("save");
        items.push(exportResultsItem);
        const showConsoleItem = new AnalyzerTreeItem("Show Console", "Open Scout Console output", vscode.TreeItemCollapsibleState.None, "showConsole");
        showConsoleItem.command = {
            command: "logScoutAnalyzer.showConsole",
            title: "Show Console",
        };
        showConsoleItem.iconPath = new vscode.ThemeIcon("terminal");
        items.push(showConsoleItem);
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const consoleLocation = config.get("consoleOutputLocation", "outputPanel");
        const locationLabel = consoleLocation === "outputPanel" ? "Output Panel" : "Terminal";
        const toggleConsoleItem = new AnalyzerTreeItem("Toggle Console Location", `Currently: ${locationLabel}`, vscode.TreeItemCollapsibleState.None, "toggleConsoleLocation");
        toggleConsoleItem.command = {
            command: "logScoutAnalyzer.toggleConsoleLocation",
            title: "Toggle Console Location",
        };
        toggleConsoleItem.iconPath = new vscode.ThemeIcon("arrow-swap");
        items.push(toggleConsoleItem);
        const showPatternsItem = new AnalyzerTreeItem("Show Patterns", "View loaded analysis patterns", vscode.TreeItemCollapsibleState.None, "showPatterns");
        showPatternsItem.command = {
            command: "logScoutAnalyzer.showPatterns",
            title: "Show Patterns",
        };
        showPatternsItem.iconPath = new vscode.ThemeIcon("list-tree");
        items.push(showPatternsItem);
        // Visualization Section
        const timelineVizItem = new AnalyzerTreeItem("Timeline Visualization", "Visual timeline with events", vscode.TreeItemCollapsibleState.None, "timelineVisualization");
        timelineVizItem.command = {
            command: "logScoutAnalyzer.showTimelineVisualization",
            title: "Timeline Visualization",
        };
        timelineVizItem.iconPath = new vscode.ThemeIcon("graph-line", new vscode.ThemeColor("charts.blue"));
        items.push(timelineVizItem);
        const ladderDiagramItem = new AnalyzerTreeItem("SIP Ladder Diagram", "Call flow visualization", vscode.TreeItemCollapsibleState.None, "ladderDiagram");
        ladderDiagramItem.command = {
            command: "logScoutAnalyzer.showLadderDiagram",
            title: "SIP Ladder Diagram",
        };
        ladderDiagramItem.iconPath = new vscode.ThemeIcon("type-hierarchy", new vscode.ThemeColor("charts.green"));
        items.push(ladderDiagramItem);
        // Separator
        const separator3Item = new AnalyzerTreeItem("────────────────────", "", vscode.TreeItemCollapsibleState.None, "separator");
        items.push(separator3Item);
        // Info Section
        const versionItem = new AnalyzerTreeItem("About", "Version and build info", vscode.TreeItemCollapsibleState.None, "version");
        versionItem.command = {
            command: "logScoutAnalyzer.showVersion",
            title: "Show Version",
        };
        versionItem.iconPath = new vscode.ThemeIcon("info");
        items.push(versionItem);
        return items;
    }
}
exports.AnalyzerTreeProvider = AnalyzerTreeProvider;
class AnalyzerTreeItem extends vscode.TreeItem {
    constructor(label, description, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
    }
}
exports.AnalyzerTreeItem = AnalyzerTreeItem;
//# sourceMappingURL=analyzerTreeProvider.js.map