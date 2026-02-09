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
exports.ScoutConsole = void 0;
const vscode = __importStar(require("vscode"));
class ScoutConsole {
    constructor() {
        this.eventCount = 0;
        this.useTerminal = false;
        this.outputChannel = vscode.window.createOutputChannel("Scout Console", { log: true });
        this.updateOutputLocation();
    }
    updateOutputLocation() {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        this.useTerminal =
            config.get("consoleOutputLocation", "outputPanel") ===
                "terminal";
    }
    toggleOutputLocation() {
        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const current = config.get("consoleOutputLocation", "outputPanel");
        const newLocation = current === "outputPanel" ? "terminal" : "outputPanel";
        config.update("consoleOutputLocation", newLocation, vscode.ConfigurationTarget.Global);
        this.useTerminal = newLocation === "terminal";
        // Show appropriate output
        if (this.useTerminal) {
            this.getOrCreateTerminal().show();
            vscode.window.showInformationMessage("Scout Console now showing in Terminal");
        }
        else {
            this.outputChannel.show(true);
            vscode.window.showInformationMessage("Scout Console now showing in Output Panel");
        }
    }
    getOrCreateTerminal() {
        if (!this.terminalOutput ||
            this.terminalOutput.exitStatus !== undefined) {
            this.terminalOutput = vscode.window.createTerminal({
                name: "Scout Console",
                iconPath: new vscode.ThemeIcon("search"),
            });
        }
        return this.terminalOutput;
    }
    write(message) {
        if (this.useTerminal) {
            const terminal = this.getOrCreateTerminal();
            terminal.sendText(`echo "${this.escapeForTerminal(message)}"`, false);
        }
        else {
            this.outputChannel.appendLine(message);
        }
    }
    escapeForTerminal(text) {
        return text
            .replace(/"/g, '\\"')
            .replace(/\$/g, "\\$")
            .replace(/`/g, "\\`");
    }
    show() {
        this.updateOutputLocation();
        if (this.useTerminal) {
            this.getOrCreateTerminal().show();
        }
        else {
            this.outputChannel.show(true);
        }
    }
    hide() {
        if (this.useTerminal) {
            // Can't hide terminal programmatically, but we can stop using it
        }
        else {
            this.outputChannel.hide();
        }
    }
    clear() {
        if (this.useTerminal) {
            const terminal = this.getOrCreateTerminal();
            terminal.sendText("clear", true);
        }
        else {
            this.outputChannel.clear();
        }
        this.eventCount = 0;
    }
    logAnalysisStart(fileName, fileUri) {
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
    logAnalysisComplete(errorCount, warningCount, infoCount, debugCount, duration) {
        const total = errorCount + warningCount + infoCount + debugCount;
        this.write("");
        this.write("─".repeat(80));
        this.write(`✓ ANALYSIS COMPLETE`);
        this.write(`  Duration: ${duration}ms | Total Issues: ${total}`);
        this.write(`  🟣 ${debugCount} debug | 🔵 ${infoCount} info | 🟡 ${warningCount} warnings | 🔴 ${errorCount} errors`);
        this.write("─".repeat(80));
        this.write("");
    }
    logWithSeverity(severity, line, message, category, timestamp, fileUri) {
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
        }
        else {
            this.write(`  ${icon} ${label} Line ${lineNum} ${cat} ${time}: ${message}`);
        }
    }
    logError(line, message, category, timestamp, fileUri) {
        this.logWithSeverity("error", line, message, category, timestamp, fileUri);
    }
    logWarning(line, message, category, timestamp, fileUri) {
        this.logWithSeverity("warning", line, message, category, timestamp, fileUri);
    }
    logInfo(line, message, category, timestamp, fileUri) {
        this.logWithSeverity("info", line, message, category, timestamp, fileUri);
    }
    logResult(severity, line, message, category, timestamp, fileUri) {
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
                this.logWithSeverity("debug", line, message, category, timestamp, fileUri);
                break;
        }
    }
    logMessage(message) {
        this.write(message);
    }
    logSection(title) {
        this.write("");
        this.write(`▼ ${title}`);
        this.write("─".repeat(80));
    }
    logSummary(summary) {
        this.write("");
        this.write("═".repeat(80));
        this.write("📊 SUMMARY");
        this.write("═".repeat(80));
        this.write(`  Files Analyzed: ${summary.totalFiles}`);
        this.write(`  Total Issues: ${summary.totalIssues}`);
        this.write(`    🔴 Errors: ${summary.errors} (${this.percentage(summary.errors, summary.totalIssues)}%)`);
        this.write(`    🟡 Warnings: ${summary.warnings} (${this.percentage(summary.warnings, summary.totalIssues)}%)`);
        this.write(`    🔵 Info: ${summary.infos} (${this.percentage(summary.infos, summary.totalIssues)}%)`);
        if (summary.categories.length > 0) {
            this.write(`  Categories Found: ${summary.categories.length}`);
            this.write(`    ${summary.categories.slice(0, 5).join(", ")}${summary.categories.length > 5 ? "..." : ""}`);
        }
        if (summary.timeRange) {
            this.write(`  Time Range: ${summary.timeRange.start.toLocaleString()} - ${summary.timeRange.end.toLocaleString()}`);
        }
        this.write("═".repeat(80));
        this.write("");
    }
    logFilterApplied(filterInfo) {
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
            this.write(`  Time Range: ${filterInfo.timeRange.start.toLocaleString()} - ${filterInfo.timeRange.end.toLocaleString()}`);
        }
        this.write(`  Results: ${filterInfo.resultCount} of ${filterInfo.totalCount} (${this.percentage(filterInfo.resultCount, filterInfo.totalCount)}%)`);
        this.write("─".repeat(80));
        this.write("");
    }
    logExport(fileName, itemCount) {
        this.write("");
        this.write(`💾 EXPORTED ${itemCount} results to: ${fileName}`);
        this.write("");
    }
    logClear() {
        this.write("");
        this.write("🗑️  All diagnostics cleared");
        this.write("");
    }
    logPatternLoad(count) {
        this.write(`✓ Loaded ${count} analysis patterns`);
    }
    logFileIgnored(fileName, reason) {
        this.write(`⚠️  File ignored: ${fileName} (${reason})`);
    }
    logPerformance(metric, value, unit) {
        this.write(`⏱️  ${metric}: ${value}${unit}`);
    }
    dispose() {
        this.outputChannel.dispose();
        if (this.terminalOutput) {
            this.terminalOutput.dispose();
        }
    }
    percentage(value, total) {
        if (total === 0)
            return 0;
        return Math.round((value / total) * 100);
    }
    // Console-style real-time streaming output
    stream(severity, message, details) {
        const time = details?.timestamp
            ? details.timestamp.toLocaleTimeString()
            : new Date().toLocaleTimeString();
        const icon = severity === "error"
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
        }
        else if (details?.line) {
            this.write(`  ${icon} Line ${details.line + 1} ${cat} ${time}: ${message}`);
        }
        else {
            this.write(`${icon} ${time} ${cat} ${message}`.trim());
        }
    }
    // Table-style output for structured data
    table(headers, rows, title) {
        if (title) {
            this.write("");
            this.write(title);
        }
        // Calculate column widths
        const widths = headers.map((h, i) => {
            const maxRowWidth = Math.max(...rows.map((r) => (r[i] || "").length));
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
    progress(current, total, label) {
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
exports.ScoutConsole = ScoutConsole;
//# sourceMappingURL=scoutConsole.js.map