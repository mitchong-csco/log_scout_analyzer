@echo off
REM ============================================================================
REM  Log Scout Analyzer - Quick Deploy Script
REM  Automatically increments versions, builds, packages, and installs
REM ============================================================================

echo.
echo ========================================================================
echo   LOG SCOUT ANALYZER - QUICK DEPLOY
echo ========================================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] package.json not found!
    echo Please run this script from the vscode-extension directory.
    echo.
    pause
    exit /b 1
)

echo [1/6] Checking current status...
echo.
call npm run status
echo.

echo ========================================================================
echo.
echo [2/6] Incrementing versions...
echo.
call npm run version:increment
if errorlevel 1 (
    echo.
    echo [ERROR] Version increment failed!
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo.
echo [3/6] Building LSP server (Rust)...
echo.
call npm run build:lsp
if errorlevel 1 (
    echo.
    echo [ERROR] LSP server build failed!
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo.
echo [4/6] Building extension (TypeScript)...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Extension build failed!
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo.
echo [5/6] Creating VSIX package...
echo.
call vsce package --allow-star-activation --out log-scout-analyzer.vsix
if errorlevel 1 (
    echo.
    echo [ERROR] Package creation failed!
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo.
echo [6/6] Installing extension into VSCode...
echo.
call code --install-extension log-scout-analyzer.vsix
if errorlevel 1 (
    echo.
    echo [WARNING] VSCode installation may have failed.
    echo You can manually install the .vsix file from VSCode.
)

REM Copy to Downloads folder
call npm run postpackage

echo.
echo ========================================================================
echo.
echo   DEPLOYMENT COMPLETE!
echo.
echo   Next steps:
echo   1. Reload VSCode window (Ctrl+Shift+P ^> "Reload Window")
echo   2. Your new version is now active!
echo.
echo ========================================================================
echo.
pause
