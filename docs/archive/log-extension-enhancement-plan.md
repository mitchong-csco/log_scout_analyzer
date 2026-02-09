# Log Scout Analyzer Zed Implementation Plan

This plan transforms the existing log annotator extension into a comprehensive Log Scout Analyzer using Zed's extension architecture, focusing on text-based pattern recognition, diagnostics, and multi-log correlation while working within Zed's API constraints.

## Architecture Overview

### Core Components
- **Rust Pattern Engine**: WebAssembly-compiled pattern matching with streaming processing
- **Language Server Protocol**: LSP integration for diagnostics and code actions
- **YAML Configuration**: Pattern definitions stored in configurable YAML files
- **Plugin System**: Service-specific plugins for Jabber, Webex, and custom services
- **Status Bar Integration**: Real-time pattern detection status and metrics

### Pattern Recognition Hierarchy
```
Basic Patterns → Pattern Signatures → Actions → Scenarios
```

- Multi-line pattern support with context windows
- Baseline deviation detection and learning
- Cross-log correlation and timeline analysis

## Implementation Phases

### Phase 1: Core Foundation (Weeks 1-4)
- Rust extension setup with `extension.toml`
- Basic pattern engine with YAML configuration
- Language server implementation
- Simple diagnostics and highlighting

### Phase 2: Advanced Features (Weeks 5-8)
- Multi-line pattern processing
- Plugin architecture implementation
- Status bar integration
- Command palette integration

### Phase 3: Correlation & Analysis (Weeks 9-12)
- Multi-log correlation engine
- Timeline analysis
- Baseline learning system
- Performance optimization

### Phase 4: Integration & Polish (Weeks 13-16)
- Advanced diagnostics
- Configuration UI via commands
- Documentation and examples
- Testing and validation

## Key Technical Decisions

### Language Choice
- **Rust**: Primary extension language compiled to WebAssembly
- **YAML**: Pattern configuration format
- **JavaScript**: Minimal for any web-based configuration (if needed)

### Performance Strategy
- Streaming file processing for large logs
- GPU-accelerated rendering via Zed's native engine
- Background processing for pattern matching
- Memory-efficient pattern storage

### Zed Extension Capabilities
- Text-based diagnostics and highlighting
- Language server protocol integration
- Status bar items and commands
- No custom webviews or dashboards (Zed limitation)

## File Structure
```
src/
├── lib.rs              # Main extension entry point
├── pattern_engine.rs   # Core pattern matching logic
├── language_server.rs  # LSP implementation
├── diagnostics.rs      # Error and warning handling
├── plugins/
│   ├── mod.rs
│   ├── jabber.rs       # Jabber-specific patterns
│   └── webex.rs        # Webex-specific patterns
└── config/
    ├── patterns.yaml   # Pattern definitions
    └── settings.yaml   # Extension configuration
```

## Migration Strategy
1. Extract existing patterns from JavaScript to YAML
2. Implement core Rust pattern engine
3. Create language server for diagnostics
4. Build plugin system for service-specific patterns
5. Add multi-log correlation capabilities

## Success Metrics
- Pattern detection accuracy > 95%
- Performance: < 100ms for 1MB log files
- Memory usage: < 50MB for typical workloads
- User adoption: Seamless migration from web annotator

## Next Steps
1. Set up Rust development environment
2. Create basic Zed extension structure
3. Implement pattern engine foundation
4. Develop YAML configuration schema
5. Create initial pattern set from existing annotator
