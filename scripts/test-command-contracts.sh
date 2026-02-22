#!/bin/bash
# Command Contract Test Runner
#
# Tests that TypeScript extension commands match Rust LSP server commands
# by validating both against the shared lsp-commands.schema.json
#
# Usage:
#   ./scripts/test-command-contracts.sh
#
# Or from project root:
#   bash scripts/test-command-contracts.sh

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "  🔍 Command Contract Testing"
echo "================================================"
echo ""
echo "Testing that TypeScript extension and Rust LSP server"
echo "use the same command names from lsp-commands.schema.json"
echo ""

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Check schema file exists
SCHEMA_FILE="lsp-commands.schema.json"
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ ERROR: Schema file not found: $SCHEMA_FILE${NC}"
    echo "   This file should be in the project root."
    exit 1
fi

echo -e "${GREEN}✓${NC} Found schema: $SCHEMA_FILE"
echo ""

# =============================================================================
# Test 1: Rust LSP Server
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 1: Rust LSP Server Command Contract${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd lsp-server

if cargo test --lib command_contract 2>&1 | tee /tmp/rust_test_output.txt; then
    echo ""
    echo -e "${GREEN}✅ Rust command contract tests PASSED${NC}"
    RUST_PASSED=true
else
    echo ""
    echo -e "${RED}❌ Rust command contract tests FAILED${NC}"
    echo ""
    echo "To see full output, check: /tmp/rust_test_output.txt"
    RUST_PASSED=false
fi

cd "$PROJECT_ROOT"

# =============================================================================
# Test 2: TypeScript Extension
# =============================================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  TEST 2: TypeScript Extension Command Contract${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd vscode-extension

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found, installing dependencies...${NC}"
    npm install
fi

# Run TypeScript tests
if npm test -- --grep "Command Contract Tests" 2>&1 | tee /tmp/ts_test_output.txt; then
    echo ""
    echo -e "${GREEN}✅ TypeScript command contract tests PASSED${NC}"
    TS_PASSED=true
else
    echo ""
    echo -e "${RED}❌ TypeScript command contract tests FAILED${NC}"
    echo ""
    echo "To see full output, check: /tmp/ts_test_output.txt"
    TS_PASSED=false
fi

cd "$PROJECT_ROOT"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo "================================================"
echo "  📊 Test Summary"
echo "================================================"
echo ""

if [ "$RUST_PASSED" = true ] && [ "$TS_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL COMMAND CONTRACT TESTS PASSED${NC}"
    echo ""
    echo "✓ Rust LSP server commands match schema"
    echo "✓ TypeScript extension commands match schema"
    echo ""
    echo "The extension and server are using the same command names."
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""

    if [ "$RUST_PASSED" = false ]; then
        echo -e "${RED}✗${NC} Rust LSP server tests failed"
        echo "  Check: lsp-server/src/server.rs"
        echo "  Ensure all commands in lsp-commands.schema.json are handled"
    else
        echo -e "${GREEN}✓${NC} Rust LSP server tests passed"
    fi

    if [ "$TS_PASSED" = false ]; then
        echo -e "${RED}✗${NC} TypeScript extension tests failed"
        echo "  Check: vscode-extension/src/bundleTreeProvider.ts"
        echo "  Check: vscode-extension/src/extension.ts"
        echo "  Ensure all commands use names from lsp-commands.schema.json"
    else
        echo -e "${GREEN}✓${NC} TypeScript extension tests passed"
    fi

    echo ""
    echo "Common issues:"
    echo "  • Command name mismatch (e.g., 'logScout.bundle.X' vs 'scout/bundle/X')"
    echo "  • Commands defined in schema but not implemented"
    echo "  • Commands implemented but not in schema"
    echo ""
    exit 1
fi
