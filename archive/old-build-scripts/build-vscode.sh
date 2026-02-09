#!/bin/bash
# Log Scout Analyzer - VS Code Extension Builder

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR=""
cd ""

echo -e "╔════════════════════════════════════════════════════════╗"
echo -e "║     LOG SCOUT ANALYZER - VS CODE EXTENSION BUILDER    ║"
echo -e "╚════════════════════════════════════════════════════════╝"
echo ""

# Detect if WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    WIN_USER=
    WINDOWS_EXT_DIR="/mnt/c/Users//Downloads/vscode-extensions"
    echo -e "  ✓ Detected: WSL (User: )"
    IS_WSL=true
else
    echo -e "  ✓ Detected: Linux/macOS"
    IS_WSL=false
fi
echo ""

echo -e "[1/2] Building extension..."
cd vscode-extension
npm run package 2>&1 | tail -5
cd ..

VSIX_FILE=vscode-extension/log-scout-analyzer-0.1.0.vsix
VSIX_NAME=""
VSIX_SIZE=

echo ""
echo -e "[2/2] Copying to Windows..."

if [ "" = true ]; then
    mkdir -p ""
    cp "" "/"
    
    if [ 0 -eq 0 ]; then
        echo -e "  ✓ Copied to Windows"
        echo -e "    WSL: /"
        echo -e "    Windows: C:\Users\\\Downloads\vscode-extensions\\"
    else
        echo -e "  ⚠ Failed to copy"
    fi
else
    echo -e "  ✓ Extension ready: "
fi

echo ""
echo -e "════════════════════════════════════════════════════════"
echo -e "✓ Build Complete!"
echo ""
echo -e "  📦 Package: "
echo -e "  📏 Size: "
echo ""

if [ "" = true ]; then
    echo -e "Installation (Windows):"
    echo -e "  1. Open VS Code"
    echo -e "  2. Press Ctrl+Shift+P"
    echo -e "  3. Type: Extensions: Install from VSIX"
    echo -e "  4. Navigate to: Downloads\vscode-extensions"
    echo -e "  5. Select: "
    echo -e "  6. Reload: Ctrl+Shift+P → reload"
else
    echo -e "Installation:"
    echo -e "  code --install-extension  --force"
fi

echo ""
echo -e "════════════════════════════════════════════════════════"

exit 0
