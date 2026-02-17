# Case Management Workflow Diagram

## Overview Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CASE MANAGEMENT WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌─────────────────────┐
│  Choose Import      │
│  Method             │
└─────────────────────┘
      │
      ├────────────────┬────────────────┐
      ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Download │    │  Import  │    │  Manual  │
│ from URL │    │  Local   │    │  Extract │
└──────────┘    └──────────┘    └──────────┘
      │                │                │
      └────────────────┴────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Archive File   │
              │   Downloaded    │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Auto-Extract   │
              │   (zip, tar,    │
              │    tgz, 7z)     │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Discover Logs  │
              │  (.log, .txt,   │
              │   .out, .err)   │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Case Ready ✓   │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Open Case in  │
              │    Workspace    │
              └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Analyze Logs   │
              │  View Results   │
              └─────────────────┘
                       │
                       ▼
                     END
```

---

## Detailed Download Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    DOWNLOAD FROM URL                            │
└────────────────────────────────────────────────────────────────┘

User Action: Ctrl+Shift+P → "Scout: Download Case from URL"
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Input Dialog: Enter URL                                         │
│  Example: https://example.com/cases/case-12345.zip             │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Input Dialog: Enter Case ID (Optional)                         │
│  Example: customer-network-issue-2024-01                        │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Progress: Downloading...                                        │
│  Status Bar: $(cloud-download) Downloading case: 45%            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼ (Success)
┌─────────────────────────────────────────────────────────────────┐
│  Archive saved to:                                               │
│  .log-scout-cases/case-123456-abc/archive/case-12345.zip       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Auto-Extract: Extracting archive...                            │
│  Status: extracting                                              │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Logs extracted to:                                              │
│  .log-scout-cases/case-123456-abc/logs/                         │
│    ├── application.log                                           │
│    ├── debug.log                                                 │
│    └── error.log                                                 │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Notification: "Case customer-network-issue is ready            │
│                 with 15 log files."                              │
│  Status: ready ✓                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## File System Structure

```
┌────────────────────────────────────────────────────────────────┐
│                 CASE STORAGE STRUCTURE                          │
└────────────────────────────────────────────────────────────────┘

Workspace Root
│
├── .log-scout-cases/                    ← Base cases directory
│   │
│   ├── case-1704123456-abc123/          ← Individual case folder
│   │   ├── archive/                     ← Original archives
│   │   │   └── original.zip             ← Downloaded/imported archive
│   │   │
│   │   └── logs/                        ← Extracted log files
│   │       ├── app.log
│   │       ├── jabber.log
│   │       ├── debug.out
│   │       └── error.txt
│   │
│   ├── case-1704123789-def456/
│   │   ├── archive/
│   │   │   └── support-case.tar.gz
│   │   │
│   │   └── logs/
│   │       ├── system.log
│   │       ├── network.log
│   │       └── auth/
│   │           ├── auth.log
│   │           └── ldap.log
│   │
│   └── case-1704124012-ghi789/
│       ├── archive/
│       │   └── logs.7z
│       │
│       └── logs/
│           └── service.log
│
└── .vscode/                             ← VS Code settings
    └── settings.json
```

---

## State Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      CASE STATUS STATES                         │
└────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ pending  │ ← Case created, not processed yet
    └──────────┘
         │
         ▼ (Download/Import initiated)
    ┌──────────┐
    │downloading│ ← Downloading from URL
    └──────────┘
         │
         ▼ (Download complete)
    ┌──────────┐
    │extracting│ ← Extracting archive
    └──────────┘
         │
         ├─────────────────┐
         │ (Success)       │ (Failure)
         ▼                 ▼
    ┌──────────┐      ┌──────────┐
    │  ready   │      │  error   │
    └──────────┘      └──────────┘
         │                 │
         │                 │
         ▼                 ▼
    (Can analyze)    (Manual fix needed)
```

---

## Tree View Structure

```
┌────────────────────────────────────────────────────────────────┐
│                     CASES TREE VIEW                             │
└────────────────────────────────────────────────────────────────┘

📁 CASES
│
├─ 💼 Customer-ACME-Network-Issue              [✓ 15 files]
│  ├─ 📋 Details
│  │  ├─ 🏷️  Case ID: case-1704123456-abc123
│  │  ├─ ✅ Status: ready
│  │  ├─ 📅 Downloaded: 2h ago
│  │  ├─ 📄 Log Files: 15
│  │  └─ 📝 Description: Production network outage
│  │
│  └─ 📂 Log Files (15)
│     ├─ 📄 application.log
│     ├─ 📄 jabber.log
│     ├─ 📄 jabber_ui.log
│     ├─ 📄 debug.out
│     └─ ... (11 more)
│
├─ 💼 Customer-Contoso-Auth-Problem            [⏬ Downloading...]
│  └─ 📋 Details
│     ├─ 🏷️  Case ID: case-1704123789-def456
│     ├─ ⏬ Status: downloading
│     └─ 📅 Downloaded: Just now
│
├─ 💼 Historical-Case-Old                      [❌ Error]
│  └─ 📋 Details
│     ├─ 🏷️  Case ID: case-1704124012-ghi789
│     ├─ ❌ Status: error
│     ├─ 📅 Downloaded: 2d ago
│     └─ ⚠️  Error: Failed to extract: corrupted archive
│
└─ 📦 Archive-In-Progress                      [📦 Extracting...]
   └─ 📋 Details
      ├─ 🏷️  Case ID: case-1704124234-jkl012
      ├─ 📦 Status: extracting
      └─ 📅 Downloaded: 5m ago
```

---

## Command Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                   USER COMMAND FLOWS                            │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 1. DOWNLOAD CASE                                                 │
└─────────────────────────────────────────────────────────────────┘
User → Command Palette → "Scout: Download Case from URL"
       → Enter URL → Enter Case ID → Download → Extract → Ready ✓


┌─────────────────────────────────────────────────────────────────┐
│ 2. IMPORT LOCAL CASE                                             │
└─────────────────────────────────────────────────────────────────┘
User → Command Palette → "Scout: Import Case from Local File"
       → Browse File → Select Archive → Enter Case ID
       → Copy → Extract → Ready ✓


┌─────────────────────────────────────────────────────────────────┐
│ 3. OPEN CASE                                                     │
└─────────────────────────────────────────────────────────────────┘
User → Click Case in Tree View → Case Added to Workspace
       → Log Files Available in Explorer


┌─────────────────────────────────────────────────────────────────┐
│ 4. ANALYZE CASE                                                  │
└─────────────────────────────────────────────────────────────────┘
User → Right-click Case → "Analyze All Case Logs"
       → Progress Bar → All Logs Analyzed
       → Results in Results View


┌─────────────────────────────────────────────────────────────────┐
│ 5. DELETE CASE                                                   │
└─────────────────────────────────────────────────────────────────┘
User → Right-click Case → "Delete Case"
       → Confirmation Dialog → Choose: "Delete Files" or
                                        "Remove from List Only"
       → Case Removed
```

---

## Integration with Analysis Features

```
┌────────────────────────────────────────────────────────────────┐
│              CASE + ANALYSIS INTEGRATION                        │
└────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │   Case      │
                    │   Opened    │
                    └─────────────┘
                          │
                          ▼
           ┌──────────────────────────────┐
           │  Log Files in Workspace      │
           └──────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│   Click Log   │ │  Auto-Analyze │ │ Batch Analyze │
│  File in Tree │ │   on Open     │ │  All Logs     │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  LSP Analysis    │
                 │  Pattern Match   │
                 └──────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Results View  │ │Categories View│ │ Timeline View │
└───────────────┘ └───────────────┘ └───────────────┘
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │ User Reviews     │
                 │ & Investigates   │
                 └──────────────────┘
```

---

## Multi-Case Scenario

```
┌────────────────────────────────────────────────────────────────┐
│            WORKING WITH MULTIPLE CASES                          │
└────────────────────────────────────────────────────────────────┘

Workspace
│
├─ 📁 Case: Customer-A-Issue-1
│  ├─ app.log      [10 errors, 25 warnings]
│  ├─ debug.log    [5 errors, 10 warnings]
│  └─ network.log  [2 errors, 5 warnings]
│
├─ 📁 Case: Customer-A-Issue-2
│  ├─ system.log   [15 errors, 30 warnings]
│  └─ auth.log     [3 errors, 8 warnings]
│
└─ 📁 Case: Customer-B-Issue-1
   └─ service.log  [8 errors, 12 warnings]

                    ↓

            Results View Shows:
            All Issues Across
            All Open Cases
            
            Total: 43 errors, 90 warnings
            
            Grouped by:
            ├─ Severity
            ├─ Category
            └─ File (shows which case)
```

---

## Error Handling Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   ERROR SCENARIOS                               │
└────────────────────────────────────────────────────────────────┘

Download Error:
    URL Invalid/Unreachable
           │
           ▼
    Show Error Message
           │
           ▼
    Case Status: error
           │
           ▼
    User Can:
    - Retry Download
    - Delete Case
    - Import Manually

─────────────────────────────────────────────────────────────────

Extract Error:
    Archive Corrupted/Unsupported
           │
           ▼
    Show Error Message
           │
           ▼
    Case Status: error
           │
           ▼
    User Can:
    - Re-download
    - Try Different Tool
    - Delete Case

─────────────────────────────────────────────────────────────────

No Logs Found:
    Archive Contains No Log Files
           │
           ▼
    Show Warning
           │
           ▼
    Case Status: ready (but 0 files)
           │
           ▼
    User Can:
    - Browse Manually
    - Check Archive Contents
    - Delete Case
```

---

## Status Bar Integration

```
┌────────────────────────────────────────────────────────────────┐
│                    STATUS BAR DISPLAY                           │
└────────────────────────────────────────────────────────────────┘

Normal State:
┌──────────────────────────────────────────────────────────────┐
│ 🔍 3E 10W 5I | 💼 Cases: 3/4                                 │
└──────────────────────────────────────────────────────────────┘
   │            │
   │            └─ 3 ready cases out of 4 total
   └─ Analysis results (3 errors, 10 warnings, 5 info)

Downloading:
┌──────────────────────────────────────────────────────────────┐
│ 🔍 3E 10W 5I | ⏬ Downloading case-123: 67%                  │
└──────────────────────────────────────────────────────────────┘

Click Status Bar → Shows Cases List Quick Pick
```

---

## Quick Actions Menu

```
┌────────────────────────────────────────────────────────────────┐
│                  RIGHT-CLICK CONTEXT MENU                       │
└────────────────────────────────────────────────────────────────┘

Right-click Case in Tree View:

┌─────────────────────────────────────┐
│  📁 Open Case                        │  ← Add to workspace
│  🔍 Analyze All Case Logs            │  ← Batch analysis
│  🪟 Open Case in New Window          │  ← Separate window
│  ─────────────────────────────────   │
│  ✏️  Rename Case                     │  ← Change display name
│  ℹ️  Show Case Details               │  ← View metadata
│  ─────────────────────────────────   │
│  🗑️  Delete Case                     │  ← Remove case
└─────────────────────────────────────┘

Right-click Log File in Tree View:

┌─────────────────────────────────────┐
│  📄 Open Log File                    │  ← Open in editor
│  🔍 Analyze This File                │  ← Single file analysis
│  📋 Copy File Path                   │  ← Copy to clipboard
│  📂 Reveal in Explorer               │  ← Show in file browser
└─────────────────────────────────────┘
```

---

## Keyboard Shortcuts (Suggested)

```
┌────────────────────────────────────────────────────────────────┐
│                  KEYBOARD SHORTCUTS                             │
└────────────────────────────────────────────────────────────────┘

Ctrl+Alt+D         Download Case from URL
Ctrl+Alt+I         Import Case from Local File
Ctrl+Alt+O         Open Case (show picker)
Ctrl+Alt+C         Show Cases List

(After selecting case in tree view)
Enter              Open case in workspace
Ctrl+Enter         Analyze all case logs
Shift+Enter        Open in new window
Delete             Delete case
F2                 Rename case
```

---

## Best Practices Workflow

```
┌────────────────────────────────────────────────────────────────┐
│              RECOMMENDED WORKFLOW                               │
└────────────────────────────────────────────────────────────────┘

1. ORGANIZE
   ├─ Use descriptive case names
   │  Example: "ACME-Corp-Network-Outage-2024-01-15"
   ├─ Add descriptions
   └─ Use consistent naming convention

2. IMPORT
   ├─ Download from URL (if available)
   ├─ Or import local archive
   └─ Wait for "ready" status

3. VERIFY
   ├─ Check log files discovered
   ├─ Review case details
   └─ Ensure all files present

4. ANALYZE
   ├─ Open case in workspace
   ├─ Run batch analysis
   └─ Review results in tree views

5. INVESTIGATE
   ├─ Use Results view to find issues
   ├─ Use Categories to group by component
   ├─ Use Timeline for chronological analysis
   └─ Cross-reference between files

6. DOCUMENT
   ├─ Export results
   ├─ Add to case documentation
   └─ Share findings

7. CLEANUP
   ├─ Delete old cases when done
   ├─ Keep important cases
   └─ Archive if needed
```

---

## Performance Considerations

```
┌────────────────────────────────────────────────────────────────┐
│                 PERFORMANCE & LIMITS                            │
└────────────────────────────────────────────────────────────────┘

Archive Size:
    Small (<10MB)      → Fast extraction (<5s)
    Medium (10-100MB)  → Normal extraction (5-30s)
    Large (100MB-1GB)  → Slower extraction (30s-2m)
    Very Large (>1GB)  → May require patience (>2m)

Log File Count:
    Few (<10 files)    → Instant discovery
    Many (10-100)      → Fast discovery (<5s)
    Lots (100-1000)    → May take time (5-30s)
    Huge (>1000)       → Consider filtering

Recommendations:
    ├─ Don't open too many cases at once
    ├─ Close cases you're not actively using
    ├─ Use batch analysis for multiple files
    └─ Clear cache periodically
```

---

**End of Workflow Diagram**