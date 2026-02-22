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
exports.CaseTreeItem = exports.CasesTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class CasesTreeProvider {
    constructor(caseManager) {
        this.caseManager = caseManager;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            // Root level - show all cases
            const cases = this.caseManager.getAllCases();
            if (cases.length === 0) {
                return [new CaseTreeItem('No cases loaded', 'empty', vscode.TreeItemCollapsibleState.None, undefined, '$(info) Click "+" to download or import a case')];
            }
            return cases.map(caseInfo => {
                const item = new CaseTreeItem(caseInfo.caseName, 'case', vscode.TreeItemCollapsibleState.Collapsed, caseInfo);
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
        }
        else if (element.type === 'case' && element.caseInfo) {
            // Case level - show details and log files
            const caseInfo = element.caseInfo;
            const children = [];
            // Add case details section
            children.push(new CaseTreeItem('Details', 'details-section', vscode.TreeItemCollapsibleState.Collapsed, caseInfo));
            // Add log files section if case is ready
            if (caseInfo.status === 'ready' && caseInfo.logFiles.length > 0) {
                children.push(new CaseTreeItem(`Log Files (${caseInfo.logFiles.length})`, 'logs-section', vscode.TreeItemCollapsibleState.Collapsed, caseInfo));
            }
            return children;
        }
        else if (element.type === 'details-section' && element.caseInfo) {
            // Show case details
            const caseInfo = element.caseInfo;
            const details = [];
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
        }
        else if (element.type === 'logs-section' && element.caseInfo) {
            // Show log files
            const caseInfo = element.caseInfo;
            return caseInfo.logFiles.map(logFile => {
                const fileName = path.basename(logFile);
                const item = new CaseTreeItem(fileName, 'log-file', vscode.TreeItemCollapsibleState.None, caseInfo, logFile);
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
    createDetailItem(label, value, icon) {
        const item = new CaseTreeItem(`${label}: ${value}`, 'detail', vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon(icon.replace('$(', '').replace(')', ''));
        return item;
    }
    getCaseIcon(caseInfo) {
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
    getStatusIcon(status) {
        switch (status) {
            case 'ready': return '$(check)';
            case 'downloading': return '$(cloud-download)';
            case 'extracting': return '$(archive)';
            case 'error': return '$(error)';
            case 'pending': return '$(clock)';
            default: return '$(question)';
        }
    }
    getCaseDescription(caseInfo) {
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
    getCaseTooltip(caseInfo) {
        const lines = [
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
    formatDate(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) {
            return 'Just now';
        }
        else if (diffMins < 60) {
            return `${diffMins}m ago`;
        }
        else if (diffHours < 24) {
            return `${diffHours}h ago`;
        }
        else if (diffDays < 7) {
            return `${diffDays}d ago`;
        }
        else {
            return date.toLocaleDateString();
        }
    }
}
exports.CasesTreeProvider = CasesTreeProvider;
class CaseTreeItem extends vscode.TreeItem {
    constructor(label, type, collapsibleState, caseInfo, filePath) {
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.caseInfo = caseInfo;
        this.filePath = filePath;
    }
}
exports.CaseTreeItem = CaseTreeItem;
//# sourceMappingURL=casesTreeProvider.js.map