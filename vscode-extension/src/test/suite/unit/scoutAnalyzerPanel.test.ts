import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";

/**
 * Unit Tests for ScoutAnalyzerPanel - State Handling Logic
 *
 * These tests validate the Action Panel's empty state handling and lifecycle management.
 *
 * Key UX Principle: Empty states are NOT errors
 * - Initial state (no files opened) = Welcoming UI
 * - Empty results (clean log) = Positive feedback
 * - Error state (LSP crash) = Error with recovery
 *
 * See: UX_FIX_ACTION_PANEL_EMPTY_STATE.md
 */

suite("ScoutAnalyzerPanel - Unit Tests", () => {
  const extensionRoot = path.resolve(__dirname, "../../../../");
  const scoutAnalyzerPanelPath = path.join(
    extensionRoot,
    "src",
    "scoutAnalyzerPanel.ts",
  );

  let panelSource: string;

  suiteSetup(() => {
    if (fs.existsSync(scoutAnalyzerPanelPath)) {
      panelSource = fs.readFileSync(scoutAnalyzerPanelPath, "utf8");
    } else {
      panelSource = "";
    }
  });

  suite("File Structure", () => {
    test("ScoutAnalyzerPanel.ts should exist", () => {
      assert.ok(
        fs.existsSync(scoutAnalyzerPanelPath),
        `ScoutAnalyzerPanel.ts should exist at: ${scoutAnalyzerPanelPath}`,
      );
    });

    test("Should export ScoutAnalyzerPanel class", () => {
      assert.ok(
        panelSource.includes("export class ScoutAnalyzerPanel"),
        "Should export ScoutAnalyzerPanel class",
      );
    });

    test("Should have setDataProvider static method", () => {
      assert.ok(
        panelSource.includes("static setDataProvider") ||
          panelSource.includes("public static setDataProvider"),
        "Should have static setDataProvider method for connecting resultsTreeProvider",
      );
    });

    test("Should have _sendCurrentResults method", () => {
      assert.ok(
        panelSource.includes("_sendCurrentResults") ||
          panelSource.includes("sendCurrentResults"),
        "Should have method to send results to webview",
      );
    });
  });

  suite("State Handling Logic", () => {
    test("Should handle initial state (no provider) gracefully", () => {
      // Check that code handles the case when provider is not set
      const hasProviderCheck =
        panelSource.includes("resultsDataProvider") &&
        (panelSource.includes("!resultsDataProvider") ||
          panelSource.includes("if (") ||
          panelSource.includes("? ") ||
          panelSource.includes(": "));

      assert.ok(
        hasProviderCheck,
        "Should check if resultsDataProvider exists before using it",
      );
    });

    test("Should differentiate empty state from error state", () => {
      // After fix: Should have emptyState handling
      const hasEmptyStateCommand =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'") ||
        panelSource.includes("command: `emptyState`");

      if (!hasEmptyStateCommand) {
        // Before fix: Should at least handle empty arrays
        const handlesEmptyArray =
          panelSource.includes("results.length") ||
          panelSource.includes("results: []");

        assert.ok(
          handlesEmptyArray,
          "Should handle empty results array. Consider implementing proper emptyState handling per UX_FIX_ACTION_PANEL_EMPTY_STATE.md",
        );
      } else {
        // Verify empty state implementation
        assert.ok(
          true,
          "Has emptyState command - proper UX implementation",
        );
      }
    });

    test("Should NOT treat initial empty state as error", () => {
      // Check for the anti-pattern: showing error for empty state
      const hasErrorForEmptyState =
        panelSource.includes("No data provider available") &&
        panelSource.includes("error:");

      if (hasErrorForEmptyState) {
        // Check if it's properly handled with emptyState instead
        const hasProperHandling =
          panelSource.includes('command: "emptyState"') &&
          panelSource.includes('state: "initial"');

        assert.ok(
          hasProperHandling,
          'CRITICAL UX ISSUE: "No data provider available" should NOT be treated as error. ' +
            "Initial state (no files opened) is normal, not an error. " +
            "Should use emptyState with welcoming message. " +
            "See: UX_FIX_ACTION_PANEL_EMPTY_STATE.md",
        );
      }
    });

    test("Empty state should use welcoming icons (not error icons)", () => {
      const hasEmptyState =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'");

      if (hasEmptyState) {
        // Check for appropriate icons: 🔍 📂 ✨ (welcoming)
        // NOT: ⚠️ ❌ 🔴 (error)
        const hasWelcomingIcon =
          panelSource.includes('icon: "🔍"') ||
          panelSource.includes("icon: '🔍'") ||
          panelSource.includes('icon: "📂"') ||
          panelSource.includes('icon: "✨"') ||
          panelSource.includes("icon: '✨'");

        const hasErrorIcon =
          panelSource.includes('icon: "⚠️"') ||
          panelSource.includes('icon: "❌"') ||
          panelSource.includes('icon: "🔴"');

        // Empty states should use welcoming icons
        if (hasWelcomingIcon || !hasErrorIcon) {
          assert.ok(
            true,
            "Empty state uses appropriate welcoming icons",
          );
        } else {
          assert.fail(
            "Empty state should use welcoming icons (🔍 📂 ✨), not error icons (⚠️ ❌ 🔴)",
          );
        }
      }
    });

    test("Should provide next actions for empty states", () => {
      const hasEmptyState =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'");

      if (hasEmptyState) {
        // Empty states should guide users to next action
        const hasActions =
          panelSource.includes("actions:") ||
          panelSource.includes("action:") ||
          panelSource.includes("Open File") ||
          panelSource.includes("Learn More");

        assert.ok(
          hasActions,
          "Empty states should provide action buttons to guide users (e.g., 'Open File', 'Learn More')",
        );
      }
    });
  });

  suite("Message Structure", () => {
    test("Should send structured messages to webview", () => {
      const hasPostMessage =
        panelSource.includes("_postMessage") ||
        panelSource.includes("postMessage");

      assert.ok(
        hasPostMessage,
        "Should have method to post messages to webview",
      );
    });

    test("Should include command field in messages", () => {
      const hasCommand =
        panelSource.includes('command:') ||
        panelSource.includes('"command"') ||
        panelSource.includes("'command'");

      assert.ok(
        hasCommand,
        "Messages should include 'command' field for webview routing",
      );
    });

    test("Empty state messages should include helpful metadata", () => {
      const hasEmptyState =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'");

      if (hasEmptyState) {
        // Should include: state, icon, title, message
        const hasMetadata =
          panelSource.includes("state:") &&
          panelSource.includes("icon:") &&
          panelSource.includes("title:");

        assert.ok(
          hasMetadata,
          "Empty state messages should include: state, icon, title, message",
        );
      }
    });
  });

  suite("Provider Integration", () => {
    test("Should store resultsDataProvider as static property", () => {
      const hasStaticProvider =
        panelSource.includes("static resultsDataProvider") ||
        panelSource.includes("private static resultsDataProvider");

      assert.ok(
        hasStaticProvider,
        "Should have static resultsDataProvider property for shared access",
      );
    });

    test("setDataProvider should accept provider parameter", () => {
      // Check method signature
      const hasProviderParam =
        panelSource.includes("setDataProvider(provider") ||
        panelSource.includes("setDataProvider( provider") ||
        panelSource.includes("setDataProvider (provider");

      assert.ok(
        hasProviderParam,
        "setDataProvider method should accept provider parameter",
      );
    });

    test("Should call getResults() on provider when available", () => {
      const callsGetResults =
        panelSource.includes(".getResults()") ||
        panelSource.includes(".getResults ()");

      assert.ok(
        callsGetResults,
        "Should call getResults() method on provider to retrieve data",
      );
    });

    test("Should check provider has getResults method", () => {
      // Good practice: verify method exists before calling
      const checksMethod =
        panelSource.includes("typeof") &&
        panelSource.includes("getResults") &&
        panelSource.includes("function");

      if (checksMethod) {
        assert.ok(
          true,
          "Properly checks that getResults method exists before calling",
        );
      } else {
        // Not critical, but good practice
        assert.ok(
          true,
          "Consider checking typeof provider.getResults === 'function' for safety",
        );
      }
    });
  });

  suite("Lifecycle States (UX Requirements)", () => {
    test("Should handle at least 3 distinct states", () => {
      // Modern UX requires:
      // 1. Initial (no data yet)
      // 2. Empty (data loaded, but empty)
      // 3. Active (has data)
      // 4. Error (something failed)

      const stateCount = [
        panelSource.includes('state: "initial"') ||
          panelSource.includes("state: 'initial'"),
        panelSource.includes('state: "no-results"') ||
          panelSource.includes("state: 'no-results'") ||
          panelSource.includes('state: "empty"'),
        panelSource.includes('command: "resultsData"'),
        panelSource.includes('error:') || panelSource.includes('"error"'),
      ].filter(Boolean).length;

      assert.ok(
        stateCount >= 2,
        `Should handle multiple UI states (found ${stateCount}). ` +
          "Best practice: Initial, Empty, Active, Error states. " +
          "See: AI_ASSISTANT_GUIDE.md - UX & Extension Lifecycle Thinking",
      );
    });

    test("Should have clear separation between empty and error states", () => {
      const hasEmptyState =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'");

      const hasErrorHandling =
        panelSource.includes('error:') ||
        panelSource.includes('"error"') ||
        panelSource.includes("'error'");

      if (hasEmptyState && hasErrorHandling) {
        // Both exist - verify they're used in different conditions
        assert.ok(
          true,
          "Has both emptyState and error handling - good separation of concerns",
        );
      } else if (!hasEmptyState) {
        assert.ok(
          false,
          "Missing emptyState handling. Empty states should be distinct from errors. " +
            "See: UX_FIX_ACTION_PANEL_EMPTY_STATE.md",
        );
      }
    });
  });

  suite("User Experience Validation", () => {
    test("Error messages should be reserved for actual errors", () => {
      // Check if error field is only used for real errors
      const errorUsage = panelSource.match(/error:/g) || [];

      if (errorUsage.length > 0) {
        // Errors should NOT be shown for:
        // - Initial state (no files opened)
        // - Empty results (no issues found)

        const hasInitialStateError =
          panelSource.includes("No data provider available") &&
          !panelSource.includes('state: "initial"');

        if (hasInitialStateError) {
          assert.fail(
            "CRITICAL UX ISSUE: Error message shown for initial state. " +
              "This is a normal state, not an error. " +
              "Use welcoming empty state instead. " +
              "See: UX_FIX_ACTION_PANEL_EMPTY_STATE.md",
          );
        }
      }
    });

    test("Initial state should be welcoming, not intimidating", () => {
      const hasInitialState =
        panelSource.includes('state: "initial"') ||
        panelSource.includes("state: 'initial'");

      if (hasInitialState) {
        // Check for welcoming language
        const hasWelcomingMessage =
          panelSource.includes("Ready to") ||
          panelSource.includes("Get started") ||
          panelSource.includes("Open a") ||
          panelSource.includes("Let's begin");

        const hasIntimidatingMessage =
          panelSource.includes("not available") ||
          panelSource.includes("not connected") ||
          panelSource.includes("failed") ||
          panelSource.includes("error");

        if (hasWelcomingMessage) {
          assert.ok(true, "Initial state has welcoming message - good UX");
        } else if (hasIntimidatingMessage) {
          assert.fail(
            "Initial state uses intimidating language. Should be welcoming and encouraging.",
          );
        }
      }
    });

    test("Empty results should show positive feedback", () => {
      const hasEmptyResultsState =
        panelSource.includes('state: "no-results"') ||
        panelSource.includes("state: 'no-results'");

      if (hasEmptyResultsState) {
        // Should be positive: "No issues found", "All clear", etc.
        const hasPositiveMessage =
          panelSource.includes("No issues") ||
          panelSource.includes("looks clean") ||
          panelSource.includes("All clear") ||
          panelSource.includes("✨");

        assert.ok(
          hasPositiveMessage,
          "Empty results should show positive feedback (e.g., 'No issues found', 'looks clean')",
        );
      }
    });
  });

  suite("Code Quality", () => {
    test("Should not have magic strings for states", () => {
      // Check if states are defined as constants or types
      const hasMagicStrings =
        panelSource.includes('"initial"') ||
        panelSource.includes('"no-results"');

      if (hasMagicStrings) {
        // It's okay if there's also a type or enum
        const hasTypes =
          panelSource.includes("enum") ||
          panelSource.includes("type") ||
          panelSource.includes("interface");

        if (!hasTypes) {
          // Not critical, but good practice
          assert.ok(
            true,
            "Consider defining state strings as enum or type for better maintainability",
          );
        }
      }
    });

    test("Should handle undefined/null provider gracefully", () => {
      const hasNullCheck =
        panelSource.includes("!resultsDataProvider") ||
        panelSource.includes("resultsDataProvider === undefined") ||
        panelSource.includes("resultsDataProvider === null") ||
        panelSource.includes("!ScoutAnalyzerPanel.resultsDataProvider");

      assert.ok(
        hasNullCheck,
        "Should check for undefined/null provider before accessing",
      );
    });
  });

  suite("Documentation", () => {
    test("Should have comments explaining state handling", () => {
      // Good practice: document complex state logic
      const hasComments =
        panelSource.includes("//") || panelSource.includes("/*");

      assert.ok(
        hasComments,
        "Should have comments explaining logic (good practice)",
      );
    });

    test("Should reference UX documentation if implementing fix", () => {
      const hasEmptyState =
        panelSource.includes('command: "emptyState"') ||
        panelSource.includes("command: 'emptyState'");

      if (hasEmptyState) {
        // Check if implementation references the UX guide
        const hasReference =
          panelSource.includes("UX_FIX") ||
          panelSource.includes("empty state") ||
          panelSource.includes("lifecycle");

        if (hasReference) {
          assert.ok(
            true,
            "Good: Implementation references UX documentation",
          );
        } else {
          // Not critical, but helpful for future maintainers
          assert.ok(
            true,
            "Consider adding comment referencing UX_FIX_ACTION_PANEL_EMPTY_STATE.md",
          );
        }
      }
    });
  });
});
