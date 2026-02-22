#!/usr/bin/env node

/**
 * Clean Script
 * Removes build artifacts and temporary files
 */

const fs = require("fs");
const path = require("path");

console.log("\n🧹 Log Scout Analyzer - Cleanup Script\n");
console.log("=".repeat(70));

let cleanedCount = 0;
let errorCount = 0;

// Helper to remove file or directory
function remove(itemPath, description) {
  try {
    if (fs.existsSync(itemPath)) {
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`   ✅ Removed directory: ${description}`);
      } else {
        fs.unlinkSync(itemPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ✅ Removed file: ${description} (${sizeMB} MB)`);
      }
      cleanedCount++;
    } else {
      console.log(`   ℹ️  Not found: ${description}`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to remove ${description}: ${error.message}`);
    errorCount++;
  }
}

console.log("\n\n📂 CLEANING COMPILED OUTPUT");
console.log("-".repeat(70));
remove(path.join(__dirname, "out"), "out/ (compiled TypeScript)");

console.log("\n\n📦 CLEANING VSIX PACKAGES");
console.log("-".repeat(70));
remove(path.join(__dirname, "log-scout-analyzer.vsix"), "log-scout-analyzer.vsix");

// Clean numbered versions
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  if (file.match(/^log-scout-analyzer-\d+\.\d+\.\d+\.vsix$/)) {
    remove(path.join(__dirname, file), file);
  }
});

console.log("\n\n🏗️  CLEANING BUILD INFO");
console.log("-".repeat(70));
remove(path.join(__dirname, "src", "buildInfo.ts"), "src/buildInfo.ts");

console.log("\n\n🦀 CLEANING LSP BINARY");
console.log("-".repeat(70));
remove(
  path.join(__dirname, "bin", "log-scout-lsp-server-win.exe"),
  "bin/log-scout-lsp-server-win.exe"
);

// Check if bin directory is empty
const binDir = path.join(__dirname, "bin");
if (fs.existsSync(binDir)) {
  const binFiles = fs.readdirSync(binDir);
  if (binFiles.length === 0) {
    remove(binDir, "bin/ (empty directory)");
  }
}

console.log("\n\n📥 CLEANING DOWNLOADS COPY");
console.log("-".repeat(70));
const userProfile = process.env.USERPROFILE || process.env.HOME;
const downloadsDir = path.join(userProfile, "Downloads", "vscode-extensions");
const downloadsVsix = path.join(downloadsDir, "log-scout-analyzer.vsix");
remove(downloadsVsix, "Downloads/vscode-extensions/log-scout-analyzer.vsix");

console.log("\n\n🗂️  CLEANING NODE ARTIFACTS (optional)");
console.log("-".repeat(70));
console.log("   ℹ️  Skipping node_modules/ (run 'npm install' to reinstall)");
console.log("   ℹ️  Skipping package-lock.json");

console.log("\n\n" + "=".repeat(70));
console.log("\n📊 CLEANUP SUMMARY");
console.log("-".repeat(70));
console.log(`   Items cleaned: ${cleanedCount}`);
if (errorCount > 0) {
  console.log(`   Errors:        ${errorCount}`);
}

if (cleanedCount > 0) {
  console.log("\n✅ Cleanup complete!");
} else {
  console.log("\n✨ Nothing to clean - workspace is already clean!");
}

console.log("\n💡 NEXT STEPS");
console.log("-".repeat(70));
console.log("   To rebuild everything:");
console.log("   npm run deploy");
console.log("\n   Or step by step:");
console.log("   1. npm run build:lsp");
console.log("   2. npm run build");
console.log("   3. npm run package");

console.log("\n" + "=".repeat(70));
console.log("\n✨ Done!\n");

if (errorCount > 0) {
  process.exit(1);
}
