# Install Zed Extension
# This script copies the built Zed extension to the Zed extensions directory

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Installing Zed Extension" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$SourceDir = Join-Path $PSScriptRoot "zed-extension"
$ZedExtensionsDir = Join-Path $env:LOCALAPPDATA "Zed\extensions\installed"
$TargetDir = Join-Path $ZedExtensionsDir "log-scout-analyzer"

# Check if source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "ERROR: Source directory not found: $SourceDir" -ForegroundColor Red
    exit 1
}

Write-Host "Source: $SourceDir" -ForegroundColor Gray
Write-Host "Target: $TargetDir" -ForegroundColor Gray
Write-Host ""

# Create Zed extensions directory if it doesn't exist
if (-not (Test-Path $ZedExtensionsDir)) {
    Write-Host "Creating Zed extensions directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $ZedExtensionsDir -Force | Out-Null
}

# Remove existing installation
if (Test-Path $TargetDir) {
    Write-Host "Removing existing installation..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $TargetDir
}

# Copy extension files
Write-Host "Copying extension files..." -ForegroundColor Yellow
Copy-Item -Recurse -Force $SourceDir $TargetDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Zed Extension Installed Successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $TargetDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart Zed editor" -ForegroundColor White
Write-Host "  2. Press Ctrl+Shift+X to open Extensions" -ForegroundColor White
Write-Host "  3. Look for log-scout-analyzer with Dev badge" -ForegroundColor White
Write-Host "  4. Open a log file to test" -ForegroundColor White
Write-Host ""
