import * as vscode from "vscode";

export class ScoutConsole {
    private outputChannel: vscode.OutputChannel;
    private terminalOutput: vscode.Terminal | undefined;
    private eventCount: number = 0;
    private currentFile: vscode.Uri | undefined;
    private useTerminal: boolean = false;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel(
            "Scout Console",
            { log: true },
        );
        this.updateOutputLocation();
    }

    private updateOutputLocation(): void {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        this.useTerminal =
            config.get<string>("consoleOutputLocation", "outputPanel") ===
            "terminal";
    }

    public toggleOutputLocation(): void {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const current = config.get<string>(
            "consoleOutputLocation",
            "outputPanel",
        );
        const newLocation =
            current === "outputPanel" ? "terminal" : "outputPanel";

        config.update(
            "consoleOutputLocation",
            newLocation,
            vscode.ConfigurationTarget.Global,
        );
        this.useTerminal = newLocation === "terminal";

        // Show appropriate output
        if (this.useTerminal) {
            this.getOrCreateTerminal().show();
            vscode.window.showInformationMessage(
                "Scout Console now showing in Terminal",
            );
        } else {
            this.outputChannel.show(true);
            vscode.window.showInformationMessage(
                "Scout Console now showing in Output Panel",
            );
        }
    }

    private getOrCreateTerminal(): vscode.Terminal {
        if (
            !this.terminalOutput ||
            this.terminalOutput.exitStatus !== undefined
        ) {
            this.terminalOutput = vscode.window.createTerminal({
                name: "Scout Console",
                iconPath: new vscode.ThemeIcon("search"),
            });
        }
        return this.terminalOutput;
    }

    private write(message: string): void {
        if (this.useTerminal) {
            const terminal = this.getOrCreateTerminal();
            terminal.sendText(
                `echo "${this.escapeForTerminal(message)}"`,
                false,
            );
        } else {
            this.outputChannel.appendLine(message);
        }
    }

    private escapeForTerminal(text: string): string {
        return text
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");
    }

    public show(): void {
        this.updateOutputLocation();
        if (this.useTerminal) {
            this.getOrCreateTerminal().show();
        } else {
            this.outputChannel.show(true);
        }
    }

    public hide(): void {
        if (this.useTerminal) {
            // Can't hide terminal programmatically, but we can stop using it
        } else {
            this.outputChannel.hide();
        }
    }

    public clear(): void {
        if (this.useTerminal) {
            const terminal = this.getOrCreateTerminal();
            terminal.sendText("clear", true);
        } else {
            this.outputChannel.clear();
        }
        this.eventCount = 0;
    }

    public logAnalysisStart(fileName: string, fileUri?: vscode.Uri): void {
        this.currentFile = fileUri;
        this.updateOutputLocation();
        this.write("");
        this.write("═".repeat(80));
        this.write(`🔍 ANALYSIS STARTED - ${new Date().toLocaleString()}`);
        this.write(`📄 File: ${fileName}`);
        this.write("═".repeat(80));
        this.write("");
        this.eventCount = 0;
    }

    public logAnalysisComplete(
        errorCount: number,
        warningCount: number,
        infoCount: number,
        debugCount: number,
        duration: number,
    ): void {
        const total = errorCount + warningCount + infoCount + debugCount;

        this.write("");
        this.write("─".repeat(80));
        this.write(`✓ ANALYSIS COMPLETE`);
        this.write(`  Duration: ${duration}ms | Total Issues: ${total}`);
        this.write(
            `  🟣 ${debugCount} debug | 🔵 ${infoCount} info | 🟡 ${warningCount} warnings | 🔴 ${errorCount} errors`,
        );
        this.write("─".repeat(80));
        this.write("");
    }

    private logWithSeverity(
        severity: "error" | "warning" | "info" | "debug",
        line: number,
        message: string,
        category?: string,
        timestamp?: Date,
        fileUri?: vscode.Uri,
    ): void {
        this.eventCount++;
        const lineNum = line + 1;
        const time = timestamp
            ? timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();
        const cat = category ? `[${category}]` : "";
        const file = fileUri || this.currentFile;

        const severityMap = {
            error: { icon: "🔴", label: "ERROR" },
            warning: { icon: "🟡", label: "WARNING" },
            info: { icon: "🔵", label: "INFO" },
            debug: { icon: "🟣", label: "DEBUG" },
        };

        const { icon, label } = severityMap[severity];

        // Format for terminal link detection: file:line:column
        if (file) {
            this.write(`  ${file.fsPath}:${lineNum}:1`);
            this.write(`  ${icon} ${label} ${cat} ${time}: ${message}`);
        } else {
            this.write(
                `  ${icon} ${label} Line ${lineNum} ${cat} ${time}: ${message}`,
            );
        }
    }

    public logError(
        line: number,
        message: string,
        category?: string,
        timestamp?: Date,
        fileUri?: vscode.Uri,
    ): void {
        this.logWithSeverity(
            "error",
            line,
            message,
            category,
            timestamp,
            fileUri,
        );
    }

    public logWarning(
        line: number,
        message: string,
        category?: string,
        timestamp?: Date,
        fileUri?: vscode.Uri,
    ): void {
        this.logWithSeverity(
            "warning",
            line,
            message,
            category,
            timestamp,
            fileUri,
        );
    }

    public logInfo(
        line: number,
        message: string,
        category?: string,
        timestamp?: Date,
        fileUri?: vscode.Uri,
    ): void {
        this.logWithSeverity(
            "info",
            line,
            message,
            category,
            timestamp,
            fileUri,
        );
    }

    public logResult(
        severity: "error" | "warning" | "info" | "debug",
        line: number,
        message: string,
        category?: string,
        timestamp?: Date,
        fileUri?: vscode.Uri,
    ): void {
        switch (severity) {
            case "error":
                this.logError(line, message, category, timestamp, fileUri);
                break;
            case "warning":
                this.logWarning(line, message, category, timestamp, fileUri);
                break;
            case "info":
                this.logInfo(line, message, category, timestamp, fileUri);
                break;
            case "debug":
                this.logWithSeverity(
                    "debug",
                    line,
                    message,
                    category,
                    timestamp,
                    fileUri,
                );
                break;
        }
    }

    public logMessage(message: string): void {
        this.write(message);
    }

    public logSection(title: string): void {
        this.write("");
        this.write(`▼ ${title}`);
        this.write("─".repeat(80));
    }

    public logSummary(summary: {
        totalFiles: number;
        totalIssues: number;
        errors: number;
        warnings: number;
        infos: number;
        categories: string[];
        timeRange?: { start: Date; end: Date };
    }): void {
        this.write("");
        this.write("═".repeat(80));
        this.write("📊 SUMMARY");
        this.write("═".repeat(80));
        this.write(`  Files Analyzed: ${summary.totalFiles}`);
        this.write(`  Total Issues: ${summary.totalIssues}`);
        this.write(
            `    🔴 Errors: ${summary.errors} (${this.percentage(summary.errors, summary.totalIssues)}%)`,
        );
        this.write(
            `    🟡 Warnings: ${summary.warnings} (${this.percentage(summary.warnings, summary.totalIssues)}%)`,
        );
        this.write(
            `    🔵 Info: ${summary.infos} (${this.percentage(summary.infos, summary.totalIssues)}%)`,
        );

        if (summary.categories.length > 0) {
            this.write(`  Categories Found: ${summary.categories.length}`);
            this.write(
                `    ${summary.categories.slice(0, 5).join(", ")}${summary.categories.length > 5 ? "..." : ""}`,
            );
        }

        if (summary.timeRange) {
            this.write(
                `  Time Range: ${summary.timeRange.start.toLocaleString()} - ${summary.timeRange.end.toLocaleString()}`,
            );
        }

        this.write("═".repeat(80));
        this.write("");
    }

    public logFilterApplied(filterInfo: {
        keyword?: string;
        category?: string;
        severity?: string;
        timeRange?: { start: Date; end: Date };
        resultCount: number;
        totalCount: number;
    }): void {
        this.write("");
        this.write("🔍 FILTER APPLIED");
        this.write("─".repeat(80));

        if (filterInfo.keyword) {
            this.write(`  Keyword: "${filterInfo.keyword}"`);
        }
        if (filterInfo.category) {
            this.write(`  Category: ${filterInfo.category}`);
        }
        if (filterInfo.severity) {
            this.write(`  Severity: ${filterInfo.severity}`);
        }
        if (filterInfo.timeRange) {
            this.write(
                `  Time Range: ${filterInfo.timeRange.start.toLocaleString()} - ${filterInfo.timeRange.end.toLocaleString()}`,
            );
        }

        this.write(
            `  Results: ${filterInfo.resultCount} of ${filterInfo.totalCount} (${this.percentage(filterInfo.resultCount, filterInfo.totalCount)}%)`,
        );
        this.write("─".repeat(80));
        this.write("");
    }

    public logExport(fileName: string, itemCount: number): void {
        this.write("");
        this.write(`💾 EXPORTED ${itemCount} results to: ${fileName}`);
        this.write("");
    }

    public logClear(): void {
        this.write("");
        this.write("🗑️  All diagnostics cleared");
        this.write("");
    }

    public logPatternLoad(count: number): void {
        this.write(`✓ Loaded ${count} analysis patterns`);
    }

    public logFileIgnored(fileName: string, reason: string): void {
        this.write(`⚠️  File ignored: ${fileName} (${reason})`);
    }

    public logPerformance(metric: string, value: number, unit: string): void {
        this.write(`⏱️  ${metric}: ${value}${unit}`);
    }

    public dispose(): void {
        this.outputChannel.dispose();
        if (this.terminalOutput) {
            this.terminalOutput.dispose();
        }
    }

    private percentage(value: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    // Console-style real-time streaming output
    public stream(
        severity: "error" | "warning" | "info" | "debug",
        message: string,
        details?: {
            line?: number;
            category?: string;
            timestamp?: Date;
            fileUri?: vscode.Uri;
        },
    ): void {
        const time = details?.timestamp
            ? details.timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();
        const icon =
            severity === "error"
                ? "🔴"
                : severity === "warning"
                  ? "🟡"
                  : severity === "info"
                    ? "🔵"
                    : "🟣";
        const cat = details?.category ? `[${details.category}]` : "";
        const file = details?.fileUri || this.currentFile;

        // Format for terminal link detection: file:line:column
        if (details?.line && file) {
            this.write(`  ${file.fsPath}:${details.line + 1}:1`);
            this.write(`  ${icon} ${cat} ${time}: ${message}`);
        } else if (details?.line) {
            this.write(
                `  ${icon} Line ${details.line + 1} ${cat} ${time}: ${message}`,
            );
        } else {
            this.write(`${icon} ${time} ${cat} ${message}`.trim());
        }
    }

    // Table-style output for structured data
    public table(headers: string[], rows: string[][], title?: string): void {
        if (title) {
            this.write("");
            this.write(title);
        }

        // Calculate column widths
        const widths = headers.map((h, i) => {
            const maxRowWidth = Math.max(
                ...rows.map((r) => (r[i] || "").length),
            );
            return Math.max(h.length, maxRowWidth);
        });

        // Header
        const headerRow = headers
            .map((h, i) => h.padEnd(widths[i]))
            .join(" | ");
        this.write(headerRow);
        this.write(widths.map((w) => "─".repeat(w)).join("─┼─"));

        // Rows
        rows.forEach((row) => {
            const formattedRow = row
                .map((cell, i) => (cell || "").padEnd(widths[i]))
                .join(" | ");
            this.write(formattedRow);
        });

        this.write("");
    }

    // Progress indicator
    public progress(current: number, total: number, label?: string): void {
        const percentage = Math.round((current / total) * 100);
        const barLength = 40;
        const filled = Math.round((barLength * current) / total);
        const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

        const text = label
            ? `${label}: [${bar}] ${percentage}% (${current}/${total})`
            : `[${bar}] ${percentage}% (${current}/${total})`;

        this.write(text);
    }
}
