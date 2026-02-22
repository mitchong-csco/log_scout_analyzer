# 🔍 Import Progress Troubleshooting Guide

## 📊 Where to Find Import Progress

When importing a log package (QCSONE .zip files), progress information is shown in **multiple places**:

---

## 1. Status Bar (Bottom-Left Corner) 📍

**Location**: Bottom-left corner of VS Code window

**What You'll See**:
```
⭕ → 📦 Extracting 700440257_qcsone.zip       (blinks during extraction)
⭕ → ☁️ Importing logs from 700440257...      (blinks during import)
✅ Imported 45 files                           (green flash when complete)
```

**Status**: Always visible while operation is running

---

## 2. Output Channel: "Log Scout Analyzer" 📝

**How to Open**:
1. View → Output (or `Ctrl+Shift+U`)
2. Select **"Log Scout Analyzer"** from dropdown

**What You'll See**:
```
📦 Importing log package: 700440257_qcsone_download_selected.zip
   Detected case ID: 700440257
   Bundle name: Case 700440257
   Case ID: 700440257
   Starting extraction and import...
   💡 Tip: Check "Log Scout Language Server" output for detailed progress
   Phase 1: Extracting archive...
   Phase 2: Importing log files...
   This may take a while for large packages...
   💡 Watch "Log Scout Language Server" output channel for file-by-file progress
   Still importing... (3s elapsed)
   Still importing... (6s elapsed)
   Still importing... (9s elapsed)
   ...
   ✓ Import completed!
   ✓ Bundle created successfully
      Imported: 45/50 files
      Services detected:
         • cucm: 12 log(s)
         • imp: 8 log(s)
         • tomcat: 25 log(s)
```

---

## 3. Output Channel: "Log Scout Language Server" 🔧

**How to Open**:
1. View → Output (or `Ctrl+Shift+U`)
2. Select **"Log Scout Language Server"** from dropdown

**What You'll See** (detailed file-by-file progress):
```
[INFO] Extracting archive: 700440257_qcsone_download_selected.zip
[INFO] Found 50 files in archive
[INFO] Extracting: cucm/sdi/cucm01_sdi.log
[INFO] Extracting: cucm/sdi/cucm02_sdi.log
[INFO] Extracting: imp/imp01.log
[INFO] Processing nested archive: nested_logs.zip
[INFO] Importing file: cucm01_sdi.log (1/50)
[INFO] Detected service: cucm
[INFO] Importing file: cucm02_sdi.log (2/50)
[INFO] Detected service: cucm
...
[INFO] Import completed: 45/50 files successfully imported
```

**Note**: This is the MOST DETAILED output showing exactly what's happening!

---

## 4. Notification Progress Bar 🔔

**Location**: Bottom-right corner

**What You'll See**:
```
┌────────────────────────────────────┐
│ Importing 700440257_qcsone.zip    │
│ Importing log files...            │
│ [==========>          ] 45%       │
└────────────────────────────────────┘
```

---

## ⚠️ If Import Seems Stuck

### Step 1: Check Status Bar
- Look at **bottom-left corner**
- Is the icon still blinking? → It's working
- Is it showing an error (❌)? → Check Output for details

### Step 2: Check "Log Scout Analyzer" Output
1. View → Output
2. Select "Log Scout Analyzer"
3. Look for:
   - "Still importing... (Xs elapsed)" messages
   - Any error messages (✗)

### Step 3: Check "Log Scout Language Server" Output
1. View → Output
2. Select **"Log Scout Language Server"** ← **This is key!**
3. Look for:
   - File-by-file processing
   - Any stuck operations
   - Error messages

### Step 4: Look for These Messages

**Good Signs (Import is working)**:
```
Still importing... (3s elapsed)
Still importing... (6s elapsed)
[INFO] Importing file: cucm01_sdi.log (1/50)
[INFO] Importing file: cucm02_sdi.log (2/50)
```

**Warning Signs (Import may be stuck)**:
```
Still importing... (90s elapsed)
Still importing... (120s elapsed)
[No new messages in Language Server output for 30+ seconds]
```

---

## 🐛 Common Issues

### Issue 1: "I see status bar blinking but no progress"
**Solution**: Check "Log Scout Language Server" output channel

### Issue 2: "No messages after 'Phase 2: Importing log files...'"
**Solution**: 
1. Switch to "Log Scout Language Server" output
2. That's where the actual file-by-file progress appears

### Issue 3: "Import seems stuck at same percentage"
**Solution**:
1. Large files take time to process
2. Check "Log Scout Language Server" to see which file is being processed
3. Wait 30-60 seconds for large files (10+ MB)

### Issue 4: "Can't find 'Log Scout Language Server' output"
**Solution**:
1. View → Output
2. Click dropdown at top-right that says "Log Scout Analyzer"
3. Select **"Log Scout Language Server"** from list
4. If not there, LSP server may not have started - check extension activated

---

## 📋 Expected Import Times

| Package Size | Files | Expected Time |
|--------------|-------|---------------|
| Small (<10 MB) | 10-20 files | 5-15 seconds |
| Medium (10-50 MB) | 20-50 files | 15-60 seconds |
| Large (50-200 MB) | 50-100 files | 1-3 minutes |
| Very Large (>200 MB) | 100+ files | 3-10 minutes |

**Note**: Nested archives add extra time for extraction

---

## ✅ Healthy Import Progress Example

**Timeline View**:
```
00:00  User: Right-click .zip → "Import Log Package"
00:01  Status Bar: ⭕ → 📦 Extracting...
       Output (Analyzer): Phase 1: Extracting archive...
       Output (LSP): [INFO] Extracting archive: ...
       
00:10  Status Bar: ⭕ → ☁️ Importing logs...
       Output (Analyzer): Phase 2: Importing log files...
       Output (LSP): [INFO] Importing file: cucm01.log (1/50)
       
00:13  Output (Analyzer): Still importing... (3s elapsed)
       Output (LSP): [INFO] Importing file: cucm02.log (2/50)
       
00:16  Output (Analyzer): Still importing... (6s elapsed)
       Output (LSP): [INFO] Importing file: imp01.log (3/50)
       
00:30  Output (LSP): [INFO] Importing file: cucm12.log (45/50)
       
00:35  Status Bar: ✅ Imported 45 files [GREEN]
       Output (Analyzer): ✓ Import completed!
       Output (LSP): [INFO] Import completed: 45/50 files
```

---

## 🎯 Quick Checklist

When import seems stuck:

- [ ] Check status bar (bottom-left) - is icon still blinking?
- [ ] Check "Log Scout Analyzer" output - any "Still importing..." messages?
- [ ] Check "Log Scout Language Server" output - file-by-file progress?
- [ ] Wait at least 60 seconds for large files
- [ ] Check for error messages (❌ or ✗)
- [ ] Verify extension is activated (LSP connected)

---

## 💡 Pro Tips

1. **Always check both output channels**:
   - "Log Scout Analyzer" = high-level progress
   - "Log Scout Language Server" = detailed file-by-file progress

2. **Status bar blinks = it's working**:
   - Blinking icons mean operation is active
   - If stuck, icon would stop blinking

3. **Large packages take time**:
   - Be patient with 50+ file packages
   - Each file is extracted, validated, and indexed

4. **Nested archives are slower**:
   - Archives containing more archives need double extraction
   - Check LSP output for "Processing nested archive" messages

---

## 🆘 Still Stuck?

If import is genuinely stuck (no progress for 5+ minutes):

1. **Check LSP Server Status**:
   - View → Output → "Log Scout Language Server"
   - Look for recent activity

2. **Check for Errors**:
   - Red ❌ in status bar
   - Error messages in output channels

3. **Try Canceling and Retrying**:
   - Close VS Code
   - Reopen and try import again

4. **Check Disk Space**:
   - Imports extract to `.log-scout` folder
   - Ensure sufficient disk space

5. **Check File Locks**:
   - Close other programs that might lock files
   - Temporarily disable antivirus if scanning files

---

## 📚 Summary

**Two Output Channels = Two Levels of Detail**

| Channel | Detail Level | Shows |
|---------|-------------|-------|
| **Log Scout Analyzer** | High-level | Phases, elapsed time |
| **Log Scout Language Server** | File-by-file | Which file being processed |

**Always check BOTH channels to see full picture!**

---

**Remember**: The "Log Scout Language Server" output channel is where the detailed file-by-file import progress appears! 🔍