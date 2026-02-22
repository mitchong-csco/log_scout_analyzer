#!/usr/bin/env node

/**
 * Show Status Script
 * Displays current version information without making any changes
 */

const fs = require("fs");
const path = require("path");

console.log("\n📊 Log Scout Analyzer - Build Status\n");
console.log("=".repeat(70));

try {
  // Read extension version
  const packagePath = path.join(__dirname, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const extVersion = packageJson.version;

  // Read LSP server version
  const cargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
  const lspVersion = versionMatch ? versionMatch[1] : "unknown";

  // Parse versions
  const extParts = extVersion.split(".");
  const lspParts = lspVersion.split(".");

  console.log("\n📦 CURRENT VERSIONS");
  console.log("-".repeat(70));
  console.log(`   Extension:  ${extVersion}`);
  console.log(`   LSP Server: ${lspVersion}`);

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
  const buildInfoPath = path.join(__dirname, "src", "buildInfo.ts");
  if (fs.existsSync(buildInfoPath)) {
    const buildInfo = fs.readFileSync(buildInfoPath, "utf8");

    // Extract build info
    const versionMatch = buildInfo.match(/version:\s*"([^"]+)"/);
    const timestampMatch = buildInfo.match(/buildTimestamp:\s*"([^"]+)"/);
    const gitMatch = buildInfo.match(/gitCommit:\s*"([^"]+)"/);

    if (versionMatch || timestampMatch || gitMatch) {
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
      if (gitMatch) {
        console.log(`   Git Commit: ${gitMatch[1]}`);
      }
    }
  }

  // Check for VSIX file
  const vsixPath = path.join(__dirname, "log-scout-analyzer.vsix");
  if (fs.existsSync(vsixPath)) {
    const stats = fs.statSync(vsixPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const modDate = new Date(stats.mtime);

    console.log("\n📦 VSIX PACKAGE");
    console.log("-".repeat(70));
    console.log(`   File:     log-scout-analyzer.vsix`);
    console.log(`   Size:     ${sizeMB} MB (${sizeKB} KB)`);
    console.log(`   Modified: ${modDate.toLocaleString()}`);
  } else {
    console.log("\n📦 VSIX PACKAGE");
    console.log("-".repeat(70));
    console.log(`   ⚠️  No VSIX file found. Run 'npm run package' to create one.`);
  }

  // Check for LSP binary
  const lspBinaryPath = path.join(__dirname, "bin", "log-scout-lsp-server-win.exe");
  if (fs.existsSync(lspBinaryPath)) {
    const stats = fs.statSync(lspBinaryPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    const modDate = new Date(stats.mtime);

    console.log("\n🦀 LSP SERVER BINARY");
    console.log("-".repeat(70));
    console.log(`   File:     log-scout-lsp-server-win.exe`);
    console.log(`   Size:     ${sizeMB} MB`);
    console.log(`   Modified: ${modDate.toLocaleString()}`);
  } else {
    console.log("\n🦀 LSP SERVER BINARY");
    console.log("-".repeat(70));
    console.log(`   ⚠️  No LSP binary found. Run 'npm run build:lsp' to build it.`);
  }

  // Activity bar title preview
  console.log("\n🎨 ACTIVITY BAR DISPLAY");
  console.log("-".repeat(70));
  console.log(`   Scout Analyzer (v${extVersion} | LSP v${lspVersion})`);
  console.log(`   Scout Toolkit (v${extVersion} | LSP v${lspVersion})`);

  // Quick commands
  console.log("\n🚀 QUICK COMMANDS");
  console.log("-".repeat(70));
  console.log(`   npm run version:increment  - Increment versions only`);
  console.log(`   npm run build:all          - Build LSP + extension`);
  console.log(`   npm run package            - Create VSIX package`);
  console.log(`   npm run deploy             - Full deployment (recommended)`);
  console.log(`   node show-status.js        - Show this status again`);

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
  console.error("\nPlease ensure you are in the vscode-extension directory.\n");
  process.exit(1);
}
