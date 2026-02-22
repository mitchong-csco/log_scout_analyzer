@echo off
REM ============================================================================
REM Monitor LSP Logs During Import Testing
REM ============================================================================
REM This script monitors the LSP server logs in real-time and highlights
REM important events during async import testing.
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo   LSP Server Log Monitor - Async Import Testing
echo ============================================================================
echo.

REM Get the log file path
set LOG_DIR=%USERPROFILE%\.log-scout-analyzer
if not exist "%LOG_DIR%" (
    echo ERROR: Log directory not found: %LOG_DIR%
    echo.
    echo Make sure Log Scout Analyzer extension is running.
    pause
    exit /b 1
)

REM Find the latest log file
for /f "delims=" %%i in ('dir /b /o-d "%LOG_DIR%\lsp-server-*.log" 2^>nul') do (
    set LOG_FILE=%LOG_DIR%\%%i
    goto :found_log
)

echo ERROR: No LSP server log files found in: %LOG_DIR%
echo.
echo Make sure Log Scout Analyzer extension has been activated at least once.
pause
exit /b 1

:found_log
echo Monitoring log file:
echo   %LOG_FILE%
echo.
echo ============================================================================
echo   Watching for Import Events...
echo ============================================================================
echo.
echo Legend:
echo   [START]   - Import operation started
echo   [PROG]    - Progress update
echo   [SUCCESS] - Import completed successfully
echo   [ERROR]   - Error occurred
echo   [TOKEN]   - Progress token detected
echo.
echo Press Ctrl+C to stop monitoring
echo ============================================================================
echo.

REM Get current line count to start from end
set /a LINE_COUNT=0
for /f %%a in ('type "%LOG_FILE%" ^| find /c /v ""') do set /a LINE_COUNT=%%a

REM Monitor the log file for new lines
:monitor_loop

REM Get new line count
set /a NEW_LINE_COUNT=0
for /f %%a in ('type "%LOG_FILE%" ^| find /c /v ""') do set /a NEW_LINE_COUNT=%%a

REM If new lines added, display them
if !NEW_LINE_COUNT! gtr !LINE_COUNT! (
    set /a LINES_TO_SKIP=!LINE_COUNT!
    set /a LINES_TO_READ=!NEW_LINE_COUNT! - !LINE_COUNT!

    REM Read new lines
    for /f "skip=!LINES_TO_SKIP! delims=" %%a in ('type "%LOG_FILE%"') do (
        set "LINE=%%a"

        REM Highlight important events
        echo !LINE! | findstr /i "Importing package with progress" >nul
        if !errorlevel! equ 0 (
            echo [START] !LINE!
        ) else (
            echo !LINE! | findstr /i "import_" >nul
            if !errorlevel! equ 0 (
                echo [TOKEN] !LINE!
            ) else (
                echo !LINE! | findstr /i "Extracting" >nul
                if !errorlevel! equ 0 (
                    echo [PROG]  !LINE!
                ) else (
                    echo !LINE! | findstr /i "Creating bundle" >nul
                    if !errorlevel! equ 0 (
                        echo [PROG]  !LINE!
                    ) else (
                        echo !LINE! | findstr /i "Adding log" >nul
                        if !errorlevel! equ 0 (
                            echo [PROG]  !LINE!
                        ) else (
                            echo !LINE! | findstr /i "Import complete" >nul
                            if !errorlevel! equ 0 (
                                echo [SUCCESS] !LINE!
                                echo.
                            ) else (
                                echo !LINE! | findstr /i "Import failed" >nul
                                if !errorlevel! equ 0 (
                                    echo [ERROR] !LINE!
                                    echo.
                                ) else (
                                    echo !LINE! | findstr /i "ERROR Failed" >nul
                                    if !errorlevel! equ 0 (
                                        echo [ERROR] !LINE!
                                    ) else (
                                        REM Show all other relevant lines
                                        echo !LINE! | findstr /i "bundle progress percent" >nul
                                        if !errorlevel! equ 0 (
                                            echo         !LINE!
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )

    set /a LINE_COUNT=!NEW_LINE_COUNT!
)

REM Wait a bit before checking again
timeout /t 2 /nobreak >nul

goto :monitor_loop

REM This will never be reached due to the loop, but here for completeness
:end
echo.
echo Monitoring stopped.
pause
