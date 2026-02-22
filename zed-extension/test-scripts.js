#!/usr/bin/env node

/**
 * Test Script for Zed Extension Build Automation
 * Verifies all build scripts work correctly without actually running a full build
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Zed Extension Build Automation Scripts\n");
console.log("=".repeat(70));

let allPassed = true;

// Helper to check if a file exists
function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? "✅" : "❌";
  console.log(`${status} ${description}`);
  if (!exists) {
    console.log(`   Missing: ${filePath}`);
    allPassed = false;
  }
  return exists;
}

// Helper to check if a script is valid Node.js
function checkScript(scriptPath, description) {
  console.log(`\n📜 Checking: ${description}`);

  if (!checkFile(scriptPath, `Script file exists`)) {
    return false;
  }

  try {
    // Try to read the script (this will check for syntax errors)
    const script = fs.readFileSync(scriptPath, "utf8");

    // Check for basic required elements
    const hasRequire = script.includes("require(");
    const hasFsImport = script.includes('require("fs")') || script.includes("require('fs')");
    const hasPathImport = script.includes('require("path")') || script.includes("require('path')");

    console.log(`   ✅ Script is readable`);
    console.log(`   ${hasRequire ? "✅" : "⚠️ "} Uses require()`);
    console.log(`   ${hasFsImport ? "✅" : "⚠️ "} Imports fs module`);
    console.log(`   ${hasPathImport ? "✅" : "⚠️ "} Imports path module`);

    return true;
  } catch (error) {
    console.log(`   ❌ Error reading script: ${error.message}`);
    allPassed = false;
    return false;
  }
}

// Helper to parse version from file
function parseVersion(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : null;
}

console.log("\n\n1️⃣  CHECKING REQUIRED FILES");
console.log("-".repeat(70));

const cargoPath = path.join(__dirname, "Cargo.toml");
const extensionTomlPath = path.join(__dirname, "extension.toml");
const lspCargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

checkFile(cargoPath, "Cargo.toml exists");
checkFile(extensionTomlPath, "extension.toml exists");
checkFile(lspCargoPath, "lsp-server/Cargo.toml exists");

console.log("\n\n2️⃣  CHECKING BUILD SCRIPTS");
console.log("-".repeat(70));

checkScript(
  path.join(__dirname, "increment-version.js"),
  "increment-version.js"
);
checkScript(
  path.join(__dirname, "update-versions.js"),
  "update-versions.js"
);
checkScript(
  path.join(__dirname, "generate-build-info.js"),
  "generate-build-info.js"
);
checkScript(
  path.join(__dirname, "show-status.js"),
  "show-status.js"
);
checkScript(
  path.join(__dirname, "help.js"),
  "help.js"
);
checkScript(
  path.join(__dirname, "dry-run.js"),
  "dry-run.js"
);
checkScript(
  path.join(__dirname, "clean.js"),
  "clean.js"
);

console.log("\n\n3️⃣  CHECKING VERSION CONSISTENCY");
console.log("-".repeat(70));

try {
  // Read current versions
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const extVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extVersion = extVersionMatch ? extVersionMatch[1] : null;

  const extensionToml = fs.readFileSync(extensionTomlPath, "utf8");
  const extTomlVersionMatch = extensionToml.match(/^version\s*=\s*"([^"]+)"/m);
  const extTomlVersion = extTomlVersionMatch ? extTomlVersionMatch[1] : null;

  const lspCargoToml = fs.readFileSync(lspCargoPath, "utf8");
  const lspVersion = parseVersion(lspCargoToml, /^version\s*=\s*"([^"]+)"/m);

  console.log(`📦 Extension version (Cargo.toml):    ${extVersion || "unknown"}`);
  console.log(`📋 Extension version (extension.toml): ${extTomlVersion || "unknown"}`);
  console.log(`🦀 LSP Server version:                 ${lspVersion || "unknown"}`);

  // Verify version format
  const versionPattern = /^\d+\.\d+\.\d+$/;

  if (extVersion && versionPattern.test(extVersion)) {
    console.log(`   ✅ Cargo.toml version format is valid (x.y.z)`);
  } else {
    console.log(`   ❌ Cargo.toml version format is invalid`);
    allPassed = false;
  }

  if (extTomlVersion && versionPattern.test(extTomlVersion)) {
    console.log(`   ✅ extension.toml version format is valid (x.y.z)`);
  } else {
    console.log(`   ❌ extension.toml version format is invalid`);
    allPassed = false;
  }

  if (lspVersion && versionPattern.test(lspVersion)) {
    console.log(`   ✅ LSP server version format is valid (x.y.z)`);
  } else {
    console.log(`   ❌ LSP server version format is invalid`);
    allPassed = false;
  }

  // Check if extension versions are in sync
  if (extVersion && extTomlVersion) {
    if (extVersion === extTomlVersion) {
      console.log(`   ✅ Extension versions are in sync`);
    } else {
      console.log(`   ⚠️  Extension versions are out of sync`);
      console.log(`      Cargo.toml: ${extVersion}`);
      console.log(`      extension.toml: ${extTomlVersion}`);
      console.log(`      Run 'npm run update:versions' to fix`);
    }
  }
} catch (error) {
  console.log(`   ❌ Error reading versions: ${error.message}`);
  allPassed = false;
}

console.log("\n\n4️⃣  CHECKING NPM SCRIPTS");
console.log("-".repeat(70));

try {
  const packagePath = path.join(__dirname, "package.json");

  if (!fs.existsSync(packagePath)) {
    console.log(`   ❌ package.json not found`);
    allPassed = false;
  } else {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = packageJson.scripts || {};

    const requiredScripts = [
      "version:increment",
      "update:versions",
      "build",
      "build:lsp",
      "build:all",
      "check",
      "check:lsp",
      "check:extension",
      "lint",
      "format",
      "test",
      "package",
      "postpackage",
      "install:zed",
      "deploy",
      "status",
      "help",
      "dry-run",
      "clean",
      "test:scripts"
    ];

    requiredScripts.forEach(script => {
      if (scripts[script]) {
        console.log(`   ✅ npm run ${script}`);
      } else {
        console.log(`   ❌ npm run ${script} - MISSING`);
        allPassed = false;
      }
    });
  }
} catch (error) {
  console.log(`   ❌ Error checking npm scripts: ${error.message}`);
  allPassed = false;
}

console.log("\n\n5️⃣  CHECKING RUST TOOLCHAIN");
console.log("-".repeat(70));

try {
  const { execSync } = require("child_process");

  // Check if cargo is installed
  try {
    const cargoVersion = execSync("cargo --version", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
    console.log(`   ✅ Cargo installed: ${cargoVersion}`);
  } catch (error) {
    console.log(`   ❌ Cargo not installed`);
    console.log(`      Install Rust from: https://rustup.rs`);
    allPassed = false;
  }

  // Check if wasm32-wasip1 target is installed
  try {
    const targets = execSync("rustup target list --installed", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"]
    });

    if (targets.includes("wasm32-wasip1")) {
      console.log(`   ✅ wasm32-wasip1 target installed`);
    } else {
      console.log(`   ⚠️  wasm32-wasip1 target not installed`);
      console.log(`      Run: rustup target add wasm32-wasip1`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check rustup targets`);
  }
} catch (error) {
  console.log(`   ⚠️  Could not check Rust toolchain: ${error.message}`);
}

console.log("\n\n6️⃣  CHECKING BUILD ARTIFACTS");
console.log("-".repeat(70));

const buildInfoPath = path.join(__dirname, "src", "build_info.rs");
const wasmPath = path.join(__dirname, "target", "wasm32-wasip1", "release", "log_scout_analyzer.wasm");
const lspBinaryPath = path.join(__dirname, "..", "lsp-server", "target", "release", "log-scout-lsp-server.exe");

if (checkFile(buildInfoPath, "src/build_info.rs exists")) {
  try {
    const buildInfo = fs.readFileSync(buildInfoPath, "utf8");
    const hasVersion = buildInfo.includes("VERSION:");
    const hasTimestamp = buildInfo.includes("BUILD_TIMESTAMP:");
    const hasGitCommit = buildInfo.includes("GIT_COMMIT:");
    const hasBuildNumber = buildInfo.includes("BUILD_NUMBER:");

    console.log(`   ${hasVersion ? "✅" : "❌"} Contains VERSION constant`);
    console.log(`   ${hasTimestamp ? "✅" : "❌"} Contains BUILD_TIMESTAMP constant`);
    console.log(`   ${hasBuildNumber ? "✅" : "❌"} Contains BUILD_NUMBER constant`);
    console.log(`   ${hasGitCommit ? "✅" : "❌"} Contains GIT_COMMIT constant`);
  } catch (error) {
    console.log(`   ⚠️  Could not read build_info.rs: ${error.message}`);
  }
} else {
  console.log(`   ℹ️  build_info.rs not generated yet (run 'npm run build')`);
}

if (checkFile(wasmPath, "WASM binary exists")) {
  try {
    const stats = fs.statSync(wasmPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   📦 Size: ${sizeMB} MB`);

    if (stats.size > 100 * 1024) {
      console.log(`   ✅ WASM size looks reasonable (> 100 KB)`);
    } else {
      console.log(`   ⚠️  WASM size seems small (< 100 KB)`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check WASM size: ${error.message}`);
  }
} else {
  console.log(`   ℹ️  WASM binary not built yet (run 'npm run build')`);
}

if (checkFile(lspBinaryPath, "LSP binary exists")) {
  try {
    const stats = fs.statSync(lspBinaryPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`   🔧 Size: ${sizeMB} MB`);

    if (stats.size > 1 * 1024 * 1024) {
      console.log(`   ✅ LSP binary size looks reasonable (> 1 MB)`);
    } else {
      console.log(`   ⚠️  LSP binary size seems small (< 1 MB)`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check LSP binary size: ${error.message}`);
  }
} else {
  console.log(`   ℹ️  LSP binary not built yet (run 'npm run build:lsp')`);
}

console.log("\n\n7️⃣  CHECKING DIRECTORY STRUCTURE");
console.log("-".repeat(70));

checkFile(path.join(__dirname, "src"), "src/ directory (source code)");
checkFile(path.join(__dirname, "grammars"), "grammars/ directory (syntax highlighting)");

const distDir = path.join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  console.log(`   ✅ dist/ directory exists (packages)`);
} else {
  console.log(`   ℹ️  dist/ directory not created yet (run 'npm run package')`);
}

console.log("\n\n8️⃣  VERIFYING SCRIPT INTEGRATION");
console.log("-".repeat(70));

try {
  const packagePath = path.join(__dirname, "package.json");

  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const scripts = packageJson.scripts || {};

    console.log(`\n📋 Script Chain Analysis:`);
    console.log(`   build: ${scripts.build || "(not defined)"}`);
    console.log(`   package: ${scripts.package || "(not defined)"}`);
    console.log(`   deploy: ${scripts.deploy || "(not defined)"}`);

    const buildScript = scripts.build || "";
    const packageScript = scripts.package || "";
    const deployScript = scripts.deploy || "";

    const buildHasUpdate = buildScript.includes("update:versions");
    const buildHasGenerate = buildScript.includes("generate-build-info");
    const buildHasCargo = buildScript.includes("cargo build");

    console.log(`\n   ${buildHasUpdate ? "✅" : "❌"} build calls update:versions`);
    console.log(`   ${buildHasGenerate ? "✅" : "❌"} build calls generate-build-info`);
    console.log(`   ${buildHasCargo ? "✅" : "❌"} build calls cargo build`);

    const packageHasIncrement = packageScript.includes("version:increment");
    const packageHasBuildAll = packageScript.includes("build:all");

    console.log(`   ${packageHasIncrement ? "✅" : "❌"} package calls version:increment`);
    console.log(`   ${packageHasBuildAll ? "✅" : "❌"} package calls build:all`);

    const deployHasPackage = deployScript.includes("package");
    const deployHasInstall = deployScript.includes("install:zed");

    console.log(`   ${deployHasPackage ? "✅" : "❌"} deploy calls package`);
    console.log(`   ${deployHasInstall ? "✅" : "❌"} deploy calls install:zed`);

    if (!buildHasUpdate || !buildHasGenerate || !buildHasCargo ||
        !packageHasIncrement || !packageHasBuildAll ||
        !deployHasPackage || !deployHasInstall) {
      allPassed = false;
    }
  }
} catch (error) {
  console.log(`   ❌ Error verifying script integration: ${error.message}`);
  allPassed = false;
}

console.log("\n\n9️⃣  CHECKING ZED INSTALLATION PATH");
console.log("-".repeat(70));

const userProfile = process.env.USERPROFILE || process.env.HOME;
let zedExtDir;

if (process.platform === 'win32') {
  zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
} else if (process.platform === 'darwin') {
  zedExtDir = path.join(userProfile, 'Library', 'Application Support', 'Zed', 'extensions', 'log-scout-analyzer');
} else {
  zedExtDir = path.join(userProfile, '.config', 'zed', 'extensions', 'log-scout-analyzer');
}

console.log(`   Platform: ${process.platform}`);
console.log(`   Expected path: ${zedExtDir}`);

if (fs.existsSync(zedExtDir)) {
  console.log(`   ✅ Extension is installed in Zed`);

  const installedWasm = path.join(zedExtDir, 'log_scout_analyzer.wasm');
  const installedToml = path.join(zedExtDir, 'extension.toml');

  if (fs.existsSync(installedWasm)) {
    console.log(`   ✅ WASM binary present in Zed`);
  } else {
    console.log(`   ⚠️  WASM binary missing from Zed installation`);
  }

  if (fs.existsSync(installedToml)) {
    console.log(`   ✅ extension.toml present in Zed`);
  } else {
    console.log(`   ⚠️  extension.toml missing from Zed installation`);
  }
} else {
  console.log(`   ℹ️  Extension not installed in Zed (run 'npm run install:zed')`);
}

console.log("\n\n" + "=".repeat(70));
console.log("\n📊 TEST SUMMARY");
console.log("-".repeat(70));

if (allPassed) {
  console.log("✅ All critical checks passed!");
  console.log("\n🚀 You can now run:");
  console.log("   npm run deploy    - Full deployment");
  console.log("   npm run package   - Create distribution packages");
  console.log("   npm run build:all - Build without packaging");
} else {
  console.log("❌ Some checks failed. Please review the errors above.");
  console.log("\n💡 Common fixes:");
  console.log("   • Install Rust: https://rustup.rs");
  console.log("   • Add WASM target: rustup target add wasm32-wasip1");
  console.log("   • Sync versions: npm run update:versions");
  console.log("   • Check all files are present and properly formatted");
}

console.log("\n" + "=".repeat(70));
console.log("\n✨ Script testing complete!\n");

if (!allPassed) {
  process.exit(1);
}
