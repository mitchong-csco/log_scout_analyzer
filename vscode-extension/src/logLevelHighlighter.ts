import * as vscode from "vscode";

/**
 * LogLevelHighlighter - Highlights log level keywords (ERROR, WARN, INFO, etc.) in log files
 * Works alongside GutterDecorator to provide visual distinction between severity and log level
 */
export class LogLevelHighlighter {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();
    private pendingUpdates: Map<string, { editor: vscode.TextEditor; document: vscode.TextDocument; annotations: Array<{ line: number; context?: string }> }> = new Map();
    private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly throttleDelay = 50; // ms

  constructor() {
    this.createDecorationTypes();
  }

  /**
   * Create decoration types for each log level with appropriate styling
   */
  private createDecorationTypes(): void {
    const logLevels = [
      { name: "fatal", color: "#ff4d4f", opacity: 0.7, weight: "600" },
      { name: "error", color: "#ff4d4f", opacity: 0.6, weight: "500" },
      { name: "warn", color: "#ffa500", opacity: 0.6, weight: "500" },
      { name: "info", color: "#0066ff", opacity: 0.6, weight: "500" },
      { name: "debug", color: "#52c41a", opacity: 0.6, weight: "500" },
      { name: "trace", color: "#6c757d", opacity: 0.6, weight: "500" },
      { name: "verbose", color: "#9ca3af", opacity: 0.5, weight: "400" },
    ];

    for (const level of logLevels) {
      const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: this.rgbaToString(level.color, level.opacity),
        border: `1px solid ${level.color}`,
        borderRadius: "2px",
        fontWeight: level.weight,
        isWholeLine: false,
      });

      this.decorationTypes.set(level.name, decorationType);
    }
  }

  /**
   * Convert hex color to rgba string
   */
  private rgbaToString(hexColor: string, opacity: number): string {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Find log level keyword in a line and return its position
   */
  public findLogLevel(line: string): {
    level: string;
    startPos: number;
    endPos: number;
  } | null {
    // Patterns ordered by priority
    const patterns = [
      { regex: /\b(FATAL|CRITICAL|CRIT)\b/i, level: "fatal" },
      { regex: /\bERROR\b/i, level: "error" },
      { regex: /\b(WARN|WARNING)\b/i, level: "warn" },
      { regex: /\bINFO\b/i, level: "info" },
      { regex: /\bDEBUG\b/i, level: "debug" },
      { regex: /\bTRACE\b/i, level: "trace" },
      { regex: /\bVERBOSE\b/i, level: "verbose" },
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match && match.index !== undefined) {
        return {
          level: pattern.level,
          startPos: match.index,
          endPos: match.index + match[0].length,
        };
      }
    }

    return null;
  }

  /**
   * Apply highlights to the editor for all annotated lines (throttled to prevent rate limiting)
   */
  public applyHighlights(
    editor: vscode.TextEditor,
    document: vscode.TextDocument,
    annotations: Array<{ line: number; context?: string }>,
  ): void {
    const uri = editor.document.uri.toString();

    // Store pending update
    this.pendingUpdates.set(uri, { editor, document, annotations });

    // Clear existing timeout for this document
    const existingTimeout = this.updateTimeouts.get(uri);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Throttle the actual highlight application
    const timeout = setTimeout(() => {
      this.applyHighlightsInternal(uri);
      this.updateTimeouts.delete(uri);
      this.pendingUpdates.delete(uri);
    }, this.throttleDelay);

    this.updateTimeouts.set(uri, timeout);
  }

  /**
   * Apply highlights immediately (internal method)
   */
  private applyHighlightsInternal(uri: string): void {
    const pending = this.pendingUpdates.get(uri);
    if (!pending) {
      return;
    }

    const { editor, document, annotations } = pending;

    // Group ranges by log level for efficient decoration
    const highlightsByLevel: Map<string, vscode.Range[]> = new Map();

    for (const annotation of annotations) {
      try {
        const line = document.lineAt(annotation.line);
        const logLevelInfo = this.findLogLevel(line.text);

        if (logLevelInfo) {
          const ranges = highlightsByLevel.get(logLevelInfo.level) || [];
          ranges.push(
            new vscode.Range(
              annotation.line,
              logLevelInfo.startPos,
              annotation.line,
              logLevelInfo.endPos,
            ),
          );
          highlightsByLevel.set(logLevelInfo.level, ranges);
        }
      } catch (error) {
        // Skip invalid line numbers
        console.error(`Error processing line ${annotation.line}:`, error);
      }
    }

    // Apply decorations for each log level
    for (const [level, ranges] of highlightsByLevel.entries()) {
      const decorationType = this.decorationTypes.get(level);
      if (decorationType && ranges.length > 0) {
        editor.setDecorations(decorationType, ranges);
      }
    }

    // Clear decorations for levels that have no matches
    for (const [level, decorationType] of this.decorationTypes.entries()) {
      if (!highlightsByLevel.has(level)) {
        editor.setDecorations(decorationType, []);
      }
    }
  }

    /**
     * Clear all highlights from the editor
     */
    public clearHighlights(editor: vscode.TextEditor): void {
        for (const decorationType of this.decorationTypes.values()) {
            editor.setDecorations(decorationType, []);
        }
    }

    /**
     * Dispose all decoration types
     */
    public dispose(): void {
        for (const decorationType of this.decorationTypes.values()) {
            decorationType.dispose();
        }
        this.decorationTypes.clear();
    }
}
