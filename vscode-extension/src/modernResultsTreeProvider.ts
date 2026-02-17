import * as vscode from "vscode";
import * as path from "path";

export interface ResultItem {
  severity: "error" | "warning" | "info";
  line: number;
  column: number;
  message: string;
  matchedText: string;
  context: string;
  timestamp?: Date;
  category?: string;
  uri?: vscode.Uri;
  mergedTemplate?: string;
  merged_template?: string;
}

export class ModernResultsTreeProvider implements vscode.TreeDataProvider<ModernTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    ModernTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ModernTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ModernTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private results: ResultItem[] = [];
  private groupBy: "severity" | "category" | "file" = "severity";

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setResults(results: ResultItem[]): void {
    this.results = results;
    this.refresh();
  }

  getResults(): ResultItem[] {
    return this.results;
  }

  clear(): void {
    this.results = [];
    this.refresh();
  }

  setGroupBy(groupBy: "severity" | "category" | "file"): void {
    this.groupBy = groupBy;
    this.refresh();
  }

  resetGrouping(): void {
    this.groupBy = "severity";
    this.refresh();
  }

  getTreeItem(element: ModernTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ModernTreeItem): Thenable<ModernTreeItem[]> {
    if (!element) {
      // Root level - show groups
      return Promise.resolve(this.getRootItems());
    } else if (element.contextValue === "group") {
      // Group level - show issues in this group
      return Promise.resolve(this.getGroupItems(element.groupId!));
    } else if (element.contextValue === "issue") {
      // Issue level - show context as child if available
      if (element.result?.context) {
        return Promise.resolve([
          new ModernTreeItem(
            "Context",
            element.result.context,
            vscode.TreeItemCollapsibleState.None,
            "context",
            element.result,
          ),
        ]);
      }
    }
    return Promise.resolve([]);
  }

  private getRootItems(): ModernTreeItem[] {
    if (this.results.length === 0) {
      return [
        new ModernTreeItem(
          "No issues found",
          "Run analysis to see results",
          vscode.TreeItemCollapsibleState.None,
          "empty",
        ),
      ];
    }

    switch (this.groupBy) {
      case "severity":
        return this.groupBySeverity();
      case "category":
        return this.groupByCategory();
      case "file":
        return this.groupByFile();
      default:
        return this.groupBySeverity();
    }
  }

  private groupBySeverity(): ModernTreeItem[] {
    const errors = this.results.filter((r) => r.severity === "error");
    const warnings = this.results.filter((r) => r.severity === "warning");
    const infos = this.results.filter((r) => r.severity === "info");

    const items: ModernTreeItem[] = [];

    if (errors.length > 0) {
      const item = new ModernTreeItem(
        `Errors (${errors.length})`,
        "",
        vscode.TreeItemCollapsibleState.Expanded,
        "group",
      );
      item.groupId = "error";
      item.iconPath = new vscode.ThemeIcon(
        "error",
        new vscode.ThemeColor("errorForeground"),
      );
      items.push(item);
    }

    if (warnings.length > 0) {
      const item = new ModernTreeItem(
        `Warnings (${warnings.length})`,
        "",
        vscode.TreeItemCollapsibleState.Collapsed,
        "group",
      );
      item.groupId = "warning";
      item.iconPath = new vscode.ThemeIcon(
        "warning",
        new vscode.ThemeColor("editorWarning.foreground"),
      );
      items.push(item);
    }

    if (infos.length > 0) {
      const item = new ModernTreeItem(
        `Info (${infos.length})`,
        "",
        vscode.TreeItemCollapsibleState.Collapsed,
        "group",
      );
      item.groupId = "info";
      item.iconPath = new vscode.ThemeIcon(
        "info",
        new vscode.ThemeColor("editorInfo.foreground"),
      );
      items.push(item);
    }

    return items;
  }

  private groupByCategory(): ModernTreeItem[] {
    const categories = new Map<string, ResultItem[]>();

    this.results.forEach((result) => {
      const cat = result.category || "Uncategorized";
      if (!categories.has(cat)) {
        categories.set(cat, []);
      }
      categories.get(cat)!.push(result);
    });

    return Array.from(categories.entries()).map(([category, items]) => {
      const item = new ModernTreeItem(
        `${category} (${items.length})`,
        "",
        vscode.TreeItemCollapsibleState.Collapsed,
        "group",
      );
      item.groupId = category;
      item.iconPath = new vscode.ThemeIcon("symbol-folder");
      return item;
    });
  }

  private groupByFile(): ModernTreeItem[] {
    const files = new Map<string, ResultItem[]>();

    this.results.forEach((result) => {
      const file = result.uri?.fsPath || "Unknown";
      if (!files.has(file)) {
        files.set(file, []);
      }
      files.get(file)!.push(result);
    });

    return Array.from(files.entries()).map(([file, items]) => {
      const fileName = path.basename(file);
      const item = new ModernTreeItem(
        `${fileName} (${items.length})`,
        file,
        vscode.TreeItemCollapsibleState.Collapsed,
        "group",
      );
      item.groupId = file;
      item.iconPath = new vscode.ThemeIcon("file");
      return item;
    });
  }

  private getGroupItems(groupId: string): ModernTreeItem[] {
    let filteredResults: ResultItem[];

    if (this.groupBy === "severity") {
      filteredResults = this.results.filter((r) => r.severity === groupId);
    } else if (this.groupBy === "category") {
      filteredResults = this.results.filter(
        (r) => (r.category || "Uncategorized") === groupId,
      );
    } else {
      // file
      filteredResults = this.results.filter(
        (r) => (r.uri?.fsPath || "Unknown") === groupId,
      );
    }

    return filteredResults.map((result) => this.createIssueItem(result));
  }

  private createIssueItem(result: ResultItem): ModernTreeItem {
    // Create rich label with timestamp and category badges
    const lineNum = result.line + 1;
    const timestamp =
      result.timestamp instanceof Date
        ? result.timestamp
        : result.timestamp
          ? new Date(result.timestamp)
          : undefined;
    const time = timestamp ? timestamp.toLocaleTimeString() : "";

    // Main label: Line number and message (truncated)
    const shortMessage =
      result.message.length > 60
        ? result.message.substring(0, 57) + "..."
        : result.message;

    let label = `Line ${lineNum}: ${shortMessage}`;

    // Description: timestamp and category
    let description = "";
    if (time) {
      description = time;
    }
    if (result.category) {
      description = description
        ? `${description} • ${result.category}`
        : result.category;
    }

    const collapsible = result.context
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;

    const item = new ModernTreeItem(
      label,
      description,
      collapsible,
      "issue",
      result,
    );

    // Set icon with color based on severity
    const iconMap = {
      error: {
        icon: "error",
        color: new vscode.ThemeColor("errorForeground"),
      },
      warning: {
        icon: "warning",
        color: new vscode.ThemeColor("editorWarning.foreground"),
      },
      info: {
        icon: "info",
        color: new vscode.ThemeColor("editorInfo.foreground"),
      },
    };

    const iconConfig = iconMap[result.severity];
    item.iconPath = new vscode.ThemeIcon(iconConfig.icon, iconConfig.color);

    // Create rich tooltip
    const tooltip = new vscode.MarkdownString();
    tooltip.supportHtml = true;
    tooltip.isTrusted = true;

    // Add severity indicator with color
    const severityEmoji = {
      error: "🔴",
      warning: "🟡",
      info: "🔵",
    };
    tooltip.appendMarkdown(
      `${severityEmoji[result.severity]} **${result.severity.toUpperCase()}**\n\n`,
    );

    // Add metadata
    if (result.timestamp) {
      tooltip.appendMarkdown(`⏰ ${result.timestamp.toLocaleString()}\n\n`);
    }
    if (result.category) {
      tooltip.appendMarkdown(`📁 Category: \`${result.category}\`\n\n`);
    }
    if (result.uri) {
      tooltip.appendMarkdown(
        `📄 File: \`${path.basename(result.uri.fsPath)}\`\n\n`,
      );
    }
    tooltip.appendMarkdown(
      `📍 Line ${lineNum}, Column ${result.column + 1}\n\n`,
    );

    // Add annotation (interpretation)
    tooltip.appendMarkdown("---\n\n");
    const annotationText =
      result.mergedTemplate || result.merged_template || result.message;
    tooltip.appendMarkdown(`**Annotation:**\n\n${annotationText}\n\n`);

    // Add citation (raw log line evidence)
    if (result.context) {
      tooltip.appendMarkdown("---\n\n");
      tooltip.appendMarkdown("**Citation (Log Line):**\n\n");
      tooltip.appendCodeblock(result.context, "log");
    }

    item.tooltip = tooltip;

    // Set command to jump to line
    if (result.uri) {
      item.command = {
        command: "logScoutAnalyzer.jumpToLine",
        title: "Jump to Line",
        arguments: [result.uri.fsPath, result.line, result.column],
      };
    }

    return item;
  }
}

export class ModernTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly result?: ResultItem,
    public groupId?: string,
  ) {
    super(label, collapsibleState);
    this.description = description;

    // Style context items differently
    if (contextValue === "context" && result) {
      this.iconPath = new vscode.ThemeIcon("quote");
      this.tooltip = new vscode.MarkdownString(
        `\`\`\`\n${result.context}\n\`\`\``,
      );
      // Make context copyable
      this.command = {
        command: "vscode.open",
        title: "Show Context",
        arguments: [],
      };
    }
  }
}
