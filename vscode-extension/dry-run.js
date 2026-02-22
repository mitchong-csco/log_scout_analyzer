#!/usr/bin/env node

/**
 * Dry Run Script
 * Shows what will happen during deployment WITHOUT making any changes
 */

const fs = require("fs");
const path = require("path");

console.log("\n🔍 Log Scout Analyzer - Deployment Dry Run\n");
console.log("=".repeat(70));
console.log("\nThis script shows what WOULD happen during deployment");
console.log("WITHOUT actually making any changes.\n");
console.log("=".repeat(70));

try {
  // Read current versions
  const packagePath = path.join(__dirname, "package.json");
  const cargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const extVersion = packageJson.version;

  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
  const lspVersion = versionMatch ? versionMatch[1] : "unknown";

  // Parse versions
  const extParts = extVersion.split(".");
  const lspParts = lspVersion.split(".");

  // Calculate new versions
  const newExtVersion = `${extParts[0]}.${extParts[1]}.${parseInt(extParts[2]) + 1}`;
  const newLspVersion = `${lspParts[0]}.${lspParts[1]}.${parseInt(lspParts[2]) + 1}`;

  console.log("\n\n📋 STEP 1: VERSION INCREMENT");
  console.log("-".repeat(70));
  console.log(`   Extension:  ${extVersion} → ${newExtVersion}`);
  console.log(`   LSP Server: ${lspVersion} → ${newLspVersion}`);
  console.log("\n   Files that would be modified:");
  console.log(`   • package.json`);
  console.log(`   • lsp-server/Cargo.toml`);

  console.log("\n\n🦀 STEP 2: BUILD LSP SERVER");
  console.log("-".repeat(70));
  console.log("   Command: cargo build --release --bin log-scout-lsp-server");
  console.log("   Output:  bin/log-scout-lsp-server-win.exe");
  console.log("\n   This step compiles the Rust LSP server in release mode.");
  console.log("   Estimated time: 30-60 seconds");

  console.log("\n\n📝 STEP 3: UPDATE VERSION DISPLAY");
  console.log("-".repeat(70));
  console.log("   Updates activity bar titles in package.json:");
  console.log(`   • Scout Analyzer (v${newExtVersion} | LSP v${newLspVersion})`);
  console.log(`   • Scout Toolkit (v${newExtVersion} | LSP v${newLspVersion})`);

  console.log("\n\n🏗️  STEP 4: GENERATE BUILD INFO");
  console.log("-".repeat(70));
  console.log("   Creates: src/buildInfo.ts");
  console.log(`   Version: ${newExtVersion}`);
  console.log(`   Build #: ${Date.now()}`);
  console.log(`   Date:    ${new Date().toISOString()}`);

  // Try to get git info
  try {
    const { execSync } = require("child_process");
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8"
    }).trim();
    console.log(`   Git:     ${commit}`);
  } catch (error) {
    console.log(`   Git:     (not available)`);
  }

  console.log("\n\n🔨 STEP 5: COMPILE TYPESCRIPT");
  console.log("-".repeat(70));
  console.log("   Command: tsc -p ./");
  console.log("   Output:  out/ directory");
  console.log("\n   Compiles all TypeScript files to JavaScript.");
  console.log("   Estimated time: 5-15 seconds");

  console.log("\n\n📦 STEP 6: CREATE VSIX PACKAGE");
  console.log("-".repeat(70));
  console.log("   Command: vsce package");
  console.log("   Output:  log-scout-analyzer.vsix");
  console.log("\n   Packages the extension, LSP binary, and all assets.");

  // Check current VSIX size
  const vsixPath = path.join(__dirname, "log-scout-analyzer.vsix");
  if (fs.existsSync(vsixPath)) {
    const stats = fs.statSync(vsixPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   Current VSIX size: ~${sizeMB} MB`);
  }
  console.log("   Estimated size: 8-10 MB");

  console.log("\n\n💾 STEP 7: COPY TO DOWNLOADS");
  console.log("-".repeat(70));
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  const destDir = path.join(userProfile, "Downloads", "vscode-extensions");
  console.log(`   Copies VSIX to: ${destDir}`);
  console.log("\n   This makes it easy to find and share the extension.");

  console.log("\n\n🚀 STEP 8: INSTALL INTO VSCODE");
  console.log("-".repeat(70));
  console.log("   Command: code --install-extension log-scout-analyzer.vsix");
  console.log("\n   Installs the extension into your local VSCode.");
  console.log("   You'll need to reload VSCode to activate it.");

  console.log("\n\n📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log(`   Current Version:  v${extVersion} (LSP v${lspVersion})`);
  console.log(`   New Version:      v${newExtVersion} (LSP v${newLspVersion})`);
  console.log("\n   Total Steps:      8");
  console.log("   Estimated Time:   1-2 minutes");
  console.log("\n   Files Modified:   2 (package.json, Cargo.toml)");
  console.log("   Files Generated:  3 (buildInfo.ts, VSIX, LSP binary)");

  console.log("\n\n🎯 TO ACTUALLY DEPLOY");
  console.log("=".repeat(70));
  console.log("\n   Run one of these commands:");
  console.log("\n   npm run deploy        (recommended - full automation)");
  console.log("   DEPLOY.bat            (Windows - with visual feedback)");
  console.log("\n   Or step-by-step:");
  console.log("   1. npm run version:increment");
  console.log("   2. npm run build:lsp");
  console.log("   3. npm run build");
  console.log("   4. vsce package");
  console.log("   5. code --install-extension log-scout-analyzer.vsix");
  console.log("   6. Reload VSCode window");

  console.log("\n\n💡 HELPFUL TIPS");
  console.log("=".repeat(70));
  console.log("\n   • Check current status:  npm run status");
  console.log("   • Test scripts work:     npm run test:scripts");
  console.log("   • Build without version: npm run build:all");
  console.log("   • Manual install:        Extensions → Install from VSIX");

  console.log("\n\n✨ NO CHANGES WERE MADE");
  console.log("=".repeat(70));
  console.log("\n   This was a dry run - nothing has been modified.");
  console.log("   Your workspace is exactly as it was before.\n");

} catch (error) {
  console.error("\n❌ Error during dry run:", error.message);
  console.error("\nPlease ensure you are in the vscode-extension directory.\n");
  process.exit(1);
}
