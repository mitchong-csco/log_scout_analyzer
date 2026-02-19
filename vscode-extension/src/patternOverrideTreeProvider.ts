import * as vscode from "vscode";
import { PatternOverrideManager, PatternOverride } from "./patternOverrideManager";

type PatternCategory = "overrides" | "custom" | "disabled";

export class PatternOverrideTreeProvider
  implements vscode.TreeDataProvider<PatternTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    PatternTreeItem | undefined
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly manager: PatternOverrideManager) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: PatternTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: PatternTreeItem): Thenable<PatternTreeItem[]> {
    if (!element) {
      return Promise.resolve([
        new PatternTreeItem(
          "Overrides",
          vscode.TreeItemCollapsibleState.Expanded,
          "category",
          "overrides",
        ),
        new PatternTreeItem(
          "Custom Patterns",
          vscode.TreeItemCollapsibleState.Expanded,
          "category",
          "custom",
        ),
        new PatternTreeItem(
          "Disabled",
          vscode.TreeItemCollapsibleState.Collapsed,
          "category",
          "disabled",
        ),
      ]);
    }

    if (element.type === "category" && element.categoryId) {
      return Promise.resolve(this.getPatternsForCategory(element.categoryId));
    }

    return Promise.resolve([]);
  }

  private getPatternsForCategory(category: PatternCategory): PatternTreeItem[] {
    let patterns: PatternOverride[] = [];

    switch (category) {
      case "overrides":
        patterns = this.manager
          .getAllOverrides()
          .filter((pattern) => pattern.enabled !== false);
        break;
      case "custom":
        patterns = this.manager
          .getAllCustom()
          .filter((pattern) => pattern.enabled !== false);
        break;
      case "disabled":
        patterns = this.manager
          .getAllPatterns()
          .filter((pattern) => pattern.enabled === false);
        break;
      default:
        patterns = [];
    }

    return patterns
      .sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, undefined, {
          sensitivity: "base",
        }),
      )
      .map((pattern) => new PatternTreeItem(
        pattern.name?.trim() ? pattern.name : pattern.id,
        vscode.TreeItemCollapsibleState.None,
        "pattern",
        undefined,
        pattern,
      ));
  }
}

class PatternTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly type: "category" | "pattern",
    public readonly categoryId?: PatternCategory,
    public readonly pattern?: PatternOverride,
  ) {
    super(label, collapsibleState);

    if (type === "category") {
      this.contextValue = "patternCategory";
      this.iconPath = new vscode.ThemeIcon("folder");
      return;
    }

    if (!pattern) {
      return;
    }

    this.contextValue = "patternItem";
    this.description = `${pattern.severity}${pattern.enabled === false ? " (disabled)" : ""}`;
    this.tooltip =
      `ID: ${pattern.id}\n` +
      `Source: ${pattern.sourceType}\n` +
      `Severity: ${pattern.severity}\n` +
      `Enabled: ${pattern.enabled !== false}`;
    this.iconPath = new vscode.ThemeIcon(
      pattern.enabled === false ? "circle-slash" : "symbol-property",
    );
  }
}
