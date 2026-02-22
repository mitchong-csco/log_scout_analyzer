#!/usr/bin/env node

/**
 * Install to Zed Script
 * Installs the Log Scout Analyzer extension into Zed editor
 */

const fs = require("fs");
const path = require("path");

console.log("\n🎯 Installing Log Scout Analyzer to Zed...\n");
console.log("=".repeat(70));

try {
  // Determine Zed extensions directory based on OS
  const userProfile = process.env.USERPROFILE || process.env.HOME;
  let zedExtDir;

  if (process.platform === 'win32') {
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  } else if (process.platform === 'darwin') {
    zedExtDir = path.join(userProfile, 'Library', 'Application Support', 'Zed', 'extensions', 'log-scout-analyzer');
  } else {
    // Linux and other Unix-like systems
    zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
  }

  console.log(`📋 Platform: ${process.platform}`);
  console.log(`📂 Target directory: ${zedExtDir}\n`);

  // Check if WASM binary exists
  const wasmPath = path.join(
    __dirname,
    "target",
    "wasm32-wasip1",
    "release",
    "log_scout_analyzer.wasm"
  );

  if (!fs.existsSync(wasmPath)) {
    console.error("❌ WASM binary not found!");
    console.error(`   Expected at: ${wasmPath}`);
    console.error("   Run 'npm run build' first to create the WASM binary.");
    process.exit(1);
  }

  const wasmStats = fs.statSync(wasmPath);
  const wasmSizeMB = (wasmStats.size / 1024 / 1024).toFixed(2);
  console.log(`✅ WASM binary found (${wasmSizeMB} MB)`);

  // Check if extension.toml exists
  const extensionTomlPath = path.join(__dirname, "extension.toml");
  if (!fs.existsSync(extensionTomlPath)) {
    console.error("❌ extension.toml not found!");
    console.error(`   Expected at: ${extensionTomlPath}`);
    process.exit(1);
  }
  console.log(`✅ extension.toml found\n`);

  // Create Zed extensions directory if it doesn't exist
  console.log("📁 Creating installation directory...");
  fs.mkdirSync(zedExtDir, { recursive: true });
  console.log(`   ✓ ${zedExtDir}\n`);

  // Copy WASM binary
  console.log("📦 Installing extension files...");
  const destWasm = path.join(zedExtDir, "log_scout_analyzer.wasm");
  fs.copyFileSync(wasmPath, destWasm);
  console.log("   ✓ log_scout_analyzer.wasm");

  // Copy extension.toml
  const destToml = path.join(zedExtDir, "extension.toml");
  fs.copyFileSync(extensionTomlPath, destToml);
  console.log("   ✓ extension.toml");

  // Copy grammars directory if it exists
  const grammarsDir = path.join(__dirname, "grammars");
  if (fs.existsSync(grammarsDir)) {
    const destGrammars = path.join(zedExtDir, "grammars");

    // Remove old grammars directory if it exists
    if (fs.existsSync(destGrammars)) {
      fs.rmSync(destGrammars, { recursive: true, force: true });
    }

    fs.cpSync(grammarsDir, destGrammars, { recursive: true });
    console.log("   ✓ grammars/ directory");
  } else {
    console.log("   ℹ️  grammars/ directory not found (optional)");
  }

  // Copy config directory if it exists
  const configDir = path.join(__dirname, "config");
  if (fs.existsSync(configDir)) {
    const destConfig = path.join(zedExtDir, "config");

    // Remove old config directory if it exists
    if (fs.existsSync(destConfig)) {
      fs.rmSync(destConfig, { recursive: true, force: true });
    }

    fs.cpSync(configDir, destConfig, { recursive: true });
    console.log("   ✓ config/ directory");
  }

  // Copy README if it exists
  const readmePath = path.join(__dirname, "README.md");
  if (fs.existsSync(readmePath)) {
    const destReadme = path.join(zedExtDir, "README.md");
    fs.copyFileSync(readmePath, destReadme);
    console.log("   ✓ README.md");
  }

  // Copy LICENSE if it exists
  const licensePath = path.join(__dirname, "..", "LICENSE");
  if (fs.existsSync(licensePath)) {
    const destLicense = path.join(zedExtDir, "LICENSE");
    fs.copyFileSync(licensePath, destLicense);
    console.log("   ✓ LICENSE");
  }

  console.log("");

  // Verify installation
  console.log("🔍 Verifying installation...");

  const verifyFiles = [
    { path: destWasm, name: "log_scout_analyzer.wasm" },
    { path: destToml, name: "extension.toml" }
  ];

  let allVerified = true;
  verifyFiles.forEach(({ path: filePath, name }) => {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   ✅ ${name} (${sizeMB} MB)`);
    } else {
      console.log(`   ❌ ${name} - MISSING!`);
      allVerified = false;
    }
  });

  // Get version info
  console.log("\n📊 Installation Summary");
  console.log("-".repeat(70));

  const cargoPath = path.join(__dirname, "Cargo.toml");
  if (fs.existsSync(cargoPath)) {
    const cargoToml = fs.readFileSync(cargoPath, "utf8");
    const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
    if (versionMatch) {
      console.log(`   Version:  ${versionMatch[1]}`);
    }
  }

  console.log(`   Location: ${zedExtDir}`);
  console.log(`   Platform: ${process.platform}`);

  if (allVerified) {
    console.log("\n✅ Installation successful!");

    console.log("\n📋 Next Steps:");
    console.log("   1. Restart Zed editor completely (quit and relaunch)");
    console.log("   2. Open Zed");
    console.log("   3. Press Ctrl+Shift+P (or Cmd+Shift+P on macOS)");
    console.log("   4. Type 'Extensions' to open the Extensions panel");
    console.log("   5. Look for 'Log Scout Analyzer' in the installed list");
    console.log("   6. Open a .log file to test the extension");

    console.log("\n💡 Tips:");
    console.log("   • Log files (.log, .txt, .out) will have syntax highlighting");
    console.log("   • The extension provides diagnostics for common log patterns");
    console.log("   • If you don't see the extension, check Zed's console (Ctrl+Shift+I)");

    // Check if Zed might be running
    if (process.platform !== 'win32') {
      try {
        const { execSync } = require("child_process");
        execSync("pgrep -x zed || pgrep -x Zed", { stdio: "ignore" });
        console.log("\n⚠️  Warning: Zed appears to be running");
        console.log("   Please restart Zed to load the extension");
      } catch (error) {
        // Zed not running, which is good
      }
    }

    console.log("\n🔗 Useful Commands:");
    console.log("   npm run status    - Check installation status");
    console.log("   npm run deploy    - Rebuild and reinstall");
    console.log("   npm run help      - Show all available commands");

  } else {
    console.log("\n❌ Installation incomplete!");
    console.log("   Some files are missing. Please check the errors above.");
    process.exit(1);
  }

  console.log("");

} catch (error) {
  console.error("\n❌ Installation failed:", error.message);
  console.error("\nTroubleshooting:");
  console.error("   1. Ensure WASM binary is built: npm run build");
  console.error("   2. Check file permissions");
  console.error("   3. Verify Zed is properly installed");
  console.error("   4. Run 'npm run status' to check build status");
  console.error("");
  process.exit(1);
}
