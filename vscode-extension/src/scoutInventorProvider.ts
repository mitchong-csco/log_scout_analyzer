import * as vscode from "vscode";

/**
 * Item types for Scout Inventor
 */
export enum InventorItemType {
    Category,
    Action,
    Tool,
    Quick,
}

/**
 * Tree item for Scout Inventor
 */
export class InventorItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly type: InventorItemType,
        public readonly commandId?: string,
        public readonly collapsibleState?: vscode.TreeItemCollapsibleState,
        public readonly children?: InventorItem[]
    ) {
        super(
            label,
            collapsibleState || vscode.TreeItemCollapsibleState.None
        );

        // Set icons based on type
        switch (type) {
            case InventorItemType.Category:
                this.iconPath = new vscode.ThemeIcon("folder");
                break;
            case InventorItemType.Action:
                this.iconPath = new vscode.ThemeIcon("play");
                break;
            case InventorItemType.Tool:
                this.iconPath = new vscode.ThemeIcon("tools");
                break;
            case InventorItemType.Quick:
                this.iconPath = new vscode.ThemeIcon("zap");
                break;
        }

        // Set command if provided
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
            };
        }

        // Set context value for when clauses
        this.contextValue = type.toString();
    }
}

/**
 * Provides the Scout Inventor tree view with quick actions and tools
 */
export class ScoutInventorProvider
    implements vscode.TreeDataProvider<InventorItem>
{
    private _onDidChangeTreeData: vscode.EventEmitter<
        InventorItem | undefined | null | void
    > = new vscode.EventEmitter<InventorItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        InventorItem | undefined | null | void
    > = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: InventorItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: InventorItem): Thenable<InventorItem[]> {
        if (!element) {
            // Root level items
            return Promise.resolve(this.getRootItems());
        } else {
            // Child items
            return Promise.resolve(element.children || []);
        }
    }

    /**
     * Get root level items
     */
    private getRootItems(): InventorItem[] {
        return [
            // Quick Actions Section
            new InventorItem(
                "⚡ Quick Actions",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Expanded,
                [
                    new InventorItem(
                        "Analyze Current File",
                        InventorItemType.Quick,
                        "logScoutAnalyzer.analyzeFile"
                    ),
                    new InventorItem(
                        "Clear Results",
                        InventorItemType.Quick,
                        "logScoutAnalyzer.clearDiagnostics"
                    ),
                    new InventorItem(
                        "Clear Cache",
                        InventorItemType.Quick,
                        "logScoutAnalyzer.clearCache"
                    ),
                    new InventorItem(
                        "Show Patterns",
                        InventorItemType.Quick,
                        "logScoutAnalyzer.showPatterns"
                    ),
                ]
            ),

            // Creation Tools Section
            new InventorItem(
                "✨ Creation & Authoring",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Expanded,
                [
                    new InventorItem(
                        "Open Action Panel",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.openActionPanel"
                    ),
                    new InventorItem(
                        "Create Pattern",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.createPattern"
                    ),
                    new InventorItem(
                        "Create Signature",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.createSignature"
                    ),
                    new InventorItem(
                        "Create Scenario",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.createScenario"
                    ),
                    new InventorItem(
                        "Create Action",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.createAction"
                    ),
                ]
            ),

            // Visualization Section
            new InventorItem(
                "📊 Visualization",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Expanded,
                [
                    new InventorItem(
                        "Show Timeline",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.showTimelineVisualization"
                    ),
                    new InventorItem(
                        "Show Ladder Diagram",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.showLadderDiagram"
                    ),
                    new InventorItem(
                        "Open Split View",
                        InventorItemType.Tool,
                        "logScoutAnalyzer.openSplitView"
                    ),
                ]
            ),

            // Export & Share Section
            new InventorItem(
                "📤 Export & Share",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Expanded,
                [
                    new InventorItem(
                        "Export Results",
                        InventorItemType.Action,
                        "logScoutAnalyzer.exportResults"
                    ),
                    new InventorItem(
                        "Export Patterns",
                        InventorItemType.Action,
                        "logScoutAnalyzer.exportPatterns"
                    ),
                    new InventorItem(
                        "Export Scenarios",
                        InventorItemType.Action,
                        "logScoutAnalyzer.exportScenarios"
                    ),
                ]
            ),

            // Batch Operations Section
            new InventorItem(
                "🔄 Batch Operations",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                [
                    new InventorItem(
                        "Analyze Directory",
                        InventorItemType.Action,
                        "logScoutAnalyzer.analyzeDirectory"
                    ),
                    new InventorItem(
                        "Analyze All Below",
                        InventorItemType.Action,
                        "logScoutAnalyzer.analyzeAllBelow"
                    ),
                ]
            ),

            // Console Section
            new InventorItem(
                "🖥️ Console",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                [
                    new InventorItem(
                        "Show Console",
                        InventorItemType.Action,
                        "logScoutAnalyzer.showConsole"
                    ),
                    new InventorItem(
                        "Clear Console",
                        InventorItemType.Action,
                        "logScoutAnalyzer.clearConsole"
                    ),
                ]
            ),

            // View Options Section
            new InventorItem(
                "👁️ View Options",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                [
                    new InventorItem(
                        "Group by Severity",
                        InventorItemType.Action,
                        "logScoutAnalyzer.groupBySeverity"
                    ),
                    new InventorItem(
                        "Group by Category",
                        InventorItemType.Action,
                        "logScoutAnalyzer.groupByCategory"
                    ),
                    new InventorItem(
                        "Group by File",
                        InventorItemType.Action,
                        "logScoutAnalyzer.groupByFile"
                    ),
                    new InventorItem(
                        "Reset View",
                        InventorItemType.Action,
                        "logScoutAnalyzer.resetView"
                    ),
                ]
            ),

            // Info Section
            new InventorItem(
                "ℹ️ Information",
                InventorItemType.Category,
                undefined,
                vscode.TreeItemCollapsibleState.Collapsed,
                [
                    new InventorItem(
                        "Show Version",
                        InventorItemType.Action,
                        "logScoutAnalyzer.showVersion"
                    ),
                    new InventorItem(
                        "Show Cache Stats",
                        InventorItemType.Action,
                        "logScoutAnalyzer.showCacheStats"
                    ),
                ]
            ),
        ];
    }
}
