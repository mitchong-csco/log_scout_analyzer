# 🗺️ Log Scout Analyzer - Product Roadmap

**Last Updated**: February 22, 2024  
**Status**: Active Development  
**Current Phase**: Phase 2 (Hybrid Normalization) - Complete ✅

---

## 📍 Current Status

### ✅ Completed Phases

#### Phase 1: Foundation & Bundle Management (Complete)
- ✅ Bundle-centric workflow
- ✅ Bundle import from QCSONE packages
- ✅ Async import with progress tracking
- ✅ Auto-detection of case IDs from filenames
- ✅ Service type detection
- ✅ Archive extraction (nested ZIP support)
- ✅ File-based bundle storage
- ✅ Bundle Explorer tree view
- ✅ Add current file to bundle
- ✅ Bundle analysis with pattern matching
- ✅ Configurable task completion notifications

#### Phase 2: Hybrid Normalization System (Complete)
- ✅ Phase 2.1: Vendor-specific normalizers (4 normalizers)
- ✅ Phase 2.2: Progressive pipeline
- ✅ Phase 2.3: Learning system with adaptive behavior
- ✅ NormalizedEvent schema
- ✅ Vendor detection (10 Cisco products)
- ✅ Multi-vendor log correlation
- ✅ Performance optimization (<10ms normalization)

#### Notification System (Complete)
- ✅ Configurable notification categories (9 categories)
- ✅ Enable/disable individual notifications
- ✅ Task-specific notification helpers (10+ methods)
- ✅ Smart defaults (important tasks enabled)
- ✅ Errors always shown (cannot be disabled)
- ✅ YAML configuration support
- ✅ Full test coverage (5 unit tests)

---

## 🚀 Active Development

### Phase 3: MongoDB Integration & Collaboration (In Progress)
**Timeline**: Q1 2024  
**Status**: Architecture designed, ready for implementation

**Goals**:
- Team collaboration on bundles
- Cloud storage and synchronization
- Role-based access control (RBAC)
- High availability with MongoDB cluster
- Backward compatibility with file-based storage

**Components**:
- [ ] MongoDB client integration
- [ ] Hybrid storage mode (MongoDB + filesystem fallback)
- [ ] User authentication and RBAC
- [ ] Bundle sharing and permissions
- [ ] Configuration backup to MongoDB
- [ ] Team workspace management

**Dependencies**: 
- MongoDB 3-node cluster (configured)
- Credentials and connection strings (ready)

**References**:
- `docs/PHASE3_MONGODB_IMPLEMENTATION.md`
- `BACKWARD_COMPATIBILITY.md`
- `AUTO_BACKUP_COMPLETE.md`

---

## 📋 Planned Phases

### Phase 4: Advanced Pattern Features (Planned)
**Timeline**: Q2 2024  
**Status**: Not started

**Goals**:
- Signature system for event identification
- Action extraction and normalization
- Scenario detection across events
- Enhanced pattern matching
- Integration with learning system

**Prerequisites**: Phase 2 complete ✅

### Phase 5: Performance & Scale (Planned)
**Timeline**: Q2-Q3 2024

**Goals**:
- Streaming analysis for large files (>1GB)
- Incremental parsing
- Memory optimization
- Parallel processing
- Batch operations

### Phase 6: Enterprise Features (Planned)
**Timeline**: Q3-Q4 2024

**Goals**:
- Custom vendor plugin system
- Pattern marketplace/sharing
- Export/import workflows
- Reporting and dashboards
- Integration APIs

---

## 💡 Future Considerations

### Case Management UI (Future - Not Scheduled)
**Status**: Backend ready, UI disabled  
**Priority**: Low (bundle-centric workflow is sufficient)

**Background**:
The backend fully supports the Case concept:
- `Case` struct with multiple bundle support
- Case-aware APIs (`list_cases()`, `get_bundles_for_case()`, etc.)
- Case ID detection and metadata
- Bundle-to-case relationships via `metadata.case_id`

**What Was Removed** (Feb 2024):
- UI commands (9 commands removed)
- Case tree view provider
- Case download/import workflows

**Current Approach**:
Users work directly with bundles and use `case_id` metadata for grouping:
- Create bundle with case_id: "700440257"
- Import more logs → new bundle with same case_id
- Query bundles by case_id via backend APIs

**If Re-enabled, Would Include**:
- Dedicated "Cases" panel in VS Code
- Case tree view with nested bundles
- Download case from URL
- Import case from local archive
- Case status tracking (pending/downloading/ready/error)
- Case statistics and summaries
- Multi-bundle case analysis
- Case-level operations (rename, delete, refresh)

**Prerequisites for Re-enabling**:
- [ ] User demand/feedback indicating need for case-centric UI
- [ ] UX design for case-bundle hierarchy
- [ ] Decision on whether to enhance bundle metadata or add full case UI
- [ ] Re-implementation of `CaseManager` and `CasesTreeProvider`
- [ ] Testing with real multi-bundle case workflows

**Backend APIs Ready** ✅:
```rust
// Already implemented:
pub fn list_cases(&self) -> Result<Vec<String>>
pub fn get_bundles_for_case(&self, case_id: &str) -> Result<Vec<Bundle>>
pub fn get_case_summary(&self, case_id: &str) -> Result<CaseSummary>
pub fn list_bundles_by_case(&self) -> Result<HashMap<Option<String>, Vec<Bundle>>>
pub fn create_bundle_for_case(&self, case_id: String, ...) -> Result<String>
```

**References**:
- `crates/lsp-server/src/bundle/models.rs` (Case struct)
- `crates/lsp-server/src/bundle/manager.rs` (case APIs)
- `vscode-extension/src/caseManager.ts` (disabled code)
- `COMMAND_CLEANUP_COMPLETE.md` (removal rationale)
- `QUICK_START_CASE_MANAGEMENT.md` (historical documentation)

**Estimated Effort If Prioritized**: 2-3 weeks
- Week 1: Re-enable and update UI components
- Week 2: Integration testing and UX refinement  
- Week 3: Documentation and deployment

---

## 🔧 Technical Debt & Improvements

### High Priority
- [ ] Complete Bundle Import TDD coverage (Path C - 22 tests)
- [ ] Command palette cleanup (verify all 67+ commands)
- [ ] Pattern catalog integration
- [ ] Performance benchmarking suite

### Medium Priority
- [ ] Streaming parser for large files
- [ ] Memory profiling and optimization
- [ ] Error handling improvements
- [ ] Logging standardization

### Low Priority
- [ ] Documentation browser feature
- [ ] Authentication system enhancements
- [ ] Timeline visualization improvements
- [ ] SIP ladder diagram enhancements

---

## 📊 Success Metrics

### Current Achievements ✅
- **Bundle Import**: <30s for QCSONE packages
- **Detection**: <1ms (quick mode), ~5ms (full mode)
- **Normalization**: <10ms per log line
- **Test Coverage**: 100% for core components
- **Production Deployments**: v0.0.176 stable

### Phase 3 Targets
- MongoDB latency: <50ms for bundle operations
- Fallback time: <5ms when MongoDB unavailable
- Concurrent users: 50+ per MongoDB cluster
- Bundle sharing: <100ms for permission checks

---

## 🤝 Contributing

Interested in contributing to a specific phase?

1. Check `PROJECT_STATUS.md` for current status
2. Review phase documentation in `docs/`
3. Follow TDD workflow in `.zed/AI_ASSISTANT_GUIDE.md`
4. Create feature branch: `feature/phase-X-description`
5. Submit PR with tests and documentation

---

## 📞 Feedback

Have ideas for the roadmap? 
- Open an issue with label `roadmap`
- Discuss in team meetings
- Update `PROJECT_STATUS.md` with proposals

---

## 📚 Related Documents

- `PROJECT_STATUS.md` - Current development status
- `00_START_HERE.md` - Project overview
- `docs/PHASE3_MONGODB_IMPLEMENTATION.md` - Phase 3 details
- `PHASE1_COMPLETE_NEXT_STEPS.md` - Phase 1 retrospective
- `PHASE2_3_COMPLETE_SUMMARY.md` - Phase 2 retrospective
- `.zed/AI_ASSISTANT_GUIDE.md` - Development workflow

---

---

## 🔔 Recent Addition: Configurable Notifications (Feb 22, 2024)

**Status**: ✅ Core module complete, ready for integration

A new notification system allows users to enable/disable task completion notifications by category:

### Features
- 9 notification categories (Bundle Ops, Analysis, Patterns, etc.)
- Granular control per category
- Task-specific helpers (`notify_bundle_created()`, etc.)
- Dual output mode (pop-ups + logs)
- Configuration persistence via YAML
- Always-on error notifications

### Quick Start
```rust
let notifier = NotificationManager::new(client.clone());
notifier.notify_bundle_imported("Case 700440257", 45).await;
// Pop-up: "✅ Bundle 'Case 700440257' imported with 45 files"
```

### Documentation
- **Module**: `lsp-server/src/notifications.rs`
- **Quick Start**: `NOTIFICATIONS_QUICK_START.md`
- **Commands**: `NOTIFICATION_COMMANDS.md`

### Integration Needed
- [ ] Add `NotificationManager` to `LogScoutServer` struct
- [ ] Replace existing `show_message()` calls
- [ ] Add LSP command handlers
- [ ] Add VS Code UI commands

**Estimated integration time**: 30 minutes

---

**Version**: 1.0  
**Maintained By**: Log Scout Development Team  
**Review Cadence**: Monthly or after phase completion