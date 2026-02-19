# Cross-Extension Case Management Strategy

## Overview

This document outlines the strategy for sharing case management functionality between the **VS Code extension** and the **Zed extension** for Log Scout Analyzer.

---

## Architecture Options

### Option 1: Shared Core Module (Recommended)

Create a shared TypeScript/JavaScript module that both extensions can use.

```
log_scout_analyzer/
├── shared-core/                    ← New shared module
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── caseManager.core.ts    ← Platform-agnostic logic
│       ├── types.ts               ← Shared interfaces
│       └── utils/
│           ├── archiveExtractor.ts
│           ├── fileDiscovery.ts
│           └── storageManager.ts
│
├── vscode-extension/
│   └── src/
│       ├── caseManager.ts         ← VS Code-specific wrapper
│       └── casesTreeProvider.ts   ← VS Code UI
│
└── zed-extension/
    └── src/
        ├── caseManager.ts         ← Zed-specific wrapper
        └── casesPanel.ts          ← Zed UI
```

**Benefits:**
- Single source of truth for business logic
- Easier to maintain and update
- Consistent behavior across both extensions
- Bug fixes apply to both

**Challenges:**
- Need to abstract away platform-specific APIs
- Requires build/packaging strategy
- Version synchronization

---

### Option 2: Duplicate Implementation

Maintain separate implementations for each extension.

**Benefits:**
- Each extension optimized for its platform
- No cross-dependencies
- Independent release cycles

**Challenges:**
- Code duplication
- Bug fixes need to be applied twice
- Features may drift apart
- More maintenance overhead

---

## Recommended Approach: Shared Core Module

### Step 1: Create Shared Core Package

```bash
cd log_scout_analyzer
mkdir shared-core
cd shared-core
npm init -y
```

**package.json:**
```json
{
  "name": "@log-scout/shared-core",
  "version": "1.0.0",
  "description": "Shared case management logic for Log Scout Analyzer",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

### Step 2: Extract Platform-Agnostic Logic

**shared-core/src/types.ts:**
```typescript
export interface CaseInfo {
    caseId: string;
    caseName: string;
    description?: string;
    createdDate: Date;
    downloadedDate: Date;
    sourcePath: string;
    extractedPath: string;
    logFiles: string[];
    status: 'pending' | 'downloading' | 'extracting' | 'ready' | 'error';
    errorMessage?: string;
}

export interface IPlatformAdapter {
    // File system operations
    fileExists(path: string): Promise<boolean>;
    readDir(path: string): Promise<string[]>;
    createDir(path: string): Promise<void>;
    copyFile(source: string, dest: string): Promise<void>;
    deleteDir(path: string): Promise<void>;
    
    // Archive extraction
    extractZip(archivePath: string, targetPath: string): Promise<void>;
    extractTar(archivePath: string, targetPath: string): Promise<void>;
    extract7z(archivePath: string, targetPath: string): Promise<void>;
    
    // HTTP operations
    downloadFile(url: string, destination: string, onProgress?: (percent: number) => void): Promise<void>;
    
    // Storage operations
    saveData(key: string, data: any): Promise<void>;
    loadData(key: string): Promise<any>;
    
    // UI operations
    showMessage(message: string, type: 'info' | 'warning' | 'error'): void;
    showProgress(title: string, task: (progress: (percent: number) => void) => Promise<void>): Promise<void>;
    
    // Logging
    log(message: string, level: 'info' | 'error'): void;
}

export interface CaseManagerOptions {
    basePath: string;
    adapter: IPlatformAdapter;
}
```

**shared-core/src/caseManager.core.ts:**
```typescript
import { CaseInfo, IPlatformAdapter, CaseManagerOptions } from './types';

export class CoreCaseManager {
    private cases: Map<string, CaseInfo> = new Map();
    private adapter: IPlatformAdapter;
    private basePath: string;

    constructor(options: CaseManagerOptions) {
        this.adapter = options.adapter;
        this.basePath = options.basePath;
    }

    async initialize(): Promise<void> {
        await this.adapter.createDir(this.basePath);
        const data = await this.adapter.loadData('cases');
        if (data && Array.isArray(data)) {
            for (const caseData of data) {
                const caseInfo: CaseInfo = {
                    ...caseData,
                    createdDate: new Date(caseData.createdDate),
                    downloadedDate: new Date(caseData.downloadedDate)
                };
                this.cases.set(caseInfo.caseId, caseInfo);
            }
        }
        this.adapter.log(`Loaded ${this.cases.size} cases`, 'info');
    }

    async downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo> {
        if (!caseId) {
            caseId = this.generateCaseId();
        }

        const casePath = `${this.basePath}/${caseId}`;
        await this.adapter.createDir(casePath);
        await this.adapter.createDir(`${casePath}/archive`);

        const fileName = this.extractFileNameFromUrl(url);
        const downloadPath = `${casePath}/archive/${fileName}`;

        const caseInfo: CaseInfo = {
            caseId,
            caseName: caseId,
            description: `Downloaded from ${url}`,
            createdDate: new Date(),
            downloadedDate: new Date(),
            sourcePath: downloadPath,
            extractedPath: `${casePath}/logs`,
            logFiles: [],
            status: 'downloading'
        };

        this.cases.set(caseId, caseInfo);
        await this.saveCases();

        try {
            await this.adapter.downloadFile(url, downloadPath, (percent) => {
                this.adapter.log(`Downloading: ${percent}%`, 'info');
            });

            caseInfo.status = 'extracting';
            await this.saveCases();

            await this.extractCase(caseId);

            return caseInfo;
        } catch (error) {
            caseInfo.status = 'error';
            caseInfo.errorMessage = error instanceof Error ? error.message : String(error);
            await this.saveCases();
            throw error;
        }
    }

    async importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo> {
        if (!caseId) {
            caseId = this.generateCaseId();
        }

        const casePath = `${this.basePath}/${caseId}`;
        await this.adapter.createDir(casePath);
        await this.adapter.createDir(`${casePath}/archive`);

        const fileName = archivePath.split(/[/\\]/).pop() || 'archive.zip';
        const targetPath = `${casePath}/archive/${fileName}`;

        await this.adapter.copyFile(archivePath, targetPath);

        const caseInfo: CaseInfo = {
            caseId,
            caseName: caseId,
            description: `Imported from ${archivePath}`,
            createdDate: new Date(),
            downloadedDate: new Date(),
            sourcePath: targetPath,
            extractedPath: `${casePath}/logs`,
            logFiles: [],
            status: 'extracting'
        };

        this.cases.set(caseId, caseInfo);
        await this.saveCases();

        await this.extractCase(caseId);

        return caseInfo;
    }

    async extractCase(caseId: string): Promise<void> {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }

        try {
            caseInfo.status = 'extracting';
            await this.saveCases();

            await this.adapter.createDir(caseInfo.extractedPath);

            const ext = caseInfo.sourcePath.split('.').pop()?.toLowerCase();

            switch (ext) {
                case 'zip':
                    await this.adapter.extractZip(caseInfo.sourcePath, caseInfo.extractedPath);
                    break;
                case 'tar':
                case 'gz':
                case 'tgz':
                    await this.adapter.extractTar(caseInfo.sourcePath, caseInfo.extractedPath);
                    break;
                case '7z':
                    await this.adapter.extract7z(caseInfo.sourcePath, caseInfo.extractedPath);
                    break;
                default:
                    throw new Error(`Unsupported archive format: ${ext}`);
            }

            caseInfo.logFiles = await this.discoverLogFiles(caseInfo.extractedPath);
            caseInfo.status = 'ready';
            await this.saveCases();

            this.adapter.showMessage(
                `Case ${caseId} is ready with ${caseInfo.logFiles.length} log files.`,
                'info'
            );
        } catch (error) {
            caseInfo.status = 'error';
            caseInfo.errorMessage = error instanceof Error ? error.message : String(error);
            await this.saveCases();
            throw error;
        }
    }

    async discoverLogFiles(directory: string): Promise<string[]> {
        const logFiles: string[] = [];
        const logExtensions = ['.log', '.txt', '.out', '.err', '.trace'];

        const scanDirectory = async (dir: string): Promise<void> => {
            const entries = await this.adapter.readDir(dir);
            
            for (const entry of entries) {
                const fullPath = `${dir}/${entry}`;
                
                // Simple heuristic: if it has an extension, it's a file
                const ext = entry.split('.').pop()?.toLowerCase();
                if (ext && logExtensions.includes(`.${ext}`)) {
                    logFiles.push(fullPath);
                } else if (!entry.includes('.')) {
                    // Probably a directory, recurse
                    try {
                        await scanDirectory(fullPath);
                    } catch {
                        // Skip if can't read
                    }
                }
            }
        };

        await scanDirectory(directory);
        return logFiles;
    }

    getAllCases(): CaseInfo[] {
        return Array.from(this.cases.values());
    }

    getCase(caseId: string): CaseInfo | undefined {
        return this.cases.get(caseId);
    }

    async deleteCase(caseId: string, deleteFiles: boolean): Promise<void> {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }

        if (deleteFiles) {
            const casePath = `${this.basePath}/${caseId}`;
            await this.adapter.deleteDir(casePath);
        }

        this.cases.delete(caseId);
        await this.saveCases();
    }

    async updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void> {
        const caseInfo = this.cases.get(caseId);
        if (!caseInfo) {
            throw new Error(`Case not found: ${caseId}`);
        }

        Object.assign(caseInfo, updates);
        await this.saveCases();
    }

    getCaseLogFiles(caseId: string): string[] {
        const caseInfo = this.cases.get(caseId);
        return caseInfo ? caseInfo.logFiles : [];
    }

    private generateCaseId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `case-${timestamp}-${random}`;
    }

    private extractFileNameFromUrl(url: string): string {
        try {
            const urlPath = new URL(url).pathname;
            return urlPath.split('/').pop() || 'archive.zip';
        } catch {
            return 'archive.zip';
        }
    }

    private async saveCases(): Promise<void> {
        const casesArray = Array.from(this.cases.values());
        await this.adapter.saveData('cases', casesArray);
    }
}
```

---

### Step 3: Create VS Code Adapter

**vscode-extension/src/adapters/vscodeAdapter.ts:**
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IPlatformAdapter } from '@log-scout/shared-core';

const execAsync = promisify(exec);

export class VSCodeAdapter implements IPlatformAdapter {
    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel
    ) {}

    async fileExists(path: string): Promise<boolean> {
        return fs.existsSync(path);
    }

    async readDir(path: string): Promise<string[]> {
        return fs.promises.readdir(path);
    }

    async createDir(path: string): Promise<void> {
        await fs.promises.mkdir(path, { recursive: true });
    }

    async copyFile(source: string, dest: string): Promise<void> {
        await fs.promises.copyFile(source, dest);
    }

    async deleteDir(path: string): Promise<void> {
        await fs.promises.rm(path, { recursive: true, force: true });
    }

    async extractZip(archivePath: string, targetPath: string): Promise<void> {
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            const command = `powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${targetPath}' -Force"`;
            await execAsync(command);
        } else {
            const command = `unzip -o "${archivePath}" -d "${targetPath}"`;
            await execAsync(command);
        }
    }

    async extractTar(archivePath: string, targetPath: string): Promise<void> {
        const ext = path.extname(archivePath).toLowerCase();
        let command: string;
        if (ext === '.tgz' || archivePath.endsWith('.tar.gz')) {
            command = `tar -xzf "${archivePath}" -C "${targetPath}"`;
        } else {
            command = `tar -xf "${archivePath}" -C "${targetPath}"`;
        }
        await execAsync(command);
    }

    async extract7z(archivePath: string, targetPath: string): Promise<void> {
        const command = `7z x "${archivePath}" -o"${targetPath}" -y`;
        await execAsync(command);
    }

    async downloadFile(
        url: string,
        destination: string,
        onProgress?: (percent: number) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const file = fs.createWriteStream(destination);

            const request = protocol.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    file.close();
                    fs.unlinkSync(destination);
                    if (response.headers.location) {
                        this.downloadFile(response.headers.location, destination, onProgress)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(new Error('Redirect with no location'));
                    }
                    return;
                }

                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(destination);
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'] || '0', 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (totalSize > 0 && onProgress) {
                        const percent = (downloadedSize / totalSize) * 100;
                        onProgress(percent);
                    }
                });

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            });

            request.on('error', (err) => {
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(err);
            });

            file.on('error', (err) => {
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(err);
            });
        });
    }

    async saveData(key: string, data: any): Promise<void> {
        await this.context.globalState.update(key, data);
    }

    async loadData(key: string): Promise<any> {
        return this.context.globalState.get(key);
    }

    showMessage(message: string, type: 'info' | 'warning' | 'error'): void {
        switch (type) {
            case 'info':
                vscode.window.showInformationMessage(message);
                break;
            case 'warning':
                vscode.window.showWarningMessage(message);
                break;
            case 'error':
                vscode.window.showErrorMessage(message);
                break;
        }
    }

    async showProgress(
        title: string,
        task: (progress: (percent: number) => void) => Promise<void>
    ): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            async (vscodeProgress) => {
                const progress = (percent: number) => {
                    vscodeProgress.report({ increment: percent });
                };
                await task(progress);
            }
        );
    }

    log(message: string, level: 'info' | 'error'): void {
        const timestamp = new Date().toISOString();
        const prefix = level === 'error' ? '[ERROR]' : '[INFO]';
        this.outputChannel.appendLine(`${timestamp} ${prefix} ${message}`);
    }
}
```

---

### Step 4: Create Zed Adapter

**zed-extension/src/adapters/zedAdapter.ts:**
```typescript
import * as zed from 'zed-extension';
import { IPlatformAdapter } from '@log-scout/shared-core';

export class ZedAdapter implements IPlatformAdapter {
    constructor(private extensionContext: any) {}

    async fileExists(path: string): Promise<boolean> {
        // Use Zed's file system API
        try {
            await zed.fs.stat(path);
            return true;
        } catch {
            return false;
        }
    }

    async readDir(path: string): Promise<string[]> {
        const entries = await zed.fs.readdir(path);
        return entries.map(e => e.name);
    }

    async createDir(path: string): Promise<void> {
        await zed.fs.mkdir(path, { recursive: true });
    }

    async copyFile(source: string, dest: string): Promise<void> {
        const content = await zed.fs.readFile(source);
        await zed.fs.writeFile(dest, content);
    }

    async deleteDir(path: string): Promise<void> {
        await zed.fs.rm(path, { recursive: true });
    }

    async extractZip(archivePath: string, targetPath: string): Promise<void> {
        // Use Zed's command execution or built-in unzip
        await zed.commands.execute('unzip', [archivePath, '-d', targetPath]);
    }

    async extractTar(archivePath: string, targetPath: string): Promise<void> {
        await zed.commands.execute('tar', ['-xf', archivePath, '-C', targetPath]);
    }

    async extract7z(archivePath: string, targetPath: string): Promise<void> {
        await zed.commands.execute('7z', ['x', archivePath, `-o${targetPath}`, '-y']);
    }

    async downloadFile(
        url: string,
        destination: string,
        onProgress?: (percent: number) => void
    ): Promise<void> {
        // Use Zed's HTTP client
        const response = await zed.http.get(url);
        await zed.fs.writeFile(destination, response.body);
        if (onProgress) {
            onProgress(100);
        }
    }

    async saveData(key: string, data: any): Promise<void> {
        await zed.storage.set(key, JSON.stringify(data));
    }

    async loadData(key: string): Promise<any> {
        const data = await zed.storage.get(key);
        return data ? JSON.parse(data) : null;
    }

    showMessage(message: string, type: 'info' | 'warning' | 'error'): void {
        switch (type) {
            case 'info':
                zed.notifications.info(message);
                break;
            case 'warning':
                zed.notifications.warning(message);
                break;
            case 'error':
                zed.notifications.error(message);
                break;
        }
    }

    async showProgress(
        title: string,
        task: (progress: (percent: number) => void) => Promise<void>
    ): Promise<void> {
        const progressId = zed.progress.start(title);
        try {
            await task((percent) => {
                zed.progress.update(progressId, percent);
            });
        } finally {
            zed.progress.end(progressId);
        }
    }

    log(message: string, level: 'info' | 'error'): void {
        if (level === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
    }
}
```

---

### Step 5: Use Shared Core in Each Extension

**vscode-extension/src/caseManager.ts:**
```typescript
import { CoreCaseManager, CaseInfo } from '@log-scout/shared-core';
import { VSCodeAdapter } from './adapters/vscodeAdapter';
import * as vscode from 'vscode';
import * as path from 'path';

export class VSCodeCaseManager {
    private core: CoreCaseManager;

    constructor(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        const adapter = new VSCodeAdapter(context, outputChannel);
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const basePath = workspaceFolders && workspaceFolders.length > 0
            ? path.join(workspaceFolders[0].uri.fsPath, '.log-scout-cases')
            : path.join(context.globalStorageUri.fsPath, 'cases');

        this.core = new CoreCaseManager({
            basePath,
            adapter
        });
    }

    async initialize(): Promise<void> {
        await this.core.initialize();
    }

    // Delegate all methods to core
    async downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo> {
        return this.core.downloadCaseFromUrl(url, caseId);
    }

    async importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo> {
        return this.core.importCaseFromLocal(archivePath, caseId);
    }

    getAllCases(): CaseInfo[] {
        return this.core.getAllCases();
    }

    getCase(caseId: string): CaseInfo | undefined {
        return this.core.getCase(caseId);
    }

    async deleteCase(caseId: string, deleteFiles: boolean): Promise<void> {
        return this.core.deleteCase(caseId, deleteFiles);
    }

    async updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void> {
        return this.core.updateCaseInfo(caseId, updates);
    }

    getCaseLogFiles(caseId: string): string[] {
        return this.core.getCaseLogFiles(caseId);
    }

    // VS Code-specific methods
    async openCase(caseId: string): Promise<void> {
        const caseInfo = this.core.getCase(caseId);
        if (!caseInfo || caseInfo.status !== 'ready') {
            return;
        }

        const success = vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
            0,
            { 
                uri: vscode.Uri.file(caseInfo.extractedPath), 
                name: `Case: ${caseInfo.caseName}` 
            }
        );

        if (success) {
            vscode.window.showInformationMessage(`Case ${caseInfo.caseName} opened`);
        }
    }
}
```

**zed-extension/src/caseManager.ts:**
```typescript
import { CoreCaseManager, CaseInfo } from '@log-scout/shared-core';
import { ZedAdapter } from './adapters/zedAdapter';

export class ZedCaseManager {
    private core: CoreCaseManager;

    constructor(context: any) {
        const adapter = new ZedAdapter(context);
        
        const basePath = `${context.workspaceRoot}/.log-scout-cases`;

        this.core = new CoreCaseManager({
            basePath,
            adapter
        });
    }

    async initialize(): Promise<void> {
        await this.core.initialize();
    }

    // Delegate all methods to core
    async downloadCaseFromUrl(url: string, caseId?: string): Promise<CaseInfo> {
        return this.core.downloadCaseFromUrl(url, caseId);
    }

    async importCaseFromLocal(archivePath: string, caseId?: string): Promise<CaseInfo> {
        return this.core.importCaseFromLocal(archivePath, caseId);
    }

    getAllCases(): CaseInfo[] {
        return this.core.getAllCases();
    }

    getCase(caseId: string): CaseInfo | undefined {
        return this.core.getCase(caseId);
    }

    async deleteCase(caseId: string, deleteFiles: boolean): Promise<void> {
        return this.core.deleteCase(caseId, deleteFiles);
    }

    async updateCaseInfo(caseId: string, updates: Partial<CaseInfo>): Promise<void> {
        return this.core.updateCaseInfo(caseId, updates);
    }

    getCaseLogFiles(caseId: string): string[] {
        return this.core.getCaseLogFiles(caseId);
    }

    // Zed-specific methods
    async openCase(caseId: string): Promise<void> {
        const caseInfo = this.core.getCase(caseId);
        if (!caseInfo || caseInfo.status !== 'ready') {
            return;
        }

        // Use Zed API to open folder
        // await zed.workspace.addFolder(caseInfo.extractedPath);
    }
}
```

---

## Shared File System Location

Both extensions can share the **same physical storage location** for cases:

```
~/.log-scout-cases/                    ← Shared location (user home)
  or
<workspace>/.log-scout-cases/          ← Workspace-specific
```

### Storage Strategy

1. **User Home Directory** (Recommended):
   - Cases persist across all projects
   - Accessible from both VS Code and Zed
   - Location: `~/.log-scout-cases/`

2. **Workspace Directory**:
   - Cases tied to specific project
   - Each workspace has its own cases
   - Location: `<workspace>/.log-scout-cases/`

3. **Hybrid Approach**:
   - Global cases in user home
   - Project-specific cases in workspace
   - User chooses location on import

---

## Synchronization Considerations

### Metadata Storage

**Option A: Shared SQLite Database**
```
~/.log-scout-cases/.metadata/cases.db
```

**Option B: JSON Files** (Simpler)
```
~/.log-scout-cases/.metadata/cases.json
```

**Option C: Per-Editor Storage** (Current approach)
- VS Code: Uses `globalState`
- Zed: Uses its storage API
- Cases discoverable by scanning file system

### File Locking

If both editors open simultaneously:
- Use file-based locking for write operations
- Read operations don't need locks
- Case status updates may have slight delay

---

## Build & Distribution Strategy

### Shared Core as NPM Package

**Option 1: Private NPM Package**
```bash
cd shared-core
npm publish --access private
```

Then in each extension:
```json
{
  "dependencies": {
    "@log-scout/shared-core": "^1.0.0"
  }
}
```

**Option 2: Local Package**
```json
{
  "dependencies": {
    "@log-scout/shared-core": "file:../shared-core"
  }
}
```

**Option 3: Git Submodule or Symlink**
```bash
cd vscode-extension/src
ln -s ../../shared-core/src shared-core

cd zed-extension/src
ln -s ../../shared-core/src shared-core
```

---

## Testing Strategy

### Unit Tests for Shared Core

```typescript
// shared-core/tests/caseManager.test.ts
import { CoreCaseManager } from '../src/caseManager.core';
import { MockAdapter } from './mocks/mockAdapter';

describe('CoreCaseManager', () => {
    let manager: CoreCaseManager;
    let mockAdapter: MockAdapter;

    beforeEach(() => {
        mockAdapter = new MockAdapter();
        manager = new CoreCaseManager({
            basePath: '/test/cases',
            adapter: mockAdapter
        });
    });

    test('downloads case from URL', async () => {
        const caseInfo = await manager.downloadCaseFromUrl(
            'https://example.com/case.zip'
        );
        expect(caseInfo.status).toBe('ready');
    });

    test('imports local case', async () => {
        const caseInfo = await manager.importCaseFromLocal(
            '/test/archive.zip'
        );
        expect(caseInfo.status).toBe('ready');
    });
});
```

### Integration Tests per Extension

Test platform-specific adapters separately.

---

## Migration Path

### Phase 1: Create Shared Core
1. Extract common logic into shared-core
2. Create platform adapters
3. Write unit tests

### Phase 2: Update VS Code Extension
1. Integrate shared core
2. Update commands to use new API
3. Test thoroughly

### Phase 3: Update Zed Extension
1. Create Zed adapter
2. Integrate shared core
3. Test thoroughly

### Phase 4: Synchronization
1. Implement shared storage
2. Add file locking if needed
3. Test concurrent access

---

## Conclusion

**Recommended Approach:**
- ✅ **Shared Core Module** with platform adapters
- ✅ **Global storage** in `~/.log-scout-cases/`
- ✅ **JSON-based metadata** for simplicity
- ✅ **Local package** linking during development
- ✅ **NPM package** for production

This provides maximum code reuse while allowing each extension to integrate naturally with its host editor.

---

## Next Steps

1. Create `shared-core` package
2. Extract business logic
3. Create VS Code adapter
4. Create Zed adapter (when Zed extension APIs are available)
5. Test both extensions
6. Document cross-platform usage

Both extensions will have the **same case management capabilities** while respecting each editor's unique UI paradigms.