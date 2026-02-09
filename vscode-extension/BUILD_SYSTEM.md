# Build System - Log Scout Analyzer Extension

## Overview

The Log Scout Analyzer uses a simple, automated build system that:
- Increments the build number automatically (0.0.1 → 0.0.2 → 0.0.3...)
- Generates fresh build metadata (timestamp, git commit, build number)
- Compiles TypeScript to JavaScript
- Creates a generic VSIX package: `log-scout-analyzer.vsix`

## Quick Start

### Build and Package
```bash
cd /home/mitchong/code/log_scout_analyzer/vscode-extension
./build-and-package.sh
```

That's it! The script will:
1. Auto-increment the version (e.g., 0.0.1 → 0.0.2)
2. Update `package.json`
3. Generate build info with timestamp and git hash
4. Compile TypeScript
5. Create `log-scout-analyzer.vsix`

### Install the Extension
```bash
code --install-extension log-scout-analyzer.vsix
```

Or use VS Code UI:
1. Extensions panel (Ctrl+Shift+X)
2. Click ⋯ (More Actions)
3. "Install from VSIX..."
4. Select `log-scout-analyzer.vsix`
5. **Reload VS Code**

---

## Version Scheme

**Format:** `0.0.BUILD`

- Major: 0 (pre-release)
- Minor: 0 (feature set)
- Build: Auto-incremented with each build

**Examples:**
- First build: `0.0.1`
- Second build: `0.0.2`
- After 10 builds: `0.0.11`

---

## Manual Steps

If you need to build manually:

### 1. Update Version (Optional)
```bash
# Edit package.json and change "version": "0.0.X"
nano package.json
```

### 2. Generate Build Info
```bash
node generate-build-info.js
```

### 3. Compile TypeScript
```bash
npm run compile
```

### 4. Package Extension
```bash
npx @vscode/vsce package --allow-star-activation --out log-scout-analyzer.vsix
```

---

## Files Involved

### Source Files
- `src/extension.ts` - Main extension code
- `src/*.ts` - All TypeScript modules
- `package.json` - Version and metadata

### Generated Files
- `src/buildInfo.ts` - Auto-generated build metadata
- `out/*.js` - Compiled JavaScript
- `log-scout-analyzer.vsix` - Installable package

### Build Scripts
- `build-and-package.sh` - Main build automation script
- `generate-build-info.js` - Build metadata generator

---

## Build Metadata

Each build includes:
- **Version** - From package.json (e.g., 0.0.2)
- **Build Timestamp** - ISO 8601 format
- **Build Number** - Unix timestamp in milliseconds
- **Git Commit** - Short hash (7 chars)

View in VS Code:
1. Command Palette (Ctrl+Shift+P)
2. "Scout: Show Version Info"

---

## Workflow

### Development Cycle
```bash
# 1. Make code changes
nano src/extension.ts

# 2. Build and package
./build-and-package.sh

# 3. Install in VS Code
code --install-extension log-scout-analyzer.vsix

# 4. Reload VS Code window
# Press: Ctrl+Shift+P → "Reload Window"

# 5. Test changes
```

### Quick Rebuild
```bash
./build-and-package.sh && code --install-extension log-scout-analyzer.vsix
```

---

## Troubleshooting

### Script Not Executable
```bash
chmod +x build-and-package.sh
```

### Compilation Errors
```bash
# Check TypeScript errors
npm run compile

# View specific error
cat src/extension.ts | grep -A 5 "line_number"
```

### Old Version Still Active
1. Uninstall old version in VS Code
2. **Reload VS Code** (critical!)
3. Install new version
4. **Reload VS Code again**

### Command Not Found Errors
- Make sure you reloaded VS Code after installation
- Check Output panel → "Log Scout Analyzer" for errors
- Verify extension activated: look for activation message

---

## Clean Build

Remove all artifacts and rebuild:

```bash
# Remove generated files
rm -rf out/
rm -f log-scout-analyzer*.vsix

# Fresh build
npm run compile
./build-and-package.sh
```

---

## Package Contents

The VSIX includes:
- Compiled JavaScript (`out/` directory)
- Pattern engine and analyzers
- Tree view providers
- DevTools-style UI components
- Language definitions (log syntax)
- Configuration schemas
- Documentation (README, CHANGELOG, guides)

**Excluded from VSIX:**
- TypeScript source files (`src/` - see `.vscodeignore`)
- `node_modules/` (bundled with compiled code)
- Test files
- Development scripts

---

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 0.0.1   | 2026-02-06 | Initial build system setup       |
| 0.0.2   | 2026-02-06 | First automated build test       |

---

## Tips

1. **Always reload VS Code** after installing a new build
2. The generic filename (`log-scout-analyzer.vsix`) makes installation simple
3. Build number in metadata helps track which version you're running
4. Use `Scout: Show Version Info` to verify installation
5. Check Output panel for activation logs

---

## Support

### Common Issues

**"analyzeFile not found"**
- Reload VS Code window
- Reinstall extension
- Check for TypeScript compilation errors

**Commands appear but don't execute**
- Runtime error in extension code
- Check Output panel → "Log Scout Analyzer"
- Rebuild with fresh compilation

**Old version still showing**
- Uninstall completely
- Close and reopen VS Code (not just reload)
- Install new version

---

## Next Steps

1. Run `./build-and-package.sh` to create your first build
2. Install `log-scout-analyzer.vsix` in VS Code
3. Test with a log file
4. Make changes and rebuild as needed
5. Each build auto-increments version number

**Current Version:** Check `package.json` or run `Scout: Show Version Info`

---

**Status:** ✅ Ready for production builds