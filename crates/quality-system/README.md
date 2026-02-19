# Quality System

> Pattern quality monitoring and agentic decision-making framework

## Overview

The quality system monitors and evaluates pattern effectiveness:
- Runtime quality metrics collection
- Pattern performance tracking
- Agentic decision-making for pattern improvements
- Quality scoring and evaluation
- Automatic pattern optimization suggestions

## Features

- **Real-time Monitoring**: Track pattern usage and effectiveness
- **Quality Metrics**: False positive rates, coverage, precision
- **Agentic Framework**: AI-driven pattern improvement suggestions
- **Performance Analysis**: Identify slow or ineffective patterns
- **Quality Reports**: Generate detailed quality assessments

## Quick Links

- [Pattern Quality Monitoring](docs/PATTERN_QUALITY_MONITORING.md)
- [Agentic Decision Framework](docs/AGENTIC_DECISION_FRAMEWORK.md)
- [Agentic Design Analysis](docs/AGENTIC_DESIGN_ANALYSIS.md)
- [Quality System Index](docs/PATTERN_QUALITY_SYSTEM_INDEX.md)
- [Runtime Monitoring](docs/RUNTIME_PATTERN_QUALITY_MONITORING.md)

## Usage Example

```rust
use quality_system::{QualityMonitor, QualityMetrics};

// Create quality monitor
let monitor = QualityMonitor::new();

// Record pattern usage
monitor.record_match(pattern_id, match_result);

// Get quality metrics for a pattern
let metrics = monitor.get_metrics(pattern_id);
println!("False positive rate: {:.2}%", metrics.false_positive_rate() * 100.0);
println!("Coverage: {:.2}%", metrics.coverage() * 100.0);

// Get recommendations
let recommendations = monitor.get_recommendations(pattern_id);
for rec in recommendations {
    println!("Suggestion: {}", rec.description());
}
```

## Quality Metrics

The system tracks several key metrics:

- **Match Rate**: How often the pattern matches
- **False Positive Rate**: Percentage of incorrect matches
- **Coverage**: What percentage of relevant logs it catches
- **Precision**: Accuracy of parameter extraction
- **Performance**: Execution time per match
- **User Feedback**: Manual corrections and overrides

## Architecture

```
quality-system/
├── src/
│   ├── monitor.rs        # Quality monitoring
│   ├── metrics.rs        # Metric calculation
│   ├── evaluator.rs      # Pattern evaluation
│   ├── agentic.rs        # Agentic decision framework
│   └── reporter.rs       # Quality reports
└── tests/
    └── integration/      # Integration tests
```

## Agentic Decision Framework

The agentic framework makes intelligent decisions about patterns:

1. **Pattern Analysis**: Evaluate pattern effectiveness
2. **Issue Detection**: Identify problems (low coverage, high false positives)
3. **Suggestion Generation**: Propose improvements
4. **Impact Assessment**: Predict effects of changes
5. **Implementation Guidance**: Provide step-by-step fixes

## Dependencies

### Internal
- `core` - Shared types
- `pattern-engine` - Pattern types
- `pattern-loader` - Pattern management

### External
- `serde` - Serialization
- `chrono` - Time tracking
- `dashmap` - Concurrent metrics storage

## Related Features

- [Pattern Engine](../pattern-engine/README.md) - Pattern matching
- [Pattern Loader](../pattern-loader/README.md) - Pattern loading
- [LSP Server](../lsp-server/README.md) - Integration point
