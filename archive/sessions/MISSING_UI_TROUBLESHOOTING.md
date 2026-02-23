# 🔍 MISSING UI TROUBLESHOOTING GUIDE

**Version**: 0.0.157  
**Issue**: UI components not showing  
**Date**: February 18, 2026  

---

## 🎯 WHAT SHOULD BE VISIBLE

Based on `package.json`, you should see **TWO activity bar icons** in VS Code:

### **1. Scout Analyzer Icon** 🔭 (telescope)
Should contain 6 views:
- **Results** - Pattern detection results
- **Filters** - Filter by severity/category  
- **Categories** - Group by category
- **Analyzer** - Quick actions panel
- **Pattern Overrides** - Custom pattern management
- **Bundles** ⭐ - Log bundle management (NEW)

### **2. Scout Toolkit Icon** 🔌 (circuit-board)
Secondary tools panel

---

## ✅ DIAGNOSTIC STEPS

### **Step 1: Check Extension Is Running**

1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type: `Developer: Show Running Extensions`
4. Look for: **Log Scout Analyzer - DevTools Edition**
5. Status should be: **Activated**

**If NOT activated**:
- Check Output panel (`View` → `Output`)
- Select: `Log Scout Analyzer` from dropdown
- Look for activation errors

---

### **Step 2: Check Activity Bar**

Look at the **left sidebar** in VS Code:

```
┌─────────┐
│  📁     │ ← Explorer
│  🔍     │ ← Search  
│  🔀     │ ← Source Control
│  🐞     │ ← Run & Debug
│  🧩     │ ← Extensions
│  🔭     │ ← **Scout Analyzer** (should be here!)
│  🔌     │ ← **Scout Toolkit** (should be here!)
└─────────┘
```

**If icons missing**:
- Extension may not be activated
- Check for TypeScript errors in build

---

### **Step 3: Check LSP Server**

The LSP server must be running for bundles to work:

1. Open Output panel: `View` → `Output`
2. Select: `Log Scout Analyzer`
3. Look for:
   ```
   ✓ LSP client connected
   🔧 LSP Server: Log Scout LSP v0.1.10
   ✓ TagScout pattern engine ready
   ```

**If you see**:
```
⚠ LSP client failed to start - using fallback patterns
```

**Problem**: LSP binary not found or failed to start

**Fix**:
1. Check binary exists: `vscode-extension\bin\log-scout-lsp-server-win.exe`
2. Run: `npm:lsp` task to rebuild

---

### **Step 4: Force Show Views**

If views exist but are hidden:

1. Click Scout Analyzer icon (🔭)
2. Right-click in sidebar
3. Select: **Reset View Locations**

Or manually show views:
1. `View` → `Open View...`
2. Search: "Scout"
3. Select each view to open

---

### **Step 5: Check Binary Exists**

```cmd
dir vscode-extension\bin\log-scout-lsp-server-win.exe
```

**Should see**:
```
log-scout-lsp-server-win.exe  (several MB)
```

**If missing**:
```
Run: npm:lsp task in Zed
Or:  cd vscode-extension && npm run build:lsp
```

---

### **Step 6: Check TypeScript Compilation**

1. Open `vscode-extension\out\extension.js`
2. Check file size > 0
3. Search for: `scoutBundles`

**If file is empty or corrupted**:
```
Run: npm:ext task in Zed
Or:  cd vscode-extension && npm run build
```

---

## 🐛 COMMON ISSUES

### **Issue 1: "No views visible"**

**Cause**: Views are collapsed or hidden

**Fix**:
1. Click Scout Analyzer icon in activity bar
2. Look for collapsed sections
3. Click `>` arrows to expand
4. Or right-click → **Reset View Locations**

---

### **Issue 2: "LSP server not starting"**

**Symptoms**:
- Bundles view empty
- No pattern detection
- Output shows LSP failed

**Fix**:
```cmd
# Rebuild LSP server
cd vscode-extension
npm run build:lsp

# Check it worked
dir bin\log-scout-lsp-server-win.exe

# Reload extension
Ctrl+Shift+P → Developer: Reload Window
```

---

### **Issue 3: "Extension activated but no UI"**

**Cause**: TypeScript compilation errors

**Fix**:
```cmd
# Check for errors
cd vscode-extension
npm run build 2>&1 | findstr "error"

# If errors found, check build log
code ..\build_logs\build_latest.md

# Rebuild clean
npm run build
```

---

### **Issue 4: "Bundles view empty"**

**Cause**: No bundles created yet OR LSP not connected

**Fix**:
1. Check LSP connected (see Step 3)
2. Create a test bundle:
   - `Ctrl+Shift+P`
   - Type: `Scout: Create New Bundle`
   - Enter name: `Test Bundle`
3. Bundles view should now show the bundle

---

## 🔧 QUICK FIX CHECKLIST

Try these in order:

1. **Reload Window**
   ```
   Ctrl+Shift+P → Developer: Reload Window
   ```

2. **Check Extension Output**
   ```
   View → Output → Log Scout Analyzer
   ```

3. **Verify LSP Binary**
   ```cmd
   dir vscode-extension\bin\*.exe
   ```

4. **Rebuild Everything**
   ```
   Ctrl+Shift+P (in Zed) → task spawn → npm:deploy
   ```

5. **Reinstall Extension**
   ```cmd
   code --uninstall-extension log-scout-team.log-scout-analyzer
   code --install-extension vscode-extension\vsix\log-scout-analyzer.vsix --force
   ```

6. **Check VS Code Version**
   ```
   Help → About
   Should be: VS Code 1.75.0 or higher
   ```

---

## 📊 WHAT TO CHECK IN OUTPUT

Open `View` → `Output` → `Log Scout Analyzer`

### **Good Output** ✅
```
╔════════════════════════════════════════╗
║   LOG SCOUT ANALYZER ACTIVATED        ║
╚════════════════════════════════════════╝

📦 Version: 0.0.157
🔨 Build: 2026-02-18T...
⏰ Loaded: ...

✓ LSP client connected
🔧 LSP Server: Log Scout LSP v0.1.10
✓ TagScout pattern engine ready
✓ Pattern Overrides view initialized
✓ Bundle view initialized
```

### **Bad Output** ❌
```
╔════════════════════════════════════════╗
║   LOG SCOUT ANALYZER ACTIVATED        ║
╚════════════════════════════════════════╝

⚠ LSP client failed to start
Error: Binary not found
```

---

## 🎯 MOST LIKELY CAUSE

Based on "missing a lot of UI", the most likely issues are:

1. **Views are collapsed** - Click Scout Analyzer icon and expand
2. **LSP server not running** - Binary missing or failed to start
3. **Extension partially activated** - TypeScript errors during build

---

## 🚀 QUICK FIX (Try This First!)

```cmd
# 1. Rebuild everything
cd vscode-extension
npm run deploy

# 2. Reload VS Code
# In VS Code: Ctrl+Shift+P → Developer: Reload Window

# 3. Check Scout Analyzer icon in activity bar (left sidebar)

# 4. Click it and expand all views
```

---

## 📝 WHAT TO REPORT BACK

If still broken, tell me:

1. **What you see**:
   - Scout Analyzer icon visible? Yes/No
   - How many views show up? (should be 6)
   - Which views are missing?

2. **From Output panel** (`Log Scout Analyzer`):
   - Does it say "ACTIVATED"?
   - Does it say "LSP client connected"?
   - Any errors?

3. **Binary exists**:
   ```cmd
   dir vscode-extension\bin\log-scout-lsp-server-win.exe
   ```
   Does file exist? Size?

---

## ✅ EXPECTED UI (Version 0.0.157)

After activation, you should see:

**Activity Bar** (left side):
- 🔭 Scout Analyzer icon

**Scout Analyzer Views** (when icon clicked):
1. **Results** - Shows pattern matches
2. **Filters** - Filter by severity
3. **Categories** - Group results
4. **Analyzer** - Quick actions
5. **Pattern Overrides** - Custom patterns
6. **Bundles** - Bundle management ⭐

**Command Palette** (`Ctrl+Shift+P` → type "Scout"):
- Scout: Create New Bundle
- Scout: Import Log Package (QCSONE)
- Scout: Add to Bundle
- Scout: Analyze Bundle
- ... etc

---

**Try the Quick Fix above and report back what you see!** 🔍
