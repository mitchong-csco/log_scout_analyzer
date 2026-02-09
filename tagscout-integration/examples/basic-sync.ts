/**
 * Basic Sync Example
 *
 * Demonstrates how to perform a basic synchronization of patterns
 * from TagScout MongoDB to Log Scout Analyzer.
 */

import { createSyncService } from '../sync-service';
import { TagScoutClient } from '../tagscout-client';

async function basicSyncExample() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║         Basic TagScout Sync Example                ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    try {
        // Step 1: Test connection first
        console.log('Step 1: Testing connection...');
        const client = TagScoutClient.fromEnvironment();
        const isConnected = await client.testConnection();

        if (!isConnected) {
            console.error('✗ Connection failed. Cannot proceed.');
            return;
        }

        console.log('✓ Connection successful!\n');
        await client.disconnect();

        // Step 2: Create sync service
        console.log('Step 2: Creating sync service...');
        const service = await createSyncService({
            autoSync: false,
            mergeWithExisting: true,
            backupBeforeSync: true,
            cacheExpiry: 24
        });

        console.log('✓ Sync service created\n');

        // Step 3: Perform sync
        console.log('Step 3: Syncing patterns from TagScout...');
        const startTime = Date.now();

        const result = await service.syncPatterns();

        const duration = Date.now() - startTime;

        // Step 4: Display results
        console.log('\n╔════════════════════════════════════════════════════╗');
        console.log('║              Sync Results                          ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log(`Status:           ${result.success ? '✓ Success' : '✗ Failed'}`);
        console.log(`Duration:         ${duration}ms`);
        console.log(`Source:           ${result.source === 'cache' ? '📦 Cache' : '🌐 MongoDB'}`);
        console.log(`Total Patterns:   ${result.totalPatterns}`);
        console.log(`Patterns Added:   ${result.patternsAdded}`);
        console.log(`Patterns Updated: ${result.patternsUpdated}`);
        console.log(`Timestamp:        ${result.timestamp.toISOString()}\n`);

        if (result.errors.length > 0) {
            console.log('❌ Errors:');
            result.errors.forEach(err => console.log(`  - ${err}`));
            console.log();
        }

        if (result.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            result.warnings.forEach(warn => console.log(`  - ${warn}`));
            console.log();
        }

        // Step 5: Check sync status
        console.log('Step 5: Checking sync status...');
        const status = service.getStatus();

        console.log(`\nSync Status:`);
        console.log(`  Last Sync:     ${status.lastSync?.toLocaleString() || 'Never'}`);
        console.log(`  Cache Valid:   ${status.cacheValid ? '✓ Yes' : '✗ No'}`);
        console.log(`  Total Patterns: ${status.totalPatterns}`);
        console.log(`  Auto-sync:     ${status.autoSyncEnabled ? 'Enabled' : 'Disabled'}\n`);

        // Step 6: Cleanup
        console.log('Step 6: Disconnecting...');
        await service.disconnect();
        console.log('✓ Disconnected\n');

        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║              Sync Complete!                        ║');
        console.log('╚════════════════════════════════════════════════════╝\n');

        console.log('Next steps:');
        console.log('  1. Patterns are now cached locally');
        console.log('  2. Use "tagscout-cli export" to create VS Code settings');
        console.log('  3. Use "tagscout-cli docs" to generate documentation');
        console.log('  4. Run sync again anytime to get latest patterns\n');

    } catch (error: any) {
        console.error('\n✗ Error during sync:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run the example
if (require.main === module) {
    basicSyncExample()
        .then(() => {
            console.log('✓ Example completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('✗ Example failed:', error);
            process.exit(1);
        });
}

export { basicSyncExample };
