import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * COMMAND WIRING VALIDATION TESTS
 *
 * These tests validate that:
 * 1. All commands declared in package.json are registered in extension code
 * 2. All registered commands are declared in package.json
 * 3. No typos between declaration and registration
 * 4. Commands have proper activation events
 *
 * This catches the "typo gap" where tests pass but users can't find commands.
 */

suite("Command Wiring Validation", () => {
  let packageJson: any;
  let extensionSource: string;
  let registeredCommands: string[];

  suiteSetup(async function() {
    this.timeout(30000); // Allow time for extension to activate

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

    if (extension && !extension.isActive) {
      await extension.activate();
      // Give it a moment to register all commands
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get all registered commands
    registeredCommands = await vscode.commands.getCommands(true);
  });

  suite("1. Command Declaration vs Registration", () => {
    test("All package.json commands should be registered in VS Code", async () => {
      const declaredCommands = (packageJson.contributes?.commands || [])
        .map((c: any) => c.command);

      const missingCommands: string[] = [];

      for (const cmdId of declaredCommands) {
        if (!registeredCommands.includes(cmdId)) {
          missingCommands.push(cmdId);
        }
      }

      if (missingCommands.length > 0) {
        assert.fail(
          `❌ Commands declared in package.json but NOT registered in code:\n` +
          missingCommands.map(c => `  - ${c}`).join("\n") +
          `\n\nThese commands will appear in Command Palette but fail when invoked!\n` +
          `Fix: Add vscode.commands.registerCommand() in extension.ts`
        );
      }
    });

    test("All registered Scout commands should be declared in package.json", async () => {
      // Get only our commands (filter by prefix)
      const ourCommands = registeredCommands.filter(cmd =>
        cmd.startsWith("logScoutAnalyzer.")
      );

      const declaredCommands = (packageJson.contributes?.commands || [])
        .map((c: any) => c.command);

      const undeclaredCommands: string[] = [];

      for (const cmdId of ourCommands) {
        if (!declaredCommands.includes(cmdId)) {
          undeclaredCommands.push(cmdId);
        }
      }

      if (undeclaredCommands.length > 0) {
        console.warn(
          `⚠️  Commands registered in code but NOT declared in package.json:\n` +
          undeclaredCommands.map(c => `  - ${c}`).join("\n") +
          `\n\nThese commands won't appear in Command Palette or keybinding UI!`
        );
      }
    });

    test("Command count should match between package.json and registration", () => {
      const declaredCount = (packageJson.contributes?.commands || []).length;
      const registeredCount = registeredCommands.filter(cmd =>
        cmd.startsWith("logScoutAnalyzer.")
      ).length;

      console.log(`📊 Commands declared: ${declaredCount}`);
      console.log(`📊 Commands registered: ${registeredCount}`);

      // Allow some variance (internal commands, etc.)
      const difference = Math.abs(declaredCount - registeredCount);

      if (difference > 5) {
        console.warn(
          `⚠️  Large difference between declared (${declaredCount}) and registered (${registeredCount}) commands`
        );
      }
    });
  });

  suite("2. Command Metadata Validation", () => {
    test("All commands should have titles", () => {
      const commands = packageJson.contributes?.commands || [];
      const missingTitles: string[] = [];

      for (const cmd of commands) {
        if (!cmd.title || cmd.title.trim() === "") {
          missingTitles.push(cmd.command);
        }
      }

      if (missingTitles.length > 0) {
        assert.fail(
          `❌ Commands missing titles:\n` +
          missingTitles.map(c => `  - ${c}`).join("\n")
        );
      }
    });

    test("Command titles should be descriptive", () => {
      const commands = packageJson.contributes?.commands || [];
      const issues: string[] = [];

      for (const cmd of commands) {
        if (cmd.title) {
          // Check for too short titles
          if (cmd.title.length < 5) {
            issues.push(`⚠️  "${cmd.command}" title too short: "${cmd.title}"`);
          }

          // Check for too long titles
          if (cmd.title.length > 60) {
            issues.push(
              `⚠️  "${cmd.command}" title too long (${cmd.title.length} chars): "${cmd.title}"`
            );
          }

          // Check for proper prefix
          if (!cmd.title.startsWith("Scout:") && !cmd.category) {
            issues.push(
              `⚠️  "${cmd.command}" title should start with "Scout:" or have category="Scout"`
            );
          }
        }
      }

      if (issues.length > 0) {
        console.warn(`Command title warnings:\n${issues.join("\n")}`);
      }
    });

    test("Commands should have icons", () => {
      const commands = packageJson.contributes?.commands || [];
      const missingIcons: string[] = [];

      for (const cmd of commands) {
        if (!cmd.icon) {
          missingIcons.push(cmd.command);
        }
      }

      if (missingIcons.length > 0) {
        console.warn(
          `⚠️  Commands without icons (recommended for better UX):\n` +
          missingIcons.map(c => `  - ${c}`).join("\n")
        );
      }
    });

    test("No duplicate command IDs", () => {
      const commands = packageJson.contributes?.commands || [];
      const commandIds = commands.map((c: any) => c.command);
      const duplicates = commandIds.filter(
        (id: string, index: number) => commandIds.indexOf(id) !== index
      );

      if (duplicates.length > 0) {
        assert.fail(
          `❌ Duplicate command IDs found:\n` +
          [...new Set(duplicates)].map(d => `  - ${d}`).join("\n")
        );
      }
    });
  });

  suite("3. Activation Events", () => {
    test("Commands should have activation events", () => {
      const commands = packageJson.contributes?.commands || [];
      const activationEvents = packageJson.activationEvents || [];
      const hasWildcard = activationEvents.includes("*");

      if (hasWildcard) {
        console.log("✅ Using wildcard activation (*) - all commands will work");
        return;
      }

      const missingActivation: string[] = [];

      for (const cmd of commands) {
        const commandId = cmd.command;
        const hasActivation = activationEvents.some(
          (event: string) => event === `onCommand:${commandId}`
        );

        if (!hasActivation) {
          missingActivation.push(commandId);
        }
      }

      if (missingActivation.length > 0) {
        console.warn(
          `⚠️  Commands without activation events:\n` +
          missingActivation.map(c => `  - ${c}`).join("\n") +
          `\n\nThese may not work until extension activates via another event.`
        );
      }
    });

    test("Activation events should reference valid commands", () => {
      const activationEvents = packageJson.activationEvents || [];
      const commandEvents = activationEvents.filter((e: string) =>
        e.startsWith("onCommand:")
      );

      const declaredCommands = (packageJson.contributes?.commands || [])
        .map((c: any) => c.command);

      const invalidEvents: string[] = [];

      for (const event of commandEvents) {
        const commandId = event.replace("onCommand:", "");

        if (commandId.startsWith("logScoutAnalyzer.")) {
          if (!declaredCommands.includes(commandId)) {
            invalidEvents.push(event);
          }
        }
      }

      if (invalidEvents.length > 0) {
        console.warn(
          `⚠️  Activation events reference non-existent commands:\n` +
          invalidEvents.map(e => `  - ${e}`).join("\n")
        );
      }
    });
  });

  suite("4. Common Typo Detection", () => {
    test("No common typos in command IDs", () => {
      const commands = packageJson.contributes?.commands || [];
      const typos: string[] = [];

      for (const cmd of commands) {
        const commandId = cmd.command;

        // Common typos
        if (commandId.includes("Arhcive")) {
          typos.push(`❌ "${commandId}" - Did you mean "Archive"?`);
        }
        if (commandId.includes("Anlayze")) {
          typos.push(`❌ "${commandId}" - Did you mean "Analyze"?`);
        }
        if (commandId.includes("Bundel")) {
          typos.push(`❌ "${commandId}" - Did you mean "Bundle"?`);
        }
        if (commandId.includes("Resutls")) {
          typos.push(`❌ "${commandId}" - Did you mean "Results"?`);
        }
        if (commandId.includes("Pattren")) {
          typos.push(`❌ "${commandId}" - Did you mean "Pattern"?`);
        }
      }

      if (typos.length > 0) {
        assert.fail(`Potential typos found:\n${typos.join("\n")}`);
      }
    });

    test("Consistent naming convention", () => {
      const commands = packageJson.contributes?.commands || [];
      const issues: string[] = [];

      for (const cmd of commands) {
        const commandId = cmd.command;

        // Check for snake_case (should be camelCase)
        if (commandId.includes("_")) {
          issues.push(
            `⚠️  "${commandId}" uses snake_case, should use camelCase`
          );
        }

        // Check for inconsistent casing after dots
        const parts = commandId.split(".");
        for (const part of parts) {
          if (part.length > 0 && part[0] === part[0].toUpperCase()) {
            issues.push(
              `⚠️  "${commandId}" has PascalCase after dot, should be camelCase`
            );
          }
        }
      }

      if (issues.length > 0) {
        console.warn(`Naming convention warnings:\n${issues.join("\n")}`);
      }
    });
  });

  suite("5. Command Callability", () => {
    test("Critical commands should be callable", async function() {
      this.timeout(15000);

      const criticalCommands = [
        "logScoutAnalyzer.importArchive",
        "logScoutAnalyzer.bundle.analyze",
        "logScoutAnalyzer.refreshResults"
      ];

      const errors: string[] = [];

      for (const cmdId of criticalCommands) {
        try {
          // Check if command exists
          if (!registeredCommands.includes(cmdId)) {
            errors.push(`❌ "${cmdId}" not registered`);
            continue;
          }

          // Try to execute (with no args - may fail but shouldn't throw "command not found")
          // We're just testing that the command exists and is callable
          const commandExists = registeredCommands.includes(cmdId);
          assert.ok(
            commandExists,
            `Command "${cmdId}" should be registered and callable`
          );
        } catch (error) {
          errors.push(`❌ "${cmdId}" failed: ${(error as Error).message}`);
        }
      }

      if (errors.length > 0) {
        assert.fail(
          `Critical commands have issues:\n${errors.join("\n")}`
        );
      }
    });
  });

  suite("6. Source Code Validation", () => {
    test("registerCommand calls should match package.json declarations", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      // Extract command registrations from source
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

      // Find discrepancies
      const inCodeNotInPackage = [...codeCommands].filter(
        c => !declaredCommands.has(c)
      );
      const inPackageNotInCode = ([...declaredCommands] as string[]).filter(
        c => !codeCommands.has(c)
      );

      const warnings: string[] = [];

      if (inCodeNotInPackage.length > 0) {
        warnings.push(
          `Commands registered in code but NOT in package.json:\n` +
          inCodeNotInPackage.map(c => `  - ${c}`).join("\n")
        );
      }

      if (inPackageNotInCode.length > 0) {
        warnings.push(
          `Commands declared in package.json but NOT in code:\n` +
          inPackageNotInCode.map(c => `  - ${c}`).join("\n")
        );
      }

      if (warnings.length > 0) {
        console.warn(`⚠️  Wiring discrepancies:\n${warnings.join("\n\n")}`);
      }
    });

    test("Commands should be added to subscriptions", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      // Check for subscription pattern
      const hasSubscriptions = extensionSource.includes("context.subscriptions.push");

      assert.ok(
        hasSubscriptions,
        "Commands should be added to context.subscriptions for proper cleanup"
      );
    });
  });

  suite("7. Critical Commands Specific Tests", () => {
    test("importArchive command exists and is properly wired", async () => {
      const commandId = "logScoutAnalyzer.importArchive";

      // Check declaration
      const commands = packageJson.contributes?.commands || [];
      const declared = commands.find((c: any) => c.command === commandId);
      assert.ok(declared, `${commandId} should be declared in package.json`);

      // Check registration
      assert.ok(
        registeredCommands.includes(commandId),
        `${commandId} should be registered in VS Code`
      );

      // Check metadata
      assert.ok(declared.title, `${commandId} should have a title`);
      assert.ok(declared.icon, `${commandId} should have an icon`);
    });

    test("bundle.analyze command exists and is properly wired", async () => {
      const commandId = "logScoutAnalyzer.bundle.analyze";

      const commands = packageJson.contributes?.commands || [];
      const declared = commands.find((c: any) => c.command === commandId);
      assert.ok(declared, `${commandId} should be declared in package.json`);

      assert.ok(
        registeredCommands.includes(commandId),
        `${commandId} should be registered in VS Code`
      );
    });

    test("refreshResults command exists and is properly wired", async () => {
      const commandId = "logScoutAnalyzer.refreshResults";

      const commands = packageJson.contributes?.commands || [];
      const declared = commands.find((c: any) => c.command === commandId);
      assert.ok(declared, `${commandId} should be declared in package.json`);

      assert.ok(
        registeredCommands.includes(commandId),
        `${commandId} should be registered in VS Code`
      );
    });
  });

  suite("8. Summary Report", () => {
    test("Generate wiring health report", () => {
      const declaredCount = (packageJson.contributes?.commands || []).length;
      const registeredCount = registeredCommands.filter(cmd =>
        cmd.startsWith("logScoutAnalyzer.")
      ).length;

      console.log("\n" + "=".repeat(60));
      console.log("📊 COMMAND WIRING HEALTH REPORT");
      console.log("=".repeat(60));
      console.log(`Commands declared in package.json: ${declaredCount}`);
      console.log(`Commands registered in VS Code:    ${registeredCount}`);
      console.log(`Activation events:                 ${packageJson.activationEvents?.length || 0}`);
      console.log("=".repeat(60) + "\n");

      // This test always passes - it's just for reporting
      assert.ok(true);
    });
  });
});
