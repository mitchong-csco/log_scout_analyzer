# Reset View Feature

**Version:** 0.0.2+  
**Date:** February 6, 2026  
**Status:** ✅ Implemented

---

## Overview

The Reset View feature solves the problem of "losing" your analysis when you filter or group results. Now you can easily return to the default view without re-running the analysis.

---

## Problem Solved

### Before
- User groups results by Category or File
- Wants to go back to default Severity view
- Had to remember which grouping was default
- No clear way to reset the view
- Potentially lost context of original analysis

### After
✅ **Clear mode indicator** at top of Results tree  
✅ **Reset View button** in toolbar  
✅ **Preserved original results** - no data loss  
✅ **Visual feedback** showing current grouping mode  
✅ **Tooltip help** explaining how to change views  

---

## Features Added

### 1. Mode Indicator
At the top of the Results tree view, you'll see:
```
📊 By Severity (X issues)
```

This changes based on your current grouping:
- `📊 By Severity` - Default view (errors, warnings, info)
- `📊 By Category` - Grouped by pattern category
- `📊 By File` - Grouped by file name

### 2. Reset View Command
**Location:** Results tree view toolbar  
**Icon:** Clear-all (⊗)  
**Command:** `Scout: Reset View`

**What it does:**
- Restores default grouping (by severity)
- Preserves all analysis results
- Shows confirmation message
- Updates mode indicator

### 3. Tooltip Help
Hover over the mode indicator to see:
- Current view mode
- Total issue count
- Available grouping options
- How to reset the view

---

## How to Use

### Scenario 1: Reset After Grouping

1. Run analysis on a log file
2. Click "Group by Category" button
3. View changes to show categories
4. Want to go back to default?
5. **Click "Reset View" button**
6. View returns to "By Severity"

### Scenario 2: Check Current Mode

1. Open Results tree view
2. Look at the top item: `📊 By Severity`
3. Hover for more details
4. See current grouping mode and total count

### Scenario 3: Switch Between Views

1. Start in default view (By Severity)
2. Click "Group by File" - see results by file
3. Click "Group by Category" - see results by category
4. Click "Reset View" - back to severity
5. All results preserved throughout

---

## Technical Details

### Implementation

**Modified Files:**
- `src/resultsTreeProvider.ts` - Added reset functionality
- `src/extension.ts` - Added reset command
- `package.json` - Added command and menu item

**Key Changes:**

1. **Store Original Results**
   ```typescript
   private originalResults: ResultItem[] = [];
   
   setResults(results: ResultItem[]): void {
       this.results = results;
       this.originalResults = [...results]; // Store copy
       this.refresh();
   }
   ```

2. **Reset Method**
   ```typescript
   resetGrouping(): void {
       this.groupBy = "severity";
       this.results = [...this.originalResults];
       this.refresh();
   }
   ```

3. **Mode Indicator**
   ```typescript
   const modeIndicator = new ResultTreeItem(
       `📊 ${this.getGroupByLabel()}`,
       `${this.results.length} issues`,
       // ... with tooltip and icon
   );
   ```

### Data Preservation

- Original results are stored when analysis completes
- Grouping operations work on the stored data
- Reset restores the original data set
- No re-analysis required

---

## UI/UX Improvements

### Visual Feedback

1. **Mode Indicator** - Always visible at top of tree
2. **Icon** - Blue filter icon (📊)
3. **Count** - Shows total issues in current view
4. **Tooltip** - Helpful information on hover

### Button Placement

Reset View button appears in the Results tree toolbar:
```
[Refresh] [Group by Severity] [Group by Category] [Group by File] [Reset View] [Export]
```

### User Experience Flow

```
Analysis Complete
    ↓
Default View (By Severity)
    ↓
User Groups by Category ← Mode shows "By Category"
    ↓
User Groups by File ← Mode shows "By File"
    ↓
User Clicks Reset ← Mode returns to "By Severity"
    ↓
Back to Default View (no data lost!)
```

---

## Commands

### New Command

**Command ID:** `logScoutAnalyzer.resetView`  
**Title:** Scout: Reset View  
**Icon:** $(clear-all)  
**Keyboard Shortcut:** None (use toolbar button)

### Access Methods

1. **Toolbar Button** - Click reset icon in Results tree
2. **Command Palette** - `Ctrl+Shift+P` → "Scout: Reset View"
3. **Right-click Menu** - (in Results tree toolbar)

---

## Configuration

No new settings required. The feature works automatically with existing configuration.

### Existing Settings That Apply

```json
"logScoutAnalyzer.showResultsPanel": true
```
Controls whether results panel appears after analysis.

---

## Benefits

### For Users
- ✅ **No confusion** - Always know which view you're in
- ✅ **Easy reset** - One click to return to default
- ✅ **No data loss** - Original analysis preserved
- ✅ **Better navigation** - Switch between views freely

### For Workflows
- ✅ **Explore freely** - Try different groupings without fear
- ✅ **Quick comparison** - Switch views to compare perspectives
- ✅ **Consistent baseline** - Reset ensures everyone sees same default
- ✅ **Less re-analysis** - No need to re-run analysis to reset

---

## Examples

### Example 1: Exploring Different Views

```
1. Analyze "app.log" with 50 issues
2. See: 📊 By Severity
   - Errors (10)
   - Warnings (25)
   - Info (15)

3. Click "Group by Category"
4. See: 📊 By Category
   - Connection Issues (20)
   - Authentication (15)
   - Performance (10)
   - Other (5)

5. Click "Reset View"
6. Back to: 📊 By Severity
   - Errors (10)
   - Warnings (25)
   - Info (15)
```

### Example 2: Multi-File Analysis

```
1. Analyze directory with 10 log files (200 issues)
2. Default view groups all by severity
3. Click "Group by File" to see issues per file
4. Identify problematic file
5. Click "Reset View" to see severity distribution
6. Now can compare: which file has most errors?
```

---

## Troubleshooting

### Mode Indicator Not Showing
**Problem:** Don't see the 📊 indicator at top

**Solution:**
1. Run an analysis first (tree must have results)
2. Check Results tree view is open
3. Expand the tree if collapsed
4. Reload VS Code window if still missing

### Reset Not Working
**Problem:** Click reset but view doesn't change

**Solution:**
1. Check if you're already in default view (By Severity)
2. Ensure analysis has completed
3. Try refreshing the tree view
4. Reload VS Code window

### Count Shows Wrong Number
**Problem:** Mode indicator shows different count than expected

**Solution:**
1. This is the total issue count across all files
2. Grouping doesn't change the total count
3. Run analysis again if count seems outdated
4. Use "Clear Results" then re-analyze

---

## Future Enhancements

Potential improvements:
- [ ] Remember last grouping preference per workspace
- [ ] Add keyboard shortcuts for grouping commands
- [ ] Filter results within groups
- [ ] Save/load custom view configurations
- [ ] Quick toggle between current and default view

---

## Related Features

### Works With:
- ✅ **Group by Severity** - Default grouping mode
- ✅ **Group by Category** - Group by pattern type
- ✅ **Group by File** - Group by source file
- ✅ **Refresh Results** - Updates current view
- ✅ **Export Results** - Exports in current grouping
- ✅ **Clear Results** - Clears all and resets to default

### Complements:
- **Scout Analyzer Panel** - Main analysis control
- **Problems Panel** - Shows all diagnostics
- **Scout Console** - Detailed analysis logs

---

## Version History

| Version | Change |
|---------|--------|
| 0.0.2+  | Initial implementation of reset view feature |

---

## Summary

The Reset View feature provides a clear way to navigate between different grouping modes while preserving your analysis results. The mode indicator keeps you informed of your current view, and the reset button provides a one-click way back to the default.

**Key Takeaway:** You can now explore different views of your analysis results without losing your place or needing to re-run the analysis.

---

**Installation:** Update to latest `log-scout-analyzer.vsix`  
**Documentation:** See `ANALYZER_PANEL.md` for related features  
**Status:** ✅ Ready to use