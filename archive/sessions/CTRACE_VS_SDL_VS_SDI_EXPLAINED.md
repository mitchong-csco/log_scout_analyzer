# 📊 CTRACE vs SDL vs SDI Logs Explained

**Question:** "so these are SDL logs in the ccm service?"

**Answer:** **No! CTRACE ≠ SDL**

They are **different log types** in CUCM, with different purposes and formats.

---

## 🎯 Quick Answer

| Log Type | Purpose | Format | Used For | Phase 3.5 Support |
|----------|---------|--------|----------|-------------------|
| **CTRACE** | **SIP Call Tracing** | 14 pipe-delimited fields | **Call flow diagrams** ⭐ | ✅ **YES** |
| **SDL** | Signal Distribution Layer | Pipe-delimited signals | Internal CUCM messaging | ❌ Not yet (Phase 4+) |
| **SDI** | Service Debug Interface | Pipe-delimited traces | Service-level debugging | ❌ Not yet (Phase 4+) |

---

## 📞 CTRACE Logs (What We're Using)

### What is CTRACE?

**CTRACE** = **Call Trace** logs from Cisco CUCM

**Purpose:** Capture **SIP (Session Initiation Protocol) messages** during VoIP calls

**Used For:**
- ✅ **Call flow analysis** (what Phase 3.5 does!)
- ✅ Troubleshooting call failures
- ✅ Analyzing call setup/teardown
- ✅ SIP message sequencing
- ✅ Timing analysis

### Format: 14 Pipe-Delimited Fields

```
2009/12/17 10:45:00.949|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag1|001a2f8d-f17f0004@5.5.5.240|INVITE
```

**Fields:**
1. Timestamp - `2009/12/17 10:45:00.949`
2. Service - `SIPL` (SIP Listener)
3. Protocol - `0`
4. Transport - `TCP`
5. Direction - `OUT`
6. Receiver IP - `5.5.5.240`
7. Receiver Port - `5060`
8. MAC Address - `SEP00000000111G`
9. Sender IP - `5.5.5.45`
10. Sender Port - `58096`
11. Correlation ID - `corr-123`
12. Message Tag - `Tag1`
13. **Call-ID (GUID)** - `001a2f8d-f17f0004@5.5.5.240` ⭐
14. **SIP Message** - `INVITE` ⭐

### File Location

```
/var/log/active/cm/trace/ccm/
├── CCM00000001_000001.txt  ← CTRACE files
├── CCM00000001_000002.txt
└── CCM00000002_000001.txt
```

### What It Contains

**SIP Protocol Messages:**
- `INVITE` - Start a call
- `100 Trying` - Processing
- `180 Ringing` - Phone ringing
- `200 OK` - Call answered
- `ACK` - Acknowledgment
- `BYE` - Hang up
- `CANCEL` - Cancel call
- `4xx/5xx/6xx` - Error responses

### Example Call Flow (CTRACE)

```
# Call Setup
10:45:00.949 | OUT | INVITE
10:45:00.994 | IN  | 100 Trying
10:45:01.099 | IN  | 180 Ringing
10:45:02.891 | IN  | 200 OK
10:45:02.941 | OUT | ACK

# Call Active (RTP media stream)

# Call Teardown
10:45:48.174 | OUT | BYE
10:45:48.219 | IN  | 200 OK
```

---

## 🔄 SDL Logs (Different!)

### What is SDL?

**SDL** = **Signal Distribution Layer**

**Purpose:** Internal messaging system within CUCM processes

**Used For:**
- ❌ NOT for call flow diagrams
- ✅ Internal CUCM process communication
- ✅ Inter-process signaling
- ✅ Low-level debugging
- ✅ System architecture analysis

### Format: Pipe-Delimited Signals

```
timestamp|process1|process2|signal_type|signal_data|...
```

**Different from CTRACE!**
- Not SIP messages
- Not call-oriented
- System-level communication
- More technical/internal

### File Location

```
/var/log/active/cm/trace/
├── sdl00000001.txt  ← SDL trace files
├── sdl00000002.txt
└── sdli00000001.txt
```

**Filename Pattern:** `sdl*` or `sdli*`

### What It Contains

**Internal CUCM Signals:**
- Process-to-process messages
- State machine transitions
- Internal event notifications
- System-level communications
- NOT SIP messages

### Example SDL Log

```
2009/12/17 10:45:00.123|CCM|CTIManager|RegisterDevice|DeviceXYZ|...
2009/12/17 10:45:00.456|CTIManager|CCM|RegisterAck|Success|...
```

**Notice:** These are NOT SIP messages!

---

## 🔍 SDI Logs (Also Different!)

### What is SDI?

**SDI** = **Service Debug Interface**

**Purpose:** Service-level debugging traces

**Used For:**
- ❌ NOT for call flow diagrams
- ✅ Service-specific debugging
- ✅ Component-level tracing
- ✅ Performance analysis
- ✅ Error tracking

### Format: Pipe-Delimited Traces

```
timestamp|service|component|level|message|...
```

### File Location

```
/var/log/active/cm/trace/
├── ris/sdi/ris00000001.txt     ← RIS SDI traces
├── dbl/sdi/dbmon00000027.txt   ← Database SDI traces
└── amc/sdi/amc00000001.txt     ← AMC SDI traces
```

**Filename Pattern:** `sdi*` (in service subdirectories)

### What It Contains

**Service-Level Traces:**
- Database operations
- RIS (Realtime Information Server) data
- AMC (Audit & Monitoring) events
- Service-specific logs
- NOT SIP call flows

---

## 📊 Side-by-Side Comparison

| Feature | CTRACE | SDL | SDI |
|---------|--------|-----|-----|
| **Full Name** | Call Trace | Signal Distribution Layer | Service Debug Interface |
| **Purpose** | SIP call tracing | Inter-process messaging | Service debugging |
| **Protocol** | SIP (VoIP) | Internal signals | Service-specific |
| **Filename** | `CCM*.txt` | `sdl*.txt`, `sdli*.txt` | `sdi*.txt` (in subdirs) |
| **Location** | `/cm/trace/ccm/` | `/cm/trace/` | `/cm/trace/{service}/sdi/` |
| **Format** | 14 pipe-delimited fields | Variable pipe-delimited | Variable pipe-delimited |
| **Contains** | INVITE, 200 OK, BYE, etc. | Internal CUCM signals | Service traces |
| **Use Case** | **Call flow analysis** ⭐ | System architecture debug | Service-level debug |
| **Phase 3.5** | ✅ **Supported** | ❌ Not yet | ❌ Not yet |
| **Diagrams** | ✅ **YES!** Beautiful diagrams | ❌ No (not call-oriented) | ❌ No (not call-oriented) |

---

## 🎯 Why CTRACE for Call Flow Diagrams?

### CTRACE is Perfect Because:

1. ✅ **SIP Protocol** - Standard VoIP call signaling
2. ✅ **Call-ID Field** - Groups all messages for same call
3. ✅ **Direction Field** - Shows IN/OUT for arrows
4. ✅ **Timestamps** - Millisecond precision
5. ✅ **Complete Flow** - All messages from INVITE to BYE
6. ✅ **Human-Readable** - SIP methods are clear (INVITE, 200 OK, etc.)

### SDL/SDI Are NOT Suitable Because:

1. ❌ **No SIP Messages** - Internal signals, not calls
2. ❌ **No Call-ID** - Different correlation mechanism
3. ❌ **System-Level** - Too low-level for call flows
4. ❌ **Complex Format** - Less standardized
5. ❌ **Different Purpose** - Process debugging, not call analysis

---

## 📂 File Organization in CUCM

```
/var/log/active/cm/trace/
│
├── ccm/                          ← CTRACE logs here!
│   ├── CCM00000001_000001.txt   ← SIP call traces ⭐
│   ├── CCM00000001_000002.txt   ← Use these for diagrams!
│   └── CCM00000002_000001.txt
│
├── sdl00000001.txt               ← SDL logs (different)
├── sdl00000002.txt               ← Internal messaging
├── sdli00000001.txt              ← SDL interface logs
│
├── ris/sdi/                      ← SDI logs (different)
│   ├── ris00000001.txt           ← RIS service traces
│   └── ris00000002.txt
│
├── dbl/sdi/                      ← SDI logs (different)
│   ├── dbmon00000027.txt         ← Database traces
│   └── spltrace.log
│
└── amc/log4j/                    ← Other log types
    └── amc.log
```

---

## 🔑 Key Differences

### CTRACE (What Phase 3.5 Uses)

```
# CTRACE - SIP Call Message
2009/12/17 10:45:00.949|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag1|001a2f8d-f17f0004@5.5.5.240|INVITE

                                                                                                   ↑                                      ↑
                                                                                              Call-ID                              SIP Message
```

**Translates to:**
```
10:45:00.949
    |---- INVITE ---->|
```

### SDL (Different Format)

```
# SDL - Internal Signal
2009/12/17 10:45:00.123|CCM|CTIManager|RegisterDevice|DeviceXYZ|Status=Active

↑                      ↑   ↑          ↑              ↑
Timestamp            From  To      Signal Type   Signal Data
```

**NOT SIP messages!** This is internal CUCM communication.

### SDI (Different Purpose)

```
# SDI - Service Trace
2009/12/17 10:45:00.456|RIS|DataCollector|INFO|Collecting device status|Device=SEP123

↑                      ↑   ↑             ↑    ↑
Timestamp          Service Component  Level  Message
```

**Service-level debugging**, not call flows.

---

## 🎨 Visual Comparison

### CTRACE → Beautiful Call Flow Diagram ✅

```markdown
# Call Flow Analysis: 001a2f8d-f17f0004@5.5.5.240

## Sequence Diagram

```text
       Caller               CUCM               Callee
         |                   |                   |
10:45:00.949
         |          ---- INVITE ---->         |
10:45:00.994
         |          <--- 100 Trying ----      |
10:45:02.891
         |          <--- 200 OK ----          |
10:45:02.941
         |          ---- ACK ---->            |
```
```

**Perfect for troubleshooting calls!**

### SDL → Not Suitable for Call Diagrams ❌

```
# SDL logs show internal messaging, not call flows
CCM → CTIManager: RegisterDevice
CTIManager → CCM: RegisterAck
DatabaseLayer → CCM: QueryResult
```

**Too low-level, not call-oriented.**

### SDI → Not Suitable for Call Diagrams ❌

```
# SDI logs show service traces, not calls
RIS: Collecting device status
Database: Query executed in 45ms
AMC: Event logged
```

**Service debugging, not call analysis.**

---

## 🚀 Implementation Status

### Phase 3.5 (Current)

✅ **CTRACE Normalizer** - Complete!
- Parse 14 fields
- Extract Call-ID
- Group by Call-ID
- Generate diagrams

### Future Phases (SDL/SDI)

❌ **SDL Normalizer** - Not implemented yet
- Planned for Phase 4+
- Different use case (system debugging)
- Not for call flow diagrams

❌ **SDI Normalizer** - Not implemented yet
- Planned for Phase 4+
- Service-level analysis
- Not for call flow diagrams

---

## 📖 RTMT File Detection

RTMT (Real-Time Monitoring Tool) detects these log types by **filename prefix**:

```rust
// Level 1: Filename Prefix Detection
if filename.starts_with("CCM") {
    return LogType::CTRACE;  // Call traces ⭐
}
if filename.starts_with("sdl") {
    return LogType::SDL;     // SDL traces
}
if filename.starts_with("sdi") {
    return LogType::SDI;     // SDI traces
}
```

---

## 🎯 Summary

### Your Question: "Are these SDL logs in the CCM service?"

**Answer:** **No! They are CTRACE logs.**

- **CTRACE** = SIP **Call Trace** logs (for call flow diagrams) ✅
- **SDL** = **Signal Distribution Layer** logs (internal messaging) ❌
- **SDI** = **Service Debug Interface** logs (service debugging) ❌

### What Phase 3.5 Uses

**CTRACE logs only** from:
- Location: `/var/log/active/cm/trace/ccm/`
- Files: `CCM*.txt`
- Format: 14 pipe-delimited fields with SIP messages
- Purpose: **Call flow analysis and diagrams** ⭐

### Why Not SDL/SDI?

- ❌ SDL = Internal CUCM signals, not SIP calls
- ❌ SDI = Service traces, not call flows
- ✅ CTRACE = Perfect for call flow diagrams!

---

## 📚 References

### Documentation
- `PHASE_3_5_DIAGRAM_RENDERER_COMPLETE.md` - Diagram renderer guide
- `DIAGRAM_DATA_SOURCE_EXPLAINED.md` - CTRACE log explanation
- `DATA_FLOW_CTRACE_TO_DIAGRAM.md` - Processing pipeline
- `RTMT_COMPLETE_DISCOVERY_SUMMARY.md` - All log types explained

### Source Code
- `crates/pattern-engine/src/normalizers/ctrace_normalizer.rs` - CTRACE parser
- `crates/pattern-engine/src/call_flow/diagram_renderer.rs` - Diagram generator

### File Locations
- **CTRACE:** `/var/log/active/cm/trace/ccm/CCM*.txt` ⭐ **Use this!**
- **SDL:** `/var/log/active/cm/trace/sdl*.txt` (different purpose)
- **SDI:** `/var/log/active/cm/trace/{service}/sdi/sdi*.txt` (different purpose)

---

**Phase 3.5:** ✅ CTRACE Support Complete  
**Future:** SDL/SDI support in Phase 4+  
**Current Use:** CTRACE for beautiful call flow diagrams! 🎨

---

*Last Updated: 2024-02-24*