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
exports.DiagnosticsProvider = void 0;
const vscode = __importStar(require("vscode"));
class DiagnosticsProvider {
    constructor(diagnosticCollection, patternEngine, outputChannel, onAnalysisComplete) {
        this.diagnosticCollection = diagnosticCollection;
        this.patternEngine = patternEngine;
        this.outputChannel = outputChannel;
        this.onAnalysisComplete = onAnalysisComplete;
    }
    analyzeDocument(document) {
        // Clear existing timeout
        if (this.analyzeTimeout) {
            clearTimeout(this.analyzeTimeout);
        }
        // Debounce analysis
        this.analyzeTimeout = setTimeout(() => {
            this.performAnalysis(document);
        }, 300);
    }
    performAnalysis(document) {
        const diagnostics = [];
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
                const errorCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length;
                const warningCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Warning).length;
                const infoCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Information).length;
                const debugCount = diagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Hint).length;
                this.outputChannel.appendLine(`  Found ${diagnostics.length} issue(s):`);
                if (debugCount > 0)
                    this.outputChannel.appendLine(`    🟣 ${debugCount} debug`);
                if (infoCount > 0)
                    this.outputChannel.appendLine(`    🔵 ${infoCount} info`);
                if (warningCount > 0)
                    this.outputChannel.appendLine(`    🟡 ${warningCount} warning(s)`);
                if (errorCount > 0)
                    this.outputChannel.appendLine(`    🔴 ${errorCount} error(s)`);
            }
            console.log(`Found ${diagnostics.length} issues in ${document.fileName}`);
        }
        catch (error) {
            console.error("Error analyzing document:", error);
            if (this.outputChannel) {
                this.outputChannel.appendLine(`  ✗ Error during analysis: ${error}`);
            }
        }
    }
    createDiagnostic(document, match) {
        try {
            const line = document.lineAt(match.line);
            const range = new vscode.Range(match.line, match.column, match.line, match.column + match.length);
            let severity;
            let message;
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
            }
            else {
                message += `\n${context}`;
            }
            const diagnostic = new vscode.Diagnostic(range, message, severity);
            diagnostic.source = "Log Scout Analyzer";
            diagnostic.code = match.pattern.severity;
            // Add related information if available
            if (match.pattern.message) {
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(new vscode.Location(document.uri, range), match.pattern.message),
                ];
            }
            return diagnostic;
        }
        catch (error) {
            console.error("Error creating diagnostic:", error);
            return null;
        }
    }
    clear() {
        this.diagnosticCollection.clear();
    }
    dispose() {
        if (this.analyzeTimeout) {
            clearTimeout(this.analyzeTimeout);
        }
        this.diagnosticCollection.dispose();
    }
}
exports.DiagnosticsProvider = DiagnosticsProvider;
//# sourceMappingURL=diagnosticsProvider.js.map