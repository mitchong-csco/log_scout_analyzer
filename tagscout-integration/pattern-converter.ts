/**
 * TagScout Pattern Converter
 *
 * Converts TagScout annotations from MongoDB into Log Scout Analyzer pattern format.
 * Handles pattern transformation, validation, and optimization.
 */

import { TagScoutAnnotation, TagScoutCategory } from './tagscout-client';

/**
 * Log Scout Analyzer pattern format
 */
export interface LogScoutPattern {
    pattern: string;
    severity: 'error' | 'warning' | 'info' | 'debug';
    category?: string;
    message?: string;
    tags?: string[];
    product?: string;
    component?: string;
    source?: 'tagscout' | 'builtin' | 'user';
    metadata?: {
        id?: string;
        version?: string;
        author?: string;
        lastUpdated?: Date;
    };
}

/**
 * Pattern conversion statistics
 */
export interface ConversionStats {
    totalProcessed: number;
    successfullyConverted: number;
    skipped: number;
    errors: number;
    byCategory: Map<string, number>;
    bySeverity: Map<string, number>;
}

/**
 * Pattern conversion options
 */
export interface ConversionOptions {
    validateRegex?: boolean;
    optimizePatterns?: boolean;
    includeMetadata?: boolean;
    filterByProduct?: string[];
    filterBySeverity?: string[];
    filterByCategory?: string[];
    deduplicatePatterns?: boolean;
    sortByPriority?: boolean;
}

/**
 * Pattern Converter
 *
 * Transforms TagScout annotations into Log Scout Analyzer patterns.
 */
export class PatternConverter {
    private stats: ConversionStats;
    private seenPatterns: Set<string>;

    constructor() {
        this.stats = this.createEmptyStats();
        this.seenPatterns = new Set();
    }

    /**
     * Create empty statistics object
     */
    private createEmptyStats(): ConversionStats {
        return {
            totalProcessed: 0,
            successfullyConverted: 0,
            skipped: 0,
            errors: 0,
            byCategory: new Map(),
            bySeverity: new Map()
        };
    }

    /**
     * Reset conversion statistics
     */
    resetStats(): void {
        this.stats = this.createEmptyStats();
        this.seenPatterns.clear();
    }

    /**
     * Get conversion statistics
     */
    getStats(): ConversionStats {
        return { ...this.stats };
    }

    /**
     * Convert a single TagScout annotation to Log Scout pattern
     */
    convertAnnotation(
        annotation: TagScoutAnnotation,
        options?: ConversionOptions
    ): LogScoutPattern | null {
        this.stats.totalProcessed++;

        try {
            // Apply filters
            if (!this.passesFilters(annotation, options)) {
                this.stats.skipped++;
                return null;
            }

            // Extract pattern - prefer regex over pattern field
            const patternString = annotation.regex || annotation.pattern;
            if (!patternString) {
                console.warn(`Annotation ${annotation._id} has no pattern or regex`);
                this.stats.skipped++;
                return null;
            }

            // Validate regex if requested
            if (options?.validateRegex) {
                if (!this.isValidRegex(patternString)) {
                    console.warn(`Invalid regex pattern: ${patternString}`);
                    this.stats.errors++;
                    return null;
                }
            }

            // Check for duplicates if requested
            if (options?.deduplicatePatterns) {
                if (this.seenPatterns.has(patternString)) {
                    this.stats.skipped++;
                    return null;
                }
                this.seenPatterns.add(patternString);
            }

            // Optimize pattern if requested
            const finalPattern = options?.optimizePatterns
                ? this.optimizePattern(patternString)
                : patternString;

            // Build Log Scout pattern
            const logScoutPattern: LogScoutPattern = {
                pattern: finalPattern,
                severity: this.normalizeSeverity(annotation.severity),
                category: annotation.category,
                message: annotation.description || annotation.messageTemplate,
                tags: annotation.tags,
                product: annotation.product,
                component: annotation.component,
                source: 'tagscout'
            };

            // Add metadata if requested
            if (options?.includeMetadata) {
                logScoutPattern.metadata = {
                    id: annotation._id,
                    version: annotation.metadata?.version,
                    author: annotation.metadata?.author,
                    lastUpdated: annotation.metadata?.updatedAt
                };
            }

            // Update statistics
            this.stats.successfullyConverted++;

            const categoryCount = this.stats.byCategory.get(annotation.category) || 0;
            this.stats.byCategory.set(annotation.category, categoryCount + 1);

            const severityCount = this.stats.bySeverity.get(annotation.severity) || 0;
            this.stats.bySeverity.set(annotation.severity, severityCount + 1);

            return logScoutPattern;
        } catch (error) {
            console.error(`Error converting annotation ${annotation._id}:`, error);
            this.stats.errors++;
            return null;
        }
    }

    /**
     * Convert multiple annotations
     */
    convertAnnotations(
        annotations: TagScoutAnnotation[],
        options?: ConversionOptions
    ): LogScoutPattern[] {
        this.resetStats();

        const patterns: LogScoutPattern[] = [];

        for (const annotation of annotations) {
            const pattern = this.convertAnnotation(annotation, options);
            if (pattern) {
                patterns.push(pattern);
            }
        }

        // Sort by priority if requested
        if (options?.sortByPriority) {
            this.sortPatternsByPriority(patterns);
        }

        console.log(`✓ Converted ${this.stats.successfullyConverted}/${this.stats.totalProcessed} annotations`);

        return patterns;
    }

    /**
     * Convert and group patterns by severity
     */
    convertAndGroupBySeverity(
        annotations: TagScoutAnnotation[],
        options?: ConversionOptions
    ): Record<string, LogScoutPattern[]> {
        const patterns = this.convertAnnotations(annotations, options);

        const grouped: Record<string, LogScoutPattern[]> = {
            error: [],
            warning: [],
            info: [],
            debug: []
        };

        for (const pattern of patterns) {
            grouped[pattern.severity].push(pattern);
        }

        return grouped;
    }

    /**
     * Convert and extract pattern strings only (for Log Scout config)
     */
    convertToPatternStrings(
        annotations: TagScoutAnnotation[],
        options?: ConversionOptions
    ): Record<string, string[]> {
        const grouped = this.convertAndGroupBySeverity(annotations, options);

        return {
            errors: grouped.error.map(p => p.pattern),
            warnings: grouped.warning.map(p => p.pattern),
            info: grouped.info.map(p => p.pattern),
            debug: grouped.debug.map(p => p.pattern)
        };
    }

    /**
     * Check if annotation passes filter criteria
     */
    private passesFilters(
        annotation: TagScoutAnnotation,
        options?: ConversionOptions
    ): boolean {
        // Filter by product
        if (options?.filterByProduct && options.filterByProduct.length > 0) {
            if (!annotation.product || !options.filterByProduct.includes(annotation.product)) {
                return false;
            }
        }

        // Filter by severity
        if (options?.filterBySeverity && options.filterBySeverity.length > 0) {
            if (!options.filterBySeverity.includes(annotation.severity)) {
                return false;
            }
        }

        // Filter by category
        if (options?.filterByCategory && options.filterByCategory.length > 0) {
            if (!annotation.category || !options.filterByCategory.includes(annotation.category)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validate regex pattern
     */
    private isValidRegex(pattern: string): boolean {
        try {
            new RegExp(pattern);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Optimize regex pattern
     */
    private optimizePattern(pattern: string): string {
        let optimized = pattern;

        // Remove unnecessary capturing groups - replace ( with (?:
        // But preserve named groups and lookaheads/lookbehinds
        optimized = optimized.replace(/\((?!\?)/g, '(?:');

        // Simplify case-insensitive flags
        if (!optimized.includes('(?i)') && !optimized.includes('(?-i)')) {
            // Pattern doesn't have inline flags, that's fine
        }

        // Remove trailing whitespace patterns that might cause issues
        optimized = optimized.trim();

        return optimized;
    }

    /**
     * Normalize severity to Log Scout format
     */
    private normalizeSeverity(
        severity: string
    ): 'error' | 'warning' | 'info' | 'debug' {
        const normalized = severity.toLowerCase();

        switch (normalized) {
            case 'error':
            case 'fatal':
            case 'critical':
                return 'error';
            case 'warning':
            case 'warn':
                return 'warning';
            case 'info':
            case 'information':
            case 'notice':
                return 'info';
            case 'debug':
            case 'trace':
            case 'verbose':
                return 'debug';
            default:
                return 'info'; // Default fallback
        }
    }

    /**
     * Sort patterns by priority (severity, then category)
     */
    private sortPatternsByPriority(patterns: LogScoutPattern[]): void {
        const severityOrder: Record<string, number> = {
            error: 0,
            warning: 1,
            info: 2,
            debug: 3
        };

        patterns.sort((a, b) => {
            // First by severity
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) {
                return severityDiff;
            }

            // Then by category
            if (a.category && b.category) {
                return a.category.localeCompare(b.category);
            }

            return 0;
        });
    }

    /**
     * Generate VS Code settings JSON from patterns
     */
    generateVSCodeSettings(
        annotations: TagScoutAnnotation[],
        options?: ConversionOptions
    ): string {
        const patternStrings = this.convertToPatternStrings(annotations, options);

        const settings = {
            "logScoutAnalyzer.enableDiagnostics": true,
            "logScoutAnalyzer.patterns.errors": patternStrings.errors,
            "logScoutAnalyzer.patterns.warnings": patternStrings.warnings,
            "logScoutAnalyzer.patterns.info": patternStrings.info,
            "logScoutAnalyzer.patterns.debug": patternStrings.debug
        };

        return JSON.stringify(settings, null, 2);
    }

    /**
     * Generate pattern documentation
     */
    generatePatternDocs(
        annotations: TagScoutAnnotation[],
        options?: ConversionOptions
    ): string {
        const patterns = this.convertAnnotations(annotations, options);
        const grouped = this.groupPatternsByCategory(patterns);

        let docs = '# TagScout Patterns\n\n';
        docs += `Generated: ${new Date().toISOString()}\n\n`;
        docs += `Total Patterns: ${patterns.length}\n\n`;

        // Statistics
        docs += '## Statistics\n\n';
        docs += `- Errors: ${this.stats.bySeverity.get('error') || 0}\n`;
        docs += `- Warnings: ${this.stats.bySeverity.get('warning') || 0}\n`;
        docs += `- Info: ${this.stats.bySeverity.get('info') || 0}\n`;
        docs += `- Debug: ${this.stats.bySeverity.get('debug') || 0}\n\n`;

        // By category
        docs += '## By Category\n\n';
        for (const [category, count] of this.stats.byCategory.entries()) {
            docs += `- ${category}: ${count}\n`;
        }
        docs += '\n';

        // Pattern details
        for (const [category, categoryPatterns] of grouped.entries()) {
            docs += `## ${category}\n\n`;

            for (const pattern of categoryPatterns) {
                docs += `### ${pattern.severity.toUpperCase()}: ${pattern.message || 'No description'}\n\n`;
                docs += '```regex\n';
                docs += pattern.pattern;
                docs += '\n```\n\n';

                if (pattern.product) {
                    docs += `**Product**: ${pattern.product}\n\n`;
                }
                if (pattern.component) {
                    docs += `**Component**: ${pattern.component}\n\n`;
                }
                if (pattern.tags && pattern.tags.length > 0) {
                    docs += `**Tags**: ${pattern.tags.join(', ')}\n\n`;
                }

                docs += '---\n\n';
            }
        }

        return docs;
    }

    /**
     * Group patterns by category
     */
    private groupPatternsByCategory(patterns: LogScoutPattern[]): Map<string, LogScoutPattern[]> {
        const grouped = new Map<string, LogScoutPattern[]>();

        for (const pattern of patterns) {
            const category = pattern.category || 'Uncategorized';
            const categoryPatterns = grouped.get(category) || [];
            categoryPatterns.push(pattern);
            grouped.set(category, categoryPatterns);
        }

        return grouped;
    }

    /**
     * Merge TagScout patterns with existing Log Scout patterns
     */
    mergeWithExistingPatterns(
        tagScoutAnnotations: TagScoutAnnotation[],
        existingPatterns: Record<string, string[]>,
        options?: ConversionOptions
    ): Record<string, string[]> {
        const newPatterns = this.convertToPatternStrings(tagScoutAnnotations, {
            ...options,
            deduplicatePatterns: true
        });

        const merged: Record<string, string[]> = {
            errors: [...(existingPatterns.errors || [])],
            warnings: [...(existingPatterns.warnings || [])],
            info: [...(existingPatterns.info || [])],
            debug: [...(existingPatterns.debug || [])]
        };

        // Add new patterns, avoiding duplicates
        for (const [key, patterns] of Object.entries(newPatterns)) {
            const existingSet = new Set(merged[key as keyof typeof merged]);
            for (const pattern of patterns) {
                if (!existingSet.has(pattern)) {
                    merged[key as keyof typeof merged].push(pattern);
                    existingSet.add(pattern);
                }
            }
        }

        return merged;
    }
}

/**
 * Convenience function to convert annotations
 */
export function convertAnnotations(
    annotations: TagScoutAnnotation[],
    options?: ConversionOptions
): LogScoutPattern[] {
    const converter = new PatternConverter();
    return converter.convertAnnotations(annotations, options);
}

/**
 * Convenience function to convert to VS Code settings
 */
export function convertToVSCodeSettings(
    annotations: TagScoutAnnotation[],
    options?: ConversionOptions
): string {
    const converter = new PatternConverter();
    return converter.generateVSCodeSettings(annotations, options);
}
