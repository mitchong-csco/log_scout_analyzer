"use strict";
/**
 * Utility functions for converting LSP diagnostics to extension data structures
 *
 * The LSP server provides diagnostics with this structure:
 * {
 *   message: string (merged_template)
 *   severity: 1-4
 *   code: string (pattern_id)
 *   range: {start, end}
 *   data: {
 *     template: string
 *     merged_template: string
 *     log_line: string
 *     extracted_parameters: [{name, value}]
 *     pattern_id: string
 *     pattern_name: string
 *     category: string
 *     log_level: string
 *     pattern_regex: string
 *     // ... all TagScout fields
 *   }
 * }
 */
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
exports.convertDiagnosticSeverity = convertDiagnosticSeverity;
exports.parametersToDict = parametersToDict;
exports.convertLSPDiagnosticToResultItem = convertLSPDiagnosticToResultItem;
exports.convertLSPDiagnosticsToResultItems = convertLSPDiagnosticsToResultItems;
exports.logDiagnosticData = logDiagnosticData;
exports.isValidLSPDiagnostic = isValidLSPDiagnostic;
const vscode = __importStar(require("vscode"));
/**
 * Convert VSCode diagnostic severity to string format
 */
function convertDiagnosticSeverity(severity) {
    switch (severity) {
        case vscode.DiagnosticSeverity.Error:
            return "error";
        case vscode.DiagnosticSeverity.Warning:
            return "warning";
        case vscode.DiagnosticSeverity.Information:
            return "info";
        case vscode.DiagnosticSeverity.Hint:
            return "debug";
        default:
            return "info";
    }
}
/**
 * Convert extracted_parameters array to legacy extractedFields dict
 * For backward compatibility
 */
function parametersToDict(parameters) {
    if (!parameters || parameters.length === 0) {
        return undefined;
    }
    const result = {};
    for (const param of parameters) {
        result[param.name] = param.value;
    }
    return result;
}
/**
 * Convert LSP diagnostic to ResultItem
 *
 * This bridges between the LSP server's diagnostic format and the extension's ResultItem format
 */
function convertLSPDiagnosticToResultItem(diagnostic, uri) {
    // Extract LSP diagnostic data
    const data = diagnostic.data || {};
    // Get basic info from diagnostic
    const severity = convertDiagnosticSeverity(diagnostic.severity);
    const message = diagnostic.message.split("\n")[0]; // First line of message
    // Get line and column from range
    const line = diagnostic.range.start.line;
    const column = diagnostic.range.start.character;
    // Build ResultItem with both new and old field names for compatibility
    const result = {
        // Required LSP fields
        severity,
        line,
        column,
        message,
        matchedText: data.matched_text || message,
        context: data.log_line || message,
        uri,
        // === LSP Server Fields (snake_case standard) ===
        template: data.template,
        merged_template: data.merged_template,
        log_line: data.log_line,
        extracted_parameters: data.extracted_parameters,
        pattern_id: data.pattern_id || diagnostic.code,
        pattern_regex: data.pattern_regex,
        log_level: data.log_level,
        // === Common Fields ===
        patternId: data.pattern_id || diagnostic.code,
        patternName: data.pattern_name,
        category: data.category,
        timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
        // === Complete Data ===
        diagnosticData: data,
    };
    return result;
}
/**
 * Convert array of LSP diagnostics to ResultItems
 */
function convertLSPDiagnosticsToResultItems(diagnostics, uri) {
    return diagnostics
        .map((diagnostic) => convertLSPDiagnosticToResultItem(diagnostic, uri))
        .filter((item) => item !== null);
}
/**
 * Log diagnostic data for debugging
 */
function logDiagnosticData(diagnostic, outputChannel) {
    const data = diagnostic.data;
    const lines = [
        "=== LSP Diagnostic Data ===",
        `Message: ${diagnostic.message}`,
        `Code: ${diagnostic.code}`,
        `Severity: ${convertDiagnosticSeverity(diagnostic.severity)}`,
        `Range: Line ${diagnostic.range.start.line}, Col ${diagnostic.range.start.character}`,
        "",
        "LSP Data Fields:",
        `  template: ${data.template?.substring(0, 80)}${(data.template?.length || 0) > 80 ? "..." : ""}`,
        `  merged_template: ${data.merged_template?.substring(0, 80)}${(data.merged_template?.length || 0) > 80 ? "..." : ""}`,
        `  pattern_id: ${data.pattern_id}`,
        `  pattern_name: ${data.pattern_name}`,
        `  category: ${data.category}`,
        `  log_level: ${data.log_level}`,
        `  extracted_parameters: ${data.extracted_parameters?.length || 0} items`,
        ...(data.extracted_parameters
            ? data.extracted_parameters.map((p) => `    - ${p.name}: ${p.value}`)
            : []),
        `  log_line: ${data.log_line?.substring(0, 100)}${(data.log_line?.length || 0) > 100 ? "..." : ""}`,
    ];
    const output = lines.join("\n");
    if (outputChannel) {
        outputChannel.appendLine(output);
    }
    else {
        console.log(output);
    }
}
/**
 * Validate that LSP diagnostic has required fields
 */
function isValidLSPDiagnostic(diagnostic) {
    const data = diagnostic.data;
    // Must have at least one of these fields to be valid
    return !!(data.template ||
        data.merged_template ||
        data.log_line ||
        data.pattern_id);
}
//# sourceMappingURL=lspDiagnosticConverter.js.map