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

  // === LSP Server Fields (snake_case standard) ===
  template?: string; // Raw template with {{ FIELD }} placeholders
  merged_template?: string; // Template with field values substituted
  log_line?: string; // Full original log line (citation)
  extracted_parameters?: Array<{ name: string; value: string }>; // Structured parameters
  pattern_id?: string; // Unique pattern identifier
  pattern_regex?: string; // Regex pattern (for debugging/pattern creation)
  log_level?: string; // Log level (ERROR, WARN, INFO, DEBUG)

  // === Complete LSP Data ===
  diagnosticData?: any; // ALL diagnostic data from LSP (includes all TagScout fields)
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
  private sortBy: "line" | "severity" | "time" | "file" | "category" = "line";
  private originalResults: ResultItem[] = [];

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setResults(results: ResultItem[]): void {
    this.results = results;
    this.originalResults = [...results]; // Store original for reset
    this.applySorting();
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

  setSortBy(sortBy: "line" | "severity" | "time" | "file" | "category"): void {
    this.sortBy = sortBy;
    this.applySorting();
    this.refresh();
  }

  getSortBy(): "line" | "severity" | "time" | "file" | "category" {
    return this.sortBy;
  }

  private applySorting(): void {
    switch (this.sortBy) {
      case "line":
        // Sort by URI, then by line number
        this.results.sort((a, b) => {
          const uriCompare = a.uri.fsPath.localeCompare(b.uri.fsPath);
          return uriCompare !== 0 ? uriCompare : a.line - b.line;
        });
        break;
      case "severity":
        // Sort by severity (Error > Warning > Info > Debug), then by line
        const severityOrder = { error: 0, warning: 1, info: 2, debug: 3 };
        this.results.sort((a, b) => {
          const severityDiff =
            severityOrder[a.severity] - severityOrder[b.severity];
          return severityDiff !== 0 ? severityDiff : a.line - b.line;
        });
        break;
      case "time":
        // Sort by timestamp (newest first), then by line
        this.results.sort((a, b) => {
          if (!a.timestamp && !b.timestamp) return a.line - b.line;
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          const timeDiff = b.timestamp.getTime() - a.timestamp.getTime();
          return timeDiff !== 0 ? timeDiff : a.line - b.line;
        });
        break;
      case "file":
        // Sort by filename, then by line
        this.results.sort((a, b) => {
          const fileA = a.uri.fsPath.split(/[\\/]/).pop() || "";
          const fileB = b.uri.fsPath.split(/[\\/]/).pop() || "";
          const fileCompare = fileA.localeCompare(fileB);
          return fileCompare !== 0 ? fileCompare : a.line - b.line;
        });
        break;
      case "category":
        // Sort by category, then by line
        this.results.sort((a, b) => {
          const catA = a.category || "Uncategorized";
          const catB = b.category || "Uncategorized";
          const catCompare = catA.localeCompare(catB);
          return catCompare !== 0 ? catCompare : a.line - b.line;
        });
        break;
    }
  }

  resetGrouping(): void {
    this.groupBy = "severity";
    this.sortBy = "line";
    this.results = [...this.originalResults]; // Restore original results
    this.applySorting();
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
    const errorCount = this.results.filter(
      (r) => r.severity === "error",
    ).length;
    const warningCount = this.results.filter(
      (r) => r.severity === "warning",
    ).length;
    const infoCount = this.results.filter((r) => r.severity === "info").length;
    const debugCount = this.results.filter(
      (r) => r.severity === "debug",
    ).length;

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
    tooltip.appendMarkdown(`**Current View: ${this.getGroupByLabel()}**\n\n`);
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

      // Format timestamp
      let timeStr = "";
      if (result.timestamp) {
        const timestamp =
          result.timestamp instanceof Date
            ? result.timestamp
            : new Date(result.timestamp);
        timeStr = timestamp.toLocaleString();
      }

      // Create label with timestamp and message
      const label = timeStr ? `${timeStr}  ${result.message}` : result.message;

      // Create description with structured fields
      const descParts: string[] = [];
      if (result.category) {
        descParts.push(`Category: ${result.category}`);
      }
      if (result.patternName) {
        descParts.push(`Pattern: ${result.patternName}`);
      }
      descParts.push(`Line: ${lineNum}, Col: ${result.column + 1}`);
      const description = descParts.join(" | ");

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

      // Build header line: Category (left) | trace level filename:line (right)
      const fileName = result.uri.fsPath.split(/[\\/]/).pop();
      const category = result.category || "";
      const rightParts: string[] = [];

      rightParts.push(result.severity.toUpperCase());
      rightParts.push(`${fileName}:${lineNum}`);

      const rightSide = rightParts.join(" ");

      // Use HTML for left/right justification
      tooltip.appendMarkdown(
        `<div style="display: flex; justify-content: space-between;"><span>${category}</span><span>${rightSide}</span></div>\n\n`,
      );
      tooltip.appendMarkdown(`---\n\n`);

      // Show the merged template (template with values substituted) or fall back to matched text
      const displayText =
        result.merged_template || result.matchedText || result.message;
      tooltip.appendMarkdown(`${displayText}\n\n`);

      // Add pattern ID as clickable link below message
      if (result.patternId) {
        const encodedId = encodeURIComponent(
          JSON.stringify([result.patternId]),
        );
        tooltip.appendMarkdown(
          `Pattern: [(${result.patternId})](command:logScoutAnalyzer.showPatternById?${encodedId})\n\n`,
        );
      }

      tooltip.appendMarkdown(`---\n\n`);
      tooltip.appendCodeblock(result.context, "log");

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
