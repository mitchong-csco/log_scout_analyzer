# VSCode Extension LSP Integration Guide

## What Changed

The VSCode extension has been updated to support receiving diagnostics from the LSP server with the new data structure.

---

## New Files Added

### 1. **lspDiagnosticConverter.ts** (NEW)
Utility functions for converting LSP diagnostics to ResultItem format:
- `convertLSPDiagnosticToResultItem()` - Convert single diagnostic
- `convertLSPDiagnosticsToResultItems()` - Convert array of diagnostics
- `convertDiagnosticSeverity()` - Convert severity format
- `parametersToDict()` - Convert parameters to dict (backward compat)
- `isValidLSPDiagnostic()` - Validate diagnostic has required fields
- `logDiagnosticData()` - Debug logging

### 2. **Updated: resultsTreeProvider.ts**
ResultItem interface now includes new LSP field names:
- `template` - Raw template with {{ FIELD }}
- `merged_template` - Template with values substituted
- `log_line` - Full original log line
- `extracted_parameters` - Structured list of {name, value}
- `pattern_id` - Pattern identifier
- `pattern_regex` - Regex (debugging)
- `log_level` - Log level

### 3. **Updated: lspClient.ts**
Added diagnostic handler setup:
- `setupDiagnosticHandlers()` - Registers LSP diagnostic listener
- Receives diagnostics from LSP server
- Publishes to VS Code diagnostic collection

---

## How to Use

### Integration Example (in extension.ts or component)

```typescript
import { convertLSPDiagnosticToResultItem } from "./lspDiagnosticConverter";
import { ResultsTreeProvider } from "./resultsTreeProvider";

// Listen to LSP diagnostics
vscode.languages.onDidChangeDiagnostics((event) => {
  for (const uri of event.uris) {
    const diagnostics = vscode.languages.getDiagnostics(uri);
    
    // Filter for Log Scout diagnostics
    const logScoutDiagnostics = diagnostics.filter(
      (d) => d.source === "log-scout"
    );

    if (logScoutDiagnostics.length > 0) {
      // Convert to ResultItems
      const resultItems = logScoutDiagnostics.map((diag) =>
        convertLSPDiagnosticToResultItem(diag, uri)
      );

      // Update UI
      resultsTreeProvider?.setResults(resultItems);
      
      // Update analytics
      updateAnalyticsDashboard(resultItems);
    }
  }
});
```

---

## Field Mapping Reference

### From LSP Server Diagnostic.data

```json
{
  "template": "User {{ user }} failed auth",
  "merged_template": "User john.doe failed auth",
  "log_line": "2026-02-13 10:34:22 [AUTH] ERROR ...",
  "extracted_parameters": [
    {"name": "user", "value": "john.doe"}
  ],
  "pattern_id": "auth.failed",
  "pattern_name": "Authentication Failure",
  "category": "authentication",
  "log_level": "ERROR",
  "matched_text": "User john.doe failed auth",
  "pattern_regex": "...",
  "timestamp": "2026-02-13T10:34:22Z"
}
```

### To ResultItem

```typescript
{
  // Basic fields
  severity: "error",
  line: 10,
  column: 0,
  message: "User john.doe failed auth",
  matchedText: "User john.doe failed auth",
  context: "2026-02-13 10:34:22 [AUTH] ERROR ...",
  uri: vscode.Uri,
  
  // New LSP fields
  template: "User {{ user }} failed auth",
  merged_template: "User john.doe failed auth",
  log_line: "2026-02-13 10:34:22 [AUTH] ERROR ...",
  extracted_parameters: [{name: "user", value: "john.doe"}],
  pattern_id: "auth.failed",
  pattern_regex: "...",
  log_level: "ERROR",
  
  // Legacy fields (for backward compatibility)
  mergedTemplate: "User john.doe failed auth",
  patternRegex: "...",
  extractedFields: {user: "john.doe"},
  
  // Complete data
  diagnosticData: { /* all LSP data */ }
}
```

---

## Backward Compatibility

The conversion maintains backward compatibility:

1. **Old field names still work**: `mergedTemplate`, `patternRegex`, `extractedFields`
2. **New field names available**: `merged_template`, `pattern_regex`, `extracted_parameters`
3. **Both populated**: Existing code continues to work
4. **Gradual migration**: Can update component by component

---

## Rendering New Fields

### Extracted Parameters (as list)

**Before (dict):**
```typescript
extractedFields: {
  user: "john.doe",
  attempt: "3"
}
```

**Now (list):**
```typescript
extracted_parameters: [
  {name: "user", value: "john.doe"},
  {name: "attempt", value: "3"}
]
```

**Rendering:**
```typescript
function renderParameters(item: ResultItem) {
  if (!item.extracted_parameters) return null;
  
  return (
    <ul>
      {item.extracted_parameters.map((param) => (
        <li key={param.name}>
          <strong>{param.name}</strong>: {param.value}
        </li>
      ))}
    </ul>
  );
}
```

### Citation Card (log_line)

```typescript
function renderCitationCard(item: ResultItem) {
  return (
    <div className="citation-card">
      <h3>Source Log</h3>
      <p>{item.log_level}</p>
      <code>{item.log_line}</code>
      <p>Category: {item.category}</p>
      {item.timestamp && <p>Time: {item.timestamp}</p>}
    </div>
  );
}
```

### Template Info (for debugging)

```typescript
function renderTemplateInfo(item: ResultItem) {
  return (
    <details>
      <summary>Template Details</summary>
      <pre>
        Raw: {item.template}
        Merged: {item.merged_template}
        Regex: {item.pattern_regex}
      </pre>
    </details>
  );
}
```

---

## Testing LSP Diagnostics

### Manual Testing

1. **Start LSP server:**
   ```bash
   cd lsp-server
   cargo build --release
   ```

2. **Open log file in VS Code**
   - Create/open a `.log` file
   - Extension should analyze it
   - Check "Log Scout Analyzer" output channel

3. **Verify diagnostics:**
   - Open Output → "Log Scout Analyzer"
   - Should see: "Received N diagnostics from LSP server"
   - Check diagnostic data structure

### Debug Logging

Enable verbose logging to see diagnostic data:

**In settings.json:**
```json
{
  "logScoutAnalyzer.lsp.trace": "verbose"
}
```

**In code:**
```typescript
import { logDiagnosticData } from "./lspDiagnosticConverter";

logDiagnosticData(diagnostic, outputChannel);
```

---

## Migration Checklist

- [ ] LSP server deployed with new field names
- [ ] Extension uses lspDiagnosticConverter
- [ ] ResultItem interface updated
- [ ] Components support new fields
- [ ] Backward compatibility verified
- [ ] Extracted_parameters renders as list
- [ ] Log_line displays full original line
- [ ] Template info available
- [ ] Merged_template shows with values
- [ ] Testing with real diagnostics complete

---

## Troubleshooting

### Diagnostics Not Appearing

**Check:**
1. LSP server running and connected
2. Output channel shows "LSP client started"
3. No errors in LSP trace output
4. Log file has content that matches patterns

**Fix:**
- Restart extension: `Ctrl+Shift+P` > "Reload Window"
- Check LSP server logs
- Verify pattern matches test content

### Field Names Incorrect

**Issue:** New field names not found in diagnostic data

**Check:**
- LSP server version matches (should have renamed fields)
- Server compiled with latest code
- Diagnostic.data exists and contains fields

**Fix:**
- Rebuild LSP server: `cargo build --release`
- Restart VS Code
- Check lspDiagnosticConverter handling

### Mixed Field Names

**Issue:** Some diagnostics have old names, some new names

**Expected behavior:** Conversion handles both automatically

**Check:**
- `convertLSPDiagnosticToResultItem()` should populate both
- Components using either old or new names will work

---

## API Reference

### convertLSPDiagnosticToResultItem()

```typescript
function convertLSPDiagnosticToResultItem(
  diagnostic: vscode.Diagnostic,
  uri: vscode.Uri
): ResultItem
```

**Input:**
- LSP diagnostic from server
- File URI where diagnostic occurs

**Output:**
- ResultItem with all fields populated
- Both new (snake_case) and old (camelCase) names
- Complete diagnosticData included

**Example:**
```typescript
const diagnostic = diagnostics[0];
const resultItem = convertLSPDiagnosticToResultItem(diagnostic, uri);
console.log(resultItem.merged_template);  // New name
console.log(resultItem.mergedTemplate);   // Old name (same value)
```

### convertLSPDiagnosticsToResultItems()

```typescript
function convertLSPDiagnosticsToResultItems(
  diagnostics: vscode.Diagnostic[],
  uri: vscode.Uri
): ResultItem[]
```

**Converts array of diagnostics to array of ResultItems**

### isValidLSPDiagnostic()

```typescript
function isValidLSPDiagnostic(diagnostic: vscode.Diagnostic): boolean
```

**Returns true if diagnostic has required LSP fields**

---

## Summary

✅ Extension ready to consume LSP diagnostics
✅ Backward compatibility maintained
✅ New field names available
✅ Converter utilities provided
✅ Integration examples included

**Next step:** Update UI components to display new fields (extracted_parameters, log_line, etc.)

