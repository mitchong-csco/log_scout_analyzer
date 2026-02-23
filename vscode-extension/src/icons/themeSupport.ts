/**
 * Theme Support for VSCode Extension
 *
 * Provides utilities for handling VSCode theme changes and ensuring
 * webview content adapts to light/dark/high-contrast themes.
 *
 * Usage:
 * ```typescript
 * // In extension.ts
 * ThemeManager.initialize(context);
 *
 * // In webview
 * const html = ThemeManager.getWebviewHTML(content, { includeThemeHandler: true });
 * ```
 */

import * as vscode from 'vscode';
import { WebviewIcons } from './webviewIcons';

/**
 * VSCode theme kind detection
 */
export enum ThemeKind {
    Light = 'light',
    Dark = 'dark',
    HighContrast = 'high-contrast',
    HighContrastLight = 'high-contrast-light',
}

/**
 * Theme-aware color palette
 */
export interface ThemePalette {
    // Status colors
    error: string;
    warning: string;
    info: string;
    success: string;

    // UI colors
    background: string;
    foreground: string;
    border: string;

    // Interactive colors
    buttonBackground: string;
    buttonForeground: string;
    buttonHoverBackground: string;

    // Editor colors
    editorBackground: string;
    editorForeground: string;

    // List/Tree colors
    listActiveBackground: string;
    listHoverBackground: string;
    listFocusBackground: string;
}

/**
 * Theme Manager - Central theme coordination
 */
export class ThemeManager {
    private static _currentTheme: ThemeKind = ThemeKind.Dark;
    private static _onThemeChangeEmitter = new vscode.EventEmitter<ThemeKind>();
    private static _activeWebviews = new Set<vscode.Webview>();

    /**
     * Initialize theme manager (call from extension activation)
     */
    static initialize(context: vscode.ExtensionContext): void {
        this._currentTheme = this.detectTheme();

        // Listen for theme changes
        context.subscriptions.push(
            vscode.window.onDidChangeActiveColorTheme(() => {
                const newTheme = this.detectTheme();
                if (newTheme !== this._currentTheme) {
                    this._currentTheme = newTheme;
                    this._onThemeChangeEmitter.fire(newTheme);
                    this.notifyWebviews(newTheme);
                }
            })
        );
    }

    /**
     * Detect current theme kind
     */
    static detectTheme(): ThemeKind {
        const theme = vscode.window.activeColorTheme;

        switch (theme.kind) {
            case vscode.ColorThemeKind.Light:
                return ThemeKind.Light;
            case vscode.ColorThemeKind.Dark:
                return ThemeKind.Dark;
            case vscode.ColorThemeKind.HighContrast:
                return ThemeKind.HighContrast;
            case vscode.ColorThemeKind.HighContrastLight:
                return ThemeKind.HighContrastLight;
            default:
                return ThemeKind.Dark;
        }
    }

    /**
     * Get current theme
     */
    static getCurrentTheme(): ThemeKind {
        return this._currentTheme;
    }

    /**
     * Check if current theme is dark
     */
    static isDark(): boolean {
        return this._currentTheme === ThemeKind.Dark ||
               this._currentTheme === ThemeKind.HighContrast;
    }

    /**
     * Check if current theme is light
     */
    static isLight(): boolean {
        return this._currentTheme === ThemeKind.Light ||
               this._currentTheme === ThemeKind.HighContrastLight;
    }

    /**
     * Check if current theme is high contrast
     */
    static isHighContrast(): boolean {
        return this._currentTheme === ThemeKind.HighContrast ||
               this._currentTheme === ThemeKind.HighContrastLight;
    }

    /**
     * Register a webview for theme updates
     */
    static registerWebview(webview: vscode.Webview): vscode.Disposable {
        this._activeWebviews.add(webview);

        return new vscode.Disposable(() => {
            this._activeWebviews.delete(webview);
        });
    }

    /**
     * Notify all registered webviews of theme change
     */
    private static notifyWebviews(theme: ThemeKind): void {
        const message = {
            command: 'themeChanged',
            theme,
            isDark: this.isDark(),
            isLight: this.isLight(),
            isHighContrast: this.isHighContrast(),
        };

        this._activeWebviews.forEach(webview => {
            webview.postMessage(message);
        });
    }

    /**
     * Event fired when theme changes
     */
    static get onDidChangeTheme(): vscode.Event<ThemeKind> {
        return this._onThemeChangeEmitter.event;
    }

    /**
     * Get theme-appropriate color palette
     */
    static getPalette(): ThemePalette {
        // Use VSCode CSS variables - they automatically adapt to theme
        return {
            error: 'var(--vscode-errorForeground, #f44336)',
            warning: 'var(--vscode-editorWarning-foreground, #ff9800)',
            info: 'var(--vscode-editorInfo-foreground, #2196f3)',
            success: 'var(--vscode-testing-iconPassed, #4caf50)',

            background: 'var(--vscode-editor-background)',
            foreground: 'var(--vscode-editor-foreground)',
            border: 'var(--vscode-panel-border)',

            buttonBackground: 'var(--vscode-button-background)',
            buttonForeground: 'var(--vscode-button-foreground)',
            buttonHoverBackground: 'var(--vscode-button-hoverBackground)',

            editorBackground: 'var(--vscode-editor-background)',
            editorForeground: 'var(--vscode-editor-foreground)',

            listActiveBackground: 'var(--vscode-list-activeSelectionBackground)',
            listHoverBackground: 'var(--vscode-list-hoverBackground)',
            listFocusBackground: 'var(--vscode-list-focusBackground)',
        };
    }

    /**
     * Get complete CSS with theme support
     * This CSS automatically adapts to theme changes
     */
    static getThemeAwareCSS(): string {
        return `
            /* ==============================================
               THEME-AWARE BASE STYLES
               Uses VSCode CSS variables that auto-update
               ============================================== */

            :root {
                /* Color palette - automatically theme-aware */
                --color-error: var(--vscode-errorForeground, #f44336);
                --color-warning: var(--vscode-editorWarning-foreground, #ff9800);
                --color-info: var(--vscode-editorInfo-foreground, #2196f3);
                --color-success: var(--vscode-testing-iconPassed, #4caf50);

                /* Background colors */
                --bg-primary: var(--vscode-editor-background);
                --bg-secondary: var(--vscode-editorWidget-background);
                --bg-tertiary: var(--vscode-sideBar-background);
                --bg-hover: var(--vscode-list-hoverBackground);
                --bg-active: var(--vscode-list-activeSelectionBackground);

                /* Foreground colors */
                --fg-primary: var(--vscode-editor-foreground);
                --fg-secondary: var(--vscode-descriptionForeground);
                --fg-muted: var(--vscode-disabledForeground);

                /* Border colors */
                --border-color: var(--vscode-panel-border);
                --border-focus: var(--vscode-focusBorder);

                /* Button colors */
                --btn-bg: var(--vscode-button-background);
                --btn-fg: var(--vscode-button-foreground);
                --btn-hover-bg: var(--vscode-button-hoverBackground);
                --btn-secondary-bg: var(--vscode-button-secondaryBackground);
                --btn-secondary-fg: var(--vscode-button-secondaryForeground);

                /* Input colors */
                --input-bg: var(--vscode-input-background);
                --input-fg: var(--vscode-input-foreground);
                --input-border: var(--vscode-input-border);

                /* Spacing */
                --spacing-xs: 4px;
                --spacing-sm: 8px;
                --spacing-md: 12px;
                --spacing-lg: 16px;
                --spacing-xl: 24px;

                /* Border radius */
                --radius-sm: 2px;
                --radius-md: 4px;
                --radius-lg: 6px;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                font-weight: var(--vscode-font-weight);
                color: var(--fg-primary);
                background-color: var(--bg-primary);
                line-height: 1.6;
                overflow-x: hidden;
            }

            /* ==============================================
               TYPOGRAPHY
               ============================================== */

            h1, h2, h3, h4, h5, h6 {
                font-weight: 600;
                line-height: 1.3;
                margin-bottom: var(--spacing-md);
            }

            h1 { font-size: 1.5em; }
            h2 { font-size: 1.3em; }
            h3 { font-size: 1.1em; }

            p {
                margin-bottom: var(--spacing-sm);
            }

            a {
                color: var(--vscode-textLink-foreground);
                text-decoration: none;
            }

            a:hover {
                color: var(--vscode-textLink-activeForeground);
                text-decoration: underline;
            }

            code {
                font-family: var(--vscode-editor-font-family);
                background-color: var(--vscode-textCodeBlock-background);
                padding: 2px 4px;
                border-radius: var(--radius-sm);
                font-size: 0.9em;
            }

            /* ==============================================
               BUTTONS - Theme aware
               ============================================== */

            .btn {
                background-color: var(--btn-bg);
                color: var(--btn-fg);
                border: none;
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: var(--radius-md);
                cursor: pointer;
                font-size: inherit;
                font-family: inherit;
                transition: background-color 0.2s;
            }

            .btn:hover:not(:disabled) {
                background-color: var(--btn-hover-bg);
            }

            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .btn-secondary {
                background-color: var(--btn-secondary-bg);
                color: var(--btn-secondary-fg);
            }

            .btn-secondary:hover:not(:disabled) {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }

            .btn-icon {
                background: transparent;
                padding: var(--spacing-xs);
                border-radius: var(--radius-sm);
            }

            .btn-icon:hover:not(:disabled) {
                background-color: var(--bg-hover);
            }

            /* Status-specific buttons */
            .btn-danger {
                background-color: var(--color-error);
                color: white;
            }

            .btn-success {
                background-color: var(--color-success);
                color: white;
            }

            /* ==============================================
               INPUTS - Theme aware
               ============================================== */

            input[type="text"],
            input[type="search"],
            input[type="number"],
            textarea,
            select {
                background-color: var(--input-bg);
                color: var(--input-fg);
                border: 1px solid var(--input-border);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--radius-sm);
                font-family: inherit;
                font-size: inherit;
            }

            input:focus,
            textarea:focus,
            select:focus {
                outline: 1px solid var(--border-focus);
                outline-offset: -1px;
            }

            /* ==============================================
               STATUS INDICATORS
               ============================================== */

            .status-error {
                color: var(--color-error);
            }

            .status-warning {
                color: var(--color-warning);
            }

            .status-info {
                color: var(--color-info);
            }

            .status-success {
                color: var(--color-success);
            }

            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: var(--spacing-xs);
                padding: 2px var(--spacing-sm);
                border-radius: var(--radius-md);
                font-size: 0.85em;
                font-weight: 500;
            }

            .status-badge.error {
                background-color: var(--vscode-inputValidation-errorBackground);
                color: var(--color-error);
                border: 1px solid var(--color-error);
            }

            .status-badge.warning {
                background-color: var(--vscode-inputValidation-warningBackground);
                color: var(--color-warning);
                border: 1px solid var(--color-warning);
            }

            .status-badge.info {
                background-color: var(--vscode-inputValidation-infoBackground);
                color: var(--color-info);
                border: 1px solid var(--color-info);
            }

            .status-badge.success {
                background-color: rgba(76, 175, 80, 0.1);
                color: var(--color-success);
                border: 1px solid var(--color-success);
            }

            /* ==============================================
               LISTS & TABLES
               ============================================== */

            .list-item {
                padding: var(--spacing-sm) var(--spacing-md);
                border-bottom: 1px solid var(--border-color);
                transition: background-color 0.15s;
            }

            .list-item:hover {
                background-color: var(--bg-hover);
            }

            .list-item.active {
                background-color: var(--bg-active);
            }

            table {
                width: 100%;
                border-collapse: collapse;
            }

            th, td {
                padding: var(--spacing-sm);
                text-align: left;
                border-bottom: 1px solid var(--border-color);
            }

            th {
                font-weight: 600;
                background-color: var(--bg-secondary);
            }

            tr:hover {
                background-color: var(--bg-hover);
            }

            /* ==============================================
               SCROLLBARS - Theme aware
               ============================================== */

            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            ::-webkit-scrollbar-track {
                background: var(--vscode-scrollbarSlider-background);
            }

            ::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-hoverBackground);
                border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--vscode-scrollbarSlider-activeBackground);
            }

            /* ==============================================
               UTILITIES
               ============================================== */

            .text-muted {
                color: var(--fg-secondary);
            }

            .text-error { color: var(--color-error); }
            .text-warning { color: var(--color-warning); }
            .text-info { color: var(--color-info); }
            .text-success { color: var(--color-success); }

            .bg-error { background-color: var(--vscode-inputValidation-errorBackground); }
            .bg-warning { background-color: var(--vscode-inputValidation-warningBackground); }
            .bg-info { background-color: var(--vscode-inputValidation-infoBackground); }

            .border {
                border: 1px solid var(--border-color);
            }

            .rounded { border-radius: var(--radius-md); }
            .rounded-sm { border-radius: var(--radius-sm); }
            .rounded-lg { border-radius: var(--radius-lg); }

            /* Spacing utilities */
            .p-0 { padding: 0; }
            .p-xs { padding: var(--spacing-xs); }
            .p-sm { padding: var(--spacing-sm); }
            .p-md { padding: var(--spacing-md); }
            .p-lg { padding: var(--spacing-lg); }

            .m-0 { margin: 0; }
            .m-xs { margin: var(--spacing-xs); }
            .m-sm { margin: var(--spacing-sm); }
            .m-md { margin: var(--spacing-md); }
            .m-lg { margin: var(--spacing-lg); }

            /* Display utilities */
            .flex { display: flex; }
            .inline-flex { display: inline-flex; }
            .grid { display: grid; }
            .block { display: block; }
            .inline-block { display: inline-block; }
            .hidden { display: none; }

            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .items-end { align-items: flex-end; }

            .justify-center { justify-content: center; }
            .justify-between { justify-content: space-between; }
            .justify-start { justify-content: flex-start; }
            .justify-end { justify-content: flex-end; }

            .gap-xs { gap: var(--spacing-xs); }
            .gap-sm { gap: var(--spacing-sm); }
            .gap-md { gap: var(--spacing-md); }
            .gap-lg { gap: var(--spacing-lg); }

            ${WebviewIcons.getStyles()}
        `;
    }

    /**
     * Get JavaScript for handling theme changes in webview
     */
    static getThemeHandlerScript(): string {
        return `
            <script>
                (function() {
                    // Listen for theme changes from extension
                    window.addEventListener('message', event => {
                        const message = event.data;

                        if (message.command === 'themeChanged') {
                            handleThemeChange(message);
                        }
                    });

                    function handleThemeChange(themeInfo) {
                        // Update data attributes for CSS targeting
                        document.documentElement.setAttribute('data-vscode-theme', themeInfo.theme);
                        document.documentElement.setAttribute('data-theme-kind',
                            themeInfo.isDark ? 'dark' : 'light');

                        if (themeInfo.isHighContrast) {
                            document.documentElement.setAttribute('data-high-contrast', 'true');
                        } else {
                            document.documentElement.removeAttribute('data-high-contrast');
                        }

                        // Fire custom event for app-specific theme handling
                        const event = new CustomEvent('vscode-theme-changed', {
                            detail: themeInfo
                        });
                        window.dispatchEvent(event);

                        console.log('Theme changed:', themeInfo.theme);
                    }

                    // Initial theme detection
                    const isDark = document.body.classList.contains('vscode-dark') ||
                                   document.body.classList.contains('vscode-high-contrast');
                    handleThemeChange({
                        theme: isDark ? 'dark' : 'light',
                        isDark: isDark,
                        isLight: !isDark,
                        isHighContrast: document.body.classList.contains('vscode-high-contrast')
                    });
                })();
            </script>
        `;
    }

    /**
     * Generate complete theme-aware webview HTML
     */
    static getWebviewHTML(
        content: string,
        options: {
            title?: string;
            includeThemeHandler?: boolean;
            additionalCSS?: string;
            additionalScripts?: string;
        } = {}
    ): string {
        const {
            title = 'Log Scout Analyzer',
            includeThemeHandler = true,
            additionalCSS = '',
            additionalScripts = '',
        } = options;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>${title}</title>
    <style>
        ${this.getThemeAwareCSS()}
        ${additionalCSS}
    </style>
</head>
<body>
    ${content}
    ${includeThemeHandler ? this.getThemeHandlerScript() : ''}
    ${additionalScripts}
</body>
</html>`;
    }
}

/**
 * Decorator for TreeView items that need theme-aware colors
 */
export class ThemeAwareTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState?: vscode.TreeItemCollapsibleState,
        themeOptions?: {
            lightColor?: string;
            darkColor?: string;
            lightIcon?: vscode.ThemeIcon;
            darkIcon?: vscode.ThemeIcon;
        }
    ) {
        super(label, collapsibleState);

        if (themeOptions) {
            const isDark = ThemeManager.isDark();

            if (themeOptions.darkColor && themeOptions.lightColor) {
                this.iconPath = new vscode.ThemeIcon(
                    'circle-filled',
                    new vscode.ThemeColor(
                        isDark ? themeOptions.darkColor : themeOptions.lightColor
                    )
                );
            }

            if (themeOptions.darkIcon && themeOptions.lightIcon) {
                this.iconPath = isDark ? themeOptions.darkIcon : themeOptions.lightIcon;
            }
        }
    }
}

/**
 * Helper to get status color based on current theme
 */
export function getStatusColor(
    status: 'error' | 'warning' | 'info' | 'success'
): vscode.ThemeColor {
    const colorMap = {
        error: 'errorForeground',
        warning: 'editorWarning.foreground',
        info: 'editorInfo.foreground',
        success: 'testing.iconPassed',
    };

    return new vscode.ThemeColor(colorMap[status]);
}
