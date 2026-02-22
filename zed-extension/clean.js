#!/usr/bin/env node

/**
 * Clean Script for Zed Extension
 * Removes build artifacts and temporary files
 */

const fs = require("fs");
const path = require("path");

console.log("\n🧹 Log Scout Analyzer (Zed) - Cleanup Script\n");
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
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        fs.unlinkSync(itemPath);
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

console.log("\n\n🦀 CLEANING RUST BUILD ARTIFACTS");
console.log("-".repeat(70));
remove(path.join(__dirname, "target"), "target/ (Rust build output)");

console.log("\n\n📦 CLEANING DISTRIBUTION PACKAGES");
console.log("-".repeat(70));
remove(path.join(__dirname, "dist"), "dist/ (package archives)");

console.log("\n\n🏗️  CLEANING BUILD INFO");
console.log("-".repeat(70));
remove(path.join(__dirname, "src", "build_info.rs"), "src/build_info.rs");

console.log("\n\n📥 CLEANING DOWNLOADS COPY");
console.log("-".repeat(70));
const userProfile = process.env.USERPROFILE || process.env.HOME;
const downloadsDir = path.join(userProfile, "Downloads", "zed-extensions");

if (fs.existsSync(downloadsDir)) {
  const files = fs.readdirSync(downloadsDir);
  const logScoutFiles = files.filter(f => f.includes('log-scout-analyzer'));

  if (logScoutFiles.length > 0) {
    logScoutFiles.forEach(file => {
      remove(path.join(downloadsDir, file), `Downloads/${file}`);
    });
  } else {
    console.log(`   ℹ️  No Log Scout files found in Downloads`);
  }
} else {
  console.log(`   ℹ️  Downloads directory not found: ${downloadsDir}`);
}

console.log("\n\n🗂️  CLEANING NODE ARTIFACTS (optional)");
console.log("-".repeat(70));
console.log("   ℹ️  Skipping node_modules/ (run 'npm install' to reinstall if removed)");
console.log("   ℹ️  Skipping package-lock.json");

console.log("\n\n🎯 CLEANING ZED INSTALLATION (optional - keeping installed)");
console.log("-".repeat(70));
let zedExtDir;

// Determine Zed extensions directory based on OS
if (process.platform === 'win32') {
  zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
} else if (process.platform === 'darwin') {
  zedExtDir = path.join(userProfile, 'Library', 'Application Support', 'Zed', 'extensions', 'log-scout-analyzer');
} else {
  zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
}

if (fs.existsSync(zedExtDir)) {
  console.log(`   ℹ️  Extension is installed at: ${zedExtDir}`);
  console.log(`   ℹ️  Not removing (run 'npm run uninstall' to remove)`);
} else {
  console.log(`   ℹ️  Extension not installed in Zed`);
}

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
console.log("   1. npm run build        (build WASM extension)");
console.log("   2. npm run build:lsp    (build LSP server)");
console.log("   3. npm run package      (create distribution)");
console.log("   4. npm run install:zed  (install to Zed)");

console.log("\n" + "=".repeat(70));
console.log("\n✨ Done!\n");

if (errorCount > 0) {
  process.exit(1);
}
