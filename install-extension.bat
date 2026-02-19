@echo off
REM Quick install script for Log Scout Analyzer VS Code Extension
REM Use this when you've already built the extension and just want to install it

echo ============================================
echo Installing Log Scout Analyzer Extension
echo ============================================
echo.

cd vscode-extension

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Cannot find package.json
    echo Please run this script from the log_scout_analyzer root directory.
    cd ..
    exit /b 1
)

REM Find the most recent VSIX file
for /f "delims=" %%i in ('dir /b /od log-scout-analyzer-*.vsix 2^>nul') do set VSIX_FILE=%%i

if not defined VSIX_FILE (
    echo ERROR: No VSIX file found!
    echo.
    echo Please build the extension first:
    echo   1. Run build-all.bat from the root directory, or
    echo   2. Run: npm run package
    echo.
    cd ..
    exit /b 1
)

echo Found extension: %VSIX_FILE%
echo.
echo Installing to VS Code...

code --install-extension "%VSIX_FILE%" --force

if errorlevel 1 (
    echo.
    echo ❌ Installation failed!
    echo.
    echo Troubleshooting:
    echo   1. Make sure VS Code is installed and 'code' is in your PATH
    echo   2. Try installing manually:
    echo      code --install-extension %VSIX_FILE%
    echo   3. Or install via VS Code UI:
    echo      - Press Ctrl+Shift+X
    echo      - Click "..." menu
    echo      - Select "Install from VSIX..."
    echo      - Browse to: vscode-extension\%VSIX_FILE%
    echo.
) else (
    echo.
    echo ============================================
    echo ✅ Installation Complete!
    echo ============================================
    echo.
    echo Extension installed: %VSIX_FILE%
    echo.
    echo ⚠️  IMPORTANT: Restart VS Code to activate the extension
    echo.
    echo 🚀 Usage:
    echo   1. Restart all VS Code windows
    echo   2. Open a log file (.log, .txt, .out, .err)
    echo   3. Look for the 🔍 Scout icon in the Activity Bar
    echo   4. Or press Ctrl+Shift+P and type "Scout"
    echo.
    echo 💡 Tips:
    echo   - To uninstall: code --uninstall-extension log-scout-team.log-scout-analyzer
    echo   - To reinstall: run this script again
    echo   - To rebuild: run build-all.bat from root directory
    echo.
)

cd ..
pause
