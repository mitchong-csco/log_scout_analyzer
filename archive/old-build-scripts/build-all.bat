@echo off
REM Log Scout Analyzer - Unified Build Script for Windows
REM Builds and deploys both Zed and VS Code extensions

setlocal enabledelayedexpansion

echo ============================================================
echo        LOG SCOUT ANALYZER - UNIFIED BUILD SCRIPT
echo              Build Both Zed ^& VS Code Exts
echo ============================================================
echo.

REM Set script directory
cd /d "%~dp0"

REM Set paths
set "ZED_EXT_DIR=%USERPROFILE%\.config\zed\extensions\log-scout-analyzer"
set "VSCODE_EXT_DIR=%USERPROFILE%\.vscode\extensions"

echo [1/9] Setting up paths...
echo   Zed Extensions: %ZED_EXT_DIR%
echo   VS Code Extensions: %VSCODE_EXT_DIR%
echo.

REM Check prerequisites
echo [2/9] Checking prerequisites...

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo   X Cargo not found
    echo     Install from: https://rustup.rs/
    exit /b 1
) else (
    for /f "tokens=2" %%i in ('cargo --version') do set CARGO_VERSION=%%i
    echo   + Cargo installed (!CARGO_VERSION!)
)

rustup target list | findstr /C:"wasm32-wasip1 (installed)" >nul 2>&1
if %errorlevel% neq 0 (
    echo   ! wasm32-wasip1 target not installed
    echo     Installing now...
    rustup target add wasm32-wasip1
    if %errorlevel% neq 0 (
        echo   X Failed to install wasm32-wasip1 target
        exit /b 1
    )
    echo   + wasm32-wasip1 target installed successfully
) else (
    echo   + wasm32-wasip1 target installed
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   X Node.js not found
    echo     Install from: https://nodejs.org/
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   + Node.js installed (!NODE_VERSION!)
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo   X npm not found
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   + npm installed (!NPM_VERSION!)
)

echo.

REM Build Zed extension
echo [3/9] Building Zed extension (WASM)...
echo   -^> Compiling Rust to WASM...
cargo build --release --target wasm32-wasip1

if %errorlevel% neq 0 (
    echo   X Failed to build Zed extension
    exit /b 1
) else (
    echo   + Zed extension built successfully
)

echo.

REM Deploy Zed extension
echo [4/9] Deploying Zed extension...

echo   -^> Creating extension directory...
if not exist "%ZED_EXT_DIR%" mkdir "%ZED_EXT_DIR%"

echo   -^> Copying WASM binary...
copy /Y "target\wasm32-wasip1\release\log_scout_analyzer.wasm" "%ZED_EXT_DIR%\" >nul

echo   -^> Copying extension.toml...
copy /Y "extension.toml" "%ZED_EXT_DIR%\" >nul

echo   -^> Copying config directory...
if exist "%ZED_EXT_DIR%\config" rmdir /S /Q "%ZED_EXT_DIR%\config"
xcopy /E /I /Y "config" "%ZED_EXT_DIR%\config" >nul

echo   -^> Copying grammars directory...
if exist "grammars" (
    if exist "%ZED_EXT_DIR%\grammars" rmdir /S /Q "%ZED_EXT_DIR%\grammars"
    xcopy /E /I /Y "grammars" "%ZED_EXT_DIR%\grammars" >nul
)

if exist "%ZED_EXT_DIR%\log_scout_analyzer.wasm" (
    if exist "%ZED_EXT_DIR%\extension.toml" (
        echo   + Zed extension deployed
        echo     Location: %ZED_EXT_DIR%
    ) else (
        echo   X Zed extension deployment failed
        exit /b 1
    )
) else (
    echo   X Zed extension deployment failed
    exit /b 1
)

echo.

REM Install VS Code extension dependencies
echo [5/9] Installing VS Code extension dependencies...

cd vscode-extension

if exist "node_modules" (
    echo   -^> node_modules exists, checking for updates...
    call npm update
) else (
    echo   -^> Installing npm packages...
    call npm install
)

if %errorlevel% neq 0 (
    echo   X Failed to install dependencies
    cd ..
    exit /b 1
) else (
    echo   + Dependencies installed
)

cd ..
echo.

REM Build VS Code extension
echo [6/9] Building VS Code extension...

cd vscode-extension

echo   -^> Compiling TypeScript...
call npm run compile

if %errorlevel% neq 0 (
    echo   X Failed to compile VS Code extension
    cd ..
    exit /b 1
) else (
    echo   + VS Code extension compiled
)

cd ..
echo.

REM Package VS Code extension
echo [7/9] Packaging VS Code extension (.vsix)...

cd vscode-extension

where vsce >nul 2>&1
if %errorlevel% neq 0 (
    echo   -^> Installing vsce globally...
    call npm install -g @vscode/vsce
)

echo   -^> Creating VSIX package...
call npm run package

if %errorlevel% neq 0 (
    echo   X Failed to package VS Code extension
    cd ..
    exit /b 1
)

for /f "delims=" %%i in ('dir /b /o-d *.vsix 2^>nul') do (
    set "VSIX_FILE=%%i"
    goto :found_vsix
)

:found_vsix
if defined VSIX_FILE (
    echo   + VSIX package created: !VSIX_FILE!
    copy /Y "!VSIX_FILE!" "..\!VSIX_FILE!" >nul
    echo   + Copied to parent directory
) else (
    echo   X VSIX file not found
    cd ..
    exit /b 1
)

cd ..
echo.

REM Deploy VS Code extension
echo [8/9] Deploying VS Code extension...

if not defined VSIX_FILE (
    for /f "delims=" %%i in ('dir /b /o-d vscode-extension\*.vsix 2^>nul') do (
        set "VSIX_FILE=vscode-extension\%%i"
        goto :deploy_vsix
    )
)

:deploy_vsix
if not defined VSIX_FILE (
    echo   X No VSIX file found
    exit /b 1
)

echo   -^> Installing extension from VSIX...

where code >nul 2>&1
if %errorlevel% equ 0 (
    code --install-extension "!VSIX_FILE!" --force
    if %errorlevel% equ 0 (
        echo   + VS Code extension installed
    ) else (
        echo   ! code command failed, manual installation required
        echo     Install manually: code --install-extension !VSIX_FILE!
    )
) else (
    echo   ! VS Code CLI not found
    echo     Install manually in VS Code:
    echo     1. Press Ctrl+Shift+P
    echo     2. Type 'Extensions: Install from VSIX'
    echo     3. Select: !VSIX_FILE!
)

echo.

REM Summary
echo [9/9] Build Summary
echo ============================================================
echo.

echo + Zed Extension
echo   Location: %ZED_EXT_DIR%
if exist "%ZED_EXT_DIR%\log_scout_analyzer.wasm" (
    for %%A in ("%ZED_EXT_DIR%\log_scout_analyzer.wasm") do echo   WASM Size: %%~zA bytes
)
echo   Files: extension.toml, log_scout_analyzer.wasm, config/, grammars/
echo.

echo + VS Code Extension
if defined VSIX_FILE (
    for /f "delims=" %%i in ('dir /b "!VSIX_FILE!" 2^>nul') do set "VSIX_NAME=%%i"
    echo   Package: !VSIX_NAME!
    for %%A in ("!VSIX_FILE!") do echo   Size: %%~zA bytes
)
echo.

echo ============================================================
echo.

echo Next Steps:
echo.

echo For Zed:
echo   1. Completely quit and restart Zed
echo   2. Press Ctrl+Shift+X to open Extensions
echo   3. Look for 'Log Scout Analyzer' in installed extensions
echo   4. Open a .log file to test
echo.

echo For VS Code:
where code >nul 2>&1
if %errorlevel% equ 0 (
    echo   1. Restart VS Code (Ctrl+Shift+P -^> 'Developer: Reload Window'^)
    echo   2. Open Extensions panel (Ctrl+Shift+X^)
    echo   3. Search for 'Log Scout Analyzer'
    echo   4. Open a .log file to test
) else (
    echo   1. In VS Code, press Ctrl+Shift+P
    echo   2. Type 'Extensions: Install from VSIX'
    echo   3. Select: !VSIX_FILE!
    echo   4. Restart VS Code
    echo   5. Open a .log file to test
)
echo.

echo Testing:
echo   Open test.log in either editor to verify functionality
echo.

echo ============================================================
echo Build completed successfully!
echo ============================================================

endlocal
exit /b 0
