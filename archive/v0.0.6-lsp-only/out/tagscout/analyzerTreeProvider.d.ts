import * as vscode from 'vscode';
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
export declare class TagScoutAnalyzerProvider implements vscode.TreeDataProvider<AnalyzerItem> {
    private context;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<void | AnalyzerItem | undefined>;
    private currentFile;
    private analysisInProgress;
    private lastResults;
    constructor(context: vscode.ExtensionContext);
    refresh(): void;
    getTreeItem(element: AnalyzerItem): vscode.TreeItem;
    getChildren(element?: AnalyzerItem): AnalyzerItem[];
    setCurrentFile(filePath: string): void;
    getCurrentFile(): string | null;
    setAnalysisInProgress(inProgress: boolean): void;
    setLastResults(results: AnalysisResults): void;
    getLastResults(): AnalysisResults | null;
}
declare class AnalyzerItem extends vscode.TreeItem {
    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, contextValue?: string);
}
export {};
