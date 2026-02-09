# Auto-Update Guide for Log Scout Analyzer Extension

## Current Status: Manual Updates Only

The Log Scout Analyzer extension is currently installed via a local `.vsix` file and **does not automatically update**. This document explains the current update process and options for enabling automatic updates in the future.

---

## Current Update Process

To update the extension manually:

1. **Build the latest version:**
   ```bash
   cd /home/mitchong/code/log_scout_analyzer
   ./build-vscode.sh
   ```

2. **Install from Windows:**
   - Navigate to `C:\Users\<username>\Downloads\vscode-extensions\`
   - Right-click `log-scout-analyzer-0.1.0.vsix`
   - Select "Install Extension VSIX"
   
   OR use the command line:
   ```bash
   code --install-extension "C:\Users\<username>\Downloads\vscode-extensions\log-scout-analyzer-0.1.0.vsix"
   ```

3. **Reload VS Code:**
   - Press `Ctrl+Shift+P`
   - Type "reload window" and press Enter

4. **Verify the update:**
   - Press `Ctrl+Shift+P`
   - Run `Scout: Show Version Info`
   - Check the build number and timestamp to confirm the new version is loaded

---

## How to Enable Automatic Updates

Auto-updates in VS Code only work for extensions published to the official marketplace or a private registry. Here are your options:

### Option 1: Publish to VS Code Marketplace (Public Distribution)

**Best for:** Sharing the extension publicly with the community

**Steps:**

1. **Create a Microsoft account** (if you don't have one)

2. **Create a publisher account:**
   - Go to https://marketplace.visualstudio.com/manage
   - Create a new publisher with a unique ID
   - Update `package.json` with your publisher ID

3. **Get a Personal Access Token (PAT):**
   - Go to https://dev.azure.com
   - Generate a PAT with "Marketplace (Publish)" scope
   - Save it securely

4. **Update repository information:**
   ```json
   {
     "repository": {
       "type": "git",
       "url": "https://github.com/yourusername/log-scout-analyzer"
     },
     "publisher": "your-publisher-id"
   }
   ```

5. **Publish the extension:**
   ```bash
   cd vscode-extension
   npm run publish
   # or
   vsce publish -p <your-PAT>
   ```

6. **Users install from marketplace:**
   - Search "Log Scout Analyzer" in VS Code Extensions panel
   - Click Install
   - Auto-updates will work from now on!

**Benefits:**
- ✅ Automatic updates for all users
- ✅ Easy discovery and installation
- ✅ Version history and rollback support
- ✅ User reviews and ratings
- ✅ Download statistics

**Considerations:**
- Must be publicly available
- Requires Microsoft/Azure DevOps account
- Subject to marketplace policies and review

---

### Option 2: Private Extension Gallery (Enterprise/Team)

**Best for:** Internal company use or private teams

**Steps:**

1. **Set up a private gallery server** using one of:
   - Azure DevOps Services (private marketplace)
   - Open VSX Registry (open-source alternative)
   - Custom extension gallery server

2. **Configure VS Code to use your private gallery:**
   ```json
   // settings.json
   {
     "extensions.gallery": {
       "serviceUrl": "https://your-private-gallery.com/vscode/gallery",
       "itemUrl": "https://your-private-gallery.com/vscode/item"
     }
   }
   ```

3. **Publish to your private gallery:**
   ```bash
   vsce publish --baseContentUrl https://your-private-gallery.com
   ```

**Benefits:**
- ✅ Auto-updates within your organization
- ✅ Keep extension private
- ✅ Control over distribution
- ✅ Internal usage metrics

**Considerations:**
- Requires infrastructure setup and maintenance
- More complex initial setup
- Team members need gallery configuration

---

### Option 3: Update Notification System (Custom)

**Best for:** Controlled distribution without marketplace publishing

If you want to keep manual installation but add update notifications, you could implement:

1. **Version Check Service:**
   - Host a simple JSON file with latest version info
   - Extension checks on startup or periodically
   - Shows notification when new version available

2. **Implementation example:**
   ```json
   // latest-version.json (hosted somewhere)
   {
     "version": "0.2.0",
     "buildNumber": 150,
     "downloadUrl": "https://your-site.com/log-scout-analyzer-0.2.0.vsix",
     "releaseNotes": "https://your-site.com/changelog.md"
   }
   ```

3. **Extension code:**
   - Fetch version info on activation
   - Compare with current version
   - Show VS Code notification with download link if newer version exists

**Benefits:**
- ✅ Update awareness without marketplace
- ✅ Keep control over distribution
- ✅ Minimal infrastructure needed

**Considerations:**
- Still requires manual installation
- Need to host version info and `.vsix` files
- Requires code changes to extension

---

## Recommended Approach

### For Now (Current Situation)
- ✅ **Continue with manual updates** using the build script
- ✅ **Use version tracking** (`Scout: Show Version Info`) to verify updates
- ✅ **Document the update process** for team members

### For Future (Recommended)
- 🎯 **Option 1 (Marketplace)** if you want to share publicly and get automatic updates
- 🎯 **Option 3 (Notifications)** if you want to stay private but improve update awareness
- 🎯 **Option 2 (Private Gallery)** only if you have enterprise needs and infrastructure

---

## Version Tracking Features

The extension includes built-in version tracking to help with manual updates:

### Build Information
Each build includes:
- **Version:** Semantic version from `package.json`
- **Build Number:** Auto-incremented on each build
- **Timestamp:** When the build was created
- **Git Commit:** Current commit hash
- **Git Branch:** Current branch name

### Check Current Version
Run: `Scout: Show Version Info`

This shows:
```
Log Scout Analyzer Version Information

Version: 0.1.0
Build: #42
Built: 2024-01-15 10:30:45
Commit: abc1234
Branch: main
```

### Verify After Update
Always run `Scout: Show Version Info` after installing a new build to ensure:
- Build number increased
- Timestamp is recent
- Commit hash matches your latest code

---

## Troubleshooting Updates

### Extension Not Updating After Reinstall
1. Fully uninstall the old version first
2. Close all VS Code windows
3. Reinstall the new `.vsix`
4. Verify with `Scout: Show Version Info`

### Build Number Didn't Change
- Make sure you ran `./build-vscode.sh` (not just `npm run compile`)
- Check that `build-info.json` was regenerated
- The build script automatically increments the build number

### Old Features Still Present
- Run `Developer: Reload Window` (not just close/reopen)
- Check VS Code output panel for extension errors
- Verify the `.vsix` file timestamp in Windows matches your build time

---

## Related Documentation

- [COMMANDS_REFERENCE.md](COMMANDS_REFERENCE.md) - All available commands
- [VERSION_TRACKING.md](VERSION_TRACKING.md) - How version tracking works
- [VSCODE_USAGE_GUIDE.md](VSCODE_USAGE_GUIDE.md) - General usage guide
- [NEW_FEATURES.md](NEW_FEATURES.md) - Recent feature additions

---

## Questions?

For more information about VS Code extension publishing:
- [Official Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Marketplace](https://marketplace.visualstudio.com/)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
