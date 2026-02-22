#!/usr/bin/env node

/**
 * Copy Package Script for Zed Extension
 * Copies distribution packages to Downloads folder for easy sharing
 */

const fs = require("fs");
const path = require("path");

console.log("\n📥 Copying packages to Downloads...\n");
console.log("=".repeat(70));

try {
  // Get version from Cargo.toml
  const cargoPath = path.join(__dirname, "Cargo.toml");
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!versionMatch) {
    throw new Error("Could not parse version from Cargo.toml");
  }

  const version = versionMatch[1];
  const packageName = `log-scout-analyzer-zed-${version}`;

  // Get user's Downloads directory
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  const destDir = path.join(userProfile, "Downloads", "zed-extensions");

  // Source directory
  const distDir = path.join(__dirname, "dist");

  // Verify dist directory exists
  if (!fs.existsSync(distDir)) {
    console.error("❌ dist/ directory not found!");
    console.error("   Run 'npm run package' first to create packages.");
    process.exit(1);
  }

  // Create destination directory if needed
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`📁 Created directory: ${destDir}\n`);
  }

  // Copy archives
  let copiedCount = 0;
  let totalSize = 0;

  console.log("📦 Copying packages...\n");

  // Copy .tar.gz
  const tarFile = `${packageName}.tar.gz`;
  const tarSource = path.join(distDir, tarFile);
  const tarDest = path.join(destDir, tarFile);

  if (fs.existsSync(tarSource)) {
    fs.copyFileSync(tarSource, tarDest);
    const stats = fs.statSync(tarDest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalSize += stats.size;
    console.log(`   ✅ ${tarFile} (${sizeMB} MB)`);
    copiedCount++;
  } else {
    console.log(`   ⚠️  ${tarFile} not found`);
  }

  // Copy .zip
  const zipFile = `${packageName}.zip`;
  const zipSource = path.join(distDir, zipFile);
  const zipDest = path.join(destDir, zipFile);

  if (fs.existsSync(zipSource)) {
    fs.copyFileSync(zipSource, zipDest);
    const stats = fs.statSync(zipDest);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    totalSize += stats.size;
    console.log(`   ✅ ${zipFile} (${sizeMB} MB)`);
    copiedCount++;
  } else {
    console.log(`   ⚠️  ${zipFile} not found`);
  }

  // Copy INSTALLATION.txt
  const installFile = "INSTALLATION.txt";
  const installSource = path.join(distDir, installFile);
  const installDest = path.join(destDir, installFile);

  if (fs.existsSync(installSource)) {
    fs.copyFileSync(installSource, installDest);
    console.log(`   ✅ ${installFile}`);
    copiedCount++;
  }

  console.log("");
  console.log("=".repeat(70));
  console.log("\n📊 Copy Summary");
  console.log("-".repeat(70));
  console.log(`   Files copied: ${copiedCount}`);
  console.log(`   Total size:   ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Destination:  ${destDir}`);

  if (copiedCount > 0) {
    console.log("\n✅ Packages copied successfully!");
    console.log("\n📂 Location:");
    console.log(`   ${destDir}`);

    // On Windows, also show the Windows path format
    if (process.platform === 'win32') {
      console.log(`\n💻 Windows Explorer:");
      console.log(`   ${destDir.replace(/\\/g, '\\\\')}`);
    }

    console.log("\n📤 Ready to share:");
    console.log(`   • ${tarFile}`);
    console.log(`   • ${zipFile}`);
    console.log(`   • ${installFile}`);
  } else {
    console.log("\n⚠️  No packages were copied.");
    console.log("   Run 'npm run package' to create packages first.");
  }

  console.log("");

} catch (error) {
  console.error("\n❌ Error copying packages:", error.message);
  process.exit(1);
}
