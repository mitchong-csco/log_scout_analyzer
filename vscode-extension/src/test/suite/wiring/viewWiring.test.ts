import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * VIEW WIRING VALIDATION TESTS
 *
 * These tests validate that:
 * 1. All views declared in package.json are properly configured
 * 2. Views have proper activation events
 * 3. TreeDataProviders are registered for tree views
 * 4. View containers are properly defined
 *
 * This catches errors where views don't appear or fail to load.
 */

suite("View Wiring Validation", () => {
  let packageJson: any;
  let extensionSource: string;

  suiteSetup(async function() {
    this.timeout(30000);

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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  suite("1. View Container Configuration", () => {
    test("View containers should be properly defined", () => {
      const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];

      assert.ok(
        viewContainers.length > 0,
        "Should have at least one view container defined"
      );

      for (const container of viewContainers) {
        assert.ok(container.id, "View container should have id");
        assert.ok(container.title, "View container should have title");
        assert.ok(container.icon, "View container should have icon");
      }
    });

    test("scout-analyzer view container should exist", () => {
      const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];
      const scoutContainer = viewContainers.find((c: any) => c.id === "scout-analyzer");

      assert.ok(
        scoutContainer,
        "scout-analyzer view container should be defined"
      );

      assert.strictEqual(
        scoutContainer.id,
        "scout-analyzer",
        "View container should have correct id"
      );
    });

    test("View container icon should be valid", () => {
      const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];
      const scoutContainer = viewContainers.find((c: any) => c.id === "scout-analyzer");

      if (scoutContainer) {
        assert.ok(
          scoutContainer.icon,
          "View container should have icon"
        );

        // Check icon format
        if (typeof scoutContainer.icon === "string") {
          assert.ok(
            scoutContainer.icon.startsWith("$(") ||
            scoutContainer.icon.endsWith(".svg") ||
            scoutContainer.icon.endsWith(".png"),
            "Icon should be ThemeIcon $(name) or image path"
          );
        }
      }
    });
  });

  suite("2. View Configuration", () => {
    test("All views should be properly configured", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];

      assert.ok(
        views.length > 0,
        "Should have views defined in scout-analyzer container"
      );

      for (const view of views) {
        assert.ok(view.id, `View should have id: ${JSON.stringify(view)}`);
        assert.ok(view.name, `View ${view.id} should have name`);
      }
    });

    test("Required views should exist", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const viewIds = views.map((v: any) => v.id);

      const requiredViews = [
        "scoutBundles",
        "scoutResults",
        "scoutFilters",
        "scoutCategories"
      ];

      const missing: string[] = [];

      for (const requiredId of requiredViews) {
        if (!viewIds.includes(requiredId)) {
          missing.push(requiredId);
        }
      }

      if (missing.length > 0) {
        assert.fail(
          `❌ Required views are missing:\n${missing.map(v => `  - ${v}`).join("\n")}`
        );
      }
    });

    test("View IDs should follow naming convention", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const issues: string[] = [];

      for (const view of views) {
        const viewId = view.id;

        // Should start with "scout"
        if (!viewId.startsWith("scout")) {
          issues.push(
            `⚠️  View "${viewId}" doesn't follow naming convention (should start with "scout")`
          );
        }

        // Should be camelCase
        if (viewId.includes("_") || viewId.includes("-")) {
          issues.push(
            `⚠️  View "${viewId}" should use camelCase (found underscore or dash)`
          );
        }

        // Should not be too long
        if (viewId.length > 30) {
          issues.push(
            `⚠️  View "${viewId}" has very long ID (${viewId.length} chars)`
          );
        }
      }

      if (issues.length > 0) {
        console.warn(`View naming issues:\n${issues.join("\n")}`);
      }
    });

    test("View names should be descriptive", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const issues: string[] = [];

      for (const view of views) {
        if (!view.name) {
          issues.push(`❌ View "${view.id}" has no name`);
        } else if (view.name.length < 3) {
          issues.push(`⚠️  View "${view.id}" name is too short: "${view.name}"`);
        } else if (view.name.length > 40) {
          issues.push(
            `⚠️  View "${view.id}" name is too long (${view.name.length} chars)`
          );
        }
      }

      if (issues.length > 0) {
        console.warn(`View name issues:\n${issues.join("\n")}`);
      }
    });

    test("Views should have icons", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const missingIcons: string[] = [];

      for (const view of views) {
        if (!view.icon) {
          missingIcons.push(view.id);
        }
      }

      if (missingIcons.length > 0) {
        console.warn(
          `⚠️  Views without icons (recommended for better UX):\n${missingIcons.map(v => `  - ${v}`).join("\n")}`
        );
      }
    });

    test("View visibility settings should be valid", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validVisibility = ["visible", "collapsed", "hidden"];

      for (const view of views) {
        if (view.visibility) {
          assert.ok(
            validVisibility.includes(view.visibility),
            `View "${view.id}" has invalid visibility: "${view.visibility}". Must be one of: ${validVisibility.join(", ")}`
          );
        }
      }
    });
  });

  suite("3. View Activation Events", () => {
    test("Views should have activation events", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const activationEvents = packageJson.activationEvents || [];
      const hasWildcard = activationEvents.includes("*");

      if (hasWildcard) {
        console.log("✅ Using wildcard activation (*) - all views will load");
        return;
      }

      const missingActivation: string[] = [];

      for (const view of views) {
        const hasActivation = activationEvents.some(
          (event: string) => event === `onView:${view.id}`
        );

        if (!hasActivation) {
          missingActivation.push(view.id);
        }
      }

      if (missingActivation.length > 0) {
        console.warn(
          `⚠️  Views without activation events:\n${missingActivation.map(v => `  - ${v}`).join("\n")}\n\n` +
          `These views may not load until extension activates via another event.`
        );
      }
    });

    test("Activation events should reference valid views", () => {
      const activationEvents = packageJson.activationEvents || [];
      const viewEvents = activationEvents.filter((e: string) =>
        e.startsWith("onView:")
      );

      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validViewIds = views.map((v: any) => v.id);

      const invalidEvents: string[] = [];

      for (const event of viewEvents) {
        const viewId = event.replace("onView:", "");

        if (viewId.startsWith("scout") && !validViewIds.includes(viewId)) {
          invalidEvents.push(event);
        }
      }

      if (invalidEvents.length > 0) {
        console.warn(
          `⚠️  Activation events reference non-existent views:\n${invalidEvents.map(e => `  - ${e}`).join("\n")}`
        );
      }
    });
  });

  suite("4. TreeDataProvider Registration", () => {
    test("TreeDataProviders should be registered in code", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const treeViews = views.filter((v: any) =>
        v.id.includes("Bundles") ||
        v.id.includes("Results") ||
        v.id.includes("Categories") ||
        v.id.includes("Filters")
      );

      const issues: string[] = [];

      for (const view of treeViews) {
        const viewId = view.id;

        // Check for registerTreeDataProvider or createTreeView
        const hasRegistration =
          extensionSource.includes(`registerTreeDataProvider("${viewId}"`) ||
          extensionSource.includes(`registerTreeDataProvider('${viewId}'`) ||
          extensionSource.includes(`createTreeView("${viewId}"`) ||
          extensionSource.includes(`createTreeView('${viewId}'`);

        if (!hasRegistration) {
          issues.push(
            `View "${viewId}" may not have TreeDataProvider registered`
          );
        }
      }

      if (issues.length > 0) {
        console.warn(
          `⚠️  Potential TreeDataProvider registration issues:\n${issues.join("\n")}\n\n` +
          `Check that each view has vscode.window.registerTreeDataProvider() or createTreeView()`
        );
      }
    });

    test("TreeDataProvider classes should exist", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      const expectedProviders = [
        "BundleTreeProvider",
        "ResultsTreeProvider",
        "CategoriesTreeProvider",
        "FilterTreeProvider"
      ];

      const missing: string[] = [];

      for (const provider of expectedProviders) {
        const hasImport =
          extensionSource.includes(`import`) && extensionSource.includes(provider) ||
          extensionSource.includes(`from`) && extensionSource.includes(provider);

        if (!hasImport) {
          missing.push(provider);
        }
      }

      if (missing.length > 0) {
        console.warn(
          `⚠️  TreeDataProvider classes not imported:\n${missing.map(p => `  - ${p}`).join("\n")}`
        );
      }
    });

    test("TreeDataProviders should be instantiated", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      const providerPatterns = [
        /new\s+BundleTreeProvider/,
        /new\s+ResultsTreeProvider/,
        /new\s+CategoriesTreeProvider/,
        /new\s+FilterTreeProvider/
      ];

      const missing: string[] = [];

      for (let i = 0; i < providerPatterns.length; i++) {
        const pattern = providerPatterns[i];
        if (!pattern.test(extensionSource)) {
          missing.push(pattern.source.replace(/new\\s\+/g, ""));
        }
      }

      if (missing.length > 0) {
        console.warn(
          `⚠️  TreeDataProviders may not be instantiated:\n${missing.join("\n")}`
        );
      }
    });

    test("TreeDataProviders should be subscribed for disposal", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      // Check that providers are added to subscriptions
      const hasSubscriptions =
        extensionSource.includes("context.subscriptions.push") &&
        (extensionSource.includes("registerTreeDataProvider") ||
         extensionSource.includes("createTreeView"));

      assert.ok(
        hasSubscriptions,
        "TreeDataProviders should be added to context.subscriptions for proper disposal"
      );
    });
  });

  suite("5. View Welcome Content", () => {
    test("Empty state views should have welcome content", () => {
      const viewsWelcome = packageJson.contributes?.viewsWelcome || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const viewIds = views.map((v: any) => v.id);

      // Check which views have welcome content
      const viewsWithWelcome = viewsWelcome.map((w: any) => w.view);
      const viewsWithoutWelcome = viewIds.filter(
        (id: string) => !viewsWithWelcome.includes(id)
      );

      if (viewsWithoutWelcome.length > 0) {
        console.log(
          `ℹ️  Views without welcome content (consider adding for better empty state UX):\n${viewsWithoutWelcome.map((v: string) => `  - ${v}`).join("\n")}`
        );
      }
    });

    test("Welcome content should reference valid views", () => {
      const viewsWelcome = packageJson.contributes?.viewsWelcome || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validViewIds = views.map((v: any) => v.id);

      const invalidReferences: string[] = [];

      for (const welcome of viewsWelcome) {
        if (!validViewIds.includes(welcome.view)) {
          invalidReferences.push(
            `Welcome content references non-existent view: ${welcome.view}`
          );
        }
      }

      if (invalidReferences.length > 0) {
        assert.fail(
          `❌ Invalid viewsWelcome configuration:\n${invalidReferences.join("\n")}`
        );
      }
    });

    test("Welcome content should have when clauses", () => {
      const viewsWelcome = packageJson.contributes?.viewsWelcome || [];
      const missingWhen: string[] = [];

      for (const welcome of viewsWelcome) {
        if (!welcome.when) {
          missingWhen.push(
            `Welcome content for "${welcome.view}" has no 'when' clause (will always show)`
          );
        }
      }

      if (missingWhen.length > 0) {
        console.warn(
          `⚠️  Welcome content without 'when' clauses:\n${missingWhen.join("\n")}`
        );
      }
    });
  });

  suite("6. Critical Views Validation", () => {
    test("scoutBundles view should be properly configured", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const bundlesView = views.find((v: any) => v.id === "scoutBundles");

      assert.ok(bundlesView, "scoutBundles view should exist");
      assert.ok(bundlesView.name, "scoutBundles should have name");
      assert.strictEqual(
        bundlesView.name,
        "Bundles",
        "scoutBundles should be named 'Bundles'"
      );
    });

    test("scoutResults view should be properly configured", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const resultsView = views.find((v: any) => v.id === "scoutResults");

      assert.ok(resultsView, "scoutResults view should exist");
      assert.ok(resultsView.name, "scoutResults should have name");
    });

    test("scoutBundles should have TreeDataProvider registered", function() {
      if (!extensionSource) {
        this.skip();
        return;
      }

      const hasBundleProvider =
        extensionSource.includes('registerTreeDataProvider("scoutBundles"') ||
        extensionSource.includes("registerTreeDataProvider('scoutBundles'") ||
        extensionSource.includes('createTreeView("scoutBundles"') ||
        extensionSource.includes("createTreeView('scoutBundles'");

      assert.ok(
        hasBundleProvider,
        "scoutBundles view should have TreeDataProvider registered"
      );
    });
  });

  suite("7. View Interaction Validation", () => {
    test("Views should not have conflicting when clauses", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const whenClauses = views
        .filter((v: any) => v.when)
        .map((v: any) => ({ id: v.id, when: v.when }));

      // Check for mutually exclusive views
      const conflicts: string[] = [];

      for (let i = 0; i < whenClauses.length; i++) {
        for (let j = i + 1; j < whenClauses.length; j++) {
          const view1 = whenClauses[i];
          const view2 = whenClauses[j];

          // If both use same condition variable, might be mutually exclusive
          if (view1.when === view2.when) {
            conflicts.push(
              `Views "${view1.id}" and "${view2.id}" have identical 'when' clauses`
            );
          }
        }
      }

      if (conflicts.length > 0) {
        console.log(
          `ℹ️  Views with identical 'when' clauses (may be intentional):\n${conflicts.join("\n")}`
        );
      }
    });

    test("View order should be logical", () => {
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const viewNames = views.map((v: any) => v.name);

      console.log(`ℹ️  View display order:\n${viewNames.map((n: string, i: number) => `  ${i + 1}. ${n}`).join("\n")}`);

      // Bundles should typically be first
      if (views.length > 0 && views[0].id !== "scoutBundles") {
        console.log(
          `💡 Consider: "Bundles" view is typically shown first in the Activity Bar`
        );
      }
    });
  });

  suite("8. Summary Report", () => {
    test("Generate view wiring health report", () => {
      const viewContainers = packageJson.contributes?.viewsContainers?.activitybar || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const viewsWelcome = packageJson.contributes?.viewsWelcome || [];
      const activationEvents = packageJson.activationEvents || [];
      const viewActivations = activationEvents.filter((e: string) => e.startsWith("onView:"));

      console.log("\n" + "=".repeat(60));
      console.log("📊 VIEW WIRING HEALTH REPORT");
      console.log("=".repeat(60));
      console.log(`View Containers:        ${viewContainers.length}`);
      console.log(`Views (scout-analyzer): ${views.length}`);
      console.log(`Views with welcome:     ${viewsWelcome.length}`);
      console.log(`View activation events: ${viewActivations.length}`);
      console.log("-".repeat(60));

      console.log("\nViews:");
      for (const view of views) {
        const icon = view.icon ? "✓" : " ";
        const visibility = view.visibility || "visible";
        console.log(`  [${icon}] ${view.id.padEnd(25)} - ${view.name} (${visibility})`);
      }

      console.log("=".repeat(60) + "\n");

      assert.ok(true);
    });
  });
});
