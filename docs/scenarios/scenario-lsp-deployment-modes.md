# Scenario: LSP Deployment Modes

## Overview
Extension supports three LSP server deployment modes based on user configuration.

## Scenarios

### Scenario 1: Local Binary Mode (Default)
**Setup:**
- `lsp.useContainer`: false
- `lsp.serverHost`: ""

**Behavior:**
- Extension downloads LSP binary on first use
- Starts LSP server as local process (stdio)
- Works offline after initial download
- Fast startup (~1-2 seconds)

**Test:**
- Install extension → binary auto-downloads
- Open log file → diagnostics appear
- No network required after download

---

### Scenario 2: Container Mode (Local)
**Setup:**
- `lsp.useContainer`: true
- `lsp.containerImage`: "ghcr.io/mitchong-csco/log-scout-lsp-server:latest"

**Behavior:**
- Extension pulls container image if not present
- Spawns container with stdio pipes
- Auto-updates via Watchtower (if deployed)

**Test:**
- Enable container mode → image pulls
- Open log file → diagnostics work
- Fallback to binary if container fails

---

### Scenario 3: Remote Server Mode (TCP)
**Setup:**
- `lsp.serverHost`: "mitchong-podman"
- `lsp.serverPort`: 8080

**Behavior:**
- Extension connects to remote LSP via TCP
- Multiple clients can connect
- Shared pattern cache across team

**Test:**
- Configure remote host → connects via TCP
- Network disconnect → shows error
- Reconnects when network restored

**Note:** Requires TCP mode in LSP server (not yet implemented)

---

### Scenario 4: VS Code Server + Local Binary
**Setup:**
- VS Code Server running on remote machine
- Extension installed on server
- `lsp.useContainer`: false

**Architecture:**
```
Laptop → VS Code Server → LSP Binary (same machine)
```

**Test:**
- Connect to VS Code Server
- Binary downloads to server filesystem
- Zero network latency (all local)

---

### Scenario 5: VS Code Server + Container
**Setup:**
- VS Code Server on mitchong-podman
- `lsp.useContainer`: true
- Podman already installed

**Behavior:**
- Should detect existing container from Watchtower
- Reuse running container instead of spawning new one

**Test:**
- Check if container already running
- Attach to existing vs. spawn new

---

### Scenario 6: VS Code Server + Remote TCP
**Setup:**
- VS Code Server on machine A
- LSP Server on machine B (TCP)

**Architecture:**
```
Laptop → VS Code Server → TCP → LSP Server (different machine)
```

**Test:**
- Cross-machine communication
- Network latency handling
- Multiple VS Code Server instances sharing one LSP

---

## Key Questions

1. **Container Detection**: How to detect and reuse existing container?
2. **TCP Mode**: When to implement TCP support in LSP server?
3. **Fallback Strategy**: What's the fallback chain? (Container → Binary → Error)
4. **Configuration Hot Reload**: Switching modes without reloading VS Code?