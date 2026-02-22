#!/usr/bin/env node

/**
 * Update Versions Script for Zed Extension
 * Reads versions from Cargo.toml files and ensures consistency
 * across all configuration files
 */

const fs = require("fs");
const path = require("path");

function updateVersions() {
  console.log("📦 Updating version information...");
  console.log(`   Working directory: ${process.cwd()}`);
  console.log(`   Script location: ${__dirname}`);

  // Read extension version from Cargo.toml
  const cargoPath = path.join(__dirname, "Cargo.toml");
  const extensionTomlPath = path.join(__dirname, "extension.toml");
  const lspCargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

  console.log(`   Looking for Cargo.toml at: ${cargoPath}`);
  console.log(`   Looking for extension.toml at: ${extensionTomlPath}`);
  console.log(`   Looking for LSP Cargo.toml at: ${lspCargoPath}`);

  // Check if files exist
  if (!fs.existsSync(cargoPath)) {
    throw new Error(`Cargo.toml not found at: ${cargoPath}`);
  }
  if (!fs.existsSync(extensionTomlPath)) {
    throw new Error(`extension.toml not found at: ${extensionTomlPath}`);
  }
  if (!fs.existsSync(lspCargoPath)) {
    throw new Error(`LSP Cargo.toml not found at: ${lspCargoPath}`);
  }

  // Read extension version from Cargo.toml
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!cargoVersionMatch) {
    throw new Error("Could not parse version from Cargo.toml");
  }

  const extVersion = cargoVersionMatch[1];

  // Read extension version from extension.toml
  const extensionToml = fs.readFileSync(extensionTomlPath, "utf8");
  const extTomlVersionMatch = extensionToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!extTomlVersionMatch) {
    throw new Error("Could not parse version from extension.toml");
  }

  const extTomlVersion = extTomlVersionMatch[1];

  // Read LSP server version from Cargo.toml
  const lspCargoToml = fs.readFileSync(lspCargoPath, "utf8");
  const lspVersionMatch = lspCargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!lspVersionMatch) {
    throw new Error("Could not parse version from LSP Cargo.toml");
  }

  const lspVersion = lspVersionMatch[1];

  console.log(`   ✓ Extension (Cargo.toml): v${extVersion}`);
  console.log(`   ✓ Extension (extension.toml): v${extTomlVersion}`);
  console.log(`   ✓ LSP Server: v${lspVersion}`);

  // Check if versions are in sync
  if (extVersion !== extTomlVersion) {
    console.log("\n⚠️  Version mismatch detected!");
    console.log(`   Cargo.toml: ${extVersion}`);
    console.log(`   extension.toml: ${extTomlVersion}`);
    console.log("\n🔧 Syncing extension.toml to match Cargo.toml...");

    // Update extension.toml to match Cargo.toml
    const updatedExtensionToml = extensionToml.replace(
      /^version\s*=\s*"[^"]+"/m,
      `version = "${extVersion}"`
    );

    fs.writeFileSync(extensionTomlPath, updatedExtensionToml, "utf8");
    console.log(`   ✓ extension.toml updated to v${extVersion}`);
  } else {
    console.log("\n✅ All extension versions are in sync");
  }

  // Update package.json if it exists
  const packageJsonPath = path.join(__dirname, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (packageJson.version !== extVersion) {
        packageJson.version = extVersion;
        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2) + "\n",
          "utf8"
        );
        console.log(`   ✓ package.json updated to v${extVersion}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  Could not update package.json: ${error.message}`);
    }
  }

  console.log("\n📊 Version Summary:");
  console.log(`   Zed Extension: v${extVersion}`);
  console.log(`   LSP Server: v${lspVersion}`);
  console.log("\n✅ Version information updated successfully");
}

// Run if called directly
if (require.main === module) {
  try {
    updateVersions();
  } catch (error) {
    console.error("❌ Failed to update versions:", error.message);
    process.exit(1);
  }
}

module.exports = { updateVersions };
