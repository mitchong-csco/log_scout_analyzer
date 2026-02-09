import * as vscode from "vscode";
import * as path from "path";

export interface TimeframeFilter {
    label: string;
    days: number;
    active: boolean;
}

export class AnalyzerTreeProvider implements vscode.TreeDataProvider<AnalyzerTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        AnalyzerTreeItem | undefined | null | void
    > = new vscode.EventEmitter<AnalyzerTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        AnalyzerTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private activeTimeframe: TimeframeFilter | null = null;

    public static setDiagnosticsProvider(_provider: any): void {
        // Reserved for future use
    }

    constructor() {}

    setTimeframe(timeframe: TimeframeFilter | null): void {
        this.activeTimeframe = timeframe;
        this.refresh();
    }

    getActiveTimeframe(): TimeframeFilter | null {
        return this.activeTimeframe;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AnalyzerTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AnalyzerTreeItem): Thenable<AnalyzerTreeItem[]> {
        if (!element) {
            return Promise.resolve(this.getRootItems());
        }
        return Promise.resolve([]);
    }

    private getRootItems(): AnalyzerTreeItem[] {
        const editor = vscode.window.activeTextEditor;
        const items: AnalyzerTreeItem[] = [];

        // Current File Section
        if (editor) {
            const fileName = path.basename(editor.document.fileName);
            const currentFileItem = new AnalyzerTreeItem(
                `📄 ${fileName}`,
                "",
                vscode.TreeItemCollapsibleState.None,
                "currentFile",
            );
            currentFileItem.tooltip = `Current file: ${editor.document.fileName}`;
            currentFileItem.iconPath = new vscode.ThemeIcon(
                "file",
                new vscode.ThemeColor("charts.blue"),
            );
            items.push(currentFileItem);
        }

        // Quick Actions
        const analyzeCurrentItem = new AnalyzerTreeItem(
            "Analyze Current File",
            editor ? "Run analysis on active file" : "No file open",
            vscode.TreeItemCollapsibleState.None,
            "analyzeFile",
        );
        analyzeCurrentItem.command = {
            command: "logScoutAnalyzer.analyzeFile",
            title: "Analyze File",
        };
        analyzeCurrentItem.iconPath = new vscode.ThemeIcon(
            "play-circle",
            new vscode.ThemeColor("testing.runIcon"),
        );
        items.push(analyzeCurrentItem);

        const analyzeDirectoryItem = new AnalyzerTreeItem(
            "Analyze Directory",
            editor ? "All log files in current directory" : "No file open",
            vscode.TreeItemCollapsibleState.None,
            "analyzeDirectory",
        );
        analyzeDirectoryItem.command = {
            command: "logScoutAnalyzer.analyzeDirectory",
            title: "Analyze Directory",
        };
        analyzeDirectoryItem.iconPath = new vscode.ThemeIcon(
            "folder",
            new vscode.ThemeColor("testing.runIcon"),
        );
        items.push(analyzeDirectoryItem);

        const analyzeRecursiveItem = new AnalyzerTreeItem(
            "Analyze Recursively",
            editor ? "All log files in directory tree" : "No file open",
            vscode.TreeItemCollapsibleState.None,
            "analyzeRecursive",
        );
        analyzeRecursiveItem.command = {
            command: "logScoutAnalyzer.analyzeAllBelow",
            title: "Analyze Recursively",
        };
        analyzeRecursiveItem.iconPath = new vscode.ThemeIcon(
            "folder-library",
            new vscode.ThemeColor("testing.runIcon"),
        );
        items.push(analyzeRecursiveItem);

        // Separator
        const separatorItem = new AnalyzerTreeItem(
            "────────────────────",
            "",
            vscode.TreeItemCollapsibleState.None,
            "separator",
        );
        items.push(separatorItem);

        // Timeframe Filters Section
        const timeframeHeader = new AnalyzerTreeItem(
            "⏱️ Timeframe Filters",
            this.activeTimeframe
                ? `Active: ${this.activeTimeframe.label}`
                : "Show all time",
            vscode.TreeItemCollapsibleState.None,
            "timeframeHeader",
        );
        timeframeHeader.iconPath = new vscode.ThemeIcon(
            "calendar",
            new vscode.ThemeColor("charts.purple"),
        );
        items.push(timeframeHeader);

        // Timeframe buttons
        const timeframes: TimeframeFilter[] = [
            { label: "Last 1 Day", days: 1, active: false },
            { label: "Last 2 Days", days: 2, active: false },
            { label: "Last 3 Days", days: 3, active: false },
            { label: "Last 7 Days", days: 7, active: false },
            { label: "All Time", days: 0, active: false },
        ];

        timeframes.forEach((tf) => {
            const isActive = this.activeTimeframe?.days === tf.days;
            const item = new AnalyzerTreeItem(
                isActive ? `✓ ${tf.label}` : `  ${tf.label}`,
                isActive ? "Currently active" : "Click to apply",
                vscode.TreeItemCollapsibleState.None,
                "timeframeFilter",
            );
            item.command = {
                command: "logScoutAnalyzer.setTimeframe",
                title: "Set Timeframe",
                arguments: [tf.days === 0 ? null : tf],
            };
            item.iconPath = new vscode.ThemeIcon(
                isActive ? "check" : "circle-outline",
                isActive ? new vscode.ThemeColor("charts.green") : undefined,
            );
            items.push(item);
        });

        // Separator
        const separator2Item = new AnalyzerTreeItem(
            "────────────────────",
            "",
            vscode.TreeItemCollapsibleState.None,
            "separator",
        );
        items.push(separator2Item);

        // Tools Section
        const clearResultsItem = new AnalyzerTreeItem(
            "Clear Results",
            "Clear all diagnostics",
            vscode.TreeItemCollapsibleState.None,
            "clearResults",
        );
        clearResultsItem.command = {
            command: "logScoutAnalyzer.clearDiagnostics",
            title: "Clear Results",
        };
        clearResultsItem.iconPath = new vscode.ThemeIcon(
            "clear-all",
            new vscode.ThemeColor("errorForeground"),
        );
        items.push(clearResultsItem);

        const exportResultsItem = new AnalyzerTreeItem(
            "Export Results",
            "Export to JSON",
            vscode.TreeItemCollapsibleState.None,
            "exportResults",
        );
        exportResultsItem.command = {
            command: "logScoutAnalyzer.exportResults",
            title: "Export Results",
        };
        exportResultsItem.iconPath = new vscode.ThemeIcon("save");
        items.push(exportResultsItem);

        const showConsoleItem = new AnalyzerTreeItem(
            "Show Console",
            "Open Scout Console output",
            vscode.TreeItemCollapsibleState.None,
            "showConsole",
        );
        showConsoleItem.command = {
            command: "logScoutAnalyzer.showConsole",
            title: "Show Console",
        };
        showConsoleItem.iconPath = new vscode.ThemeIcon("terminal");
        items.push(showConsoleItem);

        const config = vscode.workspace.getConfiguration("logScoutAnalyzer");
        const consoleLocation = config.get<string>(
            "consoleOutputLocation",
            "outputPanel",
        );
        const locationLabel =
            consoleLocation === "outputPanel" ? "Output Panel" : "Terminal";
        const toggleConsoleItem = new AnalyzerTreeItem(
            "Toggle Console Location",
            `Currently: ${locationLabel}`,
            vscode.TreeItemCollapsibleState.None,
            "toggleConsoleLocation",
        );
        toggleConsoleItem.command = {
            command: "logScoutAnalyzer.toggleConsoleLocation",
            title: "Toggle Console Location",
        };
        toggleConsoleItem.iconPath = new vscode.ThemeIcon("arrow-swap");
        items.push(toggleConsoleItem);

        const showPatternsItem = new AnalyzerTreeItem(
            "Show Patterns",
            "View loaded analysis patterns",
            vscode.TreeItemCollapsibleState.None,
            "showPatterns",
        );
        showPatternsItem.command = {
            command: "logScoutAnalyzer.showPatterns",
            title: "Show Patterns",
        };
        showPatternsItem.iconPath = new vscode.ThemeIcon("list-tree");
        items.push(showPatternsItem);

        // Visualization Section
        const timelineVizItem = new AnalyzerTreeItem(
            "Timeline Visualization",
            "Visual timeline with events",
            vscode.TreeItemCollapsibleState.None,
            "timelineVisualization",
        );
        timelineVizItem.command = {
            command: "logScoutAnalyzer.showTimelineVisualization",
            title: "Timeline Visualization",
        };
        timelineVizItem.iconPath = new vscode.ThemeIcon(
            "graph-line",
            new vscode.ThemeColor("charts.blue"),
        );
        items.push(timelineVizItem);

        const ladderDiagramItem = new AnalyzerTreeItem(
            "SIP Ladder Diagram",
            "Call flow visualization",
            vscode.TreeItemCollapsibleState.None,
            "ladderDiagram",
        );
        ladderDiagramItem.command = {
            command: "logScoutAnalyzer.showLadderDiagram",
            title: "SIP Ladder Diagram",
        };
        ladderDiagramItem.iconPath = new vscode.ThemeIcon(
            "type-hierarchy",
            new vscode.ThemeColor("charts.green"),
        );
        items.push(ladderDiagramItem);

        // Separator
        const separator3Item = new AnalyzerTreeItem(
            "────────────────────",
            "",
            vscode.TreeItemCollapsibleState.None,
            "separator",
        );
        items.push(separator3Item);

        // Info Section
        const versionItem = new AnalyzerTreeItem(
            "About",
            "Version and build info",
            vscode.TreeItemCollapsibleState.None,
            "version",
        );
        versionItem.command = {
            command: "logScoutAnalyzer.showVersion",
            title: "Show Version",
        };
        versionItem.iconPath = new vscode.ThemeIcon("info");
        items.push(versionItem);

        return items;
    }
}

export class AnalyzerTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
    ) {
        super(label, collapsibleState);
        this.description = description;
    }
}
