# Release Guide - Quick Start

## 🚀 How to Create a Release

### Prerequisites
- ✅ All tests passing (`cargo test`)
- ✅ Code committed and pushed to `main`
- ✅ Ready to release

### Release Process (3 Steps)

```bash
# 1. Create and push a git tag
git tag v0.1.11 -m "Release v0.1.11: Brief description"
git push origin v0.1.11

# 2. Wait for CI to complete (5-10 minutes)
# Watch: https://github.com/YOUR_ORG/log-scout-analyzer/actions

# 3. Done! 🎉
# - Container published to ghcr.io
# - GitHub release created with checksums
# - SBOM generated
```

That's it! CI handles everything else.

---

## 🔍 What Happens Automatically

When you push a tag, GitHub Actions:

1. **Extracts version** from tag (`v0.1.11` → `0.1.11`)
2. **Updates Cargo.toml** with the version
3. **Builds Docker container** 
4. **Generates checksums** (SHA256 digest)
5. **Creates SBOM** (Software Bill of Materials)
6. **Pushes to registry** (`ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11`)
7. **Creates GitHub Release** with all artifacts

---

## 📦 Using the Release

### Pull the Container

```bash
# By version tag (mutable)
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11

# By digest (immutable - recommended for production)
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:abc123...
```

### Verify the Image

```bash
# Check the digest matches the release
docker inspect ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11 \
  --format='{{.RepoDigests}}'
```

Compare with the digest in the GitHub Release's `checksums.txt`.

---

## 🏷️ Version Numbering (SemVer)

Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

```bash
# Patch release (bug fixes only)
0.1.10 → 0.1.11
git tag v0.1.11

# Minor release (new features, backward compatible)
0.1.11 → 0.2.0
git tag v0.2.0

# Major release (breaking changes)
0.2.0 → 1.0.0
git tag v1.0.0

# Pre-release (testing)
1.0.0 → 1.0.0-beta.1
git tag v1.0.0-beta.1
```

---

## 🔧 Troubleshooting

### CI Fails After Tagging

```bash
# Delete the tag locally and remotely
git tag -d v0.1.11
git push origin :refs/tags/v0.1.11

# Fix the issue, commit, then re-tag
git commit -m "fix: resolve build issue"
git push
git tag v0.1.11
git push origin v0.1.11
```

### Need to Update a Release

**Don't reuse tags!** Create a new patch version instead:

```bash
# Wrong: Delete and recreate same tag ❌
git tag -d v0.1.11
git push origin :refs/tags/v0.1.11
git tag v0.1.11  # DON'T DO THIS

# Right: Create new patch version ✅
git tag v0.1.12 -m "Release v0.1.12: Fix from v0.1.11"
git push origin v0.1.12
```

### Check What Will Be Released

```bash
# See commits since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# See file changes
git diff $(git describe --tags --abbrev=0)..HEAD --stat
```

---

## 📋 Release Checklist

Before creating a tag:

- [ ] All tests pass locally (`cargo test`)
- [ ] Code builds successfully (`cargo build --release`)
- [ ] Changes committed and pushed
- [ ] CI passing on `main` branch
- [ ] Release notes ready (optional, CI auto-generates)
- [ ] Version number follows SemVer

After tagging:

- [ ] CI workflow completes successfully
- [ ] GitHub Release created
- [ ] Container image available in registry
- [ ] Test the container works: `docker run --rm IMAGE:VERSION --version`

---

## 🔐 Security Notes

### Checksums

Every release includes `checksums.txt` with:
- Container image digest (SHA256)
- Git commit hash
- Build timestamp
- CI workflow run URL

### SBOM (Software Bill of Materials)

Every release includes `sbom-VERSION.spdx.json` with:
- Complete dependency list
- Versions and licenses
- Security scanning ready

### Verification

```bash
# Always verify in production
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:DIGEST

# Not just by tag
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11  # Mutable!
```

---

## 📚 Examples

### Patch Release (Bug Fix)

```bash
git commit -m "fix: resolve memory leak in pattern engine"
git push
git tag v0.1.11 -m "Release v0.1.11: Fix memory leak"
git push origin v0.1.11
```

### Minor Release (New Feature)

```bash
git commit -m "feat: add support for JSON log parsing"
git push
git tag v0.2.0 -m "Release v0.2.0: Add JSON parsing"
git push origin v0.2.0
```

### Pre-Release (Beta)

```bash
git commit -m "feat: experimental AI-powered pattern detection"
git push
git tag v1.0.0-beta.1 -m "Beta 1: AI pattern detection"
git push origin v1.0.0-beta.1
```

---

## 🎯 Best Practices

1. **Tag from `main` branch** - Always release from stable branch
2. **Use annotated tags** - `git tag -a v0.1.11 -m "Message"`
3. **Write clear messages** - Describe what's new
4. **Test before tagging** - CI runs automatically, but test locally first
5. **Never delete tags** - They're permanent version history
6. **Use digests in production** - Tags can be moved, digests can't

---

## 🔗 Links

- **Version Management Details**: `VERSION_MANAGEMENT.md`
- **GitHub Actions**: `.github/workflows/release.yml`
- **Container Registry**: https://github.com/orgs/mitchong-csco/packages
- **Semantic Versioning**: https://semver.org/

---

**Remember:** One tag = One release. CI does the rest! 🚀