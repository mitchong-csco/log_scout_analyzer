@echo off
REM ============================================================================
REM Log Scout Analyzer (Zed) - Deployment Script for Windows
REM ============================================================================
REM This script provides a visual, step-by-step deployment process
REM Author: Log Scout Team
REM License: MIT
REM ============================================================================

setlocal enabledelayedexpansion

REM Colors for output (using escape sequences)
set "GREEN=[92m"
set "BLUE=[94m"
set "YELLOW=[93m"
set "RED=[91m"
set "NC=[0m"

cls
echo.
echo ============================================================================
echo   Log Scout Analyzer - Zed Extension Deployment
echo ============================================================================
echo.
echo   This script will:
echo     1. Increment version numbers
echo     2. Build WASM extension
echo     3. Build LSP server
echo     4. Create distribution packages
echo     5. Install to Zed editor
echo.
echo   Estimated time: 2-3 minutes
echo.
echo ============================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo %RED%ERROR: Node.js is not installed or not in PATH%NC%
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo %RED%ERROR: npm is not installed or not in PATH%NC%
    echo.
    echo npm should come with Node.js installation.
    echo.
    pause
    exit /b 1
)

REM Check if cargo is installed
where cargo >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo %RED%ERROR: Rust/Cargo is not installed or not in PATH%NC%
    echo.
    echo Please install Rust from: https://rustup.rs
    echo.
    pause
    exit /b 1
)

echo %GREEN%[OK]%NC% Prerequisites check passed
echo.

REM Ask for confirmation
echo Would you like to proceed with deployment?
choice /C YN /M "Press Y for Yes, N for No"
if errorlevel 2 goto :cancel
if errorlevel 1 goto :deploy

:cancel
echo.
echo Deployment cancelled.
echo.
pause
exit /b 0

:deploy
echo.
echo ============================================================================
echo   STEP 1/7: Showing Current Status
echo ============================================================================
echo.

call npm run status
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %YELLOW%Warning: Could not retrieve status%NC%
    echo.
)

echo.
echo Press any key to continue with deployment...
pause >nul

echo.
echo ============================================================================
echo   STEP 2/7: Incrementing Version Numbers
echo ============================================================================
echo.

call npm run version:increment
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%ERROR: Version increment failed!%NC%
    echo.
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Version numbers incremented
echo.

echo.
echo ============================================================================
echo   STEP 3/7: Building WASM Extension
echo ============================================================================
echo.
echo This may take 1-2 minutes on first build...
echo.

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%ERROR: WASM build failed!%NC%
    echo.
    echo Troubleshooting:
    echo   - Check that wasm32-wasip1 target is installed
    echo   - Run: rustup target add wasm32-wasip1
    echo   - Check for Rust compilation errors above
    echo.
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% WASM extension built successfully
echo.

echo.
echo ============================================================================
echo   STEP 4/7: Building LSP Server
echo ============================================================================
echo.
echo This may take 30-60 seconds...
echo.

call npm run build:lsp
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%ERROR: LSP server build failed!%NC%
    echo.
    echo Troubleshooting:
    echo   - Check for Rust compilation errors above
    echo   - Ensure lsp-server directory exists
    echo   - Run: npm run check:lsp
    echo.
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% LSP server built successfully
echo.

echo.
echo ============================================================================
echo   STEP 5/7: Creating Distribution Packages
echo ============================================================================
echo.

call node package-extension.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%ERROR: Package creation failed!%NC%
    echo.
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Distribution packages created
echo.

echo.
echo ============================================================================
echo   STEP 6/7: Copying to Downloads
echo ============================================================================
echo.

call npm run postpackage
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %YELLOW%Warning: Could not copy to Downloads folder%NC%
    echo.
)

echo.
echo %GREEN%[OK]%NC% Packages copied to Downloads
echo.

echo.
echo ============================================================================
echo   STEP 7/7: Installing to Zed Editor
echo ============================================================================
echo.

call npm run install:zed
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo %RED%ERROR: Installation to Zed failed!%NC%
    echo.
    echo Troubleshooting:
    echo   - Check that WASM binary was built
    echo   - Verify Zed installation paths
    echo   - Run: npm run status
    echo.
    pause
    exit /b 1
)

echo.
echo %GREEN%[OK]%NC% Extension installed to Zed
echo.

REM ============================================================================
REM Deployment Complete
REM ============================================================================

echo.
echo ============================================================================
echo   DEPLOYMENT COMPLETE!
echo ============================================================================
echo.
echo %GREEN%Status:%NC% Extension successfully deployed!
echo.
echo %BLUE%What's Next:%NC%
echo   1. Restart Zed editor completely (quit and relaunch)
echo   2. Open Zed
echo   3. Press Ctrl+Shift+P
echo   4. Type "Extensions" to verify installation
echo   5. Open a .log file to test the extension
echo.
echo %BLUE%Distribution Packages:%NC%
echo   Packages have been created in the dist/ folder
echo   and copied to your Downloads folder.
echo.
echo   Share these files with others:
echo     - log-scout-analyzer-zed-X.X.X.tar.gz
echo     - log-scout-analyzer-zed-X.X.X.zip
echo.
echo %BLUE%Useful Commands:%NC%
echo   npm run status    - Check current status
echo   npm run help      - Show all commands
echo   npm run deploy    - Redeploy everything
echo.
echo ============================================================================
echo.

REM Open dist folder in Explorer
echo Opening dist folder...
start explorer "%~dp0dist"

echo.
echo Press any key to exit...
pause >nul

exit /b 0
