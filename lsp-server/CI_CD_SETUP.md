# CI/CD Setup Complete ✅

## 📍 Single Source of Truth: **Git Tags**

Version numbers live in **git tags only**. Everything else is automatically derived.

```
Git Tag (v0.1.11)
    ↓
    ├─→ Cargo.toml (CI updates)
    ├─→ Container Image (ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11)
    ├─→ GitHub Release
    └─→ Binary Version (reads from Cargo.toml at compile time)
```

---

## 🚀 How to Release

### Three Simple Steps

```bash
# 1. Create and push a git tag
git tag v0.1.11 -m "Release v0.1.11: Brief description"
git push origin v0.1.11

# 2. Wait for CI (5-10 minutes)
# Watch: https://github.com/YOUR_ORG/log-scout-analyzer/actions

# 3. Done! 🎉
```

**That's it!** No manual version editing. No manual builds. CI handles everything.

---

## 🤖 What CI Does Automatically

When you push a tag starting with `v*`:

1. ✅ Extracts version (`v0.1.11` → `0.1.11`)
2. ✅ Updates `Cargo.toml` with version
3. ✅ Builds Docker container
4. ✅ Generates SHA256 digest (hash verification)
5. ✅ Creates SBOM (Software Bill of Materials)
6. ✅ Pushes to container registry
7. ✅ Creates GitHub Release with:
   - `checksums.txt` (digest, commit, build info)
   - `sbom-VERSION.spdx.json` (all dependencies)
   - Auto-generated release notes

---

## 📦 Files Created

```
lsp-server/
├── .github/workflows/
│   ├── release.yml          ← Triggers on git tags (v*)
│   └── ci.yml               ← Runs on every push (tests, builds)
├── Dockerfile               ← Container build definition
├── .dockerignore            ← Excludes unnecessary files
├── VERSION_MANAGEMENT.md    ← Detailed version documentation
├── RELEASE_GUIDE.md         ← Quick start guide for releases
└── CI_CD_SETUP.md          ← This file
```

---

## 🔐 Hash Verification

### Container Image Digest (Immutable)

Every release includes a SHA256 digest:

```bash
# Stored in checksums.txt
Image Digest: sha256:abc123def456...

# Pull by digest (can't be tampered with)
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:abc123...

# Verify digest
docker inspect IMAGE:TAG --format='{{.RepoDigests}}'
```

### Verification Files

Each release includes:

- **checksums.txt** - Image digest, git commit, build timestamp, CI run URL
- **sbom-VERSION.spdx.json** - Complete dependency list with versions

---

## 🎯 Example Release Workflow

```bash
# Developer: Make changes
git add -A
git commit -m "feat: add new pattern matching algorithm"
git push

# CI: Runs tests automatically (ci.yml)
# ✓ cargo fmt check
# ✓ cargo clippy
# ✓ cargo test
# ✓ cargo build --release
# ✓ docker build (test)

# Developer: Ready to release
git tag v0.1.11 -m "Release v0.1.11: Improved pattern matching"
git push origin v0.1.11

# CI: Runs release workflow (release.yml)
# ✓ Extract version from tag
# ✓ Update Cargo.toml
# ✓ Build container
# ✓ Generate digest
# ✓ Create SBOM
# ✓ Push to ghcr.io
# ✓ Create GitHub Release

# Users: Pull verified container
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11
```

---

## 🛡️ Security Features

### 1. Reproducible Builds
- Git tag = Exact source code
- Container digest = Exact binary content
- Anyone can verify version matches

### 2. Tamper Detection
- SHA256 digest changes if image modified
- Can't change git tags (unless force-pushed)

### 3. Audit Trail
- GitHub Actions logs show complete build process
- SBOM lists every dependency version
- CI workflow URL in checksums.txt

### 4. Supply Chain Security
- Know exactly what's in each release
- Detect compromised dependencies
- SPDX format for security scanning tools

---

## 📋 AI Rules Updated

Added to `.windsurf/rules/rules.md`:

```markdown
## Version Management & Releases

**Single Source of Truth: Git Tags**

# Create release (triggers CI/CD)
git tag v0.1.11 -m "Release v0.1.11: Description"
git push origin v0.1.11

**Never manually edit version numbers** - Git tags drive everything.
```

---

## 🔄 Development vs Release

### Development (No Tag)

```toml
# Cargo.toml stays at base version
version = "0.1.10"
```

Binary reports: `v0.1.10`

### Release (Push Tag v0.1.11)

```bash
# CI updates Cargo.toml
version = "0.1.11"
```

- Binary reports: `v0.1.11`
- Container tagged: `0.1.11`
- GitHub release: `v0.1.11`

---

## 🏷️ Semantic Versioning

Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

```bash
# Bug fix (0.1.10 → 0.1.11)
git tag v0.1.11

# New feature (0.1.11 → 0.2.0)
git tag v0.2.0

# Breaking change (0.2.0 → 1.0.0)
git tag v1.0.0

# Pre-release (1.0.0-beta.1)
git tag v1.0.0-beta.1
```

---

## ✅ Verification Steps

After release completes:

```bash
# 1. Check GitHub Release page
https://github.com/YOUR_ORG/log-scout-analyzer/releases

# 2. Verify container is available
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11

# 3. Check version
docker run --rm ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.11 --version

# 4. Verify digest matches checksums.txt
docker inspect IMAGE:TAG --format='{{.RepoDigests}}'
```

---

## 🚫 What NOT to Do

```bash
# ❌ DON'T manually edit Cargo.toml version
# ❌ DON'T increment version on every commit
# ❌ DON'T build containers manually
# ❌ DON'T push containers manually
# ❌ DON'T forget to push tags

# ✅ DO create git tags for releases
# ✅ DO let CI handle everything else
# ✅ DO verify digests in production
# ✅ DO use semantic versioning
# ✅ DO check CI logs if something fails
```

---

## 🎓 Where Version Lives

| Location | Source | Updated By |
|----------|--------|------------|
| **Git Tag** | `git tag v0.1.11` | **Developer** ⭐ |
| Cargo.toml | `version = "0.1.11"` | CI (on release) |
| Binary | `env!("CARGO_PKG_VERSION")` | Rust compiler |
| Container Tag | `ghcr.io/.../lsp:0.1.11` | CI |
| Container Digest | `sha256:abc123...` | Docker build |
| GitHub Release | `v0.1.11` | CI |

**Only the git tag is created manually. Everything else is automatic.**

---

## 🔗 Quick Links

- **Release Guide**: `RELEASE_GUIDE.md` (step-by-step instructions)
- **Version Details**: `VERSION_MANAGEMENT.md` (complete documentation)
- **CI Workflows**: `.github/workflows/` (GitHub Actions configuration)
- **Container Registry**: https://github.com/orgs/mitchong-csco/packages

---

## 💡 Key Takeaways

1. **Git tags are the ONLY source of truth**
2. **CI automatically handles all versioning**
3. **Hashes verify container integrity**
4. **SBOM provides security transparency**
5. **Never manually edit version numbers**

---

**Status:** ✅ CI/CD fully configured and ready to use!

**Next Step:** Create your first release: `git tag v0.1.11 && git push origin v0.1.11`
