@echo off
REM Quick diagnostic to find the correct GitHub repository URL
REM Run this to see your actual repository details

echo ========================================
echo GitHub Repository Diagnostic
echo ========================================
echo.

echo [1] Checking current directory...
cd
echo.

echo [2] Checking git remote URL...
git remote -v
echo.

echo [3] Checking current branch...
git branch --show-current
echo.

echo [4] Checking last commit...
git log -1 --oneline
echo.

echo [5] Checking if .github/workflows exists...
if exist ".github\workflows" (
    echo     YES - .github\workflows folder exists
    dir /b .github\workflows
) else (
    echo     NO - .github\workflows folder NOT found
)
echo.

echo ========================================
echo Repository URL Builder
echo ========================================
echo.

REM Extract repository URL from git remote
for /f "tokens=2 delims=:" %%a in ('git remote -v ^| findstr "origin.*fetch"') do (
    set REPO_PATH=%%a
)

REM Remove .git extension
set REPO_PATH=%REPO_PATH:.git=%

echo Based on your git remote, your repository URLs are:
echo.
echo Main Repository:
echo   https://github.com%REPO_PATH%
echo.
echo Actions Tab:
echo   https://github.com%REPO_PATH%/actions
echo.
echo Settings (to enable Actions):
echo   https://github.com%REPO_PATH%/settings/actions
echo.

echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Copy one of the URLs above
echo 2. Paste in your browser
echo 3. Make sure you're logged into GitHub
echo 4. If Settings link works, enable Actions there
echo.

pause
