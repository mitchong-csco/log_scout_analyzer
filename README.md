# Log Scout Analyzer

[![Pattern Quality CI](https://github.com/bdb-tasks/log_scout_analyzer/workflows/Pattern%20Quality%20CI/badge.svg)](https://github.com/bdb-tasks/log_scout_analyzer/actions/workflows/ci.yml)
[![Advanced Pipeline](https://github.com/bdb-tasks/log_scout_analyzer/workflows/Advanced%20Pipeline/badge.svg)](https://github.com/bdb-tasks/log_scout_analyzer/actions/workflows/advanced.yml)
[![Weekly Quality Report](https://github.com/bdb-tasks/log_scout_analyzer/workflows/Weekly%20Quality%20Report/badge.svg)](https://github.com/bdb-tasks/log_scout_analyzer/actions/workflows/weekly.yml)

A powerful Language Server Protocol (LSP) based log file analysis tool with enhanced DevTools-style interface. Features real-time pattern matching, timeline visualization, and SIP call flow analysis.

## 🚀 Key Features

### Universal Editor Support
- **LSP-based**: One Rust server works with VS Code, Zed, Vim, Emacs, and any LSP-compatible editor
- **Consolidated**: Enhanced UI + powerful backend in a single package

### Intelligent Analysis
- **TagScout Integration**: 1000+ curated patterns from MongoDB
- **Real-time Diagnostics**: Instant pattern matching as you type
- **Offline-First**: Cached patterns work without network
- **Product-Specific**: Specialized support for Jabber, WebEx, CUCM logs

### Rich UI (VS Code)
- **DevTools-Style Interface**: Activity bar with tree views
- **Timeline Visualization**: Events grouped by time intervals
- **Scout Console**: Real-time analysis output with clickable links
- **SIP Call Flow**: Ladder diagrams for VoIP debugging
- **Split View**: Side-by-side annotated logs

## 📦 Quick Start

### VS Code (Recommended)

**Option 1: Install Pre-built**
```bash
code --install-extension log-scout-analyzer.vsix
```

**Option 2: Build from Source**
```bash
# 1. Build LSP server
cd lsp-server
cargo build --release

# 2. Build extension
cd ../vscode-extension
npm install
npm run build
npm run package

# 3. Install
code --install-extension log-scout-analyzer.vsix
```

### Zed Editor

```bash
cd zed-extension
./build.sh
./install-extension.sh
```

### Other Editors

The LSP server works with any LSP client. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

## 🎯 Usage

1. **Open a log file** in your editor
2. **See diagnostics** appear automatically in the Problems panel
3. **Hover over errors** for detailed information
4. **Use code actions** for quick fixes and analysis

### Example

```log
2024-02-08 10:15:23 INFO Application started
2024-02-08 10:15:24 ERROR Failed to connect to database
2024-02-08 10:15:25 WARNING Retrying connection (attempt 1/3)
2024-02-08 10:15:26 FATAL Database connection failed after 3 retries
```

The LSP server will automatically:
- Highlight ERROR and FATAL lines in red
- Mark WARNING lines in yellow
- Show detailed diagnostics in the Problems panel
- Provide quick actions for exporting results

## 🏗️ Architecture

### LSP-Based Design

```
┌─────────────────────┐
│   VS Code Client    │  (TypeScript - ~100 lines)
└──────────┬──────────┘
           │
           │ JSON-RPC
           │ (stdin/stdout)
           │
┌──────────▼──────────┐
│   LSP Server        │  (Rust - Core Engine)
│                     │
│  • Pattern Engine   │
│  • Log Parsing      │
│  • Diagnostics      │
│  • Timeline         │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│    Zed Client       │  (Rust - ~50 lines)
└─────────────────────┘
```

### Key Components

1. **LSP Server** (`lsp-server/`) - Rust binary that does all the heavy lifting
   - Pattern matching engine
   - Diagnostic generation
   - Timeline extraction
   - SIP/VoIP call flow analysis

2. **VS Code Client** (`clients/vscode/`) - Thin TypeScript wrapper
   - Spawns LSP server
   - Displays diagnostics
   - Provides UI panels

3. **Zed Client** (`clients/zed/`) - Thin Rust wrapper
   - Spawns LSP server
   - Displays diagnostics

## 🔧 Building from Source

### Prerequisites

- Rust 1.75+ (`rustup`)
- Node.js 18+ (for VS Code client)
- VS Code Extension Manager (`npm install -g @vscode/vsce`)

### Build LSP Server

```bash
# Install Rust targets for cross-compilation
rustup target add x86_64-pc-windows-gnu
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
rustup target add x86_64-unknown-linux-gnu

# Build for all platforms
cd lsp-server
cargo build --release --target x86_64-pc-windows-gnu
cargo build --release --target x86_64-apple-darwin
cargo build --release --target aarch64-apple-darwin
cargo build --release --target x86_64-unknown-linux-gnu
```

### Build VS Code Extension

```bash
cd clients/vscode

# Install dependencies
npm install

# Copy server binaries
mkdir -p bin
cp ../../lsp-server/target/x86_64-pc-windows-gnu/release/log-scout-lsp-server.exe bin/log-scout-lsp-win.exe
cp ../../lsp-server/target/x86_64-apple-darwin/release/log-scout-lsp-server bin/log-scout-lsp-macos
cp ../../lsp-server/target/aarch64-apple-darwin/release/log-scout-lsp-server bin/log-scout-lsp-macos-arm
cp ../../lsp-server/target/x86_64-unknown-linux-gnu/release/log-scout-lsp-server bin/log-scout-lsp-linux

# Compile and package
npm run compile
vsce package
```

### Build Zed Extension

```bash
cd clients/zed
cargo build --target wasm32-wasip1 --release
```

### Build Everything

```bash
# From project root
./scripts/build-all.sh
```

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Building & Distribution](docs/BUILDING.md)
- [LSP Server Deployment](docs/LSP_SERVER_DEPLOYMENT.md)
- [Contributing Guide](docs/CONTRIBUTING.md)
- [Pattern Configuration](docs/PATTERNS.md)

## 🎨 Customization

### Adding Custom Patterns

Create a `patterns.json` file:

```json
{
  "patterns": [
    {
      "id": "custom-error",
      "name": "Custom Error Pattern",
      "description": "Detects my custom error format",
      "pattern": "CUSTOM_ERROR: (.*)",
      "severity": "error",
      "category": "custom",
      "enabled": true
    }
  ]
}
```

Configure the LSP server to use your patterns:

**VS Code**: Settings → Extensions → Log Scout Analyzer → Pattern File
**Zed**: Edit `~/.config/zed/settings.json`

## 🔬 Pattern Examples

### Built-in Patterns

- **Errors**: `ERROR`, `FATAL`, `Exception`
- **Warnings**: `WARNING`, `WARN`, `Deprecation`
- **Network**: `Connection failed`, `Timeout`, `Connection refused`
- **SIP/VoIP**: `INVITE`, `BYE`, `407 Proxy Authentication Required`
- **Timeline Events**: Authentication, Call setup, Connection events

### Custom Pattern Modes

- **Single Line**: Match patterns within a single line
- **Multi-Line**: Match patterns spanning multiple lines
- **Sequence**: Match ordered sequences of patterns

## 🚢 Deployment Options

### Option 1: Embedded Binary (Default)

Server binary bundled with editor extension. Best for individual users.

**Pros**: Easy installation, works offline, no configuration
**Cons**: Platform-specific binaries needed

### Option 2: Remote Server (Enterprise)

Server runs in Docker/Kubernetes, editors connect via TCP.

**Pros**: Centralized updates, shared resources, enterprise features
**Cons**: Requires infrastructure, network dependency

See [LSP_SERVER_DEPLOYMENT.md](docs/LSP_SERVER_DEPLOYMENT.md) for details.

## 📊 Performance

- **Startup**: 50-200ms
- **Analysis**: 10-50ms per file
- **Memory**: 50-200 MB
- **Large Files**: Handles 100+ MB log files efficiently

## 🐛 Troubleshooting

### Server Not Starting

1. Check server binary exists: `ls clients/vscode/bin/`
2. Check executable permissions: `chmod +x clients/vscode/bin/log-scout-lsp-*`
3. View server logs: VS Code → Output → Log Scout Analyzer

### No Diagnostics Showing

1. Verify file extension is `.log` or recognized pattern
2. Check pattern configuration is loaded
3. Restart LSP server: VS Code Command Palette → "Reload Window"

### Performance Issues

1. Disable patterns you don't need
2. Increase detection threshold
3. Use file size limits in settings

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/log-scout-analyzer.git
cd log-scout-analyzer

# Build server
cd lsp-server
cargo build

# Test server
cargo test

# Run server locally
cargo run
```

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [tower-lsp](https://github.com/ebkalderon/tower-lsp)
- Inspired by rust-analyzer and other LSP servers
- Pattern engine based on production log analysis needs

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/log-scout-analyzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/log-scout-analyzer/discussions)
- **Documentation**: [docs/](docs/)

## 🗺️ Roadmap

- [ ] Additional VoIP protocol support (SIP, H.323, WebRTC)
- [ ] Machine learning-based anomaly detection
- [ ] Real-time log streaming support
- [ ] Web-based log viewer
- [ ] Jenkins/CI integration
- [ ] Cloud log source connectors (CloudWatch, Stackdriver)

## 📈 Status

**Version**: 1.0.0  
**Status**: Production Ready  
**Architecture**: LSP-based  
**Supported Editors**: VS Code, Zed, Neovim, Emacs, and more

---

## Migration from v0.0.x

If you were using the pre-LSP architecture (v0.0.x), see [archive/v1-pre-lsp/README.md](archive/v1-pre-lsp/README.md) for migration notes.

### What Changed

- **v0.0.x**: Separate extensions for each editor (TypeScript + Rust)
- **v1.0.0**: Unified LSP server, thin clients

### Benefits

✅ Code shared across all editors  
✅ Easier maintenance and updates  
✅ Better performance (Rust everywhere)  
✅ Support for more editors  
✅ Enterprise deployment options

---

**Built with ❤️ for log analysis**#   T e s t  
 