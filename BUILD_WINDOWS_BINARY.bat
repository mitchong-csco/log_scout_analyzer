@echo off
REM Change to script directory first
cd /d "%~dp0"

echo ========================================
echo Building LSP Server for Windows
echo ========================================
echo.
echo Current directory: %CD%
echo.

cd lsp-server
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: lsp-server directory not found!
    echo Make sure this script is in the project root.
    pause
    exit /b 1
)

cargo build --release --bin log-scout-lsp-server
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Copying binary...
    if not exist "..\vscode-extension\bin" mkdir "..\vscode-extension\bin"
    copy /Y "target\release\log-scout-lsp-server.exe" "..\vscode-extension\bin\log-scout-lsp-server-win.exe"
    echo.
    echo Done! Binary at: vscode-extension\bin\log-scout-lsp-server-win.exe
    echo.
    echo Next step: cd vscode-extension ^&^& npm run package
) else (
    echo.
    echo BUILD FAILED!
    echo Install Rust from: https://rustup.rs/
)
cd ..
pause
