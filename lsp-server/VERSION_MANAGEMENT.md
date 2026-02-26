# Version Management - Single Source of Truth

## 📍 Single Source of Truth: **Git Tags**

The **version number lives in git tags** and flows downstream to all other locations.

```
Git Tag (v0.1.10)
    ↓
    ├─→ Cargo.toml (updated by CI)
    ├─→ Container Image Tag (ghcr.io/.../log-scout-lsp-server:0.1.10)
    ├─→ GitHub Release (v0.1.10)
    └─→ Binary Version (env!("CARGO_PKG_VERSION") reads Cargo.toml)
```

## 🎯 How It Works

### 1. **Developer Creates Tag**
```bash
# Create and push a new version tag
git tag v0.1.11
git push origin v0.1.11
```

### 2. **CI Takes Over** (GitHub Actions)
```yaml
# .github/workflows/release.yml triggers on tag push
on:
  push:
    tags:
      - 'v*'

# CI extracts version from tag
VERSION=${GITHUB_REF#refs/tags/v}  # v0.1.11 → 0.1.11

# CI updates Cargo.toml
sed -i "s/^version = .*/version = \"$VERSION\"/" Cargo.toml
```

### 3. **Build Embeds Version**
```rust
// src/server.rs
server_info: Some(ServerInfo {
    name: "Log Scout Analyzer".to_string(),
    version: Some(env!("CARGO_PKG_VERSION").to_string()),  // Reads from Cargo.toml
}),
```

### 4. **Container Gets Tagged**
```bash
# CI builds and pushes container with version tag
docker build -t ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11 .
docker push ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11
```

### 5. **Hash Verification**
```bash
# CI generates immutable digest
Image Digest: sha256:abc123...def456

# Users can verify
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:abc123...def456
```

## 📋 Complete Release Process

```bash
# 1. Developer: Commit your changes
git add -A
git commit -m "feat: add new pattern engine"
git push

# 2. Developer: Create version tag when ready to release
git tag v0.1.11 -m "Release v0.1.11: Add new pattern engine"
git push origin v0.1.11

# 3. CI: Automatically runs (you just wait ☕)
#    - Extracts version from tag
#    - Updates Cargo.toml
#    - Builds container
#    - Generates checksums
#    - Creates SBOM
#    - Pushes to container registry
#    - Creates GitHub release with artifacts

# 4. Users: Pull the verified container
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11
```

## 🔍 Verification System

### Container Digest (SHA256)
```bash
# Immutable reference to exact image
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:abc123...

# Verify digest matches
docker inspect ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11 \
  --format='{{.RepoDigests}}'
```

### Checksums File
Every release includes `checksums.txt`:
```
Version: 0.1.11
Git Commit: abc123def456
Image Digest: sha256:xyz789...
Built At: 2026-02-25T12:34:56Z
Built By: GitHub Actions
Workflow Run: https://github.com/.../actions/runs/12345
```

### SBOM (Software Bill of Materials)
Every release includes `sbom-0.1.11.spdx.json`:
- Complete list of all dependencies
- Versions and licenses
- Security scanning ready

## 📂 File Locations

```
Source Repository (log_scout_analyzer/lsp-server/)
├── Cargo.toml                     ← Base version (0.1.10)
│                                     Updated by CI on release
├── .github/workflows/
│   ├── release.yml                ← Triggers on git tags (v*)
│   └── ci.yml                     ← Runs on every push
└── src/
    └── server.rs                  ← Reads version from Cargo.toml

GitHub Releases
├── v0.1.10/
│   ├── checksums.txt              ← Verification info
│   ├── sbom-0.1.10.spdx.json      ← Software Bill of Materials
│   └── Source code (zip/tar.gz)   ← Tagged source

Container Registry (ghcr.io)
└── mitchong-csco/log-scout-lsp-server
    ├── 0.1.10                     ← Mutable tag
    ├── 0.1                        ← Major.minor tag
    ├── sha256:abc123...           ← Immutable digest
    └── latest                     ← Points to newest
```

## 🚫 What NOT to Do

```bash
# ❌ DON'T manually edit version in Cargo.toml before every commit
# ❌ DON'T increment version on every build
# ❌ DON'T store version in multiple places
# ❌ DON'T forget to push tags

# ✅ DO let git tags drive versioning
# ✅ DO let CI handle the rest
# ✅ DO use semantic versioning
# ✅ DO verify with digests
```

## 📊 Version History Tracking

```bash
# See all releases
git tag -l

# See what changed in a release
git show v0.1.11

# Compare two releases
git diff v0.1.10..v0.1.11

# See who created a tag
git tag -v v0.1.11
```

## 🔐 Security: Why This Matters

1. **Reproducible Builds**
   - Anyone can verify version 0.1.11 matches git tag v0.1.11
   - Container digest proves exact binary content

2. **Tamper Detection**
   - SHA256 digest changes if image is modified
   - Git tag can't be changed (unless force-pushed)

3. **Audit Trail**
   - GitHub Actions logs show exact build process
   - SBOM lists every dependency version

4. **Supply Chain Security**
   - Know exactly what's in every release
   - Detect compromised dependencies

## 🎓 Semantic Versioning

Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

```bash
# Bug fix (0.1.10 → 0.1.11)
git tag v0.1.11

# New feature, backward compatible (0.1.11 → 0.2.0)
git tag v0.2.0

# Breaking change (0.2.0 → 1.0.0)
git tag v1.0.0

# Pre-release (1.0.0 → 1.0.0-beta.1)
git tag v1.0.0-beta.1

# Build metadata (informational only)
# Container gets: 1.0.0+build.20260225.abc123
```

## 🔄 Development vs Release Versions

```
Development (no tag)
├── Cargo.toml: version = "0.1.10"
└── Binary reports: v0.1.10

Release (git tag v0.1.11)
├── CI updates Cargo.toml → version = "0.1.11"
├── Binary reports: v0.1.11
└── Container tagged: 0.1.11
```

## 🚀 Quick Reference

| Task | Command |
|------|---------|
| Create release | `git tag v0.1.11 && git push origin v0.1.11` |
| List releases | `git tag -l` |
| Delete tag | `git tag -d v0.1.11 && git push origin :refs/tags/v0.1.11` |
| Pull container | `docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11` |
| Verify digest | `docker inspect IMAGE --format='{{.RepoDigests}}'` |
| Check version | `docker run --rm IMAGE --version` |

## 💡 Best Practices

1. **Tag at milestones** - Don't tag every commit
2. **Use annotated tags** - `git tag -a v0.1.11 -m "Release message"`
3. **Write release notes** - Auto-generated by GitHub Actions
4. **Test before tagging** - CI runs on every push
5. **Never delete tags** - They're your version history
6. **Always verify digests** - Use `@sha256:...` when pulling

---

**Remember:** Git tags are the source of truth. Everything else follows.