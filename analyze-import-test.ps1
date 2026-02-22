# ============================================================================
# Analyze Import Test Results
# ============================================================================
# This script analyzes LSP server logs to generate a test report for the
# async import feature with progress tracking.
# ============================================================================

param(
    [string]$LogFile = "",
    [switch]$Watch = $false,
    [switch]$Detailed = $false
)

# Colors for output
$ErrorColor = "Red"
$WarningColor = "Yellow"
$SuccessColor = "Green"
$InfoColor = "Cyan"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor $InfoColor
    Write-Host "  $Text" -ForegroundColor $InfoColor
    Write-Host "============================================================================" -ForegroundColor $InfoColor
    Write-Host ""
}

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "----------------------------------------------------------------------------" -ForegroundColor Gray
    Write-Host "  $Text" -ForegroundColor White
    Write-Host "----------------------------------------------------------------------------" -ForegroundColor Gray
}

function Parse-ImportSession {
    param([string[]]$LogLines)

    $sessions = @()
    $currentSession = $null

    foreach ($line in $LogLines) {
        # Detect start of import
        if ($line -match "Importing package with progress: (.+?)(?:\s+token:\s+(\S+))?") {
            if ($currentSession) {
                $sessions += $currentSession
            }

            $currentSession = @{
                FilePath = $matches[1]
                Token = if ($matches[2]) { $matches[2] } else { "unknown" }
                StartTime = $null
                EndTime = $null
                ProgressUpdates = @()
                Errors = @()
                Success = $false
                ExtractedFiles = 0
                LogFiles = 0
                ImportedFiles = 0
                BundleId = ""
            }

            # Try to extract timestamp
            if ($line -match "(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})") {
                $currentSession.StartTime = [DateTime]::Parse($matches[1])
            }
        }

        # Detect progress updates
        if ($currentSession -and $line -match "Extracted (\d+) files") {
            $currentSession.ExtractedFiles = [int]$matches[1]
            $currentSession.ProgressUpdates += "Extracted $($matches[1]) files"
        }

        if ($currentSession -and $line -match "Found (\d+) log files") {
            $currentSession.LogFiles = [int]$matches[1]
            $currentSession.ProgressUpdates += "Found $($matches[1]) log files"
        }

        if ($currentSession -and $line -match "Created bundle (.+?) for import") {
            $currentSession.BundleId = $matches[1]
            $currentSession.ProgressUpdates += "Bundle created: $($matches[1])"
        }

        # Detect completion
        if ($currentSession -and $line -match "Import complete: (\d+) of (\d+) log files") {
            $currentSession.ImportedFiles = [int]$matches[1]
            $currentSession.Success = $true

            if ($line -match "(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})") {
                $currentSession.EndTime = [DateTime]::Parse($matches[1])
            }
        }

        # Detect errors
        if ($currentSession -and $line -match "ERROR|Failed|failed") {
            $currentSession.Errors += $line
        }
    }

    # Add last session
    if ($currentSession) {
        $sessions += $currentSession
    }

    return $sessions
}

function Format-Duration {
    param([TimeSpan]$Duration)

    if ($Duration.TotalSeconds -lt 60) {
        return "{0:F1}s" -f $Duration.TotalSeconds
    } elseif ($Duration.TotalMinutes -lt 60) {
        return "{0:F1}m" -f $Duration.TotalMinutes
    } else {
        return "{0:F1}h" -f $Duration.TotalHours
    }
}

function Format-FileSize {
    param([long]$Bytes)

    if ($Bytes -lt 1KB) {
        return "{0} B" -f $Bytes
    } elseif ($Bytes -lt 1MB) {
        return "{0:F1} KB" -f ($Bytes / 1KB)
    } elseif ($Bytes -lt 1GB) {
        return "{0:F1} MB" -f ($Bytes / 1MB)
    } else {
        return "{0:F1} GB" -f ($Bytes / 1GB)
    }
}

# ============================================================================
# Main Script
# ============================================================================

Write-Header "Async Import Test Analysis"

# Find log file if not specified
if (-not $LogFile) {
    $logDir = Join-Path $env:USERPROFILE ".log-scout-analyzer"

    if (-not (Test-Path $logDir)) {
        Write-Host "ERROR: Log directory not found: $logDir" -ForegroundColor $ErrorColor
        Write-Host ""
        Write-Host "Make sure Log Scout Analyzer extension has been run at least once." -ForegroundColor $WarningColor
        exit 1
    }

    $logFiles = Get-ChildItem -Path $logDir -Filter "lsp-server-*.log" | Sort-Object LastWriteTime -Descending

    if ($logFiles.Count -eq 0) {
        Write-Host "ERROR: No LSP server log files found in: $logDir" -ForegroundColor $ErrorColor
        exit 1
    }

    $LogFile = $logFiles[0].FullName
}

if (-not (Test-Path $LogFile)) {
    Write-Host "ERROR: Log file not found: $LogFile" -ForegroundColor $ErrorColor
    exit 1
}

Write-Host "Analyzing log file:" -ForegroundColor $InfoColor
Write-Host "  $LogFile" -ForegroundColor White
Write-Host ""
Write-Host "Log file size: $(Format-FileSize (Get-Item $LogFile).Length)" -ForegroundColor Gray
Write-Host "Last modified: $((Get-Item $LogFile).LastWriteTime)" -ForegroundColor Gray

# Read log file
Write-Host ""
Write-Host "Reading log file..." -ForegroundColor Gray
$logContent = Get-Content -Path $LogFile

# Parse import sessions
Write-Host "Parsing import sessions..." -ForegroundColor Gray
$sessions = Parse-ImportSession -LogLines $logContent

# ============================================================================
# Display Results
# ============================================================================

Write-Section "Import Sessions Summary"

if ($sessions.Count -eq 0) {
    Write-Host "No import sessions found in log file." -ForegroundColor $WarningColor
    Write-Host ""
    Write-Host "This could mean:" -ForegroundColor Gray
    Write-Host "  - No imports have been performed yet" -ForegroundColor Gray
    Write-Host "  - The log file is from before the async import feature" -ForegroundColor Gray
    Write-Host "  - The wrong log file was analyzed" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To test the async import feature:" -ForegroundColor $InfoColor
    Write-Host "  1. Run: .\generate-test-archives.bat" -ForegroundColor White
    Write-Host "  2. In VS Code: Ctrl+Shift+P -> 'Scout: Import Log Archive'" -ForegroundColor White
    Write-Host "  3. Select: test-data\small-test.zip" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    exit 0
}

Write-Host "Total import sessions: $($sessions.Count)" -ForegroundColor $SuccessColor
Write-Host ""

# Display each session
for ($i = 0; $i -lt $sessions.Count; $i++) {
    $session = $sessions[$i]
    $sessionNum = $i + 1

    Write-Host "Session $sessionNum" -ForegroundColor $InfoColor
    Write-Host "  File:            $($session.FilePath)" -ForegroundColor White
    Write-Host "  Token:           $($session.Token)" -ForegroundColor Gray

    if ($session.StartTime) {
        Write-Host "  Start Time:      $($session.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    }

    if ($session.EndTime) {
        Write-Host "  End Time:        $($session.EndTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
        $duration = $session.EndTime - $session.StartTime
        Write-Host "  Duration:        $(Format-Duration $duration)" -ForegroundColor Cyan
    }

    Write-Host "  Extracted Files: $($session.ExtractedFiles)" -ForegroundColor White
    Write-Host "  Log Files:       $($session.LogFiles)" -ForegroundColor White
    Write-Host "  Imported:        $($session.ImportedFiles)" -ForegroundColor White

    if ($session.BundleId) {
        Write-Host "  Bundle ID:       $($session.BundleId)" -ForegroundColor Green
    }

    if ($session.Success) {
        Write-Host "  Status:          SUCCESS" -ForegroundColor $SuccessColor
    } else {
        Write-Host "  Status:          INCOMPLETE/FAILED" -ForegroundColor $ErrorColor
    }

    if ($session.Errors.Count -gt 0) {
        Write-Host "  Errors:          $($session.Errors.Count)" -ForegroundColor $ErrorColor
        if ($Detailed) {
            foreach ($error in $session.Errors) {
                Write-Host "    - $error" -ForegroundColor $ErrorColor
            }
        }
    }

    if ($Detailed -and $session.ProgressUpdates.Count -gt 0) {
        Write-Host "  Progress Updates:" -ForegroundColor Gray
        foreach ($update in $session.ProgressUpdates) {
            Write-Host "    - $update" -ForegroundColor Gray
        }
    }

    Write-Host ""
}

# ============================================================================
# Statistics
# ============================================================================

Write-Section "Statistics"

$successfulSessions = $sessions | Where-Object { $_.Success }
$failedSessions = $sessions | Where-Object { -not $_.Success }

Write-Host "Success Rate:        $($successfulSessions.Count) / $($sessions.Count) ($([math]::Round(($successfulSessions.Count / $sessions.Count) * 100, 1))%)" -ForegroundColor $(if ($successfulSessions.Count -eq $sessions.Count) { $SuccessColor } else { $WarningColor })

if ($successfulSessions.Count -gt 0) {
    $avgFiles = ($successfulSessions | Measure-Object -Property ImportedFiles -Average).Average
    Write-Host "Avg Files Imported:  $([math]::Round($avgFiles, 1)) files/session" -ForegroundColor White

    $sessionsWithDuration = $successfulSessions | Where-Object { $_.StartTime -and $_.EndTime }
    if ($sessionsWithDuration.Count -gt 0) {
        $durations = $sessionsWithDuration | ForEach-Object { ($_.EndTime - $_.StartTime).TotalSeconds }
        $avgDuration = ($durations | Measure-Object -Average).Average
        $minDuration = ($durations | Measure-Object -Minimum).Minimum
        $maxDuration = ($durations | Measure-Object -Maximum).Maximum

        Write-Host "Avg Duration:        $([math]::Round($avgDuration, 1))s" -ForegroundColor Cyan
        Write-Host "Min Duration:        $([math]::Round($minDuration, 1))s" -ForegroundColor Gray
        Write-Host "Max Duration:        $([math]::Round($maxDuration, 1))s" -ForegroundColor Gray
    }
}

if ($failedSessions.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed Sessions:     $($failedSessions.Count)" -ForegroundColor $ErrorColor
    foreach ($failed in $failedSessions) {
        Write-Host "  - $($failed.FilePath)" -ForegroundColor $ErrorColor
    }
}

# ============================================================================
# Progress Notifications Analysis
# ============================================================================

Write-Section "Progress Notifications"

$progressNotifications = $logContent | Select-String -Pattern '\$/progress|progress.*percent|ProgressParams'

if ($progressNotifications.Count -eq 0) {
    Write-Host "No progress notifications found in log." -ForegroundColor $WarningColor
    Write-Host ""
    Write-Host "This could mean:" -ForegroundColor Gray
    Write-Host "  - Progress notifications are not being sent" -ForegroundColor Gray
    Write-Host "  - Log level is too high (try 'info' or 'debug')" -ForegroundColor Gray
    Write-Host "  - Feature not working correctly" -ForegroundColor Gray
} else {
    Write-Host "Total progress notifications: $($progressNotifications.Count)" -ForegroundColor $SuccessColor

    if ($Detailed) {
        Write-Host ""
        Write-Host "Recent progress notifications:" -ForegroundColor Gray
        $progressNotifications | Select-Object -Last 10 | ForEach-Object {
            Write-Host "  $($_.Line)" -ForegroundColor DarkGray
        }
    }
}

# ============================================================================
# Test Report
# ============================================================================

Write-Section "Test Report"

$allTestsPassed = $true

# Test 1: Sessions found
Write-Host "Test 1: Import sessions detected" -NoNewline
if ($sessions.Count -gt 0) {
    Write-Host " [PASS]" -ForegroundColor $SuccessColor
} else {
    Write-Host " [FAIL]" -ForegroundColor $ErrorColor
    $allTestsPassed = $false
}

# Test 2: Success rate
Write-Host "Test 2: All imports successful" -NoNewline
if ($failedSessions.Count -eq 0 -and $sessions.Count -gt 0) {
    Write-Host " [PASS]" -ForegroundColor $SuccessColor
} else {
    Write-Host " [FAIL]" -ForegroundColor $ErrorColor
    $allTestsPassed = $false
}

# Test 3: Progress notifications
Write-Host "Test 3: Progress notifications sent" -NoNewline
if ($progressNotifications.Count -gt 0) {
    Write-Host " [PASS]" -ForegroundColor $SuccessColor
} else {
    Write-Host " [FAIL]" -ForegroundColor $ErrorColor
    $allTestsPassed = $false
}

# Test 4: Files imported
Write-Host "Test 4: Files imported successfully" -NoNewline
$totalImported = ($successfulSessions | Measure-Object -Property ImportedFiles -Sum).Sum
if ($totalImported -gt 0) {
    Write-Host " [PASS] ($totalImported files)" -ForegroundColor $SuccessColor
} else {
    Write-Host " [FAIL]" -ForegroundColor $ErrorColor
    $allTestsPassed = $false
}

# Test 5: Performance
Write-Host "Test 5: Import performance acceptable" -NoNewline
$sessionsWithDuration = $successfulSessions | Where-Object { $_.StartTime -and $_.EndTime }
if ($sessionsWithDuration.Count -gt 0) {
    $avgDuration = ($sessionsWithDuration | ForEach-Object { ($_.EndTime - $_.StartTime).TotalSeconds } | Measure-Object -Average).Average
    if ($avgDuration -lt 300) {  # Less than 5 minutes
        Write-Host " [PASS] (avg: $([math]::Round($avgDuration, 1))s)" -ForegroundColor $SuccessColor
    } else {
        Write-Host " [WARN] (avg: $([math]::Round($avgDuration, 1))s - slow)" -ForegroundColor $WarningColor
    }
} else {
    Write-Host " [SKIP] (no timing data)" -ForegroundColor Gray
}

Write-Host ""

if ($allTestsPassed) {
    Write-Host "Overall Result: ALL TESTS PASSED" -ForegroundColor $SuccessColor
    Write-Host ""
    Write-Host "The async import feature is working correctly!" -ForegroundColor $SuccessColor
} else {
    Write-Host "Overall Result: SOME TESTS FAILED" -ForegroundColor $ErrorColor
    Write-Host ""
    Write-Host "Please review the failures above and check:" -ForegroundColor $WarningColor
    Write-Host "  - LSP server is running" -ForegroundColor Gray
    Write-Host "  - Extension is loaded correctly" -ForegroundColor Gray
    Write-Host "  - Test archives are valid" -ForegroundColor Gray
}

# ============================================================================
# Recommendations
# ============================================================================

Write-Section "Recommendations"

if ($sessions.Count -eq 0) {
    Write-Host "Run some import tests to generate data for analysis." -ForegroundColor $InfoColor
    Write-Host "  1. Generate test archives: .\generate-test-archives.bat" -ForegroundColor White
    Write-Host "  2. Import in VS Code: Ctrl+Shift+P -> 'Scout: Import Log Archive'" -ForegroundColor White
    Write-Host "  3. Run this analysis again" -ForegroundColor White
}

if ($progressNotifications.Count -eq 0) {
    Write-Host "Progress notifications not found. Check LSP server configuration." -ForegroundColor $WarningColor
    Write-Host "  - Verify LSP server version includes progress support" -ForegroundColor Gray
    Write-Host "  - Check log level is set to 'info' or lower" -ForegroundColor Gray
}

if ($failedSessions.Count -gt 0) {
    Write-Host "Some imports failed. Review error logs for details." -ForegroundColor $WarningColor
    Write-Host "  - Check archive files are valid" -ForegroundColor Gray
    Write-Host "  - Verify disk space available" -ForegroundColor Gray
    Write-Host "  - Check file permissions" -ForegroundColor Gray
}

if ($sessions.Count -gt 0 -and $failedSessions.Count -eq 0 -and $progressNotifications.Count -gt 0) {
    Write-Host "Everything looks good! The async import feature is working well." -ForegroundColor $SuccessColor
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor $InfoColor
    Write-Host "  - Test with larger archives (medium-test.zip, large-test.zip)" -ForegroundColor White
    Write-Host "  - Test concurrent imports (import 2+ archives simultaneously)" -ForegroundColor White
    Write-Host "  - Verify UI responsiveness during imports" -ForegroundColor White
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor $InfoColor
Write-Host ""
