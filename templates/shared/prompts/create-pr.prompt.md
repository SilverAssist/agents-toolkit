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

A file is removed only when it satisfies **both** conditions: it was **added on this branch**
vs `$BASE_BRANCH`, and it **carries the planning-doc marker** that `work-ticket` / `create-plan`
write as the first line:

```markdown
<!-- agents-toolkit:planning-doc ticket={ticket-id} -->
```

The marker — not the filename — is what identifies a temporary plan. Filename patterns cannot:
`docs/*-plan.md` also matches a legitimate deliverable such as `docs/rollout-plan.md`, and
`docs/*plan*.md` additionally matches `explanation.md` (ex-**plan**-ation). A plan written
without the marker is simply **not deleted**. That bias is deliberate: leaving a plan doc behind
is a trivial cleanup, while deleting someone's deliverable is not recoverable from the PR.

Two portability details are load-bearing. The loop reads `git diff -z` output **NUL-delimited**,
because a path containing a space word-splits and makes `git rm` abort without removing
anything. And it deliberately avoids `grep -lZ | xargs -0`: BSD `grep` on macOS does **not**
NUL-terminate `-l` output, which silently breaks that chain on the platform many contributors
use. The `while read -d ''` form works on bash 3.2 (macOS's system bash) and needs no `mapfile`.

```bash
MARKER='agents-toolkit:planning-doc'
PLANS=()
while IFS= read -r -d '' f; do
  # First line only, and the *complete* HTML comment — not the bare token.
  # A whole-file grep would match a contributing guide that merely mentions the
  # convention, and a substring match would still catch a heading like
  # `# agents-toolkit:planning-doc notes`. `([[:space:]].*)?` must allow `-`,
  # since Jira ticket ids (`ticket=WEB-1111`) contain one.
  head -n 1 "$f" 2>/dev/null | grep -qE "^<!--[[:space:]]*${MARKER}([[:space:]].*)?-->[[:space:]]*$" && PLANS+=("$f")
done < <(git diff --name-only -z "$BASE_BRANCH" --diff-filter=A -- 'docs/*.md' 'docs/**/*.md')

if [ ${#PLANS[@]} -eq 0 ]; then
  echo "No marked planning docs added on this branch — nothing to remove."
else
  echo "Removing planning docs added on this branch:"
  printf '  %s\n' "${PLANS[@]}"
  # No `|| true` mask: a real git rm failure (permissions, unmerged path) must surface.
  git rm -- "${PLANS[@]}"
  git commit -m "docs: Remove planning doc for {ticket-id} ahead of PR"
fi
```

Note that the commit above only captures what `git rm` staged. Any file you edited while
fixing the Step 4 validations is still an unstaged working-tree change, and when the branch
has no planning doc the `else` branch never runs, so nothing is committed at all. Both cases
push a branch that is missing the fixes. Stage and commit them unconditionally:

```bash
# Runs whether or not a planning doc existed. Tested against `git status --porcelain`
# rather than `git diff --quiet`, because a fix that *creates* a file (a new test, a
# snapshot) leaves it untracked, and no `git diff` variant reports untracked paths.
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  # No `|| true`: a failed commit (hooks, signing, identity) must stop the flow, not be
  # masked — otherwise Step 6 pushes without the validation fixes.
  git commit -m "{ticket-id}: Apply pre-PR validation fixes"
fi

# Enforce, don't just report: the push must never carry uncommitted work.
if [ -n "$(git status --porcelain)" ]; then
  echo "Worktree still dirty after commit — resolve before pushing:" >&2
  git status --porcelain >&2
  exit 1
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
