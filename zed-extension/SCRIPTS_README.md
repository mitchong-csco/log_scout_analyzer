# Build Automation Scripts - Technical Documentation

> **Comprehensive technical reference for the Zed extension build automation system**

## 📚 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Script Reference](#script-reference)
- [Version Management](#version-management)
- [Build Process](#build-process)
- [Package Creation](#package-creation)
- [Installation](#installation)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development Guide](#development-guide)

---

## Overview

The Log Scout Analyzer Zed extension uses a comprehensive Node.js-based build automation system that manages:

- **Version management** - Automatic version incrementing and synchronization
- **Build orchestration** - Coordinated building of WASM extension and LSP server
- **Package creation** - Distribution archives (.tar.gz and .zip)
- **Installation** - Automated installation to Zed editor
- **Status monitoring** - Real-time build status and diagnostics

### Design Principles

1. **Automation First** - Minimize manual intervention
2. **Cross-platform** - Works on Windows, macOS, and Linux
3. **Idempotent** - Safe to run multiple times
4. **Transparent** - Clear feedback at every step
5. **Recoverable** - Easy to clean and restart

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Build Automation System                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Version    │  │    Build     │  │   Package    │      │
│  │  Management  │→ │ Orchestration│→ │   Creation   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         ↓                  ↓                  ↓              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Installation & Distribution              │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
zed-extension/
├── package.json                    # npm scripts orchestration
├── increment-version.js            # Version increment logic
├── update-versions.js              # Version synchronization
├── generate-build-info.js          # Build metadata generation
├── show-status.js                  # Status reporting
├── help.js                         # Help system
├── dry-run.js                      # Deployment preview
├── clean.js                        # Cleanup utility
├── test-scripts.js                 # Script verification
├── package-extension.js            # Package creation
├── copy-package.js                 # Distribution copying
├── install-to-zed.js              # Zed installation
├── DEPLOY.bat                      # Windows batch deployment
└── [documentation files]           # README, guides, etc.
```

---

## Script Reference

### increment-version.js

**Purpose:** Increments patch version (third octet) in version files.

**Updates:**
- `zed-extension/Cargo.toml` - Extension version
- `zed-extension/extension.toml` - Extension manifest version
- `lsp-server/Cargo.toml` - LSP server version

**Algorithm:**
1. Read current versions from TOML files
2. Parse semantic version (x.y.z)
3. Increment patch number (z + 1)
4. Write back to files with proper formatting

**Usage:**
```bash
npm run version:increment
```

**Output:**
```
🔄 Incrementing versions...

📦 Zed Extension Version (Cargo.toml):
   Old: 0.0.3
   New: 0.0.4

📋 Zed Extension Manifest (extension.toml):
   Old: 0.0.3
   New: 0.0.4

🦀 LSP Server Version (Cargo.toml):
   Old: 0.1.11
   New: 0.1.12

✅ Version increment complete!
```

**Error Handling:**
- Invalid version format detection
- Missing file warnings
- Atomic updates (all or nothing)

---

### update-versions.js

**Purpose:** Ensures version consistency across all configuration files.

**Checks:**
- Cargo.toml version matches extension.toml
- package.json version is in sync (if exists)
- Reports any mismatches

**Synchronization:**
- Uses Cargo.toml as source of truth
- Updates extension.toml if mismatch detected
- Updates package.json to match

**Usage:**
```bash
npm run update:versions
```

**Output:**
```
📦 Updating version information...
   ✓ Extension (Cargo.toml): v0.0.4
   ✓ Extension (extension.toml): v0.0.4
   ✓ LSP Server: v0.1.12

✅ All extension versions are in sync
```

**Called by:** Every build command

---

### generate-build-info.js

**Purpose:** Generates Rust source file with build metadata.

**Creates:** `src/build_info.rs`

**Metadata Included:**
- Extension version
- LSP server version
- Build timestamp (ISO 8601)
- Build number (Unix timestamp)
- Git commit hash (short)
- Git branch name
- Git dirty status (uncommitted changes)

**Generated Code:**
```rust
pub mod build_info {
    pub const VERSION: &str = "0.0.4";
    pub const LSP_VERSION: &str = "0.1.12";
    pub const BUILD_TIMESTAMP: &str = "2024-01-15T10:30:00Z";
    pub const BUILD_NUMBER: u64 = 1705318200;
    pub const GIT_COMMIT: &str = "a1b2c3d";
    pub const GIT_BRANCH: &str = "main";
    pub const GIT_DIRTY: bool = false;
    
    pub fn get_build_info() -> String { ... }
    pub fn get_detailed_build_info() -> String { ... }
}
```

**Usage:**
```bash
node generate-build-info.js
```

**Integration:**
- Automatically updates `src/lib.rs` to include the module
- Includes unit tests
- Safe to regenerate multiple times

**Called by:** `npm run build`

---

### show-status.js

**Purpose:** Displays comprehensive status report without making changes.

**Reports:**
- Current versions (extension, LSP server, manifest)
- Version sync status
- Next versions (after increment)
- Last build information
- Build artifacts (WASM, LSP binary)
- Distribution packages status
- Zed installation status
- Git status (branch, commit, changes)
- Quick command reference

**Usage:**
```bash
npm run status
```

**Output Example:**
```
📊 Log Scout Analyzer (Zed) - Build Status

======================================================================

📦 CURRENT VERSIONS
----------------------------------------------------------------------
   Extension (Cargo.toml):    0.0.4
   Extension (extension.toml): 0.0.4
   LSP Server:                 0.1.12

   ✅ Extension versions are in sync

🔮 NEXT VERSIONS (after increment)
----------------------------------------------------------------------
   Extension:  0.0.5
   LSP Server: 0.1.13

🏗️  LAST BUILD INFO
----------------------------------------------------------------------
   Version:    0.0.4
   Build Date: 2024-01-15 10:30:00
   Time Ago:   2 hours ago
   Git:        main@a1b2c3d

🦀 WASM BINARY
----------------------------------------------------------------------
   File:     log_scout_analyzer.wasm
   Size:     1.85 MB
   Modified: 2024-01-15 10:30:15

[... more status information ...]

✨ Status check complete!
```

**Use Cases:**
- Pre-deployment checks
- Troubleshooting
- Quick reference

---

### help.js

**Purpose:** Interactive help system with command documentation.

**Displays:**
- All available commands grouped by category
- Command descriptions
- Estimated execution times
- Usage examples
- Quick workflows
- Documentation links

**Categories:**
1. Deployment Commands
2. Build Commands
3. Version Commands
4. Utility Commands
5. Development Commands

**Usage:**
```bash
npm run help
```

**Features:**
- Checks package.json for available scripts
- Marks unavailable commands
- Provides context-specific help
- Links to documentation

---

### dry-run.js

**Purpose:** Previews deployment without making any changes.

**Simulates:**
1. Version increment calculations
2. Build steps and outputs
3. Package creation
4. Installation paths
5. File operations

**Usage:**
```bash
npm run dry-run
```

**Output:**
```
🔍 Log Scout Analyzer (Zed) - Deployment Dry Run

======================================================================

This script shows what WOULD happen during deployment
WITHOUT actually making any changes.

======================================================================

📋 STEP 1: VERSION INCREMENT
----------------------------------------------------------------------
   Extension (Cargo.toml):    0.0.4 → 0.0.5
   Extension (extension.toml): 0.0.4 → 0.0.5
   LSP Server:                 0.1.12 → 0.1.13

   Files that would be modified:
   • zed-extension/Cargo.toml
   • zed-extension/extension.toml
   • lsp-server/Cargo.toml

[... more preview information ...]

✨ NO CHANGES WERE MADE

This was a dry run - nothing has been modified.
Your workspace is exactly as it was before.
```

**Use Cases:**
- Preview before deploying
- Verify version calculations
- Check installation paths
- Training and documentation

---

### clean.js

**Purpose:** Removes all build artifacts and temporary files.

**Removes:**
- `target/` - Rust build directory
- `dist/` - Distribution packages
- `src/build_info.rs` - Generated build info
- Downloads folder copies
- Keeps: source code, node_modules, configuration

**Usage:**
```bash
npm run clean
```

**Output:**
```
🧹 Log Scout Analyzer (Zed) - Cleanup Script

======================================================================

🦀 CLEANING RUST BUILD ARTIFACTS
----------------------------------------------------------------------
   ✅ Removed directory: target/ (Rust build output)

📦 CLEANING DISTRIBUTION PACKAGES
----------------------------------------------------------------------
   ✅ Removed directory: dist/ (package archives)

🏗️  CLEANING BUILD INFO
----------------------------------------------------------------------
   ✅ Removed file: src/build_info.rs

📊 CLEANUP SUMMARY
----------------------------------------------------------------------
   Items cleaned: 3
   Errors:        0

✅ Cleanup complete!
```

**Safe Operations:**
- Never removes source code
- Preserves node_modules
- Keeps configuration files
- Optional Zed installation cleanup

**Use Cases:**
- Stuck builds
- Disk space management
- Fresh rebuild
- Troubleshooting

---

### test-scripts.js

**Purpose:** Verifies all automation scripts are working correctly.

**Tests:**
1. Required files exist
2. Scripts are valid Node.js
3. Version consistency
4. npm scripts defined
5. Rust toolchain available
6. Build artifacts present
7. Directory structure correct
8. Script integration (chaining)
9. Zed installation paths

**Usage:**
```bash
npm run test:scripts
```

**Output:**
```
🧪 Testing Zed Extension Build Automation Scripts

======================================================================

1️⃣  CHECKING REQUIRED FILES
----------------------------------------------------------------------
✅ Cargo.toml exists
✅ extension.toml exists
✅ lsp-server/Cargo.toml exists

2️⃣  CHECKING BUILD SCRIPTS
----------------------------------------------------------------------
📜 Checking: increment-version.js
   ✅ Script is readable
   ✅ Uses require()
   ✅ Imports fs module
   ✅ Imports path module

[... more test results ...]

📊 TEST SUMMARY
----------------------------------------------------------------------
✅ All critical checks passed!

🚀 You can now run:
   npm run deploy    - Full deployment
   npm run package   - Create distribution packages
   npm run build:all - Build without packaging
```

**Exit Codes:**
- `0` - All tests passed
- `1` - Some tests failed

**Use Cases:**
- Verify system health
- Pre-deployment checks
- Troubleshooting
- CI/CD integration

---

### package-extension.js

**Purpose:** Creates distribution packages for sharing.

**Creates:**
1. Package directory structure
2. Copies all necessary files
3. Generates README with installation instructions
4. Creates install.sh script
5. Creates INSTALLATION.txt
6. Archives: .tar.gz and .zip

**Package Contents:**
```
log-scout-analyzer-zed-X.X.X/
├── log_scout_analyzer.wasm    # Extension binary
├── extension.toml             # Extension manifest
├── grammars/                  # Syntax highlighting
├── README.md                  # Full documentation
├── LICENSE                    # MIT License
└── install.sh                 # Installation script
```

**Usage:**
```bash
node package-extension.js
```

**Output:**
```
📦 Log Scout Analyzer (Zed) - Package Creator

======================================================================

📋 Extension version: 0.0.4

✅ WASM binary found (1.85 MB)

🗂️  Creating package directory structure...
   ✓ Created: dist/log-scout-analyzer-zed-0.0.4

📋 Copying extension files...
   ✓ log_scout_analyzer.wasm
   ✓ extension.toml
   ✓ grammars/ directory
   ✓ LICENSE

📝 Generating package README...
   ✓ README.md created

📜 Creating installation script...
   ✓ install.sh created

📄 Created INSTALLATION.txt

🗜️  Creating archives...
   ✓ log-scout-analyzer-zed-0.0.4.tar.gz (1.90 MB)
   ✓ log-scout-analyzer-zed-0.0.4.zip (1.88 MB)

✅ Packaging complete!
```

**Called by:** `npm run package`

---

### copy-package.js

**Purpose:** Copies distribution packages to Downloads folder.

**Copies:**
- .tar.gz archive
- .zip archive
- INSTALLATION.txt

**Destination:** `~/Downloads/zed-extensions/`

**Usage:**
```bash
npm run postpackage
```

**Called by:** `npm run package` (via postpackage hook)

---

### install-to-zed.js

**Purpose:** Installs extension to Zed editor's extensions directory.

**Process:**
1. Determines OS-specific Zed extensions path
2. Verifies WASM binary exists
3. Creates installation directory
4. Copies all necessary files
5. Verifies installation

**Paths:**
- **Windows:** `%USERPROFILE%\.config\zed\extensions\log-scout-analyzer`
- **macOS:** `~/Library/Application Support/Zed/extensions/log-scout-analyzer`
- **Linux:** `~/.config/zed/extensions/log-scout-analyzer`

**Usage:**
```bash
npm run install:zed
```

**Output:**
```
🎯 Installing Log Scout Analyzer to Zed...

======================================================================

📋 Platform: win32
📂 Target directory: C:\Users\...\zed\extensions\log-scout-analyzer

✅ WASM binary found (1.85 MB)
✅ extension.toml found

📁 Creating installation directory...
   ✓ C:\Users\...\zed\extensions\log-scout-analyzer

📦 Installing extension files...
   ✓ log_scout_analyzer.wasm
   ✓ extension.toml
   ✓ grammars/ directory
   ✓ README.md
   ✓ LICENSE

🔍 Verifying installation...
   ✅ log_scout_analyzer.wasm (1.85 MB)
   ✅ extension.toml (0.00 MB)

📊 Installation Summary
----------------------------------------------------------------------
   Version:  0.0.4
   Location: C:\Users\...\zed\extensions\log-scout-analyzer
   Platform: win32

✅ Installation successful!

📋 Next Steps:
   1. Restart Zed editor completely (quit and relaunch)
   2. Open Zed
   3. Press Ctrl+Shift+P (or Cmd+Shift+P on macOS)
   4. Type 'Extensions' to open the Extensions panel
   5. Look for 'Log Scout Analyzer' in the installed list
   6. Open a .log file to test the extension
```

**Called by:** `npm run deploy`

---

## Version Management

### Semantic Versioning

The system uses semantic versioning (x.y.z):
- **Major (x):** Breaking changes
- **Minor (y):** New features (backward compatible)
- **Patch (z):** Bug fixes (automatically incremented)

### Version Files

| File | Purpose | Format |
|------|---------|--------|
| `Cargo.toml` | Extension version (source of truth) | `version = "0.0.4"` |
| `extension.toml` | Zed manifest version | `version = "0.0.4"` |
| `lsp-server/Cargo.toml` | LSP server version | `version = "0.1.12"` |
| `package.json` | npm package version | `"version": "0.0.4"` |

### Synchronization Strategy

1. **Cargo.toml** is the source of truth for extension version
2. **extension.toml** must match Cargo.toml
3. **package.json** is synchronized automatically
4. **LSP server** has independent versioning

### Manual Version Changes

To manually change versions:

```bash
# 1. Edit version in Cargo.toml
# 2. Sync all files
npm run update:versions

# 3. Verify
npm run status
```

---

## Build Process

### Build Pipeline

```
┌─────────────────┐
│ update:versions │  Sync version numbers
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ generate-build- │  Create build_info.rs
│      info       │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  cargo build    │  Build WASM extension
│   --release     │  Target: wasm32-wasip1
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ WASM Binary     │  log_scout_analyzer.wasm
│   (~1-3 MB)     │
└─────────────────┘
```

### Build Targets

**WASM Extension:**
```bash
cargo build --release --target wasm32-wasip1
```

**LSP Server:**
```bash
cd ../lsp-server
cargo build --release --bin log-scout-lsp-server
```

### Optimization

**Cargo.toml profile:**
```toml
[profile.release]
opt-level = "z"    # Optimize for size
lto = true         # Link-time optimization
codegen-units = 1  # Better optimization
strip = true       # Remove debug symbols
```

### Build Times

| Target | First Build | Incremental |
|--------|-------------|-------------|
| WASM Extension | 1-2 minutes | 10-30 seconds |
| LSP Server | 30-60 seconds | 5-15 seconds |
| Full Build | 2-3 minutes | 15-45 seconds |

---

## Package Creation

### Package Structure

```
log-scout-analyzer-zed-0.0.4/
├── log_scout_analyzer.wasm    # 1-3 MB
├── extension.toml             # < 1 KB
├── grammars/                  # Syntax definitions
│   └── log.json
├── README.md                  # Full documentation
├── LICENSE                    # MIT License
└── install.sh                 # Installation script
```

### Archives Created

1. **tar.gz** - Unix/Linux friendly
2. **zip** - Windows friendly
3. **INSTALLATION.txt** - Quick reference

### Distribution Locations

| Location | Purpose |
|----------|---------|
| `dist/` | Primary package location |
| `~/Downloads/zed-extensions/` | Easy sharing |

---

## Installation

### Automatic Installation

```bash
npm run install:zed
```

Handles:
- OS detection
- Path resolution
- Directory creation
- File copying
- Verification

### Manual Installation

1. Extract package
2. Copy folder to Zed extensions directory
3. Rename to `log-scout-analyzer`
4. Restart Zed

### Verification

After installation:

```bash
# Check status
npm run status

# In Zed:
# 1. Press Ctrl+Shift+P
# 2. Type "Extensions"
# 3. Look for "Log Scout Analyzer"
```

---

## Configuration

### package.json Scripts

All commands are defined in `package.json`:

```json
{
  "scripts": {
    "deploy": "npm run package && npm run install:zed",
    "package": "npm run version:increment && npm run build:all && node package-extension.js",
    "build": "npm run update:versions && node generate-build-info.js && cargo build --release --target wasm32-wasip1",
    "build:lsp": "cd ../lsp-server && cargo build --release --bin log-scout-lsp-server",
    "build:all": "npm run build:lsp && npm run build",
    "version:increment": "node increment-version.js",
    "update:versions": "node update-versions.js",
    "status": "node show-status.js",
    "help": "node help.js",
    "dry-run": "node dry-run.js",
    "clean": "node clean.js",
    "test:scripts": "node test-scripts.js",
    "postpackage": "node copy-package.js",
    "install:zed": "node install-to-zed.js"
  }
}
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `USERPROFILE` | Windows user directory | Current user |
| `HOME` | Unix home directory | Current user |

---

## Troubleshooting

### Common Issues

#### 1. "cargo: command not found"

**Cause:** Rust not installed or not in PATH

**Solution:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
# Verify
cargo --version
```

#### 2. "WASM target not found"

**Cause:** wasm32-wasip1 target not installed

**Solution:**
```bash
rustup target add wasm32-wasip1
```

#### 3. "WASM binary not found"

**Cause:** Build hasn't run or failed

**Solution:**
```bash
# Check status
npm run status

# Rebuild
npm run build

# Check for errors in output
```

#### 4. "Extension not loading in Zed"

**Causes:**
- Zed not restarted
- Files in wrong location
- Corrupted build

**Solution:**
```bash
# 1. Verify installation
npm run status

# 2. Clean and rebuild
npm run clean
npm run deploy

# 3. Restart Zed completely

# 4. Check Zed console (Ctrl+Shift+I)
```

#### 5. "Version mismatch"

**Cause:** Versions out of sync

**Solution:**
```bash
npm run update:versions
npm run status
```

#### 6. "Build takes too long"

**First build:**
- Normal: 2-3 minutes (downloads dependencies)

**Subsequent builds:**
- Should be faster: 30-60 seconds

**Solution:**
```bash
# If stuck, clean and rebuild
npm run clean
cargo clean
npm run build
```

### Debug Mode

Enable verbose output:

```bash
# Rust builds
RUST_BACKTRACE=1 npm run build

# Node scripts
NODE_DEBUG=* npm run status
```

### Log Files

Check build output:

```bash
# Redirect to file
npm run build > build.log 2>&1

# Review
cat build.log
```

---

## Development Guide

### Adding New Scripts

1. **Create script file:**
```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Your script logic here
```

2. **Add to package.json:**
```json
{
  "scripts": {
    "new:command": "node new-script.js"
  }
}
```

3. **Update documentation:**
- Add to help.js
- Add to SCRIPTS_README.md
- Add to QUICK_START_BUILD.md

### Script Best Practices

1. **Use clear output:**
   - Emoji for visual scanning
   - Structured formatting
   - Progress indicators

2. **Error handling:**
   - Try-catch blocks
   - Meaningful error messages
   - Exit codes (0 = success, 1 = failure)

3. **Idempotency:**
   - Safe to run multiple times
   - Check before creating
   - Clean up on failure

4. **Cross-platform:**
   - Use path.join() not string concatenation
   - Handle different line endings
   - Check platform: `process.platform`

### Testing Scripts

```bash
# Test individual script
node increment-version.js

# Test all scripts
npm run test:scripts

# Dry run (no changes)
npm run dry-run
```

### Extending the System

**Add new build target:**

1. Update `build` script in package.json
2. Add status check in show-status.js
3. Add to dry-run.js preview
4. Update documentation

**Add new package format:**

1. Update package-extension.js
2. Add to copy-package.js
3. Update INSTALLATION.txt template

---

## Reference

### Command Cheat Sheet

```bash
# Quick deployment
npm run deploy

# Just build
npm run build:all

# Check status
npm run status

# Get help
npm run help

# Preview changes
npm run dry-run

# Clean everything
npm run clean

# Test system
npm run test:scripts

# Create packages only
npm run package

# Install to Zed only
npm run install:zed
```

### File Locations

| Item | Path |
|------|------|
| Extension source | `zed-extension/src/` |
| WASM binary | `zed-extension/target/wasm32-wasip1/release/` |
| Distribution | `zed-extension/dist/` |
| Zed installation | OS-specific (see Installation section) |
| Downloads copy | `~/Downloads/zed-extensions/` |

### Documentation Files

- **QUICK_START_BUILD.md** - Quick reference guide
- **SCRIPTS_README.md** - This file (technical details)
- **BUILD_AUTOMATION_COMPLETE.md** - Feature summary
- **DEPLOYMENT_WORKFLOW.md** - Visual workflows
- **BUILD_AUTOMATION_INDEX.md** - Master index

---

**For more help, run:** `npm run help`

**For quick start, see:** [QUICK_START_BUILD.md](QUICK_START_BUILD.md)

**For master index, see:** [BUILD_AUTOMATION_INDEX.md](BUILD_AUTOMATION_INDEX.md)