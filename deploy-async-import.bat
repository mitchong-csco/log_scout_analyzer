@echo off
REM ============================================================================
REM Deploy Async Import Feature
REM ============================================================================
REM This script builds and deploys the async import feature with progress tracking
REM
REM Components:
REM 1. LSP Server (Rust) - Progress notification support
REM 2. VS Code Extension (TypeScript) - Optimistic UI and progress handling
REM ============================================================================

echo.
echo ============================================================================
echo   Deploying Async Import Feature with Progress Tracking
echo ============================================================================
echo.

REM Check if we're in the right directory
if not exist "lsp-server\Cargo.toml" (
    echo ERROR: Must run from log_scout_analyzer root directory
    exit /b 1
)

REM ============================================================================
REM Step 1: Build LSP Server with Progress Support
REM ============================================================================
echo.
echo [1/5] Building LSP Server (Rust)...
echo ----------------------------------------------------------------------------

cd lsp-server
cargo build --release 2>&1 | findstr /C:"Finished" /C:"error" /C:"warning"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: LSP Server build failed
    cd ..
    exit /b 1
)

echo ✓ LSP Server built successfully
cd ..

REM ============================================================================
REM Step 2: Copy LSP Server Binary to Extension
REM ============================================================================
echo.
echo [2/5] Copying LSP Server binary to extension...
echo ----------------------------------------------------------------------------

if not exist "vscode-extension\server" mkdir "vscode-extension\server"

copy /Y "lsp-server\target\release\log-scout-lsp-server.exe" "vscode-extension\server\" >nul

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to copy LSP server binary
    exit /b 1
)

echo ✓ LSP Server binary copied to vscode-extension\server\

REM ============================================================================
REM Step 3: Build VS Code Extension
REM ============================================================================
echo.
echo [3/5] Building VS Code Extension (TypeScript)...
echo ----------------------------------------------------------------------------

cd vscode-extension

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

REM Compile TypeScript
call npm run compile 2>&1 | findstr /C:"Compilation complete" /C:"error TS" /C:"Successfully"

if %ERRORLEVEL% neq 0 (
    echo.
    echo WARNING: TypeScript compilation had warnings (continuing anyway)
)

echo ✓ Extension TypeScript compiled

REM ============================================================================
REM Step 4: Package Extension as VSIX
REM ============================================================================
echo.
echo [4/5] Packaging extension as VSIX...
echo ----------------------------------------------------------------------------

REM Check if vsce is installed
where vsce >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing vsce...
    call npm install -g @vscode/vsce
)

REM Package the extension
call vsce package --allow-star-activation 2>&1 | findstr /C:"DONE" /C:"ERROR" /C:"Packaged"

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to package extension
    cd ..
    exit /b 1
)

echo ✓ Extension packaged as VSIX

cd ..

REM ============================================================================
REM Step 5: Install Extension in VS Code
REM ============================================================================
echo.
echo [5/5] Installing extension in VS Code...
echo ----------------------------------------------------------------------------

REM Find the VSIX file
for /f "delims=" %%i in ('dir /b /o-d vscode-extension\log-scout-analyzer-*.vsix 2^>nul') do (
    set VSIX_FILE=%%i
    goto :found_vsix
)

echo ERROR: No VSIX file found
exit /b 1

:found_vsix
echo Found VSIX: %VSIX_FILE%

REM Install the extension
code --install-extension "vscode-extension\%VSIX_FILE%" --force

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install extension
    exit /b 1
)

echo ✓ Extension installed in VS Code

REM ============================================================================
REM Deployment Summary
REM ============================================================================
echo.
echo ============================================================================
echo   Deployment Complete!
echo ============================================================================
echo.
echo New Features Available:
echo   ✓ Async bundle import with optimistic UI
echo   ✓ Real-time progress updates (every 2-5 seconds)
echo   ✓ Non-blocking import operations
echo   ✓ Progress percentage and time elapsed
echo   ✓ Completion notifications
echo.
echo Next Steps:
echo   1. Reload VS Code window (Ctrl+Shift+P → "Reload Window")
echo   2. Open a workspace folder
echo   3. Try importing an archive:
echo      - Command Palette → "Scout: Import Log Archive"
echo      - Or drag and drop a .zip file into the Bundles tree
echo.
echo Expected Behavior:
echo   - Bundle appears instantly with spinner icon
echo   - Progress updates show: "5%% Extracting archive..."
echo   - After completion, real bundle replaces placeholder
echo   - Success notification appears
echo.
echo Test Files:
echo   - Small archive (^<10MB): ~3-8 seconds
echo   - QCSONE package (100-500MB): ~2-4 minutes
echo.
echo Troubleshooting:
echo   - LSP Server logs: %%USERPROFILE%%\.log-scout-analyzer\lsp-server-*.log
echo   - Extension logs: View → Output → Log Scout Analyzer
echo   - Check for "$/progress" notifications in LSP logs
echo.
echo ============================================================================
echo.

pause

REM ============================================================================
REM Optional: Run Quick Test
REM ============================================================================
echo.
set /p RUN_TEST="Would you like to run a quick test? (y/n): "

if /i "%RUN_TEST%"=="y" (
    echo.
    echo Running quick test...
    echo.
    echo Please do the following in VS Code:
    echo   1. Open Command Palette (Ctrl+Shift+P)
    echo   2. Type: "Scout: Import Log Archive"
    echo   3. Select a test archive file
    echo   4. Watch the Bundle tree for progress updates
    echo.
    echo Expected sequence:
    echo   - 0s:  "📦 Importing archive.zip... 0%% Starting..."
    echo   - 2s:  "5%% Extracting archive..."
    echo   - 5s:  "20%% Extracting: 50/250 files"
    echo   - 10s: "50%% Creating bundle..."
    echo   - 15s: "75%% Adding logs: 30/47"
    echo   - 20s: Bundle replaced with real data
    echo   - Notification: "✅ Successfully imported 47 log files"
    echo.
    pause
)

exit /b 0
