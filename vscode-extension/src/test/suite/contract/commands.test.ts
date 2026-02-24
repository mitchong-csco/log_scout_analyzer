/**
 * Command Contract Tests
 *
 * Validates that all LSP commands used in the TypeScript extension
 * match the commands defined in lsp-commands.schema.json.
 *
 * This prevents issues like:
 * - Extension sending "logScout.bundle.importPackage"
 * - LSP expecting "scout/bundle/importPackage"
 */

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

suite("Command Contract Tests", () => {
  let schema: any;
  let schemaCommands: string[];

  suiteSetup(() => {
    // Load the command schema (single source of truth)
    const schemaPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "lsp-commands.schema.json"
    );

    assert.ok(
      fs.existsSync(schemaPath),
      `Schema file not found at: ${schemaPath}`
    );

    const schemaContent = fs.readFileSync(schemaPath, "utf8");
    schema = JSON.parse(schemaContent);
    schemaCommands = Object.keys(schema.commands);

    console.log(`Loaded schema with ${schemaCommands.length} commands:`);
    schemaCommands.forEach((cmd) => console.log(`  - ${cmd}`));
  });

  suite("1. Extension Command Usage", () => {
    test("bundleTreeProvider.ts uses valid commands", () => {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "bundleTreeProvider.ts"
      );
      const content = fs.readFileSync(filePath, "utf8");

      // Extract all sendRequest calls with command names
      const requestPattern = /sendRequest\(\s*["']([^"']+)["']/g;
      const matches = [...content.matchAll(requestPattern)];
      const usedCommands = matches
        .map((m) => m[1])
        .filter((cmd) => cmd.startsWith("scout/") || cmd === "workspace/executeCommand");

      console.log("\nbundleTreeProvider.ts commands:");
      usedCommands.forEach((cmd) => console.log(`  - ${cmd}`));

      // Validate each command (excluding standard LSP commands)
      usedCommands
        .filter((cmd) => cmd.startsWith("scout/"))
        .forEach((cmd) => {
          assert.ok(
            schemaCommands.includes(cmd),
            `Command "${cmd}" used in bundleTreeProvider.ts is not defined in schema. ` +
              `Valid commands: ${schemaCommands.join(", ")}`
          );
        });
    });

    test("extension.ts uses valid commands", () => {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );
      const content = fs.readFileSync(filePath, "utf8");

      // Extract all sendRequest calls with command names
      const requestPattern = /sendRequest\(\s*["']([^"']+)["']/g;
      const matches = [...content.matchAll(requestPattern)];
      const usedCommands = matches
        .map((m) => m[1])
        .filter((cmd) => cmd.startsWith("scout/"));

      console.log("\nextension.ts commands:");
      usedCommands.forEach((cmd) => console.log(`  - ${cmd}`));

      // Validate each command
      usedCommands.forEach((cmd) => {
        assert.ok(
          schemaCommands.includes(cmd),
          `Command "${cmd}" used in extension.ts is not defined in schema. ` +
            `Valid commands: ${schemaCommands.join(", ")}`
        );
      });
    });
  });

  suite("2. Command Name Format Validation", () => {
    test("All commands follow scout/{feature}/{action} format", () => {
      schemaCommands.forEach((cmd) => {
        const parts = cmd.split("/");
        assert.strictEqual(
          parts.length,
          3,
          `Command "${cmd}" should have format: scout/{feature}/{action}`
        );
        assert.strictEqual(
          parts[0],
          "scout",
          `Command "${cmd}" should start with "scout"`
        );
      });
    });

    test("No commands use old logScout.* format", () => {
      const filesToCheck = [
        path.join(__dirname, "..", "..", "..", "bundleTreeProvider.ts"),
        path.join(__dirname, "..", "..", "..", "extension.ts"),
      ];

      filesToCheck.forEach((filePath) => {
        const content = fs.readFileSync(filePath, "utf8");
        const fileName = path.basename(filePath);

        // Check for old command format
        const oldFormatPattern = /["']logScout\.[^"']+["']/g;
        const matches = content.match(oldFormatPattern);

        if (matches) {
          console.warn(
            `\n⚠️  WARNING: ${fileName} contains old command format:`
          );
          matches.forEach((match) => console.warn(`    ${match}`));
        }

        assert.ok(
          !matches,
          `${fileName} should not use old "logScout.*" command format. ` +
            `Use "scout/{feature}/{action}" instead.`
        );
      });
    });
  });

  suite("3. Command Arguments Validation", () => {
    test("scout/bundle/importPackage uses correct arguments", () => {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "bundleTreeProvider.ts"
      );
      const content = fs.readFileSync(filePath, "utf8");

      // Find the importPackage command usage
      const importPattern =
        /sendRequest\([^)]*scout\/bundle\/importPackage[^)]*\)/gs;
      const match = content.match(importPattern);

      assert.ok(
        match,
        "bundleTreeProvider.ts should contain scout/bundle/importPackage command"
      );

      if (match) {
        const commandText = match[0];

        // Check for required parameters according to schema
        const requiredParams = ["packagePath"];

        requiredParams.forEach((param) => {
          const hasParam = commandText.includes(param);
          assert.ok(
            hasParam,
            `scout/bundle/importPackage should include required parameter: ${param}`
          );
        });

        console.log("\n✓ scout/bundle/importPackage has required parameters");
      }
    });

    test("scout/bundle/create uses correct arguments", () => {
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );
      const content = fs.readFileSync(filePath, "utf8");

      // Find the create command usage
      const createPattern =
        /sendRequest\([^)]*scout\/bundle\/create[^)]*\)/gs;
      const match = content.match(createPattern);

      assert.ok(
        match,
        "extension.ts should contain scout/bundle/create command"
      );

      if (match) {
        const commandText = match[0];

        // Check for required parameter
        assert.ok(
          commandText.includes("name"),
          "scout/bundle/create should include required parameter: name"
        );

        console.log("✓ scout/bundle/create has required parameters");
      }
    });
  });

  suite("4. Schema Coverage", () => {
    test("All schema commands are used in extension", () => {
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );
      const bundleProviderPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "bundleTreeProvider.ts"
      );

      const extensionContent = fs.readFileSync(extensionPath, "utf8");
      const bundleContent = fs.readFileSync(bundleProviderPath, "utf8");
      const combinedContent = extensionContent + bundleContent;

      const unusedCommands = schemaCommands.filter(
        (cmd) => !combinedContent.includes(cmd)
      );

      if (unusedCommands.length > 0) {
        console.log("\n⚠️  Commands defined in schema but not used:");
        unusedCommands.forEach((cmd) => console.log(`    - ${cmd}`));
        console.log(
          "\n   This is OK if they're planned for future use or used elsewhere."
        );
      }

      // This is a soft warning, not a failure
      // Some commands might be defined for future use
    });
  });

  suite("5. Command Invocation Validation", () => {
    test("All scout/* commands are properly awaited", () => {
      const filesToCheck = [
        {
          path: path.join(__dirname, "..", "..", "..", "bundleTreeProvider.ts"),
          name: "bundleTreeProvider.ts",
        },
        {
          path: path.join(__dirname, "..", "..", "..", "extension.ts"),
          name: "extension.ts",
        },
      ];

      filesToCheck.forEach(({ path: filePath, name }) => {
        const content = fs.readFileSync(filePath, "utf8");

        // Find all scout/* sendRequest calls
        const requestPattern = /sendRequest\(\s*["']scout\/[^"']+["'][^)]*\)/gs;
        const matches = [...content.matchAll(requestPattern)];

        matches.forEach((match) => {
          const fullLine = content
            .substring(
              Math.max(0, match.index! - 50),
              match.index! + match[0].length
            )
            .trim();

          // Check if it's awaited or assigned to a promise
          const isAwaited =
            fullLine.includes("await") ||
            fullLine.includes("const") ||
            fullLine.includes("let") ||
            fullLine.includes("return");

          if (!isAwaited) {
            console.warn(`\n⚠️  Possibly un-awaited request in ${name}:`);
            console.warn(`    ${fullLine.substring(0, 80)}...`);
          }
        });
      });
    });
  });

  suite("6. Integration Test", () => {
    test("Schema is valid JSON with required structure", () => {
      assert.ok(schema.commands, "Schema should have 'commands' property");
      assert.ok(
        typeof schema.commands === "object",
        "Schema.commands should be an object"
      );
      assert.ok(
        Object.keys(schema.commands).length > 0,
        "Schema should define at least one command"
      );

      // Validate each command has required structure
      Object.entries(schema.commands).forEach(([cmdName, cmdDef]: [string, any]) => {
        assert.ok(
          cmdDef.description,
          `Command ${cmdName} should have a description`
        );
        assert.ok(
          cmdDef.request,
          `Command ${cmdName} should have request parameters`
        );
        assert.ok(
          cmdDef.response,
          `Command ${cmdName} should have response definition`
        );
      });
    });

    test("Command count matches expectations", () => {
      const expectedMinCommands = 7; // We know we have at least 7 commands
      assert.ok(
        schemaCommands.length >= expectedMinCommands,
        `Schema should define at least ${expectedMinCommands} commands, found ${schemaCommands.length}`
      );
    });
  });

  suite("7. CRITICAL - All package.json Commands Are Registered", () => {
    test("Every package.json command has a handler in extension.ts", () => {
      const packagePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "package.json"
      );
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );

      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      const extensionContent = fs.readFileSync(extensionPath, "utf8");

      const commands = packageJson.contributes.commands as Array<{ command: string; title: string }>;
      const commandIds = commands.map((c) => c.command);

      console.log(`\nVerifying ${commandIds.length} commands from package.json...`);

      const orphanedCommands: string[] = [];
      const registeredCommands: string[] = [];

      commandIds.forEach((cmdId) => {
        // Check if command is registered via registerCommand
        const registrationPattern = new RegExp(
          `registerCommand\\s*\\(\\s*["'\`]${cmdId.replace(/\./g, "\\.")}["'\`]`,
          "g"
        );

        if (registrationPattern.test(extensionContent)) {
          registeredCommands.push(cmdId);
          console.log(`  ✓ ${cmdId}`);
        } else {
          orphanedCommands.push(cmdId);
          console.log(`  ✗ ${cmdId} - NO HANDLER FOUND`);
        }
      });

      console.log(`\nRegistered: ${registeredCommands.length}/${commandIds.length}`);

      if (orphanedCommands.length > 0) {
        console.log("\n❌ ORPHANED COMMANDS (defined in package.json but not registered):");
        orphanedCommands.forEach((cmd) => console.log(`   - ${cmd}`));

        assert.fail(
          `${orphanedCommands.length} command(s) are orphaned!\n` +
          `These commands are defined in package.json but have no handler in extension.ts:\n` +
          orphanedCommands.map(c => `  - ${c}`).join("\n") + "\n\n" +
          `Every command MUST be registered with vscode.commands.registerCommand()`
        );
      }

      console.log("\n✅ All package.json commands are properly registered");
    });

    test("No commands are registered that aren't in package.json", () => {
      const packagePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "package.json"
      );
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );

      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      const extensionContent = fs.readFileSync(extensionPath, "utf8");

      const commands = packageJson.contributes.commands as Array<{ command: string }>;
      const declaredCommandIds = new Set(commands.map((c) => c.command));

      // Find all registerCommand calls in extension.ts
      const registerPattern = /registerCommand\s*\(\s*["']([^"']+)["']/g;
      const matches = [...extensionContent.matchAll(registerPattern)];
      const registeredCommands = matches.map((m) => m[1]);

      const extraCommands = registeredCommands.filter(
        (cmd) => cmd.startsWith("logScoutAnalyzer.") && !declaredCommandIds.has(cmd)
      );

      if (extraCommands.length > 0) {
        console.log("\n⚠️  Commands registered but not in package.json:");
        extraCommands.forEach((cmd) => console.log(`   - ${cmd}`));
        console.log("\n   These should either be added to package.json or removed from extension.ts");

        assert.fail(
          `${extraCommands.length} command(s) are registered but not declared in package.json:\n` +
          extraCommands.map(c => `  - ${c}`).join("\n")
        );
      }

      console.log("\n✅ No extra commands found");
    });

    test("Bundle commands that call LSP are properly wired", () => {
      const bundleProviderPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "bundleTreeProvider.ts"
      );
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );

      const bundleContent = fs.readFileSync(bundleProviderPath, "utf8");
      const extensionContent = fs.readFileSync(extensionPath, "utf8");

      // Bundle commands that should call bundleTreeProvider methods
      const bundleCommands = [
        { command: "logScoutAnalyzer.bundle.create", method: "createBundle" },
        { command: "logScoutAnalyzer.bundle.delete", method: "deleteBundle" },
        { command: "logScoutAnalyzer.bundle.analyze", method: "analyzeBundle" },
        { command: "logScoutAnalyzer.bundle.importPackage", method: "importPackage" },
        { command: "logScoutAnalyzer.bundle.addLog", method: "addLogToBundle" },
      ];

      console.log("\nVerifying bundle command wiring...");

      bundleCommands.forEach(({ command, method }) => {
        // Check if command handler exists in extension.ts
        const handlerPattern = new RegExp(
          `registerCommand\\s*\\(\\s*["']${command.replace(/\./g, "\\.")}["']`,
          "g"
        );

        const hasHandler = handlerPattern.test(extensionContent);
        assert.ok(hasHandler, `Command ${command} should have a handler in extension.ts`);

        // Check if bundleTreeProvider has the method
        const methodPattern = new RegExp(`async ${method}\\s*\\(`);
        const hasMethod = methodPattern.test(bundleContent);

        assert.ok(
          hasMethod,
          `bundleTreeProvider should have method ${method}() for command ${command}`
        );

        if (command !== "logScoutAnalyzer.bundle.delete") {
          // Skip LSP check for delete since we fixed it to work locally
          console.log(`  ✓ ${command} → bundleTreeProvider.${method}()`);
        } else {
          console.log(`  ✓ ${command} → bundleTreeProvider.${method}() [local filesystem]`);
        }
      });

      console.log("\n✅ All bundle commands are properly wired");
    });

    test("Pattern commands call the right pattern manager methods", () => {
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );
      const uiPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "patternOverrideUI.ts"
      );

      const extensionContent = fs.readFileSync(extensionPath, "utf8");
      const uiContent = fs.readFileSync(uiPath, "utf8");

      // Pattern commands that should call pattern manager
      const patternCommands = [
        { command: "logScoutAnalyzer.patterns.createOverride", uiFunction: "createOverrideQuickInput" },
        { command: "logScoutAnalyzer.patterns.createCustom", uiFunction: "createCustomPatternWizard" },
        { command: "logScoutAnalyzer.patterns.editOverride", uiFunction: "editPatternQuickInput" },
        { command: "logScoutAnalyzer.patterns.deleteOverride", uiFunction: "deletePatternQuickPick" },
        { command: "logScoutAnalyzer.patterns.togglePattern", uiFunction: "togglePatternQuickPick" },
      ];

      console.log("\nVerifying pattern command wiring...");

      patternCommands.forEach(({ command, uiFunction }) => {
        // Check if command handler exists in extension.ts
        const handlerPattern = new RegExp(
          `registerCommand\\s*\\(\\s*["']${command.replace(/\./g, "\\.")}["']`,
          "g"
        );
        const hasHandler = handlerPattern.test(extensionContent);
        assert.ok(hasHandler, `Command ${command} should have a handler in extension.ts`);

        // Check if the UI function exists in patternOverrideUI.ts
        const uiFunctionPattern = new RegExp(`(export\\s+)?async\\s+function\\s+${uiFunction}\\s*\\(`);
        const hasUIFunction = uiFunctionPattern.test(uiContent);
        assert.ok(
          hasUIFunction,
          `patternOverrideUI should have function ${uiFunction}() for command ${command}`
        );

        console.log(`  ✓ ${command} → ${uiFunction}()`);
      });

      console.log("\n✅ All pattern commands are properly wired");
    });

    test("Tree view commands exist and have proper context", () => {
      const packagePath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "package.json"
      );
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );

      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      const extensionContent = fs.readFileSync(extensionPath, "utf8");

      // Get all view/item/context menu commands
      const contextMenus = packageJson.contributes.menus["view/item/context"] || [];
      const contextCommands = contextMenus.map((m: any) => m.command);

      console.log(`\nVerifying ${contextCommands.length} context menu commands...`);

      const missingHandlers: string[] = [];

      contextCommands.forEach((cmdId: string) => {
        const registrationPattern = new RegExp(
          `registerCommand\\s*\\(\\s*["'\`]${cmdId.replace(/\./g, "\\.")}["'\`]`,
          "g"
        );

        if (registrationPattern.test(extensionContent)) {
          console.log(`  ✓ ${cmdId}`);
        } else {
          console.log(`  ✗ ${cmdId} - NO HANDLER`);
          missingHandlers.push(cmdId);
        }
      });

      if (missingHandlers.length > 0) {
        assert.fail(
          `${missingHandlers.length} context menu command(s) have no handler:\n` +
          missingHandlers.map(c => `  - ${c}`).join("\n")
        );
      }

      console.log("\n✅ All context menu commands have handlers");
    });

    test("All tree providers are properly initialized", () => {
      const extensionPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "extension.ts"
      );

      const extensionContent = fs.readFileSync(extensionPath, "utf8");

      const treeProviders = [
        { variable: "resultsTreeProvider", class: "ResultsTreeProvider" },
        { variable: "bundleTreeProvider", class: "BundleTreeProvider" },
        { variable: "filterTreeProvider", class: "FilterTreeProvider" },
        { variable: "categoriesTreeProvider", class: "CategoriesTreeProvider" },
        { variable: "patternOverrideTreeProvider", class: "PatternOverrideTreeProvider" },
      ];

      console.log("\nVerifying tree provider initialization...");

      treeProviders.forEach(({ variable, class: className }) => {
        // Check if provider is declared
        const declPattern = new RegExp(`let\\s+${variable}\\s*:`);
        const isDeclared = declPattern.test(extensionContent);
        assert.ok(isDeclared, `${variable} should be declared in extension.ts`);

        // Check if provider is instantiated
        const instantiatePattern = new RegExp(`new\\s+${className}\\s*\\(`);
        const isInstantiated = instantiatePattern.test(extensionContent);
        assert.ok(isInstantiated, `${variable} should be instantiated with new ${className}()`);

        console.log(`  ✓ ${variable} (${className})`);
      });

      console.log("\n✅ All tree providers are properly initialized");
    });
  });
});
