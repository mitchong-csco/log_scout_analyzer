#!/usr/bin/env node

/**
 * Help Script
 * Displays all available npm commands with descriptions
 */

const fs = require("fs");
const path = require("path");

console.log("\n🆘 Log Scout Analyzer - Help & Commands\n");
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
    description: "Full deployment (version++, build, package, install)",
    emoji: "🚀",
    time: "1-2 min",
  },
  {
    command: "package",
    description: "Create VSIX package (includes version increment)",
    emoji: "📦",
    time: "1-2 min",
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
    description: "Build LSP server + extension (no version increment)",
    emoji: "🔨",
    time: "1-2 min",
  },
  {
    command: "build:lsp",
    description: "Build Rust LSP server only",
    emoji: "🦀",
    time: "30-60 sec",
  },
  {
    command: "build",
    description: "Build extension only (update versions, compile TS)",
    emoji: "📝",
    time: "5-15 sec",
  },
  {
    command: "compile",
    description: "Compile TypeScript to JavaScript",
    emoji: "⚙️",
    time: "5-15 sec",
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
    description: "Increment patch version (package.json + Cargo.toml)",
    emoji: "🔢",
    time: "< 1 sec",
  },
  {
    command: "update:versions",
    description: "Sync versions to activity bar display",
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
    description: "Remove all build artifacts (out/, bin/, .vsix)",
    emoji: "🧹",
    time: "< 1 sec",
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
    description: "Check LSP server + compile extension (no build)",
    emoji: "✅",
    time: "5-10 sec",
  },
  {
    command: "check:lsp",
    description: "Check Rust LSP server for errors",
    emoji: "🦀",
    time: "5 sec",
  },
  {
    command: "watch",
    description: "Watch and recompile TypeScript on changes",
    emoji: "👁️",
    time: "continuous",
  },
  {
    command: "lint",
    description: "Run ESLint on TypeScript source",
    emoji: "🔍",
    time: "2-5 sec",
  },
  {
    command: "test",
    description: "Run extension tests",
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
   📖 BUILD_AUTOMATION_INDEX.md     Master index & navigation
   📖 QUICK_START_BUILD.md           Quick reference guide
   📖 BUILD_AUTOMATION_COMPLETE.md   Complete feature summary
   📖 DEPLOYMENT_WORKFLOW.md         Visual workflow diagrams
   📖 SCRIPTS_README.md              Detailed technical docs
`);

console.log("\n\n🎯 QUICK WORKFLOWS");
console.log("-".repeat(70));
console.log(`
   🚀 Standard Deployment:
      1. npm run status          (check current state)
      2. npm run deploy          (deploy everything)
      3. Reload VSCode           (Ctrl+Shift+P → Reload Window)

   🔍 Safe Deployment:
      1. npm run status          (check current state)
      2. npm run dry-run         (preview changes)
      3. npm run deploy          (deploy everything)
      4. Reload VSCode           (Ctrl+Shift+P → Reload Window)

   🧹 Clean Rebuild:
      1. npm run clean           (remove artifacts)
      2. npm run deploy          (fresh build)
      3. Reload VSCode           (Ctrl+Shift+P → Reload Window)

   🐛 Troubleshooting:
      1. npm run test:scripts    (verify scripts work)
      2. npm run clean           (clean build)
      3. npm run deploy          (try again)
`);

console.log("\n\n💻 WINDOWS BATCH FILES");
console.log("-".repeat(70));
console.log(`
   📄 DEPLOY.bat                 Double-click for visual deployment
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
`);

console.log("\n" + "=".repeat(70));
console.log("\n✨ For detailed information, run: npm run status\n");
