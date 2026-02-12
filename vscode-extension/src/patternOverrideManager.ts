import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Source type for patterns
 */
export type PatternSourceType = "mongodb" | "custom" | "builtin";

/**
 * Log level enum matching Rust LogLevel
 */
export type LogLevel = "FATAL" | "ERROR" | "WARN" | "WARNING" | "INFO" | "DEBUG" | "TRACE" | "VERBOSE";

/**
 * Condition operator for severity triggers
 */
export type ConditionOperator = "equals" | "contains" | "regex" | "greaterthan" | "lessthan";

/**
 * Severity trigger based on extracted values or log level
 */
export interface SeverityTrigger {
    field: string;                     // Field name to check (e.g., "state", "status", "code")
    operator: ConditionOperator;       // Operator to use for comparison
    value: string;                     // Expected value to match
    severity: string;                  // Severity to use when condition matches
    description?: string;              // Description of why this trigger exists
}

/**
 * A pattern override or custom pattern
 */
export interface PatternOverride {
    id: string;
    sourceType: PatternSourceType;
    sourceId?: string; // Original MongoDB/builtin ID if this is an override
    name: string;
    regex: string;
    severity: string;
    category?: string[];
    tags?: string[];
    description?: string;
    notes?: string; // Why this override was made
    createdAt: string;
    modifiedAt?: string;
    modified?: boolean; // True if this overrides MongoDB pattern
    enabled?: boolean; // Can disable without deleting
    
    // Enhanced severity control
    logLevelTriggers?: { [level: string]: string }; // Map of log levels to severity overrides
    conditionTriggers?: SeverityTrigger[];          // Conditional severity based on extracted values
    captureFields?: string[];                       // Named capture groups for extracting values
}

/**
 * Storage structure for pattern overrides
 */
interface PatternOverrideStorage {
    version: string;
    overrides: { [id: string]: PatternOverride }; // Modified MongoDB patterns
    custom: { [id: string]: PatternOverride }; // User-created patterns
}

/**
 * Manages user pattern overrides and custom patterns
 */
export class PatternOverrideManager {
    private overrides: Map<string, PatternOverride> = new Map();
    private custom: Map<string, PatternOverride> = new Map();
    private storageFilePath: string;

    constructor(context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const scoutDir = path.join(workspaceFolder.uri.fsPath, ".log-scout");
            if (!fs.existsSync(scoutDir)) {
                fs.mkdirSync(scoutDir, { recursive: true });
            }
            this.storageFilePath = path.join(scoutDir, "pattern-overrides.json");
        } else {
            // Fallback to global storage
            this.storageFilePath = path.join(
                context.globalStorageUri.fsPath,
                "pattern-overrides.json"
            );
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, {
                    recursive: true,
                });
            }
        }

        this.load();
    }

    /**
     * Load overrides from disk
     */
    private load(): void {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const data = fs.readFileSync(this.storageFilePath, "utf8");
                const storage: PatternOverrideStorage = JSON.parse(data);
                
                this.overrides.clear();
                this.custom.clear();
                
                // Load overrides
                Object.entries(storage.overrides || {}).forEach(([id, pattern]) => {
                    this.overrides.set(id, pattern);
                });
                
                // Load custom patterns
                Object.entries(storage.custom || {}).forEach(([id, pattern]) => {
                    this.custom.set(id, pattern);
                });

                console.log(
                    `Loaded ${this.overrides.size} pattern overrides and ${this.custom.size} custom patterns`
                );
            }
        } catch (error) {
            console.error("Failed to load pattern overrides:", error);
            vscode.window.showErrorMessage(
                `Failed to load pattern overrides: ${error}`
            );
        }
    }

    /**
     * Save overrides to disk
     */
    private save(): void {
        try {
            const storage: PatternOverrideStorage = {
                version: "1.0",
                overrides: Object.fromEntries(this.overrides),
                custom: Object.fromEntries(this.custom),
            };

            fs.writeFileSync(
                this.storageFilePath,
                JSON.stringify(storage, null, 2),
                "utf8"
            );

            console.log(
                `Saved ${this.overrides.size} pattern overrides and ${this.custom.size} custom patterns`
            );
        } catch (error) {
            console.error("Failed to save pattern overrides:", error);
            vscode.window.showErrorMessage(
                `Failed to save pattern overrides: ${error}`
            );
        }
    }

    /**
     * Create or update a pattern override
     */
    public createOverride(
        sourceId: string,
        sourceType: PatternSourceType,
        updates: Partial<PatternOverride>
    ): PatternOverride {
        const now = new Date().toISOString();
        const id = `override-${sourceId}`;

        const existing = this.overrides.get(id);
        const override: PatternOverride = {
            id,
            sourceType,
            sourceId,
            name: updates.name || "",
            regex: updates.regex || "",
            severity: updates.severity || "info",
            category: updates.category,
            tags: updates.tags,
            description: updates.description,
            notes: updates.notes,
            createdAt: existing?.createdAt || now,
            modifiedAt: now,
            modified: true,
            enabled: updates.enabled !== undefined ? updates.enabled : true,
        };

        this.overrides.set(id, override);
        this.save();

        return override;
    }

    /**
     * Create a custom pattern
     */
    public createCustomPattern(
        pattern: Omit<PatternOverride, "id" | "createdAt" | "sourceType">
    ): PatternOverride {
        const now = new Date().toISOString();
        const id = `custom-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

        const customPattern: PatternOverride = {
            ...pattern,
            id,
            sourceType: "custom",
            createdAt: now,
            enabled: pattern.enabled !== undefined ? pattern.enabled : true,
        };

        this.custom.set(id, customPattern);
        this.save();

        return customPattern;
    }

    /**
     * Update an existing override or custom pattern
     */
    public updatePattern(
        id: string,
        updates: Partial<PatternOverride>
    ): PatternOverride | null {
        let pattern = this.overrides.get(id) || this.custom.get(id);
        if (!pattern) {
            return null;
        }

        const updated: PatternOverride = {
            ...pattern,
            ...updates,
            id, // Preserve ID
            createdAt: pattern.createdAt, // Preserve creation date
            modifiedAt: new Date().toISOString(),
        };

        if (this.overrides.has(id)) {
            this.overrides.set(id, updated);
        } else {
            this.custom.set(id, updated);
        }

        this.save();
        return updated;
    }

    /**
     * Delete an override (reverts to original) or custom pattern
     */
    public deletePattern(id: string): boolean {
        const deletedOverride = this.overrides.delete(id);
        const deletedCustom = this.custom.delete(id);
        
        if (deletedOverride || deletedCustom) {
            this.save();
            return true;
        }
        
        return false;
    }

    /**
     * Get a specific override or custom pattern
     */
    public getPattern(id: string): PatternOverride | undefined {
        return this.overrides.get(id) || this.custom.get(id);
    }

    /**
     * Get all overrides
     */
    public getAllOverrides(): PatternOverride[] {
        return Array.from(this.overrides.values());
    }

    /**
     * Get all custom patterns
     */
    public getAllCustom(): PatternOverride[] {
        return Array.from(this.custom.values());
    }

    /**
     * Get all patterns (overrides + custom)
     */
    public getAllPatterns(): PatternOverride[] {
        return [
            ...Array.from(this.overrides.values()),
            ...Array.from(this.custom.values()),
        ];
    }

    /**
     * Check if a pattern has an override
     */
    public hasOverride(sourceId: string): boolean {
        return this.overrides.has(`override-${sourceId}`);
    }

    /**
     * Get override for a specific source pattern
     */
    public getOverride(sourceId: string): PatternOverride | undefined {
        return this.overrides.get(`override-${sourceId}`);
    }

    /**
     * Reset an override (delete it, reverting to original)
     */
    public resetOverride(sourceId: string): boolean {
        return this.deletePattern(`override-${sourceId}`);
    }

    /**
     * Enable/disable a pattern
     */
    public togglePattern(id: string, enabled: boolean): boolean {
        const pattern = this.overrides.get(id) || this.custom.get(id);
        if (!pattern) {
            return false;
        }

        pattern.enabled = enabled;
        pattern.modifiedAt = new Date().toISOString();

        if (this.overrides.has(id)) {
            this.overrides.set(id, pattern);
        } else {
            this.custom.set(id, pattern);
        }

        this.save();
        return true;
    }

    /**
     * Export patterns to JSON file
     */
    public async exportPatterns(): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file("pattern-overrides.json"),
            filters: {
                JSON: ["json"],
            },
        });

        if (uri) {
            const storage: PatternOverrideStorage = {
                version: "1.0",
                overrides: Object.fromEntries(this.overrides),
                custom: Object.fromEntries(this.custom),
            };

            fs.writeFileSync(
                uri.fsPath,
                JSON.stringify(storage, null, 2),
                "utf8"
            );

            vscode.window.showInformationMessage(
                `Patterns exported to ${uri.fsPath}`
            );
        }
    }

    /**
     * Import patterns from JSON file
     */
    public async importPatterns(): Promise<void> {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                JSON: ["json"],
            },
        });

        if (!uris || uris.length === 0) {
            return;
        }

        try {
            const data = fs.readFileSync(uris[0].fsPath, "utf8");
            const storage: PatternOverrideStorage = JSON.parse(data);

            let overridesAdded = 0;
            let customAdded = 0;

            // Import overrides
            Object.entries(storage.overrides || {}).forEach(([id, pattern]) => {
                this.overrides.set(id, pattern);
                overridesAdded++;
            });

            // Import custom patterns with new IDs to avoid conflicts
            Object.values(storage.custom || {}).forEach((pattern) => {
                const newId = `custom-${Date.now()}-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                this.custom.set(newId, { ...pattern, id: newId });
                customAdded++;
            });

            this.save();

            vscode.window.showInformationMessage(
                `Imported ${overridesAdded} overrides and ${customAdded} custom patterns`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import patterns: ${error}`);
        }
    }

    /**
     * Get statistics
     */
    public getStats(): {
        totalOverrides: number;
        totalCustom: number;
        enabledOverrides: number;
        enabledCustom: number;
    } {
        const overrides = Array.from(this.overrides.values());
        const custom = Array.from(this.custom.values());

        return {
            totalOverrides: overrides.length,
            totalCustom: custom.length,
            enabledOverrides: overrides.filter((p) => p.enabled !== false)
                .length,
            enabledCustom: custom.filter((p) => p.enabled !== false).length,
        };
    }

    /**
     * Get storage file path
     */
    public getStoragePath(): string {
        return this.storageFilePath;
    }
}
