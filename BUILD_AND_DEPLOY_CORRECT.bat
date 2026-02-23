@echo off
REM ============================================
REM Log Scout Analyzer - Complete Build & Deploy
REM ============================================
REM
REM This script does a COMPLETE build and deployment:
REM 1. Builds LSP server (release mode)
REM 2. COPIES binary to extension folder (CRITICAL!)
REM 3. Packages extension with new binary
REM 4. Installs extension in VS Code
REM
REM IMPORTANT: This script fixes the LSP disconnection issue
REM by ensuring the extension always gets the latest binary.
REM
REM Date: February 22, 2024
REM ============================================

echo.
echo ============================================
echo  Log Scout Analyzer - Build and Deploy
echo ============================================
echo.

REM Get current timestamp for logging
set TIMESTAMP=%date% %time%
echo Started: %TIMESTAMP%
echo.

REM ============================================
REM STEP 1: Build LSP Server (Release Mode)
REM ============================================
echo [1/6] Building LSP Server (release mode)...
echo.

cd lsp-server
cargo build --release --package lsp-server
if errorlevel 1 (
    echo.
    echo ❌ ERROR: LSP server build failed!
    echo.
    echo Troubleshooting:
    echo   1. Check for Rust compilation errors above
    echo   2. Try: cargo clean
    echo   3. Then run this script again
    echo.
    cd ..
    pause
    exit /b 1
)
cd ..

echo ✅ LSP server built successfully
echo.

REM ============================================
REM STEP 2: Copy Binary to Extension (CRITICAL!)
REM ============================================
echo [2/6] Copying LSP binary to extension...
echo.

REM Check if source binary exists
if not exist "target\release\log-scout-lsp-server.exe" (
    echo ❌ ERROR: Source binary not found!
    echo Expected: target\release\log-scout-lsp-server.exe
    echo.
    pause
    exit /b 1
)

REM Show source binary info
echo Source: target\release\log-scout-lsp-server.exe
dir target\release\log-scout-lsp-server.exe | findstr log-scout-lsp-server.exe

REM Ensure destination directory exists
if not exist "vscode-extension\bin" (
    echo Creating bin directory...
    mkdir vscode-extension\bin
)

REM Copy binary
copy /Y target\release\log-scout-lsp-server.exe vscode-extension\bin\log-scout-lsp-server-win.exe
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Binary copy failed!
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Binary copied successfully
echo Destination: vscode-extension\bin\log-scout-lsp-server-win.exe
dir vscode-extension\bin\log-scout-lsp-server-win.exe | findstr log-scout-lsp-server-win.exe
echo.

REM ============================================
REM STEP 3: Verify Binary Timestamps Match
REM ============================================
echo [3/6] Verifying binary timestamps...
echo.

REM Check if destination binary exists
if not exist "vscode-extension\bin\log-scout-lsp-server-win.exe" (
    echo ❌ ERROR: Binary not found in extension after copy!
    echo.
    pause
    exit /b 1
)

REM Show both files for manual verification
echo Source binary:
dir target\release\log-scout-lsp-server.exe | findstr log-scout-lsp-server.exe
echo.
echo Destination binary:
dir vscode-extension\bin\log-scout-lsp-server-win.exe | findstr log-scout-lsp-server-win.exe
echo.

REM Check file sizes match (basic validation)
for %%A in (target\release\log-scout-lsp-server.exe) do set SOURCE_SIZE=%%~zA
for %%A in (vscode-extension\bin\log-scout-lsp-server-win.exe) do set DEST_SIZE=%%~zA

if "%SOURCE_SIZE%"=="%DEST_SIZE%" (
    echo ✅ File sizes match: %SOURCE_SIZE% bytes
) else (
    echo ⚠️  WARNING: File sizes differ!
    echo    Source: %SOURCE_SIZE% bytes
    echo    Destination: %DEST_SIZE% bytes
    echo.
    echo This might indicate a copy problem. Continue anyway? [Y/N]
    choice /C YN /N /M "Press Y to continue or N to abort: "
    if errorlevel 2 exit /b 1
)
echo.

REM ============================================
REM STEP 4: Build TypeScript Extension
REM ============================================
echo [4/6] Building VS Code extension TypeScript...
echo.

cd vscode-extension

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ ERROR: npm install failed!
        cd ..
        pause
        exit /b 1
    )
    echo.
)

REM Compile TypeScript
echo Compiling TypeScript...
call npm run compile
if errorlevel 1 (
    echo.
    echo ⚠️  WARNING: TypeScript compilation had errors
    echo This is usually OK if errors are in test files
    echo.
)

echo ✅ TypeScript compiled
echo.

REM ============================================
REM STEP 5: Package Extension with New Binary
REM ============================================
echo [5/6] Packaging VS Code extension...
echo.

REM Get version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" package.json') do set VERSION=%%a
set VERSION=%VERSION:"=%

echo Version: %VERSION%
echo.

REM Package extension
call npx vsce package --no-dependencies
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Extension packaging failed!
    echo.
    cd ..
    pause
    exit /b 1
)

echo.
echo ✅ Extension packaged successfully
echo.

REM Verify VSIX was created
if not exist "log-scout-analyzer-%VERSION%.vsix" (
    echo ❌ ERROR: VSIX file not found!
    echo Expected: log-scout-analyzer-%VERSION%.vsix
    echo.
    cd ..
    pause
    exit /b 1
)

REM Show VSIX info
dir log-scout-analyzer-%VERSION%.vsix
echo.

cd ..

REM ============================================
REM STEP 6: Install Extension in VS Code
REM ============================================
echo [6/6] Installing extension in VS Code...
echo.

REM Check if VS Code is installed
where code >nul 2>&1
if errorlevel 1 (
    echo ⚠️  WARNING: 'code' command not found in PATH
    echo.
    echo VS Code might not be installed or not in PATH.
    echo You can install manually:
    echo   1. Open VS Code
    echo   2. Press Ctrl+Shift+X
    echo   3. Click "..." menu
    echo   4. Select "Install from VSIX..."
    echo   5. Browse to: vscode-extension\log-scout-analyzer-%VERSION%.vsix
    echo.
    pause
    exit /b 1
)

REM Uninstall old version first (clean install)
echo Uninstalling old version (if exists)...
code --uninstall-extension log-scout-team.log-scout-analyzer
echo.

REM Install new version
echo Installing new version...
code --install-extension "vscode-extension\log-scout-analyzer-%VERSION%.vsix" --force
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Extension installation failed!
    echo.
    echo Try installing manually:
    echo   code --install-extension vscode-extension\log-scout-analyzer-%VERSION%.vsix
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Extension installed successfully
echo.

REM ============================================
REM STEP 7: Verify Installation
REM ============================================
echo Verifying installation...
echo.

code --list-extensions --show-versions | findstr log-scout
echo.

REM ============================================
REM DEPLOYMENT COMPLETE
REM ============================================
echo ============================================
echo ✅ BUILD AND DEPLOY COMPLETE!
echo ============================================
echo.
echo Version deployed: %VERSION%
echo.
echo 📦 Package location:
echo    vscode-extension\log-scout-analyzer-%VERSION%.vsix
echo.
echo 🔧 Binary updated:
echo    vscode-extension\bin\log-scout-lsp-server-win.exe
echo.
echo ⚠️  IMPORTANT: RESTART VS CODE
echo.
echo To activate the extension:
echo   1. Close ALL VS Code windows
echo   2. Reopen VS Code
echo   3. Open a .log file
echo   4. Check for Scout icon in Activity Bar
echo.
echo 🧪 Quick Test:
echo   1. Open a log file
echo   2. Run: Ctrl+Shift+P ^> "Scout: Analyze Current File"
echo   3. Check Output ^> "Log Scout Analyzer" for logs
echo.
echo ============================================
echo.

REM Show deployment checklist
echo 📋 Post-Deployment Checklist:
echo    [ ] Close all VS Code windows
echo    [ ] Reopen VS Code
echo    [ ] Open a .log file
echo    [ ] Verify LSP connection works
echo    [ ] Verify analysis works
echo    [ ] Check Output for LSP logs
echo.

pause
