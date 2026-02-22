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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevelHighlighter = void 0;
const vscode = __importStar(require("vscode"));
/**
 * LogLevelHighlighter - Highlights log level keywords (ERROR, WARN, INFO, etc.) in log files
 * Works alongside GutterDecorator to provide visual distinction between severity and log level
 */
class LogLevelHighlighter {
    constructor() {
        this.decorationTypes = new Map();
        this.pendingUpdates = new Map();
        this.updateTimeouts = new Map();
        this.throttleDelay = 50; // ms
        this.createDecorationTypes();
    }
    /**
     * Create decoration types for each log level with appropriate styling
     */
    createDecorationTypes() {
        const logLevels = [
            { name: "fatal", color: "#ff4d4f", opacity: 0.7, weight: "600" },
            { name: "error", color: "#ff4d4f", opacity: 0.6, weight: "500" },
            { name: "warn", color: "#ffa500", opacity: 0.6, weight: "500" },
            { name: "info", color: "#0066ff", opacity: 0.6, weight: "500" },
            { name: "debug", color: "#52c41a", opacity: 0.6, weight: "500" },
            { name: "trace", color: "#6c757d", opacity: 0.6, weight: "500" },
            { name: "verbose", color: "#9ca3af", opacity: 0.5, weight: "400" },
        ];
        for (const level of logLevels) {
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: this.rgbaToString(level.color, level.opacity),
                border: `1px solid ${level.color}`,
                borderRadius: "2px",
                fontWeight: level.weight,
                isWholeLine: false,
            });
            this.decorationTypes.set(level.name, decorationType);
        }
    }
    /**
     * Convert hex color to rgba string
     */
    rgbaToString(hexColor, opacity) {
        const hex = hexColor.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    /**
     * Find log level keyword in a line and return its position
     */
    findLogLevel(line) {
        // Patterns ordered by priority
        const patterns = [
            { regex: /\b(FATAL|CRITICAL|CRIT)\b/i, level: "fatal" },
            { regex: /\bERROR\b/i, level: "error" },
            { regex: /\b(WARN|WARNING)\b/i, level: "warn" },
            { regex: /\bINFO\b/i, level: "info" },
            { regex: /\bDEBUG\b/i, level: "debug" },
            { regex: /\bTRACE\b/i, level: "trace" },
            { regex: /\bVERBOSE\b/i, level: "verbose" },
        ];
        for (const pattern of patterns) {
            const match = line.match(pattern.regex);
            if (match && match.index !== undefined) {
                return {
                    level: pattern.level,
                    startPos: match.index,
                    endPos: match.index + match[0].length,
                };
            }
        }
        return null;
    }
    /**
     * Apply highlights to the editor for all annotated lines (throttled to prevent rate limiting)
     */
    applyHighlights(editor, document, annotations) {
        const uri = editor.document.uri.toString();
        // Store pending update
        this.pendingUpdates.set(uri, { editor, document, annotations });
        // Clear existing timeout for this document
        const existingTimeout = this.updateTimeouts.get(uri);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        // Throttle the actual highlight application
        const timeout = setTimeout(() => {
            this.applyHighlightsInternal(uri);
            this.updateTimeouts.delete(uri);
            this.pendingUpdates.delete(uri);
        }, this.throttleDelay);
        this.updateTimeouts.set(uri, timeout);
    }
    /**
     * Apply highlights immediately (internal method)
     */
    applyHighlightsInternal(uri) {
        const pending = this.pendingUpdates.get(uri);
        if (!pending) {
            return;
        }
        const { editor, document, annotations } = pending;
        // Group ranges by log level for efficient decoration
        const highlightsByLevel = new Map();
        for (const annotation of annotations) {
            try {
                const line = document.lineAt(annotation.line);
                const logLevelInfo = this.findLogLevel(line.text);
                if (logLevelInfo) {
                    const ranges = highlightsByLevel.get(logLevelInfo.level) || [];
                    ranges.push(new vscode.Range(annotation.line, logLevelInfo.startPos, annotation.line, logLevelInfo.endPos));
                    highlightsByLevel.set(logLevelInfo.level, ranges);
                }
            }
            catch (error) {
                // Skip invalid line numbers
                console.error(`Error processing line ${annotation.line}:`, error);
            }
        }
        // Apply decorations for each log level
        for (const [level, ranges] of highlightsByLevel.entries()) {
            const decorationType = this.decorationTypes.get(level);
            if (decorationType && ranges.length > 0) {
                editor.setDecorations(decorationType, ranges);
            }
        }
        // Clear decorations for levels that have no matches
        for (const [level, decorationType] of this.decorationTypes.entries()) {
            if (!highlightsByLevel.has(level)) {
                editor.setDecorations(decorationType, []);
            }
        }
    }
    /**
     * Clear all highlights from the editor
     */
    clearHighlights(editor) {
        for (const decorationType of this.decorationTypes.values()) {
            editor.setDecorations(decorationType, []);
        }
    }
    /**
     * Dispose all decoration types
     */
    dispose() {
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
        this.decorationTypes.clear();
    }
}
exports.LogLevelHighlighter = LogLevelHighlighter;
//# sourceMappingURL=logLevelHighlighter.js.map