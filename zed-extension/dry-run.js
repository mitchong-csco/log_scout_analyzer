#!/usr/bin/env node

/**
 * Dry Run Script for Zed Extension
 * Shows what will happen during deployment WITHOUT making any changes
 */

const fs = require("fs");
const path = require("path");

console.log("\n🔍 Log Scout Analyzer (Zed) - Deployment Dry Run\n");
console.log("=".repeat(70));
console.log("\nThis script shows what WOULD happen during deployment");
console.log("WITHOUT actually making any changes.\n");
console.log("=".repeat(70));

try {
  // Read current versions
  const cargoPath = path.join(__dirname, "Cargo.toml");
  const extensionTomlPath = path.join(__dirname, "extension.toml");
  const lspCargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const extVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extVersion = extVersionMatch ? extVersionMatch[1] : "unknown";

  const extensionToml = fs.readFileSync(extensionTomlPath, "utf8");
  const extTomlVersionMatch = extensionToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extTomlVersion = extTomlVersionMatch ? extTomlVersionMatch[1] : "unknown";

  const lspCargoToml = fs.readFileSync(lspCargoPath, "utf8");
  const lspVersionMatch = lspCargoToml.match(/^version\s*=\s*"([^"]+)"/m);
  const lspVersion = lspVersionMatch ? lspVersionMatch[1] : "unknown";

  // Parse versions
  const extParts = extVersion.split(".");
  const lspParts = lspVersion.split(".");

  // Calculate new versions
  const newExtVersion = `${extParts[0]}.${extParts[1]}.${parseInt(extParts[2]) + 1}`;
  const newLspVersion = `${lspParts[0]}.${lspParts[1]}.${parseInt(lspParts[2]) + 1}`;

  console.log("\n\n📋 STEP 1: VERSION INCREMENT");
  console.log("-".repeat(70));
  console.log(`   Extension (Cargo.toml):    ${extVersion} → ${newExtVersion}`);
  console.log(`   Extension (extension.toml): ${extTomlVersion} → ${newExtVersion}`);
  console.log(`   LSP Server:                 ${lspVersion} → ${newLspVersion}`);
  console.log("\n   Files that would be modified:");
  console.log(`   • zed-extension/Cargo.toml`);
  console.log(`   • zed-extension/extension.toml`);
  console.log(`   • lsp-server/Cargo.toml`);

  // Check version sync
  if (extVersion !== extTomlVersion) {
    console.log("\n   ⚠️  Current versions are out of sync!");
    console.log(`      Cargo.toml: ${extVersion}`);
    console.log(`      extension.toml: ${extTomlVersion}`);
    console.log(`      These will be synced to: ${newExtVersion}`);
  }

  console.log("\n\n🔄 STEP 2: UPDATE VERSION CONSISTENCY");
  console.log("-".repeat(70));
  console.log("   Command: npm run update:versions");
  console.log("   Ensures all configuration files have matching versions");

  console.log("\n\n🏗️  STEP 3: GENERATE BUILD INFO");
  console.log("-".repeat(70));
  console.log("   Creates: src/build_info.rs");
  console.log(`   Version: ${newExtVersion}`);
  console.log(`   Build #: ${Date.now()}`);
  console.log(`   Date:    ${new Date().toISOString()}`);

  // Try to get git info
  try {
    const { execSync } = require("child_process");
    const commit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    console.log(`   Git:     ${branch}@${commit}`);
  } catch (error) {
    console.log(`   Git:     (not available)`);
  }

  console.log("\n\n🦀 STEP 4: BUILD WASM EXTENSION");
  console.log("-".repeat(70));
  console.log("   Command: cargo build --release --target wasm32-wasip1");
  console.log("   Output:  target/wasm32-wasip1/release/log_scout_analyzer.wasm");
  console.log("\n   Compiles the Zed extension as WebAssembly.");
  console.log("   Estimated time: 1-2 minutes (first build may be longer)");

  // Check current WASM size
  const wasmPath = path.join(__dirname, "target", "wasm32-wasip1", "release", "log_scout_analyzer.wasm");
  if (fs.existsSync(wasmPath)) {
    const stats = fs.statSync(wasmPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   Current WASM size: ${sizeMB} MB`);
  }
  console.log("   Expected size: 1-3 MB (with optimization)");

  console.log("\n\n🔧 STEP 5: BUILD LSP SERVER");
  console.log("-".repeat(70));
  console.log("   Command: cargo build --release --bin log-scout-lsp-server");
  console.log("   Output:  lsp-server/target/release/log-scout-lsp-server.exe");
  console.log("\n   Compiles the Rust LSP server as native Windows binary.");
  console.log("   Estimated time: 30-60 seconds");

  // Check current LSP size
  const lspPath = path.join(__dirname, "..", "lsp-server", "target", "release", "log-scout-lsp-server.exe");
  if (fs.existsSync(lspPath)) {
    const stats = fs.statSync(lspPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   Current LSP size: ${sizeMB} MB`);
  }
  console.log("   Expected size: 8-12 MB");

  console.log("\n\n📦 STEP 6: CREATE DISTRIBUTION PACKAGE");
  console.log("-".repeat(70));
  console.log("   Creates distribution packages in dist/ folder:");
  console.log(`   • log-scout-analyzer-zed-${newExtVersion}.tar.gz`);
  console.log(`   • log-scout-analyzer-zed-${newExtVersion}.zip`);
  console.log("\n   Package contents:");
  console.log("   • extension.toml (manifest)");
  console.log("   • log_scout_analyzer.wasm (extension binary)");
  console.log("   • grammars/ (syntax highlighting)");
  console.log("   • README.md (installation instructions)");
  console.log("   • LICENSE");
  console.log("\n   Estimated time: 5-10 seconds");

  console.log("\n\n💾 STEP 7: COPY TO DOWNLOADS");
  console.log("-".repeat(70));
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  const destDir = path.join(userProfile, "Downloads", "zed-extensions");
  console.log(`   Copies packages to: ${destDir}`);
  console.log("\n   This makes it easy to find and share the extension.");

  console.log("\n\n🎯 STEP 8: INSTALL TO ZED");
  console.log("-".repeat(70));
  let zedExtDir;
  if (process.platform === 'win32') {
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  } else if (process.platform === 'darwin') {
    zedExtDir = path.join(userProfile, 'Library', 'Application Support', 'Zed', 'extensions', 'log-scout-analyzer');
  } else {
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  }
  console.log(`   Installs extension to: ${zedExtDir}`);
  console.log("\n   Copies:");
  console.log("   • log_scout_analyzer.wasm");
  console.log("   • extension.toml");
  console.log("   • grammars/");
  console.log("\n   You'll need to restart Zed to activate the extension.");

  console.log("\n\n📊 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log(`   Current Extension Version:  v${extVersion}`);
  console.log(`   Current LSP Version:        v${lspVersion}`);
  console.log(`   New Extension Version:      v${newExtVersion}`);
  console.log(`   New LSP Version:            v${newLspVersion}`);
  console.log("\n   Total Steps:      8");
  console.log("   Estimated Time:   2-3 minutes");
  console.log("\n   Files Modified:   3 (Cargo.toml files)");
  console.log("   Files Generated:  6+ (build_info.rs, WASM, LSP, packages)");

  console.log("\n\n🎯 TO ACTUALLY DEPLOY");
  console.log("=".repeat(70));
  console.log("\n   Run one of these commands:");
  console.log("\n   npm run deploy        (recommended - full automation)");
  console.log("   DEPLOY.bat            (Windows - with visual feedback)");
  console.log("\n   Or step-by-step:");
  console.log("   1. npm run version:increment");
  console.log("   2. npm run update:versions");
  console.log("   3. node generate-build-info.js");
  console.log("   4. cargo build --release --target wasm32-wasip1");
  console.log("   5. cd ../lsp-server && cargo build --release");
  console.log("   6. npm run package");
  console.log("   7. npm run install:zed");
  console.log("   8. Restart Zed");

  console.log("\n\n💡 HELPFUL TIPS");
  console.log("=".repeat(70));
  console.log("\n   • Check current status:  npm run status");
  console.log("   • Test scripts work:     npm run test:scripts");
  console.log("   • Build without version: npm run build:all");
  console.log("   • Check for errors:      npm run check");
  console.log("   • Format code:           npm run format");
  console.log("   • Run linter:            npm run lint");

  console.log("\n\n🦀 RUST BUILD NOTES");
  console.log("=".repeat(70));
  console.log("\n   • First build will download and compile dependencies (slower)");
  console.log("   • Subsequent builds use cached artifacts (faster)");
  console.log("   • Release builds are optimized for size (opt-level = 'z')");
  console.log("   • LTO (Link Time Optimization) is enabled");
  console.log("   • Debug symbols are stripped for smaller binaries");
  console.log("   • wasm32-wasip1 target must be installed:");
  console.log("     rustup target add wasm32-wasip1");

  console.log("\n\n🎯 ZED INSTALLATION PATHS");
  console.log("=".repeat(70));
  console.log("\n   Windows: %USERPROFILE%\\.config\\zed\\extensions\\log-scout-analyzer");
  console.log("   macOS:   ~/Library/Application Support/Zed/extensions/log-scout-analyzer");
  console.log("   Linux:   ~/.config/zed/extensions/log-scout-analyzer");
  console.log("\n   After installation, verify in Zed:");
  console.log("   1. Open Zed");
  console.log("   2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)");
  console.log("   3. Type 'Extensions'");
  console.log("   4. Look for 'Log Scout Analyzer'");

  console.log("\n\n✨ NO CHANGES WERE MADE");
  console.log("=".repeat(70));
  console.log("\n   This was a dry run - nothing has been modified.");
  console.log("   Your workspace is exactly as it was before.\n");

} catch (error) {
  console.error("\n❌ Error during dry run:", error.message);
  console.error("\nPlease ensure you are in the zed-extension directory.\n");
  process.exit(1);
}
