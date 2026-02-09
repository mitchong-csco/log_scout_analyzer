import * as vscode from "vscode";

export interface Pattern {
    regex: RegExp;
    severity: "error" | "warning" | "info" | "debug";
    message?: string;
}

export interface PatternMatch {
    line: number;
    column: number;
    length: number;
    pattern: Pattern;
    matchedText: string;
}

export class PatternEngine {
    private patterns: Pattern[] = [];

    constructor() {
        this.loadPatterns();

        // Reload patterns when configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("logScoutAnalyzer.patterns")) {
                this.loadPatterns();
            }
        });
    }

    private loadPatterns(): void {
        const config = vscode.workspace.getConfiguration(
            "logScoutAnalyzer.patterns",
        );
        this.patterns = [];

        // Load error patterns
        const errorPatterns = config.get<string[]>("errors", []);
        errorPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "error",
                    message: "Error detected in log",
                });
            } catch (err) {
                console.error(
                    `Failed to compile error pattern: ${pattern}`,
                    err,
                );
            }
        });

        // Load warning patterns
        const warningPatterns = config.get<string[]>("warnings", []);
        warningPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "warning",
                    message: "Warning detected in log",
                });
            } catch (err) {
                console.error(
                    `Failed to compile warning pattern: ${pattern}`,
                    err,
                );
            }
        });

        // Load info patterns
        const infoPatterns = config.get<string[]>("info", []);
        infoPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "info",
                    message: "Information detected in log",
                });
            } catch (err) {
                console.error(
                    `Failed to compile info pattern: ${pattern}`,
                    err,
                );
            }
        });

        // Load debug patterns
        const debugPatterns = config.get<string[]>("debug", []);
        debugPatterns.forEach((pattern) => {
            try {
                this.patterns.push({
                    regex: new RegExp(pattern, "g"),
                    severity: "debug",
                    message: "Debug information detected in log",
                });
            } catch (err) {
                console.error(
                    `Failed to compile debug pattern: ${pattern}`,
                    err,
                );
            }
        });

        console.log(`Loaded ${this.patterns.length} patterns`);
    }

    public analyzeText(text: string): PatternMatch[] {
        const matches: PatternMatch[] = [];
        const lines = text.split("\n");

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];

            for (const pattern of this.patterns) {
                // Reset regex state
                pattern.regex.lastIndex = 0;

                let match: RegExpExecArray | null;
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

    public analyzeDocument(document: vscode.TextDocument): PatternMatch[] {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const maxFileSize = config.get<number>("maxFileSize", 10485760); // 10MB default

        // Check file size
        if (document.getText().length > maxFileSize) {
            console.warn(
                `File too large (${document.getText().length} bytes), skipping analysis`,
            );
            return [];
        }

        return this.analyzeText(document.getText());
    }

    public getAllPatterns(): {
        errors: string[];
        warnings: string[];
        info: string[];
        debug: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];
        const info: string[] = [];
        const debug: string[] = [];

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

    public getPatternCount(): number {
        return this.patterns.length;
    }

    public matchLine(line: string): PatternMatch[] {
        const matches: PatternMatch[] = [];

        for (const pattern of this.patterns) {
            pattern.regex.lastIndex = 0;

            let match: RegExpExecArray | null;
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
