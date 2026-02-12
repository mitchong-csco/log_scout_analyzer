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
    private enabledCategories: Set<string> = new Set();
    private allCategories: Set<string> = new Set();

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setResults(results: ResultItem[]): void {
        this.results = results;
        
        // Update categories list
        this.allCategories.clear();
        for (const result of results) {
            const category = result.category || "Uncategorized";
            this.allCategories.add(category);
            
            // Enable new categories by default
            if (!this.enabledCategories.has(category)) {
                this.enabledCategories.add(category);
            }
        }
        
        this.refresh();
    }

    clear(): void {
        this.results = [];
        this.allCategories.clear();
        this.enabledCategories.clear();
        this.refresh();
    }

    toggleCategory(category: string): void {
        if (this.enabledCategories.has(category)) {
            this.enabledCategories.delete(category);
        } else {
            this.enabledCategories.add(category);
        }
        this.refresh();
    }

    toggleAll(enable: boolean): void {
        if (enable) {
            this.enabledCategories = new Set(this.allCategories);
        } else {
            this.enabledCategories.clear();
        }
        this.refresh();
    }

    getEnabledCategories(): Set<string> {
        return this.enabledCategories;
    }

    getTreeItem(element: CategoryTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: CategoryTreeItem): Thenable<CategoryTreeItem[]> {
        if (!element) {
            // Root level - show category toggle buttons
            return Promise.resolve(this.getCategoryButtons());
        }
        return Promise.resolve([]);
    }

    private getCategoryButtons(): CategoryTreeItem[] {
        if (this.results.length === 0) {
            return [
                new CategoryTreeItem(
                    "No categories",
                    "",
                    vscode.TreeItemCollapsibleState.None,
                    "empty",
                    false,
                ),
            ];
        }

        // Group results by category to get counts
        const categoryMap = new Map<string, ResultItem[]>();

        for (const result of this.results) {
            const category = result.category || "Uncategorized";
            if (!categoryMap.has(category)) {
                categoryMap.set(category, []);
            }
            categoryMap.get(category)!.push(result);
        }

        // Create button items for each category
        const items: CategoryTreeItem[] = [];

        // Add "All" button at the top
        const allEnabled = this.enabledCategories.size === this.allCategories.size;
        const allButton = new CategoryTreeItem(
            allEnabled ? "✓ All Categories" : "☐ All Categories",
            `${this.allCategories.size} total`,
            vscode.TreeItemCollapsibleState.None,
            "toggle-all",
            allEnabled,
        );
        allButton.iconPath = new vscode.ThemeIcon(allEnabled ? "check-all" : "close-all");
        allButton.command = {
            command: "logScoutAnalyzer.toggleAllCategories",
            title: "Toggle All",
            arguments: [!allEnabled],
        };
        items.push(allButton);

        // Sort categories by error count
        const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => {
            const aErrors = a[1].filter((r) => r.severity === "error").length;
            const bErrors = b[1].filter((r) => r.severity === "error").length;
            if (aErrors !== bErrors) return bErrors - aErrors;
            return a[0].localeCompare(b[0]);
        });

        for (const [category, results] of sortedCategories) {
            const enabled = this.enabledCategories.has(category);
            const errors = results.filter((r) => r.severity === "error").length;
            const warnings = results.filter((r) => r.severity === "warning").length;
            const infos = results.filter((r) => r.severity === "info").length;

            // Build count description
            const parts: string[] = [];
            if (errors > 0) parts.push(`${errors}E`);
            if (warnings > 0) parts.push(`${warnings}W`);
            if (infos > 0) parts.push(`${infos}I`);
            const countDesc = parts.join(" ");

            const label = enabled ? `✓ ${category}` : `☐ ${category}`;
            const item = new CategoryTreeItem(
                label,
                countDesc,
                vscode.TreeItemCollapsibleState.None,
                "category-toggle",
                enabled,
            );

            // Set icon based on severity and state
            if (errors > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("errorForeground"),
                );
            } else if (warnings > 0) {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("editorWarning.foreground"),
                );
            } else {
                item.iconPath = new vscode.ThemeIcon(
                    enabled ? "circle-filled" : "circle-outline",
                    new vscode.ThemeColor("editorInfo.foreground"),
                );
            }

            // Command to toggle this category
            item.command = {
                command: "logScoutAnalyzer.toggleCategory",
                title: "Toggle Category",
                arguments: [category],
            };

            item.tooltip = `${category}\n${errors} errors, ${warnings} warnings, ${infos} info\n\nClick to ${enabled ? "hide" : "show"}`;
            item.categoryName = category;

            items.push(item);
        }

        return items;
    }
}

export class CategoryTreeItem extends vscode.TreeItem {
    public categoryName?: string;
    public enabled: boolean;

    constructor(
        public readonly label: string,
        public readonly description: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        enabled: boolean = false,
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.enabled = enabled;
    }
}
