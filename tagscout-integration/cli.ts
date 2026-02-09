#!/usr/bin/env node
/**
 * TagScout Integration CLI
 *
 * Command-line interface for syncing and managing TagScout patterns
 * in Log Scout Analyzer.
 *
 * Usage:
 *   tagscout-cli sync                    - Sync patterns from TagScout
 *   tagscout-cli sync --product Jabber   - Sync patterns for specific product
 *   tagscout-cli list                    - List available products
 *   tagscout-cli export                  - Export to VS Code settings
 *   tagscout-cli docs                    - Generate documentation
 *   tagscout-cli test                    - Test TagScout connection
 *   tagscout-cli status                  - Show sync status
 *   tagscout-cli clear-cache             - Clear cached patterns
 *   tagscout-cli sync-lsp                - Sync patterns to LSP server
 *   tagscout-cli sync-lsp --product Jabber - Sync product patterns to LSP
 */

import * as fs from "fs";
import * as path from "path";
import { TagScoutClient } from "./tagscout-client";
import { PatternConverter } from "./pattern-converter";
import { TagScoutSyncService, SyncConfig } from "./sync-service";
import { syncTagScoutToLSP, LSPBridgeOptions } from "./lsp-bridge";

/**
 * CLI Arguments
 */
interface CLIArgs {
    command: string;
    product?: string;
    output?: string;
    force?: boolean;
    verbose?: boolean;
    autoSync?: boolean;
    interval?: number;
    help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIArgs {
    const parsed: CLIArgs = {
        command: args[0] || "help",
    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        if (arg === "--product" || arg === "-p") {
            parsed.product = args[++i];
        } else if (arg === "--output" || arg === "-o") {
            parsed.output = args[++i];
        } else if (arg === "--force" || arg === "-f") {
            parsed.force = true;
        } else if (arg === "--verbose" || arg === "-v") {
            parsed.verbose = true;
        } else if (arg === "--auto-sync" || arg === "-a") {
            parsed.autoSync = true;
        } else if (arg === "--interval" || arg === "-i") {
            parsed.interval = parseInt(args[++i], 10);
        } else if (arg === "--help" || arg === "-h") {
            parsed.help = true;
        }
    }

    return parsed;
}

/**
 * Print help message
 */
function printHelp(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          TagScout Integration CLI for Log Scout Analyzer       ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  tagscout-cli <command> [options]

COMMANDS:
  sync              Sync patterns from TagScout MongoDB
  list              List available products and categories
  export            Export patterns to VS Code settings
  docs              Generate pattern documentation
  test              Test connection to TagScout MongoDB
  status            Show current sync status
  stats             Show pattern statistics
  clear-cache       Clear cached patterns
  sync-lsp          Sync patterns to LSP server format
  help              Show this help message

OPTIONS:
  -p, --product <name>      Filter by product (e.g., Jabber, CUCM)
  -o, --output <path>       Output file path
  -f, --force               Force refresh (ignore cache)
  -v, --verbose             Verbose output
  -a, --auto-sync           Enable auto-sync mode
  -i, --interval <minutes>  Auto-sync interval (default: 60)
  -h, --help                Show help

EXAMPLES:
  # Sync all patterns
  tagscout-cli sync

  # Sync patterns for Jabber only
  tagscout-cli sync --product Jabber

  # Export to VS Code settings
  tagscout-cli export --output settings.json

  # Generate documentation
  tagscout-cli docs --output PATTERNS.md

  # List available products
  tagscout-cli list

  # Test connection
  tagscout-cli test

  # Start auto-sync daemon
  tagscout-cli sync --auto-sync --interval 30

  # Sync patterns to LSP server
  tagscout-cli sync-lsp

  # Sync Jabber patterns to LSP server
  tagscout-cli sync-lsp --product Jabber

ENVIRONMENT VARIABLES:
  TAGSCOUT_MONGODB_URI      MongoDB connection string
                            (default: uses Cisco internal servers)

CONNECTION:
  Database: task_TagScoutLibrary
  Hosts: bdb-int-prod-mongos-1.cisco.com:27017
         bdb-int-prod-mongos-2.cisco.com:27017
  TLS: Enabled
`);
}

/**
 * Print status with colors
 */
function printStatus(status: string, message: string): void {
    const symbols = {
        success: "✓",
        error: "✗",
        info: "ℹ",
        warning: "⚠",
        loading: "⏳",
    };

    const symbol = symbols[status as keyof typeof symbols] || "•";
    console.log(`${symbol} ${message}`);
}

/**
 * Command: Test connection
 */
async function testConnection(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Testing TagScout Connection               ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        printStatus("loading", "Connecting to TagScout MongoDB...");
        const client = TagScoutClient.fromEnvironment();

        const isConnected = await client.testConnection();

        if (isConnected) {
            printStatus("success", "Connection successful!");

            const dbInfo = client.getDatabaseInfo();
            console.log("\nDatabase Information:");
            console.log(`  Database: ${dbInfo.database}`);
            console.log(`  Collections:`, dbInfo.collections);

            printStatus("loading", "Fetching metadata...");

            const products = await client.getProducts();
            console.log(`\n  Available Products (${products.length}):`);
            products.forEach((p) => console.log(`    - ${p}`));

            const categories = await client.fetchCategories();
            console.log(`\n  Categories (${categories.length}):`);
            categories
                .slice(0, 10)
                .forEach((c) =>
                    console.log(`    - ${c.displayName || c.name}`),
                );
            if (categories.length > 10) {
                console.log(`    ... and ${categories.length - 10} more`);
            }

            await client.disconnect();
            printStatus("success", "Test completed successfully!");
        } else {
            printStatus("error", "Connection failed!");
            process.exit(1);
        }
    } catch (error: any) {
        printStatus("error", `Connection failed: ${error.message}`);
        if (args.verbose) {
            console.error("\nError details:", error);
        }
        process.exit(1);
    }
}

/**
 * Command: List products and categories
 */
async function listResources(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         TagScout Resources                         ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const client = TagScoutClient.fromEnvironment();
        await client.connect();

        printStatus("loading", "Fetching products...");
        const products = await client.getProducts();

        console.log(`\n📦 Products (${products.length}):\n`);
        for (const product of products) {
            console.log(`  ${product}`);

            if (args.verbose) {
                const components = await client.getComponents(product);
                if (components.length > 0) {
                    console.log(
                        `    Components: ${components.slice(0, 5).join(", ")}${components.length > 5 ? "..." : ""}`,
                    );
                }
            }
        }

        printStatus("loading", "Fetching categories...");
        const categories = await client.fetchCategories();

        console.log(`\n📁 Categories (${categories.length}):\n`);
        categories.forEach((cat) => {
            console.log(`  ${cat.displayName || cat.name}`);
            if (args.verbose && cat.description) {
                console.log(`    ${cat.description}`);
            }
        });

        await client.disconnect();
        printStatus("success", "List completed!");
    } catch (error: any) {
        printStatus("error", `Failed to list resources: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Command: Sync patterns
 */
async function syncPatterns(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Syncing TagScout Patterns                  ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const config: SyncConfig = {
            autoSync: args.autoSync,
            syncInterval: args.interval,
            products: args.product ? [args.product] : undefined,
            mergeWithExisting: true,
            backupBeforeSync: true,
        };

        if (args.product) {
            printStatus("info", `Filtering by product: ${args.product}`);
        }

        const service = await TagScoutSyncService.fromEnvironment(config);

        if (args.autoSync) {
            printStatus(
                "info",
                `Starting auto-sync (interval: ${args.interval || 60} minutes)`,
            );
            service.start();

            // Keep process running
            console.log("\nPress Ctrl+C to stop\n");
            process.on("SIGINT", async () => {
                console.log("\n\nStopping auto-sync...");
                service.stop();
                await service.disconnect();
                process.exit(0);
            });

            // Keep alive
            setInterval(() => {
                const status = service.getStatus();
                if (args.verbose) {
                    console.log(
                        `[${new Date().toISOString()}] Status: ${status.isRunning ? "Running" : "Idle"}`,
                    );
                }
            }, 60000);
        } else {
            printStatus("loading", "Starting sync...");
            const result = await service.syncPatterns(args.force);

            console.log("\n┌─────────────────────────────────────────┐");
            console.log("│           Sync Results                  │");
            console.log("└─────────────────────────────────────────┘");
            console.log(
                `  Status: ${result.success ? "✓ Success" : "✗ Failed"}`,
            );
            console.log(`  Duration: ${result.duration}ms`);
            console.log(`  Source: ${result.source}`);
            console.log(`  Total Patterns: ${result.totalPatterns}`);
            console.log(`  Patterns Added: ${result.patternsAdded}`);
            console.log(`  Patterns Updated: ${result.patternsUpdated}`);

            if (result.errors.length > 0) {
                console.log(`\n  Errors (${result.errors.length}):`);
                result.errors.forEach((err) => console.log(`    - ${err}`));
            }

            if (result.warnings.length > 0) {
                console.log(`\n  Warnings (${result.warnings.length}):`);
                result.warnings.forEach((warn) => console.log(`    - ${warn}`));
            }

            await service.disconnect();

            printStatus("success", "Sync completed!");
        }
    } catch (error: any) {
        printStatus("error", `Sync failed: ${error.message}`);
        if (args.verbose) {
            console.error("\nError details:", error);
        }
        process.exit(1);
    }
}

/**
 * Command: Export to VS Code settings
 */
async function exportSettings(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Exporting VS Code Settings                 ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const service = await TagScoutSyncService.fromEnvironment();

        const outputPath = args.output || "tagscout-settings.json";
        printStatus("loading", `Exporting to ${outputPath}...`);

        const settings = await service.exportToVSCodeSettings(outputPath);

        const stats = JSON.parse(settings);
        console.log("\n  Settings exported:");
        console.log(
            `    - Errors: ${stats["logScoutAnalyzer.patterns.errors"]?.length || 0}`,
        );
        console.log(
            `    - Warnings: ${stats["logScoutAnalyzer.patterns.warnings"]?.length || 0}`,
        );
        console.log(
            `    - Info: ${stats["logScoutAnalyzer.patterns.info"]?.length || 0}`,
        );
        console.log(
            `    - Debug: ${stats["logScoutAnalyzer.patterns.debug"]?.length || 0}`,
        );

        await service.disconnect();

        printStatus("success", `Settings exported to ${outputPath}`);
        console.log("\nTo use these settings:");
        console.log("  1. Open VS Code settings (Ctrl+,)");
        console.log('  2. Click "Open Settings (JSON)"');
        console.log("  3. Copy patterns from the exported file");
    } catch (error: any) {
        printStatus("error", `Export failed: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Command: Generate documentation
 */
async function generateDocs(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Generating Pattern Documentation           ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const service = await TagScoutSyncService.fromEnvironment();

        const outputPath = args.output || "TAGSCOUT_PATTERNS.md";
        printStatus("loading", `Generating documentation...`);

        await service.exportDocumentation(outputPath);

        await service.disconnect();

        printStatus("success", `Documentation generated: ${outputPath}`);
    } catch (error: any) {
        printStatus(
            "error",
            `Documentation generation failed: ${error.message}`,
        );
        process.exit(1);
    }
}

/**
 * Command: Show sync status
 */
async function showStatus(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Sync Status                                ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const service = await TagScoutSyncService.fromEnvironment();
        const status = service.getStatus();

        console.log(
            "  Auto-sync:",
            status.autoSyncEnabled ? "✓ Enabled" : "✗ Disabled",
        );
        console.log("  Currently Running:", status.isRunning ? "Yes" : "No");
        console.log("  Cache Valid:", status.cacheValid ? "✓ Yes" : "✗ No");
        console.log("  Total Patterns:", status.totalPatterns);

        if (status.lastSync) {
            console.log(`  Last Sync: ${status.lastSync.toLocaleString()}`);
        } else {
            console.log("  Last Sync: Never");
        }

        if (status.nextSync) {
            console.log(`  Next Sync: ${status.nextSync.toLocaleString()}`);
        }

        const lastResult = service.getLastSyncResult();
        if (lastResult) {
            console.log("\n  Last Sync Result:");
            console.log(`    Success: ${lastResult.success}`);
            console.log(`    Duration: ${lastResult.duration}ms`);
            console.log(`    Patterns Added: ${lastResult.patternsAdded}`);
            console.log(`    Source: ${lastResult.source}`);
        }

        await service.disconnect();
    } catch (error: any) {
        printStatus("error", `Failed to get status: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Command: Show statistics
 */
async function showStats(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Pattern Statistics                         ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const client = TagScoutClient.fromEnvironment();
        await client.connect();

        printStatus("loading", "Fetching statistics...");

        const stats = await client.getStatistics(
            args.product ? { product: args.product } : undefined,
        );

        console.log(`\n  Total Annotations: ${stats.total}\n`);

        console.log("  By Severity:");
        for (const [severity, count] of stats.bySeverity.entries()) {
            const percentage = ((count / stats.total) * 100).toFixed(1);
            console.log(
                `    ${severity.padEnd(10)} ${count.toString().padStart(5)} (${percentage}%)`,
            );
        }

        console.log("\n  By Category:");
        const sortedCategories = Array.from(stats.byCategory.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        for (const [category, count] of sortedCategories) {
            const percentage = ((count / stats.total) * 100).toFixed(1);
            console.log(
                `    ${category.padEnd(20)} ${count.toString().padStart(5)} (${percentage}%)`,
            );
        }

        if (stats.byProduct.size > 0) {
            console.log("\n  By Product:");
            for (const [product, count] of stats.byProduct.entries()) {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                console.log(
                    `    ${product.padEnd(20)} ${count.toString().padStart(5)} (${percentage}%)`,
                );
            }
        }

        await client.disconnect();
        printStatus("success", "Statistics generated!");
    } catch (error: any) {
        printStatus("error", `Failed to get statistics: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Command: Clear cache
 */
async function clearCache(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Clearing Cache                             ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        const service = await TagScoutSyncService.fromEnvironment();

        printStatus("loading", "Clearing cache...");
        await service.clearCache();

        await service.disconnect();

        printStatus("success", "Cache cleared successfully!");
    } catch (error: any) {
        printStatus("error", `Failed to clear cache: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Command: Sync to LSP server
 */
async function syncToLSP(args: CLIArgs): Promise<void> {
    console.log("\n╔════════════════════════════════════════════════════╗");
    console.log("║         Syncing to LSP Server Format               ║");
    console.log("╚════════════════════════════════════════════════════╝\n");

    try {
        if (args.product) {
            printStatus(
                "info",
                `Syncing ${args.product} patterns to LSP server format`,
            );
        } else {
            printStatus("info", "Syncing all patterns to LSP server format");
        }

        printStatus("loading", "Connecting to TagScout...");

        const options: LSPBridgeOptions = {
            outputDir: args.output || "./lsp-patterns",
            separateByProduct: true,
            includeMetadata: true,
            generatePluginConfigs: true,
        };

        const result = await syncTagScoutToLSP(args.product, options);

        console.log("\n┌─────────────────────────────────────────┐");
        console.log("│           LSP Sync Results              │");
        console.log("└─────────────────────────────────────────┘");
        console.log(`  Status: ${result.success ? "✓ Success" : "✗ Failed"}`);
        console.log(`  Total Patterns: ${result.patternCount}`);
        console.log(`  Config Files: ${result.configFiles.length}`);

        if (result.configFiles.length > 0) {
            console.log("\n  Generated Files:");
            result.configFiles.forEach((file) => console.log(`    - ${file}`));
        }

        if (result.byProduct.size > 0) {
            console.log("\n  By Product:");
            for (const [product, count] of result.byProduct.entries()) {
                console.log(`    ${product.padEnd(20)} ${count} patterns`);
            }
        }

        if (result.errors.length > 0) {
            console.log(`\n  Errors (${result.errors.length}):`);
            result.errors.forEach((err) => console.log(`    - ${err}`));
        }

        printStatus("success", "LSP sync completed!");

        console.log("\nNext steps:");
        console.log(
            "  1. Configure LSP server to load patterns from:",
            options.outputDir,
        );
        console.log("  2. Update master-config.yaml if needed");
        console.log("  3. Reload LSP server to apply changes\n");
    } catch (error: any) {
        printStatus("error", `LSP sync failed: ${error.message}`);
        if (args.verbose) {
            console.error("\nError details:", error);
        }
        process.exit(1);
    }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));

    if (args.help || args.command === "help") {
        printHelp();
        return;
    }

    try {
        switch (args.command) {
            case "test":
                await testConnection(args);
                break;
            case "list":
                await listResources(args);
                break;
            case "sync":
                await syncPatterns(args);
                break;
            case "export":
                await exportSettings(args);
                break;
            case "docs":
                await generateDocs(args);
                break;
            case "status":
                await showStatus(args);
                break;
            case "stats":
                await showStats(args);
                break;
            case "clear-cache":
                await clearCache(args);
                break;
            case "sync-lsp":
                await syncToLSP(args);
                break;
            default:
                console.error(`Unknown command: ${args.command}`);
                console.log('Run "tagscout-cli help" for usage information');
                process.exit(1);
        }
    } catch (error: any) {
        console.error("\n✗ Fatal error:", error.message);
        if (args.verbose) {
            console.error("\nStack trace:", error.stack);
        }
        process.exit(1);
    }
}

// Run CLI if executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}

export { main, parseArgs };
