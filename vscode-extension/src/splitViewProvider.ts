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

interface SyncConfig {
    cursorSync: boolean;
    scrollSync: boolean;
    selectionSync: boolean;
    highlightSync: boolean;
}

/**
 * SplitViewProvider - Manages synchronized split view with annotated log
 */
export class SplitViewProvider implements vscode.TextDocumentContentProvider {
    private static instance: SplitViewProvider | undefined;
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    readonly onDidChange = this._onDidChange.event;

    private annotations: Map<string, AnnotatedLine[]> = new Map();
    private splitViewEditors: Map<string, vscode.TextEditor> = new Map();
    private originalEditors: Map<string, vscode.TextEditor> = new Map();

    // Sync subscriptions
    private cursorSyncDisposables: vscode.Disposable[] = [];
    private scrollSyncDisposables: vscode.Disposable[] = [];
    private selectionSyncDisposables: vscode.Disposable[] = [];
    private highlightSyncDisposables: vscode.Disposable[] = [];

    // Highlight decorations
    private hoverHighlight: vscode.TextEditorDecorationType;
    private syncHighlight: vscode.TextEditorDecorationType;

    private constructor() {
        // Create hover highlight decoration
        this.hoverHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor(
                "editor.hoverHighlightBackground",
            ),
            borderRadius: "3px",
        });

        // Create sync highlight decoration
        this.syncHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor(
                "editor.selectionBackground",
            ),
            border: "1px solid",
            borderColor: new vscode.ThemeColor("focusBorder"),
            isWholeLine: true,
        });
    }

    public static getInstance(): SplitViewProvider {
        if (!SplitViewProvider.instance) {
            SplitViewProvider.instance = new SplitViewProvider();
        }
        return SplitViewProvider.instance;
    }

    /**
     * Provide content for the split view document
     */
    provideTextDocumentContent(uri: vscode.Uri): string {
        const originalUri = this.decodeOriginalUri(uri);
        const annotations = this.annotations.get(originalUri);

        if (!annotations || annotations.length === 0) {
            return "# No annotations available\n\nRun analysis on the log file to see annotated view.";
        }

        return this.generateAnnotatedContent(originalUri, annotations);
    }

    /**
     * Generate annotated content for the split view
     */
    private generateAnnotatedContent(
        originalUri: string,
        annotations: AnnotatedLine[],
    ): string {
        const lines: string[] = [];

        // Try to get original document
        const doc = vscode.workspace.textDocuments.find(
            (d) => d.uri.toString() === originalUri,
        );

        if (!doc) {
            return "# Unable to load original document";
        }

        // Build annotation map for quick lookup
        const annotationMap = new Map<number, AnnotatedLine>();
        annotations.forEach((a) => annotationMap.set(a.line, a));

        // Generate annotated content line by line
        for (let i = 0; i < doc.lineCount; i++) {
            const originalLine = doc.lineAt(i).text;
            const annotation = annotationMap.get(i);

            if (annotation) {
                // Annotated line with rich formatting
                const icon = this.getSeverityIcon(annotation.severity);
                const badge = this.getSeverityBadge(annotation.severity);

                lines.push(
                    `${icon} ${badge} ${annotation.severity.toUpperCase()} | ${annotation.message}`,
                );

                if (annotation.category) {
                    lines.push(`   📂 Category: ${annotation.category}`);
                }

                if (annotation.timestamp) {
                    lines.push(
                        `   🕐 Timestamp: ${annotation.timestamp.toLocaleString()}`,
                    );
                }

                lines.push(`   📝 Original: ${originalLine}`);

                if (
                    annotation.matchedText &&
                    annotation.matchedText !== originalLine.trim()
                ) {
                    lines.push(`   🔍 Matched: ${annotation.matchedText}`);
                }

                lines.push(""); // Empty line for spacing
            } else {
                // Non-annotated line
                lines.push(`   ${originalLine}`);
            }
        }

        return lines.join("\n");
    }

    /**
     * Get severity icon emoji
     */
    private getSeverityIcon(severity: string): string {
        switch (severity) {
            case "error":
                return "🔴";
            case "warning":
                return "🟡";
            case "info":
                return "🔵";
            case "debug":
                return "🟣";
            default:
                return "⚪";
        }
    }

    /**
     * Get severity badge
     */
    private getSeverityBadge(severity: string): string {
        switch (severity) {
            case "error":
                return "[ERROR]";
            case "warning":
                return "[WARN ]";
            case "info":
                return "[INFO ]";
            case "debug":
                return "[DEBUG]";
            default:
                return "[     ]";
        }
    }

    /**
     * Open split view for a document with annotations
     */
    public async openSplitView(
        originalEditor: vscode.TextEditor,
        annotations: AnnotatedLine[],
    ): Promise<void> {
        const originalUri = originalEditor.document.uri.toString();

        // Store annotations
        this.annotations.set(originalUri, annotations);

        // Create split view URI
        const splitViewUri = this.createSplitViewUri(originalUri);

        // Open in the main editor window
        const splitViewEditor = await vscode.window.showTextDocument(
            splitViewUri,
            {
                viewColumn: vscode.ViewColumn.Active,
                preserveFocus: false,
                preview: false,
            },
        );

        // Store editor references
        this.originalEditors.set(originalUri, originalEditor);
        this.splitViewEditors.set(originalUri, splitViewEditor);

        // Set up synchronization
        await this.setupSync(originalUri);
    }

    /**
     * Set up all sync features based on configuration
     */
    private async setupSync(originalUri: string): Promise<void> {
        const config = this.getSyncConfig();

        // Clear existing sync subscriptions for this document
        this.clearSync(originalUri);

        const originalEditor = this.originalEditors.get(originalUri);
        const splitViewEditor = this.splitViewEditors.get(originalUri);

        if (!originalEditor || !splitViewEditor) {
            return;
        }

        // Cursor sync
        if (config.cursorSync) {
            this.setupCursorSync(originalEditor, splitViewEditor);
        }

        // Scroll sync
        if (config.scrollSync) {
            this.setupScrollSync(originalEditor, splitViewEditor);
        }

        // Selection sync
        if (config.selectionSync) {
            this.setupSelectionSync(originalEditor, splitViewEditor);
        }

        // Highlight sync
        if (config.highlightSync) {
            this.setupHighlightSync(originalEditor, splitViewEditor);
        }
    }

    /**
     * Set up cursor synchronization
     */
    private setupCursorSync(
        originalEditor: vscode.TextEditor,
        splitViewEditor: vscode.TextEditor,
    ): void {
        // Original -> Split View
        const disposable1 = vscode.window.onDidChangeTextEditorSelection(
            (e) => {
                if (e.textEditor === originalEditor) {
                    const line = e.selections[0].active.line;
                    const mappedLine = this.mapOriginalLineToSplitView(
                        originalEditor.document.uri.toString(),
                        line,
                    );

                    const position = new vscode.Position(mappedLine, 0);
                    splitViewEditor.selection = new vscode.Selection(
                        position,
                        position,
                    );
                    splitViewEditor.revealRange(
                        new vscode.Range(position, position),
                        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
                    );
                }
            },
        );

        // Split View -> Original
        const disposable2 = vscode.window.onDidChangeTextEditorSelection(
            (e) => {
                if (e.textEditor === splitViewEditor) {
                    const line = e.selections[0].active.line;
                    const mappedLine = this.mapSplitViewLineToOriginal(
                        originalEditor.document.uri.toString(),
                        line,
                    );

                    if (mappedLine !== -1) {
                        const position = new vscode.Position(mappedLine, 0);
                        originalEditor.selection = new vscode.Selection(
                            position,
                            position,
                        );
                        originalEditor.revealRange(
                            new vscode.Range(position, position),
                            vscode.TextEditorRevealType
                                .InCenterIfOutsideViewport,
                        );
                    }
                }
            },
        );

        this.cursorSyncDisposables.push(disposable1, disposable2);
    }

    /**
     * Set up scroll synchronization
     */
    private setupScrollSync(
        originalEditor: vscode.TextEditor,
        splitViewEditor: vscode.TextEditor,
    ): void {
        // Note: VS Code doesn't provide direct scroll events
        // We approximate with visible range changes
        const disposable1 = vscode.window.onDidChangeTextEditorVisibleRanges(
            (e) => {
                if (e.textEditor === originalEditor) {
                    const topLine = e.visibleRanges[0].start.line;
                    const mappedLine = this.mapOriginalLineToSplitView(
                        originalEditor.document.uri.toString(),
                        topLine,
                    );

                    splitViewEditor.revealRange(
                        new vscode.Range(
                            new vscode.Position(mappedLine, 0),
                            new vscode.Position(mappedLine, 0),
                        ),
                        vscode.TextEditorRevealType.AtTop,
                    );
                }
            },
        );

        const disposable2 = vscode.window.onDidChangeTextEditorVisibleRanges(
            (e) => {
                if (e.textEditor === splitViewEditor) {
                    const topLine = e.visibleRanges[0].start.line;
                    const mappedLine = this.mapSplitViewLineToOriginal(
                        originalEditor.document.uri.toString(),
                        topLine,
                    );

                    if (mappedLine !== -1) {
                        originalEditor.revealRange(
                            new vscode.Range(
                                new vscode.Position(mappedLine, 0),
                                new vscode.Position(mappedLine, 0),
                            ),
                            vscode.TextEditorRevealType.AtTop,
                        );
                    }
                }
            },
        );

        this.scrollSyncDisposables.push(disposable1, disposable2);
    }

    /**
     * Set up selection synchronization
     */
    private setupSelectionSync(
        originalEditor: vscode.TextEditor,
        splitViewEditor: vscode.TextEditor,
    ): void {
        // Original -> Split View
        const disposable1 = vscode.window.onDidChangeTextEditorSelection(
            (e) => {
                if (
                    e.textEditor === originalEditor &&
                    e.selections.length > 0
                ) {
                    const selection = e.selections[0];
                    const startLine = this.mapOriginalLineToSplitView(
                        originalEditor.document.uri.toString(),
                        selection.start.line,
                    );
                    const endLine = this.mapOriginalLineToSplitView(
                        originalEditor.document.uri.toString(),
                        selection.end.line,
                    );

                    const newSelection = new vscode.Selection(
                        new vscode.Position(startLine, 0),
                        new vscode.Position(
                            endLine,
                            splitViewEditor.document.lineAt(endLine).text
                                .length,
                        ),
                    );
                    splitViewEditor.selection = newSelection;
                }
            },
        );

        this.selectionSyncDisposables.push(disposable1);
    }

    /**
     * Set up highlight synchronization on hover
     */
    private setupHighlightSync(
        originalEditor: vscode.TextEditor,
        splitViewEditor: vscode.TextEditor,
    ): void {
        // Note: VS Code doesn't provide hover events directly
        // We use cursor position changes as approximation
        const disposable1 = vscode.window.onDidChangeTextEditorSelection(
            (e) => {
                if (e.textEditor === originalEditor) {
                    const line = e.selections[0].active.line;
                    const mappedLine = this.mapOriginalLineToSplitView(
                        originalEditor.document.uri.toString(),
                        line,
                    );

                    // Highlight corresponding line in split view
                    const range =
                        splitViewEditor.document.lineAt(mappedLine).range;
                    splitViewEditor.setDecorations(this.syncHighlight, [range]);
                }
            },
        );

        const disposable2 = vscode.window.onDidChangeTextEditorSelection(
            (e) => {
                if (e.textEditor === splitViewEditor) {
                    const line = e.selections[0].active.line;
                    const mappedLine = this.mapSplitViewLineToOriginal(
                        originalEditor.document.uri.toString(),
                        line,
                    );

                    if (mappedLine !== -1) {
                        // Highlight corresponding line in original
                        const range =
                            originalEditor.document.lineAt(mappedLine).range;
                        originalEditor.setDecorations(this.syncHighlight, [
                            range,
                        ]);
                    }
                }
            },
        );

        this.highlightSyncDisposables.push(disposable1, disposable2);
    }

    /**
     * Map original line number to split view line number
     */
    private mapOriginalLineToSplitView(
        originalUri: string,
        originalLine: number,
    ): number {
        const annotations = this.annotations.get(originalUri);
        if (!annotations) {
            return originalLine;
        }

        // Count lines before this line in split view
        // Each annotated line takes multiple lines (annotation + original + spacing)
        let splitViewLine = 0;

        for (let i = 0; i <= originalLine; i++) {
            const annotation = annotations.find((a) => a.line === i);

            if (annotation) {
                // Annotated line takes more lines
                // 1 (severity line) + optional category + optional timestamp + original + matched + empty
                splitViewLine += 4; // Average
                if (annotation.category) splitViewLine++;
                if (annotation.timestamp) splitViewLine++;
            } else {
                // Regular line takes 1 line
                splitViewLine++;
            }
        }

        return Math.max(0, splitViewLine - 1);
    }

    /**
     * Map split view line number to original line number
     */
    private mapSplitViewLineToOriginal(
        originalUri: string,
        splitViewLine: number,
    ): number {
        const annotations = this.annotations.get(originalUri);
        if (!annotations) {
            return splitViewLine;
        }

        // Reverse mapping - find which original line this split view line represents
        let currentSplitLine = 0;

        const doc = vscode.workspace.textDocuments.find(
            (d) => d.uri.toString() === originalUri,
        );
        if (!doc) return -1;

        for (let i = 0; i < doc.lineCount; i++) {
            const annotation = annotations.find((a) => a.line === i);

            if (annotation) {
                const linesForAnnotation =
                    4 +
                    (annotation.category ? 1 : 0) +
                    (annotation.timestamp ? 1 : 0);

                if (currentSplitLine + linesForAnnotation > splitViewLine) {
                    return i; // This annotation block contains the split view line
                }
                currentSplitLine += linesForAnnotation;
            } else {
                if (currentSplitLine === splitViewLine) {
                    return i;
                }
                currentSplitLine++;
            }
        }

        return -1;
    }

    /**
     * Get sync configuration from settings
     */
    private getSyncConfig(): SyncConfig {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");

        return {
            cursorSync: config.get<boolean>("splitView.cursorSync", true),
            scrollSync: config.get<boolean>("splitView.scrollSync", true),
            selectionSync: config.get<boolean>("splitView.selectionSync", true),
            highlightSync: config.get<boolean>("splitView.highlightSync", true),
        };
    }

    /**
     * Clear sync subscriptions for a document
     */
    private clearSync(_originalUri: string): void {
        this.cursorSyncDisposables.forEach((d) => d.dispose());
        this.cursorSyncDisposables = [];

        this.scrollSyncDisposables.forEach((d) => d.dispose());
        this.scrollSyncDisposables = [];

        this.selectionSyncDisposables.forEach((d) => d.dispose());
        this.selectionSyncDisposables = [];

        this.highlightSyncDisposables.forEach((d) => d.dispose());
        this.highlightSyncDisposables = [];
    }

    /**
     * Close split view for a document
     */
    public closeSplitView(originalUri: string): void {
        const splitViewEditor = this.splitViewEditors.get(originalUri);

        if (splitViewEditor) {
            // Close the split view editor
            vscode.commands.executeCommand(
                "workbench.action.closeActiveEditor",
            );
        }

        // Clean up
        this.clearSync(originalUri);
        this.annotations.delete(originalUri);
        this.originalEditors.delete(originalUri);
        this.splitViewEditors.delete(originalUri);
    }

    /**
     * Update annotations for an open split view
     */
    public updateAnnotations(
        originalUri: string,
        annotations: AnnotatedLine[],
    ): void {
        this.annotations.set(originalUri, annotations);

        // Refresh the split view content
        const splitViewUri = this.createSplitViewUri(originalUri);
        this._onDidChange.fire(splitViewUri);
    }

    /**
     * Create split view URI from original URI
     */
    private createSplitViewUri(originalUri: string): vscode.Uri {
        return vscode.Uri.parse(
            `scout-annotated:${originalUri}?original=${encodeURIComponent(originalUri)}`,
        );
    }

    /**
     * Decode original URI from split view URI
     */
    private decodeOriginalUri(uri: vscode.Uri): string {
        const query = new URLSearchParams(uri.query);
        return decodeURIComponent(query.get("original") || "");
    }

    /**
     * Check if split view is open for a document
     */
    public isSplitViewOpen(originalUri: string): boolean {
        return this.splitViewEditors.has(originalUri);
    }

    /**
     * Dispose all resources
     */
    public dispose(): void {
        this.cursorSyncDisposables.forEach((d) => d.dispose());
        this.scrollSyncDisposables.forEach((d) => d.dispose());
        this.selectionSyncDisposables.forEach((d) => d.dispose());
        this.highlightSyncDisposables.forEach((d) => d.dispose());

        this.hoverHighlight.dispose();
        this.syncHighlight.dispose();

        this.annotations.clear();
        this.originalEditors.clear();
        this.splitViewEditors.clear();

        this._onDidChange.dispose();
    }
}
