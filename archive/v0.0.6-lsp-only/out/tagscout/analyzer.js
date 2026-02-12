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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagScoutAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const adm_zip_1 = __importDefault(require("adm-zip"));
class TagScoutAnalyzer {
    constructor(lspClient) {
        this.tempDir = null;
        this.lspClient = lspClient;
    }
    /**
     * Analyze a log file or archive using TagScout patterns
     */
    async analyze(filePath, progress, token) {
        try {
            // Step 1: Extract archive if needed
            progress.report({ message: "Extracting files...", increment: 10 });
            const extractedFiles = await this.extractFiles(filePath);
            if (token.isCancellationRequested) {
                this.cleanup();
                throw new Error("Analysis cancelled");
            }
            // Step 2: Detect product type
            progress.report({ message: "Detecting product...", increment: 20 });
            const productInfo = await this.detectProduct(extractedFiles);
            if (token.isCancellationRequested) {
                this.cleanup();
                throw new Error("Analysis cancelled");
            }
            // Step 3: Patterns are already loaded in LSP from TagScout MongoDB
            progress.report({
                message: `Using TagScout patterns for ${productInfo.product}...`,
                increment: 30,
            });
            if (token.isCancellationRequested) {
                this.cleanup();
                throw new Error("Analysis cancelled");
            }
            // Step 4: Analyze logs
            progress.report({ message: "Analyzing logs...", increment: 50 });
            const matches = await this.analyzeFiles(extractedFiles, productInfo.product, progress, token);
            if (token.isCancellationRequested) {
                this.cleanup();
                throw new Error("Analysis cancelled");
            }
            // Step 5: Extract client info and config files
            progress.report({
                message: "Extracting client information...",
                increment: 80,
            });
            const clientInfo = await this.extractClientInfo(extractedFiles, productInfo);
            const configFiles = await this.findConfigFiles(extractedFiles);
            if (token.isCancellationRequested) {
                this.cleanup();
                throw new Error("Analysis cancelled");
            }
            // Step 6: Build results
            progress.report({ message: "Building timeline...", increment: 90 });
            const results = this.buildResults(matches, clientInfo, configFiles);
            progress.report({ message: "Complete!", increment: 100 });
            // Cleanup temp files
            this.cleanup();
            return results;
        }
        catch (error) {
            this.cleanup();
            throw error;
        }
    }
    /**
     * Extract files from archive or return single file
     */
    async extractFiles(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === ".zip") {
            return this.extractZip(filePath);
        }
        else if (ext === ".7z") {
            // TODO: Implement 7z extraction
            throw new Error("7z extraction not yet implemented");
        }
        else if ([".tar", ".gz", ".tgz"].includes(ext)) {
            // TODO: Implement tar extraction
            throw new Error("tar extraction not yet implemented");
        }
        else if ([".log", ".txt"].includes(ext)) {
            // Single log file
            return [filePath];
        }
        throw new Error(`Unsupported file type: ${ext}`);
    }
    /**
     * Extract ZIP archive
     */
    async extractZip(zipPath) {
        try {
            const zip = new adm_zip_1.default(zipPath);
            this.tempDir = path.join(os.tmpdir(), `tagscout-${Date.now()}`);
            fs.mkdirSync(this.tempDir, { recursive: true });
            zip.extractAllTo(this.tempDir, true);
            // Find all log files recursively
            return this.findLogFiles(this.tempDir);
        }
        catch (error) {
            throw new Error(`Failed to extract ZIP: ${error}`);
        }
    }
    /**
     * Find all log files in a directory recursively
     */
    findLogFiles(dir) {
        const logFiles = [];
        const scan = (currentDir) => {
            try {
                const files = fs.readdirSync(currentDir);
                for (const file of files) {
                    const fullPath = path.join(currentDir, file);
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            scan(fullPath);
                        }
                        else if (file.match(/\.(log|txt)$/i)) {
                            logFiles.push(fullPath);
                        }
                    }
                    catch (e) {
                        // Skip files we can't read
                        console.warn(`Cannot access: ${fullPath}`);
                    }
                }
            }
            catch (e) {
                console.warn(`Cannot read directory: ${currentDir}`);
            }
        };
        scan(dir);
        return logFiles;
    }
    /**
     * Detect product type from log content
     */
    async detectProduct(files) {
        if (files.length === 0) {
            return { product: "Unknown", version: "Unknown" };
        }
        // Read first file to detect product
        try {
            const content = fs
                .readFileSync(files[0], "utf8")
                .substring(0, 50000);
            // Jabber detection
            if (content.includes("Jabber") ||
                content.includes("csf.ecc") ||
                content.includes("CiscoJabber")) {
                const versionMatch = content.match(/Jabber.*?(\d+\.\d+\.\d+\.?\d*)/i);
                return {
                    product: "Jabber for Windows",
                    version: versionMatch ? versionMatch[1] : "Unknown",
                };
            }
            // CUCM detection
            if (content.includes("CallManager") ||
                content.includes("CCM") ||
                content.includes("Cisco Unified")) {
                const versionMatch = content.match(/CallManager.*?(\d+\.\d+)/);
                return {
                    product: "Cisco Unified Communications Manager",
                    version: versionMatch ? versionMatch[1] : "Unknown",
                };
            }
            // Webex detection
            if (content.includes("webex") ||
                content.includes("spark") ||
                content.includes("Webex")) {
                const versionMatch = content.match(/[Ww]ebex.*?(\d+\.\d+\.\d+)/);
                return {
                    product: "Webex",
                    version: versionMatch ? versionMatch[1] : "Unknown",
                };
            }
            // Generic log file
            return { product: "Generic Log", version: "Unknown" };
        }
        catch (error) {
            return { product: "Unknown", version: "Unknown" };
        }
    }
    /**
     * Analyze log files with pattern matching
     */
    async analyzeFiles(files, product, progress, token) {
        const matches = [];
        const incrementPerFile = 30 / files.length;
        for (let i = 0; i < files.length; i++) {
            if (token.isCancellationRequested) {
                break;
            }
            const file = files[i];
            progress.report({
                message: `Analyzing ${path.basename(file)} (${i + 1}/${files.length})...`,
            });
            try {
                const fileMatches = await this.analyzeFile(file, product);
                matches.push(...fileMatches);
            }
            catch (error) {
                console.error(`Error analyzing ${file}:`, error);
            }
            progress.report({ increment: incrementPerFile });
        }
        // Sort matches chronologically
        matches.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return matches;
    }
    /**
     * Analyze a single log file using LSP with TagScout MongoDB patterns
     */
    async analyzeFile(filePath, product) {
        const matches = [];
        const fileName = path.basename(filePath);
        try {
            const content = fs.readFileSync(filePath, "utf8");
            const uri = vscode.Uri.file(filePath);
            // Open document in LSP (this triggers analysis with TagScout patterns)
            const document = await vscode.workspace.openTextDocument(uri);
            // Wait a moment for LSP to analyze
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Get diagnostics from LSP (these are pattern matches from TagScout MongoDB)
            const diagnostics = vscode.languages.getDiagnostics(uri);
            console.log(`LSP found ${diagnostics.length} matches in ${fileName}`);
            // Convert LSP diagnostics to LogMatch format
            const lines = content.split("\n");
            for (const diagnostic of diagnostics) {
                const lineNumber = diagnostic.range.start.line;
                const line = lines[lineNumber] || "";
                const timestamp = this.extractTimestamp(line);
                const severity = this.diagnosticSeverityToString(diagnostic.severity);
                matches.push({
                    timestamp,
                    severity,
                    message: diagnostic.message,
                    pattern: {
                        id: diagnostic.code?.toString() || "unknown",
                        name: diagnostic.source || "TagScout Pattern",
                        category: this.categorizeFromSeverity(severity),
                    },
                    file: fileName,
                    lineNumber: lineNumber + 1,
                    rawLine: line,
                });
            }
            // Close the document to free resources
            await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        }
        catch (error) {
            console.error(`Error analyzing file ${filePath} with LSP:`, error);
        }
        return matches;
    }
    /**
     * Convert LSP diagnostic severity to string
     */
    diagnosticSeverityToString(severity) {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return "error";
            case vscode.DiagnosticSeverity.Warning:
                return "warning";
            case vscode.DiagnosticSeverity.Information:
            case vscode.DiagnosticSeverity.Hint:
            default:
                return "info";
        }
    }
    /**
     * Categorize based on severity
     */
    categorizeFromSeverity(severity) {
        switch (severity) {
            case "error":
                return "Errors";
            case "warning":
                return "Warnings";
            case "info":
            default:
                return "Information";
        }
    }
    /**
     * Extract timestamp from log line
     */
    extractTimestamp(line) {
        // Try various timestamp formats
        // Format: 2024-01-10 14:23:45.123 or 2024-01-10 14:23:45,123
        let match = line.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})[.,]?(\d{3})?/);
        if (match) {
            return new Date(`${match[1]}T${match[2]}.${match[3] || "000"}`);
        }
        // Format: 2024/01/10 14:23:45
        match = line.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
        if (match) {
            return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}`);
        }
        // Format: Jan 10 14:23:45 (assume current year)
        match = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/);
        if (match) {
            const year = new Date().getFullYear();
            return new Date(`${match[1]} ${match[2]}, ${year} ${match[3]}`);
        }
        // Default to now if no timestamp found
        return new Date();
    }
    /**
     * Extract client information from logs
     */
    async extractClientInfo(files, baseInfo) {
        const clientInfo = { ...baseInfo };
        try {
            if (files.length > 0) {
                const content = fs
                    .readFileSync(files[0], "utf8")
                    .substring(0, 100000);
                // Extract user
                const userMatch = content.match(/user[:\s]+([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+)/i);
                if (userMatch) {
                    clientInfo.user = userMatch[1];
                }
                // Extract device/MAC
                const deviceMatch = content.match(/SEP([0-9A-F]{12})/i);
                if (deviceMatch) {
                    clientInfo.device = `SEP${deviceMatch[1]}`;
                }
            }
        }
        catch (error) {
            console.error("Error extracting client info:", error);
        }
        return clientInfo;
    }
    /**
     * Find configuration files
     */
    async findConfigFiles(files) {
        const configFiles = [];
        for (const file of files) {
            const fileName = path.basename(file).toLowerCase();
            if (fileName.includes("config") ||
                fileName.endsWith(".xml") ||
                fileName.endsWith(".properties") ||
                fileName.endsWith(".conf") ||
                fileName.endsWith(".ini")) {
                configFiles.push(path.basename(file));
            }
        }
        return configFiles;
    }
    /**
     * Build final analysis results
     */
    buildResults(matches, clientInfo, configFiles) {
        const errorCount = matches.filter((m) => m.severity === "error").length;
        const warningCount = matches.filter((m) => m.severity === "warning").length;
        const infoCount = matches.filter((m) => m.severity === "info").length;
        const timestamps = matches
            .map((m) => m.timestamp)
            .sort((a, b) => a.getTime() - b.getTime());
        return {
            totalMatches: matches.length,
            errorCount,
            warningCount,
            infoCount,
            timeRange: {
                from: timestamps[0] || new Date(),
                to: timestamps[timestamps.length - 1] || new Date(),
            },
            matches,
            clientInfo,
            configFiles,
        };
    }
    /**
     * Cleanup temporary files
     */
    cleanup() {
        if (this.tempDir && fs.existsSync(this.tempDir)) {
            try {
                fs.rmSync(this.tempDir, { recursive: true, force: true });
                console.log(`Cleaned up temp directory: ${this.tempDir}`);
            }
            catch (error) {
                console.error(`Failed to cleanup temp directory: ${error}`);
            }
        }
        this.tempDir = null;
    }
}
exports.TagScoutAnalyzer = TagScoutAnalyzer;
//# sourceMappingURL=analyzer.js.map