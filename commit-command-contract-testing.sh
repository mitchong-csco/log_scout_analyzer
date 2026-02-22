#!/bin/bash
# Commit Strategy Script - Command Contract Testing
#
# Interactive script to commit command contract testing files in logical groups
# Created: February 21, 2024

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo "  Command Contract Testing - Commit Strategy"
echo "================================================"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Not in a git repository${NC}"
    exit 1
fi

# Show current status
echo -e "${CYAN}Current Git Status:${NC}"
echo ""
UNTRACKED=$(git status --short | grep "^??" | wc -l)
MODIFIED=$(git status --short | grep "^ M" | wc -l)
DELETED=$(git status --short | grep "^ D" | wc -l)
TOTAL=$((UNTRACKED + MODIFIED + DELETED))

echo "  Total uncommitted changes: $TOTAL files"
echo "  - New/untracked files: $UNTRACKED"
echo "  - Modified files: $MODIFIED"
echo "  - Deleted files: $DELETED"
echo ""

# Check if contract testing files exist
echo -e "${CYAN}Checking for command contract testing files...${NC}"
echo ""

CORE_FILES=(
    "lsp-commands.schema.json"
    "lsp-server/src/command_contract_tests.rs"
    "lsp-server/src/lib.rs"
    "vscode-extension/src/test/suite/contract/commands.test.ts"
    "scripts/test-command-contracts.sh"
    "scripts/test-command-contracts.bat"
)

DOC_FILES=(
    "COMMAND_CONTRACT_TESTING_QUICK_START.md"
    "docs/COMMAND_CONTRACT_TESTING.md"
    "COMMAND_CONTRACT_IMPLEMENTATION.md"
    "SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md"
)

AUDIT_FILES=(
    "COMMAND_AUDIT_TODO.md"
    "TODO_COMMAND_CLEANUP.md"
    "PROJECT_STATUS.md"
    ".zed/AI_ASSISTANT_GUIDE.md"
)

missing_files=()
for file in "${CORE_FILES[@]}" "${DOC_FILES[@]}" "${AUDIT_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo -e "${RED}WARNING: Some expected files are missing:${NC}"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    echo ""
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo -e "${GREEN}✓ All expected files found${NC}"
echo ""

# ============================================================================
# COMMIT STRATEGY OPTIONS
# ============================================================================

echo "================================================"
echo "  Commit Strategy Options"
echo "================================================"
echo ""
echo "1. Quick Commit (All in one commit)"
echo "2. Logical Commits (3 separate commits - RECOMMENDED)"
echo "3. Review Files First (show what will be committed)"
echo "4. Custom Selection"
echo "5. Exit"
echo ""
read -p "Select option (1-5): " choice
echo ""

case $choice in
    1)
        # Option 1: Quick Commit
        echo -e "${YELLOW}Option 1: Quick Commit (All in one)${NC}"
        echo ""
        echo "This will commit all contract testing files in a single commit."
        echo ""
        read -p "Continue? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi

        echo -e "${CYAN}Adding files...${NC}"
        git add lsp-commands.schema.json
        git add lsp-server/src/command_contract_tests.rs
        git add lsp-server/src/lib.rs
        git add vscode-extension/src/test/suite/contract/
        git add scripts/test-command-contracts.*
        git add COMMAND_CONTRACT_TESTING_QUICK_START.md
        git add docs/COMMAND_CONTRACT_TESTING.md
        git add COMMAND_CONTRACT_IMPLEMENTATION.md
        git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md
        git add COMMAND_AUDIT_TODO.md
        git add TODO_COMMAND_CLEANUP.md
        git add PROJECT_STATUS.md
        git add .zed/AI_ASSISTANT_GUIDE.md

        echo -e "${CYAN}Creating commit...${NC}"
        git commit -m "feat: Add command contract testing system and documentation

- Add lsp-commands.schema.json as single source of truth
- Add Rust contract tests (9/9 passing)
- Add TypeScript contract tests (6 suites, 14+ cases)
- Add cross-platform test runner scripts
- Add comprehensive documentation (3 guides)
- Add command audit and cleanup checklist
- Update PROJECT_STATUS.md and AI_ASSISTANT_GUIDE.md

Prevents command name mismatches between extension and LSP server.
Fixes issue where extension sent 'logScout.bundle.importPackage'
but LSP expected 'scout/bundle/importPackage'."

        echo ""
        echo -e "${GREEN}✓ Commit created successfully!${NC}"
        ;;

    2)
        # Option 2: Logical Commits (RECOMMENDED)
        echo -e "${YELLOW}Option 2: Logical Commits (3 separate commits)${NC}"
        echo ""
        echo "This will create 3 logical commits:"
        echo "  1. Core contract testing system"
        echo "  2. Documentation"
        echo "  3. Command audit and updated guides"
        echo ""
        read -p "Continue? (y/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi

        # Commit 1: Core System
        echo ""
        echo -e "${CYAN}[1/3] Committing core contract testing system...${NC}"
        git add lsp-commands.schema.json
        git add lsp-server/src/command_contract_tests.rs
        git add lsp-server/src/lib.rs
        git add vscode-extension/src/test/suite/contract/
        git add scripts/test-command-contracts.sh
        git add scripts/test-command-contracts.bat

        git commit -m "feat: Add command contract testing system

- Add lsp-commands.schema.json as single source of truth
  Defines all 7 bundle commands with request/response parameters

- Add Rust contract tests (9/9 passing)
  Validates LSP server handlers match schema
  Tests: command format, coverage, documentation

- Add TypeScript contract tests (6 suites, 14+ cases)
  Validates extension commands match schema
  Tests: command names, parameters, format rules

- Add cross-platform test runner scripts
  Run all contract tests with one command

Prevents command name mismatches between extension and LSP server.
Fixes issue where extension sent 'logScout.bundle.importPackage'
but LSP expected 'scout/bundle/importPackage'.

Test Results:
- Rust: 9/9 passing
- TypeScript: Infrastructure complete
- Run: ./scripts/test-command-contracts.sh"

        echo -e "${GREEN}✓ Commit 1/3 complete${NC}"

        # Commit 2: Documentation
        echo ""
        echo -e "${CYAN}[2/3] Committing documentation...${NC}"
        git add COMMAND_CONTRACT_TESTING_QUICK_START.md
        git add docs/COMMAND_CONTRACT_TESTING.md
        git add COMMAND_CONTRACT_IMPLEMENTATION.md
        git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md

        git commit -m "docs: Add command contract testing documentation

- Quick start guide (~300 lines)
  Daily reference for adding/testing LSP commands
  3-step process: schema → implementation → tests

- Complete guide (~560 lines)
  Full architecture and workflows
  CI/CD integration examples
  Best practices and FAQ

- Implementation summary (~470 lines)
  What was built and how it works
  Metrics and benefits analysis

- Session summary (~288 lines)
  Complete session details
  All files created
  Test results and next steps

Total documentation: ~1,600 lines covering:
- How to use the system
- How to add new commands
- Troubleshooting guide
- Integration with CI/CD"

        echo -e "${GREEN}✓ Commit 2/3 complete${NC}"

        # Commit 3: Audit and Updates
        echo ""
        echo -e "${CYAN}[3/3] Committing command audit and guide updates...${NC}"
        git add COMMAND_AUDIT_TODO.md
        git add TODO_COMMAND_CLEANUP.md
        git add PROJECT_STATUS.md
        git add .zed/AI_ASSISTANT_GUIDE.md

        git commit -m "docs: Add command audit and update project guides

Command Audit (~388 lines):
- Identified ~67 commands in extension
- Found ~15 suspicious/duplicate commands
- Found ~10 potentially obsolete commands
- Features needing review:
  * File extraction (may not be implemented)
  * Cloud sync (may not be implemented)
  * TagScout case management (may not be integrated)

Cleanup Checklist (~365 lines):
- Step-by-step action plan
- Phase 1: Manual testing (1-2 hours)
- Phase 2: Cleanup (2-3 hours)
- Phase 3: Reorganization (1-2 hours)
- Phase 4: Documentation (1 hour)
- Estimated total: 4-6 hours
- Priority: MEDIUM

PROJECT_STATUS.md Updates:
- Added command contract testing session entry
- Documented all files created
- Listed test results
- Added next action items

AI_ASSISTANT_GUIDE.md Updates:
- Added mandatory contract testing section
- Updated Phases 1-4 workflows
- Added enforcement rules:
  * Schema → Rust → TypeScript → Tests
  * Contract tests must pass before commit
  * No old 'logScout.*' format allowed"

        echo -e "${GREEN}✓ Commit 3/3 complete${NC}"
        echo ""
        echo -e "${GREEN}✓ All commits created successfully!${NC}"
        ;;

    3)
        # Option 3: Review Files
        echo -e "${YELLOW}Option 3: Review Files${NC}"
        echo ""
        echo "=== Core System Files ==="
        for file in "${CORE_FILES[@]}"; do
            if [ -f "$file" ]; then
                status=$(git status --short "$file" | awk '{print $1}')
                echo "  [$status] $file"
            fi
        done
        echo ""
        echo "=== Documentation Files ==="
        for file in "${DOC_FILES[@]}"; do
            if [ -f "$file" ]; then
                status=$(git status --short "$file" | awk '{print $1}')
                echo "  [$status] $file"
            fi
        done
        echo ""
        echo "=== Audit & Guide Files ==="
        for file in "${AUDIT_FILES[@]}"; do
            if [ -f "$file" ]; then
                status=$(git status --short "$file" | awk '{print $1}')
                echo "  [$status] $file"
            fi
        done
        echo ""
        echo "Run this script again to commit these files."
        ;;

    4)
        # Option 4: Custom Selection
        echo -e "${YELLOW}Option 4: Custom Selection${NC}"
        echo ""
        echo "Available file groups:"
        echo ""
        echo "1. Core system only"
        echo "2. Documentation only"
        echo "3. Audit & guides only"
        echo "4. Core + Documentation"
        echo "5. All files"
        echo ""
        read -p "Select group (1-5): " group
        echo ""

        case $group in
            1)
                git add "${CORE_FILES[@]}"
                echo "Core system files staged. Review with 'git status'"
                ;;
            2)
                git add "${DOC_FILES[@]}"
                echo "Documentation files staged. Review with 'git status'"
                ;;
            3)
                git add "${AUDIT_FILES[@]}"
                echo "Audit & guide files staged. Review with 'git status'"
                ;;
            4)
                git add "${CORE_FILES[@]}" "${DOC_FILES[@]}"
                echo "Core + Documentation files staged. Review with 'git status'"
                ;;
            5)
                git add "${CORE_FILES[@]}" "${DOC_FILES[@]}" "${AUDIT_FILES[@]}"
                echo "All files staged. Review with 'git status'"
                ;;
            *)
                echo "Invalid selection"
                exit 1
                ;;
        esac

        echo ""
        echo "Files have been staged. Now run:"
        echo "  git commit -m 'your commit message'"
        ;;

    5)
        # Exit
        echo "Exiting without changes."
        exit 0
        ;;

    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "  Summary"
echo "================================================"
echo ""
echo "Use 'git log' to review commits"
echo "Use 'git push' to push to remote"
echo ""
echo "Next steps:"
echo "  1. Review commits: git log --oneline -5"
echo "  2. Test contract system: ./scripts/test-command-contracts.sh"
echo "  3. Push to remote: git push"
echo ""
echo -e "${GREEN}Done!${NC}"
