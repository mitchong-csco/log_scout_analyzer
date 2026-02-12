import * as vscode from "vscode";
import * as path from "path";

export interface CachedFile {
    uri: vscode.Uri;
    timestamp: Date;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    totalCount: number;
}

export class CachedFilesTreeProvider implements vscode.TreeDataProvider<CachedFileItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        CachedFileItem | undefined | null | void
    > = new vscode.EventEmitter<CachedFileItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        CachedFileItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private cachedFiles: Map<string, CachedFile> = new Map();

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setCachedFiles(cache: Map<string, CachedFile>): void {
        this.cachedFiles = new Map();
        // Ensure timestamps are Date objects
        for (const [key, file] of cache.entries()) {
            this.cachedFiles.set(key, {
                ...file,
                timestamp: file.timestamp instanceof Date ? file.timestamp : new Date(file.timestamp)
            });
        }
        this.refresh();
    }

    clear(): void {
        this.cachedFiles.clear();
        this.refresh();
    }

    getCachedFiles(): Map<string, CachedFile> {
        return this.cachedFiles;
    }

    getTreeItem(element: CachedFileItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CachedFileItem): Thenable<CachedFileItem[]> {
        if (!element) {
            return Promise.resolve(this.getCachedFileItems());
        }
        return Promise.resolve([]);
    }

    private getCachedFileItems(): CachedFileItem[] {
        if (this.cachedFiles.size === 0) {
            return [
                new CachedFileItem(
                    "No cached files",
                    "",
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                ),
            ];
        }

        // Convert cache to sorted array
        const items: CachedFileItem[] = [];

        for (const cachedFile of this.cachedFiles.values()) {
            const fileName = path.basename(cachedFile.uri.fsPath);
            const dirName = path.basename(path.dirname(cachedFile.uri.fsPath));
            
            // Build count description
            const parts: string[] = [];
            if (cachedFile.errorCount > 0) parts.push(`${cachedFile.errorCount}E`);
            if (cachedFile.warningCount > 0) parts.push(`${cachedFile.warningCount}W`);
            if (cachedFile.infoCount > 0) parts.push(`${cachedFile.infoCount}I`);
            if (cachedFile.debugCount > 0) parts.push(`${cachedFile.debugCount}D`);
            
            const countDesc = parts.length > 0 ? parts.join(" ") : "0 issues";
            
            // Time since analyzed
            const now = new Date();
            const timestamp = cachedFile.timestamp instanceof Date ? cachedFile.timestamp : new Date(cachedFile.timestamp);
            const diffMs = now.getTime() - timestamp.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            let timeDesc = "";
            if (diffMins === 0) {
                timeDesc = "just now";
            } else if (diffMins === 1) {
                timeDesc = "1 min ago";
            } else if (diffMins < 60) {
                timeDesc = `${diffMins} mins ago`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours === 1) {
                    timeDesc = "1 hour ago";
                } else if (diffHours < 24) {
                    timeDesc = `${diffHours} hours ago`;
                } else {
                    timeDesc = cachedFile.timestamp.toLocaleDateString();
                }
            }

            const item = new CachedFileItem(
                fileName,
                `${countDesc} • ${timeDesc}`,
                vscode.TreeItemCollapsibleState.None,
                cachedFile,
            );
            item.contextValue = "cachedFile";

            // Icon based on severity
            if (cachedFile.errorCount > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    "file-text",
                    new vscode.ThemeColor("errorForeground"),
                );
            } else if (cachedFile.warningCount > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    "file-text",
                    new vscode.ThemeColor("editorWarning.foreground"),
                );
            } else if (cachedFile.totalCount > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    "file-text",
                    new vscode.ThemeColor("editorInfo.foreground"),
                );
            } else {
                item.iconPath = new vscode.ThemeIcon("file-text");
            }

            // Command to open file and load cached results
            item.command = {
                command: "logScoutAnalyzer.openCachedFile",
                title: "Open Cached File",
                arguments: [cachedFile],
            };

            // Tooltip
            const tooltip = new vscode.MarkdownString();
            tooltip.appendMarkdown(`**${fileName}**\n\n`);
            tooltip.appendMarkdown(`📁 ${dirName}\n\n`);
            tooltip.appendMarkdown(`**Issues:**\n`);
            tooltip.appendMarkdown(`- ${cachedFile.errorCount} Errors\n`);
            tooltip.appendMarkdown(`- ${cachedFile.warningCount} Warnings\n`);
            tooltip.appendMarkdown(`- ${cachedFile.infoCount} Info\n`);
            tooltip.appendMarkdown(`- ${cachedFile.debugCount} Debug\n\n`);
            tooltip.appendMarkdown(`**Analyzed:** ${cachedFile.timestamp.toLocaleString()}\n\n`);
            tooltip.appendMarkdown(`**Total Issues:** ${cachedFile.totalCount}\n\n`);
            tooltip.appendMarkdown(`_Click to open file_`);
            item.tooltip = tooltip;

            item.contextValue = "cachedFile";

            items.push(item);
        }

        // Sort by timestamp (most recent first)
        return items.sort((a, b) => {
            if (!a.cachedFile || !b.cachedFile) return 0;
            const aTime = a.cachedFile.timestamp instanceof Date ? a.cachedFile.timestamp : new Date(a.cachedFile.timestamp);
            const bTime = b.cachedFile.timestamp instanceof Date ? b.cachedFile.timestamp : new Date(b.cachedFile.timestamp);
            return bTime.getTime() - aTime.getTime();
        });
    }
}

export class CachedFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly cachedFile?: CachedFile,
    ) {
        super(label, collapsibleState);
        this.description = description;
    }
}
