import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AnalysisResults {
    totalMatches: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    timeRange: {
        from: Date;
        to: Date;
    };
    matches: LogMatch[];
    clientInfo?: ClientInfo;
    configFiles?: string[];
}

export interface LogMatch {
    timestamp: Date;
    severity: 'error' | 'warning' | 'info';
    message: string;
    pattern: {
        id: string;
        name: string;
        category: string;
    };
    file: string;
    lineNumber: number;
    rawLine: string;
}

export interface ClientInfo {
    product: string;
    version: string;
    user?: string;
    device?: string;
}

export class TagScoutAnalyzerProvider implements vscode.TreeDataProvider<AnalyzerItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<AnalyzerItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private currentFile: string | null = null;
    private analysisInProgress: boolean = false;
    private lastResults: AnalysisResults | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AnalyzerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AnalyzerItem): AnalyzerItem[] {
        if (!element) {
            const items: AnalyzerItem[] = [];

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

    setCurrentFile(filePath: string): void {
        this.currentFile = filePath;
        this.refresh();
    }

    getCurrentFile(): string | null {
        return this.currentFile;
    }

    setAnalysisInProgress(inProgress: boolean): void {
        this.analysisInProgress = inProgress;
        this.refresh();
    }

    setLastResults(results: AnalysisResults): void {
        this.lastResults = results;
        this.refresh();
    }

    getLastResults(): AnalysisResults | null {
        return this.lastResults;
    }
}

// Base tree item class
class AnalyzerItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        contextValue?: string
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
    }
}

// Section header item (non-clickable)
class SectionHeaderItem extends AnalyzerItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-folder');
        this.description = '';
        this.contextValue = 'sectionHeader';
    }
}

// File selection item
class FileSelectionItem extends AnalyzerItem {
    constructor(currentFile: string | null) {
        const label = currentFile ? path.basename(currentFile) : 'No file selected';
        super(label, vscode.TreeItemCollapsibleState.None, currentFile ? 'fileSelected' : 'noFile');

        if (currentFile) {
            this.tooltip = currentFile;
            this.iconPath = new vscode.ThemeIcon('file-zip');

            // Show file size if exists
            try {
                const stats = fs.statSync(currentFile);
                this.description = this.formatFileSize(stats.size);
            } catch (e) {
                this.description = 'File not found';
            }

            // Add command to change file
            this.command = {
                command: 'tagscout.changeFile',
                title: 'Change File'
            };
        } else {
            this.description = 'Click to select';
            this.iconPath = new vscode.ThemeIcon('folder-opened');
            this.command = {
                command: 'tagscout.selectFile',
                title: 'Select File'
            };
        }
    }

    private formatFileSize(bytes: number): string {
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
    constructor(results: AnalysisResults) {
        super('✅ Analysis Complete', vscode.TreeItemCollapsibleState.None, 'resultsAvailable');
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        this.description = `${results.totalMatches} matches`;
        this.tooltip = 'Click to view full results';
    }
}

// Error count item
class ErrorCountItem extends AnalyzerItem {
    constructor(count: number) {
        super(`Errors: ${count}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
        this.description = count > 0 ? '⚠️' : '✓';
    }
}

// Warning count item
class WarningCountItem extends AnalyzerItem {
    constructor(count: number) {
        super(`Warnings: ${count}`, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
        this.description = count > 0 ? '!' : '✓';
    }
}

// Info count item
class InfoCountItem extends AnalyzerItem {
    constructor(count: number) {
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
