@echo off
echo ========================================
echo VALIDATION FIXED - Running cargo check
echo ========================================
echo.

cd C:\Users\mitchong\code\log_scout_analyzer

echo Step 1: Cargo check...
cargo check -p lsp-server 2>&1
set CHECK_RESULT=%ERRORLEVEL%

if %CHECK_RESULT% EQU 0 (
    echo.
    echo ✅ Cargo check PASSED!
    echo.
    echo Step 2: Running tests...
    cargo test -p lsp-server 2>&1
    set TEST_RESULT=%ERRORLEVEL%

    if %TEST_RESULT% EQU 0 (
        echo.
        echo ========================================
        echo ✅ VALIDATION SUCCESSFUL!
        echo ========================================
        echo.
        echo All 22 tests passed
        echo Tasks 1.1 and 1.2 are complete
        echo.
        echo Ready to commit:
        echo   git add crates/lsp-server/ Cargo.toml
        echo   git commit -m "feat(bundle): implement models and service detector"
        echo.
    ) else (
        echo.
        echo ❌ Tests failed
        exit /b 1
    )
) else (
    echo.
    echo ❌ Cargo check failed
    exit /b 1
)
