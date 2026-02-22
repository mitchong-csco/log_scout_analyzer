#!/usr/bin/env node

/**
 * Help Script for Zed Extension
 * Displays all available npm commands with descriptions
 */

const fs = require("fs");
const path = require("path");

console.log("\n🆘 Log Scout Analyzer (Zed) - Help & Commands\n");
console.log("=".repeat(70));

// Read package.json to get actual scripts
const packagePath = path.join(__dirname, "package.json");
let availableScripts = {};

try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  availableScripts = packageJson.scripts || {};
} catch (error) {
  console.error("❌ Could not read package.json");
}

console.log("\n\n🚀 DEPLOYMENT COMMANDS");
console.log("-".repeat(70));

const deploymentCommands = [
  {
    command: "deploy",
    description: "Full deployment (version++, build WASM, build LSP, install)",
    emoji: "🚀",
    time: "2-3 min",
  },
  {
    command: "package",
    description: "Create distribution package (includes version increment)",
    emoji: "📦",
    time: "2-3 min",
  },
  {
    command: "install:zed",
    description: "Install extension to Zed editor",
    emoji: "🎯",
    time: "< 5 sec",
  },
];

deploymentCommands.forEach(({ command, description, emoji, time }) => {
  const exists = availableScripts[command] ? "✅" : "❌";
  console.log(`\n   ${exists} npm run ${command}`);
  console.log(`      ${emoji} ${description}`);
  console.log(`      ⏱️  ${time}`);
});

console.log("\n\n🔨 BUILD COMMANDS");
console.log("-".repeat(70));

const buildCommands = [
  {
    command: "build:all",
    description: "Build WASM extension + LSP server (no version increment)",
    emoji: "🔨",
    time: "2-3 min",
  },
  {
    command: "build:lsp",
    description: "Build Rust LSP server only",
    emoji: "🦀",
    time: "30-60 sec",
  },
  {
    command: "build",
    description: "Build WASM extension only (update versions, generate build info)",
    emoji: "📝",
    time: "1-2 min",
  },
];

buildCommands.forEach(({ command, description, emoji, time }) => {
  const exists = availableScripts[command] ? "✅" : "❌";
  console.log(`\n   ${exists} npm run ${command}`);
  console.log(`      ${emoji} ${description}`);
  console.log(`      ⏱️  ${time}`);
});

console.log("\n\n🔢 VERSION COMMANDS");
console.log("-".repeat(70));

const versionCommands = [
  {
    command: "version:increment",
    description: "Increment patch version (Cargo.toml, extension.toml, LSP)",
    emoji: "🔢",
    time: "< 1 sec",
  },
  {
    command: "update:versions",
    description: "Sync versions across all configuration files",
    emoji: "🔄",
    time: "< 1 sec",
  },
];

versionCommands.forEach(({ command, description, emoji, time }) => {
  const exists = availableScripts[command] ? "✅" : "❌";
  console.log(`\n   ${exists} npm run ${command}`);
  console.log(`      ${emoji} ${description}`);
  console.log(`      ⏱️  ${time}`);
});

console.log("\n\n🛠️  UTILITY COMMANDS");
console.log("-".repeat(70));

const utilityCommands = [
  {
    command: "status",
    description: "Show current versions, build info, and git status",
    emoji: "📊",
    time: "< 1 sec",
  },
  {
    command: "dry-run",
    description: "Preview deployment without making changes",
    emoji: "🔍",
    time: "< 1 sec",
  },
  {
    command: "clean",
    description: "Remove all build artifacts (target/, dist/, build_info.rs)",
    emoji: "🧹",
    time: "< 5 sec",
  },
  {
    command: "test:scripts",
    description: "Verify all automation scripts work correctly",
    emoji: "🧪",
    time: "< 1 sec",
  },
];

utilityCommands.forEach(({ command, description, emoji, time }) => {
  const exists = availableScripts[command] ? "✅" : "❌";
  console.log(`\n   ${exists} npm run ${command}`);
  console.log(`      ${emoji} ${description}`);
  console.log(`      ⏱️  ${time}`);
});

console.log("\n\n🔬 DEVELOPMENT COMMANDS");
console.log("-".repeat(70));

const devCommands = [
  {
    command: "check",
    description: "Check extension + LSP server for errors (no build)",
    emoji: "✅",
    time: "10-15 sec",
  },
  {
    command: "check:lsp",
    description: "Check Rust LSP server for errors",
    emoji: "🦀",
    time: "5 sec",
  },
  {
    command: "check:extension",
    description: "Check WASM extension for errors",
    emoji: "🎯",
    time: "5 sec",
  },
  {
    command: "lint",
    description: "Run clippy linter on extension code",
    emoji: "🔍",
    time: "5-10 sec",
  },
  {
    command: "format",
    description: "Format Rust code with cargo fmt",
    emoji: "✨",
    time: "< 5 sec",
  },
  {
    command: "test",
    description: "Run Rust unit tests",
    emoji: "🧪",
    time: "varies",
  },
];

devCommands.forEach(({ command, description, emoji, time }) => {
  const exists = availableScripts[command] ? "✅" : "❌";
  console.log(`\n   ${exists} npm run ${command}`);
  console.log(`      ${emoji} ${description}`);
  console.log(`      ⏱️  ${time}`);
});

console.log("\n\n📚 DOCUMENTATION");
console.log("-".repeat(70));
console.log(`
   📖 QUICK_START_BUILD.md           Quick reference guide
   📖 SCRIPTS_README.md              Detailed technical docs
   📖 BUILD_AUTOMATION_COMPLETE.md   Complete feature summary
   📖 DEPLOYMENT_WORKFLOW.md         Visual workflow diagrams
   📖 BUILD_AUTOMATION_INDEX.md      Master index & navigation
`);

console.log("\n\n🎯 QUICK WORKFLOWS");
console.log("-".repeat(70));
console.log(`
   🚀 Standard Deployment:
      1. npm run status          (check current state)
      2. npm run deploy          (deploy everything)
      3. Restart Zed             (Ctrl+Shift+P → Reload Extensions)

   🔍 Safe Deployment:
      1. npm run status          (check current state)
      2. npm run dry-run         (preview changes)
      3. npm run deploy          (deploy everything)
      4. Restart Zed             (Ctrl+Shift+P → Reload Extensions)

   🧹 Clean Rebuild:
      1. npm run clean           (remove artifacts)
      2. npm run deploy          (fresh build)
      3. Restart Zed             (Ctrl+Shift+P → Reload Extensions)

   🐛 Troubleshooting:
      1. npm run test:scripts    (verify scripts work)
      2. npm run clean           (clean build)
      3. npm run check           (check for errors)
      4. npm run deploy          (try again)

   📦 Package for Distribution:
      1. npm run status          (check current state)
      2. npm run package         (create .tar.gz and .zip)
      3. Check dist/ folder      (packages ready to share)
`);

console.log("\n\n💻 WINDOWS BATCH FILES");
console.log("-".repeat(70));
console.log(`
   📄 DEPLOY.bat                 Double-click for visual deployment
   📄 build.sh                   Cross-platform build script (bash)
`);

console.log("\n\n🎯 ZED EXTENSION SPECIFICS");
console.log("-".repeat(70));
console.log(`
   • Extension is built as WASM (wasm32-wasip1 target)
   • LSP server is built as native Windows binary
   • Extension installed to:
     - Windows: %USERPROFILE%\\.config\\zed\\extensions\\log-scout-analyzer
     - macOS: ~/Library/Application Support/Zed/extensions/log-scout-analyzer
     - Linux: ~/.config/zed/extensions/log-scout-analyzer
   • Distribution packages created in dist/ folder
   • Both .tar.gz and .zip formats supported
`);

console.log("\n\n💡 PRO TIPS");
console.log("-".repeat(70));
console.log(`
   • Always run "npm run status" before deploying
   • Use "npm run dry-run" to preview without changes
   • Commit changes before building (git hash is embedded)
   • Run "npm run test:scripts" periodically to verify system
   • Use "npm run clean" if you encounter build issues
   • Read error messages - scripts provide helpful diagnostics
   • WASM builds are slower than native - be patient on first build
   • Use "npm run check" for fast error checking without full build
`);

console.log("\n\n🔧 RUST/CARGO SPECIFICS");
console.log("-".repeat(70));
console.log(`
   • Requires Rust toolchain (rustup recommended)
   • Requires wasm32-wasip1 target: rustup target add wasm32-wasip1
   • Release builds use aggressive optimization (opt-level = "z")
   • LTO and strip enabled for smaller binaries
   • Cargo.lock tracked in git for reproducible builds
`);

console.log("\n\n🆘 GET MORE HELP");
console.log("-".repeat(70));
console.log(`
   📖 Quick Start:        QUICK_START_BUILD.md
   📖 Full Documentation: SCRIPTS_README.md
   📖 Master Index:       BUILD_AUTOMATION_INDEX.md
   📖 Visual Guide:       DEPLOYMENT_WORKFLOW.md

   🔧 Test System:        npm run test:scripts
   📊 Check Status:       npm run status
   🔍 Preview Changes:    npm run dry-run
   🧹 Clean Workspace:    npm run clean
`);

console.log("\n\n🌐 USEFUL LINKS");
console.log("-".repeat(70));
console.log(`
   📚 Zed Extension Docs: https://zed.dev/docs/extensions
   🦀 Rust Book:          https://doc.rust-lang.org/book/
   📦 Cargo Book:         https://doc.rust-lang.org/cargo/
   🎯 WASM Guide:         https://rustwasm.github.io/docs/book/
`);

console.log("\n" + "=".repeat(70));
console.log("\n✨ For detailed information, run: npm run status\n");
