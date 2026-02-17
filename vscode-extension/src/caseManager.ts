import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

/**
 * Represents a case with its metadata and file locations
 */
export interface CaseInfo {
    caseId: string;
    caseName: string;
    description?: string;
    createdDate: Date;
    downloadedDate: Date;
    sourcePath: string;
    extractedPath: string;
    logFiles: string[];
    status: 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';
    errorMessage?: string;
}

/**
 * Manages case files - downloading, extracting, and organizing log archives
 */
export class CaseManager {
    private cases: Map<string, CaseInfo> = new Map();
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private baseCasesPath: string;
    private readonly CASES_STORAGE_KEY = 'logScoutAnalyzer.cases';

    constructor(
        private context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        this.outputChannel = outputChannel;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'logScoutAnalyzer.showCasesList';

        // Set up base cases directory
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.baseCasesPath = path.join(workspaceFolders[0].uri.fsPath, '.log-scout-cases');
        } else {
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
    public getBaseCasesPath(): string {
        return this.baseCasesPath;
    }

    /**
     * Get all managed cases
     */
    public getAllCases(): CaseInfo[] {
        return Array.from(this.cases.values());
    }

    /**
     * Get a specific case by ID
     */
    public getCase(caseId: string): CaseInfo | undefined {
        return this.cases.get(caseId);
    }

    /**
     * Download a case file from a URL
     */
    public async downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo> {
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
            const caseInfo: CaseInfo = {
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

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.log(`Error downloading case: ${errorMsg}`, true);
            throw error;
        }
    }

    /**
     * Import a case from a local archive file
     */
    public async importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo> {
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
            const caseInfo: CaseInfo = {
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

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.log(`Error importing case: ${errorMsg}`, true);
            throw error;
        }
    }

    /**
     * Extract an archive for a case
     */
    public async extractCase(caseId: string): Promise<void> {
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
            } else if (ext === '.tar' || ext === '.tgz' || ext === '.gz') {
                await this.extractTar(caseInfo.sourcePath, caseInfo.extractedPath);
            } else if (ext === '.7z') {
                await this.extract7z(caseInfo.sourcePath, caseInfo.extractedPath);
            } else {
                throw new Error(`Unsupported archive format: ${ext}`);
            }

            // Discover log files
            caseInfo.logFiles = await this.discoverLogFiles(caseInfo.extractedPath);
            caseInfo.status = 'ready';

            this.log(`Extraction completed. Found ${caseInfo.logFiles.length} log files.`);
            this.updateStatusBar();
            await this.saveCases();

            // Show notification
            vscode.window.showInformationMessage(
                `Case ${caseId} is ready with ${caseInfo.logFiles.length} log files.`
            );

        } catch (error) {
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
    public async openCase(caseId: string): Promise<void> {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }

        if (caseInfo.status !== 'ready') {
            vscode.window.showWarningMessage(`Case ${caseId} is not ready yet (status: ${caseInfo.status})`);
            return;
        }

        // Add case logs folder to workspace
        const success = vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
            0,
            { uri: vscode.Uri.file(caseInfo.extractedPath), name: `Case: ${caseInfo.caseName}` }
        );

        if (success) {
            this.log(`Opened case: ${caseId}`);
            vscode.window.showInformationMessage(`Case ${caseInfo.caseName} opened in workspace`);
        }
    }

    /**
     * Delete a case and all its files
     */
    public async deleteCase(caseId: string, deleteFiles: boolean = true): Promise<void> {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }

        // Confirm deletion
        const action = await vscode.window.showWarningMessage(
            `Delete case "${caseInfo.caseName}"?`,
            { modal: true },
            'Delete Files',
            'Remove from List Only'
        );

        if (!action) {
            return; // User cancelled
        }

        deleteFiles = action === 'Delete Files';

        if (deleteFiles) {
            const casePath = path.join(this.baseCasesPath, caseId);
            try {
                await this.removeDirectory(casePath);
                this.log(`Deleted case files: ${caseId}`);
            } catch (error) {
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
    public async updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void> {
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
    public getCaseLogFiles(caseId: string): string[] {
        const caseInfo = this.cases.get(caseId);
        return caseInfo ? caseInfo.logFiles : [];
    }

    // ==================== Private Helper Methods ====================

    private generateCaseId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `case-${timestamp}-${random}`;
    }

    private ensureDirectory(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    private async removeDirectory(dirPath: string): Promise<void> {
        if (fs.existsSync(dirPath)) {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
        }
    }

    private async downloadFile(url: string, destination: string, caseId: string): Promise<void> {
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
                    } else {
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

    private async extractZip(archivePath: string, targetPath: string): Promise<void> {
        // Try to use PowerShell on Windows, unzip on Unix
        const isWindows = process.platform === 'win32';

        if (isWindows) {
            const command = `powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${targetPath}' -Force"`;
            await execAsync(command);
        } else {
            const command = `unzip -o "${archivePath}" -d "${targetPath}"`;
            await execAsync(command);
        }
    }

    private async extractTar(archivePath: string, targetPath: string): Promise<void> {
        const ext = path.extname(archivePath).toLowerCase();
        let command: string;

        if (ext === '.tgz' || archivePath.endsWith('.tar.gz')) {
            command = `tar -xzf "${archivePath}" -C "${targetPath}"`;
        } else {
            command = `tar -xf "${archivePath}" -C "${targetPath}"`;
        }

        await execAsync(command);
    }

    private async extract7z(archivePath: string, targetPath: string): Promise<void> {
        // Requires 7-Zip to be installed
        const command = `7z x "${archivePath}" -o"${targetPath}" -y`;
        await execAsync(command);
    }

    private async discoverLogFiles(directory: string): Promise<string[]> {
        const logFiles: string[] = [];
        const logExtensions = ['.log', '.txt', '.out', '.err', '.trace'];

        async function scanDirectory(dir: string) {
            try {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (logExtensions.includes(ext)) {
                            logFiles.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        }

        await scanDirectory(directory);
        return logFiles;
    }

    private async loadCases(): Promise<void> {
        try {
            const stored = this.context.globalState.get<any[]>(this.CASES_STORAGE_KEY);
            if (stored && Array.isArray(stored)) {
                for (const data of stored) {
                    const caseInfo: CaseInfo = {
                        ...data,
                        createdDate: new Date(data.createdDate),
                        downloadedDate: new Date(data.downloadedDate)
                    };
                    this.cases.set(caseInfo.caseId, caseInfo);
                }
                this.log(`Loaded ${this.cases.size} cases from storage`);
            }
        } catch (error) {
            this.log(`Error loading cases: ${error}`, true);
        }
        this.updateStatusBar();
    }

    private async saveCases(): Promise<void> {
        try {
            const casesArray = Array.from(this.cases.values());
            await this.context.globalState.update(this.CASES_STORAGE_KEY, casesArray);
        } catch (error) {
            this.log(`Error saving cases: ${error}`, true);
        }
    }

    private updateStatusBar(): void {
        const totalCases = this.cases.size;
        const readyCases = Array.from(this.cases.values()).filter(c => c.status === 'ready').length;

        if (totalCases > 0) {
            this.statusBarItem.text = `$(briefcase) Cases: ${readyCases}/${totalCases}`;
            this.statusBarItem.tooltip = `${readyCases} cases ready out of ${totalCases} total`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    private log(message: string, isError: boolean = false): void {
        const timestamp = new Date().toISOString();
        const prefix = isError ? '[ERROR]' : '[INFO]';
        this.outputChannel.appendLine(`${timestamp} ${prefix} ${message}`);
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
