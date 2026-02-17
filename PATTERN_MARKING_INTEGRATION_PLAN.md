# Pattern Marking Integration Plan

> **Document Version:** 1.0  
> **Date:** February 16, 2026  
> **Status:** Ready for Integration with Existing Plan  
> **Related Docs:** `PATTERN_OVERRIDE_IMPLEMENTATION_PLAN.md`, `PATTERN_OVERRIDE_SYSTEM_SUMMARY.md`

---

## Executive Summary

This document describes how to **integrate pattern marking/flagging functionality** into the existing Pattern Override System. Pattern marking allows teams to:

- **Track pattern quality issues** - Mark patterns that need review
- **Manage review workflow** - Progress through states (draft → pending-review → approved → applied)
- **Audit trail** - Record who marked a pattern and when
- **Team collaboration** - Share marked patterns through version control

**Key Insight:** This feature naturally fits as **Task 1.6 (Phase 1) + Phase 2 UI task**, requiring minimal changes to existing architecture.

---

## Table of Contents

1. [How It Fits Into Existing Plan](#how-it-fits-into-existing-plan)
2. [Data Model Changes](#data-model-changes)
3. [Implementation Tasks](#implementation-tasks)
4. [Integration Points](#integration-points)
5. [User Workflows](#user-workflows)

---

## How It Fits Into Existing Plan

### Current Phase 1 Structure
```
Phase 1: LSP Server Foundation
├── Task 1.1: Create Pattern Loader Module ✅
├── Task 1.2: Implement Override File Loading ✅
├── Task 1.3: Implement Pattern Merge Function ✅
├── Task 1.4: Integration into LSP Server ✅
├── Task 1.5: Add Pattern Reload Capability
└── Task 1.6: (NEW) Add Pattern Marking Support
```

### Current Phase 2 Structure
```
Phase 2: VSCode UI Integration
├── Task 2.1: Verify Existing PatternOverrideManager
├── Task 2.2: Add Context Menu Commands
├── Task 2.3: Implement PatternOverrideEditor Webview
├── Task 2.4: Add Quick Pick for Simple Overrides
└── Task 2.5: (NEW) Add Marking UI & Commands
```

### Current Phase 3 Structure
```
Phase 3: Advanced Features
├── Task 3.1: Export/Import Overrides
├── Task 3.2: Pattern Override TreeView
└── Task 3.3: (NEW) Marking Dashboard & Reports
```

---

## Data Model Changes

### Phase 1.6: Update PatternOverride Structure

**File:** `lsp-server/src/pattern_loader.rs`

Add marking fields to `PatternOverride` struct:

```rust
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PatternOverride {
    pub id: String,
    #[serde(rename = "sourceType")]
    pub source_type: String,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    pub name: Option<String>,
    pub notes: Option<String>,
    pub reason: Option<String>,
    pub enabled: Option<bool>,
    pub overrides: OverrideValues,

    // NEW: Pattern Marking Fields
    #[serde(rename = "markingStatus")]
    pub marking_status: Option<String>,  // "draft" | "pending-review" | "approved" | "applied"
    
    #[serde(rename = "markedBy")]
    pub marked_by: Option<String>,  // Username or email
    
    #[serde(rename = "markedAt")]
    pub marked_at: Option<String>,  // ISO 8601 timestamp
    
    #[serde(rename = "reviewedBy")]
    pub reviewed_by: Option<Vec<ReviewComment>>,
    
    #[serde(rename = "priority")]
    pub priority: Option<String>,  // "low" | "medium" | "high" | "critical"
    
    #[serde(rename = "category")]
    pub category: Option<String>,  // "regex" | "extractor" | "severity" | "missing-pattern"
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ReviewComment {
    pub author: String,
    pub timestamp: String,  // ISO 8601
    pub comment: String,
    pub status: String,  // "approved" | "changes-requested" | "questioned"
}
```

### Updated JSON Structure

**File:** `.log-scout/pattern-overrides.json`

```json
{
  "version": "1.0",
  "lastSync": "2026-02-16T15:30:00.000Z",
  "overrides": {
    "override-5efde66677e36d0001e62450": {
      "id": "override-5efde66677e36d0001e62450",
      "sourceType": "mongodb",
      "sourceId": "5efde66677e36d0001e62450",
      "name": "Voicemail - HTTP Error Response (FIXED)",
      "notes": "Fixed CODE extractor to include 2xx codes",
      "reason": "Original regex only matched 3xx/4xx/5xx, missing 2xx success codes",
      "createdAt": "2026-02-16T10:00:00.000Z",
      "modifiedAt": "2026-02-16T15:30:00.000Z",
      "enabled": true,
      
      "markingStatus": "pending-review",
      "markedBy": "john.doe@company.com",
      "markedAt": "2026-02-16T15:25:00.000Z",
      "priority": "high",
      "category": "extractor",
      
      "reviewedBy": [
        {
          "author": "jane.smith@company.com",
          "timestamp": "2026-02-16T15:30:00.000Z",
          "comment": "Looks good. Verified with 5 test logs.",
          "status": "approved"
        }
      ],
      
      "overrides": {
        "parameterExtractors": {
          "CODE": {
            "original": "HTTP response code ([0345][0-9]?[0-9]?)",
            "override": "HTTP response code ([12345][0-9]{2})",
            "reason": "Include all HTTP status codes (1xx-5xx)"
          }
        }
      }
    }
  }
}
```

---

## Implementation Tasks

### Phase 1.6: LSP Server Support for Marking

**Duration:** 1-2 days

#### Task 1.6.1: Update Data Structures

- [ ] Add marking fields to `PatternOverride` struct
- [ ] Add `ReviewComment` struct with proper serialization
- [ ] Update `OverrideFile` struct if needed
- [ ] Update serde attributes for camelCase field names

**Test Cases:**
- Parse override file with all marking fields
- Parse override file without marking fields (backward compatible)
- Serialize override with marking data to JSON

#### Task 1.6.2: Add Marking Validation

**File:** `lsp-server/src/pattern_loader.rs`

```rust
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum MarkingStatus {
    Draft,           // Created but not yet marked for review
    PendingReview,   // Waiting for team review
    Approved,        // Approved by reviewer
    Applied,         // Override is in use and working
}

impl MarkingStatus {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "draft" => Ok(Self::Draft),
            "pending-review" => Ok(Self::PendingReview),
            "approved" => Ok(Self::Approved),
            "applied" => Ok(Self::Applied),
            _ => Err(format!("Invalid marking status: {}", s)),
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::PendingReview => "pending-review",
            Self::Approved => "approved",
            Self::Applied => "applied",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Critical,
}

pub enum Category {
    Regex,
    Extractor,
    Severity,
    MissingPattern,
}

// Validation function
pub fn validate_marking(override_data: &PatternOverride) -> Result<(), Vec<String>> {
    let mut errors = Vec::new();
    
    if let Some(status) = &override_data.marking_status {
        MarkingStatus::from_str(status)
            .map_err(|e| errors.push(e))
            .ok();
    }
    
    if let Some(marked_at) = &override_data.marked_at {
        if chrono::DateTime::parse_from_rfc3339(marked_at).is_err() {
            errors.push(format!("Invalid ISO 8601 timestamp: {}", marked_at));
        }
    }
    
    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors)
    }
}
```

**Test Cases:**
- Valid marking status strings
- Invalid marking status strings
- Valid ISO 8601 timestamps
- Invalid timestamps

#### Task 1.6.3: Add Marking Queries

**File:** `lsp-server/src/pattern_loader.rs`

```rust
impl PatternOverride {
    pub fn marking_status(&self) -> MarkingStatus {
        self.marking_status
            .as_ref()
            .and_then(|s| MarkingStatus::from_str(s).ok())
            .unwrap_or(MarkingStatus::Draft)
    }
    
    pub fn is_approved(&self) -> bool {
        matches!(self.marking_status(), MarkingStatus::Approved | MarkingStatus::Applied)
    }
    
    pub fn is_pending_review(&self) -> bool {
        self.marking_status() == MarkingStatus::PendingReview
    }
    
    pub fn mark_as(&mut self, status: MarkingStatus, marked_by: &str) {
        self.marking_status = Some(status.as_str().to_string());
        self.marked_by = Some(marked_by.to_string());
        self.marked_at = Some(chrono::Utc::now().to_rfc3339());
    }
    
    pub fn add_review_comment(&mut self, author: &str, comment: &str, status: &str) {
        if self.reviewed_by.is_none() {
            self.reviewed_by = Some(Vec::new());
        }
        
        if let Some(ref mut comments) = self.reviewed_by {
            comments.push(ReviewComment {
                author: author.to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                comment: comment.to_string(),
                status: status.to_string(),
            });
        }
    }
}

// Query helpers
pub struct MarkingQueries;

impl MarkingQueries {
    pub fn get_pending_review(overrides: &HashMap<String, PatternOverride>) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| o.is_pending_review())
            .collect()
    }
    
    pub fn get_by_priority(
        overrides: &HashMap<String, PatternOverride>,
        priority: Priority,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| {
                o.priority.as_ref()
                    .and_then(|p| parse_priority(p).ok())
                    .map(|p| p == priority)
                    .unwrap_or(false)
            })
            .collect()
    }
    
    pub fn get_by_category(
        overrides: &HashMap<String, PatternOverride>,
        category: Category,
    ) -> Vec<&PatternOverride> {
        overrides
            .values()
            .filter(|o| {
                o.category.as_ref()
                    .and_then(|c| parse_category(c).ok())
                    .map(|c| c == category)
                    .unwrap_or(false)
            })
            .collect()
    }
}
```

---

### Phase 2.5: VSCode UI for Marking

**Duration:** 3-4 days

#### Task 2.5.1: Add Marking Commands

**File:** `vscode-extension/package.json`

```json
{
  "contributes": {
    "commands": [
      {
        "command": "logScoutAnalyzer.markForReview",
        "title": "Mark for Review...",
        "category": "Log Scout"
      },
      {
        "command": "logScoutAnalyzer.setMarkingStatus",
        "title": "Set Marking Status",
        "category": "Log Scout"
      },
      {
        "command": "logScoutAnalyzer.addReviewComment",
        "title": "Add Review Comment",
        "category": "Log Scout"
      },
      {
        "command": "logScoutAnalyzer.viewPendingReview",
        "title": "View Patterns Pending Review",
        "category": "Log Scout"
      }
    ],
    "menus": {
      "commandPalette": [
        {
          "command": "logScoutAnalyzer.markForReview",
          "when": "editorFocus"
        },
        {
          "command": "logScoutAnalyzer.viewPendingReview"
        }
      ]
    }
  }
}
```

#### Task 2.5.2: Implement Marking Manager

**File:** `vscode-extension/src/markingManager.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import { PatternOverrideManager } from './patternOverrideManager';

export class MarkingManager {
    private static instance: MarkingManager;

    constructor(private overrideManager: PatternOverrideManager) {}

    static getInstance(): MarkingManager {
        if (!MarkingManager.instance) {
            MarkingManager.instance = new MarkingManager(
                PatternOverrideManager.getInstance()
            );
        }
        return MarkingManager.instance;
    }

    async markForReview(patternId: string): Promise<void> {
        const override = this.overrideManager.getOverride(patternId);
        if (!override) {
            vscode.window.showErrorMessage('Pattern override not found');
            return;
        }

        // Get priority
        const priority = await vscode.window.showQuickPick(
            ['low', 'medium', 'high', 'critical'],
            { placeHolder: 'Select priority' }
        );

        if (!priority) return;

        // Get category
        const category = await vscode.window.showQuickPick(
            ['regex', 'extractor', 'severity', 'missing-pattern'],
            { placeHolder: 'Select category' }
        );

        if (!category) return;

        // Get notes
        const notes = await vscode.window.showInputBox({
            prompt: 'Why does this pattern need review?',
            placeHolder: 'e.g., Extractor regex needs validation'
        });

        if (notes === undefined) return;

        // Update override
        const updated = {
            ...override,
            markingStatus: 'pending-review',
            markedBy: vscode.env.userName || 'unknown',
            markedAt: new Date().toISOString(),
            priority,
            category,
            notes: notes || override.notes
        };

        await this.overrideManager.updateOverride(patternId, updated);
        
        vscode.window.showInformationMessage(
            `Pattern marked for review (Priority: ${priority})`
        );
    }

    async setMarkingStatus(patternId: string, status: string): Promise<void> {
        const override = this.overrideManager.getOverride(patternId);
        if (!override) {
            vscode.window.showErrorMessage('Pattern override not found');
            return;
        }

        const updated = {
            ...override,
            markingStatus: status
        };

        await this.overrideManager.updateOverride(patternId, updated);
        vscode.window.showInformationMessage(`Status changed to: ${status}`);
    }

    async addReviewComment(patternId: string): Promise<void> {
        const override = this.overrideManager.getOverride(patternId);
        if (!override) {
            vscode.window.showErrorMessage('Pattern override not found');
            return;
        }

        const comment = await vscode.window.showInputBox({
            prompt: 'Add review comment'
        });

        if (!comment) return;

        const status = await vscode.window.showQuickPick(
            ['approved', 'changes-requested', 'questioned'],
            { placeHolder: 'Review status' }
        );

        if (!status) return;

        const updated = {
            ...override,
            reviewedBy: [
                ...(override.reviewedBy || []),
                {
                    author: vscode.env.userName || 'unknown',
                    timestamp: new Date().toISOString(),
                    comment,
                    status
                }
            ]
        };

        await this.overrideManager.updateOverride(patternId, updated);
        vscode.window.showInformationMessage('Review comment added');
    }

    async viewPendingReview(): Promise<void> {
        const allOverrides = this.overrideManager.getAllPatterns();
        const pending = Object.entries(allOverrides)
            .filter(([_, o]) => o.markingStatus === 'pending-review')
            .map(([id, override]) => ({
                id,
                label: override.name || id,
                description: `Priority: ${override.priority || 'medium'}`,
                override
            }));

        if (pending.length === 0) {
            vscode.window.showInformationMessage(
                'No patterns pending review'
            );
            return;
        }

        const selected = await vscode.window.showQuickPick(pending);
        if (selected) {
            // Show review details
            const detail = this.formatReviewDetail(selected.override);
            vscode.window.showInformationMessage(detail);
        }
    }

    private formatReviewDetail(override: any): string {
        const lines = [
            `Pattern: ${override.name || 'Unknown'}`,
            `Status: ${override.markingStatus}`,
            `Priority: ${override.priority}`,
            `Marked by: ${override.markedBy}`,
            `Notes: ${override.notes || 'None'}`
        ];

        if (override.reviewedBy && override.reviewedBy.length > 0) {
            lines.push(`\nReviews:`);
            override.reviewedBy.forEach((r: any) => {
                lines.push(`  - ${r.author}: ${r.status}`);
            });
        }

        return lines.join('\n');
    }
}
```

#### Task 2.5.3: Update PatternOverrideEditor

**File:** `vscode-extension/src/patternOverrideEditor.ts` (MODIFY)

Add marking fields to the editor UI:

```typescript
// In getHtmlContent() method, add to form:

<section class="marking-section">
    <h3>Review & Marking</h3>
    
    <div class="field">
        <label>Marking Status:</label>
        <select id="markingStatus" name="markingStatus">
            <option value="draft">Draft</option>
            <option value="pending-review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="applied">Applied</option>
        </select>
    </div>
    
    <div class="field">
        <label>Priority:</label>
        <select id="priority" name="priority">
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
        </select>
    </div>
    
    <div class="field">
        <label>Category:</label>
        <select id="category" name="category">
            <option value="">None</option>
            <option value="regex">Regex</option>
            <option value="extractor">Extractor</option>
            <option value="severity">Severity</option>
            <option value="missing-pattern">Missing Pattern</option>
        </select>
    </div>
    
    <div class="field">
        <label>Review Comments:</label>
        <div id="comments" style="border: 1px solid #ccc; padding: 10px; max-height: 150px; overflow-y: auto;">
            <!-- Comments will be populated here -->
        </div>
        <button type="button" id="addCommentBtn">Add Comment</button>
    </div>
</section>
```

---

### Phase 3.3: Marking Dashboard & Reports

**Duration:** 2-3 days

#### Task 3.3.1: Pattern Review TreeView

**File:** `vscode-extension/src/views/markingTreeView.ts` (NEW)

```typescript
export class MarkingTreeProvider implements vscode.TreeDataProvider<MarkingItem> {
    // Shows patterns grouped by:
    // - Pending Review (count)
    //   ├─ High Priority (list)
    //   ├─ Medium Priority (list)
    //   └─ Low Priority (list)
    // - Approved (count)
    // - Applied (count)
}
```

#### Task 3.3.2: Marking Status Bar

Add status bar item showing:
- "⏳ 3 pending review" (clickable → shows pending list)
- "✅ 12 approved" (clickable → shows approved list)

---

## Integration Points

### How Marking Integrates with Existing System

```
┌─────────────────────────────────────────────────────────────┐
│              User Creates Override (Phase 2)                │
│                                                              │
│  Step 1: "Override Pattern..." context menu                │
│  Step 2: Fill in extractor/regex/severity changes          │
│  Step 3: OPTIONAL: Mark for Review                          │
│         - Set priority                                      │
│         - Set category                                      │
│         - Add notes                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Override Stored with Marking Metadata               │
│                                                              │
│  .log-scout/pattern-overrides.json:                         │
│  {                                                           │
│    "markingStatus": "pending-review",                       │
│    "priority": "high",                                      │
│    "markedBy": "john@company.com",                          │
│    "markedAt": "2026-02-16T15:25:00Z",                      │
│    ...                                                      │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Team Reviews in VSCode (Phase 2.5)               │
│                                                              │
│  "View Patterns Pending Review"                             │
│  ├─ Pattern 1 (High Priority) → jane.smith approves        │
│  ├─ Pattern 2 (Medium) → john.doe requests changes         │
│  └─ Pattern 3 (Low) → waiting for review                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  LSP Server Applies Overrides (Phase 1)                     │
│                                                              │
│  Only patterns with:                                         │
│  - markingStatus: "approved" OR "applied"                   │
│  - are applied to pattern matching                          │
│                                                              │
│  Draft/pending patterns are STORED but NOT USED             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│       Reporting & Dashboard (Phase 3.3)                    │
│                                                              │
│  Shows:                                                      │
│  - ⏳ 3 pending review (high priority)                      │
│  - ✅ 12 approved                                           │
│  - 🚀 8 applied & working                                   │
│  - 📊 Average review time                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Individual Pattern Override with Marking

```
User discovers broken pattern → 
  "Parameters not extracted"
  
"Override Pattern..." context menu →
  - Edit extractor regex
  - Add notes about why
  
OPTION: "Mark for Review" →
  - Select priority: High
  - Select category: Extractor
  - Add: "Needs validation with larger log sample"
  
Override saved with status: "pending-review"
  
Team can now see this in "Pending Review" view
```

### Workflow 2: Team Review & Approval

```
Pattern marked for review →

Other team member sees in VSCode:
  "View Patterns Pending Review"
  ├─ AuthPattern v2 (High Priority)
  
Clicks on it → Opens in editor
  - Views original pattern
  - Views proposed changes
  - Sees reason from author
  - Reviews notes/reasons
  
Adds comment: "Verified with 50 log samples ✓"
Changes status: "approved"
  
Override now applied to pattern matching
Status updated: "approved" → used by LSP
```

### Workflow 3: Bulk Review Campaign

```
Team discovers 20 HTTP patterns need fixes

Each team member marks ~4 patterns:
  Priority: High
  Category: Extractor
  Notes: Specific issue and suggested fix
  
Manager/Lead reviews all in dashboard:
  "Patterns Pending Review"
  Shows: 20 total, 5 already approved, 15 waiting
  
Approves high-priority ones → Immediately used
Discusses disputed ones → Comments track discussion
  
After all reviewed → "Applied" count increases
```

---

## Summary: Updated Project Timeline

| Phase | Duration | Focus | New Additions |
|-------|----------|-------|---------------|
| **1** | 3-5 days | LSP Foundation | Task 1.6: Marking data structures |
| **2** | 4-6 days | VSCode UI | Task 2.5: Marking commands & UI |
| **3** | 2-3 days | Advanced | Task 3.3: Marking dashboard |
| **4** | 2-4 weeks | Agentic (optional) | Use marking to improve suggestions |

**Total Impact:** +2-3 days of work, minimal architectural changes

---

## Backward Compatibility

All marking fields are **optional**:
- Existing overrides without marking fields continue to work
- All overrides without `markingStatus` default to `"draft"`
- LSP server still applies overrides even without marking metadata
- Only applied overrides are used for pattern matching (safest approach)

---

## Success Metrics

✅ **Phase 1.6 Complete:**
- Marking fields stored in pattern-overrides.json
- Validation ensures valid status/priority/category
- Query helpers find pending patterns

✅ **Phase 2.5 Complete:**
- Users can mark patterns for review
- Priority/category selectable
- Review comments trackable
- "Pending Review" view functional

✅ **Phase 3.3 Complete:**
- Dashboard shows review status
- Team can coordinate reviews
- Audit trail captured in JSON

---

## Next Steps

1. **Review this plan** with the team
2. **Integrate into existing Phase 1.6** task list
3. **Add to Phase 2.5** task list
4. **Start implementation** after Phase 1.5 completes
5. **Consider Phase 4 integration** - marking data can improve agentic suggestions
