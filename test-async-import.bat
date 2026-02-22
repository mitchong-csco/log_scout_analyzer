@echo off
REM ============================================================================
REM Master Test Script for Async Import Feature
REM ============================================================================
REM This script provides a comprehensive testing workflow for the async import
REM feature with real-time progress tracking.
REM
REM Usage:
REM   test-async-import.bat [option]
REM
REM Options:
REM   setup    - Generate test archives
REM   monitor  - Monitor LSP logs in real-time
REM   analyze  - Analyze test results from logs
REM   all      - Run complete test suite
REM   help     - Show this help message
REM ============================================================================

setlocal enabledelayedexpansion

set OPTION=%1

if "%OPTION%"=="" set OPTION=help
if "%OPTION%"=="help" goto :show_help
if "%OPTION%"=="setup" goto :setup
if "%OPTION%"=="monitor" goto :monitor
if "%OPTION%"=="analyze" goto :analyze
if "%OPTION%"=="all" goto :run_all

echo Unknown option: %OPTION%
echo Run "test-async-import.bat help" for usage information.
exit /b 1

REM ============================================================================
REM Show Help
REM ============================================================================
:show_help
echo.
echo ============================================================================
echo   Async Import Feature - Master Test Script
echo ============================================================================
echo.
echo This script helps you test the async bundle import feature with progress
echo tracking in Log Scout Analyzer.
echo.
echo Usage:
echo   test-async-import.bat [option]
echo.
echo Options:
echo   setup    - Generate test archives of various sizes
echo   monitor  - Monitor LSP server logs in real-time
echo   analyze  - Analyze test results and generate report
echo   all      - Run complete guided test suite
echo   help     - Show this help message
echo.
echo ============================================================================
echo   Quick Start
echo ============================================================================
echo.
echo 1. Generate Test Archives:
echo    test-async-import.bat setup
echo.
echo 2. In VS Code:
echo    - Reload window (Ctrl+Shift+P -^> "Developer: Reload Window")
echo    - Open Command Palette (Ctrl+Shift+P)
echo    - Type: "Scout: Import Log Archive"
echo    - Select: test-data\small-test.zip
echo.
echo 3. Monitor Progress (in another terminal):
echo    test-async-import.bat monitor
echo.
echo 4. Analyze Results:
echo    test-async-import.bat analyze
echo.
echo ============================================================================
echo   Test Archives
echo ============================================================================
echo.
echo The setup command generates the following test archives:
echo.
echo 1. small-test.zip (~10MB, 10 files)
echo    - Quick smoke test
echo    - Expected time: 3-8 seconds
echo.
echo 2. medium-test.zip (~50MB, 50 files)
echo    - Standard functionality test
echo    - Expected time: 15-45 seconds
echo.
echo 3. 700440257_qcsone_download_selected.zip (~5MB)
echo    - QCSONE case ID detection test
echo    - Expected result: Bundle named "Case 700440257"
echo.
echo 4. large-test.zip (~100MB+, 200 files)
echo    - Stress test
echo    - Expected time: 1-5 minutes
echo.
echo 5. invalid-archive.zip
echo    - Error handling test
echo    - Expected result: Error notification
echo.
echo ============================================================================
echo.
exit /b 0

REM ============================================================================
REM Setup: Generate Test Archives
REM ============================================================================
:setup
echo.
echo ============================================================================
echo   STEP 1: Generate Test Archives
echo ============================================================================
echo.

if not exist "generate-test-archives.bat" (
    echo ERROR: generate-test-archives.bat not found
    echo.
    echo Make sure you're running this from the log_scout_analyzer directory.
    exit /b 1
)

call generate-test-archives.bat

echo.
echo ============================================================================
echo   Test Archives Generated Successfully!
echo ============================================================================
echo.
echo Next step: Import archives in VS Code
echo.
echo 1. Open VS Code
echo 2. Reload window: Ctrl+Shift+P -^> "Developer: Reload Window"
echo 3. Open Bundles view (Activity Bar -^> Log Scout icon)
echo 4. Import archive: Ctrl+Shift+P -^> "Scout: Import Log Archive"
echo 5. Select: test-data\small-test.zip
echo.
echo To monitor progress in real-time, run in another terminal:
echo   test-async-import.bat monitor
echo.
echo ============================================================================
echo.

pause
exit /b 0

REM ============================================================================
REM Monitor: Watch LSP Logs in Real-Time
REM ============================================================================
:monitor
echo.
echo ============================================================================
echo   STEP 2: Monitor LSP Server Logs
echo ============================================================================
echo.

if not exist "monitor-import-logs.bat" (
    echo ERROR: monitor-import-logs.bat not found
    exit /b 1
)

echo Starting log monitor...
echo Press Ctrl+C to stop monitoring
echo.

call monitor-import-logs.bat

exit /b 0

REM ============================================================================
REM Analyze: Generate Test Report
REM ============================================================================
:analyze
echo.
echo ============================================================================
echo   STEP 3: Analyze Test Results
echo ============================================================================
echo.

if not exist "analyze-import-test.ps1" (
    echo ERROR: analyze-import-test.ps1 not found
    exit /b 1
)

echo Analyzing LSP server logs...
echo.

powershell -ExecutionPolicy Bypass -File analyze-import-test.ps1 -Detailed

echo.
echo ============================================================================
echo   Analysis Complete
echo ============================================================================
echo.

pause
exit /b 0

REM ============================================================================
REM Run All: Complete Guided Test Suite
REM ============================================================================
:run_all
echo.
echo ============================================================================
echo   Complete Async Import Test Suite
echo ============================================================================
echo.
echo This will guide you through the complete testing process:
echo   1. Generate test archives
echo   2. Manual import testing in VS Code
echo   3. Log analysis and report generation
echo.

pause

REM Step 1: Generate test archives
echo.
echo ============================================================================
echo   STEP 1 of 4: Generate Test Archives
echo ============================================================================
echo.

if not exist "test-data" (
    call generate-test-archives.bat
    if %ERRORLEVEL% neq 0 (
        echo ERROR: Failed to generate test archives
        exit /b 1
    )
) else (
    echo Test archives already exist in test-data\ directory
    echo.
    set /p REGENERATE="Do you want to regenerate them? (y/n): "
    if /i "!REGENERATE!"=="y" (
        call generate-test-archives.bat
    )
)

echo.
pause

REM Step 2: Manual testing instructions
echo.
echo ============================================================================
echo   STEP 2 of 4: Manual Import Testing
echo ============================================================================
echo.
echo Now you'll test the async import feature in VS Code.
echo.
echo Please complete the following tests:
echo.
echo TEST 1: Small Archive Import (Quick Smoke Test)
echo -----------------------------------------------
echo 1. Open VS Code
echo 2. Reload window: Ctrl+Shift+P -^> "Developer: Reload Window"
echo 3. Open Bundles view (Activity Bar -^> Log Scout icon)
echo 4. Import: Ctrl+Shift+P -^> "Scout: Import Log Archive"
echo 5. Select: test-data\small-test.zip
echo.
echo Expected behavior:
echo   - Bundle appears INSTANTLY with spinner icon
echo   - Progress updates: 0%% -^> 5%% -^> 20%% -^> 50%% -^> 75%% -^> 100%%
echo   - Messages: "Extracting...", "Creating bundle...", "Adding logs..."
echo   - Time elapsed shown: (0s), (2s), (5s), etc.
echo   - Completes in 3-8 seconds
echo   - Success notification appears
echo.
pause
echo.

echo TEST 2: QCSONE Package (Case ID Detection)
echo -------------------------------------------
echo 1. Import: test-data\700440257_qcsone_download_selected.zip
echo 2. Watch for progress updates
echo 3. Verify bundle name becomes: "Case 700440257"
echo 4. Check bundle has "qcsone" tag
echo.
pause
echo.

echo TEST 3: Multiple Concurrent Imports
echo ------------------------------------
echo 1. Start importing: test-data\medium-test.zip
echo 2. IMMEDIATELY start importing: test-data\small-test.zip
echo 3. Verify both show in tree with spinners
echo 4. Verify both show independent progress
echo 5. Verify both complete successfully
echo.
pause
echo.

echo TEST 4: Error Handling
echo -----------------------
echo 1. Import: test-data\invalid-archive.zip
echo 2. Verify error notification appears
echo 3. Verify no partial bundle created
echo 4. Verify optimistic bundle removed
echo.
pause
echo.

echo TEST 5: UI Responsiveness (Optional - Large Archive)
echo -----------------------------------------------------
echo 1. Import: test-data\large-test.zip
echo 2. While import is running, try:
echo    - Browse other bundles
echo    - Open other log files
echo    - Use other VS Code features
echo 3. Verify UI stays responsive
echo 4. Verify import completes in background
echo.
set /p DO_STRESS_TEST="Do you want to run the stress test? (y/n): "

if /i "!DO_STRESS_TEST!"=="y" (
    echo.
    echo Please complete the stress test now...
    pause
)

REM Step 3: Monitor logs (optional)
echo.
echo ============================================================================
echo   STEP 3 of 4: Log Monitoring (Optional)
echo ============================================================================
echo.
set /p MONITOR_LOGS="Would you like to view the LSP server logs? (y/n): "

if /i "!MONITOR_LOGS!"=="y" (
    echo.
    echo Opening log file...
    echo.

    set LOG_DIR=%USERPROFILE%\.log-scout-analyzer
    if exist "!LOG_DIR!" (
        for /f "delims=" %%i in ('dir /b /o-d "!LOG_DIR!\lsp-server-*.log" 2^>nul') do (
            notepad "!LOG_DIR!\%%i"
            goto :done_viewing_logs
        )
    )

    echo ERROR: Could not find LSP server logs
    :done_viewing_logs
)

REM Step 4: Analyze results
echo.
echo ============================================================================
echo   STEP 4 of 4: Analyze Test Results
echo ============================================================================
echo.

echo Generating test report from LSP server logs...
echo.

powershell -ExecutionPolicy Bypass -File analyze-import-test.ps1 -Detailed

REM Final summary
echo.
echo ============================================================================
echo   Test Suite Complete!
echo ============================================================================
echo.
echo Testing Summary:
echo.
echo   [x] Test archives generated
echo   [x] Manual import testing completed
echo   [x] Log analysis performed
echo.
echo Review the analysis results above to verify:
echo   - All imports completed successfully
echo   - Progress notifications were sent
echo   - UI remained responsive
echo   - No errors occurred
echo.
echo If all tests passed, the async import feature is working correctly!
echo.
echo ============================================================================
echo   Test Report
echo ============================================================================
echo.
echo Date:        %DATE% %TIME%
echo Tester:      %USERNAME%
echo Environment: %OS%
echo.
echo For detailed test report template, see:
echo   ASYNC_IMPORT_TESTING.md
echo.
echo ============================================================================
echo.

pause
exit /b 0
