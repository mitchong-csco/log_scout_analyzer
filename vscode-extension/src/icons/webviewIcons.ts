/**
 * Webview Icon Helpers
 *
 * Utilities for rendering icons in VSCode webview panels.
 * Supports both Lucide icons (SVG) and Codicons (VSCode's icon font).
 *
 * Usage:
 * ```typescript
 * const html = `
 *   <div>
 *     ${WebviewIcons.lucide('error', { size: 20, color: '#f44336' })}
 *     ${WebviewIcons.codicon('warning')}
 *   </div>
 * `;
 * ```
 */

import { Icons, IconName } from './iconRegistry';

export interface IconOptions {
    /** Icon size in pixels (default: 16) */
    size?: number;
    /** CSS class names to add */
    className?: string;
    /** Icon color (CSS color value) */
    color?: string;
    /** Stroke width for SVG icons (default: 2) */
    strokeWidth?: number;
    /** Additional inline styles */
    style?: string;
    /** Accessibility label */
    ariaLabel?: string;
}

/**
 * Webview icon rendering utilities
 */
export class WebviewIcons {
    /**
     * Render a Lucide icon as inline SVG
     * Best for custom colors, animations, and modern designs
     *
     * @example
     * WebviewIcons.lucide('error', { size: 24, color: '#f44336' })
     */
    static lucide(name: IconName, options: IconOptions = {}): string {
        const {
            size = 16,
            className = '',
            color = 'currentColor',
            strokeWidth = 2,
            style = '',
            ariaLabel,
        } = options;

        const label = ariaLabel || name;

        return Icons.html(name, {
            size,
            className: `icon icon-lucide ${className}`.trim(),
            color,
            strokeWidth,
        }).replace('<svg', `<svg style="${style}" aria-label="${label}"`);
    }

    /**
     * Render a Codicon using VSCode's built-in icon font
     * Best for native VSCode look and feel
     *
     * Note: Requires codicon font to be loaded in webview
     *
     * @example
     * WebviewIcons.codicon('warning', { className: 'warning-icon' })
     */
    static codicon(name: IconName, options: IconOptions = {}): string {
        const {
            size,
            className = '',
            color,
            style = '',
            ariaLabel,
        } = options;

        const codiconClass = Icons.codiconClass(name);
        const sizeStyle = size ? `font-size: ${size}px;` : '';
        const colorStyle = color ? `color: ${color};` : '';
        const combinedStyle = `${sizeStyle}${colorStyle}${style}`.trim();
        const label = ariaLabel || name;

        return `<i class="${codiconClass} ${className}" style="${combinedStyle}" aria-label="${label}"></i>`;
    }

    /**
     * Render icon with text label (common pattern)
     *
     * @example
     * WebviewIcons.withLabel('error', 'Error occurred', { color: '#f44336' })
     */
    static withLabel(
        name: IconName,
        label: string,
        options: IconOptions & { iconType?: 'lucide' | 'codicon'; gap?: number } = {}
    ): string {
        const { iconType = 'lucide', gap = 8, ...iconOptions } = options;
        const icon = iconType === 'lucide'
            ? this.lucide(name, iconOptions)
            : this.codicon(name, iconOptions);

        return `
            <span class="icon-with-label" style="display: inline-flex; align-items: center; gap: ${gap}px;">
                ${icon}
                <span class="label">${label}</span>
            </span>
        `.trim();
    }

    /**
     * Render an icon button (clickable icon)
     *
     * @example
     * WebviewIcons.button('refresh', 'refresh-data', { title: 'Refresh data' })
     */
    static button(
        name: IconName,
        commandId: string,
        options: IconOptions & {
            title?: string;
            disabled?: boolean;
            variant?: 'primary' | 'secondary' | 'danger';
        } = {}
    ): string {
        const {
            title = '',
            disabled = false,
            variant = 'secondary',
            size = 16,
            ...iconOptions
        } = options;

        const icon = this.lucide(name, { size, ...iconOptions });
        const disabledAttr = disabled ? 'disabled' : '';
        const titleAttr = title ? `title="${title}"` : '';

        return `
            <button
                class="icon-button icon-button-${variant}"
                data-command="${commandId}"
                ${disabledAttr}
                ${titleAttr}
                style="border: none; background: transparent; cursor: pointer; padding: 4px; display: inline-flex; align-items: center; justify-content: center;"
            >
                ${icon}
            </button>
        `.trim();
    }

    /**
     * Render a status icon with color based on severity
     *
     * @example
     * WebviewIcons.status('error') // Red error icon
     * WebviewIcons.status('warning') // Yellow warning icon
     */
    static status(
        type: 'error' | 'warning' | 'info' | 'success',
        options: Omit<IconOptions, 'color'> & { useVscodeColors?: boolean } = {}
    ): string {
        const { useVscodeColors = true, ...iconOptions } = options;

        const iconMap: Record<typeof type, IconName> = {
            error: 'error',
            warning: 'warning',
            info: 'info',
            success: 'success',
        };

        const colorMap = useVscodeColors ? {
            error: 'var(--vscode-errorForeground, #f44336)',
            warning: 'var(--vscode-editorWarning-foreground, #ff9800)',
            info: 'var(--vscode-editorInfo-foreground, #2196f3)',
            success: 'var(--vscode-testing-iconPassed, #4caf50)',
        } : {
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3',
            success: '#4caf50',
        };

        return this.lucide(iconMap[type], {
            color: colorMap[type],
            ...iconOptions,
        });
    }

    /**
     * Render an animated loading icon
     *
     * @example
     * WebviewIcons.loading() // Spinning refresh icon
     */
    static loading(options: IconOptions = {}): string {
        const { className = '', ...iconOptions } = options;

        const style = `
            animation: spin 1s linear infinite;
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;

        return this.lucide('loading', {
            className: `icon-loading ${className}`.trim(),
            style,
            ...iconOptions,
        });
    }

    /**
     * Generate CSS for icon animations and styles
     * Include this in your webview HTML <style> tag
     */
    static getStyles(): string {
        return `
            /* Icon base styles */
            .icon {
                display: inline-block;
                vertical-align: middle;
                flex-shrink: 0;
            }

            .icon-lucide {
                stroke: currentColor;
            }

            /* Icon button styles */
            .icon-button {
                border: none;
                background: transparent;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: background-color 0.2s;
            }

            .icon-button:hover:not(:disabled) {
                background-color: var(--vscode-toolbar-hoverBackground);
            }

            .icon-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .icon-button-primary {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }

            .icon-button-primary:hover:not(:disabled) {
                background-color: var(--vscode-button-hoverBackground);
            }

            .icon-button-danger {
                color: var(--vscode-errorForeground);
            }

            .icon-button-danger:hover:not(:disabled) {
                background-color: var(--vscode-inputValidation-errorBackground);
            }

            /* Icon with label */
            .icon-with-label {
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            /* Loading animation */
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .icon-loading {
                animation: spin 1s linear infinite;
            }

            /* Codicon styles (VSCode built-in) */
            .codicon {
                font-family: codicon;
                display: inline-block;
                vertical-align: middle;
                line-height: 1;
                text-align: center;
            }
        `;
    }

    /**
     * Generate toolbar HTML with multiple icon buttons
     *
     * @example
     * WebviewIcons.toolbar([
     *   { icon: 'refresh', command: 'refresh', title: 'Refresh' },
     *   { icon: 'filter', command: 'filter', title: 'Filter' },
     * ])
     */
    static toolbar(
        buttons: Array<{
            icon: IconName;
            command: string;
            title?: string;
            disabled?: boolean;
            separator?: boolean;
        }>,
        options: { className?: string } = {}
    ): string {
        const { className = '' } = options;

        const buttonsHtml = buttons.map(btn => {
            if (btn.separator) {
                return '<div class="toolbar-separator"></div>';
            }
            return this.button(btn.icon, btn.command, {
                title: btn.title,
                disabled: btn.disabled,
            });
        }).join('\n');

        return `
            <div class="icon-toolbar ${className}" style="display: flex; gap: 4px; align-items: center;">
                ${buttonsHtml}
            </div>
        `.trim();
    }

    /**
     * Render a file icon with appropriate icon based on file extension
     *
     * @example
     * WebviewIcons.fileIcon('script.log') // Returns log icon
     * WebviewIcons.fileIcon('data.zip') // Returns archive icon
     */
    static fileIcon(filename: string, options: IconOptions = {}): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        let iconName: IconName;

        if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
            iconName = 'fileZip';
        } else if (['log', 'txt'].includes(ext)) {
            iconName = 'log';
        } else if (['js', 'ts', 'json', 'xml', 'html', 'css'].includes(ext)) {
            iconName = 'fileCode';
        } else {
            iconName = 'file';
        }

        return this.lucide(iconName, options);
    }

    /**
     * Render an icon badge (icon with count/number)
     *
     * @example
     * WebviewIcons.badge('error', 5, { color: '#f44336' })
     */
    static badge(
        name: IconName,
        count: number,
        options: IconOptions = {}
    ): string {
        const icon = this.lucide(name, options);

        return `
            <span class="icon-badge" style="position: relative; display: inline-flex;">
                ${icon}
                <span class="badge-count" style="
                    position: absolute;
                    top: -4px;
                    right: -8px;
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    font-size: 10px;
                    font-weight: 600;
                    padding: 2px 4px;
                    border-radius: 10px;
                    line-height: 1;
                    min-width: 16px;
                    text-align: center;
                ">${count}</span>
            </span>
        `.trim();
    }
}

/**
 * Shorthand aliases for common use cases
 */
export const Icon = {
    /** Render Lucide icon */
    svg: (name: IconName, options?: IconOptions) => WebviewIcons.lucide(name, options),

    /** Render Codicon */
    font: (name: IconName, options?: IconOptions) => WebviewIcons.codicon(name, options),

    /** Render icon with label */
    label: (name: IconName, label: string, options?: IconOptions) =>
        WebviewIcons.withLabel(name, label, options),

    /** Render status icon */
    status: (type: 'error' | 'warning' | 'info' | 'success', options?: Omit<IconOptions, 'color'>) =>
        WebviewIcons.status(type, options),

    /** Render loading icon */
    loading: (options?: IconOptions) => WebviewIcons.loading(options),

    /** Render icon button */
    button: (name: IconName, command: string, options?: IconOptions & { title?: string }) =>
        WebviewIcons.button(name, command, options),
};
