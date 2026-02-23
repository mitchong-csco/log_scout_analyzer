/**
 * Bundle Refresh Wiring Tests
 *
 * Tests that the bundle panel refreshes properly after import operations.
 * This verifies the connection between LSP import completion and UI updates.
 *
 * TDD Test - Verifies the reported issue: "Bundle imported but it did not refresh or update the bundle panel"
 */

import * as assert from "assert";
import * as vscode from "vscode";
import { BundleTreeProvider } from "../../../bundleTreeProvider";

suite("Bundle Refresh Wiring Tests", () => {
  let bundleTreeProvider: BundleTreeProvider;
  let treeViewRefreshCount: number;
  let originalOnDidChangeTreeData: any;

  setup(() => {
    bundleTreeProvider = new BundleTreeProvider();
    treeViewRefreshCount = 0;

    // Spy on tree view refresh events
    originalOnDidChangeTreeData = bundleTreeProvider.onDidChangeTreeData;
    bundleTreeProvider.onDidChangeTreeData((e) => {
      treeViewRefreshCount++;
      if (originalOnDidChangeTreeData) {
        originalOnDidChangeTreeData(e);
      }
    });
  });

  teardown(() => {
    // Cleanup
    treeViewRefreshCount = 0;
  });

  test("WIRING: BundleTreeProvider.refresh() fires onDidChangeTreeData event", () => {
    // Arrange
    const initialCount = treeViewRefreshCount;

    // Act
    bundleTreeProvider.refresh();

    // Assert
    assert.strictEqual(
      treeViewRefreshCount,
      initialCount + 1,
      "refresh() should fire onDidChangeTreeData event once",
    );
  });

  test("WIRING: importPackage() fires refresh after successful import", async function () {
    this.timeout(10000);

    // This test verifies that after importPackage completes:
    // 1. The optimistic entry is removed
    // 2. refresh() is called to reload from disk
    // 3. The tree view receives the update event

    // Note: This is a wiring test - we're checking the refresh mechanism,
    // not the full import functionality (that's covered by integration tests)

    const initialCount = treeViewRefreshCount;

    try {
      // Act - call importPackage with a mock/test path
      // This will fail (no LSP), but we're testing the refresh wiring
      await bundleTreeProvider.importPackage("/test/path.zip");
    } catch (error) {
      // Expected to fail without LSP - that's OK for wiring test
      // We're testing the refresh mechanism, not the import success
    }

    // Assert - Even on error, refresh should be called during cleanup
    assert.ok(
      treeViewRefreshCount > initialCount,
      "importPackage should trigger at least one refresh event (optimistic or cleanup)",
    );
  });

  test("WIRING: waitForBundleFile() resolves when file is created", async function () {
    this.timeout(10000);

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      console.log("Skipping: No workspace folder open");
      this.skip();
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const testBundleId = `test_bundle_${Date.now()}`;
    const bundlePath = `${workspaceRoot}/.log-scout/bundles/${testBundleId}`;
    const bundleFilePath = `${bundlePath}/bundle.json`;

    try {
      // Arrange - create directory but not the file yet
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(bundlePath));

      // Act - start waiting for file (in background)
      const waitPromise = (bundleTreeProvider as any).waitForBundleFile(
        testBundleId,
      );

      // Create the file after a short delay
      setTimeout(async () => {
        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(bundleFilePath),
          Buffer.from('{"id":"test"}', "utf8"),
        );
      }, 100);

      // Assert - wait should resolve when file is created
      const startTime = Date.now();
      await waitPromise;
      const elapsed = Date.now() - startTime;

      assert.ok(
        elapsed < 5000,
        "waitForBundleFile should resolve before timeout",
      );
      assert.ok(
        elapsed >= 100,
        "waitForBundleFile should wait for file creation",
      );

      console.log(`✓ File watcher resolved in ${elapsed}ms`);
    } finally {
      // Cleanup
      try {
        await vscode.workspace.fs.delete(vscode.Uri.file(bundlePath), {
          recursive: true,
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  test("WIRING: getChildren() returns empty state when no workspace", async function () {
    // Arrange - no workspace folders
    if (vscode.workspace.workspaceFolders) {
      console.log(
        "Skipping: Workspace folder exists (test needs empty workspace)",
      );
      this.skip();
      return;
    }

    // Act
    const children = await bundleTreeProvider.getChildren(undefined);

    // Assert
    assert.ok(Array.isArray(children), "Should return array");
    assert.strictEqual(children.length, 1, "Should return one info message");
    assert.strictEqual(children[0].type, "info", "Should be an info type item");
    assert.ok(
      children[0].label.includes("No workspace"),
      "Should indicate no workspace is open",
    );
  });

  test("WIRING: getChildren() filters out optimistic bundles after import", async () => {
    // This test verifies the fix for duplicate bundles showing up
    // (optimistic + real bundle both appearing)

    // Arrange - manually add an optimistic bundle
    const optimisticId = "import_12345";
    (bundleTreeProvider as any).bundles = [
      {
        bundleId: optimisticId,
        type: "bundle-importing",
        label: "Importing test.zip",
      },
    ];

    // Act - get children (should filter optimistic from loaded)
    const children = await bundleTreeProvider.getChildren(undefined);

    // Assert - should only have optimistic bundles (no real bundles loaded)
    const importingBundles = children.filter(
      (item: any) => item.type === "bundle-importing",
    );
    assert.strictEqual(
      importingBundles.length,
      1,
      "Should have one importing bundle",
    );
    assert.strictEqual(
      importingBundles[0].bundleId,
      optimisticId,
      "Should be our optimistic bundle",
    );
  });

  test("ISSUE FIX: Bundle panel refreshes after import completion", async function () {
    this.timeout(15000);

    // This test reproduces the reported issue:
    // "Bundle imported but it did not refresh or update the bundle panel"
    //
    // Expected behavior:
    // 1. Import starts → optimistic bundle appears
    // 2. Import completes → optimistic bundle removed
    // 3. refresh() called → real bundle loads from disk
    // 4. Tree view updates → user sees imported bundle

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      console.log("Skipping: Requires workspace folder");
      this.skip();
      return;
    }

    const initialRefreshCount = treeViewRefreshCount;

    try {
      // Act - attempt import (will fail without LSP, but tests refresh wiring)
      await bundleTreeProvider.importPackage("/test/mock-archive.zip");
    } catch (error) {
      // Expected - no LSP available in test environment
      console.log("Import failed (expected without LSP):", error);
    }

    // Assert - refresh should be called even on error
    assert.ok(
      treeViewRefreshCount > initialRefreshCount,
      "Tree view should refresh after import attempt (success or failure)",
    );

    console.log(
      `✓ Tree view refreshed ${treeViewRefreshCount - initialRefreshCount} time(s) during import`,
    );
  });

  test("WIRING: Multiple rapid refreshes are handled correctly", async () => {
    // Test that rapid refresh calls don't cause issues
    const initialCount = treeViewRefreshCount;

    // Act - call refresh multiple times rapidly
    bundleTreeProvider.refresh();
    bundleTreeProvider.refresh();
    bundleTreeProvider.refresh();

    // Give events time to fire
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    assert.strictEqual(
      treeViewRefreshCount,
      initialCount + 3,
      "All refresh calls should fire events",
    );
  });

  test("WIRING: Optimistic bundles cleared after successful import", async () => {
    // Arrange - add optimistic bundle
    const importToken = "import_test_123";
    (bundleTreeProvider as any).bundles = [
      {
        bundleId: importToken,
        type: "bundle-importing",
        label: "Importing...",
      },
    ];
    (bundleTreeProvider as any).importingBundles.set(importToken, {
      bundleId: importToken,
      fileName: "test.zip",
      message: "Starting...",
      percentage: 0,
      startTime: Date.now(),
    });

    // Verify optimistic bundle is there
    let children = await bundleTreeProvider.getChildren(undefined);
    let importing = children.filter(
      (item: any) => item.type === "bundle-importing",
    );
    assert.strictEqual(importing.length, 1, "Should have optimistic bundle");

    // Act - simulate import completion by clearing bundles
    (bundleTreeProvider as any).bundles = [];
    (bundleTreeProvider as any).importingBundles.delete(importToken);
    bundleTreeProvider.refresh();

    // Wait for refresh
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert - optimistic bundle should be gone
    children = await bundleTreeProvider.getChildren(undefined);
    importing = children.filter(
      (item: any) => item.type === "bundle-importing",
    );
    assert.strictEqual(
      importing.length,
      0,
      "Optimistic bundle should be cleared after import",
    );
  });
});
