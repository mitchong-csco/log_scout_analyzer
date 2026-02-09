# Change Log

All notable changes to the "Log Scout Analyzer" extension will be documented in this file.

## [0.2.0] - 2026-02-06

### Added
- **DevTools-Style Hybrid Interface**
  - Activity Bar icon for quick access
  - Three specialized tree views (Results, Categories, Timeline)
  - Scout Console with real-time output
  - Status bar integration with issue counts

- **Enhanced Jabber Log Support**
  - 20 specialized error patterns
  - 21 warning patterns
  - 18 info patterns
  - Full support for jabber.log and jabber_ui.log files
  - Detection for network, CUCM, SIP, authentication, and media issues

- **Advanced Features**
  - Timeline view with 15-minute interval grouping
  - Category-based issue isolation
  - Multiple grouping options (Severity, Category, File)
  - Export functionality for sharing results
  - Real-time console logging with timestamps

- **User Experience Improvements**
  - Click-to-navigate from tree views to source lines
  - Keyboard navigation support
  - Rich tooltips with code previews
  - Context menus for quick actions
  - "All Clear!" message when no issues found

### Changed
- Upgraded to professional workbench interface
- Improved pattern matching performance
- Enhanced webview panel with better filtering
- Updated documentation with comprehensive guides

### Fixed
- Improved handling of large log files
- Better timestamp extraction
- More accurate category detection

## [0.1.0] - 2026-02-05

### Added
- Initial release
- Basic pattern recognition for errors, warnings, and info
- Syntax highlighting for log files
- Diagnostics integration
- Configurable patterns
- Status bar button
- Basic webview results panel

### Features
- Automatic log file analysis
- Real-time diagnostics
- Problems panel integration
- Customizable regex patterns
- Support for common log formats

---

## Version Format

Format: [Major.Minor.Patch]
- **Major**: Breaking changes
- **Minor**: New features, backwards compatible
- **Patch**: Bug fixes

## Future Plans

### Planned for 0.3.0
- Additional log format presets (Apache, Nginx, etc.)
- Pattern library marketplace
- Performance optimizations for very large files
- Custom color schemes
- Graph visualization of issue trends

### Under Consideration
- Multi-file analysis
- Log file comparison
- Pattern suggestions based on ML
- Integration with external log services
- Team sharing of custom patterns

---

*For full documentation, see README.md and the included documentation files.*
