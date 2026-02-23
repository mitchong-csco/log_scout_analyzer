# 🚀 Log Scout Analyzer - Deployment Workflow

Visual guide showing the complete automated deployment process.

---

## 📊 Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    START: npm run deploy                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: VERSION INCREMENT (increment-version.js)                   │
│                                                                      │
│  📦 package.json:              0.0.162  ──►  0.0.163                │
│  🦀 lsp-server/Cargo.toml:     0.1.10   ──►  0.1.11                 │
│                                                                      │
│  ⏱️  Duration: < 1 second                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: BUILD LSP SERVER (build:lsp)                               │
│                                                                      │
│  Command: cargo build --release --bin log-scout-lsp-server          │
│                                                                      │
│  📂 Input:   lsp-server/src/**/*.rs                                 │
│  📦 Output:  bin/log-scout-lsp-server-win.exe (~8 MB)               │
│                                                                      │
│  ⏱️  Duration: 30-60 seconds                                         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: UPDATE VERSION DISPLAY (update-versions.js)                │
│                                                                      │
│  Updates package.json activity bar titles:                          │
│  ✨ "Scout Analyzer (v0.0.163 | LSP v0.1.11)"                       │
│  ✨ "Scout Toolkit (v0.0.163 | LSP v0.1.11)"                        │
│                                                                      │
│  ⏱️  Duration: < 1 second                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: GENERATE BUILD INFO (generate-build-info.js)               │
│                                                                      │
│  Creates: src/buildInfo.ts                                          │
│                                                                      │
│  export const BUILD_INFO = {                                        │
│    version: "0.0.163",                                              │
│    buildTimestamp: "2026-02-19T14:00:00.000Z",                      │
│    buildNumber: 1771509600000,                                      │
│    gitCommit: "c64fbc8"                                             │
│  };                                                                 │
│                                                                      │
│  ⏱️  Duration: < 1 second                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: COMPILE TYPESCRIPT (compile)                               │
│                                                                      │
│  Command: tsc -p ./                                                 │
│                                                                      │
│  📂 Input:   src/**/*.ts                                            │
│  📦 Output:  out/**/*.js                                            │
│                                                                      │
│  ⏱️  Duration: 5-15 seconds                                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: CREATE VSIX PACKAGE (vsce package)                         │
│                                                                      │
│  Command: vsce package --allow-star-activation                      │
│                                                                      │
│  📦 Packages:                                                        │
│     • Extension code (out/)                                         │
│     • LSP server binary (bin/)                                      │
│     • Syntax files (syntaxes/)                                      │
│     • Media assets (media/)                                         │
│     • Configuration files                                           │
│                                                                      │
│  📦 Output: log-scout-analyzer.vsix (~8-10 MB)                      │
│                                                                      │
│  ⏱️  Duration: 3-5 seconds                                           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: COPY TO DOWNLOADS (copy-vsix.js)                           │
│                                                                      │
│  Source: log-scout-analyzer.vsix                                    │
│  Dest:   %USERPROFILE%\Downloads\vscode-extensions\                │
│                                                                      │
│  Makes distribution and sharing easier                              │
│                                                                      │
│  ⏱️  Duration: < 1 second                                            │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: INSTALL INTO VSCODE                                        │
│                                                                      │
│  Command: code --install-extension log-scout-analyzer.vsix          │
│                                                                      │
│  Installs extension into your local VSCode instance                 │
│                                                                      │
│  ⏱️  Duration: 2-5 seconds                                           │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ✅ DEPLOYMENT COMPLETE!                                            │
│                                                                      │
│  📝 Next Step: Reload VSCode Window                                 │
│     Press: Ctrl+Shift+P → "Reload Window"                          │
│                                                                      │
│  ⏱️  Total Time: ~1-2 minutes                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 File Flow Diagram

```
Input Files                  Process                     Output Files
───────────────────────────────────────────────────────────────────────

package.json            ──►  increment-version.js   ──►  package.json (v+1)
Cargo.toml              ──►  increment-version.js   ──►  Cargo.toml (v+1)
                        
lsp-server/src/*.rs     ──►  cargo build            ──►  bin/log-scout-lsp-server-win.exe

package.json            ──►  update-versions.js     ──►  package.json (titles updated)

package.json            ──►  generate-build-info.js ──►  src/buildInfo.ts
git HEAD                ──►  generate-build-info.js ──►  src/buildInfo.ts

src/**/*.ts             ──►  tsc                    ──►  out/**/*.js
src/buildInfo.ts        ──►  tsc                    ──►  out/buildInfo.js

out/**/*.js             ──►  vsce package           ──►  log-scout-analyzer.vsix
bin/*.exe               ──►  vsce package           ──►  log-scout-analyzer.vsix
package.json            ──►  vsce package           ──►  log-scout-analyzer.vsix
media/, syntaxes/, etc. ──►  vsce package           ──►  log-scout-analyzer.vsix

log-scout-analyzer.vsix ──►  copy-vsix.js           ──►  Downloads/vscode-extensions/*.vsix

log-scout-analyzer.vsix ──►  code --install-ext     ──►  VSCode Extension Installed
```

---

## 🎯 Decision Tree

```
                          Need to deploy?
                                │
                    ┌───────────┴───────────┐
                    │                       │
                   YES                      NO
                    │                       │
                    ▼                       ▼
          Want to see preview?        Check status?
                    │                       │
        ┌───────────┴───────────┐          ▼
        │                       │    npm run status
       YES                      NO
        │                       │
        ▼                       ▼
  npm run dry-run        npm run deploy
        │                       │
        ▼                       │
  Review output                 │
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
            Deployment complete
                    │
                    ▼
         Reload VSCode window
                    │
                    ▼
              Test changes
```

---

## 📋 Version Number Flow

```
Current State                    After Deployment
─────────────────────────────────────────────────────────

package.json:
  version: "0.0.162"        ──►   version: "0.0.163"

Cargo.toml:
  version = "0.1.10"        ──►   version = "0.1.11"

Activity Bar (package.json):
  "Scout Analyzer             "Scout Analyzer
   (v0.0.161 | LSP v0.1.10)"  ──►  (v0.0.163 | LSP v0.1.11)"

buildInfo.ts:
  version: "0.0.161"        ──►   version: "0.0.163"
  buildNumber: 1771463981   ──►   buildNumber: 1771509600
  gitCommit: "e1679db"      ──►   gitCommit: "c64fbc8"
```

---

## 🗂️ Directory Structure Before/After

```
Before Deployment                After Deployment
─────────────────────────────────────────────────────────────────

vscode-extension/               vscode-extension/
├── src/                        ├── src/
│   ├── extension.ts            │   ├── extension.ts
│   └── ...                     │   ├── buildInfo.ts         ← GENERATED
├── out/                        │   └── ...
│   └── (old files)             ├── out/
├── bin/                        │   ├── extension.js        ← UPDATED
│   └── (old binary)            │   ├── buildInfo.js        ← GENERATED
├── package.json (v0.0.162)     │   └── ...                 ← UPDATED
└── ...                         ├── bin/
                                │   └── log-scout-lsp-*.exe ← REBUILT
                                ├── log-scout-analyzer.vsix ← CREATED
                                ├── package.json (v0.0.163) ← UPDATED
                                └── ...

../lsp-server/                  ../lsp-server/
└── Cargo.toml (v0.1.10)        └── Cargo.toml (v0.1.11)   ← UPDATED
```

---

## ⚙️ Script Execution Order

```
npm run deploy
    │
    ├─► npm run version:increment
    │       └─► node increment-version.js
    │           ├─► Updates package.json
    │           └─► Updates lsp-server/Cargo.toml
    │
    ├─► npm run build:lsp
    │       └─► cargo build --release
    │           └─► Creates bin/log-scout-lsp-server-win.exe
    │
    ├─► npm run build
    │       ├─► npm run update:versions
    │       │   └─► node update-versions.js
    │       │       └─► Updates activity bar titles
    │       ├─► node generate-build-info.js
    │       │   └─► Creates src/buildInfo.ts
    │       └─► npm run compile
    │           └─► tsc -p ./
    │               └─► Compiles src/ to out/
    │
    ├─► vsce package
    │       └─► Creates log-scout-analyzer.vsix
    │
    ├─► npm run postpackage
    │       └─► node copy-vsix.js
    │           └─► Copies to Downloads/
    │
    └─► code --install-extension
            └─► Installs into VSCode
```

---

## 🚦 Alternative Workflows

### Just Check Status
```
npm run status
    │
    └─► Shows current versions, build info, git status
```

### Preview Without Changes
```
npm run dry-run
    │
    └─► Shows what would happen (no actual changes)
```

### Build Without Version Increment
```
npm run build:all
    │
    ├─► npm run build:lsp
    └─► npm run build
```

### Clean and Rebuild
```
npm run clean
    │
    └─► Removes all build artifacts
        │
        └─► npm run deploy
            └─► Fresh rebuild
```

### Test Scripts
```
npm run test:scripts
    │
    └─► Validates all automation scripts
```

---

## 📊 Time Breakdown

```
Step                        Duration        Percentage
────────────────────────────────────────────────────────
1. Version Increment        < 1 sec         < 1%
2. Build LSP Server         30-60 sec       60-70%
3. Update Versions          < 1 sec         < 1%
4. Generate Build Info      < 1 sec         < 1%
5. Compile TypeScript       5-15 sec        10-20%
6. Create VSIX              3-5 sec         5-10%
7. Copy to Downloads        < 1 sec         < 1%
8. Install to VSCode        2-5 sec         5-10%
────────────────────────────────────────────────────────
Total                       1-2 minutes     100%
```

**Bottleneck:** Rust compilation (LSP server build)

---

## 🎨 Visual Summary

```
┌────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT COMMAND                         │
│                                                            │
│              npm run deploy                                │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  INPUT                                                     │
│  • Source code (TypeScript, Rust)                          │
│  • Current versions (0.0.162, 0.1.10)                      │
│  • Git commit hash                                         │
├────────────────────────────────────────────────────────────┤
│  PROCESS                                                   │
│  • Increment versions                                      │
│  • Build Rust LSP server                                   │
│  • Compile TypeScript                                      │
│  • Package everything                                      │
│  • Install into VSCode                                     │
├────────────────────────────────────────────────────────────┤
│  OUTPUT                                                    │
│  • New versions (0.0.163, 0.1.11)                          │
│  • Compiled binaries                                       │
│  • VSIX package                                            │
│  • Installed extension                                     │
├────────────────────────────────────────────────────────────┤
│  RESULT                                                    │
│  ✅ Ready to use after VSCode reload!                     │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Quick Reference

### Check Before Deploy
```bash
npm run status      # What's the current state?
npm run dry-run     # What will happen?
```

### Deploy
```bash
npm run deploy      # Do it!
```

### After Deploy
```
Ctrl+Shift+P → "Reload Window"
```

### If Issues
```bash
npm run clean       # Clean everything
npm run deploy      # Try again
```

---

**Last Updated:** 2026-02-19  
**Maintained By:** Log Scout Team