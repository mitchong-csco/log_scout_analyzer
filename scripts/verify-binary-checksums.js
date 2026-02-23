#!/usr/bin/env node
/**
 * Binary Checksum Verification Script
 *
 * Calculates and displays SHA256 checksums for LSP server binaries.
 * Can be used to verify builds, detect changes, and ensure correct binaries are deployed.
 *
 * Usage:
 *   node scripts/verify-binary-checksums.js
 *   npm run verify:checksums
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Configuration
const BINARIES = [
  {
    name: "Production LSP Server (build output)",
    path: "target/release/log-scout-lsp-server.exe",
    category: "build",
    required: false,
  },
  {
    name: "Production LSP Server (extension copy)",
    path: "vscode-extension/bin/log-scout-lsp-server.exe",
    category: "extension",
    required: true,
  },
  {
    name: "Production LSP Server (Windows platform)",
    path: "vscode-extension/bin/log-scout-lsp-server-win.exe",
    category: "extension",
    required: false,
  },
  {
    name: "Production LSP Server (legacy server location)",
    path: "vscode-extension/server/log-scout-lsp-server.exe",
    category: "legacy",
    required: false,
  },
  {
    name: "Experimental Modular LSP Server",
    path: "target/release/log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe",
    category: "experimental",
    required: false,
  },
];

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

/**
 * Calculate SHA256 hash of a file
 */
function calculateSHA256(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  } catch (e) {
    return null;
  }
}

/**
 * Calculate MD5 hash of a file
 */
function calculateMD5(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("md5");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
  } catch (e) {
    return null;
  }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Get binary information
 */
function getBinaryInfo(config) {
  const fullPath = path.resolve(config.path);

  if (!fs.existsSync(fullPath)) {
    return {
      exists: false,
      path: fullPath,
      relativePath: config.path,
      name: config.name,
      category: config.category,
      required: config.required,
    };
  }

  const stats = fs.statSync(fullPath);
  const sha256 = calculateSHA256(fullPath);
  const md5 = calculateMD5(fullPath);

  return {
    exists: true,
    path: fullPath,
    relativePath: config.path,
    name: config.name,
    category: config.category,
    required: config.required,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    modified: stats.mtime,
    modifiedFormatted: stats.mtime.toISOString().replace("T", " ").substring(0, 19),
    sha256: sha256,
    md5: md5,
  };
}

/**
 * Print header
 */
function printHeader() {
  console.log();
  console.log(
    `${colors.bright}${colors.cyan}${"═".repeat(80)}${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}   🔐 LSP SERVER BINARY CHECKSUM VERIFICATION${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}${"═".repeat(80)}${colors.reset}`
  );
  console.log();
}

/**
 * Print binary info
 */
function printBinaryInfo(info) {
  const categoryColors = {
    build: colors.blue,
    extension: colors.green,
    legacy: colors.gray,
    experimental: colors.yellow,
  };

  const categoryColor = categoryColors[info.category] || colors.gray;

  console.log(
    `${colors.bright}${categoryColor}▪${colors.reset} ${colors.bright}${info.name}${colors.reset}`
  );
  console.log(`  ${colors.dim}Path: ${info.relativePath}${colors.reset}`);

  if (!info.exists) {
    if (info.required) {
      console.log(`  ${colors.red}Status: ❌ MISSING (Required)${colors.reset}`);
    } else {
      console.log(`  ${colors.gray}Status: Not found (Optional)${colors.reset}`);
    }
    console.log();
    return;
  }

  console.log(`  ${colors.green}Status: ✅ Found${colors.reset}`);
  console.log(`  Size:   ${info.sizeFormatted} (${info.size.toLocaleString()} bytes)`);
  console.log(`  Modified: ${info.modifiedFormatted}`);
  console.log();
  console.log(`  ${colors.bright}SHA256:${colors.reset}`);
  console.log(`    ${colors.cyan}${info.sha256}${colors.reset}`);
  console.log();
  console.log(`  ${colors.bright}MD5:${colors.reset}`);
  console.log(`    ${colors.cyan}${info.md5}${colors.reset}`);
  console.log();
}

/**
 * Compare binaries
 */
function compareBinaries(binaries) {
  const existing = binaries.filter((b) => b.exists);

  if (existing.length < 2) {
    return;
  }

  console.log(`${colors.bright}${colors.cyan}📊 Binary Comparison${colors.reset}`);
  console.log();

  // Group by hash to find duplicates
  const hashGroups = {};
  existing.forEach((bin) => {
    if (!hashGroups[bin.sha256]) {
      hashGroups[bin.sha256] = [];
    }
    hashGroups[bin.sha256].push(bin);
  });

  // Report duplicates
  let foundDuplicates = false;
  Object.keys(hashGroups).forEach((hash) => {
    const group = hashGroups[hash];
    if (group.length > 1) {
      foundDuplicates = true;
      console.log(
        `${colors.yellow}⚠️  IDENTICAL BINARIES (SHA256: ${hash.substring(0, 16)}...)${colors.reset}`
      );
      group.forEach((bin) => {
        console.log(`   - ${bin.name}`);
        console.log(`     ${colors.dim}${bin.relativePath}${colors.reset}`);
      });
      console.log();
    }
  });

  if (!foundDuplicates) {
    console.log(`${colors.green}✅ All binaries are unique${colors.reset}`);
    console.log();
  }

  // Compare production binaries specifically
  const prodBuild = existing.find((b) => b.relativePath === "target/release/log-scout-lsp-server.exe");
  const prodExtension = existing.find((b) => b.relativePath === "vscode-extension/bin/log-scout-lsp-server.exe");

  if (prodBuild && prodExtension) {
    console.log(`${colors.bright}Production Binary Sync Check:${colors.reset}`);
    if (prodBuild.sha256 === prodExtension.sha256) {
      console.log(`${colors.green}✅ Build output matches extension binary${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️  Build output differs from extension binary${colors.reset}`);
      console.log(`   Build:     ${prodBuild.sha256.substring(0, 16)}...`);
      console.log(`   Extension: ${prodExtension.sha256.substring(0, 16)}...`);
      console.log();
      console.log(`${colors.yellow}   Action: Run 'npm run build:lsp' to sync${colors.reset}`);
    }
    console.log();
  }
}

/**
 * Generate checksum file
 */
function generateChecksumFile(binaries) {
  const checksumFile = path.resolve(".log-scout/binary-checksums.txt");
  const checksumDir = path.dirname(checksumFile);

  // Ensure directory exists
  if (!fs.existsSync(checksumDir)) {
    fs.mkdirSync(checksumDir, { recursive: true });
  }

  const lines = [];
  lines.push("# LSP Server Binary Checksums");
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push("");

  binaries.filter((b) => b.exists).forEach((bin) => {
    lines.push(`# ${bin.name}`);
    lines.push(`# Path: ${bin.relativePath}`);
    lines.push(`# Size: ${bin.sizeFormatted}`);
    lines.push(`# Modified: ${bin.modifiedFormatted}`);
    lines.push(`SHA256: ${bin.sha256}`);
    lines.push(`MD5:    ${bin.md5}`);
    lines.push("");
  });

  fs.writeFileSync(checksumFile, lines.join("\n"));

  return checksumFile;
}

/**
 * Main function
 */
function main() {
  printHeader();

  // Get info for all binaries
  const binaries = BINARIES.map(getBinaryInfo);

  // Group by category
  const categories = {
    build: binaries.filter((b) => b.category === "build"),
    extension: binaries.filter((b) => b.category === "extension"),
    legacy: binaries.filter((b) => b.category === "legacy"),
    experimental: binaries.filter((b) => b.category === "experimental"),
  };

  // Print each category
  const categoryTitles = {
    build: "📦 Build Output",
    extension: "📁 Extension Binaries (Deployed)",
    legacy: "🗄️  Legacy Locations",
    experimental: "🧪 Experimental Binaries",
  };

  Object.keys(categories).forEach((cat) => {
    if (categories[cat].length > 0) {
      console.log(`${colors.bright}${categoryTitles[cat]}${colors.reset}`);
      console.log();
      categories[cat].forEach((bin) => printBinaryInfo(bin));
    }
  });

  // Compare binaries
  compareBinaries(binaries);

  // Check for missing required binaries
  const missing = binaries.filter((b) => !b.exists && b.required);
  if (missing.length > 0) {
    console.log(`${colors.red}${colors.bright}❌ Missing Required Binaries:${colors.reset}`);
    missing.forEach((bin) => {
      console.log(`   - ${bin.name}`);
      console.log(`     ${colors.dim}${bin.relativePath}${colors.reset}`);
    });
    console.log();
    console.log(`${colors.red}Action: Run 'npm run build:lsp' to build missing binaries${colors.reset}`);
    console.log();
  }

  // Generate checksum file
  try {
    const checksumFile = generateChecksumFile(binaries);
    console.log(
      `${colors.gray}📝 Checksums saved to: ${checksumFile}${colors.reset}`
    );
  } catch (e) {
    console.error(
      `${colors.red}Error saving checksums: ${e.message}${colors.reset}`
    );
  }

  console.log();
  console.log(`${colors.dim}${"─".repeat(80)}${colors.reset}`);
  console.log();

  // Exit with error code if required binaries are missing
  if (missing.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { calculateSHA256, calculateMD5, getBinaryInfo };
