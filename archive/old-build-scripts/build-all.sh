#!/bin/bash
# Log Scout Analyzer - Unified Build Script
# Builds and deploys both Zed and VS Code extensions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       LOG SCOUT ANALYZER - UNIFIED BUILD SCRIPT       ║${NC}"
echo -e "${BLUE}║              Build Both Zed & VS Code Exts            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect OS and set paths
detect_os_and_paths() {
    echo -e "${CYAN}[1/9] Detecting OS and setting paths...${NC}"

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if grep -qi microsoft /proc/version 2>/dev/null; then
            OS="wsl"
            echo -e "${GREEN}  ✓ Detected: WSL (Windows Subsystem for Linux)${NC}"

            # WSL paths
            ZED_EXT_DIR="/mnt/c/Users/$USER/.config/zed/extensions/log-scout-analyzer"
            VSCODE_EXT_DIR="/mnt/c/Users/$USER/.vscode/extensions"

            # Try to find Windows username if different
            WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r\n' || echo "$USER")
            if [ "$WIN_USER" != "$USER" ]; then
                ZED_EXT_DIR="/mnt/c/Users/$WIN_USER/.config/zed/extensions/log-scout-analyzer"
                VSCODE_EXT_DIR="/mnt/c/Users/$WIN_USER/.vscode/extensions"
            fi
            WINDOWS_EXTENSIONS_FOLDER="/mnt/c/Users/$WIN_USER/Downloads/vscode-extensions"
        else
            OS="linux"
            echo -e "${GREEN}  ✓ Detected: Linux${NC}"
            ZED_EXT_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
            VSCODE_EXT_DIR="$HOME/.vscode/extensions"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="mac"
        echo -e "${GREEN}  ✓ Detected: macOS${NC}"
        ZED_EXT_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
        VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        echo -e "${GREEN}  ✓ Detected: Windows${NC}"
        ZED_EXT_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
        VSCODE_EXT_DIR="$HOME/.vscode/extensions"
    else
        echo -e "${RED}  ✗ Unsupported OS: $OSTYPE${NC}"
        exit 1
    fi

    echo -e "    Zed Extensions: ${YELLOW}$ZED_EXT_DIR${NC}"
    echo -e "    VS Code Extensions: ${YELLOW}$VSCODE_EXT_DIR${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    echo -e "${CYAN}[2/9] Checking prerequisites...${NC}"

    ALL_OK=true

    # Check Rust and Cargo
    if command -v cargo &> /dev/null; then
        CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
        echo -e "${GREEN}  ✓ Cargo installed (${CARGO_VERSION})${NC}"
    else
        echo -e "${RED}  ✗ Cargo not found${NC}"
        echo -e "${YELLOW}    Install from: https://rustup.rs/${NC}"
        ALL_OK=false
    fi

    # Check WASM target
    if rustup target list 2>/dev/null | grep -q "wasm32-wasip1 (installed)"; then
        echo -e "${GREEN}  ✓ wasm32-wasip1 target installed${NC}"
    else
        echo -e "${YELLOW}  ⚠ wasm32-wasip1 target not installed${NC}"
        echo -e "${YELLOW}    Installing now...${NC}"
        rustup target add wasm32-wasip1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ wasm32-wasip1 target installed successfully${NC}"
        else
            echo -e "${RED}  ✗ Failed to install wasm32-wasip1 target${NC}"
            ALL_OK=false
        fi
    fi

    # Check Node.js and npm
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}  ✓ Node.js installed (${NODE_VERSION})${NC}"
    else
        echo -e "${RED}  ✗ Node.js not found${NC}"
        echo -e "${YELLOW}    Install from: https://nodejs.org/${NC}"
        ALL_OK=false
    fi

    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}  ✓ npm installed (${NPM_VERSION})${NC}"
    else
        echo -e "${RED}  ✗ npm not found${NC}"
        ALL_OK=false
    fi

    if [ "$ALL_OK" = false ]; then
        echo -e "${RED}  ✗ Prerequisites check failed${NC}"
        exit 1
    fi

    echo ""
}

# Build Zed extension
build_zed_extension() {
    echo -e "${CYAN}[3/9] Building Zed extension (WASM)...${NC}"

    echo -e "${YELLOW}  → Compiling Rust to WASM...${NC}"
    cargo build --release --target wasm32-wasip1

    if [ $? -eq 0 ]; then
        WASM_SIZE=$(du -h target/wasm32-wasip1/release/log_scout_analyzer.wasm | cut -f1)
        echo -e "${GREEN}  ✓ Zed extension built successfully (${WASM_SIZE})${NC}"
    else
        echo -e "${RED}  ✗ Failed to build Zed extension${NC}"
        exit 1
    fi

    echo ""
}

# Deploy Zed extension
deploy_zed_extension() {
    echo -e "${CYAN}[4/9] Deploying Zed extension...${NC}"

    # Create extension directory
    echo -e "${YELLOW}  → Creating extension directory...${NC}"
    mkdir -p "$ZED_EXT_DIR"

    # Copy WASM binary
    echo -e "${YELLOW}  → Copying WASM binary...${NC}"
    cp target/wasm32-wasip1/release/log_scout_analyzer.wasm "$ZED_EXT_DIR/"

    # Copy extension.toml
    echo -e "${YELLOW}  → Copying extension.toml...${NC}"
    cp extension.toml "$ZED_EXT_DIR/"

    # Copy config directory
    echo -e "${YELLOW}  → Copying config directory...${NC}"
    cp -r config "$ZED_EXT_DIR/"

    # Copy grammars directory if exists
    if [ -d "grammars" ]; then
        echo -e "${YELLOW}  → Copying grammars directory...${NC}"
        cp -r grammars "$ZED_EXT_DIR/"
    fi

    # Verify installation
    if [ -f "$ZED_EXT_DIR/log_scout_analyzer.wasm" ] && [ -f "$ZED_EXT_DIR/extension.toml" ]; then
        WASM_SIZE=$(du -h "$ZED_EXT_DIR/log_scout_analyzer.wasm" | cut -f1)
        echo -e "${GREEN}  ✓ Zed extension deployed (${WASM_SIZE})${NC}"
        echo -e "    Location: ${YELLOW}$ZED_EXT_DIR${NC}"
    else
        echo -e "${RED}  ✗ Zed extension deployment failed${NC}"
        exit 1
    fi

    echo ""
}

# Install VS Code extension dependencies
install_vscode_deps() {
    echo -e "${CYAN}[5/9] Installing VS Code extension dependencies...${NC}"

    cd vscode-extension

    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}  → node_modules exists, checking for updates...${NC}"
        npm update
    else
        echo -e "${YELLOW}  → Installing npm packages...${NC}"
        npm install
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Dependencies installed${NC}"
    else
        echo -e "${RED}  ✗ Failed to install dependencies${NC}"
        cd ..
        exit 1
    fi

    cd ..
    echo ""
}

# Build VS Code extension
build_vscode_extension() {
    echo -e "${CYAN}[6/9] Building VS Code extension...${NC}"

    cd vscode-extension

    echo -e "${YELLOW}  → Compiling TypeScript...${NC}"
    npm run compile

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ VS Code extension compiled${NC}"
    else
        echo -e "${RED}  ✗ Failed to compile VS Code extension${NC}"
        cd ..
        exit 1
    fi

    cd ..
    echo ""
}

# Package VS Code extension
package_vscode_extension() {
    echo -e "${CYAN}[7/9] Packaging VS Code extension (.vsix)...${NC}"

    cd vscode-extension

    # Check if vsce is installed
    if ! command -v vsce &> /dev/null; then
        echo -e "${YELLOW}  → Installing vsce globally...${NC}"
        npm install -g @vscode/vsce
    fi

    echo -e "${YELLOW}  → Creating VSIX package...${NC}"
    npm run package

    if [ $? -eq 0 ]; then
        VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -n1)
        if [ -n "$VSIX_FILE" ]; then
            VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
            echo -e "${GREEN}  ✓ VSIX package created: ${VSIX_FILE} (${VSIX_SIZE})${NC}"

            # Copy to parent directory for easy access
            cp "$VSIX_FILE" ../
            echo -e "${GREEN}  ✓ Copied to: ${YELLOW}$(pwd)/../${VSIX_FILE}${NC}"
        else
            echo -e "${RED}  ✗ VSIX file not found${NC}"
            cd ..
            exit 1
        fi
    else
        echo -e "${RED}  ✗ Failed to package VS Code extension${NC}"
        cd ..
        exit 1
    fi

    cd ..
    echo ""
}

# Deploy VS Code extension
deploy_vscode_extension() {
    echo -e "${CYAN}[8/9] Deploying VS Code extension...${NC}"

    VSIX_FILE=$(ls -t vscode-extension/*.vsix 2>/dev/null | head -n1)

    if [ -z "$VSIX_FILE" ]; then
        echo -e "${RED}  ✗ No VSIX file found${NC}"
        exit 1
    fi

    # Copy to Windows Downloads/vscode-extensions folder if running in WSL
    if [ "$OS" = "wsl" ]; then
        # Create vscode-extensions folder if it doesn't exist
        mkdir -p "$WINDOWS_EXTENSIONS_FOLDER"

        echo -e "${YELLOW}  → Copying VSIX to Windows Downloads/vscode-extensions folder...${NC}"
        cp "$VSIX_FILE" "$WINDOWS_EXTENSIONS_FOLDER/"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ Copied to: $WINDOWS_EXTENSIONS_FOLDER/$(basename $VSIX_FILE)${NC}"
            echo -e "    Windows path: ${YELLOW}C:\\Users\\$WIN_USER\\Downloads\\vscode-extensions\\$(basename $VSIX_FILE)${NC}"
        else
            echo -e "${YELLOW}  ⚠ Failed to copy to Windows Downloads/vscode-extensions${NC}"
        fi
    fi

    echo -e "${YELLOW}  → Installing extension from VSIX...${NC}"

    # Try to install using code command
    if command -v code &> /dev/null; then
        code --install-extension "$VSIX_FILE" --force

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}  ✓ VS Code extension installed${NC}"
        else
            echo -e "${YELLOW}  ⚠ code command failed, manual installation required${NC}"
            echo -e "${YELLOW}    Install manually: code --install-extension $VSIX_FILE${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ VS Code CLI not found${NC}"
        echo -e "${YELLOW}    Install manually in VS Code:${NC}"
        echo -e "${YELLOW}    1. Press Ctrl+Shift+P${NC}"
        echo -e "${YELLOW}    2. Type 'Extensions: Install from VSIX'${NC}"
        echo -e "${YELLOW}    3. Select: $VSIX_FILE${NC}"
    fi

    echo ""
}

# Summary
show_summary() {
    echo -e "${CYAN}[9/9] Build Summary${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

    echo -e "${GREEN}✓ Zed Extension${NC}"
    echo -e "  Location: ${YELLOW}$ZED_EXT_DIR${NC}"
    if [ -f "$ZED_EXT_DIR/log_scout_analyzer.wasm" ]; then
        WASM_SIZE=$(du -h "$ZED_EXT_DIR/log_scout_analyzer.wasm" | cut -f1)
        echo -e "  WASM Size: ${WASM_SIZE}"
    fi
    echo -e "  Files: extension.toml, log_scout_analyzer.wasm, config/, grammars/"
    echo ""

    echo -e "${GREEN}✓ VS Code Extension${NC}"
    VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -n1)
    if [ -n "$VSIX_FILE" ]; then
        VSIX_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
        echo -e "  Package: ${YELLOW}$VSIX_FILE${NC}"
        echo -e "  Size: ${VSIX_SIZE}"
        if [ "$OS" = "wsl" ]; then
            echo -e "  Windows Copy: ${YELLOW}C:\\Users\\$WIN_USER\\Downloads\\vscode-extensions\\$(basename $VSIX_FILE)${NC}"
        fi
    fi
    echo ""

    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""

    echo -e "${MAGENTA}Next Steps:${NC}"
    echo ""

    echo -e "${YELLOW}For Zed:${NC}"
    echo -e "  1. Completely quit and restart Zed"
    echo -e "  2. Press Ctrl+Shift+X to open Extensions"
    echo -e "  3. Look for 'Log Scout Analyzer' in installed extensions"
    echo -e "  4. Open a .log file to test"
    echo ""

    echo -e "${YELLOW}For VS Code:${NC}"
    if command -v code &> /dev/null; then
        echo -e "  1. Restart VS Code (Ctrl+Shift+P → 'Developer: Reload Window')"
        echo -e "  2. Open Extensions panel (Ctrl+Shift+X)"
        echo -e "  3. Search for 'Log Scout Analyzer'"
        echo -e "  4. Open a .log file to test"
    else
        if [ "$OS" = "wsl" ]; then
            echo -e "  ${CYAN}Easy Install (Windows):${NC}"
            echo -e "  1. In VS Code, press Ctrl+Shift+P"
            echo -e "  2. Type 'Extensions: Install from VSIX'"
            echo -e "  3. Navigate to Downloads/vscode-extensions folder"
            echo -e "  4. Select: $(basename $VSIX_FILE)"
            echo -e "  5. Reload window (Ctrl+Shift+P → 'reload')"
        else
            echo -e "  1. In VS Code, press Ctrl+Shift+P"
            echo -e "  2. Type 'Extensions: Install from VSIX'"
            echo -e "  3. Select: $VSIX_FILE"
            echo -e "  4. Restart VS Code"
            echo -e "  5. Open a .log file to test"
        fi
    fi
    echo ""

    echo -e "${YELLOW}Testing:${NC}"
    echo -e "  Open test.log in either editor to verify functionality"
    echo ""

    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}Build completed successfully! 🎉${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

# Main execution
main() {
    detect_os_and_paths
    check_prerequisites
    build_zed_extension
    deploy_zed_extension
    install_vscode_deps
    build_vscode_extension
    package_vscode_extension
    deploy_vscode_extension
    show_summary
}

# Run main function
main

exit 0
