# 🎨 Build Process - Visual Guide

**CRITICAL**: Always build from root using npm scripts

---

## ✅ CORRECT Build Process

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Navigate to Root Folder                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                  cd log_scout_analyzer
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Run npm Command                                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                   npm run build:all
                           │
                           ▼
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌─────────────────┐                 ┌─────────────────┐
│  Build LSP      │                 │  Build Extension│
│  (Rust/Cargo)   │                 │  (TypeScript)   │
└─────────────────┘                 └─────────────────┘
        │                                     │
        ▼                                     ▼
  cargo build --release              tsc -p ./
        │                                     │
        ▼                                     
┌─────────────────┐                          
│  Copy Binary    │                          
│  to Extension   │                          
└─────────────────┘                          
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ✅ RESULT: Everything built, binary copied, ready to use  │
└─────────────────────────────────────────────────────────────┘
```

---

## ❌ INCORRECT Build Process

```
┌─────────────────────────────────────────────────────────────┐
│  WRONG: Navigate to Subdirectory                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    cd lsp-server
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  WRONG: Use cargo directly                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                 cargo build --release
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ PROBLEM: Binary in lsp-server/target/release/          │
│  ❌ NOT COPIED to vscode-extension/bin/                    │
│  ❌ Extension can't find LSP server                        │
│  ❌ Extension fails to activate                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Side-by-Side Comparison

| Step | ❌ WRONG | ✅ CORRECT |
|------|---------|-----------|
| **1. Location** | `cd lsp-server` | `cd log_scout_analyzer` |
| **2. Command** | `cargo build --release` | `npm run build:all` |
| **3. Result** | Binary in wrong place | Binary copied correctly |
| **4. Extension** | ❌ Can't find LSP | ✅ Finds LSP binary |
| **5. Versions** | ❌ Not synchronized | ✅ Synchronized |

---

## 🔄 Complete Workflow Visual

```
╔═══════════════════════════════════════════════════════════════╗
║                    START HERE (Always!)                       ║
╚═══════════════════════════════════════════════════════════════╝
                              │
                              ▼
                ┌─────────────────────────┐
                │  cd log_scout_analyzer  │
                │  (Root Folder)          │
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  npm run status         │
                │  (Check current state)  │
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  Make code changes      │
                │  (Any file, any folder) │
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  npm run build:all      │
                │  (Build everything)     │
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  npm test               │
                │  (Run tests)            │
                └─────────────────────────┘
                              │
                              ▼
                ┌─────────────────────────┐
                │  npm run status         │
                │  (Verify success)       │
                └─────────────────────────┘
                              │
                              ▼
╔═══════════════════════════════════════════════════════════════╗
║                    READY TO COMMIT!                           ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🎯 The One Command You Need

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│         cd log_scout_analyzer && npm run build:all        │
│                                                           │
│  This ONE command:                                        │
│  • Builds Rust LSP server                                │
│  • Copies binary to extension bin/                       │
│  • Updates version numbers                               │
│  • Builds TypeScript extension                           │
│  • Synchronizes everything                               │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure Context

```
log_scout_analyzer/                    ← YOU ARE HERE (Root)
│
├── package.json                       ← Root build orchestration
│   └── Scripts:
│       ├── build:lsp
│       ├── build:extension
│       └── build:all
│
├── lsp-server/                        ← Rust LSP Server
│   ├── Cargo.toml
│   ├── src/
│   └── target/release/
│       └── log-scout-lsp-server.exe   ← Built here
│
└── vscode-extension/                  ← TypeScript Extension
    ├── package.json
    ├── src/
    ├── out/                           ← TypeScript compiled here
    └── bin/
        └── log-scout-lsp-server-win.exe ← Copied here (from LSP)
```

**Key Point**: npm script in ROOT copies binary from `lsp-server/target/release/` to `vscode-extension/bin/`

---

## 🚦 Build Decision Tree

```
                     Need to build?
                           │
                           ▼
                    Where are you?
                     ╱          ╲
                   ╱              ╲
              In root?          In subdirectory?
                 │                     │
                 ▼                     ▼
            ✅ Good!              ❌ Navigate to root!
                 │                     │
                 │                     ▼
                 │              cd log_scout_analyzer
                 │                     │
                 └─────────┬───────────┘
                           ▼
                   npm run build:all
                           │
                           ▼
                    ✅ BUILD SUCCESS!
```

---

## 💡 Remember the Pattern

```
╔═══════════════════════════════════════════════════════════════╗
║  LOCATION → ROOT                                              ║
║  TOOL     → npm                                               ║
║  COMMAND  → build:all                                         ║
║  RESULT   → Everything built and copied correctly            ║
╚═══════════════════════════════════════════════════════════════╝
```

**Never**:
- ❌ Build from subdirectories
- ❌ Use cargo directly
- ❌ Use tsc directly
- ❌ Manually copy binaries

**Always**:
- ✅ Build from root
- ✅ Use npm scripts
- ✅ Let npm orchestrate
- ✅ Automatic coordination

---

## 📚 Quick Command Reference

```
┌─────────────────────────────────────────────────────────────┐
│  Command                  │  What It Does                   │
├─────────────────────────────────────────────────────────────┤
│  npm run status           │  Show versions & build info     │
│  npm run check            │  Fast check (no build)          │
│  npm run build:lsp        │  Build LSP + copy binary        │
│  npm run build:extension  │  Build extension only           │
│  npm run build:all        │  Build everything               │
│  npm run package          │  Build + create VSIX            │
│  npm run clean            │  Clean build artifacts          │
└─────────────────────────────────────────────────────────────┘

ALL commands run from: log_scout_analyzer/ (root folder)
```

---

## 🎓 For AI Assistants

### Before You Build

```
┌────────────────────────────────┐
│  1. Check location             │
│     pwd → Are you in root?     │
│                                │
│  2. If not, navigate           │
│     cd log_scout_analyzer      │
│                                │
│  3. Check status               │
│     npm run status             │
└────────────────────────────────┘
```

### When You Build

```
┌────────────────────────────────┐
│  Always use npm from root:     │
│                                │
│  npm run build:all             │
│                                │
│  NOT:                          │
│  • cargo build                 │
│  • tsc -p ./                   │
│  • Any subdirectory builds     │
└────────────────────────────────┘
```

### After You Build

```
┌────────────────────────────────┐
│  1. Verify success             │
│     npm run status             │
│                                │
│  2. Check binary exists        │
│     ls vscode-extension/bin/   │
│                                │
│  3. Run tests                  │
│     npm test                   │
└────────────────────────────────┘
```

---

## ✅ Success Indicators

You're doing it RIGHT when:
- ✅ You see "Root workspace" in npm output
- ✅ Binary appears in `vscode-extension/bin/`
- ✅ Versions match across components
- ✅ Extension can find LSP server
- ✅ Tests pass

You're doing it WRONG when:
- ❌ You're in a subdirectory
- ❌ Using cargo/tsc directly
- ❌ Manually copying files
- ❌ Extension can't find LSP
- ❌ Version mismatches

---

**Last Updated**: 2024  
**Status**: ✅ Ready to Use  
**Read First**: `.zed/AI_ASSISTANT_GUIDE.md` → "🔨 MANDATORY: Always Build Through npm"