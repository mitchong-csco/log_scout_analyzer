import * as vscode from 'vscode';
import { AnalysisResults } from './analyzerTreeProvider';
export declare class AnalysisPanel {
    static currentPanel: AnalysisPanel | undefined;
    private readonly _panel;
    private _disposables;
    private _results;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, results: AnalysisResults): void;
    private _update;
    private _handleMessage;
    private _getHtmlContent;
    private _generateClientInfoHtml;
    private _generateTimelineHtml;
    private _formatTimestamp;
    private _formatDateTime;
    private _escape;
    private _getNonce;
    dispose(): void;
}
