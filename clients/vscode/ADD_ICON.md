# Adding a Custom Icon to Log Scout Analyzer Extension

The extension currently builds without an icon. To add a professional icon:

## Quick Option: Use the Provided SVG

We've created a professional icon at `icon.svg` that includes:
- 📄 Log file document
- 🔍 Magnifying glass (Scout theme)
- 🏷️ Tag symbol
- 🔴 Error/warning indicators

### Convert SVG to PNG (Required for VS Code)

VS Code extensions require **PNG format** (not SVG) for icons.

#### Option 1: Using rsvg-convert (Linux/WSL)
```bash
# Install librsvg2-bin if not available
sudo apt-get install librsvg2-bin

# Convert to 128x128 PNG
cd /home/mitchong/code/log_scout_analyzer/clients/vscode
rsvg-convert icon.svg -w 128 -h 128 -o icon.png
```

#### Option 2: Using Inkscape
```bash
inkscape icon.svg --export-type=png --export-filename=icon.png -w 128 -h 128
```

#### Option 3: Using ImageMagick
```bash
convert -background none icon.svg -resize 128x128 icon.png
```

#### Option 4: Online Converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Set dimensions to 128x128
4. Download as `icon.png`
5. Save to `/home/mitchong/code/log_scout_analyzer/clients/vscode/`

### Enable Icon in package.json

Once you have `icon.png`, uncomment this line in `package.json`:

```json
{
  "icon": "icon.png",
  "license": "MIT",
  ...
}
```

### Rebuild

```bash
npm run package
```

The new VSIX will include your custom icon!

## Custom Icon Design Guidelines

If you want to create your own icon:

- **Size:** 128x128 pixels (minimum), 256x256 recommended
- **Format:** PNG with transparency
- **Colors:** Use your brand colors or professional palette
- **Style:** Flat, modern, recognizable at small sizes
- **Elements:** Should represent log analysis/scouting

### Icon Theme Ideas:
1. **Log Scout Badge** - Shield with magnifying glass and log lines
2. **Search Document** - Document with search beam highlighting text
3. **Radar Scan** - Radar screen scanning log entries
4. **Tag Telescope** - Telescope looking at tagged log entries
5. **Circuit Pattern** - Tech-style circuit board with log flow

## Current Icon Design

The provided `icon.svg` features:
- 🎨 Blue gradient background (professional tech look)
- 📄 White document with folded corner (log file)
- 📝 Blue horizontal lines (log entries)
- 🔍 Green magnifying glass with white lens (scout/search)
- 🏷️ Small white tag inside magnifying glass
- 🔴 Red/orange dots (error/warning indicators)

This design clearly communicates "log analysis and pattern detection" at a glance.

## Testing Your Icon

After adding the icon and rebuilding:

1. Install the VSIX in VS Code
2. Check Extensions panel - your icon should appear
3. Verify it looks good at different sizes (16x16, 24x24, 48x48)
4. Test on both light and dark VS Code themes

## Icon Resources

- **VS Code Icon Guidelines:** https://code.visualstudio.com/api/references/extension-manifest#extension-icon
- **Icon Design Tools:**
  - Figma (free): https://figma.com
  - Inkscape (free): https://inkscape.org
  - GIMP (free): https://gimp.org
- **Stock Icons:** https://icons8.com, https://flaticon.com

---

**Note:** The extension will work perfectly without an icon, but adding one makes it more professional and recognizable in the VS Code marketplace and extensions list.