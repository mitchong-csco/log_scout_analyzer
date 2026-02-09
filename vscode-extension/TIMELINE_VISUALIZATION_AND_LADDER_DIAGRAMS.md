# Timeline Visualization & SIP Ladder Diagrams - Feature Guide

**Version:** 0.0.16  
**Date:** February 8, 2026  
**Status:** ✅ Production Ready

---

## 🎯 Overview

Log Scout Analyzer now includes **visual timeline and ladder diagram features** that transform text logs into interactive graphical representations. Perfect for understanding complex call flows, SIP protocol exchanges, and temporal event sequences.

### New Visualization Features

1. **📊 Timeline Visualization** - Interactive graphical timeline with event markers
2. **📞 SIP Ladder Diagrams** - Call flow visualization showing message exchanges
3. **🖱️ Interactive Navigation** - Click events to jump to log lines
4. **🎨 Color-Coded Events** - Visual differentiation by event type
5. **⏱️ Temporal Context** - See event distribution over time

---

## 📊 Timeline Visualization

### What Is It?

A visual representation of log events displayed as a vertical timeline with color-coded markers. Shows the temporal distribution of events, making patterns immediately visible.

### Features

**Visual Elements:**
- **Vertical Timeline** - Events arranged chronologically
- **Event Markers** - Circular badges with emoji icons
- **Color Coding** - Different colors for each event type
- **Hover Tooltips** - Detailed information on hover
- **Click Navigation** - Jump to source line in log

**Event Types Displayed:**
- 🔴 **Errors** - Red markers
- 🟡 **Warnings** - Yellow/orange markers
- 🔵 **Info** - Blue markers
- 🔄 **Lifecycle** - Purple markers (start, stop, restart)
- 🔐 **Authentication** - Orange markers (login, logout)
- 📞 **Calls** - Green markers (call events)
- 🔌 **Connections** - Blue markers (network events)

### How to Use

**Method 1: Analyzer Panel (Recommended)**
```
1. Open log file with timestamps
2. Run analysis (Ctrl+Shift+P → "Scout: Analyze Current File")
3. Click 🔭 telescope icon (Activity Bar)
4. Scroll to Analyzer panel
5. Click "Timeline Visualization"
```

**Method 2: Command Palette**
```
1. Press Ctrl+Shift+P
2. Type: "Scout: Show Timeline Visualization"
3. Press Enter
```

**Method 3: Keyboard Shortcut** (if configured)
```
Assign custom shortcut in VS Code keyboard settings
```

### Visual Layout

```
┌────────────────────────────────────────────────────────┐
│ 📊 Timeline Visualization                              │
│ File: jabber.log                                       │
│ 📅 145 events  ⏱️ 2h 34m                               │
├────────────────────────────────────────────────────────┤
│ [📞 Show Call Flow Diagram] [💾 Export Timeline]      │
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┃                                                    │
│   ┃  🔄 09:05:23 AM                                   │
│   ┃  LIFECYCLE                                        │
│   ┃  Application started                              │
│   ┃  Line 15                                          │
│   ┃                                                    │
│   ┃  🔐 09:06:45 AM                                   │
│   ┃  AUTHENTICATION                                   │
│   ┃  User logged in successfully                      │
│   ┃  Line 89                                          │
│   ┃                                                    │
│   ┃  📞 09:12:30 AM                                   │
│   ┃  CALL                                             │
│   ┃  Outgoing call initiated                          │
│   ┃  Line 234                                         │
│   ┃                                                    │
│   ┃  🔴 09:15:12 AM                                   │
│   ┃  ERROR                                            │
│   ┃  Connection timeout                               │
│   ┃  Line 456                                         │
│   ┃                                                    │
└────────────────────────────────────────────────────────┘
```

### Interaction Features

**Click Event Marker:**
- Jumps to corresponding line in log file
- Centers line in editor viewport
- Highlights line temporarily

**Hover Over Event:**
- Shows detailed tooltip
- Displays full message
- Shows category and timestamp
- Lists line number

**Scroll Timeline:**
- Smooth scrolling through all events
- Events positioned proportionally by time
- Easy to spot dense activity periods

---

## 📞 SIP Ladder Diagrams

### What Is It?

A ladder diagram (also called sequence diagram) that visualizes SIP protocol messages and call flows. Shows message exchanges between endpoints as arrows with labels.

### Perfect For

- **VoIP Troubleshooting** - Debug call setup/teardown issues
- **SIP Protocol Analysis** - Understand message sequences
- **Call Flow Documentation** - Visual representation of flows
- **CUCM/Jabber Logs** - Cisco UC environment analysis
- **WebRTC Debugging** - Web-based call flows

### Features

**Visual Elements:**
- **Endpoints** - Displayed as columns (User A, User B, Server, etc.)
- **Message Arrows** - Direction shows sender → receiver
- **Method Labels** - SIP methods (INVITE, BYE, ACK, etc.)
- **Response Codes** - Color-coded by class (2xx green, 4xx orange, 5xx red)
- **Timestamps** - When each message occurred
- **Click Navigation** - Jump to log line for details

**Supported Protocols:**
- **SIP** - Full SIP/2.0 protocol support
- **Call Events** - Generic call start/end/answer
- **Custom Messages** - Any "A → B: Message" format

### How to Use

**Method 1: Analyzer Panel (Recommended)**
```
1. Open log with SIP messages or call events
2. Run analysis
3. Click 🔭 telescope icon
4. Scroll to Analyzer panel
5. Click "SIP Ladder Diagram"
```

**Method 2: From Timeline Visualization**
```
1. Open Timeline Visualization first
2. Click "📞 Show Call Flow Diagram" button
3. Automatically converts to ladder diagram
```

**Method 3: Command Palette**
```
1. Press Ctrl+Shift+P
2. Type: "Scout: Show SIP Ladder Diagram"
3. Press Enter
```

### Visual Layout

```
┌────────────────────────────────────────────────────────────────┐
│ 📞 SIP Ladder Diagram                                          │
│ 23 messages between 3 endpoints                                │
├────────────────────────────────────────────────────────────────┤
│ [📊 Back to Timeline] [💾 Export Diagram]                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│     User A          Server          User B                     │
│       │               │               │                        │
│       │─── INVITE ───>│               │  09:10:15              │
│       │               │               │                        │
│       │<─── 100 ──────│               │  09:10:16              │
│       │   Trying                      │                        │
│       │               │               │                        │
│       │               │─── INVITE ───>│  09:10:16              │
│       │               │               │                        │
│       │               │<─── 180 ──────│  09:10:17              │
│       │               │   Ringing                              │
│       │               │               │                        │
│       │<─── 180 ──────│               │  09:10:17              │
│       │   Ringing                     │                        │
│       │               │               │                        │
│       │               │<─── 200 ──────│  09:10:20              │
│       │               │   OK                                   │
│       │               │               │                        │
│       │<─── 200 ──────│               │  09:10:20              │
│       │   OK                          │                        │
│       │               │               │                        │
│       │─── ACK ──────>│               │  09:10:21              │
│       │               │               │                        │
│       │               │─── ACK ──────>│  09:10:21              │
│       │               │               │                        │
│       │    [CALL IN PROGRESS]         │                        │
│       │               │               │                        │
│       │─── BYE ──────>│               │  09:15:45              │
│       │               │               │                        │
│       │               │─── BYE ──────>│  09:15:45              │
│       │               │               │                        │
│       │               │<─── 200 ──────│  09:15:46              │
│       │               │   OK                                   │
│       │               │               │                        │
└────────────────────────────────────────────────────────────────┘
```

### Color Coding

**SIP Request Methods** - Purple
- INVITE, BYE, ACK, CANCEL, REGISTER, OPTIONS, etc.

**2xx Success** - Green
- 200 OK, 202 Accepted

**3xx Redirection** - Blue
- 300 Multiple Choices, 302 Moved Temporarily

**4xx Client Error** - Orange
- 400 Bad Request, 401 Unauthorized, 404 Not Found, 486 Busy Here

**5xx Server Error** - Red
- 500 Internal Error, 503 Service Unavailable

**6xx Global Failure** - Dark Red
- 600 Busy Everywhere, 603 Decline

---

## 🔍 Supported Log Formats

### SIP Protocol Messages

**Format 1: Standard SIP Log**
```
2024-01-15 10:23:45.123 [SIP] Sending INVITE from alice@example.com to bob@example.com
2024-01-15 10:23:46.456 [SIP] Received 200 OK from bob@example.com to alice@example.com
```

**Format 2: Compact Notation**
```
10:23:45 SIP: alice@example.com -> bob@example.com: INVITE
10:23:46 SIP: bob@example.com -> alice@example.com: 200 OK
```

**Format 3: Generic Arrow Notation**
```
Client -> Server: REGISTER
Server -> Client: 200 OK
User A -> User B: Message content
```

### Call Events

**Format 1: Call Initiation**
```
User alice@example.com initiated call to bob@example.com
Caller John started call with Jane
From alice@domain.com placing call to bob@domain.com
```

**Format 2: Call Termination**
```
Call ended between alice@example.com and bob@example.com
Session terminated from caller to callee
Call disconnected
```

**Format 3: Call Answered**
```
alice@example.com answered call from bob@example.com
User accepted incoming call
Call picked up by recipient
```

### Timestamp Formats Supported

```
ISO 8601:          2024-01-15T10:23:45.123Z
ISO with space:    2024-01-15 10:23:45.123
Time only:         10:23:45.123
Unix milliseconds: 1705315425123
```

---

## 🎨 Use Case Examples

### Use Case 1: SIP Call Setup Troubleshooting

**Scenario:** Call fails to connect between two Jabber clients

**Steps:**
1. Open Jabber log file
2. Run analysis to detect all events
3. Open **SIP Ladder Diagram**
4. Look for the call sequence:
   - INVITE sent from Client A
   - 100 Trying received
   - Did 180 Ringing arrive?
   - Did 200 OK arrive?
   - Was ACK sent?
5. **Identify the break** - Where did the sequence stop?
6. Click the last successful message
7. Jump to log line and read surrounding context
8. **Find root cause** - Timeout? Error? Missing message?

**Common Patterns:**
- **No 180 Ringing** → Called party not responding
- **No 200 OK** → Call not answered or rejected
- **No ACK** → Network issue or client crash
- **487 Request Terminated** → Call cancelled by caller
- **486 Busy Here** → Called party busy

### Use Case 2: Timeline Pattern Recognition

**Scenario:** Application crashes intermittently

**Steps:**
1. Open application log spanning multiple days
2. Apply timeframe filter "Last 7 Days"
3. Run analysis
4. Open **Timeline Visualization**
5. **Look for patterns:**
   - Do errors cluster at certain times?
   - Is there a lifecycle event (restart) before errors?
   - Are authentication failures preceding crashes?
   - Do connection issues correlate with errors?
6. **Correlate events:**
   - Click on error marker
   - Note the time
   - Look for nearby lifecycle or connection events
   - Check if pattern repeats
7. **Identify trigger:**
   - Daily task causing crash?
   - Specific user action?
   - Network connectivity issue?

**Patterns to Look For:**
- **Errors after restart** → Initialization issue
- **Errors at regular intervals** → Scheduled task problem
- **Errors following auth events** → Permission issue
- **Errors with connection events** → Network dependency

### Use Case 3: CUCM Registration Issues

**Scenario:** Jabber client won't register with CUCM

**Steps:**
1. Open Jabber log with registration attempts
2. Run analysis
3. Open **SIP Ladder Diagram**
4. Find REGISTER messages:
   ```
   Jabber -> CUCM: REGISTER
   CUCM -> Jabber: 401 Unauthorized
   Jabber -> CUCM: REGISTER (with auth)
   CUCM -> Jabber: 200 OK (or error)
   ```
5. **Check for:**
   - Did 401 challenge arrive?
   - Did second REGISTER include credentials?
   - Was 200 OK received?
   - If 403/503 error, what's the reason?
6. Click on error response
7. Read detailed error message in log
8. **Diagnose:**
   - Authentication failure?
   - Service unavailable?
   - Configuration mismatch?

### Use Case 4: Call Quality Investigation

**Scenario:** Users report dropped calls

**Steps:**
1. Collect logs from multiple calls
2. Run analysis on each log
3. Open **Timeline Visualization** for each
4. **Look for patterns before drops:**
   - Connection events (🔌 disconnects)
   - Quality warnings
   - Network errors
5. **Compare timelines:**
   - Do drops happen at same time of day?
   - Same duration into call?
   - Correlation with network events?
6. Open **SIP Ladder Diagram**
7. **Check termination:**
   - Who sent BYE? (Caller, callee, or network)
   - Was it graceful or abrupt?
   - Any error responses?
8. **Identify cause:**
   - Network timeout → Infrastructure issue
   - Caller BYE → Intentional hangup
   - No BYE → Crash or network failure

---

## ⚙️ Configuration

### Settings

No configuration required! The visualization features work automatically with detected events.

### Customization Options

**Timeline Interval** (affects Timeline view grouping):
```json
{
  "logScoutAnalyzer.timeline.intervalMinutes": 15
}
```

**Significant Events** (affects what appears in Timeline):
```json
{
  "logScoutAnalyzer.timeline.showSignificantEvents": true
}
```

---

## 🎓 Pro Tips

### Tip 1: Combine with Timeframe Filters

```
1. Set timeframe to "Last 1 Day"
2. Open Timeline Visualization
3. Focus on recent activity only
4. Less clutter, clearer patterns
```

### Tip 2: Use Timeline First, Then Ladder

```
1. Open Timeline Visualization
2. Identify interesting time period
3. Click "Show Call Flow Diagram"
4. See detailed message exchange
5. Two perspectives on same data
```

### Tip 3: Export for Documentation

```
1. Open Timeline or Ladder Diagram
2. Take screenshot (Ctrl+Shift+S in Windows)
3. Include in incident reports
4. Visual aids for team discussions
```

### Tip 4: Color Patterns Reveal Issues

```
Timeline with many red markers → Error spike
Ladder with orange responses → Client errors
Ladder with red responses → Server errors
Green responses → Successful operations
```

### Tip 5: Click to Investigate

```
Don't just look at diagrams!
Click events to jump to logs
Read surrounding context
Diagrams show "what", logs show "why"
```

---

## 🐛 Troubleshooting

### No Events in Timeline

**Problem:** Timeline shows "No timeline events detected"

**Solutions:**
- Ensure log has timestamps
- Run analysis first (Ctrl+Shift+P → "Scout: Analyze")
- Check if errors/warnings were detected
- Logs need recognizable timestamp format
- Try enabling "Show Significant Events" in Timeline view

### No SIP Messages Detected

**Problem:** Ladder diagram shows "No SIP/call flow messages detected"

**Solutions:**
- Verify logs contain SIP protocol messages
- Check for call-related keywords (INVITE, call, etc.)
- Ensure message format is recognizable:
  - `From X to Y: Message`
  - `X -> Y: Message`
  - `Sending/Receiving SIP method`
- Try generic call logs (not just SIP)

### Endpoints Not Recognized

**Problem:** Ladder diagram shows "Local" instead of real endpoints

**Solutions:**
- Ensure logs include full SIP URIs (user@domain.com)
- Check if endpoints are in recognizable format
- Parser looks for email-like patterns
- May need logs with more detail

### Timeline Events in Wrong Order

**Problem:** Events appear out of sequence

**Solutions:**
- Check if timestamps are correct
- Ensure consistent timestamp format throughout log
- Verify system clock wasn't adjusted
- Re-run analysis to refresh

---

## 📊 Technical Details

### Event Detection

**Timeline Events:**
- Extracted from diagnostics (errors, warnings, info)
- Enhanced with significant events (lifecycle, auth, calls)
- Requires timestamps for positioning
- Sorted chronologically

**SIP Messages:**
- Parsed using regex patterns
- Supports multiple log formats
- Extracts sender, receiver, method/response
- Groups into call sessions

### Rendering Technology

- **Webview Panels** - VS Code webview API
- **HTML/CSS** - Standard web technologies
- **JavaScript** - Client-side interactivity
- **SVG** - Scalable graphics (future enhancement)

### Performance

- **Fast Parsing** - Optimized regex patterns
- **Lazy Rendering** - Only visible events rendered
- **Memory Efficient** - Events processed on-demand
- **Smooth Scrolling** - Hardware-accelerated CSS

---

## 🔮 Future Enhancements

### Planned Features

- [ ] **Export to SVG** - Save diagrams as images
- [ ] **Zoom Controls** - Zoom in/out on timeline
- [ ] **Filter by Event Type** - Show only calls, only errors, etc.
- [ ] **Multi-log Correlation** - Overlay events from multiple logs
- [ ] **Call Session Grouping** - Separate diagrams per call
- [ ] **RTP Stream Analysis** - Media quality visualization
- [ ] **WebRTC Support** - WebRTC signaling diagrams
- [ ] **Custom Endpoint Names** - Rename endpoints for clarity

---

## 📚 Related Features

### Timeline View (Tree)
- Shows events grouped in time buckets
- Text-based, hierarchical
- Perfect for quick overview

### Timeline Visualization (Graphical)
- Shows events on visual timeline
- Graphical, interactive
- Perfect for pattern recognition

### SIP Ladder Diagram
- Shows message exchanges
- Sequence diagram format
- Perfect for protocol analysis

### Gutter Annotations
- Shows event markers in editor margin
- Inline with log text
- Perfect for context

---

## 🎉 Quick Reference

### Commands

| Command | Description |
|---------|-------------|
| `Scout: Show Timeline Visualization` | Open graphical timeline |
| `Scout: Show SIP Ladder Diagram` | Open call flow diagram |
| `Scout: Analyze Current File` | Detect events first |

### Analyzer Panel Buttons

| Button | Purpose |
|--------|---------|
| **Timeline Visualization** | Open timeline view |
| **SIP Ladder Diagram** | Open ladder diagram |

### Visual Elements

| Icon/Color | Meaning |
|------------|---------|
| 🔴 Red | Error event |
| 🟡 Orange | Warning event |
| 🔵 Blue | Info event |
| 🔄 Purple | Lifecycle event |
| 🔐 Orange | Authentication |
| 📞 Green | Call event |
| 🔌 Blue | Connection |

---

## 💡 Best Practices

### DO ✅

- Run analysis before opening visualizations
- Use timeframe filters for focused views
- Click events to see log details
- Combine timeline and ladder for complete picture
- Export diagrams for documentation
- Look for color patterns

### DON'T ❌

- Don't rely solely on visuals (read logs too!)
- Don't skip timestamp parsing errors
- Don't ignore event clusters
- Don't overlook connection events before errors
- Don't forget to check both directions in ladder

---

## 🎯 Summary

**Timeline Visualization provides:**
- ✅ Graphical event timeline
- ✅ Color-coded markers
- ✅ Interactive navigation
- ✅ Pattern recognition
- ✅ Temporal context

**SIP Ladder Diagrams provide:**
- ✅ Call flow visualization
- ✅ Message sequence display
- ✅ Protocol analysis
- ✅ Endpoint communication
- ✅ Response code visibility

**Together they enable:**
- 🎯 Faster troubleshooting
- 🔍 Better pattern recognition
- 📊 Visual documentation
- 🚀 Professional analysis
- 💎 Deeper insights

---

**Version:** 0.0.16  
**Build Date:** February 8, 2026  
**Package Size:** 174.94 KB  
**Status:** Production Ready ✅

*Making log analysis visual, interactive, and insightful!* 🔍📊📞