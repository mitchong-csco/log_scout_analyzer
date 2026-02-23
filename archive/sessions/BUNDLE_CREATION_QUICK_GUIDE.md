# 🚀 Bundle Creation Quick Reference Guide

## 🎯 Quick Start: 3 Ways to Create Bundles

### 1. Create Empty Bundle (Traditional)
```
Ctrl+Shift+P → "Scout: Create New Bundle"
→ Enter name (Case ID auto-detected if in active file!)
→ Optional: description (press Enter to skip)
→ Optional: case ID (auto-filled if detected)
→ ✅ Done! Add logs with right-click
```

### 2. Create Bundle + Add File (Fastest!) ⚡
```
Right-click .log file in editor
→ "Scout: Add to Bundle"
→ "$(add) Create New Bundle"
→ Name auto-suggested with case ID!
→ Press Enter × 2 to skip optional fields
→ ✅ Bundle created AND file added automatically!
```

### 3. Import QCSONE Package 📦
```
Right-click .zip file in Explorer
→ "Scout: Import Log Package"
→ Case ID auto-detected from filename!
→ Confirm name and case ID
→ ✅ Bundle created with all logs imported!
```

---

## 💡 Smart Case ID Detection

Case IDs are **automatically detected** from:

### Filenames
```
700440257_qcsone_download.zip → Case ID: 700440257 ✨
case_700440257.log            → Case ID: 700440257 ✨
INC-12345_cucm.log            → No case ID (you can add manually)
```

### Active File Context
```
Open: 700440257_cucm_sdi.log
Create Bundle → Case ID pre-filled: 700440257 ✨
```

### Bundle Name
```
Enter: "Case 700440257 - Presence Issue"
Case ID field → Auto-filled: 700440257 ✨
```

---

## 📢 What You'll See

### Success Messages
```
✅ Bundle "Case 700440257" created successfully! (Case 700440257)
   [Add Logs]  [Analyze]

✅ Created bundle "Test" and added "cucm.log"
   [Analyze Bundle]

✅ Added "file.log" to bundle "Case 700440257"
   [View Bundle]
```

### Output Channel (View → Output → Log Scout)
```
📦 Creating bundle: Case 700440257
   Description: Presence failure investigation
   Case ID: 700440257
✓ Bundle created successfully
   Bundle ID: bundle_1703012345_xyz789
   Next: Add log files to this bundle
```

### Empty States (Bundles View)
```
📦 No bundles yet
   Click "+" or use Command Palette: "Scout: Create New Bundle"

📄 No logs yet
   Right-click .log files and select 'Scout: Add to Bundle'
```

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Command Palette | `Ctrl+Shift+P` |
| Create New Bundle | `Ctrl+Shift+P` → type "create" |
| Right-click menu | Select file → Right-click |
| Skip optional field | Press `Enter` |
| Cancel dialog | Press `Escape` |

---

## ✅ Validation Rules

### Bundle Name
- ❌ Cannot be empty
- ❌ Cannot be only whitespace
- ✅ Can contain any characters
- ✅ Case ID patterns auto-detected

### Optional Fields
- Description: Press Enter to skip
- Case ID: Press Enter to skip (even if detected)

---

## 🎬 Example Workflows

### Quick Investigation
```
1. Open: 700440257_cucm_sdi.log
2. Right-click → "Add to Bundle" → "Create New Bundle"
3. Accept: "Case 700440257" (auto-filled)
4. Press Enter × 2 (skip description and case ID)
5. ✅ Done! Bundle created with file added
```

### Import from QCSONE
```
1. Download: 700440257_qcsone_download_selected.zip
2. Right-click .zip → "Scout: Import Log Package"
3. Accept: "Case 700440257" (auto-filled)
4. Confirm case ID: 700440257 (auto-filled)
5. ✅ Done! All logs extracted and imported
```

### Manual Entry
```
1. Ctrl+Shift+P → "Scout: Create New Bundle"
2. Enter: "INC-12345: Call Drop Investigation"
3. Description: "Random call drops in Site A"
4. Case ID: 700440257
5. ✅ Bundle created - add logs manually
```

---

## 🔍 Troubleshooting

### "Bundle name cannot be empty"
→ You must enter a name. Press Escape to cancel.

### "LSP client not available"
→ Wait a moment for extension to initialize.
→ Check Output → Log Scout Language Server

### Case ID not detected
→ Ensure filename contains 9-10 digit number
→ Example: 700440257_logs.zip ✅
→ Example: case123.zip ❌ (too short)

### File not added to bundle
→ Check Output channel for error details
→ Manually add: Right-click file → "Add to Bundle"

---

## 📊 Where to Find Information

### Output Channel
```
View → Output → Select "Log Scout" from dropdown
Shows: All actions, errors, and detailed logging
```

### Bundles View
```
Activity Bar → Scout icon
Shows: All bundles, log counts, services
```

### Notifications
```
Bottom-right corner
Shows: Success/error messages with action buttons
```

---

## 🎯 Tips & Tricks

### Tip 1: Let Case ID Auto-Fill
Open a file with case ID in filename before creating bundle!

### Tip 2: Skip Optional Fields Fast
Just press Enter twice to skip description and case ID.

### Tip 3: Check Output Channel
View → Output → Log Scout shows detailed progress.

### Tip 4: Use Action Buttons
Click [Analyze] or [View Bundle] in success messages.

### Tip 5: Name with Case ID
Include case ID in bundle name for auto-detection:
- "Case 700440257" ✅
- "700440257 - Issue" ✅
- "Test Bundle" → enter case ID manually

---

## 🆘 Need Help?

1. **Check Output Channel**: View → Output → "Log Scout"
2. **Look for 📦 ✓ ✗ symbols** to trace actions
3. **Empty states** in Bundles view have instructions
4. **Hover tooltips** on bundle items show details
5. **Error messages** include actionable information

---

## 📚 Related Commands

| Command | What It Does |
|---------|--------------|
| Scout: Create New Bundle | Create empty bundle |
| Scout: Import Log Package | Import QCSONE .zip |
| Scout: Add to Bundle | Add file to existing or new bundle |
| Scout: Analyze Bundle | Run analysis on bundle |
| Scout: Refresh Bundles | Reload bundle list |
| Scout: Delete Bundle | Remove bundle |

---

## 🎉 What's New?

✨ **Case ID Auto-Detection**: Finds case IDs in filenames
✨ **Auto-Add Files**: Creating bundle from "Add to Bundle" adds file
✨ **Clear Skip Instructions**: "press Enter to skip" on optional fields
✨ **Input Validation**: Cannot create bundle with empty name
✨ **Better Messages**: Success/error messages with emoji and actions
✨ **Output Logging**: Every action logged to Output channel
✨ **Empty State Help**: Bundles view guides you on what to do next

---

## 💪 Power User Workflow

```
1. Download QCSONE package: 700440257_qcsone_download.zip
2. Right-click → "Import Log Package"
3. Press Enter (accept auto-filled name)
4. Press Enter (accept case ID)
5. Wait for import → Click [Analyze Now]
6. ✅ Full analysis in < 30 seconds!
```

---

**Remember**: Check the Output channel (View → Output → Log Scout) for detailed information about every action! 📊