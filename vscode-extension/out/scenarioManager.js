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
exports.ScenarioManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Manages scenarios for log analysis
 */
class ScenarioManager {
    constructor(context) {
        this.scenarios = new Map();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const scoutDir = path.join(workspaceFolder.uri.fsPath, ".log-scout");
            if (!fs.existsSync(scoutDir)) {
                fs.mkdirSync(scoutDir, { recursive: true });
            }
            this.scenariosFilePath = path.join(scoutDir, "scenarios.json");
        }
        else {
            // Fallback to global storage
            this.scenariosFilePath = path.join(context.globalStorageUri.fsPath, "scenarios.json");
            if (!fs.existsSync(context.globalStorageUri.fsPath)) {
                fs.mkdirSync(context.globalStorageUri.fsPath, {
                    recursive: true,
                });
            }
        }
        this.load();
    }
    /**
     * Load scenarios from disk
     */
    load() {
        try {
            if (fs.existsSync(this.scenariosFilePath)) {
                const data = fs.readFileSync(this.scenariosFilePath, "utf8");
                const scenarios = JSON.parse(data);
                this.scenarios.clear();
                scenarios.forEach((scenario) => {
                    this.scenarios.set(scenario.id, scenario);
                });
                console.log(`Loaded ${this.scenarios.size} scenarios from disk`);
            }
        }
        catch (error) {
            console.error("Failed to load scenarios:", error);
            vscode.window.showErrorMessage(`Failed to load scenarios: ${error}`);
        }
    }
    /**
     * Save scenarios to disk
     */
    save() {
        try {
            const scenarios = Array.from(this.scenarios.values());
            fs.writeFileSync(this.scenariosFilePath, JSON.stringify(scenarios, null, 2), "utf8");
            console.log(`Saved ${scenarios.length} scenarios to disk`);
        }
        catch (error) {
            console.error("Failed to save scenarios:", error);
            vscode.window.showErrorMessage(`Failed to save scenarios: ${error}`);
        }
    }
    /**
     * Create a new scenario
     */
    createScenario(name, description, filePath, lines, patterns = []) {
        const id = `scenario-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const now = new Date().toISOString();
        // Convert lines to ranges for contiguous selections
        const ranges = this.linesToRanges(lines);
        const scenario = {
            id,
            name,
            description,
            filePath,
            fileName: path.basename(filePath),
            createdAt: now,
            updatedAt: now,
            lines: lines.sort((a, b) => a - b),
            ranges,
            patterns,
            tags: [],
            notes: "",
        };
        this.scenarios.set(id, scenario);
        this.save();
        return scenario;
    }
    /**
     * Update an existing scenario
     */
    updateScenario(id, updates) {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }
        const updated = {
            ...scenario,
            ...updates,
            id, // Preserve ID
            createdAt: scenario.createdAt, // Preserve creation date
            updatedAt: new Date().toISOString(),
        };
        // Recalculate ranges if lines changed
        if (updates.lines) {
            updated.ranges = this.linesToRanges(updated.lines);
        }
        this.scenarios.set(id, updated);
        this.save();
        return updated;
    }
    /**
     * Delete a scenario
     */
    deleteScenario(id) {
        const result = this.scenarios.delete(id);
        if (result) {
            this.save();
        }
        return result;
    }
    /**
     * Get a scenario by ID
     */
    getScenario(id) {
        return this.scenarios.get(id);
    }
    /**
     * Get all scenarios
     */
    getAllScenarios() {
        return Array.from(this.scenarios.values());
    }
    /**
     * Get scenarios for a specific file
     */
    getScenariosForFile(filePath) {
        return Array.from(this.scenarios.values()).filter((s) => s.filePath === filePath);
    }
    /**
     * Add lines to a scenario
     */
    addLinesToScenario(id, newLines) {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }
        const allLines = [...new Set([...scenario.lines, ...newLines])].sort((a, b) => a - b);
        return this.updateScenario(id, { lines: allLines });
    }
    /**
     * Remove lines from a scenario
     */
    removeLinesFromScenario(id, linesToRemove) {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }
        const removeSet = new Set(linesToRemove);
        const remainingLines = scenario.lines.filter((line) => !removeSet.has(line));
        return this.updateScenario(id, { lines: remainingLines });
    }
    /**
     * Convert line numbers to contiguous ranges
     */
    linesToRanges(lines) {
        if (lines.length === 0) {
            return [];
        }
        const sorted = [...lines].sort((a, b) => a - b);
        const ranges = [];
        let start = sorted[0];
        let end = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            }
            else {
                ranges.push({ start, end });
                start = sorted[i];
                end = sorted[i];
            }
        }
        ranges.push({ start, end });
        return ranges;
    }
    /**
     * Export scenario to JSON file
     */
    async exportScenario(id) {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            vscode.window.showErrorMessage("Scenario not found");
            return;
        }
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`${scenario.name.replace(/[^a-z0-9]/gi, "_")}.json`),
            filters: {
                JSON: ["json"],
            },
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, JSON.stringify(scenario, null, 2), "utf8");
            vscode.window.showInformationMessage(`Scenario exported to ${uri.fsPath}`);
        }
    }
    /**
     * Import scenario from JSON file
     */
    async importScenario() {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                JSON: ["json"],
            },
        });
        if (!uris || uris.length === 0) {
            return null;
        }
        try {
            const data = fs.readFileSync(uris[0].fsPath, "utf8");
            const scenario = JSON.parse(data);
            // Generate new ID and timestamps
            scenario.id = `scenario-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            scenario.createdAt = new Date().toISOString();
            scenario.updatedAt = scenario.createdAt;
            this.scenarios.set(scenario.id, scenario);
            this.save();
            vscode.window.showInformationMessage(`Scenario "${scenario.name}" imported successfully`);
            return scenario;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to import scenario: ${error}`);
            return null;
        }
    }
    /**
     * Get storage file path
     */
    getStoragePath() {
        return this.scenariosFilePath;
    }
}
exports.ScenarioManager = ScenarioManager;
//# sourceMappingURL=scenarioManager.js.map