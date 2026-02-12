@echo off
REM Comprehensive Windows Build Script for Log Scout Analyzer
REM This script builds the Rust LSP server and packages the VS Code extension

setlocal enabledelayedexpansion

echo ========================================
echo Log Scout Analyzer - Windows Build
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "BUILD_WINDOWS_BINARY.bat" (
    echo ERROR: This script must be run from the project root!
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Step 1: Build Rust LSP Server
echo [1/4] Building Rust LSP Server...
echo.
call BUILD_WINDOWS_BINARY.bat
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Rust build failed!
    pause
    exit /b 1
)

REM Step 2: Verify binary was copied
echo.
echo [2/4] Verifying LSP binary...
if not exist "clients\vscode\bin\log-scout-lsp-server-win.exe" (
    echo ERROR: LSP binary not found in clients\vscode\bin\
    pause
    exit /b 1
)
echo LSP binary verified: clients\vscode\bin\log-scout-lsp-server-win.exe
echo.

REM Step 3: Install npm dependencies
echo [3/4] Installing npm dependencies...
cd vscode-extension
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not navigate to vscode-extension!
    pause
    exit /b 1
)

npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

REM Step 4: Package the extension
echo.
echo [4/4] Packaging VS Code extension...
npm run package
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm package failed!
    pause
    exit /b 1
)

REM Success!
echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files:
echo   - LSP Server: ..\clients\vscode\bin\log-scout-lsp-server-win.exe
echo   - VS Code Extension: .\log-scout-analyzer.vsix
echo.
echo Next steps:
echo   1. Install in VS Code: code --install-extension log-scout-analyzer.vsix
echo   2. Or publish: npm run publish
echo.
pause
