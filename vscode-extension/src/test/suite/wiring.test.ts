import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests to validate extension wiring
 * These tests don't require VS Code to run - they validate configuration and code structure
 */

suite("Extension Wiring Validation", () => {
  const extensionRoot = path.resolve(__dirname, "../../../");
  const packageJsonPath = path.join(extensionRoot, "package.json");
  const extensionTsPath = path.join(extensionRoot, "src", "extension.ts");
  const bundleProviderPath = path.join(
    extensionRoot,
    "src",
    "bundleTreeProvider.ts",
  );

  let packageJson: any;
  let extensionTs: string;
  let bundleProviderTs: string;

  suiteSetup(() => {
    // Load files once for all tests
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    extensionTs = fs.readFileSync(extensionTsPath, "utf8");

    if (fs.existsSync(bundleProviderPath)) {
      bundleProviderTs = fs.readFileSync(bundleProviderPath, "utf8");
    } else {
      bundleProviderTs = "";
    }
  });

  suite("package.json Configuration", () => {
    test("Should have correct extension metadata", () => {
      assert.strictEqual(packageJson.name, "log-scout-analyzer");
      assert.strictEqual(packageJson.publisher, "log-scout-team");
      assert.ok(packageJson.version, "Version should be defined");
      assert.ok(
        packageJson.engines.vscode,
        "VS Code engine version should be defined",
      );
    });

    test("Should have all required views defined", () => {
      const views = packageJson.contributes?.views;
      assert.ok(views, "Views should be defined");

      const scoutViews = views["scout-analyzer"];
      assert.ok(scoutViews, "scout-analyzer view container should exist");

      const viewIds = scoutViews.map((v: any) => v.id);
      assert.ok(
        viewIds.includes("scoutBundles"),
        "scoutBundles view should be defined",
      );
      assert.ok(
        viewIds.includes("scoutResults"),
        "scoutResults view should be defined",
      );
      assert.ok(
        viewIds.includes("scoutCategories"),
        "scoutCategories view should be defined",
      );
    });
  });

  suite("Import Archive Command Wiring", () => {
    test("Import Archive command should be registered in package.json", () => {
      const commands = packageJson.contributes?.commands || [];
      const importCommand = commands.find(
        (cmd: any) => cmd.command === "logScoutAnalyzer.importArchive",
      );

      assert.ok(
        importCommand,
        "Import Archive command should be defined in package.json",
      );
      assert.strictEqual(
        importCommand.command,
        "logScoutAnalyzer.importArchive",
      );
    });

    test("Import Archive command should NOT have duplicate Scout prefix", () => {
      const commands = packageJson.contributes?.commands || [];
      const importCommand = commands.find(
        (cmd: any) => cmd.command === "logScoutAnalyzer.importArchive",
      );

      assert.ok(importCommand, "Import Archive command should be defined");

      const hasCategory = importCommand.category === "Scout";
      const hasTitlePrefix = importCommand.title.startsWith("Scout:");

      // This is the bug we fixed - should NOT have both
      if (hasCategory && hasTitlePrefix) {
        assert.fail(
          `DUPLICATE PREFIX BUG DETECTED!\n\n` +
            `Command has both:\n` +
            `  category: "${importCommand.category}"\n` +
            `  title: "${importCommand.title}"\n\n` +
            `This will display as "Scout: Scout: Import Log Archive" in VS Code\n\n` +
            `Fix: Remove either the "category" field OR the "Scout:" prefix from title`,
        );
      }

      // Should have one or the other
      assert.ok(
        hasCategory || hasTitlePrefix,
        'Command should have either category="Scout" OR title starting with "Scout:"',
      );
    });

    test("Import Archive command should be in activation events", () => {
      const activationEvents = packageJson.activationEvents || [];
      const hasImportActivation = activationEvents.includes(
        "onCommand:logScoutAnalyzer.importArchive",
      );
      const hasWildcard = activationEvents.includes("*");

      assert.ok(
        hasImportActivation || hasWildcard,
        "Import command should be in activationEvents (or use * wildcard)",
      );
    });

    test("Import Archive command should be registered in extension.ts", () => {
      // Check for command registration (handle multi-line formatting)
      const hasRegistration =
        extensionTs.includes(
          'registerCommand("logScoutAnalyzer.importArchive"',
        ) ||
        extensionTs.includes(
          "registerCommand('logScoutAnalyzer.importArchive'",
        ) ||
        extensionTs.includes(
          "registerCommand(`logScoutAnalyzer.importArchive`",
        ) ||
        // Handle multi-line formatting (command on next line)
        (extensionTs.includes("registerCommand(") &&
          extensionTs.includes('"logScoutAnalyzer.importArchive"'));

      assert.ok(
        hasRegistration,
        "Import Archive command should be registered in extension.ts with vscode.commands.registerCommand",
      );
    });

    test("Import Archive command should call bundleTreeProvider.importPackage", () => {
      assert.ok(
        extensionTs.includes("bundleTreeProvider.importPackage"),
        "Command should call bundleTreeProvider.importPackage() method",
      );
    });

    test("Import Archive command should be added to subscriptions", () => {
      // Look for context.subscriptions.push before or after the command
      const hasSubscription =
        extensionTs.includes("context.subscriptions.push") &&
        extensionTs.includes("logScoutAnalyzer.importArchive");

      assert.ok(
        hasSubscription,
        "Command should be added to context.subscriptions for proper cleanup",
      );
    });
  });

  suite("Bundle Tree Provider Wiring", () => {
    test("BundleTreeProvider should be imported in extension.ts", () => {
      assert.ok(
        extensionTs.includes("BundleTreeProvider") ||
          extensionTs.includes("bundleTreeProvider"),
        "BundleTreeProvider should be imported or referenced in extension.ts",
      );
    });

    test("BundleTreeProvider should have importPackage method", function () {
      if (!bundleProviderTs) {
        this.skip(); // Skip if file doesn't exist
        return;
      }

      // Check for importPackage method definition
      const hasMethod =
        bundleProviderTs.includes("importPackage(") ||
        bundleProviderTs.includes("importPackage (") ||
        bundleProviderTs.includes("async importPackage");

      assert.ok(
        hasMethod,
        "BundleTreeProvider should have importPackage method defined",
      );
    });

    test("BundleTreeProvider should be instantiated in extension.ts", () => {
      const hasInstantiation =
        extensionTs.includes("new BundleTreeProvider") ||
        extensionTs.includes("bundleTreeProvider =");

      assert.ok(
        hasInstantiation,
        "BundleTreeProvider should be instantiated in extension.ts",
      );
    });

    test("BundleTreeProvider should be registered as tree data provider", () => {
      assert.ok(
        extensionTs.includes("vscode.window.registerTreeDataProvider") ||
          extensionTs.includes("vscode.window.createTreeView"),
        "BundleTreeProvider should be registered as a tree data provider",
      );
    });

    test("BundleTreeProvider variable should exist and be accessible", () => {
      // Check for bundleTreeProvider variable declaration
      assert.ok(
        extensionTs.includes("let bundleTreeProvider") ||
          extensionTs.includes("const bundleTreeProvider"),
        "bundleTreeProvider variable should be declared",
      );
    });

    test("Import command should check bundleTreeProvider is initialized", () => {
      assert.ok(
        extensionTs.includes("!bundleTreeProvider") ||
          extensionTs.includes("if (!bundleTreeProvider)") ||
          extensionTs.includes("if (bundleTreeProvider)"),
        "Import command should check if bundleTreeProvider is initialized",
      );
    });
  });

  suite("All Scout Commands Naming Convention", () => {
    test("No Scout commands should have duplicate prefix", () => {
      const commands = packageJson.contributes?.commands || [];
      const scoutCommands = commands.filter(
        (cmd: any) =>
          cmd.command.startsWith("logScoutAnalyzer.") ||
          cmd.title.includes("Scout"),
      );

      const violations: string[] = [];

      for (const cmd of scoutCommands) {
        const hasCategory = cmd.category === "Scout";
        const hasTitlePrefix = cmd.title.startsWith("Scout:");

        if (hasCategory && hasTitlePrefix) {
          violations.push(
            `${cmd.command}: category="${cmd.category}", title="${cmd.title}"`,
          );
        }
      }

      if (violations.length > 0) {
        assert.fail(
          "Found commands with duplicate Scout prefix:\n" +
            violations.map((v) => "  ❌ " + v).join("\n") +
            '\n\nFix: Remove either category OR "Scout:" from title for each command',
        );
      }
    });

    test("All Scout commands should have consistent prefix", () => {
      const commands = packageJson.contributes?.commands || [];
      const scoutCommands = commands.filter((cmd: any) =>
        cmd.command.startsWith("logScoutAnalyzer."),
      );

      for (const cmd of scoutCommands) {
        const hasCategory = cmd.category === "Scout";
        const hasTitlePrefix = cmd.title.startsWith("Scout:");

        assert.ok(
          hasCategory || hasTitlePrefix,
          `Command ${cmd.command} should have either category="Scout" OR title starting with "Scout:". ` +
            `Currently: category="${cmd.category}", title="${cmd.title}"`,
        );
      }
    });
  });

  suite("File Structure Validation", () => {
    test("LSP server binary should exist", () => {
      const lspPath = path.join(
        extensionRoot,
        "bin",
        "log-scout-lsp-server-win.exe",
      );
      assert.ok(
        fs.existsSync(lspPath),
        `LSP server binary should exist at: ${lspPath}\nRun: npm run build:lsp`,
      );
    });

    test("LSP server binary should be reasonable size", () => {
      const lspPath = path.join(
        extensionRoot,
        "bin",
        "log-scout-lsp-server-win.exe",
      );
      if (fs.existsSync(lspPath)) {
        const stats = fs.statSync(lspPath);
        const sizeMB = stats.size / 1024 / 1024;

        assert.ok(
          sizeMB > 1,
          `LSP binary seems too small (${sizeMB.toFixed(2)} MB). Expected > 1 MB`,
        );

        assert.ok(
          sizeMB < 100,
          `LSP binary seems too large (${sizeMB.toFixed(2)} MB). Expected < 100 MB`,
        );
      }
    });

    test("Compiled extension.js should exist", () => {
      const outPath = path.join(extensionRoot, "out", "extension.js");
      assert.ok(
        fs.existsSync(outPath),
        `Compiled extension.js should exist at: ${outPath}\nRun: npm run compile`,
      );
    });

    test("BundleTreeProvider.ts should exist", () => {
      assert.ok(
        fs.existsSync(bundleProviderPath),
        `BundleTreeProvider should exist at: ${bundleProviderPath}`,
      );
    });
  });

  suite("Import Archive File Picker Configuration", () => {
    test("Import command should show file picker with correct filters", () => {
      const importCommandPattern =
        /registerCommand\s*\(\s*["'`]logScoutAnalyzer\.importArchive["'`]/;

      assert.ok(
        importCommandPattern.test(extensionTs),
        "Should find import command registration",
      );

      // Should have showOpenDialog
      assert.ok(
        extensionTs.includes("showOpenDialog"),
        "Import command should call vscode.window.showOpenDialog",
      );

      // Should have filters for archive types
      assert.ok(
        extensionTs.includes("filters") || extensionTs.includes("Archives"),
        "Import command should have file type filters",
      );
    });

    test("File picker should accept common archive formats", () => {
      // Check for common archive extensions in the import command area
      const hasZip = extensionTs.includes("zip");
      const hasTar = extensionTs.includes("tar");
      const hasGz = extensionTs.includes("gz");

      assert.ok(hasZip, "File picker should accept .zip files");

      assert.ok(hasTar || hasGz, "File picker should accept .tar or .gz files");
    });
  });

  suite("Error Handling Wiring", () => {
    test("Import command should have error handling", () => {
      // Look for try-catch or .catch in the extension
      assert.ok(
        extensionTs.includes("try") && extensionTs.includes("catch"),
        "Import command should have error handling (try-catch)",
      );
    });

    test("Import command should show error message on failure", () => {
      assert.ok(
        extensionTs.includes("showErrorMessage"),
        "Extension should have capability to show error messages",
      );
    });
  });

  suite("Output Channel Wiring", () => {
    test("Output channel should be created", () => {
      assert.ok(
        extensionTs.includes("createOutputChannel") ||
          extensionTs.includes("outputChannel"),
        "Output channel should be created for logging",
      );
    });

    test("Import command should log activity", () => {
      // Check if there's logging capability in the extension
      assert.ok(
        extensionTs.includes("outputChannel") ||
          extensionTs.includes("appendLine") ||
          extensionTs.includes("console.log"),
        "Extension should have logging capability",
      );
    });
  });
});
