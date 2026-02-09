#!/bin/bash
# Log Scout Analyzer - Build and Setup Script
# This script helps you build and install the Log Scout Analyzer extension for Zed

set -e  # Exit on error

# Colors for output
# Environment variables
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# WASM target (updated for Rust 1.93+)
WASM_TARGET="wasm32-wasip1"

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        ZED_EXT_DIR="$HOME/Library/Application Support/Zed/extensions"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        # Check if running in WSL
        if grep -qi microsoft /proc/version 2>/dev/null; then
            OS="wsl"
            # Get Windows username
            WIN_USER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
            if [ -z "$WIN_USER" ]; then
                WIN_USER=$(powershell.exe -Command "Write-Host \$env:USERNAME" 2>/dev/null | tr -d '\r')
            fi
            if [ -z "$WIN_USER" ]; then
                # Fallback: extract from Windows path
                WIN_USER=$(echo $PATH | grep -oP '/mnt/c/Users/\K[^/]+' | head -1)
            fi
            if [ -n "$WIN_USER" ]; then
                ZED_EXT_DIR="/mnt/c/Users/$WIN_USER/.config/zed/extensions"
            else
                print_error "Could not determine Windows username"
                exit 1
            fi
        else
            ZED_EXT_DIR="$HOME/.config/zed/extensions"
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        ZED_EXT_DIR="$APPDATA/Zed/extensions"
    else
        OS="unknown"
        print_error "Unknown operating system: $OSTYPE"
        exit 1
    fi

    print_info "Detected OS: $OS"
    print_info "Zed extensions directory: $ZED_EXT_DIR"
}

# Check if Rust is installed
check_rust() {
    print_header "Checking Rust Installation"

    if command -v rustc &> /dev/null; then
        RUST_VERSION=$(rustc --version)
        print_success "Rust is installed: $RUST_VERSION"
        return 0
    else
        print_warning "Rust is not installed"
        return 1
    fi
}

# Install Rust
install_rust() {
    print_header "Installing Rust"

    print_info "This will install Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

    # Source the cargo environment
    if [ -f "$HOME/.cargo/env" ]; then
        source "$HOME/.cargo/env"
        print_success "Rust installed successfully"
    else
        print_error "Failed to install Rust"
        exit 1
    fi
}

# Add WASM target
add_wasm_target() {
    print_header "Adding WASM Target"

    if rustup target list | grep -q "${WASM_TARGET} (installed)"; then
        print_success "${WASM_TARGET} target already installed"
    else
        print_info "Adding ${WASM_TARGET} target..."
        rustup target add ${WASM_TARGET}
        print_success "${WASM_TARGET} target added"
    fi
}

# Run tests
run_tests() {
    print_header "Running Tests"

    print_info "Running unit tests..."
    if cargo test --quiet; then
        print_success "All tests passed!"
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Run clippy
run_clippy() {
    print_header "Running Clippy (Linter)"

    print_info "Checking code quality..."
    if cargo clippy --quiet -- -D warnings 2>&1 | grep -q "warning"; then
        print_warning "Clippy found some warnings"
        cargo clippy
    else
        print_success "No clippy warnings!"
    fi
}

# Format code
format_code() {
    print_header "Formatting Code"

    print_info "Running cargo fmt..."
    cargo fmt
    print_success "Code formatted"
}

# Build the extension
build_extension() {
    print_header "Building Extension"

    print_info "Building for ${WASM_TARGET} target..."
    print_info "This may take a few minutes on first build..."

    if cargo build --release --target ${WASM_TARGET}; then
        print_success "Build completed successfully!"

        # Show file size
        WASM_FILE="target/${WASM_TARGET}/release/log_scout_analyzer.wasm"
        if [ -f "$WASM_FILE" ]; then
            SIZE=$(du -h "$WASM_FILE" | cut -f1)
            print_info "WASM file size: $SIZE"
        fi
    else
        print_error "Build failed"
        exit 1
    fi
}

# Install to Zed
install_to_zed() {
    print_header "Installing to Zed"

    WASM_FILE="target/${WASM_TARGET}/release/log_scout_analyzer.wasm"

    if [ ! -f "$WASM_FILE" ]; then
        print_error "WASM file not found. Please build first."
        exit 1
    fi

    # Verify extension.toml exists
    if [ ! -f "extension.toml" ]; then
        print_error "extension.toml not found in current directory"
        exit 1
    fi

    # Create extension directory
    EXT_DIR="$ZED_EXT_DIR/log-scout-analyzer"
    print_info "Target directory: $EXT_DIR"

    # Create parent directories if needed
    mkdir -p "$EXT_DIR"

    if [ ! -d "$EXT_DIR" ]; then
        print_error "Failed to create extension directory: $EXT_DIR"
        exit 1
    fi

    # Copy files
    print_info "Copying files to $EXT_DIR..."
    cp "$WASM_FILE" "$EXT_DIR/"
    cp extension.toml "$EXT_DIR/"

    # Verify files were copied
    if [ -f "$EXT_DIR/log_scout_analyzer.wasm" ] && [ -f "$EXT_DIR/extension.toml" ]; then
        print_success "WASM and extension.toml copied successfully"

        # Show file sizes for verification
        WASM_SIZE=$(du -h "$EXT_DIR/log_scout_analyzer.wasm" | cut -f1)
        print_info "  - log_scout_analyzer.wasm ($WASM_SIZE)"
        print_info "  - extension.toml"
    else
        print_error "Failed to copy files to $EXT_DIR"
        exit 1
    fi

    # Copy config directory
    if [ -d "config" ]; then
        cp -r config "$EXT_DIR/"
        print_success "Configuration files copied"
    fi

    print_success "Extension installed to Zed!"
    print_info ""
    print_info "Files installed to:"
    print_info "  $EXT_DIR"
    print_info ""
    if [ "$OS" = "wsl" ]; then
        WIN_PATH=$(echo "$EXT_DIR" | sed 's|/mnt/c|C:|')
        print_info "Windows path: $WIN_PATH"
        print_info ""
    fi
    print_warning "IMPORTANT: Restart Zed to load the extension"
    print_info ""
    print_info "To verify installation in Zed:"
    print_info "  1. Open Zed"
    print_info "  2. Press Ctrl+Shift+P"
    print_info "  3. Type 'Extensions' and open the Extensions panel"
    print_info "  4. Look for 'Log Scout Analyzer' in the list"
}

# Show diagnostic information
show_diagnostic() {
    print_header "Diagnostic Information"

    print_info "Operating System: $OS"
    print_info "OS Type: $OSTYPE"

    if [ "$OS" = "wsl" ]; then
        print_info "Windows User: $WIN_USER"
    fi

    print_info ""
    print_info "Zed Extensions Directory:"
    print_info "  $ZED_EXT_DIR"

    if [ "$OS" = "wsl" ]; then
        WIN_PATH=$(echo "$ZED_EXT_DIR" | sed 's|/mnt/c|C:|')
        print_info "  Windows: $WIN_PATH"
    fi

    print_info ""
    if [ -d "$ZED_EXT_DIR" ]; then
        print_success "Zed extensions directory exists"

        EXT_DIR="$ZED_EXT_DIR/log-scout-analyzer"
        if [ -d "$EXT_DIR" ]; then
            print_success "Log Scout Analyzer extension found!"
            print_info ""
            print_info "Installed files:"
            ls -lh "$EXT_DIR"

            if [ -f "$EXT_DIR/log_scout_analyzer.wasm" ]; then
                WASM_SIZE=$(du -h "$EXT_DIR/log_scout_analyzer.wasm" | cut -f1)
                print_success "  ✓ log_scout_analyzer.wasm ($WASM_SIZE)"
            else
                print_warning "  ✗ log_scout_analyzer.wasm missing"
            fi

            if [ -f "$EXT_DIR/extension.toml" ]; then
                print_success "  ✓ extension.toml"
                print_info ""
                print_info "extension.toml contents:"
                cat "$EXT_DIR/extension.toml"
            else
                print_warning "  ✗ extension.toml missing"
            fi
        else
            print_warning "Log Scout Analyzer extension not installed"
            print_info "Run './build.sh install' to install it"
        fi

        print_info ""
        print_info "Other installed extensions:"
        ls -1 "$ZED_EXT_DIR" 2>/dev/null || echo "  (none)"
    else
        print_warning "Zed extensions directory does not exist"
        print_info "Zed may not be installed or has not been run yet"
    fi

    print_info ""
    print_info "Build artifacts:"
    WASM_FILE="target/${WASM_TARGET}/release/log_scout_analyzer.wasm"
    if [ -f "$WASM_FILE" ]; then
        WASM_SIZE=$(du -h "$WASM_FILE" | cut -f1)
        print_success "  ✓ $WASM_FILE ($WASM_SIZE)"
    else
        print_warning "  ✗ WASM file not built yet"
        print_info "    Run './build.sh build' to build it"
    fi

    if [ -f "extension.toml" ]; then
        print_success "  ✓ extension.toml (source)"
    else
        print_warning "  ✗ extension.toml not found in current directory"
    fi

    print_info ""
    if command -v rustc &> /dev/null; then
        print_success "Rust: $(rustc --version)"
        if rustup target list | grep -q "${WASM_TARGET} (installed)"; then
            print_success "WASM target: ${WASM_TARGET} installed"
        else
            print_warning "WASM target: ${WASM_TARGET} not installed"
            print_info "Run './build.sh setup' to install it"
        fi
    else
        print_warning "Rust not installed"
        print_info "Run './build.sh setup' to install it"
    fi
}

# Uninstall from Zed
uninstall_from_zed() {
    print_header "Uninstalling from Zed"

    EXT_DIR="$ZED_EXT_DIR/log-scout-analyzer"

    if [ -d "$EXT_DIR" ]; then
        rm -rf "$EXT_DIR"
        print_success "Extension uninstalled"
    else
        print_warning "Extension not found"
    fi
}

# Clean build artifacts
clean() {
    print_header "Cleaning Build Artifacts"

    print_info "Removing target directory..."
    cargo clean
    print_success "Clean complete"
}

# Show help
show_help() {
    cat << EOF
Log Scout Analyzer - Build Script

Usage: ./build.sh [command]

Commands:
    setup       - Install Rust and setup development environment
    build       - Build the extension
    test        - Run tests
    lint        - Run clippy linter
    format      - Format code
    install     - Install extension to Zed
    uninstall   - Remove extension from Zed
    clean       - Clean build artifacts
    diagnostic  - Show diagnostic information and installation status
    all         - Setup, build, test, and install (default)
    help        - Show this help message

Examples:
    ./build.sh              # Run full build and install
    ./build.sh build        # Just build
    ./build.sh test         # Just run tests
    ./build.sh install      # Install to Zed
    ./build.sh diagnostic   # Check installation status and paths

EOF
}

# Main execution
main() {
    print_header "Log Scout Analyzer Build Script"

    detect_os

    case "${1:-all}" in
        setup)
            if ! check_rust; then
                install_rust
            fi
            add_wasm_target
            print_success "Setup complete!"
            ;;

        build)
            check_rust || { print_error "Rust not installed. Run './build.sh setup'"; exit 1; }
            build_extension
            install_to_zed
            print_success "Build complete and extension installed!"
            print_info "Please restart Zed to load the extension"
            ;;

        test)
            check_rust || { print_error "Rust not installed. Run './build.sh setup'"; exit 1; }
            run_tests
            ;;

        lint)
            check_rust || { print_error "Rust not installed. Run './build.sh setup'"; exit 1; }
            run_clippy
            ;;

        format)
            check_rust || { print_error "Rust not installed. Run './build.sh setup'"; exit 1; }
            format_code
            ;;

        install)
            install_to_zed
            ;;

        uninstall)
            uninstall_from_zed
            ;;

        clean)
            clean
            ;;

        diagnostic|diag|status)
            show_diagnostic
            ;;

        all)
            if ! check_rust; then
                read -p "Rust is not installed. Install now? (y/n) " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    install_rust
                    add_wasm_target
                else
                    print_error "Rust is required to build the extension"
                    exit 1
                fi
            else
                add_wasm_target
            fi

            format_code
            run_tests
            run_clippy
            build_extension
            install_to_zed

            print_header "Build Complete! 🚀"
            print_success "Extension is ready to use"
            print_info "Please restart Zed to load the extension"
            ;;

        help|--help|-h)
            show_help
            ;;

        *)
            print_error "Unknown command: $1"
            echo "Run './build.sh help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
