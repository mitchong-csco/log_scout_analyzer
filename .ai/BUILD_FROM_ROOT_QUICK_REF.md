# 🔨 Build From Root - Quick Reference Card

**GOLDEN RULE**: All builds MUST run from root folder using npm scripts.

---

## 🚨 THE RULE

```bash
# ALWAYS do this:
cd log_scout_analyzer          # ✅ Start from root
npm run build:all              # ✅ Let npm orchestrate

# NEVER do this:
cd lsp-server
cargo build --release          # ❌ WRONG! Binary won't be copied

cd vscode-extension
tsc -p ./                      # ❌ WRONG! LSP won't be built
```

---

## 📍 Always Start Here

```bash
cd log_scout_analyzer          # Navigate to root
npm run status                 # Check current state
```

---

## 🛠️ Common Build Commands

| Command | What It Does | Use When |
|---------|--------------|----------|
| `npm run check` | Quick syntax check (fast) | Before committing |
| `npm run build:lsp` | Build Rust LSP server + copy binary | LSP code changed |
| `npm run build:extension` | Build TypeScript extension | Extension code changed |
| `npm run build:all` | Build LSP + extension | Any code changed |
| `npm run build:zed` | Build Zed extension | Working on Zed |
| `npm run package` | Version bump + build + create VSIX | Ready to deploy |
| `npm run clean` | Clean all build artifacts | Starting fresh |
| `npm run dev:setup` | Install all dependencies | First time setup |

---

## 🔄 Typical Workflow

```bash
# 1. Start fresh
cd log_scout_analyzer
npm run status

# 2. Make code changes
# ... edit files ...

# 3. Build everything
npm run build:all

# 4. Test
npm test

# 5. Package for distribution
npm run package

# 6. Check what was created
npm run status
```

---

## ❌ What NOT To Do

| ❌ WRONG | ✅ CORRECT |
|----------|------------|
| `cd lsp-server && cargo build` | `cd log_scout_analyzer && npm run build:lsp` |
| `cd vscode-extension && tsc` | `cd log_scout_analyzer && npm run build:extension` |
| `cargo build --release` | `npm run build:lsp` (from root) |
| `tsc -p ./` | `npm run build:extension` (from root) |
| Build from subdirectory | Always build from root |

---

## 🎯 Why Root Folder?

1. **Coordinates builds**: LSP (Rust) + Extension (TypeScript) built together
2. **Copies binaries**: LSP binary automatically copied to `vscode-extension/bin/`
3. **Syncs versions**: Version numbers stay consistent across components
4. **Resolves paths**: Relative paths work correctly
5. **Platform aware**: Builds correct binary name (`.exe` on Windows)

---

## 🆘 Troubleshooting

### "Command not found"
```bash
cd log_scout_analyzer          # Make sure you're in root
npm install                    # Install dependencies
npm run build:all              # Try again
```

### "Binary not found"
```bash
npm run build:lsp              # Build LSP first
npm run status                 # Verify binary exists
```

### "Version mismatch"
```bash
npm run version:increment      # Sync versions
npm run build:all              # Rebuild
npm run status                 # Verify versions match
```

### "TypeScript errors"
```bash
cd vscode-extension
npm install                    # Install extension dependencies
cd ..
npm run build:extension        # Build from root
```

---

## 📦 What Gets Built

```
log_scout_analyzer/
├── lsp-server/
│   └── target/release/
│       └── log-scout-lsp-server.exe    ← Built by cargo
│
└── vscode-extension/
    ├── out/                            ← Built by tsc
    │   └── extension.js
    └── bin/
        └── log-scout-lsp-server-win.exe  ← Copied from LSP build
```

**npm orchestrates**:
1. Builds LSP with cargo
2. Copies binary to extension's bin/
3. Builds extension with tsc
4. Updates versions
5. Creates VSIX package

---

## 🚀 Quick Start for New AI Assistants

```bash
# Step 1: Read the status
cd log_scout_analyzer
cat .zed/AI_ASSISTANT_GUIDE.md | grep "Build Through npm" -A 50

# Step 2: Check current state
npm run status

# Step 3: Build everything
npm run build:all

# Step 4: Run tests
npm test

# Step 5: You're ready!
```

---

## 📚 Where to Find More Info

- **Full Guide**: `.zed/AI_ASSISTANT_GUIDE.md` → "🔨 MANDATORY: Always Build Through npm"
- **npm Commands**: `.zed/NPM_AUTOMATION.md`
- **Package.json**: `package.json` (root)
- **Extension Package**: `vscode-extension/package.json`
- **Build Status**: `npm run status`

---

## 💡 Remember

- 🔨 **Root folder ONLY**: `cd log_scout_analyzer` first
- 🔨 **npm scripts ONLY**: Never use cargo/tsc directly
- 🔨 **build:all for everything**: When in doubt, rebuild all
- 🔨 **Check status often**: `npm run status` shows what's built
- 🔨 **Clean if stuck**: `npm run clean && npm run dev:setup`

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: ✅ Ready to Use