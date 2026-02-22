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
exports.AnalyzerTreeItem = exports.AnalyzerTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
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
        const items = [];
        // Analysis Commands
        const analyzeCurrentFile = new AnalyzerTreeItem("Analyze Current File", "Run analysis on active file", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        analyzeCurrentFile.iconPath = new vscode.ThemeIcon("file-code");
        analyzeCurrentFile.command = {
            command: "logScoutAnalyzer.analyzeCurrentFile",
            title: "Analyze Current File",
        };
        items.push(analyzeCurrentFile);
        const analyzeDirectory = new AnalyzerTreeItem("Analyze Directory", "Analyze all files in a directory", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        analyzeDirectory.iconPath = new vscode.ThemeIcon("folder");
        analyzeDirectory.command = {
            command: "logScoutAnalyzer.analyzeDirectory",
            title: "Analyze Directory",
        };
        items.push(analyzeDirectory);
        const analyzeRecursive = new AnalyzerTreeItem("Analyze Recursively", "Analyze directory and subdirectories", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        analyzeRecursive.iconPath = new vscode.ThemeIcon("folder-library");
        analyzeRecursive.command = {
            command: "logScoutAnalyzer.analyzeDirectoryRecursive",
            title: "Analyze Recursively",
        };
        items.push(analyzeRecursive);
        const clearResults = new AnalyzerTreeItem("Clear Results", "Clear all analysis results", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        clearResults.iconPath = new vscode.ThemeIcon("clear-all");
        clearResults.command = {
            command: "logScoutAnalyzer.clearResults",
            title: "Clear Results",
        };
        items.push(clearResults);
        const exportResults = new AnalyzerTreeItem("Export Results", "Export results to JSON/CSV", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        exportResults.iconPath = new vscode.ThemeIcon("export");
        exportResults.command = {
            command: "logScoutAnalyzer.exportResults",
            title: "Export Results",
        };
        items.push(exportResults);
        const showConsole = new AnalyzerTreeItem("Show Console", "Open Log Scout console", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        showConsole.iconPath = new vscode.ThemeIcon("output");
        showConsole.command = {
            command: "logScoutAnalyzer.showConsole",
            title: "Show Console",
        };
        items.push(showConsole);
        const toggleConsole = new AnalyzerTreeItem("Toggle Console Location", "Move console between panel/editor", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        toggleConsole.iconPath = new vscode.ThemeIcon("move");
        toggleConsole.command = {
            command: "logScoutAnalyzer.toggleConsoleLocation",
            title: "Toggle Console Location",
        };
        items.push(toggleConsole);
        const showPatterns = new AnalyzerTreeItem("Show Pattern Library", "View all available patterns", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        showPatterns.iconPath = new vscode.ThemeIcon("book");
        showPatterns.command = {
            command: "logScoutAnalyzer.showPatterns",
            title: "Show Pattern Library",
        };
        items.push(showPatterns);
        const timelineViz = new AnalyzerTreeItem("Timeline Visualization", "Show events over time", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        timelineViz.iconPath = new vscode.ThemeIcon("graph-line");
        timelineViz.command = {
            command: "logScoutAnalyzer.showTimelineVisualization",
            title: "Timeline Visualization",
        };
        items.push(timelineViz);
        const sipLadder = new AnalyzerTreeItem("SIP Ladder Diagram", "Show SIP call flow diagram", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        sipLadder.iconPath = new vscode.ThemeIcon("symbol-method");
        sipLadder.command = {
            command: "logScoutAnalyzer.showSIPLadderDiagram",
            title: "SIP Ladder Diagram",
        };
        items.push(sipLadder);
        const about = new AnalyzerTreeItem("About", "Show Log Scout version info", vscode.TreeItemCollapsibleState.None, "analyzeCommand");
        about.iconPath = new vscode.ThemeIcon("info");
        about.command = {
            command: "logScoutAnalyzer.showAbout",
            title: "About",
        };
        items.push(about);
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