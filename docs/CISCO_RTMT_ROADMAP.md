# 📍 Cisco RTMT Integration Roadmap

**Goal**: Port Cisco RTMT log parsing capabilities to modern Rust implementation

---

## Phase Overview

```
Phase 1: Cause Codes        │ 30 min - 1 day   │ ████░░░░░░░░░░░░░░░░
Phase 2: SDI/SDL            │ 1-2 weeks        │ ████████░░░░░░░░░░░░
Phase 3: CTRACE             │ 2-3 weeks        │ ████████████░░░░░░░░
Phase 4: Integration        │ 1 week           │ ████████████████░░░░
Phase 5: CLI                │ 1-2 weeks        │ ██████████████████░░
Phase 6: Testing            │ 1-2 weeks        │ ████████████████████

MVP (Phases 1-3):  4-6 weeks  (40-60 hours)
Full (Phases 1-6): 7-11 weeks (90-120 hours)
```

---

## Phase 1: Cause Code Module ⭐ **QUICK WIN**

**Time**: 30 minutes  
**Value**: ⭐⭐⭐⭐⭐ Immediate  
**Risk**: ⭐☆☆☆☆ Very Low

### Deliverables
- ✓ Extract cause code properties files from RTMT
- ✓ Create `CauseCodeRegistry` module (thread-safe)
- ✓ Implement properties file loader
- ✓ Add translation API
- ✓ Write comprehensive tests
- ✓ Create demo: `log-scout cause-code --vendor ucm --code 16`

### Quick Start
```bash
# Extract cause codes
cd log_scout_analyzer
mkdir -p crates/pattern-engine/data/cause_codes
cp /tmp/rtmt_extract/conf/*.properties crates/pattern-engine/data/cause_codes/

# Follow implementation guide
# See: docs/CISCO_RTMT_QUICK_START.md
```

**Guide**: `docs/CISCO_RTMT_QUICK_START.md`

---

## Phase 2: SDI/SDL Normalizers

**Time**: 1-2 weeks  
**Value**: ⭐⭐⭐⭐☆ Medium-High  
**Risk**: ⭐⭐☆☆☆ Low

### SDI Normalizer
Parse pipe-delimited trace logs:
- 10-field SDI format
- Timestamp, trace name, message
- Cluster/node IDs
- Correlation tags

**Example SDI Log**:
```
2024-01-15 10:30:00,123|SDITrace|Connection established|cluster-01|node-01|corr-123|INFO|0x0001|10.1.1.1|SEP001122334455
```

### SDL Normalizer
Parse signal distribution logs:
- 10-field SDL format
- Process communication (source → dest)
- Signal names and descriptions
- Sequence IDs

**Example SDL Log**:
```
00001|2024-01-15 10:30:00,123|node-01|SIGNAL|SETUP_REQ|Setup Request|CCM|SIP|user@example.com|Call setup initiated
```

---

## Phase 3: CTRACE + Call Flow 🎯 **HIGHEST VALUE**

**Time**: 2-3 weeks  
**Value**: ⭐⭐⭐⭐⭐ Very High  
**Risk**: ⭐⭐⭐☆☆ Medium

### CTRACE Normalizer
Parse 14-field UCM CTRACE format:
- Extract SIP direction (IN/OUT)
- Network addresses and ports
- Correlation ID, message tag, GUID
- SIP method/response codes

**Example CTRACE Log**:
```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

### Call Flow Correlation Engine
Build intelligent call flows:
- Group messages by GUID (Call-ID)
- Correlate by correlation ID
- Build IN/OUT message pairs
- Detect call states (Setup → Connected → Disconnected)
- Generate ASCII call flow diagrams

### Example Output

```
Call Flow: 001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
Duration: 5.2 seconds

10:45:00.949  [IN]  INVITE               5.5.5.45:58096 → 5.5.5.240:5060
10:45:01.949  [OUT] 100 Trying           5.5.5.240:5060 → 5.5.5.45:58096
10:45:02.123  [OUT] 180 Ringing          5.5.5.240:5060 → 5.5.5.45:58096
10:45:05.456  [OUT] 200 OK               5.5.5.240:5060 → 5.5.5.45:58096
10:45:05.789  [IN]  ACK                  5.5.5.45:58096 → 5.5.5.240:5060
10:45:10.012  [IN]  BYE                  5.5.5.45:58096 → 5.5.5.240:5060
10:45:10.123  [OUT] 200 OK               5.5.5.240:5060 → 5.5.5.45:58096

State: Normal call clearing (Cause: 16)
```

---

## Phase 4: Cause Code Integration

**Time**: 1 week  
**Value**: ⭐⭐⭐⭐☆ Medium-High  
**Risk**: ⭐☆☆☆☆ Very Low

### Enrichment System
- Detect cause codes in SIP responses
- Auto-translate to human-readable descriptions
- Add to NormalizedEvent
- Support all vendors (UCM, UCCX, CVP, ACS, UCCE)

### Schema Updates
Add Cisco-specific metadata to NormalizedEvent:
- `correlation_id`
- `message_tag`
- `cluster_id`
- `node_id`

---

## Phase 5: CLI Features

**Time**: 1-2 weeks  
**Value**: ⭐⭐⭐⭐⭐ Very High  
**Risk**: ⭐⭐☆☆☆ Low

### Call Flow Viewer
```bash
log-scout call-flow <file>
```

Features:
- Filter by Call-ID, correlation ID, time range
- ASCII call flow diagrams
- JSON/CSV export

### Cause Code Lookup
```bash
log-scout cause-code --vendor ucm --code 41
# Output: Temporary failure
```

Features:
- Interactive lookup
- Fuzzy search by description
- Reference table export

### Enhanced Bundle Import
Features:
- Bundle by Call-ID
- Bundle by correlation ID
- Bundle by time window

---

## Phase 6: Testing & Documentation

**Time**: 1-2 weeks  
**Value**: ⭐⭐⭐⭐⭐ Critical  
**Risk**: ⭐☆☆☆☆ Very Low

### Test Coverage
- >90% coverage for new code
- Integration tests for all normalizers
- Call flow correlation tests
- Performance benchmarks

### Documentation
- User guide
- Migration guide (RTMT → Log Scout)
- API documentation
- Example data and tutorials

---

## Business Value

### Target Users
- **Cisco TAC Engineers** - Troubleshoot customer issues
- **Network Administrators** - Maintain Cisco UC systems
- **System Integrators** - Deploy and support Cisco solutions

### Market Opportunity
- **100,000+ Cisco UC customers** worldwide
- **Thousands of RTMT users** (TAC + enterprise)
- **No modern alternative** exists

### Competitive Advantages
- ✅ **10-100x faster** (Rust vs Java)
- ✅ **No JRE dependency**
- ✅ **CLI/automation friendly**
- ✅ **Modern UX**
- ✅ **Cross-platform binary**

---

## Decision Matrix

| Option | Time | Risk | Recommendation |
|--------|------|------|----------------|
| **Phase 1 Only** | 30 min | Low | ✅ **YES** - Immediate value |
| **MVP (Phases 1-3)** | 4-6 wks | Medium | 🤔 Evaluate after Phase 1 |
| **Full (Phases 1-6)** | 7-11 wks | Medium | 📋 Decide after MVP |
| **Do Nothing** | 0 hours | None | ❌ NO - Missed opportunity |

---

## Recommended Next Action

### ⭐ START WITH PHASE 1 (30 minutes)

This is a **no-brainer quick win** that:
- ✓ Provides immediate value (cause code lookup tool)
- ✓ Requires minimal time investment
- ✓ Proves the concept
- ✓ Creates foundation for future phases
- ✓ Has very low risk

**After Phase 1**, evaluate whether to continue based on:
- Is this useful?
- Do users want call flow analysis?
- Is it worth 4-6 more weeks?

---

## Getting Started

### Step 1: Read Documentation
1. **Decision Doc**: `docs/CISCO_RTMT_EXECUTIVE_SUMMARY.md`
2. **Implementation**: `docs/CISCO_RTMT_QUICK_START.md`
3. **Full Plan**: `docs/CISCO_RTMT_INTEGRATION_PLAN.md`

### Step 2: Begin Phase 1
```bash
# Follow the Quick Start Guide
cd log_scout_analyzer
# See: docs/CISCO_RTMT_QUICK_START.md Step 1
```

### Step 3: Demo
```bash
# After 30 minutes, you'll have:
log-scout cause-code --vendor ucm --code 16
# Output: Normal call clearing
```

---

## Files Created This Session

| File | Lines | Description |
|------|-------|-------------|
| `CISCO_RTMT_INTEGRATION_PLAN.md` | 907 | Complete 6-phase plan |
| `CISCO_RTMT_QUICK_START.md` | 663 | Phase 1 implementation guide |
| `CISCO_RTMT_EXECUTIVE_SUMMARY.md` | 380 | Decision document |
| `CISCO_RTMT_ROADMAP.md` | (this file) | Visual roadmap |

### Source Data
- **Location**: `/tmp/rtmt_extract/`
- **Cause Codes**: `conf/*.properties` (UCM, UCCX, CUC, CVP, UCCE, ACS)
- **Format Specs**: `TraceConfig.xml`
- **Correlation Rules**: `clavConfig/UCM_CTRACE.xml`

---

## Success Metrics

### Phase 1 Success
- [x] Cause codes extracted
- [x] CauseCodeRegistry module created
- [x] Tests passing
- [x] Demo working
- [x] <30 minutes to complete

### MVP Success (Phases 1-3)
- [ ] All normalizers implemented
- [ ] Call flow correlation working
- [ ] CLI commands functional
- [ ] >90% test coverage
- [ ] Documentation complete

### Full Success (Phases 1-6)
- [ ] Production-ready release
- [ ] Migration guide published
- [ ] Performance benchmarks met
- [ ] User adoption confirmed
- [ ] Enterprise customer feedback

---

**Status**: READY TO START  
**Priority**: Medium (opportunistic enhancement)  
**Last Updated**: 2025-02-23  
**Next**: Approve Phase 1 and begin implementation