import * as vscode from 'vscode';
import * as path from 'path';
import { CaseManager, CaseInfo } from './caseManager';

export class CasesTreeProvider implements vscode.TreeDataProvider<CaseTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CaseTreeItem | undefined | null | void> = new vscode.EventEmitter<CaseTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CaseTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private caseManager: CaseManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CaseTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CaseTreeItem): Promise<CaseTreeItem[]> {
        if (!element) {
            // Root level - show all cases
            const cases = this.caseManager.getAllCases();

            if (cases.length === 0) {
                return [new CaseTreeItem(
                    'No cases loaded',
                    'empty',
                    vscode.TreeItemCollapsibleState.None,
                    undefined,
                    '$(info) Click "+" to download or import a case'
                )];
            }

            return cases.map(caseInfo => {
                const item = new CaseTreeItem(
                    caseInfo.caseName,
                    'case',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    caseInfo
                );
                item.contextValue = 'case';
                item.tooltip = this.getCaseTooltip(caseInfo);
                item.iconPath = this.getCaseIcon(caseInfo);
                item.description = this.getCaseDescription(caseInfo);

                // Add command to open case on click
                if (caseInfo.status === 'ready') {
                    item.command = {
                        command: 'logScoutAnalyzer.openCase',
                        title: 'Open Case',
                        arguments: [caseInfo.caseId]
                    };
                }

                return item;
            });
        } else if (element.type === 'case' && element.caseInfo) {
            // Case level - show details and log files
            const caseInfo = element.caseInfo;
            const children: CaseTreeItem[] = [];

            // Add case details section
            children.push(new CaseTreeItem(
                'Details',
                'details-section',
                vscode.TreeItemCollapsibleState.Collapsed,
                caseInfo
            ));

            // Add log files section if case is ready
            if (caseInfo.status === 'ready' && caseInfo.logFiles.length > 0) {
                children.push(new CaseTreeItem(
                    `Log Files (${caseInfo.logFiles.length})`,
                    'logs-section',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    caseInfo
                ));
            }

            return children;
        } else if (element.type === 'details-section' && element.caseInfo) {
            // Show case details
            const caseInfo = element.caseInfo;
            const details: CaseTreeItem[] = [];

            details.push(this.createDetailItem('Case ID', caseInfo.caseId, '$(tag)'));
            details.push(this.createDetailItem('Status', caseInfo.status, this.getStatusIcon(caseInfo.status)));
            details.push(this.createDetailItem('Downloaded', this.formatDate(caseInfo.downloadedDate), '$(calendar)'));
            details.push(this.createDetailItem('Log Files', String(caseInfo.logFiles.length), '$(file)'));

            if (caseInfo.description) {
                details.push(this.createDetailItem('Description', caseInfo.description, '$(note)'));
            }

            if (caseInfo.errorMessage) {
                details.push(this.createDetailItem('Error', caseInfo.errorMessage, '$(error)'));
            }

            return details;
        } else if (element.type === 'logs-section' && element.caseInfo) {
            // Show log files
            const caseInfo = element.caseInfo;
            return caseInfo.logFiles.map(logFile => {
                const fileName = path.basename(logFile);
                const item = new CaseTreeItem(
                    fileName,
                    'log-file',
                    vscode.TreeItemCollapsibleState.None,
                    caseInfo,
                    logFile
                );
                item.contextValue = 'logFile';
                item.iconPath = new vscode.ThemeIcon('file-text');
                item.tooltip = logFile;
                item.resourceUri = vscode.Uri.file(logFile);

                // Add command to open log file
                item.command = {
                    command: 'vscode.open',
                    title: 'Open Log File',
                    arguments: [vscode.Uri.file(logFile)]
                };

                return item;
            });
        }

        return [];
    }

    private createDetailItem(label: string, value: string, icon: string): CaseTreeItem {
        const item = new CaseTreeItem(
            `${label}: ${value}`,
            'detail',
            vscode.TreeItemCollapsibleState.None
        );
        item.iconPath = new vscode.ThemeIcon(icon.replace('$(', '').replace(')', ''));
        return item;
    }

    private getCaseIcon(caseInfo: CaseInfo): vscode.ThemeIcon {
        switch (caseInfo.status) {
            case 'ready':
                return new vscode.ThemeIcon('briefcase', new vscode.ThemeColor('charts.green'));
            case 'downloading':
                return new vscode.ThemeIcon('cloud-download', new vscode.ThemeColor('charts.blue'));
            case 'extracting':
                return new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.yellow'));
            case 'error':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            case 'pending':
            default:
                return new vscode.ThemeIcon('clock', new vscode.ThemeColor('charts.gray'));
        }
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'ready': return '$(check)';
            case 'downloading': return '$(cloud-download)';
            case 'extracting': return '$(archive)';
            case 'error': return '$(error)';
            case 'pending': return '$(clock)';
            default: return '$(question)';
        }
    }

    private getCaseDescription(caseInfo: CaseInfo): string {
        switch (caseInfo.status) {
            case 'ready':
                return `${caseInfo.logFiles.length} files`;
            case 'downloading':
                return 'Downloading...';
            case 'extracting':
                return 'Extracting...';
            case 'error':
                return 'Error';
            case 'pending':
                return 'Pending';
            default:
                return '';
        }
    }

    private getCaseTooltip(caseInfo: CaseInfo): string {
        const lines: string[] = [
            `Case: ${caseInfo.caseName}`,
            `ID: ${caseInfo.caseId}`,
            `Status: ${caseInfo.status}`,
            `Downloaded: ${this.formatDate(caseInfo.downloadedDate)}`,
            `Log Files: ${caseInfo.logFiles.length}`
        ];

        if (caseInfo.description) {
            lines.push(`Description: ${caseInfo.description}`);
        }

        if (caseInfo.errorMessage) {
            lines.push(`Error: ${caseInfo.errorMessage}`);
        }

        return lines.join('\n');
    }

    private formatDate(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

export class CaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: 'case' | 'details-section' | 'logs-section' | 'detail' | 'log-file' | 'empty',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly caseInfo?: CaseInfo,
        public readonly filePath?: string
    ) {
        super(label, collapsibleState);
    }
}
