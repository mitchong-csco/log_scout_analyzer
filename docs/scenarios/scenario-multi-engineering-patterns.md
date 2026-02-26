# Scenario: Multi-Engineering Pattern Loading

## Overview
Multiple engineering teams need different pattern sets from TagScout MongoDB, with potential overlap when troubleshooting cross-product issues.

## Problem Statement
Engineers need to analyze logs from multiple products in a single investigation:
- Voice engineer troubleshooting call failure: CUCM + Jabber + SIP + Gateway logs
- Collaboration engineer: WebEx + CUCM + Expressway logs
- TAC engineer: All product logs

## Scenarios

### Scenario 1: Single Product Focus
**User:** Jabber team engineer
**Config:**
```json
{
  "tagscout.product": "jabber_prt"
}
```

**Behavior:**
- Loads only `jabber_prt_annotations`, `jabber_prt_config`, `jabber_prt_enums`
- Fast pattern loading
- Focused diagnostics

---

### Scenario 2: Multi-Product Investigation
**User:** Voice engineer troubleshooting call drop
**Config:**
```json
{
  "tagscout.primaryProduct": "cucm",
  "tagscout.additionalProducts": ["jabber_prt", "sip_captures", "exp_c"]
}
```

**Behavior:**
- Loads patterns from all specified products
- Auto-switches patterns based on log file type
- Cross-references findings across products

---

### Scenario 3: Load All Products
**User:** TAC engineer
**Config:**
```json
{
  "tagscout.loadAllProducts": true
}
```

**Behavior:**
- Loads all product patterns from MongoDB
- Highest memory usage
- Most comprehensive analysis

---

### Scenario 4: Auto-Detection by File
**User:** Opens multiple log files in sequence

**Files:**
- `cucm_sdl_001.log` → Auto-loads CUCM patterns
- `jabber_console.log` → Auto-loads Jabber patterns
- `meeting_capture.pcap` → Auto-loads SIP patterns

**Behavior:**
- Detects log type from filename and content
- Dynamically loads relevant patterns
- Caches patterns to avoid reloading

---

### Scenario 5: Pattern Overlap Handling
**Challenge:** CUCM and Jabber both have SIP patterns

**Behavior:**
- Load patterns from both products
- Tag patterns with source product
- Apply all matching patterns
- Show which product pattern matched

---

## Key Questions

1. **Loading Strategy**: Load upfront vs. lazy load on demand?
2. **Memory Usage**: How many patterns can we hold in memory?
3. **Pattern Conflicts**: What if two products have conflicting patterns?
4. **Auto-Detection**: How accurate is file type detection?
5. **Caching**: Cache patterns per-product or merged?

## Related Files
- `src/tagscout/client.rs` - Product-based collection fetching
- `src/tagscout/mod.rs` - Pattern engine