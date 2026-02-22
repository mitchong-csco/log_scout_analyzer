# 🚀 Build & Deploy Guide

This project includes **fully automated build and deployment scripts** for the VSCode extension.

---

## ⚡ Quick Start

```bash
cd vscode-extension
npm run deploy
```

Then reload VSCode (Ctrl+Shift+P → "Reload Window")

**That's it!** 🎉

---

## 📚 Complete Documentation

All build automation documentation is in the `vscode-extension` directory:

### Essential Reading

1. **[vscode-extension/QUICK_START_BUILD.md](vscode-extension/QUICK_START_BUILD.md)**
   - Quick reference for common tasks
   - Start here if you're new to the system

2. **[vscode-extension/BUILD_AUTOMATION_INDEX.md](vscode-extension/BUILD_AUTOMATION_INDEX.md)**
   - Master index of all documentation
   - Navigation hub for finding information

3. **[vscode-extension/BUILD_AUTOMATION_COMPLETE.md](vscode-extension/BUILD_AUTOMATION_COMPLETE.md)**
   - Complete summary of features
   - What was automated and how

4. **[vscode-extension/DEPLOYMENT_WORKFLOW.md](vscode-extension/DEPLOYMENT_WORKFLOW.md)**
   - Visual workflow diagrams
   - See how everything fits together

5. **[vscode-extension/SCRIPTS_README.md](vscode-extension/SCRIPTS_README.md)**
   - Detailed technical documentation
   - Troubleshooting guide

---

## 🎯 Common Commands

```bash
# Check current status
npm run status

# Preview what will happen (no changes)
npm run dry-run

# Full deployment (recommended)
npm run deploy

# Verify scripts work
npm run test:scripts

# Clean build artifacts
npm run clean
```

All commands should be run from the `vscode-extension` directory.

---

## 📦 What Gets Automated

✅ **Version Management**
- Auto-increments both extension and LSP server versions
- Updates activity bar display strings
- Generates build metadata

✅ **Building**
- Compiles Rust LSP server
- Compiles TypeScript extension code
- Copies binaries to correct locations

✅ **Packaging**
- Creates `.vsix` extension package
- Copies to Downloads folder for sharing
- Installs into VSCode automatically

✅ **Testing & Validation**
- Comprehensive script testing
- Version format validation
- Integration verification

---

## 🗂️ Project Structure

```
log_scout_analyzer/
├── BUILD_AND_DEPLOY.md              ← YOU ARE HERE
│
├── lsp-server/                      ← Rust LSP server
│   ├── Cargo.toml                   ← LSP version managed here
│   └── src/
│
└── vscode-extension/                ← VSCode extension
    ├── 📖 Documentation
    │   ├── BUILD_AUTOMATION_INDEX.md       ← Start here
    │   ├── QUICK_START_BUILD.md            ← Quick reference
    │   ├── BUILD_AUTOMATION_COMPLETE.md    ← Full summary
    │   ├── DEPLOYMENT_WORKFLOW.md          ← Visual guides
    │   └── SCRIPTS_README.md               ← Detailed docs
    │
    ├── 🔧 Build Scripts
    │   ├── increment-version.js            ← Version management
    │   ├── update-versions.js              ← Version sync
    │   ├── generate-build-info.js          ← Build metadata
    │   ├── copy-vsix.js                    ← Distribution
    │   ├── show-status.js                  ← Status display
    │   ├── test-scripts.js                 ← Verification
    │   ├── dry-run.js                      ← Preview
    │   └── clean.js                        ← Cleanup
    │
    ├── package.json                        ← NPM scripts & version
    └── src/                                ← Extension source code
```

---

## 🚦 Standard Workflow

```bash
# 1. Go to extension directory
cd vscode-extension

# 2. Check status
npm run status

# 3. Deploy
npm run deploy

# 4. Reload VSCode
# Press: Ctrl+Shift+P → "Reload Window"
```

---

## 💡 Key Features

### Version Management
- Extension version in `vscode-extension/package.json`
- LSP server version in `lsp-server/Cargo.toml`
- **Both auto-incremented together** during deployment

### Build Automation
- Builds Rust LSP server in release mode
- Compiles TypeScript to JavaScript
- Generates build info with version, timestamp, git hash
- Updates VSCode activity bar version display

### Packaging
- Creates `.vsix` extension package
- Installs directly into VSCode
- Copies to `Downloads/vscode-extensions/` for sharing

### Safety Features
- `dry-run` - Preview changes without making them
- `test:scripts` - Verify all automation works
- `clean` - Remove artifacts for fresh start
- Comprehensive error handling

---

## 📊 Version Display

After deployment, VSCode activity bar shows:

```
Scout Analyzer (v0.0.163 | LSP v0.1.11)
Scout Toolkit (v0.0.163 | LSP v0.1.11)
```

This is **automatically updated** by the build scripts!

---

## 🆘 Troubleshooting

### Scripts not working?
```bash
npm run test:scripts
```

### Build issues?
```bash
npm run clean
npm run deploy
```

### Need detailed help?
See [vscode-extension/SCRIPTS_README.md](vscode-extension/SCRIPTS_README.md)

---

## 🎓 Learning Path

1. **Beginner** (5 min)
   - Read: [vscode-extension/QUICK_START_BUILD.md](vscode-extension/QUICK_START_BUILD.md)
   - Try: `npm run deploy`

2. **Intermediate** (15 min)
   - Read: [vscode-extension/BUILD_AUTOMATION_COMPLETE.md](vscode-extension/BUILD_AUTOMATION_COMPLETE.md)
   - Explore: [vscode-extension/DEPLOYMENT_WORKFLOW.md](vscode-extension/DEPLOYMENT_WORKFLOW.md)

3. **Advanced** (30 min)
   - Read: [vscode-extension/SCRIPTS_README.md](vscode-extension/SCRIPTS_README.md)
   - Study: Individual script files

---

## ✅ System Status

- ✅ All automation scripts created
- ✅ NPM integration complete
- ✅ Full documentation available
- ✅ Windows batch file included
- ✅ Comprehensive testing in place
- ✅ **Production ready!**

---

## 🚀 Ready to Deploy?

```bash
cd vscode-extension
npm run deploy
```

Then reload VSCode and you're done! 🎉

---

**For complete documentation, see:** [vscode-extension/BUILD_AUTOMATION_INDEX.md](vscode-extension/BUILD_AUTOMATION_INDEX.md)

**Maintained By:** Log Scout Team  
**Last Updated:** 2026-02-19