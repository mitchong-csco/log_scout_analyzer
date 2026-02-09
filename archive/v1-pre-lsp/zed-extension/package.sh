#!/bin/bash
# Package Zed Extension for Log Scout Analyzer
# Creates a distributable extension archive

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"
}

# Check if we're in the right directory
if [[ ! -f "extension.toml" ]]; then
    echo "Error: extension.toml not found. Run this from the zed-extension directory."
    exit 1
fi

print_header "Zed Extension Packager"

# Get version from extension.toml
VERSION=$(grep '^version = ' extension.toml | cut -d'"' -f2)
print_info "Extension version: $VERSION"

# Build for WASM target
print_info "Building extension for wasm32-wasip1..."
cargo build --release --target wasm32-wasip1

if [[ $? -ne 0 ]]; then
    echo "Build failed!"
    exit 1
fi

print_success "Build complete"

# Create package directory
PACKAGE_NAME="log-scout-analyzer-zed-${VERSION}"
PACKAGE_DIR="dist/${PACKAGE_NAME}"
print_info "Creating package directory: ${PACKAGE_DIR}"

rm -rf dist
mkdir -p "${PACKAGE_DIR}"

# Copy extension files
print_info "Copying extension files..."
cp extension.toml "${PACKAGE_DIR}/"
cp -r grammars "${PACKAGE_DIR}/"
cp ../target/wasm32-wasip1/release/log_scout_analyzer.wasm "${PACKAGE_DIR}/"

# Create README for the package
cat > "${PACKAGE_DIR}/README.md" << 'EOF'
# Log Scout Analyzer - Zed Extension

Advanced log analysis extension with pattern recognition and diagnostics for Zed editor.

## Installation

1. Copy this entire folder to your Zed extensions directory:
   - **macOS**: `~/Library/Application Support/Zed/extensions/installed/`
   - **Linux**: `~/.local/share/zed/extensions/installed/`
   - **Windows**: `%APPDATA%\Zed\extensions\installed\`

2. Rename the folder to just `log-scout-analyzer`

3. Restart Zed

## Manual Installation

Alternatively, use the installation script:

```bash
./install.sh
```

## Features

- **Pattern Recognition**: Automatically detects errors, warnings, and info messages
- **Real-time Diagnostics**: Highlights issues as you view log files
- **Syntax Highlighting**: Enhanced syntax highlighting for log files
- **Multi-file Support**: Supports .log, .txt, and .out files

## Supported Log Formats

- Standard application logs
- System logs
- Server logs (Apache, Nginx, etc.)
- Custom log formats with common patterns

## Configuration

The extension works out-of-the-box with sensible defaults. Log files are automatically detected by their extensions.

## Version

Version: {{VERSION}}
Build: {{BUILD_DATE}}

## License

MIT License - See LICENSE file for details

---

**Need help?** Check the documentation at https://github.com/log-scout/analyzer
EOF

# Replace placeholders
sed -i "s/{{VERSION}}/${VERSION}/g" "${PACKAGE_DIR}/README.md"
sed -i "s/{{BUILD_DATE}}/$(date -u +%Y-%m-%dT%H:%M:%SZ)/g" "${PACKAGE_DIR}/README.md"

# Create installation script
cat > "${PACKAGE_DIR}/install.sh" << 'EOF'
#!/bin/bash
# Install Log Scout Analyzer extension for Zed

set -e

# Detect OS and set extension directory
if [[ "$OSTYPE" == "darwin"* ]]; then
    EXT_DIR="$HOME/Library/Application Support/Zed/extensions/installed"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    EXT_DIR="$HOME/.local/share/zed/extensions/installed"
else
    echo "Unsupported OS. Please manually copy to your Zed extensions directory."
    exit 1
fi

echo "Installing Log Scout Analyzer to Zed..."
echo "Target: $EXT_DIR/log-scout-analyzer"

# Create directory if it doesn't exist
mkdir -p "$EXT_DIR"

# Remove old version if exists
if [[ -d "$EXT_DIR/log-scout-analyzer" ]]; then
    echo "Removing old version..."
    rm -rf "$EXT_DIR/log-scout-analyzer"
fi

# Copy extension
echo "Copying files..."
cp -r . "$EXT_DIR/log-scout-analyzer"

# Remove install script from installed location
rm -f "$EXT_DIR/log-scout-analyzer/install.sh"

echo "✓ Installation complete!"
echo ""
echo "Please restart Zed to load the extension."
EOF

chmod +x "${PACKAGE_DIR}/install.sh"

# Copy LICENSE
if [[ -f "../LICENSE" ]]; then
    cp ../LICENSE "${PACKAGE_DIR}/"
fi

# Create archive
print_info "Creating archive..."
cd dist
tar -czf "${PACKAGE_NAME}.tar.gz" "${PACKAGE_NAME}"
zip -r "${PACKAGE_NAME}.zip" "${PACKAGE_NAME}" > /dev/null

cd ..
print_success "Created archives:"
echo "  - dist/${PACKAGE_NAME}.tar.gz"
echo "  - dist/${PACKAGE_NAME}.zip"

# Copy to Downloads if specified
if [[ -d "/mnt/c/Users/mitchong/Downloads" ]]; then
    print_info "Copying to Windows Downloads folder..."
    cp "dist/${PACKAGE_NAME}.tar.gz" /mnt/c/Users/mitchong/Downloads/
    cp "dist/${PACKAGE_NAME}.zip" /mnt/c/Users/mitchong/Downloads/
    print_success "Copied to Downloads"
fi

# Create simple installation instructions
cat > "dist/INSTALLATION.txt" << EOF
Log Scout Analyzer for Zed - Installation Instructions
========================================================

Version: ${VERSION}
Built: $(date)

QUICK INSTALL (Linux/macOS):
-----------------------------
1. Extract the archive
2. cd into the extracted folder
3. Run: ./install.sh
4. Restart Zed

MANUAL INSTALL:
---------------
1. Extract the ${PACKAGE_NAME}.tar.gz or .zip file
2. Copy the entire folder to your Zed extensions directory:

   macOS:   ~/Library/Application Support/Zed/extensions/installed/
   Linux:   ~/.local/share/zed/extensions/installed/
   Windows: %APPDATA%\Zed\extensions\installed\

3. Rename the folder to: log-scout-analyzer

4. Restart Zed

VERIFY INSTALLATION:
--------------------
1. Open Zed
2. Open a .log file
3. You should see syntax highlighting and diagnostics

FILES INCLUDED:
---------------
- extension.toml        (Extension manifest)
- log_scout_analyzer.wasm (Compiled extension)
- grammars/             (Syntax highlighting)
- README.md             (Documentation)
- install.sh            (Installation script)

SUPPORT:
--------
For issues or questions, visit:
https://github.com/log-scout/analyzer

Enjoy analyzing logs! 🔍
EOF

print_header "Package Complete!"
print_success "Extension packaged successfully"
echo ""
echo "Package contents:"
echo "  - Extension files: ${PACKAGE_DIR}/"
echo "  - Archives: dist/"
echo "  - Installation guide: dist/INSTALLATION.txt"
echo ""
echo "To install locally, run:"
echo "  cd ${PACKAGE_DIR} && ./install.sh"
echo ""
echo "To distribute, share one of the archives:"
echo "  - ${PACKAGE_NAME}.tar.gz"
echo "  - ${PACKAGE_NAME}.zip"
