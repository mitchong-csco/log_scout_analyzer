# 🎨 Icon and Theme System

A comprehensive icon and theme management system for the Log Scout Analyzer VSCode extension.

## 📋 Features

- ✅ **Unified Icon Registry** - Single source of truth for all icons
- ✅ **Multi-Library Support** - Codicons (VSCode native) + Lucide (webviews)
- ✅ **Automatic Fallbacks** - Graceful degradation when icons are missing
- ✅ **Theme-Aware** - Auto-adapts to light/dark/high-contrast themes
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Tree-Shakeable** - Only bundle icons you use
- ✅ **Zero Configuration** - Works out of the box

---

## 🚀 Quick Start

### 1. Initialize Theme Manager

In your `extension.ts`:

```typescript
import { ThemeManager } from './icons';

export function activate(context: vscode.ExtensionContext) {
    // Initialize theme system FIRST
    ThemeManager.initialize(context);
    
    // ... rest of activation
}
```

### 2. Use Icons in TreeView

```typescript
import { Icons } from './icons';

const treeItem = new vscode.TreeItem('Error Log');
treeItem.iconPath = Icons.codicon('error');
```

### 3. Use Icons in Webview

```typescript
import { WebviewIcons, ThemeManager } from './icons';

const content = `
    <div class="toolbar">
        ${WebviewIcons.button('refresh', 'refresh-data', { title: 'Refresh' })}
        ${WebviewIcons.button('filter', 'filter-data', { title: 'Filter' })}
    </div>
    <div class="content">
        ${WebviewIcons.status('error', { size: 20 })}
        <span>Error occurred</span>
    </div>
`;

const html = ThemeManager.getWebviewHTML(content, {
    title: 'My Panel',
    includeThemeHandler: true,
});
```

---

## 📚 Available Icons

### Status Icons
- `error` - Error state
- `warning` - Warning state
- `info` - Information
- `success` - Success state

### Action Icons
- `search` - Search functionality
- `filter` - Filter data
- `refresh` - Refresh/reload
- `add` - Add/create
- `remove` - Remove/delete
- `trash` - Delete permanently
- `edit` - Edit content
- `save` - Save changes
- `download` - Download/export
- `upload` - Upload/import

### File Icons
- `file` - Generic file
- `fileCode` - Code/log file
- `fileZip` - Archive file
- `folder` - Folder
- `folderOpened` - Opened folder

### Navigation Icons
- `chevronRight` - Expand/next
- `chevronDown` - Collapse/dropdown
- `chevronUp` - Scroll up
- `chevronLeft` - Back/previous
- `arrowRight` - Navigate right
- `arrowLeft` - Navigate left

### View Icons
- `list` - List view
- `grid` - Grid view
- `table` - Table view
- `eye` - View/preview
- `eyeClosed` - Hidden

### Special Icons
- `bundle` - Bundle/package
- `case` - Case/project
- `log` - Log file
- `analyzer` - Analyzer/statistics
- `pattern` - Pattern/regex
- `timeline` - Timeline view

**See all 60+ icons:** Check `IconRegistry` in `iconRegistry.ts`

---

## 🎯 API Reference

### Icons Class

```typescript
// Get ThemeIcon for VSCode native UI
Icons.codicon('error')                    // Returns vscode.ThemeIcon

// Get icon name as string
Icons.codiconName('error')                // Returns 'error'
Icons.lucideName('error')                 // Returns 'alert-circle'

// Get HTML for webview
Icons.html('error', {                     // Returns SVG string
    size: 24,
    color: '#f44336',
    strokeWidth: 2
})

// Get Codicon CSS class
Icons.codiconClass('error')               // Returns 'codicon codicon-error'

// Search icons
Icons.search('file')                      // Returns ['file', 'fileCode', 'fileZip']
Icons.getAllNames()                       // Returns all icon names
```

### WebviewIcons Class

```typescript
// Render Lucide icon (SVG)
WebviewIcons.lucide('error', {
    size: 20,
    color: '#f44336',
    className: 'my-icon'
})

// Render Codicon (icon font)
WebviewIcons.codicon('warning', {
    size: 16,
    color: '#ff9800'
})

// Icon with label
WebviewIcons.withLabel('error', 'Error occurred', {
    size: 16,
    gap: 8
})

// Icon button
WebviewIcons.button('refresh', 'refresh-command', {
    title: 'Refresh data',
    variant: 'primary'
})

// Status icon (auto-colored)
WebviewIcons.status('error', { size: 20 })
WebviewIcons.status('warning')
WebviewIcons.status('success')

// Loading icon (animated)
WebviewIcons.loading({ size: 24 })

// Icon badge (with count)
WebviewIcons.badge('error', 5, { size: 16 })

// File icon (auto-detects type)
WebviewIcons.fileIcon('script.log')
WebviewIcons.fileIcon('data.zip')

// Toolbar
WebviewIcons.toolbar([
    { icon: 'refresh', command: 'refresh', title: 'Refresh' },
    { icon: 'filter', command: 'filter', title: 'Filter' },
    { separator: true },
    { icon: 'download', command: 'export', title: 'Export' }
])

// Get CSS styles
WebviewIcons.getStyles()                  // Returns CSS string
```

### ThemeManager Class

```typescript
// Initialize (call once in extension.ts)
ThemeManager.initialize(context)

// Detect current theme
ThemeManager.detectTheme()                // Returns ThemeKind
ThemeManager.getCurrentTheme()            // Returns current ThemeKind
ThemeManager.isDark()                     // Returns boolean
ThemeManager.isLight()                    // Returns boolean
ThemeManager.isHighContrast()             // Returns boolean

// Register webview for theme updates
ThemeManager.registerWebview(webview)     // Returns Disposable

// Listen to theme changes
ThemeManager.onDidChangeTheme((theme) => {
    console.log('Theme changed:', theme);
})

// Get color palette
ThemeManager.getPalette()                 // Returns ThemePalette

// Get theme-aware CSS
ThemeManager.getThemeAwareCSS()           // Returns CSS string

// Get theme handler script
ThemeManager.getThemeHandlerScript()      // Returns JS string

// Generate complete HTML
ThemeManager.getWebviewHTML(content, {
    title: 'My Panel',
    includeThemeHandler: true,
    additionalCSS: '...',
    additionalScripts: '...'
})
```

### Shorthand Aliases

```typescript
import { Icon } from './icons';

Icon.svg('error', { size: 20 })           // = WebviewIcons.lucide()
Icon.font('error')                        // = WebviewIcons.codicon()
Icon.label('error', 'Error')              // = WebviewIcons.withLabel()
Icon.status('error')                      // = WebviewIcons.status()
Icon.loading()                            // = WebviewIcons.loading()
Icon.button('refresh', 'cmd')             // = WebviewIcons.button()
```

---

## 🎨 Theme Support

### Automatic Theme Detection

The system automatically detects and adapts to:
- ✅ Light themes
- ✅ Dark themes
- ✅ High Contrast (Dark)
- ✅ High Contrast (Light)

### CSS Variables

Use these theme-aware CSS variables in your webviews:

```css
/* Colors */
--color-error
--color-warning
--color-info
--color-success

/* Backgrounds */
--bg-primary
--bg-secondary
--bg-hover
--bg-active

/* Foreground */
--fg-primary
--fg-secondary
--fg-muted

/* Borders */
--border-color
--border-focus

/* Buttons */
--btn-bg
--btn-fg
--btn-hover-bg

/* Spacing */
--spacing-xs    /* 4px */
--spacing-sm    /* 8px */
--spacing-md    /* 12px */
--spacing-lg    /* 16px */
--spacing-xl    /* 24px */
```

### Theme Change Events

Listen to theme changes in your webview:

```javascript
window.addEventListener('vscode-theme-changed', (event) => {
    const { theme, isDark, isLight, isHighContrast } = event.detail;
    console.log('Theme changed to:', theme);
    // Update your UI accordingly
});
```

---

## 📖 Documentation

- **[THEME_INTEGRATION_GUIDE.md](./THEME_INTEGRATION_GUIDE.md)** - Complete guide on theme integration
- **[EXAMPLE_MIGRATION.md](./EXAMPLE_MIGRATION.md)** - Step-by-step migration example

---

## 🔧 Architecture

```
icons/
├── iconRegistry.ts           # Icon definitions and registry
├── webviewIcons.ts          # Webview icon rendering utilities
├── themeSupport.ts          # Theme management and detection
├── index.ts                 # Public API exports
├── README.md                # This file
├── THEME_INTEGRATION_GUIDE.md   # Theme integration guide
└── EXAMPLE_MIGRATION.md     # Migration example
```

### Icon Registry

Central registry mapping semantic names to:
- Codicon names (for VSCode native UI)
- Lucide icon names (for webviews)
- Fallback options
- Descriptions

### Webview Icons

Utilities for rendering icons in HTML webviews:
- SVG generation from Lucide icons
- Codicon class generation
- Pre-built components (buttons, badges, toolbars)
- Theme-aware colors

### Theme Support

Theme detection and management:
- Current theme detection
- Theme change events
- CSS variable generation
- Webview notification system
- Theme-aware decorations

---

## 🧪 Testing

### Manual Testing

1. **Test Icons:**
   ```typescript
   // In any TreeView
   Icons.getAllNames().forEach(name => {
       const item = new vscode.TreeItem(name);
       item.iconPath = Icons.codicon(name as any);
   });
   ```

2. **Test Themes:**
   - Switch to Light: `Ctrl+K Ctrl+T` → "Light"
   - Switch to Dark: `Ctrl+K Ctrl+T` → "Dark"
   - Switch to High Contrast: `Ctrl+K Ctrl+T` → "High Contrast"
   - Verify all webviews update automatically

3. **Test Webview Icons:**
   ```typescript
   const html = ThemeManager.getWebviewHTML(`
       ${Icons.getAllNames().map(name => 
           WebviewIcons.withLabel(name as any, name, { size: 16 })
       ).join('<br>')}
   `);
   ```

---

## 💡 Best Practices

### DO ✅

1. **Use the icon registry:**
   ```typescript
   Icons.codicon('error')  // ✅ Type-safe, consistent
   ```

2. **Use CSS variables:**
   ```css
   color: var(--color-error);  /* ✅ Theme-aware */
   ```

3. **Initialize theme manager:**
   ```typescript
   ThemeManager.initialize(context);  // ✅ In extension.ts
   ```

4. **Register webviews:**
   ```typescript
   ThemeManager.registerWebview(webview);  // ✅ For auto-updates
   ```

### DON'T ❌

1. **Don't hardcode colors:**
   ```css
   color: #ff0000;  /* ❌ Breaks on theme change */
   ```

2. **Don't use raw icon strings:**
   ```typescript
   new vscode.ThemeIcon('error');  /* ❌ No type safety */
   ```

3. **Don't skip theme handler:**
   ```typescript
   // ❌ Webview won't update on theme change
   includeThemeHandler: false
   ```

4. **Don't use emoji for icons:**
   ```html
   <span>🔴</span>  <!-- ❌ Inconsistent, not theme-aware -->
   ```

---

## 🐛 Troubleshooting

### Icons not showing in webview?

**Check:**
1. Is `lucide-static` installed? `npm install lucide-static`
2. Is CSP allowing SVG? Check `Content-Security-Policy`
3. Are you using valid icon names? Check `Icons.getAllNames()`

### Webview not updating on theme change?

**Fix:**
1. Call `ThemeManager.initialize(context)` in `extension.ts`
2. Use `includeThemeHandler: true` in `getWebviewHTML()`
3. Or manually register: `ThemeManager.registerWebview(webview)`

### Colors wrong in TreeView?

**Fix:**
Use `ThemeColor` instead of strings:
```typescript
// ❌ Wrong
new vscode.ThemeIcon('error', '#ff0000')

// ✅ Correct
new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
```

---

## 🚀 Future Enhancements

- [ ] Icon preview panel
- [ ] Custom icon upload
- [ ] Icon animation utilities
- [ ] More icon libraries (Heroicons, Tabler)
- [ ] Icon color picker
- [ ] A11y testing utilities

---

## 📄 License

Part of Log Scout Analyzer extension.

---

## 🤝 Contributing

When adding new icons:
1. Add to `IconRegistry` in `iconRegistry.ts`
2. Map both Codicon and Lucide names
3. Add description
4. Update this README
5. Test in light/dark/high-contrast themes

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Maintained by:** Log Scout Analyzer Team