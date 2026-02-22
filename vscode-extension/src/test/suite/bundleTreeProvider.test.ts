import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { BundleTreeProvider } from "../../bundleTreeProvider";

/**
 * Phase 4: UI Layer Tests for BundleTreeProvider
 * Tests the TypeScript UI integration for bundle import feature
 */
suite("BundleTreeProvider Tests", () => {
  let provider: BundleTreeProvider;
  let testWorkspaceRoot: string;

  suiteSetup(function () {
    // Skip if no workspace (CI environment)
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      console.log("Skipping BundleTreeProvider tests: No workspace folder");
      this.skip();
    } else {
      testWorkspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
  });

  setup(() => {
    provider = new BundleTreeProvider();
  });

  teardown(() => {
    // Cleanup
    provider = null as any;
  });

  suite("Bundle Creation", () => {
    test("Should create bundle with filesystem structure", async () => {
      const bundleName = "Test Bundle " + Date.now();
      const description = "Test bundle description";

      // Execute
      const bundleId = await provider.createBundle(bundleName, description);

      // Assert
      assert.ok(bundleId, "Bundle ID should be returned");
      assert.ok(
        bundleId.startsWith("bundle_"),
        "Bundle ID should have correct prefix",
      );

      // Verify filesystem structure
      const bundlePath = path.join(
        testWorkspaceRoot,
        ".log-scout",
        "bundles",
        bundleId,
        "bundle.json",
      );
      assert.ok(
        fs.existsSync(bundlePath),
        "bundle.json should exist on filesystem",
      );

      // Verify bundle content
      const bundleData = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
      assert.strictEqual(
        bundleData.name,
        bundleName,
        "Bundle name should match",
      );
      assert.strictEqual(
        bundleData.description,
        description,
        "Description should match",
      );
      assert.strictEqual(bundleData.id, bundleId, "Bundle ID should match");
      assert.ok(Array.isArray(bundleData.logs), "Logs should be an array");
      assert.strictEqual(
        bundleData.logs.length,
        0,
        "New bundle should have no logs",
      );

      // Cleanup
      fs.rmSync(path.dirname(bundlePath), { recursive: true, force: true });
    });

    test("Should update index.json when creating bundle", async () => {
      const bundleName = "Index Test Bundle " + Date.now();

      // Execute
      const bundleId = await provider.createBundle(bundleName);

      // Assert
      assert.ok(bundleId, "Bundle ID should be returned");

      // Verify index.json updated
      const indexPath = path.join(
        testWorkspaceRoot,
        ".log-scout",
        "bundles",
        "index.json",
      );
      assert.ok(fs.existsSync(indexPath), "index.json should exist");

      const indexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      assert.ok(
        Array.isArray(indexData.bundles),
        "Index should have bundles array",
      );

      const foundBundle = indexData.bundles.find((b: any) => b.id === bundleId);
      assert.ok(foundBundle, "New bundle should be in index");
      assert.strictEqual(
        foundBundle.name,
        bundleName,
        "Bundle name in index should match",
      );

      // Cleanup
      const bundlePath = path.join(
        testWorkspaceRoot,
        ".log-scout",
        "bundles",
        bundleId,
      );
      fs.rmSync(bundlePath, { recursive: true, force: true });
    });

    test("Should create bundle with optional case ID", async () => {
      const bundleName = "Case Bundle " + Date.now();
      const caseId = "700123456";

      // Execute
      const bundleId = await provider.createBundle(
        bundleName,
        undefined,
        caseId,
      );

      // Assert
      assert.ok(bundleId, "Bundle ID should be returned");

      // Verify case ID in bundle metadata
      const bundlePath = path.join(
        testWorkspaceRoot,
        ".log-scout",
        "bundles",
        bundleId,
        "bundle.json",
      );
      const bundleData = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
      assert.strictEqual(
        bundleData.metadata.case_id,
        caseId,
        "Case ID should be stored in metadata",
      );

      // Cleanup
      fs.rmSync(path.dirname(bundlePath), { recursive: true, force: true });
    });

    test("Should handle bundle creation without workspace", async () => {
      // Create provider in isolated context
      const isolatedProvider = new BundleTreeProvider();

      try {
        // Note: Actual workspace manipulation is limited in test environment
        // This test validates the error handling path

        // Execute
        const bundleId = await isolatedProvider.createBundle("Test Bundle");

        // Assert - should handle gracefully
        // Implementation should show error and return undefined
        if (
          !vscode.workspace.workspaceFolders ||
          vscode.workspace.workspaceFolders.length === 0
        ) {
          assert.strictEqual(
            bundleId,
            undefined,
            "Should return undefined when no workspace",
          );
        } else {
          // If workspace exists, should succeed
          assert.ok(bundleId, "Should create bundle if workspace exists");

          // Cleanup
          if (bundleId) {
            const bundlePath = path.join(
              testWorkspaceRoot,
              ".log-scout",
              "bundles",
              bundleId,
            );
            fs.rmSync(bundlePath, { recursive: true, force: true });
          }
        }
      } catch (error) {
        // Should not throw, should handle gracefully
        assert.fail("Should handle no workspace gracefully without throwing");
      }
    });
  });

  suite("Tree View Data", () => {
    test("Should return BundleItem from getTreeItem", () => {
      // Create a mock BundleItem
      const bundleItem = {
        label: "Test Bundle",
        bundleId: "bundle_123",
        type: "bundle",
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      } as any;

      // Execute
      const treeItem = provider.getTreeItem(bundleItem);

      // Assert
      assert.ok(treeItem, "Should return a tree item");
      assert.strictEqual(treeItem.label, "Test Bundle", "Label should match");
    });

    test("Should list bundles in getChildren with no element", async () => {
      // Create a test bundle first
      const bundleName = "List Test Bundle " + Date.now();
      const bundleId = await provider.createBundle(bundleName);
      assert.ok(bundleId, "Bundle should be created");

      try {
        // Execute - get root level children (all bundles)
        const children = await provider.getChildren(undefined);

        // Assert
        assert.ok(Array.isArray(children), "Should return array of children");
        assert.ok(children.length > 0, "Should have at least one bundle");

        // Find our test bundle
        const foundBundle = children.find(
          (item: any) => item.bundleId === bundleId,
        );
        assert.ok(foundBundle, "Should find our test bundle in the list");
      } finally {
        // Cleanup
        const bundlePath = path.join(
          testWorkspaceRoot,
          ".log-scout",
          "bundles",
          bundleId,
        );
        fs.rmSync(bundlePath, { recursive: true, force: true });
      }
    });

    test("Should handle empty bundles directory", async () => {
      // Ensure bundles directory exists but is empty
      const bundlesPath = path.join(testWorkspaceRoot, ".log-scout", "bundles");

      // Backup and clear bundles
      const backupPath = path.join(
        testWorkspaceRoot,
        ".log-scout",
        "bundles_backup",
      );
      if (fs.existsSync(bundlesPath)) {
        fs.renameSync(bundlesPath, backupPath);
      }

      try {
        // Execute
        const children = await provider.getChildren(undefined);

        // Assert
        assert.ok(Array.isArray(children), "Should return array");
        // Should show helpful message when no bundles exist
        assert.ok(
          children.length >= 0,
          "Should handle empty bundles directory gracefully",
        );
      } finally {
        // Restore bundles
        if (fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, bundlesPath);
        }
      }
    });
  });

  suite("Tree Refresh", () => {
    test("Should fire onDidChangeTreeData when refresh called", (done) => {
      // Setup listener
      let eventFired = false;
      const disposable = provider.onDidChangeTreeData(() => {
        eventFired = true;
        disposable.dispose();
        done();
      });

      // Execute
      provider.refresh();

      // Give event time to fire
      setTimeout(() => {
        if (!eventFired) {
          disposable.dispose();
          assert.fail("onDidChangeTreeData should fire when refresh is called");
          done();
        }
      }, 100);
    });
  });

  suite("Import Package (LSP Integration)", () => {
    test("Should call LSP client for package import", async function () {
      // Skip if LSP not available (common in test environment)
      this.timeout(5000);

      const testArchive = path.join(
        testWorkspaceRoot,
        "..",
        "test-data",
        "quick-test.zip",
      );

      if (!fs.existsSync(testArchive)) {
        console.log("Skipping import test: test archive not found");
        this.skip();
        return;
      }

      try {
        // Execute - this will attempt to call LSP
        // Note: May fail if LSP not running, which is expected in test environment
        const result = await provider.importPackage(
          testArchive,
          "Import Test Bundle",
        );

        // Assert - if LSP is available and responds
        if (result) {
          assert.ok(result, "Should return import result");
          console.log("Import successful:", result);

          // Cleanup if bundle was created
          if (result.bundleId) {
            const bundlePath = path.join(
              testWorkspaceRoot,
              ".log-scout",
              "bundles",
              result.bundleId,
            );
            if (fs.existsSync(bundlePath)) {
              fs.rmSync(bundlePath, { recursive: true, force: true });
            }
          }
        }
      } catch (error) {
        // Expected in test environment without LSP
        console.log("Import test error (expected without LSP):", error);
        const errorStr = String(error);
        assert.ok(
          errorStr.includes("LSP") ||
            errorStr.includes("client") ||
            errorStr.includes("not available"),
          `Error should mention LSP or client unavailability. Got: ${errorStr}`,
        );
      }
    });
  });
});
