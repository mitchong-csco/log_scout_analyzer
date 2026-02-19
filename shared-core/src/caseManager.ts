/**
 * Core Case Manager - Platform-agnostic case management logic
 * Used by both VS Code and Zed extensions through platform adapters
 */

import {
  CaseInfo,
  CaseStatus,
  IPlatformAdapter,
  CaseManagerOptions,
  CaseEventListener,
  CaseEvent,
  CaseEventType,
  CaseStatistics,
  CaseFilter,
  ArchiveFormat,
  ArchiveInfo,
  ExportOptions,
} from "./types";

export class CoreCaseManager {
  private cases: Map<string, CaseInfo> = new Map();
  private adapter: IPlatformAdapter;
  private basePath: string;
  private storageKey: string;
  private logExtensions: string[];
  private eventListeners: Map<CaseEventType, Set<CaseEventListener>> =
    new Map();

  constructor(options: CaseManagerOptions) {
    this.adapter = options.adapter;
    this.basePath = options.basePath;
    this.storageKey = options.storageKey || "logScoutAnalyzer.cases";
    this.logExtensions = options.logExtensions || [
      ".log",
      ".txt",
      ".out",
      ".err",
      ".trace",
    ];
  }

  /**
   * Initialize the case manager
   */
  async initialize(): Promise<void> {
    try {
      // Ensure base directory exists
      await this.adapter.createDir(this.basePath);

      // Load persisted cases
      const data = await this.adapter.loadData(this.storageKey);
      if (data && Array.isArray(data)) {
        for (const caseData of data) {
          try {
            const caseInfo: CaseInfo = {
              ...caseData,
              createdDate: new Date(caseData.createdDate),
              downloadedDate: new Date(caseData.downloadedDate),
            };
            this.cases.set(caseInfo.caseId, caseInfo);
          } catch (error) {
            this.adapter.log(`Failed to load case: ${error}`, "warn");
          }
        }
        this.adapter.log(
          `Loaded ${this.cases.size} cases from storage`,
          "info",
        );
      }
    } catch (error) {
      this.adapter.log(`Failed to initialize case manager: ${error}`, "error");
      throw error;
    }
  }

  /**
   * Download a case from a URL
   */
  async downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo> {
    try {
      this.adapter.log(`Starting download from: ${url}`, "info");

      // Generate case ID if not provided
      if (!caseId) {
        caseId = this.generateCaseId();
      }

      // Validate case ID doesn't exist
      if (this.cases.has(caseId)) {
        throw new Error(`Case with ID ${caseId} already exists`);
      }

      // Create case directory structure
      const casePath = this.adapter.joinPath(this.basePath, caseId);
      await this.adapter.createDir(casePath);

      const archivePath = this.adapter.joinPath(casePath, "archive");
      await this.adapter.createDir(archivePath);

      // Determine filename from URL
      const fileName = this.extractFileNameFromUrl(url);
      const downloadPath = this.adapter.joinPath(archivePath, fileName);

      // Create case info
      const caseInfo: CaseInfo = {
        caseId,
        caseName: caseId,
        description: `Downloaded from ${url}`,
        createdDate: new Date(),
        downloadedDate: new Date(),
        sourcePath: downloadPath,
        extractedPath: this.adapter.joinPath(casePath, "logs"),
        logFiles: [],
        status: "downloading",
        metadata: {
          sourceUrl: url,
        },
      };

      this.cases.set(caseId, caseInfo);
      await this.saveCases();
      this.emitEvent("caseAdded", caseId, caseInfo);

      // Download file with progress
      await this.adapter.showProgress(
        `Downloading case ${caseId}`,
        async (progress) => {
          await this.adapter.downloadFile(url, downloadPath, (percent) => {
            progress(percent, `${percent.toFixed(1)}% complete`);
          });
        },
      );

      this.adapter.log(`Download completed: ${downloadPath}`, "info");

      // Extract archive
      await this.extractCase(caseId);

      return caseInfo;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.adapter.log(`Error downloading case: ${errorMsg}`, "error");

      // Update case status to error if it exists
      if (caseId && this.cases.has(caseId)) {
        const caseInfo = this.cases.get(caseId)!;
        caseInfo.status = "error";
        caseInfo.errorMessage = errorMsg;
        await this.saveCases();
        this.emitEvent("caseStatusChanged", caseId, caseInfo, "downloading");
      }

      throw error;
    }
  }

  /**
   * Import a case from a local archive file
   */
  async importCaseFromLocal(
    archivePath: string,
    caseId?: string,
  ): Promise<CaseInfo> {
    try {
      this.adapter.log(`Importing case from: ${archivePath}`, "info");

      // Verify file exists
      if (!(await this.adapter.fileExists(archivePath))) {
        throw new Error(`File not found: ${archivePath}`);
      }

      // Generate case ID if not provided
      if (!caseId) {
        caseId = this.generateCaseId();
      }

      // Validate case ID doesn't exist
      if (this.cases.has(caseId)) {
        throw new Error(`Case with ID ${caseId} already exists`);
      }

      // Create case directory structure
      const casePath = this.adapter.joinPath(this.basePath, caseId);
      await this.adapter.createDir(casePath);

      const archiveDir = this.adapter.joinPath(casePath, "archive");
      await this.adapter.createDir(archiveDir);

      const fileName = this.adapter.basename(archivePath);
      const targetPath = this.adapter.joinPath(archiveDir, fileName);

      // Copy archive to case directory
      await this.adapter.showProgress(
        `Importing case ${caseId}`,
        async (progress) => {
          progress(0, "Copying archive...");
          await this.adapter.copyFile(archivePath, targetPath);
          progress(50, "Archive copied");
        },
      );

      // Create case info
      const caseInfo: CaseInfo = {
        caseId,
        caseName: caseId,
        description: `Imported from ${archivePath}`,
        createdDate: new Date(),
        downloadedDate: new Date(),
        sourcePath: targetPath,
        extractedPath: this.adapter.joinPath(casePath, "logs"),
        logFiles: [],
        status: "extracting",
        metadata: {
          originalPath: archivePath,
        },
      };

      this.cases.set(caseId, caseInfo);
      await this.saveCases();
      this.emitEvent("caseAdded", caseId, caseInfo);

      // Extract archive
      await this.extractCase(caseId);

      return caseInfo;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.adapter.log(`Error importing case: ${errorMsg}`, "error");

      // Update case status to error if it exists
      if (caseId && this.cases.has(caseId)) {
        const caseInfo = this.cases.get(caseId)!;
        caseInfo.status = "error";
        caseInfo.errorMessage = errorMsg;
        await this.saveCases();
        this.emitEvent("caseStatusChanged", caseId, caseInfo, "extracting");
      }

      throw error;
    }
  }

  /**
   * Extract an archive for a case
   */
  async extractCase(caseId: string): Promise<void> {
    const caseInfo = this.cases.get(caseId);
    if (!caseInfo) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const previousStatus = caseInfo.status;

    try {
      this.adapter.log(`Extracting case: ${caseId}`, "info");
      caseInfo.status = "extracting";
      await this.saveCases();
      this.emitEvent("caseStatusChanged", caseId, caseInfo, previousStatus);

      // Ensure extraction directory exists
      await this.adapter.createDir(caseInfo.extractedPath);

      // Determine archive type and extract
      const archiveInfo = this.detectArchiveFormat(caseInfo.sourcePath);

      await this.adapter.showProgress(
        `Extracting case ${caseId}`,
        async (progress) => {
          progress(0, "Extracting archive...");

          switch (archiveInfo.format) {
            case "zip":
              await this.adapter.extractZip(
                caseInfo.sourcePath,
                caseInfo.extractedPath,
              );
              break;
            case "tar":
            case "tar.gz":
            case "tgz":
              await this.adapter.extractTar(
                caseInfo.sourcePath,
                caseInfo.extractedPath,
              );
              break;
            case "7z":
              await this.adapter.extract7z(
                caseInfo.sourcePath,
                caseInfo.extractedPath,
              );
              break;
            default:
              throw new Error(
                `Unsupported archive format: ${archiveInfo.format}`,
              );
          }

          progress(70, "Discovering log files...");

          // Discover log files
          caseInfo.logFiles = await this.discoverLogFiles(
            caseInfo.extractedPath,
          );
          progress(100, "Complete");
        },
      );

      caseInfo.status = "ready";
      await this.saveCases();

      this.adapter.log(
        `Extraction completed. Found ${caseInfo.logFiles.length} log files.`,
        "info",
      );
      this.emitEvent("caseStatusChanged", caseId, caseInfo, "extracting");
      this.emitEvent("caseFilesDiscovered", caseId, caseInfo);

      // Show success message
      this.adapter.showMessage(
        `Case ${caseInfo.caseName} is ready with ${caseInfo.logFiles.length} log files.`,
        "success",
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      caseInfo.status = "error";
      caseInfo.errorMessage = errorMsg;
      this.adapter.log(`Error extracting case: ${errorMsg}`, "error");
      await this.saveCases();
      this.emitEvent("caseStatusChanged", caseId, caseInfo, previousStatus);
      throw error;
    }
  }

  /**
   * Discover log files in a directory recursively
   */
  private async discoverLogFiles(directory: string): Promise<string[]> {
    const logFiles: string[] = [];

    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await this.adapter.readDir(dir);

        for (const entry of entries) {
          const fullPath = this.adapter.joinPath(dir, entry);

          try {
            const isDir = await this.adapter.isDirectory(fullPath);

            if (isDir) {
              // Recurse into subdirectory
              await scanDirectory(fullPath);
            } else {
              // Check if file has a log extension
              const ext = this.adapter.extname(entry).toLowerCase();
              if (this.logExtensions.includes(ext)) {
                logFiles.push(fullPath);
              }
            }
          } catch {
            // Skip files/dirs we can't access
          }
        }
      } catch (error) {
        this.adapter.log(`Error scanning directory ${dir}: ${error}`, "warn");
      }
    };

    await scanDirectory(directory);
    return logFiles;
  }

  /**
   * Get all cases
   */
  getAllCases(): CaseInfo[] {
    return Array.from(this.cases.values());
  }

  /**
   * Get cases with optional filtering
   */
  getCases(filter?: CaseFilter): CaseInfo[] {
    let cases = this.getAllCases();

    if (!filter) {
      return cases;
    }

    // Filter by status
    if (filter.status && filter.status.length > 0) {
      cases = cases.filter((c) => filter.status!.includes(c.status));
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      cases = cases.filter(
        (c) => c.tags && filter.tags!.some((tag) => c.tags!.includes(tag)),
      );
    }

    // Filter by search text
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.caseName.toLowerCase().includes(searchLower) ||
          (c.description && c.description.toLowerCase().includes(searchLower)),
      );
    }

    // Filter by date range
    if (filter.dateRange) {
      if (filter.dateRange.start) {
        cases = cases.filter(
          (c) => c.downloadedDate >= filter.dateRange!.start!,
        );
      }
      if (filter.dateRange.end) {
        cases = cases.filter((c) => c.downloadedDate <= filter.dateRange!.end!);
      }
    }

    return cases;
  }

  /**
   * Get a specific case by ID
   */
  getCase(caseId: string): CaseInfo | undefined {
    return this.cases.get(caseId);
  }

  /**
   * Delete a case
   */
  async deleteCase(caseId: string, deleteFiles: boolean = true): Promise<void> {
    const caseInfo = this.cases.get(caseId);
    if (!caseInfo) {
      throw new Error(`Case not found: ${caseId}`);
    }

    try {
      if (deleteFiles) {
        const casePath = this.adapter.joinPath(this.basePath, caseId);
        await this.adapter.deleteDir(casePath);
        this.adapter.log(`Deleted case files: ${caseId}`, "info");
      }

      this.cases.delete(caseId);
      await this.saveCases();
      this.emitEvent("caseDeleted", caseId, caseInfo);

      this.adapter.log(`Removed case from list: ${caseId}`, "info");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.adapter.log(`Error deleting case: ${errorMsg}`, "error");
      throw error;
    }
  }

  /**
   * Update case metadata
   */
  async updateCaseInfo(
    caseId: string,
    updates: Partial<CaseInfo>,
  ): Promise<void> {
    const caseInfo = this.cases.get(caseId);
    if (!caseInfo) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const previousStatus = caseInfo.status;
    Object.assign(caseInfo, updates);
    await this.saveCases();

    if (updates.status && updates.status !== previousStatus) {
      this.emitEvent("caseStatusChanged", caseId, caseInfo, previousStatus);
    }

    this.emitEvent("caseUpdated", caseId, caseInfo);
  }

  /**
   * Get log files for a specific case
   */
  getCaseLogFiles(caseId: string): string[] {
    const caseInfo = this.cases.get(caseId);
    return caseInfo ? caseInfo.logFiles : [];
  }

  /**
   * Get statistics about all cases
   */
  getStatistics(): CaseStatistics {
    const cases = this.getAllCases();

    return {
      totalCases: cases.length,
      readyCases: cases.filter((c) => c.status === "ready").length,
      pendingCases: cases.filter(
        (c) =>
          c.status === "pending" ||
          c.status === "downloading" ||
          c.status === "extracting",
      ).length,
      errorCases: cases.filter((c) => c.status === "error").length,
      totalLogFiles: cases.reduce((sum, c) => sum + c.logFiles.length, 0),
      totalSize: 0, // Can be implemented if needed
    };
  }

  /**
   * Detect archive format from file path
   */
  detectArchiveFormat(filePath: string): ArchiveInfo {
    const normalized = filePath.toLowerCase();
    let format: ArchiveFormat = "unknown";

    if (normalized.endsWith(".zip")) {
      format = "zip";
    } else if (normalized.endsWith(".tar.gz") || normalized.endsWith(".tgz")) {
      format = "tar.gz";
    } else if (normalized.endsWith(".tar")) {
      format = "tar";
    } else if (normalized.endsWith(".7z")) {
      format = "7z";
    }

    return {
      format,
      size: 0, // Can be populated if needed
    };
  }

  /**
   * Export case information
   */
  async exportCaseInfo(
    caseId: string,
    options: ExportOptions,
  ): Promise<string> {
    const caseInfo = this.cases.get(caseId);
    if (!caseInfo) {
      throw new Error(`Case not found: ${caseId}`);
    }

    switch (options.format) {
      case "json":
        return JSON.stringify(caseInfo, null, 2);

      case "markdown":
        return this.exportToMarkdown(caseInfo);

      case "csv":
        return this.exportToCsv([caseInfo]);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export multiple cases to CSV
   */
  private exportToCsv(cases: CaseInfo[]): string {
    const headers = [
      "Case ID",
      "Name",
      "Status",
      "Created",
      "Log Files",
      "Description",
    ];
    const rows = cases.map((c) => [
      c.caseId,
      c.caseName,
      c.status,
      c.createdDate.toISOString(),
      c.logFiles.length.toString(),
      c.description || "",
    ]);

    return [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
  }

  /**
   * Export case to Markdown format
   */
  private exportToMarkdown(caseInfo: CaseInfo): string {
    return `# Case: ${caseInfo.caseName}

## Details
- **Case ID**: ${caseInfo.caseId}
- **Status**: ${caseInfo.status}
- **Created**: ${caseInfo.createdDate.toLocaleString()}
- **Downloaded**: ${caseInfo.downloadedDate.toLocaleString()}
${caseInfo.description ? `- **Description**: ${caseInfo.description}` : ""}

## Paths
- **Archive**: ${caseInfo.sourcePath}
- **Extracted**: ${caseInfo.extractedPath}

## Log Files (${caseInfo.logFiles.length})
${caseInfo.logFiles.map((f) => `- ${f}`).join("\n")}

${caseInfo.errorMessage ? `\n## Error\n${caseInfo.errorMessage}` : ""}
`;
  }

  /**
   * Add event listener
   */
  addEventListener(
    eventType: CaseEventType,
    listener: CaseEventListener,
  ): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    eventType: CaseEventType,
    listener: CaseEventListener,
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event to listeners
   */
  private emitEvent(
    type: CaseEventType,
    caseId: string,
    caseInfo?: CaseInfo,
    previousStatus?: CaseStatus,
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners && listeners.size > 0) {
      const event: CaseEvent = {
        type,
        caseId,
        caseInfo,
        previousStatus,
      };
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          this.adapter.log(`Error in event listener: ${error}`, "error");
        }
      });
    }
  }

  /**
   * Generate a unique case ID
   */
  private generateCaseId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `case-${timestamp}-${random}`;
  }

  /**
   * Extract filename from URL
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop();
      return filename || "archive.zip";
    } catch {
      return "archive.zip";
    }
  }

  /**
   * Save cases to persistent storage
   */
  private async saveCases(): Promise<void> {
    try {
      const casesArray = Array.from(this.cases.values());
      await this.adapter.saveData(this.storageKey, casesArray);
    } catch (error) {
      this.adapter.log(`Error saving cases: ${error}`, "error");
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.eventListeners.clear();
    this.cases.clear();
  }
}
