/**
 * Update package.json with dynamic version information
 * Reads LSP server version from Cargo.toml and updates activity bar titles
 */

const fs = require("fs");
const path = require("path");

function updateVersions() {
  console.log("📦 Updating version information...");
  console.log(`   Working directory: ${process.cwd()}`);
  console.log(`   Script location: ${__dirname}`);

  // Read extension version from package.json
  const packagePath = path.join(__dirname, "package.json");
  const cargoPath = path.join(__dirname, "..", "lsp-server", "Cargo.toml");

  console.log(`   Looking for package.json at: ${packagePath}`);
  console.log(`   Looking for Cargo.toml at: ${cargoPath}`);

  // Check if files exist
  if (!fs.existsSync(packagePath)) {
    throw new Error(`package.json not found at: ${packagePath}`);
  }
  if (!fs.existsSync(cargoPath)) {
    throw new Error(`Cargo.toml not found at: ${cargoPath}`);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const extVersion = packageJson.version;

  // Read LSP server version from Cargo.toml
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);

  if (!versionMatch) {
    throw new Error("Could not parse version from Cargo.toml");
  }

  const lspVersion = versionMatch[1];

  console.log(`   ✓ Extension: v${extVersion}`);
  console.log(`   ✓ LSP Server: v${lspVersion}`);

  // Update activity bar titles
  const versionString = `v${extVersion} | LSP v${lspVersion}`;

  // Update Scout Analyzer title
  const analyzerIndex =
    packageJson.contributes.viewsContainers.activitybar.findIndex(
      (c) => c.id === "scout-analyzer",
    );
  if (analyzerIndex !== -1) {
    packageJson.contributes.viewsContainers.activitybar[analyzerIndex].title =
      `Scout Analyzer (${versionString})`;
  }

  // Update Scout Toolkit title
  const toolkitIndex =
    packageJson.contributes.viewsContainers.activitybar.findIndex(
      (c) => c.id === "scout-inventor",
    );
  if (toolkitIndex !== -1) {
    packageJson.contributes.viewsContainers.activitybar[toolkitIndex].title =
      `Scout Toolkit (${versionString})`;
  }

  // Write updated package.json
  fs.writeFileSync(
    packagePath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf8",
  );

  console.log("✅ Version information updated in package.json");
  console.log(`   Activity bar: ${versionString}`);
}

// Run if called directly
if (require.main === module) {
  try {
    updateVersions();
  } catch (error) {
    console.error("❌ Failed to update versions:", error.message);
    process.exit(1);
  }
}

module.exports = { updateVersions };
