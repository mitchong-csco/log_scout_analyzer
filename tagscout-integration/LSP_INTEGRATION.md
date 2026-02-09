# TagScout → LSP Server Integration Guide

> Complete guide for integrating TagScout patterns with the Rust LSP Server

## 📋 Overview

This guide explains how to sync patterns from TagScout MongoDB to the Log Scout Analyzer LSP Server (written in Rust). The integration enables the LSP server to use thousands of curated patterns from the TagScout Library.

**Architecture Flow:**
```
TagScout MongoDB → TagScout Client (TS) → LSP Bridge (TS) → YAML Config → LSP Server (Rust)
```

---

## 🎯 Why LSP Integration?

The LSP (Language Server Protocol) server provides:
- **Real-time analysis** as you type
- **Language server features** (hover, diagnostics, etc.)
- **High performance** (Rust-based)
- **Editor-agnostic** (works with VS Code, Zed, etc.)
- **Streaming processing** for large log files

By integrating TagScout patterns, the LSP server gets:
- ✅ **5000+ curated patterns** from TagScout Library
- ✅ **Product-specific patterns** (Jabber, CUCM, Webex, etc.)
- ✅ **Automatic updates** via sync service
- ✅ **Pattern categorization** and metadata
- ✅ **Severity-based detection**

---

## 🔧 Quick Start

### 1. Sync Patterns to LSP Format

```bash
cd log_scout_analyzer/tagscout-integration

# Sync all patterns to LSP server format
npx tagscout-cli sync-lsp

# Or sync specific product
npx tagscout-cli sync-lsp --product Jabber
```

This generates YAML files in `./lsp-patterns/`:
```
lsp-patterns/
├── jabber-patterns.yaml
├── cucm-patterns.yaml
├── webex-patterns.yaml
├── master-config.yaml
└── README.md
```

### 2. Configure LSP Server

Update your LSP server configuration to load patterns:

**Option A: Use master config**
```rust
// In your LSP server startup
let config_path = Path::new("./lsp-patterns/master-config.yaml");
let config = config::load_config(config_path)?;
let engine = PatternEngine::new(config.patterns, 0.85, 10)?;
```

**Option B: Load specific product**
```rust
let config_path = Path::new("./lsp-patterns/jabber-patterns.yaml");
let config = config::load_config(config_path)?;
```

### 3. Reload LSP Server

Restart or reload the LSP server to apply new patterns.

---

## 📚 Pattern Format Mapping

### TagScout Annotation (MongoDB)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "pattern": "\\b(ERROR|FAIL)\\b",
  "category": "network",
  "severity": "error",
  "description": "Network connection failure",
  "tags": ["network", "connection", "error"],
  "product": "Jabber",
  "component": "NetworkManager",
  "regex": "(?i)connection\\s+(failed|timeout)"
}
```

### LSP Pattern (YAML)

```yaml
patterns:
  - id: "507f1f77bcf86cd799439011"
    name: "Network connection failure"
    description: "Network connection failure"
    pattern: "(?i)connection\\s+(failed|timeout)"
    mode: SingleLine
    severity: Error
    category: "network"
    service: "jabber"
    tags: 
      - "network"
      - "connection"
      - "error"
    action: "Investigate network error: Network connection failure"
    enabled: true
```

### Severity Mapping

| TagScout | LSP Server |
|----------|------------|
| error, fatal, critical | Error |
| warning, warn | Warning |
| info, information, notice | Info |
| debug, trace, verbose, hint | Hint |

### Pattern Mode Mapping

| Pattern Type | LSP Mode |
|--------------|----------|
| Single line | `SingleLine` |
| Multi-line (contains \n) | `MultiLine: { context_lines: 5 }` |
| Sequence | `Sequence: { max_gap_lines: 10 }` |

---

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│  TagScout MongoDB (Source)                              │
│  • task_TagScoutLibrary database                        │
│  • 5000+ curated annotations                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ fetch
                     ▼
┌─────────────────────────────────────────────────────────┐
│  TagScout Client (TypeScript)                           │
│  • Connect & authenticate                               │
│  • Query & filter annotations                           │
│  • Fetch metadata                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ transform
                     ▼
┌─────────────────────────────────────────────────────────┐
│  LSP Bridge (TypeScript)                                │
│  • Convert to LSP format                                │
│  • Map severities and modes                             │
│  • Generate YAML configs                                │
│  • Organize by product                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ write
                     ▼
┌─────────────────────────────────────────────────────────┐
│  YAML Configuration Files                               │
│  • Product-specific patterns                            │
│  • Master configuration                                 │
│  • Plugin settings                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ load
                     ▼
┌─────────────────────────────────────────────────────────┐
│  LSP Server (Rust)                                      │
│  • Pattern engine                                       │
│  • Real-time diagnostics                                │
│  • Language server protocol                             │
└─────────────────────────────────────────────────────────┘
```

### File Structure

```
log_scout_analyzer/
├── tagscout-integration/        # Node.js/TypeScript integration
│   ├── tagscout-client.ts       # MongoDB client
│   ├── pattern-converter.ts     # Pattern transformation
│   ├── lsp-bridge.ts            # LSP format converter (NEW)
│   ├── cli.ts                   # CLI with sync-lsp command
│   └── lsp-patterns/            # Generated YAML files
│       ├── jabber-patterns.yaml
│       ├── cucm-patterns.yaml
│       ├── webex-patterns.yaml
│       ├── master-config.yaml
│       └── README.md
│
└── lsp-server/                  # Rust LSP server
    ├── src/
    │   ├── pattern_engine.rs    # Pattern matching engine
    │   ├── config.rs            # Configuration loader
    │   ├── diagnostics.rs       # Diagnostic generation
    │   └── server.rs            # LSP server
    └── Cargo.toml
```

---

## 🔄 Synchronization Workflow

### Manual Sync

```bash
# Step 1: Sync patterns from TagScout
npx tagscout-cli sync-lsp

# Step 2: Verify generated files
ls -la lsp-patterns/

# Step 3: Configure LSP server to use patterns
# Update your LSP server config path

# Step 4: Reload LSP server
# Restart your editor or reload the LSP server
```

### Automatic Sync

```typescript
// auto-sync-lsp.ts
import { LSPBridge } from './lsp-bridge';
import { TagScoutClient } from './tagscout-client';

async function autoSyncLSP() {
    const client = TagScoutClient.fromEnvironment();
    await client.connect();

    const bridge = new LSPBridge(client, {
        outputDir: './lsp-patterns',
        separateByProduct: true
    });

    // Start auto-sync (every 30 minutes)
    await bridge.startAutoSync(30);
}

autoSyncLSP();
```

Run as background service:
```bash
nohup npm run auto-sync-lsp > sync-lsp.log 2>&1 &
```

---

## 📝 LSP Server Configuration

### Full Configuration Example

```yaml
# lsp-patterns/master-config.yaml
patterns: []  # Loaded from product-specific configs

plugins:
  jabber:
    enabled: true
    config_path: "./jabber-patterns.yaml"
  webex:
    enabled: true
    config_path: "./webex-patterns.yaml"
  custom:
    enabled: true
    config_path: "./custom-patterns.yaml"

settings:
  detection_threshold: 0.85
  multiline_patterns: true
  multiline_context_window: 10
  baseline_learning: true
  correlation_enabled: true
  max_file_size_mb: 100
  streaming_chunk_size_kb: 512
  background_processing: true
```

### Product-Specific Configuration

```yaml
# lsp-patterns/jabber-patterns.yaml
patterns:
  - id: "jabber-conn-fail-001"
    name: "Jabber Connection Failure"
    description: "Detects connection failures in Jabber logs"
    pattern: "(?i)connection\\s+(failed|timeout|refused)"
    mode: SingleLine
    severity: Error
    category: "network"
    service: "jabber"
    tags:
      - "connection"
      - "network"
      - "error"
    action: "Check network connectivity and CUCM availability"
    enabled: true

  - id: "jabber-auth-fail-001"
    name: "Jabber Authentication Failed"
    description: "Detects authentication failures"
    pattern: "(?i)authentication\\s+(failed|error)"
    mode: SingleLine
    severity: Error
    category: "authentication"
    service: "jabber"
    tags:
      - "authentication"
      - "security"
    action: "Verify user credentials and authentication server"
    enabled: true

settings:
  detection_threshold: 0.85
  multiline_patterns: true
  multiline_context_window: 10
```

---

## 🔌 LSP Server Integration Code

### Loading Patterns in Rust

```rust
// src/main.rs or initialization code

use crate::config::{load_config, Config};
use crate::pattern_engine::PatternEngine;
use std::path::Path;

fn initialize_lsp_with_tagscout_patterns() -> Result<PatternEngine, Box<dyn std::error::Error>> {
    // Load configuration from TagScout-generated YAML
    let config_path = Path::new("./lsp-patterns/master-config.yaml");
    let config: Config = load_config(config_path)?;

    // Optionally load plugin-specific patterns
    let mut all_patterns = config.patterns;

    if let Some(jabber_config) = &config.plugins.jabber {
        if jabber_config.enabled {
            if let Some(path) = &jabber_config.config_path {
                let jabber_patterns = load_patterns(Path::new(path))?;
                all_patterns.extend(jabber_patterns);
            }
        }
    }

    // Create pattern engine
    let threshold = config.settings.detection_threshold;
    let context_window = config.settings.multiline_context_window;
    let engine = PatternEngine::new(all_patterns, threshold, context_window)?;

    println!("✓ Loaded {} patterns from TagScout", engine.get_patterns().len());

    Ok(engine)
}
```

### Dynamic Pattern Reloading

```rust
// src/server.rs - Add pattern reload capability

use notify::{Watcher, RecursiveMode, watcher};
use std::sync::mpsc::channel;
use std::time::Duration;

pub fn watch_pattern_files(pattern_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let (tx, rx) = channel();
    let mut watcher = watcher(tx, Duration::from_secs(2))?;

    watcher.watch(pattern_dir, RecursiveMode::Recursive)?;

    println!("👀 Watching for pattern file changes in {:?}", pattern_dir);

    loop {
        match rx.recv() {
            Ok(event) => {
                println!("🔄 Pattern file changed: {:?}", event);
                // Reload patterns
                if let Err(e) = reload_patterns() {
                    eprintln!("Failed to reload patterns: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Watch error: {:?}", e);
                break;
            }
        }
    }

    Ok(())
}

fn reload_patterns() -> Result<(), Box<dyn std::error::Error>> {
    // Reload pattern engine with new patterns
    let engine = initialize_lsp_with_tagscout_patterns()?;
    // Update global pattern engine
    // ... implementation depends on your server architecture
    Ok(())
}
```

---

## 🧪 Testing the Integration

### 1. Test Pattern Generation

```bash
# Generate patterns for Jabber
npx tagscout-cli sync-lsp --product Jabber --output ./test-patterns

# Verify YAML is valid
cat test-patterns/jabber-patterns.yaml

# Check pattern count
grep -c "^  - id:" test-patterns/jabber-patterns.yaml
```

### 2. Test LSP Server Loading

```rust
// tests/pattern_loading_test.rs

#[test]
fn test_load_tagscout_patterns() {
    use crate::config::load_config;
    use std::path::Path;

    let config_path = Path::new("./lsp-patterns/jabber-patterns.yaml");
    let config = load_config(config_path).expect("Failed to load config");

    assert!(!config.patterns.is_empty(), "No patterns loaded");
    
    // Check patterns have required fields
    for pattern in &config.patterns {
        assert!(!pattern.id.is_empty());
        assert!(!pattern.pattern.is_empty());
        assert!(pattern.enabled);
    }
}

#[test]
fn test_pattern_engine_with_tagscout() {
    use crate::config::load_patterns;
    use crate::pattern_engine::PatternEngine;
    use std::path::Path;

    let patterns = load_patterns(Path::new("./lsp-patterns/jabber-patterns.yaml"))
        .expect("Failed to load patterns");

    let engine = PatternEngine::new(patterns, 0.85, 10)
        .expect("Failed to create engine");

    assert!(engine.get_patterns().len() > 0);

    // Test pattern matching
    let test_line = "ERROR: Connection failed to CUCM server";
    let detections = engine.process_line(test_line, 1);

    assert!(!detections.is_empty(), "Should detect connection failure");
}
```

### 3. Test Pattern Matching

```bash
# Create test log file
cat > test.log << EOF
2025-02-09 10:30:45 INFO: Jabber starting up
2025-02-09 10:30:46 ERROR: Connection failed to CUCM
2025-02-09 10:30:47 WARN: Retrying connection
2025-02-09 10:30:48 ERROR: Authentication failed
2025-02-09 10:30:49 INFO: Connection established
EOF

# Analyze with LSP server (implementation-dependent)
# Should detect connection and authentication errors
```

---

## 🔄 Update Workflow

### When TagScout Patterns Change

```bash
# 1. Sync latest patterns from TagScout
npx tagscout-cli sync-lsp

# 2. Review changes
git diff lsp-patterns/

# 3. Test with LSP server
# Run your test suite

# 4. Commit changes
git add lsp-patterns/
git commit -m "Update TagScout patterns"

# 5. Deploy/restart LSP server
# Implementation-dependent
```

### Continuous Integration

```yaml
# .github/workflows/sync-patterns.yml
name: Sync TagScout Patterns

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  sync-patterns:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd log_scout_analyzer/tagscout-integration
          npm install
      
      - name: Sync patterns to LSP format
        run: |
          cd log_scout_analyzer/tagscout-integration
          npx tagscout-cli sync-lsp
        env:
          TAGSCOUT_MONGODB_URI: ${{ secrets.TAGSCOUT_URI }}
      
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: 'chore: update TagScout patterns'
          title: 'Update TagScout patterns'
          body: 'Automated sync from TagScout MongoDB'
          branch: 'update-patterns'
```

---

## 📊 Pattern Statistics

### View Pattern Distribution

```bash
# Count patterns by product
for file in lsp-patterns/*-patterns.yaml; do
  echo "$file: $(grep -c "^  - id:" $file) patterns"
done

# Count by severity
grep "severity:" lsp-patterns/*.yaml | cut -d: -f3 | sort | uniq -c

# Count by category
grep "category:" lsp-patterns/*.yaml | cut -d'"' -f2 | sort | uniq -c
```

### Pattern Quality Metrics

```typescript
// analyze-patterns.ts
import * as fs from 'fs';
import * as yaml from 'js-yaml';

async function analyzePatterns() {
    const files = fs.readdirSync('lsp-patterns')
        .filter(f => f.endsWith('-patterns.yaml'));

    for (const file of files) {
        const content = fs.readFileSync(`lsp-patterns/${file}`, 'utf-8');
        const config = yaml.load(content) as any;

        console.log(`\n${file}:`);
        console.log(`  Total patterns: ${config.patterns.length}`);
        
        const bySeverity = new Map();
        const byCategory = new Map();
        
        for (const pattern of config.patterns) {
            bySeverity.set(pattern.severity, 
                (bySeverity.get(pattern.severity) || 0) + 1);
            byCategory.set(pattern.category,
                (byCategory.get(pattern.category) || 0) + 1);
        }

        console.log('  By Severity:', Object.fromEntries(bySeverity));
        console.log('  Top Categories:', 
            Array.from(byCategory.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5));
    }
}

analyzePatterns();
```

---

## 🐛 Troubleshooting

### Pattern Loading Errors

**Problem**: LSP server fails to load patterns

**Solutions:**
1. Validate YAML syntax:
   ```bash
   npx js-yaml lsp-patterns/jabber-patterns.yaml
   ```

2. Check file permissions:
   ```bash
   ls -la lsp-patterns/
   ```

3. Verify path in LSP config matches actual file location

4. Check Rust logs for specific errors

### Pattern Not Matching

**Problem**: Expected pattern not detecting in logs

**Solutions:**
1. Verify pattern is enabled:
   ```bash
   grep -A 10 "id: pattern-id" lsp-patterns/*.yaml
   ```

2. Test regex separately:
   ```bash
   echo "test log line" | grep -P "your-regex-pattern"
   ```

3. Check severity threshold in LSP config

4. Verify log format matches pattern expectations

### Sync Failures

**Problem**: sync-lsp command fails

**Solutions:**
1. Test TagScout connection:
   ```bash
   npx tagscout-cli test
   ```

2. Check output directory permissions:
   ```bash
   mkdir -p lsp-patterns && chmod 755 lsp-patterns
   ```

3. Run with verbose mode:
   ```bash
   npx tagscout-cli sync-lsp --verbose
   ```

---

## 📚 References

### TypeScript Components
- `tagscout-client.ts` - MongoDB connection
- `pattern-converter.ts` - Pattern transformation
- `lsp-bridge.ts` - LSP format conversion
- `cli.ts` - Command-line interface

### Rust Components
- `pattern_engine.rs` - Pattern matching
- `config.rs` - Configuration loading
- `diagnostics.rs` - Diagnostic generation
- `server.rs` - LSP server

### Documentation
- `README.md` - Main documentation
- `QUICK_START.md` - Quick start guide
- `LSP_INTEGRATION.md` - This document

---

## ✅ Best Practices

### Pattern Management
- ✅ Separate patterns by product
- ✅ Use master config for plugin management
- ✅ Version control pattern files
- ✅ Test patterns before deployment
- ✅ Document custom patterns

### Synchronization
- ✅ Run sync regularly (daily or on-demand)
- ✅ Review changes before committing
- ✅ Use auto-sync for development
- ✅ Manual sync for production
- ✅ Backup before updates

### LSP Server
- ✅ Validate patterns on load
- ✅ Handle reload gracefully
- ✅ Log pattern loading stats
- ✅ Monitor performance
- ✅ Cache compiled patterns

---

## 🎉 Success Metrics

- ✅ Patterns sync successfully from TagScout
- ✅ YAML files generated correctly
- ✅ LSP server loads patterns without errors
- ✅ Patterns detect expected issues in logs
- ✅ Auto-sync keeps patterns up-to-date
- ✅ Performance is acceptable (<100ms per file)

---

**Integration Status**: ✅ Complete and Ready

**Version**: 1.0.0  
**Last Updated**: February 9, 2026  
**Maintained by**: Log Scout Team