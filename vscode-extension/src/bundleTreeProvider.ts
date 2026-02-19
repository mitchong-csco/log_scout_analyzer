import * as vscode from "vscode";
import { getLSPClient } from "./lspClient";

/**
 * Bundle tree provider for VS Code sidebar
 * Shows all bundles and their logs
 */
export class BundleTreeProvider implements vscode.TreeDataProvider<BundleItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    BundleItem | undefined | null
  > = new vscode.EventEmitter<BundleItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<BundleItem | undefined | null> =
    this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: BundleItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BundleItem): Promise<BundleItem[]> {
    if (!element) {
      // Root level - show all bundles
      return this.loadBundles();
    } else if (element.type === "bundle") {
      // Show logs in this bundle
      return this.loadBundleLogs(element.bundleId);
    } else {
      // Logs have no children
      return [];
    }
  }

  private async loadBundles(): Promise<BundleItem[]> {
    // Check if workspace is available
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return [
        new BundleItem(
          "No workspace open",
          "",
          0,
          0,
          "Open a folder to manage bundles",
          "info",
        ),
      ];
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;

    try {
      // Check if bundles directory exists
      const bundlesDir = vscode.Uri.file(bundlesPath);
      const stat = await vscode.workspace.fs.stat(bundlesDir);

      if (stat.type !== vscode.FileType.Directory) {
        return [];
      }

      // Read index.json
      const indexPath = vscode.Uri.file(`${bundlesPath}/index.json`);
      const indexData = await vscode.workspace.fs.readFile(indexPath);
      const index = JSON.parse(Buffer.from(indexData).toString("utf8"));

      if (!index.bundles || index.bundles.length === 0) {
        return [
          new BundleItem(
            "No bundles yet",
            "",
            0,
            0,
            'Create a bundle with "Scout: Create New Bundle"',
            "info",
          ),
        ];
      }

      // Load each bundle's metadata
      const bundles: BundleItem[] = [];
      for (const entry of index.bundles) {
        try {
          const bundlePath = vscode.Uri.file(
            `${bundlesPath}/${entry.id}/bundle.json`,
          );
          const bundleData = await vscode.workspace.fs.readFile(bundlePath);
          const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));

          bundles.push(
            new BundleItem(
              bundle.name,
              bundle.id,
              bundle.logs?.length || 0,
              this.calculateTotalSize(bundle.logs || []),
              bundle.description,
              "bundle",
            ),
          );
        } catch (err) {
          console.error(`Failed to load bundle ${entry.id}:`, err);
        }
      }

      return bundles;
    } catch (error) {
      // Bundles directory doesn't exist yet
      return [
        new BundleItem(
          "No bundles yet",
          "",
          0,
          0,
          'Create a bundle with "Scout: Create New Bundle"',
          "info",
        ),
      ];
    }
  }

  private calculateTotalSize(logs: any[]): number {
    return logs.reduce((sum, log) => sum + (log.size_bytes || 0), 0);
  }

  private async loadBundleLogs(bundleId: string): Promise<BundleItem[]> {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return [];
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const bundlePath = `${workspaceRoot}/.log-scout/bundles/${bundleId}/bundle.json`;

    try {
      const bundleUri = vscode.Uri.file(bundlePath);
      const bundleData = await vscode.workspace.fs.readFile(bundleUri);
      const bundle = JSON.parse(Buffer.from(bundleData).toString("utf8"));

      if (!bundle.logs || bundle.logs.length === 0) {
        return [
          new BundleItem(
            "No logs in bundle",
            bundleId,
            0,
            0,
            "Add logs with right-click on files",
            "info",
          ),
        ];
      }

      return bundle.logs.map(
        (log: any) =>
          new BundleItem(
            log.uri.split(/[\\/]/).pop() || log.uri, // filename only
            bundleId,
            0,
            log.size_bytes || 0,
            log.service,
            "log",
            log.uri,
          ),
      );
    } catch (error) {
      console.error("Failed to load bundle logs:", error);
      return [];
    }
  }

  async createBundle(
    name: string,
    description?: string,
    caseId?: string,
  ): Promise<string | undefined> {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      vscode.window.showErrorMessage("No workspace folder open");
      return undefined;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const bundlesPath = `${workspaceRoot}/.log-scout/bundles`;

    try {
      // Generate bundle ID
      const bundleId = `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Create bundle directory
      const bundleDir = vscode.Uri.file(`${bundlesPath}/${bundleId}`);
      await vscode.workspace.fs.createDirectory(bundleDir);

      // Create bundle.json
      const bundle = {
        id: bundleId,
        name: name,
        description: description || null,
        logs: [],
        metadata: {
          case_id: caseId || null,
          severity: null,
          tags: [],
          owner: null,
          team_members: [],
          custom_fields: {},
        },
        created_at: now,
        updated_at: now,
        analysis: null,
      };

      const bundlePath = vscode.Uri.file(
        `${bundlesPath}/${bundleId}/bundle.json`,
      );
      await vscode.workspace.fs.writeFile(
        bundlePath,
        Buffer.from(JSON.stringify(bundle, null, 2), "utf8"),
      );

      // Update index.json
      await this.updateIndex(bundlesPath, bundleId, name);

      this.refresh();
      return bundleId;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create bundle: ${error}`);
      return undefined;
    }
  }

  private async updateIndex(
    bundlesPath: string,
    bundleId: string,
    bundleName: string,
  ): Promise<void> {
    const indexPath = vscode.Uri.file(`${bundlesPath}/index.json`);
    const now = new Date().toISOString();

    let index: any;
    try {
      const indexData = await vscode.workspace.fs.readFile(indexPath);
      index = JSON.parse(Buffer.from(indexData).toString("utf8"));
    } catch {
      // Index doesn't exist, create new
      index = {
        bundles: [],
        last_updated: now,
      };
    }

    // Add new bundle to index
    index.bundles.push({
      id: bundleId,
      name: bundleName,
    });
    index.last_updated = now;

    // Write updated index
    await vscode.workspace.fs.writeFile(
      indexPath,
      Buffer.from(JSON.stringify(index, null, 2), "utf8"),
    );
  }

  async deleteBundle(bundleId: string): Promise<boolean> {
    const client = getLSPClient();
    if (!client) {
      return false;
    }

    try {
      await client.sendRequest("scout/bundle/delete", {
        bundleId: bundleId,
      });

      this.refresh();
      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete bundle: ${error}`);
      return false;
    }
  }

  async importPackage(packagePath: string): Promise<any> {
    const client = getLSPClient();
    if (!client) {
      throw new Error("LSP client not available");
    }

    // Use workspace/executeCommand instead of custom request
    const response = await client.sendRequest("workspace/executeCommand", {
      command: "logScout.bundle.importPackage",
      arguments: [
        {
          packagePath: packagePath,
          bundleName: null,
          caseId: null,
        },
      ],
    });

    this.refresh();
    return response;
  }

  async analyzeBundle(bundleId: string): Promise<any> {
    const client = getLSPClient();
    if (!client) {
      throw new Error("LSP client not available");
    }

    return await client.sendRequest("scout/bundle/analyze", {
      bundleId: bundleId,
    });
  }
}

/**
 * Bundle tree item
 */
export class BundleItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly bundleId: string,
    public readonly logCount: number,
    public readonly sizeBytes: number,
    public readonly description: string | undefined,
    public readonly type: "bundle" | "log" | "info",
    public readonly uri?: string,
  ) {
    super(
      label,
      type === "bundle"
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    if (type === "bundle") {
      this.contextValue = "bundle";
      this.iconPath = new vscode.ThemeIcon("archive");
      this.description = `${logCount} logs`;
      this.tooltip =
        description ||
        `Bundle: ${label}\n${logCount} logs\n${this.formatSize(sizeBytes)}`;
    } else if (type === "log") {
      this.contextValue = "bundleLog";
      this.iconPath = new vscode.ThemeIcon("file");
      this.description = `${description || "Unknown"} • ${this.formatSize(sizeBytes)}`;
      this.tooltip = `${label}\nService: ${description}\nSize: ${this.formatSize(sizeBytes)}`;

      if (uri) {
        this.command = {
          command: "vscode.open",
          title: "Open Log File",
          arguments: [vscode.Uri.file(uri)],
        };
      }
    } else {
      // info type - used for messages/placeholders
      this.contextValue = "info";
      this.iconPath = new vscode.ThemeIcon("info");
      this.description = description;
      this.tooltip = description;
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
