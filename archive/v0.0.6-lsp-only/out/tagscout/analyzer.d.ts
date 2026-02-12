import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { AnalysisResults } from "./analyzerTreeProvider";
export declare class TagScoutAnalyzer {
    private tempDir;
    private lspClient;
    constructor(lspClient: LanguageClient);
    /**
     * Analyze a log file or archive using TagScout patterns
     */
    analyze(filePath: string, progress: vscode.Progress<{
        message?: string;
        increment?: number;
    }>, token: vscode.CancellationToken): Promise<AnalysisResults>;
    /**
     * Extract files from archive or return single file
     */
    private extractFiles;
    /**
     * Extract ZIP archive
     */
    private extractZip;
    /**
     * Find all log files in a directory recursively
     */
    private findLogFiles;
    /**
     * Detect product type from log content
     */
    private detectProduct;
    /**
     * Analyze log files with pattern matching
     */
    private analyzeFiles;
    /**
     * Analyze a single log file using LSP with TagScout MongoDB patterns
     */
    private analyzeFile;
    /**
     * Convert LSP diagnostic severity to string
     */
    private diagnosticSeverityToString;
    /**
     * Categorize based on severity
     */
    private categorizeFromSeverity;
    /**
     * Extract timestamp from log line
     */
    private extractTimestamp;
    /**
     * Extract client information from logs
     */
    private extractClientInfo;
    /**
     * Find configuration files
     */
    private findConfigFiles;
    /**
     * Build final analysis results
     */
    private buildResults;
    /**
     * Cleanup temporary files
     */
    private cleanup;
}
