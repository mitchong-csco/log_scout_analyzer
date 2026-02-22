@echo off
REM Comprehensive Commit Strategy - All Uncommitted Files
REM
REM Interactive script to organize and commit all 261+ uncommitted files
REM Created: February 21, 2024
REM
REM This script analyzes all uncommitted files and suggests logical commit groups

setlocal enabledelayedexpansion

echo.
echo ================================================================
echo   Comprehensive Commit Strategy - All Uncommitted Files
echo ================================================================
echo.
echo This script will help you commit all uncommitted changes in logical groups.
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Not in a git repository
    exit /b 1
)

REM Show current status
echo Analyzing uncommitted files...
echo.

for /f %%i in ('git status --short ^| find /c /v ""') do set TOTAL=%%i
for /f %%i in ('git status --short ^| find "??" ^| find /c /v ""') do set UNTRACKED=%%i
for /f %%i in ('git status --short ^| find " M" ^| find /c /v ""') do set MODIFIED=%%i
for /f %%i in ('git status --short ^| find " D" ^| find /c /v ""') do set DELETED=%%i

echo Current Git Status:
echo   Total uncommitted changes: %TOTAL% files
echo   - New/untracked files: %UNTRACKED%
echo   - Modified files: %MODIFIED%
echo   - Deleted files: %DELETED%
echo.

REM ============================================================================
REM COMMIT STRATEGY OPTIONS
REM ============================================================================

echo ================================================================
echo   Commit Strategy Options
echo ================================================================
echo.
echo 1. Auto-Categorize and Commit (RECOMMENDED)
echo    - Analyzes files by type and creates logical commits
echo    - Skips build outputs and temp files
echo    - Creates separate commits for docs, source, tests, etc.
echo.
echo 2. Review Categories First
echo    - Shows what files are in each category
echo    - No commits made
echo.
echo 3. Interactive Selection
echo    - Choose which categories to commit
echo    - Full control over what gets committed
echo.
echo 4. Manual Categorization
echo    - Guide you through organizing files manually
echo    - Most control but takes longest
echo.
echo 5. Create .gitignore for Build Outputs
echo    - Add common build outputs to .gitignore
echo    - Prevents committing generated files
echo.
echo 6. Exit
echo.
set /p CHOICE="Select option (1-6): "
echo.

if "%CHOICE%"=="1" goto AUTO_CATEGORIZE
if "%CHOICE%"=="2" goto REVIEW_CATEGORIES
if "%CHOICE%"=="3" goto INTERACTIVE_SELECTION
if "%CHOICE%"=="4" goto MANUAL_CATEGORIZATION
if "%CHOICE%"=="5" goto CREATE_GITIGNORE
if "%CHOICE%"=="6" goto EXIT
echo [ERROR] Invalid option
exit /b 1

REM ============================================================================
REM OPTION 1: AUTO-CATEGORIZE AND COMMIT
REM ============================================================================

:AUTO_CATEGORIZE
echo ================================================================
echo   Option 1: Auto-Categorize and Commit
echo ================================================================
echo.
echo This will analyze all files and create logical commits:
echo.
echo   1. Documentation (*.md files in project root)
echo   2. Documentation (*.md files in docs/)
echo   3. Source Code Changes (*.ts, *.rs modified files)
echo   4. Test Files (test-related files)
echo   5. Configuration (*.json, *.toml files)
echo   6. Scripts (*.bat, *.sh, *.js utility scripts)
echo   7. Deleted Files
echo.
echo Files that will be SKIPPED (not committed):
echo   - Build outputs (out/, target/, *.vsix, binaries)
echo   - Test outputs (.vscode-test/, test_output.txt)
echo   - Temp files (nul, logs/, .log-scout/)
echo   - Cache files (.tagscout_cache/)
echo.
set /p CONFIRM="Continue with auto-categorization? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

echo.
echo Step 1: Creating .gitignore for build outputs...

REM Create or append to .gitignore
if not exist .gitignore (
    echo Creating .gitignore...
) else (
    echo Updating .gitignore...
)

(
echo # Build Outputs
echo vscode-extension/out/
echo vscode-extension/*.vsix
echo vscode-extension/bin/*.exe
echo lsp-server/target/
echo target/
echo *.exe
echo.
echo # Test Outputs
echo .vscode-test/
echo test_output.txt
echo full_test_output.txt
echo test-results.json
echo.
echo # Temp Files
echo nul
echo logs/
echo .log-scout/
echo.
echo # Cache
echo .tagscout_cache/
echo.
echo # Node modules
echo node_modules/
) >> .gitignore

git add .gitignore
echo [OK] .gitignore updated

echo.
echo Step 2: Committing documentation files (project root)...
git add *.md 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "docs: Update project documentation" -m "- Session summaries and status updates" -m "- Implementation guides and references" -m "- Quick start guides and checklists" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Root documentation committed
    ) else (
        echo [SKIP] No root documentation changes to commit
    )
) else (
    echo [SKIP] No root documentation files
)

echo.
echo Step 3: Committing documentation files (docs/)...
git add docs/*.md 2>nul
git add docs/ai-session-logs/*.md 2>nul
git add docs/integration-plan/*.md 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "docs: Update documentation directory" -m "- Architecture documentation" -m "- Session logs and analysis" -m "- Integration plans and blueprints" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] docs/ directory committed
    ) else (
        echo [SKIP] No docs/ changes to commit
    )
) else (
    echo [SKIP] No docs/ files
)

echo.
echo Step 4: Committing Rust source code changes...
git add lsp-server/src/*.rs 2>nul
git add lsp-server/examples/*.rs 2>nul
git add crates/*/src/*.rs 2>nul
git add crates/*/examples/*.rs 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "feat: Update Rust LSP server implementation" -m "- Pattern engine improvements" -m "- Bundle management enhancements" -m "- TagScout integration updates" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Rust source code committed
    ) else (
        echo [SKIP] No Rust source changes to commit
    )
) else (
    echo [SKIP] No Rust source files
)

echo.
echo Step 5: Committing TypeScript source code changes...
git add vscode-extension/src/*.ts 2>nul
git add vscode-extension/src/**/*.ts 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "feat: Update TypeScript extension implementation" -m "- UI/UX improvements" -m "- Bundle tree provider updates" -m "- LSP client enhancements" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] TypeScript source code committed
    ) else (
        echo [SKIP] No TypeScript source changes to commit
    )
) else (
    echo [SKIP] No TypeScript source files
)

echo.
echo Step 6: Committing test files...
git add vscode-extension/src/test/**/*.ts 2>nul
git add vscode-extension/test*.js 2>nul
git add vscode-extension/run-*.js 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "test: Update test suite" -m "- Add new test cases" -m "- Update test infrastructure" -m "- Fix test blockers" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Test files committed
    ) else (
        echo [SKIP] No test changes to commit
    )
) else (
    echo [SKIP] No test files
)

echo.
echo Step 7: Committing configuration files...
git add *.toml 2>nul
git add *.json 2>nul
git add vscode-extension/package.json 2>nul
git add vscode-extension/.eslintrc.json 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "chore: Update configuration files" -m "- Package dependencies" -m "- Build configuration" -m "- Linter settings" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Configuration files committed
    ) else (
        echo [SKIP] No configuration changes to commit
    )
) else (
    echo [SKIP] No configuration files
)

echo.
echo Step 8: Committing utility scripts...
git add vscode-extension/*.js 2>nul
git add vscode-extension/scripts/*.js 2>nul
git add zed-extension/*.js 2>nul
git add *.bat 2>nul
git add *.sh 2>nul
git add scripts/*.bat 2>nul
git add scripts/*.sh 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "chore: Update utility scripts" -m "- Build and deploy scripts" -m "- Test runners" -m "- Development tools" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Utility scripts committed
    ) else (
        echo [SKIP] No script changes to commit
    )
) else (
    echo [SKIP] No utility scripts
)

echo.
echo Step 9: Committing Zed extension updates...
git add zed-extension/*.md 2>nul
git add zed-extension/package.json 2>nul
git add zed-extension/README.md 2>nul
if %ERRORLEVEL%==0 (
    git commit -m "feat: Update Zed extension" -m "- Documentation updates" -m "- Build automation" -m "- Package configuration" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Zed extension committed
    ) else (
        echo [SKIP] No Zed extension changes to commit
    )
) else (
    echo [SKIP] No Zed extension files
)

echo.
echo Step 10: Handling deleted files...
for /f "tokens=*" %%f in ('git status --short ^| find " D"') do (
    set HAS_DELETED=1
    goto FOUND_DELETED
)
:FOUND_DELETED
if defined HAS_DELETED (
    git add -u 2>nul
    git commit -m "chore: Remove obsolete files" -m "- Clean up deleted files" -m "- Remove old build artifacts" 2>nul
    if %ERRORLEVEL%==0 (
        echo [OK] Deleted files committed
    ) else (
        echo [SKIP] No deletions to commit
    )
) else (
    echo [SKIP] No deleted files
)

echo.
echo ================================================================
echo   Auto-Categorization Complete!
echo ================================================================
echo.
echo Summary of commits created:
git log --oneline -10
echo.
echo Remaining uncommitted files (if any):
git status --short
echo.
goto END

REM ============================================================================
REM OPTION 2: REVIEW CATEGORIES
REM ============================================================================

:REVIEW_CATEGORIES
echo ================================================================
echo   Option 2: Review Categories
echo ================================================================
echo.

echo === Documentation (Project Root) ===
git status --short | find ".md" | find /v "docs/" | find /v "vscode-extension/" | find /v "zed-extension/"
echo.

echo === Documentation (docs/) ===
git status --short | find "docs/"
echo.

echo === Rust Source Code ===
git status --short | find ".rs" | find "lsp-server/src" | find /v "target/"
git status --short | find ".rs" | find "crates/"
echo.

echo === TypeScript Source Code ===
git status --short | find ".ts" | find "vscode-extension/src" | find /v "test"
echo.

echo === Test Files ===
git status --short | find "test"
echo.

echo === Configuration Files ===
git status --short | find ".json"
git status --short | find ".toml"
echo.

echo === Scripts ===
git status --short | find ".bat"
git status --short | find ".sh"
git status --short | find ".js" | find /v "out/" | find /v "node_modules/"
echo.

echo === Build Outputs (Should be ignored) ===
git status --short | find "out/"
git status --short | find "target/"
git status --short | find ".vsix"
git status --short | find ".exe"
echo.

echo === Temp Files (Should be ignored) ===
git status --short | find "nul"
git status --short | find "logs/"
git status --short | find ".vscode-test"
echo.

echo === Deleted Files ===
git status --short | find " D"
echo.

echo.
echo Review complete. Run this script again to commit files.
goto END

REM ============================================================================
REM OPTION 3: INTERACTIVE SELECTION
REM ============================================================================

:INTERACTIVE_SELECTION
echo ================================================================
echo   Option 3: Interactive Selection
echo ================================================================
echo.
echo Select which categories to commit:
echo.
echo 1. Documentation (root *.md files)
echo 2. Documentation (docs/ directory)
echo 3. Rust source code
echo 4. TypeScript source code
echo 5. Test files
echo 6. Configuration files
echo 7. Utility scripts
echo 8. Zed extension
echo 9. Deleted files
echo 10. All of the above
echo 11. Cancel
echo.
set /p SELECT="Enter numbers separated by spaces (e.g., 1 3 5): "
echo.

echo You selected: %SELECT%
echo.
set /p CONFIRM="Continue with these selections? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

REM Process selections
echo %SELECT% | find "1" >nul && (
    echo Committing root documentation...
    git add *.md 2>nul
    git commit -m "docs: Update project documentation" 2>nul
    echo [OK] Root documentation committed
)

echo %SELECT% | find "2" >nul && (
    echo Committing docs/ directory...
    git add docs/*.md 2>nul
    git commit -m "docs: Update documentation directory" 2>nul
    echo [OK] docs/ committed
)

echo %SELECT% | find "3" >nul && (
    echo Committing Rust source code...
    git add lsp-server/src/*.rs crates/*/src/*.rs 2>nul
    git commit -m "feat: Update Rust LSP server implementation" 2>nul
    echo [OK] Rust source committed
)

echo %SELECT% | find "4" >nul && (
    echo Committing TypeScript source code...
    git add vscode-extension/src/*.ts vscode-extension/src/**/*.ts 2>nul
    git commit -m "feat: Update TypeScript extension implementation" 2>nul
    echo [OK] TypeScript source committed
)

echo %SELECT% | find "5" >nul && (
    echo Committing test files...
    git add vscode-extension/src/test/**/*.ts vscode-extension/test*.js 2>nul
    git commit -m "test: Update test suite" 2>nul
    echo [OK] Test files committed
)

echo %SELECT% | find "6" >nul && (
    echo Committing configuration files...
    git add *.toml *.json vscode-extension/package.json 2>nul
    git commit -m "chore: Update configuration files" 2>nul
    echo [OK] Configuration committed
)

echo %SELECT% | find "7" >nul && (
    echo Committing utility scripts...
    git add *.bat *.sh vscode-extension/*.js scripts/*.* 2>nul
    git commit -m "chore: Update utility scripts" 2>nul
    echo [OK] Scripts committed
)

echo %SELECT% | find "8" >nul && (
    echo Committing Zed extension...
    git add zed-extension/*.md zed-extension/package.json 2>nul
    git commit -m "feat: Update Zed extension" 2>nul
    echo [OK] Zed extension committed
)

echo %SELECT% | find "9" >nul && (
    echo Committing deleted files...
    git add -u 2>nul
    git commit -m "chore: Remove obsolete files" 2>nul
    echo [OK] Deleted files committed
)

echo %SELECT% | find "10" >nul && (
    echo Committing all categories...
    goto AUTO_CATEGORIZE
)

echo.
echo Interactive selection complete!
goto END

REM ============================================================================
REM OPTION 4: MANUAL CATEGORIZATION
REM ============================================================================

:MANUAL_CATEGORIZATION
echo ================================================================
echo   Option 4: Manual Categorization
echo ================================================================
echo.
echo This mode provides step-by-step guidance for organizing files.
echo.
echo Current uncommitted files will be shown by category.
echo For each category, you can:
echo   - Stage files (git add)
echo   - Skip the category
echo   - View file contents
echo.
echo This is the most flexible but slowest method.
echo.
set /p CONFIRM="Continue with manual categorization? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

echo.
echo Manual categorization mode not yet implemented.
echo Please use Option 1 (Auto-Categorize) or Option 3 (Interactive) instead.
echo.
goto END

REM ============================================================================
REM OPTION 5: CREATE GITIGNORE
REM ============================================================================

:CREATE_GITIGNORE
echo ================================================================
echo   Option 5: Create/Update .gitignore
echo ================================================================
echo.
echo This will add common build outputs and temp files to .gitignore
echo.

if exist .gitignore (
    echo Current .gitignore exists. Contents:
    type .gitignore
    echo.
    set /p CONFIRM="Append to existing .gitignore? (y/n): "
) else (
    echo No .gitignore found. Creating new one.
    set CONFIRM=y
)

if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    exit /b 0
)

echo.
echo Adding entries to .gitignore...

(
echo.
echo # Build Outputs - Added by commit-all-uncommitted.bat
echo vscode-extension/out/
echo vscode-extension/*.vsix
echo vscode-extension/bin/*.exe
echo lsp-server/target/
echo target/
echo *.exe
echo.
echo # Test Outputs
echo .vscode-test/
echo test_output.txt
echo full_test_output.txt
echo test-results.json
echo vscode-extension/logs/
echo.
echo # Temp Files
echo nul
echo logs/
echo .log-scout/
echo.
echo # Cache
echo .tagscout_cache/
echo.
echo # Node modules
echo node_modules/
echo.
echo # OS Files
echo .DS_Store
echo Thumbs.db
echo desktop.ini
) >> .gitignore

echo [OK] .gitignore updated
echo.
echo New entries added:
echo   - Build outputs (out/, target/, *.vsix, *.exe)
echo   - Test outputs (.vscode-test/, test results)
echo   - Temp files (nul, logs/)
echo   - Cache (.tagscout_cache/)
echo   - Node modules
echo   - OS files
echo.
echo Now commit the .gitignore:
echo   git add .gitignore
echo   git commit -m "chore: Update .gitignore for build outputs"
echo.
goto END

REM ============================================================================
REM EXIT
REM ============================================================================

:EXIT
echo Exiting without changes.
exit /b 0

:END
echo.
echo ================================================================
echo   Summary
echo ================================================================
echo.
echo Use 'git log' to review commits
echo Use 'git status' to see remaining uncommitted files
echo Use 'git push' to push to remote
echo.
echo Recommendations:
echo   1. Review commits: git log --oneline -10
echo   2. Check remaining files: git status --short
echo   3. Update .gitignore if needed (Option 5)
echo   4. Push to remote: git push
echo.
echo Done!
