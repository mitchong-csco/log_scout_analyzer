# Shared Core Setup Guide

Complete guide for integrating the shared-core case management into both VS Code and Zed extensions.

---

## Overview

The `shared-core` package contains platform-agnostic case management logic that both extensions use through platform-specific adapters. This eliminates code duplication and ensures consistent behavior.

---

## Architecture

```
log_scout_analyzer/
├── shared-core/                    ← Shared business logic
│   ├── src/
│   │   ├── caseManager.ts         ← Core case manager
│   │   ├── types.ts               ← Shared types
│   │   └── index.ts               ← Exports
│   └── package.json
│
├── vscode-extension/
│   ├── src/
│   │   ├── adapters/
│   │   │   └── vscodeAdapter.ts   ← VS Code adapter
│   │   ├── caseManager.ts         ← VS Code wrapper
│   │   └── casesTreeProvider.ts   ← VS Code UI
│   └── package.json               ← References shared-core
│
└── zed-extension/
    ├── src/
    │   ├── adapters/
    │   │   └── zedAdapter.ts      ← Zed adapter
    │   └── caseManager.ts         ← Zed wrapper
    └── Cargo.toml                 ← References shared-core
```

---

## Step 1: Build Shared Core

### 1.1 Install Dependencies

```bash
cd shared-core
npm install
```

### 1.2 Build

```bash
npm run build
```

This creates the `dist/` folder with compiled JavaScript and type definitions.

---

## Step 2: Link to VS Code Extension

### 2.1 Add Dependency

Edit `vscode-extension/package.json`:

```json
{
  "dependencies": {
    "@log-scout/shared-core": "file:../shared-core",
    "js-yaml": "^4.1.0",
    "vscode-languageclient": "^9.0.1"
  }
}
```

### 2.2 Install

```bash
cd vscode-extension
npm install
```

This creates a symlink to `../shared-core`.

### 2.3 Create VS Code Adapter

Create `vscode-extension/src/adapters/vscodeAdapter.ts`:

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IPlatformAdapter, MessageType, LogLevel, InputPromptOptions, SelectPromptOptions, FilePromptOptions, ConfirmOptions } from '@log-scout/shared-core';

const execAsync = promisify(exec);

export class VSCodeAdapter implements IPlatformAdapter {
    constructor(
        private context: vscode.ExtensionContext,
        private outputChannel: vscode.OutputChannel
    ) {}

    // File System Operations
    async fileExists(filePath: string): Promise<boolean> {
        return fs.existsSync(filePath);
    }

    async readDir(dirPath: string): Promise<string[]> {
        return fs.promises.readdir(dirPath);
    }

    async createDir(dirPath: string): Promise<void> {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }

    async copyFile(source: string, dest: string): Promise<void> {
        await fs.promises.copyFile(source, dest);
    }

    async deleteDir(dirPath: string): Promise<void> {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
    }

    async isDirectory(filePath: string): Promise<boolean> {
        try {
            const stats = await fs.promises.stat(filePath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    async getFileSize(filePath: string): Promise<number> {
        const stats = await fs.promises.stat(filePath);
        return stats.size;
    }

    // Archive Extraction
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

    // HTTP Operations
    async downloadFile(url: string, destination: string, onProgress?: (percent: number) => void): Promise<void> {
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
        });
    }

    // Storage Operations
    async saveData(key: string, data: any): Promise<void> {
        await this.context.globalState.update(key, data);
    }

    async loadData(key: string): Promise<any> {
        return this.context.globalState.get(key);
    }

    async deleteData(key: string): Promise<void> {
        await this.context.globalState.update(key, undefined);
    }

    // UI Operations
    showMessage(message: string, type: MessageType): void {
        switch (type) {
            case 'info':
            case 'success':
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

    async showProgress(title: string, task: (progress: (percent: number, message?: string) => void) => Promise<void>): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            async (vscodeProgress) => {
                const progress = (percent: number, message?: string) => {
                    vscodeProgress.report({ increment: percent, message });
                };
                await task(progress);
            }
        );
    }

    async promptInput(options: InputPromptOptions): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: options.prompt,
            placeHolder: options.placeholder,
            value: options.value,
            validateInput: options.validate ? (value) => options.validate!(value) : undefined
        });
    }

    async promptSelect<T>(options: SelectPromptOptions<T>): Promise<T | undefined> {
        const items = options.items.map(item => ({
            label: item.label,
            description: item.description,
            detail: item.detail,
            value: item.value
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: options.placeholder,
            title: options.title
        });

        return selected?.value;
    }

    async promptFile(options: FilePromptOptions): Promise<string | undefined> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: options.canSelectMany || false,
            filters: options.filters,
            title: options.title,
            defaultUri: options.defaultPath ? vscode.Uri.file(options.defaultPath) : undefined
        });

        return uris && uris.length > 0 ? uris[0].fsPath : undefined;
    }

    async confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
        const result = await vscode.window.showWarningMessage(
            message,
            { modal: options?.modal },
            'Yes',
            'No'
        );
        return result === 'Yes';
    }

    // Logging
    log(message: string, level: LogLevel): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${level.toUpperCase()}]`;
        this.outputChannel.appendLine(`${timestamp} ${prefix} ${message}`);
    }

    // Path Operations
    joinPath(...segments: string[]): string {
        return path.join(...segments);
    }

    dirname(filePath: string): string {
        return path.dirname(filePath);
    }

    basename(filePath: string): string {
        return path.basename(filePath);
    }

    extname(filePath: string): string {
        return path.extname(filePath);
    }

    normalizePath(filePath: string): string {
        return path.normalize(filePath);
    }
}
```

### 2.4 Create VS Code Case Manager Wrapper

Create `vscode-extension/src/caseManager.ts`:

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { CoreCaseManager, CaseInfo } from '@log-scout/shared-core';
import { VSCodeAdapter } from './adapters/vscodeAdapter';

export class CaseManager {
    private core: CoreCaseManager;
    private adapter: VSCodeAdapter;

    constructor(
        context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel
    ) {
        this.adapter = new VSCodeAdapter(context, outputChannel);
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const basePath = workspaceFolders && workspaceFolders.length > 0
            ? path.join(workspaceFolders[0].uri.fsPath, '.log-scout-cases')
            : path.join(context.globalStorageUri.fsPath, 'cases');

        this.core = new CoreCaseManager({
            basePath,
            adapter: this.adapter
        });
    }

    async initialize(): Promise<void> {
        await this.core.initialize();
    }

    // Delegate all core methods
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
            vscode.window.showInformationMessage(`Case ${caseInfo.caseName} opened in workspace`);
        }
    }

    dispose(): void {
        this.core.dispose();
    }
}
```

---

## Step 3: Link to Zed Extension

### 3.1 Setup (For Future)

When Zed extension is ready:

```bash
cd zed-extension
# Add shared-core as dependency
```

### 3.2 Create Zed Adapter

Create `zed-extension/src/adapters/zedAdapter.ts`:

```typescript
import { IPlatformAdapter } from '@log-scout/shared-core';
// Import Zed APIs when available

export class ZedAdapter implements IPlatformAdapter {
    // Implement all methods using Zed APIs
}
```

---

## Step 4: Update VS Code Extension

### 4.1 Initialize in extension.ts

Edit `vscode-extension/src/extension.ts`:

```typescript
import { CaseManager } from './caseManager';
import { CasesTreeProvider } from './casesTreeProvider';

let caseManager: CaseManager | undefined;
let casesTreeProvider: CasesTreeProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
    // ... existing code ...

    // Initialize Case Manager
    caseManager = new CaseManager(context, outputChannel);
    await caseManager.initialize();
    context.subscriptions.push(caseManager);
    
    outputChannel.appendLine('✓ Case Manager initialized');

    // Initialize Cases Tree Provider
    casesTreeProvider = new CasesTreeProvider(caseManager);
    
    const casesTreeView = vscode.window.createTreeView('scoutCases', {
        treeDataProvider: casesTreeProvider,
        showCollapseAll: true
    });
    
    context.subscriptions.push(casesTreeView);
    
    // Register case management commands
    registerCaseCommands(context, caseManager, casesTreeProvider);
}
```

### 4.2 Add Commands

See `CASE_MANAGEMENT_INTEGRATION.md` for complete command implementations.

---

## Step 5: Testing

### 5.1 Test Shared Core

```bash
cd shared-core
npm test
```

### 5.2 Test VS Code Extension

```bash
cd vscode-extension
npm run compile
# Press F5 in VS Code to debug
```

### 5.3 Manual Testing

1. Open extension
2. Run "Scout: Import Case from Local File"
3. Select a ZIP file
4. Verify case appears in Cases view
5. Click case to open
6. Verify logs are discoverable

---

## Step 6: Building for Production

### 6.1 Build Shared Core

```bash
cd shared-core
npm run build
```

### 6.2 Build VS Code Extension

```bash
cd vscode-extension
npm run compile
npm run package
```

This creates `.vsix` file ready for distribution.

---

## Development Workflow

### Hot Reload During Development

**Terminal 1 - Watch shared-core:**
```bash
cd shared-core
npm run watch
```

**Terminal 2 - Watch VS Code extension:**
```bash
cd vscode-extension
npm run watch
```

Changes to shared-core automatically rebuild and trigger extension reload.

---

## File Storage Location

Cases are stored in:

**VS Code:**
- Workspace: `<workspace>/.log-scout-cases/`
- Global: `<user-home>/.vscode/extensions/globalStorage/cases/`

**Zed:**
- Workspace: `<workspace>/.log-scout-cases/`
- Global: `<user-home>/.config/zed/cases/`

Both extensions can share the same workspace-level storage!

---

## Shared Storage Benefits

✅ **Single Source of Truth**: Cases stored once, used by both editors
✅ **No Duplication**: No need to import same case twice
✅ **Consistent State**: Both editors see same cases
✅ **Easy Switching**: Use VS Code or Zed with same cases

---

## Version Management

### Updating Shared Core

1. Make changes in `shared-core/src/`
2. Increment version in `shared-core/package.json`
3. Run `npm run build`
4. Both extensions automatically use new version (via symlink)

### Breaking Changes

If shared-core API changes:
1. Update `shared-core` version
2. Update both adapters
3. Test both extensions
4. Document migration steps

---

## Troubleshooting

### "Cannot find module '@log-scout/shared-core'"

```bash
cd vscode-extension
rm -rf node_modules
npm install
```

### "Types not found"

```bash
cd shared-core
npm run build
```

### Changes not reflecting

```bash
cd shared-core
npm run build

cd ../vscode-extension
npm run compile
```

---

## Best Practices

1. **Always build shared-core first** before building extensions
2. **Use watch mode** during development
3. **Test on both platforms** before committing
4. **Document API changes** in shared-core README
5. **Version carefully** to avoid breaking changes

---

## Next Steps

1. ✅ Build shared-core
2. ✅ Integrate into VS Code extension
3. ⏳ Integrate into Zed extension (when APIs available)
4. ⏳ Add comprehensive tests
5. ⏳ Add CI/CD pipeline

---

## Resources

- [Shared Core README](shared-core/README.md)
- [VS Code Integration Guide](vscode-extension/CASE_MANAGEMENT_INTEGRATION.md)
- [Case Management Guide](vscode-extension/CASE_MANAGEMENT_GUIDE.md)
- [API Reference](shared-core/README.md#api-reference)

---

**You're all set!** Both extensions now share the same case management logic. 🎉