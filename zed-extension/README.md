# Log Scout Analyzer - Zed Extension

Best-effort parity with the VS Code extension using the shared LSP server.

## 🚀 Quick Start - Build Automation

This extension now has a **complete, automated build system** similar to the VSCode extension.

### One-Command Deployment

```bash
npm run deploy
```

Then restart Zed. Done! 🎉

### Common Commands

```bash
npm run status          # Check current versions and status
npm run help            # Show all available commands
npm run dry-run         # Preview deployment without changes
npm run deploy          # Full deployment (recommended)
npm run package         # Create distribution packages
npm run clean           # Remove build artifacts
npm run test:scripts    # Test the automation system
```

### Prerequisites

- Node.js v16+ 
- Rust/Cargo
- wasm32-wasip1 target: `rustup target add wasm32-wasip1`
- Zed editor

### Documentation

The `zed-extension/` directory contains comprehensive documentation:

- **QUICK_START_BUILD.md** - Quick reference guide
- **SCRIPTS_README.md** - Technical documentation
- **BUILD_AUTOMATION_COMPLETE.md** - Feature summary
- **DEPLOYMENT_WORKFLOW.md** - Visual workflow diagrams
- **BUILD_AUTOMATION_INDEX.md** - Master index

For more details, run: `npm run help`

---

## What Works Now

- LSP-based diagnostics from the shared server.
- Hover data (as provided by the LSP server).
- Bundled LSP server binary lookup.

## UI Parity Notes

Zed does not expose VS Code-style webviews/panels in this repo. That means:
- Tree views, dashboards, and timeline panels are not available.
- The extension focuses on diagnostics + hover + LSP metadata.

If Zed adds panel/webview APIs later, we can map the VS Code UI to them.

## LSP Server Lookup Order

1. LOG_SCOUT_LSP_PATH (explicit override)
2. ZED_EXTENSION_DIR/bin/<platform-binary>
3. log-scout-lsp-server on PATH

Platform binary names:
- Windows: log-scout-lsp-server-win.exe
- macOS: log-scout-lsp-server-mac
- Linux: log-scout-lsp-server-linux

## Bundling the LSP Server

The package script bundles the LSP server binary into the extension.
You must build the LSP server first:

```bash
cd ../lsp-server
cargo build --release
```

Then package the Zed extension:

```bash
cd ../zed-extension
bash package.sh
```

## Manual Override

If you want to point to a custom LSP binary:

```bash
export LOG_SCOUT_LSP_PATH=/path/to/log-scout-lsp-server
```

## Troubleshooting

- If diagnostics do not appear, verify the LSP binary is present in bin/.
- Run verify-extension.sh to confirm installation.
- For build automation issues: `npm run test:scripts`
- For version mismatches: `npm run update:versions`
- For clean rebuild: `npm run clean && npm run deploy`

## Build Automation Features

The new build automation system provides:

- ✅ One-command deployment
- ✅ Automatic version management
- ✅ WASM extension building
- ✅ LSP server building
- ✅ Distribution package creation (.tar.gz, .zip)
- ✅ Automated installation to Zed
- ✅ Status monitoring and reporting
- ✅ Dry-run preview
- ✅ Comprehensive documentation
- ✅ Windows batch file (DEPLOY.bat)

See the documentation files for complete details.
