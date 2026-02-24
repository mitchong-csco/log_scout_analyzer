import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { BundleTreeProvider } from "../../../bundleTreeProvider";

/**
 * E2E Test: Scenario 4 - Workspace Persistence & Bundle Deletion
 *
 * This test simulates the complete user workflow:
 * Day 1:
 *   1. User imports a bundle
 *   2. Bundle appears in Bundle Explorer
 *   3. Bundle folder added to VS Code workspace
 *   4. User closes VS Code
 *
 * Day 2:
 *   5. User opens VS Code in same workspace
 *   6. Bundle Explorer shows the same bundles (persistence)
 *   7. Workspace folders restored
 *
 * Day 3:
 *   8. User deletes the bundle
 *   9. All traces removed:
 *      - Physical files deleted
 *      - index.json updated
 *      - Bundle tree refreshed
 *      - Workspace folder removed ← THIS IS THE KEY FIX
 *
 * Success criteria:
 * - Bundle persists across sessions
 * - Bundle deletion cleans up EVERYTHING
 * - No "zombie" workspace folders
 *
 * Estimated time: ~1-2 minutes
 */
suite("E2E: Scenario 4 - Workspace Persistence & Bundle Deletion", function () {
  this.timeout(120000); // 2 minutes for entire suite

  let provider: BundleTreeProvider;
  let workspaceRoot: string;
  let bundlesPath: string;
  let testBundleId: string;

  suiteSetup(async function () {
    console.log("\n=== E2E Test Suite Setup: Scenario 4 ===");

    // Check workspace availability
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      console.log("⚠️  Skipping E2E tests: No workspace folder available");
      this.skip();
      return;
    }

    workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    bundlesPath = path.join(workspaceRoot, ".log-scout", "bundles");

    console.log(`📁 Workspace root: ${workspaceRoot}`);
    console.log(`📁 Bundles path: ${bundlesPath}`);

    // Verify extension is installed
    const extension = vscode.extensions.getExtension(
      "log-scout-team.log-scout-analyzer"
    );
    if (!extension) {
      console.log("⚠️  Skipping E2E tests: Extension not found");
      this.skip();
      return;
    }

    // Activate extension if not already active
    if (!extension.isActive) {
      console.log("🔄 Activating extension...");
      await extension.activate();
      console.log("✅ Extension activated");
    } else {
      console.log("✅ Extension already active");
    }

    await sleep(1000);
    console.log("✅ E2E Test Suite Setup Complete\n");
  });

  setup(async function () {
    console.log(`\n--- Test: ${this.currentTest?.title} ---`);
    // Clean workspace before test
    await cleanWorkspace();
    provider = new BundleTreeProvider();
  });

  teardown(async function () {
    const test = this.currentTest;
    if (test) {
      const status = test.state === "passed" ? "✅" : "❌";
      console.log(`${status} Test ${test.state}: ${test.title}\n`);
    }
  });

  suiteTeardown(async function () {
    console.log("\n=== E2E Test Suite Teardown ===");
    await cleanWorkspace();
    console.log("✅ Cleanup complete\n");
  });

  /**
   * MAIN E2E TEST: Complete Workspace Persistence & Deletion Workflow
   *
   * This test validates the full lifecycle:
   * Create → Persist → Restore → Delete → Verify Complete Cleanup
   */
  test("Complete workflow: Create bundle → Delete bundle → Verify complete cleanup", async function () {
    this.timeout(60000); // 1 minute for full workflow

    console.log("\n🎬 Starting Scenario 4: Workspace Persistence & Deletion Test");

    // ============================================================
    // DAY 1: CREATE BUNDLE
    // ============================================================
    console.log("\n📅 DAY 1: User creates a bundle");
    console.log("==========================================");

    // STEP 1: Create a bundle
    console.log("\n📦 Step 1: Create bundle");
    const createdBundleId = await provider.createBundle(
      "Test Case 700440257",
      "Integration test for workspace persistence"
    );

    assert.ok(createdBundleId, "Bundle ID should be returned");
    testBundleId = createdBundleId;
    console.log(`✅ Bundle created: ${testBundleId}`);

    // STEP 2: Verify bundle exists in filesystem
    console.log("\n📁 Step 2: Verify bundle exists in filesystem");
    const bundleDir = path.join(bundlesPath, testBundleId);
    const bundleJsonPath = path.join(bundleDir, "bundle.json");

    assert.ok(fs.existsSync(bundleDir), "Bundle directory should exist");
    assert.ok(fs.existsSync(bundleJsonPath), "bundle.json should exist");

    const bundleData = JSON.parse(fs.readFileSync(bundleJsonPath, "utf-8"));
    assert.strictEqual(bundleData.id, testBundleId, "Bundle ID should match");
    assert.strictEqual(bundleData.name, "Test Case 700440257", "Bundle name should match");
    console.log(`✅ Filesystem validated:`);
    console.log(`   - Directory: ${bundleDir}`);
    console.log(`   - Metadata: ${bundleJsonPath}`);

    // STEP 3: Verify bundle in index.json
    console.log("\n📋 Step 3: Verify bundle listed in index.json");
    const indexPath = path.join(bundlesPath, "index.json");
    assert.ok(fs.existsSync(indexPath), "index.json should exist");

    const indexData = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    const bundleEntry = indexData.bundles.find((b: any) => b.id === testBundleId);

    assert.ok(bundleEntry, "Bundle should be in index");
    assert.strictEqual(bundleEntry.name, "Test Case 700440257", "Index entry name should match");
    console.log(`✅ index.json validated:`);
    console.log(`   - Bundle entry found: ${bundleEntry.id}`);
    console.log(`   - Total bundles in index: ${indexData.bundles.length}`);

    // STEP 4: Verify bundle appears in tree view
    console.log("\n🌳 Step 4: Verify bundle appears in Bundle Explorer tree");
    const treeItems = await provider.getChildren(undefined);
    const bundleItem = treeItems.find((item: any) => item.bundleId === testBundleId);

    assert.ok(bundleItem, "Bundle should appear in tree view");
    assert.ok(bundleItem.label?.includes("Test Case 700440257"), "Bundle label should be correct");
    console.log(`✅ Tree view validated:`);
    console.log(`   - Found ${treeItems.length} item(s) in tree`);
    console.log(`   - Bundle visible: ${bundleItem.label}`);

    // STEP 5: Simulate bundle adding logs (create logs directory and files)
    console.log("\n📝 Step 5: Simulate bundle with log files");
    const logsDir = path.join(bundleDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });

    // Create some mock log files
    const mockLogPath = path.join(logsDir, "test.log");
    fs.writeFileSync(mockLogPath, "Mock log content for testing\n");

    // Update bundle.json with logs
    bundleData.logs = [
      {
        path: "./logs/test.log",
        size: fs.statSync(mockLogPath).size,
        timestamp: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(bundleJsonPath, JSON.stringify(bundleData, null, 2));
    console.log(`✅ Logs directory created: ${logsDir}`);

    // STEP 6: Simulate workspace folder addition (call private method)
    console.log("\n🗂️  Step 6: Add bundle logs folder to workspace");

    // Get initial workspace folder count
    const initialFolderCount = vscode.workspace.workspaceFolders?.length || 0;
    console.log(`   Initial workspace folders: ${initialFolderCount}`);

    // Manually add bundle to workspace (simulating what importPackage does)
    const bundleUri = vscode.Uri.file(logsDir);
    const addResult = vscode.workspace.updateWorkspaceFolders(
      vscode.workspace.workspaceFolders?.length || 0,
      0,
      {
        uri: bundleUri,
        name: `📦 Case 700440257`,
      }
    );

    assert.ok(addResult, "Workspace folder should be added successfully");
    await sleep(500); // Give VS Code time to update

    const afterAddCount = vscode.workspace.workspaceFolders?.length || 0;
    console.log(`   After adding: ${afterAddCount} workspace folders`);
    assert.strictEqual(
      afterAddCount,
      initialFolderCount + 1,
      "Workspace should have one more folder"
    );

    // Verify the folder was actually added
    const addedFolder = vscode.workspace.workspaceFolders?.find(
      (f) => f.uri.fsPath === logsDir
    );
    assert.ok(addedFolder, "Bundle logs folder should be in workspace");
    console.log(`✅ Workspace folder added: ${addedFolder.name}`);

    console.log("\n✅ DAY 1 COMPLETE: Bundle created and persisted");

    // ============================================================
    // DAY 2: PERSISTENCE CHECK (Simulate restart by re-loading)
    // ============================================================
    console.log("\n📅 DAY 2: User reopens VS Code (Simulated)");
    console.log("==========================================");

    // STEP 7: Simulate extension restart by creating new provider
    console.log("\n🔄 Step 7: Simulate VS Code restart (new provider instance)");
    const newProvider = new BundleTreeProvider();
    await sleep(500); // Give provider time to load

    // STEP 8: Verify bundle still appears in tree
    console.log("\n🌳 Step 8: Verify bundle persisted in tree view");
    const restoredTreeItems = await newProvider.getChildren(undefined);
    const restoredBundleItem = restoredTreeItems.find(
      (item: any) => item.bundleId === testBundleId
    );

    assert.ok(restoredBundleItem, "Bundle should still be in tree after restart");
    console.log(`✅ Bundle persisted: ${restoredBundleItem.label}`);

    // STEP 9: Verify bundle still in filesystem
    console.log("\n📁 Step 9: Verify bundle still in filesystem");
    assert.ok(fs.existsSync(bundleDir), "Bundle directory should still exist");
    assert.ok(fs.existsSync(bundleJsonPath), "bundle.json should still exist");
    console.log(`✅ Filesystem persistence confirmed`);

    // STEP 10: Verify workspace folder still present
    console.log("\n🗂️  Step 10: Verify workspace folder still present");
    const persistedFolder = vscode.workspace.workspaceFolders?.find(
      (f) => f.uri.fsPath === logsDir
    );
    assert.ok(persistedFolder, "Bundle logs folder should still be in workspace");
    console.log(`✅ Workspace folder persisted: ${persistedFolder.name}`);

    console.log("\n✅ DAY 2 COMPLETE: Persistence validated");

    // ============================================================
    // DAY 3: DELETE BUNDLE & VERIFY COMPLETE CLEANUP
    // ============================================================
    console.log("\n📅 DAY 3: User deletes the bundle");
    console.log("==========================================");

    // STEP 11: Get workspace folder count before deletion
    console.log("\n📊 Step 11: Capture state before deletion");
    const beforeDeleteFolderCount = vscode.workspace.workspaceFolders?.length || 0;
    console.log(`   Workspace folders before deletion: ${beforeDeleteFolderCount}`);

    // STEP 12: Delete the bundle
    console.log("\n🗑️  Step 12: Delete bundle");
    const deleteSuccess = await newProvider.deleteBundle(testBundleId);
    assert.ok(deleteSuccess, "Delete operation should succeed");
    await sleep(1000); // Give time for all cleanup to complete
    console.log(`✅ Delete operation completed`);

    // ============================================================
    // VERIFICATION: COMPLETE CLEANUP
    // ============================================================
    console.log("\n🔍 VERIFICATION: Complete cleanup check");
    console.log("==========================================");

    // CHECK 1: Physical files deleted
    console.log("\n✓ Check 1: Physical files deleted");
    assert.ok(
      !fs.existsSync(bundleDir),
      "❌ BUG: Bundle directory should be deleted from filesystem"
    );
    assert.ok(
      !fs.existsSync(bundleJsonPath),
      "❌ BUG: bundle.json should be deleted"
    );
    console.log(`   ✅ Bundle directory removed: ${bundleDir}`);

    // CHECK 2: Removed from index.json
    console.log("\n✓ Check 2: Removed from index.json");
    if (fs.existsSync(indexPath)) {
      const updatedIndex = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
      const stillInIndex = updatedIndex.bundles.some((b: any) => b.id === testBundleId);
      assert.ok(
        !stillInIndex,
        "❌ BUG: Bundle should be removed from index.json"
      );
      console.log(`   ✅ Bundle removed from index (${updatedIndex.bundles.length} bundles remain)`);
    }

    // CHECK 3: Not in tree view
    console.log("\n✓ Check 3: Removed from tree view");
    const finalTreeItems = await newProvider.getChildren(undefined);
    const stillInTree = finalTreeItems.some((item: any) => item.bundleId === testBundleId);
    assert.ok(
      !stillInTree,
      "❌ BUG: Bundle should not appear in tree view"
    );
    console.log(`   ✅ Bundle removed from tree (${finalTreeItems.length} items remain)`);

    // CHECK 4: Workspace folder removed (THE KEY TEST)
    console.log("\n✓ Check 4: Workspace folder removed");
    await sleep(1000); // Extra time for workspace folder removal

    const afterDeleteFolderCount = vscode.workspace.workspaceFolders?.length || 0;
    const folderStillInWorkspace = vscode.workspace.workspaceFolders?.find(
      (f) => f.uri.fsPath === logsDir
    );

    // THIS IS THE KEY ASSERTION FOR THE BUG FIX
    assert.ok(
      !folderStillInWorkspace,
      "❌ BUG: Workspace folder should be removed when bundle is deleted (zombie folder)"
    );

    assert.strictEqual(
      afterDeleteFolderCount,
      beforeDeleteFolderCount - 1,
      "❌ BUG: Workspace should have one less folder after deletion"
    );

    console.log(`   ✅ Workspace folder removed successfully`);
    console.log(`   ✅ Workspace folders: ${beforeDeleteFolderCount} → ${afterDeleteFolderCount}`);

    console.log("\n✅ DAY 3 COMPLETE: All cleanup verified");
    console.log("\n🎉 SCENARIO 4 TEST PASSED: Workspace persistence and deletion work correctly!");
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Clean the workspace before/after tests
   */
  async function cleanWorkspace(): Promise<void> {
    // Remove all bundle workspace folders first
    if (vscode.workspace.workspaceFolders) {
      const bundleFolders = vscode.workspace.workspaceFolders.filter((folder) =>
        folder.uri.fsPath.includes(".log-scout/bundles")
      );

      for (const folder of bundleFolders) {
        const folderIndex = vscode.workspace.workspaceFolders.findIndex(
          (f) => f.uri.toString() === folder.uri.toString()
        );

        if (folderIndex >= 0) {
          vscode.workspace.updateWorkspaceFolders(folderIndex, 1);
        }
      }
    }

    // Remove bundles directory from filesystem
    if (fs.existsSync(bundlesPath)) {
      try {
        fs.rmSync(bundlesPath, { recursive: true, force: true });
        console.log("🧹 Cleaned bundles directory");
      } catch (error) {
        console.warn("⚠️  Failed to clean workspace:", error);
      }
    }

    // Close all open editors
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    await sleep(500);
  }

  /**
   * Sleep helper
   */
  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
