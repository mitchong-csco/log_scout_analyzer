import * as vscode from "vscode";

export interface AnnotatedLine {
  line: number;
  severity: "error" | "warning" | "info" | "debug";
  message: string;
  matchedText: string;
  context: string;
  timestamp?: Date;
  category?: string;
  pattern?: string;
  patternId?: string;
  fileName?: string;
  // New structured fields from LSP (snake_case standard)
  template?: string; // Raw template with {{ FIELD }} placeholders
  merged_template?: string; // Template with field values substituted
  extracted_parameters?: Array<{ name: string; value: string }>; // Structured parameters from log
  pattern_regex?: string; // Regex pattern (for debugging/pattern creation)
  log_line?: string; // Full original log line (citation)
}

/**
 * GutterDecorator - Manages gutter icons and hover tooltips for annotated log lines
 */
export class GutterDecorator {
  private errorDecoration: vscode.TextEditorDecorationType;
  private warningDecoration: vscode.TextEditorDecorationType;
  private infoDecoration: vscode.TextEditorDecorationType;
  private debugDecoration: vscode.TextEditorDecorationType;
  private hoverProvider: vscode.Disposable | undefined;
  private annotatedLines: Map<string, AnnotatedLine[]> = new Map();
  private pendingUpdates: Map<
    string,
    { editor: vscode.TextEditor; annotations: AnnotatedLine[] }
  > = new Map();
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Create decoration types for gutter icons
    this.errorDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.createGutterIcon("🔴"),
      gutterIconSize: "contain",
    });

    this.warningDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.createGutterIcon("🟡"),
      gutterIconSize: "contain",
    });

    this.infoDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.createGutterIcon("🔵"),
      gutterIconSize: "contain",
    });

    this.debugDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: this.createGutterIcon("🟣"),
      gutterIconSize: "contain",
    });

    // Register hover provider
    this.registerHoverProvider();
  }

  /**
   * Create a data URI for gutter icon with emoji
   */
  private createGutterIcon(emoji: string): vscode.Uri {
    // Create SVG with emoji
    const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <text x="0" y="14" font-size="14" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji">${emoji}</text>
            </svg>
        `;
    return vscode.Uri.parse(
      `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    );
  }

  /**
   * Register hover provider for showing tooltips
   */
  private registerHoverProvider(): void {
    this.hoverProvider = vscode.languages.registerHoverProvider(
      { scheme: "file" },
      {
        provideHover: (
          document: vscode.TextDocument,
          position: vscode.Position,
        ): vscode.Hover | undefined => {
          const uri = document.uri.toString();
          const lines = this.annotatedLines.get(uri);

          if (!lines) {
            return undefined;
          }

          // Find annotation for this line
          const annotation = lines.find((a) => a.line === position.line);

          if (!annotation) {
            return undefined;
          }

          return this.createHoverTooltip(annotation, document);
        },
      },
    );
  }

  /**
   * Create hover tooltip content
   */
  private createHoverTooltip(
    annotation: AnnotatedLine,
    _document: vscode.TextDocument,
  ): vscode.Hover {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Build header line: Category (left) | severity badge + file icon + line (right)
    const category = annotation.category || "";

    // Create severity badge with color
    const severityColors: { [key: string]: string } = {
      error: "#f48771",
      warning: "#cca700",
      info: "#75beff",
      debug: "#b5b5b5",
    };
    const severityColor =
      severityColors[annotation.severity.toLowerCase()] || "#b5b5b5";
    const severityBadge = `<span style="background-color: ${severityColor}; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${annotation.severity}</span>`;

    // Build right side with file icon and line number
    let rightSide = severityBadge;
    if (annotation.fileName) {
      rightSide += ` 📄 ${annotation.fileName} line: ${annotation.line + 1}`;
    }

    // Use HTML for left/right justification
    markdown.appendMarkdown(
      `<div style="display: flex; justify-content: space-between; align-items: center;"><span>${category}</span><span>${rightSide}</span></div>\n\n`,
    );
    markdown.appendMarkdown(`---\n\n`);

    // Show the merged template (template with values substituted) or fall back to matched text
    const displayText =
      annotation.merged_template ||
      annotation.matchedText ||
      annotation.message;
    markdown.appendMarkdown(`${displayText}\n\n`);

    // Add pattern ID as clickable link below message
    if (annotation.patternId) {
      const encodedId = encodeURIComponent(
        JSON.stringify([annotation.patternId]),
      );
      markdown.appendMarkdown(
        `Pattern: [(${annotation.patternId})](command:logScoutAnalyzer.showPatternById?${encodedId})\n\n`,
      );
    }

    markdown.appendMarkdown(`---\n\n`);
    // Show the actual raw log line from the file as citation/evidence
    markdown.appendCodeblock(annotation.context, "log");

    return new vscode.Hover(markdown);
  }

  /**
   * Update decorations for a specific editor
   */
  public updateDecorations(
    editor: vscode.TextEditor,
    annotations: AnnotatedLine[],
  ): void {
    const uri = editor.document.uri.toString();

    // Store annotations for hover provider
    this.annotatedLines.set(uri, annotations);

    // Group annotations by severity
    const errorRanges: vscode.DecorationOptions[] = [];
    const warningRanges: vscode.DecorationOptions[] = [];
    const infoRanges: vscode.DecorationOptions[] = [];
    const debugRanges: vscode.DecorationOptions[] = [];

    annotations.forEach((annotation) => {
      const line = editor.document.lineAt(annotation.line);
      const range = line.range;

      const decorationOption: vscode.DecorationOptions = {
        range,
        hoverMessage: annotation.merged_template || annotation.message, // Use merged template (annotation) over fallback
      };

      switch (annotation.severity) {
        case "error":
          errorRanges.push(decorationOption);
          break;
        case "warning":
          warningRanges.push(decorationOption);
          break;
        case "info":
          infoRanges.push(decorationOption);
          break;
        case "debug":
          debugRanges.push(decorationOption);
          break;
      }
    });

    // Apply decorations
    editor.setDecorations(this.errorDecoration, errorRanges);
    editor.setDecorations(this.warningDecoration, warningRanges);
    editor.setDecorations(this.infoDecoration, infoRanges);
    editor.setDecorations(this.debugDecoration, debugRanges);
  }

  /**
   * Clear all decorations for a specific editor
   */
  public clearDecorations(editor: vscode.TextEditor): void {
    const uri = editor.document.uri.toString();

    // Clear any pending updates
    const existingTimeout = this.updateTimeouts.get(uri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.updateTimeouts.delete(uri);
    }
    this.pendingUpdates.delete(uri);
    this.annotatedLines.delete(uri);

    editor.setDecorations(this.errorDecoration, []);
    editor.setDecorations(this.warningDecoration, []);
    editor.setDecorations(this.infoDecoration, []);
    editor.setDecorations(this.debugDecoration, []);
  }

  /**
   * Clear all decorations across all documents
   */
  public clearAll(): void {
    // Clear all pending timeouts
    this.updateTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.updateTimeouts.clear();
    this.pendingUpdates.clear();
    this.annotatedLines.clear();

    // Clear decorations in all visible editors
    vscode.window.visibleTextEditors.forEach((editor) => {
      editor.setDecorations(this.errorDecoration, []);
      editor.setDecorations(this.warningDecoration, []);
      editor.setDecorations(this.infoDecoration, []);
      editor.setDecorations(this.debugDecoration, []);
    });
  }

  /**
   * Get annotations for a specific document
   */
  public getAnnotations(uri: string): AnnotatedLine[] | undefined {
    return this.annotatedLines.get(uri);
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clear all pending timeouts
    this.updateTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.updateTimeouts.clear();
    this.pendingUpdates.clear();

    this.errorDecoration.dispose();
    this.warningDecoration.dispose();
    this.infoDecoration.dispose();
    this.debugDecoration.dispose();

    if (this.hoverProvider) {
      this.hoverProvider.dispose();
    }
  }
}
