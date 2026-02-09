# RFC Tooltip Examples - Visual Guide

## Overview

This document shows visual examples of how RFC annotations appear as tooltips when hovering over SIP messages in the editor.

---

## Example 1: INVITE Method Tooltip

### Log Line
```log
2024-02-08 10:15:23.456 [SIP] Sending INVITE from alice@example.com to bob@example.com
```

### When User Hovers Over "INVITE"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Method: INVITE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:23.456 [SIP] Sending INVITE from              │
│ alice@example.com to bob@example.com                           │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §13.1                                              │
│                                                                 │
│ Initiates a session or modifies session parameters             │
│                                                                 │
│ Note: INVITE is used to establish media sessions between       │
│ user agents                                                     │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-13.1 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 2: Response Code Tooltip (Success)

### Log Line
```log
2024-02-08 10:15:26.789 [SIP] Received 200 OK from bob@example.com
```

### When User Hovers Over "200 OK"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 200 OK                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:26.789 [SIP] Received 200 OK from             │
│ bob@example.com                                                 │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.2.1                                            │
│                                                                 │
│ 200 OK - Request succeeded                                     │
│                                                                 │
│ Note: Call answered, registration successful, etc.             │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.2.1│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 3: Response Code Tooltip (Client Error)

### Log Line
```log
2024-02-08 10:15:25.123 [SIP] Received 486 Busy Here from bob@example.com
```

### When User Hovers Over "486"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 486 Busy Here                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:25.123 [SIP] Received 486 Busy Here from      │
│ bob@example.com                                                 │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.4.24                                           │
│                                                                 │
│ 486 Busy Here - Called party is busy                           │
│                                                                 │
│ Note: Called user equipment can receive but user declines      │
│ to answer                                                       │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.4.24│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 4: Response Code Tooltip (Authentication Error)

### Log Line
```log
2024-02-08 10:15:24.001 [SIP] Received 407 Proxy Authentication Required
```

### When User Hovers Over "407"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 407 Proxy Authentication Required                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:24.001 [SIP] Received 407 Proxy               │
│ Authentication Required                                         │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.4.8                                            │
│                                                                 │
│ 407 Proxy Authentication Required                              │
│                                                                 │
│ Note: Client must authenticate with proxy                      │
│ (Proxy-Authenticate header)                                     │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.4.8│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 5: BYE Method Tooltip

### Log Line
```log
2024-02-08 10:20:15.123 [SIP] Sending BYE to bob@example.com
```

### When User Hovers Over "BYE"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Method: BYE                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:20:15.123 [SIP] Sending BYE to bob@example.com   │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §15.1                                              │
│                                                                 │
│ Terminates a session                                           │
│                                                                 │
│ Note: Either party can send BYE to end the call                │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-15.1 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 6: REGISTER Method Tooltip

### Log Line
```log
2024-02-08 10:00:01.000 [SIP] Sending REGISTER to sip.example.com
```

### When User Hovers Over "REGISTER"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Method: REGISTER                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:00:01.000 [SIP] Sending REGISTER to              │
│ sip.example.com                                                 │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §10                                                │
│                                                                 │
│ Registers contact information with a registrar                 │
│                                                                 │
│ Note: Allows a UA to inform the network of its location        │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-10   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 7: Provisional Response Tooltip

### Log Line
```log
2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from bob@example.com
```

### When User Hovers Over "180"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 180 Ringing                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from        │
│ bob@example.com                                                 │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.1.2                                            │
│                                                                 │
│ 180 Ringing - Destination user agent is alerting               │
│                                                                 │
│ Note: Phone is ringing at called party                         │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.1.2│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 8: Not Found Error Tooltip

### Log Line
```log
2024-02-08 10:15:25.456 [SIP] Received 404 Not Found from proxy.example.com
```

### When User Hovers Over "404"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 404 Not Found                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:25.456 [SIP] Received 404 Not Found from      │
│ proxy.example.com                                               │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.4.5                                            │
│                                                                 │
│ 404 Not Found - User does not exist                            │
│                                                                 │
│ Note: Request-URI user unknown at domain                       │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.4.5│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 9: Service Unavailable Tooltip

### Log Line
```log
2024-02-08 10:15:26.001 [SIP] Received 503 Service Unavailable
```

### When User Hovers Over "503"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Response: 503 Service Unavailable                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:15:26.001 [SIP] Received 503 Service             │
│ Unavailable                                                     │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3261 §21.5.4                                            │
│                                                                 │
│ 503 Service Unavailable - Server temporarily unavailable       │
│                                                                 │
│ Note: Overload, maintenance, or temporary failure              │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3261#section-21.5.4│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 10: REFER Method Tooltip (Call Transfer)

### Log Line
```log
2024-02-08 10:18:30.123 [SIP] Sending REFER to bob@example.com
```

### When User Hovers Over "REFER"

```
┌─────────────────────────────────────────────────────────────────┐
│ SIP Method: REFER                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 2024-02-08 10:18:30.123 [SIP] Sending REFER to                 │
│ bob@example.com                                                 │
│                                                                 │
│ ───────────────────────────────────────────────────────────── │
│                                                                 │
│ 📖 RFC 3515 §2                                                 │
│                                                                 │
│ Requests recipient to perform action (e.g., transfer)          │
│                                                                 │
│ Note: Commonly used for call transfer operations               │
│                                                                 │
│ 🔗 View RFC: https://tools.ietf.org/html/rfc3515#section-2    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example 11: Multiple SIP Messages in Context

### Log Block
```log
2024-02-08 10:15:23.456 [SIP] Sending INVITE from alice@example.com to bob@example.com
2024-02-08 10:15:23.789 [SIP] Received 100 Trying from proxy.example.com
2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from bob@example.com
2024-02-08 10:15:26.456 [SIP] Received 200 OK from bob@example.com
2024-02-08 10:15:26.789 [SIP] Sending ACK to bob@example.com
```

### Each Line Has Its Own Tooltip

- Hover over **INVITE** → Shows RFC 3261 §13.1
- Hover over **100** → Shows RFC 3261 §21.1.1
- Hover over **180** → Shows RFC 3261 §21.1.2
- Hover over **200** → Shows RFC 3261 §21.2.1
- Hover over **ACK** → Shows RFC 3261 §13.2.1

---

## Example 12: Diagnostic with RFC Reference

### In Problems Panel (VS Code)

```
┌─────────────────────────────────────────────────────────────────┐
│ PROBLEMS                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ❌ test.log (3 errors, 2 warnings)                             │
│                                                                 │
│   Line 42  Error    Call Setup Failed: 486 Busy Here           │
│                     📖 RFC 3261 §21.4.24: Called party is busy │
│                                                                 │
│   Line 58  Error    Authentication Failed: 401 Unauthorized    │
│                     📖 RFC 3261 §21.4.2: Authentication        │
│                     required                                    │
│                                                                 │
│   Line 91  Error    Server Error: 503 Service Unavailable      │
│                     📖 RFC 3261 §21.5.4: Server temporarily    │
│                     unavailable                                 │
│                                                                 │
│   Line 33  Warning  Slow Response: 200 OK took 5.2s            │
│                     📖 RFC 3261 §21.2.1: Consider checking     │
│                     network latency                             │
│                                                                 │
│   Line 67  Warning  Multiple INVITE retransmissions            │
│                     📖 RFC 3261 §17.1.1: Possible packet loss  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Editor Screenshots (Conceptual)

### VS Code with Tooltip

```
┌────────────────────────────────────────────────────────────────────┐
│ File  Edit  View  Terminal  Help            test.log ○            │
├────────────────────────────────────────────────────────────────────┤
│  1  2024-02-08 10:15:23.456 [SIP] INFO Session starting           │
│  2  2024-02-08 10:15:23.456 [SIP] Sending INVITE from alice@ex... │
│                                            ▲▲▲▲▲▲                  │
│                  ┌──────────────────────────┴──────────────────┐   │
│  3               │ SIP Method: INVITE                          │   │
│                  │ ─────────────────────────────────────────── │   │
│  4               │ 📖 RFC 3261 §13.1                          │   │
│                  │                                             │   │
│  5               │ Initiates a session or modifies session    │   │
│                  │ parameters                                  │   │
│  6               │                                             │   │
│                  │ Note: INVITE is used to establish media    │   │
│  7               │ sessions between user agents               │   │
│                  │                                             │   │
│  8               │ 🔗 View RFC                                │   │
│                  └─────────────────────────────────────────────┘   │
│  9  2024-02-08 10:15:23.789 [SIP] Received 100 Trying from pr...  │
│ 10  2024-02-08 10:15:24.123 [SIP] Received 180 Ringing from b...  │
│ 11  2024-02-08 10:15:26.456 [SIP] Received 200 OK from bob@ex...  │
│ 12  2024-02-08 10:15:26.789 [SIP] Sending ACK to bob@example....  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Benefits in Action

### Scenario 1: Junior Engineer Learning SIP

**Before RFC Tooltips:**
1. Sees "486 Busy Here" in logs
2. Doesn't know what it means
3. Opens browser
4. Searches for "SIP 486"
5. Finds RFC 3261
6. Searches for section 21.4.24
7. Reads explanation
8. Returns to logs (5-10 minutes lost)

**With RFC Tooltips:**
1. Sees "486 Busy Here" in logs
2. Hovers over "486"
3. Sees RFC explanation immediately
4. Understands: "Called party is busy"
5. Continues analysis (5 seconds)

### Scenario 2: Senior Engineer Troubleshooting

**Before:**
- "Was that 480 or 486 for busy?"
- "Let me check the RFC..."

**With Tooltips:**
- Hover over code
- Instant reminder of meaning
- Faster troubleshooting

### Scenario 3: Documentation for Team

**Before:**
- Write: "The call failed with 503"
- Team asks: "What's 503?"

**With Tooltips:**
- Screenshot with tooltip visible
- Team sees: "503 Service Unavailable - Server temporarily unavailable"
- Self-documenting evidence

---

## Implementation Notes

### Markdown Formatting

All tooltips use **Markdown** for rich formatting:
- `**Bold**` for emphasis
- `*Italic*` for notes
- `🔗` emoji for links
- `📖` emoji for RFC references
- `───` for visual separators

### Hover Behavior

- Tooltip appears after **500ms** hover
- Stays visible while cursor over tooltip
- Dismisses when cursor moves away
- Can click links in tooltip (opens browser)

### Performance

- RFC database loaded once at startup
- Lookups are O(1) (HashMap)
- No network requests (all data embedded)
- < 1ms to generate tooltip

---

## Summary

RFC tooltips transform the log analyzer from a simple pattern matcher into an **educational tool** that helps engineers:

✅ Learn SIP protocol while working
✅ Troubleshoot faster (no context switching)
✅ Understand error codes immediately
✅ Reference specifications on-demand
✅ Share knowledge with team (self-documenting screenshots)

**Result**: A professional-grade tool that respects engineering workflows and enhances productivity.