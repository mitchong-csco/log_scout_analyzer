# 📊 Diagram Data Source Explained

**Question:** "What log or logs are being used to create the diagram?"

**Answer:** **Cisco CUCM CTRACE (Call Trace) Logs** 🎯

---

## 🔍 What are CTRACE Logs?

**CTRACE** = **C**all **TRACE** logs from **Cisco Unified Communications Manager (CUCM)**

These are specialized logs that capture **SIP (Session Initiation Protocol) messages** exchanged during VoIP calls.

### Key Information:
- **Source:** Cisco Unified Communications Manager (CUCM)
- **Format:** 14 pipe-delimited fields
- **Protocol:** SIP (Session Initiation Protocol)
- **Purpose:** Call flow debugging and troubleshooting
- **Collection:** Via Cisco RTMT (Real-Time Monitoring Tool)

---

## 📝 CTRACE Log Format

### Example Log Line

```
2009/12/17 10:45:00.949|SIPL|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|correlation-id|MessageTag1|001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240|INVITE
```

### 14 Fields Explained

| # | Field | Example | Description |
|---|-------|---------|-------------|
| 1 | **Timestamp** | `2009/12/17 10:45:00.949` | When the message occurred (millisecond precision) |
| 2 | **Service** | `SIPL` | Service type (SIPL/SIPT) |
| 3 | **Protocol Number** | `0` | Protocol number |
| 4 | **Transport** | `TCP` | Transport protocol (TCP/UDP/TLS) |
| 5 | **Direction** | `IN` | Message direction (IN=incoming, OUT=outgoing) |
| 6 | **Receiver IP** | `5.5.5.45` | IP address of receiver |
| 7 | **Receiver Port** | `58096` | Port of receiver |
| 8 | **MAC Address** | `SEP00000000111G` | Device MAC address |
| 9 | **Sender IP** | `5.5.5.240` | IP address of sender |
| 10 | **Sender Port** | `5060` | Port of sender (5060 = SIP) |
| 11 | **Correlation ID** | `correlation-id` | Internal correlation identifier |
| 12 | **Message Tag** | `MessageTag1` | Message tag/identifier |
| 13 | **GUID** | `001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240` | **Call-ID** (unique identifier) |
| 14 | **SIP Message** | `INVITE` | SIP method or response code |

---

## 📞 Sample Call Flow (Multiple CTRACE Lines)

Here's what a complete call looks like in CTRACE format:

### 1. Call Setup (INVITE)
```
2009/12/17 10:45:00.949|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag1|001a2f8d-f17f0004@5.5.5.240|INVITE
```

### 2. Proceeding (100 Trying)
```
2009/12/17 10:45:00.994|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag2|001a2f8d-f17f0004@5.5.5.240|100 Trying
```

### 3. Ringing (180 Ringing)
```
2009/12/17 10:45:01.099|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag3|001a2f8d-f17f0004@5.5.5.240|180 Ringing
```

### 4. Call Answered (200 OK)
```
2009/12/17 10:45:02.891|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag4|001a2f8d-f17f0004@5.5.5.240|200 OK
```

### 5. Acknowledgment (ACK)
```
2009/12/17 10:45:02.941|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag5|001a2f8d-f17f0004@5.5.5.240|ACK
```

### 6. Call Termination (BYE)
```
2009/12/17 10:45:48.174|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag6|001a2f8d-f17f0004@5.5.5.240|BYE
```

### 7. Termination Confirmed (200 OK)
```
2009/12/17 10:45:48.219|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag7|001a2f8d-f17f0004@5.5.5.240|200 OK
```

**These 7 lines become the beautiful diagram you saw!** 🎨

---

## 🔄 Data Processing Pipeline

### How CTRACE Logs Become Diagrams

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CTRACE Log Files (from CUCM)                            │
│    - Multiple log lines                                     │
│    - Each line = one SIP message                           │
│    - All messages for all calls mixed together             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CTRACE Normalizer (Phase 3.1)                           │
│    - Parse 14 fields                                        │
│    - Extract timestamp, IPs, Call-ID, SIP message          │
│    - Create CtraceEntry objects                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Call Correlator (Phase 3.2)                             │
│    - Group messages by Call-ID (GUID field #13)            │
│    - Create CallSession objects                            │
│    - Sort messages chronologically                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. State Machine (Phase 3.3)                               │
│    - Track call state (Initial → Calling → Ringing → etc.) │
│    - Determine if call succeeded or failed                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Timing Analyzer (Phase 3.4)                             │
│    - Calculate ring duration                               │
│    - Calculate talk time                                   │
│    - Calculate total duration                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Diagram Renderer (Phase 3.5) ⭐                          │
│    - Generate ASCII ladder diagram                          │
│    - Output as Markdown or Plain ASCII                     │
│    - Add emojis, timestamps, summary                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
         📊 Beautiful Diagram!
```

---

## 📂 Where Do CTRACE Logs Come From?

### Collection Methods

1. **Cisco RTMT (Real-Time Monitoring Tool)**
   - Official Cisco tool for collecting logs
   - Connects to CUCM servers
   - Downloads CTRACE logs in real-time or historical

2. **Direct from CUCM Server**
   - SSH into CUCM server
   - Navigate to: `/var/log/active/cm/trace/`
   - Files named like: `CCM00000123_XXXXX.txt`

3. **Bundled Archives**
   - RTMT can create ZIP archives
   - Contains multiple log files
   - Our tool can process these bundles

### File Locations on CUCM

```
/var/log/active/cm/trace/
├── CCM00000001_000001.txt  (CTRACE logs)
├── CCM00000001_000002.txt
├── CCM00000002_000001.txt
└── ...
```

---

## 🔑 Key Field: Call-ID (GUID)

The **most important field** for call flow diagrams is **Field #13: GUID**

### Why?
- **Unique identifier** for each call
- **Same Call-ID** appears in all messages for that call
- Allows us to **correlate messages** across time
- Format: `{8-hex}-{8-hex}-{8-hex}-{8-hex}@{IP}`

### Example
```
001a2f8d-f17f0004-280e0e49-7d091010@5.5.5.240
└──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘
   │        │        │        │        │
  Part1   Part2    Part3    Part4     IP
```

This Call-ID is used to **group all messages** for a single call together!

---

## 📊 Example: From Logs to Diagram

### Input: Raw CTRACE Logs

```
2009/12/17 10:45:00.949|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag1|001a2f8d-f17f0004@5.5.5.240|INVITE
2009/12/17 10:45:00.994|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag2|001a2f8d-f17f0004@5.5.5.240|100 Trying
2009/12/17 10:45:02.891|SIPT|0|TCP|IN|5.5.5.45|58096|SEP00000000111G|5.5.5.240|5060|corr-123|Tag4|001a2f8d-f17f0004@5.5.5.240|200 OK
2009/12/17 10:45:02.941|SIPL|0|TCP|OUT|5.5.5.240|5060|SEP00000000111G|5.5.5.45|58096|corr-123|Tag5|001a2f8d-f17f0004@5.5.5.240|ACK
```

### Processing Steps

1. **Parse each line** → Extract 14 fields
2. **Group by Call-ID** → All have same GUID: `001a2f8d-f17f0004@5.5.5.240`
3. **Sort by timestamp** → Chronological order
4. **Analyze direction** → IN vs OUT arrows
5. **Calculate timing** → Time between messages
6. **Generate diagram** → ASCII ladder diagram

### Output: Beautiful Diagram

```markdown
# Call Flow Analysis: 001a2f8d-f17f0004@5.5.5.240

**Duration:** 2s | **Status:** ✅ Connected | **Messages:** 4

## Sequence Diagram

```text
       Caller               CUCM               Callee
         |                   |                   |
10:45:00.949
         |          ---- INVITE ---->         |
10:45:00.994
         |          <--- 100 Trying ----         |
10:45:02.891
         |          <--- 200 OK ----         |
10:45:02.941
         |          ---- ACK ---->         |
```

## Call Summary
- **Setup Time:** 1.942s
- **Total Messages:** 4
```

---

## 🎯 What Other Logs Are Supported?

While **CTRACE is the primary source** for call flow diagrams, Log Scout Analyzer also supports:

### Cisco Products
- ✅ **CUCM (Call Manager)** - CTRACE format (primary)
- ✅ **CUBE (Unified Border Element)** - Similar SIP logs
- ✅ **CUC (Unity Connection)** - Voicemail logs
- ✅ **Jabber** - Client-side logs

### Format Detection
The tool automatically detects log format:
```rust
// Vendor detection determines which normalizer to use
let vendor = detect_vendor(log_line);
match vendor {
    Vendor::CUCM => use CtraceNormalizer,
    Vendor::CUBE => use CubeNormalizer,
    Vendor::Jabber => use JabberNormalizer,
    ...
}
```

---

## 🔍 How to Get CTRACE Logs

### Method 1: Cisco RTMT (Recommended)

1. **Install Cisco RTMT** (from CUCM server)
2. **Connect to CUCM cluster**
3. **Select "Trace & Log Central"**
4. **Choose "Collect Files"**
5. **Select "CCM Traces"** (CTRACE files)
6. **Download ZIP archive**

### Method 2: CLI (SSH to CUCM)

```bash
# SSH to CUCM server
ssh admin@cucm-server

# Navigate to trace directory
cd /var/log/active/cm/trace/

# List CTRACE files
ls -lh CCM*.txt

# Download files (from your machine)
scp admin@cucm-server:/var/log/active/cm/trace/CCM*.txt ./
```

### Method 3: Log Scout Analyzer CLI

```bash
# Once we build Phase 3.6 CLI commands
log-scout call-flow analyze /path/to/ctrace/bundle.zip
```

---

## 📋 CTRACE Log Characteristics

### File Size
- **Typical size:** 10-100 MB per file
- **Large deployments:** Can be GB per day
- **Compression:** ZIP reduces by 90%+

### Message Volume
- **Small office:** 100-1,000 messages/hour
- **Enterprise:** 10,000-100,000 messages/hour
- **Large deployment:** Millions per day

### Retention
- **Default:** 7 days on CUCM
- **Configurable:** Up to 30 days
- **RTMT archives:** Keep indefinitely

---

## 🎯 Why CTRACE is Perfect for Diagrams

### Advantages

✅ **Complete SIP conversation** - Every message captured  
✅ **Millisecond timestamps** - Precise timing  
✅ **Call-ID correlation** - Easy to group messages  
✅ **Direction indicators** - IN/OUT clearly marked  
✅ **Network context** - IPs, ports, MAC addresses  
✅ **Standardized format** - 14 fields, always consistent  
✅ **Real production data** - Actual customer traffic

### What Makes It Ideal

1. **All messages for a call** are logged
2. **Chronological order** preserved
3. **Unique Call-ID** for grouping
4. **Clear direction** (IN/OUT)
5. **Precise timestamps** for timing
6. **Device information** (MAC addresses)

---

## 📊 Summary

### Data Source
**Cisco CUCM CTRACE Logs** (Call Trace format)

### Format
14 pipe-delimited fields with SIP messages

### Key Field
**Field #13 (GUID/Call-ID)** - Groups messages for each call

### Processing
1. Parse CTRACE lines
2. Group by Call-ID
3. Sort chronologically
4. Analyze state & timing
5. Render as diagram

### Output
Beautiful ASCII ladder diagrams in Markdown format!

---

## 🚀 Try It Yourself

### Sample CTRACE Data

We have test data in:
```
log_scout_analyzer/test-data/
├── sample-ctrace.txt
└── sample-bundle.zip
```

### Run Demo

```bash
# See diagram rendering in action
cargo run --package pattern-engine --example diagram_renderer_demo
```

### Future CLI (Phase 3.6)

```bash
# Analyze CTRACE bundle
log-scout call-flow analyze /path/to/ctrace/bundle.zip

# Show specific call
log-scout call-flow show 001a2f8d-f17f0004@5.5.5.240

# Export diagram
log-scout call-flow export 001a2f8d-f17f0004@5.5.5.240 --output call.md
```

---

**Last Updated:** 2024-02-24  
**Phase:** 3.5 Complete  
**Next:** Phase 3.6 - CLI Commands