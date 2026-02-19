/**
 * @log-scout/shared-core
 *
 * Shared case management logic for Log Scout Analyzer extensions
 * Used by both VS Code and Zed extensions
 */

// Export core case manager
export { CoreCaseManager } from './caseManager';

// Export all types and interfaces
export type {
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
    ExportFormat,
    MessageType,
    LogLevel,
    InputPromptOptions,
    SelectPromptOptions,
    SelectItem,
    FilePromptOptions,
    ConfirmOptions,
    ProgressCallback
} from './types';
