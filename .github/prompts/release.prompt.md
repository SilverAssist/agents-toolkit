---
description: "Prepare and validate a new release for agents-toolkit"
agent: agent
---

# Release Preparation for agents-toolkit

Prepare a new release following the checklist below. **DO NOT publish to npm directly** — use the GitHub Release workflow.

## Release Version

Target version: `{version}`

---

## Pre-Release Checklist

### 1. Version Consistency Check

Verify the version is consistent across all files:

- [ ] `package.json` → `version` field
- [ ] `src/index.js` → `VERSION` constant
- [ ] `CHANGELOG.md` → Has entry for `[{version}]` with current date

**Action:** Read all three files and compare versions. If mismatched, update them to `{version}`.

### 2. CHANGELOG Validation

- [ ] `CHANGELOG.md` has an entry for version `{version}`
- [ ] Entry includes the current date in format `YYYY-MM-DD`
- [ ] All changes are documented under appropriate sections (Added/Changed/Fixed/Removed)

### 3. Package.json Validation

Verify `package.json` has correct configuration:

- [ ] `name` is `@silverassist/agents-toolkit`
- [ ] `version` matches target version
- [ ] `files` array includes: `bin`, `src`, `templates`, `README.md`, `LICENSE`
- [ ] `main` points to `src/index.js`
- [ ] `bin` points to `bin/cli.js`
- [ ] `type` is `module`
- [ ] `engines.node` is `>=18.0.0`

### 4. Run Tests

```bash
npm test
```

- [ ] All tests pass (or no tests configured)

### 5. Verify CLI Works

```bash
node bin/cli.js list
node bin/cli.js install --dry-run
```

- [ ] `list` command shows all prompts
- [ ] `install --dry-run` shows expected files

### 6. Check Package Contents

```bash
npm pack --dry-run
```

- [ ] All expected files are included
- [ ] No unnecessary files (node_modules, .git, etc.)

### 7. Dry Run Publish

```bash
npm publish --dry-run
```

- [ ] No errors
- [ ] Package size is reasonable

### 8. Git Status Check

```bash
git status
```

- [ ] No uncommitted changes
- [ ] Working directory is clean

### 9. Verify Branch

```bash
git branch --show-current
```

- [ ] On `main` branch
- [ ] Branch is up to date with remote

---

## Release Process

**⚠️ DO NOT run `npm publish` locally!**

1. Commit all changes:
   ```bash
   git add -A
   git commit -m "chore: prepare release v{version}"
   git push origin main
   ```

2. Create a GitHub Release:
   - Go to: https://github.com/SilverAssist/copilot-prompts-kit/releases/new
   - Tag: `v{version}` (create new tag)
   - Title: `v{version}`
   - Description: Copy from CHANGELOG.md
   - Click "Publish release"

3. The `publish.yml` workflow will automatically:
   - Run syntax verification
   - Test the CLI
   - Publish to npm
   - Create a summary

4. Verify publication:
   - Check workflow: https://github.com/SilverAssist/copilot-prompts-kit/actions
   - Check npm: https://www.npmjs.com/package/@silverassist/agents-toolkit

---

## Rollback (if needed)

If something goes wrong after publishing:

1. **npm:** `npm deprecate @silverassist/agents-toolkit@{version} "reason"`
2. **GitHub:** Delete the release and tag
3. Fix the issue and release a patch version
