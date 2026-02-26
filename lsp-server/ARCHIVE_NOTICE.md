# 📦 Archived LSP Server Code

## ⚠️ This is an Archive/Reference Copy

The **active development** of the LSP server has moved to a **separate repository**:

👉 **https://github.com/mitchong-csco/log-scout-lsp-server**

## 🎯 Purpose of This Folder

This `lsp-server/` folder serves as:

- ✅ **Historical reference** - Shows when LSP server was part of main repo
- ✅ **Archive copy** - Backup of source code at version 0.1.50
- ✅ **Documentation** - CI/CD setup guides remain useful
- ⚠️ **Not for active development** - Changes here won't be deployed

## 🚀 Active Repository

For LSP server development, use the separate repository:

```bash
# Clone the active repository
git clone https://github.com/mitchong-csco/log-scout-lsp-server.git
cd log-scout-lsp-server

# Current version
git tag -l  # Shows v0.1.50 and later releases
```

## 📍 Repository Structure

```
Separate Repos (Current):
├── log-scout-lsp-server/        ← LSP server (active)
│   ├── CI/CD workflows
│   ├── Container builds
│   └── Releases on GitHub
│
└── log_scout_analyzer/          ← This repo
    ├── vscode-extension/        ← VSCode extension (active)
    ├── lsp-server/              ← Archive copy (this folder)
    └── Other tools
```

## 🔄 Why Separate?

1. **Independent versioning** - LSP and extension evolve separately
2. **Cleaner CI/CD** - Each repo has its own release pipeline
3. **Container-first** - LSP server deployed as container image
4. **Enterprise pattern** - Standard for language server projects
5. **Smaller repos** - Faster clones and better organization

## 🐳 Using the LSP Server

Pull the container from the active repository's releases:

```bash
# Latest release
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:latest

# Specific version
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server:0.1.50

# Immutable digest (recommended)
docker pull ghcr.io/mitchong-csco/log-scout-lsp-server@sha256:...
```

## 📚 Documentation Still Valid

The following docs in this folder remain useful:

- `VERSION_MANAGEMENT.md` - How versioning works
- `RELEASE_GUIDE.md` - Release process
- `CI_CD_SETUP.md` - CI/CD overview

These principles apply to the **separate repository**.

## 🏷️ Version History

- **v0.1.50** - Last version before full separation (2026-02-25)
- **v0.1.10** - Version at time of extraction
- **Earlier** - Part of main repository

## ⚡ Quick Links

- **Active Repo**: https://github.com/mitchong-csco/log-scout-lsp-server
- **Container Registry**: https://github.com/mitchong-csco/log-scout-lsp-server/pkgs/container/log-scout-lsp-server
- **Releases**: https://github.com/mitchong-csco/log-scout-lsp-server/releases

---

**Status**: 📦 Archived as of v0.1.50 (February 25, 2026)

**Active Development**: 🚀 https://github.com/mitchong-csco/log-scout-lsp-server