---
agent: agent
description: Create a pull request for the current branch
model: Claude Sonnet 5
---

# Create Pull Request

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (PR authoring). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Create a pull request for the current branch linked to Jira ticket **{ticket-id}**.

## Prerequisites
- Run `prepare-pr` first to ensure code is ready
- Reference: `.github/prompts/_partials/pr-template.md`
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/jira-integration.md`

## Steps

### 1. Verify Current State

```bash
git branch --show-current
git status
```

Verify:
- Branch follows convention: `feature/{ticket-id}-*` or `bugfix/{ticket-id}-*`
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

### 3. Read Jira Ticket

Fetch ticket **{ticket-id}** details:
- Get summary for PR title
- Extract acceptance criteria
- Get any context from comments

### 4. Run Final Validations

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

Fix any issues before proceeding.

### 5. Remove the planning document

The planning document created by `work-ticket` or `create-plan` (shipped pattern:
`docs/<feature-name>-plan.md`) has served its purpose. Delete it now, **at PR creation (not at
finalization)**, so it stays out of the base branch after merge.

The step below is **self-discovering** — it removes every `docs/*-plan.md` file that was
**added on this branch** vs `$BASE_BRANCH`, so it works even when the executor cannot resolve
`{feature-name}` from context. It never touches plan docs that existed before the branch. Do
**not** replace the glob with a literal file name — an unsubstituted
`[ -f docs/{feature-name}-plan.md ]` silently matches nothing and skips the `git rm`.

Two details are load-bearing. The pattern requires the `-plan.md` **suffix**, not the substring
`plan`: `docs/*plan*.md` also matches `explanation.md` and `planet.md`, and would delete a
legitimate new doc. And the list is passed **NUL-delimited**, because a path containing a space
word-splits under `xargs` and makes `git rm` abort without removing anything.

```bash
# `--quiet` exits 0 when nothing matched, so xargs never runs on an empty list.
if git diff --quiet "$BASE_BRANCH" --diff-filter=A -- 'docs/*-plan.md' 'docs/**/*-plan.md'; then
  echo "No planning docs to remove (nothing added on this branch matches docs/*-plan.md)."
else
  echo "Removing planning docs added on this branch:"
  git diff --name-only "$BASE_BRANCH" --diff-filter=A -- 'docs/*-plan.md' 'docs/**/*-plan.md' | sed 's/^/  /'
  # -z / -0 so a path containing spaces survives. No `|| true` mask: a real
  # git rm failure (permissions, unmerged path) must surface.
  git diff --name-only -z "$BASE_BRANCH" --diff-filter=A -- 'docs/*-plan.md' 'docs/**/*-plan.md' \
    | xargs -0 git rm --
  git commit -m "docs: Remove planning doc for {ticket-id} ahead of PR"
fi
```

### 6. Push Branch

```bash
git push -u origin $(git branch --show-current)
```

### 7. Create Pull Request

#### PR Title
```
{ticket-id}: {Ticket Summary}
```

#### PR Description

Use this template:

```markdown
## Summary
Brief description of what this PR accomplishes.

## Jira Ticket
[{ticket-id}](https://your-org.atlassian.net/browse/{ticket-id})

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

#### PR Settings
- **Source**: Current branch
- **Target**: `<base-branch>` resolved from `.agents-toolkit.json` (fallback: `main`)
- **Reviewers**: Based on changed files

### 8. Link PR to Jira

Add comment to Jira ticket:
```markdown
## Pull Request Created
- PR: [PR Title](PR_URL)
- Target: `<base-branch>` branch
- Reviewers: @assigned-reviewers

## Changes
- Summary of changes made
```

## Output

Report:
1. ✅ PR URL
2. ✅ Jira ticket linked
3. ✅ Reviewers assigned

## Next Steps
- Wait for review
- Address feedback
- Use `finalize-pr` after approval
