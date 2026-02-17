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

import * as vscode from "vscode";
import { ResultItem } from "./resultsTreeProvider";

/**
 * Convert VSCode diagnostic severity to string format
 */
export function convertDiagnosticSeverity(
  severity: vscode.DiagnosticSeverity | undefined,
): "error" | "warning" | "info" | "debug" {
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
export function parametersToDict(
  parameters?: Array<{ name: string; value: string }>,
): Record<string, string> | undefined {
  if (!parameters || parameters.length === 0) {
    return undefined;
  }

  const result: Record<string, string> = {};
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
export function convertLSPDiagnosticToResultItem(
  diagnostic: vscode.Diagnostic,
  uri: vscode.Uri,
): ResultItem {
  // Extract LSP diagnostic data
  const data = ((diagnostic as any).data as Record<string, any>) || {};

  // Get basic info from diagnostic
  const severity = convertDiagnosticSeverity(diagnostic.severity);
  const message = diagnostic.message.split("\n")[0]; // First line of message

  // Get line and column from range
  const line = diagnostic.range.start.line;
  const column = diagnostic.range.start.character;

  // Build ResultItem with both new and old field names for compatibility
  const result: ResultItem = {
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
    pattern_id: data.pattern_id || (diagnostic.code as string),
    pattern_regex: data.pattern_regex,
    log_level: data.log_level,

    // === Common Fields ===
    patternId: data.pattern_id || (diagnostic.code as string),
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
export function convertLSPDiagnosticsToResultItems(
  diagnostics: vscode.Diagnostic[],
  uri: vscode.Uri,
): ResultItem[] {
  return diagnostics
    .map((diagnostic) => convertLSPDiagnosticToResultItem(diagnostic, uri))
    .filter((item) => item !== null) as ResultItem[];
}

/**
 * Log diagnostic data for debugging
 */
export function logDiagnosticData(
  diagnostic: vscode.Diagnostic,
  outputChannel?: vscode.OutputChannel,
): void {
  const data = (diagnostic as any).data as Record<string, any>;

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
      ? data.extracted_parameters.map((p: any) => `    - ${p.name}: ${p.value}`)
      : []),
    `  log_line: ${data.log_line?.substring(0, 100)}${(data.log_line?.length || 0) > 100 ? "..." : ""}`,
  ];

  const output = lines.join("\n");

  if (outputChannel) {
    outputChannel.appendLine(output);
  } else {
    console.log(output);
  }
}

/**
 * Validate that LSP diagnostic has required fields
 */
export function isValidLSPDiagnostic(diagnostic: vscode.Diagnostic): boolean {
  const data = (diagnostic as any).data as Record<string, any>;

  // Must have at least one of these fields to be valid
  return !!(
    data.template ||
    data.merged_template ||
    data.log_line ||
    data.pattern_id
  );
}
