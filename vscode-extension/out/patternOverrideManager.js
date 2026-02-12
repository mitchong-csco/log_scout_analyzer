"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternOverrideManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Manages user pattern overrides and custom patterns
 */
class PatternOverrideManager {
    constructor(context) {
        this.overrides = new Map();
        this.custom = new Map();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const scoutDir = path.join(workspaceFolder.uri.fsPath, ".log-scout");
            if (!fs.existsSync(scoutDir)) {
                fs.mkdirSync(scoutDir, { recursive: true });
            }
            this.storageFilePath = path.join(scoutDir, "pattern-overrides.json");
        }
        else {
            // Fallback to global storage
            this.storageFilePath = path.join(context.globalStorageUri.fsPath, "pattern-overrides.json");
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
    load() {
        try {
            if (fs.existsSync(this.storageFilePath)) {
                const data = fs.readFileSync(this.storageFilePath, "utf8");
                const storage = JSON.parse(data);
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
                console.log(`Loaded ${this.overrides.size} pattern overrides and ${this.custom.size} custom patterns`);
            }
        }
        catch (error) {
            console.error("Failed to load pattern overrides:", error);
            vscode.window.showErrorMessage(`Failed to load pattern overrides: ${error}`);
        }
    }
    /**
     * Save overrides to disk
     */
    save() {
        try {
            const storage = {
                version: "1.0",
                overrides: Object.fromEntries(this.overrides),
                custom: Object.fromEntries(this.custom),
            };
            fs.writeFileSync(this.storageFilePath, JSON.stringify(storage, null, 2), "utf8");
            console.log(`Saved ${this.overrides.size} pattern overrides and ${this.custom.size} custom patterns`);
        }
        catch (error) {
            console.error("Failed to save pattern overrides:", error);
            vscode.window.showErrorMessage(`Failed to save pattern overrides: ${error}`);
        }
    }
    /**
     * Create or update a pattern override
     */
    createOverride(sourceId, sourceType, updates) {
        const now = new Date().toISOString();
        const id = `override-${sourceId}`;
        const existing = this.overrides.get(id);
        const override = {
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
    createCustomPattern(pattern) {
        const now = new Date().toISOString();
        const id = `custom-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const customPattern = {
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
    updatePattern(id, updates) {
        let pattern = this.overrides.get(id) || this.custom.get(id);
        if (!pattern) {
            return null;
        }
        const updated = {
            ...pattern,
            ...updates,
            id, // Preserve ID
            createdAt: pattern.createdAt, // Preserve creation date
            modifiedAt: new Date().toISOString(),
        };
        if (this.overrides.has(id)) {
            this.overrides.set(id, updated);
        }
        else {
            this.custom.set(id, updated);
        }
        this.save();
        return updated;
    }
    /**
     * Delete an override (reverts to original) or custom pattern
     */
    deletePattern(id) {
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
    getPattern(id) {
        return this.overrides.get(id) || this.custom.get(id);
    }
    /**
     * Get all overrides
     */
    getAllOverrides() {
        return Array.from(this.overrides.values());
    }
    /**
     * Get all custom patterns
     */
    getAllCustom() {
        return Array.from(this.custom.values());
    }
    /**
     * Get all patterns (overrides + custom)
     */
    getAllPatterns() {
        return [
            ...Array.from(this.overrides.values()),
            ...Array.from(this.custom.values()),
        ];
    }
    /**
     * Check if a pattern has an override
     */
    hasOverride(sourceId) {
        return this.overrides.has(`override-${sourceId}`);
    }
    /**
     * Get override for a specific source pattern
     */
    getOverride(sourceId) {
        return this.overrides.get(`override-${sourceId}`);
    }
    /**
     * Reset an override (delete it, reverting to original)
     */
    resetOverride(sourceId) {
        return this.deletePattern(`override-${sourceId}`);
    }
    /**
     * Enable/disable a pattern
     */
    togglePattern(id, enabled) {
        const pattern = this.overrides.get(id) || this.custom.get(id);
        if (!pattern) {
            return false;
        }
        pattern.enabled = enabled;
        pattern.modifiedAt = new Date().toISOString();
        if (this.overrides.has(id)) {
            this.overrides.set(id, pattern);
        }
        else {
            this.custom.set(id, pattern);
        }
        this.save();
        return true;
    }
    /**
     * Export patterns to JSON file
     */
    async exportPatterns() {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file("pattern-overrides.json"),
            filters: {
                JSON: ["json"],
            },
        });
        if (uri) {
            const storage = {
                version: "1.0",
                overrides: Object.fromEntries(this.overrides),
                custom: Object.fromEntries(this.custom),
            };
            fs.writeFileSync(uri.fsPath, JSON.stringify(storage, null, 2), "utf8");
            vscode.window.showInformationMessage(`Patterns exported to ${uri.fsPath}`);
        }
    }
    /**
     * Import patterns from JSON file
     */
    async importPatterns() {
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
            const storage = JSON.parse(data);
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
            vscode.window.showInformationMessage(`Imported ${overridesAdded} overrides and ${customAdded} custom patterns`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to import patterns: ${error}`);
        }
    }
    /**
     * Get statistics
     */
    getStats() {
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
    getStoragePath() {
        return this.storageFilePath;
    }
}
exports.PatternOverrideManager = PatternOverrideManager;
//# sourceMappingURL=patternOverrideManager.js.map