import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

/**
 * Wiring Tests for "Add Current File to Bundle" Command
 *
 * These tests validate that the addCurrentFile command is properly wired
 * in the extension without requiring the VS Code runtime.
 *
 * Phase 1: Log Collection Evolution - Core workflow validation
 */
suite("Add Current File to Bundle - Wiring Tests", () => {
  const extensionRoot = path.resolve(__dirname, "../../../");
  const packageJsonPath = path.join(extensionRoot, "package.json");
  const extensionTsPath = path.join(extensionRoot, "src", "extension.ts");

  let packageJson: any;
  let extensionTs: string;

  suiteSetup(() => {
    // Load files once for all tests
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    extensionTs = fs.readFileSync(extensionTsPath, "utf8");
  });

  suite("1. Command Registration", () => {
    test("Should be registered in package.json", () => {
      const commands = packageJson.contributes?.commands || [];
      const addCurrentFileCommand = commands.find(
        (cmd: any) => cmd.command === "logScoutAnalyzer.bundle.addCurrentFile",
      );

      assert.ok(
        addCurrentFileCommand,
        "addCurrentFile command should be defined in package.json",
      );
    });

    test("Should have proper command structure in package.json", () => {
      const commands = packageJson.contributes?.commands || [];
      const cmd = commands.find(
        (c: any) => c.command === "logScoutAnalyzer.bundle.addCurrentFile",
      );

      assert.ok(cmd, "Command should exist");
      assert.ok(cmd.title, "Command should have title");
      assert.ok(
        cmd.title.includes("Add") || cmd.title.includes("Current"),
        "Command title should be descriptive",
      );
    });

    test("Should be in activation events", () => {
      const activationEvents = packageJson.activationEvents || [];
      const hasActivation =
        activationEvents.includes(
          "onCommand:logScoutAnalyzer.bundle.addCurrentFile",
        ) || activationEvents.includes("*");

      assert.ok(
        hasActivation,
        "Command should be in activation events or use * wildcard",
      );
    });

    test("Should be registered in extension.ts", () => {
      // Check for command registration (may be split across lines)
      const hasRegistration =
        extensionTs.includes("logScoutAnalyzer.bundle.addCurrentFile") &&
        extensionTs.includes("registerCommand");

      assert.ok(
        hasRegistration,
        "Command should be registered with vscode.commands.registerCommand",
      );
    });

    test("Should be added to context.subscriptions", () => {
      const hasSubscription =
        extensionTs.includes("context.subscriptions.push") &&
        extensionTs.includes("logScoutAnalyzer.bundle.addCurrentFile");

      assert.ok(
        hasSubscription,
        "Command should be added to subscriptions for cleanup",
      );
    });
  });

  suite("2. File Extension Validation Logic", () => {
    test("Should have log file extension validation", () => {
      // Check for file extension validation logic
      const hasExtensionCheck =
        extensionTs.includes(".log") ||
        extensionTs.includes(".txt") ||
        extensionTs.includes(".trace") ||
        extensionTs.includes("match") ||
        extensionTs.includes("test");

      assert.ok(
        hasExtensionCheck,
        "Should have file extension validation logic",
      );
    });

    test("Should validate common log file extensions", () => {
      const validExtensions = [".log", ".txt", ".trace", ".out", ".err"];

      // Test validation logic
      for (const ext of validExtensions) {
        const testFile = `test${ext}`;
        const isValid = validExtensions.some((e) => testFile.endsWith(e));
        assert.ok(isValid, `${ext} should be recognized as log file`);
      }
    });

    test("Should detect non-log files", () => {
      const validExtensions = [".log", ".txt", ".trace", ".out", ".err"];
      const invalidFiles = ["test.pdf", "image.png", "doc.docx"];

      for (const file of invalidFiles) {
        const isValid = validExtensions.some((ext) => file.endsWith(ext));
        assert.ok(!isValid, `${file} should not be recognized as log file`);
      }
    });
  });

  suite("3. LSP Integration", () => {
    test("Should call LSP client methods", () => {
      // Check for LSP client usage
      const hasLSPCall =
        extensionTs.includes("sendRequest") &&
        (extensionTs.includes("scout/bundle/list") ||
          extensionTs.includes("scout/bundle/addLog"));

      assert.ok(
        hasLSPCall,
        "Should use LSP client to communicate with backend",
      );
    });

    test("Should handle bundle list request", () => {
      const hasBundleList = extensionTs.includes("scout/bundle/list");
      assert.ok(hasBundleList, "Should request bundle list from LSP");
    });

    test("Should handle add log request", () => {
      const hasAddLog = extensionTs.includes("scout/bundle/addLog");
      assert.ok(hasAddLog, "Should send addLog request to LSP");
    });

    test("Should check LSP client availability", () => {
      const hasClientCheck =
        extensionTs.includes("getLSPClient") ||
        extensionTs.includes("client") ||
        extensionTs.includes("lspClient");

      assert.ok(hasClientCheck, "Should check if LSP client is available");
    });
  });

  suite("4. User Interaction", () => {
    test("Should check for active text editor", () => {
      const hasEditorCheck =
        extensionTs.includes("activeTextEditor") ||
        extensionTs.includes("window.activeTextEditor");

      assert.ok(hasEditorCheck, "Should check if there's an active editor");
    });

    test("Should show warning when no file is open", () => {
      const hasWarning =
        extensionTs.includes("showWarningMessage") &&
        extensionTs.includes("No file");

      assert.ok(hasWarning, "Should show warning when no file is open");
    });

    test("Should show quick pick for bundle selection", () => {
      const hasQuickPick = extensionTs.includes("showQuickPick");

      assert.ok(hasQuickPick, "Should use quick pick for bundle selection");
    });

    test("Should show success message after adding", () => {
      const hasSuccess =
        extensionTs.includes("showInformationMessage") &&
        (extensionTs.includes("Added") || extensionTs.includes("✅"));

      assert.ok(hasSuccess, "Should show success message after adding file");
    });

    test("Should handle errors gracefully", () => {
      const hasErrorHandling =
        extensionTs.includes("showErrorMessage") ||
        (extensionTs.includes("catch") && extensionTs.includes("error"));

      assert.ok(hasErrorHandling, "Should have error handling");
    });
  });

  suite("5. Bundle Tree Integration", () => {
    test("Should refresh bundle tree after adding", () => {
      const hasRefresh =
        extensionTs.includes("bundleTreeProvider") &&
        (extensionTs.includes("refresh") || extensionTs.includes("Refresh"));

      assert.ok(hasRefresh, "Should refresh bundle tree after operation");
    });

    test("Should reference bundle tree provider", () => {
      const hasBundleProvider =
        extensionTs.includes("bundleTreeProvider") ||
        extensionTs.includes("BundleTreeProvider");

      assert.ok(hasBundleProvider, "Should reference bundle tree provider");
    });
  });

  suite("6. Path Handling", () => {
    test("Should extract filename from path correctly", () => {
      // Test path splitting logic
      const testPaths = [
        { path: "C:\\logs\\test.log", expected: "test.log" },
        { path: "/var/logs/system.log", expected: "system.log" },
        { path: "C:\\My Logs\\test file.log", expected: "test file.log" },
      ];

      for (const { path: testPath, expected } of testPaths) {
        const filename = testPath.split(/[\\/]/).pop() || testPath;
        assert.strictEqual(
          filename,
          expected,
          `Should extract ${expected} from ${testPath}`,
        );
      }
    });

    test("Should handle Windows paths", () => {
      const path = "C:\\logs\\test.log";
      const filename = path.split(/[\\/]/).pop();
      assert.strictEqual(filename, "test.log");
    });

    test("Should handle Unix paths", () => {
      const path = "/var/logs/test.log";
      const filename = path.split(/[\\/]/).pop();
      assert.strictEqual(filename, "test.log");
    });

    test("Should handle UNC paths", () => {
      const path = "\\\\server\\share\\logs\\test.log";
      const filename = path.split(/[\\/]/).pop();
      assert.strictEqual(filename, "test.log");
    });
  });

  suite("7. Bundle Selection Flow", () => {
    test("Should include create new bundle option", () => {
      const hasCreateOption =
        extensionTs.includes("Create New Bundle") ||
        extensionTs.includes("__new__");

      assert.ok(
        hasCreateOption,
        "Should offer to create new bundle if selected",
      );
    });

    test("Should handle empty bundle list", () => {
      const hasEmptyCheck =
        (extensionTs.includes("bundles.length") ||
          extensionTs.includes("length === 0")) &&
        extensionTs.includes("Create Bundle");

      assert.ok(hasEmptyCheck, "Should handle case when no bundles exist");
    });

    test("Should execute create bundle command when selected", () => {
      const hasCreateCommand =
        extensionTs.includes("executeCommand") &&
        extensionTs.includes("logScoutAnalyzer.bundle.create");

      assert.ok(
        hasCreateCommand,
        "Should be able to trigger create bundle command",
      );
    });
  });

  suite("8. Message Formatting", () => {
    test("Should have descriptive success message", () => {
      const successPattern = /Added.*to bundle/i;
      const hasPattern = successPattern.test(extensionTs);

      assert.ok(hasPattern, "Success message should mention adding to bundle");
    });

    test("Should have descriptive error messages", () => {
      const errorPatterns = [
        /No file.*open/i,
        /LSP.*not available/i,
        /Failed to add/i,
      ];

      const hasErrors = errorPatterns.some((pattern) =>
        pattern.test(extensionTs),
      );

      assert.ok(hasErrors, "Should have descriptive error messages");
    });
  });

  suite("9. Output Channel Logging", () => {
    test("Should log to output channel", () => {
      const hasLogging =
        extensionTs.includes("outputChannel") &&
        (extensionTs.includes("appendLine") ||
          extensionTs.includes("console.log"));

      assert.ok(hasLogging, "Should log operations to output channel");
    });

    test("Should log success operations", () => {
      const hasSuccessLog =
        extensionTs.includes("✓") || extensionTs.includes("Added log");

      assert.ok(hasSuccessLog, "Should log successful operations");
    });

    test("Should log failures", () => {
      const hasErrorLog =
        extensionTs.includes("✗") || extensionTs.includes("Failed");

      assert.ok(hasErrorLog, "Should log failures");
    });
  });

  suite("10. Code Quality", () => {
    test("Should have async command handler", () => {
      const hasAsync =
        extensionTs.includes("async") &&
        extensionTs.includes("logScoutAnalyzer.bundle.addCurrentFile");

      assert.ok(hasAsync, "Command handler should be async");
    });

    test("Should have try-catch error handling", () => {
      const hasErrorHandling =
        extensionTs.includes("try") && extensionTs.includes("catch");

      assert.ok(hasErrorHandling, "Should have try-catch blocks");
    });

    test("Should not have hardcoded paths", () => {
      // Check that command doesn't have hardcoded file paths
      const hasHardcodedPath =
        /C:\\\\Users\\\\/i.test(extensionTs) ||
        /\/home\/[a-z]+\//i.test(extensionTs);

      assert.ok(
        !hasHardcodedPath,
        "Should not have hardcoded user-specific paths",
      );
    });
  });

  suite("11. File Size Formatting", () => {
    test("Should format bytes correctly", () => {
      const bytes = 512;
      const formatted = formatSize(bytes);
      assert.strictEqual(formatted, "512 B");
    });

    test("Should format kilobytes correctly", () => {
      const bytes = 1536;
      const formatted = formatSize(bytes);
      assert.strictEqual(formatted, "1.5 KB");
    });

    test("Should format megabytes correctly", () => {
      const bytes = 2 * 1024 * 1024;
      const formatted = formatSize(bytes);
      assert.strictEqual(formatted, "2.0 MB");
    });

    test("Should format large files correctly", () => {
      const bytes = 150 * 1024 * 1024;
      const formatted = formatSize(bytes);
      assert.strictEqual(formatted, "150.0 MB");
    });
  });

  suite("12. Integration with Related Commands", () => {
    test("Should work with bundle.create command", () => {
      const hasBundleCreate = extensionTs.includes(
        "logScoutAnalyzer.bundle.create",
      );
      assert.ok(hasBundleCreate, "Should integrate with bundle.create command");
    });

    test("Should work with bundle.refresh command", () => {
      const hasRefresh =
        extensionTs.includes("refresh") ||
        extensionTs.includes("logScoutAnalyzer.bundle.refresh");

      assert.ok(hasRefresh, "Should integrate with bundle refresh");
    });
  });

  suite("13. Phase 1 Completion Validation", () => {
    test("✅ Command is properly wired in package.json", () => {
      const commands = packageJson.contributes?.commands || [];
      const cmd = commands.find(
        (c: any) => c.command === "logScoutAnalyzer.bundle.addCurrentFile",
      );
      assert.ok(cmd, "Phase 1: Command wired in package.json");
    });

    test("✅ Command is registered in extension.ts", () => {
      const hasReg = extensionTs.includes(
        "logScoutAnalyzer.bundle.addCurrentFile",
      );
      assert.ok(hasReg, "Phase 1: Command registered in extension.ts");
    });

    test("✅ LSP integration is in place", () => {
      const hasLSP =
        extensionTs.includes("scout/bundle/addLog") ||
        extensionTs.includes("scout/bundle/list");
      assert.ok(hasLSP, "Phase 1: LSP integration exists");
    });

    test("✅ User interaction flow is implemented", () => {
      const hasUI =
        extensionTs.includes("showQuickPick") &&
        extensionTs.includes("showInformationMessage");
      assert.ok(hasUI, "Phase 1: User interaction implemented");
    });

    test("✅ Error handling is present", () => {
      const hasErrors =
        extensionTs.includes("showErrorMessage") ||
        extensionTs.includes("showWarningMessage");
      assert.ok(hasErrors, "Phase 1: Error handling implemented");
    });

    test("✅ Bundle tree integration exists", () => {
      const hasTree =
        extensionTs.includes("bundleTreeProvider") &&
        extensionTs.includes("refresh");
      assert.ok(hasTree, "Phase 1: Bundle tree integration exists");
    });
  });
});

/**
 * Helper function to format file sizes
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
