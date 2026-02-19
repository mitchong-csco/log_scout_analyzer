@echo off
echo Checking lsp-server crate...
cd crates\lsp-server

echo Step 1: Cargo check (fast compilation check)...
cargo check --lib 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Cargo check failed
    exit /b 1
)

echo.
echo ✅ Cargo check passed!
echo.
echo Step 2: Building library...
cargo build --lib 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Build failed
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo Step 3: Running tests...
cargo test 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ All tests passed!
    echo.
    echo ========================================
    echo VALIDATION COMPLETE - READY TO COMMIT
    echo ========================================
) else (
    echo.
    echo ❌ Tests failed
    exit /b 1
)
