import * as vscode from 'vscode';
import { GutterDecorator, AnnotatedLine } from './gutterDecorator';
import { LogLevelHighlighter } from './logLevelHighlighter';

/**
 * AnnotationRenderer - Orchestrates rendering of both severity glyphs and log level highlights
 *
 * This class combines:
 * - GutterDecorator: Shows severity glyphs (🔴 🟡 🔵 🟢) in the editor margin
 * - LogLevelHighlighter: Highlights log level keywords (ERROR, WARN, INFO, etc.) in the text
 *
 * Usage:
 *   const renderer = new AnnotationRenderer();
 *   renderer.render(editor, annotations);
 */
export class AnnotationRenderer {
    private gutterDecorator: GutterDecorator;
    private logLevelHighlighter: LogLevelHighlighter;

    constructor() {
        this.gutterDecorator = new GutterDecorator();
        this.logLevelHighlighter = new LogLevelHighlighter();
    }

    /**
     * Render all annotations (both glyphs and highlights)
     */
    public render(
        editor: vscode.TextEditor,
        annotations: AnnotatedLine[]
    ): void {
        if (!editor || !annotations || annotations.length === 0) {
            return;
        }

        try {
            // Apply severity glyph icons in the margin
            this.gutterDecorator.updateDecorations(editor, annotations);

            // Apply log level text highlights
            this.logLevelHighlighter.applyHighlights(
                editor,
                editor.document,
                annotations
            );
        } catch (error) {
            console.error('Error rendering annotations:', error);
        }
    }

    /**
     * Clear all annotations from the editor
     */
    public clear(editor: vscode.TextEditor): void {
        if (!editor) {
            return;
        }

        try {
            this.gutterDecorator.clearDecorations(editor);
            this.logLevelHighlighter.clearHighlights(editor);
        } catch (error) {
            console.error('Error clearing annotations:', error);
        }
    }

    /**
     * Update annotations for a specific document
     */
    public update(
        editor: vscode.TextEditor,
        annotations: AnnotatedLine[]
    ): void {
        this.clear(editor);
        this.render(editor, annotations);
    }

    /**
     * Dispose all resources
     */
    public dispose(): void {
        this.gutterDecorator.dispose();
        this.logLevelHighlighter.dispose();
    }
}
