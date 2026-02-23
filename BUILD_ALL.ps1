# Comprehensive Windows Build Script for Log Scout Analyzer
# This script builds the Rust LSP server and packages the VS Code extension

Write-Host ""
Write-Host "========================================"
Write-Host "Log Scout Analyzer - Complete Build"
Write-Host "========================================"
Write-Host ""
Write-Host "Starting build process..."
Write-Host "Current directory: $(Get-Location)"
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "BUILD_WINDOWS_BINARY.bat")) {
    Write-Host "ERROR: This script must be run from the project root!" -ForegroundColor Red
    Write-Host "Expected location: c:\Users\mitchong\code\log_scout_analyzer"
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 1: Build Rust LSP Server
Write-Host "[STEP 1/4] Building Rust LSP Server..." -ForegroundColor Cyan
Write-Host ""

try {
    & cmd.exe /c BUILD_WINDOWS_BINARY.bat
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: Rust build failed!" -ForegroundColor Red
        Write-Host "Make sure Rust is installed: https://rustup.rs/"
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: Failed to run BUILD_WINDOWS_BINARY.bat" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Verify binary was copied
Write-Host ""
Write-Host "[STEP 2/4] Verifying LSP binary..." -ForegroundColor Cyan
if (-not (Test-Path "vscode-extension\bin\log-scout-lsp-server-win.exe")) {
    Write-Host "ERROR: LSP binary not found in vscode-extension\bin\" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "LSP binary verified: vscode-extension\bin\log-scout-lsp-server-win.exe" -ForegroundColor Green
Write-Host ""

# Step 3: Install npm dependencies
Write-Host "[STEP 3/4] Installing npm dependencies..." -ForegroundColor Cyan
Push-Location vscode-extension
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not navigate to vscode-extension!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: npm install failed!" -ForegroundColor Red
        Write-Host "Make sure Node.js is installed: https://nodejs.org/"
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "npm dependencies installed successfully." -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm install exception" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Step 4: Package the extension
Write-Host "[STEP 4/4] Packaging VS Code extension..." -ForegroundColor Cyan
try {
    # First run build:all (which includes version increment and builds everything)
    npm run build:all
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: npm build:all failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    # Then package the built artifacts (no version increment, just packaging)
    npm run package:only
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERROR: npm package:only failed!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "ERROR: npm build/package exception" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}

Pop-Location

# Success!
Write-Host ""
Write-Host "========================================"
Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "Output files created:" -ForegroundColor Green
Write-Host "  - LSP Server Binary:"
Write-Host "    vscode-extension\bin\log-scout-lsp-server-win.exe"
Write-Host "  - VS Code Extension Package:"
Write-Host "    vscode-extension\log-scout-analyzer.vsix"
Write-Host ""
Write-Host "You can now:" -ForegroundColor Cyan
Write-Host "  1. Install in VS Code: code --install-extension log-scout-analyzer.vsix"
Write-Host "  2. Share the .vsix file with others"
Write-Host "  3. Publish to VS Code Marketplace: npm run publish"
Write-Host ""
Read-Host "Press Enter to exit"
