# Scenario 16: Pattern Overlays - State Lifecycle 📋

**Status:** 📋 Planned  
**Priority:** Medium  
**Feature Area:** Pattern Overlays  
**User Persona:** Sarah the Cisco UC Engineer

---

## 🎯 User Story

*"As Sarah, I want to draft pattern changes, test them, then activate. If they cause issues, I need to quickly disable or rollback."*

---

## 📖 Context

Sarah needs to create and modify pattern overlays safely. She wants to:

- **Draft** patterns without affecting current analysis
- **Test** patterns in preview mode before committing
- **Activate** patterns with confidence after validation
- **Disable** quickly if patterns cause issues
- **Archive** old patterns after cases close
- **Rollback** to previous states if needed

**Without State Management:**
- ❌ Patterns active immediately on creation (no testing)
- ❌ No way to preview impact before activation
- ❌ Accidental activation disrupts workflow
- ❌ Old patterns clutter workspace forever
- ❌ No rollback mechanism

**With State Lifecycle:**
- ✅ Safe pattern development in draft mode
- ✅ Preview before activation (staged state)
- ✅ Quick enable/disable toggle
- ✅ Automatic archival of old patterns
- ✅ State history for rollback

---

## 🔄 State Machine

```
┌────────────────────────────────────────────────────┐
│                  State Lifecycle                    │
├────────────────────────────────────────────────────┤
│                                                     │
│                   ┌─────────┐                       │
│          ┌───────>│  DRAFT  │<──────┐              │
│          │        └────┬────┘       │              │
│          │             │             │              │
│          │      "Preview"            │              │
│          │             │       "Edit" │             │
│          │             ▼             │              │
│          │        ┌─────────┐       │              │
│   "Revert"│       │ STAGED  │───────┘              │
│          │        └────┬────┘                       │
│          │             │                            │
│          │       "Activate"                         │
│          │             │                            │
│          │             ▼                            │
│          │        ┌─────────┐                       │
│          └────────│ ACTIVE  │                       │
│                   └────┬────┘                       │
│                        │                            │
│             ┌──────────┼──────────┐                 │
│             │          │          │                 │
│       "Disable"  "Deprecate"  "Archive"             │
│             │          │          │                 │
│             ▼          ▼          ▼                 │
│        ┌─────────┐ ┌──────────┐ ┌─────────┐        │
│        │INACTIVE │ │DEPRECATED│ │ARCHIVED │        │
│        └─────────┘ └──────────┘ └─────────┘        │
│             │          │              │             │
│       "Re-enable"  "Archive"     (Read-only)        │
│             │          │              │             │
│             └──────────┴──────────────┘             │
│                        │                            │
│                   (Back to ACTIVE)                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

## 📝 State Definitions

### 1. DRAFT 🟤

**Description:** Working state, not applied to diagnostics

**Purpose:**
- Create and edit patterns without affecting current analysis
- Test regex patterns against sample logs
- Iterate on rules without committing

**Characteristics:**
- ⚪ Not loaded by diagnostics provider
- ✏️ Fully editable (all fields)
- 🚫 No impact on Problems Panel
- 💾 Saved to disk but not active

**UI Indicator:** Gray icon, "Draft" label

**Actions Available:**
- ✏️ Edit rules
- 🔍 Test patterns
- ▶️ Preview (transition to Staged)
- 🗑️ Delete

---

### 2. STAGED 🟡

**Description:** Preview mode, shows impact without committing

**Purpose:**
- Preview before/after comparison
- Validate pattern effectiveness
- Share with team for review
- Test in non-production environment

**Characteristics:**
- 🔍 Loaded in preview mode only
- 📊 Shows statistics (matches, suppressions, etc.)
- ⏸️ Not applied to actual diagnostics
- ✏️ Still editable with preview refresh

**UI Indicator:** Yellow icon, "Staged" label, preview panel

**Actions Available:**
- ✏️ Edit rules (preview updates)
- 🔍 View detailed preview
- ✅ Activate (transition to Active)
- ↩️ Revert to Draft
- 🗑️ Delete

---

### 3. ACTIVE 🟢

**Description:** Live state, applied to diagnostics

**Purpose:**
- Actively modify pattern matching behavior
- Suppress warnings, tag entries, extract fields
- Fully integrated into analysis workflow

**Characteristics:**
- ✅ Loaded and applied by diagnostics provider
- 🔒 Edit-locked (prevent accidental changes)
- 📊 Affects Problems Panel, tree views, exports
- ⏱️ Performance monitored

**UI Indicator:** Green icon, "Active" label

**Actions Available:**
- 🔍 View details
- 📊 View statistics (matches, performance)
- ⏸️ Disable (transition to Inactive)
- ⚠️ Deprecate (transition to Deprecated)
- 📦 Archive (transition to Archived)
- ✏️ Edit (requires explicit unlock)

---

### 4. INACTIVE ⚪

**Description:** Temporarily disabled, easy to re-enable

**Purpose:**
- Quick disable without deleting
- A/B testing (enable/disable to compare)
- Troubleshooting (isolate problematic patterns)

**Characteristics:**
- ⏸️ Not applied to diagnostics
- 💾 Still saved on disk
- 🔄 Easy to re-enable
- ✏️ Editable while inactive

**UI Indicator:** Gray icon, "Inactive" label

**Actions Available:**
- ▶️ Re-enable (transition to Active)
- ✏️ Edit rules
- 🗑️ Delete
- 📦 Archive

---

### 5. DEPRECATED ⚠️

**Description:** Marked for removal, warning shown

**Purpose:**
- Grace period before archival
- Warn users of impending removal
- Allow time for migration to new patterns

**Characteristics:**
- ⚠️ Still active but shows warnings
- ⏰ Auto-archives after configurable period (default 30 days)
- 📅 Shows days remaining
- 🔔 Notifications sent to users

**UI Indicator:** Orange icon, "Deprecated" label with countdown

**Actions Available:**
- ↩️ Undeprecate (transition back to Active)
- 📦 Archive immediately
- 📝 View deprecation reason
- 🔔 Manage notifications

---

### 6. ARCHIVED 🗄️

**Description:** Historical record, read-only

**Purpose:**
- Keep history for audit/compliance
- Reference for future similar cases
- Learn from past patterns
- Restore if needed

**Characteristics:**
- 🗄️ Not loaded, not applied
- 🔒 Read-only (cannot edit)
- 💾 Moved to archive directory
- 🔍 Searchable in archive view

**UI Indicator:** Gray icon, "Archived" label with date

**Actions Available:**
- 🔍 View (read-only)
- 📋 Copy to new draft
- 🔄 Restore (create new draft from archived)
- 🗑️ Permanent delete (requires confirmation)

---

## 🎬 Target User Flow

### Step 1: Create in Draft State

1. Sarah creates new overlay: "Case 700435046 - Voicemail Investigation"
2. Initial state: **DRAFT** (default for new overlays)
3. Tree view shows:

```
📦 PATTERN OVERLAYS
└─ 🟤 Case 700435046 (p=100) [Draft]
   ├─ State: Draft (not active)
   ├─ Created: 2026-02-24 10:15:23
   └─ [Edit] [Preview] [Delete]
```

4. Sarah adds rules:
   - Suppress "Jabber MRA timeout"
   - Tag "Voicemail.*error" as "primary-issue"
5. Changes saved but NOT applied to Problems Panel

### Step 2: Preview (Staged State)

6. Sarah clicks **"Preview"**
7. State transitions: DRAFT → **STAGED**
8. Preview panel appears:

```
┌─────────────────────────────────────────────────────────────┐
│ Preview: Case 700435046                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Impact Analysis:                                         │
│                                                             │
│ Before (current):  847 warnings                             │
│ After (preview):   647 warnings                             │
│ Change:            -200 warnings (24% reduction)            │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🚫 Will Suppress (200 entries):                            │
│ • "Jabber MRA connection timeout" (150x)                    │
│ • "Jabber MRA session timeout" (35x)                        │
│ • "Jabber MRA auth timeout" (15x)                           │
│                                                             │
│ 🏷️  Will Tag (47 entries):                                  │
│ • "Voicemail service error" → primary-issue                │
│ • "Voicemail database error" → primary-issue               │
│                                                             │
│ ⚡ Estimated Performance:                                   │
│ • Apply time: ~45ms                                         │
│ • Memory impact: +2.3 MB                                    │
│ • No performance issues detected                            │
│                                                             │
│        [Edit Rules]  [Activate]  [Back to Draft]            │
└─────────────────────────────────────────────────────────────┘
```

9. Sarah reviews preview, confirms it looks correct

### Step 3: Activate

10. Sarah clicks **"Activate"**
11. Confirmation dialog:

```
┌─────────────────────────────────────────────────┐
│ Activate Overlay?                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Case 700435046 - Voicemail Investigation        │
│                                                 │
│ This will:                                      │
│ • Suppress 200 warnings                         │
│ • Tag 47 entries                                │
│ • Take effect immediately                       │
│                                                 │
│ You can disable this overlay at any time.      │
│                                                 │
│        [Cancel]  [Activate]                     │
└─────────────────────────────────────────────────┘
```

12. State transitions: STAGED → **ACTIVE**
13. Problems Panel updates immediately
14. Tree view shows:

```
📦 PATTERN OVERLAYS
└─ 🟢 Case 700435046 (p=100) [Active]
   ├─ State: Active (live)
   ├─ Activated: 2026-02-24 10:18:45
   ├─ Matches: 247 total (200 suppressed, 47 tagged)
   └─ [Disable] [Deprecate] [View Stats]
```

### Step 4: Temporary Disable (If Needed)

**Scenario:** Sarah suspects overlay is hiding important warnings

15. Sarah right-clicks overlay → **"Disable"**
16. State transitions: ACTIVE → **INACTIVE**
17. Problems Panel reverts: 647 → 847 warnings
18. Tree view shows:

```
📦 PATTERN OVERLAYS
└─ ⚪ Case 700435046 (p=100) [Inactive]
   ├─ State: Inactive (temporarily disabled)
   ├─ Disabled: 2026-02-24 14:22:11
   └─ [Re-enable] [Edit] [Delete]
```

19. Sarah investigates, confirms overlay was correct
20. Clicks **"Re-enable"** → back to ACTIVE

### Step 5: Deprecate After Case Closes

**30 days later:** Case 700435046 is closed

21. Sarah marks overlay as deprecated
22. State transitions: ACTIVE → **DEPRECATED**
23. Overlay remains active but shows warning:

```
📦 PATTERN OVERLAYS
└─ ⚠️ Case 700435046 (p=100) [Deprecated - 30 days]
   ├─ State: Deprecated (will archive in 30 days)
   ├─ Reason: "Case closed, no longer needed"
   ├─ Auto-archive: 2026-04-25
   └─ [Undeprecate] [Archive Now] [View Details]
```

24. Warning notification shown:
    > ⚠️ Overlay "Case 700435046" is deprecated and will be archived in 30 days

### Step 6: Automatic Archival

**30 days after deprecation:**

25. System automatically archives overlay
26. State transitions: DEPRECATED → **ARCHIVED**
27. Overlay moved to archive directory:
    ```
    .vscode/scout-overlays/archive/case-700435046-2026-03-26.json
    ```
28. Tree view (with "Show Archived" enabled):

```
📦 PATTERN OVERLAYS (ARCHIVED)
└─ 🗄️ Case 700435046 (p=100) [Archived]
   ├─ State: Archived (historical)
   ├─ Archived: 2026-04-25 00:00:00
   ├─ Active period: Feb 24 - Mar 26 (30 days)
   └─ [View Read-only] [Restore] [Delete Permanently]
```

### Step 7: Restore from Archive (If Needed)

**6 months later:** Similar case arises

29. Sarah searches archived overlays
30. Finds "Case 700435046" overlay
31. Clicks **"Restore"**
32. New draft created from archived version:
    - Name: "Case 700435046 (Restored)"
    - State: DRAFT
    - Rules: Copied from archived version
33. Sarah edits for new case, activates

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Clear state transitions** - Well-defined state machine
- ✅ **Preview before activation** - Staged state shows exact impact
- ✅ **Easy enable/disable** - One-click toggle for active overlays
- ✅ **Automatic archival** - Old overlays cleaned up automatically
- ✅ **State history** - Track all state changes with timestamps
- ✅ **Rollback support** - Revert to previous states

### User Experience
- ✅ **< 2 clicks** to change state (preview, activate, disable)
- ✅ **Visual clarity** - Color-coded state indicators
- ✅ **No accidental activation** - Confirmation dialogs for critical actions
- ✅ **Quick disable** - Instant deactivation in emergencies
- ✅ **Archive not delete** - Safety net for restoration

### Technical
- ✅ **State persistence** - Survive VS Code restarts
- ✅ **State validation** - Invalid transitions rejected
- ✅ **Atomic transitions** - State changes are transactional
- ✅ **Audit trail** - All state changes logged

---

## 📊 Acceptance Tests

### Test 1: Draft to Staged Transition
```gherkin
Given an overlay in Draft state
When user clicks "Preview"
Then state changes to Staged
And preview panel is displayed
And overlay is NOT applied to diagnostics
```

### Test 2: Staged to Active Transition
```gherkin
Given an overlay in Staged state
When user clicks "Activate"
Then state changes to Active
And overlay is applied to diagnostics
And Problems Panel updates immediately
```

### Test 3: Active to Inactive Toggle
```gherkin
Given an overlay in Active state
When user clicks "Disable"
Then state changes to Inactive
And overlay is removed from diagnostics
And Problems Panel reverts to pre-overlay state
When user clicks "Re-enable"
Then state changes back to Active
```

### Test 4: Deprecation Warning Period
```gherkin
Given an overlay in Active state
When user marks it as Deprecated with 30-day window
Then state changes to Deprecated
And overlay remains active but shows warnings
And countdown shows days remaining
And after 30 days, auto-archives to Archived state
```

### Test 5: Archive and Restore
```gherkin
Given an overlay in Archived state
When user clicks "Restore"
Then a new overlay is created in Draft state
And rules are copied from archived version
And original archived overlay remains unchanged
```

### Test 6: Invalid State Transitions
```gherkin
Given an overlay in Archived state
When user attempts to activate it directly
Then transition is rejected
And error message explains valid transitions
And suggests "Restore" action instead
```

### Test 7: State Persistence
```gherkin
Given an overlay in Staged state with preview open
When VS Code is closed and reopened
Then overlay is still in Staged state
And preview can be re-opened
```

---

## 🏗️ Technical Implementation

### Data Structure

```typescript
type OverlayState = 
  | 'draft'        // Working state, not active
  | 'staged'       // Preview mode, not applied
  | 'active'       // Live, applied to diagnostics
  | 'inactive'     // Temporarily disabled
  | 'deprecated'   // Marked for removal
  | 'archived';    // Historical, read-only

interface PatternLayer {
  layerId: string;
  name: string;
  priority: number;
  
  // State management
  state: OverlayState;
  enabled: boolean;
  
  // State history
  stateHistory: StateHistoryEntry[];
  
  // Deprecation settings
  deprecation?: {
    deprecatedAt: Date;
    archiveAt: Date;
    reason: string;
    autoArchive: boolean;
  };
  
  // Archive metadata
  archiveMetadata?: {
    archivedAt: Date;
    archivedBy: string;
    activeFrom: Date;
    activeTo: Date;
    totalDaysActive: number;
  };
  
  rules: Rule[];
}

interface StateHistoryEntry {
  fromState: OverlayState;
  toState: OverlayState;
  timestamp: Date;
  author: string;
  reason?: string;
  automatic?: boolean;  // True if auto-transition (e.g., deprecation)
}

interface StateTransition {
  from: OverlayState;
  to: OverlayState;
  allowed: boolean;
  requiresConfirmation: boolean;
  action: string;  // Button label
}
```

### State Machine Implementation

```typescript
class OverlayStateManager {
  // Valid state transitions
  private transitions: StateTransition[] = [
    // Draft transitions
    { from: 'draft', to: 'staged', allowed: true, requiresConfirmation: false, action: 'Preview' },
    { from: 'draft', to: 'active', allowed: true, requiresConfirmation: true, action: 'Activate' },
    
    // Staged transitions
    { from: 'staged', to: 'draft', allowed: true, requiresConfirmation: false, action: 'Back to Draft' },
    { from: 'staged', to: 'active', allowed: true, requiresConfirmation: true, action: 'Activate' },
    
    // Active transitions
    { from: 'active', to: 'inactive', allowed: true, requiresConfirmation: false, action: 'Disable' },
    { from: 'active', to: 'deprecated', allowed: true, requiresConfirmation: true, action: 'Deprecate' },
    { from: 'active', to: 'archived', allowed: true, requiresConfirmation: true, action: 'Archive' },
    
    // Inactive transitions
    { from: 'inactive', to: 'active', allowed: true, requiresConfirmation: false, action: 'Re-enable' },
    { from: 'inactive', to: 'draft', allowed: true, requiresConfirmation: false, action: 'Edit' },
    { from: 'inactive', to: 'archived', allowed: true, requiresConfirmation: true, action: 'Archive' },
    
    // Deprecated transitions
    { from: 'deprecated', to: 'active', allowed: true, requiresConfirmation: true, action: 'Undeprecate' },
    { from: 'deprecated', to: 'archived', allowed: true, requiresConfirmation: false, action: 'Archive Now' },
    
    // Archived transitions (limited)
    { from: 'archived', to: 'draft', allowed: true, requiresConfirmation: false, action: 'Restore to Draft' },
  ];
  
  /**
   * Check if state transition is valid
   */
  canTransition(from: OverlayState, to: OverlayState): boolean {
    return this.transitions.some(t => t.from === from && t.to === to && t.allowed);
  }
  
  /**
   * Transition overlay to new state
   */
  async transition(
    overlay: PatternLayer,
    toState: OverlayState,
    reason?: string
  ): Promise<boolean> {
    const fromState = overlay.state;
    
    // Validate transition
    if (!this.canTransition(fromState, toState)) {
      throw new Error(
        `Invalid state transition: ${fromState} → ${toState}. ` +
        `Valid transitions: ${this.getValidTransitions(fromState).join(', ')}`
      );
    }
    
    const transition = this.transitions.find(t => 
      t.from === fromState && t.to === toState
    )!;
    
    // Confirmation if required
    if (transition.requiresConfirmation) {
      const confirmed = await this.confirmTransition(overlay, fromState, toState);
      if (!confirmed) {
        return false;
      }
    }
    
    // Perform transition
    overlay.state = toState;
    
    // Record in history
    overlay.stateHistory.push({
      fromState,
      toState,
      timestamp: new Date(),
      author: this.getCurrentUser(),
      reason,
      automatic: false
    });
    
    // Execute state-specific actions
    await this.executeStateActions(overlay, toState);
    
    // Save
    await this.layerManager.save(overlay);
    
    logger.info(
      `State transition: ${overlay.name} (${fromState} → ${toState})`
    );
    
    return true;
  }
  
  /**
   * Execute actions when entering a state
   */
  private async executeStateActions(
    overlay: PatternLayer,
    state: OverlayState
  ) {
    switch (state) {
      case 'staged':
        // Show preview panel
        await this.previewPanel.show(overlay);
        break;
        
      case 'active':
        // Apply to diagnostics
        await this.layerManager.activate(overlay);
        this.diagnosticsProvider.refresh();
        break;
        
      case 'inactive':
        // Remove from diagnostics
        await this.layerManager.deactivate(overlay);
        this.diagnosticsProvider.refresh();
        break;
        
      case 'deprecated':
        // Schedule auto-archive
        this.scheduleAutoArchive(overlay);
        this.showDeprecationWarning(overlay);
        break;
        
      case 'archived':
        // Move to archive directory
        await this.moveToArchive(overlay);
        break;
    }
  }
  
  /**
   * Get valid transitions from current state
   */
  getValidTransitions(fromState: OverlayState): string[] {
    return this.transitions
      .filter(t => t.from === fromState && t.allowed)
      .map(t => t.to);
  }
  
  /**
   * Schedule automatic archival for deprecated overlay
   */
  private scheduleAutoArchive(overlay: PatternLayer) {
    const archiveDays = 30; // Configurable
    const archiveAt = new Date();
    archiveAt.setDate(archiveAt.getDate() + archiveDays);
    
    overlay.deprecation = {
      deprecatedAt: new Date(),
      archiveAt,
      reason: overlay.deprecation?.reason || 'Deprecated',
      autoArchive: true
    };
    
    // Schedule background task
    this.scheduler.scheduleTask(
      overlay.layerId,
      archiveAt,
      async () => {
        if (overlay.state === 'deprecated' && overlay.deprecation?.autoArchive) {
          await this.transition(overlay, 'archived', 'Auto-archived after deprecation period');
        }
      }
    );
  }
  
  /**
   * Move overlay to archive directory
   */
  private async moveToArchive(overlay: PatternLayer) {
    const archivePath = path.join(
      this.config.overlayDir,
      'archive',
      `${overlay.layerId}-${Date.now()}.json`
    );
    
    overlay.archiveMetadata = {
      archivedAt: new Date(),
      archivedBy: this.getCurrentUser(),
      activeFrom: this.getFirstActiveDate(overlay),
      activeTo: new Date(),
      totalDaysActive: this.calculateActiveDays(overlay)
    };
    
    // Move file
    await fs.promises.rename(
      this.getOverlayPath(overlay),
      archivePath
    );
    
    logger.info(`Archived overlay to ${archivePath}`);
  }
}
```

### UI - State Actions in Tree View

```typescript
class OverlayTreeItem extends vscode.TreeItem {
  constructor(
    public overlay: PatternLayer,
    private stateManager: OverlayStateManager
  ) {
    super(overlay.name, vscode.TreeItemCollapsibleState.Collapsed);
    
    // State-based icon and color
    this.iconPath = this.getStateIcon(overlay.state);
    this.description = `(p=${overlay.priority}) [${this.getStateLabel(overlay.state)}]`;
    
    // Context value for context menu
    this.contextValue = `overlay-${overlay.state}`;
    
    // Tooltip with state info
    this.tooltip = this.buildTooltip();
  }
  
  private getStateIcon(state: OverlayState): vscode.ThemeIcon {
    const icons: Record<OverlayState, { icon: string; color: string }> = {
      draft: { icon: 'edit', color: 'charts.gray' },
      staged: { icon: 'eye', color: 'charts.yellow' },
      active: { icon: 'check', color: 'charts.green' },
      inactive: { icon: 'circle-slash', color: 'charts.gray' },
      deprecated: { icon: 'warning', color: 'charts.orange' },
      archived: { icon: 'archive', color: 'charts.gray' }
    };
    
    const config = icons[state];
    return new vscode.ThemeIcon(config.icon, new vscode.ThemeColor(config.color));
  }
  
  private getStateLabel(state: OverlayState): string {
    const labels: Record<OverlayState, string> = {
      draft: 'Draft',
      staged: 'Staged',
      active: 'Active',
      inactive: 'Inactive',
      deprecated: 'Deprecated',
      archived: 'Archived'
    };
    return labels[state];
  }
  
  private buildTooltip(): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${this.overlay.name}**\n\n`);
    md.appendMarkdown(`State: **${this.getStateLabel(this.overlay.state)}**\n`);
    
    // State-specific info
    switch (this.overlay.state) {
      case 'deprecated':
        if (this.overlay.deprecation) {
          const daysRemaining = Math.ceil(
            (this.overlay.deprecation.archiveAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          md.appendMarkdown(`\n⚠️ Auto-archives in ${daysRemaining} days\n`);
        }
        break;
      case 'archived':
        if (this.overlay.archiveMetadata) {
          md.appendMarkdown(`\nArchived: ${this.overlay.archiveMetadata.archivedAt.toLocaleDateString()}\n`);
          md.appendMarkdown(`Active for: ${this.overlay.archiveMetadata.totalDaysActive} days\n`);
        }
        break;
    }
    
    // Show valid next states
    const nextStates = this.stateManager.getValidTransitions(this.overlay.state);
    if (nextStates.length > 0) {
      md.appendMarkdown(`\nValid actions: ${nextStates.join(', ')}\n`);
    }
    
    return md;
  }
}
```

---

## 🎨 UI Mockups

### State Indicators in Tree View

```
📦 PATTERN OVERLAYS
├─ 🟤 New Feature Detection (p=100) [Draft]
│  └─ Created 2 hours ago • Not active
│
├─ 🟡 Voicemail Tagging (p=100) [Staged]
│  └─ Preview mode • [Activate] [Edit]
│
├─ 🟢 Michigan Homes IT (p=25) [Active]
│  └─ Active 30 days • 847 matches • [Disable]
│
├─ ⚪ Old DB Patterns (p=50) [Inactive]
│  └─ Disabled 3 days ago • [Re-enable] [Delete]
│
├─ ⚠️ Case 700123456 (p=100) [Deprecated - 15 days]
│  └─ Auto-archives in 15 days • [Undeprecate]
│
└─ 🗄️ Case 700435046 (p=100) [Archived]
   └─ Archived 6 months ago • Active 30 days
```

### State History Panel

```
┌─────────────────────────────────────────────────────────────┐
│ State History: Case 700435046                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📅 2026-02-24 10:15:23                                      │
│ │  Created in Draft state                                   │
│ │  By: sarah@mihomes.com                                    │
│ │                                                           │
│ 📅 2026-02-24 10:17:45                                      │
│ │  Draft → Staged                                           │
│ │  By: sarah@mihomes.com                                    │
│ │  Reason: Preview before activation                        │
│ │                                                           │
│ 📅 2026-02-24 10:18:45                                      │
│ │  Staged → Active                                          │
│ │  By: sarah@mihomes.com                                    │
│ │  Reason: Pattern validated, activating                    │
│ │                                                           │
│ 📅 2026-02-24 14:22:11                                      │
│ │  Active → Inactive                                        │
│ │  By: sarah@mihomes.com                                    │
│ │  Reason: Troubleshooting false positives                  │
│ │                                                           │
│ 📅 2026-02-24 14:35:22                                      │
│ │  Inactive → Active                                        │
│ │  By: sarah@mihomes.com                                    │
│ │  Reason: Pattern confirmed correct                        │
│ │                                                           │
│ 📅 2026-03-26 09:00:00                                      │
│ │  Active → Deprecated                                      │
│ │  By: sarah@mihomes.com                                    │
│ │  Reason: Case closed, no longer needed                    │
│ │                                                           │
│ 📅 2026-04-25 00:00:00                                      │
│ │  Deprecated → Archived (automatic)                        │
│ │  System auto-archived after 30-day grace period           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: State Machine Core (Week 2)
- [ ] Define state types and transitions
- [ ] Implement `OverlayStateManager` class
- [ ] Build state validation logic
- [ ] Write tests for all transitions

### Phase 2: State Persistence (Week 2)
- [ ] Add state field to overlay JSON
- [ ] Store state history
- [ ] Implement state restoration on load
- [ ] Test across VS Code restarts

### Phase 3: UI - State Indicators (Week 3)
- [ ] Add state-based icons/colors
- [ ] Show state in tree view
- [ ] Build state history panel
- [ ] Add state tooltips

### Phase 4: Preview (Staged State) (Week 3)
- [ ] Implement staged state logic
- [ ] Build preview panel
- [ ] Show before/after comparison
- [ ] Test preview accuracy

### Phase 5: Deprecation & Archival (Week 4)
- [ ] Implement deprecation warnings
- [ ] Build auto-archive scheduler
- [ ] Create archive directory structure
- [ ] Test automatic transitions

### Phase 6: Restore from Archive (Week 4)
- [ ] Build archive viewer
- [ ] Implement restore functionality
- [ ] Add archive search
- [ ] Test restore accuracy

---

## 📊 Success Metrics

### Developer Metrics
- ✅ 100% test coverage for state transitions
- ✅ < 10ms for state transition
- ✅ Zero invalid state transitions allowed
- ✅ State history never corrupted

### User Metrics
- ✅ 95% use preview before activation
- ✅ 80% disable vs delete (prefer non-destructive)
- ✅ 70% overlays archived within 60 days
- ✅ < 5% accidental activations

### Business Impact
- ✅ Safer pattern development (preview first)
- ✅ Easier experimentation (draft mode)
- ✅ Cleaner workspace (automatic archival)
- ✅ Historical record (compliance/audit)

---

## 🔗 Related Documentation

- **Scenario 15:** Pattern Overlays - Layer Priority (uses states)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (State section)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 2)
- **Quick Reference:** `PATTERN_OVERLAYS_QUICK_REF.md` (State lifecycle)

---

## 📝 Notes

### Design Decisions

1. **Why 6 states?** - Covers full lifecycle from creation to archival
2. **Why staged state?** - Forces preview, reduces accidental activation
3. **Why 30-day deprecation?** - Balance between cleanup and safety
4. **Why archive vs delete?** - Safety net, historical record, compliance

### State Transition Rules

**Always Allowed:**
- Draft → Staged (preview)
- Staged → Active (activate)
- Active ↔ Inactive (toggle)

**Requires Confirmation:**
- Draft → Active (skip preview)
- Active → Deprecated (begin archival)
- Active → Archived (immediate archival)

**Automatic:**
- Deprecated → Archived (after grace period)

**Never Allowed:**
- Archived → Active (must restore to draft first)
- Any state → Draft (except inactive, must create new)

### Configuration Options

```json
{
  "logScoutAnalyzer.overlays.defaultState": "draft",
  "logScoutAnalyzer.overlays.deprecationPeriodDays": 30,
  "logScoutAnalyzer.overlays.autoArchive": true,
  "logScoutAnalyzer.overlays.showArchived": false,
  "logScoutAnalyzer.overlays.confirmActivation": true
}
```

### Future Enhancements

- **Scheduled activation** - Activate at specific date/time
- **Conditional states** - State depends on context (e.g., active only during business hours)
- **State templates** - Predefined state workflows
- **Rollback snapshots** - Save full state at each transition
- **State analytics** - Track time spent in each state

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 2-3)  
**Assigned To:** TBD