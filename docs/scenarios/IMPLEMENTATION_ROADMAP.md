# User Scenarios - Implementation Roadmap

**Last Updated:** January 8, 2025  
**Purpose:** Prioritized implementation plan for user scenarios  
**Status:** Living document - updated as features ship  

---

## 🎯 Executive Summary

**Current State:**
- ✅ 7 scenarios complete (1, 2, 3, 5, 6, 7, 9)
- 🚧 2 scenarios partial (4, 8)
- 📋 1 scenario planned (10)

**Recommended Implementation Order:**
1. **Scenario 4** - Complete workspace persistence (quick win)
2. **Scenario 8** - Filter & search enhancements (high value)
3. **Scenario 10** - State tracking foundation (enables future)
4. Pattern overlays (multiple scenarios, long-term)

---

## 📊 Prioritization Framework

### Criteria
1. **User Impact** - How much does this help users?
2. **Effort** - How long to implement?
3. **Dependencies** - What needs to be done first?
4. **ROI** - User value / development effort
5. **Strategic Fit** - Aligns with product vision?

### Scoring Matrix

| Scenario | User Impact | Effort | Dependencies | ROI | Strategic | Priority |
|----------|-------------|--------|--------------|-----|-----------|----------|
| 4 - Workspace Persistence | High | Low | None | ⭐⭐⭐⭐⭐ | High | 🥇 #1 |
| 8 - Filter & Search | High | Medium | None | ⭐⭐⭐⭐ | High | 🥈 #2 |
| 10 - State Tracking | Medium | High | Pattern metadata | ⭐⭐⭐ | High | 🥉 #3 |
| Pattern Overlays | High | Very High | All above | ⭐⭐⭐ | Very High | #4-5 |

---

## 🚀 Phase 1: Complete Partial Scenarios (Sprint 1-2)

### ✅ Scenario 4: Workspace Persistence - COMPLETE!

**Status:** ✅ **DONE** (as of Jan 8, 2025)

**What Was Done:**
- ✅ Bundle analysis caching in bundle.json
- ✅ `getCachedAnalysis()` for instant summary
- ✅ `viewBundleSummary` command
- ✅ Auto-save after analysis
- ✅ 6 comprehensive tests

**Impact:**
- Instant bundle summary (<100ms vs 5-30s)
- Results persist across restarts
- Portable with bundle

**Remaining Gap:** None - scenario fully complete!

---

### 🎯 Scenario 8: Filter & Search Results

**Current Status:** 🚧 Native VS Code filtering only

**Gap Analysis:**
| Feature | Status | Effort |
|---------|--------|--------|
| Problems Panel filter | ✅ Native VS Code | Done |
| Text search | ✅ Native VS Code | Done |
| Pattern category filter | ❌ Not implemented | Medium |
| Custom filter expressions | ❌ Not implemented | Medium |
| Save/load filter presets | ❌ Not implemented | Low |
| Filter by state | ❌ Not implemented | High* |

*Depends on Scenario 10 state tracking

**Implementation Plan:**

#### Sprint 1 (1 week)
**Goal:** Pattern category filtering

**Tasks:**
1. Add category metadata to patterns ✅ (Already exists)
2. Create Filter panel in sidebar
   ```typescript
   Categories:
   ☑ Authentication
   ☑ Network
   ☐ Database
   ☑ SIP
   ```
3. Filter Results tree by selected categories
4. Persist filter state in workspace

**Acceptance Criteria:**
- User can check/uncheck categories
- Results tree updates in real-time
- Filter state persists across sessions
- Clear all filters button

**Estimated Effort:** 3-4 days

#### Sprint 2 (1 week)
**Goal:** Custom filter expressions

**Tasks:**
1. Add filter expression UI
   ```
   Filter: severity:error AND category:auth
   ```
2. Implement filter parser
   - Support: AND, OR, NOT
   - Fields: severity, category, pattern, file, message
3. Apply filters to Results tree
4. Show filter syntax help

**Acceptance Criteria:**
- User can write filter expressions
- Syntax highlighting for expressions
- Auto-complete for fields
- Error messages for invalid syntax

**Estimated Effort:** 4-5 days

#### Sprint 3 (3 days)
**Goal:** Filter presets

**Tasks:**
1. Add "Save Filter" button
2. Store presets in workspace settings
3. Quick-access preset dropdown
4. Share presets via JSON export

**Acceptance Criteria:**
- User can save current filters
- User can load saved filters
- Presets appear in dropdown
- Export/import preset files

**Estimated Effort:** 2-3 days

**Total Scenario 8 Effort:** 2-3 sprints (~3 weeks)

**Dependencies:** None (can start immediately)

**User Value:** ⭐⭐⭐⭐⭐ (High - frequently requested)

---

## 🔄 Phase 2: New Capabilities (Sprint 4-8)

### 🎯 Scenario 10: Application State Tracking

**Current Status:** 🚧 CallState infrastructure exists

**Gap Analysis:**
| Component | Status | Effort |
|-----------|--------|--------|
| CallState tracking | ✅ Complete | Done |
| Registration state | ❌ Not implemented | Medium |
| Feature flag state | ❌ Not implemented | Medium |
| Connection state | ❌ Not implemented | Medium |
| Pattern state metadata | ❌ Not implemented | High |
| Timeline visualization | 🚧 Basic exists | High |
| State analytics | ❌ Not implemented | Medium |

**Implementation Plan:**

#### Sprint 4 (2 weeks)
**Goal:** Pattern state metadata system

**Tasks:**
1. Design state metadata schema
   ```json
   {
     "pattern_id": "SIP_REGISTER_200",
     "state_tracking": {
       "entity_type": "registration",
       "state_field": "status",
       "state_value": "registered",
       "transitions_from": ["registering"],
       "transitions_to": ["unregistered"]
     }
   }
   ```
2. Annotate 50+ existing patterns with state metadata
3. Create pattern metadata validator
4. Add state metadata to pattern editor

**Acceptance Criteria:**
- 50+ patterns annotated
- Metadata validation passes
- Can query patterns by state type
- Documentation for adding state metadata

**Estimated Effort:** 8-10 days

#### Sprint 5 (2 weeks)
**Goal:** State extraction engine

**Tasks:**
1. Create StateTracker service
   ```typescript
   class StateTracker {
     trackStateChange(event: StateChange): void;
     getTimeline(entityId: string): StateTimeline;
     getAnalytics(entityType: string): StateAnalytics;
   }
   ```
2. Extract state changes from log patterns
3. Detect state transitions (previous → new)
4. Calculate state durations
5. Store state timeline per entity

**Acceptance Criteria:**
- Tracks call states (already working)
- Tracks registration states
- Tracks feature flag states
- State transitions detected correctly
- Duration calculations accurate

**Estimated Effort:** 8-10 days

#### Sprint 6 (2 weeks)
**Goal:** Timeline visualization

**Tasks:**
1. Create Timeline panel in sidebar
2. Swimlane view (one row per entity)
3. State blocks with color coding
4. Hover shows state details
5. Click jumps to log line
6. Filter by entity type, state

**Acceptance Criteria:**
- Visual timeline for state changes
- Interactive (hover, click)
- Color-coded by state type
- Filterable by entity/state
- Performance: <100ms render for 100 entities

**Estimated Effort:** 8-10 days

#### Sprint 7 (1 week)
**Goal:** State analytics

**Tasks:**
1. State distribution dashboard
2. Transition frequency analysis
3. Failure pattern detection
4. Outlier identification
5. Export analytics report

**Acceptance Criteria:**
- Shows state duration percentages
- Identifies common transitions
- Highlights failure patterns
- Exports to Markdown/JSON
- Interactive charts (optional)

**Estimated Effort:** 5-7 days

**Total Scenario 10 Effort:** 4-5 sprints (~7-9 weeks)

**Dependencies:** 
- Pattern metadata system (new)
- Enhanced timeline view (enhancement)

**User Value:** ⭐⭐⭐⭐ (Medium-High - powerful debugging tool)

---

## 🎨 Phase 3: Pattern Overlays (Sprint 9+)

### Overview
Pattern overlays are a major feature set enabling pattern customization without modifying core patterns.

**Scenarios Covered:**
- Quick fix for noisy warnings
- Custom tagging for analysis
- Field extraction for metrics
- Gradual rollout (A/B testing)
- Hostname-specific rules
- Layer inheritance & priority
- State lifecycle

**Strategic Importance:** ⭐⭐⭐⭐⭐ (Critical for enterprise adoption)

**Total Effort:** 12-16 weeks

**Dependencies:**
- Pattern metadata system (from Scenario 10)
- State tracking foundation (from Scenario 10)

**Implementation:** See separate Pattern Overlays roadmap

---

## 📅 Recommended Timeline

### Q1 2025 (Jan-Mar)
- ✅ **Week 1:** Scenario 4 complete (DONE!)
- **Week 2-4:** Scenario 8 - Filter & Search (3 weeks)
- **Week 5:** Buffer/testing

### Q2 2025 (Apr-Jun)
- **Week 1-2:** Scenario 10 Sprint 4 - Pattern metadata
- **Week 3-4:** Scenario 10 Sprint 5 - State extraction
- **Week 5-6:** Scenario 10 Sprint 6 - Timeline viz
- **Week 7-8:** Scenario 10 Sprint 7 - Analytics
- **Week 9:** Buffer/testing
- **Week 10-12:** Begin Pattern Overlays foundation

### Q3 2025 (Jul-Sep)
- **Pattern Overlays** - Core implementation
- **Beta testing** with select customers

### Q4 2025 (Oct-Dec)
- **Pattern Overlays** - Advanced features
- **GA release** for enterprise customers

---

## 🎯 Quick Wins (Can Do Now)

### Week 1: Scenario 4 Polish
- ✅ Bundle analysis caching (DONE!)
- Update Scenario 4 status to "Complete"
- Add "Last analyzed" timestamp to bundle tree
- Show cache age indicator

### Week 2: Scenario 8 Foundation
- Create Filter panel skeleton
- Wire up category checkboxes
- Basic filter logic
- Ship MVP

---

## 📊 Success Metrics

### Scenario 4 (Workspace Persistence)
- ✅ Cache hit rate: >90%
- ✅ Load time: <100ms from cache
- ✅ User complaints about re-analysis: 0

### Scenario 8 (Filter & Search)
**Target Metrics:**
- Filter usage: >50% of analysis sessions
- Time to find relevant issue: <2 minutes (vs 5+ minutes)
- User satisfaction: 4.5/5

### Scenario 10 (State Tracking)
**Target Metrics:**
- State timelines viewed: >30% of sessions
- Root cause time reduction: 40%
- State-based debugging success: >70%

---

## 🔄 Dependencies Graph

```
Scenario 4 (Workspace Persistence) ✅
  └─> COMPLETE (no blockers)

Scenario 8 (Filter & Search)
  └─> No dependencies (can start now)

Scenario 10 (State Tracking)
  ├─> Pattern metadata system (NEW)
  └─> Timeline visualization (ENHANCEMENT)
      └─> Scenario 10 enables...
          └─> Pattern Overlays (Future)
              └─> All advanced features
```

---

## 💡 Alternative Sequences

### Option A: Maximum User Value First
1. Scenario 8 (Filter) - immediate user impact
2. Scenario 4 polish - quick wins
3. Scenario 10 - foundation for future

**Pros:** Users see value quickly  
**Cons:** Delays strategic foundation

### Option B: Foundation First (RECOMMENDED)
1. Scenario 4 polish - complete critical scenarios ✅
2. Scenario 8 - high ROI, no dependencies
3. Scenario 10 - enables pattern overlays

**Pros:** Builds platform for future  
**Cons:** Longer time to advanced features

### Option C: Parallel Tracks
1. Track 1: Scenario 8 (one developer)
2. Track 2: Scenario 10 metadata (another developer)
3. Converge for timeline visualization

**Pros:** Faster overall delivery  
**Cons:** Requires 2+ developers, coordination overhead

---

## 🎓 Lessons Learned

### What Worked Well
- ✅ Starting with CallState in Scenario 6 gave us infrastructure for Scenario 10
- ✅ Bundle caching (Scenario 4) was quick win with high impact
- ✅ Documenting scenarios upfront clarified requirements

### What to Improve
- Pattern metadata should have been designed earlier
- Timeline visualization should be reusable across features
- Need better E2E test automation for scenarios

---

## 📝 Open Questions

1. **Scenario 8:** Should filters be workspace-specific or global?
   - **Recommendation:** Workspace-specific with global presets option

2. **Scenario 10:** How many state types to support initially?
   - **Recommendation:** Start with 3 (calls ✅, registration, features)

3. **Pattern Overlays:** On-disk vs in-memory storage?
   - **Recommendation:** On-disk (.log-scout/overlays/) for persistence

4. **Timeline View:** Separate panel or integrated in Results?
   - **Recommendation:** Separate panel (more flexible)

---

## 🔗 Related Documents

- **Scenarios:** `SCENARIO_*.md` files in this directory
- **Index:** [INDEX.md](INDEX.md)
- **Architecture:** `../architecture/ARCHITECTURE.md`
- **Roadmap:** `../../ROADMAP.md`

---

## ✅ Next Actions

**Immediate (This Week):**
- [x] Complete Scenario 4 (bundle caching) - DONE!
- [ ] Update Scenario 4 status to "Complete"
- [ ] Start Scenario 8 Sprint 1 planning

**Next Sprint:**
- [ ] Implement category filtering (Scenario 8)
- [ ] Design pattern metadata schema (Scenario 10 prep)
- [ ] Create E2E tests for Scenario 8

**Long-term:**
- [ ] Hire/assign developer for Pattern Overlays
- [ ] Begin user research for overlay use cases
- [ ] Plan beta program for Q3

---

**Document Owner:** Engineering Team  
**Review Cadence:** Monthly  
**Last Review:** January 8, 2025  
**Next Review:** February 8, 2025