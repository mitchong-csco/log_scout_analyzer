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
  private pendingUpdates: Map<string, { editor: vscode.TextEditor; annotations: AnnotatedLine[] }> = new Map();
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
    markdown.supportHtml = false;

    // Just show the message (already contains parameter values from LSP server)
    markdown.appendMarkdown(annotation.message);

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
                hoverMessage: annotation.message, // Just the message with parameter values
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
