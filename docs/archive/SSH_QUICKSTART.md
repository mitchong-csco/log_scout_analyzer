# ⚡ SSH Quick Setup - 3 Commands

---

## 🚀 Automated Setup (Easiest)

```bash
cd c:\Users\mitchong\code\log_scout_analyzer
setup-ssh-other-account.bat
```

**Follow the prompts!** The script does everything automatically.

---

## 🛠️ Manual Setup (3 Commands)

### 1. Generate SSH Key
```bash
ssh-keygen -t ed25519 -C "your-other-email@example.com" -f ~/.ssh/id_ed25519_other
```

### 2. Copy Public Key to GitHub
```bash
cat ~/.ssh/id_ed25519_other.pub | clip
```

**Then:** https://github.com/settings/keys → New SSH key → Paste

### 3. Configure SSH
```bash
notepad ~/.ssh/config
```

**Add this:**
```
Host github-other
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_other
    IdentitiesOnly yes
```

---

## ✅ Test It Works

```bash
ssh -T git@github-other
```

**Should say:** "Hi YOUR-OTHER-USERNAME! You've successfully authenticated..."

---

## 🎯 Use It

**When adding remote for your other account:**
```bash
git remote add origin git@github-other:YOUR-USERNAME/log-scout-analyzer.git
                           ^^^^^ Use github-other, not github.com
```

**Or update existing remote:**
```bash
git remote set-url origin git@github-other:YOUR-USERNAME/log-scout-analyzer.git
```

**Then push:**
```bash
git push
```

**No password needed!** ✅

---

## 📋 Quick Checklist

- [ ] Run `setup-ssh-other-account.bat` OR
- [ ] Generate key with `ssh-keygen`
- [ ] Copy public key to clipboard
- [ ] Add to GitHub: https://github.com/settings/keys (OTHER account!)
- [ ] Create SSH config with "github-other" host
- [ ] Test: `ssh -T git@github-other`
- [ ] See correct username
- [ ] Update remote URL to use `github-other`
- [ ] `git push` works without password

---

## 🔑 Key Files

**Private key (keep secret!):**
```
C:\Users\mitchong\.ssh\id_ed25519_other
```

**Public key (add to GitHub):**
```
C:\Users\mitchong\.ssh\id_ed25519_other.pub
```

**Config file:**
```
C:\Users\mitchong\.ssh\config
```

---

## 🚨 Common Issues

**"Permission denied"**
→ Did you add SSH key to OTHER account on GitHub?

**"Could not resolve hostname github-other"**
→ Check SSH config file has "Host github-other" section

**"Hi WRONG-USERNAME"**
→ SSH key added to wrong GitHub account

---

## 📚 Full Documentation

**Complete guide:** `SSH_SETUP_OTHER_ACCOUNT.md`

**Automated script:** `setup-ssh-other-account.bat`

**This card:** Quick reference

---

**Status: ✅ READY - Run setup-ssh-other-account.bat now!**
