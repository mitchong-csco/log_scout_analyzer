# Quick Reference: VSCode Extension Field Mapping

## Problem → Solution

**Problem:** LSP server renamed fields but VSCode extension didn't know about them

**Solution:** 
- Created `lspDiagnosticConverter.ts` to bridge the gap
- Updated `ResultItem` interface to include all field names
- Added LSP diagnostic handler
- Maintained 100% backward compatibility

---

## The Three Files

### 1. lspDiagnosticConverter.ts (NEW)
```typescript
import { convertLSPDiagnosticToResultItem } from "./lspDiagnosticConverter";

// Use it like this:
const resultItem = convertLSPDiagnosticToResultItem(diagnostic, uri);
```

**What it does:** Converts LSP diagnostics to extension's ResultItem format

---

### 2. resultsTreeProvider.ts (UPDATED)
```typescript
interface ResultItem {
  // New LSP field names (snake_case)
  template?: string;
  merged_template?: string;
  log_line?: string;
  extracted_parameters?: Array<{name: string; value: string}>;
  pattern_id?: string;
  
  // Old names still work (camelCase)
  mergedTemplate?: string;
  patternRegex?: string;
  extractedFields?: Record<string, string>;
}
```

---

### 3. lspClient.ts (UPDATED)
```typescript
// Now calls setupDiagnosticHandlers() after client starts
// This receives diagnostics from LSP server
```

---

## Field Mapping Quick Table

| What | Old Name | New Name | Status |
|------|----------|----------|--------|
| Template with {{ FIELD }} | `template` | `template` | Same ✅ |
| Merged with values | `mergedTemplate` | `merged_template` | Both ✅ |
| Original log line | N/A | `log_line` | New ✅ |
| Extracted data | `extractedFields` (dict) | `extracted_parameters` (list) | Both ✅ |
| Pattern ID | `patternId` | `pattern_id` | Both ✅ |
| Regex pattern | `patternRegex` | `pattern_regex` | Both ✅ |
| Log level | N/A | `log_level` | New ✅ |

---

## Usage Pattern

```typescript
// 1. Receive LSP diagnostic
const diagnostic: vscode.Diagnostic = ...;

// 2. Convert it
import { convertLSPDiagnosticToResultItem } from "./lspDiagnosticConverter";
const resultItem = convertLSPDiagnosticToResultItem(diagnostic, uri);

// 3. Use both old and new names
console.log(resultItem.mergedTemplate);      // Old way
console.log(resultItem.merged_template);     // New way (same value)

// 4. Iterate parameters
resultItem.extracted_parameters?.forEach(param => {
  console.log(`${param.name} = ${param.value}`);
});
```

---

## Backward Compatibility

✅ **All existing code still works**
- Old names are still populated
- New names are also available
- Choose which to use
- No breaking changes

---

## Next Steps

1. Update UI components to use new fields
2. Display `extracted_parameters` as list
3. Show `log_line` as full citation
4. Add `log_level` to displays

---

## Need Help?

See:
- **Full integration guide:** VSCODE_EXTENSION_LSP_INTEGRATION_GUIDE.md
- **Complete verification:** VSCODE_EXTENSION_VERIFICATION_COMPLETE.md
- **Field details:** VSCODE_EXTENSION_FIELD_VERIFICATION.md

