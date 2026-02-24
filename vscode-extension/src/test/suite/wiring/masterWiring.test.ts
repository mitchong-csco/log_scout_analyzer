import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * MASTER WIRING VALIDATION TEST SUITE
 *
 * This is the "typo catcher" - a comprehensive validation that ensures
 * everything declared in package.json actually works in the extension.
 *
 * This test catches the gap where:
 * - E2E tests pass (they call commands directly)
 * - But users can't use the feature (typo in package.json)
 *
 * Run this test FIRST before any E2E tests!
 */

suite("🎯 MASTER WIRING VALIDATION - The Typo Catcher", () => {
  let packageJson: any;
  let extensionSource: string;
  let registeredCommands: string[];
  let allErrors: string[] = [];
  let allWarnings: string[] = [];

  suiteSetup(async function() {
    this.timeout(30000);

    console.log("\n" + "=".repeat(70));
    console.log("🔍 STARTING COMPREHENSIVE WIRING VALIDATION");
    console.log("=".repeat(70) + "\n");

    // Load package.json
    const packageJsonPath = path.join(__dirname, "../../../../package.json");
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // Load extension source
    const extensionPath = path.join(__dirname, "../../../extension.ts");
    if (fs.existsSync(extensionPath)) {
      extensionSource = fs.readFileSync(extensionPath, "utf-8");
    } else {
      extensionSource = "";
    }

    // Wait for extension to activate
    const extension = vscode.extensions.getExtension(
      "log-scout-team.log-scout-analyzer"
    );

    if (extension) {
      if (!extension.isActive) {
        console.log("⏳ Activating extension...");
        await extension.activate();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      console.log("✅ Extension activated\n");
    } else {
      console.warn("⚠️  Extension not found!\n");
    }

    // Get all registered commands
    registeredCommands = await vscode.commands.getCommands(true);
  });

  /**
   * CRITICAL TEST 1: Command Declaration vs Registration
   * This catches typos between package.json and extension.ts
   */
  test("🔴 CRITICAL: All declared commands must be registered", async () => {
    console.log("\n📋 Validating command wiring...");

    const declaredCommands = (packageJson.contributes?.commands || [])
      .map((c: any) => c.command);

    const missingCommands: string[] = [];
    const codeCommands = new Set<string>();

    // Extract commands from code
    if (extensionSource) {
      const registerCommandRegex = /registerCommand\s*\(\s*["'`]([^"'`]+)["'`]/g;
      let match;
      while ((match = registerCommandRegex.exec(extensionSource)) !== null) {
        if (match[1].startsWith("logScoutAnalyzer.")) {
          codeCommands.add(match[1]);
        }
      }
    }

    // Check each declared command
    for (const cmdId of declaredCommands) {
      const isRegistered = registeredCommands.includes(cmdId);
      const isInCode = codeCommands.has(cmdId);

      if (!isRegistered) {
        missingCommands.push(
          `❌ "${cmdId}"\n` +
          `   - Declared in package.json: YES\n` +
          `   - Registered in VS Code: NO\n` +
          `   - Found in extension.ts: ${isInCode ? "YES" : "NO"}\n` +
          `   - Impact: Command appears in palette but FAILS when clicked!`
        );
      }
    }

    if (missingCommands.length > 0) {
      const error =
        `\n${"=".repeat(70)}\n` +
        `🚨 CRITICAL WIRING ERROR: Commands declared but NOT registered!\n` +
        `${"=".repeat(70)}\n\n` +
        missingCommands.join("\n\n") +
        `\n\n${"=".repeat(70)}\n` +
        `FIX: Add vscode.commands.registerCommand() in extension.ts\n` +
        `${"=".repeat(70)}\n`;

      allErrors.push(error);
      assert.fail(error);
    }

    console.log(`✅ All ${declaredCommands.length} declared commands are registered`);
  });

  /**
   * CRITICAL TEST 2: Menu Items Must Reference Valid Commands
   * This catches typos in context menu configurations
   */
  test("🔴 CRITICAL: All menu items must reference valid commands", () => {
    console.log("\n📋 Validating menu wiring...");

    const menuTypes = [
      "view/item/context",
      "view/title",
      "editor/context",
      "commandPalette"
    ];

    const menuErrors: string[] = [];
    let totalMenuItems = 0;

    for (const menuType of menuTypes) {
      const menus = packageJson.contributes?.menus?.[menuType] || [];
      totalMenuItems += menus.length;

      for (const menu of menus) {
        const commandId = menu.command;

        if (!registeredCommands.includes(commandId)) {
          menuErrors.push(
            `❌ Menu "${menuType}"\n` +
            `   - Command: "${commandId}"\n` +
            `   - Status: NOT REGISTERED\n` +
            `   - Impact: Menu item appears but clicking it FAILS!`
          );
        }
      }
    }

    if (menuErrors.length > 0) {
      const error =
        `\n${"=".repeat(70)}\n` +
        `🚨 CRITICAL WIRING ERROR: Menu items reference invalid commands!\n` +
        `${"=".repeat(70)}\n\n` +
        menuErrors.join("\n\n") +
        `\n\n${"=".repeat(70)}\n` +
        `FIX: Register commands or fix typos in package.json menus\n` +
        `${"=".repeat(70)}\n`;

      allErrors.push(error);
      assert.fail(error);
    }

    console.log(`✅ All ${totalMenuItems} menu items reference valid commands`);
  });

  /**
   * CRITICAL TEST 3: Keybindings Must Reference Valid Commands
   * This catches typos in keyboard shortcut configurations
   */
  test("🔴 CRITICAL: All keybindings must reference valid commands", () => {
    console.log("\n📋 Validating keybinding wiring...");

    const keybindings = packageJson.contributes?.keybindings || [];
    const keybindingErrors: string[] = [];

    for (const binding of keybindings) {
      const commandId = binding.command;

      if (!registeredCommands.includes(commandId)) {
        keybindingErrors.push(
          `❌ Keybinding "${binding.key || 'unspecified'}"\n` +
          `   - Command: "${commandId}"\n` +
          `   - Status: NOT REGISTERED\n` +
          `   - Impact: Keyboard shortcut does NOTHING!`
        );
      }
    }

    if (keybindingErrors.length > 0) {
      const error =
        `\n${"=".repeat(70)}\n` +
        `🚨 CRITICAL WIRING ERROR: Keybindings reference invalid commands!\n` +
        `${"=".repeat(70)}\n\n` +
        keybindingErrors.join("\n\n") +
        `\n\n${"=".repeat(70)}\n` +
        `FIX: Register commands or fix typos in package.json keybindings\n` +
        `${"=".repeat(70)}\n`;

      allErrors.push(error);
      assert.fail(error);
    }

    console.log(`✅ All ${keybindings.length} keybindings reference valid commands`);
  });

  /**
   * CRITICAL TEST 4: Views Must Be Properly Configured
   * This catches missing view registrations
   */
  test("🔴 CRITICAL: All views must be properly configured", () => {
    console.log("\n📋 Validating view wiring...");

    const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
    const viewErrors: string[] = [];

    for (const view of views) {
      // Check basic configuration
      if (!view.id) {
        viewErrors.push(`❌ View has no ID!`);
      }
      if (!view.name) {
        viewErrors.push(`❌ View "${view.id}" has no name`);
      }

      // Check if TreeDataProvider is registered (for tree views)
      if (extensionSource && view.id) {
        const hasRegistration =
          extensionSource.includes(`registerTreeDataProvider("${view.id}"`) ||
          extensionSource.includes(`registerTreeDataProvider('${view.id}'`) ||
          extensionSource.includes(`createTreeView("${view.id}"`) ||
          extensionSource.includes(`createTreeView('${view.id}'`);

        if (!hasRegistration) {
          viewErrors.push(
            `⚠️  View "${view.id}"\n` +
            `   - May not have TreeDataProvider registered\n` +
            `   - Impact: View might appear empty or fail to load`
          );
        }
      }
    }

    if (viewErrors.length > 0) {
      const error =
        `\n${"=".repeat(70)}\n` +
        `🚨 CRITICAL WIRING ERROR: Views have configuration issues!\n` +
        `${"=".repeat(70)}\n\n` +
        viewErrors.join("\n\n") +
        `\n\n${"=".repeat(70)}\n` +
        `FIX: Check view configuration and TreeDataProvider registration\n` +
        `${"=".repeat(70)}\n`;

      allErrors.push(error);
      assert.fail(error);
    }

    console.log(`✅ All ${views.length} views are properly configured`);
  });

  /**
   * WARNING TEST 1: Common Typos Detection
   * This catches common spelling mistakes
   */
  test("⚠️  WARNING: Check for common typos", () => {
    console.log("\n📋 Checking for common typos...");

    const commands = packageJson.contributes?.commands || [];
    const typos: string[] = [];

    const typoPatterns = [
      { pattern: /Arhcive/i, correct: "Archive" },
      { pattern: /Anlayze/i, correct: "Analyze" },
      { pattern: /Bundel/i, correct: "Bundle" },
      { pattern: /Resutls/i, correct: "Results" },
      { pattern: /Pattren/i, correct: "Pattern" },
      { pattern: /Refesh/i, correct: "Refresh" },
      { pattern: /Improt/i, correct: "Import" },
      { pattern: /Exprot/i, correct: "Export" }
    ];

    for (const cmd of commands) {
      const fullText = `${cmd.command} ${cmd.title || ""}`;

      for (const { pattern, correct } of typoPatterns) {
        if (pattern.test(fullText)) {
          typos.push(
            `⚠️  Potential typo in "${cmd.command}"\n` +
            `   - Text: "${fullText}"\n` +
            `   - Suggestion: Did you mean "${correct}"?`
          );
        }
      }
    }

    if (typos.length > 0) {
      const warning =
        `\n${"=".repeat(70)}\n` +
        `⚠️  WARNING: Potential typos found!\n` +
        `${"=".repeat(70)}\n\n` +
        typos.join("\n\n") +
        `\n\n${"=".repeat(70)}\n`;

      allWarnings.push(warning);
      console.warn(warning);
    } else {
      console.log("✅ No common typos detected");
    }
  });

  /**
   * WARNING TEST 2: Activation Events Coverage
   * This warns about missing activation events
   */
  test("⚠️  WARNING: Check activation event coverage", () => {
    console.log("\n📋 Checking activation events...");

    const commands = packageJson.contributes?.commands || [];
    const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
    const activationEvents = packageJson.activationEvents || [];
    const hasWildcard = activationEvents.includes("*");

    if (hasWildcard) {
      console.log("✅ Using wildcard activation (*) - all features will work");
      return;
    }

    const warnings: string[] = [];

    // Check commands
    for (const cmd of commands) {
      const hasActivation = activationEvents.some(
        (e: string) => e === `onCommand:${cmd.command}`
      );

      if (!hasActivation) {
        warnings.push(
          `⚠️  Command "${cmd.command}" has no activation event\n` +
          `   - May not work until extension activates via another event`
        );
      }
    }

    // Check views
    for (const view of views) {
      const hasActivation = activationEvents.some(
        (e: string) => e === `onView:${view.id}`
      );

      if (!hasActivation) {
        warnings.push(
          `⚠️  View "${view.id}" has no activation event\n` +
          `   - May not load until extension activates via another event`
        );
      }
    }

    if (warnings.length > 0) {
      const warning =
        `\n${"=".repeat(70)}\n` +
        `⚠️  WARNING: Some features missing activation events!\n` +
        `${"=".repeat(70)}\n\n` +
        warnings.slice(0, 10).join("\n\n") +
        (warnings.length > 10 ? `\n\n... and ${warnings.length - 10} more` : "") +
        `\n\n${"=".repeat(70)}\n` +
        `Recommendation: Add activation events or use "*" for auto-activation\n` +
        `${"=".repeat(70)}\n`;

      allWarnings.push(warning);
      console.warn(warning);
    } else {
      console.log("✅ All features have activation events");
    }
  });

  /**
   * INFO TEST: Cross-Reference Code and Configuration
   * This provides helpful information about wiring consistency
   */
  test("ℹ️  INFO: Cross-reference code and configuration", () => {
    console.log("\n📋 Cross-referencing code and configuration...");

    if (!extensionSource) {
      console.log("⏭️  Skipping (extension source not available)");
      return;
    }

    // Extract commands from code
    const registerCommandRegex = /registerCommand\s*\(\s*["'`]([^"'`]+)["'`]/g;
    const codeCommands = new Set<string>();
    let match;

    while ((match = registerCommandRegex.exec(extensionSource)) !== null) {
      if (match[1].startsWith("logScoutAnalyzer.")) {
        codeCommands.add(match[1]);
      }
    }

    const declaredCommands = new Set(
      (packageJson.contributes?.commands || []).map((c: any) => c.command)
    );

    // Commands in code but not in package.json
    const inCodeNotInPackage = [...codeCommands].filter(
      c => !declaredCommands.has(c)
    );

    // Commands in package.json but not in code
    const inPackageNotInCode = ([...declaredCommands] as string[]).filter(
      c => !codeCommands.has(c)
    );

    if (inCodeNotInPackage.length > 0) {
      console.log(
        `\nℹ️  Commands registered in code but NOT in package.json:\n` +
        inCodeNotInPackage.map(c => `   - ${c}`).join("\n") +
        `\n   These won't appear in Command Palette!`
      );
    }

    if (inPackageNotInCode.length > 0) {
      console.log(
        `\nℹ️  Commands in package.json but NOT found in code:\n` +
        inPackageNotInCode.map(c => `   - ${c}`).join("\n") +
        `\n   These might be in other files or use dynamic registration`
      );
    }

    if (inCodeNotInPackage.length === 0 && inPackageNotInCode.length === 0) {
      console.log("✅ Perfect match between code and configuration!");
    }
  });

  /**
   * FINAL SUMMARY: Overall Health Report
   */
  test("📊 SUMMARY: Overall wiring health report", () => {
    const commands = packageJson.contributes?.commands || [];
    const menus = packageJson.contributes?.menus || {};
    const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
    const keybindings = packageJson.contributes?.keybindings || [];

    const totalMenuItems = Object.values(menus).reduce(
      (sum: number, items: any) => sum + items.length,
      0
    );

    console.log("\n" + "=".repeat(70));
    console.log("📊 MASTER WIRING VALIDATION SUMMARY");
    console.log("=".repeat(70));
    console.log(`Extension:          ${packageJson.name} v${packageJson.version}`);
    console.log(`Publisher:          ${packageJson.publisher}`);
    console.log("-".repeat(70));
    console.log(`Commands declared:  ${commands.length}`);
    console.log(`Commands registered: ${registeredCommands.filter(c => c.startsWith("logScoutAnalyzer.")).length}`);
    console.log(`Menu items:         ${totalMenuItems}`);
    console.log(`Keybindings:        ${keybindings.length}`);
    console.log(`Views:              ${views.length}`);
    console.log("-".repeat(70));
    console.log(`Critical Errors:    ${allErrors.length}`);
    console.log(`Warnings:           ${allWarnings.length}`);
    console.log("=".repeat(70));

    if (allErrors.length === 0) {
      console.log("\n✅ ALL CRITICAL WIRING TESTS PASSED!");
      console.log("✅ No typos detected between package.json and extension code");
      console.log("✅ All commands, menus, and keybindings are properly wired");
      console.log("✅ Ready for E2E testing!\n");
    } else {
      console.log("\n❌ CRITICAL WIRING ERRORS DETECTED!");
      console.log("❌ Fix these errors before running E2E tests");
      console.log("❌ E2E tests may pass but users will experience failures!\n");
    }

    if (allWarnings.length > 0) {
      console.log(`⚠️  ${allWarnings.length} warning(s) - review recommended\n`);
    }

    console.log("=".repeat(70) + "\n");

    // This test always passes - it's just a summary
    assert.ok(true);
  });
});

/**
 * STANDALONE TEST: Quick Smoke Test
 * Run this first for fast feedback
 */
suite("🚀 Quick Smoke Test - Fast Wiring Check", () => {
  test("Extension should be installed and activatable", async function() {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension(
      "log-scout-team.log-scout-analyzer"
    );

    assert.ok(extension, "Extension should be installed");

    if (!extension.isActive) {
      await extension.activate();
    }

    assert.ok(extension.isActive, "Extension should be active");
  });

  test("Critical commands should be registered", async function() {
    this.timeout(5000);

    const commands = await vscode.commands.getCommands(true);
    const criticalCommands = [
      "logScoutAnalyzer.importArchive",
      "logScoutAnalyzer.bundle.analyze",
      "logScoutAnalyzer.refreshResults"
    ];

    for (const cmdId of criticalCommands) {
      assert.ok(
        commands.includes(cmdId),
        `Critical command "${cmdId}" should be registered`
      );
    }
  });

  test("Package.json should be valid", () => {
    const packageJsonPath = path.join(__dirname, "../../../../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    assert.ok(packageJson.name, "Should have name");
    assert.ok(packageJson.version, "Should have version");
    assert.ok(packageJson.publisher, "Should have publisher");
    assert.ok(packageJson.contributes, "Should have contributes section");
  });
});
