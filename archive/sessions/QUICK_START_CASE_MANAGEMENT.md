# Case Management - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Build and Install

```bash
build-all.bat
```

This single command:
- ✅ Builds shared-core module
- ✅ Builds VS Code extension
- ✅ Packages and installs VS Code extension
- ✅ Builds and installs Zed extension (if configured)

### Step 2: Restart Your Editor

- **VS Code:** Close and reopen VS Code
- **Zed:** Close and reopen Zed

### Step 3: Download Your First Case

**In VS Code:**
1. Press `Ctrl+Shift+P`
2. Type: `Scout: Download Case from URL`
3. Enter URL: `https://example.com/case-archive.zip`
4. Wait for extraction
5. Case appears in Cases view (📁 icon in Activity Bar)

**Or import local file:**
1. Press `Ctrl+Shift+P`
2. Type: `Scout: Import Case from Local File`
3. Select your ZIP/TAR.GZ file
4. Case extracts automatically

---

## 📁 What You Get

### Automatic Organization

Each case is organized in its own folder:

```
.log-scout-cases/
├── case-12345-abc/
│   ├── archive/
│   │   └── case-archive.zip       (original)
│   └── logs/
│       ├── application.log         (extracted)
│       ├── jabber.log
│       ├── debug.out
│       └── ... (all log files)
```

### Features

- ✅ **Download from URLs** - Fetch cases directly from web
- ✅ **Import local files** - Import ZIP, TAR, TAR.GZ, TGZ, 7Z
- ✅ **Auto-extract** - Automatic extraction and organization
- ✅ **Auto-discover** - Finds all .log, .txt, .out, .err files
- ✅ **Tree view** - Browse all cases and their log files
- ✅ **One-click open** - Add case to workspace instantly
- ✅ **Batch analysis** - Analyze all logs in a case at once
- ✅ **Cross-editor** - Same cases work in VS Code AND Zed!

---

## 🎯 Quick Commands

| Action | Command |
|--------|---------|
| Download case | `Scout: Download Case from URL` |
| Import local | `Scout: Import Case from Local File` |
| Open case | Click case in Cases view |
| View logs | Expand case → Click any log file |
| Analyze all | Right-click case → "Analyze All Case Logs" |
| Rename | Right-click case → "Rename Case" |
| Delete | Right-click case → "Delete Case" |

---

## 📊 Visual Guide

### Cases Tree View

```
📁 CASES
│
├─ 💼 Customer-ACME-Issue          [✅ 15 files]
│  ├─ 📋 Details
│  │  ├─ Case ID: case-123...
│  │  ├─ Status: ready
│  │  ├─ Downloaded: 2h ago
│  │  └─ Log Files: 15
│  │
│  └─ 📂 Log Files (15)
│     ├─ 📄 app.log         ← Click to open
│     ├─ 📄 jabber.log
│     └─ 📄 debug.out
│
└─ 💼 Another-Case              [⏬ Downloading...]
```

### Status Indicators

- 🕐 **Pending** - Case created
- 📥 **Downloading** - Fetching from URL
- 📦 **Extracting** - Unpacking archive
- ✅ **Ready** - All logs available
- ❌ **Error** - Something went wrong

---

## 🔧 Prerequisites

### VS Code
- Node.js 16+
- VS Code with `code` command in PATH

### Zed
- Rust (via [rustup](https://rustup.rs/))
- Zed installed

---

## 💡 Example Workflow

### Support Engineer Workflow

```
1. Receive case URL from customer
   ↓
2. Run "Scout: Download Case from URL"
   ↓
3. Enter URL
   ↓
4. Wait 10-30 seconds (auto-download + extract)
   ↓
5. Click case in tree view
   ↓
6. Case opens in workspace with all logs
   ↓
7. Click any log file to analyze
   ↓
8. View results in Results/Categories/Timeline views
   ↓
9. Export findings
```

### Multi-Case Investigation

```
1. Import 3 related cases
   ↓
2. Open all in workspace
   ↓
3. Run "Analyze All Case Logs" on each
   ↓
4. Results view shows ALL issues from ALL cases
   ↓
5. Use Timeline view to correlate events
   ↓
6. Identify common patterns
```

---

## 🎓 Supported Archive Formats

- ✅ **ZIP** (.zip) - Built-in support
- ✅ **TAR** (.tar)
- ✅ **GZIP** (.tar.gz, .tgz)
- ✅ **7-Zip** (.7z) - Requires 7-Zip installed

---

## 🔍 Where to Find Things

### In VS Code

**Activity Bar:**
- 🔍 **Scout Analyzer** - Main analysis views
- 📁 **Cases** - Case management (if added to package.json)

**Commands (Ctrl+Shift+P):**
- Type "Scout" to see all commands
- "Scout: Download Case from URL"
- "Scout: Import Case from Local File"
- "Scout: Show Cases List"

### File System

**Cases stored in:**
- `<workspace>/.log-scout-cases/` (workspace-specific)
- `~/.log-scout-cases/` (global, optional)

**Both editors can access the same cases!**

---

## 🆘 Troubleshooting

### "Build failed"

```bash
# Clean and rebuild
cd shared-core
rm -rf node_modules dist
npm install
npm run build

cd ../vscode-extension
rm -rf node_modules
npm install
npm run compile
```

### "Extension not showing"

1. Verify installation: `code --list-extensions | findstr log-scout`
2. Restart VS Code completely
3. Reinstall: `install-extension.bat`

### "No cases directory"

Cases directory is created automatically on first use. If missing:
```bash
mkdir .log-scout-cases
```

### "Archive won't extract"

- Verify archive is not corrupted
- For .7z files: Install 7-Zip
- For .tar.gz files: Ensure tar is available
- Check disk space

---

## 📚 Full Documentation

| Document | Purpose |
|----------|---------|
| `BUILD_AND_INSTALL.md` | Complete build/install guide |
| `CASE_MANAGEMENT_COMPLETE.md` | Full overview |
| `SHARED_CORE_SETUP.md` | Shared core integration |
| `vscode-extension/CASE_MANAGEMENT_GUIDE.md` | User guide (582 lines) |
| `vscode-extension/CASE_MANAGEMENT_INTEGRATION.md` | Developer guide (977 lines) |
| `shared-core/README.md` | API reference |

---

## 🎯 Next Steps

1. ✅ Run `build-all.bat`
2. ✅ Restart your editor
3. ✅ Try downloading a case
4. ✅ Explore the Cases view
5. ✅ Read full documentation for advanced features

---

## 💻 Build Scripts Available

```bash
build-all.bat              # Build everything + install both editors
install-extension.bat      # Quick VS Code reinstall
install-zed-extension.bat  # Build and install Zed
```

---

## 🌟 Key Features Recap

### For Users
- One-click download and organization
- Visual status tracking
- Batch operations
- Workspace integration
- Cross-editor compatibility

### For Developers
- Shared core module (platform-agnostic)
- Clean adapter pattern
- Full TypeScript types
- Event system
- Extensible design

---

## ✨ Summary

**You now have a complete case management system that:**

1. Downloads case archives from URLs
2. Imports local archive files
3. Automatically extracts and organizes
4. Discovers all log files recursively
5. Provides rich UI with tree views
6. Works across VS Code and Zed
7. Shares storage between editors

**Get started now:**
```bash
build-all.bat
# Restart editor
# Try: Scout: Download Case from URL
```

---

**Happy Case Analyzing!** 🔍📁✨