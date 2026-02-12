# Run the complete Windows build process
Write-Host ""
Write-Host "========================================"
Write-Host "Log Scout Analyzer - Windows Build"
Write-Host "========================================"
Write-Host ""

# Get to the vscode-extension directory
$projectRoot = "c:\Users\mitchong\code\log_scout_analyzer"
$vscodePath = Join-Path $projectRoot "vscode-extension"

Write-Host "Project root: $projectRoot"
Write-Host "VSCode extension path: $vscodePath"
Write-Host ""

# Change to vscode-extension directory
Set-Location $vscodePath

# Step 1: Install npm dependencies
Write-Host "[STEP 1/2] Installing npm dependencies..."
Write-Host ""
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Package the extension
Write-Host "[STEP 2/2] Packaging and copying VSIX..."
Write-Host ""
npm run package

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ npm run package failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================"
Write-Host "✅ BUILD COMPLETE!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "The VSIX file has been created and copied to:"
Write-Host "   C:\Users\mitchong\Downloads\vscode-extensions\log-scout-analyzer.vsix"
Write-Host ""
Write-Host "Install with:"
Write-Host '   code --install-extension "C:\Users\mitchong\Downloads\vscode-extensions\log-scout-analyzer.vsix"'
Write-Host ""
Read-Host "Press Enter to exit"
