@echo off
REM ============================================================================
REM Quick Test - Async Import Feature (5 minutes)
REM ============================================================================

echo.
echo ============================================================================
echo   Quick Test - Async Import Feature
echo ============================================================================
echo.
echo This 5-minute test will verify the async import feature works correctly.
echo.
pause

REM ============================================================================
REM Step 1: Generate a small test archive
REM ============================================================================
echo.
echo [1/4] Creating test archive...
echo.

if not exist "test-data" mkdir test-data
cd test-data

REM Create a simple test log
echo [2024-01-01 10:00:00] INFO Application started > test.log
echo [2024-01-01 10:00:01] DEBUG Loading configuration >> test.log
echo [2024-01-01 10:00:02] INFO Service initialized >> test.log
echo [2024-01-01 10:00:03] WARN Connection slow >> test.log
echo [2024-01-01 10:00:04] ERROR Connection timeout >> test.log
echo [2024-01-01 10:00:05] INFO Retrying connection >> test.log
echo [2024-01-01 10:00:06] INFO Connection established >> test.log
echo [2024-01-01 10:00:07] INFO Processing request >> test.log
echo [2024-01-01 10:00:08] INFO Request completed >> test.log

REM Add more lines to make it bigger
for /L %%i in (1,1,50) do (
    echo [2024-01-01 10:%%i:00] INFO Processing batch %%i >> test.log
    echo [2024-01-01 10:%%i:01] DEBUG Query executed >> test.log
)

REM Create ZIP file
powershell -Command "Compress-Archive -Path test.log -DestinationPath quick-test.zip -Force" >nul 2>&1

cd ..

echo   Created: test-data\quick-test.zip
echo.

REM ============================================================================
REM Step 2: Import in VS Code
REM ============================================================================
echo [2/4] Now test in VS Code:
echo.
echo   1. Reload VS Code window
echo      Press: Ctrl+Shift+P
echo      Type: "Developer: Reload Window"
echo      Press: Enter
echo.
echo   2. Open Command Palette again
echo      Press: Ctrl+Shift+P
echo.
echo   3. Import the test archive
echo      Type: "Scout: Import Log Archive"
echo      Press: Enter
echo      Navigate to: test-data\quick-test.zip
echo      Click: Open
echo.
echo   4. Watch the Bundles tree view!
echo.
pause

REM ============================================================================
REM Step 3: What to look for
REM ============================================================================
echo.
echo [3/4] What you should see:
echo.
echo   Time     What Appears
echo   ----------------------------------------
echo   0ms      Bundle appears with spinner icon
echo            "Importing quick-test.zip..."
echo            "0%% Starting... (0s)"
echo.
echo   2s       "5%% Extracting archive... (2s)"
echo.
echo   3s       "50%% Creating bundle... (3s)"
echo.
echo   4s       "75%% Adding logs: 1/1 (4s)"
echo.
echo   5s       Real bundle appears
echo            "Bundle_XXXXX" or "Import quick-test"
echo            Shows: 1 log file
echo.
echo   6s       Success notification
echo            "Successfully imported 1 log file"
echo.
echo ============================================================================
echo.
echo Did you see the above behavior? (y/n)
set /p SUCCESS="> "

if /i "%SUCCESS%"=="y" (
    echo.
    echo   SUCCESS! The async import feature is working correctly!
    echo.
) else (
    echo.
    echo   Let's check the logs...
    echo.
)

REM ============================================================================
REM Step 4: Check logs
REM ============================================================================
echo [4/4] Checking LSP server logs...
echo.

set LOG_DIR=%USERPROFILE%\.log-scout-analyzer

if not exist "%LOG_DIR%" (
    echo   ERROR: Log directory not found
    echo   Location: %LOG_DIR%
    echo.
    echo   This means the LSP server hasn't run yet.
    echo   Make sure the extension is installed and activated.
    goto :end
)

REM Find latest log file
for /f "delims=" %%i in ('dir /b /o-d "%LOG_DIR%\lsp-server-*.log" 2^>nul') do (
    set LOG_FILE=%LOG_DIR%\%%i
    goto :found_log
)

echo   ERROR: No log files found in %LOG_DIR%
goto :end

:found_log
echo   Log file: %LOG_FILE%
echo.
echo   Searching for import events...
echo.

REM Check for key events
findstr /i "Importing package" "%LOG_FILE%" >nul
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Import started
) else (
    echo   [FAIL] No import detected
)

findstr /i "Extracted.*files" "%LOG_FILE%" >nul
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Archive extracted
) else (
    echo   [FAIL] No extraction detected
)

findstr /i "Created bundle" "%LOG_FILE%" >nul
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Bundle created
) else (
    echo   [FAIL] No bundle creation detected
)

findstr /i "Import complete" "%LOG_FILE%" >nul
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Import completed
) else (
    echo   [FAIL] Import did not complete
)

findstr /i "progress.*percent" "%LOG_FILE%" >nul
if %ERRORLEVEL% equ 0 (
    echo   [PASS] Progress notifications sent
) else (
    echo   [WARN] No progress notifications found
    echo          (May be in different format)
)

:end
echo.
echo ============================================================================
echo   Quick Test Complete!
echo ============================================================================
echo.
echo Next steps:
echo   - If test passed: Try larger archives (medium-test.zip)
echo   - If test failed: Check the log file for errors
echo   - Full test suite: .\test-async-import.bat all
echo.
echo IMPORTANT: The command is "Scout: Create Bundle from Archive"
echo.
echo Log file location:
echo   %LOG_FILE%
echo.
echo ============================================================================
echo.

pause
