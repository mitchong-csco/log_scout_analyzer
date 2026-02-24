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
exports.BundleItem = exports.BundleTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const lspClient_1 = require("./lspClient");
const path = __importStar(require("path"));
const icons_1 = require("./icons");
/**
 * Bundle tree provider for VS Code sidebar
 * Shows all bundles and their logs
 */
class BundleTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.importingBundles = new Map();
        this.bundles = [];
        // Listen for progress notifications from LSP
        const client = (0, lspClient_1.getLSPClient)();
        if (client) {
            client.onNotification("$/progress", (params) => {
                this.handleProgressNotification(params);
            });
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show all bundles including importing ones
            const loadedBundles = await this.loadBundles();
            // Filter out any duplicates between optimistic bundles and loaded bundles
            const optimisticBundles = this.bundles.filter((b) => b.type === "bundle-importing");
            return [...optimisticBundles, ...loadedBundles];
        }
        else if (element.type === "bundle") {
            // Show logs in this bundle
            return this.loadBundleLogs(element.bundleId);
        }
        else {
            // Logs have no children
            return [];
        }
    }
    async loadBundles() {
        // Check if workspace is available
        if (!vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length === 0) {
            return [
                new BundleItem("📁 No workspace open", "", 0, 0, "Open a folder to start using Log Scout bundles", "info"),
            ];
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;
        try {
            // Check if bundles directory exists
            const bundlesDir = vscode.Uri.file(bundlesPath);
            const stat = await vscode.workspace.fs.stat(bundlesDir);
            if (stat.type !== vscode.FileType.Directory) {
                return [];
            }
            // Read index.json
            const indexPath = vscode.Uri.file(`${bundlesPath}/index.json`);
            const indexData = await vscode.workspace.fs.readFile(indexPath);
            const index = JSON.parse(Buffer.from(indexData).toString("utf8"));
            if (!index.bundles || index.bundles.length === 0) {
                return [
                    new BundleItem("📦 No bundles yet", "", 0, 0, 'Click "+" or use Command Palette: "Scout: Create New Bundle"', "info"),
                ];
            }
            // Load each bundle's metadata
            const bundles = [];
            for (const entry of index.bundles) {
                try {
                    const bundlePath = vscode.Uri.file(`${bundlesPath}/${entry.id}/bundle.json`);
                    const bundleData = await vscode.workspace.fs.readFile(bundlePath);
                    const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));
                    bundles.push(new BundleItem(bundle.name, bundle.id, bundle.logs?.length || 0, this.calculateTotalSize(bundle.logs || []), bundle.description, "bundle"));
                }
                catch (err) {
                    console.error(`Failed to load bundle ${entry.id}:`, err);
                }
            }
            return bundles;
        }
        catch (error) {
            // Bundles directory doesn't exist yet
            return [
                new BundleItem("📦 No bundles yet", "", 0, 0, 'Click "+" or use Command Palette: "Scout: Create New Bundle"', "info"),
            ];
        }
    }
    calculateTotalSize(logs) {
        return logs.reduce((sum, log) => sum + (log.size_bytes || 0), 0);
    }
    async loadBundleLogs(bundleId) {
        if (!vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length === 0) {
            return [];
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleId}/bundle.json`;
        try {
            const bundleUri = vscode.Uri.file(bundlePath);
            const bundleData = await vscode.workspace.fs.readFile(bundleUri);
            const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));
            if (!bundle.logs || bundle.logs.length === 0) {
                return [
                    new BundleItem("📄 No logs yet", bundleId, 0, 0, "Right-click .log files and select 'Scout: Add to Bundle'", "info"),
                ];
            }
            return bundle.logs.map((log) => new BundleItem(log.uri.split(/[\\/]/).pop() || log.uri, // filename only
            bundleId, 0, log.size_bytes || 0, log.service, "log", log.uri));
        }
        catch (error) {
            console.error("Failed to load bundle logs:", error);
            return [];
        }
    }
    async createBundle(name, description, caseId) {
        if (!vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("❌ No workspace folder open. Please open a folder first.");
            console.error("Cannot create bundle: No workspace folder open");
            return undefined;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;
        try {
            console.log(`Creating bundle: ${name}`, { description, caseId });
            // Generate bundle ID
            const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();
            // Create bundle directory
            const bundleDir = vscode.Uri.file(`${bundlesPath}/${bundleId}`);
            await vscode.workspace.fs.createDirectory(bundleDir);
            console.log(`Created bundle directory: ${bundlesPath}/${bundleId}`);
            // Create bundle.json
            const bundle = {
                id: bundleId,
                name: name,
                description: description || null,
                logs: [],
                metadata: {
                    case_id: caseId || null,
                    severity: null,
                    tags: [],
                    owner: null,
                    team_members: [],
                    custom_fields: {},
                },
                created_at: now,
                updated_at: now,
                analysis: null,
            };
            const bundlePath = vscode.Uri.file(`${bundlesPath}/${bundleId}/bundle.json`);
            await vscode.workspace.fs.writeFile(bundlePath, Buffer.from(JSON.stringify(bundle, null, 2), "utf8"));
            console.log(`Created bundle.json for: ${name}`);
            // Update index.json
            await this.updateIndex(bundlesPath, bundleId, name);
            console.log(`Updated index.json with bundle: ${name}`);
            this.refresh();
            console.log(`✓ Bundle created successfully: ${name} (${bundleId})`);
            return bundleId;
        }
        catch (error) {
            const errorMsg = `Failed to create bundle "${name}": ${error}`;
            vscode.window.showErrorMessage(`❌ ${errorMsg}`);
            console.error(errorMsg, error);
            return undefined;
        }
    }
    async updateIndex(bundlesPath, bundleId, bundleName) {
        const indexPath = vscode.Uri.file(`${bundlesPath}/index.json`);
        const now = new Date().toISOString();
        let index;
        try {
            const indexData = await vscode.workspace.fs.readFile(indexPath);
            index = JSON.parse(Buffer.from(indexData).toString("utf8"));
        }
        catch {
            // Index doesn't exist, create new
            index = {
                bundles: [],
                last_updated: now,
            };
        }
        // Add new bundle to index
        index.bundles.push({
            id: bundleId,
            name: bundleName,
        });
        index.last_updated = now;
        // Write updated index
        await vscode.workspace.fs.writeFile(indexPath, Buffer.from(JSON.stringify(index, null, 2), "utf8"));
    }
    async deleteBundle(bundleId) {
        if (!vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("No workspace folder open");
            return false;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;
        try {
            // Step 1: Remove workspace folder reference (if it exists)
            const logsPath = `${bundlesPath}/${bundleId}/logs`;
            const logsUri = vscode.Uri.file(logsPath);
            const existingFolderIndex = vscode.workspace.workspaceFolders.findIndex((folder) => folder.uri.toString() === logsUri.toString());
            if (existingFolderIndex >= 0) {
                vscode.workspace.updateWorkspaceFolders(existingFolderIndex, // Start index
                1);
                console.log(`Removed workspace folder for bundle: ${bundleId}`);
            }
            // Step 2: Delete the bundle directory
            const bundleDir = vscode.Uri.file(`${bundlesPath}/${bundleId}`);
            await vscode.workspace.fs.delete(bundleDir, { recursive: true });
            // Step 3: Update index.json
            const indexPath = vscode.Uri.file(`${bundlesPath}/index.json`);
            const indexData = await vscode.workspace.fs.readFile(indexPath);
            const index = JSON.parse(Buffer.from(indexData).toString("utf8"));
            if (index.bundles) {
                index.bundles = index.bundles.filter((b) => b.id !== bundleId);
                index.lastModified = new Date().toISOString();
                await vscode.workspace.fs.writeFile(indexPath, Buffer.from(JSON.stringify(index, null, 2), "utf8"));
            }
            // Step 4: Refresh tree view
            this.refresh();
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete bundle: ${error}`);
            return false;
        }
    }
    async importPackage(packagePath, bundleName, caseId) {
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            const errorMsg = "LSP client not available for package import";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        const progressToken = `import_${Date.now()}`;
        const fileName = path.basename(packagePath);
        console.log(`Importing package: ${packagePath}`, {
            bundleName,
            caseId,
            progressToken,
        });
        // Create optimistic bundle entry immediately
        const optimisticBundle = new BundleItem(`📦 Importing ${fileName}...`, progressToken, 0, 0, "0% Starting...", "bundle-importing");
        optimisticBundle.iconPath = new vscode.ThemeIcon("loading~spin");
        // Add to importing map
        this.importingBundles.set(progressToken, {
            bundleId: progressToken,
            fileName: fileName,
            message: "Starting...",
            percentage: 0,
            startTime: Date.now(),
        });
        // Show in tree immediately
        this.bundles.unshift(optimisticBundle);
        this._onDidChangeTreeData.fire(undefined);
        try {
            // Use workspace/executeCommand with progress token
            const response = await client.sendRequest("workspace/executeCommand", {
                command: "scout/bundle/importPackage",
                arguments: [
                    {
                        packagePath: packagePath,
                        bundleName: bundleName || null,
                        caseId: caseId || null,
                        progressToken: progressToken,
                    },
                ],
            });
            // Remove optimistic entry
            this.importingBundles.delete(progressToken);
            this.bundles = this.bundles.filter((b) => b.bundleId !== progressToken);
            console.log(`Package import completed`, response);
            // Clear the local cache to force reload from disk
            this.bundles = [];
            // Wait for the bundle.json file to be written by watching the file system
            const result = response;
            // Refresh to show real bundle
            this.refresh();
            // Add bundle folder to workspace
            if (result && result.bundleId) {
                await this.addBundleToWorkspace(result.bundleId);
            }
            // Show success notification
            if (result && result.importedCount !== undefined) {
                vscode.window.showInformationMessage(`✅ Successfully imported ${result.importedCount} files to ${result.bundleName}`);
            }
            else {
                vscode.window.showInformationMessage(`✅ Package import completed`);
            }
            return response;
        }
        catch (error) {
            // Remove optimistic entry on error
            this.importingBundles.delete(progressToken);
            this.bundles = this.bundles.filter((b) => b.bundleId !== progressToken);
            this._onDidChangeTreeData.fire(undefined);
            vscode.window.showErrorMessage(`Failed to import archive: ${error}`);
            throw error;
        }
    }
    /**
     * Handle progress notifications from LSP
     */
    handleProgressNotification(params) {
        const token = params.token;
        const value = params.value;
        // Check if this is one of our import operations
        const importProgress = this.importingBundles.get(token);
        if (!importProgress) {
            return; // Not our import
        }
        // Update progress
        if (value.kind === "begin") {
            importProgress.message = value.message || "Starting...";
            importProgress.percentage = value.percentage || 0;
        }
        else if (value.kind === "report") {
            importProgress.message = value.message || "";
            importProgress.percentage = value.percentage || 0;
        }
        else if (value.kind === "end") {
            importProgress.message = value.message || "Complete";
            importProgress.percentage = 100;
        }
        // Update the tree item
        const bundleIndex = this.bundles.findIndex((b) => b.bundleId === token);
        if (bundleIndex !== -1) {
            const elapsed = Math.floor((Date.now() - importProgress.startTime) / 1000);
            this.bundles[bundleIndex].description =
                `${importProgress.percentage}% - ${importProgress.message} (${elapsed}s)`;
            // Fire change event to update UI
            this._onDidChangeTreeData.fire(this.bundles[bundleIndex]);
        }
    }
    async analyzeBundle(bundleId) {
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            const errorMsg = "LSP client not available for bundle analysis";
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        console.log(`Analyzing bundle: ${bundleId}`);
        const result = await client.sendRequest("workspace/executeCommand", {
            command: "scout/bundle/analyze",
            arguments: [{ bundleId: bundleId }],
        });
        console.log(`Bundle analysis completed for: ${bundleId}`);
        return result;
    }
    /**
     * Add bundle folder to workspace for easy file access
     */
    async addBundleToWorkspace(bundleId) {
        if (!vscode.workspace.workspaceFolders ||
            vscode.workspace.workspaceFolders.length === 0) {
            return;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleId}/logs`;
        try {
            // Check if the logs directory exists
            const bundleUri = vscode.Uri.file(bundlePath);
            const stat = await vscode.workspace.fs.stat(bundleUri);
            if (stat.type === vscode.FileType.Directory) {
                // Check if this folder is already in the workspace
                const existingFolder = vscode.workspace.workspaceFolders.find((folder) => folder.uri.fsPath === bundlePath);
                if (!existingFolder) {
                    // Add to workspace with a friendly name
                    const bundleName = bundleId.replace("bundle_", "Bundle ");
                    const success = vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, // Add at the end
                    0, // Don't remove any
                    {
                        uri: bundleUri,
                        name: `📦 ${bundleName}`,
                    });
                    if (success) {
                        console.log(`Added bundle folder to workspace: ${bundlePath}`);
                    }
                    else {
                        console.warn(`Failed to add bundle folder to workspace`);
                    }
                }
                else {
                    console.log(`Bundle folder already in workspace: ${bundlePath}`);
                }
            }
        }
        catch (error) {
            console.error(`Failed to add bundle to workspace:`, error);
            // Don't throw - this is a nice-to-have feature
        }
    }
}
exports.BundleTreeProvider = BundleTreeProvider;
/**
 * Bundle tree item
 */
class BundleItem extends vscode.TreeItem {
    constructor(label, bundleId, logCount, sizeBytes, description, type, uri) {
        super(label, type === "bundle" || type === "bundle-importing"
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.bundleId = bundleId;
        this.logCount = logCount;
        this.sizeBytes = sizeBytes;
        this.description = description;
        this.type = type;
        this.uri = uri;
        if (type === "bundle") {
            this.contextValue = "bundle";
            this.iconPath = icons_1.Icons.codicon("bundle");
            this.description = `${logCount} logs`;
            this.tooltip =
                description ||
                    `Bundle: ${label}\n${logCount} logs\n${this.formatSize(sizeBytes)}`;
        }
        else if (type === "bundle-importing") {
            this.contextValue = "bundle-importing";
            this.iconPath = new vscode.ThemeIcon("loading~spin");
            // description will be updated by progress handler
            this.tooltip = `Importing: ${label}`;
        }
        else if (type === "log") {
            this.contextValue = "bundleLog";
            // Detect file type from label/uri and show appropriate icon
            this.iconPath = this.getFileIcon(label);
            this.description = `${description || "Unknown"} • ${this.formatSize(sizeBytes)}`;
            this.tooltip = `${label}\nService: ${description}\nSize: ${this.formatSize(sizeBytes)}`;
            if (uri) {
                this.command = {
                    command: "vscode.open",
                    title: "Open Log File",
                    arguments: [vscode.Uri.file(uri)],
                };
            }
        }
        else {
            // info type - used for messages/placeholders
            this.contextValue = "info";
            this.iconPath = icons_1.Icons.codicon("info");
            this.description = description;
            this.tooltip = description;
        }
    }
    /**
     * Get appropriate icon based on file type
     * Handles both traditional extensions and Cisco log naming patterns
     */
    getFileIcon(fileName) {
        const lowerFileName = fileName.toLowerCase();
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        // Archive files (by extension)
        if (['zip', 'tar', 'gz', 'rar', '7z', 'tgz', 'bz2', 'gzip'].includes(ext)) {
            return icons_1.Icons.codicon('fileZip');
        }
        // Check if it's a compressed log (e.g., ccm.gz, sdl.tar.gz)
        if (lowerFileName.includes('.gz') || lowerFileName.includes('.tar') || lowerFileName.includes('.zip')) {
            return icons_1.Icons.codicon('fileZip');
        }
        // Known Cisco log services (no extension needed)
        const ciscoLogPatterns = [
            'ccm', 'sdl', 'sdli', 'tomcat', 'catalina', 'ris', 'soap', 'syslog',
            'rtmt', 'dbl', 'audit', 'trace', 'debug', 'core', 'alertmgr',
            'cdp', 'tftp', 'iis', 'ctios', 'jtapi', 'tapi', 'cdragent',
            'messenger', 'dhcp', 'platform', 'install', 'upgrade', 'migration',
            'activemq', 'changenotify', 'crssnapshot', 'drf', 'epas', 'snmp'
        ];
        // Check if filename starts with or contains known Cisco service names
        for (const pattern of ciscoLogPatterns) {
            if (lowerFileName.startsWith(pattern) ||
                lowerFileName.includes(`/${pattern}`) ||
                lowerFileName.includes(`\\${pattern}`)) {
                return icons_1.Icons.codicon('log');
            }
        }
        // Log files by extension
        if (['log', 'txt', 'out'].includes(ext)) {
            return icons_1.Icons.codicon('log');
        }
        // Files with log-like patterns (e.g., file.log.1, file.log.2024-02-23)
        if (lowerFileName.includes('.log') || lowerFileName.includes('_log')) {
            return icons_1.Icons.codicon('log');
        }
        // Code/Config files
        if (['js', 'ts', 'json', 'xml', 'html', 'css', 'yaml', 'yml', 'conf', 'cfg', 'ini', 'properties'].includes(ext)) {
            return icons_1.Icons.codicon('fileCode');
        }
        // Config-like files (no extension)
        if (lowerFileName.includes('config') || lowerFileName.includes('settings') ||
            lowerFileName.includes('.conf') || lowerFileName.includes('.cfg')) {
            return icons_1.Icons.codicon('fileCode');
        }
        // If it looks like a text file (common suffixes)
        if (lowerFileName.match(/\.(1|2|3|\d+)$/) || // Rotated logs: file.log.1
            lowerFileName.match(/\d{4}-\d{2}-\d{2}/) || // Date pattern
            lowerFileName.match(/\d{8}/) || // Date pattern: 20240223
            lowerFileName.includes('stdout') ||
            lowerFileName.includes('stderr')) {
            return icons_1.Icons.codicon('log');
        }
        // Default to generic file icon
        return icons_1.Icons.codicon('file');
    }
    formatSize(bytes) {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1024 * 1024)
            return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}
exports.BundleItem = BundleItem;
//# sourceMappingURL=bundleTreeProvider.js.map