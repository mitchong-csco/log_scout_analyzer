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
exports.FileLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileLogger {
    constructor(context) {
        this.enabled = true;
        // Log to workspace storage directory
        const storageUri = context.storageUri || context.globalStorageUri;
        const logDir = storageUri.fsPath;
        // Ensure directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        // Create log file with date
        const date = new Date().toISOString().split('T')[0];
        this.logFilePath = path.join(logDir, `log-scout-${date}.log`);
        // Initialize log file with header
        const header = `\n${"=".repeat(80)}\nLog Scout Analyzer - Session Started: ${new Date().toISOString()}\n${"=".repeat(80)}\n`;
        fs.appendFileSync(this.logFilePath, header);
        this.log(`Log file: ${this.logFilePath}`);
    }
    log(message) {
        if (!this.enabled)
            return;
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${message}\n`;
        try {
            fs.appendFileSync(this.logFilePath, logLine);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    logAnalysisStart(fileName, uri) {
        this.log(`\n▶ Analysis started: ${fileName}`);
        this.log(`  URI: ${uri.toString()}`);
    }
    logResult(severity, line, message, category, _timestamp, _fileUri) {
        const severityIcon = {
            error: "ERROR",
            warning: "WARN ",
            info: "INFO ",
            debug: "DEBUG"
        }[severity];
        const cat = category ? `[${category}] ` : "";
        this.log(`  ${severityIcon} Line ${line + 1}: ${cat}${message}`);
    }
    logAnalysisComplete(errorCount, warningCount, infoCount, debugCount, duration) {
        this.log(`✓ Analysis complete: ${errorCount}E ${warningCount}W ${infoCount}I ${debugCount}D (${duration}ms)`);
    }
    logCacheOperation(message) {
        this.log(`  📦 ${message}`);
    }
    logExport(fileName, resultCount) {
        this.log(`📤 Export: ${fileName} (${resultCount} results)`);
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        this.log(enabled ? "Logging enabled" : "Logging disabled");
    }
    getLogPath() {
        return this.logFilePath;
    }
    dispose() {
        this.log(`${"=".repeat(80)}\nSession ended: ${new Date().toISOString()}\n${"=".repeat(80)}\n`);
    }
}
exports.FileLogger = FileLogger;
//# sourceMappingURL=fileLogger.js.map