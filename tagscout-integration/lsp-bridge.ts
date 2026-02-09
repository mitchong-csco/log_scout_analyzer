/**
 * LSP Server Integration Bridge for TagScout Patterns
 *
 * This module provides the bridge between TagScout MongoDB patterns (TypeScript/Node.js)
 * and the Log Scout LSP Server (Rust). It handles:
 *
 * 1. Converting TagScout patterns to LSP server YAML format
 * 2. Generating pattern configuration files for the Rust LSP server
 * 3. Managing pattern updates and synchronization
 * 4. Providing real-time pattern updates to the LSP server
 *
 * Architecture:
 *   TagScout MongoDB → TagScout Client → Pattern Converter → LSP Bridge → YAML Config → Rust LSP Server
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { TagScoutClient, TagScoutAnnotation } from './tagscout-client';
import { PatternConverter, LogScoutPattern } from './pattern-converter';

/**
 * LSP Server pattern format (Rust-compatible)
 */
export interface LSPPattern {
    id: string;
    name: string;
    description: string;
    pattern: string;
    mode?: 'SingleLine' | { MultiLine: { context_lines: number } } | { Sequence: { max_gap_lines: number } };
    severity: 'Error' | 'Warning' | 'Info' | 'Hint';
    category: string;
    service?: string;
    tags?: string[];
    action?: string;
    expected_frequency?: {
        expected_count: number;
        window_seconds: number;
        threshold_percent: number;
    };
    enabled: boolean;
}

/**
 * LSP Server configuration format
 */
export interface LSPConfig {
    patterns: LSPPattern[];
    plugins?: {
        jabber?: { enabled: boolean; config_path?: string };
        webex?: { enabled: boolean; config_path?: string };
        custom?: { enabled: boolean; config_path?: string };
    };
    settings?: {
        detection_threshold?: number;
        multiline_patterns?: boolean;
        multiline_context_window?: number;
        baseline_learning?: boolean;
        correlation_enabled?: boolean;
        max_file_size_mb?: number;
        streaming_chunk_size_kb?: number;
        background_processing?: boolean;
    };
}

/**
 * Bridge options
 */
export interface LSPBridgeOptions {
    outputDir?: string;
    configFileName?: string;
    separateByProduct?: boolean;
    includeMetadata?: boolean;
    generatePluginConfigs?: boolean;
}

/**
 * LSP Bridge result
 */
export interface LSPBridgeResult {
    success: boolean;
    configFiles: string[];
    patternCount: number;
    byProduct: Map<string, number>;
    errors: string[];
}

/**
 * TagScout to LSP Server Bridge
 *
 * Converts TagScout patterns to Rust LSP server format and generates
 * configuration files.
 */
export class LSPBridge {
    private client: TagScoutClient;
    private converter: PatternConverter;
    private options: LSPBridgeOptions;

    /**
     * Default options
     */
    private static DEFAULT_OPTIONS: LSPBridgeOptions = {
        outputDir: './lsp-patterns',
        configFileName: 'patterns.yaml',
        separateByProduct: true,
        includeMetadata: true,
        generatePluginConfigs: true
    };

    constructor(client: TagScoutClient, options?: LSPBridgeOptions) {
        this.client = client;
        this.converter = new PatternConverter();
        this.options = { ...LSPBridge.DEFAULT_OPTIONS, ...options };
    }

    /**
     * Convert TagScout annotation to LSP pattern format
     */
    convertToLSPPattern(annotation: TagScoutAnnotation): LSPPattern {
        // Generate unique ID from annotation ID
        const id = annotation._id || `pattern-${Date.now()}`;

        // Map severity to LSP format (capitalize first letter)
        const severity = this.mapSeverity(annotation.severity);

        // Determine pattern mode
        const mode = this.determinePatternMode(annotation);

        // Extract regex pattern (prefer regex field over pattern field)
        const pattern = annotation.regex || annotation.pattern;

        return {
            id,
            name: annotation.description || annotation.category || 'Unnamed Pattern',
            description: annotation.description || annotation.messageTemplate || 'No description',
            pattern,
            mode,
            severity,
            category: annotation.category || 'general',
            service: annotation.product?.toLowerCase(),
            tags: annotation.tags || [],
            action: this.generateAction(annotation),
            expected_frequency: undefined, // Can be enhanced later
            enabled: true
        };
    }

    /**
     * Map TagScout severity to LSP severity
     */
    private mapSeverity(severity: string): 'Error' | 'Warning' | 'Info' | 'Hint' {
        switch (severity.toLowerCase()) {
            case 'error':
            case 'fatal':
            case 'critical':
                return 'Error';
            case 'warning':
            case 'warn':
                return 'Warning';
            case 'info':
            case 'information':
            case 'notice':
                return 'Info';
            case 'debug':
            case 'trace':
            case 'verbose':
            case 'hint':
                return 'Hint';
            default:
                return 'Info';
        }
    }

    /**
     * Determine pattern mode based on annotation
     */
    private determinePatternMode(
        annotation: TagScoutAnnotation
    ): 'SingleLine' | { MultiLine: { context_lines: number } } | { Sequence: { max_gap_lines: number } } {
        // Check if pattern suggests multi-line matching
        if (annotation.pattern.includes('\\n') || annotation.regex?.includes('\\n')) {
            return { MultiLine: { context_lines: 5 } };
        }

        // Default to single-line
        return 'SingleLine';
    }

    /**
     * Generate suggested action based on annotation
     */
    private generateAction(annotation: TagScoutAnnotation): string | undefined {
        // If annotation has examples, use them to suggest action
        if (annotation.examples && annotation.examples.length > 0) {
            return `Review logs for: ${annotation.description}. Examples: ${annotation.examples[0]}`;
        }

        // Generate action based on severity and category
        if (annotation.severity === 'error') {
            return `Investigate ${annotation.category} error: ${annotation.description}`;
        }

        return undefined;
    }

    /**
     * Convert multiple annotations to LSP patterns
     */
    convertAnnotationsToLSP(annotations: TagScoutAnnotation[]): LSPPattern[] {
        const patterns: LSPPattern[] = [];
        const seenPatterns = new Set<string>();

        for (const annotation of annotations) {
            try {
                const pattern = this.convertToLSPPattern(annotation);

                // Deduplicate by pattern regex
                if (!seenPatterns.has(pattern.pattern)) {
                    patterns.push(pattern);
                    seenPatterns.add(pattern.pattern);
                }
            } catch (error) {
                console.warn(`Failed to convert annotation ${annotation._id}:`, error);
            }
        }

        return patterns;
    }

    /**
     * Generate LSP server configuration
     */
    generateLSPConfig(
        patterns: LSPPattern[],
        product?: string
    ): LSPConfig {
        const config: LSPConfig = {
            patterns,
            settings: {
                detection_threshold: 0.85,
                multiline_patterns: true,
                multiline_context_window: 10,
                baseline_learning: true,
                correlation_enabled: true,
                max_file_size_mb: 100,
                streaming_chunk_size_kb: 512,
                background_processing: true
            }
        };

        // Add plugin configuration if requested
        if (this.options.generatePluginConfigs && product) {
            config.plugins = this.generatePluginConfig(product);
        }

        return config;
    }

    /**
     * Generate plugin configuration based on product
     */
    private generatePluginConfig(product: string): LSPConfig['plugins'] {
        const plugins: LSPConfig['plugins'] = {};

        switch (product.toLowerCase()) {
            case 'jabber':
                plugins.jabber = {
                    enabled: true,
                    config_path: './patterns/jabber-patterns.yaml'
                };
                break;
            case 'webex':
                plugins.webex = {
                    enabled: true,
                    config_path: './patterns/webex-patterns.yaml'
                };
                break;
            default:
                plugins.custom = {
                    enabled: true,
                    config_path: `./patterns/${product.toLowerCase()}-patterns.yaml`
                };
        }

        return plugins;
    }

    /**
     * Sync patterns from TagScout to LSP server format
     */
    async syncToLSP(product?: string): Promise<LSPBridgeResult> {
        const result: LSPBridgeResult = {
            success: false,
            configFiles: [],
            patternCount: 0,
            byProduct: new Map(),
            errors: []
        };

        try {
            console.log('🔄 Syncing TagScout patterns to LSP server format...');

            // Ensure output directory exists
            const outputDir = this.options.outputDir || './lsp-patterns';
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Fetch annotations from TagScout
            const annotations = product
                ? await this.client.fetchAnnotationsByProduct(product)
                : await this.client.fetchAnnotations();

            console.log(`✓ Fetched ${annotations.length} annotations from TagScout`);

            if (this.options.separateByProduct) {
                // Group by product and generate separate configs
                const byProduct = this.groupByProduct(annotations);

                for (const [prod, anns] of byProduct.entries()) {
                    try {
                        const patterns = this.convertAnnotationsToLSP(anns);
                        const config = this.generateLSPConfig(patterns, prod);
                        const fileName = `${prod.toLowerCase()}-patterns.yaml`;
                        const filePath = path.join(outputDir, fileName);

                        await this.writeYAMLConfig(filePath, config);

                        result.configFiles.push(filePath);
                        result.byProduct.set(prod, patterns.length);
                        result.patternCount += patterns.length;

                        console.log(`✓ Generated ${fileName} with ${patterns.length} patterns`);
                    } catch (error: any) {
                        result.errors.push(`Failed to generate config for ${prod}: ${error.message}`);
                    }
                }
            } else {
                // Generate single config file
                const patterns = this.convertAnnotationsToLSP(annotations);
                const config = this.generateLSPConfig(patterns, product);
                const fileName = this.options.configFileName || 'patterns.yaml';
                const filePath = path.join(outputDir, fileName);

                await this.writeYAMLConfig(filePath, config);

                result.configFiles.push(filePath);
                result.patternCount = patterns.length;

                console.log(`✓ Generated ${fileName} with ${patterns.length} patterns`);
            }

            result.success = true;
            console.log(`✓ LSP sync complete: ${result.patternCount} patterns in ${result.configFiles.length} files`);

        } catch (error: any) {
            result.errors.push(`Sync failed: ${error.message}`);
            console.error('✗ LSP sync failed:', error);
        }

        return result;
    }

    /**
     * Group annotations by product
     */
    private groupByProduct(annotations: TagScoutAnnotation[]): Map<string, TagScoutAnnotation[]> {
        const grouped = new Map<string, TagScoutAnnotation[]>();

        for (const annotation of annotations) {
            const product = annotation.product || 'general';
            const existing = grouped.get(product) || [];
            existing.push(annotation);
            grouped.set(product, existing);
        }

        return grouped;
    }

    /**
     * Write YAML configuration file
     */
    private async writeYAMLConfig(filePath: string, config: LSPConfig): Promise<void> {
        const yamlContent = yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            sortKeys: false
        });

        // Add header comment
        const header = `# Log Scout Analyzer - LSP Server Pattern Configuration
# Generated from TagScout Library
# Generated at: ${new Date().toISOString()}
#
# This file is used by the Rust LSP server for log analysis.
# Patterns are automatically synced from TagScout MongoDB.

`;

        await fs.promises.writeFile(filePath, header + yamlContent, 'utf-8');
    }

    /**
     * Generate master configuration that includes all product configs
     */
    async generateMasterConfig(configFiles: string[]): Promise<string> {
        const outputDir = this.options.outputDir || './lsp-patterns';
        const masterPath = path.join(outputDir, 'master-config.yaml');

        const masterConfig: LSPConfig = {
            patterns: [],
            plugins: {
                jabber: { enabled: true, config_path: './jabber-patterns.yaml' },
                webex: { enabled: true, config_path: './webex-patterns.yaml' },
                custom: { enabled: true }
            },
            settings: {
                detection_threshold: 0.85,
                multiline_patterns: true,
                multiline_context_window: 10,
                baseline_learning: true,
                correlation_enabled: true,
                max_file_size_mb: 100,
                streaming_chunk_size_kb: 512,
                background_processing: true
            }
        };

        await this.writeYAMLConfig(masterPath, masterConfig);
        console.log(`✓ Generated master config: ${masterPath}`);

        return masterPath;
    }

    /**
     * Watch for TagScout updates and auto-sync to LSP
     */
    async startAutoSync(intervalMinutes: number = 60): Promise<void> {
        console.log(`🔄 Starting auto-sync to LSP server (every ${intervalMinutes} minutes)...`);

        const sync = async () => {
            try {
                await this.syncToLSP();
            } catch (error) {
                console.error('Auto-sync error:', error);
            }
        };

        // Initial sync
        await sync();

        // Schedule recurring sync
        setInterval(sync, intervalMinutes * 60 * 1000);
    }

    /**
     * Generate README for LSP patterns directory
     */
    async generateReadme(): Promise<void> {
        const outputDir = this.options.outputDir || './lsp-patterns';
        const readmePath = path.join(outputDir, 'README.md');

        const readme = `# LSP Server Pattern Configurations

This directory contains pattern configurations for the Log Scout Analyzer LSP Server.

## Files

- **\`master-config.yaml\`** - Master configuration that references all product configs
- **\`<product>-patterns.yaml\`** - Product-specific pattern configurations

## Pattern Format

Patterns are defined in YAML format compatible with the Rust LSP server:

\`\`\`yaml
patterns:
  - id: "unique-pattern-id"
    name: "Human-readable name"
    description: "What this pattern detects"
    pattern: "(?i)regex pattern"
    mode: SingleLine
    severity: Error
    category: "network"
    service: "jabber"
    tags: ["connection", "failure"]
    action: "Suggested remediation"
    enabled: true
\`\`\`

## Severity Levels

- **Error** - Critical issues requiring immediate attention
- **Warning** - Potential issues that should be reviewed
- **Info** - Informational messages
- **Hint** - Suggestions and tips

## Pattern Modes

- **SingleLine** - Match pattern on a single line
- **MultiLine** - Match across multiple lines with context
- **Sequence** - Match patterns in sequence with gap tolerance

## Syncing from TagScout

These patterns are automatically synced from the TagScout MongoDB Library.

To manually sync:
\`\`\`bash
cd ../tagscout-integration
npx tagscout-cli sync
npm run sync-to-lsp
\`\`\`

To enable auto-sync:
\`\`\`bash
npm run auto-sync-lsp
\`\`\`

## Using with LSP Server

1. Configure the LSP server to load patterns from this directory
2. Update \`master-config.yaml\` with paths to product-specific configs
3. Reload the LSP server to apply changes

## Pattern Sources

Patterns are sourced from:
- TagScout MongoDB Library (\`task_TagScoutLibrary\`)
- Product-specific pattern collections (Jabber, CUCM, Webex, etc.)
- Community-contributed patterns

## Last Sync

Check file timestamps to see when patterns were last updated.
`;

        await fs.promises.writeFile(readmePath, readme, 'utf-8');
        console.log(`✓ Generated README: ${readmePath}`);
    }
}

/**
 * Convenience function to create LSP bridge and sync patterns
 */
export async function syncTagScoutToLSP(
    product?: string,
    options?: LSPBridgeOptions
): Promise<LSPBridgeResult> {
    const client = TagScoutClient.fromEnvironment();
    await client.connect();

    const bridge = new LSPBridge(client, options);
    const result = await bridge.syncToLSP(product);

    // Generate README
    await bridge.generateReadme();

    // Generate master config if multiple products
    if (result.configFiles.length > 1) {
        await bridge.generateMasterConfig(result.configFiles);
    }

    await client.disconnect();

    return result;
}

/**
 * Export for use in other modules
 */
export default LSPBridge;
