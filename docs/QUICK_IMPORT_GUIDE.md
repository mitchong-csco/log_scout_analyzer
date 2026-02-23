# Quick Import Guide - Bundle Panel Toolbar Button

**Version**: v0.0.188+  
**Feature**: One-Click Import Access  
**Date**: February 23, 2026

---

## 🚀 Quick Start

### Import with One Click

1. **Open Scout Analyzer** sidebar (telescope icon 🔭)
2. **Navigate to Bundles panel**
3. **Click the "+" button** in the toolbar (top-right corner)
4. **Select your archive file**
5. **Done!** - Import starts automatically

---

## 📍 Where to Find It

```
Scout Analyzer Sidebar
├─ Results
├─ Filters
├─ Categories
├─ Analyzer
├─ Pattern Overrides
└─ Bundles ← Look here!
    ├─ [+] ← Click this button! (in toolbar)
    ├─ 📦 700356763 bundle_abc123
    ├─ 📦 700440257 bundle_def456
    └─ ...
```

**Location**: Top-right corner of the Bundles panel header

---

## 🎯 What It Does

**Command**: `Scout: Import Package`

**Flow for QCSONE Packages**:
1. Click "+" button
2. File picker appears
3. Select file (e.g., `700440257_qcsone_download_selected.zip`)
4. ✨ **No prompt** - case ID auto-detected!
5. Import starts immediately
6. Bundle appears in panel

**Flow for Other Archives**:
1. Click "+" button
2. File picker appears
3. Select file (e.g., `debug_logs.zip`)
4. Case ID prompt appears (required, validated)
5. Enter case ID
6. Import starts
7. Bundle appears in panel

---

## 💡 Alternative Import Methods

You can also import packages via:

### Method 1: Command Palette
- Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Type: `Scout: Import Package`
- Press Enter

### Method 2: Context Menu (File Explorer)
- Right-click on a `.zip` or `.tar` file
- Select: `Scout: Import Package`

### Method 3: Toolbar Button ⭐ **New!**
- Click "+" in Bundles panel toolbar
- **Fastest method!**

---

## 🎨 Visual Guide

### Before (v0.0.185)
```
Bundles Panel
─────────────────────────
No toolbar buttons
📦 Bundle 1
📦 Bundle 2
```

### After (v0.0.188)
```
Bundles Panel         [+]  ← New button!
─────────────────────────
📦 700356763 bundle_abc
📦 700440257 bundle_def
```

---

## ⚡ Pro Tips

### Tip 1: Zero-Click QCSONE Imports
For QCSONE packages, the entire process is automatic:
- File name: `700440257_qcsone_download_selected.zip`
- Case ID: Auto-detected → `700440257`
- Bundle name: Auto-generated → `700440257 bundle_xyz`
- **No typing, no clicking - just select the file!**

### Tip 2: Keyboard Shortcut
After clicking the "+" button, use keyboard:
- `↓` / `↑` - Navigate files
- `Enter` - Select file
- `Esc` - Cancel

### Tip 3: Drag and Drop (Future)
Coming soon: Drag `.zip` files directly to Bundles panel!

### Tip 4: Multiple Bundles Per Case
Bundle naming format includes bundle ID:
- First import: `700440257 bundle_abc123`
- Second import: `700440257 bundle_def456`
- Easy to distinguish multiple bundles for same case!

---

## 🔍 Troubleshooting

### "I don't see the '+' button"
**Check**:
1. Extension version is v0.0.188 or higher
2. Bundles panel is expanded (not collapsed)
3. Scout Analyzer sidebar is active
4. Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"

### "The button doesn't do anything"
**Check**:
1. LSP server is running (check Output channel)
2. Extension is activated (open a log file first)
3. Check for errors in Output > Log Scout Analyzer

### "I prefer keyboard shortcuts"
Set up a custom keybinding:
1. File > Preferences > Keyboard Shortcuts
2. Search: "Scout: Import Package"
3. Click "+" to add custom keybinding
4. Example: `Ctrl+Alt+I`

---

## 📊 Feature History

| Version | Feature |
|---------|---------|
| v0.0.185 | Import via Command Palette only |
| v0.0.186 | Case ID auto-extraction + pre-fill |
| v0.0.187 | Skip prompt when case ID detected ⭐ |
| v0.0.188 | "+" toolbar button added ✨ |

---

## 🎯 Best Practices

### For Log Analysts
1. **Keep Bundles panel open** - quick access to import button
2. **Use QCSONE format** - zero-click imports
3. **Name archives consistently** - enables auto-detection
4. **Review output channel** - see what was detected

### For Teams
1. **Share QCSONE packages** - everyone benefits from auto-detection
2. **Document case IDs** - makes non-QCSONE imports faster
3. **Use consistent naming** - `{case_id}_description.zip`

---

## 🔗 Related Documentation

- `TODO_BUNDLE_UX_IMPROVEMENTS.md` - Complete UX roadmap
- `SESSION_SUMMARY_BUNDLE_UX_FEB23_2026.md` - Implementation details
- `PROJECT_STATUS.md` - Latest session updates
- `docs/USER_GUIDE_PROBLEMS_PANEL.md` - Problems panel control

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────┐
│  QUICK IMPORT CHEAT SHEET              │
├─────────────────────────────────────────┤
│  Location:    Bundles panel toolbar     │
│  Icon:        + (plus sign)             │
│  Action:      Opens file picker         │
│  Shortcut:    Custom (set in settings)  │
│                                          │
│  QCSONE:      Zero clicks (automatic)   │
│  Other:       Enter case ID + import    │
│                                          │
│  Result:      Bundle appears in panel   │
│  Format:      {case_id} bundle_{id}     │
└─────────────────────────────────────────┘
```

---

## ✅ Success Indicators

You're using the feature correctly when:

✅ You see the "+" button in Bundles panel toolbar  
✅ Clicking it opens a file picker immediately  
✅ QCSONE files import without prompting for case ID  
✅ Other files prompt for case ID with validation  
✅ Bundles appear with format: `{case_id} bundle_{id}`  
✅ Import completes with progress notifications  

---

**Last Updated**: February 23, 2026  
**Extension Version**: v0.0.188+  
**Quick Tip**: Click "+", select QCSONE file, done! ⚡