/**
 * Icon Registry for VSCode Extension
 *
 * Provides a unified icon system with:
 * 1. Codicons (VSCode native icons) for TreeViews, commands, etc.
 * 2. Lucide icons for webview panels (HTML content)
 * 3. Fallback support between icon sets
 *
 * Usage:
 * - For VSCode UI: IconRegistry.codicon('file')
 * - For Webviews: IconRegistry.lucide('file')
 * - For HTML: IconRegistry.html('file', { size: 20, className: 'icon-class' })
 */

import * as vscode from 'vscode';

/**
 * Icon definition with multiple representations
 */
interface IconDefinition {
    /** Codicon name (for VSCode native UI) */
    codicon: string;
    /** Lucide icon name (for webviews) */
    lucide: string;
    /** Alternative Codicon fallback */
    codiconFallback?: string;
    /** Description of the icon */
    description?: string;
}

/**
 * Icon registry mapping semantic names to actual icon implementations
 */
export const IconRegistry: Record<string, IconDefinition> = {
    // File & Document Icons
    file: {
        codicon: 'file',
        lucide: 'file-text',
        description: 'Generic file or document',
    },
    fileCode: {
        codicon: 'file-code',
        lucide: 'file-code',
        description: 'Code or log file',
    },
    fileZip: {
        codicon: 'file-zip',
        lucide: 'file-archive',
        description: 'Archive or zip file',
    },
    folder: {
        codicon: 'folder',
        lucide: 'folder',
        description: 'Folder or directory',
    },
    folderOpened: {
        codicon: 'folder-opened',
        lucide: 'folder-open',
        description: 'Opened folder',
    },

    // Status & Alert Icons
    error: {
        codicon: 'error',
        lucide: 'alert-circle',
        codiconFallback: 'alert',
        description: 'Error state',
    },
    warning: {
        codicon: 'warning',
        lucide: 'alert-triangle',
        codiconFallback: 'alert',
        description: 'Warning state',
    },
    info: {
        codicon: 'info',
        lucide: 'info',
        description: 'Information state',
    },
    success: {
        codicon: 'pass',
        lucide: 'check-circle',
        codiconFallback: 'check',
        description: 'Success state',
    },
    check: {
        codicon: 'check',
        lucide: 'check',
        description: 'Checkmark',
    },
    close: {
        codicon: 'close',
        lucide: 'x',
        description: 'Close or cancel',
    },

    // Action Icons
    search: {
        codicon: 'search',
        lucide: 'search',
        description: 'Search functionality',
    },
    filter: {
        codicon: 'filter',
        lucide: 'filter',
        description: 'Filter data',
    },
    refresh: {
        codicon: 'refresh',
        lucide: 'refresh-cw',
        description: 'Refresh or reload',
    },
    sync: {
        codicon: 'sync',
        lucide: 'refresh-cw',
        codiconFallback: 'refresh',
        description: 'Synchronize',
    },
    add: {
        codicon: 'add',
        lucide: 'plus',
        description: 'Add or create',
    },
    remove: {
        codicon: 'remove',
        lucide: 'minus',
        description: 'Remove or delete',
    },
    trash: {
        codicon: 'trash',
        lucide: 'trash-2',
        description: 'Delete permanently',
    },
    edit: {
        codicon: 'edit',
        lucide: 'edit',
        description: 'Edit content',
    },
    save: {
        codicon: 'save',
        lucide: 'save',
        description: 'Save changes',
    },
    download: {
        codicon: 'cloud-download',
        lucide: 'download',
        codiconFallback: 'download',
        description: 'Download or export',
    },
    upload: {
        codicon: 'cloud-upload',
        lucide: 'upload',
        codiconFallback: 'upload',
        description: 'Upload or import',
    },
    export: {
        codicon: 'export',
        lucide: 'download',
        description: 'Export data',
    },
    import: {
        codicon: 'repo-pull',
        lucide: 'upload',
        codiconFallback: 'arrow-down',
        description: 'Import data',
    },

    // Navigation Icons
    chevronRight: {
        codicon: 'chevron-right',
        lucide: 'chevron-right',
        description: 'Expand or next',
    },
    chevronDown: {
        codicon: 'chevron-down',
        lucide: 'chevron-down',
        description: 'Collapse or dropdown',
    },
    chevronUp: {
        codicon: 'chevron-up',
        lucide: 'chevron-up',
        description: 'Scroll up',
    },
    chevronLeft: {
        codicon: 'chevron-left',
        lucide: 'chevron-left',
        description: 'Back or previous',
    },
    arrowRight: {
        codicon: 'arrow-right',
        lucide: 'arrow-right',
        description: 'Navigate right',
    },
    arrowLeft: {
        codicon: 'arrow-left',
        lucide: 'arrow-left',
        description: 'Navigate left',
    },
    arrowUp: {
        codicon: 'arrow-up',
        lucide: 'arrow-up',
        description: 'Navigate up',
    },
    arrowDown: {
        codicon: 'arrow-down',
        lucide: 'arrow-down',
        description: 'Navigate down',
    },

    // Settings & Configuration
    settings: {
        codicon: 'settings-gear',
        lucide: 'settings',
        codiconFallback: 'gear',
        description: 'Settings or configuration',
    },
    gear: {
        codicon: 'gear',
        lucide: 'settings',
        description: 'Settings gear',
    },

    // Time & Date Icons
    calendar: {
        codicon: 'calendar',
        lucide: 'calendar',
        description: 'Calendar or date',
    },
    clock: {
        codicon: 'watch',
        lucide: 'clock',
        codiconFallback: 'history',
        description: 'Time or timestamp',
    },
    history: {
        codicon: 'history',
        lucide: 'history',
        description: 'History or past events',
    },

    // View & Display Icons
    list: {
        codicon: 'list-unordered',
        lucide: 'list',
        description: 'List view',
    },
    listOrdered: {
        codicon: 'list-ordered',
        lucide: 'list-ordered',
        description: 'Ordered list',
    },
    grid: {
        codicon: 'grid',
        lucide: 'grid',
        description: 'Grid view',
    },
    table: {
        codicon: 'table',
        lucide: 'table',
        description: 'Table view',
    },
    eye: {
        codicon: 'eye',
        lucide: 'eye',
        description: 'View or preview',
    },
    eyeClosed: {
        codicon: 'eye-closed',
        lucide: 'eye-off',
        description: 'Hidden or invisible',
    },

    // Code & Development Icons
    code: {
        codicon: 'code',
        lucide: 'code',
        description: 'Code block',
    },
    terminal: {
        codicon: 'terminal',
        lucide: 'terminal',
        description: 'Terminal or console',
    },
    bug: {
        codicon: 'bug',
        lucide: 'bug',
        description: 'Bug or issue',
    },
    debug: {
        codicon: 'debug-alt',
        lucide: 'bug',
        codiconFallback: 'bug',
        description: 'Debug mode',
    },

    // Organization Icons
    tag: {
        codicon: 'tag',
        lucide: 'tag',
        description: 'Tag or label',
    },
    bookmark: {
        codicon: 'bookmark',
        lucide: 'bookmark',
        description: 'Bookmark',
    },
    pin: {
        codicon: 'pin',
        lucide: 'pin',
        description: 'Pin or keep',
    },

    // Communication Icons
    mail: {
        codicon: 'mail',
        lucide: 'mail',
        description: 'Email or message',
    },
    comment: {
        codicon: 'comment',
        lucide: 'message-square',
        description: 'Comment or note',
    },
    bell: {
        codicon: 'bell',
        lucide: 'bell',
        description: 'Notification',
    },

    // State Icons
    loading: {
        codicon: 'loading',
        lucide: 'loader',
        codiconFallback: 'sync',
        description: 'Loading state',
    },
    play: {
        codicon: 'play',
        lucide: 'play',
        description: 'Start or play',
    },
    stop: {
        codicon: 'debug-stop',
        lucide: 'square',
        codiconFallback: 'circle-slash',
        description: 'Stop action',
    },
    pause: {
        codicon: 'debug-pause',
        lucide: 'pause',
        description: 'Pause action',
    },

    // Special Log Scout Icons
    bundle: {
        codicon: 'package',
        lucide: 'package',
        description: 'Bundle or package',
    },
    case: {
        codicon: 'briefcase',
        lucide: 'briefcase',
        codiconFallback: 'folder',
        description: 'Case or project',
    },
    log: {
        codicon: 'output',
        lucide: 'file-text',
        codiconFallback: 'file',
        description: 'Log file',
    },
    analyzer: {
        codicon: 'graph',
        lucide: 'activity',
        codiconFallback: 'pulse',
        description: 'Analyzer or statistics',
    },
    pattern: {
        codicon: 'regex',
        lucide: 'search',
        codiconFallback: 'search',
        description: 'Pattern or regex',
    },
    timeline: {
        codicon: 'graph-line',
        lucide: 'activity',
        codiconFallback: 'timeline-view',
        description: 'Timeline view',
    },
};

/**
 * Icon utility class for retrieving icons in different formats
 */
export class Icons {
    /**
     * Get Codicon for VSCode native UI (TreeViews, status bar, etc.)
     * Returns a ThemeIcon that VSCode can use directly
     */
    static codicon(name: keyof typeof IconRegistry): vscode.ThemeIcon {
        const icon = IconRegistry[name];
        if (!icon) {
            console.warn(`Icon "${name}" not found in registry, using fallback`);
            return new vscode.ThemeIcon('symbol-misc');
        }
        return new vscode.ThemeIcon(icon.codicon);
    }

    /**
     * Get Codicon name as string (for package.json or when you need the string)
     */
    static codiconName(name: keyof typeof IconRegistry): string {
        const icon = IconRegistry[name];
        return icon?.codicon || 'symbol-misc';
    }

    /**
     * Get Lucide icon name for webviews
     */
    static lucideName(name: keyof typeof IconRegistry): string {
        const icon = IconRegistry[name];
        return icon?.lucide || 'circle';
    }

    /**
     * Generate HTML string for Lucide icon in webview
     * Uses lucide-static package to get SVG
     */
    static html(
        name: keyof typeof IconRegistry,
        options: {
            size?: number;
            className?: string;
            color?: string;
            strokeWidth?: number;
        } = {}
    ): string {
        const {
            size = 16,
            className = '',
            color = 'currentColor',
            strokeWidth = 2,
        } = options;

        const iconName = this.lucideName(name);

        // Import the icon dynamically
        try {
            // Note: This requires lucide-static to be installed
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const icons = require('lucide-static');
            const iconData = icons.icons[iconName];

            if (!iconData) {
                return this.getFallbackSVG(size, className, color);
            }

            // Build SVG from icon data
            const [, , , , svgPath] = iconData;

            return `<svg
                xmlns="http://www.w3.org/2000/svg"
                width="${size}"
                height="${size}"
                viewBox="0 0 24 24"
                fill="none"
                stroke="${color}"
                stroke-width="${strokeWidth}"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-${iconName} ${className}"
                aria-label="${name}"
            >${svgPath}</svg>`;
        } catch (error) {
            console.warn(`Failed to load Lucide icon "${iconName}":`, error);
            return this.getFallbackSVG(size, className, color);
        }
    }

    /**
     * Get CSS class for Codicon in webview (uses VSCode's built-in codicon font)
     */
    static codiconClass(name: keyof typeof IconRegistry): string {
        const icon = IconRegistry[name];
        if (!icon) {
            return 'codicon codicon-symbol-misc';
        }
        return `codicon codicon-${icon.codicon}`;
    }

    /**
     * Fallback SVG for when icon loading fails
     */
    private static getFallbackSVG(size: number, className: string, color: string): string {
        return `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="${size}"
            height="${size}"
            viewBox="0 0 24 24"
            fill="none"
            stroke="${color}"
            stroke-width="2"
            class="${className}"
        >
            <circle cx="12" cy="12" r="10"/>
            <text x="12" y="16" text-anchor="middle" font-size="12" fill="${color}">?</text>
        </svg>`;
    }

    /**
     * Get all icon names (useful for documentation/testing)
     */
    static getAllNames(): string[] {
        return Object.keys(IconRegistry);
    }

    /**
     * Search icons by description
     */
    static search(query: string): string[] {
        const lowerQuery = query.toLowerCase();
        return Object.entries(IconRegistry)
            .filter(([name, icon]) =>
                name.toLowerCase().includes(lowerQuery) ||
                icon.description?.toLowerCase().includes(lowerQuery)
            )
            .map(([name]) => name);
    }
}

/**
 * Type-safe icon name type
 */
export type IconName = keyof typeof IconRegistry;

/**
 * Helper to ensure type safety when using icon names
 */
export function isValidIconName(name: string): name is IconName {
    return name in IconRegistry;
}
