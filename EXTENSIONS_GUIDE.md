# Essential Extensions Guide

> **Date:** February 17, 2026  
> **Purpose:** Boost your development workflow with these extensions

---

## 🚀 Quick Install - All at Once

**Open VSCode in your project:**
```bash
cd c:\Users\mitchong\code\log_scout_analyzer
code .
```

**VSCode will prompt:**
```
This workspace has extension recommendations.
Would you like to install them?

[Install All] [Show Recommendations] [Ignore]
```

**Click "Install All"** - Done! ✅

---

## 📦 Extensions by Category

### 🦀 Essential Rust Development (Must Have)

#### 1. **rust-analyzer** (rust-lang.rust-analyzer)
**What it does:**
- Intelligent code completion
- Inline type hints
- Jump to definition
- Find references
- Automatic imports

**Why you need it:**
- Makes Rust development 10x faster
- Catches errors as you type
- Essential for working with Rust

**Install:**
```
Ctrl+Shift+X → Search "rust-analyzer" → Install
```

#### 2. **CodeLLDB** (vadimcn.vscode-lldb)
**What it does:**
- Debug Rust programs
- Set breakpoints
- Inspect variables
- Step through code

**Why you need it:**
- Debug your LSP server
- Find complex bugs
- Inspect runtime state

#### 3. **crates** (serayuzgur.crates)
**What it does:**
- Shows latest version of dependencies in Cargo.toml
- Highlights outdated crates
- One-click updates

**Example:**
```toml
[dependencies]
tokio = "1.35.0"  # ⬆️ 1.36.0 available
```

---

### 🔧 GitHub Actions & CI/CD (Super Useful)

#### 4. **GitHub Actions** (github.vscode-github-actions)
**What it does:**
- Syntax highlighting for workflow files
- Autocomplete for actions
- Inline documentation
- Workflow validation
- View workflow runs in VSCode

**Why you need it now:**
- You just created 3 workflow files!
- Validates YAML syntax
- Autocompletes action names
- Shows workflow status in sidebar

**Features:**
```yaml
# Autocomplete suggestions as you type:
- uses: actions/|
        ↓
  Suggestions:
  - actions/checkout@v3
  - actions/cache@v3
  - actions/upload-artifact@v3
```

**View runs in VSCode:**
```
GitHub Actions sidebar:
  ├─ Pattern Quality CI
  │  ├─ ✅ #1 (main) - 10 minutes ago
  │  └─ ⏳ #2 (develop) - running
  ├─ Advanced Pipeline
  └─ Weekly Quality Report
```

#### 5. **GitHub Pull Requests** (github.vscode-pull-request-github)
**What it does:**
- Create PRs from VSCode
- Review PRs inline
- Comment on code
- See CI status

**Workflow:**
```
1. Make changes
2. Commit
3. Ctrl+Shift+P → "GitHub Pull Requests: Create Pull Request"
4. Fill details
5. See CI checks run
6. Merge when ✅
```

#### 6. **GitLens** (eamodio.gitlens)
**What it does:**
- See who changed each line (blame)
- View commit history
- Compare branches
- Visualize repo history

**Features:**
```
Hover over any line:
  ┌─────────────────────────────────┐
  │ John Doe, 2 days ago            │
  │ "fix: Pattern quality bug"      │
  │                                 │
  │ [View Commit] [Compare]         │
  └─────────────────────────────────┘
```

---

### ✨ Code Quality & Productivity

#### 7. **Error Lens** (usernamehw.errorlens)
**What it does:**
- Shows errors/warnings inline (no hovering needed)
- Highlights entire error line
- Shows error message right in editor

**Before Error Lens:**
```rust
let x = foo();  // Red squiggle (need to hover)
```

**With Error Lens:**
```rust
let x = foo();  ❌ cannot find value `foo` in this scope
```

**Benefit:** See errors instantly!

#### 8. **Code Spell Checker** (streetsidesoftware.code-spell-checker)
**What it does:**
- Catches typos in code comments
- Catches typos in documentation
- Custom dictionary support

**Example:**
```rust
// This functoin handles pattren matching  ~~~~~~~~~~
//      ^^^^^^^^           ^^^^^^^  (underlined as misspelled)
```

#### 9. **Even Better TOML** (tamasfe.even-better-toml)
**What it does:**
- Syntax highlighting for Cargo.toml
- Validates TOML format
- Autocomplete for keys

**Why you need it:**
- Your project has multiple Cargo.toml files
- Prevents syntax errors
- Makes editing dependencies easier

---

### 📝 Markdown & Documentation

#### 10. **Markdown All in One** (yzhang.markdown-all-in-one)
**What it does:**
- Keyboard shortcuts (bold, italic, links)
- Table of contents generation
- List editing
- Preview

**Your project has 80+ .md files - this helps!**

**Features:**
```markdown
Shortcuts:
  Ctrl+B → **bold**
  Ctrl+I → *italic*
  Ctrl+Shift+] → Create TOC
  Alt+C → Check/uncheck task list
```

#### 11. **Markdown Lint** (davidanson.vscode-markdownlint)
**What it does:**
- Enforces markdown best practices
- Consistent formatting
- Catches common mistakes

---

### 🔄 YAML Support (for GitHub Actions)

#### 12. **YAML** (redhat.vscode-yaml)
**What it does:**
- Syntax highlighting
- Schema validation
- Error checking
- Autocomplete

**Perfect for your workflow files:**
```yaml
# Validates GitHub Actions syntax
on:
  push:
    branches: [ main ]  # ✅ Valid
    branchs: [ main ]   # ❌ Error: Unknown property 'branchs'
```

---

### 🧪 Testing Support

#### 13. **Coverage Gutters** (ryanluker.vscode-coverage-gutters)
**What it does:**
- Shows test coverage in editor
- Green lines = covered
- Red lines = not covered

**Example:**
```rust
pub fn calculate_score() -> f64 {  // ✅ Green (tested)
    let score = 75.0;              // ✅ Green (tested)
    if score > 90.0 {              // ❌ Red (not tested)
        return 100.0;              // ❌ Red (not tested)
    }
    score
}
```

---

### 🌍 Remote Development (Optional but Powerful)

#### 14. **Remote - SSH** (ms-vscode-remote.remote-ssh)
**What it does:**
- Edit code on remote servers
- Run commands remotely
- Full VSCode experience on remote machine

**Use case:**
```
Your Laptop                Remote Server
  VSCode UI    ←→ SSH ←→   Code runs here
                          Tests run here
                          Git operations here
```

**Perfect for:**
- Testing on Linux server
- Using powerful remote machine
- Docker container development

#### 15. **Remote - Containers** (ms-vscode-remote.remote-containers)
**What it does:**
- Develop inside Docker containers
- Consistent environment
- No "works on my machine" issues

**Use case:**
```
Open project in container:
  1. Ctrl+Shift+P
  2. "Remote-Containers: Reopen in Container"
  3. VSCode runs inside Docker
  4. All tools pre-installed
```

---

### 🎯 Productivity Boosters

#### 16. **TODO Tree** (gruntfuggly.todo-tree)
**What it does:**
- Finds all TODO/FIXME comments
- Shows in sidebar tree
- Jump to any TODO

**Example:**
```rust
// TODO: Optimize this algorithm
// FIXME: Handle edge case
// HACK: Temporary workaround
```

**Sidebar shows:**
```
TODO Tree
├─ TODO (12)
│  ├─ pattern_tester.rs:42
│  └─ quality_monitor.rs:156
├─ FIXME (3)
└─ HACK (1)
```

#### 17. **Bookmarks** (alefragnani.bookmarks)
**What it does:**
- Bookmark important lines
- Jump between bookmarks
- Named bookmarks

**Usage:**
```
Ctrl+Alt+K → Toggle bookmark
Ctrl+Alt+L → Next bookmark
Ctrl+Alt+J → Previous bookmark
```

---

## 🎨 Optional: UI/Theme Extensions

#### **GitHub Theme** (github.github-vscode-theme)
- Official GitHub color scheme
- Light and dark variants
- Matches GitHub UI

#### **Material Icon Theme** (pkief.material-icon-theme)
- Better file icons
- Recognizes more file types
- Visual file organization

---

## 📦 Installation Guide

### Method 1: VSCode Will Prompt (Easiest)

1. Open VSCode in your project
2. VSCode sees `.vscode/extensions.json`
3. Shows notification: "Install recommended extensions?"
4. Click "Install All"
5. Done! ✅

### Method 2: Extensions View

1. Open Extensions: `Ctrl+Shift+X`
2. Search: `@recommended`
3. Shows workspace recommendations
4. Install individually or all at once

### Method 3: Command Palette

```
Ctrl+Shift+P → "Extensions: Show Recommended Extensions"
```

### Method 4: Command Line

```bash
# Install specific extension
code --install-extension rust-lang.rust-analyzer

# Install all recommended
code --install-extension rust-lang.rust-analyzer
code --install-extension github.vscode-github-actions
code --install-extension eamodio.gitlens
# ... etc
```

---

## 🎯 Priority Installation Order

### **Tier 1: Absolutely Essential** (Install First)
1. `rust-analyzer` - Rust language support
2. `github.vscode-github-actions` - GitHub Actions support (you just added workflows!)
3. `vadimcn.vscode-lldb` - Debugging

### **Tier 2: Highly Recommended** (Install Today)
4. `eamodio.gitlens` - Git superpowers
5. `usernamehw.errorlens` - Inline errors
6. `redhat.vscode-yaml` - YAML support (for workflows)

### **Tier 3: Quality of Life** (Install This Week)
7. `serayuzgur.crates` - Dependency management
8. `yzhang.markdown-all-in-one` - Markdown (you have 80+ .md files)
9. `github.vscode-pull-request-github` - PR management

### **Tier 4: Nice to Have** (Install As Needed)
10. Everything else!

---

## 🔥 Most Useful for Your Project

Based on what we just did:

### **1. GitHub Actions Extension** (CRITICAL NOW)
You just created 3 workflow files. This extension:
- Validates your YAML syntax
- Shows autocomplete
- Displays workflow runs
- Inline documentation

**Install immediately:**
```
Ctrl+Shift+X → "GitHub Actions" → Install
```

### **2. rust-analyzer** (ESSENTIAL)
For developing the LSP server:
- Code completion
- Error checking
- Type hints
- Refactoring

### **3. GitLens** (SUPER USEFUL)
Track changes, see history, collaborate:
- Who wrote which line
- When was it changed
- Commit messages inline

---

## 🎮 Quick Start After Installing

### GitHub Actions Extension

1. Open `.github/workflows/ci.yml`
2. Notice syntax highlighting
3. Try typing `- uses: actions/`
4. See autocomplete suggestions!

**Sidebar:**
```
GitHub Actions (icon)
├─ Workflows
│  ├─ Pattern Quality CI
│  ├─ Advanced Pipeline
│  └─ Weekly Quality Report
└─ Runs
   ├─ #1 (main) - ✅ Success
   └─ #2 (develop) - ⏳ Running
```

### rust-analyzer

1. Open `lsp-server/src/pattern_quality_evaluator.rs`
2. Hover over any type → See documentation
3. Ctrl+Click → Jump to definition
4. See inline type hints

### GitLens

1. Open any file
2. See "blame" info above each function
3. Hover over any line → See commit info
4. Click commit → View full diff

---

## 💡 Pro Tips

### Workspace Settings

I created `.vscode/extensions.json` which:
- Lists all recommended extensions
- VSCode automatically prompts to install
- Shared with team via git
- Ensures consistent development environment

### Extension Sync

**Enable Settings Sync:**
```
Ctrl+Shift+P → "Settings Sync: Turn On"
```

Syncs across all your machines:
- Extensions
- Settings
- Keybindings
- Snippets

### Performance

**If VSCode gets slow:**
1. Disable unused extensions
2. Check: `Ctrl+Shift+P → "Developer: Show Running Extensions"`
3. Disable heavy ones you don't need

---

## 🔧 Configuration Tips

### rust-analyzer Settings

Add to `.vscode/settings.json`:
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.inlayHints.enable": true,
  "rust-analyzer.lens.run": true
}
```

### GitHub Actions Settings

```json
{
  "github-actions.workflows.pinned.workflows": [
    ".github/workflows/ci.yml"
  ]
}
```

---

## 📊 Before vs After Extensions

### Before
```
- Manual YAML validation
- No GitHub Actions feedback
- Hover to see errors
- Manual git blame lookups
- No Rust code completion
```

### After
```
✅ YAML validated automatically
✅ GitHub Actions runs visible in sidebar
✅ Errors shown inline
✅ Git info on every line
✅ Smart Rust completion
✅ Test coverage visualization
✅ TODO tracking
```

---

## 🎁 Bonus: Extension Packs

Instead of individual extensions, you can install packs:

### **Rust Extension Pack**
```
Ctrl+Shift+X → "Rust Extension Pack"
```
Includes:
- rust-analyzer
- CodeLLDB
- crates
- Even Better TOML
- Error Lens

### **GitHub Extension Pack** (Unofficial)
Contains:
- GitHub Actions
- GitHub Pull Requests
- GitLens
- Git History

---

## 🚀 Quick Commands Reference

After installing extensions:

```
GitHub Actions:
  Ctrl+Shift+P → "GitHub Actions: ..."
  - View Workflow Runs
  - View Logs
  - Rerun Workflow

rust-analyzer:
  Alt+Enter → Quick fix
  F2 → Rename symbol
  F12 → Go to definition
  Shift+F12 → Find references

GitLens:
  Alt+B → Toggle blame
  Ctrl+Shift+G, B → Open blame
  Ctrl+Shift+G, H → View history
```

---

## ✅ Verification

### Check Installed Extensions

```
Ctrl+Shift+X → Click filter icon → "Installed"
```

Should see:
- rust-analyzer ✅
- GitHub Actions ✅
- GitLens ✅
- etc.

### Test GitHub Actions Extension

1. Open `.github/workflows/ci.yml`
2. Look at sidebar → GitHub Actions icon
3. Should see your 3 workflows listed
4. Click one → See details

---

## 📚 Summary

**Essential Extensions Created:**
- ✅ `.vscode/extensions.json` with 17 recommendations

**Top Priorities:**
1. GitHub Actions (you just added workflows!)
2. rust-analyzer (core development)
3. GitLens (team collaboration)

**Installation:**
- VSCode will prompt automatically
- Or: `Ctrl+Shift+X → @recommended`

**Benefit:**
- 10x faster development
- Better code quality
- GitHub Actions integration
- Professional workflow

---

## 🎯 Action Items

### Right Now (2 minutes)
1. Open VSCode in project
2. Wait for "Install recommended extensions?" prompt
3. Click "Install All"
4. Wait for installation
5. Reload VSCode

### After Installation (5 minutes)
1. Open `.github/workflows/ci.yml`
2. Notice GitHub Actions sidebar
3. Try editing workflow file (see autocomplete)
4. Open any Rust file
5. Notice rust-analyzer features

### This Week
1. Learn GitHub Actions extension features
2. Explore GitLens capabilities
3. Configure rust-analyzer to your liking
4. Add any other extensions you prefer

---

**Ready to supercharge your development? Open VSCode and install the extensions!** 🚀
