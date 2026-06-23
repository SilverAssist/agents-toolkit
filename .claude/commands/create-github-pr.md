---
agent: agent
description: Create a pull request for the current branch linked to a GitHub issue
---

# Create GitHub Pull Request

Create a pull request for the current branch linked to GitHub issue **#{issue-number}**.

## Prerequisites
- Run `prepare-pr` first to ensure code is ready
- GitHub MCP connection or `gh` CLI required
- Reference: `.github/prompts/_partials/pr-template.md`
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/github-integration.md`

## Steps

### 1. Verify Current State

```bash
git branch --show-current
git status
```

Verify:
- Branch follows convention: `feature/{issue-number}-*` or `bugfix/{issue-number}-*`
- All changes are committed
- Not on protected branch

### 2. Review Changes

```bash
BASE_BRANCH=$(node -e "try{const c=require('./.agents-toolkit.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
git diff "$BASE_BRANCH" --name-only
```

- Reuse `BASE_BRANCH` in all subsequent steps
- Summarize the changes made
- Identify breaking changes or migrations

### 3. Read GitHub Issue

Fetch issue **#{issue-number}** details:
- Get title for PR title
- Extract acceptance criteria
- Get any context from comments

```bash
gh issue view {issue-number} | cat
```

### 4. Run Final Validations

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

Fix any issues before proceeding.

### 5. Push Branch

```bash
git push -u origin $(git branch --show-current)
```

### 6. Create Pull Request

#### PR Title
```
{Issue title}
```

#### PR Description

Use this template:

```markdown
## Summary
Brief description of what this PR accomplishes.

## Related Issue
Closes #{issue-number}

## Changes Made
- Change 1: Description
- Change 2: Description
- Change 3: Description

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation
- [ ] 🔧 Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- Describe test cases here

## Screenshots
(If UI changes, add before/after screenshots)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

#### Create via CLI

```bash
gh pr create \
  --title "{Issue title}" \
  --body "$(cat <<'EOF'
## Summary
...

Closes #{issue-number}
EOF
)" \
  --base "$BASE_BRANCH" | cat
```

#### PR Settings
- **Source**: Current branch
- **Target**: `<base-branch>` resolved from `.agents-toolkit.json` (fallback: `main`)
- **Reviewers**: Based on changed files

### 7. Comment on GitHub Issue

Add a comment linking to the PR:

```bash
gh issue comment {issue-number} --body "## Pull Request Created

PR: <pr-url>
Branch: \`$(git branch --show-current)\`

Work in progress. Review requested." | cat
```
