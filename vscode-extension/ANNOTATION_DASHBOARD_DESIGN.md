# Annotation Dashboard Design

## Overview
Create a TagScout-style annotation dashboard in the VS Code extension to display pattern detections in a rich, interactive card-based layout.

## Current State
- **Results Tree View**: Simple hierarchical list (Errors → Warnings → Info)
- **Categories View**: Flat list of categories with counts
- **Timeline View**: Chronological event list

## Proposed Enhancement
New **Annotation Dashboard** webview panel with collapsible cards similar to TagScout web UI.

---

## Component Structure

### 1. Dashboard Container
```
┌─────────────────────────────────────────────────────────────┐
│ [Filter Bar]                                                 │
│ ☐ ERROR  ☐ WARNING  ☐ INFO  [Search: ___________] [Sort ▼] │
├─────────────────────────────────────────────────────────────┤
│ [Annotation Card 1]                                          │
│ [Annotation Card 2]                                          │
│ [Annotation Card 3]                                          │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Annotation Card Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Category]  [⚠ Log Level: ERROR]  │  [file.log#L123]  [Hide] │
├─────────────────────────────────────────────────────────────┤
│ 📅 2026-01-29T16:57:57.486Z                             [▼] │
│                                                             │
│ Pattern: Webex Org ID                                       │
│ Severity: ERROR (triggered by log level)                    │
│ Matched: 8b14563b-ceb3-4188-a6e5-403177e0a48d               │
│                                                             │
│ Extracted Fields:                                           │
│   • org_id: 8b14563b-ceb3-4188-a6e5-403177e0a48d            │
│   • level: ERROR                                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Raw Log Line - Expandable]                                 │
│ 2026-01-29T16:57:57.486Z <Error> [pid:tid] Wdm.cpp:2413... │
│                           ^^^^^^^^ highlighted match        │
└─────────────────────────────────────────────────────────────┘
```

### 3. VS Code Theming Integration
Use Codicons and CSS variables for proper VS Code theme compatibility:

**Colors:**
- `--vscode-errorForeground` (red) - Error severity
- `--vscode-editorWarning-foreground` (yellow) - Warning severity  
- `--vscode-editorInfo-foreground` (blue) - Info severity
- `--vscode-badge-background` - Category badges
- `--vscode-panel-background` - Card background
- `--vscode-panel-border` - Card borders

**Icons:**
- `$(error)` - Error badge
- `$(warning)` - Warning badge
- `$(info)` - Info badge
- `$(chevron-down)` / `$(chevron-right)` - Collapse/expand
- `$(eye-closed)` - Hide annotation
- `$(file)` - File link
- `$(calendar)` - Timestamp

---

## Implementation Plan

### Phase 1: Core Structure
1. **Create `annotationDashboardPanel.ts`**
   - WebviewPanel management (similar to scoutAnalyzerPanel.ts)
   - Message handling for filter/sort/hide actions
   - Data fetching from LSP detections

2. **HTML Template Structure**
   ```html
   <div class="dashboard-container">
     <div class="filter-bar">
       <div class="severity-filters">
         <label><input type="checkbox" checked> ERROR</label>
         <label><input type="checkbox" checked> WARNING</label>
         <label><input type="checkbox" checked> INFO</label>
       </div>
       <input type="text" placeholder="Search annotations..." />
       <select class="sort-dropdown">
         <option>Sort by Time</option>
         <option>Sort by Severity</option>
         <option>Sort by Category</option>
       </select>
     </div>
     
     <div class="annotations-list">
       <!-- Annotation cards rendered here -->
     </div>
   </div>
   ```

3. **Annotation Card Component**
   ```html
   <div class="annotation-card" data-severity="error">
     <div class="card-header">
       <span class="badge category">System</span>
       <span class="badge log-level">ERROR</span>
       <a href="#" class="file-link">file.log:123</a>
       <button class="hide-btn">$(eye-closed) Hide</button>
     </div>
     
     <div class="card-content">
       <div class="timestamp">$(calendar) 2026-01-29T16:57:57.486Z</div>
       <div class="pattern-info">
         <strong>Pattern:</strong> Webex Org ID<br>
         <strong>Severity:</strong> ERROR (triggered by log_level)<br>
       </div>
       
       <div class="extracted-fields">
         <strong>Extracted Fields:</strong>
         <ul>
           <li><code>org_id</code>: 8b14563b-ceb3-4188-a6e5-403177e0a48d</li>
           <li><code>level</code>: ERROR</li>
         </ul>
       </div>
       
       <button class="expand-toggle">$(chevron-down) Show Raw Log</button>
       <div class="raw-log-section" hidden>
         <pre><code>2026-01-29T16:57:57.486Z &lt;Error&gt; [pid:tid] ...</code></pre>
       </div>
     </div>
   </div>
   ```

### Phase 2: Styling
**CSS Variables for Theming:**
```css
.annotation-card {
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-left: 4px solid var(--severity-color);
  margin-bottom: 8px;
  border-radius: 4px;
  padding: 12px;
}

.annotation-card[data-severity="error"] {
  --severity-color: var(--vscode-errorForeground);
}

.annotation-card[data-severity="warning"] {
  --severity-color: var(--vscode-editorWarning-foreground);
}

.annotation-card[data-severity="info"] {
  --severity-color: var(--vscode-editorInfo-foreground);
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-right: 6px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
}

.badge.category {
  background: var(--vscode-descriptionForeground);
  color: var(--vscode-panel-background);
}

.badge.log-level {
  text-transform: uppercase;
}

.raw-log-section {
  background: var(--vscode-textCodeBlock-background);
  border-top: 1px solid var(--vscode-panel-border);
  margin-top: 8px;
  padding: 8px;
}
```

### Phase 3: Interactivity

**JavaScript Features:**
```javascript
// 1. Collapse/Expand Cards
function toggleRawLog(cardId) {
  const rawSection = document.querySelector(`#card-${cardId} .raw-log-section`);
  const toggleBtn = document.querySelector(`#card-${cardId} .expand-toggle`);
  
  if (rawSection.hidden) {
    rawSection.hidden = false;
    toggleBtn.innerHTML = '$(chevron-up) Hide Raw Log';
  } else {
    rawSection.hidden = true;
    toggleBtn.innerHTML = '$(chevron-down) Show Raw Log';
  }
}

// 2. Hide Annotation Type
function hideAnnotationType(category) {
  const cards = document.querySelectorAll(`[data-category="${category}"]`);
  cards.forEach(card => card.style.display = 'none');
  
  // Persist hidden categories
  vscode.postMessage({
    command: 'hideCategory',
    category: category
  });
}

// 3. Filter by Severity
function updateFilters() {
  const showError = document.querySelector('#filter-error').checked;
  const showWarning = document.querySelector('#filter-warning').checked;
  const showInfo = document.querySelector('#filter-info').checked;
  
  document.querySelectorAll('.annotation-card').forEach(card => {
    const severity = card.dataset.severity;
    card.style.display = (
      (severity === 'error' && showError) ||
      (severity === 'warning' && showWarning) ||
      (severity === 'info' && showInfo)
    ) ? 'block' : 'none';
  });
}

// 4. Jump to Line in Editor
function jumpToLine(filePath, lineNumber) {
  vscode.postMessage({
    command: 'jumpToLine',
    filePath: filePath,
    line: lineNumber
  });
}

// 5. Search Annotations
function searchAnnotations(query) {
  const lowerQuery = query.toLowerCase();
  document.querySelectorAll('.annotation-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(lowerQuery) ? 'block' : 'none';
  });
}
```

### Phase 4: Data Integration

**TypeScript Interface:**
```typescript
interface AnnotationCardData {
  id: string;
  category: string;
  patternName: string;
  severity: 'error' | 'warning' | 'info';
  logLevel?: string;  // NEW: From conditional severity
  finalSeverity?: string;  // NEW: Final computed severity
  timestamp: string;
  filePath: string;
  lineNumber: number;
  matchedText: string;
  rawLogLine: string;
  extractedFields?: Record<string, string>;  // NEW: From capture_fields
  severityTriggerDescription?: string;  // NEW: Why severity changed
}
```

**Fetch Detections from LSP:**
```typescript
class AnnotationDashboardPanel {
  private async loadAnnotations(): Promise<AnnotationCardData[]> {
    // Get detections from existing DiagnosticCollection
    const diagnostics = vscode.languages.getDiagnostics();
    
    const annotations: AnnotationCardData[] = [];
    
    for (const [uri, fileDiagnostics] of diagnostics) {
      const document = await vscode.workspace.openTextDocument(uri);
      
      for (const diagnostic of fileDiagnostics) {
        const lineNumber = diagnostic.range.start.line;
        const line = document.lineAt(lineNumber);
        
        annotations.push({
          id: `${uri.fsPath}-${lineNumber}`,
          category: diagnostic.source || 'Unknown',
          patternName: diagnostic.code?.toString() || 'Pattern',
          severity: this.mapSeverity(diagnostic.severity),
          logLevel: diagnostic.tags?.includes('log-level') 
            ? this.extractLogLevel(diagnostic) 
            : undefined,
          finalSeverity: diagnostic.tags?.includes('final-severity')
            ? this.extractFinalSeverity(diagnostic)
            : undefined,
          timestamp: this.extractTimestamp(line.text),
          filePath: uri.fsPath,
          lineNumber: lineNumber + 1,  // 1-indexed
          matchedText: diagnostic.message,
          rawLogLine: line.text,
          extractedFields: this.extractFields(diagnostic),
          severityTriggerDescription: diagnostic.tags?.includes('trigger')
            ? this.extractTriggerReason(diagnostic)
            : undefined
        });
      }
    }
    
    return annotations;
  }
  
  private mapSeverity(vsSeverity: vscode.DiagnosticSeverity): 'error' | 'warning' | 'info' {
    switch (vsSeverity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      default:
        return 'info';
    }
  }
}
```

---

## Enhanced Features (Leveraging Conditional Severity)

### 1. Severity Evolution Indicator
Show when severity changed due to conditional triggers:

```html
<div class="severity-info">
  <span class="severity-badge error">ERROR</span>
  <span class="severity-evolution">
    ⬆ Escalated from WARNING
    <span class="trigger-reason">
      Log level: ERROR detected
    </span>
  </span>
</div>
```

### 2. Field Extraction Display
Show captured fields from regex named groups:

```html
<div class="extracted-fields">
  <details>
    <summary>$(database) Extracted Fields (3)</summary>
    <table>
      <tr><td><code>org_id</code></td><td>8b14563b-ceb3-4188...</td></tr>
      <tr><td><code>duration</code></td><td>5432 ms</td></tr>
      <tr><td><code>status</code></td><td>failed</td></tr>
    </table>
  </details>
</div>
```

### 3. Trigger Condition Tooltip
Hover over severity badge to see why it was triggered:

```html
<span class="badge log-level" 
      title="Severity changed: Log level 'ERROR' matched trigger rule">
  ERROR
</span>
```

---

## User Workflows

### 1. Analyze Annotations
- User opens log file
- LSP detects patterns and creates diagnostics
- User clicks "$(notebook) Annotation Dashboard" in sidebar
- Dashboard loads all detections as rich cards
- User can filter, search, sort, and expand details

### 2. Jump to Source
- User clicks file link in card header
- Editor jumps to line number with matched pattern
- Diagnostic squiggle visible in editor

### 3. Hide Noisy Patterns
- User clicks "Hide" on repetitive annotation
- All cards with that category are hidden
- Preference saved to workspace settings
- User can unhide from filter bar

### 4. Investigate Severity Changes
- User sees ERROR badge on card (was INFO)
- Clicks "Why ERROR?" link
- Popup shows: "Triggered by condition: duration > 5000 ms"
- User understands conditional severity system

---

## Technical Decisions

### Why Webview vs Tree View?
| Feature | Webview Panel | Tree View |
|---------|---------------|-----------|
| Rich HTML/CSS | ✅ Full control | ❌ Limited styling |
| Collapsible cards | ✅ Any layout | ❌ Hierarchical only |
| Inline code highlighting | ✅ Yes | ❌ Plain text |
| Custom icons/badges | ✅ Any HTML | ❌ Codicons only |
| Performance (1000+ items) | ⚠️ Good (virtual scroll) | ✅ Excellent (native) |
| VS Code theme integration | ✅ CSS variables | ✅ Automatic |

**Decision**: Use Webview for annotation dashboard, keep existing Tree View for quick navigation.

### Integration with Existing Views
- **Results Tree View**: Keep as-is for fast hierarchical browsing
- **Annotation Dashboard**: New webview panel for rich detail view
- **Categories View**: Keep as-is for filtering
- **Timeline View**: Keep as-is for chronological analysis

**User can choose preferred view via command palette or sidebar icons.**

---

## Implementation Checklist

### Phase 1: Basic Dashboard
- [x] Create `annotationDashboardPanel.ts` (webview management)
- [x] HTML template with card layout
- [x] CSS styling with VS Code theme variables
- [x] Load detections from DiagnosticCollection
- [x] Render annotation cards
- [x] Collapse/expand raw log section

### Phase 2: Filtering & Search
- [x] Severity filter checkboxes (ERROR/WARNING/INFO)
- [x] Search input with live filtering
- [x] Sort dropdown (Time/Severity/Category)
- [x] Hide annotation type button
- [x] Persist filter preferences in settings

### Phase 3: Conditional Severity Display
- [x] Show `log_level` from Detection
- [x] Show `final_severity` from Detection
- [x] Display severity evolution (escalated/de-escalated)
- [x] Show trigger reason tooltip
- [x] Display extracted fields table

### Phase 4: Interactivity
- [x] Jump to line on file link click
- [x] Copy matched text on click
- [x] Export annotations to JSON
- [x] Refresh dashboard on file save
- [ ] Sync with Results Tree View selection

### Phase 5: Performance
- [x] Virtual scrolling for large result sets (100+ items)
- [x] Lazy rendering of collapsed sections
- [x] Debounce search input
- [x] Cache rendered cards

---

## File Structure

```
vscode-extension/
├── src/
│   ├── annotationDashboardPanel.ts     [NEW - Main panel class]
│   ├── annotationCardRenderer.ts       [NEW - Card HTML generation]
│   ├── annotationDataProvider.ts       [NEW - Fetch from diagnostics]
│   └── extension.ts                     [UPDATE - Register command]
├── media/
│   ├── annotationDashboard.css         [NEW - Styling]
│   └── annotationDashboard.js          [NEW - Client-side JS]
└── package.json                         [UPDATE - Add command]
```

---

## Commands to Add

```json
{
  "command": "log-scout.openAnnotationDashboard",
  "title": "Open Annotation Dashboard",
  "category": "Log Scout",
  "icon": "$(notebook)"
}
```

**Keybinding suggestion**: `Ctrl+Alt+A` (or `Cmd+Alt+A` on Mac)

---

## Next Steps

1. **Prototype Dashboard**: Create basic webview with static card data
2. **Test with Real Logs**: Use existing Jabber log examples
3. **Integrate Conditional Severity**: Show log_level and trigger reasons
4. **User Testing**: Get feedback on layout and usability
5. **Performance Optimization**: Virtual scroll for large files

---

## Benefits Over Current Tree View

✅ **Richer Information**: Show timestamps, extracted fields, raw logs in one view  
✅ **Better Visualization**: Color-coded severity, collapsible sections  
✅ **Enhanced Usability**: Search, filter, hide noisy patterns  
✅ **Conditional Severity Context**: See why severity changed (new feature)  
✅ **Familiar UI**: Matches TagScout web app experience  
✅ **Flexible Layout**: Can add charts, statistics, trend analysis later  

---

## Future Enhancements

- **Statistics Panel**: Count by severity, category, time range
- **Time-based Filtering**: Show annotations from last hour/day
- **Pattern Frequency Chart**: Bar chart of most common patterns
- **Export to PDF**: Generate report with all annotations
- **Compare Logs**: Side-by-side annotation comparison
- **AI Summarization**: LLM-generated summary of key issues
