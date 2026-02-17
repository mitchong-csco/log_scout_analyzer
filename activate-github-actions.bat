@echo off
REM Quick setup script for GitHub Actions
REM This will commit and push the GitHub Actions workflows

echo ========================================
echo GitHub Actions - Quick Setup
echo ========================================
echo.

echo [1/5] Checking git status...
git status
echo.

echo [2/5] Adding GitHub Actions workflow files...
git add .github\workflows\ci.yml
git add .github\workflows\advanced.yml
git add .github\workflows\weekly.yml
git add GITHUB_ACTIONS_SETUP_COMPLETE.md

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)
echo     Done!
echo.

echo [3/5] Committing changes...
git commit -m "ci: Add GitHub Actions workflows for automated testing and quality monitoring"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to commit
    pause
    exit /b 1
)
echo     Done!
echo.

echo [4/5] Pushing to GitHub...

REM Get current branch name
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo     Current branch: %CURRENT_BRANCH%

REM Try to push current branch
git push origin %CURRENT_BRANCH%

if %ERRORLEVEL% EQU 0 (
    echo     Done! Pushed to branch: %CURRENT_BRANCH%
) else (
    echo     Note: Could not push to %CURRENT_BRANCH%, trying 'master'...
    git push origin master
    if %ERRORLEVEL% EQU 0 (
        echo     Done! Pushed to branch: master
    ) else (
        echo     ERROR: Failed to push to any branch
        pause
        exit /b 1
    )
)
echo.

echo ========================================
echo SUCCESS! GitHub Actions is now active!
echo ========================================
echo.
echo Your workflows are now running on GitHub!
echo.
echo Next steps:
echo   1. Visit: https://github.com/bdb-tasks/log_scout_analyzer/actions
echo   2. Watch your first workflow run
echo   3. Check email for results
echo.
echo The following workflows are now active:
echo   - Pattern Quality CI (runs on every push)
echo   - Advanced Pipeline (runs on main branch)
echo   - Weekly Quality Report (runs every Monday)
echo.
echo ========================================
pause
