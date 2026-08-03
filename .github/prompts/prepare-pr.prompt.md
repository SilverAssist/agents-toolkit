---
agent: agent
description: Prepare code for a pull request by running all validations
---

# Prepare for Pull Request

Prepare the current branch for a pull request by running all validations.

## Prerequisites

- Reference: `.github/prompts/_partials/validations.md`
- Reference: `.github/prompts/_partials/git-operations.md`

## Steps

### 1. Check Branch Status

```bash
BASE_BRANCH=$(node -e "try{const c=require('./.agents-toolkit.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
git branch --show-current
git status
git log --oneline -5
```

Verify:

- Not on protected branch (main, dev, stg, master, `${BASE_BRANCH}`)
- All changes are committed
- Branch follows naming: `feature/{issue-number}-*` or `bugfix/{issue-number}-*`

### 2. Run Test Suite

```bash
npm test
```

- Review test results
- Fix any failing tests before proceeding

### 3. Code Review Checks

Verify:

- [ ] No `console.log` or debug statements left in
- [ ] No sensitive data exposed (API keys, secrets)
- [ ] JSDoc comments on new/modified functions in `bin/cli.js`
- [ ] New CLI flags documented in `help` output

### 4. Review Changes

```bash
git diff --stat
git diff "$BASE_BRANCH" --name-only
```

Check:

- Files changed align with issue scope
- No unintended changes
- `src/index.js` exports in sync with `templates/shared/` filesystem
- `README.md` and `CHANGELOG.md` updated if needed

### 5. Commit Hygiene

Verify commit messages:

- Follow format: `type: description` (`feat`, `fix`, `docs`, `test`, `chore`)
- Use present tense, imperative mood
- No merge commits (rebase on base branch if needed)

If merge commits are present, rebase non-interactively:

```bash
git fetch origin
git rebase "origin/${BASE_BRANCH}"
```

### 6. Documentation Check

- [ ] `CHANGELOG.md` updated under the correct version
- [ ] `README.md` updated if prompts/flags/behavior changed
- [ ] JSDoc on new/modified functions in `bin/cli.js`

## Output: Readiness Report

### ✅ Passed Checks

- List all passed checks

### ⚠️ Warnings

- Issues to address but not blockers

### ❌ Blockers

- Must fix before proceeding

### 📁 Changed Files

- List all modified files

### 📝 Summary

Brief summary for PR description

## Next Steps

- Fix any blockers
- Use `create-github-pr` to open the pull request
