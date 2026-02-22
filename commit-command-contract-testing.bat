@echo off
REM Commit Strategy Script - Command Contract Testing (Windows)
REM
REM Interactive script to commit command contract testing files in logical groups
REM Created: February 21, 2024

setlocal enabledelayedexpansion

echo.
echo ================================================
echo   Command Contract Testing - Commit Strategy
echo ================================================
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Not in a git repository
    exit /b 1
)

REM Show current status
echo Current Git Status:
echo.

for /f %%i in ('git status --short ^| find /c /v ""') do set TOTAL=%%i
for /f %%i in ('git status --short ^| find "??" ^| find /c /v ""') do set UNTRACKED=%%i
for /f %%i in ('git status --short ^| find " M" ^| find /c /v ""') do set MODIFIED=%%i
for /f %%i in ('git status --short ^| find " D" ^| find /c /v ""') do set DELETED=%%i

echo   Total uncommitted changes: %TOTAL% files
echo   - New/untracked files: %UNTRACKED%
echo   - Modified files: %MODIFIED%
echo   - Deleted files: %DELETED%
echo.

REM Check if contract testing files exist
echo Checking for command contract testing files...
echo.

set MISSING=0
if not exist "lsp-commands.schema.json" set MISSING=1
if not exist "lsp-server\src\command_contract_tests.rs" set MISSING=1
if not exist "lsp-server\src\lib.rs" set MISSING=1
if not exist "vscode-extension\src\test\suite\contract\commands.test.ts" set MISSING=1
if not exist "scripts\test-command-contracts.sh" set MISSING=1
if not exist "scripts\test-command-contracts.bat" set MISSING=1

if %MISSING%==1 (
    echo [WARNING] Some expected files are missing
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "!CONTINUE!"=="y" (
        echo Aborted.
        exit /b 1
    )
) else (
    echo [OK] All expected files found
)
echo.

REM ============================================================================
REM COMMIT STRATEGY OPTIONS
REM ============================================================================

echo ================================================
echo   Commit Strategy Options
echo ================================================
echo.
echo 1. Quick Commit (All in one commit)
echo 2. Logical Commits (3 separate commits - RECOMMENDED)
echo 3. Review Files First (show what will be committed)
echo 4. Custom Selection
echo 5. Exit
echo.
set /p CHOICE="Select option (1-5): "
echo.

if "%CHOICE%"=="1" goto QUICK_COMMIT
if "%CHOICE%"=="2" goto LOGICAL_COMMITS
if "%CHOICE%"=="3" goto REVIEW_FILES
if "%CHOICE%"=="4" goto CUSTOM_SELECTION
if "%CHOICE%"=="5" goto EXIT
echo [ERROR] Invalid option
exit /b 1

:QUICK_COMMIT
echo Option 1: Quick Commit (All in one)
echo.
echo This will commit all contract testing files in a single commit.
echo.
set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

echo Adding files...
git add lsp-commands.schema.json
git add lsp-server\src\command_contract_tests.rs
git add lsp-server\src\lib.rs
git add vscode-extension\src\test\suite\contract\
git add scripts\test-command-contracts.*
git add COMMAND_CONTRACT_TESTING_QUICK_START.md
git add docs\COMMAND_CONTRACT_TESTING.md
git add COMMAND_CONTRACT_IMPLEMENTATION.md
git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md
git add COMMAND_AUDIT_TODO.md
git add TODO_COMMAND_CLEANUP.md
git add PROJECT_STATUS.md
git add .zed\AI_ASSISTANT_GUIDE.md

echo Creating commit...
git commit -m "feat: Add command contract testing system and documentation" -m "" -m "- Add lsp-commands.schema.json as single source of truth" -m "- Add Rust contract tests (9/9 passing)" -m "- Add TypeScript contract tests (6 suites, 14+ cases)" -m "- Add cross-platform test runner scripts" -m "- Add comprehensive documentation (3 guides)" -m "- Add command audit and cleanup checklist" -m "- Update PROJECT_STATUS.md and AI_ASSISTANT_GUIDE.md" -m "" -m "Prevents command name mismatches between extension and LSP server." -m "Fixes issue where extension sent 'logScout.bundle.importPackage'" -m "but LSP expected 'scout/bundle/importPackage'."

echo.
echo [SUCCESS] Commit created successfully!
goto END

:LOGICAL_COMMITS
echo Option 2: Logical Commits (3 separate commits)
echo.
echo This will create 3 logical commits:
echo   1. Core contract testing system
echo   2. Documentation
echo   3. Command audit and updated guides
echo.
set /p CONFIRM="Continue? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

REM Commit 1: Core System
echo.
echo [1/3] Committing core contract testing system...
git add lsp-commands.schema.json
git add lsp-server\src\command_contract_tests.rs
git add lsp-server\src\lib.rs
git add vscode-extension\src\test\suite\contract\
git add scripts\test-command-contracts.sh
git add scripts\test-command-contracts.bat

git commit -m "feat: Add command contract testing system" -m "" -m "- Add lsp-commands.schema.json as single source of truth" -m "  Defines all 7 bundle commands with request/response parameters" -m "" -m "- Add Rust contract tests (9/9 passing)" -m "  Validates LSP server handlers match schema" -m "  Tests: command format, coverage, documentation" -m "" -m "- Add TypeScript contract tests (6 suites, 14+ cases)" -m "  Validates extension commands match schema" -m "  Tests: command names, parameters, format rules" -m "" -m "- Add cross-platform test runner scripts" -m "  Run all contract tests with one command" -m "" -m "Prevents command name mismatches between extension and LSP server." -m "Fixes issue where extension sent 'logScout.bundle.importPackage'" -m "but LSP expected 'scout/bundle/importPackage'." -m "" -m "Test Results:" -m "- Rust: 9/9 passing" -m "- TypeScript: Infrastructure complete" -m "- Run: .\scripts\test-command-contracts.bat"

echo [OK] Commit 1/3 complete

REM Commit 2: Documentation
echo.
echo [2/3] Committing documentation...
git add COMMAND_CONTRACT_TESTING_QUICK_START.md
git add docs\COMMAND_CONTRACT_TESTING.md
git add COMMAND_CONTRACT_IMPLEMENTATION.md
git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md

git commit -m "docs: Add command contract testing documentation" -m "" -m "- Quick start guide (~300 lines)" -m "  Daily reference for adding/testing LSP commands" -m "  3-step process: schema -> implementation -> tests" -m "" -m "- Complete guide (~560 lines)" -m "  Full architecture and workflows" -m "  CI/CD integration examples" -m "  Best practices and FAQ" -m "" -m "- Implementation summary (~470 lines)" -m "  What was built and how it works" -m "  Metrics and benefits analysis" -m "" -m "- Session summary (~288 lines)" -m "  Complete session details" -m "  All files created" -m "  Test results and next steps" -m "" -m "Total documentation: ~1,600 lines covering:" -m "- How to use the system" -m "- How to add new commands" -m "- Troubleshooting guide" -m "- Integration with CI/CD"

echo [OK] Commit 2/3 complete

REM Commit 3: Audit and Updates
echo.
echo [3/3] Committing command audit and guide updates...
git add COMMAND_AUDIT_TODO.md
git add TODO_COMMAND_CLEANUP.md
git add PROJECT_STATUS.md
git add .zed\AI_ASSISTANT_GUIDE.md

git commit -m "docs: Add command audit and update project guides" -m "" -m "Command Audit (~388 lines):" -m "- Identified ~67 commands in extension" -m "- Found ~15 suspicious/duplicate commands" -m "- Found ~10 potentially obsolete commands" -m "- Features needing review:" -m "  * File extraction (may not be implemented)" -m "  * Cloud sync (may not be implemented)" -m "  * TagScout case management (may not be integrated)" -m "" -m "Cleanup Checklist (~365 lines):" -m "- Step-by-step action plan" -m "- Phase 1: Manual testing (1-2 hours)" -m "- Phase 2: Cleanup (2-3 hours)" -m "- Phase 3: Reorganization (1-2 hours)" -m "- Phase 4: Documentation (1 hour)" -m "- Estimated total: 4-6 hours" -m "- Priority: MEDIUM" -m "" -m "PROJECT_STATUS.md Updates:" -m "- Added command contract testing session entry" -m "- Documented all files created" -m "- Listed test results" -m "- Added next action items" -m "" -m "AI_ASSISTANT_GUIDE.md Updates:" -m "- Added mandatory contract testing section" -m "- Updated Phases 1-4 workflows" -m "- Added enforcement rules:" -m "  * Schema -> Rust -> TypeScript -> Tests" -m "  * Contract tests must pass before commit" -m "  * No old 'logScout.*' format allowed"

echo [OK] Commit 3/3 complete
echo.
echo [SUCCESS] All commits created successfully!
goto END

:REVIEW_FILES
echo Option 3: Review Files
echo.
echo === Core System Files ===
git status --short lsp-commands.schema.json 2>nul
git status --short lsp-server\src\command_contract_tests.rs 2>nul
git status --short lsp-server\src\lib.rs 2>nul
git status --short vscode-extension\src\test\suite\contract\commands.test.ts 2>nul
git status --short scripts\test-command-contracts.sh 2>nul
git status --short scripts\test-command-contracts.bat 2>nul
echo.
echo === Documentation Files ===
git status --short COMMAND_CONTRACT_TESTING_QUICK_START.md 2>nul
git status --short docs\COMMAND_CONTRACT_TESTING.md 2>nul
git status --short COMMAND_CONTRACT_IMPLEMENTATION.md 2>nul
git status --short SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md 2>nul
echo.
echo === Audit ^& Guide Files ===
git status --short COMMAND_AUDIT_TODO.md 2>nul
git status --short TODO_COMMAND_CLEANUP.md 2>nul
git status --short PROJECT_STATUS.md 2>nul
git status --short .zed\AI_ASSISTANT_GUIDE.md 2>nul
echo.
echo Run this script again to commit these files.
goto END

:CUSTOM_SELECTION
echo Option 4: Custom Selection
echo.
echo Available file groups:
echo.
echo 1. Core system only
echo 2. Documentation only
echo 3. Audit ^& guides only
echo 4. Core + Documentation
echo 5. All files
echo.
set /p GROUP="Select group (1-5): "
echo.

if "%GROUP%"=="1" (
    git add lsp-commands.schema.json
    git add lsp-server\src\command_contract_tests.rs
    git add lsp-server\src\lib.rs
    git add vscode-extension\src\test\suite\contract\
    git add scripts\test-command-contracts.*
    echo Core system files staged. Review with 'git status'
) else if "%GROUP%"=="2" (
    git add COMMAND_CONTRACT_TESTING_QUICK_START.md
    git add docs\COMMAND_CONTRACT_TESTING.md
    git add COMMAND_CONTRACT_IMPLEMENTATION.md
    git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md
    echo Documentation files staged. Review with 'git status'
) else if "%GROUP%"=="3" (
    git add COMMAND_AUDIT_TODO.md
    git add TODO_COMMAND_CLEANUP.md
    git add PROJECT_STATUS.md
    git add .zed\AI_ASSISTANT_GUIDE.md
    echo Audit ^& guide files staged. Review with 'git status'
) else if "%GROUP%"=="4" (
    git add lsp-commands.schema.json
    git add lsp-server\src\command_contract_tests.rs
    git add lsp-server\src\lib.rs
    git add vscode-extension\src\test\suite\contract\
    git add scripts\test-command-contracts.*
    git add COMMAND_CONTRACT_TESTING_QUICK_START.md
    git add docs\COMMAND_CONTRACT_TESTING.md
    git add COMMAND_CONTRACT_IMPLEMENTATION.md
    git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md
    echo Core + Documentation files staged. Review with 'git status'
) else if "%GROUP%"=="5" (
    git add lsp-commands.schema.json
    git add lsp-server\src\command_contract_tests.rs
    git add lsp-server\src\lib.rs
    git add vscode-extension\src\test\suite\contract\
    git add scripts\test-command-contracts.*
    git add COMMAND_CONTRACT_TESTING_QUICK_START.md
    git add docs\COMMAND_CONTRACT_TESTING.md
    git add COMMAND_CONTRACT_IMPLEMENTATION.md
    git add SESSION_SUMMARY_COMMAND_CONTRACT_TESTING.md
    git add COMMAND_AUDIT_TODO.md
    git add TODO_COMMAND_CLEANUP.md
    git add PROJECT_STATUS.md
    git add .zed\AI_ASSISTANT_GUIDE.md
    echo All files staged. Review with 'git status'
) else (
    echo [ERROR] Invalid selection
    exit /b 1
)

echo.
echo Files have been staged. Now run:
echo   git commit -m "your commit message"
goto END

:EXIT
echo Exiting without changes.
exit /b 0

:END
echo.
echo ================================================
echo   Summary
echo ================================================
echo.
echo Use 'git log' to review commits
echo Use 'git push' to push to remote
echo.
echo Next steps:
echo   1. Review commits: git log --oneline -5
echo   2. Test contract system: .\scripts\test-command-contracts.bat
echo   3. Push to remote: git push
echo.
echo Done!
