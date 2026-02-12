import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Represents a line range in a log file
 */
export interface LineRange {
    start: number;
    end: number;
}

/**
 * Represents a detection/pattern associated with a scenario
 */
export interface ScenarioPattern {
    lineNumber: number;
    pattern: string;
    severity: string;
    message: string;
}

/**
 * Represents a custom scenario created by the user
 */
export interface Scenario {
    id: string;
    name: string;
    description: string;
    filePath: string;
    fileName: string;
    createdAt: string;
    updatedAt: string;
    lines: number[]; // Selected line numbers
    ranges: LineRange[]; // Line ranges for contiguous selections
    patterns: ScenarioPattern[]; // Associated detections
    tags: string[]; // User-defined tags
    notes: string; // Additional notes
}

/**
 * Manages scenarios for log analysis
 */
export class ScenarioManager {
    private scenarios: Map<string, Scenario> = new Map();
    private scenariosFilePath: string;

    constructor(context: vscode.ExtensionContext) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const scoutDir = path.join(workspaceFolder.uri.fsPath, ".log-scout");
            if (!fs.existsSync(scoutDir)) {
                fs.mkdirSync(scoutDir, { recursive: true });
            }
            this.scenariosFilePath = path.join(scoutDir, "scenarios.json");
        } else {
            // Fallback to global storage
            this.scenariosFilePath = path.join(
                context.globalStorageUri.fsPath,
                "scenarios.json"
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
     * Load scenarios from disk
     */
    private load(): void {
        try {
            if (fs.existsSync(this.scenariosFilePath)) {
                const data = fs.readFileSync(this.scenariosFilePath, "utf8");
                const scenarios: Scenario[] = JSON.parse(data);
                this.scenarios.clear();
                scenarios.forEach((scenario) => {
                    this.scenarios.set(scenario.id, scenario);
                });
                console.log(
                    `Loaded ${this.scenarios.size} scenarios from disk`
                );
            }
        } catch (error) {
            console.error("Failed to load scenarios:", error);
            vscode.window.showErrorMessage(
                `Failed to load scenarios: ${error}`
            );
        }
    }

    /**
     * Save scenarios to disk
     */
    private save(): void {
        try {
            const scenarios = Array.from(this.scenarios.values());
            fs.writeFileSync(
                this.scenariosFilePath,
                JSON.stringify(scenarios, null, 2),
                "utf8"
            );
            console.log(`Saved ${scenarios.length} scenarios to disk`);
        } catch (error) {
            console.error("Failed to save scenarios:", error);
            vscode.window.showErrorMessage(
                `Failed to save scenarios: ${error}`
            );
        }
    }

    /**
     * Create a new scenario
     */
    public createScenario(
        name: string,
        description: string,
        filePath: string,
        lines: number[],
        patterns: ScenarioPattern[] = []
    ): Scenario {
        const id = `scenario-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const now = new Date().toISOString();

        // Convert lines to ranges for contiguous selections
        const ranges = this.linesToRanges(lines);

        const scenario: Scenario = {
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
    public updateScenario(
        id: string,
        updates: Partial<Scenario>
    ): Scenario | null {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }

        const updated: Scenario = {
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
    public deleteScenario(id: string): boolean {
        const result = this.scenarios.delete(id);
        if (result) {
            this.save();
        }
        return result;
    }

    /**
     * Get a scenario by ID
     */
    public getScenario(id: string): Scenario | undefined {
        return this.scenarios.get(id);
    }

    /**
     * Get all scenarios
     */
    public getAllScenarios(): Scenario[] {
        return Array.from(this.scenarios.values());
    }

    /**
     * Get scenarios for a specific file
     */
    public getScenariosForFile(filePath: string): Scenario[] {
        return Array.from(this.scenarios.values()).filter(
            (s) => s.filePath === filePath
        );
    }

    /**
     * Add lines to a scenario
     */
    public addLinesToScenario(id: string, newLines: number[]): Scenario | null {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }

        const allLines = [...new Set([...scenario.lines, ...newLines])].sort(
            (a, b) => a - b
        );

        return this.updateScenario(id, { lines: allLines });
    }

    /**
     * Remove lines from a scenario
     */
    public removeLinesFromScenario(
        id: string,
        linesToRemove: number[]
    ): Scenario | null {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            return null;
        }

        const removeSet = new Set(linesToRemove);
        const remainingLines = scenario.lines.filter(
            (line) => !removeSet.has(line)
        );

        return this.updateScenario(id, { lines: remainingLines });
    }

    /**
     * Convert line numbers to contiguous ranges
     */
    private linesToRanges(lines: number[]): LineRange[] {
        if (lines.length === 0) {
            return [];
        }

        const sorted = [...lines].sort((a, b) => a - b);
        const ranges: LineRange[] = [];
        let start = sorted[0];
        let end = sorted[0];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] === end + 1) {
                end = sorted[i];
            } else {
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
    public async exportScenario(id: string): Promise<void> {
        const scenario = this.scenarios.get(id);
        if (!scenario) {
            vscode.window.showErrorMessage("Scenario not found");
            return;
        }

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(
                `${scenario.name.replace(/[^a-z0-9]/gi, "_")}.json`
            ),
            filters: {
                JSON: ["json"],
            },
        });

        if (uri) {
            fs.writeFileSync(
                uri.fsPath,
                JSON.stringify(scenario, null, 2),
                "utf8"
            );
            vscode.window.showInformationMessage(
                `Scenario exported to ${uri.fsPath}`
            );
        }
    }

    /**
     * Import scenario from JSON file
     */
    public async importScenario(): Promise<Scenario | null> {
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
            const scenario: Scenario = JSON.parse(data);

            // Generate new ID and timestamps
            scenario.id = `scenario-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`;
            scenario.createdAt = new Date().toISOString();
            scenario.updatedAt = scenario.createdAt;

            this.scenarios.set(scenario.id, scenario);
            this.save();

            vscode.window.showInformationMessage(
                `Scenario "${scenario.name}" imported successfully`
            );
            return scenario;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import scenario: ${error}`);
            return null;
        }
    }

    /**
     * Get storage file path
     */
    public getStoragePath(): string {
        return this.scenariosFilePath;
    }
}
