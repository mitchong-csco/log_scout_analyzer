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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePatternQuickPick = exports.deletePatternQuickPick = exports.editPatternQuickInput = exports.createCustomPatternWizard = exports.createOverrideFromDiagnostic = exports.createOverrideFromSelection = exports.createOverrideQuickInput = void 0;
const vscode = __importStar(require("vscode"));
const SEVERITY_OPTIONS = ["error", "warning", "info", "hint"];
function formatPatternLabel(pattern) {
    return pattern.name?.trim() ? pattern.name : pattern.id;
}
async function pickSeverity(_defaultValue) {
    const items = SEVERITY_OPTIONS.map((option) => ({
        label: option,
        value: option,
    }));
    const selected = await vscode.window.showQuickPick(items, {
        title: "Select severity",
        placeHolder: "Choose severity",
        canPickMany: false,
        ignoreFocusOut: true,
    });
    return selected?.value;
}
async function pickPattern(manager, title) {
    const patterns = manager.getAllPatterns();
    if (patterns.length === 0) {
        vscode.window.showInformationMessage("No patterns available yet.");
        return undefined;
    }
    const items = patterns.map((pattern) => ({
        label: formatPatternLabel(pattern),
        description: pattern.id,
        detail: `${pattern.sourceType} | ${pattern.severity}`,
        pattern,
    }));
    const selection = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: "Choose a pattern",
        matchOnDescription: true,
        matchOnDetail: true,
    });
    return selection?.pattern;
}
async function createOverrideQuickInput(manager) {
    const sourceId = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter the source pattern ID to override",
        placeHolder: "pattern-id",
        ignoreFocusOut: true,
    });
    if (!sourceId) {
        return;
    }
    const name = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter a display name",
        placeHolder: "My override",
        ignoreFocusOut: true,
    });
    const regex = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter the regex for this override",
        placeHolder: "(?i)error",
        ignoreFocusOut: true,
    });
    if (!regex) {
        return;
    }
    const severity = await pickSeverity("info");
    if (!severity) {
        return;
    }
    const notes = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Optional: notes or reason for this override",
        placeHolder: "Why this change is needed",
        ignoreFocusOut: true,
    });
    const override = manager.createOverride(sourceId, "mongodb", {
        name: name || sourceId,
        regex,
        severity,
        notes: notes || undefined,
        enabled: true,
    });
    vscode.window.showInformationMessage(`Created override ${override.id} (${override.severity}).`);
}
exports.createOverrideQuickInput = createOverrideQuickInput;
async function createOverrideFromSelection(manager, selectionText) {
    const trimmedSelection = selectionText.trim();
    if (!trimmedSelection) {
        vscode.window.showInformationMessage("Select text to use as the default regex.");
        return;
    }
    const sourceId = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter the source pattern ID to override",
        placeHolder: "pattern-id",
        ignoreFocusOut: true,
    });
    if (!sourceId) {
        return;
    }
    const name = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter a display name",
        placeHolder: "My override",
        ignoreFocusOut: true,
    });
    const regex = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Enter the regex for this override",
        value: trimmedSelection,
        ignoreFocusOut: true,
    });
    if (!regex) {
        return;
    }
    const severity = await pickSeverity("info");
    if (!severity) {
        return;
    }
    const notes = await vscode.window.showInputBox({
        title: "Create Override",
        prompt: "Optional: notes or reason for this override",
        placeHolder: "Why this change is needed",
        ignoreFocusOut: true,
    });
    const override = manager.createOverride(sourceId, "mongodb", {
        name: name || sourceId,
        regex,
        severity,
        notes: notes || undefined,
        enabled: true,
    });
    vscode.window.showInformationMessage(`Created override ${override.id} (${override.severity}).`);
}
exports.createOverrideFromSelection = createOverrideFromSelection;
async function createOverrideFromDiagnostic(manager, diagnostic) {
    const diagnosticData = diagnostic.data;
    const sourceId = typeof diagnostic.code === "string" ? diagnostic.code : undefined;
    const patternName = typeof diagnosticData?.patternName === "string"
        ? diagnosticData.patternName
        : undefined;
    const patternRegex = typeof diagnosticData?.pattern_regex === "string"
        ? diagnosticData.pattern_regex
        : typeof diagnosticData?.patternRegex === "string"
            ? diagnosticData.patternRegex
            : undefined;
    const sourceIdInput = await vscode.window.showInputBox({
        title: "Create Override from Diagnostic",
        prompt: "Confirm the source pattern ID",
        value: sourceId,
        placeHolder: "pattern-id",
        ignoreFocusOut: true,
    });
    if (!sourceIdInput) {
        return;
    }
    const name = await vscode.window.showInputBox({
        title: "Create Override from Diagnostic",
        prompt: "Enter a display name",
        value: patternName,
        placeHolder: "My override",
        ignoreFocusOut: true,
    });
    const regex = await vscode.window.showInputBox({
        title: "Create Override from Diagnostic",
        prompt: "Enter the regex for this override",
        value: patternRegex,
        ignoreFocusOut: true,
    });
    if (!regex) {
        return;
    }
    const severity = await pickSeverity("info");
    if (!severity) {
        return;
    }
    const notes = await vscode.window.showInputBox({
        title: "Create Override from Diagnostic",
        prompt: "Optional: notes or reason for this override",
        placeHolder: diagnostic.message,
        ignoreFocusOut: true,
    });
    const override = manager.createOverride(sourceIdInput, "mongodb", {
        name: name || sourceIdInput,
        regex,
        severity,
        notes: notes || undefined,
        enabled: true,
    });
    vscode.window.showInformationMessage(`Created override ${override.id} (${override.severity}).`);
}
exports.createOverrideFromDiagnostic = createOverrideFromDiagnostic;
async function createCustomPatternWizard(manager) {
    const name = await vscode.window.showInputBox({
        title: "Create Custom Pattern",
        prompt: "Enter a pattern name",
        placeHolder: "Custom pattern",
        ignoreFocusOut: true,
    });
    if (!name) {
        return;
    }
    const regex = await vscode.window.showInputBox({
        title: "Create Custom Pattern",
        prompt: "Enter the regex",
        placeHolder: "(?i)warning",
        ignoreFocusOut: true,
    });
    if (!regex) {
        return;
    }
    const severity = await pickSeverity("info");
    if (!severity) {
        return;
    }
    const description = await vscode.window.showInputBox({
        title: "Create Custom Pattern",
        prompt: "Optional: description",
        placeHolder: "What this pattern detects",
        ignoreFocusOut: true,
    });
    const notes = await vscode.window.showInputBox({
        title: "Create Custom Pattern",
        prompt: "Optional: notes",
        placeHolder: "Why this pattern is useful",
        ignoreFocusOut: true,
    });
    const custom = manager.createCustomPattern({
        name,
        regex,
        severity,
        description: description || undefined,
        notes: notes || undefined,
        enabled: true,
    });
    vscode.window.showInformationMessage(`Created custom pattern ${custom.id} (${custom.severity}).`);
}
exports.createCustomPatternWizard = createCustomPatternWizard;
async function editPatternQuickInput(manager) {
    const pattern = await pickPattern(manager, "Edit Pattern");
    if (!pattern) {
        return;
    }
    const name = await vscode.window.showInputBox({
        title: "Edit Pattern",
        prompt: "Update the display name",
        value: pattern.name,
        ignoreFocusOut: true,
    });
    if (!name) {
        return;
    }
    const regex = await vscode.window.showInputBox({
        title: "Edit Pattern",
        prompt: "Update the regex",
        value: pattern.regex,
        ignoreFocusOut: true,
    });
    if (!regex) {
        return;
    }
    const severity = await pickSeverity(pattern.severity);
    if (!severity) {
        return;
    }
    const enabledPick = await vscode.window.showQuickPick(["enabled", "disabled"], {
        title: "Edit Pattern",
        placeHolder: "Enable or disable this pattern",
        ignoreFocusOut: true,
    });
    if (!enabledPick) {
        return;
    }
    const updated = manager.updatePattern(pattern.id, {
        name,
        regex,
        severity,
        enabled: enabledPick === "enabled",
    });
    if (updated) {
        vscode.window.showInformationMessage(`Updated pattern ${updated.id} (${updated.severity}).`);
    }
}
exports.editPatternQuickInput = editPatternQuickInput;
async function deletePatternQuickPick(manager) {
    const pattern = await pickPattern(manager, "Delete Pattern");
    if (!pattern) {
        return;
    }
    const confirm = await vscode.window.showWarningMessage(`Delete ${formatPatternLabel(pattern)}?`, { modal: true }, "Delete");
    if (confirm !== "Delete") {
        return;
    }
    const deleted = manager.deletePattern(pattern.id);
    if (deleted) {
        vscode.window.showInformationMessage(`Deleted pattern ${pattern.id}.`);
    }
}
exports.deletePatternQuickPick = deletePatternQuickPick;
async function togglePatternQuickPick(manager) {
    const pattern = await pickPattern(manager, "Enable/Disable Pattern");
    if (!pattern) {
        return;
    }
    const currentlyEnabled = pattern.enabled !== false;
    const nextState = !currentlyEnabled;
    const updated = manager.togglePattern(pattern.id, nextState);
    if (updated) {
        vscode.window.showInformationMessage(`${nextState ? "Enabled" : "Disabled"} pattern ${pattern.id}.`);
    }
}
exports.togglePatternQuickPick = togglePatternQuickPick;
//# sourceMappingURL=patternOverrideUI.js.map