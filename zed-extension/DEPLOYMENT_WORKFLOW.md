# Deployment Workflow - Visual Guide

> **Visual workflow diagrams and step-by-step guides for the Zed extension build automation system**

---

## 📊 Table of Contents

- [Overview](#overview)
- [Deployment Workflows](#deployment-workflows)
- [Build Process Flow](#build-process-flow)
- [Version Management Flow](#version-management-flow)
- [Package Creation Flow](#package-creation-flow)
- [Installation Flow](#installation-flow)
- [Decision Trees](#decision-trees)
- [Troubleshooting Flow](#troubleshooting-flow)

---

## Overview

This document provides visual representations of the build automation workflows to help you understand how the system works and how to use it effectively.

---

## Deployment Workflows

### Standard Deployment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   STANDARD DEPLOYMENT                        │
└─────────────────────────────────────────────────────────────┘

START
  │
  ├─► Step 1: Check Status
  │   └─► Command: npm run status
  │       └─► Output: Current versions, build status, git info
  │
  ├─► Step 2: Deploy Everything
  │   └─► Command: npm run deploy
  │       │
  │       ├─► Increment versions
  │       ├─► Build WASM extension
  │       ├─► Build LSP server
  │       ├─► Create packages
  │       └─► Install to Zed
  │
  └─► Step 3: Restart Zed
      └─► Quit and relaunch Zed editor

END (Extension active in Zed)

Time: ~2-3 minutes
Automation: Fully automated
```

---

### Safe Deployment Workflow (with Preview)

```
┌─────────────────────────────────────────────────────────────┐
│                 SAFE DEPLOYMENT (PREVIEW)                    │
└─────────────────────────────────────────────────────────────┘

START
  │
  ├─► Step 1: Check Status
  │   └─► Command: npm run status
  │       └─► Review: Versions, artifacts, git status
  │
  ├─► Step 2: Preview Changes
  │   └─► Command: npm run dry-run
  │       └─► Review: What will change (NO actual changes)
  │           ├─► Version increments preview
  │           ├─► Build steps preview
  │           ├─► Package creation preview
  │           └─► Installation paths preview
  │
  ├─► Decision Point: Proceed?
  │   ├─► NO  → STOP (no changes made)
  │   └─► YES → Continue
  │
  ├─► Step 3: Deploy
  │   └─► Command: npm run deploy
  │       └─► (See Standard Deployment)
  │
  └─► Step 4: Restart Zed

END (Extension active in Zed)

Time: ~2-3 minutes + review time
Automation: Semi-automated (requires approval)
```

---

### Clean Rebuild Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     CLEAN REBUILD                            │
└─────────────────────────────────────────────────────────────┘

START
  │
  ├─► Step 1: Clean Artifacts
  │   └─► Command: npm run clean
  │       └─► Removes:
  │           ├─► target/ (Rust build artifacts)
  │           ├─► dist/ (distribution packages)
  │           ├─► src/build_info.rs (generated file)
  │           └─► Downloads folder copies
  │
  ├─► Step 2: Fresh Build
  │   └─► Command: npm run deploy
  │       └─► (Full deployment from scratch)
  │
  └─► Step 3: Restart Zed

END (Fresh extension installation)

Time: ~3-4 minutes (full rebuild)
Use When: Stuck builds, disk cleanup, troubleshooting
```

---

## Build Process Flow

### Complete Build Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD PIPELINE                            │
└─────────────────────────────────────────────────────────────┘

npm run deploy
    │
    ├─► npm run package
    │       │
    │       ├─► npm run version:increment
    │       │   └─► increment-version.js
    │       │       ├─► Read current versions
    │       │       ├─► Increment patch (+1)
    │       │       └─► Write new versions
    │       │           ├─► Cargo.toml
    │       │           ├─► extension.toml
    │       │           └─► lsp-server/Cargo.toml
    │       │
    │       ├─► npm run build:all
    │       │   │
    │       │   ├─► npm run build:lsp
    │       │   │   └─► cargo build --release
    │       │   │       (LSP server binary)
    │       │   │
    │       │   └─► npm run build
    │       │       ├─► npm run update:versions
    │       │       │   └─► Sync all version files
    │       │       │
    │       │       ├─► generate-build-info.js
    │       │       │   └─► Create src/build_info.rs
    │       │       │
    │       │       └─► cargo build --release --target wasm32-wasip1
    │       │           (WASM extension)
    │       │
    │       ├─► package-extension.js
    │       │   ├─► Create package directory
    │       │   ├─► Copy files
    │       │   ├─► Generate README
    │       │   ├─► Create install.sh
    │       │   └─► Create archives (.tar.gz, .zip)
    │       │
    │       └─► npm run postpackage
    │           └─► copy-package.js
    │               └─► Copy to Downloads folder
    │
    └─► npm run install:zed
        └─► install-to-zed.js
            ├─► Detect OS
            ├─► Create extension directory
            ├─► Copy files to Zed
            └─► Verify installation

END (Extension ready in Zed)
```

---

### Parallel vs Sequential Builds

```
┌─────────────────────────────────────────────────────────────┐
│               BUILD DEPENDENCIES                             │
└─────────────────────────────────────────────────────────────┘

                    npm run build:all
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    npm run build:lsp           npm run build
     (LSP Server)              (WASM Extension)
              │                         │
              │    ┌────────────────────┤
              │    │                    │
              │    ▼                    ▼
              │  update:versions    generate-build-info
              │                         │
              └─────────────────────────┴───────►
                                        │
                                        ▼
                              Both complete, ready for package

SEQUENTIAL: update:versions → generate-build-info → cargo build
PARALLEL:   build:lsp and build can run independently
```

---

## Version Management Flow

### Version Increment Process

```
┌─────────────────────────────────────────────────────────────┐
│                VERSION INCREMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

npm run version:increment
    │
    ├─► Read Cargo.toml
    │   └─► Current: 0.0.3
    │       Parse: [0, 0, 3]
    │       Increment: [0, 0, 4]
    │
    ├─► Write Cargo.toml
    │   └─► version = "0.0.4"
    │
    ├─► Read extension.toml
    │   └─► Current: 0.0.3
    │
    ├─► Write extension.toml
    │   └─► version = "0.0.4"
    │
    ├─► Read lsp-server/Cargo.toml
    │   └─► Current: 0.1.11
    │       Parse: [0, 1, 11]
    │       Increment: [0, 1, 12]
    │
    └─► Write lsp-server/Cargo.toml
        └─► version = "0.1.12"

Result:
  ✓ Extension: 0.0.3 → 0.0.4
  ✓ LSP Server: 0.1.11 → 0.1.12
```

---

### Version Synchronization

```
┌─────────────────────────────────────────────────────────────┐
│              VERSION SYNCHRONIZATION                         │
└─────────────────────────────────────────────────────────────┘

npm run update:versions
    │
    ├─► Read Cargo.toml (SOURCE OF TRUTH)
    │   └─► Extension version: 0.0.4
    │
    ├─► Read extension.toml
    │   └─► Version: 0.0.3 (MISMATCH!)
    │
    ├─► Sync extension.toml
    │   └─► Update to: 0.0.4 ✓
    │
    ├─► Read package.json (if exists)
    │   └─► Version: 0.0.3 (MISMATCH!)
    │
    └─► Sync package.json
        └─► Update to: 0.0.4 ✓

Result:
  ✓ All files synced to Cargo.toml version
  ✓ Cargo.toml:     0.0.4
  ✓ extension.toml: 0.0.4
  ✓ package.json:   0.0.4
```

---

## Package Creation Flow

### Distribution Package Process

```
┌─────────────────────────────────────────────────────────────┐
│              PACKAGE CREATION FLOW                           │
└─────────────────────────────────────────────────────────────┘

node package-extension.js
    │
    ├─► Step 1: Verify WASM Binary
    │   └─► target/wasm32-wasip1/release/log_scout_analyzer.wasm
    │       ├─► Exists? → Continue
    │       └─► Missing? → ERROR (run build first)
    │
    ├─► Step 2: Create Package Directory
    │   └─► dist/log-scout-analyzer-zed-0.0.4/
    │
    ├─► Step 3: Copy Files
    │   ├─► log_scout_analyzer.wasm
    │   ├─► extension.toml
    │   ├─► grammars/
    │   └─► LICENSE
    │
    ├─► Step 4: Generate README.md
    │   ├─► Version info
    │   ├─► Build date/git info
    │   ├─► Installation instructions
    │   ├─► Feature list
    │   └─► Troubleshooting
    │
    ├─► Step 5: Create install.sh
    │   └─► Automated installation script
    │
    ├─► Step 6: Create INSTALLATION.txt
    │   └─► Quick reference guide
    │
    ├─► Step 7: Create Archives
    │   ├─► tar -czf log-scout-analyzer-zed-0.0.4.tar.gz
    │   └─► zip log-scout-analyzer-zed-0.0.4.zip
    │
    └─► Result
        └─► dist/
            ├─── log-scout-analyzer-zed-0.0.4/
            ├─── log-scout-analyzer-zed-0.0.4.tar.gz
            ├─── log-scout-analyzer-zed-0.0.4.zip
            └─── INSTALLATION.txt

Copy to Downloads (postpackage):
    └─► ~/Downloads/zed-extensions/
        ├─── log-scout-analyzer-zed-0.0.4.tar.gz
        ├─── log-scout-analyzer-zed-0.0.4.zip
        └─── INSTALLATION.txt
```

---

## Installation Flow

### Zed Installation Process

```
┌─────────────────────────────────────────────────────────────┐
│                 ZED INSTALLATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

npm run install:zed
    │
    ├─► Step 1: Detect OS
    │   ├─► Windows   → %USERPROFILE%\.config\zed\extensions\
    │   ├─► macOS     → ~/Library/Application Support/Zed/extensions/
    │   └─► Linux     → ~/.config/zed/extensions/
    │
    ├─► Step 2: Verify Source Files
    │   ├─► Check: target/wasm32-wasip1/release/log_scout_analyzer.wasm
    │   │   ├─── Exists? → Continue
    │   │   └─── Missing? → ERROR
    │   └─► Check: extension.toml
    │       ├─── Exists? → Continue
    │       └─── Missing? → ERROR
    │
    ├─► Step 3: Create Target Directory
    │   └─► mkdir -p {ZED_DIR}/log-scout-analyzer
    │
    ├─► Step 4: Copy Files
    │   ├─► log_scout_analyzer.wasm → {ZED_DIR}/log-scout-analyzer/
    │   ├─► extension.toml → {ZED_DIR}/log-scout-analyzer/
    │   ├─► grammars/ → {ZED_DIR}/log-scout-analyzer/grammars/
    │   ├─► README.md → {ZED_DIR}/log-scout-analyzer/
    │   └─► LICENSE → {ZED_DIR}/log-scout-analyzer/
    │
    ├─► Step 5: Verify Installation
    │   ├─► Check: log_scout_analyzer.wasm exists
    │   └─► Check: extension.toml exists
    │
    └─► Step 6: Report Success
        └─► Display next steps (restart Zed)

User Action Required:
    └─► Restart Zed editor (quit and relaunch)
```

---

## Decision Trees

### Should I Use Deploy or Package?

```
┌─────────────────────────────────────────────────────────────┐
│                  COMMAND SELECTION                           │
└─────────────────────────────────────────────────────────────┘

START: Need to update extension?
    │
    ├─► Do you want to install to Zed?
    │   │
    │   ├─► YES → Do you need to increment version?
    │   │   │
    │   │   ├─► YES → npm run deploy
    │   │   │   └─► (Increments, builds, installs)
    │   │   │
    │   │   └─► NO → npm run build:all
    │   │       └─► npm run install:zed
    │   │           └─► (Builds and installs, no increment)
    │   │
    │   └─► NO (just create packages) → npm run package
    │       └─► (Creates .tar.gz and .zip in dist/)
    │
    └─► Just want to build? → npm run build:all
        └─► (Builds both, no packaging or install)
```

---

### Troubleshooting Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│                 TROUBLESHOOTING TREE                         │
└─────────────────────────────────────────────────────────────┘

START: Something's not working?
    │
    ├─► Run: npm run test:scripts
    │   │
    │   ├─► All tests pass?
    │   │   │
    │   │   ├─► YES → Run: npm run status
    │   │   │   │
    │   │   │   └─► Check for issues:
    │   │   │       ├─► Version mismatch? → npm run update:versions
    │   │   │       ├─► Missing artifacts? → npm run build:all
    │   │   │       └─► Git issues? → Commit changes
    │   │   │
    │   │   └─► NO → Fix reported issues:
    │   │       ├─► Cargo not found? → Install Rust
    │   │       ├─► WASM target missing? → rustup target add wasm32-wasip1
    │   │       └─► Files missing? → Check directory
    │   │
    │   └─► Still failing? → Clean rebuild:
    │       └─► npm run clean
    │           └─► npm run deploy
    │
    └─► Extension not loading in Zed?
        │
        ├─► Check: npm run status
        │   └─► Is extension installed? (check paths)
        │
        ├─► Try: Restart Zed completely
        │   └─► Quit and relaunch
        │
        └─► Still not working?
            ├─► Clean reinstall:
            │   └─► npm run clean
            │       └─► npm run deploy
            │       └─► Restart Zed
            │
            └─► Check Zed Console:
                └─► Ctrl+Shift+I → Console tab
                    └─► Look for extension errors
```

---

## Troubleshooting Flow

### Common Issues Resolution

```
┌─────────────────────────────────────────────────────────────┐
│              COMMON ISSUES & SOLUTIONS                       │
└─────────────────────────────────────────────────────────────┘

Issue: "cargo: command not found"
    │
    └─► Solution:
        ├─► Install Rust from https://rustup.rs
        ├─► Restart terminal
        └─► Verify: cargo --version

───────────────────────────────────────────────────────────────

Issue: "WASM target not found"
    │
    └─► Solution:
        ├─► Run: rustup target add wasm32-wasip1
        └─► Verify: rustup target list --installed | grep wasm32-wasip1

───────────────────────────────────────────────────────────────

Issue: "WASM binary not found"
    │
    └─► Solution:
        ├─► Run: npm run status (check build status)
        ├─► Run: npm run build (build WASM)
        └─► Check: target/wasm32-wasip1/release/log_scout_analyzer.wasm

───────────────────────────────────────────────────────────────

Issue: "Extension not loading in Zed"
    │
    └─► Solution:
        ├─► Step 1: Verify installation
        │   └─► npm run status
        │
        ├─► Step 2: Restart Zed completely
        │   └─► Quit and relaunch
        │
        ├─► Step 3: Check Zed console
        │   └─► Ctrl+Shift+I → Console
        │
        └─► Step 4: Clean reinstall
            └─► npm run clean
                └─► npm run deploy
                └─► Restart Zed

───────────────────────────────────────────────────────────────

Issue: "Version mismatch"
    │
    └─► Solution:
        ├─► Run: npm run update:versions
        └─► Run: npm run status (verify)

───────────────────────────────────────────────────────────────

Issue: "Build takes too long"
    │
    ├─► First build: 2-3 minutes is normal
    │   └─► Downloads dependencies
    │
    ├─► Subsequent builds: Should be faster (30-60 sec)
    │   └─► Uses cached artifacts
    │
    └─► If stuck:
        └─► npm run clean
            └─► cargo clean
            └─► npm run build
```

---

## Status Monitoring Flow

### Status Check Process

```
┌─────────────────────────────────────────────────────────────┐
│                   STATUS CHECK FLOW                          │
└─────────────────────────────────────────────────────────────┘

npm run status
    │
    ├─► 1. Read Version Files
    │   ├─► Cargo.toml → Extension version
    │   ├─► extension.toml → Manifest version
    │   └─► lsp-server/Cargo.toml → LSP version
    │
    ├─► 2. Check Version Sync
    │   ├─► Cargo.toml == extension.toml?
    │   │   ├─── YES → ✓ In sync
    │   │   └─── NO  → ⚠ Mismatch (run update:versions)
    │   └─► Calculate next versions
    │
    ├─► 3. Check Build Info
    │   └─► src/build_info.rs exists?
    │       ├─── YES → Parse metadata
    │       │   ├─── Version
    │       │   ├─── Timestamp (calculate time ago)
    │       │   └─── Git info
    │       └─── NO → Not built yet
    │
    ├─► 4. Check Build Artifacts
    │   ├─► WASM binary
    │   │   └─── target/wasm32-wasip1/release/log_scout_analyzer.wasm
    │   │       ├─── Exists? → ✓ Show size and date
    │   │       └─── Missing? → ⚠ Need to build
    │   └─► LSP binary
    │       └─── lsp-server/target/release/log-scout-lsp-server.exe
    │           ├─── Exists? → ✓ Show size and date
    │           └─── Missing? → ⚠ Need to build
    │
    ├─► 5. Check Packages
    │   └─── dist/ directory
    │       ├─── Exists? → List archives
    │       └─── Missing? → ℹ No packages created
    │
    ├─► 6. Check Zed Installation
    │   └─── {OS-specific Zed extensions path}
    │       ├─── Exists? → ✓ Installed (show files)
    │       └─── Missing? → ⚠ Not installed
    │
    ├─► 7. Check Git Status
    │   ├─── Branch name
    │   ├─── Commit hash
    │   └─── Uncommitted changes?
    │       ├─── YES → ⚠ Dirty
    │       └─── NO  → ✓ Clean
    │
    └─► 8. Display Summary
        ├─── Current versions
        ├─── Next versions
        ├─── Build status
        ├─── Installation status
        └─── Quick commands
```

---

## Time Estimates

### Command Execution Times

```
┌─────────────────────────────────────────────────────────────┐
│                    TIME ESTIMATES                            │
└─────────────────────────────────────────────────────────────┘

Version Management:
├─► npm run version:increment    < 1 second
└─► npm run update:versions      < 1 second

Build Commands:
├─► npm run build               1-2 minutes
├─► npm run build:lsp           30-60 seconds
└─► npm run build:all           2-3 minutes

Package Commands:
├─► npm run package             2-3 minutes
└─► npm run postpackage         < 5 seconds

Installation:
└─► npm run install:zed         < 5 seconds

Utilities:
├─► npm run status              < 1 second
├─► npm run help                < 1 second
├─► npm run dry-run             < 1 second
├─► npm run clean               < 5 seconds
└─► npm run test:scripts        < 1 second

Full Workflows:
├─► Standard Deployment         2-3 minutes
├─► Safe Deployment             2-3 minutes + review
└─► Clean Rebuild               3-4 minutes

Note: First builds take longer (downloads dependencies)
      Subsequent builds use cached artifacts (faster)
```

---

## File System Layout

### Directory Structure During Build

```
zed-extension/
├── src/
│   ├── lib.rs
│   └── build_info.rs          ← Generated by build
│
├── target/
│   └── wasm32-wasip1/
│       └── release/
│           └── log_scout_analyzer.wasm  ← Built by cargo
│
├── dist/                      ← Created by package
│   ├── log-scout-analyzer-zed-X.X.X/
│   │   ├── log_scout_analyzer.wasm
│   │   ├── extension.toml
│   │   ├── grammars/
│   │   ├── README.md
│   │   └── install.sh
│   ├── log-scout-analyzer-zed-X.X.X.tar.gz
│   ├── log-scout-analyzer-zed-X.X.X.zip
│   └── INSTALLATION.txt
│
└── [automation scripts and docs]

~/Downloads/zed-extensions/     ← Copied by postpackage
├── log-scout-analyzer-zed-X.X.X.tar.gz
├── log-scout-analyzer-zed-X.X.X.zip
└── INSTALLATION.txt

{Zed Extensions Directory}/     ← Installed by install:zed
└── log-scout-analyzer/
    ├── log_scout_analyzer.wasm
    ├── extension.toml
    ├── grammars/
    ├── README.md
    └── LICENSE
```

---

## Quick Reference Card

### Most Common Commands

```
┌─────────────────────────────────────────────────────────────┐
│                  QUICK REFERENCE                             │
└─────────────────────────────────────────────────────────────┘

Deploy Everything:
    npm run deploy

Check Status:
    npm run status

Get Help:
    npm run help

Preview Changes:
    npm run dry-run

Clean & Rebuild:
    npm run clean
    npm run deploy

Test System:
    npm run test:scripts

Create Packages:
    npm run package

Fix Versions:
    npm run update:versions
```

---

## Summary

This visual guide provides:

✅ **Deployment workflows** - Standard, safe, and clean rebuild
✅ **Build process flows** - Complete pipeline visualization
✅ **Version management** - Increment and sync processes
✅ **Package creation** - Distribution package flow
✅ **Installation flow** - Zed installation process
✅ **Decision trees** - Command selection and troubleshooting
✅ **Time estimates** - Expected durations
✅ **File layouts** - Directory structure
✅ **Quick reference** - Most common commands

---

**For more details:**
- [QUICK_START_BUILD.md](QUICK_START_BUILD.md) - Quick reference guide
- [SCRIPTS_README.md](SCRIPTS_README.md) - Technical documentation
- [BUILD_AUTOMATION_COMPLETE.md](BUILD_AUTOMATION_COMPLETE.md) - Feature summary
- [BUILD_AUTOMATION_INDEX.md](BUILD_AUTOMATION_INDEX.md) - Master index

---

**Happy Building!** 🚀