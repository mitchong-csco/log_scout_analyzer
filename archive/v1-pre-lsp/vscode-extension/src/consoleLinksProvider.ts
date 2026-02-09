import * as vscode from "vscode";

/**
 * Provides clickable links in the Scout Console output channel.
 * Matches patterns like:
 * - /path/to/file.log:123
 * - C:\path\to\file.log:123
 * - file.log:123:45
 */
export class ConsoleLinksProvider implements vscode.DocumentLinkProvider {
    // Regex to match file paths with line numbers
    // Matches: /path/to/file:123 or C:\path\to\file:123 or file.log:123:45
    private readonly fileLinkPattern =
        /(?:[a-zA-Z]:[\\\/]|\/)?[\w\-\.\/\\]+\.(?:log|txt|out|json|xml|csv):\d+(?::\d+)?/g;

    provideDocumentLinks(
        document: vscode.TextDocument,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const text = document.getText();

        let match: RegExpExecArray | null;
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
            let targetUri: vscode.Uri;
            try {
                // Try to resolve the file path
                if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
                    // Absolute path
                    targetUri = vscode.Uri.file(filePath);
                } else {
                    // Try workspace-relative path
                    const workspaceFolder =
                        vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        targetUri = vscode.Uri.joinPath(
                            workspaceFolder.uri,
                            filePath,
                        );
                    } else {
                        continue;
                    }
                }

                // Add fragment for line and column navigation
                const fragment =
                    column > 1 ? `L${lineNum}:${column}` : `L${lineNum}`;
                const linkUri = targetUri.with({ fragment });

                const link = new vscode.DocumentLink(range, linkUri);
                link.tooltip = `Open ${filePath} at line ${lineNum}${column > 1 ? `, column ${column}` : ""}`;
                links.push(link);
            } catch (error) {
                // Skip invalid URIs
                continue;
            }
        }

        return links;
    }

    resolveDocumentLink(
        link: vscode.DocumentLink,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.DocumentLink> {
        // Already resolved in provideDocumentLinks
        return link;
    }
}

/**
 * Custom command to handle clicking on file links in console output.
 * This provides better control over how files are opened.
 */
export function registerConsoleNavigationCommand(
    context: vscode.ExtensionContext,
): void {
    const command = vscode.commands.registerCommand(
        "logScoutAnalyzer.navigateToFileLine",
        async (filePath: string, line: number, column?: number) => {
            try {
                // Resolve file URI
                let fileUri: vscode.Uri;
                if (filePath.startsWith("/") || /^[a-zA-Z]:/.test(filePath)) {
                    fileUri = vscode.Uri.file(filePath);
                } else {
                    const workspaceFolder =
                        vscode.workspace.workspaceFolders?.[0];
                    if (!workspaceFolder) {
                        vscode.window.showErrorMessage(
                            "No workspace folder open",
                        );
                        return;
                    }
                    fileUri = vscode.Uri.joinPath(
                        workspaceFolder.uri,
                        filePath,
                    );
                }

                // Open document
                const document =
                    await vscode.workspace.openTextDocument(fileUri);

                // Find the current active column
                const activeColumn =
                    vscode.window.activeTextEditor?.viewColumn ||
                    vscode.ViewColumn.One;

                // Show document in editor
                const editor = await vscode.window.showTextDocument(document, {
                    viewColumn: activeColumn,
                    preserveFocus: false,
                    preview: false,
                });

                // Navigate to line and column
                const position = new vscode.Position(
                    line - 1,
                    (column || 1) - 1,
                );
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport,
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${error}`);
            }
        },
    );

    context.subscriptions.push(command);
}
