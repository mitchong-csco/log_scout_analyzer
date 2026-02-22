# 📋 Bundle Creation Cheat Sheet

## ⚡ Fastest Workflows

### 1. Quick Bundle from File (10 seconds!)
```
Right-click .log file → "Add to Bundle" → "Create New Bundle"
→ Press Enter × 3 (auto-fills everything!)
→ ✅ Done! File automatically added
```

### 2. Import QCSONE (15 seconds!)
```
Right-click .zip → "Import Log Package"
→ Press Enter × 2 (case ID auto-detected!)
→ ✅ Done! All logs imported
```

### 3. Empty Bundle (8 seconds)
```
Ctrl+Shift+P → "Scout: Create New Bundle"
→ Enter name → Press Enter × 2 to skip optional
→ ✅ Done!
```

---

## 🎯 Auto-Detection Magic

**Case IDs automatically detected from:**
- ✅ Filenames: `700440257_qcsone.zip` → 700440257
- ✅ Bundle names: "Case 700440257" → 700440257
- ✅ Active file: Open file with case ID in name

**Just press Enter to accept!**

---

## 👀 Status Bar Indicators

**Watch bottom-left corner:**

| Icon | Meaning |
|------|---------|
| ⭕ → ➕ | Creating bundle |
| ⭕ → 📦 | Extracting archive |
| ⭕ → ☁️ | Importing logs |
| ⭕ → 🔍 | Analyzing bundle |
| ✅ (green) | Success! |
| ❌ (red) | Error! |
| ⚠️ (yellow) | Warning! |

**Blinks while working, shows result, auto-hides**

---

## 💡 Pro Tips

1. **Skip Optional Fields**: Just press Enter
2. **Let Auto-Fill Work**: Open file with case ID first
3. **Check Output**: View → Output → "Log Scout"
4. **Use Action Buttons**: Click [Analyze] or [View Bundle]
5. **Empty States Help**: Bundles view shows what to do

---

## 🎹 Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Command Palette | `Ctrl+Shift+P` |
| Create Bundle | Type "create" in palette |
| Skip Field | Press `Enter` |
| Cancel | Press `Escape` |

---

## ✅ Validation Rules

- ❌ Bundle name **cannot be empty**
- ✅ Description is **optional** (press Enter)
- ✅ Case ID is **optional** (auto-filled if detected)

---

## 📊 Where to Find Info

| Location | What You See |
|----------|-------------|
| **Status Bar** (bottom-left) | Real-time progress |
| **Output Channel** | Detailed logs |
| **Bundles View** | All bundles & logs |
| **Notifications** | Success/error messages |

---

## 🔍 Common Patterns

### Pattern 1: File already open
```
1. Have file open: 700440257_cucm.log
2. Create Bundle → Case ID auto-filled!
3. Press Enter × 2
4. ✅ Bundle ready
```

### Pattern 2: QCSONE package
```
1. Right-click .zip
2. Import → Name suggested!
3. Press Enter × 2
4. Watch status bar: 📦 → ☁️ → ✅
```

### Pattern 3: Multiple logs
```
1. Create empty bundle first
2. For each log: Right-click → "Add to Bundle"
3. Select your bundle
4. ✅ All logs in one bundle
```

---

## ❓ Troubleshooting

**Q: Case ID not detected?**
→ Ensure filename has 9-10 digit number

**Q: File not added?**
→ Check Output channel for errors
→ Add manually: Right-click → "Add to Bundle"

**Q: Bundle name required?**
→ Cannot be empty (validation prevents this)

**Q: Status bar not showing?**
→ Check bottom-left corner
→ Extension must be activated

---

## 📢 Success Messages

You'll see these when things work:

```
✅ Bundle "Case 700440257" created successfully! (Case 700440257)
   [Add Logs]  [Analyze]

✅ Created bundle "Test" and added "cucm.log"
   [Analyze Bundle]

✅ Imported 45 files
   [Analyze Now]  [View Bundle]
```

**Click the buttons for quick actions!**

---

## 🎯 Remember

- **Status bar** = Real-time progress
- **Output channel** = Detailed logs
- **Press Enter** = Skip optional fields
- **Auto-detection** = Less typing
- **Action buttons** = Quick next steps

---

**Happy bundling! 🎉**