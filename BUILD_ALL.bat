@echo off
REM Comprehensive Windows Build Script for Log Scout Analyzer
REM This script builds the Rust LSP server and packages the VS Code extension

setlocal enabledelayedexpansion

echo.
echo ========================================
echo Log Scout Analyzer - Complete Build
echo ========================================
echo.
echo Starting build process...
echo Current directory: %CD%
echo.

REM Check if we're in the right directory
if not exist "BUILD_WINDOWS_BINARY.bat" (
    echo ERROR: This script must be run from the project root!
    echo Expected location: c:\Users\mitchong\code\log_scout_analyzer
    pause
    exit /b 1
)

REM Step 1: Build Rust LSP Server
echo [STEP 1/4] Building Rust LSP Server...
echo.
call BUILD_WINDOWS_BINARY.bat
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Rust build failed!
    echo Make sure Rust is installed: https://rustup.rs/
    pause
    exit /b 1
)

REM Step 2: Verify binary was copied
echo.
echo [STEP 2/4] Verifying LSP binary...
if not exist "vscode-extension\bin\log-scout-lsp-server-win.exe" (
    echo ERROR: LSP binary not found in vscode-extension\bin\
    pause
    exit /b 1
)
echo LSP binary verified: vscode-extension\bin\log-scout-lsp-server-win.exe
echo.

REM Step 3: Install npm dependencies
echo [STEP 3/4] Installing npm dependencies...
cd vscode-extension
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Could not navigate to vscode-extension!
    pause
    exit /b 1
)

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed!
    echo Make sure Node.js is installed: https://nodejs.org/
    pause
    exit /b 1
)
echo npm dependencies installed successfully.
echo.

REM Step 4: Package the extension
echo [STEP 4/4] Packaging VS Code extension...
call npm run package
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
echo Output files created:
echo   - LSP Server Binary:
echo     vscode-extension\bin\log-scout-lsp-server-win.exe
echo   - VS Code Extension Package:
echo     vscode-extension\log-scout-analyzer.vsix
echo.
echo You can now:
echo   1. Install in VS Code: code --install-extension log-scout-analyzer.vsix
echo   2. Share the .vsix file with others
echo   3. Publish to VS Code Marketplace: npm run publish
echo.
pause
