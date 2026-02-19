# 🚀 Quick Start: Test Bundle Import Feature

**Time to Test**: 5 minutes  
**What You'll Test**: QCSONE Package Import with Archive Extraction

---

## 🎯 What You're Testing

The "Scout: Import Log Package (QCSONE)" feature that:
- ✅ Extracts ZIP/TAR archives (including nested archives)
- ✅ Auto-detects case IDs from filenames
- ✅ Filters log files automatically
- ✅ Creates bundles with organized logs
- ✅ Auto-detects services per log file

**Status**: Implementation complete, ready for testing!

---

## 📦 What You Need

1. **VSCode** with a workspace folder open
2. **Test ZIP file** (any of these):
   - QCSONE package: `700440257_qcsone_download_selected.zip`
   - Generic ZIP with logs: `my-logs.zip`
   - ZIP with nested archives (bonus test)

3. **Extension** (already installed):
   - Binary: `vscode-extension/bin/log-scout-lsp-server-win.exe` (✅ Updated Feb 19)
   - Extension: Version 0.0.162

---

## ⚡ Quick Test (2 minutes)

### Step 1: Open Workspace
```bash
# Open any folder in VSCode (or use existing workspace)
code /path/to/test-folder
```

### Step 2: Check Extension is Ready
1. Look at bottom status bar
2. Should show: "Log Scout Analyzer" (no errors)
3. If you see errors, restart VSCode

### Step 3: Import a Package

**Option A: Right-Click Method**
1. Right-click any `.zip` file in Explorer
2. Select "Scout: Import Log Package (QCSONE)"
3. Wait for progress notification

**Option B: Command Palette**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Scout: Import Log Package"
3. Select the command
4. Choose a ZIP file
5. Wait for completion

### Step 4: Verify Success ✅

**You should see:**
```
✅ Bundle Created Successfully!

📋 Case: 700440257 (if QCSONE package)
📦 Imported: 47/52 files

[Open Bundle]  [Analyze Now]
```

**In Bundle Explorer:**
- New bundle appears (e.g., "Case 700440257")
- Expand to see imported logs
- Each log shows service type and size

**Expected Time:**
- Small ZIP (<10 MB): ~5 seconds
- Medium ZIP (10-50 MB): ~15 seconds
- Large ZIP (>50 MB): ~60 seconds

---

## ✅ Success Checklist

Quick checks to confirm it works:

- [ ] Progress notification appeared
- [ ] Success message showed
- [ ] Bundle appears in Bundle Explorer
- [ ] Bundle name looks correct
- [ ] Logs are organized under bundle
- [ ] Log files show service types
- [ ] No error messages

**If all checked: 🎉 Feature works!**

---

## ❌ If Something Goes Wrong

### Error: "LSP client not available"
**Fix**: 
```bash
# Restart VSCode
# Ensure workspace folder is open
```

### Error: "Bundle manager not initialized"
**Fix**:
```bash
# Check Output panel: View → Output → "Log Scout Analyzer"
# Look for: "Bundle manager initialized successfully"
# If missing, restart VSCode and wait 5-10 seconds
```

### Error: "Import failed"
**Check**:
```bash
# Output panel (View → Output → "Log Scout Analyzer")
# Look for error messages starting with "Import failed: ..."
# Common causes:
# - Corrupted ZIP file
# - No read permissions
# - No log files in archive
```

### Nothing Happens
**Troubleshooting**:
1. Check Output panel for any errors
2. Verify workspace folder is open
3. Check ZIP file is accessible
4. Try Command Palette method instead
5. Restart VSCode

---

## 🔍 Where to Look

### Bundle Files
```bash
# Check bundle was created
ls .log-scout/bundles/

# View bundle metadata
cat .log-scout/bundles/bundle_*/bundle.json
```

### LSP Server Logs
1. View → Output
2. Select "Log Scout Analyzer" from dropdown
3. Look for:
   - "Importing log package: ..."
   - "Extracted N files from archive"
   - "Import complete: X files"

### Bundle Explorer
1. Look at left sidebar
2. Find "BUNDLES" section (might need to expand)
3. Your new bundle should be listed
4. Expand to see logs

---

## 🎨 What Should Happen (Detailed)

### 1. When You Trigger Import
```
▶ Progress notification appears:
  "Importing 700440257_qcsone_download_selected.zip"
  "Extracting archive (including nested archives)..."
```

### 2. Behind the Scenes
```
Extension → LSP Server → BundleManager
  ↓
Create temp dir: /tmp/log-scout-import-{uuid}
  ↓
Extract archive (recursive if nested)
  ↓
Filter: Keep .log, .txt, .out files only
  ↓
Detect case ID: "700440257" from filename
  ↓
Create bundle: "Case 700440257"
  ↓
For each log file:
  - Auto-detect service (Jabber, CUCM, etc.)
  - Count lines
  - Get file size
  - Add to bundle
  ↓
Cleanup temp directory
  ↓
Return result
```

### 3. Success Popup
```
✅ Bundle Created Successfully!

📋 Case: 700440257
📦 Imported: 47/52 files

[Open Bundle]  [Analyze Now]
```

### 4. Bundle Explorer Updates
```
BUNDLES
  └─ 📦 Case 700440257 (47 logs)
       ├─ 📄 jabber.log (Jabber • 2.3 MB)
       ├─ 📄 cucm.log (CUCM • 1.8 MB)
       └─ 📄 debug.txt (Unknown • 456 KB)
```

---

## 🧪 Bonus Tests (Optional, 5 minutes)

### Test 1: Nested Archives
Create a ZIP containing another ZIP:
```bash
# outer.zip contains inner.zip contains logs
# Import outer.zip
# Verify logs from inner.zip are imported too
```

### Test 2: Mixed File Types
Create a ZIP with:
- `app.log` (should import)
- `data.json` (should skip)
- `debug.txt` (should import)
- `readme.md` (should skip)

Import and verify only log files added.

### Test 3: No Case ID
Import a ZIP named `my-logs.zip` (no numeric prefix)
- Bundle name should be "Import my-logs"
- No case ID in metadata
- Should still work!

### Test 4: Large Archive
Import a ZIP with 100+ log files
- Should complete in <60 seconds
- All files imported
- No timeout errors

---

## 📊 Quick Performance Check

Time your import and compare:

| Archive Size | Expected Time | Your Time |
|--------------|---------------|-----------|
| <10 MB       | <5 seconds    | _____ sec |
| 10-50 MB     | <15 seconds   | _____ sec |
| >50 MB       | <60 seconds   | _____ sec |

---

## ✅ Test Complete!

If you got the success message and see bundles in Explorer:
### 🎉 **FEATURE WORKS!**

**Next Steps**:
1. ✅ Mark feature as tested
2. ✅ Use it for real QCSONE packages
3. ✅ Enjoy automated log organization!

**Found Issues?**
- See `TESTING_CHECKLIST.md` for detailed testing
- File bug report with logs from Output panel

---

## 🆘 Get Help

### View Full Logs
```bash
# Output panel
View → Output → "Log Scout Analyzer"

# Look for:
"Importing log package: /path/to/file.zip"
"Extracting to temp directory: /tmp/log-scout-import-xyz"
"Extracted 52 files from archive"
"Found 47 log files"
"Created bundle bundle_abc for import"
"Added log file: /tmp/.../jabber.log"
"Import complete: 47 of 47 log files added to bundle"
```

### Common Log Messages

**Success Messages**:
```
✓ Bundle manager initialized successfully
✓ Importing log package: ...
✓ Import complete: X files
```

**Warning Messages** (Usually OK):
```
⚠ Failed to add {file}: ... (some files may not be logs)
⚠ Failed to clean up temp directory (cleanup will happen on restart)
```

**Error Messages** (Needs Attention):
```
✗ Import failed: Failed to extract archive: ...
✗ Bundle manager not initialized
✗ LSP client not available
```

---

## 📝 Quick Feedback

After testing, please note:

**What Worked**:
- [ ] Import completed successfully
- [ ] Bundle appeared in Explorer
- [ ] Service detection worked
- [ ] Performance was good

**What Didn't Work**:
- [ ] Error message: _______________
- [ ] Performance issue: _______________
- [ ] UI issue: _______________

**Suggestions**:
- ___________________________________
- ___________________________________

---

## 🎓 Understanding the Feature

### What Gets Imported?
- ✅ `.log` files
- ✅ `.txt` files
- ✅ `.out` files
- ✅ `.err` files
- ✅ Files with "log" in name
- ❌ JSON, XML, PDF, images, etc.

### Case ID Detection
Pattern: `{9+ digits}_anything.zip`
- `700440257_qcsone_download_selected.zip` → Case ID: 700440257 ✅
- `12345_logs.zip` → Too short, no case ID ❌
- `logs_backup.zip` → No numeric prefix, no case ID ❌

### Service Detection
Automatic based on filename and content:
- `jabber*.log`, `cstartup.log` → Jabber
- `ccm*.log`, `cucm*.log` → CUCM
- `cup*.log`, `tomcat*.log` → CUP
- Others → Unknown (still imported!)

### Nested Archives
If `outer.zip` contains `inner.zip`:
- Both extracted automatically
- Logs from both added to bundle
- No extra steps needed!

---

**Time to Test**: 5 minutes  
**Difficulty**: Easy  
**Fun Factor**: 🎉🎉🎉

**Ready? Let's test!** 🚀