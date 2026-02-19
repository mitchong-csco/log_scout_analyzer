/**
 * Shared types and interfaces for Log Scout Analyzer case management
 * Used by both VS Code and Zed extensions
 */

/**
 * Represents a case with its metadata and file locations
 */
export interface CaseInfo {
    /** Unique identifier for the case */
    caseId: string;

    /** Display name for the case */
    caseName: string;

    /** Optional description of the case */
    description?: string;

    /** When the case was created */
    createdDate: Date;

    /** When the archive was downloaded/imported */
    downloadedDate: Date;

    /** Path to the original archive file */
    sourcePath: string;

    /** Path to the extracted logs directory */
    extractedPath: string;

    /** Array of discovered log file paths */
    logFiles: string[];

    /** Current status of the case */
    status: CaseStatus;

    /** Error message if status is 'error' */
    errorMessage?: string;

    /** Optional tags for categorization */
    tags?: string[];

    /** Optional metadata */
    metadata?: Record<string, any>;
}

/**
 * Case status states
 */
export type CaseStatus = 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';

/**
 * Platform adapter interface - each extension implements this
 * to provide platform-specific functionality
 */
export interface IPlatformAdapter {
    // ========== File System Operations ==========

    /**
     * Check if a file or directory exists
     */
    fileExists(path: string): Promise<boolean>;

    /**
     * Read directory contents (returns file/folder names)
     */
    readDir(path: string): Promise<string[]>;

    /**
     * Create a directory (with parents if needed)
     */
    createDir(path: string): Promise<void>;

    /**
     * Copy a file from source to destination
     */
    copyFile(source: string, dest: string): Promise<void>;

    /**
     * Delete a directory and all its contents
     */
    deleteDir(path: string): Promise<void>;

    /**
     * Check if path is a directory
     */
    isDirectory(path: string): Promise<boolean>;

    /**
     * Get file size in bytes
     */
    getFileSize(path: string): Promise<number>;

    // ========== Archive Extraction ==========

    /**
     * Extract a ZIP archive
     */
    extractZip(archivePath: string, targetPath: string): Promise<void>;

    /**
     * Extract a TAR archive (including .tar.gz, .tgz)
     */
    extractTar(archivePath: string, targetPath: string): Promise<void>;

    /**
     * Extract a 7-Zip archive
     */
    extract7z(archivePath: string, targetPath: string): Promise<void>;

    // ========== HTTP Operations ==========

    /**
     * Download a file from URL to destination
     * @param onProgress Optional callback for progress updates (0-100)
     */
    downloadFile(
        url: string,
        destination: string,
        onProgress?: (percent: number) => void
    ): Promise<void>;

    // ========== Storage Operations ==========

    /**
     * Save data to persistent storage
     */
    saveData(key: string, data: any): Promise<void>;

    /**
     * Load data from persistent storage
     */
    loadData(key: string): Promise<any>;

    /**
     * Delete data from persistent storage
     */
    deleteData(key: string): Promise<void>;

    // ========== UI Operations ==========

    /**
     * Show a message to the user
     */
    showMessage(message: string, type: MessageType): void;

    /**
     * Show progress indicator
     */
    showProgress(
        title: string,
        task: (progress: (percent: number, message?: string) => void) => Promise<void>
    ): Promise<void>;

    /**
     * Prompt user for input
     */
    promptInput(options: InputPromptOptions): Promise<string | undefined>;

    /**
     * Prompt user to select from options
     */
    promptSelect<T>(options: SelectPromptOptions<T>): Promise<T | undefined>;

    /**
     * Prompt user to select a file
     */
    promptFile(options: FilePromptOptions): Promise<string | undefined>;

    /**
     * Confirm action with user
     */
    confirm(message: string, options?: ConfirmOptions): Promise<boolean>;

    // ========== Logging ==========

    /**
     * Log a message
     */
    log(message: string, level: LogLevel): void;

    // ========== Path Operations ==========

    /**
     * Join path segments
     */
    joinPath(...segments: string[]): string;

    /**
     * Get directory name from path
     */
    dirname(path: string): string;

    /**
     * Get base name from path
     */
    basename(path: string): string;

    /**
     * Get file extension from path
     */
    extname(path: string): string;

    /**
     * Normalize path separators
     */
    normalizePath(path: string): string;
}

/**
 * Message types for user notifications
 */
export type MessageType = 'info' | 'warning' | 'error' | 'success';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Options for input prompts
 */
export interface InputPromptOptions {
    prompt: string;
    placeholder?: string;
    value?: string;
    validate?: (value: string) => string | null;
}

/**
 * Options for select prompts
 */
export interface SelectPromptOptions<T> {
    title: string;
    placeholder?: string;
    items: SelectItem<T>[];
}

/**
 * Select item for prompts
 */
export interface SelectItem<T> {
    label: string;
    description?: string;
    detail?: string;
    value: T;
}

/**
 * Options for file prompts
 */
export interface FilePromptOptions {
    title?: string;
    filters?: { [name: string]: string[] };
    canSelectMany?: boolean;
    defaultPath?: string;
}

/**
 * Options for confirmation dialogs
 */
export interface ConfirmOptions {
    modal?: boolean;
    detail?: string;
}

/**
 * Options for creating the case manager
 */
export interface CaseManagerOptions {
    /** Base path where cases are stored */
    basePath: string;

    /** Platform-specific adapter */
    adapter: IPlatformAdapter;

    /** Storage key for persisting case data */
    storageKey?: string;

    /** Supported log file extensions */
    logExtensions?: string[];
}

/**
 * Progress callback type
 */
export type ProgressCallback = (percent: number, message?: string) => void;

/**
 * Event types for case manager
 */
export type CaseEventType =
    | 'caseAdded'
    | 'caseUpdated'
    | 'caseDeleted'
    | 'caseStatusChanged'
    | 'caseFilesDiscovered';

/**
 * Event listener for case manager events
 */
export interface CaseEventListener {
    (event: CaseEvent): void;
}

/**
 * Case event
 */
export interface CaseEvent {
    type: CaseEventType;
    caseId: string;
    caseInfo?: CaseInfo;
    previousStatus?: CaseStatus;
}

/**
 * Statistics about cases
 */
export interface CaseStatistics {
    totalCases: number;
    readyCases: number;
    pendingCases: number;
    errorCases: number;
    totalLogFiles: number;
    totalSize: number;
}

/**
 * Filter options for getting cases
 */
export interface CaseFilter {
    status?: CaseStatus[];
    tags?: string[];
    searchText?: string;
    dateRange?: {
        start?: Date;
        end?: Date;
    };
}

/**
 * Archive format types
 */
export type ArchiveFormat = 'zip' | 'tar' | 'tar.gz' | 'tgz' | '7z' | 'unknown';

/**
 * Archive information
 */
export interface ArchiveInfo {
    format: ArchiveFormat;
    size: number;
    estimatedExtractedSize?: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'markdown';

/**
 * Export options
 */
export interface ExportOptions {
    format: ExportFormat;
    includeLogs?: boolean;
    includeMetadata?: boolean;
}
