@echo off
REM Local Testing Script - Simulates GitHub Actions
REM Run this before pushing to verify code quality
REM This runs the same checks GitHub Actions would run

echo ============================================================
echo Local Test Runner (Simulating GitHub Actions CI)
echo ============================================================
echo.
echo This script runs the same tests that GitHub Actions would run.
echo Use this until Actions is enabled in your repository.
echo.

cd lsp-server

set PASSED=0
set FAILED=0

REM ============================================================
echo [1/5] Code Formatting Check
echo ============================================================
cargo fmt --check

if %ERRORLEVEL% EQU 0 (
    echo     [PASS] Code is properly formatted
    set /a PASSED+=1
) else (
    echo     [FAIL] Code needs formatting - run: cargo fmt
    set /a FAILED+=1
)
echo.

REM ============================================================
echo [2/5] Clippy Linting
echo ============================================================
cargo clippy --lib -- -D warnings

if %ERRORLEVEL% EQU 0 (
    echo     [PASS] No clippy warnings
    set /a PASSED+=1
) else (
    echo     [FAIL] Clippy found issues
    set /a FAILED+=1
)
echo.

REM ============================================================
echo [3/5] Build Check
echo ============================================================
cargo build --lib

if %ERRORLEVEL% EQU 0 (
    echo     [PASS] Build successful
    set /a PASSED+=1
) else (
    echo     [FAIL] Build failed
    set /a FAILED+=1
)
echo.

REM ============================================================
echo [4/5] Unit Tests
echo ============================================================
cargo test --lib

if %ERRORLEVEL% EQU 0 (
    echo     [PASS] All tests passed
    set /a PASSED+=1
) else (
    echo     [FAIL] Some tests failed
    set /a FAILED+=1
)
echo.

REM ============================================================
echo [5/5] Pattern Quality Tests
echo ============================================================
cargo test pattern_quality_evaluator::tests --lib
cargo test quality_monitor::tests --lib
cargo test pattern_tester::tests --lib

if %ERRORLEVEL% EQU 0 (
    echo     [PASS] Pattern quality tests passed
    set /a PASSED+=1
) else (
    echo     [FAIL] Pattern quality tests failed
    set /a FAILED+=1
)
echo.

REM ============================================================
echo Test Summary
echo ============================================================
echo.
echo Passed: %PASSED%/5
echo Failed: %FAILED%/5
echo.

if %FAILED% EQU 0 (
    echo ============================================================
    echo ALL CHECKS PASSED! Your code is ready to push.
    echo ============================================================
    echo.
    echo This is what GitHub Actions would show:
    echo   [32m✓ quick-checks - passed[0m
    echo   [32m✓ test-lsp-server - passed[0m
    echo   [32m✓ pattern-quality-tests - passed[0m
    echo.
    echo Once GitHub Actions is enabled, these will run automatically!
) else (
    echo ============================================================
    echo SOME CHECKS FAILED! Fix issues before pushing.
    echo ============================================================
    echo.
    echo This is what GitHub Actions would show:
    echo   [31m✗ CI Failed - %FAILED% check(s) failed[0m
    echo.
    echo Fix the issues above, then run this script again.
)
echo.

pause
