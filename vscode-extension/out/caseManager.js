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
exports.CaseManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const util_1 = require("util");
const child_process_1 = require("child_process");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Manages case files - downloading, extracting, and organizing log archives
 */
class CaseManager {
    constructor(context, outputChannel) {
        this.context = context;
        this.cases = new Map();
        this.CASES_STORAGE_KEY = 'logScoutAnalyzer.cases';
        this.outputChannel = outputChannel;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'logScoutAnalyzer.showCasesList';
        // Set up base cases directory
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.baseCasesPath = path.join(workspaceFolders[0].uri.fsPath, '.log-scout-cases');
        }
        else {
            // Fallback to extension storage path
            this.baseCasesPath = path.join(context.globalStorageUri.fsPath, 'cases');
        }
        // Ensure base directory exists
        this.ensureDirectory(this.baseCasesPath);
        // Load persisted cases
        this.loadCases();
    }
    /**
     * Get the base path where all cases are stored
     */
    getBaseCasesPath() {
        return this.baseCasesPath;
    }
    /**
     * Get all managed cases
     */
    getAllCases() {
        return Array.from(this.cases.values());
    }
    /**
     * Get a specific case by ID
     */
    getCase(caseId) {
        return this.cases.get(caseId);
    }
    /**
     * Download a case file from a URL
     */
    async downloadCaseFromUrl(url, caseId) {
        try {
            this.log(`Starting download from: ${url}`);
            // Generate case ID if not provided
            if (!caseId) {
                caseId = this.generateCaseId();
            }
            // Create case directory
            const casePath = path.join(this.baseCasesPath, caseId);
            this.ensureDirectory(casePath);
            // Determine filename from URL
            const urlPath = new URL(url).pathname;
            const fileName = path.basename(urlPath) || `case-${caseId}.zip`;
            const downloadPath = path.join(casePath, 'archive', fileName);
            this.ensureDirectory(path.dirname(downloadPath));
            // Create case info
            const caseInfo = {
                caseId,
                caseName: caseId,
                description: `Downloaded from ${url}`,
                createdDate: new Date(),
                downloadedDate: new Date(),
                sourcePath: downloadPath,
                extractedPath: path.join(casePath, 'logs'),
                logFiles: [],
                status: 'downloading'
            };
            this.cases.set(caseId, caseInfo);
            this.updateStatusBar();
            await this.saveCases();
            // Download file
            await this.downloadFile(url, downloadPath, caseId);
            this.log(`Download completed: ${downloadPath}`);
            // Extract archive
            await this.extractCase(caseId);
            return caseInfo;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.log(`Error downloading case: ${errorMsg}`, true);
            throw error;
        }
    }
    /**
     * Import a case from a local archive file
     */
    async importCaseFromLocal(archivePath, caseId) {
        try {
            this.log(`Importing case from: ${archivePath}`);
            // Verify file exists
            if (!fs.existsSync(archivePath)) {
                throw new Error(`File not found: ${archivePath}`);
            }
            // Generate case ID if not provided
            if (!caseId) {
                caseId = this.generateCaseId();
            }
            // Create case directory
            const casePath = path.join(this.baseCasesPath, caseId);
            this.ensureDirectory(casePath);
            const fileName = path.basename(archivePath);
            const targetPath = path.join(casePath, 'archive', fileName);
            this.ensureDirectory(path.dirname(targetPath));
            // Copy archive to case directory
            await fs.promises.copyFile(archivePath, targetPath);
            // Create case info
            const caseInfo = {
                caseId,
                caseName: caseId,
                description: `Imported from ${archivePath}`,
                createdDate: new Date(),
                downloadedDate: new Date(),
                sourcePath: targetPath,
                extractedPath: path.join(casePath, 'logs'),
                logFiles: [],
                status: 'extracting'
            };
            this.cases.set(caseId, caseInfo);
            this.updateStatusBar();
            await this.saveCases();
            // Extract archive
            await this.extractCase(caseId);
            return caseInfo;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.log(`Error importing case: ${errorMsg}`, true);
            throw error;
        }
    }
    /**
     * Extract an archive for a case
     */
    async extractCase(caseId) {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }
        try {
            this.log(`Extracting case: ${caseId}`);
            caseInfo.status = 'extracting';
            this.updateStatusBar();
            await this.saveCases();
            // Ensure extraction directory exists
            this.ensureDirectory(caseInfo.extractedPath);
            // Determine archive type and extract
            const ext = path.extname(caseInfo.sourcePath).toLowerCase();
            if (ext === '.zip') {
                await this.extractZip(caseInfo.sourcePath, caseInfo.extractedPath);
            }
            else if (ext === '.tar' || ext === '.tgz' || ext === '.gz') {
                await this.extractTar(caseInfo.sourcePath, caseInfo.extractedPath);
            }
            else if (ext === '.7z') {
                await this.extract7z(caseInfo.sourcePath, caseInfo.extractedPath);
            }
            else {
                throw new Error(`Unsupported archive format: ${ext}`);
            }
            // Discover log files
            caseInfo.logFiles = await this.discoverLogFiles(caseInfo.extractedPath);
            caseInfo.status = 'ready';
            this.log(`Extraction completed. Found ${caseInfo.logFiles.length} log files.`);
            this.updateStatusBar();
            await this.saveCases();
            // Show notification
            vscode.window.showInformationMessage(`Case ${caseId} is ready with ${caseInfo.logFiles.length} log files.`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            caseInfo.status = 'error';
            caseInfo.errorMessage = errorMsg;
            this.log(`Error extracting case: ${errorMsg}`, true);
            await this.saveCases();
            throw error;
        }
    }
    /**
     * Open a case - shows the case folder in workspace
     */
    async openCase(caseId) {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }
        if (caseInfo.status !== 'ready') {
            vscode.window.showWarningMessage(`Case ${caseId} is not ready yet (status: ${caseInfo.status})`);
            return;
        }
        // Add case logs folder to workspace
        const success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, 0, { uri: vscode.Uri.file(caseInfo.extractedPath), name: `Case: ${caseInfo.caseName}` });
        if (success) {
            this.log(`Opened case: ${caseId}`);
            vscode.window.showInformationMessage(`Case ${caseInfo.caseName} opened in workspace`);
        }
    }
    /**
     * Delete a case and all its files
     */
    async deleteCase(caseId, deleteFiles = true) {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }
        // Confirm deletion
        const action = await vscode.window.showWarningMessage(`Delete case "${caseInfo.caseName}"?`, { modal: true }, 'Delete Files', 'Remove from List Only');
        if (!action) {
            return; // User cancelled
        }
        deleteFiles = action === 'Delete Files';
        if (deleteFiles) {
            const casePath = path.join(this.baseCasesPath, caseId);
            try {
                await this.removeDirectory(casePath);
                this.log(`Deleted case files: ${caseId}`);
            }
            catch (error) {
                this.log(`Error deleting case files: ${error}`, true);
            }
        }
        this.cases.delete(caseId);
        await this.saveCases();
        this.updateStatusBar();
        this.log(`Removed case from list: ${caseId}`);
    }
    /**
     * Update case metadata
     */
    async updateCaseInfo(caseId, updates) {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }
        Object.assign(caseInfo, updates);
        await this.saveCases();
    }
    /**
     * Get log files for a specific case
     */
    getCaseLogFiles(caseId) {
        const caseInfo = this.cases.get(caseId);
        return caseInfo ? caseInfo.logFiles : [];
    }
    // ==================== Private Helper Methods ====================
    generateCaseId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `case-${timestamp}-${random}`;
    }
    ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    async removeDirectory(dirPath) {
        if (fs.existsSync(dirPath)) {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
        }
    }
    async downloadFile(url, destination, caseId) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const file = fs.createWriteStream(destination);
            const request = protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    file.close();
                    fs.unlinkSync(destination);
                    if (response.headers.location) {
                        this.downloadFile(response.headers.location, destination, caseId)
                            .then(resolve)
                            .catch(reject);
                    }
                    else {
                        reject(new Error('Redirect with no location header'));
                    }
                    return;
                }
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(destination);
                    reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }
                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedSize = 0;
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0) {
                        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                        this.statusBarItem.text = `$(cloud-download) Downloading case ${caseId}: ${percent}%`;
                        this.statusBarItem.show();
                    }
                });
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            });
            request.on('error', (err) => {
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(err);
            });
            file.on('error', (err) => {
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(err);
            });
        });
    }
    async extractZip(archivePath, targetPath) {
        // Try to use PowerShell on Windows, unzip on Unix
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            const command = `powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${targetPath}' -Force"`;
            await execAsync(command);
        }
        else {
            const command = `unzip -o "${archivePath}" -d "${targetPath}"`;
            await execAsync(command);
        }
    }
    async extractTar(archivePath, targetPath) {
        const ext = path.extname(archivePath).toLowerCase();
        let command;
        if (ext === '.tgz' || archivePath.endsWith('.tar.gz')) {
            command = `tar -xzf "${archivePath}" -C "${targetPath}"`;
        }
        else {
            command = `tar -xf "${archivePath}" -C "${targetPath}"`;
        }
        await execAsync(command);
    }
    async extract7z(archivePath, targetPath) {
        // Requires 7-Zip to be installed
        const command = `7z x "${archivePath}" -o"${targetPath}" -y`;
        await execAsync(command);
    }
    async discoverLogFiles(directory) {
        const logFiles = [];
        const logExtensions = ['.log', '.txt', '.out', '.err', '.trace'];
        async function scanDirectory(dir) {
            try {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    }
                    else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (logExtensions.includes(ext)) {
                            logFiles.push(fullPath);
                        }
                    }
                }
            }
            catch (error) {
                // Skip directories we can't read
            }
        }
        await scanDirectory(directory);
        return logFiles;
    }
    async loadCases() {
        try {
            const stored = this.context.globalState.get(this.CASES_STORAGE_KEY);
            if (stored && Array.isArray(stored)) {
                for (const data of stored) {
                    const caseInfo = {
                        ...data,
                        createdDate: new Date(data.createdDate),
                        downloadedDate: new Date(data.downloadedDate)
                    };
                    this.cases.set(caseInfo.caseId, caseInfo);
                }
                this.log(`Loaded ${this.cases.size} cases from storage`);
            }
        }
        catch (error) {
            this.log(`Error loading cases: ${error}`, true);
        }
        this.updateStatusBar();
    }
    async saveCases() {
        try {
            const casesArray = Array.from(this.cases.values());
            await this.context.globalState.update(this.CASES_STORAGE_KEY, casesArray);
        }
        catch (error) {
            this.log(`Error saving cases: ${error}`, true);
        }
    }
    updateStatusBar() {
        const totalCases = this.cases.size;
        const readyCases = Array.from(this.cases.values()).filter(c => c.status === 'ready').length;
        if (totalCases > 0) {
            this.statusBarItem.text = `$(briefcase) Cases: ${readyCases}/${totalCases}`;
            this.statusBarItem.tooltip = `${readyCases} cases ready out of ${totalCases} total`;
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.hide();
        }
    }
    log(message, isError = false) {
        const timestamp = new Date().toISOString();
        const prefix = isError ? '[ERROR]' : '[INFO]';
        this.outputChannel.appendLine(`${timestamp} ${prefix} ${message}`);
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.CaseManager = CaseManager;
//# sourceMappingURL=caseManager.js.map