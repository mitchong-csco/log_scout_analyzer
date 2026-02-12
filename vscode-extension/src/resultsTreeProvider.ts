import * as vscode from "vscode";

export interface ResultItem {
    severity: "error" | "warning" | "info" | "debug";
    line: number;
    column: number;
    message: string;
    matchedText: string;
    context: string;
    timestamp?: Date;
    category?: string;
    patternId?: string;
    patternName?: string;
    uri: vscode.Uri;
}

export class ResultsTreeProvider implements vscode.TreeDataProvider<ResultTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        ResultTreeItem | undefined | null | void
    > = new vscode.EventEmitter<ResultTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        ResultTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private results: ResultItem[] = [];
    private groupBy: "severity" | "category" | "file" = "severity";
    private originalResults: ResultItem[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setResults(results: ResultItem[]): void {
        this.results = results;
        this.originalResults = [...results]; // Store original for reset
        this.refresh();
    }

    getResults(): ResultItem[] {
        return this.results;
    }

    getGroupBy(): "severity" | "category" | "file" {
        return this.groupBy;
    }

    setGroupBy(groupBy: "severity" | "category" | "file"): void {
        this.groupBy = groupBy;
        this.refresh();
    }

    resetGrouping(): void {
        this.groupBy = "severity";
        this.results = [...this.originalResults]; // Restore original results
        this.refresh();
    }

    clear(): void {
        this.results = [];
        this.originalResults = [];
        this.groupBy = "severity"; // Reset to default
        this.refresh();
    }

    getTreeItem(element: ResultTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ResultTreeItem): Thenable<ResultTreeItem[]> {
        if (!element) {
            // Root level - show groups
            return Promise.resolve(this.getRootItems());
        } else if (element.contextValue === "group") {
            // Group level - show results in that group
            return Promise.resolve(this.getGroupItems(element));
        }
        return Promise.resolve([]);
    }

    private getRootItems(): ResultTreeItem[] {
        if (this.results.length === 0) {
            return [
                new ResultTreeItem(
                    "No results",
                    "Run analysis to see issues",
                    vscode.TreeItemCollapsibleState.None,
                    "empty",
                ),
            ];
        }

        // Calculate severity counts
        const errorCount = this.results.filter((r) => r.severity === "error").length;
        const warningCount = this.results.filter((r) => r.severity === "warning").length;
        const infoCount = this.results.filter((r) => r.severity === "info").length;
        const debugCount = this.results.filter((r) => r.severity === "debug").length;

        // Show current grouping mode indicator with severity counts
        const countParts: string[] = [];
        if (errorCount > 0) countParts.push(`${errorCount}E`);
        if (warningCount > 0) countParts.push(`${warningCount}W`);
        if (infoCount > 0) countParts.push(`${infoCount}I`);
        if (debugCount > 0) countParts.push(`${debugCount}D`);
        const countDesc = countParts.join(" ");

        const modeIndicator = new ResultTreeItem(
            `📊 ${this.getGroupByLabel()}`,
            countDesc,
            vscode.TreeItemCollapsibleState.None,
            "mode-indicator",
        );
        modeIndicator.iconPath = new vscode.ThemeIcon(
            "filter",
            new vscode.ThemeColor("charts.blue"),
        );

        // Add tooltip with instructions
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(
            `**Current View: ${this.getGroupByLabel()}**\n\n`,
        );
        tooltip.appendMarkdown(`Showing ${this.results.length} issues\n\n`);
        tooltip.appendMarkdown(`**Change View:**\n`);
        tooltip.appendMarkdown(`- Group by Severity (default)\n`);
        tooltip.appendMarkdown(`- Group by Category\n`);
        tooltip.appendMarkdown(`- Group by File\n\n`);
        tooltip.appendMarkdown(
            `**Reset:** Click "Reset View" button to restore default grouping`,
        );
        modeIndicator.tooltip = tooltip;

        const groups = this.getGroups();
        return [modeIndicator, ...groups];
    }

    private getGroupByLabel(): string {
        switch (this.groupBy) {
            case "severity":
                return "By Severity";
            case "category":
                return "By Category";
            case "file":
                return "By File";
        }
    }

    private getGroups(): ResultTreeItem[] {
        if (this.groupBy === "severity") {
            return this.getGroupsBySeverity();
        } else if (this.groupBy === "category") {
            return this.getGroupsByCategory();
        } else {
            return this.getGroupsByFile();
        }
    }

    private getGroupsBySeverity(): ResultTreeItem[] {
        const errors = this.results.filter((r) => r.severity === "error");
        const warnings = this.results.filter((r) => r.severity === "warning");
        const infos = this.results.filter((r) => r.severity === "info");
        const debugs = this.results.filter((r) => r.severity === "debug");

        const groups: ResultTreeItem[] = [];

        // Order: Debug -> Info -> Warning -> Error (least to most severe)

        if (debugs.length > 0) {
            const item = new ResultTreeItem(
                `🟣 Debug (${debugs.length})`,
                `${debugs.length} debug message${debugs.length !== 1 ? "s" : ""}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon(
                "bug",
                new vscode.ThemeColor("debugIcon.startForeground"),
            );
            item.results = debugs;
            groups.push(item);
        }

        if (infos.length > 0) {
            const item = new ResultTreeItem(
                `🔵 Info (${infos.length})`,
                `${infos.length} informational message${infos.length !== 1 ? "s" : ""}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon(
                "info",
                new vscode.ThemeColor("editorInfo.foreground"),
            );
            item.results = infos;
            groups.push(item);
        }

        if (warnings.length > 0) {
            const item = new ResultTreeItem(
                `🟡 Warnings (${warnings.length})`,
                `${warnings.length} potential issue${warnings.length !== 1 ? "s" : ""}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon(
                "warning",
                new vscode.ThemeColor("editorWarning.foreground"),
            );
            item.results = warnings;
            groups.push(item);
        }

        if (errors.length > 0) {
            const item = new ResultTreeItem(
                `🔴 Errors (${errors.length})`,
                `${errors.length} critical issue${errors.length !== 1 ? "s" : ""}`,
                vscode.TreeItemCollapsibleState.Expanded,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon(
                "error",
                new vscode.ThemeColor("errorForeground"),
            );
            item.results = errors;
            groups.push(item);
        }

        return groups;
    }

    private getGroupsByCategory(): ResultTreeItem[] {
        const categoryMap = new Map<string, ResultItem[]>();

        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(result);
        }

        const groups: ResultTreeItem[] = [];
        for (const [category, items] of categoryMap.entries()) {
            const item = new ResultTreeItem(
                `${category} (${items.length})`,
                category,
                vscode.TreeItemCollapsibleState.Collapsed,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon("symbol-folder");
            item.results = items;
            groups.push(item);
        }

        return groups.sort((a, b) =>
            a.label.toString().localeCompare(b.label.toString()),
        );
    }

    private getGroupsByFile(): ResultTreeItem[] {
        const fileMap = new Map<string, ResultItem[]>();

        for (const result of this.results) {
            const fileName = result.uri.fsPath;
            if (!fileMap.has(fileName)) {
                fileMap.set(fileName, []);
            }
            fileMap.get(fileName)!.push(result);
        }

        const groups: ResultTreeItem[] = [];
        for (const [filePath, items] of fileMap.entries()) {
            const fileName = filePath.split(/[\\/]/).pop() || filePath;
            const item = new ResultTreeItem(
                `${fileName} (${items.length})`,
                filePath,
                vscode.TreeItemCollapsibleState.Collapsed,
                "group",
            );
            item.iconPath = new vscode.ThemeIcon("file");
            item.results = items;
            groups.push(item);
        }

        return groups;
    }

    private getGroupItems(group: ResultTreeItem): ResultTreeItem[] {
        const results = group.results || [];
        return results.map((result) => {
            const lineNum = result.line + 1; // Convert to 1-based

            // Create rich label with emoji and truncated message
            const severityEmoji = {
                error: "🔴",
                warning: "🟡",
                info: "🔵",
                debug: "🟣",
            };
            const emoji = severityEmoji[result.severity];
            const shortMessage =
                result.message.length > 50
                    ? result.message.substring(0, 47) + "..."
                    : result.message;
            const label = `${emoji} Line ${lineNum}: ${shortMessage}`;

            // Create rich description with timestamp and category badges
            let description = "";
            if (result.timestamp) {
                const timestamp = result.timestamp instanceof Date ? result.timestamp : new Date(result.timestamp);
                const time = timestamp.toLocaleTimeString();
                description = `⏰ ${time}`;
            }
            if (result.category) {
                description = description
                    ? `${description} • 📁 ${result.category}`
                    : `📁 ${result.category}`;
            }

            const item = new ResultTreeItem(
                label,
                description,
                vscode.TreeItemCollapsibleState.None,
                "result",
            );

            // Set icon based on severity with color
            if (result.severity === "error") {
                item.iconPath = new vscode.ThemeIcon(
                    "error",
                    new vscode.ThemeColor("errorForeground"),
                );
            } else if (result.severity === "warning") {
                item.iconPath = new vscode.ThemeIcon(
                    "warning",
                    new vscode.ThemeColor("editorWarning.foreground"),
                );
            } else if (result.severity === "debug") {
                item.iconPath = new vscode.ThemeIcon(
                    "bug",
                    new vscode.ThemeColor("debugIcon.startForeground"),
                );
            } else {
                item.iconPath = new vscode.ThemeIcon(
                    "info",
                    new vscode.ThemeColor("editorInfo.foreground"),
                );
            }

            // Set command to jump to line
            item.command = {
                command: "logScoutAnalyzer.jumpToLine",
                title: "Jump to Line",
                arguments: [result.uri, result.line, result.column],
            };

            // Create enhanced tooltip with rich formatting
            const tooltip = new vscode.MarkdownString();
            tooltip.supportHtml = true;
            tooltip.isTrusted = true;

            // Add severity indicator
            tooltip.appendMarkdown(
                `${emoji} **${result.severity.toUpperCase()}**\n\n`,
            );

            // Add metadata in a structured format
            tooltip.appendMarkdown(`---\n\n`);
            if (result.timestamp) {
                tooltip.appendMarkdown(
                    `⏰ **Time:** ${result.timestamp.toLocaleString()}\n\n`,
                );
            }
            if (result.category) {
                tooltip.appendMarkdown(
                    `📁 **Category:** \`${result.category}\`\n\n`,
                );
            }
            const fileName = result.uri.fsPath.split(/[\\/]/).pop();
            tooltip.appendMarkdown(`📄 **File:** \`${fileName}\`\n\n`);
            tooltip.appendMarkdown(
                `📍 **Location:** Line ${lineNum}, Column ${result.column + 1}\n\n`,
            );

            // Add full message
            tooltip.appendMarkdown(`---\n\n`);
            tooltip.appendMarkdown(`**Message:**\n\n${result.message}\n\n`);

            // Add matched text in code block
            if (result.matchedText && result.matchedText !== result.message) {
                tooltip.appendMarkdown(`---\n\n`);
                tooltip.appendMarkdown(`**Matched Text:**\n\n`);
                tooltip.appendCodeblock(result.matchedText, "log");
            }

            // Add context hint if available
            if (result.context) {
                tooltip.appendMarkdown(`\n---\n\n`);
                tooltip.appendMarkdown(`💡 **Context Available**\n\n`);
                tooltip.appendCodeblock(
                    result.context.substring(0, 200) + "...",
                    "log",
                );
            }

            item.tooltip = tooltip;

            item.result = result;
            return item;
        });
    }
}

export class ResultTreeItem extends vscode.TreeItem {
    public results?: ResultItem[];
    public result?: ResultItem;

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
