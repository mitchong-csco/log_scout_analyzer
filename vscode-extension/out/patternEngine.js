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
exports.PatternEngine = void 0;
const vscode = __importStar(require("vscode"));
class PatternEngine {
    constructor() {
        this.patterns = [];
        this.loadPatterns();
        // Reload patterns when configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("logScoutAnalyzer.patterns")) {
                this.loadPatterns();
            }
        });
    }
    loadPatterns() {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer.patterns");
        this.patterns = [];
        // Load error patterns
        const errorPatterns = config.get("errors", []);
        errorPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "error",
                    message: "Error detected in log",
                });
            }
            catch (err) {
                console.error(`Failed to compile error pattern: ${pattern}`, err);
            }
        });
        // Load warning patterns
        const warningPatterns = config.get("warnings", []);
        warningPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "warning",
                    message: "Warning detected in log",
                });
            }
            catch (err) {
                console.error(`Failed to compile warning pattern: ${pattern}`, err);
            }
        });
        // Load info patterns
        const infoPatterns = config.get("info", []);
        infoPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "info",
                    message: "Information detected in log",
                });
            }
            catch (err) {
                console.error(`Failed to compile info pattern: ${pattern}`, err);
            }
        });
        // Load debug patterns
        const debugPatterns = config.get("debug", []);
        debugPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "debug",
                    message: "Debug information detected in log",
                });
            }
            catch (err) {
                console.error(`Failed to compile debug pattern: ${pattern}`, err);
            }
        });
        console.log(`Loaded ${this.patterns.length} patterns`);
    }
    analyzeText(text) {
        const matches = [];
        const lines = text.split("\n");
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            for (const pattern of this.patterns) {
                // Reset regex state
                pattern.regex.lastIndex = 0;
                let match;
                while ((match = pattern.regex.exec(line)) !== null) {
                    matches.push({
                        line: lineIndex,
                        column: match.index,
                        length: match[0].length,
                        pattern: pattern,
                        matchedText: match[0],
                    });
                }
            }
        }
        return matches;
    }
    analyzeDocument(document) {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const maxFileSize = config.get("maxFileSize", 10485760); // 10MB default
        // Check file size
        if (document.getText().length > maxFileSize) {
            console.warn(`File too large (${document.getText().length} bytes), skipping analysis`);
            return [];
        }
        return this.analyzeText(document.getText());
    }
    getAllPatterns() {
        const errors = [];
        const warnings = [];
        const info = [];
        const debug = [];
        this.patterns.forEach((pattern) => {
            const patternStr = pattern.regex.source;
            switch (pattern.severity) {
                case "error":
                    errors.push(patternStr);
                    break;
                case "warning":
                    warnings.push(patternStr);
                    break;
                case "info":
                    info.push(patternStr);
                    break;
                case "debug":
                    debug.push(patternStr);
                    break;
            }
        });
        return { errors, warnings, info, debug };
    }
    getPatternCount() {
        return this.patterns.length;
    }
    matchLine(line) {
        const matches = [];
        for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(line)) !== null) {
                matches.push({
                    line: 0,
                    column: match.index,
                    length: match[0].length,
                    pattern: pattern,
                    matchedText: match[0],
                });
            }
        }
        return matches;
    }
}
exports.PatternEngine = PatternEngine;
//# sourceMappingURL=patternEngine.js.map