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
exports.PatternOverrideCodeActionProvider = void 0;
const vscode = __importStar(require("vscode"));
class PatternOverrideCodeActionProvider {
    provideCodeActions(_document, _range, context) {
        if (context.diagnostics.length === 0) {
            return [];
        }
        return context.diagnostics.map((diagnostic) => {
            const action = new vscode.CodeAction("Scout: Create Override from Diagnostic", vscode.CodeActionKind.QuickFix);
            action.diagnostics = [diagnostic];
            action.command = {
                command: "logScoutAnalyzer.patterns.createOverrideFromDiagnostic",
                title: "Create Override from Diagnostic",
                arguments: [diagnostic],
            };
            action.isPreferred = false;
            return action;
        });
    }
}
exports.PatternOverrideCodeActionProvider = PatternOverrideCodeActionProvider;
PatternOverrideCodeActionProvider.providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
//# sourceMappingURL=patternOverrideCodeActions.js.map