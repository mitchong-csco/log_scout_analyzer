#!/usr/bin/env node

/**
 * Validate Build Script
 *
 * Verifies that the files being packaged match the expected build manifest.
 * This ensures that:
 * 1. The build is clean (no uncommitted changes in critical files)
 * 2. The dist/ files match the src/ files
 * 3. The version in buildInfo.ts matches package.json
 *
 * Run this before packaging to catch issues early.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";

function calculateHash(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function validateBuild() {
  console.log(`${BLUE}🔍 Validating build...${RESET}\n`);

  let hasErrors = false;
  let hasWarnings = false;

  // ===== CHECK 1: Build manifest exists =====
  const manifestPath = path.join(__dirname, "build-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`${RED}❌ Build manifest not found!${RESET}`);
    console.error(`   Expected: ${manifestPath}`);
    console.error(`   Run: npm run version:increment\n`);
    return false;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`${GREEN}✓${RESET} Build manifest found`);
  console.log(`   Version: ${manifest.version}`);
  console.log(`   Build: ${manifest.buildNumber}`);
  console.log(`   Git: ${manifest.gitCommit}\n`);

  // ===== CHECK 2: package.json version matches manifest =====
  const packagePath = path.join(__dirname, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  if (packageJson.version !== manifest.version) {
    console.error(`${RED}❌ Version mismatch!${RESET}`);
    console.error(`   package.json: ${packageJson.version}`);
    console.error(`   manifest:     ${manifest.version}`);
    console.error(`   Run: npm run version:increment\n`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓${RESET} Version matches: ${packageJson.version}\n`);
  }

  // ===== CHECK 3: buildInfo.ts exists and matches =====
  const buildInfoPath = path.join(__dirname, "src", "buildInfo.ts");
  if (!fs.existsSync(buildInfoPath)) {
    console.error(`${RED}❌ buildInfo.ts not found!${RESET}`);
    console.error(`   Expected: ${buildInfoPath}`);
    console.error(`   Run: npm run version:increment\n`);
    hasErrors = true;
  } else {
    const buildInfoContent = fs.readFileSync(buildInfoPath, "utf8");

    // Check version in buildInfo.ts
    const versionMatch = buildInfoContent.match(/version:\s*"([^"]+)"/);
    if (!versionMatch || versionMatch[1] !== manifest.version) {
      console.error(`${RED}❌ buildInfo.ts version mismatch!${RESET}`);
      console.error(`   Expected: ${manifest.version}`);
      console.error(`   Found:    ${versionMatch ? versionMatch[1] : "unknown"}`);
      console.error(`   Run: npm run version:increment\n`);
      hasErrors = true;
    } else {
      console.log(`${GREEN}✓${RESET} buildInfo.ts version matches\n`);
    }
  }

  // ===== CHECK 4: Source file hashes match manifest =====
  console.log(`${BLUE}📋 Checking source file integrity...${RESET}`);

  const filesToCheck = [
    { path: path.join(__dirname, "src", "extension.ts"), name: "extension.ts" },
    { path: path.join(__dirname, "src", "bundleTreeProvider.ts"), name: "bundleTreeProvider.ts" },
    { path: buildInfoPath, name: "buildInfo.ts" },
  ];

  for (const file of filesToCheck) {
    const currentHash = calculateHash(file.path);
    const expectedHash = manifest.fileHashes[file.name];

    if (!currentHash) {
      console.error(`${RED}❌ ${file.name} not found!${RESET}`);
      hasErrors = true;
      continue;
    }

    if (!expectedHash) {
      console.warn(`${YELLOW}⚠️  ${file.name} not in manifest${RESET}`);
      hasWarnings = true;
      continue;
    }

    const currentShort = currentHash.substring(0, 16);
    const expectedShort = expectedHash;

    if (currentShort !== expectedShort) {
      console.error(`${RED}❌ ${file.name} has been modified!${RESET}`);
      console.error(`   Expected: ${expectedShort}...`);
      console.error(`   Current:  ${currentShort}...`);
      console.error(`   Action: Commit changes and run npm run version:increment\n`);
      hasErrors = true;
    } else {
      console.log(`${GREEN}✓${RESET} ${file.name}: ${currentShort}...`);
    }
  }
  console.log("");

  // ===== CHECK 5: dist/ directory exists and is recent =====
  const distPath = path.join(__dirname, "dist", "extension.js");
  if (!fs.existsSync(distPath)) {
    console.error(`${RED}❌ Compiled output not found!${RESET}`);
    console.error(`   Expected: ${distPath}`);
    console.error(`   Run: npm run compile && npm run package-extension\n`);
    hasErrors = true;
  } else {
    const distStats = fs.statSync(distPath);
    const manifestTime = new Date(manifest.buildTimestamp);
    const distTime = new Date(distStats.mtime);

    if (distTime < manifestTime) {
      console.warn(`${YELLOW}⚠️  dist/extension.js is older than build manifest${RESET}`);
      console.warn(`   Manifest: ${manifest.buildTimestamp}`);
      console.warn(`   Compiled: ${distTime.toISOString()}`);
      console.warn(`   Run: npm run package-extension\n`);
      hasWarnings = true;
    } else {
      console.log(`${GREEN}✓${RESET} dist/extension.js is up to date`);
      console.log(`   Compiled: ${distTime.toISOString()}\n`);
    }
  }

  // ===== CHECK 6: Critical files compiled =====
  const outPath = path.join(__dirname, "out", "extension.js");
  if (!fs.existsSync(outPath)) {
    console.warn(`${YELLOW}⚠️  TypeScript output not found${RESET}`);
    console.warn(`   Expected: ${outPath}`);
    console.warn(`   Run: npm run compile\n`);
    hasWarnings = true;
  } else {
    console.log(`${GREEN}✓${RESET} TypeScript compiled\n`);
  }

  // ===== CHECK 7: LSP binary exists =====
  const lspPath = path.join(__dirname, "bin", "log-scout-lsp-server.exe");
  if (!fs.existsSync(lspPath)) {
    console.warn(`${YELLOW}⚠️  LSP binary not found${RESET}`);
    console.warn(`   Expected: ${lspPath}`);
    console.warn(`   This is OK if you're testing extension-only changes\n`);
    hasWarnings = true;
  } else {
    const lspStats = fs.statSync(lspPath);
    const lspSizeMB = Math.round(lspStats.size / 1024 / 1024);

    if (lspSizeMB < 5) {
      console.error(`${RED}❌ LSP binary suspiciously small: ${lspSizeMB}MB${RESET}`);
      console.error(`   Expected: >5MB`);
      console.error(`   Run: npm run build:lsp\n`);
      hasErrors = true;
    } else {
      console.log(`${GREEN}✓${RESET} LSP binary exists (${lspSizeMB}MB)\n`);
    }
  }

  // ===== SUMMARY =====
  console.log(`${"=".repeat(60)}`);
  if (hasErrors) {
    console.log(`${RED}❌ BUILD VALIDATION FAILED${RESET}`);
    console.log(`   Fix the errors above before packaging.`);
    console.log(`${"=".repeat(60)}\n`);
    return false;
  } else if (hasWarnings) {
    console.log(`${YELLOW}⚠️  BUILD VALIDATION PASSED WITH WARNINGS${RESET}`);
    console.log(`   Review warnings above. Continue at your own risk.`);
    console.log(`${"=".repeat(60)}\n`);
    return true;
  } else {
    console.log(`${GREEN}✅ BUILD VALIDATION PASSED${RESET}`);
    console.log(`   Ready to package!`);
    console.log(`${"=".repeat(60)}\n`);
    return true;
  }
}

// Run validation
try {
  const valid = validateBuild();
  process.exit(valid ? 0 : 1);
} catch (error) {
  console.error(`${RED}❌ Validation error: ${error.message}${RESET}`);
  console.error(error.stack);
  process.exit(1);
}
