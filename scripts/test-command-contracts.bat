@echo off
REM Command Contract Test Runner (Windows)
REM
REM Tests that TypeScript extension commands match Rust LSP server commands
REM by validating both against the shared lsp-commands.schema.json
REM
REM Usage:
REM   scripts\test-command-contracts.bat
REM
REM Or from project root:
REM   .\scripts\test-command-contracts.bat

setlocal enabledelayedexpansion

echo.
echo ================================================
echo   Command Contract Testing
echo ================================================
echo.
echo Testing that TypeScript extension and Rust LSP server
echo use the same command names from lsp-commands.schema.json
echo.

REM Get project root (assuming script is in scripts/ directory)
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"

REM Check schema file exists
set "SCHEMA_FILE=lsp-commands.schema.json"
if not exist "%SCHEMA_FILE%" (
    echo [ERROR] Schema file not found: %SCHEMA_FILE%
    echo         This file should be in the project root.
    exit /b 1
)

echo [OK] Found schema: %SCHEMA_FILE%
echo.

REM =============================================================================
REM Test 1: Rust LSP Server
REM =============================================================================
echo ================================================
echo   TEST 1: Rust LSP Server Command Contract
echo ================================================
echo.

cd lsp-server

cargo test --lib command_contract > "%TEMP%\rust_test_output.txt" 2>&1
set RUST_EXIT_CODE=%ERRORLEVEL%

if %RUST_EXIT_CODE% equ 0 (
    echo.
    echo [PASS] Rust command contract tests PASSED
    set RUST_PASSED=1
) else (
    echo.
    echo [FAIL] Rust command contract tests FAILED
    echo.
    echo To see full output, check: %TEMP%\rust_test_output.txt
    type "%TEMP%\rust_test_output.txt"
    set RUST_PASSED=0
)

cd "%PROJECT_ROOT%"

REM =============================================================================
REM Test 2: TypeScript Extension
REM =============================================================================
echo.
echo ================================================
echo   TEST 2: TypeScript Extension Command Contract
echo ================================================
echo.

cd vscode-extension

REM Check if node_modules exists
if not exist "node_modules" (
    echo [WARN] node_modules not found, installing dependencies...
    call npm install
)

REM Run TypeScript tests
call npm test -- --grep "Command Contract Tests" > "%TEMP%\ts_test_output.txt" 2>&1
set TS_EXIT_CODE=%ERRORLEVEL%

if %TS_EXIT_CODE% equ 0 (
    echo.
    echo [PASS] TypeScript command contract tests PASSED
    set TS_PASSED=1
) else (
    echo.
    echo [FAIL] TypeScript command contract tests FAILED
    echo.
    echo To see full output, check: %TEMP%\ts_test_output.txt
    type "%TEMP%\ts_test_output.txt"
    set TS_PASSED=0
)

cd "%PROJECT_ROOT%"

REM =============================================================================
REM Summary
REM =============================================================================
echo.
echo ================================================
echo   Test Summary
echo ================================================
echo.

if %RUST_PASSED% equ 1 if %TS_PASSED% equ 1 (
    echo [SUCCESS] ALL COMMAND CONTRACT TESTS PASSED
    echo.
    echo   [OK] Rust LSP server commands match schema
    echo   [OK] TypeScript extension commands match schema
    echo.
    echo The extension and server are using the same command names.
    echo.
    exit /b 0
) else (
    echo [FAILURE] SOME TESTS FAILED
    echo.

    if %RUST_PASSED% equ 0 (
        echo   [FAIL] Rust LSP server tests failed
        echo          Check: lsp-server\src\server.rs
        echo          Ensure all commands in lsp-commands.schema.json are handled
    ) else (
        echo   [OK] Rust LSP server tests passed
    )

    if %TS_PASSED% equ 0 (
        echo   [FAIL] TypeScript extension tests failed
        echo          Check: vscode-extension\src\bundleTreeProvider.ts
        echo          Check: vscode-extension\src\extension.ts
        echo          Ensure all commands use names from lsp-commands.schema.json
    ) else (
        echo   [OK] TypeScript extension tests passed
    )

    echo.
    echo Common issues:
    echo   * Command name mismatch (e.g., 'logScout.bundle.X' vs 'scout/bundle/X'^)
    echo   * Commands defined in schema but not implemented
    echo   * Commands implemented but not in schema
    echo.
    exit /b 1
)
