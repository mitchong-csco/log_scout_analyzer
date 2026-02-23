# Quick Test Guide - Async Import Feature 🚀

## ✅ Extension Installed Successfully!

The async import feature is now installed in VS Code. Follow these steps to test it.

---

## 🔥 Quick Test (5 minutes)

### Step 1: Reload VS Code (REQUIRED)

```
Ctrl+Shift+P → "Developer: Reload Window"
```

**Important**: You MUST reload VS Code for the new command to appear!

---

### Step 2: Generate Test Archive

Open a terminal in the `log_scout_analyzer` directory and run:

```bash
.\generate-test-archives.bat
```

This creates test archives in `test-data\` directory.

---

### Step 3: Import Archive

In VS Code, open Command Palette:

```
Ctrl+Shift+P → Type "Scout: Import Log Archive"
```

**If you don't see the command**:
- Make sure you reloaded VS Code (Step 1)
- Try typing just "import" or "archive"
- Check the extension is enabled: Extensions → Log Scout Analyzer

Select the test archive:
```
test-data\small-test.zip
```

---

### Step 4: Watch for Progress

Look at the **Bundles** view in the Activity Bar (left sidebar):

You should see:
```
📦 Importing small-test.zip...
⏳ 0% Starting... (0s)
```

Then watch it update:
```
📦 Importing small-test.zip...
⏳ 5% Extracting archive... (2s)
```

```
📦 Importing small-test.zip...
⏳ 50% Creating bundle... (5s)
```

```
📦 Case 700440257
├─ 📄 app-1.log
├─ 📄 app-2.log
└─ ... (8 more files)
```

---

### Step 5: Verify Success

You should see:
- ✅ Success notification: "Successfully imported X log files"
- ✅ Real bundle appears in tree
- ✅ Spinner bundle disappears
- ✅ Total time: ~3-8 seconds

---

## 🐛 Troubleshooting

### Command Not Found

**Symptom**: "Scout: Import Log Archive" doesn't appear in Command Palette

**Solutions**:
1. Reload VS Code: `Ctrl+Shift+P → "Developer: Reload Window"`
2. Check extension is installed: `Ctrl+Shift+X → Search "Log Scout"`
3. Check extension is enabled (not disabled)
4. Try reinstalling:
   ```bash
   code --install-extension vscode-extension/log-scout-analyzer-0.0.169.vsix --force
   ```

---

### No Bundles View

**Symptom**: Can't find Bundles view in sidebar

**Solutions**:
1. Click the Log Scout icon in Activity Bar (left sidebar)
2. If no icon, go to: `View → Open View... → "Scout Bundles"`
3. Check workspace folder is open (File → Open Folder)

---

### Import Fails

**Symptom**: Error message appears, no bundle created

**Solutions**:
1. Check LSP server is running: Look for "Log Scout LSP" in Output panel
2. Check archive file exists and is readable
3. Check archive format is supported (.zip, .tar, .gz, .tgz)
4. Check LSP logs: `%USERPROFILE%\.log-scout-analyzer\lsp-server-*.log`

---

### No Progress Updates

**Symptom**: Bundle shows "0% Starting..." forever

**Solutions**:
1. Check LSP server logs for errors
2. Verify LSP server version is correct:
   ```bash
   vscode-extension\server\log-scout-lsp-server.exe --version
   ```
3. Restart LSP: `Ctrl+Shift+P → "Restart LSP Server"`

---

## 📊 Monitor Progress (Optional)

### Option 1: Watch LSP Logs

Open another terminal and run:
```bash
.\monitor-import-logs.bat
```

This shows real-time LSP server activity.

---

### Option 2: VS Code Output Panel

```
View → Output → Select "Log Scout Analyzer" from dropdown
```

---

## 🧪 Full Test Suite

For comprehensive testing, run:

```bash
.\test-async-import.bat all
```

This guides you through:
1. Generating test archives
2. Manual import testing
3. Log analysis
4. Report generation

---

## ✨ What You Should See

### Immediate Feedback (< 1ms)
```
📦 Importing archive.zip...
⏳ 0% Starting... (0s)
```

### Progress Updates (every 2-5s)
```
⏳ 5% Extracting archive... (2s)
⏳ 20% Extracting: 50/250 files (7s)
⏳ 50% Creating bundle... (17s)
⏳ 75% Adding logs: 30/47 (35s)
```

### Completion
```
📦 Case 700440257
├─ 📄 jabber.log (5.2 MB)
├─ 📄 webex.log (12.8 MB)
└─ ... (45 more files)

✅ Successfully imported 47 log files to Case 700440257
```

---

## 📝 Test Checklist

- [ ] Reloaded VS Code window
- [ ] Generated test archives
- [ ] Found "Scout: Import Log Archive" command
- [ ] Selected small-test.zip
- [ ] Bundle appeared instantly with spinner
- [ ] Progress updates appeared every few seconds
- [ ] Real bundle replaced spinner
- [ ] Success notification appeared
- [ ] Import completed in ~3-8 seconds

---

## 🎯 Expected Performance

| Archive | Time | Result |
|---------|------|--------|
| small-test.zip | 3-8s | ✅ 10 files |
| medium-test.zip | 15-45s | ✅ 50 files |
| 700440257_qcsone... | 10-20s | ✅ "Case 700440257" |
| large-test.zip | 1-5min | ✅ 200 files |

---

## 🚀 Next Steps

### Test QCSONE Package
```
Ctrl+Shift+P → "Scout: Import Log Archive"
→ Select: test-data\700440257_qcsone_download_selected.zip
```

Expected: Bundle named "Case 700440257"

### Test Concurrent Imports
1. Start import: medium-test.zip
2. Immediately start import: small-test.zip
3. Both should show independent progress

### Test Error Handling
```
Import: test-data\invalid-archive.zip
```

Expected: Error notification, no partial bundle

---

## 📚 Documentation

- **BUNDLE_IMPORT_STAGES.md** - Detailed stage breakdown
- **IMPORT_FLOW_DIAGRAM.md** - Visual timeline
- **ASYNC_IMPORT_TESTING.md** - Comprehensive testing
- **ASYNC_IMPORT_COMPLETE.md** - Deployment summary

---

## 🆘 Need Help?

### Check Logs
```
LSP Server: %USERPROFILE%\.log-scout-analyzer\lsp-server-*.log
Extension:  View → Output → Log Scout Analyzer
```

### Analyze Test Results
```bash
powershell -ExecutionPolicy Bypass -File analyze-import-test.ps1
```

### Full Test Suite
```bash
.\test-async-import.bat all
```

---

## ✅ Success Criteria

**Feature is working if**:
- ✅ Command appears in Command Palette
- ✅ Bundle appears instantly (< 1ms)
- ✅ Progress updates show every 2-5 seconds
- ✅ Import completes successfully
- ✅ Success notification appears
- ✅ UI stays responsive during import

---

## 🎉 You're Ready!

The async import feature is fully deployed and ready to test.

**Start now**: `Ctrl+Shift+P → "Scout: Import Log Archive"`

Good luck! 🚀