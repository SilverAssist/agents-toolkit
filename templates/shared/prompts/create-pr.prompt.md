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

### 0. Validate ticket ID

Verify that `{ticket-id}` has been replaced with a real ticket identifier (e.g. `WEB-1234`). If the literal string `{ticket-id}` is still present, stop and ask the user to provide the ticket ID.

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

Fix any issues before proceeding. If a validation command fails and the fix is not straightforward (e.g. requires business logic decisions or takes more than one iteration), stop and report the failure to the user with the exact error output before attempting further changes.

### 5. Remove the planning document

The planning document created by `work-ticket` or `create-plan` has served its purpose. Delete it now so it stays out of the base branch after merge.

1. Find `docs/*.md` files **added on this branch** vs `$BASE_BRANCH`.
2. Keep only files whose **first line** matches `<!-- agents-toolkit:planning-doc … -->` (bare token or with optional metadata like `ticket={ticket-id}`).
3. `git rm` matching files and commit. If none match, skip.
4. Stage and commit any remaining working-tree changes, then verify the tree is clean.

```bash
MARKER='agents-toolkit:planning-doc'
PLANS=()
while IFS= read -r -d '' f; do
  head -n 1 "$f" 2>/dev/null | grep -qE "^<!--[[:space:]]*${MARKER}([[:space:]].*)?-->[[:space:]]*$" && PLANS+=("$f")
done < <(git diff --name-only -z "$BASE_BRANCH" --diff-filter=A -- 'docs/*.md' 'docs/**/*.md')

if [ ${#PLANS[@]} -eq 0 ]; then
  echo "No marked planning docs added on this branch — nothing to remove."
else
  echo "Removing planning docs added on this branch:"
  printf '  %s\n' "${PLANS[@]}"
  git rm -- "${PLANS[@]}"
  git commit -m "docs: Remove planning doc for {ticket-id} ahead of PR"
fi
```

```bash
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "{ticket-id}: Apply pre-PR validation fixes"
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Worktree still dirty after commit — resolve before pushing:" >&2
  git status --porcelain >&2
  exit 1
fi
```

<details>
<summary>Why these exact commands?</summary>

**Marker over filename**: `docs/*-plan.md` also matches legitimate deliverables like `docs/rollout-plan.md`, and `docs/*plan*.md` additionally matches `explanation.md` (ex-**plan**-ation). The marker is what `work-ticket`/`create-plan` write as line 1; a plan without it is simply not deleted. Leaving a plan behind is trivial to clean up; deleting a deliverable is not recoverable.

**NUL-delimited paths**: `git diff -z` NUL-delimits output so paths containing spaces don't word-split and break `git rm`. `grep -lZ | xargs -0` is avoided because BSD `grep` on macOS does not NUL-terminate `-l` output, silently breaking that chain. The `while read -d ''` form works on bash 3.2 (macOS's system bash) and needs no `mapfile`.

**`git status --porcelain` over `git diff --quiet`**: A fix that creates a new file (e.g. a new test or snapshot) leaves it untracked; no `git diff` variant reports untracked paths. `git status --porcelain` catches them all. No `|| true` on `git commit`: a failed commit (hooks, signing, identity) must stop the flow, not be masked.

</details>

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
- **Reviewers**: Read `.github/CODEOWNERS` and map changed files to owners. If no CODEOWNERS file exists, leave the reviewers field empty and note it in the Output report.

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
