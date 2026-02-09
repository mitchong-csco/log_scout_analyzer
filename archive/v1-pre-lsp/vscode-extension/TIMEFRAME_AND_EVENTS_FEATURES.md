# Timeframe Filters & Significant Events - Feature Guide

**Version:** 0.0.15  
**Date:** February 8, 2026  
**Status:** ✅ Production Ready

---

## 🎯 Overview

Two powerful new features have been added to Log Scout Analyzer to enhance timeline analysis:

1. **Timeframe Filters** - Quick date/time range buttons to focus on recent logs
2. **Significant Events** - Track lifecycle events (signin, logout, calls, connections) not just errors

These features work together to provide better insights into application behavior and user activities.

---

## ⏱️ Timeframe Filters

### What Are They?

Timeframe filters let you quickly narrow down log analysis to specific time periods without manually searching through dates. Perfect for focusing on recent activity or specific time windows.

### Where to Find Them

**Location:** Analyzer panel in the left sidebar

Look for the **"⏱️ Timeframe Filters"** section with these buttons:
- **Last 1 Day** - Show only last 24 hours
- **Last 2 Days** - Show only last 48 hours
- **Last 3 Days** - Show only last 72 hours
- **Last 7 Days** - Show only last week
- **All Time** - Show all log entries (removes filter)

### How to Use

1. **Open a log file** and run analysis
2. **Click the 🔭 telescope icon** in the Activity Bar
3. **Navigate to the Analyzer panel** (bottom view)
4. **Click a timeframe button** (e.g., "Last 1 Day")
5. **View filtered results** in all three views (Results, Categories, Timeline)

### Visual Feedback

- **Active filter** shows a checkmark: `✓ Last 1 Day`
- **Status message** displays: "Timeframe filter applied: Last 1 Day (247 of 1,523 results)"
- **Inactive filters** show an outline circle: `○ Last 2 Days`

### Example Use Cases

**1. Recent Error Investigation**
```
Scenario: Check if errors from last deployment are resolved
Steps:
  1. Open production log file
  2. Select "Last 1 Day" filter
  3. Check Results → Errors folder
  4. Compare with previous day's errors
```

**2. Weekly Pattern Analysis**
```
Scenario: Identify recurring issues over the past week
Steps:
  1. Open application log
  2. Select "Last 7 Days" filter
  3. Switch to Timeline view
  4. Look for patterns in time buckets
```

**3. Incident Time Window**
```
Scenario: Focus on specific incident time period
Steps:
  1. Know incident was 2 days ago
  2. Select "Last 3 Days" filter
  3. Review Categories for affected components
  4. Export filtered results for report
```

### Technical Details

- **Filtering Method:** Based on parsed timestamps in log lines
- **Timestamp Detection:** Automatic extraction from common formats
- **Performance:** Filters existing results (no re-parsing required)
- **Persistence:** Filter resets when "All Time" is selected or file is re-analyzed

---

## 🔄 Significant Events Tracking

### What Are They?

Significant Events go beyond just errors and warnings to track important application lifecycle moments:

- 🔄 **Lifecycle** - Start, exit, restart, shutdown, initialization
- 🔐 **Authentication** - Sign in, sign out, login, logout, authentication
- 📞 **Calls** - Call start/end, join/leave meeting, incoming/outgoing calls
- 🔌 **Connections** - Connect, disconnect, reconnect, network status
- 🔴 **Errors** - Critical failures (as before)
- 🟡 **Warnings** - Important alerts (as before)
- 🔵 **Info** - Informational messages (as before)

### Why Track Significant Events?

Traditional log analysis focuses on errors, but understanding application behavior requires tracking:
- **User activities** (when did they sign in/out?)
- **Application lifecycle** (when did it start/restart?)
- **Call patterns** (when did calls occur?)
- **Connection stability** (when did network issues happen?)

### How It Works

The Timeline view now has **two modes**:

**1. Significant Events Mode (Default)**
- Shows lifecycle, auth, calls, connections, AND errors
- Provides complete application behavior picture
- Perfect for user activity analysis
- Icon: 👁️ eye icon (visible)

**2. Issues Only Mode**
- Shows only errors, warnings, info (traditional mode)
- Focuses purely on problems
- Perfect for troubleshooting
- Icon: 👁️‍🗨️ eye with slash (hidden)

### How to Toggle

**Method 1: Timeline View Toolbar**
1. Click the 🔭 telescope icon (Activity Bar)
2. Navigate to **Timeline** panel
3. Click the **👁️ eye icon** in the toolbar
4. Mode switches instantly

**Method 2: Command Palette**
1. Press `Ctrl+Shift+P`
2. Type: "Scout: Toggle Significant Events"
3. Press Enter

**Visual Feedback:**
- Message displays: "Timeline now showing: Significant Events" or "All Issues"

### What Gets Detected

The system automatically detects these patterns in log lines:

**Lifecycle Events** 🔄
```
starting application
launched successfully
initialization complete
exit code 0
shutdown initiated
stopping service
restart requested
reloading configuration
```

**Authentication Events** 🔐
```
user signed in
login successful
logged in as admin
authentication completed
sign out initiated
logout successful
registration complete
token received
OAuth flow started
SAML assertion verified
SSO authentication
credentials validated
```

**Call Events** 📞
```
call initiated
outgoing call placed
call started
incoming call received
call ended
call terminated
call dropped
joined conference
left meeting
missed call
call duration: 5m 30s
```

**Connection Events** 🔌
```
connected to server
connection established
disconnected from host
connection lost
reconnecting...
reconnect successful
network available
network unavailable
socket connected
WebSocket closed
```

### Timeline Display

**Time Bucket Tooltips Show:**
```
10:00 AM - 10:15 AM
3 events

🔴 1 errors
🔄 1 lifecycle
🔐 1 auth
📞 0 calls
🔌 0 connections
```

**Individual Event Items:**
```
🔐 10:05:23 AM - User authentication successful     Line 1247
📞 10:12:45 AM - Outgoing call placed               Line 1523
🔴 10:14:30 AM - Call quality degraded              Line 1598
```

### Example Scenarios

**Scenario 1: User Session Analysis**
```
Goal: Understand complete user session flow
Steps:
  1. Enable Significant Events in Timeline
  2. Set timeframe to "Last 1 Day"
  3. Look for authentication events (🔐)
  4. Track lifecycle events (🔄) around sign in
  5. Identify call patterns (📞)
  6. Note any errors during session
```

**Scenario 2: Application Stability**
```
Goal: Check for restart patterns
Steps:
  1. Enable Significant Events
  2. Set timeframe to "Last 7 Days"
  3. Filter Timeline for lifecycle events (🔄)
  4. Count restart/shutdown events
  5. Correlate with error events (🔴)
```

**Scenario 3: Call Quality Investigation**
```
Goal: Investigate dropped calls
Steps:
  1. Enable Significant Events
  2. Look for call events (📞)
  3. Check connection events (🔌) around same time
  4. Review errors during call period
  5. Export timeline for analysis
```

---

## ⚙️ Configuration

### Settings

**Timeline Settings** (Settings → Log Scout Analyzer)

```json
{
  // Show significant events (lifecycle, auth, calls) or just issues
  "logScoutAnalyzer.timeline.showSignificantEvents": true,
  
  // Time interval for grouping events (1-1440 minutes)
  "logScoutAnalyzer.timeline.intervalMinutes": 15
}
```

**Default Values:**
- `showSignificantEvents`: `true` (enabled by default)
- `intervalMinutes`: `15` (15-minute buckets)

### Customizing Time Intervals

Want different time groupings? Adjust the interval:

```json
{
  "logScoutAnalyzer.timeline.intervalMinutes": 5    // 5-minute buckets (detailed)
}
```

```json
{
  "logScoutAnalyzer.timeline.intervalMinutes": 60   // 1-hour buckets (overview)
}
```

```json
{
  "logScoutAnalyzer.timeline.intervalMinutes": 1440 // Daily buckets (long-term)
}
```

---

## 🎓 Pro Tips

### Tip 1: Combine Filters
Use timeframe filters AND significant events together:
1. Set "Last 1 Day" timeframe
2. Enable Significant Events
3. Get focused view of recent activity

### Tip 2: Pattern Recognition
Look for patterns in event sequences:
- Does call quality degrade after network reconnects?
- Do errors occur after restarts?
- Are there failed logins before successful ones?

### Tip 3: Export for Reporting
Create timeline reports:
1. Apply timeframe filter
2. Enable Significant Events
3. Export results
4. Share with team

### Tip 4: Quick Troubleshooting
For pure error analysis:
1. Disable Significant Events (click eye icon)
2. Focus only on problems
3. Use traditional troubleshooting flow

### Tip 5: User Activity Audit
Track what users did:
1. Enable Significant Events
2. Look for authentication events (🔐)
3. Track calls placed (📞)
4. Monitor connections (🔌)
5. Create activity timeline

---

## 📊 Visual Reference

### Timeframe Filter UI
```
⏱️ Timeframe Filters          [Active: Last 1 Day]
  ✓ Last 1 Day                [Currently active]
  ○ Last 2 Days               [Click to apply]
  ○ Last 3 Days               [Click to apply]
  ○ Last 7 Days               [Click to apply]
  ○ All Time                  [Click to apply]
```

### Timeline with Significant Events
```
Timeline                                              [👁️]
  ├─ 📅 09:00 AM - 09:15 AM (5 events)
  │   ├─ 🔄 09:02:15 AM - Application started       Line 10
  │   ├─ 🔐 09:05:30 AM - User logged in            Line 45
  │   ├─ 📞 09:12:00 AM - Call initiated            Line 120
  │   ├─ 🔌 09:13:45 AM - Connection established    Line 145
  │   └─ 🔵 09:14:20 AM - Registration complete     Line 160
  │
  ├─ 📅 09:15 AM - 09:30 AM (3 events)
  │   ├─ 📞 09:18:30 AM - Call ended                Line 210
  │   ├─ 🔴 09:25:15 AM - Connection timeout        Line 278
  │   └─ 🔌 09:27:00 AM - Reconnect successful      Line 301
```

### Event Type Icons
- 🔴 **Error** - Critical failures
- 🟡 **Warning** - Important alerts
- 🔵 **Info** - Informational messages
- 🔄 **Lifecycle** - Start, stop, restart
- 🔐 **Authentication** - Login, logout, tokens
- 📞 **Call** - Call activity
- 🔌 **Connection** - Network status

---

## 🚀 Quick Start Guide

### Getting Started in 3 Steps

**Step 1: Apply Timeframe Filter**
1. Open log file
2. Run analysis
3. Click "Last 1 Day" in Analyzer panel

**Step 2: Enable Significant Events**
1. Navigate to Timeline view
2. Verify eye icon is visible (enabled)
3. If not, click to toggle

**Step 3: Explore Timeline**
1. Expand time buckets
2. See all event types
3. Click events to jump to log lines

---

## 🔧 Troubleshooting

### No Events Showing?

**Problem:** Timeline is empty
**Solutions:**
- Check if timestamps are detected in logs
- Verify timeframe filter isn't too restrictive
- Ensure analysis completed successfully
- Try "All Time" filter to see all data

### Can't Find Timeframe Buttons?

**Problem:** Timeframe filters not visible
**Solutions:**
- Scroll down in Analyzer panel
- Look for "⏱️ Timeframe Filters" header
- Ensure extension version is 0.0.15+

### Significant Events Not Detected?

**Problem:** Only seeing errors, not lifecycle events
**Solutions:**
- Check if Significant Events is enabled (eye icon)
- Verify log format includes recognizable patterns
- Log patterns need keywords like "login", "start", "call", etc.
- Some logs may not have lifecycle information

### Wrong Time Range?

**Problem:** Timeframe filter shows unexpected results
**Solutions:**
- Verify log timestamps are correctly parsed
- Check if logs span the expected time range
- System detects timestamps automatically
- May need logs with standard timestamp formats

---

## 📈 Use Case Examples

### Example 1: Daily Operations Review
```
Timeframe: Last 1 Day
Events: Enabled

Review:
- Morning: 🔄 App started at 6:00 AM
- Morning: 🔐 First users logged in 6:15 AM
- Midday: 📞 Peak call activity 12:00-2:00 PM
- Afternoon: 🔌 Network blip at 3:45 PM (reconnect successful)
- Evening: 🔴 1 error at 5:30 PM (investigated)
```

### Example 2: Incident Analysis
```
Timeframe: Last 3 Days
Events: Enabled

Investigation:
- Day 1: Normal pattern (🔐🔄📞)
- Day 2: Multiple 🔌 disconnect events starting 2:00 PM
- Day 2: 🔴 Errors correlate with disconnects
- Day 3: 🔄 Service restart at 8:00 AM
- Day 3: Stability restored
```

### Example 3: User Activity Audit
```
Timeframe: Last 7 Days
Events: Enabled

Audit:
- User logins: 🔐 45 sign-in events
- Calls made: 📞 23 call events
- Sessions: Average 2 hours between login/logout
- Issues: 🔴 2 auth failures (investigated)
```

---

## 🎯 Best Practices

### DO ✅
- Use timeframe filters for focused analysis
- Enable Significant Events for full context
- Look for patterns across event types
- Export timeline for documentation
- Adjust time intervals based on log volume

### DON'T ❌
- Don't rely solely on errors (miss bigger picture)
- Don't use too narrow timeframes (might miss context)
- Don't ignore lifecycle events (key to understanding flow)
- Don't forget to clear filters when done
- Don't overlook connection events before errors

---

## 📚 Additional Resources

### Related Features
- **Gutter Annotations** - Visual indicators in editor
- **Split View** - Side-by-side comparison
- **Categories View** - Component-based grouping
- **Results View** - Severity-based grouping

### Commands Reference
- `Scout: Set Timeframe Filter` - Apply time range
- `Scout: Toggle Significant Events` - Switch Timeline mode
- `Scout: Analyze Current File` - Run analysis
- `Scout: Export Results` - Save filtered data

### Settings Reference
```json
{
  "logScoutAnalyzer.timeline.showSignificantEvents": true,
  "logScoutAnalyzer.timeline.intervalMinutes": 15,
  "logScoutAnalyzer.highlightDuration": 2000
}
```

---

## 🎉 Summary

**Timeframe Filters** provide:
- ✅ Quick date/time range selection (1, 2, 3, 7 days)
- ✅ Easy button interface in Analyzer panel
- ✅ Instant filtering of all views
- ✅ Visual feedback with checkmarks

**Significant Events** provide:
- ✅ Lifecycle tracking (start, stop, restart)
- ✅ Authentication monitoring (login, logout)
- ✅ Call activity tracking
- ✅ Connection status visibility
- ✅ Complete application behavior picture

**Together they enable:**
- 🎯 Focused temporal analysis
- 🔍 Complete behavioral context
- 📊 Pattern recognition
- 🚀 Faster troubleshooting
- 📈 Better insights

---

**Version:** 0.0.15  
**Build Date:** February 8, 2026  
**Package Size:** 155.21 KB  
**Status:** Production Ready ✅

*Making log analysis comprehensive and time-aware!* 🔍⏱️🚀