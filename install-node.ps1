# Install Node.js via winget
Write-Host "Installing Node.js via winget..."
Write-Host ""

# Install Node.js (this includes npm)
winget install -e --id OpenJS.NodeJS

# Verify installation
Write-Host ""
Write-Host "Verifying installation..."
node --version
npm --version

Write-Host ""
Write-Host "Installation complete! Node.js and npm are ready to use."
