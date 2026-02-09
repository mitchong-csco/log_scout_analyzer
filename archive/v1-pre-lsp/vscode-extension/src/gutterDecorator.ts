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
                    const annotation = lines.find(
                        (a) => a.line === position.line,
                    );

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
        document: vscode.TextDocument,
    ): vscode.Hover {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;

        // Severity icon and header
        const severityIcon =
            annotation.severity === "error"
                ? "🔴"
                : annotation.severity === "warning"
                  ? "🟡"
                  : annotation.severity === "info"
                    ? "🔵"
                    : "🟣";

        markdown.appendMarkdown(
            `### ${severityIcon} ${annotation.severity.toUpperCase()} - Line ${annotation.line + 1}\n\n`,
        );

        // Category
        if (annotation.category) {
            markdown.appendMarkdown(
                `**Category:** \`${annotation.category}\`\n\n`,
            );
        }

        // Pattern
        if (annotation.pattern) {
            markdown.appendMarkdown(`**Pattern:** \`${annotation.pattern}\`\n\n`);
        }

        // Timestamp
        if (annotation.timestamp) {
            markdown.appendMarkdown(
                `**Timestamp:** ${annotation.timestamp.toLocaleString()}\n\n`,
            );
        }

        // Message
        markdown.appendMarkdown(`**Message:** ${annotation.message}\n\n`);

        // Matched text
        markdown.appendMarkdown("---\n\n");
        markdown.appendMarkdown("**Matched Text:**\n```\n");
        markdown.appendMarkdown(annotation.matchedText);
        markdown.appendMarkdown("\n```\n\n");

        // Context (surrounding lines)
        if (annotation.context) {
            markdown.appendMarkdown("**Context:**\n```\n");
            const contextLines = annotation.context.split("\n");
            const targetLineIndex = Math.floor(contextLines.length / 2);

            contextLines.forEach((line, idx) => {
                if (idx === targetLineIndex) {
                    markdown.appendMarkdown(`→ ${line}\n`);
                } else {
                    markdown.appendMarkdown(`  ${line}\n`);
                }
            });
            markdown.appendMarkdown("```\n\n");
        }

        // Command links
        const jumpCommand = `[Jump to Definition](command:revealLine?${JSON.stringify({ lineNumber: annotation.line, at: "center" })})`;
        const copyCommand = `[Copy](command:editor.action.clipboardCopyAction)`;

        markdown.appendMarkdown(`${jumpCommand} | ${copyCommand}`);

        // Create hover range (entire line)
        const lineRange = document.lineAt(annotation.line).range;

        return new vscode.Hover(markdown, lineRange);
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
                hoverMessage: `${annotation.severity.toUpperCase()}: ${annotation.message}`,
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
        this.annotatedLines.clear();

        // Clear decorations in all visible editors
        vscode.window.visibleTextEditors.forEach((editor) => {
            this.clearDecorations(editor);
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
        this.errorDecoration.dispose();
        this.warningDecoration.dispose();
        this.infoDecoration.dispose();
        this.debugDecoration.dispose();

        if (this.hoverProvider) {
            this.hoverProvider.dispose();
        }

        this.annotatedLines.clear();
    }
}
