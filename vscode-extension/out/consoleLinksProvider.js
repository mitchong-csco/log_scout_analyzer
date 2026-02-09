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
exports.ConsoleLinksProvider = void 0;
exports.registerConsoleNavigationCommand = registerConsoleNavigationCommand;
const vscode = __importStar(require("vscode"));
/**
 * Provides clickable links in the Scout Console output channel.
 * Matches patterns like:
 * - /path/to/file.log:123
 * - C:\path\to\file.log:123
 * - file.log:123:45
 */
class ConsoleLinksProvider {
    constructor() {
        // Regex to match file paths with line numbers
        // Matches: /path/to/file:123 or C:\path\to\file:123 or file.log:123:45
        this.fileLinkPattern = /(?:[a-zA-Z]:[\\\/]|\/)?[\w\-\.\/\\]+\.(?:log|txt|out|json|xml|csv):\d+(?::\d+)?/g;
    }
    provideDocumentLinks(document, _token) {
        const links = [];
        const text = document.getText();
        let match;
        while ((match = this.fileLinkPattern.exec(text)) !== null) {
            const matchText = match[0];
            const parts = matchText.split(":");
            if (parts.length < 2) {
                continue;
            }
            const filePath = parts[0];
            const lineNum = parseInt(parts[1], 10);
            const column = parts.length > 2 ? parseInt(parts[2], 10) : 1;
            if (isNaN(lineNum)) {
                continue;
            }
            // Create range for the matched text
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + matchText.length);
            const range = new vscode.Range(startPos, endPos);
            // Create URI for the target file
            let targetUri;
            try {
                // Try to resolve the file path
                if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
                    // Absolute path
                    targetUri = vscode.Uri.file(filePath);
                }
                else {
                    // Try workspace-relative path
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        targetUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                    }
                    else {
                        continue;
                    }
                }
                // Add fragment for line and column navigation
                const fragment = column > 1 ? `L${lineNum}:${column}` : `L${lineNum}`;
                const linkUri = targetUri.with({ fragment });
                const link = new vscode.DocumentLink(range, linkUri);
                link.tooltip = `Open ${filePath} at line ${lineNum}${column > 1 ? `, column ${column}` : ""}`;
                links.push(link);
            }
            catch (error) {
                // Skip invalid URIs
                continue;
            }
        }
        return links;
    }
    resolveDocumentLink(link, _token) {
        // Already resolved in provideDocumentLinks
        return link;
    }
}
exports.ConsoleLinksProvider = ConsoleLinksProvider;
/**
 * Custom command to handle clicking on file links in console output.
 * This provides better control over how files are opened.
 */
function registerConsoleNavigationCommand(context) {
    const command = vscode.commands.registerCommand("logScoutAnalyzer.navigateToFileLine", async (filePath, line, column) => {
        try {
            // Resolve file URI
            let fileUri;
            if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
                fileUri = vscode.Uri.file(filePath);
            }
            else {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage("No workspace folder open");
                    return;
                }
                fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            }
            // Open document
            const document = await vscode.workspace.openTextDocument(fileUri);
            // Find the current active column
            const activeColumn = vscode.window.activeTextEditor?.viewColumn ||
                vscode.ViewColumn.One;
            // Show document in editor
            const editor = await vscode.window.showTextDocument(document, {
                viewColumn: activeColumn,
                preserveFocus: false,
                preview: false,
            });
            // Navigate to line and column
            const position = new vscode.Position(line - 1, (column || 1) - 1);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    });
    context.subscriptions.push(command);
}
//# sourceMappingURL=consoleLinksProvider.js.map