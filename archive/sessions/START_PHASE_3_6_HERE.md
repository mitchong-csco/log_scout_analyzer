# 🚀 START HERE: Phase 3.6 - CLI Commands

**Date:** 2024-02-24  
**Previous Phase:** 3.5 - ASCII Diagram Renderer ✅ COMPLETE  
**Current Phase:** 3.6 - CLI Commands  
**Status:** ⏭️ READY TO START

---

## 📋 Quick Context

### What We Just Completed (Phase 3.5)

✅ **ASCII Diagram Renderer** - Beautiful Markdown-formatted ladder diagrams!
- 24 comprehensive tests (100% passing)
- Two output formats: Plain ASCII + Markdown
- Configurable rendering options
- Production-ready code
- Extensive documentation (1,493+ lines)

**Demo:** `cargo run --package pattern-engine --example diagram_renderer_demo`

---

## 🎯 Phase 3.6 Goal

**Add CLI commands for call flow analysis to the `log-scout` CLI.**

Users should be able to:
```bash
# List all call sessions in a bundle
log-scout call-flow list <bundle-path>

# Show a specific call flow diagram
log-scout call-flow show <call-id>

# Analyze a bundle and display all call flows
log-scout call-flow analyze <bundle-path>

# Export a call flow to a file
log-scout call-flow export <call-id> --output call_flow.md --format markdown
```

---

## 📊 Current Status

### Phase 3 Progress
- ✅ Phase 3.1: CTRACE Normalizer (14 tests, 1.5 hours)
- ✅ Phase 3.2: Call Correlation (26 tests, 1 hour)
- ✅ Phase 3.3: State Machine (27 tests, 1 hour)
- ✅ Phase 3.4: Timing Analyzer (20 tests, 1 hour)
- ✅ Phase 3.5: ASCII Diagram Renderer (24 tests, 3 hours)
- ⏭️ **Phase 3.6: CLI Commands (2-3 hours) - YOU ARE HERE**

**Total Tests Passing:** 194/194 (pattern-engine), 111 (call_flow modules)

---

## 🔧 What Needs to Be Built

### 1. CLI Subcommands
Location: `crates/log-scout-cli/src/`

Create new subcommand structure:
```rust
pub enum CallFlowCommand {
    List {
        bundle_path: PathBuf,
    },
    Show {
        call_id: String,
        bundle_path: Option<PathBuf>,
    },
    Analyze {
        bundle_path: PathBuf,
        format: DiagramFormat,
    },
    Export {
        call_id: String,
        output: PathBuf,
        format: DiagramFormat,
    },
}
```

### 2. Command Handlers
Implement handlers for each command:
- `handle_list()` - List all call sessions
- `handle_show()` - Display specific call flow
- `handle_analyze()` - Analyze bundle
- `handle_export()` - Export to file

### 3. Integration
Wire up with existing CLI infrastructure:
- Add to `main.rs` or CLI entry point
- Use `DiagramRenderer` from pattern-engine
- Handle file I/O
- Add progress indicators
- Error handling

---

## 📦 Available Tools

You have full access to Phase 3.1-3.5 modules:

```rust
use pattern_engine::call_flow::{
    CallCorrelator,      // Phase 3.2: Group messages by Call-ID
    CallSession,         // Phase 3.2: Call session data
    DiagramRenderer,     // Phase 3.5: Render diagrams
    DiagramFormat,       // Phase 3.5: PlainAscii or Markdown
    DiagramConfig,       // Phase 3.5: Configuration
};
```

---

## 🎯 Success Criteria

- [ ] `log-scout call-flow list` working
- [ ] `log-scout call-flow show` working
- [ ] `log-scout call-flow analyze` working
- [ ] `log-scout call-flow export` working
- [ ] Progress indicators for long operations
- [ ] Error handling for invalid inputs
- [ ] Help text for each command
- [ ] Integration tests (10+ tests)
- [ ] Documentation

---

## 🚀 Quick Start Steps

### Step 1: Explore Existing CLI Structure
```bash
cd crates/log-scout-cli
cat src/main.rs
# or wherever the CLI entry point is
```

### Step 2: Check Dependencies
```bash
cat Cargo.toml
# Ensure pattern-engine is available
```

### Step 3: Plan Command Structure
Review how other subcommands are implemented in the existing CLI.

### Step 4: Implement Commands (TDD)
1. Write tests first
2. Implement command handlers
3. Wire up to CLI
4. Test manually

### Step 5: Add Documentation
- Help text for each command
- Examples
- Error messages

---

## 📖 Example Implementation (Pseudocode)

```rust
// In crates/log-scout-cli/src/commands/call_flow.rs

use pattern_engine::call_flow::{CallCorrelator, DiagramRenderer, DiagramFormat};

pub fn handle_list(bundle_path: PathBuf) -> Result<()> {
    // 1. Load bundle
    // 2. Parse CTRACE logs
    // 3. Correlate messages
    // 4. Display list of call sessions
    
    let mut correlator = CallCorrelator::new();
    // ... parse logs and add messages ...
    
    let sessions = correlator.get_sessions();
    for session in sessions {
        println!("{} - {} messages - {}", 
            session.call_id, 
            session.message_count(), 
            session.state.as_str()
        );
    }
    
    Ok(())
}

pub fn handle_show(call_id: String, bundle_path: Option<PathBuf>) -> Result<()> {
    // 1. Load bundle
    // 2. Find call session by ID
    // 3. Render diagram
    // 4. Display to stdout
    
    let renderer = DiagramRenderer::new();
    let diagram = renderer.render(&session, DiagramFormat::Markdown);
    println!("{}", diagram);
    
    Ok(())
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test command parsing
- Test argument validation
- Test error cases

### Integration Tests
- Test with real bundle files
- Test output format
- Test file export

### Manual Testing
```bash
# Test list command
cargo run --bin log-scout -- call-flow list test-data/sample-bundle.zip

# Test show command
cargo run --bin log-scout -- call-flow show 001a2f8d-f17f0004

# Test analyze command
cargo run --bin log-scout -- call-flow analyze test-data/sample-bundle.zip

# Test export command
cargo run --bin log-scout -- call-flow export 001a2f8d-f17f0004 --output out.md
```

---

## 📚 Related Documentation

- **Phase 3.5 Complete:** `PHASE_3_5_DIAGRAM_RENDERER_COMPLETE.md`
- **Quick Reference:** `DIAGRAM_RENDERER_QUICK_REF.md`
- **Visual Guide:** `DIAGRAM_RENDERER_VISUAL_GUIDE.md`
- **Project Status:** `PROJECT_STATUS.md`
- **Diagram Renderer API:** `crates/pattern-engine/src/call_flow/diagram_renderer.rs`

---

## 🔍 Key Files to Review

Before starting, review these files:
1. `crates/log-scout-cli/src/main.rs` - CLI entry point
2. `crates/log-scout-cli/Cargo.toml` - Dependencies
3. `crates/pattern-engine/src/call_flow/mod.rs` - Available exports
4. `examples/diagram_renderer_demo.rs` - Usage examples

---

## 💡 Tips & Best Practices

### Do:
✅ Follow TDD approach (tests first)  
✅ Use existing CLI patterns  
✅ Add helpful error messages  
✅ Include progress indicators for long operations  
✅ Add examples in help text  
✅ Handle edge cases (empty bundles, invalid call IDs)  
✅ Use `DiagramFormat::Markdown` as default

### Don't:
❌ Reinvent the wheel (use existing modules)  
❌ Skip error handling  
❌ Forget to add help text  
❌ Hard-code file paths  
❌ Skip integration tests

---

## 🎯 Estimated Time

**2-3 hours** for complete implementation:
- Command structure: 30 minutes
- List command: 30 minutes
- Show command: 30 minutes
- Analyze command: 30 minutes
- Export command: 30 minutes
- Testing & docs: 30 minutes

---

## 🚀 Ready to Start!

You have everything you need:
- ✅ Diagram renderer (Phase 3.5) - working perfectly
- ✅ Call correlator (Phase 3.2) - tested and ready
- ✅ State machine (Phase 3.3) - fully functional
- ✅ Timing analyzer (Phase 3.4) - calculating metrics
- ✅ 194 tests passing - solid foundation

**Let's build the CLI commands and make this accessible to users!**

---

## 📞 Questions to Answer

Before you start coding, answer these:

1. Where is the CLI entry point? (`main.rs` location)
2. How are subcommands structured? (clap? structopt? manual?)
3. Are there existing command examples to follow?
4. What's the pattern for error handling?
5. How are progress indicators shown?
6. Where should integration tests go?

---

## 🎉 Let's Build Phase 3.6!

**Goal:** Make call flow analysis accessible via CLI  
**Time:** 2-3 hours  
**Status:** Ready to start  
**Next File:** `crates/log-scout-cli/src/commands/call_flow.rs` (or similar)

**Start by exploring the existing CLI structure, then implement the commands using TDD!**

Good luck! 🚀