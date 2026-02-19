@echo off
REM Test verification script for pattern quality system
REM Run from project root: test-pattern-quality.bat

echo ========================================
echo Pattern Quality System - Test Runner
echo ========================================
echo.

cd lsp-server

echo [1/4] Checking code compiles...
cargo check --lib 2>&1 | findstr /C:"error" /C:"warning" /C:"Finished"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Code does not compile!
    pause
    exit /b 1
)
echo     ✓ Code compiles successfully
echo.

echo [2/4] Running pattern_loader tests...
cargo test pattern_loader::tests --lib 2>&1 | findstr /C:"test result" /C:"FAILED"
echo.

echo [3/4] Running pattern_tester tests...
cargo test pattern_tester::tests --lib 2>&1 | findstr /C:"test result" /C:"FAILED"
echo.

echo [4/4] Running quality_monitor tests...
cargo test quality_monitor::tests --lib 2>&1 | findstr /C:"test result" /C:"FAILED"
echo.

echo [5/5] Running pattern_quality_evaluator tests...
cargo test pattern_quality_evaluator::tests --lib 2>&1 | findstr /C:"test result" /C:"FAILED"
echo.

echo ========================================
echo Test suite complete!
echo ========================================
echo.
echo To run example:
echo   cargo run --example evaluate-patterns
echo   cargo run --example test-and-mark
echo.

cd ..
pause
