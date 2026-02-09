# Log Scout Analyzer v0.0.15 - Release Notes

**Release Date:** February 8, 2026  
**Build:** 1770515712325  
**Package Size:** 155.21 KB  
**Status:** 🚀 Production Ready

---

## 🎉 What's New

### ⏱️ Timeframe Filters (Major Feature)

Quickly filter log analysis to specific time periods with easy-to-use preset buttons!

**New Features:**
- **5 Quick Filter Buttons:**
  - Last 1 Day (24 hours)
  - Last 2 Days (48 hours)
  - Last 3 Days (72 hours)
  - Last 7 Days (1 week)
  - All Time (remove filter)

- **Location:** Analyzer panel in left sidebar
- **Visual Feedback:** Active filter shows checkmark ✓
- **Applies To:** All views (Results, Categories, Timeline)
- **Performance:** Instant filtering, no re-parsing required

**Use Cases:**
- Focus on recent deployment logs
- Investigate specific incident timeframes
- Compare day-over-day patterns
- Filter out old historical data

### 🔄 Significant Events Tracking (Major Feature)

Timeline view now tracks important lifecycle events, not just errors!

**Event Types Detected:**
- 🔄 **Lifecycle** - Start, exit, restart, shutdown, initialization
- 🔐 **Authentication** - Sign in, sign out, login, logout, tokens
- 📞 **Calls** - Call start/end, join/leave, incoming/outgoing
- 🔌 **Connections** - Connect, disconnect, reconnect, network status
- 🔴 **Errors** - Critical failures (as before)
- 🟡 **Warnings** - Important alerts (as before)
- 🔵 **Info** - Informational messages (as before)

**New Capabilities:**
- **Toggle Mode:** Switch between "Significant Events" and "Issues Only"
- **Rich Timeline:** See complete application behavior, not just problems
- **Event Icons:** Visual indicators for each event type
- **Smart Detection:** Automatic pattern recognition in log lines

**Toggle Button:** 👁️ eye icon in Timeline view toolbar

**Use Cases:**
- Track user session flows (login → calls → logout)
- Monitor application lifecycle (start → errors → restart)
- Analyze call patterns and quality
- Correlate connection issues with errors

---

## 🔧 Technical Improvements

### Architecture Enhancements
- New `TimeframeFilter` interface for date range filtering
- Enhanced `SignificantEvent` interface with 7 event types
- Dual-mode Timeline provider (events vs. issues)
- Efficient filtering without re-analysis

### Pattern Recognition
- 40+ lifecycle patterns (start, stop, restart, exit, etc.)
- 30+ authentication patterns (login, logout, token, OAuth, SAML)
- 25+ call patterns (incoming, outgoing, join, leave, duration)
- 20+ connection patterns (connect, disconnect, network status)

### Configuration Options
```json
{
  "logScoutAnalyzer.timeline.showSignificantEvents": true,
  "logScoutAnalyzer.timeline.intervalMinutes": 15
}
```

---

## 📋 New Commands

### Timeframe Commands
- `Scout: Set Timeframe Filter` - Apply time range filter
  - Accessible via Analyzer panel buttons
  - Instant filtering with result count display

### Event Commands
- `Scout: Toggle Significant Events` - Switch Timeline mode
  - Also available via Timeline toolbar (eye icon)
  - Toggles between comprehensive and issues-only view

---

## 🎨 UI/UX Updates

### Analyzer Panel
```
⏱️ Timeframe Filters          [Active: Last 1 Day]
  ✓ Last 1 Day                [Currently active]
  ○ Last 2 Days               [Click to apply]
  ○ Last 3 Days               [Click to apply]
  ○ Last 7 Days               [Click to apply]
  ○ All Time                  [Click to apply]
```

### Timeline View (Significant Events Mode)
```
Timeline                                              [👁️]
  ├─ 📅 09:00 AM - 09:15 AM (5 events)
  │   ├─ 🔄 09:02:15 AM - Application started       Line 10
  │   ├─ 🔐 09:05:30 AM - User logged in            Line 45
  │   ├─ 📞 09:12:00 AM - Call initiated            Line 120
  │   ├─ 🔌 09:13:45 AM - Connection established    Line 145
  │   └─ 🔵 09:14:20 AM - Registration complete     Line 160
```

### Event Tooltips
```
10:00 AM - 10:15 AM
8 events

🔴 2 errors
🔄 1 lifecycle
🔐 2 auth
📞 2 calls
🔌 1 connections
```

---

## 📊 Comparison: v0.0.14 vs v0.0.15

| Feature | v0.0.14 | v0.0.15 |
|---------|---------|---------|
| Timeframe Filters | ❌ Manual filtering | ✅ 1-click preset buttons |
| Timeline Events | ❌ Errors/warnings only | ✅ 7 event types |
| Event Icons | 🔴🟡🔵 (3 types) | 🔴🟡🔵🔄🔐📞🔌 (7 types) |
| User Activity | ❌ Not tracked | ✅ Full tracking |
| Lifecycle Visibility | ❌ Not visible | ✅ Prominently displayed |
| Filter UI | ❌ None | ✅ Analyzer panel section |
| Toggle Mode | ❌ Single mode | ✅ Dual mode (events/issues) |

---

## 🚀 Quick Start

### Using Timeframe Filters

1. **Open a log file** and run analysis
2. **Click 🔭 telescope icon** in Activity Bar
3. **Scroll to Analyzer panel** (bottom)
4. **Click "Last 1 Day"** button
5. **View filtered results** in all panels

### Using Significant Events

1. **Navigate to Timeline view**
2. **Check eye icon (👁️)** in toolbar - should be visible
3. **Expand time buckets** to see all event types
4. **Click events** to jump to log lines
5. **Toggle off** eye icon to see issues-only mode

### Combining Both Features

1. **Apply timeframe filter** (e.g., "Last 3 Days")
2. **Enable Significant Events** in Timeline
3. **Get focused view** of recent activity with full context
4. **Export results** for reporting

---

## 📚 Documentation

### New Documentation Files
- **TIMEFRAME_AND_EVENTS_FEATURES.md** (560 lines)
  - Complete feature guide
  - Configuration examples
  - Use case scenarios
  - Troubleshooting tips
  - Visual references

### Updated Files
- **package.json** - Added new commands and settings
- **analyzerTreeProvider.ts** - Timeframe filter UI
- **timelineTreeProvider.ts** - Significant events logic
- **extension.ts** - Command handlers

---

## 🎯 Use Case Examples

### Daily Operations Review
```
Timeframe: Last 1 Day
Events: Enabled

Timeline shows:
- 6:00 AM: 🔄 App started
- 6:15 AM: 🔐 First user login
- 12:00 PM: 📞 Peak call activity
- 3:45 PM: 🔌 Network reconnect
- 5:30 PM: 🔴 Error (investigated)
```

### Incident Investigation
```
Timeframe: Last 3 Days
Events: Enabled

Pattern discovered:
- Day 1: Normal operations
- Day 2: 🔌 Multiple disconnects → 🔴 Errors
- Day 3: 🔄 Service restart → Stability restored
```

### User Activity Audit
```
Timeframe: Last 7 Days
Events: Enabled

Results:
- 🔐 45 login events
- 📞 23 calls placed
- 🔌 3 connection issues
- 🔴 2 auth failures (resolved)
```

---

## ⚙️ Settings

### New Settings

```json
{
  // Show lifecycle events, auth, calls in Timeline (default: true)
  "logScoutAnalyzer.timeline.showSignificantEvents": true,
  
  // Time interval for grouping (1-1440 minutes, default: 15)
  "logScoutAnalyzer.timeline.intervalMinutes": 15
}
```

### Recommended Configuration

```json
{
  // Core features
  "logScoutAnalyzer.enableDiagnostics": true,
  "logScoutAnalyzer.autoPromptOnOpen": true,
  
  // Timeline features (NEW!)
  "logScoutAnalyzer.timeline.showSignificantEvents": true,
  "logScoutAnalyzer.timeline.intervalMinutes": 15,
  
  // UI preferences
  "logScoutAnalyzer.highlightDuration": 2000,
  "logScoutAnalyzer.useEnhancedTreeView": true
}
```

---

## 🐛 Bug Fixes

- Fixed TypeScript type errors in timeline provider
- Improved timestamp extraction reliability
- Enhanced pattern matching for edge cases
- Better handling of logs without timestamps

---

## 📦 Package Details

- **Version:** 0.0.15 (incremented from 0.0.14)
- **Size:** 155.21 KB (was 139.5 KB - +11% due to new features)
- **Files:** 50 files (was 47 files - added 3 new)
- **Build Date:** 2026-02-08T01:55:12.325Z
- **Git Commit:** b7f7d6a

---

## 🔄 Migration Guide

### From v0.0.14 to v0.0.15

**No breaking changes!** All existing features work as before.

**New features are opt-in:**
- Timeframe filters: Click to use, "All Time" is default
- Significant Events: Enabled by default, toggle off if desired

**Recommended Actions:**
1. Update extension: `code --install-extension log-scout-analyzer.vsix --force`
2. Restart VS Code
3. Test timeframe filters on existing logs
4. Explore Timeline with Significant Events enabled
5. Configure settings if needed

---

## ✅ Testing Checklist

### Timeframe Filters
- [x] All 5 filter buttons work correctly
- [x] Active filter shows checkmark
- [x] Filters apply to all views
- [x] Result count displays correctly
- [x] "All Time" removes filter

### Significant Events
- [x] Toggle button works
- [x] Lifecycle events detected
- [x] Authentication events detected
- [x] Call events detected
- [x] Connection events detected
- [x] Icons display correctly
- [x] Tooltips show event counts

### Integration
- [x] Timeframe + Significant Events work together
- [x] Export includes filtered data
- [x] Settings persist correctly
- [x] Performance is acceptable

---

## 🎓 Learning Resources

### Quick Start Videos (Coming Soon)
- Timeframe Filters in 60 seconds
- Significant Events explained
- Combining features for power analysis

### Documentation
- [TIMEFRAME_AND_EVENTS_FEATURES.md](./TIMEFRAME_AND_EVENTS_FEATURES.md) - Full guide
- [QUICK_START_v0.0.14.md](./QUICK_START_v0.0.14.md) - Still relevant
- [FEATURE_VERIFICATION_v0.0.14.md](./FEATURE_VERIFICATION_v0.0.14.md) - Base features

---

## 🙏 Acknowledgments

Special thanks to users who requested:
- Date/time filtering capabilities
- Visibility into application lifecycle
- Better understanding of user activities
- Context beyond just errors

---

## 🔮 What's Next?

### Planned Features (v0.0.16+)
- Custom timeframe picker (exact date/time ranges)
- Event type filtering (show only lifecycle, only calls, etc.)
- Pattern library for common applications (Jabber, CUCM, etc.)
- Enhanced export with event type breakdown
- Statistics dashboard (events per day, call volume, etc.)

---

## 📞 Support & Feedback

### Getting Help
- Review documentation in extension folder
- Check troubleshooting sections
- Use "Scout: Show Version Info" to verify installation

### Reporting Issues
- Include version number (0.0.15)
- Describe expected vs actual behavior
- Provide sample log snippets (sanitized)

### Feature Requests
- We'd love to hear your ideas!
- What event types should we track?
- What timeframe presets would help?
- What analysis features are missing?

---

## 🎉 Thank You!

Thank you for using Log Scout Analyzer! This release represents a major step forward in making log analysis more comprehensive, time-aware, and insightful.

**Happy Log Hunting!** 🔍⏱️🚀

---

**Installation:**
```powershell
cd C:\Users\mitchong\Downloads\vscode-extensions
code --install-extension log-scout-analyzer.vsix --force
```

**Version:** 0.0.15  
**Release:** February 8, 2026  
**Status:** Production Ready ✅