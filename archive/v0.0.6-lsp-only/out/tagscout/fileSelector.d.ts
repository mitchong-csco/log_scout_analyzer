import * as vscode from 'vscode';
import { TagScoutAnalyzerProvider } from './analyzerTreeProvider';
export declare class FileSelector {
    private context;
    private treeProvider;
    constructor(context: vscode.ExtensionContext, treeProvider: TagScoutAnalyzerProvider);
    selectFile(): Promise<void>;
    setFile(filePath: string): Promise<void>;
    changeFile(): Promise<void>;
    handleFileDrop(filePath: string): Promise<void>;
    loadPersistedFile(): Promise<void>;
    getCurrentFile(): string | null;
    clearFile(): void;
}
