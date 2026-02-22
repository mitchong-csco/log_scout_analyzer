#!/usr/bin/env node

/**
 * Show Status Script for Zed Extension
 * Displays current version information without making any changes
 */

const fs = require("fs");
const path = require("path");

console.log("\n📊 Log Scout Analyzer (Zed) - Build Status\n");
console.log("=".repeat(70));

try {
  // Read extension version from Cargo.toml
  const cargoPath = path.join(__dirname, "Cargo.toml");
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const extVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extVersion = extVersionMatch ? extVersionMatch[1] : "unknown";

  // Read extension version from extension.toml
  const extensionTomlPath = path.join(__dirname, "extension.toml");
  const extensionToml = fs.readFileSync(extensionTomlPath, "utf8");
  const extTomlVersionMatch = extensionToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extTomlVersion = extTomlVersionMatch ? extTomlVersionMatch[1] : "unknown";

  // Read LSP server version
  const lspCargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");
  const lspCargoToml = fs.readFileSync(lspCargoPath, "utf8");
  const lspVersionMatch = lspCargoToml.match(/^version\s*=\s*"([^"]+)"/m);
  const lspVersion = lspVersionMatch ? lspVersionMatch[1] : "unknown";

  // Parse versions
  const extParts = extVersion.split(".");
  const lspParts = lspVersion.split(".");

  console.log("\n📦 CURRENT VERSIONS");
  console.log("-".repeat(70));
  console.log(`   Extension (Cargo.toml):    ${extVersion}`);
  console.log(`   Extension (extension.toml): ${extTomlVersion}`);
  console.log(`   LSP Server:                 ${lspVersion}`);

  // Check for version sync
  if (extVersion !== extTomlVersion) {
    console.log("\n   ⚠️  Version mismatch detected!");
    console.log(`      Run 'npm run update:versions' to sync`);
  } else {
    console.log("\n   ✅ Extension versions are in sync");
  }

  console.log("\n🔮 NEXT VERSIONS (after increment)");
  console.log("-".repeat(70));
  if (extParts.length === 3) {
    const nextExtPatch = parseInt(extParts[2]) + 1;
    console.log(`   Extension:  ${extParts[0]}.${extParts[1]}.${nextExtPatch}`);
  }
  if (lspParts.length === 3) {
    const nextLspPatch = parseInt(lspParts[2]) + 1;
    console.log(`   LSP Server: ${lspParts[0]}.${lspParts[1]}.${nextLspPatch}`);
  }

  // Check for build info
  const buildInfoPath = path.join(__dirname, "src", "build_info.rs");
  if (fs.existsSync(buildInfoPath)) {
    const buildInfo = fs.readFileSync(buildInfoPath, "utf8");

    // Extract build info
    const versionMatch = buildInfo.match(/VERSION:\s*&str\s*=\s*"([^"]+)"/);
    const timestampMatch = buildInfo.match(/BUILD_TIMESTAMP:\s*&str\s*=\s*"([^"]+)"/);
    const gitCommitMatch = buildInfo.match(/GIT_COMMIT:\s*&str\s*=\s*"([^"]+)"/);
    const gitBranchMatch = buildInfo.match(/GIT_BRANCH:\s*&str\s*=\s*"([^"]+)"/);
    const gitDirtyMatch = buildInfo.match(/GIT_DIRTY:\s*bool\s*=\s*(true|false)/);

    if (versionMatch || timestampMatch || gitCommitMatch) {
      console.log("\n🏗️  LAST BUILD INFO");
      console.log("-".repeat(70));
      if (versionMatch) {
        console.log(`   Version:    ${versionMatch[1]}`);
      }
      if (timestampMatch) {
        const buildDate = new Date(timestampMatch[1]);
        console.log(`   Build Date: ${buildDate.toLocaleString()}`);

        // Calculate time since build
        const now = new Date();
        const diffMs = now - buildDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeSince = "";
        if (diffDays > 0) {
          timeSince = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          timeSince = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        } else if (diffMins > 0) {
          timeSince = `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
        } else {
          timeSince = "just now";
        }
        console.log(`   Time Ago:   ${timeSince}`);
      }
      if (gitBranchMatch && gitCommitMatch) {
        const isDirty = gitDirtyMatch && gitDirtyMatch[1] === "true";
        console.log(`   Git:        ${gitBranchMatch[1]}@${gitCommitMatch[1]}${isDirty ? " (dirty)" : ""}`);
      }
    }
  }

  // Check for WASM binary
  const wasmPath = path.join(__dirname, "target", "wasm32-wasip1", "release", "log_scout_analyzer.wasm");
  if (fs.existsSync(wasmPath)) {
    const stats = fs.statSync(wasmPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const modDate = new Date(stats.mtime);

    console.log("\n🦀 WASM BINARY");
    console.log("-".repeat(70));
    console.log(`   File:     log_scout_analyzer.wasm`);
    console.log(`   Size:     ${sizeMB} MB (${sizeKB} KB)`);
    console.log(`   Modified: ${modDate.toLocaleString()}`);
  } else {
    console.log("\n🦀 WASM BINARY");
    console.log("-".repeat(70));
    console.log(`   ⚠️  No WASM binary found. Run 'npm run build' to create one.`);
  }

  // Check for LSP binary
  const lspBinaryPath = path.join(__dirname, "..", "lsp-server", "target", "release", "log-scout-lsp-server.exe");
  if (fs.existsSync(lspBinaryPath)) {
    const stats = fs.statSync(lspBinaryPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const modDate = new Date(stats.mtime);

    console.log("\n🔧 LSP SERVER BINARY");
    console.log("-".repeat(70));
    console.log(`   File:     log-scout-lsp-server.exe`);
    console.log(`   Size:     ${sizeMB} MB`);
    console.log(`   Modified: ${modDate.toLocaleString()}`);
  } else {
    console.log("\n🔧 LSP SERVER BINARY");
    console.log("-".repeat(70));
    console.log(`   ⚠️  No LSP binary found. Run 'npm run build:lsp' to build it.`);
  }

  // Check for package archives
  const distDir = path.join(__dirname, "dist");
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    const archives = files.filter(f => f.endsWith('.tar.gz') || f.endsWith('.zip'));

    if (archives.length > 0) {
      console.log("\n📦 PACKAGE ARCHIVES");
      console.log("-".repeat(70));
      archives.forEach(archive => {
        const archivePath = path.join(distDir, archive);
        const stats = fs.statSync(archivePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   ${archive} (${sizeMB} MB)`);
      });
    } else {
      console.log("\n📦 PACKAGE ARCHIVES");
      console.log("-".repeat(70));
      console.log(`   ⚠️  No package archives found. Run 'npm run package' to create one.`);
    }
  } else {
    console.log("\n📦 PACKAGE ARCHIVES");
    console.log("-".repeat(70));
    console.log(`   ⚠️  No dist/ directory. Run 'npm run package' to create packages.`);
  }

  // Check Zed installation
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  let zedExtDir;

  // Determine Zed extensions directory based on OS
  if (process.platform === 'win32') {
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  } else if (process.platform === 'darwin') {
    zedExtDir = path.join(userProfile, 'Library', 'Application Support', 'Zed', 'extensions', 'log-scout-analyzer');
  } else {
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  }

  console.log("\n🎯 ZED INSTALLATION");
  console.log("-".repeat(70));
  if (fs.existsSync(zedExtDir)) {
    console.log(`   ✅ Extension is installed in Zed`);
    console.log(`   📂 Location: ${zedExtDir}`);

    const installedWasm = path.join(zedExtDir, 'log_scout_analyzer.wasm');
    if (fs.existsSync(installedWasm)) {
      const stats = fs.statSync(installedWasm);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      const modDate = new Date(stats.mtime);
      console.log(`   📦 WASM: ${sizeMB} MB (${modDate.toLocaleString()})`);
    }
  } else {
    console.log(`   ⚠️  Extension not installed in Zed`);
    console.log(`   📂 Expected: ${zedExtDir}`);
    console.log(`   Run 'npm run install:zed' to install`);
  }

  // Quick commands
  console.log("\n🚀 QUICK COMMANDS");
  console.log("-".repeat(70));
  console.log(`   npm run version:increment  - Increment versions only`);
  console.log(`   npm run build:all          - Build WASM + LSP server`);
  console.log(`   npm run package            - Create distribution package`);
  console.log(`   npm run install:zed        - Install to Zed`);
  console.log(`   npm run deploy             - Full deployment (recommended)`);
  console.log(`   npm run status             - Show this status again`);

  // Git status
  try {
    const { execSync } = require("child_process");

    // Get current branch
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8"
    }).trim();

    // Get short commit hash
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8"
    }).trim();

    // Check for uncommitted changes
    const status = execSync("git status --porcelain", {
      encoding: "utf8"
    }).trim();

    const hasChanges = status.length > 0;

    console.log("\n🔱 GIT STATUS");
    console.log("-".repeat(70));
    console.log(`   Branch:  ${branch}`);
    console.log(`   Commit:  ${commit}`);
    console.log(`   Status:  ${hasChanges ? "⚠️  Uncommitted changes" : "✅ Clean"}`);

    if (hasChanges) {
      const lines = status.split("\n");
      const fileCount = lines.length;
      console.log(`   Files:   ${fileCount} file${fileCount !== 1 ? "s" : ""} modified`);
    }
  } catch (error) {
    // Git not available or not in a git repo
    console.log("\n🔱 GIT STATUS");
    console.log("-".repeat(70));
    console.log(`   ℹ️  Git information not available`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("\n✨ Status check complete!\n");

} catch (error) {
  console.error("\n❌ Error reading status:", error.message);
  console.error("\nPlease ensure you are in the zed-extension directory.\n");
  process.exit(1);
}
