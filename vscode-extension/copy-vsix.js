#!/usr/bin/env node

/**
 * Direct Copy to Windows Downloads
 * Copies the built .vsix file to the Windows Downloads vscode-extensions folder
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

try {
  // Get the USERPROFILE environment variable (standard on Windows)
  const userProfile = process.env.USERPROFILE;

  if (!userProfile) {
    console.error("❌ Could not determine USERPROFILE environment variable");
    process.exit(1);
  }

  // Build destination path
  const sourceFile = path.join(__dirname, "log-scout-analyzer.vsix");
  const destDir = path.join(userProfile, "Downloads", "vscode-extensions");
  const destFile = path.join(destDir, "log-scout-analyzer.vsix");

  // Verify source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error("❌ VSIX file not found:", sourceFile);
    process.exit(1);
  }

  // Create destination directory if needed
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log("📁 Created directory:", destDir);
  }

  // Copy file
  fs.copyFileSync(sourceFile, destFile);

  // Get file info
  const stats = fs.statSync(destFile);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log("");
  console.log("✅ VSIX package copied successfully!");
  console.log(`   📦 File: log-scout-analyzer.vsix (${sizeKB} KB)`);
  console.log(`   📂 Location: ${destDir}`);
  console.log("");
  console.log("To install in VS Code, run:");
  console.log(`   code --install-extension "${destFile}"`);
  console.log("");

} catch (error) {
  console.error("❌ Error copying VSIX file:", error.message);
  process.exit(1);
}
