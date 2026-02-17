# Log Scout Analyzer - Zed Extension

Best-effort parity with the VS Code extension using the shared LSP server.

## What Works Now

- LSP-based diagnostics from the shared server.
- Hover data (as provided by the LSP server).
- Bundled LSP server binary lookup.

## UI Parity Notes

Zed does not expose VS Code-style webviews/panels in this repo. That means:
- Tree views, dashboards, and timeline panels are not available.
- The extension focuses on diagnostics + hover + LSP metadata.

If Zed adds panel/webview APIs later, we can map the VS Code UI to them.

## LSP Server Lookup Order

1. LOG_SCOUT_LSP_PATH (explicit override)
2. ZED_EXTENSION_DIR/bin/<platform-binary>
3. log-scout-lsp-server on PATH

Platform binary names:
- Windows: log-scout-lsp-server-win.exe
- macOS: log-scout-lsp-server-mac
- Linux: log-scout-lsp-server-linux

## Bundling the LSP Server

The package script bundles the LSP server binary into the extension.
You must build the LSP server first:

```bash
cd ../lsp-server
cargo build --release
```

Then package the Zed extension:

```bash
cd ../zed-extension
bash package.sh
```

## Manual Override

If you want to point to a custom LSP binary:

```bash
export LOG_SCOUT_LSP_PATH=/path/to/log-scout-lsp-server
```

## Troubleshooting

- If diagnostics do not appear, verify the LSP binary is present in bin/.
- Run verify-extension.sh to confirm installation.
