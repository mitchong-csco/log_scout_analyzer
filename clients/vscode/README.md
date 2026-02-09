# Log Scout Analyzer for VS Code

Advanced log file analysis with SIP/VoIP pattern matching and RFC annotations.

## Features

- **Real-time Log Analysis** - Automatic pattern detection as you type
- **SIP/VoIP Support** - Specialized patterns for telecom logs (CUCM, IOS, Webex)
- **RFC Annotations** - Hover over SIP messages to see RFC references
- **Error Detection** - Highlights errors, warnings, and critical issues
- **Timeline Visualization** - Visual call flow diagrams
- **Universal** - Works with logs from any vendor (Cisco, Avaya, Asterisk, etc.)

## Installation

1. Install from VS Code Marketplace (search for "Log Scout Analyzer")
2. Open any `.log` file to activate
3. Analysis starts automatically

## Usage

### Automatic Analysis

Open any log file - the extension analyzes it automatically:
- Errors appear with red underlines
- Warnings appear with yellow underlines
- Hover over issues for details

### Commands

Access via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **Log Scout: Analyze Current Log File** - Run full analysis
- **Log Scout: Show Timeline Visualization** - Display call flow
- **Log Scout: Export Analysis Results** - Save results to JSON/text
- **Log Scout: Restart LSP Server** - Restart if needed

### Context Menu

Right-click in any log file:
- Analyze Current Log File
- Show Timeline Visualization
- Export Analysis Results

### Status Bar

Click the `$(search) Scout` icon in the status bar to analyze the current file.

## SIP/VoIP Features

### Supported Protocols

- SIP (Session Initiation Protocol) - RFC 3261
- SIP Methods: INVITE, BYE, ACK, CANCEL, REGISTER, OPTIONS, PRACK, UPDATE, REFER
- SIP Responses: 1xx-6xx with RFC annotations

### RFC Annotations

Hover over SIP messages to see:
- RFC reference (e.g., "RFC 3261 §13.1")
- Message description
- Usage notes
- Link to full RFC

**Example:**
```
Hover over "INVITE" shows:
┌─────────────────────────────────┐
│ SIP Method: INVITE              │
│ ───────────────────────────── │
│ 📖 RFC 3261 §13.1               │
│ Initiates a session             │
│ 🔗 View RFC                     │
└─────────────────────────────────┘
```

### Supported Log Formats

- Cisco CUCM SDL traces
- Cisco IOS/IOS-XE debug output
- Webex cloud logs
- Generic syslog format
- Custom log formats

## Configuration

Open Settings (`Ctrl+,` / `Cmd+,`) and search for "Log Scout":

### Basic Settings

```json
{
  "logScoutAnalyzer.patterns.enabled": true,
  "logScoutAnalyzer.rfcAnnotations.enabled": true,
  "logScoutAnalyzer.diagnostics.maxProblems": 1000
}
```

### Remote Server (Enterprise)

For centralized deployment:

```json
{
  "logScoutAnalyzer.serverHost": "log-scout.company.com",
  "logScoutAnalyzer.serverPort": 8080
}
```

Leave empty to use embedded server (default).

### Custom Patterns

Specify custom pattern file:

```json
{
  "logScoutAnalyzer.patterns.customFile": "/path/to/patterns.json"
}
```

### Debug Logging

Enable verbose logging:

```json
{
  "logScoutAnalyzer.trace.server": "verbose"
}
```

View logs: `Output` panel → Select "Log Scout Analyzer"

## Detected Patterns

### Errors

- ERROR, FATAL, CRITICAL messages
- Exceptions and stack traces
- Connection failures
- Timeouts
- Authentication failures

### Warnings

- WARNING messages
- Slow responses
- Retries and backoffs
- Deprecated features

### SIP-Specific

- Call setup failures (4xx/5xx responses)
- Registration issues
- Proxy authentication required (407)
- Busy/unavailable responses (486, 480)
- Server errors (503, 500)

## Examples

### Example 1: SIP Call Flow

```log
2024-02-08 10:15:23 Sending INVITE from alice@example.com to bob@example.com
2024-02-08 10:15:24 Received 180 Ringing
2024-02-08 10:15:26 Received 200 OK
2024-02-08 10:15:26 Sending ACK
```

**Analysis:**
- ✅ Successful call setup
- Setup time: 3 seconds
- Hover over "INVITE" for RFC 3261 §13.1
- Hover over "200 OK" for RFC 3261 §21.2.1

### Example 2: Call Failure

```log
2024-02-08 10:20:15 Sending INVITE to bob@example.com
2024-02-08 10:20:16 Received 486 Busy Here
```

**Analysis:**
- ❌ Error: Call failed - 486 Busy Here
- RFC 3261 §21.4.24: Called party is busy
- Diagnostic appears in Problems panel

## Troubleshooting

### Server Not Starting

1. Check Output panel: `View` → `Output` → Select "Log Scout Analyzer"
2. Verify server binary exists: `Ctrl+Shift+P` → "Developer: Open Extensions Folder"
3. Check file permissions on server binary
4. Restart VS Code

### No Diagnostics Showing

1. Verify file extension is `.log` or recognized pattern
2. Check language mode (bottom right): should be "Log"
3. Force language: Click language → Select "Log"
4. Restart LSP server: Command Palette → "Log Scout: Restart LSP Server"

### Performance Issues

1. Reduce max problems: Settings → `logScoutAnalyzer.diagnostics.maxProblems` → 500
2. Disable patterns temporarily: Settings → `logScoutAnalyzer.patterns.enabled` → false
3. For large files (>100MB), consider analyzing in chunks

## Requirements

- VS Code 1.75.0 or higher
- No other dependencies required

## Platform Support

- ✅ Windows (x64)
- ✅ macOS (Intel x64)
- ✅ macOS (Apple Silicon ARM64)
- ✅ Linux (x64)

## Privacy

- All analysis runs locally (no data sent to servers)
- Remote server mode is optional and user-configured
- No telemetry or tracking

## License

MIT License - See LICENSE file for details

## Support

- Issues: https://github.com/yourusername/log-scout-analyzer/issues
- Documentation: https://github.com/yourusername/log-scout-analyzer/wiki

## Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

## Changelog

See CHANGELOG.md for version history.

---

**Built with ❤️ for log analysis professionals**