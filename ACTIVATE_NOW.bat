@echo off
REM ============================================
REM ACTIVATE GITHUB ACTIONS - SIMPLE VERSION
REM ============================================
REM
REM This script will commit and push all GitHub Actions files
REM to enable automated testing and CI/CD
REM
REM Date: February 17, 2026
REM ============================================

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║  GitHub Actions - Quick Activation               ║
echo ║  Log Scout Analyzer CI/CD Pipeline               ║
echo ╚═══════════════════════════════════════════════════╝
echo.

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Not in a git repository
    echo    Please run this from the project root directory
    pause
    exit /b 1
)

echo 📁 Current directory: %CD%
echo.

REM Show what will be committed
echo ═══════════════════════════════════════════════════
echo 📋 Files that will be committed:
echo ═══════════════════════════════════════════════════
echo.
echo   ✓ .github\workflows\ci.yml
echo   ✓ .github\workflows\advanced.yml
echo   ✓ .github\workflows\weekly.yml
echo   ✓ README.md (with status badges)
echo   ✓ GITHUB_ACTIONS_COMPLETE.md
echo   ✓ Related documentation
echo.

REM Ask for confirmation
echo ═══════════════════════════════════════════════════
set /p CONFIRM="Ready to activate? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo ❌ Activation cancelled
    pause
    exit /b 0
)

echo.
echo ═══════════════════════════════════════════════════
echo 🚀 Starting Activation...
echo ═══════════════════════════════════════════════════
echo.

REM Step 1: Add workflow files
echo [1/5] 📁 Staging workflow files...
git add .github\workflows\*.yml
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Failed to stage workflow files
    pause
    exit /b 1
)
echo       ✅ Workflows staged
echo.

REM Step 2: Add documentation
echo [2/5] 📝 Staging documentation...
git add README.md
git add GITHUB_ACTIONS_COMPLETE.md
git add GITHUB_ACTIONS_*.md
git add ENABLE_ACTIONS*.md
git add WHAT_WILL_HAPPEN.md
git add activate-github-actions*.bat
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Failed to stage documentation
    pause
    exit /b 1
)
echo       ✅ Documentation staged
echo.

REM Step 3: Commit changes
echo [3/5] 💾 Committing changes...
git commit -m "ci: Enable GitHub Actions CI/CD workflows" ^
           -m "" ^
           -m "- Add Pattern Quality CI workflow (runs on every push)" ^
           -m "- Add Advanced Pipeline workflow (multi-platform builds)" ^
           -m "- Add Weekly Quality Report workflow (scheduled monitoring)" ^
           -m "- Add status badges to README" ^
           -m "- Add comprehensive documentation" ^
           -m "" ^
           -m "This enables automated testing, building, and quality monitoring" ^
           -m "for the Log Scout Analyzer project."

if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Failed to commit changes
    echo    ℹ️  Check if changes already committed
    pause
    exit /b 1
)
echo       ✅ Changes committed
echo.

REM Step 4: Get current branch
echo [4/5] 🌿 Detecting branch...
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" (
    echo    ⚠️  Could not detect branch, using 'main'
    set CURRENT_BRANCH=main
)
echo       ℹ️  Current branch: %CURRENT_BRANCH%
echo.

REM Step 5: Push to GitHub
echo [5/5] 🚀 Pushing to GitHub...
git push origin %CURRENT_BRANCH%

if %ERRORLEVEL% NEQ 0 (
    echo    ❌ Failed to push to origin/%CURRENT_BRANCH%
    echo.
    echo    Possible reasons:
    echo    1. Not authenticated with GitHub
    echo    2. No internet connection
    echo    3. Branch doesn't exist on remote
    echo.
    echo    You can push manually with:
    echo      git push origin %CURRENT_BRANCH%
    echo.
    pause
    exit /b 1
)
echo       ✅ Successfully pushed to origin/%CURRENT_BRANCH%
echo.

REM Success!
echo ═══════════════════════════════════════════════════
echo ✅ SUCCESS! GitHub Actions is now ACTIVE!
echo ═══════════════════════════════════════════════════
echo.
echo Your CI/CD pipeline is now running on GitHub!
echo.
echo 🔗 Next Steps:
echo.
echo   1. View your workflows:
echo      https://github.com/bdb-tasks/log_scout_analyzer/actions
echo.
echo   2. Watch your first run:
echo      - CI workflow will start automatically
echo      - Takes about 7 minutes to complete
echo      - Check your email for results
echo.
echo   3. Check status badges in README.md:
echo      - Green = Passing ✅
echo      - Red = Failing ❌
echo      - Gray = Running ⏳
echo.
echo ═══════════════════════════════════════════════════
echo 📊 Active Workflows:
echo ═══════════════════════════════════════════════════
echo.
echo   ✓ Pattern Quality CI
echo     Runs on: Every push, every PR
echo     Duration: ~7 minutes
echo     Tests: 34+ unit tests
echo.
echo   ✓ Advanced Pipeline
echo     Runs on: Push to main, version tags
echo     Duration: ~15 minutes
echo     Builds: Linux, Windows, macOS
echo.
echo   ✓ Weekly Quality Report
echo     Runs on: Every Monday at 9 AM
echo     Duration: ~5 minutes
echo     Reports: Pattern quality trends
echo.
echo ═══════════════════════════════════════════════════
echo.
echo 🎉 Your first workflow should start within 30 seconds!
echo.
pause
