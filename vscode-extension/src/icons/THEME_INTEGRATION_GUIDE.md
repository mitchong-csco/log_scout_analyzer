# VSCode Theme Integration Guide

## 📋 Overview

This guide explains **where and how to handle VSCode theme changes** in the Log Scout Analyzer extension. VSCode supports multiple themes (light, dark, high contrast), and our extension must adapt seamlessly.

---

## 🎨 Theme System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VSCode Theme System                      │
├─────────────────────────────────────────────────────────────┤
│  • Light Theme                                               │
│  • Dark Theme                                                │
│  • High Contrast (Dark)                                      │
│  • High Contrast (Light)                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ThemeManager (themeSupport.ts)                  │
├─────────────────────────────────────────────────────────────┤
│  • Detects current theme                                     │
│  • Listens for theme changes                                 │
│  • Notifies all registered components                        │
└─────────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐     ┌──────────┐
    │ Native  │      │ Webview │     │  Status  │
    │ UI      │      │ Panels  │     │  Bar     │
    └─────────┘      └─────────┘     └──────────┘
```

---

## 🔧 Where Theme Adjustments Are Needed

### 1. **Extension Initialization** (extension.ts)

**WHY:** Initialize theme system once at startup.

```typescript
// ✅ Required in extension.ts activate()
import { ThemeManager } from './icons/themeSupport';

export function activate(context: vscode.ExtensionContext) {
    // Initialize theme manager FIRST
    ThemeManager.initialize(context);
    
    // Rest of your activation code...
}
```

**Result:** Theme manager starts listening for theme changes.

---

### 2. **Webview Panels** (High Priority)

#### 🎯 Files Affected:
- `consoleWebview.ts`
- `scoutAnalyzerPanel.ts`
- `resultsPanel.ts`
- `patternViewerPanel.ts`
- Any file with `createWebviewPanel()`

#### WHY Theme Changes Matter Here:
- Webviews are isolated HTML/CSS/JS environments
- They DON'T automatically update when theme changes
- You must manually notify them

#### ✅ Solution A: Use ThemeManager.getWebviewHTML()

**BEFORE:**
```typescript
private _getHtmlForWebview(): string {
    return `<!DOCTYPE html>
    <html>
    <head>
        <style>
            body { color: #000; background: #fff; }
        </style>
    </head>
    <body>
        ${content}
    </body>
    </html>`;
}
```

**AFTER:**
```typescript
import { ThemeManager } from './icons/themeSupport';
import { WebviewIcons } from './icons/webviewIcons';

private _getHtmlForWebview(): string {
    const content = `
        <div class="toolbar">
            ${WebviewIcons.button('refresh', 'refresh', { title: 'Refresh' })}
            ${WebviewIcons.button('filter', 'filter', { title: 'Filter' })}
        </div>
        <div class="content">
            ${this.renderContent()}
        </div>
    `;

    return ThemeManager.getWebviewHTML(content, {
        title: 'My Panel',
        includeThemeHandler: true,  // ✅ Enables auto theme updates
    });
}
```

#### ✅ Solution B: Manual Registration

**For existing webviews with custom HTML:**

```typescript
export class ConsoleWebview {
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

        // Register webview for theme updates
        this._disposables.push(
            ThemeManager.registerWebview(this._panel.webview)
        );

        // Listen for theme changes and update
        this._disposables.push(
            ThemeManager.onDidChangeTheme(() => {
                this._update();  // Regenerate HTML
            })
        );
    }
}
```

#### ✅ Solution C: Use CSS Variables (Best Practice)

**Always use VSCode CSS variables instead of hardcoded colors:**

```css
/* ❌ BAD - Breaks on theme change */
.error {
    color: #f44336;
    background: #fff;
}

/* ✅ GOOD - Auto adapts to theme */
.error {
    color: var(--vscode-errorForeground);
    background: var(--vscode-editor-background);
}

/* ✅ BETTER - Use theme utility classes */
.error {
    color: var(--color-error);  /* From ThemeManager CSS */
}
```

**Common VSCode CSS Variables:**

| Purpose | Variable |
|---------|----------|
| Text color | `var(--vscode-editor-foreground)` |
| Background | `var(--vscode-editor-background)` |
| Error | `var(--vscode-errorForeground)` |
| Warning | `var(--vscode-editorWarning-foreground)` |
| Info | `var(--vscode-editorInfo-foreground)` |
| Border | `var(--vscode-panel-border)` |
| Button BG | `var(--vscode-button-background)` |
| Button Text | `var(--vscode-button-foreground)` |
| Hover BG | `var(--vscode-list-hoverBackground)` |

**Full list:** https://code.visualstudio.com/api/references/theme-color

---

### 3. **TreeView Items** (TreeDataProviders)

#### 🎯 Files Affected:
- `bundleTreeProvider.ts`
- `casesTreeProvider.ts`
- `modernResultsTreeProvider.ts`
- `categoriesTreeProvider.ts`
- Any `*TreeProvider.ts` file

#### WHY Theme Changes Matter Here:
- Custom icons and colors need to adapt
- ThemeIcon automatically adapts, but custom colors don't

#### ✅ Solution: Use ThemeIcon and ThemeColor

**BEFORE:**
```typescript
// ❌ BAD - Fixed color
const treeItem = new vscode.TreeItem('Error');
treeItem.iconPath = new vscode.ThemeIcon('error', '#ff0000');
```

**AFTER:**
```typescript
// ✅ GOOD - Theme-aware
import { Icons } from './icons/iconRegistry';
import { getStatusColor } from './icons/themeSupport';

const treeItem = new vscode.TreeItem('Error');
treeItem.iconPath = new vscode.ThemeIcon(
    'error',
    getStatusColor('error')  // Auto adapts to theme
);

// OR use icon registry
treeItem.iconPath = Icons.codicon('error');
```

#### ✅ Solution: ThemeAwareTreeItem

```typescript
import { ThemeAwareTreeItem } from './icons/themeSupport';

// Automatically adapts icon/color to theme
const item = new ThemeAwareTreeItem(
    'My Item',
    vscode.TreeItemCollapsibleState.None,
    {
        lightIcon: Icons.codicon('circle-outline'),
        darkIcon: Icons.codicon('circle-filled'),
    }
);
```

---

### 4. **Status Bar Items**

#### 🎯 Files Affected:
- `statusBarProgress.ts`
- Any file creating status bar items

#### WHY Theme Changes Matter Here:
- Status bar color should match severity
- Background colors need theme awareness

#### ✅ Solution: Use ThemeColor

```typescript
const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
);

// ✅ Use ThemeColor for theme-aware colors
statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');

// Update on theme change
ThemeManager.onDidChangeTheme(() => {
    updateStatusBarColors(statusBarItem);
});
```

---

### 5. **Decorations** (Gutter Icons, Text Highlights)

#### 🎯 Files Affected:
- `gutterDecorator.ts`
- `logLevelHighlighter.ts`
- Any file using `createTextEditorDecorationType()`

#### WHY Theme Changes Matter Here:
- Gutter icons and text highlights must be visible in all themes
- Background/foreground colors need contrast

#### ✅ Solution: Use Theme Colors in Decorations

**BEFORE:**
```typescript
// ❌ BAD - Fixed colors
const errorDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: '#ffe6e6',
    border: '1px solid #ff0000',
});
```

**AFTER:**
```typescript
// ✅ GOOD - Theme-aware
const errorDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('editorError.background'),
    border: `1px solid`,
    borderColor: new vscode.ThemeColor('editorError.foreground'),
    gutterIconPath: Icons.codicon('error'),
    gutterIconSize: 'contain',
});

// Recreate decorations on theme change
ThemeManager.onDidChangeTheme(() => {
    // Dispose old decorations
    errorDecoration.dispose();
    // Create new ones with updated theme
    errorDecoration = createErrorDecoration();
});
```

---

### 6. **Quick Pick / Input Boxes**

#### 🎯 Files Affected:
- Any file using `vscode.window.showQuickPick()`
- Any file using `vscode.window.showInputBox()`

#### WHY Theme Changes Matter Here:
- Icons in quick pick items should use ThemeIcon

#### ✅ Solution: Use ThemeIcon for Icons

```typescript
const items: vscode.QuickPickItem[] = [
    {
        label: '$(error) Error Logs',
        description: 'Show error logs',
        iconPath: Icons.codicon('error'),  // ✅ Theme-aware
    },
    {
        label: '$(warning) Warning Logs',
        iconPath: Icons.codicon('warning'),
    },
];

vscode.window.showQuickPick(items);
```

---

## 🧪 Testing Theme Changes

### Manual Testing Checklist

1. **Switch to Light Theme:**
   ```
   Ctrl+K Ctrl+T → Select "Light (Visual Studio)"
   ```
   ✅ Check all webviews update automatically
   ✅ Check icons are visible
   ✅ Check text has good contrast

2. **Switch to Dark Theme:**
   ```
   Ctrl+K Ctrl+T → Select "Dark (Visual Studio)"
   ```
   ✅ Check all webviews update automatically
   ✅ Check colors invert properly

3. **Switch to High Contrast:**
   ```
   Ctrl+K Ctrl+T → Select "High Contrast"
   ```
   ✅ Check borders are visible
   ✅ Check status colors are distinct

### Automated Testing

```typescript
// In test suite
suite('Theme Integration Tests', () => {
    test('Webview updates on theme change', async () => {
        const panel = createTestWebview();
        
        // Simulate theme change
        await vscode.commands.executeCommand('workbench.action.selectTheme');
        
        // Verify webview received theme change message
        // ...
    });
});
```

---

## 📋 Migration Checklist

Use this checklist when updating existing components:

### For Webviews:
- [ ] Replace hardcoded colors with CSS variables
- [ ] Use `ThemeManager.getWebviewHTML()` OR register webview
- [ ] Include theme handler script
- [ ] Use `WebviewIcons` for icons
- [ ] Test in light/dark/high-contrast themes

### For TreeViews:
- [ ] Use `Icons.codicon()` for icons
- [ ] Use `ThemeColor` for custom colors
- [ ] Avoid hardcoded color strings
- [ ] Consider `ThemeAwareTreeItem` for complex items

### For Decorations:
- [ ] Use `ThemeColor` for all colors
- [ ] Use `ThemeIcon` for gutter icons
- [ ] Listen to theme changes and recreate decorations
- [ ] Test visibility in all themes

### For Status Bar:
- [ ] Use `ThemeColor` for backgrounds
- [ ] Use theme-aware icons
- [ ] Update on theme change events

---

## 🎯 Quick Reference

### Import Statements

```typescript
// Core theme support
import { ThemeManager, ThemeKind } from './icons/themeSupport';

// Icon registry
import { Icons, IconName } from './icons/iconRegistry';

// Webview icons
import { WebviewIcons } from './icons/webviewIcons';

// Theme colors
import { getStatusColor } from './icons/themeSupport';
```

### Common Patterns

```typescript
// 1. Initialize in extension.ts
ThemeManager.initialize(context);

// 2. Generate webview HTML
const html = ThemeManager.getWebviewHTML(content, {
    includeThemeHandler: true,
});

// 3. Use icons in webview
const icon = WebviewIcons.status('error', { size: 20 });

// 4. Create theme-aware TreeItem
const item = new vscode.TreeItem('Label');
item.iconPath = Icons.codicon('error');

// 5. Listen to theme changes
ThemeManager.onDidChangeTheme((theme) => {
    console.log('Theme changed to:', theme);
    updateUI();
});

// 6. Check current theme
if (ThemeManager.isDark()) {
    // Dark theme specific logic
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Webview doesn't update on theme change

**Cause:** Webview not registered with ThemeManager

**Solution:**
```typescript
ThemeManager.registerWebview(panel.webview);
// OR
return ThemeManager.getWebviewHTML(content, { includeThemeHandler: true });
```

### Issue 2: Icons invisible in light theme

**Cause:** Hardcoded dark colors

**Solution:** Use CSS variables or ThemeColor
```typescript
// ❌ color: '#ffffff'
// ✅ color: var(--vscode-editor-foreground)
```

### Issue 3: Decorations don't update

**Cause:** DecorationType not recreated on theme change

**Solution:**
```typescript
ThemeManager.onDidChangeTheme(() => {
    oldDecoration.dispose();
    newDecoration = createDecoration();
    applyDecoration(newDecoration);
});
```

### Issue 4: TreeView icons have wrong colors

**Cause:** Using strings instead of ThemeColor

**Solution:**
```typescript
// ❌ new vscode.ThemeIcon('error', '#ff0000')
// ✅ new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
```

---

## 📚 Additional Resources

- [VSCode Theme Colors](https://code.visualstudio.com/api/references/theme-color)
- [VSCode Theme Guide](https://code.visualstudio.com/api/extension-guides/color-theme)
- [Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [Lucide Icons](https://lucide.dev)

---

## 🎉 Summary

**Theme changes affect:**
1. ✅ Webview panels (HTML/CSS)
2. ✅ TreeView icons and colors
3. ✅ Status bar items
4. ✅ Text decorations
5. ✅ Quick pick items

**Best practices:**
1. ✅ Initialize `ThemeManager` in `extension.ts`
2. ✅ Use CSS variables in webviews
3. ✅ Use `ThemeColor` for native UI
4. ✅ Use `Icons` registry for consistency
5. ✅ Listen to `onDidChangeTheme` events
6. ✅ Test in all theme variants

**Result:** Seamless experience across all VSCode themes! 🎨

---

**Version:** 1.0  
**Last Updated:** 2024  
**Maintained by:** Log Scout Analyzer Team