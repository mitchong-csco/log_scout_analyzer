import * as vscode from "vscode";

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
    const items: AnalyzerTreeItem[] = [];

    // Analysis Commands
    const analyzeCurrentFile = new AnalyzerTreeItem(
      "Analyze Current File",
      "Run analysis on active file",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    analyzeCurrentFile.iconPath = new vscode.ThemeIcon("file-code");
    analyzeCurrentFile.command = {
      command: "logScoutAnalyzer.analyzeCurrentFile",
      title: "Analyze Current File",
    };
    items.push(analyzeCurrentFile);

    const analyzeDirectory = new AnalyzerTreeItem(
      "Analyze Directory",
      "Analyze all files in a directory",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    analyzeDirectory.iconPath = new vscode.ThemeIcon("folder");
    analyzeDirectory.command = {
      command: "logScoutAnalyzer.analyzeDirectory",
      title: "Analyze Directory",
    };
    items.push(analyzeDirectory);

    const analyzeRecursive = new AnalyzerTreeItem(
      "Analyze Recursively",
      "Analyze directory and subdirectories",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    analyzeRecursive.iconPath = new vscode.ThemeIcon("folder-library");
    analyzeRecursive.command = {
      command: "logScoutAnalyzer.analyzeDirectoryRecursive",
      title: "Analyze Recursively",
    };
    items.push(analyzeRecursive);

    const clearResults = new AnalyzerTreeItem(
      "Clear Results",
      "Clear all analysis results",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    clearResults.iconPath = new vscode.ThemeIcon("clear-all");
    clearResults.command = {
      command: "logScoutAnalyzer.clearResults",
      title: "Clear Results",
    };
    items.push(clearResults);

    const exportResults = new AnalyzerTreeItem(
      "Export Results",
      "Export results to JSON/CSV",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    exportResults.iconPath = new vscode.ThemeIcon("export");
    exportResults.command = {
      command: "logScoutAnalyzer.exportResults",
      title: "Export Results",
    };
    items.push(exportResults);

    const showConsole = new AnalyzerTreeItem(
      "Show Console",
      "Open Log Scout console",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    showConsole.iconPath = new vscode.ThemeIcon("output");
    showConsole.command = {
      command: "logScoutAnalyzer.showConsole",
      title: "Show Console",
    };
    items.push(showConsole);

    const toggleConsole = new AnalyzerTreeItem(
      "Toggle Console Location",
      "Move console between panel/editor",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    toggleConsole.iconPath = new vscode.ThemeIcon("move");
    toggleConsole.command = {
      command: "logScoutAnalyzer.toggleConsoleLocation",
      title: "Toggle Console Location",
    };
    items.push(toggleConsole);

    const showPatterns = new AnalyzerTreeItem(
      "Show Pattern Library",
      "View all available patterns",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    showPatterns.iconPath = new vscode.ThemeIcon("book");
    showPatterns.command = {
      command: "logScoutAnalyzer.showPatterns",
      title: "Show Pattern Library",
    };
    items.push(showPatterns);

    const timelineViz = new AnalyzerTreeItem(
      "Timeline Visualization",
      "Show events over time",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    timelineViz.iconPath = new vscode.ThemeIcon("graph-line");
    timelineViz.command = {
      command: "logScoutAnalyzer.showTimelineVisualization",
      title: "Timeline Visualization",
    };
    items.push(timelineViz);

    const sipLadder = new AnalyzerTreeItem(
      "SIP Ladder Diagram",
      "Show SIP call flow diagram",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    sipLadder.iconPath = new vscode.ThemeIcon("symbol-method");
    sipLadder.command = {
      command: "logScoutAnalyzer.showSIPLadderDiagram",
      title: "SIP Ladder Diagram",
    };
    items.push(sipLadder);

    const about = new AnalyzerTreeItem(
      "About",
      "Show Log Scout version info",
      vscode.TreeItemCollapsibleState.None,
      "analyzeCommand",
    );
    about.iconPath = new vscode.ThemeIcon("info");
    about.command = {
      command: "logScoutAnalyzer.showAbout",
      title: "About",
    };
    items.push(about);

    return items;
  }
}

export class AnalyzerTreeItem extends vscode.TreeItem {
  public metadata?: string;

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
