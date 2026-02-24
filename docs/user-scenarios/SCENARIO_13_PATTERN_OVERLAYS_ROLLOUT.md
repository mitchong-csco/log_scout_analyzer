# Scenario 13: Pattern Overlays - Gradual Rollout 📋

**Status:** 📋 Planned  
**Priority:** Low (enterprise feature)  
**Feature Area:** Pattern Overlays  
**User Persona:** Team Lead / DevOps Manager

---

## 🎯 User Story

*"As a team lead, I want to test a new pattern overlay on 10% of our production bundles before rolling out to everyone."*

---

## 📖 Context

A team lead is managing a large organization with 50+ UC engineers analyzing hundreds of RTMT bundles monthly. They've created a new pattern overlay to detect a recently discovered issue, but they're concerned about:

- **False positives** - The pattern might be too broad and create noise
- **Performance impact** - Untested regex patterns could slow down analysis
- **User disruption** - If the pattern breaks, it affects the entire team
- **Validation** - Need to verify effectiveness before full deployment

They need a **gradual rollout** mechanism:
- Test on a small percentage of bundles first
- Monitor results and gather feedback
- Gradually increase rollout percentage
- Quick rollback if issues are discovered
- Time-bound testing windows

This is critical for enterprise deployments where stability is paramount.

---

## 🎬 Target User Flow

### Step 1: Create Rollout-Controlled Overlay

1. Team lead creates new overlay: "New Database Timeout Detection"
2. Defines pattern to detect new issue discovered in field
3. Opens **Scenario Conditions** dialog:

```
┌─────────────────────────────────────────────────┐
│ Overlay Scenario Conditions                     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Activation Strategy:                            │
│ ● Gradual Rollout (Percentage-based)           │
│ ○ Always Active                                 │
│ ○ Hostname-based                                │
│ ○ Time-window based                             │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ Rollout Configuration:                          │
│                                                 │
│ Rollout Percentage: [10]% ────────────O         │
│                      0%            50%      100%│
│                                                 │
│ ℹ️  10% of bundles will activate this overlay   │
│                                                 │
│ Sampling Method:                                │
│ ● Random (consistent per bundle)               │
│ ○ First N bundles                               │
│ ○ Specific bundle IDs                           │
│                                                 │
│ Test Window:                                    │
│ From: [2026-02-24] To: [2026-03-03]            │
│                                                 │
│ ℹ️  After test window, requires manual update   │
│                                                 │
│ Monitoring:                                     │
│ ☑ Track activation rate                        │
│ ☑ Log which bundles activate                   │
│ ☑ Collect performance metrics                  │
│                                                 │
│        [Preview]  [Cancel]  [Save]              │
└─────────────────────────────────────────────────┘
```

4. Team lead sets:
   - **Rollout Percentage:** 10%
   - **Sampling Method:** Random (consistent)
   - **Test Window:** 1 week (Feb 24 - Mar 3)
   - **Monitoring:** All enabled

### Step 2: Activate with 10% Rollout

5. Team lead activates overlay in "Staged" state
6. System calculates which bundles will receive overlay:
   - Uses deterministic hash (bundleId + overlayId)
   - Same bundle always gets same result (consistent)
   - ~10% of bundles activate overlay

7. Tree view shows rollout status:

```
📦 PATTERN OVERLAYS
└─ 🟡 New DB Timeout Detection (p=75) [Staged - 10% Rollout]
   ├─ 📊 Rollout Status:
   │  ├─ Target: 10% of bundles
   │  ├─ Active: 7 bundles (since Feb 24)
   │  ├─ Window: 7 days remaining
   │  └─ [View Active Bundles]
   ├─ 📈 Performance:
   │  ├─ Avg apply time: 45ms
   │  ├─ No errors detected
   │  └─ [View Details]
   └─ 🏷️ 1 rule: Tag DB timeouts
```

### Step 3: Monitor Rollout

8. Engineers open various bundles:
   - **Bundle A** (hash=0.03): ✅ Overlay activates (< 10%)
   - **Bundle B** (hash=0.47): ❌ Overlay skipped (> 10%)
   - **Bundle C** (hash=0.08): ✅ Overlay activates (< 10%)
   - **Bundle D** (hash=0.92): ❌ Overlay skipped (> 10%)

9. Team lead views rollout dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│ Rollout Dashboard: New DB Timeout Detection                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 📊 Activation Stats (Last 7 Days)                           │
│                                                             │
│   Total Bundles Opened: 68                                  │
│   Overlay Activated:     7 (10.3%)  ✅ On target            │
│   Overlay Skipped:       61 (89.7%)                         │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🎯 Detection Results (7 bundles)                            │
│                                                             │
│   Matches Found:         34 new timeout patterns            │
│   False Positives:       2 (user reported)                  │
│   Accuracy:              94%  ✅ Good                        │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ ⚡ Performance Impact                                        │
│                                                             │
│   Avg Apply Time:        45ms                               │
│   Max Apply Time:        123ms                              │
│   Errors:                0  ✅ Stable                        │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 💬 User Feedback (7 responses)                              │
│                                                             │
│   Helpful:               5 (71%)                            │
│   Not Helpful:           2 (29%)                            │
│                                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                             │
│ 🎯 Recommendation:                                          │
│                                                             │
│ ✅ Pattern is performing well with 94% accuracy             │
│ ✅ No performance issues detected                           │
│ ✅ Safe to increase rollout to 50%                          │
│                                                             │
│      [Keep at 10%]  [Increase to 50%]  [Rollback]          │
└─────────────────────────────────────────────────────────────┘
```

### Step 4: Increase Rollout to 50%

10. After 3 days of successful testing, team lead clicks **"Increase to 50%"**
11. System updates overlay configuration:
    ```json
    "scenario": {
      "rolloutPercent": 50,
      "sampleSet": "random"
    }
    ```
12. New bundles opened have 50% chance of activation
13. Previously activated bundles remain active (consistent hashing)

### Step 5: Full Rollout

14. After 1 week, metrics show:
    - 94% accuracy maintained
    - No performance degradation
    - Positive user feedback
15. Team lead clicks **"Increase to 100%"**
16. Overlay now active for all bundles
17. Scenario conditions can be removed (always active)

### Step 6: Rollback Scenario (If Issues Found)

**Alternate flow if problems detected:**

1. Day 2: False positive rate spikes to 35%
2. Dashboard shows warning: ⚠️ Accuracy below threshold
3. Team lead receives notification
4. Clicks **"Rollback"** button
5. System immediately sets rollout to 0%
6. Overlay deactivated for all new bundle openings
7. Team lead fixes pattern, restarts gradual rollout

---

## ✅ Success Criteria

### Functional Requirements
- ✅ **Percentage-based activation** - Configurable 0-100% rollout
- ✅ **Deterministic sampling** - Same bundle always gets same result
- ✅ **Time-window constraints** - Rollout expires after test period
- ✅ **Easy rollback** - Instant deactivation in case of issues
- ✅ **Monitoring dashboard** - Real-time metrics and feedback
- ✅ **Gradual increase** - Smooth transition from 10% → 50% → 100%

### User Experience
- ✅ **Clear status indication** - Visual indicator of rollout percentage
- ✅ **Transparency** - Engineers know when overlay is active
- ✅ **Quick adjustment** - Change percentage with one click
- ✅ **Audit trail** - Log all rollout changes
- ✅ **Notifications** - Alert team lead of issues

### Technical
- ✅ **Consistent hashing** - Same result for same bundle
- ✅ **No central server** - Works offline, client-side only
- ✅ **Performance** - < 1ms to determine activation
- ✅ **Scalability** - Works with 1000+ bundles

---

## 📊 Acceptance Tests

### Test 1: Deterministic Activation
```gherkin
Given an overlay with 10% rollout
And bundleId "700435046"
When the bundle is opened 10 times
Then the overlay activates 10 times OR skips 10 times (consistent)
And not a mix of activations and skips
```

### Test 2: Correct Percentage Distribution
```gherkin
Given an overlay with 25% rollout
When 1000 different bundles are opened
Then approximately 250 bundles activate the overlay
And the activation rate is 25% ± 5% (statistical variance)
```

### Test 3: Rollout Increase
```gherkin
Given an overlay at 10% rollout
And bundle "A" activates (hash=0.03)
And bundle "B" skips (hash=0.47)
When rollout is increased to 50%
Then bundle "A" still activates (consistent)
And bundle "B" now activates (0.47 < 0.50)
```

### Test 4: Time Window Expiration
```gherkin
Given an overlay with time window Feb 24 - Mar 3
And rollout is 50%
When the current date is Mar 4 (expired)
Then the overlay is automatically deactivated
And a notification is shown to team lead
```

### Test 5: Rollback to 0%
```gherkin
Given an overlay at 50% rollout
When team lead clicks "Rollback" button
Then rollout is set to 0%
And no new bundles activate the overlay
And already-active bundles are unaffected (until reload)
```

### Test 6: Monitoring Metrics
```gherkin
Given an overlay at 10% rollout
And 100 bundles opened (10 activated)
When team lead views rollout dashboard
Then activation count shows 10
And activation percentage shows 10%
And performance metrics are displayed
```

---

## 🏗️ Technical Implementation

### Data Structure (JSON)

```json
{
  "layerId": "overlay-new-db-timeout",
  "name": "New Database Timeout Detection",
  "type": "organization",
  "priority": 75,
  "scope": {
    "level": "global"
  },
  "state": "active",
  "enabled": true,
  "scenario": {
    "type": "gradual-rollout",
    "rolloutPercent": 10,
    "sampleSet": "random",
    "consistentHashing": true,
    "timeWindow": {
      "from": "2026-02-24T00:00:00Z",
      "to": "2026-03-03T23:59:59Z"
    },
    "monitoring": {
      "trackActivation": true,
      "trackPerformance": true,
      "notifyOnIssues": true
    }
  },
  "rolloutHistory": [
    {
      "timestamp": "2026-02-24T10:00:00Z",
      "percentage": 10,
      "author": "teamlead@company.com",
      "reason": "Initial test rollout"
    },
    {
      "timestamp": "2026-02-27T14:30:00Z",
      "percentage": 50,
      "author": "teamlead@company.com",
      "reason": "Increased after successful 3-day test"
    }
  ],
  "rules": [
    {
      "id": "detect-new-db-timeout",
      "signature": {
        "type": "regex",
        "pattern": "(?i)database.*timeout.*query.*id:\\s*(\\d+)"
      },
      "action": {
        "type": "tag",
        "tags": ["db-timeout-new", "needs-review"]
      }
    }
  ]
}
```

### Rollout Metrics Type

```typescript
interface RolloutMetrics {
  overlayId: string;
  rolloutPercent: number;
  
  // Activation stats
  activation: {
    totalBundlesOpened: number;
    bundlesActivated: number;
    bundlesSkipped: number;
    activationRate: number;  // Actual percentage
  };
  
  // Performance metrics
  performance: {
    avgApplyTime: number;    // milliseconds
    maxApplyTime: number;
    minApplyTime: number;
    errorCount: number;
  };
  
  // Detection results
  results: {
    matchesFound: number;
    falsePositives: number;
    accuracy: number;        // percentage
  };
  
  // User feedback
  feedback: {
    helpful: number;
    notHelpful: number;
    comments: string[];
  };
  
  // Time window
  window: {
    start: Date;
    end: Date;
    daysRemaining: number;
    isExpired: boolean;
  };
}
```

### Code Flow

```typescript
// 1. Scenario Evaluator - Gradual Rollout
class ScenarioEvaluator {
  shouldActivate(overlay: PatternLayer, bundleId: string): boolean {
    if (!overlay.scenario) {
      return true; // No conditions = always active
    }
    
    const scenario = overlay.scenario;
    
    // Check time window
    if (scenario.timeWindow) {
      const now = new Date();
      const start = new Date(scenario.timeWindow.from);
      const end = new Date(scenario.timeWindow.to);
      
      if (now < start || now > end) {
        logger.info(`Overlay ${overlay.layerId} outside time window`);
        return false;
      }
    }
    
    // Check rollout percentage
    if (scenario.type === 'gradual-rollout') {
      const shouldActivate = this.checkRollout(
        bundleId,
        overlay.layerId,
        scenario.rolloutPercent
      );
      
      // Track activation decision
      if (scenario.monitoring?.trackActivation) {
        this.trackActivation(overlay.layerId, bundleId, shouldActivate);
      }
      
      return shouldActivate;
    }
    
    return true;
  }
  
  private checkRollout(
    bundleId: string,
    overlayId: string,
    rolloutPercent: number
  ): boolean {
    // Deterministic hash: same inputs = same output
    const hash = this.consistentHash(bundleId, overlayId);
    
    // hash is 0.0 to 1.0, rolloutPercent is 0 to 100
    const threshold = rolloutPercent / 100;
    
    const shouldActivate = hash < threshold;
    
    logger.debug(
      `Rollout check: bundle=${bundleId}, overlay=${overlayId}, ` +
      `hash=${hash.toFixed(4)}, threshold=${threshold.toFixed(4)}, ` +
      `activate=${shouldActivate}`
    );
    
    return shouldActivate;
  }
  
  // Consistent hashing using murmurhash or similar
  private consistentHash(bundleId: string, overlayId: string): number {
    const input = `${bundleId}:${overlayId}`;
    const hash = this.murmurhash3(input);
    
    // Normalize to 0.0 - 1.0
    return (hash >>> 0) / 0xFFFFFFFF;
  }
  
  private murmurhash3(str: string): number {
    // Simple murmurhash3 implementation for consistent hashing
    let h = 0x12345678;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0xcc9e2d51);
      h = (h << 15) | (h >>> 17);
      h = Math.imul(h, 0x1b873593);
    }
    return h;
  }
}

// 2. Rollout Metrics Tracker
class RolloutMetricsTracker {
  private metrics: Map<string, RolloutMetrics> = new Map();
  
  trackActivation(overlayId: string, bundleId: string, activated: boolean) {
    const metric = this.getOrCreateMetric(overlayId);
    
    metric.activation.totalBundlesOpened++;
    if (activated) {
      metric.activation.bundlesActivated++;
    } else {
      metric.activation.bundlesSkipped++;
    }
    
    metric.activation.activationRate = 
      (metric.activation.bundlesActivated / metric.activation.totalBundlesOpened) * 100;
    
    this.saveMetric(overlayId, metric);
  }
  
  trackPerformance(overlayId: string, applyTime: number, error?: Error) {
    const metric = this.getOrCreateMetric(overlayId);
    
    metric.performance.avgApplyTime = 
      (metric.performance.avgApplyTime + applyTime) / 2;
    metric.performance.maxApplyTime = 
      Math.max(metric.performance.maxApplyTime, applyTime);
    metric.performance.minApplyTime = 
      Math.min(metric.performance.minApplyTime || Infinity, applyTime);
    
    if (error) {
      metric.performance.errorCount++;
    }
    
    this.saveMetric(overlayId, metric);
  }
  
  getMetrics(overlayId: string): RolloutMetrics | undefined {
    return this.metrics.get(overlayId);
  }
}

// 3. Rollout Dashboard View
class RolloutDashboardProvider {
  async showDashboard(overlay: PatternLayer) {
    const metrics = this.metricsTracker.getMetrics(overlay.layerId);
    
    if (!metrics) {
      vscode.window.showInformationMessage('No metrics available yet');
      return;
    }
    
    const panel = vscode.window.createWebviewPanel(
      'rolloutDashboard',
      `Rollout: ${overlay.name}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    
    panel.webview.html = this.generateDashboardHTML(overlay, metrics);
    
    // Handle actions from dashboard
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'increaseRollout':
          await this.increaseRollout(overlay, message.percentage);
          break;
        case 'rollback':
          await this.rollback(overlay);
          break;
      }
    });
  }
  
  private async increaseRollout(overlay: PatternLayer, newPercent: number) {
    // Update overlay configuration
    if (!overlay.scenario) {
      overlay.scenario = { type: 'gradual-rollout' };
    }
    
    const oldPercent = overlay.scenario.rolloutPercent || 0;
    overlay.scenario.rolloutPercent = newPercent;
    
    // Add to history
    if (!overlay.rolloutHistory) {
      overlay.rolloutHistory = [];
    }
    overlay.rolloutHistory.push({
      timestamp: new Date().toISOString(),
      percentage: newPercent,
      author: 'current-user@company.com',
      reason: `Increased from ${oldPercent}% to ${newPercent}%`
    });
    
    // Save
    await this.layerManager.save(overlay);
    
    vscode.window.showInformationMessage(
      `Rollout increased to ${newPercent}%`
    );
  }
  
  private async rollback(overlay: PatternLayer) {
    const confirm = await vscode.window.showWarningMessage(
      `Rollback overlay "${overlay.name}" to 0%?`,
      'Yes, Rollback',
      'Cancel'
    );
    
    if (confirm === 'Yes, Rollback') {
      await this.increaseRollout(overlay, 0);
    }
  }
}
```

---

## 🎨 UI Mockups

### Rollout Status in Tree View

```
📦 PATTERN OVERLAYS
├─ 🟢 Base Patterns (p=0) [Active - 100%]
├─ 🟡 New DB Timeout (p=75) [Active - 10% Rollout]
│  ├─ 📊 Rollout: 7/68 bundles (10.3%)
│  ├─ ⏰ Window: 4 days remaining
│  ├─ ✅ Performance: Good
│  └─ [View Dashboard] [Increase] [Rollback]
└─ 🟢 Site Overrides (p=50) [Active - 100%]
```

### Rollout Configuration Dialog

```
┌─────────────────────────────────────────────────┐
│ Gradual Rollout Configuration                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Current Rollout: 10%                            │
│ ┌────────────────────────────────────────────┐ │
│ │ 0%  [====O--------------------------------] │ │
│ │         10%    25%     50%    75%    100%  │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ Increase To:                                    │
│ ○ 25%  - Quarter rollout                       │
│ ● 50%  - Half rollout                          │
│ ○ 100% - Full rollout                          │
│ ○ Custom: [___]%                               │
│                                                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                 │
│ 📊 Impact Estimate:                             │
│                                                 │
│ Current:  7 bundles active                      │
│ After:    34 bundles active (↑ 27)             │
│                                                 │
│ ⚠️  Recommendation: Monitor for 2-3 days        │
│    before increasing to 100%                    │
│                                                 │
│        [Cancel]  [Apply Change]                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Phases

### Phase 1: Scenario Conditions Framework (Week 7)
- [ ] Define `Scenario` type with rollout support
- [ ] Implement `ScenarioEvaluator` class
- [ ] Build consistent hashing function
- [ ] Write tests for deterministic behavior

### Phase 2: Rollout Percentage Logic (Week 7)
- [ ] Implement percentage-based activation
- [ ] Test distribution accuracy (1000 bundles)
- [ ] Handle edge cases (0%, 100%)
- [ ] Performance test (<1ms per check)

### Phase 3: Metrics Tracking (Week 8)
- [ ] Create `RolloutMetricsTracker`
- [ ] Track activation rate
- [ ] Track performance metrics
- [ ] Store metrics persistently

### Phase 4: Rollout Dashboard UI (Week 8)
- [ ] Build webview dashboard
- [ ] Show activation stats
- [ ] Display performance metrics
- [ ] Add increase/rollback buttons

### Phase 5: Time Window Support (Week 9)
- [ ] Implement time window checking
- [ ] Auto-deactivate on expiration
- [ ] Send expiration notifications
- [ ] Test timezone handling

### Phase 6: Rollout History (Week 9)
- [ ] Track rollout changes over time
- [ ] Store history in overlay metadata
- [ ] Display history in dashboard
- [ ] Export history for audit

---

## 📊 Success Metrics

### Developer Metrics
- ✅ < 1ms to determine activation (consistent hash)
- ✅ 100% deterministic (same input = same output)
- ✅ Accurate distribution (target ± 5%)
- ✅ Zero memory leaks in metrics tracking

### User Metrics
- ✅ 80% of team leads use gradual rollout for new patterns
- ✅ Average rollout duration: 5-7 days
- ✅ Rollback rate: < 5% (indicates good testing)
- ✅ Time to full deployment: 1-2 weeks

### Business Impact
- ✅ 90% reduction in pattern-related incidents
- ✅ Increased confidence in pattern changes
- ✅ Better risk management for enterprise deployments
- ✅ Improved team collaboration and transparency

---

## 🔗 Related Documentation

- **Scenario 14:** Pattern Overlays - Hostname-Specific (related scenario type)
- **Scenario 15:** Pattern Overlays - Layer Priority (architecture)
- **Technical Design:** `PATTERN_OVERLAYS_SCENARIOS.md` (Scenario section)
- **Implementation TODO:** `PATTERN_OVERLAYS_TODO.md` (Phase 6)

---

## 📝 Notes

### Design Decisions
1. **Why consistent hashing?** - Deterministic, offline-capable, no central server needed
2. **Why percentage-based?** - Easier to understand than absolute counts
3. **Why time windows?** - Prevents forgotten test rollouts from lingering
4. **Why client-side?** - Works in offline/air-gapped environments

### Edge Cases
- **Bundle opened multiple times** - Same result each time (consistent)
- **Overlay updated mid-rollout** - New bundles use new percentage
- **Time window expires** - Graceful deactivation with notification
- **0% rollout** - Effectively disables overlay
- **100% rollout** - Can remove scenario conditions entirely

### Consistent Hashing Algorithm
```
Input: bundleId="700435046", overlayId="overlay-new-db-timeout"
Combined: "700435046:overlay-new-db-timeout"
Hash: 0x7A3F9B2C
Normalized: 0.4784 (47.84%)

If rolloutPercent = 50%:
  0.4784 < 0.50 → ACTIVATE ✅
  
If rolloutPercent = 25%:
  0.4784 > 0.25 → SKIP ❌
```

### Future Enhancements
- **A/B testing** - Compare two overlay versions
- **Canary releases** - Test on specific user groups first
- **Auto-scaling** - Automatically increase based on metrics
- **Multi-stage rollout** - Define progression (10% → 25% → 50% → 100%)
- **Rollout schedules** - Automated time-based increases

---

**Last Updated:** 2026-02-24  
**Status:** Ready for Implementation (Phase 6-7)  
**Assigned To:** TBD