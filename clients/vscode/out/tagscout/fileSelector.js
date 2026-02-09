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
exports.FileSelector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class FileSelector {
    constructor(context, treeProvider) {
        this.context = context;
        this.treeProvider = treeProvider;
    }
    async selectFile() {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Archives': ['zip', '7z', 'tar', 'gz', 'tgz'],
                'Log Files': ['log', 'txt'],
                'All Files': ['*']
            },
            title: 'Select Log File or Archive',
            openLabel: 'Select'
        });
        if (fileUri && fileUri.length > 0) {
            await this.setFile(fileUri[0].fsPath);
        }
    }
    async setFile(filePath) {
        if (!fs.existsSync(filePath)) {
            vscode.window.showErrorMessage('File does not exist');
            return;
        }
        // Validate file type
        const ext = path.extname(filePath).toLowerCase();
        const supportedExts = ['.zip', '.7z', '.tar', '.gz', '.tgz', '.log', '.txt'];
        if (!supportedExts.includes(ext) && ext !== '') {
            const proceed = await vscode.window.showWarningMessage(`File type '${ext}' may not be supported. Continue anyway?`, 'Yes', 'No');
            if (proceed !== 'Yes') {
                return;
            }
        }
        // Store persistently (survives VS Code restart)
        await this.context.workspaceState.update('tagscout.currentFile', filePath);
        // Update UI
        this.treeProvider.setCurrentFile(filePath);
        vscode.window.showInformationMessage(`Selected: ${path.basename(filePath)}`);
    }
    async changeFile() {
        await this.selectFile();
    }
    async handleFileDrop(filePath) {
        await this.setFile(filePath);
    }
    async loadPersistedFile() {
        // On extension activation, restore previously selected file
        const savedFile = this.context.workspaceState.get('tagscout.currentFile');
        if (savedFile) {
            if (fs.existsSync(savedFile)) {
                this.treeProvider.setCurrentFile(savedFile);
                console.log(`Restored file: ${savedFile}`);
            }
            else {
                // File no longer exists, clear it
                await this.context.workspaceState.update('tagscout.currentFile', undefined);
                console.log(`Previously selected file no longer exists: ${savedFile}`);
            }
        }
    }
    getCurrentFile() {
        return this.treeProvider.getCurrentFile();
    }
    clearFile() {
        this.context.workspaceState.update('tagscout.currentFile', undefined);
        this.treeProvider.setCurrentFile('');
    }
}
exports.FileSelector = FileSelector;
//# sourceMappingURL=fileSelector.js.map