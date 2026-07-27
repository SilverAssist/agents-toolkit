---
agent: agent
description: Create a pull request for the current branch
model:
  - Claude Sonnet 4.5 (copilot)
  - GPT-5 (copilot)
---

# Create Pull Request

> **Model:** Default smart tier (`Claude Sonnet 4.5` → `GPT-5`) — the `prepare-pr` delegate runs on its own cheap-tier pin. To change tier, edit this file's `model:` frontmatter or reinstall with `--model-pins off` (strips all pins so the picker/session default wins) or `.agents-toolkit.json` `models.{copilot,claude}` overrides; the Copilot picker and Claude `/model` cannot override a `model:` pin. Codex has no per-prompt field, so `codex --model` is the effective session-level override there.

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

The step below is **self-discovering** — it removes every `docs/*plan*.md` (and
`docs/**/*plan*.md`) file that was **added on this branch** vs `$BASE_BRANCH`, so it works even
when the executor cannot resolve `{feature-name}` from context. It never touches plan docs that
existed before the branch. Do **not** replace the glob with a literal file name — an
unsubstituted `[ -f docs/{feature-name}-plan.md ]` silently matches nothing and skips the
`git rm`.

```bash
PLAN_DOCS=$(git diff "$BASE_BRANCH" --name-only --diff-filter=A -- 'docs/*plan*.md' 'docs/**/*plan*.md' 2>/dev/null)
if [ -n "$PLAN_DOCS" ]; then
  echo "Removing planning docs added on this branch:"
  printf '  %s\n' $PLAN_DOCS
  # xargs so a git rm failure (permissions, unmerged path) surfaces — no `|| true` mask.
  echo "$PLAN_DOCS" | xargs git rm
  git commit -m "docs: Remove planning doc for {ticket-id} ahead of PR"
else
  echo "No planning docs to remove (nothing added on this branch matches docs/*plan*.md)."
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
