# Log Scout Analyzer

[![Pattern Quality CI](https://github.com/bdb-tasks/log_scout_analyzer/workflows/Pattern%20Quality%20CI/badge.svg)](https://github.com/bdb-tasks/log_scout_analyzer/actions/workflows/ci.yml)
[![Advanced Pipeline](https://github.com/bdb-tasks/log_scout_analyzer/workflows/Advanced%20Pipeline/badge.svg)](https://github.com/bdb-tasks/log_scout_analyzer/actions/workflows/advanced.yml)

**Powerful log analysis for Cisco UC engineers.** Import RTMT bundles, find issues automatically, export results. Built with Rust LSP + VS Code.

---

## 🎯 What Can You Do?

### 1. Import & Analyze RTMT Bundles (2 minutes)
- Drag & drop QCSONE package
- Automatic case ID detection
- 1000+ pattern matching
- Issues in Problems Panel

### 2. Multi-File Investigation (5 minutes)
- Analyze 100+ files simultaneously
- Cross-file correlation
- Timeline visualization
- Click to navigate

### 3. Export Results (1 minute)
- Markdown reports
- JSON/CSV formats
- Share with team/TAC
- Annotated excerpts

### 4. SIP Call Flow Analysis (5 minutes)
- Parse CTRACE logs
- Ladder diagrams
- Call state tracking
- Timing analysis

**See all 12 scenarios:** [USER_SCENARIOS.md](USER_SCENARIOS.md)

---

## 🚀 Quick Start

### Install (VS Code)

**Option 1: From VSIX**
```bash
code --install-extension log-scout-analyzer.vsix
```

**Option 2: Build from Source**
```bash
# Build everything
npm run build:all

# Package extension
cd vscode-extension
npm run package

# Install
code --install-extension log-scout-analyzer-*.vsix
```

### First Use (30 seconds)

1. **Open VS Code** → See Log Scout icon (📦) in activity bar
2. **Click "Import Package"** → Select your RTMT zip file
3. **Wait 30 seconds** → Bundle imports and analyzes automatically
4. **View Issues** → Open Problems Panel (Ctrl+Shift+M)
5. **Click Issue** → Jump to log line with context

**Done!** You just analyzed 100+ files in 30 seconds. 🎉

---

## 💡 Why Log Scout?

### Before (Manual Analysis)
- ❌ 100+ files to search manually
- ❌ Complex grep/sed commands
- ❌ 2-4 hours per case
- ❌ Easy to miss patterns

### After (With Log Scout)
- ✅ One-click import
- ✅ Automatic pattern detection
- ✅ 5 minutes to root cause
- ✅ 1000+ patterns checked

**Time Saved:** 95% faster than manual analysis

---

## 🎭 User Persona

**Meet Sarah**, Senior UC Engineer:
- Troubleshoots CUCM, Jabber, WebEx issues
- Downloads QCSONE packages from RTMT
- Needs to correlate events across 100+ files
- Escalates findings to TAC

**Sarah's workflow with Log Scout:**
1. Import QCSONE → 30 seconds
2. Review Issues → 3 minutes
3. Identify root cause → 2 minutes
4. Export report → 1 minute
5. **Total: 5 minutes** (was 2-4 hours!)

---

## 📋 Features by Scenario

### 🔴 Critical Features (Must Have)

| Feature | Status | Time | Benefit |
|---------|--------|------|---------|
| **Import RTMT Bundle** | ✅ | 30s | Auto-extract, organize, analyze |
| **View Issues in Problems Panel** | ✅ | Instant | See all errors/warnings/info |
| **Click to Navigate** | ✅ | Instant | Jump to exact log line |
| **Export Results** | ✅ | 1 min | Markdown/JSON/CSV reports |
| **Error Recovery** | ✅ | Auto | Graceful handling + recovery |

### 🟡 Important Features (High Value)

| Feature | Status | Time | Benefit |
|---------|--------|------|---------|
| **SIP Call Flow** | ✅ | 5 min | Ladder diagrams, state tracking |
| **Multi-Bundle Case** | ✅ | Auto | Group logs by case ID |
| **Large Bundle (100+ files)** | ✅ | 2 min | Non-blocking, streaming |
| **Pattern Filtering** | 🚧 | N/A | Filter by severity, category |

### 🟢 Planned Features

| Feature | Status | Target | Benefit |
|---------|--------|--------|---------|
| **Pattern Override UI** | 📋 | Q2 2025 | Customize severities |
| **Keyboard Shortcuts** | 🚧 | Q2 2025 | Power user navigation |
| **Dark Theme** | 🚧 | Q3 2025 | Better accessibility |

**See details:** [USER_SCENARIOS.md](USER_SCENARIOS.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   VS Code Extension (UI)        │  ← User scenarios implemented here
│   - Bundle Explorer             │     (TypeScript, ~1000 lines)
│   - Problems Panel integration  │
│   - Command Palette commands    │
└────────────┬────────────────────┘
             │ JSON-RPC (LSP)
             │
┌────────────▼────────────────────┐
│   LSP Server (Analysis)         │  ← Pattern engine, log parsing
│   - 1000+ patterns from TagScout│     (Rust, high performance)
│   - Multi-format log parsing    │
│   - Call flow analysis          │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   Feature Crates                │  ← Modular capabilities
│   - pattern-engine              │     (Rust workspace)
│   - pattern-loader              │
│   - quality-system              │
└─────────────────────────────────┘
```

**Key Design:**
- **LSP-based** - Works with any editor (VS Code, Zed, Vim, Emacs)
- **Rust engine** - Fast, safe, efficient
- **TypeScript UI** - Rich VS Code integration
- **User-focused** - Scenarios drive development

---

## 📚 Documentation

### For Users
- **[📖 Start Here](📖_START_HERE.md)** - Navigation guide
- **[User Scenarios](USER_SCENARIOS.md)** - What you can accomplish
- **[Problems Panel Guide](docs/USER_GUIDE_PROBLEMS_PANEL.md)** - How to use results

### For Developers
- **[Project Status](PROJECT_STATUS.md)** - Current state, test coverage
- **[Contributing](docs/guides/CONTRIBUTING.md)** - How to contribute
- **[Architecture](docs/architecture/ARCHITECTURE.md)** - System design
- **[AI Assistant Guide](.zed/AI_ASSISTANT_GUIDE.md)** - Development workflows

### For QA
- **[E2E Test Scenarios](E2E_TEST_SCENARIOS.md)** - Detailed test specs
- **[Test Audit](E2E_TEST_AUDIT_USER_PERSPECTIVE.md)** - Testing gaps
- **[Scenario Details](docs/user-scenarios/)** - Step-by-step tests

### Quick Links
```
📖 Start Here          → 📖_START_HERE.md
🎯 User Scenarios      → USER_SCENARIOS.md
📊 Project Status      → PROJECT_STATUS.md
🧪 E2E Tests           → E2E_TEST_SCENARIOS.md
🏗️ Architecture        → docs/architecture/ARCHITECTURE.md
🤝 Contributing        → docs/guides/CONTRIBUTING.md
```

---

## 🛠️ Build & Development

### Prerequisites
- **Rust** 1.75+ (`rustup`)
- **Node.js** 18+ (`nvm` or `volta`)
- **VS Code** (for extension development)

### Build Everything
```bash
# Install dependencies
npm install

# Build LSP server + extension
npm run build:all

# Run in debug mode
cd vscode-extension
npm run watch    # Terminal 1: Auto-rebuild
F5               # Terminal 2: Launch Extension Host
```

### Run Tests
```bash
# Extension tests
cd vscode-extension
npm test

# LSP server tests
cd lsp-server
cargo test

# All tests
npm run test:all
```

### Package Extension
```bash
# Increment version and package
npm run version:patch
npm run package

# Result: vscode-extension/log-scout-analyzer-*.vsix
```

---

## 🎨 Demo / Screenshots

### Import RTMT Bundle
```
1. Click "Import Package" button
2. Select QCSONE zip file
3. Wait 30 seconds for analysis
4. View issues in Problems Panel
```

*(Screenshots to be added - see [docs/user-scenarios/SCENARIO_01_IMPORT_AND_ANALYZE.md](docs/user-scenarios/SCENARIO_01_IMPORT_AND_ANALYZE.md) for detailed walkthrough)*

### SIP Call Flow Analysis
```
1. Open CTRACE log file
2. Right-click → "Analyze Call Flow"
3. See ladder diagram in Markdown
4. Export to file or clipboard
```

*(Video walkthrough coming soon)*

---

## 🐛 Troubleshooting

### Extension Not Loading
```bash
# Check extension installed
code --list-extensions | grep log-scout

# Check LSP server binary
ls vscode-extension/bin/log-scout-lsp-*.exe

# View logs
VS Code → Output → Log Scout Analyzer
```

### Import Fails
- **Check:** File is valid zip/tar/tar.gz
- **Try:** Smaller test file first
- **View:** Output panel for detailed errors

### No Issues Shown
- **Check:** File extension is recognized (.log, .txt, etc.)
- **Try:** Reload window (Ctrl+Shift+P → "Reload Window")
- **Verify:** Problems Panel is open (Ctrl+Shift+M)

**More help:** [docs/USER_GUIDE_PROBLEMS_PANEL.md](docs/USER_GUIDE_PROBLEMS_PANEL.md)

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Quick Start for Contributors
```bash
# 1. Clone repo
git clone https://github.com/yourusername/log_scout_analyzer.git
cd log_scout_analyzer

# 2. Read documentation
cat USER_SCENARIOS.md          # Understand user needs
cat PROJECT_STATUS.md           # Check current status
cat docs/guides/CONTRIBUTING.md # Contribution guidelines

# 3. Pick a task
# - Implement E2E test for Scenario 1
# - Document Scenario 2-5
# - Add pattern filtering UI
# - Improve error messages

# 4. Make changes and test
npm run build:all
npm test

# 5. Submit PR
git checkout -b feature/my-improvement
git commit -am "feat: my improvement"
git push origin feature/my-improvement
```

### Areas to Contribute
- 🧪 **E2E Tests** - Automate user workflows (high priority!)
- 📖 **Documentation** - Complete scenario walkthroughs
- 🎨 **UI/UX** - Improve user experience
- 🐛 **Bug Fixes** - Fix reported issues
- ✨ **Features** - Implement planned scenarios

**See:** [docs/guides/CONTRIBUTING.md](docs/guides/CONTRIBUTING.md)

---

## 📊 Project Status

**Current Version:** 0.0.200+

**Implementation Status:**
- ✅ Critical scenarios: 4/5 complete (80%)
- ✅ Important scenarios: 4/4 complete (100%)
- 🚧 Future scenarios: 0/3 started (0%)

**Test Coverage:**
- ✅ Component tests: 45% (300+ tests passing)
- ❌ E2E user tests: 0% (critical gap!)

**Next Sprint Goals:**
1. Automate E2E test for Scenario 1
2. Document Scenarios 2-5
3. Complete workspace persistence
4. Add pattern filtering UI

**See details:** [PROJECT_STATUS.md](PROJECT_STATUS.md)

---

## 🎯 Roadmap

### Current (v0.1.x)
- ✅ Import & analyze RTMT bundles
- ✅ Multi-file investigation
- ✅ Export results (Markdown/JSON/CSV)
- ✅ SIP call flow analysis
- 🚧 E2E test automation

### Next Release (v0.2.x)
- [ ] Pattern override UI
- [ ] Enhanced filtering
- [ ] Keyboard shortcuts
- [ ] Workspace persistence improvements

### Future (v1.0+)
- [ ] Real-time log streaming
- [ ] Team collaboration features
- [ ] Cloud storage integration
- [ ] Advanced analytics

**See full roadmap:** [ROADMAP.md](ROADMAP.md)

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [tower-lsp](https://github.com/ebkalderon/tower-lsp)
- Pattern engine based on production UC troubleshooting experience
- Inspired by rust-analyzer and other LSP servers
- Thanks to all contributors and testers!

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/yourusername/log_scout_analyzer/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/log_scout_analyzer/discussions)
- **Documentation:** Start with [📖_START_HERE.md](📖_START_HERE.md)

---

## ⭐ Star History

If Log Scout saves you time, give us a star! ⭐

---

**Built with ❤️ for Cisco UCAPPS TAC  engineers**

*Reduce log analysis time from hours to minutes.*

---

**Version:** 2.0 (User-Scenario Focused)  
**Last Updated:** 2025-02-24  
**Maintained By:** Engineering Team
