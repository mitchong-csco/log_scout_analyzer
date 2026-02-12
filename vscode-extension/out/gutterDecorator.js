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
        this.pendingUpdates = new Map();
        this.updateTimeouts = new Map();
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
    createHoverTooltip(annotation, _document) {
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
    clearDecorations(editor) {
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
    clearAll() {
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
    getAnnotations(uri) {
        return this.annotatedLines.get(uri);
    }
    /**
     * Dispose of all resources
     */
    dispose() {
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
exports.GutterDecorator = GutterDecorator;
//# sourceMappingURL=gutterDecorator.js.map