"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotationRenderer = void 0;
const gutterDecorator_1 = require("./gutterDecorator");
const logLevelHighlighter_1 = require("./logLevelHighlighter");
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
class AnnotationRenderer {
    constructor() {
        this.gutterDecorator = new gutterDecorator_1.GutterDecorator();
        this.logLevelHighlighter = new logLevelHighlighter_1.LogLevelHighlighter();
    }
    /**
     * Render all annotations (both glyphs and highlights)
     */
    render(editor, annotations) {
        if (!editor || !annotations || annotations.length === 0) {
            return;
        }
        try {
            // Apply severity glyph icons in the margin
            this.gutterDecorator.updateDecorations(editor, annotations);
            // Apply log level text highlights
            this.logLevelHighlighter.applyHighlights(editor, editor.document, annotations);
        }
        catch (error) {
            console.error('Error rendering annotations:', error);
        }
    }
    /**
     * Clear all annotations from the editor
     */
    clear(editor) {
        if (!editor) {
            return;
        }
        try {
            this.gutterDecorator.clearDecorations(editor);
            this.logLevelHighlighter.clearHighlights(editor);
        }
        catch (error) {
            console.error('Error clearing annotations:', error);
        }
    }
    /**
     * Update annotations for a specific document
     */
    update(editor, annotations) {
        this.clear(editor);
        this.render(editor, annotations);
    }
    /**
     * Dispose all resources
     */
    dispose() {
        this.gutterDecorator.dispose();
        this.logLevelHighlighter.dispose();
    }
}
exports.AnnotationRenderer = AnnotationRenderer;
//# sourceMappingURL=annotationRenderer.js.map