#!/bin/bash
# Log Scout Analyzer - Extension Installation Script
# This script builds and installs the extension into Zed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Log Scout Analyzer - Extension Installer${NC}"
echo -e "${BLUE}============================================${NC}\n"

# Detect OS and set extension directory
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash/Cygwin)
    EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo -e "${YELLOW}Extension directory: ${EXTENSION_DIR}${NC}\n"

# Step 1: Build the WASM binary
echo -e "${BLUE}Step 1: Building WASM binary...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: cargo not found. Please install Rust.${NC}"
    exit 1
fi

if ! rustup target list | grep -q "wasm32-wasip1 (installed)"; then
    echo -e "${YELLOW}Installing wasm32-wasip1 target...${NC}"
    rustup target add wasm32-wasip1
fi

cargo build --release --target wasm32-wasip1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WASM binary built successfully${NC}\n"
else
    echo -e "${RED}✗ Failed to build WASM binary${NC}"
    exit 1
fi

# Step 2: Create extension directory
echo -e "${BLUE}Step 2: Creating extension directory...${NC}"
mkdir -p "$EXTENSION_DIR"
echo -e "${GREEN}✓ Directory created: ${EXTENSION_DIR}${NC}\n"

# Step 3: Copy files
echo -e "${BLUE}Step 3: Copying extension files...${NC}"

# Copy WASM binary
cp target/wasm32-wasip1/release/log_scout_analyzer.wasm "$EXTENSION_DIR/"
echo -e "${GREEN}✓ Copied WASM binary${NC}"

# Copy extension manifest
cp extension.toml "$EXTENSION_DIR/"
echo -e "${GREEN}✓ Copied extension.toml${NC}"

# Copy config directory
if [ -d "config" ]; then
    cp -r config "$EXTENSION_DIR/"
    echo -e "${GREEN}✓ Copied config directory${NC}"
fi

# Copy grammars directory
if [ -d "grammars" ]; then
    cp -r grammars "$EXTENSION_DIR/"
    echo -e "${GREEN}✓ Copied grammars directory${NC}"
fi

echo ""

# Step 4: Verify installation
echo -e "${BLUE}Step 4: Verifying installation...${NC}"

# Check files
FILES_TO_CHECK=(
    "$EXTENSION_DIR/log_scout_analyzer.wasm"
    "$EXTENSION_DIR/extension.toml"
    "$EXTENSION_DIR/config/patterns.yaml"
)

ALL_OK=true
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ Found: $(basename $file)${NC}"
    else
        echo -e "${RED}✗ Missing: $(basename $file)${NC}"
        ALL_OK=false
    fi
done

echo ""

# Step 5: Display extension info
echo -e "${BLUE}Step 5: Extension Information${NC}"
echo -e "${YELLOW}Extension ID:${NC} log-scout-analyzer"
echo -e "${YELLOW}Location:${NC} $EXTENSION_DIR"
echo -e "${YELLOW}WASM Size:${NC} $(du -h "$EXTENSION_DIR/log_scout_analyzer.wasm" | cut -f1)"
echo -e "${YELLOW}Pattern Files:${NC}"
if [ -d "$EXTENSION_DIR/config" ]; then
    ls "$EXTENSION_DIR/config"/*.yaml 2>/dev/null | while read file; do
        echo "  - $(basename $file)"
    done
fi

echo ""

if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Installation Successful! ✓${NC}"
    echo -e "${GREEN}============================================${NC}\n"

    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Restart Zed editor completely"
    echo "2. Press Cmd/Ctrl+Shift+X to open Extensions panel"
    echo "3. Look for 'Log Scout Analyzer' in the installed list"
    echo "4. Open a .log or .txt file to test the extension"
    echo ""
    echo -e "${BLUE}To test the extension:${NC}"
    echo "  zed test.log"
    echo ""
    echo -e "${BLUE}To view extension debug info:${NC}"
    echo "  1. Open Zed"
    echo "  2. Press Cmd/Ctrl+Shift+I (Developer Tools)"
    echo "  3. Check Console for any extension errors"
    echo ""

    # Check if Zed is running
    if pgrep -x "zed" > /dev/null || pgrep -x "Zed" > /dev/null; then
        echo -e "${YELLOW}⚠ Warning: Zed appears to be running${NC}"
        echo -e "${YELLOW}Please restart Zed to load the extension${NC}"
        echo ""
        read -p "Would you like to try opening the test log file? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Opening test.log with Zed..."
            if [ -f "test.log" ]; then
                zed test.log &
            else
                echo -e "${RED}test.log not found. Please create it first.${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}  Installation Incomplete${NC}"
    echo -e "${RED}============================================${NC}"
    echo -e "${RED}Some files are missing. Please check the errors above.${NC}"
    exit 1
fi
