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
exports.GutterDecorator = void 0;
const vscode = __importStar(require("vscode"));
/**
 * GutterDecorator - Manages gutter icons and hover tooltips for annotated log lines
 */
class GutterDecorator {
    constructor() {
        this.annotatedLines = new Map();
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
    createGutterIcon(emoji) {
        // Create SVG with emoji
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <text x="0" y="14" font-size="14" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji">${emoji}</text>
            </svg>
        `;
        return vscode.Uri.parse(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
    }
    /**
     * Register hover provider for showing tooltips
     */
    registerHoverProvider() {
        this.hoverProvider = vscode.languages.registerHoverProvider({ scheme: "file" }, {
            provideHover: (document, position) => {
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
        });
    }
    /**
     * Create hover tooltip content
     */
    createHoverTooltip(annotation, document) {
        const markdown = new vscode.MarkdownString();
        markdown.isTrusted = true;
        markdown.supportHtml = true;
        // Severity icon and header
        const severityIcon = annotation.severity === "error"
            ? "🔴"
            : annotation.severity === "warning"
                ? "🟡"
                : annotation.severity === "info"
                    ? "🔵"
                    : "🟣";
        markdown.appendMarkdown(`### ${severityIcon} ${annotation.severity.toUpperCase()} - Line ${annotation.line + 1}\n\n`);
        // Category
        if (annotation.category) {
            markdown.appendMarkdown(`**Category:** \`${annotation.category}\`\n\n`);
        }
        // Pattern
        if (annotation.pattern) {
            markdown.appendMarkdown(`**Pattern:** \`${annotation.pattern}\`\n\n`);
        }
        // Timestamp
        if (annotation.timestamp) {
            markdown.appendMarkdown(`**Timestamp:** ${annotation.timestamp.toLocaleString()}\n\n`);
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
                }
                else {
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
    updateDecorations(editor, annotations) {
        const uri = editor.document.uri.toString();
        // Store annotations for hover provider
        this.annotatedLines.set(uri, annotations);
        // Group annotations by severity
        const errorRanges = [];
        const warningRanges = [];
        const infoRanges = [];
        const debugRanges = [];
        annotations.forEach((annotation) => {
            const line = editor.document.lineAt(annotation.line);
            const range = line.range;
            const decorationOption = {
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
    clearDecorations(editor) {
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
    clearAll() {
        this.annotatedLines.clear();
        // Clear decorations in all visible editors
        vscode.window.visibleTextEditors.forEach((editor) => {
            this.clearDecorations(editor);
        });
    }
    /**
     * Get annotations for a specific document
     */
    getAnnotations(uri) {
        return this.annotatedLines.get(uri);
    }
    /**
     * Dispose of all resources
     */
    dispose() {
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
exports.GutterDecorator = GutterDecorator;
//# sourceMappingURL=gutterDecorator.js.map