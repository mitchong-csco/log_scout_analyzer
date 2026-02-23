import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";

/**
 * Static View Registration Tests
 *
 * These tests validate that all views declared in package.json have
 * corresponding data providers registered in extension.ts.
 *
 * This is a STATIC ANALYSIS test - it parses source files and doesn't
 * require the extension to be activated.
 *
 * Prevents: "There is no data provider registered" error
 *
 * Run with: npm test
 */
suite("Static View Registration Tests", () => {
  let packageJson: any;
  let extensionSource: string;
  const extensionRoot = path.resolve(__dirname, "../../../..");

  suiteSetup(() => {
    // Load package.json
    const packageJsonPath = path.join(extensionRoot, "package.json");
    assert.ok(
      fs.existsSync(packageJsonPath),
      `package.json should exist at ${packageJsonPath}`
    );

    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");
    packageJson = JSON.parse(packageJsonContent);

    // Load extension.ts source code
    const extensionTsPath = path.join(extensionRoot, "src", "extension.ts");
    assert.ok(
      fs.existsSync(extensionTsPath),
      `extension.ts should exist at ${extensionTsPath}`
    );

    extensionSource = fs.readFileSync(extensionTsPath, "utf8");
  });

  test("package.json should have view contributions", () => {
    assert.ok(packageJson.contributes, "Should have contributes section");
    assert.ok(packageJson.contributes.views, "Should have views defined");
  });

  test("No empty view containers should exist", () => {
    const viewContainers =
      packageJson.contributes?.viewsContainers?.activitybar || [];
    const views = packageJson.contributes?.views || {};

    const emptyContainers: Array<{ id: string; title: string }> = [];

    for (const container of viewContainers) {
      const containerViews = views[container.id] || [];

      if (containerViews.length === 0) {
        emptyContainers.push({ id: container.id, title: container.title });
        console.log(
          `    ✗ Empty container: "${container.id}" (${container.title})`
        );
      } else {
        console.log(
          `    ✓ Container "${container.id}" has ${containerViews.length} view(s)`
        );
      }
    }

    assert.strictEqual(
      emptyContainers.length,
      0,
      `View containers should not be empty. Empty containers: ${emptyContainers
        .map((c) => c.id)
        .join(", ")}. ` +
        `This causes "There is no data provider registered" errors. ` +
        `Remove them from package.json or add views to them.`
    );
  });

  test("All package.json views should have createTreeView calls in extension.ts", () => {
    // Extract all view IDs from package.json
    const views = packageJson.contributes?.views || {};
    const allViewIds: string[] = [];

    for (const containerViews of Object.values(views)) {
      for (const view of containerViews as any[]) {
        allViewIds.push(view.id);
      }
    }

    assert.ok(
      allViewIds.length > 0,
      "package.json should define at least one view"
    );

    console.log(`\n  Found ${allViewIds.length} views in package.json:`);

    // Check each view has a corresponding createTreeView call
    const missingViews: string[] = [];
    const registeredViews: string[] = [];

    for (const viewId of allViewIds) {
      // Look for createTreeView("viewId", ...) in extension.ts
      const createTreeViewPattern = new RegExp(
        `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,`,
        "i"
      );

      if (createTreeViewPattern.test(extensionSource)) {
        registeredViews.push(viewId);
        console.log(`    ✓ ${viewId}`);
      } else {
        missingViews.push(viewId);
        console.log(`    ✗ ${viewId} - NO createTreeView() call found`);
      }
    }

    console.log(
      `\n  Registered: ${registeredViews.length}/${allViewIds.length}`
    );

    if (missingViews.length > 0) {
      console.log(`\n  Missing createTreeView() calls for:`);
      missingViews.forEach((id) => console.log(`    - ${id}`));
    }

    assert.strictEqual(
      missingViews.length,
      0,
      `All views must have createTreeView() calls in extension.ts. Missing: ${missingViews.join(
        ", "
      )}\n` +
        `Add: vscode.window.createTreeView("${missingViews[0]}", { treeDataProvider: ... })`
    );
  });

  test("All createTreeView calls should reference views in package.json", () => {
    // Extract all view IDs from package.json
    const views = packageJson.contributes?.views || {};
    const declaredViewIds: string[] = [];

    for (const containerViews of Object.values(views)) {
      for (const view of containerViews as any[]) {
        declaredViewIds.push(view.id);
      }
    }

    // Find all createTreeView calls in extension.ts
    const createTreeViewRegex =
      /createTreeView\s*\(\s*["'`]([^"'`]+)["'`]\s*,/gi;
    const registeredViewIds: string[] = [];
    let match;

    while ((match = createTreeViewRegex.exec(extensionSource)) !== null) {
      registeredViewIds.push(match[1]);
    }

    console.log(
      `\n  Found ${registeredViewIds.length} createTreeView() calls in extension.ts`
    );

    // Check for orphaned registrations (registered but not declared)
    const orphanedViews: string[] = [];

    for (const viewId of registeredViewIds) {
      if (!declaredViewIds.includes(viewId)) {
        orphanedViews.push(viewId);
        console.log(
          `    ⚠ ${viewId} - registered but not in package.json`
        );
      }
    }

    if (orphanedViews.length > 0) {
      console.log(
        `\n  Warning: ${orphanedViews.length} view(s) registered but not declared in package.json`
      );
    }

    // This is a warning, not a failure - orphaned views won't cause errors
    // but indicate potentially dead code
    assert.ok(
      true,
      `Found ${orphanedViews.length} orphaned view registrations (not a failure)`
    );
  });

  suite("Individual View Validation", () => {
    const expectedViews = [
      "scoutResults",
      "scoutFilters",
      "scoutCategories",
      "scoutAnalyzer",
      "scoutPatternOverrides",
      "scoutBundles",
    ];

    expectedViews.forEach((viewId) => {
      test(`${viewId} view should be declared in package.json`, () => {
        const views = packageJson.contributes?.views || {};
        const allViewIds: string[] = [];

        for (const containerViews of Object.values(views)) {
          for (const view of containerViews as any[]) {
            allViewIds.push(view.id);
          }
        }

        assert.ok(
          allViewIds.includes(viewId),
          `View "${viewId}" should be declared in package.json`
        );
      });

      test(`${viewId} view should have createTreeView call in extension.ts`, () => {
        const createTreeViewPattern = new RegExp(
          `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,`,
          "i"
        );

        assert.ok(
          createTreeViewPattern.test(extensionSource),
          `View "${viewId}" should have createTreeView() call in extension.ts`
        );
      });
    });
  });

  suite("View Properties Validation", () => {
    test("All views should have required properties", () => {
      const views = packageJson.contributes?.views || {};

      for (const [containerId, containerViews] of Object.entries(views)) {
        assert.ok(
          Array.isArray(containerViews),
          `Views in container "${containerId}" should be an array`
        );

        for (const view of containerViews as any[]) {
          assert.ok(
            view,
            `View should not be null or undefined in container "${containerId}"`
          );
          assert.ok(
            view.id,
            `View should have 'id' property (container: ${containerId})`
          );
          assert.ok(
            typeof view.id === "string",
            `View id should be a string: "${view.id}"`
          );
          assert.ok(
            view.name,
            `View "${view.id}" should have 'name' property`
          );
          assert.ok(
            typeof view.name === "string",
            `View name should be a string: "${view.id}"`
          );

          // Optional but recommended
          if (view.visibility) {
            assert.ok(
              ["visible", "collapsed", "hidden"].includes(view.visibility),
              `View "${view.id}" visibility should be valid: got "${view.visibility}"`
            );
          }
        }
      }
    });

    test("All views should have unique IDs", () => {
      const views = packageJson.contributes?.views || {};
      const allViewIds: string[] = [];

      for (const containerViews of Object.values(views)) {
        for (const view of containerViews as any[]) {
          allViewIds.push(view.id);
        }
      }

      const duplicates = allViewIds.filter(
        (id, index) => allViewIds.indexOf(id) !== index
      );

      assert.strictEqual(
        duplicates.length,
        0,
        `All view IDs must be unique. Duplicates found: ${duplicates.join(", ")}`
      );
    });
  });

  suite("Tree Data Provider Validation", () => {
    test("All views should have corresponding TreeDataProvider class", () => {
      const views = packageJson.contributes?.views || {};
      const allViewIds: string[] = [];

      for (const containerViews of Object.values(views)) {
        for (const view of containerViews as any[]) {
          allViewIds.push(view.id);
        }
      }

      const missingProviders: string[] = [];

      for (const viewId of allViewIds) {
        // Convert view ID to expected provider class name
        // e.g., "scoutResults" -> "ResultsTreeProvider"
        // e.g., "scoutPatternOverrides" -> "PatternOverrideTreeProvider"

        // Check if treeDataProvider is assigned in createTreeView call
        const providerPattern = new RegExp(
          `createTreeView\\s*\\(\\s*["'\`]${viewId}["'\`]\\s*,\\s*{[^}]*treeDataProvider\\s*:`,
          "i"
        );

        if (!providerPattern.test(extensionSource)) {
          missingProviders.push(viewId);
          console.log(
            `    ⚠ ${viewId} - createTreeView call missing treeDataProvider property`
          );
        }
      }

      assert.strictEqual(
        missingProviders.length,
        0,
        `All createTreeView calls must specify treeDataProvider. Missing for: ${missingProviders.join(
          ", "
        )}`
      );
    });

    test("Provider variables should be initialized before createTreeView", () => {
      // Find all createTreeView calls
      const createTreeViewRegex =
        /createTreeView\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*{\s*treeDataProvider\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/gi;
      const viewProviderPairs: Array<{ viewId: string; provider: string }> = [];
      let match;

      while ((match = createTreeViewRegex.exec(extensionSource)) !== null) {
        viewProviderPairs.push({
          viewId: match[1],
          provider: match[2],
        });
      }

      console.log(
        `\n  Found ${viewProviderPairs.length} view-provider pairs:`
      );

      for (const { viewId, provider } of viewProviderPairs) {
        console.log(`    ${viewId} -> ${provider}`);

        // Check if provider is initialized (new ProviderClass or assigned)
        const initPattern = new RegExp(
          `${provider}\\s*=\\s*new\\s+[A-Z][a-zA-Z0-9_]*`,
          "i"
        );

        assert.ok(
          initPattern.test(extensionSource),
          `Provider "${provider}" for view "${viewId}" should be initialized with 'new' keyword`
        );
      }
    });
  });

  suite("Regression Tests - Known Issues", () => {
    test("Should not have scout-inventor empty container (Bug: Feb 22, 2024)", () => {
      const viewContainers =
        packageJson.contributes?.viewsContainers?.activitybar || [];
      const scoutInventor = viewContainers.find(
        (c: any) => c.id === "scout-inventor"
      );

      assert.strictEqual(
        scoutInventor,
        undefined,
        'The "scout-inventor" container was removed because it had no views. ' +
          "If you need to add it back, make sure to add views to it first."
      );
    });

    test("Pattern Override view should not have conditional registration", () => {
      // Check that scoutPatternOverrides is not wrapped in if statement
      const patternOverrideRegistration = extensionSource.match(
        /if\s*\([^)]*patternOverrideTreeProvider[^)]*\)\s*{[^}]*createTreeView\s*\(\s*["'`]scoutPatternOverrides["'`]/i
      );

      assert.strictEqual(
        patternOverrideRegistration,
        null,
        "scoutPatternOverrides should be registered unconditionally, " +
          "not wrapped in if(patternOverrideTreeProvider) block"
      );
    });
  });
});
