#!/usr/bin/env node

/**
 * Copy to Windows Script
 * Automatically copies the built .vsix file to Windows Downloads folder (WSL only)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if running in WSL
function isWSL() {
    try {
        const procVersion = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
        return procVersion.includes('microsoft') || procVersion.includes('wsl');
    } catch (error) {
        return false;
    }
}

// Get Windows username
function getWindowsUsername() {
    try {
        // Try environment variables first
        if (process.env.LOGNAME) return process.env.LOGNAME;
        if (process.env.USER) return process.env.USER;

        // Fallback: detect from /mnt/c/Users
        const usersDir = '/mnt/c/Users';
        if (fs.existsSync(usersDir)) {
            const users = fs.readdirSync(usersDir).filter(
                user => !['Public', 'Default', 'All Users', 'Default User'].includes(user)
            );
            if (users.length > 0) {
                return users[0];
            }
        }
    } catch (error) {
        console.error('⚠️  Could not detect Windows username:', error.message);
    }
    return null;
}

try {
    // Only run in WSL
    if (!isWSL()) {
        console.log('ℹ️  Not running in WSL - skipping Windows copy');
        process.exit(0);
    }

    const winUser = getWindowsUsername();
    if (!winUser) {
        console.error('❌ Could not detect Windows username - skipping copy');
        process.exit(0);
    }

    // Source and destination paths
    const vsixFile = path.join(__dirname, 'log-scout-analyzer.vsix');
    const winDestDir = `/mnt/c/Users/${winUser}/Downloads/vscode-extensions`;
    const winDestFile = path.join(winDestDir, 'log-scout-analyzer.vsix');

    // Check if source file exists
    if (!fs.existsSync(vsixFile)) {
        console.error('❌ VSIX file not found:', vsixFile);
        process.exit(1);
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(winDestDir)) {
        fs.mkdirSync(winDestDir, { recursive: true });
        console.log('📁 Created directory:', winDestDir);
    }

    // Copy file
    fs.copyFileSync(vsixFile, winDestFile);

    // Get file size for display
    const stats = fs.statSync(winDestFile);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log('');
    console.log('✅ Copied to Windows!');
    console.log(`   📦 File: log-scout-analyzer.vsix (${sizeKB} KB)`);
    console.log(`   📂 Path: C:\\Users\\${winUser}\\Downloads\\vscode-extensions\\`);
    console.log('');
    console.log('Install with:');
    console.log(`   cd C:\\Users\\${winUser}\\Downloads\\vscode-extensions`);
    console.log('   code --install-extension log-scout-analyzer.vsix --force');
    console.log('');

} catch (error) {
    console.error('❌ Error copying to Windows:', error.message);
    // Don't fail the build if copy fails
    process.exit(0);
}
