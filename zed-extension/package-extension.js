#!/usr/bin/env node

/**
 * Package Extension Script for Zed Extension
 * Creates distribution packages (.tar.gz and .zip) for sharing
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("\n📦 Log Scout Analyzer (Zed) - Package Creator\n");
console.log("=".repeat(70));

try {
  // Get version from Cargo.toml
  const cargoPath = path.join(__dirname, "Cargo.toml");
  const cargoToml = fs.readFileSync(cargoPath, "utf8");
  const versionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);

  if (!versionMatch) {
    throw new Error("Could not parse version from Cargo.toml");
  }

  const version = versionMatch[1];
  console.log(`📋 Extension version: ${version}\n`);

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
  console.log(`✅ WASM binary found (${wasmSizeMB} MB)\n`);

  // Create package directory structure
  const packageName = `log-scout-analyzer-zed-${version}`;
  const distDir = path.join(__dirname, "dist");
  const packageDir = path.join(distDir, packageName);

  console.log("🗂️  Creating package directory structure...");

  // Remove old dist directory if it exists
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
    console.log("   ✓ Cleaned old dist/ directory");
  }

  // Create new package directory
  fs.mkdirSync(packageDir, { recursive: true });
  console.log(`   ✓ Created: ${packageDir}\n`);

  // Copy WASM binary
  console.log("📋 Copying extension files...");
  fs.copyFileSync(wasmPath, path.join(packageDir, "log_scout_analyzer.wasm"));
  console.log("   ✓ log_scout_analyzer.wasm");

  // Copy extension.toml
  const extensionTomlPath = path.join(__dirname, "extension.toml");
  if (fs.existsSync(extensionTomlPath)) {
    fs.copyFileSync(extensionTomlPath, path.join(packageDir, "extension.toml"));
    console.log("   ✓ extension.toml");
  } else {
    console.warn("   ⚠️  extension.toml not found");
  }

  // Copy grammars directory if it exists
  const grammarsDir = path.join(__dirname, "grammars");
  if (fs.existsSync(grammarsDir)) {
    fs.cpSync(grammarsDir, path.join(packageDir, "grammars"), {
      recursive: true,
    });
    console.log("   ✓ grammars/ directory");
  } else {
    console.warn("   ℹ️  grammars/ directory not found (optional)");
  }

  // Copy LICENSE if it exists
  const licensePath = path.join(__dirname, "..", "LICENSE");
  if (fs.existsSync(licensePath)) {
    fs.copyFileSync(licensePath, path.join(packageDir, "LICENSE"));
    console.log("   ✓ LICENSE");
  }

  // Create README for the package
  console.log("\n📝 Generating package README...");

  const buildDate = new Date().toISOString();
  let gitCommit = "unknown";
  let gitBranch = "unknown";

  try {
    gitCommit = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    // Git not available
  }

  const readmeContent = `# Log Scout Analyzer - Zed Extension

Advanced log analysis extension with pattern recognition and diagnostics for Zed editor.

## Version Information

- **Version**: ${version}
- **Build Date**: ${buildDate}
- **Git Branch**: ${gitBranch}
- **Git Commit**: ${gitCommit}

## Installation

### Automatic Installation (Linux/macOS)

1. Extract this archive
2. Navigate into the extracted folder
3. Run the installation script:

\`\`\`bash
./install.sh
\`\`\`

4. Restart Zed

### Manual Installation

1. Extract this archive

2. Copy the entire folder to your Zed extensions directory:

   - **Windows**: \`%USERPROFILE%\\.config\\zed\\extensions\\installed\\\`
   - **macOS**: \`~/Library/Application Support/Zed/extensions/installed/\`
   - **Linux**: \`~/.config/zed/extensions/installed/\`

3. Rename the folder to: \`log-scout-analyzer\`

4. Restart Zed

### Windows Installation

\`\`\`powershell
# Extract the archive, then:
$ExtDir = "$env:USERPROFILE\\.config\\zed\\extensions\\installed\\log-scout-analyzer"
New-Item -ItemType Directory -Force -Path $ExtDir
Copy-Item -Path .\\* -Destination $ExtDir -Recurse -Force
\`\`\`

## Verification

After installation, verify the extension is loaded:

1. Open Zed
2. Press \`Ctrl+Shift+P\` (or \`Cmd+Shift+P\` on macOS)
3. Type "Extensions" and open the Extensions panel
4. Look for "Log Scout Analyzer" in the installed list

You should also see enhanced syntax highlighting when opening \`.log\`, \`.txt\`, or \`.out\` files.

## Features

- **Pattern Recognition**: Automatically detects errors, warnings, and info messages
- **Real-time Diagnostics**: Highlights issues as you view log files
- **Syntax Highlighting**: Enhanced syntax highlighting for log files
- **Multi-file Support**: Supports .log, .txt, and .out files
- **Performance Optimized**: Built with Rust/WASM for speed

## Supported Log Formats

- Standard application logs
- System logs
- Server logs (Apache, Nginx, etc.)
- Custom log formats with common patterns
- CUCM (Cisco Unified Communications Manager) logs
- RTMT (Real-Time Monitoring Tool) logs

## Package Contents

- \`extension.toml\` - Extension manifest
- \`log_scout_analyzer.wasm\` - Extension binary (WebAssembly)
- \`grammars/\` - Syntax highlighting definitions
- \`README.md\` - This file
- \`LICENSE\` - MIT License
- \`install.sh\` - Installation script (Linux/macOS)

## Configuration

The extension works out-of-the-box with sensible defaults. Log files are automatically detected by their extensions.

## Troubleshooting

### Extension Not Loading

1. Verify the extension is in the correct directory
2. Check that the folder is named exactly: \`log-scout-analyzer\`
3. Ensure \`extension.toml\` and \`log_scout_analyzer.wasm\` are present
4. Restart Zed completely (quit and relaunch)

### Check Zed Logs

1. Open Zed
2. Press \`Ctrl+Shift+I\` (Developer Tools)
3. Check the Console for any extension errors

### Reinstall

If issues persist, remove the extension folder and reinstall:

\`\`\`bash
# Linux/macOS
rm -rf ~/.config/zed/extensions/installed/log-scout-analyzer

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\\.config\\zed\\extensions\\installed\\log-scout-analyzer"
\`\`\`

Then follow the installation steps again.

## Uninstallation

Simply remove the extension folder:

\`\`\`bash
# Linux/macOS
rm -rf ~/.config/zed/extensions/installed/log-scout-analyzer

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\\.config\\zed\\extensions\\installed\\log-scout-analyzer"
\`\`\`

Restart Zed to complete the uninstallation.

## License

MIT License - See LICENSE file for details.

## Support

- **Documentation**: https://github.com/log-scout/analyzer
- **Issues**: https://github.com/log-scout/analyzer/issues
- **Source Code**: https://github.com/log-scout/analyzer

## Developer Information

This extension is part of the Log Scout Analyzer project, which includes:

- Zed extension (this package)
- VSCode extension
- Language Server Protocol (LSP) server
- TagScout integration for pattern learning

For more information, visit the project repository.

---

**Enjoy analyzing logs!** 🔍
`;

  fs.writeFileSync(path.join(packageDir, "README.md"), readmeContent, "utf8");
  console.log("   ✓ README.md created\n");

  // Create installation script for Linux/macOS
  console.log("📜 Creating installation script...");

  const installScript = `#!/bin/bash
# Log Scout Analyzer - Zed Extension Installer
# Auto-generated installation script

set -e

echo "Installing Log Scout Analyzer for Zed..."

# Detect OS and set extension directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    EXT_DIR="$HOME/Library/Application Support/Zed/extensions/installed"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    EXT_DIR="$HOME/.config/zed/extensions/installed"
else
    echo "Unsupported OS: $OSTYPE"
    echo "Please manually copy this folder to your Zed extensions directory."
    exit 1
fi

echo "Target: $EXT_DIR/log-scout-analyzer"

# Create directory if it doesn't exist
mkdir -p "$EXT_DIR"

# Remove old version if exists
if [[ -d "$EXT_DIR/log-scout-analyzer" ]]; then
    echo "Removing old version..."
    rm -rf "$EXT_DIR/log-scout-analyzer"
fi

# Copy extension
echo "Copying files..."
mkdir -p "$EXT_DIR/log-scout-analyzer"
cp -r log_scout_analyzer.wasm extension.toml README.md LICENSE "$EXT_DIR/log-scout-analyzer/"

# Copy grammars if present
if [[ -d "grammars" ]]; then
    cp -r grammars "$EXT_DIR/log-scout-analyzer/"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📂 Installed to: $EXT_DIR/log-scout-analyzer"
echo ""
echo "Please restart Zed to load the extension."
echo ""
echo "To verify installation:"
echo "  1. Open Zed"
echo "  2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)"
echo "  3. Type 'Extensions'"
echo "  4. Look for 'Log Scout Analyzer'"
echo ""
`;

  fs.writeFileSync(path.join(packageDir, "install.sh"), installScript, "utf8");

  // Make install script executable (on Unix-like systems)
  if (process.platform !== "win32") {
    try {
      fs.chmodSync(path.join(packageDir, "install.sh"), 0o755);
    } catch (error) {
      // Ignore on Windows
    }
  }
  console.log("   ✓ install.sh created\n");

  // Create installation instructions file
  const installInstructions = `Log Scout Analyzer for Zed - Installation Instructions
========================================================

Version: ${version}
Built: ${buildDate}

QUICK INSTALL (Linux/macOS):
-----------------------------
1. Extract the archive
2. cd into the extracted folder
3. Run: ./install.sh
4. Restart Zed

MANUAL INSTALL:
---------------
1. Extract the ${packageName}.tar.gz or .zip file

2. Copy the entire folder to your Zed extensions directory:

   Windows:  %USERPROFILE%\\.config\\zed\\extensions\\installed\\
   macOS:    ~/Library/Application Support/Zed/extensions/installed/
   Linux:    ~/.config/zed/extensions/installed/

3. Rename the folder to: log-scout-analyzer

4. Restart Zed

WINDOWS POWERSHELL:
-------------------
$ExtDir = "$env:USERPROFILE\\.config\\zed\\extensions\\installed\\log-scout-analyzer"
New-Item -ItemType Directory -Force -Path $ExtDir
Copy-Item -Path .\\* -Destination $ExtDir -Recurse -Force

Then restart Zed.

VERIFY INSTALLATION:
--------------------
1. Open Zed
2. Press Ctrl+Shift+P (or Cmd+Shift+P on Mac)
3. Type "Extensions"
4. Look for "Log Scout Analyzer" in the list
5. Open a .log file to see syntax highlighting

FILES INCLUDED:
---------------
- extension.toml                (Extension manifest)
- log_scout_analyzer.wasm       (Extension binary)
- grammars/                     (Syntax highlighting)
- README.md                     (Documentation)
- install.sh                    (Installation script)
- LICENSE                       (MIT License)

TROUBLESHOOTING:
----------------
If the extension doesn't load:
1. Verify the folder is named "log-scout-analyzer"
2. Check that extension.toml and log_scout_analyzer.wasm exist
3. Restart Zed completely (quit and relaunch)
4. Check Zed's Console (Ctrl+Shift+I) for errors

SUPPORT:
--------
For issues or questions, visit:
https://github.com/log-scout/analyzer/issues

Enjoy analyzing logs! 🔍
`;

  fs.writeFileSync(
    path.join(distDir, "INSTALLATION.txt"),
    installInstructions,
    "utf8"
  );
  console.log("📄 Created INSTALLATION.txt\n");

  // Create archives
  console.log("🗜️  Creating archives...\n");

  // Change to dist directory for archive creation
  process.chdir(distDir);

  // Create tar.gz archive (works on all platforms with tar available)
  try {
    console.log("   Creating .tar.gz archive...");
    execSync(`tar -czf ${packageName}.tar.gz ${packageName}`, {
      stdio: "inherit",
    });
    const tarStats = fs.statSync(`${packageName}.tar.gz`);
    const tarSizeMB = (tarStats.size / 1024 / 1024).toFixed(2);
    console.log(`   ✓ ${packageName}.tar.gz (${tarSizeMB} MB)`);
  } catch (error) {
    console.warn("   ⚠️  Could not create .tar.gz archive");
    console.warn(`      ${error.message}`);
  }

  // Create zip archive
  try {
    console.log("   Creating .zip archive...");

    // Try using PowerShell on Windows
    if (process.platform === "win32") {
      execSync(
        `powershell -Command "Compress-Archive -Path '${packageName}' -DestinationPath '${packageName}.zip' -Force"`,
        { stdio: "inherit" }
      );
    } else {
      // Use zip command on Unix-like systems
      execSync(`zip -r ${packageName}.zip ${packageName} > /dev/null 2>&1`, {
        stdio: "inherit",
      });
    }

    const zipStats = fs.statSync(`${packageName}.zip`);
    const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(2);
    console.log(`   ✓ ${packageName}.zip (${zipSizeMB} MB)`);
  } catch (error) {
    console.warn("   ⚠️  Could not create .zip archive");
    console.warn(`      ${error.message}`);
  }

  // Return to original directory
  process.chdir(__dirname);

  console.log("\n📊 Package Summary");
  console.log("-".repeat(70));
  console.log(`   Version:  ${version}`);
  console.log(`   Built:    ${buildDate}`);
  console.log(`   Package:  ${packageName}`);
  console.log(`   Location: ${distDir}`);
  console.log("");

  // List created files
  console.log("📦 Created files:");
  const distFiles = fs.readdirSync(distDir);
  distFiles.forEach((file) => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      console.log(`   📁 ${file}/`);
    } else {
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`   📄 ${file} (${sizeMB} MB)`);
    }
  });

  console.log("\n✅ Packaging complete!");
  console.log("\n📤 To distribute:");
  console.log(`   Share: dist/${packageName}.tar.gz`);
  console.log(`   Or:    dist/${packageName}.zip`);
  console.log("\n💡 Installation instructions are in:");
  console.log(`   dist/INSTALLATION.txt`);
  console.log("");
} catch (error) {
  console.error("\n❌ Error creating package:", error.message);
  console.error(error.stack);
  process.exit(1);
}
