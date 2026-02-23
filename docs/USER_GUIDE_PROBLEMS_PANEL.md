# Problems Panel Control - User Guide

**Date**: February 23, 2026  
**Component**: VS Code Extension  
**Setting**: `problems.autoReveal`

---

## Overview

When Log Scout Analyzer finds patterns in log files, it publishes diagnostics (errors, warnings, info) to VS Code's **Problems panel**. By default, VS Code automatically opens this panel when diagnostics are detected, which can be disruptive during log analysis workflows.

This guide explains how to control the Problems panel behavior.

---

## The Setting: `problems.autoReveal`

VS Code provides a built-in setting to control when the Problems panel automatically opens.

### Setting Values

| Value | Behavior |
|-------|----------|
| `always` | **Default** - Problems panel opens every time diagnostics are published |
| `onProblem` | Opens only when there are errors or warnings (not info) |
| `never` | **Recommended for Log Scout** - Never automatically opens |

---

## How to Configure

### Method 1: Settings UI (Recommended)

1. Open VS Code Settings:
   - **Windows/Linux**: `Ctrl+,`
   - **Mac**: `Cmd+,`
   - Or: `File > Preferences > Settings`

2. Search for: `problems.autoReveal`

3. Select your preferred option from the dropdown:
   - **For Log Analysis**: Choose `never`
   - **For Development**: Choose `always` or `onProblem`

4. Close Settings (changes apply immediately)

### Method 2: Settings JSON

1. Open Settings JSON:
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type: `Preferences: Open Settings (JSON)`
   - Press Enter

2. Add the setting:
   ```json
   {
     "problems.autoReveal": "never"
   }
   ```

3. Save the file (`Ctrl+S` or `Cmd+S`)

### Method 3: Workspace Settings (Team-wide)

To set this for everyone in your project:

1. Create/edit `.vscode/settings.json` in your workspace root:
   ```json
   {
     "problems.autoReveal": "never"
   }
   ```

2. Commit to version control

3. All team members will inherit this setting

---

## Recommended Settings by Use Case

### Use Case 1: Log Analysis (Recommended)

**Goal**: Focus on custom Log Scout views, not Problems panel

```json
{
  "problems.autoReveal": "never"
}
```

**Access Problems Panel Manually**:
- Click Problems icon in Activity Bar
- Or: `Ctrl+Shift+M` (Windows/Linux) / `Cmd+Shift+M` (Mac)

### Use Case 2: Development Work

**Goal**: See problems immediately while coding

```json
{
  "problems.autoReveal": "always"
}
```

### Use Case 3: Mixed Usage

**Goal**: See errors but not info/warnings

```json
{
  "problems.autoReveal": "onProblem"
}
```

---

## Why Log Scout Doesn't Control This

**Design Philosophy**: 
- The Problems panel is a core VS Code feature
- User preferences vary (some want it, some don't)
- VS Code provides the `problems.autoReveal` setting for user control
- Extensions should respect user settings, not override them

**Alternative Approaches Considered**:
1. ❌ **Programmatically suppress panel** - Not supported by VS Code API
2. ❌ **Custom diagnostic collection** - Would bypass useful Problems panel features
3. ✅ **Document user setting** - Empowers users to choose (current approach)

---

## How Log Scout Uses Diagnostics

Log Scout publishes diagnostics for:
- **Errors** 🔴 - Critical patterns detected (e.g., crashes, exceptions)
- **Warnings** 🟡 - Warning patterns (e.g., connection failures, timeouts)
- **Info** 🔵 - Informational patterns (e.g., state changes, notable events)
- **Hint** ⚪ - Debug/trace level patterns

### Viewing Diagnostics

You can view diagnostics in multiple places:

1. **Problems Panel** (`Ctrl+Shift+M` / `Cmd+Shift+M`)
   - All diagnostics across all files
   - Sortable, filterable
   - Good for overview

2. **Log Scout Results Tree** (Sidebar)
   - Custom grouping (by severity, category, file)
   - Pattern details and context
   - Jump to source
   - **Recommended for log analysis**

3. **Inline in Editor**
   - Squiggly underlines
   - Hover for details
   - Quick actions

4. **Gutter Icons**
   - Red/yellow/blue icons in editor gutter
   - Click to see details

---

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Toggle Problems Panel | `Ctrl+Shift+M` | `Cmd+Shift+M` |
| Next Problem | `F8` | `F8` |
| Previous Problem | `Shift+F8` | `Shift+F8` |
| Open Settings | `Ctrl+,` | `Cmd+,` |

---

## Troubleshooting

### "Problems panel still opens automatically"

**Check**:
1. Verify setting is applied: Open Settings UI and search `problems.autoReveal`
2. Make sure you saved the JSON file (if using JSON method)
3. Reload VS Code window: `Ctrl+Shift+P` → `Developer: Reload Window`

### "I want the panel for code, but not for logs"

**Solution**: Use workspace settings
1. For code projects: Keep user setting as `always`
2. For log analysis workspace: Add `.vscode/settings.json` with `"problems.autoReveal": "never"`

### "Can I toggle this with a keyboard shortcut?"

**Not directly**, but you can:
1. Create a task to switch settings
2. Use multiple VS Code profiles (VS Code 1.75+)
3. Toggle the panel manually: `Ctrl+Shift+M` / `Cmd+Shift+M`

---

## Related Settings

You may also want to configure:

### Problems Panel Visibility
```json
{
  // Keep panel visible even when empty
  "problems.showCurrentInStatus": true
}
```

### Problem Matchers (for tasks)
```json
{
  // Don't show problems from build tasks in panel
  "problemMatcher": []
}
```

### File Decorations
```json
{
  // Show problem counts in Explorer
  "problems.decorations.enabled": true
}
```

---

## Example Configurations

### Configuration 1: Log Analyst
```json
{
  "problems.autoReveal": "never",
  "problems.showCurrentInStatus": false,
  "logScoutAnalyzer.lsp.enabled": true,
  "workbench.activityBar.visible": true
}
```

### Configuration 2: DevOps Engineer (Mixed Usage)
```json
{
  "problems.autoReveal": "onProblem",
  "problems.showCurrentInStatus": true
}
```

### Configuration 3: Full Control (Never Show Automatically)
```json
{
  "problems.autoReveal": "never",
  "problems.decorations.enabled": false,
  "problems.showCurrentInStatus": false
}
```

---

## Summary

✅ **Set `problems.autoReveal` to `never`** for best Log Scout experience  
✅ **Access Problems panel manually** with `Ctrl+Shift+M` when needed  
✅ **Use Log Scout Results Tree** for pattern analysis (better UX)  
✅ **Works immediately** - no extension reload required  

---

## Links

- [VS Code Problems Panel Docs](https://code.visualstudio.com/docs/editor/editingevolved#_errors-and-warnings)
- [VS Code Settings Reference](https://code.visualstudio.com/docs/getstarted/settings)
- [Log Scout Analyzer Extension](../../README.md)

---

**Last Updated**: February 23, 2026  
**Extension Version**: v0.0.186+