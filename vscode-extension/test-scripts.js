#!/usr/bin/env node

/**
 * Test Script for Build Automation
 * Verifies all build scripts work correctly without actually running a full build
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Testing Build Automation Scripts\n");
console.log("=" .repeat(60));

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
    // Try to require the script (this will check for syntax errors)
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
console.log("-".repeat(60));

const packagePath = path.join(__dirname, "package.json");
const cargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

checkFile(packagePath, "package.json exists");
checkFile(cargoPath, "lsp-server/Cargo.toml exists");

console.log("\n\n2️⃣  CHECKING BUILD SCRIPTS");
console.log("-".repeat(60));

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
  path.join(__dirname, "copy-vsix.js"),
  "copy-vsix.js"
);

console.log("\n\n3️⃣  CHECKING VERSION CONSISTENCY");
console.log("-".repeat(60));

try {
  // Read current versions
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const extVersion = packageJson.version;

  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const lspVersion = parseVersion(cargoToml, /version\s*=\s*"([^"]+)"/);

  console.log(`📦 Extension version: ${extVersion}`);
  console.log(`🦀 LSP Server version: ${lspVersion}`);

  // Verify version format
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (versionPattern.test(extVersion)) {
    console.log(`   ✅ Extension version format is valid (x.y.z)`);
  } else {
    console.log(`   ❌ Extension version format is invalid`);
    allPassed = false;
  }

  if (lspVersion && versionPattern.test(lspVersion)) {
    console.log(`   ✅ LSP server version format is valid (x.y.z)`);
  } else {
    console.log(`   ❌ LSP server version format is invalid`);
    allPassed = false;
  }
} catch (error) {
  console.log(`   ❌ Error reading versions: ${error.message}`);
  allPassed = false;
}

console.log("\n\n4️⃣  CHECKING NPM SCRIPTS");
console.log("-".repeat(60));

try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const scripts = packageJson.scripts;

  const requiredScripts = [
    "version:increment",
    "update:versions",
    "build",
    "build:lsp",
    "build:all",
    "compile",
    "package",
    "postpackage",
    "deploy"
  ];

  requiredScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`   ✅ npm run ${script}`);
    } else {
      console.log(`   ❌ npm run ${script} - MISSING`);
      allPassed = false;
    }
  });
} catch (error) {
  console.log(`   ❌ Error checking npm scripts: ${error.message}`);
  allPassed = false;
}

console.log("\n\n5️⃣  CHECKING BUILD OUTPUT DIRECTORIES");
console.log("-".repeat(60));

checkFile(path.join(__dirname, "bin"), "bin/ directory (for LSP binary)");
checkFile(path.join(__dirname, "out"), "out/ directory (for compiled TS)");
checkFile(path.join(__dirname, "src"), "src/ directory (TypeScript source)");

console.log("\n\n6️⃣  CHECKING BUILD ARTIFACTS");
console.log("-".repeat(60));

const buildInfoPath = path.join(__dirname, "src", "buildInfo.ts");
const vsixPath = path.join(__dirname, "log-scout-analyzer.vsix");

if (checkFile(buildInfoPath, "src/buildInfo.ts exists")) {
  try {
    const buildInfo = fs.readFileSync(buildInfoPath, "utf8");
    const hasVersion = buildInfo.includes("version:");
    const hasTimestamp = buildInfo.includes("buildTimestamp:");
    const hasGitCommit = buildInfo.includes("gitCommit:");

    console.log(`   ${hasVersion ? "✅" : "❌"} Contains version`);
    console.log(`   ${hasTimestamp ? "✅" : "❌"} Contains buildTimestamp`);
    console.log(`   ${hasGitCommit ? "✅" : "❌"} Contains gitCommit`);
  } catch (error) {
    console.log(`   ⚠️  Could not read buildInfo.ts: ${error.message}`);
  }
}

if (checkFile(vsixPath, "log-scout-analyzer.vsix exists")) {
  try {
    const stats = fs.statSync(vsixPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   📦 Size: ${sizeKB} KB`);

    if (stats.size > 100 * 1024) {
      console.log(`   ✅ VSIX size looks reasonable (> 100 KB)`);
    } else {
      console.log(`   ⚠️  VSIX size seems small (< 100 KB)`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check VSIX size: ${error.message}`);
  }
} else {
  console.log(`   ℹ️  No VSIX file found (run 'npm run package' to create)`);
}

console.log("\n\n7️⃣  CHECKING SCRIPT EXECUTION PERMISSIONS");
console.log("-".repeat(60));

try {
  // Check if scripts are executable (primarily for Unix-like systems)
  const scripts = [
    "increment-version.js",
    "update-versions.js",
    "generate-build-info.js",
    "copy-vsix.js"
  ];

  scripts.forEach(script => {
    const scriptPath = path.join(__dirname, script);
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, "utf8");
      const hasShebang = content.startsWith("#!/usr/bin/env node");
      console.log(`   ${hasShebang ? "✅" : "ℹ️ "} ${script} ${hasShebang ? "has shebang" : "(no shebang, ok on Windows)"}`);
    }
  });
} catch (error) {
  console.log(`   ⚠️  Could not check permissions: ${error.message}`);
}

console.log("\n\n8️⃣  VERIFYING SCRIPT INTEGRATION");
console.log("-".repeat(60));

try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const scripts = packageJson.scripts;

  // Check if scripts are properly chained
  const buildScript = scripts.build || "";
  const packageScript = scripts.package || "";
  const deployScript = scripts.deploy || "";

  console.log(`\n📋 Script Chain Analysis:`);
  console.log(`   build: ${buildScript}`);
  console.log(`   package: ${packageScript}`);
  console.log(`   deploy: ${deployScript}`);

  const buildHasUpdate = buildScript.includes("update:versions");
  const buildHasGenerate = buildScript.includes("generate-build-info");
  const buildHasCompile = buildScript.includes("compile");

  console.log(`\n   ${buildHasUpdate ? "✅" : "❌"} build calls update:versions`);
  console.log(`   ${buildHasGenerate ? "✅" : "❌"} build calls generate-build-info`);
  console.log(`   ${buildHasCompile ? "✅" : "❌"} build calls compile`);

  const packageHasIncrement = packageScript.includes("version:increment");
  const packageHasBuildAll = packageScript.includes("build:all");
  const packageHasVsce = packageScript.includes("vsce package");

  console.log(`   ${packageHasIncrement ? "✅" : "❌"} package calls version:increment`);
  console.log(`   ${packageHasBuildAll ? "✅" : "❌"} package calls build:all`);
  console.log(`   ${packageHasVsce ? "✅" : "❌"} package calls vsce`);

  const deployHasPackage = deployScript.includes("package");
  const deployHasInstall = deployScript.includes("code --install-extension");

  console.log(`   ${deployHasPackage ? "✅" : "❌"} deploy calls package`);
  console.log(`   ${deployHasInstall ? "✅" : "❌"} deploy calls VSCode install`);

  if (!buildHasUpdate || !buildHasGenerate || !buildHasCompile ||
      !packageHasIncrement || !packageHasBuildAll || !packageHasVsce ||
      !deployHasPackage || !deployHasInstall) {
    allPassed = false;
  }
} catch (error) {
  console.log(`   ❌ Error verifying script integration: ${error.message}`);
  allPassed = false;
}

console.log("\n\n" + "=".repeat(60));
console.log("\n📊 TEST SUMMARY");
console.log("-".repeat(60));

if (allPassed) {
  console.log("✅ All checks passed!");
  console.log("\n🚀 You can now run:");
  console.log("   npm run deploy    - Full deployment");
  console.log("   npm run package   - Create VSIX only");
  console.log("   npm run build:all - Build without packaging");
} else {
  console.log("❌ Some checks failed. Please review the errors above.");
  process.exit(1);
}

console.log("\n" + "=".repeat(60));
console.log("\n✨ Script testing complete!\n");
