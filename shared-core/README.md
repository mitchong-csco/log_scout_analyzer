# @log-scout/shared-core

Shared case management logic for Log Scout Analyzer extensions (VS Code & Zed).

## Overview

This package contains platform-agnostic business logic for managing log analysis cases. It provides a common foundation that both the VS Code and Zed extensions can use through platform-specific adapters.

## Features

- **Case Download**: Download case archives from URLs
- **Case Import**: Import local archive files
- **Auto-Extract**: Extract ZIP, TAR, TAR.GZ, TGZ, and 7Z archives
- **Log Discovery**: Recursively find log files in extracted archives
- **Status Tracking**: Track case lifecycle (pending → downloading → extracting → ready)
- **Event System**: Subscribe to case lifecycle events
- **Persistent Storage**: Save/load case metadata
- **Statistics**: Get aggregate statistics across all cases
- **Export**: Export case information in JSON, CSV, or Markdown

## Architecture

```
┌─────────────────────────────────────────┐
│         Extension (VS Code/Zed)         │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │    Platform Adapter              │  │
│  │  (implements IPlatformAdapter)   │  │
│  └──────────────────────────────────┘  │
│                 │                       │
│                 ▼                       │
│  ┌──────────────────────────────────┐  │
│  │     CoreCaseManager              │  │
│  │  (from @log-scout/shared-core)   │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Installation

### For Development (Local)

```bash
cd shared-core
npm install
npm run build
```

### In Extensions

Add as a local dependency:

```json
{
  "dependencies": {
    "@log-scout/shared-core": "file:../shared-core"
  }
}
```

## Usage

### 1. Implement Platform Adapter

Create a platform-specific adapter that implements `IPlatformAdapter`:

```typescript
import { IPlatformAdapter } from '@log-scout/shared-core';

class MyPlatformAdapter implements IPlatformAdapter {
    // Implement all required methods
    async fileExists(path: string): Promise<boolean> {
        // Platform-specific implementation
    }
    
    async readDir(path: string): Promise<string[]> {
        // Platform-specific implementation
    }
    
    // ... implement all other methods
}
```

### 2. Create Case Manager Instance

```typescript
import { CoreCaseManager } from '@log-scout/shared-core';
import { MyPlatformAdapter } from './adapters/myAdapter';

const adapter = new MyPlatformAdapter();
const caseManager = new CoreCaseManager({
    basePath: '/path/to/cases',
    adapter: adapter,
    storageKey: 'myCases',
    logExtensions: ['.log', '.txt', '.out', '.err']
});

await caseManager.initialize();
```

### 3. Download a Case

```typescript
const caseInfo = await caseManager.downloadCaseFromUrl(
    'https://example.com/case-12345.zip',
    'optional-custom-id'
);

console.log(`Case ${caseInfo.caseId} status: ${caseInfo.status}`);
console.log(`Found ${caseInfo.logFiles.length} log files`);
```

### 4. Import Local Archive

```typescript
const caseInfo = await caseManager.importCaseFromLocal(
    '/path/to/local/archive.tar.gz',
    'my-case-id'
);
```

### 5. List Cases

```typescript
// Get all cases
const allCases = caseManager.getAllCases();

// Get cases with filter
const readyCases = caseManager.getCases({
    status: ['ready'],
    searchText: 'customer-name'
});
```

### 6. Listen to Events

```typescript
caseManager.addEventListener('caseStatusChanged', (event) => {
    console.log(`Case ${event.caseId} changed from ${event.previousStatus} to ${event.caseInfo?.status}`);
});

caseManager.addEventListener('caseFilesDiscovered', (event) => {
    console.log(`Discovered ${event.caseInfo?.logFiles.length} files in case ${event.caseId}`);
});
```

## API Reference

### CoreCaseManager

#### Methods

##### `initialize(): Promise<void>`
Initialize the case manager and load persisted cases.

##### `downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo>`
Download a case archive from a URL.

##### `importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo>`
Import a case from a local archive file.

##### `extractCase(caseId: string): Promise<void>`
Extract an archive for an existing case.

##### `getAllCases(): CaseInfo[]`
Get all cases.

##### `getCases(filter?: CaseFilter): CaseInfo[]`
Get cases with optional filtering.

##### `getCase(caseId: string): CaseInfo | undefined`
Get a specific case by ID.

##### `deleteCase(caseId: string, deleteFiles: boolean): Promise<void>`
Delete a case and optionally its files.

##### `updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void>`
Update case metadata.

##### `getCaseLogFiles(caseId: string): string[]`
Get log files for a case.

##### `getStatistics(): CaseStatistics`
Get aggregate statistics.

##### `exportCaseInfo(caseId: string, options: ExportOptions): Promise<string>`
Export case information.

##### `addEventListener(eventType: CaseEventType, listener: CaseEventListener): void`
Add event listener.

##### `removeEventListener(eventType: CaseEventType, listener: CaseEventListener): void`
Remove event listener.

##### `dispose(): void`
Clean up resources.

### IPlatformAdapter Interface

Platform adapters must implement these methods:

#### File System Operations
- `fileExists(path: string): Promise<boolean>`
- `readDir(path: string): Promise<string[]>`
- `createDir(path: string): Promise<void>`
- `copyFile(source: string, dest: string): Promise<void>`
- `deleteDir(path: string): Promise<void>`
- `isDirectory(path: string): Promise<boolean>`
- `getFileSize(path: string): Promise<number>`

#### Archive Extraction
- `extractZip(archivePath: string, targetPath: string): Promise<void>`
- `extractTar(archivePath: string, targetPath: string): Promise<void>`
- `extract7z(archivePath: string, targetPath: string): Promise<void>`

#### HTTP Operations
- `downloadFile(url: string, destination: string, onProgress?: (percent: number) => void): Promise<void>`

#### Storage Operations
- `saveData(key: string, data: any): Promise<void>`
- `loadData(key: string): Promise<any>`
- `deleteData(key: string): Promise<void>`

#### UI Operations
- `showMessage(message: string, type: MessageType): void`
- `showProgress(title: string, task: (progress: ProgressCallback) => Promise<void>): Promise<void>`
- `promptInput(options: InputPromptOptions): Promise<string | undefined>`
- `promptSelect<T>(options: SelectPromptOptions<T>): Promise<T | undefined>`
- `promptFile(options: FilePromptOptions): Promise<string | undefined>`
- `confirm(message: string, options?: ConfirmOptions): Promise<boolean>`

#### Logging
- `log(message: string, level: LogLevel): void`

#### Path Operations
- `joinPath(...segments: string[]): string`
- `dirname(path: string): string`
- `basename(path: string): string`
- `extname(path: string): string`
- `normalizePath(path: string): string`

### Types

#### CaseInfo
```typescript
interface CaseInfo {
    caseId: string;
    caseName: string;
    description?: string;
    createdDate: Date;
    downloadedDate: Date;
    sourcePath: string;
    extractedPath: string;
    logFiles: string[];
    status: CaseStatus;
    errorMessage?: string;
    tags?: string[];
    metadata?: Record<string, any>;
}
```

#### CaseStatus
```typescript
type CaseStatus = 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';
```

#### CaseFilter
```typescript
interface CaseFilter {
    status?: CaseStatus[];
    tags?: string[];
    searchText?: string;
    dateRange?: {
        start?: Date;
        end?: Date;
    };
}
```

#### CaseStatistics
```typescript
interface CaseStatistics {
    totalCases: number;
    readyCases: number;
    pendingCases: number;
    errorCases: number;
    totalLogFiles: number;
    totalSize: number;
}
```

#### Event Types
```typescript
type CaseEventType =
    | 'caseAdded'
    | 'caseUpdated'
    | 'caseDeleted'
    | 'caseStatusChanged'
    | 'caseFilesDiscovered';
```

## Building

```bash
npm run build      # Build once
npm run watch      # Watch mode
npm run clean      # Clean dist folder
```

## Testing

```bash
npm test           # Run tests
npm run test:watch # Watch mode
```

## Directory Structure

```
shared-core/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts           # Type definitions
│   └── caseManager.ts     # Core logic
├── dist/                  # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

### VS Code Adapter Example

See `vscode-extension/src/adapters/vscodeAdapter.ts` for a complete implementation.

### Zed Adapter Example

See `zed-extension/src/adapters/zedAdapter.ts` for a complete implementation.

## Design Principles

1. **Platform Agnostic**: Core logic has no dependencies on specific editors
2. **Adapter Pattern**: Platform-specific code isolated in adapters
3. **Single Responsibility**: Each module has a clear purpose
4. **Event-Driven**: Lifecycle events for integration flexibility
5. **Type Safety**: Full TypeScript support with strict types
6. **Testable**: Pure business logic easy to unit test

## Contributing

1. Make changes in `src/`
2. Run `npm run build` to compile
3. Test in both extensions
4. Update this README if adding new features

## License

MIT

## Support

For issues or questions:
- Check extension documentation
- Review example adapters
- Open an issue on GitHub