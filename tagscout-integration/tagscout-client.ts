/**
 * TagScout MongoDB Client
 *
 * Connects to the TagScout Library MongoDB database to fetch existing
 * annotations and patterns that can be used by Log Scout Analyzer.
 *
 * Database: task_TagScoutLibrary
 * Connection: mongodb://TagScoutLibrary_ro:...@bdb-int-prod-mongos-1.cisco.com:27017,...
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';

/**
 * Configuration for TagScout MongoDB connection
 */
export interface TagScoutConfig {
    connectionString: string;
    database: string;
    collections: {
        annotations: string;
        patterns: string;
        categories: string;
    };
    timeout?: number;
    poolSize?: number;
}

/**
 * TagScout Annotation structure from MongoDB
 */
export interface TagScoutAnnotation {
    _id: string;
    pattern: string;
    category: string;
    severity: 'error' | 'warning' | 'info' | 'debug';
    description: string;
    tags: string[];
    product?: string;
    component?: string;
    messageTemplate?: string;
    regex?: string;
    examples?: string[];
    metadata?: {
        author?: string;
        createdAt?: Date;
        updatedAt?: Date;
        version?: string;
        source?: string;
    };
}

/**
 * Pattern category from TagScout
 */
export interface TagScoutCategory {
    _id: string;
    name: string;
    displayName: string;
    description: string;
    color?: string;
    icon?: string;
    priority?: number;
}

/**
 * Query options for fetching annotations
 */
export interface QueryOptions {
    product?: string;
    component?: string;
    category?: string;
    severity?: string | string[];
    tags?: string[];
    limit?: number;
    skip?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

/**
 * Statistics about fetched annotations
 */
export interface AnnotationStats {
    total: number;
    byCategory: Map<string, number>;
    bySeverity: Map<string, number>;
    byProduct: Map<string, number>;
    byComponent: Map<string, number>;
}

/**
 * TagScout MongoDB Client
 *
 * Provides methods to fetch and query annotations from the TagScout Library.
 */
export class TagScoutClient {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private config: TagScoutConfig;
    private connected: boolean = false;

    /**
     * Default configuration
     */
    private static DEFAULT_CONFIG: Partial<TagScoutConfig> = {
        database: 'task_TagScoutLibrary',
        collections: {
            annotations: 'annotations',
            patterns: 'patterns',
            categories: 'categories'
        },
        timeout: 30000,
        poolSize: 10
    };

    constructor(connectionString: string, config?: Partial<TagScoutConfig>) {
        this.config = {
            connectionString,
            ...TagScoutClient.DEFAULT_CONFIG,
            ...config,
            collections: {
                ...TagScoutClient.DEFAULT_CONFIG.collections!,
                ...config?.collections
            }
        } as TagScoutConfig;
    }

    /**
     * Create a TagScoutClient from environment variables or config
     */
    static fromEnvironment(): TagScoutClient {
        const connectionString = process.env.TAGSCOUT_MONGODB_URI ||
            'mongodb://TagScoutLibrary_ro:4d6e2f2a60b17c87c2574fa3c1d39a18093a04d4@bdb-int-prod-mongos-1.cisco.com:27017,bdb-int-prod-mongos-2.cisco.com:27017/task_TagScoutLibrary?tls=true';

        return new TagScoutClient(connectionString);
    }

    /**
     * Connect to MongoDB
     */
    async connect(): Promise<void> {
        if (this.connected) {
            return;
        }

        try {
            this.client = new MongoClient(this.config.connectionString, {
                serverSelectionTimeoutMS: this.config.timeout,
                maxPoolSize: this.config.poolSize,
                retryWrites: true,
                retryReads: true
            });

            await this.client.connect();
            this.db = this.client.db(this.config.database);
            this.connected = true;

            console.log(`✓ Connected to TagScout MongoDB: ${this.config.database}`);
        } catch (error) {
            console.error('Failed to connect to TagScout MongoDB:', error);
            throw new Error(`TagScout connection failed: ${error}`);
        }
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.connected = false;
            this.client = null;
            this.db = null;
            console.log('✓ Disconnected from TagScout MongoDB');
        }
    }

    /**
     * Ensure connection is established
     */
    private async ensureConnected(): Promise<void> {
        if (!this.connected) {
            await this.connect();
        }
    }

    /**
     * Get annotations collection
     */
    private getAnnotationsCollection(): Collection<TagScoutAnnotation> {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db.collection<TagScoutAnnotation>(this.config.collections.annotations);
    }

    /**
     * Get categories collection
     */
    private getCategoriesCollection(): Collection<TagScoutCategory> {
        if (!this.db) {
            throw new Error('Database not connected');
        }
        return this.db.collection<TagScoutCategory>(this.config.collections.categories);
    }

    /**
     * Fetch all annotations with optional filtering
     */
    async fetchAnnotations(options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        await this.ensureConnected();

        const collection = this.getAnnotationsCollection();
        const query: Document = {};

        // Build query filters
        if (options?.product) {
            query.product = options.product;
        }
        if (options?.component) {
            query.component = options.component;
        }
        if (options?.category) {
            query.category = options.category;
        }
        if (options?.severity) {
            if (Array.isArray(options.severity)) {
                query.severity = { $in: options.severity };
            } else {
                query.severity = options.severity;
            }
        }
        if (options?.tags && options.tags.length > 0) {
            query.tags = { $in: options.tags };
        }

        // Build query options
        const queryOptions: any = {};

        if (options?.limit) {
            queryOptions.limit = options.limit;
        }
        if (options?.skip) {
            queryOptions.skip = options.skip;
        }
        if (options?.sortBy) {
            queryOptions.sort = {
                [options.sortBy]: options.sortOrder === 'desc' ? -1 : 1
            };
        }

        try {
            const cursor = collection.find(query, queryOptions);
            const annotations = await cursor.toArray();

            console.log(`✓ Fetched ${annotations.length} annotations from TagScout`);
            return annotations;
        } catch (error) {
            console.error('Failed to fetch annotations:', error);
            throw error;
        }
    }

    /**
     * Fetch annotations by product (e.g., "Jabber", "CUCM", "Webex")
     */
    async fetchAnnotationsByProduct(product: string, options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        return this.fetchAnnotations({ ...options, product });
    }

    /**
     * Fetch annotations by category
     */
    async fetchAnnotationsByCategory(category: string, options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        return this.fetchAnnotations({ ...options, category });
    }

    /**
     * Fetch annotations by severity
     */
    async fetchAnnotationsBySeverity(severity: string | string[], options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        return this.fetchAnnotations({ ...options, severity });
    }

    /**
     * Fetch annotations by tags
     */
    async fetchAnnotationsByTags(tags: string[], options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        return this.fetchAnnotations({ ...options, tags });
    }

    /**
     * Search annotations by text (pattern, description, or examples)
     */
    async searchAnnotations(searchText: string, options?: QueryOptions): Promise<TagScoutAnnotation[]> {
        await this.ensureConnected();

        const collection = this.getAnnotationsCollection();

        const query: Document = {
            $or: [
                { pattern: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
                { messageTemplate: { $regex: searchText, $options: 'i' } },
                { examples: { $elemMatch: { $regex: searchText, $options: 'i' } } }
            ]
        };

        // Add additional filters
        if (options?.product) {
            query.product = options.product;
        }
        if (options?.category) {
            query.category = options.category;
        }
        if (options?.severity) {
            query.severity = Array.isArray(options.severity)
                ? { $in: options.severity }
                : options.severity;
        }

        try {
            const cursor = collection.find(query).limit(options?.limit || 100);
            const results = await cursor.toArray();

            console.log(`✓ Found ${results.length} annotations matching "${searchText}"`);
            return results;
        } catch (error) {
            console.error('Search failed:', error);
            throw error;
        }
    }

    /**
     * Fetch all categories
     */
    async fetchCategories(): Promise<TagScoutCategory[]> {
        await this.ensureConnected();

        const collection = this.getCategoriesCollection();

        try {
            const categories = await collection.find({}).toArray();
            console.log(`✓ Fetched ${categories.length} categories from TagScout`);
            return categories;
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            throw error;
        }
    }

    /**
     * Get statistics about annotations
     */
    async getStatistics(options?: QueryOptions): Promise<AnnotationStats> {
        const annotations = await this.fetchAnnotations(options);

        const stats: AnnotationStats = {
            total: annotations.length,
            byCategory: new Map(),
            bySeverity: new Map(),
            byProduct: new Map(),
            byComponent: new Map()
        };

        for (const annotation of annotations) {
            // Count by category
            const categoryCount = stats.byCategory.get(annotation.category) || 0;
            stats.byCategory.set(annotation.category, categoryCount + 1);

            // Count by severity
            const severityCount = stats.bySeverity.get(annotation.severity) || 0;
            stats.bySeverity.set(annotation.severity, severityCount + 1);

            // Count by product
            if (annotation.product) {
                const productCount = stats.byProduct.get(annotation.product) || 0;
                stats.byProduct.set(annotation.product, productCount + 1);
            }

            // Count by component
            if (annotation.component) {
                const componentCount = stats.byComponent.get(annotation.component) || 0;
                stats.byComponent.set(annotation.component, componentCount + 1);
            }
        }

        return stats;
    }

    /**
     * Get available products
     */
    async getProducts(): Promise<string[]> {
        await this.ensureConnected();

        const collection = this.getAnnotationsCollection();

        try {
            const products = await collection.distinct('product');
            return products.filter(p => p != null).sort();
        } catch (error) {
            console.error('Failed to fetch products:', error);
            throw error;
        }
    }

    /**
     * Get available components for a product
     */
    async getComponents(product?: string): Promise<string[]> {
        await this.ensureConnected();

        const collection = this.getAnnotationsCollection();
        const query = product ? { product } : {};

        try {
            const components = await collection.distinct('component', query);
            return components.filter(c => c != null).sort();
        } catch (error) {
            console.error('Failed to fetch components:', error);
            throw error;
        }
    }

    /**
     * Test connection to TagScout MongoDB
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.connect();
            await this.db?.command({ ping: 1 });
            console.log('✓ TagScout MongoDB connection test successful');
            return true;
        } catch (error) {
            console.error('✗ TagScout MongoDB connection test failed:', error);
            return false;
        }
    }

    /**
     * Get connection status
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get database info
     */
    getDatabaseInfo(): { database: string; collections: any } {
        return {
            database: this.config.database,
            collections: this.config.collections
        };
    }
}

/**
 * Convenience function to create and connect a TagScout client
 */
export async function createTagScoutClient(connectionString?: string): Promise<TagScoutClient> {
    const client = connectionString
        ? new TagScoutClient(connectionString)
        : TagScoutClient.fromEnvironment();

    await client.connect();
    return client;
}

/**
 * Export default instance (lazy-loaded)
 */
let defaultClient: TagScoutClient | null = null;

export async function getDefaultClient(): Promise<TagScoutClient> {
    if (!defaultClient) {
        defaultClient = TagScoutClient.fromEnvironment();
        await defaultClient.connect();
    }
    return defaultClient;
}
