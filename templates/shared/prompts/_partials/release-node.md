# Release — Node / npm Partial

Version-bump and quality-check mechanics for **Node.js / npm packages** (anything with a
`package.json`). Included by `prepare-github-release` when the project is detected as a Node package.

## Detection signal

- A `package.json` exists at the repo root **and** there is no WordPress plugin header
  (`*.php` file with a `Version:` plugin header). If both are present, prefer the WordPress partial.

## Version source of truth

| File | What to update |
|------|----------------|
| `package.json` | `"version": "X.Y.Z"` |
| `package-lock.json` | top-level `version` **and** the root package entry under `packages[""].version` |

Prefer the npm tooling so both files stay in sync automatically:

```bash
# Bumps package.json + package-lock.json and (by default) creates a commit + tag.
# Use --no-git-tag-version to keep the version change uncommitted so it can go in the release branch/PR.
npm version X.Y.Z --no-git-tag-version
```

If you edit `package.json` by hand instead, re-sync the lockfile without touching dependencies:

```bash
npm install --package-lock-only
```

## Quality checks (run BEFORE bumping)

Inspect `package.json` `scripts` and run whatever exists — do not assume script names:

```bash
npm ci                       # clean install when a lockfile is present (CI parity)
npm test --if-present
npm run lint --if-present
npm run type-check --if-present
npm run build --if-present
```

Do **not** proceed if any check fails.

## What the release usually produces

- **npm publish** — most Node packages publish to the npm registry. The publish step almost always
  lives in a workflow triggered by a GitHub Release (`on: release: [created|published]`) or a tag
  push — confirm via the workflow-analysis step in the orchestrator before assuming a bare tag is enough.
- Optional build artifacts (bundled `dist/`, types) attached to the Release.

## Notes

- `private: true` in `package.json` means the package is **not** published to npm — the release is
  tag/GitHub-Release only. Surface this to the user.
- The npm version in `package.json` is the source of truth that `publish.yml`-style workflows read,
  so it must be committed before the tag/Release is created.
