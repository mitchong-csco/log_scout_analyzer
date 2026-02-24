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

  // Find the VSIX file (may have version number)
  const files = fs.readdirSync(__dirname);
  const vsixFiles = files.filter(f => f.startsWith("log-scout-analyzer") && f.endsWith(".vsix"));

  if (vsixFiles.length === 0) {
    console.error("❌ No VSIX file found in:", __dirname);
    process.exit(1);
  }

  // Use the most recently created VSIX file
  const sourceFile = path.join(__dirname, vsixFiles.sort().pop());
  const destDir = path.join(userProfile, "Downloads", "vscode-extensions");
  const destFile = path.join(destDir, path.basename(sourceFile));

  console.log("📦 Found VSIX file:", path.basename(sourceFile));

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
  console.log(`   📦 File: ${path.basename(destFile)} (${sizeKB} KB)`);
  console.log(`   📂 Location: ${destDir}`);
  console.log("");
  console.log("To install in VS Code, run:");
  console.log(`   code --install-extension "${destFile}"`);
  console.log("");

} catch (error) {
  console.error("❌ Error copying VSIX file:", error.message);
  process.exit(1);
}
