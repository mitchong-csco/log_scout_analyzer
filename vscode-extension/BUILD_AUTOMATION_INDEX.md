# 📚 Build Automation - Master Index

**Complete guide to automated building, versioning, and deployment**

---

## 🎯 Quick Start

New to the build system? Start here:

1. **[QUICK_START_BUILD.md](QUICK_START_BUILD.md)** - Get up and running in 5 minutes
2. Run `npm run status` to see current state
3. Run `npm run deploy` to deploy

That's it! 🚀

---

## 📖 Documentation Files

### Essential Reading

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[QUICK_START_BUILD.md](QUICK_START_BUILD.md)** | Quick reference guide | First time, or as reference |
| **[BUILD_AUTOMATION_COMPLETE.md](BUILD_AUTOMATION_COMPLETE.md)** | Complete summary | To understand the system |
| **[DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)** | Visual workflow diagrams | To see how it all fits together |

### Detailed Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[SCRIPTS_README.md](SCRIPTS_README.md)** | Full script documentation | Deep dive, troubleshooting |
| **[package.json](package.json)** | NPM scripts definition | To modify build process |

---

## 🔧 Script Files

### Core Automation Scripts

| Script | Purpose | Run Via |
|--------|---------|---------|
| **increment-version.js** | Auto-increment versions | `npm run version:increment` |
| **update-versions.js** | Sync version displays | `npm run update:versions` |
| **generate-build-info.js** | Generate build metadata | (automatic during build) |
| **copy-vsix.js** | Copy to Downloads | (automatic after package) |

### Utility Scripts

| Script | Purpose | Run Via |
|--------|---------|---------|
| **show-status.js** | Display current state | `npm run status` |
| **test-scripts.js** | Verify all scripts | `npm run test:scripts` |
| **dry-run.js** | Preview deployment | `npm run dry-run` |
| **clean.js** | Remove build artifacts | `npm run clean` |

### Batch Files (Windows)

| File | Purpose | How to Use |
|------|---------|------------|
| **DEPLOY.bat** | Visual deployment | Double-click |

---

## 🚀 Common Commands

### Most Used

```bash
# Check status (always start here)
npm run status

# Deploy everything (most common)
npm run deploy

# Preview what will happen
npm run dry-run

# Verify scripts work
npm run test:scripts
```

### Building

```bash
# Full build with version increment
npm run deploy

# Build without version change
npm run build:all

# Build LSP server only
npm run build:lsp

# Build extension only
npm run build
```

### Utilities

```bash
# Show current status
npm run status

# Preview deployment
npm run dry-run

# Clean build artifacts
npm run clean

# Test all scripts
npm run test:scripts

# Increment versions only
npm run version:increment
```

---

## 📂 File Structure

```
vscode-extension/
│
├── 📖 Documentation
│   ├── BUILD_AUTOMATION_INDEX.md        ← YOU ARE HERE
│   ├── QUICK_START_BUILD.md             ← Start here
│   ├── BUILD_AUTOMATION_COMPLETE.md     ← Full summary
│   ├── DEPLOYMENT_WORKFLOW.md           ← Visual guides
│   └── SCRIPTS_README.md                ← Detailed reference
│
├── 🔧 Core Scripts
│   ├── increment-version.js             ← Version management
│   ├── update-versions.js               ← Version sync
│   ├── generate-build-info.js           ← Build metadata
│   └── copy-vsix.js                     ← Distribution
│
├── 🛠️ Utility Scripts
│   ├── show-status.js                   ← Status display
│   ├── test-scripts.js                  ← Verification
│   ├── dry-run.js                       ← Preview
│   └── clean.js                         ← Cleanup
│
├── 💻 Batch Files
│   └── DEPLOY.bat                       ← Windows deployment
│
├── 📦 Configuration
│   ├── package.json                     ← NPM scripts & version
│   └── tsconfig.json                    ← TypeScript config
│
├── 📂 Source Code
│   └── src/                             ← TypeScript source
│       └── buildInfo.ts                 ← Generated build info
│
├── 📂 Build Output
│   ├── out/                             ← Compiled JavaScript
│   ├── bin/                             ← LSP server binary
│   └── log-scout-analyzer.vsix          ← Package
│
└── 📂 Related
    └── ../lsp-server/
        └── Cargo.toml                   ← LSP server version

```

---

## 🎓 Learning Path

### Level 1: Basic Usage (5 minutes)

1. Read: [QUICK_START_BUILD.md](QUICK_START_BUILD.md) - Sections "One-Command Deployment" and "Common Commands"
2. Try: `npm run status`
3. Try: `npm run dry-run`
4. Deploy: `npm run deploy`
5. Reload VSCode

**You can now deploy the extension!** ✅

---

### Level 2: Understanding (15 minutes)

1. Read: [BUILD_AUTOMATION_COMPLETE.md](BUILD_AUTOMATION_COMPLETE.md) - Full summary
2. Read: [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md) - Visual workflow
3. Try: `npm run test:scripts`
4. Explore: Open and read `increment-version.js`

**You understand how it works!** ✅

---

### Level 3: Advanced (30 minutes)

1. Read: [SCRIPTS_README.md](SCRIPTS_README.md) - Complete reference
2. Read: All script files in detail
3. Experiment: Modify a script (backup first!)
4. Try: Manual step-by-step build process

**You can modify and extend the system!** ✅

---

## 🔍 Find Information Fast

### "How do I...?"

| Question | Answer |
|----------|--------|
| ...deploy a new build? | `npm run deploy` |
| ...check current version? | `npm run status` |
| ...see what will happen? | `npm run dry-run` |
| ...fix a broken build? | `npm run clean` then `npm run deploy` |
| ...test if scripts work? | `npm run test:scripts` |
| ...change version manually? | See [QUICK_START_BUILD.md](QUICK_START_BUILD.md) → "Manual Override" |
| ...understand the workflow? | See [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md) |
| ...troubleshoot errors? | See [SCRIPTS_README.md](SCRIPTS_README.md) → "Troubleshooting" |

---

## 🚦 Workflow Quick Reference

```
┌─────────────────────────────────────────────────┐
│  Standard Deployment Workflow                   │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Check status:    npm run status             │
│  2. Preview:         npm run dry-run (optional) │
│  3. Deploy:          npm run deploy             │
│  4. Reload VSCode:   Ctrl+Shift+P → Reload      │
│  5. Test:            Try your changes!          │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Troubleshooting Workflow                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Test scripts:    npm run test:scripts       │
│  2. Clean build:     npm run clean              │
│  3. Try again:       npm run deploy             │
│  4. Check docs:      See SCRIPTS_README.md      │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📊 What Each File Does

### Documentation

- **BUILD_AUTOMATION_INDEX.md** (this file) - Master index, navigation hub
- **QUICK_START_BUILD.md** - Fast reference, common commands
- **BUILD_AUTOMATION_COMPLETE.md** - Complete feature summary
- **DEPLOYMENT_WORKFLOW.md** - Visual diagrams and flowcharts
- **SCRIPTS_README.md** - Detailed technical documentation

### Scripts: Version Management

- **increment-version.js** - Bumps patch version in both package.json and Cargo.toml
- **update-versions.js** - Syncs versions to activity bar display strings

### Scripts: Build Process

- **generate-build-info.js** - Creates buildInfo.ts with version, timestamp, git hash
- **copy-vsix.js** - Copies package to Downloads folder for distribution

### Scripts: Utilities

- **show-status.js** - Shows current versions, build info, git status
- **test-scripts.js** - Validates all scripts and configuration
- **dry-run.js** - Previews deployment without making changes
- **clean.js** - Removes all build artifacts for fresh start

### Automation

- **DEPLOY.bat** - Windows batch file with visual feedback
- **package.json** → scripts - NPM script definitions

---

## 💡 Pro Tips

1. **Always check status first:** `npm run status`
2. **Use dry-run for safety:** `npm run dry-run` before deploy
3. **Commit before building:** Git hash is embedded in build
4. **Test scripts periodically:** `npm run test:scripts`
5. **Clean if issues occur:** `npm run clean` then retry
6. **Read error messages:** Scripts provide helpful diagnostics

---

## 🎯 Decision Matrix

**"Which command should I run?"**

| Scenario | Command | Why |
|----------|---------|-----|
| Want to deploy | `npm run deploy` | Full automated deployment |
| Just checking | `npm run status` | See current state |
| Not sure yet | `npm run dry-run` | Preview without changes |
| Something broke | `npm run clean` | Clean slate |
| Testing system | `npm run test:scripts` | Validate everything |
| Manual control | See QUICK_START_BUILD.md | Step-by-step process |

---

## 📈 System Status

✅ **All scripts created and tested**
✅ **NPM integration complete**
✅ **Documentation complete**
✅ **Version management automated**
✅ **Build process automated**
✅ **Testing framework in place**
✅ **Windows batch file available**

**Status:** Production Ready 🚀

---

## 🆘 Getting Help

### Quick Help

```bash
# Show status
npm run status

# Test everything
npm run test:scripts

# Preview deployment
npm run dry-run
```

### Read Documentation

1. **Quick answer:** [QUICK_START_BUILD.md](QUICK_START_BUILD.md)
2. **Detailed help:** [SCRIPTS_README.md](SCRIPTS_README.md)
3. **Visual guide:** [DEPLOYMENT_WORKFLOW.md](DEPLOYMENT_WORKFLOW.md)

### Common Issues

See [SCRIPTS_README.md](SCRIPTS_README.md) → "Troubleshooting" section

---

## 🔄 Updates

This automation system is versioned with the extension.

**Current Version:** Matches extension version  
**Last Updated:** 2026-02-19  
**Status:** Stable

---

## 📝 Summary

```
┌──────────────────────────────────────────────────┐
│  Log Scout Analyzer - Build Automation           │
│                                                   │
│  ✅ Automated version management                 │
│  ✅ Automated build process                      │
│  ✅ Automated packaging                          │
│  ✅ Automated installation                       │
│  ✅ Full documentation                           │
│  ✅ Testing framework                            │
│  ✅ Windows support                              │
│                                                   │
│  One command does it all:                        │
│  $ npm run deploy                                │
│                                                   │
│  Then reload VSCode and you're done! 🚀          │
└──────────────────────────────────────────────────┘
```

---

**Quick Start:** Read [QUICK_START_BUILD.md](QUICK_START_BUILD.md), then run `npm run deploy`

**Maintained By:** Log Scout Team  
**License:** MIT