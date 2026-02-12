#!/usr/bin/env node

/**
 * Copy to Windows Script
 * Automatically copies the built .vsix file to Windows Downloads folder
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// Get Windows username
function getWindowsUsername() {
  // On Windows native
  if (process.env.USERNAME) {
    return process.env.USERNAME;
  }
  // On WSL
  if (process.env.LOGNAME) {
    return process.env.LOGNAME;
  }
  if (process.env.USER) {
    return process.env.USER;
  }

  // Try USERPROFILE environment variable (Windows)
  if (process.env.USERPROFILE) {
    const username = process.env.USERPROFILE.split(path.sep).pop();
    if (username) return username;
  }

  return null;
}

// Check if running in WSL
function isWSL() {
  try {
    const procVersion = fs.readFileSync("/proc/version", "utf8").toLowerCase();
    return procVersion.includes("microsoft") || procVersion.includes("wsl");
  } catch (error) {
    return false;
  }
}

try {
  const inWSL = isWSL();

  const winUser = getWindowsUsername();
  if (!winUser) {
    console.error("❌ Could not detect Windows username - skipping copy");
    process.exit(0);
  }

  // Source file
  const vsixFile = path.join(__dirname, "log-scout-analyzer.vsix");

  // Check if source file exists
  if (!fs.existsSync(vsixFile)) {
    console.error("❌ VSIX file not found:", vsixFile);
    process.exit(1);
  }

  // Determine destination path based on environment
  let winDestDir, winDestFile, displayPath;

  if (inWSL) {
    // WSL environment
    winDestDir = `/mnt/c/Users/${winUser}/Downloads/vscode-extensions`;
    winDestFile = path.join(winDestDir, "log-scout-analyzer.vsix");
    displayPath = `C:\\Users\\${winUser}\\Downloads\\vscode-extensions\\`;
  } else {
    // Windows native environment (cmd, PowerShell, etc.)
    const userProfile = process.env.USERPROFILE;
    if (!userProfile) {
      console.error("❌ Could not determine user profile path");
      process.exit(0);
    }
    winDestDir = path.join(userProfile, "Downloads", "vscode-extensions");
    winDestFile = path.join(winDestDir, "log-scout-analyzer.vsix");
    displayPath = winDestDir;
  }

  // Create destination directory if it doesn't exist
  if (!fs.existsSync(winDestDir)) {
    fs.mkdirSync(winDestDir, { recursive: true });
    console.log("📁 Created directory:", displayPath);
  }

  // Copy file
  fs.copyFileSync(vsixFile, winDestFile);

  // Get file size for display
  const stats = fs.statSync(winDestFile);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log("");
  console.log("✅ Copied to Windows!");
  console.log(`   📦 File: log-scout-analyzer.vsix (${sizeKB} KB)`);
  console.log(`   📂 Path: ${displayPath}`);
  console.log("");
  console.log("Install with:");
  console.log(`   code --install-extension log-scout-analyzer.vsix`);
  console.log("");
} catch (error) {
  console.error("❌ Error copying to Windows:", error.message);
  // Don't fail the build if copy fails
  process.exit(0);
}
