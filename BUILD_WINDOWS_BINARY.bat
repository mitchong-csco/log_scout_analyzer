@echo off
REM Save the project root directory
set PROJECT_ROOT=%CD%

echo ========================================
echo Building LSP Server for Windows
echo ========================================
echo.
echo Project root: %PROJECT_ROOT%
echo.

REM Build the Rust LSP server
cd /d "%PROJECT_ROOT%\lsp-server"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: lsp-server directory not found!
    echo Make sure this script is in the project root.
    exit /b 1
)

echo Building Rust binary...
cargo build --release --bin log-scout-lsp-server
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo BUILD FAILED!
    echo Install Rust from: https://rustup.rs/
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)

echo.
echo SUCCESS! Copying binary...

REM Create bin directory if it doesn't exist
if not exist "%PROJECT_ROOT%\vscode-extension\bin" (
    echo Creating bin directory...
    mkdir "%PROJECT_ROOT%\vscode-extension\bin"
)

REM Copy binary using full paths
set SOURCE_BINARY=%PROJECT_ROOT%\lsp-server\target\release\log-scout-lsp-server.exe
set DEST_BINARY=%PROJECT_ROOT%\vscode-extension\bin\log-scout-lsp-server-win.exe

echo Source: %SOURCE_BINARY%
echo Dest:   %DEST_BINARY%
echo.

if not exist "%SOURCE_BINARY%" (
    echo ERROR: Source binary not found at: %SOURCE_BINARY%
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)

copy /Y "%SOURCE_BINARY%" "%DEST_BINARY%"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to copy binary!
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)

echo.
if exist "%DEST_BINARY%" (
    echo ✅ Binary copied successfully!
    echo Location: vscode-extension\bin\log-scout-lsp-server-win.exe
) else (
    echo ❌ ERROR: Binary copy verification failed!
    echo Expected at: %DEST_BINARY%
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)

echo.
echo Next step: cd vscode-extension ^&^& npm run package

cd /d "%PROJECT_ROOT%"
