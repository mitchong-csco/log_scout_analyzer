#!/usr/bin/env node
/**
 * Binary Size Tracking Script
 *
 * Tracks and compares the sizes of:
 * 1. Production LSP Server (lsp-server/)
 * 2. Experimental Modular LSP Server (crates/lsp-server-PLACEHOLDER-DO-NOT-USE/)
 *
 * This helps monitor:
 * - Build output validation (detect wrong binary built)
 * - Optimization progress
 * - Binary bloat detection
 * - Migration readiness (when modular server approaches production size)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Configuration
const CONFIG = {
  production: {
    name: "Production LSP Server",
    binaryPath: "target/release/log-scout-lsp-server.exe",
    manifestPath: "lsp-server/Cargo.toml",
    expectedMinSize: 7 * 1024 * 1024, // 7 MB minimum
    expectedMaxSize: 12 * 1024 * 1024, // 12 MB maximum
    status: "PRODUCTION",
    emoji: "✅",
  },
  experimental: {
    name: "Experimental Modular LSP Server",
    binaryPath: "target/release/log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe",
    manifestPath: "crates/lsp-server-PLACEHOLDER-DO-NOT-USE/Cargo.toml",
    expectedMinSize: 0, // No minimum (may not be built)
    expectedMaxSize: 15 * 1024 * 1024, // 15 MB maximum
    status: "EXPERIMENTAL",
    emoji: "🧪",
  },
};

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

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
 * Calculate SHA256 hash of a file
 */
function calculateFileHash(filePath) {
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
 * Get binary information
 */
function getBinaryInfo(config) {
  const fullPath = path.resolve(config.binaryPath);

  if (!fs.existsSync(fullPath)) {
    return {
      exists: false,
      path: fullPath,
      size: 0,
      sizeFormatted: "Not built",
      modified: null,
      hash: null,
      hashShort: null,
      status: "NOT_FOUND",
      config: config,
    };
  }

  const stats = fs.statSync(fullPath);
  const size = stats.size;
  const hash = calculateFileHash(fullPath);
  const hashShort = hash ? hash.substring(0, 12) : null;

  // Determine status
  let status = "OK";
  let statusColor = colors.green;

  if (size < config.expectedMinSize) {
    status = "TOO_SMALL";
    statusColor = colors.red;
  } else if (size > config.expectedMaxSize) {
    status = "TOO_LARGE";
    statusColor = colors.yellow;
  }

  return {
    exists: true,
    path: fullPath,
    size: size,
    sizeFormatted: formatBytes(size),
    sizeMB: (size / 1024 / 1024).toFixed(2),
    modified: stats.mtime,
    modifiedFormatted: stats.mtime
      .toISOString()
      .replace("T", " ")
      .substring(0, 19),
    hash: hash,
    hashShort: hashShort,
    status: status,
    statusColor: statusColor,
    config: config,
  };
}

/**
 * Get version from Cargo.toml
 */
function getVersion(manifestPath) {
  const fullPath = path.resolve(manifestPath);

  if (!fs.existsSync(fullPath)) {
    return "unknown";
  }

  const content = fs.readFileSync(fullPath, "utf8");
  const match = content.match(/version\s*=\s*"([^"]+)"/);
  return match ? match[1] : "unknown";
}

/**
 * Print a separator line
 */
function printSeparator() {
  console.log("─".repeat(80));
}

/**
 * Print a header
 */
function printHeader(text) {
  console.log(`${colors.bright}${colors.cyan}${text}${colors.reset}`);
}

/**
 * Print binary report
 */
function printBinaryReport(info) {
  const { config } = info;

  console.log(
    `\n${config.emoji}  ${colors.bright}${config.name}${colors.reset}`,
  );
  console.log(`   Status: ${colors.gray}${config.status}${colors.reset}`);
  console.log(
    `   Version: ${colors.gray}${getVersion(config.manifestPath)}${colors.reset}`,
  );

  if (!info.exists) {
    console.log(`   Binary: ${colors.yellow}Not built${colors.reset}`);
    console.log(
      `   Expected: ${colors.gray}${config.binaryPath}${colors.reset}`,
    );
    return;
  }

  console.log(
    `   Binary: ${colors.gray}${path.basename(info.path)}${colors.reset}`,
  );
  console.log(
    `   Size: ${info.statusColor}${info.sizeFormatted} (${info.sizeMB} MB)${colors.reset}`,
  );
  console.log(
    `   Modified: ${colors.gray}${info.modifiedFormatted}${colors.reset}`,
  );
  console.log(`   Hash: ${colors.gray}${info.hashShort}...${colors.reset}`);

  // Show status warnings
  if (info.status === "TOO_SMALL") {
    console.log(
      `   ${colors.red}⚠️  WARNING: Binary too small! Expected min ${formatBytes(config.expectedMinSize)}${colors.reset}`,
    );
    console.log(
      `   ${colors.red}   This likely means the wrong package was built (stub/placeholder).${colors.reset}`,
    );
  } else if (info.status === "TOO_LARGE") {
    console.log(
      `   ${colors.yellow}⚠️  WARNING: Binary larger than expected (max ${formatBytes(config.expectedMaxSize)})${colors.reset}`,
    );
    console.log(
      `   ${colors.yellow}   This may indicate binary bloat or debug symbols included.${colors.reset}`,
    );
  } else {
    console.log(
      `   ${colors.green}✅ Size within expected range${colors.reset}`,
    );
  }
}

/**
 * Print comparison
 */
function printComparison(prodInfo, expInfo) {
  console.log(`\n${colors.bright}${colors.cyan}📊 Comparison${colors.reset}`);

  if (!prodInfo.exists && !expInfo.exists) {
    console.log(
      `   ${colors.yellow}Neither binary has been built yet.${colors.reset}`,
    );
    return;
  }

  if (!prodInfo.exists) {
    console.log(`   ${colors.red}❌ Production binary missing!${colors.reset}`);
    return;
  }

  if (!expInfo.exists) {
    console.log(
      `   ${colors.gray}Experimental binary not built (this is normal).${colors.reset}`,
    );
    return;
  }

  const diff = expInfo.size - prodInfo.size;
  const diffPercent = ((diff / prodInfo.size) * 100).toFixed(1);
  const diffFormatted = formatBytes(Math.abs(diff));

  console.log(
    `   Production:   ${prodInfo.sizeFormatted} (${prodInfo.hashShort}...)`,
  );
  console.log(
    `   Experimental: ${expInfo.sizeFormatted} (${expInfo.hashShort}...)`,
  );

  if (diff > 0) {
    console.log(
      `   Difference:   ${colors.yellow}+${diffFormatted} (+${diffPercent}% larger)${colors.reset}`,
    );
  } else if (diff < 0) {
    console.log(
      `   Difference:   ${colors.green}-${diffFormatted} (${Math.abs(diffPercent)}% smaller)${colors.reset}`,
    );
  } else {
    console.log(`   Difference:   ${colors.gray}Same size${colors.reset}`);
  }

  // Hash comparison
  if (prodInfo.hash && expInfo.hash) {
    if (prodInfo.hash === expInfo.hash) {
      console.log(
        `   Hash Match:   ${colors.yellow}⚠️  IDENTICAL - Same binary built twice!${colors.reset}`,
      );
    } else {
      console.log(
        `   Hash Match:   ${colors.gray}Different binaries (expected)${colors.reset}`,
      );
    }
  }

  // Readiness assessment
  console.log();
  if (Math.abs(diffPercent) < 20) {
    console.log(
      `   ${colors.green}✅ Sizes comparable - modular server could be nearing completion${colors.reset}`,
    );
  } else if (expInfo.size < prodInfo.size * 0.5) {
    console.log(
      `   ${colors.yellow}⚠️  Experimental server much smaller - likely incomplete${colors.reset}`,
    );
  }
}

/**
 * Save tracking data to JSON
 */
function saveTrackingData(prodInfo, expInfo) {
  const trackingFile = path.resolve(".log-scout/binary-size-tracking.json");
  const trackingDir = path.dirname(trackingFile);

  // Ensure directory exists
  if (!fs.existsSync(trackingDir)) {
    fs.mkdirSync(trackingDir, { recursive: true });
  }

  // Load existing data
  let history = [];
  if (fs.existsSync(trackingFile)) {
    try {
      history = JSON.parse(fs.readFileSync(trackingFile, "utf8"));
    } catch (e) {
      console.error(
        `${colors.yellow}Warning: Could not parse existing tracking file${colors.reset}`,
      );
    }
  }

  // Add new entry
  const entry = {
    timestamp: new Date().toISOString(),
    production: {
      exists: prodInfo.exists,
      size: prodInfo.size,
      hash: prodInfo.hash,
      version: getVersion(CONFIG.production.manifestPath),
      modified: prodInfo.modified ? prodInfo.modified.toISOString() : null,
    },
    experimental: {
      exists: expInfo.exists,
      size: expInfo.size,
      hash: expInfo.hash,
      version: getVersion(CONFIG.experimental.manifestPath),
      modified: expInfo.modified ? expInfo.modified.toISOString() : null,
    },
  };

  history.push(entry);

  // Keep only last 100 entries
  if (history.length > 100) {
    history = history.slice(-100);
  }

  // Save
  fs.writeFileSync(trackingFile, JSON.stringify(history, null, 2));

  return trackingFile;
}

/**
 * Print build instructions
 */
function printBuildInstructions() {
  console.log(
    `\n${colors.bright}${colors.cyan}🔨 Build Commands${colors.reset}`,
  );
  console.log();
  console.log(`${colors.bright}Production Server (Use This):${colors.reset}`);
  console.log(`  ${colors.green}npm run build:lsp${colors.reset}`);
  console.log(`  ${colors.gray}or${colors.reset}`);
  console.log(
    `  ${colors.green}cargo build --release --manifest-path lsp-server/Cargo.toml${colors.reset}`,
  );
  console.log();
  console.log(
    `${colors.bright}Experimental Server (For Testing):${colors.reset}`,
  );
  console.log(
    `  ${colors.yellow}cargo build --release --manifest-path crates/lsp-server-PLACEHOLDER-DO-NOT-USE/Cargo.toml${colors.reset}`,
  );
  console.log(
    `  ${colors.gray}Note: This will build 'log-scout-lsp-server-MODULAR-EXPERIMENTAL.exe'${colors.reset}`,
  );
}

/**
 * Main function
 */
function main() {
  console.log();
  printHeader(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  printHeader("   📦 LSP SERVER BINARY SIZE TRACKING");
  printHeader(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  // Get binary info
  const prodInfo = getBinaryInfo(CONFIG.production);
  const expInfo = getBinaryInfo(CONFIG.experimental);

  // Print reports
  printBinaryReport(prodInfo);
  printBinaryReport(expInfo);

  // Print comparison
  printComparison(prodInfo, expInfo);

  // Save tracking data
  try {
    const trackingFile = saveTrackingData(prodInfo, expInfo);
    console.log(
      `\n${colors.gray}📝 Tracking data saved to: ${trackingFile}${colors.reset}`,
    );
  } catch (e) {
    console.error(
      `\n${colors.red}Error saving tracking data: ${e.message}${colors.reset}`,
    );
  }

  // Print build instructions if production binary doesn't exist
  if (!prodInfo.exists) {
    printBuildInstructions();
  }

  console.log();
  printSeparator();

  // Exit with error code if production binary is wrong size
  if (prodInfo.exists && prodInfo.status === "TOO_SMALL") {
    console.error(
      `\n${colors.red}❌ CRITICAL: Production binary is too small! Wrong package was built.${colors.reset}`,
    );
    console.error(`${colors.red}   Run: npm run build:lsp${colors.reset}\n`);
    process.exit(1);
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { getBinaryInfo, formatBytes, getVersion };
