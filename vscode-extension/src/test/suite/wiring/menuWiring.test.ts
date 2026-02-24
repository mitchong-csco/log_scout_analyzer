import * as assert from "assert";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * MENU WIRING VALIDATION TESTS
 *
 * These tests validate that:
 * 1. All menu items reference commands that exist
 * 2. Menu items have proper "when" clauses
 * 3. Menu groups are properly defined
 * 4. No menu items reference typo'd command IDs
 *
 * This catches errors where menus appear but clicking them fails.
 */

suite("Menu Wiring Validation", () => {
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

  suite("1. Context Menu Validation", () => {
    test("All context menu commands should exist", () => {
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];
      const missingCommands: string[] = [];

      for (const menu of contextMenus) {
        const commandId = menu.command;

        if (!registeredCommands.includes(commandId)) {
          missingCommands.push(
            `Menu item "${commandId}" references non-existent command`
          );
        }
      }

      if (missingCommands.length > 0) {
        assert.fail(
          `❌ Context menu wiring errors:\n${missingCommands.join("\n")}\n\n` +
          `Fix: Register these commands with vscode.commands.registerCommand() or remove from package.json`
        );
      }
    });

    test("Context menu items should have 'when' clauses", () => {
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];
      const missingWhen: string[] = [];

      for (const menu of contextMenus) {
        if (!menu.when) {
          missingWhen.push(
            `Menu item "${menu.command}" has no 'when' clause (will appear on ALL tree items)`
          );
        }
      }

      if (missingWhen.length > 0) {
        console.warn(
          `⚠️  Context menu items without 'when' clauses:\n${missingWhen.join("\n")}\n\n` +
          `Recommendation: Add 'when' clause to control visibility`
        );
      }
    });

    test("Context menu 'when' clauses should reference valid views", () => {
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validViewIds = views.map((v: any) => v.id);

      const invalidViews: string[] = [];

      for (const menu of contextMenus) {
        if (menu.when && menu.when.includes("view ==")) {
          // Extract view ID from when clause
          const viewMatch = menu.when.match(/view\s*==\s*['"]?([^'"&|\s]+)/);
          if (viewMatch) {
            const referencedView = viewMatch[1];
            if (!validViewIds.includes(referencedView)) {
              invalidViews.push(
                `Menu "${menu.command}" references non-existent view "${referencedView}"`
              );
            }
          }
        }
      }

      if (invalidViews.length > 0) {
        console.warn(
          `⚠️  Context menus reference invalid views:\n${invalidViews.join("\n")}`
        );
      }
    });

    test("Context menu groups should be consistent", () => {
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];
      const groups = new Set<string>();

      for (const menu of contextMenus) {
        if (menu.group) {
          // Extract group name (before @)
          const groupName = menu.group.split("@")[0];
          groups.add(groupName);
        }
      }

      console.log(`📊 Context menu groups used: ${[...groups].join(", ")}`);

      // Common VS Code menu groups
      const standardGroups = ["navigation", "inline", "1_modification", "2_workspace", "z_commands"];
      const customGroups = [...groups].filter(g => !standardGroups.includes(g));

      if (customGroups.length > 0) {
        console.log(`ℹ️  Custom menu groups: ${customGroups.join(", ")}`);
      }
    });
  });

  suite("2. View Title Menu Validation", () => {
    test("View title menu commands should exist", () => {
      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];
      const missingCommands: string[] = [];

      for (const menu of viewTitleMenus) {
        const commandId = menu.command;

        if (!registeredCommands.includes(commandId)) {
          missingCommands.push(
            `View title menu "${commandId}" references non-existent command`
          );
        }
      }

      if (missingCommands.length > 0) {
        assert.fail(
          `❌ View title menu wiring errors:\n${missingCommands.join("\n")}`
        );
      }
    });

    test("View title menus should reference valid views", () => {
      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];
      const views = packageJson.contributes?.views?.["scout-analyzer"] || [];
      const validViewIds = views.map((v: any) => v.id);

      const invalidReferences: string[] = [];

      for (const menu of viewTitleMenus) {
        if (menu.when && menu.when.includes("view ==")) {
          const viewMatch = menu.when.match(/view\s*==\s*['"]?([^'"&|\s]+)/);
          if (viewMatch) {
            const referencedView = viewMatch[1];
            if (!validViewIds.includes(referencedView)) {
              invalidReferences.push(
                `Menu "${menu.command}" references non-existent view "${referencedView}"`
              );
            }
          }
        }
      }

      if (invalidReferences.length > 0) {
        assert.fail(
          `❌ View title menus reference invalid views:\n${invalidReferences.join("\n")}`
        );
      }
    });

    test("View title menus should have when clauses", () => {
      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];
      const missingWhen: string[] = [];

      for (const menu of viewTitleMenus) {
        if (!menu.when) {
          missingWhen.push(
            `View title menu "${menu.command}" has no 'when' clause (will appear on ALL views)`
          );
        }
      }

      if (missingWhen.length > 0) {
        console.warn(
          `⚠️  View title menus without 'when' clauses:\n${missingWhen.join("\n")}`
        );
      }
    });
  });

  suite("3. Editor Context Menu Validation", () => {
    test("Editor context menu commands should exist", () => {
      const editorMenus = packageJson.contributes?.menus?.["editor/context"] || [];
      const missingCommands: string[] = [];

      for (const menu of editorMenus) {
        const commandId = menu.command;

        if (!registeredCommands.includes(commandId)) {
          missingCommands.push(
            `Editor menu "${commandId}" references non-existent command`
          );
        }
      }

      if (missingCommands.length > 0) {
        assert.fail(
          `❌ Editor context menu wiring errors:\n${missingCommands.join("\n")}`
        );
      }
    });

    test("Editor menus should have appropriate when clauses", () => {
      const editorMenus = packageJson.contributes?.menus?.["editor/context"] || [];
      const missingWhen: string[] = [];

      for (const menu of editorMenus) {
        if (!menu.when) {
          missingWhen.push(
            `Editor menu "${menu.command}" has no 'when' clause (will appear in ALL editors)`
          );
        }
      }

      if (missingWhen.length > 0) {
        console.warn(
          `⚠️  Editor menus without 'when' clauses:\n${missingWhen.join("\n")}\n\n` +
          `Recommendation: Add 'when' clause like 'editorLangId == log' to control visibility`
        );
      }
    });
  });

  suite("4. Command Palette Menu Validation", () => {
    test("Command palette filters should be valid", () => {
      const commandPaletteMenus = packageJson.contributes?.menus?.["commandPalette"] || [];
      const declaredCommands = (packageJson.contributes?.commands || [])
        .map((c: any) => c.command);

      const invalidCommands: string[] = [];

      for (const menu of commandPaletteMenus) {
        const commandId = menu.command;

        if (!declaredCommands.includes(commandId)) {
          invalidCommands.push(
            `Command palette menu references undeclared command: ${commandId}`
          );
        }
      }

      if (invalidCommands.length > 0) {
        console.warn(
          `⚠️  Command palette menu issues:\n${invalidCommands.join("\n")}`
        );
      }
    });

    test("Hidden commands should have false in when clause", () => {
      const commandPaletteMenus = packageJson.contributes?.menus?.["commandPalette"] || [];
      const hiddenCommands: string[] = [];

      for (const menu of commandPaletteMenus) {
        if (menu.when === "false") {
          hiddenCommands.push(menu.command);
        }
      }

      if (hiddenCommands.length > 0) {
        console.log(
          `ℹ️  Commands hidden from Command Palette (when: false):\n` +
          hiddenCommands.map(c => `  - ${c}`).join("\n")
        );
      }
    });
  });

  suite("5. Menu Icon Validation", () => {
    test("Menu items should have icons where appropriate", () => {
      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];

      const missingIcons: string[] = [];

      // View title menus should have icons (they're toolbar buttons)
      for (const menu of viewTitleMenus) {
        // Check if command itself has icon
        const command = (packageJson.contributes?.commands || [])
          .find((c: any) => c.command === menu.command);

        if (command && !command.icon) {
          missingIcons.push(
            `View title menu "${menu.command}" should have icon (appears in toolbar)`
          );
        }
      }

      // Context menus with group "navigation" should have icons
      for (const menu of contextMenus) {
        if (menu.group && menu.group.startsWith("navigation")) {
          const command = (packageJson.contributes?.commands || [])
            .find((c: any) => c.command === menu.command);

          if (command && !command.icon) {
            missingIcons.push(
              `Navigation menu "${menu.command}" should have icon`
            );
          }
        }
      }

      if (missingIcons.length > 0) {
        console.warn(
          `⚠️  Menu items missing icons:\n${missingIcons.join("\n")}`
        );
      }
    });
  });

  suite("6. Menu Duplication Check", () => {
    test("No duplicate menu entries", () => {
      const allMenuTypes = [
        "view/item/context",
        "view/title",
        "editor/context",
        "commandPalette"
      ];

      for (const menuType of allMenuTypes) {
        const menus = packageJson.contributes?.menus?.[menuType] || [];
        const seen = new Map<string, number>();

        for (const menu of menus) {
          const key = `${menu.command}|${menu.when || ""}|${menu.group || ""}`;
          seen.set(key, (seen.get(key) || 0) + 1);
        }

        const duplicates: string[] = [];
        for (const [key, count] of seen) {
          if (count > 1) {
            duplicates.push(`${key.split("|")[0]} (${count} times)`);
          }
        }

        if (duplicates.length > 0) {
          console.warn(
            `⚠️  Duplicate menu entries in ${menuType}:\n${duplicates.join("\n")}`
          );
        }
      }
    });
  });

  suite("7. Critical Menu Items", () => {
    test("Import Archive should be in appropriate menus", () => {
      const commandId = "logScoutAnalyzer.importArchive";

      // Should be in Command Palette (via commands contribution)
      const commands = packageJson.contributes?.commands || [];
      const commandDeclared = commands.find((c: any) => c.command === commandId);
      assert.ok(commandDeclared, "Import Archive should be declared as command");

      // Check if it's in any view title menus (toolbar)
      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];
      const inViewTitle = viewTitleMenus.some((m: any) => m.command === commandId);

      console.log(`ℹ️  Import Archive in view title menu: ${inViewTitle ? "Yes" : "No"}`);
    });

    test("Analyze Bundle should be in bundle context menu", () => {
      const commandId = "logScoutAnalyzer.bundle.analyze";
      const contextMenus = packageJson.contributes?.menus?.["view/item/context"] || [];

      const inContextMenu = contextMenus.some((m: any) => {
        return m.command === commandId &&
               m.when &&
               m.when.includes("viewItem == bundle");
      });

      assert.ok(
        inContextMenu,
        "Analyze Bundle should be in bundle context menu with proper 'when' clause"
      );
    });

    test("Refresh commands should be in view title menus", () => {
      const refreshCommands = [
        "logScoutAnalyzer.bundle.refresh",
        "logScoutAnalyzer.refreshResults"
      ];

      const viewTitleMenus = packageJson.contributes?.menus?.["view/title"] || [];

      for (const cmdId of refreshCommands) {
        const inMenu = viewTitleMenus.some((m: any) => m.command === cmdId);

        if (!inMenu) {
          console.warn(
            `⚠️  Refresh command "${cmdId}" not found in view title menu`
          );
        }
      }
    });
  });

  suite("8. Summary Report", () => {
    test("Generate menu wiring health report", () => {
      const menuTypes = packageJson.contributes?.menus || {};
      const menuTypeCounts = Object.keys(menuTypes).map(type => ({
        type,
        count: menuTypes[type].length
      }));

      console.log("\n" + "=".repeat(60));
      console.log("📊 MENU WIRING HEALTH REPORT");
      console.log("=".repeat(60));

      for (const { type, count } of menuTypeCounts) {
        console.log(`${type.padEnd(30)}: ${count} items`);
      }

      const totalMenuItems = menuTypeCounts.reduce((sum, m) => sum + m.count, 0);
      console.log("-".repeat(60));
      console.log(`Total menu items: ${totalMenuItems}`);
      console.log("=".repeat(60) + "\n");

      assert.ok(true);
    });
  });
});
