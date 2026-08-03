---
name: release-management
description: Create and manage npm releases for the agents-toolkit package. Covers version bumping, CHANGELOG updates, GitHub Actions release workflow, npm publish, and immutable tag rules. Use when creating releases or troubleshooting the release pipeline.
---

# Release Management — agents-toolkit

This skill covers the release pipeline for `@silverassist/agents-toolkit`, an npm package distributed via GitHub Packages and npm.

## When to Use

- Creating a new release
- Bumping the version number
- Updating the CHANGELOG
- Troubleshooting a failed release workflow
- Understanding the publish pipeline

---

## Architecture Overview

```text
agents-toolkit/
├── package.json             # Version number lives here
├── src/index.js             # VERSION constant (must match package.json)
├── CHANGELOG.md             # Follows Keep a Changelog format
└── .github/
    └── workflows/
        ├── ci.yml           # Tests on PRs and pushes
        └── publish.yml      # Publishes to npm on tag push
```

---

## ⚠️ CRITICAL: Immutable Tags

Once a tag is pushed to GitHub, that version **CANNOT be reused** — not on GitHub, not on npm.

```bash
# ❌ NEVER create releases manually
gh release create v2.4.0 --title "..."   # May conflict with workflow

# ✅ CORRECT — push the tag, let the workflow create the release
git tag v2.4.0 -m "Release v2.4.0"
git push origin v2.4.0
```

If a release fails after the tag is pushed: **increment the version** and start over.

---

## Release Workflow (Step by Step)

### Step 1: Bump Version

Update **two places** — they must stay in sync:

**`package.json`:**

```json
{
  "version": "2.4.0"
}
```

**`src/index.js`:**

```js
export const VERSION = "2.4.0";
```

### Step 2: Update CHANGELOG.md

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [2.4.0] - YYYY-MM-DD

### Added
- New features or prompts...

### Changed
- Changes to existing behaviour...

### Fixed
- Bug fixes...

### Removed
- Removed features...
```

Valid categories: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.

### Step 3: Run Tests and Verify

```bash
npm test
npm pack --dry-run   # Preview what will be published
```

Verify the `npm pack --dry-run` output only includes:

- `bin/`, `src/index.js`, `templates/`, `README.md`, `LICENSE`

### Step 4: Commit and Push

```bash
git add package.json src/index.js CHANGELOG.md
git commit -m "chore: bump version to 2.4.0 for release"
git push origin main
```

### Step 5: Create Tag (Triggers the Release)

```bash
git tag v2.4.0 -m "Release v2.4.0"
git push origin v2.4.0
```

### Step 6: Monitor Workflow

```bash
GH_PAGER=cat gh run list --workflow=publish.yml --limit 3
GH_PAGER=cat gh run watch <run-id> --exit-status
```

---

## Files Included in the Package

Controlled by the `files` field in `package.json`:

```json
"files": [
  "bin",
  "src/index.js",
  "templates",
  "README.md",
  "LICENSE"
]
```

**Never publish:** `src/cli.test.js`, `.github/`, `.agents/`, `.claude/`, `node_modules/`

---

## Verifying a Release

```bash
# Check published version
npm view @silverassist/agents-toolkit version

# Test install
npm install -g @silverassist/agents-toolkit@2.4.0
agents-toolkit --version

# List all published versions
npm view @silverassist/agents-toolkit versions --json | cat
```

---

## Rollback Strategy

npm does **not support** unpublishing packages older than 72 hours. Options:

1. **Patch release**: publish `v2.4.1` with the fix immediately
2. **Deprecate**: `npm deprecate @silverassist/agents-toolkit@2.4.0 "Use 2.4.1"`
3. **Within 72h**: `npm unpublish @silverassist/agents-toolkit@2.4.0`

---

## Version Policy

| Bump | When |
|------|------|
| MAJOR (3.0.0) | Breaking CLI changes, removed commands, incompatible output format |
| MINOR (2.x.0) | New prompts, new instructions, new skills, new `--target` modes |
| PATCH (2.3.x) | Bug fixes, typos, documentation updates |
