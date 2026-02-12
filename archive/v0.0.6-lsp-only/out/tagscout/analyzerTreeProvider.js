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
exports.TagScoutAnalyzerProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class TagScoutAnalyzerProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentFile = null;
        this.analysisInProgress = false;
        this.lastResults = null;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            const items = [];
            // File selection section
            items.push(new SectionHeaderItem('File Selection'));
            items.push(new FileSelectionItem(this.currentFile));
            // Analyze button (only if file selected and not analyzing)
            if (this.currentFile && !this.analysisInProgress) {
                items.push(new AnalyzeButtonItem());
            }
            // Progress indicator
            if (this.analysisInProgress) {
                items.push(new ProgressItem());
            }
            // Results summary (if available)
            if (this.lastResults && !this.analysisInProgress) {
                items.push(new SectionHeaderItem('Analysis Results'));
                items.push(new ResultsSummaryItem(this.lastResults));
                items.push(new ErrorCountItem(this.lastResults.errorCount));
                items.push(new WarningCountItem(this.lastResults.warningCount));
                items.push(new InfoCountItem(this.lastResults.infoCount));
                items.push(new ViewResultsButtonItem());
            }
            return items;
        }
        return [];
    }
    setCurrentFile(filePath) {
        this.currentFile = filePath;
        this.refresh();
    }
    getCurrentFile() {
        return this.currentFile;
    }
    setAnalysisInProgress(inProgress) {
        this.analysisInProgress = inProgress;
        this.refresh();
    }
    setLastResults(results) {
        this.lastResults = results;
        this.refresh();
    }
    getLastResults() {
        return this.lastResults;
    }
}
exports.TagScoutAnalyzerProvider = TagScoutAnalyzerProvider;
// Base tree item class
class AnalyzerItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
    }
}
// Section header item (non-clickable)
class SectionHeaderItem extends AnalyzerItem {
    constructor(label) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-folder');
        this.description = '';
        this.contextValue = 'sectionHeader';
    }
}
// File selection item
class FileSelectionItem extends AnalyzerItem {
    constructor(currentFile) {
        const label = currentFile ? path.basename(currentFile) : 'No file selected';
        super(label, vscode.TreeItemCollapsibleState.None, currentFile ? 'fileSelected' : 'noFile');
        if (currentFile) {
            this.tooltip = currentFile;
            this.iconPath = new vscode.ThemeIcon('file-zip');
            // Show file size if exists
            try {
                const stats = fs.statSync(currentFile);
                this.description = this.formatFileSize(stats.size);
            }
            catch (e) {
                this.description = 'File not found';
            }
            // Add command to change file
            this.command = {
                command: 'tagscout.changeFile',
                title: 'Change File'
            };
        }
        else {
            this.description = 'Click to select';
            this.iconPath = new vscode.ThemeIcon('folder-opened');
            this.command = {
                command: 'tagscout.selectFile',
                title: 'Select File'
            };
        }
    }
    formatFileSize(bytes) {
        const mb = bytes / (1024 * 1024);
        if (mb >= 1) {
            return `${mb.toFixed(1)} MB`;
        }
        const kb = bytes / 1024;
        return `${kb.toFixed(1)} KB`;
    }
}
// Analyze button item
class AnalyzeButtonItem extends AnalyzerItem {
    constructor() {
        super('▶ Analyze Now', vscode.TreeItemCollapsibleState.None, 'analyzeButton');
        this.iconPath = new vscode.ThemeIcon('play', new vscode.ThemeColor('charts.green'));
        this.command = {
            command: 'tagscout.analyzeFile',
            title: 'Analyze File'
        };
        this.tooltip = 'Click to start analysis';
    }
}
// Progress indicator item
class ProgressItem extends AnalyzerItem {
    constructor() {
        super('⏳ Analyzing...', vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('loading~spin');
        this.description = 'Please wait';
    }
}
// Results summary item
class ResultsSummaryItem extends AnalyzerItem {
    constructor(results) {
        super('✅ Analysis Complete', vscode.TreeItemCollapsibleState.None, 'resultsAvailable');
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        this.description = `${results.totalMatches} matches`;
        this.tooltip = 'Click to view full results';
    }
}
// Error count item
class ErrorCountItem extends AnalyzerItem {
    constructor(count) {
        super(`Errors: ${count}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        this.description = count > 0 ? '⚠️' : '✓';
    }
}
// Warning count item
class WarningCountItem extends AnalyzerItem {
    constructor(count) {
        super(`Warnings: ${count}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        this.description = count > 0 ? '!' : '✓';
    }
}
// Info count item
class InfoCountItem extends AnalyzerItem {
    constructor(count) {
        super(`Info: ${count}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.blue'));
    }
}
// View results button item
class ViewResultsButtonItem extends AnalyzerItem {
    constructor() {
        super('👁️ View Results', vscode.TreeItemCollapsibleState.None, 'viewResults');
        this.iconPath = new vscode.ThemeIcon('eye');
        this.command = {
            command: 'tagscout.viewResults',
            title: 'View Results'
        };
        this.tooltip = 'Open full results panel';
    }
}
//# sourceMappingURL=analyzerTreeProvider.js.map