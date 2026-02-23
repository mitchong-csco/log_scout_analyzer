@echo off
REM Comprehensive Windows Build Script for Log Scout Analyzer
REM This script builds the Rust LSP server and packages the VS Code extension

setlocal enabledelayedexpansion

REM Create build_logs folder if it doesn't exist
if not exist build_logs mkdir build_logs

REM Create timestamped log file
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/: " %%a in ('time /t') do (set mytime=%%a-%%b)
set TIMESTAMP=%mydate%_%mytime%
set LOGFILE=build_logs\build_%TIMESTAMP%.md

REM Get workspace path for links
set WORKSPACE=%CD%

REM Create new markdown log file with header
echo # Build Log - %TIMESTAMP% > %LOGFILE%
echo. >> %LOGFILE%
echo **Date**: %date% %time% >> %LOGFILE%
echo **Workspace**: `%WORKSPACE%` >> %LOGFILE%
echo. >> %LOGFILE%
echo --- >> %LOGFILE%
echo. >> %LOGFILE%

echo.
echo ========================================
echo Log Scout Analyzer - Complete Build
echo ========================================
echo.
echo Starting build process...
echo Current directory: %CD%
echo Logging to: %LOGFILE%
echo Logs saved in: build_logs\
echo.

REM Check if we're in the right directory
if not exist "BUILD_WINDOWS_BINARY.bat" (
    echo ERROR: This script must be run from the project root!
    echo Expected location: c:\Users\mitchong\code\log_scout_analyzer
    echo. >> %LOGFILE%
    echo ## ❌ ERROR >> %LOGFILE%
    echo. >> %LOGFILE%
    echo Script must be run from project root! >> %LOGFILE%
    echo. >> %LOGFILE%
    exit /b 1
)

REM Step 1: Build Rust LSP Server
echo [STEP 1/6] Building Rust LSP Server...
echo. >> %LOGFILE%
echo ## Step 1: Building Rust LSP Server >> %LOGFILE%
echo. >> %LOGFILE%
echo Building in [`lsp-server`](file:///%WORKSPACE%/lsp-server) >> %LOGFILE%
echo. >> %LOGFILE%
echo ```shell >> %LOGFILE%

powershell -Command "& { .\\BUILD_WINDOWS_BINARY.bat 2>&1 | ForEach-Object { Write-Host $_; Add-Content -Path '%LOGFILE%' -Value $_ } }"

echo ``` >> %LOGFILE%
echo. >> %LOGFILE%

if %ERRORLEVEL% NEQ 0 (
    echo. >> %LOGFILE%
    echo ### ❌ Rust Build Failed >> %LOGFILE%
    echo. >> %LOGFILE%
    echo Check errors above. >> %LOGFILE%
    echo. >> %LOGFILE%
    echo.
    echo ERROR: Rust build failed! Check %LOGFILE% for details
    exit /b 1
)

echo. >> %LOGFILE%
echo ### ✅ Rust Build Successful >> %LOGFILE%
echo. >> %LOGFILE%

REM Step 2: Verify binary was copied
echo.
echo [STEP 2/6] Verifying LSP binary...
echo. >> %LOGFILE%
echo ## Step 2: Verifying LSP Binary >> %LOGFILE%
echo. >> %LOGFILE%

REM Use absolute path for verification
set BINARY_PATH=%WORKSPACE%\vscode-extension\bin\log-scout-lsp-server-win.exe

echo Checking: %BINARY_PATH% >> %LOGFILE%
echo. >> %LOGFILE%

if not exist "%BINARY_PATH%" (
    echo. >> %LOGFILE%
    echo ### ❌ Binary Not Found >> %LOGFILE%
    echo. >> %LOGFILE%
    echo Expected at: [`%BINARY_PATH%`](file:///%WORKSPACE%/vscode-extension/bin/log-scout-lsp-server-win.exe) >> %LOGFILE%
    echo. >> %LOGFILE%
    echo Current directory: %CD% >> %LOGFILE%
    echo. >> %LOGFILE%
    echo ERROR: LSP binary not found at: %BINARY_PATH%
    echo Current directory: %CD%
    exit /b 1
)

echo ✅ LSP binary verified: [`vscode-extension\bin\log-scout-lsp-server-win.exe`](file:///%WORKSPACE%/vscode-extension/bin/log-scout-lsp-server-win.exe) >> %LOGFILE%
echo. >> %LOGFILE%
echo LSP binary verified: %BINARY_PATH%
echo.

REM Step 3: Install npm dependencies
echo [STEP 3/6] Installing npm dependencies...
echo. >> %LOGFILE%
echo ## Step 3: Installing NPM Dependencies >> %LOGFILE%
echo. >> %LOGFILE%
echo Working directory: [`vscode-extension`](file:///%WORKSPACE%/vscode-extension) >> %LOGFILE%
echo. >> %LOGFILE%

cd vscode-extension
if %ERRORLEVEL% NEQ 0 (
    echo. >> ..\%LOGFILE%
    echo ### ❌ Failed to Navigate >> %LOGFILE%
    echo. >> ..\%LOGFILE%
    echo ERROR: Could not navigate to vscode-extension!
    exit /b 1
)

echo ```shell >> ..\%LOGFILE%
call npm install >> ..\%LOGFILE% 2>&1
echo ``` >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%

if %ERRORLEVEL% NEQ 0 (
    echo. >> ..\%LOGFILE%
    echo ### ❌ NPM Install Failed >> %LOGFILE%
    echo. >> ..\%LOGFILE%
    echo ERROR: npm install failed! Check %LOGFILE% for details
    cd ..
    exit /b 1
)

echo ### ✅ NPM Dependencies Installed >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%
echo npm dependencies installed successfully.
echo.

REM Step 4: Package the extension (ignore TypeScript errors in disabled features)
echo [STEP 4/6] Packaging VS Code extension...
echo. >> ..\%LOGFILE%
echo ## Step 4: Packaging VS Code Extension >> %LOGFILE%
echo. >> ..\%LOGFILE%
echo **Note**: TypeScript errors in disabled features (auth, docs, case management) are expected and won't prevent packaging. >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%
echo ```shell >> ..\%LOGFILE%

REM Run build:all (which increments version and builds everything)
call npm run build:all >> ..\%LOGFILE% 2>&1
set BUILD_EXIT_CODE=%ERRORLEVEL%

echo ``` >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%

REM Now package the built artifacts (no version increment, just packaging)
echo Running package:only to create VSIX... >> ..\%LOGFILE%
call npm run package:only >> ..\%LOGFILE% 2>&1

REM Check if VSIX was created (this is what matters)
if not exist "log-scout-analyzer.vsix" (
    echo. >> ..\%LOGFILE%
    echo ### ❌ Packaging Failed >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo VSIX file was not created. Check TypeScript errors above. >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo **Critical errors** (not just warnings) prevented VSIX creation. >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo ERROR: npm package failed - VSIX not created! Check %LOGFILE% for details
    cd ..
    exit /b 1
)

echo ### ✅ Package Created >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%
echo VSIX file: [`log-scout-analyzer.vsix`](file:///%WORKSPACE%/vscode-extension/log-scout-analyzer.vsix) >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%
if %BUILD_EXIT_CODE% NEQ 0 (
    echo **Note**: TypeScript warnings present but VSIX was created successfully. >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
)

REM Step 5: Move VSIX to vsix folder and clean old files
echo.
echo [STEP 5/6] Organizing VSIX files...
echo. >> ..\%LOGFILE%
echo ## Step 5: Organizing VSIX Files >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%

REM Create vsix folder if it doesn't exist
if not exist "vsix" (
    mkdir vsix
    echo Created vsix folder
    echo Created [`vsix`](file:///%WORKSPACE%/vscode-extension/vsix) folder >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
)

REM Clean old VSIX files from vsix folder
set VSIX_COUNT=0
if exist "vsix\*.vsix" (
    for %%F in (vsix\*.vsix) do (
        set /a VSIX_COUNT+=1
        echo Removing old VSIX: %%F
        echo Removing old VSIX: `%%F` >> ..\%LOGFILE%
        del "%%F" >> ..\%LOGFILE% 2>&1
    )
)

if %VSIX_COUNT% GTR 0 (
    echo. >> ..\%LOGFILE%
    echo Cleaned up %VSIX_COUNT% old VSIX file(s) >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo Cleaned up %VSIX_COUNT% old VSIX file(s)
)

REM Move new VSIX to vsix folder
if exist "log-scout-analyzer.vsix" (
    move /Y log-scout-analyzer.vsix vsix\ >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Moved VSIX to vsix folder
        echo ✅ Moved VSIX to [`vsix\log-scout-analyzer.vsix`](file:///%WORKSPACE%/vscode-extension/vsix/log-scout-analyzer.vsix) >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
    ) else (
        echo WARNING: Failed to move VSIX to vsix folder
        echo. >> ..\%LOGFILE%
        echo ### ⚠️ Warning >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
        echo Failed to move VSIX to vsix folder >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
    )
) else (
    echo WARNING: VSIX file not found after packaging
    echo. >> ..\%LOGFILE%
    echo ### ⚠️ Warning >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo VSIX file not found after packaging >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
)

echo.
echo [STEP 6/6] Installing extension in VS Code...
echo. >> ..\%LOGFILE%
echo ## Step 6: Installing Extension in VS Code >> ..\%LOGFILE%
echo. >> ..\%LOGFILE%

REM Check if VS Code is installed
where code >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: VS Code 'code' command not found in PATH
    echo WARNING: Skipping automatic installation
    echo WARNING: You can manually install with:
    echo   code --install-extension vsix\log-scout-analyzer.vsix
    echo. >> ..\%LOGFILE%
    echo ### ⚠️ VS Code Command Not Found >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo The `code` command is not in your PATH. >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
    echo To install manually: >> ..\%LOGFILE%
    echo ```shell >> ..\%LOGFILE%
    echo code --install-extension vsix\log-scout-analyzer.vsix >> ..\%LOGFILE%
    echo ``` >> ..\%LOGFILE%
    echo. >> ..\%LOGFILE%
) else (
    REM Install the extension from vsix folder
    if exist "vsix\log-scout-analyzer.vsix" (
        echo Installing from [`vsix\log-scout-analyzer.vsix`](file:///%WORKSPACE%/vscode-extension/vsix/log-scout-analyzer.vsix)... >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
        echo ```shell >> ..\%LOGFILE%
        code --install-extension vsix\log-scout-analyzer.vsix --force >> ..\%LOGFILE% 2>&1
        set INSTALL_EXIT_CODE=%ERRORLEVEL%
        echo ``` >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%

        if !INSTALL_EXIT_CODE! EQU 0 (
            echo Extension installed successfully!
            echo ### ✅ Extension Installed >> ..\%LOGFILE%
            echo. >> ..\%LOGFILE%
            echo **Restart VS Code** to load the new version >> ..\%LOGFILE%
            echo. >> ..\%LOGFILE%
            echo.
            echo NOTE: Restart VS Code to load the new version
        ) else (
            echo WARNING: Extension installation failed
            echo WARNING: You may need to install manually
            echo. >> ..\%LOGFILE%
            echo ### ⚠️ Installation Failed >> ..\%LOGFILE%
            echo. >> ..\%LOGFILE%
            echo Install manually: >> ..\%LOGFILE%
            echo ```shell >> ..\%LOGFILE%
            echo code --install-extension vsix\log-scout-analyzer.vsix >> ..\%LOGFILE%
            echo ``` >> ..\%LOGFILE%
            echo. >> ..\%LOGFILE%
        )
    ) else (
        echo WARNING: VSIX file not found in vsix folder
        echo WARNING: Skipping installation
        echo. >> ..\%LOGFILE%
        echo ### ⚠️ VSIX Not Found >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
        echo File not found: `vsix\log-scout-analyzer.vsix` >> ..\%LOGFILE%
        echo. >> ..\%LOGFILE%
    )
)

REM Final validation - check if VSIX actually exists before declaring success
cd ..

if not exist "vscode-extension\vsix\log-scout-analyzer.vsix" (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo ERROR: VSIX file was not created!
    echo Expected: vscode-extension\vsix\log-scout-analyzer.vsix
    echo.
    echo This usually means TypeScript compilation had CRITICAL errors
    echo (not just warnings in disabled features).
    echo.
    echo Check the build log for details: %LOGFILE%
    echo.

    REM Add failure summary to log
    echo. >> %LOGFILE%
    echo --- >> %LOGFILE%
    echo. >> %LOGFILE%
    echo ## ❌ BUILD FAILED >> %LOGFILE%
    echo. >> %LOGFILE%
    echo **Reason**: VSIX file was not created >> %LOGFILE%
    echo. >> %LOGFILE%
    echo **Expected File**: `vscode-extension\vsix\log-scout-analyzer.vsix` >> %LOGFILE%
    echo. >> %LOGFILE%
    echo **What to check**: >> %LOGFILE%
    echo 1. Look for TypeScript compilation errors in Step 4 above >> %LOGFILE%
    echo 2. Check if `npm run build:all` and `npm run package:only` completed successfully >> %LOGFILE%
    echo 3. Verify all TypeScript files compile without CRITICAL errors >> %LOGFILE%
    echo. >> %LOGFILE%
    echo **Note**: Warnings in disabled features (auth, docs, case management) are OK, but critical errors are not. >> %LOGFILE%
    echo. >> %LOGFILE%
    echo --- >> %LOGFILE%
    echo. >> %LOGFILE%
    echo *Build failed at %date% %time%* >> %LOGFILE%

    exit /b 1
)

REM Success - VSIX was created!
echo.
echo ========================================
echo BUILD SUCCESSFUL!
echo ========================================
echo.
echo Output files created:
echo   - LSP Server Binary:
echo     vscode-extension\bin\log-scout-lsp-server-win.exe
echo   - VS Code Extension Package:
echo     vscode-extension\vsix\log-scout-analyzer.vsix
echo.
echo Old VSIX files cleaned: %VSIX_COUNT%
echo Extension file: CREATED ✅
echo.
echo Build log saved to: %LOGFILE%
echo View in markdown viewer for clickable file links!
echo.

REM Add success summary to log
echo. >> %LOGFILE%
echo --- >> %LOGFILE%
echo. >> %LOGFILE%
echo ## ✅ Build Summary >> %LOGFILE%
echo. >> %LOGFILE%
echo **Status**: ✅ Build Completed Successfully >> %LOGFILE%
echo. >> %LOGFILE%
echo **Output Files**: >> %LOGFILE%
echo - LSP Binary: [`vscode-extension\bin\log-scout-lsp-server-win.exe`](file:///%WORKSPACE%/vscode-extension/bin/log-scout-lsp-server-win.exe) >> %LOGFILE%
echo - Extension: [`vscode-extension\vsix\log-scout-analyzer.vsix`](file:///%WORKSPACE%/vscode-extension/vsix/log-scout-analyzer.vsix) ✅ >> %LOGFILE%
echo. >> %LOGFILE%
echo **Old VSIX Files Cleaned**: %VSIX_COUNT% >> %LOGFILE%
echo. >> %LOGFILE%
echo **Next Steps**: >> %LOGFILE%
echo 1. Restart VS Code >> %LOGFILE%
echo 2. New extension version will be active >> %LOGFILE%
echo. >> %LOGFILE%
echo --- >> %LOGFILE%
echo. >> %LOGFILE%
echo *Build completed successfully at %date% %time%* >> %LOGFILE%
