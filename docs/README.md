# Log Scout Analyzer - Documentation

> Complete documentation index for the Log Scout Analyzer monorepo

**Last Updated**: 2025-02-17  
**Version**: 2.0.0

---

## 🚀 Quick Start

New to Log Scout Analyzer? Start here:

1. **[Quick Start Guide](guides/QUICK_START.md)** - Get up and running in 5 minutes
2. **[Build & Install](guides/BUILD_AND_INSTALL.md)** - Build from source
3. **[Architecture Overview](architecture/ARCHITECTURE.md)** - Understand the system

---

## 📦 Feature Documentation

Documentation for each feature crate in the monorepo:

### [Core](../crates/core/README.md)
Shared types, utilities, and common functionality used across all features.

**Key Topics**:
- Common data structures
- Error handling
- Configuration management

### [Pattern Engine](../crates/pattern-engine/README.md)
Core pattern matching and analysis engine.

**Key Topics**:
- [Pattern Design Philosophy](../crates/pattern-engine/docs/PATTERN_DESIGN_PHILOSOPHY.md)
- [Parameter Extraction](../crates/pattern-engine/docs/PARAMETER_EXTRACTION_FIX.md)
- [Pattern Testing Guide](../crates/pattern-engine/docs/PATTERN_TESTING_AND_MARKING_GUIDE.md)
- [JSON Export](../crates/pattern-engine/docs/PATTERN_TESTING_JSON_EXPORT_GUIDE.md)

### [Pattern Loader](../crates/pattern-loader/README.md)
Pattern loading, override management, and runtime pattern marking.

**Key Topics**:
- [Pattern Override Quick Start](../crates/pattern-loader/docs/PATTERN_OVERRIDE_QUICK_START.md)
- [Override System Summary](../crates/pattern-loader/docs/PATTERN_OVERRIDE_SYSTEM_SUMMARY.md)
- [Pattern Marking Integration](../crates/pattern-loader/docs/PATTERN_MARKING_INTEGRATION_PLAN.md)
- [Pattern Catalog TODO](../crates/pattern-loader/docs/TODO_PATTERN_CATALOG.md)

### [Quality System](../crates/quality-system/README.md)
Pattern quality monitoring and agentic decision-making.

**Key Topics**:
- [Pattern Quality Monitoring](../crates/quality-system/docs/PATTERN_QUALITY_MONITORING.md)
- [Agentic Decision Framework](../crates/quality-system/docs/AGENTIC_DECISION_FRAMEWORK.md)
- [Agentic Design Analysis](../crates/quality-system/docs/AGENTIC_DESIGN_ANALYSIS.md)
- [Quality System Index](../crates/quality-system/docs/PATTERN_QUALITY_SYSTEM_INDEX.md)

### [LSP Server](../crates/lsp-server/README.md)
Language Server Protocol orchestrator for editor integration.

**Key Topics**:
- [LSP Diagnostic Structure](../crates/lsp-server/docs/LSP_DIAGNOSTIC_DATA_STRUCTURE.md)
- [Extension Data Consumer Guide](../crates/lsp-server/docs/EXTENSION_DATA_CONSUMER_GUIDE.md)
- [Citation Model](../crates/lsp-server/docs/CITATION_MODEL_IMPLEMENTATION.md)
- [Analysis Capabilities](../crates/lsp-server/docs/LSP_SERVER_ANALYSIS_CAPABILITIES.md)

---

## 🏗️ Architecture

System design and architecture documentation:

- **[System Architecture](architecture/ARCHITECTURE.md)** - Overall system design
- **[Design Framework](architecture/DESIGN_FRAMEWORK_SUMMARY.md)** - Design principles and patterns
- **[Client-Server Logs](architecture/CLIENT_SERVER_LOG_ARCHITECTURE.md)** - Multi-tier log analysis
- **[Monorepo Structure](architecture/FEATURE_MONOREPO_SUMMARY.md)** - Cargo workspace organization
- **[Migration Guide](architecture/FEATURE_MONOREPO_MIGRATION_GUIDE.md)** - Migrating to monorepo

---

## 📖 Guides

User guides and how-tos:

- **[Quick Start](guides/QUICK_START.md)** - Get started quickly
- **[Build & Install](guides/BUILD_AND_INSTALL.md)** - Build instructions
- **[Contributing](guides/CONTRIBUTING.md)** - Contribution guidelines
- **[Style Guide](guides/STYLE_GUIDE.md)** - Code and documentation standards
- **[Windows Build Guide](guides/WINDOWS_BUILD_GUIDE.md)** - Windows-specific instructions
- **[Extensions Guide](guides/EXTENSIONS_GUIDE.md)** - Editor extension setup
- **[Branch Separation](guides/BRANCH_SEPARATION_GUIDE.md)** - Git workflow

---

## 🎨 Design

Design philosophy and frameworks:

- **[Temporal Analysis Design](design/TEMPORAL_ANALYSIS_DESIGN.md)** - Time-based log correlation
- **[Pattern to Action Framework](design/PATTERN_TO_ACTION_FRAMEWORK.md)** - Pattern-driven automation

---

## 🔗 Integration

Integration with external tools and systems:

- **[Protocol Analysis Integration](integration/PROTOCOL_ANALYSIS_INTEGRATION.md)** - Network protocol parsing
- **[Case Management](integration/CASE_MANAGEMENT_COMPLETE.md)** - Support case integration
- **[Cross-Extension Case Management](integration/CROSS_EXTENSION_CASE_MANAGEMENT.md)** - Multi-editor support
- **[VS Code Extension Integration](integration/VSCODE_EXTENSION_LSP_INTEGRATION_GUIDE.md)** - VS Code setup
- **[Protocol Tool Integration](integration/PROTOCOL_TOOL_INTEGRATION.md)** - External protocol tools

---

## 🚀 Deployment

Deployment and release documentation:

- **[GitHub Actions Complete](deployment/GITHUB_ACTIONS_COMPLETE.md)** - CI/CD setup
- **[Delivery Summary](deployment/DELIVERY_SUMMARY.md)** - Release process
- **[Implementation Status](deployment/IMPLEMENTATION_COMPLETE.md)** - Current status
- **[Mac Testing](deployment/MACOS_TESTING_ADDED.md)** - macOS support

---

## 🗃️ Archive

Historical documentation and deprecated guides are in the [archive](archive/) directory.

---

## 📚 Documentation Standards

When contributing documentation:

1. Follow the [Style Guide](guides/STYLE_GUIDE.md)
2. Place feature-specific docs in `crates/<feature>/docs/`
3. Place project-wide docs in `docs/<category>/`
4. Use consistent formatting and terminology
5. Include code examples where applicable
6. Keep status indicators current

### Status Indicators

| Symbol | Meaning |
|--------|---------|
| 🟢 | Stable/Complete |
| 🟡 | In Progress/Beta |
| 🔴 | Blocked/Alpha |
| ⚪ | Planned |
| ❌ | Deprecated |

---

## 🔍 Finding Documentation

### By Topic

- **Getting Started**: See [Quick Start](guides/QUICK_START.md)
- **Building**: See [Build & Install](guides/BUILD_AND_INSTALL.md)
- **Patterns**: See [Pattern Engine](../crates/pattern-engine/README.md)
- **Quality**: See [Quality System](../crates/quality-system/README.md)
- **Editor Integration**: See [LSP Server](../crates/lsp-server/README.md)
- **Contributing**: See [Contributing](guides/CONTRIBUTING.md)

### By Role

**For Users**:
- [Quick Start](guides/QUICK_START.md)
- [Extensions Guide](guides/EXTENSIONS_GUIDE.md)
- [Pattern Override Quick Start](../crates/pattern-loader/docs/PATTERN_OVERRIDE_QUICK_START.md)

**For Contributors**:
- [Contributing](guides/CONTRIBUTING.md)
- [Style Guide](guides/STYLE_GUIDE.md)
- [Architecture](architecture/ARCHITECTURE.md)

**For Extension Developers**:
- [LSP Server](../crates/lsp-server/README.md)
- [Extension Data Consumer Guide](../crates/lsp-server/docs/EXTENSION_DATA_CONSUMER_GUIDE.md)
- [VS Code Extension Integration](integration/VSCODE_EXTENSION_LSP_INTEGRATION_GUIDE.md)

---

## 📝 Contributing to Documentation

We welcome documentation improvements! To contribute:

1. Follow the [Style Guide](guides/STYLE_GUIDE.md)
2. Keep feature docs with feature code
3. Update this index when adding new docs
4. Test all code examples
5. Use clear, concise language

See [Contributing](guides/CONTRIBUTING.md) for details.

---

## 📞 Support

- **Issues**: File bugs and feature requests on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Start with this index

---

**Maintained by**: Log Scout Analyzer Team  
**License**: MIT OR Apache-2.0
