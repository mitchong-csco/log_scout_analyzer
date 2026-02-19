@echo off
REM Build and install script for Log Scout Analyzer Zed Extension
REM This script builds the extension and installs it as a dev extension in Zed

echo ============================================
echo Building and Installing Zed Extension
echo ============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>nul
if errorlevel 1 (
    echo ERROR: Cargo/Rust not found!
    echo.
    echo Zed extensions require Rust to be installed via rustup.
    echo Please install Rust from: https://rustup.rs/
    echo.
    echo Note: Rust MUST be installed via rustup (not homebrew or other methods)
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "zed-extension" (
    echo ERROR: zed-extension directory not found!
    echo Please run this script from the log_scout_analyzer root directory.
    pause
    exit /b 1
)

cd zed-extension

REM Check if extension.toml exists
if not exist "extension.toml" (
    echo ERROR: extension.toml not found!
    echo The Zed extension structure is not set up yet.
    echo.
    echo To set up a Zed extension, you need:
    echo   - extension.toml (extension metadata)
    echo   - Cargo.toml (Rust project)
    echo   - src/lib.rs (extension code)
    echo.
    echo See: https://zed.dev/docs/extensions/developing-extensions
    echo.
    cd ..
    pause
    exit /b 1
)

echo Found Zed extension configuration
echo.

REM ============================================
REM Step 1: Build Shared Core (if needed)
REM ============================================
echo [1/3] Checking shared-core...
echo.

if not exist "..\shared-core\dist" (
    echo Shared core not built. Building now...
    cd ..\shared-core

    if not exist "node_modules" (
        echo Installing shared-core dependencies...
        call npm install
        if errorlevel 1 (
            echo ERROR: Failed to install shared-core dependencies!
            cd ..\zed-extension
            pause
            exit /b 1
        )
    )

    call npm run build
    if errorlevel 1 (
        echo ERROR: Failed to build shared-core!
        cd ..\zed-extension
        pause
        exit /b 1
    )

    echo ✓ Shared-core built successfully
    cd ..\zed-extension
) else (
    echo ✓ Shared-core already built
)

echo.

REM ============================================
REM Step 2: Build Zed Extension
REM ============================================
echo [2/3] Building Zed extension...
echo.

echo Compiling Rust code to WebAssembly...
cargo build --release
if errorlevel 1 (
    echo ERROR: Failed to build Zed extension!
    echo.
    echo Troubleshooting:
    echo   1. Make sure Rust is installed via rustup
    echo   2. Check Cargo.toml for correct dependencies
    echo   3. Check src/lib.rs for compilation errors
    echo   4. Run 'cargo check' for more details
    echo.
    cd ..
    pause
    exit /b 1
)

echo ✓ Zed extension built successfully
echo.

REM ============================================
REM Step 3: Install as Dev Extension in Zed
REM ============================================
echo [3/3] Installing to Zed...
echo.

REM Get the extension installation directory based on OS
set ZED_EXT_DIR=%LOCALAPPDATA%\Zed\extensions\installed

echo Installation directory: %ZED_EXT_DIR%
echo.

REM Read extension ID from extension.toml
set EXT_ID=
for /f "tokens=2 delims== " %%a in ('findstr /b "id" extension.toml') do (
    set EXT_ID=%%a
)
set EXT_ID=%EXT_ID:"=%

if not defined EXT_ID (
    echo ERROR: Could not read extension ID from extension.toml
    cd ..
    pause
    exit /b 1
)

echo Extension ID: %EXT_ID%
echo.

REM Create extensions directory if it doesn't exist
if not exist "%ZED_EXT_DIR%" (
    echo Creating Zed extensions directory...
    mkdir "%ZED_EXT_DIR%"
)

REM Remove existing installation if present
if exist "%ZED_EXT_DIR%\%EXT_ID%" (
    echo Removing existing installation...
    rmdir /s /q "%ZED_EXT_DIR%\%EXT_ID%"
)

REM Copy extension files to Zed extensions directory
echo Installing extension to Zed...
mkdir "%ZED_EXT_DIR%\%EXT_ID%"

REM Copy essential files
xcopy /E /I /Y "." "%ZED_EXT_DIR%\%EXT_ID%\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy extension files!
    cd ..
    pause
    exit /b 1
)

echo ✓ Extension installed successfully
echo.

cd ..

echo ============================================
echo ✅ Installation Complete!
echo ============================================
echo.
echo Extension installed as dev extension in Zed
echo Location: %ZED_EXT_DIR%\%EXT_ID%
echo.
echo ⚠️  IMPORTANT: Restart Zed to activate the extension
echo.
echo 🚀 Usage:
echo   1. Close and restart Zed
echo   2. Press Ctrl+Shift+X to open Extensions
echo   3. You should see "log-scout-analyzer" with "Dev" badge
echo   4. Open a log file (.log, .txt, .out, .err)
echo.
echo 💡 Tips:
echo   - To uninstall: Remove from %ZED_EXT_DIR%\%EXT_ID%
echo   - To rebuild: Run this script again
echo   - To see logs: Start Zed with 'zed --foreground'
echo   - Debug output: Check Zed.log (Cmd/Ctrl+Shift+P: "zed: open log")
echo.
echo 📖 Zed Extension Docs:
echo   https://zed.dev/docs/extensions/developing-extensions
echo.

pause
