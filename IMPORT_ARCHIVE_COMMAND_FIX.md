# Import Archive Command Fix

## Problem

The "Scout: Import Log Archive" command was displaying as "Scout: Scout: Import Log Archive" in the VS Code Command Palette due to duplicate prefix configuration.

## Root Cause

In `vscode-extension/package.json`, the command definition had both:
- `"category": "Scout"` - which adds a "Scout:" prefix automatically
- `"title": "Scout: Import Log Archive"` - which already includes the "Scout:" prefix

This caused VS Code to display: **Scout: Scout: Import Log Archive**

## Solution

Removed the redundant `"category": "Scout"` line from the command definition.

### Before (Incorrect)
```json
{
  "command": "logScoutAnalyzer.importArchive",
  "title": "Scout: Import Log Archive",
  "category": "Scout",
  "icon": "$(cloud-upload)"
}
```

### After (Correct)
```json
{
  "command": "logScoutAnalyzer.importArchive",
  "title": "Scout: Import Log Archive",
  "icon": "$(cloud-upload)"
}
```

## Files Modified

- `vscode-extension/package.json` (Line 430-433)

## Command Registration

The command is properly registered in `vscode-extension/src/extension.ts` (Lines 3311-3345) and works correctly. The issue was purely cosmetic in how it appeared in the Command Palette.

## Installation

The fix has been packaged and installed:

```bash
cd vscode-extension
npx @vscode/vsce package --allow-star-activation --out log-scout-analyzer-fixed.vsix
code --install-extension log-scout-analyzer-fixed.vsix --force
```

## Verification

1. **Reload VS Code** (or restart)
2. Open Command Palette: `Ctrl+Shift+P`
3. Type "Scout: Import"
4. The command should now appear as: **Scout: Import Log Archive** (not duplicated)

## Notes

- The command functionality was never broken - it always worked correctly
- Only the display name in the Command Palette was affected
- Version incremented to 0.0.171 during the packaging process
- The command opens a file picker for `.zip`, `.tar`, `.gz`, `.tgz` archives
- Successfully imported archives create bundles in the Scout Bundles tree view

## Testing

After reloading VS Code:
```
Ctrl+Shift+P → "Scout: Import Log Archive" → Select test-data\small-test.zip
```

Expected behavior:
- File picker opens
- After selecting archive, import progress is shown
- Bundle appears in Scout Bundles tree view
- No "Scout: Scout:" duplication in command palette

## Status

✅ **FIXED** - Version 0.0.171 packaged with correction