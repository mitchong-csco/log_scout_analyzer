# Pattern Override System - Quick Reference Card

> **One-page cheat sheet** - Print this or keep it handy!

---

## Core Concept

```
TagScout Pattern (MongoDB)     Local Override (.log-scout/)     Final Pattern (LSP)
        │                              │                              │
        ▼                              ▼                              ▼
    regex: "error"          +    regex: "ERROR"          =      regex: "ERROR"
    extractor: ([45]\d{2})       extractor: (\d{3})             extractor: (\d{3})
```

**Override = Local fix that takes precedence over TagScout**

---

## Quick Commands (VSCode)

| Command | Action |
|---------|--------|
| Right-click diagnostic → "Override Pattern..." | Create override |
| Cmd/Ctrl+Shift+P → "View Pattern Overrides" | List all overrides |
| Right-click override → "Reset" | Remove override |
| Cmd/Ctrl+Shift+P → "Export Overrides" | Share with team |

---

## File Location

```
your-workspace/
└── .log-scout/
    └── pattern-overrides.json    ← Your overrides
```

**Commit this file to Git for team sharing!**

---

## Override File Structure

```json
{
  "version": "1.0",
  "overrides": {
    "override-{PATTERN_ID}": {
      "id": "override-{PATTERN_ID}",
      "sourceType": "mongodb",
      "sourceId": "{PATTERN_ID}",
      "enabled": true,
      "overrides": {
        "regex": "NEW_REGEX",
        "severity": "error|warning|info|hint",
        "parameterExtractors": {
          "PARAM_NAME": {
            "override": "NEW_REGEX",
            "reason": "Why you changed it"
          }
        }
      }
    }
  }
}
```

---

## Common Use Cases

### 1. Fix Failed Parameter Extraction

**Problem:** `HTTP response with status {{ CODE }}`

**Fix:**
```json
"parameterExtractors": {
  "CODE": {
    "override": "(\\d{3})",
    "reason": "Match all HTTP codes, not just 4xx/5xx"
  }
}
```

**Result:** `HTTP response with status 200` ✅

### 2. Change Severity

```json
"overrides": {
  "severity": "warning"
}
```

### 3. Update Regex

```json
"overrides": {
  "regex": "ERROR.*timeout"
}
```

---

## Agentic Features (Phase 4 - Optional)

### When System Detects Issues

```
🔔 Pattern Quality Issue Detected
   Pattern: HTTP Error Pattern
   Issue: Parameter 'CODE' not extracted
   Found in: 5 log lines
   
   [Apply Suggested Fix]  [View Details]  [Dismiss]
```

### Suggestion Preview

```
Parameter: CODE
Current:   ([45]\d{2})
Suggested: (\d{3})
Confidence: 85%
Reason: Current doesn't match 2xx codes

[Apply]  [Edit First]  [Cancel]
```

---

## Decision Framework: Use Agent or Traditional Code?

| Question | YES → | NO → |
|----------|-------|------|
| Requires learning/adaptation? | Agent | Traditional |
| Solution unknown/needs discovery? | Agent | Traditional |
| Complex reasoning needed? | Agent | Traditional |
| Deterministic with known rules? | Traditional | Agent |

**Rule of Thumb:**
- **Agents for:** Analysis, suggestions, discovery, learning
- **Traditional for:** I/O, matching, rendering, serialization

---

## Implementation Phases

| Phase | Duration | Priority | Deliverable |
|-------|----------|----------|-------------|
| 1. LSP Server | 3-5 days | P0 Critical | Overrides work |
| 2. VSCode UI | 4-6 days | P1 High | User can create overrides |
| 3. Advanced UI | 3-5 days | P2 Medium | Webview editor, import/export |
| 4. Agents | 2-4 weeks | P3 Optional | Auto-suggestions, learning |

**Minimum Viable Product:** Phase 1 + 2 (2 weeks)

---

## Quick Troubleshooting

### Override Not Applied?
- [ ] Check pattern ID matches: `override-{ID}`
- [ ] Verify `enabled: true`
- [ ] Reload LSP: Restart or `logScout/reloadPatterns`
- [ ] Check LSP logs for "Loaded X pattern overrides"

### Can't See Commands?
- [ ] Extension activated?
- [ ] Diagnostic selected?
- [ ] Commands defined in `package.json`?
- [ ] Commands registered in `extension.ts`?

### Performance Issues?
- [ ] Agents running async?
- [ ] Caching enabled?
- [ ] LLM calls rate-limited?
- [ ] Check logs for slow operations

---

## Key Files

### LSP Server (Rust)
```
lsp-server/src/
├── pattern_loader.rs       ← Load/merge overrides
├── quality_monitor.rs      ← Detect issues
└── agents/
    └── quality_agent.rs    ← Suggest fixes
```

### VSCode Extension (TypeScript)
```
vscode-extension/src/
├── patternOverrideManager.ts    ← File I/O
├── overrideHandlers.ts          ← UI logic
└── views/
    ├── patternOverrideEditor.ts ← Advanced editor
    └── overrideTreeView.ts      ← Browse overrides
```

---

## Common Patterns

### Parameter Name → Suggested Regex

| Parameter | Regex | Matches |
|-----------|-------|---------|
| CODE | `(\d{3})` | 200, 404, 500 |
| IP | `(\d+\.\d+\.\d+\.\d+)` | 192.168.1.1 |
| PORT | `(\d{1,5})` | 8080, 443 |
| TIME | `(\d+(?:\.\d+)?)\s*(?:ms\|s)` | 123ms, 4.5s |
| SESSION | `([A-Z0-9-]{36})` | UUID format |
| GENERIC | `(\S+)` | Any non-whitespace |

---

## Team Workflow

1. **Alice finds broken pattern** → Creates override
2. **Alice commits** → `git add .log-scout/pattern-overrides.json`
3. **Bob pulls** → Gets Alice's overrides automatically
4. **Team synced** → Everyone has same fixes

---

## Performance Targets

| Operation | Target | Actual |
|-----------|--------|--------|
| Load overrides | <5ms | ___ ms |
| Merge pattern | <1ms | ___ ms |
| Detect issue | <1ms | ___ ms |
| Generate suggestion | <10ms | ___ ms |
| Apply override | <100ms | ___ ms |

---

## Success Metrics

- [ ] Override creation time: <30 seconds
- [ ] Suggestion acceptance rate: >60%
- [ ] False positive rate: <10%
- [ ] User satisfaction: >4/5
- [ ] Pattern quality issues detected proactively

---

## Resources

📚 **Documentation**
- `PATTERN_OVERRIDE_QUICK_START.md` - Get started
- `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md` - Step-by-step
- `AGENTIC_DECISION_FRAMEWORK.md` - Use agents wisely

🔧 **Tools**
- Regex tester: https://regex101.com/
- JSON validator: https://jsonlint.com/

🤝 **Support**
- File issues in project tracker
- Team discussion channels

---

## Remember

✅ **DO:**
- Store overrides in version control
- Add reason/notes to overrides
- Test regex before applying
- Share useful overrides with team
- Use agents for learning/reasoning
- Start simple, add intelligence later

❌ **DON'T:**
- Modify TagScout patterns directly
- Skip testing overrides
- Use agents for simple I/O
- Over-engineer solutions
- Forget to document why you overrode

---

**Quick Start:** `Right-click diagnostic → "Override Pattern..." → Follow prompts` 🚀

---

**Version:** 1.0 | **Status:** Ready for Implementation