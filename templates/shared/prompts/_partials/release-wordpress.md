# Release — WordPress Plugin Partial

Version-bump and quality-check mechanics for **Silver Assist WordPress plugins**. Included by
`prepare-github-release` when the project is detected as a WordPress plugin. See the
`release-management` skill for full documentation and troubleshooting.

## Detection signal

- A `*.php` file with a plugin header (`* Version: X.Y.Z`) at the repo root, usually alongside a
  `composer.json` and often a `readme.txt`.

## Version source of truth

| File | What to update |
|------|----------------|
| Main plugin file | `* Version: X.Y.Z` header **and** the `VERSION` constant if defined |
| `readme.txt` | `Stable tag: X.Y.Z` (if present) |
| `composer.json` | `"version": "X.Y.Z"` (if present) |

Prefer the bundled script so every file stays in sync:

```bash
./scripts/update-version.sh X.Y.Z
# Some plugins ship the simple variant instead:
./scripts/update-version-simple.sh X.Y.Z
```

## Quality checks (run BEFORE bumping)

Do **not** proceed if any check fails:

```bash
./scripts/run-quality-checks.sh --skip-wp-setup phpcs phpstan
```

If the script is absent, fall back to the tools directly:

```bash
composer run phpcs   --if-present
composer run phpstan --if-present
composer run test    --if-present
```

## What the release usually produces

- **Distributable ZIP** — the GitHub Actions release workflow builds the plugin ZIP and attaches it
  to the GitHub Release. This almost always triggers on `on: release: [created|published]`, so a bare
  tag is typically **not** enough — confirm via the workflow-analysis step in the orchestrator.
- No npm publish; WordPress plugins are distributed as ZIP artifacts (and/or wordpress.org SVN).

## Notes

- Some plugins use `master` instead of `main` as the default branch (e.g.
  `silver-assist-post-revalidate`) — always verify with `gh repo view --json defaultBranchRef`.
- The plugin-header version is what WordPress and the release workflow read, so it must be committed
  before the tag/Release is created.
