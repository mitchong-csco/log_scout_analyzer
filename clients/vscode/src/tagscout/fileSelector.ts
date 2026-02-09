import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TagScoutAnalyzerProvider } from './analyzerTreeProvider';

export class FileSelector {
    constructor(
        private context: vscode.ExtensionContext,
        private treeProvider: TagScoutAnalyzerProvider
    ) {}

    async selectFile(): Promise<void> {
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

    async setFile(filePath: string): Promise<void> {
        if (!fs.existsSync(filePath)) {
            vscode.window.showErrorMessage('File does not exist');
            return;
        }

        // Validate file type
        const ext = path.extname(filePath).toLowerCase();
        const supportedExts = ['.zip', '.7z', '.tar', '.gz', '.tgz', '.log', '.txt'];

        if (!supportedExts.includes(ext) && ext !== '') {
            const proceed = await vscode.window.showWarningMessage(
                `File type '${ext}' may not be supported. Continue anyway?`,
                'Yes', 'No'
            );

            if (proceed !== 'Yes') {
                return;
            }
        }

        // Store persistently (survives VS Code restart)
        await this.context.workspaceState.update('tagscout.currentFile', filePath);

        // Update UI
        this.treeProvider.setCurrentFile(filePath);

        vscode.window.showInformationMessage(
            `Selected: ${path.basename(filePath)}`
        );
    }

    async changeFile(): Promise<void> {
        await this.selectFile();
    }

    async handleFileDrop(filePath: string): Promise<void> {
        await this.setFile(filePath);
    }

    async loadPersistedFile(): Promise<void> {
        // On extension activation, restore previously selected file
        const savedFile = this.context.workspaceState.get<string>('tagscout.currentFile');
        if (savedFile) {
            if (fs.existsSync(savedFile)) {
                this.treeProvider.setCurrentFile(savedFile);
                console.log(`Restored file: ${savedFile}`);
            } else {
                // File no longer exists, clear it
                await this.context.workspaceState.update('tagscout.currentFile', undefined);
                console.log(`Previously selected file no longer exists: ${savedFile}`);
            }
        }
    }

    getCurrentFile(): string | null {
        return this.treeProvider.getCurrentFile();
    }

    clearFile(): void {
        this.context.workspaceState.update('tagscout.currentFile', undefined);
        this.treeProvider.setCurrentFile('');
    }
}
