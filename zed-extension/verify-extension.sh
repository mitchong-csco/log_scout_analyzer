#!/bin/bash
# Log Scout Analyzer Extension - Verification Script
# This script checks if the extension is properly installed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Log Scout Analyzer - Extension Verification${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Detect extension directory based on OS
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    EXTENSION_DIR="$HOME/.config/zed/extensions/log-scout-analyzer"
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo -e "${YELLOW}Extension directory: ${EXTENSION_DIR}${NC}"
echo ""

ALL_OK=true

# Check 1: Extension directory exists
echo -e "${BLUE}[1/8] Checking extension directory...${NC}"
if [ -d "$EXTENSION_DIR" ]; then
    echo -e "${GREEN}  ✓ Extension directory exists${NC}"
else
    echo -e "${RED}  ✗ Extension directory NOT found${NC}"
    echo -e "${YELLOW}  → Run: ./install-extension.sh${NC}"
    ALL_OK=false
fi
echo ""

# Check 2: WASM binary
echo -e "${BLUE}[2/8] Checking WASM binary...${NC}"
if [ -f "$EXTENSION_DIR/log_scout_analyzer.wasm" ]; then
    SIZE=$(du -h "$EXTENSION_DIR/log_scout_analyzer.wasm" 2>/dev/null | cut -f1)
    echo -e "${GREEN}  ✓ WASM binary found (${SIZE})${NC}"

    # Check size is reasonable (should be > 500KB)
    SIZE_BYTES=$(stat -f%z "$EXTENSION_DIR/log_scout_analyzer.wasm" 2>/dev/null || stat -c%s "$EXTENSION_DIR/log_scout_analyzer.wasm" 2>/dev/null)
    if [ "$SIZE_BYTES" -lt 500000 ]; then
        echo -e "${YELLOW}  ⚠ Warning: WASM binary seems too small (${SIZE})${NC}"
        echo -e "${YELLOW}  → Try rebuilding: cargo build --release --target wasm32-wasip1${NC}"
    fi
else
    echo -e "${RED}  ✗ WASM binary NOT found${NC}"
    echo -e "${YELLOW}  → Run: cargo build --release --target wasm32-wasip1${NC}"
    ALL_OK=false
fi
echo ""

# Check 3: extension.toml
echo -e "${BLUE}[3/8] Checking extension.toml...${NC}"
if [ -f "$EXTENSION_DIR/extension.toml" ]; then
    echo -e "${GREEN}  ✓ extension.toml found${NC}"

    # Verify required fields
    if grep -q "id = \"log-scout-analyzer\"" "$EXTENSION_DIR/extension.toml" 2>/dev/null; then
        echo -e "${GREEN}  ✓ Extension ID is correct${NC}"
    else
        echo -e "${YELLOW}  ⚠ Extension ID might be incorrect${NC}"
    fi

    if grep -q "schema_version" "$EXTENSION_DIR/extension.toml" 2>/dev/null; then
        echo -e "${GREEN}  ✓ Schema version specified${NC}"
    else
        echo -e "${YELLOW}  ⚠ Schema version missing${NC}"
    fi
else
    echo -e "${RED}  ✗ extension.toml NOT found${NC}"
    ALL_OK=false
fi
echo ""

# Check 4: Config directory
echo -e "${BLUE}[4/8] Checking config directory...${NC}"
if [ -d "$EXTENSION_DIR/config" ]; then
    COUNT=$(ls "$EXTENSION_DIR/config"/*.yaml 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}  ✓ Config directory found${NC}"
    echo -e "${GREEN}  ✓ Found ${COUNT} pattern file(s)${NC}"

    # List pattern files
    if [ "$COUNT" -gt 0 ]; then
        for file in "$EXTENSION_DIR/config"/*.yaml; do
            if [ -f "$file" ]; then
                echo -e "    - $(basename $file)"
            fi
        done
    fi
else
    echo -e "${RED}  ✗ Config directory NOT found${NC}"
    ALL_OK=false
fi
echo ""

# Check 5: Grammars directory
echo -e "${BLUE}[5/8] Checking grammars directory...${NC}"
if [ -d "$EXTENSION_DIR/grammars" ]; then
    echo -e "${GREEN}  ✓ Grammars directory found${NC}"

    if [ -d "$EXTENSION_DIR/grammars/log" ]; then
        echo -e "${GREEN}  ✓ Log grammar directory found${NC}"
    else
        echo -e "${YELLOW}  ⚠ Log grammar directory missing${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ Grammars directory NOT found${NC}"
    echo -e "${YELLOW}  → This may affect syntax highlighting${NC}"
fi
echo ""

# Check 6: Rust toolchain
echo -e "${BLUE}[6/8] Checking Rust toolchain...${NC}"
if command -v cargo &> /dev/null; then
    CARGO_VERSION=$(cargo --version | cut -d' ' -f2)
    echo -e "${GREEN}  ✓ Cargo found (version ${CARGO_VERSION})${NC}"

    if rustup target list | grep -q "wasm32-wasip1 (installed)"; then
        echo -e "${GREEN}  ✓ wasm32-wasip1 target installed${NC}"
    else
        echo -e "${YELLOW}  ⚠ wasm32-wasip1 target not installed${NC}"
        echo -e "${YELLOW}  → Run: rustup target add wasm32-wasip1${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ Cargo not found (needed for rebuilding)${NC}"
fi
echo ""

# Check 7: Zed installation
echo -e "${BLUE}[7/8] Checking Zed installation...${NC}"
if command -v zed &> /dev/null; then
    echo -e "${GREEN}  ✓ Zed CLI found${NC}"

    # Check Zed version if possible
    ZED_VERSION=$(zed --version 2>/dev/null | head -n1 || echo "unknown")
    echo -e "    Version: ${ZED_VERSION}"
else
    echo -e "${YELLOW}  ⚠ Zed CLI not found in PATH${NC}"
    echo -e "${YELLOW}  → Extension may still work if Zed GUI is installed${NC}"
fi
echo ""

# Check 8: Zed process status
echo -e "${BLUE}[8/8] Checking Zed process status...${NC}"
if pgrep -x "zed" > /dev/null 2>&1 || pgrep -x "Zed" > /dev/null 2>&1 || pgrep -i "zed" > /dev/null 2>&1; then
    echo -e "${YELLOW}  ⚠ Zed is currently running${NC}"
    echo -e "${YELLOW}  → Restart Zed to load the extension${NC}"
else
    echo -e "${GREEN}  ✓ Zed is not running${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}============================================${NC}"
if [ "$ALL_OK" = true ]; then
    echo -e "${GREEN}  ✓ All checks passed!${NC}"
else
    echo -e "${YELLOW}  ⚠ Some issues found${NC}"
fi
echo -e "${BLUE}============================================${NC}"
echo ""

# Recommendations
echo -e "${YELLOW}Next Steps:${NC}"
if [ "$ALL_OK" = true ]; then
    echo "  1. Restart Zed completely (Quit and relaunch)"
    echo "  2. Press Cmd/Ctrl+Shift+X to open Extensions panel"
    echo "  3. Look for 'Log Scout Analyzer' in installed extensions"
    echo "  4. Open test.log to verify functionality"
    echo ""
    echo -e "${BLUE}To test:${NC}"
    echo "  zed test.log"
else
    echo "  1. Fix the issues reported above"
    echo "  2. Run: ./install-extension.sh"
    echo "  3. Run this verification script again"
fi
echo ""

# Extension info
echo -e "${BLUE}Extension Information:${NC}"
echo "  Name: Log Scout Analyzer"
echo "  ID: log-scout-analyzer"
echo "  Version: 0.1.0"
echo "  Location: $EXTENSION_DIR"
echo ""

# Quick test
if [ -f "test.log" ]; then
    echo -e "${BLUE}Test file available:${NC}"
    echo "  test.log found in current directory"
    echo "  Open with: zed test.log"
else
    echo -e "${YELLOW}No test file found${NC}"
    echo "  Create one to test the extension"
fi
echo ""

# Debug help
echo -e "${BLUE}For debugging:${NC}"
echo "  • View Zed console: Cmd/Ctrl+Shift+I"
echo "  • Check Zed logs: ~/.local/share/zed/logs/Zed.log"
echo "  • Run with debug: RUST_LOG=zed::extension=debug zed"
echo "  • See EXTENSION_TROUBLESHOOTING.md for more help"
echo ""

exit 0
