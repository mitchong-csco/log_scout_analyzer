import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * KEYBINDING WIRING VALIDATION TESTS
 *
 * These tests validate that:
 * 1. All keybindings reference commands that exist
 * 2. No conflicting keybindings
 * 3. Keybindings have appropriate 'when' clauses
 * 4. Platform-specific bindings are correct
 *
 * This catches errors where keyboard shortcuts are defined but don't work.
 */

suite("Keybinding Wiring Validation", () => {
  let packageJson: any;
  let registeredCommands: string[];

  suiteSetup(async function() {
    this.timeout(30000);

    // Load package.json
    const packageJsonPath = path.join(__dirname, "../../../../package.json");
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // Wait for extension to activate
    const extension = vscode.extensions.getExtension(
      "log-scout-team.log-scout-analyzer"
    );

    if (extension && !extension.isActive) {
      await extension.activate();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get registered commands
    registeredCommands = await vscode.commands.getCommands(true);
  });

  suite("1. Keybinding Command Validation", () => {
    test("All keybinding commands should be registered", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const missingCommands: string[] = [];

      for (const binding of keybindings) {
        const commandId = binding.command;

        if (!registeredCommands.includes(commandId)) {
          missingCommands.push(
            `Keybinding "${binding.key}" references non-existent command: ${commandId}`
          );
        }
      }

      if (missingCommands.length > 0) {
        assert.fail(
          `❌ Keybinding wiring errors:\n${missingCommands.join("\n")}\n\n` +
          `These keyboard shortcuts won't work!\n` +
          `Fix: Register these commands or remove keybindings from package.json`
        );
      }
    });

    test("Keybinding commands should be declared in package.json", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const declaredCommands = (packageJson.contributes?.commands || [])
        .map((c: any) => c.command);

      const undeclaredCommands: string[] = [];

      for (const binding of keybindings) {
        const commandId = binding.command;

        if (commandId.startsWith("logScoutAnalyzer.")) {
          if (!declaredCommands.includes(commandId)) {
            undeclaredCommands.push(
              `Keybinding "${binding.key}" references undeclared command: ${commandId}`
            );
          }
        }
      }

      if (undeclaredCommands.length > 0) {
        console.warn(
          `⚠️  Keybindings reference undeclared commands:\n${undeclaredCommands.join("\n")}\n\n` +
          `Commands work but won't appear in Command Palette`
        );
      }
    });
  });

  suite("2. Keybinding Conflict Detection", () => {
    test("No duplicate keybindings for same context", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const conflicts = new Map<string, any[]>();

      for (const binding of keybindings) {
        // Create key that includes the context
        const contextKey = `${binding.key}|${binding.when || ""}|${binding.mac || ""}|${binding.linux || ""}|${binding.win || ""}`;

        if (!conflicts.has(contextKey)) {
          conflicts.set(contextKey, []);
        }
        conflicts.get(contextKey)!.push(binding);
      }

      const duplicates: string[] = [];

      for (const [contextKey, bindings] of conflicts) {
        if (bindings.length > 1) {
          const keys = contextKey.split("|");
          const key = keys[0];
          const when = keys[1] || "always";
          const commands = bindings.map(b => b.command).join(", ");

          duplicates.push(
            `Key "${key}" (when: ${when}) bound to multiple commands: ${commands}`
          );
        }
      }

      if (duplicates.length > 0) {
        assert.fail(
          `❌ Duplicate keybindings found:\n${duplicates.join("\n")}\n\n` +
          `Only the first binding will work!`
        );
      }
    });

    test("Platform-specific bindings should not conflict", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const issues: string[] = [];

      for (const binding of keybindings) {
        const platforms = [];
        if (binding.mac) platforms.push("mac");
        if (binding.linux) platforms.push("linux");
        if (binding.win) platforms.push("win");

        // If platform-specific keys are same as default key
        if (binding.key) {
          if (binding.mac === binding.key) {
            issues.push(
              `⚠️  Keybinding "${binding.command}": mac key same as default key`
            );
          }
          if (binding.linux === binding.key) {
            issues.push(
              `⚠️  Keybinding "${binding.command}": linux key same as default key`
            );
          }
          if (binding.win === binding.key) {
            issues.push(
              `⚠️  Keybinding "${binding.command}": win key same as default key`
            );
          }
        }
      }

      if (issues.length > 0) {
        console.warn(
          `Keybinding redundancy warnings:\n${issues.join("\n")}`
        );
      }
    });

    test("Check for common VS Code keybinding conflicts", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const commonVSCodeKeys = [
        "ctrl+s",       // Save
        "ctrl+o",       // Open
        "ctrl+n",       // New file
        "ctrl+w",       // Close
        "ctrl+shift+p", // Command Palette
        "ctrl+p",       // Quick Open
        "ctrl+b",       // Toggle Sidebar
        "ctrl+`",       // Toggle Terminal
        "ctrl+shift+f", // Search
        "ctrl+shift+e", // Explorer
        "ctrl+shift+g", // Source Control
        "ctrl+shift+d", // Debug
        "ctrl+shift+x", // Extensions
      ];

      const conflicts: string[] = [];

      for (const binding of keybindings) {
        const key = binding.key?.toLowerCase();

        if (key && commonVSCodeKeys.includes(key)) {
          // Only warn if no 'when' clause (global override)
          if (!binding.when) {
            conflicts.push(
              `⚠️  "${binding.command}" uses common VS Code key "${binding.key}" without 'when' clause`
            );
          }
        }
      }

      if (conflicts.length > 0) {
        console.warn(
          `Potential VS Code keybinding conflicts:\n${conflicts.join("\n")}\n\n` +
          `Consider adding 'when' clause to scope the keybinding`
        );
      }
    });
  });

  suite("3. When Clause Validation", () => {
    test("Keybindings should have when clauses for scoped actions", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const missingWhen: string[] = [];

      for (const binding of keybindings) {
        // View-specific commands should have 'when' clauses
        if (binding.command.includes("bundle.") ||
            binding.command.includes("results.") ||
            binding.command.includes("pattern.")) {
          if (!binding.when) {
            missingWhen.push(
              `"${binding.key}" → "${binding.command}" has no 'when' clause (will work globally)`
            );
          }
        }
      }

      if (missingWhen.length > 0) {
        console.warn(
          `⚠️  Keybindings without 'when' clauses:\n${missingWhen.join("\n")}\n\n` +
          `Consider adding 'when' clause like:\n` +
          `  - "view == scoutBundles" (for view-specific)\n` +
          `  - "editorLangId == log" (for log files)\n` +
          `  - "resourceExtname == .log" (for specific file types)`
        );
      }
    });

    test("When clauses should be syntactically valid", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const issues: string[] = [];

      for (const binding of keybindings) {
        if (binding.when) {
          const when = binding.when;

          // Check for common mistakes
          if (when.includes("=") && !when.includes("==") && !when.includes("!=")) {
            issues.push(
              `⚠️  "${binding.command}" uses single '=' instead of '==' in 'when' clause`
            );
          }

          // Check for unbalanced parentheses
          const openParens = (when.match(/\(/g) || []).length;
          const closeParens = (when.match(/\)/g) || []).length;
          if (openParens !== closeParens) {
            issues.push(
              `❌ "${binding.command}" has unbalanced parentheses in 'when' clause`
            );
          }
        }
      }

      if (issues.length > 0) {
        console.warn(
          `When clause syntax issues:\n${issues.join("\n")}`
        );
      }
    });

    test("When clauses should reference valid context keys", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validViewIds = views.map((v: any) => v.id);

      const issues: string[] = [];

      for (const binding of keybindings) {
        if (binding.when && binding.when.includes("view ==")) {
          // Extract view ID from when clause
          const viewMatch = binding.when.match(/view\s*==\s*['"]?([^'"&|\s]+)/);
          if (viewMatch) {
            const referencedView = viewMatch[1];

            if (referencedView.startsWith("scout") && !validViewIds.includes(referencedView)) {
              issues.push(
                `Keybinding "${binding.command}" references non-existent view "${referencedView}"`
              );
            }
          }
        }
      }

      if (issues.length > 0) {
        console.warn(
          `⚠️  When clauses reference invalid views:\n${issues.join("\n")}`
        );
      }
    });
  });

  suite("4. Keybinding Key Format Validation", () => {
    test("Keybinding keys should be properly formatted", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const issues: string[] = [];

      for (const binding of keybindings) {
        const keys = [binding.key, binding.mac, binding.linux, binding.win].filter(Boolean);

        for (const key of keys) {
          if (!key) continue;

          // Check for lowercase (VS Code prefers lowercase)
          if (key !== key.toLowerCase() && !key.includes("+")) {
            issues.push(
              `⚠️  "${binding.command}" key "${key}" should be lowercase`
            );
          }

          // Check for spaces (should use + not space)
          if (key.includes(" ") && !key.startsWith("ctrl+") && !key.startsWith("cmd+")) {
            issues.push(
              `⚠️  "${binding.command}" key "${key}" contains spaces (use '+' separator)`
            );
          }

          // Check for valid modifiers
          const validModifiers = ["ctrl", "cmd", "alt", "shift", "meta", "win"];
          const parts = key.toLowerCase().split("+");

          for (let i = 0; i < parts.length - 1; i++) {
            if (!validModifiers.includes(parts[i])) {
              issues.push(
                `⚠️  "${binding.command}" has invalid modifier "${parts[i]}" in key "${key}"`
              );
            }
          }
        }
      }

      if (issues.length > 0) {
        console.warn(
          `Key format issues:\n${issues.join("\n")}`
        );
      }
    });

    test("Platform-specific keys should use correct modifiers", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const issues: string[] = [];

      for (const binding of keybindings) {
        // Mac should use 'cmd' instead of 'ctrl' for primary modifier
        if (binding.mac && binding.mac.toLowerCase().startsWith("ctrl+")) {
          issues.push(
            `💡 "${binding.command}" mac key uses 'ctrl' - consider 'cmd' for Mac convention`
          );
        }

        // Windows/Linux should use 'ctrl'
        if (binding.win && binding.win.toLowerCase().startsWith("cmd+")) {
          issues.push(
            `⚠️  "${binding.command}" win key uses 'cmd' - should use 'ctrl' on Windows`
          );
        }

        if (binding.linux && binding.linux.toLowerCase().startsWith("cmd+")) {
          issues.push(
            `⚠️  "${binding.command}" linux key uses 'cmd' - should use 'ctrl' on Linux`
          );
        }
      }

      if (issues.length > 0) {
        console.warn(
          `Platform modifier recommendations:\n${issues.join("\n")}`
        );
      }
    });
  });

  suite("5. Keybinding Usability", () => {
    test("Keybindings should not be overly complex", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const complexBindings: string[] = [];

      for (const binding of keybindings) {
        const key = binding.key || "";
        const modifierCount = (key.match(/\+/g) || []).length;

        // More than 3 modifiers is hard to press
        if (modifierCount > 3) {
          complexBindings.push(
            `"${binding.command}" has ${modifierCount} modifiers: ${key}`
          );
        }
      }

      if (complexBindings.length > 0) {
        console.warn(
          `⚠️  Complex keybindings (hard to press):\n${complexBindings.join("\n")}\n\n` +
          `Consider simpler key combinations`
        );
      }
    });

    test("Critical commands should have keybindings", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const boundCommands = keybindings.map((b: any) => b.command);

      const criticalCommands = [
        "logScoutAnalyzer.importArchive",
        "logScoutAnalyzer.bundle.analyze",
        "logScoutAnalyzer.refreshResults"
      ];

      const missingBindings: string[] = [];

      for (const cmdId of criticalCommands) {
        if (!boundCommands.includes(cmdId)) {
          missingBindings.push(cmdId);
        }
      }

      if (missingBindings.length > 0) {
        console.log(
          `💡 Critical commands without keybindings (consider adding):\n${missingBindings.map(c => `  - ${c}`).join("\n")}`
        );
      }
    });

    test("Keybinding descriptions should be clear", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const commands = packageJson.contributes?.commands || [];

      for (const binding of keybindings) {
        const command = commands.find((c: any) => c.command === binding.command);

        if (command) {
          // Command should have a clear title
          if (!command.title) {
            console.warn(
              `⚠️  Keybinding "${binding.key}" → "${binding.command}" has no title`
            );
          } else if (command.title.length < 5) {
            console.warn(
              `⚠️  Keybinding "${binding.key}" → "${binding.command}" has very short title`
            );
          }
        }
      }
    });
  });

  suite("6. Critical Keybinding Tests", () => {
    test("Import command should have reasonable keybinding", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const importBinding = keybindings.find(
        (b: any) => b.command === "logScoutAnalyzer.importArchive"
      );

      if (importBinding) {
        console.log(
          `ℹ️  Import Archive keybinding: ${importBinding.key || "none"}`
        );

        // Should have 'when' clause (not global)
        if (!importBinding.when) {
          console.warn(
            `⚠️  Import Archive keybinding has no 'when' clause (works everywhere)`
          );
        }
      } else {
        console.log(
          `ℹ️  Import Archive has no keybinding (users must use Command Palette)`
        );
      }
    });

    test("Refresh commands should have consistent keybindings", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const refreshBindings = keybindings.filter(
        (b: any) => b.command.includes("refresh") || b.command.includes("Refresh")
      );

      if (refreshBindings.length > 0) {
        console.log(`ℹ️  Refresh keybindings:`);
        for (const binding of refreshBindings) {
          console.log(`  - ${binding.command}: ${binding.key}`);
        }

        // Refresh commands often use F5
        const usesF5 = refreshBindings.some((b: any) =>
          b.key?.toLowerCase().includes("f5")
        );

        if (!usesF5 && refreshBindings.length > 0) {
          console.log(
            `💡 Consider: F5 is common convention for refresh commands`
          );
        }
      }
    });
  });

  suite("7. Cross-Platform Compatibility", () => {
    test("Keybindings should work on all platforms", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const platformIssues: string[] = [];

      for (const binding of keybindings) {
        // If has platform-specific, should cover all major platforms
        const hasPlatformSpecific = binding.mac || binding.linux || binding.win;

        if (hasPlatformSpecific) {
          const platforms = [];
          if (!binding.mac) platforms.push("mac");
          if (!binding.linux) platforms.push("linux");
          if (!binding.win) platforms.push("win");

          if (platforms.length > 0 && !binding.key) {
            platformIssues.push(
              `"${binding.command}" missing on: ${platforms.join(", ")} (no default 'key')`
            );
          }
        }
      }

      if (platformIssues.length > 0) {
        console.warn(
          `⚠️  Keybindings missing on some platforms:\n${platformIssues.join("\n")}\n\n` +
          `Add 'key' for default binding or platform-specific keys`
        );
      }
    });

    test("Mac keybindings should use Cmd appropriately", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      let macBindingsCount = 0;
      let usesCmd = 0;

      for (const binding of keybindings) {
        if (binding.mac) {
          macBindingsCount++;
          if (binding.mac.toLowerCase().includes("cmd+")) {
            usesCmd++;
          }
        }
      }

      if (macBindingsCount > 0) {
        const cmdPercentage = (usesCmd / macBindingsCount * 100).toFixed(0);
        console.log(
          `ℹ️  Mac keybindings: ${macBindingsCount} total, ${usesCmd} use 'cmd' (${cmdPercentage}%)`
        );

        if (usesCmd === 0 && macBindingsCount > 0) {
          console.log(
            `💡 Mac keybindings should typically use 'cmd' instead of 'ctrl'`
          );
        }
      }
    });
  });

  suite("8. Summary Report", () => {
    test("Generate keybinding health report", () => {
      const keybindings = packageJson.contributes?.keybindings || [];
      const withWhen = keybindings.filter((b: any) => b.when).length;
      const withMac = keybindings.filter((b: any) => b.mac).length;
      const withLinux = keybindings.filter((b: any) => b.linux).length;
      const withWin = keybindings.filter((b: any) => b.win).length;

      console.log("\n" + "=".repeat(60));
      console.log("📊 KEYBINDING WIRING HEALTH REPORT");
      console.log("=".repeat(60));
      console.log(`Total keybindings:          ${keybindings.length}`);
      console.log(`With 'when' clause:         ${withWhen}`);
      console.log(`With Mac-specific key:      ${withMac}`);
      console.log(`With Linux-specific key:    ${withLinux}`);
      console.log(`With Windows-specific key:  ${withWin}`);
      console.log("-".repeat(60));

      if (keybindings.length > 0) {
        console.log("\nConfigured keybindings:");
        for (const binding of keybindings) {
          const key = binding.key || binding.mac || binding.linux || binding.win || "none";
          const when = binding.when ? ` (when: ${binding.when.substring(0, 30)}...)` : "";
          console.log(`  ${key.padEnd(20)} → ${binding.command}${when}`);
        }
      } else {
        console.log("\nNo keybindings configured (users must use Command Palette)");
      }

      console.log("=".repeat(60) + "\n");

      assert.ok(true);
    });
  });
});
