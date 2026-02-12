# Phase 2 Implementation: Persistent Filter Preferences

## Overview
Phase 2 adds persistent filter preferences and hidden category management to the Annotation Dashboard, allowing users to maintain their preferred view settings across sessions.

## Features Implemented

### 1. Persistent Filter Checkboxes
- **Filter by Severity**: ERROR, WARNING, and INFO checkboxes now persist their checked state
- **Configuration Keys**:
  - `logScoutAnalyzer.dashboard.filterError` (default: true)
  - `logScoutAnalyzer.dashboard.filterWarning` (default: true)
  - `logScoutAnalyzer.dashboard.filterInfo` (default: true)
- When you uncheck a severity filter, it saves to workspace settings and remains unchecked when you reopen the dashboard

### 2. Persistent Sort Order
- **Sort Options**: Time, Severity, Category
- **Configuration Key**: `logScoutAnalyzer.dashboard.sortBy` (default: 'time')
- Your sort preference is saved and restored when you reopen the dashboard

### 3. Hidden Category Management
- **Hide Categories**: Click the "Hide" button on any annotation card to hide all cards in that category
- **Persistent Storage**: Hidden categories are saved to `logScoutAnalyzer.dashboard.hiddenCategories` array
- **Show Hidden UI**: When categories are hidden, a banner appears at the top showing all hidden categories
- **Restore Categories**: Click on any category in the banner to unhide it and show those annotations again
- Hidden categories persist across dashboard reopens and window reloads

### 4. Visual Feedback
- **Hidden Categories Banner**: 
  - Appears below the filter bar when categories are hidden
  - Shows eye-closed icon and list of hidden category names
  - Each category has a clickable button with eye icon to restore it
  - Banner automatically hides when no categories are hidden

## Technical Implementation

### Backend (Extension Host)
**File**: `src/annotationDashboardPanel.ts`

Added methods:
- `_sendFilterState()`: Sends current filter preferences to webview on load
- `_saveFilterState(state)`: Persists filter checkbox and sort preferences to workspace config
- `_unhideCategory(category)`: Removes category from hidden list and reloads annotations

Message handlers added:
- `saveFilterState`: Called when user changes filters
- `unhideCategory`: Called when user clicks category restore button
- `getFilterState`: Sends current state to webview

### Frontend (Webview Client)
**File**: `webview-src/annotationDashboard.ts`

Added functions:
- `applyFilterState(state)`: Restores filter checkboxes, sort dropdown, and hidden categories on load
- `updateHiddenCategoriesUI(categories)`: Builds the hidden categories banner with restore buttons
- Modified `handleFilterChange()`: Now checks global `hiddenCategories` array to hide matching cards
- Modified `handleSortChange()`: Saves sort preference to config

Global state:
- `hiddenCategories: string[]`: Tracks which categories are currently hidden

### Configuration Schema
**File**: `package.json`

Added 5 new configuration properties:
```json
{
  "logScoutAnalyzer.dashboard.hiddenCategories": {
    "type": "array",
    "items": { "type": "string" },
    "default": [],
    "description": "Categories hidden from the annotation dashboard"
  },
  "logScoutAnalyzer.dashboard.filterError": {
    "type": "boolean",
    "default": true,
    "description": "Show ERROR severity annotations"
  },
  "logScoutAnalyzer.dashboard.filterWarning": {
    "type": "boolean",
    "default": true,
    "description": "Show WARNING severity annotations"
  },
  "logScoutAnalyzer.dashboard.filterInfo": {
    "type": "boolean",
    "default": true,
    "description": "Show INFO severity annotations"
  },
  "logScoutAnalyzer.dashboard.sortBy": {
    "type": "string",
    "enum": ["time", "severity", "category"],
    "default": "time",
    "description": "Default sort order for annotations"
  }
}
```

### Styling
**File**: `media/annotationDashboard.css`

Added styles for hidden categories section:
- `.hidden-categories-section`: Banner container
- `.hidden-categories-header`: Header with eye-closed icon
- `.hidden-categories-list`: Flex container for category buttons
- `.unhide-btn`: Restore button styling with hover effects

## Testing Instructions

### Test 1: Filter Persistence
1. Open Annotation Dashboard: `Ctrl+Shift+P` → "Scout: Open Annotation Dashboard"
2. Uncheck the "WARNING" checkbox
3. Close the dashboard
4. Reopen the dashboard
5. ✅ **Expected**: WARNING checkbox should still be unchecked

### Test 2: Sort Persistence
1. Open Annotation Dashboard
2. Change sort dropdown to "Sort by Severity"
3. Close the dashboard
4. Reopen the dashboard
5. ✅ **Expected**: Dropdown should show "Sort by Severity"

### Test 3: Hide Category
1. Open Annotation Dashboard
2. Click "Hide" button on any annotation card (e.g., "SIGN_IN_FAILED")
3. ✅ **Expected**: 
   - All cards with that category disappear
   - Hidden categories banner appears at top
   - Category name shows in banner with eye icon button

### Test 4: Unhide Category
1. Follow Test 3 to hide a category
2. Click on the category button in the hidden categories banner
3. ✅ **Expected**: 
   - All cards with that category reappear
   - Banner disappears (if no other categories hidden)

### Test 5: Multiple Hidden Categories
1. Hide 2-3 different categories
2. ✅ **Expected**: All hidden categories show in banner
3. Close and reopen dashboard
4. ✅ **Expected**: All categories remain hidden, banner shows all of them
5. Click restore buttons one by one
6. ✅ **Expected**: Each category reappears, last one removes banner

### Test 6: Persistence Across Window Reload
1. Hide a category and uncheck WARNING filter
2. Close VS Code completely
3. Reopen VS Code
4. Open Annotation Dashboard
5. ✅ **Expected**: Category still hidden, WARNING still unchecked

### Test 7: Configuration Check
1. Open Settings: `Ctrl+,`
2. Search for "logScoutAnalyzer.dashboard"
3. ✅ **Expected**: See all 5 new settings:
   - Hidden Categories (array)
   - Filter Error (checkbox)
   - Filter Warning (checkbox)
   - Filter Info (checkbox)
   - Sort By (dropdown)

## Configuration Files
Settings are stored in `.vscode/settings.json` in your workspace:

```json
{
  "logScoutAnalyzer.dashboard.hiddenCategories": ["SIGN_IN_FAILED", "AUTH_ERROR"],
  "logScoutAnalyzer.dashboard.filterError": true,
  "logScoutAnalyzer.dashboard.filterWarning": false,
  "logScoutAnalyzer.dashboard.filterInfo": true,
  "logScoutAnalyzer.dashboard.sortBy": "severity"
}
```

## Known Limitations
1. Settings are workspace-specific (not global across all workspaces)
2. Hidden categories apply to all annotation cards universally (cannot selectively show/hide per file)
3. Filter changes save immediately on each interaction (no "Apply" button needed)

## Next Phase Preview
**Phase 3** will add:
- Conditional severity display (show escalation from WARNING → ERROR)
- Severity trigger tooltips on hover
- Better extracted fields presentation
- Show original vs final severity differences

## Version
Phase 2 completed: January 2025  
Extension version: 0.0.40  
VSIX file: `log-scout-analyzer-phase2.vsix`
