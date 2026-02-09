import * as vscode from "vscode";
import { PatternEngine, PatternMatch } from "./patternEngine";

export class DiagnosticsProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private patternEngine: PatternEngine;
    private analyzeTimeout: NodeJS.Timeout | undefined;
    private outputChannel: vscode.OutputChannel | undefined;
    private onAnalysisComplete?: () => void;

    constructor(
        diagnosticCollection: vscode.DiagnosticCollection,
        patternEngine: PatternEngine,
        outputChannel?: vscode.OutputChannel,
        onAnalysisComplete?: () => void,
    ) {
        this.diagnosticCollection = diagnosticCollection;
        this.patternEngine = patternEngine;
        this.outputChannel = outputChannel;
        this.onAnalysisComplete = onAnalysisComplete;
    }

    public analyzeDocument(document: vscode.TextDocument): void {
        // Clear existing timeout
        if (this.analyzeTimeout) {
            clearTimeout(this.analyzeTimeout);
        }

        // Debounce analysis
        this.analyzeTimeout = setTimeout(() => {
            this.performAnalysis(document);
        }, 300);
    }

    private performAnalysis(document: vscode.TextDocument): void {
        const diagnostics: vscode.Diagnostic[] = [];

        try {
            const matches = this.patternEngine.analyzeDocument(document);

            for (const match of matches) {
                const diagnostic = this.createDiagnostic(document, match);
                if (diagnostic) {
                    diagnostics.push(diagnostic);
                }
            }

            this.diagnosticCollection.set(document.uri, diagnostics);

            // Trigger status bar update callback
            if (this.onAnalysisComplete) {
                this.onAnalysisComplete();
            }

            if (this.outputChannel) {
                const errorCount = diagnostics.filter(
                    (d) => d.severity === vscode.DiagnosticSeverity.Error,
                ).length;
                const warningCount = diagnostics.filter(
                    (d) => d.severity === vscode.DiagnosticSeverity.Warning,
                ).length;
                const infoCount = diagnostics.filter(
                    (d) => d.severity === vscode.DiagnosticSeverity.Information,
                ).length;
                const debugCount = diagnostics.filter(
                    (d) => d.severity === vscode.DiagnosticSeverity.Hint,
                ).length;

                this.outputChannel.appendLine(
                    `  Found ${diagnostics.length} issue(s):`,
                );
                if (debugCount > 0)
                    this.outputChannel.appendLine(`    🟣 ${debugCount} debug`);
                if (infoCount > 0)
                    this.outputChannel.appendLine(`    🔵 ${infoCount} info`);
                if (warningCount > 0)
                    this.outputChannel.appendLine(
                        `    🟡 ${warningCount} warning(s)`,
                    );
                if (errorCount > 0)
                    this.outputChannel.appendLine(
                        `    🔴 ${errorCount} error(s)`,
                    );
            }

            console.log(
                `Found ${diagnostics.length} issues in ${document.fileName}`,
            );
        } catch (error) {
            console.error("Error analyzing document:", error);
            if (this.outputChannel) {
                this.outputChannel.appendLine(
                    `  ✗ Error during analysis: ${error}`,
                );
            }
        }
    }

    private createDiagnostic(
        document: vscode.TextDocument,
        match: PatternMatch,
    ): vscode.Diagnostic | null {
        try {
            const line = document.lineAt(match.line);
            const range = new vscode.Range(
                match.line,
                match.column,
                match.line,
                match.column + match.length,
            );

            let severity: vscode.DiagnosticSeverity;
            let message: string;

            switch (match.pattern.severity) {
                case "error":
                    severity = vscode.DiagnosticSeverity.Error;
                    message = `Error detected: ${match.matchedText}`;
                    break;
                case "warning":
                    severity = vscode.DiagnosticSeverity.Warning;
                    message = `Warning detected: ${match.matchedText}`;
                    break;
                case "info":
                    severity = vscode.DiagnosticSeverity.Information;
                    message = `Info: ${match.matchedText}`;
                    break;
                case "debug":
                    severity = vscode.DiagnosticSeverity.Hint;
                    message = `Debug: ${match.matchedText}`;
                    break;
                default:
                    severity = vscode.DiagnosticSeverity.Information;
                    message = match.matchedText;
            }

            // Add context from the line
            const context = line.text.trim();
            if (context.length > 100) {
                message += `\n${context.substring(0, 100)}...`;
            } else {
                message += `\n${context}`;
            }

            const diagnostic = new vscode.Diagnostic(range, message, severity);

            diagnostic.source = "Log Scout Analyzer";
            diagnostic.code = match.pattern.severity;

            // Add related information if available
            if (match.pattern.message) {
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(document.uri, range),
                        match.pattern.message,
                    ),
                ];
            }

            return diagnostic;
        } catch (error) {
            console.error("Error creating diagnostic:", error);
            return null;
        }
    }

    public clear(): void {
        this.diagnosticCollection.clear();
    }

    public dispose(): void {
        if (this.analyzeTimeout) {
            clearTimeout(this.analyzeTimeout);
        }
        this.diagnosticCollection.dispose();
    }
}
