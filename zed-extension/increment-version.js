#!/usr/bin/env node

/**
 * Increment Version Script for Zed Extension
 * Automatically increments the patch version (third octet) in both:
 * - Cargo.toml (Zed extension version)
 * - extension.toml (Zed extension manifest)
 * - lsp-server/Cargo.toml (LSP server version)
 */

const fs = require("fs");
const path = require("path");

const cargoPath = path.join(__dirname, "Cargo.toml");
const extensionTomlPath = path.join(__dirname, "extension.toml");
const lspCargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

try {
  console.log("🔄 Incrementing versions...\n");

  // ===== INCREMENT ZED EXTENSION VERSION (Cargo.toml) =====
  let cargoToml = fs.readFileSync(cargoPath, "utf8");

  // Find the version line in Cargo.toml
  const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!cargoVersionMatch) {
    console.error("❌ Could not parse version from Cargo.toml");
    process.exit(1);
  }

  const extVersion = cargoVersionMatch[1];
  const extVersionParts = extVersion.split(".");

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

  // Update version in Cargo.toml
  cargoToml = cargoToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${newExtVersion}"`
  );

  fs.writeFileSync(cargoPath, cargoToml, "utf8");

  console.log("📦 Zed Extension Version (Cargo.toml):");
  console.log(`   Old: ${extVersion}`);
  console.log(`   New: ${newExtVersion}`);
  console.log("");

  // ===== INCREMENT ZED EXTENSION VERSION (extension.toml) =====
  let extensionToml = fs.readFileSync(extensionTomlPath, "utf8");

  // Update version in extension.toml
  extensionToml = extensionToml.replace(
    /^version\s*=\s*"[^"]+"/m,
    `version = "${newExtVersion}"`
  );

  fs.writeFileSync(extensionTomlPath, extensionToml, "utf8");

  console.log("📋 Zed Extension Manifest (extension.toml):");
  console.log(`   Old: ${extVersion}`);
  console.log(`   New: ${newExtVersion}`);
  console.log("");

  // ===== INCREMENT LSP SERVER VERSION (Cargo.toml) =====
  if (!fs.existsSync(lspCargoPath)) {
    console.warn(
      "⚠️  LSP server Cargo.toml not found, skipping LSP version increment"
    );
    console.warn(`   Expected at: ${lspCargoPath}`);
  } else {
    let lspCargoToml = fs.readFileSync(lspCargoPath, "utf8");

    // Find the version line
    const lspVersionMatch = lspCargoToml.match(/^version\s*=\s*"([^"]+)"/m);

    if (!lspVersionMatch) {
      console.error("❌ Could not parse version from LSP Cargo.toml");
      process.exit(1);
    }

    const lspVersion = lspVersionMatch[1];
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

    // Replace the version in Cargo.toml (first occurrence only)
    lspCargoToml = lspCargoToml.replace(
      /^version\s*=\s*"[^"]+"/m,
      `version = "${newLspVersion}"`
    );

    // Write back to Cargo.toml
    fs.writeFileSync(lspCargoPath, lspCargoToml, "utf8");

    console.log("🦀 LSP Server Version (Cargo.toml):");
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
