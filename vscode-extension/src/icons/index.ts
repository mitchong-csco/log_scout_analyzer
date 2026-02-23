/**
 * Icon and Theme System
 *
 * Provides a unified icon and theme system for VSCode extension.
 * Supports both native VSCode UI (TreeViews, commands) and webview panels.
 *
 * @example
 * ```typescript
 * // Initialize in extension.ts
 * import { ThemeManager } from './icons';
 * ThemeManager.initialize(context);
 *
 * // Use in TreeProvider
 * import { Icons } from './icons';
 * treeItem.iconPath = Icons.codicon('error');
 *
 * // Use in Webview
 * import { WebviewIcons, ThemeManager } from './icons';
 * const html = ThemeManager.getWebviewHTML(`
 *   <div class="toolbar">
 *     ${WebviewIcons.button('refresh', 'refresh-data', { title: 'Refresh' })}
 *   </div>
 * `, { includeThemeHandler: true });
 * ```
 *
 * @module icons
 */

// ============================================================================
// ICON REGISTRY
// ============================================================================

export {
    Icons,
    IconRegistry,
    IconName,
    isValidIconName,
} from './iconRegistry';

// ============================================================================
// WEBVIEW ICONS
// ============================================================================

export {
    WebviewIcons,
    Icon,
    IconOptions,
} from './webviewIcons';

// ============================================================================
// THEME SUPPORT
// ============================================================================

export {
    ThemeManager,
    ThemeKind,
    ThemePalette,
    ThemeAwareTreeItem,
    getStatusColor,
} from './themeSupport';

// ============================================================================
// TYPE EXPORTS (Re-exported from individual modules above)
// ============================================================================

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick access to commonly used functions
 */
export { Icons as icon } from './iconRegistry';
export { WebviewIcons as webIcon } from './webviewIcons';
export { ThemeManager as theme } from './themeSupport';

// ============================================================================
// VERSION
// ============================================================================

export const ICON_SYSTEM_VERSION = '1.0.0';

/**
 * Get system information
 */
export function getIconSystemInfo(): {
    version: string;
    iconCount: number;
    supportedThemes: string[];
} {
    const { Icons: IconsClass } = require('./iconRegistry');
    return {
        version: ICON_SYSTEM_VERSION,
        iconCount: IconsClass.getAllNames().length,
        supportedThemes: ['light', 'dark', 'high-contrast', 'high-contrast-light'],
    };
}
