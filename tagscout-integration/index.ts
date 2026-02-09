/**
 * TagScout Integration for Log Scout Analyzer
 *
 * Main entry point for the TagScout MongoDB integration module.
 * Provides access to all components for syncing and managing patterns.
 *
 * @module tagscout-integration
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import { createSyncService, TagScoutClient } from '@log-scout/tagscout-integration';
 *
 * // Quick sync
 * const service = await createSyncService({ autoSync: false });
 * const result = await service.syncPatterns();
 * console.log(`Synced ${result.totalPatterns} patterns`);
 *
 * // Custom client usage
 * const client = TagScoutClient.fromEnvironment();
 * await client.connect();
 * const annotations = await client.fetchAnnotationsByProduct('Jabber');
 * await client.disconnect();
 * ```
 */

// Export client components
export {
    TagScoutClient,
    createTagScoutClient,
    getDefaultClient,
    TagScoutConfig,
    TagScoutAnnotation,
    TagScoutCategory,
    QueryOptions,
    AnnotationStats
} from './tagscout-client';

// Export pattern converter components
export {
    PatternConverter,
    convertAnnotations,
    convertToVSCodeSettings,
    LogScoutPattern,
    ConversionStats,
    ConversionOptions
} from './pattern-converter';

// Export sync service components
export {
    TagScoutSyncService,
    createSyncService,
    SyncConfig,
    SyncResult,
    SyncStatus
} from './sync-service';

// Export CLI components (for programmatic use)
export {
    main as runCLI,
    parseArgs
} from './cli';

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package metadata
 */
export const PACKAGE_INFO = {
    name: '@log-scout/tagscout-integration',
    version: VERSION,
    description: 'TagScout MongoDB integration for Log Scout Analyzer',
    author: 'Log Scout Team',
    license: 'MIT'
};

/**
 * Default MongoDB connection info
 */
export const DEFAULT_CONNECTION = {
    database: 'task_TagScoutLibrary',
    hosts: [
        'bdb-int-prod-mongos-1.cisco.com:27017',
        'bdb-int-prod-mongos-2.cisco.com:27017'
    ],
    tls: true,
    readOnly: true
};

/**
 * Convenience function to get a quick client instance
 */
export async function quickClient() {
    const client = TagScoutClient.fromEnvironment();
    await client.connect();
    return client;
}

/**
 * Convenience function to perform a quick sync
 */
export async function quickSync(options?: {
    product?: string;
    force?: boolean;
}): Promise<SyncResult> {
    const service = await createSyncService({
        autoSync: false,
        products: options?.product ? [options.product] : undefined,
        mergeWithExisting: true,
        backupBeforeSync: true
    });

    try {
        const result = await service.syncPatterns(options?.force);
        await service.disconnect();
        return result;
    } catch (error) {
        await service.disconnect();
        throw error;
    }
}

/**
 * Convenience function to get patterns for a product
 */
export async function getProductPatterns(product: string): Promise<Record<string, string[]>> {
    const client = await quickClient();
    try {
        const annotations = await client.fetchAnnotationsByProduct(product);
        const converter = new PatternConverter();
        const patterns = converter.convertToPatternStrings(annotations, {
            validateRegex: true,
            deduplicatePatterns: true,
            optimizePatterns: true
        });
        await client.disconnect();
        return patterns;
    } catch (error) {
        await client.disconnect();
        throw error;
    }
}

/**
 * Convenience function to export VS Code settings
 */
export async function exportSettings(
    product?: string,
    outputPath?: string
): Promise<string> {
    const service = await createSyncService({
        products: product ? [product] : undefined
    });

    try {
        const settings = await service.exportToVSCodeSettings(outputPath);
        await service.disconnect();
        return settings;
    } catch (error) {
        await service.disconnect();
        throw error;
    }
}

// Re-export types for convenience
export type {
    TagScoutConfig,
    TagScoutAnnotation,
    TagScoutCategory,
    QueryOptions,
    AnnotationStats,
    LogScoutPattern,
    ConversionStats,
    ConversionOptions,
    SyncConfig,
    SyncResult,
    SyncStatus
};

/**
 * Default export - main module API
 */
export default {
    // Classes
    TagScoutClient,
    PatternConverter,
    TagScoutSyncService,

    // Factory functions
    createTagScoutClient,
    getDefaultClient,
    createSyncService,

    // Convenience functions
    quickClient,
    quickSync,
    getProductPatterns,
    exportSettings,

    // Metadata
    VERSION,
    PACKAGE_INFO,
    DEFAULT_CONNECTION
};
