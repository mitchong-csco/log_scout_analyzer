# VSCode Extension Field Verification Report

## Current Status

**The VSCode extension currently has a LOCAL pattern engine** and is not yet consuming LSP diagnostics from the server.

### Current Architecture:
```
User edits log file
    ↓
Local PatternEngine (patternEngine.ts) analyzes
    ↓
DiagnosticsProvider creates VSCode diagnostics
    ↓
ResultsTreeProvider displays results
    ↓
UI renders
```

**Missing Link:**
```
LSP Server publishes diagnostics
    ↓
[NOT CONNECTED] - Extension doesn't consume them yet
```

---

## What Needs to be Updated

To integrate the new LSP diagnostic data structure, the VSCode extension needs:

### 1. ResultItem Interface Update (resultsTreeProvider.ts)

**Current:**
```typescript
export interface ResultItem {
    severity: "error" | "warning" | "info" | "debug";
    line: number;
    column: number;
    message: string;
    matchedText: string;
    context: string;
    timestamp?: Date;
    category?: string;
    patternId?: string;
    patternName?: string;
    uri: vscode.Uri;
    template?: string;           // Already here ✓
    mergedTemplate?: string;     // Already here ✓
    extractedFields?: Record<string, string>;
    patternRegex?: string;       // Already here ✓
    diagnosticData?: any;        // Already here ✓
}
```

**Needed Updates:**
```typescript
export interface ResultItem {
    severity: "error" | "warning" | "info" | "debug";
    line: number;
    column: number;
    message: string;
    matchedText: string;
    context: string;
    timestamp?: Date;
    category?: string;
    patternId?: string;
    patternName?: string;
    uri: vscode.Uri;
    
    // OLD NAMES (for backward compatibility with current code)
    template?: string;                          // ← Keep for now
    mergedTemplate?: string;                    // ← Keep for now
    extractedFields?: Record<string, string>;   // ← Keep for now
    patternRegex?: string;                      // ← Keep for now
    diagnosticData?: any;                       // ← Keep for now
    
    // NEW NAMES (to match LSP server output)
    template_raw?: string;                      // ← Raw template with {{ FIELD }}
    merged_template?: string;                   // ← Template with values
    log_line?: string;                          // ← Full original log line
    extracted_parameters?: Array<{name: string; value: string}>; // ← Structured
    pattern_id?: string;                        // ← Pattern ID
    pattern_regex?: string;                     // ← Regex (debugging)
    log_level?: string;                         // ← Log level
}
```

### 2. Where LSP Diagnostics Will Come From

The LSP server publishes diagnostics with structure:
```json
{
  "message": "merged_template_value",
  "code": "pattern_id",
  "severity": 1-4,
  "data": {
    "template": "raw template",
    "merged_template": "merged value",
    "log_line": "full original line",
    "extracted_parameters": [{name, value}],
    "pattern_id": "...",
    "pattern_name": "...",
    "category": "...",
    "log_level": "ERROR",
    // ... all TagScout fields
  }
}
```

### 3. Integration Points Needed

**File: lspClient.ts**
- Add handler for `onDiagnostics` or `onPublishDiagnostics` event
- Convert LSP diagnostics to ResultItem format
- Feed to resultsTreeProvider

**File: extension.ts**
- Listen to LSP diagnostic events
- Call resultsTreeProvider.setResults() with converted data
- Update UI components

### 4. Data Mapping (LSP → Extension)

```typescript
// How to convert LSP diagnostic to ResultItem
function convertLSPDiagnosticToResultItem(
    diagnostic: vscode.Diagnostic,
    uri: vscode.Uri
): ResultItem {
    const data = diagnostic.data as any;
    
    return {
        severity: convertSeverity(diagnostic.severity),
        line: diagnostic.range.start.line,
        column: diagnostic.range.start.character,
        message: diagnostic.message,
        
        // From LSP data
        template_raw: data.template,
        merged_template: data.merged_template,
        log_line: data.log_line,
        extracted_parameters: data.extracted_parameters || [],
        pattern_id: data.pattern_id,
        pattern_name: data.pattern_name,
        category: data.category,
        log_level: data.log_level,
        pattern_regex: data.pattern_regex,
        
        // For backward compatibility
        template: data.template,
        mergedTemplate: data.merged_template,
        extractedFields: toDict(data.extracted_parameters),
        patternRegex: data.pattern_regex,
        diagnosticData: data,
        
        // Basic fields
        matchedText: data.matched_text,
        context: data.log_line,
        timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
        uri: uri,
    };
}
```

---

## Field Name Mapping Reference

| LSP Server Field | Current Extension | Needed? | Status |
|------------------|-------------------|---------|--------|
| `template` | `template` | ✅ | Already matches |
| `merged_template` | `mergedTemplate` | ✅ | Need to standardize |
| `log_line` | `context`/`matchedText` | ✅ | New field needed |
| `extracted_parameters` | `extractedFields` | ✅ | Format differs |
| `pattern_id` | `patternId` | ✅ | Already matches |
| `pattern_name` | `patternName` | ✅ | Already matches |
| `category` | `category` | ✅ | Already matches |
| `pattern_regex` | `patternRegex` | ✅ | Already matches |
| `log_level` | N/A | ✅ | New field needed |
| `matched_text` | `matchedText` | ✅ | Already matches |
| `timestamp` | `timestamp` | ✅ | Already matches |

---

## Files That Need Updates

1. **resultsTreeProvider.ts**
   - Update ResultItem interface to include new field names
   - Add support for `extracted_parameters` as array

2. **lspClient.ts** (NEW INTEGRATION)
   - Add diagnostic handler
   - Convert LSP diagnostics to ResultItem
   - Feed to tree provider

3. **extension.ts**
   - Set up LSP diagnostic event listeners
   - Route diagnostics to resultsTreeProvider
   - Keep backward compatibility with local pattern engine

4. **UI Components** (resultsPanel.ts, etc.)
   - Update to use new field names where appropriate
   - Render `extracted_parameters` as list
   - Display `log_line` as citation

---

## Backward Compatibility Strategy

**To avoid breaking current code:**

1. Keep old field names (`template`, `mergedTemplate`, etc.)
2. Add new field names (`merged_template`, `extracted_parameters`, etc.)
3. Code can read from either
4. When LSP data arrives, populate both old and new names
5. Gradually migrate UI code to new names

---

## Current Field Usage in Extension

### resultsTreeProvider.ts
- Uses: `message`, `matchedText`, `category`, `patternName`, `patternId`
- Doesn't currently use: `template`, `mergedTemplate`, `extractedFields`

### resultsPanel.ts
- Uses: `severity`, `line`, `column`, `message`, `matchedText`, `context`, `category`
- Renders as: HTML table with columns for each field

### gutterDecorator.ts / annotationRenderer.ts
- Uses: Could benefit from `template`, `merged_template`, `extracted_parameters`

---

## Next Steps for Implementation

### Phase 1: Update Data Structures
1. Update `ResultItem` interface in `resultsTreeProvider.ts`
2. Add new field names alongside old ones
3. Ensure backward compatibility

### Phase 2: Add LSP Integration
1. Modify `lspClient.ts` to listen for diagnostics
2. Create converter function: LSP diagnostic → ResultItem
3. Feed converted diagnostics to resultsTreeProvider

### Phase 3: Update UI
1. Update components to display new fields
2. Render `extracted_parameters` as list
3. Show `log_line` as citation card

### Phase 4: Gradual Migration
1. Deprecate old field names
2. Update components to use new names
3. Remove compatibility shim when ready

---

## Verification Checklist

- [ ] ResultItem interface updated
- [ ] LSP diagnostic handler added
- [ ] Conversion function created and tested
- [ ] resultsTreeProvider receives converted data
- [ ] UI renders new fields correctly
- [ ] extracted_parameters displays as list
- [ ] log_line shows full original line
- [ ] template shows raw template
- [ ] merged_template shows substituted values
- [ ] Backward compatibility maintained

---

## Summary

**Current Status:**
- ❌ VSCode extension NOT consuming LSP diagnostics yet
- ❌ Using local pattern engine only
- ✅ ResultItem interface exists but incomplete

**What's Needed:**
1. LSP diagnostic listener in lspClient.ts
2. LSP → ResultItem converter
3. ResultItem interface update
4. UI updates to display new fields

**Timeline:**
- Phase 1 (structures): Minimal changes
- Phase 2 (integration): Medium changes
- Phase 3 (UI): Depends on current implementation
- Phase 4 (migration): Ongoing cleanup

