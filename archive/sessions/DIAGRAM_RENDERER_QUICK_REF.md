# 📊 ASCII Diagram Renderer - Quick Reference

**Phase 3.5** | **Status:** ✅ Complete | **Tests:** 24/24 passing

---

## 🚀 Quick Start

```rust
use pattern_engine::call_flow::{CallSession, DiagramRenderer, DiagramFormat};

let session = CallSession::new("call-id-123".to_string());
// ... add messages ...

let renderer = DiagramRenderer::new();
let diagram = renderer.render(&session, DiagramFormat::Markdown);
println!("{}", diagram);
```

---

## 📦 API Reference

### DiagramRenderer

```rust
// Create renderer with default config
let renderer = DiagramRenderer::new();

// Create with custom config
let config = DiagramConfig {
    column_width: 25,
    show_timestamps: false,
    show_correlation_ids: false,
    show_summary: true,
    use_emojis: false,
};
let renderer = DiagramRenderer::with_config(config);

// Render diagram
let diagram = renderer.render(&session, DiagramFormat::Markdown);
```

### DiagramFormat

```rust
pub enum DiagramFormat {
    PlainAscii,   // Terminal/log output
    Markdown,     // VS Code/documentation (recommended)
}
```

### DiagramConfig

```rust
pub struct DiagramConfig {
    pub column_width: usize,           // Default: 20
    pub show_timestamps: bool,         // Default: true
    pub show_correlation_ids: bool,    // Default: false
    pub show_summary: bool,            // Default: true
    pub use_emojis: bool,              // Default: true
}
```

---

## 🎨 Output Examples

### Plain ASCII Format

```text
Call Flow: 001a2f8d-f17f0004-28...
════════════════════════════════════════════════════════════

       Caller               CUCM               Callee
         |                   |                   |
19:27:42.912
         |          ---- INVITE ---->         |
19:27:42.957
         |          <--- 100 Trying ----         |
19:27:43.062
         |          <--- 180 Ringing ----         |
19:27:45.262
         |          <--- 200 OK ----         |
19:27:45.292
         |          ---- ACK ---->         |
19:28:30.412
         |          ---- BYE ---->         |
19:28:30.457
         |          <--- 200 OK ----         |

Call Summary:
  🔔 Ring Duration: 2.350s
  📞 Talk Time: 45.120s
  ⏱️ Total Duration: 47.545s
  📨 Messages: 7 total (4 in, 3 out)
  ✅ Status: Terminated
```

### Markdown Format

```markdown
# Call Flow Analysis: 001a2f8d-f17f0004-28...

**Duration:** 47s | **Status:** ✅ Terminated | **Messages:** 7

## Sequence Diagram

```text
       Caller               CUCM               Callee
         |                   |                   |
19:27:42.912
         |          ---- INVITE ---->         |
...
```

## Call Summary

### Timing Metrics
- **Ring Duration:** 2.350s
- **Talk Time:** 45.120s
- **Total Duration:** 47.545s

### Message Statistics
- **Total Messages:** 7
- **Incoming:** 4
- **Outgoing:** 3

### Endpoints
- **Caller:** [SEP00000000111G] 5.5.5.45:58096
- **Callee:** 5.5.5.240:5060
```

---

## 💡 Common Use Cases

### 1. Terminal Output (No Emojis)

```rust
let config = DiagramConfig {
    use_emojis: false,
    ..Default::default()
};
let renderer = DiagramRenderer::with_config(config);
let diagram = renderer.render(&session, DiagramFormat::PlainAscii);
```

### 2. Compact View (No Timestamps)

```rust
let config = DiagramConfig {
    show_timestamps: false,
    ..Default::default()
};
let renderer = DiagramRenderer::with_config(config);
```

### 3. Diagram Only (No Summary)

```rust
let config = DiagramConfig {
    show_summary: false,
    ..Default::default()
};
let renderer = DiagramRenderer::with_config(config);
```

### 4. Export to File

```rust
use std::fs;

let renderer = DiagramRenderer::new();
let diagram = renderer.render(&session, DiagramFormat::Markdown);
fs::write("call_flow.md", diagram)?;
```

### 5. Wide Display

```rust
let config = DiagramConfig {
    column_width: 30,  // More space per column
    ..Default::default()
};
let renderer = DiagramRenderer::with_config(config);
```

---

## 📊 Status Emojis

| State | Emoji | Meaning |
|-------|-------|---------|
| Connected | ✅ | Call successfully connected |
| Terminated | ✅ | Call ended normally |
| Failed | ❌ | Call failed (4xx/5xx/6xx) |
| Cancelled | ❌ | Call cancelled |
| Ringing | 🔔 | Phone is ringing |
| Calling/Proceeding | 📞 | Call in progress |
| Other | 🔄 | Other states |

---

## 🔧 Integration Examples

### With CallCorrelator

```rust
use pattern_engine::call_flow::{CallCorrelator, DiagramRenderer, DiagramFormat};

let mut correlator = CallCorrelator::new();
for entry in ctrace_entries {
    correlator.add_message(entry);
}

let sessions = correlator.get_sessions();
let renderer = DiagramRenderer::new();

for session in sessions {
    let diagram = renderer.render(&session, DiagramFormat::Markdown);
    println!("{}", diagram);
}
```

### Batch Processing

```rust
let renderer = DiagramRenderer::new();
let mut diagrams = Vec::new();

for session in sessions {
    let diagram = renderer.render(&session, DiagramFormat::PlainAscii);
    diagrams.push(diagram);
}

// Save all diagrams
fs::write("all_calls.txt", diagrams.join("\n\n"))?;
```

### Filter & Render

```rust
let renderer = DiagramRenderer::new();

// Only render failed calls
for session in sessions {
    if session.state == CallState::Failed {
        let diagram = renderer.render(&session, DiagramFormat::Markdown);
        println!("{}", diagram);
    }
}
```

---

## 🧪 Testing

```bash
# Run all diagram renderer tests
cargo test --package pattern-engine call_flow::diagram_renderer

# Run demo
cargo run --package pattern-engine --example diagram_renderer_demo
```

**Test Coverage:** 24 comprehensive tests
- Configuration tests (5)
- Utility functions (4)
- Emoji system (2)
- Rendering tests (11)
- Integration tests (2)

---

## 📚 Key Files

| File | Description |
|------|-------------|
| `crates/pattern-engine/src/call_flow/diagram_renderer.rs` | Main implementation |
| `examples/diagram_renderer_demo.rs` | Demo example |
| `PHASE_3_5_DIAGRAM_RENDERER_COMPLETE.md` | Detailed docs |

---

## 🎯 Best Practices

### ✅ DO:
- Use Markdown format for VS Code/documentation
- Use Plain ASCII for terminal/log output
- Enable emojis for visual clarity
- Include timestamps for troubleshooting
- Show summary for complete analysis

### ❌ DON'T:
- Don't use emojis in automated pipelines (set `use_emojis: false`)
- Don't show timestamps in compact views if not needed
- Don't use wide columns in narrow terminals

---

## 🚀 Performance

- **Rendering Speed:** < 1ms per call session
- **Memory Usage:** Minimal (streaming output)
- **Scalability:** Handles 100+ message calls efficiently

---

## 📖 Related Documentation

- **PROJECT_STATUS.md** - Overall project status
- **PHASE_3_5_DIAGRAM_RENDERER_COMPLETE.md** - Complete implementation guide
- **Call Flow Types:** `crates/pattern-engine/src/call_flow/types.rs`

---

## 🎉 Phase 3.5 Complete!

**What's Next:** Phase 3.6 - CLI Commands

```bash
log-scout call-flow list
log-scout call-flow show <call-id>
log-scout call-flow analyze <bundle>
log-scout call-flow export <call-id> --output call_flow.md
```

---

**Last Updated:** 2024-02-24  
**Version:** 1.0.0  
**Status:** ✅ Production Ready