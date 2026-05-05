---
description: Prepare a new release for a Silver Assist WordPress plugin (version bump, changelog, tag, PR)
agent: agent
tools:
  - run_in_terminal
  - read_file
  - replace_string_in_file
  - create_file
---

# Prepare Release

Prepare a new version release for the current Silver Assist plugin.

## Inputs

Ask the user:
1. **Version type** — Is this a `patch`, `minor`, or `major` release? (default: patch)
2. **Changelog entry** — What changed? (or offer to generate from recent commits)

## Steps

1. **Detect plugin** — Find the plugin root, main plugin file, and current version.

2. **Determine new version** — Based on the version type, calculate the next semantic version.

3. **Run quality checks** — Execute `./scripts/run-quality-checks.sh --skip-wp-setup phpcs phpstan` to verify the code is clean before release. Do NOT proceed if checks fail.

4. **Update version** — Run the version update script:
   ```bash
   ./scripts/update-version.sh X.Y.Z
   ```
   Or if the plugin uses the simple variant:
   ```bash
   ./scripts/update-version-simple.sh X.Y.Z
   ```
   This updates the version in the main plugin file, `readme.txt` (if present), and `composer.json`.

5. **Update CHANGELOG.md** — Add a new entry at the top following this format:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added/Changed/Fixed
   - Description of change
   ```

6. **Create release branch and commit** — Following the branch naming convention:
   ```bash
   git checkout -b release/vX.Y.Z
   git add -A
   git commit -m "chore: bump version to X.Y.Z"
   ```

7. **Push and create PR** — Push the branch and create a PR:
   ```bash
   git push origin release/vX.Y.Z
   gh pr create --title "Release vX.Y.Z" --body "## Changes\n\n- changelog entry" | cat
   ```

8. **Post-merge instructions** — Remind the user:
   - After merging the PR, create the tag from the main/master branch:
     ```bash
     git checkout main && git pull
     git tag vX.Y.Z
     git push origin vX.Y.Z
     ```
   - The GitHub Actions release workflow will automatically build the ZIP and create the GitHub Release.

## Important

- **NEVER reuse an existing tag** — tags are immutable. If a tag exists, bump to the next version.
- The release-management skill has full documentation — use it for troubleshooting.
- Some plugins use `master` instead of `main` (e.g., silver-assist-post-revalidate).
- Always verify the default branch with `git branch --show-current` or `gh repo view --json defaultBranchRef | cat`.
