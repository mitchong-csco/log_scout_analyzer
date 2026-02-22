#!/usr/bin/env node

/**
 * Increment Version Script
 * Automatically increments the patch version (third octet) in both:
 * - package.json (extension version)
 * - lsp-server/Cargo.toml (LSP server version)
 */

const fs = require("fs");
const path = require("path");

const packagePath = path.join(__dirname, "package.json");
const cargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

try {
  console.log("🔄 Incrementing versions...\n");

  // ===== INCREMENT EXTENSION VERSION (package.json) =====
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  // Parse current extension version
  const extVersionParts = packageJson.version.split(".");
  if (extVersionParts.length !== 3) {
    console.error("❌ Invalid extension version format. Expected x.y.z");
    process.exit(1);
  }

  const extMajor = parseInt(extVersionParts[0]);
  const extMinor = parseInt(extVersionParts[1]);
  const extPatch = parseInt(extVersionParts[2]);

  // Increment patch version
  const newExtPatch = extPatch + 1;
  const newExtVersion = `${extMajor}.${extMinor}.${newExtPatch}`;

  // Update version in package.json
  packageJson.version = newExtVersion;

  // Write back to package.json with proper formatting
  fs.writeFileSync(
    packagePath,
    JSON.stringify(packageJson, null, 4) + "\n",
    "utf8",
  );

  console.log("📦 Extension Version:");
  console.log(`   Old: ${extMajor}.${extMinor}.${extPatch}`);
  console.log(`   New: ${newExtVersion}`);
  console.log("");

  // ===== INCREMENT LSP SERVER VERSION (Cargo.toml) =====
  if (!fs.existsSync(cargoPath)) {
    console.warn(
      "⚠️  Cargo.toml not found, skipping LSP server version increment",
    );
    console.warn(`   Expected at: ${cargoPath}`);
  } else {
    let cargoToml = fs.readFileSync(cargoPath, "utf8");

    // Find the version line
    const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);

    if (!versionMatch) {
      console.error("❌ Could not parse version from Cargo.toml");
      process.exit(1);
    }

    const lspVersion = versionMatch[1];
    const lspVersionParts = lspVersion.split(".");

    if (lspVersionParts.length !== 3) {
      console.error("❌ Invalid LSP server version format. Expected x.y.z");
      process.exit(1);
    }

    const lspMajor = parseInt(lspVersionParts[0]);
    const lspMinor = parseInt(lspVersionParts[1]);
    const lspPatch = parseInt(lspVersionParts[2]);

    // Increment patch version
    const newLspPatch = lspPatch + 1;
    const newLspVersion = `${lspMajor}.${lspMinor}.${newLspPatch}`;

    // Replace the version in Cargo.toml
    cargoToml = cargoToml.replace(
      /version\s*=\s*"[^"]+"/,
      `version = "${newLspVersion}"`,
    );

    // Write back to Cargo.toml
    fs.writeFileSync(cargoPath, cargoToml, "utf8");

    console.log("🦀 LSP Server Version:");
    console.log(`   Old: ${lspVersion}`);
    console.log(`   New: ${newLspVersion}`);
    console.log("");
  }

  console.log("✅ Version increment complete!");
  console.log("");
} catch (error) {
  console.error("❌ Error incrementing version:", error.message);
  process.exit(1);
}
