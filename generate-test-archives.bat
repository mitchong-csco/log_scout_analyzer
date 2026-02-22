@echo off
REM ============================================================================
REM Generate Test Archives for Async Import Testing
REM ============================================================================
REM This script creates test archives of various sizes for testing the
REM async import feature with progress tracking.
REM ============================================================================

echo.
echo ============================================================================
echo   Generating Test Archives for Async Import
echo ============================================================================
echo.

REM Check if we're in the right directory
if not exist "vscode-extension" (
    echo ERROR: Must run from log_scout_analyzer root directory
    exit /b 1
)

REM Create test-data directory
if not exist "test-data" mkdir test-data
cd test-data

echo [1/5] Creating small test archive (< 10MB)...
echo ----------------------------------------------------------------------------

REM Create small logs directory
if not exist "small-logs" mkdir small-logs
cd small-logs

REM Generate 10 small log files (1MB each)
for /L %%i in (1,1,10) do (
    echo [2024-01-%%i 10:00:00] INFO System started > app-%%i.log
    echo [2024-01-%%i 10:00:01] DEBUG Loading configuration >> app-%%i.log
    echo [2024-01-%%i 10:00:02] INFO Service initialized >> app-%%i.log
    echo [2024-01-%%i 10:00:03] WARN Deprecated API used >> app-%%i.log
    echo [2024-01-%%i 10:00:04] ERROR Connection timeout >> app-%%i.log
    echo [2024-01-%%i 10:00:05] INFO Retry attempt 1 >> app-%%i.log
    echo [2024-01-%%i 10:00:06] INFO Retry attempt 2 >> app-%%i.log
    echo [2024-01-%%i 10:00:07] INFO Connection established >> app-%%i.log
    echo [2024-01-%%i 10:00:08] DEBUG Processing request >> app-%%i.log
    echo [2024-01-%%i 10:00:09] INFO Request completed >> app-%%i.log
)

REM Pad files to ~1MB each
for %%f in (*.log) do (
    for /L %%j in (1,1,100) do (
        echo [2024-01-01 10:%%j:00] INFO Processing request %%j of 1000... >> %%f
        echo [2024-01-01 10:%%j:01] DEBUG Request details: id=%%j, user=test_user >> %%f
        echo [2024-01-01 10:%%j:02] INFO Response sent successfully >> %%f
    )
)

REM Create ZIP
powershell Compress-Archive -Path *.log -DestinationPath ..\small-test.zip -Force

echo Created: small-test.zip (~10MB, 10 files)
cd ..
rmdir /s /q small-logs

echo.
echo [2/5] Creating medium test archive (10-50MB)...
echo ----------------------------------------------------------------------------

REM Create medium logs directory
if not exist "medium-logs" mkdir medium-logs
cd medium-logs

REM Generate 50 medium log files (~1MB each)
for /L %%i in (1,1,50) do (
    echo [2024-02-%%i 14:00:00] INFO Server started > server-%%i.log

    REM Add more lines to make it bigger
    for /L %%j in (1,1,200) do (
        echo [2024-02-%%i 14:%%j:00] INFO Processing batch %%j >> server-%%i.log
        echo [2024-02-%%i 14:%%j:01] DEBUG Database query executed >> server-%%i.log
        echo [2024-02-%%i 14:%%j:02] INFO Cache updated >> server-%%i.log
    )
)

REM Create ZIP
powershell Compress-Archive -Path *.log -DestinationPath ..\medium-test.zip -Force

echo Created: medium-test.zip (~50MB, 50 files)
cd ..
rmdir /s /q medium-logs

echo.
echo [3/5] Creating QCSONE-style package (simulated)...
echo ----------------------------------------------------------------------------

REM Create QCSONE logs directory
if not exist "qcsone-logs" mkdir qcsone-logs
cd qcsone-logs

REM Simulate QCSONE package structure with case ID in filename
REM Typical QCSONE: 700440257_qcsone_download_selected.zip

REM Create various service log files
echo [2024-03-01 09:00:00] INFO Jabber service starting > jabber_201_20240301.log
for /L %%i in (1,1,100) do (
    echo [2024-03-01 09:%%i:00] DEBUG Jabber message processed >> jabber_201_20240301.log
)

echo [2024-03-01 09:00:00] INFO Webex service starting > webex_20240301.log
for /L %%i in (1,1,100) do (
    echo [2024-03-01 09:%%i:00] INFO Webex call initiated >> webex_20240301.log
)

echo [2024-03-01 09:00:00] INFO Tomcat starting > tomcat_localhost.log
for /L %%i in (1,1,100) do (
    echo [2024-03-01 09:%%i:00] INFO HTTP request processed >> tomcat_localhost.log
)

echo [2024-03-01 09:00:00] INFO System log starting > messages.log
for /L %%i in (1,1,100) do (
    echo [2024-03-01 09:%%i:00] INFO System event logged >> messages.log
)

echo [2024-03-01 09:00:00] INFO Database log starting > postgresql.log
for /L %%i in (1,1,100) do (
    echo [2024-03-01 09:%%i:00] INFO Query executed >> postgresql.log
)

REM Create nested archive (common in QCSONE packages)
if not exist "nested" mkdir nested
cd nested
echo [2024-03-01 09:00:00] INFO Nested log > nested-app.log
for /L %%i in (1,1,50) do (
    echo [2024-03-01 09:%%i:00] DEBUG Nested log entry >> nested-app.log
)
powershell Compress-Archive -Path *.log -DestinationPath ..\nested-logs.zip -Force
cd ..
rmdir /s /q nested

REM Add some non-log files (common in QCSONE packages)
echo ^<?xml version="1.0"?^> > config.xml
echo ^<config^>^<version^>1.0^</version^>^</config^> >> config.xml

echo Case ID: 700440257 > summary.txt
echo Package Type: QCSONE Download >> summary.txt
echo Date: 2024-03-01 >> summary.txt

REM Create ZIP with QCSONE-style filename
powershell Compress-Archive -Path * -DestinationPath ..\700440257_qcsone_download_selected.zip -Force

echo Created: 700440257_qcsone_download_selected.zip (~5MB, simulated QCSONE)
cd ..
rmdir /s /q qcsone-logs

echo.
echo [4/5] Creating large test archive (for stress testing)...
echo ----------------------------------------------------------------------------

REM Create large logs directory
if not exist "large-logs" mkdir large-logs
cd large-logs

REM Generate 200 log files
for /L %%i in (1,1,200) do (
    echo [2024-04-%%i 16:00:00] INFO Large log file %%i > large-%%i.log

    REM Add many lines to make it big
    for /L %%j in (1,1,500) do (
        echo [2024-04-%%i 16:%%j:00] INFO Processing large batch %%j >> large-%%i.log
        echo [2024-04-%%i 16:%%j:01] DEBUG Large operation details >> large-%%i.log
    )
)

REM Create ZIP
powershell Compress-Archive -Path *.log -DestinationPath ..\large-test.zip -Force

echo Created: large-test.zip (~100MB+, 200 files)
cd ..
rmdir /s /q large-logs

echo.
echo [5/5] Creating error test archives...
echo ----------------------------------------------------------------------------

REM Create an invalid archive (not actually a zip)
echo This is not a valid ZIP file > invalid-archive.zip
echo Created: invalid-archive.zip (for error testing)

REM Create empty archive
if not exist "empty-temp" mkdir empty-temp
cd empty-temp
echo dummy > dummy.txt
powershell Compress-Archive -Path dummy.txt -DestinationPath ..\empty-archive.zip -Force
cd ..
rmdir /s /q empty-temp

REM Remove the log file from the zip to make it "empty"
powershell "$zip = [System.IO.Compression.ZipFile]::Open('empty-archive.zip', 'Update'); $zip.Entries | ForEach-Object { $_.Delete() }; $zip.Dispose()"
echo Created: empty-archive.zip (for error testing)

cd ..

echo.
echo ============================================================================
echo   Test Archives Generated Successfully!
echo ============================================================================
echo.
echo Test archives created in test-data\ directory:
echo.
echo 1. small-test.zip
echo    Size: ~10MB
echo    Files: 10 log files
echo    Purpose: Quick smoke test
echo    Expected time: 3-8 seconds
echo.
echo 2. medium-test.zip
echo    Size: ~50MB
echo    Files: 50 log files
echo    Purpose: Standard functionality test
echo    Expected time: 15-45 seconds
echo.
echo 3. 700440257_qcsone_download_selected.zip
echo    Size: ~5MB
echo    Files: 5 log files + nested archive
echo    Purpose: QCSONE case ID detection test
echo    Expected time: 10-20 seconds
echo    Expected result: Bundle named "Case 700440257"
echo.
echo 4. large-test.zip
echo    Size: ~100MB+
echo    Files: 200 log files
echo    Purpose: Stress test and performance
echo    Expected time: 1-5 minutes
echo.
echo 5. invalid-archive.zip
echo    Purpose: Error handling test (not a real ZIP)
echo    Expected result: Error notification
echo.
echo 6. empty-archive.zip
echo    Purpose: Error handling test (no log files)
echo    Expected result: Bundle with 0 files or error
echo.
echo ============================================================================
echo.
echo Next Steps:
echo   1. Open VS Code
echo   2. Reload window (Ctrl+Shift+P -^> "Developer: Reload Window")
echo   3. Open Command Palette (Ctrl+Shift+P)
echo   4. Type: "Scout: Import Log Archive"
echo   5. Select test-data\small-test.zip
echo   6. Watch the Bundles tree for progress updates
echo.
echo Expected Behavior:
echo   - Bundle appears instantly with spinner
echo   - Progress updates: 0%% -^> 5%% -^> 20%% -^> 50%% -^> 75%% -^> 100%%
echo   - Messages: "Extracting...", "Creating bundle...", "Adding logs..."
echo   - Time elapsed shown: (0s), (2s), (5s), etc.
echo   - Success notification: "Successfully imported N log files"
echo.
echo Testing Checklist:
echo   [ ] Import small-test.zip (should complete in ~5-8 seconds)
echo   [ ] Verify progress updates appear in tree
echo   [ ] Verify success notification appears
echo   [ ] Import 700440257_qcsone_download_selected.zip
echo   [ ] Verify case ID detected: "Case 700440257"
echo   [ ] Import medium-test.zip (test concurrent with small)
echo   [ ] Verify both show independent progress
echo   [ ] Import large-test.zip (stress test)
echo   [ ] Verify UI stays responsive during import
echo   [ ] Import invalid-archive.zip
echo   [ ] Verify error message appears
echo   [ ] Verify no partial bundle created
echo.
echo ============================================================================
echo.

pause
