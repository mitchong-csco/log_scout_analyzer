---
trigger: always_on
---

This is a VS Code extension for analyzing Cisco UC log files (log bundles). Read these in order:

1. **README.md** - What the project does
2. **log_scout_analyzer\docs\user-scenarios** - What users want to accomplish

For detailed guides on specific topics, see `.ai/` directory (security, performance, testing, etc.)

## Development Workflow: STDD

**Scenario → Test (RED) → Code (GREEN) → Commit → CI**

```
1. Understand user scenario
2. Write failing test
3. Implement minimum code to pass
4. Commit with clear message
5. Push (GitHub Actions validates)
```

## UX First: Handle All States

Before coding any UI feature, design for:
- **Initial** - Nothing loaded yet (welcoming, not alarming)
- **Loading** - Show progress, allow cancel
- **Empty** - No data (✨ "Clean logs!" not ❌ "Error!")
- **Active** - Full functionality
- **Error** - Clear message + recovery action

# Git Workflow

```bash
# After tests pass (GREEN phase)
git add -A
git commit -m "feat: implement bundle import

- Add importPackage command
- Extract zip archives
- Display in tree view
- Tests: e2e/bundleImport.test.ts passes"

git push  # CI validates
```

## Version Management & Releases

**Single Source of Truth: Git Tags**

```bash
# Create release (triggers CI/CD)
git tag v0.1.11 -m "Release v0.1.11: Description"
git push origin v0.1.11

# CI automatically:
# - Updates Cargo.toml
# - Builds container image
# - Generates checksums & SBOM
# - Creates GitHub release
```

**Never manually edit version numbers** - Git tags drive everything.

See `lsp-server/VERSION_MANAGEMENT.md` for details.

## Communication

- ✅ Explain in chat
- ✅ Ask clarifying questions
- ❌ No session summary files
- ❌ No status update documents

## If You're Stuck

1. Read test output (don't guess)
2. Check LSP server logs
3. Ask user for clarification

---

**Focus:** Ship working code that users love, validated by tests.