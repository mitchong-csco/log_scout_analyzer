# VS Code Icons Reference - Zip/Archive/Import Related

**VS Code Icon Set**: Codicons  
**Reference**: https://microsoft.github.io/vscode-codicons/dist/codicon.html

---

## 📦 Archive & Package Icons

| Icon | Code | Description | Use Case |
|------|------|-------------|----------|
| 📦 | `$(archive)` | Archive/package box | Bundle, archive files |
| 📄 | `$(file-zip)` | Zip file | Compressed files, .zip |
| 📦 | `$(package)` | Package/box | Software packages, npm |
| 🗜️ | `$(file-binary)` | Binary file | Compiled/binary files |
| 📚 | `$(library)` | Library | Collection of files |

---

## 📥 Import & Download Icons

| Icon | Code | Description | Use Case |
|------|------|-------------|----------|
| ⬇️ | `$(cloud-download)` | Cloud download | Download from cloud/server |
| ⬇️ | `$(desktop-download)` | Desktop download | Download to local |
| 📥 | `$(inbox)` | Inbox | Receive/import |
| 📂 | `$(folder-opened)` | Open folder | Browse/import from folder |
| 🗂️ | `$(folder-library)` | Library folder | Import library |
| ↓ | `$(arrow-down)` | Arrow down | Download/import action |
| ⤵️ | `$(arrow-circle-down)` | Circle arrow down | Download action |

---

## 📂 Folder Icons

| Icon | Code | Description | Use Case |
|------|------|-------------|----------|
| 📁 | `$(folder)` | Closed folder | Directory |
| 📂 | `$(folder-opened)` | Open folder | Active directory |
| 🗂️ | `$(folder-library)` | Library folder | Special collection |
| 📋 | `$(files)` | Multiple files | File collection |

---

## ➕ Add & Create Icons

| Icon | Code | Description | Use Case |
|------|------|-------------|----------|
| ➕ | `$(add)` | Plus/add | Create new, add item |
| ✨ | `$(sparkle)` | Sparkle | New/create (fancy) |
| 📝 | `$(new-file)` | New file | Create file |
| 📁 | `$(new-folder)` | New folder | Create folder |
| ➕ | `$(plus)` | Plus symbol | Add action |

---

## 🔄 Extract & Unpack Icons

**Note**: VS Code doesn't have a dedicated "unzip" or "extract" icon. Here are the closest alternatives:

| Icon | Code | Description | Use Case |
|------|------|-------------|----------|
| 🔓 | `$(unlock)` | Unlock | Open/extract archive |
| 📤 | `$(export)` | Export | Extract/export files |
| 📂 | `$(folder-opened)` | Open folder | Opened/extracted |
| ↗️ | `$(arrow-up-right)` | Arrow up-right | Extract out |
| 🔀 | `$(git-pull-request)` | Pull request | Import/merge |
| 🗜️ | `$(file-binary)` | Binary file | Compressed data |

---

## 💡 Recommended for Bundle Import

### Option 1: Archive Icon (Current)
```json
{
  "icon": "$(archive)"
}
```
**Pros**: Matches bundle icon, consistent theme  
**Cons**: Could be confused with bundles themselves

### Option 2: File-Zip Icon
```json
{
  "icon": "$(file-zip)"
}
```
**Pros**: Clear "import archive" meaning  
**Cons**: Looks like a file, not an action

### Option 3: Cloud Download
```json
{
  "icon": "$(cloud-download)"
}
```
**Pros**: Clear "import" action  
**Cons**: Implies cloud/remote source

### Option 4: Folder Opened
```json
{
  "icon": "$(folder-opened)"
}
```
**Pros**: Suggests browsing/opening files  
**Cons**: Could be confused with opening folders

### Option 5: Inbox
```json
{
  "icon": "$(inbox)"
}
```
**Pros**: Clear "receive/import" meaning  
**Cons**: Less commonly used, might be unfamiliar

---

## 🎯 Current Implementation (v0.0.189)

### Bundles Panel Toolbar Buttons

**Button 1 - Create Empty Bundle**:
```json
{
  "command": "logScoutAnalyzer.bundle.create",
  "title": "Scout: Create New Bundle",
  "icon": "$(add)"
}
```

**Button 2 - Import Package**:
```json
{
  "command": "logScoutAnalyzer.bundle.importPackage",
  "title": "Scout: Import Package",
  "icon": "$(archive)"
}
```

---

## 🔍 How to Preview Icons

### Method 1: VS Code Icon Reference
1. Visit: https://microsoft.github.io/vscode-codicons/dist/codicon.html
2. Browse all available icons
3. Click to copy icon name

### Method 2: VS Code Command
1. Open Command Palette (`Ctrl+Shift+P`)
2. Type: "Insert Icon"
3. Browse icon picker (if extension installed)

### Method 3: Test in package.json
```json
{
  "command": "test.command",
  "icon": "$(icon-name-here)"
}
```
Reload VS Code to see the icon

---

## 📊 Icon Comparison for Import Action

| Icon | Semantic Clarity | Consistency | Uniqueness | Recommendation |
|------|-----------------|-------------|------------|----------------|
| `$(archive)` | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Best for consistency |
| `$(file-zip)` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Best for clarity |
| `$(cloud-download)` | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Implies remote |
| `$(folder-opened)` | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⚠️ Generic |
| `$(inbox)` | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⚠️ Less familiar |

---

## 💡 Final Recommendation

**Current choice (`$(archive)`) is excellent because**:
- Matches the bundle icon theme
- Consistent visual language
- Users associate archives with bundles
- Not confusing (button position + tooltip clarifies action)

**Alternative if you want more clarity**: `$(file-zip)`
- Makes it very obvious it's for zip/archive files
- Still clear and recognizable
- Slight visual inconsistency with bundle icon (acceptable)

---

**Last Updated**: February 23, 2026  
**Extension Version**: v0.0.189  
**Icon Set**: VS Code Codicons