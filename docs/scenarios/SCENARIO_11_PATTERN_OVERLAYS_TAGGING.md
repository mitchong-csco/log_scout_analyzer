# Scenario 11: Pattern Overlays - Custom Tagging for Analysis 📋

**Status:** 📋 Planned  
**Priority:** High  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, I want to tag all voicemail-related errors with 'voicemail-issue' so I can filter and group them separately."*

---

## 📖 Context

Sarah is investigating a voicemail issue in case 700435046. The logs contain errors from multiple subsystems (database, SIP, voicemail, authentication), but she needs to focus specifically on voicemail-related problems.

Rather than manually searching through thousands of log entries, Sarah wants to:
- **Tag** all voicemail-related errors automatically with custom labels
- **Filter** the Problems Panel to show only voicemail issues
- **Group** related errors for pattern analysis
- **Export** tagged entries to TAC case with clear categorization

This is different from suppression (Scenario 10) - she wants to **highlight and categorize**, not hide.

---

## 🎬 Target User Flow

### Step 1: Identify Categorization Need
1. Sarah opens RTMT bundle for case 700435046
2. Problems Panel shows 847 warnings from various subsystems
3. She estimates ~50 are voicemail-related but they're scattered
4. Manual filtering is time-consuming and error-prone

### Step 2: Create Tagging Overlay
5. Sarah opens Command Palette (Ctrl+Shift+P)
6. Types "Create Pattern Overlay"
7. Selects **"Create Pattern Overlay"**
8. Dialog appears:

```
┌─────────────────────────────────────────────────┐
│ Create Pattern Overlay                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Layer Name:                                     │
│ [Voicemail Issue Tagging]                      │
│                                                 │
│ Pattern to Match:                               │
│ [(?i)voicemail.*(error|fail|timeout)]          │
│                                                 │
│ Scope:                                          │
│ ○ All bundles                                   │
│ ● This bundle only (700435046)                  │
│ ○ Hostname: [_____________________ ▼]          │
│                                                 │
│ Action:                                         │
│ ○ Suppress (hide from Problems Panel)          │
│ ○ Change severity to: [____ ▼]                │
│ ● Add tags: [voicemail-issue, priority-high]  │
│                                                 │
│ State:                                          │
│ ○ Draft (inactive, for editing)                │
│ ● Staged (preview mode)                        │
│ ○ Active (apply immediately)                   │
│                                                 │
│ Notes (optional):                               │
│ [Tag all voicemail errors for case analysis]  │
│                                                 │
│        [Preview]  [Cancel]  [Save Overlay]     │
└─────────────────────────────────────────────────┘
```

### Step 3: Preview Tagged Results
9. Sarah clicks **"Preview"**
10. Preview panel shows:
    - **47 diagnostics will be tagged** with "voicemail-issue" and "priority-high"
    - List of matched log entries with tags highlighted
    - No entries are removed (tagging is additive, not subtractive)

```
┌─────────────────────────────────────────────────────────────┐
│ Preview: Voicemail Issue Tagging                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ✅ 47 diagnostics will be tagged                            │
│                                                             │
│ Tags to add: 🏷️ voicemail-issue  🏷️ priority-high         │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 📄 CCM00000001.txt:1247                                     │
│ │ ⚠️ Voicemail service error: connection timeout            │
│ │ 🏷️ voicemail-issue  🏷️ priority-high                     │
│                                                             │
│ 📄 CCM00000001.txt:1389                                     │
│ │ ❌ Voicemail database query failed                         │
│ │ 🏷️ voicemail-issue  🏷️ priority-high                     │
│                                                             │
│ 📄 CCM00000002.txt:445                                      │
│ │ ⚠️ Voicemail port timeout on device SEP123456            │
│ │ 🏷️ voicemail-issue  🏷️ priority-high                     │
│                                                             │
│ ... (44 more)                                               │
│                                                             │
│               [Cancel]  [Activate Overlay]                  │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Activate Overlay
11. Sarah confirms and clicks **"Activate Overlay"**
12. Overlay state changes from "Staged" → "Active"
13. All 47 matching diagnostics are tagged

### Step 5: Filter by Tag
14. Problems Panel toolbar shows new filter option:
    ```
    🏷️ Filter by Tag: [voicemail-issue ▼]
    ```
15. Sarah selects "voicemail-issue" from dropdown
16. Problems Panel now shows only 47 tagged entries
17. All other warnings hidden (but not suppressed - different from Scenario 10)

### Step 6: Group and Analyze
18. Tree view shows grouped results:
    ```
    📦 SCOUT RESULTS
    ├─ 🏷️ voicemail-issue (47)
    │  ├─ 📄 CCM00000001.txt (23)
    │  │  ├─ Line 1247: Voicemail service error
    │  │  ├─ Line 1389: Database query failed
    │  │  └─ ...
    │  ├─ 📄 CCM00000002.txt (18)
    │  └─ 📄 CCM00000003.txt (6)
    ```

### Step 7: Export Tagged Results
19. Sarah right-clicks "voicemail-issue" tag group
20. Selects **"Export Tagged Results"**
21. File saved: `voicemail-issue-700435046.txt`
22. Contains all 47 tagged entries with context (±5 lines)
23. Attaches to TAC case with clear categorization

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Tags applied dynamically** - All matching diagnostics tagged in real-time
- ✅ **Tags visible in tree view** - Clear visual indication with tag icons
- ✅ **Filter by tag** - Problems Panel can filter to show only tagged entries
- ✅ **Multiple tags** - Can apply multiple tags to same diagnostic
- ✅ **Non-destructive** - Original log files unchanged, tags are metadata only
- ✅ **Persistent** - Tags saved and restored across VS Code sessions

### User Experience
- ✅ **< 5 clicks** to create tagging overlay
- ✅ **< 2 seconds** to apply tags to entire bundle
- ✅ **Instant filtering** - Tag filter applies in < 100ms
- ✅ **Visual clarity** - Tags clearly distinguished with color/icon
- ✅ **Export ready** - Tagged results export with one click

### Technical
- ✅ **Performance** - Tag application < 100ms for 10k diagnostics
- ✅ **Scalability** - Support 50+ tags per bundle
- ✅ **Composability** - Multiple overlays can tag same diagnostic
- ✅ **Searchable** - Tags indexed for fast filtering

---

## 📊 Acceptance Tests

### Test 1: Create Tag Overlay
```gherkin
Given Sarah has opened bundle "700435046"
When she creates a new overlay with action "Add tags: voicemail-issue"
And sets pattern "(?i)voicemail.*(error|fail|timeout)"
And saves in "Active" state
Then 47 diagnostics are tagged with "voicemail-issue"
And the tag appears in the filter dropdown
```

### Test 2: Filter by Tag
```gherkin
Given 47 diagnostics are tagged with "voicemail-issue"
And the Problems Panel shows 847 total diagnostics
When Sarah selects "voicemail-issue" from the tag filter dropdown
Then the Problems Panel shows only 47 diagnostics
And all shown diagnostics have the "voicemail-issue" tag
```

### Test 3: Multiple Tags on Same Diagnostic
```gherkin
Given a diagnostic matches pattern "voicemail.*error"
And overlay 1 tags it with "voicemail-issue"
And overlay 2 tags it with "priority-high"
And overlay 3 tags it with "database-related"
Then the diagnostic displays all 3 tags
And it appears when filtering by any of the 3 tags
```

### Test 4: Tag Persistence
```gherkin
Given Sarah has created a tagging overlay
And 47 diagnostics are tagged
When she closes VS Code
And reopens the workspace
Then the overlay is loaded automatically
And all 47 diagnostics are still tagged
```

### Test 5: Export Tagged Results
```gherkin
Given 47 diagnostics are tagged with "voicemail-issue"
When Sarah right-clicks the tag in tree view
And selects "Export Tagged Results"
Then a file is created with all 47 entries
And each entry includes ±5 lines of context
And the export includes metadata (timestamp, hostname, file, line)
```

### Test 6: Tag in Multiple Overlays
```gherkin
Given base overlay tags "voicemail.*error" with "voicemail-issue"
And case overlay tags "voicemail.*timeout" with "timeout-related"
And a diagnostic contains "voicemail connection timeout"
Then it receives both tags: "voicemail-issue" and "timeout-related"
And appears in filters for either tag
```

---

## 🏗️ Technical Implementation

### Data Structure (JSON)

```json
{
  "layerId": "overlay-voicemail-tagging",
  "name": "Voicemail Issue Tagging",
  "type": "case",
  "priority": 100,
  "scope": {
    "level": "bundle",
    "id": "700435046"
  },
  "state": "active",
  "enabled": true,
  "version": "1.0.0",
  "author": "sarah@mihomes.com",
  "createdAt": "2026-02-24T11:00:00Z",
  "updatedAt": "2026-02-24T11:00:00Z",
  "rules": [
    {
      "id": "tag-voicemail-errors",
      "signature": {
        "type": "regex",
        "pattern": "(?i)voicemail.*(error|fail|timeout)",
        "flags": "i"
      },
      "action": {
        "type": "tag",
        "tags": ["voicemail-issue", "priority-high"]
      },
      "priority": 1,
      "state": "active",
      "notes": "Tag all voicemail errors for focused analysis"
    }
  ]
}
```

### Extended Diagnostic Type

```typescript
interface DiagnosticWithTags extends vscode.Diagnostic {
  tags?: string[];  // Custom tags from overlays
  metadata?: {
    overlayIds: string[];  // Which overlays contributed tags
    taggedAt: Date;
    tagSources: Record<string, string>;  // tag -> overlayId mapping
  };
}
```

### Code Flow

```typescript
// 1. Tag Action Implementation
export function applyTag(diagnostics: Diagnostic[], rule: Rule): Diagnostic[] {
  const regex = new RegExp(rule.signature.pattern, rule.signature.flags || 'i');
  
  return diagnostics.map(diag => {
    if (regex.test(diag.message)) {
      // Add tags to diagnostic (non-destructive)
      const tagged = diag as DiagnosticWithTags;
      tagged.tags = [
        ...(tagged.tags || []),
        ...(rule.action as TagAction).tags
      ];
      
      // Track metadata
      if (!tagged.metadata) {
        tagged.metadata = {
          overlayIds: [],
          taggedAt: new Date(),
          tagSources: {}
        };
      }
      
      (rule.action as TagAction).tags.forEach(tag => {
        tagged.metadata!.tagSources[tag] = rule.id;
      });
      
      logger.debug(`Tagged: ${diag.message} with ${rule.action.tags.join(', ')}`);
    }
    return diag;
  });
}

// 2. Tag Filter in Problems Panel
class TagFilterProvider {
  private activeTagFilters: Set<string> = new Set();
  
  filterByTags(diagnostics: DiagnosticWithTags[]): DiagnosticWithTags[] {
    if (this.activeTagFilters.size === 0) {
      return diagnostics; // No filter active
    }
    
    return diagnostics.filter(diag => {
      if (!diag.tags || diag.tags.length === 0) {
        return false;
      }
      
      // Match if diagnostic has ANY of the active filter tags
      return diag.tags.some(tag => this.activeTagFilters.has(tag));
    });
  }
  
  getAllTags(diagnostics: DiagnosticWithTags[]): string[] {
    const allTags = new Set<string>();
    diagnostics.forEach(diag => {
      diag.tags?.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  }
}

// 3. Tree View with Tag Grouping
class TaggedResultsTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  getChildren(element?: TreeItem): TreeItem[] {
    if (!element) {
      // Root level: Show tag groups
      const tagGroups = this.groupByTag(this.diagnostics);
      return Object.entries(tagGroups).map(([tag, diags]) => ({
        label: `🏷️ ${tag} (${diags.length})`,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        contextValue: 'tagGroup',
        tag: tag,
        diagnostics: diags
      }));
    } else if (element.contextValue === 'tagGroup') {
      // Second level: Show files with tagged diagnostics
      return this.groupByFile(element.diagnostics);
    }
    // ... more levels
  }
  
  private groupByTag(diagnostics: DiagnosticWithTags[]): Record<string, DiagnosticWithTags[]> {
    const groups: Record<string, DiagnosticWithTags[]> = {};
    
    diagnostics.forEach(diag => {
      diag.tags?.forEach(tag => {
        if (!groups[tag]) {
          groups[tag] = [];
        }
        groups[tag].push(diag);
      });
    });
    
    return groups;
  }
}
```

---

## 🎨 UI Mockups

### Problems Panel with Tag Filter

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMS                                           🏷️ Filter │
│                                                             │
│ 🏷️ Filter by Tag: [voicemail-issue ▼]         [Clear]     │
│                                                             │
│ ⚠️ (47) Voicemail Issues                                    │
│ ├─ 📄 CCM00000001.txt (23)                                  │
│ │  ├─ Line 1247: Voicemail service error                   │
│ │  │  🏷️ voicemail-issue  🏷️ priority-high                │
│ │  ├─ Line 1389: Database query failed                     │
│ │  │  🏷️ voicemail-issue  🏷️ priority-high  🏷️ database   │
│ │  └─ ...                                                  │
│ ├─ 📄 CCM00000002.txt (18)                                  │
│ └─ 📄 CCM00000003.txt (6)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Tag Dropdown Menu

```
┌─────────────────────────────┐
│ 🏷️ Filter by Tag            │
├─────────────────────────────┤
│ ☐ voicemail-issue (47)      │
│ ☐ priority-high (82)        │
│ ☐ database-related (134)    │
│ ☐ sip-error (56)            │
│ ☐ authentication-fail (23)  │
│ ☐ timeout-related (91)      │
├─────────────────────────────┤
│ [Create New Tag...]         │
│ [Manage Tags...]            │
└─────────────────────────────┘
```

### Tree View with Tag Grouping

```
📦 SCOUT RESULTS (by Tag)
├─ 🏷️ voicemail-issue (47)
│  ├─ 📄 CCM00000001.txt (23)
│  ├─ 📄 CCM00000002.txt (18)
│  └─ 📄 CCM00000003.txt (6)
├─ 🏷️ priority-high (82)
│  ├─ 📄 CCM00000001.txt (45)
│  └─ 📄 CCM00000004.txt (37)
├─ 🏷️ database-related (134)
│  └─ ...
└─ 🔍 View All / Group by File
```

### Tag Indicator in Editor

```
Line 1247: 2026-02-24 10:15:23,456 ERROR - Voicemail service error
           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           🏷️ voicemail-issue  🏷️ priority-high
           
           [Filter by Tag] [Edit Tags] [Go to Definition]
```

---

## 🚀 Implementation Phases

### Phase 1: Core Tag Action (Week 3)
- [ ] Define `TagAction` type and schema
- [ ] Implement `applyTag()` function
- [ ] Extend diagnostic type to include tags
- [ ] Write tests for tag application
- [ ] Test with 10k diagnostics (performance)

### Phase 2: Tag Storage & Persistence (Week 3)
- [ ] Store tags in diagnostic metadata
- [ ] Persist tags across VS Code restarts
- [ ] Handle tag conflicts (multiple overlays)
- [ ] Add tag deduplication logic

### Phase 3: UI - Filter by Tag (Week 4)
- [ ] Add tag filter dropdown to Problems Panel
- [ ] Implement filter logic (AND/OR combinations)
- [ ] Add "Clear Filter" button
- [ ] Show tag counts in dropdown

### Phase 4: UI - Tag Display (Week 4)
- [ ] Show tags inline in Problems Panel
- [ ] Add tag icons/colors for visual distinction
- [ ] Implement tag tooltips (show source overlay)
- [ ] Add tag indicators in editor gutter

### Phase 5: Tree View Integration (Week 5)
- [ ] Create "Group by Tag" tree view mode
- [ ] Show tag hierarchy in tree
- [ ] Add context menu for tag operations
- [ ] Implement tag navigation

### Phase 6: Export & Sharing (Week 5)
- [ ] Export tagged results to file
- [ ] Include context lines (±5)
- [ ] Format for TAC case submission
- [ ] Add metadata header (tags, overlay info)

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 95%+ test coverage for tag action
- ✅ < 100ms to apply tags to 10k diagnostics
- ✅ < 50ms to filter by tag
- ✅ Zero memory leaks with 50+ tags

### User Metrics
- ✅ 80% of users create at least one tagging overlay
- ✅ Average 5-7 custom tags per case bundle
- ✅ 70% use tag filtering weekly
- ✅ Average export 2-3 tagged result sets per case

### Business Impact
- ✅ 40% faster focused analysis (less noise)
- ✅ Better TAC case documentation (clear categorization)
- ✅ Reusable tags across similar cases
- ✅ Improved team knowledge sharing

---

## 🔗 Related Documentation

- **Scenario 10:** Pattern Overlays - Suppress (related action type)
- **Scenario 12:** Pattern Overlays - Extract Fields (related action type)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Architecture)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 3)
- **Quick Reference:** `PATTERN_OVERLAYS_QUICK_REF.md` (Tag Action)

---

## 📝 Notes

### Design Decisions
1. **Why multiple tags per diagnostic?** - Real-world issues often span categories (voicemail + database + timeout)
2. **Why non-destructive?** - Original logs must remain unchanged for audit/compliance
3. **Why filter instead of hide?** - Users want to focus, not permanently suppress
4. **Why metadata tracking?** - Audit trail shows which overlay added which tag

### Edge Cases
- **Same tag from multiple overlays** - Deduplicate, track all sources
- **Tag name conflicts** - Use namespace prefix (`overlay:voicemail-issue`)
- **Too many tags** - Limit to 10 per diagnostic, show truncated list
- **Tag removal** - Disable overlay, tags disappear (non-persistent by design)

### Tag Naming Conventions
- **Lowercase with hyphens** - `voicemail-issue` not `VoicemailIssue`
- **Descriptive but concise** - `db-timeout` not `database-query-timeout-error`
- **Hierarchical with prefixes** - `priority-high`, `priority-medium`, `priority-low`
- **Avoid special characters** - Letters, numbers, hyphens only

### Future Enhancements
- **Tag colors** - User-defined color per tag for visual coding
- **Tag hierarchy** - Parent-child relationships (`voicemail` → `voicemail-port-timeout`)
- **Tag suggestions** - AI suggests tags based on log content
- **Tag templates** - Pre-defined tag sets for common scenarios
- **Tag analytics** - Show most common tags, trending issues

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 3)  
**Assigned To:** TBD