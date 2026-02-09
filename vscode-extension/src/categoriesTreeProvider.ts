import * as vscode from "vscode";
import { ResultItem } from "./resultsTreeProvider";

export class CategoriesTreeProvider implements vscode.TreeDataProvider<CategoryTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        CategoryTreeItem | undefined | null | void
    > = new vscode.EventEmitter<CategoryTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        CategoryTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    private results: ResultItem[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setResults(results: ResultItem[]): void {
        this.results = results;
        this.refresh();
    }

    clear(): void {
        this.results = [];
        this.refresh();
    }

    getTreeItem(element: CategoryTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CategoryTreeItem): Thenable<CategoryTreeItem[]> {
        if (!element) {
            // Root level - show categories
            return Promise.resolve(this.getCategoryGroups());
        } else if (element.contextValue === "category") {
            // Category level - show results in that category
            return Promise.resolve(this.getCategoryResults(element));
        }
        return Promise.resolve([]);
    }

    private getCategoryGroups(): CategoryTreeItem[] {
        if (this.results.length === 0) {
            return [
                new CategoryTreeItem(
                    "No categories",
                    "",
                    vscode.TreeItemCollapsibleState.None,
                    "empty",
                ),
            ];
        }

        // Group results by category
        const categoryMap = new Map<string, ResultItem[]>();

        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(result);
        }

        // Create tree items for each category
        const items: CategoryTreeItem[] = [];

        for (const [category, results] of categoryMap.entries()) {
            const errors = results.filter((r) => r.severity === "error").length;
            const warnings = results.filter(
                (r) => r.severity === "warning",
            ).length;
            const infos = results.filter((r) => r.severity === "info").length;
            const debugs = results.filter((r) => r.severity === "debug").length;

            // Simple count description
            const parts: string[] = [];
            if (debugs > 0) parts.push(`${debugs} debug`);
            if (infos > 0) parts.push(`${infos} info`);
            if (warnings > 0) parts.push(`${warnings} warnings`);
            if (errors > 0) parts.push(`${errors} errors`);

            const description = parts.join(", ");
            const tooltip = `${category}\n${errors} errors, ${warnings} warnings, ${infos} info`;

            const item = new CategoryTreeItem(
                category,
                description,
                vscode.TreeItemCollapsibleState.Collapsed,
                "category",
            );

            item.iconPath = new vscode.ThemeIcon("symbol-folder");
            item.tooltip = tooltip;
            item.results = results;

            // Badge showing most severe issue
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    "symbol-folder",
                    new vscode.ThemeColor("errorForeground"),
                );
            } else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    "symbol-folder",
                    new vscode.ThemeColor("editorWarning.foreground"),
                );
            }

            items.push(item);
        }

        // Sort by number of errors (descending), then by name
        return items.sort((a, b) => {
            const aErrors =
                a.results?.filter((r) => r.severity === "error").length || 0;
            const bErrors =
                b.results?.filter((r) => r.severity === "error").length || 0;

            if (aErrors !== bErrors) {
                return bErrors - aErrors; // More errors first
            }

            return a.label.toString().localeCompare(b.label.toString());
        });
    }

    private getCategoryResults(category: CategoryTreeItem): CategoryTreeItem[] {
        const results = category.results || [];

        // Sort by severity (errors first), then by line number
        const sortedResults = results.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2, debug: 3 };
            const severityDiff =
                severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            return a.line - b.line;
        });

        return sortedResults.map((result) => {
            const lineNum = result.line + 1; // Convert to 1-based
            const label = `Line ${lineNum}: ${result.message}`;
            const description = result.timestamp
                ? result.timestamp.toLocaleTimeString()
                : "";

            const item = new CategoryTreeItem(
                label,
                description,
                vscode.TreeItemCollapsibleState.None,
                "result",
            );

            // Set icon based on severity
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

            // Add tooltip with more details
            const tooltip = new vscode.MarkdownString();
            tooltip.appendMarkdown(`**Line ${lineNum}:${result.column}**\n\n`);
            tooltip.appendMarkdown(`**Severity:** ${result.severity}\n\n`);
            tooltip.appendMarkdown(`${result.message}\n\n`);
            tooltip.appendCodeblock(result.matchedText, "log");
            if (result.timestamp) {
                tooltip.appendMarkdown(
                    `\n**Time:** ${result.timestamp.toLocaleString()}`,
                );
            }
            item.tooltip = tooltip;

            item.result = result;
            return item;
        });
    }
}

export class CategoryTreeItem extends vscode.TreeItem {
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
