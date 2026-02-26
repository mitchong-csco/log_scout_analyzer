# Log Scout Analyzer - Scenario Index

## Overview
This directory contains all user scenarios and test scenarios for Log Scout Analyzer, organized into functional groups.

---

## Core User Scenarios (Original)

### Bundle Management & Workflow
- **[SCENARIO_01_IMPORT_ANALYZE](SCENARIO_01_IMPORT_ANALYZE.md)** - Import and analyze log bundles
- **[SCENARIO_01_IMPORT_AND_ANALYZE](SCENARIO_01_IMPORT_AND_ANALYZE.md)** - Import and analyze workflow (alternate)
- **[SCENARIO_02_MULTI_FILE](SCENARIO_02_MULTI_FILE.md)** - Multi-file analysis in a single bundle
- **[SCENARIO_03_EXPORT_RESULTS](SCENARIO_03_EXPORT_RESULTS.md)** - Export analysis results
- **[SCENARIO_04_WORKSPACE_PERSISTENCE](SCENARIO_04_WORKSPACE_PERSISTENCE.md)** - Workspace persistence across sessions
- **[SCENARIO_07_MULTIPLE_BUNDLES](SCENARIO_07_MULTIPLE_BUNDLES.md)** - Working with multiple bundles simultaneously
- **[SCENARIO_09_LARGE_BUNDLE](SCENARIO_09_LARGE_BUNDLE.md)** - Handling large log bundles

### Analysis & Troubleshooting
- **[SCENARIO_05_ERROR_RECOVERY](SCENARIO_05_ERROR_RECOVERY.md)** - Error recovery and resilience
- **[SCENARIO_06_CALL_FLOW](SCENARIO_06_CALL_FLOW.md)** - Call flow analysis
- **[SCENARIO_08_FILTER_SEARCH](SCENARIO_08_FILTER_SEARCH.md)** - Filtering and searching logs
- **[SCENARIO_08_PROBLEMS_PANEL_DETAIL_LEVELS](SCENARIO_08_PROBLEMS_PANEL_DETAIL_LEVELS.md)** - Problems panel detail levels
- **[SCENARIO_10_STATE_TRACKING](SCENARIO_10_STATE_TRACKING.md)** - Application state tracking over time

### Pattern Overlays & Customization
- **[SCENARIO_10_PATTERN_OVERLAYS_SUPPRESS](SCENARIO_10_PATTERN_OVERLAYS_SUPPRESS.md)** - Suppress unwanted patterns
- **[SCENARIO_11_PATTERN_OVERLAYS_TAGGING](SCENARIO_11_PATTERN_OVERLAYS_TAGGING.md)** - Pattern tagging and categorization
- **[SCENARIO_12_PATTERN_OVERLAYS_EXTRACT](SCENARIO_12_PATTERN_OVERLAYS_EXTRACT.md)** - Extract data with patterns
- **[SCENARIO_13_PATTERN_OVERLAYS_ROLLOUT](SCENARIO_13_PATTERN_OVERLAYS_ROLLOUT.md)** - Pattern rollout and versioning
- **[SCENARIO_14_PATTERN_OVERLAYS_HOSTNAME](SCENARIO_14_PATTERN_OVERLAYS_HOSTNAME.md)** - Hostname-based pattern selection
- **[SCENARIO_15_PATTERN_OVERLAYS_PRIORITY](SCENARIO_15_PATTERN_OVERLAYS_PRIORITY.md)** - Pattern priority and conflict resolution
- **[SCENARIO_16_PATTERN_OVERLAYS_LIFECYCLE](SCENARIO_16_PATTERN_OVERLAYS_LIFECYCLE.md)** - Pattern lifecycle management

### Advanced Features
- **[SCENARIO_17_NATURAL_LANGUAGE_QUERY](SCENARIO_17_NATURAL_LANGUAGE_QUERY.md)** - Natural language query interface

---

## LSP Integration & Deployment Scenarios (New)

### LSP Server Deployment
- **[scenario-lsp-deployment-modes](scenario-lsp-deployment-modes.md)** - LSP deployment modes
  - Local binary mode (default)
  - Container mode (local Docker/Podman)
  - Remote server mode (TCP)
  - VS Code Server deployments
  - Configuration hot reload
  - Error handling and fallbacks

### Pattern Management
- **[scenario-multi-engineering-patterns](scenario-multi-engineering-patterns.md)** - Multi-engineering pattern loading
  - Single product focus
  - Multi-product investigation (cross-product troubleshooting)
  - Load all products (TAC engineer mode)
  - Auto-detection by file type
  - Pattern overlap handling

---

## Investigation Workflow Scenarios (New)

### Symptom-Driven Analysis
- **[scenario-symptom-targeted-analysis](scenario-symptom-targeted-analysis.md)** - Symptom-targeted pattern analysis
  - Call failure investigation
  - Registration failure
  - Performance degradation
  - Service-scoped analysis
  - Timeframe-scoped analysis
  - Progressive analysis (broad → narrow)
  - Reverse flow (specific → expand)

### Conversational Investigation
- **[scenario-conversational-investigation](scenario-conversational-investigation.md)** - Natural language guided investigation
  - Following evidence through dialogue
  - Multi-path investigation (branching)
  - Comparative analysis (working vs. failed)
  - Learning from past cases
  - Handling missing context
  - Context tracking and intent recognition

### Multi-Log Correlation
- **[scenario-multi-log-correlation](scenario-multi-log-correlation.md)** - Cross-log analysis and correlation
  - Timestamp correlation across products
  - Logs without timestamps
  - Clock drift between systems
  - Cross-reference by Call-ID/Session-ID
  - Sparse logs (different verbosity)
  - Multi-hop call flow correlation
  - Intermittent issue pattern detection
  - Partial log coverage
  - Aggregate statistics
  - Log bundle export/import

### Collaboration & Case Management
- **[scenario-collaboration-handoff](scenario-collaboration-handoff.md)** - Team collaboration and case handoff
  - Team-to-team handoff (Voice → Network)
  - TAC escalation
  - Shift handoff (day → night)
  - Real-time collaboration
  - Supervisor review
  - Vendor support collaboration
  - Knowledge base contribution
  - Multi-organization collaboration

---

## Supporting Documentation

### Planning & Implementation
- **[IMPLEMENTATION_ROADMAP](IMPLEMENTATION_ROADMAP.md)** - Implementation roadmap and priorities
- **[DOCUMENTATION_ACTION_PLAN](DOCUMENTATION_ACTION_PLAN.md)** - Documentation action plan
- **[README](README.md)** - Scenario documentation overview

### User Context
- **[USER_PERSONAS](USER_PERSONAS.md)** - User personas and roles
- **[USER_SCENARIOS](USER_SCENARIOS.md)** - Consolidated user scenarios

---

## Scenario Naming Convention

### Original Scenarios
- Format: `SCENARIO_##_DESCRIPTION.md`
- Example: `SCENARIO_01_IMPORT_ANALYZE.md`
- Numbered 01-17

### New LSP/Investigation Scenarios
- Format: `scenario-topic-name.md`
- Example: `scenario-lsp-deployment-modes.md`
- Lowercase with hyphens

---

## How to Use This Index

1. **For Feature Development**: Start with original scenarios (SCENARIO_01-17) to understand core workflows
2. **For LSP Integration**: Review LSP deployment scenarios to understand server modes
3. **For Investigation Features**: Review symptom-targeted and conversational scenarios
4. **For Collaboration Features**: Review collaboration-handoff scenario
5. **For Multi-Product Support**: Review multi-engineering-patterns scenario

---

## Scenario Status

### ✅ Implemented
- SCENARIO_01: Import and Analyze
- SCENARIO_02: Multi-File Analysis
- SCENARIO_04: Workspace Persistence
- SCENARIO_08: Filter and Search

### 🚧 In Progress
- scenario-lsp-deployment-modes: LSP integration work
- scenario-multi-engineering-patterns: Pattern loading logic

### 📋 Planned
- scenario-symptom-targeted-analysis: Not yet started
- scenario-conversational-investigation: Not yet started
- scenario-multi-log-correlation: Not yet started
- scenario-collaboration-handoff: Not yet started

---

## Related Documentation

- **Tests**: `vscode-extension/src/test/suite/e2e/` - E2E tests implementing scenarios
- **Architecture**: `ARCHITECTURE.md` - System architecture
- **Patterns**: `docs/PATTERN_SYSTEM.md` - Pattern system documentation
- **LSP Server**: `log-scout-lsp-server/` - LSP server implementation

---

**Last Updated**: 2024-02-26
**Total Scenarios**: 23 core + 6 LSP/investigation = 29 scenarios