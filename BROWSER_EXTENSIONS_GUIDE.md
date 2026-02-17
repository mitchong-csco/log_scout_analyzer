# Browser Extensions for GitHub & Development

> **Date:** February 17, 2026  
> **Purpose:** Enhance your GitHub experience

---

## 🌐 Essential Browser Extensions

### For Chrome/Edge/Brave

#### 1. **Refined GitHub** ⭐⭐⭐⭐⭐
**What it does:**
- Adds missing features to GitHub
- Better UI/UX improvements
- Keyboard shortcuts
- Mark issues/PRs as unread
- Reactions popup
- One-click merge conflict resolution

**Features:**
- Shows build status in tabs
- Highlights your username
- Adds "Copy file" button
- Shows PR/issue age
- Batch actions on notifications

**Install:**
- Chrome: https://chrome.google.com/webstore → "Refined GitHub"
- Edge: Same link (Edge uses Chrome store)

**Why you need it:**
- You'll be on GitHub Actions tab frequently
- Makes GitHub much more productive
- Essential for power users

#### 2. **Octotree** ⭐⭐⭐⭐⭐
**What it does:**
- File tree sidebar on GitHub
- Navigate code like in IDE
- Quick file access
- Bookmark files
- Search files

**Before Octotree:**
```
Click folder → Wait → Click file → Wait → Back → Click...
```

**With Octotree:**
```
Sidebar shows:
  log_scout_analyzer/
  ├─ .github/
  │  └─ workflows/
  │     ├─ ci.yml
  │     ├─ advanced.yml
  │     └─ weekly.yml
  ├─ lsp-server/
  │  └─ src/
  │     ├─ pattern_quality_evaluator.rs
  │     └─ quality_monitor.rs
  └─ vscode-extension/

Click any file instantly!
```

**Install:**
- Chrome/Edge Web Store → "Octotree"

#### 3. **GitHub File Icons**
**What it does:**
- Adds file type icons to GitHub
- Visual recognition
- Better navigation

**Example:**
```
README.md      → 📄 Markdown icon
Cargo.toml     → 🦀 Rust icon
ci.yml         → ⚙️ YAML icon
.rs files      → 🦀 Rust icon
```

#### 4. **Sourcegraph** (Optional but powerful)
**What it does:**
- Code intelligence on GitHub
- Go to definition across repos
- Find references
- Hover documentation

**Features:**
- Hover over any function → See docs
- Click function → Jump to definition
- Find all usages
- Works across all GitHub repos

**Use case:**
```
Reading code on GitHub:
  Hover over `PatternQualityEvaluator`
  ↓
  See documentation
  ↓
  Click "Go to definition"
  ↓
  Jump to implementation
```

#### 5. **GitHub Notification Center**
**What it does:**
- Desktop notifications for GitHub
- PR reviews requested
- CI status changes
- Mentions
- Issue assignments

**Why useful:**
```
When your GitHub Actions run completes:
  🔔 Notification popup
  "Pattern Quality CI completed successfully"
  
  Click → Opens GitHub Actions tab
```

---

### For Firefox

Same extensions available:
1. Refined GitHub - https://addons.mozilla.org
2. Octotree
3. GitHub File Icons
4. Sourcegraph

---

## ⚙️ GitHub Settings to Enable

### 1. Email Notifications

**Settings → Notifications:**
- ✅ Actions workflow runs
- ✅ Pull requests
- ✅ Issues
- ✅ Mentions

**For your GitHub Actions:**
- ✅ Get email when workflow fails
- ✅ Get email when workflow succeeds (first time or after failure)
- ✅ Weekly digest

### 2. Security Alerts

**Settings → Security:**
- ✅ Dependabot alerts
- ✅ Code scanning alerts
- ✅ Secret scanning alerts

---

## 🔧 CLI Tools (Command Line Extensions)

### 1. **GitHub CLI (`gh`)**

**Install:**
```bash
# Windows (using winget)
winget install GitHub.cli

# Or download from:
# https://cli.github.com/
```

**What it does:**
```bash
# View workflow runs
gh run list

# Watch workflow in real-time
gh run watch

# View logs
gh run view --log

# Create PR
gh pr create

# View PR status
gh pr status

# Merge PR
gh pr merge
```

**After activating GitHub Actions, you can:**
```bash
# See your workflow runs
gh run list --workflow=ci.yml

# Watch the run live
gh run watch

# View specific run
gh run view 123456789
```

### 2. **git-delta** (Better git diff)

**What it does:**
- Beautiful syntax-highlighted diffs
- Side-by-side view
- Line numbers
- Better readability

**Install:**
```bash
# Windows (using scoop)
scoop install delta

# Or download from:
# https://github.com/dandavison/delta
```

**Configure:**
```bash
git config --global core.pager delta
git config --global interactive.diffFilter "delta --color-only"
```

---

## 📱 Mobile Apps

### **GitHub Mobile**

**iOS:** App Store → "GitHub"
**Android:** Play Store → "GitHub"

**Features:**
- View workflow runs on phone
- Get push notifications
- Review PRs on the go
- Merge PRs
- Comment on issues

**Why useful:**
```
You activate GitHub Actions
  ↓
Leave your desk
  ↓
10 minutes later: Phone notification
  ✅ "Pattern Quality CI completed"
  ↓
Review results on phone
  ↓
Merge if all green!
```

---

## 🎨 Productivity Browser Extensions

### General Development Extensions

#### 1. **OctoLinker**
Links dependencies to their GitHub repos
```toml
[dependencies]
tokio = "1.35"    ← Click → Opens tokio GitHub repo
```

#### 2. **TabSave**
Save browser tab sessions
```
Save "GitHub Actions Debug Session":
  - Actions tab
  - Workflow run
  - CI logs
  - Documentation

Restore later with one click
```

#### 3. **Vimium** (Optional - for keyboard lovers)
Vim-style keyboard navigation in browser
```
j/k    → Scroll
f      → Show link hints
/      → Search page
H/L    → Back/forward
```

---

## 🚀 Extension Combinations

### The Ultimate GitHub Setup

**In Browser:**
1. Refined GitHub (UI improvements)
2. Octotree (file tree)
3. Sourcegraph (code intelligence)
4. GitHub Notifications (desktop alerts)

**In VSCode:**
5. GitHub Actions (workflow editing)
6. GitHub Pull Requests (PR management)
7. GitLens (git superpowers)

**On Command Line:**
8. GitHub CLI (`gh`) (terminal workflow)

**On Phone:**
9. GitHub Mobile (notifications on the go)

---

## 📊 Setup Priority

### Must Have (Install Now)
1. **Refined GitHub** - Makes GitHub so much better
2. **Octotree** - File navigation essential
3. **GitHub CLI** - Command line power

### Nice to Have (Install Later)
4. GitHub Notifications - If you want desktop alerts
5. Sourcegraph - If you read a lot of code on GitHub
6. GitHub File Icons - Visual improvement

### Optional (As Needed)
7. OctoLinker - Dependency linking
8. git-delta - Better diffs
9. Vimium - Keyboard navigation

---

## ⚡ Quick Setup Script

### Install Everything at Once

**Windows (PowerShell):**
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Install git-delta (optional)
scoop install delta
```

**Browser Extensions:**
1. Open Chrome/Edge
2. Go to: chrome://extensions/
3. Search web store for:
   - Refined GitHub
   - Octotree
   - GitHub File Icons
4. Click "Add to Browser"

---

## 🎯 Specific to Your Project

### After Activating GitHub Actions

**You'll want:**
1. **Refined GitHub** - Shows workflow status in browser tabs
2. **GitHub Notifications** - Alerts when workflow completes
3. **GitHub CLI** - Monitor workflows from terminal

**Workflow:**
```bash
# Push code
git push

# Watch in terminal
gh run watch

# Or get browser notification when done
# Or check GitHub Actions tab with Refined GitHub
```

---

## 🔍 Finding More Extensions

### Chrome Web Store
```
https://chrome.google.com/webstore
Search: "GitHub"
Filter: By rating
```

### Awesome Lists
```
GitHub: "awesome-github-chrome-extensions"
GitHub: "awesome-browser-extensions-for-github"
```

---

## 📱 Notifications Setup

### Configure GitHub + Extensions

**1. GitHub Settings:**
```
Settings → Notifications
  Actions:
    ✅ Notify me when a workflow run fails
    ✅ Notify me when a workflow run succeeds
    ✅ Send notifications for workflow runs I triggered
```

**2. Browser Extension (GitHub Notifications):**
```
Extension Settings:
  ✅ Show desktop notifications
  ✅ Play sound
  ✅ Check every 1 minute
  
Filters:
  ✅ Workflow runs
  ✅ Pull requests
  ✅ Mentions
```

**3. Result:**
```
You push code
  ↓
GitHub Actions runs
  ↓
10 minutes later:
  🔔 Desktop notification
  "✅ Pattern Quality CI completed successfully"
  
  Click → Opens GitHub Actions tab
```

---

## 💡 Pro Tips

### Browser Tab Organization

**Create dedicated GitHub window:**
1. Open new browser window
2. Pin these tabs:
   - Your repo main page
   - Actions tab
   - Pull requests
   - Issues
   - Wiki/docs

**With Refined GitHub:**
- Tab titles show workflow status
- Favicons change based on CI status

### Keyboard Shortcuts

**Refined GitHub adds:**
```
?     → Show all shortcuts
g a   → Go to Actions
g p   → Go to Pull Requests
g i   → Go to Issues
g w   → Go to Wiki
.     → Open in github.dev (web editor)
```

**GitHub Actions Tab:**
```
r     → Rerun workflow
j/k   → Navigate runs
Enter → Open run details
```

---

## ✅ Installation Checklist

### Browser Extensions
- [ ] Refined GitHub installed
- [ ] Octotree installed
- [ ] GitHub File Icons installed
- [ ] GitHub Notifications installed (optional)
- [ ] Sourcegraph installed (optional)

### CLI Tools
- [ ] GitHub CLI (`gh`) installed
- [ ] Configured with `gh auth login`
- [ ] Tested with `gh run list`

### Mobile
- [ ] GitHub app installed on phone
- [ ] Notifications enabled
- [ ] Signed in to account

### Configuration
- [ ] GitHub notification preferences set
- [ ] Extension settings configured
- [ ] Desktop notifications enabled

---

## 🎉 After Setup

### Test Your Setup

**1. Push a commit**
```bash
git commit --allow-empty -m "test: Trigger CI"
git push
```

**2. Watch via different methods:**
```
Method 1: Browser (Refined GitHub)
  - Open Actions tab
  - See refined UI
  - Watch status update

Method 2: Terminal (GitHub CLI)
  gh run watch

Method 3: Wait for notification
  - Desktop notification pops up
  - Click to open

Method 4: Phone
  - Check GitHub mobile app
  - See push notification
```

---

## 📚 Summary

**What I Created:**
- ✅ `.vscode/extensions.json` - VSCode extensions
- ✅ `EXTENSIONS_GUIDE.md` - VSCode extensions guide
- ✅ This file - Browser/CLI extensions guide

**Top Recommendations:**

**Must Install:**
1. Refined GitHub (browser)
2. Octotree (browser)
3. rust-analyzer (VSCode)
4. GitHub Actions (VSCode)
5. GitHub CLI (terminal)

**Total Setup Time:** ~15 minutes
**Productivity Boost:** Massive! ✨

---

## 🚀 Next Steps

### Immediate (5 minutes)
1. Open VSCode → Install recommended extensions
2. Open browser → Install Refined GitHub + Octotree
3. Install GitHub CLI: `winget install GitHub.cli`

### After GitHub Actions Runs (10 minutes)
4. Configure notifications
5. Test GitHub CLI: `gh run list`
6. Download GitHub mobile app

### This Week
7. Explore extension features
8. Customize to your workflow
9. Add any other extensions you find useful

---

**Ready to boost your productivity? Install these extensions and watch your workflow improve!** 🚀
