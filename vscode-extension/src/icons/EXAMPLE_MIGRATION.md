# Example: Migrating ConsoleWebview to Theme-Aware System

## 🎯 Goal

Update `consoleWebview.ts` to use the new icon and theme system for seamless theme adaptation.

---

## 📋 Step-by-Step Migration

### Step 1: Add Imports

```typescript
// At the top of consoleWebview.ts
import * as vscode from "vscode";
import { ThemeManager } from "./icons/themeSupport";
import { WebviewIcons, Icon } from "./icons/webviewIcons";
import { Icons } from "./icons/iconRegistry";
```

---

### Step 2: Register Webview for Theme Updates

```typescript
export class ConsoleWebview {
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _messages: ConsoleMessage[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

        // ✅ NEW: Register for theme updates
        this._disposables.push(
            ThemeManager.registerWebview(this._panel.webview)
        );

        // ✅ NEW: Listen for theme changes and refresh
        this._disposables.push(
            ThemeManager.onDidChangeTheme(() => {
                this._update();
            })
        );

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case "navigate":
                        this._navigateToLine(message.file, message.line);
                        return;
                    case "filter":
                        this._filterMessages(message.severity);
                        return;
                    case "clear":
                        this.clear();
                        return;
                    case "export":
                        this._exportConsole();
                        return;
                }
            },
            null,
            this._disposables,
        );
    }

    // ... rest of the class
}
```

---

### Step 3: Update HTML Generation (Option A - Full Replacement)

**Replace `_getHtmlForWebview()` with theme-aware version:**

```typescript
private _getHtmlForWebview(_webview: vscode.Webview): string {
    const content = `
        <!-- Toolbar -->
        <div class="toolbar">
            ${WebviewIcons.toolbar([
                { icon: 'filter', command: 'filter-error', title: 'Show Errors' },
                { icon: 'warning', command: 'filter-warning', title: 'Show Warnings' },
                { icon: 'info', command: 'filter-info', title: 'Show Info' },
                { separator: true },
                { icon: 'refresh', command: 'clear', title: 'Clear Console' },
                { icon: 'export', command: 'export', title: 'Export Console' },
            ])}
        </div>

        <!-- Messages Container -->
        <div class="console-container">
            ${this._messages.map((msg, index) => this._getMessageHtml(msg, index)).join('')}
        </div>

        <!-- Scripts -->
        <script>
            const vscode = acquireVsCodeApi();

            // Handle toolbar button clicks
            document.querySelectorAll('[data-command]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const command = e.currentTarget.getAttribute('data-command');
                    vscode.postMessage({ command: command });
                });
            });

            // Handle message navigation
            document.querySelectorAll('.message-content').forEach(msg => {
                msg.addEventListener('click', (e) => {
                    const file = e.currentTarget.getAttribute('data-file');
                    const line = e.currentTarget.getAttribute('data-line');
                    if (file && line) {
                        vscode.postMessage({
                            command: 'navigate',
                            file: file,
                            line: parseInt(line)
                        });
                    }
                });
            });

            // Listen for theme changes
            window.addEventListener('vscode-theme-changed', (e) => {
                console.log('Console webview theme changed:', e.detail);
                // Add custom theme-specific logic here if needed
            });
        </script>
    `;

    return ThemeManager.getWebviewHTML(content, {
        title: 'Scout Console',
        includeThemeHandler: true,
        additionalCSS: `
            /* Custom console styles */
            .console-container {
                padding: 0;
            }

            .console-message {
                display: flex;
                border-bottom: 1px solid var(--border-color);
                transition: background-color 0.1s;
            }

            .console-message:hover {
                background-color: var(--bg-hover);
            }

            .console-message.hidden {
                display: none;
            }

            .message-bar {
                width: 4px;
                flex-shrink: 0;
            }

            .message-bar.error {
                background-color: var(--color-error);
            }

            .message-bar.warning {
                background-color: var(--color-warning);
            }

            .message-bar.info {
                background-color: var(--color-info);
            }

            .message-content {
                flex: 1;
                padding: var(--spacing-sm) var(--spacing-md);
                min-width: 0;
                cursor: pointer;
            }

            .message-header {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                margin-bottom: 4px;
            }

            .message-timestamp {
                color: var(--fg-secondary);
                font-size: 0.9em;
            }

            .message-severity {
                font-weight: 600;
                text-transform: uppercase;
                font-size: 0.85em;
            }

            .message-severity.error { color: var(--color-error); }
            .message-severity.warning { color: var(--color-warning); }
            .message-severity.info { color: var(--color-info); }

            .message-text {
                color: var(--fg-primary);
                word-break: break-word;
            }

            .message-details {
                color: var(--fg-secondary);
                font-size: 0.9em;
                margin-top: 4px;
            }

            .message-location {
                color: var(--vscode-textLink-foreground);
                font-size: 0.9em;
                margin-top: 4px;
            }

            .message-location:hover {
                text-decoration: underline;
            }
        `,
    });
}
```

---

### Step 4: Update Message HTML with Icons

```typescript
private _getMessageHtml(msg: ConsoleMessage, index: number): string {
    const timestamp = msg.timestamp instanceof Date 
        ? msg.timestamp 
        : new Date(msg.timestamp);
    const time = timestamp.toLocaleTimeString();

    // Get icon based on severity
    const icon = WebviewIcons.status(
        msg.severity as 'error' | 'warning' | 'info',
        { size: 16 }
    );

    const locationHtml = msg.file && msg.line !== undefined
        ? `<div class="message-location" data-file="${msg.file}" data-line="${msg.line}">
               ${Icon.svg('fileCode', { size: 14 })}
               Line ${msg.line + 1}
           </div>`
        : '';

    return `
        <div class="console-message" data-severity="${msg.severity}" data-index="${index}">
            <div class="message-bar ${msg.severity}"></div>
            <div class="message-content" 
                 ${msg.file ? `data-file="${msg.file}"` : ''} 
                 ${msg.line !== undefined ? `data-line="${msg.line}"` : ''}>
                <div class="message-header">
                    ${icon}
                    <span class="message-timestamp">${time}</span>
                    <span class="message-severity ${msg.severity}">${msg.severity}</span>
                    ${msg.category ? `<span class="message-category">[${msg.category}]</span>` : ''}
                </div>
                <div class="message-text">${this._escapeHtml(msg.message)}</div>
                ${msg.details ? `<div class="message-details">${this._escapeHtml(msg.details)}</div>` : ''}
                ${locationHtml}
            </div>
        </div>
    `;
}

private _escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

---

### Step 5: Update Public Logging Methods

```typescript
public logAnalysisStart(fileName: string, fileUri?: vscode.Uri): void {
    this._messages.push({
        type: "header",
        severity: "info",
        timestamp: new Date(),
        message: `Analysis Started`,
        details: `File: ${fileName}`,
        file: fileUri?.fsPath,
        collapsible: false,
    });
    this._update();
}

public logAnalysisComplete(
    errorCount: number,
    warningCount: number,
    infoCount: number,
    duration: number,
): void {
    const total = errorCount + warningCount + infoCount;
    
    // Create summary with badges
    const summaryDetails = `
        Duration: ${duration}ms | 
        ${WebviewIcons.badge('error', errorCount)} Errors | 
        ${WebviewIcons.badge('warning', warningCount)} Warnings | 
        ${WebviewIcons.badge('info', infoCount)} Info
    `;

    this._messages.push({
        type: "summary",
        severity: "info",
        timestamp: new Date(),
        message: `Analysis Complete - ${total} items found`,
        details: summaryDetails,
        collapsible: false,
    });
    this._update();
}

public logError(
    message: string,
    details?: string,
    file?: string,
    line?: number,
    category?: string,
): void {
    this._messages.push({
        type: "error",
        severity: "error",
        timestamp: new Date(),
        message,
        details,
        file,
        line,
        category,
        collapsible: false,
    });
    this._update();
}

public logWarning(
    message: string,
    details?: string,
    file?: string,
    line?: number,
    category?: string,
): void {
    this._messages.push({
        type: "warning",
        severity: "warning",
        timestamp: new Date(),
        message,
        details,
        file,
        line,
        category,
        collapsible: false,
    });
    this._update();
}

public logInfo(
    message: string,
    details?: string,
    file?: string,
    line?: number,
): void {
    this._messages.push({
        type: "info",
        severity: "info",
        timestamp: new Date(),
        message,
        details,
        file,
        line,
        collapsible: false,
    });
    this._update();
}
```

---

## 🎨 Before & After Comparison

### Before (Hardcoded Colors)

```typescript
// ❌ Old approach - breaks on theme change
const html = `
<style>
    body {
        color: #333;
        background: #fff;
    }
    .error {
        color: #f44336;
    }
    .warning {
        color: #ff9800;
    }
</style>
<div class="toolbar">
    <button onclick="filter('error')">🔴 Errors</button>
    <button onclick="filter('warning')">🟡 Warnings</button>
    <button onclick="clear()">🗑️ Clear</button>
</div>
`;
```

### After (Theme-Aware)

```typescript
// ✅ New approach - adapts automatically
const content = `
<div class="toolbar">
    ${WebviewIcons.button('error', 'filter-error', { title: 'Show Errors' })}
    ${WebviewIcons.button('warning', 'filter-warning', { title: 'Show Warnings' })}
    ${WebviewIcons.button('trash', 'clear', { title: 'Clear' })}
</div>
`;

return ThemeManager.getWebviewHTML(content, {
    includeThemeHandler: true
});
```

**Result:**
- ✅ Automatically adapts to light/dark/high-contrast themes
- ✅ Icons use proper SVG instead of emoji
- ✅ Colors use VSCode theme variables
- ✅ Consistent with VSCode UI

---

## 🧪 Testing the Migration

### Manual Test

1. Open the console webview
2. Switch themes: `Ctrl+K Ctrl+T`
3. Verify:
   - [ ] Toolbar icons visible in all themes
   - [ ] Status icons (error/warning/info) have correct colors
   - [ ] Text is readable in all themes
   - [ ] Hover states work
   - [ ] Buttons are clickable

### Theme Checklist

| Theme | Background | Text | Icons | Borders | Status Colors |
|-------|------------|------|-------|---------|---------------|
| Light | ✅ White | ✅ Black | ✅ Visible | ✅ Gray | ✅ Distinct |
| Dark | ✅ Dark | ✅ Light | ✅ Visible | ✅ Subtle | ✅ Distinct |
| High Contrast | ✅ Black | ✅ White | ✅ Clear | ✅ Bold | ✅ Strong |

---

## 🎯 Migration Benefits

### Before Migration
- ❌ Hardcoded colors break on theme change
- ❌ Emoji icons look inconsistent
- ❌ Manual HTML/CSS maintenance
- ❌ Poor high-contrast support
- ❌ Webview doesn't update on theme change

### After Migration
- ✅ Automatic theme adaptation
- ✅ Professional SVG icons
- ✅ Consistent with VSCode UI
- ✅ Excellent accessibility
- ✅ Real-time theme updates
- ✅ Maintainable icon system
- ✅ Type-safe icon names

---

## 📝 Summary

**Files Modified:**
- `consoleWebview.ts` - Updated to use theme system

**Key Changes:**
1. Import theme and icon utilities
2. Register webview with ThemeManager
3. Use `ThemeManager.getWebviewHTML()` for HTML generation
4. Replace hardcoded colors with CSS variables
5. Use `WebviewIcons` for all icons
6. Add theme change listener

**Result:**
- Seamless theme adaptation
- Professional appearance
- Better maintainability
- Improved accessibility

---

## 🚀 Next Steps

Apply the same pattern to other webviews:
- [ ] `scoutAnalyzerPanel.ts`
- [ ] `resultsPanel.ts`
- [ ] `patternViewerPanel.ts`
- [ ] `annotationDashboardPanel.ts`

Each follows the same 5-step process! 🎉