# Quick Reference: Decoration Application Flow

**Visual guide to how decorations are applied in VS Code**

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Editor                       │
│                                                         │
│  Result you see:                                        │
│  🔴 │ 14  ERROR database timeout                       │
│     │     ^^^^^ (highlighted)                          │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │
                    HOW DID THIS HAPPEN?
                         │
                         │
┌────────────────────────┴─────────────────────────────────┐
│            Log Scout Extension                          │
│                                                         │
│  1. Listens for file open event                        │
│  2. Runs analysis command                              │
│  3. Gets diagnostics from LSP                          │
│  4. Finds "ERROR" at position 20-25                    │
│  5. Calls: editor.setDecorations(type, [range])        │
└─────────────────────────────────────────────────────────┘
```

---

## Key API Calls

### 1. Create Decoration Type (Once, at startup)

```typescript
const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 77, 79, 0.6)',
  border: '1px solid #ff4d4f',
  borderRadius: '2px'
});
```

**Result:** A reusable "style template" stored in memory

---

### 2. Apply Decoration (Every time you analyze)

```typescript
editor.setDecorations(decorationType, [
  new vscode.Range(14, 20, 14, 25)  // Line 14, columns 20-25
]);
```

**Result:** VS Code immediately highlights that text

---

## Timeline of Events

```
T=0ms     User opens app.log
          ↓
T=0ms     VS Code fires: onDidOpenTextDocument(document)
          ↓
T=0ms     Extension receives event
          ↓
T=0ms     Extension checks: isLogFile(document) → true
          ↓
T=500ms   Extension executes: "logScoutAnalyzer.analyzeFile"
          ↓
T=500ms   Extension calls: vscode.languages.getDiagnostics(uri)
          ↓
T=500ms   LSP server returns: [{ line: 14, ... }, { line: 15, ... }]
          ↓
T=500ms   Extension converts to: AnnotatedLine[]
          ↓
T=500ms   Extension calls: annotationRenderer.render(editor, annotations)
          ↓
T=500ms   Renderer calls: logLevelHighlighter.applyHighlights(...)
          ↓
T=500ms   Highlighter finds: "ERROR" at line 14, columns 20-25
          ↓
T=500ms   Highlighter calls: editor.setDecorations(errorType, [Range(14,20,14,25)])
          ↓
T=500ms   VS Code renders: Red highlight on "ERROR"
          ↓
T=500ms   User sees: 🔴 │ 14  ERROR database timeout
                            ^^^^^ (highlighted)
```

---

## Data Flow

```
┌─────────────┐
│  Log File   │
│  (app.log)  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   LSP Server    │  ← Analyzes patterns
│   (Rust)        │
└──────┬──────────┘
       │
       │ Returns diagnostics
       ▼
┌────────────────────────┐
│ VS Code Diagnostics    │  ← Stored by VS Code
│ vscode.languages.      │
│   getDiagnostics()     │
└──────┬─────────────────┘
       │
       │ Extension fetches
       ▼
┌────────────────────────┐
│ Extension              │  ← Our code
│ annotationRenderer     │
└──────┬─────────────────┘
       │
       │ Calls applyHighlights()
       ▼
┌────────────────────────┐
│ logLevelHighlighter    │  ← Finds keywords
│ findLogLevel()         │
└──────┬─────────────────┘
       │
       │ Returns positions
       ▼
┌────────────────────────┐
│ Create Range objects   │
│ Range(14, 20, 14, 25)  │
└──────┬─────────────────┘
       │
       │ Calls setDecorations()
       ▼
┌────────────────────────┐
│ VS Code API            │  ← Renders decorations
│ editor.setDecorations()│
└──────┬─────────────────┘
       │
       ▼
┌────────────────────────┐
│   User's Screen        │
│   (highlighted text)   │
└────────────────────────┘
```

---

## The Magic Method

```typescript
editor.setDecorations(decorationType, ranges);
```

### What it does:

1. Takes a decoration type (styling rules)
2. Takes an array of ranges (positions)
3. Tells VS Code: "Apply this styling to these positions"
4. VS Code renders it immediately

### Example:

```typescript
// Highlight "ERROR" on line 14 (columns 20-25)
editor.setDecorations(
  errorDecorationType,              // What styling
  [new vscode.Range(14, 20, 14, 25)] // Where to apply
);
```

### Result in editor:

```
Line 14: "2024-01-01 10:00:00 ERROR database timeout"
                             ^^^^^ (red highlight here)
                             cols 20-25
```

---

## Key Points

### ✅ Extension Explicitly Calls API

The extension **must call** `editor.setDecorations()` - it's not automatic.

```typescript
// Without this call, nothing happens
editor.setDecorations(decorationType, ranges);
```

### ✅ Event Listeners Trigger Application

```typescript
// Extension listens for events
vscode.workspace.onDidOpenTextDocument((doc) => {
  // When file opens, trigger analysis
  analyzeFile(doc);
});
```

### ✅ LSP Provides Data

```typescript
// Extension gets diagnostics from LSP server
const diagnostics = vscode.languages.getDiagnostics(uri);
// These tell us which lines have issues
```

### ✅ Extension Calculates Positions

```typescript
// Extension finds "ERROR" in the line text
const match = line.match(/\bERROR\b/);
// Returns: { index: 20, length: 5 }
```

### ✅ VS Code Handles Rendering

```typescript
// Extension just provides position + styling
editor.setDecorations(type, ranges);

// VS Code handles:
// - Drawing the highlight
// - Scrolling
// - Resizing
// - Theme compatibility
// - Everything visual
```

---

## Common Patterns

### Pattern 1: Single Decoration

```typescript
// Highlight one word
editor.setDecorations(decorationType, [
  new vscode.Range(14, 20, 14, 25)
]);
```

### Pattern 2: Multiple Decorations (Same Type)

```typescript
// Highlight multiple words with same styling
editor.setDecorations(errorDecorationType, [
  new vscode.Range(14, 20, 14, 25),  // Line 14
  new vscode.Range(25, 20, 25, 25),  // Line 25
  new vscode.Range(30, 20, 30, 25)   // Line 30
]);
```

### Pattern 3: Multiple Decoration Types

```typescript
// Different stylings for different types
editor.setDecorations(errorDecorationType, errorRanges);
editor.setDecorations(warnDecorationType, warnRanges);
editor.setDecorations(infoDecorationType, infoRanges);
// All three can coexist in the same editor
```

### Pattern 4: Clear Decorations

```typescript
// Remove all highlights of this type
editor.setDecorations(decorationType, []);  // Empty array
```

### Pattern 5: Update Decorations

```typescript
// Replace previous decorations with new ones
editor.setDecorations(decorationType, newRanges);
// VS Code automatically removes old decorations
```

---

## FAQ

### Q: Does VS Code automatically apply decorations?

**A: No.** The extension must explicitly call `editor.setDecorations()`.

### Q: When are decorations applied?

**A: When the extension calls the API.** In our case:
- When file opens (after 500ms delay)
- When user runs analyze command
- When diagnostics change

### Q: How does the extension know which text to highlight?

**A: By searching the line text.** The extension:
1. Gets the line text from the document
2. Uses regex to find the keyword (e.g., "ERROR")
3. Gets the position (start column, end column)
4. Creates a Range object
5. Passes it to `setDecorations()`

### Q: Can decorations overlap?

**A: Yes.** Different decoration types can overlap:
- Glyph in margin (one decoration type)
- Text highlight (another decoration type)
- Full line background (yet another type)

### Q: How are decorations cleared?

**A: Two ways:**
1. Call `setDecorations(type, [])` with empty array
2. Call `setDecorations(type, newRanges)` to replace

### Q: Are decorations persistent?

**A: Yes, until:**
- Extension clears them explicitly
- Extension replaces them with new decorations
- Editor is closed
- Extension deactivates

---

## Troubleshooting

### Problem: Decorations not appearing

**Check:**
1. Is `editor.setDecorations()` being called?
2. Are the ranges valid (line number exists)?
3. Is the decoration type created correctly?
4. Check console for errors

### Problem: Wrong text highlighted

**Check:**
1. Is `findLogLevel()` finding the correct position?
2. Are columns 0-based (VS Code uses 0-based indexing)?
3. Is the regex pattern correct?

### Problem: Decorations appear then disappear

**Check:**
1. Is something else calling `setDecorations(type, [])` to clear?
2. Are decorations being cleared on document change?
3. Is the extension disposing decorations prematurely?

---

## Summary

**How does VS Code know to apply decorations?**

```
Extension tells it to!

1. Extension listens for events (file open, etc.)
2. Extension analyzes the file (gets diagnostics)
3. Extension finds keywords ("ERROR", "WARN", etc.)
4. Extension calculates positions (line, column)
5. Extension calls: editor.setDecorations(type, ranges)
6. VS Code renders the decorations
```

**The key:** It's **explicit**, not automatic. The extension must call the VS Code API to apply decorations.

