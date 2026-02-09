@echo off
REM Log Scout Analyzer - Windows Build Script
REM This script helps you build and install the Log Scout Analyzer extension for Zed

setlocal enabledelayedexpansion

REM Colors using Windows escape sequences (limited support)
set "INFO=[INFO]"
set "SUCCESS=[OK]"
set "WARNING=[WARN]"
set "ERROR=[ERROR]"

REM Detect Zed extensions directory
set "ZED_EXT_DIR=%APPDATA%\Zed\extensions"

echo.
echo ===============================================
echo   Log Scout Analyzer - Build Script
echo ===============================================
echo.

REM Check command line argument
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=all"

goto :command_%COMMAND% 2>nul || goto :unknown_command

:command_setup
echo %INFO% Setting up development environment...
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    call :install_rust
)
call :add_wasm_target
echo %SUCCESS% Setup complete!
goto :eof

:command_build
echo %INFO% Building extension...
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    echo %ERROR% Rust not installed. Run 'build.bat setup'
    exit /b 1
)
call :build_extension
if !ERRORLEVEL! NEQ 0 exit /b 1
call :install_to_zed
echo %SUCCESS% Build complete and extension installed!
echo %INFO% Please restart Zed to load the extension
goto :eof

:command_test
echo %INFO% Running tests...
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    echo %ERROR% Rust not installed. Run 'build.bat setup'
    exit /b 1
)
call :run_tests
goto :eof

:command_lint
echo %INFO% Running clippy...
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    echo %ERROR% Rust not installed. Run 'build.bat setup'
    exit /b 1
)
call :run_clippy
goto :eof

:command_format
echo %INFO% Formatting code...
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    echo %ERROR% Rust not installed. Run 'build.bat setup'
    exit /b 1
)
call :format_code
goto :eof

:command_install
echo %INFO% Installing to Zed...
call :install_to_zed
goto :eof

:command_uninstall
echo %INFO% Uninstalling from Zed...
call :uninstall_from_zed
goto :eof

:command_clean
echo %INFO% Cleaning build artifacts...
call :clean
goto :eof

:command_all
call :check_rust
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo Rust is not installed.
    set /p "INSTALL=Install Rust now? (y/n): "
    if /i "!INSTALL!"=="y" (
        call :install_rust
        call :add_wasm_target
    ) else (
        echo %ERROR% Rust is required to build the extension
        exit /b 1
    )
) else (
    call :add_wasm_target
)

call :format_code
call :run_tests
if !ERRORLEVEL! NEQ 0 exit /b 1
call :run_clippy
call :build_extension
if !ERRORLEVEL! NEQ 0 exit /b 1
call :install_to_zed

echo.
echo ===============================================
echo   Build Complete!
echo ===============================================
echo.
echo %SUCCESS% Extension is ready to use
echo %INFO% Please restart Zed to load the extension
echo.
goto :eof

:command_help
call :show_help
goto :eof

:unknown_command
echo %ERROR% Unknown command: %COMMAND%
echo Run 'build.bat help' for usage information
exit /b 1

REM ===== Functions =====

:check_rust
where rustc >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('rustc --version') do set RUST_VERSION=%%i
    echo %SUCCESS% Rust is installed: !RUST_VERSION!
    exit /b 0
) else (
    echo %WARNING% Rust is not installed
    exit /b 1
)

:install_rust
echo.
echo ===============================================
echo   Installing Rust
echo ===============================================
echo.
echo %INFO% Downloading rustup installer...
curl --proto =https --tlsv1.2 -sSf https://win.rustup.rs/x86_64 -o rustup-init.exe
if !ERRORLEVEL! NEQ 0 (
    echo %ERROR% Failed to download rustup
    exit /b 1
)

echo %INFO% Running rustup installer...
rustup-init.exe -y
del rustup-init.exe

REM Add cargo to PATH for current session
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

echo %SUCCESS% Rust installed successfully
exit /b 0

:add_wasm_target
echo.
echo ===============================================
echo   Adding WASM Target
echo ===============================================
echo.

rustup target list | findstr "wasm32-wasi (installed)" >nul
if %ERRORLEVEL% EQU 0 (
    echo %SUCCESS% wasm32-wasi target already installed
) else (
    echo %INFO% Adding wasm32-wasi target...
    rustup target add wasm32-wasi
    if !ERRORLEVEL! EQU 0 (
        echo %SUCCESS% wasm32-wasi target added
    ) else (
        echo %ERROR% Failed to add wasm32-wasi target
        exit /b 1
    )
)
exit /b 0

:run_tests
echo.
echo ===============================================
echo   Running Tests
echo ===============================================
echo.

cargo test --quiet
if %ERRORLEVEL% EQU 0 (
    echo %SUCCESS% All tests passed!
    exit /b 0
) else (
    echo %ERROR% Some tests failed
    exit /b 1
)

:run_clippy
echo.
echo ===============================================
echo   Running Clippy
echo ===============================================
echo.

cargo clippy --quiet -- -D warnings
if %ERRORLEVEL% EQU 0 (
    echo %SUCCESS% No clippy warnings!
) else (
    echo %WARNING% Clippy found some warnings
    cargo clippy
)
exit /b 0

:format_code
echo.
echo ===============================================
echo   Formatting Code
echo ===============================================
echo.

cargo fmt
echo %SUCCESS% Code formatted
exit /b 0

:build_extension
echo.
echo ===============================================
echo   Building Extension
echo ===============================================
echo.

echo %INFO% Building for wasm32-wasi target...
echo %INFO% This may take a few minutes on first build...

cargo build --release --target wasm32-wasi
if %ERRORLEVEL% EQU 0 (
    echo %SUCCESS% Build completed successfully!

    set "WASM_FILE=target\wasm32-wasi\release\log_scout_analyzer.wasm"
    if exist "!WASM_FILE!" (
        for %%A in ("!WASM_FILE!") do set SIZE=%%~zA
        set /a SIZE_KB=!SIZE! / 1024
        echo %INFO% WASM file size: !SIZE_KB! KB
    )
    exit /b 0
) else (
    echo %ERROR% Build failed
    exit /b 1
)

:install_to_zed
echo.
echo ===============================================
echo   Installing to Zed
echo ===============================================
echo.

set "WASM_FILE=target\wasm32-wasi\release\log_scout_analyzer.wasm"

if not exist "!WASM_FILE!" (
    echo %ERROR% WASM file not found. Please build first.
    exit /b 1
)

set "EXT_DIR=%ZED_EXT_DIR%\log-scout-analyzer"
if not exist "!EXT_DIR!" mkdir "!EXT_DIR!"

echo %INFO% Copying files to !EXT_DIR!...
copy /Y "!WASM_FILE!" "!EXT_DIR!\" >nul
copy /Y "extension.toml" "!EXT_DIR!\" >nul

if exist "config" (
    xcopy /E /I /Y config "!EXT_DIR!\config" >nul
    echo %SUCCESS% Configuration files copied
)

echo %SUCCESS% Extension installed to Zed!
echo %INFO% Restart Zed to load the extension
exit /b 0

:uninstall_from_zed
echo.
echo ===============================================
echo   Uninstalling from Zed
echo ===============================================
echo.

set "EXT_DIR=%ZED_EXT_DIR%\log-scout-analyzer"

if exist "!EXT_DIR!" (
    rmdir /S /Q "!EXT_DIR!"
    echo %SUCCESS% Extension uninstalled
) else (
    echo %WARNING% Extension not found
)
exit /b 0

:clean
echo.
echo ===============================================
echo   Cleaning Build Artifacts
echo ===============================================
echo.

cargo clean
echo %SUCCESS% Clean complete
exit /b 0

:show_help
echo.
echo Log Scout Analyzer - Build Script
echo.
echo Usage: build.bat [command]
echo.
echo Commands:
echo     setup       - Install Rust and setup development environment
echo     build       - Build the extension
echo     test        - Run tests
echo     lint        - Run clippy linter
echo     format      - Format code
echo     install     - Install extension to Zed
echo     uninstall   - Remove extension from Zed
echo     clean       - Clean build artifacts
echo     all         - Setup, build, test, and install (default)
echo     help        - Show this help message
echo.
echo Examples:
echo     build.bat              # Run full build and install
echo     build.bat build        # Just build
echo     build.bat test         # Just run tests
echo     build.bat install      # Install to Zed
echo.
exit /b 0
