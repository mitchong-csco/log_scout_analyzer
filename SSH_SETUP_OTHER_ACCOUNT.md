# SSH Setup for Your Other GitHub Account

> **Date:** February 17, 2026  
> **Purpose:** Configure SSH to push to your other GitHub account  
> **Time Required:** 5 minutes

---

## ⚡ Quick Setup (3 Commands)

### Step 1: Generate SSH Key for Other Account

```bash
# Open PowerShell or Git Bash
cd ~

# Generate new SSH key (replace YOUR-OTHER-EMAIL with your other account's email)
ssh-keygen -t ed25519 -C "your-other-email@example.com" -f ~/.ssh/id_ed25519_other

# When prompted:
# - Enter passphrase (optional but recommended)
# - Confirm passphrase
```

**What this does:**
- Creates a NEW SSH key specifically for your other account
- Saves it as `id_ed25519_other` (different from your main key)
- Associates it with your other account's email

---

### Step 2: Add SSH Key to Your Other GitHub Account

**Copy the public key to clipboard:**

```bash
# Windows PowerShell:
cat ~/.ssh/id_ed25519_other.pub | clip

# Git Bash:
cat ~/.ssh/id_ed25519_other.pub | clip

# Or manually:
cat ~/.ssh/id_ed25519_other.pub
# Then Ctrl+C to copy the output
```

**Add to GitHub (in incognito browser, logged into OTHER account):**

1. **Go to:** https://github.com/settings/keys
2. **Click:** "New SSH key"
3. **Title:** "Windows - Other Account"
4. **Key type:** Authentication Key
5. **Key:** Paste the key you copied (starts with `ssh-ed25519`)
6. **Click:** "Add SSH key"
7. **Confirm** with password if prompted

---

### Step 3: Configure SSH to Use Correct Key

**Create or edit SSH config file:**

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Create/edit SSH config
notepad ~/.ssh/config
```

**Add this to the config file:**

```
# Default GitHub account (your main account)
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519

# Other GitHub account
Host github-other
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_other
    IdentitiesOnly yes
```

**Save and close notepad**

---

### Step 4: Test SSH Connection

```bash
# Test connection to your other account
ssh -T git@github-other

# Should see:
# Hi YOUR-OTHER-USERNAME! You've successfully authenticated...
```

---

### Step 5: Use SSH URL with Other Account

**When adding remote for your other account:**

```bash
# Instead of:
git remote add origin git@github.com:YOUR-OTHER-USERNAME/log-scout-analyzer.git

# Use:
git remote add origin git@github-other:YOUR-OTHER-USERNAME/log-scout-analyzer.git
                              ^^^^^ Notice: github-other (uses your other SSH key)
```

---

## 🎯 Complete Setup for Your Migration

**For your current migration, here's what to do:**

### If You Haven't Run migrate-to-own-repo.bat Yet:

**1. Generate SSH key:**
```bash
ssh-keygen -t ed25519 -C "your-other-email@example.com" -f ~/.ssh/id_ed25519_other
```

**2. Add to GitHub:**
- Copy: `cat ~/.ssh/id_ed25519_other.pub | clip`
- Add at: https://github.com/settings/keys (in OTHER account)

**3. Configure SSH:**
```bash
notepad ~/.ssh/config
# Add the config from above
```

**4. When creating repository:**
- Use SSH URL with `github-other` host
- Example: `git@github-other:YOUR-USERNAME/log-scout-analyzer.git`

**5. Run migration:**
```bash
migrate-to-own-repo.bat
# When prompted for URL, paste: git@github-other:YOUR-USERNAME/log-scout-analyzer.git
```

---

### If You Already Ran migrate-to-own-repo.bat with HTTPS:

**No problem! Just change the remote URL:**

```bash
cd c:\Users\mitchong\code\log_scout_analyzer

# Check current remote
git remote -v

# Change to SSH (replace YOUR-OTHER-USERNAME)
git remote set-url origin git@github-other:YOUR-OTHER-USERNAME/log-scout-analyzer.git

# Verify
git remote -v

# Test push
git push
```

---

## 🔧 Detailed Steps

### Generate SSH Key (Detailed)

```bash
# Open PowerShell
cd ~

# Generate key
ssh-keygen -t ed25519 -C "your-other-email@example.com" -f ~/.ssh/id_ed25519_other

# You'll see:
Generating public/private ed25519 key pair.
Enter passphrase (empty for no passphrase): [Type a passphrase]
Enter same passphrase again: [Type passphrase again]

# Output:
Your identification has been saved in C:\Users\mitchong\.ssh\id_ed25519_other
Your public key has been saved in C:\Users\mitchong\.ssh\id_ed25519_other.pub
```

**What gets created:**
- `~/.ssh/id_ed25519_other` - Private key (NEVER share this!)
- `~/.ssh/id_ed25519_other.pub` - Public key (this goes to GitHub)

---

### Add Key to GitHub (Detailed)

**1. Copy the public key:**

```bash
# Display the public key
cat ~/.ssh/id_ed25519_other.pub

# Output looks like:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAbCdEfGhIjKlMnOpQrStUvWxYz... your-other-email@example.com

# Copy this ENTIRE line
```

**2. Add to GitHub:**

**In incognito browser (logged into OTHER account):**

- **URL:** https://github.com/settings/keys
- **Click:** "New SSH key" (green button, top right)
- **Title:** "Windows - Other Account" (or any name you want)
- **Key type:** "Authentication Key"
- **Key:** Paste the entire public key
- **Click:** "Add SSH key"
- **Enter password** if prompted

---

### SSH Config File (Detailed)

**Location:** `C:\Users\mitchong\.ssh\config`

**Full example with both accounts:**

```ssh-config
# Main GitHub account (if you have one)
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# Your OTHER GitHub account
Host github-other
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_other
    IdentitiesOnly yes

# You can also use a specific host alias
Host github-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_other
    IdentitiesOnly yes
```

**Explanation:**
- `Host github-other` - This is the alias you use in git URLs
- `HostName github.com` - Still connects to github.com
- `IdentityFile` - Which SSH key to use
- `IdentitiesOnly yes` - Only use this key, don't try others

---

## 🧪 Testing

### Test 1: SSH Connection

```bash
# Test connection with your other account
ssh -T git@github-other

# Expected output:
Hi YOUR-OTHER-USERNAME! You've successfully authenticated, but GitHub does not provide shell access.

# If it says wrong username, check:
# 1. Did you add the SSH key to the correct GitHub account?
# 2. Is the SSH config correct?
```

### Test 2: Clone a Repository

```bash
# Try cloning from your other account
cd c:\Users\mitchong\code\test

# Clone using github-other host
git clone git@github-other:YOUR-OTHER-USERNAME/some-repo.git

# Should work without password!
```

### Test 3: Push Changes

```bash
cd c:\Users\mitchong\code\log_scout_analyzer

# Make sure remote uses github-other
git remote -v
# Should show: git@github-other:YOUR-OTHER-USERNAME/...

# Try pushing
git push

# Should work without asking for credentials!
```

---

## 🚨 Troubleshooting

### Error: "Permission denied (publickey)"

**Cause:** SSH key not added to GitHub or wrong key being used

**Fix:**
```bash
# Check which key is being offered
ssh -vT git@github-other 2>&1 | grep "Offering public key"

# Should show: id_ed25519_other

# If not, check SSH config file
cat ~/.ssh/config
```

---

### Error: "Could not resolve hostname github-other"

**Cause:** SSH config not set up correctly

**Fix:**
```bash
# Check SSH config exists
cat ~/.ssh/config

# Should contain "Host github-other" section
# If not, create it (see Step 3 above)
```

---

### Error: "Hi WRONG-USERNAME! You've successfully authenticated"

**Cause:** SSH key added to wrong GitHub account

**Fix:**
1. Go to https://github.com/settings/keys (in correct OTHER account)
2. Check if SSH key is there
3. If not, add it
4. If it's in the wrong account, delete and add to correct one

---

### SSH Key Already Exists

**If you get "file exists" when generating key:**

```bash
# List existing keys
ls ~/.ssh/

# Either:
# 1. Use a different filename:
ssh-keygen -t ed25519 -C "email@example.com" -f ~/.ssh/id_ed25519_other_new

# 2. Or overwrite (WARNING: This deletes old key):
ssh-keygen -t ed25519 -C "email@example.com" -f ~/.ssh/id_ed25519_other
# When asked "Overwrite?", type: y
```

---

## 📋 Verification Checklist

- [ ] Generated new SSH key (`id_ed25519_other`)
- [ ] Copied public key to clipboard
- [ ] Logged into OTHER GitHub account
- [ ] Added SSH key at github.com/settings/keys
- [ ] Created/edited ~/.ssh/config file
- [ ] Added "Host github-other" section to config
- [ ] Tested connection: `ssh -T git@github-other`
- [ ] Saw correct username in test output
- [ ] Updated git remote URL to use `github-other`
- [ ] Successfully pushed without password

---

## 🎯 Quick Reference

### Generate Key:
```bash
ssh-keygen -t ed25519 -C "your-email@example.com" -f ~/.ssh/id_ed25519_other
```

### Copy Public Key:
```bash
cat ~/.ssh/id_ed25519_other.pub | clip
```

### Add to GitHub:
```
https://github.com/settings/keys
```

### SSH Config:
```
Host github-other
    HostName github.com
    IdentityFile ~/.ssh/id_ed25519_other
```

### Test:
```bash
ssh -T git@github-other
```

### Remote URL Format:
```
git@github-other:YOUR-USERNAME/repo-name.git
```

---

## 💡 Pro Tips

### Tip 1: Use Descriptive Key Names

Instead of `id_ed25519_other`, use:
- `id_ed25519_personal`
- `id_ed25519_work`
- `id_ed25519_company`

Makes it clear which key is which!

### Tip 2: Add Passphrase

Always add a passphrase to your SSH keys for security:
- If someone gets your private key file, they still can't use it
- Windows can remember passphrase (won't ask every time)

### Tip 3: Multiple Hosts for Same Account

You can create multiple aliases:

```ssh-config
Host github-other
    HostName github.com
    IdentityFile ~/.ssh/id_ed25519_other

Host github-personal
    HostName github.com
    IdentityFile ~/.ssh/id_ed25519_other
```

Both use same key, just different aliases in git URLs.

### Tip 4: Keep Track of Keys

Create a file to document your keys:

```bash
# ~/.ssh/README.txt
id_ed25519         - Main GitHub account (mitchong)
id_ed25519_other   - Personal GitHub account  
id_rsa             - Old key (deprecated)
```

---

## 🔐 Security Best Practices

1. **Never share private keys** (`id_ed25519_other` without `.pub`)
2. **Use passphrases** on all SSH keys
3. **Use ed25519** keys (more secure than RSA)
4. **One key per account** (don't reuse keys)
5. **Rotate keys annually** (generate new ones each year)
6. **Remove old keys** from GitHub when no longer needed

---

## ✅ Success Indicators

**You'll know it works when:**

1. ✅ `ssh -T git@github-other` shows correct username
2. ✅ `git push` works without asking for password
3. ✅ No authentication errors
4. ✅ Code appears in your other account's repository

---

## 🎉 After Setup

**Your workflow:**

```bash
# Normal git operations just work
git add .
git commit -m "Add new feature"
git push  # No password needed! ✅

# Git uses the SSH key automatically
# Based on the remote URL (github-other)
```

**Benefits:**
- ✅ No password prompts
- ✅ More secure than HTTPS + password
- ✅ Automatic authentication
- ✅ Can have multiple GitHub accounts
- ✅ Easy to switch between accounts

---

**Status: ✅ COMPLETE GUIDE - Follow steps above to set up SSH!**
