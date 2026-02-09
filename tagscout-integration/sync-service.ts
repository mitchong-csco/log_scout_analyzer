/**
 * TagScout Sync Service
 *
 * Service to synchronize patterns from TagScout MongoDB to Log Scout Analyzer.
 * Provides automatic and manual sync capabilities with caching and update detection.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TagScoutClient, TagScoutAnnotation, QueryOptions } from './tagscout-client';
import { PatternConverter, LogScoutPattern, ConversionOptions } from './pattern-converter';

/**
 * Sync configuration
 */
export interface SyncConfig {
    autoSync?: boolean;
    syncInterval?: number; // in minutes
    cacheDir?: string;
    cacheExpiry?: number; // in hours
    products?: string[];
    severities?: string[];
    categories?: string[];
    mergeWithExisting?: boolean;
    backupBeforeSync?: boolean;
}

/**
 * Sync result information
 */
export interface SyncResult {
    success: boolean;
    timestamp: Date;
    patternsAdded: number;
    patternsUpdated: number;
    patternsRemoved: number;
    totalPatterns: number;
    errors: string[];
    warnings: string[];
    duration: number; // in milliseconds
    source: 'tagscout' | 'cache';
}

/**
 * Sync status
 */
export interface SyncStatus {
    lastSync?: Date;
    nextSync?: Date;
    isRunning: boolean;
    autoSyncEnabled: boolean;
    cacheValid: boolean;
    totalPatterns: number;
}

/**
 * Cache metadata
 */
interface CacheMetadata {
    timestamp: Date;
    patterns: Record<string, string[]>;
    stats: {
        total: number;
        byCategory: Record<string, number>;
        bySeverity: Record<string, number>;
    };
    config: SyncConfig;
}

/**
 * TagScout Sync Service
 *
 * Manages synchronization of patterns from TagScout to Log Scout Analyzer.
 */
export class TagScoutSyncService {
    private client: TagScoutClient;
    private converter: PatternConverter;
    private config: SyncConfig;
    private syncTimer?: NodeJS.Timeout;
    private isSyncing: boolean = false;
    private lastSyncResult?: SyncResult;
    private cacheDir: string;

    /**
     * Default configuration
     */
    private static DEFAULT_CONFIG: SyncConfig = {
        autoSync: false,
        syncInterval: 60, // 60 minutes
        cacheExpiry: 24, // 24 hours
        mergeWithExisting: true,
        backupBeforeSync: true
    };

    constructor(
        client: TagScoutClient,
        config?: SyncConfig
    ) {
        this.client = client;
        this.converter = new PatternConverter();
        this.config = { ...TagScoutSyncService.DEFAULT_CONFIG, ...config };
        this.cacheDir = this.config.cacheDir || path.join(process.cwd(), '.tagscout-cache');

        // Ensure cache directory exists
        this.ensureCacheDirectory();
    }

    /**
     * Create sync service from environment
     */
    static async fromEnvironment(config?: SyncConfig): Promise<TagScoutSyncService> {
        const client = TagScoutClient.fromEnvironment();
        await client.connect();
        return new TagScoutSyncService(client, config);
    }

    /**
     * Start auto-sync if enabled
     */
    start(): void {
        if (this.config.autoSync && !this.syncTimer) {
            const intervalMs = (this.config.syncInterval || 60) * 60 * 1000;

            console.log(`✓ Starting auto-sync (interval: ${this.config.syncInterval} minutes)`);

            // Run initial sync
            this.syncPatterns().catch(error => {
                console.error('Initial sync failed:', error);
            });

            // Schedule recurring sync
            this.syncTimer = setInterval(() => {
                this.syncPatterns().catch(error => {
                    console.error('Auto-sync failed:', error);
                });
            }, intervalMs);
        }
    }

    /**
     * Stop auto-sync
     */
    stop(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
            console.log('✓ Stopped auto-sync');
        }
    }

    /**
     * Get sync status
     */
    getStatus(): SyncStatus {
        const nextSync = this.syncTimer && this.lastSyncResult
            ? new Date(this.lastSyncResult.timestamp.getTime() + (this.config.syncInterval || 60) * 60 * 1000)
            : undefined;

        return {
            lastSync: this.lastSyncResult?.timestamp,
            nextSync,
            isRunning: this.isSyncing,
            autoSyncEnabled: !!this.syncTimer,
            cacheValid: this.isCacheValid(),
            totalPatterns: this.lastSyncResult?.totalPatterns || 0
        };
    }

    /**
     * Sync patterns from TagScout
     */
    async syncPatterns(forceRefresh: boolean = false): Promise<SyncResult> {
        if (this.isSyncing) {
            throw new Error('Sync already in progress');
        }

        this.isSyncing = true;
        const startTime = Date.now();
        const result: SyncResult = {
            success: false,
            timestamp: new Date(),
            patternsAdded: 0,
            patternsUpdated: 0,
            patternsRemoved: 0,
            totalPatterns: 0,
            errors: [],
            warnings: [],
            duration: 0,
            source: 'tagscout'
        };

        try {
            console.log('🔄 Starting TagScout pattern sync...');

            // Check cache first if not forcing refresh
            if (!forceRefresh && this.isCacheValid()) {
                console.log('✓ Using cached patterns (cache is still valid)');
                const cached = await this.loadFromCache();
                if (cached) {
                    result.success = true;
                    result.totalPatterns = cached.total;
                    result.source = 'cache';
                    result.duration = Date.now() - startTime;
                    this.lastSyncResult = result;
                    return result;
                }
            }

            // Fetch annotations from TagScout
            const queryOptions: QueryOptions = {
                product: this.config.products?.[0],
                severity: this.config.severities
            };

            console.log('📥 Fetching annotations from TagScout...');
            const annotations = await this.client.fetchAnnotations(queryOptions);
            console.log(`✓ Fetched ${annotations.length} annotations`);

            // Convert to patterns
            const conversionOptions: ConversionOptions = {
                validateRegex: true,
                optimizePatterns: true,
                includeMetadata: true,
                filterByProduct: this.config.products,
                filterBySeverity: this.config.severities,
                filterByCategory: this.config.categories,
                deduplicatePatterns: true,
                sortByPriority: true
            };

            console.log('🔄 Converting annotations to patterns...');
            const newPatterns = this.converter.convertToPatternStrings(annotations, conversionOptions);

            const stats = this.converter.getStats();
            console.log(`✓ Converted ${stats.successfullyConverted} patterns`);
            console.log(`  - Errors: ${newPatterns.errors.length}`);
            console.log(`  - Warnings: ${newPatterns.warnings.length}`);
            console.log(`  - Info: ${newPatterns.info.length}`);
            console.log(`  - Debug: ${newPatterns.debug.length}`);

            // Merge with existing patterns if configured
            let finalPatterns = newPatterns;
            if (this.config.mergeWithExisting) {
                const existingPatterns = await this.loadExistingPatterns();
                if (existingPatterns) {
                    console.log('🔄 Merging with existing patterns...');
                    finalPatterns = this.converter.mergeWithExistingPatterns(
                        annotations,
                        existingPatterns,
                        conversionOptions
                    );

                    result.patternsAdded = this.countNewPatterns(existingPatterns, finalPatterns);
                    result.patternsUpdated = this.countUpdatedPatterns(existingPatterns, finalPatterns);
                    console.log(`✓ Added ${result.patternsAdded} new patterns`);
                }
            } else {
                result.patternsAdded = stats.successfullyConverted;
            }

            // Backup existing configuration if requested
            if (this.config.backupBeforeSync) {
                await this.backupConfiguration();
            }

            // Save to cache
            await this.saveToCache(finalPatterns, stats);

            // Update result
            result.success = true;
            result.totalPatterns = stats.successfullyConverted;
            result.duration = Date.now() - startTime;

            console.log(`✓ Sync completed in ${result.duration}ms`);
            this.lastSyncResult = result;

            return result;

        } catch (error: any) {
            result.success = false;
            result.errors.push(error.message || String(error));
            result.duration = Date.now() - startTime;

            console.error('✗ Sync failed:', error);
            this.lastSyncResult = result;

            throw error;

        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync patterns for a specific product
     */
    async syncPatternsByProduct(product: string, forceRefresh: boolean = false): Promise<SyncResult> {
        const originalProducts = this.config.products;
        this.config.products = [product];

        try {
            return await this.syncPatterns(forceRefresh);
        } finally {
            this.config.products = originalProducts;
        }
    }

    /**
     * Get patterns for a specific product
     */
    async getPatternsByProduct(product: string): Promise<Record<string, string[]>> {
        const annotations = await this.client.fetchAnnotationsByProduct(product);
        return this.converter.convertToPatternStrings(annotations, {
            validateRegex: true,
            deduplicatePatterns: true
        });
    }

    /**
     * Export patterns to VS Code settings format
     */
    async exportToVSCodeSettings(outputPath?: string): Promise<string> {
        const annotations = await this.client.fetchAnnotations();
        const settings = this.converter.generateVSCodeSettings(annotations, {
            validateRegex: true,
            optimizePatterns: true,
            deduplicatePatterns: true
        });

        if (outputPath) {
            await fs.promises.writeFile(outputPath, settings, 'utf-8');
            console.log(`✓ Exported settings to ${outputPath}`);
        }

        return settings;
    }

    /**
     * Export pattern documentation
     */
    async exportDocumentation(outputPath?: string): Promise<string> {
        const annotations = await this.client.fetchAnnotations();
        const docs = this.converter.generatePatternDocs(annotations, {
            validateRegex: true,
            deduplicatePatterns: true
        });

        if (outputPath) {
            await fs.promises.writeFile(outputPath, docs, 'utf-8');
            console.log(`✓ Exported documentation to ${outputPath}`);
        }

        return docs;
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        const cacheFile = this.getCacheFilePath();

        try {
            if (fs.existsSync(cacheFile)) {
                await fs.promises.unlink(cacheFile);
                console.log('✓ Cache cleared');
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
            throw error;
        }
    }

    /**
     * Get last sync result
     */
    getLastSyncResult(): SyncResult | undefined {
        return this.lastSyncResult;
    }

    /**
     * Ensure cache directory exists
     */
    private ensureCacheDirectory(): void {
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
    }

    /**
     * Get cache file path
     */
    private getCacheFilePath(): string {
        return path.join(this.cacheDir, 'tagscout-patterns.json');
    }

    /**
     * Check if cache is valid
     */
    private isCacheValid(): boolean {
        const cacheFile = this.getCacheFilePath();

        if (!fs.existsSync(cacheFile)) {
            return false;
        }

        try {
            const stats = fs.statSync(cacheFile);
            const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
            return ageHours < (this.config.cacheExpiry || 24);
        } catch (error) {
            return false;
        }
    }

    /**
     * Save patterns to cache
     */
    private async saveToCache(patterns: Record<string, string[]>, stats: any): Promise<void> {
        const cacheFile = this.getCacheFilePath();

        const metadata: CacheMetadata = {
            timestamp: new Date(),
            patterns,
            stats: {
                total: stats.successfullyConverted,
                byCategory: Object.fromEntries(stats.byCategory),
                bySeverity: Object.fromEntries(stats.bySeverity)
            },
            config: this.config
        };

        try {
            await fs.promises.writeFile(
                cacheFile,
                JSON.stringify(metadata, null, 2),
                'utf-8'
            );
            console.log(`✓ Cached patterns to ${cacheFile}`);
        } catch (error) {
            console.error('Failed to save cache:', error);
        }
    }

    /**
     * Load patterns from cache
     */
    private async loadFromCache(): Promise<{ patterns: Record<string, string[]>; total: number } | null> {
        const cacheFile = this.getCacheFilePath();

        if (!fs.existsSync(cacheFile)) {
            return null;
        }

        try {
            const content = await fs.promises.readFile(cacheFile, 'utf-8');
            const metadata: CacheMetadata = JSON.parse(content);

            return {
                patterns: metadata.patterns,
                total: metadata.stats.total
            };
        } catch (error) {
            console.error('Failed to load cache:', error);
            return null;
        }
    }

    /**
     * Load existing patterns from Log Scout configuration
     */
    private async loadExistingPatterns(): Promise<Record<string, string[]> | null> {
        // This would load from VS Code settings or Log Scout config
        // For now, return empty patterns
        return {
            errors: [],
            warnings: [],
            info: [],
            debug: []
        };
    }

    /**
     * Backup current configuration
     */
    private async backupConfiguration(): Promise<void> {
        const backupDir = path.join(this.cacheDir, 'backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `patterns-backup-${timestamp}.json`);

        try {
            const existing = await this.loadExistingPatterns();
            if (existing) {
                await fs.promises.writeFile(
                    backupFile,
                    JSON.stringify(existing, null, 2),
                    'utf-8'
                );
                console.log(`✓ Backed up configuration to ${backupFile}`);
            }
        } catch (error) {
            console.error('Failed to backup configuration:', error);
        }
    }

    /**
     * Count new patterns added
     */
    private countNewPatterns(
        oldPatterns: Record<string, string[]>,
        newPatterns: Record<string, string[]>
    ): number {
        let count = 0;

        for (const [key, patterns] of Object.entries(newPatterns)) {
            const oldSet = new Set(oldPatterns[key] || []);
            for (const pattern of patterns) {
                if (!oldSet.has(pattern)) {
                    count++;
                }
            }
        }

        return count;
    }

    /**
     * Count updated patterns
     */
    private countUpdatedPatterns(
        oldPatterns: Record<string, string[]>,
        newPatterns: Record<string, string[]>
    ): number {
        // For simplicity, this would track pattern modifications
        // In practice, you'd need version tracking in the annotations
        return 0;
    }

    /**
     * Disconnect from TagScout
     */
    async disconnect(): Promise<void> {
        this.stop();
        await this.client.disconnect();
    }
}

/**
 * Create and start sync service
 */
export async function createSyncService(config?: SyncConfig): Promise<TagScoutSyncService> {
    const service = await TagScoutSyncService.fromEnvironment(config);
    if (config?.autoSync) {
        service.start();
    }
    return service;
}
