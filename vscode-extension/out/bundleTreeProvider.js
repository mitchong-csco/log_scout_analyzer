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
exports.BundleItem = exports.BundleTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const lspClient_1 = require("./lspClient");
/**
 * Bundle tree provider for VS Code sidebar
 * Shows all bundles and their logs
 */
class BundleTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show all bundles
            return this.loadBundles();
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
                new BundleItem("No workspace open", "", 0, 0, "Open a folder to manage bundles", "info"),
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
                    new BundleItem("No bundles yet", "", 0, 0, 'Create a bundle with "Scout: Create New Bundle"', "info"),
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
                new BundleItem("No bundles yet", "", 0, 0, 'Create a bundle with "Scout: Create New Bundle"', "info"),
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
                    new BundleItem("No logs in bundle", bundleId, 0, 0, "Add logs with right-click on files", "info"),
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
            vscode.window.showErrorMessage("No workspace folder open");
            return undefined;
        }
        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;
        try {
            // Generate bundle ID
            const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();
            // Create bundle directory
            const bundleDir = vscode.Uri.file(`${bundlesPath}/${bundleId}`);
            await vscode.workspace.fs.createDirectory(bundleDir);
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
            // Update index.json
            await this.updateIndex(bundlesPath, bundleId, name);
            this.refresh();
            return bundleId;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create bundle: ${error}`);
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
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            return false;
        }
        try {
            await client.sendRequest("scout/bundle/delete", {
                bundleId: bundleId,
            });
            this.refresh();
            return true;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to delete bundle: ${error}`);
            return false;
        }
    }
    async importPackage(packagePath) {
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            throw new Error("LSP client not available");
        }
        // Use workspace/executeCommand instead of custom request
        const response = await client.sendRequest("workspace/executeCommand", {
            command: "logScout.bundle.importPackage",
            arguments: [
                {
                    packagePath: packagePath,
                    bundleName: null,
                    caseId: null,
                },
            ],
        });
        this.refresh();
        return response;
    }
    async analyzeBundle(bundleId) {
        const client = (0, lspClient_1.getLSPClient)();
        if (!client) {
            throw new Error("LSP client not available");
        }
        return await client.sendRequest("scout/bundle/analyze", {
            bundleId: bundleId,
        });
    }
}
exports.BundleTreeProvider = BundleTreeProvider;
/**
 * Bundle tree item
 */
class BundleItem extends vscode.TreeItem {
    constructor(label, bundleId, logCount, sizeBytes, description, type, uri) {
        super(label, type === "bundle"
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
            this.iconPath = new vscode.ThemeIcon("archive");
            this.description = `${logCount} logs`;
            this.tooltip =
                description ||
                    `Bundle: ${label}\n${logCount} logs\n${this.formatSize(sizeBytes)}`;
        }
        else if (type === "log") {
            this.contextValue = "bundleLog";
            this.iconPath = new vscode.ThemeIcon("file");
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
            this.iconPath = new vscode.ThemeIcon("info");
            this.description = description;
            this.tooltip = description;
        }
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